/* ══════════════════════════════════════════════════════════════════════
   14 · HACES DE LUZ
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Mueve los rayos de sol que entran en diagonal: les cambia despacio el
   grosor, el brillo y la posición, como cuando una nube pasa por delante
   del sol y el haz se abre, se afina o se apaga.

   ─────────────────────────────────────────────────────────────────────
   EL PROBLEMA DE FONDO: QUE NO SE NOTE EL BUCLE

   Lo más difícil de una animación ambiental no es que se vea linda, sino
   que no se note que se repite. Si un rayo va y viene con un ritmo fijo,
   al minuto el ojo ya lo aprendió y el encanto se rompe.

   La solución es vieja y elegante: cada propiedad de cada haz oscila con
   su PROPIO período, y esos períodos se eligen para que no encajen entre
   sí. Si un haz tardara 10 segundos en su ciclo y otro 20, cada 20
   segundos volverían los dos a la misma posición y se vería la
   repetición. En cambio, con períodos como 13, 17, 19, 23 y 29 segundos
   —números primos entre sí— la combinación completa tarda MUCHÍSIMO en
   repetirse: el patrón entero solo vuelve a empezar al cabo de horas.

   Es el mismo motivo por el que los grillos de un campo nunca suenan
   sincronizados.

   ÍNDICE
     1. Preparar los haces
     2. El bucle de animación
     3. Ahorro de batería
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLosHacesDeLuz() {

  const capa = buscar('#haces-de-luz');
  if (!capa) return;

  /* ─── DÓNDE SE PUBLICAN LAS VARIABLES DE LUZ (y por qué NO en el <html>)
     La luz publica dos números para que los lea el CSS: --luz-x (dónde está
     el sol) y --luz-intensidad (cuánta luz hay). Antes se escribían en
     document.documentElement, o sea en el <html>.

     ⚠️ Eso costaba carísimo, y lo confirmó un perfil de rendimiento: las
     variables de CSS SE HEREDAN, así que al escribirlas en la raíz el
     navegador tiene que invalidar y recalcular el estilo de TODO el
     documento —cualquier descendiente podría estar usándolas—. Con este
     DOM (cientos de flores, decenas de velas, los SVG del relicario y del
     marco) eso es un recálculo enorme… varias veces por segundo. En el
     perfil, "Recalculate style" se llevaba el 39 % del tiempo total, sin
     ninguna función de JavaScript colgando debajo: el costo lo pagaba el
     navegador DESPUÉS de la escritura.

     Solo TRES elementos leen estas variables, así que se escriben
     directamente en ellos. Cada uno ve exactamente el mismo valor —var()
     lo encuentra en el propio elemento antes de salir a heredar— pero la
     invalidación pasa de "todo el documento" a "estos tres".

     Las referencias se buscan UNA vez acá, no en cada cuadro. Y los valores
     por defecto de estilos/01-fundamentos.css (--luz-x: .5,
     --luz-intensidad: 0) se mantienen: son la base antes del primer cuadro. */
  const destinosDeLaLuz = [
    buscar('#motas-de-polvo'),        // opacity: var(--luz-intensidad)
    buscar('.portada__brillo-oro'),   // background-position + opacity
    buscar('.portada__nombre'),       // background-position del barrido de oro
  ].filter(Boolean);

  /* No se corta acá aunque las animaciones estén apagadas: el bucle se
     prepara igual y queda en reposo (ver el guard del bucle). Con las
     animaciones apagadas, además, el CSS esconde la capa de haces. Si se
     encienden con el botón, la luz vuelve en el acto, sin recargar. */
  const haces = buscarTodos('#haces-de-luz .haz');
  if (haces.length === 0) return;


  /* ─── 1. PREPARAR LOS HACES ────────────────────────────────────────
     Cada haz recibe tres relojes independientes —uno para el grosor, uno
     para el brillo y uno para la deriva— con períodos que no encajan
     entre sí (ver la explicación de arriba).
     ---------------------------------------------------------------- */

  /** Períodos en segundos. Son primos entre sí a propósito.
   *
   *  Son LARGOS —el más corto ronda el medio minuto— porque la luz tiene
   *  que sentirse como el paso lento del tiempo en una tarde nublada: una
   *  nube que tarda en cruzar el sol, no un parpadeo. Si estos números
   *  fueran chicos, el vaivén se leería nervioso; con ellos, la luz
   *  respira despacio y el ojo nunca la "pesca" repitiéndose. */
  const PERIODOS_DE_GROSOR  = [31, 41, 47, 53, 67];
  const PERIODOS_DE_BRILLO  = [53, 67, 31, 41, 47];
  const PERIODOS_DE_DERIVA  = [83, 89, 97, 71, 103];

  /** Opacidad máxima de cada haz.
   *  La capa entera va en mix-blend-mode: screen, así que este brillo NO
   *  lava los negros: solo enciende lo que ya tenía algo de luz (el oro,
   *  las gemas, los pétalos). Y una máscara (ver 12-haces-de-luz.css)
   *  evita que la luz caiga sobre el marco victoriano del borde.
   *  Por eso ahora se puede subir a un valor perceptible sin ensuciar:
   *  "se sabe que está, pero no deslumbra". */
  const BRILLO_MAXIMO = 0.22;

  /** ¿Dibuja el lienzo? (ver codigo/23-lienzo-de-luz.js). Se decide una
   *  sola vez, al cargar: no cambia en mitad de la sesión. */
  const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);

  const estadoDeLosHaces = haces.map((elemento, i) => ({
    elemento,

    /* Dónde nace el haz, en porcentaje del ancho de la ventana. Lo pone el
       CSS (.haz:nth-child(N) { left: … }) y hay que preguntárselo al
       navegador con getComputedStyle.

       ⚠️ POR QUÉ NO SE LEE ACÁ. Preguntar por un valor calculado obliga al
       navegador a resolver estilos y layout EN ESE INSTANTE (un "reflow
       forzado"). Y este código se evalúa durante la carga, o sea en el peor
       momento posible: se le hacía frenar el arranque para averiguar algo
       que no hace falta hasta que el sobre se abre y hay luz que dibujar.

       Se deja en 0 y lo rellena medirLosHaces(), en el primer cuadro que
       de verdad se dibuja. */
    izquierda: 0,

    /* El objeto que lee el lienzo cuadro a cuadro. Se crea una vez y
       después solo se le cambian los números: cero basura por cuadro. */
    enElLienzo: { x: 0, y: 0, ancho: 0, alto: 0, giro: 0, alfa: 0 },

    anchoBase: 8 + (i % 3) * 4,          // entre 8vw y 16vw
    periodoDeGrosor: PERIODOS_DE_GROSOR[i % PERIODOS_DE_GROSOR.length],
    periodoDeBrillo: PERIODOS_DE_BRILLO[i % PERIODOS_DE_BRILLO.length],
    periodoDeDeriva: PERIODOS_DE_DERIVA[i % PERIODOS_DE_DERIVA.length],
    /* Cada uno arranca en un punto distinto de su ciclo, para que al
       cargar la página no estén todos en el mismo estado. */
    faseDeGrosor: Math.random() * Math.PI * 2,
    faseDeBrillo: Math.random() * Math.PI * 2,
    faseDeDeriva: Math.random() * Math.PI * 2,
    /* ⚠️ ANTES ACÁ HABÍA UNA INCLINACIÓN FIJA (entre 14° y 23°), y era el
       motivo de que la hora no se sintiera: por muy bien que se tiñera la
       luz, entraba SIEMPRE POR EL MISMO SITIO.

       Ahora la inclinación la manda el sol —codigo/22-luz-de-la-hora.js la
       publica en window.LuzDeLaHora—, y esto de acá es solo el desvío
       personal de cada haz: unos grados arriba o abajo para que los cinco no
       sean paralelos perfectos, que delataría el truco.

       A las 7 de la mañana los haces entran rasantes desde un lado; al
       mediodía, casi verticales; al atardecer, rasantes desde el otro. Es la
       señal más legible de todas: mucho más que el color. */
    desvio: Math.random() * 9 - 4.5,
  }));

  /* Se le entregan al lienzo los objetos de los haces. A partir de acá el
     bucle solo les cambia los números; la lista no se vuelve a armar. Y la
     capa vieja, con su mix-blend-mode a pantalla completa, se apaga. */
  if (usaElLienzo) {
    window.LienzoDeLuz.haces = estadoDeLosHaces.map(h => h.enElLienzo);
    const capaDeHaces = buscar('#haces-de-luz');
    if (capaDeHaces) capaDeHaces.style.display = 'none';
  }


  /* ─── 2. EL BUCLE ──────────────────────────────────────────────────
     Se actualiza a ~20 cuadros por segundo y no a 60. Es deliberado: el
     movimiento es tan lento que a 60 no se vería ninguna diferencia, y
     así se gasta la tercera parte del trabajo. La fluidez la aporta la
     transición del CSS, no la frecuencia de cálculo.
     ---------------------------------------------------------------- */

  /* Cada cuánto se recalcula, en milisegundos. Ya de por sí es lento a
     propósito (ver arriba); en calidad más baja se espacia todavía más:
     el movimiento es tan pausado que la diferencia no se nota, y se ahorra
     ese cálculo. CALIDAD_GRAFICA y nivelDeCalidad() están en
     02-utilidades.js. Se lee UNA vez al cargar (no hace falta re-leerlo en
     vivo: es un ritmo, no una cantidad de elementos). */
  /* En calidad ALTA la luz se recalcula más seguido (32 ms): la deriva de
     los haces y el latido de las motas se mueven de forma más continua, sin
     apoyarse tanto en la transición del CSS para disimular los saltos. */
  const CADA_CUANTO_POR_CALIDAD = { 0: 32, 1: 65, 2: 90 };
  let cadaCuanto = CADA_CUANTO_POR_CALIDAD[nivelDeCalidad()] ?? 50;
  document.addEventListener('calidad-cambio', evento => {
    cadaCuanto = CADA_CUANTO_POR_CALIDAD[evento.detail && evento.detail.calidad] ?? 50;
  });

  let momentoDeInicio = performance.now();
  let animacionActiva = true;
  let ultimoCalculo = 0;


  /* ─── EL REVELADO ──────────────────────────────────────────────────
     Mientras el sobre está cerrado, la luz vale 0: la web está a oscuras
     detrás de la carta. Al abrir el sobre ("encender las luces"), la luz
     sube de 0 a su valor pleno en un par de segundos, y la web aparece
     bañándose de a poco. No es un corte: es un amanecer.

     Se dispara con el mismo evento que arranca la música, así el sonido
     y la luz entran juntos (ver la transición en 03-sobre-de-apertura.js
     y 10-reproductor-de-musica.js).
     ---------------------------------------------------------------- */

  /** Cuánto tarda la luz en llegar a pleno, en milisegundos. */
  const DURACION_DEL_REVELADO = 2600;

  /** Momento en que se abrió el sobre. null = todavía cerrado. */
  let inicioDelRevelado = null;

  /**
   * Nivel de luz del revelado, de 0 (sobre cerrado) a 1 (pleno).
   * Usa smoothstep para que arranque y termine suave, sin tirones.
   *
   * @param {number} ahora - Marca de tiempo del navegador.
   * @returns {number} Entre 0 y 1.
   */
  function nivelDelRevelado(ahora) {
    if (inicioDelRevelado === null) return 0;
    const t = limitar((ahora - inicioDelRevelado) / DURACION_DEL_REVELADO, 0, 1);
    return t * t * (3 - 2 * t);   // smoothstep
  }

  document.addEventListener('sobre-abierto', () => {
    if (inicioDelRevelado === null) inicioDelRevelado = performance.now();
  }, { once: true });

  /* Si alguien llega con el sobre ya abierto (por ejemplo, al recargar en
     una sección más abajo), no tiene sentido esperar el amanecer: la luz
     ya tiene que estar puesta. */
  if (!document.body.classList.contains('sobre-visible')) {
    inicioDelRevelado = performance.now() - DURACION_DEL_REVELADO;
  }

  /**
   * Convierte un seno (que va de −1 a 1) en un valor de 0 a 1.
   *
   * @param {number} segundos - Tiempo transcurrido.
   * @param {number} periodo  - Cuánto tarda un ciclo completo.
   * @param {number} fase     - Desde dónde arranca el ciclo.
   * @returns {number} Un número entre 0 y 1 que sube y baja suavemente.
   */
  function ondaSuave(segundos, periodo, fase) {
    return (Math.sin((segundos / periodo) * Math.PI * 2 + fase) + 1) / 2;
  }

  /** ¿Ya se leyó del CSS dónde nace cada haz? (ver `izquierda`, arriba). */
  let yaSeMidieron = false;

  /**
   * Lee del CSS dónde nace cada haz. Se hace UNA sola vez, y a propósito
   * NO durante la carga: preguntar por un valor calculado obliga al
   * navegador a resolver layout en ese instante, y hacerlo mientras la
   * página arranca retrasa el primer dibujo. Acá ya estamos en un cuadro
   * de animación con el sobre abierto, así que el layout ya está resuelto
   * y la lectura no le cuesta nada a nadie.
   *
   * @returns {void}
   */
  function medirLosHaces() {
    if (yaSeMidieron) return;
    yaSeMidieron = true;

    const ancho = Math.max(1, window.innerWidth);
    for (const haz of estadoDeLosHaces) {
      haz.izquierda = parseFloat(getComputedStyle(haz.elemento).left) / ancho * 100 || 0;
    }
  }

  /**
   * Recalcula la forma de cada haz.
   * @param {number} momentoActual - Marca de tiempo del navegador.
   * @returns {void}
   */
  function animarLosHaces(momentoActual) {
    if (!animacionActiva) return;

    /* Sin nadie mirando —sobre todavía cerrado, pestaña de fondo, o
       animaciones apagadas— el bucle sigue vivo pero no dibuja luz. Listo
       para reanudar al instante, sin recargar. */
    if (!hayAlgoQueMirar()) { requestAnimationFrame(animarLosHaces); return; }

    /* ⚡ UN CUADRO MÁS DE MARGEN — esto es lo que arregla una tarea larga
       de 81ms medida por Lighthouse. medirLosHaces() ya estaba diferida
       a propósito hasta este primer cuadro real (ver su propio comentario,
       más arriba: leer getComputedStyle durante la carga sería "el peor
       momento posible"). El problema es que ESTE cuadro coincide con el
       instante en que se dispara 'invitacion-visible', que también
       dispara la construcción de otros módulos pesados (enredaderas,
       velas) — el nuevo "peor momento", porque esas escrituras invalidan
       estilos justo antes de que acá se lean. requestAnimationFrame le da
       un cuadro más para que ese otro trabajo termine su propio layout
       primero. Sigue ejecutándose una sola vez (yaSeMidieron adentro de
       medirLosHaces), y el valor de `left` no cambia entre cuadros (es
       una posición fija por nth-child), así que leerlo un cuadro después
       da exactamente el mismo número. */
    if (!yaSeMidieron) requestAnimationFrame(medirLosHaces);

    if (momentoActual - ultimoCalculo >= cadaCuanto) {
      ultimoCalculo = momentoActual;
      const segundos = (momentoActual - momentoDeInicio) / 1000;

      // Cuánta luz hay ahora mismo (0 con el sobre cerrado, 1 a pleno).
      const revelado = nivelDelRevelado(momentoActual);

      /* PROFUNDIDAD: la luz reina arriba y se hunde al bajar.
         Como el sol en el agua, cuanto más profundo se está en la página,
         menos luz llega. En la portada (scroll 0) la luz está plena; hacia
         el fondo cae hasta apenas un 15 %. La caída se reparte en algo más
         de una pantalla y media, para que el hundimiento se sienta gradual.
         Así los haces "pierden poder" en las secciones de abajo. */
      /* scrollActual() y no window.scrollY: dentro del bucle, preguntarle el
         scroll al navegador lo obliga a recalcular estilos (02-utilidades.js). */
      /* ⚠️ LA LUZ NATURAL NO DEBE LLEGAR AL FONDO. Antes caía de forma
         lineal y con un suelo del 15 %: al bajar del todo seguía entrando un
         resto de sol por los ventanales, y eso rompía la escena —abajo la
         sala tiene que estar iluminada SOLO por las velas—.

         Ahora la caída es al cuadrado: se mantiene plena en la portada, se
         desploma a media pantalla de bajada y llega a CERO. Los candelabros
         se quedan solos con el trabajo, que es de lo que trata la
         profundidad de esta invitación. */
      const cuantoSeBajo = limitar(
        scrollActualY() / (window.innerHeight * 1.35), 0, 1
      );
      const profundidad = (1 - cuantoSeBajo) * (1 - cuantoSeBajo);

      /* RESPIRACIÓN DE VELA: un latido lentísimo de toda la luz ambiente,
         como la llama de una vela que sube y baja. Es apenas ±8 %, y con
         un período largo (~8 s) para que se sienta vivo pero nunca se lea
         como un parpadeo. Le da a la escena esa quietud inquieta de un
         salón iluminado a velas. */
      const vela = 0.92 + ondaSuave(segundos, 8.3, 0) * 0.08;

      // Todo lo ambiente se apaga junto: por el revelado, por la
      // profundidad y por la vela.
      const luzAmbiente = revelado * profundidad * vela;

      /* Para publicarle al resto de la web dónde está la luz y con cuánta
         fuerza. El oro del relicario y las motas de polvo se cuelgan de
         estos dos números para moverse EN SINCRONÍA con los haces. */
      let sumaDeDeriva = 0;
      let sumaDeBrillo = 0;

      /* La posición del sol de esta hora. Se lee UNA vez por cuadro —no por
         haz— y trae valores de reserva por si el módulo de la hora no
         llegara a cargar: 18° y largo normal, la luz de tarde de siempre. */
      const hora = window.LuzDeLaHora;
      const anguloDelSol = hora ? hora.anguloDelSol : 18;
      const largoDelHaz  = hora ? hora.largoDelHaz  : 1;

      for (const haz of estadoDeLosHaces) {
        // GROSOR: el haz se abre y se cierra, como al pasar una nube.
        // La oscilación es suave (0,72 a 1,3 del ancho base): antes se
        // abría y cerraba de más y el movimiento se notaba; ahora apenas
        // late, acompañando el paso lento de la luz.
        const grosor = haz.anchoBase *
          (0.72 + ondaSuave(segundos, haz.periodoDeGrosor, haz.faseDeGrosor) * 0.58);

        // BRILLO: a veces casi desaparece, y eso es lo que lo hace creíble.
        // Se multiplica por la luz ambiente (revelado × profundidad × vela):
        // apagado con el sobre cerrado, pleno arriba, hundido abajo.
        const ondaDeBrillo = Math.pow(ondaSuave(segundos, haz.periodoDeBrillo, haz.faseDeBrillo), 1.6);
        const brillo = BRILLO_MAXIMO * ondaDeBrillo * luzAmbiente;

        // DERIVA: se corre despacio de lado, como si el sol se moviera
        const ondaDeDeriva = ondaSuave(segundos, haz.periodoDeDeriva, haz.faseDeDeriva);
        const deriva = (ondaDeDeriva - 0.5) * 9;

        /* ⚡ CON EL LIENZO ACTIVO, EL HAZ NO ES UN DIV: ES UN NÚMERO.
           Su capa llevaba `mix-blend-mode: screen` a pantalla completa, que
           es de lo más caro que se le puede pedir al compositor —lo obliga a
           leer de vuelta el fondo y le impide fusionar nada de lo que hay
           debajo—. Dibujado en el lienzo, el mismo rayo no cuesta ninguna
           capa. Ver codigo/23-lienzo-de-luz.js. */
        if (usaElLienzo) {
          const anchoVentana = window.innerWidth;
          const altoVentana  = window.innerHeight;

          /* Las mismas medidas que tenía el CSS, pasadas a píxeles:
             left: X% · width: grosor vw · top: -45% · height: 190%
             y el giro sobre el borde de arriba (transform-origin: 50% 0). */
          const anchoPx = (grosor / 100) * anchoVentana;
          const centroX = ((haz.izquierda + grosor / 2) / 100) * anchoVentana
                        + (deriva / 100) * anchoVentana;

          haz.enElLienzo.x     = centroX;
          haz.enElLienzo.y     = -0.45 * altoVentana;
          haz.enElLienzo.ancho = anchoPx;
          /* Un sol bajo alarga el rayo; uno alto lo acorta. */
          haz.enElLienzo.alto  = 1.9 * altoVentana * largoDelHaz;
          haz.enElLienzo.giro  = (anguloDelSol + haz.desvio) * Math.PI / 180;
          haz.enElLienzo.alfa  = brillo;
        } else {
          haz.elemento.style.width = grosor.toFixed(2) + 'vw';
          haz.elemento.style.opacity = brillo.toFixed(4);
          haz.elemento.style.height = (190 * largoDelHaz).toFixed(0) + '%';
          haz.elemento.style.transform =
            `translateX(${deriva.toFixed(2)}vw) rotate(${(anguloDelSol + haz.desvio).toFixed(1)}deg)`;
        }

        sumaDeDeriva += ondaDeDeriva;
        sumaDeBrillo += ondaDeBrillo;
      }

      /* Posición media de la luz (0 = corrida a la izquierda, 1 = a la
         derecha) e intensidad media, ya afectada por la luz ambiente
         completa (revelado × profundidad × vela). El oro del relicario y
         las motas leen estas variables desde el CSS, así que también se
         apagan cuando la luz se hunde. */
      const cuantos = estadoDeLosHaces.length;
      const luzX = sumaDeDeriva / cuantos;
      const luzIntensidad = (sumaDeBrillo / cuantos) * luzAmbiente;

      /* Se escribe en los tres elementos que las usan, NO en el <html>
         (ver la nota larga arriba: escribirlas en la raíz obligaba a
         recalcular el estilo del documento entero). */
      /* El polvo, dibujado en el lienzo, ya no puede colgarse de la
         variable CSS: necesita el número. Es el mismo valor. */
      if (usaElLienzo) window.LienzoDeLuz.intensidadAmbiente = luzIntensidad;

      const textoLuzX = luzX.toFixed(4);
      const textoLuzIntensidad = luzIntensidad.toFixed(4);
      for (const destino of destinosDeLaLuz) {
        destino.style.setProperty('--luz-x', textoLuzX);
        destino.style.setProperty('--luz-intensidad', textoLuzIntensidad);
      }
    }

    requestAnimationFrame(animarLosHaces);
  }

  requestAnimationFrame(animarLosHaces);


  /* ─── 3. AHORRO DE BATERÍA ─────────────────────────────────────────
     Si la pestaña deja de verse, se corta el bucle. No tiene sentido
     calcular luz para nadie.
     ---------------------------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animacionActiva = false;
    } else {
      animacionActiva = true;
      /* Se corre el punto de partida hacia adelante para que las ondas
         retomen donde estaban y no den un salto al volver. */
      ultimoCalculo = 0;
      requestAnimationFrame(animarLosHaces);
    }
  });

})();
