<?php
/* ══════════════════════════════════════════════════════════════════════
   RESTAURAR.PHP · VOLVER A METER UN RESPALDO EN LA BASE

   QUÉ HACE ESTE ARCHIVO
   Toma el JSON que viene adentro del ZIP de cron_respaldo.php y vuelve
   a escribir esas filas en la base.

   POR QUÉ HACE FALTA, SI YA HABÍA RESPALDOS
   Porque un respaldo que nunca se probó a restaurar no es un respaldo:
   es un archivo. Hasta hoy nadie había abierto uno de esos JSON para
   ver si se podía volver atrás con él, y las tres cosas que lo
   impedirían —el orden de las tablas, las columnas que cambiaron desde
   que se generó, y las claves foráneas— no se descubren leyendo, se
   descubren intentando.

   ⚠️ LO PRIMERO ES EL MODO PRUEBA, Y ES EL MODO POR OMISIÓN
   Sin --aplicar, esto NO ESCRIBE NADA. Solo lee el respaldo, lo compara
   contra lo que hay hoy y cuenta qué pasaría. Restaurar sobre una base
   viva es de las pocas cosas de este proyecto que no se pueden deshacer,
   así que el camino fácil tiene que ser el que no rompe nada.

   LAS DOS FORMAS DE RESTAURAR
     faltantes  (por omisión)  Solo agrega las filas cuyo id NO existe
                               hoy. No pisa nada. Sirve para recuperar
                               lo que se borró sin tocar lo que se
                               siguió cargando después.
     completo                  Vacía cada tabla del respaldo y la vuelve
                               a llenar. Deja la base exactamente como
                               estaba el día del respaldo, y se pierde
                               todo lo cargado desde entonces.

   CÓMO SE USA

     Desde la consola (lo recomendado — es donde se ve todo el informe):

       php restaurar.php respaldo-ania-xv-2026-09-04.json
       php restaurar.php respaldo-ania-xv-2026-09-04.json --aplicar
       php restaurar.php respaldo-ania-xv-2026-09-04.json --aplicar --completo

     Y para reponer SOLO los archivos que faltan en el disco, sin
     tocar ni una fila (ver el bloque 1B):

       php restaurar.php --archivos ./archivos-del-zip
       php restaurar.php --archivos ./archivos-del-zip --aplicar

     Desde el navegador, con la llave del .env (igual que instalar.php):

       POST a  restaurar.php?llave=…            → prueba
       POST a  restaurar.php?llave=…&aplicar=1  → escribe
       con el JSON como cuerpo de la petición.

   POR QUÉ NO HAY UN BOTÓN EN EL PANEL
   A propósito. "Restaurar" al lado de "Respaldar ahora" es un botón que
   se toca por error, y lo que hace no se puede deshacer. Esto se corre
   cuando ya pasó algo, con calma, y por quien sabe qué está haciendo.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$desdeLaConsola = (php_sapi_name() === 'cli');


/* ─── 1. QUIÉN PUEDE CORRER ESTO ──────────────────────────────────────── */
/* Solo la llave del .env, ni siquiera una sesión de administradora. Es
   la operación más destructiva del proyecto: tiene que exigir algo que
   solo está en el servidor, no algo que se lleva en el teléfono. */
if (!$desdeLaConsola) {
    if (!llaveDeArranqueCorrecta($_GET['llave'] ?? '')) {
        responderMal('Esta operación necesita la llave del servidor.', 403);
    }
}


/* ─── 1B. MODO "SOLO REPONER ARCHIVOS" ──────────────────────────

   PARA QUÉ SIRVE (2026-09-04)
   El informe de más abajo sabe decir qué filas apuntan a un archivo que
   ya no está en el disco, y termina diciendo "copiá esos archivos desde
   la carpeta archivos/ del ZIP". Eso es la mitad del trabajo: con
   cuarenta PDF, copiarlos a mano uno por uno es justo donde se cometen
   errores.

   Esto hace la otra mitad. Se le pasa la carpeta `archivos/` ya extraída
   del ZIP del respaldo, y repone SOLO los que faltan.

   POR QUE RECIBE UNA CARPETA Y NO EL ZIP
   El ZIP está cifrado con RESPALDO_CLAVE y ZipArchive no siempre puede
   abrir un cifrado fuerte. Para sacar el JSON ya hay que abrirlo a mano
   igual, así que la carpeta ya está extraída cuando se llega acá. Menos
   piezas que puedan fallar.

   QUÉ NO HACE
   No toca la base de datos. Ni una fila. Solo copia archivos que HOY no
   existen — nunca pisa uno que esté, así que correrlo dos veces no puede
   romper nada, y no puede "restaurar" un archivo viejo encima de uno
   nuevo.

     php restaurar.php --archivos ./archivos-del-zip
     php restaurar.php --archivos ./archivos-del-zip --aplicar
*/

$vieneDeUnaCarpeta = '';
if ($desdeLaConsola) {
    $donde = array_search('--archivos', $argv, true);
    if ($donde !== false) $vieneDeUnaCarpeta = (string) ($argv[$donde + 1] ?? '');
} else {
    $vieneDeUnaCarpeta = (string) ($_GET['archivos'] ?? '');
}

if ($vieneDeUnaCarpeta !== '') {
    $origen = rtrim($vieneDeUnaCarpeta, "/\\");

    if (!is_dir($origen)) {
        terminarRestauracion([
            'error' => 'No encuentro esa carpeta: ' . $origen . '. Tenés que ' .
                       'extraer el ZIP del respaldo y pasarme su carpeta archivos/.',
        ], 1);
    }

    $copiar = $desdeLaConsola
        ? in_array('--aplicar', $argv, true)
        : !empty($_GET['aplicar']);

    $destino = carpetaDeArchivos();

    $sePueden   = [];
    $noEstan    = [];
    $repuestos  = 0;
    $fallaron   = [];

    if (existeTabla('archivos')) {
        foreach (consultarTodo('SELECT nombre_disco, nombre_real FROM archivos') as $f) {
            $nombre = basename((string) $f['nombre_disco']);
            if ($nombre === '') continue;

            // Ya está: no hay nada que reponer.
            if (is_file($destino . '/' . $nombre)) continue;

            $enElRespaldo = $origen . '/' . $nombre;

            if (!is_file($enElRespaldo)) {
                // Falta en el disco Y tampoco viajó en este respaldo. Se
                // nombra para poder buscarlo en uno anterior o a mano.
                $noEstan[] = $f['nombre_real'] . ' → ' . $nombre;
                continue;
            }

            $sePueden[] = $f['nombre_real'] . ' → ' . $nombre;

            if (!$copiar) continue;

            if (!is_dir($destino)) @mkdir($destino, 0755, true);
            if (!is_dir($destino) || !is_writable($destino)) {
                $fallaron[] = $nombre . ' (no se puede escribir en ' . $destino . ')';
                continue;
            }

            if (!@copy($enElRespaldo, $destino . '/' . $nombre)) {
                $fallaron[] = $nombre . ' (no se pudo copiar)';
                continue;
            }

            // Mismo cuidado que la mudanza de instalar.php: si la copia
            // no pesa lo mismo, se descarta en vez de dejar un archivo
            // roto que parece bueno.
            if (filesize($destino . '/' . $nombre) !== filesize($enElRespaldo)) {
                @unlink($destino . '/' . $nombre);
                $fallaron[] = $nombre . ' (la copia quedó incompleta)';
                continue;
            }

            $repuestos++;
        }
    }

    terminarRestauracion([
        'modo'              => $copiar ? 'reponer archivos (APLICADO)' : 'reponer archivos (prueba)',
        'desde'             => $origen,
        'hacia'             => $destino,
        'se_pueden_reponer' => $sePueden,
        'repuestos'         => $repuestos,
        'no_estan_en_este_respaldo' => $noEstan,
        'con_problema'      => $fallaron,
        'siguiente_paso'    => $copiar
            ? ($noEstan
                ? 'Quedan ' . count($noEstan) . ' sin reponer: buscá esos nombres en un ' .
                  'respaldo anterior y vuelve a correr esto con esa carpeta.'
                : 'No falta ninguno.')
            : ($sePueden
                ? 'Volvé a correrlo con --aplicar para copiar ' . count($sePueden) . '.'
                : 'No hay nada que reponer desde esta carpeta.'),
    ], 0);
}


/* ─── 2. LEER EL RESPALDO ─────────────────────────────────────────────── */

$crudo = '';

if ($desdeLaConsola) {
    $ruta = $argv[1] ?? '';
    if ($ruta === '' || !is_file($ruta)) {
        fwrite(STDERR,
            "Falta el archivo de respaldo.\n\n" .
            "  php restaurar.php respaldo-ania-xv-AAAA-MM-DD.json [--aplicar] [--completo]\n\n" .
            "Sin --aplicar no se escribe nada: solo se informa qué pasaría.\n");
        exit(1);
    }
    $crudo = (string) file_get_contents($ruta);
} else {
    $crudo = (string) file_get_contents('php://input');
    if ($crudo === '' && !empty($_FILES['respaldo']['tmp_name'])) {
        $crudo = (string) file_get_contents($_FILES['respaldo']['tmp_name']);
    }
}

if (trim($crudo) === '') {
    terminarRestauracion(['error' => 'El respaldo llegó vacío.'], 1);
}

$respaldo = json_decode($crudo, true);

if (!is_array($respaldo) || !isset($respaldo['datos']) || !is_array($respaldo['datos'])) {
    terminarRestauracion([
        'error' => 'Esto no parece un respaldo de Ania XV. Se esperaba un ' .
                   'JSON con una clave "datos". Si el archivo salió del ZIP ' .
                   'cifrado, revisa que se haya extraído entero.',
    ], 1);
}


/* ─── 3. QUÉ SE PIDIÓ ─────────────────────────────────────────────────── */

$opciones = $desdeLaConsola ? array_slice($argv, 2) : [];

$aplicar = $desdeLaConsola
    ? in_array('--aplicar', $opciones, true)
    : !empty($_GET['aplicar']);

$modoCompleto = $desdeLaConsola
    ? in_array('--completo', $opciones, true)
    : !empty($_GET['completo']);


/* ─── 4. QUÉ TABLAS SE PUEDEN TOCAR ───────────────────────────────────── */
/*
 * Solo las que existen HOY en la base. Una tabla que estaba en el
 * respaldo y ya no existe se informa y se saltea: crearla acá, a ciegas
 * y sin su definición, dejaría una tabla sin índices ni claves que
 * parecería estar bien.
 *
 * Y solo las COLUMNAS que existen hoy. Un respaldo de hace dos meses
 * puede traer una columna que después se quitó, o no traer una que se
 * agregó. Se intersecan las dos listas y se informa la diferencia, en
 * vez de fallar entera por una columna de más.
 */
$columnasDeCadaTabla = [];

/**
 * Las columnas que esta tabla tiene HOY.
 *
 * @param string $tabla
 * @return string[]
 */
function columnasDe($tabla) {
    global $columnasDeCadaTabla;
    if (isset($columnasDeCadaTabla[$tabla])) return $columnasDeCadaTabla[$tabla];

    $columnas = [];
    foreach (consultarTodo("SHOW COLUMNS FROM `$tabla`") as $fila) {
        $valores = array_values($fila);
        if (isset($fila['Field'])) $columnas[] = (string) $fila['Field'];
        elseif (isset($valores[0])) $columnas[] = (string) $valores[0];
    }

    $columnasDeCadaTabla[$tabla] = $columnas;
    return $columnas;
}

$plan = [];
$tablasQueYaNoExisten = [];

foreach ($respaldo['datos'] as $tabla => $filas) {
    // El nombre viene del archivo, y el archivo se interpola en el SQL
    // más abajo. Que no entre nada que no sea un nombre de tabla.
    if (!preg_match('/^[A-Za-z0-9_]+$/', (string) $tabla)) continue;
    if (!is_array($filas)) continue;

    if (!existeTabla($tabla)) {
        $tablasQueYaNoExisten[] = $tabla;
        continue;
    }

    $columnasHoy = columnasDe($tabla);
    $columnasDelRespaldo = count($filas) ? array_keys((array) $filas[0]) : [];

    $plan[$tabla] = [
        'filas_en_el_respaldo' => count($filas),
        'filas_hoy'            => (int) (consultarUno("SELECT COUNT(*) AS n FROM `$tabla`")['n'] ?? 0),
        'columnas_usadas'      => array_values(array_intersect($columnasDelRespaldo, $columnasHoy)),
        'columnas_ignoradas'   => array_values(array_diff($columnasDelRespaldo, $columnasHoy)),
        'columnas_sin_dato'    => array_values(array_diff($columnasHoy, $columnasDelRespaldo)),
    ];
}


/* ─── 5. MODO PRUEBA: informar y salir sin tocar nada ─────────────────── */

if (!$aplicar) {
    terminarRestauracion([
        'modo'                    => 'PRUEBA — no se escribió nada',
        'respaldo_generado'       => $respaldo['generado'] ?? '(sin fecha)',
        'forma'                   => $modoCompleto ? 'completo (vaciar y rellenar)'
                                                   : 'faltantes (solo agregar lo que no está)',
        'tablas'                  => $plan,
        'tablas_que_ya_no_existen'=> $tablasQueYaNoExisten,
        'para_aplicar'            => $desdeLaConsola
            ? 'Volvé a correrlo agregando --aplicar'
            : 'Repetí la petición agregando &aplicar=1',
    ], 0);
}


/* ─── 6. ESCRIBIR ─────────────────────────────────────────────────────── */
/*
 * Todo dentro de UNA transacción: si algo falla a la mitad, no queda una
 * base mitad vieja y mitad nueva, que sería peor que no haber restaurado.
 *
 * FOREIGN_KEY_CHECKS apagado mientras dura: las tablas se recorren en el
 * orden en que aparecen en el JSON, y ese orden no respeta las
 * dependencias (los acompañantes pueden entrar antes que sus
 * confirmaciones). Se vuelve a prender al terminar, pase lo que pase.
 *
 * Acá se usa PDO directo y no ejecutar(): ejecutar() atrapa el error y
 * corta el script, y eso dejaría la transacción abierta sin decir por
 * qué falló. Este es uno de los pocos lugares donde hace falta ver la
 * excepción de verdad.
 */
$pdo = bd();
$hecho = [];
$problemas = [];

$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
$pdo->beginTransaction();

try {
    foreach ($plan as $tabla => $detalle) {
        /* El vaciado va PRIMERO y no depende de que haya filas que
           meter: si el respaldo tiene esta tabla vacía, "dejar la base
           como estaba ese día" significa vaciarla también. */
        if ($modoCompleto) {
            $pdo->exec("DELETE FROM `$tabla`");
        }

        if ($detalle['filas_en_el_respaldo'] === 0) {
            $hecho[$tabla] = ['filas_escritas' => 0, 'filas_salteadas' => 0];
            continue;
        }

        $columnas = $detalle['columnas_usadas'];
        if (!count($columnas)) {
            $problemas[] = "$tabla: ninguna columna del respaldo existe hoy, " .
                           'no se metió ninguna fila.';
            continue;
        }

        $listaColumnas = '`' . implode('`, `', $columnas) . '`';
        $signos = implode(', ', array_fill(0, count($columnas), '?'));

        /* INSERT IGNORE en modo "faltantes": una fila cuyo id ya existe
           se saltea sola, sin tener que preguntar antes por cada una.
           En modo completo la tabla quedó vacía, así que da lo mismo. */
        $verbo = $modoCompleto ? 'INSERT' : 'INSERT IGNORE';
        $stmt = $pdo->prepare("$verbo INTO `$tabla` ($listaColumnas) VALUES ($signos)");

        $puestas = 0;
        foreach ($respaldo['datos'][$tabla] as $fila) {
            $valores = [];
            foreach ($columnas as $columna) {
                $valores[] = array_key_exists($columna, $fila) ? $fila[$columna] : null;
            }
            $stmt->execute($valores);
            $puestas += $stmt->rowCount();
        }

        $hecho[$tabla] = [
            'filas_escritas' => $puestas,
            'filas_salteadas'=> $detalle['filas_en_el_respaldo'] - $puestas,
        ];
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    terminarRestauracion([
        'error'   => 'No se restauró nada: falló a la mitad y se deshizo todo.',
        'detalle' => $e->getMessage(),
        'hasta_donde_llego' => $hecho,
    ], 1);
}

$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');


/* ─── 7. LOS ARCHIVOS DE VERDAD ───────────────────────────────────────── */
/*
 * Este archivo restaura FILAS. Las fotos y PDF están en la carpeta
 * `archivos/` del ZIP y se copian a mano a admin/archivos/ — no se hace
 * acá porque el JSON llega solo, sin el ZIP alrededor.
 *
 * Lo que sí se hace es DECIR CUÁLES FALTAN. Restaurar las filas sin los
 * archivos deja exactamente el estado del incidente de agosto de 2026:
 * la app muestra un contrato que al tocarlo no está. Que la restauración
 * termine diciendo "faltan estos 12 archivos, copiálos de la carpeta
 * archivos/ del ZIP" es la mitad del trabajo que antes no existía.
 */
$archivosQueFaltan = [];
$carpeta = carpetaDeArchivos();

if (existeTabla('archivos')) {
    foreach (consultarTodo('SELECT nombre_disco, nombre_real FROM archivos') as $f) {
        if (!is_file($carpeta . '/' . basename($f['nombre_disco']))) {
            $archivosQueFaltan[] = $f['nombre_real'] . ' → ' . $f['nombre_disco'];
        }
    }
}

terminarRestauracion([
    'modo'              => 'APLICADO',
    'forma'             => $modoCompleto ? 'completo' : 'faltantes',
    'respaldo_generado' => $respaldo['generado'] ?? '(sin fecha)',
    'tablas'            => $hecho,
    'problemas'         => $problemas,
    'tablas_que_ya_no_existen' => $tablasQueYaNoExisten,
    'archivos_que_faltan_en_el_disco' => $archivosQueFaltan,
    'siguiente_paso'    => count($archivosQueFaltan)
        ? 'Copiá esos archivos desde la carpeta archivos/ del ZIP a ' .
          'admin/archivos/ en el servidor. Sin eso, las fichas los ' .
          'muestran pero al abrirlos no están.'
        : 'Nada más: las filas y los archivos coinciden.',
], 0);


/**
 * Termina, informando según desde dónde se corrió.
 *
 * @param array $informe
 * @param int   $codigoDeSalida 0 si salió bien.
 * @return void
 */
function terminarRestauracion($informe, $codigoDeSalida) {
    global $desdeLaConsola;

    error_log('[Ania XV · restaurar] ' . json_encode($informe, JSON_UNESCAPED_UNICODE));

    if ($desdeLaConsola) {
        echo json_encode($informe, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        exit($codigoDeSalida);
    }

    if ($codigoDeSalida !== 0) {
        responderMal($informe['error'] ?? 'No se pudo restaurar.', 400, json_encode($informe));
    }
    responderBien($informe);
}
