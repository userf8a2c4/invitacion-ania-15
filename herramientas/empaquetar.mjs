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

   ⚠️ Y SI ALGUIEN SE OLVIDA DE CORRERLO, ¿QUÉ? (2026-09-04)
   Eso pasó, y rompió producción: el CSS fuente cambió, este script no se
   corrió, y la web sirvió el paquete viejo con el JavaScript nuevo. En
   el teléfono de una invitada real, media invitación quedó en blanco.

   Por eso este archivo ahora también EXPORTA lo que sabe hacer:
   `comprobarElCssInline()` rearma el paquete en memoria y lo compara,
   byte a byte, con el que index.html está sirviendo. La usa
   herramientas/subir-version.mjs —que es el paso obligatorio antes de
   subir— para CORTAR si no coinciden. No hay copia del minificador ni
   del orden de los archivos en ningún otro lado: si acá cambia algo, la
   comprobación cambia con ello.

   Importar este archivo NO escribe nada: el script solo se ejecuta si se
   lo invoca directo.

   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaIndex = join(raiz, 'index.html');
const rutaManifiesto = join(raiz, 'herramientas', '_manifiesto-empaquetado.json');

const MARCADOR_INICIO = '<!-- ESTILOS-EMPAQUETADOS-INICIO -->';
const MARCADOR_FIN = '<!-- ESTILOS-EMPAQUETADOS-FIN -->';

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

/**
 * El CSS empaquetado que le CORRESPONDE a estilos/ en este momento.
 *
 * Lanza Error (y no process.exit) para que quien lo importe decida qué
 * hacer con el problema.
 *
 * @returns {{css: string, archivos: string[]}}
 */
export function armarCssEmpaquetado() {
  if (!existsSync(rutaManifiesto)) {
    throw new Error(
      `No existe ${rutaManifiesto}.\n` +
      '  Sin él no hay forma de saber qué archivos de estilos/ juntar.\n' +
      '  Hay que reconstruirlo a mano una sola vez: un JSON con\n' +
      '  { "css": ["00-tipografias.css", "01-fundamentos.css", ...] }');
  }

  const archivos = JSON.parse(readFileSync(rutaManifiesto, 'utf8')).css;

  const partes = [
    '/* Generado por herramientas/empaquetar.mjs — no editar a mano.\n' +
    '   Para cambiar algo, editar el archivo original en estilos/ y volver\n' +
    '   a correr el script. Ver ese archivo para la explicación completa. */\n'
  ];

  for (const archivo of archivos) {
    const ruta = join(raiz, 'estilos', archivo);
    if (!existsSync(ruta)) {
      throw new Error(`No existe estilos/${archivo} (parte del manifiesto).`);
    }
    partes.push(`\n/* ═══ ${archivo} ═══ */\n`, readFileSync(ruta, 'utf8'));
  }

  return { css: minificarCss(partes.join('')), archivos };
}

/**
 * El trozo que este script escribe entre los marcadores, tal cual.
 * Tenerlo en una sola función es lo que permite comparar byte a byte.
 * @param {string} css
 * @returns {string}
 */
function trozoParaIndex(css) {
  return `\n  <style>${css}</style>\n  `;
}

/**
 * Lo que index.html tiene HOY entre los marcadores.
 * @param {string} html
 * @returns {string|null} null si faltan los marcadores o están al revés
 */
function trozoQueTieneIndex(html) {
  const inicio = html.indexOf(MARCADOR_INICIO);
  const fin = html.indexOf(MARCADOR_FIN);
  if (inicio < 0 || fin < 0 || fin < inicio) return null;
  return html.slice(inicio + MARCADOR_INICIO.length, fin);
}

/**
 * ¿El CSS incrustado en index.html es el que corresponde a estilos/?
 *
 * Compara byte a byte contra el paquete rearmado en memoria. NO mira
 * fechas: una fecha puede mentir —index.html se reescribe por otros
 * motivos, como subir la versión, y eso lo dejaría siempre "más nuevo"
 * que estilos/— mientras que el contenido no miente nunca.
 *
 * @returns {{alDia: boolean, motivo: string}}
 */
export function comprobarElCssInline() {
  let css;
  try {
    css = armarCssEmpaquetado().css;
  } catch (error) {
    return { alDia: false, motivo: error.message };
  }

  const tiene = trozoQueTieneIndex(readFileSync(rutaIndex, 'utf8'));

  if (tiene === null) {
    return {
      alDia: false,
      motivo: 'index.html no tiene los marcadores ESTILOS-EMPAQUETADOS-INICIO/FIN, ' +
              'o están en orden invertido.',
    };
  }
  if (tiene !== trozoParaIndex(css)) {
    return {
      alDia: false,
      motivo: 'El <style> incrustado en index.html NO es el que sale de estilos/.',
    };
  }
  return { alDia: true, motivo: 'El CSS incrustado en index.html coincide con estilos/.' };
}


/* ─── El script propiamente dicho ─────────────────────────────────────

   Solo corre si se lo invoca directo (`node herramientas/empaquetar.mjs`).
   Importarlo desde otra herramienta no escribe ningún archivo. */
const meInvocaronDirecto =
  !!process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (meInvocaronDirecto) {
  let paquete;
  try {
    paquete = armarCssEmpaquetado();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }

  /* Artefacto de referencia (no se enlaza desde index.html) */
  writeFileSync(join(raiz, 'estilos', '_empaquetado.css'), paquete.css);

  /* Inyectar entre los marcadores de index.html */
  const html = readFileSync(rutaIndex, 'utf8');
  const inicio = html.indexOf(MARCADOR_INICIO);
  const fin = html.indexOf(MARCADOR_FIN);

  if (inicio < 0 || fin < 0) {
    console.error('✗ No se encontraron los marcadores ESTILOS-EMPAQUETADOS-INICIO/FIN en index.html.');
    console.error('  Sin ellos no hay dónde inyectar el CSS de forma segura.');
    process.exit(1);
  }
  if (fin < inicio) {
    console.error('✗ El marcador de FIN aparece antes que el de INICIO. Revisar index.html a mano.');
    process.exit(1);
  }

  writeFileSync(rutaIndex,
    html.slice(0, inicio + MARCADOR_INICIO.length) +
    trozoParaIndex(paquete.css) +
    html.slice(fin));

  console.log(`✓ CSS empaquetado (${paquete.archivos.length} archivos, ${(paquete.css.length / 1024).toFixed(0)} KB) inyectado inline en index.html`);
  console.log('  estilos/_empaquetado.css escrito solo como referencia (no se enlaza).');
  console.log('');
  console.log('El JavaScript NO se toca acá — correr node herramientas/minificar-js.mjs');
  console.log('aparte. Los archivos de estilos/ siguen intactos.');
  console.log('');
}
