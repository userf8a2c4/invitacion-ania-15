<?php
/* ══════════════════════════════════════════════════════════════════════
   CRON_RESPALDO.PHP · MANDAR UNA COPIA DE TODO POR CORREO

   QUÉ HACE ESTE ARCHIVO
   Una vez por semana arma un archivo con toda la información del evento
   y lo manda por correo a las administradoras.

   POR QUÉ HACE FALTA
   Hoy todo vive en una sola base de datos de un hosting compartido. Si
   esa base se pierde —un error al borrar algo, un problema del
   proveedor, una cuenta suspendida por falta de pago— se pierden los
   110 invitados, el presupuesto entero y el acomodo de las mesas, sin
   forma de recuperarlos.

   Un correo semanal con todo adentro cuesta nada y significa que lo peor
   que puede pasar es perder una semana de trabajo, no todo.

   POR QUÉ POR CORREO Y NO A UN SERVICIO EN LA NUBE
   Porque el correo ya funciona, no hay que crear cuentas en ningún lado,
   y las copias quedan en dos buzones distintos con su fecha. Para un
   evento familiar es la solución que menos puede fallar.

   CÓMO SE PROGRAMA EN HOSTINGER
     hPanel → Avanzado → Trabajos cron → Crear
     Comando:  php /home/USUARIO/domains/aniaxv.com/public_html/admin/api/cron_respaldo.php
     Cuándo:   una vez por semana, domingo a las 3 de la mañana
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';

$desdeLaConsola = (php_sapi_name() === 'cli');

if (!$desdeLaConsola && !llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
    responderMal('Llave incorrecta.', 403);
}


/* ─── QUÉ SE RESPALDA ─────────────────────────────────────────────────── */

/* Todo lo que sea información del evento. Quedan afuera a propósito:
     · sesiones e intentos_login → basura temporal
     · usuarios → tiene las contraseñas hasheadas; mandarlas por correo
       sería regalar el panel a cualquiera que lea ese buzón
     · archivos → solo la lista, no los archivos en sí (pesarían megas) */
$tablas = [
    'confirmaciones', 'preferencias_invitado', 'grupos_invitados',
    'incompatibilidades', 'mesas', 'asignacion_mesas',
    'categorias_gasto', 'gastos', 'pagos', 'padrinos', 'proveedores',
    'cotizaciones', 'cotizacion_items',
    'tareas', 'agenda', 'cronograma', 'alarmas', 'notas',
    'corte_honor', 'ensayos', 'asistencia_ensayos',
    'ceremonia', 'requisitos_ceremonia', 'musica', 'citas_arreglo',
    'tomas_foto', 'regalos', 'foraneos', 'archivos',
];

$respaldo = [
    'generado'   => date('Y-m-d H:i:s'),
    'sitio'      => 'aniaxv.com',
    'base'       => env('DB_NAME', ''),
];

$cuantasFilas = 0;
$resumen = [];

foreach ($tablas as $tabla) {
    if (!existeTabla($tabla)) continue;

    $filas = consultarTodo("SELECT * FROM `$tabla`");
    $respaldo['datos'][$tabla] = $filas;

    $cuantasFilas += count($filas);
    if (count($filas)) $resumen[$tabla] = count($filas);
}

if ($cuantasFilas === 0) {
    terminarRespaldo(['aviso' => 'No hay nada que respaldar todavía.']);
}


/* ─── ARMAR EL ARCHIVO ────────────────────────────────────────────────── */

$json = json_encode($respaldo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

/* Se manda como JSON y no como .sql porque el JSON se puede abrir y
   leer con cualquier cosa, incluso desde el teléfono, mientras que un
   volcado SQL solo sirve si alguien sabe restaurarlo. Y si algún día
   hay que restaurar, un JSON se convierte a lo que sea. */
$nombre = 'respaldo-ania-xv-' . date('Y-m-d') . '.json';


/* ─── EL CORREO ───────────────────────────────────────────────────────── */

$listaResumen = '';
foreach ($resumen as $tabla => $cuantas) {
    $listaResumen .= "<tr><td style='padding:4px 8px;border-bottom:1px solid #eee'>" .
                     htmlspecialchars($tabla, ENT_QUOTES, 'UTF-8') .
                     "</td><td style='padding:4px 8px;border-bottom:1px solid #eee;" .
                     "text-align:right'>$cuantas</td></tr>";
}

$peso = round(strlen($json) / 1024);

$html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0'
       style='max-width:520px;margin:0 auto;padding:32px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:28px;'>
    <h2 style='margin:0 0 4px;color:#8B4513;'>Respaldo semanal</h2>
    <p style='margin:0 0 16px;color:#888;font-size:13px;'>" . date('d/m/Y') . "</p>

    <p style='line-height:1.6;'>Adjunto va una copia completa de la
    información del evento: <strong>$cuantasFilas registros</strong>
    ($peso KB).</p>

    <p style='line-height:1.6;font-size:13px;color:#666;'>
    <strong>Guardá este correo.</strong> Si algún día se pierde la base de
    datos, esto es lo que permite recuperar todo. No hace falta que hagas
    nada con el archivo: solo que no borres el correo.</p>

    <table width='100%' style='border-collapse:collapse;font-size:13px;margin-top:16px;'>
      $listaResumen
    </table>
  </td></tr>
</table></body></html>";


/* ─── MANDARLO ────────────────────────────────────────────────────────── */

$destinatarios = array_filter(array_map('trim',
    explode(',', env('CORREO_ADMINISTRADORA', 'info@aniaxv.com'))));

$enviados = 0;
$errores = [];

foreach ($destinatarios as $destino) {
    $resultado = smtpEnviar(
        $destino,
        'Respaldo · Ania XV · ' . date('d/m/Y'),
        $html,
        env('CORREO_REMITENTE', 'info@aniaxv.com'),
        'Ania XV',
        env('SMTP_HOST', 'smtp.hostinger.com'),
        (int) env('SMTP_PORT', 465),
        env('SMTP_USER', ''),
        env('SMTP_PASSWORD', ''),
        '',
        [],
        // El archivo adjunto de verdad.
        [['nombre' => $nombre, 'tipo' => 'application/json', 'datos' => $json]]
    );

    if ($resultado === true) $enviados++;
    else $errores[] = "$destino: $resultado";
}

terminarRespaldo([
    'registros' => $cuantasFilas,
    'tablas'    => count($resumen),
    'peso_kb'   => $peso,
    'enviados'  => $enviados,
    'errores'   => $errores,
]);


/**
 * Termina, informando según desde dónde se corrió.
 *
 * @param array $informe
 * @return void
 */
function terminarRespaldo($informe) {
    global $desdeLaConsola;

    error_log('[Ania XV · respaldo] ' . json_encode($informe, JSON_UNESCAPED_UNICODE));

    if ($desdeLaConsola) {
        echo json_encode($informe, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        exit;
    }
    responderBien($informe);
}
