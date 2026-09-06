/* Prueba de las funciones puras que se tocaron en 32-asistente.js.
   No hay navegador acá, así que se arma el mínimo DOM que estas
   funciones usan y se llaman de verdad: node --check solo mira la
   sintaxis, y lo que hay que comprobar es la SALIDA. */
import { readFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Relativa al repo: la herramienta se corre desde cualquier carpeta.
const AQUI = dirname(fileURLToPath(import.meta.url));
const RUTA = join(AQUI, '..', 'admin', 'codigo', '32-asistente.js');

/* ─── El DOM mínimo ──────────────────────────────────────────────── */

class ElementoFalso {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.dataset = {};
    this.hijos = [];
    this._html = '';
    this.textContent = '';
    this.hidden = false;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.style = {};
  }
  /* innerHTML de verdad: al escribirlo, el navegador recalcula
     textContent sin las etiquetas. Sin esto, una prueba que mira
     textContent daba vacío para todo lo que se pinta con innerHTML —y
     el código que se quiere probar usa las dos formas. */
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v);
    this.textContent = this._html
      .replace(/<[^>]*>/g, '')
      .replace(/&mdash;/g, '—')
      .replace(/&middot;/g, '·')
      .replace(/&amp;/g, '&');
  }
  appendChild(h) { this.hijos.push(h); return h; }
  insertAdjacentHTML(_, html) { this.innerHTML = this._html + html; }
  querySelector(sel) {
    const m = /^\[data-mensaje-id="(.+)"\]$/.exec(sel);
    if (m) return this._porId(m[1]);
    return null;
  }
  querySelectorAll(sel) {
    if (sel === '[data-mensaje-id]') return this._todosConId();
    return [];
  }
  _porId(id) { return this._todosConId().find(e => e.dataset.mensajeId === id) || null; }
  _todosConId() { return this.hijos.filter(h => h.dataset && h.dataset.mensajeId); }
  closest() { return null; }
  addEventListener() {}
  remove() {}
  classList = { add() {}, remove() {}, contains() { return false; } };
}

const documentoFalso = {
  body: { contains: () => true },
  createElement: (t) => new ElementoFalso(t),
  getElementById: (id) => documentoFalso._porId[id] || null,
  addEventListener() {},
  hidden: false,
  _porId: {},
};

/* ─── Cargar el archivo con los globales que necesita ─────────────── */

const codigo = readFileSync(RUTA, 'utf8');

const contexto = {
  document: documentoFalso,
  window: {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  // Escape igual que el del panel: lo importante es que escape comillas.
  seguro: (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  buscar: () => null,
  buscarTodos: () => [],
  avisar: () => {},
  traer: async () => ({}),
  mandar: async () => ({}),
  mandarSinCola: async () => ({}),
  pluralizar: (n, s, p) => n + ' ' + (n === 1 ? s : p),
  VISTA_ACTUAL: 'resumen',
  CONFIGURACION: { servidor: { segundosDeEspera: 8 } },
  confirmarAccion: async () => true,
  cerrarHoja: () => {},
  abrirHoja: () => {},
};

const nombres = Object.keys(contexto);
const valores = nombres.map(n => contexto[n]);

/* Se devuelve lo que hace falta probar. El archivo declara todo con
   `function`/`const` al nivel superior, así que basta nombrarlas. */
const fabrica = new Function(...nombres, codigo + `
  return {
    htmlDeBurbujaMegaBot, htmlDeCitaDeMegaBot, repintarEsperaDeMegaBot,
    pintarUsoDeMegaBot, compactarTiempoDeUsoDeMegaBot,
    TOPE_DE_ESPERA_MEGABOT_MS, EDAD_MAXIMA_DE_USO_S, EDAD_VISIBLE_DE_USO_S,
    esperaDeMegaBotEnPalabras, msEnPalabras, htmlDeTiemposDeMegaBot,
  };
`);

const M = fabrica(...valores);

/* ─── Las pruebas ─────────────────────────────────────────────────── */

let fallos = 0;
const comprobar = (nombre, condicion, detalle) => {
  if (condicion) { console.log('  ok    ' + nombre); return; }
  fallos++;
  console.log('  FALLA ' + nombre + (detalle ? '\n        → ' + detalle : ''));
};

console.log('\nA8 · MegaBot y FAB se distinguen\n');

const deMegabot = M.htmlDeBurbujaMegaBot(
  { id: 5, rol: 'megabot', texto: 'Van 114.', propuestas: [] }, null);
const deFab = M.htmlDeBurbujaMegaBot(
  { id: 'local-9', rol: 'megabot', origen: 'fab', texto: 'Van 114.', propuestas: [] }, null);

comprobar('la de MegaBot se firma MegaBot',
  deMegabot.includes('>MegaBot<'), deMegabot);
comprobar('la de MegaBot NO dice FAB',
  !deMegabot.includes('FAB'));
comprobar('la de FAB se firma FAB',
  deFab.includes('FAB · desde este teléfono'), deFab);
comprobar('la de FAB lleva su clase de acento',
  deFab.includes('megabot-burbuja--fab') && deFab.includes('megabot-fila--fab'));
comprobar('la de MegaBot NO lleva la clase de FAB',
  !deMegabot.includes('--fab'));

const deLucila = M.htmlDeBurbujaMegaBot(
  { id: 4, rol: 'lucila', texto: '¿cuánto debo?', propuestas: [] }, null);
comprobar('la de Lucila no se firma (es suya)',
  !deLucila.includes('megabot-autor'), deLucila);

console.log('\nA6 · la cita de en_respuesta_a\n');

const hilo = new ElementoFalso();
const viejo = new ElementoFalso();
viejo.dataset.mensajeId = '10';
viejo.dataset.mensajeTexto = '¿cuántos faltan por confirmar de la familia Ruiz?';
const otro = new ElementoFalso();
otro.dataset.mensajeId = '11';
otro.dataset.mensajeTexto = 'otra cosa';
hilo.appendChild(viejo);
hilo.appendChild(otro);

const conCita = M.htmlDeBurbujaMegaBot(
  { id: 12, rol: 'megabot', texto: 'Faltan 3.', en_respuesta_a: 10, propuestas: [] }, hilo);
comprobar('cita la pregunta de más arriba',
  conCita.includes('En respuesta a:') && conCita.includes('cuántos faltan'), conCita);

const sinCita = M.htmlDeBurbujaMegaBot(
  { id: 13, rol: 'megabot', texto: 'Faltan 3.', en_respuesta_a: 11, propuestas: [] }, hilo);
comprobar('NO cita la de justo arriba (sería ruido)',
  !sinCita.includes('En respuesta a:'), sinCita);

const citaFantasma = M.htmlDeBurbujaMegaBot(
  { id: 14, rol: 'megabot', texto: 'Faltan 3.', en_respuesta_a: 999, propuestas: [] }, hilo);
comprobar('no inventa una cita que no está en pantalla',
  !citaFantasma.includes('En respuesta a:'));

const largo = new ElementoFalso();
largo.dataset.mensajeId = '20';
largo.dataset.mensajeTexto = 'x'.repeat(300);
hilo.appendChild(largo);
const otroMas = new ElementoFalso();
otroMas.dataset.mensajeId = '21';
hilo.appendChild(otroMas);
const citaLarga = M.htmlDeBurbujaMegaBot(
  { id: 22, rol: 'megabot', texto: 'ok', en_respuesta_a: 20, propuestas: [] }, hilo);
comprobar('recorta una pregunta larga', citaLarga.includes('…'));

console.log('\nA1/A4/A5 · la burbuja de espera\n');

const espera = new ElementoFalso();
espera.dataset.enCola = '1';
espera.dataset.entrega = 'enviado';
M.repintarEsperaDeMegaBot(espera);
comprobar('mientras espera, muestra los puntitos',
  espera.innerHTML.includes('megabot-puntitos'));
comprobar('y dice que se entregó',
  espera.innerHTML.includes('Entregado'), espera.innerHTML);

espera.dataset.agotado = '1';
M.repintarEsperaDeMegaBot(espera);
comprobar('agotada, ya no muestra puntitos',
  !espera.innerHTML.includes('megabot-puntitos'));
comprobar('agotada, dice que el mensaje SÍ llegó',
  espera.innerHTML.includes('sí llegó'), espera.innerHTML);
comprobar('agotada, NO culpa a la conexión',
  !/conexi[oó]n/i.test(espera.innerHTML), espera.innerHTML);

const noEntregada = new ElementoFalso();
noEntregada.dataset.entrega = 'error';
noEntregada.dataset.agotado = '1';
M.repintarEsperaDeMegaBot(noEntregada);
comprobar('si no se entregó, lo dice',
  noEntregada.innerHTML.includes('No se pudo entregar'), noEntregada.innerHTML);

const enReposo = new ElementoFalso();
enReposo.dataset.entrega = 'pendiente';
enReposo.dataset.agotado = '1';
M.repintarEsperaDeMegaBot(enReposo);
comprobar('si ni se intentó, lo dice',
  enReposo.innerHTML.includes('No se intentó entregar'), enReposo.innerHTML);

const dos = new ElementoFalso();
dos.dataset.enCola = '3';
dos.dataset.entrega = 'enviado';
M.repintarEsperaDeMegaBot(dos);
comprobar('avisa cuántas preguntas hay en cola',
  dos.innerHTML.includes('3 preguntas en cola'), dos.innerHTML);

comprobar('el tope de espera supera la espera real medida (~68 s)',
  M.TOPE_DE_ESPERA_MEGABOT_MS > 68000,
  'vale ' + M.TOPE_DE_ESPERA_MEGABOT_MS);

console.log('\nA7 · el contador de uso no miente\n');

const span = new ElementoFalso();
documentoFalso._porId['hoja-uso'] = span;

M.pintarUsoDeMegaBot({ porcentaje: 45, reinicia_en: 3600, agotado: false, hace_segundos: 30 });
comprobar('dato fresco con reloj: se muestra con el tiempo',
  span.textContent.includes('Uso 45%') && span.textContent.includes('Se restablece en'),
  span.textContent);

M.pintarUsoDeMegaBot({ porcentaje: 45, reinicia_en: 0, agotado: false, hace_segundos: 30 });
comprobar('dato fresco sin reloj: solo el porcentaje, sin antigüedad',
  span.textContent === 'Uso 45%', span.textContent);

M.pintarUsoDeMegaBot({ porcentaje: 45, reinicia_en: 0, agotado: false, hace_segundos: 10800 });
comprobar('dato de hace 3 h sin reloj: dice de cuándo es',
  span.textContent.includes('hace 3 h'), span.textContent);

M.pintarUsoDeMegaBot({ porcentaje: 45, reinicia_en: 0, agotado: false,
                       hace_segundos: M.EDAD_MAXIMA_DE_USO_S + 60 });
comprobar('dato de hace más de dos días: se calla',
  span.hidden === true && span.textContent === '',
  'quedó "' + span.textContent + '"');

M.pintarUsoDeMegaBot({ porcentaje: 45, reinicia_en: 7200, agotado: false,
                       hace_segundos: M.EDAD_MAXIMA_DE_USO_S + 60 });
comprobar('pero con el reloj corriendo NO se calla (se mantiene solo)',
  span.hidden === false && span.textContent.includes('Uso 45%'),
  'quedó "' + span.textContent + '"');

M.pintarUsoDeMegaBot(null);
comprobar('sin dato, oculto', span.hidden === true);

/* El dibujo que pidio Carlos: cifra arriba, cuando vuelve abajo. */
M.pintarUsoDeMegaBot({ porcentaje: 14, reinicia_en: 187200, agotado: false, hace_segundos: 5 });
comprobar('la cifra va en su propio renglon',
  span.innerHTML.includes('hoja__uso-cifra') && span.innerHTML.includes('Uso 14%'),
  span.innerHTML);
comprobar('y el cuando vuelve en el de abajo',
  span.innerHTML.includes('hoja__uso-pie') && span.innerHTML.includes('Se restablece en'),
  span.innerHTML);
comprobar('hasta el 70% NO se pinta de alarma',
  !span.className.includes('alerta') && !span.className.includes('ojo'), span.className);

M.pintarUsoDeMegaBot({ porcentaje: 75, reinicia_en: 3600, agotado: false, hace_segundos: 5 });
comprobar('desde el 70% pasa a ambar',
  span.className.includes('hoja__uso--ojo'), span.className);

M.pintarUsoDeMegaBot({ porcentaje: 94, reinicia_en: 3600, agotado: false, hace_segundos: 5 });
comprobar('desde el 90% pasa a alarma',
  span.className.includes('hoja__uso--alerta'), span.className);

M.pintarUsoDeMegaBot({ porcentaje: null, reinicia_en: 0, agotado: true, hace_segundos: 5 });
comprobar('sin cuota lo dice sin inventar porcentaje',
  span.innerHTML.includes('Sin cuota') && !/\d+%/.test(span.innerHTML), span.innerHTML);


/* ─── A8 · el cronómetro de la espera ──────────────────────────────── */

console.log('\nA8 · la espera se puede leer\n');

const hace = s => Date.now() - s * 1000;

comprobar('segundos sueltos',
  M.esperaDeMegaBotEnPalabras(hace(38)) === '38 s',
  M.esperaDeMegaBotEnPalabras(hace(38)));

comprobar('pasado el minuto, cambia de unidad',
  M.esperaDeMegaBotEnPalabras(hace(95)) === '1 min 35 s',
  M.esperaDeMegaBotEnPalabras(hace(95)));

comprobar('minutos justos no dicen "0 s"',
  M.esperaDeMegaBotEnPalabras(hace(120)) === '2 min',
  M.esperaDeMegaBotEnPalabras(hace(120)));

/* Que el tiempo aparezca en la burbuja de espera, que es el punto: sin
   esto la espera vuelve a ser muda. */
const filaEspera = new ElementoFalso();
filaEspera.dataset.enCola = '1';
filaEspera.dataset.desde = String(hace(42));
filaEspera.dataset.entrega = 'enviado';
M.repintarEsperaDeMegaBot(filaEspera);
comprobar('la burbuja de espera muestra cuánto lleva',
  filaEspera.innerHTML.includes('42 s'), filaEspera.innerHTML);

// Y con la espera agotada TAMBIÉN: es cuando más importa saberlo.
filaEspera.dataset.agotado = '1';
M.repintarEsperaDeMegaBot(filaEspera);
comprobar('agotada, sigue diciendo cuánto lleva',
  filaEspera.innerHTML.includes('42 s'), filaEspera.innerHTML);

// Una burbuja de antes de esta versión no trae la marca: no debe
// inventar un tiempo ni romperse.
const filaVieja = new ElementoFalso();
filaVieja.dataset.enCola = '1';
filaVieja.dataset.entrega = 'enviado';
M.repintarEsperaDeMegaBot(filaVieja);
comprobar('sin marca de inicio, no inventa un tiempo',
  !/\d+ s/.test(filaVieja.innerHTML), filaVieja.innerHTML);

comprobar('«enviando» tiene texto propio, no queda muda',
  (() => {
    const f = new ElementoFalso();
    f.dataset.enCola = '1';
    f.dataset.entrega = 'enviando';
    M.repintarEsperaDeMegaBot(f);
    return f.innerHTML.includes('Entregando');
  })());


/* ─── A9 · los tiempos de cada salto ───────────────────────────────── */

console.log('\nA9 · los tiempos no se muestran a quien no corresponde\n');

comprobar('sin el campo latencia, no se pinta nada',
  M.htmlDeTiemposDeMegaBot({ id: 1, rol: 'megabot', texto: 'hola' }) === '');

comprobar('con tramos vacíos tampoco',
  M.htmlDeTiemposDeMegaBot({ id: 1, latencia: { tramos: {} } }) === '');

const conTiempos = M.htmlDeTiemposDeMegaBot({
  id: 1, latencia: { tramos: { enviar_a_webhook: 180, total_servidor: 41200 } },
});
comprobar('con tramos, sale plegado', conTiempos.startsWith('<details'), conTiempos);
comprobar('los milisegundos chicos se dicen en ms',
  conTiempos.includes('180 ms'), conTiempos);
comprobar('y los grandes en segundos con coma decimal',
  conTiempos.includes('41,2 s'), conTiempos);

comprobar('un minuto largo se dice en minutos',
  M.msEnPalabras(149800) === '2 min 30 s', M.msEnPalabras(149800));

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobacion(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Todo lo que se puede probar sin navegador, pasa.\n');
