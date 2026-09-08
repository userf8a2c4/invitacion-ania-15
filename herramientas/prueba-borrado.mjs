/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-BORRADO.MJS · que el borrado final borre lo que dijo, y nada más

   QUÉ CUIDA
   El formulario de confirmación promete: «se borran cuando pase el
   evento». Esa promesa se hizo 115 veces, a cambio de datos que incluyen
   ALERGIAS —información de salud—. borrado_final.php es lo que la
   cumple, y tiene dos maneras de fallar, opuestas y las dos graves:

     · borrar de MENOS, y dejar datos que se prometió borrar;
     · borrar de MÁS, y llevarse el trabajo del evento entero.

   EL FALLO SILENCIOSO QUE MÁS ME PREOCUPA
   El borrado se saltea las tablas que no existen (existeTabla()). Eso
   está bien para una base a medio instalar — pero significa que un
   nombre de tabla MAL ESCRITO se saltea igual, sin error, y esos datos
   sobreviven a un borrado que dijo «listo». Por eso acá cada nombre de
   la lista se compara contra migracion.sql.

   CÓMO SE CORRE
       node herramientas/prueba-borrado.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
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

const borrado = leer('admin', 'api', 'borrado_final.php');
const sql     = leer('admin', 'migracion.sql');
const indice  = leer('index.html');

/* ─── 1. Que las tablas existan de verdad ──────────────────────────── */

console.log('\nCada tabla de la lista existe\n');

/* Solo lo que hay DENTRO de $LO_QUE_SE_BORRA. Mirando el archivo entero,
   las claves de la respuesta JSON («no_se_toca», «todavia_falta») pasan
   por nombres de tabla y la prueba falla por su culpa, no por la del
   código. */
const laLista = borrado.slice(borrado.indexOf('$LO_QUE_SE_BORRA = ['),
                              borrado.indexOf('];', borrado.indexOf('$LO_QUE_SE_BORRA = [')));

const listadas = [...laLista.matchAll(/^\s*'([a-z_]+)'\s*=>\s*'/gm)].map((m) => m[1]);
const enElSql = new Set(
  [...sql.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/g)].map((m) => m[1]));

comprobar('la lista no está vacía', listadas.length > 0);

for (const tabla of listadas) {
  comprobar(tabla + ' existe en migracion.sql', enElSql.has(tabla),
    'un nombre mal escrito se saltea SIN ERROR y esos datos sobreviven');
}

/* ─── 2. Que borre lo prometido ────────────────────────────────────── */

console.log('\nLo que la promesa cubre, se borra\n');

/* El aviso nombra tres cosas: quiénes vienen, dónde sentarlos, las
   alergias. Estas son las tablas donde vive cada una. */
for (const [tabla, porque] of [
  ['confirmaciones', 'nombre, correo, teléfono y ALERGIAS'],
  ['acompanantes',   'los acompañantes con nombre'],
  ['invitaciones',   'el titular, su teléfono y su correo'],
  ['asignacion_mesas', 'dónde se sienta cada quien'],
  ['llegadas',       'quién entró y a qué hora'],
]) {
  comprobar(tabla + ' se borra — ' + porque, listadas.includes(tabla));
}

/* ─── 3. Que NO se lleve el evento por delante ─────────────────────── */

console.log('\nLo que no es de nadie, se queda\n');

for (const tabla of ['mesas', 'presupuestos', 'proveedores', 'contratos',
                     'archivos', 'gastos', 'pagos', 'tareas', 'usuarios']) {
  comprobar(tabla + ' NO se borra', !listadas.includes(tabla),
    'eso es del evento, no de una persona: borrarlo es pasarse de la promesa');
}

/* ─── 4. Los tres cerrojos ─────────────────────────────────────────── */

console.log('\nNo puede pasar sin querer\n');

comprobar('pide la contraseña de nuevo',
  /exigirContrasenaDeNuevo\(\$yo, \$datos\);/.test(borrado));

comprobar('exige escribir la frase completa, tal cual',
  /\$frase !== FRASE_DE_CONFIRMACION/.test(borrado));

comprobar('se planta si no hubo ninguna llegada',
  /\$llegadas === 0 && empty\(\$datos\['sin_llegadas'\]\)/.test(borrado),
  'sin esto, correrlo la semana ANTES de la fiesta borra a todos los invitados');

comprobar('exige ser administradora',
  /exigirAdministrador\(\)/.test(borrado));

comprobar('y además el permiso de borrar',
  /tieneEspecial\(\$yo, 'borrar'\)/.test(borrado));

comprobar('la vista previa es GET y no escribe',
  /\$accion === 'vista_previa'[\s\S]{0,200}exigirMetodo\(\['GET'\]\)/.test(borrado) &&
  !/vista_previa[\s\S]{0,900}DELETE FROM/.test(borrado));

/* NO se puede disparar sin una persona con sesión. Un borrado por fecha
   se equivoca si la fiesta se corre, o si el reloj está en otra zona
   —cosa que en este proyecto YA PASÓ y costó un 429 permanente— y eso
   no tiene vuelta atrás.
   Lo que se comprueba es la puerta, no la palabra «cron»: sin la llave
   de arranque y sin camino de línea de comandos, no hay forma de que
   algo automático entre acá. */
comprobar('no hay puerta de servicio: sin sesión no se entra',
  !/llaveDeArranqueCorrecta/.test(borrado) &&
  !/php_sapi_name|\$argv/.test(borrado),
  'una llave suelta o un camino por CLI lo vuelven automatizable');

/* ─── 5. Honestidad ────────────────────────────────────────────────── */

console.log('\nDice la verdad sobre lo que NO puede borrar\n');

/* El respaldo semanal manda la base POR CORREO, y los invitados van
   adentro. Si esto dijera «listo, borrado» sin nombrarlo, estaría
   dando por cumplida una promesa a medio cumplir. */
const respaldo = leer('admin', 'api', 'cron_respaldo.php');
const excluidas = /\$SIN_RESPALDO|no viaja|'usuarios', 'sesiones'/.test(respaldo);

comprobar('el respaldo sigue mandándose por correo (la premisa sigue en pie)',
  /correo/i.test(respaldo) && excluidas);

comprobar('confirmaciones NO está excluida del respaldo',
  !/'confirmaciones'/.test(respaldo.slice(0, respaldo.indexOf('AGREGAR ALGO ACÁ'))),
  'si algún día se excluye, este aviso sobra y hay que sacarlo');

comprobar('la vista previa avisa de los correos del respaldo',
  /respaldo semanal se manda POR CORREO/.test(borrado));

comprobar('y la respuesta del borrado también',
  /'todavia_falta'/.test(borrado),
  'decir «listo» con copias en un buzón es mentir con buenas intenciones');

/* ─── 6. La bitácora no puede deshacer el borrado ──────────────────── */

console.log('\nLa bitácora anota cuánto, nunca quién\n');

const laAnotacion = /anotarEnBitacora\([\s\S]{0,400}?\);/.exec(borrado);

comprobar('queda anotado que se hizo', !!laAnotacion);

comprobar('sin nombres, correos ni códigos',
  !!laAnotacion && !/nombre|correo|codigo|telefono/i.test(laAnotacion[0]),
  'guardar a quién se borró para poder decirlo es lo contrario de borrar');

/* ─── 7. Que exista una forma de usarlo ─────────────────────────────
 *
 * Un endpoint que nadie llama es una función que no existe. En este
 * proyecto ya pasó: `listar_pedidos` estuvo desde el primer día sin que
 * ninguna pantalla lo invocara, así que las compras eran invisibles y
 * nadie lo notó durante semanas. Y éste ni siquiera se puede disparar
 * escribiendo la dirección en el navegador: pide POST con contraseña y
 * frase en el cuerpo. */

console.log('\nSe puede llegar hasta acá desde el panel\n');

const pantalla   = leer('admin', 'codigo', '51-borrado-final.js');
const navegacion = leer('admin', 'codigo', '05-navegacion.js');
const config     = leer('admin', 'codigo', '01-configuracion.js');
const indiceAdmin = leer('admin', 'index.html');

comprobar('el archivo de la pantalla se carga',
  /codigo\/51-borrado-final\.js/.test(indiceAdmin));

comprobar('está en el menú de Ajustes',
  /\['borrado-final',/.test(config));

comprobar('y solo para administradoras',
  /\['borrado-final',[^\]]*,\s*true\]/.test(config),
  'sin el true lo ve cualquier cuenta con sesión');

comprobar('la navegación sabe abrirla',
  /case 'borrado-final':[\s\S]{0,80}abrirHojaDeBorradoFinal\(\)/.test(navegacion));

comprobar('la pantalla llama a las dos acciones',
  /accion=vista_previa/.test(pantalla) && /accion=borrar/.test(pantalla));

comprobar('la función queda al nivel superior',
  /^async function abrirHojaDeBorradoFinal\(\)/m.test(pantalla),
  'el panel no se empaqueta: una función anidada no la ve nadie');

/* La cola de escrituras reintenta sola cuando vuelve la señal. Para un
   borrado irreversible eso significa dispararse en cualquier momento,
   con la contraseña guardada, sin nadie mirando. */
comprobar('el borrado NO pasa por la cola de escrituras',
  /mandarSinCola\('borrado_final\.php\?accion=borrar'/.test(pantalla) &&
  !/[^n]mandar\('borrado_final/.test(pantalla),
  'encolado, se dispararía solo más tarde y en manos de cualquiera');

comprobar('la frase del panel y la del servidor son la misma',
  /const FRASE_DEL_BORRADO = '([^']+)'/.exec(pantalla)[1] ===
  /const FRASE_DE_CONFIRMACION = '([^']+)'/.exec(borrado)[1],
  'si no coinciden, el botón se habilita y el servidor lo rechaza');

/* ─── 8. Que la promesa siga escrita donde se leyó ─────────────────── */

console.log('\nLa promesa que esto cumple\n');

comprobar('el formulario sigue prometiendo el borrado',
  /se borran[\s\S]{0,40}cuando pase el evento/.test(indice),
  'si se saca la promesa, esta herramienta cambia de sentido — revisala');

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El borrado cumple la promesa, y solo la promesa.\n');
