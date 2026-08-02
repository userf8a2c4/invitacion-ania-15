<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMACIONES.PHP · LOS INVITADOS

   QUÉ HACE ESTE ARCHIVO
   Lee y edita la tabla `confirmaciones`, que es la que llena el
   formulario de la invitación a través de confirmar.php.

   ⚠️ POR QUÉ ESTE ARCHIVO ES MÁS DESCONFIADO QUE LOS DEMÁS
   Todas las otras tablas las creó migracion.sql, así que sabemos exacto
   qué columnas tienen. Esta NO: se creó a mano en phpMyAdmin antes de
   que existiera el panel, y no quedó anotada en ningún lado.

   Por eso, en vez de asumir columnas, este archivo PREGUNTA cuáles hay
   (con columnasDe()) y trabaja solo con las que encuentra. Si la tabla
   no tiene `id`, avisa con un mensaje claro en lugar de reventar.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar     todas, con filtros y búsqueda
     GET  ?accion=ver&id=…   una sola, completa
     POST ?accion=editar     corregir los datos de una
     POST ?accion=crear      dar de alta a alguien a mano
     POST ?accion=borrar     eliminar una (duplicados, pruebas)
     GET  ?accion=csv        bajar todo como planilla
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');


/* ─── AVERIGUAR CÓMO ES LA TABLA ──────────────────────────────────────── */

if (!existeTabla('confirmaciones')) {
    responderMal('La tabla de confirmaciones no existe en esta base de datos.', 500);
}

$COLUMNAS = columnasDe('confirmaciones');

/**
 * Dice si la tabla tiene una columna.
 *
 * @param string $nombre
 * @return bool
 */
function hay($nombre) {
    global $COLUMNAS;
    return in_array($nombre, $COLUMNAS, true);
}

/**
 * Devuelve la primera columna que exista de una lista de candidatas.
 *
 * Sirve porque no sabemos si la fecha se llamó `creado_en`, `fecha` o
 * `created_at` cuando se creó la tabla a mano.
 *
 * @param string[] $candidatas
 * @return string|null
 */
function primeraQueHaya($candidatas) {
    foreach ($candidatas as $nombre) {
        if (hay($nombre)) return $nombre;
    }
    return null;
}

/* Sin una columna id no se puede editar ni borrar una fila concreta:
   no habría forma de decirle a MySQL "esta y no otra". */
$TIENE_ID = hay('id');

/* La columna de fecha, se llame como se llame. */
$COL_FECHA = primeraQueHaya(['creado_en', 'fecha', 'created_at', 'fecha_registro']);

/* Las columnas que el panel deja editar. Solo se tocan las que existen:
   así este archivo funciona igual si la tabla tiene columnas de más o
   de menos de las que esperábamos. */
$EDITABLES = array_values(array_filter([
    'nombre', 'correo', 'asiste', 'adultos', 'ninos', 'total',
    'menus', 'resumen_menus', 'alergias', 'notas', 'codigo',
], 'hay'));


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    $condiciones = [];
    $parametros  = [];

    // Filtro de asistencia.
    $filtro = (string) ($_GET['filtro'] ?? 'todos');
    if (hay('asiste')) {
        if ($filtro === 'asisten')   $condiciones[] = 'asiste = 1';
        if ($filtro === 'no_asisten') $condiciones[] = 'asiste = 0';
    }

    // Búsqueda por nombre, correo o código de pase.
    $busca = trim((string) ($_GET['busca'] ?? ''));
    if ($busca !== '') {
        $trozos = [];
        foreach (['nombre', 'correo', 'codigo'] as $columna) {
            if (hay($columna)) $trozos[] = "`$columna` LIKE :busca";
        }
        if ($trozos) {
            $condiciones[] = '(' . implode(' OR ', $trozos) . ')';
            // Los comodines van en el VALOR, nunca pegados al SQL: así
            // sigue siendo una consulta preparada de verdad.
            $parametros[':busca'] = '%' . $busca . '%';
        }
    }

    $donde = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';

    // Se ordena por fecha si hay columna de fecha; si no, por id; y si
    // tampoco hay id, sin orden (mejor eso que un error de SQL).
    $orden = '';
    if ($COL_FECHA)      $orden = "ORDER BY `$COL_FECHA` DESC";
    elseif ($TIENE_ID)   $orden = 'ORDER BY id DESC';

    $filas = consultarTodo("SELECT * FROM confirmaciones $donde $orden", $parametros);

    responderBien([
        'filas'    => $filas,
        'columnas' => $COLUMNAS,
        // La app usa esto para esconder los botones de editar y borrar
        // si la tabla no tiene id, en vez de mostrarlos y que fallen.
        'editable' => $TIENE_ID,
    ]);
    break;


/* ─── VER UNA ─────────────────────────────────────────────────────────── */

case 'ver':
    exigirMetodo('GET');
    if (!$TIENE_ID) responderMal('Esta tabla no tiene columna id.', 400);

    $fila = consultarUno(
        'SELECT * FROM confirmaciones WHERE id = :id',
        [':id' => (int) ($_GET['id'] ?? 0)]
    );
    if (!$fila) responderMal('Esa confirmación no existe.', 404);

    responderBien($fila);
    break;


/* ─── EDITAR ──────────────────────────────────────────────────────────── */

case 'editar':
    exigirMetodo('POST');
    if (!$TIENE_ID) responderMal('Esta tabla no tiene columna id: no se puede editar.', 400);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $antes = consultarUno('SELECT * FROM confirmaciones WHERE id = :id', [':id' => $id]);
    if (!$antes) responderMal('Esa confirmación no existe.', 404);

    $cambios = leerCamposDelInvitado($datos, $EDITABLES, $antes);
    if (!$cambios) responderMal('No mandaste ningún cambio.', 400);

    actualizar('confirmaciones', $id, $cambios);
    anotarEnBitacora($yo, 'editó una confirmación', 'confirmaciones', $id,
                     (string) ($antes['nombre'] ?? ''));

    responderBien(['mensaje' => 'Confirmación actualizada.']);
    break;


/* ─── CREAR A MANO ────────────────────────────────────────────────────── */

case 'crear':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $cambios = leerCamposDelInvitado($datos, $EDITABLES, []);

    if (hay('nombre') && ($cambios['nombre'] ?? '') === '') {
        responderMal('Hace falta al menos el nombre.', 400);
    }

    // Si la tabla lleva fecha y el alta es a mano, se pone la de ahora.
    if ($COL_FECHA && !isset($cambios[$COL_FECHA])) {
        $cambios[$COL_FECHA] = date('Y-m-d H:i:s');
    }

    $id = insertar('confirmaciones', $cambios);
    anotarEnBitacora($yo, 'dio de alta a un invitado', 'confirmaciones', $id,
                     (string) ($cambios['nombre'] ?? ''));

    responderBien(['id' => $id], 201);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    if (!$TIENE_ID) responderMal('Esta tabla no tiene columna id: no se puede borrar.', 400);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $fila = consultarUno('SELECT * FROM confirmaciones WHERE id = :id', [':id' => $id]);
    if (!$fila) responderMal('Esa confirmación no existe.', 404);

    // Se guarda en la bitácora QUÉ se borró, no solo que se borró: si
    // alguien elimina una confirmación por error, el dato queda acá.
    anotarEnBitacora($yo, 'borró una confirmación', 'confirmaciones', $id,
                     json_encode($fila, JSON_UNESCAPED_UNICODE));

    // Si tenía mesa asignada, esa asignación queda huérfana: se limpia.
    if (existeTabla('asignacion_mesas')) {
        ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :id', [':id' => $id]);
    }

    borrar('confirmaciones', $id);
    responderBien(['mensaje' => 'Confirmación eliminada.']);
    break;


/* ─── BAJAR COMO PLANILLA ─────────────────────────────────────────────── */

case 'csv':
    exigirMetodo('GET');

    $filas = consultarTodo('SELECT * FROM confirmaciones' .
                           ($COL_FECHA ? " ORDER BY `$COL_FECHA` DESC" : ''));

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="invitados-ania-xv.csv"');

    $salida = fopen('php://output', 'w');

    // El BOM es lo que hace que Excel abra el archivo con los acentos
    // bien. Sin él, "María" se ve como "MarÃ­a" y la planilla parece rota.
    fwrite($salida, "\xEF\xBB\xBF");

    if ($filas) {
        fputcsv($salida, array_keys($filas[0]));
        foreach ($filas as $fila) fputcsv($salida, $fila);
    } else {
        fputcsv($salida, $COLUMNAS);
    }

    fclose($salida);
    exit;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDA ───────────────────────────────────────────────────────────── */

/**
 * Toma los campos del invitado que vinieron, y solo los que existen.
 *
 * @param array    $datos     Lo que mandó la app.
 * @param string[] $editables Columnas que existen y se pueden tocar.
 * @param array    $antes     La fila actual, para calcular el total.
 * @return array Columna => valor, listo para insertar o actualizar.
 */
function leerCamposDelInvitado($datos, $editables, $antes) {
    $cambios = [];

    foreach ($editables as $columna) {
        // Solo se tocan las columnas que la app mandó explícitamente. Sin
        // esto, editar el nombre borraría las alergias por dejarlas fuera.
        if (!array_key_exists($columna, $datos)) continue;

        switch ($columna) {
            case 'asiste':
                $cambios['asiste'] = !empty($datos['asiste']) ? 1 : 0;
                break;

            case 'adultos':
            case 'ninos':
                $cambios[$columna] = campoEntero($datos, $columna, 0, 99);
                break;

            case 'total':
                // El total no se acepta de la app: se calcula, para que
                // no pueda quedar en desacuerdo con adultos + niños.
                break;

            case 'correo':
                $correo = campoTexto($datos, 'correo', 190);
                if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    responderMal('Ese correo no es válido.', 422);
                }
                $cambios['correo'] = $correo;
                break;

            default:
                $cambios[$columna] = campoTexto($datos, $columna, 1000);
        }
    }

    // Recalcular el total con los valores que quedan después del cambio.
    if (in_array('total', $editables, true)) {
        $adultos = $cambios['adultos'] ?? (int) ($antes['adultos'] ?? 0);
        $ninos   = $cambios['ninos']   ?? (int) ($antes['ninos'] ?? 0);
        $cambios['total'] = $adultos + $ninos;
    }

    return $cambios;
}
