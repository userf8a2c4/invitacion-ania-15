/* Comprueba que una familia no pueda aparecer dos veces.
 *
 * POR QUÉ EXISTE
 * Lucila avisó que el PDF de invitados salía con duplicados. La causa
 * estaba en el servidor: `invitaciones.confirmacion_id` no es UNIQUE
 * (migracion.sql:1147 declara solo `KEY por_confirmacion`, al revés de
 * `asignacion_mesas` y `llegadas`, que sí lo tienen), y el LEFT JOIN de
 * confirmaciones.php devolvía la familia una vez por invitación. Un link
 * regenerado bastaba.
 *
 * El bug era viejo. Lo que lo hizo visible fue pasar el cuadro
 * «Confirmaciones» a una fila por persona: antes una familia repetida
 * era un renglón de más entre cincuenta, y ahora son ocho renglones
 * seguidos con los mismos nombres.
 *
 * Y el papel que sale de ahí se lleva al salón. Una familia contada dos
 * veces son platos de más y sillas de más pedidos a proveedores, con un
 * número que nadie va a comparar contra la base a las once de la noche.
 *
 * QUÉ SE COMPRUEBA
 * Las dos vueltas de llave, por separado:
 *   1. que el servidor elija UNA invitación por confirmación;
 *   2. que el panel sea incapaz de imprimir la misma familia dos veces
 *      aunque el servidor se rompa de nuevo.
 *
 * ⚠️ ESTA PRUEBA EJECUTA EL CÓDIGO, NO LO LEE. sinFamiliasRepetidas() se
 * levanta de verdad y se le pasan listas armadas a mano.
 *
 * ⚠️ LAS MORDIDAS SON EN MEMORIA, NUNCA EN DISCO. Se le rompe a propósito
 * una copia del texto para confirmar que la comprobación se entera. El
 * archivo real no se toca en ningún momento: una prueba que edita el
 * proyecto para probarse a sí misma es una forma de romperlo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const piezas       = readFileSync(raiz('admin', 'codigo', '06-piezas.js'), 'utf8');
const confirmaPhp  = readFileSync(raiz('admin', 'api', 'confirmaciones.php'), 'utf8');
const estadisticas = readFileSync(raiz('admin', 'api', 'estadisticas.php'), 'utf8');

const CARGADORES = [
  ['08-vista-invitados.js', 'respuesta'],
  ['27-buscador.js',        'datos'],
  ['28-escaner.js',         'r'],
  ['34-asistente-datos.js', 'r'],
];

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/** Saca una función del archivo, tal cual está escrita, para ejecutarla. */
function extraer(texto, nombre) {
  const desde = texto.indexOf('function ' + nombre + '(');
  if (desde === -1) throw new Error('no existe la función ' + nombre + '()');
  const fin = texto.indexOf('\n}', desde);
  if (fin === -1) throw new Error('no se le encuentra el final a ' + nombre + '()');
  return texto.slice(desde, fin + 2);
}

/** Levanta sinFamiliasRepetidas() desde un texto y devuelve la función. */
function levantar(textoDePiezas) {
  const contexto = { console };
  vm.createContext(contexto);
  vm.runInContext(extraer(textoDePiezas, 'sinFamiliasRepetidas'), contexto);
  return contexto.sinFamiliasRepetidas;
}

const sinRepetidas = levantar(piezas);


/* ─── 1 · Una familia con dos invitaciones sale una sola vez ──────── */

console.log('\nLa familia repetida se colapsa\n');

/* Así llega hoy una familia cuyo link se regeneró: la MISMA confirmación
   (id 7) dos veces, cambiando solo lo que aporta `invitaciones`. */
const conLinkRegenerado = [
  { id: 7, nombre: 'Familia Leyva', adultos: 4, ninos: 1, invitacion_id: 12, invitacion_token: 'viejo' },
  { id: 7, nombre: 'Familia Leyva', adultos: 4, ninos: 1, invitacion_id: 31, invitacion_token: 'nuevo' },
  { id: 8, nombre: 'Familia Solís', adultos: 2, ninos: 0, invitacion_id: 13, invitacion_token: 'unico' },
];

const limpias = sinRepetidas(conLinkRegenerado);

comprobar('dos invitaciones de la misma confirmación dan una familia',
  limpias.length === 2, 'quedaron ' + limpias.length);
comprobar('la familia que sobrevive es la primera de la lista',
  limpias[0].invitacion_token === 'viejo',
  'el servidor ya entrega MAX(id) primero; acá no se vuelve a elegir');
comprobar('la otra familia no se toca',
  limpias[1] && limpias[1].id === 8);

/* Cinco personas contadas dos veces son diez, y diez es lo que se le
   pide al salón. Este es el número que el duplicado rompía. */
const gente = (lista) => lista.reduce((n, f) => n + f.adultos + f.ninos, 0);
comprobar('la cuenta de gente deja de estar inflada',
  gente(limpias) === 7, 'dio ' + gente(limpias) + ', sin limpiar da ' + gente(conLinkRegenerado));


/* ─── 2 · El orden no se altera ───────────────────────────────────── */

console.log('\nLa lista sigue en el orden en que vino\n');

const enOrden = [{ id: 3 }, { id: 1 }, { id: 3 }, { id: 2 }, { id: 1 }];
comprobar('conserva el orden de llegada, sin reordenar nada',
  sinRepetidas(enOrden).map(f => f.id).join(',') === '3,1,2',
  'dio ' + sinRepetidas(enOrden).map(f => f.id).join(','));


/* ─── 3 · Nunca esconde a nadie ───────────────────────────────────── */

console.log('\nDe las dos equivocaciones, nunca la grave\n');

/* Sin identificador no se puede afirmar que dos filas sean la misma. La
   equivocación posible es mostrar de más o esconder a alguien, y esconder
   significa una familia que se queda sin silla. */
const sinIdentificar = [{ nombre: 'A' }, { nombre: 'B' }, { id: null, nombre: 'C' },
                        { id: '', nombre: 'D' }];
comprobar('las filas sin id pasan todas, no se colapsan entre ellas',
  sinRepetidas(sinIdentificar).length === 4,
  'dio ' + sinRepetidas(sinIdentificar).length + ' — esconder a alguien es el error grave');

comprobar('7 y "7" son la misma familia, no dos',
  sinRepetidas([{ id: 7 }, { id: '7' }]).length === 1,
  'PDO devuelve los ids como número o como texto según el driver');

comprobar('una lista vacía no revienta', sinRepetidas([]).length === 0);
comprobar('algo que no es lista devuelve lista vacía',
  Array.isArray(sinRepetidas(null)) && sinRepetidas(null).length === 0);
comprobar('una fila nula no pasa', sinRepetidas([null, { id: 1 }]).length === 1);


/* ─── 4 · El servidor elige una sola invitación ───────────────────── */

console.log('\nEl arreglo de raíz, en el servidor\n');

const joinAcotado =
  /LEFT JOIN invitaciones inv\s+ON inv\.id = \(SELECT MAX\(otra\.id\)/;
const joinIngenuo =
  /LEFT JOIN invitaciones inv ON inv\.confirmacion_id = confirmaciones\.id/;

comprobar('el JOIN de «listar» elige la invitación más nueva',
  joinAcotado.test(confirmaPhp));
comprobar('y ya no está el JOIN que multiplicaba la fila',
  !joinIngenuo.test(confirmaPhp),
  'con el JOIN suelto vuelven los duplicados al PDF');

comprobar('«contestaron» cuenta familias, no filas del JOIN',
  /COUNT\(DISTINCT c\.id\) AS n/.test(estadisticas));
comprobar('y ya no está el COUNT(*) que se inflaba',
  !/COUNT\(\*\) AS n\s+FROM confirmaciones c\s+JOIN invitaciones/.test(estadisticas),
  'es el número que se le canta al salón');

comprobar('el mantenimiento de teléfonos no procesa dos veces la misma familia',
  /SELECT DISTINCT c\.id, c\.nombre, c\.notas, i\.telefono/.test(confirmaPhp));

/* Que no quede ningún JOIN contra invitaciones sin defensa. Si mañana
   alguien agrega uno, esta comprobación lo encuentra antes que Lucila. */
const joinsDeInvitaciones = (confirmaPhp + estadisticas)
  .split(/\r?\n/)
  .filter(l => /JOIN invitaciones/.test(l));
comprobar('los JOIN contra invitaciones son exactamente los tres conocidos',
  joinsDeInvitaciones.length === 3,
  'hay ' + joinsDeInvitaciones.length + '; si agregaste uno, protegelo igual');


/* ─── 4b · Nadie más puede crear una invitación de más ────────────── */

console.log('\nLas otras puertas por donde entraban duplicados\n');

const invitacionesPhp = readFileSync(raiz('admin', 'api', 'invitaciones.php'), 'utf8');
const acompanantesPhp = readFileSync(raiz('admin', 'api', 'acompanantes.php'), 'utf8');
const importarPhp     = readFileSync(raiz('admin', 'api', 'importar.php'), 'utf8');

/* generar_link comprobaba y después insertaba, con toda la petición en el
   medio: dos clics seguidos creaban dos invitaciones. */
comprobar('generar_link comprueba e inserta dentro de una transacción',
  /beginTransaction\(\)/.test(invitacionesPhp) &&
  /FROM invitaciones WHERE confirmacion_id = :c FOR UPDATE/.test(invitacionesPhp),
  'sin el candado, un doble clic deja dos invitaciones para la misma familia');
comprobar('y la cierra: rollBack si ya tenía, commit si la creó',
  /rollBack\(\)/.test(invitacionesPhp) && /commit\(\)/.test(invitacionesPhp));
comprobar('no abre una transacción si ya hay una abierta',
  /inTransaction\(\)/.test(invitacionesPhp),
  'beginTransaction() sobre una transacción abierta lanza');

/* Los SELECT que eligen «la invitación» tienen que elegir la MISMA que
   elige el JOIN, o el panel y el link del invitado se contradicen. */
const sueltos = (invitacionesPhp + acompanantesPhp)
  .split(/\r?\n/)
  .filter(l => /FROM invitaciones/.test(l) || /WHERE confirmacion_id = :c/.test(l))
  .join('\n');

comprobar('ningún SELECT sobre invitaciones usa LIMIT 1 sin decir cuál',
  !/WHERE confirmacion_id = :c LIMIT 1/.test(invitacionesPhp + acompanantesPhp),
  'un LIMIT 1 sin orden elige cualquiera de las dos según el humor del motor');

/* \s+ y no un espacio: uno de los tres quedó partido en dos líneas. */
const conOrden = (invitacionesPhp + acompanantesPhp)
  .match(/WHERE confirmacion_id = :c\s+ORDER BY id DESC LIMIT 1/g) || [];
comprobar('los tres eligen la más nueva, igual que el JOIN',
  conOrden.length === 3, 'encontré ' + conOrden.length + ', esperaba 3');

/* El importador comparaba nombres letra por letra: un espacio de más y la
   familia entraba de nuevo, bajo otro id. */
comprobar('el importador ignora los espacios al buscar repetidos',
  (importarPhp.match(/TRIM\(nombre\) = TRIM\(:n\)/g) || []).length === 2,
  'son dos puertas: la vista previa y la importación de verdad');
comprobar('y ya no compara el nombre crudo',
  !/WHERE nombre = :n LIMIT 1/.test(importarPhp));


/* ─── 5 · Los cuatro cargadores usan el mismo colador ─────────────── */

console.log('\nNingún camino carga la lista sin colarla\n');

for (const [archivo, variable] of CARGADORES) {
  const texto = readFileSync(raiz('admin', 'codigo', archivo), 'utf8');

  comprobar(archivo + ' cuela la lista',
    texto.includes('INVITADOS = sinFamiliasRepetidas(' + variable + '.filas)'));
  comprobar(archivo + ' ya no la asigna cruda',
    !new RegExp('INVITADOS = ' + variable + '\\.filas').test(texto),
    'asignarla cruda devuelve los duplicados a esa pantalla');
}


/* ─── 6 · La expansión por persona no repite a nadie ──────────────── */

console.log('\nLa gente de cada familia, sin repetidos ni inventados\n');

const exportar = readFileSync(raiz('admin', 'codigo', '13-exportar.js'), 'utf8');

function levantarGente(texto) {
  const contexto = { console };
  vm.createContext(contexto);
  vm.runInContext(extraer(texto, 'gentePorFamilia'), contexto);
  return contexto.gentePorFamilia;
}

const gentePorFamilia = levantarGente(exportar);
const nombresDe = (lista) => lista.map(p => p.nombre);

/* El caso del importador: guarda «Adulto 2», «Adulto 3»… como nombre DE
   VERDAD (importar.php:492). Si una fila real quedó corrida de su número,
   el relleno caía justo encima. */
const conNombresDelImportador = gentePorFamilia(
  { adultos: 4, ninos: 0 },
  [{ nombre: 'Carolina Leyva' }, { nombre: 'Adulto 2' }, { nombre: 'Adulto 4' }]
);

comprobar('el relleno no se llama igual que una fila que ya está',
  new Set(nombresDe(conNombresDelImportador)).size === conNombresDelImportador.length,
  'salió ' + nombresDe(conNombresDelImportador).join(' · '));
comprobar('y los nombres reales quedan intactos',
  conNombresDelImportador.slice(0, 3).map(p => p.nombre).join('|') ===
  'Carolina Leyva|Adulto 2|Adulto 4');
comprobar('son cuatro personas, las cuatro del cupo',
  conNombresDelImportador.length === 4, 'dio ' + conNombresDelImportador.length);

/* El caso de la persona fantasma: cinco filas cargadas, todas tipadas
   adulto, pero la familia contestó «4 adultos y 1 niño». Por tipo,
   faltaría un niño. En total no falta nadie. */
const yaEstanTodos = gentePorFamilia(
  { adultos: 4, ninos: 1 },
  [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }, { nombre: 'D' }, { nombre: 'E' }]
);
comprobar('con el cupo lleno no se inventa a nadie más',
  yaEstanTodos.length === 5,
  'dio ' + yaEstanTodos.length + ' — el sexto es un plato de más al banquete');

/* Y el caso normal tiene que seguir funcionando igual que siempre. */
const familiaSinCargar = gentePorFamilia({ adultos: 2, ninos: 1 }, []);
comprobar('una familia sin nadie cargado da sus lugares, en orden',
  nombresDe(familiaSinCargar).join('|') === 'Adulto 1|Adulto 2|Niño 1',
  'dio ' + nombresDe(familiaSinCargar).join('|'));

const mitadCargada = gentePorFamilia({ adultos: 3, ninos: 0 }, [{ nombre: 'Ana' }]);
comprobar('media familia cargada completa los lugares que faltan',
  nombresDe(mitadCargada).join('|') === 'Ana|Adulto 2|Adulto 3',
  'dio ' + nombresDe(mitadCargada).join('|'));

/* Los lugares sin nombre con su menú adentro NO se sacan: cuentan para la
   comida. Es lo que se arregló antes y no se puede perder. */
const conLugarSinNombre = gentePorFamilia(
  { adultos: 2, ninos: 0 },
  [{ nombre: 'Ana', menu: 'Res' }, { nombre: '', menu: 'Pollo' }]
);
comprobar('el lugar sin nombre se queda, con su plato',
  conLugarSinNombre.length === 2 && conLugarSinNombre[1].menu === 'Pollo',
  'sacarlo hace que el papel sume menos platos que sillas');

/* Más filas que lugares: se listan todas. Es una base sucia, y el papel
   tiene que decir la verdad — esconder gente es el error grave. */
const masFilasQueLugares = gentePorFamilia(
  { adultos: 5, ninos: 0 },
  Array.from({ length: 9 }, (_, i) => ({ nombre: 'Persona ' + (i + 1) }))
);
comprobar('si hay más filas que lugares se listan todas, no se esconde a nadie',
  masFilasQueLugares.length === 9,
  'dio ' + masFilasQueLugares.length + ' — el desfase se arregla en la base, no tapándolo');


/* ─── 7 · Mordidas: romper a propósito, en memoria ────────────────── */

console.log('\nMordidas (sobre copias en memoria, el disco no se toca)\n');

const muerde = (que, textoRoto, mide) => {
  let seEntero = false;
  try { seEntero = !mide(levantar(textoRoto)); }
  catch (e) { seEntero = true; }          // reventar también es enterarse
  comprobar('si ' + que + ', la prueba se entera', seEntero,
    'la comprobación pasaría en verde con el código roto');
};

/* La mordida que importa: que el colador deje pasar todo. */
muerde('el colador devuelve la lista tal cual',
  piezas.replace('if (vistas.has(clave)) return false;', 'if (false) return false;'),
  (fn) => fn(conLinkRegenerado).length === 2);

/* Que se olvide de normalizar el id: 7 y "7" volverían a ser dos. */
muerde('deja de normalizar el id a texto',
  piezas.replace('const clave = String(id);', 'const clave = id;'),
  (fn) => fn([{ id: 7 }, { id: '7' }]).length === 1);

/* Que esconda a las filas sin id, que es el error grave. */
muerde('descarta las filas sin identificador',
  piezas.replace(
    "if (id === undefined || id === null || id === '') return true;",
    "if (id === undefined || id === null || id === '') return false;"),
  (fn) => fn(sinIdentificar).length === 4);

/* Que reordene: la lista llega ya ordenada por el servidor. */
muerde('reordena la lista al colarla',
  piezas.replace('return filas.filter(fila => {',
                 'return filas.slice().reverse().filter(fila => {'),
  (fn) => fn(enOrden).map(f => f.id).join(',') === '3,1,2');

/* Y las dos del servidor, mordiendo el texto del PHP. */
const phpRoto = confirmaPhp.replace(
  /LEFT JOIN invitaciones inv\s+ON inv\.id = \(SELECT MAX\(otra\.id\) FROM invitaciones otra\s+WHERE otra\.confirmacion_id = confirmaciones\.id\)/,
  'LEFT JOIN invitaciones inv ON inv.confirmacion_id = confirmaciones.id');
comprobar('si el JOIN vuelve a ser el suelto, la prueba se entera',
  !joinAcotado.test(phpRoto) && joinIngenuo.test(phpRoto),
  'la mordida no llegó a aplicarse: la comprobación del JOIN no vale nada');

const statsRoto = estadisticas.replace('COUNT(DISTINCT c.id) AS n', 'COUNT(*) AS n');
comprobar('si «contestaron» vuelve a COUNT(*), la prueba se entera',
  !/COUNT\(DISTINCT c\.id\) AS n/.test(statsRoto));

/* Y las de la expansión por persona. */
const muerdeGente = (que, textoRoto, mide) => {
  let seEntero = false;
  try { seEntero = !mide(levantarGente(textoRoto)); }
  catch (e) { seEntero = true; }
  comprobar('si ' + que + ', la prueba se entera', seEntero,
    'la comprobación pasaría en verde con el código roto');
};

muerdeGente('el relleno deja de esquivar los nombres ocupados',
  exportar.replace(
    'while (nombresOcupados.has(puesto.toLowerCase()) && vueltas < 200) {',
    'while (false) {'),
  (fn) => {
    const r = fn({ adultos: 4, ninos: 0 },
      [{ nombre: 'Carolina Leyva' }, { nombre: 'Adulto 2' }, { nombre: 'Adulto 4' }]);
    return new Set(r.map(p => p.nombre)).size === r.length;
  });

muerdeGente('el hueco vuelve a medirse por tipo y no sobre el total',
  exportar.replace(
    'const faltanEnTotal = Math.max(0, lugares - cargados.length);',
    'const faltanEnTotal = Math.max(0, debenSerAdultosDeMas());'),
  (fn) => fn({ adultos: 4, ninos: 1 },
    [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }, { nombre: 'D' }, { nombre: 'E' }]
  ).length === 5);

muerdeGente('el relleno deja de anotarse como ocupado',
  exportar.replace('nombresOcupados.add(puesto.toLowerCase());', ''),
  (fn) => {
    /* Dos lugares vacíos seguidos, con «Adulto 2» ya ocupado por una fila
       real: sin anotar el primero, los dos rellenos pueden salir «Adulto 3». */
    const r = fn({ adultos: 4, ninos: 0 },
      [{ nombre: 'Adulto 2' }, { nombre: 'Adulto 3' }, { nombre: '' }, { nombre: '' }]);
    return new Set(r.map(p => p.nombre)).size === r.length;
  });

/* Y las de las otras puertas. */
/* split/join y no replace(): «FOR UPDATE» aparece dos veces —una en el
   SQL y otra en el comentario que lo explica—, y replace() con texto
   plano solo cambia la primera. La mordida tiene que sacar las dos o no
   estaría mordiendo nada. */
comprobar('si generar_link pierde el FOR UPDATE, la prueba se entera',
  !/FOR UPDATE/.test(invitacionesPhp.split('FOR UPDATE').join('')),
  'la comprobación del candado no vale nada');
comprobar('si un SELECT vuelve al LIMIT 1 sin orden, la prueba se entera',
  /WHERE confirmacion_id = :c LIMIT 1/.test(
    acompanantesPhp.split('WHERE confirmacion_id = :c ORDER BY id DESC LIMIT 1')
                   .join('WHERE confirmacion_id = :c LIMIT 1')));
comprobar('si el importador vuelve al nombre crudo, la prueba se entera',
  /WHERE nombre = :n LIMIT 1/.test(
    importarPhp.replace(/TRIM\(nombre\) = TRIM\(:n\)/, 'nombre = :n')));

muerdeGente('se le pone tope al cupo y esconde gente',
  exportar.replace('return cargados.concat(faltan).map(p => {',
                   'return cargados.slice(0, lugares).concat(faltan).map(p => {'),
  (fn) => fn({ adultos: 5, ninos: 0 },
    Array.from({ length: 9 }, (_, i) => ({ nombre: 'Persona ' + (i + 1) }))).length === 9);


/* ─── Final ───────────────────────────────────────────────────────── */

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + (fallos === 1 ? ' comprobación falló' : ' comprobaciones fallaron'));
  process.exit(1);
}
console.log('✓ una familia no puede aparecer dos veces, ni en la lista ni en el papel');
