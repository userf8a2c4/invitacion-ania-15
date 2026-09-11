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
                       '10-reproductor-de-musica.js', '24-lienzo-de-petalos.js']) {
  const texto = leer('codigo', archivo);
  comprobar(archivo + ' no sabe que el eclipse existe',
    !/eclipse/i.test(texto),
    'el eclipse actúa DESDE AFUERA; tocar estos archivos afecta a las otras 23:59');
}

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
comprobar('el gobernador sigue puesto',
  /marea\.length = Math\.floor/.test(eclipse),
  'entre más rosas y que vaya fluido, gana la fluidez');


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
  /var tope = TOPE_DE_INCLINACION \* \(1 \+ esfuerzo \* 0\.45\);/
    .test(eclipseCodigo) &&
  /if \(inclina >  tope\) inclina =  tope;/.test(eclipseCodigo),
  'más de eso deja de leerse como estirar y parece una flor rota');

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
  /t >= 26000 && t < 57000/.test(eclipseCodigo) &&
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
  eclipseCodigo.indexOf('capaDestello, lienzo].forEach'),
  'al revés habría un cuadro de pantalla iluminada sin sol');

/* ⚠️ LAS VELAS NO SE TOCAN: son la luz votiva del culto. Lo que las vuelve
   protagonistas no es que suban, es que todo lo demás se apague. */
comprobar('las velas no se tocan',
  !/lienzo-de-velas/.test(eclipseCodigo) && !/fuerzaDeVelas/.test(eclipseCodigo),
  'la sala pasa a cripta por contraste, no por aumento');

/* ACTO V · el nombre no se entera. El plano más importante del minuto. */
comprobar('el nombre tiene su propia luz',
  /function elNombreNoSeEntera/.test(eclipseCodigo) &&
  /elNombreNoSeEntera\(t\)/.test(eclipseCodigo));
comprobar('y se la escribe al CLON, no al original',
  /copiaDelNombre\.style\.setProperty\('--luz-x'/.test(eclipseCodigo),
  '14-haces-de-luz.js le escribe al original cada 32-90 ms: pelearse con ' +
  'él sería perder. El clon es nuestro');
comprobar('su oro no se detiene nunca',
  /t % 11500/.test(eclipseCodigo),
  'un bucle sin pausas: el mundo se apaga y el nombre sigue igual');
comprobar('y su intensidad no depende del eclipse',
  /'--luz-intensidad', '0\.62'/.test(eclipseCodigo),
  'fija y alta: esa luz nunca fue del sol');

/* ACTO VI · el anillo de diamante. */
comprobar('existe el anillo de diamante',
  /var capaDestello = capa\('#fff6e0', 'screen'\)/.test(eclipseCodigo));
comprobar('en screen, no en multiply',
  /capa\('#fff6e0', 'screen'\)/.test(eclipseCodigo),
  'las otras capas oscurecen multiplicando; esta tiene que AÑADIR luz');
comprobar('dura 150 ms y cae en el tercer contacto',
  /var desdeElAnillo = t - SHOCK;/.test(eclipseCodigo) &&
  /desdeElAnillo > 150/.test(eclipseCodigo),
  'más que eso deja de ser un relámpago y es un fundido a blanco');

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

/* ACTO VIII · no se calman: las obliga el frenazo. */
comprobar('las plantas NO se calman solas al final',
  /var retirada = 0;/.test(eclipseCodigo),
  'la luz vuelve y ellas siguen estirando: ese desacople es el efecto');

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

for (const [que, quien] of [
  ['las flores',  /'rotate\(' \+ \(f\.espejo \* gesto\)\.toFixed\(2\)/],
  ['las ramas',   /\(r\.espejo \* \(dobla \+ tiembla \+ latigazo\)\)/],
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

comprobar('se elige entre las más cercanas al nombre',
  /cerca\.length = Math\.max\(1, Math\.floor\(cerca\.length \* 0\.2\)\);/
    .test(eclipseCodigo),
  'quien se ofrece es quien ya estaba tocando el altar');

comprobar('y entre ésas, la más grande',
  /cerca\[i\]\.tamano > mejor\.tamano/.test(eclipseCodigo),
  'una cabeza de 14 px arrancándose no se ve, y el sacrificio hay que verlo');

comprobar('se la elige cuando el marco existe, no al empezar',
  /elegirALaQueMuere\(\);/.test(
    (eclipseCodigo.match(/function tomarLasFloresReales[\s\S]*?\n  \}/) || [''])[0]),
  'el marco nace después que el eclipse: elegirla en empezar() la dejaría en null');

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
comprobar('y el tamaño real sale de la matriz, no de la caja de pantalla',
  /function ladoRealDeLaFlor/.test(eclipseCodigo) &&
  /Math\.sqrt\(Math\.abs\(m\.a \* m\.d - m\.b \* m\.c\)\)/.test(eclipseCodigo),
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

      new Function('window', 'mundo', 'limitar', 't',
        fuenteMundo + '\nmoverElMundo(t);'
      )(ventana, mundo, (v, a, b) => Math.min(Math.max(v, a), b), ms);

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

    comprobar('a los 58,45 s la luz va volviendo, a mitad de camino',
      en58.largo > 0.4 && en58.largo < 0.8, 'dio ' + en58.largo.toFixed(3));

    comprobar('a los 59,9 s el sol está entero otra vez',
      Math.abs(en59.largo - 1.2) < 0.02, 'dio ' + en59.largo.toFixed(3));

    comprobar('y los rayos y las motas volvieron a su sitio',
      en59.haces === 4 && en59.motas === 32 && en59.fauna === 4,
      'haces ' + en59.haces + ', motas ' + en59.motas + ', fauna ' + en59.fauna);

    /* ⚠️ LAS PLANTAS NO SE CALMAN CUANDO VUELVE LA LUZ. Ese desacople es
       el momento más perturbador del minuto y se puede romper sin querer
       moviendo un número: la luz vuelve a los 57, el frenazo es a los 60. */
    comprobar('la luz vuelve ANTES que el frenazo',
      en58.largo > 0 && enElSegundo(56900).largo < 0.0001,
      'a los 56,9 tiene que seguir apagado y a los 58,45 ya volviendo');
  }
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
