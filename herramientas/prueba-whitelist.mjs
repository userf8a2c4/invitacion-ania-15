/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-WHITELIST.MJS · que las dos listas digan lo mismo

   QUÉ COMPRUEBA
   Que `ACCIONES_PERMITIDAS_PARA_MEGABOT` sea idéntica en el servidor
   (admin/api/chat.php) y en el panel (admin/codigo/32-asistente.js).

   POR QUÉ ESTÁ DUPLICADA, SI ESO SUELE SER UN ERROR
   A propósito, y no es una copia perezosa: son dos frenos en dos
   lugares distintos. El panel filtra para no dibujar un botón que no se
   va a poder ejecutar; el servidor vuelve a validar cada propuesta
   contra la SUYA, sin confiar en lo que le mande el navegador. Si solo
   existiera la del panel, bastaría con abrir las herramientas de
   desarrollo para ejecutar cualquier cosa.

   POR QUÉ HACE FALTA ESTA PRUEBA
   Porque el precio de duplicar es que se desincronizan, y lo hacen EN
   SILENCIO y hacia los dos lados:

     · algo solo en el panel  → el botón aparece y al tocarlo falla,
                                 sin que se entienda por qué
     · algo solo en el servidor → la acción nunca llega a ofrecerse

   Y desde el 2026-09-04 una de esas acciones MUEVE DINERO
   (`compras.php?accion=cobrar`), así que una lista que se abre de más
   deja de ser una molestia.

   CÓMO SE CORRE
       node herramientas/prueba-whitelist.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Saca las cadenas de un bloque `const NOMBRE = [ ... ];`.
 *
 * Sirve igual para PHP y para JavaScript porque las dos declaran la
 * lista igual: un nombre, un corchete, cadenas entre comillas simples.
 *
 * @param {string} archivo - Ruta relativa a la raíz.
 * @param {string} nombre  - La constante a leer.
 * @returns {string[]}
 */
function sacarLista(archivo, nombre) {
  const fuente = readFileSync(join(raiz, archivo), 'utf8');
  const desde = fuente.indexOf('const ' + nombre);

  if (desde < 0) {
    throw new Error('No encontré ' + nombre + ' en ' + archivo +
                    '. ¿La renombraron? Esta prueba quedó mirando a la nada.');
  }

  const abre = fuente.indexOf('[', desde);
  const cierra = fuente.indexOf('];', abre);

  if (abre < 0 || cierra < 0) {
    throw new Error('La lista ' + nombre + ' de ' + archivo + ' no cierra.');
  }

  const bloque = fuente.slice(abre + 1, cierra);

  /* Solo las cadenas: así los comentarios de adentro del bloque -que
     los hay, y explican por qué entra cada acción- no se cuelan como
     si fueran acciones. */
  const acciones = (bloque.match(/'([^']+)'/g) || []).map(t => t.slice(1, -1));

  /* ⚠️ LA GUARDA QUE SALVA A ESTA PRUEBA DE SÍ MISMA.
     Si un día alguien cambia cómo se escribe la lista -comillas dobles,
     un array en varias constantes, otro formato- este extractor
     devolvería CERO acciones. Y dos listas vacías son idénticas entre
     sí: la prueba pasaría en verde justo cuando dejó de mirar nada.
     Una lista vacía nunca es un resultado válido acá. */
  if (!acciones.length) {
    throw new Error('Saqué CERO acciones de ' + nombre + ' en ' + archivo +
                    '. No es que la lista esté vacía: es que este extractor ' +
                    'dejó de entender cómo está escrita. Arreglar sacarLista() ' +
                    'antes de creerle a esta prueba.');
  }

  return acciones;
}

const enServidor = sacarLista('admin/api/chat.php', 'ACCIONES_PERMITIDAS_PARA_MEGABOT');
const enPanel = sacarLista('admin/codigo/32-asistente.js', 'ACCIONES_PERMITIDAS_PARA_MEGABOT');

console.log('\nLA WHITELIST DE MEGABOT, EN LOS DOS LADOS\n');
console.log('  servidor (chat.php):        ' + enServidor.length + ' acciones');
console.log('  panel (32-asistente.js):    ' + enPanel.length + ' acciones\n');

const soloServidor = enServidor.filter(a => !enPanel.includes(a));
const soloPanel = enPanel.filter(a => !enServidor.includes(a));

let fallas = 0;

if (soloServidor.length) {
  fallas++;
  console.log('  FALLA solo en el SERVIDOR (nunca se van a ofrecer):');
  soloServidor.forEach(a => console.log('        · ' + a));
}

if (soloPanel.length) {
  fallas++;
  console.log('  FALLA solo en el PANEL (el botón aparece y al tocarlo falla):');
  soloPanel.forEach(a => console.log('        · ' + a));
}

/* El orden no cambia el comportamiento -las dos se consultan con
   "¿está esto adentro?"- pero dos listas en el mismo orden se comparan
   de un vistazo cuando alguien las lee en una revisión. */
if (!fallas && enServidor.join('|') !== enPanel.join('|')) {
  console.log('  ok   las dos tienen las mismas acciones');
  console.log('  ojo  pero en distinto orden. No rompe nada; conviene igualarlo.');
} else if (!fallas) {
  console.log('  ok   las dos listas son idénticas, y en el mismo orden');
}

/* Que la acción que mueve dinero esté en las dos no es un detalle: si
   faltara en el servidor, una propuesta de cobro se descartaría en
   silencio y nadie entendería por qué el botón no hace nada. */
const COBRO = 'compras.php?accion=cobrar';
if (enServidor.includes(COBRO) && enPanel.includes(COBRO)) {
  console.log('  ok   la acción de cobro está permitida en los dos lados');
} else {
  console.log('  ojo  ' + COBRO + ' todavía no está en las dos listas.');
}

console.log('');
if (fallas) {
  console.log('✗ Las listas NO coinciden. Hay que igualarlas antes de subir.');
  process.exit(1);
}
console.log('✓ Servidor y panel permiten exactamente lo mismo.');
