/* ══════════════════════════════════════════════════════════════════════
   MEDIR · BANCO DE PRUEBAS AUTOMÁTICO DE RENDIMIENTO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Abre la invitación en un Chrome SIN VENTANA, hace clic en el sobre,
   espera a que la escena termine de construirse, hace scroll de punta a
   punta y anota los números que importan: cuánto tardó en construirse,
   a cuántos cuadros por segundo va, cuál fue el peor cuadro y cuánto
   duró el bloqueo más largo del hilo principal.

   POR QUÉ EXISTE
   Hasta ahora cada medición pedía abrir la invitación a mano en el
   navegador, esperar, mirar el cartel de ?fps=1 y sacar una captura. En
   la máquina de referencia eso satura el equipo y toma minutos, así que
   probar una idea costaba una tarde y probar diez costaba una semana.
   Con esto, una corrida son segundos y no hay que tocar nada.

   CÓMO SE USA
     node herramientas/medir.mjs                  → la escena completa
     node herramientas/medir.mjs --bateria        → además, todos los ?sin=
     node herramientas/medir.mjs --sin=meneo      → una variante puntual
     node herramientas/medir.mjs --cpu=4          → frenar la CPU 4 veces
     node herramientas/medir.mjs --ver            → con ventana, para mirar

   ⚠️ LO QUE ESTE BANCO **NO** PUEDE DECIRTE
   Chrome sin ventana rasteriza por software, no con la placa. Los
   milisegundos absolutos NO son los de la máquina de referencia y no hay
   que anotarlos como si lo fueran. Lo que sí vale, y es para lo único que
   está hecho, es la COMPARACIÓN: correrlo antes de un cambio, correrlo
   después, y ver si el número se movió y para qué lado. La confirmación
   final se hace una sola vez en el equipo real con ?fps=1.
   ══════════════════════════════════════════════════════════════════════ */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

/* La ventana de la máquina de referencia. El costo de componer es POR
   PÍXEL, así que dos mediciones con ventanas distintas no se pueden
   comparar: esto queda fijo para que siempre se mida lo mismo. */
/* ⚠️ MÁS CHICA QUE LA VENTANA REAL, A PROPÓSITO. Sin placa de video, a
   2491×1277 un solo cuadro tarda ~215 ms y una corrida entera pasaba del
   minuto: medir diez ideas costaba una hora. A este tamaño el trabajo
   relativo entre variantes es el mismo —lo que se compara es cuánto
   trabajo se ahorra, no cuántos ms tarda— y una corrida son segundos. */
const ANCHO = 1400;
const ALTO  = 900;

/* ⚠️ EL SCROLL SE MIDE EN CUADROS, NO EN SEGUNDOS — Y ESTO NO ES UN
   DETALLE, ES LO QUE HACE QUE LAS CORRIDAS SE PUEDAN COMPARAR.

   La primera versión hacía scroll durante 6 segundos y calculaba la
   posición con el reloj. Parecía razonable y estaba mal: si un cuadro
   tarda el doble, el scroll salta el doble de píxeles, ensucia el doble
   de mosaicos y el cuadro siguiente sale todavía peor. La medición se
   retroalimentaba, y el resultado fue que apagar las plantas daba PEOR
   que la escena completa — un imposible físico que solo podía venir del
   instrumento.

   Ahora cada corrida recorre exactamente la misma cantidad de cuadros y
   la misma cantidad de píxeles por cuadro, vaya rápido o lento. Dos
   corridas hacen literalmente el mismo trabajo, y lo único que cambia es
   cuánto tardan en hacerlo. */
const CUADROS_DE_SCROLL = 60;
const PIXELES_POR_CUADRO = 40;

/* Cada variante se corre varias veces y se toma la mediana: una corrida
   suelta en una máquina compartida con el resto del sistema no dice nada.
   Se puede subir con --repetir=N cuando haga falta más confianza. */
const REPETICIONES = Number(
  (process.argv.find(a => a.startsWith('--repetir=')) || '--repetir=1').slice(10)
);

/* ─── Argumentos de la línea de comandos ──────────────────────────── */
const args      = process.argv.slice(2);
const conVentana = args.includes('--ver');
const conBateria = args.includes('--bateria');
const frenoDeCpu = Number((args.find(a => a.startsWith('--cpu=')) || '--cpu=1').slice(6));
const sinSuelto  = (args.find(a => a.startsWith('--sin=')) || '').slice(6);

/* ⚡ MEDIR EL ECLIPSE, NO LA INVITACIÓN (2026-09-16)
 *
 * Este banco medía la escena normal: abría el sobre y hacía scroll. El
 * eclipse —los 60 segundos del ritual— no lo tocaba nunca, así que
 * cuando Carlos reportó que en su iPhone «no es fluido y recalienta»
 * no había un número que mirar, solo el video.
 *
 * `--eclipse` conduce la secuencia entera con `window.ECLIPSE` y anota
 * el trabajo de cada cuadro tramo por tramo. Así se ve DÓNDE sufre, que
 * en una coreografía de un minuto no es lo mismo que cuánto sufre.
 *
 * ⚠️ Vale lo mismo que el resto del banco: Chrome sin ventana rasteriza
 * por software y los milisegundos absolutos NO son los del teléfono. Lo
 * que vale es la comparación antes/después, y el reparto entre tramos.
 */
const conEclipse = args.includes('--eclipse');

/* Las variantes de la batería. Cada una apaga un pedazo con ?sin= y
   sirve para saber qué se lleva el tiempo. Ver los interruptores en
   codigo/02-utilidades.js (apagadoParaMedir). */
const VARIANTES_DE_LA_BATERIA = [
  '',              // la escena completa, como la ve un invitado
  'meneo',         // todo dibujado pero congelado
  'ramilletes',    // sin los 4 ramilletes de esquina
  'enredaderas',   // el módulo 07 entero
  'joyas',
  'petalos',
];

/* ══════════════════════════════════════════════════════════════════════
   1 · UN SERVIDOR CHIQUITO PARA LOS ARCHIVOS
   El service worker y las rutas relativas necesitan un origen http://
   de verdad; abrir el index.html con doble clic no alcanza.
   ══════════════════════════════════════════════════════════════════════ */

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ico': 'image/x-icon',
};

function levantarElServidor() {
  const servidor = createServer(async (pedido, respuesta) => {
    try {
      /* Se corta la query (?v=170) y se normaliza para que nadie pueda
         pedir algo de afuera de la carpeta del proyecto. */
      let ruta = decodeURIComponent(pedido.url.split('?')[0]);

      /* ⚡ `/pbe/` SE SIRVE COMO LA RAÍZ, Y ES LO QUE DESTRABA MEDIR EL
         ECLIPSE (2026-09-16)
         `window.ECLIPSE` —la consola que deja correr la secuencia cuando
         uno quiere y no a las 12:30 UTC— solo existe si el hostname es de
         pruebas o si la ruta empieza con `/pbe/` (28-eclipse.js:5770).
         Pidiendo `/pbe/index.html` el banco entra por esa puerta sin
         tocar una línea del sitio ni relajar el candado: en el hosting
         real la ruta sigue sin existir. */
      if (ruta.indexOf('/pbe/') === 0) ruta = ruta.slice(4);

      if (ruta.endsWith('/')) ruta += 'index.html';
      const destino = join(RAIZ, normalize(ruta).replace(/^(\.\.[/\\])+/, ''));

      if (!destino.startsWith(RAIZ) || !existsSync(destino)) {
        respuesta.writeHead(404).end('no está');
        return;
      }
      const contenido = await readFile(destino);
      respuesta.writeHead(200, {
        'Content-Type': TIPOS[extname(destino).toLowerCase()] || 'application/octet-stream',
        /* Sin caché del lado del servidor: cada corrida arranca pareja y
           el caché que se quiera medir se controla desde el navegador. */
        'Cache-Control': 'no-store',
      }).end(contenido);
    } catch {
      respuesta.writeHead(500).end('error');
    }
  });
  return new Promise(listo => servidor.listen(0, '127.0.0.1', () => listo(servidor)));
}

/* ══════════════════════════════════════════════════════════════════════
   2 · CHROME Y EL CANAL CDP
   ══════════════════════════════════════════════════════════════════════ */

function buscarChrome() {
  const candidatos = [
    join(process.env['ProgramFiles'] || '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env['ProgramFiles'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  ];
  const encontrado = candidatos.find(p => p && existsSync(p));
  if (!encontrado) throw new Error('No encontré Chrome ni Edge instalados.');
  return encontrado;
}

async function abrirChrome(perfil) {
  const puerto = 9222 + Math.floor(process.pid % 500);
  const opciones = [
    `--remote-debugging-port=${puerto}`,
    `--user-data-dir=${perfil}`,
    `--window-size=${ANCHO},${ALTO}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking',
    /* Sin esto Chrome baja la prioridad de las pestañas que no están al
       frente y los rAF se espacian: mediría de menos. */
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
  ];
  if (!conVentana) opciones.push('--headless=new');

  const proceso = spawn(buscarChrome(), opciones, { stdio: 'ignore' });

  /* Chrome tarda un momento en abrir el puerto. Se lo consulta hasta que
     conteste, en vez de dormir un rato fijo y cruzar los dedos. */
  for (let intento = 0; intento < 60; intento++) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/json/version`);
      if (r.ok) return { proceso, ws: (await r.json()).webSocketDebuggerUrl, puerto };
    } catch { /* todavía no está listo */ }
    await new Promise(r => setTimeout(r, 250));
  }
  proceso.kill();
  throw new Error('Chrome no abrió el puerto de depuración.');
}

/** Envoltorio mínimo del protocolo: manda comandos y espera respuestas. */
function conectar(url) {
  const socket = new WebSocket(url);
  let siguienteId = 1;
  const pendientes = new Map();
  const oyentes = new Map();

  socket.addEventListener('message', evento => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id && pendientes.has(mensaje.id)) {
      const { listo, falla } = pendientes.get(mensaje.id);
      pendientes.delete(mensaje.id);
      mensaje.error ? falla(new Error(mensaje.error.message)) : listo(mensaje.result);
    } else if (mensaje.method && oyentes.has(mensaje.method)) {
      for (const fn of oyentes.get(mensaje.method)) fn(mensaje.params);
    }
  });

  const listaParaUsar = new Promise(listo => socket.addEventListener('open', listo));

  return {
    async enviar(metodo, parametros = {}, sesion) {
      await listaParaUsar;
      const id = siguienteId++;
      const sobre = { id, method: metodo, params: parametros };
      if (sesion) sobre.sessionId = sesion;
      socket.send(JSON.stringify(sobre));
      return new Promise((listo, falla) => pendientes.set(id, { listo, falla }));
    },
    al(metodo, fn) {
      if (!oyentes.has(metodo)) oyentes.set(metodo, []);
      oyentes.get(metodo).push(fn);
    },
    cerrar: () => socket.close(),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   3 · EL OBSERVADOR QUE VIAJA DENTRO DE LA PÁGINA

   Se inyecta ANTES de que corra nada del sitio, así no se pierde ni el
   primer cuadro. Mide igual que codigo/21-monitor-de-rendimiento.js —
   mismos criterios, para que los números sean comparables con los del
   cartel de ?fps=1— pero sin dibujar nada en pantalla.
   ══════════════════════════════════════════════════════════════════════ */

const OBSERVADOR = `
(() => {
  const M = window.__medicion = {
    cuadros: [], tareas: [], marcas: {},
    contando: false, abierto: false,
  };

  M.marcas.arranque = performance.now();

  /* Cada cuadro, su duración. Solo se guardan mientras 'contando' está
     encendido, para poder separar la construcción del scroll. */
  let anterior = performance.now();
  (function medirCuadro(ahora) {
    const delta = ahora - anterior;
    anterior = ahora;
    /* Un salto enorme es la pestaña congelada, no lentitud real: mismo
       criterio que 21-monitor-de-rendimiento.js. */
    if (M.contando && delta < 500) M.cuadros.push(delta);
    requestAnimationFrame(medirCuadro);
  })(performance.now());

  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver(lista => {
        for (const e of lista.getEntries()) {
          M.tareas.push({ ms: e.duration, cuando: e.startTime, contando: M.contando });
        }
      }).observe({ entryTypes: ['longtask'] });
    } catch {}
  }

  /* Los dos hitos del arranque, tomados del propio sitio. */
  document.addEventListener('sobre-abierto',      () => M.marcas.sobreAbierto = performance.now());
  document.addEventListener('invitacion-visible', () => M.marcas.invitacionVisible = performance.now());
})();
`;

/* ══════════════════════════════════════════════════════════════════════
   4 · UNA CORRIDA
   ══════════════════════════════════════════════════════════════════════ */

/** Ejecuta una expresión en la página y devuelve su valor. */
async function evaluar(cdp, sesion, expresion) {
  const r = await cdp.enviar('Runtime.evaluate', {
    expression: expresion,
    awaitPromise: true,
    returnByValue: true,
  }, sesion);
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || 'falló en la página');
  }
  return r.result.value;
}

/** Espera hasta que la expresión dé verdadero, o se rinde. */
async function esperarA(cdp, sesion, expresion, limiteMs, queEspera) {
  const hasta = Date.now() + limiteMs;
  while (Date.now() < hasta) {
    if (await evaluar(cdp, sesion, `!!(${expresion})`)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Se acabó la espera: ${queEspera}`);
}

/**
 * Una corrida del ECLIPSE: los 60 segundos completos, tramo por tramo.
 *
 * ⚠️ NO SE ACELERA CON `velocidad`. La consola de ensayo deja correr la
 * secuencia más rápido, y sería tentador para que la medición tarde 15 s
 * en vez de 60. Pero acelerar mete MÁS coreografía en cada cuadro: se
 * mediría un eclipse que nadie va a ver. Se corre en tiempo real.
 *
 * @param {Object} cdp
 * @param {string} base
 * @returns {Promise<Object>}
 */
/* Los actos, tal como los declara 28-eclipse.js (sección 1). Se reparten
   las muestras acá porque el promedio del minuto entero no dice nada: lo
   que importa es EN QUÉ ACTO se cae. */
const ACTOS_DEL_ECLIPSE = [
  ['Penumbra',      0,     8000],
  ['Despiertan',    8000,  22000],
  ['La secta',      22000, 35000],
  ['El esfuerzo',   35000, 38500],
  ['Muere la rosa', 38500, 42000],
  ['Shock',         42000, 44000],
  ['Frenesí',       44000, 52000],
  ['⚠ vuelve todo', 52000, 54000],
  ['Sumisión',      54000, 60000],
];

/** La mediana de una lista de números. */
function medianaDe(lista) {
  if (!lista.length) return 0;
  const o = lista.slice().sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/**
 * La tabla del eclipse: un renglón por acto.
 *
 * @param {Object} r - Lo que devolvió unaCorridaDelEclipse().
 * @returns {void}
 */
function informeDelEclipse(r) {
  const col = (t, n) => String(t).padStart(n);

  console.log('  ' + 'acto'.padEnd(16) + col('sitúa', 9) + col('cuadros', 9) +
              col('fps', 6) + col('trabajo', 9) + col('peor', 8));
  console.log('  ' + '─'.repeat(57));

  for (const [nombre, desde, hasta] of ACTOS_DEL_ECLIPSE) {
    const dentro = r.muestras.filter(m => m.t >= desde && m.t < hasta);
    if (!dentro.length) {
      console.log('  ' + nombre.padEnd(16) + col(`${desde / 1000}-${hasta / 1000}s`, 9) +
                  col('—', 9) + col('—', 6) + col('—', 9) + col('—', 8));
      continue;
    }
    const intervalos = dentro.map(m => m.intervalo);
    const mediana = medianaDe(intervalos);
    console.log('  ' + nombre.padEnd(16) +
      col(`${desde / 1000}-${hasta / 1000}s`, 9) +
      col(dentro.length, 9) +
      col(mediana ? (1000 / mediana).toFixed(1) : '—', 6) +
      col(medianaDe(dentro.map(m => m.trabajo)).toFixed(1) + ' ms', 9) +
      col(Math.round(Math.max(...intervalos)) + ' ms', 8));
  }

  const todos = r.muestras.map(m => m.intervalo);
  const mediana = medianaDe(todos);
  console.log('  ' + '─'.repeat(57));
  console.log('  ' + 'TODO EL MINUTO'.padEnd(16) + col('0-60s', 9) +
    col(r.muestras.length, 9) +
    col(mediana ? (1000 / mediana).toFixed(1) : '—', 6) +
    col(medianaDe(r.muestras.map(m => m.trabajo)).toFixed(1) + ' ms', 9) +
    col(Math.round(r.peorCuadro) + ' ms', 8));

  /* ⚠️ LA ESCALA SE LEE DE LAS MUESTRAS, NO DEL FINAL.
     `terminar()` devuelve `ESCALA_DEL_LIENZO` a su techo antes de que
     esto pueda preguntarle nada (ver la nota de «LA TRAMA SOBREVIVÍA A
     LA CORRIDA» en 28-eclipse.js). Preguntando al final, el informe
     contaba siempre el valor de arranque y nunca lo que el gobernador
     llegó a ceder — que es justo lo que se quiere saber. */
  const f = r.alFinal || {};
  const escalas = r.muestras.map(m => m.escala).filter(Boolean);
  const arranco = escalas.length ? escalas[0] : 0;
  const bajoHasta = escalas.length ? Math.min(...escalas) : 0;

  console.log(`\n  Lienzo: arrancó en ${arranco} y bajó hasta ${bajoHasta}` +
              (bajoHasta < arranco ? '  (el gobernador cedió)' : '  (el gobernador nunca actuó)') +
              `\n  Tandas al final ${f.tandas}` +
              ` · presupuesto de cine ${Number(f.msDeCine || 0).toFixed(1)} ms` +
              ` · pétalos ${f.petalos}\n`);

  /* ⚠️ Un cuadro que tarda más que el presupuesto de cine (41,7 ms) es
     un cuadro que la cadencia no pudo sostener: ahí es donde se ve el
     tirón, por más que el promedio del minuto parezca decente. */
  const perdidos = r.muestras.filter(m => m.trabajo > Number(f.msDeCine || 41.7)).length;
  const porciento = r.muestras.length
    ? Math.round(perdidos * 100 / r.muestras.length) : 0;
  console.log(`  Cuadros cuyo TRABAJO se pasó del presupuesto de cine: ` +
              `${perdidos} de ${r.muestras.length} (${porciento} %)\n`);
}

async function unaCorridaDelEclipse(cdp, base) {
  const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.enviar('Target.attachToTarget', { targetId, flatten: true });

  await cdp.enviar('Page.enable', {}, sessionId);
  await cdp.enviar('Runtime.enable', {}, sessionId);
  await cdp.enviar('Performance.enable', {}, sessionId);
  await cdp.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
  if (frenoDeCpu > 1) {
    await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: frenoDeCpu }, sessionId);
  }
  await cdp.enviar('Network.enable', {}, sessionId);
  await cdp.enviar('Network.clearBrowserCache', {}, sessionId);
  await cdp.enviar('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVADOR }, sessionId);

  /* `/pbe/` es lo que hace existir a window.ECLIPSE — ver la nota del
     servidor. `?eclipse=ensayo` es el segundo candado. */
  await cdp.enviar('Page.navigate',
    { url: `${base}/pbe/index.html?eclipse=ensayo` }, sessionId);

  await esperarA(cdp, sessionId,
    `document.querySelector('#ilustracion-del-sobre') &&
     !document.querySelector('#sobre-de-apertura').classList.contains('esta-cargando')`,
    30000, 'que apareciera el sobre');

  await evaluar(cdp, sessionId, `
    document.querySelector('#ilustracion-del-sobre')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  `);

  await esperarA(cdp, sessionId, `window.__medicion.marcas.invitacionVisible`,
    30000, 'que la invitación se hiciera visible');

  /* La escena tiene que estar montada antes de empezar: si no, se
     mediría la construcción del marco mezclada con el ritual. */
  await evaluar(cdp, sessionId, `
    (async () => {
      let anterior = -1, quieto = 0;
      while (quieto < 10) {
        const cuantas = document.querySelectorAll('.flor-de-enredadera').length;
        if (cuantas === anterior && cuantas > 0) quieto++; else quieto = 0;
        anterior = cuantas;
        await new Promise(r => setTimeout(r, 100));
      }
    })()
  `);

  /* El archivo del eclipse lo baja el vigía diez segundos antes de la
     hora; acá no hay hora que esperar, así que se comprueba que la
     consola exista antes de pedirle nada. */
  await esperarA(cdp, sessionId,
    `typeof window.ECLIPSE === 'object' && window.ECLIPSE && typeof window.ECLIPSE.correr === 'function'`,
    30000, 'que apareciera window.ECLIPSE (¿se cargó 28-eclipse.js?)');

  /* ── Correr los 60 s, anotando el trabajo POR TRAMO ──
     Cada muestra lleva el segundo de la secuencia en el que se tomó, y
     de ahí sale la curva: en un minuto con nueve actos, saber que el
     promedio es X no dice nada; lo que dice algo es en qué acto se cae. */
  const crudo = await evaluar(cdp, sessionId, `
    (async () => {
      const M = window.__medicion;
      const muestras = [];
      let peorCuadro = 0;

      window.ECLIPSE.correr(0, 1);

      const arranque = performance.now();
      let anterior = arranque;

      while (window.ECLIPSE.enCurso()) {
        await new Promise(r => requestAnimationFrame(r));
        const ahora = performance.now();
        const delta = ahora - anterior;
        anterior = ahora;

        /* Un salto enorme es la pestaña congelada, no lentitud real:
           mismo criterio que 21-monitor-de-rendimiento.js. */
        if (delta < 500) {
          const r = window.ECLIPSE.recuento ? window.ECLIPSE.recuento() : {};
          muestras.push({
            t: Math.round(window.ECLIPSE.dondeVa() || (ahora - arranque)),
            intervalo: delta,
            trabajo: Number(r.msPorCuadro) || 0,
            escala: Number(r.escalaDelLienzo) || 0,
            tandas: Number(r.tandas) || 0,
          });
          if (delta > peorCuadro) peorCuadro = delta;
        }

        if (ahora - arranque > 70000) break;   // red de seguridad
      }

      const fin = window.ECLIPSE.recuento ? window.ECLIPSE.recuento() : {};
      return JSON.stringify({
        muestras: muestras,
        peorCuadro: peorCuadro,
        duroMs: performance.now() - arranque,
        alFinal: fin,
      });
    })()
  `);

  await cdp.enviar('Target.closeTarget', { targetId });
  return JSON.parse(crudo);
}

async function unaCorrida(cdp, base, sin) {
  /* Una pestaña nueva por corrida: sin restos de la anterior. */
  const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.enviar('Target.attachToTarget', { targetId, flatten: true });

  await cdp.enviar('Page.enable', {}, sessionId);
  await cdp.enviar('Runtime.enable', {}, sessionId);
  /* Los contadores internos del navegador. Valen más que los fps: dicen
     CUÁNTO trabajo se hizo, separado por tipo (estilo, layout, dibujo),
     y no se saturan cuando la máquina va al límite. */
  await cdp.enviar('Performance.enable', {}, sessionId);
  await cdp.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
  if (frenoDeCpu > 1) {
    await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: frenoDeCpu }, sessionId);
  }
  /* Caché limpio: se mide la primera visita de un invitado. */
  await cdp.enviar('Network.enable', {}, sessionId);
  await cdp.enviar('Network.clearBrowserCache', {}, sessionId);
  await cdp.enviar('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVADOR }, sessionId);

  const direccion = `${base}/index.html${sin ? `?sin=${sin}` : ''}`;
  const arranque = Date.now();
  await cdp.enviar('Page.navigate', { url: direccion }, sessionId);

  /* ── a) Esperar a que el sobre esté para tocar ── */
  await esperarA(cdp, sessionId,
    `document.querySelector('#ilustracion-del-sobre') &&
     !document.querySelector('#sobre-de-apertura').classList.contains('esta-cargando')`,
    30000, 'que apareciera el sobre');
  const listoElSobre = Date.now() - arranque;

  /* ── b) Abrir el sobre ──
     Con dispatchEvent y no con .click(): el sobre es un <svg>, y los
     elementos SVG no heredan click() de HTMLElement. */
  await evaluar(cdp, sessionId, `
    document.querySelector('#ilustracion-del-sobre')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  `);

  /* ── c) Esperar a que la escena deje de construirse ──
     No hay ningún evento que diga "terminé", así que se mira lo que se
     puede contar: cuando la cantidad de flores deja de crecer durante
     un segundo entero, la construcción terminó. */
  await esperarA(cdp, sessionId, `window.__medicion.marcas.invitacionVisible`,
    30000, 'que la invitación se hiciera visible');

  await evaluar(cdp, sessionId, `
    (async () => {
      let anterior = -1, quieto = 0;
      while (quieto < 10) {
        const cuantas = document.querySelectorAll('.flor-de-enredadera').length;
        if (cuantas === anterior && cuantas > 0) quieto++; else quieto = 0;
        anterior = cuantas;
        await new Promise(r => setTimeout(r, 100));
      }
      window.__medicion.marcas.escenaLista = performance.now();
    })()
  `);
  const escenaLista = Date.now() - arranque;

  /* ── d) Ahora sí, medir: scroll continuo de punta a punta ──
     Paso fijo por cuadro (ver la nota de CUADROS_DE_SCROLL arriba): cada
     corrida recorre el mismo camino y hace el mismo trabajo, así que los
     tiempos se pueden comparar entre sí. */
  const antesDeMedir = await cdp.enviar('Performance.getMetrics', {}, sessionId);

  await evaluar(cdp, sessionId, `
    (async () => {
      const M = window.__medicion;
      M.cuadros.length = 0;          // se descartan los cuadros de la construcción
      M.contando = true;
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      let y = 0, direccion = 1;
      for (let i = 0; i < ${CUADROS_DE_SCROLL}; i++) {
        y += ${PIXELES_POR_CUADRO} * direccion;
        if (y >= alto) { y = alto; direccion = -1; }
        if (y <= 0)    { y = 0;    direccion = 1; }
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(r));
      }
      M.contando = false;
    })()
  `);

  const despuesDeMedir = await cdp.enviar('Performance.getMetrics', {}, sessionId);

  const crudo = await evaluar(cdp, sessionId, `JSON.stringify(window.__medicion)`);
  const m = JSON.parse(crudo);
  const nodos = await evaluar(cdp, sessionId, `document.getElementsByTagName('*').length`);
  const flores = await evaluar(cdp, sessionId, `document.querySelectorAll('.flor-de-enredadera').length`);
  const calidad = await evaluar(cdp, sessionId, `
    document.documentElement.classList.contains('calidad-baja') ? 'baja'
    : document.documentElement.classList.contains('calidad-media') ? 'media' : 'alta'
  `);

  await cdp.enviar('Target.closeTarget', { targetId });

  /* ── e) Las cuentas ──
     La MEDIANA y no el promedio: un solo tropezón desplaza el promedio y
     hace parecer peor (o mejor) de lo que es. Y el percentil 95, que es
     el tirón que la gente sí siente. */
  const cuadros = m.cuadros.slice().sort((a, b) => a - b);
  const enPosicion = p => cuadros.length ? cuadros[Math.min(cuadros.length - 1, Math.floor(cuadros.length * p))] : 0;
  const mediana = enPosicion(0.5);
  const p95     = enPosicion(0.95);
  const tareasDelScroll = m.tareas.filter(t => t.contando);

  /* Cuánto trabajo hizo el navegador durante el scroll, por tipo. Estos
     son segundos acumulados: la resta entre antes y después es el costo
     real del recorrido, y no depende de a qué velocidad se pudo dibujar. */
  const contador = (lista, nombre) =>
    (lista.metrics.find(x => x.name === nombre) || { value: 0 }).value;
  const gasto = nombre =>
    (contador(despuesDeMedir, nombre) - contador(antesDeMedir, nombre)) * 1000;

  return {
    variante: sin || '(escena completa)',
    calidad,
    sobreListoMs: listoElSobre,
    escenaListaMs: escenaLista,
    fps: mediana ? Math.round(1000 / mediana) : 0,
    msPorCuadro: mediana,
    peorCuadroMs: p95,
    /* El total del hilo principal durante el recorrido: la cifra más
       estable de todas, y la que hay que hacer bajar. */
    trabajoMs: gasto('TaskDuration'),
    estiloMs:  gasto('RecalcStyleDuration'),
    layoutMs:  gasto('LayoutDuration'),
    scriptMs:  gasto('ScriptDuration'),
    tareasAlCargar: m.tareas.filter(t => !t.contando).length,
    peorTareaAlCargarMs: Math.max(0, ...m.tareas.filter(t => !t.contando).map(t => t.ms)),
    tareasDespues: tareasDelScroll.length,
    peorTareaDespuesMs: Math.max(0, ...tareasDelScroll.map(t => t.ms)),
    nodos, flores,
  };
}

/** La mediana de un conjunto de corridas de la misma variante. */
function medianaDeCorridas(corridas) {
  const mitad = (campo) => {
    const v = corridas.map(c => c[campo]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  return {
    ...corridas[0],
    msPorCuadro:   mitad('msPorCuadro'),
    fps:           Math.round(1000 / mitad('msPorCuadro')),
    peorCuadroMs:  mitad('peorCuadroMs'),
    trabajoMs:     mitad('trabajoMs'),
    estiloMs:      mitad('estiloMs'),
    layoutMs:      mitad('layoutMs'),
    scriptMs:      mitad('scriptMs'),
    escenaListaMs: mitad('escenaListaMs'),
    peorTareaDespuesMs: mitad('peorTareaDespuesMs'),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   5 · PONER TODO EN MARCHA
   ══════════════════════════════════════════════════════════════════════ */

const servidor = await levantarElServidor();
const base = `http://127.0.0.1:${servidor.address().port}`;
const perfil = await mkdtemp(join(tmpdir(), 'medir-ania-'));
const { proceso, ws } = await abrirChrome(perfil);
const cdp = conectar(ws);

/* ─── El modo eclipse sale por su propia puerta ───────────────────── */
if (conEclipse) {
  /* ⛔ index.html SIRVE codigo/produccion/, NO EL FUENTE (2026-09-16)
   *
   * La primera medición después de tocar 28-eclipse.js dio exactamente
   * los mismos números que antes, y la escala del lienzo seguía en 1
   * cuando el fuente ya decía 0,72. No es que el arreglo no sirviera: es
   * que el banco estaba midiendo la copia minificada vieja.
   *
   * Un banco que mide otra cosa que la que uno acaba de cambiar es peor
   * que no tener banco: da números con cara de verdad. Así que se avisa
   * fuerte y se dice el comando exacto. */
  const fuente = statSync(join(RAIZ, 'codigo', '28-eclipse.js')).mtimeMs;
  const servido = existsSync(join(RAIZ, 'codigo', 'produccion', '28-eclipse.js'))
    ? statSync(join(RAIZ, 'codigo', 'produccion', '28-eclipse.js')).mtimeMs
    : 0;

  if (fuente > servido) {
    console.log('\n  ⛔ codigo/produccion/28-eclipse.js está más viejo que el fuente.');
    console.log('     index.html sirve la copia minificada, así que esta medición');
    console.log('     NO mediría lo que acabás de cambiar.\n');
    console.log('     node herramientas/minificar-js.mjs\n');
    process.exit(1);
  }

  console.log(`\n  Midiendo EL ECLIPSE en ${ANCHO}×${ALTO}` +
              (frenoDeCpu > 1 ? `, CPU frenada ${frenoDeCpu}×` : '') +
              ' · 60 s en tiempo real\n');
  try {
    process.stdout.write('  corriendo la secuencia … ');
    const r = await unaCorridaDelEclipse(cdp, base);
    console.log(`${(r.duroMs / 1000).toFixed(1)} s, ${r.muestras.length} cuadros\n`);
    informeDelEclipse(r);
  } catch (error) {
    console.log(`\n  ✗ ${error.message}\n`);
  } finally {
    cdp.cerrar();
    proceso.kill();
    servidor.close();
    await rm(perfil, { recursive: true, force: true }).catch(() => {});
  }
  process.exit(0);
}

const variantes = sinSuelto ? [sinSuelto] : conBateria ? VARIANTES_DE_LA_BATERIA : [''];
const resultados = [];

console.log(`\n  Midiendo en ${ANCHO}×${ALTO}` +
            (frenoDeCpu > 1 ? `, CPU frenada ${frenoDeCpu}×` : '') +
            `, ${CUADROS_DE_SCROLL} cuadros de scroll × ${REPETICIONES} corridas\n`);

try {
  for (const sin of variantes) {
    process.stdout.write(`  ${(sin || '(escena completa)').padEnd(20)} … `);
    const corridas = [];
    for (let i = 0; i < REPETICIONES; i++) {
      try {
        corridas.push(await unaCorrida(cdp, base, sin));
        process.stdout.write('·');
      } catch (error) {
        process.stdout.write('x');
      }
    }
    if (!corridas.length) { console.log(' falló'); continue; }
    const r = medianaDeCorridas(corridas);
    resultados.push(r);
    console.log(` ${Math.round(r.trabajoMs)} ms de trabajo · ${r.fps} fps · escena en ${(r.escenaListaMs / 1000).toFixed(2)} s`);
  }
} finally {
  cdp.cerrar();
  proceso.kill();
  servidor.close();
  await rm(perfil, { recursive: true, force: true }).catch(() => {});
}

/* ─── La tabla ─────────────────────────────────────────────────────── */
if (resultados.length) {
  console.log('\n');
  const col = (t, n) => String(t).padStart(n);
  console.log('  ' + 'variante'.padEnd(20) + col('trabajo', 9) + col('estilo', 8) +
              col('layout', 8) + col('script', 8) + col('fps', 5) +
              col('escena', 9) + col('flores', 8) + col('calidad', 9));
  console.log('  ' + '─'.repeat(84));
  for (const r of resultados) {
    console.log('  ' + r.variante.padEnd(20) +
      col(Math.round(r.trabajoMs), 9) +
      col(Math.round(r.estiloMs), 8) +
      col(Math.round(r.layoutMs), 8) +
      col(Math.round(r.scriptMs), 8) +
      col(r.fps, 5) +
      col((r.escenaListaMs / 1000).toFixed(2) + 's', 9) +
      col(r.flores, 8) +
      col(r.calidad, 9));
  }

  const completa = resultados.find(r => r.variante === '(escena completa)');
  if (completa && resultados.length > 1) {
    console.log('\n  Cuánto se ahorra apagando cada pieza (menos trabajo = mejor):');
    for (const r of resultados) {
      if (r === completa) continue;
      const ahorro = completa.trabajoMs - r.trabajoMs;
      const porcentaje = (ahorro / completa.trabajoMs * 100).toFixed(0);
      console.log(`  ${r.variante.padEnd(20)} ${ahorro >= 0 ? '−' : '+'}${Math.abs(Math.round(ahorro))} ms  (${porcentaje} %)`);
    }
  }
  console.log('\n  ⚠️  Sin ventana se rasteriza por software: los ms absolutos NO son');
  console.log('     los de la máquina de referencia. Sirve para comparar antes/después.\n');
}
