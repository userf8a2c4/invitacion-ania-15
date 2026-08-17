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
 * Cuántos avisos hay ahora mismo: los pendientes reales de hoy.php más
 * los cambios que quedaron apartados por rechazo del servidor.
 *
 * @returns {Promise<number>}
 */
async function contarAvisosPendientes() {
  const pendientes = (ULTIMO_HOY && ULTIMO_HOY.pendientes) || [];
  const rechazados = typeof listarRechazados === 'function'
    ? await listarRechazados()
    : [];
  return pendientes.length + rechazados.length;
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

  if (!pendientes.length && !rechazados.length) {
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
