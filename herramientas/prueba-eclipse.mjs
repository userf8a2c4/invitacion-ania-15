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
const funciones  = (eclipse.match(/function suave\(x\)[\s\S]*?return \{ frio: frio, sangre: sangre \};\s*\}/) || [''])[0];

const curva = new Function(constantes + '\n' + funciones +
  '\n return { coloresEn: coloresEn, D: DURACION, PROFUNDA: PROFUNDA, ' +
  'TOTALIDAD: TOTALIDAD, SHOCK: SHOCK, FRENESI: FRENESI, MUERE_EN: MUERE_EN, ' +
  'PENUMBRA: PENUMBRA, UMBRA: UMBRA };')();

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
  curva.coloresEn(43000).sangre > 0.85);

const finFrio   = curva.coloresEn(curva.D - 1).frio;
const finSangre = curva.coloresEn(curva.D - 1).sangre;
comprobar('al segundo 60 no queda ni oscuridad ni sangre',
  finFrio < 0.02 && finSangre < 0.02,
  'quedó frío=' + finFrio.toFixed(3) + ' sangre=' + finSangre.toFixed(3));

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
  /if \(laQueMuere && t >= MUERE_EN\)/.test(eclipse));

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
  const desde = eclipseCodigo.indexOf('function terminar()');
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
                       '10-reproductor-de-musica.js', '24-lienzo-de-petalos.js']) {
  const texto = leer('codigo', archivo);
  comprobar(archivo + ' no sabe que el eclipse existe',
    !/eclipse/i.test(texto),
    'el eclipse actúa DESDE AFUERA; tocar estos archivos afecta a las otras 23:59');
}

comprobar('la calidad manda sobre la cantidad de rosas',
  /var CUANTAS = esAlta \? 220/.test(eclipse) && /marea\.length = Math\.floor/.test(eclipse),
  'entre más rosas y que vaya fluido, gana la fluidez');


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
  /alCambiarElAncho\(medirElLienzo\)/.test(eclipseCodigo),
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


/* ─── 15. Quien llega tarde entra igual ────────────────────────────── */

console.log('\nLlegar con el minuto empezado\n');

const vigiaEntero = sinComentarios(leer('index.html'));
comprobar('al cargar se pregunta si el eclipse ya va corriendo',
  /yaVaEmpezado < 0 && yaVaEmpezado > -DURA/.test(vigiaEntero),
  'el sondeo duerme hasta 60 s: quien llegaba tarde se lo perdía entero');

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El eclipse no le cuesta nada a la invitación, y sigue significando lo que tiene que significar.\n');
