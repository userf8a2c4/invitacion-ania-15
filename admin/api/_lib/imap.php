<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/IMAP.PHP · LEER EL BUZÓN DE info@aniaxv.com

   QUÉ HACE ESTE ARCHIVO
   Se conecta al servidor de correo entrante de Hostinger y baja la lista
   de mensajes y su contenido.

   POR QUÉ ESTÁ ESCRITO A MANO
   PHP trae una extensión `imap` que hace todo esto en dos líneas, pero
   en los planes compartidos de Hostinger no siempre está activada, y
   desde PHP 8.4 quedó fuera del núcleo. Este cliente habla IMAP directo
   por socket, igual que smtpEnviar() hace con SMTP en correo.php, así
   que funciona haya o no extensión.

   CÓMO FUNCIONA IMAP EN DOS PÁRRAFOS
   Es un diálogo de texto. Se manda una línea con una etiqueta al
   principio ("a1 LOGIN usuario clave") y el servidor contesta varias
   líneas, la última empezando con esa misma etiqueta y OK, NO o BAD.
   Las etiquetas sirven para saber qué respuesta corresponde a qué orden.

   Los mensajes se piden por número. FETCH trae lo que se le pida: solo
   los encabezados (rápido, para la lista) o el cuerpo entero (para
   leer uno). Acá se usan las dos cosas según haga falta.

   ÍNDICE
     1. Conectar y hablar
     2. Listar mensajes
     3. Leer un mensaje
     4. Decodificar
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/entorno.php';


/* ─── 1. CONECTAR Y HABLAR ────────────────────────────────────────────── */

/**
 * Un cliente IMAP mínimo, con lo justo para el panel.
 */
class BuzonImap {

    /** @var resource|null El socket abierto. */
    private $sock = null;

    /** @var int Contador para las etiquetas a1, a2, a3… */
    private $contador = 0;

    /** @var string|null El último error, para poder informarlo. */
    public $error = null;

    /**
     * Abre la conexión y entra al buzón.
     *
     * @return bool Si se pudo.
     */
    public function conectar() {
        $host = env('IMAP_HOST', 'imap.hostinger.com');
        $port = (int) env('IMAP_PORT', 993);
        $user = env('IMAP_USER', env('SMTP_USER', ''));
        $pass = env('IMAP_PASSWORD', env('SMTP_PASSWORD', ''));

        if ($user === '' || $pass === '') {
            $this->error = 'Faltan las credenciales IMAP en el .env del servidor.';
            return false;
        }

        // Con el puerto 993 la conexión va cifrada desde el primer byte.
        $destino = ($port === 993) ? "ssl://$host" : $host;
        $this->sock = @fsockopen($destino, $port, $errno, $errstr, 15);

        if (!$this->sock) {
            $this->error = "No se pudo conectar a $host:$port ($errstr)";
            return false;
        }
        stream_set_timeout($this->sock, 20);

        // El servidor saluda solo, antes de que le preguntemos nada.
        $saludo = fgets($this->sock, 1024);
        if (strpos((string) $saludo, 'OK') === false) {
            $this->error = 'El servidor de correo no saludó como se esperaba.';
            return false;
        }

        /* La contraseña va entre comillas y con las comillas y barras
           internas escapadas: si la clave llevara una comilla, sin esto
           el servidor leería el comando cortado por la mitad. */
        $userSeguro = '"' . addcslashes($user, '"\\') . '"';
        $passSeguro = '"' . addcslashes($pass, '"\\') . '"';

        $respuesta = $this->ordenar("LOGIN $userSeguro $passSeguro");
        if (!$this->salioBien($respuesta)) {
            $this->error = 'El servidor rechazó el usuario o la contraseña.';
            return false;
        }

        return true;
    }

    /**
     * Cierra la conexión educadamente.
     *
     * @return void
     */
    public function cerrar() {
        if ($this->sock) {
            @fwrite($this->sock, "z999 LOGOUT\r\n");
            @fclose($this->sock);
            $this->sock = null;
        }
    }

    /**
     * Manda una orden y devuelve todas las líneas de la respuesta.
     *
     * @param string $orden Sin la etiqueta: se le pone sola.
     * @return string[]
     */
    private function ordenar($orden) {
        $etiqueta = 'a' . (++$this->contador);
        fwrite($this->sock, "$etiqueta $orden\r\n");

        $lineas = [];
        while (!feof($this->sock)) {
            $linea = fgets($this->sock, 8192);
            if ($linea === false) break;

            $lineas[] = rtrim($linea, "\r\n");

            // La respuesta termina cuando aparece la etiqueta que mandamos.
            if (strpos($linea, $etiqueta . ' ') === 0) break;
        }
        return $lineas;
    }

    /**
     * Dice si la última línea de una respuesta indica éxito.
     *
     * @param string[] $lineas
     * @return bool
     */
    private function salioBien($lineas) {
        if (empty($lineas)) return false;
        $ultima = end($lineas);
        return (bool) preg_match('/^a\d+ OK/i', $ultima);
    }


    /* ─── 2. LISTAR MENSAJES ──────────────────────────────────────────── */

    /**
     * Devuelve los mensajes más recientes de la bandeja de entrada.
     *
     * @param int $cuantos Cuántos traer, del más nuevo hacia atrás.
     * @return array[] Cada uno con numero, asunto, de, fecha, leido.
     */
    public function listar($cuantos = 40) {
        $respuesta = $this->ordenar('SELECT INBOX');
        if (!$this->salioBien($respuesta)) {
            $this->error = 'No se pudo abrir la bandeja de entrada.';
            return [];
        }

        // Cuántos mensajes hay en total: viene en una línea "* 123 EXISTS".
        $total = 0;
        foreach ($respuesta as $linea) {
            if (preg_match('/^\* (\d+) EXISTS/i', $linea, $m)) {
                $total = (int) $m[1];
                break;
            }
        }
        if ($total === 0) return [];

        // Se piden los últimos N: los mensajes se numeran del 1 al total,
        // y los más nuevos son los de número más alto.
        $desde = max(1, $total - $cuantos + 1);

        $lineas = $this->ordenar(
            "FETCH $desde:$total (FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])"
        );

        return $this->interpretarLista($lineas);
    }

    /**
     * Convierte la respuesta cruda del FETCH en una lista de mensajes.
     *
     * @param string[] $lineas
     * @return array[]
     */
    private function interpretarLista($lineas) {
        $mensajes = [];
        $actual   = null;

        foreach ($lineas as $linea) {

            // "* 42 FETCH (FLAGS (\Seen) BODY[HEADER.FIELDS ...]"
            if (preg_match('/^\* (\d+) FETCH/i', $linea, $m)) {
                if ($actual) $mensajes[] = $actual;

                $actual = [
                    'numero' => (int) $m[1],
                    'de'     => '',
                    'asunto' => '(sin asunto)',
                    'fecha'  => '',
                    // \Seen en los flags significa que ya se leyó.
                    'leido'  => stripos($linea, '\\Seen') !== false,
                    // \Flagged es la estrella de "importante".
                    'marcado'=> stripos($linea, '\\Flagged') !== false,
                ];
                continue;
            }

            if (!$actual) continue;

            if (preg_match('/^From:\s*(.+)$/i', $linea, $m)) {
                $actual['de'] = decodificarEncabezado(trim($m[1]));
            } elseif (preg_match('/^Subject:\s*(.+)$/i', $linea, $m)) {
                $actual['asunto'] = decodificarEncabezado(trim($m[1]));
            } elseif (preg_match('/^Date:\s*(.+)$/i', $linea, $m)) {
                $marca = strtotime(trim($m[1]));
                $actual['fecha'] = $marca ? date('Y-m-d H:i:s', $marca) : '';
            }
        }

        if ($actual) $mensajes[] = $actual;

        // Del más nuevo al más viejo, que es como se espera ver un buzón.
        return array_reverse($mensajes);
    }


    /* ─── 3. LEER UN MENSAJE ──────────────────────────────────────────── */

    /**
     * Baja un mensaje entero y devuelve su texto.
     *
     * @param int $numero
     * @return array|null
     */
    public function leer($numero) {
        $this->ordenar('SELECT INBOX');

        $lineas = $this->ordenar("FETCH $numero (BODY[])");
        if (empty($lineas)) return null;

        // La primera línea es el "* N FETCH (...)" y la última la etiqueta:
        // el mensaje de verdad está en el medio.
        array_shift($lineas);
        array_pop($lineas);
        $crudo = implode("\n", $lineas);

        // Los encabezados y el cuerpo se separan con una línea en blanco.
        $partes       = preg_split("/\r?\n\r?\n/", $crudo, 2);
        $encabezados  = $partes[0] ?? '';
        $cuerpoCrudo  = $partes[1] ?? '';

        $de     = '';
        $asunto = '(sin asunto)';
        $fecha  = '';
        $responderA = '';

        foreach (preg_split("/\r?\n/", $encabezados) as $linea) {
            if (preg_match('/^From:\s*(.+)$/i', $linea, $m))     $de = decodificarEncabezado(trim($m[1]));
            if (preg_match('/^Subject:\s*(.+)$/i', $linea, $m))  $asunto = decodificarEncabezado(trim($m[1]));
            if (preg_match('/^Reply-To:\s*(.+)$/i', $linea, $m)) $responderA = trim($m[1]);
            if (preg_match('/^Date:\s*(.+)$/i', $linea, $m)) {
                $marca = strtotime(trim($m[1]));
                $fecha = $marca ? date('Y-m-d H:i:s', $marca) : '';
            }
        }

        $texto = decodificarCuerpo($encabezados, $cuerpoCrudo);

        // Marcar como leído, ahora que efectivamente se abrió.
        $this->ordenar("STORE $numero +FLAGS (\\Seen)");

        return [
            'numero'     => (int) $numero,
            'de'         => $de,
            'correo_de'  => extraerCorreo($responderA !== '' ? $responderA : $de),
            'asunto'     => $asunto,
            'fecha'      => $fecha,
            'texto'      => $texto,
        ];
    }


    /* ─── 3b. MARCAR Y BORRAR ─────────────────────────────────────────── */

    /**
     * Pone o quita la estrella de "importante".
     *
     * @param int  $numero
     * @param bool $marcar true pone la estrella, false la quita.
     * @return bool
     */
    public function marcar($numero, $marcar) {
        $this->ordenar('SELECT INBOX');

        $signo = $marcar ? '+' : '-';
        $r = $this->ordenar("STORE $numero {$signo}FLAGS (\\Flagged)");

        return $this->salioBien($r);
    }

    /**
     * Manda un mensaje a la papelera.
     *
     * CÓMO SE BORRA EN IMAP, QUE NO ES OBVIO
     * No hay un comando "DELETE". Se le pone la marca \Deleted al
     * mensaje y recién EXPUNGE lo elimina de verdad. Pero eso lo borra
     * para siempre, sin papelera.
     *
     * Por eso acá primero se intenta COPIARLO a la carpeta de papelera
     * y recién después se lo saca de la bandeja. Si algún día alguien
     * borra un correo importante por error, sigue estando.
     *
     * @param int $numero
     * @return bool
     */
    public function borrar($numero) {
        $this->ordenar('SELECT INBOX');

        /* El nombre de la papelera cambia según el servidor y el idioma.
           Se prueban los más comunes y se usa el primero que acepte. */
        $copiado = false;
        foreach (['Trash', 'INBOX.Trash', 'Papelera', 'INBOX.Papelera',
                  'Deleted Items', 'Deleted Messages'] as $papelera) {
            if ($this->salioBien($this->ordenar("COPY $numero \"$papelera\""))) {
                $copiado = true;
                break;
            }
        }

        if (!$copiado) {
            /* Ninguna papelera aceptó la copia. Se prefiere NO borrar
               antes que borrar sin red de seguridad: es mejor que quede
               un correo de más a perder uno para siempre. */
            error_log('[Ania XV · correo] No se encontró carpeta de papelera; no se borró.');
            return false;
        }

        $this->ordenar("STORE $numero +FLAGS (\\Deleted)");
        $r = $this->ordenar('EXPUNGE');

        return $this->salioBien($r);
    }

    /**
     * Marca un mensaje como no leído.
     *
     * @param int $numero
     * @return bool
     */
    public function marcarNoLeido($numero) {
        $this->ordenar('SELECT INBOX');
        return $this->salioBien($this->ordenar("STORE $numero -FLAGS (\\Seen)"));
    }
}


/* ─── 4. DECODIFICAR ──────────────────────────────────────────────────── */

/**
 * Decodifica un encabezado con acentos.
 *
 * Los asuntos con tildes viajan codificados como
 * "=?UTF-8?B?Q29uZmlybWFjacOzbg==?=" y hay que traducirlos o se ven así
 * en la pantalla.
 *
 * @param string $texto
 * @return string
 */
function decodificarEncabezado($texto) {
    if (function_exists('mb_decode_mimeheader')) {
        return mb_decode_mimeheader($texto);
    }
    // Respaldo por si mbstring no estuviera: al menos no rompe.
    $decodificado = iconv_mime_decode($texto, 0, 'UTF-8');
    return $decodificado === false ? $texto : $decodificado;
}

/**
 * Saca el cuerpo legible de un mensaje.
 *
 * Un correo puede venir en texto plano, en HTML, o en varias partes a la
 * vez (multipart). Acá se busca la versión en texto; si solo hay HTML,
 * se le quitan las etiquetas.
 *
 * @param string $encabezados
 * @param string $cuerpo
 * @return string
 */
function decodificarCuerpo($encabezados, $cuerpo) {

    // ¿Viene partido en varios trozos?
    if (preg_match('/boundary="?([^"\s;]+)"?/i', $encabezados, $m)) {
        $separador = '--' . $m[1];
        $trozos    = explode($separador, $cuerpo);

        $mejorTexto = '';
        $mejorHtml  = '';

        foreach ($trozos as $trozo) {
            $partes = preg_split("/\r?\n\r?\n/", $trozo, 2);
            if (count($partes) < 2) continue;

            $cabecera = $partes[0];
            $contenido = desarmarCodificacion($cabecera, $partes[1]);

            if (stripos($cabecera, 'text/plain') !== false && $mejorTexto === '') {
                $mejorTexto = $contenido;
            } elseif (stripos($cabecera, 'text/html') !== false && $mejorHtml === '') {
                $mejorHtml = $contenido;
            }
        }

        // Se prefiere el texto plano: es más legible en un teléfono y no
        // arrastra estilos ni imágenes que no se van a poder mostrar.
        if ($mejorTexto !== '') return trim($mejorTexto);
        if ($mejorHtml !== '')  return trim(html_entity_decode(strip_tags($mejorHtml)));
        return '';
    }

    $contenido = desarmarCodificacion($encabezados, $cuerpo);

    if (stripos($encabezados, 'text/html') !== false) {
        return trim(html_entity_decode(strip_tags($contenido)));
    }
    return trim($contenido);
}

/**
 * Deshace la codificación de transporte de un trozo de correo.
 *
 * @param string $cabecera
 * @param string $contenido
 * @return string
 */
function desarmarCodificacion($cabecera, $contenido) {
    if (stripos($cabecera, 'base64') !== false) {
        return (string) base64_decode(preg_replace('/\s+/', '', $contenido));
    }
    if (stripos($cabecera, 'quoted-printable') !== false) {
        return quoted_printable_decode($contenido);
    }
    return $contenido;
}

/**
 * Saca la dirección de un campo tipo: Ania XV <info@aniaxv.com>
 *
 * @param string $campo
 * @return string
 */
function extraerCorreo($campo) {
    if (preg_match('/<([^>]+)>/', $campo, $m)) return trim($m[1]);
    if (filter_var(trim($campo), FILTER_VALIDATE_EMAIL)) return trim($campo);
    return '';
}
