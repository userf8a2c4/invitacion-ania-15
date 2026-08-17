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
 * @param array  $imagenes   Opcional: imágenes incrustadas en el HTML.
 *                           Cada una: ['cid' => 'qr', 'tipo' => 'image/png',
 *                           'datos' => contenido binario]. En el HTML se
 *                           referencian con <img src="cid:qr">.
 * @param string|null &$mensajeCrudo Opcional: si se pasa una variable,
 *                           queda con el mensaje RFC822 completo tal
 *                           como se mandó (encabezados + cuerpo). Sirve
 *                           para guardar una copia en la carpeta de
 *                           Enviados por IMAP después (ver
 *                           BuzonImap::guardarEnviado() en imap.php) sin
 *                           tener que reconstruir el mensaje dos veces.
 * @return true|string true si salió, o el texto del error si falló.
 */
function smtpEnviar($para, $asunto, $html, $from, $fromNombre,
                    $host, $port, $user, $pass, $responderA = '',
                    $imagenes = [], $adjuntos = [], &$mensajeCrudo = null) {
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

    /* Qué líneas NO se anotan en el registro.
     *
     * El diálogo SMTP manda el usuario y la contraseña como dos líneas
     * sueltas en base64, justo después de "AUTH LOGIN". Base64 no es
     * cifrado: se descodifica en un segundo. Anotando el diálogo entero,
     * la contraseña del correo quedaba escrita en el log de errores del
     * servidor, en un renglón que cualquiera puede leer y descodificar.
     *
     * Se cuentan las líneas desde el AUTH LOGIN porque las credenciales
     * no se pueden reconocer por su contenido: son texto cualquiera. */
    $tocaCredencial = 0;

    $cmd = function ($texto) use ($sock, $leer, &$log, &$tocaCredencial) {
        if ($tocaCredencial > 0) {
            $log[] = '> (credencial, no se anota)';
            $tocaCredencial--;
        } else {
            $log[] = '> ' . trim($texto);
            // Después de AUTH LOGIN vienen dos: el usuario y la clave.
            if (stripos(trim($texto), 'AUTH LOGIN') === 0) $tocaCredencial = 2;
        }

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
    // Sin esto, Gmail adivina el idioma por su cuenta y se equivoca: le
    // ofrece al invitado "Traducir al español" un correo que ya está en
    // español. Declararlo evita ese cartel.
    $msg .= "Content-Language: es-MX\r\n";

    if (empty($imagenes) && empty($adjuntos)) {
        // Sin nada adjunto: un correo simple de una sola parte, como siempre.
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n";
        $msg .= "\r\n" . $cuerpoB64;

    } elseif (!empty($adjuntos)) {
        /* CON ARCHIVOS ADJUNTOS
           multipart/MIXED, no /related: un adjunto es un archivo aparte
           que se descarga, no una imagen incrustada en el HTML. Con
           /related el respaldo aparecería como parte del mensaje y
           varios lectores ni lo mostrarían. */
        $frontera = 'ania' . bin2hex(random_bytes(12));

        $msg .= "Content-Type: multipart/mixed; boundary=\"$frontera\"\r\n";
        $msg .= "\r\n";
        $msg .= "Este mensaje necesita un lector de correo que entienda HTML.\r\n\r\n";

        $msg .= "--$frontera\r\n";
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n";
        $msg .= "\r\n" . $cuerpoB64 . "\r\n";

        foreach ($adjuntos as $adjunto) {
            // El nombre se limpia: unas comillas dentro romperían la
            // cabecera y el archivo llegaría sin nombre o no llegaría.
            $nombre = str_replace(['"', "\r", "\n"], '', (string) $adjunto['nombre']);
            $tipo   = (string) ($adjunto['tipo'] ?? 'application/octet-stream');

            $msg .= "--$frontera\r\n";
            $msg .= "Content-Type: $tipo; name=\"$nombre\"\r\n";
            $msg .= "Content-Transfer-Encoding: base64\r\n";
            $msg .= "Content-Disposition: attachment; filename=\"$nombre\"\r\n";
            $msg .= "\r\n" . chunk_split(base64_encode($adjunto['datos'])) . "\r\n";
        }

        $msg .= "--$frontera--";

    } else {
        /* CON IMÁGENES INCRUSTADAS

           El correo pasa a tener varias partes: el HTML y cada imagen,
           separadas por una "frontera" que es un texto al azar. Se usa
           multipart/RELATED (y no /mixed) porque las imágenes no son
           adjuntos sueltos: son parte del HTML, que las llama por su
           Content-ID. Con /mixed, el QR aparecería como un archivo
           adjunto abajo en vez de verse dentro del correo.

           La frontera se genera al azar para que no pueda aparecer por
           casualidad dentro del contenido y partir el mensaje. */
        $frontera = 'ania' . bin2hex(random_bytes(12));

        $msg .= "Content-Type: multipart/related; boundary=\"$frontera\"\r\n";
        $msg .= "\r\n";
        $msg .= "Este mensaje necesita un lector de correo que entienda HTML.\r\n\r\n";

        // Primera parte: el HTML.
        $msg .= "--$frontera\r\n";
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n";
        $msg .= "\r\n" . $cuerpoB64 . "\r\n";

        // Después, una parte por imagen.
        foreach ($imagenes as $imagen) {
            $cid  = preg_replace('/[^a-zA-Z0-9_.-]/', '', (string) $imagen['cid']);
            $tipo = (string) ($imagen['tipo'] ?? 'image/png');

            $msg .= "--$frontera\r\n";
            $msg .= "Content-Type: $tipo\r\n";
            $msg .= "Content-Transfer-Encoding: base64\r\n";
            $msg .= "Content-ID: <$cid>\r\n";
            // inline, para que se vea dentro y no como adjunto aparte.
            $msg .= "Content-Disposition: inline; filename=\"$cid.png\"\r\n";
            $msg .= "\r\n" . chunk_split(base64_encode($imagen['datos'])) . "\r\n";
        }

        // La frontera con dos guiones al final cierra el mensaje.
        $msg .= "--$frontera--";
    }

    // Se deja disponible tal cual se va a mandar, antes del DATA: sirve
    // para archivarlo en Enviados después, salga bien o mal el envío.
    $mensajeCrudo = $msg;

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
 * @param array  $adjuntos
 * @param string|null &$mensajeCrudo Ver smtpEnviar().
 * @return true|string
 */
function enviarCorreo($para, $asunto, $html, $responderA = '', $adjuntos = [], &$mensajeCrudo = null) {
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
        $responderA,
        [],
        $adjuntos,
        $mensajeCrudo
    );
}
