<?php
/* ══════════════════════════════════════════════════════════════════════
   HOY.PHP · LAS TRES COSAS QUE IMPORTAN AHORA

   QUÉ HACE ESTE ARCHIVO
   Contesta una sola pregunta: "¿qué tengo que hacer hoy?".

   POR QUÉ EXISTE, SI YA ESTÁ EL RESUMEN
   El Resumen muestra el estado completo: invitados, dinero, pendientes,
   línea de tiempo. Está bien para sentarse a mirar cómo viene todo,
   pero es demasiado para el momento en que uno abre la app con una mano
   mientras habla por teléfono con el salón.

   Esto devuelve POCAS cosas y ya priorizadas. Si hay quince pendientes,
   igual devuelve las tres más urgentes: una lista de quince es una
   lista que no se lee.

   TAMBIÉN ARMA LA LISTA DEL DÍA ANTERIOR
   Cuando faltan pocos días, cambia de tono: en vez de "qué hacés hoy"
   pasa a "qué falta para que esto salga bien", con la lista de
   verificación final armada con lo que ya está cargado.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo = exigirSesion();
exigirMetodo('GET');

/* Si ve el dinero o no. Mismo motivo que en estadisticas.php: las
   cifras que presupuesto.php protege salían por acá sin ningún
   control —pagos pendientes, montos de padrinos, cuánto falta pagar—.
   Se sigue el patrón de contactos.php, ahora con el permiso especial
   del organigrama (Bloque 1) en vez de solo mirar el rol: una cuenta
   de Tesorería sin ser admin también tiene que poder ver esto. */
$vePlata = tieneEspecial($yo, 'ver_dinero');

const DIA_DE_LA_FIESTA = '2026-10-24';

$hoy = date('Y-m-d');
$diasQueFaltan = (int) (new DateTime('today'))
    ->diff(new DateTime(DIA_DE_LA_FIESTA))->format('%r%a');

/* Cada cosa que se devuelve lleva su urgencia. La app las ordena por
   ese número, así que agregar una fuente nueva no obliga a tocar el
   orden en ningún lado.

   0 = atrasado · 1 = hoy · 2 = esta semana */
$pendientes = [];

/**
 * Agrega algo a la lista del día.
 *
 * @param array  &$lista
 * @param int    $urgencia
 * @param string $tipo
 * @param string $texto
 * @param string $detalle
 * @param string $vista
 * @param string $seccion
 * @param int    $id
 * @return void
 */
function pendiente(&$lista, $urgencia, $tipo, $texto, $detalle, $vista, $seccion, $id = 0) {
    $lista[] = [
        'urgencia' => $urgencia, 'tipo' => $tipo, 'texto' => $texto,
        'detalle'  => $detalle, 'ir_a' => $vista, 'seccion' => $seccion,
        'id'       => $id,
    ];
}


/* ─── PAGOS ───────────────────────────────────────────────────────────── */

if ($vePlata && existeTabla('pagos')) {
    foreach (consultarTodo(
        "SELECT p.id, p.concepto, p.monto, p.fecha_limite, g.concepto AS gasto
         FROM pagos p LEFT JOIN gastos g ON g.id = p.gasto_id
         WHERE p.estado = 'pendiente' AND p.fecha_limite IS NOT NULL
           AND p.fecha_limite <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         ORDER BY p.fecha_limite"
    ) as $p) {
        $urgencia = $p['fecha_limite'] < $hoy ? 0
                  : ($p['fecha_limite'] === $hoy ? 1 : 2);

        pendiente($pendientes, $urgencia, 'pago',
            $p['concepto'] ?: ($p['gasto'] ?: 'Pago'),
            '$' . number_format((float) $p['monto'], 0),
            'dinero', 'pagos', (int) $p['id']);
    }
}


/* ─── TAREAS ──────────────────────────────────────────────────────────── */

if (existeTabla('tareas')) {
    foreach (consultarTodo(
        "SELECT id, titulo, responsable, fecha_limite FROM tareas
         WHERE estado <> 'hecha' AND fecha_limite IS NOT NULL
           AND fecha_limite <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         ORDER BY FIELD(prioridad,'alta','media','baja'), fecha_limite"
    ) as $t) {
        $urgencia = $t['fecha_limite'] < $hoy ? 0
                  : ($t['fecha_limite'] === $hoy ? 1 : 2);

        pendiente($pendientes, $urgencia, 'tarea', $t['titulo'],
            $t['responsable'] ?: '', 'evento', 'tareas', (int) $t['id']);
    }
}


/* ─── AGENDA, ENSAYOS Y CITAS DE HOY ──────────────────────────────────── */

if (existeTabla('agenda')) {
    foreach (consultarTodo(
        'SELECT id, titulo, fecha, hora, lugar FROM agenda
         WHERE fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         ORDER BY fecha, hora'
    ) as $a) {
        pendiente($pendientes, $a['fecha'] === $hoy ? 1 : 2, 'agenda',
            $a['titulo'],
            trim(($a['hora'] ? substr($a['hora'], 0, 5) . ' ' : '') . ($a['lugar'] ?: '')),
            'evento', 'agenda', (int) $a['id']);
    }
}

if (existeTabla('ensayos')) {
    foreach (consultarTodo(
        'SELECT id, fecha, hora, lugar FROM ensayos
         WHERE fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)'
    ) as $e) {
        pendiente($pendientes, $e['fecha'] === $hoy ? 1 : 2, 'ensayo',
            'Ensayo del vals',
            trim(($e['hora'] ? substr($e['hora'], 0, 5) . ' ' : '') . ($e['lugar'] ?: '')),
            'evento', 'ensayos', (int) $e['id']);
    }
}

if (existeTabla('citas_arreglo')) {
    foreach (consultarTodo(
        "SELECT id, titulo, tipo, fecha, hora, lugar FROM citas_arreglo
         WHERE estado = 'pendiente' AND fecha IS NOT NULL
           AND fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
    ) as $c) {
        pendiente($pendientes, $c['fecha'] === $hoy ? 1 : 2, 'vestido',
            $c['titulo'] ?: ucfirst($c['tipo']),
            trim(($c['hora'] ? substr($c['hora'], 0, 5) . ' ' : '') . ($c['lugar'] ?: '')),
            'evento', 'citas_arreglo', (int) $c['id']);
    }
}


/* ─── ALARMAS DE HOY ──────────────────────────────────────────────────── */

if (existeTabla('alarmas')) {
    foreach (consultarTodo(
        'SELECT id, titulo, cuando FROM alarmas
         WHERE activa = 1 AND DATE(cuando) = CURDATE()
         ORDER BY cuando'
    ) as $a) {
        pendiente($pendientes, 1, 'alarma', $a['titulo'],
            substr($a['cuando'], 11, 5), '', '', (int) $a['id']);
    }
}


/* ─── A QUIÉN LLAMAR ──────────────────────────────────────────────────── */

/* Los padrinos que dijeron que sí pero todavía no entregaron. Es la
   gestión que más se posterga y la que más plata mueve. */
$aQuienLlamar = [];

if ($vePlata && existeTabla('padrinos')) {
    foreach (consultarTodo(
        "SELECT id, nombre, telefono, apadrina, monto FROM padrinos
         WHERE estado = 'hablado' AND telefono <> ''
         ORDER BY monto DESC LIMIT 3"
    ) as $p) {
        $aQuienLlamar[] = [
            'nombre'   => $p['nombre'],
            'telefono' => $p['telefono'],
            'porque'   => 'Todavía no confirmó lo del ' . ($p['apadrina'] ?: 'aporte'),
        ];
    }
}


/* ─── LA LISTA FINAL, CUANDO YA FALTA POCO ────────────────────────────── */

$listaFinal = [];

if ($diasQueFaltan >= 0 && $diasQueFaltan <= 14) {

    /**
     * Agrega un punto a la lista de verificación.
     *
     * @param array  &$lista
     * @param string $que
     * @param bool   $listo
     * @param string $detalle
     * @return void
     */
    $revisar = function (&$lista, $que, $listo, $detalle = '') {
        $lista[] = ['que' => $que, 'listo' => $listo, 'detalle' => $detalle];
    };

    if (existeTabla('confirmaciones')) {
        $sinResponder = consultarUno(
            "SELECT COUNT(*) AS n FROM confirmaciones
             WHERE asiste = 0 AND (codigo IS NULL OR codigo = '')"
        );
        $gente = consultarUno(
            'SELECT COALESCE(SUM(adultos + ninos), 0) AS n
             FROM confirmaciones WHERE asiste = 1'
        );
        $revisar($listaFinal, 'Número final para el banquete',
            (int) $gente['n'] > 0, (int) $gente['n'] . ' personas');
    }

    if (existeTabla('asignacion_mesas') && existeTabla('confirmaciones')) {
        $sinMesa = consultarUno(
            'SELECT COUNT(*) AS n FROM confirmaciones c
             LEFT JOIN asignacion_mesas a ON a.confirmacion_id = c.id
             WHERE c.asiste = 1 AND a.id IS NULL'
        );
        $revisar($listaFinal, 'Todos con mesa asignada',
            (int) $sinMesa['n'] === 0,
            (int) $sinMesa['n'] > 0 ? (int) $sinMesa['n'] . ' sin mesa' : '');
    }

    if ($vePlata && existeTabla('pagos')) {
        $sinPagar = consultarUno(
            "SELECT COUNT(*) AS n, COALESCE(SUM(monto), 0) AS monto
             FROM pagos WHERE estado = 'pendiente'"
        );
        $revisar($listaFinal, 'Todo pagado',
            (int) $sinPagar['n'] === 0,
            (int) $sinPagar['n'] > 0
                ? (int) $sinPagar['n'] . ' pagos · $' .
                  number_format((float) $sinPagar['monto'], 0)
                : '');
    }

    if (existeTabla('requisitos_ceremonia')) {
        $faltan = consultarUno(
            "SELECT COUNT(*) AS n FROM requisitos_ceremonia WHERE estado <> 'listo'"
        );
        $revisar($listaFinal, 'Papeles de la iglesia',
            (int) $faltan['n'] === 0,
            (int) $faltan['n'] > 0 ? (int) $faltan['n'] . ' sin entregar' : '');
    }

    if (existeTabla('cronograma')) {
        $momentos = consultarUno('SELECT COUNT(*) AS n FROM cronograma');
        $revisar($listaFinal, 'Cronograma del día armado',
            (int) $momentos['n'] > 0,
            (int) $momentos['n'] . ' momentos');
    }

    if (existeTabla('musica')) {
        $vals = consultarUno("SELECT COUNT(*) AS n FROM musica WHERE momento = 'vals'");
        $revisar($listaFinal, 'Canción del vals elegida', (int) $vals['n'] > 0);
    }

    if (existeTabla('corte_honor')) {
        $sinVestir = consultarUno(
            "SELECT COUNT(*) AS n FROM corte_honor WHERE vestuario <> 'listo'"
        );
        $total = consultarUno('SELECT COUNT(*) AS n FROM corte_honor');
        if ((int) $total['n'] > 0) {
            $revisar($listaFinal, 'Corte de honor con su vestuario',
                (int) $sinVestir['n'] === 0,
                (int) $sinVestir['n'] > 0 ? (int) $sinVestir['n'] . ' sin listo' : '');
        }
    }

    if (existeTabla('tomas_foto')) {
        $tomas = consultarUno('SELECT COUNT(*) AS n FROM tomas_foto');
        $revisar($listaFinal, 'Lista de fotos para el fotógrafo',
            (int) $tomas['n'] > 0, (int) $tomas['n'] . ' tomas');
    }
}


/* ─── LA TARJETA DE ESTADO DE LA PANTALLA HOY ─────────────────────────── */

/* Fase 2 del rediseño: las tres cifras grandes de arriba de Hoy —
   llegaron/mesas/alergias— en un solo bloque, para que esa pantalla
   siga siendo UNA sola petición y sirva con mala señal (ver la nota
   grande al principio del archivo sobre por qué todo va junto). */
$dia = [
    'llegaron'   => 0,   // PERSONAS que ya entraron (no familias: ver abajo)
    'grupos_llegaron' => 0,
    'esperados'  => 0,
    'mesas_ocupadas' => 0,
    'mesas_total'     => 0,
    'alergias_activas' => 0,
    'pases_reintentados' => 0,
];

if (existeTabla('llegadas') && existeTabla('confirmaciones')) {
    /* ⚠️ ESTE COUNT(*) CONTABA FAMILIAS Y SE MOSTRABA CONTRA PERSONAS
       (corregido 2026-09-03). Es la cifra más grande de la pantalla del día
       del evento —"llegaron X de Y", con barra de progreso— y comparaba
       unidades distintas: familias marcadas contra personas esperadas. Con
       120 personas en 40 familias no podía pasar nunca de 40/120, y la barra
       marcaba 33 % con el salón lleno. Ver la misma corrección en
       api/llegadas.php, acción 'resumen'.

       Marcar el pase de una familia significa que la familia entró: se suman
       sus adultos + niños. Los grupos se guardan aparte porque son otra cosa
       —cuántas veces se escaneó— y sirven para el detalle. */
    $filaLlegaron = consultarUno(
        'SELECT COALESCE(SUM(c.adultos + c.ninos), 0) AS personas,
                COUNT(*) AS grupos
         FROM llegadas l
         JOIN confirmaciones c ON c.id = l.confirmacion_id
         WHERE c.asiste = 1'
    );
    $filaEsperados = consultarUno(
        'SELECT COALESCE(SUM(adultos + ninos), 0) AS n FROM confirmaciones WHERE asiste = 1'
    );
    $filaReintentos = consultarUno('SELECT COUNT(*) AS n FROM llegadas WHERE intentos > 0');

    $dia['llegaron']  = (int) ($filaLlegaron['personas'] ?? 0);
    $dia['grupos_llegaron'] = (int) ($filaLlegaron['grupos'] ?? 0);
    $dia['esperados']  = (int) ($filaEsperados['n'] ?? 0);
    $dia['pases_reintentados'] = (int) ($filaReintentos['n'] ?? 0);
}

if (existeTabla('mesas')) {
    $filaMesasTotal = consultarUno('SELECT COUNT(*) AS n FROM mesas');
    $dia['mesas_total'] = (int) ($filaMesasTotal['n'] ?? 0);

    if (existeTabla('asignacion_mesas')) {
        // Una mesa "ocupada" es una que ya tiene a alguien sentado, no
        // necesariamente completa: es la pregunta que hace falta para
        // saber cuánto salón queda por llenar de un vistazo.
        $filaMesasOcupadas = consultarUno(
            'SELECT COUNT(DISTINCT mesa_id) AS n FROM asignacion_mesas'
        );
        $dia['mesas_ocupadas'] = (int) ($filaMesasOcupadas['n'] ?? 0);
    }
}

if (existeTabla('confirmaciones')) {
    $columnas = columnasDe('confirmaciones');
    if (in_array('alergias', $columnas, true) && in_array('asiste', $columnas, true)) {
        $filaAlergias = consultarUno(
            "SELECT COUNT(*) AS n FROM confirmaciones
             WHERE asiste = 1 AND alergias <> '' AND alergias IS NOT NULL
               AND LOWER(alergias) NOT IN ('ninguna', 'ninguno', 'no', 'n/a', '-')"
        );
        $dia['alergias_activas'] = (int) ($filaAlergias['n'] ?? 0);
    }
}


/* ─── CUÁNTA GENTE RESPONDIÓ LA INVITACIÓN ────────────────────────────
   ⚡ ESTO NO EXISTÍA, Y ERA EL AGUJERO ENTRE LA INVITACIÓN Y EL PANEL
   (2026-09-03). Cuando alguien contestaba su invitación, el panel no lo
   decía por ningún lado: el único aviso real llegaba por correo. En
   pantalla, la respuesta aparecía hasta 90 segundos después (el refresco
   de fondo), en silencio, como un punto que cambiaba de color en una
   lista de decenas de filas — y solo si Lucila estaba mirando esa lista
   justo en ese momento.

   El dato ya estaba: `invitaciones.respondida_en` se llena en confirmar.php
   y viaja hasta el panel, pero se usaba únicamente como sí/no. Basta con
   contar cuántas respondieron para que el teléfono pueda decir "hay tres
   nuevas": el panel guarda cuántas había la última vez que Lucila abrió
   Gente y compara. La cuenta se hace acá, en una petición que ya se hace
   igual al abrir la app, sin agregar ni un viaje. */
$respondidas = 0;
if (existeTabla('invitaciones')) {
    $filaRespondidas = consultarUno(
        'SELECT COUNT(*) AS n FROM invitaciones WHERE respondida_en IS NOT NULL'
    );
    $respondidas = (int) ($filaRespondidas['n'] ?? 0);
}


/* ─── RESPONDER ───────────────────────────────────────────────────────── */

// Primero lo atrasado, después lo de hoy, después la semana.
usort($pendientes, function ($a, $b) {
    return $a['urgencia'] <=> $b['urgencia'];
});

responderBien([
    'dia' => $dia,
    'dias_para_la_fiesta' => $diasQueFaltan,
    // Se devuelven todos, pero la app muestra los primeros: una lista de
    // quince pendientes es una lista que nadie lee.
    'pendientes'   => $pendientes,
    'atrasados'    => count(array_filter($pendientes, function ($p) {
                          return $p['urgencia'] === 0; })),
    'de_hoy'       => count(array_filter($pendientes, function ($p) {
                          return $p['urgencia'] === 1; })),
    'a_quien_llamar' => $aQuienLlamar,
    'lista_final'  => $listaFinal,
    'es_el_dia'    => $diasQueFaltan === 0,
    // Cuántas invitaciones fueron respondidas en total. El panel lo compara
    // con lo que vio la última vez para avisar las nuevas (ver arriba).
    'respondidas'  => $respondidas,
]);
