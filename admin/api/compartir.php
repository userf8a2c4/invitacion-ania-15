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

exigirSesion();
exigirMetodo('GET');

$accion = (string) ($_GET['accion'] ?? 'que_hay');

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
        ['clave' => 'invitados', 'nombre' => 'Lista de invitados',
         'que' => 'Quiénes confirmaron, con sus códigos de pase'],
    ]);
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

responderBien([
    'cual'  => $cual,
    'texto' => $texto,
    // Listo para abrir WhatsApp con el texto ya escrito.
    'whatsapp' => 'https://wa.me/?text=' . rawurlencode($texto),
]);
