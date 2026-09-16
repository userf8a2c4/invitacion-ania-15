/* Comprueba el renglón de resumen de la pantalla Gente · Invitados.
 *
 * POR QUÉ EXISTE
 * Este renglón dice cinco números arriba de la lista, y tres de ellos
 * —Adultos, Niños, Faltan— tienen que cerrar contra el encabezado que
 * está dos líneas más arriba («34 de 113 personas confirmadas») y contra
 * la tarjeta del banquete de hoy.php. Es exactamente la familia de bug
 * que ya mordió tres veces en este proyecto: dos cuentas de lo mismo,
 * hechas por separado, que un día empiezan a decir cosas distintas y
 * nadie se entera hasta que se le da un número mal al salón.
 *
 * ⚠️ ESTA PRUEBA EJECUTA EL CÓDIGO, NO LO LEE.
 * Varias pruebas de este proyecto comprueban que cierto texto aparezca
 * en el archivo, y eso pasa en verde con la función muerta. Acá se
 * levantan las funciones de verdad, se les pasan filas armadas a mano y
 * se mira el HTML que devuelven. Si alguien borra el cuerpo de
 * actualizarElResumenDeGente() y deja la firma, esta prueba falla.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const vista  = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');
const piezas = readFileSync(raiz('admin', 'codigo', '06-piezas.js'), 'utf8');
const css    = readFileSync(raiz('admin', 'estilos', '03-vistas.css'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/**
 * Saca una función del archivo, tal cual está escrita, para poder
 * ejecutarla. Corta desde `function nombre(` hasta la primera línea que
 * sea una llave sola, que es como cierran todas las de este proyecto.
 */
function extraer(texto, nombre) {
  const desde = texto.indexOf('function ' + nombre + '(');
  if (desde === -1) throw new Error('no existe la función ' + nombre + '()');
  const fin = texto.indexOf('\n}', desde);
  if (fin === -1) throw new Error('no se le encuentra el final a ' + nombre + '()');
  return texto.slice(desde, fin + 2);
}

/* ─── El banco de pruebas ─────────────────────────────────────────── */

/* Los únicos ayudantes de los que dependen las funciones que se prueban.
   Se escriben acá enteros y a la vista: si mañana el resumen necesita
   uno más, la prueba revienta al levantarlo en vez de pasar en verde
   midiendo otra cosa. */
const caja = { innerHTML: null };

const contexto = {
  console,
  buscar: (sel) => (sel === '#resumen-gente' ? caja : null),
  seguro: (x) => String(x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  paraBuscar: (s) => String(s).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''),
};

vm.createContext(contexto);

try {
  vm.runInContext([
    /* La regla de "ninguna" tiene que venir del archivo, no reescrita
       acá: si alguien le agrega "sin alergias", la prueba lo toma. */
    vista.slice(vista.indexOf('const MANERAS_DE_DECIR_NINGUNA'),
                vista.indexOf('\n', vista.indexOf('const MANERAS_DE_DECIR_NINGUNA')) + 1),
    extraer(piezas, 'comoEstaLaAsistencia'),
    /* textoDeLasAlergias() es de quien depende tieneAlergiaDeVerdad()
       desde el 2026-09-16: las alergias dejaron de leerse de la caja del
       grupo y pasaron a leerse de lo que escribió cada persona. */
    extraer(vista,  'textoDeLasAlergias'),
    extraer(vista,  'tieneAlergiaDeVerdad'),
    extraer(vista,  'leFaltaMesa'),
    extraer(vista,  'datoDelResumen'),
    extraer(vista,  'actualizarElResumenDeGente'),
  ].join('\n\n'), contexto);
} catch (error) {
  console.log('  FALLA no se pudieron levantar las funciones → ' + error.message);
  process.exit(1);
}

const correr = (filas) => {
  caja.innerHTML = null;
  contexto.actualizarElResumenDeGente(filas);
  return caja.innerHTML;
};

/** Saca la cifra de un rótulo del HTML que quedó. */
const cifraDe = (html, rotulo) => {
  const r = new RegExp(
    '__rotulo">' + rotulo + '</span>' +
    '<span class="resumen-gente__cifra[^"]*">(\\d+)<');
  const m = r.exec(html || '');
  return m ? Number(m[1]) : null;
};

const tonoDe = (html, rotulo) => {
  const r = new RegExp(
    '__rotulo">' + rotulo + '</span>' +
    '<span class="resumen-gente__cifra([^"]*)">');
  const m = r.exec(html || '');
  return m ? m[1].trim() : null;
};

/* Una familia que confirmó que viene. */
const confirmada = (adultos, ninos, extra = {}) => ({
  asiste: 1, adultos, ninos,
  invitacion_id: 7, invitacion_estado: 'confirmada',
  alergias: '', mesa: 'Mesa 1', ...extra,
});

/* Una familia con lugar apartado que todavía no contestó. */
const callada = (adultos, ninos, extra = {}) => ({
  asiste: 1, adultos, ninos,
  invitacion_id: 7, invitacion_estado: 'enviada',
  alergias: '', mesa: 'Mesa 1', ...extra,
});


/* ─── 1. Adultos + Niños cierran contra las apartadas ─────────────── */

console.log('\nLas cifras cierran contra el encabezado\n');

let html = correr([
  confirmada(2, 1),
  callada(3, 0),
  { asiste: 0, adultos: 4, ninos: 2, invitacion_id: 9,
    invitacion_estado: 'declinada', alergias: '', mesa: null },
]);

comprobar('Adultos suma solo a quien tiene lugar apartado',
  cifraDe(html, 'Adultos') === 5,
  'dio ' + cifraDe(html, 'Adultos') + ', se esperaban 5 (los 4 de quien no viene no cuentan)');
comprobar('Niños, lo mismo',
  cifraDe(html, 'Niños') === 1,
  'dio ' + cifraDe(html, 'Niños'));
comprobar('Adultos + Niños = las personas apartadas del encabezado',
  cifraDe(html, 'Adultos') + cifraDe(html, 'Niños') === 6);


/* ─── 2. Faltan = apartados − confirmados, igual que hoy.php ──────── */

console.log('\nFaltan, con la misma resta que la tarjeta del banquete\n');

comprobar('resta las personas que ya contestaron',
  cifraDe(html, 'Faltan') === 3,
  'dio ' + cifraDe(html, 'Faltan') + ', se esperaban 3 (6 apartadas − 3 confirmadas)');

html = correr([confirmada(2, 0), confirmada(1, 1)]);
comprobar('con todos contestados da cero',
  cifraDe(html, 'Faltan') === 0);
comprobar('y en cero se pinta de logrado, no de alarma',
  tonoDe(html, 'Faltan').includes('--logrado'),
  tonoDe(html, 'Faltan'));

html = correr([callada(2, 0)]);
comprobar('con gente sin contestar se pinta de pendiente',
  tonoDe(html, 'Faltan').includes('--pendiente'),
  tonoDe(html, 'Faltan'));

/* Alguien cargado a mano, sin invitación, cuenta como confirmado
   (comoEstaLaAsistencia lo resuelve así). No puede dar negativo. */
html = correr([{ asiste: 1, adultos: 2, ninos: 0, invitacion_id: null,
                 alergias: '', mesa: 'Mesa 2' }]);
comprobar('nunca da negativo',
  cifraDe(html, 'Faltan') === 0,
  'dio ' + cifraDe(html, 'Faltan'));


/* ─── 3. Alergias: las maneras de decir "ninguna" no cuentan ──────── */

console.log('\nAlergias\n');

html = correr([
  confirmada(1, 0, { alergias: 'maní' }),
  confirmada(1, 0, { alergias: 'Ninguna' }),
  confirmada(1, 0, { alergias: 'N/A' }),
  confirmada(1, 0, { alergias: '-' }),
  confirmada(1, 0, { alergias: '' }),
  confirmada(1, 0, { alergias: 'lactosa' }),
]);

comprobar('cuenta solo las alergias de verdad',
  cifraDe(html, 'Alergias') === 2,
  'dio ' + cifraDe(html, 'Alergias') + ' sobre 6 filas, se esperaban 2');


/* ─── 4. Sin mesa ─────────────────────────────────────────────────── */

console.log('\nSin mesa\n');

html = correr([
  confirmada(2, 0, { mesa: 'Mesa 4' }),
  confirmada(1, 0, { mesa: null }),
  confirmada(1, 0, { mesa: '' }),
]);

comprobar('cuenta a quien no tiene mesa asignada',
  cifraDe(html, 'Sin mesa') === 2,
  'dio ' + cifraDe(html, 'Sin mesa'));


/* ─── 5. Cuenta lo que se le pasa, no una global ──────────────────── */

console.log('\nCuenta sobre la lista que se está viendo\n');

const todas = [confirmada(2, 0), confirmada(3, 1), callada(4, 0)];
const soloUna = [todas[0]];

comprobar('con la lista entera da una cifra',
  cifraDe(correr(todas), 'Adultos') === 9);
comprobar('y con el subconjunto filtrado da la del subconjunto',
  cifraDe(correr(soloUna), 'Adultos') === 2,
  'si diera 9 estaría contando una global en vez del arreglo recibido');


/* ─── 6. Lista vacía: no deja cifras viejas colgadas ──────────────── */

console.log('\nLista vacía\n');

correr(todas);
comprobar('con la lista vacía el renglón se borra',
  correr([]) === '',
  'un resumen viejo sobre una lista vacía no se detecta mirando');


/* ─── 7. El estilo existe y no volvió a ser una rejilla ───────────── */

console.log('\nEl renglón sigue siendo un renglón\n');

comprobar('el estilo del resumen existe',
  css.includes('.resumen-gente {'));
comprobar('es una línea que se desliza, no una rejilla',
  /\.resumen-gente\s*\{[^}]*flex-wrap:\s*nowrap/.test(css) &&
  !/\.resumen-gente\s*\{[^}]*display:\s*grid/.test(css),
  'con grid vuelve a ocupar las cinco filas que sacamos el 14 de septiembre');
comprobar('la cifra no usa el morado, que acá significa «toca aquí»',
  /\.resumen-gente__cifra\s*\{[^}]*color:\s*var\(--texto\)/.test(css));


/* ─── Final ───────────────────────────────────────────────────────── */

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + (fallos === 1 ? ' comprobación falló' : ' comprobaciones fallaron'));
  process.exit(1);
}
console.log('✓ el resumen de Gente cierra con el encabezado y con hoy.php');
