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

/* Cuántas veces contestó el invitado desde su enlace. No es lo mismo que
   veces_enviado (cuántas veces se MANDÓ la invitación): esto cuenta las
   respuestas, y sirve para notar envíos repetidos o pruebas. */
$agregarColumna('invitaciones', 'veces_respondida', 'INT NOT NULL DEFAULT 0');

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

/* Cuánto ENTREGÓ un padrino, que no es lo mismo que cuánto prometió.
   `estado` es un sí/no: una entrega parcial —"de los $30,000 me dio
   $10,000 y el resto en octubre"— no se podía representar sin mentir
   para un lado o para el otro.

   Los que YA estaban marcados 'entregado' arrancan con su monto
   completo: es lo que esa marca significaba hasta ahora, y dejarlos en
   0 haría aparecer de golpe una deuda que no existe. Se hace una sola
   vez, y solo sobre los que quedaron en 0 — así correr instalar.php de
   nuevo no pisa una entrega parcial cargada a mano después. */
$agregarColumna('padrinos', 'monto_entregado', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
if (existeTabla('padrinos')
    && in_array('monto_entregado', columnasDe('padrinos'), true)) {
    ejecutar("UPDATE padrinos SET monto_entregado = monto
              WHERE estado = 'entregado' AND monto_entregado = 0");
}

/* La pregunta de seguridad de "olvidé mi contraseña" (ver sesion.php).
 * Igual que la contraseña, la respuesta NUNCA se guarda en claro — solo
 * su hash. La pregunta en sí sí queda en claro: hace falta mostrarla de
 * vuelta cuando alguien la esté configurando desde Ajustes. */
$agregarColumna('usuarios', 'pregunta_seguridad', 'VARCHAR(200) NULL DEFAULT NULL');
$agregarColumna('usuarios', 'respuesta_seguridad_hash', 'VARCHAR(255) NULL DEFAULT NULL');

/* Reglas por persona, no solo por familia (Fase 9). Ver la nota larga
 * en migracion.sql, junto a acompanante_reglas. Sin FK: mismo criterio
 * que invitado_a/invitado_b de esta misma tabla, que tampoco la tienen
 * — son "el id de una confirmación o de un acompañante", y una FK
 * exigiría elegir una sola tabla de las dos. */
$agregarColumna('incompatibilidades', 'acompanante_a', 'INT NULL DEFAULT NULL');
$agregarColumna('incompatibilidades', 'acompanante_b', 'INT NULL DEFAULT NULL');

/* Instalaciones que ya corrieron la migración vieja de `recibos` (Fase A,
   sin este campo) no lo tienen — recibos.php ahora puede vincular un
   recibo a un pago real de Presupuesto, siempre de forma opcional. */
$agregarColumna('recibos', 'pago_id', 'INT DEFAULT NULL');

/* Mismo motivo: instalaciones con `tareas` de antes de esta ronda no
   tienen el vínculo a proveedor/gasto/padrino/invitado. */
$agregarColumna('tareas', 'atada_a_tipo', "VARCHAR(30) NOT NULL DEFAULT ''");
$agregarColumna('tareas', 'atada_a_id',   'INT NOT NULL DEFAULT 0');

/* Instalaciones con `invitaciones` de antes de esta ronda (2026-08-30):
   el punto de color + numerito por invitación necesita contar cuántas
   veces se tocó "Mandar" — ver la nota grande en migracion.sql. */
$agregarColumna('invitaciones', 'veces_enviado', 'INT NOT NULL DEFAULT 0');

/* Un recibo ya no es exclusivo de un proveedor — puede ir a nombre de
   un padrino o de alguien sin ficha propia (ver la nota grande en
   migracion.sql, justo arriba de CREATE TABLE recibos). */
$agregarColumna('recibos', 'padrino_id',   'INT DEFAULT NULL');
$agregarColumna('recibos', 'beneficiario', "VARCHAR(200) NOT NULL DEFAULT ''");

/* Esto no es agregar una columna, es AFLOJAR una que ya exigía
   NOT NULL — por eso no usa $agregarColumna(). Se comprueba antes de
   tocar nada, tanto para no fallar si ya se corrió como para no
   arriesgarse en una tabla que todavía no existe. */
if (existeTabla('recibos')) {
    $columna = consultarUno(
        "SELECT IS_NULLABLE FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'recibos'
           AND column_name = 'proveedor_id'"
    );
    if ($columna && $columna['IS_NULLABLE'] === 'NO') {
        try {
            bd()->exec('ALTER TABLE `recibos` MODIFY `proveedor_id` INT DEFAULT NULL');
        } catch (PDOException $e) {
            error_log('[Ania XV · instalar] No se pudo aflojar recibos.proveedor_id: '
                . $e->getMessage());
        }
    }

    /* Los recibos que ya existían tienen proveedor_id pero
       `beneficiario` vacío (la columna recién se creó) — se completa
       una sola vez con el nombre del proveedor de esa fila, para que
       no aparezcan en blanco en los recibos ya generados. */
    ejecutar(
        "UPDATE recibos r
         JOIN proveedores p ON p.id = r.proveedor_id
         SET r.beneficiario = p.nombre
         WHERE r.beneficiario = ''"
    );
}


/* ─── SEMBRAR LA CLAVE DE SERVICIO DE MEGABOT ──────────────────────────
   Es la que compara admin/api/chat.php contra el header entrante
   `X-MegaBot-Clave` (acciones 'responder'/'contexto', sin sesión de
   usuario). Solo si todavía no existe -no se pisa una vez generada, y
   nunca queda en blanco: sin ella, ese lado del puente queda cerrado
   para siempre en vez de fallar en silencio. No hay ningún patrón
   previo en este archivo para "sembrar una clave de ajustes si falta"
   -esto es nuevo, no una copia de otro lado. */
if (existeTabla('ajustes')) {
    $yaTiene = consultarUno(
        "SELECT valor FROM ajustes WHERE clave = 'megabot_servicio_clave'"
    );
    if (!$yaTiene || trim((string) $yaTiene['valor']) === '') {
        // ON DUPLICATE KEY UPDATE en vez de un insertar() liso: `clave`
        // es PRIMARY KEY, y una fila con valor vacío (de una corrida
        // anterior fallida) rebotaría un insertar() normal con "llave
        // duplicada" en vez de completarse.
        ejecutar(
            "INSERT INTO ajustes (clave, valor) VALUES ('megabot_servicio_clave', :v)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            [':v' => bin2hex(random_bytes(32))]
        );
    }
}


/* ─── COMPROBAR QUE QUEDÓ TODO ────────────────────────────────────────── */

/* ⚠️ ESTA LISTA SE MANTIENE A MANO Y YA MINTIÓ UNA VEZ (2026-08-28).
   `confirmaciones` faltaba acá, así que el instalador respondía "Todo
   listo" con la tabla central de invitados ausente y el panel entero
   roto. Al agregar un CREATE TABLE nuevo a migracion.sql, agregá su
   nombre acá también, o el instalador no va a avisar si falla. */
$tablasEsperadas = [
    'usuarios', 'sesiones', 'recuperaciones_clave', 'intentos_login', 'bitacora', 'notas', 'archivos',
    'ajustes', 'alarmas', 'suscripciones_push', 'categorias_gasto', 'padrinos',
    'proveedores', 'confirmaciones',
    'cotizaciones', 'cotizacion_items', 'recibos', 'contratos', 'gastos', 'pagos', 'tareas', 'agenda',
    'cronograma',
    'mesas', 'asignacion_mesas', 'grupos_invitados', 'preferencias_invitado',
    'incompatibilidades', 'corte_honor', 'ensayos', 'asistencia_ensayos',
    'regalos', 'foraneos', 'ceremonia', 'requisitos_ceremonia', 'musica',
    'citas_arreglo', 'tomas_foto', 'acompanantes', 'permisos_usuario', 'llegadas',
    'comandos_usuario', 'presupuestos', 'eventos_uso',
    'acompanante_reglas', 'asignacion_mesas_persona', 'invitaciones',
    'escrituras_hechas', 'envios_proveedor', 'acomodo_respaldo',
    'etiquetas', 'etiquetas_asignadas',
    'chat_hilos', 'chat_mensajes', 'chat_propuestas',
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
            ? 'Todo listo. Entra a https://' . ($_SERVER['HTTP_HOST'] ?? 'aniaxv.com') . '/admin/'
            : 'Las tablas están creadas. Falta crear la primera cuenta.')
        : 'Faltan tablas. Revisa la lista de fallidas.',
]);
