/* ══════════════════════════════════════════════════════════════════════
   REVISAR-PAGOS.MJS · las guardas del dinero siguen puestas

   POR QUÉ EXISTE
   No hay PHP en la máquina donde se escribe este proyecto, así que
   `php -l` no se puede correr nunca (ver la nota en revisar-php.mjs). Y
   compras.php es el único archivo del panel que saca dinero de una
   cuenta: es justo donde peor se paga un descuido.

   QUÉ COMPRUEBA
   Que las guardas siguen ahí y EN EL ORDEN correcto. No es una prueba
   de que el código funcione —eso solo lo dice el servidor— sino de que
   nadie las quitó ni las movió de lugar sin darse cuenta:

     · las tres acciones de dinero piden la contraseña otra vez,
       ANTES de tocar nada;
     · cobrar además pasa por el freno de ritmo;
     · el POST que cobra lleva clave de idempotencia derivada del pedido;
     · el token de la tarjeta no viaja al panel;
     · el aviso de cada movimiento está enganchado.

   CÓMO SE USA
       node herramientas/revisar-pagos.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RUTA = join(AQUI, '..', 'admin', 'api', 'compras.php');
const php = readFileSync(RUTA, 'utf8');

/* La regla de "se puede cobrar" y como leer una clave viven en una
   libreria aparte desde el 2026-09-05: chat.php necesitaba la misma y no
   puede incluir compras.php (es un endpoint que exige admin al cargarse).
   Se lee tambien, porque parte de lo que se comprueba aca vive alli. */
const libPagos = readFileSync(
  join(AQUI, '..', 'admin', 'api', '_lib', 'pagos.php'), 'utf8');

let fallos = 0;
const comprobar = (nombre, condicion, detalle) => {
  if (condicion) { console.log('  ok    ' + nombre); return; }
  fallos++;
  console.log('  FALLA ' + nombre + (detalle ? '\n        → ' + detalle : ''));
};

/** El cuerpo de un `case 'x':` hasta su `break;`. */
function cuerpoDelCaso(nombre) {
  const desde = php.indexOf("case '" + nombre + "':");
  if (desde === -1) return '';
  const hasta = php.indexOf('\n    break;', desde);
  return hasta === -1 ? php.slice(desde) : php.slice(desde, hasta);
}

/* ─── 1. La contraseña, en las tres que mueven dinero ─────────────── */

console.log('\nVolver a pedir la contraseña\n');

const DE_DINERO = ['guardar_metodo', 'desactivar_metodo', 'cobrar'];

for (const accion of DE_DINERO) {
  const cuerpo = cuerpoDelCaso(accion);
  comprobar(accion + ' la pide',
    cuerpo.includes('exigirContrasenaDeNuevo('),
    'sin esto, basta una sesión abierta para mover dinero');
}

/* El orden importa tanto como la presencia: si se pidiera DESPUÉS de
   haber hecho el trabajo, la guarda no guardaría nada. */
for (const accion of DE_DINERO) {
  const cuerpo = cuerpoDelCaso(accion);
  const clave  = cuerpo.indexOf('exigirContrasenaDeNuevo(');
  const stripe = cuerpo.indexOf('pedirleAStripe(');
  const escribe = cuerpo.search(/\b(insertar|actualizar)\(/);

  const antesDeTodo = clave !== -1 &&
    (stripe === -1 || clave < stripe) &&
    (escribe === -1 || clave < escribe);

  comprobar(accion + ' la pide ANTES de tocar nada', antesDeTodo,
    'la comprobación tiene que ir antes de hablar con Stripe o escribir en la base');
}

/* Ningún rechazo de contraseña puede ser 401.
   Se coló una vez: el panel trata TODO 401 como sesión vencida y manda
   al login (03-servidor.js:420), así que equivocarse de tecla echaba a
   la persona del panel entero. Tiene que ser 403 — la sesión es válida,
   lo que falta es autorización para esa acción. */
const guarda = php.slice(
  php.indexOf('function exigirContrasenaDeNuevo'),
  php.indexOf('function exigirRitmoDeCobro'));

comprobar('ningún rechazo de contraseña devuelve 401',
  guarda !== '' && !/responderMal\([^;]*,\s*401\s*\)/.test(guarda),
  'un 401 acá cierra la sesión y expulsa a quien escribió mal la contraseña');

/* El panel y el servidor se ponen de acuerdo POR EL TEXTO del error:
   mandarTocandoDinero() (50-pagos.js) solo pide la contraseña y
   reintenta si el mensaje coincide con su patrón. Cambiar esa frase en
   un archivo y no en el otro haría que el panel deje de pedirla EN
   SILENCIO — y quien lo cambie no tiene por qué saber que hay un regex
   esperándola del otro lado. */
const panel = readFileSync(join(AQUI, '..', 'admin', 'codigo', '50-pagos.js'), 'utf8');
const elPatron = /const laPide[\s\S]{0,200}?\/([^/]+)\/i\.test/.exec(panel);
const elTexto  = /responderMal\('([^']*contraseña[^']*)',\s*403\)/.exec(guarda);

comprobar('el texto del servidor dispara el reintento del panel',
  !!(elPatron && elTexto) && new RegExp(elPatron[1], 'i').test(elTexto[1]),
  elPatron && elTexto
    ? 'el panel busca /' + elPatron[1] + '/i y el servidor dice "' + elTexto[1] + '"'
    : 'no se encontró el patrón del panel o el mensaje del servidor');

/* ─── 2. El ritmo de los cobros ───────────────────────────────────

   Hubo acá un freno propio (cinco cobros por diez minutos) y estas
   comprobaciones lo exigían. Se quitó a pedido el 2026-09-05: el ritmo
   de las compras lo decide MegaBot, no un tope ciego en el servidor.

   Lo que sí sigue comprobándose es lo que de verdad frena un cobro
   indebido: la contraseña (arriba) y la idempotencia (abajo). */

/* ─── 3. Idempotencia: el seguro contra el cobro doble ────────────── */

console.log('\nIdempotencia\n');

comprobar('pedirleAStripe acepta una clave',
  /function pedirleAStripe\([^)]*\$idempotencia/.test(php));

comprobar('y la manda como cabecera solo en POST',
  /\$metodo === 'POST' && \$idempotencia !== ''[\s\S]{0,120}Idempotency-Key/.test(php));

/* El cobro salio del case a una funcion (2026-09-05), para que los tres
   caminos —cobrar, proponer+confirmar— usen la misma y no se separen. */
const elCobro = cuerpoDeFuncion('cobrarUnPedido');

comprobar('el cobro la deriva del id del pedido',
  /payment_intents[\s\S]*?'pedido-' \. \$pedidoId/.test(elCobro),
  'con una clave al azar cada reintento sería un cobro nuevo');

comprobar('la clave del cobro NO es aleatoria',
  !/payment_intents[\s\S]{0,900}(uniqid|mt_rand|random_bytes|bin2hex)/.test(elCobro),
  'un valor distinto en cada intento no protege de nada');

/* Y que sigan siendo la misma: si alguien copiara el cobro dentro de un
   case, esa copia se quedaria sin idempotencia el dia que se cambie. */
comprobar('solo hay UN sitio que llama a payment_intents',
  (php.match(/'payment_intents'/g) || []).length === 1,
  'dos caminos de cobro acaban teniendo dos reglas distintas');

for (const via of ['cobrar', 'confirmar']) {
  comprobar(via + ' cobra por esa misma función',
    cuerpoDelCaso(via).includes('cobrarUnPedido('));
}

/* ─── 4. El token nunca sale hacia el panel ───────────────────────── */

console.log('\nEl token se queda en el servidor\n');

const listar = cuerpoDelCaso('listar_metodos');
comprobar('listar_metodos no devuelve stripe_payment_method_id',
  listar !== '' && !listar.includes('stripe_payment_method_id'),
  'lo que no sale, no se filtra');

/* Ojo con lo que se busca acá: `config` SÍ devuelve
   `STRIPE_CLAVE_SECRETA_EN_ENV`, y está bien — eso es el NOMBRE de la
   variable ("STRIPE_CLAVE_SECRETA"), que el panel muestra para decir qué
   línea agregar al .env. Lo que no puede salir nunca es su VALOR, que es
   lo que devuelve env(...) y lo que vive en $secreta. */
/* Y ojo también con `$secreta`: aparece varias veces dentro del
   responderBien de `config`, pero siempre COMPARADA —`$secreta !== ''`—
   para decir si está puesta. Eso viaja como true/false. Lo que no puede
   pasar es que salga la variable a secas, o sea `=> $secreta,`. */
comprobar('ningún responderBien devuelve el VALOR de la clave secreta',
  !/responderBien\([^;]*env\(\s*STRIPE_CLAVE_SECRETA_EN_ENV/.test(php) &&
  !/=>\s*\$secreta\s*[,)]/.test(php),
  'el nombre de la variable y un sí/no pueden salir; la clave, jamás');

/* ─── 5. Los avisos ───────────────────────────────────────────────── */

console.log('\nAvisos de cada movimiento\n');

for (const [accion, que] of [
  ['guardar_metodo',    'alta de tarjeta'],
  ['desactivar_metodo', 'baja de tarjeta'],
]) {
  comprobar('avisa del ' + que,
    cuerpoDelCaso(accion).includes('avisarDeMovimientoDeDinero('));
}

// El del cobro vive en cobrarUnPedido(), asi que vale para los tres
// caminos de una sola vez.
comprobar('avisa del cobro',
  cuerpoDeFuncion('cobrarUnPedido').includes('avisarDeMovimientoDeDinero('));

/* Se mira DENTRO de la función, no contando caracteres: la primera
   versión usaba un tope de 2600 y empezó a fallar sola en cuanto la
   función creció. Una comprobación que se rompe al editar el código que
   vigila no sirve. */
function cuerpoDeFuncion(nombre) {
  const desde = php.indexOf('function ' + nombre);
  if (desde === -1) return '';
  // Una función de nivel superior termina en la primera llave sola al
  // principio de línea. No hace falta más para lo que se comprueba acá.
  const hasta = php.indexOf('\n}', desde);
  return hasta === -1 ? php.slice(desde) : php.slice(desde, hasta + 2);
}

const avisoEntero = cuerpoDeFuncion('avisarDeMovimientoDeDinero');

comprobar('el aviso no puede tumbar la operación',
  avisoEntero.includes('catch (Throwable'),
  'un correo caído no puede dejar un cobro a medias');

comprobar('el aviso dice si salió o no',
  avisoEntero.includes('return $resultado') && /'fallos'/.test(avisoEntero),
  'un aviso que falla en silencio es peor que no tenerlo: se confía en él');

comprobar('correo.php y push.php están requeridos',
  php.includes("require_once __DIR__ . '/_lib/correo.php'") &&
  php.includes("require_once __DIR__ . '/_lib/push.php'"),
  'sin el require, el aviso lanzaría y tumbaría el cobro');

/* ─── 6. La contraseña no se guarda en ningún lado ────────────────── */

console.log('\nLa contraseña no queda escrita\n');

comprobar('no se anota en la bitácora',
  !/anotarEnBitacora\([^;]*contrasena/.test(php));

comprobar('no se guarda en ninguna tabla',
  !/(insertar|actualizar)\([^;]*'contrasena'/.test(php));


/* --- 6. Las dos claves, de la misma cuenta ------------------------- */

console.log('\nLas dos claves tienen que ser de la misma cuenta\n');

/* El caso real del 2026-09-05: publicable y restringida las dos de
   prueba, pero de sandboxes distintos. Todo pasaba las comprobaciones y
   el formulario de tarjeta salia vacio, con Stripe explicandolo en
   ingles dentro de su iframe. Aca se replica cuentaDeClaveStripe() tal
   como esta en el PHP para comprobar que distingue los casos. */
const comoElPhp = (clave) => {
  const m = /_(?:test|live)_([A-Za-z0-9]{10,})/.exec(String(clave || ''));
  return m ? m[1].slice(0, 16) : '';
};

const PK_A = 'pk_test_51UC7NdAwSDHONOWRcyJtGMv2qEKYoddr3BV1vo0xdg7B1Kc2Yvq';
const RK_A = 'rk_test_51UC7NdAwSDHONOWRotracosaqueesotrosecreto12345';
const RK_B = 'rk_test_51UC7j6BbW5nITFIjotracuentadistinta9876543210';

comprobar('dos claves de la misma cuenta se reconocen',
  comoElPhp(PK_A) !== '' && comoElPhp(PK_A) === comoElPhp(RK_A));

comprobar('dos claves de cuentas distintas NO se confunden',
  comoElPhp(PK_A) !== comoElPhp(RK_B),
  'ese era el caso que dejaba el formulario vacio');

comprobar('una clave con forma rara no opina',
  comoElPhp('esto-no-es-una-clave') === '',
  'sin poder saberlo, no se bloquea el cobro por una sospecha');

comprobar('el servidor comprueba la cuenta al guardar la publicable',
  cuerpoDelCaso('guardar_config').includes('cuentaDeClaveStripe('),
  'hay que decirlo cuando se pega, no cuando falle el formulario');

comprobar('y losPagosEstanListos la tiene en cuenta',
  /function losPagosEstanListos[\s\S]*?cuentaDeClaveStripe\(/.test(libPagos),
  'vive en _lib/pagos.php desde que chat.php necesito la misma regla');

comprobar('la regla no esta duplicada en chat.php',
  !/pagos_listos[\s\S]{0,400}\$pub !== ''/.test(
    readFileSync(join(AQUI, '..', 'admin', 'api', 'chat.php'), 'utf8')),
  'dos copias de "se puede cobrar" ya se contradijeron una vez');

comprobar('config no repite la regla a mano',
  /'listo'\s*=>\s*losPagosEstanListos\(\)/.test(php),
  'dos definiciones de "se puede cobrar" acaban contradiciendose');


/* --- 7. Quien puede confirmar un cobro ----------------------------- */

console.log('\nMegaBot propone; confirmar lo hace una persona\n');

const chat = readFileSync(join(AQUI, '..', 'admin', 'api', 'chat.php'), 'utf8');
/* Ojo: la whitelist del panel está en 32-asistente.js, NO en 50-pagos.js
   —que es lo que tiene cargado la variable `panel` de más arriba—. Se
   lee el archivo que corresponde. */
const asistente = readFileSync(
  join(AQUI, '..', 'admin', 'codigo', '32-asistente.js'), 'utf8');

const listaChat  = /ACCIONES_PERMITIDAS_PARA_MEGABOT = \[([\s\S]*?)\];/.exec(chat);
const listaPanel = /ACCIONES_PERMITIDAS_PARA_MEGABOT = \[([\s\S]*?)\];/.exec(asistente);

for (const [donde, m] of [['chat.php', listaChat], ['32-asistente.js', listaPanel]]) {
  comprobar('confirmar NO esta en la whitelist de ' + donde,
    !!m && !m[1].includes('accion=confirmar'),
    'seria darle a MegaBot las dos mitades: proponer Y aprobar el cobro');
}

comprobar('proponer si esta permitido',
  !!listaChat && listaChat[1].includes('accion=proponer'),
  'proponer no cobra: es literalmente el trabajo de MegaBot');

comprobar('proponer no pide contrasena',
  !cuerpoDelCaso('proponer').includes('exigirContrasenaDeNuevo('),
  'cobrarle friccion a algo que no mueve dinero solo estorba');

comprobar('confirmar si la pide',
  cuerpoDelCaso('confirmar').includes('exigirContrasenaDeNuevo('));

comprobar('confirmar solo cobra lo que esta esperando',
  /\$pedido\['estado'\][\s\S]{0,120}!== 'propuesta'/.test(cuerpoDelCaso('confirmar')),
  'una compra ya cobrada no puede volver a cobrarse por tocar dos veces');


/* ─── DESHACER: cancelar y devolver (2026-09-06) ─────────────────── */

console.log('\nDeshacer una compra\n');

const cancelar   = cuerpoDelCaso('cancelar');
const reembolsar = cuerpoDelCaso('reembolsar');

comprobar('cancelar solo toca propuestas',
  /\$pedido\['estado'\][\s\S]{0,120}!== 'propuesta'/.test(cancelar),
  'dejar que cancele una cobrada seria marcarla como no cobrada con la plata afuera');

comprobar('cancelar NO habla con Stripe',
  !cancelar.includes('pedirleAStripe('),
  'no se cobro nada, no hay nada que devolver');

comprobar('cancelar no pide contrasena',
  !cancelar.includes('exigirContrasenaDeNuevo('),
  'no mueve un peso: la friccion ahi solo estorba');

comprobar('reembolsar solo toca cobradas',
  /\$pedido\['estado'\][\s\S]{0,120}!== 'cobrada'/.test(reembolsar),
  'devolver algo que nunca se cobro no tiene sentido');

comprobar('reembolsar SI pide contrasena',
  reembolsar.includes('exigirContrasenaDeNuevo('),
  'devolver dinero es mover dinero: mismas guardas que cobrarlo');

comprobar('reembolsar exige que los pagos esten listos',
  reembolsar.includes('exigirPagosListos('));

comprobar('reembolsar usa clave de idempotencia derivada del pedido',
  /'devolucion-' \. \$pedidoId/.test(reembolsar),
  'con una clave al azar, dos toques devolverian dos veces');

/* La ventana es generosa a proposito: entre la lectura del campo y el
   responderMal hay un comentario que explica por que se corta ahi, y una
   ventana justa haria fallar la comprobacion cada vez que alguien
   documente mejor el codigo. Lo que importa es que el corte exista
   ANTES de llamar a Stripe, no cuantas lineas ocupe. */
comprobar('reembolsar no sigue sin el id de Stripe',
  /stripe_payment_intent_id[\s\S]{0,700}responderMal[\s\S]*?pedirleAStripe/.test(reembolsar),
  'sin ese numero no se puede pedir la devolucion, y hay que decirlo');

comprobar('las dos quedan en la bitacora',
  cancelar.includes('anotarEnBitacora(') && reembolsar.includes('anotarEnBitacora('));

comprobar('devolver avisa por correo',
  reembolsar.includes('avisarDeMovimientoDeDinero('),
  'todo movimiento de dinero se avisa, tambien el que lo devuelve');

// El panel no puede ofrecer botones que el servidor va a rechazar.
comprobar('el panel solo ofrece Cancelar en propuestas',
  /estado === 'propuesta'[\s\S]{0,200}data-cancelar/.test(panel));

comprobar('el panel solo ofrece Devolver en cobradas',
  /estado === 'cobrada'[\s\S]{0,200}data-devolver/.test(panel));

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' guarda(s) del dinero fallaron.\n');
  process.exit(1);
}
console.log('✓ Las guardas del dinero están puestas y en orden.\n');
