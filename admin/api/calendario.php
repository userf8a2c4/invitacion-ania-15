<?php
/* ══════════════════════════════════════════════════════════════════════
   CALENDARIO.PHP · TODO LO QUE TIENE FECHA, MES POR MES

   QUÉ HACE ESTE ARCHIVO
   Junta en una sola lista todo lo del evento que cae en un día concreto:
   pagos, tareas, fechas de agenda, pruebas de vestido, ensayos del vals,
   papeles de la iglesia, la misa y la fiesta.

   EN QUÉ SE DIFERENCIA DE LA LÍNEA DE TIEMPO DEL RESUMEN
   Esa contesta "¿qué viene ahora?" y ordena por cercanía. Esta contesta
   "¿cómo está repartido el mes?", que es una pregunta de forma, no de
   urgencia: sirve para ver que hay tres cosas el mismo sábado y una
   semana entera vacía al lado.

   POR QUÉ CADA HITO TRAE SU id Y SU TIPO
   Para que tocarlo en el calendario abra ESE registro y no una lista
   donde haya que buscarlo de nuevo. Es lo que convierte el calendario en
   un índice del panel en vez de un adorno.

   QUÉ SE LE PUEDE PEDIR
     GET ?accion=mes&anio=2026&mes=10
     GET ?accion=rango&desde=2026-08-01&hasta=2026-12-31
     GET ?accion=meses   en qué meses hay algo (para el selector)
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

exigirSesion();
exigirMetodo('GET');

$accion = (string) ($_GET['accion'] ?? 'mes');

/** La fecha de la fiesta. Se repite acá porque el servidor arma avisos
 *  por su cuenta, sin depender de que haya un teléfono abierto. */
const DIA_DE_LA_FIESTA = '2026-10-24';


/* ─── QUÉ RANGO SE PIDIÓ ──────────────────────────────────────────────── */

if ($accion === 'rango') {
    $desde = campoFecha($_GET, 'desde') ?: date('Y-m-01');
    $hasta = campoFecha($_GET, 'hasta') ?: date('Y-m-t');
} else {
    $anio = (int) ($_GET['anio'] ?? date('Y'));
    $mes  = (int) ($_GET['mes']  ?? date('n'));

    // Se acotan a valores posibles: un mes 13 haría fallar mktime.
    if ($anio < 2020 || $anio > 2100) $anio = (int) date('Y');
    if ($mes < 1 || $mes > 12)        $mes  = (int) date('n');

    $desde = sprintf('%04d-%02d-01', $anio, $mes);
    $hasta = date('Y-m-t', strtotime($desde));
}

/* Para 'meses' se mira todo, sin recortar. */
if ($accion === 'meses') { $desde = '2000-01-01'; $hasta = '2100-12-31'; }


/* ─── JUNTAR LOS HITOS ────────────────────────────────────────────────── */

$hitos = [];

/**
 * Agrega un hito a la lista.
 *
 * @param array  &$hitos
 * @param array  $datos  fecha, tipo, texto, detalle, hora, id, hecho,
 *                       ir_a, seccion
 * @return void
 */
function agregar(&$hitos, $datos) {
    if (empty($datos['fecha'])) return;

    $hitos[] = [
        'fecha'   => substr($datos['fecha'], 0, 10),
        'hora'    => !empty($datos['hora']) ? substr($datos['hora'], 0, 5) : '',
        'tipo'    => $datos['tipo'],
        'texto'   => (string) $datos['texto'],
        'detalle' => (string) ($datos['detalle'] ?? ''),
        'id'      => (int) ($datos['id'] ?? 0),
        'hecho'   => !empty($datos['hecho']),
        'ir_a'    => (string) ($datos['ir_a'] ?? ''),
        'seccion' => (string) ($datos['seccion'] ?? ''),
    ];
}

/* ─── Pagos ───────────────────────────────────────────────────────────── */
if (existeTabla('pagos')) {
    foreach (consultarTodo(
        'SELECT p.id, p.concepto, p.monto, p.fecha_limite, p.estado,
                g.concepto AS gasto
         FROM pagos p LEFT JOIN gastos g ON g.id = p.gasto_id
         WHERE p.fecha_limite BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $p) {
        agregar($hitos, [
            'fecha'   => $p['fecha_limite'],
            'tipo'    => 'pago',
            'texto'   => $p['concepto'] ?: ($p['gasto'] ?: 'Pago'),
            'detalle' => '$' . number_format((float) $p['monto'], 0),
            'id'      => $p['id'],
            'hecho'   => $p['estado'] === 'pagado',
            'ir_a'    => 'dinero',
            'seccion' => 'pagos',
        ]);
    }
}

/* ─── Tareas ──────────────────────────────────────────────────────────── */
if (existeTabla('tareas')) {
    foreach (consultarTodo(
        'SELECT id, titulo, responsable, fecha_limite, estado, prioridad
         FROM tareas WHERE fecha_limite BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $t) {
        agregar($hitos, [
            'fecha'   => $t['fecha_limite'],
            'tipo'    => 'tarea',
            'texto'   => $t['titulo'],
            'detalle' => $t['responsable'] ?: '',
            'id'      => $t['id'],
            'hecho'   => $t['estado'] === 'hecha',
            'ir_a'    => 'evento',
            'seccion' => 'tareas',
        ]);
    }
}

/* ─── Agenda ──────────────────────────────────────────────────────────── */
if (existeTabla('agenda')) {
    foreach (consultarTodo(
        'SELECT id, titulo, fecha, hora, lugar FROM agenda
         WHERE fecha BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $a) {
        agregar($hitos, [
            'fecha'   => $a['fecha'],
            'hora'    => $a['hora'],
            'tipo'    => 'agenda',
            'texto'   => $a['titulo'],
            'detalle' => $a['lugar'] ?: '',
            'id'      => $a['id'],
            'ir_a'    => 'evento',
            'seccion' => 'agenda',
        ]);
    }
}

/* ─── Vestido y arreglo ───────────────────────────────────────────────── */
if (existeTabla('citas_arreglo')) {
    foreach (consultarTodo(
        'SELECT id, titulo, tipo, fecha, hora, lugar, estado
         FROM citas_arreglo WHERE fecha BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $c) {
        agregar($hitos, [
            'fecha'   => $c['fecha'],
            'hora'    => $c['hora'],
            'tipo'    => 'vestido',
            'texto'   => $c['titulo'] ?: ucfirst($c['tipo']),
            'detalle' => $c['lugar'] ?: '',
            'id'      => $c['id'],
            'hecho'   => $c['estado'] === 'hecha',
            'ir_a'    => 'evento',
            'seccion' => 'citas_arreglo',
        ]);
    }
}

/* ─── Ensayos del vals ────────────────────────────────────────────────── */
if (existeTabla('ensayos')) {
    foreach (consultarTodo(
        'SELECT id, fecha, hora, lugar FROM ensayos WHERE fecha BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $e) {
        agregar($hitos, [
            'fecha'   => $e['fecha'],
            'hora'    => $e['hora'],
            'tipo'    => 'ensayo',
            'texto'   => 'Ensayo del vals',
            'detalle' => $e['lugar'] ?: '',
            'id'      => $e['id'],
            'ir_a'    => 'evento',
            'seccion' => 'ensayos',
        ]);
    }
}

/* ─── Papeles de la iglesia ───────────────────────────────────────────── */
if (existeTabla('requisitos_ceremonia')) {
    foreach (consultarTodo(
        'SELECT id, requisito, fecha_limite, estado FROM requisitos_ceremonia
         WHERE fecha_limite BETWEEN :d AND :h',
        [':d' => $desde, ':h' => $hasta]
    ) as $r) {
        agregar($hitos, [
            'fecha'   => $r['fecha_limite'],
            'tipo'    => 'papeles',
            'texto'   => $r['requisito'],
            'detalle' => 'Papel de la iglesia',
            'id'      => $r['id'],
            'hecho'   => $r['estado'] === 'listo',
            'ir_a'    => 'evento',
            'seccion' => 'requisitos_ceremonia',
        ]);
    }
}

/* ─── La misa ─────────────────────────────────────────────────────────── */
if (existeTabla('ceremonia')) {
    $misa = consultarUno(
        'SELECT id, iglesia, fecha, hora FROM ceremonia
         WHERE fecha BETWEEN :d AND :h LIMIT 1',
        [':d' => $desde, ':h' => $hasta]
    );
    if ($misa) {
        agregar($hitos, [
            'fecha'   => $misa['fecha'],
            'hora'    => $misa['hora'],
            'tipo'    => 'misa',
            'texto'   => 'Misa de acción de gracias',
            'detalle' => $misa['iglesia'] ?: '',
            'id'      => $misa['id'],
            'ir_a'    => 'evento',
            'seccion' => 'ceremonia',
        ]);
    }
}

/* ─── La fiesta ───────────────────────────────────────────────────────── */
if (DIA_DE_LA_FIESTA >= $desde && DIA_DE_LA_FIESTA <= $hasta) {
    agregar($hitos, [
        'fecha'   => DIA_DE_LA_FIESTA,
        'hora'    => '17:00',
        'tipo'    => 'fiesta',
        'texto'   => 'Los XV de Ania',
        'detalle' => 'Salones Alvi, Toluca',
        'ir_a'    => 'evento',
        'seccion' => 'cronograma',
    ]);
}


/* ─── RESPONDER ───────────────────────────────────────────────────────── */

/* En qué meses hay algo. Sirve para que el selector no ofrezca navegar a
   meses vacíos, y para poder saltar directo a donde hay movimiento. */
if ($accion === 'meses') {
    $meses = [];
    foreach ($hitos as $hito) {
        $clave = substr($hito['fecha'], 0, 7);
        if (!isset($meses[$clave])) $meses[$clave] = 0;
        $meses[$clave]++;
    }
    ksort($meses);
    responderBien(['meses' => $meses]);
}

// Ordenados por día y, dentro del día, por hora.
usort($hitos, function ($a, $b) {
    if ($a['fecha'] !== $b['fecha']) return strcmp($a['fecha'], $b['fecha']);
    // Los que no tienen hora van primero: son "en algún momento del día".
    if ($a['hora'] === '') return -1;
    if ($b['hora'] === '') return 1;
    return strcmp($a['hora'], $b['hora']);
});

/* Agrupados por día, que es como los va a pintar el calendario. Se hace
   acá y no en la app para que el teléfono reciba la respuesta lista. */
$porDia = [];
foreach ($hitos as $hito) {
    if (!isset($porDia[$hito['fecha']])) $porDia[$hito['fecha']] = [];
    $porDia[$hito['fecha']][] = $hito;
}

responderBien([
    'desde'   => $desde,
    'hasta'   => $hasta,
    'hitos'   => $hitos,
    'por_dia' => $porDia,
    'cuantos' => count($hitos),
    'hoy'     => date('Y-m-d'),
]);
