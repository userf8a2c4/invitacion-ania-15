<?php
/* ══════════════════════════════════════════════════════════════════════
   COTIZADOR.PHP · COMPARAR SALONES Y CALCULAR EL TOTAL DE VERDAD

   QUÉ HACE ESTE ARCHIVO
   Calcula cuánto sale cada cotización con una cantidad de invitados
   dada, y las pone lado a lado para poder elegir.

   POR QUÉ NO ALCANZA CON MIRAR EL PRECIO POR PERSONA
   El paquete más barato por persona casi nunca es el más barato al
   final. En la planilla de Ania, SEEM Light sale $350 por persona y
   Alvi Bronce $550 — pero SEEM no incluye el DJ, que cuesta $17,900
   aparte, ni el servicio de banquete. Con 110 invitados esa diferencia
   se da vuelta.

   Este archivo arma el total real: precio base × personas, más los
   extras que hagan falta, cada uno según cómo se cobre.

   LOS CUATRO TIPOS DE COSTO (salen de la hoja "Calculador de extras")
     por_persona → monto × invitados      (la copa de vino, $90 pp)
     fijo        → monto                  (la decoración de techo, $7,000)
     por_unidad  → monto × unidades       (centros de mesa, $250 c/u)
     porcentaje  → % sobre el subtotal    (comisión de tarjeta, 4.5%)

   El porcentaje se calcula SIEMPRE AL FINAL, sobre todo lo demás ya
   sumado: una comisión bancaria se cobra sobre el total, no sobre el
   precio base.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=servicios          qué rubros tienen cotizaciones
     GET  ?accion=comparar&servicio=Salón&personas=110
     GET  ?accion=ver&id=5&personas=110
     POST ?accion=guardar_item       agrega o edita un renglón
     POST ?accion=borrar_item
     POST ?accion=activar_item       prende o apaga un extra
     POST ?accion=a_presupuesto      pasa la elegida a gastos
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'servicios');


/* ─── EL CÁLCULO ──────────────────────────────────────────────────────── */

/**
 * Calcula cuánto sale una cotización para una cantidad de invitados.
 *
 * @param array $cotizacion  Fila de la tabla.
 * @param array $items       Sus renglones.
 * @param int   $personas
 * @return array El desglose completo.
 */
function calcularCotizacion($cotizacion, $items, $personas) {
    $personas = max(1, (int) $personas);

    /* ─── La base ────────────────────────────────────────────────────── */
    $esPorPersona = ($cotizacion['tipo_precio'] ?? 'fijo') === 'por_persona';
    $precioPp     = (float) ($cotizacion['precio_pp'] ?? 0);

    $base = $esPorPersona
        ? $precioPp * $personas
        : (float) ($cotizacion['monto'] ?? 0);

    /* ─── Los extras ─────────────────────────────────────────────────── */
    $extras     = 0.0;
    $porcentajes = [];
    $detalle    = [];
    $incluidos  = [];

    foreach ($items as $item) {
        $monto = (float) $item['monto'];

        // Lo incluido se lista pero no suma: ya está dentro del precio.
        if ((int) $item['incluido'] === 1) {
            $incluidos[] = $item['concepto'];
            continue;
        }

        // Lo apagado tampoco: está disponible pero no se quiere.
        if ((int) $item['activo'] !== 1) continue;

        switch ($item['tipo']) {
            case 'por_persona':
                $cuanto = $monto * $personas;
                break;

            case 'por_unidad':
                $cuanto = $monto * max(1, (int) $item['unidades']);
                break;

            case 'porcentaje':
                /* Se guardan para el final: se calculan sobre el total ya
                   armado, que es como cobra una comisión bancaria. */
                $porcentajes[] = $item;
                continue 2;

            default:   // fijo
                $cuanto = $monto;
        }

        $extras += $cuanto;
        $detalle[] = [
            'concepto' => $item['concepto'],
            'tipo'     => $item['tipo'],
            'monto'    => $monto,
            'subtotal' => round($cuanto, 2),
        ];
    }

    /* ─── Los porcentajes, al final ──────────────────────────────────── */
    $subtotal = $base + $extras;
    $comisiones = 0.0;

    foreach ($porcentajes as $item) {
        $cuanto = $subtotal * ((float) $item['monto'] / 100);
        $comisiones += $cuanto;

        $detalle[] = [
            'concepto' => $item['concepto'],
            'tipo'     => 'porcentaje',
            'monto'    => (float) $item['monto'],
            'subtotal' => round($cuanto, 2),
        ];
    }

    $total = $subtotal + $comisiones;

    return [
        'id'          => (int) $cotizacion['id'],
        'proveedor'   => $cotizacion['proveedor'],
        'servicio'    => $cotizacion['servicio'],
        'elegida'     => (int) ($cotizacion['elegida'] ?? 0) === 1,
        'vigencia'    => $cotizacion['vigencia'],
        'tipo_precio' => $esPorPersona ? 'por_persona' : 'fijo',
        'precio_pp'   => $precioPp,
        'personas'    => $personas,
        'base'        => round($base, 2),
        'extras'      => round($extras, 2),
        'comisiones'  => round($comisiones, 2),
        'total'       => round($total, 2),
        // Lo que de verdad cuesta cada invitado, contando todo. Es el
        // número que permite comparar paquetes con bases distintas.
        'real_pp'     => round($total / $personas, 2),
        'detalle'     => $detalle,
        'incluidos'   => $incluidos,
        'que_incluye' => $cotizacion['que_incluye'],
        'notas'       => $cotizacion['notas'],
    ];
}

/**
 * Trae los renglones de una cotización.
 *
 * @param int $id
 * @return array
 */
function itemsDe($id) {
    if (!existeTabla('cotizacion_items')) return [];
    return consultarTodo(
        'SELECT * FROM cotizacion_items WHERE cotizacion_id = :c
         ORDER BY categoria, orden, id',
        [':c' => (int) $id]
    );
}


switch ($accion) {

/* ─── QUÉ RUBROS HAY ──────────────────────────────────────────────────── */

case 'servicios':
    exigirMetodo('GET');

    responderBien(consultarTodo(
        'SELECT servicio, COUNT(*) AS cuantas,
                SUM(elegida) AS elegidas
         FROM cotizaciones
         GROUP BY servicio
         HAVING cuantas > 0
         ORDER BY cuantas DESC, servicio'
    ));
    break;


/* ─── COMPARAR ────────────────────────────────────────────────────────── */

case 'comparar':
    exigirMetodo('GET');

    $servicio = trim((string) ($_GET['servicio'] ?? ''));
    $personas = max(1, (int) ($_GET['personas'] ?? 0));

    if ($servicio === '') responderMal('Falta decir qué servicio comparar.', 400);

    /* Si no dijeron cuántas personas, se usa la cantidad real de
       confirmados: es el número con el que hay que decidir. */
    if ($personas <= 1 && existeTabla('confirmaciones')) {
        $fila = consultarUno(
            'SELECT COALESCE(SUM(adultos + ninos), 0) AS n
             FROM confirmaciones WHERE asiste = 1'
        );
        $personas = max(1, (int) ($fila['n'] ?? 0));
    }

    $cotizaciones = consultarTodo(
        'SELECT * FROM cotizaciones WHERE servicio = :s ORDER BY proveedor',
        [':s' => $servicio]
    );

    if (!$cotizaciones) responderMal('No hay cotizaciones de ese servicio.', 404);

    $calculadas = [];
    foreach ($cotizaciones as $cotizacion) {
        $calculadas[] = calcularCotizacion($cotizacion, itemsDe($cotizacion['id']), $personas);
    }

    // De la más barata a la más cara: la primera columna es la que gana.
    usort($calculadas, function ($a, $b) {
        return $a['total'] <=> $b['total'];
    });

    /* ─── Cuánto pesa en el presupuesto ──────────────────────────────── */
    $presupuesto = null;
    if (existeTabla('gastos')) {
        $totales = consultarUno(
            'SELECT COALESCE(SUM(monto_real), 0) AS gastado,
                    COALESCE(SUM(CASE WHEN padrino_id IS NULL
                                      THEN monto_real ELSE 0 END), 0) AS propio
             FROM gastos'
        );

        $techo = 0;
        if (existeTabla('categorias_gasto')) {
            $t = consultarUno('SELECT COALESCE(SUM(techo), 0) AS n FROM categorias_gasto');
            $techo = (float) ($t['n'] ?? 0);
        }

        $presupuesto = [
            'gastado' => (float) $totales['gastado'],
            'propio'  => (float) $totales['propio'],
            'techo'   => $techo,
        ];
    }

    responderBien([
        'servicio'    => $servicio,
        'personas'    => $personas,
        'cotizaciones'=> $calculadas,
        'presupuesto' => $presupuesto,
        // La diferencia entre la más barata y la más cara: el número que
        // dice cuánto está en juego en esta decisión.
        'diferencia'  => count($calculadas) > 1
            ? round(end($calculadas)['total'] - $calculadas[0]['total'], 2)
            : 0,
    ]);
    break;


/* ─── VER UNA SOLA ────────────────────────────────────────────────────── */

case 'ver':
    exigirMetodo('GET');

    $id = (int) ($_GET['id'] ?? 0);
    $personas = max(1, (int) ($_GET['personas'] ?? 1));

    $cotizacion = consultarUno('SELECT * FROM cotizaciones WHERE id = :i', [':i' => $id]);
    if (!$cotizacion) responderMal('Esa cotización no existe.', 404);

    $items = itemsDe($id);

    responderBien([
        'calculo' => calcularCotizacion($cotizacion, $items, $personas),
        'items'   => $items,
    ]);
    break;


/* ─── RENGLONES ───────────────────────────────────────────────────────── */

case 'guardar_item':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $cotizacion = campoEntero($datos, 'cotizacion_id', 1);
    $existe = consultarUno('SELECT id FROM cotizaciones WHERE id = :i',
                           [':i' => $cotizacion]);
    if (!$existe) responderMal('Esa cotización no existe.', 404);

    $valores = [
        'cotizacion_id' => $cotizacion,
        'concepto'      => campoTexto($datos, 'concepto', 200),
        'tipo'          => campoOpcion($datos, 'tipo',
                           ['por_persona','fijo','por_unidad','porcentaje'], 'fijo'),
        'monto'         => campoMonto($datos, 'monto'),
        'unidades'      => campoEntero($datos, 'unidades', 1, 9999, 1),
        'incluido'      => !empty($datos['incluido']) ? 1 : 0,
        'activo'        => !isset($datos['activo']) || !empty($datos['activo']) ? 1 : 0,
        'categoria'     => campoTexto($datos, 'categoria', 60),
        'notas'         => campoTexto($datos, 'notas', 300),
        'orden'         => campoEntero($datos, 'orden', 0, 999, 50),
    ];

    if ($valores['concepto'] === '') responderMal('El renglón necesita un concepto.', 400);

    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        actualizar('cotizacion_items', $id, $valores);
        responderBien(['id' => $id]);
    }

    responderBien(['id' => insertar('cotizacion_items', $valores)], 201);
    break;

case 'borrar_item':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    borrar('cotizacion_items', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Renglón eliminado.']);
    break;

case 'activar_item':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id = campoEntero($datos, 'id', 1);

    $item = consultarUno('SELECT activo FROM cotizacion_items WHERE id = :i',
                         [':i' => $id]);
    if (!$item) responderMal('Ese renglón no existe.', 404);

    $nuevo = ((int) $item['activo'] === 1) ? 0 : 1;
    actualizar('cotizacion_items', $id, ['activo' => $nuevo]);

    responderBien(['activo' => $nuevo === 1]);
    break;


/* ─── PASAR AL PRESUPUESTO ────────────────────────────────────────────── */

case 'a_presupuesto':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id       = campoEntero($datos, 'id', 1);
    $personas = campoEntero($datos, 'personas', 1, 2000, 1);

    $cotizacion = consultarUno('SELECT * FROM cotizaciones WHERE id = :i', [':i' => $id]);
    if (!$cotizacion) responderMal('Esa cotización no existe.', 404);

    $calculo = calcularCotizacion($cotizacion, itemsDe($id), $personas);

    /* Se crea el proveedor si no estaba, para que el gasto quede atado a
       alguien con teléfono y no a un nombre suelto. */
    $proveedorId = null;
    if (existeTabla('proveedores')) {
        $prov = consultarUno('SELECT id FROM proveedores WHERE nombre = :n',
                             [':n' => $cotizacion['proveedor']]);
        $proveedorId = $prov
            ? (int) $prov['id']
            : insertar('proveedores', [
                'nombre'      => $cotizacion['proveedor'],
                'servicio'    => $cotizacion['servicio'],
                'telefono'    => $cotizacion['telefono'],
                'monto_total' => $calculo['total'],
                'estado'      => 'contratado',
              ]);
    }

    $gastoId = insertar('gastos', [
        'concepto'      => $cotizacion['servicio'] . ' · ' . $cotizacion['proveedor'],
        'proveedor_id'  => $proveedorId,
        'presupuestado' => $calculo['total'],
        'monto_real'    => $calculo['total'],
        'notas'         => 'Desde la cotización, calculado para ' . $personas .
                           ' personas. Base ' . number_format($calculo['base'], 2) .
                           ', extras ' . number_format($calculo['extras'], 2) . '.',
    ]);

    // Y queda marcada como la elegida, desmarcando las otras del rubro.
    ejecutar('UPDATE cotizaciones SET elegida = 0 WHERE servicio = :s',
             [':s' => $cotizacion['servicio']]);
    ejecutar('UPDATE cotizaciones SET elegida = 1 WHERE id = :i', [':i' => $id]);

    anotarEnBitacora($yo, 'pasó una cotización al presupuesto', 'gastos', $gastoId,
                     $cotizacion['proveedor'] . ' · ' . number_format($calculo['total'], 2));

    responderBien([
        'gasto_id' => $gastoId,
        'total'    => $calculo['total'],
        'mensaje'  => 'Se agregó al presupuesto como gasto de ' .
                      number_format($calculo['total'], 2) . '.',
    ]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
