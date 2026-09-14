/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · migracion.sql ES SQL, Y NADA MÁS QUE SQL
   ══════════════════════════════════════════════════════════════════════

   ⛔ EL 14 DE SEPTIEMBRE DE 2026 QUEDÓ UNA FRASE EN CASTELLANO DENTRO DEL
      `CREATE TABLE acompanantes`, Y LAS 29 PRUEBAS DABAN VERDE.

   La frase era una instrucción de edición —«Y en el bloque de prosa de
   arriba…»— que se coló al aplicar cambios. Estaba entre dos columnas,
   dentro del paréntesis de la tabla.

   Por qué sobrevivió a TODO:

     · No empieza con `--`, así que el limpiador de comentarios de
       `api/instalar.php:67` (`preg_replace('/^\s*--.*$/m', '', $sql)`)
       no la borra.
     · No contiene `;`, así que el `explode(';')` de `:72` no la separa:
       viaja pegada al CREATE TABLE.
     · `revisar-php.mjs` no mira archivos .sql.
     · Y NINGUNA de las 29 pruebas abría este archivo.

   Qué habría pasado:

     · En una base nueva (o PBE recreado), `acompanantes` NO SE CREA. El
       instalador atrapa el error de sintaxis, lo anota en `$fallidas` y
       SIGUE — así que la instalación "termina bien" y solo un informe que
       nadie lee dice que falta la tabla central de nombres, mesas y
       etiquetas.
     · En la base de producción, que ya tiene la tabla, `IF NOT EXISTS`
       no salva: MySQL parsea ANTES de comprobar si existe. El instalador
       reportaría un fallo en cada corrida, para siempre.

   ⚠️ ESTA PRUEBA EMULA EL PARSEO DE instalar.php, no inventa uno propio.
   Si ese archivo cambia cómo corta, hay que cambiarlo acá también — por
   eso las dos líneas están citadas arriba.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que);
  if (!bien) { fallos++; if (detalle) console.log('        → ' + detalle); }
};

const sqlCrudo = leer('admin', 'migracion.sql');


/* ── El mismo parseo que hace api/instalar.php ─────────────────────── */

const sinComentarios = sqlCrudo.replace(/^\s*--.*$/gm, '');

const instrucciones = sinComentarios
  .split(';')
  .map((t) => t.trim())
  .filter((t) => t !== '');


/* ══════════════════════════════════════════════════════════════════════
   1. CADA INSTRUCCIÓN EMPIEZA COMO UNA INSTRUCCIÓN DE SQL
   ══════════════════════════════════════════════════════════════════════ */

console.log('\nmigracion.sql, leído como lo lee el instalador\n');

const VERBOS = /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SET|USE|START|COMMIT|REPLACE|TRUNCATE|GRANT|FLUSH)\b/i;

const raras = instrucciones
  .map((t, i) => ({ i: i + 1, t }))
  .filter((x) => !VERBOS.test(x.t));

comprobar('las ' + instrucciones.length + ' instrucciones empiezan con un verbo SQL',
  raras.length === 0,
  raras.map((x) => 'la nº' + x.i + ' empieza con «' +
    x.t.split('\n')[0].slice(0, 60) + '…»').join(' · '));


/* ══════════════════════════════════════════════════════════════════════
   2. NINGUNA LÍNEA DE PROSA DENTRO DE UNA INSTRUCCIÓN
   ══════════════════════════════════════════════════════════════════════

   Una línea de SQL de verdad, dentro de un CREATE TABLE, es un nombre de
   columna, una restricción, un KEY o el cierre. Lo que NO es: una frase
   con espacios, acentos y comillas angulares. Se buscan las señales de
   que alguien escribió castellano donde va SQL. */

const OLOR_A_PROSA = [
  /[«»]/,                         // comillas angulares
  /\b(agregar|cambiar|insertar|reemplazar|arriba|abajo|el bloque)\b/i,
  /línea \d+/i,
  /\b(que ya llevan|el mismo|de prosa)\b/i,
];

const conProsa = [];
instrucciones.forEach((instr, n) => {
  instr.split('\n').forEach((linea, l) => {
    const limpia = linea.trim();
    if (!limpia) return;
    if (OLOR_A_PROSA.some((r) => r.test(limpia))) {
      conProsa.push({ instr: n + 1, linea: l + 1, texto: limpia.slice(0, 80) });
    }
  });
});

comprobar('y ninguna lleva una frase en castellano adentro',
  conProsa.length === 0,
  conProsa.map((x) => 'instrucción ' + x.instr + ', línea ' + x.linea +
    ': «' + x.texto + '…»').join(' · ') +
  '. Una frase así no la borra el limpiador de comentarios (no empieza ' +
  'con --) ni la separa el explode(";"): viaja pegada a la instrucción y ' +
  'la rompe entera');


/* ══════════════════════════════════════════════════════════════════════
   3. LOS PARÉNTESIS DE CADA INSTRUCCIÓN CIERRAN
   ══════════════════════════════════════════════════════════════════════ */

const descompensadas = instrucciones
  .map((t, i) => {
    let n = 0;
    for (const c of t) { if (c === '(') n++; else if (c === ')') n--; }
    return { i: i + 1, n, cabeza: t.split('\n')[0].slice(0, 50) };
  })
  .filter((x) => x.n !== 0);

comprobar('y los paréntesis de cada una cierran',
  descompensadas.length === 0,
  descompensadas.map((x) => 'la nº' + x.i + ' («' + x.cabeza + '…») queda en ' +
    x.n).join(' · '));


/* ══════════════════════════════════════════════════════════════════════
   4. LA TABLA CENTRAL SIGUE AHÍ Y CON SU COLUMNA
   ══════════════════════════════════════════════════════════════════════

   `acompanantes` es la tabla de los nombres: de ella cuelgan las mesas,
   las etiquetas y lo que lee la familia en su invitación. Si se rompe,
   se rompe casi todo — y el instalador lo diría en un informe que nadie
   mira. */

const laTabla = instrucciones.find((t) =>
  /CREATE TABLE IF NOT EXISTS acompanantes\b/i.test(t));

comprobar('el CREATE TABLE de acompanantes existe y está entero',
  !!laTabla && /ENGINE=InnoDB/i.test(laTabla),
  'es la tabla de la que cuelgan las mesas, las etiquetas y los nombres ' +
  'que lee cada familia');

if (laTabla) {
  comprobar('y declara la columna `orden`',
    /\borden\s+INT\b/i.test(laTabla),
    'sin ella, una base nueva nace sin el orden de los nombres y el panel ' +
    'pide correr el instalador para siempre');

  comprobar('y ninguna de sus líneas es prosa',
    !OLOR_A_PROSA.some((r) => r.test(laTabla)),
    'es exactamente donde apareció la frase suelta el 14 de septiembre');
}


/* ══════════════════════════════════════════════════════════════════════
   5. LA MORDIDA
   ══════════════════════════════════════════════════════════════════════

   Volver a meter la frase tiene que hacer fallar esta prueba. No se toca
   ningún archivo: se muerde una copia en memoria. */

console.log('\nLa mordida\n');

const LA_FRASE = '\nY en el bloque de prosa de arriba, agregar el mismo aviso:\n';

/* ⚠️ LA MORDIDA SE APLICA SOBRE LA INSTRUCCIÓN, NO SOBRE EL ARCHIVO.
   El primer intento hacía un replace de `  orden INT NOT NULL DEFAULT 0,`
   sobre el texto entero —y hay CUATRO columnas `orden` en este archivo
   (líneas 237, 771, 801 y 977)—, así que mordía la primera tabla, que no
   es `acompanantes`. La prueba daba FALLA sin que nada estuviera mal. */
const tablaMordida = laTabla
  ? laTabla.replace(/(orden\s+INT NOT NULL DEFAULT 0,)/, '$1' + LA_FRASE)
  : '';

comprobar('meterle la frase de vuelta la hace fallar',
  !!tablaMordida &&
  tablaMordida !== laTabla &&
  OLOR_A_PROSA.some((r) => r.test(tablaMordida)),
  'si la mordida no se detecta, esta prueba no está cubriendo el defecto ' +
  'que la motivó');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Las ' + instrucciones.length + ' instrucciones de migracion.sql\n' +
            '  son SQL, y la tabla de los nombres está entera.\n');
