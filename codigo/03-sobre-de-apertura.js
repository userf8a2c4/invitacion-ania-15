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

  // Si por algún motivo el sobre no existe en el HTML, no hacemos nada
  // (así el resto de la web sigue funcionando igual).
  if (!sobre) return;

  document.body.classList.add('sobre-visible');

  /** Evita que el sobre se abra dos veces si alguien hace doble clic. */
  let yaSeEstaAbriendo = false;


  /* ─── 2. PRECARGA ──────────────────────────────────────────────────
     Esperamos a que estén listas las tipografías y la imagen de fondo.
     Pero con un límite de tiempo: si alguna tarda demasiado (internet
     lento), seguimos igual. Es preferible mostrar el sobre que dejar a
     la persona mirando una pantalla vacía.
     ---------------------------------------------------------------- */

  /**
   * Espera a que las tipografías estén descargadas.
   * @returns {Promise} Se cumple cuando las fuentes están listas.
   */
  function esperarTipografias() {
    return document.fonts ? document.fonts.ready : Promise.resolve();
  }

  /**
   * Espera a que la imagen de fondo termine de descargarse.
   * @returns {Promise} Se cumple al cargar (o al fallar, para no trabarse).
   */
  function esperarImagenDeFondo() {
    return new Promise(resolve => {
      const imagen = new Image();
      imagen.onload = resolve;
      imagen.onerror = resolve;      // si falla, seguimos igual
      imagen.src = 'recursos/fondo-ornamental.svg';
    });
  }

  /* ⚠️ ANTES había acá una esperarLaCancion() que le ponía src al <audio>
     y esperaba el evento "canplaythrough" (buffer suficiente) antes de
     mostrar el sobre, con un tope de 5000ms. Eso frenaba la revelación de
     TODA la página hasta 5 segundos en cada visita — y Lighthouse lo medía
     como un LCP de 6 segundos. Se quita por dos motivos:
       1) No compraba nada: el navegador bloquea el autoplay de audio sin
          gesto del usuario de todas formas, así que precargar el audio no
          adelantaba el sonido, solo tapaba el contenido.
       2) El primer clic de la persona ya dispara la música por su cuenta
          (ver el listener en codigo/10-reproductor-de-musica.js), así que
          el audio sigue sonando igual sin haber bloqueado nada acá.
     El <audio> ahora usa preload="none" (ver index.html) y su src lo pone
     codigo/04-invitado-personalizado.js cuando corresponda, sin competir
     por ancho de banda con lo que sí hace falta para mostrar la página. */

  /**
   * Corta la espera pase lo que pase después de cierto tiempo.
   * @param {number} milisegundos - Cuánto es "demasiado".
   * @returns {Promise} Se cumple al agotarse el tiempo.
   */
  function tiempoMaximoDeEspera(milisegundos) {
    return new Promise(resolve => setTimeout(resolve, milisegundos));
  }

  /*
     Promise.race("carrera de promesas") devuelve la primera que termine.
     Acá compiten: "que carguen tipografías e imagen de fondo" contra "que
     pase 1.2 segundos". Gana la que ocurra antes, y en cualquier caso
     mostramos el sobre — preferible mostrarlo que dejar pantalla vacía. */
  Promise.race([
    Promise.all([esperarTipografias(), esperarImagenDeFondo()]),
    tiempoMaximoDeEspera(1200),
  ]).then(mostrarElSobre);


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
       tecla Enter la escucha el contenedor entero. */
    if (sobre) sobre.focus({ preventScroll: true });
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
