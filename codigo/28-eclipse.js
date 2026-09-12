/* ══════════════════════════════════════════════════════════════════════
   28 · EL ECLIPSE DE SANGRE
   ══════════════════════════════════════════════════════════════════════

   QUÉ ES ESTE ARCHIVO
   Durante 23 h 59 min esto es una invitación. Durante 60 segundos —a las
   12:30:00.000 UTC, el minuto exacto en que nació Ania— deja de serlo y
   se convierte en un altar.

   No se anuncia, no se puede pedir, no se puede cortar. Quien esté en la
   página en ese momento vio algo que no era para él.

   ⚠️ ESTE ARCHIVO NO SE CARGA CASI NUNCA, Y ESO ES EL DISEÑO ENTERO
   No está en la lista `#scripts-de-la-escena` de index.html. Lo pide el
   vigía —quince líneas al final de ese archivo— diez segundos antes del
   instante. Quien no esté ahí no lo baja, no lo parsea y no lo ejecuta.
   La invitación no puede ponerse ni un gramo más pesada por culpa de
   esto; es la única regla que está por encima de todas las demás.

   ══════════════════════════════════════════════════════════════════════
   LA HISTORIA, QUE ES LO QUE HAY QUE NO PERDER

   Las flores despiertan → adoran algo que no les devuelve nada → una se
   esfuerza de más y muere sobre el nombre → las demás NO ven una muerte:
   ven un método → concluyen que su vida es un precio aceptable por rozar
   lo divino → intentan imitarla, contra el reloj → se les acaba el
   permiso y se las obliga a la sumisión → mañana otra vez.

   Referencias del registro: los Volturi (poder ceremonial e
   indiferente), Bram Stoker (la atracción imposible), Gómez y Morticia
   Addams (la devoción es teatral y gozosa, NO un terror encogido) y
   Lovecraft (la deidad que no te nota porque estás por debajo de su
   umbral de atención).

   NO es romántico. No es «la flor que ama al sol». Es adoración
   aristocrática sin retribución.

   ══════════════════════════════════════════════════════════════════════
   LAS TRES REGLAS QUE NO SE NEGOCIAN

   1. LO DIVINO ES EL TEXTO, NO EL RELICARIO.
      El óvalo, el marco y el filete son MUNDANOS: se oscurecen y se
      tiñen de sangre como todo lo demás. Lo único intocable es el
      <h1 class="portada__nombre">, o sea la palabra «ANIA». El
      continente sufre; el contenido no se entera.

   2. HAY UN RADIO QUE NADIE CRUZA.
      La marea rodea al nombre lo bastante cerca para desearlo y lo
      bastante lejos para no alcanzarlo nunca. La única que lo cruza es
      la que muere, y lo cruza porque se soltó: ya no es una flor
      estirándose, es un cuerpo cayendo.

   3. MUERE UNA SOLA.
      En el frenesí se rompen y quedan colgando, pero ninguna más muere y
      ninguna llega. Si muriera una segunda, el sacrificio de la primera
      dejaría de ser irrepetible.

   ══════════════════════════════════════════════════════════════════════ */

(function elEclipseDeSangre() {
  'use strict';

  /* ─── 1. LA LÍNEA DE TIEMPO ─────────────────────────────────────────
     Los cortes salen del guion. Se dejan como números con nombre porque
     el orden entre ellos ES la historia: mover uno sin mirar los otros
     rompe la causalidad (por ejemplo, acortar el shock deja al frenesí
     sin la revelación que lo provoca). */
  var DURACION   = 60000;
  var PENUMBRA   = 8000;    // despiertan
  var UMBRA      = 22000;   // la secta
  var PROFUNDA   = 35000;   // el esfuerzo
  var TOTALIDAD  = 42000;   // el rojo y la muerte
  var SHOCK      = 44000;   // dos segundos de vacío
  var FRENESI    = 54000;   // la revelación desatada
  /* de FRENESI a DURACION: la sumisión forzada */

  /* ⚡ LA MUERTE SE CORRIÓ AL 38,5 PARA QUE COINCIDA CON EL ROJO (2026-09-11)
   *
   * El documento base es explícito: «El rojo sangre seca está en su punto
   * más intenso EXACTAMENTE mientras la rosa muere y cae». Con la muerte
   * en 36,5 y el rojo subiendo hasta el 44, las dos cosas más importantes
   * del minuto pasaban en momentos distintos.
   *
   * Ahora `sangre` llega a su máximo en 38,5 y se queda ahí (ver
   * coloresEn), y la rosa se arranca en ese mismo milisegundo. Lo que
   * distingue a la cripta ya no es más rojo —no hay más— sino que la
   * APERTURA colapsa: la luz se cierra alrededor del nombre. */
  var MUERE_EN   = 38500;

  /* ─── 2. LO QUE HACE FALTA ANTES DE EMPEZAR ─────────────────────── */

  var nombre = document.querySelector('.portada__nombre');
  if (!nombre) return;

  var raiz = document.documentElement;

  /** El nivel de calidad, si 02-utilidades.js está (siempre lo está). */
  function calidad() {
    try {
      if (typeof nivelDeCalidad === 'function') return nivelDeCalidad();
    } catch (e) { /* nada */ }
    return raiz.classList.contains('calidad-baja') ? 'baja'
         : raiz.classList.contains('calidad-media') ? 'media' : 'alta';
  }

  /* ⚡ ESTA LÍNEA HIZO QUE NADIE VIERA NUNCA EL ECLIPSE COMPLETO (2026-09-10)
   *
   * Decía:
   *     var esAlta = String(calidad()).toLowerCase().indexOf('alta') !== -1;
   *
   * `nivelDeCalidad()` (02-utilidades.js) NO devuelve un texto: devuelve un
   * NÚMERO —CALIDAD_GRAFICA.ALTA vale 0—. Y `String(0)` es "0", que no
   * contiene "alta". O sea que `esAlta` daba `false` en todos los equipos,
   * siempre, desde el primer día.
   *
   * El respaldo de abajo —el que sí devuelve el texto 'alta'— no salvaba
   * nada, porque solo corre si `nivelDeCalidad` no existe, y existe siempre.
   *
   * QUÉ SE PERDÍA: 130 rosas en vez de 220, 40 pétalos en vez de 90, y
   * tomarLasFloresReales() salía en su primera línea, así que las flores del
   * marco no se movían nunca. El homenaje corrió siempre en su versión
   * reducida, en el equipo más potente igual que en el más humilde.
   *
   * ⚠️ SE COMPARA CONTRA EL VOCABULARIO DE QUIEN CONTESTA, no contra un
   * texto inventado acá. Si `CALIDAD_GRAFICA` está, se usa su constante; si
   * no está —porque 02-utilidades.js no cargó—, el respaldo de calidad()
   * devuelve texto y se compara como texto. Cada rama habla el idioma de su
   * fuente, que es lo que faltaba.
   */
  var esAlta = (typeof CALIDAD_GRAFICA === 'object' && CALIDAD_GRAFICA)
    ? calidad() === CALIDAD_GRAFICA.ALTA
    : String(calidad()).toLowerCase().indexOf('alta') !== -1;

  /* La flor más lejana del nombre. La usa la onda de conciencia para
     repartir los tiempos entre la primera flor que despierta y la última. */
  var lejaniaMaxima = 1;

  /* Cuándo se intentó por última vez recoger las flores del marco. Ver la
     nota de moverLasFloresReales: el marco puede nacer después que el
     eclipse. */
  var ultimoIntentoDeFlores = -1000;

  /* Cuántas rosas tiene la marea. El detalle va al máximo siempre —una
     rosa rasterizada cuesta lo mismo de estampar que una silueta— así
     que lo que se adapta al equipo es la CANTIDAD, no el detalle. */
  /* ⚡ LA MAREA DE ROSAS SUELTAS SE APAGÓ (2026-09-10)
   *
   * Eran 130 a 220 cabezas de rosa dibujadas en el lienzo, sin tallo,
   * apareciendo de la nada y flotando alrededor del nombre.
   *
   * No comunicaban nada. Una rosa sin tallo flotando en el aire no es una
   * planta deseando algo: es una mancha roja moviéndose. La escena
   * necesita que se entienda que son LAS ENREDADERAS DEL MARCO —las que
   * llevan toda la invitación ahí, quietas y dóciles— las que cobran
   * conciencia y se lanzan hacia el nombre. Eso ahora lo hacen ellas
   * mismas (ver moverLasFloresReales), que es de donde sale el sentido.
   *
   * ⚠️ NO SE BORRA EL SISTEMA, SE PONE EN CERO. Queda entero y explicado
   * por si alguna vez hace falta, y un bucle sobre un array vacío no
   * cuesta nada.
   *
   * ⚡ Y AHORA SON CERO (2026-09-11). Quedaba una: la rosa que se
   * sacrifica, que se elegía de esta lista. Desde que la mártir es una
   * flor DE VERDAD del marco —una que estaba sujeta a un tallo y se
   * arranca de él a la vista, ver la sección 8—, esta última rosa suelta
   * pasó a ser lo que eran las otras ciento veintinueve: una mancha roja
   * apareciendo de la nada al lado de algo que sí significa. No queda
   * ninguna flotando.
   */
  var CUANTAS = 0;

  /* ─── 3. LA CAPA ────────────────────────────────────────────────────

     ⚡ ERAN CUATRO CAPAS QUE MEZCLABAN. AHORA ES UNA QUE NO. (2026-09-11)

     Carlos midió la v277 en un HP ProDesk 600 G1 DM —un i5-4590T con
     gráficos HD 4600 y VBS encendido— y reportó 3 o 4 FPS en la zona del
     relicario. Eligió esa máquina a propósito: «si esto se ve bien y
     fluido en esta cosa, se verá perfecto donde sea».

     Medido en la página abierta, con el eclipse corriendo en el segundo 38
     y un viewport de 0,306 Mpx:

         superficie que MEZCLA, por cuadro ………… 0,871 Mpx
         relleno de lienzos, por cuadro ………………… 0,638 Mpx

     0,871 contra 0,306 son DOS PANTALLAS Y MEDIA leídas y recombinadas en
     cada cuadro. En el monitor de Carlos, a 1920×1080, son 5,9 Mpx por
     cuadro solo de mezcla. Y una HD 4600 no tiene memoria propia: comparte
     el bus con la CPU. Ahí estaban los 3-4 FPS — no en el JavaScript, que
     esta ronda ya había bajado de 22 ms a 4,7.

     ⚠️ POR QUÉ `mix-blend-mode` ES TAN CARO, QUE ES LO QUE NO ENTENDÍ
     ANTES. Una capa normal se compone con `source-over`: el compositor
     apila dos texturas y listo, es lo que hace toda la vida. Una capa que
     MEZCLA lo obliga a LEER DE VUELTA todo lo que quedó abajo, combinarlo
     píxel a píxel y volver a escribirlo. En una placa con memoria propia
     se nota poco; en una integrada, cada lectura viaja por el mismo bus
     que está usando la CPU.

     ⚠️ Y LA SOLUCIÓN NO ES BAJAR LA CALIDAD, ES NO NECESITAR LA MEZCLA.
     Un `rgba` oscuro compuesto normal sobre la escena la oscurece igual —
     con otra curva, no con la misma, pero la diferencia es de matiz y se
     compensa eligiendo los colores—. Y un `rgba` ROJO compuesto normal
     hace algo que el `multiply` no puede: sobre un negro da rojo oscuro en
     vez de dar negro. O sea que tiñe hacia el rojo en vez de apagar, que
     es exactamente lo que hace la luz ambiente de una totalidad y
     exactamente lo que Carlos venía pidiendo desde el principio.

     LAS CUATRO CAPAS DE ANTES Y QUÉ PASÓ CON CADA UNA

       · `capaFria`   (multiply #0a1622) ─┐
       · `capaSangre` (multiply #8a1f22) ─┼─→ las tres se funden en el
       · `capaCorona` (plus-lighter)     ─┘   degradado de ESTA capa
       · `capaDestello` (screen #ffb877) ───→ eliminada: «quita el flash»

     EL DEGRADADO ESTÁ CENTRADO EN EL RELICARIO, Y ESO ARREGLA DOS NOTAS
     MÁS. Carlos, mirándolo en el teléfono: «el centro de gravedad no es el
     relicario y la penumbra se ve como un cuadro cerrándose». Las dos
     cosas eran ciertas y venían del mismo sitio: la oscuridad se aplicaba
     pareja sobre un rectángulo. Un radial centrado en `altar` hace que la
     escena esté iluminada DESDE EL NOMBRE y que la caída sea redonda.

     ⚠️ EL DEGRADADO NO SE REESCRIBE POR CUADRO. Reescribir `background`
     obliga a repintar una superficie del tamaño de la pantalla, que era el
     motivo original de tener capas de color fijo. Se reescribe solo cuando
     el relicario se mueve de verdad —al arrancar y en `resize`— y lo que
     se anima por cuadro es únicamente la OPACIDAD, que la mueve el
     compositor sin repintar nada.

     ⚠️ Y POR QUÉ NO SE USA `filter` NI `backdrop-filter`
     Porque un filtro sobre un ANCESTRO del <h1> tiñe también al <h1>, y
     desde el hijo no hay forma de escaparse. Sería la manera silenciosa
     de romper la regla 1. Esta capa es HERMANA, nunca ancestro. */

  var capaDelEclipse = document.createElement('div');
  capaDelEclipse.className = 'eclipse-capa';
  /* ⚡ `will-change: opacity` — ESTE ES EL ARREGLO DE LOS 159 ms (2026-09-11)
   *
   * La v278 quitó `mix-blend-mode` para eliminar la mezcla, y eso estuvo
   * bien: medido, pasó de 0,871 Mpx mezclados por cuadro a cero. Pero el
   * blend mode era ADEMÁS lo que obligaba al navegador a darle a esta capa
   * su propia textura. Sin él, la capa dejó de estar promovida.
   *
   * Una capa sin textura propia se REPINTA cada vez que cambia su
   * opacidad. Y acá la opacidad cambia en cada cuadro, sobre un degradado
   * radial a pantalla completa, que además hay que rasterizar. En el
   * ProDesk de Carlos —i5-4590T con HD 4600— eso dio 159,5 ms por cuadro,
   * 6 fps. Cambié un coste de compositor por uno de pintura, que en una
   * integrada es muchísimo peor.
   *
   * Con `will-change: opacity` el degradado se rasteriza UNA vez y la
   * opacidad pasa a ser trabajo del compositor. Sin mezcla, que es lo que
   * la v278 ganó y hay que conservar.
   *
   * ⚠️ ESTE PROYECTO DESCONFÍA DE `will-change`, Y CON RAZÓN: hay notas en
   * 02-marco-victoriano.css y 12-haces-de-luz.css contando cómo 179
   * elementos promovidos se comían el 31 % del cuadro en «Layerize». Pero
   * el criterio que esas mismas notas fijan no es «will-change malo», es:
   * corresponde cuando el elemento ANIMA de verdad y NO vive dentro de un
   * contexto de mezcla. Es exactamente este caso. Y es UNA capa, que existe
   * sesenta segundos al día. */
  capaDelEclipse.style.cssText =
    'position:fixed;inset:0;pointer-events:none;opacity:0;' +
    'z-index:2147483000;will-change:opacity;';

  /* Los cuatro tramos del degradado, del altar hacia afuera.

     ⚠️ EL ÚLTIMO TRAMO NO ES NEGRO, Y ESO NO ES UN DESCUIDO. El marco —o
     sea LAS PLANTAS, o sea lo único que este minuto tiene para contar—
     vive en los BORDES de la pantalla, que es justo donde un velo radial
     centrado en el nombre oscurece más. Un último tramo negro apagaría
     exactamente el acontecimiento.

     Así que las esquinas se van a un rojo muy oscuro y no a negro. Lo que
     hace la cripta no es que los bordes desaparezcan: es que la luz
     alrededor del nombre COLAPSA (ver `aperturaDelVelo`, que encoge el
     degradado y deja casi toda la pantalla en el último tramo).

     Hechas las cuentas de composición normal sobre una rosa del marco
     —rgb(126, 27, 44)—, que es la comprobación que importa:

         en el esfuerzo (t=38 s) ……… rgb(102, 23, 28)   se ve y es roja
         en la cripta   (t=43 s) ……… rgb( 49, 13, 17)   silueta roja

     Un factor de dos entre uno y otro: se lee como un golpe de oscuridad
     sin que nada llegue a desaparecer. */
  /* ⚡ BORGOÑA QUE PERVIERTE TODO Y QUE DEJA VERLO TODO (2026-09-11)
   *
   * Carlos pidió «un rojo ladrillo o sangre borgoña que lo pervierta todo,
   * pero que aún sea visible». Haciendo las cuentas apareció un error en
   * lo que había.
   *
   * ⚠️ LA OSCURIDAD TIENE QUE VENIR DEL COLOR, NO DEL ALFA. Composición
   * normal (`fondo × (1−α) + color × α`) del último tramo sobre una rosa
   * del marco rgb(126, 27, 44) y sobre un fondo oscuro rgb(30, 24, 28):
   *
   *   antes  24, 8, 12 @ α 0,922 → rosa rgb(32, 9, 15) · fondo rgb(24, 9, 13)
   *                                LOS SEPARAN 8 → una mancha plana
   *   ahora  74,18, 28 @ α 0,757 → rosa rgb(87,20, 32) · fondo rgb(63,19, 28)
   *                                LOS SEPARAN 24 → se ve el detalle
   *
   * Con alfa casi opaco TODO converge al mismo valor y el marco se vuelve
   * una silueta sin interior: eso es «pervertir» a costa de «visible».
   * Bajando el alfa y saturando el color se consiguen las dos cosas.
   *
   * Y hay un argumento físico que lo respalda: una luna totalmente
   * eclipsada NO se pone negra, se pone cobre-rojo y perfectamente
   * visible. Por eso se llama luna de sangre. El drama de la totalidad no
   * viene del colapso de luminancia sino del colapso de la APERTURA, que
   * es lo que `aperturaDelVelo` ya hace.
   *
   * ⚠️ Y LOS RADIOS SE MIDEN, NO SE ESTIMAN. Antes eran porcentajes fijos
   * de la pantalla, y por eso el óvalo quedaba perdonado (ver la nota de
   * medirElAltar). Ahora cada tramo se ancla a una caja REAL:
   *
   *   'centro'   el punto del degradado
   *   'letras'   la caja entintada de la palabra «ANIA»
   *   'broche'   el óvalo dorado, `.portada__broche`
   *   'broche2'  el doble: el marco y las plantas
   *   'esquina'  la esquina más lejana
   *
   * Así el mismo código da la misma lectura en un monitor de 2560 y en un
   * teléfono vertical, que es justo lo que Carlos pide que sea igual.
   *
   * CÓMO QUEDA CADA COSA. Todos estos números salen de ejecutar las
   * constantes de este archivo, no de estimarlos, y se rehicieron el
   * 2026-09-11 cuando cambiaron las paletas y los alfas:
   *
   *   fase            velo   rosa del marco      separa   oro
   *   penumbra  4 s   0,068  rgb(122, 27, 44)      93     97 %
   *   umbra    15 s   0,255  rgb(110, 26, 42)      82     88 %
   *   esfuerzo 30 s   0,510  rgb( 95, 25, 40)      70     76 %
   *   muerte 38,5 s   0,970  rgb( 89, 23, 35)      45     57 %
   *   cripta   43 s   0,970  rgb( 89, 23, 35)      45     57 %
   *
   * «separa» es cuántas unidades de rojo quedan entre esa rosa y el fondo
   * oscuro de al lado: es la medida de que la escena NO se aplasta en una
   * silueta. Nunca baja de 45, contra un piso exigido de 18.
   *
   * «oro» es cuánta luz conserva el oro del relicario, rgb(198,158,92).
   * Ahí se lee el arco entero del eclipse: casi imperceptible al empezar,
   * oscuridad de verdad a los 30, y un salto a la mitad en la totalidad.
   *
   * ⚠️ EL ÓVALO SE CORROMPE MENOS DE LO QUE ESTE COMENTARIO DECÍA ANTES.
   * Acá figuraba «R/G 1,88». Es falso: con la paleta oscura de Carlos y
   * los alfas de sombra, el oro pasa de R/G 1,25 a 1,42 —queda en
   * rgb(142,100,65), un bronce deslucido—. Llegar a 1,8 exigiría subir el
   * alfa de ese tramo a 0,64, por ENCIMA del tramo de afuera (0,54), y el
   * degradado dejaría de crecer hacia el borde. El 1,88 venía de la
   * paleta anterior, más clara y con alfas más altos: era otro cálculo.
   *
   * Se deja dicho acá para que nadie vuelva a perseguir ese número sin
   * saber qué rompe.
   */
  /* ⚡ SOMBRA, NO MANO DE PINTURA. LOS ALFAS BAJARON. (2026-09-11)
   *
   * Carlos: «pero no plano, sino como sombra». Es una distinción técnica,
   * no de gusto, y decide estos cinco números.
   *
   * PLANO es lo que pasa con el alfa alto: todo lo que hay debajo converge
   * al color del velo y el marco se vuelve una silueta sin interior.
   * SOMBRA es color oscuro con alfa BAJO: lo de abajo sobrevive, apagado.
   * Una rosa en sombra sigue siendo reconociblemente una rosa.
   *
   * Con la paleta de abajo el COLOR ya hace el trabajo de oscurecer, así
   * que el alfa no tiene que hacerlo también. Medido sobre una rosa del
   * marco rgb(126,27,44) contra el fondo de al lado rgb(30,24,28):
   *
   *                        alfas de antes    alfas de sombra
   *   cripta, marco ……… separa 30          separa 45
   *   cripta, esquina … separa 24          separa 38
   *   luminancia ………… 35 / 22            38 / 28
   *
   * Se ve el interior del marco casi el doble mejor, y la escena igual se
   * oscurece: la luminancia de la rosa cae de 45 en el esfuerzo a 28 en la
   * cripta. Eso es una sombra cayendo encima, no un filtro puesto delante. */

  /* ⚡ EL VELO ERA ROJO DESDE EL SEGUNDO 1. (2026-09-11)
   *
   * Carlos, mirándolo: «vi un rojo vivo allí como sombra, ¿puedes cambiar
   * a un borgoña? o sea, la penumbra del eclipse de sangre».
   *
   * Tenía razón dos veces, y las dos son errores distintos.
   *
   * ⚠️ ERROR 1: EL COLOR NO CAMBIABA NUNCA. Esta capa es UNA sola con un
   * degradado fijo, y lo único que se anima es su opacidad. O sea que el
   * degradado rojo ya estaba puesto en el segundo 1 —más tenue, pero
   * rojo—. El documento base dice lo contrario con todas las letras: en la
   * penumbra «la luz ambiental se enfría y pierde un poco de saturación,
   * PERO TODAVÍA NO HAY ROJO», y el rojo «es exclusivo del momento de
   * máxima totalidad».
   *
   * Y la prueba no lo cazaba porque comprobaba el COEFICIENTE `sangre`
   * —que sí valía cero— y no el color que se pinta en pantalla.
   *
   * ⚠️ ERROR 2: NO ERA BORGOÑA, ERA LADRILLO. Los tramos de adentro eran
   * `176,58,40` y `150,44,32`: con G POR ENCIMA de B, que es naranja
   * quemado. El borgoña es al revés —B por encima de G— porque el vino
   * tira al violeta y el ladrillo al naranja. Es un número, no un gusto.
   *
   * LA SOLUCIÓN, sin volver a los 159 ms: dos paletas fijas y una mezcla
   * entre ellas gobernada por `sangre`. En penumbra y umbra la mezcla vale
   * CERO y el velo es acero frío puro; en la totalidad vale uno y es
   * borgoña. El degradado se reescribe solo cuando la mezcla cambia de
   * ESCALÓN —doce en todo el minuto— así que son doce rasterizaciones en
   * sesenta segundos en vez de tres mil seiscientas.
   *
   * Comprobado con la misma cuenta que hace la prueba, sobre una rosa del
   * marco rgb(126,27,44) y el fondo de al lado rgb(30,24,28):
   *
   *   penumbra 4 s ….. velo 0,041 · mezcla 0,00 · frío puro, sin rojo
   *   esfuerzo 30 s … velo 0,306 · mezcla 0,00 · sigue frío
   *   muerte 38,5 s … velo 0,970 · mezcla 1,00 · rgb(86,19,34), B>G ✓
   *   cripta 43 s ……… ídem, R/G 4,6 y los separan 30 unidades
   */

  /* ⚡ EL ECLIPSE ES LUZ, Y ENTRA POR DONDE ENTRA LA LUZ (2026-09-11)
   *
   * Carlos: «¿de dónde vienen los rayos de sol y de luna durante el día?
   * DEL SOL Y LA LUNA QUE NO SE VEN EN ESCENA. Entonces… ¿de dónde viene
   * la luz roja del eclipse? De la luna que no se ve en escena. ES
   * EXACTAMENTE LA MISMA LÓGICA.»
   *
   * Y antes: «arriba, con el relicario y las rosas, donde se ven los rayos
   * de luz en el día: allí rojo. Abajo, donde están los candelabros:
   * oscuro.»
   *
   * ⛔ LO QUE HABÍA ACÁ ESTABA MAL DE RAÍZ. Era un radial centrado en el
   * nombre cuya opacidad subía. El propio proyecto tiene escrita esa
   * lección desde hace rondas, en 22-luz-de-la-hora.js:429:
   *
   *     «EL PRIMER INTENTO FUE UN TINTE PLANO —el mismo color con la misma
   *      opacidad sobre toda la pantalla— y quedó fatal, con razón: eso no
   *      es luz, es un filtro de color pegado encima, y se lee exactamente
   *      como lo que es.»
   *
   * Construí justo lo que ese comentario advierte.
   *
   * ⚠️ LA GEOMETRÍA NO SE INVENTA: SE COPIA DE `veloDeLaSala()`.
   * Esa función (22-luz-de-la-hora.js:450) enumera las tres propiedades
   * que tiene la luz de verdad y que un tinte plano no tiene:
   *
   *   1. VIENE DE UN SITIO — la elipse nace FUERA del borde (-8 %), como
   *      si la fuente estuviera más allá de la ventana.
   *   2. SE APAGA CON LA DISTANCIA — muere antes de la mitad de la
   *      pantalla, así que abajo mandan los candelabros.
   *   3. NO MANDA SOBRE LO QUE YA ESTÁ ILUMINADO — las velas se dibujan
   *      por encima con suma aditiva y atraviesan el frío.
   *
   * El eclipse usa esa misma elipse, con otro color, y le suma su espejo
   * desde abajo para la zona de los candelabros. Dos degradados, UNA capa.
   */

  /** La elipse de la luz, copiada de veloDeLaSala(): ancha y baja. */
  var FORMA_DE_LA_LUZ = 'ellipse 130% 65%';

  /** Nace fuera del borde superior: la fuente está más allá de la ventana. */
  var FUENTE_DE_ARRIBA = '50% -8%';
  /** Y su espejo, para la oscuridad que sube desde los candelabros. */
  var FUENTE_DE_ABAJO  = '50% 108%';

  /* La caída, en fracciones del alfa máximo. Los mismos cortes que usa la
     luz del día: fuerte en la fuente, muerta antes de la mitad. */
  var CAIDA_DE_ARRIBA = [[1, 0], [0.62, 26], [0.28, 46], [0.08, 60], [0, 74]];
  var CAIDA_DE_ABAJO  = [[0, 26], [0.08, 40], [0.28, 54], [0.62, 74], [1, 100]];

  /** Alfa máximo de cada uno de los dos degradados. */
  /* ⚡ MENOS CARGA, MÁS SATURACIÓN (2026-09-11)
   *
   * Carlos: «hazlo más NATURAL… pero deja de cargarla».
   *
   * La luz de una totalidad lunar es LUZ REFRACTADA por la atmósfera de la
   * Tierra: la suma de todos los amaneceres y atardeceres del planeta a la
   * vez. Es MUY saturada y POCO intensa. Un rojo apagado a mucha opacidad
   * da barro; un rojo saturado a poca opacidad da luz.
   *
   * Medido sobre el oro del relicario rgb(198,158,92):
   *
   *   antes  104,28,40 @ 0,51 → rgb(150, 92,65)  luz 63 %  sat 0,57
   *   ahora  150,16,28 @ 0,26 → rgb(186,121,75)  luz 81 %  sat 0,60
   *
   * El oro sigue siendo oro. Y el fondo oscuro pasa a R/G 2,8 —rojo de
   * verdad— con las rosas MÁS saturadas que antes, no menos.
   *
   * La oscuridad no la tiene que poner esta capa: ya la ponen el sol
   * muriendo, los haces vaciándose y `#penumbra-profunda`. El trabajo de
   * acá es el COLOR. */
  var ALFA_DE_ARRIBA = 0.44;
  var ALFA_DE_ABAJO  = 0.62;

  /* Los colores. Índice 0 = la luz de arriba, índice 1 = la oscuridad de
     abajo. Se mezclan entre las dos paletas según `mezclaDelVelo`.

     ⚠️ LA REGLA QUE SEPARA EL VINO DEL LADRILLO: B POR ENCIMA DE G. El
     rojo que Carlos rechazó —«un rojo vivo»— tenía G por encima de B, que
     es naranja quemado. Acá los cuatro cumplen: 46>32, 26>16, 40>28,
     14>8. */
  var PALETA_FRIA    = ['18, 34, 62', '8, 12, 24'];
  var PALETA_BORGONA = ['150, 16, 28', '26, 6, 16'];

  /**
   * Interpola las dos paletas.
   *
   * @param {number} i - 0 la luz de arriba, 1 la oscuridad de abajo.
   * @param {number} k - 0 = acero frío, 1 = borgoña.
   * @returns {string} Los tres canales, listos para un `rgba(...)`.
   */
  function colorDelTramo(i, k) {
    var frio = PALETA_FRIA[i].split(',');
    var borg = PALETA_BORGONA[i].split(',');
    var canales = [];
    for (var c = 0; c < 3; c++) {
      var a = parseFloat(frio[c]), b = parseFloat(borg[c]);
      canales.push(Math.round(a + (b - a) * k));
    }
    return canales.join(', ');
  }

  /**
   * Arma uno de los dos degradados.
   *
   * @param {string} fuente - Dónde nace, fuera del borde.
   * @param {Array} caida   - Los cortes, en fracciones del alfa máximo.
   * @param {string} color  - Los tres canales.
   * @param {number} alfa   - El alfa máximo.
   * @returns {string}
   */
  function unDegradadoDeLuz(fuente, caida, color, alfa) {
    var paradas = [];
    for (var i = 0; i < caida.length; i++) {
      var fuerza = caida[i][0], pct = caida[i][1];
      paradas.push('rgba(' + color + ',' + (alfa * fuerza).toFixed(3) +
                   ') ' + pct + '%');
    }
    return 'radial-gradient(' + FORMA_DE_LA_LUZ + ' at ' + fuente + ', ' +
           paradas.join(', ') + ')';
  }

  /** El techo de `sangre`, para normalizar la mezcla. Sale de coloresEn. */
  var SANGRE_MAXIMA = 0.70;

  /** Cuánto borgoña hay ahora mismo, de 0 a 1. La mueve la secuencia. */
  var mezclaDelVelo = 0;
  var ultimoEscalonDeMezcla = -1;

  /** Doce escalones en el minuto: suficientes para que no se vea el salto. */
  var ESCALONES_DE_MEZCLA = 12;

  /**
   * Interpola las dos paletas en el tramo `i`.
   *
   * @param {number} i - Índice del tramo.
   * @param {number} k - 0 = acero frío, 1 = borgoña.
   * @returns {string} Los tres canales, listos para un `rgba(...)`.
   */
  function colorDelTramo(i, k) {
    var frio = PALETA_FRIA[i].split(',');
    var borg = PALETA_BORGONA[i].split(',');
    var canales = [];
    for (var c = 0; c < 3; c++) {
      var a = parseFloat(frio[c]), b = parseFloat(borg[c]);
      canales.push(Math.round(a + (b - a) * k));
    }
    return canales.join(', ');
  }

  /* Cuánto se abre el velo. 1 es su tamaño natural; más chico cierra la
     luz sobre el nombre, más grande la abre. Lo mueve la secuencia. */
  var aperturaDelVelo = 1;
  var ultimaAperturaPintada = -1;

  /** El milisegundo de la secuencia, para que el velo sepa dónde va la sombra. */
  var tDelVelo = 0;

  /* ⚠️ ACÁ VIVÍAN `desvioDelVelo`, `radioHastaLaEsquina` y
     `porcentajeDelAncla`. Las tres servían a un radial centrado en el
     nombre con las paradas ancladas a cajas medidas — un diseño que era
     mío y que no respetaba de dónde viene la luz en esta página. Se fueron
     con él. Ver la nota grande de FORMA_DE_LA_LUZ. */

  function pintarElVelo() {
    /* ⚠️ LA GEOMETRÍA ES FIJA, Y ESO ES EL PUNTO. La luz entra siempre por
       el mismo sitio —una fuente fuera del borde superior, la misma por la
       que entran los haces del día— así que el degradado no se mueve. Lo
       único que cambia con la secuencia es el COLOR y la opacidad de la
       capa. Ver la nota de FORMA_DE_LA_LUZ.

       Antes acá se recalculaba un centro a partir de la caja del nombre y
       se le sumaba un desvío que viajaba. Eso hacía que la luz cambiara de
       origen a mitad del minuto, que es justo lo que la luz no hace. */

    /* El color entra en la banda muerta cuantizado: doce escalones en el
       minuto entero, o sea doce rasterizaciones y no sesenta por segundo. */
    var escalonDeMezcla = Math.round(mezclaDelVelo * ESCALONES_DE_MEZCLA);
    if (escalonDeMezcla === ultimoEscalonDeMezcla) return;
    ultimoEscalonDeMezcla = escalonDeMezcla;

    var k = escalonDeMezcla / ESCALONES_DE_MEZCLA;

    /* El orden importa: el primero de la lista se pinta ENCIMA. La luz de
       arriba va primera para que su rojo mande sobre la zona del
       relicario, y la oscuridad de abajo queda por debajo. */
    capaDelEclipse.style.backgroundImage =
      unDegradadoDeLuz(FUENTE_DE_ARRIBA, CAIDA_DE_ARRIBA,
                       colorDelTramo(0, k), ALFA_DE_ARRIBA) + ', ' +
      unDegradadoDeLuz(FUENTE_DE_ABAJO, CAIDA_DE_ABAJO,
                       colorDelTramo(1, k), ALFA_DE_ABAJO);
  }



  /* ⚡ EL LIENZO SE MUDÓ DEBAJO DE LOS VELOS (2026-09-11)
   *
   * Estaba en `z 2147483001`, o sea POR ENCIMA de las tres capas de color.
   * Eso quería decir que los pétalos y las rosas del lienzo eran lo único
   * de la página que la oscuridad no tocaba: se dibujaban al 100 % de
   * brillo mientras el resto de la escena estaba al 5 %.
   *
   * Por eso Carlos los vio «mucho más grandes que los normales» aunque
   * midieran lo mismo, y por eso «destacan tanto como el bendito nombre».
   * Destacar es un atributo del nombre y de nada más.
   *
   * Ahora va DEBAJO de los velos: los pétalos se oscurecen y se tiñen como
   * todo lo demás, que es lo que son — parte del mundo, no parte de la
   * deidad. */
  var lienzo = document.createElement('canvas');
  lienzo.className = 'eclipse-capa';
  lienzo.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
                         'z-index:2147482999;';
  var pincel = lienzo.getContext('2d');

  /* Qué zonas ocupó el dibujo el cuadro anterior, para borrar solo eso.
     Ver la nota del `clearRect` en dibujar(). */
  var cajasDelCuadroAnterior = [];

  /** Anota que en este cuadro se pintó algo centrado en (x, y) de `lado`. */
  function anotarLoPintado(x, y, lado) {
    /* La diagonal de un cuadrado es 1,41 veces su lado: un pétalo girado
       ocupa más que su tamaño. Se usa 1,45 y se centra, que cubre
       cualquier ángulo. Los 2 px de más son por el suavizado del borde. */
    var r = lado * 0.725 + 2;
    cajasDelCuadroAnterior.push([x - r, y - r, r * 2, r * 2]);
  }

  /* ⚡ LA CAPA DE LA OFRENDA (2026-09-11)
   *
   * Carlos: «ahora mismo la rosa muerta se posa por detrás del nombre de
   * Ania». Era cierto y era una consecuencia del orden de capas: la jaula
   * del nombre está en `z …002` y el lienzo estaba en `…001`.
   *
   * Pero corregirlo abre una decisión de dirección, no de z-index. Si el
   * lienzo entero se sube por encima del nombre, los noventa pétalos
   * suben con él y volvemos al problema de que todo destaca. Y si se
   * queda abajo, la mártir —lo único que de verdad le pasó algo en todo el
   * minuto— queda tapada.
   *
   * Así que la mártir se muda a una capa propia, la más alta de todas.
   * Y de ahí sale la regla de fotografía de la escena entera:
   *
   *     En todo el minuto hay exactamente DOS cosas que la oscuridad no
   *     toca: EL NOMBRE y LA ROSA QUE SE OFRECIÓ.
   *
   * Todo lo demás vive debajo del velo. Es «en lugar de un cadáver, una
   * rosa» dicho con el orden de las capas.
   *
   * ⚠️ ESTE LIENZO BORRA SOLO LA CAJA DE LA ROSA, no la pantalla, porque
   * dibuja un único objeto y no tiene sentido tocar el resto. Y no se ata
   * al documento hasta el segundo 38,5: hasta entonces no hay nada que
   * poner en él y una capa de compositor vacía se paga igual. */
  var lienzoDeLaOfrenda = document.createElement('canvas');
  lienzoDeLaOfrenda.className = 'eclipse-capa';
  lienzoDeLaOfrenda.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
                                    'z-index:2147483003;';
  var pincelDeLaOfrenda = lienzoDeLaOfrenda.getContext('2d');
  var cajaAnteriorDeLaOfrenda = null;

  /* Densidad de píxeles: se topa en 2. Un teléfono con 3x pintaría más
     del doble de píxeles por el mismo resultado visible. */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ⚡ ESTE ARCHIVO ERA EL ÚNICO DE LA PÁGINA A DENSIDAD PLENA (2026-09-11)
   *
   * Dato leído, no estimado. Estos tres archivos declaran, los tres, el
   * mismo `FACTOR_POR_CALIDAD = { 0: 0.75, 1: 0.6, 2: 0.5 }` con
   * `MAXIMA_DENSIDAD = 1`:
   *
   *     24-lienzo-de-petalos.js:209
   *     23-lienzo-de-luz.js:99
   *     19-velas.js:120
   *
   * O sea que en calidad baja TODA la página dibuja a 0,5× lineal — un
   * cuarto de los píxeles. Este archivo no leía esa perilla: hacía
   * `innerWidth × dpr` y nada más, o sea 1,0×.
   *
   * En el monitor de Carlos —2560×1277, dpr 1— eso son 3,269 Mpx de trama
   * por cuadro contra los 0,817 de todos los demás lienzos. CUATRO VECES
   * la densidad de píxeles del resto de la escena, en la misma pantalla.
   * Nadie lo decidió: es que este archivo nunca se enteró de la perilla.
   *
   * ⚠️ POR QUÉ 0,72 Y NO 0,50. Podría usarse el mismo 0,50 del resto y
   * sería consistente. Se elige 0,72 porque le da al eclipse MÁS
   * resolución de la que el proyecto ya considera aceptable para todo lo
   * demás, y el piso de 0,50 —al que solo se llega si el equipo lo pide—
   * no baja de ese estándar ya probado. Carlos viene mirando la página a
   * 0,50 desde siempre sin una sola queja de nitidez.
   *
   * ⚠️ Y POR QUÉ SE PUEDE. Acá no hay texto ni bordes finos: son pétalos,
   * formas suaves y borrosas en movimiento. El tamaño CSS no cambia, así
   * que el compositor amplía y no se nota. Bajarle la resolución a
   * cualquier otra cosa de esta web se vería al instante.
   */
  var ESCALA_MINIMA_DEL_LIENZO = 0.50;

  var esBaja = (typeof CALIDAD_GRAFICA === 'object' && CALIDAD_GRAFICA)
    ? calidad() === CALIDAD_GRAFICA.BAJA
    : String(calidad()).toLowerCase().indexOf('baja') !== -1;

  var ESCALA_DEL_LIENZO = esBaja ? 0.72 : 1;

  /** Los escalones que el gobernador puede pedir, en orden. */
  var ESCALONES_DE_ESCALA = [0.60, 0.50];

  /**
   * Baja un escalón la trama del lienzo. Devuelve true si de verdad bajó.
   *
   * Cuando ya está en el piso devuelve false, y ahí el gobernador se calla
   * para el resto de la corrida: no hay nada más que ceder, y NUNCA se
   * cede reparto. Ver la nota grande del gobernador.
   */
  function bajarLaEscalaDelLienzo() {
    for (var i = 0; i < ESCALONES_DE_ESCALA.length; i++) {
      if (ESCALA_DEL_LIENZO > ESCALONES_DE_ESCALA[i] + 0.001) {
        ESCALA_DEL_LIENZO = ESCALONES_DE_ESCALA[i];
        medirElLienzo();
        return true;
      }
    }
    return false;
  }

  function medirElLienzo() {
    /* El piso es duro: ninguna ruta puede dejar la trama por debajo. */
    if (ESCALA_DEL_LIENZO < ESCALA_MINIMA_DEL_LIENZO) {
      ESCALA_DEL_LIENZO = ESCALA_MINIMA_DEL_LIENZO;
    }
    var trama = dpr * ESCALA_DEL_LIENZO;

    /* ⚡ EL TAMAÑO CSS FALTABA, Y POR ESO SE CORTABAN LOS PÉTALOS
     *   (2026-09-11)
     *
     * Carlos, mirando la página real a 2560 px: «los pétalos tienen un
     * límite donde EVIDENTEMENTE se cortan y desaparecen». Y además: «el
     * centro de gravedad no está en el relicario». Las dos cosas eran EL
     * MISMO FALLO.
     *
     * ⚠️ UN <canvas> ES UN ELEMENTO REEMPLAZADO. Con `position:fixed;
     * inset:0` pero SIN `width` declarado, CSS 2.1 §10.3.8 resuelve el
     * ancho usado a la dimensión INTRÍNSECA —el atributo `width`, o sea el
     * bitmap— y descarta `right`. La caja en pantalla queda del tamaño del
     * bitmap, pegada arriba-izquierda.
     *
     * Mientras el factor fue exactamente 1 (dpr 1, sin escala), bitmap y
     * viewport coincidían POR CASUALIDAD y el fallo estuvo latente desde
     * siempre sin que nadie lo viera. Al introducir ESCALA_DEL_LIENZO en
     * 0,72 la casualidad se terminó:
     *
     *     lienzo.width  = floor(2560 × 0,72) = 1843
     *     lienzo.height = floor(1277 × 0,72) =  919
     *
     * La caja medía 1843×919 arriba-izquierda: pasada esa línea no hay
     * elemento, y por lo tanto no hay pétalo. Y como todo el dibujo queda
     * encogido al 72 % contra el origen, el remolino caía en
     * 0,72 × (altar.x, altar.y) — arriba y a la izquierda del relicario.
     *
     * ⚠️ LOS DOS LIENZOS HERMANOS YA LO HACÍAN BIEN, y son el patrón:
     * 24-lienzo-de-petalos.js y 23-lienzo-de-luz.js asignan el bitmap Y
     * `style.width`/`style.height` en píxeles CSS. Éste era el único de los
     * tres que no.
     */
    var anchoCss = window.innerWidth;
    var altoCss  = window.innerHeight;

    lienzo.width  = Math.floor(anchoCss * trama);
    lienzo.height = Math.floor(altoCss  * trama);
    lienzo.style.width  = anchoCss + 'px';
    lienzo.style.height = altoCss  + 'px';
    pincel.setTransform(trama, 0, 0, trama, 0, 0);

    lienzoDeLaOfrenda.width  = lienzo.width;
    lienzoDeLaOfrenda.height = lienzo.height;
    lienzoDeLaOfrenda.style.width  = anchoCss + 'px';
    lienzoDeLaOfrenda.style.height = altoCss  + 'px';
    pincelDeLaOfrenda.setTransform(trama, 0, 0, trama, 0, 0);
    cajaAnteriorDeLaOfrenda = null;

    /* La reliquia nace en el segundo 42, después de esta función, así que
       puede no existir todavía. Cuando existe, se la re-mide acá con todo
       lo demás: si no, un escalón del gobernador o un resize la dejaban a
       otra escala que el lienzo del mundo y la rosa saltaba de tamaño. */
    if (lienzoDeLaReliquia && pincelDeLaReliquia) {
      lienzoDeLaReliquia.width  = lienzo.width;
      lienzoDeLaReliquia.height = lienzo.height;
      lienzoDeLaReliquia.style.width  = anchoCss + 'px';
      lienzoDeLaReliquia.style.height = altoCss  + 'px';
      pincelDeLaReliquia.setTransform(trama, 0, 0, trama, 0, 0);
    }

    /* Asignar el ancho de un canvas lo BORRA entero, así que las cajas del
       cuadro anterior ya no apuntan a nada. Dejarlas haría que el primer
       cuadro después del resize borrara zonas al azar. */
    cajasDelCuadroAnterior.length = 0;
  }
  medirElLienzo();

  /* ─── 4. SACAR EL NOMBRE DE LA JAULA ────────────────────────────────

     ⚠️ ACÁ ES DONDE LA REGLA 1 SE ROMPE SIN QUE SE NOTE, Y CUESTA VERLO.

     Lo obvio sería subirle el z-index al <h1> y listo. NO FUNCIONA:
     `.portada__contenido` tiene `position:relative; z-index:51`
     (estilos/04-portada.css:354), o sea que CREA UN CONTEXTO DE
     APILAMIENTO. Todo lo que hay adentro pinta dentro de ese nivel 51,
     por más z-index que se le ponga a un hijo. El nombre está enjaulado
     y desde adentro no hay número que lo saque.

     Subir el z-index de `.portada__contenido` tampoco sirve: se llevaría
     con él al antetítulo, al filete y al «XV Años», que son mundanos y
     TIENEN que teñirse.

     Así que se saca una copia del nombre a una capa propia, encima de
     todo, y al original se lo esconde dejando su lugar en la página
     (visibility, no display: si desapareciera, la portada se recolocaría
     y el relicario cambiaría de tamaño). Lo que se ve es la copia, y la
     copia no está dentro de ninguna capa teñida.

     Efecto secundario que resulta ser el correcto: la copia se queda con
     el destello dorado congelado donde estaba, porque el brillo lo mueve
     una variable CSS que ya no la alcanza. El nombre deja de reaccionar
     incluso a su propia animación. Es exactamente la indiferencia que se
     buscaba. */

  var jaula = null;              // la capa donde vive la copia
  var copiaDelNombre = null;
  var visibilidadOriginal = '';

  /* Las propiedades que hacen que el nombre se vea como se ve. Es la lista
     de respaldo para cuando `cssText` viene vacío — ver la nota de abajo.
     Son pocas a propósito: se copia lo que define la LETRA, no el layout,
     porque la copia se posiciona sola dentro de la jaula. */
  var ESTILOS_DEL_NOMBRE = [
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'word-spacing', 'color', 'text-transform', 'text-shadow',
    'text-align', 'white-space', '-webkit-text-stroke', 'background-image',
    'background-clip', '-webkit-background-clip', '-webkit-text-fill-color',
    'opacity', 'filter', 'transform'
  ];

  /**
   * Le pasa a la copia los estilos ya resueltos del original.
   *
   * ⚠️ `cssText` SOBRE UN ESTILO COMPUTADO VIENE VACÍO EN FIREFOX
   * (2026-09-10). Es no-estándar para `getComputedStyle`: Chrome y Safari
   * devuelven la declaración entera, Firefox devuelve "". Y no lanza
   * excepción, así que el `try` que había acá no saltaba: simplemente
   * asignaba una cadena vacía y seguía como si todo hubiera ido bien.
   *
   * Qué se veía: durante los 60 segundos, en Firefox, el nombre de Ania
   * salía con otro cuerpo de letra. `font-size: calc(var(--ancho-broche) *
   * 0.115)` está definido sobre `.portada__broche`, y la copia vive fuera
   * de la portada: la variable no resuelve y el navegador cae al tamaño
   * por defecto. Justo el elemento que el eclipse existe para honrar.
   *
   * Ahora se intenta `cssText` —que es una línea y trae todo— y si viene
   * vacío se copian a mano las que importan.
   *
   * @param {Element} origen
   * @param {Element} destino
   * @returns {void}
   */
  function copiarLosEstilosResueltos(origen, destino) {
    var resuelto;
    try { resuelto = window.getComputedStyle(origen); } catch (e) { return; }
    if (!resuelto) return;

    try {
      if (resuelto.cssText) { destino.style.cssText = resuelto.cssText; return; }
    } catch (e) { /* sigue por la lista */ }

    for (var i = 0; i < ESTILOS_DEL_NOMBRE.length; i++) {
      var propiedad = ESTILOS_DEL_NOMBRE[i];
      try {
        var valor = resuelto.getPropertyValue(propiedad);
        if (valor) destino.style.setProperty(propiedad, valor);
      } catch (e) { /* una propiedad que este navegador no conoce */ }
    }
  }

  function coronarElNombre() {
    visibilidadOriginal = nombre.style.visibility;

    jaula = document.createElement('div');
    jaula.className = 'eclipse-capa';
    /* ⚡ ABSOLUTA Y EN COORDENADAS DE DOCUMENTO, NO FIJA (2026-09-11)
     *
     * Era `position:fixed` recolocada con un `translate3d` en CADA cuadro.
     * Carlos: «si haces scroll durante la secuencia, el nombre se congela
     * y queda atrás». Es exactamente lo que tiene que pasar con ese
     * diseño: el navegador desplaza la página en el COMPOSITOR, sin pasar
     * por JavaScript, y una capa fija que se recoloca desde el hilo
     * principal llega siempre un cuadro tarde — y con el cuadro cargado
     * de plantas, muchos cuadros tarde.
     *
     * 19-velas.js ya tenía este mismo síntoma y lo resolvió igual: poner
     * la capa en coordenadas de DOCUMENTO para que la desplace el mismo
     * scroll nativo que mueve al original, sin ningún paso de JavaScript
     * de por medio (ver su nota, «la luz se atrasaba de la llama en scroll
     * rápido»).
     *
     * ⚠️ NO se bloquea el scroll, que sería la otra salida. La premisa
     * dice que NADA en la escena reacciona al intruso, y bloquearle la
     * página es la forma más ruidosa posible de reaccionar. */
    jaula.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;' +
                          'z-index:2147483002;isolation:isolate;';

    copiaDelNombre = nombre.cloneNode(true);
    copiaDelNombre.removeAttribute('id');

    /* Se le copian los estilos YA RESUELTOS. Hace falta porque el tamaño
       de letra sale de `--ancho-broche`, una variable que vive en un
       ancestro: fuera de la portada no resolvería y el nombre saldría
       con otro cuerpo. Se hace UNA vez, no por cuadro. */
    copiarLosEstilosResueltos(nombre, copiaDelNombre);

    copiaDelNombre.style.margin = '0';

    /* ⚠️ LA ÚNICA ESCRITURA QUE EL NOMBRE RECIBE EN TODO EL MINUTO.
     *
     * Se congela el pan de oro donde estaba en el instante de arrancar. Se
     * fija EXPLÍCITAMENTE en vez de confiar en que el clon herede el valor
     * por defecto: 14-haces-de-luz.js escribe `--luz-x` a varios destinos
     * y no hay que depender de dónde caiga el clon en el árbol.
     *
     * Después de esta línea, NADA vuelve a escribir sobre `copiaDelNombre`
     * ni sobre la jaula. Ni el velo, ni la muerte, ni el shock, ni el
     * frenesí, ni el frenazo. Simplemente es. */
    var luzCongelada = '';
    try {
      luzCongelada = getComputedStyle(nombre).getPropertyValue('--luz-x').trim();
    } catch (e) { luzCongelada = ''; }
    copiaDelNombre.style.setProperty('--luz-x', luzCongelada || '0.5');

    jaula.appendChild(copiaDelNombre);
    document.body.appendChild(jaula);

    nombre.style.visibility = 'hidden';
    acomodarLaCopia();
  }

  /* ⚡ ACÁ VIVÍA `elNombreNoSeEntera(t)`, Y HACÍA LO CONTRARIO DE SU NOMBRE
   *
   * Carlos, 2026-09-11: «el nombre no brilla, no se inmuta, no pulsa, no
   * se oscurece por el eclipse, no reacciona a la muerte, no reacciona a
   * la locura, no reacciona al eclipse… simplemente ES».
   *
   * La función escribía, EN CADA CUADRO:
   *
   *     var recorrido = (t % 11500) / 11500;
   *     copiaDelNombre.style.setProperty('--luz-x', recorrido.toFixed(4));
   *     copiaDelNombre.style.setProperty('--luz-intensidad', '0.62');
   *
   * `--luz-x` es la posición del pan de oro sobre las letras
   * (`background-position` en estilos/04-portada.css:478). O sea que el
   * destello recorría el nombre los sesenta segundos enteros, movido por
   * el eclipse. El nombre brillaba y pulsaba.
   *
   * ⚠️ Y LA JUSTIFICACIÓN QUE TENÍA ERA FALSA. Decía que sin esto el
   * nombre se apagaría con el sol, porque 14-haces-de-luz.js desploma
   * `--luz-intensidad` durante el eclipse. Los archivos dicen otra cosa:
   *
   *   · la regla `.portada__nombre` (estilos/04-portada.css:465-495) usa
   *     `--luz-x` y NADA MÁS. `--luz-intensidad` no aparece en ella —quien
   *     la usa es otra regla (04-portada.css:213) y las capas de luz
   *     (12-haces-de-luz.css:502), que no son el nombre.
   *   · el clon es un cloneNode de un <h1> que contiene SOLO TEXTO: no
   *     tiene descendientes a los que esa variable pudiera llegar.
   *
   * O sea que `setProperty('--luz-intensidad', …)` era una escritura sin
   * efecto. El nombre nunca iba a apagarse. Lo único que la función
   * lograba era lo que estaba prohibido.
   *
   * QUÉ HACE AHORA: nada. `--luz-x` se fija UNA vez al crear el clon, con
   * el valor que el original tenía en ese instante —así no hay un salto al
   * arrancar el minuto— y no se vuelve a tocar. El nombre se ve igual a
   * las 12:30:00.000 que a las 12:29:59.999, y sigue igual hasta el final.
   *
   * Es además el estado que el proyecto ya define para un nombre quieto:
   * estilos/04-portada.css:500 hace `background-position: 50% 0` bajo
   * `prefers-reduced-motion`. No se inventó nada.
   */

  /**
   * Deja la copia justo encima del original, en coordenadas de DOCUMENTO.
   *
   * ⚠️ YA NO SE LLAMA POR CUADRO, Y ESE ES EL ARREGLO. Sumarle el scroll
   * a la caja del original da una posición que NO depende de dónde esté la
   * página: mientras nadie cambie el tamaño de la ventana, sigue siendo
   * válida, y del desplazamiento se encarga el navegador solo. Llamarla en
   * cada cuadro era lo que hacía que el nombre se atrasara.
   *
   * Se la sigue llamando en el `resize`, que es lo único que puede mover
   * al original dentro del documento.
   *
   * @returns {void}
   */
  function acomodarLaCopia() {
    if (!jaula) return;
    var caja = nombre.getBoundingClientRect();
    jaula.style.width  = caja.width + 'px';
    jaula.style.height = caja.height + 'px';
    jaula.style.left = (caja.left + (window.scrollX || window.pageXOffset || 0)) + 'px';
    jaula.style.top  = (caja.top  + (window.scrollY || window.pageYOffset || 0)) + 'px';
  }

  function devolverElNombre() {
    nombre.style.visibility = visibilidadOriginal;
    if (jaula && jaula.parentNode) jaula.parentNode.removeChild(jaula);
    jaula = null;
    copiaDelNombre = null;
  }

  /* ─── 5. DÓNDE ESTÁ EL ALTAR, Y EL RADIO PROHIBIDO ─────────────── */

  var altar = { x: 0, y: 0, radio: 0, ancho: 0, alto: 0, radioLetras: 0, radioBroche: 0 };

  function medirElAltar() {
    var caja = nombre.getBoundingClientRect();
    altar.x = caja.left + caja.width  / 2;
    altar.y = caja.top  + caja.height / 2;
    /* La caja de la palabra. La usa la mártir para posarse en el filo de
       abajo en vez de en el medio. */
    altar.ancho = caja.width;
    altar.alto  = caja.height;

    /* El radio que nadie cruza (regla 2). Se calcula sobre la caja REAL
       del nombre para que valga igual en un teléfono vertical que en un
       monitor ancho: siempre queda un anillo proporcionado alrededor de
       la palabra, ni pegado ni perdido a media pantalla. */
    altar.radio = Math.max(caja.width, caja.height) * 0.95 + 26;

    /* ⚡ LA CAJA DEL <h1> NO ES LA CAJA DE LA PALABRA (2026-09-11)
     *
     * `<h1>` es un elemento de BLOQUE: su getBoundingClientRect devuelve el
     * ancho del CONTENEDOR, no el de las letras. Con los números reales de
     * la hoja de estilos —`--ancho-broche: min(94vw, 1120px, alto * 0.78)`
     * (estilos/04-portada.css:162), que en 2560×1277 da min(2406, 1120,
     * 996) = 996 px— la caja del nombre mide lo mismo que el relicario.
     *
     * Por eso el velo PERDONABA AL RELICARIO: su primer tramo, el de alfa
     * bajo, cubría el óvalo entero. Y por eso en el teléfono «el centro de
     * gravedad no es el relicario»: el degradado nunca se cerraba sobre la
     * palabra, se cerraba sobre el marco.
     *
     * Carlos: «la deidad no es el relicario, la deidad es el nombre de
     * Ania, todo es corruptible por el eclipse, incluso el relicario».
     *
     * Así que se miden DOS cajas más, y ninguna se estima:
     *   · la ENTINTADA de la palabra, con un Range sobre el contenido;
     *   · la del óvalo, `.portada__broche`.
     * Los tramos del velo se anclan a esas dos. Ver pintarElVelo(). */
    var entintada = medirLaCajaEntintada(nombre);
    altar.radioLetras = entintada
      ? Math.max(entintada.width, entintada.height) / 2
      : Math.max(caja.width, caja.height) * 0.22;

    var elBroche = broche || (broche = document.querySelector('.portada__broche'));
    var cajaDelBroche = null;
    if (elBroche) {
      try { cajaDelBroche = elBroche.getBoundingClientRect(); } catch (e) { cajaDelBroche = null; }
    }
    altar.radioBroche = (cajaDelBroche && cajaDelBroche.width > 1)
      ? Math.max(cajaDelBroche.width, cajaDelBroche.height) / 2
      : altar.radioLetras * 3;
  }

  var broche = null;

  /**
   * La caja ENTINTADA del contenido de un nodo, no la de su bloque.
   *
   * Un Range sobre el contenido devuelve la unión de los rectángulos del
   * texto, que para una palabra centrada es el ancho real de las letras.
   * Es la medición que faltaba: ver la nota de medirElAltar().
   *
   * @param {Element} nodo
   * @returns {DOMRect|null} La caja, o null si no se pudo medir.
   */
  function medirLaCajaEntintada(nodo) {
    try {
      var rango = document.createRange();
      rango.selectNodeContents(nodo);
      var caja = rango.getBoundingClientRect();
      if (rango.detach) rango.detach();
      if (caja && caja.width > 1 && caja.height > 1) return caja;
    } catch (e) { /* nada */ }
    return null;
  }
  medirElAltar();

  /* ─── 6. LA ROSA, RASTERIZADA UNA SOLA VEZ ──────────────────────────

     Se dibuja la rosa de verdad —la misma que ya usa la web— a un mapa
     de bits fuera de pantalla, y después se estampan cientos de copias
     desde ahí. Es la técnica que 24-lienzo-de-petalos.js ya usa para los
     pétalos, y es lo que permite tener detalle Y densidad a la vez: una
     rosa detallada, ya rasterizada, cuesta lo mismo de estampar que una
     silueta del mismo tamaño.

     Las flores del marco son `<use href="#tipo">`, así que el símbolo al
     que apuntan tiene que viajar dentro del SVG suelto o no se dibuja
     nada. Por eso se le pega adentro la biblioteca entera. */

  var LADO = 96;                       // píxeles del mapa de bits
  var mapaDeLaRosa = null;             // se llena si la rasterización sale

  /* Qué fracción del mapa de bits ocupa de verdad la rosa.
   *
   * El símbolo se dibuja en un viewBox de -30 a 30 y se rasteriza a 96 px,
   * pero la tinta no llega a los bordes: sobra margen. Sin saber cuánto,
   * la copia de la mártir saldría más chica que la flor que reemplaza y el
   * relevo se vería.
   *
   * Se MIDE, no se estima: se recorre el alfa del mapa y se busca su caja.
   * Son 9 216 píxeles una sola vez, al rasterizar. El número de abajo es
   * solo el respaldo para cuando el canvas no se deja leer.
   *
   * ⚠️ Solo hace falta el LADO, no el centro, porque los seis símbolos de
   * rosa están dibujados centrados en su propio origen —lo dice y lo usa
   * 07-marco-y-enredaderas.js en su nota de 2026-08-23— así que la tinta
   * ya está centrada en el mapa. */
  var tintaDeLaRosa = 0.92;

  /**
   * La caja de un símbolo de la biblioteca, en sus propias unidades.
   *
   * Se le pregunta al navegador en vez de suponerla: los seis símbolos
   * miden cosas distintas (de 40 a 87 unidades de ancho, medido) y el
   * recuadro escrito a mano que había antes recortaba a los tres más
   * anchos.
   *
   * @param {string} tipo - `#rosa-perfil`, por ejemplo.
   * @returns {?{x:number,y:number,width:number,height:number}}
   */
  function medirElSimbolo(tipo) {
    var svg = null;
    try {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '10');
      svg.setAttribute('height', '10');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;left:-9999px;top:0;' +
                          'opacity:0;pointer-events:none';

      var uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      uso.setAttribute('href', tipo);
      uso.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', tipo);
      svg.appendChild(uso);
      document.body.appendChild(svg);

      var caja = uso.getBBox();
      document.body.removeChild(svg);
      svg = null;

      if (caja && caja.width && caja.height) return caja;
    } catch (e) {
      if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
    }
    return null;
  }

  /* (`ladoRealDeLaFlor()` vivía acá. Se mudó a 02-utilidades.js porque la
     necesitan dos módulos que no se conocen entre sí: este, para que la
     copia de la mártir mida lo mismo que la flor que reemplaza, y
     06-petalos-con-fisica.js, para que un pétalo no sea el doble de
     grande que la rosa que tiene al lado. La nota de por qué NO se usa
     getBoundingClientRect está allá, con la función.) */
  function medirLaTintaDeLaRosa(mapa) {
    try {
      var datos = mapa.getContext('2d').getImageData(0, 0, LADO, LADO).data;
      var x0 = LADO, y0 = LADO, x1 = -1, y1 = -1;

      for (var y = 0; y < LADO; y++) {
        for (var x = 0; x < LADO; x++) {
          if (datos[(y * LADO + x) * 4 + 3] > 24) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }

      if (x1 < x0 || y1 < y0) return;          // mapa vacío: queda el respaldo
      var lado = Math.max(x1 - x0 + 1, y1 - y0 + 1);
      tintaDeLaRosa = limitar(lado / LADO, 0.4, 1);
    } catch (e) { /* canvas trabado: queda el respaldo */ }
  }

  function rasterizarLaRosa(cuandoEste) {
    var biblioteca = document.getElementById('biblioteca-de-rosas');
    if (!biblioteca) { cuandoEste(false); return; }

    /* ⚡ ACÁ SE PERDÍAN LAS ROSAS, TODAS, SIEMPRE (2026-09-10)
     *
     * Esto pedía `.flor-de-enredadera use` para saber qué símbolo dibujar.
     * Esas flores NO existen todavía: las construye
     * 07-marco-y-enredaderas.js cuando la escena se monta, y el eclipse se
     * carga antes — en el ensayo siempre, y en el eclipse de verdad cada
     * vez que alguien abre la invitación con el minuto ya empezado.
     *
     * Sin ese elemento, la función salía por `cuandoEste(false)`,
     * `mapaDeLaRosa` quedaba en null y las 130 rosas de la marea se
     * dibujaban con el respaldo: seis elipses en #12060a, un negro
     * rojizo, sobre un fondo ya negro. Eso es lo que se veía —lo que se
     * NO se veía—: puntos flotantes que parecían luciérnagas.
     *
     * El símbolo vive en la biblioteca del HTML estático, que está desde
     * el primer byte. Se lo pide a ella y no a un elemento que quizás no
     * nació todavía. Se sigue prefiriendo el del marco cuando existe,
     * para que el eclipse dibuje la misma flor que ya está en pantalla. */
    var tipo = '';

    var unaFlor = document.querySelector('.flor-de-enredadera use');
    if (unaFlor) {
      tipo = unaFlor.getAttribute('href') || unaFlor.getAttribute('xlink:href') || '';
    }

    if (!tipo) {
      /* La rosa más abierta de la biblioteca; si algún día se le cambia el
         nombre, se prueban las otras antes de rendirse. */
      var candidatas = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media', 'rosa-perfil'];
      for (var c = 0; c < candidatas.length; c++) {
        if (biblioteca.querySelector('#' + candidatas[c])) {
          tipo = '#' + candidatas[c];
          break;
        }
      }
    }

    if (!tipo) { cuandoEste(false); return; }

    /* ⚡ EL RECUADRO ESTABA CORTANDO LA ROSA POR LOS DOS LADOS (2026-09-11)
     *
     * Acá había un `viewBox="-30 -30 60 60"` escrito a mano. Medido en PBE
     * con getBBox(), los símbolos de la biblioteca NO caben en ese
     * recuadro: `rosa-perfil` y `rosa-tres-cuartos` miden 87,2 unidades de
     * ancho y empiezan en x = -43,2. O sea que el mapa de bits perdía un
     * 30 % de la flor, recortada a cuchillo por los dos costados.
     *
     * Con la marea de rosas flotantes no se notaba —eran manchas rojas
     * moviéndose—, pero la copia de la mártir tiene que ser LA MISMA FLOR
     * que acaba de desaparecer del marco, y una rosa a la que le faltan
     * los pétalos de los lados es otra flor.
     *
     * Ahora el recuadro sale de la caja REAL del símbolo, medida al
     * navegador, y es CUADRADO y centrado en ella: cuadrado para que girar
     * el mapa de bits no lo deforme, y centrado para que dibujarlo en el
     * centro de la flor lo deje exactamente encima de ella. El 4 % de
     * margen es para que el suavizado del borde no quede cortado. */
    var cajaDelSimbolo = medirElSimbolo(tipo);
    var medioLado = 30, centroX = 0, centroY = 0;

    if (cajaDelSimbolo) {
      medioLado = Math.max(cajaDelSimbolo.width, cajaDelSimbolo.height) * 1.04 / 2;
      centroX = cajaDelSimbolo.x + cajaDelSimbolo.width / 2;
      centroY = cajaDelSimbolo.y + cajaDelSimbolo.height / 2;
    }

    var recuadro = (centroX - medioLado) + ' ' + (centroY - medioLado) + ' ' +
                   (medioLado * 2) + ' ' + (medioLado * 2);

    /* ⚡ UN COMENTARIO DEJÓ AL ECLIPSE SIN ROSAS, DESDE EL PRIMER DÍA
     *   (2026-09-10)
     *
     * Un `data:image/svg+xml` lo parsea el navegador como XML ESTRICTO, no
     * como HTML. Y en XML un comentario NO PUEDE CONTENER `--`.
     *
     * La biblioteca de rosas tiene, adentro, un comentario que explica las
     * variables CSS de los pétalos y las nombra: «define las variables
     * --pet-cara, --pet-media, etc.». Ese doble guion hace que el
     * documento entero no parsee. El navegador no avisa nada: dispara
     * `onerror`, se cumple el plazo de 1 200 ms, `mapaDeLaRosa` queda en
     * null y las 130 rosas de la marea se dibujan con el respaldo —seis
     * elipses en #12060a, un negro rojizo— sobre un fondo ya negro.
     *
     * Así se veía el homenaje: puntos flotantes que parecían luciérnagas.
     * Nadie vio nunca una rosa. Se descubrió preguntándole al DOMParser
     * qué le molestaba, después de que la rasterización fallara sin decir
     * por qué.
     *
     * Se quitan los comentarios antes de armar el SVG. No hacen falta para
     * dibujar y son la única parte del marcado que XML rechaza.
     *
     * ⚠️ NO se toca el HTML: el comentario está bien donde está y explica
     * algo que hace falta entender. El que tiene que adaptarse es quien lo
     * mete en un contexto más estricto, que es este archivo. */
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
           'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
           'width="' + LADO + '" height="' + LADO + '" viewBox="' + recuadro + '">' +
        biblioteca.innerHTML.replace(/<!--[\s\S]*?-->/g, '') +
        '<use href="' + tipo + '" xlink:href="' + tipo + '"/>' +
      '</svg>';

    var imagen = new Image();
    var listo = false;

    imagen.onload = function () {
      if (listo) return;
      listo = true;
      try {
        var fuera = document.createElement('canvas');
        fuera.width = fuera.height = LADO;
        fuera.getContext('2d').drawImage(imagen, 0, 0, LADO, LADO);
        mapaDeLaRosa = fuera;
        medirLaTintaDeLaRosa(fuera);
        cuandoEste(true);
      } catch (e) { cuandoEste(false); }
    };
    imagen.onerror = function () {
      if (listo) return;
      listo = true;
      cuandoEste(false);       // se dibujan siluetas, ver dibujarUnaRosa()
    };

    /* Un plazo por si la imagen no resuelve ni a favor ni en contra: el
       eclipse tiene hora de salida y no puede quedarse esperando. */
    setTimeout(function () { if (!listo) { listo = true; cuandoEste(false); } }, 1200);

    imagen.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ─── 7. LA MAREA ───────────────────────────────────────────────────

     Cada rosa vive en coordenadas polares alrededor del altar: un ángulo
     y una distancia. Así el radio prohibido es una comparación y no una
     esperanza — no hay forma de que una rosa «se pase» por accidente.  */

  var marea = [];

  function sembrarLaMarea() {
    marea.length = 0;

    var lejos = Math.max(window.innerWidth, window.innerHeight) * 0.85;

    for (var i = 0; i < CUANTAS; i++) {
      var angulo = Math.random() * Math.PI * 2;

      /* Repartidas en un anillo. La raíz cuadrada evita que se apelmacen
         cerca del centro, que es lo que pasa repartiendo la distancia de
         forma pareja. */
      var t = Math.sqrt(Math.random());

      marea.push({
        angulo:  angulo,
        // dónde nace, siempre fuera del radio prohibido
        base:    altar.radio + 30 + t * lejos,
        // cuánto se estira ahora mismo (0..1)
        anhelo:  0,
        // su propia ansia: unas se esfuerzan más que otras
        ansia:   0.55 + Math.random() * 0.45,
        // cuándo brota, repartido a lo largo de la penumbra y la umbra
        brota:   Math.random() * UMBRA,
        escala:  0.34 + Math.random() * 0.5,
        giro:    (Math.random() - 0.5) * 0.7,
        // el balanceo propio, para que no se muevan todas igual
        fase:    Math.random() * Math.PI * 2,
        rota:    false,      // se quebró en el frenesí (pero NO murió)
        caida:   0,
      });
    }
  }

  /* ─── 8. LA QUE MUERE ───────────────────────────────────────────────

     ⚡ LA MÁRTIR ES UNA FLOR DEL MARCO, Y SE LA VE ARRANCARSE (2026-09-11)

     Hasta el v273 la que moría era una rosa de la marea: aparecía de la
     nada, flotando, y a los 36,5 s se «soltaba». No se soltaba de nada.
     Nunca había estado sujeta a ningún tallo, así que su sacrificio era
     una afirmación del código que en pantalla no tenía respaldo.

     Ahora es UNA FLOR CONCRETA DEL MARCO, de las que llevan toda la
     invitación ahí, quietas. Se la elige entre las que ya están al lado
     del nombre, y de ésas la más grande: la que se va a ver.

     Lo que la vuelve legible es lo que pasa ANTES. Desde el segundo 35 se
     esfuerza más que nadie: pasa el tope de inclinación que respetan las
     otras doscientas y tiembla el doble. Es la única que se está
     rompiendo, y eso es lo que hace que el ojo esté mirándola cuando se
     arranca.

     A los 38,5 s se le pone `opacity: 0` a la flor y se dibuja en el
     lienzo una copia en su posición exacta, con su tamaño y su giro
     exactos. Es la misma flor, en otro dibujo: no hay salto. Y en ese
     mismo cuadro su rama da un latigazo hacia atrás —la tensión contra la
     que estaba tirando se acabó de golpe—, que es el gesto que cuenta que
     algo se rompió ahí.

     Su tallo queda VACÍO el resto del minuto. Esa ausencia es la mitad
     del significado: no murió una rosa cualquiera, murió la que estaba
     en ese hueco. */
  var laQueMuere = null;
  var muerte = {
    x: 0, y: 0, vx: 0, vy: 0, giro: 0, giroVel: 0, suelta: false,
    escala: 0.5
  };

  /**
   * Elige a la mártir por ESFUERZO ACUMULADO, no por posición.
   *
   * ⚡ ANTES NO HABÍA RANKING NINGUNO (2026-09-11)
   *
   * Esto elegía la más grande del quinto más cercano, al montarse la
   * escena — o sea ANTES de que ninguna se hubiera esforzado— y después
   * `moverLasFloresReales` le pintaba el esfuerzo encima con
   * `var esfuerzo = f.martir ? tramo(…) : 0`. El esfuerzo era una
   * consecuencia de ser la mártir, no su causa.
   *
   * El documento base pide lo contrario, y con todas las letras: «El
   * algoritmo de esfuerzo lleva ranking en tiempo real» y «La rosa que ha
   * acumulado el MAYOR ESFUERZO alcanza el punto de ruptura». Es la idea
   * entera: muere la que más lo intentó.
   *
   * Ahora cada flor suma `Math.abs(inclina)` cada vez que le toca turno
   * (ver moverLasFloresReales). Todas reciben turno con la misma
   * frecuencia —es un round-robin por `turno % TANDAS`— así que las sumas
   * son comparables entre sí sin normalizar por nada.
   *
   * ⚠️ Y LA CERCANÍA YA NO SE IMPONE: EMERGE. La onda de conciencia hace
   * que las flores cercanas al nombre despierten antes (`suTurno` sale de
   * `f.distancia / lejaniaMaxima`), así que acumulan esfuerzo durante más
   * tiempo y ganan solas. No hace falta filtrarlas: el diseño ya las
   * favorece, y ahora eso se lee como mérito en vez de como decreto.
   *
   * Lo único que se conserva como condición dura es el TAMAÑO, y por el
   * motivo de siempre: una cabeza de 14 px arrancándose no se ve, y el
   * sacrificio tiene que poder mirarse. Se exige estar de la mediana para
   * arriba, que deja compitiendo a la mitad del marco.
   *
   * @returns {void}
   */
  function elegirALaQueMuere() {
    laQueMuere = null;
    if (!floresReales.length) return;

    var tamanos = [];
    for (var k = 0; k < floresReales.length; k++) tamanos.push(floresReales[k].tamano);
    tamanos.sort(function (a, b) { return a - b; });
    var medianaDeTamano = tamanos[Math.floor(tamanos.length / 2)] || 0;

    var mejor = null;
    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];
      if (f.tamano < medianaDeTamano) continue;
      if (!mejor || (f.esfuerzoAcumulado || 0) > (mejor.esfuerzoAcumulado || 0)) mejor = f;
    }

    /* Respaldo: si por lo que sea nadie acumuló nada —el marco nació tarde
       y el ranking no tuvo tiempo— gana la más grande y cercana, que es lo
       que hacía antes. Nunca se sale de acá sin mártir. */
    if (!mejor || !(mejor.esfuerzoAcumulado > 0)) {
      var cerca = floresReales.slice();
      cerca.sort(function (a, b) { return a.distancia - b.distancia; });
      cerca.length = Math.max(1, Math.floor(cerca.length * 0.2));
      mejor = null;
      for (var j = 0; j < cerca.length; j++) {
        if (!mejor || cerca[j].tamano > mejor.tamano) mejor = cerca[j];
      }
    }

    laQueMuere = mejor;
    if (laQueMuere) laQueMuere.martir = true;
  }

  /* ─── 9. LOS PÉTALOS DEL ECLIPSE ────────────────────────────────────
     Propios, para no tocar la física de 06. Los de la invitación se
     desvanecen y estos ocupan su lugar, atraídos por el altar en vez de
     por el suelo: la gravedad cambió de dueño. */

  var petalos = [];

  /* ⚡ LOS PÉTALOS ERAN ÓVALOS SÓLIDOS (2026-09-10)
   *
   * Se dibujaban con `pincel.ellipse(0, 0, tam, tam * 0.55, ...)`: una
   * mancha lisa, sin forma de pétalo. Al lado de los pétalos de la
   * invitación —que son tres dibujos de verdad— se leían como puntos.
   *
   * La invitación ya los tiene cargados y los deja a la vista en
   * `window.LienzoDePetalos.imagenes` (24-lienzo-de-petalos.js). Se usan
   * ESOS, así que el pétalo que cae durante el eclipse es el mismo que
   * caía un segundo antes. Si el registro no está —porque ese módulo se
   * apagó para medir— se cargan los archivos directamente.
   *
   * ⚠️ SE RASTERIZAN UNA VEZ, igual que hace 24-lienzo-de-petalos.js por
   * el mismo motivo: un <img> que apunta a un SVG se vuelve a rasterizar
   * en CADA rotación distinta, y acá hay 90 pétalos girando cada uno por
   * su cuenta. Serían 90 rasterizaciones vectoriales por cuadro. */
  var LADO_DEL_PETALO = 96;
  var mapasDePetalos = [];

  function prepararLosPetalos() {
    if (mapasDePetalos.length) return;

    var fuentes = (window.LienzoDePetalos && window.LienzoDePetalos.imagenes) || null;

    if (!fuentes) {
      fuentes = ['recursos/petalo-rosa-1.svg',
                 'recursos/petalo-rosa-2.svg',
                 'recursos/petalo-rosa-3.svg'].map(function (ruta) {
        var img = new Image();
        img.src = ruta;
        return img;
      });
    }

    fuentes.forEach(function (img) {
      var mapa = document.createElement('canvas');
      mapa.width = mapa.height = LADO_DEL_PETALO;

      var pintar = function () {
        try {
          mapa.getContext('2d').drawImage(img, 0, 0, LADO_DEL_PETALO, LADO_DEL_PETALO);
          mapa.listo = true;
        } catch (e) { /* se sigue con la silueta */ }
      };

      if (img.complete && img.naturalWidth) pintar();
      else img.addEventListener('load', pintar, { once: true });

      mapasDePetalos.push(mapa);
    });
  }

  /**
   * El radio de un pétalo del eclipse, en píxeles de pantalla.
   *
   * Se toma de los pétalos que ya están cayendo en la invitación: se mira
   * cuánto miden los suyos y se elige uno al azar dentro de ese rango. Se
   * dibuja con `drawImage(mapa, -tam, -tam, tam*2, tam*2)`, o sea que `tam`
   * es el RADIO y el lado es el doble — de ahí la división.
   *
   * @returns {number}
   */
  function tamanoDeUnPetalo() {
    var medidas = [];

    try {
      var planos = window.LienzoDePetalos && window.LienzoDePetalos.planos;
      if (planos) {
        for (var nombre in planos) {
          if (!Object.prototype.hasOwnProperty.call(planos, nombre)) continue;
          var lista = planos[nombre];
          for (var i = 0; i < lista.length; i++) {
            var t = lista[i] && lista[i]['tamaño'];
            if (t > 0) medidas.push(t);
          }
        }
      }
    } catch (e) { /* se usa el respaldo */ }

    if (medidas.length) {
      var cual = medidas[(Math.random() * medidas.length) | 0];
      return cual / 2;
    }

    /* Respaldo: la misma proporción con el marco que usa 06, a ojo, para no
       volver a un número fijo que en un teléfono se ve enorme. */
    var grosor = limitar(window.innerWidth * 0.034, 20, 72);
    var escala = limitar(grosor / 49, 0.34, 1.15);
    return (18 + Math.random() * 26) * escala / 2;
  }

  /**
   * Un pétalo nuevo del eclipse, con su sitio en la corriente.
   *
   * @param {Object} [copiarDe] - un pétalo de la invitación, si lo hay.
   * @param {number} [naceEn] - en qué milisegundo entra en escena.
   * @returns {Object}
   */
  function unPetalo(copiarDe, naceEn) {
    return {
      /* Si hay de dónde copiar, nace EXACTAMENTE donde estaba el pétalo de
         la invitación al que reemplaza. Ver sembrarLosPetalos(). */
      x: copiarDe ? copiarDe.x + copiarDe['tamaño'] / 2 : Math.random() * window.innerWidth,
      y: copiarDe ? copiarDe.y + copiarDe['tamaño'] / 2 : Math.random() * window.innerHeight,
      vx: 0, vy: 0,
      tam: copiarDe ? copiarDe['tamaño'] / 2 : tamanoDeUnPetalo(),
      giro: copiarDe ? (copiarDe.angulo || 0) * Math.PI / 180
                     : Math.random() * Math.PI * 2,
      giroVel: (Math.random() - 0.5) * 0.05,
      cual: (Math.random() * 3) | 0,
      posada: false,

      /* Cuándo entra. Los heredados, ya; los de más, repartidos a lo largo
         de los primeros 12 s, cada uno con su propio desvanecido. */
      nace: naceEn || 0,

      /* ── SU SITIO EN LA CORRIENTE ──
         Cada pétalo tiene su propio radio, su propia velocidad angular y
         su propia turbulencia. Ver la nota de la corriente en dibujar(). */
      /* Un radio parecido para todos, con un 18 % de variación: lo justo
         para que no sea una hilera, lo poco para que siga siendo UNA
         figura. Con la dispersión de antes (0,75 a 2,2) se leía como caos. */
      radio: 1.06 + Math.random() * 0.36,     // × altar.radio
      prisa: 0.88 + Math.random() * 0.24,
      fase: Math.random() * Math.PI * 2
    };
  }

  /* ⚡ LOS PÉTALOS APARECÍAN DE LA NADA (2026-09-11)
   *
   * Carlos: «al iniciar la secuencia, de un cuadro a otro aparecen pétalos
   * de la nada». Era literal. Esto creaba noventa pétalos en posiciones al
   * azar EN UN SOLO CUADRO, mientras los de la invitación se desvanecían
   * en 900 ms. Dos poblaciones distintas, sin relevo: una aparecía de
   * golpe y la otra se iba despacio.
   *
   * Ahora el eclipse HEREDA los pétalos que ya están cayendo: se copia la
   * posición, el tamaño y el giro de cada uno, así que los suyos arrancan
   * exactamente encima de los de la invitación mientras esos se apagan. Es
   * el mismo relevo que ya se comprobó con la mártir, donde la copia queda
   * a 0,9 px de la flor que reemplaza.
   *
   * Y los que se suman —hasta unos cincuenta— NO aparecen: entran de a uno
   * a lo largo de los primeros doce segundos, cada uno con su propio
   * desvanecido. La tormenta se forma, no se enciende.
   *
   * ⚠️ DE PASO CUESTA LA MITAD. Eran 90 en calidad alta; ahora son los que
   * ya había más los que entran, con tope en 50. Menos objetos y menos
   * superficie pintada por cuadro, que es la condición que Carlos puso por
   * encima de todo lo demás.
   */
  function sembrarLosPetalos() {
    prepararLosPetalos();
    petalos.length = 0;

    /* Los que ya están cayendo, tal cual están. */
    var heredados = [];
    try {
      var planos = window.LienzoDePetalos && window.LienzoDePetalos.planos;
      if (planos) {
        for (var nombrePlano in planos) {
          if (!Object.prototype.hasOwnProperty.call(planos, nombrePlano)) continue;
          var lista = planos[nombrePlano];
          for (var j = 0; j < lista.length; j++) {
            if (lista[j] && lista[j].activo && lista[j]['tamaño'] > 0) {
              heredados.push(lista[j]);
            }
          }
        }
      }
    } catch (e) { /* sin invitación de la que heredar */ }

    for (var h = 0; h < heredados.length; h++) {
      petalos.push(unPetalo(heredados[h], 0));
    }

    /* Y los que la tormenta va sumando. */
    var tope = esAlta ? 50 : 28;
    var cuantosFaltan = Math.max(0, tope - petalos.length);
    for (var i = 0; i < cuantosFaltan; i++) {
      petalos.push(unPetalo(null, 1200 + (i / Math.max(1, cuantosFaltan)) * 11000));
    }

    /* Si no había ni invitación ni sitio para sumar —el ensayo con los
       pétalos apagados para medir— igual tiene que haber tormenta. */
    if (!petalos.length) {
      for (var k = 0; k < 24; k++) petalos.push(unPetalo(null, k * 400));
    }
  }


  /* ─── 10. LAS ROSAS DE VERDAD, LAS DEL MARCO ────────────────────────
     Se transforman desde afuera, guardando lo que tenían. NO se toca
     07-marco-y-enredaderas.js ni su configuración congelada: se le pone
     un estado encima y se retira.

     Solo en calidad alta. En un equipo flojo quedan estáticas y el
     eclipse ocurre igual con la marea, la luz y el nombre. */

  var floresReales = [];

  /* ⚠️ SE ESCRIBE `style.transform`, NO EL ATRIBUTO (2026-09-10)
   *
   * Este bloque escribía `setAttribute('transform', ...)`. En SVG, la
   * propiedad CSS `transform` LE GANA al atributo de presentación del mismo
   * nombre — y 07-marco-y-enredaderas.js anima estas mismas flores con
   * `flor.movil.style.transform` cuando el mouse pasa cerca (ver su nota:
   * se cambió de atributo a estilo justamente por rendimiento).
   *
   * O sea: cualquier flor que el mouse hubiera rozado alguna vez en la
   * sesión conservaba su `style.transform` inline y habría ignorado al
   * eclipse por completo. Unas flores se movían y otras no, según por dónde
   * hubiera pasado el dedo media hora antes.
   *
   * Nunca se vio porque `esAlta` era falso y este bloque no llegaba a
   * correr (ver la nota grande de esAlta, arriba). Al arreglar aquello,
   * esto salía a la luz. Se escribe por el mismo canal que 07 para que el
   * último que escribe mande, que es lo que uno espera.
   */
  /* ⚡ LAS PLANTAS DEL MARCO SON LAS PROTAGONISTAS (2026-09-10)
   *
   * Antes esto era un adorno: las flores del marco temblaban un poco,
   * solo en calidad alta, mientras el peso de la escena lo llevaba una
   * marea de 130 rosas sueltas dibujadas en el lienzo.
   *
   * Esas rosas sueltas no comunicaban nada. Aparecían de la nada, sin
   * tallo, flotando: no eran plantas, eran manchas rojas moviéndose. Lo
   * que la escena quiere contar es otra cosa —las enredaderas que
   * enmarcan la invitación, siempre dóciles, cobran conciencia, desean el
   * nombre y entran en una histeria colectiva de adoración— y eso solo se
   * puede contar con las plantas QUE YA ESTÁN AHÍ. Una planta que se
   * retuerce hacia el nombre significa algo. Una rosa flotando, no.
   *
   * ⚠️ CADA FLOR PIVOTA SOBRE SU CUELLO, y eso es lo que hace posible
   * todo esto. 07-marco-y-enredaderas.js le pone a cada `__movil` un
   * `transform-origin` en el punto donde la flor se une al tallo (ver su
   * nota de 2026-08-23, que corrigió justamente que las flores "se
   * soltaban y volaban"). Así que rotarla no la despega: la DOBLA sobre
   * su tallo, como se dobla una planta que estira hacia algo.
   *
   * ⚠️ YA NO SE EXIGE CALIDAD ALTA. Cuando esto era un adorno, saltárselo
   * en un equipo flojo no costaba nada. Ahora es la escena: sin esto no
   * hay eclipse, solo una pantalla que se pone roja.
   */
  /* ⚡ LA MITAD DEL CULTO ESTIRABA AL REVÉS (2026-09-11)
   *
   * Medido en PBE sobre el v273, con la página viva: de 198 flores, 94
   * se inclinaban ALEJÁNDOSE del nombre. De 80 nudos, 40. De 32 llamas,
   * 16. Casi exactamente la mitad de todo.
   *
   * La causa es que el marco no dibuja dos lados: dibuja UNO y lo
   * refleja. `.marco__ramillete--derecho`, `--intermedio-derecho` y las
   * plantas del lado derecho llevan `transform: scaleX(-1)`
   * (estilos/02-marco-victoriano.css:379, :401). Es la decisión correcta
   * —es el mismo dibujo, cuesta la mitad— y llevaba ahí desde agosto sin
   * molestar a nadie, porque hasta ahora nadie le escribía un giro a una
   * flor desde afuera.
   *
   * Dentro de un contenedor reflejado, un `rotate(30deg)` se ve en
   * pantalla como `rotate(-30deg)`: el espejo invierte el sentido de los
   * ángulos. Y `haciaElNombre` se calcula en coordenadas DE PANTALLA
   * —con getBoundingClientRect—, así que para esas flores el número
   * correcto se aplicaba al revés y la flor se apartaba del altar.
   *
   * No se veía como un error: se veía como que «algunas no despiertan
   * tanto». Un culto donde la mitad de los fieles le da la espalda al
   * dios, exactamente en la escena cuyo único asunto es que TODAS estiran
   * hacia el nombre.
   *
   * Se comprueba el DETERMINANTE de las matrices de todos los ancestros,
   * no la palabra `scaleX`: un determinante negativo es la definición de
   * «esto está reflejado», valga como venga escrito —scaleX(-1), un
   * scale(-1,1), una matriz a mano— y no se rompe si mañana el marco se
   * refleja de otra manera. El resultado se guarda por raíz SVG porque
   * todas las flores de un mismo ramillete comparten ancestros: son
   * ~20 cadenas, no 200.
   *
   * @param {Element} nodo
   * @returns {number} 1 si se ve tal cual, -1 si está reflejado.
   */
  var sentidosMedidos = [];

  /**
   * El giro que el `<use>` de una flor ya trae puesto en su atributo.
   *
   * 07 genera cada flor como `<use transform="rotate(-15.4) scale(0.53)">`:
   * ese giro es parte del DIBUJO, no del gesto, y por eso no aparece en
   * ninguna cuenta de este archivo. Pero el mapa de bits de la rosa se
   * rasteriza sin girar, así que la copia de la mártir tiene que
   * recuperarlo o saldría torcida respecto de la flor que reemplaza.
   *
   * @param {Element} movil - el `.flor-de-enredadera__movil`.
   * @returns {number} grados.
   */
  function giroDelUse(movil) {
    try {
      var uso = movil.querySelector('use');
      if (!uso) return 0;
      var tr = uso.getAttribute('transform') || '';
      var m = tr.match(/rotate\(\s*(-?[\d.]+)/);
      return m ? parseFloat(m[1]) || 0 : 0;
    } catch (e) { return 0; }
  }

  function sentidoDeLaPantalla(nodo) {
    var raiz = nodo.ownerSVGElement || nodo;

    for (var c = 0; c < sentidosMedidos.length; c++) {
      if (sentidosMedidos[c].raiz === raiz) return sentidosMedidos[c].signo;
    }

    var signo = 1;
    var el = raiz;

    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var tr = '';
      try { tr = getComputedStyle(el).transform; } catch (e) { tr = ''; }

      if (tr && tr !== 'none') {
        var n = tr.slice(tr.indexOf('(') + 1, -1).split(',');
        for (var k = 0; k < n.length; k++) n[k] = parseFloat(n[k]);

        /* matrix(a,b,c,d,e,f) → a*d - b*c. matrix3d lleva los mismos
           cuatro números en 0,1,4,5. Negativo = reflejado. */
        var det = n.length >= 16 ? n[0] * n[5] - n[1] * n[4]
                : n.length >= 6  ? n[0] * n[3] - n[1] * n[2]
                : 1;
        if (det < 0) signo = -signo;
      }

      el = el.parentNode;
    }

    sentidosMedidos.push({ raiz: raiz, signo: signo });
    return signo;
  }

  function tomarLasFloresReales() {
    var todas = document.querySelectorAll('.flor-de-enredadera__movil');

    for (var i = 0; i < todas.length; i++) {
      var nodo = todas[i];

      /* Dónde está esta flor en la pantalla. Se mide UNA vez, acá: son
         ~60 flores y preguntarle al navegador por cada una en cada cuadro
         serían 60 lecturas forzadas de layout por cuadro. */
      var caja;
      try { caja = nodo.getBoundingClientRect(); } catch (e) { continue; }
      if (!caja || (!caja.width && !caja.height)) continue;

      var cx = caja.left + caja.width / 2;
      var cy = caja.top + caja.height / 2;

      /* Hacia dónde queda el nombre, visto desde esta flor. El 0° de una
         flor es "mirando hacia arriba" —así están dibujadas—, así que al
         ángulo del vector se le suma 90°. */
      var haciaElNombre = Math.atan2(altar.y - cy, altar.x - cx) * 180 / Math.PI + 90;

      /* Cuánto le falta girar desde donde está. Se normaliza a ±180 para
         que cada flor tome el camino corto: sin esto, una flor a la
         izquierda del nombre daría una vuelta entera para llegar. */
      var giro = haciaElNombre;
      while (giro > 180) giro -= 360;
      while (giro < -180) giro += 360;

      floresReales.push({
        nodo: nodo,
        /* Lo que tenía puesto 07 en el momento de entrar. Se guarda para
           devolvérselo tal cual: si el eclipse lo borrara, la flor quedaría
           quieta hasta que el mouse volviera a pasarle por al lado. */
        antes: nodo.style.transform || '',
        haciaElNombre: giro,
        /* 1 o -1. Las flores del lado derecho del marco viven dentro de un
           contenedor reflejado y hay que escribirles el ángulo al revés
           para que en PANTALLA se inclinen hacia el nombre. Ver la nota
           grande de sentidoDeLaPantalla(). */
        espejo: sentidoDeLaPantalla(nodo),
        /* En qué tanda se mueve. Ver la nota de LOS TURNOS: el coste es
           por SVG invalidado, así que las flores de una misma raíz se
           mueven juntas y las de otra raíz, en otro cuadro. */
        turno: turnoDe(nodo),
        /* Lo último escrito, en centésimas de grado y milésimas de escala.
           Comparar enteros evita armar una cadena nueva por flor y por
           cuadro cuando el gesto no cambió. */
        ultimoGesto: -99999,
        ultimoCrece: -99999,
        /* Cuánto lleva esforzándose. Es el ranking en tiempo real del
           documento base: la que más acumule al segundo 35 es la que se
           arranca. Ver elegirALaQueMuere(). */
        esfuerzoAcumulado: 0,
        /* Dónde está en pantalla, quieta. Lo usa la mártir para dibujar su
           copia exactamente encima de sí misma. */
        cx: cx,
        cy: cy,
        /* El giro que el dibujo ya trae puesto dentro del <use>
           (`rotate(-15.4) scale(0.53)`, lo pone 07 al generar la flor). El
           mapa de bits de la rosa NO lo tiene, así que para que la copia
           quede orientada igual que el original hay que sumárselo. */
        giroDelDibujo: giroDelUse(nodo),
        /* La distancia decide quién se entera primero. Las que están cerca
           del nombre despiertan antes: la conciencia se contagia hacia
           afuera, desde el altar, como una onda. */
        distancia: Math.sqrt((altar.x - cx) * (altar.x - cx) +
                             (altar.y - cy) * (altar.y - cy)),
        /* Que no despierten todas exactamente igual, ni tiemblen al
           unísono: un coro, no un metrónomo. */
        fase: Math.random() * Math.PI * 2,
        ansia: 0.7 + Math.random() * 0.3,
        /* El tamaño en pantalla, para calibrar el gesto: ver
           calibrarParaLaPantalla(). */
        tamano: Math.max(caja.width, caja.height),
        /* Y el tamaño REAL de la rosa, que no es lo mismo: ver
           ladoRealDeLaFlor(). Solo lo usa la mártir, pero se mide acá
           porque acá la maquetación ya está resuelta y preguntar es
           gratis; en el segundo 38,5 costaría un recálculo entero. */
        ladoReal: ladoRealDeLaFlor(nodo)
      });
    }

    /* La onda de conciencia necesita saber cuál es la flor más lejana
       para repartir los tiempos entre la primera y la última. */
    lejaniaMaxima = 1;
    for (var j = 0; j < floresReales.length; j++) {
      if (floresReales[j].distancia > lejaniaMaxima) {
        lejaniaMaxima = floresReales[j].distancia;
      }
    }

    calibrarParaLaPantalla();
    tomarLasRamas();
    tomarLasLlamas();

    /* ⚠️ ACÁ YA NO SE ELIGE A LA MÁRTIR. Se elige en el segundo 35, cuando
       el ranking de esfuerzo tiene trece segundos de datos: ver
       elegirALaQueMuere() y su llamada en moverLasFloresReales(). Elegirla
       en este punto era elegirla antes de que nadie se hubiera esforzado. */
  }

  /* ─── LOS TURNOS ────────────────────────────────────────────────────

     ⚡ EL ECLIPSE SE PASABA DEL CUADRO ÉL SOLO (2026-09-11)

     Carlos vio que bajaban los FPS y tenía razón. Medido en la página
     abierta, con el marco entero montado:

         escribir 161 flores y que el navegador lo resuelva …… 9,08 ms
         escribir  80 nudos …………………………………………………………………… 8,73 ms
         escribir  28 llamas ………………………………………………………………… 4,24 ms
         ───────────────────────────────────────────────────────────
         total por cuadro ………………………………………………………………… 22,05 ms

     El presupuesto de un cuadro a 60 Hz es 16,7 ms. O sea que la
     animación del DOM sola ya no entraba, sin contar el lienzo, las capas
     de mezcla ni el resto de la página. Y 13 de esos 22 ms los agregué yo
     al sumar las ramas y las llamas.

     ⚠️ EL HALLAZGO QUE DA LA SOLUCIÓN: EL COSTE NO ES POR ELEMENTO, ES
     POR SVG INVALIDADO. Tocar un solo nudo obliga al navegador a
     recalcular el `<svg>` entero al que pertenece. Medido:

         todo junto ………………………………………………………… 16,42 ms
         en 2 tandas repartidas por ÍNDICE …………… 14,14 ms  (−7 %, inútil)
         en 2 tandas repartidas por RAÍZ SVG ……… 9,42 ms  (−43 %)
         en 3 tandas repartidas por RAÍZ SVG ……… 7,03 ms  (−57 %)

     Por eso los turnos se reparten por RAÍZ y no por elemento: en un
     cuadro se tocan solo los SVG que están de turno, y los demás no
     cuestan absolutamente nada. Cada planta se mueve a 30 Hz en vez de 60,
     que para un gesto orgánico es invisible — y encima las separa, así que
     dejan de moverse al unísono, que es lo que uno quiere en un coro.

     ⚠️ Y NO SE REESCRIBE LO QUE NO CAMBIÓ. Con el valor redondeado a
     centésimas, en los tramos lentos —que son la mitad del minuto— casi
     ninguna flor cambia de un cuadro al siguiente. Medido: 9,08 ms baja a
     1,97 ms cuando los valores no cambian. Es el mismo criterio que
     19-velas.js usa para su titileo, por el mismo motivo. */

  /* En cuántas tandas se reparte el marco. Sale de la calidad y el
     gobernador puede subirla si el equipo igual sufre. NO baja nunca:
     ir repartiendo y juntando se vería peor que quedarse repartido. */
  var TANDAS = 2;
  var tandaDeEsteCuadro = 0;

  /* Qué turno le tocó a cada raíz SVG. Se reparten en orden de aparición,
     que mezcla ramilletes y plantas de los dos lados: así ningún cuadro
     mueve solo la mitad izquierda del marco. */
  var turnosPorRaiz = [];

  function turnoDe(nodo) {
    var raiz = nodo.ownerSVGElement || nodo;
    for (var i = 0; i < turnosPorRaiz.length; i++) {
      if (turnosPorRaiz[i].raiz === raiz) return turnosPorRaiz[i].turno;
    }
    var turno = turnosPorRaiz.length % 8;   // 8 turnos posibles, se usan los primeros TANDAS
    turnosPorRaiz.push({ raiz: raiz, turno: turno });
    return turno;
  }

  /** ¿Le toca a este elemento moverse en este cuadro? */
  function esSuTurno(cosa) {
    return (cosa.turno % TANDAS) === tandaDeEsteCuadro;
  }

  function calibrarLasTandas() {
    var nivel = (typeof CALIDAD_GRAFICA === 'object' && CALIDAD_GRAFICA)
      ? calidad() : 1;
    /* alta 2 · media 3 · baja 4. En alta cada planta va a 30 Hz, que para
       una flor doblándose no se distingue de 60. */
    TANDAS = limitar(2 + (Number(nivel) || 0), 2, 4);
  }

  /* ─── LAS RAMAS ─────────────────────────────────────────────────────

     ⚡ LA PLANTA ENTERA, NO SOLO LA CABEZA (2026-09-10)

     Hasta acá se movían las cabezas de las flores. Una flor que se
     inclina es un gesto; una planta que se retuerce desde el tallo es un
     cuerpo. La diferencia entre «las rosas se inclinan» y «algo vivo
     repta hacia el nombre» está en esto.

     Los nudos del tallo (`.nudo-del-tallo`) son las articulaciones: las
     hojas y las flores viven DENTRO de ellos (ver la nota de
     07-marco-y-enredaderas.js:2394), así que mover un nudo mueve su rama
     completa, con todo lo que cuelga.

     ⚠️ NO SE ESCRIBE `style.transform`, Y ESTO ES LA TRAMPA DEL BLOQUE.
     La POSICIÓN de cada nudo dentro del dibujo vive en su atributo
     `transform` (un `translate(x y)` que le puso 07 al generarlo). La
     propiedad CSS `transform` PISA a ese atributo: escribirla mandaría
     todas las ramas al origen del SVG, o sea a la esquina, y el marco se
     desarmaría en pantalla.

     Se usan las propiedades independientes `rotate` y `scale`, que NO
     pisan al atributo: se COMPONEN con él. La rama conserva su sitio y
     además se retuerce. Si el navegador no las soporta, no se toman las
     ramas y el eclipse ocurre igual con las flores — se comprueba una
     vez, no por nudo. */

  var ramas = [];

  function tomarLasRamas() {
    if (ramas.length) return;

    /* ¿Este navegador entiende las propiedades independientes? Se pregunta
       una sola vez. Sin ellas no hay forma segura de mover un nudo. */
    var sePuede = false;
    try {
      sePuede = typeof CSS !== 'undefined' && CSS.supports &&
                CSS.supports('rotate', '1deg') && CSS.supports('scale', '1.1');
    } catch (e) { sePuede = false; }
    if (!sePuede) return;

    var nudos = document.querySelectorAll('.nudo-del-tallo');

    for (var i = 0; i < nudos.length; i++) {
      var nudo = nudos[i];

      var caja;
      try { caja = nudo.getBoundingClientRect(); } catch (e) { continue; }
      if (!caja || (!caja.width && !caja.height)) continue;

      var cx = caja.left + caja.width / 2;
      var cy = caja.top + caja.height / 2;

      var haciaElNombre = Math.atan2(altar.y - cy, altar.x - cx) * 180 / Math.PI + 90;
      while (haciaElNombre > 180) haciaElNombre -= 360;
      while (haciaElNombre < -180) haciaElNombre += 360;

      /* El pivote va en la BASE del nudo —abajo, al centro—, que es por
         donde la rama se une al tallo. Girarlo desde su centro haría que
         la rama flotara; desde la base, se dobla. */
      try {
        nudo.style.transformBox = 'fill-box';
        nudo.style.transformOrigin = '50% 100%';
      } catch (e) { continue; }

      ramas.push({
        nodo: nudo,
        haciaElNombre: haciaElNombre,
        /* La mitad derecha del marco está reflejada y ahí los ángulos van
           al revés: 40 de 80 nudos se retorcían apartándose del nombre.
           Ver sentidoDeLaPantalla(). */
        espejo: sentidoDeLaPantalla(nudo),
        /* Su tanda y lo último escrito. Ver la nota de LOS TURNOS. */
        turno: turnoDe(nudo),
        ultimoDobla: -99999,
        ultimoCrece: -99999,
        /* El milisegundo en que esta rama perdió su flor, o 0. */
        latigazo: 0,
        distancia: Math.sqrt((altar.x - cx) * (altar.x - cx) +
                             (altar.y - cy) * (altar.y - cy)),
        fase: Math.random() * Math.PI * 2,
        ansia: 0.6 + Math.random() * 0.4
      });
    }
  }

  function devolverLasRamas() {
    for (var i = 0; i < ramas.length; i++) {
      var r = ramas[i];
      try {
        r.nodo.style.removeProperty('rotate');
        r.nodo.style.removeProperty('scale');
        r.nodo.style.removeProperty('transform-box');
        r.nodo.style.removeProperty('transform-origin');
      } catch (e) { /* nada */ }
    }
    ramas.length = 0;
  }

  /**
   * El cuerpo de la planta: las ramas se retuercen hacia el nombre.
   *
   * Van SIEMPRE por detrás de las flores en intensidad —la mitad del
   * ángulo— porque un tallo que se dobla tanto como su flor parece de
   * goma. El tallo sugiere el esfuerzo; la flor lo consuma.
   *
   * Y empiezan ANTES: a los 10 s, cuando las flores todavía casi no se
   * movieron. La planta se entera con el cuerpo antes que con la cabeza.
   *
   * @param {number} t
   * @param {number} retirada - 0 a 1, cuánto se está retirando todo.
   * @returns {void}
   */
  function moverLasRamas(t, retirada) {
    if (recortado('ramas')) return;
    if (!ramas.length) return;

    var enShock = t >= TOTALIDAD && t < SHOCK;
    var ahora = t / 1000;

    for (var i = 0; i < ramas.length; i++) {
      var r = ramas[i];

      /* El latigazo es un acontecimiento de un instante: si le cae fuera
         de turno se lo pierde. Por eso la rama que acaba de perder su flor
         se mueve en TODOS los cuadros mientras dura. */
      var enLatigazo = r.latigazo && (t - r.latigazo) >= 0 && (t - r.latigazo) < 700;
      if (!enLatigazo && !esSuTurno(r)) continue;

      var suTurno = PENUMBRA * 0.25 + (r.distancia / lejaniaMaxima) * UMBRA * 0.6;
      var despierta = suave(limitar((t - suTurno) / 7000, 0, 1));

      var fervor = despierta * (1 - retirada) *
        (t >= SHOCK ? 0.6 + tramo(t, SHOCK, SHOCK + 2500) * 0.4
         : enShock   ? 0.6
         :             tramo(t, PENUMBRA * 0.25, PROFUNDA) * 0.6);

      if (fervor <= 0.001) {
        if (r.tocada) {
          r.nodo.style.removeProperty('rotate');
          r.nodo.style.removeProperty('scale');
          r.tocada = false;
        }
        continue;
      }
      r.tocada = true;

      var dobla = r.haciaElNombre * fervor * r.ansia * 0.26;
      if (dobla >  26) dobla =  26;
      if (dobla < -26) dobla = -26;

      var tiembla = enShock ? 0
        : Math.sin(ahora * (1.1 + fervor * 6) + r.fase) * fervor * fervor * 4;

      /* ── EL LATIGAZO DE LA RAMA QUE PERDIÓ SU FLOR ──
         700 ms de oscilación amortiguada, y hacia el lado CONTRARIO al
         que estaba tirando: la tensión se descargó. Ver
         darleElLatigazoALaRama(). */
      var latigazo = 0;
      if (r.latigazo) {
        var desde = t - r.latigazo;
        if (desde >= 0 && desde < 700) {
          var queda = 1 - desde / 700;
          latigazo = -(dobla >= 0 ? 1 : -1) *
                     Math.sin(desde / 700 * Math.PI * 2.5) * 15 * queda * queda;
        }
      }

      /* ⚠️ Por `r.espejo`, igual que las flores: dentro de un contenedor
         reflejado los ángulos se invierten. Y con el mismo redondeo: si el
         nudo quedó donde estaba, no se lo vuelve a escribir. */
      var dobladoEnCentesimas = Math.round(r.espejo * (dobla + tiembla + latigazo) * 100);
      var creceEnMilesimas    = Math.round((1 + fervor * 0.1) * 1000);
      if (dobladoEnCentesimas === r.ultimoDobla &&
          creceEnMilesimas === r.ultimoCrece) continue;
      r.ultimoDobla = dobladoEnCentesimas;
      r.ultimoCrece = creceEnMilesimas;

      r.nodo.style.rotate = (dobladoEnCentesimas / 100).toFixed(2) + 'deg';
      r.nodo.style.scale  = (creceEnMilesimas / 1000).toFixed(3);
    }
  }

  /**
   * El segundo 38,5: la mártir se arranca de su tallo, a la vista.
   *
   * ⚠️ SE LLAMA ANTES DE ESCRIBIRLE UN SOLO ESTILO A UNA FLOR EN ESTE
   * CUADRO, y eso no es un detalle de orden. Acá adentro hay un
   * getBoundingClientRect(), que obliga al navegador a resolver la
   * maquetación. Llamado al principio del cuadro, el navegador YA la tiene
   * resuelta del cuadro anterior y la lectura es gratis. Llamado después
   * de mover doscientas flores, obligaría a recalcularlas todas de golpe
   * — justo en el cuadro donde no puede haber un tirón, porque es el
   * cuadro que el espectador está mirando.
   *
   * ⚠️ Y EL RELEVO OCURRE DENTRO DEL MISMO CUADRO. Por eso en unCuadro()
   * moverLasFloresReales() va antes que dibujar(): si la flor se apagara
   * en un cuadro y la copia apareciera en el siguiente, habría 16 ms con
   * el hueco vacío. Un parpadeo de un cuadro es exactamente lo que
   * delataría el truco.
   *
   * @param {number} t - milisegundo de la secuencia.
   * @returns {void}
   */
  function arrancarALaMartir(t) {
    if (!laQueMuere || muerte.suelta || t < MUERE_EN) return;

    var f = laQueMuere;

    var caja = null;
    try { caja = f.nodo.getBoundingClientRect(); } catch (e) { caja = null; }

    muerte.suelta = true;
    muerte.x0 = (caja && caja.width) ? caja.left + caja.width / 2 : f.cx;
    muerte.y0 = (caja && caja.height) ? caja.top + caja.height / 2 : f.cy;
    muerte.x = muerte.x0;
    muerte.y = muerte.y0;

    /* El tamaño de la copia sale del tamaño REAL que tenía la flor en
       pantalla, dividido por cuánto del mapa de bits ocupa la tinta de la
       rosa. Las dos cosas están medidas, ninguna estimada: por eso la
       copia mide lo mismo que la flor, mida el marco lo que mida y sea el
       teléfono o el monitor.

       El respaldo es la caja alineada a los ejes, que exagera un 18 % —
       vale más una copia algo grande que ninguna. */
    var lado = f.ladoReal || f.tamano;
    muerte.escala = (lado * (f.creceAhora || 1)) / (LADO * tintaDeLaRosa);

    /* Y sale girada como estaba ella: el giro que el dibujo trae puesto
       más el gesto con el que estaba estirando, los dos en grados de
       pantalla (de ahí el `espejo` sobre el primero: el del gesto ya lo
       lleva incorporado). */
    muerte.espejo = f.espejo;
    muerte.giro0 = (f.espejo * f.giroDelDibujo + (f.gesto || 0)) * Math.PI / 180;
    muerte.giro = muerte.giro0;

    /* El hueco. Queda vacío hasta el frenazo: no murió una rosa
       cualquiera, murió LA QUE ESTABA AHÍ, y el sitio lo dice. */
    try { f.nodo.style.opacity = '0'; } catch (e) { /* nada */ }

    darleElLatigazoALaRama(f, t);
  }

  /**
   * La rama que acaba de perder su flor da un latigazo hacia atrás.
   *
   * Es el gesto que convierte «la flor desapareció» en «algo se rompió
   * ahí». La rama venía tirando contra la flor; cuando la flor se suelta,
   * esa tensión se descarga de golpe y el tallo se va para el otro lado
   * antes de asentarse. Sin esto el arranque es un corte de montaje; con
   * esto es un desgarro.
   *
   * @param {Object} f - la entrada de floresReales de la mártir.
   * @param {number} t
   * @returns {void}
   */
  function darleElLatigazoALaRama(f, t) {
    var suNudo = null;
    try {
      suNudo = f.nodo.closest ? f.nodo.closest('.nudo-del-tallo') : null;
    } catch (e) { suNudo = null; }
    if (!suNudo) return;

    for (var i = 0; i < ramas.length; i++) {
      if (ramas[i].nodo === suNudo) { ramas[i].latigazo = t; return; }
    }
  }

  /**
   * Dibuja la mártir en su capa, la más alta de todas.
   *
   * Borra SOLO la caja que ocupó el cuadro anterior, no la pantalla: acá
   * hay un objeto y nada más. El margen de la diagonal (×1,45) cubre
   * cualquier ángulo de giro; quedarse corto deja estelas. Es el mismo
   * criterio de 24-lienzo-de-petalos.js.
   *
   * @returns {void}
   */
  function dibujarLaOfrenda() {
    if (!pincelDeLaOfrenda) return;

    if (!lienzoDeLaOfrenda.parentNode) {
      document.body.appendChild(lienzoDeLaOfrenda);
    }

    if (cajaAnteriorDeLaOfrenda) {
      pincelDeLaOfrenda.clearRect(
        cajaAnteriorDeLaOfrenda[0], cajaAnteriorDeLaOfrenda[1],
        cajaAnteriorDeLaOfrenda[2], cajaAnteriorDeLaOfrenda[3]);
    }

    var radio = LADO * muerte.escala * 0.75;
    cajaAnteriorDeLaOfrenda = [
      muerte.x - radio, muerte.y - radio, radio * 2, radio * 2
    ];

    dibujarUnaRosa(pincelDeLaOfrenda, muerte.x, muerte.y,
                   muerte.escala, muerte.giro, 1, muerte.espejo);
  }

  function devolverLasFloresReales() {
    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];
      if (f.antes) f.nodo.style.transform = f.antes;
      else         f.nodo.style.removeProperty('transform');

      /* El hueco de la mártir se vuelve a llenar en el frenazo, con todo
         lo demás y en el mismo cuadro. La flor vuelve a su tallo como si
         nunca se hubiera ido, que es exactamente la orden que se está
         obedeciendo. */
      f.nodo.style.removeProperty('opacity');
    }
    floresReales.length = 0;
  }

  /* ─── 9b. LA RELIQUIA ───────────────────────────────────────────────

     ⚡ LO ÚNICO QUE SOBREVIVE AL FRENAZO (2026-09-11)

     El segundo 60 devuelve TODO a su sitio en un cuadro: las flores, las
     ramas, las llamas, la luz, el sonido. Esa violencia es el efecto y no
     se toca.

     Pero un frenazo perfecto también es un frenazo negable. Si no queda
     absolutamente nada, el espectador cierra la escena en dos segundos:
     «se me trabó la página». La duda hay que dejarla apoyada en algo.

     Ese algo es un pétalo. Se elige en el segundo 42 —los dos segundos de
     totalidad, cuando todo está quieto— el que más cerca haya quedado del
     anillo del relicario, y ahí se queda posado el resto del minuto,
     inmóvil, mientras los otros ochenta y nueve giran alrededor sin tocar
     nada. Cuando llega el frenazo y desaparece la escena entera, él NO
     desaparece: sigue exactamente donde estaba, sobre el nombre, en una
     página que ya volvió a ser una invitación.

     Tres segundos después se desprende y cae. Es la única evidencia, y
     llega tarde a propósito: el que lo vio ya había decidido que no había
     pasado nada.

     ⚠️ ESTE ES EL ÚNICO requestAnimationFrame QUE SOBREVIVE AL ECLIPSE,
     y la regla de este archivo dice que eso es exactamente lo prohibido.
     Se permite con tres candados: dibuja UN pétalo y nada más, se corta
     solo en cuanto el pétalo sale de la pantalla, y tiene un techo duro
     de 9 s pase lo que pase. Además hay un setTimeout que saca el lienzo
     a los 12 s aunque el rAF no haya corrido nunca — si la pestaña se va
     al fondo justo en el frenazo, los cuadros se congelan y sin esto el
     pétalo se quedaría pegado sobre el relicario hasta que alguien
     recargue. */

  var reliquia = null;
  var lienzoDeLaReliquia = null;
  var pincelDeLaReliquia = null;
  var relojDeLaReliquia = 0;

  function elegirLaReliquia() {
    if (reliquia || !petalos.length) return;

    /* ⚠️ TIENE QUE QUEDAR APOYADO ARRIBA, NO AL COSTADO. Medido en una
       ventana angosta: el primer criterio era «el más cerca del anillo», y
       eligió uno del extremo izquierdo del óvalo. Ahí no se lee como
       posado, se lee como flotando al lado del nombre. Un pétalo que cayó
       encima de algo está ARRIBA de ese algo.
       Se pide entonces el arco de arriba —y no el de abajo, donde se
       leería como suciedad acumulada— y de ésos, el más pegado al anillo. */
    var mejor = null, mejorDistancia = 1e9;

    for (var i = 0; i < petalos.length; i++) {
      var pt = petalos[i];
      var dx = pt.x - altar.x, dy = pt.y - altar.y;
      var d = Math.sqrt(dx * dx + dy * dy);

      if (dy > 0) continue;                              // el arco de abajo, no
      if (Math.abs(dx) > altar.radio * 0.75) continue;   // los costados, tampoco

      var cuanLejosDelAnillo = Math.abs(d - altar.radio);
      if (cuanLejosDelAnillo < mejorDistancia) {
        mejorDistancia = cuanLejosDelAnillo;
        mejor = pt;
      }
    }

    if (!mejor) return;

    mejor.posada = true;
    reliquia = mejor;

    /* El lienzo se reserva ACÁ, en el segundo 42, y no en el frenazo.
       Reservar un lienzo del tamaño de la pantalla cuesta un cuadro, y en
       el segundo 60 ese cuadro se vería: es EL cuadro. Acá, en mitad de la
       totalidad, no lo nota nadie. */
    try {
      lienzoDeLaReliquia = document.createElement('canvas');
      lienzoDeLaReliquia.className = 'eclipse-capa';
      lienzoDeLaReliquia.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:2147483001;';
      /* Misma trama que el lienzo del mundo: es la misma decisión y por el
         mismo motivo. Ver la nota de ESCALA_DEL_LIENZO. */
      var tramaDeLaReliquia = dpr * ESCALA_DEL_LIENZO;
      lienzoDeLaReliquia.width  = Math.floor(window.innerWidth  * tramaDeLaReliquia);
      lienzoDeLaReliquia.height = Math.floor(window.innerHeight * tramaDeLaReliquia);
      /* El tamaño CSS, que es lo que faltaba en los tres. Ver medirElLienzo. */
      lienzoDeLaReliquia.style.width  = window.innerWidth  + 'px';
      lienzoDeLaReliquia.style.height = window.innerHeight + 'px';
      pincelDeLaReliquia = lienzoDeLaReliquia.getContext('2d');
      pincelDeLaReliquia.setTransform(tramaDeLaReliquia, 0, 0, tramaDeLaReliquia, 0, 0);
    } catch (e) {
      lienzoDeLaReliquia = null;
      pincelDeLaReliquia = null;
    }
  }

  function limpiarLaReliquia() {
    if (relojDeLaReliquia) { clearTimeout(relojDeLaReliquia); relojDeLaReliquia = 0; }
    if (lienzoDeLaReliquia && lienzoDeLaReliquia.parentNode) {
      lienzoDeLaReliquia.parentNode.removeChild(lienzoDeLaReliquia);
    }
    lienzoDeLaReliquia = null;
    pincelDeLaReliquia = null;
    reliquia = null;
  }

  /**
   * Suelta la reliquia después del frenazo.
   *
   * Se llama desde terminar() SOLO cuando la secuencia llegó hasta el
   * final. Si el eclipse se cortó —por un error, por el reloj de
   * seguridad o porque alguien apretó «Cortar» en el ensayo— no hay
   * evidencia que dejar: no hubo ritual.
   *
   * @returns {void}
   */
  function dejarLaReliquia() {
    if (!reliquia || !lienzoDeLaReliquia || !pincelDeLaReliquia) {
      limpiarLaReliquia();
      return;
    }

    /* Se copian los números ahora: el objeto del pétalo pertenece a la
       corrida que acaba de terminar y la siguiente lo va a reescribir. */
    var x0 = reliquia.x, y0 = reliquia.y, giro0 = reliquia.giro;
    var tam = reliquia.tam, cual = reliquia.cual;
    var lienzoPropio = lienzoDeLaReliquia;
    var pincelPropio = pincelDeLaReliquia;

    document.body.appendChild(lienzoPropio);

    var nacio = performance.now();
    var pedido = 0;

    /* El techo duro, por si el rAF no corre (pestaña al fondo). */
    relojDeLaReliquia = setTimeout(function () {
      if (pedido) cancelAnimationFrame(pedido);
      limpiarLaReliquia();
    }, 12000);

    function pintar(ahora) {
      var desde = ahora - nacio;
      var x = x0, y = y0, giro = giro0;

      /* TRES SEGUNDOS QUIETO. La página ya es una invitación normal y
         esto sigue ahí, sobre el relicario, sin explicación. */
      if (desde >= 3000) {
        var cae = (desde - 3000) / 1000;

        /* ⚠️ UN PÉTALO NO CAE COMO UNA PIEDRA, Y ÉSTA ES LA ÚLTIMA IMAGEN
           DE LA PIEZA. La primera versión usaba la gravedad de la mártir
           —900 px/s², la caída de un cuerpo— y el pétalo salía de la
           pantalla en siete décimas: se leía como que algo se cayó, no
           como que algo se soltó.
           Un pétalo tiene muchísima resistencia al aire: arranca quieto,
           toma enseguida su velocidad de régimen y ya no acelera más. La
           exponencial es exactamente eso, y de paso hace que el primer
           instante sea un desprenderse y no un tirón. Con el vaivén, tarda
           unos dos segundos en irse. */
        var arranque = 1 - Math.exp(-cae * 1.6);
        y = y0 + 165 * cae - 103 * arranque;
        x = x0 + Math.sin(cae * 2.3) * 16;
        giro = giro0 + Math.sin(cae * 1.7) * 0.55;
      }

      if (y - tam > window.innerHeight || desde > 9000) {
        limpiarLaReliquia();
        return;
      }

      pincelPropio.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pincelPropio.save();
      pincelPropio.translate(x, y);
      pincelPropio.rotate(giro);
      pincelPropio.globalAlpha = 0.75;

      var mapa = mapasDePetalos[cual];
      if (mapa && mapa.listo) {
        pincelPropio.drawImage(mapa, -tam, -tam, tam * 2, tam * 2);
      } else {
        pincelPropio.fillStyle = '#7d1a26';
        pincelPropio.beginPath();
        pincelPropio.ellipse(0, 0, tam * 0.5, tam * 0.28, 0, 0, Math.PI * 2);
        pincelPropio.fill();
      }
      pincelPropio.restore();

      pedido = requestAnimationFrame(pintar);
    }

    pedido = requestAnimationFrame(pintar);
  }

  /* ─── 10a. LAS LLAMAS ───────────────────────────────────────────────

     ⚡ EL SEGUNDO 18: LAS VELAS NOTAN ALGO (2026-09-11)

     Las velas son la luz votiva del culto y el eclipse no las toca: lo
     que convierte la sala en cripta no es que ellas suban, es que todo lo
     demás se apague. Esa regla sigue en pie y la prueba la cuida.

     Pero una llama que se inclina no es subir el brillo: es la única
     cosa de la escena que reacciona a algo que no está. No hay viento, no
     hay corriente, no hay nada que lo explique — y las treinta y dos
     llamas de la habitación se ladean a la vez hacia el mismo punto. Es
     el primer momento en que la escena dice, sin decirlo, que hay algo
     ahí que ejerce fuerza.

     ⚠️ SE ESCRIBE `rotate`, NO `transform`, Y ES OBLIGATORIO. 19-velas.js
     le escribe a cada `.llama` su propio `style.transform`
     (`scaleY(...) scaleX(...)`, el titileo) cada vez que cambia el brillo,
     o sea muchas veces por segundo. Escribir `transform` acá sería una
     pelea que se pierde en el cuadro siguiente, y además dejaría la llama
     sin titilar. Las propiedades independientes `rotate` y `scale` no
     pisan a `transform`: se COMPONEN con ella. La llama se inclina Y
     sigue titilando, cada módulo mandando sobre lo suyo.

     ⚠️ Y EL PIVOTE YA ESTÁ PUESTO, por 12-haces-de-luz.css:205
     (`transform-box: fill-box; transform-origin: 50% 90%`): el origen está
     en la mecha, así que girar la llama la ladea desde su base, como se
     ladea una llama de verdad. No hay que tocar nada de eso. */

  var llamas = [];

  function tomarLasLlamas() {
    if (llamas.length) return;

    var sePuede = false;
    try {
      sePuede = typeof CSS !== 'undefined' && CSS.supports &&
                CSS.supports('rotate', '1deg') && CSS.supports('scale', '1.1');
    } catch (e) { sePuede = false; }
    if (!sePuede) return;

    var todas = document.querySelectorAll('.llama');

    for (var i = 0; i < todas.length; i++) {
      var nodo = todas[i];

      var caja;
      try { caja = nodo.getBoundingClientRect(); } catch (e) { continue; }
      if (!caja || (!caja.width && !caja.height)) continue;

      var cx = caja.left + caja.width / 2;
      var cy = caja.top + caja.height / 2;

      /* Cuánto tiene que ladearse para «mirar» al nombre. Es el ángulo
         desde la vertical: una llama justo debajo del nombre casi no se
         mueve, una del otro extremo de la sala se tuerce entera.
         El valor absoluto del vertical evita que una vela POR ENCIMA del
         nombre se incline al revés — hacia el nombre es hacia el nombre,
         esté arriba o abajo. */
      var ladeo = Math.atan2(altar.x - cx, Math.abs(altar.y - cy) + 1) *
                  180 / Math.PI;

      /* 14° de tope. Más que eso deja de ser una llama atraída y pasa a
         ser una llama soplada, que es otra cosa y se ve barata. */
      if (ladeo >  14) ladeo =  14;
      if (ladeo < -14) ladeo = -14;

      llamas.push({
        nodo: nodo,
        ladeo: ladeo,
        /* Su tanda. Los candelabros son SVG como el marco y les cuesta
           exactamente lo mismo: 4,24 ms por cuadro entre las 28. */
        turno: turnoDe(nodo),
        /* 16 de las 32 llamas viven en el candelabro reflejado
           (estilos/12-haces-de-luz.css, `.marco__…--derecho`): medido en
           PBE. Sin esto la mitad de la habitación se ladearía al revés. */
        espejo: sentidoDeLaPantalla(nodo),
        fase: Math.random() * Math.PI * 2,
        /* Lo último escrito, en milésimas. Comparar enteros evita armar
           una cadena nueva por llama y por cuadro cuando nada cambió:
           es el mismo criterio que usa 19-velas.js para su titileo. */
        ultimo: -999,
        ultimoAlto: -999
      });
    }
  }

  /**
   * Las llamas durante el minuto.
   *
   * @param {number} t
   * @returns {void}
   */
  var ultimoIntentoDeLlamas = -1000;

  function moverLasLlamas(t) {
    /* Solo el diagnostico del panel puede apagarlas. El eclipse de verdad
       nunca lo hace: ver recortado(). */
    if (recortado('llamas')) return;

    /* Los candelabros los arma 19-velas.js cuando se monta la escena, y no
       hay garantía de que eso pase antes que el marco. Se vuelve a
       intentar, igual que con las flores, y se deja de intentar en cuanto
       aparecen. Después del segundo 18 ya no tiene sentido empezar. */
    if (!llamas.length) {
      if (t > 18000 || t - ultimoIntentoDeLlamas < 500) return;
      ultimoIntentoDeLlamas = t;
      tomarLasLlamas();
      if (!llamas.length) return;
    }

    /* Entra en el segundo 18 y tarda 2,5 s en completarse: una corriente
       que aparece, no un interruptor. */
    var atraccion = tramo(t, 18000, 20500);

    /* En la totalidad se quedan QUIETAS: los dos segundos de vacío también
       son suyos. Y en el frenesí arden altas — es lo único que sube
       cuando todo lo demás ya se apagó. */
    var enShock = t >= TOTALIDAD && t < SHOCK;
    var alto = 1 + tramo(t, SHOCK, SHOCK + 1800) * 0.22;

    var ahora = t / 1000;

    for (var i = 0; i < llamas.length; i++) {
      var l = llamas[i];

      if (!esSuTurno(l)) continue;

      /* El vaivén propio de cada llama, para que no se ladeen las 32 como
         una sola pieza. En el shock, cero. */
      var vaiven = enShock ? 0
        : Math.sin(ahora * 1.7 + l.fase) * 1.6 * atraccion;

      var grados = l.espejo * (l.ladeo * atraccion + vaiven);

      var enMilesimas = Math.round(grados * 100);
      if (enMilesimas !== l.ultimo) {
        l.ultimo = enMilesimas;
        l.nodo.style.rotate = (enMilesimas / 100).toFixed(2) + 'deg';
      }

      var altoEnMilesimas = Math.round(alto * 1000);
      if (altoEnMilesimas !== l.ultimoAlto) {
        l.ultimoAlto = altoEnMilesimas;
        /* Solo a lo alto: una llama que arde fuerte se estira, no engorda.
           `scale` con dos valores es ancho y alto. */
        l.nodo.style.scale = '1 ' + (altoEnMilesimas / 1000).toFixed(3);
      }
    }
  }

  function devolverLasLlamas() {
    for (var i = 0; i < llamas.length; i++) {
      try {
        llamas[i].nodo.style.removeProperty('rotate');
        llamas[i].nodo.style.removeProperty('scale');
      } catch (e) { /* nada */ }
    }
    llamas.length = 0;
  }

  /* ─── 10b. EL MUNDO ALREDEDOR ───────────────────────────────────────

     Un eclipse de verdad no oscurece una pantalla: apaga EL SOL. Y esta
     web tiene un sol — 14-haces-de-luz.js dibuja cinco rayos con el
     ángulo que le dicta 22-luz-de-la-hora.js según la hora real de quien
     abre. Hasta ahora el eclipse ignoraba todo eso y se limitaba a poner
     dos velos de color encima, que es pintar sobre la ventana en vez de
     bajar la persiana.

     Acá se toman prestadas las perillas públicas de los otros módulos,
     se las mueve durante el minuto y se las devuelve exactas. NO se
     modifica ni un archivo ajeno: el eclipse actúa desde afuera y se
     retira sin dejar rastro, que es la regla de este archivo.

     LO QUE SE TOMA PRESTADO
       · window.LuzDeLaHora.largoDelHaz / .anguloDelSol — los relee
         14-haces-de-luz.js EN CADA CUADRO, así que alcanza con escribirlos.
       · window.LienzoDeLuz.haces / .motas / .fauna — arrays que
         23-lienzo-de-luz.js relee en cada repintado. Vaciarlos apaga su
         subsistema sin tocar nada más.

     ⚠️ 22-luz-de-la-hora.js REESCRIBE `window.LuzDeLaHora` ENTERO cada
     10 minutos, en visibilitychange y con invitacion-visible. Por eso el
     valor se reaplica en cada cuadro y no una sola vez: si justo cae una
     reescritura a mitad del eclipse, el sol volvería solo.

     ⚠️ LAS VELAS NO SE TOCAN. Son la luz votiva del culto: lo que hace
     que la sala pase de habitación a cripta no es que ellas suban, es que
     todo lo demás se apague. Y `LuzDeLaHora.fuerzaDeVelas` es además una
     perilla muerta —se aplica sobre LienzoDeLuz.fuentes, que quedó
     permanentemente vacío (ver 19-velas.js)—, así que ni siquiera
     serviría. */

  var mundo = null;          // lo prestado, para poder devolverlo

  function tomarElMundo() {
    mundo = {
      largoDelHaz:  null,
      anguloDelSol: null,
      haces: null,
      motas: null,
      fauna: null,
      velo:  null
    };

    try {
      if (window.LuzDeLaHora) {
        mundo.largoDelHaz  = window.LuzDeLaHora.largoDelHaz;
        mundo.anguloDelSol = window.LuzDeLaHora.anguloDelSol;
      }
      if (window.LienzoDeLuz) {
        mundo.haces = window.LienzoDeLuz.haces;
        mundo.motas = window.LienzoDeLuz.motas;
        mundo.fauna = window.LienzoDeLuz.fauna;
      }
      var penumbra = document.getElementById('penumbra-profunda');
      if (penumbra) {
        mundo.velo = {
          nodo: penumbra,
          tinte: penumbra.style.getPropertyValue('--tinte-del-velo'),
          prof:  penumbra.style.getPropertyValue('--profundidad-de-sombra')
        };
      }
    } catch (e) { /* si algún módulo no está, el eclipse ocurre igual */ }
  }

  /**
   * Mueve el sol según el momento del eclipse.
   *
   * @param {number} t - Milisegundo de la secuencia.
   * @returns {void}
   */
  function moverElMundo(t) {
    if (!mundo) return;

    /* La curva del sol: muere del todo a los 26 s y vuelve a lo largo de
       los 16 s que siguen al tercer contacto.

       ⚡ ANTES VOLVÍA ENTRE EL 57 Y EL 59,9 (2026-09-11). Eran 2,9 s para
       deshacer 26 de agonía, y el color se iba por su cuenta en otro
       momento: el sol y la sangre se retiraban por caminos distintos. Ahora
       los dos usan la MISMA curva —`loQueYaSeFue`— así que la luz vuelve
       como un solo acontecimiento, deprisa al principio y despacio después.

       Lo que NO cambia es el desacople, que es el punto del acto VIII: la
       luz regresa y las plantas siguen estirando, con el permiso
       terminándose encima. Ellas no se calman hasta el frenazo. */
    var muriendo = limitar(t / 26000, 0, 1);
    var volviendo = loQueYaSeFue(t);
    var loQueQueda = (1 - muriendo) + volviendo * muriendo;

    try {
      if (window.LuzDeLaHora && mundo.largoDelHaz !== null) {
        /* Se reaplica en CADA cuadro, no una vez: 22-luz-de-la-hora.js
           puede reescribir el objeto entero a mitad del minuto. */
        window.LuzDeLaHora.largoDelHaz = mundo.largoDelHaz * loQueQueda;

        /* El sol también se corre, como se corre de verdad en un eclipse:
           la sombra entra por un lado. 14 lo relee cada cuadro. */
        window.LuzDeLaHora.anguloDelSol =
          mundo.anguloDelSol + (1 - loQueQueda) * 18;
      }

      if (window.LienzoDeLuz) {
        /* A los 26 s no queda ni un rayo. Vaciar el array es la forma no
           invasiva de apagarlos: 23 lo relee en cada repintado. */
        /* ⚡ LOS RAYOS VUELVEN CON LA LUZ, NO AL FINAL (2026-09-11). Esto
           decía `t < 57000`: el largo del haz crecía desde el tercer
           contacto pero el array seguía vacío, así que los rayos aparecían
           de golpe a los 57 s, ya crecidos. Ahora vuelven a los 46, que es
           cuando la luz ya pegó su salto de vuelta. */
        var sinLuz = t >= 26000 && t < 46000;
        window.LienzoDeLuz.haces = sinLuz ? [] : mundo.haces;

        /* A los 33 s se apaga lo que flota: motas de polvo y luciérnagas.
           Nada vivo que no sea el culto. Y vuelven DESPUÉS que los rayos:
           la luz es física, los bichos son vida, y la vida vuelve última. */
        var sinFauna = t >= 33000 && t < 52000;
        window.LienzoDeLuz.motas = sinFauna ? [] : mundo.motas;
        window.LienzoDeLuz.fauna = sinFauna ? [] : mundo.fauna;

        /* ⚡ Y EL LIENZO ENTERO SE DETIENE, NO SOLO SE VACÍA (2026-09-11)
         *
         * Vaciar los arrays deja este canvas repintándose a pantalla
         * completa con casi nada adentro, debajo de un velo que ya lo
         * tapa. En el monitor de Carlos son 0,817 Mpx por repintado.
         *
         * ⚠️ LA VENTANA NO ES ARBITRARIA: es exactamente la unión de las
         * dos de arriba, [26000, 52000). Se eligió así para no inventar
         * una transición nueva — en esos dos instantes el contenido ya se
         * vacía y ya se vuelve a llenar, y eso está visto y aceptado.
         * Detenerlo antes sí se notaría: a los 8 s el velo va en alfa
         * 0,08 y apagar la luz ambiente ahí sería un salto. */
        window.LienzoDeLuz.pausado = (t >= 26000 && t < 52000);
      }

      /* El halo de las velas, en la misma ventana y por el mismo motivo.
         Las llamas NO se detienen: son SVG y siguen titilando el minuto
         entero. Ver la nota en 19-velas.js. */
      if (window.EstadoDelLienzoDeVelas) {
        window.EstadoDelLienzoDeVelas.pausado = (t >= 26000 && t < 52000);
      }

      /* Los pétalos de la invitación ya están en opacidad 0 con una
         transición de 0,9 s (ver apagarLosPetalosDeSiempre). Al segundo
         ya no se ven, y recién ahí se detiene el pintado: antes se
         cortaría el desvanecido a la mitad. */
      if (window.LienzoDePetalos) {
        window.LienzoDePetalos.pausado = (t >= 1000);
      }

      /* ⚡ EL VELO RECTANGULAR SE APARTA, NO SE CIERRA (2026-09-11)
       *
       * Acá se subía `--profundidad-de-sombra` hasta 0,9 para que «las
       * esquinas dejaran de existir». Carlos, mirándolo en el teléfono:
       * «la penumbra se ve como un cuadro cerrándose». Era literal y era
       * culpa de esto: `#penumbra-profunda` son degradados LINEALES a
       * pantalla completa (estilos/12-haces-de-luz.css:79-108), así que
       * subirlos oscurece en forma de marco rectangular.
       *
       * Desde que el eclipse tiene su propio velo —radial y centrado en el
       * relicario— ese trabajo ya está hecho, y mejor. Los dos juntos se
       * estorban: uno dice que la luz cae en redondo desde el nombre y el
       * otro dibuja un rectángulo encima.
       *
       * Así que el eclipse lo BAJA en vez de subirlo. La oscuridad de la
       * escena pasa a tener una sola forma, y es la del altar. */
      if (mundo.velo) {
        var cierre = limitar((t - 30000) / 5000, 0, 1) * (1 - volviendo);
        if (cierre > 0.001) {
          var deAntes = parseFloat(mundo.velo.prof);
          if (!(deAntes > 0)) deAntes = 1;
          mundo.velo.nodo.style.setProperty('--profundidad-de-sombra',
            (deAntes * (1 - cierre * 0.75)).toFixed(3));
        } else if (mundo.velo.prof) {
          mundo.velo.nodo.style.setProperty('--profundidad-de-sombra', mundo.velo.prof);
        } else {
          mundo.velo.nodo.style.removeProperty('--profundidad-de-sombra');
        }
      }
    } catch (e) { /* un módulo que no está no puede romper el homenaje */ }
  }

  /**
   * Suelta las tres pausas de lienzo y repinta lo que haga falta.
   *
   * Es idempotente a propósito: se la puede llamar dos veces sin que pase
   * nada raro, que es lo que ocurre cuando terminar() corre por el camino
   * normal y por el de error.
   *
   * @returns {void}
   */
  function soltarLosLienzos() {
    try {
      if (window.LienzoDeLuz) window.LienzoDeLuz.pausado = false;
      if (window.EstadoDelLienzoDeVelas) window.EstadoDelLienzoDeVelas.pausado = false;
      if (window.LienzoDePetalos) {
        window.LienzoDePetalos.pausado = false;
        /* Un repintado ya mismo: si no, el throttle puede dejar el lienzo
           en blanco hasta 90 ms después de que el eclipse ya se fue. */
        if (window.LienzoDePetalos.pintarUnCuadro) {
          window.LienzoDePetalos.pintarUnCuadro();
        }
      }
    } catch (e) { /* nada: soltar una pausa nunca puede tumbar la salida */ }
  }

  function devolverElMundo() {
    /* ⚠️ LAS PAUSAS SE SUELTAN PRIMERO, ANTES DE CUALQUIER GUARD.
     *
     * Si el eclipse termina por una excepción a mitad del minuto (ver el
     * try del bucle), o si `mundo` nunca llegó a capturarse, una bandera
     * de pausa que quedara puesta dejaría la página SIN luz ambiente, SIN
     * halo de velas y SIN lluvia de pétalos hasta que alguien recargara.
     * Un homenaje no puede romper la invitación: por eso esto va acá
     * arriba, fuera del `if (!mundo)` y fuera del try.
     */
    soltarLosLienzos();

    if (!mundo) return;
    try {
      if (window.LuzDeLaHora) {
        if (mundo.largoDelHaz !== null)  window.LuzDeLaHora.largoDelHaz  = mundo.largoDelHaz;
        if (mundo.anguloDelSol !== null) window.LuzDeLaHora.anguloDelSol = mundo.anguloDelSol;
      }
      if (window.LienzoDeLuz) {
        if (mundo.haces) window.LienzoDeLuz.haces = mundo.haces;
        if (mundo.motas) window.LienzoDeLuz.motas = mundo.motas;
        if (mundo.fauna) window.LienzoDeLuz.fauna = mundo.fauna;
      }
      if (mundo.velo) {
        if (mundo.velo.prof) {
          mundo.velo.nodo.style.setProperty('--profundidad-de-sombra', mundo.velo.prof);
        } else {
          mundo.velo.nodo.style.removeProperty('--profundidad-de-sombra');
        }
      }
    } catch (e) { /* nada */ }
    mundo = null;
  }


  /* ─── 11. LA MÚSICA ─────────────────────────────────────────────────

     ⚠️ createMediaElementSource() SOLO SE PUEDE LLAMAR UNA VEZ POR
     ELEMENTO, y desde esa llamada el audio pasa obligatoriamente por el
     grafo. Desconectarlo mal deja la canción MUDA PARA SIEMPRE, sin
     forma de arreglarlo salvo recargando.

     Por eso al terminar no se desarma nada: los filtros se dejan en
     posición neutra y el grafo se queda puesto. 10-reproductor-de-musica
     sigue mandando con `audio.volume`, que se aplica antes del grafo. */

  var audio = document.getElementById('audio-de-fondo');
  var sonido = null;

  function engancharElSonido() {
    if (!audio || audio.paused || audio.muted) return;

    /* ⚡ EL GRAFO SE CONSTRUYE UNA VEZ Y SE GUARDA (2026-09-10)
     *
     * createMediaElementSource() lanza InvalidStateError si se lo llama dos
     * veces sobre el mismo <audio>. Antes, la excepción caía en el catch de
     * abajo y dejaba `sonido = null`: la SEGUNDA corrida del eclipse pasaba
     * muda, sin un error visible y sin nada que lo explicara.
     *
     * No era un caso raro reservado al panel de ensayo: una pestaña dejada
     * abierta dispara el eclipse otra vez al día siguiente, y ese segundo
     * eclipse ya corría en silencio.
     *
     * El grafo vive en `window` y no en este archivo a propósito: el archivo
     * se inyecta de nuevo en cada disparo —es un IIFE nuevo cada vez— así
     * que una variable de módulo no sobreviviría de una corrida a la otra.
     * El <audio> sí sobrevive, y el grafo está atado a él.
     */
    if (window.__ECLIPSE_GRAFO_DE_SONIDO) {
      sonido = window.__ECLIPSE_GRAFO_DE_SONIDO;
      despertarElContexto();
      return;
    }

    var Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;

    try {
      var ctx = new Contexto();
      var fuente = ctx.createMediaElementSource(audio);

      var filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 20000;      // neutro

      var forma = ctx.createWaveShaper();  // saturación
      var ganancia = ctx.createGain();
      ganancia.gain.value = 1;

      fuente.connect(filtro);
      filtro.connect(forma);
      forma.connect(ganancia);
      ganancia.connect(ctx.destination);

      sonido = { ctx: ctx, filtro: filtro, forma: forma, ganancia: ganancia };
      window.__ECLIPSE_GRAFO_DE_SONIDO = sonido;
      despertarElContexto();
    } catch (e) {
      sonido = null;      // el eclipse sigue, en silencio de novedades
    }
  }

  /**
   * Despierta el AudioContext si nació dormido.
   *
   * ⚠️ POR QUÉ HACE FALTA. En Safari y en iOS un AudioContext puede nacer
   * `suspended` cuando no lo creó un gesto de la persona — y el eclipse lo
   * crea solo, a las 6:30 de la mañana, sin que nadie toque nada. Con el
   * contexto dormido, conectar el grafo no ahoga la música: la CALLA
   * ENTERA, porque el audio ya pasa obligatoriamente por un grafo que no
   * corre. Sería el peor final posible para un homenaje.
   *
   * `resume()` devuelve una promesa que puede rechazarse sin que eso sea
   * grave; se atrapa y se sigue.
   */
  function despertarElContexto() {
    if (!sonido || !sonido.ctx || sonido.ctx.state !== 'suspended') return;
    try {
      var promesa = sonido.ctx.resume();
      if (promesa && promesa.catch) promesa.catch(function () { /* nada */ });
    } catch (e) { /* nada */ }
  }

  /** La curva de saturación. `cuanto` va de 0 (limpia) a 1 (rota). */
  function curvaDeDistorsion(cuanto) {
    var n = 256, curva = new Float32Array(n), k = cuanto * 60;
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / n - 1;
      curva[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curva;
  }

  /* ⚡ EL SCRATCH DE DISCO RAYADO NO EXISTÍA (2026-09-11)
   *
   * El documento base lo pide con todas las letras para el segundo 54:
   * «Esto es acompañado de un scratch de la música, como disco rayado que
   * vuelve a sonar con normalidad». Buscado en todo el proyecto,
   * `playbackRate` aparecía CERO veces. Lo que había era el filtro
   * soltándose en 600 ms, que es otra cosa: eso es salir de debajo del
   * agua, no un disco frenado con el dedo.
   *
   * Y es exactamente el sonido que le falta al gesto: Carlos, sobre el
   * final, «un parón brusco, violento, como forzando a las plantas a
   * fingir ser dóciles», «una fuerza superior las empuja violentamente de
   * vuelta a la normalidad». El scratch ES esa fuerza. Las plantas no
   * deciden parar: las paran.
   *
   * ⚠️ VA POR FUERA DEL GRAFO A PROPÓSITO. `playbackRate` es una propiedad
   * del <audio>, no un nodo de Web Audio, así que no toca el grafo de
   * filtro/saturación/ganancia —que no se puede desarmar sin dejar la
   * canción muda para siempre, ver la advertencia de arriba— y funciona
   * igual aunque el AudioContext no haya podido crearse.
   *
   * 140 ms para frenar y 120 para soltar: son 260 en total. Más largo se
   * oye como una cinta estirándose; más corto no se alcanza a oír.
   */
  var FRENAZO_BAJA = 140;
  var FRENAZO_SUBE = 120;
  var yaSonoElScratch = false;

  /**
   * El scratch de disco rayado del segundo 54.
   *
   * ⚡ NO SONABA NUNCA, Y LA CAUSA ERA EL RITMO DE CUADROS (2026-09-11)
   *
   * La primera versión interpolaba el ritmo dentro de una ventana de
   * 260 ms leída UNA VEZ POR CUADRO. Medido en el navegador, sondeando
   * cada 15 ms durante los sesenta segundos: `playbackRate` se quedó en
   * 1,000 el minuto entero. En calidad baja, con 226 flores en escena, la
   * mediana entre cuadros en esta fase es de 646 ms —máximo 1098— así que
   * NINGÚN cuadro caía dentro de la ventana y el efecto se salteaba.
   *
   * Es un error de diseño: un efecto de 260 ms no puede depender de que
   * un cuadro caiga justo ahí. Ahora se dispara UNA sola vez, en el primer
   * cuadro que cruza el segundo 54, y desde ahí lo maneja su propio reloj
   * con `setTimeout`. La escena puede ir a 1,5 fps y el scratch suena
   * igual, porque el audio no corre en el hilo de la animación.
   *
   * ⚠️ Y ES LO QUE EL GESTO SIGNIFICA. Carlos: «una fuerza superior las
   * empuja violentamente de vuelta a la normalidad». El scratch ES esa
   * fuerza. Si no suena, el frenazo se queda mudo.
   *
   * @param {number} t - Milisegundo de la secuencia.
   * @returns {void}
   */
  function elScratchDelFrenazo(t) {
    if (yaSonoElScratch || !audio || t < FRENESI) return;
    yaSonoElScratch = true;

    /* El disco se frena de golpe: no hay rampa por cuadros, hay un valor
       puesto y otro puesto después. */
    try { audio.playbackRate = 0.35; } catch (e) { return; }

    /* Y vuelve solo, con su propio reloj. Si el eclipse se corta antes,
       soltarElSonido() lo devuelve igual — por eso esto no puede ser la
       única ruta de vuelta. */
    setTimeout(function () {
      try { audio.playbackRate = 0.62; } catch (e) { /* nada */ }
    }, FRENAZO_BAJA);

    setTimeout(function () {
      try { audio.playbackRate = 1; } catch (e) { /* nada */ }
    }, FRENAZO_BAJA + FRENAZO_SUBE);
  }

  function ajustarElSonido(t) {
    elScratchDelFrenazo(t);
    if (!sonido) return;

    /* ⚡ EL SONIDO SALÍA DEL POZO CINCO SEGUNDOS TARDE (2026-09-10)
     *
     * Decía:
     *     var hundimiento = t < FRENESI ? Math.min(1, t / TOTALIDAD)
     *                     : t < DURACION - 800 ? 1 : 0;
     *
     * O sea: la música se mantenía ahogada hasta el segundo 59,2. Pero las
     * dos capas de color ya están en CERO desde el 54,6 (ver coloresEn) y
     * las rosas se desvanecen entre el 54,0 y el 54,9. El resultado eran
     * cinco segundos largos de pantalla completamente limpia con la música
     * todavía sonando como debajo del agua — que no se lee como un efecto,
     * se lee como que algo quedó colgado.
     *
     * Ahora sale del pozo CON el color: empieza a soltarse en FRENESI y
     * llega a limpio alrededor del 54,6, siguiendo la misma forma que usan
     * las capas. El scratch de disco rayado sigue estando —son 260 ms, no
     * un fundido largo— pero cae donde la imagen lo acompaña.
     *
     * Los últimos ~5 s quedan de vuelta a la normalidad completa: la marea
     * retirándose, la rosa cayendo, y la canción como estaba.
     */
    var hundimiento = t < FRENESI
      ? Math.min(1, t / TOTALIDAD)
      : 1 - tramo(t, FRENESI, FRENESI + 600);

    sonido.filtro.frequency.value = 20000 - hundimiento * 19100;
    sonido.ganancia.gain.value    = 1 - hundimiento * 0.35;

    /* La curva se recalcula pocas veces, no en cada cuadro: armar 256
       valores sesenta veces por segundo no cambia nada que se oiga. */
    var paso = Math.round(hundimiento * 6);
    if (paso !== sonido.ultimoPaso) {
      sonido.ultimoPaso = paso;
      sonido.forma.curve = curvaDeDistorsion(paso / 6);
    }
  }

  function soltarElSonido() {
    /* Primero el ritmo, y fuera del guard: si el eclipse muere por una
       excepción en mitad del scratch, la canción quedaría sonando al 35 %
       para siempre. */
    if (audio) {
      audio.__ritmoDelEclipse = 1;
      try { audio.playbackRate = 1; } catch (e) { /* nada */ }
    }
    if (!sonido) return;
    // Neutro, NO desconectado. Ver la advertencia de arriba.
    sonido.filtro.frequency.value = 20000;
    sonido.ganancia.gain.value = 1;
    sonido.forma.curve = null;
  }

  /* ─── 12. LOS PÉTALOS DE LA INVITACIÓN SE APAGAN ────────────────── */

  var lienzosDePetalos = [];

  function apagarLosPetalosDeSiempre() {
    var todos = document.querySelectorAll('.lienzo-de-petalos');
    for (var i = 0; i < todos.length; i++) {
      lienzosDePetalos.push({ nodo: todos[i], antes: todos[i].style.opacity });
      todos[i].style.transition = 'opacity .9s linear';
      todos[i].style.opacity = '0';
    }
  }

  function devolverLosPetalosDeSiempre() {
    for (var i = 0; i < lienzosDePetalos.length; i++) {
      var l = lienzosDePetalos[i];
      l.nodo.style.transition = '';
      l.nodo.style.opacity = l.antes;
    }
    lienzosDePetalos.length = 0;
  }

  /* ─── 13. DIBUJAR ───────────────────────────────────────────────── */

  /** Suaviza de 0 a 1 con arranque y frenada. */
  function suave(x) {
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }

  /** Cuánto vale `t` dentro del tramo [a,b], de 0 a 1. */
  function tramo(t, a, b) { return suave((t - a) / (b - a)); }

  /**
   * Cuánta penumbra y cuánta sangre se ven en el milisegundo `t`.
   *
   * Está separada del bucle a propósito: es la curva que define el
   * eclipse entero y se puede EJECUTAR desde herramientas/prueba-eclipse
   * sin navegador. Ahí se comprueban las dos cosas que no pueden fallar:
   * que el rojo NO exista antes de la totalidad, y que al segundo 60 las
   * dos capas estén en cero.
   *
   * @param {number} t Milisegundos desde el arranque.
   * @returns {{frio:number, sangre:number}}
   */
  /**
   * Cuánto se ha retirado ya el eclipse, de 0 a 1, después del tercer
   * contacto.
   *
   * ⚠️ SON DOS TRAMOS Y NO UNO, Y ES POR LA ESCENA. Un solo tramo de 16 s
   * dejaba el segundo 45 tan oscuro como la totalidad — y la histeria
   * empieza en el 44. El culto se desataba a oscuras: el acto más
   * importante del minuto no se veía.
   *
   * Astronómicamente tampoco era así. Después del tercer contacto la luz
   * vuelve DEPRISA —es el mismo salto que la hizo desaparecer, al revés— y
   * después tarda muchísimo en terminar de volver del todo. Por eso el
   * 45 % de la recuperación pasa en los primeros 3,5 s y el 55 % restante
   * se estira hasta el segundo 59,99.
   *
   * @param {number} t
   * @returns {number} 0 = el eclipse entero, 1 = no queda nada de él.
   */
  function loQueYaSeFue(t) {
    if (t < SHOCK) return 0;
    return tramo(t, SHOCK, SHOCK + 3500) * 0.45 +
           tramo(t, SHOCK, DURACION - 10) * 0.55;
  }

  function coloresEn(t) {
    var seFue = loQueYaSeFue(t);

    /* ── EL FRÍO: saca la luz DEL DÍA, no la escena ──
       Tope 0,42. Antes era 0,88 y eso solo ya dejaba la página al 12 %
       antes de que el rojo entrara siquiera. */
    /* ⚡ EL TECHO DEL FRÍO SUBIÓ DE 0,42 A 0,70 (2026-09-11)
     *
     * Con 0,42 el oro de la escena conservaba el 86 % de su luz en el
     * segundo 30 — o sea que la «umbra profunda · oscuridad intensa» del
     * documento base era una penumbra tibia. Con 0,70 baja al 77 %, y el
     * salto a 57 % al entrar en totalidad queda como EL acontecimiento.
     *
     * ⚠️ Y ESTO NO METE ROJO. El oscurecimiento de esta fase lo pinta la
     * PALETA_FRIA —acero azulado— porque la mezcla del velo sigue a
     * `sangre`, que vale cero hasta el segundo 35. Antes de la totalidad
     * la pantalla se enfría y se dessatura, exactamente como pide el
     * documento, sin una gota de sangre.
     *
     * Y no es el único oscurecimiento: el sol muere (largoDelHaz), los
     * rayos se vacían a los 26 s y `#penumbra-profunda` se cierra. Esto es
     * una de las tres cosas que oscurecen, no la única. */
    var frio = t < TOTALIDAD
      ? tramo(t, 0, PROFUNDA) * 0.70
      : t < SHOCK
        /* Los dos segundos de cripta: acá sí se cierra. */
        ? 0.70 + tramo(t, TOTALIDAD, SHOCK) * 0.20
        : 0.90 * (1 - seFue);

    /* ⚠️ EL ROJO ES EXCLUSIVO DE LA TOTALIDAD.
       Si apareciera antes dejaría de significar «este es el momento
       sagrado y terrible» y sería un filtro de color más. Por eso el
       primer tramo es un cero duro y no una rampa que empieza bajito. */
    var sangre = t < PROFUNDA ? 0
      : t < MUERE_EN ? tramo(t, PROFUNDA, MUERE_EN) * 0.70
      /* Del 38,5 al 44 NO sigue subiendo: ya está en el máximo absoluto y
         se queda. El documento pide las dos cosas —máximo en la muerte y
         máximo en el shock— y sostenerlo es la única forma de cumplir las
         dos. Lo que hace terrible a la cripta es la apertura cerrándose,
         no un rojo que ya no tiene a dónde subir. */
      : t < SHOCK     ? 0.70
      : 0.70 * (1 - seFue);

    /* ── LA CORONA: la única capa que SUMA luz ──
       Entra con el sol muriendo, se abre con la sangre, se cierra a un
       punto en la totalidad —la luz colapsando, que es lo que da sentido
       al anillo de diamante— y vuelve a abrirse con la histeria. */
    var corona = t < PENUMBRA ? 0
      : t < PROFUNDA  ? tramo(t, PENUMBRA, PROFUNDA) * 0.10
      : t < TOTALIDAD ? 0.10 + tramo(t, PROFUNDA, TOTALIDAD) * 0.06
      : t < SHOCK     ? 0.16 * (1 - tramo(t, TOTALIDAD, SHOCK) * 0.7)
      : t < FRENESI   ? 0.05 + tramo(t, SHOCK, SHOCK + 2500) * 0.13
      : 0.18 * (1 - tramo(t, FRENESI, DURACION - 10));

    return { frio: frio, sangre: sangre, corona: corona };
  }

  /**
   * @param {CanvasRenderingContext2D} pincel - en qué capa se dibuja. La
   *   marea va en el lienzo del mundo, DEBAJO de los velos; la mártir va
   *   en el de la ofrenda, por encima de todo. Ver la nota de la capa de
   *   la ofrenda: son las dos únicas cosas que la oscuridad no toca, y por
   *   eso no pueden compartir capa.
   * @param {number} [espejo] - -1 para dibujarla reflejada. La mártir sale
   *   de un lado del marco que puede estar en espejo, y la copia tiene que
   *   ser la MISMA imagen que estaba en pantalla, no su reflejo. Se aplica
   *   después del giro para que el orden sea el mismo que en el DOM:
   *   primero se refleja el dibujo, después se lo gira.
   */
  function dibujarUnaRosa(pincel, x, y, escala, giro, alfa, espejo) {
    pincel.save();
    pincel.globalAlpha = alfa;
    pincel.translate(x, y);
    pincel.rotate(giro);
    if (espejo === -1) pincel.scale(-1, 1);

    if (mapaDeLaRosa) {
      var l = LADO * escala;
      pincel.drawImage(mapaDeLaRosa, -l / 2, -l / 2, l, l);
    } else {
      /* Respaldo: si la rosa de verdad no se pudo rasterizar, siluetas.
         Se pierde el detalle, no la escena — y la portada de Hysteria
         son siluetas, así que tampoco desentona. */
      var r = 13 * escala;
      pincel.fillStyle = '#12060a';
      pincel.beginPath();
      for (var p = 0; p < 6; p++) {
        var a = (p / 6) * Math.PI * 2;
        pincel.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5,
                       r * 0.52, r * 0.34, a, 0, Math.PI * 2);
      }
      pincel.fill();
    }
    pincel.restore();
  }

  function dibujar(t) {
    /* ⚡ SE BORRA SOLO DONDE HUBO ALGO (2026-09-11)
     *
     * Acá había un `clearRect` de la pantalla entera. En la ronda pasada
     * lo medí por el lado de la CPU —0,003 ms, contra 0,043 de hacerlo por
     * rectángulos— y lo descarté. Era la MITAD de la medición.
     *
     * El coste de verdad está del lado de la GPU: un lienzo borrado y
     * redibujado hay que volver a subirlo entero, y eso es proporcional al
     * ÁREA. Medido después, con el eclipse corriendo: 0,284 Mpx por cuadro
     * solo de este lienzo, en un viewport de 0,306. Una pantalla entera de
     * textura por cuadro, en una HD 4600 que comparte el bus con la CPU.
     *
     * Es exactamente lo que 24-lienzo-de-petalos.js ya había resuelto por
     * su cuenta, y su nota lo decía con todas las letras: en la máquina
     * objetivo «era casi todo el problema: el ancho de banda, no el
     * procesador». Debí haberle hecho caso a esa nota en vez de a mi
     * microbenchmark.
     *
     * Ahora se borra la caja que ocupó cada pétalo el cuadro anterior. El
     * margen del 45 % cubre la diagonal de un pétalo girado: quedarse
     * corto deja estelas. */
    for (var b = 0; b < cajasDelCuadroAnterior.length; b++) {
      var caja = cajasDelCuadroAnterior[b];
      pincel.clearRect(caja[0], caja[1], caja[2], caja[3]);
    }
    cajasDelCuadroAnterior.length = 0;

    var enFrenesi  = t >= SHOCK && t < FRENESI;
    var enShock    = t >= TOTALIDAD && t < SHOCK;
    var enSumision = t >= FRENESI;

    /* ⚡ EL CICLO SE CORTABA DE GOLPE (2026-09-10)
     *
     * Esto decía `enSumision ? 0`. En el milisegundo 54 000 el
     * estiramiento saltaba de 1,0 a 0 —de un cuadro al siguiente— y con
     * él saltaban la atracción de los pétalos y el temblor de las flores
     * del marco, las tres a la vez. Las rosas, en cambio, se desvanecían
     * en 900 ms. O sea que la marea se congelaba de un tirón mientras las
     * flores todavía se estaban yendo: se leía como que algo se rompió,
     * no como que el eclipse pasó.
     *
     * Un eclipse se retira como llegó. Ahora las tres bajan por la MISMA
     * rampa que usan las rosas para desvanecerse (FRENESI → +900 ms), así
     * que todo se retira junto y en el mismo tiempo.
     *
     * El frenazo del final sigue intacto: es a los 60 s, cuando
     * terminar() saca las capas de un tirón, y eso es a propósito. Lo que
     * se arregla es el paso de la sumisión, que era un corte donde tenía
     * que haber una marea bajando. */
    var retirada = enSumision ? tramo(t, FRENESI, FRENESI + 900) : 0;

    var estiramiento =
        enSumision ? (1 - retirada)
      : enShock    ? 0.62
      : enFrenesi  ? 0.62 + tramo(t, SHOCK, SHOCK + 2500) * 0.38
      :              tramo(t, PENUMBRA * 0.4, PROFUNDA) * 0.62;

    var ahora = t / 1000;

    for (var i = 0; i < marea.length; i++) {
      var r = marea[i];
      if (t < r.brota) continue;

      // Cuánto brotó ya (se alzan, convocadas)
      var brote = suave((t - r.brota) / 2600);
      if (enSumision) brote *= 1 - tramo(t, FRENESI, FRENESI + 900);
      if (brote <= 0.01) continue;

      /* (Acá había un `if (r === laQueMuere)`: la que se sacrificaba salía
         de esta lista y había que saltearla para dibujarla aparte. Ya no:
         la mártir es una flor del marco y esta lista está vacía. Ver las
         secciones 7 y 8.) */

      /* El anhelo la acerca al altar… hasta el radio y ni un píxel más.
         REGLA 2: esto es un tope, no una intención. */
      var acercamiento = r.base - altar.radio;
      var dist = r.base - acercamiento * estiramiento * r.ansia * 0.82;
      if (dist < altar.radio) dist = altar.radio;

      var vaiven = Math.sin(ahora * (enFrenesi ? 7 : 1.6) + r.fase) *
                   (enFrenesi ? 0.05 : 0.02) * (enShock ? 0 : 1);

      var ang = r.angulo + vaiven;
      var x = altar.x + Math.cos(ang) * dist;
      var y = altar.y + Math.sin(ang) * dist;

      /* Todas miran al nombre: la rosa se orienta hacia el centro. Eso es
         lo que convierte un campo de flores en una secta. */
      var haciaElAltar = Math.atan2(altar.y - y, altar.x - x) + Math.PI / 2;

      /* En el frenesí algunas se quiebran: quedan colgando, torcidas.
         Se rompen, NO mueren (regla 3). */
      if (enFrenesi && !r.rota && Math.random() < 0.0016) r.rota = true;
      if (r.rota) r.caida = Math.min(1, r.caida + 0.02);

      dibujarUnaRosa(pincel, x, y,
        r.escala * brote,
        haciaElAltar + r.giro + r.caida * 1.5,
        brote * (enSumision ? 0.85 : 1));
      anotarLoPintado(x, y, LADO * r.escala * brote);
    }

    /* ── La mártir: ya no se estira, es un cuerpo ──

       El arranque lo hace arrancarALaMartir(), en el mismo cuadro y antes
       que esto. Acá solo se la dibuja.

       ⚠️ EL VIAJE VA POR EL RELOJ DE LA SECUENCIA, NO POR CUADROS. Antes
       esto acumulaba `muerte.vy += 0.55` en cada cuadro: a 30 cuadros por
       segundo caía la mitad de rápido que a 60, o sea que en un teléfono
       lento la rosa se posaba en otro momento de la escena. Con `t` de por
       medio, el segundo 42 es el segundo 42 en cualquier equipo. */
    if (laQueMuere && muerte.suelta && t >= MUERE_EN) {

      /* 38,5 → 42,0: viaja hasta el nombre y se posa. Es la única que
         cruza el radio, y lo cruza porque se soltó (regla 2).

         ⚡ SE POSA EN EL FILO DE ABAJO, NO EN EL CENTRO (2026-09-11).
         Aterrizaba en `altar.y`, o sea en mitad de la palabra — y encima
         por detrás, porque el lienzo estaba debajo de la jaula del nombre.
         Ahora llega al borde inferior de la caja y se corre hacia el lado
         del que vino: se apoya en la base de las letras, como algo que
         cayó y quedó ahí, y la palabra se sigue leyendo entera. */
      var viaje = suave(limitar((t - MUERE_EN) / (TOTALIDAD - MUERE_EN), 0, 1));

      var destinoY = altar.y + altar.alto * 0.42;
      var destinoX = altar.x + (muerte.x0 < altar.x ? -1 : 1) * altar.ancho * 0.26;

      muerte.x = muerte.x0 + (destinoX - muerte.x0) * viaje;
      muerte.y = muerte.y0 + (destinoY - muerte.y0) * viaje
                 - Math.sin(viaje * Math.PI) * 26;   // un cuerpo describe un arco
      muerte.giro = muerte.giro0 + viaje * 1.1;

      /* 54,0 en adelante: resbala del nombre y cae. Se le acabó el
         permiso, como a todas. 900 px/s², que es una caída creíble a
         cualquier tamaño de pantalla. */
      /* ⚠️ ELLA NO SE VA CON LAS DEMÁS. El guion es explícito: «La rosa
         muerta permanece un instante más sobre el nombre y LUEGO se
         desliza y cae». Si cayera en el 54 con el empujón, se leería como
         una cosa más que la fuerza barrió; quedándose 2,2 s sola sobre el
         nombre, se lee como lo que es: la única que llegó. */
      if (t >= CAE_LA_MARTIR) {
        var cae = (t - CAE_LA_MARTIR) / 1000;
        muerte.y += 900 * cae * cae * 0.5;
        muerte.giro += cae * 1.8;
      }

      dibujarLaOfrenda();
    }

    /* ── Los pétalos, arrastrados por la gravedad nueva ── */
    /* Baja por la misma rampa que el estiramiento y que las rosas: la
       gravedad no le devuelve el mando de un tirón, se lo va soltando. */
    var atraccion = tramo(t, PENUMBRA * 0.5, PROFUNDA) * 0.55 * (1 - retirada);

    /* El segundo 42: en la quietud de la totalidad, uno se posa sobre el
       relicario. Es el que va a sobrevivir al frenazo. Ver la sección 9b. */
    if (t >= TOTALIDAD) elegirLaReliquia();

    pincel.fillStyle = '#7d1a26';
    for (var p = 0; p < petalos.length; p++) {
      var pt = petalos[p];

      /* El posado no tiene física: está apoyado. Se dibuja y ya. */
      if (pt.posada) {
        pincel.save();
        pincel.translate(pt.x, pt.y);
        pincel.rotate(pt.giro);
        pincel.globalAlpha = 0.75;
        var mapaPosado = mapasDePetalos[pt.cual];
        if (mapaPosado && mapaPosado.listo) {
          pincel.drawImage(mapaPosado, -pt.tam, -pt.tam, pt.tam * 2, pt.tam * 2);
        } else {
          pincel.beginPath();
          pincel.ellipse(0, 0, pt.tam * 0.5, pt.tam * 0.28, 0, 0, Math.PI * 2);
          pincel.fill();
        }
        pincel.restore();
        anotarLoPintado(pt.x, pt.y, pt.tam * 2);
        continue;
      }

      /* ⚠️ NINGUNO APARECE: CADA UNO ENTRA. Los heredados nacen en el
         milisegundo cero, encima de los de la invitación; los que la
         tormenta suma van entrando a lo largo de los primeros 12 s, cada
         uno con su propio desvanecido de 1,2 s. Ver sembrarLosPetalos(). */
      if (t < pt.nace) continue;
      var entrando = limitar((t - pt.nace) / 1200, 0, 1);

      var dx = altar.x - pt.x, dy = altar.y - pt.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      /* La gravedad vuelve a ser la gravedad, pero entrando de a poco por
         la misma rampa: antes aparecía entera en un solo cuadro. */
      pt.vx += (dx / d) * atraccion * 0.42;
      pt.vy += (dy / d) * atraccion * 0.42 + 0.05 + retirada * 0.28;
      pt.vx *= 0.965; pt.vy *= 0.965;

      /* ⚡ ERAN UNA HILERA PERFECTA ALREDEDOR DEL RELICARIO (2026-09-11)
       *
       * Carlos: «los pétalos que rodean el relicario quedan básicamente
       * rotando en una hilera perfecta alrededor; dame algo de caos con el
       * relicario como centro».
       *
       * Tenía razón, y la causa era esta misma línea. El arreglo anterior
       * —convertir la velocidad de entrada en velocidad tangente al llegar
       * a `altar.radio`— sacó a los pétalos de la costra que formaban
       * contra el borde, pero los metió a TODOS en la MISMA órbita: un
       * único radio, todos a la misma altura, todos dando vueltas. Se
       * arregló el amontonamiento y se inventó un carril.
       *
       * Una corriente no es una órbita. Ahora cada pétalo tiene lo suyo:
       *
       *   · SU PROPIO RADIO, entre 0,75 y 2,2 veces el del altar. Unos
       *     rozan el anillo y otros pasan lejos.
       *   · SU PROPIA VELOCIDAD, y los de afuera van más lentos —como en
       *     cualquier remolino de verdad—, así que las filas se cruzan en
       *     vez de mantenerse.
       *   · SU PROPIA TURBULENCIA, con su fase y su frecuencia, que le
       *     mueve el radio mientras gira.
       *   · Y UNO DE CADA CINCO SALE DESPEDIDO hacia afuera y vuelve. Son
       *     los que rompen cualquier figura que se esté formando.
       *
       * ⚠️ LA REGLA 2 SIGUE INTACTA. El radio prohibido deja de ser un
       * carril y vuelve a ser lo que era: un tope duro. Ningún pétalo cruza
       * `altar.radio`, y el que lo intenta se frena ahí. */
      if (!enSumision) {
        /* ⚡ ERA CAOS, NO UNA CORRIENTE (2026-09-11)
         *
         * La ronda anterior le dio a cada pétalo su propio radio (de 0,75
         * a 2,2 veces el del altar), su propia velocidad, turbulencia, y
         * uno de cada cinco salía despedido. La intención era romper la
         * hilera perfecta. Lo que se vio en pantalla, dicho por Carlos,
         * fue «solo hay caos desordenado»: sin una figura común, veinte
         * pétalos con veinte trayectorias distintas se leen como basura
         * volando, no como algo que gira alrededor de un altar.
         *
         * Una corriente es lo contrario de un carril Y lo contrario del
         * caos: es UNA figura con variación pequeña. Todos orbitan a un
         * radio parecido y a una velocidad parecida; lo que los separa es
         * un 18 % de diferencia, no un 200 %. */
        var suRadio = altar.radio * pt.radio;

        /* Hacia su radio, no hacia el centro: lo que los ordena es la
           corriente, no una atracción pareja. */
        var sobra = d - suRadio;
        pt.vx += (dx / d) * sobra * 0.014 * atraccion;
        pt.vy += (dy / d) * sobra * 0.014 * atraccion;

        /* Y el giro: todos en el MISMO sentido —una corriente tiene un
           sentido— y a una velocidad parecida, apenas más lenta cuanto más
           lejos, que es lo que hace que las filas se crucen sin que nadie
           se salga de la figura. */
        var nx = -dx / d, ny = -dy / d;
        var vueltas = pt.prisa * atraccion *
                      (altar.radio / Math.max(altar.radio * 0.75, d)) * 0.62;
        pt.vx += -ny * vueltas;
        pt.vy +=  nx * vueltas;

        /* REGLA 2: el tope duro. No se cruza. */
        if (d < altar.radio) {
          var haciaAdentro = pt.vx * (dx / d) + pt.vy * (dy / d);
          if (haciaAdentro > 0) {
            pt.vx -= (dx / d) * haciaAdentro;
            pt.vy -= (dy / d) * haciaAdentro;
          }
        }
      }

      pt.x += pt.vx; pt.y += pt.vy; pt.giro += pt.giroVel;

      pincel.save();
      pincel.translate(pt.x, pt.y);
      pincel.rotate(pt.giro);
      pincel.globalAlpha = 0.75 * entrando;

      var mapa = mapasDePetalos[pt.cual];
      if (mapa && mapa.listo) {
        // El dibujo de verdad, centrado en su punto.
        pincel.drawImage(mapa, -pt.tam, -pt.tam, pt.tam * 2, pt.tam * 2);
      } else {
        // Mientras el SVG no terminó de decodificar, la silueta de antes.
        pincel.beginPath();
        pincel.ellipse(0, 0, pt.tam * 0.5, pt.tam * 0.28, 0, 0, Math.PI * 2);
        pincel.fill();
      }
      pincel.restore();
      anotarLoPintado(pt.x, pt.y, pt.tam * 2);
    }
  }

  /* ─── 14. LAS FLORES DEL MARCO, DESDE AFUERA ────────────────────── */

  /**
   * El tirón del frenesí: una cuenta regresiva, no un ritmo.
   *
   * ⚡ QUÉ GESTO ES ESTE, QUE NO ES EL DE ANTES (2026-09-11)
   *
   * Carlos: «cada planta ha entendido que la forma de rozar lo divino, el
   * nombre de Ania, es literalmente dando su vida, suicidándose,
   * arrancando su propio tallo… no ven muerte, ven que una lo logró, y la
   * envidian». Y: «están totalmente dispuestas a morir, a arrancarse a sí
   * mismas por seguirla, pero ya no hay tiempo, o lo dan todo o no lo
   * hacen».
   *
   * En los actos II y III las flores SE ESTIRAN HACIA el nombre. Acá no:
   * TIRAN CONTRA SU PROPIA RAÍZ. Por eso cada ciclo empieza con una
   * compresión —la cabeza vuelve hacia atrás, hacia la base— y sigue con
   * un lanzamiento que se pasa del tope. Se estira hasta romperse, no
   * hasta alcanzar. Es otro movimiento y se ve distinto.
   *
   * ⚠️ Y NO SON RÁFAGAS PAREJAS. El período se acorta de 1200 ms a 300 ms
   * a lo largo de los diez segundos: unos 15 tirones, empezando a 0,8 por
   * segundo y terminando a 3,3. Los intervalos DECRECEN porque lo que
   * aprieta es el reloj, no un compás.
   *
   * La cuenta de ciclos es la integral de dt/período con período lineal,
   * o sea un logaritmo. Se resuelve en forma cerrada a propósito: así esto
   * es una FUNCIÓN PURA DE t, se puede probar sin correr la escena, y dos
   * cuadros con el mismo t dan lo mismo.
   *
   * @param {number} t - Milisegundo de la secuencia.
   * @returns {{u: number, fase: number, empuje: number}}
   *   `u` va de 0 a 1 a lo largo del frenesí; `empuje` de -0,9 (comprimida
   *   contra la raíz) a 1 (lanzada más allá del tope).
   */
  /** Cuánto tarda el empujón del 54 en devolverlas. Corto a propósito. */
  var DURA_EL_EMPUJON = 200;

  /** Cuándo se desliza la rosa muerta: 2,2 s después del empujón. */
  var CAE_LA_MARTIR = 56200;

  /**
   * La curva del empujón: de 1 a 0 en 200 ms, pasándose un 8 %.
   *
   * Cae rápido y se PASA: a los tres cuartos del recorrido ya está en
   * -0,08 —o sea, la flor cruzó su postura de reposo hacia el otro lado— y
   * en el último cuarto vuelve a cero. Ese sobrepaso es la diferencia
   * entre «la empujaron» y «se detuvo»: un cuerpo frenado por una fuerza
   * externa rebota, uno que decide pararse no.
   *
   * @param {number} x - De 0 (recién empujada) a 1 (ya quieta).
   * @returns {number} Cuánto le queda de su gesto: 1 entero, 0 en reposo,
   *   negativo mientras está pasada.
   */
  function elEmpujon(x) {
    if (x <= 0) return 1;
    if (x >= 1) return 0;
    if (x < 0.75) return 1 - suave(x / 0.75) * 1.08;
    return -0.08 + 0.08 * suave((x - 0.75) / 0.25);
  }

  var PERIODO_INICIAL_DEL_TIRON = 1200;
  var PERIODO_FINAL_DEL_TIRON   = 300;

  function tironDelFrenesi(t) {
    if (t < SHOCK || t >= FRENESI) return { u: 0, fase: 0, empuje: 0 };

    var total = FRENESI - SHOCK;
    var u = limitar((t - SHOCK) / total, 0, 1);

    var p0 = PERIODO_INICIAL_DEL_TIRON;
    var p1 = PERIODO_FINAL_DEL_TIRON;
    var ciclos = (total / (p0 - p1)) * Math.log(p0 / (p0 - (p0 - p1) * u));
    var fase = ciclos - Math.floor(ciclos);

    var empuje;
    if (fase < 0.20) {
      /* Contra la raíz. Rápido: es un envión, no una duda. */
      empuje = -0.9 * suave(fase / 0.20);
    } else if (fase < 0.52) {
      /* El lanzamiento, que se pasa del tope. */
      empuje = -0.9 + 1.9 * suave((fase - 0.20) / 0.32);
    } else {
      /* Lo que queda del ciclo, cediendo hasta el siguiente envión. */
      empuje = 1 - suave((fase - 0.52) / 0.48);
    }

    return { u: u, fase: fase, empuje: empuje };
  }

  function moverLasFloresReales(t) {
    /* ⚡ EL MARCO PUEDE NO EXISTIR TODAVÍA CUANDO EL ECLIPSE ARRANCA
     *   (2026-09-10)
     *
     * Las flores las construye 07-marco-y-enredaderas.js cuando la escena
     * se monta, y eso pasa DESPUÉS de abrir el sobre. El eclipse puede
     * empezar antes: en el ensayo siempre, y en el de verdad cada vez que
     * alguien abre la invitación con el minuto ya empezado.
     *
     * Si se midieran una sola vez al empezar, `floresReales` quedaría
     * vacío y no pasaría absolutamente nada durante los 60 segundos — sin
     * error, sin aviso, igual que pasaba con la rosa que no rasterizaba.
     * Es la misma trampa: pedirle a la escena algo que todavía no nació.
     *
     * Se vuelve a intentar mientras no haya ninguna. La consulta al DOM es
     * barata y deja de hacerse en cuanto aparecen. */
    if (!floresReales.length) {
      if (t - ultimoIntentoDeFlores < 500) return;
      ultimoIntentoDeFlores = t;
      tomarLasFloresReales();
      if (!floresReales.length) return;
    }

    /* ⚡ EL SEGUNDO 35: SE CUENTAN LOS ESFUERZOS Y HAY UNA GANADORA.
     *
     * Trece segundos de ranking en tiempo real (desde que despierta la
     * primera, sobre el segundo 2,4) y acá se cierra la votación. La que
     * más acumuló es la que se va a arrancar. Ver elegirALaQueMuere().
     *
     * Se comprueba `!laQueMuere` y no `t === PROFUNDA` porque el marco
     * puede haber nacido tarde: si aparece en el segundo 40, se elige en
     * el 40 con lo que haya, y no se queda el minuto sin mártir. */
    if (!laQueMuere && t >= PROFUNDA) elegirALaQueMuere();

    /* El arranque de la mártir va ACÁ ARRIBA, antes de escribirle un solo
       estilo a una flor en este cuadro. Ver la nota de la función. */
    arrancarALaMartir(t);

    /* Idem: solo el diagnostico. Las flores del marco SON el rito y el
       eclipse ya no las apaga nunca. Ver la nota del gobernador. */
    if (recortado('flores')) return;

    var enSumision = t >= FRENESI;
    var enShock    = t >= TOTALIDAD && t < SHOCK;
    var ahora = t / 1000;

    /* El tirón es igual para todas —lo que aprieta es el reloj, no cada
       planta— así que se calcula UNA vez por cuadro y no doscientas. */
    var tiron = tironDelFrenesi(t);

    /* ⚡ EL EMPUJÓN DEL SEGUNDO 54, QUE NO EXISTÍA (2026-09-11)
     *
     * Acá decía `var retirada = 0;` y una nota explicando que las plantas
     * NO se calman: que siguen estirando hasta el 60 y que terminar() las
     * devuelve de golpe en el último cuadro.
     *
     * Eso contradice la instrucción de Carlos, que es literal: «el final
     * es abrupto porque una fuerza superior las empuja violentamente de
     * vuelta a la normalidad», y el guion, que pone el retorno forzado en
     * la franja 54-60 y no en el 60 pelado.
     *
     * Y dejaba al scratch huérfano: el disco se rayaba en el 54 y en
     * pantalla no pasaba nada durante seis segundos. Un sonido sin gesto.
     *
     * ⚠️ EL EMPUJÓN VIENE DE AFUERA, Y SE TIENE QUE VER ASÍ. No es una
     * rampa suave —eso sería las plantas aceptando— ni el frenazo mudo del
     * 60. Son 200 ms, todas a la vez, con un RETROCESO del 8 %: se pasan
     * de su postura de reposo y vuelven, que es lo que hace un cuerpo al
     * que empujaron, no uno que se detuvo solo.
     *
     * De los 54,2 a los 60 quedan quietas, fingiendo docilidad delante de
     * quien acaba de verlas intentar arrancarse. Eso sigue siendo lo más
     * perturbador del minuto — pero ahora es una quietud impuesta y
     * visible, no seis segundos de seguir tirando. */
    var retirada = t >= FRENESI
      ? 1 - elEmpujon(limitar((t - FRENESI) / DURA_EL_EMPUJON, 0, 1))
      : 0;

    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];

      /* La mártir ya no está en su tallo: su hueco no se anima. */
      if (f.martir && muerte.suelta) continue;

      /* Si no es el turno de su planta, este cuadro no la toca. Ver la
         nota de LOS TURNOS: lo caro es invalidar el SVG, no la flor. */
      if (!esSuTurno(f)) continue;

      /* ── 1. LA CONCIENCIA, QUE LLEGA COMO UNA ONDA ──
         Las flores más cercanas al nombre despiertan primero y las de las
         esquinas van último. No es un detalle: es lo que hace que se lea
         como algo que SE PROPAGA —una noticia corriendo por la planta—
         en vez de como un interruptor que alguien apretó. */
      var suTurno = PENUMBRA * 0.3 + (f.distancia / lejaniaMaxima) * UMBRA * 0.8;
      var despierta = suave(limitar((t - suTurno) / 6000, 0, 1));

      /* ── 2. EL DESEO, QUE CRECE ──
         De dócil a histérica. En el shock se congela —dos segundos de
         vacío, igual que la marea— y en el frenesí se desata. */
      /* ── EL SHOCK NO ES ESPANTO, ES COMPRENSIÓN ──
         Carlos: el parón es «lo que les toma entenderlo». Por eso no hay
         retroceso ni encogimiento: se quedan quietas MIRANDO, en la última
         postura que tenían. Y en los últimos 200 ms del shock todas giran
         hacia el nombre a la vez: ese gesto colectivo es lo que dice «ya
         lo saben», y es lo que enciende el frenesí. */
      var vueltaColectiva = enShock ? tramo(t, SHOCK - 200, SHOCK) : 0;

      var fervor =
          enShock    ? despierta * (0.55 + vueltaColectiva * 0.18)
        : (t >= SHOCK && t < FRENESI)
                     ? despierta * (0.55 + tiron.empuje * 0.55)
        : t >= FRENESI ? despierta * 0.55 * (1 - retirada)
        :              despierta * tramo(t, PENUMBRA * 0.3, PROFUNDA) * 0.55;

      if (fervor <= 0.001) {
        // Todavía dócil: se la deja exactamente como la dejó 07.
        if (f.tocada) { f.nodo.style.transform = f.antes; f.tocada = false; }
        continue;
      }
      f.tocada = true;

      /* ── 3. ESTIRAR HACIA EL NOMBRE ──
         Se dobla sobre su cuello en dirección al altar. El tope es 52°:
         más que eso deja de leerse como una planta estirando y empieza a
         parecer una flor rota. El `ansia` de cada una lo desordena un
         poco, que es lo que separa un coro de un pelotón. */

      /* ── 3b. EL ESFUERZO DE MÁS, QUE SOLO HACE UNA ──
         Del segundo 35 al 38,5 la mártir pasa el tope que respetan las
         otras doscientas y tiembla casi el triple. Parece rota porque SE
         ESTÁ rompiendo: es el único aviso de lo que va a pasar, y es lo
         que hace que el ojo esté puesto en ella cuando se arranque. */
      var esfuerzo = f.martir ? tramo(t, PROFUNDA, MUERE_EN) : 0;

      var inclina = f.haciaElNombre * fervor * f.ansia * 0.58 * compensacion;

      /* ── EL TOPE CEDE, Y CADA VEZ MÁS ──
         Fuera del frenesí el único que se pasa del tope es el de la
         mártir. Dentro, se pasan TODAS: de ×1,2 al empezar a ×1,9 al
         final. Ese crecimiento es la desesperación —cada intento va más
         lejos que el anterior— y es lo que hace que alguna se desgarre. */
      var topeExtra = 1 + esfuerzo * 0.45;
      if (tiron.empuje > 0) {
        var topeDelTiron = 1 + tiron.empuje * (0.2 + tiron.u * 0.7);
        if (topeDelTiron > topeExtra) topeExtra = topeDelTiron;
      }
      var tope = TOPE_DE_INCLINACION * topeExtra;
      if (inclina >  tope) inclina =  tope;
      if (inclina < -tope) inclina = -tope;

      /* ── 3c. EL RANKING, EN TIEMPO REAL ──
         Cada flor suma lo que se está esforzando AHORA. Todas reciben
         turno con la misma frecuencia (round-robin por `turno % TANDAS`),
         así que las sumas son comparables sin normalizar por nada.

         Se deja de contar en el segundo 35: a partir de ahí ya hay
         ganadora y seguir sumando no cambiaría nada, pero sí gastaría. */
      if (t < PROFUNDA) {
        f.esfuerzoAcumulado = (f.esfuerzoAcumulado || 0) + Math.abs(inclina);
      }

      /* ── 4. EL TEMBLOR ──
         Lento y mínimo cuando recién despierta; rápido y amplio en la
         histeria. En el shock se queda quieta: contiene el aliento. */
      var frecuencia = 1.4 + fervor * 9 + esfuerzo * 7;
      var amplitud   = enShock ? 0 : fervor * fervor * 9 * (1 + esfuerzo * 1.8);
      var tiembla    = Math.sin(ahora * frecuencia + f.fase) * amplitud;

      /* ── 5. TENSARSE ──
         Crece un poco al estirar, como algo que se estira de verdad. */
      var crece = 1 + fervor * 0.26 + esfuerzo * 0.12;

      /* El gesto, en grados de PANTALLA. Se guarda solo para la mártir,
         que lo necesita en el cuadro del arranque para que su copia salga
         girada exactamente como estaba ella. */
      var gesto = inclina + tiembla;
      if (f.martir) { f.gesto = gesto; f.creceAhora = crece; }

      /* ⚠️ NO SE REESCRIBE LO QUE NO CAMBIÓ. Con el valor redondeado, en
         los tramos lentos casi ninguna flor cambia de un cuadro al
         siguiente, y armar la cadena y escribirla cuesta lo mismo dé
         igual o no. Medido: 9,08 ms de cuadro bajan a 1,97. */
      var enCentesimas = Math.round(f.espejo * gesto * 100);
      var enMilesimas  = Math.round(crece * 1000);
      if (enCentesimas === f.ultimoGesto && enMilesimas === f.ultimoCrece) continue;
      f.ultimoGesto = enCentesimas;
      f.ultimoCrece = enMilesimas;

      /* Se apila sobre lo que 07 tuviera puesto, no se lo reemplaza: si esa
         flor estaba apartándose del mouse, sigue apartándose mientras
         tiembla. Y en unidades de CSS —`deg`—, que es lo que espera la
         propiedad; el atributo SVG usa números pelados y no son lo mismo.

         ⚠️ EL ÁNGULO SE MULTIPLICA POR `f.espejo`. La mitad derecha del
         marco es la izquierda reflejada, y dentro de un espejo los
         ángulos se invierten: sin esto, 94 de 198 flores se apartaban del
         nombre en vez de estirar hacia él. Ver sentidoDeLaPantalla(). */
      f.nodo.style.transform =
        (f.antes ? f.antes + ' ' : '') +
        'rotate(' + (enCentesimas / 100).toFixed(2) + 'deg) ' +
        'scale(' + (enMilesimas / 1000).toFixed(3) + ')';
    }

    moverLasRamas(t, retirada);
  }

  /* ⚡ QUE SE VEA IGUAL EN UN TELÉFONO (2026-09-10)
   *
   * 07-marco-y-enredaderas.js construye MENOS planta en pantalla chica, y
   * es correcto que lo haga: bajo 720 px no arma los dos ramilletes
   * intermedios (`:1329`) y la densidad cae de 1,15 a 0,55
   * (`densidad = limitar(innerWidth / 1250, 0.55, 1.9)`, `:1311`). En un
   * teléfono hay alrededor de un cuarto de las flores de un escritorio.
   *
   * La escena no puede depender de CUÁNTAS flores hay. Un culto de
   * cuarenta tiene que dar el mismo miedo que uno de doscientas, y la
   * forma de conseguirlo no es dibujar más: es que cada una se entregue
   * más. Menos fieles, más fervor por fiel.
   *
   * El factor se calcula UNA vez, al tomar las flores, contra la
   * referencia de escritorio. Va topado a 1,45 para que en un teléfono no
   * se convierta en un espasmo.
   *
   * ⚠️ Y EL TOPE DE INCLINACIÓN ESCALA CON EL TAMAÑO DE LA FLOR. Una
   * cabeza de 20 px inclinada 52° se lee como un tic; una de 72 px, como
   * una reverencia. Se mide la flor mediana y se ajusta, para que el
   * GESTO sea el mismo aunque el dibujo mida un tercio. */
  var FLORES_DE_REFERENCIA = 200;
  var compensacion = 1;
  var TOPE_DE_INCLINACION = 52;

  function calibrarParaLaPantalla() {
    if (!floresReales.length) return;

    compensacion = limitar(
      Math.sqrt(FLORES_DE_REFERENCIA / floresReales.length), 1, 1.45);

    /* La mediana del tamaño de las cabezas, que es lo que de verdad
       cambia entre un teléfono y un monitor. */
    var tamanos = [];
    for (var i = 0; i < floresReales.length; i++) {
      tamanos.push(floresReales[i].tamano || 40);
    }
    tamanos.sort(function (a, b) { return a - b; });
    var mediana = tamanos[Math.floor(tamanos.length / 2)] || 40;

    /* Flor chica, gesto más amplio; flor grande, más contenido. Entre 44°
       y 62°, que es el rango donde sigue leyéndose como deseo. */
    TOPE_DE_INCLINACION = limitar(52 * (44 / mediana), 44, 62);
  }

  /* ─── 15. EL BUCLE ──────────────────────────────────────────────── */

  var arranque = 0;
  var vivo = false;
  var pedidoDeCuadro = 0;
  var relojDeSeguridad = 0;
  var escuchaDeMedida = null;

  /* Multiplicador del paso del tiempo. Siempre 1 en el eclipse de verdad;
     el panel de ensayo (29-ensayo-del-eclipse.js) lo mueve para mirar una
     fase en cámara lenta o para saltearse la parte lenta.

     ⚠️ MULTIPLICA EL TIEMPO, NO LAS CONSTANTES. Las fases siguen cayendo
     en el mismo milisegundo de la secuencia (TOTALIDAD son 42 000 ms
     siempre); lo que cambia es a qué velocidad se avanza hacia ellos. Si
     en cambio se dividieran las constantes, cada fase duraría distinto y
     lo que se estaría mirando ya no sería la secuencia. */
  var velocidad = 1;

  /* ─── EL GOBERNADOR ──────────────────────────────────────────────────

     ⚡ EL GOBERNADOR ANTERIOR NO SALVÓ EL ECLIPSE: LO APAGÓ. (2026-09-11)

     Decía `if (cuadrosVistos > 30 && promedio > 21)`, y ese 21 se calibró
     mirando un viewport de 0,306 Mpx. La máquina donde Carlos revisa —un
     HP ProDesk 600 G1 DM con gráficos HD 4600— corre a 2560×1277, o sea
     3,269 Mpx: DIEZ VECES más superficie. El cuadro honesto ahí son unos
     50 ms.

     Con 50 contra un umbral de 21 la condición se cumple SIEMPRE, desde el
     primer cuadro. Y la cuenta sale redonda:

         30 cuadros × 50 ms ……………………………… 1,5 s por escalón
         escalones: TANDAS 2→6 y recorte 1→4 … 8
         1,5 × 8 ………………………………………………………… 12 SEGUNDOS

     Doce segundos hasta el nivel 4, que apagaba todo salvo el velo, el
     nombre y la mártir. Carlos lo reportó tal cual: «todo se congela,
     desde el s10 hasta el 35 solo flota una rosa». No se rompió nada: lo
     desarmó este bloque, obedeciendo un número pensado para otra pantalla.

     ⚠️ DOS CAMBIOS DE FONDO, LOS DOS DECIDIDOS POR CARLOS.

     1. EL UMBRAL SE MIDE, NO SE SUPONE. Un número fijo no puede servir a
        la vez para un teléfono de 0,8 Mpx y para un monitor de 3,3. Se
        toma la mediana de los cuadros 20 a 60 de la propia corrida —que
        caen en plena penumbra, donde el velo todavía no hace nada y la
        escena es la de cualquier otro momento del día— y el objetivo pasa
        a ser `max(28, base × 1,15)`. En el ProDesk eso da ~57 ms; en una
        máquina holgada, los 28 de piso.

        Los primeros 20 cuadros se tiran: son los de las texturas subiendo
        y los estilos resolviéndose, y no dicen nada del equipo. Es el
        mismo error que tenía el diagnóstico del panel.

     2. LA ESCALERA CEDE SUAVIDAD, NUNCA REPARTO. Antes se apagaban
        llamas, pétalos, ramas y flores. Eso es quitar la obra para que
        entre el telón. Ahora lo único que cede es cuántos píxeles hay
        detrás de los pétalos del rito:

            1-4 …… TANDAS 2 → 6      (repartir el marco; no se ve)
            5 …… escala del lienzo → 0,60
            6 …… escala del lienzo → 0,50
            —— fin de la escalera ——

        Después de 0,50 el gobernador SE CALLA y acepta los fps que haya.
        Un minuto a 24 fps con el rito entero es mejor que 30 fps con la
        escena desarmada: eso ya se probó, y fue la peor versión.

        Y nunca se tocan las rosas del marco, la marea, las ramas, las
        llamas, el velo ni la mártir. El `marea.length *= 0.82` que había
        acá también se fue: la marea son rosas, y las rosas no son lastre.
  */

  var ultimoCuadro = 0, promedio = 16.7;
  var cuadrosVistos = 0;

  /** Los cuadros que se tiran antes de creerle nada al equipo. */
  var CALENTAMIENTO = 20;
  /** Hasta acá se junta la muestra; recién después se juzga. */
  var CUADROS_PARA_JUZGAR = 60;
  /** Y nunca antes del segundo 6 de la secuencia. */
  var NO_JUZGAR_ANTES_DE = 6000;
  /** Mínimo entre un escalón y el siguiente, para que el promedio reaccione. */
  var MS_ENTRE_ESCALONES = 3000;

  var muestrasDeLaBase = [];
  var objetivoDeCuadro = 0;
  var ultimoEscalon = 0;

  /* Apagados a mano por el diagnóstico del panel, para medir cuánto cuesta
     cada parte EN LA MÁQUINA DE QUIEN MIRA. El eclipse de verdad NUNCA
     escribe acá: solo el panel de ensayo, y el panel solo existe en PBE.
     Es una herramienta de medición, no una degradación automática. */
  var recorteDePrueba = { llamas: false, ramas: false, flores: false };

  /**
   * ¿Está apagado este subsistema? Solo puede estarlo por el diagnóstico.
   *
   * ⚠️ Antes esta función también consultaba `nivelDeRecorte`, que era la
   * degradación automática. Ya no existe: ver la nota de arriba.
   */
  function recortado(que) {
    if (que === 'llamas') return recorteDePrueba.llamas;
    if (que === 'ramas')  return recorteDePrueba.ramas;
    if (que === 'flores') return recorteDePrueba.flores;
    return false;
  }

  /** Mediana de una lista de números. Ordena una copia, no la original. */
  function medianaDe(lista) {
    if (!lista.length) return 0;
    var copia = lista.slice().sort(function (a, b) { return a - b; });
    var medio = Math.floor(copia.length / 2);
    return copia.length % 2 ? copia[medio] : (copia[medio - 1] + copia[medio]) / 2;
  }

  /**
   * Aprieta un escalón. Devuelve true si de verdad cedió algo.
   *
   * Cuando ya no queda nada que ceder devuelve false y el gobernador se
   * calla para el resto de la corrida.
   */
  function apretarUnEscalon() {
    if (TANDAS < 6) { TANDAS++; return true; }
    return bajarLaEscalaDelLienzo();
  }

  function gobernar(ahora, t) {
    if (ultimoCuadro) {
      var intervalo = ahora - ultimoCuadro;
      promedio += (intervalo - promedio) * 0.08;
      cuadrosVistos++;

      /* La muestra de la base: cuadros 21 a 60, ya sin el arranque. */
      if (cuadrosVistos > CALENTAMIENTO && cuadrosVistos <= CUADROS_PARA_JUZGAR) {
        muestrasDeLaBase.push(intervalo);
      }

      if (!objetivoDeCuadro && cuadrosVistos > CUADROS_PARA_JUZGAR) {
        objetivoDeCuadro = Math.max(28, (medianaDe(muestrasDeLaBase) || 16.7) * 1.15);
        muestrasDeLaBase.length = 0;
      }

      if (objetivoDeCuadro &&
          t >= NO_JUZGAR_ANTES_DE &&
          ahora - ultimoEscalon > MS_ENTRE_ESCALONES &&
          promedio > objetivoDeCuadro) {
        if (apretarUnEscalon()) ultimoEscalon = ahora;
      }
    }
    ultimoCuadro = ahora;
  }

  function cuadro(ahora) {
    if (!vivo) return;

    /* `velocidad` es 1 en el eclipse de verdad, así que esto es la resta de
       siempre. El panel de ensayo la mueve para mirar en cámara lenta. */
    var t = (ahora - arranque) * velocidad;

    /* El único final que cuenta como completo: llegó al segundo 60 por su
       propio pie. Es lo que decide si queda la evidencia. */
    if (t >= DURACION) { terminar(true); return; }

    /* ⚠️ SI ALGO REVIENTA, SE TERMINA EL ECLIPSE — NO LA INVITACIÓN.
     *
     * Sin esto, una excepción a mitad del bucle corta el
     * requestAnimationFrame y terminar() no llega a correr nunca: las
     * capas de oscuridad y sangre quedan encima de la página PARA
     * SIEMPRE, y el invitado se queda con la invitación tapada de rojo
     * hasta que se le ocurra recargar.
     *
     * Un homenaje que puede romper la invitación no vale la pena. Ante
     * cualquier error, se limpia todo y no pasó nada. */
    try {
      unCuadro(ahora, t);
    } catch (error) {
      terminar();
    }
    return;
  }

  function unCuadro(ahora, t) {
    gobernar(ahora, t);

    /* A quién le toca moverse en este cuadro. Ver la nota de LOS TURNOS. */
    tandaDeEsteCuadro = (tandaDeEsteCuadro + 1) % TANDAS;

    medirElAltar();          // la página puede haberse movido

    /* ── LA LUZ DEL MINUTO, EN UN SOLO NÚMERO ──

       `coloresEn()` sigue devolviendo las tres curvas que definen la
       dramaturgia —la penumbra fría, la sangre y la corona— porque son tres
       cosas distintas que pasan en tres momentos distintos, y las
       comprobaciones que las cuidan siguen sirviendo. Lo que cambió es que
       ya no hay tres CAPAS: se combinan acá, en una opacidad y una
       apertura, y las pinta una sola superficie sin mezcla.

       La opacidad la manda el velo (frío + sangre); la corona no oscurece,
       ABRE — cuanto más corona, más grande el hueco de luz alrededor del
       nombre. Por eso resta en la apertura en vez de sumar en la opacidad. */
    var color = coloresEn(t);
    /* ⚠️ LOS COEFICIENTES SON 0,85 Y 0,95, Y SE MIDEN DONDE VIVE EL MARCO.
     *
     * Acá había una tabla con los valores de la v279 —alfas efectivos de
     * 0,46 y 0,82, rosas en rgb(88,27,30) y rgb(48,14,17)— que dejaron de
     * ser ciertos cuando cambiaron las paletas y los alfas de los tramos.
     * Las cuentas al día están en la nota de TRAMOS_DEL_VELO, calculadas
     * ejecutando las constantes; no se repiten acá para no tener dos
     * fuentes que se puedan desincronizar otra vez.
     *
     * Lo único que hay que saber en este punto: el tope de 0,97 existe
     * porque con `frio` y `sangre` en su máximo la suma se pasa de 1, y un
     * velo opaco del todo no es un eclipse, es una pantalla apagada. */
    var velo = limitar(color.frio * 0.85 + color.sangre * 0.95, 0, 0.97);
    capaDelEclipse.style.opacity = velo.toFixed(3);

    /* ⚡ CUÁNTO BORGOÑA HAY AHORA. Es lo que hace que el velo sea acero
     * frío en la penumbra y vino en la totalidad, en vez de ser rojo desde
     * el segundo 1. Ver la nota de las dos paletas.
     *
     * Sigue a `sangre` normalizada, así que hereda su curva exacta: vale
     * CERO hasta el segundo 35 —el rojo es exclusivo de la totalidad— y
     * llega a uno en el 38,5, que es cuando la rosa se arranca.
     *
     * `pintarElVelo` la cuantiza en doce escalones antes de decidir si
     * reescribe el degradado, así que esto no cuesta un repintado por
     * cuadro: son doce en todo el minuto. */
    mezclaDelVelo = limitar(color.sangre / SANGRE_MAXIMA, 0, 1);

    /* Dónde va la sombra en este milisegundo. Lo lee pintarElVelo(), que
       decide solo si eso justifica reescribir el degradado. */
    tDelVelo = t;

    /* ⚡ EL TERCER CONTACTO SE CUENTA CON LA LUZ, NO CON UN FLASH
     *   (2026-09-11)
     *
     * Acá había una capa blanca —después cobre— que se encendía 150 ms en
     * el segundo 44. Carlos: «quita el flash». Tenía razón por dos motivos
     * a la vez: no se entendía, y era una cuarta superficie mezclando a
     * pantalla completa para usarse un sexto de segundo.
     *
     * El acontecimiento no se pierde. La luz se viene cerrando sobre el
     * nombre desde el segundo 35 —el hueco del degradado encogiendo— y en
     * el 44 se ABRE de golpe: de su punto más cerrado a su apertura máxima
     * en 180 ms. Es el mismo tercer contacto, contado con la luz que ya
     * está en escena en vez de con un parche encima. */
    aperturaDelVelo =
        t < TOTALIDAD ? 1.30 - tramo(t, PROFUNDA, TOTALIDAD) * 0.62
      : t < SHOCK     ? 0.68 - tramo(t, TOTALIDAD, SHOCK) * 0.30
      : t < SHOCK + 180 ? 0.38 + tramo(t, SHOCK, SHOCK + 180) * 0.72
      :                 1.10 + tramo(t, SHOCK + 180, DURACION) * 0.35;

    pintarElVelo();

    moverElMundo(t);

    /* ⚠️ LAS PLANTAS VAN ANTES QUE EL LIENZO, Y EL ORDEN IMPORTA UNA SOLA
       VEZ EN TODO EL MINUTO: en el cuadro 36 500, cuando la mártir se
       apaga en el marco y aparece dibujada en el lienzo. Las dos cosas
       tienen que pasar en el MISMO cuadro o hay 16 ms con el hueco vacío,
       y un parpadeo de un cuadro es justo lo que delataría el relevo.
       Ver arrancarALaMartir(). */
    moverLasFloresReales(t);
    moverLasLlamas(t);
    dibujar(t);
    ajustarElSonido(t);

    pedidoDeCuadro = requestAnimationFrame(cuadro);
  }

  /* ─── 16. EMPEZAR Y TERMINAR ────────────────────────────────────── */

  /**
   * Deja el estado como recién cargado, para poder correr de nuevo.
   *
   * ⚡ HACE FALTA DESDE QUE EL ECLIPSE SE PUEDE REPETIR (2026-09-10)
   *
   * `sembrarLaMarea()` y `sembrarLosPetalos()` ya vaciaban sus listas, pero
   * había estado suelto que sobrevivía de una corrida a la otra:
   *
   *   · `muerte.suelta` quedaba en `true`. En la segunda corrida la rosa
   *     del sacrificio arrancaba YA SOLTADA, en el segundo cero, en vez de
   *     esperar al 36,5. Se veía enseguida y no había forma de explicarlo.
   *   · `promedio` guardaba el tiempo de cuadro de la corrida anterior. Si
   *     esa había ido pesada, la nueva arrancaba con el gobernador ya
   *     convencido de que había que recortar rosas, y recortaba antes de
   *     dibujar un solo cuadro.
   *
   * En el eclipse de verdad esto corre una sola vez y no cambia nada. Es
   * para el panel de ensayo, que es donde se ve la secuencia muchas veces
   * seguidas — y donde un arrastre así se confundiría con un defecto del
   * diseño en vez de con lo que es.
   *
   * @returns {void}
   */
  function reiniciarElEstado() {
    muerte.x = 0; muerte.y = 0; muerte.vx = 0; muerte.vy = 0;
    muerte.x0 = 0; muerte.y0 = 0; muerte.giro0 = 0;
    muerte.giro = 0; muerte.giroVel = 0; muerte.suelta = false;
    muerte.escala = 0.5; muerte.espejo = 1;
    laQueMuere = null;
    ultimoCuadro = 0;
    promedio = 16.7;
    ultimoIntentoDeFlores = -1000;
    ultimoIntentoDeLlamas = -1000;

    /* Los turnos se reparten de nuevo con el marco que haya ahora, y las
       tandas vuelven a salir de la calidad: si la corrida anterior las
       subió, esta no arranca castigada. */
    turnosPorRaiz.length = 0;
    tandaDeEsteCuadro = 0;
    cuadrosVistos = 0;

    /* ⚡ EL VELO ARRANCABA CON EL BORGOÑA DE LA CORRIDA ANTERIOR (2026-09-11)
     *
     * Carlos, mirando el panel de ensayo: «la penumbra muy roja y plana».
     * Tenía razón y la causa estaba acá: `mezclaDelVelo` y su escalón NO
     * se reiniciaban. En la SEGUNDA corrida el degradado ya estaba pintado
     * en borgoña —de la totalidad anterior— y como `pintarElVelo` solo
     * reescribe cuando el escalón CAMBIA, la penumbra entera se veía roja.
     *
     * Es el mismo patrón que ya había mordido dos veces en este archivo:
     * estado que sobrevive de una corrida a la otra. En el eclipse de
     * verdad se nota menos —hay una sola corrida por día— pero es en el
     * ensayo donde se mira, y ahí era permanente. */
    /* El pestillo del scratch: sin esto, la segunda corrida del panel de
       ensayo pasaria muda. */
    yaSonoElScratch = false;

    /* ⚡ LA TRAMA SOBREVIVÍA A LA CORRIDA (2026-09-11)
     *
     * `ESCALA_DEL_LIENZO` se calculaba UNA vez al evaluar el archivo y el
     * gobernador la bajaba a 0,60 y a 0,50. Nadie la devolvía. En el panel
     * de ensayo, la primera corrida que activara el gobernador dejaba
     * TODAS las siguientes a 0,50 hasta recargar la página — o sea que lo
     * que Carlos mirara después ya no era lo que el código hace.
     *
     * Es el tercer estado de este archivo que se escapa de la misma forma
     * (antes fueron `muerte.suelta`, `promedio` y `mezclaDelVelo`). */
    ESCALA_DEL_LIENZO = esBaja ? 0.72 : 1;
    medirElLienzo();

    /* Y la apertura: `empezar()` llama a pintarElVelo() antes del primer
       cuadro, así que sin esto el degradado nacía con la apertura final de
       la corrida anterior. Se corrige sola en el cuadro 1, pero nacer mal
       es nacer mal. */
    aperturaDelVelo = 1;

    mezclaDelVelo = 0;
    ultimoEscalonDeMezcla = -1;

    /* Y dónde va la sombra: sin esto la corrida siguiente del panel de
       ensayo arrancaría con el desvío final de la anterior, o sea con la
       luz ya del lado equivocado. */
    tDelVelo = 0;
    ultimaAperturaPintada = -1;

    /* La base se vuelve a medir en cada corrida: la ventana puede haber
       cambiado de tamano entre una y otra, y con ella el costo del cuadro. */
    muestrasDeLaBase.length = 0;
    objetivoDeCuadro = 0;
    ultimoEscalon = 0;
    calibrarLasTandas();

    /* La evidencia de la corrida anterior no puede quedar colgada de la
       siguiente: en el ensayo se corre la secuencia una y otra vez. */
    limpiarLaReliquia();

    /* El marco se reconstruye al cambiar el tamaño de la ventana, así que
       los nodos de la corrida anterior pueden ya no existir. La caché de
       reflejos se mide de nuevo con las flores. */
    sentidosMedidos.length = 0;
  }

  function empezar(desfase) {
    if (vivo) return;
    vivo = true;
    reiniciarElEstado();

    tomarElMundo();

    coronarElNombre();
    /* ⚠️ EL ORDEN DE ESTAS LÍNEAS NO IMPORTA —manda el z-index— pero SÍ
       importa cuál está y cuál no: la del destello y la de la ofrenda se
       atan solo cuando hay algo que poner en ellas. Una capa de compositor
       vacía se paga igual que una llena. */
    document.body.appendChild(lienzo);
    document.body.appendChild(capaDelEclipse);

    medirElAltar();
    /* El velo tiene que tener su degradado ANTES del primer cuadro: si se
       pintara recién en unCuadro(), el cuadro cero se vería sin él. */
    pintarElVelo();
    sembrarLaMarea();
    sembrarLosPetalos();
    /* ⚠️ La mártir se elige DENTRO de esto, no acá: es una flor del marco
       y el marco puede no existir todavía. Ver la sección 8. */
    tomarLasFloresReales();
    apagarLosPetalosDeSiempre();
    engancharElSonido();

    /* ⚡ EN EL CELULAR, EL LIENZO SE BORRABA SOLO A MITAD DEL RITUAL
       (2026-09-10)

       Esto estaba enganchado a `resize` en crudo. En un teléfono, la barra
       del navegador aparece y desaparece al desplazarse, y cada vez que lo
       hace dispara un `resize` — aunque el ancho no haya cambiado ni un
       pixel. `medirElLienzo` reasigna `canvas.width`, y asignar el ancho de
       un canvas LO BORRA ENTERO: la marea desaparecía y volvía a dibujarse
       al cuadro siguiente, con un parpadeo, cada vez que el dedo se movía.

       Los otros dos lienzos del proyecto ya se protegen de ese resize falso
       con alCambiarElAncho() (23-lienzo-de-luz.js, 24-lienzo-de-petalos.js).
       Se reusa esa misma función en vez de escribir otra: es exactamente el
       mismo problema.

       ⚠️ Se guarda la referencia envuelta porque removeEventListener()
       necesita LA MISMA función para poder quitarla. Pasarle
       `alCambiarElAncho(medirElLienzo)` de nuevo al terminar crearía una
       envoltura distinta y el escucha quedaría puesto para siempre. */
    /* Cambiar el ancho reacomoda el marco Y puede mover el nombre dentro
       del documento: las dos cosas se rehacen juntas. */
    function alRedimensionar() {
      medirElLienzo();
      acomodarLaCopia();
      /* ⚠️ EL VELO YA NO SE ENTERA DEL RESIZE, y es correcto: su geometría
         está en porcentajes de pantalla, no en píxeles, así que el mismo
         degradado vale para cualquier tamaño. Se fuerza el repintado solo
         por si la capa nació antes de que hubiera nada. */
      ultimoEscalonDeMezcla = -1;
      pintarElVelo();
    }

    escuchaDeMedida = (typeof alCambiarElAncho === 'function')
      ? alCambiarElAncho(alRedimensionar)
      : alRedimensionar;
    window.addEventListener('resize', escuchaDeMedida);

    /* Si alguien llegó con el minuto empezado, se entra por donde va: el
       eclipse no espera a nadie ni se reinicia para nadie.

       El `/ velocidad` es para que el desfase se lea en tiempo de la
       SECUENCIA y no en tiempo de reloj: pedir "arrancá en el segundo 42"
       a media velocidad tiene que dejar la secuencia en el 42, no en el 21. */
    arranque = performance.now() - (desfase > 0 ? desfase : 0) / velocidad;
    pedidoDeCuadro = requestAnimationFrame(cuadro);

    /* ⚠️ EL SEGURO DE ÚLTIMA INSTANCIA.
     *
     * El bucle se apoya en requestAnimationFrame, y hay una forma de que
     * deje de llamarse sin que nadie se entere: si el navegador manda la
     * pestaña al fondo a mitad del minuto, los cuadros se congelan. Al
     * volver, `t` ya pasó los 60 s y terminar() corre — pero si la
     * persona no vuelve nunca a esa pestaña, las capas se quedan puestas
     * encima de la invitación.
     *
     * Este reloj no depende de los cuadros: a los 61 s se acabó, se haya
     * dibujado o no. Es la diferencia entre un homenaje y una invitación
     * arruinada.
     *
     * ⚠️ SE GUARDA Y SE CANCELA AL TERMINAR (2026-09-10). Antes se lanzaba
     * y se olvidaba, lo cual era inofensivo cuando el eclipse corría una
     * sola vez. Con el panel de ensayo se corre muchas: cada corrida
     * dejaba su reloj andando, y el de la corrida vieja podía cortar la
     * NUEVA en cualquier momento. El `if (vivo)` no alcanzaba, porque en
     * la corrida siguiente `vivo` vuelve a ser verdadero.
     *
     * El plazo se divide por la velocidad: a ×0.25 el minuto dura cuatro
     * minutos de reloj, y un seguro de 61 s cortaría la secuencia por la
     * mitad. Se le suma el margen de siempre sobre el tiempo real. */
    relojDeSeguridad = setTimeout(function () {
      if (vivo) terminar();
    }, DURACION / velocidad + 1000);
  }

  /* ⚠️ EL FINAL ES UN FRENAZO Y NO SE PUEDE SUAVIZAR.
     Un final gradual se entiende, y entender es olvidar: el espectador
     cierra la escena y sigue. El empujón violento no lo deja cerrarla y
     lo deja preguntándose qué acaba de ver. Esa duda ES el efecto.
     Nada de transiciones acá. Se ve brusco a propósito. */
  /**
   * @param {boolean} [completo] - true solo cuando la secuencia llegó al
   *   segundo 60 por su propio pie. El pétalo que sobrevive al frenazo
   *   —la única evidencia— depende de esto: si el eclipse se cortó por un
   *   error, por el reloj de seguridad o porque alguien apretó «Cortar»
   *   en el panel de ensayo, no hubo ritual y no hay nada que dejar.
   */
  function terminar(completo) {
    vivo = false;
    if (pedidoDeCuadro) cancelAnimationFrame(pedidoDeCuadro);

    /* El seguro de esta corrida ya no tiene a quién cuidar. Si se dejara
       andando, cortaría la corrida SIGUIENTE del panel de ensayo. */
    if (relojDeSeguridad) { clearTimeout(relojDeSeguridad); relojDeSeguridad = 0; }

    // La MISMA función que se enganchó, no una envoltura nueva. Ver arriba.
    if (escuchaDeMedida) window.removeEventListener('resize', escuchaDeMedida);
    escuchaDeMedida = null;

    devolverLasFloresReales();
    devolverLasRamas();
    devolverLasLlamas();
    devolverLosPetalosDeSiempre();
    devolverElNombre();
    soltarElSonido();

    /* El sol vuelve a estar donde estaba, los rayos y las motas vuelven a
       su array, el velo a su valor. Va ANTES de sacar las capas para que
       el primer cuadro sin eclipse ya tenga la luz de siempre: si se
       devolviera después, habría un parpadeo de una pantalla iluminada sin
       sol. */
    devolverElMundo();

    [capaDelEclipse, lienzo, lienzoDeLaOfrenda].forEach(function (c) {
      if (c.parentNode) c.parentNode.removeChild(c);
    });
    cajaAnteriorDeLaOfrenda = null;
    ultimaAperturaPintada = -1;
    ultimoEscalonDeMezcla = -1;

    /* Y en el mismo cuadro en que desaparece todo, lo único que no
       desaparece. No es una transición: es un objeto que se queda. Ver la
       sección 9b. */
    if (completo) dejarLaReliquia();
    else          limpiarLaReliquia();

    // Mañana otra vez.
  }

  /* ─── 17. LA PUERTA ─────────────────────────────────────────────── */

  var faltan = typeof window.ECLIPSE_EMPIEZA_EN === 'number'
             ? window.ECLIPSE_EMPIEZA_EN : 0;

  /* ⚠️ EN MODO ENSAYO EL ARCHIVO SE CARGA PERO NO ARRANCA SOLO.
     El panel (29-ensayo-del-eclipse.js) es quien decide cuándo correr y
     desde qué segundo. Sin esta bandera, abrir el ensayo dispararía la
     secuencia entera en la cara antes de que el panel existiera siquiera,
     y habría que esperar el minuto completo para poder tocar un botón.
     La rosa igual se rasteriza ahora: es el trabajo pesado, y conviene
     tenerlo hecho antes del primer «Reproducir». */
  var soloEnsayo = window.ECLIPSE_SOLO_ENSAYO === true;

  rasterizarLaRosa(function () {
    if (soloEnsayo) return;
    if (faltan > 0) setTimeout(function () { empezar(0); }, faltan);
    else            empezar(-faltan);      // ya había empezado: se entra en curso
  });

  /* ─── 18. LA PUERTA DEL ENSAYO · SOLO EN PBE ────────────────────────

     El eclipse ocurre una vez al día, a las 6:30 de la mañana. Eso lo
     vuelve casi imposible de mirar mientras se lo construye: hay que
     estar despierto, en la pestaña correcta, sin haber tocado un campo de
     texto, y acertarle al minuto. En la práctica el homenaje se subió a
     producción sin que nadie lo hubiera visto entero ni una vez.

     Esta puerta la abre 29-ensayo-del-eclipse.js, que pinta un panel con
     los botones para correrlo cuantas veces haga falta.

     ⚠️ NO EXISTE EN PRODUCCIÓN, Y ESO NO ES UNA PRECAUCIÓN DE ESTILO.
     Un `window.ECLIPSE.correr()` disponible en aniaxv.com es un botón
     para taparle la invitación de rojo a un invitado que está llenando
     el formulario. La misma prueba que ya encierra `?eclipse=ensayo` en
     PBE (comprobación 15 de prueba-eclipse.mjs) comprueba también esto.

     Se pregunta por el HOSTNAME, no por un parámetro de URL: un
     parámetro lo escribe cualquiera. */
  var esPbe = /(^|\.)pbe\./.test(location.hostname) ||
              location.pathname.indexOf('/pbe/') === 0;

  if (esPbe) {
    window.ECLIPSE = {
      /**
       * Corre la secuencia.
       *
       * @param {number} [desde] - Milisegundo de la secuencia por el que
       *   entrar. 0 es el principio.
       * @param {number} [aQueVelocidad] - 1 es tiempo real; 0.25 es cuatro
       *   veces más lento; 4 es cuatro veces más rápido.
       * @returns {void}
       */
      correr: function (desde, aQueVelocidad) {
        if (vivo) terminar();          // cortar la anterior antes de empezar
        velocidad = Number(aQueVelocidad) > 0 ? Number(aQueVelocidad) : 1;
        empezar(Number(desde) > 0 ? Number(desde) : 0);
      },

      cortar: function () { if (vivo) terminar(); },

      enCurso: function () { return vivo; },

      /** El milisegundo de la secuencia que se está dibujando, o -1. */
      dondeVa: function () {
        return vivo ? (performance.now() - arranque) * velocidad : -1;
      },

      /* Las fases con su milisegundo real, sacadas de las constantes de
         este archivo. El panel las lee de acá y no las copia: si mañana
         alguien mueve TOTALIDAD, el botón se mueve con ella.

         ⚠️ LAS CONSTANTES ESTÁN NOMBRADAS POR DÓNDE TERMINA CADA COSA, NO
         POR DÓNDE EMPIEZA, y es una trampa fácil de pisar. Las banderas
         de dibujar() son la verdad:

             enShock    = t >= TOTALIDAD && t < SHOCK     → 42 s a 44 s
             enFrenesi  = t >= SHOCK     && t < FRENESI   → 44 s a 54 s
             enSumision = t >= FRENESI                    → 54 s en adelante

         O sea que la constante `SHOCK` marca el FIN del shock y el
         principio del frenesí. La primera versión de esta lista usaba los
         nombres tal cual —Totalidad en TOTALIDAD, Shock en SHOCK— y el
         reloj del panel decía «Shock» en el segundo 49, con el frenesí en
         plena marcha. Se notó a los dos minutos de poder mirarlo, que es
         exactamente para lo que sirve poder mirarlo. */
      fases: [
        { nombre: 'Penumbra',      en: 0 },
        { nombre: 'Despiertan',    en: PENUMBRA },
        { nombre: 'La secta',      en: UMBRA },
        { nombre: 'El esfuerzo',   en: PROFUNDA },
        { nombre: 'Muere la rosa', en: MUERE_EN },
        { nombre: 'Shock',         en: TOTALIDAD },
        { nombre: 'Frenesí',       en: SHOCK },
        { nombre: 'Sumisión',      en: FRENESI }
      ],

      duracion: DURACION,

      /** Para que el panel pueda decir si la calidad alta está activa. */
      esAlta: esAlta,

      /* Cuántas flores del marco alcanzó a tomar. Es el número que decide
         si hay escena o no: con cero, el eclipse corre sin que las plantas
         se muevan y no se entiende nada. El panel lo muestra para que un
         cero se vea en vez de tener que deducirlo. */
      cuantasFlores: function () { return floresReales.length; },

      /**
       * El recuento de la escena, para mirarlo en vez de deducirlo.
       *
       * `reflejadas` es el que importa: si diera 0 con el marco entero en
       * pantalla, sería que el detector de espejos dejó de funcionar y la
       * mitad del culto está estirando al revés otra vez — que es el
       * defecto que estuvo dos versiones sin que nadie lo viera.
       *
       * @returns {Object}
       */
      recuento: function () {
        var reflejadas = 0;
        for (var i = 0; i < floresReales.length; i++) {
          if (floresReales[i].espejo === -1) reflejadas++;
        }
        return {
          flores: floresReales.length,
          reflejadas: reflejadas,
          ramas: ramas.length,
          llamas: llamas.length,
          petalos: petalos.length,
          martir: !!laQueMuere,
          rosaRasterizada: !!mapaDeLaRosa,
          tinta: tintaDeLaRosa,
          /* Lo que cuesta el cuadro, en milisegundos, y en cuántas tandas
             se está repartiendo el marco. El presupuesto de un cuadro a
             60 Hz son 16,7 ms: si `msPorCuadro` se va de ahí, la escena le
             está costando a la página. */
          msPorCuadro: promedio,
          tandas: TANDAS,
          /* Lo unico que el gobernador puede haber cedido. La escena
             siempre esta completa: ya no hay degradacion por recorte. */
          objetivo: objetivoDeCuadro,
          escalaDelLienzo: ESCALA_DEL_LIENZO
        };
      },

      /* Lo que el panel necesita para medir el coste de cada parte del
         eclipse: poder apagarlas de a una. Solo existe en PBE. */
      apagarParaMedir: function (que, apagado) {
        if (que === 'velo') {
          capaDelEclipse.style.display = apagado ? 'none' : '';
        } else if (que === 'lienzo') {
          lienzo.style.display = apagado ? 'none' : '';
        } else if (que === 'marco') {
          recorteDePrueba.flores = !!apagado;
        } else if (que === 'ramas') {
          recorteDePrueba.ramas = !!apagado;
          if (apagado) devolverLasRamas();
        } else if (que === 'llamas') {
          recorteDePrueba.llamas = !!apagado;
          if (apagado) devolverLasLlamas();
        }
      }
    };
  }
})();
