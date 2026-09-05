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

const cobrar = cuerpoDelCaso('cobrar');
comprobar('el cobro la deriva del id del pedido',
  /payment_intents[\s\S]*?'pedido-' \. \$pedidoId/.test(cobrar),
  'con una clave al azar cada reintento sería un cobro nuevo');

comprobar('la clave del cobro NO es aleatoria',
  !/payment_intents[\s\S]{0,900}(uniqid|mt_rand|random_bytes|bin2hex)/.test(cobrar),
  'un valor distinto en cada intento no protege de nada');

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
  ['cobrar',            'cobro'],
]) {
  comprobar('avisa del ' + que,
    cuerpoDelCaso(accion).includes('avisarDeMovimientoDeDinero('));
}

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

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' guarda(s) del dinero fallaron.\n');
  process.exit(1);
}
console.log('✓ Las guardas del dinero están puestas y en orden.\n');
