/* ══════════════════════════════════════════════════════════════════════
   EMPAQUETAR · junta los CSS y los JS en un solo archivo cada uno
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   index.html pedía 14 hojas de estilo y ~26 scripts por separado — 40
   peticiones, todas al mismo servidor. En una conexión de celular, cada
   petición nueva paga su propia ida y vuelta antes de empezar a bajar el
   archivo. Este script junta todo el CSS en estilos/_empaquetado.css y
   todo el JS en codigo/_empaquetado.js, y hace que index.html pida esos
   dos en vez de los cuarenta.

   POR QUÉ NO SE TOCAN LOS ARCHIVOS ORIGINALES
   Los archivos fuente (estilos/00 a 13, codigo/00 a 25) siguen existiendo,
   intactos y comentados en español: son los que se editan siempre. Este
   script solo LEE su contenido y arma la copia empaquetada; nunca escribe
   en ellos.

   POR QUÉ NO ESTÁ MINIFICADO (a pesar de llamarse "empaquetado" y no
   "minificado")
   Achicar el CSS/JS quitando espacios y comentarios ahorraría algo más de
   peso, pero hacerlo bien requiere un analizador de verdad — un regex
   casero puede romper un string, una regex literal o un comentario que
   por casualidad contiene "//" o "/*". El ahorro real acá viene de bajar
   de 40 peticiones a 2, no de los bytes; arriesgar romper la web por un
   par de KB no vale la pena. El .htaccess ya comprime con gzip/brotli en
   el camino, así que el peso de red ya sale reducido igual.

   CÓMO SABE QUÉ ARCHIVOS JUNTAR, LA SEGUNDA VEZ EN ADELANTE
   La PRIMERA vez que corre, index.html todavía tiene la lista completa de
   <link>/<script> sueltos: de ahí se lee el orden y se guarda en
   herramientas/_manifiesto-empaquetado.json. index.html pasa a apuntar
   solo a los dos archivos empaquetados.

   Ese manifiesto es lo que permite volver a armar el paquete más adelante
   sin tener que deshacer index.html: las veces siguientes, este script ve
   que index.html YA apunta al paquete, y en vez de leer ahí la lista (que
   ya no está) la lee del manifiesto. index.html no se vuelve a tocar —
   solo se regeneran estilos/_empaquetado.css y codigo/_empaquetado.js.

   CUÁNDO CORRERLO
   Después de subir la versión (herramientas/subir-version.mjs) y antes de
   subir los archivos al hosting:

       node herramientas/subir-version.mjs
       node herramientas/empaquetar.mjs

   ⚠️ SI SE EDITA CUALQUIER ARCHIVO DE estilos/ O codigo/, HAY QUE VOLVER A
   CORRER ESTO antes de subir — si no, el cambio queda en el archivo
   fuente pero el paquete (y por lo tanto la web) sigue sirviendo lo viejo.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaIndex = join(raiz, 'index.html');
const rutaManifiesto = join(raiz, 'herramientas', '_manifiesto-empaquetado.json');

const html = readFileSync(rutaIndex, 'utf8');

const patronCss = /<link rel="stylesheet" href="estilos\/([\w.-]+\.css)(?:\?v=(\d+))?">/g;
const patronJs  = /<script defer src="codigo\/([\w.-]+\.js)(?:\?v=(\d+))?"><\/script>/g;

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

/* ─── 1. ¿De dónde sale la lista de archivos: de index.html o del manifiesto? ── */
let hojasDeEstilo = recolectar(patronCss, html);
let scripts = recolectar(patronJs, html);

const yaEstaEmpaquetado =
  (hojasDeEstilo.length === 1 && hojasDeEstilo[0].archivo === '_empaquetado.css') ||
  (scripts.length === 1 && scripts[0].archivo === '_empaquetado.js');

let hayQueReescribirIndex = true;

if (yaEstaEmpaquetado) {
  if (!existsSync(rutaManifiesto)) {
    console.error('✗ index.html ya apunta al paquete, pero no existe el manifiesto');
    console.error(`  (${rutaManifiesto}). Sin él no hay forma de saber qué archivos`);
    console.error('  originales hay que volver a juntar. Si el manifiesto se perdió,');
    console.error('  hay que reconstruir a mano la lista de <link>/<script> en');
    console.error('  index.html (ver algún respaldo o control de versiones) y correr');
    console.error('  este script de nuevo desde ahí.');
    process.exit(1);
  }
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  hojasDeEstilo = manifiesto.css.map(archivo => ({ archivo, version: null }));
  scripts = manifiesto.js.map(archivo => ({ archivo, version: null }));
  hayQueReescribirIndex = false;
  console.log(`(leyendo la lista del manifiesto: ${hojasDeEstilo.length} CSS + ${scripts.length} JS)`);
} else {
  if (hojasDeEstilo.length === 0 || scripts.length === 0) {
    console.error('✗ No se encontraron <link>/<script> con el patrón esperado en index.html.');
    console.error('  ¿Cambió el formato de esas etiquetas? Este script espera exactamente:');
    console.error('  <link rel="stylesheet" href="estilos/archivo.css?v=NN">');
    console.error('  <script defer src="codigo/archivo.js?v=NN"></script>');
    process.exit(1);
  }
  /* Se guarda el manifiesto ANTES de tocar index.html, para que si algo
     falla después no quede un index.html empaquetado sin su manifiesto. */
  writeFileSync(rutaManifiesto, JSON.stringify({
    css: hojasDeEstilo.map(x => x.archivo),
    js: scripts.map(x => x.archivo),
  }, null, 2));
}

/* ─── 2. Leer cada archivo fuente y armar el contenido combinado ──────── */
function armarPaquete(lista, carpeta, comentario) {
  const partes = [comentario];
  for (const { archivo } of lista) {
    const ruta = join(raiz, carpeta, archivo);
    if (!existsSync(ruta)) {
      console.error(`✗ No existe ${carpeta}/${archivo} (parte del manifiesto o de index.html).`);
      process.exit(1);
    }
    const contenido = readFileSync(ruta, 'utf8');
    partes.push(`\n/* ═══ ${archivo} ═══ */\n`, contenido);
  }
  return partes.join('');
}

const comentarioCss =
  '/* Generado por herramientas/empaquetar.mjs — no editar a mano.\n' +
  '   Para cambiar algo, editar el archivo original en estilos/ y volver\n' +
  '   a correr el script. Ver ese archivo para la explicación completa. */\n';
const comentarioJs =
  '/* Generado por herramientas/empaquetar.mjs — no editar a mano.\n' +
  '   Para cambiar algo, editar el archivo original en codigo/ y volver\n' +
  '   a correr el script. Ver ese archivo para la explicación completa. */\n';

const cssEmpaquetado = armarPaquete(hojasDeEstilo, 'estilos', comentarioCss);
const jsEmpaquetado  = armarPaquete(scripts, 'codigo', comentarioJs);

/* ─── 3. Versión ────────────────────────────────────────────────────────
   Si viene de index.html (primera vez), la más alta que tenían los
   archivos sueltos. Si viene del manifiesto (veces siguientes), la que ya
   tenía puesta el paquete — subir-version.mjs es quien la actualiza, y ya
   corrió antes que este script. */
let version;
if (hayQueReescribirIndex) {
  const versiones = [...hojasDeEstilo, ...scripts].map(x => x.version).filter(v => v !== null);
  version = versiones.length ? Math.max(...versiones) : 1;
} else {
  const actual = html.match(/_empaquetado\.(?:css|js)\?v=(\d+)/);
  version = actual ? Number(actual[1]) : 1;
}

writeFileSync(join(raiz, 'estilos', '_empaquetado.css'), cssEmpaquetado);
writeFileSync(join(raiz, 'codigo', '_empaquetado.js'), jsEmpaquetado);

/* ─── 4. Reescribir index.html — SOLO la primera vez ───────────────────
   Las veces siguientes index.html ya apunta al paquete (con la versión
   que le haya puesto subir-version.mjs) y no hace falta tocarlo. */
if (hayQueReescribirIndex) {
  function reemplazarPorUnaSola(html, lista, etiquetaNueva) {
    let resultado = html.replace(lista[0].textoCompleto, etiquetaNueva);
    for (let i = 1; i < lista.length; i++) {
      resultado = resultado.replace('\n' + lista[i].textoCompleto, '');
      resultado = resultado.replace(lista[i].textoCompleto, '');
    }
    return resultado;
  }

  let htmlNuevo = html;
  htmlNuevo = reemplazarPorUnaSola(
    htmlNuevo, hojasDeEstilo,
    `<link rel="stylesheet" href="estilos/_empaquetado.css?v=${version}">`
  );
  htmlNuevo = reemplazarPorUnaSola(
    htmlNuevo, scripts,
    `<script defer src="codigo/_empaquetado.js?v=${version}"></script>`
  );
  writeFileSync(rutaIndex, htmlNuevo);
}

console.log(`✓ Empaquetado con versión v=${version}`);
console.log(`  estilos/_empaquetado.css  ← ${hojasDeEstilo.length} archivos (${(cssEmpaquetado.length / 1024).toFixed(0)} KB)`);
console.log(`  codigo/_empaquetado.js    ← ${scripts.length} archivos (${(jsEmpaquetado.length / 1024).toFixed(0)} KB)`);
if (hayQueReescribirIndex) {
  console.log(`  index.html reescrito: ${hojasDeEstilo.length + scripts.length} etiquetas → 2`);
} else {
  console.log('  index.html: sin cambios (ya apuntaba al paquete)');
}
console.log('');
console.log('Revisá la web local antes de subir. Los archivos sueltos de estilos/ y');
console.log('codigo/ siguen ahí intactos — son los que hay que seguir editando.');
