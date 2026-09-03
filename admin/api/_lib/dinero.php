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
