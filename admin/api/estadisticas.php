<?php
/* ══════════════════════════════════════════════════════════════════════
   ESTADISTICAS.PHP · LOS NÚMEROS DEL TABLERO

   QUÉ HACE ESTE ARCHIVO
   Junta en UNA sola respuesta todo lo que muestra la pantalla de
   Resumen: cuántos confirmaron, cómo va el dinero, qué está por vencer.

   POR QUÉ TODO JUNTO Y NO UN ENDPOINT POR DATO
   Porque el Resumen se abre cada vez que se entra a la app. Con datos
   sueltos serían seis viajes al servidor; así es uno. En una conexión de
   celular esa diferencia se nota de verdad.

   POR QUÉ CADA BLOQUE COMPRUEBA SI SU TABLA EXISTE
   Para que el panel funcione antes de correr migracion.sql, y para que
   si falta una tabla se pierda ese bloque nada más, en vez de romperse
   la pantalla entera.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo = exigirSesion();
exigirMetodo('GET');

/* Si ve el dinero o no.
 *
 * presupuesto.php exige ser administradora, pero las MISMAS cifras
 * salían por acá con solo tener sesión: total gastado, lo que sale del
 * bolsillo, lo que falta que entreguen los padrinos. Cerrar una puerta
 * y dejar la ventana abierta no es cerrar nada.
 *
 * Se sigue el patrón que ya usa contactos.php. */
$vePlata = ($yo['rol'] ?? '') === 'admin';

/** Con cuántos días de anticipación se considera "próximo" algo. */
$DIAS_PROXIMOS = 14;

$resultado = [];


/* ─── 1. INVITADOS ────────────────────────────────────────────────────── */

$resultado['invitados'] = ['hay' => false];

if (existeTabla('confirmaciones')) {
    $columnas = columnasDe('confirmaciones');
    $tieneAsiste = in_array('asiste', $columnas, true);

    $totales = consultarUno(
        'SELECT
           COUNT(*) AS respuestas' .
           ($tieneAsiste ? ',
           SUM(CASE WHEN asiste = 1 THEN 1 ELSE 0 END) AS si_asisten,
           SUM(CASE WHEN asiste = 0 THEN 1 ELSE 0 END) AS no_asisten,
           SUM(CASE WHEN asiste = 1 THEN adultos ELSE 0 END) AS adultos,
           SUM(CASE WHEN asiste = 1 THEN ninos   ELSE 0 END) AS ninos' : '') . '
         FROM confirmaciones'
    );

    $adultos = (int) ($totales['adultos'] ?? 0);
    $ninos   = (int) ($totales['ninos'] ?? 0);

    $resultado['invitados'] = [
        'hay'         => true,
        'respuestas'  => (int) ($totales['respuestas'] ?? 0),
        'si_asisten'  => (int) ($totales['si_asisten'] ?? 0),
        'no_asisten'  => (int) ($totales['no_asisten'] ?? 0),
        'adultos'     => $adultos,
        'ninos'       => $ninos,
        // Este es EL número: cuántas sillas y cuántos platos hay que
        // pedirle al salón y al banquete.
        'personas'    => $adultos + $ninos,
    ];

    /* Desglose de menús. Se cuenta sobre la columna resumen_menus, que
       guarda un texto tipo "2 pollo, 1 vegetariano". Se hace en PHP y no
       en SQL porque el formato es texto libre y varía. */
    if (in_array('resumen_menus', $columnas, true) && $tieneAsiste) {
        $filas = consultarTodo(
            'SELECT resumen_menus FROM confirmaciones WHERE asiste = 1'
        );

        $porMenu = [];
        foreach ($filas as $fila) {
            foreach (explode(',', (string) $fila['resumen_menus']) as $trozo) {
                $trozo = trim($trozo);
                if ($trozo === '') continue;

                // "2 pollo" → cantidad 2, menú "pollo".
                if (preg_match('/^(\d+)\s*(.+)$/u', $trozo, $partes)) {
                    $nombre   = mb_strtolower(trim($partes[2]));
                    $cantidad = (int) $partes[1];
                } else {
                    $nombre   = mb_strtolower($trozo);
                    $cantidad = 1;
                }

                if (!isset($porMenu[$nombre])) $porMenu[$nombre] = 0;
                $porMenu[$nombre] += $cantidad;
            }
        }

        arsort($porMenu);
        $resultado['invitados']['menus'] = $porMenu;
    }

    /* Alergias: se listan enteras, no se cuentan. Un solo invitado
       celíaco importa tanto como veinte, y hay que poder leerlo tal cual
       para pasárselo al banquete. */
    if (in_array('alergias', $columnas, true)) {
        $resultado['invitados']['alergias'] = consultarTodo(
            "SELECT nombre, alergias FROM confirmaciones
             WHERE alergias <> '' AND alergias IS NOT NULL
               AND LOWER(alergias) NOT IN ('ninguna', 'ninguno', 'no', 'n/a', '-')
             ORDER BY nombre"
        );
    }
}


/* ─── 2. DINERO ───────────────────────────────────────────────────────── */

$resultado['dinero'] = ['hay' => false];

/* Sin permiso no se consulta siquiera: lo que no se lee no se puede
   filtrar por error más adelante. */
if ($vePlata && existeTabla('gastos')) {
    /* Las dos cifras que de verdad importan, y son distintas:
         · costo   = lo que sale la fiesta entera.
         · propio  = lo que pone la familia, o sea el costo menos lo que
                     cubren los padrinos.
       Un presupuesto que solo muestra el costo asusta de más; uno que
       solo muestra lo propio esconde que alguien puede echarse atrás. */
    $totales = consultarUno(
        'SELECT
           COALESCE(SUM(presupuestado), 0) AS presupuestado,
           COALESCE(SUM(monto_real), 0)    AS costo,
           COALESCE(SUM(CASE WHEN padrino_id IS NULL THEN monto_real ELSE 0 END), 0) AS propio,
           COALESCE(SUM(CASE WHEN padrino_id IS NOT NULL THEN monto_real ELSE 0 END), 0) AS de_padrinos
         FROM gastos'
    );

    $resultado['dinero'] = [
        'hay'           => true,
        'presupuestado' => (float) $totales['presupuestado'],
        'costo'         => (float) $totales['costo'],
        'propio'        => (float) $totales['propio'],
        'de_padrinos'   => (float) $totales['de_padrinos'],
    ];

    /* Categorías pasadas de su techo. Es el aviso de sobregiro. */
    if (existeTabla('categorias_gasto')) {
        $resultado['dinero']['categorias'] = consultarTodo(
            'SELECT c.id, c.nombre, c.techo,
                    COALESCE(SUM(g.monto_real), 0) AS gastado
             FROM categorias_gasto c
             LEFT JOIN gastos g ON g.categoria_id = c.id
             GROUP BY c.id, c.nombre, c.techo
             HAVING c.techo > 0 OR gastado > 0
             ORDER BY c.orden, c.nombre'
        );
    }

    /* Lo que un padrino prometió pero todavía no entregó. */
    if (existeTabla('padrinos')) {
        $pendiente = consultarUno(
            "SELECT COALESCE(SUM(monto), 0) AS monto, COUNT(*) AS cuantos
             FROM padrinos
             WHERE estado <> 'entregado' AND tipo_aporte = 'dinero'"
        );
        $resultado['dinero']['padrinos_pendientes'] = [
            'monto'   => (float) $pendiente['monto'],
            'cuantos' => (int) $pendiente['cuantos'],
        ];
    }
}


/* ─── 3. PAGOS POR VENCER ─────────────────────────────────────────────── */

$resultado['pagos'] = [];

// Los pagos por vencer son dinero: mismo permiso.
if ($vePlata && existeTabla('pagos')) {
    $resultado['pagos'] = consultarTodo(
        "SELECT p.id, p.concepto, p.monto, p.fecha_limite, g.concepto AS gasto
         FROM pagos p
         LEFT JOIN gastos g ON g.id = p.gasto_id
         WHERE p.estado = 'pendiente'
           AND p.fecha_limite IS NOT NULL
           AND p.fecha_limite <= DATE_ADD(CURDATE(), INTERVAL :dias DAY)
         ORDER BY p.fecha_limite",
        [':dias' => $DIAS_PROXIMOS]
    );
}


/* ─── 4. TAREAS ATRASADAS Y PRÓXIMAS ──────────────────────────────────── */

$resultado['tareas'] = [];

if (existeTabla('tareas')) {
    $resultado['tareas'] = consultarTodo(
        "SELECT id, titulo, responsable, fecha_limite, prioridad, estado
         FROM tareas
         WHERE estado <> 'hecha'
           AND fecha_limite IS NOT NULL
           AND fecha_limite <= DATE_ADD(CURDATE(), INTERVAL :dias DAY)
         ORDER BY fecha_limite",
        [':dias' => $DIAS_PROXIMOS]
    );
}


/* ─── 5. AGENDA PRÓXIMA ───────────────────────────────────────────────── */

$resultado['agenda'] = [];

if (existeTabla('agenda')) {
    $resultado['agenda'] = consultarTodo(
        'SELECT id, titulo, fecha, hora, lugar
         FROM agenda
         WHERE fecha >= CURDATE()
           AND fecha <= DATE_ADD(CURDATE(), INTERVAL :dias DAY)
         ORDER BY fecha, hora',
        [':dias' => $DIAS_PROXIMOS]
    );
}


/* ─── 6. REGALOS SIN AGRADECER ────────────────────────────────────────── */

if (existeTabla('regalos')) {
    $fila = consultarUno('SELECT COUNT(*) AS n FROM regalos WHERE agradecido = 0');
    $resultado['regalos_sin_agradecer'] = (int) ($fila['n'] ?? 0);
}


/* ─── 6b. LA LÍNEA DE TIEMPO ──────────────────────────────────────────── */

/* Todo lo que tiene fecha, junto y en orden.
 *
 * POR QUÉ ESTO EXISTE APARTE DE LOS BLOQUES DE ARRIBA
 * Los bloques anteriores contestan "¿qué está por vencer?" y cortan a
 * los 14 días. Esta lista contesta otra pregunta: "¿qué viene, en qué
 * orden, de acá hasta la fiesta?". Sin ella, un pago grande a 40 días
 * no aparece en ningún lado hasta que ya está encima.
 *
 * Se junta de seis tablas distintas en una sola lista ordenada por
 * fecha. La app la agrupa después en atrasado / esta semana / este mes /
 * más adelante. */

$linea = [];

/**
 * Agrega un hito a la línea de tiempo.
 *
 * @param array  &$linea
 * @param string $fecha  AAAA-MM-DD
 * @param string $tipo   Para el color y el ícono.
 * @param string $texto
 * @param string $detalle
 * @param string $vistaDestino  A qué pestaña lleva al tocarlo.
 * @param string $seccion
 * @return void
 */
function agregarHito(&$linea, $fecha, $tipo, $texto, $detalle, $vistaDestino, $seccion) {
    if (!$fecha) return;
    $linea[] = [
        'fecha'   => substr($fecha, 0, 10),
        'tipo'    => $tipo,
        'texto'   => $texto,
        'detalle' => $detalle,
        'ir_a'    => $vistaDestino,
        'seccion' => $seccion,
    ];
}

if ($vePlata && existeTabla('pagos')) {
    foreach (consultarTodo(
        "SELECT p.concepto, p.monto, p.fecha_limite, g.concepto AS gasto
         FROM pagos p LEFT JOIN gastos g ON g.id = p.gasto_id
         WHERE p.estado = 'pendiente' AND p.fecha_limite IS NOT NULL"
    ) as $p) {
        agregarHito($linea, $p['fecha_limite'], 'pago',
            $p['concepto'] ?: ($p['gasto'] ?: 'Pago'),
            '$' . number_format((float) $p['monto'], 0),
            'dinero', 'pagos');
    }
}

if (existeTabla('tareas')) {
    foreach (consultarTodo(
        "SELECT titulo, responsable, fecha_limite FROM tareas
         WHERE estado <> 'hecha' AND fecha_limite IS NOT NULL"
    ) as $t) {
        agregarHito($linea, $t['fecha_limite'], 'tarea',
            $t['titulo'], $t['responsable'] ?: '', 'evento', 'tareas');
    }
}

if (existeTabla('agenda')) {
    foreach (consultarTodo(
        'SELECT titulo, fecha, hora, lugar FROM agenda WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    ) as $a) {
        $detalle = trim(($a['hora'] ? substr($a['hora'], 0, 5) . ' ' : '') . ($a['lugar'] ?: ''));
        agregarHito($linea, $a['fecha'], 'agenda', $a['titulo'], $detalle, 'evento', 'agenda');
    }
}

if (existeTabla('citas_arreglo')) {
    foreach (consultarTodo(
        "SELECT titulo, tipo, fecha, lugar FROM citas_arreglo
         WHERE estado = 'pendiente' AND fecha IS NOT NULL"
    ) as $c) {
        agregarHito($linea, $c['fecha'], 'vestido',
            $c['titulo'] ?: ucfirst($c['tipo']), $c['lugar'] ?: '',
            'evento', 'citas_arreglo');
    }
}

if (existeTabla('ensayos')) {
    foreach (consultarTodo(
        'SELECT fecha, hora, lugar FROM ensayos WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    ) as $e) {
        $detalle = trim(($e['hora'] ? substr($e['hora'], 0, 5) . ' ' : '') . ($e['lugar'] ?: ''));
        agregarHito($linea, $e['fecha'], 'ensayo', 'Ensayo del vals', $detalle,
            'evento', 'ensayos');
    }
}

if (existeTabla('requisitos_ceremonia')) {
    foreach (consultarTodo(
        "SELECT requisito, fecha_limite FROM requisitos_ceremonia
         WHERE estado <> 'listo' AND fecha_limite IS NOT NULL"
    ) as $r) {
        agregarHito($linea, $r['fecha_limite'], 'papeles',
            $r['requisito'], 'Requisito de la iglesia',
            'evento', 'requisitos_ceremonia');
    }
}

// La fiesta misma, que es el hito que ordena todos los demás.
agregarHito($linea, '2026-10-24', 'fiesta',
    'Los XV de Ania', 'Salones Alvi · 5:00 PM', '', '');

// Del más cercano al más lejano.
usort($linea, function ($a, $b) {
    return strcmp($a['fecha'], $b['fecha']);
});

$resultado['linea_de_tiempo'] = $linea;


/* ─── 7. CUÁNTO FALTA ─────────────────────────────────────────────────── */

/* La fecha vive en el código del panel (codigo/01-configuracion.js) y se
   repite acá para que el servidor pueda calcular avisos por su cuenta,
   sin depender de que haya un teléfono abierto. */
$fecha = new DateTime('2026-10-24 17:00:00');
$hoy   = new DateTime('today');

$resultado['dias_para_la_fiesta'] = (int) $hoy->diff(
    new DateTime($fecha->format('Y-m-d'))
)->format('%r%a');


responderBien($resultado);
