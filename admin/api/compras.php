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

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'config');

/** El nombre EXACTO de la clave secreta en el .env. Si esto cambia, hay
    que cambiarlo también en la pantalla del panel y en el instructivo. */
const STRIPE_CLAVE_SECRETA_EN_ENV = 'STRIPE_CLAVE_SECRETA';

/** La publicable se puede poner por el panel o por el .env. La del panel
    gana; ésta es el respaldo para quien prefiera dejar las dos juntas. */
const STRIPE_CLAVE_PUBLICA_EN_ENV = 'STRIPE_CLAVE_PUBLICA';


/**
 * En qué modo está una clave de Stripe, mirando solo su prefijo.
 *
 * No valida que la clave sirva —eso solo lo sabe Stripe— pero distingue
 * lo único que hace falta acá: si es de prueba o de la cuenta real.
 *
 * @param string $clave
 * @return string 'prueba', 'real' o '' si no se reconoce.
 */
function modoDeClaveStripe($clave) {
    $clave = trim((string) $clave);
    if ($clave === '') return '';

    if (strpos($clave, '_test_') !== false) return 'prueba';
    if (strpos($clave, '_live_') !== false) return 'real';
    return '';
}

/**
 * La clave publicable que se está usando: la del panel, o la del .env
 * si el panel no tiene ninguna.
 *
 * @return string
 */
function claveStripePublicable() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'stripe_clave_publica'");
    $delPanel = trim((string) ($fila['valor'] ?? ''));
    if ($delPanel !== '') return $delPanel;

    return trim((string) env(STRIPE_CLAVE_PUBLICA_EN_ENV, ''));
}


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
        'resource_missing'        => 'Esa tarjeta ya no existe en Stripe. Vuelve a cargarla.',
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
    if ($guardado !== '') return $guardado;

    /* Clave fija a propósito: este cliente de Stripe es UNO solo para
       todo el evento (por eso se guarda en `ajustes`). Si dos peticiones
       simultáneas llegaran acá con la tabla vacía, sin esto quedarían
       dos clientes en Stripe y las tarjetas repartidas entre ambos. */
    $r = pedirleAStripe('POST', 'customers', [
        'description' => 'XV de Ania - compras del evento',
    ], 'cliente-unico-del-evento');

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

/**
 * Si los pagos están listos para cobrar: las dos claves puestas.
 *
 * @return bool
 */
function losPagosEstanListos() {
    $pub = claveStripePublicable();
    $sec = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));
    if ($pub === '' || $sec === '') return false;

    $modoPub = modoDeClaveStripe($pub);
    return $modoPub !== '' && $modoPub === modoDeClaveStripe($sec);
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
   en ninguna otra: son raras, y conviene que cuesten.

   NO SE GUARDA NADA. No hay sello temporal ni tabla nueva: se comprueba
   contra el mismo hash del login y se descarta. Un sello de "ya me
   identifiqué hace 5 minutos" sería otra cosa que robar.
   ══════════════════════════════════════════════════════════════════════ */

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
    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if (existeTabla('intentos_login')) {
        $fila = consultarUno(
            'SELECT COUNT(*) AS n FROM intentos_login
             WHERE ip = :ip AND correo = :marca
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
 * @return void
 */
function avisarDeMovimientoDeDinero($asunto, $resumen, $detalle, $yo) {
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

        foreach ($destinatarios as $destino) {
            $resultado = enviarCorreo($destino, $asunto, $html);
            if ($resultado !== true) {
                error_log('[Ania XV · compras] No salió el aviso a ' . $destino . ': ' . $resultado);
            }
        }

        if (function_exists('avisarATodos')) avisarATodos();
    } catch (Throwable $e) {
        // Cualquier cosa que pase acá es menos grave que perder el cobro.
        error_log('[Ania XV · compras] Falló el aviso de dinero: ' . $e->getMessage());
    }
}

/** Cuántos cobros como mucho, y en cuánto rato. */
const COBROS_MAXIMOS_SEGUIDOS = 5;
const MINUTOS_DE_VENTANA_DE_COBRO = 10;
const MARCA_DE_COBRO = '__cobro__';

/**
 * Frena una ráfaga de cobros.
 *
 * ⚡ POR QUÉ HACE FALTA UNO PROPIO (2026-09-05)
 * El techo general del panel es de 300 peticiones cada 5 minutos
 * (PETICIONES_API_MAXIMAS, _lib/sesion.php). Para leer la lista de
 * invitados está bien; para SACAR DINERO es absurdo: caben decenas de
 * cobros seguidos sin que nada se queje.
 *
 * Cinco en diez minutos es holgado para el uso real —se compran cosas
 * de a una, mirando— y corta en seco cualquier ráfaga, venga de una
 * sesión robada o de un bucle mal escrito.
 *
 * Se cuentan los INTENTOS, no los cobros que salieron bien: si están
 * fallando cinco seguidos, con más razón hay que parar.
 *
 * @return void
 */
function exigirRitmoDeCobro() {
    if (!existeTabla('intentos_login')) return;

    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    $fila = consultarUno(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo = :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL ' . MINUTOS_DE_VENTANA_DE_COBRO . ' MINUTE)',
        [':ip' => $ip, ':marca' => MARCA_DE_COBRO]
    );

    if ($fila && (int) $fila['n'] >= COBROS_MAXIMOS_SEGUIDOS) {
        responderMal('Van muchos cobros seguidos. Por seguridad hay que esperar '
                   . MINUTOS_DE_VENTANA_DE_COBRO . ' minutos antes de otro.', 429);
    }

    // Se anota ANTES de cobrar: si se anotara después, un cobro que
    // tarda o falla a medias no contaría y el freno sería salteable.
    insertar('intentos_login', ['ip' => $ip, 'correo' => MARCA_DE_COBRO]);
}

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
    $esPruebas = strpos((string) ($_SERVER['HTTP_HOST'] ?? ''), 'pbe.') !== false;

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
        'nombre_en_env'    => STRIPE_CLAVE_SECRETA_EN_ENV,
        'modos_coinciden'  => ($modoPublicable !== '' && $modoPublicable === $modoSecreta),
        'modo_esperado'    => $esPruebas ? 'prueba' : 'real',
        'listo'            => ($publicable !== '' && $secreta !== ''
                               && $modoPublicable !== '' && $modoPublicable === $modoSecreta),
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
    /* Acá la clave NO puede ser fija: un SetupIntent se consume al
       guardar una tarjeta, y con una clave fija la segunda alta
       recibiría el mismo intento ya usado y no se podría agregar otra
       tarjeta nunca más. Con el minuto adentro, un doble toque reusa el
       mismo intento —que es el caso a evitar— y una alta de verdad más
       tarde consigue el suyo. */
    'setup-' . (int) $yo['id'] . '-' . floor(time() / 60));

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

    avisarDeMovimientoDeDinero(
        'Se guardó una tarjeta en el panel',
        'Alguien acaba de dar de alta una tarjeta para pagar las compras del evento.',
        [
            'Tarjeta' => trim($valores['brand'] . ' ···' . $valores['last4']),
            'Vence'   => $valores['exp_month'] . '/' . $valores['exp_year'],
        ],
        $yo
    );

    responderBien(['id' => $id]);
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

    avisarDeMovimientoDeDinero(
        'Se quitó una tarjeta del panel',
        'Se acaba de dar de baja una tarjeta de las compras del evento.',
        ['Tarjeta' => trim((string) $fila['brand'] . ' ···' . (string) $fila['last4'])],
        $yo
    );

    responderBien(['id' => $id]);
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
    exigirRitmoDeCobro();

    $concepto = campoTexto($datos, 'concepto', 300);
    if ($concepto === '') responderMal('Falta decir qué se está comprando.', 400);

    $monto = (float) ($datos['monto'] ?? 0);
    if ($monto <= 0) responderMal('El monto tiene que ser mayor que cero.', 400);

    /* Un tope de cordura. No protege de un error de mil pesos, pero sí
       de un cero de más -que con un cobro automático es la diferencia
       entre un ramo y un coche. */
    if ($monto > 50000) {
        responderMal('Ese monto es más alto de lo que este panel cobra solo ($50,000). '
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

    // La fila primero, en `propuesta`. Ver la nota de arriba.
    $pedidoId = insertar('compras_pedidos', [
        'concepto'       => $concepto,
        'monto'          => $monto,
        'moneda'         => 'mxn',
        'direccion_id'   => $direccionId,
        'metodo_pago_id' => $metodoId,
        'estado'         => 'propuesta',
        'detalle_json'   => isset($datos['detalle']) && is_array($datos['detalle'])
            ? json_encode($datos['detalle'], JSON_UNESCAPED_UNICODE) : null,
    ]);

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
       `$pedidoId` es de la fila que se acaba de insertar unas líneas más
       arriba: existe antes de que Stripe sepa nada, es único, y NO
       cambia si esta misma petición se repite. Eso es justo lo que hace
       falta — con un número al azar, cada reintento sería un cobro
       nuevo. Ver la nota larga en pedirleAStripe(). */
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
    anotarEnBitacora($yo, 'cobró una compra', 'compras_pedidos', $pedidoId,
        '$' . number_format($monto, 2) . ' · ' . mb_substr($concepto, 0, 80)
        . ' · ' . trim((string) $metodo['brand'] . ' ···' . (string) $metodo['last4'])
        . ' · a ' . (string) $direccion['alias']);

    avisarDeMovimientoDeDinero(
        'Se cobró $' . number_format($monto, 2) . ' · Ania XV',
        'Se acaba de hacer un cargo a la tarjeta del evento.',
        [
            'Concepto'  => mb_substr($concepto, 0, 120),
            'Monto'     => '$' . number_format($monto, 2) . ' MXN',
            'Tarjeta'   => trim((string) $metodo['brand'] . ' ···' . (string) $metodo['last4']),
            'Se entrega en' => (string) $direccion['alias'],
        ],
        $yo
    );

    responderBien([
        'id'       => $pedidoId,
        'estado'   => 'cobrada',
        'mensaje'  => 'Cobrado $' . number_format($monto, 2) . '. Va a ' . $direccion['alias'] . '.',
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
