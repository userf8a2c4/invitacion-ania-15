<?php
/* ══════════════════════════════════════════════════════════════════════
   CRON_RECORDATORIOS.PHP · EL AVISO DIARIO

   QUÉ HACE ESTE ARCHIVO
   Una vez al día revisa qué vence pronto y avisa por dos caminos:
     1. Correo a las administradoras. Es el que SIEMPRE llega.
     2. Notificación al teléfono, si alguien la activó.

   POR QUÉ POR DOS CAMINOS Y NO SOLO POR NOTIFICACIÓN
   Las notificaciones dependen de que el permiso siga concedido, de que
   la app siga instalada y de que Google o Apple entreguen el mensaje.
   Cualquiera de esas tres cosas puede fallar en silencio. El correo usa
   el mismo SMTP que ya manda las confirmaciones y funciona hace meses.
   Si un pago vence, es mejor enterarse dos veces que ninguna.

   CÓMO SE PROGRAMA EN HOSTINGER
     hPanel → Avanzado → Trabajos cron → Crear
     Comando:  php /home/USUARIO/domains/aniaxv.com/public_html/admin/api/cron_recordatorios.php
     Cuándo:   una vez al día, a las 8 de la mañana

   TAMBIÉN SE PUEDE ABRIR EN EL NAVEGADOR para probarlo, agregando la
   llave:  https://aniaxv.com/admin/api/cron_recordatorios.php?llave=…
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';
require_once __DIR__ . '/_lib/push.php';

/* ─── QUIÉN PUEDE CORRERLO ────────────────────────────────────────────── */

/* Corriendo desde el cron no hay navegador: PHP se ejecuta en modo
   consola y no hace falta llave. Desde el navegador sí, para que nadie
   pueda dispararlo cien veces y llenar de correos a las administradoras. */
$desdeLaConsola = (php_sapi_name() === 'cli');

if (!$desdeLaConsola && !llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
    responderMal('Llave incorrecta.', 403);
}

/** Con cuántos días de anticipación se avisa. */
$DIAS = 3;


/* ─── QUÉ HAY QUE AVISAR ──────────────────────────────────────────────── */

$pagos = existeTabla('pagos') ? consultarTodo(
    "SELECT p.concepto, p.monto, p.fecha_limite, g.concepto AS gasto
     FROM pagos p
     LEFT JOIN gastos g ON g.id = p.gasto_id
     WHERE p.estado = 'pendiente' AND p.fecha_limite IS NOT NULL
       AND p.fecha_limite <= DATE_ADD(CURDATE(), INTERVAL :d DAY)
     ORDER BY p.fecha_limite",
    [':d' => $DIAS]
) : [];

$tareas = existeTabla('tareas') ? consultarTodo(
    "SELECT titulo, responsable, fecha_limite FROM tareas
     WHERE estado <> 'hecha' AND fecha_limite IS NOT NULL
       AND fecha_limite <= DATE_ADD(CURDATE(), INTERVAL :d DAY)
     ORDER BY fecha_limite",
    [':d' => $DIAS]
) : [];

$agenda = existeTabla('agenda') ? consultarTodo(
    'SELECT titulo, fecha, hora, lugar FROM agenda
     WHERE fecha >= CURDATE() AND fecha <= DATE_ADD(CURDATE(), INTERVAL :d DAY)
     ORDER BY fecha, hora',
    [':d' => $DIAS]
) : [];

$hayAlgo = $pagos || $tareas || $agenda;

/* Si no hay nada, se termina sin mandar nada. Un correo diario de "todo
   en orden" se vuelve ruido y en dos semanas nadie lo abre — y ese es
   justo el día que sí traía algo importante. */
if (!$hayAlgo) {
    terminar(['aviso' => 'Nada que avisar hoy.']);
}


/* ─── EL CORREO ───────────────────────────────────────────────────────── */

/**
 * Escribe una fecha como "en 2 días" o "venció hace 1 día".
 *
 * @param string $fecha
 * @return string
 */
function cuando($fecha) {
    $dias = (int) (new DateTime('today'))
        ->diff(new DateTime(substr($fecha, 0, 10)))
        ->format('%r%a');

    if ($dias === 0)  return 'hoy';
    if ($dias === 1)  return 'mañana';
    if ($dias > 1)    return 'en ' . $dias . ' días';
    if ($dias === -1) return 'venció ayer';
    return 'venció hace ' . abs($dias) . ' días';
}

/**
 * Arma una sección del correo.
 *
 * @param string $titulo
 * @param array  $filas
 * @param callable $comoSeVe Recibe una fila, devuelve [texto, detalle].
 * @return string
 */
function seccion($titulo, $filas, $comoSeVe) {
    if (!$filas) return '';

    $renglones = '';
    foreach ($filas as $fila) {
        [$texto, $detalle] = $comoSeVe($fila);

        $renglones .=
            "<tr style='border-bottom:1px solid #e8d5b0;'>" .
            "<td style='padding:8px;'>" . htmlspecialchars($texto, ENT_QUOTES, 'UTF-8') . "</td>" .
            "<td style='padding:8px;color:#8B4513;white-space:nowrap;'>" .
            htmlspecialchars($detalle, ENT_QUOTES, 'UTF-8') . "</td></tr>";
    }

    return "<h3 style='color:#8B4513;margin:24px 0 8px;'>" .
           htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8') . "</h3>" .
           "<table width='100%' cellpadding='0' cellspacing='0' " .
           "style='border-collapse:collapse;font-size:14px;'>$renglones</table>";
}

$cuerpo =
    seccion('Pagos', $pagos, function ($p) {
        $nombre = $p['concepto'] ?: ($p['gasto'] ?: 'Pago');
        $monto  = '$' . number_format((float) $p['monto'], 2);
        return [$nombre . ' — ' . $monto, cuando($p['fecha_limite'])];
    }) .
    seccion('Tareas', $tareas, function ($t) {
        $nombre = $t['titulo'] . ($t['responsable'] ? ' (' . $t['responsable'] . ')' : '');
        return [$nombre, cuando($t['fecha_limite'])];
    }) .
    seccion('Agenda', $agenda, function ($a) {
        $nombre = $a['titulo'] . ($a['lugar'] ? ' — ' . $a['lugar'] : '');
        return [$nombre, cuando($a['fecha'])];
    });

$diasParaLaFiesta = (int) (new DateTime('today'))
    ->diff(new DateTime('2026-10-24'))
    ->format('%r%a');

$html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0'
       style='max-width:560px;margin:0 auto;padding:32px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:28px;'>
    <h2 style='margin:0 0 4px;color:#8B4513;'>Recordatorio · Ania XV</h2>
    <p style='margin:0 0 8px;color:#888;font-size:13px;'>" . date('d/m/Y') . "</p>
    <p style='margin:0;color:#a07830;font-size:13px;'>
      Faltan $diasParaLaFiesta días para la fiesta.
    </p>
    $cuerpo
    <p style='margin:28px 0 0;font-size:13px;'>
      <a href='https://aniaxv.com/admin/' style='color:#8B4513;'>Abrir el panel</a>
    </p>
  </td></tr>
</table></body></html>";

$destinatarios = array_filter(array_map('trim',
    explode(',', env('CORREO_ADMINISTRADORA', 'info@aniaxv.com'))));

$correosEnviados = 0;
$erroresDeCorreo = [];

foreach ($destinatarios as $destino) {
    $resultado = enviarCorreo($destino, 'Recordatorio · Ania XV', $html);
    if ($resultado === true) $correosEnviados++;
    else $erroresDeCorreo[] = "$destino: $resultado";
}


/* ─── LOS AVISOS AL TELÉFONO ──────────────────────────────────────────── */

$push = avisarATodos();


/* ─── INFORME ─────────────────────────────────────────────────────────── */

terminar([
    'pagos'     => count($pagos),
    'tareas'    => count($tareas),
    'agenda'    => count($agenda),
    'correos'   => $correosEnviados,
    'errores_correo' => $erroresDeCorreo,
    'push'      => $push,
]);


/**
 * Termina, escribiendo el informe como toque según desde dónde se corrió.
 *
 * Desde el cron no hay navegador: se escribe en el log del servidor, que
 * es donde queda registro de que la tarea corrió.
 *
 * @param array $informe
 * @return void
 */
function terminar($informe) {
    global $desdeLaConsola;

    error_log('[Ania XV · recordatorios] ' . json_encode($informe, JSON_UNESCAPED_UNICODE));

    if ($desdeLaConsola) {
        echo json_encode($informe, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        exit;
    }
    responderBien($informe);
}
