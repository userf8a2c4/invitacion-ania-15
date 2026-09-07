<?php
/* ══════════════════════════════════════════════════════════════════════
   COMPRAS.PHP · LA CONEXIÓN CON EL PROCESADOR DE PAGOS

   QUÉ HACE ESTE ARCHIVO (POR AHORA)
   Solo la configuración: decir si la conexión con Stripe está lista, y
   guardar la clave que SÍ puede ser pública. El cobro en sí todavía no
   está — llega cuando existan las claves y se pueda probar de verdad.

   ══════════════════════════════════════════════════════════════════════
   POR QUÉ HAY DOS CLAVES Y VIVEN EN LUGARES DISTINTOS

   Stripe da dos claves por entorno, y no son intercambiables:

     PUBLICABLE  (pk_...)  Está hecha para que la vea cualquiera: viaja
                           al navegador, es la que dibuja el formulario
                           de tarjeta. Que se filtre no es un incidente.
                           Por eso se puede guardar en `ajustes` y
                           editar desde el panel.

     SECRETA     (sk_...)  Con ella se cobra. Quien la tenga puede mover
                           dinero de la cuenta. NUNCA entra a la base de
                           datos, ni al panel, ni a un log, ni viaja al
                           navegador. Vive en el .env del servidor, que
                           está en .gitignore y no sale de ahí.

   Este archivo NUNCA devuelve la clave secreta. Solo dice si está
   puesta y en qué modo (prueba o real), que es todo lo que el panel
   necesita para orientar a quien configura.

   ══════════════════════════════════════════════════════════════════════
   LA SECRETA DEBERÍA SER UNA CLAVE RESTRINGIDA (rk_...)

   Una `sk_` puede hacer CUALQUIER COSA en la cuenta de Stripe: leer
   todos los clientes, mover dinero, cambiar la configuración. Si el .env
   se filtrara, eso es lo que se llevarían.

   Stripe permite crear claves con permisos recortados, y este archivo
   solo necesita cuatro cosas. Con una clave restringida a esto, un .env
   robado sirve para muy poco:

       Customers ......... escritura   (clienteDeStripe)
       SetupIntents ...... escritura   (accion=setup_intent)
       PaymentMethods .... escritura   (guardar_metodo pregunta qué es un
                           token, y desactivar_metodo lo despega con
                           .../detach, que es un POST)
       PaymentIntents .... escritura   (accion=cobrar)

   Todo lo demás se deja en "ninguno".

   PaymentMethods va en ESCRITURA y no en solo lectura a propósito.
   Tentaba dejarlo en lectura —la tarjeta la crea el navegador, no este
   archivo— pero entonces `detach` falla y el token seguiría adjunto en
   Stripe después de quitar la tarjeta del panel: desactivada de este
   lado, viva del otro. Y no compra nada a cambio: para cobrar hace falta
   PaymentIntents en escritura de todos modos, así que quien robe la
   clave ya puede cobrar. Recortar ahí sería aceptar una baja a medias
   sin ganar seguridad.

   Se genera en Stripe → Desarrolladores → Claves de API → "Crear clave
   restringida", y se pone en el .env en lugar de la `sk_`. El código no
   cambia: la lee del mismo sitio.

   ══════════════════════════════════════════════════════════════════════
   DOS GUARDAS QUE EVITAN ERRORES CAROS

   1. NO SE DEJA GUARDAR UNA CLAVE SECRETA EN EL CAMPO PÚBLICO. Es el
      error fácil: las dos son cadenas largas parecidas, y pegar la que
      no va significaría meter en la base —y mandar a los navegadores—
      la llave con la que se cobra. Si el texto empieza con `sk_`, se
      rechaza y se explica.

   2. LAS DOS CLAVES TIENEN QUE SER DEL MISMO MODO. Una publicable de
      prueba con una secreta real (o al revés) no funciona, y falla en
      el peor momento: al cobrar. Acá se compara el prefijo de las dos
      y se avisa antes.

   Y una tercera, de sentido común: en PBE corresponden las claves de
   PRUEBA y en producción las REALES. Se avisa si no coincide, pero no
   se prohíbe — puede haber un motivo para probar con reales en un
   momento dado, y el panel informa, no manda.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=config           cómo está la conexión (sin secretos)
     POST ?accion=guardar_config   guarda la clave publicable
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/entorno.php';
// Para avisar de cada movimiento de dinero — ver
// avisarDeMovimientoDeDinero() más abajo.
require_once __DIR__ . '/_lib/correo.php';
require_once __DIR__ . '/_lib/push.php';
// La regla de "se puede cobrar" y como leer una clave: una sola
// definicion, compartida con chat.php. Ver _lib/pagos.php.
require_once __DIR__ . '/_lib/pagos.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'config');

/* ══════════════════════════════════════════════════════════════════════
   HABLAR CON STRIPE

   POR QUÉ A MANO Y NO CON LA LIBRERÍA OFICIAL
   Porque este proyecto no tiene composer ni un solo paquete de terceros
   -el correo se manda hablando SMTP a mano en _lib/correo.php, y los
   avisos push se firman con OpenSSL en _lib/push.php-. Meter un gestor
   de dependencias para usar cuatro endpoints REST cambiaría cómo se
   despliega el sitio entero. La API de Stripe es HTTP con formularios:
   se habla igual de bien con cURL.

   TODO ESTO CORRE EN EL SERVIDOR Y SOLO EN EL SERVIDOR. La clave
   secreta sale del .env, se usa en la cabecera y no se devuelve nunca,
   ni entera ni en pedazos.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Le pide algo a la API de Stripe.
 *
 * ⚡ LA CLAVE DE IDEMPOTENCIA NO ES UN LUJO (2026-09-05)
 *
 * EL PROBLEMA
 * Sin ella, una petición POST que se repite crea DOS cosas. En
 * `payment_intents` eso es cobrar dos veces, y no hace falta mala fe
 * para provocarlo: un doble toque, un reintento del navegador, o una
 * red que se corta después de que Stripe recibió el pedido pero antes
 * de que volviera la respuesta. Desde acá los tres casos se ven igual
 * —"no sé si llegó"— y reintentar es lo natural.
 *
 * CÓMO FUNCIONA
 * Stripe guarda el resultado de la primera petición con esa clave
 * durante 24 h. Si llega otra igual, devuelve la MISMA respuesta en vez
 * de ejecutar de nuevo. Es su forma oficial de resolver esto y la
 * recomiendan para todos los POST.
 *
 * LA CLAVE TIENE QUE SER ESTABLE, NO ALEATORIA
 * Un UUID nuevo en cada intento no protege de nada: cada reintento
 * traería una clave distinta y Stripe lo trataría como un cobro nuevo.
 * Por eso `cobrar` usa el id del pedido, que ya existe en la base ANTES
 * de llamar acá — mismo pedido, misma clave, pase lo que pase.
 *
 * @param string $metodo 'GET' o 'POST'.
 * @param string $ruta   Por ejemplo 'setup_intents'.
 * @param array  $datos  Se manda como formulario (así lo espera Stripe).
 * @param string $idempotencia Clave estable para no repetir un POST. Se
 *        ignora en GET, que no crea nada.
 * @return array ['ok' => bool, 'codigo' => int, 'datos' => array, 'error' => string]
 */
function pedirleAStripe($metodo, $ruta, $datos = [], $idempotencia = '') {
    $secreta = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));

    if ($secreta === '') {
        return ['ok' => false, 'codigo' => 0, 'datos' => [],
                'error' => 'Falta conectar los pagos: no hay clave secreta en el servidor.'];
    }

    /* Misma guarda que _lib/push.php: sin cURL no se puede, y hay que
       decirlo con todas las letras en vez de fallar de una forma que
       parezca otra cosa. */
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'codigo' => 0, 'datos' => [],
                'error' => 'Este servidor no tiene cURL, así que no puede hablar con Stripe.'];
    }

    $url = 'https://api.stripe.com/v1/' . $ruta;
    $cuerpo = http_build_query($datos);

    // En GET los parámetros van en la URL; en POST, en el cuerpo.
    if ($metodo === 'GET' && $cuerpo !== '') {
        $url .= '?' . $cuerpo;
    }

    $cabeceras = [
        'Authorization: Bearer ' . $secreta,
        'Content-Type: application/x-www-form-urlencoded',
        /* Fija la versión de la API: así una actualización del lado
           de Stripe no cambia la forma de las respuestas de un día
           para el otro sin que nadie haya tocado nada acá. */
        'Stripe-Version: 2024-06-20',
    ];

    /* Solo en POST: un GET no crea nada, así que repetirlo es inofensivo
       y Stripe ignora la cabecera ahí. El prefijo evita que dos cosas
       distintas del proyecto choquen si algún día comparten número. */
    if ($metodo === 'POST' && $idempotencia !== '') {
        $cabeceras[] = 'Idempotency-Key: ania-' . $idempotencia;
    }

    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_HTTPHEADER     => $cabeceras,
    ]);

    if ($metodo === 'POST') {
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $cuerpo);
    }

    $respuesta = curl_exec($curl);
    $codigo    = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $errorCurl = curl_error($curl);
    curl_close($curl);

    if ($respuesta === false) {
        return ['ok' => false, 'codigo' => 0, 'datos' => [],
                'error' => 'No se pudo conectar con Stripe. ' . $errorCurl];
    }

    $datosDeVuelta = json_decode((string) $respuesta, true);
    if (!is_array($datosDeVuelta)) $datosDeVuelta = [];

    if ($codigo >= 200 && $codigo < 300) {
        return ['ok' => true, 'codigo' => $codigo, 'datos' => $datosDeVuelta, 'error' => ''];
    }

    return ['ok' => false, 'codigo' => $codigo, 'datos' => $datosDeVuelta,
            'error' => explicarErrorDeStripe($datosDeVuelta)];
}

/**
 * Convierte un error de Stripe en algo que Lucila pueda leer.
 *
 * Los mensajes de Stripe vienen en inglés y hablan de objetos de su API
 * ("the PaymentIntent could not be confirmed"). Eso no le sirve a quien
 * solo quiere saber si le cobraron o no.
 *
 * @param array $respuesta Lo que devolvió Stripe.
 * @return string
 */
function explicarErrorDeStripe($respuesta) {
    $error = isset($respuesta['error']) && is_array($respuesta['error'])
        ? $respuesta['error'] : [];

    $codigo = (string) ($error['code'] ?? $error['decline_code'] ?? '');

    /* Los cuatro que de verdad van a pasar, dichos en español y
       diciendo qué hacer. El resto cae al mensaje de Stripe recortado,
       que es mejor que un "algo salió mal" sin información. */
    $conocidos = [
        'card_declined'           => 'El banco rechazó la tarjeta. Prueba con otra.',
        'insufficient_funds'      => 'La tarjeta no tiene fondos suficientes.',
        'expired_card'            => 'Esa tarjeta ya venció. Hay que cargar una nueva.',
        'incorrect_cvc'           => 'El código de seguridad no coincide.',
        'authentication_required' => 'El banco pide confirmar este cobro desde la app del banco. '
                                   . 'Como no se puede hacer desde acá, paga esta compra a mano.',
        /* `resource_missing` NO siempre es la tarjeta: también sale
           cuando el cliente del evento ya no está en Stripe, y decir
           "tarjeta" ahí manda a buscar el problema donde no está — pasó
           el 5 de septiembre al estrenar la clave restringida. El texto
           nombra las dos posibilidades y el registro del servidor dice
           cuál fue (ver clienteDeStripe). */
        'resource_missing'        => 'Stripe no encuentra la tarjeta o la cuenta del evento. '
                                   . 'Vuelve a intentar; si sigue, hay que cargar la tarjeta de nuevo.',
    ];

    if ($codigo !== '' && isset($conocidos[$codigo])) return $conocidos[$codigo];

    $suyo = trim((string) ($error['message'] ?? ''));
    return $suyo !== '' ? mb_substr($suyo, 0, 250) : 'Stripe rechazó la operación.';
}

/**
 * El identificador de cliente en Stripe, creándolo la primera vez.
 *
 * POR QUÉ HACE FALTA UN "CLIENTE" SI HAY UNA SOLA PERSONA
 * Porque Stripe solo deja volver a usar una tarjeta guardada si está
 * pegada a un Customer. Sin eso, cada compra obligaría a escribir la
 * tarjeta otra vez -que es exactamente lo que esto viene a evitar.
 *
 * Es uno solo para toda la fiesta, guardado en `ajustes`, igual que la
 * clave publicable.
 *
 * @return string El id (`cus_...`), o '' si no se pudo.
 */
function clienteDeStripe() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'stripe_cliente_id'");
    $guardado = trim((string) ($fila['valor'] ?? ''));

    /* ⚡ EL CLIENTE GUARDADO PUEDE HABER DEJADO DE EXISTIR (2026-09-05)
     *
     * Acá se devolvía el id guardado a ojos cerrados. Y un id de Stripe
     * no es eterno: el entorno de prueba se puede vaciar, el dato se
     * puede borrar a mano, o la cuenta puede cambiar. Cuando eso pasa,
     * Stripe contesta `resource_missing` a TODO —guardar tarjeta,
     * cobrar— y el panel lo traducía como "esa tarjeta ya no existe",
     * mandando a buscar el problema donde no estaba. El sistema de pagos
     * quedaba muerto para siempre, porque nadie iba a ir a borrar a mano
     * una fila de `ajustes` que nadie sabía que existía.
     *
     * Pasó de verdad al estrenar la clave restringida: el cliente de
     * antes ya no estaba y no había forma de salir de ese estado desde
     * el panel.
     *
     * Ahora se comprueba, y si no está se hace uno nuevo. Cuesta un
     * viaje a Stripe en operaciones que ya hacen varios, y solo ocurren
     * cuando alguien está comprando algo. */
    if ($guardado !== '') {
        $r = pedirleAStripe('GET', 'customers/' . rawurlencode($guardado));

        // Está y responde: es el de siempre.
        if ($r['ok'] && empty($r['datos']['deleted'])) return $guardado;

        /* 404 es "ya no existe" y se resuelve creando otro. Cualquier
           otro fallo (500 de Stripe, red caída, permisos) NO significa
           eso: devolver '' hace que quien llama avise y no se cobre, en
           vez de crear clientes nuevos cada vez que Stripe tosa. */
        if ($r['codigo'] !== 404) return '';

        error_log('[Ania XV · compras] El cliente ' . $guardado
                . ' ya no existe en Stripe. Se crea uno nuevo.');
    }

    /* La hora adentro de la clave, y no una clave fija.
       Fija protegía de que dos peticiones a la vez crearan dos clientes,
       que es lo que se quería. Pero Stripe recuerda una clave de
       idempotencia 24 h: si hay que RECREAR el cliente porque el
       anterior se borró, una clave fija devolvería durante un día entero
       el mismo id borrado — y no habría forma de salir de ese estado.
       Con la hora dentro se conservan las dos cosas: sigue siendo
       idempotente para peticiones simultáneas, y una recreación
       posterior consigue un cliente de verdad. */
    $r = pedirleAStripe('POST', 'customers', [
        'description' => 'XV de Ania - compras del evento',
    ], 'cliente-' . date('Y-m-d-H'));

    if (!$r['ok'] || empty($r['datos']['id'])) return '';

    $id = (string) $r['datos']['id'];
    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('stripe_cliente_id', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => $id]
    );

    return $id;
}

/**
 * Un monto en pesos, pasado a la unidad que espera Stripe.
 *
 * Stripe cuenta en centavos: $650.00 son 65000. Se redondea antes de
 * convertir a entero porque (int)(6.5 * 100) puede dar 649 -el clásico
 * de los flotantes-, y ahí se estaría cobrando un centavo de menos en
 * cada compra sin que nadie lo note.
 *
 * @param float $pesos
 * @return int
 */
function enCentavos($pesos) {
    return (int) round(((float) $pesos) * 100);
}

/* ══════════════════════════════════════════════════════════════════════
   VOLVER A DEMOSTRAR QUIÉN ERES, PARA TOCAR EL DINERO

   ⚡ POR QUÉ (2026-09-05)
   Hasta ahora, estar dentro del panel bastaba para agregar una tarjeta o
   disparar un cobro. Y las sesiones duran semanas: un teléfono
   desbloqueado, prestado o perdido era acceso directo al dinero, sin que
   nadie tuviera que saber ninguna contraseña.

   Es la misma idea que usa cualquier tienda seria —Amazon incluido— al
   pedir la contraseña otra vez para tocar un método de pago aunque
   acabes de entrar: la sesión dice que SIGUES ahí, no que SEAS tú.

   Se pide en las tres acciones que mueven dinero o pueden habilitarlo, y
   en ninguna otra.

   ⚡ Y VALE UN RATO, NO UNA SOLA VEZ (2026-09-05)
   Al principio se pedía en CADA cobro. Pero la idea de todo esto es que
   MegaBot le automatice las compras a Lucila con algo de fricción, no
   que la frene: si él le propone cinco cosas en una tarde, escribir la
   contraseña cinco veces deja de ser una guarda y pasa a ser un motivo
   para no usar el sistema. Y una guarda que empuja a la gente a
   esquivarla protege menos que una más floja que sí se usa.

   Lo que de verdad autoriza cada compra es que ella toque Confirmar en
   esa propuesta concreta: sin eso no se cobra nada, y eso no tiene
   atajo ni caducidad. La contraseña es la capa de abajo — demuestra que
   quien está del otro lado es ella y no alguien con su teléfono
   desbloqueado— y para eso alcanza con demostrarlo una vez cada tanto.

   LO QUE SE GUARDA ES UN SELLO, NUNCA LA CONTRASEÑA. Un timestamp y la
   IP desde donde se confirmó, en `ajustes`. La contraseña se compara
   contra el hash del login y se descarta en la misma línea.
   ══════════════════════════════════════════════════════════════════════ */

/** Cuánto vale haber escrito la contraseña, antes de volver a pedirla. */
const MINUTOS_DE_CONFIRMACION_DE_DINERO = 20;

/** Dónde se anota ese sello, por persona. */
function claveDelSelloDeDinero($usuarioId) {
    return 'dinero_confirmado_' . (int) $usuarioId;
}

/**
 * Si esta persona ya demostró hace poco que es ella, desde acá mismo.
 *
 * Se ata a la IP a propósito: un sello que valiera desde cualquier lado
 * sería un permiso que viaja con la sesión robada, que es justo lo que
 * esto tiene que evitar.
 *
 * @param array $yo
 * @return bool
 */
function confirmoHacePoco($yo) {
    if (!existeTabla('ajustes')) return false;

    $fila = consultarUno('SELECT valor FROM ajustes WHERE clave = :c',
                         [':c' => claveDelSelloDeDinero($yo['id'] ?? 0)]);
    if (!$fila) return false;

    $sello = json_decode((string) $fila['valor'], true);
    if (!is_array($sello)) return false;

    $cuando = (int) ($sello['cuando'] ?? 0);
    $desde  = (string) ($sello['ip'] ?? '');
    $ahora  = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if ($desde !== $ahora) return false;

    return (time() - $cuando) < (MINUTOS_DE_CONFIRMACION_DE_DINERO * 60);
}

/**
 * Anota que esta persona acaba de escribir bien su contraseña.
 *
 * @param array $yo
 * @return void
 */
function anotarQueConfirmo($yo) {
    if (!existeTabla('ajustes')) return;

    ejecutar(
        'INSERT INTO ajustes (clave, valor) VALUES (:c, :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [
            ':c' => claveDelSelloDeDinero($yo['id'] ?? 0),
            ':v' => json_encode([
                'cuando' => time(),
                'ip'     => substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45),
            ]),
        ]
    );
}

/** Cuántos intentos fallidos de contraseña se toleran, y en cuánto rato. */
const INTENTOS_DE_CLAVE_PARA_DINERO = 5;
const MINUTOS_DE_FRENO_DE_DINERO    = 15;
/** La marca propia en `intentos_login`, para no mezclar con el login. */
const MARCA_DE_CLAVE_PARA_DINERO = '__dinero__';

/**
 * Corta la petición si quien pide esto no reescribió su contraseña.
 *
 * El freno va ANTES de comprobar nada: sin él, este endpoint sería un
 * sitio cómodo para probar contraseñas una tras otra sin límite. Mismo
 * patrón y misma tabla que llaveDeArranqueCorrecta() (_lib/entorno.php).
 *
 * @param array $yo    El usuario de la sesión.
 * @param array $datos El cuerpo del POST.
 * @return void
 */
function exigirContrasenaDeNuevo($yo, $datos) {
    // Ya lo demostró hace poco y desde acá: no se le vuelve a pedir.
    if (confirmoHacePoco($yo)) return;

    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if (existeTabla('intentos_login')) {
        $fila = consultarUno(
            'SELECT COUNT(*) AS n FROM intentos_login
             WHERE ip = :ip AND correo = :marca
               AND cuando <= NOW()
               AND cuando > DATE_SUB(NOW(), INTERVAL ' . MINUTOS_DE_FRENO_DE_DINERO . ' MINUTE)',
            [':ip' => $ip, ':marca' => MARCA_DE_CLAVE_PARA_DINERO]
        );
        if ($fila && (int) $fila['n'] >= INTENTOS_DE_CLAVE_PARA_DINERO) {
            responderMal('Demasiados intentos con la contraseña. Espera '
                       . MINUTOS_DE_FRENO_DE_DINERO . ' minutos.', 429);
        }
    }

    /* Se lee del cuerpo crudo y NO con campoTexto(): esa función recorta
       y normaliza, y una contraseña tiene que compararse tal cual se
       escribió. */
    $contrasena = isset($datos['contrasena']) ? (string) $datos['contrasena'] : '';

    /* ⚡ 403 Y NUNCA 401 (2026-09-05)
     *
     * Con 401 esto echaba del panel. El panel trata TODO 401 como
     * "sesión vencida" y llama a manejarSesionVencida(), que borra el
     * token y manda al login (03-servidor.js:420) — con razón, porque
     * hasta ahora un 401 solo podía significar eso.
     *
     * O sea: escribir mal la contraseña, o cancelar, cerraba la sesión
     * entera. Una guarda que expulsa a quien se equivoca de tecla no es
     * una guarda, es una trampa.
     *
     * Y 403 es además lo correcto: 401 es "no sé quién eres"; acá sí se
     * sabe —la sesión es válida— lo que falta es autorización para ESTA
     * acción, que es exactamente un 403. Se descubrió probándolo contra
     * el servidor de pbe; leyendo el código no se veía. */
    if ($contrasena === '') {
        responderMal('Escribe tu contraseña para confirmar.', 403);
    }

    $fila = consultarUno('SELECT password_hash FROM usuarios WHERE id = :i',
                         [':i' => (int) ($yo['id'] ?? 0)]);

    if (!$fila || !contrasenaCorrecta($contrasena, (string) $fila['password_hash'])) {
        if (existeTabla('intentos_login')) {
            insertar('intentos_login', ['ip' => $ip, 'correo' => MARCA_DE_CLAVE_PARA_DINERO]);
        }
        responderMal('Esa no es tu contraseña.', 403);
    }

    // Era ella: no se lo volvemos a preguntar en un rato.
    anotarQueConfirmo($yo);
}

/* ══════════════════════════════════════════════════════════════════════
   AVISAR DE CADA MOVIMIENTO DE DINERO

   ⚡ POR QUÉ ES LA DEFENSA QUE MÁS VALE (2026-09-05)
   Un cobro pasaba sin que nadie se enterara. Quedaba en la bitácora,
   pero hay que ir a mirarla, y nadie mira la bitácora de un sistema que
   funciona bien.

   Lo que protege de verdad no es impedir todo cargo raro —eso es
   imposible— sino VERLO en minutos. Un cobro que no reconoces, visto el
   mismo día, se disputa; visto en la factura del mes siguiente, ya no.

   Se avisa de tres cosas: un cobro, una tarjeta nueva y una tarjeta
   quitada. Las dos últimas porque son lo que pasa ANTES de que el dinero
   se mueva: dan tiempo a reaccionar.

   ⚠️ EL PUSH VA SIN TEXTO. mandarAviso() (_lib/push.php) despierta al
   service worker sin cuerpo, así que el teléfono avisa de que pasó algo
   pero no dice cuánto. El detalle va en el correo. Meterle contenido al
   push exige cifrado ECDH y es otra ronda.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Avisa por correo y por push de algo que tocó el dinero.
 *
 * NUNCA CORTA NADA. Un servidor de correo caído no puede dejar un cobro
 * a medias ni impedir que se guarde una tarjeta: el aviso es una
 * consecuencia del hecho, no una condición para que ocurra. Si falla, se
 * anota en el registro del servidor y se sigue.
 *
 * @param string $asunto  Para el correo.
 * @param string $resumen Una línea, en lenguaje normal.
 * @param array  $detalle Pares rótulo => valor, ya listos para leer.
 * @param array  $yo      Quién lo hizo.
 * @return array Qué pasó con el aviso, para poder verlo desde el panel:
 *         ['correos' => int, 'push' => int, 'fallos' => string[]]
 */
function avisarDeMovimientoDeDinero($asunto, $resumen, $detalle, $yo) {
    /* ⚡ EL AVISO YA NO FALLA EN SILENCIO (2026-09-05)
     *
     * Se guardó una tarjeta y el correo no llegó, y no había forma de
     * saber por qué: el fallo se anotaba en error_log del servidor, que
     * desde el panel no se lee. Un aviso que no avisa Y no dice que no
     * avisó es peor que no tenerlo, porque se confía en él.
     *
     * Ahora devuelve qué pasó y la respuesta lo lleva. Sigue sin poder
     * tumbar la operación: el cobro manda, el aviso acompaña. */
    $resultado = ['correos' => 0, 'push' => 0, 'fallos' => []];

    try {
        $filas = '';
        foreach ($detalle as $rotulo => $valor) {
            $filas .= '<tr>'
                . '<td style="padding:6px 12px 6px 0;color:#7A6B8A">' . htmlspecialchars($rotulo) . '</td>'
                . '<td style="padding:6px 0"><b>' . htmlspecialchars((string) $valor) . '</b></td>'
                . '</tr>';
        }

        $html = '<html><body style="font-family:system-ui,sans-serif;color:#241c1a">'
            . '<p style="font-size:16px">' . htmlspecialchars($resumen) . '</p>'
            . '<table style="font-size:14px;border-collapse:collapse">' . $filas . '</table>'
            . '<p style="font-size:13px;color:#7A6B8A;margin-top:18px">'
            . 'Lo hizo <b>' . htmlspecialchars((string) ($yo['nombre'] ?? '¿?')) . '</b> el '
            . date('d/m/Y \a \l\a\s H:i') . '.<br>'
            . 'Si no fuiste tú, entra al panel y quita la tarjeta ahora mismo.'
            . '</p></body></html>';

        $destinatarios = array_filter(array_map('trim',
            explode(',', (string) env('CORREO_ADMINISTRADORA', 'info@aniaxv.com'))));

        if (!$destinatarios) {
            $resultado['fallos'][] = 'No hay a quién avisar: falta CORREO_ADMINISTRADORA en el .env.';
        }

        foreach ($destinatarios as $destino) {
            $salio = enviarCorreo($destino, $asunto, $html);
            if ($salio === true) {
                $resultado['correos']++;
            } else {
                /* El motivo entero, no un "no se pudo": si el SMTP
                   rechaza, lo que dice es exactamente lo que hace falta
                   para arreglarlo. Va al panel Y al log. */
                $resultado['fallos'][] = $destino . ': ' . $salio;
                error_log('[Ania XV · compras] No salió el aviso a ' . $destino . ': ' . $salio);
            }
        }

        if (function_exists('avisarATodos')) {
            $push = avisarATodos();
            $resultado['push'] = (int) ($push['enviados'] ?? 0);
            if (!empty($push['fallidos'])) {
                $resultado['fallos'][] = 'Push: ' . (int) $push['fallidos'] . ' no salieron.';
            }
        }
    } catch (Throwable $e) {
        // Cualquier cosa que pase acá es menos grave que perder el cobro.
        $resultado['fallos'][] = $e->getMessage();
        error_log('[Ania XV · compras] Falló el aviso de dinero: ' . $e->getMessage());
    }

    return $resultado;
}

/* El ritmo de los cobros lo lleva MegaBot (2026-09-05)

   Acá hubo un freno propio: cinco cobros por diez minutos. Se saca a
   pedido, porque el ritmo de las compras se decide del lado del
   asistente y no con un tope ciego en el servidor — un limite que no
   sabe si son cinco compras legitimas de un martes o una rafaga rara
   estorba mas de lo que protege.

   Lo que sigue en pie, y es lo que de verdad frena: cada cobro necesita
   que una persona toque Confirmar en esa propuesta, y la contrasena
   (exigirContrasenaDeNuevo). Ademas, repetir el MISMO pedido no cobra
   dos veces: eso lo cubre la clave de idempotencia, que no es un freno
   de ritmo sino una garantia por operacion. */

/**
 * Corta la petición si no se puede cobrar todavía.
 *
 * @return void
 */
function exigirPagosListos() {
    if (losPagosEstanListos()) return;
    responderMal('Falta conectar los pagos. Ve a Ajustes, "Conectar la cuenta '
               . 'con la que se paga", y sigue lo que dice ahí.', 409);
}



/* ══════════════════════════════════════════════════════════════════════
   UNA COMPRA: PROPONERLA, Y DESPUES COBRARLA

   ⚡ POR QUE SE PARTIO EN DOS (2026-09-05)

   Hasta ahora `cobrar` hacia todo de un saque: validaba, creaba la fila y
   cobraba. Y una propuesta de compra solo podia nacer de una
   conversacion, porque vivia en `chat_propuestas` — atada al chat.

   Eso deja fuera un caso que hace falta: dejar una compra propuesta
   desde la pantalla de compras, para confirmarla mas tarde. Y obliga a
   que MegaBot proponga y cobre con la misma accion, cuando son dos
   momentos distintos y con dos permisos distintos.

   Ahora hay tres puertas y una sola implementacion:

     proponer   crea la fila en `propuesta`. NO cobra, NO pide contrasena
                — proponer no mueve dinero, y pedirla aca seria cobrarle
                friccion a algo que no la necesita.
     confirmar  toma una fila en `propuesta` y la cobra. Pide contrasena.
     cobrar     el atajo de siempre: propone y confirma de una. Se
                mantiene porque es lo que ya usa la whitelist de MegaBot
                y lo que hace el boton Confirmar del chat.

   Las tres terminan en cobrarUnPedido(), asi que la idempotencia, los
   avisos y la bitacora son identicos por los tres caminos.
   ══════════════════════════════════════════════════════════════════════ */

/** El tope de cordura de un cobro automatico, en pesos. */
const TOPE_DE_COBRO_AUTOMATICO = 50000;

/**
 * Valida lo que hace falta para una compra y resuelve direccion y
 * tarjeta. Corta la peticion si algo no cierra.
 *
 * @param array $datos El cuerpo del POST.
 * @return array [concepto, monto, direccion, metodo]
 */
function armarLaCompra($datos) {
    $concepto = campoTexto($datos, 'concepto', 300);
    if ($concepto === '') responderMal('Falta decir qué se está comprando.', 400);

    $monto = (float) ($datos['monto'] ?? 0);
    if ($monto <= 0) responderMal('El monto tiene que ser mayor que cero.', 400);

    /* Un tope de cordura. No protege de un error de mil pesos, pero sí
       de un cero de más -que con un cobro automático es la diferencia
       entre un ramo y un coche. */
    if ($monto > TOPE_DE_COBRO_AUTOMATICO) {
        responderMal('Ese monto es más alto de lo que este panel cobra solo ($'
                   . number_format(TOPE_DE_COBRO_AUTOMATICO) . '). '
                   . 'Si de verdad es correcto, hay que pagarlo a mano.', 400);
    }

    // Sin dirección ni tarjeta dichas, se usan las de siempre.
    $direccionId = campoEntero($datos, 'direccion_id', 0);
    if ($direccionId <= 0) {
        $d = consultarUno('SELECT id FROM direcciones_entrega
                            WHERE activa = 1 AND es_predeterminada = 1 LIMIT 1');
        $direccionId = $d ? (int) $d['id'] : 0;
    }

    $metodoId = campoEntero($datos, 'metodo_pago_id', 0);
    if ($metodoId <= 0) {
        $m = consultarUno('SELECT id FROM metodos_pago
                            WHERE activo = 1 AND es_predeterminado = 1 LIMIT 1');
        $metodoId = $m ? (int) $m['id'] : 0;
    }

    $direccion = $direccionId > 0
        ? consultarUno('SELECT * FROM direcciones_entrega WHERE id = :i AND activa = 1',
                       [':i' => $direccionId])
        : null;
    if (!$direccion) {
        responderMal('No hay a dónde entregar esta compra. Agrega una dirección '
                   . 'en "¿Dónde recibes las compras?" antes de cobrar.', 400);
    }

    $metodo = $metodoId > 0
        ? consultarUno('SELECT * FROM metodos_pago WHERE id = :i AND activo = 1',
                       [':i' => $metodoId])
        : null;
    if (!$metodo) {
        responderMal('No hay ninguna tarjeta guardada. Agrega una en Ajustes, '
                   . '"Conectar la cuenta con la que se paga".', 400);
    }

    return [$concepto, (float) $monto, $direccion, $metodo];
}

/**
 * Guarda una compra como propuesta. No cobra nada.
 *
 * @return int El id del pedido.
 */
function guardarLaPropuesta($concepto, $monto, $direccion, $metodo, $datos) {
    return insertar('compras_pedidos', [
        'concepto'       => $concepto,
        'monto'          => $monto,
        'moneda'         => 'mxn',
        'direccion_id'   => (int) $direccion['id'],
        'metodo_pago_id' => (int) $metodo['id'],
        'estado'         => 'propuesta',
        'detalle_json'   => isset($datos['detalle']) && is_array($datos['detalle'])
            ? json_encode($datos['detalle'], JSON_UNESCAPED_UNICODE) : null,
    ]);
}

/**
 * Cobra un pedido que ya existe. NO valida permisos: quien llama tiene
 * que haber pasado por exigirContrasenaDeNuevo() antes.
 *
 * Nunca devuelve: termina la petición con responderBien o responderMal.
 *
 * @return void
 */
function cobrarUnPedido($pedidoId, $concepto, $monto, $direccion, $metodo, $yo) {
    $cliente = clienteDeStripe();
    if ($cliente === '') {
        actualizar('compras_pedidos', $pedidoId,
                   ['estado' => 'fallida', 'motivo_falla' => 'No se pudo hablar con Stripe.']);
        responderMal('No se pudo conectar con Stripe. No se cobró nada.', 502);
    }

    $r = pedirleAStripe('POST', 'payment_intents', [
        'amount'         => enCentavos($monto),
        'currency'       => 'mxn',
        'customer'       => $cliente,
        'payment_method' => (string) $metodo['stripe_payment_method_id'],
        // Cobra ya, en esta misma petición.
        'confirm'        => 'true',
        // Ella no está mirando el formulario del banco: si el banco pide
        // confirmación, que falle con un error claro en vez de dejar el
        // cobro colgado esperando a alguien que no va a llegar.
        'off_session'    => 'true',
        'description'    => mb_substr($concepto, 0, 200),
    ],
    /* ⚡ EL SEGURO CONTRA EL COBRO DOBLE (2026-09-05)
       `$pedidoId` es de una fila que ya existe antes de que Stripe sepa
       nada: es único y NO cambia si esta misma petición se repite. Eso es
       justo lo que hace falta — con un número al azar, cada reintento
       sería un cobro nuevo. Y vale para los tres caminos: proponer +
       confirmar dos veces tampoco cobra dos veces, porque el pedido es el
       mismo. Ver la nota larga en pedirleAStripe(). */
    'pedido-' . $pedidoId);

    if (!$r['ok']) {
        actualizar('compras_pedidos', $pedidoId, [
            'estado'       => 'fallida',
            'motivo_falla' => mb_substr($r['error'], 0, 300),
        ]);
        anotarEnBitacora($yo, 'no se pudo cobrar una compra', 'compras_pedidos', $pedidoId,
                         mb_substr($concepto, 0, 120));
        responderMal($r['error'], 402);
    }

    actualizar('compras_pedidos', $pedidoId, [
        'estado'                   => 'cobrada',
        'stripe_payment_intent_id' => (string) ($r['datos']['id'] ?? ''),
        'cobrado_en'               => date('Y-m-d H:i:s'),
    ]);

    /* En la bitácora queda qué, cuánto, con qué tarjeta y a dónde. Ni
       token ni número: "Visa ···4242" no le sirve a nadie para comprar. */
    $laTarjeta = trim((string) $metodo['brand'] . ' ···' . (string) $metodo['last4']);

    anotarEnBitacora($yo, 'cobró una compra', 'compras_pedidos', $pedidoId,
        '$' . number_format($monto, 2) . ' · ' . mb_substr($concepto, 0, 80)
        . ' · ' . $laTarjeta . ' · a ' . (string) $direccion['alias']);

    $aviso = avisarDeMovimientoDeDinero(
        'Se cobró $' . number_format($monto, 2) . ' · Ania XV',
        'Se acaba de hacer un cargo a la tarjeta del evento.',
        [
            'Concepto'      => mb_substr($concepto, 0, 120),
            'Monto'         => '$' . number_format($monto, 2) . ' MXN',
            'Tarjeta'       => $laTarjeta,
            'Se entrega en' => (string) $direccion['alias'],
        ],
        $yo
    );

    responderBien([
        'id'      => $pedidoId,
        'estado'  => 'cobrada',
        'mensaje' => 'Cobrado $' . number_format($monto, 2) . '. Va a ' . $direccion['alias'] . '.',
        'aviso'   => $aviso,
    ]);
}

switch ($accion) {

/* ─── CÓMO ESTÁ LA CONEXIÓN ───────────────────────────────────────────── */

case 'config':
    exigirMetodo('GET');

    $publicable = claveStripePublicable();
    $secreta    = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));

    $modoPublicable = modoDeClaveStripe($publicable);
    $modoSecreta    = modoDeClaveStripe($secreta);

    /* El entorno lo decide el SERVIDOR mirando su propio dominio, no el
       navegador: es el mismo criterio que usa reiniciar-prueba.php para
       no existir en producción. */
    $esPruebas = estamosEnPruebas();

    responderBien([
        'entorno'          => $esPruebas ? 'pbe' : 'produccion',

        // La publicable viaja entera: para eso está hecha.
        'publicable'       => $publicable,
        'modo_publicable'  => $modoPublicable,

        /* De la secreta viaja SOLO si está y en qué modo. Nunca su
           valor, ni un pedazo, ni su largo. */
        'secreta_puesta'   => $secreta !== '',
        'modo_secreta'     => $modoSecreta,

        // Para que el panel no tenga que repetir estas reglas.
        /* Si al tocar algo de dinero va a hacer falta la contraseña, o
           si todavía vale la de hace un rato. El panel lo usa para no
           abrir una ventana que el servidor no va a exigir — pero la
           decisión de verdad la toma el servidor en cada acción; esto
           es solo para no molestar de más. */
        'pide_contrasena'  => !confirmoHacePoco($yo),

        'nombre_en_env'    => STRIPE_CLAVE_SECRETA_EN_ENV,
        'modos_coinciden'  => ($modoPublicable !== '' && $modoPublicable === $modoSecreta),

        /* Si además son de la MISMA cuenta de Stripe. Dos claves de
           prueba de cuentas distintas pasan todas las demás
           comprobaciones y no funcionan — ver cuentaDeClaveStripe().
           `null` significa "no se pudo saber", que no es lo mismo que
           "no coinciden" y el panel no debe tratarlo igual. */
        'misma_cuenta'     => (function () use ($publicable, $secreta) {
            $a = cuentaDeClaveStripe($publicable);
            $b = cuentaDeClaveStripe($secreta);
            if ($a === '' || $b === '') return null;
            return $a === $b;
        })(),
        'modo_esperado'    => $esPruebas ? 'prueba' : 'real',
        // Una sola verdad sobre si se puede cobrar: la misma función que
        // usan las acciones. Antes esto repetía la regla a mano y podía
        // decir "listo" cuando el cobro iba a fallar.
        'listo'            => losPagosEstanListos(),
    ]);
    break;


/* ─── GUARDAR LA CLAVE PUBLICABLE ─────────────────────────────────────── */

case 'guardar_config':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $publicable = trim(campoTexto($datos, 'publicable', 200));

    /* Vaciarla es una forma válida de desconectar. */
    if ($publicable !== '') {

        /* ⚠️ LA GUARDA QUE MÁS IMPORTA DE ESTE ARCHIVO.
           Las dos claves de Stripe son cadenas largas y parecidas, y
           este campo se llena copiando y pegando. Pegar la secreta acá
           la metería en la base de datos y la mandaría a todos los
           navegadores que abran el panel: la llave con la que se cobra,
           repartida. Se rechaza antes de mirar nada más. */
        if (strpos($publicable, 'sk_') === 0) {
            responderMal(
                'Esa es la clave SECRETA (empieza con sk_). Esa nunca va acá: ' .
                'va en el archivo .env del servidor. Acá va la publicable, ' .
                'que empieza con pk_.', 400);
        }

        if (strpos($publicable, 'pk_') !== 0) {
            responderMal('La clave publicable de Stripe empieza con pk_. Revisa que hayas copiado la correcta.', 400);
        }

        if (modoDeClaveStripe($publicable) === '') {
            responderMal('No reconozco esa clave: tendría que decir _test_ o _live_ en el medio.', 400);
        }

        /* ⚠️ Y QUE SEA DE LA MISMA CUENTA QUE LA SECRETA.
           Este es el momento de decirlo: cuando alguien la pega. Si se
           deja pasar, todo parece bien —las dos de prueba, el estado en
           verde— y el error aparece mucho después, al abrir el
           formulario de tarjeta, dicho por Stripe en inglés y dentro de
           su iframe. Pasó el 5 de septiembre y costó una tarde. */
        $secretaPuesta = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));
        $cuentaNueva   = cuentaDeClaveStripe($publicable);
        $cuentaSecreta = cuentaDeClaveStripe($secretaPuesta);

        if ($cuentaNueva !== '' && $cuentaSecreta !== '' && $cuentaNueva !== $cuentaSecreta) {
            responderMal(
                'Esa clave publicable es de otra cuenta de Stripe: no coincide con la ' .
                'que está en el servidor. Las dos tienen que salir de la MISMA pantalla ' .
                'de claves — si creaste la restringida en otro sandbox, copia de ahí ' .
                'también la publicable.', 400);
        }
    }

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('stripe_clave_publica', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => $publicable]
    );

    /* En la bitácora queda QUE se cambió y de qué modo, nunca la clave.
       Aunque sea la publicable: un historial no es lugar para llaves. */
    anotarEnBitacora($yo, 'cambió la clave publicable de pagos', 'ajustes', 0,
                     $publicable === '' ? 'quitada' : ('modo ' . modoDeClaveStripe($publicable)));

    responderBien(['modo' => modoDeClaveStripe($publicable)]);
    break;


/* ─── EMPEZAR A GUARDAR UNA TARJETA ───────────────────────────────────

   Devuelve el `client_secret` de un SetupIntent. Con eso, y solo con
   eso, el navegador le manda la tarjeta DIRECTO A STRIPE desde su
   iframe. El número no pasa por acá en ningún momento: cuando el
   navegador vuelve, trae un `pm_...` que ya no es una tarjeta.        */

case 'setup_intent':
    exigirMetodo('POST');
    exigirPagosListos();

    $cliente = clienteDeStripe();
    if ($cliente === '') {
        responderMal('No se pudo preparar la conexión con Stripe. Revisa las claves.', 502);
    }

    $r = pedirleAStripe('POST', 'setup_intents', [
        'customer'               => $cliente,
        'payment_method_types[]' => 'card',
        /* Declara que la tarjeta se va a usar después SIN que ella esté
           mirando la pantalla. Stripe lo necesita saber ahora: es lo que
           le permite al banco autorizar el cobro más tarde sin pedir
           confirmación en ese momento. */
        'usage'                  => 'off_session',
    ],
    /* ⚡ SIN CLAVE DE IDEMPOTENCIA, A PROPÓSITO (2026-09-05)
     *
     * Antes llevaba una con el minuto adentro. Parecía prudente y era un
     * error: dos aperturas del formulario en el mismo minuto recibían EL
     * MISMO SetupIntent. Y un SetupIntent se consume al guardar una
     * tarjeta — así que la segunda apertura se quedaba con uno ya usado,
     * con el que Stripe no dibuja nada: la pantalla salía sin campos
     * donde escribir la tarjeta y el botón se colgaba en "Guardando…".
     *
     * Acá la idempotencia no protege de nada real: esto no se dispara
     * con un botón que se pueda tocar dos veces, sino al ABRIR la
     * pantalla. Un SetupIntent de más no cobra, no cuesta y caduca solo.
     * Cada apertura, el suyo. */
    '');

    if (!$r['ok']) responderMal($r['error'], 502);

    // Solo el client_secret. Es de un solo uso y no sirve para cobrar.
    responderBien(['client_secret' => (string) ($r['datos']['client_secret'] ?? '')]);
    break;


/* ─── GUARDAR LA TARJETA QUE VOLVIÓ ───────────────────────────────────

   El navegador ya hizo el trabajo con Stripe y trae un `pm_...`. Acá NO
   se le cree: se le pregunta a Stripe qué es ese token, y de su
   respuesta salen la marca y los últimos cuatro. Si se guardara lo que
   manda el navegador, cualquiera podría escribir "Visa ···0000".      */

case 'guardar_metodo':
    exigirMetodo('POST');
    exigirPagosListos();
    $datos = cuerpoJson();
    // Dar de alta una tarjeta es habilitar futuros cobros: se confirma
    // con la contraseña, no solo con la sesión abierta.
    exigirContrasenaDeNuevo($yo, $datos);

    $pm = trim(campoTexto($datos, 'payment_method_id', 255));
    if (strpos($pm, 'pm_') !== 0) {
        responderMal('Eso no es una tarjeta guardada por Stripe.', 400);
    }

    $r = pedirleAStripe('GET', 'payment_methods/' . rawurlencode($pm));
    if (!$r['ok']) responderMal($r['error'], 502);

    $tarjeta = isset($r['datos']['card']) && is_array($r['datos']['card'])
        ? $r['datos']['card'] : [];

    $valores = [
        'stripe_payment_method_id' => $pm,
        'brand'     => mb_substr((string) ($tarjeta['brand'] ?? ''), 0, 40),
        'last4'     => mb_substr((string) ($tarjeta['last4'] ?? ''), 0, 4),
        'exp_month' => (int) ($tarjeta['exp_month'] ?? 0),
        'exp_year'  => (int) ($tarjeta['exp_year'] ?? 0),
        'activo'    => 1,
    ];

    /* Guardar la misma tarjeta dos veces no crea una gemela: se
       actualiza la fila que ya está. Si no, quedarían dos entradas
       idénticas y habría que elegir entre dos cosas iguales. */
    $yaEsta = consultarUno(
        'SELECT id FROM metodos_pago WHERE stripe_payment_method_id = :p',
        [':p' => $pm]
    );

    if ($yaEsta) {
        $id = (int) $yaEsta['id'];
        actualizar('metodos_pago', $id, $valores);
    } else {
        // La primera queda como la de siempre sola: si es la única,
        // elegirla a mano sería un trámite sin alternativa.
        $hayAlguna = consultarUno('SELECT id FROM metodos_pago WHERE activo = 1 LIMIT 1');
        $valores['es_predeterminado'] = $hayAlguna ? 0 : 1;
        $id = insertar('metodos_pago', $valores);
    }

    // En la bitácora, la marca y los últimos cuatro. Nunca el token.
    anotarEnBitacora($yo, 'guardó una tarjeta', 'metodos_pago', $id,
                     trim($valores['brand'] . ' ···' . $valores['last4']));

    $aviso = avisarDeMovimientoDeDinero(
        'Se guardó una tarjeta en el panel',
        'Alguien acaba de dar de alta una tarjeta para pagar las compras del evento.',
        [
            'Tarjeta' => trim($valores['brand'] . ' ···' . $valores['last4']),
            'Vence'   => $valores['exp_month'] . '/' . $valores['exp_year'],
        ],
        $yo
    );

    responderBien(['id' => $id, 'aviso' => $aviso]);
    break;


/* ─── LAS TARJETAS QUE HAY ────────────────────────────────────────────

   Nunca devuelve `stripe_payment_method_id`: el panel no lo necesita
   para nada -elige por `id` nuestro- y lo que no sale, no se filtra.  */

case 'listar_metodos':
    exigirMetodo('GET');

    if (!existeTabla('metodos_pago')) responderBien(['filas' => []]);

    responderBien(['filas' => consultarTodo(
        'SELECT id, brand, last4, exp_month, exp_year, es_predeterminado, activo
           FROM metodos_pago
          ORDER BY activo DESC, es_predeterminado DESC, id DESC'
    )]);
    break;


/* ─── CUÁL SE USA POR OMISIÓN ─────────────────────────────────────── */

case 'predeterminar_metodo':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    $fila = $id > 0
        ? consultarUno('SELECT * FROM metodos_pago WHERE id = :i', [':i' => $id])
        : null;

    if (!$fila) responderMal('Esa tarjeta ya no está.', 404);
    if ((int) $fila['activo'] !== 1) {
        responderMal('Esa tarjeta está quitada. Vuelve a activarla primero.', 400);
    }

    // Una sola sentencia, mismo motivo que en direcciones.php: no puede
    // existir un instante sin ninguna predeterminada.
    ejecutar('UPDATE metodos_pago SET es_predeterminado = (id = :i)', [':i' => $id]);

    anotarEnBitacora($yo, 'cambió la tarjeta de siempre', 'metodos_pago', $id,
                     trim((string) $fila['brand'] . ' ···' . (string) $fila['last4']));
    responderBien(['id' => $id]);
    break;


/* ─── QUITAR UNA TARJETA ──────────────────────────────────────────────

   Se desactiva acá y se despega de Stripe, que es lo que de verdad la
   deja inservible. Pero la FILA se conserva: un pedido viejo tiene que
   poder seguir diciendo con qué se pagó.                              */

case 'desactivar_metodo':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    /* Quitar la tarjeta también se confirma. No mueve dinero, pero sí es
       lo primero que haría alguien para tapar un rastro — y quedarse sin
       forma de pagar a dos días del evento tampoco es gratis. */
    exigirContrasenaDeNuevo($yo, $datos);

    $id = campoEntero($datos, 'id', 0);
    $fila = $id > 0
        ? consultarUno('SELECT * FROM metodos_pago WHERE id = :i', [':i' => $id])
        : null;

    if (!$fila) responderMal('Esa tarjeta ya no está.', 404);

    /* Se le avisa a Stripe, pero si falla NO se aborta: lo importante
       para Lucila es que deje de aparecer acá. Un token despegado que
       siguiera activo del lado nuestro sería peor que al revés. */
    if (losPagosEstanListos()) {
        pedirleAStripe('POST',
            'payment_methods/' . rawurlencode((string) $fila['stripe_payment_method_id']) . '/detach');
    }

    actualizar('metodos_pago', $id, ['activo' => 0, 'es_predeterminado' => 0]);

    // Si era la de siempre, otra ocupa su lugar sola.
    $quedaAlguna = consultarUno(
        'SELECT id FROM metodos_pago WHERE activo = 1 AND es_predeterminado = 1 LIMIT 1');
    if (!$quedaAlguna) {
        $reemplazo = consultarUno(
            'SELECT id FROM metodos_pago WHERE activo = 1 ORDER BY id DESC LIMIT 1');
        if ($reemplazo) {
            actualizar('metodos_pago', (int) $reemplazo['id'], ['es_predeterminado' => 1]);
        }
    }

    anotarEnBitacora($yo, 'quitó una tarjeta', 'metodos_pago', $id,
                     trim((string) $fila['brand'] . ' ···' . (string) $fila['last4']));

    $aviso = avisarDeMovimientoDeDinero(
        'Se quitó una tarjeta del panel',
        'Se acaba de dar de baja una tarjeta de las compras del evento.',
        ['Tarjeta' => trim((string) $fila['brand'] . ' ···' . (string) $fila['last4'])],
        $yo
    );

    responderBien(['id' => $id, 'aviso' => $aviso]);
    break;


/* ─── COBRAR ──────────────────────────────────────────────────────────

   ⚠️ LA ÚNICA ACCIÓN DE TODO EL PANEL QUE SACA DINERO DE UNA CUENTA.

   Llega por dos caminos y los dos terminan en el mismo botón: Lucila
   toca Confirmar en una propuesta del chat, o lo pide desde la pantalla
   de compras. MegaBot NUNCA llega hasta acá solo -su propuesta queda
   esperando en `chat_propuestas` hasta que ella confirme (ver la
   whitelist en chat.php).

   LA FILA SE ESCRIBE ANTES DE COBRAR, a propósito. Si se cobrara
   primero, un corte entre el cobro y el registro dejaría dinero fuera
   de la cuenta sin ninguna fila que lo explique. Al revés, lo peor que
   queda es una fila `propuesta` que no llegó a cobrarse: se ve y no
   costó nada.

   SIN REINTENTOS. Si falla, se anota por qué y se para. Reintentar solo
   un cobro es la forma más fácil de cobrar dos veces.                 */

case 'cobrar':
    exigirMetodo('POST');
    exigirPagosListos();
    $datos = cuerpoJson();
    // El único sitio del proyecto que saca dinero de verdad.
    exigirContrasenaDeNuevo($yo, $datos);

    list($concepto, $monto, $direccion, $metodo) = armarLaCompra($datos);
    $pedidoId = guardarLaPropuesta($concepto, $monto, $direccion, $metodo, $datos);

    cobrarUnPedido($pedidoId, $concepto, $monto, $direccion, $metodo, $yo);
    break;


/* ─── PROPONER: DEJARLA ANOTADA, SIN COBRAR ──────────────────────────

   No pide contraseña a propósito: proponer no mueve dinero. Lo que
   cuesta es confirmar, y ahí sí se pide. */

case 'proponer':
    exigirMetodo('POST');
    exigirPagosListos();
    $datos = cuerpoJson();

    list($concepto, $monto, $direccion, $metodo) = armarLaCompra($datos);
    $pedidoId = guardarLaPropuesta($concepto, $monto, $direccion, $metodo, $datos);

    anotarEnBitacora($yo, 'propuso una compra', 'compras_pedidos', $pedidoId,
        '$' . number_format($monto, 2) . ' · ' . mb_substr($concepto, 0, 80));

    responderBien([
        'id'      => $pedidoId,
        'estado'  => 'propuesta',
        // Lo que hace falta para mostrarla y confirmarla, sin volver a pedir.
        'resumen' => [
            'concepto'      => $concepto,
            'monto'         => $monto,
            'moneda'        => 'mxn',
            'tarjeta'       => trim((string) $metodo['brand'] . ' ···' . (string) $metodo['last4']),
            'se_entrega_en' => (string) $direccion['alias'],
        ],
    ]);
    break;


/* ─── CONFIRMAR: COBRAR UNA PROPUESTA QUE YA ESTABA ──────────────── */

case 'confirmar':
    exigirMetodo('POST');
    exigirPagosListos();
    $datos = cuerpoJson();
    exigirContrasenaDeNuevo($yo, $datos);

    $pedidoId = campoEntero($datos, 'id', 0);
    if ($pedidoId <= 0) responderMal('Falta decir qué compra confirmar.', 400);

    $pedido = consultarUno('SELECT * FROM compras_pedidos WHERE id = :i', [':i' => $pedidoId]);
    if (!$pedido) responderMal('Esa compra no existe.', 404);

    /* Solo se cobra lo que está esperando. Una ya cobrada no se vuelve a
       cobrar por más que se toque el botón dos veces, y una fallida se
       vuelve a proponer, no se reintenta a ciegas. */
    if ((string) $pedido['estado'] !== 'propuesta') {
        responderMal('Esa compra ya está en «' . (string) $pedido['estado']
                   . '», así que no se puede confirmar.', 409);
    }

    $direccion = consultarUno('SELECT * FROM direcciones_entrega WHERE id = :i',
                              [':i' => (int) $pedido['direccion_id']]);
    $metodo = consultarUno('SELECT * FROM metodos_pago WHERE id = :i AND activo = 1',
                           [':i' => (int) $pedido['metodo_pago_id']]);

    /* Entre proponer y confirmar puede haber pasado un rato, y en ese
       rato la tarjeta pudo darse de baja o la dirección desactivarse. */
    if (!$direccion) responderMal('La dirección de esa compra ya no está.', 409);
    if (!$metodo) {
        responderMal('La tarjeta de esa compra ya no está activa. '
                   . 'Agrega una y vuelve a proponer la compra.', 409);
    }

    cobrarUnPedido($pedidoId, (string) $pedido['concepto'], (float) $pedido['monto'],
                   $direccion, $metodo, $yo);
    break;


/* ══════════════════════════════════════════════════════════════════════
   DESHACER: CANCELAR Y DEVOLVER

   Hasta hoy una compra solo iba hacia adelante. Una propuesta que ya no
   servía se quedaba en la lista para siempre, y un cobro hecho por
   error solo se podía devolver entrando al panel de Stripe a mano —o
   sea, saliendo de esta app y usando una herramienta que Lucila no
   tiene por qué saber usar.

   SON DOS COSAS DISTINTAS Y POR ESO SON DOS ACCIONES

   `cancelar`  · sobre una PROPUESTA. No se cobró nada, así que no hay
                 nada que devolver: se marca y se acabó. No toca Stripe
                 ni pide contraseña, porque no mueve un peso.

   `reembolsar`· sobre una compra COBRADA. Hay dinero afuera y hay que
                 pedirle a Stripe que lo devuelva. Mueve dinero, así que
                 lleva las mismas guardas que cobrar: contraseña,
                 bitácora, aviso por correo e idempotencia.

   Mezclarlas en una sola acción «deshacer» habría hecho que la más
   inocente arrastrara las guardas de la más seria, o —peor— que la
   seria heredara la liviandad de la otra.
   ══════════════════════════════════════════════════════════════════════ */

case 'cancelar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $pedidoId = campoEntero($datos, 'id', 0);
    if ($pedidoId <= 0) responderMal('Falta decir qué compra cancelar.', 400);

    $pedido = consultarUno('SELECT * FROM compras_pedidos WHERE id = :i', [':i' => $pedidoId]);
    if (!$pedido) responderMal('Esa compra no existe.', 404);

    /* Solo lo que está esperando. Una cobrada se devuelve con
       `reembolsar` —que sí habla con Stripe—, y dejar que «cancelar» la
       tocara sería marcarla como no cobrada con la plata ya afuera. */
    if ((string) $pedido['estado'] !== 'propuesta') {
        responderMal('Esa compra está en «' . (string) $pedido['estado']
                   . '». Solo se puede cancelar una que esté esperando.', 409);
    }

    actualizar('compras_pedidos', $pedidoId, ['estado' => 'cancelada']);

    anotarEnBitacora($yo, 'canceló una compra propuesta', 'compras_pedidos', $pedidoId,
        '$' . number_format((float) $pedido['monto'], 2) . ' · '
        . mb_substr((string) $pedido['concepto'], 0, 80));

    responderBien([
        'id'      => $pedidoId,
        'estado'  => 'cancelada',
        'mensaje' => 'Cancelada. No se cobró nada.',
    ]);
    break;


case 'reembolsar':
    exigirMetodo('POST');
    exigirPagosListos();
    $datos = cuerpoJson();
    // Devolver dinero es mover dinero: mismas guardas que cobrarlo.
    exigirContrasenaDeNuevo($yo, $datos);

    $pedidoId = campoEntero($datos, 'id', 0);
    if ($pedidoId <= 0) responderMal('Falta decir qué compra devolver.', 400);

    $pedido = consultarUno('SELECT * FROM compras_pedidos WHERE id = :i', [':i' => $pedidoId]);
    if (!$pedido) responderMal('Esa compra no existe.', 404);

    if ((string) $pedido['estado'] !== 'cobrada') {
        responderMal('Esa compra está en «' . (string) $pedido['estado']
                   . '», así que no hay nada que devolver.', 409);
    }

    $intento = trim((string) $pedido['stripe_payment_intent_id']);
    if ($intento === '') {
        /* Figura cobrada pero no quedó el identificador de Stripe: sin
           él no se puede pedir la devolución, y decirlo así manda a
           mirar el panel de Stripe en vez de dejar creer que se hizo. */
        responderMal('Esa compra no tiene guardado su número de cobro en Stripe. '
                   . 'Hay que devolverla desde el panel de Stripe.', 409);
    }

    $r = pedirleAStripe('POST', 'refunds', ['payment_intent' => $intento],
        /* Mismo seguro que el cobro: la clave sale del id del pedido,
           que ya existe y no cambia entre reintentos. Dos toques al
           botón no devuelven dos veces. */
        'devolucion-' . $pedidoId);

    if (!$r['ok']) {
        anotarEnBitacora($yo, 'no se pudo devolver una compra', 'compras_pedidos', $pedidoId,
                         mb_substr($r['error'], 0, 120));
        responderMal($r['error'], 402);
    }

    actualizar('compras_pedidos', $pedidoId, ['estado' => 'reembolsada']);

    $monto = (float) $pedido['monto'];

    anotarEnBitacora($yo, 'devolvió una compra', 'compras_pedidos', $pedidoId,
        '$' . number_format($monto, 2) . ' · '
        . mb_substr((string) $pedido['concepto'], 0, 80));

    $aviso = avisarDeMovimientoDeDinero(
        'Se devolvió $' . number_format($monto, 2) . ' · Ania XV',
        'Se devolvió un cargo hecho a la tarjeta del evento.',
        [
            'Concepto'   => mb_substr((string) $pedido['concepto'], 0, 120),
            'Monto'      => '$' . number_format($monto, 2) . ' MXN',
            'Se cobró el' => (string) $pedido['cobrado_en'],
        ],
        $yo
    );

    responderBien([
        'id'      => $pedidoId,
        'estado'  => 'reembolsada',
        'mensaje' => 'Devuelto $' . number_format($monto, 2) . '. '
                   . 'El banco puede tardar unos días en mostrarlo.',
        'aviso'   => $aviso,
    ]);
    break;


/* ─── EL HISTORIAL ────────────────────────────────────────────────── */

case 'listar_pedidos':
    exigirMetodo('GET');

    if (!existeTabla('compras_pedidos')) responderBien(['filas' => []]);

    responderBien(['filas' => consultarTodo(
        'SELECT p.*, d.alias AS direccion_alias, m.brand, m.last4
           FROM compras_pedidos p
           LEFT JOIN direcciones_entrega d ON d.id = p.direccion_id
           LEFT JOIN metodos_pago m ON m.id = p.metodo_pago_id
          ORDER BY p.creado_en DESC
          LIMIT 100'
    )]);
    break;


default:
    responderMal('No sé hacer eso.', 400);
}
