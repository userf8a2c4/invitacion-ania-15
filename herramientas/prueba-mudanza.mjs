/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-MUDANZA.MJS · que la lista de invitados sobreviva el viaje

   QUÉ COMPRUEBA
   Que lo que baja el exportador del panel (13-exportar.js) sea
   exactamente lo que vuelve a leer el importador (18-importar.js). Ida
   y vuelta, celda por celda.

   POR QUÉ ESTA PRUEBA Y NO LEER EL CÓDIGO
   Porque son 114 invitados en 51 grupos cargados a mano en PBE. Si el
   viaje pierde una celda, nadie se entera hasta que Lucila abre la lista
   en producción y falta gente — y para entonces la única salida es
   volver a escribirlos uno por uno.

   El punto frágil es el CSV: una nota con una coma, un apellido con
   comillas, un salto de línea adentro de una celda. Cualquiera de esas
   tres parte la fila en dos y desalinea TODO lo que sigue, sin dar
   ningún error.

   NO REESCRIBE LAS FUNCIONES: LAS SACA DE LOS ARCHIVOS
   Se extrae el texto de cada función del archivo fuente y se evalúa. Si
   mañana alguien cambia paraCsv(), esta prueba corre la versión nueva y
   falla si rompió algo. Una copia pegada acá probaría la copia, que es
   justo lo que no sirve.

   CÓMO SE CORRE
       node herramientas/prueba-mudanza.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Saca el texto de una función de un archivo, contando llaves.
 *
 * @param {string} archivo - Ruta relativa a la raíz del proyecto.
 * @param {string} nombre  - Nombre de la función.
 * @returns {string} El código de la función.
 */
function sacarFuncion(archivo, nombre) {
  const fuente = readFileSync(join(raiz, archivo), 'utf8');
  const arranque = fuente.search(new RegExp('^function\\s+' + nombre + '\\s*\\(', 'm'));

  if (arranque < 0) {
    throw new Error('No encontré function ' + nombre + '() en ' + archivo +
                    '. ¿La renombraron? Esta prueba quedó apuntando a la nada.');
  }

  let i = fuente.indexOf('{', arranque);
  let hondura = 0;

  for (; i < fuente.length; i++) {
    if (fuente[i] === '{') hondura++;
    else if (fuente[i] === '}') {
      hondura--;
      if (hondura === 0) return fuente.slice(arranque, i + 1);
    }
  }

  throw new Error('La función ' + nombre + '() de ' + archivo + ' no cierra.');
}

// Las cuatro funciones que hacen el viaje, tal como están en el panel.
const codigo = [
  sacarFuncion('admin/codigo/13-exportar.js', 'paraCsv'),
  sacarFuncion('admin/codigo/13-exportar.js', 'armarCsv'),
  sacarFuncion('admin/codigo/18-importar.js', 'leerPlanillaPegada'),
  sacarFuncion('admin/codigo/18-importar.js', 'partirRespetandoComillas'),
].join('\n\n');

const { armarCsv, leerPlanillaPegada } =
  new Function(codigo + '\nreturn { armarCsv, leerPlanillaPegada };')();


/* ─── LOS DATOS DE LA PRUEBA ──────────────────────────────────────────
   No son nombres bonitos: son las formas que de verdad rompen un CSV,
   más las que de verdad tiene una lista mexicana de invitados. */

const ENCABEZADOS = ['Nombre', 'Grupo', 'Contacto', 'Adultos', 'Niños',
                     'Integrantes', 'Notas'];

const FILAS = [
  // La fila normal, para que la prueba no sea solo de casos raros.
  ['Familia Zelaya', 'Familia paterna', '7221234567 / ana@ejemplo.mx', 2, 1,
   'adulto:Ana Zelaya; adulto:Luis Zelaya; nino:Sofía Zelaya', ''],

  // ⚠️ Una coma en el nombre: el clásico que parte la fila en dos.
  ['Pérez Nava, Familia', 'Amigos de Lucila', '7229876543', 2, 0,
   'adulto:María Pérez; adulto:Jorge Nava', 'Confirmaron por teléfono'],

  // ⚠️ Comillas dobles adentro del nombre.
  ['Ana "Anita" Rodríguez', 'Compañeras de trabajo', 'anita@ejemplo.mx', 1, 0,
   'adulto:Ana Rodríguez', 'Le dicen Anita'],

  // ⚠️ Un salto de línea dentro de una nota.
  ['Familia Ortega', 'Familia materna', '7225551234', 3, 2,
   'adulto:Rosa Ortega; adulto:Pedro Ortega; adulto:Carmen Ortega; ' +
     'nino:Diego Ortega; nino:Valeria Ortega',
   'Vienen desde Metepec.\nLlegan tarde, después de la misa.'],

  // ⚠️ Punto y coma en un campo: es el separador interno de integrantes,
  //    y también un candidato a separador del CSV.
  ['Los vecinos', 'Vecinos; los de enfrente', '', 2, 0,
   'adulto:Don Chuy; adulto:Doña Mari', 'Preguntar; no confirmaron'],

  // ⚠️ Celdas vacías por todos lados: el caso más común de todos.
  ['Invitado sin datos', '', '', 1, 0, '', ''],

  // ⚠️ Acentos, ñ y diéresis, que es media lista.
  ['Familia Muñoz Argüello', 'Padrinos', '7223334444 / munoz@ejemplo.mx', 2, 1,
   'adulto:Íñigo Muñoz; adulto:Begoña Argüello; nino:Ángel Muñoz',
   'Padrinos de velación'],

  // ⚠️ Un tabulador dentro de una celda: si el lector eligiera mal el
  //    separador, esta fila explotaría.
  ['Familia\tGómez', 'Amigos', '7227778888', 2, 0,
   'adulto:Luis Gómez; adulto:Rita Gómez', ''],
];


/* ─── EL VIAJE ────────────────────────────────────────────────────────── */

const csv = armarCsv(ENCABEZADOS, FILAS);
const devuelta = leerPlanillaPegada(csv);

let fallas = 0;

/**
 * @param {boolean} bien
 * @param {string} que
 * @param {string} [detalle]
 */
function comprobar(bien, que, detalle) {
  if (bien) {
    console.log('  ok   ' + que);
    return;
  }
  fallas++;
  console.log('  FALLA ' + que + (detalle ? '\n        ' + detalle : ''));
}

console.log('\nIDA Y VUELTA DE LA LISTA DE INVITADOS');
console.log('El CSV que baja el panel, leído por el importador.\n');

comprobar(devuelta.length === FILAS.length + 1,
  'vuelven todas las filas (' + (FILAS.length + 1) + ' con encabezado)',
  'volvieron ' + devuelta.length + '. Si son más, una celda partió su fila en dos.');

comprobar(JSON.stringify(devuelta[0]) === JSON.stringify(ENCABEZADOS),
  'el encabezado llega intacto',
  'llegó: ' + JSON.stringify(devuelta[0]));

FILAS.forEach((original, i) => {
  const vuelta = devuelta[i + 1] || [];
  const esperado = original.map(String);
  const recibido = vuelta.map(String);

  comprobar(JSON.stringify(esperado) === JSON.stringify(recibido),
    'fila ' + (i + 1) + ': ' + String(original[0]).replace(/\n|\t/g, '·'),
    'esperaba ' + JSON.stringify(esperado) + '\n        recibió  ' +
    JSON.stringify(recibido));
});


/* ─── QUE LOS ENCABEZADOS LOS RECONOZCA EL SERVIDOR ───────────────────
   El importador de verdad vive en PHP y no se puede correr acá. Lo que
   sí se puede es comprobar que cada encabezado que escribe el
   exportador esté en la lista que el PHP dice reconocer: si alguien
   renombra una columna de un lado y no del otro, esa columna se importa
   vacía sin avisar. */

const php = readFileSync(join(raiz, 'admin/api/importar.php'), 'utf8');
const bloque = php.slice(php.indexOf('const COLUMNAS_CONOCIDAS'),
                         php.indexOf('];', php.indexOf('const COLUMNAS_CONOCIDAS')));

const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const conocidas = (bloque.match(/'([^']+)'/g) || []).map(t => sinAcentos(t.slice(1, -1)));

console.log('');
ENCABEZADOS.forEach(encabezado => {
  const yo = sinAcentos(encabezado);
  comprobar(conocidas.some(palabra => yo.includes(palabra)),
    'el servidor reconoce la columna «' + encabezado + '»',
    'importar.php no tiene ninguna palabra que case. Esa columna se ' +
    'importaría vacía, sin dar error.');
});

console.log('');
if (fallas) {
  console.log('✗ ' + fallas + ' comprobación(es) fallaron. La mudanza PERDERÍA datos.');
  process.exit(1);
}
console.log('✓ La lista sobrevive el viaje entera, celda por celda.');
