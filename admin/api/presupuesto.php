<?php
/* ══════════════════════════════════════════════════════════════════════
   PRESUPUESTO.PHP · EL DINERO

   QUÉ HACE ESTE ARCHIVO
   Todo lo relacionado con plata: categorías con techo, gastos, pagos,
   padrinos, proveedores y cotizaciones.

   LA IDEA QUE ORDENA TODO ESTE ARCHIVO
   Un gasto puede tener un padrino. Si lo tiene, ese dinero NO sale del
   bolsillo de la familia. Por eso cada total se calcula dos veces:
     · costo  = lo que sale la fiesta entera.
     · propio = solo los gastos SIN padrino.
   Un presupuesto que muestra un solo número siempre engaña a alguien.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=todo          el panorama completo de una sola vez
     POST ?accion=guardar_X     crea o edita (X = gasto, pago, padrino,
                                proveedor, cotizacion, categoria)
     POST ?accion=borrar_X      elimina
     POST ?accion=marcar_pagado marca un pago como hecho
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirAdministrador();   // el rol 'entrada' no ve el dinero
$accion = (string) ($_GET['accion'] ?? 'todo');


switch ($accion) {

/* ─── EL PANORAMA COMPLETO ────────────────────────────────────────────── */

case 'todo':
    exigirMetodo('GET');

    /* Categorías con lo gastado de cada una. El LEFT JOIN es a propósito:
       una categoría sin gastos todavía tiene que aparecer igual, con su
       techo, para poder cargarle el primero. */
    $categorias = consultarTodo(
        'SELECT c.id, c.nombre, c.techo, c.orden,
                COALESCE(SUM(g.monto_real), 0)     AS gastado,
                COALESCE(SUM(g.presupuestado), 0)  AS planeado,
                COUNT(g.id)                        AS cuantos_gastos
         FROM categorias_gasto c
         LEFT JOIN gastos g ON g.categoria_id = c.id
         GROUP BY c.id, c.nombre, c.techo, c.orden
         ORDER BY c.orden, c.nombre'
    );

    /* Gastos con el nombre de su categoría, proveedor y padrino ya
       resueltos, para que la app no tenga que cruzarlos a mano. */
    $gastos = consultarTodo(
        'SELECT g.*,
                c.nombre AS categoria_nombre,
                p.nombre AS proveedor_nombre,
                pa.nombre AS padrino_nombre,
                pa.estado AS padrino_estado
         FROM gastos g
         LEFT JOIN categorias_gasto c ON c.id = g.categoria_id
         LEFT JOIN proveedores p      ON p.id = g.proveedor_id
         LEFT JOIN padrinos pa        ON pa.id = g.padrino_id
         ORDER BY g.creado_en DESC'
    );

    $pagos = consultarTodo(
        'SELECT p.*, g.concepto AS gasto_concepto
         FROM pagos p
         LEFT JOIN gastos g ON g.id = p.gasto_id
         ORDER BY p.estado, p.fecha_limite IS NULL, p.fecha_limite'
    );

    /* Padrinos, con la suma de lo que cubren en gastos. Un padrino puede
       cubrir varios gastos, así que `monto` (lo prometido) y `cubre` (lo
       efectivamente asignado) pueden no coincidir — y ver esa diferencia
       es justamente lo útil. */
    $padrinos = consultarTodo(
        'SELECT pa.*,
                COALESCE(SUM(g.monto_real), 0) AS cubre,
                COUNT(g.id)                    AS cuantos_gastos
         FROM padrinos pa
         LEFT JOIN gastos g ON g.padrino_id = pa.id
         GROUP BY pa.id
         ORDER BY pa.nombre'
    );

    $proveedores = consultarTodo('SELECT * FROM proveedores ORDER BY nombre');
    $cotizaciones = consultarTodo(
        'SELECT * FROM cotizaciones ORDER BY servicio, monto'
    );

    /* ─── Los totales ─────────────────────────────────────────────────
       Se calculan en SQL y no sumando en PHP porque MySQL lo hace sobre
       la tabla entera de una sola pasada. */
    $totales = consultarUno(
        'SELECT
           COALESCE(SUM(presupuestado), 0) AS planeado,
           COALESCE(SUM(monto_real), 0)    AS costo,
           COALESCE(SUM(CASE WHEN padrino_id IS NULL
                             THEN monto_real ELSE 0 END), 0) AS propio,
           COALESCE(SUM(CASE WHEN padrino_id IS NOT NULL
                             THEN monto_real ELSE 0 END), 0) AS de_padrinos
         FROM gastos'
    );

    $porPagar = consultarUno(
        "SELECT COALESCE(SUM(monto), 0) AS monto, COUNT(*) AS cuantos
         FROM pagos WHERE estado = 'pendiente'"
    );

    $pagado = consultarUno(
        "SELECT COALESCE(SUM(monto), 0) AS monto FROM pagos WHERE estado = 'pagado'"
    );

    $padrinosPendientes = consultarUno(
        "SELECT COALESCE(SUM(monto), 0) AS monto, COUNT(*) AS cuantos
         FROM padrinos WHERE estado <> 'entregado' AND tipo_aporte = 'dinero'"
    );

    responderBien([
        'totales' => [
            'planeado'      => (float) $totales['planeado'],
            'costo'         => (float) $totales['costo'],
            'propio'        => (float) $totales['propio'],
            'de_padrinos'   => (float) $totales['de_padrinos'],
            'por_pagar'     => (float) $porPagar['monto'],
            'por_pagar_cuantos' => (int) $porPagar['cuantos'],
            'pagado'        => (float) $pagado['monto'],
            'padrinos_pendientes'         => (float) $padrinosPendientes['monto'],
            'padrinos_pendientes_cuantos' => (int) $padrinosPendientes['cuantos'],
        ],
        'categorias'   => $categorias,
        'gastos'       => $gastos,
        'pagos'        => $pagos,
        'padrinos'     => $padrinos,
        'proveedores'  => $proveedores,
        'cotizaciones' => $cotizaciones,
    ]);
    break;


/* ─── CATEGORÍAS ──────────────────────────────────────────────────────── */

case 'guardar_categoria':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'nombre' => campoTexto($datos, 'nombre', 80),
        'techo'  => campoMonto($datos, 'techo'),
        'orden'  => campoEntero($datos, 'orden', 0, 999, 50),
    ];
    if ($valores['nombre'] === '') responderMal('La categoría necesita un nombre.', 400);

    responderBien(guardarFila('categorias_gasto', $datos, $valores, $yo, 'categoría'));
    break;

case 'borrar_categoria':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    /* Los gastos NO se borran con la categoría: la llave foránea los
       deja con categoria_id = NULL. Borrar una categoría no puede
       hacer desaparecer dinero. */
    borrar('categorias_gasto', $id);
    anotarEnBitacora($yo, 'borró una categoría', 'categorias_gasto', $id);
    responderBien(['mensaje' => 'Categoría eliminada. Sus gastos quedaron sin categoría.']);
    break;


/* ─── GASTOS ──────────────────────────────────────────────────────────── */

case 'guardar_gasto':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'concepto'      => campoTexto($datos, 'concepto', 200),
        'categoria_id'  => idOpcional($datos, 'categoria_id'),
        'proveedor_id'  => idOpcional($datos, 'proveedor_id'),
        'padrino_id'    => idOpcional($datos, 'padrino_id'),
        'presupuestado' => campoMonto($datos, 'presupuestado'),
        'monto_real'    => campoMonto($datos, 'monto_real'),
        'notas'         => campoTexto($datos, 'notas', 2000),
    ];
    if ($valores['concepto'] === '') responderMal('El gasto necesita un concepto.', 400);

    responderBien(guardarFila('gastos', $datos, $valores, $yo, 'gasto'));
    break;

case 'borrar_gasto':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $antes = consultarUno('SELECT concepto FROM gastos WHERE id = :id', [':id' => $id]);
    if (!$antes) responderMal('Ese gasto no existe.', 404);

    // Los pagos de este gasto se van con él (ON DELETE CASCADE).
    borrar('gastos', $id);
    anotarEnBitacora($yo, 'borró un gasto', 'gastos', $id, $antes['concepto']);
    responderBien(['mensaje' => 'Gasto eliminado, junto con sus pagos.']);
    break;


/* ─── PAGOS ───────────────────────────────────────────────────────────── */

case 'guardar_pago':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $estado = campoOpcion($datos, 'estado', ['pendiente', 'pagado'], 'pendiente');

    $valores = [
        'gasto_id'     => idOpcional($datos, 'gasto_id'),
        'concepto'     => campoTexto($datos, 'concepto', 200),
        'monto'        => campoMonto($datos, 'monto'),
        'fecha_limite' => campoFecha($datos, 'fecha_limite'),
        'estado'       => $estado,
        'metodo'       => campoTexto($datos, 'metodo', 60),
        'notas'        => campoTexto($datos, 'notas', 2000),
        // Si se guarda ya como pagado y no se dijo cuándo, es hoy.
        'fecha_pagado' => $estado === 'pagado'
                          ? (campoFecha($datos, 'fecha_pagado') ?: date('Y-m-d'))
                          : null,
    ];

    if ($valores['concepto'] === '' && !$valores['gasto_id']) {
        responderMal('El pago necesita un concepto o estar atado a un gasto.', 400);
    }

    responderBien(guardarFila('pagos', $datos, $valores, $yo, 'pago'));
    break;

case 'marcar_pagado':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $pago = consultarUno('SELECT * FROM pagos WHERE id = :id', [':id' => $id]);
    if (!$pago) responderMal('Ese pago no existe.', 404);

    // Alterna: si ya estaba pagado, lo vuelve a pendiente. Sirve para
    // deshacer un toque por error sin tener que abrir el formulario.
    $nuevo = $pago['estado'] === 'pagado' ? 'pendiente' : 'pagado';

    actualizar('pagos', $id, [
        'estado'       => $nuevo,
        'fecha_pagado' => $nuevo === 'pagado' ? date('Y-m-d') : null,
    ]);

    anotarEnBitacora($yo, 'marcó un pago como ' . $nuevo, 'pagos', $id,
                     (string) $pago['concepto']);
    responderBien(['estado' => $nuevo]);
    break;

case 'borrar_pago':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    borrar('pagos', campoEntero($datos, 'id', 1));
    anotarEnBitacora($yo, 'borró un pago', 'pagos', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Pago eliminado.']);
    break;


/* ─── PADRINOS ────────────────────────────────────────────────────────── */

case 'guardar_padrino':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $estado = campoOpcion($datos, 'estado',
              ['hablado', 'confirmado', 'entregado'], 'hablado');

    $valores = [
        'nombre'        => campoTexto($datos, 'nombre', 150),
        'telefono'      => campoTexto($datos, 'telefono', 40),
        'correo'        => campoTexto($datos, 'correo', 190),
        'apadrina'      => campoTexto($datos, 'apadrina', 120),
        'tipo_aporte'   => campoOpcion($datos, 'tipo_aporte', ['dinero', 'especie'], 'dinero'),
        'monto'         => campoMonto($datos, 'monto'),
        'estado'        => $estado,
        'notas'         => campoTexto($datos, 'notas', 2000),
        'fecha_entrega' => $estado === 'entregado'
                           ? (campoFecha($datos, 'fecha_entrega') ?: date('Y-m-d'))
                           : campoFecha($datos, 'fecha_entrega'),
    ];
    if ($valores['nombre'] === '') responderMal('El padrino necesita un nombre.', 400);

    responderBien(guardarFila('padrinos', $datos, $valores, $yo, 'padrino'));
    break;

case 'borrar_padrino':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    /* Los gastos que apadrinaba quedan con padrino_id = NULL por la
       llave foránea, o sea que vuelven a contar como propios. Eso es
       exactamente lo correcto: si el padrino se cae, el gasto pasa a
       salir del bolsillo de la familia. */
    borrar('padrinos', $id);
    anotarEnBitacora($yo, 'borró un padrino', 'padrinos', $id);
    responderBien([
        'mensaje' => 'Padrino eliminado. Sus gastos vuelven a contar como propios.',
    ]);
    break;


/* ─── PROVEEDORES ─────────────────────────────────────────────────────── */

case 'guardar_proveedor':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'nombre'      => campoTexto($datos, 'nombre', 150),
        'servicio'    => campoTexto($datos, 'servicio', 120),
        'contacto'    => campoTexto($datos, 'contacto', 150),
        'telefono'    => campoTexto($datos, 'telefono', 40),
        'correo'      => campoTexto($datos, 'correo', 190),
        'monto_total' => campoMonto($datos, 'monto_total'),
        'anticipo'    => campoMonto($datos, 'anticipo'),
        'estado'      => campoOpcion($datos, 'estado',
                         ['candidato', 'contratado', 'pagado', 'cancelado'], 'candidato'),
        'notas'       => campoTexto($datos, 'notas', 2000),
    ];
    if ($valores['nombre'] === '') responderMal('El proveedor necesita un nombre.', 400);

    responderBien(guardarFila('proveedores', $datos, $valores, $yo, 'proveedor'));
    break;

case 'borrar_proveedor':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);
    borrar('proveedores', $id);
    anotarEnBitacora($yo, 'borró un proveedor', 'proveedores', $id);
    responderBien(['mensaje' => 'Proveedor eliminado.']);
    break;


/* ─── COTIZACIONES ────────────────────────────────────────────────────── */

case 'guardar_cotizacion':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'servicio'    => campoTexto($datos, 'servicio', 120),
        'proveedor'   => campoTexto($datos, 'proveedor', 150),
        'telefono'    => campoTexto($datos, 'telefono', 40),
        'monto'       => campoMonto($datos, 'monto'),
        'que_incluye' => campoTexto($datos, 'que_incluye', 2000),
        'vigencia'    => campoFecha($datos, 'vigencia'),
        'elegida'     => !empty($datos['elegida']) ? 1 : 0,
        'notas'       => campoTexto($datos, 'notas', 2000),
    ];
    if ($valores['proveedor'] === '' || $valores['servicio'] === '') {
        responderMal('La cotización necesita servicio y proveedor.', 400);
    }

    $resultado = guardarFila('cotizaciones', $datos, $valores, $yo, 'cotización');

    /* Solo puede haber UNA elegida por servicio: al marcar esta, se
       desmarcan las demás del mismo servicio. Sin esto quedarían dos
       "elegidas" y no se sabría cuál se contrató. */
    if ($valores['elegida']) {
        ejecutar(
            'UPDATE cotizaciones SET elegida = 0
             WHERE servicio = :s AND id <> :id',
            [':s' => $valores['servicio'], ':id' => $resultado['id']]
        );
    }

    responderBien($resultado);
    break;

case 'borrar_cotizacion':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);
    borrar('cotizaciones', $id);
    anotarEnBitacora($yo, 'borró una cotización', 'cotizaciones', $id);
    responderBien(['mensaje' => 'Cotización eliminada.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Crea o actualiza una fila según venga o no un id.
 *
 * Las seis secciones de este archivo hacen exactamente lo mismo al
 * guardar; tenerlo una sola vez evita que una de ellas se olvide de
 * anotar en la bitácora.
 *
 * @param string $tabla
 * @param array  $datos     Lo que mandó la app (para sacar el id).
 * @param array  $valores   Columna => valor, ya validados.
 * @param array  $yo        Quién lo está haciendo.
 * @param string $comoSeLlama Para el texto de la bitácora.
 * @return array ['id' => int, 'creado' => bool]
 */
function guardarFila($tabla, $datos, $valores, $yo, $comoSeLlama) {
    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        $cuantas = actualizar($tabla, $id, $valores);
        if ($cuantas === 0) {
            // Puede ser que el id no exista, o que no haya cambiado nada.
            $existe = consultarUno("SELECT id FROM `$tabla` WHERE id = :id", [':id' => $id]);
            if (!$existe) responderMal('Ese registro ya no existe.', 404);
        }
        anotarEnBitacora($yo, 'editó un ' . $comoSeLlama, $tabla, $id,
                         (string) ($valores['nombre'] ?? $valores['concepto'] ?? ''));
        return ['id' => $id, 'creado' => false];
    }

    $nuevo = insertar($tabla, $valores);
    anotarEnBitacora($yo, 'creó un ' . $comoSeLlama, $tabla, $nuevo,
                     (string) ($valores['nombre'] ?? $valores['concepto'] ?? ''));
    return ['id' => $nuevo, 'creado' => true];
}

/**
 * Lee un id de relación, devolviendo null cuando no hay ninguno.
 *
 * Es importante que sea null y no 0: las llaves foráneas aceptan NULL
 * ("este gasto no tiene padrino") pero rechazan un 0, porque no existe
 * ningún padrino con id 0 y la base se negaría a guardar la fila.
 *
 * @param array  $datos
 * @param string $clave
 * @return int|null
 */
function idOpcional($datos, $clave) {
    $valor = (int) ($datos[$clave] ?? 0);
    return $valor > 0 ? $valor : null;
}
