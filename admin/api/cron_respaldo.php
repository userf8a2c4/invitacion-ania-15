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
$tablas = [
    'confirmaciones', 'preferencias_invitado', 'grupos_invitados',
    'incompatibilidades', 'mesas', 'asignacion_mesas',
    'categorias_gasto', 'gastos', 'pagos', 'padrinos', 'proveedores',
    'cotizaciones', 'cotizacion_items',
    'tareas', 'agenda', 'cronograma', 'alarmas', 'notas',
    'corte_honor', 'ensayos', 'asistencia_ensayos',
    'ceremonia', 'requisitos_ceremonia', 'musica', 'citas_arreglo',
    'tomas_foto', 'regalos', 'foraneos', 'archivos',
];

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
 * debajo de eso incluso sumando el JSON de la base de datos. Se agregan
 * archivos MÁS NUEVOS PRIMERO hasta llegar al tope, y los que no
 * entraron quedan listados en el correo — así se ve QUÉ falta respaldar
 * esta semana, en vez de que el cron fallara entero o se cortara a la
 * mitad de un archivo. La próxima semana, si esos archivos siguen sin
 * bajar de peso el resto, vuelven a intentarlo (no hay "ya se hizo" que
 * recordar: cada corrida arranca de cero). */
const PESO_MAXIMO_DE_ARCHIVOS_EN_RESPALDO = 12 * 1024 * 1024;

$CARPETA_ARCHIVOS = dirname(__DIR__) . '/archivos';
$archivosParaRespaldar = [];
$archivosQueNoEntraron = [];

if (existeTabla('archivos')) {
    $filasArchivos = consultarTodo(
        'SELECT nombre_disco, nombre_real, tamano_bytes
         FROM archivos ORDER BY creado_en DESC'
    );

    $pesoAcumulado = 0;
    foreach ($filasArchivos as $fila) {
        $ruta = $CARPETA_ARCHIVOS . '/' . basename($fila['nombre_disco']);

        // No está en el disco: ni se cuenta ni se intenta — este es
        // justo el caso que este respaldo nuevo existe para evitar que
        // se repita sin que nadie se entere.
        if (!is_file($ruta)) continue;

        $peso = (int) $fila['tamano_bytes'] ?: filesize($ruta);

        if ($pesoAcumulado + $peso > PESO_MAXIMO_DE_ARCHIVOS_EN_RESPALDO) {
            $archivosQueNoEntraron[] = $fila['nombre_real'];
            continue;
        }

        $pesoAcumulado += $peso;
        $archivosParaRespaldar[] = ['ruta' => $ruta, 'nombre' => $fila['nombre_disco']];
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
        'enviados'          => $enviados,
        'errores'           => count($errores),
    ], JSON_UNESCAPED_UNICODE);

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('ultimo_respaldo', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [':v' => $estado, ':v2' => $estado]
    );
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
