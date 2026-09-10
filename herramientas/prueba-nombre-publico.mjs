/* Comprueba el nombre interno y el nombre de gala: que el apodo se quede
 * en el panel y que la invitación imprima el formal.
 *
 * POR QUÉ EXISTE
 * En el panel se escribe el nombre con el que uno piensa a la gente
 * ("Pam", "el compadre", "Tía Chuy") y ese mismo texto salía impreso en
 * la invitación, que es un documento formal y que el invitado enseña.
 * Desde el 2026-09-09 son dos columnas: `nombre` (interno) y
 * `nombre_publico` (el que ve el invitado). Vacío el segundo, manda el
 * primero.
 *
 * QUÉ PUEDE SALIR MAL, Y NINGUNA SE VE
 *
 *   · QUE LA COLUMNA LLEGUE A MEDIAS. Una instalación nueva la recibe de
 *     migracion.sql; una que ya existe, del instalador
 *     (admin/api/instalar.php). Si está en uno y no en el otro, funciona
 *     en una base y no en la otra — y esa base es producción.
 *
 *   · QUE EL APODO VIAJE AL NAVEGADOR. No es solo qué se muestra: el
 *     nombre interno puede ser algo que uno no le diría al invitado en
 *     la cara. Si sale en el JSON, está a un "ver código fuente" de
 *     distancia.
 *
 *   · QUE UN GUARDADO CUALQUIERA BORRE LOS NOMBRES FORMALES. La lista de
 *     personas viaja en casi todas las pantallas del panel, y casi
 *     ninguna manda `nombre_publico`. Si el servidor lo tomara como ""
 *     cuando no viene, guardar cualquier cosa vaciaría el nombre formal
 *     de todo el grupo. Hay que distinguir "no me lo mandaste" de "me lo
 *     mandaste vacío".
 *
 *   · QUE EL PANEL SE ROMPA ANTES DE CORRER EL INSTALADOR. Entre que
 *     suben estos archivos y que alguien abre el panel pasa un rato. Si
 *     los INSERT/UPDATE nombran la columna sin preguntar, en ese rato no
 *     se puede guardar nada.
 *
 *   · QUE VACIARLO NO LO VACÍE. Si el panel no manda el campo cuando
 *     está en blanco, no hay forma de deshacer un nombre formal puesto
 *     por error.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const leer = (...p) => readFileSync(raiz(...p), 'utf8');

const migracion   = leer('admin', 'migracion.sql');
const instalador  = leer('admin', 'api', 'instalar.php');
const apiInvit    = leer('admin', 'api', 'invitaciones.php');
const apiAcomp    = leer('admin', 'api', 'acompanantes.php');
const publica     = leer('invitacion.php');
const formInvit   = leer('admin', 'codigo', '48-invitaciones.js');
const formPersona = leer('admin', 'codigo', '08-vista-invitados.js');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* Se lee el CÓDIGO, no la prosa: los comentarios de estos archivos
   nombran justo lo que se prohíbe. Mismo agujero que apareció en
   prueba-etiquetas-de-edad y en prueba-latido-del-menu. */
const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--')).join('\n');

/* ─── 1. La columna llega por los dos caminos ────────────────────── */

console.log('\nBase nueva y base vieja reciben lo mismo\n');

const sql = sinComentarios(migracion);
for (const tabla of ['invitaciones', 'acompanantes']) {
  const desde = sql.indexOf('CREATE TABLE IF NOT EXISTS ' + tabla + ' (');
  const bloque = desde === -1 ? '' : sql.slice(desde, sql.indexOf(');', desde));
  comprobar('migracion.sql declara ' + tabla + '.nombre_publico',
    bloque.includes('nombre_publico'), desde === -1 ? 'no encontré la tabla' : '');

  comprobar('el instalador la agrega en ' + tabla,
    new RegExp("agregarColumna\\('" + tabla + "',\\s*'nombre_publico'").test(instalador));
}

/* ─── 2. El apodo no sale del panel ──────────────────────────────── */

console.log('\nQué nombre viaja al invitado\n');

const php = sinComentarios(publica);

comprobar('invitacion.php elige el nombre en el SQL',
  php.includes('NOMBRE_A_MOSTRAR'));
comprobar('con COALESCE y NULLIF, para que vacío caiga al interno',
  /COALESCE\(NULLIF\(/.test(php));
comprobar('y con TRIM: un nombre de puros espacios no es un nombre',
  /NULLIF\(TRIM\(/.test(php),
  'sin TRIM, un espacio suelto tapa el nombre interno con nada');
comprobar('lo que viaja se sigue llamando "nombre" a secas',
  php.includes('AS nombre'),
  'si cambia el nombre de la clave, el sobre y el pase dejan de saludar');
comprobar('el interno NO viaja con nombre propio en el JSON',
  !/'nombre_interno'\s*=>/.test(php) && !/'nombre_publico'\s*=>/.test(php),
  'el apodo quedaría a un "ver código fuente" de distancia');

/* La red por si el instalador todavía no corrió: sin esto, una columna
   que falta tumba el SELECT entero y son 48 invitaciones contestando
   "No se pudo cargar tu invitación". */
comprobar('hay respaldo si la columna todavía no existe',
  php.includes("$buscarLaInvitacion('i.nombre')"),
  'sin esto, subir este archivo antes de abrir el panel apaga las invitaciones');
comprobar('y también para la lista de personas',
  php.includes("$leerLasPersonas('a.nombre')"));

/* ─── 3. Nadie escribe la columna sin preguntar ──────────────────── */

console.log('\nGuardar antes de correr el instalador\n');

for (const [comoSeLlama, texto, tabla] of [
  ['invitaciones.php', apiInvit, 'invitaciones'],
  ['acompanantes.php', apiAcomp, 'acompanantes'],
]) {
  comprobar(comoSeLlama + ' pregunta si la columna existe',
    new RegExp("in_array\\('nombre_publico',\\s*columnasDe\\('" + tabla + "'\\)").test(texto));
}
comprobar('invitaciones.php también pregunta por la de personas',
  /in_array\('nombre_publico',\s*columnasDe\('acompanantes'\)/.test(apiInvit));

/* ─── 4. Un guardado cualquiera no borra los nombres formales ────── */

console.log('\nLo que no vino, no se toca\n');

const reconciliar = sinComentarios(apiInvit.slice(
  apiInvit.indexOf('function reconciliarPersonasDelGrupo'),
  apiInvit.indexOf('switch ($accion)')));

comprobar('solo se escribe si vino en el pedido',
  /array_key_exists\('nombre_publico',\s*\$persona\)/.test(reconciliar),
  'con un ?? "" cualquier guardado vaciaría todos los nombres formales');
comprobar('y no hay un respaldo a cadena vacía escondido',
  !/\$persona\['nombre_publico'\]\s*\?\?\s*''/.test(reconciliar));

comprobar('acompanantes.php usa el mismo criterio',
  /array_key_exists\(\$campo,\s*\$datos\)/.test(sinComentarios(apiAcomp)));

/* ─── 5. Vaciarlo tiene que poder vaciarlo ───────────────────────── */

console.log('\nDeshacer un nombre formal puesto por error\n');

comprobar('la ficha de la invitación manda el campo',
  /nombre_publico:\s*valorDe\('inv-nombre-publico'/.test(sinComentarios(formInvit)),
  'sin mandarlo, no hay forma de borrar lo que se escribió mal');
comprobar('y la ficha de cada persona también',
  /nombre_publico:\s*valorDe\('acomp-nombre-publico'/.test(sinComentarios(formPersona)));

/* Que el campo exista en las dos pantallas, si no no hay dónde escribirlo. */
comprobar('la invitación tiene su campo en pantalla',
  formInvit.includes("id: 'inv-nombre-publico'"));
comprobar('cada persona tiene el suyo',
  formPersona.includes("id: 'acomp-nombre-publico'"));

/* Y que la API lo devuelva, si no el campo se abre vacío y guardar borra
   lo que había. */
comprobar('la API devuelve el nombre formal de cada persona',
  apiInvit.includes("', nombre_publico'"),
  'el SELECT de personas es explícito: sin nombrarla, no vuelve');
comprobar('el formulario lo precarga',
  formInvit.includes('d.nombre_publico') && formPersona.includes('d.nombre_publico'),
  'si se abre vacío, guardar sin tocar nada borraría el nombre formal');

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El apodo se queda en el panel; la invitación imprime el formal.\n');
