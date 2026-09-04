/* ══════════════════════════════════════════════════════════════════════
   08 · EFECTOS DE SCROLL
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos efectos que dependen de por dónde va la página:

     1. PARALLAX del fondo — el dibujo del fondo se mueve más lento que
        el contenido. Es el mismo truco que usaban los dibujos animados:
        el paisaje lejano se corre despacio y el personaje rápido, y el
        cerebro lo interpreta como profundidad.

     2. APARICIÓN DE LAS SECCIONES — cada bloque entra suavemente cuando
        llega a la pantalla, en vez de estar ahí desde el principio.

   (Antes había un tercer efecto: el óvalo de la portada se desvanecía al
   bajar. Se quitó a pedido: el relicario es una PIEZA SÓLIDA de joyería y
   tiene que verse maciza siempre, también mientras se va con el scroll.

   Y había un CUARTO efecto acá mismo: la enredadera que rodea el óvalo
   giraba lentísimo con el scroll —"le da vida sin distraer", decía este
   mismo comentario—. Se quitó a pedido explícito (2026-08-24): a simple
   vista se leía como que una parte del relicario se despegaba y se movía
   sola, justo lo contrario de "pieza sólida de joyería" que ya vale para
   el óvalo. Ver estilos/04-portada.css por qué además se le sacó el
   `will-change` que tenía: ya no anima, así que ya no le hace falta.) */

   /* ÍNDICE
     1. Parallax del fondo
     2. Aparición de las secciones
   ══════════════════════════════════════════════════════════════════════ */


/* ═══ 1. PARALLAX DEL FONDO ════════════════════════════════════════════ */
(function preparaLosEfectosDeScroll() {

  const capaDeFondo    = buscar('#capa-fondo');

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
       scroll). Su opacidad la maneja solo el CSS (la animación de entrada).

       Tampoco gira la enredadera que rodea el óvalo (#enredadera-de-la-
       portada, index.html): giraba lentísimo con el scroll, pero a pedido
       explícito (2026-08-24) se dejó fija — ver la nota grande al principio
       de este archivo. */

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
  // alCambiarElAncho: ignora el 'resize' falso de la barra del navegador en
  // celular (ver la nota en 02-utilidades.js) — medirElSobrante() vuelve a
  // leer offsetHeight/innerHeight, y aparecer/desaparecer la barra al
  // hacer scroll no es un cambio real de tamaño que haya que medir.
  window.addEventListener('resize', alCambiarElAncho(() => { medirElSobrante(); alHacerScroll(); }));
  medirElSobrante();
  actualizarEfectos();

})();


/* ═══ 2. APARICIÓN DE LAS SECCIONES ═══════════════════════════════════ */
(function preparaLaAparicionDeLasSecciones() {

  const elementosQueAparecen = buscarTodos('.revelar');
  if (elementosQueAparecen.length === 0) return;

  /* ⚡ RECIÉN ACÁ SE ESCONDE LO QUE VA A APARECER (2026-09-03)
   *
   * El CSS ya no arranca con `opacity: 0`: si este archivo no bajara,
   * diez bloques de la invitación —el formulario de confirmar incluido—
   * quedaban invisibles para siempre, en una página que se ve cargada.
   *
   * La clase se pone acá, cuando ya está garantizado que hay quien la
   * saque. Y se pone ANTES de observar, en la misma tarea, para que no
   * haya un parpadeo de contenido visible.
   *
   * Si el navegador no tiene IntersectionObserver (muy viejo), no se
   * esconde nada y se ve todo de una: sin animación, pero completo. */
  if (!('IntersectionObserver' in window)) return;

  /* Quien pidió menos movimiento en su sistema no necesita que las
     secciones aparezcan: se muestran y ya. Antes esto no se respetaba
     acá —el CSS de `prefers-reduced-motion` solo acortaba duraciones—,
     así que igual dependía del observador para ver el formulario. */
  if (typeof prefiereMenosMovimiento === 'function' && prefiereMenosMovimiento()) return;

  document.documentElement.classList.add('con-revelado');

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
    /* ⚡ threshold 0 + rootMargin, NO 0.15 (2026-09-03).
       Con 0.15 hacía falta que se viera el 15 % del elemento — y un
       bloque más alto que unas seis pantallas y media NO PUEDE llegar a
       esa proporción nunca, así que no aparecía jamás. El formulario de
       un grupo grande, con una fila por persona y el texto agrandado por
       accesibilidad, entra justo en ese caso.
       Con threshold 0 alcanza con que asome, y el margen negativo
       conserva la intención original: que aparezca cuando de verdad
       entró en pantalla, no cuando asoma el primer píxel. */
    threshold: 0,
    rootMargin: '0px 0px -12% 0px',
  });

  elementosQueAparecen.forEach(elemento => observador.observe(elemento));

})();
