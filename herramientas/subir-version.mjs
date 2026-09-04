/* ══════════════════════════════════════════════════════════════════════
   SUBIR VERSIÓN · el paso obligatorio antes de subir cambios al hosting
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   Cambia de una sola pasada el número de versión en TODOS los lugares
   donde vive:

     · los ~40 `?v=NN` de index.html (las hojas de estilo y los scripts)
     · la constante VERSION de sw.js (el service worker del sitio)
     · la constante VERSION de admin/sw.js (el service worker del panel)

   POR QUÉ TAMBIÉN TOCA admin/sw.js
   El panel tiene su propio Service Worker, con su propia estrategia
   (abre al instante desde una copia guardada y refresca por detrás —
   ver la nota grande en admin/sw.js). Ese refresco por detrás ya deja
   ver el código nuevo solo, sin este script: admin/.htaccess pone
   "no-cache, must-revalidate" en todo su HTML/CSS/JS, así que nunca
   queda una versión vieja atrapada para siempre.

   Lo que SÍ depende de que este número suba es el cartel "hay una
   actualización" que ofrece recargar con un toque
   (avisarSiHayActualizacion(), admin/codigo/20-arranque.js) — ese
   cartel solo aparece cuando el Service Worker del panel detecta que
   su propia VERSION cambió. Antes había que acordarse de subirla a
   mano, aparte, y era fácil de olvidar justo en el momento en que más
   importa avisar: al promover una rama con cambios de verdad.

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

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ─── 0. ¿EL CÓDIGO QUE SE VA A SERVIR ESTÁ AL DÍA? ───────────────────
 *
 * ⚡ POR QUÉ ESTO EXISTE (2026-09-03)
 * index.html sirve `codigo/produccion/*.js`, que son las copias
 * minificadas que genera `minificar-js.mjs`. Este script subía la
 * versión sin mirarlas — o sea que se podía arreglar un bug, subir la
 * versión, desplegar, y que a la gente le siguiera llegando el código
 * viejo, porque el minificado nunca se regeneró.
 *
 * Pasó de verdad: el arreglo del reproductor de música quedó en el repo
 * y NO en producción durante un despliegue entero. Nada lo advirtió.
 *
 * Comparar fechas es más honesto que confiar en que alguien se acuerde
 * de correr dos comandos en el orden correcto. Si un fuente es más nuevo
 * que su minificado, esto CORTA antes de tocar nada — porque subir la
 * versión con el código viejo es peor que no subirla: invalida las
 * cachés y reparte lo de antes como si fuera lo nuevo.
 */
const dirFuente = join(raiz, 'codigo');
const dirProduccion = join(raiz, 'codigo', 'produccion');

if (existsSync(dirProduccion)) {
  const desactualizados = [];

  for (const archivo of readdirSync(dirFuente)) {
    if (!archivo.endsWith('.js')) continue;

    const fuente = join(dirFuente, archivo);
    const minificado = join(dirProduccion, archivo);

    if (!existsSync(minificado)) {
      desactualizados.push(`${archivo} (no existe su minificado)`);
      continue;
    }
    if (statSync(fuente).mtimeMs > statSync(minificado).mtimeMs) {
      desactualizados.push(archivo);
    }
  }

  if (desactualizados.length) {
    console.error('');
    console.error('✗ NO se subió la versión: hay código sin minificar.');
    console.error('');
    console.error('  Estos archivos de codigo/ son más nuevos que su copia');
    console.error('  en codigo/produccion/, que es la que se sirve de verdad:');
    desactualizados.forEach(a => console.error(`    · ${a}`));
    console.error('');
    console.error('  Corré esto y volvé a intentar:');
    console.error('    node herramientas/minificar-js.mjs');
    console.error('');
    process.exit(1);
  }
}
const rutaIndex = join(raiz, 'index.html');
const rutaSw = join(raiz, 'sw.js');
const rutaSwAdmin = join(raiz, 'admin', 'sw.js');

const html = readFileSync(rutaIndex, 'utf8');
const sw = readFileSync(rutaSw, 'utf8');
// El del panel es opcional acá: si algún día no existiera, este script
// no tiene por qué dejar de funcionar para el sitio público.
const swAdmin = existsSync(rutaSwAdmin) ? readFileSync(rutaSwAdmin, 'utf8') : null;

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

/* ─── 3b. Lo mismo para el Service Worker del panel, si existe ────────
   Mismo patrón exacto (`'ania-admin-v59'`), así que alcanza con la
   misma expresión regular. Se sube al MISMO número que el sitio
   público, no a uno propio — más fácil de leer un solo "estamos en la
   126 en todos lados" que llevar dos contadores separados. */
let coincidenciaSwAdmin = null;
let swAdminNuevo = null;
if (swAdmin !== null) {
  coincidenciaSwAdmin = swAdmin.match(patronSw);
  if (!coincidenciaSwAdmin) {
    console.error("✗ No se encontró `const VERSION = '…-vNN';` en admin/sw.js. No se tocó ningún archivo.");
    process.exit(1);
  }
  swAdminNuevo = swAdmin.replace(patronSw, `const VERSION = '${coincidenciaSwAdmin[1]}-v${versionNueva}';`);
}

/* ─── 4. Recién ahora se escribe, cuando ya sabemos que todo salió bien ── */
writeFileSync(rutaIndex, htmlNuevo);
writeFileSync(rutaSw, swNuevo);
if (swAdmin !== null) writeFileSync(rutaSwAdmin, swAdminNuevo);

const desalineados = new Set(versionesEncontradas).size > 1;

console.log(`✓ Versión ${versionActual} → ${versionNueva}`);
console.log(`  index.html: ${cuantosCambiaron} referencias actualizadas`);
console.log(`  sw.js:      ${coincidenciaSw[1]}-v${versionNueva}`);
if (swAdmin !== null) {
  console.log(`  admin/sw.js: ${coincidenciaSwAdmin[1]}-v${versionNueva}`);
} else {
  console.log('  admin/sw.js: no se encontró, se lo saltó');
}
if (desalineados) {
  console.log(`  (se encontraron versiones mezcladas: ${[...new Set(versionesEncontradas)].sort((a, b) => a - b).join(', ')} — quedaron todas alineadas)`);
}
console.log('');
console.log('Ahora sí, ya se pueden subir los archivos al hosting.');
