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
 * Corre todos los agentes una vez y guarda cuántas sugerencias dieron,
 * para que la campana las refleje sin abrir el asistente. Pensada para
 * llamarse una sola vez por sesión, desde arrancarLaApp().
 *
 * @returns {Promise<void>}
 */
async function refrescarSugerenciasDeAgentesParaLaCampana() {
  if (typeof recogerSugerencias !== 'function') return;
  try {
    const sugerencias = await recogerSugerencias();
    CANTIDAD_SUGERENCIAS_DE_AGENTES = sugerencias.length;
  } catch (error) {
    // Sin señal, o algún agente falló: no hay nada nuevo que contar,
    // pero tampoco se rompe la campana por esto.
    CANTIDAD_SUGERENCIAS_DE_AGENTES = 0;
  }
  actualizarBurbujaCampana();
}

/**
 * Cuántos avisos hay ahora mismo: los pendientes reales de hoy.php, más
 * los cambios que quedaron apartados por rechazo del servidor, más las
 * sugerencias de los agentes (ver CANTIDAD_SUGERENCIAS_DE_AGENTES).
 *
 * @returns {Promise<number>}
 */
async function contarAvisosPendientes() {
  const pendientes = (ULTIMO_HOY && ULTIMO_HOY.pendientes) || [];
  const rechazados = typeof listarRechazados === 'function'
    ? await listarRechazados()
    : [];
  return pendientes.length + rechazados.length + CANTIDAD_SUGERENCIAS_DE_AGENTES;
}

/**
 * Pinta la burbuja de la campana. Contador propio: nunca se mezcla con
 * el de #burbuja-cola (C2) aunque las dos usen ponerBurbuja().
 *
 * @returns {Promise<void>}
 */
async function actualizarBurbujaCampana() {
  const n = await contarAvisosPendientes();
  ponerBurbuja('#burbuja-campana', n);
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

  const pendientes = (ULTIMO_HOY && ULTIMO_HOY.pendientes) || [];
  const rechazados = typeof listarRechazados === 'function'
    ? await listarRechazados()
    : [];

  if (!pendientes.length && !rechazados.length && !CANTIDAD_SUGERENCIAS_DE_AGENTES) {
    pintarVacio(donde, 'No hay nada pendiente',
      'Cuando haya un pago por vencer, una tarea atrasada o un cambio que el servidor rechace, va a aparecer acá.');
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
    /* No se repintan las sugerencias acá adentro (serían las de la
     * última corrida, potencialmente viejas) — un solo renglón que
     * lleva al asistente, donde cargarSugerenciasDelAsistente() las
     * vuelve a pedir frescas y ya tiene todo el mecanismo de
     * confirmar/deshacer (40-agentes.js). Esta bandeja no duplica eso. */
    (CANTIDAD_SUGERENCIAS_DE_AGENTES
      ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Sugerencias de los agentes</div>' +
        '<button class="lista__fila" id="aviso-ir-a-sugerencias">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' +
              seguro(pluralizar(CANTIDAD_SUGERENCIAS_DE_AGENTES, 'sugerencia', 'sugerencias')) +
              ' por revisar' +
            '</span>' +
            '<span class="lista__pie">Pagos, mesas, tareas — el asistente tiene el detalle de cada una</span>' +
          '</span>' +
        '</button>'
      : '');

  buscarTodos('[data-aviso]', donde).forEach(fila => {
    fila.addEventListener('click', () => {
      const [destino, seccion] = fila.dataset.aviso.split('|');
      if (!destino) return;

      if (destino === 'dinero' && seccion) SECCION_DINERO = seccion;
      if (destino === 'evento' && seccion) SECCION_EVENTO = seccion;

      cerrarHoja(true);
      irA(destino, true);
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

  const irASugerencias = buscar('#aviso-ir-a-sugerencias', donde);
  if (irASugerencias) {
    irASugerencias.addEventListener('click', () => {
      cerrarHoja(true);
      abrirAsistente();
    });
  }
}

/**
 * Una fila de aviso real (de hoy.php.pendientes).
 *
 * @param {{texto:string, detalle:string, ir_a:string, seccion:string}} p
 * @returns {string}
 */
function filaDeAviso(p) {
  const tocable = !!p.ir_a;
  return '' +
    '<' + (tocable ? 'button' : 'div') + ' class="lista__fila"' +
      (tocable ? ' data-aviso="' + seguro(p.ir_a) + '|' + seguro(p.seccion || '') + '"' : '') + '>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(p.texto) + '</span>' +
        (p.detalle ? '<span class="lista__pie">' + seguro(p.detalle) + '</span>' : '') +
      '</span>' +
    '</' + (tocable ? 'button' : 'div') + '>';
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
