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

  /** Cuándo muere la rosa: dentro de la totalidad, no antes. */
  var MUERE_EN   = 36500;

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

  /* ─── 3. LAS CAPAS ──────────────────────────────────────────────────

     ⚠️ POR QUÉ DOS CAPAS DE COLOR Y NO UNA QUE CAMBIA DE COLOR

     Reescribir `background-color` en cada cuadro obliga al navegador a
     REPINTAR una superficie del tamaño de la pantalla, sesenta veces por
     segundo. En un teléfono eso solo ya se come el cuadro.

     Con dos capas de color fijo y solo la OPACIDAD animada, el trabajo
     lo hace el compositor y no el hilo principal: es casi gratis. Por eso
     hay una capa fría (la penumbra y la umbra) y una capa de sangre (la
     totalidad), y lo único que se toca es cuánto se ve cada una.

     ⚠️ Y POR QUÉ NO SE USA `filter` NI `backdrop-filter`
     Porque un filtro sobre un ANCESTRO del <h1> tiñe también al <h1>, y
     desde el hijo no hay forma de escaparse. Sería la manera silenciosa
     de romper la regla 1. Estas capas son HERMANAS, nunca ancestros. */

  function capa(color, mezcla) {
    var d = document.createElement('div');
    d.className = 'eclipse-capa';
    d.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;' +
                      'background:' + color + ';z-index:2147483000;' +
                      (mezcla ? 'mix-blend-mode:' + mezcla + ';' : '');
    return d;
  }

  /* Frío y desaturado: la penumbra de un eclipse real, que NO es negra
     sino metálica y fría. `multiply` oscurece sin tapar, así que la
     escena sigue leyéndose debajo. */
  var capaFria   = capa('#0a1622', 'multiply');

  /* Rojo sangre seca / ladrillo. SOLO existe en la totalidad: si el rojo
     apareciera desde el principio dejaría de significar «este es el
     momento sagrado y terrible» y sería un filtro más. */
  var capaSangre = capa('#4a0d0d', 'multiply');

  /* ⚡ EL ANILLO DE DIAMANTE (2026-09-10)
   *
   * En un eclipse real, el instante en que la luna empieza a descubrir el
   * sol produce un destello único y cegador: un punto de luz sobre el
   * anillo de la corona. Dura menos de un segundo y es lo que todo el
   * mundo espera cuando va a ver un eclipse.
   *
   * Acá cae en el segundo 44,0 —el tercer contacto, astronómicamente
   * correcto— y hace doble trabajo: rompe los dos segundos de vacío del
   * shock y es LA SEÑAL que el culto estaba esperando. Antes del anillo
   * las plantas contienen el aliento; después, se desatan.
   *
   * ⚠️ VA EN `screen`, NO EN `multiply`. Las otras dos capas oscurecen
   * multiplicando; esta tiene que AÑADIR luz, o sería un velo blanco
   * lavando la escena en vez de un destello. Y dura 150 ms: más que eso
   * deja de ser un relámpago y pasa a ser un fundido a blanco. */
  var capaDestello = capa('#fff6e0', 'screen');

  /* El lienzo de la marea. Encima de las dos capas de color: las rosas
     están DENTRO del eclipse, no debajo. */
  var lienzo = document.createElement('canvas');
  lienzo.className = 'eclipse-capa';
  lienzo.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
                         'z-index:2147483001;';
  var pincel = lienzo.getContext('2d');

  /* Densidad de píxeles: se topa en 2. Un teléfono con 3x pintaría más
     del doble de píxeles por el mismo resultado visible. */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function medirElLienzo() {
    lienzo.width  = Math.floor(window.innerWidth  * dpr);
    lienzo.height = Math.floor(window.innerHeight * dpr);
    pincel.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    jaula.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;' +
                          'z-index:2147483002;isolation:isolate;';

    copiaDelNombre = nombre.cloneNode(true);
    copiaDelNombre.removeAttribute('id');

    /* Se le copian los estilos YA RESUELTOS. Hace falta porque el tamaño
       de letra sale de `--ancho-broche`, una variable que vive en un
       ancestro: fuera de la portada no resolvería y el nombre saldría
       con otro cuerpo. Se hace UNA vez, no por cuadro. */
    copiarLosEstilosResueltos(nombre, copiaDelNombre);

    copiaDelNombre.style.margin = '0';
    jaula.appendChild(copiaDelNombre);
    document.body.appendChild(jaula);

    nombre.style.visibility = 'hidden';
    acomodarLaCopia();
  }

  /**
   * El nombre sigue brillando como si nada.
   *
   * ⚡ ESTE ES EL PLANO MÁS IMPORTANTE DEL MINUTO (2026-09-10)
   *
   * El oro del nombre no es un color plano: es un degradado de pan de oro
   * recortado sobre las letras, y la posición de ese degradado la manda
   * `--luz-x` — o sea, DÓNDE ESTÁ EL SOL. 14-haces-de-luz.js se la escribe
   * inline a `.portada__nombre` cada 32-90 ms, junto con
   * `--luz-intensidad`, que es cuánta luz hay.
   *
   * Durante el eclipse el sol muere: `--luz-intensidad` se desploma y el
   * destello del nombre se apagaría con todo lo demás. Y eso sería
   * exactamente al revés de lo que la escena significa.
   *
   * La deidad no depende del sol. No se apaga cuando el mundo se apaga,
   * no se enciende más porque la adoren, no mira a nadie. Su oro sigue
   * recorriendo las letras al mismo ritmo de un día cualquiera, mientras
   * afuera se acaba la luz y doscientas plantas se retuercen por ella.
   * Es indiferencia hecha de luz.
   *
   * ⚠️ POR QUÉ SE PUEDE. La copia del nombre vive dentro de la jaula del
   * eclipse y NADIE MÁS LA TOCA: 14 le escribe al original, no al clon.
   * O sea que el clon es el único lugar de la página donde podemos poner
   * un sol propio sin pelearnos con el módulo que manda la luz. Al
   * terminar, la jaula se va entera y no queda rastro.
   *
   * El ritmo (11,5 s por recorrido) es el mismo orden que el de la deriva
   * real del sol, para que quien mire dos veces no note que el de adentro
   * y el de afuera dejaron de ser el mismo.
   *
   * @param {number} t - Milisegundo de la secuencia.
   * @returns {void}
   */
  function elNombreNoSeEntera(t) {
    if (!copiaDelNombre) return;

    var recorrido = (t % 11500) / 11500;      // 0 → 1, en bucle, sin pausas
    copiaDelNombre.style.setProperty('--luz-x', recorrido.toFixed(4));

    /* Fija, y alta. El mundo pierde su luz; esta no era del mundo. */
    copiaDelNombre.style.setProperty('--luz-intensidad', '0.62');
  }

  /** Deja la copia justo encima del original. Se llama por cuadro porque
      la página se puede desplazar mientras dura el eclipse. */
  function acomodarLaCopia() {
    if (!jaula) return;
    var caja = nombre.getBoundingClientRect();
    jaula.style.width  = caja.width + 'px';
    jaula.style.height = caja.height + 'px';
    // translate3d y no top/left: lo mueve el compositor, sin recalcular
    // el diseño de la página en cada cuadro.
    jaula.style.transform = 'translate3d(' + caja.left + 'px,' + caja.top + 'px,0)';
  }

  function devolverElNombre() {
    nombre.style.visibility = visibilidadOriginal;
    if (jaula && jaula.parentNode) jaula.parentNode.removeChild(jaula);
    jaula = null;
    copiaDelNombre = null;
  }

  /* ─── 5. DÓNDE ESTÁ EL ALTAR, Y EL RADIO PROHIBIDO ─────────────── */

  var altar = { x: 0, y: 0, radio: 0 };

  function medirElAltar() {
    var caja = nombre.getBoundingClientRect();
    altar.x = caja.left + caja.width  / 2;
    altar.y = caja.top  + caja.height / 2;

    /* El radio que nadie cruza (regla 2). Se calcula sobre la caja REAL
       del nombre para que valga igual en un teléfono vertical que en un
       monitor ancho: siempre queda un anillo proporcionado alrededor de
       la palabra, ni pegado ni perdido a media pantalla. */
    altar.radio = Math.max(caja.width, caja.height) * 0.95 + 26;
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

  /**
   * Cuánto mide DE VERDAD una flor del marco en pantalla, en píxeles.
   *
   * ⚠️ NO se usa getBoundingClientRect() para esto, y la diferencia es
   * grande. Esa caja está alineada a los ejes de la pantalla, y las flores
   * están giradas dentro de su `<use>`: la caja de una rosa girada 30° es
   * bastante más grande que la rosa. Medido sobre las 198 flores de PBE, la
   * caja exagera un 18 % en la mediana y hasta un 39 %. Una copia un 39 %
   * más grande que la flor que reemplaza no releva a nadie: se ve.
   *
   * La matriz de pantalla del `<use>` da los píxeles por unidad de dibujo,
   * y getBBox() da la caja del símbolo SIN girar. El producto es la
   * extensión real de la flor. Comprobado contra las cajas reales de las
   * 198 flores: 0,22 % de error en la mediana, 2,6 % en el peor caso.
   *
   * @param {Element} movil
   * @returns {number} píxeles, o 0 si el navegador no contesta.
   */
  function ladoRealDeLaFlor(movil) {
    try {
      var uso = movil.querySelector('use');
      if (!uso || !uso.getScreenCTM || !uso.getBBox) return 0;

      var m = uso.getScreenCTM();
      var caja = uso.getBBox();
      if (!m || !caja || !caja.width) return 0;

      /* La raíz del determinante es el factor de escala de la matriz, sin
         que el giro ni el reflejo lo ensucien. */
      var k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      return Math.max(caja.width, caja.height) * k;
    } catch (e) { return 0; }
  }

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

     A los 36,5 s se le pone `opacity: 0` a la flor y se dibuja en el
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

  function elegirALaQueMuere() {
    laQueMuere = null;
    if (!floresReales.length) return;

    /* Las que ya están al lado del nombre: la quinta parte más cercana.
       Que se arranque una de la esquina no significaría nada — quien se
       ofrece es quien ya estaba tocando el altar. */
    var cerca = floresReales.slice();
    cerca.sort(function (a, b) { return a.distancia - b.distancia; });
    cerca.length = Math.max(1, Math.floor(cerca.length * 0.2));

    /* Y de ésas, la más grande. Una cabeza de 14 px arrancándose no se ve;
       el sacrificio tiene que poder mirarse. */
    var mejor = null;
    for (var i = 0; i < cerca.length; i++) {
      if (!mejor || cerca[i].tamano > mejor.tamano) mejor = cerca[i];
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

  function sembrarLosPetalos() {
    prepararLosPetalos();

    var cuantos = esAlta ? 90 : 40;
    petalos.length = 0;
    for (var i = 0; i < cuantos; i++) {
      petalos.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, vy: 0,
        /* ⚡ EL TAMAÑO SALE DE LOS PÉTALOS DE LA INVITACIÓN (2026-09-11)
         *
         * Acá había `9 + Math.random() * 13` — píxeles fijos, iguales en un
         * monitor de 27 pulgadas y en un teléfono. Se dibujan a `tam * 2`,
         * así que eran de 18 a 44 px SIEMPRE; y en una pantalla angosta la
         * rosa mediana del marco mide 13 px. Un pétalo tres veces más
         * grande que la flor de al lado.
         *
         * El eclipse ya usa los DIBUJOS de los pétalos de la invitación
         * —para que el pétalo que cae durante el minuto sea el mismo que
         * caía un segundo antes—. Con más razón tiene que usar sus
         * TAMAÑOS, que 06-petalos-con-fisica.js ya calcula en proporción al
         * marco, en cada ancho de pantalla. Así esto queda proporcionado
         * sin tener que repetir acá la cuenta ni mantenerla sincronizada.
         *
         * El respaldo es para cuando ese módulo se apagó para medir: la
         * misma cuenta, a ojo, en vez de un número fijo. */
        tam: tamanoDeUnPetalo(),
        giro: Math.random() * Math.PI * 2,
        /* Cada uno gira a su ritmo y en su sentido: noventa pétalos con
           el mismo `+= 0.03` se movían como un solo objeto. */
        giroVel: (Math.random() - 0.5) * 0.05,
        cual: i % 3,
        posado: false,
      });
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
           gratis; en el segundo 36,5 costaría un recálculo entero. */
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

    /* ⚠️ ACÁ Y NO EN empezar(). La mártir es una flor DEL MARCO, así que
       no se la puede elegir antes de que el marco exista — y puede no
       existir todavía cuando el eclipse arranca (ver la nota de
       moverLasFloresReales). Elegirla acá significa que se elige en el
       mismo momento en que hay de dónde elegir, corra esto al empezar o
       quince segundos después. */
    elegirALaQueMuere();
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
    if (!ramas.length) return;

    var enShock = t >= TOTALIDAD && t < SHOCK;
    var ahora = t / 1000;

    for (var i = 0; i < ramas.length; i++) {
      var r = ramas[i];

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
         reflejado los ángulos se invierten. */
      r.nodo.style.rotate =
        (r.espejo * (dobla + tiembla + latigazo)).toFixed(2) + 'deg';
      r.nodo.style.scale  = (1 + fervor * 0.1).toFixed(3);
    }
  }

  /**
   * El segundo 36,5: la mártir se arranca de su tallo, a la vista.
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
      lienzoDeLaReliquia.width  = Math.floor(window.innerWidth  * dpr);
      lienzoDeLaReliquia.height = Math.floor(window.innerHeight * dpr);
      pincelDeLaReliquia = lienzoDeLaReliquia.getContext('2d');
      pincelDeLaReliquia.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    /* La curva del sol: muere del todo a los 26 s y vuelve entre el 57 y
       el 59,9. NO vuelve al mismo tiempo que las plantas se calman — las
       plantas no se calman hasta el frenazo. Ese desacople es el punto:
       la luz regresa y ellas siguen estirando, con el permiso
       terminándose. */
    var muriendo = limitar(t / 26000, 0, 1);
    var volviendo = t >= 57000 ? limitar((t - 57000) / 2900, 0, 1) : 0;
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
        var sinLuz = t >= 26000 && t < 57000;
        window.LienzoDeLuz.haces = sinLuz ? [] : mundo.haces;

        /* A los 33 s se apaga lo que flota: motas de polvo y luciérnagas.
           Nada vivo que no sea el culto. */
        var sinFauna = t >= 33000 && t < 57000;
        window.LienzoDeLuz.motas = sinFauna ? [] : mundo.motas;
        window.LienzoDeLuz.fauna = sinFauna ? [] : mundo.fauna;
      }

      /* El velo de profundidad se cierra: las esquinas dejan de existir.
         Entra a los 30 s y se retira con la luz. */
      if (mundo.velo) {
        var cierre = limitar((t - 30000) / 5000, 0, 1) * (1 - volviendo);
        if (cierre > 0.001) {
          mundo.velo.nodo.style.setProperty('--profundidad-de-sombra',
            (0.2 + cierre * 0.7).toFixed(3));
        } else if (mundo.velo.prof) {
          mundo.velo.nodo.style.setProperty('--profundidad-de-sombra', mundo.velo.prof);
        } else {
          mundo.velo.nodo.style.removeProperty('--profundidad-de-sombra');
        }
      }
    } catch (e) { /* un módulo que no está no puede romper el homenaje */ }
  }

  function devolverElMundo() {
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

  function ajustarElSonido(t) {
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
     * las capas. El scratch de disco rayado sigue estando —son 600 ms, no
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
  function coloresEn(t) {
    var frio = t < FRENESI
      ? tramo(t, 0, PROFUNDA) * 0.88
      : 0.88 * (1 - tramo(t, FRENESI, FRENESI + 600));

    /* ⚠️ EL ROJO ES EXCLUSIVO DE LA TOTALIDAD.
       Si apareciera antes dejaría de significar «este es el momento
       sagrado y terrible» y sería un filtro de color más. Por eso el
       primer tramo es un cero duro y no una rampa que empieza bajito. */
    var sangre = t < PROFUNDA ? 0
      : t < SHOCK   ? tramo(t, PROFUNDA, TOTALIDAD) * 0.92
      : t < FRENESI ? 0.92 - tramo(t, SHOCK, FRENESI) * 0.25
      : 0.67 * (1 - tramo(t, FRENESI, FRENESI + 500));

    return { frio: frio, sangre: sangre };
  }

  /**
   * @param {number} [espejo] - -1 para dibujarla reflejada. La mártir sale
   *   de un lado del marco que puede estar en espejo, y la copia tiene que
   *   ser la MISMA imagen que estaba en pantalla, no su reflejo. Se aplica
   *   después del giro para que el orden sea el mismo que en el DOM:
   *   primero se refleja el dibujo, después se lo gira.
   */
  function dibujarUnaRosa(x, y, escala, giro, alfa, espejo) {
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
    pincel.clearRect(0, 0, window.innerWidth, window.innerHeight);

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

      dibujarUnaRosa(x, y,
        r.escala * brote,
        haciaElAltar + r.giro + r.caida * 1.5,
        brote * (enSumision ? 0.85 : 1));
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

      /* 36,5 → 42,0: viaja hasta el nombre y se posa. Es la única que
         cruza el radio, y lo cruza porque se soltó (regla 2). */
      var viaje = suave(limitar((t - MUERE_EN) / (TOTALIDAD - MUERE_EN), 0, 1));

      muerte.x = muerte.x0 + (altar.x - muerte.x0) * viaje;
      muerte.y = muerte.y0 + (altar.y - muerte.y0) * viaje
                 - Math.sin(viaje * Math.PI) * 26;   // un cuerpo describe un arco
      muerte.giro = muerte.giro0 + viaje * 1.1;

      /* 54,0 en adelante: resbala del nombre y cae. Se le acabó el
         permiso, como a todas. 900 px/s², que es una caída creíble a
         cualquier tamaño de pantalla. */
      if (t >= FRENESI) {
        var cae = (t - FRENESI) / 1000;
        muerte.y += 900 * cae * cae * 0.5;
        muerte.giro += cae * 1.8;
      }

      dibujarUnaRosa(muerte.x, muerte.y, muerte.escala, muerte.giro, 1,
                     muerte.espejo);
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
        continue;
      }

      var dx = altar.x - pt.x, dy = altar.y - pt.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      /* La gravedad vuelve a ser la gravedad, pero entrando de a poco por
         la misma rampa: antes aparecía entera en un solo cuadro. */
      pt.vx += (dx / d) * atraccion * 0.42;
      pt.vy += (dy / d) * atraccion * 0.42 + 0.05 + retirada * 0.28;
      pt.vx *= 0.965; pt.vy *= 0.965;

      /* ⚡ SE PEGABAN AL RELICARIO (2026-09-10)
       *
       * Acá había un rebote: `pt.vx *= -0.25; pt.vy *= -0.25`. Con la
       * atracción tirando hacia adentro cuadro tras cuadro y el rebote
       * devolviéndolos con un cuarto de la velocidad, los pétalos
       * quedaban vibrando contra el borde del anillo y se amontonaban
       * ahí, encimados, como una costra alrededor del nombre. El
       * comentario decía "como ofrenda"; en pantalla se leía como
       * suciedad pegada.
       *
       * Ahora, al llegar al anillo, la velocidad que apunta hacia adentro
       * se convierte en velocidad TANGENTE: en vez de rebotar, el pétalo
       * dobla y sigue de largo bordeando el relicario. Se lee como una
       * corriente girando alrededor del nombre, que es lo que la escena
       * quería decir, y ninguno se queda quieto.
       */
      if (d < altar.radio * 0.98 && !enSumision) {
        var nx = -dx / d, ny = -dy / d;              // hacia afuera del altar
        var haciaAdentro = pt.vx * (dx / d) + pt.vy * (dy / d);

        if (haciaAdentro > 0) {
          // Se le quita el avance hacia el centro…
          pt.vx -= (dx / d) * haciaAdentro;
          pt.vy -= (dy / d) * haciaAdentro;
          // …y se le devuelve como giro alrededor, conservando el impulso.
          pt.vx += -ny * haciaAdentro * 0.9;
          pt.vy +=  nx * haciaAdentro * 0.9;
        }

        /* Un empujón suave hacia afuera si igual quedó adentro del anillo:
           el nombre no se toca, es la regla 2. */
        if (d < altar.radio * 0.9) { pt.vx += nx * 0.35; pt.vy += ny * 0.35; }
      }

      pt.x += pt.vx; pt.y += pt.vy; pt.giro += pt.giroVel;

      pincel.save();
      pincel.translate(pt.x, pt.y);
      pincel.rotate(pt.giro);
      pincel.globalAlpha = 0.75;

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
    }
  }

  /* ─── 14. LAS FLORES DEL MARCO, DESDE AFUERA ────────────────────── */

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

    /* El arranque de la mártir va ACÁ ARRIBA, antes de escribirle un solo
       estilo a una flor en este cuadro. Ver la nota de la función. */
    arrancarALaMartir(t);

    var enSumision = t >= FRENESI;
    var enShock    = t >= TOTALIDAD && t < SHOCK;
    var ahora = t / 1000;

    /* ⚡ EL FRENAZO ES EL FINAL, NO LA SUMISIÓN (2026-09-10)
     *
     * Antes las plantas se calmaban a partir del segundo 54, bajando por
     * una rampa. Eso contaba la historia equivocada: las plantas
     * aceptando que se acabó.
     *
     * No se calman. La luz vuelve entre el 57 y el 59,9 —el mundo se
     * reilumina— y ellas SIGUEN estirando, con el permiso terminándose
     * encima. Ese desacople es el momento más perturbador del minuto.
     * Después, en el segundo 60, terminar() las devuelve a su sitio en UN
     * SOLO CUADRO: no es un final, es una orden obedecida con violencia.
     *
     * Por eso `retirada` queda en cero hasta el final. La rampa se
     * conserva en la firma por si algún día hace falta un final suave,
     * pero hoy no se usa: el frenazo ES el efecto. */
    var retirada = 0;

    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];

      /* La mártir ya no está en su tallo: su hueco no se anima. */
      if (f.martir && muerte.suelta) continue;

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
      var fervor =
          enShock    ? despierta * 0.55
        : t >= SHOCK ? despierta * (0.55 + tramo(t, SHOCK, SHOCK + 2500) * 0.45)
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
         Del segundo 35 al 36,5 la mártir pasa el tope que respetan las
         otras doscientas y tiembla casi el triple. Parece rota porque SE
         ESTÁ rompiendo: es el único aviso de lo que va a pasar, y es lo
         que hace que el ojo esté puesto en ella cuando se arranque. */
      var esfuerzo = f.martir ? tramo(t, PROFUNDA, MUERE_EN) : 0;

      var inclina = f.haciaElNombre * fervor * f.ansia * 0.58 * compensacion;
      var tope = TOPE_DE_INCLINACION * (1 + esfuerzo * 0.45);
      if (inclina >  tope) inclina =  tope;
      if (inclina < -tope) inclina = -tope;

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
        'rotate(' + (f.espejo * gesto).toFixed(2) + 'deg) ' +
        'scale(' + crece.toFixed(3) + ')';
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

  /* Gobernador en vivo: si el equipo se ahoga, se bajan rosas. NO se
     vuelven a subir a mitad del ritual — ir prendiendo y apagando se ve
     peor que quedarse con menos. La regla es explícita: entre más rosas
     y que vaya fluido, GANA LA FLUIDEZ. */
  var ultimoCuadro = 0, promedio = 16.7;

  function gobernar(ahora) {
    if (ultimoCuadro) {
      promedio += ((ahora - ultimoCuadro) - promedio) * 0.08;
      if (promedio > 34 && marea.length > 40) {
        marea.length = Math.floor(marea.length * 0.82);
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
    gobernar(ahora);
    medirElAltar();          // la página puede haberse movido
    acomodarLaCopia();       // y el nombre con ella

    var color = coloresEn(t);
    capaFria.style.opacity   = color.frio.toFixed(3);
    capaSangre.style.opacity = color.sangre.toFixed(3);

    /* El anillo de diamante: 150 ms centrados en el tercer contacto.
       Sube en 40 ms y baja en 110 — un relámpago tiene ataque rápido y
       cola, no una campana simétrica. */
    var desdeElAnillo = t - SHOCK;
    capaDestello.style.opacity =
      (desdeElAnillo < 0 || desdeElAnillo > 150) ? '0'
      : desdeElAnillo < 40 ? (desdeElAnillo / 40).toFixed(3)
      : (1 - (desdeElAnillo - 40) / 110).toFixed(3);

    moverElMundo(t);
    elNombreNoSeEntera(t);

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
    document.body.appendChild(capaFria);
    document.body.appendChild(capaSangre);
    document.body.appendChild(capaDestello);
    document.body.appendChild(lienzo);

    medirElAltar();
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
    escuchaDeMedida = (typeof alCambiarElAncho === 'function')
      ? alCambiarElAncho(medirElLienzo)
      : medirElLienzo;
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

    [capaFria, capaSangre, capaDestello, lienzo].forEach(function (c) {
      if (c.parentNode) c.parentNode.removeChild(c);
    });

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
          martir: !!laQueMuere,
          rosaRasterizada: !!mapaDeLaRosa,
          tinta: tintaDeLaRosa
        };
      }
    };
  }
})();
