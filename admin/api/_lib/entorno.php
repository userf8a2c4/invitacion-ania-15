<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/ENTORNO.PHP · LEER EL ARCHIVO .ENV

   QUÉ HACE ESTE ARCHIVO
   El .env de la raíz guarda las contraseñas (base de datos y correo).
   Este archivo las carga en memoria para que el resto del panel pueda
   pedirlas con env('DB_USER') sin volver a leer el disco cada vez.

   POR QUÉ EXISTE
   confirmar.php ya hacía exactamente esto con un bucle suelto al inicio.
   Se movió acá para que el panel y la invitación lean el MISMO archivo
   de la MISMA forma: si algún día cambia el formato del .env, se arregla
   en un solo lugar y no en dos.

   DÓNDE ESTÁ EL .ENV
   Este archivo vive en admin/api/_lib/, o sea tres carpetas adentro,
   por eso sube tres niveles con dirname() para encontrarlo en la raíz.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Carga el .env de la raíz del sitio. Se puede llamar varias veces sin
 * problema: la segunda vez y las siguientes no hacen nada.
 *
 * @return void
 */
function cargarEntorno() {
    static $yaCargado = false;
    if ($yaCargado) return;
    $yaCargado = true;

    // admin/api/_lib/entorno.php → admin/api/_lib → admin/api → admin → raíz
    $rutaEnv = dirname(__DIR__, 3) . '/.env';
    if (!file_exists($rutaEnv)) return;

    foreach (file($rutaEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);

        // Los comentarios empiezan con # y las líneas sin = no son valores.
        if ($linea === '' || $linea[0] === '#' || strpos($linea, '=') === false) continue;

        [$clave, $valor] = explode('=', $linea, 2);
        putenv(trim($clave) . '=' . trim($valor));
    }
}

/**
 * Devuelve un valor del .env, o el respaldo si no está definido.
 *
 * Ojo: getenv() devuelve false cuando la variable no existe, pero también
 * devuelve la cadena vacía cuando existe y está vacía. Los dos casos se
 * tratan igual acá, porque una contraseña vacía es tan inservible como
 * una que falta.
 *
 * @param string $clave    Nombre de la variable, por ejemplo 'DB_USER'.
 * @param mixed  $respaldo Qué devolver si no está.
 * @return mixed
 */
function env($clave, $respaldo = null) {
    cargarEntorno();
    $valor = getenv($clave);
    return ($valor === false || $valor === '') ? $respaldo : $valor;
}

/**
 * Comprueba la llave de arranque de los endpoints previos al login.
 *
 * POR QUÉ EXISTE ESTA FUNCIÓN
 * diagnostico.php, instalar.php y la creación de la primera cuenta
 * corren ANTES de que exista ningún usuario, así que no pueden pedir
 * sesión. Necesitan un secreto, y ese secreto tiene que estar ya en el
 * servidor.
 *
 * El sitio se despliega con GitHub Desktop y el .env está en .gitignore
 * (bien: tiene las contraseñas). O sea que agregarle una variable nueva
 * al .env del servidor exige entrar a mano por hPanel. Para no obligar a
 * eso, se acepta como llave cualquiera de estas dos:
 *
 *   · LLAVE_DIAGNOSTICO, si algún día se agrega al .env del servidor.
 *   · DB_PASSWORD, que YA está ahí porque sin ella no funcionaría nada.
 *
 * La contraseña de la base es un secreto tan bueno como cualquier otro
 * para esto, y no viaja a ningún lado: se compara contra lo que llega
 * por la URL y se descarta.
 *
 * @param string $recibida La llave que mandó quien llama.
 * @return bool
 */
function llaveDeArranqueCorrecta($recibida) {
    $recibida = (string) $recibida;
    if ($recibida === '') return false;

    foreach (['LLAVE_DIAGNOSTICO', 'DB_PASSWORD'] as $variable) {
        $esperada = env($variable, '');
        // hash_equals tarda lo mismo acierte o no, así que no se puede
        // adivinar la llave letra por letra midiendo los tiempos.
        if ($esperada !== '' && hash_equals($esperada, $recibida)) return true;
    }
    return false;
}
