/* Comprueba que el botón de acción rápida haga sus DOS cosas: un toque
 * corre la primera herramienta, sostenerlo abre el menú con las tres.
 *
 * POR QUÉ EXISTE
 * Este botón cambió tres veces en un mismo día (ver la historia completa
 * en 29-fab.js) y cada vuelta rompió algo de la anterior:
 *
 *   · Con toque = MegaBot y sostenido = herramientas, lo configurable
 *     estaba detrás de un gesto que nada anunciaba.
 *   · Pasándolo todo al toque simple se ganó descubribilidad y se perdió
 *     la razón de ser del botón: lo más frecuente pasó a costar dos
 *     toques, en la capa que existe para el mínimo esfuerzo.
 *
 * Esta prueba fija la tercera forma para que no haya una cuarta por
 * accidente, y sobre todo fija las CONDICIONES que hacen que valga: que
 * el gesto esté anunciado, que exista sin dedo, y que soltar no deje la
 * pantalla con texto seleccionado.
 *
 * NINGUNA DE LAS CUATRO SE VE LEYENDO EL ARCHIVO NI CON node --check.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const fab = readFileSync(raiz('admin', 'codigo', '29-fab.js'), 'utf8');
const css = readFileSync(raiz('admin', 'estilos', '02-componentes.css'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const codigo = sinComentarios(fab);
const preparar = codigo.slice(
  codigo.indexOf('function prepararFab'),
  codigo.indexOf('function limpiarLaSeleccionDelSostenido'));

/* ─── 1. Los dos gestos existen ──────────────────────────────────── */

console.log('\nUn toque y un sostenido\n');

comprobar('el sostenido se cuenta con un reloj',
  preparar.includes('setTimeout') && /DEMORA_DEL_SOSTENIDO/.test(preparar));
comprobar('la demora es de gesto, no de reflejo',
  /DEMORA_DEL_SOSTENIDO\s*=\s*(3[5-9]\d|[4-9]\d\d)/.test(preparar),
  (preparar.match(/DEMORA_DEL_SOSTENIDO\s*=\s*\d+/) || ['sin demora'])[0] +
  ' — por debajo de ~350 ms un toque normal abre el menú sin querer');
comprobar('el toque corto corre la PRIMERA elegida',
  /elegidas\[0\]\.ejecutar\(\)/.test(preparar));
comprobar('sin herramientas elegidas, el toque abre el menú',
  /if \(!elegidas\.length\) \{ abrirSandwich\(\); return; \}/.test(preparar),
  'si no, el botón no haría nada la primera vez que se usa');

/* ⚠️ El click que llega DESPUÉS de un sostenido es el final del mismo
   gesto: si se deja pasar, ejecuta la primera herramienta con el menú
   ya abierto encima. */
comprobar('el click posterior al sostenido se descarta',
  /if \(yaAbrioElMenu\)/.test(preparar) && preparar.includes('preventDefault'),
  'si no, un sostenido abre el menú Y ejecuta la herramienta');

/* ─── 2. El conteo se cancela cuando debe ────────────────────────── */

console.log('\nNo abrirse solo\n');

for (const evento of ['pointerup', 'pointercancel', 'pointerleave']) {
  comprobar('se cancela con ' + evento, preparar.includes(evento));
}
comprobar('y si la pestaña se esconde a mitad del gesto',
  preparar.includes('visibilitychange'),
  'volver a la app con el menú abierto solo es desconcertante');

/* ─── 3. Existe sin dedo ─────────────────────────────────────────── */

console.log('\nTeclado y lector de pantalla\n');

comprobar('el menú tiene puerta con clic derecho',
  preparar.includes("'contextmenu'"),
  'es también la tecla de menú contextual del teclado');
comprobar('y con Shift',
  /evento\.shiftKey/.test(preparar),
  'un sostenido no existe para quien navega con teclado');
comprobar('el gesto se anuncia por escrito',
  codigo.includes('function anunciarLoQueHaceElFab') &&
  /setAttribute\('aria-label'/.test(codigo),
  'un gesto sin anunciar es, para quien usa la app, una función que no existe');
comprobar('el rótulo nombra la primera herramienta',
  /elegidas\[0\]\.nombre/.test(codigo));
comprobar('y se rehace cuando cambia la elección',
  (codigo.match(/anunciarLoQueHaceElFab\(\)/g) || []).length >= 2,
  'si no, el botón sigue prometiendo la herramienta vieja');

/* ─── 4. Soltar no deja texto seleccionado ───────────────────────── */

console.log('\nAl soltar, sin texto resaltado\n');

/* Sostener el dedo sobre un botón es, para el teléfono, el gesto de
   seleccionar texto. La hoja se abre DEBAJO del dedo a mitad del
   sostenido, así que la selección terminaba agarrando el rótulo de una
   de las tres opciones. */
/* ⚠️ SE PARSEA LA REGLA EXACTA, Y COSTÓ DOS INTENTOS.
   1º: cortar el archivo hasta el primer `user-select: none` y buscar
       ".boton," ahí. Pero ese trozo incluye el COMENTARIO que explica la
       regla, donde `.boton` aparece nombrado en prosa: sacarlo de la
       lista de verdad no hacía fallar nada.
   2º: una expresión regular sobre el archivo sin comentarios. Quitar los
       comentarios se lleva puestas las llaves que haya adentro de ellos,
       así que la captura se comía los selectores de la regla anterior y
       `.boton` seguía apareciendo igual.
   Lo que sí funciona: anclar en `-webkit-touch-callout`, que aparece una
   sola vez, y tomar el texto entre el final de lo anterior —una llave o
   el cierre de un comentario, lo que esté más cerca— y su `{`. */
const iCallout = css.indexOf('-webkit-touch-callout: none');
const iLlave   = css.lastIndexOf('{', iCallout);
const iInicio  = Math.max(css.lastIndexOf('}', iLlave) + 1,
                          css.lastIndexOf('*/', iLlave) + 2);
const selectoresSinSeleccion = iCallout === -1 ? []
  : css.slice(iInicio, iLlave).split(',').map(s => s.trim()).filter(Boolean);

comprobar('los botones no son texto seleccionable',
  selectoresSinSeleccion.includes('.boton'),
  'el menú del FAB está hecho de .boton: sin esto, se resalta un renglón');
comprobar('el FAB tampoco',
  selectoresSinSeleccion.includes('.boton-flotante'));
comprobar('y se limpia la selección que haya quedado',
  codigo.includes('limpiarLaSeleccionDelSostenido'),
  'el CSS evita que empiece; esto borra la que ya venía del FAB');
comprobar('se limpia también en el cuadro siguiente',
  /requestAnimationFrame\(borrar\)/.test(codigo),
  'la hoja recién se está insertando: limpiar antes no borra nada');

/* ─── 5. Una sola regla para las dos puertas ─────────────────────── */

console.log('\nEl toque y el menú miran la misma lista\n');

comprobar('la lista de elegidas vive en una sola función',
  (codigo.match(/function herramientasElegidasDelFab/g) || []).length === 1);
comprobar('el menú la usa',
  /const elegidas = herramientasElegidasDelFab\(\)/.test(codigo));
comprobar('el toque corto también',
  (codigo.match(/herramientasElegidasDelFab\(\)/g) || []).length >= 3,
  'con la cuenta escrita dos veces, el toque puede ejecutar algo que el menú no muestra');
comprobar('y filtra lo que esta cuenta no puede ver',
  /!h\.soloAdmin \|\| esAdmin/.test(codigo));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ Un toque hace lo frecuente; sostener abre el resto.\n');
