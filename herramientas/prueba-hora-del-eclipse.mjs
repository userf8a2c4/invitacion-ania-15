/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · LA HORA DEL ECLIPSE, DE PUNTA A PUNTA
   ══════════════════════════════════════════════════════════════════════

   Carlos: «pon en la app un control específico para controlar la hora de
   trigger».

   La hora atraviesa cinco piezas y cada una la puede romper sola:

     admin/codigo/53-eclipse.js   Lucila escribe hora de Toluca → UTC
     admin/api/ajustes.php        la valida y la guarda
     eclipse.php                  se la sirve a quien abre sin token
     invitacion.php               se la manda de regalo a quien abre con token
     index.html (el vigía)        la adopta, o se queda con la horneada

   ⚠️ LO QUE SE PRUEBA ACÁ Y LO QUE NO
   El comportamiento del vigía —que arranque a la hora nueva, que no se
   repita el mismo día, que sin red use la horneada— se prueba
   EJECUTÁNDOLO en prueba-vigia-reloj.mjs, contra un reloj de mentira.
   Acá se prueban las otras cuatro piezas, y sobre todo la aritmética de
   la conversión, que es lo único de todo esto que un invitado ve como
   un número y que puede estar mal sin que nada falle.
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

const panel      = leer('admin/codigo/53-eclipse.js');
const eclipsePhp = leer('eclipse.php');
const ajustesPhp = leer('admin/api/ajustes.php');
const invPhp     = leer('invitacion.php');
const html       = leer('index.html');
const indexAdmin = leer('admin/index.html');

/* Los comentarios de estos archivos explican largamente cada decisión,
   así que las comprobaciones de AUSENCIA tienen que mirar el código
   pelado o se dejan engañar por su propia explicación. */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');


/* ══════════════════════════════════════════════════════════════════════
   1. LA ARITMÉTICA, EJECUTADA DE VERDAD
   ══════════════════════════════════════════════════════════════════════

   No se lee que las funciones existan: se sacan del archivo y se corren.
   Una conversión de husos que se lee bien y resta al revés es
   exactamente el error que nadie ve hasta el día. */

const piezas = {};
for (const nombre of ['minutosDe', 'horaDe', 'aToluca', 'aUtc']) {
  const m = panel.match(
    new RegExp('function ' + nombre + '\\([\\s\\S]*?\\n\\}', 'm'));
  if (m) piezas[nombre] = m[0];
}

const faltan = ['minutosDe', 'horaDe', 'aToluca', 'aUtc']
  .filter((n) => !piezas[n]);

comprobar('las cuatro funciones de conversión están donde se las busca',
  faltan.length === 0,
  'no se encontraron: ' + faltan.join(', ') + '. Si se les cambió el ' +
  'nombre o la forma, esta prueba dejó de probar la aritmética y hay ' +
  'que volver a escribirla');

if (faltan.length === 0) {
  const HORAS = (panel.match(/HORAS_HASTA_TOLUCA = (\d+)/) || [])[1];

  const convertir = new Function(
    'const HORAS_HASTA_TOLUCA = ' + HORAS + ';\n' +
    piezas.minutosDe + '\n' + piezas.horaDe + '\n' +
    piezas.aToluca + '\n' + piezas.aUtc + '\n' +
    'return { aToluca, aUtc, minutosDe };')();

  comprobar('Toluca está a seis horas de UTC',
    HORAS === '6',
    'México dejó el horario de verano en 2022: son seis todo el año. ' +
    'Si esto cambió, cambió por una razón que hay que escribir acá');

  /* ⛔ LA QUE IMPORTA: 12:30 UTC son las 06:30 de Toluca. Es la hora que
     Carlos eligió y la que está horneada en index.html desde el principio. */
  comprobar('12:30 UTC son las 06:30 de Toluca',
    convertir.aToluca('12:30') === '06:30',
    'dio ' + convertir.aToluca('12:30') + '. Es la conversión del ' +
    'proyecto entero: si esta está mal, todo lo demás está mal');

  comprobar('y al revés, 06:30 de Toluca son las 12:30 UTC',
    convertir.aUtc('06:30') === '12:30',
    'dio ' + convertir.aUtc('06:30'));

  /* ⛔ DAR LA VUELTA AL DÍA ES DONDE ESTO SE ROMPE. Restar seis horas a
     las 02:00 UTC da -4, que sin envolver sale como hora negativa o como
     texto roto. */
  comprobar('02:00 UTC dan las 20:00 de Toluca, sin número negativo',
    convertir.aToluca('02:00') === '20:00',
    'dio "' + convertir.aToluca('02:00') + '". Es el caso de la vuelta ' +
    'al día: 2 menos 6 es -4, y -4 tiene que volverse 20');

  comprobar('y 20:00 de Toluca dan las 02:00 UTC, envolviendo al revés',
    convertir.aUtc('20:00') === '02:00',
    'dio "' + convertir.aUtc('20:00') + '"');

  comprobar('la medianoche sale con cero adelante, no como "0:0"',
    convertir.aToluca('06:00') === '00:00',
    'dio "' + convertir.aToluca('06:00') + '". Un <input type="time"> ' +
    'con "0:0" adentro se queda vacío y Lucila pierde lo que escribió');

  /* Ida y vuelta sobre las 1440 horas del día: si alguna no vuelve a su
     lugar, la conversión tiene un agujero en algún punto del día y no
     alcanza con probar cuatro casos sueltos. */
  let rotas = [];
  for (let m = 0; m < 1440; m++) {
    const h = String(Math.floor(m / 60)).padStart(2, '0') + ':' +
              String(m % 60).padStart(2, '0');
    if (convertir.aUtc(convertir.aToluca(h)) !== h) rotas.push(h);
  }
  comprobar('las 1440 horas del día vuelven a su lugar',
    rotas.length === 0,
    rotas.length + ' no volvieron, la primera ' + rotas[0]);

  comprobar('una hora con forma rara no se convierte en nada',
    convertir.aToluca('25:00') === '' && convertir.aToluca('') === '' &&
    convertir.aToluca('cuando sea') === '',
    'tiene que devolver texto vacío, no NaN ni "undefined:undefined"');
}


/* ══════════════════════════════════════════════════════════════════════
   2. LA MISMA EXPRESIÓN EN LOS TRES LADOS
   ══════════════════════════════════════════════════════════════════════

   El panel valida por comodidad, la API valida por defensa, y el
   navegador valida porque no le cree a nadie. Si las tres no dicen lo
   mismo, hay una hora que una acepta y otra descarta — y eso es un
   eclipse que no corre sin que nada dé error. */

const LA_EXPRESION = '([01][0-9]|2[0-3]):[0-5][0-9]';

for (const [donde, fuente] of [
  ['el panel',        panel],
  ['eclipse.php',     eclipsePhp],
  ['ajustes.php',     ajustesPhp],
  ['el vigía',        html],
]) {
  comprobar('la forma de la hora se valida igual en ' + donde,
    fuente.includes(LA_EXPRESION),
    'tiene que ser exactamente ' + LA_EXPRESION + ': de 00:00 a 23:59 y ' +
    'nada más. Tres validaciones distintas son tres bugs esperando');
}


/* ══════════════════════════════════════════════════════════════════════
   3. LA CLAVE, QUE TIENE QUE SER LA MISMA EN CUATRO ARCHIVOS
   ══════════════════════════════════════════════════════════════════════ */

const CLAVE = 'hora_eclipse_utc';

for (const [donde, fuente] of [
  ['el panel',        panel],
  ['eclipse.php',     eclipsePhp],
  ['ajustes.php',     ajustesPhp],
  ['invitacion.php',  invPhp],
]) {
  comprobar('«' + CLAVE + '» es la clave en ' + donde,
    fuente.includes(CLAVE),
    'una clave distinta en un archivo es una hora que se guarda y nunca ' +
    'se lee, sin un solo error a la vista');
}


/* ══════════════════════════════════════════════════════════════════════
   4. EL CAMINO GRATIS
   ══════════════════════════════════════════════════════════════════════

   invitacion.php ya se pide, ya abre su PDO y ya lee `ajustes`. Mandar
   la hora ahí no cuesta un request nuevo, y cubre a todo el que entra
   por su link personal — que con las invitaciones repartidas por
   WhatsApp es casi todo el mundo. */

comprobar('invitacion.php manda la hora en la respuesta que ya hacía',
  /'eclipse_utc'\s*=>/.test(invPhp),
  'sin esto, cada invitado con link personal tiene que pedir eclipse.php ' +
  'aparte para algo que ya podía viajar gratis');

comprobar('y el vigía escucha esa respuesta',
  /addEventListener\('invitacion-lista'/.test(html) &&
  /eclipse_utc/.test(html),
  'el dato llegaría y nadie lo leería');


/* ══════════════════════════════════════════════════════════════════════
   5. LA HORNEADA NO SE PUEDE PERDER
   ══════════════════════════════════════════════════════════════════════

   Es lo que sostiene todo cuando no hay red, cuando la base está caída,
   cuando eclipse.php no se subió, y en la primera visita de un teléfono
   nuevo. Un homenaje que depende de que un PHP conteste es peor que uno
   que no. */

comprobar('el vigía sigue trayendo una hora horneada',
  /var HORA_UTC = \d+, MINUTO_UTC = \d+;/.test(html),
  'sin respaldo, cualquier problema de red apaga el eclipse para esa visita');

comprobar('y la lee de localStorage antes de la primera resta',
  /localStorage\.getItem\(LLAVE_DE_LA_HORA\)/.test(html) &&
  html.indexOf('localStorage.getItem(LLAVE_DE_LA_HORA)') <
    html.indexOf('function faltaPara()'),
  'si se leyera después, habría un instante en que el vigía cree la hora ' +
  'vieja y puede agendar mal');

/* ⛔ LO QUE PASÓ EL 14 DE SEPTIEMBRE, EN CHICO: un flag que se marca y no
   se rearma es una pestaña que hace algo UNA vez en su vida. */
comprobar('los flags de una-vez-por-día se rearman los tres juntos',
  /yaSePidio = false;\s*\n\s*yaSeRevisoLaVersion = false;\s*\n\s*yaSePreguntoLaHora = false;/
    .test(html),
  'yaSeRevisoLaVersion y yaSePreguntoLaHora se marcaban una vez y no ' +
  'volvían nunca: una pestaña abierta tres días comprobaba su versión una ' +
  'sola vez, y no se enteraba de un cambio de hora jamás');


/* ══════════════════════════════════════════════════════════════════════
   6. EL PANEL, Y LAS DOS COSAS QUE LO HACEN CONFIABLE
   ══════════════════════════════════════════════════════════════════════ */

/* ⛔ mandar() ENCOLA LAS ESCRITURAS SIN SEÑAL Y DEVUELVE ÉXITO. Para una
   nota está bien. Para esto sería: el panel dice «Guardado», el sitio
   sigue con la hora vieja, y el cambio aterriza cuando el teléfono
   agarre red — que puede ser a las 12:31. */
comprobar('la hora se guarda SIN la cola de escrituras pendientes',
  /mandarSinCola\('ajustes\.php\?accion=guardar'/.test(panel) &&
  !/[^n]mandar\('ajustes\.php\?accion=guardar'/.test(sinComentarios(panel)),
  'con mandar(), Lucila se queda creyendo que movió la hora');

/* ⛔ EL MODO DE FALLA DE TODO ESTO ES EL SILENCIO. Preguntarle a la API
   del panel sería preguntarle a la base lo que la base acaba de guardar:
   siempre diría que sí. Hay que preguntarle al archivo PÚBLICO. */
comprobar('el panel se mira al espejo contra el sitio público',
  /\.\.\/eclipse\.php\?comprobar=/.test(panel),
  'sin esto, que la hora no le llegue a los invitados no se nota hasta ' +
  'que el eclipse corra cuando no debía');

comprobar('y dice cuándo es el próximo, en hora de Toluca',
  /function cuandoEsElProximo\(/.test(panel) &&
  /Mañana/.test(panel),
  'sin esa frase, poner las 14:00 a las 15:00 no se distingue de ' +
  'programarlo para dentro de un rato');

comprobar('el archivo del panel está cargado en admin/index.html',
  /codigo\/53-eclipse\.js/.test(indexAdmin),
  'el botón llamaría a una función que no existe');

comprobar('y el botón que lo abre está puesto',
  /* ⚡ (2026-09-14) EL BOTÓN SE MUDÓ A LA HOJA DE «Más». Antes era uno
     de los siete que estaban antes de la lista; se consolidaron porque
     el primer invitado empezaba a 560 píxeles de 744. Lo que importa
     sigue siendo lo mismo: que exista un camino para llegar. */
  /['"]mas-eclipse['"]/.test(leer('admin/codigo/08-vista-invitados.js')) &&
  /abrirLaHoraDelEclipse\(\)/.test(leer('admin/codigo/08-vista-invitados.js')),
  'la hoja existiría y no habría forma de llegar a ella');


/* ══════════════════════════════════════════════════════════════════════
   7. eclipse.php NO PUEDE HACER DAÑO
   ══════════════════════════════════════════════════════════════════════ */

comprobar('eclipse.php no lee nada de $_GET',
  !/\$_GET/.test(sinComentarios(eclipsePhp)),
  'la clave está escrita adentro a propósito: el ?mirando= del vigía es ' +
  'solo para saltear intermediarios que cacheen, y no se mira');

comprobar('y nunca contesta un error: sin hora, contesta ok sin hora',
  /'ok' => true/.test(eclipsePhp) &&
  !/http_response_code\(5/.test(eclipsePhp),
  'un 500 acá no puede ser una excusa para que el navegador haga algo ' +
  'raro: si algo sale mal, el vigía se queda con la hora que tenía');

comprobar('y pide que nadie la cachee',
  /Cache-Control: no-store/.test(eclipsePhp),
  'un intermediario que la guarde media hora convierte «Lucila cambió la ' +
  'hora» en «Lucila la cambió para algunos»');

comprobar('eclipse.php está en la lista de revisar-php.mjs',
  /'eclipse\.php'/.test(leer('herramientas/revisar-php.mjs')),
  'un PHP público que no está en la lista queda sin revisar, y el revisor ' +
  'igual dice que todo está bien');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ La hora viaja del panel al vigía, y la horneada sigue\n' +
            '  sosteniendo el caso en que no viaja.\n');
