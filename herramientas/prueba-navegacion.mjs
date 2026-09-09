/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-NAVEGACION.MJS · que ningún camino del panel lleve a la nada

   QUÉ CUIDA
   El panel tiene cinco tablas que dicen «tocá acá y pasa esto»:

     · CONFIGURACION.indiceDelMenu   → el menú «Más»      (lo cuida prueba-menu)
     · NOVEDADES                     → los globos de aviso
     · ACCESOS_RAPIDOS               → la rejilla de Hoy
     · CATALOGO_FAB                  → el botón redondo
     · VISTAS                        → las pestañas

   Todas fallan de la MISMA forma, que es la peor: en silencio. Una fila
   que apunta a una función que no existe se pinta igual de bien, y al
   tocarla no pasa nada. No hay error en consola, no hay aviso, no hay
   nada — parece que la app se colgó. `node --check` no lo ve: el archivo
   es sintácticamente perfecto.

   LOS TRES QUE YA HABÍAN PASADO, Y QUE ESTA PRUEBA HABRÍA GRITADO
     · El menú mostraba «correo» en minúscula: la fila estaba en la
       configuración y su nombre visible en otra tabla, en otro archivo.
       Tres días así.
     · Una novedad apuntaba a `pantalla: 'mesas'`, que no es una vista.
       No se mostró jamás, ni una vez, desde que se escribió.
     · Un `user-select` que no existía en ninguna hoja de estilo, así que
       un toque largo en cualquier botón seleccionaba su texto.

   CÓMO SE CORRE
       node herramientas/prueba-navegacion.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que +
              (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

const nav      = leer('admin', 'codigo', '05-navegacion.js');
const novedad  = leer('admin', 'codigo', '45-novedades.js');
const resumen  = leer('admin', 'codigo', '07-vista-resumen.js');
const fab      = leer('admin', 'codigo', '29-fab.js');
const componen = leer('admin', 'estilos', '02-componentes.css');
const vistasCss = leer('admin', 'estilos', '03-vistas.css');


/* ─── Todo lo que el panel sabe hacer ──────────────────────────────────
   El panel NO se empaqueta: se cargan 50 archivos con <script> y todos
   comparten el mismo alcance global. O sea que una función solo existe
   para el resto si está al NIVEL SUPERIOR de su archivo — una anidada no
   la ve nadie, y el fallo es el mismo silencio de siempre. Por eso las
   expresiones llevan `^`: se busca en la columna cero, sin sangría. */

const FUNCIONES = new Set();
for (const archivo of readdirSync(join(raiz, 'admin', 'codigo'))) {
  if (!archivo.endsWith('.js')) continue;
  const codigo = leer('admin', 'codigo', archivo);
  for (const m of codigo.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) {
    FUNCIONES.add(m[1]);
  }
  for (const m of codigo.matchAll(
    /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\b|\()/gm)) {
    FUNCIONES.add(m[1]);
  }
}

comprobar('se leyeron las funciones del panel', FUNCIONES.size > 300,
  'encontré ' + FUNCIONES.size);

/* Lo que no es del panel y aun así se puede llamar desde una fila. */
const DEL_NAVEGADOR = new Set([
  'setTimeout', 'clearTimeout', 'Number', 'String', 'Boolean', 'Array',
  'Object', 'JSON', 'Math', 'Date', 'parseInt', 'parseFloat', 'alert',
  'console', 'fetch', 'encodeURIComponent', 'decodeURIComponent',
]);

/** Los nombres que se invocan dentro de un trozo de código, una vez cada
 *  uno.
 *
 *  ⚠️ SE QUITAN LOS COMENTARIOS PRIMERO. Este proyecto comenta mucho y en
 *  español, y en español se escribe entre paréntesis: «(ver la nota de
 *  arriba)», «(protegida por exigirAdministrador)». Sin limpiarlos, el
 *  buscador de llamadas encontraba «protegida()», «PRIMERO()» y «vez()»
 *  y los daba por funciones inexistentes. Una prueba que grita por
 *  comentarios se termina ignorando, y ese día deja de proteger.
 *
 *  Y LOS TEXTOS TAMBIÉN, por lo mismo: cada herramienta lleva una
 *  descripción escrita para Lucila —«los recibos ya generados (con
 *  filtro…)»— y de ahí salían «generados()» y «s()» (de «pagás (»,
 *  porque la tilde corta el nombre). */
const loQueLlama = (trozo) => {
  const codigo = trozo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');

  return [...new Set(
    [...codigo.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map(m => m[1])
  )].filter(n => !DEL_NAVEGADOR.has(n));
};


/* ─── 1. LAS VISTAS ───────────────────────────────────────────────────*/

console.log('\nLas pestañas\n');

const bloqueVistas = (nav.match(/const VISTAS = \{([\s\S]*?)\n\};/) || ['', ''])[1];
const VISTAS = [...bloqueVistas.matchAll(/^\s{2}([a-z-]+):\s*\{/gm)].map(m => m[1]);

comprobar('la tabla de vistas se pudo leer', VISTAS.length >= 4,
  'encontré ' + VISTAS.length + ': ' + VISTAS.join(', '));

for (const nombre of loQueLlama(bloqueVistas)) {
  comprobar('«' + nombre + '()», que dibuja una vista, existe',
    FUNCIONES.has(nombre),
    'ninguna vista se va a dibujar: la pestaña se abre en blanco');
}

/* La barra de abajo no puede apuntar a una vista que no existe, ni
   dejar una vista sin ninguna pestaña encendida ("me perdí"). */
const bloquePadre = (nav.match(/const PADRE_DE_VISTA = \{([\s\S]*?)\n\};/) || ['', ''])[1];
for (const m of bloquePadre.matchAll(/([a-z-]+):\s*'([a-z-]+)'/g)) {
  comprobar('«' + m[1] + '» enciende una pestaña que existe (' + m[2] + ')',
    VISTAS.includes(m[1]) && VISTAS.includes(m[2]));
}


/* ─── 2. LAS NOVEDADES ────────────────────────────────────────────────*/

console.log('\nLos globos de novedad\n');

const novedades = [...novedad.matchAll(
  /id:\s*'([^']+)',\s*\n\s*pantalla:\s*'([^']+)'/g
)].map(m => ({ id: m[1], pantalla: m[2] }));

comprobar('el catálogo de novedades se pudo leer', novedades.length > 0,
  'encontré ' + novedades.length);

/* ⚠️ ESTE ES EL QUE FALTABA.
   mostrarNovedadesDePantalla() se llama en exactamente dos sitios, con
   'login' o con una clave de VISTAS. Una novedad apuntada a cualquier
   otra cosa —una SECCIÓN, por ejemplo 'mesas'— no se muestra nunca, y
   nada lo dice. */
for (const n of novedades) {
  comprobar('«' + n.id + '» apunta a una pantalla que existe',
    n.pantalla === 'login' || VISTAS.includes(n.pantalla),
    '«' + n.pantalla + '» no es una vista: esa novedad no se va a mostrar ' +
    'nunca. Las secciones (Mesas, Regalos, sub-pestañas de Dinero) no se ' +
    'pueden señalar — ver la nota en 45-novedades.js');
}

const idsRepetidos = novedades
  .map(n => n.id)
  .filter((id, i, todos) => todos.indexOf(id) !== i);
comprobar('ningún id de novedad se repite', idsRepetidos.length === 0,
  idsRepetidos.join(', ') + ' — un id repetido da la otra por vista');


/* ─── 3. LOS ACCESOS RÁPIDOS Y EL BOTÓN REDONDO ───────────────────────*/

console.log('\nLa rejilla de Hoy y el botón redondo\n');

const bloqueAccesos = (resumen.match(/const ACCESOS_RAPIDOS = \[([\s\S]*?)\n\];/) || ['', ''])[1];
const accesos = [...bloqueAccesos.matchAll(/clave:\s*'([^']+)'/g)].map(m => m[1]);

comprobar('la rejilla se pudo leer', accesos.length > 0,
  'encontré ' + accesos.length);

for (const nombre of loQueLlama(bloqueAccesos)) {
  comprobar('la rejilla llama a «' + nombre + '()», que existe',
    FUNCIONES.has(nombre),
    'ese acceso se pinta igual y al tocarlo NO PASA NADA');
}

const bloqueFab = (fab.match(/const CATALOGO_FAB = \[([\s\S]*?)\n\];/) || ['', ''])[1];
const herramientas = [...bloqueFab.matchAll(/clave:\s*'([^']+)'/g)].map(m => m[1]);

comprobar('el catálogo del botón redondo se pudo leer', herramientas.length > 5,
  'encontré ' + herramientas.length);

for (const nombre of loQueLlama(bloqueFab)) {
  comprobar('el botón redondo llama a «' + nombre + '()», que existe',
    FUNCIONES.has(nombre));
}

/* Lo que trae de fábrica tiene que existir en el catálogo: si no, el
   botón abre vacío en un teléfono recién estrenado. */
const deFabrica = (fab.match(/SANDWICH_DE_FABRICA = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean);

comprobar('lo que trae de fábrica está en el catálogo',
  deFabrica.every(c => herramientas.includes(c)),
  deFabrica.filter(c => !herramientas.includes(c)).join(', '));

comprobar('de fábrica no vienen más de tres',
  deFabrica.length > 0 && deFabrica.length <= 3, 'vienen ' + deFabrica.length);


/* ─── 4. NINGÚN BOTÓN ES TEXTO QUE SE SELECCIONA ──────────────────────*/

console.log('\nEl toque largo\n');

/* Sin esto, mantener el dedo sobre cualquier control selecciona su
   texto, con la lupa y el menú de "Copiar" encima. Se reportó sobre el
   botón redondo; no había un solo user-select en las tres hojas. */
const CONTROLES = ['.boton', '.boton-icono', '.boton-flotante', '.filtro',
  '.lista__fila', '.indice__fila', '.navegacion__boton',
  '.rejilla-accesos__boton'];

/* Se parten las reglas en «selectores { cuerpo }» y se pregunta, por
   cada control, si ALGUNA regla que lo nombre le pone las tres cosas.
 *
 * ⚠️ SE EXIGEN LAS TRES, Y POR SEPARADO. La primera versión de esta
 * comprobación buscaba /user-select:\s*none/ — que también casa con
 * `-webkit-user-select`. O sea que borrar la propiedad estándar y dejar
 * solo la de WebKit pasaba la prueba, con Chrome y Firefox seleccionando
 * texto igual que antes. Lo descubrí rompiéndola a propósito: una
 * comprobación que no falla cuando debe no está comprobando nada. */
/* Los comentarios se quitan ANTES de partir en reglas: si no, el
   comentario largo que hay encima de este bloque se pega al primer
   selector de la lista y «.boton» deja de parecerse a «.boton». */
const reglas = [...componen.replace(/\/\*[\s\S]*?\*\//g, ' ')
  .matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .map(m => ({ selectores: m[1], cuerpo: m[2] }));

/** ¿Alguna regla nombra a `clase` y declara `propiedad: none`? */
const declara = (clase, propiedad) => reglas.some(r => {
  const nombrada = r.selectores
    .split(',')
    .map(s => s.trim())
    .includes(clase);
  if (!nombrada) return false;
  return r.cuerpo
    .split(';')
    .map(d => d.trim())
    .some(d => d === propiedad + ': none');
});

for (const clase of CONTROLES) {
  const estandar = declara(clase, 'user-select');
  const webkit   = declara(clase, '-webkit-user-select');
  const callout  = declara(clase, '-webkit-touch-callout');

  comprobar('«' + clase + '» no se selecciona con el dedo',
    estandar && webkit && callout,
    'user-select: ' + estandar + ' · -webkit-user-select: ' + webkit +
    ' · -webkit-touch-callout: ' + callout +
    ' — sin la estándar, Chrome y Firefox siguen seleccionando; sin la de ' +
    'WebKit, el iPhone; sin el callout, iOS abre igual su menú del sistema');
}

/* ⚠️ Y LA EXCEPCIÓN, QUE ES DELIBERADA.
   El código de pase SÍ tiene que poder seleccionarse con el dedo: es el
   último respaldo para copiarlo cuando el portapapeles no está
   disponible. Si alguien "arregla" esto poniéndole none, se pierde en
   silencio. */
const codigo = vistasCss.slice(vistasCss.indexOf('.codigo-pase {'));
comprobar('el código de pase SÍ se puede seleccionar (a propósito)',
  /user-select:\s*all/.test(codigo.slice(0, 900)),
  'es el respaldo para copiarlo a dedo cuando el portapapeles falla');


/* ─── 5. LO QUE SE RETIRÓ, QUE NO VUELVA ──────────────────────────────*/

console.log('\nLo que se retiró\n');

comprobar('no quedó una segunda tabla de nombres del menú',
  !/function nombreDeOpcionDeMenu/.test(nav),
  'era la clave en un archivo y su nombre en otro: así se coló «correo»');

/* ⚠️ NINGÚN GESTO OCULTO EN EL BOTÓN REDONDO.
   Las herramientas vivían detrás de sostener el dedo 480 ms, sin que
   nada lo dijera. Un gesto que no se anuncia es una función que para
   quien usa la app no existe — y de paso dejaba el texto seleccionado
   al soltar. Si vuelve un temporizador de presión acá, que se vea. */
/* ⚠️ `\r?\n\}` y no `\n\}`: los archivos del proyecto son CRLF, así que
   el cierre de una función al nivel superior es «\r\n}» y una expresión
   que espere «\n}» seguido de «\n» no encuentra nada — y al no encontrar
   nada la comprobación pasa o falla por el motivo equivocado. Me pasó
   escribiendo esto mismo. */
const bloqueFabPreparar = (fab.match(
  /function prepararFab\(\)[\s\S]*?\r?\n\}/
) || [''])[0];

comprobar('el botón redondo no esconde nada detrás de un toque largo',
  !/pointerdown|MILISEGUNDOS_TOQUE_LARGO|setTimeout/.test(bloqueFabPreparar),
  'volvió un gesto que hay que descubrir para usar el botón');

/* Y que MegaBot no se haya perdido en la mudanza: era lo que abría el
   toque simple, así que al cambiarlo podría haber quedado sin ninguna
   puerta desde este botón. */
const bloqueSandwich = (fab.match(
  /function abrirSandwich\(\)[\s\S]*?\r?\n\}/
) || [''])[0];

comprobar('se pudo leer abrirSandwich()', bloqueSandwich.length > 200,
  'leí ' + bloqueSandwich.length + ' caracteres: la expresión se quedó corta ' +
  'y lo de abajo estaría comprobando el vacío');

comprobar('MegaBot sigue teniendo su puerta en el botón redondo',
  /abrirAsistente\(\)/.test(bloqueSandwich),
  'dejó de abrir el chat con el toque simple y no quedó en el sandwich');

let sobrantes = [];
for (const archivo of readdirSync(join(raiz, 'admin', 'codigo'))) {
  if (archivo.endsWith('.js') && leer('admin', 'codigo', archivo).includes('burbuja-resumen')) {
    sobrantes.push(archivo);
  }
}
if (leer('admin', 'index.html').includes('burbuja-resumen')) sobrantes.push('index.html');

comprobar('el contador de Dinero ya no se llama «burbuja-resumen»',
  sobrantes.length === 0, sobrantes.join(', ') + ' — resto de la barra vieja');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Todo camino del panel lleva a algún lado.\n');
