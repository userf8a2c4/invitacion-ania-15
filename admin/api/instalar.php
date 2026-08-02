<?php
/* ══════════════════════════════════════════════════════════════════════
   INSTALAR.PHP · CREA LAS TABLAS SIN TOCAR PHPMYADMIN

   QUÉ HACE ESTE ARCHIVO
   Lee migracion.sql y ejecuta cada instrucción contra la base de datos.
   Es exactamente lo mismo que pegar ese archivo en phpMyAdmin, pero se
   hace abriendo una dirección en el navegador.

   CÓMO SE USA
       https://aniaxv.com/admin/api/instalar.php?llave=LA_DEL_ENV

   SE PUEDE ABRIR VARIAS VECES SIN MIEDO
   Todas las instrucciones de migracion.sql son CREATE TABLE IF NOT
   EXISTS e INSERT IGNORE: si la tabla ya existe, no hace nada y no pisa
   ningún dato. Correrlo dos veces es inofensivo.

   QUÉ NO HACE
   No borra nada. No toca la tabla `confirmaciones` que ya existía. No
   modifica columnas de tablas creadas antes. Solo agrega lo que falta.

   ⚠️ BORRÁ ESTE ARCHIVO DEL SERVIDOR cuando el panel esté funcionando,
   igual que diagnostico.php.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/responder.php';

exigirMetodo(['GET', 'POST']);

/* ─── PUERTA ──────────────────────────────────────────────────────────── */

$llaveEsperada = env('LLAVE_DIAGNOSTICO', '');
if ($llaveEsperada === '') {
    responderMal(
        'Falta definir LLAVE_DIAGNOSTICO en el .env del servidor. ' .
        'Subí el archivo .env actualizado por FTP y volvé a abrir esta dirección.',
        403
    );
}
if (!hash_equals($llaveEsperada, (string) ($_GET['llave'] ?? ''))) {
    responderMal('Llave incorrecta.', 403);
}

/* ─── LEER EL ARCHIVO DE MIGRACIÓN ────────────────────────────────────── */

$ruta = dirname(__DIR__) . '/migracion.sql';
if (!file_exists($ruta)) {
    responderMal('No se encontró migracion.sql en el servidor. ¿Se subió la carpeta admin/ completa?', 500);
}

$sql = file_get_contents($ruta);

/* Se quitan los comentarios ANTES de cortar por punto y coma. Si no, un
   comentario que contuviera un ";" partiría una instrucción por la mitad
   y el pedazo suelto daría un error de sintaxis imposible de entender. */
$sql = preg_replace('/^\s*--.*$/m', '', $sql);

/* Cortar en instrucciones sueltas. Se ejecutan de a una y no todas
   juntas para poder decir EXACTAMENTE cuál falló si algo sale mal. */
$instrucciones = array_filter(
    array_map('trim', explode(';', $sql)),
    function ($trozo) { return $trozo !== ''; }
);

/* ─── EJECUTAR ────────────────────────────────────────────────────────── */

$hechas   = [];
$fallidas = [];

foreach ($instrucciones as $instruccion) {
    // Un nombre corto para el informe, en vez de volcar el SQL entero.
    $etiqueta = 'instrucción';
    if (preg_match('/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i', $instruccion, $m)) {
        $etiqueta = 'tabla ' . $m[1];
    } elseif (preg_match('/INSERT IGNORE INTO\s+`?(\w+)`?/i', $instruccion, $m)) {
        $etiqueta = 'datos iniciales de ' . $m[1];
    }

    try {
        bd()->exec($instruccion);
        $hechas[] = $etiqueta;
    } catch (PDOException $e) {
        /* No se corta al primer fallo: se sigue con las demás y se
           informan todas juntas. Así, si falta un permiso o una tabla
           tiene un problema puntual, igual se crean las otras 27 y el
           informe dice con precisión qué quedó pendiente. */
        $fallidas[] = [
            'que'   => $etiqueta,
            'error' => $e->getMessage(),
        ];
        error_log('[Ania XV · instalar] Falló ' . $etiqueta . ': ' . $e->getMessage());
    }
}

/* ─── COMPROBAR QUE QUEDÓ TODO ────────────────────────────────────────── */

$tablasEsperadas = [
    'usuarios', 'sesiones', 'intentos_login', 'bitacora', 'notas', 'archivos',
    'suscripciones_push', 'categorias_gasto', 'padrinos', 'proveedores',
    'cotizaciones', 'gastos', 'pagos', 'tareas', 'agenda', 'cronograma',
    'mesas', 'asignacion_mesas', 'corte_honor', 'ensayos', 'asistencia_ensayos',
    'regalos', 'foraneos', 'ceremonia', 'requisitos_ceremonia', 'musica',
    'citas_arreglo', 'tomas_foto',
];

$faltantes = [];
foreach ($tablasEsperadas as $tabla) {
    if (!existeTabla($tabla)) $faltantes[] = $tabla;
}

/* ─── ¿HAY QUE CREAR LA PRIMERA CUENTA? ───────────────────────────────── */

$cuentas = 0;
if (existeTabla('usuarios')) {
    $fila = consultarUno('SELECT COUNT(*) AS n FROM usuarios');
    $cuentas = (int) ($fila['n'] ?? 0);
}

/* ─── INFORME ─────────────────────────────────────────────────────────── */

$listo = empty($faltantes);

responderBien([
    'listo'             => $listo,
    'instrucciones_ok'  => count($hechas),
    'fallidas'          => $fallidas,
    'tablas_faltantes'  => $faltantes,
    'cuentas_existentes'=> $cuentas,
    'siguiente_paso'    => $listo
        ? ($cuentas > 0
            ? 'Todo listo. Entrá a https://aniaxv.com/admin/'
            : 'Las tablas están creadas. Falta crear la primera cuenta.')
        : 'Faltan tablas. Revisá la lista de fallidas.',
]);
