/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-CIERRE-DEL-EVENTO.MJS · QUE «HOY» SIRVA TAMBIÉN EL DÍA DESPUÉS

   QUÉ COMPRUEBA
   Que a partir del 25 de octubre la pantalla Hoy deje de mostrar el
   escáner, las mesas y las alergias —que ese día ya no le sirven a
   nadie— y muestre en su lugar cómo terminó la fiesta y qué queda por
   hacer.

   POR QUÉ EXISTE
   Idea de Carlos: «quizás que en la pantalla de Hoy, el 25 aparezca esta
   información en lugar de lo que tenemos ahorita, pues ya no
   necesitaremos el scanner, mesas, alergias y demás».

   Y ADEMÁS ARREGLA UN BUG QUE SE ACTIVA SOLO ESE DÍA
   `esDiaDeFiesta` era `!(diasParaLaFiesta > 1) || dia.llegaron > 0`. Con
   días NEGATIVOS, `!(-1 > 1)` da true. O sea que el 25 de octubre la
   tarjeta se quedaba congelada en «Llegaron 98/115» con su barra de
   progreso, para siempre — y `llegaron > 0` la sostenía igual, porque la
   tabla `llegadas` no se vacía nunca.

   No tiraba ningún error. Iba a seguir gritando el aforo de una fiesta
   que ya pasó, en el lugar más visible de la app, todos los días. Se
   encontró leyendo el código; faltan semanas para que se active solo.

   ⚡ ESTA PRUEBA EJECUTA, NO LEE. La lección de prueba-eclipse-corre.mjs:
   una prueba que solo busca texto pasa mientras el código está muerto.
   Acá se le arma un mundo a cada función y se mira el HTML que devuelve.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const hoyJs     = readFileSync(raiz('admin', 'codigo', '30-vista-hoy.js'), 'utf8');
const invitados = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');
const hoyPhp    = readFileSync(raiz('admin', 'api', 'hoy.php'), 'utf8');
const confPhp   = readFileSync(raiz('admin', 'api', 'confirmaciones.php'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que +
              (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const codigo = sinComentarios(hoyJs);

const sacar = (fuente, nombre) => {
  const limpio = sinComentarios(fuente);
  const desde = limpio.indexOf('function ' + nombre);
  return desde === -1 ? null : limpio.slice(desde, limpio.indexOf('\n}', desde) + 2);
};

/* El mundo mínimo que necesitan estas funciones para correr. */
const MUNDO =
  'const seguro = v => String(v === undefined || v === null ? "" : v);' +
  'const estadoDeConexionHTML = () => "";' +
  'let USUARIO = { rol: "admin" };';


/* ─── 1. LA TARJETA CAMBIA DE PREGUNTA SEGÚN EL MOMENTO ──────────────── */

console.log('\nQué dice la tarjeta en cada momento\n');

const fEstado  = sacar(hoyJs, 'bloqueEstadoDelDia');
const fCierre  = sacar(hoyJs, 'tarjetaDelCierre');

comprobar('existe bloqueEstadoDelDia()', !!fEstado);
comprobar('existe tarjetaDelCierre()', !!fCierre);

if (fEstado && fCierre) {
  const pintar = (dia, dias) => new Function(
    MUNDO + fEstado + fCierre +
    '\nreturn bloqueEstadoDelDia(' + JSON.stringify(dia) + ', "", ' + dias + ');'
  )();

  /* 115 apartados, 90 contestaron, 82 entraron. */
  const dia = {
    llegaron: 82, grupos_llegaron: 30, esperados: 115,
    confirmados: 90, grupos_confirmados: 35,
    mesas_ocupadas: 12, mesas_total: 14, alergias_activas: 3,
    mensajes_para_ania: 23,
  };

  /* ⚠️ A 40 días nadie entró todavía. Con `llegaron` en 82 el código
     hace lo correcto —«en cuanto alguien cruza la puerta manda el
     conteo de llegadas»— y el dato de prueba era el irreal. */
  const antes   = pintar(Object.assign({}, dia,
    { llegaron: 0, grupos_llegaron: 0, confirmados: 90 }), 40);
  const elDia   = pintar(dia, 0);
  const despues = pintar(dia, -1);

  comprobar('faltando 40 días dice CONFIRMARON',
    /Confirmaron/.test(antes) && !/Llegaron/.test(antes),
    'encabezar siete semanas con "Llegaron 0/115" es dedicarle el lugar más visible a un cero');

  comprobar('el día de la fiesta dice LLEGARON, con barra',
    /Llegaron/.test(elDia) && /barra__relleno/.test(elDia));

  /* ⛔ EL BUG. Sin el arreglo, esto seguía diciendo "Llegaron" con barra. */
  comprobar('al día siguiente NO dice "Llegaron" con barra de progreso',
    !/barra__relleno/.test(despues),
    'una barra al 85 % sugiere que falta algo; lo que hubo fue lo que hubo');

  comprobar('dice cuántos VINIERON, sobre los que habían confirmado',
    /Vinieron/.test(despues) && /82/.test(despues) && /de 90/.test(despues),
    despues.slice(0, 200));

  comprobar('y cuántos NO vinieron',
    /No vinieron/.test(despues) && />8</.test(despues),
    '90 confirmaron y entraron 82: son 8');

  /* ⚠️ Mesas y alergias son datos de la PUERTA: dónde sentar a alguien,
     qué no puede comer. El 25 no le sirven a nadie. */
  comprobar('las mesas y las alergias desaparecen',
    !/Mesas/.test(despues) && !/Alergias/.test(despues));

  comprobar('y aparecen los mensajes para Ania',
    /Mensajes/.test(despues) && />23</.test(despues),
    'es lo único irrecuperable: se le prometió al invitado que no quedan guardados');

  /* ⚠️ Y QUE SE PUEDAN TOCAR, no solo que se vean. Una mordida que
     quitaba el `data-hoy-ir` pasaba esta sección entera: el número
     seguía ahí, pero tocarlo no hacía nada. Mismo criterio que se le
     exige a «No vinieron» dos líneas más abajo, y la misma regla que
     está escrita en este archivo para la cifra de alergias. */
  comprobar('y el número de mensajes lleva al libro',
    /data-hoy-ir="mensajes"/.test(despues),
    'ver 23 y no poder abrirlos es peor que no mostrarlos');

  comprobar('dice hace cuánto fue',
    /Fue ayer/.test(despues),
    despues.slice(0, 160));

  comprobar('y a los tres días lo dice en plural',
    /Hace 3 días/.test(pintar(dia, -3)));

  /* ⚠️ Si alguien entra sin haber confirmado —pasa, se agrega gente en la
     puerta— la resta da negativo, y eso no es "no vinieron". */
  /* ⚠️ Se mira EL NÚMERO, no el HTML entero: un /-\d/ suelto pega
     contra `var(--esp-1)` y la prueba falla sin que nada esté mal. */
  const masDeLosQueConfirmaron = pintar({ llegaron: 95, confirmados: 90 }, -1);
  const cuantosNoVinieron = (masDeLosQueConfirmaron.match(
    /hoy-estado__numero">(-?\d+)<\/div>\s*<div class="hoy-estado__rotulo">No vinieron/) || [])[1];
  comprobar('nunca muestra un "no vinieron" negativo',
    cuantosNoVinieron === '0',
    'salió ' + cuantosNoVinieron + ' — si alguien entra sin haber confirmado, la resta da menos de cero');

  comprobar('el número de los que no vinieron se puede tocar',
    /data-hoy-ir="no-vinieron"/.test(despues),
    'un "8 no vinieron" que no dice quiénes obliga a buscarlos a mano');

  comprobar('pero no si es cero',
    !/data-hoy-ir="no-vinieron"/.test(pintar({ llegaron: 90, confirmados: 90 }, -1)),
    'tocable y vacío es peor que no tocable');
}


/* ─── 2. LAS TRES ACCIONES ───────────────────────────────────────────── */

console.log('\nQué se puede hacer desde la pantalla\n');

const fAcciones = sacar(hoyJs, 'bloqueTresAcciones');
const fAccCierre = sacar(hoyJs, 'bloqueAccionesDelCierre');

comprobar('existe bloqueAccionesDelCierre()', !!fAccCierre);

if (fAcciones && fAccCierre) {
  const pintar = (dias, rol) => new Function(
    'let USUARIO = ' + JSON.stringify({ rol: rol }) + ';' +
    fAcciones + fAccCierre +
    '\nreturn bloqueTresAcciones(' + dias + ');'
  )();

  comprobar('antes de la fiesta, el botón grande sigue siendo escanear',
    /hoy-escanear/.test(pintar(5, 'admin')));

  comprobar('el día de la fiesta también',
    /hoy-escanear/.test(pintar(0, 'admin')),
    'la fiesta sigue hasta la madrugada: a medianoche el escáner está en uso');

  const cierre = pintar(-1, 'admin');
  comprobar('al día siguiente ya no se escanea nada',
    !/hoy-escanear/.test(cierre),
    'llevaría a una cámara que no tiene nada que leer');

  comprobar('el botón grande pasa a ser el respaldo',
    /hoy-cierre-respaldo/.test(cierre),
    'es lo que hay que tener ANTES de cualquier borrado');

  comprobar('y están el libro y los regalos',
    /hoy-cierre-libro/.test(cierre) && /hoy-cierre-regalos/.test(cierre));

  /* ⚠️ El respaldo es de admin: su entrada en el menú lleva el flag y
     dibujarMas() la filtra. */
  const sinSerAdmin = pintar(-1, 'ayudante');
  comprobar('quien no es admin no ve el respaldo',
    !/hoy-cierre-respaldo/.test(sinSerAdmin),
    'sería abrirle una hoja que el menú le esconde');

  comprobar('pero sí el libro de mensajes, y en grande',
    /hoy-cierre-libro-grande/.test(sinSerAdmin),
    'esa entrada está sin el flag de admin a propósito: «cuanta más gente ' +
    'sepa que hay que guardarlo antes del borrado, mejor»');
}


/* ─── 3. QUE NADA SE ROMPA AL FALTAR LOS BOTONES VIEJOS ──────────────── */

console.log('\nEnganchar sin los botones de antes\n');

comprobar('los enganches preguntan si el botón existe',
  /const si = \(selector, hacer\) => \{[\s\S]{0,200}?if \(elemento\)/.test(codigo),
  'un addEventListener sobre null aborta la función y deja SIN enganchar ' +
  'las alertas y las cifras tocables: toda la pantalla dejaría de responder');

comprobar('ya no hay enganches directos sin guarda',
  !/buscar\('#hoy-escanear', vista\)\.addEventListener/.test(codigo));


/* ─── 4. LA LISTA DE LOS QUE NO VINIERON ─────────────────────────────── */

console.log('\nQuiénes no vinieron\n');

const fFiltro = sacar(invitados, 'invitadoPasaElFiltro');
comprobar('existe el filtro', !!fFiltro && /no_vinieron/.test(fFiltro));

if (fFiltro) {
  const pasa = (fila, filtro) => new Function(
    'const FILTRO_INVITADOS = ' + JSON.stringify(filtro) + ';' +
    'const BUSQUEDA_INVITADOS = "";' +
    'const paraBuscar = t => String(t || "").toLowerCase();' +
    'const yaRespondio = () => true;' +
    fFiltro + '\nreturn invitadoPasaElFiltro(' + JSON.stringify(fila) + ');'
  )();

  comprobar('quien dijo que venía y no llegó, entra',
    pasa({ asiste: 1, llego: 0 }, 'no_vinieron'));

  comprobar('quien vino, no',
    !pasa({ asiste: 1, llego: 1 }, 'no_vinieron'));

  /* ⚠️ Quien dijo que NO venía tampoco llegó, obviamente. Meterlo acá
     haría el número inútil: lo que se busca es la silla vacía de alguien
     que apartó lugar. */
  comprobar('quien avisó que no venía, tampoco entra',
    !pasa({ asiste: 0, llego: 0 }, 'no_vinieron'),
    'sería confundir "no vino" con "avisó que no venía"');

  comprobar('y el filtro está en la lista de la pantalla',
    /\['no_vinieron',\s*'No vinieron'\]/.test(invitados));
}

comprobar('el servidor manda si llegó o no',
  /CASE WHEN lleg\.id IS NULL THEN 0 ELSE 1 END AS llego/.test(confPhp) &&
  /LEFT JOIN llegadas lleg/.test(confPhp),
  'sin esto el número es intocable: no hay lista que abrir');

comprobar('y solo si la tabla de llegadas existe',
  /\$conLlegada = \$TIENE_ID && existeTabla\('llegadas'\)/.test(confPhp),
  'una lista de invitados que revienta porque falta el control de puerta sería absurda');


/* ─── 5. EL CONTEO DE MENSAJES ───────────────────────────────────────── */

console.log('\nCuántos le escribieron a Ania\n');

comprobar('hoy.php cuenta los mensajes',
  /\$dia\['mensajes_para_ania'\] = \$cuantosMensajes;/.test(hoyPhp));

comprobar('y filtra el centinela del formulario',
  /preg_match\('\/\^\[,\\s\]\+\$\/u', \$limpio\)/.test(hoyPhp),
  "el formulario manda ', ' cuando no se escribió nada: contar notas <> '' " +
  'daría el total de confirmaciones, no el de mensajes');

comprobar('con el MISMO criterio que borrado_final.php y mensajes.php',
  /mismo criterio|cuantosMensajesParaAnia/.test(hoyPhp),
  'que la tarjeta diga 23 y el libro muestre 22 deja a alguien buscando el que falta');

comprobar('la clave viene declarada en el array del día',
  /'mensajes_para_ania' => 0,/.test(hoyPhp),
  'si no, con la tabla vacía la clave no existe y el cliente pinta undefined');


/* ─── RESULTADO ──────────────────────────────────────────────────────── */

console.log('');
if (fallos === 0) {
  console.log('✓ El 25 de octubre, «Hoy» deja de ser la puerta y pasa a ser el cierre.');
} else {
  console.log(`✗ ${fallos} fallo(s).`);
}

process.exit(fallos === 0 ? 0 : 1);
