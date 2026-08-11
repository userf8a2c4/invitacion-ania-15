<?php
/* ══════════════════════════════════════════════════════════════════════
   METRICAS.PHP · CÓMO SE USA EL PANEL DE VERDAD

   QUÉ HACE ESTE ARCHIVO
   Guarda eventos de uso significativos (abrir una ficha, asignar mesa,
   marcar llegada…) y los resume para la cuenta observadora. No es
   analítica de terceros ni rastrea nada fuera del panel — es
   observabilidad de producto, para ver dónde se traba Lucila en vez de
   adivinarlo (ver panel-metricas-observabilidad.txt).

   QUIÉN PUEDE HACER QUÉ
   Registrar: cualquier cuenta logueada, de lo suyo. Leer el resumen o
   exportar: SOLO la cuenta observadora (esObservador(), _lib/sesion.php)
   — deliberadamente no "cualquier admin", ver esa función para el porqué.

   QUÉ SE LE PUEDE PEDIR
     POST ?accion=registrar   {tipo, nombre, payload?, pantalla?}
     GET  ?accion=resumen     ?dias=7|30|0(=todo)
     GET  ?accion=exportar    ?dias=7|30|0(=todo) — filas crudas; el
                               archivo .txt se arma en el teléfono
                               (codigo/39-vista-metricas.js), no acá —
                               mismo criterio que ya usa 13-exportar.js.
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
        ['vista', 'accion', 'busqueda', 'asistente', 'friccion'], '');
    $nombre = campoTexto($datos, 'nombre', 60);

    if ($tipo === '' || $nombre === '') responderBien(['ok' => true]); // se ignora, no se rompe

    insertar('eventos_uso', [
        'usuario_id' => (int) $yo['id'],
        'tipo'       => $tipo,
        'nombre'     => $nombre,
        'payload'    => isset($datos['payload'])
            ? json_encode($datos['payload'], JSON_UNESCAPED_UNICODE)
            : null,
        'pantalla'   => campoTexto($datos, 'pantalla', 40),
    ]);

    responderBien(['ok' => true]);
    break;


/* ─── RESUMEN (solo la cuenta observadora) ────────────────────────────── */

case 'resumen':
    exigirMetodo('GET');
    if (!esObservador($yo)) responderMal('No tienes permiso para ver esto.', 403);

    if (!existeTabla('eventos_uso')) {
        responderBien([
            'rango_dias' => 0, 'total_eventos' => 0, 'usuarios_activos' => 0,
            'top_pantallas' => [], 'top_acciones' => [],
            'frases_ok' => [], 'frases_fallidas' => [], 'fricciones' => [],
        ]);
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

    $friccionFilas = consultarTodo(
        "SELECT nombre, COUNT(*) AS cuantos FROM eventos_uso
         WHERE tipo IN ('friccion', 'busqueda') AND creado_en >= :d
         GROUP BY nombre",
        [':d' => $desde]
    );
    $fricciones = [];
    foreach ($friccionFilas as $fila) $fricciones[$fila['nombre']] = (int) $fila['cuantos'];

    /* Las frases del asistente se cuentan en PHP y no en SQL: el texto
       vive adentro del JSON de payload, y sumarizar JSON en SQL depende
       de una versión de MySQL/MariaDB que no se puede dar por segura en
       un hosting compartido. Acá son cuatro líneas y funciona siempre. */
    $frasesFilas = consultarTodo(
        "SELECT nombre, payload FROM eventos_uso
         WHERE tipo = 'asistente' AND creado_en >= :d",
        [':d' => $desde]
    );

    $conteoOk  = [];
    $conteoMal = [];
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
        'rango_dias'       => $dias,
        'desde'            => $desde,
        'total_eventos'    => (int) $total['n'],
        'usuarios_activos' => (int) $total['usuarios'],
        'top_pantallas'    => $topPantallas,
        'top_acciones'     => $topAcciones,
        'frases_ok'        => $comoFilas($conteoOk, 10),
        'frases_fallidas'  => $comoFilas($conteoMal, 10),
        'fricciones'       => $fricciones,
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
