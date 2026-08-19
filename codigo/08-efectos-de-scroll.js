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

  /* ⚠️ NO CONDICIONAR `will-change` ACÁ. Se probó (quitarlo en calidad baja,
     ponerlo solo cuando el parallax corre) y empeoró: la capa de fondo, con
     el ruido de papel fusionado adentro (ver estilos/01-fundamentos.css,
     #capa-fondo tiene 4 capas de background incluido un filtro SVG), es
     cara de PINTAR. Sin la promoción a capa propia, ese fondo se repinta
     en vez de solo componerse — y eso le pegó justo a calidad baja, que es
     donde corren los equipos con menos margen. `will-change: transform`
     queda fijo en el CSS, siempre puesto, sin condición. */

  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    // Al degradar, se devuelve el fondo a su lugar natural (sin quedar
    // congelado a mitad de un desplazamiento de parallax).
    if (calidad === CALIDAD_GRAFICA.BAJA && capaDeFondo) capaDeFondo.style.transform = '';
  });

  /* ⚡ EL SOBRANTE SE MIDE UNA VEZ, NO EN CADA SCROLL.
     capaDeFondo.offsetHeight fuerza al navegador a recalcular el layout de
     toda la página si hay algo pendiente de invalidar — un perfilado real
     en vivo lo mostró como parte de un reprocesamiento forzado. El alto de
     #capa-fondo (125vh) solo cambia si cambia el alto de la ventana, así
     que se mide al cargar y en cada resize, igual que medidaDelRelicario()
     en 02-utilidades.js — nunca dentro de actualizarEfectos(). */
  let sobranteDisponible = 0;
  function medirElSobrante() {
    if (capaDeFondo) sobranteDisponible = capaDeFondo.offsetHeight - window.innerHeight;
  }

  /* Punto de giro de la enredadera del marco, fijado una sola vez (mismo
     arreglo que ya tienen los nudos/plantas/flores de 07-marco-y-
     enredaderas.js y las joyas colgantes: style.transform en vez de
     setAttribute('transform'), para que el giro lo resuelva el compositor
     y no pase por LAYOUT). */
  if (enredaderaDelMarco) {
    enredaderaDelMarco.style.transformBox = 'view-box';
    enredaderaDelMarco.style.transformOrigin = 'center';
  }

  /** Evita hacer cuentas de más: solo una por cuadro de animación. */
  let hayUnCuadroPendiente = false;

  /**
   * Recalcula todos los efectos que dependen del scroll.
   * @returns {void}
   */
  function actualizarEfectos() {
    // scrollActualY() y no window.scrollY: leerlo directo, en cada cuadro
    // de scroll, es otra de las lecturas que un perfilado real mostró
    // forzando layout — mismo motivo que ya documentan 02-utilidades.js,
    // 07/14/17/19/23-*.js.
    const posicionDelScroll = scrollActualY();

    /* ── Parallax del fondo ──────────────────────────────────────────
       El fondo mide 125vh, o sea que tiene 25vh de sobra para desplazarse.
       Nunca lo movemos más que ese sobrante, porque entonces se vería el
       borde de abajo. (Medía 160vh y se bajó a 125 para aligerar la
       textura; ver la nota en estilos/01-fundamentos.css.) */
    if (capaDeFondo && calidad !== CALIDAD_GRAFICA.BAJA) {
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
      enredaderaDelMarco.style.transform = `rotate(${(posicionDelScroll * 0.018).toFixed(2)}deg)`;
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
  window.addEventListener('resize', () => { medirElSobrante(); alHacerScroll(); });
  medirElSobrante();
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
