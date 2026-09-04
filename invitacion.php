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

/* ⚡ EL FRENO ESTABA CORTANDO INVITADOS DE VERDAD (2026-09-03)
 *
 * Eran 15 cargas cada 20 minutos por IP, contando TODAS las cargas —
 * también las que encontraban la invitación. Dos problemas:
 *
 *   · Detrás del CGNAT de un operador móvil, o del wifi de una casa,
 *     varias familias comparten la misma IP. Quince cargas entre todas
 *     se agotan en una tarde.
 *   · Una misma persona abre su link, lo cierra, lo vuelve a abrir para
 *     enseñárselo a alguien, entra desde el buscador de WhatsApp… son
 *     cargas legítimas, y cada una gastaba una.
 *
 * Este freno existe para que nadie pruebe tokens al azar. Un token
 * VÁLIDO no es un intento de adivinar nada: no tiene por qué gastar
 * cuota. Ahora solo cuentan las consultas que NO encontraron
 * invitación, que son las únicas que un atacante genera — y el tope
 * sube, porque con solo los fallos, 30 en veinte minutos ya es
 * clarísimamente alguien probando.
 */
const INTENTOS_MAXIMOS = 30;
const FRENO_EN_MINUTOS = 20;

try {
    // ⚡ (2026-08-28) INTERVAL no acepta un placeholder salvo que PDO
    // emule los prepares (comportamiento por defecto, pero no garantizado
    // para siempre): si alguien lo desactiva, este prepare() lanza y el
    // freno cae en silencio al catch de abajo, quedando desactivado sin
    // que nadie lo note. FRENO_EN_MINUTOS es una constante fija de este
    // archivo (nunca input del usuario), así que interpolarla es seguro.
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo = :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL ' . FRENO_EN_MINUTOS . ' MINUTE)'
    );
    $stmt->execute([':ip' => $ip, ':marca' => MARCA_DE_FRENO]);
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

/* ⚡ SOLO CUENTAN LAS CONSULTAS QUE NO ENCONTRARON NADA (2026-09-03)
 *
 * El 2026-08-28 este INSERT se sacó del `if (!$inv)` para que un token
 * filtrado no se pudiera consultar sin límite. El remedio salió peor que
 * la enfermedad: pasó a gastarle cuota a los invitados de verdad, que
 * comparten IP entre ellos (ver la nota del tope, más arriba).
 *
 * El caso que se quería cubrir —alguien recarga mil veces un token
 * válido que se filtró— no es el que hay que frenar acá: quien tiene el
 * token ya tiene todo lo que ese token muestra, recargar no le da nada
 * nuevo. Lo que sí hay que frenar es la búsqueda a ciegas, y ésa siempre
 * falla. Vuelve adentro del `if`.
 */
if (!$inv) {
    try {
        $pdo->prepare('INSERT INTO intentos_login (ip, correo) VALUES (:ip, :marca)')
            ->execute([':ip' => $ip, ':marca' => MARCA_DE_FRENO]);
    } catch (PDOException $e) { /* el freno es best-effort */ }

    // Mismo mensaje genérico que un token válido con datos vacíos no
    // podría dar, para no revelar si el token existe o no.
    responderMalPublico('No encontramos esa invitación.', 404);
}

/* ─── PERSONAS DEL GRUPO (opcional) ───────────────────────────────────── */
$personas = [];
if ($inv['confirmacion_id']) {
    try {
        // alergias: cada persona lleva la suya (ver la nota grande en
        // confirmar.php, sección "PERSONAS DEL GRUPO").
        $stmtP = $pdo->prepare(
            'SELECT id, nombre, tipo, menu, alergias FROM acompanantes WHERE confirmacion_id = :c ORDER BY id ASC'
        );
        $stmtP->execute([':c' => $inv['confirmacion_id']]);
        $personas = $stmtP->fetchAll();
    } catch (PDOException $e) {
        error_log('[Ania XV · invitacion.php] No se pudieron leer las personas: ' . $e->getMessage());
    }
}

/* ⚡ SI EL GRUPO NO TIENE FILAS DE PERSONAS, SE ARMAN DESDE LA COMPOSICIÓN
   (2026-09-02). Un grupo puede estar cargado como "2 adultos y 2 niños" sin
   que nadie tenga nombre todavía — eso NO lo hace incompleto: ya se sabe
   cuánta gente es y de qué tipo, que es todo lo que el formulario necesita
   para preguntar quién viene y qué come cada uno.

   Antes, sin filas, la invitación caía a un formulario viejo por cantidades
   (y después, peor, a un cartel de "todavía no está lista"). Las dos cosas
   estaban mal: el invitado tenía que ver siempre lo mismo. Ahora se generan
   los lugares que falten y el nombre queda vacío; la invitación los muestra
   como "Adulto 1", "Niño 2", y en cuanto Lucila escriba los nombres reales
   en el panel, esos mismos lugares pasan a mostrarlos. */
if (!$personas) {
    /* ⚡ LOS LUGARES SALEN DEL CUPO, NO DE LO QUE YA CONFIRMÓ (2026-09-03)
     *
     * Acá se leía `c.adultos` / `c.ninos`, que son columnas de
     * `confirmaciones` — o sea **lo que la persona contestó**, no lo que
     * tiene apartado. Y confirmar.php las pisa con la respuesta.
     *
     * El resultado era que una familia con 4 pases que confirmaba 2
     * volvía a abrir su link y veía **2 lugares**. Los otros dos
     * desaparecían, y no había forma de recuperarlos desde la
     * invitación: si al final venían los cuatro, no podía decirlo.
     *
     * `invitaciones.pases` es el cupo, y el cupo no cambia porque
     * alguien conteste. De ahí salen los lugares.
     *
     * La composición (cuántos son niños) sí se conserva de la respuesta
     * anterior, porque es un dato útil que la persona ya dio — pero
     * acotada al cupo, nunca al revés. */
    $cupo = max(1, (int) $inv['pases']);

    $ninosQueDijo = max(0, (int) ($inv['ninos'] ?? 0));
    $cuantosNinos = min($ninosQueDijo, $cupo);
    $cuantosAdultos = $cupo - $cuantosNinos;

    for ($i = 0; $i < $cuantosAdultos; $i++) {
        $personas[] = ['id' => null, 'nombre' => '', 'tipo' => 'adulto',
                       'menu' => '', 'alergias' => ''];
    }
    for ($i = 0; $i < $cuantosNinos; $i++) {
        $personas[] = ['id' => null, 'nombre' => '', 'tipo' => 'nino',
                       'menu' => '', 'alergias' => ''];
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
    /* Cuántas veces contestó este grupo. Se muestra en la invitación solo
       si ya contestó al menos una vez, para que se note si algo se mandó
       dos veces sin querer. La columna se agrega desde el instalador del
       panel; si esta base todavía no la tiene, viaja en 0 y no se muestra
       nada — nunca rompe. */
    'veces_respondida'  => (int) ($inv['veces_respondida'] ?? 0),
    /* Solo en el entorno de pruebas: habilita el botón de reinicio. La
       decisión la toma el SERVIDOR, no el navegador, para que en el sitio
       real ese botón no pueda existir aunque alguien lo fuerce. */
    'es_pruebas'        => (strpos((string) ($_SERVER['HTTP_HOST'] ?? ''), 'pbe.') === 0),
    'asiste'            => $inv['asiste'] !== null ? (int) $inv['asiste'] === 1 : true,
    'adultos'           => (int) ($inv['adultos'] ?? $inv['pases']),
    'ninos'             => (int) ($inv['ninos'] ?? 0),
    // htmlspecialchars_decode: confirmar.php guarda estos campos ya
    // escapados (limpiar() = htmlspecialchars). Si se devuelven crudos,
    // el formulario los muestra escapados ("Mariscos y ma&#039;iz") y, al
    // reenviar, se escapan de nuevo -degradando el texto un nivel en
    // cada edición. Se desescapa acá, al leer, para cortar el ciclo.
    'resumen_menus'     => htmlspecialchars_decode((string) ($inv['resumen_menus'] ?? ''), ENT_QUOTES),
    'alergias'          => htmlspecialchars_decode((string) ($inv['alergias'] ?? ''), ENT_QUOTES),
    'personas'          => array_map(function ($p) {
        $p['nombre']   = htmlspecialchars_decode((string) ($p['nombre'] ?? ''), ENT_QUOTES);
        $p['menu']     = htmlspecialchars_decode((string) ($p['menu'] ?? ''), ENT_QUOTES);
        $p['alergias'] = htmlspecialchars_decode((string) ($p['alergias'] ?? ''), ENT_QUOTES);
        return $p;
    }, $personas),
], JSON_UNESCAPED_UNICODE);
