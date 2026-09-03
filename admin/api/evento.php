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
            /* Dónde va en el plano. En 0 = todavía sin ubicar. Sin
               estas dos, una mesa creada a mano no se podía colocar en
               el plano por ninguna vía: el arrastre solo reubica lo que
               ya tiene un lugar. Mismos topes que mesas.php?accion=ubicar. */
            'fila'      => ['entero', 0, 20],
            'columna'   => ['entero', 0, 12],
        ],
        'obligatorio' => 'nombre',
        /* Al EDITAR, lo que no venga en el JSON conserva lo que ya
           tenía. Sin esto, cualquier guardado que no mande fila y
           columna —un formulario viejo en caché, el asistente— las
           dejaría en 0 y la mesa desaparecería del plano sin que nadie
           haya pedido moverla. */
        'conservar_si_falta' => ['fila', 'columna'],
    ],
    'regalos' => [
        'orden'  => 'pedido_en_lista DESC, agradecido, recibido_en DESC, id DESC',
        // Si la instalación todavía no corrió instalar.php, esta columna
        // no existe y el ORDER BY de arriba tira un error de SQL. Sin
        // este respaldo, ESE error mataba toda la respuesta de
        // ?accion=todo —incluidas Mesas y Foráneos, que ni siquiera
        // dependen de esta columna— porque son nueve tablas en el mismo
        // bucle y la primera que falla corta a las demás.
        'orden_si_falta_migracion' => 'agradecido, recibido_en DESC, id DESC',
        'campos' => [
            'de_parte_de'     => ['texto', 150],
            'descripcion'     => ['texto', 300],
            'origen'          => ['opcion', ['amazon','directo','efectivo','otro'], 'directo'],
            'monto'           => ['monto'],
            'recibido_en'     => ['fecha'],
            'agradecido'      => ['booleano'],
            'correo_origen'   => ['texto', 190],
            'notas'           => ['texto', 2000],
            // La mesa de regalos de Amazon (ver el bloque de abajo):
            // artículos cargados una vez y cruzados contra el correo.
            'precio'          => ['monto'],
            'enlace'          => ['texto', 500],
            'comprado_en'     => ['fecha'],
            'pedido_en_lista' => ['booleano'],
        ],
        // 'descripcion' y no 'de_parte_de': un artículo recién cargado a
        // la lista de deseos todavía no tiene quién lo regaló —eso se
        // sabe después, cuando llega—, pero sí tiene que decir qué es.
        'obligatorio' => 'descripcion',
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
        $orden = $config['orden'];

        /* Degradar sin romper: si esta tabla todavía no tiene la columna
           que el orden de fábrica necesita (instalar.php no corrió, o
           no corrió TODAVÍA en este servidor), se usa un orden de
           respaldo que solo pide columnas base. Así una migración a
           medio correr no tumba las nueve tablas de esta pantalla, solo
           deja mal ordenada la que le falta algo. */
        if (isset($config['orden_si_falta_migracion'])
            && preg_match('/^[a-z_]+/', $orden, $m)
            && !in_array($m[0], columnasDe($tabla), true)) {
            $orden = $config['orden_si_falta_migracion'];
        }

        $resultado[$tabla] = consultarTodo("SELECT * FROM `$tabla` ORDER BY " . $orden);
    }

    /* La ceremonia es una sola fila, no una lista. Si todavía no existe,
       se devuelve un objeto vacío para que el formulario pueda abrirse
       igual y crearla al guardar. Y si la TABLA todavía no existe —
       instalación sin migrar— se devuelve lo mismo en vez de tronar. */
    $ceremonia = existeTabla('ceremonia')
        ? consultarUno('SELECT * FROM ceremonia ORDER BY id LIMIT 1')
        : null;
    $resultado['ceremonia'] = $ceremonia ?: new stdClass();

    /* Las mesas con cuántos lugares llevan ocupados. Se calcula acá y no
       en la app porque hace falta cruzar dos tablas. Sin
       asignacion_mesas (instalación sin migrar) se devuelve la
       ocupación en cero en vez de tronar: Mesas se ve vacía, no rota.

       `fijadas` y `sueltas` viajan para que borrar una mesa pueda decir
       a cuántos afecta ANTES de hacerlo (el CASCADE de la tabla los
       levanta a todos en silencio, candado incluido). Las personas
       sueltas —Fase 9, alguien sacado de su familia— van en una
       consulta aparte a propósito: unir las dos tablas en un solo
       GROUP BY multiplica las filas y `ocupados` saldría inflado. */
    $resultado['ocupacion'] = existeTabla('asignacion_mesas')
        ? consultarTodo(
            'SELECT m.id, m.nombre, m.capacidad,
                    COALESCE(SUM(a.lugares), 0) AS ocupados,
                    COUNT(a.id)                 AS grupos,
                    COALESCE(SUM(a.fijada), 0)  AS fijadas
             FROM mesas m
             LEFT JOIN asignacion_mesas a ON a.mesa_id = m.id
             GROUP BY m.id, m.nombre, m.capacidad
             ORDER BY m.nombre'
        )
        : array_map(function ($m) {
            return ['id' => $m['id'], 'nombre' => $m['nombre'],
                    'capacidad' => $m['capacidad'], 'ocupados' => 0,
                    'grupos' => 0, 'fijadas' => 0];
        }, $resultado['mesas']);

    if (existeTabla('asignacion_mesas_persona')) {
        $sueltasPorMesa = [];
        foreach (consultarTodo(
            'SELECT mesa_id,
                    COUNT(*)                  AS sueltas,
                    COALESCE(SUM(fijada), 0)  AS fijadas
             FROM asignacion_mesas_persona
             GROUP BY mesa_id'
        ) as $fila) {
            $sueltasPorMesa[(int) $fila['mesa_id']] = $fila;
        }

        foreach ($resultado['ocupacion'] as &$mesa) {
            $extra = $sueltasPorMesa[(int) $mesa['id']] ?? null;
            $mesa['sueltas'] = $extra ? (int) $extra['sueltas'] : 0;
            $mesa['ocupados'] = (int) $mesa['ocupados'] + $mesa['sueltas'];
            $mesa['fijadas']  = (int) $mesa['fijadas']
                              + ($extra ? (int) $extra['fijadas'] : 0);
        }
        unset($mesa);
    }

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
        $hay = consultarUno("SELECT * FROM `$que` WHERE id = :id", [':id' => $id]);
        if (!$hay) responderMal('Ese registro ya no existe.', 404);

        /* Lo que la sección declaró como "conservar si falta" y no vino
           en el JSON se rellena con lo que ya estaba guardado, en vez de
           pisarlo con el valor por defecto del tipo. */
        foreach ($config['conservar_si_falta'] ?? [] as $columna) {
            if (!array_key_exists($columna, $datos) && isset($hay[$columna])) {
                $valores[$columna] = $hay[$columna];
            }
        }

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

    /* Borrar una mesa levanta a todos sus sentados por CASCADE, candado
       incluido (ver `asignacion_mesa` en migracion.sql). La foto se toma
       ACÁ, no solo antes de autoasignar, porque este es el otro camino
       por el que se pierde un acomodo entero — y hasta ahora era el
       único de los dos sin red. */
    if ($que === 'mesas') {
        require_once __DIR__ . '/_lib/mesas.php';
        $mesa = consultarUno('SELECT nombre FROM mesas WHERE id = :m', [':m' => $id]);
        guardarFotoDelAcomodo(
            'antes de borrar la mesa ' . ($mesa['nombre'] ?? $id),
            (int) ($yo['id'] ?? 0)
        );
    }

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
