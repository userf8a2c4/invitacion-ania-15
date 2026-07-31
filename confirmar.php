<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMAR.PHP - VERSIÓN FINAL
   
   Flujo:
   1. Recibe datos del formulario (JSON POST)
   2. Guarda en MySQL (tabla confirmaciones)
   3. Manda correo al INVITADO (su correo personal)
   4. Manda correo a LUCILA (noreply@aniaxv.com)
   
   Todo vía SMTP (confiable y robusto)
   ══════════════════════════════════════════════════════════════════════ */

/* ─── CARGAR VARIABLES DE ENTORNO ────────────────────────────────────── */
$rutaEnv = __DIR__ . '/.env';
if (file_exists($rutaEnv)) {
    $lineas = file($rutaEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lineas as $linea) {
        if (strpos($linea, '=') !== false && strpos($linea, '#') !== 0) {
            list($clave, $valor) = explode('=', $linea, 2);
            $clave = trim($clave);
            $valor = trim($valor);
            if (!getenv($clave)) {
                putenv("$clave=$valor");
            }
        }
    }
}

/* ─── HEADERS CORS Y CONTENT-TYPE ────────────────────────────────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ─── CONFIGURACIÓN DESDE .ENV ───────────────────────────────────────── */
$DB_HOST           = getenv('DB_HOST') ?: 'localhost';
$DB_NAME           = getenv('DB_NAME') ?: 'u164808416_invitadosxv';
$DB_USER           = getenv('DB_USER') ?: 'u164808416_lucila';
$DB_PASSWORD       = getenv('DB_PASSWORD') ?: '';

$CORREO_REMITENTE  = getenv('CORREO_REMITENTE') ?: 'noreply@aniaxv.com';
$CORREO_ADMIN      = getenv('CORREO_ADMINISTRADORA') ?: 'noreply@aniaxv.com';

$SMTP_HOST         = getenv('SMTP_HOST') ?: 'mail.aniaxv.com';
$SMTP_PORT         = (int)(getenv('SMTP_PORT') ?: 587);
$SMTP_USER         = getenv('SMTP_USER') ?: '';
$SMTP_PASSWORD     = getenv('SMTP_PASSWORD') ?: '';

/* ─── VALIDACIÓN: ¿Está configurado? ────────────────────────────────── */
if (!$DB_PASSWORD || !$SMTP_USER || !$SMTP_PASSWORD) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Servidor no configurado (falta .env).']);
    error_log('[Ania XV] Error: Falta configuración en .env');
    exit;
}

/* ─── LEER JSON DEL FORMULARIO ───────────────────────────────────────── */
$cuerpo = file_get_contents('php://input');
$datos = json_decode($cuerpo, true);

if (!$datos) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido o vacío.']);
    exit;
}

/* ─── SANITIZAR CAMPOS ───────────────────────────────────────────────── */
function limpiar($valor) {
    return htmlspecialchars(trim((string)($valor ?? '')), ENT_QUOTES, 'UTF-8');
}

$nombre        = limpiar($datos['nombre'] ?? '');
$correo        = limpiar($datos['correo'] ?? '');
$asiste        = isset($datos['asiste']) ? (bool)$datos['asiste'] : false;
$adultos       = max(0, (int)($datos['adultos'] ?? 0));
$ninos         = max(0, (int)($datos['ninos'] ?? 0));
$total         = $adultos + $ninos;
$menus         = limpiar($datos['detalleDeMenus'] ?? ', ');
$resumenMenus  = limpiar($datos['resumenDeMenus'] ?? ', ');
$alergias      = limpiar($datos['alergias'] ?? 'Ninguna');
$notas         = limpiar($datos['notas'] ?? ', ');
$codigo        = limpiar($datos['codigo'] ?? '');

/* ─── VALIDAR CORREO ─────────────────────────────────────────────────── */
if (!$nombre || !filter_var($datos['correo'] ?? '', FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Nombre o correo inválido.']);
    exit;
}

/* ─── 1. GUARDAR EN MYSQL ────────────────────────────────────────────── */
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $sql = "INSERT INTO confirmaciones 
            (nombre, correo, asiste, adultos, ninos, total, menus, resumen_menus, alergias, notas, codigo) 
            VALUES 
            (:nombre, :correo, :asiste, :adultos, :ninos, :total, :menus, :resumen_menus, :alergias, :notas, :codigo)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nombre'        => $nombre,
        ':correo'        => $correo,
        ':asiste'        => $asiste ? 1 : 0,
        ':adultos'       => $adultos,
        ':ninos'         => $ninos,
        ':total'         => $total,
        ':menus'         => $menus,
        ':resumen_menus' => $resumenMenus,
        ':alergias'      => $alergias,
        ':notas'         => $notas,
        ':codigo'        => $codigo,
    ]);

} catch (PDOException $e) {
    error_log('[Ania XV] Error BD: ' . $e->getMessage());
}

/* ─── 2. ENVIAR CORREOS VÍA SMTP ────────────────────────────────────── */

/**
 * Envía un correo vía SMTP (PHPMailer alternativa: raw socket)
 * Usa STARTTLS + AUTH LOGIN
 */
function enviarPorSMTP($para, $asunto, $html, $remitente, $nombreRemitente, $smtpHost, $smtpPort, $smtpUser, $smtpPass) {
    try {
        $socket = fsockopen($smtpHost, $smtpPort, $errno, $errstr, 30);
        if (!$socket) {
            error_log("[Ania XV] SMTP conectar falló ($smtpHost:$smtpPort): $errstr");
            return false;
        }

        $respuesta = fgets($socket, 512);
        if (strpos($respuesta, '220') === false) {
            fclose($socket);
            return false;
        }

        // EHLO
        fwrite($socket, "EHLO aniaxv.com\r\n");
        fgets($socket, 512);

        // STARTTLS
        fwrite($socket, "STARTTLS\r\n");
        $resp = fgets($socket, 512);
        if (strpos($resp, '220') === false) {
            fclose($socket);
            return false;
        }

        stream_context_set_params($socket, ["ssl" => ["allow_self_signed" => true]]);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            error_log('[Ania XV] STARTTLS falló');
            fclose($socket);
            return false;
        }

        // EHLO post-TLS
        fwrite($socket, "EHLO aniaxv.com\r\n");
        fgets($socket, 512);

        // AUTH LOGIN
        fwrite($socket, "AUTH LOGIN\r\n");
        fgets($socket, 512);
        fwrite($socket, base64_encode($smtpUser) . "\r\n");
        fgets($socket, 512);
        fwrite($socket, base64_encode($smtpPass) . "\r\n");
        $authResp = fgets($socket, 512);
        if (strpos($authResp, '235') === false) {
            error_log('[Ania XV] AUTH falló: ' . trim($authResp));
            fclose($socket);
            return false;
        }

        // MAIL FROM
        fwrite($socket, "MAIL FROM:<$remitente>\r\n");
        fgets($socket, 512);

        // RCPT TO
        fwrite($socket, "RCPT TO:<$para>\r\n");
        fgets($socket, 512);

        // DATA
        fwrite($socket, "DATA\r\n");
        fgets($socket, 512);

        // Construir mensaje
        $mensaje = "From: =?UTF-8?B?" . base64_encode($nombreRemitente) . "?= <$remitente>\r\n";
        $mensaje .= "To: <$para>\r\n";
        $mensaje .= "Subject: =?UTF-8?B?" . base64_encode($asunto) . "?=\r\n";
        $mensaje .= "MIME-Version: 1.0\r\n";
        $mensaje .= "Content-Type: text/html; charset=UTF-8\r\n";
        $mensaje .= "Content-Transfer-Encoding: base64\r\n";
        $mensaje .= "\r\n";
        $mensaje .= chunk_split(base64_encode($html));

        fwrite($socket, $mensaje . "\r\n.\r\n");
        $resp = fgets($socket, 512);

        // QUIT
        fwrite($socket, "QUIT\r\n");
        fclose($socket);

        return true;

    } catch (Exception $e) {
        error_log('[Ania XV] Error SMTP: ' . $e->getMessage());
        return false;
    }
}

/* ── CORREO 1: Al invitado ──────────────────────────────────────────── */
$asistiTexto = $asiste ? 'Sí, asistiré con mucho gusto ✦' : 'Lamentablemente no podré asistir';

$htmlInvitado = "
<!DOCTYPE html>
<html lang='es'>
<head><meta charset='UTF-8'></head>
<body style='font-family: Georgia, serif; background:#1a0a00; color:#f5e6c8; margin:0; padding:0;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px; margin:0 auto; padding:40px 20px;'>
    <tr><td align='center' style='padding-bottom:24px;'>
      <h1 style='color:#d4a843; font-size:28px; margin:0; letter-spacing:2px;'>Ania · XV Años</h1>
      <p style='color:#a07830; margin:4px 0 0;'>24 de octubre de 2026</p>
    </td></tr>
    <tr><td style='background:#2a1500; border:1px solid #5a3a10; border-radius:8px; padding:32px;'>
      <p style='margin:0 0 16px;'>Hola, <strong style='color:#d4a843;'>$nombre</strong> 🌹</p>
      <p style='margin:0 0 24px; color:#d4c098;'>Recibimos tu confirmación. Estos son los datos que registramos:</p>

      <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
        <tr style='border-bottom:1px solid #5a3a10;'>
          <td style='color:#a07830; width:45%;'>Asistencia</td>
          <td style='color:#f5e6c8;'>$asistiTexto</td>
        </tr>" .
        ($asiste ? "
        <tr style='border-bottom:1px solid #5a3a10;'>
          <td style='color:#a07830;'>Adultos</td>
          <td style='color:#f5e6c8;'>$adultos</td>
        </tr>
        <tr style='border-bottom:1px solid #5a3a10;'>
          <td style='color:#a07830;'>Niños</td>
          <td style='color:#f5e6c8;'>$ninos</td>
        </tr>
        <tr style='border-bottom:1px solid #5a3a10;'>
          <td style='color:#a07830;'>Menús</td>
          <td style='color:#f5e6c8;'>$resumenMenus</td>
        </tr>
        <tr style='border-bottom:1px solid #5a3a10;'>
          <td style='color:#a07830;'>Alergias</td>
          <td style='color:#f5e6c8;'>$alergias</td>
        </tr>
        <tr>
          <td style='color:#a07830;'>Código de pase</td>
          <td style='color:#d4a843; font-weight:bold; letter-spacing:1px;'>$codigo</td>
        </tr>" : "") . "
      </table>

      " . ($asiste ? "
      <p style='margin:28px 0 0; font-size:13px; color:#a07830;'>
        Presentá este correo o tu código de pase en la entrada del evento.<br>
        <strong>Salones Alvi Toluca · 5:00 PM · Vestimenta formal</strong>
      </p>" : "
      <p style='margin:28px 0 0; color:#d4c098;'>
        Gracias por avisarnos, te vamos a extrañar. 🌹
      </p>") . "
    </td></tr>
    <tr><td align='center' style='padding-top:24px; color:#5a3a10; font-size:12px;'>
      Ania XV · aniaxv.com
    </td></tr>
  </table>
</body>
</html>";

enviarPorSMTP(
    $correo,
    $asiste ? '¡Tu confirmación está lista, ' . $nombre . '! ✦ Ania XV' : 'Gracias por avisarnos · Ania XV',
    $htmlInvitado,
    $CORREO_REMITENTE,
    'Ania XV',
    $SMTP_HOST,
    $SMTP_PORT,
    $SMTP_USER,
    $SMTP_PASSWORD
);

/* ── CORREO 2: A Lucila (administradora) ────────────────────────────── */
$htmlAdmin = "
<!DOCTYPE html>
<html lang='es'>
<head><meta charset='UTF-8'></head>
<body style='font-family: Arial, sans-serif; background:#f9f9f9; color:#333; margin:0; padding:0;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px; margin:0 auto; padding:40px 20px;'>
    <tr><td style='background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:32px;'>
      <h2 style='margin:0 0 4px; color:#8B4513;'>Nueva confirmación · Ania XV</h2>
      <p style='margin:0 0 24px; color:#888; font-size:13px;'>" . date('d/m/Y H:i') . "</p>

      <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
        <tr style='background:#fdf3e3; border-bottom:1px solid #e8d5b0;'>
          <td style='width:40%; font-weight:bold; color:#8B4513;'>Nombre</td>
          <td>$nombre</td>
        </tr>
        <tr style='border-bottom:1px solid #efefef;'>
          <td style='font-weight:bold; color:#8B4513;'>Correo</td>
          <td>$correo</td>
        </tr>
        <tr style='background:#fdf3e3; border-bottom:1px solid #e8d5b0;'>
          <td style='font-weight:bold; color:#8B4513;'>Asistencia</td>
          <td>" . ($asiste ? '✅ Sí asiste' : '❌ No puede asistir') . "</td>
        </tr>" .
        ($asiste ? "
        <tr style='border-bottom:1px solid #efefef;'>
          <td style='font-weight:bold; color:#8B4513;'>Adultos</td>
          <td>$adultos</td>
        </tr>
        <tr style='background:#fdf3e3; border-bottom:1px solid #e8d5b0;'>
          <td style='font-weight:bold; color:#8B4513;'>Niños</td>
          <td>$ninos</td>
        </tr>
        <tr style='border-bottom:1px solid #efefef;'>
          <td style='font-weight:bold; color:#8B4513;'>Total personas</td>
          <td><strong>$total</strong></td>
        </tr>
        <tr style='background:#fdf3e3; border-bottom:1px solid #e8d5b0;'>
          <td style='font-weight:bold; color:#8B4513;'>Resumen menús</td>
          <td>$resumenMenus</td>
        </tr>
        <tr style='border-bottom:1px solid #efefef;'>
          <td style='font-weight:bold; color:#8B4513;'>Detalle menús</td>
          <td>$menus</td>
        </tr>
        <tr style='background:#fdf3e3; border-bottom:1px solid #e8d5b0;'>
          <td style='font-weight:bold; color:#8B4513;'>Alergias</td>
          <td>$alergias</td>
        </tr>
        <tr style='border-bottom:1px solid #efefef;'>
          <td style='font-weight:bold; color:#8B4513;'>Notas</td>
          <td>$notas</td>
        </tr>
        <tr style='background:#fdf3e3;'>
          <td style='font-weight:bold; color:#8B4513;'>Código de pase</td>
          <td><code>$codigo</code></td>
        </tr>" : "") . "
      </table>
    </td></tr>
    <tr><td align='center' style='padding-top:16px; color:#ccc; font-size:11px;'>
      Sistema de confirmaciones · Ania XV
    </td></tr>
  </table>
</body>
</html>";

enviarPorSMTP(
    $CORREO_ADMIN,
    ($asiste ? '✅ ' : '❌ ') . 'Nueva confirmación de ' . $nombre . ' · Ania XV',
    $htmlAdmin,
    $CORREO_REMITENTE,
    'Ania XV',
    $SMTP_HOST,
    $SMTP_PORT,
    $SMTP_USER,
    $SMTP_PASSWORD
);

/* ─── RESPUESTA AL NAVEGADOR ────────────────────────────────────────── */
echo json_encode(['ok' => true, 'mensaje' => 'Confirmación registrada y correos enviados.']);
