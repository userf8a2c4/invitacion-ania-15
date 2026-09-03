/* ══════════════════════════════════════════════════════════════════════
   10 · REPRODUCTOR DE MÚSICA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Controla la canción de fondo: play, pausa, volumen, silencio, y la
   píldora que despliega el círculo de música de la columna de controles.

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
     4. Abrir y cerrar la píldora
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElReproductorDeMusica() {

  /* ─── 1. ELEMENTOS Y ESTADO INICIAL ────────────────────────────── */
  const panel            = buscar('#reproductor');
  const contenedor       = buscar('#musica-flotante');
  const audioDeFondo     = buscar('#audio-de-fondo');
  const botonMusica      = buscar('#boton-musica');
  const botonPlay        = buscar('#boton-play');
  const botonSilencio    = buscar('#boton-silencio');
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
    /* ⚡ EL CONTEXTO DE WEBAUDIO TAMBIÉN HAY QUE DESPERTARLO ACÁ, NO SOLO
       LA PRIMERA VEZ. Antes esto solo pasaba dentro de entrarComoEcoLejano(),
       que se llama una única vez (al abrir el sobre). El problema: cuando
       el teléfono apaga la pantalla por inactividad, el navegador suspende
       el AudioContext (además de pausar el <audio>). Al desbloquear, este
       reproducirLaCancion() volvía a llamar audioDeFondo.play() y el
       elemento SE PONÍA "sonando" —el ícono cambiaba, currentTime avanzaba—
       pero como el audio sale enrutado POR el contexto (fuente → filtro →
       destino, ver prepararElGrafoDeAudio) y ese contexto seguía suspendido,
       no salía ningún sonido: la música quedaba "trabada", sonando en el
       papel pero muda. Despertarlo acá, en cada intento de reproducir, lo
       arregla para siempre sin agregar ningún bucle ni reintento. */
    if (grafoDeAudio && grafoDeAudio.contexto.state === 'suspended') {
      grafoDeAudio.contexto.resume();
    }

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

  /* ─── LA INTENCIÓN MANDA ────────────────────────────────────────────
   *
   * `quiereMusica` es lo que la PERSONA quiere, no lo que el elemento
   * <audio> está haciendo en este instante. Son dos cosas distintas y
   * confundirlas es lo que producía el "disco rallado":
   *
   *   · El navegador pausa solo cuando se bloquea la pantalla. El audio
   *     queda `paused` sin que nadie lo haya pedido.
   *   · La red de seguridad del clic miraba `paused` para decidir si
   *     reproducir. Entonces alguien pausaba a propósito, tocaba
   *     cualquier lado de la página, y la música volvía sola: desde
   *     afuera, el botón de pausa "no funcionaba".
   *   · Al bloquear el teléfono el orden de los eventos no está
   *     garantizado: el navegador puede pausar ANTES de avisar que la
   *     página se ocultó. Leyendo `paused` en ese momento se anotaba
   *     "no estaba sonando" y al desbloquear no se retomaba nada. De ahí
   *     el "a veces vuelve, a veces no".
   *
   * Con una sola variable de intención, las tres cosas se resuelven a la
   * vez: se pausa y se retoma alrededor del bloqueo SOLO si la persona
   * quería música, y si la pausó ella, nada la revive salvo que la pida
   * de nuevo.
   */
  let quiereMusica = false;

  /**
   * Alterna entre reproducir y pausar. ES EL ÚNICO LUGAR donde cambia
   * la intención de la persona: todo lo demás —el bloqueo de pantalla,
   * volver a la pestaña, la red del clic— la lee, nunca la escribe.
   *
   * @returns {void}
   */
  function alternarPlayPausa() {
    if (audioDeFondo.paused) {
      quiereMusica = true;
      reproducirLaCancion();
    } else {
      quiereMusica = false;
      audioDeFondo.pause();
    }
  }

  /**
   * Actualiza el icono del botón según si está sonando o no.
   *
   * La clase 'sonando' va en el CONTENEDOR, no en la píldora: es lo que
   * hace latir al círculo. Como la píldora está cerrada casi siempre, el
   * círculo tiene que poder decir por su cuenta si hay música, sin que
   * haga falta abrir nada para enterarse.
   *
   * @returns {void}
   */
  function actualizarBotonPlay() {
    const estaSonando = !audioDeFondo.paused;

    if (contenedor) contenedor.classList.toggle('sonando', estaSonando);

    if (!botonPlay) return;
    botonPlay.textContent = estaSonando ? '❚❚' : '▶';
    botonPlay.setAttribute('aria-label', estaSonando ? 'Pausar la música' : 'Reproducir la música');
  }

  audioDeFondo.addEventListener('play',  actualizarBotonPlay);
  audioDeFondo.addEventListener('pause', actualizarBotonPlay);
  if (botonPlay) botonPlay.addEventListener('click', alternarPlayPausa);

  /* El momento clave: cuando se abre el sobre, el navegador ya nos deja
     reproducir sonido. Esta primera vez entra como eco lejano, junto con
     el revelado por luz. */
  /* ⚡ escucharEventoQueQuizasYaPaso() Y NO addEventListener DIRECTO
     (2026-09-01): este script se inyecta DESPUÉS del clic, encadenado
     detrás de los demás (ver iniciarInyeccionDeLaEscena en
     02-utilidades.js). 'sobre-abierto' se dispara EN el clic, así que en
     un equipo lento este script puede terminar de cargar y registrar su
     escucha cuando el evento YA pasó — y como es de una sola vez, se
     perdía para siempre. Confirmado en la práctica: en un equipo real de
     gama baja la música no sonaba hasta que la persona hacía otro clic
     al azar más de un minuto después (por la red de seguridad de abajo,
     no por este evento). Esta función se entera igual, tarde o no. */
  escucharEventoQueQuizasYaPaso('sobre-abierto', () => {
    // Abrir el sobre ES pedir la música: a partir de acá hay intención,
    // y todo lo demás la respeta.
    quiereMusica = true;
    reproducirLaCancion(true);
  });

  /* Red de seguridad: si la persona QUIERE música y por lo que sea no
     está sonando —el navegador bloqueó el autoplay, el intento de
     retomar tras desbloquear no prendió—, cualquier toque la reintenta.

     ⚡ AHORA MIRA LA INTENCIÓN, NO `paused` (2026-09-03). Antes bastaba
     con que el audio estuviera pausado para revivirlo en el próximo
     clic en cualquier parte de la página. O sea: pausabas a propósito,
     tocabas cualquier cosa, y la música volvía. Desde afuera se veía
     exactamente como que el botón de pausa no funcionaba — el "disco
     rallado". Se intentó tapar con una ventana de 600 ms de gracia
     después de la pausa manual, pero eso solo achicaba la ventana del
     problema: pasado medio segundo, volvía a pasar.

     Con la intención de por medio no hace falta ninguna ventana: si la
     pausó ella, no revive con nada que no sea el botón. */
  document.addEventListener('click', evento => {
    if (!quiereMusica) return;

    // El clic en el propio botón ya lo maneja alternarPlayPausa: sin
    // este guard, burbujearía hasta acá y volvería a reproducir en el
    // mismo clic con el que se acaba de pausar.
    if (panel.contains(evento.target)) return;
    if (botonMusica && botonMusica.contains(evento.target)) return;

    if (audioDeFondo.paused) reproducirLaCancion();
  });


  /* ─── LA PANTALLA SE BLOQUEA, O LA PÁGINA SE VA A SEGUNDO PLANO ────
   *
   * QUÉ PASABA
   * El navegador pausa el <audio> por su cuenta al apagarse la
   * pantalla, y suspende el AudioContext. Al volver, esto intentaba
   * retomar solo si `sonabaAntesDeOcultarse` era verdadero — un valor
   * que se leía de `audioDeFondo.paused` EN el visibilitychange. Pero
   * el orden de esos dos hechos no está garantizado: en varios
   * teléfonos el navegador pausa ANTES de avisar que la página se
   * ocultó, y entonces se anotaba "no estaba sonando" y al desbloquear
   * no volvía nada. De ahí que a veces volviera y a veces no, sin
   * ningún patrón visible.
   *
   * QUÉ HACE AHORA
   * No se adivina nada: se mira `quiereMusica`, que solo cambia cuando
   * la persona toca el botón. Al irse, se pausa (nosotros, explícito,
   * sin depender de que el navegador lo haga); al volver, se retoma. Y
   * como el <audio> conserva su posición, sigue donde se quedó — nunca
   * arranca de nuevo.
   *
   * `pagehide`/`pageshow` van además de `visibilitychange` porque iOS
   * usa la caché de ida y vuelta: al volver con el gesto de "atrás", la
   * página se restaura entera sin disparar visibilitychange, y sin esto
   * quedaba muda.
   */
  function alIrseLaPagina() {
    if (quiereMusica && !audioDeFondo.paused) audioDeFondo.pause();
  }

  function alVolverLaPagina() {
    // reproducirLaCancion() ya despierta el AudioContext suspendido: sin
    // eso el <audio> se pone "sonando" pero no sale sonido, porque va
    // enrutado por el grafo (ver la nota en esa función).
    if (quiereMusica && audioDeFondo.paused) reproducirLaCancion();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) alIrseLaPagina();
    else alVolverLaPagina();
  });

  window.addEventListener('pagehide', alIrseLaPagina);
  window.addEventListener('pageshow', alVolverLaPagina);


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


  /* ─── 4. ABRIR Y CERRAR LA PÍLDORA ─────────────────────────────────
     El círculo es el único interruptor. Antes había además una flechita
     ▼ dentro del panel para plegarlo: dos formas de hacer lo mismo, y
     una de ellas escondida adentro de lo que quería plegar.

     La columna de controles NO se mueve nunca de lugar. El espacio que
     necesita ya está reservado por el relleno inferior del pie de
     página, definido en estilos/02-marco-victoriano.css con la variable
     --alto-reproductor. Si algún día la columna crece, hay que
     actualizar esa variable.
     ---------------------------------------------------------------- */

  let pildoraAbierta = false;

  /**
   * Abre o cierra la píldora de la música.
   * @param {boolean} abrir
   * @returns {void}
   */
  function alternarPildora(abrir) {
    pildoraAbierta = abrir;
    panel.classList.toggle('abierto', abrir);
    panel.setAttribute('aria-hidden', String(!abrir));

    if (!botonMusica) return;
    botonMusica.setAttribute('aria-expanded', String(abrir));
    botonMusica.setAttribute('aria-label', abrir ? 'Cerrar la música' : 'Música de la fiesta');
  }

  if (botonMusica) {
    botonMusica.addEventListener('click', () => alternarPildora(!pildoraAbierta));
  }

  // Escape cierra, igual que en el panel de preguntas.
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && pildoraAbierta) alternarPildora(false);
  });

  /* Un clic en cualquier otro lado también cierra. Se pregunta por la
     píldora Y por el círculo: si no, el clic de abrir cerraría en el
     acto. Y se deja pasar el arrastre del volumen, que termina soltando
     el dedo fuera de la píldora más veces de las que uno creería. */
  document.addEventListener('click', evento => {
    if (!pildoraAbierta) return;
    if (panel.contains(evento.target)) return;
    if (botonMusica && botonMusica.contains(evento.target)) return;
    alternarPildora(false);
  });

})();
