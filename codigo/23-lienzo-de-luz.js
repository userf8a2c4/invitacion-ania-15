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
     siempre por el mismo sitio de la pantalla.

     `fauna` (luciérnagas y termitas, codigo/27-fauna-nocturna.js) va en
     coordenadas de DOCUMENTO, como las fuentes: están ancladas a
     elementos de la página, no pegadas a la ventana. */
  window.LienzoDeLuz = { activo: USAR_LIENZO, fuentes: [], haces: [], motas: [], fauna: [] };

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

  /* ⚡ YA NO SE TOCA LA POSICIÓN DEL CONTENEDOR (era `dondeVa.style.position
     = 'fixed'` acá) — ESTO ROMPÍA LAS VELAS Y LAS HACÍA DESAPARECER.

     Antes esto asumía que solo había DOS escenarios posibles: o el lienzo
     corre entero (velas incluidas) y entonces `#luz-de-velas` puede pasar a
     `fixed` sin costo, porque lo único que contiene es este canvas; o el
     lienzo no corre nada (`?luz=dom`) y el contenedor se queda `absolute`
     para los divs. Ahora hay un tercer escenario que ese razonamiento no
     contemplaba: las velas dejaron de entregarle sus luces al lienzo (ver
     19-velas.js) PERO el lienzo sigue corriendo para los haces, las motas y
     las luciérnagas — así que `#luz-de-velas` vuelve a tener a los divs de
     las velas como hijos, además de este canvas. Pasar el contenedor a
     `fixed` los sacaba de quicio: sus `left/top` son coordenadas del
     DOCUMENTO (pensadas para un padre `absolute`), y dentro de un padre
     `fixed` esas mismas coordenadas se leen relativas a la VENTANA — las
     velas terminaban a cientos o miles de píxeles fuera de la pantalla.

     La solución real: este canvas no necesita para nada que su padre sea
     `fixed`. Su propia regla en estilos/12-haces-de-luz.css ya lo declara
     `position: fixed; inset: 0` por sí mismo, así que se posiciona relativo
     a la ventana sin importar qué `position` tenga `#luz-de-velas`. Forzar
     el contenedor era un paso de más que nunca hacía falta para el canvas,
     y ahora que #luz-de-velas puede tener hijos con las dos necesidades a
     la vez (canvas fijo + divs de documento), sacarlo es lo correcto. */

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
  /* ⚡ alCambiarElAncho: ignora el 'resize' falso de la barra del navegador
     en celular (ver la nota grande junto a la función, en 02-utilidades.js).
     Sin esto, cada aparición/desaparición de la barra al hacer scroll
     reasignaba lienzo.width/height —una operación cara: limpia y reserva
     de nuevo toda la textura del canvas— exactamente el "tirón" que se
     reportó. El canvas es position:fixed cubriendo toda la ventana; si la
     barra se esconde y el canvas queda un poco más bajo que el alto real
     hasta el próximo cambio de ancho de verdad, la franja de más abajo
     queda sin haces/motas por un instante — muchísimo menos notorio que
     el tirón que causaba reasignar el canvas en pleno scroll. */
  window.addEventListener('resize', alCambiarElAncho(rebotar(ajustarElLienzo, 200)));
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
     es enseñar la misma imagen tres veces— y cuesta un tercio.

     ⚡ Y AHORA SIGUE A LA CALIDAD, NO UN NÚMERO FIJO — ESTO ES LO QUE
     ARREGLA LA FALTA DE FLUIDEZ. codigo/19-velas.js recalcula el titileo
     a un ritmo DISTINTO según la calidad (30 ms en ALTA, 50 en MEDIA, 90
     en BAJA — ver CADA_CUANTO_POR_CALIDAD ahí), pero este lienzo repintaba
     siempre a 45 ms fijos, sin importar cuál de los tres estuviera activo.
     Eso eran dos problemas a la vez, en direcciones opuestas:

       · En calidad ALTA (equipo con margen), el titileo SÍ tiene un dato
         nuevo cada 30 ms, pero el lienzo lo hacía esperar hasta 45 ms para
         mostrarlo — la luz se veía menos viva de lo que el propio equipo
         podía sostener, un freno artificial que no hacía falta.
       · En calidad BAJA (equipo justo), el dato cambia recién cada 90 ms,
         pero el lienzo lo seguía repintando cada 45 — el doble de seguido
         de lo necesario, exactamente el desperdicio que este mismo bloque
         de comentarios dice evitar.

     Con el número atado a la calidad, cada equipo repinta EXACTAMENTE
     tan seguido como cambian sus propios datos: ni de más (BAJA) ni de
     menos (ALTA). */
  const CADA_CUANTO_REPINTAR_POR_CALIDAD = { 0: 30, 1: 50, 2: 90 };
  let cadaCuantoRepintar = CADA_CUANTO_REPINTAR_POR_CALIDAD[nivelDeCalidad()] ?? 45;
  document.addEventListener('calidad-cambio', evento => {
    const calidad = (evento.detail && evento.detail.calidad) ?? 0;
    cadaCuantoRepintar = CADA_CUANTO_REPINTAR_POR_CALIDAD[calidad] ?? 45;
  });
  let ultimoRepintado = 0;

  /* ⚡ EL BRILLO DE LAS VELAS "A TIRONES" — Y POR QUÉ NO ES EL THROTTLE.
     El throttle de arriba está bien como está (no se toca: ver la nota
     grande más abajo). El problema es OTRO: este lienzo repinta cada
     ~45 ms, pero 19-velas.js recalcula el titileo cada 30-90 ms según la
     calidad (su propio throttle, independiente de este) — dos relojes por
     separado, sin ninguna relación de fase entre sí. El resultado es que
     a veces este repintado agarra DOS o TRES actualizaciones de titileo
     de golpe (salto grande) y a veces ninguna (se repite el mismo valor).
     Esa irregularidad en el TAMAÑO del salto, no el framerate en sí, es lo
     que se ve "a tirones".

     La solución NO es sincronizar los relojes (más invasivo, y ninguno de
     los dos está mal calibrado por separado). Es más simple: en vez de
     dibujar el valor crudo que dejó 19-velas (`f.alfa`), se dibuja un
     valor que se ACERCA a él un poco en cada repintado, proporcional al
     tiempo real transcurrido — así, si el reloj de 19-velas "adelantó" dos
     pasos de una, ese salto se reparte en el tiempo en vez de mostrarse de
     un tirón. No cambia CUÁNDO se calcula ni CUÁNDO se repinta, solo QUÉ
     valor se dibuja. */
  const CONSTANTE_DE_SUAVIZADO_MS = 45;

  /**
   * Acerca `mostrado` a `objetivo`, un paso proporcional a `dtMs` en vez de
   * un porcentaje fijo "por repintado" — así el resultado no depende de
   * cada cuánto se llame. `constanteMs` es "cuánto tarda en cerrar ~63%
   * de la diferencia": más chica, alcanza más rápido.
   * @param {number} mostrado
   * @param {number} objetivo
   * @param {number} dtMs
   * @param {number} constanteMs
   * @returns {number}
   */
  function acercar(mostrado, objetivo, dtMs, constanteMs) {
    const factor = 1 - Math.exp(-dtMs / constanteMs);
    return mostrado + (objetivo - mostrado) * factor;
  }

  /** El scroll con el que se dibujó el último cuadro. Ver la nota grande
   *  en pintarLaLuz(): si cambió, el throttle se salta para que la luz
   *  no se quede atrás de la llama real (DOM) durante el scroll. */
  let ultimoDesplazamientoDibujado = null;

  /* ⚠️ SE APAGABAN LAS ANIMACIONES Y LA LUZ SE QUEDABA CONGELADA.
     hayAlgoQueMirar() agrupa tres motivos bajo un mismo "no dibujes":
     sobre todavía cerrado, pestaña de fondo, o animaciones apagadas a
     propósito. Para los dos primeros, dejar el lienzo tal cual estaba es
     lo correcto —nadie lo está mirando—. Pero con las animaciones recién
     apagadas, la persona SIGUE mirando la pantalla, y lo que veía era lo
     último que se alcanzó a dibujar: un haz a mitad de camino, motas
     dispersas por cualquier lado. Apagar el movimiento debería APAGAR la
     luz que se mueve, no congelarla en un instante al azar.

     La solución: cuando el motivo es específicamente que se apagaron las
     animaciones, se hace UNA pasada más mostrando solo el resplandor fijo
     de las velas —la luz de ambiente, que a propósito se mantiene
     encendida (ver la nota en estilos/01-fundamentos.css: sin ella el
     fondo queda demasiado oscuro)— sin haces ni motas, que son puro
     movimiento. Recién ahí se deja de redibujar. */
  let yaSeDibujoElEstadoQuieto = false;

  /**
   * Un cuadro completo (o solo la luz fija, si `conMovimiento` es false).
   * @param {boolean} conMovimiento - false = sin haces ni motas.
   * @param {number} [dtMs] - Milisegundos reales desde el repintado
   *   anterior, para el suavizado del brillo (ver CONSTANTE_DE_SUAVIZADO_MS
   *   más arriba). Sin valor (la pasada de "estado quieto"), se salta
   *   directo al valor final: ahí no hay más cuadros después que lo sigan
   *   suavizando.
   * @returns {void}
   */
  function dibujarUnCuadro(conMovimiento, dtMs) {
    pincel.setTransform(escalaDelLienzo, 0, 0, escalaDelLienzo, 0, 0);
    pincel.clearRect(0, 0, anchoCss, altoCss);

    /* SUMA ADITIVA. Es lo que hace la luz de verdad —dos velas juntas
       iluminan más que una— y es la operación que reemplaza al
       mix-blend-mode: screen de las capas viejas, sin costar una capa. */
    pincel.globalCompositeOperation = 'lighter';

    /* El polvo se calcula acá, en el mismo bucle: no tiene sentido un
       requestAnimationFrame aparte para 32 puntitos. Solo hace falta
       calcularlo si se va a dibujar. */
    if (conMovimiento && window.LienzoDeLuz.animarLasMotas) {
      window.LienzoDeLuz.animarLasMotas(
        (performance.now() - momentoDeInicio) / 1000,
        anchoCss, altoCss,
        window.LienzoDeLuz.intensidadAmbiente ?? 0
      );
    }

    /* ⚡ ACÁ SÍ VA window.scrollY DIRECTO, NO scrollActualY().
       scrollActualY() devuelve una copia que solo se actualiza cuando
       dispara el evento 'scroll' del navegador — y en Safari/iOS, durante
       un scroll rápido o con inercia, ese evento llega con MUCHA menos
       frecuencia que el repintado visual real. La llama de una vela es
       un elemento normal: el navegador la mueve por el compositor en el
       mismo instante que se mueve la pantalla, sin esperar a JavaScript.
       Si acá se sigue usando la copia cacheada, el resplandor se dibuja
       en la posición VIEJA mientras la llama ya está en la nueva —eso es
       el "la luz se queda atrás de la vela" que se reportó—.

       Esto NO es el mismo caso que motivó el caché (cientos de lecturas
       por cuadro, una por cada joya colgante): acá es UNA lectura, una
       vez por cuadro dibujado, como mucho 60 veces por segundo. El costo
       es insignificante comparado con el beneficio de que la luz nunca
       se separe de la llama. */
    const desplazamiento = window.scrollY;
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

      // Primer cuadro de esta fuente: arranca directo en su valor, nada que suavizar.
      if (f.mostrado === undefined) f.mostrado = f.alfa;
      f.mostrado = (dtMs === undefined)
        ? f.alfa   // pasada de "estado quieto": salta directo, no queda nadie mirando
        : acercar(f.mostrado, f.alfa, dtMs, CONSTANTE_DE_SUAVIZADO_MS);

      if (f.mostrado <= 0.004 || f.radio <= 0) continue;

      const y = f.y - desplazamiento;
      if (y < -MARGEN - f.radio || y > altoCss + MARGEN + f.radio) continue;
      if (f.x < -MARGEN - f.radio || f.x > anchoCss + MARGEN + f.radio) continue;

      const alfa = f.mostrado * fuerzaDeVelas;
      pincel.globalAlpha = alfa > 1 ? 1 : alfa;
      const lado = f.radio * 2;
      pincel.drawImage(f.derrame ? SELLO_DERRAME : SELLO_NUCLEO,
                       f.x - f.radio, y - f.radio, lado, lado);
    }

    /* ── b) LOS HACES DE LOS VENTANALES Y c) EL POLVO ──
       Puro movimiento, así que con las animaciones apagadas (conMovimiento
       = false) se saltean entero: la pasada única del "estado quieto" deja
       solo el resplandor de las velas de la sección anterior. */
    if (conMovimiento) {
      /* Van en coordenadas de la ventana (su capa era `fixed`), así que no
         se les resta el scroll. Cada uno se estampa girado sobre su borde
         superior, que es el mismo `transform-origin: 50% 0` que tenía el
         CSS: el rayo pivota desde donde entra, no desde su centro. */
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

      /* También en coordenadas de ventana. Son puntitos: se estampan sin
         girar y sin más cuentas. */
      const motas = window.LienzoDeLuz.motas;
      for (let i = 0; i < motas.length; i++) {
        const m = motas[i];
        if (m.alfa <= 0.004) continue;

        pincel.globalAlpha = m.alfa > 1 ? 1 : m.alfa;
        const lado = m.radio * 2;
        pincel.drawImage(SELLO_MOTA, m.x - m.radio, m.y - m.radio, lado, lado);
      }

      /* LUCIÉRNAGAS Y TERMITAS (codigo/27-fauna-nocturna.js). En
         coordenadas de DOCUMENTO —como las fuentes—, así que se les resta
         el scroll. Reutilizan el sello de las motas: son la misma idea,
         un puntito con halo, y así no hace falta crear un degradado
         nuevo para 2 a 6 bichos que apenas se notan. */
      if (window.LienzoDeLuz.animarLaFauna) {
        window.LienzoDeLuz.animarLaFauna((performance.now() - momentoDeInicio) / 1000);
      }
      const fauna = window.LienzoDeLuz.fauna;
      for (let i = 0; i < fauna.length; i++) {
        const c = fauna[i];
        if (c.alfa <= 0.004) continue;

        const y = c.y - desplazamiento;
        if (y < -MARGEN - c.radio || y > altoCss + MARGEN + c.radio) continue;
        if (c.x < -MARGEN - c.radio || c.x > anchoCss + MARGEN + c.radio) continue;

        pincel.globalAlpha = c.alfa > 1 ? 1 : c.alfa;
        const lado = c.radio * 2;
        pincel.drawImage(SELLO_MOTA, c.x - c.radio, y - c.radio, lado, lado);
      }
    }

    pincel.globalAlpha = 1;
    pincel.globalCompositeOperation = 'source-over';
  }

  /**
   * El bucle: decide CUÁNDO dibujar (o no) y llama a dibujarUnCuadro().
   * @param {number} ahora - Marca de tiempo del navegador.
   * @returns {void}
   */
  function pintarLaLuz(ahora) {
    if (!hayAlgoQueMirar()) {
      /* Con las animaciones apagadas (a diferencia de sobre cerrado o
         pestaña de fondo) SÍ vale la pena una pasada: deja la luz en el
         estado quieto correcto en vez de congelada a mitad de movimiento.
         Una sola vez alcanza — nada vuelve a cambiar mientras siga así. */
      if (prefiereMenosMovimiento() && !yaSeDibujoElEstadoQuieto) {
        yaSeDibujoElEstadoQuieto = true;
        dibujarUnCuadro(false);
      }
      requestAnimationFrame(pintarLaLuz);
      return;
    }
    yaSeDibujoElEstadoQuieto = false;

    /* ⚠️ EL DESFASE DE LA LLAMA AL HACER SCROLL, Y POR QUÉ EL THROTTLE DE
       ARRIBA LO CAUSABA.
       Las velas (DOM: la mecha, la llamita del SVG) se mueven con el
       scroll NATIVO del navegador, a la frecuencia real de la pantalla
       —60, 90, 120 Hz—. Pero el resplandor que las rodea es este canvas,
       y este canvas se repinta cada 45 ms (~22 fps) A PROPÓSITO, porque
       el titileo que lo alimenta (velas, haces, motas) solo cambia esa
       seguido: repintar más rápido dibujaba el mismo resplandor varias
       veces.

       El problema es que esa cuenta no incluye el SCROLL: la posición
       del resplandor también depende de cuánto se scrolleó, y esa sí
       cambia cada cuadro nativo. Con el throttle a ciegas, al scrollear
       rápido la llama (DOM) ya se movió y el resplandor (canvas) todavía
       muestra dónde estaba hace dos o tres cuadros: se ve como si la luz
       se quedara atrás un instante.

       La solución: SOLO se respeta el throttle cuando el scroll no se
       movió desde el último repintado. En cuanto se detecta que sí, se
       dibuja YA —el resplandor sigue al scroll cuadro a cuadro, igual
       que la llama—, y el throttle vuelve a mandar apenas el scroll se
       queda quieto. Estampar el canvas es barato (ver el resto de este
       archivo): la ventana en la que esto corre a más fps es la del
       gesto de scroll, que dura instantes.

       ⚡ scrollDeEsteCuadro() Y NO window.scrollY DIRECTO (2026-08-24):
       un perfil real en pbe.aniaxv.com mostró "Layout"/"Recalculate style"
       colgados de ESTA línea — para cuando este bucle corre, las
       enredaderas y las joyas ya escribieron sus transforms de este mismo
       cuadro, así que preguntarle al navegador acá fuerza a recalcular
       todo lo pendiente. scrollDeEsteCuadro() (02-utilidades.js) da el
       mismo valor —se lee en el mismísimo cuadro, no una copia vieja del
       último evento 'scroll'— pero LEÍDO ANTES, en el primer cuadro de la
       fila, cuando todavía no hay nada que recalcular. No es el mismo
       caso que motivó scrollActualY() en su momento (esa sí puede quedar
       un cuadro atrás en Safari/iOS con inercia); acá se necesitaba
       "fresco de verdad" y "barato" al mismo tiempo, y por eso existe
       esta segunda copia en vez de reusar la primera. */
    const desplazamientoActual = scrollDeEsteCuadro();
    const seMovioElScroll = desplazamientoActual !== ultimoDesplazamientoDibujado;

    if (!seMovioElScroll && ahora - ultimoRepintado < cadaCuantoRepintar) {
      requestAnimationFrame(pintarLaLuz);
      return;
    }
    // Tiempo real desde el repintado anterior, para suavizar el brillo
    // (ver CONSTANTE_DE_SUAVIZADO_MS) — se mide ANTES de pisar ultimoRepintado.
    // Se acota por las dudas (pestaña recién vuelta a primer plano, etc.).
    const dtDesdeElUltimoRepintado = ultimoRepintado
      ? Math.min(ahora - ultimoRepintado, 250)
      : cadaCuantoRepintar;
    ultimoRepintado = ahora;
    ultimoDesplazamientoDibujado = desplazamientoActual;
    dibujarUnCuadro(true, dtDesdeElUltimoRepintado);

    requestAnimationFrame(pintarLaLuz);
  }

  requestAnimationFrame(pintarLaLuz);

  /* ⚡ TODAVÍA QUEDABA UNA VUELTA DE COLA, Y ESTO LA SACA.
     El fix de arriba (seMovioElScroll) hace que el canvas se repinte en
     cuanto pintarLaLuz nota que el scroll cambió — pero pintarLaLuz corre
     dentro de un requestAnimationFrame, que es UN turno más del hilo
     principal detrás de todo lo demás que también usa rAF (el vaivén de
     las plantas, las joyas colgantes, el monitor de rendimiento…). El
     scroll nativo lo mueve el COMPOSITOR, un hilo aparte que no espera
     ese turno. En un cuadro cargado, ese turno de más ya se nota.

     Este listener dibuja DIRECTO desde el propio evento 'scroll', en el
     mismo turno en que el navegador ya avisó que la posición cambió, sin
     esperar la vuelta completa de pintarLaLuz. Es seguro hacerlo acá:
     dibujar en un canvas no fuerza layout ni reflow, así que no cuesta lo
     que costaría, por ejemplo, leer un getBoundingClientRect() en el
     mismo lugar.

     Con equipos muy cargados igual puede quedar algo de desfase —es el
     límite de sincronizar un canvas con el scroll por JavaScript, no algo
     que un ajuste más vaya a borrar del todo—, pero esto lo deja en el
     mínimo posible dentro de esta arquitectura.

     ⚠️ ACÁ NO VA hayAlgoQueMirar(), Y ES A PROPÓSITO —ESTE FUE EL BUG
     REPORTADO: "con 'Sin animación' la luz se queda en el mismo punto,
     no se queda con la vela".
     hayAlgoQueMirar() es falso con las animaciones apagadas (incluye el
     botón, no solo el sobre cerrado o la pestaña de fondo —ver
     02-utilidades.js—), así que este listener se cortaba ENTERO: con
     "Sin animación" puesto, scrollear ya no repintaba nada, y el
     resplandor quedaba congelado en el lugar exacto donde estaba cuando
     se apagaron las animaciones, mientras la llama (DOM) seguía
     moviéndose con la página.

     Pero reposicionar el resplandor al scrollear NO ES una animación:
     es hacer que algo estático siga estando en su lugar. Por eso acá se
     pregunta por separado si la invitación está a la vista y la pestaña
     activa (sin importar si las animaciones están prendidas), y con eso
     alcanza para redibujar. El PARÁMETRO que sí depende de las
     animaciones es conMovimiento: con animaciones apagadas se redibuja
     iigual, pero sin mover haces, motas ni fauna —solo el resplandor de
     las velas, quieto pero en el lugar correcto—. */
  window.addEventListener('scroll', () => {
    if (!_laInvitacionSeVe || document.hidden) return;
    dibujarUnCuadro(hayAlgoQueMirar());
    ultimoRepintado = performance.now();
    ultimoDesplazamientoDibujado = window.scrollY;
  }, { passive: true });

})();
