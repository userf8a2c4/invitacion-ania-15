/* ══════════════════════════════════════════════════════════════════════
   30 · VISTA HOY

   QUÉ HACE ESTE ARCHIVO
   La pestaña "Hoy": la puerta de entrada del panel desde el rediseño.
   Contesta una sola pregunta — "¿qué está pasando ahora y qué tengo que
   hacer en este momento?" — antes de mostrar cualquier otra cosa.

   FASE 1 DEL REDISEÑO: TODAVÍA ES EL BLOQUE VIEJO
   Por ahora esta pestaña reusa pintarHoy() (25-hoy.js), que ya existe y
   ya funciona: pide hoy.php y muestra los pendientes más urgentes, a
   quién llamar y la lista final. Es el mismo bloque que antes vivía
   arriba del Resumen.

   La Fase 2 del rediseño reemplaza el CONTENIDO de esta función por la
   pantalla completa que pide el documento: encabezado con estado de
   conexión, tarjeta de tres cifras grandes (llegaron/mesas/alergias),
   tres botones de acción, últimas llegadas y alertas del día. La
   pestaña y el enganche a la navegación quedan ya resueltos acá, para
   no tener que tocar 05-navegacion.js ni index.html otra vez.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Dibuja la pestaña Hoy.
 *
 * @returns {Promise<void>}
 */
async function dibujarHoy() {
  const vista = buscar('#vista-hoy');
  if (!vista) return;

  vista.innerHTML = '<div id="cuerpo-hoy"></div>';
  await pintarHoy(buscar('#cuerpo-hoy', vista));
}
