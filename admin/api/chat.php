<?php
/* ══════════════════════════════════════════════════════════════════════
   CHAT.PHP · EL PUENTE ENTRE LUCILA Y MEGABOT

   QUÉ HACE ESTE ARCHIVO
   Es el único lugar del panel que habla con el "cerebro" de MegaBot —
   un Orquestador que vive AFUERA de este repo (equipo Cursor). Este
   archivo no piensa nada: guarda lo que escribe Lucila, le avisa al
   Orquestador por webhook, y guarda lo que el Orquestador contesta. La
   UI (admin/codigo/32-asistente.js) hace polling sobre 'listar' para
   ver las respuestas nuevas sin recargar la página.

   ⚠️ ESTE ARCHIVO NUNCA ESCRIBE mesas/dinero/tareas DIRECTO. Cuando
   MegaBot propone una acción, la UI la muestra con Confirmar/Cancelar;
   si Lucila confirma, es SU BROWSER el que llama al PHP de siempre
   (mesas.php, presupuesto.php, planificador.php) con SU token. Acá solo
   se guarda el estado de esa propuesta (aceptada/rechazada/ejecutada).
   Ver la nota grande de "Principio sagrado" en el prompt que armó este
   archivo: nunca un segundo camino para guardar.

   DOS FORMAS DE AUTENTICARSE, SEGÚN LA ACCIÓN
     - listar / enviar / propuesta_estado / reenviar / rotar_clave:
       sesión normal del panel (Bearer, exigirSesion()) — es Lucila o
       Carlos usando la app.
     - responder / contexto: SIN sesión de usuario. Llegan del
       Orquestador, que no tiene cuenta en este panel. Se validan con un
       header propio, `X-MegaBot-Clave`, comparado con
       `ajustes.megabot_servicio_clave` (sembrada por instalar.php si no
       existía). Es el ÚNICO lugar del proyecto con un mecanismo de
       autenticación que no es el Bearer de sesión — no había nada
       parecido para reusar, se escribió de cero.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar&despues_de=0        mensajes del hilo, nuevos primero
                        &esperar=1           deja la petición abierta hasta
                                             25 s y contesta apenas hay algo
     POST ?accion=enviar        {texto, pantalla}
     POST ?accion=propuesta_estado  {id, estado: 'aceptada'|'rechazada'}
     POST ?accion=reenviar      {mensaje_id}
     POST ?accion=rotar_clave   (solo admin)
     POST ?accion=responder     {hilo_id, en_respuesta_a?, texto, propuestas?[],
                                 uso?, latencia?}                (X-MegaBot-Clave)
     GET  ?accion=contexto&hilo_id=          (X-MegaBot-Clave)

   ══════════════════════════════════════════════════════════════════════
   CÓMO SE PROPONE UNA COMPRA — EL CONTRATO, EN UN SOLO LUGAR

   MegaBot NO cobra. Manda una PROPUESTA dentro de `accion=responder`, y
   esa propuesta se pinta como una tarjeta con Confirmar / Cancelar. El
   cobro sale del Confirmar y de ningún otro lado:

       "propuestas": [{
         "titulo":  "Comprar el ramo de la entrada",
         "detalle": "Rosas blancas · Florería del Centro",
         "accion":  "compras.php?accion=cobrar",
         "cuerpo":  {
           "concepto": "Ramo de rosas blancas",
           "monto": 1250.00,
           "direccion_id": 1,        ← opcional: sin él, la predeterminada
           "metodo_pago_id": 3       ← opcional: sin él, la predeterminada
         }
       }]

   LAS REGLAS
     1. `accion` se compara contra ACCIONES_PERMITIDAS_PARA_MEGABOT acá
        en el servidor. La que no esté en la lista se descarta en
        silencio y el texto igual llega.
     2. Los ids son los INTERNOS que vienen en el contexto, nunca un
        `pm_` de Stripe — ese token no sale de este servidor.
     3. Antes de proponer, mirar `contexto.compras.pagos_listos`. Si es
        false, no hay con qué cobrar: corresponde decir que falta
        guardar una tarjeta, no proponer un cobro que va a fallar.
     4. `contexto.compras.pedidos` trae las últimas diez compras con su
        estado. Sirve para no proponer dos veces lo mismo y para poder
        contestar qué se lleva gastado.
     5. Hay un tope por compra (TOPE_DE_COBRO_AUTOMATICO en compras.php).
        Por encima, el servidor rechaza: eso se paga a mano.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/mesas.php';
// Para saber si se puede cobrar SIN volver a escribir la regla: la
// definición vive en un solo sitio y compras.php lee la misma.
require_once __DIR__ . '/_lib/pagos.php';

if (!existeTabla('chat_hilos') || !existeTabla('chat_mensajes') || !existeTabla('chat_propuestas')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}

/* ─── LA WHITELIST — la ÚNICA lista de acciones que una propuesta de
   MegaBot puede pedir ejecutar. Si algún día se cambia, hay que cambiar
   TAMBIÉN la copia en JS (admin/codigo/32-asistente.js) — a propósito
   no se manda esta lista al browser dinámicamente: es más simple tener
   dos copias chicas y sincronizadas que armar un tercer endpoint solo
   para publicarla. ───────────────────────────────────────────────── */
const ACCIONES_PERMITIDAS_PARA_MEGABOT = [
    'presupuesto.php?accion=marcar_pagado',
    'mesas.php?accion=sentar_auto',
    'mesas.php?accion=autoasignar',
    'mesas.php?accion=deshacer',
    'planificador.php?accion=estado_tarea',

    /* ⚠️ LA ÚNICA ACCIÓN DE ESTA LISTA QUE MUEVE DINERO (2026-09-04)
       Entra porque el circuito entero se apoya en que MegaBot pueda
       PROPONER una compra. Proponer no cobra: la propuesta queda
       esperando, y el cobro sale recién cuando Lucila toca Confirmar en
       el panel (ver 32-asistente.js). No hay ningún camino donde el
       webhook cobre solo.

       `setup_intent` y `guardar_metodo` NO entran a propósito: guardar
       una tarjeta se hace en Ajustes, mirando la pantalla. No es algo
       que tenga sentido proponer desde una conversación. */
    'compras.php?accion=cobrar',

    /* `proponer` deja la compra anotada sin cobrar nada, así que puede
       entrar sin más: es literalmente el trabajo de MegaBot.

       ⚠️ `confirmar` NO ENTRA, Y NO PUEDE ENTRAR. Es la acción que
       dispara el cobro de una propuesta ya hecha, y confirmar es
       exactamente lo que tiene que hacer una persona mirando la
       pantalla. Meterla en esta lista sería darle a MegaBot las dos
       mitades del circuito —proponer y aprobar— y con eso el Confirmar
       de Lucila dejaría de ser la única puerta al dinero. */
    'compras.php?accion=proponer',
];

$accion = (string) ($_GET['accion'] ?? '');


/**
 * La clave que mandó el Orquestador en el header `X-MegaBot-Clave`.
 * Mismo mecanismo que ya usa tokenDeLaPeticion() (_lib/sesion.php) para
 * leer el Bearer — getallheaders() con respaldo en $_SERVER, porque no
 * todas las configuraciones de Apache exponen la primera.
 *
 * @return string
 */
function claveDeServicioDeLaPeticion() {
    $cabeceras = [];
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $nombre => $valor) {
            $cabeceras[strtolower($nombre)] = $valor;
        }
    }
    return (string) ($cabeceras['x-megabot-clave']
        ?? $_SERVER['HTTP_X_MEGABOT_CLAVE']
        ?? '');
}

/**
 * Corta la petición con 401 si la clave de servicio no coincide.
 *
 * @return void
 */
function exigirClaveDeServicio() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_servicio_clave'");
    $esperada = (string) ($fila['valor'] ?? '');
    $recibida = claveDeServicioDeLaPeticion();

    if ($esperada === '' || $recibida === '' || !hash_equals($esperada, $recibida)) {
        responderMal('Clave de servicio inválida.', 401);
    }
}

/**
 * El hilo de un usuario — se crea la primera vez que hace falta.
 *
 * @param int $usuarioId
 * @return int
 */
function hiloDe($usuarioId) {
    $fila = consultarUno('SELECT id FROM chat_hilos WHERE usuario_id = :u', [':u' => $usuarioId]);
    if ($fila) return (int) $fila['id'];
    return insertar('chat_hilos', ['usuario_id' => $usuarioId]);
}

/**
 * El snapshot compacto que ve MegaBot: nunca listas enteras, solo los
 * números que ya calculan las pantallas del panel — se REUSAN esos
 * cálculos (estadisticas.php, _lib/mesas.php), no se duplica lógica de
 * negocio acá. Menos de ~30KB siempre: son puros conteos.
 *
 * @param string $pantalla
 * @param array  $usuario
 * @return array
 */
function construirContexto($pantalla, $usuario) {
    $contexto = [
        'pantalla' => $pantalla,
        'usuario'  => [
            'id'     => (int) ($usuario['id'] ?? 0),
            'nombre' => (string) ($usuario['nombre'] ?? ''),
            'rol'    => (string) ($usuario['rol'] ?? ''),
        ],
    ];

    // El evento: fecha/hora/lugar fijos del quince — no vive en una
    // tabla, es texto conocido del proyecto (mismo dato que ya muestra
    // el sitio público). Si algún día se vuelve editable, este es el
    // único lugar que hay que tocar.
    $contexto['evento'] = ['fecha' => '2026-10-24', 'hora' => '17:00', 'lugar' => 'Salones Alvi, Toluca'];

    // Cupo: misma cuenta que ya hace admin/api/estadisticas.php.
    if (existeTabla('confirmaciones')) {
        $cols = columnasDe('confirmaciones');
        if (in_array('asiste', $cols, true) && in_array('adultos', $cols, true) && in_array('ninos', $cols, true)) {
            $t = consultarUno(
                'SELECT COUNT(*) AS filas,
                        COALESCE(SUM(adultos+ninos),0) AS personas
                 FROM confirmaciones WHERE asiste = 1'
            );
            $capacidad = existeTabla('mesas')
                ? (int) (consultarUno('SELECT COALESCE(SUM(capacidad),0) AS t FROM mesas')['t'] ?? 0)
                : 0;
            $personas = (int) ($t['personas'] ?? 0);
            $contexto['cupo'] = [
                'capacidad_salon'  => $capacidad,
                'personas_asisten' => $personas,
                'filas_asisten'    => (int) ($t['filas'] ?? 0),
                'libres'           => max(0, $capacidad - $personas),
            ];
        }
    }

    // Mesas: mismo motor que ya usa admin/api/mesas.php (panoramaDeMesas(),
    // _lib/mesas.php) — no se reimplementa el cálculo acá.
    if (existeTabla('mesas')) {
        try {
            // panoramaDeMesas() (_lib/mesas.php) devuelve 'mesas' e
            // 'invitados' (unidades por sentar), NO un 'sin_sentar' ya
            // armado -eso lo calcula cada consumidor según lo que
            // necesite (acá, solo contar). mesa_id null = todavía sin
            // lugar.
            // intentando() (ver _lib/bd.php) hace que un fallo de la
            // base LANCE en vez de cortar la petición. Sin eso este
            // catch nunca corría: si faltaba una tabla del acomodo,
            // preguntarle CUALQUIER cosa al asistente devolvía 500 en
            // vez de contestar sin el dato de mesas.
            $panorama = intentando('panoramaDeMesas');
            $totalGente = 0;
            $sinSentar = 0;
            foreach ($panorama['invitados'] as $u) {
                $totalGente += (int) $u['lugares_necesarios'];
                if (empty($u['mesa_id'])) $sinSentar++;
            }
            $capacidadTotal = 0;
            foreach ($panorama['mesas'] as $m) $capacidadTotal += (int) $m['capacidad'];
            $contexto['mesas'] = [
                'mesas'          => count($panorama['mesas']),
                'sin_sentar'     => $sinSentar,
                'faltan_lugares' => max(0, $totalGente - $capacidadTotal),
            ];
        } catch (Throwable $e) {
            error_log('[Ania XV · chat] No se pudo armar el contexto de mesas: ' . $e->getMessage());
        }
    }

    // Dinero: categorías al techo + pagos vencidos, mismos datos que ya
    // muestra la pantalla de Presupuesto — un par de agregados chicos,
    // no vale la pena partir presupuesto.php en piezas por esto.
    if (existeTabla('categorias_gasto') && existeTabla('gastos')) {
        $alTecho = consultarTodo(
            'SELECT c.nombre
             FROM categorias_gasto c
             JOIN gastos g ON g.categoria_id = c.id
             WHERE c.techo > 0
             GROUP BY c.id, c.nombre, c.techo
             HAVING COALESCE(SUM(g.monto_real), 0) >= c.techo'
        );
        $contexto['dinero'] = [
            'alerta_categorias' => array_column($alTecho, 'nombre'),
        ];
    }
    if (existeTabla('pagos')) {
        $vencidos = consultarUno(
            "SELECT COUNT(*) AS n FROM pagos
             WHERE estado = 'pendiente' AND fecha_limite IS NOT NULL AND fecha_limite < CURDATE()"
        );
        $contexto['dinero']['pagos_vencidos'] = (int) ($vencidos['n'] ?? 0);
    }

    // Tareas: vencidas y las de hoy — mismo criterio que
    // codigo/43-agente-fechas.js/44-agente-hoy.js, en SQL.
    if (existeTabla('tareas')) {
        $t = consultarUno(
            "SELECT
                SUM(CASE WHEN estado <> 'hecha' AND fecha_limite IS NOT NULL AND fecha_limite < CURDATE() THEN 1 ELSE 0 END) AS vencidas,
                SUM(CASE WHEN estado <> 'hecha' AND fecha_limite = CURDATE() THEN 1 ELSE 0 END) AS vencen_hoy
             FROM tareas"
        );
        $contexto['tareas'] = [
            'vencidas'   => (int) ($t['vencidas'] ?? 0),
            'vencen_hoy' => (int) ($t['vencen_hoy'] ?? 0),
        ];
    }

    /* ─── COMPRAS ────────────────────────────────────────────────────
       Lo mínimo para que MegaBot pueda proponer una compra sensata sin
       tener que preguntar lo que ya se sabe: si hay a dónde mandarla, si
       hay con qué pagarla, y cómo se llaman las predeterminadas.

       ⚠️ ACÁ NO VIAJA NINGÚN TOKEN. Ni el `pm_` de la tarjeta, ni la
       clave de Stripe, ni la dirección completa. Este bloque sale del
       repositorio por un webhook hacia un servicio de afuera: lo único
       que cruza es lo que hace falta para redactar una propuesta -un
       alias, una marca y cuatro dígitos que no sirven para comprar.

       Los CONTEOS van además de los nombres a propósito: con
       `metodos_activos: 0` MegaBot sabe que tiene que decir "primero
       guardá una tarjeta" en vez de proponer un cobro que va a fallar. */
    /* ⚡ CON IDs, NO CON CONTEOS (2026-09-05)
     *
     * Esto mandaba `direcciones_activas: 1` y el alias de la
     * predeterminada. MegaBot lo dijo con todas las letras: "sin IDs no
     * puedo armar cobro ni elegir direccion". Tenia razon — se le pedia
     * que propusiera una compra sin darle con que referirse a nada.
     *
     * ⚠️ LOS ids SON LOS INTERNOS, NO EL TOKEN DE STRIPE.
     * El contrato que mando pedia `metodos[].id` = `pm_...`. Ese token
     * es, junto con la clave secreta, lo unico que sirve para cobrar: es
     * exactamente lo que la nota de arriba prohibe sacar de aca, y lo que
     * `listar_metodos` tampoco devuelve al panel.
     *
     * Y no hace falta: `compras.php?accion=cobrar` recibe
     * `metodo_pago_id` y `direccion_id` con campoEntero(), o sea el id de
     * la fila. Con eso MegaBot propone igual y el token no sale del
     * servidor. */
    if (existeTabla('direcciones_entrega')) {
        $contexto['compras'] = [
            'pagos_listos' => false,
            'direcciones'  => [],
            'metodos'      => [],
            'direccion_predeterminada_id' => null,
            'metodo_predeterminado_id'    => null,
        ];

        foreach (consultarTodo(
            'SELECT id, alias, es_predeterminada FROM direcciones_entrega
              WHERE activa = 1 ORDER BY es_predeterminada DESC, id ASC') as $d) {

            $esPredet = (int) $d['es_predeterminada'] === 1;

            // El alias y nada mas: la direccion completa no tiene por que
            // salir del servidor para redactar una propuesta.
            $contexto['compras']['direcciones'][] = [
                'id'               => (int) $d['id'],
                'alias'            => (string) $d['alias'],
                'es_predeterminada' => $esPredet,
            ];

            if ($esPredet) {
                $contexto['compras']['direccion_predeterminada_id'] = (int) $d['id'];
            }
        }
    }

    if (existeTabla('metodos_pago') && isset($contexto['compras'])) {
        foreach (consultarTodo(
            'SELECT id, brand, last4, es_predeterminado FROM metodos_pago
              WHERE activo = 1 ORDER BY es_predeterminado DESC, id ASC') as $m) {

            $esPredet = (int) $m['es_predeterminado'] === 1;

            $contexto['compras']['metodos'][] = [
                'id'                => (int) $m['id'],
                'brand'             => (string) $m['brand'],
                'last4'             => (string) $m['last4'],
                'es_predeterminada' => $esPredet,
            ];

            if ($esPredet) {
                $contexto['compras']['metodo_predeterminado_id'] = (int) $m['id'];
            }
        }
    }

    if (isset($contexto['compras'])) {
        /* ⚡ UNA SOLA FUENTE DE VERDAD (2026-09-05)
         *
         * Aca habia una copia de la regla de "se puede cobrar", escrita a
         * mano. Y ya se habia separado de la de compras.php: ese archivo
         * exige ademas que las dos claves sean de la MISMA CUENTA de
         * Stripe, y esta copia no. O sea que el chat podia decirle a
         * MegaBot que se podia cobrar, MegaBot proponerle la compra a
         * Lucila, y el cobro fallar.
         *
         * Ahora las dos preguntan a la misma funcion (_lib/pagos.php).
         * Se le suma que haya con que pagar, que es cosa del contexto y
         * no de las claves. */
        $contexto['compras']['pagos_listos'] =
            losPagosEstanListos() && count($contexto['compras']['metodos']) > 0;

        /* ⚡ LAS COMPRAS QUE YA EXISTEN (2026-09-06)
         *
         * POR QUÉ HACE FALTA
         * Hasta acá el contexto decía con qué se puede pagar, pero no
         * qué se pagó. O sea que MegaBot podía proponer una compra y no
         * podía contestar "¿ya compré las flores?" ni "¿cuánto llevo
         * gastado?" — y peor: sin saber que una compra igual ya está
         * cobrada, lo natural es proponerla otra vez.
         *
         * Las últimas y nada más: el hilo del chat no es un libro de
         * cuentas, y mandar el historial entero en CADA mensaje sería
         * pagar el viaje de cien filas para redactar una frase.
         *
         * ⚠️ NO VIAJA NINGÚN TOKEN NI NINGÚN NÚMERO DE TARJETA — misma
         * regla que gobierna todo este bloque. Concepto, monto, estado y
         * fecha: lo que hace falta para hablar de una compra, y nada
         * que sirva para cobrar. */
        if (existeTabla('compras_pedidos')) {
            $contexto['compras']['pedidos'] = [];
            $contexto['compras']['gastado_total'] = 0.0;

            foreach (consultarTodo(
                'SELECT id, concepto, monto, estado, creado_en FROM compras_pedidos
                  ORDER BY id DESC LIMIT 10') as $p) {

                $contexto['compras']['pedidos'][] = [
                    'id'       => (int) $p['id'],
                    'concepto' => (string) $p['concepto'],
                    'monto'    => (float) $p['monto'],
                    'estado'   => (string) $p['estado'],
                    'fecha'    => (string) $p['creado_en'],
                ];
            }

            /* El total sí sale de TODAS las filas cobradas, no solo de
               las diez de arriba: un total a medias es peor que ninguno,
               porque parece completo. */
            $suma = consultarUno(
                "SELECT COALESCE(SUM(monto), 0) AS total FROM compras_pedidos
                  WHERE estado = 'cobrada'");
            $contexto['compras']['gastado_total'] = (float) ($suma['total'] ?? 0);
        }
    }

    return $contexto;
}

/**
 * POSTea el mensaje al Orquestador. Nunca espera su respuesta real
 * (eso llega después, por accion=responder) — solo confirma que el
 * webhook aceptó el POST. Timeout corto para no bloquear a Lucila
 * mientras escribe.
 *
 * @param array $payload
 * @return bool true si el POST salió (código 2xx), false si no.
 */
function mandarWebhookDeMegabot($payload) {
    $url = (string) (consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_webhook_url'")['valor'] ?? '');
    if ($url === '') return false;

    $claveSaliente = (string) (consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_webhook_clave'")['valor'] ?? '');

    $contexto = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n" .
                         "Authorization: Bearer " . $claveSaliente . "\r\n" .
                         "X-Automation-Key: " . $claveSaliente . "\r\n" .
                         "X-MegaBot-Clave: " . $claveSaliente . "\r\n",
            'content' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            /* ⚡ 3 s, no 10 (2026-09-03). Este timeout NO es lo que
               tarda MegaBot en pensar —eso llega después, por el
               callback— sino lo que tarda en ACEPTAR el POST. Un
               servicio sano acepta en menos de un segundo; diez
               segundos solo servían para que el panel se quedara
               esperando a uno caído.

               Y tiene que ser MENOR que el timeout del cliente
               (CONFIGURACION.servidor.segundosDeEspera): si el cliente
               abortara primero, la respuesta con el id del mensaje se
               perdería y la burbuja se quedaría sin reconciliar. */
            'timeout' => 3,
            'ignore_errors' => true,
        ],
    ]);

    $resultado = @file_get_contents($url, false, $contexto);
    if ($resultado === false) return false;

    // $http_response_header la llena file_get_contents() al usar un
    // wrapper http:// — se lee el primer renglón ("HTTP/1.1 200 OK").
    $codigo = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $codigo = (int) $m[1];
    }
    return $codigo >= 200 && $codigo < 300;
}

/**
 * El link completo del panel — para el `callback` del webhook.
 *
 * @return string
 */
function linkDeCallback() {
    $host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST'] ?? 'pbe.aniaxv.com');
    return 'https://' . $host . '/admin/api/chat.php';
}

/* ══════════════════════════════════════════════════════════════════════
   SABER DE ANTEMANO SI MEGABOT ESTÁ VIVO

   EL PROBLEMA
   `mandarWebhookDeMegabot()` bloquea hasta que el Orquestador acepta el
   POST. Con MegaBot caído eso es el timeout entero, y se pagaba en CADA
   mensaje antes de que el respaldo local pudiera contestar: el chat
   "tardaba muchísimo" incluso para preguntas que el teléfono sabe
   contestar solo.

   LA REGLA
   Quién contesta se decide por la DISPONIBILIDAD, no por la pregunta.
   MegaBot sigue siendo el primero siempre que esté vivo; cuando no lo
   está, el local entra al instante, sin que nadie espere. El cambio de
   motor ocurre cuando cambia la disponibilidad.

   CÓMO
   Se anota el resultado de cada intento. Tras un fallo se deja de
   intentar por un rato corto —lo suficiente para no pagar el timeout en
   cada mensaje, lo bastante poco para no quedarse en local si MegaBot
   ya volvió—, y pasado ese rato se deja pasar UN intento de prueba.
   ══════════════════════════════════════════════════════════════════════ */

/** Cuánto se espera antes de volver a probar un MegaBot que falló. */
const REPOSO_TRAS_FALLO_DE_MEGABOT = 90;   // segundos

/**
 * Si conviene intentar el webhook ahora mismo.
 *
 * @return bool false si falló hace poco y todavía no toca reintentar.
 */
function megabotEstaDisponible() {
    if (!existeTabla('ajustes')) return true;

    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_salud'");
    $salud = json_decode((string) ($fila['valor'] ?? ''), true);

    // Sin historial se intenta: no se puede declarar caído a alguien a
    // quien nunca se le habló.
    if (!is_array($salud) || !empty($salud['vivo'])) return true;

    $desde = (int) ($salud['cuando'] ?? 0);
    return (time() - $desde) >= REPOSO_TRAS_FALLO_DE_MEGABOT;
}

/**
 * Si una pregunta de ahora mismo llegaría a MegaBot, o la va a
 * contestar el teléfono.
 *
 * Junta los dos motivos por los que puede no llegar —no hay webhook
 * configurado, o falló hace poco y está en reposo— porque desde el
 * panel son el mismo hecho: contesta FAB. Ver `case 'enviar'`, que
 * decide con estas dos mismas condiciones.
 *
 * @return bool
 */
function megabotVaAContestar() {
    $url = (string) (consultarUno(
        "SELECT valor FROM ajustes WHERE clave = 'megabot_webhook_url'")['valor'] ?? '');
    if ($url === '') return false;

    return megabotEstaDisponible();
}

/**
 * Anota cómo salió el último intento de hablar con MegaBot.
 *
 * @param bool $vivo
 * @return void
 */
function anotarSaludDeMegabot($vivo) {
    if (!existeTabla('ajustes')) return;

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('megabot_salud', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => json_encode(['vivo' => (bool) $vivo, 'cuando' => time()])]
    );
}

/**
 * El snapshot de uso que mandó MegaBot la última vez (o null si nunca
 * mandó nada) — se guarda como ajuste, mismo patrón que cualquier otro
 * valor chico de `ajustes`.
 *
 * El contrato del campo está documentado UNA sola vez, junto a
 * guardarUsoDeMegabotSiVino(). Acá solo se lee y se le descuenta el
 * tiempo transcurrido.
 *
 * @return array|null
 */
/* Cuánto se queda abierta una petición de `listar&esperar=1` antes de
   contestar vacía. Corto a propósito: cada espera ocupa un worker de
   PHP, y esto es hosting compartido. El panel reconecta solo. */
const SEGUNDOS_DE_ESPERA_DE_LISTAR = 25;

/**
 * Los mensajes del hilo posteriores a un id, con sus propuestas.
 *
 * Se separó de `case 'listar'` porque el long-poll la llama una vez por
 * segundo: tenerla suelta evita repetir la consulta y sus propuestas en
 * dos lugares que después se desincronizan.
 *
 * @param int  $hiloId
 * @param int  $despuesDe
 * @param bool $conLatencia  Si se incluyen los tramos medidos. Solo para
 *                           la cuenta observadora — ver `case 'listar'`.
 * @return array
 */
/**
 * El estado de entrega del último mensaje que mandó ella en este hilo.
 *
 * ⚡ POR QUÉ HACE FALTA (2026-09-06)
 * Desde que `enviar` contesta ANTES de hablar con el webhook, la
 * respuesta ya no puede decir si MegaBot lo aceptó: eso se sabe un
 * instante después y se escribe en la fila. Si el webhook falla, esa
 * fila queda en `error` — y el panel no se enteraría nunca, porque el
 * poll solo trae mensajes NUEVOS y ese ya lo tiene pintado.
 *
 * Sin esto, un webhook fallido dejaba a Lucila esperando una respuesta
 * que no venía, en vez de que contestaran los agentes del teléfono.
 *
 * @param int $hiloId
 * @return string  'enviado' | 'error' | 'pendiente' | ''
 */
function entregaDelUltimoMensajeSuyo($hiloId) {
    $fila = consultarUno(
        "SELECT estado FROM chat_mensajes
          WHERE hilo_id = :h AND rol = 'lucila' ORDER BY id DESC LIMIT 1",
        [':h' => $hiloId]
    );
    return (string) ($fila['estado'] ?? '');
}

function mensajesDelHiloDesde($hiloId, $despuesDe, $conLatencia = false) {
    $mensajes = consultarTodo(
        'SELECT * FROM chat_mensajes WHERE hilo_id = :h AND id > :d ORDER BY id ASC',
        [':h' => $hiloId, ':d' => $despuesDe]
    );

    // Las propuestas de cada mensaje, en el mismo viaje.
    foreach ($mensajes as &$m) {
        $m['propuestas'] = consultarTodo(
            'SELECT * FROM chat_propuestas WHERE mensaje_id = :m ORDER BY id ASC',
            [':m' => $m['id']]
        );

        /* ⚠️ La consulta de arriba es SELECT *, así que `latencia_json`
           viaja sin que nadie lo pida. Se saca SIEMPRE y recién después
           se agregan los tramos, y solo a quien corresponde: si esto se
           hiciera al revés, una columna nueva en la tabla se filtraría
           sola a la pantalla de Lucila el día que alguien la agregue. */
        $crudo = $m['latencia_json'] ?? null;
        unset($m['latencia_json']);

        if (!$conLatencia) continue;

        $marcas = json_decode((string) $crudo, true);
        if (!is_array($marcas) || !$marcas) continue;

        $m['latencia'] = ['marcas' => $marcas, 'tramos' => deltasDeLatencia($marcas)];
    }
    unset($m);

    return $mensajes;
}

function usoDeMegabotGuardado() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_uso'");
    $valor = (string) ($fila['valor'] ?? '');
    if ($valor === '') return null;

    $uso = json_decode($valor, true);
    if (!is_array($uso)) return null;

    /* ⚡ EL RELOJ ESTABA CONGELADO (2026-09-03).
     * `reinicia_en` son los segundos que faltaban EN EL MOMENTO en que
     * MegaBot lo mandó, y se devolvía tal cual para siempre: si dijo
     * "reinicia en una hora" y pasaron cincuenta minutos, el panel
     * seguía diciendo una hora. Un contador que no baja no es un
     * contador, es un cartel.
     *
     * Ahora se guarda CUÁNDO se anotó y acá se descuenta lo que pasó
     * desde entonces. Llegado a cero, la cuota ya se reinició: el uso
     * vuelve a cero y deja de estar agotado, que es lo que significa
     * que el reloj llegue al final. */
    $guardadoEn = (int) ($uso['guardado_en'] ?? 0);
    /* ⚡ "SIN RELOJ" NO ES "RELOJ EN CERO" (2026-09-04)
     * Cuando MegaBot no manda `reinicia_en` se guardaba 0, y 0 es
     * justamente lo que significa "la cuota ya se reinició". Como el
     * descuento de abajo exige `$faltaban > 0`, ese uso no envejecía
     * NUNCA: un "80 % usado" sin reloj se quedaba en el encabezado para
     * siempre. Ahora ausente es null y se trata como lo que es: no se
     * sabe cuándo vuelve. */
    $faltaban = isset($uso['reinicia_en']) && $uso['reinicia_en'] !== null
        ? (int) $uso['reinicia_en'] : null;

    if ($guardadoEn > 0 && $faltaban !== null && $faltaban > 0) {
        $transcurrido = max(0, time() - $guardadoEn);
        $uso['reinicia_en'] = max(0, $faltaban - $transcurrido);

        if ($uso['reinicia_en'] === 0) {
            $uso['porcentaje'] = 0;
            $uso['agotado']    = false;
        }
    }

    /* ⚡ LA EDAD DEL DATO VIAJA; EL TIMESTAMP NO (2026-09-04)
     * `guardado_en` se borraba y estaba bien —es de adentro— pero con él
     * se iba la única forma que tenía el panel de saber si el número era
     * de hace un minuto o de hace tres días. Los pintaba iguales. Sobre
     * una cuota SEMANAL eso es afirmar algo que ya no se sabe. La edad
     * en segundos alcanza y no cuenta nada de adentro. */
    $uso['hace_segundos'] = $guardadoEn > 0 ? max(0, time() - $guardadoEn) : null;

    unset($uso['guardado_en']);   // detalle interno, no viaja al panel
    return $uso;
}

/* ══════════════════════════════════════════════════════════════════
   EL CONTRATO DE `uso` — LA ÚNICA DEFINICIÓN, NO REPETIR EN OTRO LADO

   Quien asiste a Lucila cuando hay internet es GrokBot, con el
   Orquestador/MegaBot como su representante. Ese servicio tiene una
   cuota SEMANAL, y el encabezado del chat se lo cuenta a Lucila en
   chico: cuánto se lleva usado y cuándo se reinicia.

   MegaBot lo manda —opcionalmente— dentro del cuerpo de
   `accion=responder`:

       "uso": {
         "porcentaje":  65,      entero 0-100, lo CONSUMIDO
         "reinicia_en": 4620,    segundos que faltan para el reinicio
         "agotado":     false    true si ya no queda cuota
       }

   TRES REGLAS QUE NO HAY QUE ROMPER

   1. EL CAMPO SE LLAMA `reinicia_en`. Sin excepciones y sin variantes.

   2. `reinicia_en` NO HACE FALTA MANDARLO SEGUIDO. Acá se guarda junto
      con `guardado_en`, y usoDeMegabotGuardado() descuenta lo
      transcurrido en cada lectura. Con que venga de vez en cuando, el
      reloj baja solo.

   3. SIN DATO NO SE INVENTA NADA. Si el campo no viene, o viene sin
      `porcentaje` y sin `agotado`, no se guarda: el encabezado del
      panel se queda vacío. Un número inventado sobre la cuota de un
      servicio ajeno sería peor que no decir nada.

      Vale también para `reinicia_en`: si no se sabe cuándo vuelve, se
      OMITE. Mandar 0 no dice "no sé", dice "ya se reinició" — que es
      justo lo contrario, y dejaba el número clavado para siempre.

   LO QUE SALE HACIA EL PANEL lleva además `hace_segundos`: cuán viejo
   es el dato. El panel lo usa para no afirmar como actual un
   porcentaje de hace días (ver pintarUsoDeMegaBot). `guardado_en` no
   sale nunca: es de adentro.

   Del otro lado lo pinta pintarUsoDeMegaBot() en
   admin/codigo/32-asistente.js, que tiene su propio reloj de diez
   segundos para que el número se vea correr entre viaje y viaje.
   ══════════════════════════════════════════════════════════════════ */

/**
 * Valida y guarda el `uso` opcional que mandó MegaBot en `accion=
 * responder`. Nunca corta la petición si viene mal formado — el texto
 * de la respuesta es lo importante, el uso es un extra.
 *
 * Ver el contrato completo justo arriba.
 *
 * @param mixed $usoCrudo
 * @return void
 */
function guardarUsoDeMegabotSiVino($usoCrudo) {
    if (!is_array($usoCrudo)) return;

    $porcentaje = isset($usoCrudo['porcentaje']) ? (int) $usoCrudo['porcentaje'] : null;
    if ($porcentaje !== null) $porcentaje = max(0, min(100, $porcentaje));

    /* null, no 0, cuando no vino: son cosas distintas y guardarlas igual
       dejaba el dato congelado para siempre. Ver usoDeMegabotGuardado(). */
    $reiniciaEn = isset($usoCrudo['reinicia_en']) && $usoCrudo['reinicia_en'] !== null
        ? max(0, (int) $usoCrudo['reinicia_en'])
        : null;
    $agotado = !empty($usoCrudo['agotado']);

    // Sin porcentaje no hay nada honesto que mostrar (ver tabla del
    // encabezado) — no se guarda un uso vacío.
    if ($porcentaje === null && !$agotado) return;

    /* `guardado_en` es lo que permite que el reloj baje: sin él,
       `reinicia_en` quedaba clavado en el valor del momento en que
       MegaBot lo mandó. Ver usoDeMegabotGuardado(). */
    $uso = [
        'porcentaje'  => $porcentaje,
        'reinicia_en' => $reiniciaEn,
        'agotado'     => $agotado,
        'guardado_en' => time(),
    ];
    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('megabot_uso', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => json_encode($uso, JSON_UNESCAPED_UNICODE)]
    );
}


/* ══════════════════════════════════════════════════════════════════
   EL CONTRATO DE `latencia` — LA ÚNICA DEFINICIÓN, NO REPETIR

   POR QUÉ EXISTE (2026-09-06)
   Una respuesta de MegaBot tarda decenas de segundos, y hasta ahora los
   únicos números de dónde se iban venían de él: 55 s en una medición,
   149,8 s en la siguiente, con el primer salto pasando de 8 s a 59 s.
   Sin marcas propias, cada conversación sobre latencia empezaba
   discutiendo el cronómetro en vez del problema.

   LAS MARCAS (milisegundos epoch, enteros)

     t_enviar             acá      al entrar a `accion=enviar`
     t_webhook            acá      justo después de POSTear el webhook
     t_webhook_recibido   MegaBot  cuando su receptor parsea el POST
     t_orq_despierta      MegaBot  cuando despierta el cerebro
     t_responder          acá      al entrar a `accion=responder`

   Las dos de MegaBot llegan —opcionalmente— dentro del cuerpo de
   `accion=responder`, en `"latencia": { … }`. Falta una sexta,
   `t_pintado`, que solo existe en el navegador: el panel la calcula y
   la muestra, pero no se guarda acá (ver más abajo por qué).

   ⚠️ DOS RELOJES DISTINTOS, Y ESO NO SE PUEDE DISIMULAR

   El servidor, la máquina de MegaBot y el teléfono de quien mira NO
   están sincronizados. Restar una marca de un reloj menos una de otro
   da un número con pinta de medición y contenido de basura — que es
   peor que no medir, porque se defiende con autoridad.

   Por eso:
     · Solo se restan marcas del MISMO reloj. `t_enviar`, `t_webhook` y
       `t_responder` son todas nuestras: esos deltas son de fiar.
     · Las de MegaBot valen para su tramo interno
       (t_orq_despierta - t_webhook_recibido) y NO se cruzan con las
       nuestras.
     · `t_pintado` se queda en el navegador y se resta contra otra marca
       del navegador. Por eso no viaja hasta acá.

   SIN DATO NO SE INVENTA NADA — igual que con `uso`. Una marca que no
   vino, no está. Nunca se rellena con "ahora" ni se estima.

   ESTO NO SALE HACIA LUCILA. Va solo a la cuenta observadora
   (esObservador(), _lib/sesion.php): es dato de taller, y está dicho
   que nada técnico queda a su vista.
   ══════════════════════════════════════════════════════════════════ */

/** Las marcas que se aceptan, y nadie más. Cualquier otra clave que
    venga en el cuerpo se descarta: esto lo llena un servicio externo. */
const MARCAS_DE_LATENCIA = [
    't_enviar', 't_webhook', 't_webhook_recibido', 't_orq_despierta', 't_responder',
];

/** El reloj de este servidor, en milisegundos epoch. */
function ahoraEnMs() {
    return (int) round(microtime(true) * 1000);
}

/**
 * Si la columna existe en ESTA base — se pregunta una sola vez por
 * petición y se recuerda.
 *
 * ⚡ La memoria no es un lujo: columnasDe() consulta information_schema
 * cada vez que se la llama, y el long-poll de `listar` recorre los
 * mensajes UNA VEZ POR SEGUNDO durante 25 s. Sin esto, una espera
 * tranquila haría veinticinco consultas de esquema para no enterarse de
 * nada nuevo.
 *
 * @return bool
 */
function hayColumnaDeLatencia() {
    static $tiene = null;
    if ($tiene === null) {
        $tiene = in_array('latencia_json', columnasDe('chat_mensajes'), true);
    }
    return $tiene;
}

/**
 * Las marcas guardadas de un mensaje (vacío si no hay ninguna, o si a
 * esta base todavía no se le corrió instalar.php).
 *
 * @param int $mensajeId
 * @return array
 */
function marcasDeLatencia($mensajeId) {
    if (!hayColumnaDeLatencia()) return [];

    $fila = consultarUno('SELECT latencia_json FROM chat_mensajes WHERE id = :m',
                         [':m' => $mensajeId]);
    if (!$fila) return [];

    $marcas = json_decode((string) ($fila['latencia_json'] ?? ''), true);
    return is_array($marcas) ? $marcas : [];
}

/**
 * Suma marcas a las que ya tenga el mensaje. No pisa una marca que ya
 * existía: la primera vez que algo pasó es la que vale, y un reintento
 * que la sobreescribiera borraría justo la demora que se quiere medir.
 *
 * Nunca tira error: si la columna no existe todavía —base a la que no
 * se le volvió a correr instalar.php— no se guarda nada y el chat sigue
 * igual. Medir es un extra; el mensaje es lo importante.
 *
 * @param int   $mensajeId
 * @param array $nuevas     clave => ms epoch
 * @return void
 */
function anotarMarcasDeLatencia($mensajeId, $nuevas) {
    if ($mensajeId <= 0 || !$nuevas) return;
    if (!hayColumnaDeLatencia()) return;

    $marcas = marcasDeLatencia($mensajeId);

    foreach ($nuevas as $clave => $valor) {
        if (!in_array($clave, MARCAS_DE_LATENCIA, true)) continue;
        if (isset($marcas[$clave])) continue;              // la primera manda
        if (!is_numeric($valor)) continue;

        $ms = (int) $valor;
        if ($ms <= 0) continue;
        $marcas[$clave] = $ms;
    }

    if (!$marcas) return;

    try {
        ejecutar('UPDATE chat_mensajes SET latencia_json = :j WHERE id = :m',
                 [':j' => json_encode($marcas, JSON_UNESCAPED_UNICODE), ':m' => $mensajeId]);
    } catch (Throwable $e) {
        error_log('[Ania XV · chat] No se pudieron guardar las marcas: ' . $e->getMessage());
    }
}

/**
 * Convierte las marcas en los tramos que se pueden afirmar. Cada delta
 * solo aparece si sus DOS marcas existen y son del mismo reloj — ver la
 * advertencia del contrato de arriba.
 *
 * @param array $marcas
 * @return array  nombre del tramo => milisegundos
 */
function deltasDeLatencia($marcas) {
    $deltas = [];

    $tramo = function ($nombre, $desde, $hasta) use ($marcas, &$deltas) {
        if (!isset($marcas[$desde], $marcas[$hasta])) return;
        $ms = (int) $marcas[$hasta] - (int) $marcas[$desde];
        // Un tramo negativo significa relojes cruzados o marcas de
        // vueltas distintas: no se muestra un número imposible.
        if ($ms < 0) return;
        $deltas[$nombre] = $ms;
    };

    // Nuestro reloj, de punta a punta de lo que este servidor controla.
    $tramo('enviar_a_webhook', 't_enviar', 't_webhook');
    $tramo('webhook_a_responder', 't_webhook', 't_responder');
    $tramo('total_servidor', 't_enviar', 't_responder');

    // El reloj de MegaBot, solo contra sí mismo.
    $tramo('megabot_interno', 't_webhook_recibido', 't_orq_despierta');

    return $deltas;
}


/**
 * Lee la cuota del encabezado `X-MegaBot-Uso` y la guarda.
 *
 * ⚡ POR QUÉ EN UN ENCABEZADO Y NO EN EL CUERPO (2026-09-06)
 *
 * El campo `uso` viaja dentro de `accion=responder` desde el principio
 * y en semanas no llegó ni una vez. No es mala voluntad: ese camino
 * obliga a que haya una conversación abierta Y a acordarse de
 * adjuntarlo mientras se redacta la respuesta. Si nadie escribió al
 * chat no hay por dónde mandarlo aunque la cuota haya cambiado; y si
 * escribió, compite con el trabajo de contestar.
 *
 * Un encabezado no compite con nada. Se pone UNA vez en el cliente HTTP
 * y viaja solo en todas las peticiones que ya se hacen —`responder`,
 * `contexto`, la que sea— sin tocar el JSON ni la lógica de redacción.
 * Es el camino de menos fricción que hay, y por eso es el que tiene
 * chance de usarse.
 *
 * SE ACEPTAN TRES FORMAS, porque discutir el formato costaría más que
 * soportarlas:
 *     X-MegaBot-Uso: 14
 *     X-MegaBot-Uso: 14; reinicia=187200
 *     X-MegaBot-Uso: {"porcentaje":14,"reinicia_en":187200}
 *
 * El CONTENIDO se valida con el contrato de siempre
 * (guardarUsoDeMegabotSiVino): esto solo cambia por dónde entra, no
 * qué se acepta. Sin porcentaje sigue sin guardarse nada.
 *
 * @return void
 */
function guardarUsoDelEncabezado() {
    $crudo = trim(encabezadoDeLaPeticion('X-MegaBot-Uso'));
    if ($crudo === '') return;

    // Forma 3: JSON tal cual.
    if ($crudo[0] === '{') {
        $json = json_decode($crudo, true);
        if (is_array($json)) guardarUsoDeMegabotSiVino($json);
        return;
    }

    // Formas 1 y 2: el porcentaje primero, y lo demás como `clave=valor`
    // separado por ';' o ','.
    $partes = preg_split('/[;,]/', $crudo);
    $uso = [];

    $primero = trim((string) array_shift($partes));
    if (!preg_match('/^(\d{1,3})\s*%?$/', $primero, $m)) return;
    $uso['porcentaje'] = (int) $m[1];

    foreach ($partes as $parte) {
        if (strpos($parte, '=') === false) continue;
        list($clave, $valor) = explode('=', $parte, 2);
        $clave = strtolower(trim($clave));
        $valor = trim($valor);

        // `reinicia` y `reinicia_en` son la misma cosa: no se pierde un
        // reporte por una palabra de más.
        if ($clave === 'reinicia' || $clave === 'reinicia_en') {
            if (is_numeric($valor)) $uso['reinicia_en'] = (int) $valor;
        } elseif ($clave === 'agotado') {
            $uso['agotado'] = ($valor === '1' || strtolower($valor) === 'true');
        }
    }

    guardarUsoDeMegabotSiVino($uso);
}


switch ($accion) {

/* ═══════════════════ CON SESIÓN DE LUCILA/CARLOS ═══════════════════ */

case 'listar':
    exigirMetodo('GET');
    /* La sesión se valida UNA vez, acá. Abajo puede haber una espera de
       hasta 25 s, y revalidar en cada vuelta del bucle gastaría el
       techo de peticiones de la API con la misma persona esperando su
       propia respuesta. */
    $yo = exigirSesion();
    $hiloId = hiloDe((int) $yo['id']);
    $despuesDe = campoEntero($_GET, 'despues_de', 0);

    /* Los tiempos de cada salto son dato de taller: van a la cuenta
       observadora y a nadie más. No se usa el rol 'admin' porque Lucila
       TAMBIÉN es admin, y está dicho que nada técnico queda a su vista.
       esObservador() compara contra un correo del .env — mismo criterio
       que el panel de métricas (_lib/sesion.php). */
    $veLosTiempos = esObservador($yo);

    $mensajes = mensajesDelHiloDesde($hiloId, $despuesDe, $veLosTiempos);

    /* ⚡ LONG-POLLING: CONTESTAR APENAS HAY ALGO (2026-09-04)
     *
     * EL PROBLEMA
     * El panel preguntaba cada 2 s el primer minuto y cada 15 s después.
     * Una respuesta que llega al segundo 66 —la que MegaBot midió con
     * cronómetro— se pintaba hasta 15 s más tarde. Puro retraso
     * agregado a una espera que ya era larga.
     *
     * CÓMO
     * Con `esperar=1` y nada nuevo que devolver, la petición se queda
     * abierta mirando la tabla una vez por segundo, y contesta EN CUANTO
     * aparece una fila. Entrega en ≤1 s, y de paso gasta menos cuota:
     * ~8 peticiones en tres minutos de espera contra ~38 de antes.
     *
     * POR QUÉ ACÁ SE PUEDE
     * El panel no usa session_start() — la sesión va por token en la
     * base (_lib/sesion.php). Con sesiones de archivo, una petición
     * abierta bloquearía el archivo de sesión y dejaría clavado todo lo
     * demás que hiciera esta misma persona mientras espera.
     *
     * EL TOPE ES LA GARANTÍA, NO EL ABORTO
     * connection_aborted() solo se entera de que el otro lado se fue
     * cuando el script INTENTA escribir, y acá no se puede escribir
     * nada antes del JSON final sin romperlo. Así que lo que asegura
     * que ningún worker quede girando es el tope de segundos, no la
     * detección de la desconexión. Por eso es corto. */
    if (!$mensajes && !empty($_GET['esperar'])) {
        @set_time_limit(SEGUNDOS_DE_ESPERA_DE_LISTAR + 15);

        /* La espera también termina si el envío se cayó: sin esto, un
           webhook fallido dejaba la petición abierta 25 s enteros antes
           de que el panel pudiera enterarse y pasarle la pregunta a los
           agentes del teléfono. Se mira contra el estado del arranque
           para reaccionar al CAMBIO y no a un error viejo del hilo. */
        $entregaAlEmpezar = entregaDelUltimoMensajeSuyo($hiloId);

        $hasta = time() + SEGUNDOS_DE_ESPERA_DE_LISTAR;
        while (time() < $hasta) {
            sleep(1);
            $mensajes = mensajesDelHiloDesde($hiloId, $despuesDe, $veLosTiempos);
            if ($mensajes) break;
            if (entregaDelUltimoMensajeSuyo($hiloId) !== $entregaAlEmpezar) break;
        }
    }

    responderBien([
        'hilo_id'  => $hiloId,
        'mensajes' => $mensajes,
        'uso'      => usoDeMegabotGuardado(),
        /* ⚡ SI ESTAMOS EN PRUEBAS, PARA PODER VER QUE NO HAY DATO
         *   (2026-09-06)
         *
         * El contador de uso se esconde entero cuando MegaBot no manda
         * el campo —correcto: inventar un porcentaje sobre la cuota de
         * un servicio ajeno sería peor que callar—. Pero esconderlo
         * hace que "no lo manda" y "todo bien" se vean IGUAL: un hueco.
         * Así se pasaron días creyendo que el contador estaba roto
         * cuando lo que faltaba era el dato del otro lado.
         *
         * En PBE el panel dice cuál de las dos cosas pasa. En
         * producción no: ahí Lucila no tiene por qué leer el estado de
         * una integración, y está dicho que nada técnico queda a su
         * vista.
         *
         * Mismo criterio de detección que compras.php: lo decide el
         * SERVIDOR mirando su dominio, no el navegador. */
        'pruebas'  => strpos((string) ($_SERVER['HTTP_HOST'] ?? ''), 'pbe.') !== false,
        /* Cómo terminó la entrega de lo último que ella mandó. El panel
           lo necesita porque `enviar` ya no lo puede saber a tiempo —ver
           entregaDelUltimoMensajeSuyo(). */
        'entrega'  => entregaDelUltimoMensajeSuyo($hiloId),
        /* Si MegaBot va a contestar esta vez, o si va a contestar el
           teléfono. El panel lo dice arriba del hilo: conviene saberlo
           ANTES de preguntar, y no al leer una respuesta que parecía
           suya. Son DOS motivos para que no conteste —sin webhook
           configurado, o en reposo tras fallar— y los dos terminan
           igual, así que se responden juntos. */
        'megabot_vivo' => megabotVaAContestar(),
    ]);
    break;


case 'enviar':
    exigirMetodo('POST');
    /* La primera marca, antes de cualquier otra cosa: es el cero contra
       el que se miden todos los tramos. Ver el contrato de `latencia`. */
    $tEnviar = ahoraEnMs();

    $yo = exigirSesion();
    $datos = cuerpoJson();

    $texto = campoTexto($datos, 'texto', 2000);
    if ($texto === '') responderMal('Escribe algo primero.', 400);
    $pantalla = campoTexto($datos, 'pantalla', 60);

    $hiloId = hiloDe((int) $yo['id']);
    $mensajeId = insertar('chat_mensajes', [
        'hilo_id' => $hiloId, 'rol' => 'lucila', 'texto' => $texto, 'estado' => 'enviado',
    ]);

    anotarEnBitacora($yo, 'chat_enviar', 'chat_mensajes', $mensajeId, mb_substr($texto, 0, 200));
    anotarMarcasDeLatencia($mensajeId, ['t_enviar' => $tEnviar]);

    $url = (string) (consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_webhook_url'")['valor'] ?? '');
    $offline = true;

    /* ⚡ EL PANEL TIENE QUE PODER DECIR EN QUÉ PUNTO SE QUEDÓ (2026-09-04)
     *
     * Los tres finales de este bloque se veían iguales desde el chat, y
     * la espera contestaba siempre lo mismo: "revisa la conexión". Pero
     * son tres cosas distintas —el webhook aceptó y MegaBot está
     * pensando, el webhook no aceptó, o ni se intentó porque venía
     * fallando— y solo una de las tres tiene algo que ver con la red.
     * Es el mismo error de diagnóstico que se corrigió en confirmar.php
     * el 4 de septiembre: un mensaje que no distingue causas desorienta
     * más que el silencio. */
    $estadoDeEntrega = 'pendiente';

    if ($url === '') {
        // Sin webhook configurado: se guarda igual, sin burbuja de
        // sistema — el JS (32-asistente.js) resuelve local con los
        // agentes 40-44/46 y el matcher viejo. Nunca se cae a eso desde
        // acá: es la UI la que decide qué mostrar con offline=true.
        actualizar('chat_mensajes', $mensajeId, ['estado' => 'pendiente']);
    } elseif (!megabotEstaDisponible()) {
        /* ⚡ NO SE ESPERA A UN SERVICIO QUE YA SE SABE CAÍDO (2026-09-03)
         *
         * Antes se intentaba el webhook SIEMPRE, y cada intento contra
         * un MegaBot caído costaba el timeout completo —diez segundos—
         * ANTES de que el respaldo local pudiera contestar. Se pagaba
         * en cada mensaje, uno por uno, y desde afuera se veía como que
         * "el asistente tarda muchísimo".
         *
         * Ahora el resultado del último intento se recuerda: si falló
         * hace poco, se contesta al instante con `offline` y el panel
         * resuelve en el teléfono, sin que nadie espere nada. Cada
         * tanto se deja pasar un intento para notar que volvió — ver
         * megabotEstaDisponible(). */
        actualizar('chat_mensajes', $mensajeId, ['estado' => 'pendiente']);
    } else {
        /* ⚡ EL WEBHOOK SALE CON LA CONEXIÓN YA CERRADA (2026-09-06)
         *
         * EL PROBLEMA
         * Hablar con MegaBot cuesta hasta 3 s (el timeout de
         * mandarWebhookDeMegabot). Esos 3 s no le aportan NADA a quien
         * escribió: su mensaje ya está guardado, y la respuesta de
         * MegaBot llega después por otro camino (accion=responder). Lo
         * único que hacían era tener un worker de PHP ocupado en un
         * hosting compartido y retrasar la reconciliación de la burbuja.
         *
         * QUÉ CAMBIA PARA EL PANEL
         * Antes recibía `estado: 'enviado'|'error'` ya resuelto. Ahora,
         * en este camino, recibe `'enviando'`: todavía no se sabe. El
         * resultado real se escribe en la fila un instante después y el
         * long-poll lo trae en ≤1 s — que es cuando el panel decide si
         * cae al modo local. Se pierde a lo sumo un segundo en el caso
         * malo y se ganan tres en el bueno.
         *
         * ⚠️ EL CAMINO DE MEGABOT CAÍDO NO PASA POR ACÁ, Y ES A
         * PROPÓSITO: ese ya contesta `offline: true` al instante en el
         * elseif de arriba, sin tocar la red. Es el caso que más importa
         * —el que hace que el teléfono conteste solo— y sigue igual de
         * inmediato que antes. */
        $mandarElWebhook = function () use ($pantalla, $yo, $hiloId, $mensajeId, $texto) {
            $contexto = construirContexto($pantalla, $yo);
            $enviado = mandarWebhookDeMegabot([
                'v' => 1,
                'hilo_id' => $hiloId,
                'mensaje_id' => $mensajeId,
                'texto' => $texto,
                'pantalla' => $pantalla,
                'usuario' => ['id' => (int) $yo['id'], 'nombre' => $yo['nombre'], 'rol' => $yo['rol']],
                'contexto' => $contexto,
                'callback' => linkDeCallback(),
            ]);

            anotarMarcasDeLatencia($mensajeId, ['t_webhook' => ahoraEnMs()]);
            anotarSaludDeMegabot($enviado);
            actualizar('chat_mensajes', $mensajeId, ['estado' => $enviado ? 'enviado' : 'error']);

            return $enviado;
        };

        if (sePuedeCerrarLaConexion()) {
            responderYSeguirTrabajando([
                'id' => $mensajeId,
                'hilo_id' => $hiloId,
                // Todavía no se sabe: se sabrá en un segundo, por el poll.
                'offline' => false,
                'estado' => 'enviando',
            ]);

            $mandarElWebhook();
            exit;
        }

        /* Este PHP no sabe cerrar la conexión antes de tiempo. Entonces
           se hace el trabajo primero y se contesta al final, igual que
           siempre: escribir la respuesta acá no serviría de nada porque
           el navegador no la vería hasta que el script termine. */
        $enviado = $mandarElWebhook();
        $offline = !$enviado;
        $estadoDeEntrega = $enviado ? 'enviado' : 'error';
    }

    responderBien([
        'id' => $mensajeId,
        'hilo_id' => $hiloId,
        'offline' => $offline,
        // Cuál de los finales fue. El panel lo muestra en la burbuja de
        // espera (anotarEntregaDeMegaBot).
        'estado' => $estadoDeEntrega,
    ]);
    break;


case 'propuesta_estado':
    exigirMetodo('POST');
    $yo = exigirSesion();
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    /* 'fallida' (2026-09-03): la propuesta se intentó y el panel no
       pudo hacerla — típicamente una acción que MegaBot pidió y que no
       está en la whitelist. La columna tenía ese estado desde el primer
       día y nadie lo escribía nunca, así que esos casos quedaban como
       'abierta' para siempre, indistinguibles de los que nadie miró. */
    $estado = campoOpcion($datos, 'estado', ['aceptada', 'rechazada', 'fallida'], '');
    if ($id <= 0 || $estado === '') responderMal('Falta decir qué propuesta y qué pasó.', 400);

    /* ⚡ LA PROPUESTA TIENE QUE SER DEL HILO DE QUIEN LA RESPONDE
       (2026-09-03). Acá se actualizaba por id y nada más: bastaba
       adivinar un número para marcar como "ejecutada" o "rechazada" una
       propuesta del hilo de otra persona. No re-ejecuta nada —eso está
       prohibido en este archivo— pero sí ensucia el historial de
       alguien más y le hace desaparecer los botones de una decisión que
       nunca tomó. Los hilos son por cuenta: se comprueba contra el
       propio. */
    $propuesta = consultarUno(
        'SELECT p.id
         FROM chat_propuestas p
         JOIN chat_mensajes m ON m.id = p.mensaje_id
         WHERE p.id = :p AND m.hilo_id = :h',
        [':p' => $id, ':h' => hiloDe((int) $yo['id'])]
    );
    if (!$propuesta) responderMal('Esa propuesta no es de tu conversación.', 404);

    // Solo se marca — la UI ya corrió mandar() antes de llamar acá.
    // Nunca se re-ejecuta la acción desde PHP: sería un segundo camino
    // para escribir, justo lo que este archivo tiene prohibido.
    $comoSeGuarda = [
        'aceptada'  => 'ejecutada',
        'rechazada' => 'rechazada',
        'fallida'   => 'fallida',
    ];
    actualizar('chat_propuestas', $id, ['estado' => $comoSeGuarda[$estado]]);
    responderBien(['mensaje' => 'Anotado.']);
    break;


case 'reenviar':
    exigirMetodo('POST');
    $yo = exigirSesion();
    $datos = cuerpoJson();

    $mensajeId = campoEntero($datos, 'mensaje_id', 0);
    if ($mensajeId <= 0) responderMal('Falta decir qué mensaje.', 400);

    $mensaje = consultarUno('SELECT * FROM chat_mensajes WHERE id = :i', [':i' => $mensajeId]);
    if (!$mensaje || $mensaje['rol'] !== 'lucila') responderMal('Ese mensaje no existe.', 404);
    if (!in_array($mensaje['estado'], ['error', 'pendiente'], true)) {
        responderMal('Ese mensaje ya se mandó bien.', 400);
    }

    $hilo = consultarUno('SELECT usuario_id FROM chat_hilos WHERE id = :h', [':h' => $mensaje['hilo_id']]);
    if (!$hilo || (int) $hilo['usuario_id'] !== (int) $yo['id']) responderMal('Ese hilo no es tuyo.', 403);

    $contexto = construirContexto('', $yo);
    $enviado = mandarWebhookDeMegabot([
        'v' => 1,
        'hilo_id' => (int) $mensaje['hilo_id'],
        'mensaje_id' => $mensajeId,
        'texto' => $mensaje['texto'],
        'pantalla' => '',
        'usuario' => ['id' => (int) $yo['id'], 'nombre' => $yo['nombre'], 'rol' => $yo['rol']],
        'contexto' => $contexto,
        'callback' => linkDeCallback(),
    ]);

    actualizar('chat_mensajes', $mensajeId, ['estado' => $enviado ? 'enviado' : 'error']);
    responderBien(['reenviado' => $enviado, 'offline' => !$enviado]);
    break;


case 'rotar_clave':
    exigirMetodo('POST');
    $yo = exigirAdministrador();

    $nueva = bin2hex(random_bytes(32));
    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('megabot_servicio_clave', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => $nueva]
    );
    // Nunca el valor de la clave en la bitácora — solo que se rotó.
    anotarEnBitacora($yo, 'chat_rotar_clave', 'ajustes', 0, 'megabot_servicio_clave rotada');

    responderBien(['clave' => $nueva]);
    break;


/* ═══════════════ SIN SESIÓN — SOLO X-MEGABOT-CLAVE ═══════════════════ */

case 'responder':
    exigirMetodo('POST');
    // Antes de parsear nada: es el final del cronómetro de ida y vuelta.
    $tResponder = ahoraEnMs();

    exigirClaveDeServicio();
    $datos = cuerpoJson();

    /* Que MegaBot conteste es la mejor prueba de que está vivo — mejor
       que el POST de ida, porque significa que además pudo pensar. Si
       venía marcado como caído, esto lo revive sin esperar a que se
       cumpla el reposo. */
    anotarSaludDeMegabot(true);

    $hiloId = campoEntero($datos, 'hilo_id', 0);
    if ($hiloId <= 0) responderMal('Falta decir de qué hilo.', 400);
    if (!consultarUno('SELECT id FROM chat_hilos WHERE id = :h', [':h' => $hiloId])) {
        responderMal('Ese hilo no existe.', 404);
    }

    $texto = campoTexto($datos, 'texto', 4000);
    $propuestasCrudas = is_array($datos['propuestas'] ?? null) ? $datos['propuestas'] : [];
    guardarUsoDeMegabotSiVino($datos['uso'] ?? null);

    /* ⚡ `en_respuesta_a` ESTABA PROMETIDO Y SE TIRABA (2026-09-04)
     *
     * La cabecera de este archivo documenta el campo desde el primer
     * día, pero no existía la columna, nadie lo leía y el panel no lo
     * conocía: si el Orquestador lo mandaba, se descartaba sin dejar
     * rastro.
     *
     * Mientras las respuestas llegaban en orden no se notaba. Con la
     * cola atrasada sí: llegó una contestando algo pedido hacía tanto
     * que ya se había olvidado qué era, y el panel la pintó al final del
     * hilo debajo de cuatro mensajes distintos. Con esto, el panel puede
     * encabezarla con la pregunta que contesta.
     *
     * Se comprueba que el mensaje citado sea DE ESTE HILO — mismo
     * criterio que `propuesta_estado`: sin eso, bastaría un número para
     * hacer que una respuesta cite la conversación de otra persona. */
    $enRespuestaA = campoEntero($datos, 'en_respuesta_a', 0);
    if ($enRespuestaA > 0) {
        $citado = consultarUno(
            'SELECT id FROM chat_mensajes WHERE id = :m AND hilo_id = :h',
            [':m' => $enRespuestaA, ':h' => $hiloId]
        );
        // No es de este hilo (o no existe): se ignora en silencio. El
        // texto de la respuesta importa más que la cita.
        if (!$citado) $enRespuestaA = 0;
    }

    // Cada propuesta se valida contra la whitelist ACÁ, en el servidor —
    // nunca confiar en que el Orquestador solo mande lo permitido. La
    // que no pasa se descarta en silencio; el texto igual llega.
    $propuestasValidas = [];
    foreach ($propuestasCrudas as $p) {
        $accionProp = (string) ($p['accion'] ?? '');
        if (!in_array($accionProp, ACCIONES_PERMITIDAS_PARA_MEGABOT, true)) continue;
        $propuestasValidas[] = [
            'titulo'  => mb_substr((string) ($p['titulo'] ?? ''), 0, 200),
            'detalle' => mb_substr((string) ($p['detalle'] ?? ''), 0, 500),
            'accion'  => $accionProp,
            'cuerpo'  => is_array($p['cuerpo'] ?? null) ? $p['cuerpo'] : [],
        ];
    }

    $filaNueva = [
        'hilo_id' => $hiloId, 'rol' => 'megabot', 'texto' => $texto,
        'propuestas_json' => $propuestasCrudas ? json_encode($propuestasCrudas, JSON_UNESCAPED_UNICODE) : null,
        'estado' => 'enviado',
    ];
    if ($enRespuestaA > 0) $filaNueva['en_respuesta_a'] = $enRespuestaA;

    /* `en_respuesta_a` es de una ronda posterior a la que creó esta
       tabla, así que puede faltar en una base a la que todavía no se le
       volvió a correr instalar.php. Mismo criterio que contratos.php con
       `archivo_id`: se guarda lo que la tabla tenga hoy, en vez de tumbar
       la respuesta entera con "columna desconocida". */
    $mensajeId = insertar('chat_mensajes',
                          soloColumnasQueExisten('chat_mensajes', $filaNueva));

    foreach ($propuestasValidas as $p) {
        insertar('chat_propuestas', [
            'mensaje_id'  => $mensajeId,
            'titulo'      => $p['titulo'],
            'detalle'     => $p['detalle'],
            'accion'      => $p['accion'],
            'cuerpo_json' => json_encode($p['cuerpo'], JSON_UNESCAPED_UNICODE),
        ]);
    }

    anotarEnBitacora(['id' => 0, 'nombre' => 'MegaBot'], 'chat_responder', 'chat_mensajes',
                     $mensajeId, mb_substr($texto, 0, 200));

    /* ─── CERRAR EL CRONÓMETRO ────────────────────────────────────────
     *
     * Las marcas de ida (`t_enviar`, `t_webhook`) están en el mensaje de
     * LUCILA. Se copian a esta fila junto con las de vuelta para que el
     * viaje entero se lea en un solo lugar: el panel pinta esta burbuja,
     * y tener que ir a buscar la mitad del dato a otra fila era pedir
     * que alguien se equivocara al leerlo.
     *
     * A qué mensaje suyo pertenece: al que MegaBot citó con
     * `en_respuesta_a`, si lo citó. Si no —que es lo normal cuando la
     * respuesta viene pegada a la pregunta— al último que ella mandó en
     * este hilo. Con la cola atrasada esa suposición se puede
     * equivocar; para eso existe `en_respuesta_a`, y cuando viene, manda
     * él. */
    $suyo = $enRespuestaA > 0
        ? consultarUno('SELECT id FROM chat_mensajes WHERE id = :m', [':m' => $enRespuestaA])
        : consultarUno(
            "SELECT id FROM chat_mensajes
             WHERE hilo_id = :h AND rol = 'lucila' ORDER BY id DESC LIMIT 1",
            [':h' => $hiloId]
          );

    $marcas = $suyo ? marcasDeLatencia((int) $suyo['id']) : [];
    $marcas['t_responder'] = $tResponder;

    /* Las de MegaBot llegan de su reloj, no del nuestro. Se guardan tal
       cual y deltasDeLatencia() se encarga de no cruzarlas con las
       nuestras. Si vienen mal formadas, anotarMarcasDeLatencia() las
       descarta en silencio: la respuesta importa, la medición es un
       extra —mismo criterio que guardarUsoDeMegabotSiVino(). */
    $suyas = is_array($datos['latencia'] ?? null) ? $datos['latencia'] : [];
    foreach (['t_webhook_recibido', 't_orq_despierta'] as $clave) {
        if (isset($suyas[$clave])) $marcas[$clave] = $suyas[$clave];
    }

    anotarMarcasDeLatencia($mensajeId, $marcas);

    responderBien(['id' => $mensajeId]);
    break;


case 'uso':
    /* ⚡ UN LUGAR PROPIO PARA REPORTAR LA CUOTA (2026-09-06)
     *
     * POR QUÉ NO ALCANZABA CON `responder`
     * El campo `uso` viaja dentro de accion=responder desde el
     * principio, y en semanas no llegó ni una vez. No es mala voluntad:
     * ese camino exige que haya una conversación abierta Y que se
     * acuerde de adjuntarlo mientras redacta la respuesta. Si nadie
     * escribió al chat, no hay por dónde mandarlo aunque la cuota haya
     * cambiado; si escribió, compite con el trabajo de contestar.
     *
     * Acá no depende de nada de eso: un POST suelto, cuando quiera y
     * cuantas veces quiera. Un cron suyo cada hora alcanza, y el panel
     * descuenta el tiempo solo entre reporte y reporte.
     *
     * Se acepta el cuerpo de las dos formas —{"uso":{…}} o {…} pelado—
     * porque la diferencia no vale un reporte perdido.
     *
     * El contrato del contenido es el MISMO de siempre y está escrito
     * una sola vez, junto a guardarUsoDeMegabotSiVino(). Acá no se
     * repite ni se relaja: lo que no cumple, no se guarda. */
    exigirMetodo('POST');
    exigirClaveDeServicio();
    $datos = cuerpoJson();

    guardarUsoDeMegabotSiVino(
        is_array($datos['uso'] ?? null) ? $datos['uso'] : $datos
    );

    $guardado = usoDeMegabotGuardado();

    /* Se contesta lo que quedó guardado, no un "ok" a secas: así, del
       otro lado, se ve en el acto si el formato entró bien o si se
       descartó en silencio por no traer porcentaje. */
    responderBien([
        'guardado' => $guardado !== null,
        'uso'      => $guardado,
    ]);
    break;


case 'contexto':
    exigirMetodo('GET');
    exigirClaveDeServicio();

    $hiloId = campoEntero($_GET, 'hilo_id', 0);
    if ($hiloId <= 0) responderMal('Falta decir de qué hilo.', 400);

    $hilo = consultarUno('SELECT usuario_id FROM chat_hilos WHERE id = :h', [':h' => $hiloId]);
    if (!$hilo) responderMal('Ese hilo no existe.', 404);

    $usuario = consultarUno('SELECT id, nombre, rol FROM usuarios WHERE id = :u', [':u' => $hilo['usuario_id']]);
    responderBien(['contexto' => construirContexto('', $usuario ?: [])]);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
