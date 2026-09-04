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
  /** El temporizador de la subida en curso, para poder cancelarlo. */
  let temporizadorDeVolumen = null;

  function subirElVolumenDeAPoco(duracionEnMs = 2200) {
    /* ⚠️ SE CANCELA LA SUBIDA ANTERIOR (2026-09-04). Cada llamada
       arrancaba un setInterval nuevo sin apagar el de antes, y el
       tamaño del paso se calcula UNA vez con el volumen de ese
       momento. Con dos corriendo a la vez, cada una empuja hacia su
       propio destino y el volumen queda donde ninguna quería.

       Antes casi no pasaba porque reproducirLaCancion() se llamaba
       poco. Ahora se llama al volver del bloqueo, en la red del clic y
       desde los controles del sistema — o sea que se volvió probable
       por los arreglos de la ronda anterior. */
    if (temporizadorDeVolumen) clearInterval(temporizadorDeVolumen);

    const pasosTotales = Math.round(duracionEnMs / 40);
    const cuantoSubePorPaso = (volumenElegido - audioDeFondo.volume) / pasosTotales;
    let pasosDados = 0;

    temporizadorDeVolumen = setInterval(() => {
      pasosDados++;
      audioDeFondo.volume = limitar(audioDeFondo.volume + cuantoSubePorPaso, 0, 1);

      if (pasosDados >= pasosTotales) {
        audioDeFondo.volume = volumenElegido;
        clearInterval(temporizadorDeVolumen);
        temporizadorDeVolumen = null;
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
  /* ─── BITÁCORA DE DIAGNÓSTICO ─────────────────────────────

     POR QUÉ EXISTE (2026-09-04)
     Este reproductor falla de forma ALEATORIA al desbloquear el
     teléfono, y ya van dos intentos de arreglarlo a ciegas. El
     problema es que el síntoma (se queda en pausa) puede venir de
     cuatro caminos distintos y desde acá no hay forma de saber cuál
     fue: pasa en un teléfono, con la pantalla apagada, sin nadie
     mirando la consola.

     Esto anota los últimos treinta sucesos con el estado en cada uno.
     Si vuelve a fallar, `__musica()` en la consola dice exactamente en
     qué paso se torció, en vez de adivinar por tercera vez.

     No decide nada: solo mira. Se saca cuando el problema esté
     cerrado. */
  const BITACORA = [];

  /**
   * Anota un suceso con el estado del reproductor en ese instante.
   *
   * @param {string} que
   * @param {*} [detalle]
   * @returns {void}
   */
  function anotar(que, detalle) {
    BITACORA.push({
      hora: new Date().toTimeString().slice(0, 8),
      que: que,
      detalle: detalle === undefined ? '' : String(detalle),
      contexto: grafoDeAudio ? grafoDeAudio.contexto.state : 'sin grafo',
      pausado: audioDeFondo.paused,
      quiere: quiereMusica,
      volumen: Math.round(audioDeFondo.volume * 100) / 100,
    });
    if (BITACORA.length > 30) BITACORA.shift();
  }

  // Desde la consola, cuando la hay.
  window.__musica = function () {
    if (console.table) console.table(BITACORA);
    return BITACORA;
  };

  /**
   * La bitácora como texto, una línea por suceso.
   *
   * @returns {string}
   */
  function bitacoraComoTexto() {
    if (!BITACORA.length) return 'Todavía no pasó nada.';

    return BITACORA.map(function (s) {
      return s.hora +
             ' | ' + s.que +
             (s.detalle ? ' (' + s.detalle + ')' : '') +
             ' | contexto=' + s.contexto +
             ' | pausado=' + s.pausado +
             ' | quiere=' + s.quiere +
             ' | vol=' + s.volumen;
    }).join('\n');
  }

  /* ─── VER EL REGISTRO SIN CONSOLA ─────────────────────────────

     El fallo del reproductor solo pasa EN EL TELÉFONO, al bloquear y
     desbloquear — y en el navegador de un teléfono no hay consola donde
     escribir `__musica()`. O sea que la bitácora, tal como estaba, no
     servía para el único caso en que hace falta.

     Esto pone un botón chico en la pantalla que la muestra en un cuadro
     de texto, listo para copiar y pegar en un mensaje.

     SOLO EN PBE. Se mira el host, igual que reiniciar-prueba.php: en
     aniaxv.com este bloque no existe. Es código de diagnóstico y se saca
     cuando el problema esté cerrado. */
  if (location.hostname.indexOf('pbe.') === 0) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = '♪ registro';
    boton.setAttribute('aria-label', 'Ver el registro del reproductor');
    boton.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:2147483000;' +
      'font:12px/1 system-ui,sans-serif;padding:8px 10px;min-height:34px;' +
      'border:1px solid rgba(255,255,255,.35);border-radius:6px;' +
      'background:rgba(0,0,0,.65);color:#fff;opacity:.55';

    boton.addEventListener('click', function () {
      const capa = document.createElement('div');
      capa.style.cssText =
        'position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.92);' +
        'display:flex;flex-direction:column;gap:8px;padding:12px;' +
        'font:13px/1.4 system-ui,sans-serif;color:#fff';

      const area = document.createElement('textarea');
      area.readOnly = true;
      area.value = bitacoraComoTexto();
      area.style.cssText =
        'flex:1;width:100%;background:#111;color:#eee;border:1px solid #444;' +
        'border-radius:6px;padding:8px;font:11px/1.5 ui-monospace,monospace;' +
        'white-space:pre;overflow:auto';

      const fila = document.createElement('div');
      fila.style.cssText = 'display:flex;gap:8px';

      const copiar = document.createElement('button');
      copiar.type = 'button';
      copiar.textContent = 'Copiar';
      copiar.style.cssText =
        'flex:1;min-height:44px;border-radius:6px;border:0;' +
        'background:#c9a227;color:#000;font:600 14px system-ui,sans-serif';
      copiar.addEventListener('click', function () {
        area.select();
        let listo = false;
        try { listo = document.execCommand('copy'); } catch (e) { listo = false; }
        if (!listo && navigator.clipboard) {
          navigator.clipboard.writeText(area.value).then(
            function () { copiar.textContent = 'Copiado'; },
            function () { copiar.textContent = 'Selecciona y copia a mano'; });
          return;
        }
        copiar.textContent = listo ? 'Copiado' : 'Selecciona y copia a mano';
      });

      const cerrar = document.createElement('button');
      cerrar.type = 'button';
      cerrar.textContent = 'Cerrar';
      cerrar.style.cssText =
        'flex:1;min-height:44px;border-radius:6px;border:1px solid #666;' +
        'background:transparent;color:#fff;font:600 14px system-ui,sans-serif';
      cerrar.addEventListener('click', function () { capa.remove(); });

      fila.appendChild(copiar);
      fila.appendChild(cerrar);
      capa.appendChild(area);
      capa.appendChild(fila);
      document.body.appendChild(capa);
    });

    /* Se agrega cuando el documento esté listo: este archivo puede correr
       antes de que exista <body>. */
    if (document.body) document.body.appendChild(boton);
    else document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(boton);
    });
  }

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
        prepararControlesDelSistema();
        anotar('sonando');
      })
      .catch(error => {
        /* ⚠️ YA NO SE TRAGA EN SILENCIO (2026-09-04). Acá no pasaba
           nada y el reproductor quedaba en pausa hasta que alguien
           tocara algo, sin dejar rastro de por qué. Si la persona
           sigue queriendo música, se arma el reintento para el
           próximo toque, que es cuando el navegador vuelve a
           permitirlo. */
        anotar('play rechazado', error && error.name);
        if (quiereMusica) armarReintentoEnElProximoGesto();
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
   * ¿El AudioContext está dormido?
   *
   * ⚠️ EL BUG QUE ESTO DESTAPA (2026-09-04)
   * El <audio> y el AudioContext son dos cosas distintas, y al
   * bloquear la pantalla el navegador puede tocar una sin tocar la
   * otra — cuál, depende del teléfono. Si suspende SOLO el contexto,
   * el elemento sigue diciendo `paused === false`: para el código
   * está sonando, y para quien escucha hay silencio, porque el audio
   * sale enrutado POR el contexto (fuente → filtro → destino, ver
   * prepararElGrafoDeAudio).
   *
   * Tres lugares miraban `audioDeFondo.paused` a secas y por eso no
   * rescataban ese estado: el retorno del bloqueo, la red del clic y
   * el propio botón. Eso es “a veces al desbloquear ya no suena”, y
   * que fuera aleatorio es justamente la señal de que dependía de
   * cuál de las dos cosas suspendió el navegador esa vez.
   *
   * @returns {boolean}
   */
  function elContextoEstaDormido() {
    return !!grafoDeAudio && grafoDeAudio.contexto.state === 'suspended';
  }

  /**
   * Despierta el contexto si hace falta. Es inofensivo llamarlo de
   * más: si ya está corriendo, no hace nada.
   *
   * @returns {void}
   */
  function despertarElContexto() {
    if (!elContextoEstaDormido()) return Promise.resolve();

    /* ⚠️ DEVUELVE LA PROMESA, Y HAY QUE ESPERARLA (2026-09-04).
       `resume()` es asíncrono. Antes se lo llamaba y en la línea
       siguiente se pedía `play()`, con el contexto todavía
       suspendido — y ahí el navegador puede rechazar el play() y
       dejar el elemento en pausa. Que llegara a tiempo o no dependía
       del momento: de ahí que fallara una de cada tres veces y no
       hubiera forma de reproducirlo a voluntad. */
    return grafoDeAudio.contexto.resume()
      .then(() => { anotar('contexto despierto'); })
      .catch(error => { anotar('resume rechazado', error && error.name); });
  }

  /** Si ya hay un reintento esperando el próximo gesto. */
  let reintentoArmado = false;

  /**
   * Deja armado un reintento para el próximo toque de la persona.
   *
   * ⚠️ POR QUÉ HACE FALTA (2026-09-04)
   * Cuando el navegador rechaza el `play()` —porque volver del
   * bloqueo no siempre cuenta como “gesto de la persona”— el
   * reproductor se quedaba en pausa y NADA lo reintentaba. Eso es lo
   * que se ve como “se queda insistentemente en pausa”.
   *
   * El próximo toque en cualquier parte de la página SÍ es un gesto,
   * así que ahí vuelve a estar permitido. Se engancha una sola vez y
   * se desengancha al usarse: no queda nada corriendo.
   *
   * @returns {void}
   */
  function armarReintentoEnElProximoGesto() {
    if (reintentoArmado) return;
    reintentoArmado = true;
    anotar('reintento armado');

    const reintentar = () => {
      reintentoArmado = false;
      document.removeEventListener('pointerdown', reintentar, true);

      if (!quiereMusica) return;
      if (audioDeFondo.paused || elContextoEstaDormido()) {
        anotar('reintentando por gesto');
        reproducirLaCancion();
      }
    };

    // En captura: corre antes que cualquier otro manejador de la página.
    document.addEventListener('pointerdown', reintentar, true);
  }

  /**
   * Alterna entre reproducir y pausar. ES EL ÚNICO LUGAR donde cambia
   * la intención de la persona: todo lo demás —el bloqueo de pantalla,
   * volver a la pestaña, la red del clic— la lee, nunca la escribe.
   *
   * @returns {void}
   */
  function alternarPlayPausa() {
    /* `paused` NO alcanza para saber si se oye algo: con el contexto
       dormido el elemento dice que suena y hay silencio. Para quien
       mira la pantalla eso es “está pausado”, así que el botón tiene
       que despertarlo, no pausar algo que no se escucha — antes hacía
       falta tocarlo DOS veces para recuperar el sonido. */
    if (audioDeFondo.paused || elContextoEstaDormido()) {
      quiereMusica = true;
      reproducirLaCancion();
    } else {
      quiereMusica = false;
      audioDeFondo.pause();
    }
  }

  /* ─── LOS CONTROLES DE LA PANTALLA BLOQUEADA ──────────────────
   *
   * POR QUÉ HACEN FALTA (2026-09-04)
   * El otro síntoma del reproductor era “no para de reproducir” con el
   * teléfono bloqueado. La única forma que tenía la página de
   * enterarse era `visibilitychange`, y en varios bloqueos llega tarde
   * o no llega. Mientras tanto no había NINGÚN control que el sistema
   * respetara: la música seguía y no se podía parar sin desbloquear y
   * volver a la página.
   *
   * Con Media Session, el sistema operativo muestra la canción en la
   * pantalla bloqueada con sus botones de verdad. Deja de depender de
   * que la página adivine.
   *
   * Va detrás de una comprobación de soporte y de un try: si el
   * navegador no la tiene, todo sigue funcionando exactamente como
   * antes.
   */

  /** Para no volver a registrarlos en cada play(). */
  let controlesDelSistemaListos = false;

  /**
   * Le cuenta al sistema qué se está escuchando y cómo controlarlo.
   *
   * @returns {void}
   */
  function prepararControlesDelSistema() {
    if (controlesDelSistemaListos) return;
    if (!('mediaSession' in navigator) || typeof MediaMetadata !== 'function') return;

    controlesDelSistemaListos = true;
    const cancion = (CONFIGURACION && CONFIGURACION.musica) || {};

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  cancion.titulo  || 'Música',
        artist: cancion.artista || '',
        album:  cancion.album   || '',
        // El tamaño es el real del archivo: declarar uno que no es
        // hace que algunos sistemas descarten la miniatura.
        artwork: [{
          src: 'recursos/logo-dibujado-por-lucila.png',
          sizes: '400x540',
          type: 'image/png',
        }],
      });

      /* Los dos botones escriben `quiereMusica`, igual que
         alternarPlayPausa(): apretar pausa en la pantalla bloqueada es
         tan decisión de la persona como apretarla en la página, y la
         red del clic tiene que respetarla. */
      navigator.mediaSession.setActionHandler('play', () => {
        anotar('play del sistema');
        quiereMusica = true;
        reproducirLaCancion();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        anotar('pausa del sistema');
        quiereMusica = false;
        audioDeFondo.pause();
      });
    } catch (error) {
      console.warn('No se pudieron poner los controles del sistema:', error);
    }
  }

  /* El estado que muestra la pantalla bloqueada sale del elemento, no
     de lo que creamos nosotros: así no puede quedar diciendo “sonando”
     sobre algo que el navegador paró por su cuenta. */
  audioDeFondo.addEventListener('play', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  audioDeFondo.addEventListener('pause', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });


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

    // El contexto se despierta SIEMPRE, sin mirar `paused`: si lo que
    // quedó dormido es el contexto y no el elemento, este era el
    // último rescate y tampoco entraba. Y se espera al resume por el
    // mismo motivo que en alVolverLaPagina().
    despertarElContexto().then(() => {
      if (audioDeFondo.paused) reproducirLaCancion();
    });
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
    anotar('la página se va');
    if (quiereMusica && !audioDeFondo.paused) audioDeFondo.pause();
  }

  function alVolverLaPagina() {
    anotar('la página vuelve');
    if (!quiereMusica) return;

    /* ⚠⚠ ACÁ ESTABA EL BUG (2026-09-04). La condición era
       `quiereMusica && audioDeFondo.paused`, y reproducirLaCancion()
       sí despierta el contexto — pero solo si llegaba a correr. Si el
       navegador había suspendido el contexto SIN pausar el elemento,
       `paused` era false, la condición no entraba, nadie despertaba
       nada, y la música quedaba muda con el ícono diciendo que sonaba.

       Ahora son dos preguntas separadas, que es lo que siempre
       fueron: el contexto se despierta pase lo que pase, y play()
       solo se pide si el elemento de verdad está pausado.

       Y SE ESPERA a que el contexto despierte antes de pedir play():
       esa carrera es la que dejaba el reproductor en pausa una de
       cada tres veces. Ver despertarElContexto(). */
    despertarElContexto().then(() => {
      if (audioDeFondo.paused) reproducirLaCancion();
      else anotar('seguía sonando, nada que hacer');
    });
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
