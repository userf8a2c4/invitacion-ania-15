/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · EL ECLIPSE CARGA SIN REVENTAR
   ══════════════════════════════════════════════════════════════════════

   ⛔ EL 14 DE SEPTIEMBRE DE 2026, `28-eclipse.js` LANZABA UNA EXCEPCIÓN
      CADA VEZ QUE SE CARGABA, Y LAS 28 PRUEBAS DABAN VERDE.

   El defecto: `medirElLienzoDeLaOfrenda()` leía `muerte.escala0`, pero
   `muerte` se asigna 700 líneas más abajo y a esa función se llega desde
   el NIVEL SUPERIOR del archivo. `var` se iza, así que valía `undefined`.

   Una excepción sin atrapar en el nivel superior aborta el IIFE entero:
   sin `muerte`, sin puerta, sin `empezar()`. El ritual no podía correr
   ninguna vez. Se descubrió abriendo pbe.aniaxv.com en un navegador de
   verdad — no lo cazó ninguna prueba.

   ── POR QUÉ NINGUNA PRUEBA LO VIO ────────────────────────────────────

   Porque las 28 LEEN el texto del archivo. Ninguna lo EJECUTA. Se puede
   escribir un `28-eclipse.js` que pase las 28 comprobaciones de texto y
   que reviente en su primera línea. Es exactamente el mismo agujero que
   el 14 de septiembre costó el minuto con el vigía, y que se cerró
   escribiendo `prueba-vigia-reloj.mjs`. El eclipse había quedado sin ese
   tratamiento.

   Esta prueba no lee: CORRE el archivo minificado —el que se sirve— en
   un navegador de mentira, y comprueba que no lance.

   ⚠️ SE PRUEBA `codigo/produccion/`, NO `codigo/`. Lo que reventaba en
   PBE era el minificado. Si algún día terser transformara algo de forma
   que cambie el comportamiento, esta prueba lo ve y una que mire el
   fuente no.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaDe = (...p) => join(raiz, ...p);
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que);
  if (!bien) { fallos++; if (detalle) console.log('        → ' + detalle); }
};

const RUTA_MINIFICADO = 'codigo/produccion/28-eclipse.js';

/* ⛔ UNA EXCEPCIÓN ASÍNCRONA TIENE QUE VERSE COMO FALLA.
   Sin esto, un error dentro de un temporizador que se escapó del banco
   mataba el proceso DESPUÉS del resumen: salida 1, ninguna FALLA
   impresa, y Node volcando los 32 KB del archivo minificado a la
   terminal. Media hora para entender que el problema era el banco. */
process.on('uncaughtException', (e) => {
  console.log('\n  FALLA una excepción asíncrona se escapó del banco');
  console.log('        → ' + String(e && e.message));
  console.log('        → suele querer decir que un reloj o un observador ' +
              'no está inyectado y corrió de verdad');
  process.exit(1);
});


/* ══════════════════════════════════════════════════════════════════════
   EL NAVEGADOR DE MENTIRA
   ══════════════════════════════════════════════════════════════════════

   No pretende ser un DOM de verdad: pretende ser lo bastante parecido
   como para que el archivo llegue hasta el final sin lanzar. Todo lo que
   se le pregunta devuelve algo con forma razonable. */

/** Un pincel de <canvas> que acepta todo y no devuelve nada raro. */
function pincelDeMentira() {
  const nada = () => {};
  return new Proxy({
    canvas: null,
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: nada }),
    createRadialGradient: () => ({ addColorStop: nada }),
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setTransform: nada, save: nada, restore: nada,
  }, {
    get(obj, clave) {
      if (clave in obj) return obj[clave];
      /* Cualquier método que el archivo llame y no esté previsto. */
      return nada;
    },
    set(obj, clave, valor) { obj[clave] = valor; return true; },
  });
}

/** Un elemento de mentira: cualquier propiedad que le pidan, existe. */
function elementoDeMentira(etiqueta) {
  const estilo = new Proxy({}, {
    get: (o, k) => (k === 'setProperty' || k === 'removeProperty'
      ? () => {} : (o[k] !== undefined ? o[k] : '')),
    set: (o, k, v) => { o[k] = v; return true; },
  });

  const clases = new Set();

  const el = {
    tagName: String(etiqueta || 'div').toUpperCase(),
    style: estilo,
    dataset: {},
    width: 300, height: 150,
    offsetWidth: 300, offsetHeight: 150,
    clientWidth: 300, clientHeight: 150,
    children: [], childNodes: [],
    parentNode: null,
    textContent: '', innerHTML: '',
    classList: {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      toggle: (c, f) => (f ? clases.add(c) : clases.delete(c)),
      contains: (c) => clases.has(c),
    },
    getContext: () => pincelDeMentira(),
    getBoundingClientRect: () => ({
      top: 0, left: 0, right: 300, bottom: 150,
      width: 300, height: 150, x: 0, y: 0,
    }),
    appendChild: (h) => { el.children.push(h); if (h) h.parentNode = el; return h; },
    insertBefore: (h) => { el.children.push(h); if (h) h.parentNode = el; return h; },
    removeChild: (h) => { if (h) h.parentNode = null; return h; },
    remove: () => {},
    setAttribute: nadaNada, removeAttribute: nadaNada, getAttribute: () => null,
    hasAttribute: () => false,
    addEventListener: nadaNada, removeEventListener: nadaNada,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    animate: () => ({ cancel: nadaNada, finish: nadaNada, onfinish: null }),
    cloneNode: () => elementoDeMentira(etiqueta),
    focus: nadaNada, blur: nadaNada,
  };
  return el;

  function nadaNada() {}
}


/** IntersectionObserver / ResizeObserver / MutationObserver, de mentira. */
class ObservadorDeMentira {
  constructor(fn) { this.fn = fn; }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

/**
 * Corre el archivo del eclipse en un navegador de mentira.
 *
 * @param {string} fuente     El JavaScript a ejecutar.
 * @param {Object} [guion]    escenaVacia, desfase.
 * @returns {{reventó: (Error|null), cuadros: number, api: Object}}
 */
function correrElEclipse(fuente, guion, prestados) {
  guion = guion || {};
  prestados = prestados || {};

  let ahora = Date.UTC(2026, 8, 15, 12, 30, 0, 0);
  const temporizadores = [];
  const cuadros = [];

  /* La escena: las flores, los pétalos, las velas. Con `escenaVacia` no
     hay ninguna — es el caso que 28-eclipse.js documenta como «con cero,
     el eclipse corre sin que las plantas se muevan». Tiene que cargar
     igual. */
  const cuantos = guion.escenaVacia ? 0 : 12;
  const monton = Array.from({ length: cuantos }, () => elementoDeMentira('div'));

  const raizFalsa = elementoDeMentira('html');
  const cuerpo = elementoDeMentira('body');

  const documento = {
    documentElement: raizFalsa,
    body: cuerpo,
    head: elementoDeMentira('head'),
    hidden: false,
    visibilityState: 'visible',
    activeElement: null,
    readyState: 'complete',
    createElement: (t) => elementoDeMentira(t),
    createElementNS: (ns, t) => elementoDeMentira(t),
    createDocumentFragment: () => elementoDeMentira('fragment'),
    querySelector: (sel) => (guion.escenaVacia ? null : elementoDeMentira('div')),
    querySelectorAll: (sel) => monton,
    getElementById: () => (guion.escenaVacia ? null : elementoDeMentira('div')),
    getElementsByClassName: () => monton,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  const ventana = {
    innerWidth: 1280, innerHeight: 720,
    scrollY: 0, scrollX: 0, pageYOffset: 0,
    devicePixelRatio: 1,
    ECLIPSE_EMPIEZA_EN: guion.desfase === undefined ? null : guion.desfase,
    matchMedia: () => ({ matches: false, addListener: () => {}, addEventListener: () => {} }),
    getComputedStyle: () => new Proxy({}, {
      get: (o, k) => (k === 'getPropertyValue' ? () => '' : ''),
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (f) => { cuadros.push(f); return cuadros.length; },
    cancelAnimationFrame: () => {},
    setTimeout: (f, ms) => { temporizadores.push({ cuando: ahora + (ms || 0), f }); return temporizadores.length; },
    clearTimeout: () => {},
    setInterval: (f, ms) => { temporizadores.push({ cuando: ahora + (ms || 0), f, repite: true }); return temporizadores.length; },
    clearInterval: () => {},
    requestIdleCallback: (f) => { cuadros.push(() => f({ timeRemaining: () => 8, didTimeout: false })); return cuadros.length; },
    cancelIdleCallback: () => {},
    performance: { now: () => 0 },
    CSS: { supports: () => true },
  };

  const RelojFalso = class extends Date {
    constructor(...a) { super(...(a.length ? a : [ahora])); }
    static now() { return ahora; }
  };

  let reventó = null;
  let api = {};

  try {
    /* Se le devuelve lo que el archivo deje colgado de `window`, que es
       por donde 29-ensayo-del-eclipse.js lo maneja. */
    const nombresPrestados = Object.keys(prestados);

    /* ⛔ TODOS LOS RELOJES SE TAPAN, NO SOLO setTimeout.
       Lo que no se inyecte acá se resuelve al global de Node y corre DE
       VERDAD, fuera del try/catch: el error aparece después de que la
       prueba terminó, con una traza que no dice nada y un código de
       salida 1 sin una sola FALLA impresa. Pasó con `setInterval`. */
    new Function(
      'document', 'window', 'location', 'Date',
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'queueMicrotask',
      'navigator', 'getComputedStyle', 'matchMedia', 'performance',
      'IntersectionObserver', 'ResizeObserver', 'MutationObserver',
      'fetch', 'self', 'globalThis',
      ...nombresPrestados,
      fuente
    )(
      documento, ventana,
      { hostname: 'pbe.aniaxv.com', pathname: '/', search: '?eclipse=ensayo', href: 'https://pbe.aniaxv.com/' },
      RelojFalso,
      ventana.setTimeout, ventana.clearTimeout,
      ventana.setInterval, ventana.clearInterval,
      ventana.requestAnimationFrame, ventana.cancelAnimationFrame,
      ventana.requestIdleCallback, ventana.cancelIdleCallback,
      (f) => { try { f(); } catch (e) { /* el banco no encola microtareas */ } },
      { userAgent: 'banco', hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0 },
      ventana.getComputedStyle, ventana.matchMedia, ventana.performance,
      ObservadorDeMentira, ObservadorDeMentira, ObservadorDeMentira,
      () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
      ventana, ventana,
      ...nombresPrestados.map((n) => prestados[n])
    );
    api = ventana;
  } catch (e) {
    reventó = e;
  }

  /* Un par de cuadros, por si el trabajo de verdad pasa ahí adentro. */
  if (!reventó) {
    try {
      for (let i = 0; i < 3 && cuadros.length; i++) {
        const f = cuadros.shift();
        ahora += 42;
        f(ahora);
      }
    } catch (e) { reventó = e; }
  }

  return { reventó, cuadros: cuadros.length, api };
}


/* ══════════════════════════════════════════════════════════════════════
   LOS GLOBALES QUE EL ECLIPSE ESPERA DE SUS HERMANOS
   ══════════════════════════════════════════════════════════════════════

   `28-eclipse.js` no está solo en la página: usa funciones que declaran
   otros archivos de la escena — `scrollActualY()` vive en
   02-utilidades.js:484, por ejemplo. En el navegador son globales y están
   ahí; en este banco no existen y el archivo tira un ReferenceError.

   En vez de mantener a mano una lista que se queda vieja, el banco los
   DESCUBRE: corre, atrapa el «X is not defined», le presta un trasto con
   ese nombre, y vuelve a correr. Al final dice cuáles tuvo que prestar —
   que es, de paso, la lista de lo que el eclipse depende de sus hermanos.

   ⚠️ SI UN DÍA ESA LISTA CRECE MUCHO, es una señal: el archivo que
   prometía no depender de nadie está dependiendo de medio proyecto. */

/** Un trasto que se puede llamar, sumar y al que se le puede pedir todo. */
function trasto() {
  const f = function () { return 0; };
  return new Proxy(f, {
    get(objetivo, clave) {
      if (clave === Symbol.toPrimitive) return () => 0;
      if (clave === 'valueOf') return () => 0;
      if (clave === 'toString') return () => '';
      if (clave in objetivo) return objetivo[clave];
      return trasto();
    },
    apply() { return 0; },
    /* ⚠️ HACE FALTA LA TRAMPA DE CONSTRUCCION: el eclipse hace
       `new Image()` y sin esto `new` devuelve una instancia PLANA, no
       el proxy, asi que pedirle .addEventListener daba undefined. */
    construct() { return trasto(); },
    set() { return true; },
  });
}

/**
 * Corre el eclipse prestándole lo que le falte, hasta que cargue.
 *
 * @param {string} fuente
 * @param {Object} guion
 * @returns {{reventó: (Error|null), prestados: string[]}}
 */
function correrPrestando(fuente, guion) {
  const prestados = {};
  const nombres = [];

  for (let vuelta = 0; vuelta < 40; vuelta++) {
    const r = correrElEclipse(fuente, guion, prestados);
    if (!r.reventó) return { reventó: null, prestados: nombres };

    const falta = String(r.reventó.message || '')
      .match(/^(\w[\w$]*) is not defined$/);
    if (!falta) return { reventó: r.reventó, prestados: nombres };

    prestados[falta[1]] = trasto();
    nombres.push(falta[1]);
  }

  return { reventó: new Error('demasiados globales prestados'), prestados: nombres };
}


/* ══════════════════════════════════════════════════════════════════════
   1. EL ARCHIVO QUE SE SIRVE TIENE QUE CARGAR
   ══════════════════════════════════════════════════════════════════════ */

console.log('\nEl eclipse carga sin reventar\n');

let minificado = '';
try {
  minificado = leer(RUTA_MINIFICADO);
} catch (e) {
  console.log('  FALLA no existe ' + RUTA_MINIFICADO);
  console.log('        → corré `node herramientas/minificar-js.mjs` antes');
  process.exit(1);
}

const CASOS = [
  { nombre: 'con la escena montada', guion: {} },
  { nombre: 'con la escena VACÍA (cero flores)', guion: { escenaVacia: true } },
  { nombre: 'entrando desde el principio', guion: { desfase: 0 } },
  { nombre: 'entrando a mitad del minuto (30 s)', guion: { desfase: -30000 } },
  { nombre: 'faltando 20 s para la hora', guion: { desfase: 20000 } },
];

let prestadosVistos = [];

for (const c of CASOS) {
  const r = correrPrestando(minificado, c.guion);
  if (r.prestados.length > prestadosVistos.length) prestadosVistos = r.prestados;
  comprobar(c.nombre, !r.reventó,
    r.reventó
      ? String(r.reventó && r.reventó.message) + ' · ' +
        String((r.reventó && r.reventó.stack) || '').split('\n')[1]
      : '');
}

console.log('\n  (globales prestados de otros archivos: ' +
  (prestadosVistos.length ? prestadosVistos.join(', ') : 'ninguno') + ')');


/* ══════════════════════════════════════════════════════════════════════
   2. Y EL FUENTE TAMBIÉN
   ══════════════════════════════════════════════════════════════════════

   Si el fuente carga y el minificado no, el problema es de terser y hay
   que saberlo por separado. */

const fuente = leer('codigo/28-eclipse.js');
const rf = correrPrestando(fuente, {});
comprobar('y el fuente sin minificar también carga',
  !rf.reventó,
  rf.reventó ? String(rf.reventó.message) : '');


/* ══════════════════════════════════════════════════════════════════════
   3. LA MORDIDA
   ══════════════════════════════════════════════════════════════════════

   Devolverle el defecto exacto del 14 de septiembre tiene que hacer que
   esta prueba falle. Si no falla, la prueba no está probando nada.

   ⚡ NO SE TOCA NINGÚN ARCHIVO: la mordida se aplica a una copia en
   memoria del texto que ya se leyó. */

console.log('\nLa mordida: devolverle el defecto tiene que romperla\n');

const LA_GUARDA = 'var escalaDeLaRosa = muerte ? (muerte.escala0 || muerte.escala || 1) : 1;';
const SIN_GUARDA = 'var escalaDeLaRosa = (muerte.escala0 || muerte.escala || 1);';

if (fuente.indexOf(LA_GUARDA) < 0) {
  comprobar('la mordida encuentra dónde morder', false,
    'no se encontró la guarda en codigo/28-eclipse.js. Si se reescribió, ' +
    'hay que volver a escribir esta mordida contra el código de hoy');
} else {
  const mordido = fuente.replace(LA_GUARDA, SIN_GUARDA);
  const rm = correrPrestando(mordido, {});

  comprobar('sin la guarda, el archivo revienta al cargar',
    !!rm.reventó,
    'el archivo cargó igual sin la guarda: o el orden de las llamadas ' +
    'cambió, o esta prueba dejó de cubrir el defecto que la motivó');

  if (rm.reventó) {
    comprobar('y revienta exactamente por «escala0»',
      /escala0/.test(String(rm.reventó.message)),
      'reventó por otra cosa: ' + String(rm.reventó.message));
  }
}


/* ══════════════════════════════════════════════════════════════════════
   4. EL ORDEN QUE CAUSÓ TODO, ESCRITO PARA QUE NO SE REPITA
   ══════════════════════════════════════════════════════════════════════ */

console.log('\nEl orden de las declaraciones\n');

const lineaDe = (texto, aguja) =>
  texto.slice(0, texto.indexOf(aguja)).split('\n').length;

const usaMuerte = lineaDe(fuente, 'muerte ? (muerte.escala0');
const declaraMuerte = lineaDe(fuente, 'var muerte = {');
const llamaNivelSuperior = fuente.indexOf('\n  medirElLienzo();');

comprobar('`muerte` se sigue usando ANTES de declararse, y por eso la guarda',
  usaMuerte < declaraMuerte,
  'si ahora se declara antes (línea ' + declaraMuerte + ' contra ' + usaMuerte +
  '), la guarda dejó de hacer falta — pero dejarla no cuesta nada y sacarla ' +
  'reabre el agujero si el orden vuelve a moverse');

comprobar('y medirElLienzo() se sigue llamando desde el nivel superior',
  llamaNivelSuperior > 0,
  'esa llamada es la que hace que todo esto ocurra antes de tiempo. Si ' +
  'desapareció, conviene saberlo: cambia cuándo se mide el lienzo');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El eclipse carga y corre en los ' + CASOS.length + ' escenarios,\n' +
            '  y se rompe en cuanto se le devuelve el defecto.\n');
