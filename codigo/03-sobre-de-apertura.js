/* ══════════════════════════════════════════════════════════════════════
   03 · SOBRE DE APERTURA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Maneja la pantalla de bienvenida: primero muestra un monograma que se
   dibuja solo mientras carga todo, después muestra el sobre lacrado, y
   cuando el invitado hace clic lo abre y revela la invitación.

   POR QUÉ ES IMPORTANTE (más allá de lo lindo)
   Los navegadores no dejan que una web empiece a sonar sola: exigen que
   la persona haga algo primero (un clic, un toque). El clic para abrir el
   sobre ES ese permiso. Por eso, apenas se abre, avisamos al reproductor
   con un "evento" para que arranque la música.

   QUÉ ES UN EVENTO PERSONALIZADO
   Es como un grito que da un archivo y que otros archivos pueden estar
   escuchando, sin que ninguno necesite conocer al otro. Acá gritamos
   'sobre-abierto' y el archivo 10-reproductor-de-musica.js lo escucha.

   ÍNDICE
     1. Elementos que vamos a usar
     2. Precarga de tipografías y fondo
     3. Mostrar el sobre cuando todo está listo
     4. Abrir el sobre
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElSobreDeApertura() {

  /* ─── 1. ELEMENTOS ──────────────────────────────────────────────── */
  const sobre       = buscar('#sobre-de-apertura');
  const ilustracion = buscar('#ilustracion-del-sobre');

  /* Si por algún motivo el sobre no existe en el HTML, no hacemos nada acá…
     pero SÍ avisamos que la invitación ya está a la vista.

     ⚠️ ESTO ES IMPORTANTE Y NO ES UN DETALLE. Los adornos pesados —las
     enredaderas de 07 y los candelabros de 19— se construyen recién al
     escuchar 'invitacion-visible', porque viven detrás del sobre y nadie
     los ve hasta que se abre. Si el sobre no existe, ese evento no llegaría
     nunca y la web quedaría pelada.

     Antes eso se cubría con temporizadores de respaldo ("construí igual a
     los 2 segundos, por las dudas"). El problema: se disparaban SIEMPRE,
     incluso con el sobre cerrado, así que la página se ponía a construir
     354 flores y 82 velas que nadie estaba mirando. Eso bloqueaba el hilo
     casi 3 segundos (Total Blocking Time de 2.790 ms en PageSpeed).

     Acá el mismo caso se cubre con CERTEZA en vez de con un cronómetro: si
     el sobre no está, se avisa; si está, se avisa al abrirlo y no antes. */
  if (!sobre) {
    // En el siguiente tick, para que los demás archivos alcancen a
    // registrar su escucha de este evento (este archivo es el 03 de 24).
    setTimeout(() => document.dispatchEvent(new CustomEvent('invitacion-visible')), 0);
    // Sin sobre no hay "mostrarElSobre()" que dispare la escena (ver más
    // abajo): se arranca acá, en el mismo lugar donde se avisa que la
    // invitación ya se ve.
    if (typeof iniciarInyeccionDeLaEscena === 'function') iniciarInyeccionDeLaEscena();
    return;
  }

  document.body.classList.add('sobre-visible');
  // También en <html>: el bloqueo de scroll con overflow:hidden solo en
  // <body> no es fiable en todos los navegadores —algunos siguen usando
  // <html> como el elemento que de verdad se desplaza—, y ahí es donde se
  // veía una barra de scroll moviéndose sin poder ir a ningún lado.
  document.documentElement.classList.add('sobre-visible');

  /** Evita que el sobre se abra dos veces si alguien hace doble clic. */
  let yaSeEstaAbriendo = false;


  /* ─── 2. MOSTRAR YA ──────────────────────────────────────────────────
     ⚡ REESCRITO A FONDO (2026-08-30) — ESTO ES EL 90 → 100 DE MÓVIL.
     Antes acá se esperaba (con Promise.race) a document.fonts.ready —TODAS
     las 16 caras de fuente del CSS, no las 3 precargadas— y a que bajara de
     nuevo recursos/fondo-ornamental.svg (sin ?v=, otra petición de 35 KB de
     un fondo que el sobre TAPA), con un tope de 1200 ms. En Slow 4G esa
     carrera nunca la ganaban las fuentes: siempre ganaba el tope, y esos
     1200 ms de "esta-cargando" (con .sobre__carta en display:none) eran el
     filmstrip en blanco que medía PageSpeed: FCP 2.3 s, LCP 3.0 s, SI 4.6 s,
     con el sobre —que es el LCP real, texto + SVG, no una foto— recién
     apareciendo después.

     El CSS del sobre YA está inline (ver ESTILOS-EMPAQUETADOS-INICIO/FIN en
     index.html) y Cinzel Decorative 400 —la única tipografía que se ve
     antes de abrir, en .sobre__saludo— YA está en <link rel=preload> con
     font-display:swap. No hace falta esperar nada de eso: se muestra el
     sobre en el siguiente cuadro, y si la fuente todavía no llegó, swap la
     trae sola sin bloquear nada.

     No se espera Cormorant, no se espera IM Fell, no se espera el SVG de
     fondo: ninguno de los tres se ve con el sobre cerrado. */
  requestAnimationFrame(mostrarElSobre);


  /* ─── 3. MOSTRAR EL SOBRE ──────────────────────────────────────── */

  /**
   * Cambia la pantalla de "cargando" por el sobre lacrado.
   * @returns {void}
   */
  function mostrarElSobre() {
    sobre.classList.remove('esta-cargando');

    /* Se le da el foco al sobre para que se pueda abrir con Enter sin
       necesidad de usar el mouse.

       ⚠️ preventScroll Y EL RECUADRO DORADO.
       Antes acá se enfocaba la ILUSTRACIÓN, y el navegador dibujaba
       alrededor su aro de foco: ese rectángulo dorado que aparecía
       encuadrando la carta sin que nadie lo hubiera pedido. El navegador
       no distingue entre "me enfocaron con el teclado" (donde el aro es
       imprescindible) y "me enfocó un script al cargar" (donde sobra), y
       ante la duda lo muestra.

       La solución es enfocar el CONTENEDOR, que no tiene aro. El teclado
       sigue funcionando igual: desde ahí, un Tab cae en la ilustración
       —y ahí sí aparece el aro, porque ahí sí lo pidió la persona—, y la
       tecla Enter la escucha el contenedor entero.

       ⚡ EL .focus() SE PIDE UN CUADRO DESPUÉS — esto es lo que arregla un
       reprocesamiento forzado de 14ms medido por Lighthouse. El
       classList.remove() de arriba invalida estilos, y focus() necesita
       resolver el layout para decidir si el elemento es foco-able: pedirlo
       en el mismo instante fuerza ese cálculo de golpe. requestAnimationFrame
       lo corre después de que el navegador ya resolvió su propio layout —
       el foco cae en el mismo elemento, un cuadro después, imperceptible. */
    if (sobre) requestAnimationFrame(() => sobre.focus({ preventScroll: true }));

    /* ⚡ ACÁ ARRANCA A BAJARSE EL "PACK DE LA ESCENA" (2026-08-30). El sobre
       ya pintó, así que ya no compite por ancho de banda contra las
       tipografías críticas. requestIdleCallback con un tope corto: si el
       navegador está libre, arranca ya mismo; si está ocupado terminando
       de asentar el primer pintado, no espera más de 300 ms. Ver
       iniciarInyeccionDeLaEscena() en 02-utilidades.js para el porqué
       completo y el orden exacto (que no cambió). */
    if (typeof iniciarInyeccionDeLaEscena === 'function') {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(iniciarInyeccionDeLaEscena, { timeout: 300 });
      } else {
        setTimeout(iniciarInyeccionDeLaEscena, 0);
      }
    }
  }


  /* ─── 3B. EL GESTO DE ROMPER EL SELLO (tacto y sonido) ──────────────
     Al abrir, dos detalles chiquititos que se sienten caros: una
     vibración mínima en el celular, como el "crac" del lacre al ceder, y
     un tañido suave, como una campanita de cristal. Los dos son
     opcionales: si el dispositivo no puede, no pasa nada.
     ---------------------------------------------------------------- */

  /**
   * Una vibración breve, como el quiebre del sello. Solo donde el
   * navegador la soporta (sobre todo celulares).
   * @returns {void}
   */
  function vibrarComoElSello() {
    if (navigator.vibrate) {
      // Un golpe seco y un temblorcito que se apaga: el lacre cediendo.
      navigator.vibrate([16, 45, 26]);
    }
  }

  /**
   * Un tañido corto y cristalino, sintetizado en el momento (no hay
   * ningún archivo de sonido). Son unas pocas ondas puras afinadas en
   * acorde, con un golpe de entrada y una cola larga que se apaga sola.
   * @returns {void}
   */
  function tanidoDelSello() {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;

    try {
      const ctx = new Contexto();
      const maestro = ctx.createGain();
      maestro.gain.value = 0.0001;
      maestro.connect(ctx.destination);

      /* Un acorde tenue: la fundamental y dos armónicos. Las frecuencias
         están en proporción de campana (1 : 2 : 3), que es lo que suena
         "cristalino" y no "electrónico". */
      const ahora = ctx.currentTime;
      [880, 1760, 2640].forEach((frecuencia, i) => {
        const osc = ctx.createOscillator();
        const gan = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frecuencia;

        /* Cada armónico más agudo entra más flojo y se apaga más rápido,
           igual que en una campana real. */
        const volumen = 0.5 / (i + 1);
        const cola = 2.6 - i * 0.6;

        gan.gain.setValueAtTime(0.0001, ahora);
        gan.gain.exponentialRampToValueAtTime(volumen, ahora + 0.012);
        gan.gain.exponentialRampToValueAtTime(0.0001, ahora + cola);

        osc.connect(gan);
        gan.connect(maestro);
        osc.start(ahora);
        osc.stop(ahora + cola + 0.1);
      });

      // El maestro sube apenas: es un detalle, no un timbrazo.
      maestro.gain.setValueAtTime(0.0001, ahora);
      maestro.gain.exponentialRampToValueAtTime(0.5, ahora + 0.02);
      maestro.gain.exponentialRampToValueAtTime(0.0001, ahora + 3);

      // Cerrar el contexto cuando terminó, para no dejarlo abierto.
      setTimeout(() => ctx.close(), 3400);
    } catch (error) {
      /* Si algo falla, el sobre se abre igual, sin sonido. */
    }
  }


  /* ─── 4. ABRIR EL SOBRE ────────────────────────────────────────── */

  /**
   * Rompe el sello, abre la solapa y revela la invitación.
   *
   * Los tiempos (900 y 1500 ms) están calculados para que coincidan con
   * las animaciones definidas en estilos/03-sobre-de-apertura.css. Si
   * cambiás la duración allá, ajustá estos números también.
   *
   * @returns {Promise<void>}
   */
  async function abrirElSobre() {
    if (yaSeEstaAbriendo) return;
    yaSeEstaAbriendo = true;

    sobre.classList.add('se-esta-abriendo');

    // El "crac" del lacre: un toque de vibración y un tañido cristalino.
    vibrarComoElSello();
    tanidoDelSello();

    /* "Encender las luces": el velo cálido de revelado inunda la página y
       se asienta. Los haces de luz y la música (que entra como eco
       lejano) se enganchan al mismo evento de abajo. Ver el velo en
       estilos/12-haces-de-luz.css. */
    document.body.classList.add('revelando');

    /* ⚡ Y SE APAGA CUANDO TERMINA. La animación del velo dura 2,9 s; antes
       la clase no se quitaba nunca, así que el velo se quedaba en el árbol
       de por vida: una capa de MEZCLA del tamaño de toda la pantalla, con
       opacidad 0, sin dibujar nada y costando igual. Y una capa de mezcla no
       es cualquier capa: obliga al compositor a leer de vuelta el fondo y le
       impide fusionar nada de lo que hay debajo.

       Se le da un respiro extra sobre los 2,9 s por si el equipo va lento y
       la animación termina un poco más tarde. */
    setTimeout(() => document.body.classList.remove('revelando'), 3400);

    /*
       Este es el momento clave: estamos dentro de un clic de la persona,
       así que el navegador SÍ nos va a dejar reproducir la música.
       Avisamos con un evento y el reproductor se encarga.
    */
    document.dispatchEvent(new CustomEvent('sobre-abierto'));

    // Esperamos a que termine la animación de apertura…
    await esperar(1500);

    // …y recién ahí sacamos la capa y devolvemos el scroll.
    sobre.classList.add('oculto');
    document.body.classList.remove('sobre-visible');
    document.documentElement.classList.remove('sobre-visible');

    // Avisamos que la invitación ya es visible, por si algún otro archivo
    // quiere empezar sus animaciones justo en este momento.
    document.dispatchEvent(new CustomEvent('invitacion-visible'));
  }

  // El sobre entero es el botón: se abre haciendo clic en cualquier parte.
  if (ilustracion) ilustracion.addEventListener('click', abrirElSobre);

  // Y también con el teclado (barra espaciadora o Enter), para quien no
  // usa mouse.
  sobre.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirElSobre();
    }
  });

})();
