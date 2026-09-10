/* Comprueba que el apodo se quede DENTRO de la app y que la invitación
 * imprima siempre el nombre formal.
 *
 * POR QUÉ EXISTE
 * Quien organiza piensa a la gente por su apodo: "Pam", "el compadre",
 * "Tía Chuy". Y escribía eso en el nombre de la invitación, porque era el
 * único campo que había — así que el apodo terminaba impreso en un
 * documento formal que el invitado enseña y guarda.
 *
 * Desde el 2026-09-09 son dos columnas y el reparto es asimétrico a
 * propósito:
 *   · `nombre` es el PÚBLICO. No cambió de sentido: es el que se imprime
 *     y el único que sale del servidor al navegador.
 *   · `apodo` es una etiqueta de trabajo. Vive en el panel y no sale.
 *
 * ⚠️ LA PRIMERA VERSIÓN DE ESTO ESTABA AL REVÉS, Y ESTA PRUEBA EXISTE
 * SOBRE TODO POR ESO. Se implementó con el campo nuevo como el público y
 * el viejo como interno, resuelto con un
 * `COALESCE(NULLIF(TRIM(apodo),''), nombre)` en invitacion.php. Funcionaba
 * — pero significaba que, con el campo nuevo vacío (o sea: en las 48
 * invitaciones), lo que se imprimía era el texto interno. El apodo era
 * público por omisión.
 *
 * La forma correcta no es un COALESCE mejor escrito: es que el dato NO SE
 * PIDA. Si invitacion.php no nombra la columna, no hay condición que
 * alguien pueda invertir, ni orden de argumentos que alguien pueda
 * confundir, ni columna vacía que cambie el resultado. Esta prueba
 * defiende esa propiedad, que es estructural y no depende de leer bien
 * una expresión SQL.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);
const leer = (...p) => readFileSync(raiz(...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n')
  .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
  .join('\n');

/* ─── 1. El apodo no sale del panel. Punto. ──────────────────────── */

console.log('\nLo que el invitado no puede ver\n');

/* Los tres archivos que contestan SIN sesión: cualquiera con el link
   llega a ellos. Ninguno tiene por qué nombrar la columna. */
const publicos = [
  ['invitacion.php', leer('invitacion.php')],
  ['confirmar.php',  leer('confirmar.php')],
  ['mi-pase.php',    leer('mi-pase.php')],
];

for (const [comoSeLlama, texto] of publicos) {
  comprobar(comoSeLlama + ' no nombra la columna del apodo',
    !/\bapodo\b/.test(sinComentarios(texto)),
    'si se pide, viaja: es una API pública, la lee cualquiera con el link');
}

/* Y del lado del navegador, que nadie la espere en la respuesta. */
const scriptsPublicos = ['02-utilidades.js', '04-invitado-personalizado.js',
                         '11-formulario-confirmacion.js', '12-pase-de-acceso.js'];
for (const archivo of scriptsPublicos) {
  comprobar('codigo/' + archivo + ' tampoco',
    !/\bapodo\b/.test(sinComentarios(leer('codigo', archivo))));
}

/* ⚠️ Y QUE NO VUELVA EL COALESCE. Si alguien "arregla" esto haciendo que
   el apodo tape al nombre cuando el nombre esté vacío, volvemos al
   problema con otra cara. */
comprobar('nadie resuelve el nombre con un COALESCE entre los dos',
  !/COALESCE\([^)]*apodo/i.test(sinComentarios(leer('invitacion.php'))),
  'la protección es que el dato no se pide, no que se elija bien');

/* ─── 2. El nombre público sigue siendo el de siempre ────────────── */

console.log('\nLo que sí se imprime\n');

const publica = sinComentarios(leer('invitacion.php'));
comprobar('invitacion.php manda i.nombre, sin vueltas',
  /SELECT i\.id, i\.nombre,/.test(publica));
comprobar('y el nombre de cada persona igual',
  /SELECT id, nombre, tipo, menu, alergias FROM acompanantes/.test(publica));

/* ─── 3. El apodo llega al panel, que es donde sirve ─────────────── */

console.log('\nReconocer a la gente en la app\n');

const apiConf  = leer('admin', 'api', 'confirmaciones.php');
const apiInvit = leer('admin', 'api', 'invitaciones.php');
const vista    = leer('admin', 'codigo', '08-vista-invitados.js');
const formInv  = leer('admin', 'codigo', '48-invitaciones.js');

comprobar('la lista de Gente recibe el apodo',
  /AS invitacion_apodo/.test(apiConf),
  'sin esto el apodo se guarda y no se ve en ninguna parte');
comprobar('el buscador lo encuentra',
  /fila\.invitacion_apodo/.test(sinComentarios(vista)) &&
  /pajar[\s\S]{0,200}apodo/.test(sinComentarios(vista)),
  'si no se busca, escribir «Pam» no encuentra a nadie y el campo es un adorno');
comprobar('se muestra al lado del nombre',
  /lista__titulo[\s\S]{0,300}invitacion_apodo/.test(sinComentarios(vista)));

comprobar('hay dónde escribirlo en la invitación',
  formInv.includes("id: 'inv-apodo'"));
comprobar('y en cada persona',
  vista.includes("id: 'acomp-apodo'"));

/* Los rótulos tienen que decir cuál es cuál: es la única defensa contra
   que alguien vuelva a escribir "Pam" en el campo que se imprime. */
comprobar('el rótulo del apodo dice que no sale',
  /Apodo \(solo para la app\)/.test(formInv) && /Apodo \(solo para la app\)/.test(vista));
comprobar('y el del nombre dice que se imprime',
  /Nombre para la invitación/.test(formInv),
  'sin eso, el campo se llama "Nombre del grupo" y no se sabe qué ve el invitado');

/* ─── 4. La columna llega por los dos caminos ────────────────────── */

console.log('\nBase nueva y base vieja\n');

const sql = sinComentarios(leer('admin', 'migracion.sql'));
const instalador = leer('admin', 'api', 'instalar.php');

for (const tabla of ['invitaciones', 'acompanantes']) {
  const desde = sql.indexOf('CREATE TABLE IF NOT EXISTS ' + tabla + ' (');
  const bloque = desde === -1 ? '' : sql.slice(desde, sql.indexOf(');', desde));
  comprobar('migracion.sql declara ' + tabla + '.apodo', bloque.includes('apodo'));
  comprobar('el instalador la agrega en ' + tabla,
    new RegExp("agregarColumna\\('" + tabla + "',\\s*'apodo'").test(instalador));
}

/* ─── 5. Guardar no borra apodos sin querer ──────────────────────── */

console.log('\nLo que no vino, no se toca\n');

const reconciliar = sinComentarios(apiInvit.slice(
  apiInvit.indexOf('function reconciliarPersonasDelGrupo'),
  apiInvit.indexOf('switch ($accion)')));

comprobar('solo se escribe el apodo si vino en el pedido',
  /array_key_exists\('apodo',\s*\$persona\)/.test(reconciliar),
  'casi ninguna pantalla lo manda: con un ?? "" se vaciarían todos');
comprobar('y todo escritor pregunta si la columna existe',
  /in_array\('apodo',\s*columnasDe\('invitaciones'\)/.test(apiInvit) &&
  /in_array\('apodo',\s*columnasDe\('acompanantes'\)/.test(apiInvit));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El apodo no sale de la app; la invitación imprime el nombre.\n');
