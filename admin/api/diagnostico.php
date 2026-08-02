<?php
/* ══════════════════════════════════════════════════════════════════════
   DIAGNOSTICO.PHP · REVISIÓN DEL SERVIDOR

   QUÉ HACE ESTE ARCHIVO
   Contesta las preguntas que no se pueden responder desde una compu de
   escritorio, porque la base de datos de Hostinger solo acepta conexiones
   desde el propio servidor:

     1. ¿Con qué columnas quedó realmente la tabla `confirmaciones`?
     2. ¿Ya se corrió migracion.sql, o falta alguna tabla?
     3. ¿Está disponible la extensión IMAP para leer el correo?
     4. ¿Se puede escribir en la carpeta de archivos subidos?

   CÓMO SE USA
   Se sube junto al resto y se abre una vez en el navegador:
       https://aniaxv.com/admin/api/diagnostico.php?llave=LA_QUE_PUSISTE

   POR QUÉ PIDE UNA LLAVE
   Este archivo describe cómo está armada la base de datos, que es justo
   lo que necesita alguien para atacarla. Como corre ANTES de que exista
   el primer usuario, no puede protegerse con la sesión normal del panel;
   por eso usa una llave suelta que se define en el .env.

   ⚠️ BORRÁ ESTE ARCHIVO DEL SERVIDOR cuando el panel ya esté funcionando.
   No hace falta para el uso diario.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';

exigirMetodo(['GET']);

/* ─── PUERTA ──────────────────────────────────────────────────────────── */

$llaveEsperada = env('LLAVE_DIAGNOSTICO', '');
$llaveRecibida = (string) ($_GET['llave'] ?? '');

if ($llaveEsperada === '') {
    responderMal(
        'Falta definir LLAVE_DIAGNOSTICO en el archivo .env antes de usar esto.',
        403
    );
}
// hash_equals para que no se pueda adivinar la llave midiendo tiempos.
if (!hash_equals($llaveEsperada, $llaveRecibida)) {
    responderMal('Llave incorrecta.', 403);
}

/* ─── 1. LA TABLA QUE YA EXISTÍA ──────────────────────────────────────── */

$confirmaciones = ['existe' => false];

if (existeTabla('confirmaciones')) {
    $columnas = consultarTodo(
        "SELECT column_name, data_type, is_nullable, column_key, extra, column_default
         FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'confirmaciones'
         ORDER BY ordinal_position"
    );

    // Normalizamos el nombre de las claves: MySQL las devuelve en
    // MAYÚSCULAS o minúsculas según cómo esté configurado el servidor.
    $columnas = array_map(function ($c) {
        return [
            'nombre'    => $c['column_name'] ?? $c['COLUMN_NAME'] ?? '',
            'tipo'      => $c['data_type']   ?? $c['DATA_TYPE']   ?? '',
            'acepta_nulo' => $c['is_nullable'] ?? $c['IS_NULLABLE'] ?? '',
            'llave'     => $c['column_key']  ?? $c['COLUMN_KEY']  ?? '',
            'extra'     => $c['extra']       ?? $c['EXTRA']       ?? '',
            'defecto'   => $c['column_default'] ?? $c['COLUMN_DEFAULT'] ?? null,
        ];
    }, $columnas);

    $nombres = array_column($columnas, 'nombre');
    $cuantas = consultarUno('SELECT COUNT(*) AS n FROM confirmaciones');

    $confirmaciones = [
        'existe'   => true,
        'columnas' => $columnas,
        'filas'    => (int) ($cuantas['n'] ?? 0),

        // Esto es lo que de verdad hace falta saber: si se le puede
        // editar una fila desde el panel, y si se puede ordenar por fecha.
        'tiene_id'        => in_array('id', $nombres, true),
        'tiene_creado_en' => in_array('creado_en', $nombres, true),
    ];
}

/* ─── 2. LAS TABLAS NUEVAS ────────────────────────────────────────────── */

$tablasDelPanel = [
    'usuarios', 'sesiones', 'intentos_login', 'bitacora', 'notas', 'archivos',
    'suscripciones_push', 'categorias_gasto', 'padrinos', 'proveedores',
    'cotizaciones', 'gastos', 'pagos', 'tareas', 'agenda', 'cronograma',
    'mesas', 'asignacion_mesas', 'corte_honor', 'ensayos', 'asistencia_ensayos',
    'regalos', 'foraneos', 'ceremonia', 'requisitos_ceremonia', 'musica',
    'citas_arreglo', 'tomas_foto',
];

$faltantes = [];
foreach ($tablasDelPanel as $tabla) {
    if (!existeTabla($tabla)) $faltantes[] = $tabla;
}

/* ─── 3. CORREO ───────────────────────────────────────────────────────── */

// La extensión imap de PHP es lo cómodo. Si no está, el panel usa un
// cliente propio sobre sockets, igual que ya hace confirmar.php con SMTP.
$imapNativo = extension_loaded('imap');

// Probamos si al menos se puede abrir el socket al servidor de correo.
$socketImap = ['pudo' => false, 'error' => ''];
$host = env('IMAP_HOST', 'imap.hostinger.com');
$puerto = (int) env('IMAP_PORT', 993);

$conexion = @fsockopen("ssl://$host", $puerto, $errno, $errstr, 8);
if ($conexion) {
    $saludo = fgets($conexion, 512);
    fclose($conexion);
    // Un servidor IMAP sano saluda con algo que empieza en "* OK".
    $socketImap = ['pudo' => strpos((string) $saludo, 'OK') !== false,
                   'saludo' => trim((string) $saludo)];
} else {
    $socketImap = ['pudo' => false, 'error' => "$errstr ($errno)"];
}

/* ─── 4. CARPETA DE ARCHIVOS ──────────────────────────────────────────── */

$carpetaArchivos = dirname(__DIR__) . '/archivos';
$archivos = [
    'ruta'      => $carpetaArchivos,
    'existe'    => is_dir($carpetaArchivos),
    'escribible' => is_dir($carpetaArchivos) && is_writable($carpetaArchivos),
];

/* ─── 5. RESPUESTA ────────────────────────────────────────────────────── */

responderBien([
    'php' => [
        'version'      => PHP_VERSION,
        'pdo_mysql'    => extension_loaded('pdo_mysql'),
        'imap'         => $imapNativo,
        'openssl'      => extension_loaded('openssl'),
        'mbstring'     => extension_loaded('mbstring'),
        'fileinfo'     => extension_loaded('fileinfo'),
        'subida_maxima'=> ini_get('upload_max_filesize'),
    ],
    'base_de_datos' => [
        'confirmaciones'  => $confirmaciones,
        'tablas_faltantes'=> $faltantes,
        'migracion_lista' => empty($faltantes),
    ],
    'correo' => [
        'extension_imap'   => $imapNativo,
        'host_probado'     => "$host:$puerto",
        'conexion_directa' => $socketImap,
    ],
    'archivos' => $archivos,
]);
