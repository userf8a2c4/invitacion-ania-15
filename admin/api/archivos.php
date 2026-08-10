<?php
/* ══════════════════════════════════════════════════════════════════════
   ARCHIVOS.PHP · CONTRATOS, COMPROBANTES Y FOTOS

   QUÉ HACE ESTE ARCHIVO
   Recibe archivos subidos desde el teléfono (o fotos tomadas con la
   cámara) y los devuelve solo a quien tenga sesión abierta.

   ⚠️ POR QUÉ ESTE ARCHIVO ES EL MÁS DESCONFIADO DE TODOS
   Aceptar archivos de afuera es la forma más común de tomar control de
   un servidor. Las cuatro defensas que tiene:

     1. NOMBRE ALEATORIO. El archivo se guarda con un nombre inventado,
        no con el que traía. Así nadie puede adivinar la URL de un
        contrato, y un nombre malicioso como "../../.env" no puede
        escaparse de la carpeta.

     2. TIPO REAL, NO EXTENSIÓN. Se mira el contenido del archivo con
        finfo, no cómo se llama. Un .php renombrado a .jpg se detecta.

     3. LA CARPETA NO SE SIRVE. admin/archivos/ tiene su propio .htaccess
        que niega todo y apaga PHP. Aunque alguien lograra subir un
        script, no habría forma de ejecutarlo.

     4. SALEN POR ACÁ. La descarga pasa por este archivo, que exige
        sesión antes de entregar nada.

   QUÉ SE LE PUEDE PEDIR
     POST ?accion=subir     (multipart/form-data)
     GET  ?accion=ver&id=7  devuelve el archivo
     GET  ?accion=listar&tipo=gasto&id=3
     POST ?accion=borrar
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');

/** Dónde viven los archivos. */
$CARPETA = dirname(__DIR__) . '/archivos';

/** Cuánto puede pesar cada uno. 8 MB alcanza para una foto de teléfono. */
const PESO_MAXIMO = 8388608;

/**
 * Qué tipos se aceptan, y con qué extensión se guarda cada uno.
 *
 * Es una lista blanca: lo que no está acá, no entra. Nada de scripts,
 * nada de comprimidos, nada de ejecutables.
 */
const TIPOS_PERMITIDOS = [
    'image/jpeg'      => 'jpg',
    'image/png'       => 'png',
    'image/webp'      => 'webp',
    'image/heic'      => 'heic',   // las fotos del iPhone
    'image/heif'      => 'heif',
    'application/pdf' => 'pdf',
];

/**
 * A qué está atado un archivo que solo debería ver una administradora.
 *
 * Son las cosas de dinero: contratos, comprobantes, cotizaciones. Quien
 * tiene una cuenta de entrada para escanear pases el día del evento no
 * tiene por qué poder bajarlas.
 */
const ATADOS_DE_ADMIN = ['gasto', 'pago', 'proveedor', 'padrino',
                         'categoria', 'cotizacion'];

/**
 * Corta si esta persona no puede tocar este archivo.
 *
 * POR QUÉ HACE FALTA
 * Antes alcanzaba con tener sesión. Los ids son números seguidos, así
 * que pedir ?accion=ver&id=1, 2, 3… bajaba TODOS los contratos y
 * comprobantes del evento, uno por uno, desde cualquier cuenta. Y
 * accion=borrar tampoco miraba nada.
 *
 * @param array $yo   El usuario de la sesión.
 * @param array $fila La fila de la tabla archivos.
 * @return void Corta con 403 si no corresponde.
 */
function exigirQuePuedaVerElArchivo($yo, $fila) {
    if (($yo['rol'] ?? '') === 'admin') return;

    $atado = (string) ($fila['atado_a_tipo'] ?? '');

    if (in_array($atado, ATADOS_DE_ADMIN, true)) {
        responderMal('Este archivo es de la administración del evento.', 403);
    }

    /* Los sueltos (sin atar a nada) también son de admin: no hay forma
       de saber qué son, y ante la duda no se entrega. */
    if ($atado === '') {
        responderMal('Este archivo es de la administración del evento.', 403);
    }
}


switch ($accion) {

/* ─── SUBIR ───────────────────────────────────────────────────────────── */

case 'subir':
    exigirMetodo('POST');

    if (empty($_FILES['archivo'])) {
        responderMal('No llegó ningún archivo.', 400);
    }

    $archivo = $_FILES['archivo'];

    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        // Los dos primeros son "más grande que el límite del servidor".
        $mensaje = in_array($archivo['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
            ? 'El archivo es demasiado grande.'
            : 'No se pudo recibir el archivo.';
        responderMal($mensaje, 400);
    }

    if ($archivo['size'] > PESO_MAXIMO) {
        responderMal('El archivo pesa más de 8 MB. Prueba con una foto más chica.', 413);
    }
    if ($archivo['size'] === 0) {
        responderMal('El archivo está vacío.', 400);
    }

    /* is_uploaded_file confirma que el archivo llegó de verdad por HTTP
       y no es una ruta del servidor que alguien puso en el formulario. */
    if (!is_uploaded_file($archivo['tmp_name'])) {
        responderMal('Ese archivo no es válido.', 400);
    }

    /* El tipo REAL, mirando los primeros bytes del contenido. El campo
       $archivo['type'] lo manda el navegador y se puede falsear. */
    $tipoReal = '';
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $tipoReal = (string) $finfo->file($archivo['tmp_name']);
    } elseif (function_exists('mime_content_type')) {
        $tipoReal = (string) mime_content_type($archivo['tmp_name']);
    }

    if (!isset(TIPOS_PERMITIDOS[$tipoReal])) {
        responderMal(
            'Solo se aceptan imágenes (JPG, PNG, WEBP, HEIC) y PDF.',
            415,
            'Tipo detectado: ' . $tipoReal
        );
    }

    if (!is_dir($CARPETA)) {
        @mkdir($CARPETA, 0755, true);
    }
    if (!is_dir($CARPETA) || !is_writable($CARPETA)) {
        responderMal('El servidor no puede guardar archivos ahora.', 500,
                     'Carpeta no escribible: ' . $CARPETA);
    }

    // Nombre aleatorio: 32 caracteres al azar más la extensión correcta.
    $extension   = TIPOS_PERMITIDOS[$tipoReal];
    $nombreDisco = bin2hex(random_bytes(16)) . '.' . $extension;

    if (!move_uploaded_file($archivo['tmp_name'], $CARPETA . '/' . $nombreDisco)) {
        responderMal('No se pudo guardar el archivo.', 500);
    }

    // El nombre original se guarda solo para mostrarlo, ya recortado.
    $nombreReal = mb_substr(basename((string) $archivo['name']), 0, 255);

    $id = insertar('archivos', [
        'nombre_real'  => $nombreReal,
        'nombre_disco' => $nombreDisco,
        'tipo_mime'    => $tipoReal,
        'tamano_bytes' => (int) $archivo['size'],
        'atado_a_tipo' => campoOpcion($_POST, 'tipo',
                          ['', 'gasto', 'pago', 'proveedor', 'padrino',
                           'categoria', 'cotizacion', 'nota', 'tarea',
                           'regalo', 'invitado'], ''),
        'atado_a_id'   => max(0, (int) ($_POST['id'] ?? 0)),
        'subido_por'   => (int) $yo['id'],
    ]);

    /* Si es el comprobante de un pago, se enlaza en la propia fila del
       pago para que aparezca al abrirlo sin tener que buscarlo.

       Se comprueba el rol Y que el pago exista: antes esto escribía en
       la tabla de pagos con el id que viniera, sin mirar nada. Una
       cuenta de entrada podía tocar filas de dinero mandando un id
       cualquiera. */
    $pagoId = (int) ($_POST['id'] ?? 0);
    if (($_POST['tipo'] ?? '') === 'pago' && $pagoId > 0 &&
        ($yo['rol'] ?? '') === 'admin') {

        $hayPago = consultarUno('SELECT id FROM pagos WHERE id = :id', [':id' => $pagoId]);
        if ($hayPago) actualizar('pagos', $pagoId, ['comprobante_id' => $id]);
    }

    anotarEnBitacora($yo, 'subió un archivo', 'archivos', $id, $nombreReal);

    responderBien([
        'id'     => $id,
        'nombre' => $nombreReal,
        'tipo'   => $tipoReal,
        'peso'   => (int) $archivo['size'],
    ], 201);
    break;


/* ─── VER / DESCARGAR ─────────────────────────────────────────────────── */

case 'ver':
    exigirMetodo('GET');

    $fila = consultarUno('SELECT * FROM archivos WHERE id = :id',
                         [':id' => (int) ($_GET['id'] ?? 0)]);
    if (!$fila) responderMal('Ese archivo no existe.', 404);

    exigirQuePuedaVerElArchivo($yo, $fila);

    /* basename() por si acaso: aunque el nombre lo generamos nosotros,
       si alguna vez la fila se editara a mano en la base, esto impide
       que un "../" salga de la carpeta. */
    $ruta = $CARPETA . '/' . basename($fila['nombre_disco']);
    if (!is_file($ruta)) responderMal('El archivo ya no está en el servidor.', 404);

    header('Content-Type: ' . $fila['tipo_mime']);
    header('Content-Length: ' . filesize($ruta));

    /* inline para las imágenes (se ven en la app) y attachment para los
       PDF (se descargan). El nombre va entre comillas y sin comillas
       internas, para que un nombre raro no rompa la cabecera. */
    /* Se sacan también los saltos de línea, no solo las comillas. Un \r
       o un \n en el nombre parte la cabecera en dos y deja meter otras
       cabeceras inventadas debajo. El nombre lo escribe quien sube el
       archivo, así que no es un dato de confianza. */
    $nombre = preg_replace('/[\r\n"]/', '', $fila['nombre_real']);
    $como   = strpos($fila['tipo_mime'], 'image/') === 0 ? 'inline' : 'attachment';
    header("Content-Disposition: $como; filename=\"$nombre\"");

    // Privado: que no lo guarde ningún intermediario, solo el navegador.
    header('Cache-Control: private, max-age=3600');
    header('X-Content-Type-Options: nosniff');

    readfile($ruta);
    exit;


/* ─── LISTAR LOS DE UN REGISTRO ───────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    $tipo = (string) ($_GET['tipo'] ?? '');
    $id   = (int) ($_GET['id'] ?? 0);

    if ($tipo === '') {
        responderBien(consultarTodo(
            'SELECT id, nombre_real, tipo_mime, tamano_bytes, creado_en
             FROM archivos ORDER BY creado_en DESC LIMIT 100'
        ));
    }

    responderBien(consultarTodo(
        'SELECT id, nombre_real, tipo_mime, tamano_bytes, creado_en
         FROM archivos WHERE atado_a_tipo = :t AND atado_a_id = :i
         ORDER BY creado_en DESC',
        [':t' => $tipo, ':i' => $id]
    ));
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $fila = consultarUno('SELECT * FROM archivos WHERE id = :id', [':id' => $id]);
    if (!$fila) responderMal('Ese archivo no existe.', 404);

    exigirQuePuedaVerElArchivo($yo, $fila);

    // Primero el archivo del disco, después la fila: si se hiciera al
    // revés y fallara el borrado del archivo, quedaría un huérfano que
    // nadie podría encontrar para limpiar.
    $ruta = $CARPETA . '/' . basename($fila['nombre_disco']);
    if (is_file($ruta)) @unlink($ruta);

    borrar('archivos', $id);
    anotarEnBitacora($yo, 'borró un archivo', 'archivos', $id, $fila['nombre_real']);

    responderBien(['mensaje' => 'Archivo eliminado.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
