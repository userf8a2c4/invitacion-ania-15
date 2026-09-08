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

  var esAlta = String(calidad()).toLowerCase().indexOf('alta') !== -1;

  /* Cuántas rosas tiene la marea. El detalle va al máximo siempre —una
     rosa rasterizada cuesta lo mismo de estampar que una silueta— así
     que lo que se adapta al equipo es la CANTIDAD, no el detalle. */
  var CUANTAS = esAlta ? 220
              : raiz.classList.contains('calidad-baja') ? 60 : 130;

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
    try {
      copiaDelNombre.style.cssText = window.getComputedStyle(nombre).cssText;
    } catch (e) { /* navegador que no lo da: se queda con sus clases */ }

    copiaDelNombre.style.margin = '0';
    jaula.appendChild(copiaDelNombre);
    document.body.appendChild(jaula);

    nombre.style.visibility = 'hidden';
    acomodarLaCopia();
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
    var unaFlor    = document.querySelector('.flor-de-enredadera use');
    if (!biblioteca || !unaFlor) { cuandoEste(false); return; }

    var tipo = unaFlor.getAttribute('href') || unaFlor.getAttribute('xlink:href');
    if (!tipo) { cuandoEste(false); return; }

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
           'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
           'width="' + LADO + '" height="' + LADO + '" viewBox="-30 -30 60 60">' +
        biblioteca.innerHTML +
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

  function sembrarLosPetalos() {
    var cuantos = esAlta ? 90 : 40;
    petalos.length = 0;
    for (var i = 0; i < cuantos; i++) {
      petalos.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, vy: 0,
        tam: 3 + Math.random() * 4,
        giro: Math.random() * Math.PI * 2,
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

  function tomarLasFloresReales() {
    if (!esAlta) return;
    var todas = document.querySelectorAll('.flor-de-enredadera__movil');
    for (var i = 0; i < todas.length; i++) {
      floresReales.push({ nodo: todas[i], antes: todas[i].getAttribute('transform') || '' });
    }
  }

  function devolverLasFloresReales() {
    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];
      if (f.antes) f.nodo.setAttribute('transform', f.antes);
      else         f.nodo.removeAttribute('transform');
    }
    floresReales.length = 0;
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
    } catch (e) {
      sonido = null;      // el eclipse sigue, en silencio de novedades
    }
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

    /* Se enturbia acompañando al eclipse y se limpia de golpe en la
       sumisión: el scratch de disco rayado es justamente que esto vuelva
       a la normalidad de un tirón y no con un fundido. */
    var hundimiento = t < FRENESI ? Math.min(1, t / TOTALIDAD)
                    : t < DURACION - 800 ? 1 : 0;

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

    /* Cuánto se estiran, en general. Sube con el eclipse, se congela en
       el shock, estalla en el frenesí y se corta de golpe. */
    var estiramiento =
        enSumision ? 0
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
    var atraccion = enSumision ? 0 : tramo(t, PENUMBRA * 0.5, PROFUNDA) * 0.55;

    pincel.fillStyle = '#7d1a26';
    for (var p = 0; p < petalos.length; p++) {
      var pt = petalos[p];
      var dx = altar.x - pt.x, dy = altar.y - pt.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      if (enSumision) {
        pt.vy += 0.28;                       // la gravedad vuelve a ser la gravedad
      } else {
        pt.vx += (dx / d) * atraccion * 0.42;
        pt.vy += (dy / d) * atraccion * 0.42 + 0.05;
      }
      pt.vx *= 0.965; pt.vy *= 0.965;

      // No entran al altar: se acumulan alrededor, como ofrenda.
      if (d < altar.radio * 0.92 && !enSumision) { pt.vx *= -0.25; pt.vy *= -0.25; }

      pt.x += pt.vx; pt.y += pt.vy; pt.giro += 0.03;

      pincel.save();
      pincel.translate(pt.x, pt.y);
      pincel.rotate(pt.giro);
      pincel.globalAlpha = 0.75;
      pincel.beginPath();
      pincel.ellipse(0, 0, pt.tam, pt.tam * 0.55, 0, 0, Math.PI * 2);
      pincel.fill();
      pincel.restore();
    }
  }

  /* ─── 14. LAS FLORES DEL MARCO, DESDE AFUERA ────────────────────── */

  function moverLasFloresReales(t) {
    if (!floresReales.length) return;

    var enSumision = t >= FRENESI;
    var estira = enSumision ? 0
               : t >= SHOCK ? 0.7 + tramo(t, SHOCK, SHOCK + 2000) * 0.3
               : tramo(t, PENUMBRA * 0.4, PROFUNDA) * 0.7;

    var ahora = t / 1000;

    for (var i = 0; i < floresReales.length; i++) {
      var f = floresReales[i];
      var vibra = Math.sin(ahora * (t >= SHOCK && !enSumision ? 9 : 2) + i) *
                  (t >= SHOCK && !enSumision ? 6 : 2) * estira;
      var crece = 1 + estira * 0.22;

      f.nodo.setAttribute('transform',
        (f.antes ? f.antes + ' ' : '') +
        'rotate(' + vibra.toFixed(2) + ') scale(' + crece.toFixed(3) + ')');
    }
  }

  /* ─── 15. EL BUCLE ──────────────────────────────────────────────── */

  var arranque = 0;
  var vivo = false;
  var pedidoDeCuadro = 0;

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

    var t = ahora - arranque;
    if (t >= DURACION) { terminar(); return; }

    gobernar(ahora);
    medirElAltar();          // la página puede haberse movido
    acomodarLaCopia();       // y el nombre con ella

    var color = coloresEn(t);
    capaFria.style.opacity   = color.frio.toFixed(3);
    capaSangre.style.opacity = color.sangre.toFixed(3);

    dibujar(t);
    moverLasFloresReales(t);
    ajustarElSonido(t);

    pedidoDeCuadro = requestAnimationFrame(cuadro);
  }

  /* ─── 16. EMPEZAR Y TERMINAR ────────────────────────────────────── */

  function empezar(desfase) {
    if (vivo) return;
    vivo = true;

    coronarElNombre();
    document.body.appendChild(capaFria);
    document.body.appendChild(capaSangre);
    document.body.appendChild(lienzo);

    medirElAltar();
    sembrarLaMarea();
    elegirALaQueMuere();
    sembrarLosPetalos();
    tomarLasFloresReales();
    apagarLosPetalosDeSiempre();
    engancharElSonido();

    window.addEventListener('resize', medirElLienzo);

    /* Si alguien llegó con el minuto empezado, se entra por donde va: el
       eclipse no espera a nadie ni se reinicia para nadie. */
    arranque = performance.now() - (desfase > 0 ? desfase : 0);
    pedidoDeCuadro = requestAnimationFrame(cuadro);
  }

  /* ⚠️ EL FINAL ES UN FRENAZO Y NO SE PUEDE SUAVIZAR.
     Un final gradual se entiende, y entender es olvidar: el espectador
     cierra la escena y sigue. El empujón violento no lo deja cerrarla y
     lo deja preguntándose qué acaba de ver. Esa duda ES el efecto.
     Nada de transiciones acá. Se ve brusco a propósito. */
  function terminar() {
    vivo = false;
    if (pedidoDeCuadro) cancelAnimationFrame(pedidoDeCuadro);

    window.removeEventListener('resize', medirElLienzo);

    devolverLasFloresReales();
    devolverLosPetalosDeSiempre();
    devolverElNombre();
    soltarElSonido();

    [capaFria, capaSangre, lienzo].forEach(function (c) {
      if (c.parentNode) c.parentNode.removeChild(c);
    });

    // Mañana otra vez.
  }

  /* ─── 17. LA PUERTA ─────────────────────────────────────────────── */

  var faltan = typeof window.ECLIPSE_EMPIEZA_EN === 'number'
             ? window.ECLIPSE_EMPIEZA_EN : 0;

  rasterizarLaRosa(function () {
    if (faltan > 0) setTimeout(function () { empezar(0); }, faltan);
    else            empezar(-faltan);      // ya había empezado: se entra en curso
  });
})();
