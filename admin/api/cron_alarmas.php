<?php
/* ══════════════════════════════════════════════════════════════════════
   CRON_ALARMAS.PHP · HACER SONAR LAS ALARMAS

   QUÉ HACE ESTE ARCHIVO
   Revisa si hay alguna alarma cuya hora ya llegó, y avisa por correo y
   por notificación.

   CÓMO SE PROGRAMA EN HOSTINGER
     hPanel → Avanzado → Trabajos cron → Crear
     Comando:  php /home/USUARIO/domains/aniaxv.com/public_html/admin/api/cron_alarmas.php
     Cuándo:   cada 10 minutos  (minuto: */10)

   POR QUÉ CADA 10 MINUTOS Y NO CADA MINUTO
   Porque una alarma que suena hasta diez minutos tarde sigue sirviendo,
   y correr un proceso PHP cada sesenta segundos en un hosting compartido
   es la clase de cosa que hace que te suspendan la cuenta. Diez minutos
   es el punto donde la alarma sigue siendo útil y el servidor no sufre.

   POR QUÉ NO ESTÁ JUNTO CON cron_recordatorios.php
   Ese manda el resumen diario y tiene que correr UNA vez al día: si
   corriera cada diez minutos, mandaría el mismo correo 144 veces. Son
   dos trabajos distintos con dos frecuencias distintas.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';
require_once __DIR__ . '/_lib/push.php';

$desdeLaConsola = (php_sapi_name() === 'cli');

if (!$desdeLaConsola && !llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
    responderMal('Llave incorrecta.', 403);
}

if (!existeTabla('alarmas')) {
    terminarAlarmas(['aviso' => 'Todavía no existe la tabla de alarmas.']);
}


/* ─── CUÁLES TIENEN QUE SONAR ─────────────────────────────────────────── */

/* Las que ya pasaron su hora y no sonaron.
 *
 * El margen de 6 horas hacia atrás evita dos problemas: que una alarma
 * se pierda para siempre si el cron no corrió (por un corte del
 * servidor), y que una alarma de hace tres semanas suene de golpe
 * cuando se restablezca. Seis horas es el punto donde todavía sirve
 * enterarse y ya no molesta. */
$pendientes = consultarTodo(
    'SELECT * FROM alarmas
     WHERE activa = 1
       AND sonada_en IS NULL
       AND cuando <= NOW()
       AND cuando >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
     ORDER BY cuando
     LIMIT 20'
);

if (!$pendientes) {
    terminarAlarmas(['sonaron' => 0, 'aviso' => 'Nada que hacer sonar ahora.']);
}


/* ─── HACERLAS SONAR ──────────────────────────────────────────────────── */

$destinatarios = array_filter(array_map('trim',
    explode(',', env('CORREO_ADMINISTRADORA', 'info@aniaxv.com'))));

$sonaron = 0;
$errores = [];
$hayQueAvisarPorPush = false;

foreach ($pendientes as $alarma) {

    /* ─── Correo ─────────────────────────────────────────────────────── */
    if ((int) $alarma['por_correo'] === 1) {
        $html = plantillaDeAlarma($alarma);

        foreach ($destinatarios as $destino) {
            $resultado = enviarCorreo($destino, '⏰ ' . $alarma['titulo'], $html);
            if ($resultado !== true) $errores[] = "$destino: $resultado";
        }
    }

    if ((int) $alarma['por_push'] === 1) $hayQueAvisarPorPush = true;

    /* ─── Marcarla y, si repite, reprogramarla ───────────────────────── */
    $siguiente = proximaVez($alarma['cuando'], $alarma['repetir']);

    if ($siguiente) {
        // Las que repiten se corren a la próxima y quedan listas de nuevo.
        actualizar('alarmas', (int) $alarma['id'], [
            'cuando'    => $siguiente,
            'sonada_en' => null,
        ]);
    } else {
        // Las de una sola vez quedan marcadas y no vuelven a sonar.
        actualizar('alarmas', (int) $alarma['id'], [
            'sonada_en' => date('Y-m-d H:i:s'),
            'activa'    => 0,
        ]);
    }

    $sonaron++;
}

/* Un solo aviso al teléfono aunque hayan sonado varias alarmas: el push
   va vacío y el Service Worker pregunta qué mostrar, así que mandar
   cinco produciría cinco notificaciones casi iguales. */
$push = ['enviados' => 0];
if ($hayQueAvisarPorPush) $push = avisarATodos();

terminarAlarmas([
    'sonaron' => $sonaron,
    'push'    => $push,
    'errores' => $errores,
]);


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Cuándo tiene que volver a sonar una alarma que repite.
 *
 * Se calcula desde la hora ORIGINAL y no desde ahora, para que una
 * alarma semanal de los lunes a las 9 siga cayendo los lunes a las 9
 * aunque el cron la haya disparado a las 9:07.
 *
 * @param string $cuando  La hora que acaba de sonar.
 * @param string $repetir
 * @return string|null null si no repite.
 */
function proximaVez($cuando, $repetir) {
    $base = strtotime($cuando);
    if (!$base) return null;

    switch ($repetir) {
        case 'diaria':   $proxima = strtotime('+1 day', $base);   break;
        case 'semanal':  $proxima = strtotime('+1 week', $base);  break;
        case 'mensual':  $proxima = strtotime('+1 month', $base); break;
        default: return null;
    }

    /* Si el cron estuvo caído varios días, una alarma diaria tendría su
       próxima vez todavía en el pasado y volvería a sonar en el mismo
       ciclo. Se adelanta hasta que quede en el futuro. */
    $vueltas = 0;
    while ($proxima <= time() && $vueltas < 500) {
        $proxima = strtotime(
            $repetir === 'diaria' ? '+1 day' :
            ($repetir === 'semanal' ? '+1 week' : '+1 month'),
            $proxima
        );
        $vueltas++;
    }

    return date('Y-m-d H:i:s', $proxima);
}

/**
 * El HTML del correo de una alarma.
 *
 * @param array $alarma
 * @return string
 */
function plantillaDeAlarma($alarma) {
    $titulo  = htmlspecialchars($alarma['titulo'], ENT_QUOTES, 'UTF-8');
    $detalle = htmlspecialchars($alarma['detalle'], ENT_QUOTES, 'UTF-8');
    $hora    = date('d/m/Y · H:i', strtotime($alarma['cuando']));

    return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0'
       style='max-width:520px;margin:0 auto;padding:32px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:28px;'>
    <p style='margin:0 0 4px;color:#a07830;font-size:13px;'>Recordatorio · Ania XV</p>
    <h2 style='margin:0 0 8px;color:#8B4513;'>$titulo</h2>
    <p style='margin:0 0 16px;color:#888;font-size:13px;'>$hora</p>" .
    ($detalle !== ''
      ? "<p style='margin:0 0 16px;line-height:1.6;'>$detalle</p>"
      : '') .
    "<p style='margin:20px 0 0;font-size:13px;'>
      <a href='https://aniaxv.com/admin/' style='color:#8B4513;'>Abrir el panel</a>
    </p>
  </td></tr>
</table></body></html>";
}

/**
 * Termina, informando según desde dónde se corrió.
 *
 * @param array $informe
 * @return void
 */
function terminarAlarmas($informe) {
    global $desdeLaConsola;

    error_log('[Ania XV · alarmas] ' . json_encode($informe, JSON_UNESCAPED_UNICODE));

    if ($desdeLaConsola) {
        echo json_encode($informe, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        exit;
    }
    responderBien($informe);
}
