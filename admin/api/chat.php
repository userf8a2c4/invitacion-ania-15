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
     POST ?accion=enviar        {texto, pantalla}
     POST ?accion=propuesta_estado  {id, estado: 'aceptada'|'rechazada'}
     POST ?accion=reenviar      {mensaje_id}
     POST ?accion=rotar_clave   (solo admin)
     POST ?accion=responder     {hilo_id, en_respuesta_a?, texto, propuestas?[]}  (X-MegaBot-Clave)
     GET  ?accion=contexto&hilo_id=          (X-MegaBot-Clave)
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/mesas.php';

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
            $panorama = panoramaDeMesas();
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
            'timeout' => 10,
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

/**
 * El snapshot de uso que mandó MegaBot la última vez (o null si nunca
 * mandó nada) — se guarda como ajuste, mismo patrón que cualquier otro
 * valor chico de `ajustes`. Nunca se inventa un número acá: si no hay
 * dato, el encabezado se queda en blanco (lo decide el JS).
 *
 * @return array|null
 */
function usoDeMegabotGuardado() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_uso'");
    $valor = (string) ($fila['valor'] ?? '');
    if ($valor === '') return null;

    $uso = json_decode($valor, true);
    return is_array($uso) ? $uso : null;
}

/**
 * Valida y guarda el `uso` opcional que mandó MegaBot en `accion=
 * responder`. Nunca corta la petición si viene mal formado — el texto
 * de la respuesta es lo importante, el uso es un extra.
 *
 * @param mixed $usoCrudo
 * @return void
 */
function guardarUsoDeMegabotSiVino($usoCrudo) {
    if (!is_array($usoCrudo)) return;

    $porcentaje = isset($usoCrudo['porcentaje']) ? (int) $usoCrudo['porcentaje'] : null;
    if ($porcentaje !== null) $porcentaje = max(0, min(100, $porcentaje));

    $reiniciaEn = isset($usoCrudo['reinicia_en']) ? max(0, (int) $usoCrudo['reinicia_en']) : 0;
    $agotado = !empty($usoCrudo['agotado']);

    // Sin porcentaje no hay nada honesto que mostrar (ver tabla del
    // encabezado) — no se guarda un uso vacío.
    if ($porcentaje === null && !$agotado) return;

    $uso = ['porcentaje' => $porcentaje, 'reinicia_en' => $reiniciaEn, 'agotado' => $agotado];
    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('megabot_uso', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => json_encode($uso, JSON_UNESCAPED_UNICODE)]
    );
}


switch ($accion) {

/* ═══════════════════ CON SESIÓN DE LUCILA/CARLOS ═══════════════════ */

case 'listar':
    exigirMetodo('GET');
    $yo = exigirSesion();
    $hiloId = hiloDe((int) $yo['id']);
    $despuesDe = campoEntero($_GET, 'despues_de', 0);

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
    }
    unset($m);

    responderBien(['hilo_id' => $hiloId, 'mensajes' => $mensajes, 'uso' => usoDeMegabotGuardado()]);
    break;


case 'enviar':
    exigirMetodo('POST');
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

    $url = (string) (consultarUno("SELECT valor FROM ajustes WHERE clave = 'megabot_webhook_url'")['valor'] ?? '');
    $offline = true;

    if ($url === '') {
        // Sin webhook configurado: se guarda igual, sin burbuja de
        // sistema — el JS (32-asistente.js) resuelve local con los
        // agentes 40-44/46 y el matcher viejo. Nunca se cae a eso desde
        // acá: es la UI la que decide qué mostrar con offline=true.
        actualizar('chat_mensajes', $mensajeId, ['estado' => 'pendiente']);
    } else {
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

        $offline = !$enviado;
        actualizar('chat_mensajes', $mensajeId, ['estado' => $enviado ? 'enviado' : 'error']);
    }

    responderBien(['id' => $mensajeId, 'hilo_id' => $hiloId, 'offline' => $offline]);
    break;


case 'propuesta_estado':
    exigirMetodo('POST');
    $yo = exigirSesion();
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    $estado = campoOpcion($datos, 'estado', ['aceptada', 'rechazada'], '');
    if ($id <= 0 || $estado === '') responderMal('Falta decir qué propuesta y qué pasó.', 400);

    // Solo se marca — la UI ya corrió mandar() antes de llamar acá.
    // Nunca se re-ejecuta la acción desde PHP: sería un segundo camino
    // para escribir, justo lo que este archivo tiene prohibido.
    actualizar('chat_propuestas', $id, ['estado' => $estado === 'aceptada' ? 'ejecutada' : 'rechazada']);
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
    exigirClaveDeServicio();
    $datos = cuerpoJson();

    $hiloId = campoEntero($datos, 'hilo_id', 0);
    if ($hiloId <= 0) responderMal('Falta decir de qué hilo.', 400);
    if (!consultarUno('SELECT id FROM chat_hilos WHERE id = :h', [':h' => $hiloId])) {
        responderMal('Ese hilo no existe.', 404);
    }

    $texto = campoTexto($datos, 'texto', 4000);
    $propuestasCrudas = is_array($datos['propuestas'] ?? null) ? $datos['propuestas'] : [];
    guardarUsoDeMegabotSiVino($datos['uso'] ?? null);

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

    $mensajeId = insertar('chat_mensajes', [
        'hilo_id' => $hiloId, 'rol' => 'megabot', 'texto' => $texto,
        'propuestas_json' => $propuestasCrudas ? json_encode($propuestasCrudas, JSON_UNESCAPED_UNICODE) : null,
        'estado' => 'enviado',
    ]);

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

    responderBien(['id' => $mensajeId]);
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
