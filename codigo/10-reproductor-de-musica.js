/* ══════════════════════════════════════════════════════════════════════
   10 · REPRODUCTOR DE MÚSICA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Controla la canción de fondo: play, pausa, volumen, silencio, y el
   pliegue automático cuando la persona llega al final de la página para
   no taparle el texto del pie.

   POR QUÉ LA MÚSICA NO ARRANCA SOLA (y cómo lo resolvemos)
   Hace años, las webs con música automática eran una pesadilla, así que
   TODOS los navegadores lo prohibieron: solo dejan reproducir sonido
   después de que la persona interactúe con la página.

   Nuestra solución es elegante: el clic para abrir el sobre de la
   entrada cuenta como interacción. El archivo 03-sobre-de-apertura.js
   avisa con el evento 'sobre-abierto' y acá lo escuchamos. Por las
   dudas, si igual falla, cualquier clic posterior también la arranca.

   QUÉ ES EL FUNDIDO DE ENTRADA
   Empezar la música de golpe a volumen alto asusta. En vez de eso
   arrancamos en 0 y subimos de a poquito hasta el volumen elegido, en
   milisegundos. Se siente muchísimo más caro.

   ÍNDICE
     1. Elementos y estado inicial
     2. Play, pausa y fundido de entrada
     3. Volumen y silencio
     4. Plegar y desplegar el panel
     5. Plegado automático al llegar al pie
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElReproductorDeMusica() {

  /* ─── 1. ELEMENTOS Y ESTADO INICIAL ────────────────────────────── */
  const panel            = buscar('#reproductor');
  const audioDeFondo     = buscar('#audio-de-fondo');
  const botonPlay        = buscar('#boton-play');
  const botonSilencio    = buscar('#boton-silencio');
  const botonMinimizar   = buscar('#boton-minimizar-reproductor');
  const deslizadorVolumen = buscar('#deslizador-de-volumen');

  if (!panel || !audioDeFondo) return;

  /* Volumen: primero miramos si la persona ya eligió uno en una visita
     anterior; si no, usamos el de la configuración. */
  let volumenElegido = leerDeMemoria('volumen', CONFIGURACION.musica.volumenInicial);
  volumenElegido = limitar(Number(volumenElegido), 0, 1);

  /** Guarda el volumen anterior para poder restaurarlo al des-silenciar. */
  let volumenAntesDelSilencio = volumenElegido;

  audioDeFondo.volume = 0;   // arranca en cero por el fundido de entrada


  /* ─── 2. PLAY, PAUSA Y FUNDIDO DE ENTRADA ──────────────────────── */

  /**
   * Sube el volumen de a poco desde donde esté hasta el volumen elegido.
   *
   * Funciona con un temporizador que se ejecuta 25 veces por segundo y
   * en cada paso suma una fracción. Cuando llega, se apaga solo.
   *
   * @param {number} [duracionEnMs=2200] - Cuánto tarda el fundido.
   * @returns {void}
   */
  function subirElVolumenDeAPoco(duracionEnMs = 2200) {
    const pasosTotales = Math.round(duracionEnMs / 40);
    const cuantoSubePorPaso = (volumenElegido - audioDeFondo.volume) / pasosTotales;
    let pasosDados = 0;

    const temporizador = setInterval(() => {
      pasosDados++;
      audioDeFondo.volume = limitar(audioDeFondo.volume + cuantoSubePorPaso, 0, 1);

      if (pasosDados >= pasosTotales) {
        audioDeFondo.volume = volumenElegido;
        clearInterval(temporizador);
      }
    }, 40);
  }

  /* ── EL ECO LEJANO ──────────────────────────────────────────────────
     Cuando la música arranca junto con la apertura del sobre, no entra de
     golpe a su sonido pleno: entra COMO UN ECO LEJANO —apagada, como si
     sonara en otra habitación— y en un par de segundos se abre hasta
     sentirse "acá con nosotros", al mismo tiempo que la luz revela la web.

     El truco es un filtro pasabajos: al principio deja pasar solo los
     graves (por eso suena lejana y sorda) y después se abre del todo. Se
     hace con WebAudio, enrutando el audio por: fuente → filtro → destino.

     Ese enrutado NO pelea con el control de volumen: el volumen sigue
     viviendo en audioDeFondo.volume (antes del grafo), así que el
     deslizador y el silencio funcionan igual. Y la fuente de un elemento
     de audio solo se puede crear UNA vez, por eso se guarda y se reusa. */
  let grafoDeAudio = null;

  /**
   * Arma (una sola vez) el grafo de WebAudio y devuelve el filtro, para
   * poder abrirlo. Si el navegador no soporta WebAudio, devuelve null y la
   * música suena igual, sin el efecto.
   *
   * @returns {{contexto: AudioContext, filtro: BiquadFilterNode}|null}
   */
  function prepararElGrafoDeAudio() {
    if (grafoDeAudio) return grafoDeAudio;

    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;

    try {
      const contexto = new Contexto();
      const fuente = contexto.createMediaElementSource(audioDeFondo);
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 20000;   // abierto por defecto (sonido pleno)
      filtro.Q.value = 0.7;

      fuente.connect(filtro);
      filtro.connect(contexto.destination);

      grafoDeAudio = { contexto, filtro };
      return grafoDeAudio;
    } catch (error) {
      /* Algún navegador viejo o un segundo intento de crear la fuente.
         No es grave: la música suena sin el efecto de eco. */
      console.warn('No se pudo preparar el eco de la música:', error);
      return null;
    }
  }

  /**
   * Hace entrar la música como un eco lejano que se acerca: arranca el
   * filtro casi cerrado y lo abre despacio hasta el sonido pleno.
   * @returns {void}
   */
  function entrarComoEcoLejano() {
    const grafo = prepararElGrafoDeAudio();
    if (!grafo) return;

    const { contexto, filtro } = grafo;
    if (contexto.state === 'suspended') contexto.resume();

    const ahora = contexto.currentTime;
    // De sordo y lejano (500 Hz) a pleno (20 kHz) en 3,2 segundos.
    filtro.frequency.cancelScheduledValues(ahora);
    filtro.frequency.setValueAtTime(500, ahora);
    filtro.frequency.exponentialRampToValueAtTime(20000, ahora + 3.2);
  }

  /**
   * Intenta reproducir la canción.
   *
   * .play() devuelve una "promesa" que falla si el navegador lo bloquea.
   * Por eso lleva .catch(): sin él, aparecería un error rojo en la
   * consola cada vez que el navegador nos frena, que es algo esperable.
   *
   * @param {boolean} [conEco=false] - Si entra como eco lejano (solo la
   *        primera vez, al abrir el sobre).
   * @returns {void}
   */
  function reproducirLaCancion(conEco = false) {
    audioDeFondo.play()
      .then(() => {
        subirElVolumenDeAPoco();
        if (conEco && !prefiereMenosMovimiento()) entrarComoEcoLejano();
      })
      .catch(() => {
        /* El navegador la bloqueó. No es un error nuestro: simplemente
           queda esperando a que la persona apriete play. */
      });
  }

  /**
   * Alterna entre reproducir y pausar.
   * @returns {void}
   */
  function alternarPlayPausa() {
    if (audioDeFondo.paused) {
      reproducirLaCancion();
    } else {
      audioDeFondo.pause();
    }
  }

  /**
   * Actualiza el icono del botón según si está sonando o no.
   * @returns {void}
   */
  function actualizarBotonPlay() {
    if (!botonPlay) return;
    const estaSonando = !audioDeFondo.paused;
    botonPlay.textContent = estaSonando ? '❚❚' : '▶';
    botonPlay.setAttribute('aria-label', estaSonando ? 'Pausar la música' : 'Reproducir la música');
    panel.classList.toggle('sonando', estaSonando);
  }

  audioDeFondo.addEventListener('play',  actualizarBotonPlay);
  audioDeFondo.addEventListener('pause', actualizarBotonPlay);
  if (botonPlay) botonPlay.addEventListener('click', alternarPlayPausa);

  /* El momento clave: cuando se abre el sobre, el navegador ya nos deja
     reproducir sonido. Esta primera vez entra como eco lejano, junto con
     el revelado por luz. */
  document.addEventListener('sobre-abierto', () => reproducirLaCancion(true), { once: true });

  /* Red de seguridad: si por lo que sea la música no arrancó, el primer
     clic en cualquier lado la larga. { once: true } hace que este
     escuchador se borre solo después de usarse una vez. */
  document.addEventListener('click', function intentarUnaVezMas() {
    if (audioDeFondo.paused) reproducirLaCancion();
  }, { once: true });


  /* ─── 3. VOLUMEN Y SILENCIO ────────────────────────────────────── */

  /**
   * Aplica un volumen nuevo, pinta la barra y lo recuerda para la
   * próxima visita.
   *
   * @param {number} nuevoVolumen - De 0 (mudo) a 1 (máximo).
   * @param {boolean} [recordarlo=true] - Si hay que guardarlo en memoria.
   * @returns {void}
   *
   * @example
   *   aplicarVolumen(0.5);   // lo pone a la mitad y lo recuerda
   */
  function aplicarVolumen(nuevoVolumen, recordarlo = true) {
    volumenElegido = limitar(nuevoVolumen, 0, 1);
    audioDeFondo.volume = volumenElegido;
    audioDeFondo.muted = volumenElegido === 0;

    if (deslizadorVolumen) {
      deslizadorVolumen.value = Math.round(volumenElegido * 100);
      /* Esta variable CSS es la que pinta de dorado la parte ya
         "llena" de la barra (ver 09-reproductor.css). */
      deslizadorVolumen.style.setProperty('--progreso', (volumenElegido * 100) + '%');
    }

    if (botonSilencio) {
      const estaEnSilencio = volumenElegido === 0;

      /* Se cambia el dibujo del ícono, no un emoji. Basta con apuntar el
         <use> a otra pieza de la biblioteca: el altavoz normal o el
         tachado. Los emoji quedaban fuera de tono y además cada sistema
         operativo los dibuja distinto. */
      const usoDelIcono = botonSilencio.querySelector('use');
      if (usoDelIcono) {
        usoDelIcono.setAttribute('href', estaEnSilencio ? '#icono-silencio' : '#icono-sonido');
      }

      botonSilencio.setAttribute('aria-label', estaEnSilencio ? 'Quitar el silencio' : 'Silenciar');
    }

    if (recordarlo) guardarEnMemoria('volumen', volumenElegido);
  }

  if (deslizadorVolumen) {
    deslizadorVolumen.addEventListener('input', evento => {
      // El deslizador da un número de 0 a 100; el audio quiere de 0 a 1.
      aplicarVolumen(Number(evento.target.value) / 100);
    });
  }

  if (botonSilencio) {
    botonSilencio.addEventListener('click', () => {
      if (volumenElegido > 0) {
        volumenAntesDelSilencio = volumenElegido;
        aplicarVolumen(0);
      } else {
        // Si estaba en silencio desde el principio, volvemos a un valor
        // razonable en lugar de a cero.
        aplicarVolumen(volumenAntesDelSilencio || CONFIGURACION.musica.volumenInicial);
      }
    });
  }

  // Dibuja el estado inicial de la barra sin volver a guardarlo.
  aplicarVolumen(volumenElegido, false);
  audioDeFondo.volume = 0;   // el fundido se encarga de subirlo
  actualizarBotonPlay();


  /* ─── 4. PLEGAR Y DESPLEGAR EL PANEL ───────────────────────────── */
  if (botonMinimizar) {
    botonMinimizar.addEventListener('click', () => {
      const quedaMinimizado = panel.classList.toggle('minimizado');
      botonMinimizar.textContent = quedaMinimizado ? '▲' : '▼';
      botonMinimizar.setAttribute(
        'aria-label',
        quedaMinimizado ? 'Mostrar el reproductor' : 'Minimizar el reproductor'
      );
    });
  }


  /* ─── 5. EL PANEL NO SE MUEVE ──────────────────────────────────────
     Antes, al llegar al pie de página, el reproductor se deslizaba hacia
     abajo para no tapar la firma. Pero al hacerlo se montaba sobre el
     marco victoriano, y quedaba peor.

     Ahora se queda SIEMPRE en el mismo lugar. El espacio que necesita ya
     está reservado por el relleno inferior del pie de página, definido en
     estilos/02-marco-victoriano.css con la variable --alto-reproductor.
     Si algún día el panel crece, hay que actualizar esa variable.
     ---------------------------------------------------------------- */

})();
