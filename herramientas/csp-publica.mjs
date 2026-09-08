/* ══════════════════════════════════════════════════════════════════════
   CSP-PUBLICA.MJS · la CSP del sitio de los invitados, calculada sola

   QUÉ HACE
   Lee las páginas públicas, saca el hash de cada <script> en línea y
   escribe la CSP entera en el .htaccess de la raíz, entre dos marcas.

   POR QUÉ NO SE ESCRIBE A MANO
   Porque se rompería sola, y en silencio. El cuarto <script> de
   index.html es la lista de archivos que se cargan en serie, y tiene 24
   referencias `?v=242`: cada vez que subir-version.mjs cambia el número,
   ese bloque cambia y su hash deja de valer. Con la CSP puesta a mano,
   la invitación se quedaría sin cargar nada — para TODOS los invitados,
   sin un solo error a la vista del que la subió.

   Por eso hay dos modos:

     node herramientas/csp-publica.mjs              reescribe el .htaccess
     node herramientas/csp-publica.mjs --verificar  falla si quedó viejo

   El segundo va en la tanda de pruebas: si alguien toca un script en
   línea y no regenera, se entera acá y no el día de la fiesta.

   ⚠️ EL HASH ES DE LOS BYTES EXACTOS
   El navegador hashea lo que hay entre `>` y `</script`, tal cual:
   espacios, sangría y saltos de línea incluidos. Estos archivos son
   CRLF, así que se leen sin normalizar nada. Cualquier "limpieza" de
   este texto invalida el hash.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Las páginas que ve un invitado. Si aparece otra, va acá. */
const PAGINAS = ['index.html', 'mi-pase.php', 'confirmar.php', 'invitacion.php'];

/* Con la sangría incluida: así el bloque se ve como el resto del
   archivo y las marcas se buscan tal cual, sin recortar espacios. */
const MARCA_INICIO = '  # ── CSP · generada por herramientas/csp-publica.mjs ──';
const MARCA_FIN    = '  # ── fin de la CSP generada ──';

/**
 * Los hashes de todos los <script> en línea de una página.
 *
 * Un <script> CON src no lleva hash: lo cubre `'self'`. El hash es solo
 * para el código que viaja dentro del HTML.
 *
 * @param {string} html
 * @returns {string[]}
 */
function hashesDe(html) {
  const hashes = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    hashes.push("'sha256-" + createHash('sha256').update(m[1], 'utf8').digest('base64') + "'");
  }
  return hashes;
}

/* ─── Lo que el sitio público necesita de verdad ─────────────────────
 *
 * Cada permiso de acá salió de leer el código, no de suponer:
 *
 *   · cdnjs en script-src → 12-pase-de-acceso.js baja qrcode.min.js en
 *     el momento de dibujar el QR del pase;
 *   · www.google.com en frame-src → 26-mapa-a-pedido.js crea el iframe
 *     del mapa al tocar «Ver el mapa», no antes;
 *   · data: en img-src → el QR del pase se pinta como data:image;
 *   · media-src → la música de la invitación;
 *   · worker-src → el service worker.
 *
 * NO hay `unsafe-eval`: no hay un solo eval() ni new Function() en el
 * sitio público. Y NO hace falta `unsafe-hashes`: no hay ni un onclick
 * en el HTML — todo se engancha con addEventListener.
 *
 * `style-src` sí lleva `unsafe-inline`, igual que el panel: el CSS va
 * incrustado por empaquetar.mjs y además hay atributos style= sueltos.
 * Hashear estilos que se regeneran en cada ronda daría una CSP que se
 * rompe sola sin proteger de nada nuevo — lo que se defiende acá es la
 * ejecución de código, y eso está cerrado. */
function armarCsp(hashes) {
  return [
    "default-src 'self'",
    "script-src 'self' https://cdnjs.cloudflare.com " + hashes.join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.google.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    /* ⚡ NO SE PUEDE PERDER (2026-09-07)
     *
     * El hosting ya venía mandando `Content-Security-Policy:
     * upgrade-insecure-requests` en el sitio público por su cuenta. Y
     * `Header always set` no agrega: REEMPLAZA — se ve en /admin/, donde
     * nuestra CSP aparece sola y esa directiva ya no está.
     *
     * O sea que el día que esto pase de mirar a bloquear, sin esta línea
     * le sacaríamos al sitio una protección que hoy tiene, de regalo y
     * sin que nadie lo note. Va incluida. */
    'upgrade-insecure-requests',
  ].join('; ');
}

/* ─── Armar el bloque ────────────────────────────────────────────────── */

let hashes = [];
const detalle = [];

for (const pagina of PAGINAS) {
  let html;
  try {
    html = readFileSync(join(raiz, pagina), 'utf8');
  } catch (error) {
    continue;                       // la página no existe: no es un fallo
  }
  const suyos = hashesDe(html);
  detalle.push('  ' + pagina.padEnd(16) + suyos.length + ' script(s) en línea');
  hashes = hashes.concat(suyos);
}

// Dos páginas pueden tener el mismo script; un hash repetido no aporta.
hashes = [...new Set(hashes)];

/* Report-Only o a secas. Se conserva lo que ya estuviera puesto, para
   que regenerar los hashes NUNCA cambie por su cuenta si la CSP está
   bloqueando o solo mirando: eso lo decide una persona. */
const htaccessRuta = join(raiz, '.htaccess');
const htaccess = readFileSync(htaccessRuta, 'utf8');

const yaEstaba = /Header always set (Content-Security-Policy(?:-Report-Only)?) "/
  .exec(htaccess);
const nombre = yaEstaba ? yaEstaba[1] : 'Content-Security-Policy-Report-Only';

const finDeLinea = htaccess.includes('\r\n') ? '\r\n' : '\n';

const bloque = [
  MARCA_INICIO,
  '  #',
  '  # NO SE EDITA A MANO. El hash de un <script> en línea es de sus bytes',
  '  # exactos, y el cuarto de index.html lleva 24 referencias `?v=`: cambia',
  '  # en cada subida de versión. Se regenera con:',
  '  #     node herramientas/csp-publica.mjs',
  '  # y la tanda de pruebas falla si quedó viejo.',
  '  #',
  '  # Para pasar de mirar a bloquear (o al revés) se cambia el NOMBRE de',
  '  # la cabecera de acá abajo: quitarle o ponerle «-Report-Only». El',
  '  # generador respeta el que encuentre y nunca lo cambia solo.',
  '  Header always set ' + nombre + ' "' + armarCsp(hashes) + '"',
  MARCA_FIN,
].join(finDeLinea);

/* ─── Escribir o comprobar ───────────────────────────────────────────── */

const soloVerificar = process.argv.includes('--verificar');

const desde = htaccess.indexOf(MARCA_INICIO);
const hasta = htaccess.indexOf(MARCA_FIN);

let nuevo;
if (desde !== -1 && hasta !== -1) {
  nuevo = htaccess.slice(0, desde) + bloque + htaccess.slice(hasta + MARCA_FIN.length);
} else {
  /* Primera vez: se pone justo después del HSTS, que es el final del
     bloque de cabeceras de seguridad. */
  const ancla = 'Header always set Strict-Transport-Security "max-age=31536000"';
  const donde = htaccess.indexOf(ancla);
  if (donde === -1) {
    console.error('✗ No encontré dónde poner la CSP en .htaccess.');
    process.exit(1);
  }
  const corte = donde + ancla.length;
  nuevo = htaccess.slice(0, corte) + finDeLinea + finDeLinea + bloque
        + htaccess.slice(corte);
}

if (soloVerificar) {
  if (nuevo === htaccess) {
    console.log('✓ La CSP del .htaccess está al día.');
    process.exit(0);
  }
  console.error('\n✗ La CSP del .htaccess quedó vieja.\n');
  console.error('  Un <script> en línea cambió (o cambió la versión) y los');
  console.error('  hashes ya no calzan. Tal como está, el navegador NO va a');
  console.error('  ejecutar esos scripts.\n');
  console.error('  Se arregla con:  node herramientas/csp-publica.mjs\n');
  process.exit(1);
}

writeFileSync(htaccessRuta, nuevo, 'utf8');

console.log('\nCSP del sitio público\n');
console.log(detalle.join('\n'));
console.log('\n  ' + hashes.length + ' hash(es) en total');
console.log('  cabecera: ' + nombre);
console.log('\n✓ .htaccess actualizado.\n');
