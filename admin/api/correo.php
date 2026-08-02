<?php
/* ══════════════════════════════════════════════════════════════════════
   CORREO.PHP · LA BANDEJA DE info@aniaxv.com

   QUÉ HACE ESTE ARCHIVO
   Deja leer, responder y escribir correos desde el teléfono, usando el
   buzón institucional de Hostinger.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=bandeja       la lista de los últimos mensajes
     GET  ?accion=leer&n=42     un mensaje completo
     POST ?accion=responder     responde a uno
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

/* ─── LA BANDEJA ──────────────────────────────────────────────────────── */

case 'bandeja':
    exigirMetodo('GET');

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) {
        responderMal($buzon->error, 502);
    }

    $mensajes = $buzon->listar(40);
    $buzon->cerrar();

    responderBien([
        'mensajes'  => $mensajes,
        'sin_leer'  => count(array_filter($mensajes, function ($m) {
                           return empty($m['leido']);
                       })),
        'buzon'     => env('IMAP_USER', env('SMTP_USER', '')),
    ]);
    break;


/* ─── LEER UNO ────────────────────────────────────────────────────────── */

case 'leer':
    exigirMetodo('GET');

    $numero = (int) ($_GET['n'] ?? 0);
    if ($numero < 1) responderMal('Falta decir qué mensaje.', 400);

    $buzon = new BuzonImap();
    if (!$buzon->conectar()) responderMal($buzon->error, 502);

    $mensaje = $buzon->leer($numero);
    $buzon->cerrar();

    if (!$mensaje) responderMal('No se pudo leer ese mensaje.', 404);
    responderBien($mensaje);
    break;


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

    $resultado = enviarCorreo($para, $asunto, plantillaDeRespuesta($texto));

    if ($resultado !== true) {
        responderMal('No se pudo enviar: ' . $resultado, 502);
    }

    anotarEnBitacora($yo, 'envió un correo', 'correo', 0, $para . ' — ' . $asunto);
    responderBien(['mensaje' => 'Correo enviado a ' . $para]);
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

    $todos = $buzon->listar(60);
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

        // La huella de un mensaje: su número y su fecha. Alcanza para no
        // repetirlo, porque los números no se reutilizan en el buzón.
        $huella = 'imap:' . $mensaje['numero'];
        if (isset($yaCargados[$huella])) continue;

        $candidatos[] = [
            'huella' => $huella,
            'numero' => $mensaje['numero'],
            'asunto' => $mensaje['asunto'],
            'fecha'  => $mensaje['fecha'],
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
