/* Comprueba agregar y quitar gente de una invitación, y que el cupo no
 * pueda quedar diciendo dos cosas distintas.
 *
 * POR QUÉ EXISTE
 * Hasta el 2026-09-09, sumar un primo a una familia completa eran cinco
 * pasos: salir de la ficha, abrir «Editar invitación», cambiar un
 * número, guardar, volver a entrar y recién ahí poner el nombre. La
 * ficha lo decía como un cartel sin salida: "para agregar a alguien
 * más, primero súbele los pases a la invitación".
 *
 * LO QUE HACE PELIGROSO ESTE CAMBIO
 * El cupo de un grupo vive en DOS tablas:
 *   · `confirmaciones.adultos` + `.ninos` — de donde salen los conteos
 *     del panel, los menús que se le piden a la cocina y el armado de
 *     las mesas.
 *   · `invitaciones.pases` — lo que ve el invitado ("Hemos reservado N
 *     lugares") y el tope de cuántos puede tildar en su formulario.
 *
 * Mover una sola deja al invitado viendo tres lugares donde el panel
 * cuenta cuatro: una silla fantasma que la cocina cuenta y nadie ocupa,
 * o —al revés— un invitado que no puede confirmar a alguien que sí está
 * en la lista. Ninguna de las dos avisa: los números simplemente no
 * coinciden, y se descubre el día de la fiesta.
 *
 * Y hay una tercera trampa: que agregar de más deje de ser un error para
 * TODAS las pantallas. El tope existe por algo —nombrar más gente que la
 * declarada— y solo esta ficha, donde la persona ve lo que va a pasar,
 * tiene derecho a pasarlo por arriba.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const api   = readFileSync(raiz('admin', 'api', 'acompanantes.php'), 'utf8');
const panel = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* Se lee el código, no la prosa: los comentarios de estos archivos
   nombran justo lo que estas comprobaciones prohíben. */
const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const apiLimpia   = sinComentarios(api);
const panelLimpio = sinComentarios(panel);

/* ─── 1. El cupo se mueve en las dos tablas ──────────────────────── */

console.log('\nLas dos tablas, o ninguna\n');

const mover = apiLimpia.slice(
  apiLimpia.indexOf('function moverElCupo'),
  apiLimpia.indexOf('function cupoDeLaConfirmacion'));

comprobar('existe un solo lugar que mueve el cupo',
  mover.length > 0 && (apiLimpia.match(/function moverElCupo/g) || []).length === 1);
comprobar('toca confirmaciones (adultos o niños)',
  /actualizar\('confirmaciones'/.test(mover));
comprobar('y toca invitaciones.pases',
  /actualizar\('invitaciones'/.test(mover) && mover.includes("'pases'"),
  'sin esto el invitado ve un número y el panel otro');
comprobar('elige la columna según adulto o niño',
  /\$tipo === 'nino' \? 'ninos' : 'adultos'/.test(mover),
  'un niño sumado como adulto descuadra el menú infantil');

/* Los pisos. Restar más de lo que hay no puede dejar números negativos:
   un grupo de -1 personas rompe cualquier conteo que lo sume. */
comprobar('los adultos/niños nunca bajan de 0',
  /max\(0,/.test(mover));
comprobar('los pases nunca bajan de 1',
  /max\(1,/.test(mover),
  'una invitación de 0 lugares no es una invitación');

/* Una confirmación puede no tener invitación (las que entraron por el
   formulario abierto, sin token). Ahí no hay `pases` que mover.

   ⚡ ESTA COMPROBACIÓN PEDÍA EL BUG (2026-09-14)
   Hasta hoy exigía `if (!$inv) return;` con el punto y coma pegado, o
   sea el `return` pelado en persona. Estaba escrita para cuidar que la
   salida EXISTIERA —que no reventara con una confirmación sin token— y
   de paso congeló la forma exacta que la rompía: mientras el bug estuvo
   puesto, esta línea daba «ok». Ahora se pide la salida Y que devuelva
   éxito. */
comprobar('aguanta una confirmación sin invitación',
  mover.includes('WHERE confirmacion_id = :c') && /if \(!\$inv\) return true;/.test(mover),
  'las que entraron sin token no tienen fila en invitaciones');

/* ─── 2. Pasarse del cupo sigue siendo un error, salvo a pedido ──── */

console.log('\nEl tope sigue siendo el tope\n');

const agregar = apiLimpia.slice(
  apiLimpia.indexOf("case 'agregar':"),
  apiLimpia.indexOf("case 'editar':"));

comprobar('sin la bandera, sigue rechazando',
  /if \(empty\(\$datos\['subir_cupo'\]\)\)/.test(agregar) &&
  agregar.includes('responderMal'),
  'otras pantallas llaman acá y para ellas pasarse SÍ es un error');
comprobar('con la bandera, suma el lugar antes de insertar',
  agregar.indexOf('moverElCupo') !== -1 &&
  agregar.indexOf('moverElCupo') < agregar.indexOf("insertar('acompanantes'"),
  'si inserta primero, un fallo al mover deja a la persona sin silla');
comprobar('el lugar que suma es del tipo de la persona nueva',
  /moverElCupo\(\$confirmacionId,\s*\$tipoNuevo,\s*\+1\)/.test(agregar));

/* ─── 3. Quitar del grupo vs. dejar sin nombre ───────────────────── */

console.log('\nDos cosas distintas, y se distinguen\n');

const borrar = apiLimpia.slice(
  apiLimpia.indexOf("case 'borrar':"),
  apiLimpia.indexOf('default:'));

comprobar('bajar el cupo también es a pedido explícito',
  /if \(!empty\(\$datos\['bajar_cupo'\]\)\)/.test(borrar),
  'sin la bandera tiene que seguir dejando el lugar reservado');
/* ⚠️ El patrón NO usa [^)]*: la llamada real lleva conversiones
   —`(int) $fila['confirmacion_id']`, `(string) $fila['tipo']`— y esos
   paréntesis cortaban la búsqueda. La primera versión de esta
   comprobación fallaba con el código correcto puesto. */
comprobar('resta del tipo que era esa persona',
  /moverElCupo\([\s\S]{0,140}\$fila\['tipo'\][\s\S]{0,20}-1\s*\)/.test(borrar));
comprobar('se lee la fila ANTES de borrarla',
  borrar.indexOf("SELECT * FROM acompanantes") < borrar.indexOf("borrar('acompanantes'"),
  'después del DELETE ya no se sabe si era adulto o niño');

comprobar('el panel ofrece las dos, separadas',
  panelLimpio.includes('data-quitar-acomp') && panelLimpio.includes('data-sacar-acomp'));
comprobar('«quitar del grupo» manda bajar_cupo',
  /accion=borrar',\s*\{\s*id:\s*id,\s*bajar_cupo:\s*true\s*\}/.test(panelLimpio));
comprobar('«dejar sin nombre» NO lo manda',
  /accion=borrar',\s*\{\s*id:\s*Number\(boton\.dataset\.quitarAcomp\)\s*\}/.test(panelLimpio),
  'si lo mandara, vaciar un nombre encogería la familia');

/* ─── 4. La pantalla no puede contradecir a la base ──────────────── */

console.log('\nEl cupo que se dibuja es el de verdad\n');

comprobar('listar devuelve el cupo con los datos',
  /'cupo'\s*=>\s*cupoDeLaConfirmacion/.test(apiLimpia),
  'el panel lo recibía una vez al abrir y lo pasaba de mano en mano');
comprobar('el panel usa el del servidor, no el del parámetro',
  panelLimpio.includes('cupoDeVerdad'),
  'después de sumar un primo seguía dibujando "3 de 3" con cuatro');
comprobar('y el parámetro queda solo de respaldo',
  /let cupoDeVerdad = cupo;/.test(panelLimpio));

/* ─── 5. Los conteos de otras pantallas se marcan viejos ─────────── */

console.log('\nAvisarle al resto del panel\n');

comprobar('al quitar del grupo se ensucia Resumen',
  /bajar_cupo:\s*true[\s\S]{0,400}ensuciarVistas\('resumen'\)/.test(panelLimpio),
  'el plano de mesas y los conteos quedaban con el número viejo');
comprobar('al sumar un lugar, también',
  /if \(subeElCupo\) ensuciarVistas\('resumen'\)/.test(panelLimpio));
comprobar('y NO se ensucia si solo se nombró un lugar existente',
  panelLimpio.includes('if (subeElCupo) ensuciarVistas'),
  'nombrar no cambia ningún número: repintar todo sería gratis para nada');

/* ─── EL DESFASE QUE CARLOS ENCONTRÓ (2026-09-13) ───────────────────
 *
 * La ficha de Carolina Leyva decía «(5 DE 4)»: cinco personas nombradas y
 * cuatro lugares reservados. La invitación le decía 4 a la familia, y la
 * cocina y las mesas iban a contar 4.
 *
 * LA CAUSA
 * `moverElCupo()` tenía TRES salidas silenciosas —sin tabla, sin columna,
 * sin fila— y quien la llamaba tiraba el resultado. Cuando alguna se
 * disparaba, el acompañante se insertaba igual y la familia quedaba con
 * más gente que lugares. Un lugar que no se pudo reservar tiene que ser un
 * error que se ve, no un silencio que aparece tres pantallas después.
 * ---------------------------------------------------------------- */

console.log('\nEl desfase entre gente y lugares\n');

comprobar('moverElCupo() dice si pudo, en vez de callarse',
  /@return bool true solo si el cupo qued\u00f3 movido de verdad\./.test(api) ||
  /function moverElCupo\([\s\S]*?return false;/.test(api),
  'con tres salidas silenciosas y el resultado tirado, el acompañante se ' +
  'inserta igual y la familia queda con más gente que lugares');

comprobar('y si no se pudo reservar el lugar, NO se agrega a nadie',
  /if \(!moverElCupo\(\$confirmacionId, \$tipoNuevo, \+1\)\) \{/.test(api) &&
  /responderMal\(\s*\n?\s*'No se pudo reservar el lugar de m\u00e1s/.test(api),
  'insertar igual es exactamente cómo se llega a «5 de 4»');

/* ⛔ EL CONTRATO DE moverElCupo(), BLINDADO SALIDA POR SALIDA (2026-09-14)
 *
 * Acá había una comprobación que miraba UNA sola puerta —la primera, la
 * de `existeTabla('confirmaciones')`— y pedía que no fuera un `return`
 * pelado. Nunca lo fue. Las dos que sí lo eran quedaban fuera del foco:
 *
 *   · `if (!$inv) return;` — la confirmación sin invitación, las que
 *     entraron por el formulario abierto, sin token.
 *   · y el final de la función, que no tenía `return` ninguno. En PHP,
 *     caer al final devuelve null igual que un `return;` — y ese era el
 *     camino de éxito NORMAL, el de una familia CON invitación, que son
 *     casi todas.
 *
 * Las dos devolvían null; el llamador pregunta `if (!moverElCupo(...))`, y
 * null es falso. Contestaba 409 «no se pudo reservar el lugar de más, así
 * que no se agregó a nadie» DESPUÉS de haber movido el cupo en las dos
 * tablas. El dato cambiaba y la pantalla decía que no — y el mensaje
 * invita a reintentar, así que cada intento volvía a subir el cupo.
 *
 * Por eso esto ya no busca una línea conocida: enumera TODAS las salidas
 * del cuerpo y exige que cada una devuelva un bool escrito a mano. Una
 * comprobación que nombra la forma exacta del bug solo atrapa ese bug;
 * esta atrapa la clase entera.
 * ---------------------------------------------------------------- */

/* El cuerpo se saca por balanceo de llaves, no cortando hasta la
   siguiente función: así sigue valiendo si mañana alguien mete otra
   función en el medio o reordena el archivo. Se corre sobre `apiLimpia`
   —sin comentarios— para que una llave dentro de una explicación no
   cuente como bloque. */
const cuerpoDeLaFuncion = (texto, nombre) => {
  const ini = texto.indexOf('function ' + nombre);
  if (ini === -1) return null;
  const abre = texto.indexOf('{', ini);
  if (abre === -1) return null;
  let prof = 0, i = abre;
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (c === "'" || c === '"') {      // una llave dentro de una cadena
      const cierre = c;                // no abre ningún bloque
      i++;
      while (i < texto.length && texto[i] !== cierre) {
        if (texto[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) break;
  }
  return prof === 0 && i < texto.length ? texto.slice(abre + 1, i) : null;
};

const cuerpoMover = cuerpoDeLaFuncion(apiLimpia, 'moverElCupo');

comprobar('se puede leer el cuerpo entero de moverElCupo()',
  cuerpoMover !== null && cuerpoMover.includes("actualizar('invitaciones'"),
  'si esto falla, las dos comprobaciones de abajo no están mirando nada ' +
  'y darían «ok» con el archivo roto');

const salidas = [...(cuerpoMover || '').matchAll(/\breturn\b([^;]*);/g)]
  .map(m => m[1].trim());

comprobar('ninguna salida de moverElCupo() es un `return` pelado',
  salidas.length > 0 && salidas.every(v => v === 'true' || v === 'false'),
  'devuelve [' + salidas.map(v => v === '' ? '⛔ PELADO' : v).join(', ') + '] — ' +
  'un `return;` es null, que en un `if` es falso por casualidad y no por ' +
  'diseño: el llamador contesta 409 con el cupo ya movido');

comprobar('y tampoco se cae por el final sin devolver nada',
  /\breturn\s+(true|false)\s*;\s*$/.test((cuerpoMover || '').trimEnd()),
  'caer al final también devuelve null, y ese era justo el camino de la ' +
  'familia CON invitación: el éxito normal contestaba 409');

/* ⛔ Y LO QUE YA QUEDÓ TORCIDO NO SE ENDEREZA SOLO. Arreglar la causa
   impide que vuelva a pasar; las fichas guardadas siguen como están. */
comprobar('el panel avisa cuando hay más gente que lugares',
  /const faltanLugares = Math\.max\(0, filas\.length - cupo\);/.test(panel) &&
  /Hay ' \+ filas\.length \+ ' personas y solo ' \+ cupo/.test(panel),
  'dibujar «(5 de 4)» sin decir nada es peor que un error: es un número ' +
  'que se mira todos los días sin saber si importa');

comprobar('y se puede cuadrar de un toque',
  /id="cuadrar-cupo"/.test(panel) &&
  /acompanantes\.php\?accion=cuadrar/.test(panel),
  'sin esto, la ficha de Carolina se queda torcida para siempre');

/* ⚠️ MANDA LA GENTE, NO EL NÚMERO. Los nombres los escribió alguien a
   propósito, uno por uno; el número de adultos y niños es una declaración
   vieja que quedó atrás. */
comprobar('cuadrar cuenta las personas POR TIPO, no de a bulto',
  /foreach \(\$gente as \$uno\) if \(\(\$uno\['tipo'\] \?\? ''\) === 'nino'\) \$ninos\+\+;/
    .test(api) &&
  /\$adultos = count\(\$gente\) - \$ninos;/.test(api),
  'poner todo en adultos dejaría el menú de niños mal contado en la cocina');

/* ⛔ Y TIENE QUE MOVER LAS DOS TABLAS, igual que moverElCupo: si solo
   toca una, el invitado ve un número y el panel cuenta otro. Es la misma
   trampa que este archivo existe para cuidar. */
comprobar('y cuadrar mueve las DOS tablas, no una',
  /case 'cuadrar':[\s\S]*?actualizar\('confirmaciones', \$confirmacionId, \$cambios\);[\s\S]*?actualizar\('invitaciones', \(int\) \$inv\['id'\], \['pases' => \$adultos \+ \$ninos\]\);/
    .test(api),
  'mover una sola deja al invitado viendo un número y al panel contando otro');

comprobar('y el panel refresca también la ficha de arriba',
  /accion=cuadrar[\s\S]{0,900}?ensuciarVistas\('invitados'\);/.test(panel),
  'sin esto el desfase desaparece de la sección y sigue estando tres ' +
  'renglones más arriba, en «PERSONAS 4 (2 adultos, 2 niños)»');

comprobar('y listar dice cuánta gente hay, para poder compararlo',
  /'personas' => count\(\$filas\),/.test(api),
  'el panel tiene que poder detectar el desfase sin adivinarlo');


/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El cupo dice lo mismo en el panel y en la invitación.\n');
