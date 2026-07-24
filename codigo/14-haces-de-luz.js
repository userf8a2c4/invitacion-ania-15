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

  /* Donde publicamos las variables de luz para que las lea el resto del
     CSS (el oro del relicario, las motas de polvo). */
  const raiz = document.documentElement;

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

  const estadoDeLosHaces = haces.map((elemento, i) => ({
    elemento,
    anchoBase: 8 + (i % 3) * 4,          // entre 8vw y 16vw
    periodoDeGrosor: PERIODOS_DE_GROSOR[i % PERIODOS_DE_GROSOR.length],
    periodoDeBrillo: PERIODOS_DE_BRILLO[i % PERIODOS_DE_BRILLO.length],
    periodoDeDeriva: PERIODOS_DE_DERIVA[i % PERIODOS_DE_DERIVA.length],
    /* Cada uno arranca en un punto distinto de su ciclo, para que al
       cargar la página no estén todos en el mismo estado. */
    faseDeGrosor: Math.random() * Math.PI * 2,
    faseDeBrillo: Math.random() * Math.PI * 2,
    faseDeDeriva: Math.random() * Math.PI * 2,
    inclinacion: 14 + Math.random() * 9,  // entre 14° y 23°
  }));


  /* ─── 2. EL BUCLE ──────────────────────────────────────────────────
     Se actualiza a ~20 cuadros por segundo y no a 60. Es deliberado: el
     movimiento es tan lento que a 60 no se vería ninguna diferencia, y
     así se gasta la tercera parte del trabajo. La fluidez la aporta la
     transición del CSS, no la frecuencia de cálculo.
     ---------------------------------------------------------------- */

  /** Cada cuánto se recalcula, en milisegundos. */
  const CADA_CUANTO = 50;

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

  /**
   * Recalcula la forma de cada haz.
   * @param {number} momentoActual - Marca de tiempo del navegador.
   * @returns {void}
   */
  function animarLosHaces(momentoActual) {
    if (!animacionActiva) return;

    /* Animaciones apagadas (botón o accesibilidad): el bucle sigue vivo
       pero no dibuja luz —el CSS, además, esconde la capa—. Listo para
       reanudar al instante si se encienden, sin recargar. */
    if (prefiereMenosMovimiento()) { requestAnimationFrame(animarLosHaces); return; }

    if (momentoActual - ultimoCalculo >= CADA_CUANTO) {
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
      const profundidad = limitar(
        1 - window.scrollY / (window.innerHeight * 1.6),
        0.15, 1
      );

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

        haz.elemento.style.width = grosor.toFixed(2) + 'vw';
        haz.elemento.style.opacity = brillo.toFixed(4);
        haz.elemento.style.transform =
          `translateX(${deriva.toFixed(2)}vw) rotate(${haz.inclinacion.toFixed(1)}deg)`;

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
      raiz.style.setProperty('--luz-x', luzX.toFixed(4));
      raiz.style.setProperty('--luz-intensidad', luzIntensidad.toFixed(4));
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
