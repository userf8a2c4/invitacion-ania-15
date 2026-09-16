/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-FECHA-UNICA.MJS · QUE LA FECHA TENGA UN SOLO DUEÑO

   QUÉ COMPRUEBA
   Que admin/api/_lib/entorno.php sea el único lugar del proyecto donde
   la fecha de la fiesta está escrita a mano, y que cambiarla ahí alcance
   para cambiarla en todos lados.

   POR QUÉ EXISTE
   La fecha estaba copiada en diecisiete lugares. Se juntaron en uno
   solo, pero un punto único sin una prueba que lo sostenga dura hasta el
   próximo archivo nuevo: alguien escribe '2026-10-24' porque le queda a
   mano, nadie lo nota, y seis meses después hay dos fechas otra vez.

   ⚡ ESTA PRUEBA EJECUTA, NO LEE.
   La lección de prueba-eclipse-corre.mjs: una prueba que solo busca
   texto pasa mientras el código está muerto. Acá no se comprueba que
   exista una función que estampa la fecha — se CAMBIA la fecha en
   entorno.php, se corre el estampado de verdad, y se mira si los
   archivos salieron con la fecha nueva.

   ⚠️ TOCA ARCHIVOS DE VERDAD Y LOS DEJA COMO ESTABAN.
   Guarda el contenido exacto de cada archivo en memoria antes de
   empezar, y al terminar lo restaura y comprueba byte a byte que quedó
   idéntico. Si la restauración fallara, la prueba lo grita: es peor
   dejar el repo torcido que no haber probado.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerLaFecha, estamparLaFecha, ARCHIVO_DUENO }
  from './_fecha-de-la-fiesta.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

let fallos = 0;
let pasadas = 0;

function comprobar(queSeEspera, condicion, detalle = '') {
  if (condicion) {
    pasadas++;
    console.log(`  ok    ${queSeEspera}`);
  } else {
    fallos++;
    console.log(`  FALLA ${queSeEspera}`);
    if (detalle) console.log(`        ${detalle}`);
  }
}


/* ─── LOS ARCHIVOS QUE SE TOCAN, GUARDADOS ANTES DE EMPEZAR ──────────── */

const ARCHIVOS_ESTAMPADOS = [
  'codigo/01-configuracion.js',
  'codigo/00-conocimiento-chatbot.js',
  'admin/codigo/01-configuracion.js',
  'index.html',
  ARCHIVO_DUENO,
];

const respaldo = new Map();
for (const archivo of ARCHIVOS_ESTAMPADOS) {
  respaldo.set(archivo, readFileSync(join(raiz, archivo), 'utf8'));
}


/* ─── 1. NADIE MÁS TIENE LA FECHA ESCRITA A MANO ─────────────────────── */

console.log('\n1. La fecha no está escrita a mano en ningún otro lado\n');

/* Las carpetas que no se miran y por qué:
     · produccion  → son las copias minificadas, las genera minificar-js
     · worktrees   → copias viejas del repo que git deja por ahí
     · node_modules, .git → obvio
   herramientas/ SÍ se mira: si una herramienta nueva escribiera la fecha
   a mano, sería exactamente el problema que esto vigila. La excepción es
   este mismo archivo, que la escribe a propósito para la mordida. */
const CARPETAS_QUE_NO = new Set(
  ['node_modules', '.git', 'produccion', 'worktrees', '.claude']);
const EXTENSIONES = new Set(['.php', '.js', '.mjs', '.html', '.json', '.sql']);
const ARCHIVOS_QUE_NO = new Set([
  ARCHIVO_DUENO,
  'herramientas/prueba-fecha-unica.mjs',
]);

/* Un comentario que menciona la fecha NO es una copia del dato: es
   prosa. "@returns {string} '2026-10-24'" explica un formato, no decide
   nada, y borrarlo empeoraría el archivo.

   ⚠️ SE ENMASCARA, NO SE BORRA. prueba-apodo-interno.mjs tiene un
   sinComentarios() que filtra las líneas, y eso corre la numeración: el
   informe terminaría señalando líneas equivocadas. Acá el comentario se
   reemplaza por espacios y se conserva el salto de línea, que es la
   misma técnica con la que csp-publica.mjs dejó de confundir un
   <script> comentado con uno de verdad. */
const enmascararComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))
  .replace(/<!--[\s\S]*?-->/g, (t) => t.replace(/[^\n]/g, ' '))
  .split('\n')
  .map((linea) => (/^\s*(\/\/|--|#)/.test(linea) ? '' : linea))
  .join('\n');

function recorrer(carpeta, encontrados) {
  for (const entrada of readdirSync(carpeta)) {
    if (CARPETAS_QUE_NO.has(entrada)) continue;
    const ruta = join(carpeta, entrada);
    if (statSync(ruta).isDirectory()) {
      recorrer(ruta, encontrados);
      continue;
    }
    const punto = entrada.lastIndexOf('.');
    if (punto < 0 || !EXTENSIONES.has(entrada.slice(punto))) continue;

    const corta = relative(raiz, ruta).split(sep).join('/');
    if (ARCHIVOS_QUE_NO.has(corta)) continue;

    const texto = enmascararComentarios(readFileSync(ruta, 'utf8'));
    texto.split('\n').forEach((linea, i) => {
      if (/2026-10-24|24 de octubre de 2026/.test(linea)) {
        encontrados.push(`${corta}:${i + 1}`);
      }
    });
  }
}

const aMano = [];
recorrer(raiz, aMano);

/* Los archivos estampados SÍ tienen la fecha adentro, pero es generada:
   se comprueban en el punto 2, cambiándola de verdad. */
const sinPermiso = aMano.filter(
  (d) => !ARCHIVOS_ESTAMPADOS.some((a) => d.startsWith(a + ':')));

comprobar(
  `Solo ${ARCHIVO_DUENO} y los archivos estampados tienen la fecha`,
  sinPermiso.length === 0,
  sinPermiso.length
    ? 'Escrita a mano en:\n        ' + sinPermiso.join('\n        ') +
      '\n        Usar diaDeLaFiesta() / fiestaEnPalabras() (PHP) o agregar\n' +
      '        el lugar a herramientas/_fecha-de-la-fiesta.mjs (navegador).'
    : '');


/* ─── 2. LA MORDIDA: CAMBIAR LA FECHA Y VER SI SE MUEVE TODO ─────────── */

console.log('\n2. Cambiar la fecha solo en entorno.php alcanza (mordida)\n');

const FECHA_INVENTADA = '2027-03-07';   // un sábado distinto, otro año
const ESPERADO_EN_PALABRAS = '7 de marzo de 2027';
const ESPERADO_CON_DIA = 'Domingo 7 de marzo de 2027';

let mordidaAplicada = false;

try {
  const php = respaldo.get(ARCHIVO_DUENO);
  const mordido = php.replace(
    /^const FIESTA_DIA\s*=\s*'\d{4}-\d{2}-\d{2}';/m,
    `const FIESTA_DIA  = '${FECHA_INVENTADA}';`);

  comprobar('La mordida efectivamente cambió entorno.php',
    mordido !== php,
    'No se pudo reemplazar FIESTA_DIA: cambió la forma de esa línea.');

  writeFileSync(join(raiz, ARCHIVO_DUENO), mordido);
  mordidaAplicada = true;

  /* El día de la semana se calcula: 2027-03-07 es domingo. Si alguien
     volviera a guardarlo como texto fijo, esto lo caza. */
  const leida = leerLaFecha();
  comprobar('El día de la semana se calcula, no se guarda',
    leida.conDiaDeLaSemana === ESPERADO_CON_DIA,
    `Se esperaba "${ESPERADO_CON_DIA}" y salió "${leida.conDiaDeLaSemana}".`);

  comprobar('La hora de cierre se calcula (día siguiente, 1 AM)',
    leida.cierre === '2027-03-08T01:00:00',
    `Salió "${leida.cierre}".`);

  const { cambios } = estamparLaFecha();

  comprobar('El estampado tocó los cuatro archivos del navegador',
    cambios.length === 4,
    `Cambió ${cambios.length}: ${cambios.join(', ')}`);

  /* Y ahora lo que de verdad importa: mirar los archivos. */
  const revisiones = [
    ['codigo/01-configuracion.js', `fechaYHora: '${FECHA_INVENTADA}T17:00:00'`],
    ['codigo/01-configuracion.js', `fechaYHoraDeCierre: '2027-03-08T01:00:00'`],
    ['codigo/01-configuracion.js', `diaDeLaSemana:   'Domingo'`],
    ['codigo/01-configuracion.js', `fechaEnPalabras: '${ESPERADO_EN_PALABRAS}'`],
    ['codigo/00-conocimiento-chatbot.js', `'${ESPERADO_CON_DIA}'`],
    ['admin/codigo/01-configuracion.js', `fechaYHora: '${FECHA_INVENTADA}T17:00:00'`],
    ['admin/codigo/01-configuracion.js', `fechaEnPalabras: '${ESPERADO_EN_PALABRAS}'`],
    ['index.html', `content="XV Años de Ania · ${ESPERADO_EN_PALABRAS}"`],
    ['index.html', `${ESPERADO_CON_DIA}, Salones Alvi`],
    ['index.html', `<strong>${ESPERADO_CON_DIA}</strong>`],
  ];

  for (const [archivo, loQueTieneQueEstar] of revisiones) {
    const texto = readFileSync(join(raiz, archivo), 'utf8');
    comprobar(`${archivo} ← ${loQueTieneQueEstar}`,
      texto.includes(loQueTieneQueEstar),
      'No apareció. La fecha de ese archivo se quedó vieja.');
  }

  /* Y que no haya quedado NADA de la fecha anterior en los estampados. */
  for (const archivo of ARCHIVOS_ESTAMPADOS) {
    if (archivo === ARCHIVO_DUENO) continue;
    const texto = readFileSync(join(raiz, archivo), 'utf8');
    const quedan = texto.split('\n')
      .map((l, i) => [l, i + 1])
      .filter(([l]) => /2026-10-24|24 de octubre de 2026/.test(l))
      /* El comentario de codigo/01-configuracion.js que explica el
         formato tiene una fecha de ejemplo a propósito. */
      .filter(([l]) => !/^\s*\*/.test(l) && !/^\s*(ANTES|DESPUÉS):/.test(l));

    comprobar(`${archivo} no conserva nada de la fecha vieja`,
      quedan.length === 0,
      quedan.length ? 'Quedó en la línea ' +
        quedan.map(([, n]) => n).join(', ') : '');
  }

} finally {
  /* ─── 3. DEJAR TODO COMO ESTABA ─────────────────────────────────── */

  console.log('\n3. Los archivos vuelven a quedar idénticos\n');

  for (const [archivo, contenido] of respaldo) {
    writeFileSync(join(raiz, archivo), contenido);
  }

  let restauradosBien = true;
  const rotos = [];
  for (const [archivo, contenido] of respaldo) {
    if (readFileSync(join(raiz, archivo), 'utf8') !== contenido) {
      restauradosBien = false;
      rotos.push(archivo);
    }
  }

  comprobar('Los 5 archivos quedaron byte a byte como estaban',
    restauradosBien,
    rotos.length
      ? '⛔ SIN RESTAURAR: ' + rotos.join(', ') + ' — revisar a mano YA.'
      : (mordidaAplicada ? '' : 'La mordida no llegó a aplicarse.'));
}


/* ─── RESULTADO ──────────────────────────────────────────────────────── */

console.log('');
console.log('─'.repeat(70));
if (fallos === 0) {
  console.log(`✓ ${pasadas} comprobaciones, 0 fallos.`);
  console.log(`  La fecha tiene un solo dueño: ${ARCHIVO_DUENO}`);
} else {
  console.log(`✗ ${fallos} fallo(s) de ${pasadas + fallos} comprobaciones.`);
}
console.log('─'.repeat(70));

process.exit(fallos === 0 ? 0 : 1);
