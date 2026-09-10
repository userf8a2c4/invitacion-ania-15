/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-SINCRONIZACION.MJS · que la copia esté donde se la va a buscar

   QUÉ CUIDA
   El panel guarda cada copia offline BAJO LA DIRECCIÓN EXACTA con que se
   pidió. Si la lista de precalentado dice `mesas.php?accion=todo` y la
   pantalla pide `mesas.php?accion=todos`, no falla nada: online sigue
   andando igual, y esa sección simplemente se queda sin copia. Nadie se
   entera hasta que alguien está sin señal.

   Es el peor tipo de defecto que puede tener este archivo: silencioso,
   y solo visible en el momento en que ya no se puede arreglar.

   Por eso acá se leen las llamadas REALES del panel y se comparan con la
   lista. Y lo mismo con la tarjeta de la puerta, que es la que decide si
   el escáner funciona con el WiFi del salón caído.

   CÓMO SE CORRE
       node herramientas/prueba-sincronizacion.mjs
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

const sync    = leer('admin', 'codigo', '26-sincronizacion.js');
const escaner = leer('admin', 'codigo', '28-escaner.js');
const llegadas = leer('admin', 'api', 'llegadas.php');

/* ─── 1. La lista contra las llamadas de verdad ────────────────────── */

console.log('\nCada ruta precalentada la pide alguien\n');

const lista = (sync.match(/const RUTAS_A_PRECALENTAR = \[([\s\S]*?)\n\];/) || ['', ''])[1];
const precalentadas = [...lista.matchAll(/'([^']+\.php[^']*)'/g)].map(m => m[1]);

comprobar('la lista se pudo leer', precalentadas.length > 5,
  'encontré ' + precalentadas.length);

/* Todas las llamadas traer('…') de todo el panel. */
const pedidas = new Set();
for (const archivo of readdirSync(join(raiz, 'admin', 'codigo'))) {
  if (!archivo.endsWith('.js')) continue;
  const codigo = leer('admin', 'codigo', archivo);
  for (const m of codigo.matchAll(/traer\('([^']+)'/g)) pedidas.add(m[1]);
}

comprobar('se leyeron las llamadas del panel', pedidas.size > 20,
  'encontré ' + pedidas.size);

for (const ruta of precalentadas) {
  comprobar('«' + ruta + '» la pide alguna pantalla',
    pedidas.has(ruta),
    'nadie pide esa dirección: la copia se guarda donde no la busca nadie');
}

/* ─── 2. Lo que el panel pide y NO se precalienta ──────────────────── */

console.log('\nLo que queda sin copia, y si es a propósito\n');

/* Exclusiones deliberadas, cada una con su motivo. Si mañana alguien
   agrega una pantalla nueva y no la precalienta, aparece acá. */
const A_PROPOSITO = {
  'correo.php': 'IMAP: tarda segundos y no sirve sin red',
  'compras.php': 'trae claves de Stripe y el cobro está apagado',
  'sesion.php': 'la sesión no se cachea',
  'recordatorios.php': 'la llave VAPID no es contenido',
  'compartir.php': 'depende de a quién se le comparte',
  'cron_respaldo.php': 'estado del servidor, no del evento',
  'borrado_final.php': 'vista previa de un borrado: se pide a mano',
  'ajustes.php': 'se piden de a una clave, según la pantalla',
  'metricas.php': 'telemetría, no contenido del evento',
  'llegadas.php?accion=revisar_codigos': 'diagnóstico caro, se pide a mano',
  'invitaciones.php?accion=revisar_links': 'diagnóstico caro, se pide a mano',
  'invitaciones.php?accion=reparar_links': 'escribe: nunca se guarda una copia',
  'llegadas.php?accion=consultar': 'se guarda desde todas_las_tarjetas',
  'llegadas.php?accion=todas_las_tarjetas': 'ES el mecanismo del precalentado',
  /* La descarga de invitados la pide para poner el menú de cada persona
     en el archivo (13-exportar.js). No se precalienta a propósito: no es
     una pantalla, es una acción que alguien dispara —y cuando la
     dispara, quiere los platos de HOY, no los de la última vez que hubo
     señal. Si falla, la descarga sale igual con el resumen de siempre. */
  'acompanantes.php?accion=listar_todos&con_menus=1':
    'la arma una descarga a pedido, y quiere datos frescos',
};

/* ⚠️ LAS «DE A UNA», Y HAY QUE DECIRLAS
 *
 * Estas rutas se arman pegándoles un id: `…&mesa_id=` + numero. No son
 * una dirección, son una familia de direcciones, así que no se pueden
 * precalentar poniéndolas en una lista.
 *
 * La de la puerta se resolvió: llegadas.php?accion=todas_las_tarjetas
 * las trae todas juntas y se guardan de a una. Las demás siguen SIN
 * COPIA: abrir el detalle de una mesa que nunca se abrió, estando sin
 * señal, no va a mostrar nada.
 *
 * No se marcan como fallo —no es un descuido— pero se IMPRIMEN siempre,
 * para que sea una decisión y no un olvido, y para que la próxima que
 * aparezca se vea. */
const DE_A_UNA = [...pedidas].filter(r => /[?&][a-z_]+=$/.test(r));

const sinCopia = [...pedidas].filter(r =>
  !precalentadas.includes(r) &&
  !DE_A_UNA.includes(r) &&
  !Object.keys(A_PROPOSITO).some(p => r.startsWith(p)));

comprobar('no hay pantallas sin copia por descuido',
  sinCopia.length === 0,
  'sin precalentar y sin motivo escrito: ' + sinCopia.join(', '));

console.log('');
console.log('  Sin copia por ser «de a una» (' + DE_A_UNA.length + '), a sabiendas:');
DE_A_UNA.forEach(r => console.log('    · ' + r + '…'));

/* ─── 3. La puerta: la llave tiene que coincidir ───────────────────── */

console.log('\nLa tarjeta de la puerta\n');

comprobar('el servidor sabe dar todas las tarjetas juntas',
  /case 'todas_las_tarjetas':/.test(llegadas));

comprobar('las arma con las MISMAS funciones que el escáner',
  /buscarConfirmacionPorCodigo\(\$codigo\)[\s\S]{0,300}datosParaLaPuerta\(\$encontrada\)/
    .test(llegadas),
  'una consulta parecida escrita al lado se separa de la de verdad sin avisar');

/* ⚠️ Lo que sostiene todo: la dirección con que se GUARDA tiene que ser
   idéntica a la que el escáner PIDE. Las dos usan encodeURIComponent. */
const comoGuarda = /guardarLectura\('llegadas\.php\?accion=consultar&codigo=' \+\s*encodeURIComponent/
  .test(sync);
const comoPide = /traer\('llegadas\.php\?accion=consultar&codigo=' \+ encodeURIComponent/
  .test(escaner);

comprobar('se guarda con la misma dirección que pide el escáner',
  comoGuarda && comoPide,
  'guardar: ' + comoGuarda + ' · pedir: ' + comoPide +
  ' — si difieren, el escáner sin señal no encuentra nada');

comprobar('pedir las tarjetas no marca a nadie como llegado',
  !/case 'todas_las_tarjetas':[\s\S]*?break;/.exec(llegadas)[0]
     .match(/insertar\(|actualizar\(|ejecutar\('(UPDATE|INSERT|DELETE)/i),
  'consultar es de lectura; el que escribe es marcar');

/* ─── 4. El reloj que la mantiene al día ───────────────────────────── */

console.log('\nMantenerse al día solo\n');

comprobar('hay un reloj propio, además de los disparos por evento',
  /function arrancarPuestaAlDia/.test(sync));

comprobar('no corre con la pestaña en el fondo',
  /document\.visibilityState !== 'visible'\) return;[\s\S]{0,120}precalentarCopias/
    .test(sync),
  'gastar batería por una copia que nadie va a mirar no compra nada');

comprobar('no corre sin señal',
  /if \(SIN_LLEGADA\) return;[\s\S]{0,80}precalentarCopias\(true\)/.test(sync));

/* Si el reloj pasara por el enfriamiento, elegir «cada 5 minutos» daría
   diez: el enfriamiento se cuenta desde que TERMINÓ la tanda anterior. */
comprobar('el reloj no pasa por el enfriamiento',
  /precalentarCopias\(true\)/.test(sync) &&
  /if \(!porElReloj && Date\.now\(\) - _precalentadoEn/.test(sync),
  'con el enfriamiento puesto, «cada 5 minutos» se convertiría en cada 10');

/* ─── 5. El ajuste ─────────────────────────────────────────────────── */

console.log('\nEl ajuste, y lo que NO ofrece\n');

const opciones = (sync.match(/CADA_CUANTO_SE_PUEDE = \[([^\]]*)\]/) || ['', ''])[1];

comprobar('ofrece 5, 10, 30 y 60 minutos',
  opciones.replace(/\s/g, '') === '5,10,30,60', 'dice [' + opciones + ']');

comprobar('por defecto, cada 5 minutos',
  /CADA_CUANTO_POR_OMISION = 5/.test(sync));

/* Apagarlo devuelve el problema que esto vino a resolver, en silencio y
   meses después. Si algún día se agrega, que sea una decisión y no un
   descuido. */
comprobar('no hay opción «nunca»',
  !/'nunca'|Nunca|valor: 0/.test(sync),
  'apagar la sincronización devuelve el problema que esto vino a resolver');

comprobar('la elección se guarda EN EL DISPOSITIVO, no en el servidor',
  /recordar\('minutos-al-dia'/.test(sync) && /recordado\('minutos-al-dia'/.test(sync),
  'el teléfono de la puerta y la compu de casa no tienen por qué querer lo mismo');

comprobar('un valor raro guardado no rompe nada',
  /CADA_CUANTO_SE_PUEDE\.includes\(guardado\) \? guardado : CADA_CUANTO_POR_OMISION/
    .test(sync));

/* ─── 6. Que se pueda llegar al ajuste ─────────────────────────────── */

console.log('\nRegistrado en el panel\n');

const config     = leer('admin', 'codigo', '01-configuracion.js');
const navegacion = leer('admin', 'codigo', '05-navegacion.js');

comprobar('está en el menú de Ajustes', /\['al-dia',/.test(config));
comprobar('la navegación lo abre',
  /case 'al-dia':[\s\S]{0,60}abrirHojaDePuestaAlDia\(\)/.test(navegacion));
comprobar('la función queda al nivel superior',
  /^function abrirHojaDePuestaAlDia\(\)/m.test(sync),
  'el panel no se empaqueta: una función anidada no la ve nadie');

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Todo se guarda donde se lo va a buscar, y se mantiene solo.\n');
