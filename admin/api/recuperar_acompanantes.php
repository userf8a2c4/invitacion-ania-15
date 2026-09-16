<?php
/* ══════════════════════════════════════════════════════════════════════
   RECUPERAR_ACOMPANANTES.PHP · DEVOLVER LOS NOMBRES QUE SE PERDIERON

   QUÉ PASÓ
   Las filas de `acompanantes` —quién viene en cada invitación, qué plato
   eligió cada uno y qué alergia tiene— se perdieron. Sin ellas, el PDF
   de invitados no puede imprimir la hoja «Persona por persona» y la
   cocina recibe un total del grupo en lugar del detalle: la elección que
   hizo cada invitado en su invitación no llega a nadie.

   DE DÓNDE SALEN ESTOS DATOS
   Del PDF «Invitados · Ania XV · 2026-09-10 06h32.pdf», que es la última
   copia impresa que quedó de la lista completa. 106 personas en
   47 grupos.

   POR QUÉ ES UN PHP Y NO UN .SQL
   `DB_HOST` es `localhost`: a la base solo se llega desde adentro del
   hosting. Un archivo .sql hay que pegarlo a mano en phpMyAdmin; este se
   sube junto al resto y se abre con el navegador.

   QUÉ HACE
   Le agrega a cada invitación las personas que le falten.

   QUÉ NO HACE
   No borra, no reemplaza, no toca a nadie que ya esté. Cada persona se
   inserta SOLO si esa invitación no tiene ya una con ese nombre. Correrlo
   dos veces no duplica nada; correrlo sobre datos completos no cambia
   nada.

   ENGANCHA POR CÓDIGO (`confirmaciones.codigo`), que no cambia nunca.
   Los links personales y los tokens quedan intactos.

   CÓMO SE USA
     1. Ensayo (no escribe nada, dice qué haría):
          https://aniaxv.com/admin/api/recuperar_acompanantes.php?llave=LA_LLAVE
     2. De verdad:
          ...?llave=LA_LLAVE&aplicar=1

   La llave es LLAVE_DIAGNOSTICO del .env — la misma de instalar.php y
   diagnostico.php, con su mismo freno de 5 intentos por 15 minutos.

   ⛔ BORRAR ESTE ARCHIVO DEL HOSTING CUANDO TERMINE.
   Es de un solo uso. Mientras esté ahí es una puerta más, y no hay
   ninguna razón para dejar puertas abiertas que ya no llevan a ningún
   lado.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';

if (!llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
    responderMal('Llave incorrecta.', 403);
}

if (!existeTabla('acompanantes') || !existeTabla('confirmaciones')) {
    responderMal('Faltan tablas: ¿se corrió el instalador?', 500);
}

/* Solo escribe si se lo pide explícitamente. Sin `aplicar=1` informa qué
   haría y no toca nada — el mismo criterio que `limpiar_contactos` en
   confirmaciones.php. */
$aplicar = ($_GET['aplicar'] ?? '') === '1';

/* [código de la invitación, nombre, tipo, menú] */
$GENTE = [
    /* XV-E9ADE4 · Andy (2 adultos, 0 niños) */
    ['XV-E9ADE4', 'Andrea Tellez', 'adulto', ''],
    ['XV-E9ADE4', 'Ricardo', 'adulto', ''],

    /* XV-A4D424 · Zule (3 adultos, 0 niños) */
    ['XV-A4D424', 'Zule', 'adulto', ''],
    ['XV-A4D424', 'Agustín', 'adulto', ''],
    ['XV-A4D424', 'Xareni', 'adulto', ''],

    /* XV-E6AD1D · Maye (2 adultos, 0 niños) */
    ['XV-E6AD1D', 'Maye', 'adulto', ''],
    ['XV-E6AD1D', 'Acompañante', 'adulto', ''],

    /* XV-55E542 · Mon Venegas (2 adultos, 0 niños) */
    ['XV-55E542', 'Mon Venegas', 'adulto', ''],
    ['XV-55E542', 'Acompañante', 'adulto', ''],

    /* XV-81AA46 · Anny (2 adultos, 0 niños) */
    ['XV-81AA46', 'Anny Veléz', 'adulto', ''],
    ['XV-81AA46', 'Daniel', 'adulto', ''],

    /* XV-8F26EB · Carolina (1 adultos, 0 niños) */
    ['XV-8F26EB', 'Carolina', 'adulto', ''],

    /* XV-F23D83 · Fernanda (1 adultos, 0 niños) */
    ['XV-F23D83', 'Fernanda', 'adulto', ''],

    /* XV-9A1720 · Orlando (1 adultos, 0 niños) */
    ['XV-9A1720', 'Orlando', 'adulto', ''],

    /* XV-272179 · Ana (1 adultos, 0 niños) */
    ['XV-272179', 'Ana', 'adulto', ''],

    /* XV-E23D57 · Nicole (1 adultos, 0 niños) */
    ['XV-E23D57', 'Nicole', 'adulto', ''],

    /* XV-66729C · Tonantzi (1 adultos, 0 niños) */
    ['XV-66729C', 'Tonantzi', 'adulto', ''],

    /* XV-203894 · Eduardo (1 adultos, 0 niños) */
    ['XV-203894', 'Eduardo', 'adulto', ''],

    /* XV-9AEBAE · Monse (1 adultos, 0 niños) */
    ['XV-9AEBAE', 'Monse', 'adulto', ''],

    /* XV-2B3E81 · Helen (1 adultos, 0 niños) */
    ['XV-2B3E81', 'Helen', 'adulto', ''],

    /* XV-4A5F94 · Joshua (1 adultos, 0 niños) */
    ['XV-4A5F94', 'Joshua', 'adulto', ''],

    /* XV-7967D2 · Brandon (1 adultos, 0 niños) */
    ['XV-7967D2', 'Brandon', 'adulto', ''],

    /* XV-BE1EBA · Mónica (1 adultos, 0 niños) */
    ['XV-BE1EBA', 'Mónica', 'adulto', ''],

    /* XV-9245C2 · Micaela Leyva (1 adultos, 0 niños) */
    ['XV-9245C2', 'Micaela Leyva', 'adulto', ''],

    /* XV-94E2A4 · Monserrat Barrera (3 adultos, 2 niños) */
    ['XV-94E2A4', 'Monserrat Barrera', 'adulto', ''],
    ['XV-94E2A4', 'Francisco Gonzalez', 'adulto', ''],
    ['XV-94E2A4', 'Evelyn Gabriela', 'adulto', ''],
    ['XV-94E2A4', 'Sofía Godinez', 'nino', ''],
    ['XV-94E2A4', 'Itzae Ramirez', 'nino', ''],

    /* XV-6A1798 · Dario Garcia (4 adultos, 0 niños) */
    ['XV-6A1798', 'Dario Garcia', 'adulto', ''],
    ['XV-6A1798', 'Mireya García', 'adulto', ''],
    ['XV-6A1798', 'Diana Paulina', 'adulto', ''],
    ['XV-6A1798', 'Novio de Pau', 'adulto', ''],

    /* XV-EFDC63 · Diego Garcia (2 adultos, 1 niños) */
    ['XV-EFDC63', 'Diego Garcia', 'adulto', ''],
    ['XV-EFDC63', 'Ana Hérnandez', 'adulto', ''],
    ['XV-EFDC63', 'Dorian Emil', 'nino', ''],

    /* XV-447CAF · 1 Sergio Abraham (2 adultos, 3 niños) */
    ['XV-447CAF', 'Sergio Abraham', 'adulto', ''],
    ['XV-447CAF', 'Gloria Jímenez', 'adulto', ''],
    ['XV-447CAF', 'Leo Jímenez', 'nino', ''],
    ['XV-447CAF', 'Michelle Jímenez', 'nino', ''],
    ['XV-447CAF', 'Axel Darío', 'nino', ''],

    /* XV-5CA189 · Carolina Leyva (2 adultos, 2 niños) */
    ['XV-5CA189', 'Carolina Leyva', 'adulto', ''],
    ['XV-5CA189', 'Adulto 2', 'adulto', ''],
    ['XV-5CA189', 'Niño 1', 'nino', ''],
    ['XV-5CA189', 'Niño 2', 'nino', ''],
    ['XV-5CA189', 'Martha Leyva', 'nino', ''],

    /* XV-E5071C · Nidia Leyva (2 adultos, 0 niños) */
    ['XV-E5071C', 'Nidia Leyva', 'adulto', ''],
    ['XV-E5071C', 'Adulto 2', 'adulto', ''],

    /* XV-B5E3CD · Macrina Moreno (1 adultos, 0 niños) */
    ['XV-B5E3CD', 'Macrina Moreno', 'adulto', ''],
    ['XV-B5E3CD', 'Mary Moreno', 'adulto', ''],
    ['XV-B5E3CD', 'Nena Moreno', 'adulto', ''],

    /* XV-D901C9 · Ariel Reyes (4 adultos, 0 niños) */
    ['XV-D901C9', 'Ariel Reyes', 'adulto', ''],
    ['XV-D901C9', 'Cinthya Avalos', 'adulto', ''],
    ['XV-D901C9', 'Ariel Reyes', 'adulto', ''],
    ['XV-D901C9', 'Arath Reyes', 'adulto', ''],

    /* XV-76B03A · Luz Elena (4 adultos, 0 niños) */
    ['XV-76B03A', 'Luz Elena', 'adulto', ''],
    ['XV-76B03A', 'Santiago', 'adulto', ''],
    ['XV-76B03A', 'Romina Ascencio', 'adulto', ''],
    ['XV-76B03A', 'Regina Ascencio', 'adulto', ''],

    /* XV-618731 · Axel Reyes (1 adultos, 0 niños) */
    ['XV-618731', 'Axel Reyes', 'adulto', ''],

    /* XV-56C5A3 · Anet Moreno (3 adultos, 0 niños) */
    ['XV-56C5A3', 'Anet Moreno', 'adulto', ''],
    ['XV-56C5A3', 'Yeldin', 'adulto', ''],
    ['XV-56C5A3', 'Diego Abimael', 'adulto', ''],
    ['XV-56C5A3', 'Rosy Moreno', 'adulto', ''],

    /* XV-01BB19 · Anahi Moreno (3 adultos, 1 niños) */
    ['XV-01BB19', 'Anahi Moreno', 'adulto', ''],
    ['XV-01BB19', 'Gerardo', 'adulto', ''],
    ['XV-01BB19', 'Aimé Moreno', 'adulto', ''],
    ['XV-01BB19', 'Aramis Moreno', 'nino', ''],

    /* XV-794BF7 · Raúl Moreno (6 adultos, 0 niños) */
    ['XV-794BF7', 'Raúl Moreno', 'adulto', ''],
    ['XV-794BF7', 'Aracelí', 'adulto', ''],
    ['XV-794BF7', 'Sofía Moreno', 'adulto', ''],

    /* XV-4D81D9 · Mario Moreno (3 adultos, 1 niños) */
    ['XV-4D81D9', 'Mario Moreno', 'adulto', ''],
    ['XV-4D81D9', 'Esposa de Mario', 'adulto', ''],
    ['XV-4D81D9', 'Adulto 3', 'adulto', ''],
    ['XV-4D81D9', 'Luna Moreno', 'nino', ''],

    /* XV-C1907A · Luis Moreno (2 adultos, 0 niños) */
    ['XV-C1907A', 'Luis Moreno', 'adulto', ''],
    ['XV-C1907A', 'Laura', 'adulto', ''],

    /* XV-C766D6 · Guera Moreno (2 adultos, 2 niños) */
    ['XV-C766D6', 'Ana Lilia Moreno', 'adulto', ''],
    ['XV-C766D6', 'Adulto 2', 'adulto', ''],
    ['XV-C766D6', 'Niño 1', 'nino', ''],
    ['XV-C766D6', 'Niño 2', 'nino', ''],

    /* XV-7DB9F9 · Efren Moreno (2 adultos, 0 niños) */
    ['XV-7DB9F9', 'Efren Moreno', 'adulto', ''],
    ['XV-7DB9F9', 'Adulto 2', 'adulto', ''],

    /* XV-2DDD03 · Mayte Garcia (2 adultos, 3 niños) */
    ['XV-2DDD03', 'Mayte Garcia', 'adulto', ''],
    ['XV-2DDD03', 'Daniel Abarca', 'adulto', ''],
    ['XV-2DDD03', 'Sobris 1', 'nino', ''],
    ['XV-2DDD03', 'Sobris 2', 'nino', ''],
    ['XV-2DDD03', 'Nenito', 'nino', ''],

    /* XV-4BAD5E · Nenito: sin elegir · Menú infantil: 1 Estefy Papoi (0 adultos, 1 niños) */
    ['XV-4BAD5E', 'Estefy Papoi', 'nino', ''],

    /* XV-FE05A0 · Viri y Luisa (0 adultos, 2 niños) */
    ['XV-FE05A0', 'Niño 1', 'nino', ''],
    ['XV-FE05A0', 'Niño 2', 'nino', ''],

    /* XV-9462EB · Vania (0 adultos, 1 niños) */
    ['XV-9462EB', 'Niño 1', 'nino', ''],

    /* XV-E3A882 · Chucho (2 adultos, 0 niños) */
    ['XV-E3A882', 'Chucho', 'adulto', ''],
    ['XV-E3A882', 'Adulto 2', 'adulto', ''],

    /* XV-64F567 · Alex (2 adultos, 0 niños) */
    ['XV-64F567', 'Alex', 'adulto', ''],
    ['XV-64F567', 'Adulto 2', 'adulto', ''],

    /* XV-4A78F9 · Chris (1 adultos, 0 niños) */
    ['XV-4A78F9', 'Chris', 'adulto', ''],

    /* XV-515EB4 · Vale (1 adultos, 1 niños) */
    ['XV-515EB4', 'Vale', 'adulto', ''],
    ['XV-515EB4', 'Niño 1', 'nino', ''],

    /* XV-3EA0E5 · Ximena Lara (2 adultos, 0 niños) */
    ['XV-3EA0E5', 'Ximena Lara', 'adulto', ''],
    ['XV-3EA0E5', 'Adulto 2', 'adulto', ''],

    /* XV-9352C2 · Pam (1 adultos, 0 niños) */
    ['XV-9352C2', 'Pam', 'adulto', ''],

    /* XV-49C52A · Ania Sarahi (1 adultos, 0 niños) */
    ['XV-49C52A', 'Ania Sarahi', 'adulto', ''],

    /* XV-0F7695 · Alan Reyes y familia (2 adultos, 1 niños) */
    ['XV-0F7695', 'Alan Reyes', 'adulto', 'Estándar'],
    ['XV-0F7695', 'Lucila Garcia', 'adulto', 'Estándar'],
    ['XV-0F7695', 'Mavita', 'nino', 'Infantil'],
];


/* ─── QUÉ HAY AHORA ────────────────────────────────────────────────── */

$idPorCodigo = [];
foreach (consultarTodo('SELECT id, codigo FROM confirmaciones') as $c) {
    $idPorCodigo[(string) $c['codigo']] = (int) $c['id'];
}

/* Los nombres que YA están, para no pisar ni duplicar. La comparación es
   la misma que hacía el .sql: por confirmación y nombre exacto. */
$yaEstan = [];
foreach (consultarTodo('SELECT confirmacion_id, nombre FROM acompanantes') as $a) {
    $yaEstan[$a['confirmacion_id'] . '|' . $a['nombre']] = true;
}

$tieneMenu     = in_array('menu', columnasDe('acompanantes'), true);
$tieneAlergias = in_array('alergias', columnasDe('acompanantes'), true);


/* ─── QUÉ FALTA ────────────────────────────────────────────────────── */

$porInsertar  = [];
$yaTenian     = 0;
$sinInvitacion = [];

foreach ($GENTE as $p) {
    list($codigo, $nombre, $tipo, $menu) = $p;

    if (!isset($idPorCodigo[$codigo])) {
        $sinInvitacion[$codigo] = true;
        continue;
    }
    $confirmacionId = $idPorCodigo[$codigo];

    if (isset($yaEstan[$confirmacionId . '|' . $nombre])) {
        $yaTenian++;
        continue;
    }

    $porInsertar[] = [$confirmacionId, $nombre, $tipo, $menu, $codigo];
}


/* ─── ESCRIBIR, SI SE PIDIÓ ────────────────────────────────────────── */

$insertadas = 0;

if ($aplicar && $porInsertar) {
    /* `orden` y `alergias` se dejan en su valor por defecto a propósito:
       así esto funciona aunque el instalador del panel no se haya corrido
       todavía. Las alergias no se recuperan porque en el PDF no había
       ninguna cargada: no hay nada que devolver. */
    $columnas = 'confirmacion_id, nombre, tipo';
    $valores  = ':conf, :nombre, :tipo';
    if ($tieneMenu) {
        $columnas .= ', menu';
        $valores  .= ', :menu';
    }

    $pdo = bd();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO acompanantes ($columnas) VALUES ($valores)");

        foreach ($porInsertar as $p) {
            $datos = [
                ':conf'   => $p[0],
                ':nombre' => $p[1],
                ':tipo'   => $p[2],
            ];
            if ($tieneMenu) $datos[':menu'] = $p[3];
            $stmt->execute($datos);
            $insertadas++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        responderMal('No se pudo escribir: ' . $e->getMessage(), 500);
    }
}


/* ─── CÓMO QUEDÓ ───────────────────────────────────────────────────── */

/* La misma comprobación que llevaba el .sql al pie: tienen que salir los
   grupos con gente cargada y ninguno en 0. */
$comprobacion = consultarTodo(
    'SELECT c.codigo, c.nombre,
            c.adultos + c.ninos AS lugares,
            COUNT(a.id)         AS personas_cargadas
       FROM confirmaciones c
       LEFT JOIN acompanantes a ON a.confirmacion_id = c.id
      GROUP BY c.id, c.codigo, c.nombre, c.adultos, c.ninos
      ORDER BY personas_cargadas ASC, c.codigo'
);

$enCero = 0;
foreach ($comprobacion as $f) {
    if ((int) $f['personas_cargadas'] === 0) $enCero++;
}

responderBien([
    'modo'              => $aplicar ? 'APLICADO' : 'ENSAYO (no se escribió nada)',
    'personas_en_el_pdf' => count($GENTE),
    'ya_estaban'        => $yaTenian,
    'faltaban'          => count($porInsertar),
    'insertadas'        => $insertadas,
    'la_tabla_guarda_menu' => $tieneMenu,
    'la_tabla_guarda_alergias' => $tieneAlergias,
    'codigos_sin_invitacion' => array_keys($sinInvitacion),
    'grupos_en_cero'    => $enCero,
    'que_sigue'         => $aplicar
        ? ($enCero === 0
            ? 'Listo. Descargá el PDF de invitados: tiene que aparecer la hoja «Persona por persona». Después BORRÁ este archivo del hosting.'
            : "Quedaron $enCero grupos sin ninguna persona cargada — mirá la lista de abajo.")
        : 'Ensayo nada más. Para escribir de verdad, agregá  &aplicar=1  a la dirección.',
    'grupo_por_grupo'   => $comprobacion,
]);
