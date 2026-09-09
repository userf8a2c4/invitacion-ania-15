/* Comprueba que nadie pueda quedar marcado "Adulto" y "Niños" a la vez.
 *
 * POR QUÉ EXISTE
 * El 2026-09-09 el usuario mandó la captura de una ficha donde la misma
 * persona tenía puestas «Adulto», «Familia materna» y «Niños». Las
 * etiquetas se acumulan a propósito —alguien es "Familia materna" Y
 * "Padrinos"— pero las tres de edad contestan una sola pregunta y solo
 * una puede ser verdad.
 *
 * NO ES SOLO UN TEXTO FEO. La cocina cuenta los menús de niño por acá y
 * las mesas se arman mirando quién es chico: una persona contada en los
 * dos lados es un plato de más y una silla mal puesta.
 *
 * Falla callada: el panel guardaba las dos sin protestar, y la
 * contradicción solo se ve abriendo la ficha. `node --check` no la ve.
 *
 * ⚠️ EL PANEL NO SE EMPAQUETA. Por eso esta prueba lee admin/codigo/
 * directo y comprueba, además, que lo nuevo esté al nivel superior del
 * archivo: una función anidada sin querer no existiría para el resto
 * del panel y este archivo es demasiado grande para verlo a ojo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const piezas = readFileSync(raiz('admin', 'codigo', '06-piezas.js'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* ─── 1. La regla, ejecutada de verdad ───────────────────────────── */

console.log('\nQuién es una etiqueta de edad\n');

/* Se EJECUTA, no se lee: lo que importa es qué contesta, no cómo está
   escrita. Se le pega adelante la lista, que es de quien depende. */
const desdeLista = piezas.indexOf('const ETIQUETAS_DE_EDAD');
const desdeFn    = piezas.indexOf('function esEtiquetaDeEdad(');
if (desdeLista === -1 || desdeFn === -1) {
  console.error('\n✗ No se encontró ETIQUETAS_DE_EDAD o esEtiquetaDeEdad() en 06-piezas.js.\n');
  process.exit(1);
}
const lista  = piezas.slice(desdeLista, piezas.indexOf(';', desdeLista) + 1);
const cuerpo = piezas.slice(desdeFn, piezas.indexOf('\n}', desdeFn) + 2);
const esEtiquetaDeEdad = new Function(lista + '\n' + cuerpo + '\nreturn esEtiquetaDeEdad;')();

comprobar('"Adulto" es de edad', esEtiquetaDeEdad('Adulto') === true);
comprobar('"Niños" es de edad', esEtiquetaDeEdad('Niños') === true);
comprobar('"Joven" es de edad', esEtiquetaDeEdad('Joven') === true);
comprobar('"Familia materna" NO es de edad',
  esEtiquetaDeEdad('Familia materna') === false);
comprobar('"Padrinos" NO es de edad', esEtiquetaDeEdad('Padrinos') === false);

/* El catálogo real crece con lo que se escriba a mano: puede existir
   "adulto" en minúscula, creada antes que la sugerida. */
comprobar('no distingue mayúsculas', esEtiquetaDeEdad('adulto') === true);
comprobar('ni con la ñ y el acento', esEtiquetaDeEdad('niños') === true);
comprobar('un nombre vacío no es de edad', esEtiquetaDeEdad('') === false);
comprobar('ni undefined', esEtiquetaDeEdad(undefined) === false);
comprobar('"Adultos" en plural NO cuela',
  esEtiquetaDeEdad('Adultos') === false, 'sería otra etiqueta del catálogo');

/* ─── 2. Las tres siguen ofreciéndose ────────────────────────────── */

console.log('\nLas tres están en el catálogo de arranque\n');

const desdeSug = piezas.indexOf('const ETIQUETAS_SUGERIDAS');
const sugeridas = piezas.slice(desdeSug, piezas.indexOf('];', desdeSug));

for (const nombre of ['Joven', 'Adulto', 'Niños']) {
  comprobar('se ofrece "' + nombre + '"', sugeridas.includes("'" + nombre + "'"));
}

/* ─── 3. Poner una saca la otra ──────────────────────────────────── */

console.log('\nAl poner una, la vieja se va\n');

/* ⚠️ SE LEE EL CÓDIGO, NO LOS COMENTARIOS (2026-09-09)
   Esta prueba se rompió a propósito comentando la llamada que apaga el
   chip viejo… y siguió pasando: el texto seguía ahí, adentro del
   comentario. Una comprobación que un comentario satisface no comprueba
   nada. Se sacan antes de mirar.

   Solo se quitan los bloques y las líneas que EMPIEZAN con //: barrer
   todo lo que parezca // se comería el resto de cualquier línea con un
   "https://" adentro de un string. */
const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const desdeAlternar = piezas.indexOf("chip.dataset.etiquetaAlternar");
const handler = sinComentarios(
  piezas.slice(desdeAlternar, piezas.indexOf('const campoNueva', desdeAlternar)));

comprobar('el alternador pregunta si es de edad',
  handler.includes('esEtiquetaDeEdad(nombre)'));
comprobar('junta las otras de edad que estén puestas',
  handler.includes('esEtiquetaDeEdad(e.nombre)'));
comprobar('y las quita contra el servidor',
  /accion=quitar[\s\S]{0,120}vieja\.id/.test(handler));
comprobar('el chip de la vieja se apaga en pantalla',
  handler.includes('apagarChipDeEtiqueta(contenedor, vieja.nombre)'));

/* ⚠️ EL ORDEN IMPORTA. Si se pusiera la nueva primero y fallara el
   quitar, quedarían las dos encendidas — justo lo que esto impide. */
comprobar('quita ANTES de poner la nueva',
  handler.indexOf('accion=quitar') < handler.indexOf('accion=asignar'),
  'si se invierte, un fallo deja las dos puestas');

/* ─── 4. Lo nuevo existe para todo el panel ──────────────────────── */

console.log('\nAl nivel superior, no anidado\n');

for (const declaracion of [
  'const ETIQUETAS_DE_EDAD',
  'function esEtiquetaDeEdad',
  'function apagarChipDeEtiqueta',
]) {
  comprobar(declaracion + ' arranca en columna 0',
    new RegExp('^' + declaracion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm').test(piezas));
}

/* El chip se busca comparando el dataset, no armando un selector con el
   nombre adentro: «Niños» y cualquier etiqueta escrita a mano pueden
   traer acentos, ñ o comillas y romper el selector. */
comprobar('el chip se busca sin meter el nombre en un selector',
  !/querySelector\(\s*['"`]\[data-etiqueta-alternar=/.test(piezas));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ Nadie es adulto y niño a la vez.\n');
