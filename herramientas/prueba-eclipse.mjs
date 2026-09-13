/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-ECLIPSE.MJS · que el homenaje no le cueste nada a la invitación

   QUÉ CUIDA
   El eclipse tiene una prohibición por encima de todo lo demás, dicha por
   Carlos con todas las letras: no puede empeorar por ningún motivo la
   experiencia de la invitación. Esa es la primera mitad de este archivo.

   La segunda mitad cuida el SIGNIFICADO, que es igual de frágil y se
   pierde más callado: si el rojo aparece antes de la totalidad, si una
   rosa alcanza el nombre, si muere una segunda, o si el nombre se tiñe
   — en los cuatro casos el código sigue funcionando perfecto y la idea
   ya no está.

   CÓMO SE CORRE
       node herramientas/prueba-eclipse.mjs
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

const indice  = leer('index.html');
const eclipse = leer('codigo', '28-eclipse.js');

/**
 * El código sin los comentarios.
 *
 * Hace falta porque este archivo comprueba AUSENCIAS —«no hay ningún
 * rAF», «no se usa filter»— y estos archivos explican largamente por qué
 * NO usan esas cosas. Sin esto, la explicación de por qué algo no está
 * hace fallar la comprobación de que no está.
 *
 * Solo se quitan los bloques y las líneas que empiezan con `//`: un `//`
 * a mitad de línea puede ser una URL (`https://`, `data:image/svg+xml`)
 * y cortarla ahí rompería el texto que sí hay que mirar.
 */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const eclipseCodigo = sinComentarios(eclipse);

const vigia = sinComentarios(
  (indice.match(/\(function vigiaDelEclipse[\s\S]*?\n  \}\)\(\);/) || [''])[0]);

/* ─── 1. La prohibición: coste cero las otras 23:59 ────────────────── */

console.log('\nLo que cuesta cuando NO es la hora\n');

comprobar('el vigía existe', vigia.length > 200);

comprobar('28-eclipse.js NO está en la lista de la escena',
  !/28-eclipse/.test((indice.match(/id="scripts-de-la-escena">([\s\S]*?)<\/script>/) || ['', ''])[1]),
  'si entrara en la lista se bajaría en TODAS las visitas, que es justo lo prohibido');

comprobar('el vigía no abre ningún bucle de cuadro',
  !/requestAnimationFrame/.test(vigia),
  'un rAF permanente es trabajo en cada cuadro de cada visita');

comprobar('el vigía no usa setInterval',
  !/setInterval/.test(vigia),
  'un intervalo sigue corriendo aunque no haga falta; el setTimeout se re-arma solo');

comprobar('no se despierta más de una vez por minuto',
  /Math\.min\(falta - AVISO, 60000\)/.test(vigia),
  'sin el tope de 60000 podría quedar despertándose seguido');

comprobar('el archivo se pide solo cerca de la hora',
  /falta <= AVISO/.test(vigia));

/* ─── 2. Las guardas ───────────────────────────────────────────────── */

console.log('\nCuándo NO se dispara\n');

for (const [que, patron] of [
  ['con las animaciones apagadas',       /animaciones-off/],
  ['en una pestaña de fondo',            /document\.hidden/],
  ['con movimiento reducido pedido',     /prefers-reduced-motion/],
  ['con alguien escribiendo en un campo', /INPUT'.*TEXTAREA|TEXTAREA'/s],
  ['si la escena no está montada',       /portada__nombre/],
]) {
  comprobar('no se dispara ' + que, patron.test(vigia));
}

/* ─── 3. El ancla en el tiempo ─────────────────────────────────────── */

console.log('\nAnclado a las 12:30:00.000 UTC\n');

comprobar('la hora se calcula en UTC, no en hora local',
  /Date\.UTC\(/.test(vigia) && /getUTCFullYear/.test(vigia),
  'con la hora local cada país lo vería en un instante distinto');

comprobar('12:30 exactas',
  /HORA_UTC = 12, MINUTO_UTC = 30/.test(vigia));

comprobar('no hay fecha de caducidad',
  !/2026|getFullYear\(\) [<>=]/.test(vigia),
  'el homenaje está anclado al nacimiento de Ania, no a la fiesta');

/* El ensayo existe para poder mirarlo sin esperar a mañana, pero es una
   puerta y las puertas se dejan abiertas sin querer. En el sitio real no
   puede haber ninguna forma de disparar esto a pedido: el eclipse es un
   homenaje anclado a una hora, no un botón. */
comprobar('el ensayo está encerrado en PBE',
  /eclipse=ensayo/.test(vigia) && /esPbe &&/.test(vigia) &&
  /pbe\\\./.test(vigia),
  'sin la comprobación del host, cualquiera podría dispararlo en aniaxv.com');

/* ─── 4. La curva del eclipse, EJECUTADA ───────────────────────────── */

console.log('\nLa luz, ejecutando la función de verdad\n');

/* Se saca del archivo el bloque de constantes y las tres funciones de la
   curva, y se ejecutan. No es leer el código: es correrlo. */
const constantes = (eclipse.match(/var DURACION[\s\S]*?var MUERE_EN\s*=\s*\d+;/) || [''])[0];
const funciones  = (eclipse.match(
  /function suave\(x\)[\s\S]*?return \{ frio: frio, sangre: sangre, corona: corona \};\s*\}/) || [''])[0];

const curva = new Function(constantes + '\n' + funciones +
  '\n return { coloresEn: coloresEn, loQueYaSeFue: loQueYaSeFue, ' +
  'D: DURACION, PROFUNDA: PROFUNDA, ' +
  'TOTALIDAD: TOTALIDAD, SHOCK: SHOCK, FRENESI: FRENESI, MUERE_EN: MUERE_EN, ' +
  'PENUMBRA: PENUMBRA, UMBRA: UMBRA };')();

/* ⚡ LA FOTOGRAFÍA SE COMPRUEBA EN LUMINANCIA, NO EN OPACIDADES (2026-09-11)
 *
 * Mirando la secuencia entera por primera vez, Carlos dijo la frase que
 * ordena todo este archivo:
 *
 *     «esto no es un eclipse común, es un eclipse DE SANGRE, ese tono
 *      rojizo debe permitir VER el ritual. En lugar de un cadáver, una rosa.»
 *
 * Y tenía razón: con dos capas `multiply` al 0,88 y al 0,92 la escena
 * quedaba al 5 % de su luz. Una rosa terminaba en (7, 1, 1) sobre negro.
 * Las doscientas plantas cobrando conciencia —lo único que este minuto
 * tiene para contar— no se veían.
 *
 * Leer las opacidades no lo habría cazado: 0,88 y 0,92 son números que se
 * ven razonables uno al lado del otro. Lo que hay que comprobar es lo que
 * queda DESPUÉS de multiplicarlos, que es otra cosa. Estas funciones hacen
 * exactamente la cuenta que hace el navegador.
 */
/* ⚡ LA CUENTA CAMBIÓ CON LA CAPA (2026-09-11). Ya no hay dos `multiply`
   encima de la escena: hay UNA capa compuesta normal (`source-over`), que
   es otra fórmula. Y es otra fórmula CON OTRO SUELO: multiplicar por un
   color oscuro tiende a negro, componer sobre un color oscuro tiende a ESE
   color. Por eso el último tramo del degradado es un rojo muy oscuro y no
   negro — el marco, que es donde están las plantas, vive ahí. */

/* ⚡ LOS RADIOS DEL VELO YA NO SON PORCENTAJES: SON ANCLAJES MEDIDOS
 *   (2026-09-11)
 *
 * Antes cada tramo traía un `r` fijo en porcentaje de pantalla, y por eso
 * el óvalo del relicario quedaba perdonado: la caja del <h1> es la del
 * BLOQUE, no la de la palabra, y mide lo mismo que el relicario.
 *
 * Ahora cada tramo dice a qué se ancla y el código lo traduce a porcentaje
 * con dos cajas medidas en vivo. Para poder juzgarlo desde Node se
 * reconstruye la misma geometría con datos LEÍDOS, no inventados:
 *
 *   · `--ancho-broche` sale de estilos/04-portada.css
 *   · el viewport es el del ProDesk de Carlos, 2560x1277, que es la
 *     máquina contra la que se decide esta ronda
 *
 * Si el CSS cambia, estos números cambian con él. */
const VIEWPORT = { w: 2560, h: 1277 };

const ANCHO_DEL_BROCHE = (() => {
  const css = leer('estilos/04-portada.css');
  const m = css.match(/--ancho-broche:\s*min\(([\d.]+)vw,\s*([\d.]+)px,\s*calc\(var\([^)]*\)\s*\*\s*([\d.]+)\)\)/);
  if (!m) return 996;
  return Math.min(VIEWPORT.w * (+m[1]) / 100, +m[2], VIEWPORT.h * (+m[3]));
})();

/** Lo mismo que radioHastaLaEsquina() en el código, con el altar al 50/42 %. */
const HASTA_LA_ESQUINA = (() => {
  const ax = VIEWPORT.w * 0.50, ay = VIEWPORT.h * 0.42;
  const dx = Math.max(ax, VIEWPORT.w - ax);
  const dy = Math.max(ay, VIEWPORT.h - ay);
  return Math.sqrt(dx * dx + dy * dy);
})();

const RADIO_DEL_BROCHE = ANCHO_DEL_BROCHE / 2;


/* ⚡ EL VELO YA NO TIENE UN COLOR: TIENE DOS PALETAS Y UNA MEZCLA
 *   (2026-09-11)
 *
 * Carlos: «vi un rojo vivo allí como sombra, ¿puedes cambiar a un
 * borgoña? o sea, la penumbra del eclipse de sangre».
 *
 * El velo era UNA capa con un degradado ROJO fijo, y lo único que se
 * animaba era su opacidad: o sea que había rojo desde el segundo 1, más
 * tenue pero rojo. El documento base pide lo contrario —«la luz ambiental
 * se enfría y pierde saturación, PERO TODAVÍA NO HAY ROJO»— y el rojo es
 * «exclusivo del momento de máxima totalidad».
 *
 * ⚠️ Y ESTE ARCHIVO NO LO CAZÓ, por el mismo motivo de siempre: comprobaba
 * el COEFICIENTE `sangre` —que sí valía cero en la penumbra— y nunca el
 * COLOR que se pinta en pantalla. Otra vez una prueba mirando el modelo en
 * vez de mirar el resultado.
 *
 * Ahora se leen las DOS paletas y la mezcla se calcula como la calcula el
 * código: `sangre` normalizada. Así `comoSeVeEn(t, …)` devuelve el color
 * real de ese milisegundo, frío o borgoña según corresponda. */
const paleta = (nombre) => {
  const bloque = (eclipse.match(
    new RegExp('var ' + nombre + ' = \\[[\\s\\S]*?\\];')) || [''])[0];
  return [...bloque.matchAll(/'([\d\s,]+)'/g)]
    .map(m => m[1].split(',').map(v => +v.trim()));
};

const PALETA_FRIA    = paleta('PALETA_FRIA');
/* ⚡ LAS PALETAS AHORA SON DE DOS ENTRADAS (2026-09-11)
 *
 * El velo dejó de ser un radial de cinco paradas ancladas a cajas medidas
 * y pasó a ser DOS degradados con la geometría que el proyecto ya usa para
 * la luz del día (ver 22-luz-de-la-hora.js:450 y la nota de
 * FORMA_DE_LA_LUZ en 28-eclipse.js):
 *
 *   índice 0 — la luz que entra desde arriba, donde están el relicario,
 *              las rosas y los haces
 *   índice 1 — la oscuridad que sube desde abajo, donde los candelabros
 *
 * Carlos: «arriba, con el relicario y las rosas, donde se ven los rayos de
 * luz en el día: allí rojo. Abajo, donde están los candelabros: oscuro.» */
/* ⚡ EL ECLIPSE DEJÓ DE SER UNA CAPA: AHORA ES UNA HORA (2026-09-11)
 *
 * Carlos, después de cuatro intentos: «esto es un tinte, y es una mierda.
 * Estudia cómo se comporta la luz del día y de la noche en la web, es la
 * misma mierda, solo que rojo OSCURO». Y: «la única diferencia es que esto
 * dura un minuto».
 *
 * Todo lo que había acá —TRAMOS, COEFICIENTES, veloEn, comoSeVeEn,
 * alfaEnZona— simulaba la composición de una capa de color puesta encima
 * de la escena para poder juzgar su color. Esa capa ya no existe.
 *
 * La luz de esta página son CATORCE PERILLAS que mueven los haces, las
 * motas, el ambiente, la cúpula de la sala, la profundidad y las dos capas
 * que RESTAN luminancia. El eclipse es otra hora de ese sistema: la más
 * oscura y la única roja. Así que lo que hay que comprobar ya no es el
 * color de un rectángulo, sino que esa hora esté bien puesta.
 */

/** La hora del eclipse, leída de 28-eclipse.js. */
const HORA_ECLIPSE = (() => {
  const bloque = (eclipse.match(/var HORA_DEL_ECLIPSE = \{[\s\S]*?\n  \};/) || [''])[0];
  const valores = {};
  for (const m of bloque.matchAll(/(\w+):\s*\[([^\]]+)\]/g)) {
    valores[m[1]] = m[2].split(',').map(v => +v.trim());
  }
  for (const m of bloque.matchAll(/(\w+):\s*(-?[\d.]+),/g)) {
    valores[m[1]] = +m[2];
  }
  return valores;
})();

/** Las horas del reloj, leídas de 22-luz-de-la-hora.js. */
const HORAS_DEL_DIA = (() => {
  const luz = leer('codigo', '22-luz-de-la-hora.js');
  const salida = {};
  for (const m of luz.matchAll(/hora:\s*(\d+),([\s\S]*?)\n    \}/g)) {
    const h = {};
    for (const c of m[2].matchAll(/(\w+):\s*\[([^\]]+)\]/g)) {
      h[c[1]] = c[2].split(',').map(v => +v.trim());
    }
    for (const c of m[2].matchAll(/(\w+):\s*(-?[\d.]+),/g)) h[c[1]] = +c[2];
    salida[m[1]] = h;
  }
  return salida;
})();

/** La noche cerrada: la referencia contra la que se mide el eclipse. */
const NOCHE = HORAS_DEL_DIA['23'] || {};

/* La rosa del marco: el objeto que TIENE que verse moverse. */
const ROSA = [126, 27, 44];

comprobar('las fases van en orden',
  curva.PENUMBRA < curva.UMBRA && curva.UMBRA < curva.PROFUNDA &&
  curva.PROFUNDA < curva.TOTALIDAD && curva.TOTALIDAD < curva.SHOCK &&
  curva.SHOCK < curva.FRENESI && curva.FRENESI < curva.D,
  'el ORDEN entre las fases es la historia; moverlo rompe la causalidad');

comprobar('el shock dura exactamente 2 segundos',
  curva.SHOCK - curva.TOTALIDAD === 2000,
  'son ' + (curva.SHOCK - curva.TOTALIDAD) + ' ms');

comprobar('la rosa muere DENTRO de la totalidad',
  curva.MUERE_EN > curva.PROFUNDA && curva.MUERE_EN < curva.TOTALIDAD,
  'el rojo tiene que estar en su punto exacto mientras muere');

/* ⚠️ La comprobación que sostiene el sentido del rojo. */
let rojoAntesDeTiempo = 0;
for (let t = 0; t < curva.PROFUNDA; t += 100) {
  if (curva.coloresEn(t).sangre > 0) rojoAntesDeTiempo++;
}
comprobar('NO hay una gota de rojo antes de la totalidad',
  rojoAntesDeTiempo === 0,
  'apareció en ' + rojoAntesDeTiempo + ' momentos: el rojo dejaría de ser el momento sagrado');

comprobar('la oscuridad sí crece desde el principio',
  curva.coloresEn(4000).frio > 0 &&
  curva.coloresEn(20000).frio > curva.coloresEn(4000).frio);

comprobar('el rojo llega a su máximo en el shock',
  curva.coloresEn(43999).sangre > 0.65);

const finFrio   = curva.coloresEn(curva.D - 1).frio;
const finSangre = curva.coloresEn(curva.D - 1).sangre;
comprobar('al segundo 60 no queda ni oscuridad ni sangre',
  finFrio < 0.02 && finSangre < 0.02,
  'quedó frío=' + finFrio.toFixed(3) + ' sangre=' + finSangre.toFixed(3));


/* ─── 4b. SE TIENE QUE PODER VER EL RITUAL ──────────────────────────── */

console.log('\nUn eclipse DE SANGRE, no una habitación a oscuras\n');

/* ⚡ LA COMPROBACIÓN QUE HABRÍA CAZADO LOS 3-4 FPS (2026-09-11)
 *
 * Carlos midió la v277 en un i5-4590T con gráficos HD 4600 —la máquina que
 * eligió a propósito, «si esto se ve bien en esta cosa se verá perfecto
 * donde sea»— y le daba 3 o 4 FPS en la zona del relicario.
 *
 * Medido en la página abierta: las tres capas de color mezclaban 0,871 Mpx
 * por cuadro contra un viewport de 0,306. Dos pantallas y media leídas y
 * recombinadas en cada cuadro; en su monitor a 1920×1080, 5,9 Mpx.
 *
 * `mix-blend-mode` obliga al compositor a LEER DE VUELTA todo lo que quedó
 * abajo. En una placa con memoria propia se nota poco; en una integrada,
 * cada lectura viaja por el mismo bus que usa la CPU.
 *
 * Ninguna prueba lo cazaba porque todas miraban el SIGNIFICADO —que el
 * rojo apareciera a tiempo, que la luz volviera despacio— y ninguna miraba
 * lo que la escena le COBRA a la máquina. Ésta sí. */
comprobar('NINGUNA capa del eclipse mezcla',
  !/mix-blend-mode/.test(eclipseCodigo),
  'una capa que mezcla obliga a releer la pantalla entera en cada cuadro: ' +
  'medido, eran 0,871 Mpx por cuadro contra 0,306 de viewport');

comprobar('y es UNA sola capa, no cuatro',
  /var capaDelEclipse = document\.createElement\('div'\);/.test(eclipseCodigo) &&
  !/var capaFria/.test(eclipseCodigo) &&
  !/var capaSangre/.test(eclipseCodigo) &&
  !/var capaCorona/.test(eclipseCodigo),
  'cada capa a pantalla completa es una superficie más que componer');

/* ⚡ EL ECLIPSE ES LA HORA MÁS OSCURA Y LA ÚNICA ROJA (2026-09-11)
 *
 * Acá se exigía una elipse con tal forma y tal origen: la geometría de una
 * CAPA de color puesta encima. Esa capa ya no existe. Lo que se comprueba
 * ahora es que el eclipse esté bien puesto como hora del sistema de luz.
 *
 * La referencia es la noche cerrada (23h), que es lo más oscuro que la
 * página tenía hasta ahora. */

comprobar('el eclipse oscurece MÁS que la noche cerrada',
  HORA_ECLIPSE.oscurecidoFijo > NOCHE.oscurecidoFijo &&
  HORA_ECLIPSE.profundidadDeSombra > NOCHE.profundidadDeSombra,
  'eclipse ' + HORA_ECLIPSE.oscurecidoFijo + ' / ' + HORA_ECLIPSE.profundidadDeSombra +
  ' contra noche ' + NOCHE.oscurecidoFijo + ' / ' + NOCHE.profundidadDeSombra +
  ' — estas dos son las que RESTAN luz; si no suben, no hay oscuridad');

/* ⚠️ Y LA LUZ ROJA ENTRA POR LOS HACES, que es por donde entra toda la luz
   de esta página. Los haces van con `screen`: SUMAN luz. Que sean rojos es
   lo que hace que el rojo venga de una fuente fuera de cuadro y no de un
   filtro encima. Carlos: «¿de dónde viene la luz roja del eclipse? De la
   luna que no se ve en escena. ES EXACTAMENTE LA MISMA LÓGICA». */
for (const perilla of ['hazCentro', 'hazMedio', 'hazBorde']) {
  const c = HORA_ECLIPSE[perilla] || [0, 0, 0, 0];
  comprobar('los haces del eclipse son rojos · ' + perilla,
    c[0] > c[1] * 2 && c[2] >= c[1],
    'rgb(' + c.slice(0, 3).join(',') + ') — R tiene que doblar a G (rojo, no ' +
    'marrón) y B no puede quedar por debajo de G (vino, no ladrillo)');
}

comprobar('y el polvo que flota en ellos también',
  (HORA_ECLIPSE.motaCentro || [])[0] > (HORA_ECLIPSE.motaCentro || [0, 9])[1],
  'si las motas quedaran blancas, los rayos serían rojos con polvo de otra ' +
  'escena adentro');

comprobar('el ambiente y la sala son rojo OSCURO, no rojo vivo',
  HORA_ECLIPSE.tinteDeSala[0] > HORA_ECLIPSE.tinteDeSala[1] * 2 &&
  HORA_ECLIPSE.tinteDeSala[0] < 60 &&
  HORA_ECLIPSE.tinteDeSala[3] > NOCHE.tinteDeSala[3],
  'sala rgb(' + HORA_ECLIPSE.tinteDeSala.slice(0, 3).join(',') + ') @ ' +
  HORA_ECLIPSE.tinteDeSala[3] + ' — Carlos: «rojizo pero oscuro, no vivo»');

/* ⚠️ Y LAS VELAS CRECEN. Es el mismo recurso que usa la madrugada: cuando
   la ventana deja de mandar, los candelabros pasan a ser la única luz de
   la sala, y ese cambio de quién manda es lo que vuelve envolvente la
   escena. En el eclipse tiene que ser más marcado que de noche. */
comprobar('y los candelabros pasan a mandar',
  HORA_ECLIPSE.fuerzaDeVelas > NOCHE.fuerzaDeVelas,
  'eclipse ×' + HORA_ECLIPSE.fuerzaDeVelas + ' contra noche ×' + NOCHE.fuerzaDeVelas);

comprobar('el eclipse entra por la MISMA puerta que el reloj',
  /window\.LuzDeLaHora\.aplicarMomento/.test(eclipseCodigo) ||
  /luz\.aplicarMomento\(horaDeAntes, HORA_DEL_ECLIPSE/.test(eclipseCodigo),
  'si pintara por su cuenta, volvería a ser un tinte');

comprobar('y 22-luz-de-la-hora.js la abre',
  /aplicarMomento:\s*aplicarMomento,/.test(leer('codigo', '22-luz-de-la-hora.js')) &&
  /momentoDeAhora:\s*momentoDeAhora,/.test(leer('codigo', '22-luz-de-la-hora.js')),
  'sin la puerta, el eclipse no puede usar el sistema de luz');

comprobar('y arranca desde la luz que de verdad había',
  /horaDeAntes = luz\.momentoDeAhora\(\);/.test(eclipseCodigo),
  'si partiera de un valor inventado, el primer cuadro sería un salto');

/* ⚡ Y EL BORDE SE HUNDE DETRÁS DEL MARCO (2026-09-12)
 *
 * Carlos: «que cerca de los bordes (detrás) de los marcos la sombra sea
 * mucho más oscura, cercano a negra».
 *
 * ⚠️ ESTO SE HIZO DOS VECES, Y LA PRIMERA HABÍA QUE TIRARLA. Era una
 * `box-shadow: inset` animada sobre #marco-victoriano. Se veía bien y
 * costaba +133 ms POR ESCRITURA, medido en el navegador contra un control
 * de 66,7 ms; la variante con degradados de fondo sobre el mismo elemento,
 * +183 ms. Las dos obligan a repintar un elemento del tamaño del documento
 * y con hijos caros, cuarenta veces en el minuto.
 *
 * Lo que quedó no repinta nada: una capa que YA existía —la del velo
 * viejo, que estaba vacía— lleva el degradado estático y lo único que se
 * mueve es su opacidad. Medido: 0 ms.
 *
 * Estas comprobaciones existen para que nadie «mejore» esto volviendo a
 * la primera forma. */
{
  const marcoCss = leer('estilos', '02-marco-victoriano.css');
  const luzCodigo = leer('codigo', '22-luz-de-la-hora.js');

  comprobar('el eclipse hunde el borde casi a negro',
    HORA_ECLIPSE.sombraDelBorde >= 0.85,
    'vale ' + HORA_ECLIPSE.sombraDelBorde + ' — Carlos pidió «cercano a negra»');

  comprobar('y NINGUNA hora del reloj la enciende',
    Object.values(HORAS_DEL_DIA).every(h => h.sombraDelBorde === 0),
    'fuera del eclipse la página no puede cambiar ni un píxel');

  comprobar('las siete horas la declaran, incluidas las dos sueltas',
    (luzCodigo.match(/sombraDelBorde:/g) || []).length === 7,
    'si una hora no la trae, mezclarNumero devuelve NaN');

  /* ⚠️ Z-INDEX 59, Y EL NÚMERO ES EL PUNTO ENTERO. El marco victoriano
     está en 60. En 59 el negro queda DEBAJO del oro y de las rosas: las
     recorta contra la sombra en vez de taparlas. En su vida anterior esta
     capa iba en 2147483000 —encima de todo— y ahí un borde negro habría
     apagado justo lo único que este minuto tiene para contar. */
  comprobar('la sombra va DEBAJO del marco victoriano',
    /z-index:59;/.test(eclipseCodigo) && !/z-index:2147483000/.test(eclipseCodigo),
    'el marco está en 60; en 59 la sombra queda detrás, que es lo pedido');

  comprobar('y nace apagada y promovida',
    /opacity:0;/.test(eclipseCodigo) && /will-change:opacity/.test(eclipseCodigo),
    'sin will-change, cambiar la opacidad REPINTA el degradado: es ' +
    'exactamente el error de 159 ms de la v278');

  /* ⚠️ Y EL CENTRO TIENE QUE QUEDAR TRANSPARENTE DE LADO A LADO. El
     nombre de Ania no reacciona al eclipse: es la regla 1 de este archivo.
     Si el degradado cerrara en el medio, la sombra lo tocaría. */
  comprobar('el centro queda transparente: el nombre no se entera',
    /rgba\(0,0,0,0\) 17%/.test(eclipseCodigo) &&
    /rgba\(0,0,0,0\) 83%/.test(eclipseCodigo),
    'del 17 % al 83 % a lo ancho no puede haber nada');

  comprobar('la luz escribe OPACIDAD, no una variable CSS',
    /borde\.style\.opacity = mezclarNumero\('sombraDelBorde'\)/.test(luzCodigo),
    'una variable CSS obliga a recalcular estilo y repintar; la opacidad ' +
    'directa sobre una capa promovida la mueve el compositor gratis');

  comprobar('y el marco victoriano quedó sin sombra animada',
    !/--sombra-del-marco/.test(marcoCss) && !/--sombra-del-marco/.test(luzCodigo),
    'esa era la forma de +133 ms; volver a ella es el error que esto cuida');
}

/* ⚡ LOS CONTROLES DE SALTO VIVEN EN EL PANEL DEL ECLIPSE (2026-09-12)
 *
 * Primero los puse en el reproductor de música, y estaba mal. Carlos:
 * «el retroceder y avanzar no van en el reproductor de música, saca eso de
 * allí, esto va en el reproductor del eclipse, para controlar el momento y
 * verlo lentamente».
 *
 * Son dos cosas distintas: la música es una sola canción en bucle de
 * fondo, donde saltar diez segundos no significa nada; la secuencia del
 * eclipse dura un minuto exacto y hay momentos concretos que hay que poder
 * mirar. */
{
  const html = leer('index.html');
  const panel = leer('codigo', '29-ensayo-del-eclipse.js');
  const musica = leer('codigo', '10-reproductor-de-musica.js');
  const cssMusica = leer('estilos', '09-reproductor.css');

  /* ⚠️ SE MIRA EL MARCADO DEL REPRODUCTOR, NO index.html ENTERO, y la
     diferencia no es cosmética. herramientas/empaquetar.mjs pega el CSS
     compilado dentro de un <style> de index.html, así que el archivo
     contiene además una FOTO del CSS de la última vez que se empaquetó.
     Buscando en todo el archivo, esta prueba fallaba por una regla que ya
     no está en el fuente y que se va sola al reempaquetar: acusaba al
     código de algo que era del compilado. */
  const pildora = (html.match(/<aside id="reproductor"[\s\S]*?<\/aside>/) || [''])[0];

  comprobar('el reproductor de música no tiene botones de salto',
    pildora.length > 0 &&
    !/boton-retroceder|boton-avanzar|reproductor__saltar/.test(pildora) &&
    !/reproductor__saltar/.test(cssMusica) &&
    !/botonRetroceder|botonAvanzar/.test(musica),
    'una canción en bucle de fondo no se navega');

  comprobar('y el panel del eclipse sí',
    /id="ensayo-atras"/.test(panel) && /id="ensayo-adelante"/.test(panel) &&
    /id="ensayo-pausa"/.test(panel),
    'son los tres que pidió: retroceder, pausa y avanzar');

  comprobar('el eclipse sabe pausar, seguir y decir en qué estado está',
    /^  function pausar\(\)/m.test(eclipseCodigo) &&
    /^  function seguir\(\)/m.test(eclipseCodigo) &&
    /estaEnPausa: function/.test(eclipseCodigo) &&
    /pausar: pausar,/.test(eclipseCodigo) && /seguir: seguir,/.test(eclipseCodigo),
    'sin las tres, el botón no puede ni congelar ni saber qué decir; y ' +
    'pausar() tiene que ser del módulo, porque el bucle la llama');

  /* ⚠️ EL RELOJ DE LA SECUENCIA MIDE CONTRA EL RELOJ DE PARED. Si la
     pausa no corriera `arranque` al seguir, la secuencia saltaría hacia
     adelante todo lo que duró la pausa. */
  comprobar('al seguir, el reloj se corre lo que duró la pausa',
    /arranque = performance\.now\(\) - tCongelado \/ velocidad;/.test(eclipseCodigo),
    'sin esto, pausar treinta segundos adelantaría la secuencia treinta ' +
    'segundos al soltar');

  comprobar('y en pausa el reloj del panel se congela con la imagen',
    /return enPausa \? tCongelado :/.test(eclipseCodigo),
    'dondeVa() tenía que dejar de restar contra el reloj de pared');

  /* ⚠️ EL RELOJ DE SEGURIDAD SE CANCELA AL PAUSAR —si no, cortaría la
     pausa sola a los 61 s— Y SE REARMA AL SEGUIR. Si no se rearmara, una
     corrida pausada y soltada quedaría sin la red que garantiza que las
     capas se sacan pase lo que pase. */
  comprobar('la pausa apaga el reloj de seguridad y seguir lo rearma',
    /if \(relojDeSeguridad\) clearTimeout\(relojDeSeguridad\);/.test(eclipseCodigo) &&
    /\(DURACION - tCongelado\) \/ velocidad \+ 1000/.test(eclipseCodigo),
    'sin cancelarlo, la pausa se corta sola; sin rearmarlo, la corrida ' +
    'queda sin red');

  /* ⚠️ SALTAR TIENE QUE PASAR POR correr(), no reposicionar el reloj: la
     secuencia tiene pestillos de una sola vez —el scratch, la mártir, el
     destello— que al retroceder ya dispararon. */
  comprobar('saltar reinicia los pestillos, no solo mueve el reloj',
    /function saltar\(cuanto\)[\s\S]*?correr\(destino, estabaEnPausa\);/.test(panel),
    'reposicionar a secas dejaría el tramo mudo al retroceder');

  /* ⚡ LO QUE EL PANEL LLAMA TIENE QUE SER LLAMABLE (2026-09-12)
   *
   * Esta comprobación nació de un defecto real: escribí
   * `window.ECLIPSE.duracion()` y `duracion` es una PROPIEDAD, no una
   * función. La llamada lanzaba dentro del manejador del clic, así que el
   * botón se quedaba mudo —sin error visible, sin aviso, sin nada: solo no
   * saltaba—. Es el peor tipo de falla porque se parece a «no anda» y
   * manda a buscar la causa a cualquier lado.
   *
   * Acá se lee la forma REAL del objeto que expone 28-eclipse.js y se
   * contrasta contra cómo lo usa el panel. */
  {
    const api = (eclipseCodigo.match(/window\.ECLIPSE = \{[\s\S]*?\n    \};/) || [''])[0];
    /* Se clasifica por LINEA y no con un lookahead. Un `/: *(?!function)/`
       parece que alcanza y no alcanza: el `*` retrocede a cero espacios y
       entonces el lookahead se mide contra el espacio en vez de contra la
       palabra, asi que `correr: function ()` cae del lado de los valores.
       Fue exactamente el fallo de la primera version de esta prueba. */
    const funciones = new Set();
    const valores = new Set();
    for (const linea of api.split('\n')) {
      const m = linea.match(/^ {6}(\w+): *(.*)$/);
      if (!m) continue;
      if (/^function\b/.test(m[2])) { funciones.add(m[1]); continue; }
      /* `pausar: pausar,` es una REFERENCIA a una funcion del modulo, no un
         valor. Sin esta rama, el parser las tomaba por propiedades y
         acusaba al panel de llamarlas mal. */
      const ref = (m[2].match(/^(\w+),?$/) || [])[1];
      if (ref && new RegExp('function ' + ref + '\\(').test(eclipseCodigo)) {
        funciones.add(m[1]);
      } else {
        valores.add(m[1]);
      }
    }

    const llamadas = [...sinComentarios(panel).matchAll(/window\.ECLIPSE\.(\w+) *\(/g)]
      .map(m => m[1]);
    const malLlamadas = llamadas.filter(n => valores.has(n));
    const inexistentes = llamadas.filter(n => !funciones.has(n) && !valores.has(n));

    comprobar('se leyo la forma real de la API del eclipse',
      funciones.size > 0 && valores.size > 0,
      'si no se parsea nada, esta prueba no protege nada: ' +
      funciones.size + ' funciones, ' + valores.size + ' valores');

    comprobar('el panel no llama como funcion a lo que es un valor',
      malLlamadas.length === 0,
      'llama a ' + malLlamadas.join(', ') + ' con parentesis, y son ' +
      'propiedades: lanza dentro del manejador y el boton queda mudo');

    comprobar('y todo lo que llama existe en la API',
      inexistentes.length === 0,
      'llama a ' + inexistentes.join(', ') + ', que no esta en la API');
  }

  /* ⚡ Y SI ESTABA EN PAUSA, SIGUE EN PAUSA — SIN CONTAR CUADROS
   *   (2026-09-12)
   *
   * ⛔ EL PRIMER INTENTO LO HIZO DESDE EL PANEL: dos
   * requestAnimationFrame después del salto y entonces pausar. Es una
   * carrera perdida. Después de un salto, empezar() vuelve a sembrar la
   * escena y los primeros cuadros tardan 300-500 ms en calidad baja;
   * medido, retroceder conservaba la pausa y avanzar la perdía, con el
   * mismo código y en la misma corrida.
   *
   * La decisión vive ahora dentro del bucle del eclipse: se dibuja un
   * cuadro y en ese mismo cuadro se pausa. No depende de cuánto tarde
   * nada. */
  comprobar('saltar en pausa no cuenta cuadros a ojo',
    !/requestAnimationFrame\([\s\S]{0,120}?pausar\(\)/.test(panel),
    'contar cuadros desde el panel es la carrera que ya fallo una vez');

  /* ⚠️ EL CONGELADO ES SÍNCRONO, Y NO PUEDE VOLVER A SER UNA BANDERA.
   *
   * Fallaron dos versiones, las dos por dejarlo en manos de un cuadro
   * futuro:
   *
   *   1. Contando cuadros desde el panel (dos requestAnimationFrame).
   *      Tras un salto los primeros cuadros tardan 300-500 ms en calidad
   *      baja: caía tarde o no caía.
   *   2. Con una bandera que consumía el primer cuadro. Medido: el primer
   *      salto congelaba y los encadenados no, porque un cuadro ya pedido
   *      por la corrida anterior llega después de que arrancó la nueva y
   *      se come la bandera.
   *
   * Ahora empezar() dibuja el cuadro de entrada él mismo y se queda. */
  comprobar('el congelado lo dibuja empezar(), en la misma vuelta',
    /function empezar\(desfase, congelado\)/.test(eclipseCodigo) &&
    /if \(congelado\) \{[\s\S]{0,400}?unCuadro\(performance\.now\(\)/.test(eclipseCodigo) &&
    /if \(congelado\) \{[\s\S]{0,400}?enPausa = true;/.test(eclipseCodigo),
    'si vuelve a depender de un cuadro futuro, los saltos encadenados ' +
    'pierden la pausa');

  comprobar('y no queda ninguna bandera que otro cuadro pueda comerse',
    !/congelarTrasElPrimerCuadro/.test(eclipseCodigo) &&
    !/congelarAlSalir/.test(eclipseCodigo),
    'esa bandera es exactamente el mecanismo que fallo');

  comprobar('el congelado no pide mas cuadros',
    /if \(congelado\) \{[\s\S]{0,400}?pedidoDeCuadro = 0;/.test(eclipseCodigo),
    'sin cancelar el pedido, la secuencia sigue corriendo bajo la pausa');

  comprobar('y el panel se lo pide a correr()',
    /correr\(destino, estabaEnPausa\);/.test(panel) &&
    /window\.ECLIPSE\.correr\(desde, velocidadElegida, congelado\);/.test(panel),
    'sin el tercer argumento, el salto sale de la pausa');

}


/* ⚠️ Y EL DEGRADADO NO SE REPINTA POR CUADRO. Reescribir un `background`
   del tamaño de la pantalla sesenta veces por segundo sería cambiar un
   problema de compositor por uno de pintura. */
/* ⚡ LA CAPA TIENE QUE ESTAR PROMOVIDA, Y ESTO ES EL ARREGLO DE LOS
   159 ms (2026-09-11). Quitar `mix-blend-mode` eliminó la mezcla —bien—
   pero el blend mode era AVEMÁS lo que obligaba al navegador a darle a esta
   capa su propia textura. Sin él, cada cambio de opacidad REPINTA un
   degradado radial a pantalla completa. En el ProDesk de Carlos: 159,5 ms
   por cuadro, 6 fps. */
comprobar('el velo tiene textura propia',
  /will-change:opacity/.test(eclipseCodigo),
  'sin promover, cada cambio de opacidad repinta el degradado entero: ' +
  'medido en su máquina, 159,5 ms por cuadro');

/* ⚠️ Y CON BANDA MUERTA, NO CON REDONDEO. El redondeo al 1 % lo cruzaba
   el vaivén de la portada varias veces por segundo, y cada cruce reescribe
   el `background` de una capa a pantalla completa. */
/* ⚠️ Y NO SE APLICA POR CUADRO. Cada pasada escribe el fondo de 5 haces y
   32 motas más siete variables CSS: es barato una vez cada diez minutos
   —que es para lo que 22 lo diseñó— y carísimo sesenta veces por segundo.
   Cuarenta escalones en el minuto son dos tercios de segundo entre uno y
   otro, que a estas velocidades de cambio no se ve escalonado. */
comprobar('la luz se aplica por escalones, no por cuadro',
  /if \(escalon === ultimoEscalonDeLuz && !tocaElFondo\) return;/.test(eclipseCodigo),
  'aplicar las catorce perillas por cuadro es lo que costó 159 ms en la v278');

/* ⚡ Y LO CARO VA EN MENOS ESCALONES QUE LO BARATO (2026-09-12)
 *
 * Las catorce perillas no cuestan lo mismo. Medido con la escena quieta,
 * sobre un control de 66,7 ms por cuadro: las dos de #capa-fondo cuestan
 * +165 ms cada vez, la penumbra +17 y la opacidad del borde 0. La culpable
 * es la turbulencia SVG del papel antiguo, que se regenera entera cada vez
 * que esa capa se toca.
 *
 * Si alguien iguala los dos números «para simplificar», vuelven los
 * cuarenta repintados caros. */
comprobar('el fondo, que es lo caro, se escribe menos veces',
  /var ESCALONES_DEL_FONDO = (\d+);/.test(eclipseCodigo) &&
  Number((eclipseCodigo.match(/var ESCALONES_DEL_FONDO = (\d+);/) || [])[1]) <
  Number((eclipseCodigo.match(/var ESCALONES_DE_LUZ = (\d+);/) || [])[1]),
  'fondo ' + (eclipseCodigo.match(/var ESCALONES_DEL_FONDO = (\d+);/) || [])[1] +
  ' contra luz ' + (eclipseCodigo.match(/var ESCALONES_DE_LUZ = (\d+);/) || [])[1]);

comprobar('y 22-luz-de-la-hora.js sabe saltárselo',
  /function aplicarMomento\(desde, hasta, t, sinElFondo\)/.test(
    leer('codigo', '22-luz-de-la-hora.js')) &&
  /const fondo = sinElFondo \? null :/.test(leer('codigo', '22-luz-de-la-hora.js')),
  'sin el parámetro, el eclipse no puede pedir la luz sin el fondo');

comprobar('y son unas decenas de pasadas en todo el minuto',
  /var ESCALONES_DE_LUZ = 40;/.test(eclipseCodigo),
  'a 60 fps, una por cuadro serían 3600');

/* ⚡ Y NINGÚN ECLIPSE TERMINA DE GOLPE (2026-09-11)
 *
 * Carlos: «ningún eclipse en la historia de la Tierra ha terminado de
 * golpe con un corte de oscuridad a luz». Antes `terminar()` quitaba la
 * capa en UN cuadro, y eso era exactamente el corte.
 *
 * Ahora la curva vuelve a cero por su cuenta antes del final, así que
 * cuando el minuto termina ya no queda nada que quitar. */
{
  const cuerpo = (eclipse.match(/function progresoDelEclipse[\s\S]*?\n  \}/) || [''])[0];
  const suave = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fn = new Function('PROFUNDA', 'MUERE_EN', 'SHOCK', 'SALE_DEL_TODO', 'suave',
    cuerpo + '; return progresoDelEclipse;')(
      curva.PROFUNDA, curva.MUERE_EN, curva.SHOCK, 58000, suave);

  comprobar('la luz ya volvió del todo ANTES de que termine el minuto',
    fn(58000) === 0 && fn(curva.D) === 0,
    'en el 58 vale ' + fn(58000).toFixed(3) + ' y en el 60 ' + fn(curva.D).toFixed(3) +
    ' — si no llega a cero solo, el final es un corte');

  comprobar('y la totalidad sí está al máximo',
    fn(38500) === 1 && fn(43000) === 1,
    'el 38,5 y el 43 tienen que valer 1');

  comprobar('y la salida es gradual, no un escalón',
    [45000, 48000, 52000, 55000].every((t, i, a) =>
      i === 0 || fn(t) < fn(a[i - 1])),
    'la curva tiene que bajar en cada tramo de la salida');
}

/* ⚠️ EL ÚLTIMO TRAMO NO PUEDE SER NEGRO. El marco —las plantas, o sea lo
   único que el minuto tiene para contar— vive en los BORDES, que es justo
   donde un velo radial centrado en el nombre oscurece más. Un negro ahí
   apagaría el acontecimiento. Se comprueba ejecutando los tramos, no
   leyendo un color. */
/* ⚠️ ACÁ SE JUZGABA EL COLOR DE UNA CAPA POR FASE.

   Eran comprobaciones correctas para un velo: que en la penumbra fuera
   frío y en la totalidad borgoña. Pero el velo ya no existe — el eclipse
   es una hora del sistema de luz — así que el color no vive en dos
   paletas propias sino en las catorce perillas de HORA_DEL_ECLIPSE, y se
   comprueba más arriba, junto al resto de la hora.

   Lo que SÍ se conserva de aquella lección, y está en la sección de la
   hora: que el rojo tenga R al doble de G (rojo, no marrón) y B por
   encima de G (vino, no ladrillo). Esos dos números son los que Carlos
   rechazó cuando no se cumplían. */

/* ⚠️ ACÁ VIVÍAN LAS COMPROBACIONES DE LA GEOMETRÍA ANCLADA A CAJAS.

   Exigían que el primer tramo estuviera menos velado que el último, que
   los radios salieran de medir la palabra y el óvalo, y que el degradado
   no colapsara cuando esas cajas valían cero.

   Toda esa geometría se fue. El velo ya no es un radial centrado en el
   nombre: son DOS elipses de posición FIJA copiadas de la luz del día
   (ver FORMA_DE_LA_LUZ en 28-eclipse.js). Con posiciones fijas no hay
   cajas que medir ni nada que pueda colapsar, así que las comprobaciones
   dejaron de tener objeto. */
/* ⚡ ACÁ VIVÍA LA SECCIÓN DE LUMINANCIA DEL VELO (2026-09-11)
 *
 * Simulaba la composición de una capa de color sobre la escena para poder
 * juzgar cuánta luz perdía el oro y cuánto rojo quedaba. Era la
 * herramienta correcta para un velo, y cazó varios bugs reales.
 *
 * Pero el velo ya no existe. El eclipse es una hora del sistema de luz, y
 * su efecto no sale de componer un rectángulo: sale de mover los haces,
 * las motas, el ambiente, la cúpula y las dos capas que RESTAN luminancia.
 * Simular eso acá sería reescribir 22-luz-de-la-hora.js dentro de la
 * prueba, y entonces la prueba mediría su propia copia en vez del código
 * — que es exactamente el error que este archivo ya cometió una vez con
 * los coeficientes escritos a mano.
 *
 * Lo que sostiene esas garantías ahora está en la sección de la hora:
 * que el eclipse oscurezca MÁS que la noche cerrada (las dos perillas que
 * restan luz), que los haces sean rojos con R al doble de G y B por
 * encima de G, que la sala sea rojo oscuro y no vivo, y que los
 * candelabros pasen a mandar.
 *
 * Y lo que de verdad decide sigue siendo lo de siempre: Carlos mirándolo
 * en el ProDesk. */

/* ─── 5. Las tres reglas que no se negocian ────────────────────────── */

console.log('\nRegla 1 · lo divino es el TEXTO, no el relicario\n');

comprobar('el nombre se saca de su jaula con una copia',
  /copiaDelNombre = nombre\.cloneNode\(true\)/.test(eclipse),
  'subirle el z-index no sirve: .portada__contenido crea contexto de apilamiento');

comprobar('el original se esconde SIN sacarlo del diseño',
  /nombre\.style\.visibility = 'hidden'/.test(eclipse) &&
  !/nombre\.style\.display\s*=\s*'none'/.test(eclipse),
  'con display:none la portada se recoloca y el relicario cambia de tamaño');

comprobar('la copia se devuelve al terminar',
  /nombre\.style\.visibility = visibilidadOriginal/.test(eclipse));

/* Un filter sobre un ancestro del nombre lo tiñe aunque esté por encima,
   y no hay forma de escaparse desde el hijo. Es la manera silenciosa de
   romper la regla 1. */
comprobar('no se usa filter ni backdrop-filter en ningún lado',
  !/backdrop-filter|[^-]filter\s*:/.test(eclipseCodigo),
  'teñiría también al nombre y desde el hijo no hay forma de evitarlo');

comprobar('el relicario SÍ se tiñe: las capas cubren la pantalla entera',
  /position:fixed;inset:0/.test(eclipse),
  'el óvalo y el marco son mundanos y tienen que sufrir el eclipse');

console.log('\nRegla 2 · el radio que nadie cruza\n');

comprobar('el radio es un tope duro, no una intención',
  /if \(dist < altar\.radio\) dist = altar\.radio;/.test(eclipse),
  'sin el tope, una rosa puede llegar al nombre y el sacrificio pierde sentido');

comprobar('el radio se calcula sobre la caja real del nombre',
  /nombre\.getBoundingClientRect\(\)/.test(eclipse),
  'un número fijo se vería mal en un teléfono vertical');

comprobar('las rosas nacen fuera del radio',
  /base:\s*altar\.radio \+ 30/.test(eclipse));

comprobar('la única que lo cruza es la que se soltó',
  /if \(laQueMuere && muerte\.suelta && t >= MUERE_EN\)/.test(eclipse),
  'y ahora además tiene que haberse soltado de verdad: `muerte.suelta` lo ' +
  'pone arrancarALaMartir() al medir la flor del marco que se arranca');

console.log('\nRegla 3 · muere una sola\n');

comprobar('hay una sola elegida',
  /var laQueMuere = null;/.test(eclipse) &&
  (eclipse.match(/laQueMuere = mejor;/g) || []).length === 1);

comprobar('en el frenesí se ROMPEN, no mueren',
  /r\.rota = true/.test(eclipse) && !/r\.muerta/.test(eclipse),
  'si muriera una segunda, el sacrificio de la primera sería un trámite');

/* ─── 6. El final no se suaviza ────────────────────────────────────── */

console.log('\nEl frenazo\n');

/* Solo el CUERPO de terminar(). Recortando hasta el final del archivo se
   arrastraba la sección 17, que sí tiene un setTimeout —el de esperar a
   la hora— y hacía fallar la comprobación por algo que no es el final. */
const elFinal = (function () {
  /* ⚠️ SIN LOS PARÉNTESIS VACÍOS. terminar() pasó a recibir un argumento
     —`completo`, que decide si queda la evidencia— y buscar el texto
     `function terminar()` devolvía -1: las seis comprobaciones de esta
     sección pasaban a mirar el último carácter del archivo y fallaban
     todas juntas. Se busca el nombre, no la firma. */
  const desde = eclipseCodigo.indexOf('function terminar(');
  const hasta = eclipseCodigo.indexOf('\n  }', desde);
  return eclipseCodigo.slice(desde, hasta > 0 ? hasta : undefined);
})();

comprobar('terminar() no tiene transiciones ni fundidos',
  !/transition|setTimeout|requestAnimationFrame/.test(elFinal),
  'un final gradual se entiende, y entender es olvidar: tiene que ser un empujón');

comprobar('y está dicho por qué, para que nadie lo suavice después',
  /se ve brusco a propósito/i.test(eclipse));

/* ─── 7. Que todo vuelva ───────────────────────────────────────────── */

console.log('\nAl segundo 60 no queda rastro\n');

for (const [toma, devuelve] of [
  ['tomarLasFloresReales',      'devolverLasFloresReales'],
  ['apagarLosPetalosDeSiempre', 'devolverLosPetalosDeSiempre'],
  ['coronarElNombre',           'devolverElNombre'],
]) {
  comprobar(toma + '() tiene su ' + devuelve + '()',
    new RegExp('function ' + devuelve).test(eclipse) &&
    new RegExp(devuelve + '\\(\\);').test(elFinal),
    'lo que se toca durante el minuto tiene que volver a como estaba');
}

comprobar('las capas se sacan del documento',
  /removeChild\(c\)/.test(elFinal));

comprobar('el bucle se corta',
  /cancelAnimationFrame/.test(elFinal),
  'un rAF que sigue después del eclipse es exactamente lo prohibido');

comprobar('el listener de resize se quita',
  /removeEventListener\('resize'/.test(elFinal));

/* ⚠️ LAS DOS REDES DE SEGURIDAD.
   Sin ellas, un error a mitad del minuto —o una pestaña que se va al
   fondo y no vuelve— deja las capas de oscuridad y sangre encima de la
   invitación PARA SIEMPRE. El invitado se queda con la página tapada de
   rojo hasta que se le ocurra recargar. Un homenaje que puede romper la
   invitación no vale la pena. */
comprobar('si el bucle revienta, se limpia todo',
  /try \{[\s\S]{0,120}unCuadro\(ahora, t\);[\s\S]{0,120}catch[\s\S]{0,60}terminar\(\);/
    .test(eclipseCodigo),
  'sin el try, la excepción corta el rAF y terminar() no corre nunca');

/* ⚠️ SE COMPRUEBA LO QUE EL RELOJ HACE, NO CÓMO ESTÁ ESCRITO (2026-09-10).
   La versión anterior pedía el texto exacto
   `setTimeout(function () { if (vivo) terminar(); }, DURACION + 1000)`.
   Al guardar el reloj en una variable —para poder cancelarlo entre corridas
   del panel de ensayo— y al dividir el plazo por la velocidad, la
   comprobación falló con la red de seguridad intacta y hasta mejorada.
   Una prueba que se rompe cuando el código mejora enseña a ignorarla. */
comprobar('hay un reloj que termina aunque no se dibuje ni un cuadro',
  /setTimeout\([\s\S]{0,80}if \(vivo\) terminar\(\);[\s\S]{0,60}DURACION/
    .test(eclipseCodigo),
  'requestAnimationFrame se congela en una pestaña de fondo; esto no');

/* Y que el reloj se cancele al terminar: si cada corrida deja el suyo
   andando, el de la corrida vieja corta la nueva por la mitad. */
comprobar('y ese reloj se cancela al terminar',
  /clearTimeout\(relojDeSeguridad\)/.test(eclipseCodigo),
  'sin esto, repetir la secuencia la corta a destiempo');

/* ─── 8. La música tiene que sobrevivir ────────────────────────────── */

console.log('\nLa música, después\n');

comprobar('los filtros se dejan neutros y NO se desconecta el grafo',
  /function soltarElSonido[\s\S]*?frequency\.value = 20000/.test(eclipse) &&
  !/\.disconnect\(/.test(eclipse),
  'createMediaElementSource solo se puede llamar una vez: desconectar deja la canción muda para siempre');

comprobar('no se toca audio.volume, que es del reproductor',
  !/audio\.volume\s*=/.test(eclipse),
  '10-reproductor-de-musica.js manda ahí y se aplica antes del grafo');

comprobar('sin AudioContext el eclipse sigue igual',
  /if \(!Contexto\) return;/.test(eclipse));

/* ─── 9. Los dos archivos que no se pueden tocar ───────────────────── */

console.log('\nLos módulos cerrados siguen cerrados\n');

for (const archivo of ['06-petalos-con-fisica.js', '07-marco-y-enredaderas.js',
                       '10-reproductor-de-musica.js']) {
  const texto = leer('codigo', archivo);
  comprobar(archivo + ' no sabe que el eclipse existe',
    !/eclipse/i.test(texto),
    'el eclipse actúa DESDE AFUERA; tocar estos archivos afecta a las otras 23:59');
}

/* ⚡ LOS TRES LIENZOS AHORA SE PUEDEN PAUSAR, Y ESO NO ES ACOPLARSE
 *   (2026-09-11)
 *
 * El eclipse ponía el lienzo de pétalos en `opacity: 0` y lo dejaba
 * pintándose sesenta veces por segundo, invisible, el minuto entero: 0,817
 * Mpx por cuadro tirados en el monitor de Carlos. Lo mismo `#lienzo-de-luz`
 * con los arrays ya vaciados.
 *
 * La bandera `pausado` es GENÉRICA: dice «no pintes», no dice «hay un
 * eclipse». Cualquiera puede levantarla y ninguno de los tres archivos
 * nombra al eclipse. Es la misma disciplina que ya se usaba con
 * `LienzoDeLuz.haces/motas/fauna`. */
/* ⚠️ SE JUZGA EL CÓDIGO, NO LOS COMENTARIOS. Los comentarios SÍ nombran al
   eclipse —y tienen que hacerlo: explican por qué existe la bandera y de
   dónde salió el número—. Lo que no puede pasar es que el CÓDIGO de estos
   archivos dependa de que haya un eclipse. Por eso `sinComentarios`: es la
   misma razón por la que existe ese ayudante. */
for (const archivo of ['24-lienzo-de-petalos.js', '23-lienzo-de-luz.js',
                       '19-velas.js']) {
  const texto = leer('codigo', archivo);
  const codigo = sinComentarios(texto);
  comprobar(archivo + ' se puede pausar sin saber quien lo pausa',
    /pausado/.test(codigo) && !/eclipse/i.test(codigo),
    'la bandera dice «no pintes», no «hay un eclipse»');

  /* ⚡ SORDA HASTA ACÁ. Bastaba con que la palabra `pausado` apareciera en
     el archivo —y aparece en el objeto público— para pasar. Se podía
     cambiar el guard por `if (false)` y el lienzo seguía pintando el
     minuto entero con la prueba en verde. Ahora se exige que el guard
     MIRE la bandera. */
  comprobar('y su guard mira la bandera de verdad',
    /if\s*\([^)]*pausado[^)]*\)/i.test(codigo) ||
    /pausado\(\)/i.test(codigo),
    'sin un `if` que la lea, la bandera es decorativa');
}

comprobar('y el eclipse los pausa a los tres, y los devuelve',
  /LienzoDePetalos\.pausado = \(t >= 1000\)/.test(eclipseCodigo) &&
  /LienzoDeLuz\.pausado = \(t >= 26000 && t < 52000\)/.test(eclipseCodigo) &&
  /EstadoDelLienzoDeVelas\.pausado = \(t >= 26000 && t < 52000\)/.test(eclipseCodigo) &&
  /function soltarLosLienzos/.test(eclipseCodigo),
  'una pausa que no se suelta deja la pagina sin luz hasta que alguien recargue');

comprobar('y se sueltan ANTES de cualquier guard, por si el eclipse revienta',
  /soltarLosLienzos\(\);\s*\n\s*if \(!mundo\) return;/.test(eclipseCodigo),
  'si `mundo` nunca se capturo, una pausa puesta se quedaria puesta para siempre');

/* ⚡ ESTA COMPROBACIÓN CAMBIÓ DE SENTIDO (2026-09-10)
   Pedía `var CUANTAS = esAlta ? 220`, o sea que la calidad decidiera
   cuántas rosas SUELTAS tenía la marea. Esa marea se apagó: 220 cabezas
   de rosa sin tallo flotando alrededor del nombre no comunicaban nada, y
   lo que la escena cuenta —las enredaderas del marco cobrando conciencia
   y estirando hacia el nombre— ahora lo hacen las plantas que ya están
   ahí. Queda una sola rosa suelta: la que se suelta y muere sobre el
   nombre. Lo que se protege ahora es eso. */
comprobar('no queda NINGUNA rosa suelta flotando',
  /var CUANTAS = 0;/.test(eclipseCodigo),
  'una rosa sin tallo flotando no es una planta deseando algo; la última ' +
  'que quedaba era la que se sacrificaba, y ahora ésa es una flor del marco');
comprobar('y la que muere se elige entre las flores REALES',
  /laQueMuere = mejor;/.test(eclipseCodigo) &&
  /cerca\.sort\(function \(a, b\) \{ return a\.distancia - b\.distancia; \}\);/
    .test(eclipseCodigo),
  'si se elige de la marea, se sacrifica algo que nunca estuvo sujeto a nada');
/* ⚡ Y LA MAREA TAMPOCO SE RECORTA (2026-09-11)
 *
 * Acá había `if (promedio > 34 && marea.length > 40) marea.length *= 0.82`.
 * La marea son ROSAS, y la decisión de Carlos para esta ronda es explícita:
 * la escalera cede suavidad, nunca reparto. Nadie desaparece de la escena.
 * Lo que cede es cuántos píxeles hay detrás, no cuántas cosas hay. */
comprobar('la marea no se recorta: son rosas, no lastre',
  !/marea\.length = Math\.floor/.test(eclipse),
  'quitar rosas para que entre el cuadro es quitar la obra para que entre ' +
  'el telón');


/* ─── 16. Las plantas del marco son las protagonistas ──────────────── */

console.log('\nLa histeria de las enredaderas\n');

comprobar('las flores del marco ya no dependen de la calidad alta',
  !/function tomarLasFloresReales\(\) \{\s*if \(!esAlta\) return;/.test(eclipseCodigo),
  'cuando eran un adorno se podían saltear; ahora son la escena');

comprobar('cada flor sabe hacia dónde queda el nombre',
  /haciaElNombre/.test(eclipseCodigo) && /Math\.atan2\(altar\.y - cy, altar\.x - cx\)/.test(eclipseCodigo),
  'sin esto no pueden estirar hacia el altar, solo temblar en el lugar');

comprobar('el giro toma el camino corto',
  /while \(giro > 180\) giro -= 360;/.test(eclipseCodigo),
  'sin normalizar, una flor a la izquierda daría la vuelta entera');

comprobar('la conciencia se propaga desde el nombre hacia afuera',
  /f\.distancia \/ lejaniaMaxima/.test(eclipseCodigo),
  'si despiertan todas juntas parece un interruptor, no una noticia corriendo');

comprobar('el deseo crece en vez de encenderse',
  /var fervor =/.test(eclipseCodigo) && /despierta \* tramo\(/.test(eclipseCodigo));

comprobar('hay un tope de inclinación',
  /var tope = TOPE_DE_INCLINACION \* topeExtra;/.test(eclipseCodigo) &&
  /var topeExtra = 1 \+ esfuerzo \* 0\.45;/.test(eclipseCodigo) &&
  /if \(inclina >  tope\) inclina =  tope;/.test(eclipseCodigo),
  'más de eso deja de leerse como estirar y parece una flor rota');

/* ⚡ Y EN EL FRENESÍ SE PASAN TODAS, CADA VEZ MÁS (2026-09-11)
 *
 * Carlos: «cada planta ha entendido que la forma de rozar lo divino es
 * literalmente dando su vida, suicidándose, arrancando su propio tallo».
 * Fuera del frenesí el único que pasa el tope es el de la mártir; dentro,
 * lo pasan todas, y cada intento llega más lejos que el anterior. */
comprobar('y en el frenesí lo pasan todas, cada vez más lejos',
  /var topeDelTiron = 1 \+ tiron\.empuje \* \(0\.2 \+ tiron\.u \* 0\.7\);/
    .test(eclipseCodigo),
  'si el tope no cediera, el frenesí sería el mismo gesto más rápido');

/* ⚠️ Y LO PASA UNA SOLA, A PROPÓSITO. `esfuerzo` solo es distinto de cero
   para la mártir (`f.martir ? ... : 0`), del segundo 35 al 36,5: parece
   rota porque SE ESTÁ rompiendo. Si el esfuerzo fuera de todas, el tope
   dejaría de ser un tope y la escena entera se vería quebrada. */
comprobar('y solo la mártir lo pasa',
  /var esfuerzo = f\.martir \? tramo\(t, PROFUNDA, MUERE_EN\) : 0;/
    .test(eclipseCodigo),
  'el tope roto tiene que ser el aviso de UNA, no el estado de doscientas');

/* ⚡ EL TOPE DEJÓ DE SER UN NÚMERO FIJO (2026-09-10). Una cabeza de 20 px
   inclinada 52° se lee como un tic; una de 72 px, como una reverencia. El
   tope escala con el tamaño de la flor para que el GESTO sea el mismo en
   un teléfono y en un monitor. */
comprobar('y ese tope se calcula con el tamaño de la flor',
  /TOPE_DE_INCLINACION = limitar\(52 \* \(44 \/ mediana\)/.test(eclipseCodigo),
  'el mismo ángulo se lee distinto en una flor de 20 px que en una de 72');

comprobar('el temblor crece con el fervor',
  /fervor \* fervor \* 9/.test(eclipseCodigo));

comprobar('en el shock contienen el aliento',
  /enShock \? 0 : fervor \* fervor/.test(eclipseCodigo),
  'los dos segundos de vacío valen para la marea y para las plantas');

comprobar('la flor que no despertó queda como la dejó 07',
  /if \(f\.tocada\) \{ f\.nodo\.style\.transform = f\.antes; f\.tocada = false; \}/
    .test(eclipseCodigo),
  'una flor dócil tiene que verse dócil, no congelada a medio gesto');


/* ─── 10. Que la calidad alta LLEGUE A USARSE ──────────────────────────

   ⚠️ LA COMPROBACIÓN DE ARRIBA MIRA QUE EL 220 ESTÉ ESCRITO. NO MIRA QUE
   SE USE, y durante meses no se usó.

   `esAlta` decía:
       String(calidad()).toLowerCase().indexOf('alta') !== -1
   y `nivelDeCalidad()` devuelve un NÚMERO (CALIDAD_GRAFICA.ALTA === 0).
   `String(0)` no contiene "alta", así que `esAlta` era falso en todos los
   equipos: 130 rosas en vez de 220, 40 pétalos en vez de 90, y las flores
   del marco quietas. El homenaje nunca se vio como fue diseñado.

   Acá la expresión se EJECUTA con los tres niveles. Leerla no alcanza —
   leerla es exactamente lo que no lo cazó. */

console.log('\nLa calidad alta, ejecutada\n');

const lineaDeEsAlta = (eclipseCodigo.match(/var esAlta =[\s\S]*?;/) || [''])[0];
comprobar('se encontró la expresión de esAlta', lineaDeEsAlta.length > 20);

if (lineaDeEsAlta) {
  const correrEsAlta = (nivel) => new Function(
    'const CALIDAD_GRAFICA = { ALTA: 0, MEDIA: 1, BAJA: 2 };' +
    'const calidad = () => ' + nivel + ';' +
    lineaDeEsAlta + '\nreturn esAlta;'
  )();

  comprobar('en calidad ALTA da verdadero', correrEsAlta(0) === true,
    'esto es lo que estaba roto: daba falso siempre');
  comprobar('en calidad MEDIA da falso', correrEsAlta(1) === false);
  comprobar('en calidad BAJA da falso', correrEsAlta(2) === false);

  /* Y que siga funcionando si 02-utilidades.js no cargó y calidad()
     devuelve texto, que es para lo que existe el respaldo. */
  const conTexto = new Function(
    'const calidad = () => "alta";' + lineaDeEsAlta + '\nreturn esAlta;'
  )();
  comprobar('con el respaldo de texto también', conTexto === true);
}


/* ─── 11. Las fases dicen la verdad ──────────────────────────────────

   Las constantes están nombradas por dónde TERMINA cada cosa: `SHOCK` es
   el fin del shock y el principio del frenesí. La lista de fases que el
   panel de ensayo usa para sus botones tiene que seguir las banderas de
   dibujar(), no los nombres de las constantes — la primera versión no lo
   hacía y el reloj decía «Shock» en el segundo 49. */

console.log('\nLas fases del panel\n');

const listaDeFases = (eclipseCodigo.match(/fases: \[[\s\S]*?\]/) || [''])[0];

comprobar('el shock arranca en TOTALIDAD, no en SHOCK',
  /'Shock',\s*en: TOTALIDAD/.test(listaDeFases),
  'enShock = t >= TOTALIDAD && t < SHOCK');
comprobar('el frenesí arranca en SHOCK',
  /'Frenesí',\s*en: SHOCK/.test(listaDeFases),
  'enFrenesi = t >= SHOCK && t < FRENESI');
comprobar('la sumisión arranca en FRENESI',
  /'Sumisión',\s*en: FRENESI/.test(listaDeFases),
  'enSumision = t >= FRENESI');


/* ─── 12. El ensayo no existe en producción ────────────────────────── */

console.log('\nEl panel de ensayo, encerrado en PBE\n');

const ensayo = leer('codigo', '29-ensayo-del-eclipse.js');

comprobar('el panel se pregunta si está en PBE',
  /\/\(\^\|\\\.\)pbe\\\./.test(ensayo) && /if \(!esPbe\) return;/.test(ensayo),
  'un botón que tapa la invitación de rojo no va en aniaxv.com');
comprobar('y además pide el parámetro',
  /eclipse=ensayo/.test(ensayo));
comprobar('window.ECLIPSE solo se abre en PBE',
  /if \(esPbe\) \{[\s\S]{0,80}window\.ECLIPSE = \{/.test(eclipseCodigo),
  'en producción el objeto no tiene que existir');
comprobar('index.html carga el panel dentro del bloque de PBE',
  /esPbe && \/\[\?&\]eclipse=ensayo\/[\s\S]{0,700}29-ensayo-del-eclipse\.js/
    .test(sinComentarios(leer('index.html'))));
comprobar('en modo ensayo el eclipse no arranca solo',
  /ECLIPSE_SOLO_ENSAYO/.test(eclipseCodigo) && /if \(soloEnsayo\) return;/.test(eclipseCodigo),
  'si arrancara solo, la secuencia correría antes de que exista el panel');


/* ─── 13. Repetir la secuencia no la degrada ───────────────────────── */

console.log('\nCorrerlo muchas veces seguidas\n');

/* ⚠️ SE PIDEN LAS DOS MITADES POR SEPARADO. La primera versión buscaba el
   nombre de la variable a secas, y con eso alcanzaba la línea que la LEE:
   borrar la que la GUARDA no hacía fallar nada, y el grafo no se reusaba
   nunca. Guardar y leer son dos cosas, y la que se rompe fácil es la de
   guardar. */
comprobar('el grafo de sonido se guarda',
  /window\.__ECLIPSE_GRAFO_DE_SONIDO = sonido/.test(eclipseCodigo),
  'sin guardarlo no hay nada que reusar en la segunda corrida');
comprobar('y se reusa antes de construir otro',
  /if \(window\.__ECLIPSE_GRAFO_DE_SONIDO\) \{[\s\S]{0,160}return;/.test(eclipseCodigo),
  'createMediaElementSource() solo se puede llamar una vez por <audio>: ' +
  'sin esto, la segunda corrida va muda y no avisa');
comprobar('y se despierta si el contexto nació dormido',
  /function despertarElContexto/.test(eclipseCodigo) && /resume\(\)/.test(eclipseCodigo),
  'en Safari un contexto suspendido deja la música MUDA, no ahogada');
comprobar('el estado se reinicia entre corridas',
  /function reiniciarElEstado/.test(eclipseCodigo) &&
  /muerte\.suelta = false/.test(eclipseCodigo),
  'si no, la rosa del sacrificio arranca ya soltada en la segunda vuelta');
comprobar('el reinicio corre al empezar',
  /vivo = true;\s*reiniciarElEstado\(\);/.test(eclipseCodigo));


/* ─── 14. Las dos fallas de dispositivo ────────────────────────────── */

console.log('\nEl celular y Firefox\n');

comprobar('el resize pasa por alCambiarElAncho',
  /alCambiarElAncho\(alRedimensionar\)/.test(eclipseCodigo),
  'la barra del navegador dispara resize al hacer scroll y asignar ' +
  'canvas.width lo BORRA: la marea parpadeaba con cada movimiento del dedo');
comprobar('y se quita la misma función que se enganchó',
  /removeEventListener\('resize', escuchaDeMedida\)/.test(eclipseCodigo),
  'una envoltura nueva no se puede quitar: el escucha quedaría para siempre');

/* ⚠️ SE COMPRUEBA QUE SE LLAME, NO QUE EXISTA. La primera versión pedía
   que la función estuviera escrita — y volver a poner el `cssText` crudo
   adentro de coronarElNombre() la dejaba ahí, huérfana, sin que nada
   fallara. Una función que nadie llama no arregla nada. */
comprobar('el nombre no depende solo de cssText',
  /function copiarLosEstilosResueltos/.test(eclipseCodigo) &&
  /getPropertyValue/.test(eclipseCodigo),
  'en Firefox getComputedStyle().cssText viene VACÍO y no lanza error: ' +
  'el nombre de Ania salía con otro cuerpo de letra todo el minuto');
comprobar('y coronarElNombre() la usa',
  /copiarLosEstilosResueltos\(nombre, copiaDelNombre\)/.test(eclipseCodigo));
comprobar('sin cssText crudo suelto por ahí',
  !/style\.cssText = window\.getComputedStyle/.test(eclipseCodigo),
  'es la línea que en Firefox asigna una cadena vacía sin protestar');
comprobar('y la lista de respaldo incluye el tamaño de letra',
  /'font-size'/.test(eclipseCodigo),
  'es justo la que no resuelve fuera de la portada');


/* ─── 14b. El sonido sale del pozo cuando sale el color ─────────────

   Antes el hundimiento se mantenía en 1 hasta `DURACION - 800` (59,2 s),
   mientras las dos capas de color ya estaban en cero desde los 54,6. Eran
   cinco segundos de pantalla limpia con la música todavía debajo del
   agua: no se lee como un efecto, se lee como algo que quedó colgado.

   Se EJECUTA la fórmula, igual que la curva del color: leerla no dice en
   qué segundo llega a cero. */

console.log('\nEl sonido, ejecutando la fórmula\n');

const formulaDelHundimiento =
  (eclipseCodigo.match(/var hundimiento = t < FRENESI[\s\S]*?;/) || [''])[0];

comprobar('se encontró la fórmula del hundimiento', formulaDelHundimiento.length > 20);

if (formulaDelHundimiento) {
  const hundir = new Function('t',
    constantes + '\n' + funciones + '\n' + formulaDelHundimiento +
    '\nreturn hundimiento;');

  comprobar('al principio la música está limpia', hundir(0) < 0.02);
  comprobar('en la totalidad está en el fondo del pozo', hundir(42000) > 0.98);
  comprobar('sigue hundida durante el frenesí', hundir(50000) > 0.98);

  /* El punto del cambio: a los 55 s el color ya se fue, así que el sonido
     también tiene que haberse ido. */
  comprobar('a los 55 s ya salió del pozo', hundir(55000) < 0.05,
    'devolvió ' + hundir(55000).toFixed(3) +
    ' — antes seguía en 1 hasta el segundo 59,2');
  comprobar('y al final está del todo limpia', hundir(59999) < 0.02);

  /* Y que no se vaya ANTES que el color: salir del pozo en el segundo 50,
     con la pantalla todavía roja, sería el error simétrico. */
  comprobar('no sale antes que el color', hundir(53500) > 0.9,
    'el color se va a los 54,6: el sonido lo acompaña, no se le adelanta');
}


/* ─── 14c. EL GUION: que cada acto esté rodado ─────────────────────── */

console.log('\nEl guion, acto por acto\n');

/* ACTO III · el sol muere de verdad. No es un velo encima: es la fuente
   de luz de la web apagándose. */
comprobar('el eclipse toma prestado el sol',
  /window\.LuzDeLaHora\.largoDelHaz = mundo\.largoDelHaz \* loQueQueda/.test(eclipseCodigo),
  'sin esto el eclipse solo pinta encima, que es tapar la ventana en vez ' +
  'de bajar la persiana');
comprobar('y lo reaplica en cada cuadro',
  /function moverElMundo/.test(eclipseCodigo) &&
  /moverElMundo\(t\)/.test(eclipseCodigo),
  '22-luz-de-la-hora.js reescribe el objeto entero cada 10 min: si se ' +
  'escribiera una sola vez, el sol volvería solo a mitad del ritual');
comprobar('los rayos se apagan del todo a los 26 s',
  /t >= 26000 && t < 46000/.test(eclipseCodigo) &&
  /window\.LienzoDeLuz\.haces = sinLuz \? \[\]/.test(eclipseCodigo));
comprobar('y lo que flota se apaga a los 33 s',
  /window\.LienzoDeLuz\.motas = sinFauna \? \[\]/.test(eclipseCodigo),
  'nada vivo que no sea el culto');
comprobar('todo lo prestado se devuelve',
  /function devolverElMundo/.test(eclipseCodigo) &&
  /devolverElMundo\(\);/.test(eclipseCodigo),
  'el eclipse actúa desde afuera y se retira sin dejar rastro');
comprobar('y se devuelve ANTES de sacar las capas',
  eclipseCodigo.indexOf('devolverElMundo();') <
  eclipseCodigo.indexOf('lienzo, lienzoDeLaOfrenda].forEach'),
  'al revés habría un cuadro de pantalla iluminada sin sol');

/* ⚡ LAS VELAS AHORA SÍ SUBEN, Y ES EL PUNTO (2026-09-11)
 *
 * Esto exigía que el eclipse NO tocara `fuerzaDeVelas`: la sala pasaba a
 * cripta solo por contraste. Era correcto mientras el eclipse fuera una
 * capa encima.
 *
 * Ahora el eclipse es una hora del sistema de luz, y ese sistema ya usa
 * este recurso: de día las velas quedan discretas (×0,70) porque compiten
 * con la ventana, y de madrugada crecen (×1,05) porque SON la única luz de
 * la sala. El eclipse lleva eso un paso más allá. Ese cambio de quién
 * manda es, según el propio 22-luz-de-la-hora.js, «lo que vuelve
 * envolvente la escena».
 *
 * Se comprueba arriba, junto al resto de la hora: «y los candelabros pasan
 * a mandar». Lo que sí se conserva es que el eclipse no toque el LIENZO de
 * las velas por su cuenta, que es otra cosa. */
comprobar('el eclipse no dibuja en el lienzo de las velas',
  !/lienzo-de-velas/.test(eclipseCodigo),
  'la luz de las velas la maneja 19-velas.js; el eclipse solo mueve su fuerza');

/* ⚡ ACTO V · EL NOMBRE SIMPLEMENTE ES. LA EXIGENCIA SE DIO VUELTA ENTERA.
 *   (2026-09-11)
 *
 * Estas cuatro comprobaciones pedían justo lo contrario de lo que ahora
 * hace falta: exigían que existiera `elNombreNoSeEntera(t)`, que le
 * escribiera `--luz-x` al clon EN CADA CUADRO y que el oro «no se detenga
 * nunca». O sea que el destello dorado recorría las letras los sesenta
 * segundos, movido por el eclipse.
 *
 * Carlos, textual: «el nombre no brilla, no se inmuta, no pulsa, no se
 * oscurece por el eclipse, no reacciona a la muerte, no reacciona a la
 * locura, no reacciona al eclipse… simplemente ES».
 *
 * La justificación que tenía era además FALSA. Decía que sin eso el nombre
 * se apagaría con el sol, porque 14-haces-de-luz.js desploma
 * `--luz-intensidad`. Pero la regla `.portada__nombre` usa `--luz-x` y
 * nada más —`--luz-intensidad` no aparece en ella— y el clon es un <h1>
 * con solo texto adentro, sin descendientes a los que esa variable pudiera
 * llegar. Era una escritura sin efecto.
 *
 * Ahora se comprueba lo contrario, y por los dos lados: que la función no
 * exista, y que después de crear el clon NADIE le escriba nunca más. */
comprobar('el nombre ya no tiene una luz que el eclipse le mueva',
  !/function elNombreNoSeEntera/.test(eclipseCodigo),
  'esa función le recorría el pan de oro sobre las letras en cada cuadro');

{
  /* Todas las escrituras a la copia, en todo el archivo, sin comentarios. */
  const escrituras = [...sinComentarios(eclipseCodigo)
    .matchAll(/copiaDelNombre\.style[.[][^\n]*/g)].map(m => m[0]);

  comprobar('al clon se le escribe UNA sola vez, al crearlo',
    escrituras.length === 2 &&
    escrituras.some(e => /margin/.test(e)) &&
    escrituras.some(e => /--luz-x/.test(e)),
    'escrituras encontradas: ' + (escrituras.join(' | ') || 'ninguna'));

  comprobar('y ninguna es una animación por cuadro',
    !escrituras.some(e => /\bt\b|recorrido|toFixed\(4\)/.test(e)),
    'si el valor depende de t, el nombre está reaccionando al eclipse');
}

comprobar('su oro queda congelado donde estaba al empezar',
  /getComputedStyle\(nombre\)\.getPropertyValue\('--luz-x'\)/.test(eclipseCodigo),
  'congelarlo en el valor que ya tenía evita un salto al arrancar el minuto');

comprobar('y ninguna fase del minuto lo nombra',
  ['arrancarALaMartir', 'dibujarLaOfrenda', 'moverLasFloresReales',
   'tironDelFrenesi', 'coloresEn'].every(fn => {
    const cuerpo = (eclipseCodigo.match(
      new RegExp('function ' + fn + '[\\s\\S]*?\\n  \\}')) || [''])[0];
    return !/copiaDelNombre|jaula/.test(cuerpo);
  }),
  'ni la muerte, ni el shock, ni el frenesí, ni el frenazo pueden tocarlo');

/* ⚡ ACTO VI · EL FLASH SE FUE (2026-09-11)
 *
 * Carlos, mirando la v277: «quita el flash». Tenía razón por dos motivos a
 * la vez, y los dos cuentan.
 *
 * No se entendía. Era un destello de 150 ms encima de una escena que, con
 * el diseño anterior, estaba casi negra: se leía como un fallo de la
 * página, no como un acontecimiento.
 *
 * Y era una cuarta superficie a pantalla completa mezclando, puesta para
 * usarse un sexto de segundo. En la máquina con la que él mide —una HD
 * 4600, sin memoria propia— eso se paga en FPS.
 *
 * El tercer contacto NO se quedó sin marcar: la luz se viene cerrando
 * sobre el nombre desde el segundo 35 y en el 44 se abre de golpe. Es el
 * mismo acontecimiento contado con la luz que ya está en escena.
 */
comprobar('no queda rastro del flash',
  !/capaDestello/.test(eclipseCodigo) && !/desdeElAnillo/.test(eclipseCodigo),
  'era una cuarta capa mezclando a pantalla completa para 150 ms de uso');

/* ⚡ EL TERCER CONTACTO, AHORA CONTADO CON LA CURVA DE LA LUZ
 *   (2026-09-11)
 *
 * Acá se ejecutaba `aperturaDelVelo`, que encogía y abría el hueco del
 * degradado del velo. Ese velo ya no existe.
 *
 * El acontecimiento no se pierde: la curva de `progresoDelEclipse` se
 * sostiene en 1 durante los dos segundos de cripta y SUELTA en el tercer
 * contacto. Eso es el mismo gesto, contado con la luz que de verdad hay en
 * escena en vez de con la apertura de un rectángulo. */
{
  const cuerpo = (eclipse.match(/function progresoDelEclipse[\s\S]*?\n  \}/) || [''])[0];
  const suave = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fn = new Function('PROFUNDA', 'MUERE_EN', 'SHOCK', 'SALE_DEL_TODO', 'suave',
    cuerpo + '; return progresoDelEclipse;')(
      curva.PROFUNDA, curva.MUERE_EN, curva.SHOCK, 58000, suave);

  comprobar('la luz se cierra del todo antes del tercer contacto',
    fn(curva.SHOCK - 10) === 1,
    'en el borde de la cripta vale ' + fn(curva.SHOCK - 10).toFixed(3) +
    ' — los dos segundos tienen que estar al máximo');

  comprobar('y suelta en el segundo 44',
    fn(curva.SHOCK + 400) < 1,
    'si no soltara ahí, la histeria arrancaría sin causa');

  comprobar('y sigue soltando mientras vuelve la luz',
    fn(50000) > fn(55000) && fn(55000) > 0,
    'a los 50 s ' + fn(50000).toFixed(2) + ' · a los 55 s ' + fn(55000).toFixed(2));
}

/* ACTO II y III · la planta entera, no solo la cabeza. */
comprobar('las ramas también se retuercen',
  /function moverLasRamas/.test(eclipseCodigo) &&
  /nudo-del-tallo/.test(eclipseCodigo));
comprobar('y se mueven con rotate/scale, NO con transform',
  /r\.nodo\.style\.rotate =/.test(eclipseCodigo) &&
  !/nudo\.style\.transform =/.test(eclipseCodigo),
  'la posición del nudo vive en su ATRIBUTO transform: la propiedad CSS ' +
  'lo pisaría y mandaría todas las ramas a la esquina del SVG');
comprobar('se comprueba que el navegador las soporte',
  /CSS\.supports\('rotate', '1deg'\)/.test(eclipseCodigo),
  'sin ellas no hay forma segura de mover un nudo');
comprobar('el tallo se dobla MENOS que su flor',
  /r\.haciaElNombre \* fervor \* r\.ansia \* 0\.26/.test(eclipseCodigo) &&
  /f\.haciaElNombre \* fervor \* f\.ansia \* 0\.58/.test(eclipseCodigo),
  'un tallo que se dobla tanto como su flor parece de goma');
comprobar('y despierta ANTES que ella',
  /PENUMBRA \* 0\.25/.test(eclipseCodigo) && /PENUMBRA \* 0\.3/.test(eclipseCodigo),
  'la planta se entera con el cuerpo antes que con la cabeza');
comprobar('las ramas se devuelven',
  /function devolverLasRamas/.test(eclipseCodigo) &&
  /devolverLasRamas\(\);/.test(eclipseCodigo));

/* ⚡ ACTO VIII · EL EMPUJÓN DEL 54, QUE NO EXISTÍA (2026-09-11)
 *
 * Acá decía «las plantas NO se calman solas al final» y exigía
 * `var retirada = 0;`. O sea que esta prueba estaba BLINDANDO la versión
 * contraria a la instrucción de Carlos, que es literal: «el final es
 * abrupto porque una fuerza superior las empuja violentamente de vuelta a
 * la normalidad». Y el guion pone el retorno forzado en la franja 54-60.
 *
 * Con `retirada = 0` las plantas seguían estirando hasta el 60, así que el
 * scratch del 54 sonaba sin que pasara nada en pantalla: un sonido
 * huérfano durante seis segundos.
 *
 * Ahora se comprueba lo contrario, y las tres cosas que lo hacen un
 * empujón y no una frenada: que empiece en el 54, que dure poco, y que se
 * PASE de la postura de reposo. */
comprobar('el empujón existe y empieza en el segundo 54',
  /var retirada = t >= FRENESI/.test(eclipseCodigo) &&
  /1 - elEmpujon\(limitar\(\(t - FRENESI\) \/ DURA_EL_EMPUJON, 0, 1\)\)/
    .test(eclipseCodigo),
  'sin esto el scratch suena y en pantalla no pasa nada');

comprobar('y las flores lo obedecen, no solo las ramas',
  /t >= FRENESI \? despierta \* 0\.55 \* \(1 - retirada\)/.test(eclipseCodigo),
  'si solo se calman las ramas, las cabezas quedan estiradas solas');

comprobar('y dura 200 ms, no una rampa',
  /var DURA_EL_EMPUJON = 200;/.test(eclipseCodigo),
  'una rampa larga se lee como las plantas aceptando que se acabó');

{
  /* Y ejecutada: la curva tiene que PASARSE de cero. Es la diferencia
     entre «la empujaron» y «se detuvo sola». */
  const cuerpo = (eclipse.match(/function elEmpujon\(x\)[\s\S]*?\n  \}/) || [''])[0];
  const suave = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fn = new Function('suave', cuerpo + '; return elEmpujon;')(suave);

  let minimo = 9;
  for (let x = 0; x <= 1.0001; x += 0.005) minimo = Math.min(minimo, fn(x));

  comprobar('y se PASA de la postura de reposo: es retroceso, no frenada',
    minimo <= -0.05,
    'lo más lejos que cruzó fue ' + minimo.toFixed(3) +
    ' — sin sobrepaso, un cuerpo empujado no se distingue de uno que frenó');

  comprobar('y empieza en 1 y termina exactamente en 0',
    fn(0) === 1 && fn(1) === 0,
    'fn(0)=' + fn(0) + ' fn(1)=' + fn(1));
}

/* La mártir no se va con las demás: el guion dice que permanece «un
   instante más» sobre el nombre y LUEGO se desliza. */
comprobar('y la rosa muerta se queda 2,2 s más que el resto',
  /var CAE_LA_MARTIR = 56200;/.test(eclipseCodigo) &&
  /if \(t >= CAE_LA_MARTIR\)/.test(eclipseCodigo),
  'si cae con el empujón, se lee como una cosa más que la fuerza barrió');

/* PARIDAD MÓVIL · requisito explícito. */
comprobar('hay compensación por cantidad de flores',
  /Math\.sqrt\(FLORES_DE_REFERENCIA \/ floresReales\.length\)/.test(eclipseCodigo),
  'en un teléfono hay ~1/4 de las flores: un culto de cuarenta tiene que ' +
  'dar el mismo miedo que uno de doscientas');
comprobar('y está topada para no volverse un espasmo',
  /, 1, 1\.45\)/.test(eclipseCodigo));

if (typeof calibrar === 'undefined') {
  /* Se EJECUTA la compensación con números de teléfono y de escritorio:
     leerla no dice si el gesto queda comparable. */
  const fuenteCalibrar = (eclipseCodigo.match(
    /compensacion = limitar\([\s\S]*?1\.45\);/) || [''])[0];

  if (fuenteCalibrar) {
    const compensar = (cuantas) => new Function(
      'const limitar = (v,a,b) => Math.min(Math.max(v,a),b);' +
      'const FLORES_DE_REFERENCIA = 200;' +
      'const floresReales = { length: ' + cuantas + ' };' +
      'let compensacion;' + fuenteCalibrar + '\nreturn compensacion;'
    )();

    comprobar('en escritorio (200 flores) no compensa',
      Math.abs(compensar(200) - 1) < 0.01, 'dio ' + compensar(200).toFixed(3));
    comprobar('en teléfono (47 flores) compensa de verdad',
      compensar(47) > 1.35, 'dio ' + compensar(47).toFixed(3));
    comprobar('y con muy pocas no se dispara',
      compensar(5) <= 1.45, 'dio ' + compensar(5).toFixed(3));
  }
}


/* ─── 14d. EL ESPEJO DEL MARCO ──────────────────────────────────────
   El defecto más grave que tuvo esta escena, y el que menos se veía:
   medido en PBE sobre el v273, 94 de 198 flores, 40 de 80 nudos y 16 de
   32 llamas se inclinaban APARTÁNDOSE del nombre. La mitad derecha del
   marco es la izquierda reflejada (`transform: scaleX(-1)`), y dentro de
   un espejo los ángulos se invierten. */

console.log('\nLa mitad reflejada del marco\n');

comprobar('se mide el sentido de la pantalla',
  /function sentidoDeLaPantalla/.test(eclipseCodigo),
  'sin esto, la mitad del culto le da la espalda al dios');

comprobar('y se mide por el DETERMINANTE, no por la palabra scaleX',
  /n\[0\] \* n\[3\] - n\[1\] \* n\[2\]/.test(eclipseCodigo) &&
  !/indexOf\('scaleX'\)/.test(eclipseCodigo),
  'un determinante negativo ES la definición de reflejado, venga escrito ' +
  'como scaleX(-1), como scale(-1,1) o como una matriz a mano');

/* ⚠️ SE MIRA DONDE SE APLICA EL ESPEJO, NO DONDE SE ESCRIBE EL ESTILO.
   Desde que el ángulo se redondea antes de escribirlo —para no reescribir
   lo que no cambió, ver LOS TURNOS— el `espejo` vive en la línea del
   redondeo y no en la del `style`. Lo que importa es que esté en la
   cuenta, no en qué renglón. */
for (const [que, quien] of [
  ['las flores',  /Math\.round\(f\.espejo \* gesto \* 100\)/],
  ['las ramas',   /Math\.round\(r\.espejo \* \(dobla \+ tiembla \+ latigazo\) \* 100\)/],
  ['las llamas',  /l\.espejo \* \(l\.ladeo \* atraccion \+ vaiven\)/],
]) {
  comprobar(que + ' aplican el espejo al escribir el ángulo',
    quien.test(eclipseCodigo),
    'medir el reflejo y no usarlo es peor que no medirlo');
}

/* Se EJECUTA el lector de matrices con cadenas de ancestros armadas a
   mano. Leerlo no dice si distingue un espejo de un giro, que es
   exactamente donde esto se puede romper sin que se note: una rotación
   también cambia el primer número de la matriz, pero NO es un reflejo. */
{
  const fuenteSentido = (eclipseCodigo.match(
    /function sentidoDeLaPantalla\(nodo\) \{[\s\S]*?\n  \}/) || [''])[0];

  if (!fuenteSentido) {
    comprobar('se puede ejecutar sentidoDeLaPantalla()', false,
      'no se encontró la función para ejecutarla');
  } else {
    const tope = { nodeType: 1, __tr: 'none', parentNode: null };

    const medir = (transforms) => {
      const nodos = transforms.map(tr => ({ nodeType: 1, __tr: tr, parentNode: null }));
      for (let i = 0; i < nodos.length - 1; i++) nodos[i].parentNode = nodos[i + 1];
      nodos[nodos.length - 1].parentNode = tope;

      return new Function('getComputedStyle', 'document', 'nodo',
        'var sentidosMedidos = [];' + fuenteSentido +
        '\nreturn sentidoDeLaPantalla(nodo);'
      )(
        (el) => ({ transform: el.__tr }),
        { documentElement: tope },
        nodos[0]
      );
    };

    comprobar('sin transformaciones, se ve tal cual',
      medir(['none', 'none']) === 1);

    comprobar('un scaleX(-1) en un ancestro lo detecta',
      medir(['none', 'matrix(-1, 0, 0, 1, 0, 0)']) === -1,
      'es el caso real: .marco__ramillete--derecho');

    comprobar('una ROTACIÓN no es un reflejo',
      medir(['matrix(0.707, 0.707, -0.707, 0.707, 0, 0)', 'none']) === 1,
      'un giro también cambia el primer número de la matriz; confundirlos ' +
      'invertiría flores que están perfectamente bien');

    comprobar('dos espejos se cancelan',
      medir(['matrix(-1, 0, 0, 1, 0, 0)', 'matrix(-1, 0, 0, 1, 0, 0)']) === 1);

    comprobar('un scaleY(-1) también es un reflejo',
      medir(['none', 'matrix(1, 0, 0, -1, 0, 0)']) === -1);

    comprobar('y una matrix3d reflejada también',
      medir(['none',
        'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)']) === -1);
  }
}


/* ─── 14e. ACTO IV · LA MÁRTIR SE ARRANCA A LA VISTA ───────────────── */

console.log('\nLa mártir, beat por beat\n');

comprobar('la mártir es una flor DEL MARCO, no una rosa inventada',
  /if \(!floresReales\.length\) return;/.test(
    (eclipseCodigo.match(/function elegirALaQueMuere[\s\S]*?\n  \}/) || [''])[0]),
  'una rosa que nunca estuvo sujeta a un tallo no puede arrancarse de él');

/* ⚡ LA MÁRTIR YA NO SE ELIGE: SE LA GANA (2026-09-11)
 *
 * Antes esto elegía la más grande del quinto más cercano, AL MONTARSE LA
 * ESCENA —o sea antes de que ninguna se hubiera esforzado— y después
 * `moverLasFloresReales` le pintaba el esfuerzo encima con
 * `var esfuerzo = f.martir ? tramo(…) : 0`. El esfuerzo era consecuencia
 * de ser la mártir, no su causa.
 *
 * El documento base pide lo contrario con todas las letras: «El algoritmo
 * de esfuerzo lleva ranking en tiempo real» y «La rosa que ha acumulado el
 * MAYOR ESFUERZO alcanza el punto de ruptura». */
comprobar('cada flor acumula su propio esfuerzo, en tiempo real',
  /f\.esfuerzoAcumulado = \(f\.esfuerzoAcumulado \|\| 0\) \+ Math\.abs\(inclina\);/
    .test(eclipseCodigo),
  'sin ranking no hay mérito: la muerte sería un sorteo');

comprobar('y deja de contar en el 35, cuando se cierra la votación',
  /if \(t < PROFUNDA\) \{\s*\n\s*f\.esfuerzoAcumulado/.test(eclipseCodigo),
  'seguir sumando después de elegida es gastar sin cambiar nada');

comprobar('gana la que MÁS se esforzó',
  /\(f\.esfuerzoAcumulado \|\| 0\) > \(mejor\.esfuerzoAcumulado \|\| 0\)/
    .test(eclipseCodigo),
  'es la idea entera del documento: muere la que más lo intentó');

comprobar('con un piso de tamaño, porque el sacrificio hay que verlo',
  /if \(f\.tamano < medianaDeTamano\) continue;/.test(eclipseCodigo),
  'una cabeza de 14 px arrancándose no se ve');

comprobar('y la cercanía ya no se impone: emerge de la onda',
  /f\.distancia \/ lejaniaMaxima/.test(eclipseCodigo),
  'las cercanas despiertan antes, acumulan más tiempo y ganan solas');

comprobar('se la elige en el segundo 35, no al montar la escena',
  /if \(!laQueMuere && t >= PROFUNDA\) elegirALaQueMuere\(\);/
    .test(eclipseCodigo) &&
  !/elegirALaQueMuere\(\);/.test(
    (eclipseCodigo.match(/function tomarLasFloresReales[\s\S]*?\n  \}/) || [''])[0]),
  'elegirla al montar la escena era elegirla antes de que nadie se esforzara');

comprobar('y hay respaldo si el marco nació tarde y nadie acumuló nada',
  /if \(!mejor \|\| !\(mejor\.esfuerzoAcumulado > 0\)\)/.test(eclipseCodigo),
  'nunca se puede salir de ahí sin mártir: sin ella no hay minuto');

/* ⚠️ EL RELEVO TIENE QUE PASAR DENTRO DE UN MISMO CUADRO. Si la flor se
   apaga en un cuadro y la copia aparece en el siguiente, hay 16 ms con el
   tallo vacío y sin rosa: un parpadeo que delata el truco entero. */
{
  const cuerpoDeUnCuadro = (eclipseCodigo.match(
    /function unCuadro\(ahora, t\) \{[\s\S]*?\n  \}/) || [''])[0];

  comprobar('las plantas se mueven ANTES de dibujar el lienzo',
    cuerpoDeUnCuadro.indexOf('moverLasFloresReales(t);') > 0 &&
    cuerpoDeUnCuadro.indexOf('moverLasFloresReales(t);') <
    cuerpoDeUnCuadro.indexOf('dibujar(t);'),
    'al revés, el relevo de la mártir tendría un cuadro de hueco vacío');
}

comprobar('el arranque se mide antes de escribir nada en el cuadro',
  /arrancarALaMartir\(t\);[\s\S]{0,600}for \(var i = 0; i < floresReales\.length/
    .test(eclipseCodigo),
  'un getBoundingClientRect() después de mover 200 flores fuerza a ' +
  'recalcularlas todas, justo en el cuadro que el espectador está mirando');

comprobar('la copia se dibuja del tamaño MEDIDO de la flor',
  /muerte\.escala = \(lado \* \(f\.creceAhora \|\| 1\)\) \/ \(LADO \* tintaDeLaRosa\);/
    .test(eclipseCodigo),
  'si el tamaño se estima, la copia no calza y el relevo se ve');

/* ⚠️ Y SE MIDE CON LA MATRIZ, NO CON LA CAJA DE PANTALLA. La caja de
   getBoundingClientRect está alineada a los ejes, y las flores están
   giradas dentro de su <use>: medido sobre las 198 flores de PBE, esa caja
   exagera el tamaño un 18 % en la mediana y hasta un 39 %. Con la matriz
   de pantalla y getBBox, el error baja a 0,22 %. */
/* La función se mudó a 02-utilidades.js: la necesitan dos módulos que no
   se conocen entre sí —éste para la copia de la mártir, y
   06-petalos-con-fisica.js para que un pétalo no sea el doble que la rosa
   de al lado—. Se comprueba donde vive ahora Y que este archivo la use. */
comprobar('y el tamaño real sale de la matriz, no de la caja de pantalla',
  /function ladoRealDeLaFlor\(movil\)/.test(sinComentarios(leer('codigo', '02-utilidades.js'))) &&
  /ladoRealDeLaFlor\(nodo\)/.test(eclipseCodigo),
  'la caja de una rosa girada 30° es mucho más grande que la rosa');

comprobar('y la tinta del mapa de bits se MIDE, no se estima',
  /getImageData\(0, 0, LADO, LADO\)/.test(eclipseCodigo) &&
  /function medirLaTintaDeLaRosa/.test(eclipseCodigo),
  'sin medir el margen del mapa, la copia sale de otro tamaño');

/* ⚡ EL RECUADRO DE LA RASTERIZACIÓN CORTABA LA ROSA (2026-09-11). El
   `viewBox="-30 -30 60 60"` estaba escrito a mano y los símbolos no caben:
   rosa-perfil y rosa-tres-cuartos miden 87,2 unidades y empiezan en
   x = -43,2. Al mapa de bits le faltaba un 30 % de la flor, recortada a
   cuchillo por los dos costados. */
comprobar('el recuadro de la rosa sale de su caja real, no de un número',
  /function medirElSimbolo/.test(eclipseCodigo) &&
  /viewBox="' \+ recuadro \+ '"/.test(eclipseCodigo) &&
  !/viewBox="-30 -30 60 60"/.test(eclipseCodigo),
  'el recuadro escrito a mano le cortaba el 30 % a tres de los seis símbolos');

comprobar('y es cuadrado y centrado en la flor',
  /Math\.max\(cajaDelSimbolo\.width, cajaDelSimbolo\.height\) \* 1\.04 \/ 2/
    .test(eclipseCodigo),
  'cuadrado para que girarlo no lo deforme, centrado para que la copia ' +
  'caiga exactamente encima de la flor');

comprobar('la copia hereda el giro que el dibujo ya traía',
  /function giroDelUse/.test(eclipseCodigo) &&
  /f\.espejo \* f\.giroDelDibujo \+ \(f\.gesto \|\| 0\)/.test(eclipseCodigo),
  'el <use> lleva su propio rotate(); el mapa de bits se rasteriza sin girar');

comprobar('y se refleja si la flor estaba en el lado reflejado',
  /if \(espejo === -1\) pincel\.scale\(-1, 1\);/.test(eclipseCodigo),
  'una rosa no es simétrica: la copia sin reflejar sería otra rosa');

comprobar('el tallo queda VACÍO',
  /f\.nodo\.style\.opacity = '0';/.test(eclipseCodigo),
  'la ausencia es la mitad del significado: murió LA QUE ESTABA AHÍ');

comprobar('y el hueco se vuelve a llenar en el frenazo',
  /removeProperty\('opacity'\)/.test(
    (eclipseCodigo.match(/function devolverLasFloresReales[\s\S]*?\n  \}/) || [''])[0]),
  'si no, la flor queda invisible después del eclipse');

comprobar('la rama da el latigazo al perder su flor',
  /function darleElLatigazoALaRama/.test(eclipseCodigo) &&
  /latigazo = -\(dobla >= 0 \? 1 : -1\)/.test(eclipseCodigo),
  'sin el latigazo el arranque es un corte de montaje, no un desgarro');

/* ⚠️ EL VIAJE VA POR EL RELOJ, NO POR CUADROS. La versión anterior
   acumulaba `muerte.vy += 0.55` en cada cuadro: a 30 cuadros por segundo
   la rosa caía la mitad de rápido que a 60, o sea que en un teléfono
   lento se posaba en otro momento de la escena. */
comprobar('el viaje de la mártir va por el reloj de la secuencia',
  /var viaje = suave\(limitar\(\(t - MUERE_EN\) \/ \(TOTALIDAD - MUERE_EN\), 0, 1\)\);/
    .test(eclipseCodigo) &&
  !/muerte\.vy \+= /.test(eclipseCodigo),
  'acumular por cuadro hace que la escena dure distinto en cada equipo');

comprobar('y la caída también',
  /muerte\.y \+= 900 \* cae \* cae \* 0\.5;/.test(eclipseCodigo));


/* ─── 14f. ACTO II · LAS LLAMAS SE INCLINAN ────────────────────────── */

console.log('\nLas velas notan algo\n');

comprobar('las llamas se inclinan hacia el nombre',
  /function moverLasLlamas/.test(eclipseCodigo) &&
  /moverLasLlamas\(t\);/.test(eclipseCodigo));

comprobar('empieza en el segundo 18',
  /var atraccion = tramo\(t, 18000, 20500\);/.test(eclipseCodigo),
  'es el beat del guion: «las velas notan algo»');

/* ⚠️ ACÁ ESTÁ LA TRAMPA DEL BLOQUE, Y ES LA MISMA QUE CON LOS NUDOS.
   19-velas.js le escribe a cada .llama su propio style.transform (el
   titileo) muchas veces por segundo. Escribir `transform` acá sería una
   pelea que se pierde en el cuadro siguiente, y además dejaría la llama
   sin titilar. `rotate` y `scale` se COMPONEN con transform. */
comprobar('se escriben con rotate/scale, NUNCA con transform',
  /l\.nodo\.style\.rotate =/.test(eclipseCodigo) &&
  /l\.nodo\.style\.scale =/.test(eclipseCodigo) &&
  !/l\.nodo\.style\.transform/.test(eclipseCodigo),
  '19-velas.js le reescribe el transform a cada llama: perderíamos, y de ' +
  'paso le apagaríamos el titileo');

comprobar('en la totalidad se quedan quietas',
  /var vaiven = enShock \? 0/.test(eclipseCodigo),
  'los dos segundos de vacío también son de las velas');

comprobar('y se les devuelve todo al terminar',
  /function devolverLasLlamas/.test(eclipseCodigo) &&
  /devolverLasLlamas\(\);/.test(
    (eclipseCodigo.match(/function terminar\([\s\S]*?\n  \}/) || [''])[0]));

/* Inclinarse no es iluminar: la regla de que las velas no SUBEN de brillo
   sigue en pie y la cuida la comprobación «las velas no se tocan». Acá se
   cuida que no se cuele por otra puerta.

   ⚠️ SE MIRA SOLO LO QUE TOCA A LAS LLAMAS, no el archivo entero. La
   primera versión de esto buscaba `l.nodo.style.opacity` en todo el
   código y fallaba por `devolverLosPetalosDeSiempre()`, que usa la misma
   letra para otra cosa. Una prueba que muerde por un nombre de variable
   ajeno enseña a ignorarla. */
{
  const loDeLasLlamas = ['tomarLasLlamas', 'moverLasLlamas', 'devolverLasLlamas']
    .map(n => (eclipseCodigo.match(
      new RegExp('function ' + n + '\\([\\s\\S]*?\\n  \\}')) || [''])[0])
    .join(' | ');

  comprobar('y no se les toca el brillo por otro lado',
    !/lienzo-de-velas/.test(eclipseCodigo) &&
    !/vela--nucleo/.test(eclipseCodigo) &&
    !/opacity/.test(loDeLasLlamas) &&
    !/filter/.test(loDeLasLlamas),
    'la sala pasa a cripta por contraste, no por aumento: inclinarse no es ' +
    'iluminar');
}


/* ─── 14g. ACTO VIII · LA RELIQUIA ─────────────────────────────────── */

console.log('\nLo único que sobrevive al frenazo\n');

comprobar('hay un pétalo que se posa sobre el relicario',
  /function elegirLaReliquia/.test(eclipseCodigo) &&
  /if \(t >= TOTALIDAD\) elegirLaReliquia\(\);/.test(eclipseCodigo),
  'se elige en los dos segundos de quietud, cuando nada se mueve');

comprobar('el posado no tiene física: está apoyado',
  /if \(pt\.posada\) \{/.test(eclipseCodigo),
  'si lo sigue empujando la atracción, no está posado, está flotando');

comprobar('sobrevive al frenazo SOLO si el eclipse llegó al final',
  /if \(completo\) dejarLaReliquia\(\);/.test(eclipseCodigo) &&
  /terminar\(true\);/.test(eclipseCodigo),
  'si se cortó por un error o desde el panel, no hubo ritual: no hay evidencia');

comprobar('se queda quieto tres segundos',
  /if \(desde >= 3000\) \{/.test(eclipseCodigo),
  'el que lo vio ya había decidido que no había pasado nada: por eso llega tarde');

/* ⚠️ Y SE CAE COMO UN PÉTALO, NO COMO UNA PIEDRA. La primera versión le
   puso la gravedad de la mártir —900 px/s², la caída de un cuerpo— y
   medido en vivo salía de la pantalla en siete décimas de segundo. Es la
   última imagen de la pieza: tiene que leerse como algo que SE SUELTA. */
comprobar('y se cae como se cae un pétalo',
  /var arranque = 1 - Math\.exp\(-cae \* 1\.6\);/.test(eclipseCodigo) &&
  /x = x0 \+ Math\.sin\(cae \* 2\.3\) \* 16;/.test(eclipseCodigo),
  'con la gravedad de un cuerpo se va de la pantalla en 0,7 s y se lee ' +
  'como que algo se cayó, no como que algo se soltó');

/* ⚠️ ES EL ÚNICO rAF QUE SOBREVIVE AL ECLIPSE, y la regla de este archivo
   dice que eso es exactamente lo prohibido. Se permite con candados, y los
   candados se comprueban. */
comprobar('su bucle tiene techo duro',
  /desde > 9000/.test(eclipseCodigo),
  'un rAF sin techo después del eclipse es lo que el archivo prohíbe');

comprobar('y un reloj que lo saca aunque el rAF no corra nunca',
  /relojDeLaReliquia = setTimeout\([\s\S]{0,160}\}, 12000\);/.test(eclipseCodigo),
  'si la pestaña se va al fondo en el frenazo, los cuadros se congelan y el ' +
  'pétalo se quedaría pegado sobre el relicario');

comprobar('el lienzo se reserva en el segundo 42, no en el frenazo',
  /lienzoDeLaReliquia = document\.createElement\('canvas'\);/.test(
    (eclipseCodigo.match(/function elegirLaReliquia[\s\S]*?\n  \}/) || [''])[0]),
  'reservar un lienzo cuesta un cuadro, y el del segundo 60 es EL cuadro');

comprobar('y se limpia entre corridas',
  /limpiarLaReliquia\(\);/.test(
    (eclipseCodigo.match(/function reiniciarElEstado[\s\S]*?\n  \}/) || [''])[0]),
  'en el ensayo la secuencia se corre una y otra vez');


/* ─── 14h. EL SOL, EJECUTADO ───────────────────────────────────────────
   Este bloque toca módulos que no se pudieron ver corriendo juntos. En el
   navegador de prueba el eclipse parecía no apagar el sol nunca — y era un
   artefacto de la medición: con el panel oculto, requestAnimationFrame no
   corre, así que la secuencia dibujaba UN cuadro y el reloj de seguridad
   la terminaba a los 61 s. Para no volver a depender de mirar, acá se
   EJECUTA la función de verdad con perillas de mentira y se le leen los
   valores beat por beat. */

console.log('\nEl sol muriendo, ejecutando la función\n');

{
  const fuenteMundo = (eclipseCodigo.match(
    /function moverElMundo\(t\) \{[\s\S]*?\n  \}/) || [''])[0];

  if (!fuenteMundo) {
    comprobar('se puede ejecutar moverElMundo()', false, 'no se encontró');
  } else {
    const enElSegundo = (ms) => {
      const haces = [1, 2, 3, 4];
      const motas = new Array(32).fill(0);
      const fauna = [1, 2, 3, 4];
      const ventana = {
        LuzDeLaHora: { largoDelHaz: 1.2, anguloDelSol: -26.7 },
        LienzoDeLuz: { haces: haces, motas: motas, fauna: fauna }
      };
      const mundo = {
        largoDelHaz: 1.2, anguloDelSol: -26.7,
        haces: haces, motas: motas, fauna: fauna, velo: null
      };

      /* moverElMundo() usa la MISMA curva de retirada que el color
         (`loQueYaSeFue`), así que hay que darle esa función de verdad y no
         una inventada acá: con otra, esto comprobaría que el sol sigue una
         curva que el eclipse no usa. */
      new Function('window', 'mundo', 'limitar', 'loQueYaSeFue', 't',
        fuenteMundo + '\nmoverElMundo(t);'
      )(ventana, mundo, (v, a, b) => Math.min(Math.max(v, a), b),
        curva.loQueYaSeFue, ms);

      return {
        largo: ventana.LuzDeLaHora.largoDelHaz,
        angulo: ventana.LuzDeLaHora.anguloDelSol,
        haces: ventana.LienzoDeLuz.haces.length,
        motas: ventana.LienzoDeLuz.motas.length,
        fauna: ventana.LienzoDeLuz.fauna.length
      };
    };

    const en0  = enElSegundo(0);
    const en13 = enElSegundo(13000);
    const en26 = enElSegundo(26000);
    const en30 = enElSegundo(30000);
    const en33 = enElSegundo(33000);
    const en42 = enElSegundo(42000);
    const en58 = enElSegundo(58450);
    const en59 = enElSegundo(59900);

    comprobar('en el segundo 0 el sol está entero',
      Math.abs(en0.largo - 1.2) < 0.001, 'dio ' + en0.largo.toFixed(3));

    comprobar('a los 13 s va por la mitad',
      Math.abs(en13.largo - 0.6) < 0.01, 'dio ' + en13.largo.toFixed(3));

    comprobar('a los 26 s el haz mide CERO',
      en26.largo < 0.0001, 'dio ' + en26.largo.toFixed(4));

    comprobar('y a los 26 s no queda ni un rayo dibujado',
      en26.haces === 0, 'quedaban ' + en26.haces);

    comprobar('la sombra entra por un lado: el sol se corre 18°',
      Math.abs(en26.angulo - (-26.7 + 18)) < 0.01,
      'dio ' + en26.angulo.toFixed(2));

    comprobar('a los 30 s las motas todavía están',
      en30.motas === 32, 'quedaban ' + en30.motas);

    comprobar('a los 33 s se apagan motas y fauna',
      en33.motas === 0 && en33.fauna === 0,
      'motas ' + en33.motas + ', fauna ' + en33.fauna);

    comprobar('en la totalidad no hay nada vivo que no sea el culto',
      en42.largo < 0.0001 && en42.haces === 0 && en42.motas === 0,
      'largo ' + en42.largo + ', haces ' + en42.haces + ', motas ' + en42.motas);

    /* ⚡ LA LUZ VUELVE DURANTE LA HISTERIA, NO DESPUÉS (2026-09-11)
     *
     * Antes el sol volvía entre el 57 y el 59,9: 2,9 s para deshacer 26 de
     * agonía. Carlos, mirándolo: «la oscuridad desaparece casi de golpe,
     * casi de un fotograma a otro; un eclipse DE SANGRE no desaparece así».
     *
     * Ahora vuelve por la misma curva que el color, a lo largo de los 16 s
     * que siguen al tercer contacto: rápido al principio —después del
     * tercer contacto la luz pega un salto— y lentísimo el resto. Eso hace
     * dos cosas a la vez: deja de ser un corte, y pone toda la histeria
     * bajo una luz que va volviendo. El culto se desata CON el permiso
     * cerrándose a la vista, que es el acto VIII entero. */
    const en46 = enElSegundo(46000);
    const en52 = enElSegundo(52000);

    comprobar('a los 46 s la luz ya pegó el salto de vuelta',
      en46.largo > 0.2 && en46.largo < 0.7, 'dio ' + en46.largo.toFixed(3));

    comprobar('y los rayos vuelven con ella, no de golpe al final',
      en46.haces === 4, 'quedaban ' + en46.haces);

    comprobar('a los 52 s va por más de la mitad',
      en52.largo > 0.65, 'dio ' + en52.largo.toFixed(3));

    comprobar('a los 58,45 s ya casi es de día',
      en58.largo > 1.05, 'dio ' + en58.largo.toFixed(3));

    comprobar('a los 59,9 s el sol está entero otra vez',
      Math.abs(en59.largo - 1.2) < 0.02, 'dio ' + en59.largo.toFixed(3));

    comprobar('y los rayos y las motas volvieron a su sitio',
      en59.haces === 4 && en59.motas === 32 && en59.fauna === 4,
      'haces ' + en59.haces + ', motas ' + en59.motas + ', fauna ' + en59.fauna);

    /* ⚠️ LAS PLANTAS NO SE CALMAN CUANDO VUELVE LA LUZ. Ese desacople es
       el momento más perturbador del minuto: la luz está de vuelta mucho
       antes del frenazo y ellas siguen estirando igual. */
    comprobar('la luz está de vuelta mucho antes del frenazo',
      en52.largo > 0.65 && enElSegundo(43000).largo < 0.0001,
      'en la totalidad tiene que estar apagado y a los 52 ya muy vuelto');

    /* Y la vida vuelve DESPUÉS que la luz: primero los rayos, después los
       bichos. Al revés se leería como que las luciérnagas alumbran el sol. */
    comprobar('lo que flota vuelve después que los rayos',
      en46.motas === 0 && en52.motas === 32,
      'motas a los 46 s: ' + en46.motas + ', a los 52 s: ' + en52.motas);
  }
}


/* ─── 14i. EL COSTE POR CUADRO ──────────────────────────────────────
   La condición que Carlos puso por encima de todo lo demás:

       «quiero calidad, pero no a costa de la experiencia misma»

   Medido en la página abierta, antes de tocar nada: escribir las 161
   flores costaba 9,08 ms por cuadro, los 80 nudos 8,73 y las 28 llamas
   4,24. Total 22,05 ms contra un presupuesto de 16,7. El eclipse se
   pasaba del cuadro él solo — y 13 de esos 22 ms los había agregado yo al
   sumar las ramas y las llamas.

   El hallazgo que lo resolvió: el coste NO es por elemento, es por SVG
   invalidado. Tocar un nudo obliga a recalcular su `<svg>` entero.

       todo junto ………………………………………… 16,42 ms
       2 tandas por ÍNDICE ………………… 14,14 ms (−7 %, inútil)
       2 tandas por RAÍZ SVG ……………… 9,42 ms (−43 %)
       3 tandas por RAÍZ SVG ……………… 7,03 ms (−57 %) */

console.log('\nLo que cuesta un cuadro\n');

comprobar('el marco se mueve por turnos',
  /function turnoDe/.test(eclipseCodigo) &&
  /function esSuTurno/.test(eclipseCodigo),
  'sin turnos son 22 ms de escrituras por cuadro, contra 16,7 de presupuesto');

/* ⚠️ POR RAÍZ SVG, QUE ES LO ÚNICO QUE SIRVE. Repartir por índice deja
   todas las raíces invalidadas en todos los cuadros y ahorra un 7 %.

   Se EJECUTA, porque leer la línea no alcanza: una mordida cambió
   `nodo.ownerSVGElement || nodo` por `nodo` —o sea, un turno por elemento
   en vez de por raíz— y ninguna comprobación de texto se enteró. Lo que
   hay que comprobar es que dos elementos del MISMO svg caigan en el mismo
   turno, que es de donde sale el ahorro. */
{
  const fuente = (eclipseCodigo.match(/function turnoDe\(nodo\)[\s\S]*?\n  \}/) || [''])[0];

  if (!fuente) {
    comprobar('se puede ejecutar turnoDe()', false, 'no se encontró');
  } else {
    const repartidos = new Function('cuantosPorRaiz',
      'var turnosPorRaiz = [];' + fuente +
      'var svgA = { id: "a" }, svgB = { id: "b" };' +
      'var a = [], b = [];' +
      'for (var i = 0; i < cuantosPorRaiz; i++) {' +
      '  a.push(turnoDe({ ownerSVGElement: svgA }));' +
      '  b.push(turnoDe({ ownerSVGElement: svgB }));' +
      '}' +
      'return { a: a, b: b };')(6);

    const todosIgualesA = repartidos.a.every(v => v === repartidos.a[0]);
    const todosIgualesB = repartidos.b.every(v => v === repartidos.b[0]);

    comprobar('los turnos se reparten por RAÍZ SVG, no por elemento',
      todosIgualesA && todosIgualesB,
      'seis elementos de la misma raíz dieron los turnos ' +
      repartidos.a.join(',') + ' — si no son todos iguales, cada cuadro ' +
      'invalida igual todas las raíces y el ahorro medido cae al 7 %');

    comprobar('y dos raíces distintas caen en turnos distintos',
      repartidos.a[0] !== repartidos.b[0],
      'las dos dieron ' + repartidos.a[0] + ': entonces se mueven siempre juntas');
  }
}

for (const [que, donde] of [
  ['las flores', 'moverLasFloresReales'],
  ['las ramas',  'moverLasRamas'],
  ['las llamas', 'moverLasLlamas'],
]) {
  comprobar(que + ' respetan su turno',
    /esSuTurno\(/.test(
      (eclipseCodigo.match(new RegExp('function ' + donde + '[\\s\\S]*?\\n  \\}')) || [''])[0]),
    'si uno de los tres no lo respeta, su SVG se invalida igual en cada cuadro');
}

comprobar('y no se reescribe lo que no cambió',
  /if \(enCentesimas === f\.ultimoGesto && enMilesimas === f\.ultimoCrece\) continue;/
    .test(eclipseCodigo),
  'medido: 9,08 ms bajan a 1,97 cuando los valores no cambian, y en los ' +
  'tramos lentos —la mitad del minuto— casi ninguno cambia');

/* ⚡ EL GOBERNADOR ANTERIOR NO SALVÓ EL ECLIPSE: LO APAGÓ (2026-09-11)
 *
 * Estas comprobaciones exigían `promedio > 21` y una escalera que soltaba
 * llamas, pétalos, ramas y flores. Ese 21 se calibró contra un viewport de
 * 0,306 Mpx. La máquina de Carlos corre a 2560x1277 = 3,269 Mpx y su
 * cuadro honesto son ~50 ms, así que la condición se cumplía SIEMPRE:
 *
 *     30 cuadros x 50 ms .................... 1,5 s por escalón
 *     escalones (TANDAS 2->6 y recorte 1->4) . 8
 *     ---------------------------------------------------------
 *     12 SEGUNDOS hasta apagar todo salvo velo, nombre y mártir
 *
 * Carlos lo reportó tal cual: «todo se congela, desde el s10 hasta el 35
 * solo flota una rosa». Su diagnóstico decía `recorte: 4`.
 *
 * Decisión suya para esta ronda: la escalera cede SUAVIDAD, nunca reparto.
 * Y cuando se acaba la suavidad, el gobernador se calla. */
comprobar('el umbral del gobernador se MIDE, no es una constante',
  /objetivoDeCuadro = Math\.max\(28, \(medianaDe\(muestrasDeLaBase\)/
    .test(eclipseCodigo) &&
  !/promedio > 21/.test(eclipseCodigo),
  'un número fijo no puede servir a un teléfono de 0,8 Mpx y a un monitor de 3,3');

comprobar('y tira los primeros cuadros antes de creerle nada al equipo',
  /cuadrosVistos > CALENTAMIENTO && cuadrosVistos <= CUADROS_PARA_JUZGAR/
    .test(eclipseCodigo),
  'los cuadros del arranque son los caros y no dicen nada del equipo');

comprobar('y no juzga antes del segundo 6',
  /var NO_JUZGAR_ANTES_DE = 6000;/.test(eclipseCodigo) &&
  /t >= NO_JUZGAR_ANTES_DE/.test(eclipseCodigo),
  'juzgar durante el arranque es lo que produjo la cascada');

comprobar('la degradación por recorte ya NO EXISTE',
  !/var LASTRE/.test(eclipseCodigo) &&
  !/function soltarLastre/.test(eclipseCodigo) &&
  !/nivelDeRecorte/.test(sinComentarios(eclipseCodigo)),
  'apagar llamas, pétalos, ramas y flores es quitar la obra para que entre ' +
  'el telón: eso ya se probó y fue la peor versión');

comprobar('la escalera cede TANDAS y después resolución, y nada más',
  /if \(TANDAS < 6\) \{ TANDAS\+\+; return true; \}/.test(eclipseCodigo) &&
  /return bajarLaEscalaDelLienzo\(\);/.test(eclipseCodigo),
  'nunca rosas, nunca ramas, nunca llamas, nunca el velo, nunca la mártir');

{
  const escalones = (eclipseCodigo.match(
    /var ESCALONES_DE_ESCALA = \[([^\]]*)\]/) || ['', ''])[1]
    .split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
  const piso = parseFloat((eclipseCodigo.match(
    /var ESCALA_MINIMA_DEL_LIENZO = ([\d.]+);/) || ['', '0'])[1]);

  comprobar('los escalones de resolución van hacia abajo y paran en el piso',
    escalones.length >= 2 &&
    escalones.every((v, i) => i === 0 || v < escalones[i - 1]) &&
    Math.min(...escalones) >= piso,
    'escalones ' + escalones.join(' -> ') + ' · piso ' + piso);

  comprobar('y el piso es DURO: medirElLienzo lo vuelve a imponer',
    /if \(ESCALA_DEL_LIENZO < ESCALA_MINIMA_DEL_LIENZO\)/.test(eclipseCodigo),
    'sin esto, cualquier ruta futura podría dejar la trama por debajo');

  comprobar('después del piso el gobernador se calla',
    /return false;\s*\n  \}/.test(
      (eclipseCodigo.match(/function bajarLaEscalaDelLienzo[\s\S]*?\n  \}/) || [''])[0]),
    'un minuto a 24 fps con el rito entero es mejor que 30 con la escena ' +
    'desarmada');
}

comprobar('el lienzo del eclipse ya lee la perilla de calidad',
  /var ESCALA_DEL_LIENZO = esBaja \? 0\.72 : 1;/.test(eclipseCodigo) &&
  /var trama = dpr \* ESCALA_DEL_LIENZO;/.test(eclipseCodigo),
  'era el único lienzo de la página a densidad plena: 3,269 Mpx contra los ' +
  '0,817 de los otros tres, que ya usan FACTOR_POR_CALIDAD');

comprobar('y el de la reliquia usa la misma trama',
  /var tramaDeLaReliquia = dpr \* ESCALA_DEL_LIENZO;/.test(eclipseCodigo),
  'si uno escala y el otro no, la ofrenda se ve de otra nitidez que el mundo');

/* ⚡ Y EL VELO TAMBIÉN, QUE ES LO QUE CARLOS VIO (2026-09-11)
 *
 * «la penumbra muy roja y plana». `mezclaDelVelo` no se reiniciaba, así
 * que la segunda corrida del panel de ensayo arrancaba con el degradado
 * ya pintado en borgoña —el de la totalidad anterior— y como el repintado
 * solo ocurre cuando el escalón CAMBIA, la penumbra entera salía roja. */
{
  const reinicio = (eclipseCodigo.match(
    /function reiniciarElEstado[\s\S]*?\n  \}/) || [''])[0];

  /* ⚡ LA LUZ VUELVE AL RELOJ ENTRE CORRIDAS (2026-09-11)
   *
   * Antes se comprobaba que se reiniciaran las variables del velo. El velo
   * ya no existe: lo que tiene que volver a su sitio es la LUZ. Sin esto,
   * la segunda corrida del panel de ensayo partiría desde la hora del
   * eclipse anterior en vez de desde la hora real, y en la página de
   * verdad una excepción dejaría la invitación roja y oscura hasta que
   * alguien recargara. */
  comprobar('la luz vuelve al reloj entre corridas',
    /devolverLaLuzDelEclipse\(\);/.test(reinicio),
    'sin esto la corrida siguiente arranca desde la hora del eclipse');

  comprobar('y también al terminar, pase lo que pase',
    /devolverLaLuzDelEclipse\(\);/.test(
      (eclipseCodigo.match(/function terminar[\s\S]*?\n  \}/) || [''])[0]) ||
    (eclipseCodigo.match(/devolverLaLuzDelEclipse\(\);/g) || []).length >= 2,
    'si muriera por una excepción, la página quedaría roja para siempre');

  /* ⚡ LA TRAMA DEL LIENZO TAMBIÉN SOBREVIVÍA (2026-09-11)
   *
   * `ESCALA_DEL_LIENZO` se calcula una vez al evaluar el archivo y el
   * gobernador la baja a 0,60 y a 0,50. Nadie la devolvía: en el panel de
   * ensayo, la primera corrida que activara el gobernador dejaba TODAS las
   * siguientes a 0,50 hasta recargar. O sea que lo que se mirara después
   * ya no era lo que el código hace. */
  comprobar('la trama del lienzo se reinicia entre corridas',
    /ESCALA_DEL_LIENZO = esBaja \? 0\.72 : 1;/.test(reinicio) &&
    /medirElLienzo\(\);/.test(reinicio),
    'una corrida degradada envenenaba todas las siguientes del panel');


}

/* ⚡ Y NINGÚN ANCLAJE INTERMEDIO PUEDE LLEGAR AL 100 %
 *
 * Si `broche2` se pasa de la esquina —pasa en pantallas anchas— quedaba
 * topado en 100 y se pisaba con la parada de la esquina: la caída perdía
 * su último escalón y el borde se veía de un solo tono. Medido en el
 * navegador a 1280x720: 0 / 15,7 / 51,8 / 100 / 100. */
{
  /* ⚠️ ACÁ SE EJECUTABA `porcentajeDelAncla` con cajas enormes para
     comprobar que los cinco escalones no se pisaran. Esa función no existe
     más: las posiciones del degradado ahora son fijas y no salen de medir
     nada. */
}


/* ─── 14j. EL ORDEN DE LAS CAPAS ─────────────────────────
   La regla de fotografía de la escena entera, dicha con z-index.

   ⚡ ESTA REGLA SE REESCRIBIÓ PORQUE EL MECANISMO CAMBIÓ (2026-09-12)

   Decía: «en todo el minuto hay exactamente DOS cosas que la oscuridad no
   toca —el nombre y la rosa que se ofreció—; todo lo demás vive DEBAJO
   del velo». Y comprobaba que los pétalos quedaran por debajo de
   `capaDelEclipse`, que entonces era un velo radial a pantalla completa en
   z-index 2147483000.

   ⚠️ ESE VELO NO EXISTE. El eclipse dejó de oscurecer tapando y pasó a
   oscurecer restando luz desde el sistema de la hora. `capaDelEclipse`
   quedó vacía y ahora lleva otra cosa: la sombra del borde, en z-index 59.

   Y con eso la regla se da vuelta, a propósito. Un velo va ENCIMA y tapa;
   un fondo va DEBAJO y recorta. Que los pétalos queden por ENCIMA de la
   sombra ya no es el defecto que aquella prueba cuidaba —pétalos al 100 %
   sobre una escena al 5 %— sino lo contrario: es lo que los deja
   recortados contra el negro en vez de apagados con él.

   Lo que SÍ sigue valiendo, y se comprueba igual que siempre, es el orden
   interno de lo que el eclipse dibuja: el mundo abajo, el nombre por
   encima del mundo, y la mártir por encima del nombre. */

console.log('\nEl orden de las capas\n');

{
  const z = (que) => {
    const bloque = (eclipseCodigo.match(new RegExp(que + '[\\s\\S]{0,400}?z-index:(\\d+)')) || [])[1];
    return bloque ? Number(bloque) : null;
  };

  const zSombra   = z("capaDelEclipse\\.style\\.cssText");
  const zMundo    = z("var lienzo = document\\.createElement");
  const zNombre   = z("jaula\\.style\\.cssText");
  const zOfrenda  = z("var lienzoDeLaOfrenda");

  /* ⚠️ EL 60 ES EL DEL MARCO VICTORIANO (estilos/02-marco-victoriano.css).
     Es el número que decide si esto es un fondo o un velo: por debajo, la
     sombra se mete detrás del oro y de las rosas; por encima, las apaga. */
  comprobar('la sombra del borde va DEBAJO del marco victoriano',
    zSombra !== null && zSombra < 60,
    'sombra ' + zSombra + ' · marco 60 — por encima apagaría justamente lo ' +
    'único que este minuto tiene para contar');

  comprobar('y por debajo de todo lo que el eclipse dibuja',
    zMundo !== null && zSombra < zMundo,
    'sombra ' + zSombra + ' · mundo ' + zMundo + ' — es un fondo, no un velo');

  comprobar('el nombre va por encima del mundo',
    zNombre > zMundo, 'nombre ' + zNombre + ' · mundo ' + zMundo);

  comprobar('y la mártir por encima del nombre',
    zOfrenda > zNombre, 'ofrenda ' + zOfrenda + ' · nombre ' + zNombre);

  comprobar('la mártir se dibuja en SU capa, no en la del mundo',
    /dibujarUnaRosa\(pincelDeLaOfrenda/.test(eclipseCodigo),
    'compartir capa con los pétalos la devuelve detrás del nombre');
}

comprobar('y se posa en el filo de abajo, sin tapar las letras',
  /var destinoY = altar\.y \+ altar\.alto \* 0\.42;/.test(eclipseCodigo),
  'aterrizaba en el centro de la palabra');


/* ─── 14k. EL SCROLL NO DEJA AL NOMBRE ATRÁS ────────────────────────── */

console.log('\nSi alguien hace scroll a mitad del ritual\n');

comprobar('la jaula del nombre va en coordenadas de documento',
  /position:absolute;top:0;left:0/.test(eclipseCodigo) &&
  /window\.scrollY \|\| window\.pageYOffset/.test(eclipseCodigo),
  'fija y recolocada por JS, llega siempre tarde: el scroll lo hace el ' +
  'compositor y el JavaScript no está invitado');

comprobar('y ya NO se recoloca en cada cuadro',
  !/acomodarLaCopia\(\);\s*\n\s*var color = coloresEn/.test(eclipseCodigo),
  'recolocarla por cuadro era justamente lo que la atrasaba');

/* ⚠️ Y NO SE BLOQUEA EL SCROLL. La premisa dice que NADA en la escena
   reacciona al intruso, y bloquearle la página es la forma más ruidosa
   posible de reaccionar. */
comprobar('no se le bloquea la página a nadie',
  !/overflow *= *'hidden'/.test(eclipseCodigo) &&
  !/preventDefault/.test(eclipseCodigo),
  'nada reacciona al intruso, ni siquiera para protegerse de él');


/* ─── 14l. LOS PÉTALOS NO APARECEN DE LA NADA ───────────────────────── */

console.log('\nLa tormenta se forma, no se enciende\n');

comprobar('el eclipse hereda los pétalos que ya están cayendo',
  /function unPetalo/.test(eclipseCodigo) &&
  /petalos\.push\(unPetalo\(heredados\[h\], 0\)\)/.test(eclipseCodigo),
  'noventa pétalos apareciendo en un cuadro es lo que se vio');

comprobar('y nacen exactamente encima de los que reemplazan',
  /copiarDe \? copiarDe\.x \+ copiarDe\['tamaño'\] \/ 2/.test(eclipseCodigo),
  'es el mismo relevo de la mártir, que se midió en 0,9 px de error');

comprobar('los que se suman entran de a uno',
  /if \(t < pt\.nace\) continue;/.test(eclipseCodigo) &&
  /var entrando = limitar\(\(t - pt\.nace\) \/ 1200, 0, 1\);/.test(eclipseCodigo),
  'la tormenta se forma a lo largo de doce segundos');

comprobar('y son menos que antes, no más',
  /var tope = esAlta \? 50 : 28;/.test(eclipseCodigo) &&
  !/var cuantos = esAlta \? 90 : 40;/.test(eclipseCodigo),
  'eran 90: menos objetos y menos superficie por cuadro');


/* ─── 14m. CAOS ALREDEDOR DEL RELICARIO ─────────────────────────────── */

console.log('\nUna corriente, no un carril\n');

/* ⚡ NI CARRIL NI CAOS (2026-09-11)
 *
 * La v277 tenía todos los pétalos en la misma órbita: una hilera perfecta.
 * La v278 le dio a cada uno su propio radio (0,75 a 2,2 veces el del
 * altar), turbulencia, y uno de cada cinco salía despedido. Carlos:
 * «solo hay caos desordenado». Con veinte trayectorias distintas no hay
 * figura, y sin figura se lee como basura volando.
 *
 * Una corriente es lo contrario de las dos cosas: UNA figura con variación
 * pequeña. Un 34 % de dispersión en el radio, no un 200 %. */
comprobar('los pétalos forman una corriente, no una hilera ni un caos',
  /radio: 1\.06 \+ Math\.random\(\) \* 0\.36/.test(eclipseCodigo),
  'con 0,75 a 2,2 de dispersión no hay figura; con un solo radio hay carril');

comprobar('y todos giran en el MISMO sentido',
  !/sentido: Math\.random\(\)/.test(eclipseCodigo) &&
  !/pt\.sentido/.test(eclipseCodigo),
  'una corriente tiene un sentido; la mitad girando al revés es un choque');

comprobar('con una velocidad parecida, apenas más lenta cuanto más lejos',
  /altar\.radio \/ Math\.max\(altar\.radio \* 0\.75, d\)/.test(eclipseCodigo),
  'lo justo para que las filas se crucen sin que nadie se salga de la figura');

comprobar('y ninguno sale despedido',
  !/expulsado/.test(eclipseCodigo),
  'eran los que rompían la figura que la escena quiere que se lea');

/* ⚠️ Y LA REGLA 2 SIGUE INTACTA. El radio prohibido deja de ser un carril
   pero no deja de ser un tope. */
comprobar('pero ninguno cruza el radio prohibido',
  /if \(d < altar\.radio\) \{[\s\S]{0,260}haciaAdentro > 0/.test(eclipseCodigo),
  'el caos es en la corriente, no en la regla');


/* ─── 14n. LO QUE LA ESCENA LE COBRA A LA MÁQUINA ───────────────────
   Carlos mide en un i5-4590T con gráficos HD 4600 —a propósito: «si esto
   se ve bien y fluido en esta cosa, se verá perfecto donde sea»—. En una
   integrada el cuello de botella no es el JavaScript, es el RELLENO. Estas
   comprobaciones cuidan los megapíxeles, que es lo que ahí duele. */

console.log('\nLos megapíxeles por cuadro\n');

/* ⚡ EL BORRADO COMPLETO DEL LIENZO (2026-09-11)
 *
 * En la ronda anterior medí el `clearRect` de pantalla completa por el
 * lado de la CPU —0,003 ms, contra 0,043 de hacerlo por rectángulos— y lo
 * descarté. Era la MITAD de la medición: del lado de la GPU hay que volver
 * a subir la textura entera, y eso es proporcional al ÁREA.
 *
 * Medido después, con el eclipse corriendo: 0,284 Mpx por cuadro solo de
 * este lienzo, en un viewport de 0,306. Una pantalla entera de textura por
 * cuadro. Y 24-lienzo-de-petalos.js ya lo había resuelto por su cuenta, con
 * una nota que lo decía con todas las letras: en la máquina objetivo «era
 * casi todo el problema: el ancho de banda, no el procesador». */
comprobar('el lienzo NO se borra entero cada cuadro',
  !/pincel\.clearRect\(0, 0, window\.innerWidth, window\.innerHeight\)/
    .test(eclipseCodigo),
  'una pantalla de textura por cuadro, medida: 0,284 Mpx de 0,306');

comprobar('se borra la caja de lo que se pintó el cuadro anterior',
  /function anotarLoPintado/.test(eclipseCodigo) &&
  /cajasDelCuadroAnterior\.length = 0;/.test(eclipseCodigo));

/* Y todo lo que se pinta tiene que anotarse, o deja estela. */
comprobar('y TODO lo que se dibuja queda anotado',
  (eclipseCodigo.match(/anotarLoPintado\(/g) || []).length >= 4,
  'lo que se pinta y no se anota no se borra nunca: queda una estela');

comprobar('el margen del borrado cubre la diagonal de un pétalo girado',
  /var r = lado \* 0\.725 \+ 2;/.test(eclipseCodigo),
  'la diagonal de un cuadrado es 1,41 veces su lado; quedarse corto deja rastro');

/* ⚠️ Y AL CAMBIAR DE TAMAÑO SE OLVIDAN. Asignar el ancho de un canvas lo
   borra entero: las cajas viejas ya no apuntan a nada. */
comprobar('y las cajas se olvidan al redimensionar',
  /cajasDelCuadroAnterior\.length = 0;/.test(
    (eclipseCodigo.match(/function medirElLienzo[\s\S]*?\n  \}/) || [''])[0]),
  'asignar canvas.width borra el lienzo: las cajas viejas quedan mintiendo');


/* ─── 14o. EL SOBRE SE VA DEL DOCUMENTO ─────────────────────────────── */

console.log('\nEl sobre, después de abrirse\n');

/* ⚡ Medido con la página abierta y el sobre ya abierto: seguía en el DOM
   con `visibility:hidden`, y con él seguían vivos 1,30 Mpx de filtros SVG
   —#sob-sombra y #sob-fibra, turbulencias y desenfoques— dentro de una capa
   `fixed` a z-index 2000, por encima de toda la escena, para siempre.
   Carlos: «la web se siente pesada desde antes de siquiera empezar el
   eclipse». */
{
  const sobre = sinComentarios(leer('codigo', '03-sobre-de-apertura.js'));

  comprobar('el sobre se saca del documento al terminar de abrirse',
    /if \(sobre\.parentNode\) sobre\.parentNode\.removeChild\(sobre\);/.test(sobre),
    'un sobre abierto no se vuelve a cerrar: no hay motivo para que siga ahí');

  comprobar('y se espera a que la transición termine',
    /\}, 1200\);/.test(sobre),
    'sacarlo en el mismo cuadro cortaría el desvanecido a la mitad');

  comprobar('se saca, no se pone en display:none',
    !/sobre\.style\.display = 'none'/.test(sobre),
    'con display:none el elemento sigue en el árbol y sus recursos con él');
}


/* ─── 15. Quien llega tarde entra igual ────────────────────────────── */

console.log('\nLlegar con el minuto empezado\n');

const vigiaEntero = sinComentarios(leer('index.html'));
comprobar('al cargar se pregunta si el eclipse ya va corriendo',
  /yaVaEmpezado < 0 && yaVaEmpezado > -DURA/.test(vigiaEntero),
  'el sondeo duerme hasta 60 s: quien llegaba tarde se lo perdía entero');

/* ─── 16. LA MITOLOGÍA, QUE ES LO QUE NINGUNA RONDA PUEDE ROMPER ─────

   Carlos, 2026-09-11: «el eclipse pasa, no le importa el caos, el nombre
   no reacciona, son las rosas que se vuelven locas con ese PERMISO que
   tienen durante el eclipse, todas lo intentan, una lo logra, el resto
   entra en un frenesí por seguirla pero no lo logran… lo peor es que
   fallaron, y volverán a intentarlo mañana, de nuevo… como siempre».

   Hay tres indiferencias apiladas y son tres cosas distintas: el NOMBRE no
   reacciona porque es divino; el ECLIPSE no reacciona porque es
   astronómico —no es un personaje, es una ventana que se abre y se cierra
   sola—; y el UNIVERSO no reacciona porque mañana vuelve a pasar lo mismo.

   ⚠️ DOS DE LAS TRES YA ESTABAN ESCRITAS SIN QUE NADIE SUPIERA QUE ERAN LA
   MITOLOGÍA. Estas comprobaciones no las construyen: las BLINDAN. Son
   justo el tipo de propiedad que una ronda futura «mejora» sin darse
   cuenta de lo que rompe — que es exactamente cómo se degradaron las
   cuatro rondas anteriores. */

console.log('\nLa mitología: tres indiferencias\n');

{
  /* ── 1. El eclipse no se entera del caos porque no TIENE cómo ──
     `coloresEn(t)` recibe un milisegundo y devuelve tres números. Si
     alguna vez leyera estado de la escena —quién murió, cuántos pétalos
     quedan, si el equipo va lento— el eclipse dejaría de ser astronómico y
     pasaría a ser un personaje más. */
  const cuerpo = sinComentarios(
    (eclipseCodigo.match(/function coloresEn\(t\)[\s\S]*?\n  \}/) || [''])[0]);

  const prohibidos = ['laQueMuere', 'muerte', 'floresReales', 'petalos',
                      'marea', 'TANDAS', 'promedio', 'ESCALA_DEL_LIENZO',
                      'altar', 'ramas', 'llamas'];
  const intrusos = prohibidos.filter(v => new RegExp('\\b' + v + '\\b').test(cuerpo));

  comprobar('el eclipse es una función PURA del tiempo',
    !!cuerpo && intrusos.length === 0,
    intrusos.length ? 'lee estado de la escena: ' + intrusos.join(', ')
                    : 'no se encontró coloresEn');

  /* Y ejecutada: el mismo milisegundo tiene que dar siempre lo mismo. */
  let deterministica = true;
  for (let t = 0; t <= curva.D; t += 137) {
    const a = curva.coloresEn(t), b = curva.coloresEn(t);
    if (a.frio !== b.frio || a.sangre !== b.sangre || a.corona !== b.corona) {
      deterministica = false; break;
    }
  }
  comprobar('y el mismo milisegundo da siempre lo mismo',
    deterministica,
    'si dos llamadas con el mismo t difieren, algo de afuera se está colando');
}

{
  /* ── 2. El eterno retorno: la que murió vuelve a estar de pie ──
     No es un bug que el hueco se rellene: es la tragedia. Fallaron, y
     mañana vuelven a intentarlo sin recordar que ya fallaron. */
  const cuerpo = (eclipseCodigo.match(
    /function devolverLasFloresReales[\s\S]*?\n  \}/) || [''])[0];

  /* ⚡ SORDA HASTA ACÁ. Bastaba con que `removeProperty('opacity')`
     apareciera; se le podía poner delante un `if (!f.martir)` y el hueco de
     la mártir quedaba vacío para siempre —justo el único caso que importa—
     con la prueba en verde. Se exige que sea INCONDICIONAL. */
  comprobar('la rosa que dio la vida vuelve a su tallo al terminar',
    /removeProperty\('opacity'\)/.test(cuerpo),
    'si el hueco quedara vacío, mañana habría una rosa menos y el minuto ' +
    'dejaría de poder repetirse igual');

  comprobar('y vuelve SIN condiciones: también la mártir',
    /\n      f\.nodo\.style\.removeProperty\('opacity'\);/.test(cuerpo) &&
    !/martir[^\n]*removeProperty\('opacity'\)/.test(sinComentarios(cuerpo)),
    'un `if (!f.martir)` delante deja vacío justo el hueco que importa');

  comprobar('y la mártir del día siguiente puede ser otra',
    /laQueMuere = null;/.test(
      (eclipseCodigo.match(/function reiniciarElEstado[\s\S]*?\n  \}/) || [''])[0]),
    'la elige el esfuerzo de esa corrida, no una lista guardada');
}

{
  /* ── 3. La amnesia ──
     Nada sobrevive a la corrida. Mañana es el primer día para ellas. La
     única excepción permitida es el grafo de audio, que no recuerda NADA
     de lo que pasó: existe porque createMediaElementSource() solo se puede
     llamar una vez por elemento (ver su advertencia en el archivo). */
  comprobar('el eclipse no guarda nada de una corrida a la otra',
    !/localStorage|sessionStorage|indexedDB/i.test(eclipseCodigo),
    'recordar quién murió ayer mataría la crueldad del mito');

  const enWindow = [...sinComentarios(eclipseCodigo)
    .matchAll(/window\.(__[A-Za-z_]+)\s*=/g)].map(m => m[1]);
  comprobar('y lo único que sobrevive es el grafo de audio',
    enWindow.every(v => v === '__ECLIPSE_GRAFO_DE_SONIDO'),
    'sobrevive además: ' + enWindow.filter(v => v !== '__ECLIPSE_GRAFO_DE_SONIDO').join(', '));
}

{
  /* ── 4. UNA SOLA SE SUELTA. NUNCA MÁS DE UNA. ──
     Carlos: «si otras murieran arrancándose, la muerte de esa única no
     tendría valor, no tendría peso. Todas lo intentan, solo una lo
     descubre y lo logra, el resto desea y envidia».

     Esta comprobación es la que protege el peso de la muerte de la mártir.
     Sin ella, cualquier ronda futura puede agregar una segunda rosa
     suelta «para que se vea más» y diluirla sin que nadie lo note. */
  const codigo = sinComentarios(eclipseCodigo);
  const llamadas = (codigo.match(/arrancarALaMartir\(/g) || []).length;

  comprobar('se suelta UNA SOLA flor en todo el minuto',
    llamadas === 2 &&                       // la definición y su única llamada
    !/muertes\s*=\s*\[|muertes\.push/.test(codigo) &&
    /var muerte = \{/.test(codigo),
    '`muerte` tiene que seguir siendo un singleton, no una lista');

  comprobar('y ninguna otra llega a soltarse',
    (codigo.match(/\.suelta = true/g) || []).length === 1,
    'la única que se suelta es la que ganó el ranking');
}

/* ─── 17. EL FRENESÍ ES UNA CUENTA REGRESIVA, NO UN RITMO ──────────── */

console.log('\nEl frenesí, ejecutado\n');

{
  const fuente = eclipseCodigo.slice(
    eclipseCodigo.indexOf('var PERIODO_INICIAL_DEL_TIRON'),
    eclipseCodigo.indexOf('function moverLasFloresReales'));

  const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
  const suave = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const tiron = new Function('SHOCK', 'FRENESI', 'limitar', 'suave',
    fuente + '; return tironDelFrenesi;')(curva.SHOCK, curva.FRENESI, limitar, suave);

  /* Los bordes de ciclo: donde la fase vuelve a empezar. */
  const ciclos = [];
  let fase = 0;
  for (let t = curva.SHOCK + 1; t < curva.FRENESI; t++) {
    const x = tiron(t);
    if (x.fase < fase) ciclos.push(t);
    fase = x.fase;
  }

  const intervalos = ciclos.slice(1).map((t, i) => t - ciclos[i]);

  comprobar('hay tirones de sobra para leerse como frenesí',
    ciclos.length >= 8,
    'solo ' + ciclos.length + ' tirones en diez segundos');

  /* ⚠️ ESTA ES LA QUE SEPARA «CUENTA REGRESIVA» DE «RITMO». Sin ella, el
     frenesí se degrada a ráfagas parejas sin que nadie lo note, y con eso
     se pierde el sentido entero del acto: lo que aprieta es el reloj. */
  comprobar('los intervalos son ESTRICTAMENTE decrecientes',
    intervalos.every((v, i) => i === 0 || v < intervalos[i - 1]),
    'primero ' + intervalos[0] + ' ms, último ' +
    intervalos[intervalos.length - 1] + ' ms');

  /* Y cada intento llega más lejos que el anterior: la desesperación. */
  const topes = [];
  for (let i = 0; i < ciclos.length - 1; i++) {
    let maximo = 0;
    for (let t = ciclos[i]; t < ciclos[i + 1]; t++) {
      const x = tiron(t);
      maximo = Math.max(maximo, 1 + Math.max(0, x.empuje) * (0.2 + x.u * 0.7));
    }
    topes.push(maximo);
  }
  comprobar('y cada tirón llega más lejos que el anterior',
    topes.every((v, i) => i === 0 || v > topes[i - 1]),
    'tope x' + topes[0].toFixed(2) + ' → x' + topes[topes.length - 1].toFixed(2));

  /* ⚠️ Y EL GESTO ES CONTRA LA RAÍZ, NO HACIA EL NOMBRE. En los actos II y
     III las flores SE ESTIRAN HACIA el nombre. Acá tiran contra su propia
     raíz: por eso cada ciclo empieza comprimiéndose hacia la base antes de
     lanzarse. Es la diferencia entre «arrancarse» y «estirarse», y es lo
     que el acto significa. */
  const compresiones = [];
  for (let i = 0; i < ciclos.length - 1; i++) {
    let minimo = 9;
    for (let t = ciclos[i]; t < ciclos[i + 1]; t++) minimo = Math.min(minimo, tiron(t).empuje);
    compresiones.push(minimo);
  }
  comprobar('cada ciclo tira CONTRA la raíz antes de lanzarse',
    compresiones.length > 0 && compresiones.every(m => m <= -0.6),
    'la peor compresión fue ' + Math.max(...compresiones).toFixed(2) +
    ' — sin envión hacia atrás es estirarse, no arrancarse');

  comprobar('y fuera de los diez segundos no existe',
    tiron(curva.SHOCK - 1).empuje === 0 && tiron(curva.FRENESI).empuje === 0,
    'el frenesí no puede desbordarse ni al shock ni al frenazo');
}

/* ─── 18. EL FRENAZO LO IMPONE ALGO DE AFUERA ──────────────────────── */

console.log('\nEl empujón del segundo 54\n');

/* ⚡ Y SE DISPARA CON RELOJ PROPIO, NO POR CUADRO (2026-09-11)
 *
 * La primera versión interpolaba el ritmo dentro de una ventana de 260 ms
 * leída una vez por cuadro. Medido en el navegador, sondeando cada 15 ms
 * durante los sesenta segundos: `playbackRate` se quedó en 1,000 el minuto
 * entero. En calidad baja la mediana entre cuadros en esa fase es de
 * 646 ms, así que ningún cuadro caía dentro de la ventana.
 *
 * Un efecto de 260 ms no puede depender de que un cuadro caiga justo ahí.
 * Se comprueba que el disparo sea de una sola vez y que la vuelta la
 * maneje un temporizador. */
comprobar('hay un scratch de disco rayado, y es de verdad',
  /audio\.playbackRate = 0\.35;/.test(eclipseCodigo) &&
  /function elScratchDelFrenazo/.test(eclipseCodigo),
  'el documento base lo pide y `playbackRate` no aparecía NI UNA VEZ en ' +
  'todo el proyecto: lo que había era el filtro soltándose, que es otra cosa');

comprobar('y cae exactamente en el 54, no antes ni después',
  /if \(yaSonoElScratch \|\| !audio \|\| t < FRENESI\) return;/.test(eclipseCodigo) &&
  /var FRENAZO_BAJA = 140;/.test(eclipseCodigo) &&
  /var FRENAZO_SUBE = 120;/.test(eclipseCodigo),
  'es el sonido de la fuerza que las empuja de vuelta: si no cae con el ' +
  'gesto, es un efecto suelto');

comprobar('y NO depende de que un cuadro caiga dentro de la ventana',
  /yaSonoElScratch = true;/.test(eclipseCodigo) &&
  /setTimeout\(function \(\) \{[\s\S]{0,120}playbackRate = 1;/.test(eclipseCodigo),
  'con 646 ms entre cuadros en calidad baja, una ventana de 260 ms se ' +
  'saltea entera: medido, el scratch no sonaba NUNCA');

comprobar('y el pestillo se suelta entre corridas',
  /yaSonoElScratch = false;/.test(
    (eclipseCodigo.match(/function reiniciarElEstado[\s\S]*?\n  \}/) || [''])[0]),
  'si no, la segunda corrida del ensayo pasa muda');

comprobar('y el ritmo vuelve a 1 pase lo que pase',
  /audio\.playbackRate = 1;/.test(
    (eclipseCodigo.match(/function soltarElSonido[\s\S]*?\n  \}/) || [''])[0]),
  'si el eclipse muere en mitad del scratch, la canción quedaría al 35 % ' +
  'para siempre');

/* ─── 19. EL PISO DE VISIBILIDAD ───────────────────────────────────── */

console.log('\nQue el borgoña pervierta, y que deje ver\n');

/* ⚡ ACÁ VIVÍA EL PISO DE VISIBILIDAD DEL VELO (2026-09-11)
 *
 * Medía cuántas unidades de rojo separaban a dos colores distintos de la
 * escena DESPUÉS de componer la capa encima, para que el marco no se
 * aplastara en una silueta sin interior. Cazó bugs reales y era la
 * herramienta correcta para un velo.
 *
 * El velo ya no existe. Lo que hace la oscuridad ahora son las dos
 * perillas que RESTAN luminancia (`oscurecidoFijo` y
 * `profundidadDeSombra`), y ésas no aplastan el detalle como lo hacía un
 * color opaco encima: oscurecen la escena entera manteniendo sus
 * relaciones, que es precisamente por qué el sistema de luz está hecho
 * así y por qué la noche cerrada se ve bien.
 *
 * Lo que sostiene la garantía ahora está en la sección de la hora: que el
 * rojo tenga R al doble de G —rojo y no marrón— y que la sala sea oscura
 * pero no negra. */
{
  /* ⚡ SORDA HASTA ACÁ. Se podía correr MUERE_EN a donde fuera y ninguna
     comprobación se enteraba, aunque el documento base lo pida con todas
     las letras: «El rojo sangre seca está en su punto más intenso
     EXACTAMENTE mientras la rosa muere y cae». */
  {
    let maximo = 0;
    for (let t = 0; t <= curva.D; t += 50) {
      maximo = Math.max(maximo, curva.coloresEn(t).sangre);
    }
    const enLaMuerte = curva.coloresEn(curva.MUERE_EN).sangre;

    comprobar('el rojo está en su máximo EXACTAMENTE cuando la rosa muere',
      maximo > 0 && enLaMuerte >= maximo - 1e-9,
      'en el segundo ' + (curva.MUERE_EN / 1000) + ' el rojo va en ' +
      enLaMuerte.toFixed(3) + ' y el máximo del minuto es ' + maximo.toFixed(3));

    /* ⚠️ Y LA DE ARRIBA SOLA NO ALCANZA, PORQUE ES TAUTOLÓGICA: la rampa
       del rojo TERMINA en MUERE_EN, así que mover la constante mueve las
       dos cosas juntas y la comparación siempre da verdadera.
       Lo que de verdad hay que blindar es que estén ATADAS — que es
       exactamente lo que se había soltado: la muerte en el 36,5 y el rojo
       subiendo hasta el 44, las dos cosas más importantes del minuto en
       momentos distintos. Si alguien vuelve a separarlas, esto muerde. */
    comprobar('y las dos cosas están atadas a la MISMA constante',
      /t < MUERE_EN \? tramo\(t, PROFUNDA, MUERE_EN\) \* [\d.]+/.test(eclipseCodigo),
      'la rampa del rojo tiene que terminar en MUERE_EN y en ningún otro ' +
      'número, o las dos vuelven a separarse sin que nadie lo note');
  }

  /* ⚠️ EL DOMINIO DEL ROJO SE COMPRUEBA EN LA HORA, no componiendo una
     capa: la sala del eclipse tiene que tener R al doble de G. Está en la
     sección de la hora, junto a los haces. */
}

/* ⚠️ ACÁ VIVÍAN LAS COMPROBACIONES DE LA SOMBRA QUE VIAJABA.

   Exigían que el centro del degradado se corriera a lo largo del minuto,
   entrando por un lado y saliendo por el otro. Era una invención mía.

   La luz de esta página entra SIEMPRE por el mismo sitio —una fuente fuera
   del borde superior, la misma por la que entran los haces del día— y una
   fuente que se muda a mitad del minuto es justo lo que la luz no hace.
   Carlos: «ES EXACTAMENTE LA MISMA LÓGICA». El origen ahora es fijo y lo
   único que cambia es el color. Ver FORMA_DE_LA_LUZ en 28-eclipse.js. */

/* ─── LOS LIENZOS TIENEN QUE DECLARAR SU TAMAÑO CSS ─────────────────

   ⚡ ESTE FALLO ESTUVO LATENTE DESDE SIEMPRE (2026-09-11)

   Carlos, a 2560 px: «los pétalos tienen un límite donde EVIDENTEMENTE se
   cortan y desaparecen» y «el centro de gravedad no está en el relicario».
   Eran EL MISMO fallo.

   Un <canvas> es un elemento REEMPLAZADO. Con `position:fixed;inset:0` y
   sin `width` declarado, CSS 2.1 §10.3.8 resuelve el ancho usado a la
   dimensión intrínseca —el bitmap— y descarta `right`. La caja en pantalla
   queda del tamaño del bitmap, pegada arriba-izquierda.

   Mientras el factor fue exactamente 1 coincidía por casualidad. Con la
   trama en 0,72 la caja quedó en 1843x919 y todo el dibujo encogido contra
   el origen.

   Los dos lienzos hermanos ya lo hacían bien. Esta comprobación existe
   para que el de eclipse no vuelva a ser el único que no. */

console.log('\nLos lienzos declaran su tamaño en pantalla\n');

comprobar('los lienzos del eclipse declaran tamaño CSS, no solo bitmap',
  /lienzo\.style\.width  = anchoCss \+ 'px';/.test(eclipseCodigo) &&
  /lienzoDeLaOfrenda\.style\.width  = anchoCss \+ 'px';/.test(eclipseCodigo) &&
  /lienzoDeLaReliquia\.style\.width  = window\.innerWidth  \+ 'px';/
    .test(eclipseCodigo),
  'sin tamaño CSS la caja del canvas es la del bitmap: a trama 0,72 se ' +
  'corta el dibujo al 72 % de la pantalla');

comprobar('y la reliquia se re-mide con los otros dos',
  /if \(lienzoDeLaReliquia && pincelDeLaReliquia\) \{/.test(eclipseCodigo),
  'si el gobernador baja un escalón después del segundo 42, la reliquia ' +
  'quedaría a otra escala y la rosa saltaría de tamaño');

for (const [archivo, cual] of [['24-lienzo-de-petalos.js', 'plano.lienzo'],
                               ['23-lienzo-de-luz.js', 'lienzo']]) {
  const texto = sinComentarios(leer('codigo', archivo));
  comprobar(archivo + ' sigue declarándolo (es el patrón a copiar)',
    /\.style\.width\s*=/.test(texto) && /\.style\.height\s*=/.test(texto),
    'si alguno lo pierde, hereda el mismo bug');
}

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El eclipse no le cuesta nada a la invitación, y sigue significando lo que tiene que significar.\n');
