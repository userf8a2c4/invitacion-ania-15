<?php
/* ══════════════════════════════════════════════════════════════════════
   ECLIPSE.PHP · A QUÉ HORA ES EL MINUTO

   QUÉ HACE ESTE ARCHIVO
   Devuelve la hora del eclipse, en UTC, tal como la dejó Lucila en el
   panel. Nada más. Es el archivo público más chico del proyecto.

       GET eclipse.php  →  {"ok":true,"utc":"12:30"}

   POR QUÉ EXISTE, SI YA HAY UNA HORA ESCRITA EN index.html
   Porque index.html es HTML estático —cero <?php, y así tiene que
   seguir— así que la hora está horneada ahí como `var HORA_UTC = 12,
   MINUTO_UTC = 30`. Esa constante no la puede cambiar Lucila: hay que
   editar el archivo, empaquetar y subir. Carlos pidió un control en la
   app, y un control que no llegue al sitio no es un control.

   ⚠️ LA HORNEADA SIGUE SIENDO EL RESPALDO, Y NO ES UN DETALLE
   Si este archivo no existe, si la base está caída, si el teléfono no
   tiene señal: el vigía corre con la hora horneada y se comporta
   exactamente como antes. Esto AGREGA una forma de enterarse; no
   reemplaza la que ya funcionaba. Un homenaje que depende de que un
   PHP conteste es peor que uno que no.

   POR QUÉ NO SE COLGÓ DE invitacion.php Y YA
   Se colgó TAMBIÉN de ahí —invitacion.php devuelve `eclipse_utc` en la
   misma respuesta que ya mandaba, sin una consulta extra ni un archivo
   nuevo— pero eso solo alcanza a quien abre con ?i=TOKEN. Quien abre la
   invitación pelada nunca pide nada al servidor, y ese camino no tiene
   por dónde enterarse. Este archivo es para ése.

   ⚠️ NO LEE NADA DE $_GET. La clave está escrita acá adentro. El
   parámetro `?mirando=` que manda el vigía existe solo para saltear
   intermediarios que cacheen, y este archivo ni lo mira.

   ⚠️ SIN FRENO POR IP, A PROPÓSITO. confirmar.php, mi-pase.php e
   invitacion.php tienen freno porque exponen datos de una persona y se
   pueden sondear con tokens al azar. Acá no hay nada de nadie: es una
   hora del día, la misma para todo el mundo, la misma que está a la
   vista en la invitación. Un freno solo agregaría una forma de que un
   invitado legítimo se quede sin ella.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/admin/api/_lib/entorno.php';
cargarEntorno();

/* ─── CORS y cabeceras (mismo criterio que invitacion.php) ───────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

/* ⛔ ESTA RESPUESTA NO SE PUEDE CACHEAR EN NINGÚN LADO.
 *
 * Es lo único que hace que un cambio de hora llegue el mismo día. Un
 * intermediario que la guarde media hora convierte «Lucila cambió la
 * hora» en «Lucila cambió la hora para algunos». .htaccess no le pone
 * caché a los .php, así que estas tres cabeceras son toda la defensa
 * que hay.
 *
 * ⚠️ FALTA COMPROBARLO CONTRA PRODUCCIÓN. El CDN de Hostinger reescribe
 * respuestas al vuelo —el propio .htaccess documenta que convierte
 * imágenes a WebP, y por eso vista-previa-compartir.jpg lleva
 * `no-transform`—. Un intermediario que reescribe también puede
 * guardar. Hay que correr, una vez, contra el sitio real:
 *
 *     curl -sI https://aniaxv.com/eclipse.php
 *
 * y mirar que no vuelva ningún `Age:` ni `x-cache: HIT`. Mientras eso
 * no esté comprobado, el respaldo horneado es lo que sostiene todo. */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ─── LA HORA ─────────────────────────────────────────────────────────
   Todo esto vive adentro de un try. Cualquier cosa que salga mal
   —la tabla no existe todavía, la base no contesta, el valor quedó
   escrito a mano y no tiene forma de hora— termina en la MISMA
   respuesta: `ok` sin `utc`. El vigía lee eso como «seguí con la que
   tenías» y no pasa nada. Nunca un 500: un error acá no puede ser una
   excusa para que el navegador haga algo raro. */
$utc = null;

try {
    $DB_HOST     = getenv('DB_HOST')     ?: 'localhost';
    $DB_NAME     = getenv('DB_NAME')     ?: '';
    $DB_USER     = getenv('DB_USER')     ?: '';
    $DB_PASSWORD = getenv('DB_PASSWORD') ?: '';

    /* Conexión propia, sin respaldo para nombre/usuario de base: el
       mismo motivo que documenta invitacion.php — bd() tiene defaults
       que en PBE podrían apuntar calladamente a la base equivocada. */
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER, $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );

    $stmt = $pdo->prepare("SELECT valor FROM ajustes WHERE clave = 'hora_eclipse_utc' LIMIT 1");
    $stmt->execute();
    $fila = $stmt->fetch();

    $valor = trim((string) ($fila['valor'] ?? ''));

    /* ⛔ SE VALIDA ACÁ AUNQUE EL PANEL YA VALIDE. Es el mismo criterio
       que ya usa admin/api/ajustes.php con megabot_webhook_url: el
       formulario valida por comodidad, la API valida por defensa. Un
       valor escrito a mano en la base —o por una versión futura del
       panel con un error— no puede llegar al vigía de los invitados. */
    if (preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/', $valor)) {
        $utc = $valor;
    }
} catch (Throwable $e) {
    /* Ni siquiera se registra: esto se pide una vez por visita y un log
       por cada una, el día que la base tenga un mal rato, llena el disco
       sin decir nada que no se sepa. */
    $utc = null;
}

$salida = ['ok' => true];
if ($utc !== null) $salida['utc'] = $utc;

echo json_encode($salida, JSON_UNESCAPED_UNICODE);
