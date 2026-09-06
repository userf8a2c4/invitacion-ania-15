<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/PAGOS.PHP · LO QUE VARIOS ARCHIVOS NECESITAN SABER DE STRIPE

   QUÉ HACE ESTE ARCHIVO
   Responde una sola pregunta y la responde una sola vez: ¿se puede
   cobrar ahora mismo? Y de paso, cómo leer una clave de Stripe.

   ⚡ POR QUÉ EXISTE (2026-09-05)

   Esto vivía en compras.php, y chat.php tenía su PROPIA COPIA de la
   regla para armar el contexto que se le manda a MegaBot. Dos
   definiciones de lo mismo, en dos archivos, escritas en momentos
   distintos — y ya se habían separado:

     · compras.php exige, desde hoy, que las dos claves sean de la misma
       CUENTA de Stripe (dos claves de prueba de cuentas distintas pasan
       todas las demás comprobaciones y no sirven para nada).
     · chat.php seguía comprobando solo que las dos existieran.

   O sea que el chat podía decirle a MegaBot «pagos_listos: true» y
   proponerle una compra a Lucila que iba a fallar al cobrar. El aviso
   más caro que puede dar un sistema es el que promete algo que no puede
   cumplir.

   No se puede resolver incluyendo compras.php desde chat.php: ese
   archivo es un endpoint y lo primero que hace al cargarse es
   exigirAdministrador(). Por eso la regla baja acá, donde los dos
   pueden leerla sin arrastrar nada más.

   QUÉ NO ESTÁ ACÁ
   Hablar con Stripe. Eso sigue en compras.php, que es el único que
   tiene por qué usar la clave secreta.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';
require_once __DIR__ . '/entorno.php';

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
 * De qué cuenta de Stripe es una clave.
 *
 * ⚡ POR QUÉ HACE FALTA (2026-09-05)
 *
 * Las dos claves pueden ser las dos de prueba y aun así no servir: si
 * salieron de CUENTAS distintas —o de dos sandboxes— nada funciona. Y
 * falla tarde y feo: la pantalla de agregar tarjeta se abría sin campos
 * donde escribir, y Stripe solo lo explicaba dentro de su propio iframe
 * y en inglés:
 *
 *     "The client_secret provided does not match any associated
 *      SetupIntent on this account."
 *
 * Pasó de verdad al crear la clave restringida en un sandbox distinto
 * del que tenía la publicable. Es un error facilísimo de cometer —las
 * dos son de prueba, las dos parecen bien— y no se ve hasta que alguien
 * intenta guardar una tarjeta.
 *
 * Stripe pone el identificador de la cuenta DENTRO de la clave, justo
 * después de `_test_`/`_live_`: en `pk_test_51ABC…` y `rk_test_51ABC…`
 * ese `51ABC…` es el mismo si son de la misma cuenta. No es
 * documentación oficial de Stripe, así que se compara solo cuando las
 * dos claves tienen esa forma; si alguna no la tiene se devuelve '' y
 * quien pregunte se queda sin opinar, en vez de inventar una alarma.
 *
 * @param string $clave
 * @return string El identificador de cuenta, o '' si no se reconoce.
 */
function cuentaDeClaveStripe($clave) {
    $clave = trim((string) $clave);
    if ($clave === '') return '';

    if (!preg_match('/_(?:test|live)_([A-Za-z0-9]{10,})/', $clave, $m)) return '';

    return substr($m[1], 0, 16);
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

/**
 * Si los pagos están listos para cobrar.
 *
 * LA ÚNICA DEFINICIÓN. Si alguien necesita saberlo, llama acá — no
 * vuelve a escribir la regla. Ver la nota de arriba.
 *
 * @return bool
 */
function losPagosEstanListos() {
    $pub = claveStripePublicable();
    $sec = trim((string) env(STRIPE_CLAVE_SECRETA_EN_ENV, ''));
    if ($pub === '' || $sec === '') return false;

    $modoPub = modoDeClaveStripe($pub);
    if ($modoPub === '' || $modoPub !== modoDeClaveStripe($sec)) return false;

    /* Y de la misma cuenta. Si no se puede saber —una clave con forma
       rara— no se bloquea nada: se deja pasar y que Stripe opine, en vez
       de impedir cobrar por una sospecha. */
    $cuentaPub = cuentaDeClaveStripe($pub);
    $cuentaSec = cuentaDeClaveStripe($sec);
    if ($cuentaPub !== '' && $cuentaSec !== '' && $cuentaPub !== $cuentaSec) {
        return false;
    }

    return true;
}
