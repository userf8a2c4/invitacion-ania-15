<?php
/* ══════════════════════════════════════════════════════════════════════
   METRICAS.PHP · CÓMO SE USA EL PANEL, Y QUÉ LE CUESTA (Fase 8)

   QUÉ HACE ESTE ARCHIVO
   Guarda eventos de uso y los resume para la cuenta observadora. No es
   analítica de terceros ni rastrea nada fuera del panel — es
   observabilidad de producto, para ver dónde se traba Lucila en vez de
   adivinarlo.

   NO SOLO "QUÉ SE TOCA". El payload de cada evento ya trae, gracias al
   frontend (codigo/38-metricas.js): un id de sesión de uso (para
   reconstruir la secuencia real de trabajo), duración de pantalla,
   abandono de formularios, errores que la persona vio, y contexto
   automático (sin señal, días para el evento, ancho de pantalla).

   QUIÉN PUEDE HACER QUÉ
   Registrar: cualquier cuenta logueada, de lo suyo. Leer el resumen o
   exportar: SOLO la cuenta observadora (esObservador(), _lib/sesion.php).

   QUÉ SE LE PUEDE PEDIR
     POST ?accion=registrar   {tipo, nombre, payload?, pantalla?}
     GET  ?accion=resumen     ?dias=7|30|0(=todo)
     GET  ?accion=exportar    ?dias=7|30|0(=todo) — filas crudas; el
                               .txt se arma en el teléfono
                               (codigo/39-vista-metricas.js), mismo
                               criterio que ya usa 13-exportar.js.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'registrar');


switch ($accion) {

/* ─── REGISTRAR (cualquier cuenta, de lo suyo) ────────────────────────── */

case 'registrar':
    exigirMetodo('POST');

    // Si la instalación todavía no corrió la migración, se responde
    // bien igual: el frontend nunca debe frenarse ni avisar por esto,
    // es telemetría, no una acción que la persona esté esperando.
    if (!existeTabla('eventos_uso')) { responderBien(['ok' => true]); break; }

    $datos = cuerpoJson();

    $tipo = campoOpcion($datos, 'tipo',
        ['vista', 'accion', 'busqueda', 'asistente', 'friccion', 'error'], '');
    $nombre = campoTexto($datos, 'nombre', 60);

    if ($tipo === '' || $nombre === '') { responderBien(['ok' => true]); break; }

    insertar('eventos_uso', [
        'usuario_id' => (int) $yo['id'],
        'tipo'       => $tipo,
        'nombre'     => $nombre,
        'payload'    => isset($datos['payload'])
            ? json_encode($datos['payload'], JSON_UNESCAPED_UNICODE)
            : null,
        'pantalla'   => campoTexto($datos, 'pantalla', 40),
    ]);

    // Purga oportunista: nada más viejo que esto le sirve a nadie para
    // decidir nada, y dejarla crecer para siempre fue justo lo que
    // agravó el bug del freno de login (Fase 8.1) en la otra tabla.
    if (random_int(1, 300) === 1) {
        ejecutar('DELETE FROM eventos_uso WHERE creado_en < DATE_SUB(NOW(), INTERVAL 90 DAY)');
    }

    responderBien(['ok' => true]);
    break;


/* ─── RESUMEN (solo la cuenta observadora) ────────────────────────────── */

case 'resumen':
    exigirMetodo('GET');
    if (!esObservador($yo)) responderMal('No tienes permiso para ver esto.', 403);

    if (!existeTabla('eventos_uso')) {
        responderBien(resumenVacio());
        break;
    }

    // 0 = todo el historial.
    $dias  = campoEntero($_GET, 'dias', 0, 3650, 7);
    $desde = $dias > 0 ? date('Y-m-d H:i:s', strtotime('-' . $dias . ' days')) : '1970-01-01';

    $total = consultarUno(
        'SELECT COUNT(*) AS n, COUNT(DISTINCT usuario_id) AS usuarios
         FROM eventos_uso WHERE creado_en >= :d',
        [':d' => $desde]
    );

    $topPantallas = consultarTodo(
        "SELECT nombre, COUNT(*) AS cuantos FROM eventos_uso
         WHERE tipo = 'vista' AND creado_en >= :d
         GROUP BY nombre ORDER BY cuantos DESC LIMIT 8",
        [':d' => $desde]
    );

    $topAcciones = consultarTodo(
        "SELECT nombre, COUNT(*) AS cuantos FROM eventos_uso
         WHERE tipo = 'accion' AND creado_en >= :d
         GROUP BY nombre ORDER BY cuantos DESC LIMIT 10",
        [':d' => $desde]
    );

    /* Ranking de fricción: lo único de verdad accionable. Abandonos +
       errores vistos + repeticiones, todo junto y ordenado — no separado
       por tipo, porque lo que importa es DÓNDE, no cómo se llame el
       evento. */
    $friccionFilas = consultarTodo(
        "SELECT tipo, nombre, pantalla, COUNT(*) AS cuantos FROM eventos_uso
         WHERE (tipo IN ('friccion', 'error')
                OR (tipo = 'busqueda' AND nombre = 'busqueda_vacia'))
           AND creado_en >= :d
         GROUP BY tipo, nombre, pantalla
         ORDER BY cuantos DESC LIMIT 15",
        [':d' => $desde]
    );

    /* Tendencia: eventos por día. El dato ya está en creado_en, solo
       hace falta agruparlo — contesta "¿cuándo trabaja?" y "¿esto
       mejoró o empeoró esta semana contra la anterior?". */
    $porDia = consultarTodo(
        "SELECT DATE(creado_en) AS dia, COUNT(*) AS cuantos
         FROM eventos_uso WHERE creado_en >= :d
         GROUP BY DATE(creado_en) ORDER BY dia",
        [':d' => $desde]
    );

    /* Tiempo por pantalla: promedio y total, de los eventos de
       permanencia que manda irA() en 05-navegacion.js. Los segundos
       viven en el JSON del payload, así que se suman en PHP. */
    $permanenciaFilas = consultarTodo(
        "SELECT pantalla, payload FROM eventos_uso
         WHERE tipo = 'vista' AND nombre = 'permanencia' AND creado_en >= :d",
        [':d' => $desde]
    );
    $tiempoPorPantalla = [];
    foreach ($permanenciaFilas as $fila) {
        $datosP = json_decode((string) $fila['payload'], true);
        $segundos = (int) ($datosP['segundos'] ?? 0);
        if ($segundos <= 0) continue;

        $p = $fila['pantalla'] ?: '—';
        if (!isset($tiempoPorPantalla[$p])) $tiempoPorPantalla[$p] = ['total' => 0, 'veces' => 0];
        $tiempoPorPantalla[$p]['total'] += $segundos;
        $tiempoPorPantalla[$p]['veces']++;
    }
    $tiempoPorPantallaFilas = [];
    foreach ($tiempoPorPantalla as $pantalla => $d) {
        $tiempoPorPantallaFilas[] = [
            'pantalla'  => $pantalla,
            'total_seg' => $d['total'],
            'promedio_seg' => (int) round($d['total'] / $d['veces']),
        ];
    }
    usort($tiempoPorPantallaFilas, function ($a, $b) { return $b['total_seg'] <=> $a['total_seg']; });

    /* Endpoints lentos: mismo criterio, el detalle viaja en el payload
       de endpoint_lento (ver pedir(), 03-servidor.js). */
    $lentosFilas = consultarTodo(
        "SELECT payload FROM eventos_uso
         WHERE tipo = 'accion' AND nombre = 'endpoint_lento' AND creado_en >= :d",
        [':d' => $desde]
    );
    $porRuta = [];
    foreach ($lentosFilas as $fila) {
        $datosL = json_decode((string) $fila['payload'], true);
        $ruta = (string) ($datosL['ruta'] ?? '?');
        $ms   = (int) ($datosL['ms'] ?? 0);
        if (!isset($porRuta[$ruta])) $porRuta[$ruta] = ['total' => 0, 'veces' => 0, 'peor' => 0];
        $porRuta[$ruta]['total'] += $ms;
        $porRuta[$ruta]['veces']++;
        if ($ms > $porRuta[$ruta]['peor']) $porRuta[$ruta]['peor'] = $ms;
    }
    $endpointsLentos = [];
    foreach ($porRuta as $ruta => $d) {
        $endpointsLentos[] = [
            'ruta' => $ruta, 'veces' => $d['veces'],
            'promedio_ms' => (int) round($d['total'] / $d['veces']), 'peor_ms' => $d['peor'],
        ];
    }
    usort($endpointsLentos, function ($a, $b) { return $b['veces'] <=> $a['veces']; });

    /* Las frases del asistente se cuentan en PHP y no en SQL: el texto
       vive adentro del JSON de payload, y sumarizar JSON en SQL depende
       de una versión de MySQL/MariaDB que no se puede dar por segura en
       un hosting compartido. */
    $frasesFilas = consultarTodo(
        "SELECT nombre, payload FROM eventos_uso
         WHERE tipo = 'asistente' AND creado_en >= :d",
        [':d' => $desde]
    );
    $conteoOk = []; $conteoMal = [];
    foreach ($frasesFilas as $fila) {
        $datosFrase = json_decode((string) $fila['payload'], true);
        $texto = trim((string) ($datosFrase['texto'] ?? ''));
        if ($texto === '') continue;
        if ($fila['nombre'] === 'frase_exitosa') {
            $conteoOk[$texto] = ($conteoOk[$texto] ?? 0) + 1;
        } else {
            $conteoMal[$texto] = ($conteoMal[$texto] ?? 0) + 1;
        }
    }
    arsort($conteoOk);
    arsort($conteoMal);

    $comoFilas = function ($conteo, $tope) {
        $filas = [];
        foreach ($conteo as $texto => $cuantos) {
            if (count($filas) >= $tope) break;
            $filas[] = ['texto' => $texto, 'cuantos' => $cuantos];
        }
        return $filas;
    };

    responderBien([
        'rango_dias'         => $dias,
        'desde'              => $desde,
        'total_eventos'      => (int) $total['n'],
        'usuarios_activos'   => (int) $total['usuarios'],
        'top_pantallas'      => $topPantallas,
        'top_acciones'       => $topAcciones,
        'ranking_friccion'   => $friccionFilas,
        'tendencia_por_dia'  => $porDia,
        'tiempo_por_pantalla'=> $tiempoPorPantallaFilas,
        'endpoints_lentos'   => $endpointsLentos,
        'frases_ok'          => $comoFilas($conteoOk, 10),
        'frases_fallidas'    => $comoFilas($conteoMal, 10),
        'completitud'        => completitudDelEvento(),
    ]);
    break;


/* ─── EXPORTAR (solo la cuenta observadora) ───────────────────────────── */

case 'exportar':
    exigirMetodo('GET');
    if (!esObservador($yo)) responderMal('No tienes permiso para ver esto.', 403);

    if (!existeTabla('eventos_uso')) { responderBien(['eventos' => []]); break; }

    $dias  = campoEntero($_GET, 'dias', 0, 3650, 7);
    $desde = $dias > 0 ? date('Y-m-d H:i:s', strtotime('-' . $dias . ' days')) : '1970-01-01';

    $eventos = consultarTodo(
        'SELECT e.creado_en, u.nombre AS usuario, e.tipo, e.nombre,
                e.pantalla, e.payload
         FROM eventos_uso e
         JOIN usuarios u ON u.id = e.usuario_id
         WHERE e.creado_en >= :d
         ORDER BY e.creado_en',
        [':d' => $desde]
    );

    responderBien(['eventos' => $eventos, 'desde' => $desde]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Qué tan completo está el evento. No es telemetría de uso: es el
 * contexto sin el cual los números de arriba no se pueden interpretar
 * (poca actividad puede ser "ya está todo cargado", no "no se usa").
 *
 * @return array
 */
function completitudDelEvento() {
    $vacio = ['mesas_pct' => null, 'acompanantes_pct' => null, 'pagos_al_dia_pct' => null];
    if (!existeTabla('confirmaciones')) return $vacio;

    $mesasPct = null;
    if (existeTabla('mesas') && existeTabla('asignacion_mesas')) {
        $confirmados = consultarUno(
            "SELECT COALESCE(SUM(adultos + ninos), 0) AS n FROM confirmaciones WHERE asiste = 1"
        );
        $sentados = consultarUno(
            'SELECT COALESCE(SUM(lugares), 0) AS n FROM asignacion_mesas'
        );
        $total = (int) ($confirmados['n'] ?? 0);
        if ($total > 0) $mesasPct = round(min(100, (int) $sentados['n'] / $total * 100));
    }

    $acompPct = null;
    if (existeTabla('acompanantes')) {
        $confirmaciones = consultarUno(
            "SELECT COUNT(*) AS n FROM confirmaciones WHERE asiste = 1 AND (adultos + ninos) > 1"
        );
        $conNombrados = consultarUno(
            'SELECT COUNT(DISTINCT confirmacion_id) AS n FROM acompanantes'
        );
        $total = (int) ($confirmaciones['n'] ?? 0);
        if ($total > 0) $acompPct = round(min(100, (int) $conNombrados['n'] / $total * 100));
    }

    $pagosPct = null;
    if (existeTabla('pagos')) {
        $todos = consultarUno('SELECT COUNT(*) AS n FROM pagos');
        $alDia = consultarUno("SELECT COUNT(*) AS n FROM pagos WHERE estado = 'pagado'");
        $total = (int) ($todos['n'] ?? 0);
        if ($total > 0) $pagosPct = round((int) $alDia['n'] / $total * 100);
    }

    return ['mesas_pct' => $mesasPct, 'acompanantes_pct' => $acompPct, 'pagos_al_dia_pct' => $pagosPct];
}

/**
 * La forma vacía del resumen, para cuando falta correr la migración.
 *
 * @return array
 */
function resumenVacio() {
    return [
        'rango_dias' => 0, 'total_eventos' => 0, 'usuarios_activos' => 0,
        'top_pantallas' => [], 'top_acciones' => [], 'ranking_friccion' => [],
        'tendencia_por_dia' => [], 'tiempo_por_pantalla' => [], 'endpoints_lentos' => [],
        'frases_ok' => [], 'frases_fallidas' => [],
        'completitud' => ['mesas_pct' => null, 'acompanantes_pct' => null, 'pagos_al_dia_pct' => null],
    ];
}
