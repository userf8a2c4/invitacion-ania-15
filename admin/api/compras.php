<?php
/* ══════════════════════════════════════════════════════════════════════
   COMPRAS.PHP · LA CONEXIÓN CON EL PROCESADOR DE PAGOS

   QUÉ HACE ESTE ARCHIVO (POR AHORA)
   Solo la configuración: decir si la conexión con Stripe está lista, y
   guardar la clave que SÍ puede ser pública. El cobro en sí todavía no
   está — llega cuando existan las claves y se pueda probar de verdad.

   ══════════════════════════════════════════════════════════════════════
   POR QUÉ HAY DOS CLAVES Y VIVEN EN LUGARES DISTINTOS

   Stripe da dos claves por entorno, y no son intercambiables:

     PUBLICABLE  (pk_...)  Está hecha para que la vea cualquiera: viaja
                           al navegador, es la que dibuja el formulario
                           de tarjeta. Que se filtre no es un incidente.
                           Por eso se puede guardar en `ajustes` y
                           editar desde el panel.

     SECRETA     (sk_...)  Con ella se cobra. Quien la tenga puede mover
                           dinero de la cuenta. NUNCA entra a la base de
                           datos, ni al panel, ni a un log, ni viaja al
                           navegador. Vive en el .env del servidor, que
                           está en .gitignore y no sale de ahí.

   Este archivo NUNCA devuelve la clave secreta. Solo dice si está
   puesta y en qué modo (prueba o real), que es todo lo que el panel
   necesita para orientar a quien configura.

   ══════════════════════════════════════════════════════════════════════
   DOS GUARDAS QUE EVITAN ERRORES CAROS

   1. NO SE DEJA GUARDAR UNA CLAVE SECRETA EN EL CAMPO PÚBLICO. Es el
      error fácil: las dos son cadenas largas parecidas, y pegar la que
      no va significaría meter en la base —y mandar a los navegadores—
      la llave con la que se cobra. Si el texto empieza con `sk_`, se
      rechaza y se explica.

   2. LAS DOS CLAVES TIENEN QUE SER DEL MISMO MODO. Una publicable de
      prueba con una secreta real (o al revés) no funciona, y falla en
      el peor momento: al cobrar. Acá se compara el prefijo de las dos
      y se avisa antes.

   Y una tercera, de sentido común: en PBE corresponden las claves de
   PRUEBA y en producción las REALES. Se avisa si no coincide, pero no
   se prohíbe — puede haber un motivo para probar con reales en un
   momento dado, y el panel informa, no manda.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=config           cómo está la conexión (sin secretos)
     POST ?accion=guardar_config   guarda la clave publicable
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/entorno.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'config');

/** El nombre EXACTO de la clave secreta en el .env. Si esto cambia, hay
    que cambiarlo también en la pantalla del panel y en el instructivo. */
const STRIPE_CLAVE_SECRETA_EN_ENV = 'STRIPE_CLAVE_SECRETA';

/** La publicable se puede poner por el panel o por el .env. La del panel
    gana; ésta es el respaldo para quien prefiera dejar las dos juntas. */
const STRIPE_CLAVE_PUBLICA_EN_ENV = 'STRIPE_CLAVE_PUBLICA';


/**
 * En qué modo está una clave de Stripe, mirando solo su prefijo.
 *
 * No valida que la clave sirva —eso solo lo sabe Stripe— pero distingue
 * lo único que hace falta acá: si es de prueba o de la cuenta real.
 *
 * @param string $clave
 * @return string 'prueba', 'real' o '' si no se reconoce.
 */
function modoDeClaveStripe($clave) {
    $clave = trim((string) $clave);
    if ($clave === '') return '';

    if (strpos($clave, '_test_') !== false) return 'prueba';
    if (strpos($clave, '_live_') !== false) return 'real';
    return '';
}

/**
 * La clave publicable que se está usando: la del panel, o la del .env
 * si el panel no tiene ninguna.
 *
 * @return string
 */
function claveStripePublicable() {
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'stripe_clave_publica'");
    $delPanel = trim((string) ($fila['valor'] ?? ''));
    if ($delPanel !== '') return $delPanel;

    return trim((string) env(STRIPE_CLAVE_PUBLICA_EN_ENV, ''));
}


switch ($accion) {

/* ─── CÓMO ESTÁ LA CONEXIÓN ───────────────────────────────────────────── */

case 'config':
    exigirMetodo('GET');

    $publicable = claveStripePublicable();
    $secreta    = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));

    $modoPublicable = modoDeClaveStripe($publicable);
    $modoSecreta    = modoDeClaveStripe($secreta);

    /* El entorno lo decide el SERVIDOR mirando su propio dominio, no el
       navegador: es el mismo criterio que usa reiniciar-prueba.php para
       no existir en producción. */
    $esPruebas = strpos((string) ($_SERVER['HTTP_HOST'] ?? ''), 'pbe.') !== false;

    responderBien([
        'entorno'          => $esPruebas ? 'pbe' : 'produccion',

        // La publicable viaja entera: para eso está hecha.
        'publicable'       => $publicable,
        'modo_publicable'  => $modoPublicable,

        /* De la secreta viaja SOLO si está y en qué modo. Nunca su
           valor, ni un pedazo, ni su largo. */
        'secreta_puesta'   => $secreta !== '',
        'modo_secreta'     => $modoSecreta,

        // Para que el panel no tenga que repetir estas reglas.
        'nombre_en_env'    => STRIPE_CLAVE_SECRETA_EN_ENV,
        'modos_coinciden'  => ($modoPublicable !== '' && $modoPublicable === $modoSecreta),
        'modo_esperado'    => $esPruebas ? 'prueba' : 'real',
        'listo'            => ($publicable !== '' && $secreta !== ''
                               && $modoPublicable !== '' && $modoPublicable === $modoSecreta),
    ]);
    break;


/* ─── GUARDAR LA CLAVE PUBLICABLE ─────────────────────────────────────── */

case 'guardar_config':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $publicable = trim(campoTexto($datos, 'publicable', 200));

    /* Vaciarla es una forma válida de desconectar. */
    if ($publicable !== '') {

        /* ⚠️ LA GUARDA QUE MÁS IMPORTA DE ESTE ARCHIVO.
           Las dos claves de Stripe son cadenas largas y parecidas, y
           este campo se llena copiando y pegando. Pegar la secreta acá
           la metería en la base de datos y la mandaría a todos los
           navegadores que abran el panel: la llave con la que se cobra,
           repartida. Se rechaza antes de mirar nada más. */
        if (strpos($publicable, 'sk_') === 0) {
            responderMal(
                'Esa es la clave SECRETA (empieza con sk_). Esa nunca va acá: ' .
                'va en el archivo .env del servidor. Acá va la publicable, ' .
                'que empieza con pk_.', 400);
        }

        if (strpos($publicable, 'pk_') !== 0) {
            responderMal('La clave publicable de Stripe empieza con pk_. Revisa que hayas copiado la correcta.', 400);
        }

        if (modoDeClaveStripe($publicable) === '') {
            responderMal('No reconozco esa clave: tendría que decir _test_ o _live_ en el medio.', 400);
        }
    }

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('stripe_clave_publica', :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [':v' => $publicable]
    );

    /* En la bitácora queda QUE se cambió y de qué modo, nunca la clave.
       Aunque sea la publicable: un historial no es lugar para llaves. */
    anotarEnBitacora($yo, 'cambió la clave publicable de pagos', 'ajustes', 0,
                     $publicable === '' ? 'quitada' : ('modo ' . modoDeClaveStripe($publicable)));

    responderBien(['modo' => modoDeClaveStripe($publicable)]);
    break;


default:
    responderMal('No sé hacer eso.', 400);
}
