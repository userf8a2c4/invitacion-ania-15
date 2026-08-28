<?php
/* ══════════════════════════════════════════════════════════════════════
   INVITACION.PHP · EL LINK PERSONAL DE UN GRUPO (?i=TOKEN)

   QUÉ HACE ESTE ARCHIVO
   Con el token de su link, un grupo ve su invitación: cuántos lugares
   tiene, si ya respondió, y —si el admin cargó nombres— quiénes lo
   integran. Es de SOLO LECTURA: guardar la respuesta lo sigue haciendo
   confirmar.php (con el mismo token), igual que ya hacía para el
   formulario abierto.

   POR QUÉ ES UN ARCHIVO APARTE Y NO UNA ACCIÓN DE confirmar.php
   confirmar.php recibe y guarda; esto solo lee. Mantenerlos separados
   evita que un archivo que existe para GUARDAR datos del público
   también sea el que los expone.

   ⚠️ MISMO CUIDADO QUE mi-pase.php: es público, cualquiera puede abrirlo.
     1. Hace falta el token exacto (16 hex, generado con random_bytes en
        el servidor — no es adivinable como el código viejo del navegador).
     2. Freno de intentos por IP, misma tabla `intentos_login` que ya usa
        confirmar.php y mi-pase.php, con su propia marca.
     3. Un token, una invitación. Nunca se lista nada de nadie más.
     4. Conexión PDO propia (no la de admin/api/_lib/bd.php): mismo
        motivo documentado en confirmar.php — bd() tiene defaults de
        DB_NAME/DB_USER que en un ambiente de pruebas (PBE) podrían
        apuntar calladamente a la base equivocada. Acá, sin respaldo.

   QUÉ SE LE PUEDE PEDIR
     GET ?accion=ver&token=X
       → {nombre, pases, estado, ya_respondio, asiste, adultos, ninos,
          resumen_menus, alergias, personas:[{id,nombre,tipo,menu}]}
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/admin/api/_lib/entorno.php';
cargarEntorno();

/* ─── CORS (mismo criterio que confirmar.php) ─────────────────────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

function responderMalPublico($mensaje, $codigo = 400) {
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    responderMalPublico('Método no permitido.', 405);
}

if (($_GET['accion'] ?? '') !== 'ver') {
    responderMalPublico('Acción no reconocida.', 404);
}

/* ─── CONEXIÓN PROPIA, SIN RESPALDO PARA NOMBRE/USUARIO DE BASE ──────── */
$DB_HOST     = getenv('DB_HOST')     ?: 'localhost';
$DB_NAME     = getenv('DB_NAME')     ?: '';
$DB_USER     = getenv('DB_USER')     ?: '';
$DB_PASSWORD = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (PDOException $e) {
    error_log('[Ania XV · invitacion.php] No se pudo conectar: ' . $e->getMessage());
    responderMalPublico('No se pudo cargar tu invitación ahora. Intenta de nuevo en un rato.', 500);
}

/* ─── FRENO POR IP (mismo patrón que confirmar.php/mi-pase.php) ──────── */
$ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
const MARCA_DE_FRENO = '__invitacion__';
const INTENTOS_MAXIMOS = 15;
const FRENO_EN_MINUTOS = 20;

try {
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo = :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)'
    );
    $stmt->execute([':ip' => $ip, ':marca' => MARCA_DE_FRENO, ':min' => FRENO_EN_MINUTOS]);
    $conteo = (int) ($stmt->fetch()['n'] ?? 0);
    if ($conteo >= INTENTOS_MAXIMOS) {
        responderMalPublico('Demasiados intentos. Espera un rato.', 429);
    }
} catch (PDOException $e) {
    // Si el freno mismo falla (tabla vieja, etc.), no debe tumbar la
    // consulta real — se deja pasar y se anota para revisar después.
    error_log('[Ania XV · invitacion.php] Freno no disponible: ' . $e->getMessage());
}

/* ─── BUSCAR LA INVITACIÓN ────────────────────────────────────────────── */
$token = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($_GET['token'] ?? '')));

if ($token === '' || strlen($token) < 8) {
    responderMalPublico('Ese link no es válido.', 400);
}

try {
    $stmt = $pdo->prepare(
        'SELECT i.id, i.nombre, i.correo, i.pases, i.estado, i.confirmacion_id,
                c.asiste, c.adultos, c.ninos, c.resumen_menus, c.alergias
         FROM invitaciones i
         LEFT JOIN confirmaciones c ON c.id = i.confirmacion_id
         WHERE i.token = :t LIMIT 1'
    );
    $stmt->execute([':t' => $token]);
    $inv = $stmt->fetch();
} catch (PDOException $e) {
    error_log('[Ania XV · invitacion.php] Error al buscar: ' . $e->getMessage());
    responderMalPublico('No se pudo cargar tu invitación ahora. Intenta de nuevo en un rato.', 500);
}

if (!$inv) {
    // Mismo mensaje genérico que un token válido con datos vacíos no
    // podría dar, para no revelar si el token existe o no. Se anota
    // igual que un intento fallido, como hacen confirmar.php/mi-pase.php.
    try {
        $pdo->prepare('INSERT INTO intentos_login (ip, correo) VALUES (:ip, :marca)')
            ->execute([':ip' => $ip, ':marca' => MARCA_DE_FRENO]);
    } catch (PDOException $e) { /* el freno es best-effort */ }

    responderMalPublico('No encontramos esa invitación.', 404);
}

/* ─── PERSONAS DEL GRUPO (opcional) ───────────────────────────────────── */
$personas = [];
if ($inv['confirmacion_id']) {
    try {
        $stmtP = $pdo->prepare(
            'SELECT id, nombre, tipo, menu FROM acompanantes WHERE confirmacion_id = :c ORDER BY id ASC'
        );
        $stmtP->execute([':c' => $inv['confirmacion_id']]);
        $personas = $stmtP->fetchAll();
    } catch (PDOException $e) {
        error_log('[Ania XV · invitacion.php] No se pudieron leer las personas: ' . $e->getMessage());
    }
}

/* ─── FECHA LÍMITE (mismo ajuste que usa admin/api/invitaciones.php) ── */
$fechaLimiteIso = '2026-10-01';
try {
    $stmtF = $pdo->prepare("SELECT valor FROM ajustes WHERE clave = 'fecha_limite_confirmar' LIMIT 1");
    $stmtF->execute();
    $filaF = $stmtF->fetch();
    $valorF = trim((string) ($filaF['valor'] ?? ''));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $valorF)) $fechaLimiteIso = $valorF;
} catch (PDOException $e) { /* tabla ajustes puede no existir todavía; se usa el respaldo */ }

$yaRespondio = in_array($inv['estado'], ['confirmada', 'declinada'], true);
$yaPaso = date('Y-m-d') > $fechaLimiteIso;
// Cerrado = ya respondió Y ya pasó la fecha. Una respuesta tardía pero
// PRIMERA sí se acepta (ver la nota grande en confirmar.php) — lo que
// se cierra es la EDICIÓN, no la posibilidad de contestar por primera vez.
$cerrado = $yaRespondio && $yaPaso;

echo json_encode([
    'ok'                => true,
    'nombre'            => $inv['nombre'],
    'correo'            => (string) ($inv['correo'] ?? ''),
    'pases'             => (int) $inv['pases'],
    'estado'            => $inv['estado'],
    'ya_respondio'      => $yaRespondio,
    'cerrado'           => $cerrado,
    'asiste'            => $inv['asiste'] !== null ? (int) $inv['asiste'] === 1 : true,
    'adultos'           => (int) ($inv['adultos'] ?? $inv['pases']),
    'ninos'             => (int) ($inv['ninos'] ?? 0),
    'resumen_menus'     => (string) ($inv['resumen_menus'] ?? ''),
    'alergias'          => (string) ($inv['alergias'] ?? ''),
    'personas'          => $personas,
], JSON_UNESCAPED_UNICODE);
