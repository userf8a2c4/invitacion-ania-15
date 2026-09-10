/* Comprueba el pie de la invitación: los dos créditos, y que la rosa ya
 * no abra nada.
 *
 * POR QUÉ EXISTE
 *
 * LA ROSA ERA UNA PUERTA. Tres toques en la rosa del pie abrían, en una
 * pestaña nueva, la hoja de Google con el registro de confirmaciones:
 * nombres, teléfonos y correos de los invitados. La invitación es
 * pública —cualquiera con el link la abre— y el gesto era discreto, no
 * privado: descubrirlo era tocar tres veces un adorno. Se desactivó el
 * 2026-09-09.
 *
 * Esta prueba existe porque una puerta así vuelve fácil: el elemento
 * sigue en el HTML, la URL sigue en la configuración y el CSS que la
 * hacía florecer sigue ahí. Basta con que alguien "restaure" el bloque
 * de la nota para que la puerta se reabra sin que nadie lo note.
 *
 * LOS CRÉDITOS SON DOS. La firma de Lucila y la de quien la construyó,
 * en la misma tipografía y el mismo tono. Un empaquetado que se lleve
 * puesto uno de los dos no rompe nada —la página se ve perfecta— y por
 * eso nadie se entera.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const registro = readFileSync(raiz('codigo', '15-registro-de-confirmaciones.js'), 'utf8');
const index    = readFileSync(raiz('index.html'), 'utf8');
const hoja     = readFileSync(raiz('estilos', '06-secciones.css'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

/* ─── 1. La rosa no abre nada ────────────────────────────────────── */

console.log('\nLa rosa es un adorno\n');

const codigo = sinComentarios(registro);

comprobar('nadie escucha toques en la rosa',
  !codigo.includes('rosa-secreta'),
  'volvió el gesto: tres toques y se abre la hoja con los datos');
comprobar('no queda un contador de toques',
  !/TOQUES_NECESARIOS/.test(codigo));
comprobar('y no se abre ninguna pestaña desde este archivo',
  !/window\.open\(/.test(codigo),
  'era window.open(direccion) con la hoja de Google');

/* La URL sigue en la configuración —la usa el anotado automático— pero
   no tiene que haber ningún camino que la ABRA desde la página. */
comprobar('la hoja no se abre desde ninguna parte del sitio público',
  !/window\.open\([^)]*urlDeLaHoja/.test(codigo));

/* El elemento se deja en el HTML a propósito (lo dibuja el CSS), pero
   sin nada que sugiera que es tocable. */
comprobar('la rosa sigue en el pie, como adorno',
  index.includes('id="rosa-secreta"'));
comprobar('y no se anuncia como botón',
  !/id="rosa-secreta"[^>]*role="button"/.test(index) &&
  !/id="rosa-secreta"[^>]*tabindex/.test(index));

/* ─── 2. Los dos créditos del pie ────────────────────────────────── */

console.log('\nQuién la pensó y quién la construyó\n');

const pie = index.slice(index.indexOf('<footer id="pie-de-pagina">'),
                        index.indexOf('</footer>'));

comprobar('está la firma de Lucila',
  pie.includes('From the mind of Lucila García'));
comprobar('y está la de quien la construyó',
  pie.includes('Powered by VectisDev'));
comprobar('las dos con la misma tipografía',
  (pie.match(/class="pie__firma/g) || []).length === 2,
  'si una no lleva pie__firma, se ve de otro tamaño y otro tono');
comprobar('la de abajo va pegada a la de arriba',
  hoja.includes('.pie__firma--taller'),
  'sin su regla, quedan separadas como dos bloques sueltos');
comprobar('y esa regla llegó al empaquetado',
  index.includes('.pie__firma--taller'),
  'falta correr: node herramientas/empaquetar.mjs');

/* El orden importa: primero quien pensó la fiesta. */
comprobar('primero Lucila, después nosotros',
  pie.indexOf('From the mind of') < pie.indexOf('Powered by VectisDev'));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El pie firma dos veces y la rosa no abre ninguna puerta.\n');
