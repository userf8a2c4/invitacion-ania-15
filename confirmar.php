<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMAR.PHP, Versión SMTP SSL (Puerto 465)
   
   Flujo:
   1. Recibe JSON del formulario
   2. Guarda en MySQL
   3. Manda correo al invitado
   4. Manda correo a todos los administradores definidos en .env
   ══════════════════════════════════════════════════════════════════════ */

/* ─── CARGAR .ENV ─────────────────────────────────────────────────────── */
$rutaEnv = __DIR__ . '/.env';
if (file_exists($rutaEnv)) {
    foreach (file($rutaEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        if (strpos($linea, '=') !== false && $linea[0] !== '#') {
            [$clave, $valor] = explode('=', $linea, 2);
            putenv(trim($clave) . '=' . trim($valor));
        }
    }
}

/* ─── CORS ────────────────────────────────────────────────────────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

/* ─── CONFIGURACIÓN ───────────────────────────────────────────────────── */
$DB_HOST      = getenv('DB_HOST')      ?: 'localhost';
$DB_NAME      = getenv('DB_NAME')      ?: 'u164808416_invitadosxv';
$DB_USER      = getenv('DB_USER')      ?: 'u164808416_lucila';
$DB_PASSWORD  = getenv('DB_PASSWORD')  ?: '';

$SMTP_HOST    = getenv('SMTP_HOST')    ?: 'smtp.hostinger.com';
$SMTP_PORT    = (int)(getenv('SMTP_PORT') ?: 465); // Forzado a 465 en el código de conexión
$SMTP_USER    = getenv('SMTP_USER')    ?: '';   
$SMTP_PASS    = getenv('SMTP_PASSWORD') ?: '';

/* El buzón info@aniaxv.com es el único que existe de verdad en Hostinger,
   por eso es el que firma los envíos. noreply@aniaxv.com nunca se creó. */
$CORREO_FROM  = getenv('CORREO_REMITENTE')      ?: 'info@aniaxv.com';
$CORREO_ADMIN = getenv('CORREO_ADMINISTRADORA') ?: 'info@aniaxv.com,blucila699@gmail.com';

/* ─── LEER JSON ───────────────────────────────────────────────────────── */
$datos = json_decode(file_get_contents('php://input'), true);
if (!$datos) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'JSON inválido']); exit; }

/* ─── SANITIZAR ───────────────────────────────────────────────────────── */
function limpiar($v) { return htmlspecialchars(trim((string)($v ?? '')), ENT_QUOTES, 'UTF-8'); }

$nombre       = limpiar($datos['nombre'] ?? '');
$correo       = limpiar($datos['correo'] ?? '');
$asiste       = (bool)($datos['asiste'] ?? false);
$adultos      = max(0, (int)($datos['adultos'] ?? 0));
$ninos        = max(0, (int)($datos['ninos'] ?? 0));
$total        = $adultos + $ninos;
$menus        = limpiar($datos['detalleDeMenus'] ?? ', ');
$resumenMenus = limpiar($datos['resumenDeMenus'] ?? ', ');
$alergias     = limpiar($datos['alergias'] ?? 'Ninguna');
$notas        = limpiar($datos['notas'] ?? ', ');
$codigo       = limpiar($datos['codigo'] ?? '');

if (!$nombre || !filter_var($datos['correo'] ?? '', FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'Nombre o correo inválido.']);
    exit;
}

/* ─── 1. GUARDAR EN MYSQL ─────────────────────────────────────────────── */
$errorBD = null;
try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->prepare("INSERT INTO confirmaciones
        (nombre,correo,asiste,adultos,ninos,total,menus,resumen_menus,alergias,notas,codigo)
        VALUES(:nombre,:correo,:asiste,:adultos,:ninos,:total,:menus,:resumen_menus,:alergias,:notas,:codigo)")
    ->execute([
        ':nombre'=>$nombre, ':correo'=>$correo, ':asiste'=>$asiste?1:0,
        ':adultos'=>$adultos, ':ninos'=>$ninos, ':total'=>$total,
        ':menus'=>$menus, ':resumen_menus'=>$resumenMenus,
        ':alergias'=>$alergias, ':notas'=>$notas, ':codigo'=>$codigo,
    ]);
    error_log('[Ania XV] ✅ BD: fila guardada para ' . $nombre);
} catch (PDOException $e) {
    $errorBD = $e->getMessage();
    error_log('[Ania XV] ❌ BD: ' . $errorBD);
}

/* ─── 2. ENVÍO SMTP MANUAL (SSL Directo - Puerto 465) ───────────────── */

function smtpEnviar($para, $asunto, $html, $from, $fromNombre, $host, $port, $user, $pass) {
    $log = [];

    // Conexión SSL directa
    $remoteHost = ($port === 465) ? "ssl://{$host}" : $host;
    $sock = @fsockopen($remoteHost, $port, $errno, $errstr, 15);
    if (!$sock) {
        return "No se pudo conectar a $remoteHost:$port, $errstr ($errno)";
    }

    $leer = function() use ($sock, &$log) {
        $buf = '';
        while (!feof($sock)) {
            $line = fgets($sock, 512);
            $buf .= $line;
            $log[] = '< ' . trim($line);
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return $buf;
    };

    $cmd = function($texto) use ($sock, $leer, &$log) {
        $log[] = '> ' . trim($texto);
        fwrite($sock, $texto . "\r\n");
        return $leer();
    };

    $r = $leer(); 
    if (strpos($r, '220') === false) { fclose($sock); return "220 no recibido: $r"; }

    $r = $cmd("EHLO aniaxv.com");

    $r = $cmd("AUTH LOGIN");
    if (strpos($r, '334') === false) { fclose($sock); return "AUTH LOGIN no aceptado: $r"; }

    $r = $cmd(base64_encode($user));
    if (strpos($r, '334') === false) { fclose($sock); return "Usuario no aceptado: $r"; }

    $r = $cmd(base64_encode($pass));
    if (strpos($r, '235') === false) { fclose($sock); return "Contraseña rechazada: $r"; }

    $r = $cmd("MAIL FROM:<$from>");
    if (strpos($r, '250') === false) { fclose($sock); return "MAIL FROM rechazado: $r"; }

    $r = $cmd("RCPT TO:<$para>");
    if (strpos($r, '250') === false) { fclose($sock); return "RCPT TO rechazado: $r"; }

    $r = $cmd("DATA");
    if (strpos($r, '354') === false) { fclose($sock); return "DATA rechazado: $r"; }

    $fromEnc    = '=?UTF-8?B?' . base64_encode($fromNombre) . '?=';
    $asuntoEnc  = '=?UTF-8?B?' . base64_encode($asunto) . '?=';
    $cuerpoB64  = chunk_split(base64_encode($html));

    $msg  = "From: $fromEnc <$from>\r\n";
    $msg .= "To: <$para>\r\n";
    $msg .= "Subject: $asuntoEnc\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n";
    $msg .= "\r\n" . $cuerpoB64;

    fwrite($sock, $msg . "\r\n.\r\n");
    $r = $leer();
    if (strpos($r, '250') === false) { fclose($sock); return "Mensaje rechazado: $r"; }

    $cmd("QUIT");
    fclose($sock);

    error_log('[Ania XV] SMTP log: ' . implode(' | ', $log));
    return true;
}

/* ─── 3. HTML: CORREO AL INVITADO ────────────────────────────────────── */
$asistiTexto = $asiste ? 'Sí, asistiré con mucho gusto ✦' : 'Lamentablemente no podré asistir';

$htmlInvitado = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Georgia,serif;background:#1a0a00;color:#f5e6c8;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px;margin:0 auto;padding:40px 20px;'>
  <tr><td align='center' style='padding-bottom:24px;'>
    <h1 style='color:#d4a843;font-size:28px;margin:0;letter-spacing:2px;'>Ania · XV Años</h1>
    <p style='color:#a07830;margin:4px 0 0;'>24 de octubre de 2026</p>
  </td></tr>
  <tr><td style='background:#2a1500;border:1px solid #5a3a10;border-radius:8px;padding:32px;'>
    <p style='margin:0 0 16px;'>Hola, <strong style='color:#d4a843;'>$nombre</strong> 🌹</p>
    <p style='margin:0 0 24px;color:#d4c098;'>Recibimos tu confirmación:</p>
    <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
      <tr style='border-bottom:1px solid #5a3a10;'>
        <td style='color:#a07830;width:45%;'>Asistencia</td>
        <td style='color:#f5e6c8;'>$asistiTexto</td>
      </tr>" .
      ($asiste ? "
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Adultos</td><td>$adultos</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Niños</td><td>$ninos</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Menús</td><td>$resumenMenus</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Alergias</td><td>$alergias</td></tr>
      <tr><td style='color:#a07830;'>Código de pase</td>
          <td style='color:#d4a843;font-weight:bold;letter-spacing:1px;'>$codigo</td></tr>" : "") . "
    </table>" .
    ($asiste ? "
    <p style='margin:28px 0 0;font-size:13px;color:#a07830;'>
      Presentá este correo o tu código en la entrada.<br>
      <strong>Salones Alvi Toluca · 5:00 PM · Vestimenta formal</strong>
    </p>" : "
    <p style='margin:28px 0 0;color:#d4c098;'>Gracias por avisarnos, te vamos a extrañar. 🌹</p>") . "
  </td></tr>
  <tr><td align='center' style='padding-top:24px;color:#5a3a10;font-size:12px;'>Ania XV · aniaxv.com</td></tr>
</table></body></html>";

/* ─── 4. HTML: CORREO A LA ADMINISTRADORA ────────────────────────────── */
$htmlAdmin = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px;margin:0 auto;padding:40px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:32px;'>
    <h2 style='margin:0 0 4px;color:#8B4513;'>Nueva confirmación · Ania XV</h2>
    <p style='margin:0 0 24px;color:#888;font-size:13px;'>" . date('d/m/Y H:i') . "</p>
    <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='width:40%;font-weight:bold;color:#8B4513;'>Nombre</td><td>$nombre</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Correo</td><td>$correo</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Asistencia</td>
        <td>" . ($asiste ? '✅ Sí asiste' : '❌ No puede asistir') . "</td></tr>" .
      ($asiste ? "
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Adultos</td><td>$adultos</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Niños</td><td>$ninos</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Total</td><td><strong>$total</strong></td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Resumen</td><td>$resumenMenus</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Detalle</td><td>$menus</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Alergias</td><td>$alergias</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Notas</td><td>$notas</td></tr>
      <tr style='background:#fdf3e3;'>
        <td style='font-weight:bold;color:#8B4513;'>Código</td><td><code>$codigo</code></td></tr>" : "") . "
    </table>
  </td></tr>
</table></body></html>";

/* ─── 5. ENVIAR CORREOS Y REGISTRAR RESULTADO ────────────────────────── */
$errores = [];

// Correo al invitado
$r1 = smtpEnviar(
    $correo,
    $asiste ? "¡Tu confirmación está lista! ✦ Ania XV" : "Gracias por avisarnos · Ania XV",
    $htmlInvitado,
    $CORREO_FROM, 'Ania XV',
    $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS
);
if ($r1 !== true) {
    $errores[] = "Correo al invitado: $r1";
    error_log('[Ania XV] ❌ Correo invitado: ' . $r1);
} else {
    error_log('[Ania XV] ✅ Correo enviado a: ' . $correo);
}

// Correo a las administradoras (Procesar múltiples correos)
$listaAdmins = array_map('trim', explode(',', $CORREO_ADMIN));

foreach ($listaAdmins as $adminEmail) {
    if (empty($adminEmail)) continue;

    $r2 = smtpEnviar(
        $adminEmail,
        ($asiste ? '✅ ' : '❌ ') . "Confirmación de $nombre · Ania XV",
        $htmlAdmin,
        $CORREO_FROM, 'Ania XV',
        $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS
    );
    
    if ($r2 !== true) {
        $errores[] = "Correo admin ($adminEmail): $r2";
        error_log("[Ania XV] ❌ Correo admin ($adminEmail): $r2");
    } else {
        error_log("[Ania XV] ✅ Correo enviado a admin: $adminEmail");
    }
}

/* ─── 6. RESPUESTA JSON REAL ──────────────────────────────────────────── */
if (empty($errores)) {
    echo json_encode(['ok' => true, 'mensaje' => 'Confirmación registrada y correos enviados.']);
} else {
    // La BD se guardó igual. Los correos fallaron, reportamos el error real.
    http_response_code(207); // Multi-status: algo funcionó, algo no
    echo json_encode([
        'ok'      => false,
        'bdOk'    => ($errorBD === null),
        'errores' => $errores,
    ]);
}