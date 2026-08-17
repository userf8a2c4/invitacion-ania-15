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

if (!llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
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
        /* Al navegador va solo QUÉ falló, no POR QUÉ.
         *
         * Los mensajes crudos de MySQL cuentan de más: nombres de
         * tablas y columnas, la base que se está usando, a veces el
         * usuario de conexión. El resto del panel ya sigue esta regla
         * (ver responderMal en _lib/responder.php); este archivo era la
         * excepción. El detalle completo queda en el log del servidor,
         * que es donde se puede leer sin publicarlo. */
        $fallidas[] = [
            'que'   => $etiqueta,
            'error' => 'No se pudo. El detalle quedó en el registro del servidor.',
        ];
        error_log('[Ania XV · instalar] Falló ' . $etiqueta . ': ' . $e->getMessage());
    }
}

/* ─── COLUMNAS QUE LE FALTAN A TABLAS QUE YA EXISTÍAN ─────────────────── */

/* CREATE TABLE IF NOT EXISTS no toca una tabla que ya está: si se le
   agrega una columna al archivo de migración, las instalaciones viejas
   nunca la reciben. Por eso acá se revisa columna por columna y se
   agrega solo la que falte.

   Es idempotente: correrlo diez veces da el mismo resultado que una. */

$columnasQueFaltaban = [];

$agregarColumna = function ($tabla, $columna, $definicion) use (&$columnasQueFaltaban) {
    if (!existeTabla($tabla)) return;
    if (in_array($columna, columnasDe($tabla), true)) return;

    try {
        bd()->exec("ALTER TABLE `$tabla` ADD COLUMN `$columna` $definicion");
        $columnasQueFaltaban[] = "$tabla.$columna";
    } catch (PDOException $e) {
        error_log("[Ania XV · instalar] No se pudo agregar $tabla.$columna: " . $e->getMessage());
    }
};

// Fijar una asignación de mesa para que la autoasignación no la toque.
$agregarColumna('asignacion_mesas', 'fijada', 'TINYINT(1) NOT NULL DEFAULT 0');

// Precio por persona en las cotizaciones, para poder compararlas.
$agregarColumna('cotizaciones', 'tipo_precio',
                "ENUM('por_persona','fijo') NOT NULL DEFAULT 'fijo'");
$agregarColumna('cotizaciones', 'precio_pp', 'DECIMAL(12,2) NOT NULL DEFAULT 0');

/* Qué paquete de texto le toca a cada proveedor, para poder mandarle lo
   suyo por WhatsApp de un toque. Ver compartir.php. */
$agregarColumna('proveedores', 'paquete', "VARCHAR(20) NOT NULL DEFAULT ''");

/* "Qué incluye" como lista de ítems ({id,texto,hecho} en JSON), en vez
   de un cuadro de texto corrido. Ver campoListaDeDetalle() en
   06-piezas.js y campoListaDeDetalle() en _lib/responder.php. */
$agregarColumna('proveedores',  'detalle_items', 'TEXT NULL');
$agregarColumna('cotizaciones', 'detalle_items', 'TEXT NULL');

/* Dónde está cada mesa en el salón, para poder dibujar el plano. En 0
   quedan las que todavía no se ubicaron: se muestran aparte. */
$agregarColumna('mesas', 'fila',    'INT NOT NULL DEFAULT 0');
$agregarColumna('mesas', 'columna', 'INT NOT NULL DEFAULT 0');

/* Qué tan buena es la ubicación. Número más chico = mejor mesa. Es lo
   que hace que "los grupos de orden más bajo se quedan con las mejores
   mesas" signifique algo: antes se ordenaba por nombre. */
$agregarColumna('mesas', 'prioridad', 'INT NOT NULL DEFAULT 50');

$agregarColumna('mesas', 'perfil',
                "ENUM('normal','ninos','mayores') NOT NULL DEFAULT 'normal'");

/* El organigrama: qué perfil se eligió al crear la cuenta (solo para
   mostrarlo después, no decide nada por su cuenta — ver 01-configuracion.js)
   y los cuatro permisos que no son una sección del panel. */
$agregarColumna('usuarios', 'perfil', "VARCHAR(40) NOT NULL DEFAULT ''");
$agregarColumna('usuarios', 'puede_escanear',      'TINYINT(1) NOT NULL DEFAULT 0');
$agregarColumna('usuarios', 'puede_ver_dinero',    'TINYINT(1) NOT NULL DEFAULT 0');
$agregarColumna('usuarios', 'puede_borrar',        'TINYINT(1) NOT NULL DEFAULT 0');
$agregarColumna('usuarios', 'puede_crear_cuentas', 'TINYINT(1) NOT NULL DEFAULT 0');

/* La mesa de regalos de Amazon: cargar la lista de deseos una vez y
   cruzarla después contra los avisos de compra que llegan por correo.
   Ver codigo/11-vista-evento.js. */
$agregarColumna('regalos', 'precio', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
$agregarColumna('regalos', 'enlace', "VARCHAR(500) NOT NULL DEFAULT ''");
$agregarColumna('regalos', 'comprado_en', 'DATE DEFAULT NULL');
$agregarColumna('regalos', 'pedido_en_lista', 'TINYINT(1) NOT NULL DEFAULT 0');

// Cuántas veces se reintentó un pase ya usado (Fase 2 del rediseño,
// pantalla Hoy: la alerta de "pase repetido").
$agregarColumna('llegadas', 'intentos', 'INT NOT NULL DEFAULT 0');

/* Presupuestos múltiples (Fase 7 del rediseño). DEFAULT 1 no es solo el
   valor para las filas nuevas: en una ALTER TABLE, MySQL lo usa también
   para rellenar las filas que YA existían — así, todo lo que ya estaba
   cargado en una instalación vieja queda atado de una sola vez al
   presupuesto 1 ("Presupuesto principal", ver migracion.sql), sin
   necesitar un UPDATE aparte. */
$agregarColumna('categorias_gasto', 'presupuesto_id', 'INT NOT NULL DEFAULT 1');
$agregarColumna('gastos', 'presupuesto_id', 'INT NOT NULL DEFAULT 1');


/* ─── COMPROBAR QUE QUEDÓ TODO ────────────────────────────────────────── */

$tablasEsperadas = [
    'usuarios', 'sesiones', 'intentos_login', 'bitacora', 'notas', 'archivos',
    'ajustes', 'alarmas', 'suscripciones_push', 'categorias_gasto', 'padrinos',
    'proveedores',
    'cotizaciones', 'cotizacion_items', 'gastos', 'pagos', 'tareas', 'agenda',
    'cronograma',
    'mesas', 'asignacion_mesas', 'grupos_invitados', 'preferencias_invitado',
    'incompatibilidades', 'corte_honor', 'ensayos', 'asistencia_ensayos',
    'regalos', 'foraneos', 'ceremonia', 'requisitos_ceremonia', 'musica',
    'citas_arreglo', 'tomas_foto', 'acompanantes', 'permisos_usuario', 'llegadas',
    'comandos_usuario', 'presupuestos', 'eventos_uso',
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
    'columnas_agregadas'=> $columnasQueFaltaban,
    'cuentas_existentes'=> $cuentas,
    'siguiente_paso'    => $listo
        ? ($cuentas > 0
            ? 'Todo listo. Entra a https://aniaxv.com/admin/'
            : 'Las tablas están creadas. Falta crear la primera cuenta.')
        : 'Faltan tablas. Revisa la lista de fallidas.',
]);
