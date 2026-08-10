/* ══════════════════════════════════════════════════════════════════════
   08 · EFECTOS DE SCROLL
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Tres efectos que dependen de por dónde va la página:

     1. PARALLAX del fondo — el dibujo del fondo se mueve más lento que
        el contenido. Es el mismo truco que usaban los dibujos animados:
        el paisaje lejano se corre despacio y el personaje rápido, y el
        cerebro lo interpreta como profundidad.

     2. APARICIÓN DE LAS SECCIONES — cada bloque entra suavemente cuando
        llega a la pantalla, en vez de estar ahí desde el principio.

   (Antes había un tercer efecto: el óvalo de la portada se desvanecía al
   bajar. Se quitó a pedido: el relicario es una PIEZA SÓLIDA de joyería y
   tiene que verse maciza siempre, también mientras se va con el scroll.)

   ÍNDICE
     1. Parallax del fondo y marco de la portada
     2. Aparición de las secciones
   ══════════════════════════════════════════════════════════════════════ */


/* ═══ 1. PARALLAX DEL FONDO Y MARCO DE LA PORTADA ═════════════════════ */
(function preparaLosEfectosDeScroll() {

  const capaDeFondo    = buscar('#capa-fondo');
  const enredaderaDelMarco = buscar('#enredadera-de-la-portada');

  /**
   * Qué fracción del scroll recorre el fondo.
   * 0.15 = se mueve un 15 % de lo que se mueve el contenido.
   * Más chico = parece más lejos.
   */
  const VELOCIDAD_DEL_PARALLAX = 0.15;

  /* CALIDAD GRÁFICA: el parallax mueve una capa de fondo grande en CADA
     cuadro de scroll —un transform barato en sí, pero sobre una capa
     enorme, en un equipo débil suma—. En calidad baja el fondo queda fijo:
     casi no se nota (es solo profundidad extra), y se ahorra ese cálculo
     y esa escritura en cada scroll. */
  let calidad = nivelDeCalidad();

  /* ⚡ `will-change: transform` SOLO CUANDO EL PARALLAX DE VERDAD CORRE.
     Antes esto estaba fijo en el CSS: la capa de fondo (la más grande de
     toda la web, ~1,5 megapíxeles de textura) reservaba su propia capa de
     compositor SIEMPRE, incluso en calidad baja, donde el parallax de acá
     arriba ni se ejecuta. Un perfil real mostró `Layerize` en 67 % con el
     sobre cerrado y nada animándose: esta era una de las capas que sobraban.

     `will-change` es un aviso, no una decoración: si nunca se va a animar,
     no hay que pedirla. Se pone recién cuando la calidad deja de ser baja
     (que es cuando `actualizarEfectos()`, más abajo, empieza a escribirle
     `transform`), y se saca cuando vuelve a bajar. */
  function aplicarWillChangeDeFondo() {
    if (!capaDeFondo) return;
    capaDeFondo.style.willChange = calidad === CALIDAD_GRAFICA.BAJA ? 'auto' : 'transform';
  }
  aplicarWillChangeDeFondo();

  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    // Al degradar, se devuelve el fondo a su lugar natural (sin quedar
    // congelado a mitad de un desplazamiento de parallax).
    if (calidad === CALIDAD_GRAFICA.BAJA && capaDeFondo) capaDeFondo.style.transform = '';
    aplicarWillChangeDeFondo();
  });

  /** Evita hacer cuentas de más: solo una por cuadro de animación. */
  let hayUnCuadroPendiente = false;

  /**
   * Recalcula todos los efectos que dependen del scroll.
   * @returns {void}
   */
  function actualizarEfectos() {
    const posicionDelScroll = window.scrollY;

    /* ── Parallax del fondo ──────────────────────────────────────────
       El fondo mide 125vh, o sea que tiene 25vh de sobra para desplazarse.
       Nunca lo movemos más que ese sobrante, porque entonces se vería el
       borde de abajo.

       El sobrante se lee del elemento, no de un número escrito acá: si
       algún día cambia el alto en el CSS, esto se adapta solo. (Medía 160vh
       y se bajó a 125 para aligerar la textura; ver la nota en
       estilos/01-fundamentos.css.) */
    if (capaDeFondo && calidad !== CALIDAD_GRAFICA.BAJA) {
      const sobranteDisponible = capaDeFondo.offsetHeight - window.innerHeight;
      const cuantoSeMueve = Math.min(posicionDelScroll * VELOCIDAD_DEL_PARALLAX, sobranteDisponible);
      capaDeFondo.style.transform = `translateY(-${cuantoSeMueve.toFixed(1)}px)`;
    }

    /* ── El broche de la portada NO se desvanece ──────────────────────
       El relicario es una pieza sólida: se va con el scroll como cualquier
       contenido, pero SIEMPRE opaco. No se le toca ni la opacidad ni el
       tamaño (un scale haría "respirar" el marco y el texto al hacer
       scroll). Su opacidad la maneja solo el CSS (la animación de entrada). */

    /* ── Enredadera que rodea el óvalo de la portada ────────────────
       Gira lentísimo a medida que se baja: le da vida sin distraer. */
    if (enredaderaDelMarco) {
      enredaderaDelMarco.setAttribute(
        'transform',
        `rotate(${(posicionDelScroll * 0.018).toFixed(2)})`
      );
    }

    hayUnCuadroPendiente = false;
  }

  /**
   * Se llama en cada scroll, pero solo agenda UN cálculo por cuadro.
   * Sin esta protección, el navegador dispara el evento decenas de veces
   * por segundo y la página se traba.
   * @returns {void}
   */
  function alHacerScroll() {
    if (hayUnCuadroPendiente) return;
    hayUnCuadroPendiente = true;
    requestAnimationFrame(actualizarEfectos);
  }

  // { passive: true } le promete al navegador que no vamos a cancelar el
  // scroll, y eso le permite desplazarse sin esperar a nuestro código.
  window.addEventListener('scroll', alHacerScroll, { passive: true });
  window.addEventListener('resize', alHacerScroll);
  actualizarEfectos();

})();


/* ═══ 2. APARICIÓN DE LAS SECCIONES ═══════════════════════════════════ */
(function preparaLaAparicionDeLasSecciones() {

  const elementosQueAparecen = buscarTodos('.revelar');
  if (elementosQueAparecen.length === 0) return;

  /*
     IntersectionObserver ("observador de intersección") es una
     herramienta del navegador que avisa cuando un elemento entra o sale
     de la pantalla. Es muchísimo más eficiente que estar preguntando en
     cada scroll "¿ya se ve?, ¿ya se ve?".
  */
  const observador = new IntersectionObserver(function alCambiarLaVisibilidad(entradas) {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;

      // La clase "visible" es la que dispara la animación (ver el CSS)
      entrada.target.classList.add('visible');

      // Una vez que apareció, dejamos de vigilarlo: no queremos que se
      // esconda de nuevo al subir.
      observador.unobserve(entrada.target);
    });
  }, {
    /* threshold 0.15 = se activa cuando ya se ve el 15 % del elemento.
       Así aparece cuando de verdad entró, no cuando asoma un píxel. */
    threshold: 0.15,
  });

  elementosQueAparecen.forEach(elemento => observador.observe(elemento));

})();
