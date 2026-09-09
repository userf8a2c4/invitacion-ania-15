/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-LINKS.MJS · que el link de cada quien sea el de cada quien

   QUÉ CUIDA
   Cada invitación es PERSONALIZADA. El link de Andy tiene que abrir la
   invitación de Andy: su nombre en el sobre, SU formulario, SU respuesta.

   EL BUG QUE ESTA PRUEBA EXISTE PARA QUE NO VUELVA (2026-09-09)
   La confirmación enviada se guardaba en el navegador bajo UNA sola
   clave, «invitacion-ania:pase», sin nada que dijera de quién era. Una
   ranura por navegador, no una por invitación.

   Así que apenas alguien confirmaba, CUALQUIER otro link abierto en ese
   navegador escondía el formulario y mostraba «Ya tenemos tu
   confirmación, <el nombre del anterior>». El sobre saludaba bien —eso
   viene del servidor, por token— y el formulario de adentro decía otra
   persona.

   No es un problema de una computadora de pruebas: una mamá confirma, le
   reenvía el link a su hermana, se lo abren en el mismo teléfono, y la
   hermana no puede confirmar nunca. Sin ningún aviso.

   POR QUÉ SE EJECUTA EL CÓDIGO Y NO SE LEE
   Leer el archivo y comprobar que dice «pase:» no prueba nada: el error
   estaba en el COMPORTAMIENTO, no en el texto. Acá se corren las
   funciones de verdad contra un localStorage y una dirección de mentira,
   y se comprueba lo único que importa: que lo que guarda un token no lo
   pueda leer otro.

   CÓMO SE CORRE
       node herramientas/prueba-links.mjs
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

const utilidades = leer('codigo', '02-utilidades.js');
const pase       = leer('codigo', '12-pase-de-acceso.js');
const formulario = leer('codigo', '11-formulario-confirmacion.js');
const invitacion = leer('invitacion.php');
const confirmaciones = leer('admin', 'api', 'confirmaciones.php');
const invitacionesApi = leer('admin', 'api', 'invitaciones.php');


/* ─── 1. LA MEMORIA DEL NAVEGADOR, EJECUTADA DE VERDAD ─────────────── */

console.log('\nLa confirmación guardada es de UNA invitación\n');

/* Se sacan las funciones que hacen falta y se corren con un navegador
   de mentira. Son las de verdad, tal cual están en el archivo. */
const NECESARIAS = ['guardarEnMemoria', 'leerDeMemoria', 'borrarDeMemoria',
                    'tokenDelEnlace', 'guardarElPase', 'leerElPase', 'olvidarElPase'];

const fuentes = NECESARIAS.map(nombre => {
  const desde = utilidades.indexOf('function ' + nombre + '(');
  if (desde === -1) return null;
  // Hasta su llave de cierre al nivel superior. Los archivos son CRLF.
  const cierre = utilidades.indexOf('\n}', desde);
  return cierre === -1 ? null : utilidades.slice(desde, cierre + 2);
});

const faltantes = NECESARIAS.filter((n, i) => !fuentes[i]);
comprobar('están las funciones de la memoria por invitación',
  faltantes.length === 0, 'no encontré: ' + faltantes.join(', '));

if (faltantes.length) {
  console.log('\n✗ Sin esas funciones no se puede probar nada más.\n');
  process.exit(1);
}

/** Un navegador de mentira, con su localStorage y su dirección. */
function abrirComoSiFuera(direccion, memoria) {
  const almacen = memoria || {};
  const falso = {
    localStorage: {
      getItem: (k) => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = String(v); },
      removeItem: (k) => { delete almacen[k]; },
    },
    URLSearchParams,
    window: { location: { search: direccion } },
    console: { warn: () => {} },
  };

  const armar = new Function(
    'localStorage', 'URLSearchParams', 'window', 'console',
    fuentes.join('\n') +
    '\nreturn { tokenDelEnlace, guardarElPase, leerElPase, olvidarElPase,' +
    '         leerDeMemoria, verTodo: () => JSON.parse(JSON.stringify(' +
    '           Object.keys(localStorage.getItem ? {} : {}) )) };'
  );

  return {
    api: armar(falso.localStorage, falso.URLSearchParams, falso.window, falso.console),
    almacen,
  };
}

const TOKEN_ANDY = 'a1b2c3d4e5f60718';
const TOKEN_LUU  = '00ff11ee22dd33cc';

/* El caso exacto que se rompió: se confirma con un link y se abre otro
   en el MISMO navegador (el mismo objeto `almacen`). */
const compartido = {};

const luu = abrirComoSiFuera('?i=' + TOKEN_LUU, compartido);
luu.api.guardarElPase({ nombre: 'Prueba Luu', codigo: 'XV-000000' });

comprobar('quien confirmó ve SU confirmación al volver',
  (luu.api.leerElPase() || {}).nombre === 'Prueba Luu');

const andy = abrirComoSiFuera('?i=' + TOKEN_ANDY, compartido);

/* ⚠️ ESTA ES LA COMPROBACIÓN QUE MANDA. Si esto vuelve a fallar, todos
   los invitados que compartan teléfono con alguien que ya confirmó se
   quedan sin poder confirmar, y no hay forma de que se enteren. */
comprobar('otro link en el mismo navegador NO ve esa confirmación',
  andy.api.leerElPase() === null,
  'devolvió «' + JSON.stringify(andy.api.leerElPase()) + '» — el formulario de ' +
  'esa persona se va a esconder y va a leer el nombre de otro');

andy.api.guardarElPase({ nombre: 'Andy y familia', codigo: 'XV-111111' });

comprobar('cada uno sigue viendo el suyo después de guardar los dos',
  (andy.api.leerElPase() || {}).nombre === 'Andy y familia' &&
  (luu.api.leerElPase() || {}).nombre === 'Prueba Luu');

andy.api.olvidarElPase();

comprobar('olvidar uno no borra el del otro',
  andy.api.leerElPase() === null &&
  (luu.api.leerElPase() || {}).nombre === 'Prueba Luu',
  'el «confirmar de nuevo» de uno estaría borrando la confirmación de otro');

/* Sin link personal no hay invitación que recordar. Guardar ahí volvería
   a crear una ranura sin dueño, que es de dónde vino todo. */
const sinLink = abrirComoSiFuera('', {});
comprobar('sin ?i= no se guarda nada',
  sinLink.api.guardarElPase({ nombre: 'X' }) === false &&
  sinLink.api.leerElPase() === null &&
  Object.keys(sinLink.almacen).length === 0,
  'guardó ' + JSON.stringify(sinLink.almacen));

/* Un token inventado en la dirección no puede colarse como clave. */
const raro = abrirComoSiFuera('?i=' + encodeURIComponent('../../otro'), {});
comprobar('un ?i= que no es un token se ignora',
  raro.api.tokenDelEnlace() === '' && raro.api.leerElPase() === null);

/* El mismo token en mayúsculas es el mismo token: si no, quien vuelve
   con el link copiado a mano no ve su confirmación. */
const mayusculas = abrirComoSiFuera('?i=' + TOKEN_ANDY.toUpperCase(), compartido);
luu.api.guardarElPase({ nombre: 'Prueba Luu', codigo: 'XV-000000' });
const otroAndy = abrirComoSiFuera('?i=' + TOKEN_ANDY, compartido);
otroAndy.api.guardarElPase({ nombre: 'Andy y familia' });
comprobar('el mismo token en mayúsculas es el mismo token',
  (mayusculas.api.leerElPase() || {}).nombre === 'Andy y familia');


/* ─── 2. LA RANURA VIEJA SE BORRA ──────────────────────────────────── */

console.log('\nLa ranura sin dueño\n');

comprobar('la clave vieja «invitacion-ania:pase» se borra al cargar',
  /removeItem\('invitacion-ania:pase'\)/.test(utilidades),
  'quien ya la tenga guardada sigue viendo el nombre de otro para siempre');

/* Sin comentarios: la nota que explica POR QUÉ ya no se usa la ranura
   vieja la nombra, y hacía fallar esta comprobación por citarla. Una
   prueba que grita por un comentario se termina ignorando. */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ');

for (const [archivo, texto] of [['12-pase-de-acceso.js', pase],
                                ['11-formulario-confirmacion.js', formulario]]) {
  const codigo = sinComentarios(texto);
  comprobar('«' + archivo + '» ya no usa la ranura sin dueño',
    !/(leerDeMemoria|guardarEnMemoria|borrarDeMemoria)\('pase'\)/.test(codigo) &&
    !/'invitacion-ania:pase'/.test(codigo));
}


/* ─── 3. Y QUE EL SERVIDOR SIGA MANDANDO ───────────────────────────── */

console.log('\nQuién dice la verdad sobre "ya confirmé"\n');

comprobar('el servidor manda ya_respondio por token',
  /'ya_respondio'\s*=>/.test(invitacion));

comprobar('si el servidor dice que no, se deshace lo del teléfono',
  /ya_respondio !== false/.test(pase) && /olvidarElPase\(\)/.test(pase),
  'la copia del teléfono podría esconder el formulario de alguien que ' +
  'todavía tiene que contestar');

/* ⚠️ Se registra con el ayudante que reproduce los eventos ya ocurridos:
   este archivo se inyecta al abrir el sobre, mucho después del fetch. */
comprobar('esa escucha aguanta llegar tarde',
  /escucharEventoQueQuizasYaPaso\('invitacion-lista'/.test(pase),
  'con addEventListener a secas el evento ya pasó y no se entera nunca');


/* ─── 4. QUE EL LINK NO SE DESATE DE SU DUEÑO ──────────────────────── */

console.log('\nEl link y su invitado, del lado del servidor\n');

/* Borrar a alguien en Gente dejaba su invitación viva y suelta: cuando
   la base reutiliza ese id, se le engancha a un desconocido. */
const bloqueBorrar = (confirmaciones.match(
  /case 'borrar':[\s\S]*?\n    break;/
) || [''])[0];

comprobar('se pudo leer el borrado de confirmaciones', bloqueBorrar.length > 200);

comprobar('borrar un invitado se lleva su invitación',
  /DELETE FROM invitaciones WHERE confirmacion_id/.test(bloqueBorrar),
  'la invitación queda huérfana y se le engancha al próximo que reuse ese id');

comprobar('y se lleva sus acompañantes',
  /DELETE FROM acompanantes WHERE confirmacion_id/.test(bloqueBorrar));

comprobar('lo que se borra queda en la bitácora',
  /anotarEnBitacora/.test(bloqueBorrar),
  'un token borrado por error no se puede recuperar de ningún lado');

/* Renombrar en Gente tiene que renombrar el sobre. */
const bloqueEditar = (confirmaciones.match(
  /case 'editar':[\s\S]*?\n    break;/
) || [''])[0];

comprobar('renombrar a un invitado renombra su link',
  /UPDATE invitaciones SET nombre/.test(bloqueEditar),
  'el sobre seguiría saludando con el nombre viejo, y solo se ve abriendo el link');

/* El cupo del link también sigue a la ficha, mientras siga siendo cupo. */
comprobar('cambiar las personas actualiza los lugares del link',
  /UPDATE invitaciones\s*\n?\s*SET pases/.test(bloqueEditar),
  'el link seguiría ofreciendo los lugares viejos');

comprobar('pero NO después de que contestaron',
  /respondida_en IS NULL/.test(bloqueEditar),
  'pisar el cupo con lo confirmado le quita a esa familia los lugares que ' +
  'todavía no usó — invitacion.php se apoya en eso a propósito');

/* Y el revisor, con su ayudante donde PHP lo puede ver. */
comprobar('existe el revisor de links', /case 'revisar_links':/.test(invitacionesApi));
comprobar('existe el reparador', /case 'reparar_links':/.test(invitacionesApi));

comprobar('el reparador nunca borra una confirmación',
  !/borrar\('confirmaciones'/.test(
    (invitacionesApi.match(/case 'reparar_links':[\s\S]*?\n    break;/) || [''])[0]),
  'tiene que borrar links mal atados, JAMÁS a una persona');

comprobar('mismoNombreDeInvitado() está al nivel superior',
  /^function mismoNombreDeInvitado\(/m.test(invitacionesApi),
  'declarada entre dos `case`, PHP no la define nunca: el switch salta el ' +
  'renglón y la primera llamada revienta con «undefined function»');


/* ─── 5. QUE SE PUEDA CORRER DESDE EL PANEL ────────────────────────── */

console.log('\nEl botón para revisarlos\n');

const gente        = leer('admin', 'codigo', '08-vista-invitados.js');
const invitacionesJs = leer('admin', 'codigo', '48-invitaciones.js');

comprobar('hay un botón en Gente', /id="inv-revisar-links"/.test(gente));
comprobar('el botón está enganchado', /revisarTodosLosLinks\(/.test(gente));

/* El panel NO se empaqueta: una función anidada no la ve nadie, y el
   botón se pinta igual y al tocarlo no pasa nada. */
comprobar('revisarTodosLosLinks() queda al nivel superior',
  /^async function revisarTodosLosLinks\(/m.test(invitacionesJs),
  'anidada, el botón se dibuja y al tocarlo no pasa absolutamente nada');

comprobar('la confirmación usa el diálogo del panel, con await',
  /await confirmarAccion\(/.test(invitacionesJs),
  'sin await, la promesa siempre es verdadera y la pregunta no frena nada');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Cada link abre la invitación de su dueño.\n');
