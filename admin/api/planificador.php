<?php
/* ══════════════════════════════════════════════════════════════════════
   PLANIFICADOR.PHP · NOTAS, TAREAS Y AGENDA

   QUÉ HACE ESTE ARCHIVO
   Las tres cosas que se usan a diario para no olvidarse de nada:
     · notas   → apuntar algo al vuelo, desde cualquier pantalla
     · tareas  → lo que hay que hacer, con responsable y fecha
     · agenda  → las fechas clave del camino al 24 de octubre de 2026

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=todo         las tres listas de una vez
     GET  ?accion=notas        solo las notas (con búsqueda)
     POST ?accion=guardar_X    crea o edita (nota, tarea, cita)
     POST ?accion=borrar_X     elimina
     POST ?accion=estado_tarea cambia el estado de una tarea
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'planificador', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'todo');


switch ($accion) {

/* ─── TODO JUNTO ──────────────────────────────────────────────────────── */

case 'todo':
    exigirMetodo('GET');

    responderBien([
        /* Las fijadas primero, después las más nuevas. Una nota fijada
           es la que se quiere tener siempre a la vista. */
        'notas' => consultarTodo(
            'SELECT * FROM notas ORDER BY fijada DESC, editado_en DESC LIMIT 200'
        ),

        /* Las tareas hechas van al final; entre las pendientes, primero
           las que vencen antes. El "fecha_limite IS NULL" empuja las que
           no tienen fecha al final en vez de al principio, que es lo que
           haría MySQL por su cuenta. */
        'tareas' => consultarTodo(
            "SELECT * FROM tareas
             ORDER BY estado = 'hecha', fecha_limite IS NULL, fecha_limite,
                      FIELD(prioridad, 'alta', 'media', 'baja')"
        ),

        /* La agenda mira hacia adelante: lo que ya pasó no estorba. Se
           deja un mes de margen hacia atrás por si algo quedó sin
           marcar. */
        'agenda' => consultarTodo(
            'SELECT * FROM agenda
             WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             ORDER BY fecha, hora'
        ),
    ]);
    break;


/* ─── NOTAS ───────────────────────────────────────────────────────────── */

case 'notas':
    exigirMetodo('GET');

    $busca = trim((string) ($_GET['busca'] ?? ''));

    if ($busca === '') {
        responderBien(consultarTodo(
            'SELECT * FROM notas ORDER BY fijada DESC, editado_en DESC LIMIT 200'
        ));
    }

    /* Se busca con LIKE y no con MATCH...AGAINST (el índice FULLTEXT que
       tiene la tabla) a propósito: el índice de texto completo ignora
       las palabras de menos de 4 letras y las muy repetidas, así que
       buscar "DJ" o "pan" no encontraría nada. Con decenas de notas,
       LIKE es instantáneo igual. */
    responderBien(consultarTodo(
        'SELECT * FROM notas
         WHERE titulo LIKE :b OR cuerpo LIKE :b
         ORDER BY fijada DESC, editado_en DESC LIMIT 200',
        [':b' => '%' . $busca . '%']
    ));
    break;

case 'guardar_nota':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'titulo'       => campoTexto($datos, 'titulo', 200),
        'cuerpo'       => campoTexto($datos, 'cuerpo', 20000),
        'etiqueta'     => campoTexto($datos, 'etiqueta', 40),
        'fijada'       => !empty($datos['fijada']) ? 1 : 0,
        'atada_a_tipo' => campoOpcion($datos, 'atada_a_tipo',
                          ['', 'proveedor', 'gasto', 'padrino', 'invitado'], ''),
        'atada_a_id'   => campoEntero($datos, 'atada_a_id', 0),
    ];

    // Una nota sin título ni cuerpo no es una nota.
    if ($valores['titulo'] === '' && $valores['cuerpo'] === '') {
        responderMal('La nota está vacía.', 400);
    }

    // Si no le pusieron título, se arma uno con el principio del cuerpo,
    // para que la lista no muestre un renglón en blanco.
    if ($valores['titulo'] === '') {
        $primeraLinea = strtok($valores['cuerpo'], "\n");
        $valores['titulo'] = mb_substr(trim($primeraLinea), 0, 60);
    }

    responderBien(guardarOEditar('notas', $datos, $valores, $yo, 'nota'));
    break;

case 'borrar_nota':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);
    borrar('notas', $id);
    anotarEnBitacora($yo, 'borró una nota', 'notas', $id);
    responderBien(['mensaje' => 'Nota eliminada.']);
    break;


/* ─── TAREAS ──────────────────────────────────────────────────────────── */

case 'guardar_tarea':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'titulo'       => campoTexto($datos, 'titulo', 200),
        'detalle'      => campoTexto($datos, 'detalle', 5000),
        'responsable'  => campoTexto($datos, 'responsable', 100),
        'fecha_limite' => campoFecha($datos, 'fecha_limite'),
        'prioridad'    => campoOpcion($datos, 'prioridad', ['baja','media','alta'], 'media'),
        'estado'       => campoOpcion($datos, 'estado',
                          ['pendiente','haciendo','hecha'], 'pendiente'),
    ];
    if ($valores['titulo'] === '') responderMal('La tarea necesita un título.', 400);

    responderBien(guardarOEditar('tareas', $datos, $valores, $yo, 'tarea'));
    break;

case 'estado_tarea':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $tarea = consultarUno('SELECT titulo, estado FROM tareas WHERE id = :id', [':id' => $id]);
    if (!$tarea) responderMal('Esa tarea no existe.', 404);

    // Alterna entre hecha y pendiente con un solo toque en la casilla.
    $nuevo = $tarea['estado'] === 'hecha' ? 'pendiente' : 'hecha';
    actualizar('tareas', $id, ['estado' => $nuevo]);

    anotarEnBitacora($yo, 'marcó una tarea como ' . $nuevo, 'tareas', $id, $tarea['titulo']);
    responderBien(['estado' => $nuevo]);
    break;

case 'borrar_tarea':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);
    borrar('tareas', $id);
    anotarEnBitacora($yo, 'borró una tarea', 'tareas', $id);
    responderBien(['mensaje' => 'Tarea eliminada.']);
    break;


/* ─── AGENDA ──────────────────────────────────────────────────────────── */

case 'guardar_cita':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $fecha = campoFecha($datos, 'fecha');
    if (!$fecha) responderMal('La fecha no es válida.', 400);

    $valores = [
        'titulo'      => campoTexto($datos, 'titulo', 200),
        'detalle'     => campoTexto($datos, 'detalle', 5000),
        'fecha'       => $fecha,
        'hora'        => campoHora($datos, 'hora'),
        'lugar'       => campoTexto($datos, 'lugar', 200),
        'avisar_dias' => campoEntero($datos, 'avisar_dias', 0, 90),
    ];
    if ($valores['titulo'] === '') responderMal('La fecha necesita un título.', 400);

    responderBien(guardarOEditar('agenda', $datos, $valores, $yo, 'fecha de agenda'));
    break;

case 'borrar_cita':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);
    borrar('agenda', $id);
    anotarEnBitacora($yo, 'borró una fecha', 'agenda', $id);
    responderBien(['mensaje' => 'Fecha eliminada.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Crea o actualiza según venga o no un id, y lo anota en la bitácora.
 *
 * @param string $tabla
 * @param array  $datos
 * @param array  $valores
 * @param array  $yo
 * @param string $comoSeLlama
 * @return array ['id' => int, 'creado' => bool]
 */
function guardarOEditar($tabla, $datos, $valores, $yo, $comoSeLlama) {
    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        $existe = consultarUno("SELECT id FROM `$tabla` WHERE id = :id", [':id' => $id]);
        if (!$existe) responderMal('Ese registro ya no existe.', 404);

        actualizar($tabla, $id, $valores);
        anotarEnBitacora($yo, 'editó una ' . $comoSeLlama, $tabla, $id,
                         (string) ($valores['titulo'] ?? ''));
        return ['id' => $id, 'creado' => false];
    }

    $nuevo = insertar($tabla, $valores);
    anotarEnBitacora($yo, 'creó una ' . $comoSeLlama, $tabla, $nuevo,
                     (string) ($valores['titulo'] ?? ''));
    return ['id' => $nuevo, 'creado' => true];
}

/**
 * Lee una hora en formato HH:MM, o null si no vino o no es válida.
 *
 * Se valida con expresión regular y no confiando en MySQL porque una
 * hora inválida haría fallar el INSERT entero con un error críptico.
 *
 * @param array  $origen
 * @param string $clave
 * @return string|null
 */
function campoHora($origen, $clave) {
    $valor = trim((string) ($origen[$clave] ?? ''));
    if ($valor === '') return null;
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $valor) ? $valor . ':00' : null;
}
