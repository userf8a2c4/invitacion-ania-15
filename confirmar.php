<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMAR.PHP
   Recibe los datos del formulario de Ania XV vía POST (JSON),
   los guarda en MySQL y manda dos correos:
     1. Al invitado (comprobante)
     2. A Lucila (aviso de administrador)
   
   ✅ Usa variables de entorno (.env) en lugar de hardcodear credenciales
   ══════════════════════════════════════════════════════════════════════ */

/* ─── CARGAR VARIABLES DE ENTORNO ────────────────────────────────────
   Si existe .env en la raíz del proyecto, lo carga. En producción,
   Hostinger carga el .env automáticamente. */

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

/* ─── CORS: permite que el JS del sitio llame a este archivo ────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ─── LEER CONFIGURACIÓN DE VARIABLES DE ENTORNO ──────────────────── */

$DB_HOST     = getenv('DB_HOST')     ?: 'localhost';
$DB_NAME     = getenv('DB_NAME')     ?: 'u164808416_invitadosxv';
$DB_USER     = getenv('DB_USER')     ?: 'u164808416_lucila';
$DB_PASSWORD = getenv('DB_PASSWORD') ?: '';

$CORREO_REMITENTE      = getenv('CORREO_REMITENTE')      ?: 'noreply@aniaxv.com';
$NOMBRE_REMITENTE      = 'Ania XV';
$CORREO_ADMINISTRADORA = getenv('CORREO_ADMINISTRADORA') ?: 'blucila699@gmail.com';

/* ─── VALIDACIÓN: ¿Está todo configurado? ───────────────────────────── */
if (!$DB_PASSWORD) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Servidor no configurado (falta .env).']);
    exit;
}

/* ─── LEER EL CUERPO DE LA PETICIÓN ─────────────────────────────────── */
$cuerpo = file_get_contents('php://input');
$datos  = json_decode($cuerpo, true);

if (!$datos) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido o vacío.']);
    exit;
}

/* ─── SANITIZAR Y EXTRAER CAMPOS ─────────────────────────────────────
   Todos los campos de texto se limpian con htmlspecialchars para evitar
   que alguien inyecte HTML malicioso en los correos.                    */
function limpiar($valor) {
    return htmlspecialchars(trim((string)($valor ?? '')), ENT_QUOTES, 'UTF-8');
}

$nombre        = limpiar($datos['nombre']        ?? '');
$correo        = limpiar($datos['correo']        ?? '');
$asiste        = isset($datos['asiste']) ? (bool)$datos['asiste'] : false;
$adultos       = max(0, (int)($datos['adultos']  ?? 0));
$ninos         = max(0, (int)($datos['ninos']    ?? 0));
$total         = $adultos + $ninos;
$menus         = limpiar($datos['detalleDeMenus'] ?? ', ');
$resumenMenus  = limpiar($datos['resumenDeMenus'] ?? ', ');
$alergias      = limpiar($datos['alergias']       ?? 'Ninguna');
$notas         = limpiar($datos['notas']          ?? ', ');
$codigo        = limpiar($datos['codigo']         ?? '');

/* Validación mínima del correo */
if (!$nombre || !filter_var($datos['correo'] ?? '', FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Nombre o correo inválido.']);
    exit;
}

/* ─── 1. GUARDAR EN MYSQL ────────────────────────────────────────────── */
try {
    $conexion = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASSWORD
    );
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "INSERT INTO confirmaciones
              (nombre, correo, asiste, adultos, ninos, total,
               menus, resumen_menus, alergias, notas, codigo)
            VALUES
              (:nombre, :correo, :asiste, :adultos, :ninos, :total,
               :menus, :resumen_menus, :alergias, :notas, :codigo)";

    $stmt = $conexion->prepare($sql);
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
    /* Si la base de datos falla, igual intentamos mandar el correo
       para no dejar al invitado sin respuesta. Avisamos por log.    */
    error_log('[Ania XV] Error BD: ' . $e->getMessage());
}

/* ─── 2. ARMAR Y MANDAR LOS CORREOS ─────────────────────────────────── */

/**
 * Envía un correo usando mail() nativo de PHP.
 * Devuelve true si PHP lo aceptó (no garantiza entrega, pero es suficiente
 * para hosting compartido donde el servidor de correo es de confianza).
 */
function enviarCorreo($para, $asunto, $cuerpoHtml, $remitente, $nombreRemitente) {
    $cabeceras  = "MIME-Version: 1.0\r\n";
    $cabeceras .= "Content-Type: text/html; charset=UTF-8\r\n";
    $cabeceras .= "From: =?UTF-8?B?" . base64_encode($nombreRemitente) . "?= <$remitente>\r\n";
    $cabeceras .= "Reply-To: $remitente\r\n";
    $cabeceras .= "X-Mailer: PHP/" . phpversion();
    return mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $cuerpoHtml, $cabeceras);
}

/* ── Correo 1: Comprobante para el invitado ────────────────────────── */
$asistiTexto = $asiste ? 'Sí, asistiré con mucho gusto ✦' : 'Lamentablemente no podré asistir';

$correoInvitado = "
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

enviarCorreo(
    $correo,
    $asiste ? '¡Tu confirmación está lista, ' . $nombre . '! ✦ Ania XV' : 'Gracias por avisarnos · Ania XV',
    $correoInvitado,
    $CORREO_REMITENTE,
    $NOMBRE_REMITENTE
);

/* ── Correo 2: Aviso a Lucila (siempre, asista o no) ──────────────── */
$correoLucila = "
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
      Sistema de confirmaciones · Ania XV · aniaxv.com
    </td></tr>
  </table>
</body>
</html>";

enviarCorreo(
    $CORREO_ADMINISTRADORA,
    ($asiste ? '✅ ' : '❌ ') . 'Nueva confirmación de ' . $nombre . ' · Ania XV',
    $correoLucila,
    $CORREO_REMITENTE,
    $NOMBRE_REMITENTE
);

/* ─── RESPUESTA AL JS ────────────────────────────────────────────────── */
echo json_encode(['ok' => true, 'mensaje' => 'Confirmación registrada.']);
