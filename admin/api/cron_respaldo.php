<?php
/* ══════════════════════════════════════════════════════════════════════
   CRON_RESPALDO.PHP · MANDAR UNA COPIA DE TODO POR CORREO

   QUÉ HACE ESTE ARCHIVO
   Una vez por semana arma un archivo con toda la información del evento
   y lo manda por correo a las administradoras.

   POR QUÉ HACE FALTA
   Hoy todo vive en una sola base de datos de un hosting compartido. Si
   esa base se pierde —un error al borrar algo, un problema del
   proveedor, una cuenta suspendida por falta de pago— se pierden los
   110 invitados, el presupuesto entero y el acomodo de las mesas, sin
   forma de recuperarlos.

   Un correo semanal con todo adentro cuesta nada y significa que lo peor
   que puede pasar es perder una semana de trabajo, no todo.

   POR QUÉ POR CORREO Y NO A UN SERVICIO EN LA NUBE
   Porque el correo ya funciona, no hay que crear cuentas en ningún lado,
   y las copias quedan en dos buzones distintos con su fecha. Para un
   evento familiar es la solución que menos puede fallar.

   CÓMO SE PROGRAMA EN HOSTINGER
     hPanel → Avanzado → Trabajos cron → Crear
     Comando:  php /home/USUARIO/domains/aniaxv.com/public_html/admin/api/cron_respaldo.php
     Cuándo:   una vez por semana, domingo a las 3 de la mañana

   ⚠️ REVISÁ QUE EL CRON APUNTE ACÁ Y NO A OTRO ARCHIVO.
   El incidente de agosto 2026 (contratos y fotos perdidos sin ninguna
   copia) pasó, entre otras cosas, porque el cron de "domingo 3 AM" que
   se creó en hPanel apuntaba por error a cron_alarmas.php — el respaldo
   nunca corrió, ni una sola vez, y nadie se enteró hasta que fue tarde.
   Desde Ajustes → Estado del respaldo (dentro del panel) se puede ver
   cuándo fue la última vez sin tener que entrar a hPanel.

   QUÉ SE LE PUEDE PEDIR
     (sin parámetros)      corre el respaldo — desde CLI (el cron), con
                            ?llave=… (a mano, como instalar.php), o con
                            sesión de administradora (el botón del panel)
     GET ?accion=estado    cuándo fue la última vez, sin correr nada —
                            exige sesión de administradora
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';

$desdeLaConsola = (php_sapi_name() === 'cli');

/* ─── ver el estado, sin correr el respaldo ──────────────────────────── */
/* Lee cuándo fue la última vez, para poder mostrarlo en Ajustes → Estado
   del respaldo — así un cron mal configurado (como el que causó la
   pérdida de archivos de agosto 2026: apuntaba a cron_alarmas.php en vez
   de a este archivo) se nota a la semana, no meses después. Exige sesión
   de administradora: no hace falta la llave del .env solo para MIRAR. */
if (!$desdeLaConsola && ($_GET['accion'] ?? '') === 'estado') {
    exigirAdministrador();
    $fila = existeTabla('ajustes')
        ? consultarUno("SELECT valor FROM ajustes WHERE clave = 'ultimo_respaldo'")
        : null;
    responderBien($fila ? json_decode($fila['valor'], true) : null);
}

/* ─── correr el respaldo ──────────────────────────────────────────────── */
/* Tres formas de autorizarlo, para los tres lugares desde donde se llama:
     · CLI          → el cron de Hostinger, sin sesión ni llave posibles.
     · llave         → abrir la URL a mano, como diagnostico.php e instalar.php.
     · sesión admin  → el botón "Respaldar ahora" de Ajustes. A propósito
       NO se usa la llave para ese botón: significaría escribirla en el
       JavaScript del panel, visible para cualquiera que abra las
       herramientas del navegador — exactamente lo que la nota de
       entorno.php sobre "la llave viaja en la URL" advierte que hay que
       evitar. Una sesión de administradora ya es prueba suficiente de
       quién es. */
if (!$desdeLaConsola) {
    $llaveVale = llaveDeArranqueCorrecta($_GET['llave'] ?? '');

    // Sin llave válida, que valga una sesión de administradora — y si
    // tampoco hay eso, no hay forma de autorizar la petición.
    if (!$llaveVale) {
        exigirAdministrador();
    }
}


/* ─── QUÉ SE RESPALDA ─────────────────────────────────────────────────── */

/* Todo lo que sea información del evento. Quedan afuera a propósito:
     · sesiones e intentos_login → basura temporal
     · usuarios → tiene las contraseñas hasheadas; mandarlas por correo
       sería regalar el panel a cualquiera que lea ese buzón

   `archivos` SÍ entra en la lista de tablas: son los renglones (nombre,
   tamaño, a qué está atado) de cada contrato/comprobante subido. Los
   ARCHIVOS EN SÍ (las fotos y PDF de verdad) se respaldan aparte, más
   abajo — ver "TAMBIÉN LOS ARCHIVOS DE VERDAD".

   ⚠️ HASTA ACÁ, ESE RESPALDO NO EXISTÍA. Un incidente real (agosto 2026)
   dejó filas en `archivos` apuntando a contratos y comprobantes que ya
   no estaban en el disco del servidor — probablemente porque en algún
   momento se reemplazó la carpeta admin/ entera en el hosting en vez de
   subir archivo por archivo, y admin/archivos/ nunca viajó por git (son
   fotos subidas desde el teléfono, no código). Esos archivos puntuales
   se perdieron para siempre porque no había ninguna copia en ningún
   lado. Este respaldo nuevo existe para que la próxima vez que algo así
   pase, haya de dónde recuperarlos. */
/* ⚡ ESTO ERA UNA LISTA BLANCA Y AHORA ES UNA LISTA NEGRA (2026-09-04)
 *
 * Antes acá había una lista de 35 tablas para respaldar, con este aviso:
 * "si se agrega una tabla nueva al esquema, tiene que sumarse acá
 * también — nada la agrega sola".
 *
 * El aviso no alcanzó. El esquema llegó a 55 tablas y quedaron OCHO
 * afuera sin que nadie lo decidiera:
 *
 *     invitaciones  ← los tokens de los 51 links que ya están en los
 *                     WhatsApp de los invitados. Perderla es que los 51
 *                     enlaces dejen de funcionar a la vez, con la
 *                     invitación ya repartida.
 *     recibos, contratos          ← los papeles del dinero
 *     etiquetas, etiquetas_asignadas  ← el acomodo del salón
 *     chat_hilos, chat_mensajes, chat_propuestas
 *
 * Una lista blanca falla en silencio y del lado peligroso: lo que nadie
 * se acordó de agregar, no se respalda, y no hay nada que lo avise. Una
 * lista negra falla del lado seguro: una tabla nueva queda protegida
 * sola, y lo peor que puede pasar es respaldar algo de más.
 *
 * Es el mismo error de método que la auditoría encontró en todo el
 * proyecto: un paso que depende de que alguien se acuerde.
 *
 * Se enumera lo que HAY EN LA BASE, no lo que dice migracion.sql: así
 * también entra una tabla creada a mano o quedada de una versión vieja.
 */
$noSeRespaldan = [
    // Seguridad: mandar esto por correo sería regalar el panel a
    // cualquiera que lea ese buzón.
    'usuarios', 'sesiones', 'intentos_login', 'recuperaciones_clave',

    // Cuelgan de una cuenta de `usuarios`, que no viaja. Restaurarlas
    // solas, sin la cuenta, no serviría de nada.
    'comandos_usuario', 'permisos_usuario',

    // Técnicas o de sesión, no contenido del evento.
    'ajustes', 'bitacora', 'suscripciones_push', 'eventos_uso',

    // Historial de deshacer del acomodo: lo real ya vive en
    // `asignacion_mesas`, que sí se respalda.
    'acomodo_respaldo',

    // Bitácora de deduplicación, se autolimpia sola.
    'escrituras_hechas',
];

/* ⚠️ AGREGAR ALGO ACÁ ES SACARLO DEL RESPALDO. Antes de sumar una
   tabla, la pregunta es: si mañana se pierde la base entera, ¿esto se
   puede volver a armar solo? Si la respuesta no es un sí rotundo, no
   va en esta lista. */

$tablas = [];
foreach (consultarTodo('SHOW TABLES') as $fila) {
    // SHOW TABLES devuelve una sola columna, con nombre variable
    // ("Tables_in_loquesea"), así que se toma el primer valor sin
    // nombrarla. array_values() y no reset(): reset() toma su argumento
    // por referencia, y acá no hay nada que rebobinar.
    $valores = array_values($fila);
    $nombreTabla = (string) ($valores[0] ?? '');
    if ($nombreTabla === '' || in_array($nombreTabla, $noSeRespaldan, true)) continue;
    $tablas[] = $nombreTabla;
}
sort($tablas);

$respaldo = [
    'generado'   => date('Y-m-d H:i:s'),
    'sitio'      => 'aniaxv.com',
    'base'       => env('DB_NAME', ''),
];

$cuantasFilas = 0;
$resumen = [];

foreach ($tablas as $tabla) {
    if (!existeTabla($tabla)) continue;

    $filas = consultarTodo("SELECT * FROM `$tabla`");
    $respaldo['datos'][$tabla] = $filas;

    $cuantasFilas += count($filas);
    if (count($filas)) $resumen[$tabla] = count($filas);
}

if ($cuantasFilas === 0) {
    terminarRespaldo(['aviso' => 'No hay nada que respaldar todavía.']);
}


/* ─── ARMAR EL ARCHIVO ────────────────────────────────────────────────── */

$json = json_encode($respaldo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

/* Se manda como JSON y no como .sql porque el JSON se puede abrir y
   leer con cualquier cosa, incluso desde el teléfono, mientras que un
   volcado SQL solo sirve si alguien sabe restaurarlo. Y si algún día
   hay que restaurar, un JSON se convierte a lo que sea. */
$nombre = 'respaldo-ania-xv-' . date('Y-m-d') . '.json';


/* ─── BAJARSE TODO, SIN TOPE DE PESO ──────────────────────────────────── */
/*
 * ⚡ POR QUÉ EXISTE ESTE CAMINO (2026-09-04)
 *
 * El respaldo por correo tiene que caber en un correo: 12 MB de
 * archivos por semana, y el resto rota. Eso alcanza para no perder
 * TODO, pero no para tener TODO junto en un momento dado.
 *
 * Y hay un momento en que hace falta tenerlo todo junto: justo antes de
 * promover a producción, o antes de tocar el hosting. El incidente de
 * agosto 2026 —contratos y fotos perdidos— pasó exactamente así, al
 * reemplazar la carpeta admin/ entera en el servidor.
 *
 * Esto arma el mismo ZIP cifrado, con la base entera y TODOS los
 * archivos, y lo baja al teléfono o a la computadora. Sin tope, sin
 * rotación, sin correo de por medio.
 *
 * Va acá, después de armar el JSON y antes de la parte del correo,
 * porque comparte todo lo de arriba y nada de lo de abajo.
 */
if (!$desdeLaConsola && ($_GET['accion'] ?? '') === 'descargar') {
    $claveZip = (string) env('RESPALDO_CLAVE', '');

    if ($claveZip === '') {
        responderMal('Falta RESPALDO_CLAVE en el .env del servidor: sin ' .
                     'eso el respaldo viajaría sin proteger, y no se manda así.', 500);
    }
    if (!class_exists('ZipArchive')) {
        responderMal('Este servidor no puede crear archivos ZIP con contraseña.', 500);
    }

    $rutaTemporal = sys_get_temp_dir() . '/ania-todo-' . bin2hex(random_bytes(8)) . '.zip';
    $zipTodo = new ZipArchive();

    if ($zipTodo->open($rutaTemporal, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        responderMal('No se pudo armar el archivo.', 500);
    }

    $zipTodo->setPassword($claveZip);
    $zipTodo->addFromString($nombre, $json);
    $dentro = [$nombre];

    $carpetaDeArchivos = dirname(__DIR__) . '/archivos';
    $cuantosArchivos = 0;
    $faltantes = [];

    if (existeTabla('archivos')) {
        foreach (consultarTodo('SELECT nombre_disco, nombre_real FROM archivos') as $f) {
            $rutaArchivo = $carpetaDeArchivos . '/' . basename($f['nombre_disco']);
            if (!is_file($rutaArchivo)) {
                // La fila existe pero el archivo no está en el disco: es
                // el síntoma exacto del incidente de agosto. Se informa
                // adentro del ZIP para que quede constancia con la copia.
                $faltantes[] = $f['nombre_real'] . ' (' . $f['nombre_disco'] . ')';
                continue;
            }
            if ($zipTodo->addFile($rutaArchivo, 'archivos/' . $f['nombre_disco'])) {
                $dentro[] = 'archivos/' . $f['nombre_disco'];
                $cuantosArchivos++;
            }
        }
    }

    if (count($faltantes)) {
        $aviso = "Estas filas de la tabla `archivos` apuntan a un archivo que " .
                 "YA NO ESTÁ en el disco del servidor.\nNo se pudieron incluir " .
                 "porque no existen:\n\n  - " . implode("\n  - ", $faltantes) . "\n";
        $zipTodo->addFromString('ARCHIVOS-QUE-FALTAN.txt', $aviso);
        $dentro[] = 'ARCHIVOS-QUE-FALTAN.txt';
    }

    /* Mismo criterio que el respaldo por correo: si no se puede cifrar,
       NO se entrega. Un ZIP en claro con teléfonos, alergias y códigos
       de acceso es peor que no tener respaldo, porque parece seguro. */
    $seCifro = false;
    if (method_exists($zipTodo, 'setEncryptionName')) {
        $seCifro = true;
        foreach ($dentro as $n) {
            if (!$zipTodo->setEncryptionName($n, ZipArchive::EM_AES_256)) $seCifro = false;
        }
    }
    $zipTodo->close();

    if (!$seCifro || !is_file($rutaTemporal)) {
        if (is_file($rutaTemporal)) @unlink($rutaTemporal);
        responderMal('No se pudo cifrar el archivo. No se entrega sin protección.', 500);
    }

    $nombreDescarga = 'ania-xv-completo-' . date('Y-m-d') . '.zip';

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $nombreDescarga . '"');
    header('Content-Length: ' . filesize($rutaTemporal));
    header('X-Ania-Tablas: ' . count($tablas));
    header('X-Ania-Filas: ' . $cuantasFilas);
    header('X-Ania-Archivos: ' . $cuantosArchivos);
    header('X-Ania-Faltantes: ' . count($faltantes));

    // readfile() y no file_get_contents(): con muchas fotos el ZIP puede
    // pesar cientos de MB, y cargarlo entero en memoria reventaría el
    // límite de PHP del hosting compartido.
    @set_time_limit(300);
    readfile($rutaTemporal);
    @unlink($rutaTemporal);
    exit;
}


/* ─── EL CORREO ───────────────────────────────────────────────────────── */

$listaResumen = '';
foreach ($resumen as $tabla => $cuantas) {
    $listaResumen .= "<tr><td style='padding:4px 8px;border-bottom:1px solid #eee'>" .
                     htmlspecialchars($tabla, ENT_QUOTES, 'UTF-8') .
                     "</td><td style='padding:4px 8px;border-bottom:1px solid #eee;" .
                     "text-align:right'>$cuantas</td></tr>";
}

$peso = round(strlen($json) / 1024);

$html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0'
       style='max-width:520px;margin:0 auto;padding:32px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:28px;'>
    <h2 style='margin:0 0 4px;color:#8B4513;'>Respaldo semanal</h2>
    <p style='margin:0 0 16px;color:#888;font-size:13px;'>" . date('d/m/Y') . "</p>

    <p style='line-height:1.6;'>Adjunto va una copia completa de la
    información del evento: <strong>$cuantasFilas registros</strong>
    ($peso KB).</p>

    <p style='line-height:1.6;font-size:13px;color:#666;'>
    <strong>Guarda este correo.</strong> Si algún día se pierde la base de
    datos, esto es lo que permite recuperar todo. No hace falta que hagas
    nada con el archivo: solo que no borres el correo.</p>

    <table width='100%' style='border-collapse:collapse;font-size:13px;margin-top:16px;'>
      $listaResumen
    </table>
  </td></tr>
</table></body></html>";


/* ─── PROTEGER EL ADJUNTO ─────────────────────────────────────────────── */

/*
   QUÉ LLEVA ESTE ARCHIVO Y POR QUÉ NO PUEDE VIAJAR EN CLARO

   Todo: nombres, correos y teléfonos de los invitados, sus alergias,
   los códigos con los que se entra a la fiesta, y cuánto se pagó por
   cada cosa. El correo no va cifrado de punta a punta, y una vez
   mandado el archivo queda en dos buzones para siempre.

   Se manda dentro de un ZIP con contraseña (AES-256). La clave está en
   el .env como RESPALDO_CLAVE y NUNCA se escribe en el cuerpo del
   correo: mandar el candado junto a la llave no protege nada.

   Si el hosting no puede cifrar, NO se adjunta nada. Volver en silencio
   al archivo en claro sería lo peor de los dos mundos: se creería que
   está protegido cuando no lo está.
*/

$clave = (string) env('RESPALDO_CLAVE', '');
$adjuntos = [];
$avisoDelAdjunto = '';

/* ─── TAMBIÉN LOS ARCHIVOS DE VERDAD ───────────────────────────────────
 *
 * Las fotos y PDF que se ven en admin/archivos/. Van DENTRO del mismo
 * ZIP cifrado, en una carpeta "archivos/" — mismo candado, misma clave,
 * ninguna protección nueva que mantener.
 *
 * TOPE DE PESO: los adjuntos de correo viajan codificados en base64, que
 * pesa ~37% más que el archivo original — y muchos proveedores (Gmail
 * incluido) rechazan el correo completo si el mensaje pasa de 25 MB.
 * Con un tope de entrada de 12 MB, el ZIP codificado se queda bien
 * debajo de eso incluso sumando el JSON de la base de datos.
 *
 * ⚡ EL ORDEN ERA "LOS MÁS NUEVOS PRIMERO" Y ASÍ LOS VIEJOS NO VIAJABAN
 * NUNCA (2026-09-04)
 *
 * Cada corrida arrancaba de cero y ordenaba por `creado_en DESC`. O sea
 * que si los archivos de los últimos meses ya llenan los 12 MB —y a
 * medida que se acerca la fiesta, los llenan— los primeros contratos
 * pierden SIEMPRE, semana tras semana, para siempre. Justo los que ya
 * se perdieron una vez, en agosto.
 *
 * Ahora el orden es por ANTIGÜEDAD DE RESPALDO: primero lo que nunca
 * viajó, después lo que hace más tiempo que no viaja. Cada corrida
 * anota qué mandó, así que en unas pocas semanas todo el archivo pasó
 * por un correo al menos una vez, y después va rotando solo.
 *
 * La anotación vive en `ajustes` (clave `respaldo_archivos`) y no en una
 * columna nueva de `archivos`: agregar columnas en este proyecto es
 * frágil —`instalar.php` se traga los fallos del ALTER— y perder la
 * anotación no rompe nada, solo hace que todo se considere "nunca
 * respaldado" y se empiece de nuevo. Falla del lado seguro.
 *
 * Los que no entran quedan listados en el correo: así se ve qué falta
 * esta semana, en vez de que el cron fallara entero. */
const PESO_MAXIMO_DE_ARCHIVOS_EN_RESPALDO = 12 * 1024 * 1024;

$CARPETA_ARCHIVOS = dirname(__DIR__) . '/archivos';
$archivosParaRespaldar = [];
$archivosQueNoEntraron = [];
$archivosDemasiadoGrandes = [];
$cuandoSeRespaldoCadaArchivo = [];
// Se inicializa acá y no solo adentro del if: más abajo se recorre para
// podar el mapa, y sin tabla `archivos` quedaría sin definir.
$filasArchivos = [];

if (existeTabla('ajustes')) {
    $filaMapa = consultarUno(
        "SELECT valor FROM ajustes WHERE clave = 'respaldo_archivos'");
    if ($filaMapa) {
        $leido = json_decode((string) $filaMapa['valor'], true);
        if (is_array($leido)) $cuandoSeRespaldoCadaArchivo = $leido;
    }
}

if (existeTabla('archivos')) {
    $filasArchivos = consultarTodo(
        'SELECT nombre_disco, nombre_real, tamano_bytes
         FROM archivos ORDER BY creado_en DESC'
    );

    /* Se ordena por cuándo fue la última vez que este archivo viajó.
       Los que nunca viajaron llevan '', que ordena antes que cualquier
       fecha, así que van primero.

       El desempate por posición original es explícito y no confiado al
       orden estable de usort(): usort() solo garantiza estabilidad
       desde PHP 8.0, y este código tiene que correr igual en el 7.4 que
       todavía ofrecen algunos planes de hosting. Con el desempate, dos
       archivos nunca respaldados conservan el orden de `creado_en DESC`
       —los más nuevos antes— en cualquier versión. */
    $posicionOriginal = [];
    foreach ($filasArchivos as $i => $fila) {
        $posicionOriginal[$fila['nombre_disco']] = $i;
    }

    usort($filasArchivos, function ($a, $b)
          use ($cuandoSeRespaldoCadaArchivo, $posicionOriginal) {
        $cuandoA = (string) ($cuandoSeRespaldoCadaArchivo[$a['nombre_disco']] ?? '');
        $cuandoB = (string) ($cuandoSeRespaldoCadaArchivo[$b['nombre_disco']] ?? '');
        $porFecha = strcmp($cuandoA, $cuandoB);
        if ($porFecha !== 0) return $porFecha;

        return ($posicionOriginal[$a['nombre_disco']] ?? 0)
             <=> ($posicionOriginal[$b['nombre_disco']] ?? 0);
    });

    $pesoAcumulado = 0;
    foreach ($filasArchivos as $fila) {
        $ruta = $CARPETA_ARCHIVOS . '/' . basename($fila['nombre_disco']);

        // No está en el disco: ni se cuenta ni se intenta — este es
        // justo el caso que este respaldo nuevo existe para evitar que
        // se repita sin que nadie se entere.
        if (!is_file($ruta)) continue;

        /* Se llama `$pesoDelArchivo` y no `$peso` a propósito: `$peso`
           ya existe desde la línea 217 y son los KB del JSON de la base,
           que se informan al final. Este bucle lo estaba pisando, así
           que el informe reportaba como "peso_kb" los bytes del último
           archivo mirado. */
        $pesoDelArchivo = (int) $fila['tamano_bytes'] ?: filesize($ruta);

        /* Un archivo que solo NO ENTRA EN EL TOPE ENTERO no va a entrar
           nunca, por más que rote: hay que decirlo con todas las letras
           y no dejarlo mezclado con los que sí van a entrar la semana
           que viene. Se baja con el ZIP completo desde Ajustes. */
        if ($pesoDelArchivo > PESO_MAXIMO_DE_ARCHIVOS_EN_RESPALDO) {
            $archivosDemasiadoGrandes[] = $fila['nombre_real'];
            continue;
        }

        if ($pesoAcumulado + $pesoDelArchivo > PESO_MAXIMO_DE_ARCHIVOS_EN_RESPALDO) {
            $archivosQueNoEntraron[] = $fila['nombre_real'];
            continue;
        }

        $pesoAcumulado += $pesoDelArchivo;
        $archivosParaRespaldar[] = [
            'ruta'   => $ruta,
            'nombre' => $fila['nombre_disco'],
            'disco'  => $fila['nombre_disco'],
        ];
    }
}

if ($clave === '') {
    $avisoDelAdjunto = 'No se adjuntó el respaldo porque falta RESPALDO_CLAVE ' .
                       'en el .env del servidor.';

} elseif (!class_exists('ZipArchive')) {
    $avisoDelAdjunto = 'No se adjuntó el respaldo porque este servidor no ' .
                       'puede crear archivos ZIP con contraseña.';

} else {
    $zipRuta = sys_get_temp_dir() . '/ania-respaldo-' . bin2hex(random_bytes(8)) . '.zip';
    $zip = new ZipArchive();

    $abierto = $zip->open($zipRuta, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $cifrado = false;

    if ($abierto === true) {
        $zip->setPassword($clave);
        $zip->addFromString($nombre, $json);

        $nombresEnElZip = [$nombre];
        foreach ($archivosParaRespaldar as $a) {
            if ($zip->addFile($a['ruta'], 'archivos/' . $a['nombre'])) {
                $nombresEnElZip[] = 'archivos/' . $a['nombre'];
            }
        }

        /* setEncryptionName necesita libzip 1.2 o más nuevo. Si no está,
           el ZIP se crearía SIN cifrar aunque se le haya puesto
           contraseña, que es exactamente la trampa que hay que evitar.
           Se pide para CADA archivo del ZIP: si uno solo quedara sin
           cifrar, ese uno solo alcanzaría para filtrar datos privados. */
        if (method_exists($zip, 'setEncryptionName')) {
            $cifrado = true;
            foreach ($nombresEnElZip as $n) {
                if (!$zip->setEncryptionName($n, ZipArchive::EM_AES_256)) {
                    $cifrado = false;
                }
            }
        }
        $zip->close();
    }

    if ($cifrado && is_file($zipRuta)) {
        $adjuntos = [[
            'nombre' => str_replace('.json', '.zip', $nombre),
            'tipo'   => 'application/zip',
            'datos'  => file_get_contents($zipRuta),
        ]];
    } else {
        $avisoDelAdjunto = 'No se adjuntó el respaldo porque este servidor no ' .
                           'pudo cifrarlo. El archivo NO se manda sin protección.';
    }

    if (is_file($zipRuta)) @unlink($zipRuta);
}

/* Ambos avisos (este y el de más abajo) se agregan reemplazando
   "</body></html>" y no "</table></body></html>": así cada uno se puede
   sumar sin pisar al otro, sin importar el orden en que se agreguen. */
if (count($archivosParaRespaldar)) {
    $pesoArchivos = round(array_sum(array_map(
        function ($a) { return filesize($a['ruta']); }, $archivosParaRespaldar
    )) / 1024 / 1024, 1);
    $html = str_replace('</body></html>',
        "<p style='padding:0 24px;font-size:13px;color:#666'>" .
        'También van adentro ' . count($archivosParaRespaldar) .
        ' archivo' . (count($archivosParaRespaldar) === 1 ? '' : 's') .
        ' (contratos, comprobantes y fotos), ' . $pesoArchivos . ' MB.' .
        "</p></body></html>", $html);
}
if (count($archivosQueNoEntraron)) {
    $html = str_replace('</body></html>',
        "<p style='padding:0 24px;font-size:13px;color:#b00'>⚠️ " .
        count($archivosQueNoEntraron) . ' archivo' .
        (count($archivosQueNoEntraron) === 1 ? '' : 's') .
        ' no entró' . (count($archivosQueNoEntraron) === 1 ? '' : 'aron') .
        ' en este respaldo por peso (se reintenta la próxima semana): ' .
        htmlspecialchars(implode(', ', $archivosQueNoEntraron), ENT_QUOTES, 'UTF-8') .
        "</p></body></html>", $html);
    error_log('[Ania XV · respaldo] Archivos que no entraron por peso: ' .
              implode(', ', $archivosQueNoEntraron));
}
if (count($archivosDemasiadoGrandes)) {
    /* Distinto del aviso de arriba: éstos NO se reintentan solos. Cada
       uno pesa más que el tope entero del correo, así que ninguna
       rotación los va a hacer entrar. La única forma de tenerlos a
       salvo es el ZIP completo de Ajustes → Descargar todo. */
    $html = str_replace('</body></html>',
        "<p style='padding:0 24px;font-size:13px;color:#b00'>⚠️ " .
        count($archivosDemasiadoGrandes) . ' archivo' .
        (count($archivosDemasiadoGrandes) === 1 ? ' pesa' : 's pesan') .
        ' más que el tope del correo y <strong>no va' .
        (count($archivosDemasiadoGrandes) === 1 ? '' : 'n') .
        ' a entrar nunca</strong> por acá. Bajalos desde Ajustes → ' .
        'Descargar todo: ' .
        htmlspecialchars(implode(', ', $archivosDemasiadoGrandes), ENT_QUOTES, 'UTF-8') .
        "</p></body></html>", $html);
    error_log('[Ania XV · respaldo] Archivos que NUNCA entran por tamaño: ' .
              implode(', ', $archivosDemasiadoGrandes));
}

if ($avisoDelAdjunto !== '') {
    $html = str_replace('</body></html>',
        "<p style='color:#b00;font-size:13px;padding:0 24px'>⚠️ " .
        htmlspecialchars($avisoDelAdjunto, ENT_QUOTES, 'UTF-8') .
        "</p></body></html>", $html);
    error_log('[Ania XV · respaldo] ' . $avisoDelAdjunto);
}


/* ─── MANDARLO ────────────────────────────────────────────────────────── */

$destinatarios = array_filter(array_map('trim',
    explode(',', env('CORREO_ADMINISTRADORA', 'info@aniaxv.com'))));

$enviados = 0;
$errores = [];

foreach ($destinatarios as $destino) {
    $resultado = smtpEnviar(
        $destino,
        'Respaldo · Ania XV · ' . date('d/m/Y'),
        $html,
        env('CORREO_REMITENTE', 'info@aniaxv.com'),
        'Ania XV',
        env('SMTP_HOST', 'smtp.hostinger.com'),
        (int) env('SMTP_PORT', 465),
        env('SMTP_USER', ''),
        env('SMTP_PASSWORD', ''),
        '',
        [],
        // El respaldo, cifrado. Vacío si no se pudo proteger.
        $adjuntos
    );

    if ($resultado === true) $enviados++;
    else $errores[] = "$destino: $resultado";
}

/* Queda registrado ACÁ, no solo en el log del servidor (que nadie del
   lado de Lucila puede leer): así "Ajustes → Estado del respaldo" puede
   mostrar la fecha real sin tener que abrir hPanel. Se guarda incluso si
   el envío por correo falló entero — un respaldo que se armó pero no
   pudo mandarse igual es información útil ("está corriendo, algo pasa
   con el correo"), muy distinta de "no corre desde hace dos meses". */
if (existeTabla('ajustes')) {
    $estado = json_encode([
        'cuando'            => date('Y-m-d H:i:s'),
        'registros'         => $cuantasFilas,
        'archivos_incluidos'=> count($archivosParaRespaldar),
        'archivos_afuera'   => count($archivosQueNoEntraron),
        'archivos_enormes'  => count($archivosDemasiadoGrandes),
        'enviados'          => $enviados,
        'errores'           => count($errores),
    ], JSON_UNESCAPED_UNICODE);

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('ultimo_respaldo', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [':v' => $estado, ':v2' => $estado]
    );

    /* ⚡ QUÉ ARCHIVO VIAJÓ Y CUÁNDO — es lo que hace posible la rotación
     * por antigüedad (ver la nota grande arriba del tope de peso). Sin
     * esto, cada corrida arrancaría de cero y los archivos viejos no
     * viajarían nunca.
     *
     * Solo se anota si el correo SALIÓ. Un archivo que se metió en un
     * ZIP que nadie recibió no está respaldado en ningún lado, y
     * anotarlo lo mandaría al final de la fila creyendo que ya está a
     * salvo: exactamente el error que esto viene a arreglar.
     *
     * Se guardan solo los archivos que todavía existen en `archivos`,
     * así el mapa no crece para siempre con los borrados. */
    if ($enviados > 0) {
        $ahoraTexto = date('Y-m-d H:i:s');
        foreach ($archivosParaRespaldar as $a) {
            $cuandoSeRespaldoCadaArchivo[$a['disco']] = $ahoraTexto;
        }

        $vivos = [];
        foreach ($filasArchivos as $fila) {
            $disco = $fila['nombre_disco'];
            if (isset($cuandoSeRespaldoCadaArchivo[$disco])) {
                $vivos[$disco] = $cuandoSeRespaldoCadaArchivo[$disco];
            }
        }

        $mapa = json_encode($vivos, JSON_UNESCAPED_UNICODE);
        ejecutar(
            "INSERT INTO ajustes (clave, valor) VALUES ('respaldo_archivos', :v)
             ON DUPLICATE KEY UPDATE valor = :v2",
            [':v' => $mapa, ':v2' => $mapa]
        );
    }
}

terminarRespaldo([
    'registros' => $cuantasFilas,
    'tablas'    => count($resumen),
    'peso_kb'   => $peso,
    'enviados'  => $enviados,
    'errores'   => $errores,
]);


/**
 * Termina, informando según desde dónde se corrió.
 *
 * @param array $informe
 * @return void
 */
function terminarRespaldo($informe) {
    global $desdeLaConsola;

    error_log('[Ania XV · respaldo] ' . json_encode($informe, JSON_UNESCAPED_UNICODE));

    if ($desdeLaConsola) {
        echo json_encode($informe, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        exit;
    }
    responderBien($informe);
}
