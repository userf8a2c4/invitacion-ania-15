/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · EL VIGÍA, CORRIENDO CONTRA UN RELOJ
   ══════════════════════════════════════════════════════════════════════

   ⛔ EL 14 DE SEPTIEMBRE DE 2026 LLEGARON LAS 6:30 DE TEGUCIGALPA Y NO
      PASÓ NADA. Carlos: «hoy fallamos, mañana no podemos fallar por nada
      del mundo».

   Y el problema de fondo no fue solo el defecto: fue que TODAS las pruebas
   del vigía miraban el texto del archivo. Leían que existiera un
   `setTimeout`, que estuviera escrito `sePuede()`, que apareciera la
   palabra `AVISO`. Ninguna preguntaba jamás lo único que importa:

       ¿ARRANCA?

   Se puede escribir un vigía que pase las treinta comprobaciones de texto
   de `prueba-eclipse.mjs` y que no dispare ni un solo día del año. Eso es
   exactamente lo que estaba desplegado.

   Así que esta prueba no lee: EJECUTA. Saca el vigía de `index.html` tal
   como está, lo corre contra un reloj de mentira y un navegador de
   mentira, y mira si pidió el archivo y en qué segundo.

   ── EL MODELO DEL NAVEGADOR, QUE ES LO QUE TIENE QUE SER HONESTO ──────

     · Los TEMPORIZADORES de una pestaña de fondo se agrupan: el navegador
       la despierta como mucho una vez por minuto. Acá se modela con una
       rejilla de 60 s desde que la pestaña se fue al fondo. Por eso el
       reintento de cada segundo NO alcanza por sí solo.

     · Los EVENTOS externos NO se estrangulan. Volver a la pestaña dispara
       `visibilitychange` en el instante, no en el próximo despertar.

     ⚠️ La primera versión de este banco trataba las dos cosas igual y daba
     dos falsos negativos. Queda escrito porque el error es tentador: si
     este banco se vuelve a tocar, los eventos van por su lado.

   ── LO QUE ESTE BANCO *NO* PUEDE PROBAR ───────────────────────────────

     · Que en iOS con la pantalla bloqueada llegue `visibilitychange`. No
       llega, o llega tarde; está medido en `10-reproductor-de-musica.js`.
       Si el teléfono está bloqueado el minuto entero, no hay forma. Este
       banco asume que el evento llega, porque lo que prueba es el vigía.

     · Que el sobre cerrado sea de verdad un problema. Acá `querySelector`
       devuelve null siempre; la guarda del sobre se prueba por texto en
       `prueba-eclipse.mjs`, que es donde corresponde.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* ⚡ SE NORMALIZAN LOS FINES DE LÍNEA AL LEER (2026-09-16)
 *
 * Las mordidas de más abajo buscan trozos de código de varias líneas,
 * escritos acá con saltos de línea sueltos. Pero empaquetar.mjs y
 * subir-version.mjs reescriben index.html, y en Windows lo dejan con
 * retorno de carro: entonces ninguna mordida encuentra dónde morder, y
 * la prueba se pone roja sin que nadie haya tocado el vigía.
 *
 * Pasó hoy, y costó un rato entender que el código estaba intacto —byte
 * a byte igual al del repositorio— y que lo único que había cambiado era
 * el final de cada línea. Una prueba que se pone roja sola es peor que
 * no tenerla: enseña a ignorarla, y el día que se ponga roja de verdad
 * nadie va a mirar.
 */
const RETORNO = String.fromCharCode(13);
const SALTO   = String.fromCharCode(10);

const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8')
  .split(RETORNO + SALTO).join(SALTO);

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que);
  if (!bien) { fallos++; if (detalle) console.log('        → ' + detalle); }
};

const S = 1000;
const DIA = 86400 * S;
const HORA = Date.UTC(2026, 8, 15, 12, 30, 0, 0);

/** La otra hora, para probar que la configurable de verdad manda. */
const OTRA = Date.UTC(2026, 8, 15, 14, 0, 0, 0);

/* ── Sacar el vigía de index.html ─────────────────────────────────── */

const html = leer('index.html');
const desde = html.indexOf('(function vigiaDelEclipse');
const hasta = html.indexOf('})();', desde) + 5;

if (desde < 0 || hasta < 5) {
  console.log('  FALLA no se encontró el vigía en index.html');
  process.exit(1);
}

const VIGIA = html.slice(desde, hasta);


/* ══════════════════════════════════════════════════════════════════════
   EL NAVEGADOR DE MENTIRA
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Corre un guion contra una copia del vigía y devuelve los instantes en
 * que pidió el archivo del eclipse.
 *
 * @param {string} fuente   El vigía a correr (el real, o uno mordido).
 * @param {Object} guion    desde, hasta, oculta, sobreCerrado, focoEnCampo, hitos.
 * @returns {Array<number>} Los instantes absolutos de cada pedido.
 */
async function correr(fuente, guion) {
  let ahora = guion.desde;
  const pedidos = [];
  let temporizadores = [];
  const escuchas = {};

  const estado = {
    oculta: !!guion.oculta,
    sobreCerrado: !!guion.sobreCerrado,
    focoEnCampo: !!guion.focoEnCampo,
  };

  /* La rejilla de agrupamiento de la pestaña de fondo. */
  let proximoDespertar = estado.oculta ? guion.desde + 60 * S : -Infinity;

  const escuchar = (n, f) => { (escuchas[n] = escuchas[n] || []).push(f); };

  const documento = {
    get hidden() { return estado.oculta; },
    documentElement: {
      classList: { contains: (c) => (c === 'sobre-visible' ? estado.sobreCerrado : false) },
    },
    get activeElement() { return estado.focoEnCampo ? { tagName: 'INPUT' } : null; },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      set src(v) { pedidos.push(ahora); },
      async: false, onerror: null, parentNode: null,
    }),
    /* ⛔ Con `revientaAlPedir`, meter el <script> tira una excepción.
       Pasa de verdad: una CSP que rechaza el script, una extensión que
       dejó el <body> raro. Lo que se prueba con esto es que una excepción
       no mate el vigía para siempre. */
    body: {
      appendChild: () => {
        if (guion.revientaAlPedir) throw new Error('appendChild bloqueado');
      },
    },
    addEventListener: escuchar,
  };

  const ventana = {
    addEventListener: escuchar,
    ECLIPSE_EMPIEZA_EN: null,
    matchMedia: () => ({ matches: false }),
  };

  /* `Date.now()` y `new Date()` tienen que ver el reloj de mentira: el
     vigía usa los dos para saber qué día es en UTC. */
  const RelojFalso = class extends Date {
    constructor(...a) { super(...(a.length ? a : [ahora])); }
    static now() { return ahora; }
  };

  /* ⛔ TODO LO QUE EL VIGÍA USE TIENE QUE ESTAR EN ESTA LISTA.
   *
   * Lo que NO está acá no da error: se resuelve al global de Node y hace
   * cualquier otra cosa en silencio. `clearTimeout` es el ejemplo exacto:
   * si el vigía llamara al de Node con un id de este banco, no cancelaría
   * nada y el banco contaría los mismos temporizadores con o sin la
   * llamada. Una mordida sobre esa línea pasaría siempre.
   *
   * Por eso `clearTimeout` está inyectado y `setTimeout` devuelve un id
   * de verdad, aunque el vigía de hoy no los use: el día que alguien los
   * agregue, el banco ya sabe medirlos. */

  let proximoId = 1;

  const ponerTemporizador = (f, ms) => {
    const id = proximoId++;
    temporizadores.push({ id, cuando: ahora + Math.max(0, ms), f });
    return id;
  };

  const quitarTemporizador = (id) => {
    temporizadores = temporizadores.filter((t) => t.id !== id);
  };

  /* La memoria del navegador, de mentira pero con estado: el vigía guarda
     acá la hora que aprendió del servidor para leerla sincrónica en la
     próxima carga. Un guion puede precargarla con `memoria`. */
  const memoria = Object.assign({}, guion.memoria || {});
  const almacen = {
    getItem: (k) => (k in memoria ? memoria[k] : null),
    setItem: (k, v) => { memoria[k] = String(v); },
    removeItem: (k) => { delete memoria[k]; },
  };

  /* ⛔ EL FETCH TIENE QUE PODER RESOLVER, NO SOLO FALLAR.
   *
   * La primera versión de este banco devolvía siempre una promesa
   * rechazada. Con eso, TODO el camino de «preguntarle la hora al
   * servidor» quedaba sin ejecutar y el banco daba luz verde igual —que
   * es literalmente el defecto contra el que se escribió este archivo.
   *
   * `guion.red` decide qué contesta el servidor: un objeto se sirve como
   * JSON, `null` o nada es un corte de red. */
  const pedidosDeRed = [];
  const red = (url) => {
    pedidosDeRed.push({ en: ahora, url: String(url) });
    const cuerpo = typeof guion.red === 'function'
      ? guion.red(String(url), ahora) : guion.red;
    if (!cuerpo) return Promise.reject(new Error('sin red en el banco'));
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(typeof cuerpo === 'string'
        ? cuerpo : JSON.stringify(cuerpo)),
      json: () => Promise.resolve(typeof cuerpo === 'string'
        ? JSON.parse(cuerpo) : cuerpo),
    });
  };

  new Function('document', 'window', 'location', 'Date',
               'setTimeout', 'clearTimeout',
               'fetch', 'sessionStorage', 'localStorage', 'navigator', fuente)(
    documento, ventana,
    { hostname: 'aniaxv.com', pathname: '/', search: '', reload: () => {} },
    RelojFalso,
    ponerTemporizador, quitarTemporizador,
    red,
    { getItem: () => null, setItem: () => {} },
    almacen,
    { userAgent: 'banco', hardwareConcurrency: 8 });

  const hitos = (guion.hitos || []).slice().sort((a, b) => a.en - b.en);

  /* ⛔ SIN ESTO, NINGÚN `.then()` CORRE NUNCA.
   *
   * El bucle de abajo es sincrónico: mientras da vueltas, el motor no
   * vacía la cola de microtareas, así que la respuesta de un `fetch`
   * queda esperando hasta que el banco terminó. Todo el camino de
   * «preguntarle la hora al servidor» se saltaba entero y el banco
   * igual daba verde.
   *
   * `await respirar()` cede el control una vez por vuelta. Es la
   * diferencia entre probar el código y mirarlo. */
  const respirar = () => new Promise((listo) => setImmediate(listo));

  /* Bucle guiado por eventos: se salta directo al próximo instante en que
     algo puede pasar, así un guion de dos días no cuesta dos días. */
  let vueltas = 0;
  while (ahora < guion.hasta && vueltas++ < 500000) {
    await respirar();
    const proximoTemp = temporizadores.length
      ? Math.min.apply(null, temporizadores.map((t) => t.cuando)) : Infinity;

    /* De fondo, un temporizador no corre hasta el próximo despertar. */
    const cuandoCorre = estado.oculta
      ? Math.max(proximoTemp, proximoDespertar) : proximoTemp;

    const proximoHito = hitos.length ? hitos[0].en : Infinity;
    const siguiente = Math.min(cuandoCorre, proximoHito);

    if (!isFinite(siguiente) || siguiente > guion.hasta) break;
    ahora = siguiente;

    if (proximoHito === siguiente) {
      const h = hitos.shift();
      const iba = estado.oculta;
      Object.assign(estado, h.pone || {});
      if (iba && !estado.oculta) proximoDespertar = -Infinity;
      if (!iba && estado.oculta) proximoDespertar = ahora + 60 * S;
      if (h.evento) (escuchas[h.evento] || []).forEach((f) => f({}));
      continue;
    }

    const vencidos = temporizadores.filter((t) => t.cuando <= ahora);
    temporizadores = temporizadores.filter((t) => t.cuando > ahora);
    if (estado.oculta) proximoDespertar = ahora + 60 * S;
    for (const t of vencidos) { try { t.f(); } catch (e) { /* nada */ } }
  }

  await respirar();
  return pedidos;
}


/* ══════════════════════════════════════════════════════════════════════
   EL BANCO DE ESCENARIOS
   ══════════════════════════════════════════════════════════════════════

   `arranques` es cuántas veces tiene que pedir el archivo. `entre` es la
   ventana de segundos (respecto del minuto) en la que puede hacerlo. */

const BANCO = [
  { nombre: 'con la pestaña al frente, arranca antes de la hora',
    desde: HORA - 120 * S, hasta: HORA + 90 * S,
    arranques: 1, entre: [-25, 0] },

  { nombre: 'de fondo el minuto entero, NO arranca',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, oculta: true,
    arranques: 0,
    porque: 'la pestaña de fondo congela rAF: se vería roto y gastaría la ' +
            'descarga para nada. Es una decisión, no una falla' },

  { nombre: 'de fondo, vuelven al frente a los +10 s',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, oculta: true,
    hitos: [{ en: HORA + 10 * S, pone: { oculta: false }, evento: 'visibilitychange' }],
    arranques: 1, entre: [10, 11],
    porque: 'ES EL CASO DEL 14 DE SEPTIEMBRE: el vigía viejo ya había ' +
            'consumido el disparo del día 25 s antes' },

  { nombre: 'de fondo, vuelven por bfcache (iOS) a los +30 s',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, oculta: true,
    hitos: [{ en: HORA + 30 * S, pone: { oculta: false }, evento: 'pageshow' }],
    arranques: 1, entre: [30, 31],
    porque: 'iOS restaura desde bfcache sin disparar visibilitychange' },

  { nombre: 'de fondo, vuelven a los +59 s: alcanza por un segundo',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, oculta: true,
    hitos: [{ en: HORA + 59 * S, pone: { oculta: false }, evento: 'visibilitychange' }],
    arranques: 1, entre: [59, 60] },

  { nombre: 'de fondo, vuelven a los +61 s: ya pasó, no arranca',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, oculta: true,
    hitos: [{ en: HORA + 61 * S, pone: { oculta: false }, evento: 'visibilitychange' }],
    arranques: 0,
    porque: 'un ritual que empieza cuando ya terminó no es el ritual' },

  { nombre: 'con el sobre cerrado, lo abren a los +15 s',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, sobreCerrado: true,
    hitos: [{ en: HORA + 15 * S, pone: { sobreCerrado: false }, evento: 'sobre-abierto' }],
    arranques: 1, entre: [15, 16] },

  { nombre: 'con el sobre cerrado y nadie lo abre, NO arranca',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, sobreCerrado: true,
    arranques: 0,
    porque: 'sin abrir el sobre no existe la escena: correría sobre una ' +
            'página vacía' },

  { nombre: 'escribiendo en el formulario, sueltan a los +20 s',
    desde: HORA - 120 * S, hasta: HORA + 90 * S, focoEnCampo: true,
    hitos: [{ en: HORA + 20 * S, pone: { focoEnCampo: false } }],
    arranques: 1, entre: [20, 22],
    porque: 'acá no hay evento que avise: lo engancha el reintento de cada ' +
            'segundo' },

  { nombre: 'abren la página con el minuto ya corriendo (+18 s)',
    desde: HORA + 18 * S, hasta: HORA + 90 * S,
    arranques: 1, entre: [18, 19] },

  { nombre: 'PESTAÑA ABIERTA DESDE AYER: arranca los dos días',
    desde: HORA - 120 * S, hasta: HORA + DIA + 90 * S,
    arranques: 2, entre: [-25, 0],
    porque: 'el vigía viejo marcaba el flag sin rearmarlo: una pestaña ' +
            'abierta 24 h no disparaba el eclipse del día siguiente' },

  { nombre: 'si meter el <script> revienta, mañana igual lo intenta',
    desde: HORA - 120 * S, hasta: HORA + DIA + 90 * S,
    revientaAlPedir: true,
    arranques: 2, entre: [-25, 0],
    porque: '`mirar()` es lo único que vuelve a agendarse: una excepción ' +
            'sin atrapar no pierde un día, pierde la pestaña para siempre' },

  /* ── LA HORA CONFIGURABLE (Fase 2) ──────────────────────────────── */

  { nombre: 'con la hora guardada de antes, arranca a ESA hora',
    desde: OTRA - 120 * S, hasta: OTRA + 90 * S,
    memoria: { 'ania-hora-eclipse': '14:00|' + (OTRA - 600 * S) },
    arranques: 1, entre: [-25, 0], respectoDe: OTRA,
    porque: 'la lectura de localStorage es sincrónica y pasa ANTES de la ' +
            'primera resta: no hay un instante en que crea la hora vieja' },

  { nombre: 'con una hora guardada con forma rara, usa la horneada',
    desde: HORA - 120 * S, hasta: HORA + 90 * S,
    memoria: { 'ania-hora-eclipse': 'cuando sea|' + (HORA - 600 * S) },
    arranques: 1, entre: [-25, 0],
    porque: 'un valor escrito a mano en la base no puede apagarle el ' +
            'eclipse a nadie' },

  { nombre: 'el servidor dice otra hora y la pestaña la adopta',
    desde: HORA - 3 * 3600 * S, hasta: OTRA + 90 * S,
    red: { ok: true, utc: '14:00' },
    arranques: 1, entre: [-25, 0], respectoDe: OTRA,
    porque: 'es lo que hace que un cambio de hora llegue al día siguiente ' +
            'a cualquiera que abra la invitación con señal' },

  { nombre: 'el servidor contesta basura y no pasa nada',
    desde: HORA - 3 * 3600 * S, hasta: HORA + 90 * S,
    red: { ok: true, utc: '99:99' },
    arranques: 1, entre: [-25, 0],
    porque: 'el navegador valida con la misma expresión que el servidor' },

  { nombre: 'sin red, la horneada sigue funcionando igual que siempre',
    desde: HORA - 3 * 3600 * S, hasta: HORA + 90 * S,
    red: null,
    arranques: 1, entre: [-25, 0],
    porque: 'un homenaje que depende de que un PHP conteste es peor que ' +
            'uno que no' },

  /* ⛔ EL DOBLE ECLIPSE. Es el único camino por el que una pestaña puede
     adoptar una hora MÁS TARDE el mismo día en que ya corrió el ritual:
     la página se abre segundo y medio antes de la hora, el eclipse
     arranca enseguida, y la respuesta de eclipse.php llega mientras el
     minuto todavía está corriendo, diciendo que ahora es a las 14:00.
     Sin el candado de `faltaPara()`, esa pestaña vuelve a correr el
     homenaje entero a las 14:00 del MISMO día.

     Un homenaje que se repite deja de ser un homenaje. */
  { nombre: 'adopta una hora más tarde con el minuto corriendo: NO se repite',
    desde: HORA - 1500, hasta: OTRA + 90 * S,
    red: { ok: true, utc: '14:00' },
    arranques: 1, entre: [-25, 0],
    porque: 'la guarda vieja (`ahora >= cuando + DURA`) no cubre este caso ' +
            'porque la hora nueva todavía no pasó' },
];

/**
 * Pasa un vigía por todo el banco.
 *
 * @param {string} fuente
 * @returns {Array<{caso: Object, bien: boolean, segundos: Array<number>}>}
 */
async function pasarElBanco(fuente) {
  const salida = [];
  for (const caso of BANCO) {
    let pedidos;
    try { pedidos = await correr(fuente, caso); }
    catch (e) { salida.push({ caso, bien: false, segundos: [], reventó: e.message }); continue; }

    /* `respectoDe` es contra qué instante se mide: por defecto la hora
       horneada, y la otra cuando el caso prueba que se adoptó una nueva. */
    const cero = caso.respectoDe || HORA;

    const segundos = pedidos.map((p) => {
      let d = p - cero;
      while (d >= DIA - 60 * S) d -= DIA;     // normalizar al minuto del día
      return d / S;
    });

    const bien = segundos.length === caso.arranques &&
      (!caso.entre || segundos.every((s) => s >= caso.entre[0] && s < caso.entre[1]));

    salida.push({ caso, bien, segundos });
  }
  return salida;
}


/* ══════════════════════════════════════════════════════════════════════
   1. EL VIGÍA DE VERDAD TIENE QUE PASAR EL BANCO ENTERO
   ══════════════════════════════════════════════════════════════════════ */

console.log('\nEl vigía que está en index.html, contra el reloj\n');

for (const r of await pasarElBanco(VIGIA)) {
  const cuando = r.segundos.length
    ? ' (segundo ' + r.segundos.map((s) => s.toFixed(1)).join(' y ') + ')'
    : '';
  comprobar(r.caso.nombre + cuando, r.bien,
    (r.reventó ? 'reventó: ' + r.reventó + '. ' : '') +
    'esperados ' + r.caso.arranques + ' arranque(s)' +
    (r.caso.entre ? ' entre ' + r.caso.entre[0] + ' y ' + r.caso.entre[1] + ' s' : '') +
    ', hubo ' + r.segundos.length +
    (r.caso.porque ? '. ' + r.caso.porque : ''));
}


/* ══════════════════════════════════════════════════════════════════════
   2. LAS MORDIDAS
   ══════════════════════════════════════════════════════════════════════

   Cada mordida devuelve el vigía a como estaba ANTES del arreglo, y el
   banco tiene que romperse. Si una mordida pasa el banco, la comprobación
   que la cubre no vale nada.

   ⚡ NO SE TOCA NINGÚN ARCHIVO. La mordida se aplica a una copia en
   memoria del texto que se sacó de `index.html`. Es la forma más segura
   de hacer esto: en una sesión anterior, un runner de mordidas que
   escribía en disco corrompió `06-petalos-con-fisica.js` porque los
   respaldos apuntaban a una ruta que no existía. */

const MORDIDAS = [
  {
    nombre: 'marcar el flag ANTES de consultar las guardas',
    esElBug: 'ES LITERALMENTE EL DEFECTO DEL 14 DE SEPTIEMBRE',
    de: '      if (!sePuede()) return;         // alguna guarda dice que no: se reintenta\n' +
        '\n' +
        '      yaSePidio = true;\n' +
        '      pedirElArchivo(falta);',
    a:  '      yaSePidio = true;\n' +
        '      if (sePuede()) pedirElArchivo(falta);',
  },
  {
    nombre: 'quitar el reintento de cada segundo',
    de: 'if (!yaSePidio) { setTimeout(mirar, 1000); return; }',
    a:  'if (!yaSePidio) { return; }',
  },
  {
    nombre: 'dejar de escuchar volver al frente (visibilitychange)',
    de: "    document.addEventListener('visibilitychange', function () {\n" +
        '      if (!document.hidden) intentarAhora();\n' +
        '    });',
    a:  '    /* mordido */',
  },
  {
    nombre: 'dejar de escuchar bfcache (pageshow, que es lo de iOS)',
    de: "    window.addEventListener('pageshow', intentarAhora);",
    a:  '    /* mordido */',
  },
  {
    nombre: 'no rearmar los flags para mañana',
    de: '        setTimeout(function () {\n' +
        '          yaSePidio = false;\n' +
        '          yaSeRevisoLaVersion = false;\n' +
        '          yaSePreguntoLaHora = false;\n' +
        '          mirar();\n' +
        '        }, Math.max(1000, falta + DURA + 2000));\n' +
        '        return;',
    a:  '        return;',
  },
  {
    nombre: 'no leer la hora guardada al arrancar',
    de: "      if (recordada) adoptarLaHora(String(recordada).split('|')[0]);",
    a:  '      /* mordido */',
  },
  {
    nombre: 'creerle al servidor cualquier cosa como hora',
    de: "      if (typeof texto !== 'string' || !FORMA_DE_LA_HORA.test(texto)) return false;",
    a:  "      if (typeof texto !== 'string') return false;",
  },
  {
    nombre: 'quitar el candado de una-vez-por-día',
    de: '      if (ELDIAQUEYACORRIO && diaUtcDe(cuando) === ELDIAQUEYACORRIO) {\n' +
        '        cuando += 86400000;\n' +
        '      }',
    a:  '      /* mordido */',
  },
  /* ⚠️ ACÁ HUBO UNA MORDIDA QUE NO PROBABA NADA, Y ES LA RAZÓN DE QUE
     ESTE ARCHIVO EXISTA.

     Mordía la llamada `try { intentarAhora(); } catch (e) {}` que el
     arreglo del 14 de septiembre había dejado al cargar la página. El
     banco pasaba igual — porque `mirar()`, dos líneas más abajo, ya hacía
     exactamente lo mismo. Era una llamada duplicada.

     Una prueba de texto habría dicho «ok: la llamada está». Solo
     ejecutando se ve que sacarla no cambia nada. La línea se borró, y lo
     único que sí aportaba —el `try/catch`— se movió adentro de `mirar()`,
     que es donde una excepción hace daño de verdad. Las dos mordidas de
     abajo son las que cubren eso. */
  {
    nombre: 'no mirar el reloj al cargar la página',
    de: '\n    mirar();\n',
    a:  '\n    /* mordido */\n',
  },
  {
    nombre: 'no atrapar una excepción adentro de mirar()',
    de: "        try { intentarAhora(); } catch (e) { /* se reintenta abajo */ }",
    a:  '        intentarAhora();',
  },
];

console.log('\nLas mordidas: cada una tiene que romper el banco\n');

for (const m of MORDIDAS) {
  if (VIGIA.indexOf(m.de) < 0) {
    comprobar('la mordida «' + m.nombre + '» encuentra dónde morder', false,
      'el ancla ya no existe en index.html. La mordida no está probando ' +
      'nada: hay que volver a escribirla contra el código de hoy');
    continue;
  }

  const mordido = VIGIA.replace(m.de, m.a);
  const rotos = (await pasarElBanco(mordido)).filter((r) => !r.bien);

  comprobar('morder «' + m.nombre + '» rompe el banco' +
            (rotos.length ? ' (' + rotos.length + ' caso(s))' : ''),
    rotos.length > 0,
    (m.esElBug ? m.esElBug + '. ' : '') +
    'el banco pasó igual con el vigía mordido: ninguno de los escenarios ' +
    'cubre esto, así que este arreglo no está protegido por nada');
}


/* ══════════════════════════════════════════════════════════════════════
   3. Y LA MORDIDA DEL 14 DE SEPTIEMBRE, MIRADA DE CERCA
   ══════════════════════════════════════════════════════════════════════

   No alcanza con que rompa «algún» caso: tiene que romper exactamente el
   que costó el día — la pestaña que estaba de fondo cuando se preguntó, y
   que vuelve al frente con el minuto todavía corriendo. */

const laDelBug = MORDIDAS[0];

if (VIGIA.indexOf(laDelBug.de) >= 0) {
  const mordido = VIGIA.replace(laDelBug.de, laDelBug.a);
  const caso = BANCO.find((c) => c.nombre.indexOf('vuelven al frente a los +10') >= 0);
  const pedidos = await correr(mordido, caso);

  comprobar('con el vigía de ayer, volver al frente a los +10 s NO arranca',
    pedidos.length === 0,
    'si esto arranca, el banco no está reproduciendo el 14 de septiembre y ' +
    'la mordida de arriba está pasando por otra razón');

  const ahoraSi = await correr(VIGIA, caso);
  comprobar('y con el de hoy, sí',
    ahoraSi.length === 1,
    'el arreglo no sirve para el caso que lo motivó');
}


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
/* ⚠️ Los números se CUENTAN, no se escriben. Esta línea ya quedó
   desfasada dos veces al agregar escenarios, y una prueba que miente
   sobre cuánto prueba es peor que una que no dice nada. */
console.log('✓ El vigía pasa los ' + BANCO.length + ' escenarios, y se rompe en\n' +
            '  cuanto se le devuelve cualquiera de los ' + MORDIDAS.length +
            ' defectos.\n');
