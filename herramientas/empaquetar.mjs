/* ══════════════════════════════════════════════════════════════════════
   EMPAQUETAR · junta las 14 hojas de estilo en un solo archivo
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   index.html pedía 14 hojas de estilo por separado. Cada petición nueva
   paga su propia ida y vuelta al servidor antes de empezar a bajar el
   archivo, y eso se nota sobre todo en celular. Este script las junta
   todas en estilos/_empaquetado.css y hace que index.html pida esa sola.

   ⛔ EL JAVASCRIPT NO SE EMPAQUETA, Y ES A PROPÓSITO
   Se probó juntar también los 26 archivos de codigo/ en uno solo, se midió,
   y fue claramente PEOR:

       escritorio  85 → 60      tiempo de bloqueo  190 ms → 910 ms
       móvil       75 → 67      tiempo de bloqueo   10 ms → 260 ms

   El motivo está en cómo se mide el "tiempo de bloqueo" (Total Blocking
   Time): no cuenta cuánto trabajo hay en total, cuenta las TAREAS LARGAS
   — solo suma lo que exceda de 50 ms seguidos sin soltar el hilo.

   Con los archivos sueltos, el navegador compila y ejecuta cada uno como
   una tarea independiente; ninguna llega a 50 ms, así que casi no suman.
   Juntos en un archivo de 429 KB pasan a ser UNA sola tarea de casi un
   segundo que el navegador no puede cortar por la mitad, y durante toda
   esa tarea la página no responde a nada.

   Con el CSS no pasa: el CSS no se compila ni se ejecuta, solo se parsea,
   así que juntarlo no genera ninguna tarea larga — solo ahorra peticiones.
   Por eso este script empaqueta CSS y nada más.

   POR QUÉ NO SE TOCAN LOS ARCHIVOS ORIGINALES
   Los 14 archivos de estilos/ siguen existiendo, intactos y comentados en
   español: son los que se editan siempre. Este script solo LEE su
   contenido y arma la copia empaquetada; nunca escribe en ellos.

   POR QUÉ NO ESTÁ MINIFICADO
   Achicar el CSS quitando espacios y comentarios ahorraría algo de peso,
   pero hacerlo bien requiere un analizador de verdad. El ahorro real acá
   viene de bajar de 14 peticiones a 1, no de los bytes; y el .htaccess ya
   comprime con gzip/brotli en el camino.

   CÓMO SABE QUÉ ARCHIVOS JUNTAR, LA SEGUNDA VEZ EN ADELANTE
   La PRIMERA vez, index.html todavía tiene la lista completa de <link>
   sueltos: de ahí se lee el orden y se guarda en
   herramientas/_manifiesto-empaquetado.json. Las veces siguientes, este
   script ve que index.html ya apunta al paquete y lee la lista del
   manifiesto, así puede regenerarlo sin tener que deshacer index.html.

   CUÁNDO CORRERLO
       node herramientas/subir-version.mjs
       node herramientas/empaquetar.mjs

   ⚠️ SI SE EDITA CUALQUIER ARCHIVO DE estilos/, HAY QUE VOLVER A CORRER
   ESTO antes de subir — si no, el cambio queda en el archivo fuente pero
   la web sigue sirviendo el paquete viejo.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaIndex = join(raiz, 'index.html');
const rutaManifiesto = join(raiz, 'herramientas', '_manifiesto-empaquetado.json');

const html = readFileSync(rutaIndex, 'utf8');

const patronCss = /<link rel="stylesheet" href="estilos\/([\w.-]+\.css)(?:\?v=(\d+))?">/g;

function recolectar(patron, texto) {
  const encontrados = [];
  for (const coincidencia of texto.matchAll(patron)) {
    encontrados.push({
      textoCompleto: coincidencia[0],
      archivo: coincidencia[1],
      version: coincidencia[2] ? Number(coincidencia[2]) : null,
    });
  }
  return encontrados;
}

/* ─── 1. ¿La lista sale de index.html o del manifiesto? ────────────────── */
let hojasDeEstilo = recolectar(patronCss, html);

const yaEstaEmpaquetado =
  hojasDeEstilo.length === 1 && hojasDeEstilo[0].archivo === '_empaquetado.css';

let hayQueReescribirIndex = true;

if (yaEstaEmpaquetado) {
  if (!existsSync(rutaManifiesto)) {
    console.error('✗ index.html ya apunta al paquete, pero no existe el manifiesto');
    console.error(`  (${rutaManifiesto}). Sin él no hay forma de saber qué archivos`);
    console.error('  originales hay que volver a juntar. Habría que reconstruir a mano');
    console.error('  la lista de <link> en index.html y correr este script desde ahí.');
    process.exit(1);
  }
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  hojasDeEstilo = manifiesto.css.map(archivo => ({ archivo, version: null }));
  hayQueReescribirIndex = false;
  console.log(`(leyendo la lista del manifiesto: ${hojasDeEstilo.length} CSS)`);
} else {
  if (hojasDeEstilo.length === 0) {
    console.error('✗ No se encontraron <link rel="stylesheet"> con el patrón esperado.');
    console.error('  Este script espera exactamente:');
    console.error('  <link rel="stylesheet" href="estilos/archivo.css?v=NN">');
    process.exit(1);
  }
  /* Se guarda el manifiesto ANTES de tocar index.html, para que si algo
     falla después no quede un index.html empaquetado sin su manifiesto. */
  const manifiestoPrevio = existsSync(rutaManifiesto)
    ? JSON.parse(readFileSync(rutaManifiesto, 'utf8'))
    : {};
  writeFileSync(rutaManifiesto, JSON.stringify({
    ...manifiestoPrevio,
    css: hojasDeEstilo.map(x => x.archivo),
  }, null, 2));
}

/* ─── 2. Leer cada archivo y armar el contenido combinado ─────────────── */
const partes = [
  '/* Generado por herramientas/empaquetar.mjs — no editar a mano.\n' +
  '   Para cambiar algo, editar el archivo original en estilos/ y volver\n' +
  '   a correr el script. Ver ese archivo para la explicación completa. */\n'
];

for (const { archivo } of hojasDeEstilo) {
  const ruta = join(raiz, 'estilos', archivo);
  if (!existsSync(ruta)) {
    console.error(`✗ No existe estilos/${archivo} (parte del manifiesto o de index.html).`);
    process.exit(1);
  }
  partes.push(`\n/* ═══ ${archivo} ═══ */\n`, readFileSync(ruta, 'utf8'));
}

const cssEmpaquetado = partes.join('');

/* ─── 3. Versión ───────────────────────────────────────────────────────── */
let version;
if (hayQueReescribirIndex) {
  const versiones = hojasDeEstilo.map(x => x.version).filter(v => v !== null);
  version = versiones.length ? Math.max(...versiones) : 1;
} else {
  const actual = html.match(/_empaquetado\.css\?v=(\d+)/);
  version = actual ? Number(actual[1]) : 1;
}

writeFileSync(join(raiz, 'estilos', '_empaquetado.css'), cssEmpaquetado);

/* ─── 4. Reescribir index.html — SOLO la primera vez ──────────────────── */
if (hayQueReescribirIndex) {
  let htmlNuevo = html.replace(
    hojasDeEstilo[0].textoCompleto,
    `<link rel="stylesheet" href="estilos/_empaquetado.css?v=${version}">`
  );
  for (let i = 1; i < hojasDeEstilo.length; i++) {
    htmlNuevo = htmlNuevo.replace('\n' + hojasDeEstilo[i].textoCompleto, '');
    htmlNuevo = htmlNuevo.replace(hojasDeEstilo[i].textoCompleto, '');
  }
  writeFileSync(rutaIndex, htmlNuevo);
}

console.log(`✓ CSS empaquetado con versión v=${version}`);
console.log(`  estilos/_empaquetado.css  ← ${hojasDeEstilo.length} archivos (${(cssEmpaquetado.length / 1024).toFixed(0)} KB)`);
console.log(hayQueReescribirIndex
  ? `  index.html reescrito: ${hojasDeEstilo.length} etiquetas → 1`
  : '  index.html: sin cambios (ya apuntaba al paquete)');
console.log('');
console.log('El JavaScript NO se empaqueta a propósito — ver la explicación al');
console.log('principio de este script. Los archivos de estilos/ siguen intactos.');
