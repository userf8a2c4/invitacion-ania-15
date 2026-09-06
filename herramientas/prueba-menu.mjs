/* Comprueba que el menú «Más» y sus destinos no se desincronicen.
 *
 * POR QUÉ EXISTE
 * El menú vive en dos archivos que nadie obliga a estar de acuerdo: la
 * lista de filas está en 01-configuracion.js (indiceDelMenu) y lo que
 * hace cada una en 05-navegacion.js (atenderMenu). Una fila sin su
 * `case` se pinta igual y al tocarla NO PASA NADA —sin error, sin
 * aviso, sin nada— que es la peor forma de fallar: parece que la app se
 * colgó.
 *
 * Al reordenar el menú (2026-09-06) se movieron 23 filas de grupo; una
 * sola mal copiada y esa opción quedaba muerta sin que nada lo dijera.
 * `node --check` no lo ve: las dos mitades son sintácticamente válidas.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const cfg = readFileSync(raiz('admin', 'codigo', '01-configuracion.js'), 'utf8');
const nav = readFileSync(raiz('admin', 'codigo', '05-navegacion.js'), 'utf8');

/* ─── Lo que el menú OFRECE ──────────────────────────────────────── */

const desde = cfg.indexOf('indiceDelMenu:');
const hasta = cfg.indexOf('/* ─── 7.', desde);
if (desde === -1 || hasta === -1) {
  console.error('\n✗ No se encontró indiceDelMenu en 01-configuracion.js.\n');
  process.exit(1);
}
const bloque = cfg.slice(desde, hasta);

const grupos = [...bloque.matchAll(/titulo: '([^']+)'/g)].map(m => m[1]);
const filas  = [...bloque.matchAll(/\[\s*'([a-z\-_]+)',/g)].map(m => m[1]);

/* ─── Lo que el menú SABE HACER ──────────────────────────────────── */

const inicio = nav.indexOf('function atenderMenu');
if (inicio === -1) {
  console.error('\n✗ No se encontró atenderMenu() en 05-navegacion.js.\n');
  process.exit(1);
}
const casos = new Set(
  [...nav.slice(inicio, inicio + 8000).matchAll(/case '([a-z\-_]+)':/g)].map(m => m[1])
);

/* ─── Las comprobaciones ─────────────────────────────────────────── */

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok   ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

console.log('\nEl menú «Más» y sus destinos\n');

console.log('  ' + grupos.length + ' grupos, ' + filas.length + ' filas\n');

// 1. Toda fila tiene qué hacer al tocarla.
const huerfanas = filas.filter(f => !casos.has(f));
comprobar('cada fila del menú tiene su case en atenderMenu',
  huerfanas.length === 0, huerfanas.join(', '));

// 2. Nada sobra: un case sin fila es código que ya no se puede alcanzar.
//    'salir' se excluye: es el botón de Cerrar sesión, que se pinta
//    aparte y no sale de indiceDelMenu.
const sinFila = [...casos].filter(c => !filas.includes(c) && c !== 'salir');
comprobar('no hay cases inalcanzables', sinFila.length === 0, sinFila.join(', '));

// 3. Ninguna fila repetida: dos puertas a lo mismo en el mismo menú
//    confunden y además una de las dos suele quedar desactualizada.
const repetidas = filas.filter((f, i) => filas.indexOf(f) !== i);
comprobar('ninguna fila aparece dos veces', repetidas.length === 0, repetidas.join(', '));

// 4. Ningún grupo vacío ni gigante. Doce filas en un grupo fue
//    exactamente el problema que el reordenamiento vino a arreglar:
//    una lista así hay que leerla entera para encontrar algo.
/* Se parte por el título de cada grupo y se cuentan las filas que hay
   hasta el siguiente. Se hizo así y no con una expresión que intente
   capturar el bloque entero: los grupos llevan comentarios en medio y
   la indentación varía, y una expresión que dependa de eso se queda
   ciega en silencio en cuanto alguien reacomoda el archivo — que es
   justo lo que pasó al escribir esta herramienta, y lo que destapó la
   comprobación de más abajo. */
const cortes = [...bloque.matchAll(/titulo: '([^']+)'/g)];
const porGrupo = cortes.map((corte, n) => {
  const desdeAqui = corte.index;
  const hastaAqui = n + 1 < cortes.length ? cortes[n + 1].index : bloque.length;
  const trozo = bloque.slice(desdeAqui, hastaAqui);
  return {
    titulo: corte[1],
    cuantas: [...trozo.matchAll(/\[\s*'[a-z\-_]+',/g)].length,
  };
});

const vacios = porGrupo.filter(g => g.cuantas === 0).map(g => g.titulo);
comprobar('ningún grupo quedó vacío', vacios.length === 0, vacios.join(', '));

const enormes = porGrupo.filter(g => g.cuantas > 6).map(g => g.titulo + ' (' + g.cuantas + ')');
comprobar('ningún grupo pasa de 6 filas', enormes.length === 0, enormes.join(', '));

// 5. Cada grupo encontrado por el parser de arriba tiene que cuadrar
//    con el total: si no, la expresión se quedó corta y las
//    comprobaciones 4 y 5 estarían mirando de menos.
const suma = porGrupo.reduce((n, g) => n + g.cuantas, 0);
comprobar('el desglose por grupo cuadra con el total',
  suma === filas.length, suma + ' contra ' + filas.length);

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El menú y sus destinos están de acuerdo.\n');
