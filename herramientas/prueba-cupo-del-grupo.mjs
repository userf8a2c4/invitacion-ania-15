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
   formulario abierto, sin token). Ahí no hay `pases` que mover. */
comprobar('aguanta una confirmación sin invitación',
  mover.includes('WHERE confirmacion_id = :c') && /if \(!\$inv\) return;/.test(mover),
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

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El cupo dice lo mismo en el panel y en la invitación.\n');
