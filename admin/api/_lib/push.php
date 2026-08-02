<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/PUSH.PHP · AVISOS AL TELÉFONO

   QUÉ HACE ESTE ARCHIVO
   Manda notificaciones al teléfono aunque la app esté cerrada. Se usa
   para avisar de pagos que vencen y fechas que se acercan.

   CÓMO FUNCIONA UNA NOTIFICACIÓN WEB, EN CORTO
   El teléfono no se conecta a nuestro servidor esperando avisos. Al
   revés: cuando la persona acepta recibirlos, su navegador le pide a
   Google (o Apple) una dirección única y nos la entrega. Para avisar,
   nuestro servidor le manda un mensaje a ESA dirección, y Google se lo
   entrega al teléfono. Nosotros nunca hablamos con el teléfono directo.

   QUÉ ES VAPID Y POR QUÉ HACE FALTA
   Si cualquiera pudiera mandar mensajes a esas direcciones, sería un
   desastre de spam. Por eso hay que firmar cada envío con una llave
   privada, y el navegador comprueba la firma con la pública. Ese par de
   llaves es VAPID. Se generan UNA vez, solas, y quedan en la base.

   POR QUÉ LOS AVISOS VAN SIN CONTENIDO
   Mandar texto dentro de la notificación obliga a cifrarlo con un
   esquema (AES128GCM sobre ECDH) que son cientos de líneas de
   criptografía muy fácil de romper sin darse cuenta. Acá se manda el
   aviso VACÍO: eso despierta al Service Worker, que entonces le pregunta
   al servidor qué hay pendiente y arma el texto. Mismo resultado, sin
   criptografía frágil de por medio.

   ÍNDICE
     1. Las llaves VAPID
     2. Firmar el token
     3. Mandar el aviso
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';


/* ─── 1. LAS LLAVES VAPID ─────────────────────────────────────────────── */

/**
 * Devuelve el par de llaves, generándolo la primera vez.
 *
 * Se guardan en la tabla `ajustes` y no en el .env porque ese archivo
 * está en .gitignore y nunca llega al servidor por despliegue.
 *
 * @return array|null ['publica' => …, 'privada' => …] o null si el
 *                    servidor no tiene OpenSSL con curvas elípticas.
 */
function llavesVapid() {
    static $llaves = null;
    if ($llaves !== null) return $llaves;

    $guardadas = consultarUno(
        "SELECT valor FROM ajustes WHERE clave = 'vapid'"
    );

    if ($guardadas && $guardadas['valor']) {
        $decodificadas = json_decode($guardadas['valor'], true);
        if (is_array($decodificadas) && !empty($decodificadas['privada'])) {
            return $llaves = $decodificadas;
        }
    }

    // Primera vez: se genera el par.
    $nuevas = generarLlavesVapid();
    if (!$nuevas) return null;

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('vapid', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [':v' => json_encode($nuevas), ':v2' => json_encode($nuevas)]
    );

    return $llaves = $nuevas;
}

/**
 * Crea un par de llaves nuevo sobre la curva P-256.
 *
 * @return array|null
 */
function generarLlavesVapid() {
    if (!function_exists('openssl_pkey_new')) return null;

    $recurso = @openssl_pkey_new([
        'curve_name'       => 'prime256v1',   // así se llama P-256 en OpenSSL
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if (!$recurso) return null;

    $detalles = openssl_pkey_get_details($recurso);
    if (empty($detalles['ec']['d'])) return null;

    /* La llave pública en formato "sin comprimir": un byte 0x04 y después
       las coordenadas X e Y de 32 bytes cada una. Es el formato que
       espera el navegador. */
    $publicaCruda = "\x04"
        . str_pad($detalles['ec']['x'], 32, "\0", STR_PAD_LEFT)
        . str_pad($detalles['ec']['y'], 32, "\0", STR_PAD_LEFT);

    $privadaCruda = str_pad($detalles['ec']['d'], 32, "\0", STR_PAD_LEFT);

    // Se guarda también el PEM, que es lo que necesita openssl_sign.
    openssl_pkey_export($recurso, $pem);

    return [
        'publica' => base64UrlCodificar($publicaCruda),
        'privada' => base64UrlCodificar($privadaCruda),
        'pem'     => $pem,
    ];
}

/**
 * La llave pública, que es la única que ve el navegador.
 *
 * @return string|null
 */
function llavePublicaVapid() {
    $llaves = llavesVapid();
    return $llaves ? $llaves['publica'] : null;
}


/* ─── 2. FIRMAR EL TOKEN ──────────────────────────────────────────────── */

/**
 * Codifica en base64 "para URL": sin +, sin / y sin = al final.
 *
 * Es el formato que usan los tokens JWT y las llaves de push. Un + o un
 * / dentro de una URL significan otra cosa, por eso se reemplazan.
 *
 * @param string $datos
 * @return string
 */
function base64UrlCodificar($datos) {
    return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
}

/**
 * Arma el token firmado que autoriza un envío.
 *
 * Es un JWT: tres partes separadas por puntos. Las dos primeras dicen
 * quién manda y para qué servidor; la tercera es la firma que prueba que
 * tenemos la llave privada.
 *
 * @param string $endpoint La dirección a la que se va a mandar.
 * @return string|null
 */
function tokenVapid($endpoint) {
    $llaves = llavesVapid();
    if (!$llaves || empty($llaves['pem'])) return null;

    // El "audience" es solo el origen del endpoint, sin la ruta.
    $partes = parse_url($endpoint);
    if (empty($partes['scheme']) || empty($partes['host'])) return null;
    $audiencia = $partes['scheme'] . '://' . $partes['host'];

    $cabecera = base64UrlCodificar(json_encode([
        'typ' => 'JWT',
        'alg' => 'ES256',
    ]));

    $cuerpo = base64UrlCodificar(json_encode([
        'aud' => $audiencia,
        // Vence en 12 horas. El máximo que acepta el estándar es 24.
        'exp' => time() + 43200,
        'sub' => 'mailto:' . env('CORREO_REMITENTE', 'info@aniaxv.com'),
    ]));

    $porFirmar = $cabecera . '.' . $cuerpo;

    $clave = openssl_pkey_get_private($llaves['pem']);
    if (!$clave) return null;

    if (!openssl_sign($porFirmar, $firmaDer, $clave, OPENSSL_ALGO_SHA256)) {
        return null;
    }

    $firmaCruda = firmaDerARaw($firmaDer);
    if ($firmaCruda === null) return null;

    return $porFirmar . '.' . base64UrlCodificar($firmaCruda);
}

/**
 * Convierte la firma que devuelve OpenSSL al formato que pide JWT.
 *
 * OpenSSL firma en formato DER, que es una estructura con etiquetas y
 * longitudes. El estándar JWT quiere los dos números R y S pelados, de
 * 32 bytes cada uno. Esta función los extrae.
 *
 * Sin esta traducción el navegador rechaza la firma por inválida, y el
 * error que devuelve no dice por qué.
 *
 * @param string $der
 * @return string|null 64 bytes, o null si el DER no se entendió.
 */
function firmaDerARaw($der) {
    $posicion = 0;

    // La estructura empieza con 0x30 (secuencia) y su longitud.
    if (strlen($der) < 8 || ord($der[$posicion++]) !== 0x30) return null;

    $largo = ord($der[$posicion++]);
    // Si el bit alto está encendido, la longitud ocupa varios bytes.
    if ($largo & 0x80) {
        $cuantos = $largo & 0x7f;
        $posicion += $cuantos;
    }

    /* Lee un entero de la estructura: 0x02, su longitud, y los bytes. */
    $leerEntero = function () use ($der, &$posicion) {
        if ($posicion >= strlen($der) || ord($der[$posicion++]) !== 0x02) return null;

        $largo  = ord($der[$posicion++]);
        $numero = substr($der, $posicion, $largo);
        $posicion += $largo;

        /* DER agrega un 0x00 adelante cuando el primer bit es 1, para que
           no se lea como número negativo. Ese cero sobra acá. */
        $numero = ltrim($numero, "\0");

        // Y se rellena a 32 bytes exactos, que es lo que pide P-256.
        return str_pad($numero, 32, "\0", STR_PAD_LEFT);
    };

    $r = $leerEntero();
    $s = $leerEntero();

    if ($r === null || $s === null) return null;
    return $r . $s;
}


/* ─── 3. MANDAR EL AVISO ──────────────────────────────────────────────── */

/**
 * Manda un aviso vacío a una suscripción.
 *
 * El aviso no lleva texto: solo despierta al Service Worker del
 * teléfono, que después le pregunta al servidor qué mostrar.
 *
 * @param array $suscripcion Fila de la tabla suscripciones_push.
 * @return array ['ok' => bool, 'codigo' => int, 'error' => string]
 */
function mandarAviso($suscripcion) {
    $endpoint = (string) ($suscripcion['endpoint'] ?? '');
    if ($endpoint === '') {
        return ['ok' => false, 'codigo' => 0, 'error' => 'Sin dirección'];
    }

    $token = tokenVapid($endpoint);
    $llaves = llavesVapid();

    if (!$token || !$llaves) {
        return ['ok' => false, 'codigo' => 0,
                'error' => 'El servidor no puede firmar avisos (falta OpenSSL con P-256).'];
    }

    if (!function_exists('curl_init')) {
        return ['ok' => false, 'codigo' => 0, 'error' => 'Falta la extensión cURL.'];
    }

    $curl = curl_init($endpoint);
    curl_setopt_array($curl, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            // Así se declara un aviso sin contenido.
            'Content-Length: 0',
            // Cuánto lo guarda el servidor si el teléfono está apagado.
            'TTL: 86400',
            // La firma que prueba que el envío es nuestro.
            'Authorization: vapid t=' . $token . ', k=' . $llaves['publica'],
        ],
        // El cuerpo va vacío a propósito.
        CURLOPT_POSTFIELDS     => '',
    ]);

    $respuesta = curl_exec($curl);
    $codigo    = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $errorCurl = curl_error($curl);
    curl_close($curl);

    // 201 y 200 son "aceptado". 202 también en algunos servidores.
    $salioBien = in_array($codigo, [200, 201, 202], true);

    return [
        'ok'     => $salioBien,
        'codigo' => $codigo,
        'error'  => $salioBien ? '' : ($errorCurl ?: 'El servidor de avisos respondió ' . $codigo),
        // 404 y 410 significan que esa suscripción ya no existe: el
        // teléfono desinstaló la app o revocó el permiso. Hay que
        // borrarla o se reintentaría todos los días para siempre.
        'caduca' => in_array($codigo, [404, 410], true),
    ];
}

/**
 * Manda el aviso a todos los teléfonos suscritos.
 *
 * @return array ['enviados' => int, 'fallidos' => int, 'borradas' => int]
 */
function avisarATodos() {
    if (!existeTabla('suscripciones_push')) {
        return ['enviados' => 0, 'fallidos' => 0, 'borradas' => 0];
    }

    $suscripciones = consultarTodo('SELECT * FROM suscripciones_push');

    $enviados = 0;
    $fallidos = 0;
    $borradas = 0;

    foreach ($suscripciones as $suscripcion) {
        $resultado = mandarAviso($suscripcion);

        if ($resultado['ok']) {
            $enviados++;
        } else {
            $fallidos++;
            error_log('[Ania XV · push] ' . $resultado['error']);

            if (!empty($resultado['caduca'])) {
                borrar('suscripciones_push', (int) $suscripcion['id']);
                $borradas++;
            }
        }
    }

    return ['enviados' => $enviados, 'fallidos' => $fallidos, 'borradas' => $borradas];
}
