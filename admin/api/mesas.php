<?php
/* ══════════════════════════════════════════════════════════════════════
   MESAS.PHP · EL ACOMODO DEL SALÓN

   QUÉ HACE ESTE ARCHIVO
   Todo lo del acomodo: crear las mesas, sentar gente a mano, dejar que
   se acomode sola, y las reglas que hacen que el resultado sirva.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=todo            el panorama completo
     POST ?accion=crear_lote      crea N mesas de C sillas de una vez
     POST ?accion=vista_previa    calcula el acomodo SIN guardarlo
     POST ?accion=autoasignar     lo calcula y lo guarda
     POST ?accion=sentar          pone a alguien en una mesa concreta
     POST ?accion=fijar           traba una asignación
     POST ?accion=vaciar          saca a todos (menos los fijados)
     POST ?accion=guardar_grupo   grupos de invitados
     POST ?accion=borrar_grupo
     POST ?accion=preferencia     sillas extra, grupo y mesa preferida
     POST ?accion=pelea           "estos dos no se sientan juntos"
     POST ?accion=borrar_pelea
     POST ?accion=auto_al_confirmar  prende o apaga el acomodo automático
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/mesas.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'mesas', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'todo');


switch ($accion) {

/* ─── EL PANORAMA ─────────────────────────────────────────────────────── */

case 'todo':
    exigirMetodo('GET');

    $datos = panoramaDeMesas();

    /* Cada mesa con quiénes tiene sentados. Se arma acá y no en la app
       para que el teléfono reciba la respuesta lista para pintar. */
    $porMesa = [];
    foreach ($datos['mesas'] as $mesa) {
        $porMesa[$mesa['id']] = [
            'id'         => (int) $mesa['id'],
            'nombre'     => $mesa['nombre'],
            'capacidad'  => (int) $mesa['capacidad'],
            'ubicacion'  => $mesa['ubicacion'],
            'notas'      => $mesa['notas'],
            // Dónde va en el plano. En 0 = todavía sin ubicar.
            'fila'       => (int) ($mesa['fila'] ?? 0),
            'columna'    => (int) ($mesa['columna'] ?? 0),
            'prioridad'  => (int) ($mesa['prioridad'] ?? 50),
            'perfil'     => $mesa['perfil'] ?? 'normal',
            'ocupados'   => 0,
            'invitados'  => [],
        ];
    }

    $sinSentar = [];
    $totalGente = 0;

    foreach ($datos['invitados'] as $invitado) {
        $totalGente += $invitado['lugares_necesarios'];

        $ficha = [
            'id'       => (int) $invitado['id'],
            'nombre'   => $invitado['nombre'],
            'lugares'  => $invitado['lugares_necesarios'],
            'grupo'    => $invitado['grupo_nombre'],
            'grupo_id' => $invitado['grupo_id'] ? (int) $invitado['grupo_id'] : null,
            'fijada'   => (int) ($invitado['fijada'] ?? 0) === 1,
            'extra'    => (int) ($invitado['sillas_extra'] ?? 0),
        ];

        if (!empty($invitado['mesa_id']) && isset($porMesa[$invitado['mesa_id']])) {
            $porMesa[$invitado['mesa_id']]['ocupados'] += $invitado['lugares_necesarios'];
            $porMesa[$invitado['mesa_id']]['invitados'][] = $ficha;
        } else {
            $sinSentar[] = $ficha;
        }
    }

    $capacidadTotal = 0;
    foreach ($porMesa as $mesa) $capacidadTotal += $mesa['capacidad'];

    $ajuste = existeTabla('ajustes')
        ? consultarUno("SELECT valor FROM ajustes WHERE clave = 'auto_al_confirmar'")
        : null;

    responderBien([
        'mesas'       => array_values($porMesa),
        'sin_sentar'  => $sinSentar,
        'grupos'      => $datos['grupos'],
        'peleas'      => $datos['peleas'],
        'resumen'     => [
            'capacidad'      => $capacidadTotal,
            'gente'          => $totalGente,
            'sentados'       => $totalGente - array_sum(array_map(function ($i) {
                                    return $i['lugares'];
                                }, $sinSentar)),
            'sin_sentar'     => count($sinSentar),
            'mesas'          => count($porMesa),
            'faltan_lugares' => max(0, $totalGente - $capacidadTotal),
        ],
        'auto_al_confirmar' => $ajuste && $ajuste['valor'] === '1',
    ]);
    break;


/* ─── ARMAR EL SALÓN DE ALVI DE UNA VEZ ───────────────────────────────── */

/*
   Crea las 14 mesas del Salón Estrella con su nombre, capacidad y
   POSICIÓN EN EL PLANO, tal como están en la planilla de Lucila.

   La posición es lo que no se puede cargar a mano sin equivocarse, y es
   justo lo que hace que el plano sirva: sin ella el panel vuelve a ser
   una lista donde no se sabe cuál mesa queda pegada a la pista.

   Es idempotente: si una mesa ya existe se le completa la posición pero
   no se duplica ni se le pisa la capacidad.
*/
case 'armar_salon':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $mesasDelPlano = $datos['mesas'] ?? [];
    if (!is_array($mesasDelPlano) || !$mesasDelPlano) {
        responderMal('No llegó el plano del salón.', 400);
    }

    $creadas = 0;
    $ubicadas = 0;
    $capacidad = campoEntero($datos, 'capacidad', 1, 30, 10);

    foreach ($mesasDelPlano as $m) {
        $nombre  = trim((string) ($m['nombre'] ?? ''));
        if ($nombre === '') continue;

        $fila    = (int) ($m['fila'] ?? 0);
        $columna = (int) ($m['columna'] ?? 0);
        $prioridad = (int) ($m['prioridad'] ?? 50);

        $existe = consultarUno('SELECT id FROM mesas WHERE nombre = :n', [':n' => $nombre]);

        if ($existe) {
            /* Ya estaba: solo se le pone dónde va. No se le toca la
               capacidad ni la ubicación escrita, que puede haberse
               ajustado a mano por algo. */
            actualizar('mesas', (int) $existe['id'], [
                'fila' => $fila, 'columna' => $columna, 'prioridad' => $prioridad,
            ]);
            $ubicadas++;
            continue;
        }

        insertar('mesas', [
            'nombre'    => $nombre,
            'capacidad' => $capacidad,
            'ubicacion' => '',
            'fila'      => $fila,
            'columna'   => $columna,
            'prioridad' => $prioridad,
        ]);
        $creadas++;
    }

    anotarEnBitacora($yo, 'armó el plano del salón', 'mesas', 0,
                     $creadas . ' creadas, ' . $ubicadas . ' ubicadas');

    responderBien([
        'creadas'  => $creadas,
        'ubicadas' => $ubicadas,
        'mensaje'  => $creadas
            ? 'Se armó el salón: ' . $creadas . ' mesas de ' . $capacidad . ' lugares.'
            : 'Las mesas ya estaban: se les puso su lugar en el plano.',
    ]);
    break;


/* ─── VOLVER AL ACOMODO ANTERIOR ──────────────────────────────────────── */

case 'deshacer':
    exigirMetodo('POST');

    $r = volverAlAcomodoAnterior();
    if (empty($r['ok'])) responderMal($r['error'], 400);

    anotarEnBitacora($yo, 'volvió al acomodo anterior', 'asignacion_mesas', 0,
                     $r['cuantos'] . ' asignaciones restauradas');

    responderBien(['mensaje' => 'Listo: el acomodo volvió a como estaba antes.']);
    break;


/* ─── MOVER UNA MESA EN EL PLANO ──────────────────────────────────────── */

case 'ubicar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $mesa = campoEntero($datos, 'mesa_id', 1);
    if (!consultarUno('SELECT id FROM mesas WHERE id = :m', [':m' => $mesa])) {
        responderMal('Esa mesa no existe.', 404);
    }

    actualizar('mesas', $mesa, [
        'fila'    => campoEntero($datos, 'fila', 0, 20),
        'columna' => campoEntero($datos, 'columna', 0, 12),
    ]);

    responderBien(['mensaje' => 'Mesa movida.']);
    break;


/* ─── CREAR MESAS DE UNA VEZ ──────────────────────────────────────────── */

case 'crear_lote':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $cuantas   = campoEntero($datos, 'cuantas', 1, 60);
    $capacidad = campoEntero($datos, 'capacidad', 1, 30, 10);
    $prefijo   = campoTexto($datos, 'prefijo', 30) ?: 'Mesa';
    $desde     = campoEntero($datos, 'desde', 1, 99, 1);

    $creadas = 0;
    $repetidas = 0;

    for ($i = 0; $i < $cuantas; $i++) {
        $nombre = trim($prefijo . ' ' . ($desde + $i));

        // El nombre es único: si ya existe esa mesa, se saltea.
        $existe = consultarUno('SELECT id FROM mesas WHERE nombre = :n', [':n' => $nombre]);
        if ($existe) { $repetidas++; continue; }

        insertar('mesas', [
            'nombre'    => $nombre,
            'capacidad' => $capacidad,
            'ubicacion' => '',
        ]);
        $creadas++;
    }

    anotarEnBitacora($yo, 'creó mesas', 'mesas', 0,
                     $creadas . ' mesas de ' . $capacidad . ' lugares');

    responderBien([
        'creadas'   => $creadas,
        'repetidas' => $repetidas,
        'mensaje'   => $creadas
            ? 'Se crearon ' . $creadas . ' mesas de ' . $capacidad . ' lugares.'
            : 'Ya existían todas esas mesas.',
    ]);
    break;


/* ─── ACOMODAR ────────────────────────────────────────────────────────── */

case 'vista_previa':
case 'autoasignar':
    exigirMetodo('POST');
    $datos = cuerpoJson(false);

    // Por defecto NO se toca lo que se acomodó a mano.
    $respetar = !isset($datos['respetar_fijados']) || !empty($datos['respetar_fijados']);

    $resultado = repartirEnMesas($respetar);

    if (empty($resultado['ok'])) {
        responderMal($resultado['error'] ?? 'No se pudo acomodar.', 400);
    }

    if ($accion === 'vista_previa') {
        responderBien($resultado);
    }

    // Foto de cómo estaba, para poder volver si no gusta el resultado.
    guardarFotoDelAcomodo('antes_de_acomodar', (int) $yo['id']);

    $cuantos = guardarPlanDeMesas($resultado['plan'], $respetar);

    anotarEnBitacora($yo, 'acomodó las mesas automáticamente', 'asignacion_mesas', 0,
                     $cuantos . ' sentados, ' . count($resultado['sin_lugar']) . ' sin lugar');

    responderBien([
        'sentados'  => $cuantos,
        'sin_lugar' => $resultado['sin_lugar'],
        'mensaje'   => count($resultado['sin_lugar'])
            ? 'Se acomodaron ' . $cuantos . '. Quedaron ' .
              count($resultado['sin_lugar']) . ' sin lugar.'
            : 'Listo: se acomodaron los ' . $cuantos . '.',
    ]);
    break;


/* ─── SENTAR A MANO ───────────────────────────────────────────────────── */

case 'sentar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);
    $mesa         = campoEntero($datos, 'mesa_id', 0);

    // Mesa 0 significa sacarlo del acomodo.
    if ($mesa === 0) {
        ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
                 [':c' => $confirmacion]);
        responderBien(['mensaje' => 'Se quitó de la mesa.']);
    }

    $gente = consultarUno(
        'SELECT c.nombre, c.adultos, c.ninos, p.sillas_extra
         FROM confirmaciones c
         LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
         WHERE c.id = :id',
        [':id' => $confirmacion]
    );
    if (!$gente) responderMal('Esa confirmación no existe.', 404);

    $lugares = lugaresQueOcupa($gente);

    /* Se avisa si no entra, pero se deja hacer igual: quien acomoda
       puede saber que van a agregar una silla, o que dos chicos van a
       compartir. La computadora informa, no prohíbe. */
    $mesaInfo = consultarUno('SELECT nombre, capacidad FROM mesas WHERE id = :m',
                             [':m' => $mesa]);
    if (!$mesaInfo) responderMal('Esa mesa no existe.', 404);

    $ocupados = consultarUno(
        'SELECT COALESCE(SUM(lugares), 0) AS n FROM asignacion_mesas
         WHERE mesa_id = :m AND confirmacion_id <> :c',
        [':m' => $mesa, ':c' => $confirmacion]
    );

    $seExcede = ((int) $ocupados['n'] + $lugares) > (int) $mesaInfo['capacidad'];

    ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
             [':c' => $confirmacion]);

    insertar('asignacion_mesas', [
        'confirmacion_id' => $confirmacion,
        'mesa_id'         => $mesa,
        'lugares'         => $lugares,
        /* Sentar a mano PROPONE, no traba.
         *
         * Antes todo sentado manual quedaba fijado para siempre, así que
         * no existía el término medio entre "lo puse acá probando" y
         * "esto no se toca". Después de mover cinco personas de prueba,
         * el acomodo automático ya casi no tenía margen para trabajar y
         * nadie entendía por qué.
         *
         * El candado ahora se pone aparte, con el botón "Fijar acá" que
         * ya existía y que hasta ahora no significaba nada. */
        'fijada'          => 0,
    ]);

    anotarEnBitacora($yo, 'sentó a alguien a mano', 'asignacion_mesas', $confirmacion,
                     $gente['nombre'] . ' → ' . $mesaInfo['nombre']);

    responderBien([
        'mensaje'   => $gente['nombre'] . ' quedó en ' . $mesaInfo['nombre'] . '.',
        'se_excede' => $seExcede,
        'aviso'     => $seExcede
            ? 'Ojo: la mesa queda con más gente que sillas.' : '',
    ]);
    break;


/* Le busca mesa a UNA sola persona, sin tocar a nadie más. Es el atajo
   que aparece en el ticket de cada invitado, para no tener que ir hasta
   la pantalla de Mesas solo para sentar a alguien. */
case 'sentar_auto':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);

    $r = sentarAUnoSolo($confirmacion);
    if (!$r['ok']) responderMal($r['error'], 400);

    if (!empty($r['ya_estaba'])) {
        responderBien(['mensaje' => 'Ya tenía mesa asignada.', 'mesa_id' => $r['mesa_id']]);
    }

    $mesaInfo = consultarUno('SELECT nombre FROM mesas WHERE id = :m', [':m' => $r['mesa_id']]);
    anotarEnBitacora($yo, 'sentó a alguien automáticamente', 'asignacion_mesas',
                     $confirmacion, ($mesaInfo['nombre'] ?? ''));

    responderBien([
        'mensaje' => 'Quedó en ' . ($mesaInfo['nombre'] ?? 'una mesa') . '.',
        'mesa_id' => $r['mesa_id'],
    ]);
    break;


case 'fijar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);

    $fila = consultarUno('SELECT fijada FROM asignacion_mesas WHERE confirmacion_id = :c',
                         [':c' => $confirmacion]);
    if (!$fila) responderMal('Esa persona no está sentada en ninguna mesa.', 404);

    $nuevo = ((int) $fila['fijada'] === 1) ? 0 : 1;
    ejecutar('UPDATE asignacion_mesas SET fijada = :f WHERE confirmacion_id = :c',
             [':f' => $nuevo, ':c' => $confirmacion]);

    responderBien([
        'fijada'  => $nuevo === 1,
        'mensaje' => $nuevo
            ? 'Fijado: el acomodo automático ya no lo va a mover.'
            : 'Liberado: el acomodo automático puede moverlo.',
    ]);
    break;


case 'vaciar':
    exigirMetodo('POST');
    $datos = cuerpoJson(false);

    if (!empty($datos['todo'])) {
        ejecutar('DELETE FROM asignacion_mesas');
        anotarEnBitacora($yo, 'vació TODO el acomodo', 'asignacion_mesas');
        responderBien(['mensaje' => 'Se vaciaron todas las mesas, incluso las fijadas.']);
    }

    ejecutar('DELETE FROM asignacion_mesas WHERE fijada = 0');
    anotarEnBitacora($yo, 'vació el acomodo', 'asignacion_mesas');
    responderBien(['mensaje' => 'Se vaciaron las mesas. Lo fijado quedó como estaba.']);
    break;


/* ─── GRUPOS ──────────────────────────────────────────────────────────── */

case 'guardar_grupo':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'nombre' => campoTexto($datos, 'nombre', 80),
        'color'  => campoTexto($datos, 'color', 20),
        'orden'  => campoEntero($datos, 'orden', 0, 999, 50),
        'notas'  => campoTexto($datos, 'notas', 1000),
    ];
    if ($valores['nombre'] === '') responderMal('El grupo necesita un nombre.', 400);

    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        actualizar('grupos_invitados', $id, $valores);
        responderBien(['id' => $id]);
    }

    $repetido = consultarUno('SELECT id FROM grupos_invitados WHERE nombre = :n',
                             [':n' => $valores['nombre']]);
    if ($repetido) responderMal('Ya existe un grupo con ese nombre.', 409);

    responderBien(['id' => insertar('grupos_invitados', $valores)], 201);
    break;

case 'borrar_grupo':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // Los invitados quedan sin grupo, no se borran (ON DELETE SET NULL).
    borrar('grupos_invitados', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Grupo eliminado. Sus invitados quedaron sin grupo.']);
    break;


/* ─── PREFERENCIAS DE UN INVITADO ─────────────────────────────────────── */

case 'preferencia':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);

    $grupo = campoEntero($datos, 'grupo_id', 0);
    $mesa  = campoEntero($datos, 'mesa_preferida', 0);

    /* REPLACE INTO borra la fila anterior y escribe la nueva. Sirve acá
       porque la clave primaria es el id de la confirmación: hay una
       preferencia por invitado, ni más ni menos. */
    ejecutar(
        'REPLACE INTO preferencias_invitado
           (confirmacion_id, grupo_id, sillas_extra, mesa_preferida, notas)
         VALUES (:c, :g, :s, :m, :n)',
        [
            ':c' => $confirmacion,
            ':g' => $grupo > 0 ? $grupo : null,
            ':s' => campoEntero($datos, 'sillas_extra', 0, 20),
            ':m' => $mesa > 0 ? $mesa : null,
            ':n' => campoTexto($datos, 'notas', 300),
        ]
    );

    /* Si cambiaron las sillas extra, la asignación que ya existía tiene
       el número viejo. Se actualiza para que las cuentas no mientan. */
    $gente = consultarUno(
        'SELECT c.adultos, c.ninos, p.sillas_extra
         FROM confirmaciones c
         LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
         WHERE c.id = :id',
        [':id' => $confirmacion]
    );
    if ($gente) {
        ejecutar('UPDATE asignacion_mesas SET lugares = :l WHERE confirmacion_id = :c',
                 [':l' => lugaresQueOcupa($gente), ':c' => $confirmacion]);
    }

    responderBien(['mensaje' => 'Guardado.']);
    break;


/* ─── PELEAS ──────────────────────────────────────────────────────────── */

case 'pelea':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $a = campoEntero($datos, 'invitado_a', 1);
    $b = campoEntero($datos, 'invitado_b', 1);

    if ($a === $b) responderMal('No se puede pelear con uno mismo.', 400);

    // Siempre el id más chico primero: así "A con B" y "B con A" son la
    // misma fila y el índice único hace su trabajo.
    if ($a > $b) { $t = $a; $a = $b; $b = $t; }

    $yaEsta = consultarUno(
        'SELECT id FROM incompatibilidades WHERE invitado_a = :a AND invitado_b = :b',
        [':a' => $a, ':b' => $b]
    );
    if ($yaEsta) responderMal('Esa regla ya estaba puesta.', 409);

    $id = insertar('incompatibilidades', [
        'invitado_a' => $a,
        'invitado_b' => $b,
        'motivo'     => campoTexto($datos, 'motivo', 200),
    ]);

    responderBien(['id' => $id, 'mensaje' => 'Anotado: no se van a sentar juntos.'], 201);
    break;

case 'borrar_pelea':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    borrar('incompatibilidades', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Regla eliminada.']);
    break;


/* ─── ACOMODO AUTOMÁTICO AL CONFIRMAR ─────────────────────────────────── */

case 'auto_al_confirmar':
    exigirAdministrador();
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $prender = !empty($datos['prender']) ? '1' : '0';

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('auto_al_confirmar', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [':v' => $prender, ':v2' => $prender]
    );

    responderBien([
        'prendido' => $prender === '1',
        'mensaje'  => $prender === '1'
            ? 'Listo: cada confirmación nueva se va a sentar sola.'
            : 'Apagado: las confirmaciones nuevas quedan sin mesa.',
    ]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
