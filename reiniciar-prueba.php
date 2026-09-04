<?php
/* ══════════════════════════════════════════════════════════════════════
   REINICIAR UNA INVITACIÓN · SOLO EN EL ENTORNO DE PRUEBAS
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE
   Deja una invitación exactamente como estaba antes de que el invitado
   contestara: vuelve a "enviada", borra los menús, las alergias y el
   mensaje, y pone el contador de respuestas en cero. Sirve para poder
   repetir la misma prueba de punta a punta sin tener que crear un grupo
   nuevo cada vez.

   POR QUÉ EXISTE, Y POR QUÉ ES SEGURO
   Probar el formulario es, por naturaleza, algo que se hace muchas veces
   seguidas — y una vez que se contestó, la invitación queda respondida y
   la siguiente prueba ya no arranca desde el mismo punto. Sin esto, cada
   ronda de prueba consume un grupo familiar.

   ⚠️ SOLO CORRE EN pbe. — y la decisión la toma ESTE archivo, en el
   servidor, no el navegador. Un botón escondido en el JavaScript no
   alcanzaría: cualquiera puede llamar a una dirección a mano. Acá, en el
   sitio real, la petición se rechaza aunque llegue con todos los datos
   correctos. Es la diferencia entre una comodidad de desarrollo y un
   agujero por el que alguien podría borrar confirmaciones de verdad.

   NO se borra la invitación, ni el grupo, ni los nombres cargados: solo
   se limpia lo que el invitado había contestado.
   ══════════════════════════════════════════════════════════════════════ */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/admin/api/_lib/entorno.php';

/* ─── 1. SOLO EN EL ENTORNO DE PRUEBAS ────────────────────────────────
   El host tiene que empezar con "pbe." — en aniaxv.com esto no existe. */
$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
if (strpos($host, 'pbe.') !== 0) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'No disponible.']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
    exit;
}

/* ─── 2. EL TOKEN ─────────────────────────────────────────────────── */
$cuerpo = json_decode(file_get_contents('php://input'), true);
$token  = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($cuerpo['token'] ?? '')));

if ($token === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Falta el token.']);
    exit;
}

/* ─── 3. REINICIAR ────────────────────────────────────────────────── */

/* ⚠️ ESTE ARCHIVO NO FUNCIONABA (2026-09-04). El DSN se armaba con
   $DB_HOST, $DB_NAME, $DB_USER y $DB_PASSWORD, cuatro variables que
   NUNCA se definieron acá: no hay ningún $DB_HOST = ... en el archivo,
   y `require entorno.php` no define variables sueltas — carga el .env y
   lo expone con env(). En PHP 8 una variable indefinida es solo un
   aviso y se interpola como cadena vacía, así que el DSN quedaba
   "mysql:host=;dbname=;charset=utf8mb4", la conexión fallaba, y el
   catch de abajo contestaba un 500 con "No se pudo reiniciar." sin
   decir por qué.

   O sea que la herramienta que existe para poder repetir la prueba de
   punta a punta no dejaba repetir nada, y cada ensayo del formulario
   consumía un grupo familiar de los de verdad.

   env() (entorno.php) llama solo a cargarEntorno() la primera vez, así
   que no hace falta nada más. Se sigue usando PDO crudo y no _lib/bd.php
   a propósito: los atajos de bd.php salen por responderMal(), que hace
   exit, y este archivo quiere contestar con su propio JSON desde el
   catch de abajo. */
try {
    $pdo = new PDO(
        'mysql:host=' . env('DB_HOST', 'localhost') .
        ';dbname='    . env('DB_NAME', '') .
        ';charset=utf8mb4',
        env('DB_USER', ''),
        env('DB_PASSWORD', ''),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare('SELECT * FROM invitaciones WHERE token = :t LIMIT 1');
    $stmt->execute([':t' => $token]);
    $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invitacion) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Esa invitación no existe.']);
        exit;
    }

    /* La invitación vuelve a "enviada": ya se repartió, todavía no
       contestaron. respondida_en se limpia para que "sin responder"
       vuelva a contarla. */
    $pdo->prepare(
        "UPDATE invitaciones SET estado = 'enviada', respondida_en = NULL WHERE id = :id"
    )->execute([':id' => $invitacion['id']]);

    // El contador puede no existir en bases viejas: se intenta aparte.
    try {
        $pdo->prepare('UPDATE invitaciones SET veces_respondida = 0 WHERE id = :id')
            ->execute([':id' => $invitacion['id']]);
    } catch (PDOException $e) { /* la columna todavía no está: no importa */ }

    if (!empty($invitacion['confirmacion_id'])) {
        /* asiste vuelve a 1: es el supuesto con el que nace toda
           invitación, para que el bot de mesas pueda acomodar desde antes
           de que alguien conteste (ver la nota en migracion.sql). Los
           campos que llena el invitado quedan vacíos. */
        $pdo->prepare("UPDATE confirmaciones
            SET asiste = 1, menus = '', resumen_menus = '', alergias = '', notas = ''
            WHERE id = :id")
            ->execute([':id' => $invitacion['confirmacion_id']]);

        // Y el detalle por persona: el plato y la alergia de cada uno.
        $pdo->prepare("UPDATE acompanantes SET menu = '', alergias = ''
                       WHERE confirmacion_id = :id")
            ->execute([':id' => $invitacion['confirmacion_id']]);
    }

    echo json_encode(['ok' => true]);

} catch (PDOException $e) {
    error_log('[Ania XV · reiniciar] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo reiniciar.']);
}
