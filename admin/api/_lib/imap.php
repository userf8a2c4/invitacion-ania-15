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


    /* ─── 2. CARPETAS Y LISTAR MENSAJES ─────────────────────────────────── */

    /**
     * Pone el nombre de una carpeta entre comillas, a prueba de que
     * traiga una comilla o una barra adentro.
     *
     * ⚠️ No convierte a UTF-7 modificado (lo que pide RFC 3501 para
     * nombres de carpeta con acentos o ñ). INBOX, Sent, Trash, Junk y
     * sus variantes en inglés —que es lo que trae Hostinger de
     * fábrica— son ASCII puro, así que alcanza. Una carpeta que alguien
     * haya renombrado con acentos podría no abrir bien.
     *
     * @param string $nombre
     * @return string
     */
    private function escaparCarpeta($nombre) {
        return '"' . addcslashes($nombre, '"\\') . '"';
    }

    /**
     * Entra a una carpeta. Deja el error puesto si no se pudo.
     *
     * @param string $carpeta
     * @return bool
     */
    private function entrarA($carpeta) {
        $r = $this->ordenar('SELECT ' . $this->escaparCarpeta($carpeta));
        if (!$this->salioBien($r)) {
            $this->error = 'No se pudo abrir esa carpeta.';
            return false;
        }
        return true;
    }

    /**
     * Devuelve las carpetas del buzón (Entrada, Enviados, Papelera…),
     * tal como las conoce el servidor.
     *
     * @return array[] Cada una: ['nombre' => string, 'atributos' => string[]]
     *   Los atributos son los que el servidor declare, ej. \Sent,
     *   \Trash, \Junk, \Drafts, \Noselect — no todos los servidores los
     *   marcan (RFC 6154 es opcional), así que puede venir vacío y hay
     *   que adivinar por el nombre (ver 12-vista-correo.js).
     */
    public function carpetas() {
        $lineas = $this->ordenar('LIST "" "*"');
        $carpetas = [];

        foreach ($lineas as $linea) {
            // * LIST (\HasNoChildren \Sent) "/" "Sent"
            if (!preg_match('/^\* LIST \(([^)]*)\)\s+"?([^"]*)"?\s+(.+)$/i', $linea, $m)) {
                continue;
            }

            $atributos = array_values(array_filter(explode(' ', trim($m[1]))));
            $nombre    = trim($m[3], "\"\r\n ");

            // \Noselect: existe como agrupador ("Trabajo/") pero no
            // guarda mensajes propios — no tiene sentido ofrecerla.
            if (in_array('\\Noselect', $atributos, true)) continue;
            if ($nombre === '') continue;

            $carpetas[] = ['nombre' => $nombre, 'atributos' => $atributos];
        }

        return $carpetas;
    }

    /**
     * Devuelve los mensajes más recientes de una carpeta.
     *
     * @param string $carpeta
     * @param int    $cuantos Cuántos traer, del más nuevo hacia atrás.
     * @return array[] Cada uno con uid, asunto, de, fecha, leido, marcado.
     */
    public function listar($carpeta = 'INBOX', $cuantos = 40) {
        $respuesta = $this->ordenar('SELECT ' . $this->escaparCarpeta($carpeta));
        if (!$this->salioBien($respuesta)) {
            $this->error = 'No se pudo abrir esa carpeta.';
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

        /* Se piden los últimos N POR NÚMERO DE SECUENCIA —eso solo dice
           "los N mensajes más nuevos de esta carpeta ahora mismo", que
           es justo lo que queremos—, pero se pide UID FETCH en vez de
           FETCH: la respuesta trae el UID de cada uno adentro (ver
           interpretarLista()), y ES ESE UID el identificador que se
           devuelve y se usa después para leer/marcar/borrar. El número
           de secuencia nunca sale de acá adentro. */
        $desde = max(1, $total - $cuantos + 1);

        $lineas = $this->ordenar(
            "UID FETCH $desde:$total (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])"
        );

        return $this->interpretarLista($lineas);
    }

    /**
     * Convierte la respuesta cruda del UID FETCH en una lista de
     * mensajes.
     *
     * @param string[] $lineas
     * @return array[]
     */
    private function interpretarLista($lineas) {
        $mensajes = [];
        $actual   = null;

        foreach ($lineas as $linea) {

            // "* 42 FETCH (UID 981 FLAGS (\Seen) BODY[HEADER.FIELDS ...]"
            if (preg_match('/^\* \d+ FETCH/i', $linea)) {
                if ($actual && $actual['uid'] > 0) $mensajes[] = $actual;

                $uid = 0;
                if (preg_match('/UID (\d+)/', $linea, $mu)) $uid = (int) $mu[1];

                $actual = [
                    'uid'    => $uid,
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

        if ($actual && $actual['uid'] > 0) $mensajes[] = $actual;

        // Del más nuevo al más viejo, que es como se espera ver un buzón.
        return array_reverse($mensajes);
    }


    /* ─── 3. LEER UN MENSAJE ──────────────────────────────────────────── */

    /**
     * Baja un mensaje entero y devuelve su texto.
     *
     * @param string $carpeta
     * @param int    $uid
     * @return array|null
     */
    public function leer($carpeta, $uid) {
        if (!$this->entrarA($carpeta)) return null;

        $lineas = $this->ordenar("UID FETCH $uid (BODY[])");
        if (empty($lineas)) return null;

        /* Si ese UID no existe en esta carpeta (se borró, o es de otra
           carpeta), el servidor contesta OK igual pero SIN ninguna línea
           "* n FETCH" — hay que distinguir eso de un mensaje que sí
           existe pero vino vacío. */
        $huboFetch = false;
        foreach ($lineas as $linea) {
            if (preg_match('/^\* \d+ FETCH/i', $linea)) { $huboFetch = true; break; }
        }
        if (!$huboFetch) return null;

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

        $analizado = analizarParteMime($encabezados, $cuerpoCrudo, '');

        $texto = $analizado['texto'] !== '' ? trim($analizado['texto'])
               : ($analizado['html'] !== '' ? trim(html_entity_decode(strip_tags($analizado['html']))) : '');

        // Marcar como leído, ahora que efectivamente se abrió.
        $this->ordenar("UID STORE $uid +FLAGS (\\Seen)");

        return [
            'uid'        => (int) $uid,
            'carpeta'    => $carpeta,
            'de'         => $de,
            'correo_de'  => extraerCorreo($responderA !== '' ? $responderA : $de),
            'asunto'     => $asunto,
            'fecha'      => $fecha,
            'texto'      => $texto,
            'adjuntos'   => $analizado['adjuntos'],
        ];
    }

    /**
     * Baja un adjunto concreto de un mensaje, ya decodificado.
     *
     * @param string $carpeta
     * @param int    $uid   El mensaje.
     * @param string $ruta  La ruta MIME que devolvió leer(), ej. "2" o "1.2".
     * @return array|null   ['nombre', 'tipo', 'datos'], o null si falló.
     */
    public function leerAdjunto($carpeta, $uid, $ruta) {
        if (!$this->entrarA($carpeta)) return null;

        // Los encabezados de esa parte sola, para saber cómo decodificarla.
        $cab = $this->cuerpoDeFetch(
            $this->ordenar("UID FETCH $uid (BODY.PEEK[$ruta.MIME])")
        );

        // El contenido crudo de esa parte sola, sin bajar el mensaje entero.
        $crudo = $this->cuerpoDeFetch(
            $this->ordenar("UID FETCH $uid (BODY.PEEK[$ruta])")
        );

        if ($crudo === null) return null;

        $tipo = 'application/octet-stream';
        if ($cab !== null && preg_match('/Content-Type:\s*([^;\r\n]+)/i', $cab, $m)) {
            $tipo = trim($m[1]);
        }

        $nombre = 'archivo';
        if ($cab !== null && preg_match('/filename\*?=\s*"?([^"\r\n;]+)"?/i', $cab, $m)) {
            $nombre = decodificarEncabezado(trim($m[1]));
        } elseif ($cab !== null && preg_match('/name="?([^"\r\n;]+)"?/i', $cab, $m)) {
            $nombre = decodificarEncabezado(trim($m[1]));
        }

        $codificacion = '';
        if ($cab !== null && preg_match('/Content-Transfer-Encoding:\s*([^\r\n;]+)/i', $cab, $m)) {
            $codificacion = strtolower(trim($m[1]));
        }

        $datos = desarmarCodificacion("Content-Transfer-Encoding: $codificacion", $crudo);

        return ['nombre' => $nombre, 'tipo' => $tipo, 'datos' => $datos];
    }

    /**
     * Saca el contenido de en medio de una respuesta FETCH, descartando
     * la línea "* N FETCH (...)" del principio y la etiqueta del final.
     *
     * @param string[] $lineas
     * @return string|null
     */
    private function cuerpoDeFetch($lineas) {
        if (empty($lineas)) return null;
        array_shift($lineas);
        array_pop($lineas);
        return implode("\n", $lineas);
    }


    /* ─── 3b. MARCAR Y BORRAR ─────────────────────────────────────────── */

    /**
     * Pone o quita la estrella de "importante".
     *
     * @param string $carpeta
     * @param int    $uid
     * @param bool   $marcar true pone la estrella, false la quita.
     * @return bool
     */
    public function marcar($carpeta, $uid, $marcar) {
        if (!$this->entrarA($carpeta)) return false;

        $signo = $marcar ? '+' : '-';
        $r = $this->ordenar("UID STORE $uid {$signo}FLAGS (\\Flagged)");

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
     * POR QUÉ TODO ESTO VA POR UID Y NO POR NÚMERO
     * COPY + STORE + EXPUNGE por número de secuencia era exactamente lo
     * peligroso que describe el Paso 4: EXPUNGE renumera todo lo que
     * viene después del mensaje borrado, así que si dos borrados se
     * dispararan casi juntos (dos pestañas, doble toque) el segundo
     * podía terminar borrando OTRO mensaje sin querer. Con UID eso no
     * puede pasar: el identificador no cambia nunca, borre lo que borre
     * antes.
     *
     * @param string $carpeta
     * @param int    $uid
     * @return bool
     */
    public function borrar($carpeta, $uid) {
        if (!$this->entrarA($carpeta)) return false;

        /* El nombre de la papelera cambia según el servidor y el idioma.
           Se prueban los más comunes y se usa el primero que acepte. */
        $copiado = false;
        foreach (['Trash', 'INBOX.Trash', 'Papelera', 'INBOX.Papelera',
                  'Deleted Items', 'Deleted Messages'] as $papelera) {
            if ($this->salioBien($this->ordenar('UID COPY ' . $uid . ' ' . $this->escaparCarpeta($papelera)))) {
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

        $this->ordenar("UID STORE $uid +FLAGS (\\Deleted)");

        /* EXPUNGE (sin UID) elimina TODO lo marcado \Deleted en la
           carpeta actual, no solo este mensaje — pero acá adentro nunca
           se deja un \Deleted puesto en nadie más, así que en la
           práctica solo se va este. Se evita UID EXPUNGE (el comando
           "de verdad" selectivo) porque necesita la extensión UIDPLUS,
           que no todos los servidores declaran, y falla feo si no está. */
        $r = $this->ordenar('EXPUNGE');

        return $this->salioBien($r);
    }

    /**
     * Marca un mensaje como no leído.
     *
     * @param string $carpeta
     * @param int    $uid
     * @return bool
     */
    public function marcarNoLeido($carpeta, $uid) {
        if (!$this->entrarA($carpeta)) return false;
        return $this->salioBien($this->ordenar("UID STORE $uid -FLAGS (\\Seen)"));
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
 * Recorre el árbol MIME completo de un mensaje (o de una parte suya) y
 * junta el texto legible y la lista de adjuntos que encuentra.
 *
 * POR QUÉ HACÍA FALTA
 * La versión anterior solo miraba UN nivel de "boundary". Un correo con
 * adjunto casi siempre viene anidado: un multipart/mixed (el mensaje y
 * el adjunto) que adentro tiene un multipart/alternative (texto plano y
 * HTML del mensaje). A ese primer nivel no hay texto ni HTML directo, así
 * que la versión vieja no encontraba nada y mostraba el MIME crudo — el
 * "código" que se veía en vez del correo.
 *
 * Esta versión se llama a sí misma: cada vez que encuentra un
 * "multipart/…" baja un nivel más, hasta llegar a las partes de verdad.
 * De paso arma la ruta de cada parte tal como IMAP la numera (1, 2, 1.1,
 * 1.2…), que es lo que hace falta para poder pedir un adjunto suelto con
 * FETCH BODY[esa-ruta] sin tener que bajar el mensaje entero.
 *
 * @param string $cabecera Los encabezados de ESTA parte (o del mensaje).
 * @param string $contenido El contenido crudo de esta parte.
 * @param string $ruta La ruta MIME acumulada hasta acá ('' en la raíz).
 * @return array ['texto' => string, 'html' => string, 'adjuntos' => array[]]
 */
function analizarParteMime($cabecera, $contenido, $ruta) {
    $tipo = '';
    if (preg_match('/Content-Type:\s*([^;\r\n]+)/i', $cabecera, $m)) {
        $tipo = strtolower(trim($m[1]));
    }

    /* ─── ES UN CONTENEDOR: bajar un nivel más ─────────────────────── */
    if (strpos($tipo, 'multipart/') === 0) {
        if (!preg_match('/boundary="?([^"\s;]+)"?/i', $cabecera, $mb)) {
            return ['texto' => '', 'html' => '', 'adjuntos' => []];
        }
        $separador = '--' . $mb[1];
        $trozos    = explode($separador, $contenido);

        $texto = '';
        $html  = '';
        $adjuntos = [];
        $indice = 0;

        foreach ($trozos as $trozo) {
            $trozo = ltrim($trozo, "\r\n");

            // El pedazo antes del primer boundary, y el "--" final que
            // cierra el multipart, no son partes: se saltan.
            if ($trozo === '' || strpos($trozo, '--') === 0) continue;

            $partes = preg_split("/\r?\n\r?\n/", $trozo, 2);
            if (count($partes) < 2) continue;

            $indice++;
            $subRuta = ($ruta === '') ? (string) $indice : "$ruta.$indice";

            $sub = analizarParteMime($partes[0], $partes[1], $subRuta);

            if ($texto === '') $texto = $sub['texto'];
            if ($html === '')  $html  = $sub['html'];
            $adjuntos = array_merge($adjuntos, $sub['adjuntos']);
        }

        return ['texto' => $texto, 'html' => $html, 'adjuntos' => $adjuntos];
    }

    /* ─── ES UNA HOJA: texto del mensaje o adjunto ─────────────────── */
    $nombre = '';
    if (preg_match('/filename\*?=\s*"?([^"\r\n;]+)"?/i', $cabecera, $mf)) {
        $nombre = decodificarEncabezado(trim($mf[1]));
    } elseif (preg_match('/[^-]name="?([^"\r\n;]+)"?/i', $cabecera, $mn)) {
        $nombre = decodificarEncabezado(trim($mn[1]));
    }

    $esAdjunto = $nombre !== ''
        || preg_match('/Content-Disposition:\s*attachment/i', $cabecera)
        || (!in_array($tipo, ['text/plain', 'text/html'], true) && $tipo !== '');

    if (!$esAdjunto) {
        $decodificado = aTextoUtf8($cabecera, desarmarCodificacion($cabecera, $contenido));

        if ($tipo === 'text/html') {
            return ['texto' => '', 'html' => $decodificado, 'adjuntos' => []];
        }
        // Sin Content-Type declarado, se asume texto plano.
        return ['texto' => $decodificado, 'html' => '', 'adjuntos' => []];
    }

    if ($nombre === '') $nombre = '(sin nombre)';
    if ($ruta === '') $ruta = '1';   // mensaje de una sola parte con adjunto raro

    $codificacion = '';
    if (preg_match('/Content-Transfer-Encoding:\s*([^\r\n;]+)/i', $cabecera, $mc)) {
        $codificacion = strtolower(trim($mc[1]));
    }

    return [
        'texto' => '', 'html' => '',
        'adjuntos' => [[
            'ruta'   => $ruta,
            'nombre' => $nombre,
            'tipo'   => $tipo !== '' ? $tipo : 'application/octet-stream',
            // Base64 pesa 4/3 del archivo real; es una estimación, no hace
            // falta exacta porque solo se muestra como referencia.
            'tamano' => ($codificacion === 'base64')
                ? (int) round(strlen($contenido) * 3 / 4)
                : strlen($contenido),
        ]],
    ];
}

/**
 * Convierte el texto de una parte a UTF-8 según su charset declarado.
 *
 * Antes esto se ignoraba por completo, y de ahí salían los acentos rotos
 * en correos que no venían en UTF-8 (Outlook y varios webmails todavía
 * mandan ISO-8859-1 / Windows-1252 en texto plano).
 *
 * @param string $cabecera
 * @param string $texto
 * @return string
 */
function aTextoUtf8($cabecera, $texto) {
    $charset = 'UTF-8';
    if (preg_match('/charset="?([^"\r\n;]+)"?/i', $cabecera, $m)) {
        $charset = trim($m[1]);
    }

    if (strcasecmp($charset, 'UTF-8') === 0 || strcasecmp($charset, 'US-ASCII') === 0) {
        return $texto;
    }

    $convertido = @iconv($charset, 'UTF-8//IGNORE', $texto);
    return $convertido !== false ? $convertido : $texto;
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
