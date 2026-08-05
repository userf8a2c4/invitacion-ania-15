<?php
/* ══════════════════════════════════════════════════════════════════════
   EVENTO.PHP · TODO LO PROPIO DE UNOS XV

   QUÉ HACE ESTE ARCHIVO
   Las partes del evento que no son ni invitados ni dinero:
     · corte de honor y ensayos del vals
     · la ceremonia y sus requisitos
     · la música por momento, y la lista de prohibidas
     · las citas de vestido, maquillaje y peinado
     · las tomas de foto imprescindibles
     · el cronograma del día
     · las mesas y quién se sienta dónde
     · regalos recibidos y invitados foráneos

   POR QUÉ TODO EN UN SOLO ARCHIVO
   Son nueve tablas simples que se ven en la misma pestaña. Nueve
   endpoints separados serían nueve viajes al servidor para pintar una
   pantalla; así es uno solo.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=todo        todas las listas de una vez
     POST ?accion=guardar&que=musica    crea o edita
     POST ?accion=borrar&que=musica     elimina
     POST ?accion=alternar&que=tomas_foto  marca y desmarca
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'todo');

/**
 * Las tablas que este archivo sabe manejar, y qué columnas acepta de
 * cada una.
 *
 * Tener esto en una tabla de datos y no en un switch gigante es lo que
 * permite que guardar y borrar sean UNA función para las nueve. Y como
 * la lista de columnas es cerrada, nada que llegue de afuera puede
 * tocar una columna que no esté acá.
 */
$TABLAS = [
    'corte_honor' => [
        'orden'   => 'rol, nombre',
        'campos'  => [
            'nombre'    => ['texto', 150],
            'rol'       => ['opcion', ['chambelan','dama','pareja_vals','otro'], 'chambelan'],
            'telefono'  => ['texto', 40],
            'talla'     => ['texto', 30],
            'vestuario' => ['opcion', ['pendiente','medido','listo'], 'pendiente'],
            'notas'     => ['texto', 2000],
        ],
        'obligatorio' => 'nombre',
    ],
    'ensayos' => [
        'orden'  => 'fecha DESC',
        'campos' => [
            'fecha' => ['fecha'],
            'hora'  => ['hora'],
            'lugar' => ['texto', 200],
            'notas' => ['texto', 2000],
        ],
        'obligatorio' => 'fecha',
    ],
    'requisitos_ceremonia' => [
        'orden'  => "FIELD(estado,'pendiente','en_tramite','listo'), fecha_limite",
        'campos' => [
            'requisito'    => ['texto', 200],
            'estado'       => ['opcion', ['pendiente','en_tramite','listo'], 'pendiente'],
            'fecha_limite' => ['fecha'],
            'notas'        => ['texto', 2000],
        ],
        'obligatorio' => 'requisito',
    ],
    'musica' => [
        'orden'  => "FIELD(momento,'entrada','vals','brindis','pastel','baile','otro','prohibida'), orden, cancion",
        'campos' => [
            'cancion' => ['texto', 200],
            'artista' => ['texto', 150],
            'momento' => ['opcion',
                          ['vals','entrada','brindis','pastel','baile','prohibida','otro'],
                          'baile'],
            'orden'   => ['entero', 0, 999],
            'enlace'  => ['texto', 400],
            'notas'   => ['texto', 2000],
        ],
        'obligatorio' => 'cancion',
    ],
    'citas_arreglo' => [
        'orden'  => 'fecha IS NULL, fecha',
        'campos' => [
            'tipo'   => ['opcion', ['vestido','maquillaje','peinado','zapatos','otro'], 'vestido'],
            'titulo' => ['texto', 200],
            'fecha'  => ['fecha'],
            'hora'   => ['hora'],
            'lugar'  => ['texto', 200],
            'costo'  => ['monto'],
            'estado' => ['opcion', ['pendiente','hecha','cancelada'], 'pendiente'],
            'notas'  => ['texto', 2000],
        ],
        'obligatorio' => 'titulo',
    ],
    'tomas_foto' => [
        'orden'  => 'hecha, orden, id',
        'campos' => [
            'toma'     => ['texto', 300],
            'momento'  => ['texto', 80],
            'personas' => ['texto', 300],
            'orden'    => ['entero', 0, 999],
            'hecha'    => ['booleano'],
        ],
        'obligatorio' => 'toma',
    ],
    'cronograma' => [
        'orden'  => 'hora',
        'campos' => [
            'hora'        => ['hora'],
            'momento'     => ['texto', 200],
            'detalle'     => ['texto', 2000],
            'responsable' => ['texto', 100],
        ],
        'obligatorio' => 'momento',
    ],
    'mesas' => [
        'orden'  => 'nombre',
        'campos' => [
            'nombre'    => ['texto', 60],
            'capacidad' => ['entero', 1, 99],
            'ubicacion' => ['texto', 120],
            'notas'     => ['texto', 2000],
        ],
        'obligatorio' => 'nombre',
    ],
    'regalos' => [
        'orden'  => 'agradecido, recibido_en DESC, id DESC',
        'campos' => [
            'de_parte_de'   => ['texto', 150],
            'descripcion'   => ['texto', 300],
            'origen'        => ['opcion', ['amazon','directo','efectivo','otro'], 'directo'],
            'monto'         => ['monto'],
            'recibido_en'   => ['fecha'],
            'agradecido'    => ['booleano'],
            'correo_origen' => ['texto', 190],
            'notas'         => ['texto', 2000],
        ],
        'obligatorio' => 'de_parte_de',
    ],
    'foraneos' => [
        'orden'  => 'llega IS NULL, llega, nombre',
        'campos' => [
            'nombre'     => ['texto', 150],
            'telefono'   => ['texto', 40],
            'ciudad'     => ['texto', 120],
            'hospedaje'  => ['texto', 200],
            'llega'      => ['fecha'],
            'se_va'      => ['fecha'],
            'transporte' => ['texto', 200],
            'notas'      => ['texto', 2000],
        ],
        'obligatorio' => 'nombre',
    ],
];


switch ($accion) {

/* ─── TODO JUNTO ──────────────────────────────────────────────────────── */

case 'todo':
    exigirMetodo('GET');

    $resultado = [];
    foreach ($TABLAS as $tabla => $config) {
        $resultado[$tabla] = consultarTodo(
            "SELECT * FROM `$tabla` ORDER BY " . $config['orden']
        );
    }

    /* La ceremonia es una sola fila, no una lista. Si todavía no existe,
       se devuelve un objeto vacío para que el formulario pueda abrirse
       igual y crearla al guardar. */
    $ceremonia = consultarUno('SELECT * FROM ceremonia ORDER BY id LIMIT 1');
    $resultado['ceremonia'] = $ceremonia ?: new stdClass();

    /* Las mesas con cuántos lugares llevan ocupados. Se calcula acá y no
       en la app porque hace falta cruzar dos tablas. */
    $resultado['ocupacion'] = consultarTodo(
        'SELECT m.id, m.nombre, m.capacidad,
                COALESCE(SUM(a.lugares), 0) AS ocupados,
                COUNT(a.id)                 AS grupos
         FROM mesas m
         LEFT JOIN asignacion_mesas a ON a.mesa_id = m.id
         GROUP BY m.id, m.nombre, m.capacidad
         ORDER BY m.nombre'
    );

    responderBien($resultado);
    break;


/* ─── GUARDAR ─────────────────────────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');

    $que = (string) ($_GET['que'] ?? '');

    // La ceremonia va aparte porque es fila única.
    if ($que === 'ceremonia') {
        $datos = cuerpoJson();
        $valores = [
            'iglesia'   => campoTexto($datos, 'iglesia', 200),
            'direccion' => campoTexto($datos, 'direccion', 300),
            'fecha'     => campoFecha($datos, 'fecha'),
            'hora'      => leerHora($datos, 'hora'),
            'sacerdote' => campoTexto($datos, 'sacerdote', 150),
            'telefono'  => campoTexto($datos, 'telefono', 40),
            'costo'     => campoMonto($datos, 'costo'),
            'notas'     => campoTexto($datos, 'notas', 2000),
        ];

        $existe = consultarUno('SELECT id FROM ceremonia ORDER BY id LIMIT 1');
        if ($existe) {
            actualizar('ceremonia', $existe['id'], $valores);
            $id = (int) $existe['id'];
        } else {
            $id = insertar('ceremonia', $valores);
        }

        anotarEnBitacora($yo, 'guardó los datos de la ceremonia', 'ceremonia', $id);
        responderBien(['id' => $id]);
    }

    if (!isset($TABLAS[$que])) responderMal('No sé guardar eso.', 400);

    $config  = $TABLAS[$que];
    $datos   = cuerpoJson();
    $valores = leerCampos($datos, $config['campos']);

    // El campo obligatorio de esa tabla no puede quedar vacío.
    $clave = $config['obligatorio'];
    if (($valores[$clave] ?? '') === '' || $valores[$clave] === null) {
        responderMal('Falta completar el campo principal.', 400);
    }

    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        $hay = consultarUno("SELECT id FROM `$que` WHERE id = :id", [':id' => $id]);
        if (!$hay) responderMal('Ese registro ya no existe.', 404);

        actualizar($que, $id, $valores);
        anotarEnBitacora($yo, 'editó un registro', $que, $id, (string) $valores[$clave]);
        responderBien(['id' => $id, 'creado' => false]);
    }

    $nuevo = insertar($que, $valores);
    anotarEnBitacora($yo, 'creó un registro', $que, $nuevo, (string) $valores[$clave]);
    responderBien(['id' => $nuevo, 'creado' => true], 201);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    /* Borrar es de administradora. Una cuenta de entrada trabaja en la
       puerta el día del evento: puede consultar, no destruir. */
    exigirAdministrador();

    $que = (string) ($_GET['que'] ?? '');
    if (!isset($TABLAS[$que])) responderMal('No sé borrar eso.', 400);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    borrar($que, $id);
    anotarEnBitacora($yo, 'borró un registro', $que, $id);
    responderBien(['mensaje' => 'Eliminado.']);
    break;


/* ─── ALTERNAR UNA CASILLA ────────────────────────────────────────────── */

case 'alternar':
    exigirMetodo('POST');

    $que = (string) ($_GET['que'] ?? '');

    /* Solo estas dos tienen casilla de un toque, y cada una la suya. La
       lista blanca evita que se pueda alternar cualquier columna. */
    $permitido = ['tomas_foto' => 'hecha', 'regalos' => 'agradecido'];
    if (!isset($permitido[$que])) responderMal('Eso no se puede alternar.', 400);

    $columna = $permitido[$que];
    $datos   = cuerpoJson();
    $id      = campoEntero($datos, 'id', 1);

    $fila = consultarUno("SELECT `$columna` FROM `$que` WHERE id = :id", [':id' => $id]);
    if (!$fila) responderMal('Ese registro no existe.', 404);

    $nuevo = ((int) $fila[$columna] === 1) ? 0 : 1;
    actualizar($que, $id, [$columna => $nuevo]);

    responderBien(['valor' => $nuevo]);
    break;


/* ─── ASIGNAR MESA A UN INVITADO ──────────────────────────────────────── */

case 'sentar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);
    $mesa         = campoEntero($datos, 'mesa_id', 0);

    // Mesa 0 significa "sacar de la mesa".
    if ($mesa === 0) {
        ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
                 [':c' => $confirmacion]);
        responderBien(['mensaje' => 'Se quitó de la mesa.']);
    }

    // Cuántos lugares ocupa: los que declaró en su confirmación.
    $gente = consultarUno(
        'SELECT adultos, ninos FROM confirmaciones WHERE id = :id',
        [':id' => $confirmacion]
    );
    if (!$gente) responderMal('Esa confirmación no existe.', 404);

    $lugares = max(1, (int) $gente['adultos'] + (int) $gente['ninos']);

    /* Un invitado no puede estar en dos mesas: la tabla tiene índice
       único por confirmacion_id, así que se reemplaza la asignación
       anterior en vez de agregar otra. */
    ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
             [':c' => $confirmacion]);

    insertar('asignacion_mesas', [
        'confirmacion_id' => $confirmacion,
        'mesa_id'         => $mesa,
        'lugares'         => $lugares,
    ]);

    responderBien(['lugares' => $lugares]);
    break;


/* ─── QUIÉN ESTÁ EN CADA MESA ─────────────────────────────────────────── */

case 'mesas_detalle':
    exigirMetodo('GET');

    responderBien(consultarTodo(
        'SELECT a.mesa_id, a.lugares, c.id AS confirmacion_id, c.nombre
         FROM asignacion_mesas a
         JOIN confirmaciones c ON c.id = a.confirmacion_id
         ORDER BY a.mesa_id, c.nombre'
    ));
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Lee los campos de una tabla según su descripción en $TABLAS.
 *
 * Cada tipo se valida distinto. Como la lista de campos viene de $TABLAS
 * y no de lo que mandó el navegador, nada de afuera puede colar una
 * columna que no esté declarada.
 *
 * @param array $datos  Lo que llegó de la app.
 * @param array $campos columna => [tipo, ...opciones]
 * @return array Columna => valor listo para guardar.
 */
function leerCampos($datos, $campos) {
    $valores = [];

    foreach ($campos as $columna => $regla) {
        $tipo = $regla[0];

        switch ($tipo) {
            case 'texto':
                $valores[$columna] = campoTexto($datos, $columna, $regla[1]);
                break;

            case 'entero':
                $valores[$columna] = campoEntero($datos, $columna, $regla[1], $regla[2]);
                break;

            case 'monto':
                $valores[$columna] = campoMonto($datos, $columna);
                break;

            case 'fecha':
                $valores[$columna] = campoFecha($datos, $columna);
                break;

            case 'hora':
                $valores[$columna] = leerHora($datos, $columna);
                break;

            case 'booleano':
                $valores[$columna] = !empty($datos[$columna]) ? 1 : 0;
                break;

            case 'opcion':
                $valores[$columna] = campoOpcion($datos, $columna, $regla[1], $regla[2]);
                break;
        }
    }

    return $valores;
}

/**
 * Lee una hora HH:MM y la devuelve como HH:MM:00, o null.
 *
 * @param array  $origen
 * @param string $clave
 * @return string|null
 */
function leerHora($origen, $clave) {
    $valor = trim((string) ($origen[$clave] ?? ''));
    if ($valor === '') return null;
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $valor) ? $valor . ':00' : null;
}
