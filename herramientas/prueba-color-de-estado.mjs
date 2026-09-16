/* Comprueba el color de fila por estado en las descargas.
 *
 * POR QUÉ EXISTE
 * El PDF de invitados se imprime y se usa sobre una mesa. Con ciento
 * treinta renglones todos iguales hay que leer la columna «Estado» uno
 * por uno para saber quién confirmó. El color lo dice de un vistazo.
 *
 * ⛔ LO QUE ESTA PRUEBA CUIDA DE VERDAD
 * Que el color SE IMPRIMA. Los navegadores descartan los fondos al
 * imprimir salvo que la persona marque «Gráficos de fondo» en el
 * diálogo, y nadie lo marca. Un color que solo existe en pantalla no
 * sirve para nada en un papel que se lleva al salón.
 *
 * Por eso van dos vías: print-color-adjust para que el fondo salga sin
 * que nadie toque nada, y una franja en el borde izquierdo, porque los
 * bordes se imprimen siempre. Si un día se cae una, la otra aguanta —
 * y esta prueba falla si se cae cualquiera de las dos.
 *
 * ⚠️ Y que los otros tres formatos NO se enteren. El dato del estado va
 * como propiedad hermana del bloque justamente para que CSV, TXT y
 * Excel sigan viendo lo de siempre. Acá se comprueba corriendo los
 * tres con y sin esa propiedad y exigiendo salida idéntica.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const leer = (...p) => readFileSync(raiz(...p), 'utf8').split(CR + LF).join(LF);

const exportador = leer('admin', 'codigo', '13-exportar.js');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

function extraer(texto, nombre) {
  let desde = texto.indexOf('async function ' + nombre + '(');
  if (desde === -1) desde = texto.indexOf('function ' + nombre + '(');
  if (desde === -1) throw new Error('no existe ' + nombre + '()');
  const abre = texto.indexOf('{', desde);
  let hondo = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') hondo++;
    else if (texto[i] === '}') { hondo--; if (hondo === 0) return texto.slice(desde, i + 1); }
  }
  throw new Error('no se le encuentra el final a ' + nombre + '()');
}

/* ─── El banco ────────────────────────────────────────────────────── */

const banco = { html: '' };

const contexto = {
  console,
  CONFIGURACION: { dinero: { region: 'es-MX' } },
  seguro: (x) => String(x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  avisar: () => {},
  nombreConFechaYHora: (b) => b,
  setTimeout: () => {},
  /* La ventana de mentira: guarda el HTML en vez de pintarlo. */
  window: {
    open: () => ({
      document: { write: (h) => { banco.html += h; }, close() {} },
      print() {},
    }),
  },
};
contexto.globalThis = contexto;

vm.createContext(contexto);
try {
  vm.runInContext([
    extraer(exportador, 'claseDeEstado'),
    extraer(exportador, 'armarPdf'),
    extraer(exportador, 'colorDeFilaExcel'),
    extraer(exportador, 'armarExcel'),
    extraer(exportador, 'armarTxt'),
    extraer(exportador, 'paraCsv'),
    extraer(exportador, 'armarCsv'),
    /* La tabla de tintes de Excel vive suelta, no en una función. */
    exportador.slice(exportador.indexOf('const TINTE_DE_ESTADO'),
                     exportador.indexOf('};', exportador.indexOf('const TINTE_DE_ESTADO')) + 2),
  ].join(LF + LF), contexto);
} catch (error) {
  console.log('  FALLA no se pudo levantar el exportador → ' + error.message);
  process.exit(1);
}

/* ─── Los bloques de prueba ───────────────────────────────────────── */

const CON_ESTADOS = {
  titulo: 'Confirmaciones',
  encabezados: ['Nombre', 'Estado'],
  filas: [
    ['Ana',   'Confirmó'],
    ['Beto',  'Sin responder'],
    ['Carla', 'Sin enviar'],
    ['Dani',  'No viene'],
  ],
  estados: ['confirmo', 'enviada', 'sin_enviar', 'no_viene'],
};

const SIN_ESTADOS = {
  titulo: 'Confirmaciones',
  encabezados: CON_ESTADOS.encabezados,
  filas: CON_ESTADOS.filas,
};

const armar = (bloque) => {
  banco.html = '';
  contexto.armarPdf('Invitados', [bloque], {});
  return banco.html;
};


/* ─── 1. Cada fila lleva la clase de su estado ────────────────────── */

console.log('\nCada fila con su estado\n');

const html = armar(CON_ESTADOS);

comprobar('la fila de quien confirmó', html.indexOf('<tr class="e-confirmo">') !== -1);
comprobar('la de quien no respondió',  html.indexOf('<tr class="e-enviada">') !== -1);
comprobar('la de quien no se envió',   html.indexOf('<tr class="e-sin_enviar">') !== -1);
comprobar('la de quien no viene',      html.indexOf('<tr class="e-no_viene">') !== -1);

comprobar('un bloque SIN estados sigue saliendo con <tr> pelado',
  armar(SIN_ESTADOS).indexOf('<tr>') !== -1 &&
  armar(SIN_ESTADOS).indexOf('<tr class=') === -1,
  'los demás cuadros del documento no tienen por qué cambiar');

comprobar('un estado desconocido no inventa una clase',
  contexto.claseDeEstado('inventado') === '' && contexto.claseDeEstado() === '',
  'saldría una clase que el <style> no define: se vería igual y dejaría de avisar');


/* ─── 2. ⛔ Que el color llegue al papel ──────────────────────────── */

console.log('\nQue se imprima, no solo que se vea\n');

/* ⚠️ El [;{] de adelante no es adorno: sin él, «-webkit-print-color-adjust»
   también satisface esta comprobación, y entonces se podría borrar la
   propiedad sin prefijo —la que entienden los navegadores de hoy— y la
   prueba seguiría en verde. Lo descubrí mordiendo: la mordida no mordía. */
comprobar('⛔ lleva print-color-adjust: exact, sin prefijo',
  /[;{]\s*print-color-adjust\s*:\s*exact/.test(html),
  'sin esto el fondo NO sale impreso salvo que marquen «Gráficos de fondo»');
comprobar('y también con el prefijo -webkit-, para los que aún lo piden',
  /-webkit-print-color-adjust\s*:\s*exact/.test(html));

comprobar('⛔ cada estado lleva además su franja de borde',
  ['e-confirmo', 'e-enviada', 'e-sin_enviar', 'e-no_viene'].every(c => {
    const r = new RegExp('tr\\.' + c + '\\s*\\{[^}]*inset 3px 0 0');
    return r.test(html);
  }),
  'la franja es el respaldo: los bordes se imprimen pase lo que pase');

comprobar('los cuatro tintes están definidos en el <style>',
  ['e-confirmo', 'e-enviada', 'e-sin_enviar', 'e-no_viene'].every(c => {
    const r = new RegExp('tr\\.' + c + '\\s*\\{[^}]*background:');
    return r.test(html);
  }));

/* Sutil: sobre papel blanco, un tinte muy claro. Si alguien sube la
   saturación, el papel se vuelve una piñata y se deja de leer. */
const tintes = (html.match(/tr\.e-[a-z_]+\s*\{background:(#[0-9a-fA-F]{6})/g) || [])
  .map(s => s.slice(-6));
comprobar('los tintes son claros, no saturados',
  tintes.length === 4 && tintes.every(hex => {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return Math.min(r, g, b) >= 0xE0;          // nada por debajo de 224
  }),
  'tintes: ' + tintes.join(' '));


/* ─── 3. Los otros tres formatos ni se enteran ────────────────────── */

console.log('\nCSV y TXT no cambian; Excel sí, y gratis\n');

comprobar('el CSV sale idéntico con y sin estados',
  contexto.armarCsv(CON_ESTADOS.encabezados, CON_ESTADOS.filas) ===
  contexto.armarCsv(SIN_ESTADOS.encabezados, SIN_ESTADOS.filas));

comprobar('el TXT sale idéntico con y sin estados',
  contexto.armarTxt('Invitados', [CON_ESTADOS]) ===
  contexto.armarTxt('Invitados', [SIN_ESTADOS]),
  'si cambia, el estado se metió adentro de la fila y rompió la forma');

const excel = contexto.armarExcel('Invitados', [CON_ESTADOS]);
comprobar('Excel sí pinta la fila',
  excel.indexOf('bgcolor="#ECF8F1"') !== -1, 'el verde de confirmó');
comprobar('y sin estados no pinta nada',
  contexto.armarExcel('Invitados', [SIN_ESTADOS]).indexOf('bgcolor=') === -1);


/* ─── Final ───────────────────────────────────────────────────────── */

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + (fallos === 1 ? ' comprobación falló' : ' comprobaciones fallaron'));
  process.exit(1);
}
console.log('✓ el estado se ve de un vistazo, y sobrevive a la impresora');
