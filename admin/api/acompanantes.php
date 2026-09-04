<?php
/* ══════════════════════════════════════════════════════════════════════
   ACOMPANANTES.PHP · PONERLE NOMBRE A CADA INVITADO

   QUÉ HACE ESTE ARCHIVO
   Una confirmación dice "3 adultos y 1 niño". Este archivo deja anotar
   quiénes son esos cuatro, uno por uno: nombre, teléfono, menú, alergias.

   EL NÚMERO SIGUE MANDANDO
   La cantidad que puso el invitado en confirmar.php (adultos + niños) no
   se toca nunca desde acá. Nombrar es opcional y progresivo: se pueden
   cargar 0, 2 o los 4. Este archivo solo deja agregar hasta llegar a esa
   cantidad, y no ni uno más — así el conteo de la puerta y el de la
   confirmación jamás quedan en desacuerdo.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar&confirmacion_id=…   los que ya se cargaron
     POST ?accion=agregar                    uno nuevo
     POST ?accion=editar                     corrige uno que ya existe
     POST ?accion=borrar                     saca uno de la lista
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'invitados', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('acompanantes')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    $confirmacionId = (int) ($_GET['confirmacion_id'] ?? 0);
    if ($confirmacionId < 1) responderMal('Falta decir de qué confirmación.', 400);

    $filas = consultarTodo(
        'SELECT * FROM acompanantes WHERE confirmacion_id = :c ORDER BY id',
        [':c' => $confirmacionId]
    );

    responderBien(['filas' => $filas]);
    break;


/* ─── AGREGAR ─────────────────────────────────────────────────────────── */

case 'agregar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    // ⚡ (2026-08-28) El 3er parámetro de campoEntero() es el MÍNIMO, no
    // un respaldo -mismo bug ya encontrado en confirmar.php/invitaciones.php:
    // un confirmacion_id ausente o en 0 se elevaba a 1, agregando el
    // acompañante a la confirmación #1 en vez de fallar.
    $confirmacionId = campoEntero($datos, 'confirmacion_id', 0);
    $nombre         = campoTexto($datos, 'nombre', 150);

    if ($confirmacionId < 1) responderMal('Falta decir de qué confirmación.', 400);
    if ($nombre === '') responderMal('El nombre no puede quedar vacío.', 400);

    $cupo = cupoDeLaConfirmacion($confirmacionId);
    if ($cupo === null) responderMal('Esa confirmación no existe.', 404);

    $yaCargados = (int) consultarUno(
        'SELECT COUNT(*) AS n FROM acompanantes WHERE confirmacion_id = :c',
        [':c' => $confirmacionId]
    )['n'];

    if ($yaCargados >= $cupo) {
        responderMal(
            'Ya se cargaron los ' . $cupo . ' que declaró esta confirmación. ' .
            'Si falta alguien, primero corrige el número de adultos o niños.',
            400
        );
    }

    $id = insertar('acompanantes', [
        'confirmacion_id' => $confirmacionId,
        'nombre'          => $nombre,
        'tipo'            => campoOpcion($datos, 'tipo', ['adulto', 'nino'], 'adulto'),
        'telefono'        => campoTexto($datos, 'telefono', 40),
        'correo'          => campoTexto($datos, 'correo', 190),
        'menu'            => campoTexto($datos, 'menu', 120),
        'alergias'        => campoTexto($datos, 'alergias', 200),
        'notas'           => campoTexto($datos, 'notas', 300),
    ]);

    anotarEnBitacora($yo, 'agregó un acompañante', 'acompanantes', $id, $nombre);
    responderBien(['id' => $id, 'mensaje' => 'Agregado.'], 201);
    break;


/* ─── EDITAR ──────────────────────────────────────────────────────────── */

case 'editar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // Mismo motivo que en 'agregar': el mínimo de campoEntero() no es
    // un respaldo -un id ausente editaría al acompañante #1 en silencio.
    $id = campoEntero($datos, 'id', 0);
    if ($id < 1) responderMal('Falta decir a quién.', 400);

    $antes = consultarUno('SELECT * FROM acompanantes WHERE id = :id', [':id' => $id]);
    if (!$antes) responderMal('Ese acompañante no existe.', 404);

    $cambios = [];
    foreach (['nombre', 'telefono', 'correo', 'menu', 'alergias', 'notas'] as $campo) {
        if (array_key_exists($campo, $datos)) {
            $cambios[$campo] = campoTexto($datos, $campo, $campo === 'nombre' ? 150 : 300);
        }
    }
    if (array_key_exists('tipo', $datos)) {
        $cambios['tipo'] = campoOpcion($datos, 'tipo', ['adulto', 'nino'], $antes['tipo']);
    }
    if (isset($cambios['nombre']) && $cambios['nombre'] === '') {
        responderMal('El nombre no puede quedar vacío.', 400);
    }
    if (!$cambios) responderMal('No mandaste ningún cambio.', 400);

    actualizar('acompanantes', $id, $cambios);
    responderBien(['mensaje' => 'Cambios guardados.']);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // ⚡ El más peligroso de los tres: sin esta guarda, un POST sin
    // id borraba al acompañante #1 -no un error cualquiera, un DELETE.
    $id = campoEntero($datos, 'id', 0);
    if ($id < 1) responderMal('Falta decir a quién.', 400);

    $fila = consultarUno('SELECT * FROM acompanantes WHERE id = :id', [':id' => $id]);
    if (!$fila) responderMal('Ese acompañante no existe.', 404);

    borrar('acompanantes', $id);
    anotarEnBitacora($yo, 'quitó un acompañante', 'acompanantes', $id, (string) $fila['nombre']);
    responderBien(['mensaje' => 'Quitado.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDA ───────────────────────────────────────────────────────────── */

/**
 * Cuántas personas declaró una confirmación (adultos + niños).
 *
 * Es el tope de cuántos acompañantes se pueden nombrar: nombrar nunca
 * puede superar lo que el invitado dijo al confirmar.
 *
 * @param int $confirmacionId
 * @return int|null null si la confirmación no existe.
 */
function cupoDeLaConfirmacion($confirmacionId) {
    if (!existeTabla('confirmaciones')) return null;

    $columnas = columnasDe('confirmaciones');
    if (!in_array('adultos', $columnas, true) || !in_array('ninos', $columnas, true)) {
        // Tabla sin esas columnas: no se puede saber el cupo, así que no
        // se limita (mejor eso que bloquear la función entera).
        return existeTabla('confirmaciones') && consultarUno(
            'SELECT id FROM confirmaciones WHERE id = :id', [':id' => $confirmacionId]
        ) ? 999 : null;
    }

    $fila = consultarUno(
        'SELECT adultos, ninos FROM confirmaciones WHERE id = :id',
        [':id' => $confirmacionId]
    );
    if (!$fila) return null;

    return (int) $fila['adultos'] + (int) $fila['ninos'];
}
