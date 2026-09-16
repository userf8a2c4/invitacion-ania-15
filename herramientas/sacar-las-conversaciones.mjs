/* ══════════════════════════════════════════════════════════════════════
   SACAR-LAS-CONVERSACIONES.MJS · EL MATERIAL DEL DIARIO

   QUÉ HACE ESTE ARCHIVO
   Recorre las transcripciones de todas las sesiones de trabajo de la
   fiesta y se queda con UNA sola cosa: lo que escribió Carlos. Lo
   reparte por día calendario, un archivo por día, listo para escribir el
   diario de /DevDiary.

   POR QUÉ EXISTE
   El razonamiento del proyecto no está en el código. En el código está
   el resultado. El porqué —las quejas, las hipótesis, los cambios de
   opinión, las decisiones— está en las conversaciones, y la primera es
   del 20 de julio: tres días ANTES del primer commit.

   ⚠️ SON 696 MB Y NO SE PUEDEN LEER DE UNA
   Treinta y cinco archivos, casi setecientos megas. Pero medido sobre el
   más grande —159 MB— los mensajes de Carlos son 501 KB: el 0,31 %. Todo
   lo demás es salida de herramientas. Por eso esto lee EN STREAMING, una
   línea por vez, y nunca carga un archivo entero en memoria.

   ⛔ LA SALIDA NO VA AL REPOSITORIO
   Va a una carpeta de trabajo fuera del proyecto. Son conversaciones
   privadas: al repositorio va el diario escrito, no el material en
   crudo. Quien quiera rehacer el diario corre esto de nuevo.

   CÓMO SE USA
       node herramientas/sacar-las-conversaciones.mjs <carpeta-de-salida>

   Sin carpeta, avisa y no hace nada: escribir cientos de archivos en un
   sitio que uno no eligió es la clase de sorpresa que nadie quiere.
   ══════════════════════════════════════════════════════════════════════ */

import { createReadStream, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

const salida = process.argv[2];

if (!salida) {
  console.error('\n  Falta decir dónde guardar.\n');
  console.error('    node herramientas/sacar-las-conversaciones.mjs <carpeta>\n');
  process.exit(1);
}

/* Todas las carpetas de sesión que tienen que ver con la fiesta. El
   proyecto cambió de carpeta varias veces —y hubo worktrees— así que las
   transcripciones quedaron repartidas. */
const RAIZ_DE_SESIONES = join(homedir(), '.claude', 'projects');
const ES_DE_LA_FIESTA = /Ania|Bot-Carlos/i;

/**
 * ¿Este mensaje lo escribió Carlos, o es ruido de la herramienta?
 *
 * Las transcripciones marcan como `user` tres cosas distintas: lo que él
 * escribió, los resultados de cada herramienta, y los recordatorios que
 * el sistema inyecta. Solo la primera sirve.
 *
 * @param {string} texto
 * @returns {boolean}
 */
function loEscribioCarlos(texto) {
  const t = texto.trim();
  if (!t) return false;

  /* Resultados de herramienta, recordatorios del sistema y comandos:
     todos abren con una etiqueta. */
  if (/^<(tool_use_error|system-reminder|local-command|command-name|command-message|command-args|task-notification|ci-monitor-event)/.test(t)) return false;
  if (/^\[SYSTEM NOTIFICATION/.test(t)) return false;

  /* El texto que la sesión anterior dejó al continuar: es un resumen
     generado, no algo que él haya dicho. */
  if (/^This session is being continued from a previous conversation/.test(t)) return false;
  if (/^Caveat: The messages below were generated/.test(t)) return false;

  return true;
}

/**
 * Saca el texto de un mensaje, venga como cadena o como bloques.
 *
 * @param {*} contenido
 * @returns {string}
 */
function textoDe(contenido) {
  if (typeof contenido === 'string') return contenido;
  if (!Array.isArray(contenido)) return '';
  return contenido
    .filter(p => p && p.type === 'text' && typeof p.text === 'string')
    .map(p => p.text)
    .join('\n');
}

/* ─── Recorrer todo ───────────────────────────────────────────────── */

const porDia = new Map();          // 'AAAA-MM-DD' → [{hora, texto}]
let archivosLeidos = 0;
let bytesLeidos = 0;
let mensajes = 0;

const carpetas = existsSync(RAIZ_DE_SESIONES)
  ? readdirSync(RAIZ_DE_SESIONES).filter(d => ES_DE_LA_FIESTA.test(d))
  : [];

if (!carpetas.length) {
  console.error(`\n  No encontré ninguna sesión de la fiesta en ${RAIZ_DE_SESIONES}\n`);
  process.exit(1);
}

console.log(`\n  Leyendo ${carpetas.length} carpeta(s) de sesión…\n`);

for (const carpeta of carpetas) {
  const dir = join(RAIZ_DE_SESIONES, carpeta);
  const archivos = readdirSync(dir).filter(f => f.endsWith('.jsonl'));

  for (const archivo of archivos) {
    const ruta = join(dir, archivo);
    const tam = statSync(ruta).size;
    if (tam < 1000) continue;          // sesiones que no llegaron a nada

    archivosLeidos++;
    bytesLeidos += tam;
    process.stdout.write(`  ${basename(archivo).slice(0, 8)}… ${(tam / 1048576).toFixed(0)} MB`);

    let deEste = 0;
    const lector = createInterface({
      input: createReadStream(ruta),
      crlfDelay: Infinity,
    });

    for await (const linea of lector) {
      let d;
      try { d = JSON.parse(linea); } catch { continue; }
      if (!d || d.type !== 'user' || !d.message) continue;

      const texto = textoDe(d.message.content);
      if (!loEscribioCarlos(texto)) continue;

      const marca = String(d.timestamp || '');
      const dia = marca.slice(0, 10);
      if (!/^20\d\d-\d\d-\d\d$/.test(dia)) continue;

      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia).push({ hora: marca.slice(11, 16), texto: texto.trim() });
      deEste++;
      mensajes++;
    }

    console.log(`  → ${deEste} mensajes`);
  }
}

/* ─── Escribir un archivo por día ─────────────────────────────────── */

mkdirSync(salida, { recursive: true });

const dias = [...porDia.keys()].sort();

for (const dia of dias) {
  /* Las sesiones se solapan y la misma conversación puede estar en dos
     archivos —una sesión continuada deja rastro en los dos—, así que se
     ordena por hora y se sacan los repetidos exactos. */
  const vistos = new Set();
  const delDia = porDia.get(dia)
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .filter(m => {
      const llave = m.hora + '|' + m.texto;
      if (vistos.has(llave)) return false;
      vistos.add(llave);
      return true;
    });

  const cuerpo = delDia
    .map(m => `### ${m.hora}\n\n${m.texto}`)
    .join('\n\n---\n\n');

  writeFileSync(
    join(salida, `${dia}.md`),
    `# ${dia} · ${delDia.length} mensajes\n\n${cuerpo}\n`,
    'utf8'
  );
}

/* ─── El resumen ──────────────────────────────────────────────────── */

const pesoSalida = dias.reduce(
  (t, d) => t + statSync(join(salida, `${d}.md`)).size, 0);

console.log(`\n  ${archivosLeidos} archivos · ${(bytesLeidos / 1048576).toFixed(0)} MB leídos`);
console.log(`  ${mensajes} mensajes de Carlos en ${dias.length} días`);
console.log(`  ${(pesoSalida / 1048576).toFixed(1)} MB escritos en ${salida}`);
console.log(`\n  Del ${dias[0]} al ${dias[dias.length - 1]}\n`);
