/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-AVISOS.MJS · que la pantalla de avisos no mienta

   QUÉ COMPRUEBA
   Un envío real dio `correos: 2, push: 0` y nadie se enteró de que los
   avisos al teléfono no le llegaban a nadie. El motivo no era el envío:
   era que la pantalla decía «Activados» mirando
   `Notification.permission`, que es el PERMISO del navegador. El aviso
   no lo manda el navegador — lo manda el servidor, a una suscripción
   guardada en `suscripciones_push`. Las dos cosas se separan solas.

   Y una suscripción queda atada a la llave VAPID con la que se creó: si
   las llaves del servidor cambiaron, la vieja parece sana y el servicio
   de push rechaza todo. Falla en silencio y para siempre.

   CÓMO SE CORRE
       node herramientas/prueba-avisos.mjs
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

const avisos        = leer('admin', 'codigo', '15-instalar-y-avisos.js');
const recordatorios = leer('admin', 'api', 'recordatorios.php');
const sw            = leer('admin', 'sw.js');

/* ─── 1. La etiqueta ya no miente ──────────────────────────────────── */

console.log('\nLa etiqueta «Este teléfono»\n');

comprobar('«granted» ya NO pinta «Activados» de entrada',
  !/granted:\s*\['bien',\s*'Activados'\]/.test(avisos),
  'el permiso del navegador no es lo mismo que estar registrado');

comprobar('arranca en «Comprobando…»',
  /granted:\s*\['tenue',\s*'Comprobando…'\]/.test(avisos));

comprobar('la etiqueta se puede actualizar (tiene id)',
  /id="av-estado"/.test(avisos));

comprobar('con permiso dado se comprueba de verdad',
  /if \(permiso === 'granted'\) confirmarRegistroDeEsteTelefono\(cuerpo\);/.test(avisos));

/* ─── 2. Comprobar es además REGISTRAR ─────────────────────────────── */

console.log('\nLa comprobación cura, no solo denuncia\n');

const cuerpoConfirmar = avisos.slice(
  avisos.indexOf('async function confirmarRegistroDeEsteTelefono'),
  avisos.indexOf('function laLlaveCoincide'));

comprobar('pregunta al navegador si hay suscripción',
  /getSubscription\(\)/.test(cuerpoConfirmar));

comprobar('y la vuelve a mandar al servidor',
  /accion=suscribir/.test(cuerpoConfirmar),
  'sin esto, una fila perdida en el servidor no se arregla nunca');

comprobar('sin suscripción avisa «Falta registrar», no «Activados»',
  /'alerta', 'Falta registrar'/.test(cuerpoConfirmar),
  'es el caso que más engañaba: permiso dado y nadie del otro lado');

comprobar('si falla la red dice «Sin confirmar», no inventa',
  /'tenue', 'Sin confirmar'/.test(cuerpoConfirmar),
  'decir «Activados» sin saber es volver al defecto de antes');

comprobar('solo dice «Activados» después de registrar bien',
  cuerpoConfirmar.indexOf('accion=suscribir') <
  cuerpoConfirmar.indexOf("'bien', 'Activados'"),
  'el orden importa: primero se registra, después se afirma');

/* ─── 3. El servidor devuelve cuántos teléfonos hay ────────────────── */

console.log('\nCuántos aparatos hay del otro lado\n');

comprobar('suscribir cuenta las suscripciones',
  /SELECT COUNT\(\*\) AS n FROM suscripciones_push/.test(recordatorios));

comprobar('y devuelve el total',
  /'telefonos' => \$cuantos \? \(int\) \$cuantos\['n'\] : 0/.test(recordatorios));

comprobar('suscribir sigue siendo idempotente',
  /ON DUPLICATE KEY UPDATE/.test(recordatorios),
  'volver a registrar tiene que ser gratis; si duplica, no se puede curar solo');

comprobar('la pantalla muestra ese número',
  /teléfonos registrados en total/.test(avisos) &&
  /Es el único teléfono registrado/.test(avisos),
  'un «1 teléfono» cuando deberían ser tres se ve de un vistazo');

/* ─── 4. La llave VAPID, ejecutando la función de verdad ───────────── */

console.log('\nUna suscripción de otra llave no sirve\n');

const laLlaveCoincide = new Function(
  avisos.slice(avisos.indexOf('function laLlaveCoincide'),
               avisos.indexOf('function llaveABytes')) +
  '\n return laLlaveCoincide;')();

const conLlave = (bytes) => ({
  options: bytes === null ? {} : { applicationServerKey: new Uint8Array(bytes).buffer },
});

const LLAVE = new Uint8Array([4, 10, 20, 30, 40]);

comprobar('la misma llave → se reutiliza',
  laLlaveCoincide(conLlave([4, 10, 20, 30, 40]), LLAVE) === true);

comprobar('un byte distinto → NO se reutiliza',
  laLlaveCoincide(conLlave([4, 10, 20, 30, 99]), LLAVE) === false,
  'el push la rechazaría en silencio, para siempre');

comprobar('otro largo → NO se reutiliza',
  laLlaveCoincide(conLlave([4, 10, 20]), LLAVE) === false);

/* Un navegador que no expone options.applicationServerKey. Ante la duda
   NO se da de baja: tirar una suscripción que a lo mejor servía, por una
   sospecha que no se puede confirmar, hace más daño que el caso que se
   quiere cubrir. */
comprobar('si el navegador no lo dice, se deja como está',
  laLlaveCoincide(conLlave(null), LLAVE) === true,
  'ante la duda no se rompe lo que puede estar funcionando');

comprobar('sin options tampoco explota',
  laLlaveCoincide({}, LLAVE) === true);

comprobar('al no coincidir, se da de baja antes de rehacerla',
  /await suscripcion\.unsubscribe\(\);/.test(avisos),
  'sin la baja, subscribe() devuelve la misma de siempre');

/* ─── 5. Que el service worker siga sabiendo recibirlas ────────────── */

console.log('\nEl service worker\n');

comprobar('escucha push',
  /addEventListener\('push'/.test(sw),
  'sin esto el aviso llega al teléfono y no se muestra');

comprobar('escucha el clic en la notificación',
  /addEventListener\('notificationclick'/.test(sw));

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ La pantalla de avisos dice la verdad.\n');
