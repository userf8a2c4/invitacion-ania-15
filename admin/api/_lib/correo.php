<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/CORREO.PHP · MANDAR CORREO POR SMTP

   QUÉ HACE ESTE ARCHIVO
   Manda correos usando la cuenta info@aniaxv.com de Hostinger.

   DE DÓNDE SALIÓ
   Es la función smtpEnviar() que vivía dentro de confirmar.php, movida
   acá tal cual para que la usen los dos: la invitación (al confirmar un
   invitado) y el panel (al responder un correo). Antes de moverla estaba
   escrita una sola vez pero atada a ese archivo; ahora es compartida y no
   hay riesgo de que una copia se arregle y la otra no.

   POR QUÉ ESTÁ HECHA A MANO Y NO CON UNA LIBRERÍA
   El hosting es compartido y no tiene Composer, así que no hay PHPMailer.
   Se habla SMTP directo por socket, que son cuatro comandos de texto.

   POR QUÉ EL PUERTO TIENE QUE SER 465
   Con 465 la conexión va cifrada desde el primer byte (ssl:// abajo). Con
   587 haría falta negociar STARTTLS, que este código no implementa, y el
   servidor terminaría rechazando la contraseña. Está anotado también en
   el .env porque ya causó un problema real una vez.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/entorno.php';

/**
 * Manda un correo HTML por SMTP.
 *
 * @param string $para       Destinatario.
 * @param string $asunto     Asunto (puede llevar acentos y emojis).
 * @param string $html       Cuerpo del mensaje en HTML.
 * @param string $from       Remitente. DEBE ser el mismo buzón que
 *                           autentica, o Hostinger lo rechaza por
 *                           suplantación.
 * @param string $fromNombre Nombre visible del remitente.
 * @param string $host       Servidor SMTP.
 * @param int    $port       Puerto. 465 para SSL directo.
 * @param string $user       Usuario del buzón.
 * @param string $pass       Contraseña del buzón.
 * @param string $responderA Opcional: a dónde va la respuesta si es
 *                           distinto del remitente.
 * @return true|string true si salió, o el texto del error si falló.
 */
function smtpEnviar($para, $asunto, $html, $from, $fromNombre,
                    $host, $port, $user, $pass, $responderA = '') {
    $log = [];

    // Con 465 el cifrado va desde el saludo. Con cualquier otro puerto se
    // conecta en claro, que solo sirve para pruebas locales.
    $remoteHost = ((int) $port === 465) ? "ssl://{$host}" : $host;
    $sock = @fsockopen($remoteHost, $port, $errno, $errstr, 15);
    if (!$sock) {
        return "No se pudo conectar a $remoteHost:$port, $errstr ($errno)";
    }

    // Si el servidor deja de contestar, que no se cuelgue la petición
    // entera esperando para siempre.
    stream_set_timeout($sock, 20);

    $leer = function () use ($sock, &$log) {
        $buf = '';
        while (!feof($sock)) {
            $line = fgets($sock, 512);
            if ($line === false) break;
            $buf .= $line;
            $log[] = '< ' . trim($line);
            // En SMTP, una respuesta de varias líneas usa guion en la
            // cuarta posición ("250-"). El espacio marca la última.
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return $buf;
    };

    $cmd = function ($texto) use ($sock, $leer, &$log) {
        $log[] = '> ' . trim($texto);
        fwrite($sock, $texto . "\r\n");
        return $leer();
    };

    $r = $leer();
    if (strpos($r, '220') === false) { fclose($sock); return "220 no recibido: $r"; }

    $r = $cmd("EHLO aniaxv.com");

    $r = $cmd("AUTH LOGIN");
    if (strpos($r, '334') === false) { fclose($sock); return "AUTH LOGIN no aceptado: $r"; }

    $r = $cmd(base64_encode($user));
    if (strpos($r, '334') === false) { fclose($sock); return "Usuario no aceptado: $r"; }

    $r = $cmd(base64_encode($pass));
    if (strpos($r, '235') === false) { fclose($sock); return "Contraseña rechazada: $r"; }

    $r = $cmd("MAIL FROM:<$from>");
    if (strpos($r, '250') === false) { fclose($sock); return "MAIL FROM rechazado: $r"; }

    $r = $cmd("RCPT TO:<$para>");
    if (strpos($r, '250') === false) { fclose($sock); return "RCPT TO rechazado: $r"; }

    $r = $cmd("DATA");
    if (strpos($r, '354') === false) { fclose($sock); return "DATA rechazado: $r"; }

    // Los encabezados con acentos van codificados en base64 según el
    // formato =?UTF-8?B?…?=, si no llegan como símbolos rotos.
    $fromEnc   = '=?UTF-8?B?' . base64_encode($fromNombre) . '?=';
    $asuntoEnc = '=?UTF-8?B?' . base64_encode($asunto) . '?=';
    $cuerpoB64 = chunk_split(base64_encode($html));

    $msg  = "From: $fromEnc <$from>\r\n";
    $msg .= "To: <$para>\r\n";
    if ($responderA !== '') {
        $msg .= "Reply-To: <$responderA>\r\n";
    }
    $msg .= "Subject: $asuntoEnc\r\n";
    $msg .= "Date: " . date('r') . "\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n";
    $msg .= "\r\n" . $cuerpoB64;

    // El punto solo en una línea es lo que le dice al servidor "terminé".
    fwrite($sock, $msg . "\r\n.\r\n");
    $r = $leer();
    if (strpos($r, '250') === false) { fclose($sock); return "Mensaje rechazado: $r"; }

    $cmd("QUIT");
    fclose($sock);

    error_log('[Ania XV] SMTP log: ' . implode(' | ', $log));
    return true;
}

/**
 * Atajo que manda un correo leyendo la configuración del .env.
 *
 * Evita repetir los cinco parámetros de conexión en cada llamada.
 *
 * @param string $para
 * @param string $asunto
 * @param string $html
 * @param string $responderA
 * @return true|string
 */
function enviarCorreo($para, $asunto, $html, $responderA = '') {
    return smtpEnviar(
        $para,
        $asunto,
        $html,
        env('CORREO_REMITENTE', 'info@aniaxv.com'),
        'Ania XV',
        env('SMTP_HOST', 'smtp.hostinger.com'),
        (int) env('SMTP_PORT', 465),
        env('SMTP_USER', ''),
        env('SMTP_PASSWORD', ''),
        $responderA
    );
}
