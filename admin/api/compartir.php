<?php
/* ══════════════════════════════════════════════════════════════════════
   COMPARTIR.PHP · ARMAR LO QUE PIDE CADA PROVEEDOR

   QUÉ HACE ESTE ARCHIVO
   Genera el texto listo para mandarle a cada uno lo suyo: al banquete
   los menús y las alergias, al fotógrafo la lista de tomas, al DJ las
   canciones y las prohibidas, al salón el acomodo de las mesas.

   POR QUÉ ESTO ES LO QUE MÁS TRABAJO AHORRA
   Toda esa información ya está cargada, pero cada proveedor la pide en
   su formato y por su canal. Sin esto hay que abrir la sección, mirar
   la pantalla y transcribir a mano en WhatsApp — cada vez que cambia
   algo, que en una fiesta es siempre.

   POR QUÉ TEXTO PLANO Y NO UN PDF BONITO
   Porque el 90% de esto se manda por WhatsApp, y ahí un PDF se abre en
   otra app mientras que un texto se lee en la conversación. Además, el
   del banquete puede copiar un renglón y pegarlo en su sistema.

   QUÉ SE LE PUEDE PEDIR
     GET ?accion=que_hay        qué listas se pueden armar
     GET ?accion=armar&cual=banquete
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

/* Los paquetes de texto incluyen la lista completa de invitados con
   sus códigos de pase, y las alergias con nombre y apellido. Es
   información para mandarle a un proveedor, no para cualquier cuenta. */
$yo = exigirAdministrador();

/* GET para todo salvo anotar_envio, que escribe una fila. */
$accion = (string) ($_GET['accion'] ?? 'que_hay');
if ($accion !== 'anotar_envio') exigirMetodo('GET');

/**
 * Deja un teléfono como lo quiere wa.me: solo dígitos y con clave de país.
 *
 * ⚠️ TIENE QUE HACER LO MISMO QUE paraWhatsApp() EN codigo/02-utilidades.js.
 * Si uno normaliza y el otro no, la lista de proveedores dice "sin
 * WhatsApp" para un número que la ficha del mismo proveedor sí acepta, y
 * no hay forma de saber cuál de los dos tiene razón.
 *
 * @param string $telefono Como lo escribió quien lo cargó.
 * @return string Solo dígitos, o '' si no sirve.
 */
function telefonoParaWhatsApp($telefono) {
    $digitos = preg_replace('/\D/', '', (string) $telefono);
    if ($digitos === '') return '';

    // Diez dígitos es un número mexicano al que le falta la clave.
    if (strlen($digitos) === 10) return '52' . $digitos;
    if (strlen($digitos) >= 11)  return $digitos;

    // Menos de diez: incompleto, un interno, o un error de carga.
    return '';
}

/** El encabezado que lleva todo lo que se manda. */
function encabezado($titulo) {
    return "*XV de Ania · 24 de octubre de 2026*\n" .
           "_" . $titulo . "_\n" .
           str_repeat('—', 24) . "\n\n";
}


/* ─── QUÉ SE PUEDE ARMAR ──────────────────────────────────────────────── */

if ($accion === 'que_hay') {
    responderBien([
        ['clave' => 'banquete',  'nombre' => 'Para el banquete',
         'que' => 'Cuántos platos de cada menú y todas las alergias'],
        ['clave' => 'salon',     'nombre' => 'Para el salón',
         'que' => 'Cuánta gente, cuántas mesas y el acomodo'],
        ['clave' => 'fotografo', 'nombre' => 'Para el fotógrafo',
         'que' => 'La lista de tomas que no se pueden perder'],
        ['clave' => 'dj',        'nombre' => 'Para el DJ',
         'que' => 'Las canciones por momento y las prohibidas'],
        ['clave' => 'iglesia',   'nombre' => 'Para la iglesia',
         'que' => 'Datos de la misa y qué papeles faltan'],
        ['clave' => 'modista',   'nombre' => 'Para la modista',
         'que' => 'Las pruebas de vestido, con fecha y lugar'],
        ['clave' => 'invitados', 'nombre' => 'Lista de invitados',
         'que' => 'Quiénes confirmaron, con sus códigos de pase'],
    ]);
}


/* ─── A QUIÉN HAY QUE MANDARLE, Y SI YA SE LE MANDÓ ───────────────────── */

/*
   La pantalla "Mandarles a todos". Devuelve un renglón por proveedor que
   tenga paquete asignado, diciendo si ya se le mandó y si el texto
   cambió desde entonces.

   ⚠️ WhatsApp NO deja mandarle a varios de un toque desde un enlace. No
   hay truco que lo evite. Por eso esto es una lista para ir tocando uno
   por uno, y no un botón de "mandar a todos". A cambio, el texto se
   sigue viendo antes de cada envío, que es como corresponde.
*/
if ($accion === 'a_quien') {
    if (!existeTabla('proveedores')) responderBien(['proveedores' => []]);

    $hayEnvios = existeTabla('envios_proveedor');

    $filas = consultarTodo(
        "SELECT p.id, p.nombre, p.servicio, p.telefono, p.paquete, p.estado" .
        ($hayEnvios
            ? ", (SELECT e.enviado_en FROM envios_proveedor e
                   WHERE e.proveedor_id = p.id AND e.paquete = p.paquete
                   ORDER BY e.enviado_en DESC LIMIT 1) AS enviado_en,
                 (SELECT e.huella FROM envios_proveedor e
                   WHERE e.proveedor_id = p.id AND e.paquete = p.paquete
                   ORDER BY e.enviado_en DESC LIMIT 1) AS huella"
            : ', NULL AS enviado_en, NULL AS huella') . "
         FROM proveedores p
         WHERE p.paquete <> '' AND p.paquete IS NOT NULL
           AND p.estado <> 'cancelado'
         ORDER BY p.nombre"
    );

    foreach ($filas as &$f) {
        $f['sirve_whatsapp'] = telefonoParaWhatsApp($f['telefono']) !== '';
        $f['id'] = (int) $f['id'];
    }
    unset($f);

    responderBien(['proveedores' => $filas]);
}


/* ─── ANOTAR QUE SE MANDÓ ─────────────────────────────────────────────── */

/*
   Lo llama la app justo después de abrir WhatsApp. No hay forma de saber
   si el mensaje se envió de verdad —eso pasa dentro de WhatsApp, fuera
   del alcance del panel—, así que esto significa "se abrió el chat con
   el texto puesto", que es todo lo que se puede afirmar honestamente.
*/
if ($accion === 'anotar_envio') {
    exigirMetodo('POST');
    if (!existeTabla('envios_proveedor')) {
        responderMal('Falta la tabla envios_proveedor. Corre migracion.sql.', 500);
    }

    $datos = cuerpoJson();

    insertar('envios_proveedor', [
        'proveedor_id' => campoEntero($datos, 'proveedor_id', 1),
        'paquete'      => campoTexto($datos, 'paquete', 20),
        'huella'       => campoTexto($datos, 'huella', 64),
        'usuario_id'   => (int) $yo['id'],
    ]);

    responderBien(['mensaje' => 'Anotado.']);
}


/* ─── ARMAR ───────────────────────────────────────────────────────────── */

if ($accion !== 'armar') responderMal('Acción desconocida.', 404);

$cual = (string) ($_GET['cual'] ?? '');
$texto = '';


/* ═══ BANQUETE ═══ */
if ($cual === 'banquete') {
    $texto = encabezado('Menús y alergias');

    if (existeTabla('confirmaciones')) {
        $totales = consultarUno(
            'SELECT COUNT(*) AS grupos,
                    COALESCE(SUM(adultos), 0) AS adultos,
                    COALESCE(SUM(ninos), 0) AS ninos
             FROM confirmaciones WHERE asiste = 1'
        );

        $adultos = (int) $totales['adultos'];
        $ninos   = (int) $totales['ninos'];

        $texto .= "*TOTAL: " . ($adultos + $ninos) . " personas*\n";
        $texto .= "· Adultos: $adultos\n";
        $texto .= "· Niños: $ninos\n\n";

        /* Los menús se cuentan sobre el texto libre de resumen_menus,
           igual que en el tablero. Es texto que escribió cada invitado,
           así que se agrupa por lo que se puede reconocer. */
        $porMenu = [];
        foreach (consultarTodo(
            "SELECT resumen_menus FROM confirmaciones
             WHERE asiste = 1 AND resumen_menus <> ''"
        ) as $fila) {
            foreach (explode(',', (string) $fila['resumen_menus']) as $trozo) {
                $trozo = trim($trozo);
                if ($trozo === '') continue;

                if (preg_match('/^(\d+)\s*(.+)$/u', $trozo, $partes)) {
                    $nombre = mb_strtolower(trim($partes[2]));
                    $cuantos = (int) $partes[1];
                } else {
                    $nombre = mb_strtolower($trozo);
                    $cuantos = 1;
                }
                if (!isset($porMenu[$nombre])) $porMenu[$nombre] = 0;
                $porMenu[$nombre] += $cuantos;
            }
        }
        arsort($porMenu);

        if ($porMenu) {
            $texto .= "*MENÚS*\n";
            foreach ($porMenu as $nombre => $cuantos) {
                $texto .= "· " . mb_convert_case($nombre, MB_CASE_TITLE) .
                          ": $cuantos\n";
            }
            $texto .= "\n";
        }

        /* Las alergias van UNA POR UNA con nombre y apellido. No se
           resumen ni se cuentan: el del banquete necesita saber a quién
           corresponde cada plato especial, y un número no sirve. */
        $alergias = consultarTodo(
            "SELECT nombre, alergias FROM confirmaciones
             WHERE asiste = 1 AND alergias <> '' AND alergias IS NOT NULL
               AND LOWER(alergias) NOT IN ('ninguna','ninguno','no','n/a','-')
             ORDER BY nombre"
        );

        if ($alergias) {
            $texto .= "*⚠️ ALERGIAS Y RESTRICCIONES (" . count($alergias) . ")*\n";
            foreach ($alergias as $a) {
                $texto .= "· " . $a['nombre'] . ": " . $a['alergias'] . "\n";
            }
        } else {
            $texto .= "*Sin alergias declaradas.*\n";
        }
    }
}


/* ═══ SALÓN ═══ */
if ($cual === 'salon') {
    $texto = encabezado('Acomodo del salón');

    if (existeTabla('confirmaciones')) {
        $t = consultarUno(
            'SELECT COALESCE(SUM(adultos + ninos), 0) AS gente
             FROM confirmaciones WHERE asiste = 1'
        );
        $texto .= "*TOTAL: " . (int) $t['gente'] . " personas*\n\n";
    }

    if (existeTabla('mesas')) {
        $mesas = consultarTodo(
            'SELECT m.id, m.nombre, m.capacidad, m.ubicacion,
                    COALESCE(SUM(a.lugares), 0) AS ocupados
             FROM mesas m
             LEFT JOIN asignacion_mesas a ON a.mesa_id = m.id
             GROUP BY m.id, m.nombre, m.capacidad, m.ubicacion'
        );
        usort($mesas, function ($a, $b) {
            return strnatcasecmp($a['nombre'], $b['nombre']);
        });

        $texto .= "*MESAS: " . count($mesas) . "*\n\n";

        foreach ($mesas as $mesa) {
            $texto .= "*" . $mesa['nombre'] . "* (" . (int) $mesa['ocupados'] .
                      "/" . (int) $mesa['capacidad'] . ")" .
                      ($mesa['ubicacion'] ? " · " . $mesa['ubicacion'] : '') . "\n";

            $quienes = consultarTodo(
                'SELECT c.nombre, a.lugares FROM asignacion_mesas a
                 JOIN confirmaciones c ON c.id = a.confirmacion_id
                 WHERE a.mesa_id = :m ORDER BY c.nombre',
                [':m' => $mesa['id']]
            );

            foreach ($quienes as $q) {
                $texto .= "   · " . $q['nombre'] . " (" . (int) $q['lugares'] . ")\n";
            }
            if (!$quienes) $texto .= "   _(vacía)_\n";
            $texto .= "\n";
        }
    }
}


/* ═══ FOTÓGRAFO ═══ */
if ($cual === 'fotografo') {
    $texto = encabezado('Tomas que no se pueden perder');

    if (existeTabla('tomas_foto')) {
        $tomas = consultarTodo(
            'SELECT toma, momento, personas FROM tomas_foto ORDER BY orden, id'
        );

        if ($tomas) {
            $porMomento = [];
            foreach ($tomas as $t) {
                $clave = $t['momento'] ?: 'Sin momento';
                if (!isset($porMomento[$clave])) $porMomento[$clave] = [];
                $porMomento[$clave][] = $t;
            }

            foreach ($porMomento as $momento => $lista) {
                $texto .= "*" . mb_strtoupper($momento) . "*\n";
                foreach ($lista as $t) {
                    $texto .= "· " . $t['toma'] .
                              ($t['personas'] ? " — " . $t['personas'] : '') . "\n";
                }
                $texto .= "\n";
            }
        } else {
            $texto .= "_Todavía no cargamos la lista de tomas._\n";
        }
    }

    // Los horarios le sirven para saber cuándo estar dónde.
    if (existeTabla('cronograma')) {
        $momentos = consultarTodo(
            'SELECT hora, momento FROM cronograma ORDER BY hora'
        );
        if ($momentos) {
            $texto .= "*HORARIOS DEL DÍA*\n";
            foreach ($momentos as $m) {
                $texto .= "· " . substr($m['hora'], 0, 5) . " — " . $m['momento'] . "\n";
            }
        }
    }
}


/* ═══ DJ ═══ */
if ($cual === 'dj') {
    $texto = encabezado('Música');

    if (existeTabla('musica')) {
        $orden = ['entrada' => 'ENTRADA', 'vals' => 'VALS',
                  'brindis' => 'BRINDIS', 'pastel' => 'PASTEL',
                  'baile' => 'BAILE', 'otro' => 'OTRAS'];

        foreach ($orden as $clave => $titulo) {
            $canciones = consultarTodo(
                'SELECT cancion, artista, notas FROM musica
                 WHERE momento = :m ORDER BY orden, cancion',
                [':m' => $clave]
            );
            if (!$canciones) continue;

            $texto .= "*$titulo*\n";
            foreach ($canciones as $c) {
                $texto .= "· " . $c['cancion'] .
                          ($c['artista'] ? " — " . $c['artista'] : '') .
                          ($c['notas'] ? " (" . $c['notas'] . ")" : '') . "\n";
            }
            $texto .= "\n";
        }

        /* Las prohibidas van AL FINAL y bien marcadas. Es la parte que
           el DJ tiene que leer sí o sí, y ponerla arriba se pierde
           entre la lista larga de lo que sí. */
        $prohibidas = consultarTodo(
            "SELECT cancion, artista FROM musica WHERE momento = 'prohibida'
             ORDER BY cancion"
        );
        if ($prohibidas) {
            $texto .= "*🚫 QUE NO SUENEN, POR FAVOR*\n";
            foreach ($prohibidas as $p) {
                $texto .= "· " . $p['cancion'] .
                          ($p['artista'] ? " — " . $p['artista'] : '') . "\n";
            }
        }
    }
}


/* ═══ IGLESIA ═══ */
if ($cual === 'iglesia') {
    $texto = encabezado('Ceremonia');

    if (existeTabla('ceremonia')) {
        $c = consultarUno('SELECT * FROM ceremonia ORDER BY id LIMIT 1');
        if ($c) {
            if ($c['iglesia'])   $texto .= "*Iglesia:* " . $c['iglesia'] . "\n";
            if ($c['direccion']) $texto .= "*Dirección:* " . $c['direccion'] . "\n";
            if ($c['fecha'])     $texto .= "*Fecha:* " .
                                  date('d/m/Y', strtotime($c['fecha'])) . "\n";
            if ($c['hora'])      $texto .= "*Hora:* " . substr($c['hora'], 0, 5) . "\n";
            if ($c['sacerdote']) $texto .= "*Sacerdote:* " . $c['sacerdote'] . "\n";
            $texto .= "\n";
        }
    }

    if (existeTabla('requisitos_ceremonia')) {
        $faltan = consultarTodo(
            "SELECT requisito, estado FROM requisitos_ceremonia
             WHERE estado <> 'listo' ORDER BY fecha_limite"
        );
        if ($faltan) {
            $texto .= "*NOS FALTA ENTREGAR*\n";
            foreach ($faltan as $f) {
                $texto .= "· " . $f['requisito'] .
                          ($f['estado'] === 'en_tramite' ? " _(en trámite)_" : '') . "\n";
            }
        } else {
            $texto .= "_Ya entregamos todos los papeles._\n";
        }
    }
}


/* ═══ MODISTA ═══ */
/* Las citas de vestido eran lo único que el panel guardaba y no sabía
   compartir con nadie, aunque son justo las que hay que confirmar con
   otra persona. */
if ($cual === 'modista') {
    $texto = encabezado('Vestido y arreglo');

    if (existeTabla('citas_arreglo')) {
        $citas = consultarTodo(
            "SELECT titulo, tipo, fecha, hora, lugar, notas
             FROM citas_arreglo
             WHERE estado <> 'cancelada'
             ORDER BY fecha, hora"
        );

        $comoSeLlama = [
            'vestido'    => 'Vestido',
            'maquillaje' => 'Maquillaje',
            'peinado'    => 'Peinado',
            'zapatos'    => 'Zapatos',
            'otro'       => 'Otro',
        ];

        if ($citas) {
            foreach ($citas as $c) {
                $cuando = $c['fecha'] ? date('d/m/Y', strtotime($c['fecha'])) : 'Sin fecha';
                if ($c['hora']) $cuando .= ' · ' . substr($c['hora'], 0, 5);

                $texto .= "*" . ($c['titulo'] ?: ($comoSeLlama[$c['tipo']] ?? 'Cita')) . "*\n";
                $texto .= $cuando . "\n";
                if ($c['lugar']) $texto .= "📍 " . $c['lugar'] . "\n";
                if ($c['notas']) $texto .= "_" . $c['notas'] . "_\n";
                $texto .= "\n";
            }
        } else {
            $texto .= "_Todavía no hay citas agendadas._\n";
        }
    }

    /* La fecha de la fiesta va al final: es contra lo que la modista
       calcula cuándo tiene que estar terminado el vestido. */
    $texto .= str_repeat('—', 24) . "\n";
    $texto .= "*La fiesta es el 24 de octubre de 2026.*\n";
}


/* ═══ INVITADOS ═══ */
if ($cual === 'invitados') {
    $texto = encabezado('Invitados confirmados');

    if (existeTabla('confirmaciones')) {
        $filas = consultarTodo(
            'SELECT nombre, adultos, ninos, codigo FROM confirmaciones
             WHERE asiste = 1 ORDER BY nombre'
        );

        $total = 0;
        foreach ($filas as $f) {
            $gente = (int) $f['adultos'] + (int) $f['ninos'];
            $total += $gente;
            $texto .= "· " . $f['nombre'] . " (" . $gente . ")" .
                      ($f['codigo'] ? " — " . $f['codigo'] : '') . "\n";
        }

        $texto .= "\n*TOTAL: " . count($filas) . " confirmaciones · " .
                  $total . " personas*\n";
    }
}


if ($texto === '') responderMal('No sé armar esa lista.', 404);


/* ─── A QUIÉN SE LE MANDA ─────────────────────────────────────────────── */

/*
   Hasta acá el panel armaba textos perfectos y después te dejaba solo:
   el enlace era `wa.me/?text=…` SIN número, o sea que abría el selector
   de contactos de WhatsApp para que buscaras al DJ a mano. El teléfono
   del DJ estaba guardado a un metro de distancia, en la tabla de
   proveedores, y los dos sistemas nunca se miraron.

   Con `?proveedor=7` se busca su teléfono y el enlace abre SU chat con
   el texto ya escrito.
*/

$proveedorId = (int) ($_GET['proveedor'] ?? 0);
$proveedor   = null;

if ($proveedorId > 0 && existeTabla('proveedores')) {
    $proveedor = consultarUno(
        'SELECT id, nombre, telefono, correo FROM proveedores WHERE id = :id',
        [':id' => $proveedorId]
    );
    if (!$proveedor) responderMal('Ese proveedor no existe.', 404);
}

/* Un número mal cargado abre un chat vacío, o el de otra persona en otro
   país. Se avisa antes, que es mejor que descubrirlo con el mensaje ya
   mandado. */
$digitos = $proveedor ? telefonoParaWhatsApp($proveedor['telefono']) : '';
$sirveParaWhatsApp = $digitos !== '';

/* La huella dice si el texto cambió desde la última vez que se mandó.
   Es lo que evita el desastre de que el DJ toque una canción que se
   agregó a las prohibidas DESPUÉS de mandarle la lista. */
$huella = hash('sha256', $texto);

responderBien([
    'cual'  => $cual,
    'texto' => $texto,
    'huella' => $huella,

    'proveedor' => $proveedor ? [
        'id'     => (int) $proveedor['id'],
        'nombre' => $proveedor['nombre'],
        'sirve_whatsapp' => $sirveParaWhatsApp,
    ] : null,

    /* Con número si lo hay y sirve; si no, el selector de siempre. */
    'whatsapp' => 'https://wa.me/' . ($sirveParaWhatsApp ? $digitos : '') .
                  '?text=' . rawurlencode($texto),

    'correo' => $proveedor ? (string) $proveedor['correo'] : '',
]);
