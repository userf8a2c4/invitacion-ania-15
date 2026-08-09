/* ══════════════════════════════════════════════════════════════════════
   SUBIR VERSIÓN · el paso obligatorio antes de subir cambios al hosting
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   Cambia de una sola pasada el número de versión en TODOS los lugares
   donde vive:

     · los ~40 `?v=NN` de index.html (las hojas de estilo y los scripts)
     · la constante VERSION de sw.js (el service worker)

   POR QUÉ ES OBLIGATORIO Y NO OPCIONAL
   El servidor (.htaccess) le dice al navegador que guarde el CSS y el JS
   durante UN AÑO sin volver a preguntar. Eso es lo que hace que la web
   abra al instante en la segunda visita, y es lo correcto… siempre que
   cada cambio venga con una dirección nueva.

   El `?v=NN` es esa dirección nueva: para el navegador,
   `01-fundamentos.css?v=43` y `01-fundamentos.css?v=44` son dos archivos
   distintos, así que al subir el número se baja el nuevo sí o sí.

   ⚠️ SI SE SUBEN CAMBIOS SIN CORRER ESTO, los invitados que ya habían
   entrado seguirían viendo la versión vieja, y no habría forma de
   arreglarlo desde acá: habría que pedirles que vacíen el caché. Antes
   este número se cambiaba a mano en tres sitios distintos, y ya se
   desincronizó una vez (un archivo quedó en v=44 y el resto en v=43).
   Por eso ahora lo hace este script.

   CÓMO SE USA
   Desde una terminal, parado en la carpeta del proyecto:

       node herramientas/subir-version.mjs

   Sube el número al siguiente (44 → 45). Y si se quiere uno concreto:

       node herramientas/subir-version.mjs 50

   NO SE SUBE AL HOSTING: es una herramienta de trabajo. El .htaccess
   además bloquea la carpeta herramientas/ por las dudas.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaIndex = join(raiz, 'index.html');
const rutaSw = join(raiz, 'sw.js');

const html = readFileSync(rutaIndex, 'utf8');
const sw = readFileSync(rutaSw, 'utf8');

/* ─── 1. Averiguar en qué versión estamos ─────────────────────────────
   Se mira el número MÁS ALTO que haya en index.html. Si alguna vez
   quedaron desincronizados, así se parte del mayor y se los alinea a
   todos, en vez de arrastrar el error. */
const versionesEncontradas = [...html.matchAll(/\?v=(\d+)/g)].map(m => Number(m[1]));

if (versionesEncontradas.length === 0) {
  console.error('✗ No se encontró ningún ?v=NN en index.html. ¿Está bien la ruta?');
  process.exit(1);
}

const versionActual = Math.max(...versionesEncontradas);
const pedidaPorElUsuario = process.argv[2] ? Number(process.argv[2]) : null;

if (pedidaPorElUsuario !== null && !Number.isInteger(pedidaPorElUsuario)) {
  console.error('✗ La versión tiene que ser un número entero. Ejemplo: node herramientas/subir-version.mjs 50');
  process.exit(1);
}

const versionNueva = pedidaPorElUsuario ?? versionActual + 1;

if (versionNueva <= versionActual && pedidaPorElUsuario === null) {
  console.error('✗ Algo salió mal calculando la versión nueva.');
  process.exit(1);
}

/* ─── 2. Reescribir index.html ────────────────────────────────────── */
let cuantosCambiaron = 0;
const htmlNuevo = html.replace(/\?v=\d+/g, () => {
  cuantosCambiaron++;
  return `?v=${versionNueva}`;
});

/* ─── 3. Reescribir la VERSION del service worker ─────────────────── */
const patronSw = /const VERSION = '([\w-]+?)-v\d+';/;
const coincidenciaSw = sw.match(patronSw);

if (!coincidenciaSw) {
  console.error("✗ No se encontró `const VERSION = '…-vNN';` en sw.js. No se tocó ningún archivo.");
  process.exit(1);
}

const swNuevo = sw.replace(patronSw, `const VERSION = '${coincidenciaSw[1]}-v${versionNueva}';`);

/* ─── 4. Recién ahora se escribe, cuando ya sabemos que todo salió bien ── */
writeFileSync(rutaIndex, htmlNuevo);
writeFileSync(rutaSw, swNuevo);

const desalineados = new Set(versionesEncontradas).size > 1;

console.log(`✓ Versión ${versionActual} → ${versionNueva}`);
console.log(`  index.html: ${cuantosCambiaron} referencias actualizadas`);
console.log(`  sw.js:      ${coincidenciaSw[1]}-v${versionNueva}`);
if (desalineados) {
  console.log(`  (se encontraron versiones mezcladas: ${[...new Set(versionesEncontradas)].sort((a, b) => a - b).join(', ')} — quedaron todas alineadas)`);
}
console.log('');
console.log('Ahora sí, ya se pueden subir los archivos al hosting.');
