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

comprobar('la mesa suelta solo sale si el desglose NO cubre a todos',
  /!elDesgloseCubreATodos\(datos\)/.test(escaner),
  'sin la guarda se repite el dato, y encima puede mentir si el grupo va separado');

/* Las dos preguntas tienen que salir del mismo cálculo. Cuando cada una
   armaba el suyo podían contestar cosas incompatibles: una decía que el
   desglose cubría a todos y la otra dibujaba a menos gente. */
/* Las llamadas, sin contar la declaración —«function repartoPorMesa(datos)»
   calza con el mismo patrón—. Tienen que ser las dos: una por pregunta. */
const llamadas = (escaner.match(/(?<!function )repartoPorMesa\(datos\)/g) || []).length;

comprobar('«quién va a qué mesa» y «cubre a todos» comparten el reparto',
  llamadas === 2, 'encontré ' + llamadas + ' llamada(s); dos cálculos separados ' +
  'vuelven a poder contradecirse');

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
  /* ⚡ CAMBIÓ DE RESPUESTA A PROPÓSITO (2026-09-07)
   *
   * Antes daba `false`: los tres sin cargar no entraban en el desglose,
   * así que se mostraba la mesa general suelta al lado para que no
   * desaparecieran. En la puerta eso se leía «Mesa 14» y debajo «Mesa
   * 14: Ana» — dos líneas casi iguales, con tres personas sin figurar
   * en ninguna.
   *
   * Ahora los que no tienen fila se reparten a la mesa del grupo y sale
   * una sola línea, «Mesa 14: Ana y 3 más», que sí los nombra. El
   * desglose cubre a todos, y por eso esto es `true`. */
  ['4 personas y 1 cargado (el caso real de PBE)',
   { adultos: 2, ninos: 2, mesa: 'Mesa 14', lugares: [{ nombre: 'Ana', mesa: 'Mesa 14' }] },
   true],
  ['todos cargados, en mesas distintas',
   { adultos: 2, ninos: 0, mesa: 'Mesa 14',
     lugares: [{ nombre: 'Ana', mesa: 'Mesa 14' }, { nombre: 'Luis', mesa: 'Mesa 7' }] },
   true],
  /* Sin ninguna fila de acompañante, pero CON mesa de grupo: la persona
     va con el grupo. Es el caso de casi toda la lista hoy. */
  ['sin acompañantes cargados, pero con mesa',
   { adultos: 1, ninos: 0, mesa: 'Mesa 3', lugares: [] },
   true],
  /* Sin mesa de grupo no hay dónde poner a nadie: el escáner tiene que
     seguir avisando que falta asignarla. Es el estado de Andy hoy. */
  ['cargado pero sin mesa en ningún lado',
   { adultos: 2, ninos: 0, mesa: '', lugares: [{ nombre: 'Ana', mesa: '' }] },
   false],
  ['sin fila y sin mesa: no se inventa un lugar',
   { adultos: 2, ninos: 0, mesa: '', lugares: [] },
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

/* ─── 6. Nadie se queda fuera del reparto ────────────────────────────
 *
 * Lo de arriba dice si el desglose cubre a todos. Esto comprueba QUÉ SE
 * LEE, que es lo que de verdad usa el portero. Se ejecuta la función y
 * se le sacan las etiquetas, igual que se ve en pantalla. */

console.log('\nLo que se lee en la puerta\n');

const armarDesglose = new Function('seguro', 'comoSeLlamaLaMesa',
  escaner.slice(escaner.indexOf('function elDesgloseCubreATodos')) +
  '\n return quienVaAQueMesa;');

const desglosar = armarDesglose(
  (v) => String(v == null ? '' : v),
  (n) => (/^mesa\b/i.test(String(n).trim()) ? String(n).trim() : 'Mesa ' + n));

const enPalabras = (html) =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const LECTURAS = [
  ['los dos juntos, con nombre',
   { adultos: 2, ninos: 0, mesa: 'Mesa 5',
     lugares: [{ nombre: 'Andrea Tellez', mesa: 'Mesa 5' },
               { nombre: 'Andy Rojas', mesa: 'Mesa 5' }] },
   'Mesa 5: Andrea Tellez y Andy Rojas'],

  ['en mesas distintas — el caso que preguntó Carlos',
   { adultos: 2, ninos: 0, mesa: 'Mesa 5',
     lugares: [{ nombre: 'Andrea Tellez', mesa: 'Mesa 5' },
               { nombre: 'Andy Rojas', mesa: 'Mesa 12' }] },
   'Mesa 5: Andrea Tellez Mesa 12: Andy Rojas'],

  /* Andy en producción, en cuanto se le asigne mesa: 2 personas y una
     sola cargada. Tiene que nombrar a las DOS. */
  ['con un solo nombre cargado, la otra persona igual figura',
   { adultos: 2, ninos: 0, mesa: 'Mesa 5',
     lugares: [{ nombre: 'Andrea Tellez', mesa: 'Mesa 5' }] },
   'Mesa 5: Andrea Tellez y 1 más'],

  ['una fila sin mesa propia va con el grupo, y por su nombre',
   { adultos: 2, ninos: 0, mesa: 'Mesa 5',
     lugares: [{ nombre: 'Andrea Tellez', mesa: '' }] },
   'Mesa 5: Andrea Tellez y 1 más'],

  ['sin ninguna fila, el grupo entero a su mesa',
   { adultos: 2, ninos: 1, mesa: 'Mesa 5', lugares: [] },
   'Mesa 5: 3 más'],
];

for (const [que, datos, esperado] of LECTURAS) {
  const real = enPalabras(desglosar(datos));
  comprobar(que + ' → «' + esperado + '»', real === esperado, 'dio «' + real + '»');
}

/* La suma tiene que cerrar SIEMPRE: si el desglose nombra a menos gente
   de la que hay, alguien se quedó sin lugar en la pantalla del portero
   y va a discutirlo en la puerta. */
const armarReparto = new Function('seguro', 'comoSeLlamaLaMesa',
  escaner.slice(escaner.indexOf('function elDesgloseCubreATodos')) +
  '\n return repartoPorMesa;');

const repartir = armarReparto(
  (v) => String(v == null ? '' : v),
  (n) => String(n));

for (const [que, datos] of LECTURAS) {
  const r = repartir(datos);
  comprobar('en «' + que + '» el reparto cierra',
    r.ubicadas === r.personas,
    r.ubicadas + ' ubicadas de ' + r.personas + ' personas');
}

/* ─── 7. Tocar el código para copiarlo ───────────────────────────────
 *
 * Los códigos se leen en pantalla y se pegan en WhatsApp o en el
 * buscador de la puerta. Escribirlos a mano es pelearse con O contra 0 y
 * 1 contra I, siete veces. Se pidió sin botón: se toca el código y ya. */

console.log('\nTocar el código lo copia\n');

const piezasJs = readFileSync(raiz('admin', 'codigo', '06-piezas.js'), 'utf8');
const estilos  = readFileSync(raiz('admin', 'estilos', '03-vistas.css'), 'utf8');

comprobar('el código se puede tocar en cualquier pantalla',
  /addEventListener\('click',[\s\S]{0,400}closest\('\.codigo-pase'\)/.test(piezasJs),
  'se engancha por delegación: la lista se repinta sola todo el tiempo');

/* ⚠️ La que sostiene todo. En la lista de Gente el código vive DENTRO
   del <button> que abre la ficha. Con un listener normal el clic burbujea
   del código al botón, así que cuando esto corriera la ficha ya se
   estaría abriendo. En captura corre ANTES y puede cortarle el paso. */
comprobar('escucha en fase de CAPTURA, no de burbuja',
  /closest\('\.codigo-pase'\)[\s\S]{0,700}\}, true\);/.test(piezasJs),
  'sin captura, tocar el código copia PERO además abre la ficha');

comprobar('le corta el paso al clic de la fila',
  /evento\.stopPropagation\(\);/.test(piezasJs));

comprobar('hay respaldo si no hay portapapeles',
  /execCommand\('copy'\)/.test(piezasJs),
  'sin https o en un navegador viejo, navigator.clipboard no existe');

comprobar('si no se pudo copiar, NO dice que sí',
  /No pude copiarlo/.test(piezasJs),
  'un «copiado» falso hace pegar el código anterior sin que nadie lo note');

/* Se recorta el bloque de la regla en vez de mirar con una ventana de
   caracteres: el comentario que explica el porqué es largo, y una
   ventana lo bastante grande para saltarlo dejaría de comprobar que el
   padding está DENTRO de esta regla. */
const empiezaLaRegla = estilos.indexOf('.codigo-pase {');
const reglaDelCodigo = estilos.slice(empiezaLaRegla,
                                     estilos.indexOf('}', empiezaLaRegla));

comprobar('el toque tiene dónde caer',
  /padding: 4px 6px;/.test(reglaDelCodigo) && /cursor: pointer;/.test(reglaDelCodigo),
  'doce píxeles de letra son un blanco imposible con el dedo');

comprobar('un toque largo selecciona el código entero',
  /user-select: all;/.test(estilos),
  'es el respaldo del respaldo: si el copiado falla, el dedo alcanza');

/* Si una pantalla deja de usar la clase, ahí el código deja de poder
   tocarse y no falla nada a la vista. */
for (const archivo of ['08-vista-invitados.js', '25-hoy.js', '28-escaner.js']) {
  comprobar(archivo + ' sigue marcando el código con .codigo-pase',
    /codigo-pase/.test(readFileSync(raiz('admin', 'codigo', archivo), 'utf8')),
    'sin la clase, ese código deja de copiarse al tocarlo');
}

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ La puerta muestra lo que hace falta, y las mesas se llaman bien.\n');
