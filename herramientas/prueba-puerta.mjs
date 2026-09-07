/* La pantalla de la puerta: cómo se nombran las mesas y qué se muestra.
 *
 * POR QUÉ EXISTE
 * En la puerta se mira con gente esperando, de pie y con poca luz. Un
 * dato de más compite con los que hacen falta, y un dato mal escrito
 * —«Mesa Mesa 14»— se lee como que la app está rota justo delante del
 * invitado.
 *
 * Y el defecto de las mesas estaba en SEIS lugares a la vez, que es lo
 * que pasa cuando una regla de presentación se copia en cada pantalla
 * en vez de vivir en un sitio.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que +
              (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

/* ─── 1. El nombre de la mesa, ejecutado de verdad ───────────────── */

const piezas = readFileSync(raiz('admin', 'codigo', '06-piezas.js'), 'utf8');
const comoSeLlamaLaMesa = new Function(
  piezas + '\n return comoSeLlamaLaMesa;')();

console.log('\nCómo se nombra una mesa\n');

comprobar('un número suelto recibe el prefijo',
  comoSeLlamaLaMesa('14') === 'Mesa 14', comoSeLlamaLaMesa('14'));

comprobar('si ya dice «Mesa», NO se repite',
  comoSeLlamaLaMesa('Mesa 14') === 'Mesa 14', comoSeLlamaLaMesa('Mesa 14'));

comprobar('tampoco en minúscula',
  comoSeLlamaLaMesa('mesa 3') === 'mesa 3', comoSeLlamaLaMesa('mesa 3'));

comprobar('un nombre propio recibe el prefijo',
  comoSeLlamaLaMesa('Los primos') === 'Mesa Los primos',
  comoSeLlamaLaMesa('Los primos'));

/* «Mesada» empieza con las letras de «mesa» pero no es «mesa»: sin el
   \b del regex, una mesa llamada así se quedaría sin prefijo. */
comprobar('«Mesada» no se confunde con «Mesa»',
  comoSeLlamaLaMesa('Mesada') === 'Mesa Mesada', comoSeLlamaLaMesa('Mesada'));

comprobar('vacío devuelve vacío, no «Mesa »',
  comoSeLlamaLaMesa('') === '' && comoSeLlamaLaMesa(null) === '');

comprobar('los espacios de sobra no cuentan',
  comoSeLlamaLaMesa('  Mesa 7  ') === 'Mesa 7', comoSeLlamaLaMesa('  Mesa 7  '));

/* ─── 2. Que ninguna pantalla vuelva a poner el prefijo a mano ───── */

console.log('\nNadie arma el nombre por su cuenta\n');

const PANTALLAS = ['25-hoy.js', '27-buscador.js', '28-escaner.js', '30-vista-hoy.js'];

for (const archivo of PANTALLAS) {
  const codigo = readFileSync(raiz('admin', 'codigo', archivo), 'utf8');
  comprobar(archivo + ' usa el helper y no concatena',
    !/['"]Mesa ['"]\s*\+/.test(codigo),
    'volvería a dar «Mesa Mesa 14»');
}

/* ─── 3. Lo que la puerta muestra, y lo que no ───────────────────── */

console.log('\nLa tarjeta de la puerta\n');

const escaner = readFileSync(raiz('admin', 'codigo', '28-escaner.js'), 'utf8');

comprobar('no muestra los menús',
  !escaner.includes('resumen_menus'),
  'en la puerta no se avisa a la cocina: se deja pasar y se dice dónde sentarse');

comprobar('el código del pase se muestra UNA vez',
  (escaner.match(/seguro\(datos\.codigo\)/g) || []).length === 1,
  'estaba arriba y abajo a la vez');

comprobar('el código va junto al nombre del titular',
  /seguro\(datos\.nombre\)[\s\S]{0,400}seguro\(datos\.codigo\)/.test(escaner),
  'los dos identifican la invitación y se leen de un vistazo');

comprobar('el desglose por mesa se muestra aunque todos vayan juntos',
  !/porMesa\.size === 1 && porMesa\.has/.test(escaner),
  'el portero necesita A QUIÉN mandar a cuál, no solo el número');

comprobar('la mesa suelta no se repite cuando hay desglose',
  /!quienVaAQueMesa\(datos\)/.test(escaner),
  'repetiría el dato, y encima puede mentir si el grupo va separado');

/* ─── 4. Los nombres, como se dicen en voz alta ──────────────────── */

console.log('\nQuién va a cada mesa\n');

const juntarNombres = new Function(
  escaner.slice(escaner.indexOf('function juntarNombres')) +
  '\n return juntarNombres;')();

/* Esta lista se LEE EN VOZ ALTA en la puerta —«Carlos y Lucila, mesa
   14»— así que tiene que sonar a como se habla. */
const CASOS = [
  [['Carlos', 'Lucila'], 0, 'Carlos y Lucila'],
  [['Ania'], 0, 'Ania'],
  [['Carlos', 'Lucila', 'Ania'], 0, 'Carlos, Lucila y Ania'],
  [['Pedro'], 1, 'Pedro y 1 más'],
  [[], 2, '2 más'],
  [['Ana', 'Luis'], 3, 'Ana, Luis y 3 más'],
];

for (const [nombres, sinNombre, esperado] of CASOS) {
  const real = juntarNombres(nombres, sinNombre);
  comprobar(JSON.stringify(nombres) + ' + ' + sinNombre + ' → «' + esperado + '»',
    real === esperado, 'dio «' + real + '»');
}

comprobar('nunca queda una coma antes del último',
  !/, [^,]+$/.test(juntarNombres(['A', 'B'], 0)),
  'una coma final se lee como si faltara alguien');

/* ─── 5. Nadie puede desaparecer de la pantalla ──────────────────────
 *
 * `lugares` sale de la tabla de acompañantes —solo quien fue cargado con
 * nombre—, mientras que la cuenta de personas sale de lo que dijo el
 * invitado al confirmar. Los dos números NO tienen por qué coincidir:
 * comprobado con datos reales, hay una invitación de cuatro personas con
 * UN solo acompañante cargado.
 *
 * Si el desglose sustituyera a la mesa general en ese caso, tres
 * personas desaparecerían de la vista del portero. */

console.log('\nEl desglose no puede esconder a nadie\n');

const armar = new Function('seguro', 'comoSeLlamaLaMesa',
  escaner.slice(escaner.indexOf('function elDesgloseCubreATodos')) +
  '\n return elDesgloseCubreATodos;');

const cubre = armar(
  (v) => String(v == null ? '' : v),
  (n) => (/^mesa\b/i.test(String(n).trim()) ? String(n).trim() : 'Mesa ' + n));

const CASOS_DESGLOSE = [
  ['4 personas y 1 cargado (el caso real de PBE)',
   { adultos: 2, ninos: 2, mesa: 'Mesa 14', lugares: [{ nombre: 'Ana', mesa: 'Mesa 14' }] },
   false],
  ['todos cargados, en mesas distintas',
   { adultos: 2, ninos: 0, mesa: 'Mesa 14',
     lugares: [{ nombre: 'Ana', mesa: 'Mesa 14' }, { nombre: 'Luis', mesa: 'Mesa 7' }] },
   true],
  ['sin acompañantes cargados',
   { adultos: 1, ninos: 0, mesa: 'Mesa 3', lugares: [] },
   false],
  ['cargado pero sin mesa',
   { adultos: 2, ninos: 0, mesa: '', lugares: [{ nombre: 'Ana', mesa: '' }] },
   false],
];

for (const [que, datos, esperado] of CASOS_DESGLOSE) {
  comprobar(que + ' → ' + (esperado ? 'basta el desglose' : 'se muestra la mesa general'),
    cubre(datos) === esperado,
    'si tapa la mesa general sin cubrir a todos, esas personas no salen en pantalla');
}

comprobar('la mesa lleva dos puntos antes de los nombres',
  /comoSeLlamaLaMesa\(mesa\)\) \+ ':'/.test(escaner),
  'se lee «Mesa 14: Carlos y Lucila»');

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ La puerta muestra lo que hace falta, y las mesas se llaman bien.\n');
