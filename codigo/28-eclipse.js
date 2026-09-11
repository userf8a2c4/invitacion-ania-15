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
   * ⚠️ NO SE BORRA EL SISTEMA, SE PONE EN CERO. `laQueMuere` —la rosa que
   * se suelta a los 36,5 s, se posa sobre el nombre y cae al final— se
   * elige de esta lista, y esa sí se aprobó tal cual está. Con la marea en
   * una sola rosa, esa rosa existe y es la única que se ve suelta: deja de
   * ser una entre doscientas y pasa a ser LA que se soltó, que es
   * exactamente lo que significa.
   */
  var CUANTAS = 1;

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
           'width="' + LADO + '" height="' + LADO + '" viewBox="-30 -30 60 60">' +
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
     Se elige la de más ansia: la que se esforzó de más. Es la única que
     cruza el radio, y lo cruza soltándose. */
  var laQueMuere = null;
  var muerte = { x: 0, y: 0, vx: 0, vy: 0, giro: 0, giroVel: 0, suelta: false };

  function elegirALaQueMuere() {
    var mejor = null;
    for (var i = 0; i < marea.length; i++) {
      if (!mejor || marea[i].ansia > mejor.ansia) mejor = marea[i];
    }
    laQueMuere = mejor;
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

  function sembrarLosPetalos() {
    prepararLosPetalos();

    var cuantos = esAlta ? 90 : 40;
    petalos.length = 0;
    for (var i = 0; i < cuantos; i++) {
      petalos.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, vy: 0,
        /* Más grandes que antes (eran 3–7 px). Un pétalo de 7 px no es un
           pétalo: es un punto. Los de la invitación llegan a 62 px. */
        tam: 9 + Math.random() * 13,
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
        tamano: Math.max(caja.width, caja.height)
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

      r.nodo.style.rotate = (dobla + tiembla).toFixed(2) + 'deg';
      r.nodo.style.scale  = (1 + fervor * 0.1).toFixed(3);
    }
  }

  function devolverLasFloresReales() {
    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];
      if (f.antes) f.nodo.style.transform = f.antes;
      else         f.nodo.style.removeProperty('transform');
    }
    floresReales.length = 0;
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

  function dibujarUnaRosa(x, y, escala, giro, alfa) {
    pincel.save();
    pincel.globalAlpha = alfa;
    pincel.translate(x, y);
    pincel.rotate(giro);

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

      if (r === laQueMuere && t >= MUERE_EN) continue;   // se dibuja aparte

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

    /* ── La que murió: ya no se estira, cae ── */
    if (laQueMuere && t >= MUERE_EN) {
      if (!muerte.suelta) {
        muerte.suelta = true;
        var d0 = altar.radio;
        muerte.x = altar.x + Math.cos(laQueMuere.angulo) * d0;
        muerte.y = altar.y + Math.sin(laQueMuere.angulo) * d0;
        // Sale disparada HACIA el nombre: es lo que consiguió.
        muerte.vx = (altar.x - muerte.x) * 0.02;
        muerte.vy = (altar.y - muerte.y) * 0.02;
        muerte.giroVel = (Math.random() - 0.5) * 0.05;
      }

      /* Antes del segundo 54 descansa sobre el nombre. Después resbala y
         cae: se le acabó el permiso, como a todas. */
      if (t < FRENESI) {
        muerte.x += (altar.x - muerte.x) * 0.12;
        muerte.y += (altar.y - muerte.y) * 0.12;
        muerte.vy = 0;
      } else {
        muerte.vy += 0.55;
        muerte.y += muerte.vy;
      }
      muerte.giro += muerte.giroVel;

      dibujarUnaRosa(muerte.x, muerte.y, laQueMuere.escala * 1.15, muerte.giro, 1);
    }

    /* ── Los pétalos, arrastrados por la gravedad nueva ── */
    /* Baja por la misma rampa que el estiramiento y que las rosas: la
       gravedad no le devuelve el mando de un tirón, se lo va soltando. */
    var atraccion = tramo(t, PENUMBRA * 0.5, PROFUNDA) * 0.55 * (1 - retirada);

    pincel.fillStyle = '#7d1a26';
    for (var p = 0; p < petalos.length; p++) {
      var pt = petalos[p];
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
      var inclina = f.haciaElNombre * fervor * f.ansia * 0.58 * compensacion;
      if (inclina >  TOPE_DE_INCLINACION) inclina =  TOPE_DE_INCLINACION;
      if (inclina < -TOPE_DE_INCLINACION) inclina = -TOPE_DE_INCLINACION;

      /* ── 4. EL TEMBLOR ──
         Lento y mínimo cuando recién despierta; rápido y amplio en la
         histeria. En el shock se queda quieta: contiene el aliento. */
      var frecuencia = 1.4 + fervor * 9;
      var amplitud   = enShock ? 0 : fervor * fervor * 9;
      var tiembla    = Math.sin(ahora * frecuencia + f.fase) * amplitud;

      /* ── 5. TENSARSE ──
         Crece un poco al estirar, como algo que se estira de verdad. */
      var crece = 1 + fervor * 0.26;

      /* Se apila sobre lo que 07 tuviera puesto, no se lo reemplaza: si esa
         flor estaba apartándose del mouse, sigue apartándose mientras
         tiembla. Y en unidades de CSS —`deg`—, que es lo que espera la
         propiedad; el atributo SVG usa números pelados y no son lo mismo. */
      f.nodo.style.transform =
        (f.antes ? f.antes + ' ' : '') +
        'rotate(' + (inclina + tiembla).toFixed(2) + 'deg) ' +
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
    if (t >= DURACION) { terminar(); return; }

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

    dibujar(t);
    moverLasFloresReales(t);
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
    muerte.giro = 0; muerte.giroVel = 0; muerte.suelta = false;
    laQueMuere = null;
    ultimoCuadro = 0;
    promedio = 16.7;
    ultimoIntentoDeFlores = -1000;
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
    elegirALaQueMuere();
    sembrarLosPetalos();
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
  function terminar() {
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
      cuantasFlores: function () { return floresReales.length; }
    };
  }
})();
