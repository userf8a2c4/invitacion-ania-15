/* ══════════════════════════════════════════════════════════════════════
   23 · EL LIENZO DE LUZ
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dibuja TODA la luz de la invitación —los resplandores de las 52 velas—
   en un solo <canvas>, en vez de en ~104 divs con mezcla.

   POR QUÉ EXISTE (el dato que lo justifica)
   El medidor de la propia web dio la prueba: con las animaciones APAGADAS
   la página va a 60 fps clavados, con el mismo DOM de 4592 nodos. Con las
   animaciones encendidas, 13 fps. O sea que el problema nunca fue el
   tamaño del documento: es el trabajo por cuadro.

   Y de ese trabajo, el JavaScript son 23 ms de 1658 (1,4 %). El resto es
   el navegador reaccionando:

       Layerize           31,1 %
       Recalculate style  21,0 %
       Commit             20,4 %
       Hit test            9,5 %
       Paint               8,9 %

   Layerize y Commit son fases del COMPOSITOR: arman y entregan el árbol de
   capas. Su costo depende de cuántas capas hay y cuántas se mezclan. Había
   10 capas con `mix-blend-mode: screen`, y ese modo obliga al compositor a
   LEER DE VUELTA el fondo antes de dibujar y le impide fusionar nada de lo
   que hay debajo: con diez apiladas no puede aplanar nada.

   POR QUÉ UN CANVAS LO ARREGLA DE RAÍZ
   Un canvas es UN elemento, o sea UNA capa, dibuje 10 luces o 10.000.
   Layerize y Commit dejan de depender de la cantidad de luces: es
   imposible por construcción que vuelvan a crecer. Además desaparecen ~104
   estilos en línea por cuadro (Recalculate style) y ~104 nodos que
   hit-testear.

   CÓMO SE VE IGUAL
   · `globalCompositeOperation = 'lighter'` es SUMA aditiva, que es lo que
     `screen` aproxima sobre fondo oscuro y lo que la luz hace de verdad.
   · Los degradados son exactamente los mismos que tenía el CSS
     (.vela--nucleo y .vela--derrame): están copiados parada por parada.

   EL TRUCO DE VELOCIDAD: SELLOS, NO DEGRADADOS
   Crear un degradado radial por vela y por cuadro sería carísimo. En vez
   de eso, cada degradado se dibuja UNA vez en un canvas chiquito —un
   "sello"— y después solo se estampa escalado. Estampar una imagen es de
   lo más barato que sabe hacer una placa de video, incluso una integrada.

   SI ALGO SE VE MAL
   Abrir la web con  ?luz=dom  y vuelve el sistema viejo al instante, sin
   tocar código. Los divs de luz siguen existiendo; este módulo solo los
   apaga cuando toma el mando.
   ══════════════════════════════════════════════════════════════════════ */

(function elLienzoDeLuz() {

  /* ── ¿Toma el mando este módulo? ──
     Por defecto sí. Con ?luz=dom se queda dormido y las velas siguen
     usando sus divs, exactamente como antes. */
  const parametros = new URLSearchParams(location.search);
  const USAR_LIENZO = parametros.get('luz') !== 'dom';

  /* Registro público. Los tres sistemas de luz le dejan acá sus fuentes y
     el lienzo las estampa; ninguno vuelve a tocar el DOM.

       · fuentes → resplandores de las velas, en coordenadas del DOCUMENTO
       · haces   → los rayos de los ventanales, en coordenadas de la VENTANA
       · motas   → el polvo en suspensión, en coordenadas de la VENTANA

     Los haces y las motas van en coordenadas de ventana porque sus capas
     eran `position: fixed`: no se mueven con el scroll, la luz entra
     siempre por el mismo sitio de la pantalla. */
  window.LienzoDeLuz = { activo: USAR_LIENZO, fuentes: [], haces: [], motas: [] };

  if (!USAR_LIENZO) return;

  /* ── Resolución de dibujo ──
     La luz es información de BAJA FRECUENCIA: manchas suaves, sin bordes
     ni detalle fino. Por eso es lo único de esta web que se puede dibujar
     a menos resolución sin que se note —bajar la de cualquier otra cosa se
     vería al instante—. Arranca en 1 (calidad plena); si hiciera falta más
     margen en un equipo flojo, bajar a 0.6 es invisible y ahorra ~64 % del
     relleno. */
  /* ⚠️ ESTA ES LA ÚNICA CONCESIÓN DE RESOLUCIÓN DE TODA LA WEB, y se puede
     hacer porque la luz es información de BAJA FRECUENCIA: manchas difusas,
     sin bordes ni detalle. Un degradado radial dibujado a 0,6× y escalado da
     el mismo resultado, porque el degradado YA ES un desenfoque.

     A los pétalos, las rosas, el marco y el texto NO se les toca la
     resolución: tienen contorno y se notaría al instante.

     En una Intel HD 4600 —sin memoria propia, compartiendo el bus con la
     CPU— esto son un 64 % menos de píxeles en el lienzo más grande. Si al
     verlo se notara algo, subir a 0.8 o a 1. */
  const FACTOR_POR_CALIDAD = { 0: 0.75, 1: 0.6, 2: 0.5 };

  /** Tope de densidad de píxeles. En pantallas 2x, dibujar la luz al doble
   *  cuadruplica el relleno para nada: es una mancha difusa. */
  const MAXIMA_DENSIDAD = 1;

  const lienzo = document.createElement('canvas');
  lienzo.id = 'lienzo-de-luz';
  lienzo.setAttribute('aria-hidden', 'true');
  const pincel = lienzo.getContext('2d', { alpha: true });
  if (!pincel) { window.LienzoDeLuz.activo = false; return; }

  /* Se cuelga donde estaba la capa de luz de las velas, para conservar el
     orden de apilado con el resto de la escena. */
  const dondeVa = buscar('#luz-de-velas') || document.body;
  dondeVa.appendChild(lienzo);

  /* ⚡ Y EL CONTENEDOR DEJA DE CUBRIR EL DOCUMENTO ENTERO.
     `#luz-de-velas` era `position: absolute; inset: 0`, o sea del tamaño del
     documento: en la pantalla ultrapanorámica del equipo objetivo eso son
     3305 × 5869 = **19,4 megapíxeles**. Tenía sentido cuando ahí vivían los
     52 resplandores; ahora su único hijo es este lienzo, que es
     `position: fixed` y mide lo que la ventana.

     Pasarlo a `fixed` lo deja en ~3,3 MP sin mover nada de sitio, porque lo
     único que contiene ya se posiciona respecto de la ventana.

     Se hace desde acá y no desde el CSS a propósito: con ?luz=dom este
     módulo no corre, los resplandores vuelven a ser divs con coordenadas del
     DOCUMENTO, y entonces el contenedor SÍ tiene que seguir siendo
     `absolute`. Cambiarlo en la hoja de estilos rompería ese camino. */
  if (dondeVa.id === 'luz-de-velas') dondeVa.style.position = 'fixed';

  let anchoCss = 0, altoCss = 0, escalaDelLienzo = 1;

  /**
   * Ajusta el tamaño del lienzo al de la ventana.
   * @returns {void}
   */
  function ajustarElLienzo() {
    const factor = FACTOR_POR_CALIDAD[nivelDeCalidad()] ?? 1;
    escalaDelLienzo = Math.min(window.devicePixelRatio || 1, MAXIMA_DENSIDAD) * factor;

    anchoCss = window.innerWidth;
    altoCss  = window.innerHeight;

    lienzo.width  = Math.max(1, Math.round(anchoCss * escalaDelLienzo));
    lienzo.height = Math.max(1, Math.round(altoCss  * escalaDelLienzo));
    lienzo.style.width  = anchoCss + 'px';
    lienzo.style.height = altoCss  + 'px';
  }

  ajustarElLienzo();
  window.addEventListener('resize', rebotar(ajustarElLienzo, 200));
  document.addEventListener('calidad-cambio', () => setTimeout(ajustarElLienzo, 50));


  /* ─── LOS SELLOS ────────────────────────────────────────────────────
     Cada tipo de resplandor se dibuja una sola vez en su propio canvas
     chiquito. Después, en cada cuadro, solo se ESTAMPA escalado.
     ---------------------------------------------------------------- */

  /** Cuántos píxeles mide un sello. 128 alcanza y sobra: son manchas sin
   *  bordes, y al escalarlas el suavizado del navegador las funde solo. */
  const LADO_DEL_SELLO = 128;

  /**
   * Dibuja un degradado radial en un canvas aparte, para poder estamparlo
   * después las veces que haga falta.
   *
   * @param {Array<[number, string]>} paradas - [posición 0..1, color CSS].
   * @returns {HTMLCanvasElement}
   */
  function hacerUnSello(paradas) {
    const sello = document.createElement('canvas');
    sello.width = sello.height = LADO_DEL_SELLO;
    const p = sello.getContext('2d');
    const medio = LADO_DEL_SELLO / 2;

    const degradado = p.createRadialGradient(medio, medio, 0, medio, medio, medio);
    for (const [donde, color] of paradas) degradado.addColorStop(donde, color);

    p.fillStyle = degradado;
    p.fillRect(0, 0, LADO_DEL_SELLO, LADO_DEL_SELLO);
    return sello;
  }

  /* ⚠️ ESTAS PARADAS SON LAS MISMAS QUE TENÍA EL CSS, copiadas una por una
     de .vela--nucleo y .vela--derrame en estilos/12-haces-de-luz.css. Si
     alguna vez se retoca el color de la luz, hay que tocarlo en los DOS
     lados o el sistema de reserva (?luz=dom) se vería distinto. */
  const SELLO_NUCLEO = hacerUnSello([
    [0,    'rgba(255, 226, 160, .95)'],
    [0.18, 'rgba(255, 190, 105, .55)'],
    [0.42, 'rgba(232, 150, 70,  .22)'],
    [0.70, 'rgba(232, 150, 70,  0)'],
    [1,    'rgba(232, 150, 70,  0)'],
  ]);

  const SELLO_DERRAME = hacerUnSello([
    [0,    'rgba(255, 198, 120, .40)'],
    [0.22, 'rgba(236, 160, 82,  .26)'],
    [0.42, 'rgba(208, 130, 60,  .15)'],
    [0.62, 'rgba(170, 100, 46,  .07)'],
    [0.80, 'rgba(170, 100, 46,  0)'],
    [1,    'rgba(170, 100, 46,  0)'],
  ]);

  /* El polvo: un puntito con halo. Mismas paradas que tenía .mota. */
  const SELLO_MOTA = hacerUnSello([
    [0,    'rgba(255, 246, 214, .95)'],
    [0.42, 'rgba(244, 226, 160, .55)'],
    [0.72, 'rgba(244, 226, 160, 0)'],
    [1,    'rgba(244, 226, 160, 0)'],
  ]);

  /**
   * El sello del HAZ es distinto: no es un círculo sino una elipse
   * descentrada, porque el CSS decía
   *     radial-gradient(ellipse 62% 46% at 50% 24%, …)
   * o sea, radios distintos en X y en Y, y el centro al 24 % de la altura
   * (arriba, que es por donde entra la luz).
   *
   * Se consigue dibujando un degradado circular con el lienzo ESTIRADO: se
   * escala el eje Y antes de pintar, y el círculo sale elipse. El sello
   * guarda el degradado en un cuadrado que después se estampa deformado al
   * tamaño real del haz, igual que hacían los porcentajes del CSS.
   *
   * @returns {HTMLCanvasElement}
   */
  function hacerElSelloDelHaz() {
    const sello = document.createElement('canvas');
    sello.width = sello.height = LADO_DEL_SELLO;
    const p = sello.getContext('2d');

    const centroX = LADO_DEL_SELLO * 0.50;
    const centroY = LADO_DEL_SELLO * 0.24;
    const radioX  = LADO_DEL_SELLO * 0.62;
    const radioY  = LADO_DEL_SELLO * 0.46;
    const achate  = radioY / radioX;

    p.save();
    p.translate(centroX, centroY);
    p.scale(1, achate);

    const g = p.createRadialGradient(0, 0, 0, 0, 0, radioX);
    g.addColorStop(0,    'rgba(244, 226, 160, .50)');
    g.addColorStop(0.38, 'rgba(219, 183, 110, .30)');
    g.addColorStop(0.62, 'rgba(201, 168, 76,  .10)');
    g.addColorStop(0.80, 'rgba(201, 168, 76,  0)');
    g.addColorStop(1,    'rgba(201, 168, 76,  0)');

    p.fillStyle = g;
    // Se rellena de sobra: el `scale` achica el alto, así que hay que pasarse.
    p.fillRect(-LADO_DEL_SELLO, -LADO_DEL_SELLO / achate,
               LADO_DEL_SELLO * 2, (LADO_DEL_SELLO * 2) / achate);
    p.restore();
    return sello;
  }

  const SELLO_HAZ = hacerElSelloDelHaz();


  /* ─── EL BUCLE ──────────────────────────────────────────────────────
     Un solo requestAnimationFrame para toda la luz, en vez de uno por
     sistema. Lee las fuentes que le dejó 19-velas.js y las estampa.
     ---------------------------------------------------------------- */

  /* Margen de culling: una luz que está justo afuera igual asoma su halo,
     así que se dibuja un poco más allá del borde de la pantalla. */
  const MARGEN = 260;

  /** Reloj propio, para que la deriva del polvo no dependa de cuándo se
   *  pintó el primer cuadro. */
  const momentoDeInicio = performance.now();

  /* ⚡ CADA CUÁNTO SE REPINTA DE VERDAD, Y POR QUÉ NO ES CADA CUADRO.
     Este era el error más caro que quedaba. Los sistemas que alimentan este
     lienzo tienen su propia cadencia, escrita en su código:

         velas  → recalculan el titileo cada 50 ms   (20 fps)
         haces  → cada 65 ms                          (15 fps)
         motas  → derivan lentísimo

     …pero el lienzo se borraba y repintaba a 60 fps igual. Tres de cada
     cuatro repintados dibujaban EXACTAMENTE LOS MISMOS PÍXELES.

     En la máquina objetivo eso es demoledor: una Intel HD 4600 no tiene
     memoria propia y comparte el bus con la CPU, así que cada repintado hay
     que subirlo por ahí. A pantalla completa eran ~1 GB/s de texturas para
     mostrar una imagen que cambia veinte veces por segundo.

     A 45 ms se ve idéntico —el titileo se GENERA a 20 fps, dibujarlo a 60
     es enseñar la misma imagen tres veces— y cuesta un tercio. */
  const CADA_CUANTO_REPINTAR = 45;
  let ultimoRepintado = 0;

  function pintarLaLuz(ahora) {
    /* Con la pestaña oculta o las animaciones apagadas no se redibuja,
       pero el lienzo conserva lo último pintado: la escena no se apaga. */
    if (document.hidden || prefiereMenosMovimiento()) {
      requestAnimationFrame(pintarLaLuz);
      return;
    }

    if (ahora - ultimoRepintado < CADA_CUANTO_REPINTAR) {
      requestAnimationFrame(pintarLaLuz);
      return;
    }
    ultimoRepintado = ahora;

    pincel.setTransform(escalaDelLienzo, 0, 0, escalaDelLienzo, 0, 0);
    pincel.clearRect(0, 0, anchoCss, altoCss);

    /* SUMA ADITIVA. Es lo que hace la luz de verdad —dos velas juntas
       iluminan más que una— y es la operación que reemplaza al
       mix-blend-mode: screen de las capas viejas, sin costar una capa. */
    pincel.globalCompositeOperation = 'lighter';

    /* El polvo se calcula acá, en el mismo bucle: no tiene sentido un
       requestAnimationFrame aparte para 32 puntitos. */
    if (window.LienzoDeLuz.animarLasMotas) {
      window.LienzoDeLuz.animarLasMotas(
        (performance.now() - momentoDeInicio) / 1000,
        anchoCss, altoCss,
        window.LienzoDeLuz.intensidadAmbiente ?? 0
      );
    }

    const desplazamiento = scrollActualY();
    const fuentes = window.LienzoDeLuz.fuentes;

    /* ── CUÁNTO MANDAN LAS VELAS A ESTA HORA ──
       Al mediodía compiten con la luz que entra por los ventanales y quedan
       discretas (×0,70). De madrugada SON la única luz de la sala y crecen
       (×1,30). Ese cambio de quién manda —ventana o fuego— es lo que vuelve
       envolvente la escena, más que cualquier cambio de color.

       Se lee una vez por cuadro, no por vela. El valor lo publica
       codigo/22-luz-de-la-hora.js cada diez minutos. */
    const hora = window.LuzDeLaHora;
    const fuerzaDeVelas = hora ? hora.fuerzaDeVelas : 1;

    for (let i = 0; i < fuentes.length; i++) {
      const f = fuentes[i];
      if (f.alfa <= 0.004 || f.radio <= 0) continue;

      const y = f.y - desplazamiento;
      if (y < -MARGEN - f.radio || y > altoCss + MARGEN + f.radio) continue;
      if (f.x < -MARGEN - f.radio || f.x > anchoCss + MARGEN + f.radio) continue;

      const alfa = f.alfa * fuerzaDeVelas;
      pincel.globalAlpha = alfa > 1 ? 1 : alfa;
      const lado = f.radio * 2;
      pincel.drawImage(f.derrame ? SELLO_DERRAME : SELLO_NUCLEO,
                       f.x - f.radio, y - f.radio, lado, lado);
    }

    /* ── b) LOS HACES DE LOS VENTANALES ──
       Van en coordenadas de la ventana (su capa era `fixed`), así que no se
       les resta el scroll. Cada uno se estampa girado sobre su borde
       superior, que es el mismo `transform-origin: 50% 0` que tenía el CSS:
       el rayo pivota desde donde entra, no desde su centro. */
    const haces = window.LienzoDeLuz.haces;
    for (let i = 0; i < haces.length; i++) {
      const h = haces[i];
      if (h.alfa <= 0.004 || h.ancho <= 0) continue;

      pincel.globalAlpha = h.alfa > 1 ? 1 : h.alfa;
      pincel.save();
      pincel.translate(h.x, h.y);
      pincel.rotate(h.giro);
      pincel.drawImage(SELLO_HAZ, -h.ancho / 2, 0, h.ancho, h.alto);
      pincel.restore();
    }

    /* ── c) EL POLVO EN SUSPENSIÓN ──
       También en coordenadas de ventana. Son puntitos: se estampan sin
       girar y sin más cuentas. */
    const motas = window.LienzoDeLuz.motas;
    for (let i = 0; i < motas.length; i++) {
      const m = motas[i];
      if (m.alfa <= 0.004) continue;

      pincel.globalAlpha = m.alfa > 1 ? 1 : m.alfa;
      const lado = m.radio * 2;
      pincel.drawImage(SELLO_MOTA, m.x - m.radio, m.y - m.radio, lado, lado);
    }

    pincel.globalAlpha = 1;
    pincel.globalCompositeOperation = 'source-over';

    requestAnimationFrame(pintarLaLuz);
  }

  requestAnimationFrame(pintarLaLuz);

})();
