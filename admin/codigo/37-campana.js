/* ══════════════════════════════════════════════════════════════════════
   37 · LA CAMPANA

   QUÉ HACE ESTE ARCHIVO
   Una bandeja de avisos in-app (no WebPush, no nada nuevo del lado del
   servidor): junta lo que hoy.php YA calcula como "pendientes" —pagos
   por vencer, tareas atrasadas, lo que haga falta resolver antes del
   24— y le suma los cambios que la cola offline tuvo que apartar porque
   el servidor los rechazó (A4, 26-sincronizacion.js).

   POR QUÉ NO INVENTA NADA
   Cero datos falsos: si hoy.php no trae nada pendiente, la campana dice
   eso mismo y listo. No hay una fuente "de relleno" para que la campana
   nunca esté vacía.

   POR QUÉ NO ES abrirHojaDeAvisos()
   Ese nombre YA existe en 15-instalar-y-avisos.js y es otra cosa por
   completo: la pantalla de activar/probar notificaciones push del
   teléfono. Tocarla para que hiciera esto la rompería. Esta bandeja se
   llama abrirBandejaDeAvisos() a propósito, sin pisar esa función.

   CARGA después de 07 (comoFechaCorta, aunque acá no se usa fecha larga),
   26 (SIN_LLEGADA, listarRechazados) y 30 (dibujarHoy ya cachea
   ULTIMO_HOY), y antes de 20-arranque.js.
   ══════════════════════════════════════════════════════════════════════ */


/**
 * La última respuesta de hoy.php, para no pedirla de nuevo solo para
 * contar avisos. La pone dibujarHoy() (30-vista-hoy.js) cada vez que
 * carga esa pestaña.
 */
let ULTIMO_HOY = null;

/**
 * Cuántas sugerencias de los agentes (40-agentes.js) había la última
 * vez que se corrieron — arrancarLaApp() (20-arranque.js) las corre UNA
 * vez al entrar y guarda acá el número, así la campana las cuenta sin
 * tener que abrir la pestaña del asistente. Se cachea la CANTIDAD, no
 * se vuelven a correr los agentes en cada cambio de pantalla: algunos
 * (ver 42-agente-mesas.js, la regla del acomodo completo) hacen un
 * viaje al servidor propio, y repetirlo en cada irA() sería pedirle de
 * más al servidor solo para refrescar un numerito.
 */
let CANTIDAD_SUGERENCIAS_DE_AGENTES = 0;

/**
 * Las sugerencias mismas, no solo cuántas.
 *
 * ⛔ ANTES SOLO SE GUARDABA EL NÚMERO (2026-09-16), y por eso la bandeja
 * no podía mostrarlas: tenía el 15 y nada más. El comentario de arriba
 * explicaba por qué se cacheaba «la CANTIDAD, no las sugerencias» —para
 * no volver a correr los agentes en cada cambio de pantalla— y eso sigue
 * valiendo: los agentes se corren cuando toca, y ACÁ queda lo que
 * devolvieron, listo para pintar sin pedir nada de nuevo.
 *
 * Guardar la lista no cuesta más viajes que guardar su longitud.
 */
let SUGERENCIAS_DE_AGENTES = [];

/**
 * Cuántos avisos se dieron por vistos en ESTA cuenta.
 *
 * ⚡ LA BURBUJA DE LA CAMPANA NO SE PODÍA APAGAR (2026-09-15).
 *
 * Estuvo días en «9+» sin forma de saber qué era ni de bajarla. El
 * motivo es el mismo que tenía el cartel de los pases releídos, y ya
 * está explicado en 30-vista-hoy.js: la campana cuenta HECHOS VIVOS —un
 * pago que vence en seis días, una tarea atrasada—, no mensajes. Mirar
 * un hecho no lo cambia, así que mirarlo no podía apagar nada. Y no
 * existía ninguna marca de «ya lo vi»: no era que estuviera rota, es que
 * no estaba.
 *
 * El arreglo es el mismo que allá: al abrir la bandeja se guarda CUÁNTOS
 * había, y la burbuja muestra solo los que aparecieron después. Si llega
 * uno nuevo, se enciende sola. Si no llega ninguno, se queda apagada
 * aunque los pendientes sigan existiendo — que es justo lo que uno
 * quiere de una campana.
 *
 * Por cuenta y no por dispositivo: si no, el primero que abre la bandeja
 * le apaga los avisos al otro (ver recordarDeLaCuenta, 02-utilidades.js).
 */
const AVISOS_VISTOS = 'avisos-vistos';

/**
 * Corre todos los agentes y guarda cuántas sugerencias dieron, para que
 * la campana las refleje sin abrir el asistente.
 *
 * ⚡ ESTE NÚMERO SE QUEDABA CONGELADO TODA LA SESIÓN (2026-09-15).
 *
 * Se llamaba una sola vez, desde arrancarLaApp(). Si mientras tanto se
 * resolvía una sugerencia, la campana la seguía contando hasta recargar
 * la app. Ahora la bandeja lo vuelve a pedir al abrirse, que es el único
 * momento en que el número se va a mirar de verdad — sigue sin correrse
 * en cada cambio de pantalla, que era lo que el comentario de arriba
 * quería evitar y sigue valiendo.
 *
 * Y se le pasa VISTA_ACTUAL, igual que hace el asistente
 * (32-asistente.js): sin eso los dos contaban distinto y la campana
 * prometía sugerencias que el asistente después no mostraba.
 *
 * @returns {Promise<void>}
 */
async function refrescarSugerenciasDeAgentesParaLaCampana() {
  if (typeof recogerSugerencias !== 'function') return;
  try {
    const pantalla = typeof VISTA_ACTUAL !== 'undefined' ? VISTA_ACTUAL : undefined;
    const sugerencias = await recogerSugerencias(pantalla);

    /* ⚠️ EL SALUDO DIARIO NO ES UN AVISO.
     *
     * 46-agente-motivador.js devuelve una frase cariñosa por día, y como
     * técnicamente es una «sugerencia», sumaba +1 a la campana todos los
     * días. El propio archivo aclara en su encabezado que no toca los
     * datos del evento y que no propone ninguna acción. Se sigue
     * mostrando en el asistente, donde corresponde; lo que deja de hacer
     * es pedir atención con una burbuja. */
    SUGERENCIAS_DE_AGENTES =
      sugerencias.filter(s => s && s.agente !== 'motivador');
    CANTIDAD_SUGERENCIAS_DE_AGENTES = SUGERENCIAS_DE_AGENTES.length;
  } catch (error) {
    /* ⚠️ SIN SEÑAL NO SE BORRA LO QUE YA SE SABÍA (2026-09-16).
     *
     * Acá se ponía el contador en 0. Con eso, un refresco sin señal
     * apagaba la campana y hacía desaparecer sugerencias que seguían
     * siendo ciertas — la campana mentía para abajo, en silencio, que es
     * la peor dirección: nadie revisa un aviso que no aparece.
     *
     * Se deja lo último que se supo. Es viejo, pero es verdad; y como el
     * número no cambia, tampoco enciende la burbuja por las dudas. */
  }
  await actualizarBurbujaCampana();
}

/**
 * Cuántos avisos hay ahora mismo: los pendientes reales de hoy.php, más
 * los cambios que quedaron apartados por rechazo del servidor, más las
 * sugerencias de los agentes (ver CANTIDAD_SUGERENCIAS_DE_AGENTES).
 *
 * @returns {Promise<number>}
 */
async function contarAvisosPendientes() {
  return (await avisosDeAhora()).length;
}

/**
 * QUIÉNES son los avisos de este momento, cada uno con un `id` estable.
 *
 * ⛔ ANTES ESTO ERA UN NÚMERO Y ESE ERA EL PROBLEMA (2026-09-16).
 *
 * La marca de «ya lo vi» guardaba un total. Con eso, tres resueltas y
 * tres nuevas dan el mismo número, y la campana NO SE ENCIENDE: hay tres
 * cosas nuevas que nadie va a ver. Es el espejo exacto del caso que sí
 * estaba previsto —cuando bajan— en la dirección que no.
 *
 * Las sugerencias ya traen `id` estable derivado de la base
 * ('dinero-pago-42', contrato en 40-agentes.js:14) y los pendientes de
 * hoy.php traen tipo + id. Con eso alcanza para saber cuál es cuál.
 *
 * @returns {Promise<string[]>} Ids, sin repetir.
 */
async function avisosDeAhora() {
  const pendientes = (ULTIMO_HOY && ULTIMO_HOY.pendientes) || [];
  const rechazados = typeof listarRechazados === 'function'
    ? await listarRechazados()
    : [];

  const ids = []
    .concat(pendientes.map(p => 'pendiente:' + (p.tipo || '') + ':' + (p.id || 0)))
    .concat(rechazados.map(r => 'rechazo:' + (r.id || 0)))
    .concat(SUGERENCIAS_DE_AGENTES.map(s => 'sugerencia:' + (s.id || s.titulo || '')));

  return Array.from(new Set(ids));
}

/**
 * Cuántos avisos NUEVOS hay desde la última vez que se abrió la bandeja.
 *
 * Compara ids contra los que ya se dieron por vistos, en vez de restar
 * totales. Ver avisosDeAhora().
 *
 * @param {string[]} idsDeAhora
 * @returns {number}
 */
function cuantosAvisosSonNuevos(idsDeAhora) {
  const vistos = recordadoDeLaCuenta(AVISOS_VISTOS, []);
  const yaVistos = new Set(Array.isArray(vistos) ? vistos : []);

  return idsDeAhora.filter(id => !yaVistos.has(id)).length;
}

/**
 * Da por vistos los avisos de este momento.
 *
 * ⚠️ SE GUARDA SOLO LO QUE EXISTE AHORA, no la unión con lo de antes: si
 * un pago se resuelve y meses después vuelve a vencer, tiene que
 * anunciarse de nuevo. Guardar la historia entera lo dejaría mudo para
 * siempre, y de paso haría crecer el localStorage sin techo.
 *
 * @param {string[]} idsDeAhora
 * @returns {void}
 */
function darAvisosPorVistos(idsDeAhora) {
  recordarDeLaCuenta(AVISOS_VISTOS, idsDeAhora);
}

/**
 * Pinta la burbuja de la campana. Contador propio: nunca se mezcla con
 * el de #burbuja-cola (C2) aunque las dos usen ponerBurbuja().
 *
 * Muestra los NUEVOS, no el total: ver AVISOS_VISTOS más arriba.
 *
 * @returns {Promise<void>}
 */
async function actualizarBurbujaCampana() {
  ponerBurbuja('#burbuja-campana', cuantosAvisosSonNuevos(await avisosDeAhora()));
}

/**
 * Abre la bandeja de avisos.
 *
 * @returns {Promise<void>}
 */
async function abrirBandejaDeAvisos() {
  const cuerpo = abrirHoja('Avisos', '<div id="lista-avisos"></div>');
  const donde = buscar('#lista-avisos', cuerpo);
  pintarCargando(donde, 2);

  /* Las sugerencias se vuelven a pedir ACÁ y no al arrancar: es el único
     momento en que el número se mira de verdad. Ver
     refrescarSugerenciasDeAgentesParaLaCampana(). */
  if (typeof recogerSugerencias === 'function') {
    await refrescarSugerenciasDeAgentesParaLaCampana();
  }

  const pendientes = (ULTIMO_HOY && ULTIMO_HOY.pendientes) || [];
  const rechazados = typeof listarRechazados === 'function'
    ? await listarRechazados()
    : [];

  /* Dar por vistos los que hay en este momento: la burbuja se apaga y se
     vuelve a encender sola cuando aparezca uno más. Se marca al ABRIR y
     no al cerrar, porque cerrar una hoja tiene varios caminos (el botón,
     el gesto, el botón físico de atrás) y uno de ellos siempre se
     olvida. Ver AVISOS_VISTOS. */
  darAvisosPorVistos(await avisosDeAhora());
  ponerBurbuja('#burbuja-campana', 0);

  if (!pendientes.length && !rechazados.length && !CANTIDAD_SUGERENCIAS_DE_AGENTES) {
    pintarVacio(donde, 'No hay nada pendiente',
      'Cuando haya un pago por vencer, una tarea atrasada o un cambio que el servidor rechace, va a aparecer aquí.');
    return;
  }

  donde.innerHTML =
    (pendientes.length
      ? '<div class="tarjeta__titulo">Por resolver</div>' +
        pendientes.map(filaDeAviso).join('')
      : '') +
    (rechazados.length
      ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
        'Cambios que el servidor rechazó</div>' +
        rechazados.map(filaDeRechazado).join('')
      : '') +
    /* ⛔ ACÁ HABÍA UN RENGLÓN QUE PROMETÍA N Y NO LLEVABA A NINGUNA
     *    (2026-09-16)
     *
     * Decía «15 sugerencias por revisar» y un pie que aseguraba que «el
     * asistente tiene el detalle de cada una». Se tocaba, se abría
     * MegaBot, y aparecía un chat vacío.
     *
     * El comentario que estaba acá justificaba no repintarlas diciendo
     * que cargarSugerenciasDelAsistente() las volvía a pedir frescas.
     * ESA FUNCIÓN NUNCA EXISTIÓ. Y cajaDeSugerencias() /
     * engancharSugerencias(), que sí están escritas en 40-agentes.js con
     * su confirmar/ejecutar/deshacer entero, no las llamaba nadie desde
     * ningún lado.
     *
     * O sea: la campana contaba quince cosas que ninguna pantalla del
     * panel mostraba. Ahora se pintan acá, que es donde la persona ya
     * está parada cuando ve el número.
     *
     * ⚠️ SIN TOPE. Si son quince, se muestran quince. Un slice silencioso
     * es precisamente lo que hizo que esto pasara desapercibido: el
     * único camino que llegaba a pintar una sugerencia lo hacía de a
     * tres, sin señal, y solo escribiendo algo que MegaBot no entendía. */
    (SUGERENCIAS_DE_AGENTES.length
      ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
          'Sugerencias de los agentes' +
        '</div>' +
        cajaDeSugerencias(SUGERENCIAS_DE_AGENTES)
      : '');

  buscarTodos('[data-aviso]', donde).forEach(fila => {
    fila.addEventListener('click', () => {
      const [destino, seccion, tipo, id] = fila.dataset.aviso.split('|');

      /* ⚡ LAS ALARMAS ERAN FILAS INTOCABLES (2026-09-15).
       *
       * hoy.php las mandaba con ir_a y seccion vacíos, así que salían
       * como <div> sin nada que tocar: se veía «Recordar el vestido» y
       * no había forma de llegar a esa alarma. No es que la pantalla no
       * existiera —abrirAlarmas() está en 22-alarmas.js— es que nadie
       * las había conectado. Van por su propio camino porque son una
       * hoja, no una pestaña. */
      if (tipo === 'alarma') {
        cerrarHoja(true);
        if (typeof abrirAlarmas === 'function') abrirAlarmas();
        return;
      }

      if (!destino) return;

      if (destino === 'dinero' && seccion) SECCION_DINERO = seccion;
      if (destino === 'evento' && seccion) SECCION_EVENTO = seccion;

      cerrarHoja(true);
      irA(destino, true);
      senalarElAvisoEnLaLista(tipo, id);
    });
  });

  buscarTodos('[data-rechazo-borrar]', donde).forEach(boton => {
    boton.addEventListener('click', async evento => {
      evento.stopPropagation();
      await borrarRechazado(Number(boton.dataset.rechazoBorrar));
      actualizarBurbujaCampana();
      abrirBandejaDeAvisos();
    });
  });

  /* Las tarjetas de sugerencias, con su confirmar / ejecutar / deshacer.
     Un solo listener por delegación en el contenedor —no uno por botón—
     porque las tarjetas se reescriben a sí mismas al cambiar de estado;
     el motivo largo está en engancharSugerencias() (40-agentes.js:149). */
  if (SUGERENCIAS_DE_AGENTES.length &&
      typeof engancharSugerencias === 'function') {
    engancharSugerencias(buscar('#lista-sugerencias', donde),
                         SUGERENCIAS_DE_AGENTES);
  }
}

/**
 * Una fila de aviso real (de hoy.php.pendientes).
 *
 * @param {{texto:string, detalle:string, ir_a:string, seccion:string}} p
 * @returns {string}
 */
function filaDeAviso(p) {
  /* ⚡ EL `id` LLEGABA DEL SERVIDOR Y SE TIRABA ACÁ (2026-09-15).
   *
   * hoy.php manda cada pendiente con su id —lo pone pendiente(), último
   * parámetro—, y esta función armaba el data-aviso con dos campos
   * nomás. Por eso tocar «Anticipo del salón» abría la lista de Pagos
   * entera y había que buscar el pago a mano, que es justo lo que uno
   * acaba de decirle a la app que ya sabe.
   *
   * La regla está escrita en 30-vista-hoy.js: «Un número que se puede
   * tocar tiene que llevar a la lista de ESE número; si no, es peor que
   * no ser tocable». Vale igual para una fila. */
  const tocable = !!p.ir_a || p.tipo === 'alarma';
  const destino = seguro(p.ir_a || '') + '|' + seguro(p.seccion || '') +
                  '|' + seguro(p.tipo || '') + '|' + seguro(p.id || 0);

  return '' +
    '<' + (tocable ? 'button' : 'div') + ' class="lista__fila"' +
      (tocable ? ' data-aviso="' + destino + '"' : '') + '>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(p.texto) + '</span>' +
        (p.detalle ? '<span class="lista__pie">' + seguro(p.detalle) + '</span>' : '') +
      '</span>' +
    '</' + (tocable ? 'button' : 'div') + '>';
}

/**
 * Busca la fila de un ítem ya pintado y la señala: la trae a la vista y
 * le deja el filete de «esto es lo que buscabas» un momento.
 *
 * ⚠️ ES DE BUENA FE, NO GARANTIZADO. Cada sección pinta sus filas con
 * el atributo que le quedó cómodo —data-pago, data-tarea, data-cita,
 * data-ev-id—, así que se prueban todos. Si el ítem no está en pantalla
 * (se pagó, se borró, quedó en otra página), no pasa nada: la persona
 * igual llegó a la sección correcta, que es donde estaba antes de este
 * cambio. Lo que NO puede hacer es romper la navegación.
 *
 * @param {string} tipo - 'pago' | 'tarea' | 'agenda' | 'ensayo' | 'vestido'
 * @param {number|string} id
 * @returns {void}
 */
function senalarElAvisoEnLaLista(tipo, id) {
  if (!id || Number(id) <= 0) return;

  const posibles = ['data-pago', 'data-tarea', 'data-cita', 'data-ev-id',
                    'data-agenda', 'data-ensayo'];

  /* Un margen para que la sección termine de pintarse. Si no aparece,
     se deja así: reintentar en bucle por una fila que a lo mejor ya no
     existe es peor que no señalar nada. */
  setTimeout(() => {
    let fila = null;
    for (const atributo of posibles) {
      fila = buscar('[' + atributo + '="' + String(id).replace(/"/g, '') + '"]');
      if (fila) break;
    }
    if (!fila) return;

    fila.classList.add('lista__fila--senalada');
    fila.scrollIntoView({ block: 'center', behavior: 'smooth' });

    /* Se apaga sola. Un resaltado que se queda deja de significar «esto
       es lo que venías a ver» y pasa a ser decoración. */
    setTimeout(() => fila.classList.remove('lista__fila--senalada'), 2400);
  }, 350);
}

/**
 * Una fila de cambio rechazado por el servidor (A4). Con el motivo real
 * que dio el servidor, nunca uno inventado, y un botón para descartarlo
 * una vez revisado.
 *
 * @param {{id:number, ruta:string, mensaje_servidor:string, codigo_http:number}} r
 * @returns {string}
 */
function filaDeRechazado(r) {
  const motivo = r.mensaje_servidor || ('código ' + r.codigo_http);
  return '' +
    '<div class="lista__fila">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo" style="color:var(--alerta)">' + seguro(r.ruta) + '</span>' +
        '<span class="lista__pie">' + seguro(motivo) + '</span>' +
      '</span>' +
      '<button class="boton-icono" data-rechazo-borrar="' + seguro(r.id) + '" aria-label="Descartar">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" class="icono">' +
          '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" ' +
               'stroke-width="2" stroke-linecap="round"/>' +
        '</svg>' +
      '</button>' +
    '</div>';
}
