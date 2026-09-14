/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · LOS HABITANTES DEL TERRARIO
   ══════════════════════════════════════════════════════════════════════

   Carlos: «durante 60 segundos al día esto es un terrario, una obra de
   arte digital y un altar para Ania».

   Un terrario tiene habitantes, y hasta esta ronda el ritual solo convocaba
   a las plantas. Acá se comprueba qué hace cada uno de los otros durante el
   minuto — y, sobre todo, que ninguno se entere de que hay un eclipse.

   LA REGLA QUE GOBIERNA TODO EL ARCHIVO
   Los módulos de la invitación NO pueden nombrar al eclipse. Reciben
   banderas genéricas —«algo las espantó», «el aire se detuvo», «la gravedad
   tira hacia adentro»— y hacen lo suyo. El eclipse las levanta; ellos no
   saben quién.
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

const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const fauna   = leer('codigo', '27-fauna-nocturna.js');
const motas   = leer('codigo', '18-motas-de-polvo.js');
const joyas   = leer('codigo', '17-joyas-colgantes.js');
const velas   = leer('codigo', '19-velas.js');
const eclipse = leer('codigo', '28-eclipse.js');

const eclipseCodigo = sinComentarios(eclipse);


/* ─── 1. NINGUNO SABE QUE HAY UN ECLIPSE ───────────────────────────── */

console.log('\nNinguno sabe por qué\n');

/* ⛔ ES LA REGLA DE FONDO, Y SE COMPRUEBA SOBRE EL CÓDIGO PELADO: los
 * comentarios SÍ pueden explicar de dónde viene la bandera —si no, nadie
 * entendería para qué existe— pero el código no puede depender de eso.
 *
 * Si un módulo de la invitación preguntara por `window.ECLIPSE`, el eclipse
 * dejaría de ser un momento del día para pasar a ser una dependencia: la
 * invitación no arrancaría igual sin él, y las otras 23:59 empezarían a
 * pagar algo. */
for (const [nombre, fuente] of [['la fauna', fauna], ['las motas', motas],
                                ['las joyas', joyas], ['las velas', velas]]) {
  comprobar(nombre + ' no nombran al eclipse en su código',
    !/eclipse/i.test(sinComentarios(fuente)),
    'el módulo tiene que recibir una bandera genérica, no preguntar por ' +
    'quién la levantó');
}


/* ─── 2. LAS LUCIÉRNAGAS HUYEN, Y NO AL REVÉS ──────────────────────── */

console.log('\nLas luciérnagas\n');

/* ⛔ LA INVERSIÓN QUE NADIE HABÍA VISTO.
 *
 * El alfa de una criatura se multiplica por `window.LuzDeLaHora.deNoche`,
 * que es la ÚNICA perilla de la hora que ese archivo lee. Y el eclipse
 * declara `deNoche: 1`. O sea que la oscuridad del minuto las hacía
 * brillar MÁS, justo cuando tendrían que estar huyendo: en Toluca el
 * eclipse cae 06:30, con `deNoche` en 0,26, así que el ritual las
 * multiplicaba casi por cuatro.
 *
 * Una luciérnaga no sale porque el cielo se tape un minuto. */
comprobar('el espanto puede apagarlas, aunque la hora diga que es de noche',
  /c\.alfa = c\.picoDeAlfa \* forma \* deNoche \* valor;/.test(sinComentarios(fauna)),
  'sin ese factor, `deNoche: 1` del eclipse las ENCIENDE en vez de ' +
  'espantarlas: era lo que pasaba');

comprobar('y el espanto es una bandera genérica, leída defensiva',
  /window\.EspantoDeLaFauna/.test(sinComentarios(fauna)) &&
  /typeof pedido === 'number'/.test(sinComentarios(fauna)),
  'quien la escribe puede no existir según el orden de carga');

/* ⚠️ EL DISPARO VA EN EL FLANCO DE SUBIDA. Si `espantarlasATodas()` se
   llamara en cada cuadro, ninguna criatura llegaría nunca al final de su
   sobresalto y volarían nerviosas para siempre. */
comprobar('y se las espanta UNA vez, no en cada cuadro',
  /if \(espanto > 0\.02 && espantoAnterior <= 0\.02\) espantarlasATodas\(\);/
    .test(sinComentarios(fauna)),
  'llamándolo en cada cuadro nunca terminan el sobresalto y vuelan ' +
  'nerviosas para siempre');

/* Carlos eligió que vuelvan «unas pocas, lentas, dudando». */
comprobar('y vuelven de a una, no en bloque',
  /demoraDelRegreso: numeroAlAzar/.test(fauna) &&
  /const suUmbral = 1 - c\.demoraDelRegreso;/.test(sinComentarios(fauna)),
  'sin una demora propia por criatura, al soltarse el espanto reaparecen ' +
  'todas en el mismo cuadro');

/* ⚠️ Y LA REGLA DE CARLOS SALE SOLA. «Las luciérnagas solo aparecen en la
   noche, como es lo natural»: al soltarse el espanto, `deNoche` vuelve a lo
   que diga la hora real de quien mira. No hay que escribirlo. */
comprobar('y el factor de la hora sigue mandando cuando vuelven',
  /const deNoche = window\.LuzDeLaHora \? window\.LuzDeLaHora\.deNoche : 0;/
    .test(sinComentarios(fauna)),
  'es lo que hace que en Toluca al amanecer casi no se las vea y donde ' +
  'sea de noche vuelvan brillando, sin una línea que lo diga');

comprobar('el eclipse las espanta con la penumbra',
  /espantarALaFauna\(limitar\(t \/ 2500, 0, 1\)\);/.test(eclipseCodigo),
  'se van mientras la luz se cae, no cuando ya está todo oscuro');

comprobar('y las deja volver antes de que termine el minuto',
  /if \(t < DURACION - EMPIEZAN_A_VOLVER\)/.test(eclipseCodigo),
  'para cuando la página vuelve a ser una invitación, ya tiene que haber ' +
  'alguna encendida');

/* ⛔ Y PASE LO QUE PASE. Si el ritual muriera por una excepción a los diez
   segundos, quedarían escondidas para el resto de la visita. */
comprobar('y vuelven aunque el ritual muera a mitad de camino',
  /function terminar\(completo\)[\s\S]{0,2000}?calmarALaFauna\(\);/
    .test(eclipseCodigo),
  'sin esto, una excepción las deja escondidas hasta que alguien recargue');

comprobar('y la calma es idempotente',
  /function calmarALaFauna\(\) \{\s*\n\s*if \(relojDeLaFauna\) return;/
    .test(eclipseCodigo),
  'reiniciarla haría que volvieran a esconderse justo cuando asomaban');


/* ─── 3. EL AIRE SE DETIENE ────────────────────────────────────────── */

console.log('\nLas motas de polvo\n');

comprobar('las motas honran la bandera de pausa',
  /registro && registro\.motas/.test(sinComentarios(motas)),
  'sin esto no hay forma de suspenderlas');

/* ⚠️ Y AL SOLTARSE NO SALTAN. Si al retomar se volviera al tiempo real,
   aparecerían donde habrían estado si nunca se hubieran detenido: un salto
   de tantos píxeles como haya durado la pausa. */
comprobar('y al soltarse retoman desde donde se quedaron',
  /desfaseDelAire \+= tSegundos - aireQuietoDesde;/.test(sinComentarios(motas)) &&
  /return tSegundos - desfaseDelAire;/.test(sinComentarios(motas)),
  'volver al tiempo real las teletransporta tantos píxeles como haya ' +
  'durado la pausa');

comprobar('el eclipse detiene el aire en los dos segundos de vacío',
  /registro\.motas = \(t >= TOTALIDAD && t < SHOCK\);/.test(eclipseCodigo),
  'es el mismo tramo en que las flores se congelan, la marea se detiene y ' +
  'la música calla');

comprobar('y el aire vuelve a correr aunque el ritual muera',
  /window\.PausaDeEscena\.motas = false;/.test(eclipseCodigo),
  'quedarían suspendidas para el resto de la visita');


/* ─── 4. LA GRAVEDAD CAMBIA DE DUEÑO ───────────────────────────────── */

console.log('\nLas joyas colgantes\n');

/* Una borla cuelga hacia abajo porque el resorte la devuelve al ángulo 0.
   Si el reposo deja de ser el 0, se queda tirando hacia adentro — no
   porque algo la empuje, sino porque eso es «abajo» para ella ahora. */
comprobar('el reposo de la borla deja de ser el cero',
  /\(-\(borla\.angulo - reposo\) \* RIGIDEZ_BORLA\)/.test(sinComentarios(joyas)),
  'empujarlas cuadro a cuadro sería otra cosa: esto es que cambió lo que ' +
  'para ellas significa «abajo»');

comprobar('y cada una sabe hacia qué lado está el centro',
  /borla\.haciaElCentro = borla\.pivote\.localX < centro \? 1/
    .test(sinComentarios(joyas)),
  'con un ángulo global las dos se irían para el mismo lado, y eso no es ' +
  'tirar hacia el relicario: es ladearse');

/* ⚠️ EL CENTRO SE CALCULA, NO SE SUPONE: con el promedio de los pivotes, no
   con la mitad del viewBox. Así no hay que saber en qué coordenadas está
   expresado el pivote ni dónde tiene el SVG su origen. */
comprobar('y el centro sale del promedio de los pivotes',
  /borlas\.reduce\(\(suma, b\) => suma \+ b\.pivote\.localX, 0\) \/ borlas\.length/
    .test(sinComentarios(joyas)),
  'la mitad del viewBox supone un origen que este archivo no controla');

comprobar('y no quedan clavadas contra su tope',
  /TOPE_BORLA \* 0\.75/.test(sinComentarios(joyas)),
  'una borla contra su límite no se lee como que tira: se lee como que ' +
  'está trabada');

comprobar('el eclipse la cambia con la secta y la suelta con el desmayo',
  /window\.GravedadHaciaElCentro =\s*\n?\s*limitar\(tramo\(t, PENUMBRA, UMBRA\), 0, 1\) \*/
    .test(eclipseCodigo) &&
  /Math\.max\(0, loQueLeQuedaDelGesto\(t, 0\)\);/.test(eclipseCodigo),
  'entra cuando el marco entero empieza a mirar al nombre y se va con ' +
  'todo lo demás');

comprobar('y vuelven a colgar hacia abajo al terminar',
  /window\.GravedadHaciaElCentro = 0;/.test(eclipseCodigo),
  'si no, quedan tirando hacia adentro el resto de la visita');


/* ─── 5. LAS VELAS SON LA ÚNICA LUZ QUE DESOBEDECE ─────────────────── */

console.log('\nLas velas\n');

/* No hacía falta tocarlas, y eso es el hallazgo: ya estaban del lado
   correcto. Lo que se comprueba es que sigan estándolo. */
comprobar('las velas crecen durante el minuto, no se apagan',
  /fuerzaDeVelas: 1\.18/.test(eclipse),
  'son lo único que justifica que abajo esté oscuro');

comprobar('y las llamas siguen titilando todo el minuto',
  !/llamas[\s\S]{0,80}?display = 'none'/.test(eclipseCodigo),
  'apagarlas dejaría la mitad de abajo sin una sola luz');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El terrario tiene habitantes, y ninguno sabe por qué se apagó la luz.\n');
