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
exigirPermiso($yo, 'invitados', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'listar');


/* ─── AVERIGUAR CÓMO ES LA TABLA ──────────────────────────────────────── */

if (!existeTabla('confirmaciones')) {
    responderMal('No encuentro la lista de invitados. Avísale a quien instaló el panel.', 500);
}

$COLUMNAS = columnasDe('confirmaciones');

/**
 * El link completo que le corresponde a un token de invitación. Copia
 * exacta de la de invitaciones.php (mismo nombre, mismo cuerpo) — se
 * duplica en vez de compartirse porque cada admin/api/*.php es un
 * endpoint HTTP independiente que solo carga UN archivo top-level; no
 * hay riesgo de redeclaración, y no vale la pena una librería
 * compartida para tres líneas.
 *
 * @param string $token
 * @return string
 */
function linkDeInvitacion($token) {
    $host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST'] ?? 'aniaxv.com');
    return 'https://' . $host . '/?i=' . $token;
}

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

/* La columna de fecha, se llame como se llame.
   En esta base es `fecha_hora` (datetime, con CURRENT_TIMESTAMP por
   defecto), comprobado en phpMyAdmin el 2 de agosto de 2026. Las demás
   quedan como respaldo por si la tabla se recrea con otro nombre. */
$COL_FECHA = primeraQueHaya([
    'fecha_hora', 'creado_en', 'fecha', 'created_at', 'fecha_registro',
]);

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
        if ($filtro === 'asisten')   $condiciones[] = 'confirmaciones.asiste = 1';
        if ($filtro === 'no_asisten') $condiciones[] = 'confirmaciones.asiste = 0';
    }

    // Búsqueda por nombre, correo o código de pase.
    $busca = trim((string) ($_GET['busca'] ?? ''));
    if ($busca !== '') {
        $trozos = [];
        foreach (['nombre', 'correo', 'codigo'] as $columna) {
            // Con el LEFT JOIN de mesas hay que aclarar de qué tabla es
            // cada columna: "mesas" también tiene "nombre".
            if (hay($columna)) $trozos[] = "confirmaciones.`$columna` LIKE :busca";
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
    if ($COL_FECHA)      $orden = "ORDER BY confirmaciones.`$COL_FECHA` DESC";
    elseif ($TIENE_ID)   $orden = 'ORDER BY confirmaciones.id DESC';

    // La mesa no vive en confirmaciones: se trae con un LEFT JOIN si esas
    // tablas ya existen (podrían no existir si no se corrió esa parte de
    // la migración).
    $conMesa = $TIENE_ID && existeTabla('asignacion_mesas') && existeTabla('mesas');
    $selectMesa = $conMesa
        ? ', am.mesa_id AS mesa_id, m.nombre AS mesa'
        : '';
    $joinMesa = $conMesa
        ? ' LEFT JOIN asignacion_mesas am ON am.confirmacion_id = confirmaciones.id' .
          ' LEFT JOIN mesas m ON m.id = am.mesa_id'
        : '';

    /* ⚡ (2026-08-28) FUSIÓN DE "INVITADOS" E "INVITACIONES", A PEDIDO DEL
       USUARIO: dos pestañas para la misma info repartida confundían más
       de lo que ayudaban ("comparten raíz, se leen como la misma tarea
       dos veces" — literal). El link, el teléfono, el grupo y el estado
       de envío vivían solo en `invitaciones`; ahora viajan en la MISMA
       fila que el resto, con un LEFT JOIN — así el panel arma una sola
       ficha por persona sin tener que pedir dos listados y cruzarlos a
       mano. Sigue siendo opcional: una confirmación vieja sin invitación
       (del formulario abierto, antes de este modelo) simplemente trae
       estos campos en NULL, y el panel ofrece "Generar link". */
    $conInvitacion = $TIENE_ID && existeTabla('invitaciones');
    // ⚡ (2026-08-30) BUG REAL: `veces_enviado` se agregó a `invitaciones`
    // en una ronda posterior a la que creó esta tabla (ver migracion.sql),
    // y esta consulta la pedía sin comprobar que existiera — a diferencia
    // de TODO el resto de este archivo, que sí se cuida con existeTabla()/
    // hay(). En cualquier instalación donde no se haya vuelto a correr
    // instalar.php después de esa ronda, "columna desconocida" tumbaba
    // esta consulta entera — y esta es la que carga "Gente". Mismo
    // criterio que columnasDe()/hay() usan en todo el archivo.
    $columnasInv = $conInvitacion ? columnasDe('invitaciones') : [];
    $selectVecesEnviado = in_array('veces_enviado', $columnasInv, true)
        ? 'inv.veces_enviado' : 'NULL';
    /* ⚡ respondida_en viaja al panel para poder decir "quién falta" sin
       adivinar (2026-09-02). El filtro "Sin responder" se calculaba solo
       con inv.estado, y una fila sin invitación (las importadas, que son
       la mayoría) tenía estado NULL y pasaba SIEMPRE — la lista filtrada
       quedaba idéntica a "Todos". Con esto el panel puede distinguir
       "contestó" de "todavía no" en los dos casos. Se consulta con el
       mismo criterio defensivo que veces_enviado, por si la columna no
       existe en una base vieja. */
    $selectRespondidaEn = in_array('respondida_en', $columnasInv, true)
        ? 'inv.respondida_en' : 'NULL';
    $selectInv = $conInvitacion
        /* `invitacion_correo` es el correo de la INVITACIÓN, que no es
           el mismo campo que confirmaciones.correo: es a donde se manda
           el link. Sin él, la ficha no podía saber si ofrecer "Mandar
           por correo" (ver invitaciones.php?accion=enviar_correo). */
        ? ', inv.id AS invitacion_id, inv.token AS invitacion_token,
            inv.telefono AS invitacion_telefono, inv.pases AS invitacion_pases,
            inv.correo AS invitacion_correo,
            inv.estado AS invitacion_estado, inv.grupo_id AS invitacion_grupo_id,
            ' . $selectVecesEnviado . ' AS invitacion_veces_enviado,
            ' . $selectRespondidaEn . ' AS invitacion_respondida_en,
            g.nombre AS invitacion_grupo_nombre'
        : '';
    $joinInv = $conInvitacion
        ? ' LEFT JOIN invitaciones inv ON inv.confirmacion_id = confirmaciones.id' .
          (existeTabla('grupos_invitados')
              ? ' LEFT JOIN grupos_invitados g ON g.id = inv.grupo_id'
              : '')
        : '';

    $filas = consultarTodo(
        "SELECT confirmaciones.* $selectMesa $selectInv
         FROM confirmaciones $joinMesa $joinInv $donde $orden",
        $parametros
    );

    // El link se arma acá (mismo host que ya usa invitaciones.php), no
    // en el navegador: así el panel nunca tiene que adivinar el dominio.
    if ($conInvitacion) {
        foreach ($filas as &$fila) {
            $fila['invitacion_link'] = $fila['invitacion_token']
                ? linkDeInvitacion($fila['invitacion_token']) : null;
        }
        unset($fila);
    }

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
    if (!$TIENE_ID) responderMal('Esta lista es de solo lectura.', 400);

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
    if (!$TIENE_ID) responderMal('Esta lista es de solo lectura: no se puede editar.', 400);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $antes = consultarUno('SELECT * FROM confirmaciones WHERE id = :id', [':id' => $id]);
    if (!$antes) responderMal('Esa confirmación no existe.', 404);

    $cambios = leerCamposDelInvitado($datos, $EDITABLES, $antes);
    if (!$cambios) responderMal('No mandaste ningún cambio.', 400);

    actualizar('confirmaciones', $id, $cambios);
    anotarEnBitacora($yo, 'editó una confirmación', 'confirmaciones', $id,
                     (string) ($antes['nombre'] ?? ''));

    $excesoDeCupo = calcularExcesoDeCupo();
    responderBien([
        'mensaje'   => 'Confirmación actualizada.',
        'se_excede' => $excesoDeCupo['excede'],
        'aviso'     => $excesoDeCupo['aviso'],
    ]);
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

    $excesoDeCupo = calcularExcesoDeCupo();
    responderBien([
        'id'        => $id,
        'se_excede' => $excesoDeCupo['excede'],
        'aviso'     => $excesoDeCupo['aviso'],
    ], 201);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    /* Borrar es de administradora. Una cuenta de entrada trabaja en la
       puerta el día del evento: puede consultar, no destruir. */
    exigirAdministrador();

    if (!$TIENE_ID) responderMal('Esta lista es de solo lectura: no se puede borrar.', 400);

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

    /* La planilla lleva nombres, correos y CÓDIGOS DE PASE de todos.
       Con esos códigos se entra a la fiesta, así que el archivo entero
       vale tanto como la lista de invitaciones. */
    exigirAdministrador();

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
 * ⚡ (2026-08-30) Cupo sustractivo: nunca bloquea (alta/edición a mano
 * la ve Lucila antes de guardar, puede haber sobre-reserva intencional),
 * solo informa. La capacidad sale de SUM(mesas.capacidad) -misma
 * cuenta que ya usa admin/api/estadisticas.php-, nunca de una
 * constante 140 pisada a mano. Se llama DESPUÉS de escribir el
 * cambio, así "personas que asisten" ya lo incluye.
 *
 * @return array{excede: bool, aviso: string}
 */
function calcularExcesoDeCupo() {
    if (!existeTabla('mesas') || !hay('asiste') || !hay('adultos') || !hay('ninos')) {
        return ['excede' => false, 'aviso' => ''];
    }
    $ocupadas = (int) (consultarUno(
        'SELECT COALESCE(SUM(adultos+ninos),0) AS t FROM confirmaciones WHERE asiste = 1'
    )['t'] ?? 0);
    $capacidadTotal = (int) (consultarUno(
        'SELECT COALESCE(SUM(capacidad),0) AS t FROM mesas'
    )['t'] ?? 0);
    $excede = $capacidadTotal > 0 && $ocupadas > $capacidadTotal;
    return [
        'excede' => $excede,
        'aviso'  => $excede ? 'Ojo: ya se pasan de la capacidad del salón.' : '',
    ];
}

/**
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
