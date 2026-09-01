/* ══════════════════════════════════════════════════════════════════════
   21 · MONITOR DE RENDIMIENTO (gobernador de CALIDAD GRÁFICA)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Vigila cuántos milisegundos tarda el equipo en dibujar cada cuadro y
   corrige EN VIVO la calidad gráfica (alta / media / baja, ver
   nivelDeCalidad en 02-utilidades.js) para que la web se sienta fluida en
   CUALQUIER equipo, del más nuevo al más viejo, sin perder la escena de
   vista: lo que cambia es CUÁNTO se anima a la vez y con qué frecuencia se
   recalcula, no el lenguaje visual (los candelabros, las joyas, el marco
   siguen exactamente igual en los tres niveles).

   POR QUÉ HACE FALTA ESTO ADEMÁS DE LA ESTIMACIÓN DEL <head>
   El <head> arranca con una ADIVINANZA (memoria/núcleos, una vez, antes de
   dibujar). Es una buena primera aproximación pero es ciega: no sabe si en
   ESTE momento el equipo tiene otras pestañas abiertas, si está con la
   batería en modo ahorro, o si la estimación simplemente se quedó corta o
   se pasó. Este archivo mide la ACTUACIÓN REAL, cuadro a cuadro, y ajusta.

   CÓMO SE MIDE, SIN QUE LA MEDICIÓN CUESTE
   Se lleva un promedio MÓVIL exponencial del tiempo entre cuadros. Se sube
   o baja la calidad DE A UN NIVEL por vez, y con umbrales distintos para
   degradar y para mejorar (histéresis): degradar —proteger la fluidez— es
   rápido; mejorar —confiar en que el equipo puede con más— pide una racha
   mucho más larga de buenos cuadros, para no ir prendiendo y apagando
   efectos cada dos segundos.

   CÓMO LO USA EL RESTO DE LA WEB
   Se pone en el <html> la clase `calidad-media` o `calidad-baja` (alta =
   ninguna de las dos) y se dispara el evento `calidad-cambio` con el nivel.
   Cada módulo de animación lee eso, UNA vez al crear sus elementos y/o en
   ese evento, para decidir cantidad y cadencia (ver 06-petalos, 14-haces,
   18-motas, 19-velas, 07-marco-y-enredaderas).
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElMonitorDeRendimiento() {

  const raiz = document.documentElement;

  /* Cuánto pesa cada cuadro nuevo en el promedio (0..1). Chico = el promedio
     reacciona despacio y no se deja engañar por un tropezón suelto. */
  const PESO_DEL_CUADRO = 0.08;

  /* ─── LOS UMBRALES SON RELATIVOS A LA PANTALLA, NO NÚMEROS FIJOS ──────
     ⚠️ ESTO ESTUVO MAL Y SE CORRIGIÓ. Antes los umbrales eran absolutos, y
     para volver de MEDIA a ALTA se exigía un promedio por debajo de 14 ms.
     Pero en una pantalla de 60 Hz el navegador dibuja, como mucho, un cuadro
     cada 16,7 ms: **14 ms era físicamente imposible**. Resultado: en la
     inmensa mayoría de los equipos la calidad ALTA era inalcanzable, por
     potentes que fueran, y todo el potencial gráfico pensado para gama alta
     no lo veía nadie.

     Lo correcto es comparar contra el ritmo REAL de cada pantalla: ir
     "perfecto" son 16,7 ms en una de 60 Hz, 8,3 ms en una de 120 Hz y 6,9 ms
     en una de 144 Hz. Por eso los umbrales son MULTIPLICADORES de ese ideal:

       · Degradar a MEDIA  si el promedio pasa 1,35 × lo ideal (~44 fps en 60 Hz)
       · Degradar a BAJA   si pasa 1,75 × lo ideal (~34 fps en 60 Hz)
       · Mejorar a ALTA    si baja de 1,12 × lo ideal (~54 fps en 60 Hz)
       · Mejorar a MEDIA   si baja de 1,35 × lo ideal

     La banda entre mejorar y degradar de un mismo nivel es la zona muerta que
     evita el ir y venir. Y como la carga sube al mejorar de nivel, si el
     equipo no la aguanta el propio gobernador vuelve a bajarlo: por eso
     enriquecer la calidad alta es seguro, se autorregula. */
  const FACTOR_DEGRADAR = [null, 1.35, 1.75];
  const FACTOR_MEJORAR  = [null, 1.12, 1.35];

  /* Cuánto tarda un cuadro cuando TODO va bien en esta pantalla. Se estima
     con el cuadro más rápido que se haya visto (los cuadros no pueden ser
     más rápidos que el refresco físico), con un piso de 6 ms para no
     envenenar la medida con algún cuadro raro. */
  let intervaloIdeal = 16.7;
  /** Muestras recientes de duración de cuadro, para deducir el ritmo real
      de la pantalla sin dejar que un solo cuadro anómalo lo envenene. */
  const muestrasDeIntervalo = [];

  /* Cuántos cuadros seguidos en zona de degradar/mejorar hacen falta.
     Degradar es rápido (proteger la fluidez YA); mejorar (confiar en que
     el equipo aguanta más) pide una racha bastante más larga, para no
     prender y apagar efectos por una mejora pasajera. */
  const CUADROS_PARA_DEGRADAR = 45;    // ~0,75 s a 60 fps
  const CUADROS_PARA_MEJORAR  = 150;   // ~2,5 s

  /* Los primeros cuadros tras cargar siempre son lentos (se arma la página).
     Se ignoran para no degradar por el arranque. */
  const CALENTAMIENTO_MS = 1800;

  let promedioMs = 16.7;            // arranca suponiendo 60 fps
  let calidad = nivelDeCalidad();   // parte de la estimación que puso el <head>
  let cuadrosDegrada = 0;
  let cuadrosMejora = 0;
  let momentoAnterior = performance.now();
  let arranque = momentoAnterior;

  /* Cuántas veces este equipo tuvo que BAJAR desde cada nivel. Si ya probó
     un nivel y no lo aguantó, volver a intentarlo cuesta cada vez más: así
     un equipo justo no se pasa la visita prendiendo y apagando efectos. */
  const intentosFallidos = {};

  /**
   * Cuántos cuadros buenos seguidos hacen falta para subir de calidad.
   * Crece con cada intento fallido previo en ese nivel (2,5 s la primera vez,
   * 5 s la segunda, 10 s la tercera…), con un techo razonable.
   * @returns {number}
   */
  function cuadrosNecesariosParaMejorar() {
    const fallos = intentosFallidos[calidad - 1] || 0;
    return Math.min(CUADROS_PARA_MEJORAR * Math.pow(2, fallos), 1800);
  }

  /**
   * Aplica el nivel actual: una única clase exclusiva en <html> + evento.
   * @returns {void}
   */
  function aplicarNivel() {
    raiz.classList.toggle('calidad-media', calidad === CALIDAD_GRAFICA.MEDIA);
    raiz.classList.toggle('calidad-baja',  calidad === CALIDAD_GRAFICA.BAJA);
    document.dispatchEvent(new CustomEvent('calidad-cambio', { detail: { calidad } }));
  }

  function medir(momentoActual) {
    const delta = momentoActual - momentoAnterior;
    momentoAnterior = momentoActual;

    /* Saltos enormes = la pestaña estuvo en segundo plano (el navegador
       congela el rAF). No es lentitud real: se ignora ese cuadro. Tampoco se
       mide durante el calentamiento inicial. */
    if (delta > 100 || momentoActual - arranque < CALENTAMIENTO_MS) {
      requestAnimationFrame(medir);
      return;
    }

    /* Si las animaciones están apagadas (accesibilidad o botón), no hay carga
       que gobernar: se deja todo como está. */
    if (prefiereMenosMovimiento()) {
      requestAnimationFrame(medir);
      return;
    }

    // Promedio móvil exponencial del tiempo por cuadro.
    promedioMs += (delta - promedioMs) * PESO_DEL_CUADRO;

    /* Se aprende cuál es el cuadro "perfecto" de ESTA pantalla: ningún cuadro
       puede ser más rápido que su refresco físico, así que el más rápido que
       se vea es una buena estimación (60 Hz → ~16,7 ms; 120 Hz → ~8,3 ms). */
    /* ⚡ EL IDEAL SE DEDUCE DE LA PANTALLA, NO DEL CUADRO MÁS RÁPIDO QUE SE
       HAYA VISTO NUNCA (2026-09-01). Antes se quedaba con el mínimo
       histórico y un solo cuadro anómalo de 6,1 ms lo dejaba clavado ahí:
       con intervaloIdeal=6, degradar a BAJA exigía superar 10,5 ms, o sea
       que degradaba apenas la página no corriera a 95 fps. En capturas
       reales el overlay reportaba "164 Hz", "141 Hz", "65 Hz" y "60 Hz" en
       corridas distintas del MISMO monitor, y la calidad quedaba siempre en
       baja. Ahora se toma la mediana de los cuadros rápidos, que es estable
       y no la puede envenenar un solo valor suelto. */
    if (delta > 6 && delta < 30) {
      muestrasDeIntervalo.push(delta);
      if (muestrasDeIntervalo.length > 120) muestrasDeIntervalo.shift();
      if (muestrasDeIntervalo.length >= 30) {
        const ordenadas = muestrasDeIntervalo.slice().sort((a, b) => a - b);
        const p10 = ordenadas[Math.floor(ordenadas.length * 0.10)];
        intervaloIdeal = Math.max(p10, 8);
      }
    }

    /* El peor cuadro de los últimos ~4 segundos (para el cartel de
       diagnóstico). Se olvida solo, así refleja lo que pasa AHORA. */
    if (delta > peorCuadroReciente) {
      peorCuadroReciente = delta;
      momentoDelPeorCuadro = momentoActual;
    } else if (momentoActual - momentoDelPeorCuadro > 4000) {
      peorCuadroReciente = delta;
      momentoDelPeorCuadro = momentoActual;
    }

    // ¿Conviene DEGRADAR un nivel (el equipo sufre)?
    if (calidad < CALIDAD_GRAFICA.BAJA &&
        promedioMs > intervaloIdeal * FACTOR_DEGRADAR[calidad + 1]) cuadrosDegrada++;
    else cuadrosDegrada = 0;

    // ¿Conviene MEJORAR un nivel (el equipo va sobrado)?
    if (calidad > CALIDAD_GRAFICA.ALTA &&
        promedioMs < intervaloIdeal * FACTOR_MEJORAR[calidad]) cuadrosMejora++;
    else cuadrosMejora = 0;

    if (cuadrosDegrada >= CUADROS_PARA_DEGRADAR) {
      calidad++;
      /* Si este equipo YA tuvo que bajar de este nivel antes, la próxima vez
         se le va a exigir mucha más paciencia antes de volver a subir: evita
         el ping-pong de prender y apagar efectos una y otra vez. */
      intentosFallidos[calidad] = (intentosFallidos[calidad] || 0) + 1;
      cuadrosDegrada = cuadrosMejora = 0;
      aplicarNivel();
    } else if (cuadrosMejora >= cuadrosNecesariosParaMejorar()) {
      calidad--;
      cuadrosDegrada = cuadrosMejora = 0;
      aplicarNivel();
    }

    requestAnimationFrame(medir);
  }

  /* Al volver de una pestaña oculta, se reinicia el reloj para que el salto
     de tiempo no se lea como un cuadro lentísimo. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) momentoAnterior = performance.now();
  });

  requestAnimationFrame(medir);


  /* ─── DETECTOR DE TAREAS LARGAS (dato real, no una aproximación) ─────
     El promedio de arriba mide CUÁNDO se dispara cada cuadro de rAF; no ve
     directamente si, EN EL MEDIO, el hilo principal quedó bloqueado por
     otra cosa (un recálculo de layout forzado, un evento de scroll pesado,
     etc.) sin que eso llegue a correrse a un cuadro entero. Por eso, a
     veces la web puede sentirse pesada con un promedio de fps que parece
     bueno: el promedio no cuenta esa historia completa.

     `longtask` es una métrica ESTÁNDAR del navegador (Performance
     Observer) hecha exactamente para esto: avisa cada vez que el hilo
     principal estuvo ocupado más de 50 ms seguidos, sin importar por qué.
     Guardamos la última para mostrarla en el cartel de diagnóstico: es la
     diferencia entre seguir ajustando números a ciegas y tener, de acá en
     adelante, un dato real de qué está pasando en el equipo de quien
     prueba la web. No todos los navegadores lo soportan; si no está
     disponible, simplemente no se muestra esa línea. */
  let ultimaTareaLarga = null;   // { duracionMs, momento }
  let cuantasTareasLargas = 0;   // cuántas van desde que cargó la página

  /* ⚠️ SE SEPARAN LAS TAREAS DE LA CARGA DE LAS DE LA NAVEGACIÓN, y no es
     un detalle: es la diferencia entre arreglar algo y perseguir un
     fantasma.

     Una tarea larga durante el arranque —parsear 120 KB de HTML con el SVG
     del relicario dentro, construir las enredaderas— ocurre UNA vez, con el
     sobre todavía cerrado, y nadie la siente. Una tarea larga mientras el
     visitante hace scroll es un parón en la cara.

     Con un solo número mezclado, un 1277 ms podía ser cualquiera de las dos
     y no había forma de saberlo. Ahora se cuentan aparte, y la que importa
     —la de después— es la que hay que llevar a cero. */
  let peorTareaAlCargar = 0;
  let peorTareaDespues = 0;
  let laInvitacionEsVisible = false;
  document.addEventListener('invitacion-visible', () => {
    /* Se da un respiro: la construcción diferida arranca justo acá y sus
       tareas son todavía "de carga", no de navegación. */
    setTimeout(() => { laInvitacionEsVisible = true; }, 2500);
  });

  if ('PerformanceObserver' in window) {
    try {
      const observadorDeTareas = new PerformanceObserver(lista => {
        for (const entrada of lista.getEntries()) {
          cuantasTareasLargas++;
          if (laInvitacionEsVisible) {
            if (entrada.duration > peorTareaDespues) peorTareaDespues = entrada.duration;
          } else if (entrada.duration > peorTareaAlCargar) {
            peorTareaAlCargar = entrada.duration;
          }
          ultimaTareaLarga = { duracionMs: entrada.duration, momento: performance.now() };
        }
      });
      observadorDeTareas.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // El navegador no soporta 'longtask': seguimos sin este dato extra.
    }
  }

  /* PEOR CUADRO RECIENTE. El promedio (promedioMs) suaviza y esconde los
     tirones, que es justamente lo que se SIENTE. Este es el cuadro más lento
     de los últimos segundos: si el promedio dice 16 ms pero el peor dice 90,
     la web se siente a los saltos aunque el promedio parezca perfecto. */
  let peorCuadroReciente = 0;
  let momentoDelPeorCuadro = 0;


  /* ─── MEDIDOR VISIBLE (opcional, apagado por defecto) ────────────────
     Para saber de verdad si un equipo va fluido hace falta un número, no
     una impresión. Agregando  ?fps=1  a la dirección aparece un cartelito
     chiquito abajo a la izquierda con la calidad actual y los cuadros por
     segundo reales de ESE equipo. Ningún invitado lo ve nunca —no está en
     ningún link de la invitación—; es solo para diagnosticar. */
  if (new URLSearchParams(location.search).get('fps') === '1') {
    const NOMBRE_DE_LA_CALIDAD = ['alta', 'media', 'baja'];
    const cartel = document.createElement('div');
    cartel.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:999999;' +
      'font:12px/1.4 monospace;color:#fff;background:rgba(0,0,0,.72);' +
      'padding:6px 10px;border-radius:6px;pointer-events:none;white-space:pre;';
    document.body.appendChild(cartel);

    /* Cuenta elementos, pero NO en cada refresco: recorrer el DOM también
       cuesta, y sería absurdo que el medidor empeore lo que mide. Se
       recalcula cada ~2 s. */
    let conteos = { nodos: 0, petalos: 0, velas: 0, flores: 0 };
    let ultimoConteo = 0;

    /* ⚠️ REGLA DE ORO DE ESTE CARTEL: no medir la página desde acá.
       La primera versión leía document.documentElement.scrollWidth DENTRO de
       la misma expresión que escribía cartel.textContent, y contaba nodos con
       getElementsByTagName('*') sobre 3.800 elementos, cada 500 ms. Un perfil
       real mostró el desastre: "Recalculate style" (11,8 %) y "Layout" (9,8 %)
       colgaban de `get scrollWidth → actualizarCartel`, y Chrome marcaba
       "Forced reflow". O sea: el instrumento estaba falseando la medición y,
       de paso, empeorando la web que venía a diagnosticar.

       Ahora: (1) la geometría NO se lee acá, viene de un ResizeObserver;
       (2) los conteos van en un hueco libre del navegador y cada 5 s;
       (3) primero se lee TODO y al final se escribe UNA sola vez. */

    /** Tamaño del documento, actualizado solo cuando de verdad cambia. */
    let tamanoDelDocumento = '—';
    if ('ResizeObserver' in window) {
      const observador = new ResizeObserver(entradas => {
        /* Dentro del ResizeObserver, el navegador ya resolvió el layout: leer
           acá es barato y no fuerza nada. */
        const caja = entradas[0] && entradas[0].contentRect;
        if (caja) tamanoDelDocumento = `${Math.round(caja.width)}×${Math.round(caja.height)}`;
      });
      observador.observe(document.body);
    }

    /** Pide un hueco libre del navegador; si no existe la API, usa un timer. */
    const enUnHuecoLibre = window.requestIdleCallback
      ? (fn) => window.requestIdleCallback(fn, { timeout: 1000 })
      : (fn) => setTimeout(fn, 0);

    /* ⚠️ EL MEDIDOR SE CONVIRTIÓ EN EL CUARTO COSTO DEL PERFIL, Y ES IRÓNICO.
       Con la invitación abierta, `actualizarCartel` figuraba con 11,5 % del
       tiempo: más que el lienzo de pétalos entero. La culpa es de este
       recuento —`getElementsByTagName('*')` sobre 4.000 nodos, más dos
       consultas por selector que recorren el árbol completo—.

       Como solo existe con ?fps=1, NO afecta a ningún invitado. Pero sí
       ensuciaba todas las mediciones y hacía perseguir fantasmas: cada vez
       que se grababa un perfil, el propio instrumento aparecía entre los
       culpables. Un termómetro no debe calentar el agua.

       Cada 20 s en vez de 5 basta de sobra: la cantidad de nodos apenas
       cambia una vez que la página terminó de construirse. */
    function contarElementos(ahora) {
      if (ahora - ultimoConteo < 20000 && ultimoConteo !== 0) return;
      ultimoConteo = ahora;

      /* Se cuenta en un hueco libre —no en medio del trabajo de animación— y
         sin crear arrays: recorrer la NodeList con un bucle no genera basura,
         mientras que [...querySelectorAll(...)] armaba un array nuevo cada vez
         y alimentaba al recolector (que estaba en 5,9 % del perfil). */
      enUnHuecoLibre(() => {
        /* ⚠️ LOS PÉTALOS YA NO SON ELEMENTOS. Desde que los dibuja el lienzo
           (codigo/24-lienzo-de-petalos.js) no existe ningún `.petalo` en el
           documento, así que contar por selector daba SIEMPRE 0 y parecía
           que habían desaparecido. Se cuentan del registro del canvas, y si
           el lienzo estuviera apagado (?petalos=dom) se cae al recuento
           viejo por elementos. */
        let petalosVisibles = 0;
        const lienzo = window.LienzoDePetalos;

        if (lienzo && lienzo.activo) {
          for (const plano of Object.keys(lienzo.planos)) {
            const lista = lienzo.planos[plano];
            for (let i = 0; i < lista.length; i++) if (lista[i].activo) petalosVisibles++;
          }
        } else {
          const listaDePetalos = document.querySelectorAll('.petalo');
          for (let i = 0; i < listaDePetalos.length; i++) {
            if (listaDePetalos[i].style.display !== 'none') petalosVisibles++;
          }
        }

        conteos.nodos   = document.getElementsByTagName('*').length;
        conteos.petalos = petalosVisibles;
        conteos.velas   = document.querySelectorAll('.vela').length;
        conteos.flores  = document.querySelectorAll('.flor-de-enredadera').length;
      });
    }

    /**
     * Estado de los dos ramilletes de esquina, en una línea.
     *
     * ⚠️ ESTO ES UN INSTRUMENTO DE DIAGNÓSTICO, no decoración. El ramillete
     * de la esquina derecha desapareció cinco veces y ya se descartaron con
     * medición el markup, el generador, la semilla y las carreras de
     * construcción: el SVG se genera bien. Falta saber POR QUÉ no se ve, y
     * para eso hace falta su caja real en pantalla.
     *
     * Con esta línea, una captura del cartel basta para verlo: si sale con
     * ancho 0, o con una x fuera de la ventana, ahí está la causa.
     *
     * @returns {string}
     */
    function lineaDeRamilletes() {
      const estado = window.EstadoDeLosRamilletes;
      if (!estado || !estado.length) return 'ramilletes: todavía sin construir\n';

      return 'ramilletes: ' + estado.map(r =>
        r.existe
          ? `${r.lado} ${r.rosas} rosas ${r.ancho}x${r.alto} @${r.x},${r.y}`
          : `${r.lado} FALTA`
      ).join('  ·  ') + '\n';
    }

    function actualizarCartel() {
      const ahora = performance.now();
      const fps = Math.round(1000 / promedioMs);
      contarElementos(ahora);

      /* PEOR CUADRO: lo que de verdad se siente. Un promedio de 16 ms con un
         peor cuadro de 90 ms se percibe a los saltos, no fluido. */
      const peorFps = peorCuadroReciente > 0 ? Math.round(1000 / peorCuadroReciente) : 0;

      /* Tareas largas: además de la última, cuántas van y cuál fue la peor.
         La última solo cuenta si fue hace poco (10 s); si no, ya no describe
         lo que está pasando ahora. */
      const reciente = ultimaTareaLarga && (ahora - ultimaTareaLarga.momento) < 10000
        ? `${ultimaTareaLarga.duracionMs.toFixed(0)} ms`
        : '—';

      /* Memoria del montón de JavaScript. Solo la exponen algunos
         navegadores (Chrome); si no está, se omite la línea. */
      let lineaDeMemoria = '';
      if (performance.memory) {
        const usados = performance.memory.usedJSHeapSize / 1048576;
        lineaDeMemoria = `\nmemoria JS: ${usados.toFixed(0)} MB`;
      }

      /* El ritmo ideal detectado de ESTA pantalla, contra el que se comparan
         los umbrales (60 Hz → 16,7 ms; 120 Hz → 8,3 ms). Sirve para ver de un
         vistazo cuánto margen real queda antes de subir o bajar de calidad. */
      const hzPantalla = Math.round(1000 / intervaloIdeal);

      /* ── ESCRITURA, y recién al final ──────────────────────────────────
         Todo lo de arriba fueron LECTURAS de variables ya calculadas (ni una
         sola consulta de geometría al navegador). Esta es la única línea que
         toca el DOM, y es la última: así no queda ninguna lectura después de
         una escritura, que es lo que provoca el reflow forzado. El tamaño del
         documento sale del ResizeObserver, no de scrollWidth. */
      cartel.textContent =
        `calidad: ${NOMBRE_DE_LA_CALIDAD[calidad]}` +
        `${prefiereMenosMovimiento() ? '  (animación OFF)' : ''}\n` +
        `~${fps} fps  (${promedioMs.toFixed(1)} ms/cuadro)` +
        `  ·  pantalla ~${hzPantalla} Hz\n` +
        `peor cuadro: ${peorCuadroReciente.toFixed(0)} ms  (~${peorFps} fps)\n` +
        `tareas largas: ${cuantasTareasLargas}  ·  al cargar ${peorTareaAlCargar.toFixed(0)} ms` +
        `  ·  DESPUÉS ${peorTareaDespues.toFixed(0)} ms  ·  última ${reciente}\n` +
        `nodos DOM: ${conteos.nodos}  ·  flores: ${conteos.flores}\n` +
        `pétalos activos: ${conteos.petalos}  ·  velas: ${conteos.velas}\n` +
        lineaDeRamilletes() +
        lineaDeMemoria +
        `\ndocumento: ${tamanoDelDocumento}` +
        /* ⚡ DIAGNÓSTICO DIRECTO EN EL CARTEL (2026-09-02): si algún script
           de la escena tiró un error sin atrapar (ver 02-utilidades.js),
           se muestra acá. Así una captura de este overlay alcanza para ver
           la causa real de una pieza que no terminó de construirse, sin
           depender de leer la consola del navegador. */
        (window._ultimoErrorSinAtrapar ? `\n⚠ ERROR: ${window._ultimoErrorSinAtrapar}` : '');

      /* Cada 2 s en vez de 1: escribir el cartel obliga a recalcular su
         estilo y su layout, y a 1 s eso pesaba de más en las mediciones. */
      setTimeout(actualizarCartel, 2000);
    }
    setTimeout(actualizarCartel, 1000);
  }
})();
