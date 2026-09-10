/* Comprueba que una invitación se llame IGUAL en todas partes, y que el
 * nombre para mostrar no se guarde nunca como si fuera un dato.
 *
 * POR QUÉ EXISTE
 * El 2026-09-09, abriendo enlaces reales uno por uno, apareció esto: el
 * sobre saludaba "Para Andy" y el formulario, más abajo en la MISMA
 * página, decía "Andy y familia". La regla que agrega " y familia"
 * estaba adentro de 11-formulario-confirmacion.js y la llamaba un solo
 * lugar; el sobre (04) usaba `datos.nombre` crudo. Dos reglas para lo
 * mismo, en dos archivos, como el menú que mostraba «correo».
 *
 * Y había algo peor debajo. Ese " y familia" se escribía dentro del
 * input `#campo-nombre`, que es el que viaja en el POST a confirmar.php.
 * Confirmando la invitación de prueba «Prueba Recorrido» quedó guardada
 * como «Prueba Recorrido y familia», y la lista de Gente muestra ese
 * campo: Lucila escribía un nombre y el panel pasaba a mostrar otro,
 * para siempre, sin forma de distinguirlo de un nombre tecleado.
 *
 * Las dos fallan calladas: nadie ve un error, solo un nombre distinto en
 * otra pantalla. `node --check` no las ve — las dos versiones son
 * sintácticamente válidas.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const utilidades = readFileSync(raiz('codigo', '02-utilidades.js'), 'utf8');
const sobre      = readFileSync(raiz('codigo', '04-invitado-personalizado.js'), 'utf8');
const formulario = readFileSync(raiz('codigo', '11-formulario-confirmacion.js'), 'utf8');
const pase       = readFileSync(raiz('codigo', '12-pase-de-acceso.js'), 'utf8');
const html       = readFileSync(raiz('index.html'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* ─── 1. La regla, ejecutada de verdad ───────────────────────────── */

console.log('\nLa regla del nombre, corriéndola\n');

/* Se EJECUTA la función en vez de leer su texto: el bug era de
   comportamiento, no de cómo estaba escrita. */
const desde = utilidades.indexOf('function nombreDelGrupo(');
const hasta = utilidades.indexOf('\n}', desde);
if (desde === -1 || hasta === -1) {
  console.error('\n✗ No se encontró nombreDelGrupo() en 02-utilidades.js.\n');
  process.exit(1);
}
const fuente = utilidades.slice(desde, hasta + 2);
const nombreDelGrupo = new Function(fuente + '\nreturn nombreDelGrupo;')();

comprobar('una sola persona se llama por su nombre',
  nombreDelGrupo('Andy', 1) === 'Andy', nombreDelGrupo('Andy', 1));
comprobar('dos lugares o más son "y familia"',
  nombreDelGrupo('Andy', 2) === 'Andy y familia', nombreDelGrupo('Andy', 2));
comprobar('no se escribe "Familia Zelaya y familia"',
  nombreDelGrupo('Familia Zelaya', 4) === 'Familia Zelaya', nombreDelGrupo('Familia Zelaya', 4));
comprobar('ni "Ana y Luis y familia"',
  nombreDelGrupo('Ana y Luis', 3) === 'Ana y Luis', nombreDelGrupo('Ana y Luis', 3));
comprobar('"Flia" también cuenta como plural',
  nombreDelGrupo('Flia Pérez', 3) === 'Flia Pérez', nombreDelGrupo('Flia Pérez', 3));
comprobar('un nombre vacío no inventa "y familia"',
  nombreDelGrupo('', 5) === '', JSON.stringify(nombreDelGrupo('', 5)));
comprobar('no se acumula al aplicarla dos veces',
  nombreDelGrupo(nombreDelGrupo('Andy', 2), 2) === 'Andy y familia',
  nombreDelGrupo(nombreDelGrupo('Andy', 2), 2));

/* ─── 2. Una sola regla, no una por archivo ──────────────────────── */

console.log('\nUna sola regla para todos\n');

/* La cadena literal, entre comillas: en prosa los comentarios la
   escriben con comillas dobles, así que esto cuenta CÓDIGO. */
const conLaReglaEscritaAMano = [
  ['02-utilidades.js', utilidades],
  ['04-invitado-personalizado.js', sobre],
  ['11-formulario-confirmacion.js', formulario],
  ['12-pase-de-acceso.js', pase],
].filter(([, texto]) => texto.includes("' y familia'")).map(([nombre]) => nombre);

comprobar('" y familia" se escribe en un solo archivo',
  conLaReglaEscritaAMano.length === 1 && conLaReglaEscritaAMano[0] === '02-utilidades.js',
  conLaReglaEscritaAMano.join(', ') || 'en ninguno');

comprobar('el sobre pregunta a nombreDelGrupo()',
  sobre.includes('nombreDelGrupo('));
comprobar('el sobre ya no saluda con el nombre crudo',
  !sobre.includes("'Para ' + limpiarTexto(datos.nombre)"));
comprobar('el formulario pregunta a nombreDelGrupo()',
  formulario.includes('nombreDelGrupo('));
comprobar('el pase pregunta a nombreDelGrupo()',
  pase.includes('nombreDelGrupo('));

/* ─── 3. Lo que se muestra no es lo que se guarda ────────────────── */

console.log('\nEl cartel no viaja al servidor\n');

comprobar('el titular se guarda aparte al llenar el campo',
  formulario.includes('dataset.nombreDelTitular ='));
comprobar('el envío manda el titular, no el cartel',
  formulario.includes('campoNombre.dataset.nombreDelTitular || campoNombre.value'));
comprobar('el envío ya NO toma campoNombre.value a secas',
  !/const nombre\s+= campoNombre\.value\.trim\(\);/.test(formulario));

/* ─── 4. El trato en plural ──────────────────────────────────────── */

console.log('\nHablarle de a varios a los grupos\n');

const variantes = [...html.matchAll(/data-plural="([^"]+)"/g)].map(m => m[1]);
comprobar('hay textos con versión en plural', variantes.length >= 6,
  variantes.length + ' encontradas');
comprobar('ninguna variante quedó vacía',
  variantes.every(t => t.trim().length > 0));
comprobar('existe quien las aplica',
  formulario.includes('function ajustarTratoAlGrupo'));
comprobar('y se llama con los lugares de la invitación',
  formulario.includes('ajustarTratoAlGrupo(esGrupoDeVarios('));
comprobar('el original se guarda para no acumular reemplazos',
  formulario.includes('dataset.singular'));
comprobar('esGrupoDeVarios() vive junto a nombreDelGrupo()',
  utilidades.includes('function esGrupoDeVarios'));

/* ─── 4b. La frase que se le escapó al trato de grupo ────────────── */

/* POR QUÉ (2026-09-09, la ronda siguiente). El arreglo de arriba movió
   al HTML todos los textos de la sección… menos uno. "Hemos reservado N
   lugares para ustedes. Pueden modificar su respuesta cuantas veces
   gusten" se arma en el JS porque interpola el número, y se armaba
   SIEMPRE en plural: una invitación de un solo lugar leía "1 lugar para
   ustedes". Peor, corre DESPUÉS de ajustarTratoAlGrupo(), así que
   pisaba cualquier intento de resolverlo desde el HTML.
   Lo reportó el usuario con una captura de una invitación de 1 lugar. */

console.log('\nLa frase de "Hemos reservado"\n');

/* ⚠️ SIN LOS COMENTARIOS. El comentario que explica este arreglo nombra
   `datos.pases` para contar qué se hacía antes, y la comprobación de
   abajo lo contaba como si el código siguiera usándolo: la prueba
   fallaba con el arreglo puesto. Se mira el código, no la prosa.
   (Solo bloques y líneas que EMPIEZAN con //: barrer todo lo que
   parezca // se comería cualquier línea con un "https://" adentro.) */
const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const introduccion = sinComentarios(formulario.slice(
  formulario.indexOf("buscar('.formulario__introduccion')"),
  formulario.indexOf('const cajaCantidad')));

comprobar('la frase tiene su versión de a uno',
  introduccion.includes('para ti. Puedes modificar tu respuesta'));
comprobar('y conserva la de a varios',
  introduccion.includes('para ustedes. Pueden modificar su respuesta'));
comprobar('elige con la misma regla que el resto de la sección',
  introduccion.includes('esGrupoDeVarios('));
comprobar('el número y el pronombre salen de la misma cuenta',
  introduccion.includes('cuantosLugares(datos)') && !introduccion.includes('datos.pases'),
  introduccion.includes('datos.pases') ? 'todavía usa datos.pases' : '');
comprobar('ya no habla de a varios sin preguntar',
  !/'<\/strong> para ustedes/.test(introduccion));

/* ─── 5. El código del pase se toca y se copia ───────────────────── */

console.log('\nEl código del pase, del lado del invitado\n');

comprobar('el pase prepara su código para copiarse',
  pase.includes('function prepararCodigoCopiable'));
comprobar('se puede llegar con el teclado',
  pase.includes("setAttribute('tabindex', '0')"));
comprobar('un lector de pantalla sabe que es un botón',
  pase.includes("setAttribute('role', 'button')"));
comprobar('no se engancha dos veces al reabrir el pase',
  pase.includes('copiadoEnganchado'));
comprobar('si el portapapeles falla, no dice que copió',
  pase.includes('No se pudo copiar'));

const css = readFileSync(raiz('estilos', '08-pase-de-acceso.css'), 'utf8');
const bloqueCodigo = css.slice(css.indexOf('.pase__codigo {'), css.indexOf('.pase__aviso'));
comprobar('el código se ve tocable', bloqueCodigo.includes('cursor: pointer'));
comprobar('y se puede seleccionar entero con el dedo',
  bloqueCodigo.includes('user-select: all'));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ La invitación se llama igual en todas partes.\n');
