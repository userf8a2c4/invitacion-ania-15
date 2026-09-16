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


/* ─── LA HORA ES LA DE LA FIESTA, NO LA DEL SERVIDOR ──────────────────
 *
 * ⚡ NO HABÍA NINGUNA ZONA HORARIA EN TODO EL PROYECTO (2026-09-03).
 *
 * El hosting corre en UTC y la fiesta es en Toluca (UTC−6). Todo lo que
 * usa date() se corría seis horas, y en dos lugares eso tenía
 * consecuencias de verdad:
 *
 *   · confirmar.php e invitacion.php comparan `date('Y-m-d')` contra la
 *     fecha límite para decidir si todavía se puede editar una
 *     respuesta. A las 18:00 del día límite, hora de México, el servidor
 *     ya creía que era el día siguiente y contestaba "las confirmaciones
 *     ya se cerraron" a alguien que llegaba a tiempo.
 *   · El correo que le llega a Lucila con cada confirmación traía la
 *     hora en UTC, seis horas adelantada.
 *
 * Va acá porque este archivo lo carga TODO: el panel entra por bd.php,
 * y la invitación y confirmar.php lo piden directo. Un solo lugar, antes
 * de que nadie llame a date().
 *
 * `@` porque en algún hosting muy cerrado date_default_timezone_set()
 * puede estar deshabilitada: si no se puede, se sigue con la del
 * servidor —que es lo que había hasta ahora— en vez de tirar un aviso
 * en medio del JSON. */
@date_default_timezone_set('America/Mexico_City');


/* ─── LA FECHA DE LA FIESTA, UNA SOLA VEZ ─────────────────────────────
 *
 * ⚡ LA FECHA ESTABA ESCRITA A MANO EN 17 LUGARES (2026-09-15).
 *
 * Cinco endpoints la usaban para DECIDIR —hoy.php, calendario.php,
 * estadisticas.php, chat.php y cron_recordatorios.php, cada uno con su
 * propia copia— y el resto para MOSTRARLA: las etiquetas og: de
 * index.html, confirmar.php, mi-pase.php, compartir.php y los dos
 * archivos de configuración del JavaScript.
 *
 * Diecisiete copias de un dato que tiene que ser uno solo. Es el mismo
 * problema que ya había tenido carpetaDeArchivos() acá abajo, y se
 * arregla igual: un solo lugar, y todos los demás preguntan.
 *
 * VA EN ESTE ARCHIVO, y no en uno nuevo, por la misma razón que la zona
 * horaria de acá arriba: esto lo carga TODO. El panel entra por bd.php
 * —los 39 endpoints—, y la invitación, confirmar.php y mi-pase.php lo
 * piden directo. No hay ningún punto de entrada que no pase por acá.
 *
 * ⚠️ EL JAVASCRIPT NO PUEDE LEER PHP. codigo/01-configuracion.js y
 * admin/codigo/01-configuracion.js son dos paquetes que se sirven al
 * navegador, así que no pueden llamar a estas funciones. Sus copias las
 * estampa herramientas/subir-version.mjs leyendo de ACÁ, igual que ya
 * reescribe los `?v=NN` y las dos VERSION de los service workers. Si
 * algún día cambia la forma de estas dos líneas de abajo, ese script
 * se detiene y avisa: no sigue con la fecha vieja.
 *
 * ⚠️ Por eso estas dos líneas se escriben así, planas y en una sola
 * línea cada una. No las envuelvas ni les pongas la fecha en un
 * define() o un env(): hay un script que las lee con una expresión
 * regular y una prueba que lo verifica. */
const FIESTA_DIA  = '2026-10-24';
const FIESTA_HORA = '17:00:00';

/**
 * El día de la fiesta, en el formato que entiende MySQL y DateTime.
 *
 * @return string AAAA-MM-DD
 */
function diaDeLaFiesta() {
    return FIESTA_DIA;
}

/**
 * El día y la hora juntos, en el formato ISO que usa el JavaScript.
 *
 * @return string Ej: '2026-10-24T17:00:00'
 */
function fiestaFechaYHora() {
    return FIESTA_DIA . 'T' . FIESTA_HORA;
}

/**
 * La fecha escrita para que la lea una persona.
 *
 * ⚠️ EL DÍA DE LA SEMANA SE CALCULA, NO SE GUARDA. «Sábado» estaba
 * escrito a mano en index.html y en el conocimiento del chatbot. Si la
 * fiesta se moviera un día, esas dos copias seguirían diciendo sábado
 * y nadie se daría cuenta hasta que un invitado llegara el día
 * equivocado. Un dato que se puede deducir no se guarda.
 *
 * @param bool $conDiaDeLaSemana true → 'Sábado 24 de octubre de 2026'
 * @return string
 */
function fiestaEnPalabras($conDiaDeLaSemana = false) {
    $meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $dias  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves',
              'viernes', 'sábado'];

    $cuando = new DateTime(FIESTA_DIA);
    $texto  = ((int) $cuando->format('j')) . ' de '
            . $meses[(int) $cuando->format('n')] . ' de '
            . $cuando->format('Y');

    if (!$conDiaDeLaSemana) return $texto;

    $nombre = $dias[(int) $cuando->format('w')];
    return mb_strtoupper(mb_substr($nombre, 0, 1, 'UTF-8'), 'UTF-8')
         . mb_substr($nombre, 1, null, 'UTF-8') . ' ' . $texto;
}

/**
 * Cuántos días faltan para la fiesta, contando desde hoy.
 *
 * Negativo cuando ya pasó: -1 es el 25 de octubre. Ese signo es el que
 * usa la pantalla «Hoy» para saber que la fiesta terminó.
 *
 * @return int
 */
function diasParaLaFiesta() {
    return (int) (new DateTime('today'))
        ->diff(new DateTime(FIESTA_DIA))->format('%r%a');
}


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

/* ─── DÓNDE VIVEN LOS ADJUNTOS ──────────────────────────────── */

/*
   EL PROBLEMA QUE RESUELVE ESTO (2026-09-04)

   Los PDF de recibos y contratos, y todo lo que Lucila sube a mano,
   vivían en `admin/archivos/`, que está DENTRO del árbol que maneja el
   repositorio pero NO está en el repositorio: `.gitignore` deja pasar
   solo su `.htaccess`.

   Eso significa que ninguna promoción los lleva ni los trae, y que cada
   despliegue reconstruye esa carpeta a partir de un origen donde no
   están. En el mejor caso nunca viajan entre entornos; en el peor
   desaparecen, y las filas de `archivos`, `recibos` y `contratos` quedan
   apuntando a un `nombre_disco` que ya no existe en el disco. Son las
   filas huérfanas del incidente de agosto de 2026.

   La cura de fondo es sacar el almacén del camino del despliegue: una
   carpeta HERMANA de public_html, que ninguna herramienta de publicación
   toca. Se configura con CARPETA_ARCHIVOS en el .env del servidor:

       CARPETA_ARCHIVOS=/home/USUARIO/adjuntos-ania

   ⚠️ SIN ESA LÍNEA NO CAMBIA NADA. El respaldo es la carpeta de
   siempre, así que una instalación que no configure nada se comporta
   exactamente igual que antes de este cambio. Eso es a propósito: mover
   archivos es la clase de operación que no puede ocurrir sola.
*/

/**
 * Donde estuvieron siempre los adjuntos: `admin/archivos`.
 *
 * Sirve de respaldo y de origen para la migración de instalar.php.
 *
 * @return string Sin barra final.
 */
function carpetaDeArchivosPorOmision() {
    // entorno.php → admin/api/_lib → admin/api → admin
    return dirname(__DIR__, 2) . '/archivos';
}

/**
 * La carpeta donde se guardan y se leen los adjuntos.
 *
 * Un solo lugar: antes esta ruta estaba escrita a mano en nueve puntos
 * de seis archivos distintos, que es exactamente cómo se desincroniza
 * una cosa así.
 *
 * @return string Sin barra final.
 */
function carpetaDeArchivos() {
    $propia = trim((string) env('CARPETA_ARCHIVOS', ''));
    if ($propia === '') return carpetaDeArchivosPorOmision();

    return rtrim($propia, "/\\");
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
 * Solo vale LLAVE_DIAGNOSTICO, que vive en el .env del servidor. El
 * .env está en .gitignore -bien: tiene las contraseñas-, así que
 * ponerla o cambiarla exige entrar por hPanel a mano.
 *
 * ⚠️ SI SE CAMBIA, HAY QUE CAMBIARLA EN SIETE LUGARES POR SERVIDOR:
 * el .env, y las TRES tareas programadas que la llevan en su URL
 * (cron_alarmas, cron_recordatorios, cron_respaldo). Un cron que se
 * queda con la llave vieja no avisa a nadie: deja de correr y ya. Sin
 * respaldos, sin alarmas y sin recordatorios, en silencio.
 *
 * ⚠️ ANTES TAMBIÉN SE ACEPTABA DB_PASSWORD, Y ERA UN ERROR.
 *
 * Parecía cómodo —ya estaba en el .env, no había que inventar nada—,
 * pero esta llave VIAJA EN LA URL: los crones se llaman con
 * `?llave=…`. Todo lo que va en una URL queda escrito en el registro de
 * accesos de Apache, se manda en la cabecera Referer si la página
 * enlaza a otro lado, y aparece en el historial del navegador.
 *
 * O sea que la contraseña de la base de datos quedaba en texto plano en
 * varios archivos de registro. Quien pudiera leer un log tendría acceso
 * completo a la base, no solo a correr un cron.
 *
 * @param string $recibida La llave que mandó quien llama.
 * @return bool
 */
function llaveDeArranqueCorrecta($recibida) {
    /* FRENO ANTES DE COMPROBAR NADA.
     *
     * instalar.php y diagnostico.php no tienen sesión ni el freno de
     * INTENTOS_MAXIMOS de _lib/sesion.php (corren antes de que exista
     * usuario alguno), así que sin esto alguien podría probar llaves una
     * tras otra sin límite. Reutiliza la misma tabla `intentos_login` que
     * el login normal, con su propia marca para no mezclar los conteos.
     *
     * Solo funciona si _lib/bd.php ya se cargó antes que este archivo,
     * que es el caso en instalar.php y diagnostico.php. */
    /* En una base recién creada (0 tablas) intentos_login todavía no
       existe: instalar.php es justo lo que la va a crear. Sin este chequeo,
       la consulta de abajo revienta antes de poder crear nada. */
    if (function_exists('consultarUno') && function_exists('insertar')
        && function_exists('existeTabla') && existeTabla('intentos_login')) {
        $ip     = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
        $fila   = consultarUno(
            'SELECT COUNT(*) AS n FROM intentos_login
             WHERE ip = :ip AND correo = :marca
               AND cuando <= NOW()
               AND cuando > DATE_SUB(NOW(), INTERVAL 15 MINUTE)',
            [':ip' => $ip, ':marca' => '__llave__']
        );
        if ($fila && (int) $fila['n'] >= 5) {
            responderMal('Demasiados intentos. Espera 15 minutos.', 429);
        }
    }

    $recibida = (string) $recibida;
    if ($recibida === '') return false;

    $esperada = env('LLAVE_DIAGNOSTICO', '');
    if ($esperada === '') return false;

    // hash_equals tarda lo mismo acierte o no, así que no se puede
    // adivinar la llave letra por letra midiendo los tiempos.
    $correcta = hash_equals($esperada, $recibida);

    if (!$correcta && function_exists('insertar')) {
        $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
        insertar('intentos_login', ['ip' => $ip, 'correo' => '__llave__']);
    }

    return $correcta;
}


/**
 * Si esto es el ambiente de pruebas (pbe.aniaxv.com) o el sitio real.
 *
 * ⚡ UNA SOLA DEFINICIÓN, Y LA ESTRICTA (2026-09-06)
 *
 * Había CUATRO copias de esta pregunta y no todas contestaban igual:
 * invitacion.php y reiniciar-prueba.php exigían que el host EMPEZARA
 * con "pbe." (strpos === 0), mientras compras.php y chat.php se
 * conformaban con que apareciera en cualquier parte (!== false).
 *
 * POR QUÉ IMPORTA
 * De esta respuesta depende el cartel que separa «Estás en PRUEBAS» de
 * «Estás en el sitio REAL» en la pantalla de pagos — el que existe para
 * que nadie cobre con la cuenta de verdad creyendo que era la de
 * mentira. Una versión laxa daría «pruebas» en cualquier dominio que
 * llevara "pbe." en el medio, que es exactamente el error que ese
 * cartel tiene que hacer imposible.
 *
 * Se queda la estricta: pruebas es el subdominio que EMPIEZA con "pbe.",
 * y nada más. Ante la duda, el sitio real — que obliga a mirar dos veces
 * en vez de dar confianza de más.
 *
 * Lo decide el SERVIDOR por su propio dominio, nunca el navegador.
 *
 * @return bool
 */
function estamosEnPruebas() {
    return strpos((string) ($_SERVER['HTTP_HOST'] ?? ''), 'pbe.') === 0;
}
