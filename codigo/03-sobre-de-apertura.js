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
     2. Precarga de tipografías, fondo y música
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
     Esperamos a que estén listas las tres cosas pesadas de la web. Pero
     con un límite de tiempo: si alguna tarda demasiado (internet lento),
     seguimos igual. Es preferible mostrar el sobre que dejar a la
     persona mirando una pantalla vacía.
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

  /**
   * Espera a que haya suficiente canción descargada como para sonar sin
   * cortes.
   * @returns {Promise} Se cumple cuando el audio está listo (o si falla).
   */
  function esperarLaCancion() {
    return new Promise(resolve => {
      const audio = buscar('#audio-de-fondo');
      if (!audio) return resolve();

      /* Le damos la dirección del archivo acá y no en 04, para que el
         navegador empiece a descargar la canción cuanto antes: mientras
         la persona mira el sobre, la música ya se está bajando. */
      if (!audio.getAttribute('src')) {
        audio.setAttribute('src', CONFIGURACION.musica.archivo);
      }

      if (audio.readyState >= 3) return resolve();   // ya estaba lista
      audio.addEventListener('canplaythrough', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
    });
  }

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
     Acá compiten: "que cargue todo" contra "que pasen 5 segundos".
     Gana la que ocurra antes, y en cualquier caso mostramos el sobre.
  */
  Promise.race([
    Promise.all([esperarTipografias(), esperarImagenDeFondo(), esperarLaCancion()]),
    tiempoMaximoDeEspera(5000),
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
