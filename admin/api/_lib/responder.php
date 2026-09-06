<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/RESPONDER.PHP · RESPUESTAS JSON Y ERRORES

   QUÉ HACE ESTE ARCHIVO
   Todo el panel habla con el servidor en JSON. Este archivo se encarga
   de que TODAS las respuestas tengan la misma forma, para que el código
   del teléfono no tenga que adivinar qué le llegó.

   LA FORMA ES SIEMPRE ESTA
     Bien:  { "ok": true,  "datos": ... }
     Mal:   { "ok": false, "error": "texto para mostrarle a la persona" }

   POR QUÉ IMPORTA QUE SEA SIEMPRE IGUAL
   Sin esto, cada endpoint inventa su propio formato y la app termina
   llena de "si viene esto, pero a veces viene esto otro". Con una sola
   forma, el frontend tiene UNA función que entiende todas las respuestas.

   POR QUÉ LOS ERRORES NO CUENTAN DETALLES
   Un mensaje como "Table 'gastos' doesn't exist" le dice a un atacante
   cómo está armada la base de datos. Al navegador le va un texto humano
   y neutro; el detalle técnico va al log del servidor, donde solo lo ve
   quien entra por hPanel.
   ══════════════════════════════════════════════════════════════════════ */

/* ─── CABECERAS COMUNES ───────────────────────────────────────────────── */

/**
 * Prepara la respuesta como JSON y bloquea el cacheo.
 *
 * El "no-store" es importante de verdad: sin él, el Service Worker o el
 * propio navegador podrían guardar la lista de invitados y mostrarla
 * desactualizada aunque la base de datos ya haya cambiado.
 *
 * @return void
 */
function cabecerasJson() {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Content-Type-Options: nosniff');
}

/* ─── RESPUESTAS ──────────────────────────────────────────────────────── */

/**
 * Responde bien y termina la ejecución.
 *
 * @param mixed $datos  Lo que se le manda a la app.
 * @param int   $codigo Código HTTP (200 normal, 201 si se creó algo).
 * @return void
 */
function responderBien($datos = null, $codigo = 200) {
    cabecerasJson();
    http_response_code($codigo);

    $json = json_encode(['ok' => true, 'datos' => $datos], JSON_UNESCAPED_UNICODE);

    /* Si este envío traía clave, se anota junto con lo que se contestó.
       Un reintento del mismo cambio va a recibir esto mismo sin volver a
       ejecutar nada. Solo se guardan las respuestas BUENAS: si algo
       falló, reintentarlo es lo correcto. */
    if (!empty($GLOBALS['CLAVE_DE_ESTE_ENVIO']) && function_exists('guardarRespuestaDada')) {
        guardarRespuestaDada($GLOBALS['CLAVE_DE_ESTE_ENVIO'], $json);
    }

    echo $json;
    exit;
}

/**
 * Dice si este PHP sabe devolver la respuesta y seguir trabajando con la
 * conexión ya cerrada.
 *
 * Se pregunta con function_exists y no se asume: llamar a una función
 * que no existe es un error fatal, no un aviso, y acá no hay PHP local
 * donde comprobarlo antes de subir.
 *
 * @return bool
 */
function sePuedeCerrarLaConexion() {
    return function_exists('litespeed_finish_request')
        || function_exists('fastcgi_finish_request');
}

/**
 * Contesta AHORA y deja el script corriendo para lo que falte.
 *
 * PARA QUÉ SIRVE
 * Para el trabajo que hay que hacer sí o sí pero que a quien preguntó no
 * le aporta esperar: mandar un webhook, avisar por correo. Sin esto, el
 * navegador se queda con la rueda girando mientras el servidor habla con
 * un tercero que no tiene nada que ver con lo que se pidió.
 *
 * ⚠️ COMPROBAR sePuedeCerrarLaConexion() ANTES DE LLAMARLA.
 * Si el servidor no sabe cerrar, esta función igual escribe la respuesta
 * —pero el navegador no la va a ver hasta que el script termine—, así
 * que ahí conviene hacer el trabajo primero y contestar al final, como
 * siempre. Quien la usa decide, porque solo quien la usa sabe si lo que
 * queda por hacer cambia la respuesta.
 *
 * NO HACE exit, a diferencia de responderBien(): el sentido de esto es
 * justamente lo que viene después. Quien la llama termina cuando quiera.
 *
 * @param mixed $datos  Lo que se le manda a la app.
 * @param int   $codigo Código HTTP.
 * @return void
 */
function responderYSeguirTrabajando($datos = null, $codigo = 200) {
    cabecerasJson();
    http_response_code($codigo);

    $json = json_encode(['ok' => true, 'datos' => $datos], JSON_UNESCAPED_UNICODE);

    // Mismo freno a duplicados que responderBien(): un reintento con la
    // misma clave recibe esto sin volver a ejecutar el endpoint.
    if (!empty($GLOBALS['CLAVE_DE_ESTE_ENVIO']) && function_exists('guardarRespuestaDada')) {
        guardarRespuestaDada($GLOBALS['CLAVE_DE_ESTE_ENVIO'], $json);
    }

    /* ⚠️ NADA DE Content-Length ACÁ, Y ES A PROPÓSITO.
       Tentaba ponerlo "para que el navegador sepa cuándo terminó", pero
       el .htaccess de la raíz comprime application/json con DEFLATE y
       BROTLI: el cuerpo que sale por el cable NO mide lo que mide este
       string. Un Content-Length equivocado corta la respuesta a la
       mitad o deja al cliente esperando bytes que no llegan nunca.
       Cerrar la conexión es justo el trabajo de finish_request. */
    echo $json;

    /* Que colgar el teléfono no mate lo que falta. Es lo que permite
       terminar el trabajo aunque quien preguntó cierre la pestaña. */
    @ignore_user_abort(true);

    // Los buffers que haya abierto PHP o la app, antes de cerrar.
    while (ob_get_level() > 0) @ob_end_flush();
    @flush();

    if (function_exists('litespeed_finish_request'))   litespeed_finish_request();
    elseif (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
}

/**
 * Responde con error y termina la ejecución.
 *
 * @param string      $mensaje  Texto para mostrarle a la persona.
 * @param int         $codigo   400 dato inválido, 401 sin sesión,
 *                              403 sin permiso, 404 no existe, 500 falla.
 * @param string|null $detalle  Detalle técnico: va al log, no al navegador.
 * @return void
 */
function responderMal($mensaje, $codigo = 400, $detalle = null) {
    if ($detalle !== null) {
        error_log("[Ania XV · admin] $codigo · $mensaje · $detalle");
    }
    cabecerasJson();
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ─── ENTRADA ─────────────────────────────────────────────────────────── */

/**
 * Lee el cuerpo JSON de la petición.
 *
 * @param bool $obligatorio Si es true, corta con 400 cuando no hay JSON.
 * @return array
 */
function cuerpoJson($obligatorio = true) {
    $crudo  = file_get_contents('php://input');
    $datos  = json_decode($crudo, true);

    if (!is_array($datos)) {
        if ($obligatorio) responderMal('No se recibieron datos válidos.', 400);
        return [];
    }

    /* ─── EL FRENO A LOS DUPLICADOS ───────────────────────────────────
     *
     * Va acá, y no en cada endpoint, porque TODOS los que guardan algo
     * llaman a esta función antes de tocar nada. Un solo control acá
     * protege al panel entero, y ninguno se puede olvidar de ponerlo.
     *
     * Si el envío trae una clave que ya se atendió, se devuelve la misma
     * respuesta de aquella vez y no se ejecuta ni una línea más del
     * endpoint. Para quien llama es indistinguible de haber funcionado
     * —porque de hecho funcionó, la primera vez—. */
    $clave = trim((string) ($datos['_clave'] ?? ''));

    if ($clave !== '' && function_exists('respuestaYaDada')) {
        $anterior = respuestaYaDada($clave);
        if ($anterior !== null) {
            cabecerasJson();
            http_response_code(200);
            echo $anterior;
            exit;
        }
        // Se recuerda para que responderBien() la anote al terminar.
        $GLOBALS['CLAVE_DE_ESTE_ENVIO'] = $clave;
    }

    /* La clave es cosa del transporte, no un dato del formulario: se
       saca antes de que el endpoint la vea y trate de guardarla como si
       fuera una columna. */
    unset($datos['_clave']);

    return $datos;
}

/**
 * Exige que la petición venga por un método concreto.
 *
 * Sin esto, un GET podría llegar a un endpoint que borra cosas — y los
 * GET se pueden disparar desde una simple etiqueta <img> en otra web.
 *
 * @param string|string[] $metodos 'POST' o ['GET','POST'].
 * @return string El método que se usó.
 */
function exigirMetodo($metodos) {
    $metodos = (array) $metodos;
    $actual  = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // El navegador manda OPTIONS antes de algunas peticiones. Se contesta
    // en seco, sin ejecutar el resto del endpoint.
    if ($actual === 'OPTIONS') { http_response_code(204); exit; }

    if (!in_array($actual, $metodos, true)) {
        responderMal('Método no permitido.', 405);
    }
    return $actual;
}

/* ─── AYUDAS PARA LEER CAMPOS ─────────────────────────────────────────── */

/**
 * Saca un texto de un arreglo, recortado y con largo máximo.
 *
 * A diferencia de confirmar.php, acá NO se aplica htmlspecialchars: el
 * dato se guarda crudo y es la app la que escapa al pintarlo en pantalla.
 * Escapar al guardar hace que un nombre como "Peña & Co." termine
 * almacenado como "Peña &amp; Co." y se vea mal para siempre.
 *
 * @param array  $origen
 * @param string $clave
 * @param int    $largoMaximo
 * @param string $respaldo
 * @return string
 */
function campoTexto($origen, $clave, $largoMaximo = 255, $respaldo = '') {
    $valor = trim((string) ($origen[$clave] ?? $respaldo));
    return mb_substr($valor, 0, $largoMaximo, 'UTF-8');
}

/**
 * Saca un número entero, acotado entre un mínimo y un máximo.
 *
 * @param array    $origen
 * @param string   $clave
 * @param int      $minimo
 * @param int|null $maximo
 * @param int      $respaldo
 * @return int
 */
function campoEntero($origen, $clave, $minimo = 0, $maximo = null, $respaldo = 0) {
    $valor = (int) ($origen[$clave] ?? $respaldo);
    if ($valor < $minimo) $valor = $minimo;
    if ($maximo !== null && $valor > $maximo) $valor = $maximo;
    return $valor;
}

/**
 * Saca un monto de dinero, interpretando el separador decimal.
 *
 * ⚡ ANTES ESTO GUARDABA MAL EL DINERO, EN SILENCIO (2026-09-03)
 * La versión vieja borraba todo lo que no fuera dígito, punto o guion y
 * hacía un cast de PHP, que corta en el primer token inválido sin
 * avisar. Con formato local —el que sale de cualquier hoja de cálculo
 * en español— el resultado era una milésima del valor:
 *
 *     "$1,500.50"  → 1500.50  ✓
 *     "1.500,50"   → "1.500.50" → 1.5    ✗  mil quinientos → un peso
 *     "1.234.567"  → "1.234.567" → 1.234 ✗
 *     "12-3"       → "12-3" → 12         ✗
 *
 * Entraba por los nueve formularios de dinero del panel y ninguna capa
 * lo detectaba: el número quedaba guardado, mal, y desde ese momento
 * todas las sumas eran otra cosa.
 *
 * CÓMO SE DECIDE AHORA
 *   · Con coma Y punto, manda el ÚLTIMO: es el decimal, y el otro es de
 *     miles. Cubre "1,500.50" y "1.500,50" a la vez.
 *   · Con un solo tipo de separador, decide el tamaño del último grupo:
 *     tres dígitos son miles ("1.500" → 1500), otra cantidad es decimal
 *     ("1.5" → 1.5, "1,50" → 1.50).
 *   · El signo solo cuenta al principio.
 *
 * LO AMBIGUO SE RECHAZA, NO SE ADIVINA
 * "1.500" con tres dígitos podría ser mil quinientos o uno con
 * quinientas milésimas. Se resuelve como miles porque es lo que escribe
 * una persona, pero cuando ni eso alcanza —varios separadores mezclados
 * sin patrón, letras en medio del número— devuelve `null` y quien llama
 * corta con un error visible. En dinero, adivinar mal y callarse es
 * peor que preguntar.
 *
 * @param array  $origen
 * @param string $clave
 * @param bool   $exigir  Si true, un valor imposible de interpretar
 *   corta con responderMal() en vez de devolver 0.
 * @return float
 */
function campoMonto($origen, $clave, $exigir = true) {
    $crudo = trim((string) ($origen[$clave] ?? ''));
    if ($crudo === '') return 0.0;

    $monto = interpretarMonto($crudo);

    if ($monto === null) {
        if ($exigir) {
            responderMal(
                'No entiendo el monto «' . $crudo . '». Escríbelo con números, ' .
                'por ejemplo 1500.50 o 1,500.50',
                400
            );
        }
        return 0.0;
    }

    return $monto;
}

/**
 * Interpreta un monto escrito por una persona. Ver campoMonto().
 *
 * Está separada para poder probarla sola y para que la revisión de
 * montos ya guardados pueda usar la misma regla.
 *
 * @param string $crudo
 * @return float|null null si no se puede interpretar sin adivinar.
 */
function interpretarMonto($crudo) {
    $texto = trim((string) $crudo);
    if ($texto === '') return null;

    // El signo, solo al principio. Un guion en el medio ("12-3") no es
    // un número: cae al rechazo de más abajo.
    $negativo = (strpos($texto, '-') === 0);
    $texto = ltrim($texto, '+-');

    // Fuera símbolos de moneda y espacios (incluido el fino de los
    // miles: "1 500,50").
    $texto = preg_replace('/[\s\x{00A0}\x{202F}$€£¥]|MXN|USD|MX\$/iu', '', $texto);

    // Lo que queda solo puede ser dígitos, puntos y comas.
    if ($texto === '' || !preg_match('/^[0-9.,]+$/', $texto)) return null;

    $ultimoPunto = strrpos($texto, '.');
    $ultimaComa  = strrpos($texto, ',');

    if ($ultimoPunto !== false && $ultimaComa !== false) {
        // Los dos: el que está más a la derecha es el decimal.
        $corte = max($ultimoPunto, $ultimaComa);
        $entera   = preg_replace('/\D/', '', substr($texto, 0, $corte));
        $decimal  = preg_replace('/\D/', '', substr($texto, $corte + 1));
    } elseif ($ultimoPunto !== false || $ultimaComa !== false) {
        $corte = ($ultimoPunto !== false) ? $ultimoPunto : $ultimaComa;
        $cola  = substr($texto, $corte + 1);

        /* Un solo tipo de separador. Tres dígitos después del último y
           sin decimales previos es agrupación de miles ("1.500",
           "1.234.567"); cualquier otra cantidad es la parte decimal
           ("1.5", "1,50", "1500.505"). */
        $esMiles = (strlen($cola) === 3 && preg_match('/^\d{3}$/', $cola));

        if ($esMiles) {
            $entera  = preg_replace('/\D/', '', $texto);
            $decimal = '';
        } else {
            $entera  = preg_replace('/\D/', '', substr($texto, 0, $corte));
            $decimal = preg_replace('/\D/', '', $cola);
        }
    } else {
        $entera  = $texto;
        $decimal = '';
    }

    if ($entera === '' && $decimal === '') return null;

    // Más de dos decimales no es un monto: es un separador mal leído.
    if (strlen($decimal) > 2) return null;

    $valor = (float) (($entera === '' ? '0' : $entera) . '.' .
                      str_pad($decimal, 2, '0'));

    return round($negativo ? -$valor : $valor, 2);
}

/**
 * Saca una fecha en formato AAAA-MM-DD, o null si no es válida.
 *
 * @param array  $origen
 * @param string $clave
 * @return string|null
 */
function campoFecha($origen, $clave) {
    $valor = trim((string) ($origen[$clave] ?? ''));
    if ($valor === '') return null;

    $fecha = DateTime::createFromFormat('Y-m-d', substr($valor, 0, 10));
    return $fecha ? $fecha->format('Y-m-d') : null;
}

/**
 * Saca un valor que solo puede ser uno de una lista cerrada.
 *
 * Se usa para columnas de estado ("pendiente", "pagado"…), donde aceptar
 * cualquier texto ensuciaría la base con variantes tipo "Pagado" y
 * "pagado " que después no coinciden al filtrar.
 *
 * @param array    $origen
 * @param string   $clave
 * @param string[] $permitidos
 * @param string   $respaldo
 * @return string
 */
function campoOpcion($origen, $clave, $permitidos, $respaldo) {
    $valor = trim((string) ($origen[$clave] ?? ''));
    return in_array($valor, $permitidos, true) ? $valor : $respaldo;
}

/**
 * Saca una lista de ítems de "qué incluye" ({id, texto, hecho}) y la
 * deja lista para guardar como JSON en una columna TEXT.
 *
 * Se limpia acá y no solo en el teléfono porque el teléfono es de quien
 * escribe, no de quien lee: sin este límite, cualquiera que hable
 * directo con la API podría guardar un array gigante o con ítems de
 * texto larguísimo.
 *
 * @param array  $origen
 * @param string $clave
 * @return string|null JSON de la lista, o null si quedó vacía (para no
 *                      guardar "[]" de más y poder distinguir "sin
 *                      ítems" de "todavía no se migró" al leer).
 */
function campoListaDeDetalle($origen, $clave) {
    $crudo = $origen[$clave] ?? [];
    if (!is_array($crudo)) return null;

    $limpio = [];
    foreach ($crudo as $item) {
        if (!is_array($item)) continue;

        $texto = trim(mb_substr((string) ($item['texto'] ?? ''), 0, 200, 'UTF-8'));
        if ($texto === '') continue;

        $limpio[] = [
            'id'    => (string) mb_substr((string) ($item['id'] ?? ''), 0, 40, 'UTF-8'),
            'texto' => $texto,
            'hecho' => !empty($item['hecho']),
        ];

        // 60 ítems alcanza de sobra para cualquier "qué incluye" real;
        // más que eso ya no es una lista, es otra cosa.
        if (count($limpio) >= 60) break;
    }

    return $limpio ? json_encode($limpio, JSON_UNESCAPED_UNICODE) : null;
}
