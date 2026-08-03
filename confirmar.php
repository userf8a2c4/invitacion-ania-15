<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMAR.PHP, Versión SMTP SSL (Puerto 465)
   
   Flujo:
   1. Recibe JSON del formulario
   2. Guarda en MySQL
   3. Manda correo al invitado
   4. Manda correo a todos los administradores definidos en .env
   ══════════════════════════════════════════════════════════════════════ */

/* ─── LIBRERÍAS COMPARTIDAS CON EL PANEL ──────────────────────────────── */
/* La lectura del .env y la función smtpEnviar() vivían acá adentro. Se
   movieron a admin/api/_lib/ para que este archivo y el panel de
   administración usen exactamente el mismo código: si algún día hay que
   arreglar el envío de correo, se arregla en un solo lugar.

   El getenv() de más abajo sigue funcionando igual, porque entorno.php
   carga el .env con putenv() tal como se hacía antes. */
require_once __DIR__ . '/admin/api/_lib/entorno.php';
require_once __DIR__ . '/admin/api/_lib/correo.php';

cargarEntorno();

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

/* ─── EL CÓDIGO QR QUE YA DIBUJÓ LA WEB ──────────────────────────────── */
/* La invitación genera el QR del pase en el navegador y nos lo manda
   como imagen. Se incrusta tal cual en el correo, así el QR del mail y
   el de la pantalla son el MISMO por construcción: no hay forma de que
   queden distintos, que es lo que pasaría si el servidor lo generara
   por su cuenta con otra biblioteca.

   Se valida con desconfianza porque esto llega de afuera:
     · solo el formato "data:image/png;base64,…"
     · solo PNG, comprobando la firma de los primeros bytes
     · con un tope de tamaño, para que nadie mande un archivo enorme */
$qrPng = null;
$qrCrudo = (string) ($datos['qrPng'] ?? '');

if ($qrCrudo !== '' && strlen($qrCrudo) < 200000) {
    if (preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $qrCrudo, $coincide)) {
        $binario = base64_decode($coincide[1], true);

        // La firma de todo archivo PNG: \x89PNG\r\n\x1a\n
        if ($binario !== false && strncmp($binario, "\x89PNG\r\n\x1a\n", 8) === 0) {
            $qrPng = $binario;
        } else {
            error_log('[Ania XV] QR descartado: no es un PNG válido.');
        }
    }
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

    /* ─── SENTARLO SOLO EN UNA MESA ──────────────────────────────────
       Si el panel tiene prendido el acomodo automático, se le busca
       lugar apenas confirma, respetando su grupo y con quién no puede
       sentarse.

       ⚠️ TODO ESTO VA DENTRO DE UN try/catch PROPIO Y SILENCIOSO.
       Este archivo es el que hace que funcione la invitación: si algo
       del acomodo fallara —falta una tabla, no hay mesas, lo que sea—
       NO puede impedir que la confirmación se guarde ni que salgan los
       correos. En el peor caso el invitado queda sin mesa y se lo
       acomoda después desde el panel, que no es un problema. */
    if ($asiste) {
        try {
            $idNuevo = (int) $pdo->lastInsertId();

            $ajuste = $pdo->query(
                "SELECT valor FROM ajustes WHERE clave = 'auto_al_confirmar'"
            )->fetch(PDO::FETCH_ASSOC);

            if ($ajuste && $ajuste['valor'] === '1' && $idNuevo > 0) {
                require_once __DIR__ . '/admin/api/_lib/mesas.php';

                $donde = sentarAUnoSolo($idNuevo);
                error_log('[Ania XV] Mesa automática: ' .
                          json_encode($donde, JSON_UNESCAPED_UNICODE));
            }
        } catch (Throwable $e) {
            error_log('[Ania XV] No se pudo asignar mesa automática: ' . $e->getMessage());
        }
    }

} catch (PDOException $e) {
    $errorBD = $e->getMessage();
    error_log('[Ania XV] ❌ BD: ' . $errorBD);
}

/* ─── 2. ENVÍO SMTP ──────────────────────────────────────────────────── */
/* smtpEnviar() ya viene cargada desde admin/api/_lib/correo.php (arriba).
   Es la misma función de siempre, palabra por palabra; solo cambió de
   archivo. Sigue conectándose con SSL directo al puerto 465. */

/* ─── 3. HTML: CORREO AL INVITADO ────────────────────────────────────── */
$asistiTexto = $asiste ? 'Sí, asistiré con mucho gusto ✦' : 'Lamentablemente no podré asistir';

$htmlInvitado = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta http-equiv='Content-Language' content='es'></head>
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

    /* El QR, si la web lo mandó. src='cid:qrpase' apunta a la imagen que
       viaja adjunta dentro de este mismo correo, no a una web: así se ve
       aunque el lector bloquee las imágenes externas, que es lo que hacen
       Gmail y Outlook por defecto.

       El fondo blanco con padding no es decoración: un QR dorado sobre
       fondo oscuro no lo lee ningún teléfono. Necesita contraste alto y
       un margen en blanco alrededor. */
    (($asiste && $qrPng) ? "
    <table width='100%' cellpadding='0' cellspacing='0' style='margin-top:28px;'>
      <tr><td align='center'>
        <div style='background:#ffffff;padding:14px;border-radius:8px;display:inline-block;'>
          <img src='cid:qrpase' width='170' height='170' alt='Código QR de tu pase'
               style='display:block;width:170px;height:170px;'>
        </div>
        <p style='margin:10px 0 0;font-size:12px;color:#a07830;'>
          Mostrá este código en la entrada
        </p>
      </td></tr>
    </table>" : "") .

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
$htmlAdmin = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta http-equiv='Content-Language' content='es'></head>
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

// Correo al invitado. Solo este lleva el QR incrustado: es su pase.
$imagenesDelInvitado = ($asiste && $qrPng)
    ? [['cid' => 'qrpase', 'tipo' => 'image/png', 'datos' => $qrPng]]
    : [];

$r1 = smtpEnviar(
    $correo,
    $asiste ? "¡Tu confirmación está lista! ✦ Ania XV" : "Gracias por avisarnos · Ania XV",
    $htmlInvitado,
    $CORREO_FROM, 'Ania XV',
    $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS,
    '',                      // sin Reply-To distinto
    $imagenesDelInvitado
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