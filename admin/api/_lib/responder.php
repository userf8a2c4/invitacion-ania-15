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
 * Saca un monto de dinero. Acepta "1,500.50" y "$1500" y los normaliza.
 *
 * @param array  $origen
 * @param string $clave
 * @return float
 */
function campoMonto($origen, $clave) {
    $crudo = (string) ($origen[$clave] ?? '0');
    $limpio = preg_replace('/[^0-9.\-]/', '', $crudo);
    return round((float) $limpio, 2);
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
