/* Comprueba el latido dorado de las casillas que desbloquean el menú.
 *
 * POR QUÉ EXISTE
 * La casilla de cada persona es la llave de todo lo que sigue: hasta que
 * no se marca una, los menús no aparecen y el contador dice "0 de N
 * lugares confirmados". Quieta y apagada no se lee como "tocame". El
 * 2026-09-09 se le puso un latido lento de oro para señalarla.
 *
 * QUÉ PUEDE SALIR MAL, Y NO SE VE
 *
 *   · QUE QUEDE ENCENDIDA PARA SIEMPRE. Las dos redes que apagan
 *     animaciones (html.animaciones-off y prefers-reduced-motion, en
 *     01-fundamentos.css) NO las cancelan: les ponen duración .01ms e
 *     iteración 1, o sea que SALTAN AL ÚLTIMO FOTOGRAMA. Si el brillo
 *     viviera en el 100%, quien pidió menos movimiento se quedaría con
 *     todas las casillas encendidas, fijas, para siempre. Tiene que
 *     empezar y terminar apagado, con el brillo en el medio.
 *
 *   · QUE LATA LA CASILLA EQUIVOCADA. La de alergia es otra pregunta y
 *     no desbloquea nada; si latiera, señalaría hacia el lado que no es.
 *
 *   · QUE NUNCA SE APAGUE. Late mientras no hay NINGUNA marcada. Si el
 *     `:not(:has(...))` se cae, late mientras quede alguna sin marcar —
 *     y alguien puede dejar a un tío sin marcar a propósito: esa
 *     casilla latiría toda la noche como si estuviera mal.
 *
 *   · QUE NO LLEGUE A PRODUCCIÓN. El CSS de estilos/ no se sirve: viaja
 *     incrustado en index.html y hay que correr empaquetar.mjs. Editar
 *     la hoja y olvidarse del empaquetado deja el arreglo en la
 *     computadora y nada en el sitio.
 *
 * Las cuatro fallan calladas y ninguna la ve `node --check`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const hoja  = readFileSync(raiz('estilos', '07-formulario.css'), 'utf8');
const index = readFileSync(raiz('index.html'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* Se mira el CSS sin comentarios: la prosa de arriba nombra justo lo que
   estas comprobaciones prohíben, y contarla como código las volvería
   ciegas. Es el mismo agujero que apareció en prueba-etiquetas-de-edad. */
const sinComentarios = texto => texto.replace(/\/\*[\s\S]*?\*\//g, '');

const css = sinComentarios(hoja);

/* ─── 1. El latido existe y apunta a la casilla correcta ─────────── */

console.log('\nA quién señala\n');

const regla = (css.match(/#menus-de-adultos[^{]*\{[^}]*latido-de-oro[^}]*\}/) || [''])[0];

comprobar('hay una regla que enciende el latido', regla.length > 0);
comprobar('late la casilla que desbloquea el menú',
  regla.includes('[data-persona-marcada]'));
comprobar('NO late la de alergia',
  !regla.includes('data-persona-tiene-alergia'));
comprobar('se apaga en cuanto hay una marcada',
  regla.includes(':not(:has(') && regla.includes(':checked'),
  'sin el :not(:has(...)) late mientras quede alguna sin marcar');
comprobar('late despacio, no parpadea',
  /latido-de-oro\s+([2-9](\.\d+)?|1\d)s/.test(regla),
  (regla.match(/latido-de-oro\s+[\d.]+m?s/) || ['sin duración'])[0]);
comprobar('late sin parar mientras haga falta',
  regla.includes('infinite'));

/* ─── 2. Empieza y termina apagado ───────────────────────────────── */

console.log('\nDónde vive el brillo\n');

const bloque = (css.match(/@keyframes\s+latido-de-oro\s*\{[\s\S]*?\n\}/) || [''])[0];
comprobar('los fotogramas existen', bloque.length > 0);

/* Las puntas (0% y 100%) tienen que ser transparentes; el brillo, del
   medio. Se lee el alfa del rgba de cada fotograma. */
const puntas = (bloque.match(/0%,\s*100%\s*\{[^}]*\}/) || [''])[0];
const medio  = (bloque.match(/\n\s*50%\s*\{[^}]*\}/)  || [''])[0];

comprobar('las dos puntas van juntas en un fotograma', puntas.length > 0);
comprobar('la punta está apagada (alfa 0)',
  /rgba\([^)]*,\s*0\s*\)/.test(puntas), puntas.trim().slice(0, 70));
comprobar('el brillo vive en el 50 %', medio.length > 0 && /rgba\([^)]*,\s*\.?\d/.test(medio));
comprobar('el brillo NO vive en el 100 %',
  !/100%\s*\{[^}]*rgba\([^)]*,\s*(0?\.\d+|[1-9])\s*\)/.test(bloque),
  'con menos movimiento quedaría encendida para siempre');

/* ─── 3. Llegó al archivo que se sirve ───────────────────────────── */

console.log('\nEmpaquetado\n');

comprobar('los fotogramas están dentro de index.html',
  index.includes('@keyframes latido-de-oro'),
  'falta correr: node herramientas/empaquetar.mjs');
comprobar('y la regla que los usa también',
  /#menus-de-adultos:not\(:has\([^)]*\)\)[^{]*\{[^}]*latido-de-oro/.test(index),
  'falta correr: node herramientas/empaquetar.mjs');

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El latido señala lo que hay que tocar, y se apaga cuando debe.\n');
