/* ══════════════════════════════════════════════════════════════════════
   EMPAQUETAR · junta las 14 hojas de estilo en un <style> inline
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   Junta los 14 archivos de estilos/ en uno solo, minificado, y lo escribe
   DENTRO de index.html, entre los marcadores:

       <!-- ESTILOS-EMPAQUETADOS-INICIO -->
       <style>...</style>
       <!-- ESTILOS-EMPAQUETADOS-FIN -->

   NO es un <link> externo — ver la explicación completa (por qué inline,
   y por qué esta vez es una técnica distinta a las dos que ya se
   probaron y se descartaron) en el comentario de esa sección de
   index.html.

   ⛔ EL JAVASCRIPT NO SE EMPAQUETA ACÁ, Y ES A PROPÓSITO
   El JS tiene su propia herramienta (herramientas/minificar-js.mjs) que
   lo minifica SIN juntarlo en un solo archivo — ver la explicación
   completa ahí. Con el CSS no hay ese riesgo: el CSS no se compila ni se
   ejecuta, solo se parsea, así que juntarlo no genera ninguna tarea larga
   de las que sí le importan al "tiempo de bloqueo" (Total Blocking Time).

   POR QUÉ NO SE TOCAN LOS ARCHIVOS ORIGINALES
   Los 14 archivos de estilos/ siguen existiendo, intactos y comentados en
   español: son los que se editan siempre. Este script solo LEE su
   contenido y arma el bloque empaquetado; nunca escribe en ellos.

   SÍ SE MINIFICA (basado en texto, sin parser — ver por qué es seguro)
   Dos pasadas, las dos sin riesgo de romper nada:
     1. Sacar los comentarios de estilo C (barra-asterisco … asterisco-
        barra) y colapsar todo el espacio en blanco (saltos de línea incluidos) a un solo espacio.
        Es seguro en CSS —a diferencia de JS— porque el espacio en blanco
        NUNCA es significativo más allá de separar dos palabras: unir
        todo en una sola línea no cambia el significado de ninguna regla.
     2. Sacar el espacio pegado a `{` y a `}`, y el `;` que sobra justo
        antes de un `}` (la última declaración de un bloque no necesita
        punto y coma). Deliberadamente NO se toca el espacio alrededor de
        `:` ni de `,`: ahí SÍ puede haber selectores donde el espacio
        importa (por ejemplo `a :hover` es un selector distinto de
        `a:hover`), y la ganancia de tocarlos es mínima comparada con el
        riesgo. Mismo criterio conservador que el resto de este script.

   El único riesgo real serían strings con espacios/`;}` a propósito
   (`content: "a   b"`, `content: ";}"`), que este proyecto no usa.

   El resultado no se lee, así que no importa que pierda los comentarios:
   la copia de trabajo son los 14 archivos de estilos/, no esto.

   CÓMO SABE QUÉ ARCHIVOS JUNTAR
   Siempre de herramientas/_manifiesto-empaquetado.json (el orden de los
   14 archivos). Si ese archivo no existe, no hay forma segura de saber
   qué juntar — hay que reconstruirlo a mano una sola vez.

   TAMBIÉN ESCRIBE estilos/_empaquetado.css, SOLO COMO REFERENCIA
   No lo pide nadie (index.html ya no tiene ningún <link> a él): queda
   para poder ver el CSS final con `git diff` sin tener que leerlo
   incrustado en medio de index.html. No hace falta subirlo al hosting,
   pero tampoco molesta si se sube.

   CUÁNDO CORRERLO
       node herramientas/subir-version.mjs
       node herramientas/empaquetar.mjs
       node herramientas/minificar-js.mjs

   ⚠️ SI SE EDITA CUALQUIER ARCHIVO DE estilos/, HAY QUE VOLVER A CORRER
   ESTO antes de subir — si no, el cambio queda en el archivo fuente pero
   index.html sigue teniendo el CSS inline viejo.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaIndex = join(raiz, 'index.html');
const rutaManifiesto = join(raiz, 'herramientas', '_manifiesto-empaquetado.json');

const MARCADOR_INICIO = '<!-- ESTILOS-EMPAQUETADOS-INICIO -->';
const MARCADOR_FIN = '<!-- ESTILOS-EMPAQUETADOS-FIN -->';

/* ─── 1. La lista de archivos siempre sale del manifiesto ─────────────── */
if (!existsSync(rutaManifiesto)) {
  console.error(`✗ No existe ${rutaManifiesto}.`);
  console.error('  Sin él no hay forma de saber qué archivos de estilos/ juntar.');
  console.error('  Hay que reconstruirlo a mano una sola vez: un JSON con');
  console.error('  { "css": ["00-tipografias.css", "01-fundamentos.css", ...] }');
  process.exit(1);
}
const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
const archivosCss = manifiesto.css;

/* ─── 2. Leer cada archivo y armar el contenido combinado ─────────────── */
const partes = [
  '/* Generado por herramientas/empaquetar.mjs — no editar a mano.\n' +
  '   Para cambiar algo, editar el archivo original en estilos/ y volver\n' +
  '   a correr el script. Ver ese archivo para la explicación completa. */\n'
];

for (const archivo of archivosCss) {
  const ruta = join(raiz, 'estilos', archivo);
  if (!existsSync(ruta)) {
    console.error(`✗ No existe estilos/${archivo} (parte del manifiesto).`);
    process.exit(1);
  }
  partes.push(`\n/* ═══ ${archivo} ═══ */\n`, readFileSync(ruta, 'utf8'));
}

const cssSinMinificar = partes.join('');

/**
 * Minificado conservador: comentarios, espacio en blanco, y el espacio/
 * `;` que sobra pegado a `{` `}`. Ver la explicación completa en el
 * encabezado de este archivo — a propósito NO toca `:` ni `,`.
 * @param {string} codigo
 * @returns {string}
 */
function minificarCss(codigo) {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // fuera los comentarios
    .replace(/\s+/g, ' ')                 // todo el espacio en blanco, uno solo
    .replace(/\s*\{\s*/g, '{')            // sin espacio pegado a la llave que abre
    .replace(/\s*\}\s*/g, '}')            // sin espacio pegado a la llave que cierra
    .replace(/;\}/g, '}')                 // el ; de la última declaración no hace falta
    .trim();
}

const cssEmpaquetado = minificarCss(cssSinMinificar);

/* ─── 3. Artefacto de referencia (no se enlaza desde index.html) ──────── */
writeFileSync(join(raiz, 'estilos', '_empaquetado.css'), cssEmpaquetado);

/* ─── 4. Inyectar entre los marcadores de index.html ───────────────────── */
const html = readFileSync(rutaIndex, 'utf8');

if (!html.includes(MARCADOR_INICIO) || !html.includes(MARCADOR_FIN)) {
  console.error('✗ No se encontraron los marcadores ESTILOS-EMPAQUETADOS-INICIO/FIN en index.html.');
  console.error('  Sin ellos no hay dónde inyectar el CSS de forma segura.');
  process.exit(1);
}

const inicio = html.indexOf(MARCADOR_INICIO) + MARCADOR_INICIO.length;
const fin = html.indexOf(MARCADOR_FIN);

if (fin < inicio) {
  console.error('✗ El marcador de FIN aparece antes que el de INICIO. Revisar index.html a mano.');
  process.exit(1);
}

const htmlNuevo =
  html.slice(0, inicio) +
  `\n  <style>${cssEmpaquetado}</style>\n  ` +
  html.slice(fin);

writeFileSync(rutaIndex, htmlNuevo);

console.log(`✓ CSS empaquetado (${archivosCss.length} archivos, ${(cssEmpaquetado.length / 1024).toFixed(0)} KB) inyectado inline en index.html`);
console.log('  estilos/_empaquetado.css escrito solo como referencia (no se enlaza).');
console.log('');
console.log('El JavaScript NO se toca acá — correr node herramientas/minificar-js.mjs');
console.log('aparte. Los archivos de estilos/ siguen intactos.');
