<?php
/* ══════════════════════════════════════════════════════════════════════
   CORREO.PHP · LA BANDEJA DE info@aniaxv.com

   QUÉ HACE ESTE ARCHIVO
   Deja leer, responder y escribir correos desde el teléfono, usando el
   buzón institucional de Hostinger.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=estado        solo prueba la conexión, sin bajar nada
     GET  ?accion=bandeja       la lista de los últimos mensajes
     GET  ?accion=leer&n=42     un mensaje completo, con su lista de adjuntos
     GET  ?accion=adjunto&numero=42&ruta=2   baja (o muestra) un adjunto
     POST ?accion=responder     responde a uno, puede reenviar sus adjuntos
     POST ?accion=escribir      manda uno nuevo
     GET  ?accion=regalos       busca avisos de compra de Amazon

   POR QUÉ LEER Y ESCRIBIR USAN SERVIDORES DISTINTOS
   Son dos servicios separados: IMAP (imap.hostinger.com:993) guarda y
   entrega el correo recibido; SMTP (smtp.hostinger.com:465) manda el
   saliente. Mismo buzón y misma contraseña, distinta puerta.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';
require_once __DIR__ . '/_lib/imap.php';

$yo     = exigirAdministrador();   // el rol 'entrada' no ve el correo
$accion = (string) ($_GET['accion'] ?? 'bandeja');


switch ($accion) {

/* ─── SALUD DE LA CONEXIÓN ────────────────────────────────────────────── */

/*
   Prueba SOLO que el login IMAP funcione — no pide ni un mensaje. Sirve
   para separar "está mal configurado el .env" de "el buzón está
   vacío", sin pagar el costo de bajar 40 encabezados nada más para
   averiguarlo. conectar() ya distingue sin señal (fsockopen falla) de
   credenciales rechazadas (LOGIN falla) — acá solo se expone eso tal
   cual, con el mismo mensaje humano que ya arma imap.php.
*/
case 'estado':
    exigirMetodo('GET');

    $buzon = new BuzonImap();
    $conectado = $buzon->conectar();
    if ($conectado) $buzon->cerrar();

    if (!$conectado) responderMal($buzon->error, 502);

    responderBien([
        'ok'    => true,
        'buzon' => env('IMAP_USER', env('SMTP_USER', '')),
    ]);
    break;


/* ─── LA BANDEJA ──────────────────────────────────────────────────────── */

case 'bandeja':
    exigirMetodo('GET');

    $carpeta = campoTexto($_GET, 'carpeta', 120, 'INBOX');

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) {
        responderMal($buzon->error, 502);
    }

    $mensajes = $buzon->listar($carpeta, 40);

    /* listar() puede fallar DESPUÉS del login —por ejemplo si el SELECT
       INBOX no salió bien— y en ese caso devuelve un arreglo vacío
       igual que una bandeja legítimamente vacía. Sin este chequeo esos
       dos casos se verían idénticos en pantalla: "La bandeja está
       vacía" cuando en realidad algo se rompió. */
    if ($buzon->error) {
        $error = $buzon->error;
        $buzon->cerrar();
        responderMal($error, 502);
    }

    $buzon->cerrar();

    responderBien([
        'mensajes'  => $mensajes,
        'carpeta'   => $carpeta,
        'sin_leer'  => count(array_filter($mensajes, function ($m) {
                           return empty($m['leido']);
                       })),
        'buzon'     => env('IMAP_USER', env('SMTP_USER', '')),
    ]);
    break;


/* ─── CARPETAS ────────────────────────────────────────────────────────── */

case 'carpetas':
    exigirMetodo('GET');

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    $carpetas = $buzon->carpetas();
    $buzon->cerrar();

    responderBien(['carpetas' => $carpetas]);
    break;


/* ─── LEER UNO ────────────────────────────────────────────────────────── */

case 'leer':
    exigirMetodo('GET');

    $uid     = (int) ($_GET['uid'] ?? 0);
    $carpeta = campoTexto($_GET, 'carpeta', 120, 'INBOX');
    if ($uid < 1) responderMal('Falta decir qué mensaje.', 400);

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    $mensaje = $buzon->leer($carpeta, $uid);
    $buzon->cerrar();

    if (!$mensaje) responderMal('No se pudo leer ese mensaje.', 404);
    responderBien($mensaje);
    break;


/* ─── BAJAR (O MOSTRAR) UN ADJUNTO ────────────────────────────────────── */

case 'adjunto':
    exigirMetodo('GET');

    $uid     = (int) ($_GET['uid'] ?? 0);
    $carpeta = campoTexto($_GET, 'carpeta', 120, 'INBOX');
    // Solo dígitos y puntos: es una ruta MIME (ej. "2" o "1.2"), nunca
    // texto libre, así que no hay nada que sanitizar más que esto.
    $ruta = preg_replace('/[^0-9.]/', '', (string) ($_GET['ruta'] ?? ''));

    if ($uid < 1 || $ruta === '') responderMal('Falta decir qué adjunto.', 400);

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    $adjunto = $buzon->leerAdjunto($carpeta, $uid, $ruta);
    $buzon->cerrar();

    if (!$adjunto) responderMal('No se pudo bajar ese adjunto.', 404);

    // "inline" deja que imágenes y PDF se abran dentro del panel con el
    // visor que ya existe (ver codigo/14-archivos.js); ?descargar=1 fuerza
    // la descarga en vez de mostrarlo.
    $disposicion = !empty($_GET['descargar']) ? 'attachment' : 'inline';
    $nombreSeguro = str_replace(['"', "\r", "\n"], '', $adjunto['nombre']);

    header('Content-Type: ' . $adjunto['tipo']);
    header("Content-Disposition: $disposicion; filename=\"$nombreSeguro\"");
    header('Content-Length: ' . strlen($adjunto['datos']));
    header('Cache-Control: no-store');
    echo $adjunto['datos'];
    exit;


/* ─── RESPONDER Y ESCRIBIR ────────────────────────────────────────────── */

case 'responder':
case 'escribir':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $para   = campoTexto($datos, 'para', 190);
    $asunto = campoTexto($datos, 'asunto', 200);
    $texto  = campoTexto($datos, 'texto', 20000);

    if (!filter_var($para, FILTER_VALIDATE_EMAIL)) {
        responderMal('La dirección de destino no es válida.', 422);
    }
    if ($texto === '') responderMal('El mensaje está vacío.', 400);
    if ($asunto === '') $asunto = '(sin asunto)';

    /* Reenviar adjuntos del mensaje original, si se pidió alguno. Vienen
       como referencias {uid, carpeta, ruta} — el archivo se vuelve a
       bajar del buzón acá mismo, nunca se confía en datos binarios
       mandados por el navegador para esto. Como máximo 5: es para
       reenviar el contrato o la foto que llegó, no para armar un mailer
       de archivos pesados. */
    $referencias = is_array($datos['adjuntos'] ?? null) ? array_slice($datos['adjuntos'], 0, 5) : [];
    $adjuntosParaEnviar = [];

    if ($referencias) {
        $buzonAdj = new BuzonImap();
        if ($buzonAdj->conectar()) {
            foreach ($referencias as $ref) {
                $u = (int) ($ref['uid'] ?? 0);
                $c = campoTexto($ref, 'carpeta', 120, 'INBOX');
                $r = preg_replace('/[^0-9.]/', '', (string) ($ref['ruta'] ?? ''));
                if ($u < 1 || $r === '') continue;

                $bajado = $buzonAdj->leerAdjunto($c, $u, $r);
                if ($bajado) $adjuntosParaEnviar[] = $bajado;
            }
            $buzonAdj->cerrar();
        }
    }

    $resultado = enviarCorreo($para, $asunto, plantillaDeRespuesta($texto), '', $adjuntosParaEnviar);

    if ($resultado !== true) {
        responderMal('No se pudo enviar: ' . $resultado, 502);
    }

    anotarEnBitacora($yo, 'envió un correo', 'correo', 0, $para . ' — ' . $asunto);
    responderBien(['mensaje' => 'Correo enviado a ' . $para]);
    break;


/* ─── MARCAR, BORRAR, MARCAR COMO NO LEÍDO ────────────────────────────── */

case 'marcar':
case 'borrar':
case 'no_leido':
    exigirMetodo('POST');

    $datos   = cuerpoJson();
    $uid     = campoEntero($datos, 'uid', 1);
    $carpeta = campoTexto($datos, 'carpeta', 120, 'INBOX');

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    if ($accion === 'marcar') {
        $marcar = !empty($datos['marcar']);
        $salio  = $buzon->marcar($carpeta, $uid, $marcar);
        $buzon->cerrar();

        if (!$salio) responderMal('No se pudo cambiar la marca.', 502);
        responderBien([
            'marcado' => $marcar,
            'mensaje' => $marcar ? 'Marcado como importante.' : 'Marca quitada.',
        ]);
    }

    if ($accion === 'no_leido') {
        $salio = $buzon->marcarNoLeido($carpeta, $uid);
        $buzon->cerrar();

        if (!$salio) responderMal('No se pudo marcar como no leído.', 502);
        responderBien(['mensaje' => 'Marcado como no leído.']);
    }

    // Borrar.
    $salio = $buzon->borrar($carpeta, $uid);
    $buzon->cerrar();

    if (!$salio) {
        responderMal(
            'No se pudo borrar: el servidor no tiene una carpeta de papelera ' .
            'donde guardarlo primero.',
            502
        );
    }

    anotarEnBitacora($yo, 'borró un correo', 'correo', $uid);
    responderBien(['mensaje' => 'Correo movido a la papelera.']);
    break;


/* ─── AVISOS DE COMPRA DE LA LISTA DE AMAZON ──────────────────────────── */

case 'regalos':
    exigirMetodo('GET');

    /* Amazon manda un correo cuando alguien compra de la mesa de
       regalos. Acá se buscan esos avisos en la bandeja para ofrecer dar
       de alta el regalo con un botón, en vez de teclearlo a mano.

       No se raspa la web de Amazon —eso va contra sus términos y se
       rompe en cuanto cambian el HTML—: se lee el correo que ellos
       mismos mandan, que es información que ya es tuya. */

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    $todos = $buzon->listar('INBOX', 60);
    $buzon->cerrar();

    // Cuáles ya se dieron de alta, para no ofrecerlos dos veces.
    $yaCargados = [];
    if (existeTabla('regalos')) {
        foreach (consultarTodo("SELECT correo_origen FROM regalos
                                WHERE correo_origen <> ''") as $fila) {
            $yaCargados[$fila['correo_origen']] = true;
        }
    }

    $candidatos = [];
    foreach ($todos as $mensaje) {
        $de = mb_strtolower($mensaje['de'] ?? '');

        $esDeAmazon = strpos($de, 'amazon') !== false;
        $hablaDeRegalo = preg_match('/regalo|gift|pedido|order|compr/i',
                                    $mensaje['asunto'] ?? '');

        if (!$esDeAmazon || !$hablaDeRegalo) continue;

        /* La huella de un mensaje: su UID. Antes de esta fase se usaba
           el número de secuencia, que el propio servidor reasigna cada
           vez que algo se borra y se hace EXPUNGE — un correo podía
           volver a proponerse como "nuevo" simplemente porque otro
           mensaje se borró antes en la lista. El UID no cambia nunca
           mientras el mensaje siga en la carpeta, así que ahora sí es
           una huella de verdad.

           Efecto de este cambio: las huellas "imap:<numero>" que ya
           estén guardadas en la tabla `regalos` de una instalación
           vieja no van a coincidir con las nuevas "imap:<uid>", así
           que esos regalos concretos podrían proponerse una vez más.
           No es grave —solo hay que ignorarlos o cargarlos de nuevo
           una vez—, y a partir de acá queda arreglado para siempre. */
        $huella = 'imap:' . $mensaje['uid'];
        if (isset($yaCargados[$huella])) continue;

        $candidatos[] = [
            'huella'  => $huella,
            'uid'     => $mensaje['uid'],
            'carpeta' => 'INBOX',
            'asunto'  => $mensaje['asunto'],
            'fecha'   => $mensaje['fecha'],
        ];
    }

    responderBien(['candidatos' => $candidatos]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Envuelve el texto de una respuesta en el HTML de la casa.
 *
 * El texto lo escribió una persona en un campo libre, así que se escapa
 * antes de meterlo en el HTML: si escribiera algo con < o >, sin esto el
 * correo llegaría roto.
 *
 * @param string $texto
 * @return string
 */
function plantillaDeRespuesta($texto) {
    $seguro = nl2br(htmlspecialchars($texto, ENT_QUOTES, 'UTF-8'));

    return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'></head>
<body style='font-family:Georgia,serif;background:#1a0a00;color:#f5e6c8;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0'
       style='max-width:560px;margin:0 auto;padding:40px 20px;'>
  <tr><td align='center' style='padding-bottom:24px;'>
    <h1 style='color:#d4a843;font-size:26px;margin:0;letter-spacing:2px;'>Ania · XV Años</h1>
  </td></tr>
  <tr><td style='background:#2a1500;border:1px solid #5a3a10;border-radius:8px;padding:28px;
                 line-height:1.6;'>$seguro</td></tr>
  <tr><td align='center' style='padding-top:24px;color:#5a3a10;font-size:12px;'>
    Ania XV · aniaxv.com</td></tr>
</table></body></html>";
}
