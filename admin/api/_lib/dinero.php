<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/DINERO.PHP · LO QUE TIENE QUE PENSAR IGUAL EN TODOS LADOS

   QUÉ HACE ESTE ARCHIVO
   Las reglas de dinero que más de un endpoint necesita, escritas una
   sola vez.

   POR QUÉ EXISTE
   Un gasto se puede crear desde cuatro lugares distintos: a mano en
   Presupuesto, al cargar un pago a un proveedor que todavía no tenía
   gasto, al generar un recibo, y al pasar una cotización al
   presupuesto. Los tres últimos son automáticos, y ninguno sabía del
   plan activo: escribían siempre en el Plan 1 porque esa es la columna
   por defecto. Con un segundo escenario abierto, un pago cargado con
   toda normalidad se guardaba en el plan que no se estaba mirando y
   desaparecía de la pantalla sin ningún aviso.

   Ese "sin ningún aviso" es lo que lo hacía grave: no era un error, era
   dinero que dejaba de estar. La regla —un gasto nace en el plan que
   está activo— tiene que ser una sola, y este archivo es donde vive.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';

/**
 * El presupuesto (escenario) que se está mirando.
 *
 * Sin la tabla `presupuestos` —instalación que no corrió esa
 * migración— hay un solo plan y es el 1, que es el valor por defecto de
 * la columna.
 *
 * @return int
 */
function presupuestoActivo() {
    if (!existeTabla('presupuestos')) return 1;
    $fila = consultarUno('SELECT id FROM presupuestos WHERE activo = 1 LIMIT 1');
    return $fila ? (int) $fila['id'] : 1;
}

/**
 * Le agrega a un gasto nuevo el plan en el que tiene que nacer.
 *
 * Se usa envolviendo los valores justo antes de insertar:
 *
 *   $gastoId = insertar('gastos', conPresupuestoActivo([
 *       'concepto' => …, 'proveedor_id' => …,
 *   ]));
 *
 * Si la instalación todavía no tiene la columna, devuelve los valores
 * tal cual: agregarla haría fallar el INSERT entero.
 *
 * @param array $valores
 * @return array
 */
function conPresupuestoActivo(array $valores) {
    if (!in_array('presupuesto_id', columnasDe('gastos'), true)) return $valores;

    $valores['presupuesto_id'] = presupuestoActivo();
    return $valores;
}

/**
 * Devuelve las filas con sus montos como números, no como texto.
 *
 * POR QUÉ HACE FALTA
 * PDO devuelve las columnas DECIMAL como cadenas: un gasto sin costo
 * real llega a la app como la cadena `"0.00"`, y en JavaScript toda
 * cadena no vacía es verdadera. Con eso, `monto_real || presupuestado`
 * —el modo en que la app decide qué costo mostrar— se quedaba con el
 * "0.00" y un gasto de $50.000 aparecía como **$0** en la lista y en el
 * buscador. No era un error de cálculo: el número estaba bien guardado
 * y bien sumado en los totales, que sí se castean. Solo la fila mentía.
 *
 * Se arregla del lado del servidor, que es donde ya se sabe qué columna
 * es dinero, en vez de pedirle a cada pantalla que se acuerde.
 *
 * @param array    $filas
 * @param string[] $columnas Cuáles son montos.
 * @return array
 */
function conMontosNumericos(array $filas, array $columnas) {
    foreach ($filas as &$fila) {
        foreach ($columnas as $columna) {
            if (isset($fila[$columna])) $fila[$columna] = (float) $fila[$columna];
        }
    }
    unset($fila);

    return $filas;
}


/* ══════════════════════════════════════════════════════════════════════
   LAS CIFRAS DEL PRESUPUESTO, CALCULADAS EN UN SOLO LUGAR

   POR QUÉ ESTO EXISTE
   La pantalla de inicio y la de Dinero contestaban distinto la misma
   pregunta. `presupuesto.php` calculaba el costo con el fallback al
   estimado y filtrando por plan activo; `estadisticas.php` usaba
   `SUM(monto_real)` a secas, sin fallback y sumando TODOS los
   escenarios juntos. Dos respuestas a "¿cuánto llevamos?" en dos
   pantallas seguidas, y ninguna forma de saber cuál creer.

   El desglose por categoría tenía el mismo problema por dentro: arriba
   decía "Cuesta $50,000" y la categoría de ese gasto decía "Gastado $0"
   con la barra en verde, porque el desglose no aplicaba el fallback.

   Acá está la definición ÚNICA de cada cifra. Quien necesite un número
   de dinero lo pide, no lo recalcula.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Cuánta GENTE va a la fiesta. Una sola definición, para todos.
 *
 * POR QUÉ EXISTE
 * Había tres fórmulas para esto, en tres archivos:
 *   · `SUM(adultos) + SUM(ninos)`      (_lib/dinero.php)
 *   · `SUM(adultos + ninos)`           (cotizador.php)
 *   · `SUM(CASE WHEN asiste=1 …)`      (estadisticas.php)
 * Hoy dan lo mismo porque las columnas son NOT NULL, pero la segunda
 * descarta la fila entera si alguna llegara a ser NULL y las otras no.
 * Y de acá salen dos divisores para el mismo concepto —el costo por
 * invitado de Dinero y el `real_pp` del cotizador—, que es justo el
 * tipo de divergencia que este módulo ya pagó caro.
 *
 * Se cuenta GENTE (adultos + niños), no confirmaciones: contar
 * "familia López" como una sola persona daría un número falso.
 *
 * @return int
 */
function genteQueAsiste() {
    if (!existeTabla('confirmaciones')) return 0;

    $fila = consultarUno(
        'SELECT COALESCE(SUM(adultos), 0) + COALESCE(SUM(ninos), 0) AS n
         FROM confirmaciones WHERE asiste = 1'
    );
    return (int) ($fila['n'] ?? 0);
}

/**
 * LA REGLA DEL COSTO, escrita una sola vez.
 *
 * Un gasto cuesta lo que costó de verdad (`monto_real`) o, mientras eso
 * no se sepa, lo que se presupuestó. NULLIF convierte el 0 —que es
 * "todavía no lo sé", no "es gratis"— en NULL para que COALESCE caiga
 * al estimado.
 *
 * Es un fragmento de SQL y no una función de PHP a propósito: la suma
 * tiene que ocurrir en la base, no trayendo mil filas al servidor.
 *
 * @param string $alias Prefijo de la tabla en la consulta ('g.' o '').
 * @return string
 */
function sqlCostoDeUnGasto($alias = '') {
    return "COALESCE(NULLIF({$alias}monto_real, 0), {$alias}presupuestado)";
}

/**
 * Todas las cifras de dinero del presupuesto activo, ya resueltas.
 *
 * Devuelve, en pesos:
 *   planeado   lo presupuestado, sin mirar lo real
 *   costo      lo que sale la fiesta (regla del costo, arriba)
 *   propio     lo que no tiene padrino asignado
 *   de_padrinos            lo que sí lo tiene, haya entregado o no
 *   prometido_padrinos     lo que los padrinos dijeron que van a poner
 *   entregado_padrinos     lo que de verdad entregaron
 *   pagado                 la plata que ya salió
 *   por_pagar              pagos cargados y todavía pendientes
 *   falta                  costo − pagado, LA cifra que manda
 *   bolsillo_si_nadie_mas_entrega   costo − entregado_padrinos
 *   sin_ningun_pago        cuántos gastos no tienen ni un pago cargado
 *   confirmados / costo_por_invitado
 *
 * SOBRE `falta` Y `por_pagar`
 * Son dos preguntas distintas y estaban una al lado de la otra, mismo
 * tamaño y mismo color, sin nada que las distinguiera:
 *   · `falta`     = todo lo que queda por pagar, esté cargado o no.
 *   · `por_pagar` = solo lo que YA está cargado como pago pendiente.
 * La segunda siempre es menor o igual, y la diferencia es el dinero que
 * se debe y ni siquiera está anotado. La que manda es `falta`.
 *
 * SOBRE LOS PADRINOS
 * `bolsillo_si_nadie_mas_entrega` resta lo ENTREGADO leído de la tabla
 * `padrinos`, no lo aplicado a gastos concretos. Restar las dos cosas
 * contaría dos veces al mismo padrino, y restar solo lo aplicado
 * ignoraba al padrino que ya pagó pero cuyo aporte todavía no se
 * enlazó a ningún gasto — el caso más común. Es el mismo criterio que
 * el resumen ejecutivo del PDF ya usaba, corrigiendo al servidor a
 * propósito (ver 13-exportar.js).
 *
 * @param int $activo Presupuesto activo.
 * @param bool $porPlan Si la instalación tiene presupuestos múltiples.
 * @return array
 */
function cifrasDelPresupuesto($activo, $porPlan) {
    /* Sin la tabla de gastos no hay nada que sumar: se devuelven las
       mismas claves en cero. Que una instalación a medio migrar muestre
       ceros es entendible; que reviente la pantalla de inicio, no. */
    if (!existeTabla('gastos')) return cifrasVacias();

    $costo  = sqlCostoDeUnGasto();
    $filtro = $porPlan ? ' WHERE presupuesto_id = :activo' : '';
    $args   = $porPlan ? [':activo' => $activo] : [];

    $t = consultarUno(
        "SELECT
           COALESCE(SUM(presupuestado), 0) AS planeado,
           COALESCE(SUM($costo), 0)        AS costo,
           COALESCE(SUM(CASE WHEN padrino_id IS NULL     THEN $costo ELSE 0 END), 0) AS propio,
           COALESCE(SUM(CASE WHEN padrino_id IS NOT NULL THEN $costo ELSE 0 END), 0) AS de_padrinos,
           COUNT(*) AS cuantos
         FROM gastos" . $filtro,
        $args
    );

    /* Los pagos heredan el presupuesto de su gasto. Un pago suelto (sin
       gasto) no pertenece a ningún plan y cuenta siempre: es más seguro
       mostrar de más que esconder plata que salió de verdad. */
    $filtroPagos = $porPlan ? ' AND (p.gasto_id IS NULL OR g.presupuesto_id = :activo)' : '';

    $pagos = existeTabla('pagos')
        ? consultarUno(
            "SELECT
               COALESCE(SUM(CASE WHEN p.estado = 'pagado'    THEN p.monto ELSE 0 END), 0) AS pagado,
               COALESCE(SUM(CASE WHEN p.estado = 'pendiente' THEN p.monto ELSE 0 END), 0) AS por_pagar,
               COALESCE(SUM(CASE WHEN p.estado = 'pendiente' THEN 1 ELSE 0 END), 0)       AS por_pagar_cuantos
             FROM pagos p LEFT JOIN gastos g ON g.id = p.gasto_id
             WHERE 1 = 1" . $filtroPagos,
            $args)
        : ['pagado' => 0, 'por_pagar' => 0, 'por_pagar_cuantos' => 0];

    /* Los padrinos son globales: apadrinan la fiesta, no un escenario.
       `monto_entregado` puede no existir todavía (instalación sin
       migrar): ahí se cae a la lectura vieja, "entregado" = todo. */
    $prometido = 0.0;
    $entregado = 0.0;
    $pendientes = ['monto' => 0, 'cuantos' => 0];

    if (existeTabla('padrinos')) {
        $hayEntregado = in_array('monto_entregado', columnasDe('padrinos'), true);
        $sqlEntregado = $hayEntregado
            ? 'monto_entregado'
            : "CASE WHEN estado = 'entregado' THEN monto ELSE 0 END";

        $p = consultarUno(
            "SELECT COALESCE(SUM(monto), 0)         AS prometido,
                    COALESCE(SUM($sqlEntregado), 0) AS entregado
             FROM padrinos WHERE tipo_aporte = 'dinero'"
        );
        $prometido = (float) $p['prometido'];
        $entregado = (float) $p['entregado'];

        $pendientes = consultarUno(
            "SELECT COALESCE(SUM(monto - $sqlEntregado), 0) AS monto, COUNT(*) AS cuantos
             FROM padrinos
             WHERE tipo_aporte = 'dinero' AND monto > $sqlEntregado"
        );
    }

    /* Los gastos que no tienen NI UN pago cargado. Es la zona gris que
       el PDF ya declaraba en vez de asumir: no significa que no se
       pagaron, significa que no se sabe. */
    $sinPago = existeTabla('pagos')
        ? consultarUno(
            "SELECT COUNT(*) AS cuantos, COALESCE(SUM($costo), 0) AS monto
             FROM gastos
             WHERE NOT EXISTS (SELECT 1 FROM pagos p WHERE p.gasto_id = gastos.id)" .
            ($porPlan ? ' AND presupuesto_id = :activo' : ''),
            $args)
        : ['cuantos' => (int) $t['cuantos'], 'monto' => $t['costo']];

    /* Cuánto sale por cada invitado QUE DE VERDAD VA: gente (adultos +
       niños), no confirmaciones — contar "familia López" como una sola
       persona daría un número falso. Sin nadie confirmado se deja en
       null explícito, en vez de dividir por cero o mostrar un $0 que
       parecería un error. */
    $personas = genteQueAsiste();

    $costoTotal = (float) $t['costo'];
    $pagadoTotal = (float) $pagos['pagado'];

    return [
        'planeado'    => (float) $t['planeado'],
        'costo'       => $costoTotal,
        'propio'      => (float) $t['propio'],
        'de_padrinos' => (float) $t['de_padrinos'],
        'cuantos_gastos' => (int) $t['cuantos'],

        'prometido_padrinos' => $prometido,
        'entregado_padrinos' => $entregado,
        'padrinos_pendientes'         => (float) $pendientes['monto'],
        'padrinos_pendientes_cuantos' => (int) $pendientes['cuantos'],

        'pagado'            => $pagadoTotal,
        'por_pagar'         => (float) $pagos['por_pagar'],
        'por_pagar_cuantos' => (int) $pagos['por_pagar_cuantos'],

        /* La cifra que manda: todo lo que queda por pagar de verdad.
         *
         * ⚡ NO PUEDE DAR NEGATIVA POR UNA MEZCLA DE ALCANCES
         * (2026-09-03). `costo` está filtrado por plan, pero `pagado`
         * incluye a propósito los pagos sueltos (sin gasto), que no
         * pertenecen a ningún plan. Es la decisión correcta —esconder
         * plata que salió de verdad sería peor— pero significa que la
         * resta puede dar negativa sin que nadie haya pagado de más:
         * basta con mirar un escenario chico teniendo pagos sueltos
         * grandes.
         *
         * Se corta en cero. "Falta pagar −$8,000" no es información:
         * es una pantalla que se contradice sola, y el caso real de
         * pagar de más lo cubre `pagado_de_mas`, que es explícito. */
        'falta' => round(max(0, $costoTotal - $pagadoTotal), 2),

        /* Cuánto se pagó por encima del costo cargado, si es que pasó.
           Separado de `falta` porque son dos hechos distintos y meterlos
           en un solo número con signo obligaba a interpretarlo. */
        'pagado_de_mas' => round(max(0, $pagadoTotal - $costoTotal), 2),

        /* Lo mismo acá: `entregado` es global (los padrinos apadrinan la
           fiesta, no un escenario) y `costo` es por plan. Con un plan
           chico y padrinos generosos, la resta se iba abajo de cero. */
        'bolsillo_si_nadie_mas_entrega' => round(max(0, $costoTotal - $entregado), 2),

        'sin_ningun_pago'        => (int) $sinPago['cuantos'],
        'sin_ningun_pago_monto'  => (float) $sinPago['monto'],

        'confirmados'        => $personas,
        'costo_por_invitado' => $personas > 0 ? round($costoTotal / $personas, 2) : null,
    ];
}

/**
 * Las mismas claves que cifrasDelPresupuesto(), todas en cero.
 *
 * Existe para que quien consuma esto no tenga que preguntarse nunca si
 * una clave va a estar: siempre están todas.
 *
 * @return array
 */
function cifrasVacias() {
    return [
        'planeado' => 0.0, 'costo' => 0.0, 'propio' => 0.0, 'de_padrinos' => 0.0,
        'cuantos_gastos' => 0,
        'prometido_padrinos' => 0.0, 'entregado_padrinos' => 0.0,
        'padrinos_pendientes' => 0.0, 'padrinos_pendientes_cuantos' => 0,
        'pagado' => 0.0, 'por_pagar' => 0.0, 'por_pagar_cuantos' => 0,
        'falta' => 0.0, 'pagado_de_mas' => 0.0,
        'bolsillo_si_nadie_mas_entrega' => 0.0,
        'sin_ningun_pago' => 0, 'sin_ningun_pago_monto' => 0.0,
        'confirmados' => 0, 'costo_por_invitado' => null,
    ];
}

/**
 * El desglose por categoría, que SUMA lo mismo que el total de arriba.
 *
 * DOS COSAS QUE ESTABAN MAL
 * 1. El desglose usaba `SUM(monto_real)` sin el fallback al estimado.
 *    Arriba decía "Cuesta $50,000" y la categoría de ese mismo gasto
 *    decía "Gastado $0", con la barra en verde: el gasto existía, tenía
 *    su presupuestado cargado, y el desglose lo contaba como cero.
 * 2. Los gastos SIN categoría no aparecían en ningún renglón — y los
 *    tres flujos automáticos (pago a proveedor, recibo, cotización)
 *    crean el gasto justamente sin categoría. Plata que estaba en el
 *    total y en ninguna fila del desglose.
 *
 * Ahora todo gasto aparece: los que no tienen categoría caen en un
 * renglón "Sin categoría" (con id null), que es visible y se puede
 * arreglar de un toque.
 *
 * @param int  $activo
 * @param bool $porPlan  ⚠️ Con `true`, esta función emite
 *   `presupuesto_id` sobre **DOS** tablas: `gastos` Y `categorias_gasto`.
 *   Quien la llama tiene que haber comprobado las dos columnas, no una.
 *   (presupuesto.php lo hace; estadisticas.php comprobaba solo `gastos`
 *   y por eso Inicio podía reventar mientras Dinero degradaba bien.)
 *   Igual se verifica acá abajo, porque un contrato que solo vive en un
 *   comentario no es un contrato.
 * @return array
 */
function categoriasConGasto($activo, $porPlan) {
    if (!existeTabla('categorias_gasto') || !existeTabla('gastos')) return [];

    /* Red de seguridad del contrato de arriba: si falta la columna en
       cualquiera de las dos tablas, se ignora el plan y se devuelven
       todas las categorías. Se ve de más, que es entendible; reventar
       la pantalla, no. */
    if ($porPlan
        && (!in_array('presupuesto_id', columnasDe('gastos'), true)
            || !in_array('presupuesto_id', columnasDe('categorias_gasto'), true))) {
        $porPlan = false;
    }

    $costo = sqlCostoDeUnGasto('g.');

    /* ⚠️ DOS NOMBRES PARA EL MISMO VALOR, Y ES OBLIGATORIO.
       El plan se filtra en DOS lugares de esta consulta (el ON del JOIN
       y el WHERE), y PDO está en modo no emulado (ATTR_EMULATE_PREPARES
       => false, ver bd.php). En ese modo, un named parameter repetido
       necesita UN VALOR POR APARICIÓN: con `:activo` dos veces y una
       sola entrada en el array, PDO tira SQLSTATE[HY093] y se cae la
       consulta entera — que acá significa la pantalla de Dinero Y la de
       Inicio, porque las dos llaman a esta función. */
    $args = $porPlan
        ? [':plan_gasto' => $activo, ':plan_categoria' => $activo]
        : [];

    /* El filtro de plan va en el ON del JOIN y no en el WHERE: en un
       LEFT JOIN, ponerlo en el WHERE descarta las categorías que
       todavía no tienen ningún gasto en este plan, y una categoría
       vacía tiene que aparecer igual para poder cargarle el primero. */
    $categorias = consultarTodo(
        "SELECT c.id, c.nombre, c.techo, c.orden,
                COALESCE(SUM($costo), 0)            AS gastado,
                COALESCE(SUM(g.presupuestado), 0)   AS planeado,
                COUNT(g.id)                         AS cuantos_gastos
         FROM categorias_gasto c
         LEFT JOIN gastos g ON g.categoria_id = c.id" .
            ($porPlan ? ' AND g.presupuesto_id = :plan_gasto' : '') .
        ($porPlan ? ' WHERE c.presupuesto_id = :plan_categoria' : '') .
        ' GROUP BY c.id, c.nombre, c.techo, c.orden
          ORDER BY c.orden, c.nombre',
        $args
    );

    $huerfanos = consultarUno(
        "SELECT COALESCE(SUM($costo), 0)          AS gastado,
                COALESCE(SUM(g.presupuestado), 0) AS planeado,
                COUNT(g.id)                       AS cuantos_gastos
         FROM gastos g
         WHERE g.categoria_id IS NULL" .
        ($porPlan ? ' AND g.presupuesto_id = :plan_gasto' : ''),
        // Solo el que esta consulta usa: un valor de más también es HY093.
        $porPlan ? [':plan_gasto' => $activo] : []
    );

    if ((int) $huerfanos['cuantos_gastos'] > 0) {
        $categorias[] = [
            // id null: no es una categoría de verdad, es lo que le
            // falta categoría. La app lo usa para saber que esa fila no
            // se puede editar ni borrar como las otras.
            'id'             => null,
            'nombre'         => 'Sin categoría',
            'techo'          => 0,
            'orden'          => 9999,
            'gastado'        => $huerfanos['gastado'],
            'planeado'       => $huerfanos['planeado'],
            'cuantos_gastos' => (int) $huerfanos['cuantos_gastos'],
        ];
    }

    return conMontosNumericos($categorias, ['techo', 'gastado', 'planeado']);
}
