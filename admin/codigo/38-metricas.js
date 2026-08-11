/* ══════════════════════════════════════════════════════════════════════
   38 · REGISTRAR MÉTRICAS DE USO (Fase 7 del rediseño)

   QUÉ HACE ESTE ARCHIVO
   Una sola función, registrarEvento(), que el resto del código llama en
   los diez puntos que de verdad importan (ver la lista abajo). Nunca
   interrumpe ni avisa si algo falla: es telemetría, no una acción que
   la persona esté esperando.

   POR QUÉ NO HACE FALTA UNA COLA PROPIA
   mandar() (03-servidor.js) ya encola sola cualquier POST que falle por
   falta de señal (ver encolarEscritura(), 26-sincronizacion.js) y la
   reintenta cuando vuelve la conexión — se reusa tal cual, sin inventar
   un segundo mecanismo de guardado offline solo para esto.

   LOS DIEZ EVENTOS (panel-metricas-observabilidad.txt)
    1. vista                    — cambio de pestaña (irA(), 05-navegacion.js)
    2. accion:abrir_ficha_invitado
    3. accion:asignar_mesa
    4. accion:marcar_llegada
    5. accion:crear_editar_acompanante
    6. accion:marcar_pago
    7. accion:crear_tarea
    8. busqueda:busqueda_vacia   — solo cuando el resultado queda vacío
    9. asistente:frase_exitosa / frase_fallida
   10. friccion:abrir_cerrar_repetido
   ══════════════════════════════════════════════════════════════════════ */


/** Cuándo se abrió cada hoja por última vez y cuántas veces seguidas
    (para detectar el evento 10, abrir_cerrar_repetido), por clave libre
    que cada llamador elige (el nombre de la ficha, por ejemplo). */
const RASTRO_DE_ABRIR_CERRAR = {};

/**
 * Anota un evento de uso. Nunca lanza, nunca avisa: si falla, se pierde
 * ese renglón de métricas y nada más — la app sigue exactamente igual.
 *
 * @param {string} tipo - 'vista' | 'accion' | 'busqueda' | 'asistente' | 'friccion'
 * @param {string} nombre
 * @param {Object} [payload]
 * @returns {void}
 */
function registrarEvento(tipo, nombre, payload) {
  try {
    if (typeof USUARIO === 'undefined' || !USUARIO) return;

    mandar('metricas.php?accion=registrar', {
      tipo: tipo,
      nombre: nombre,
      payload: payload || undefined,
      pantalla: (typeof VISTA_ACTUAL !== 'undefined' && VISTA_ACTUAL) || '',
    }).catch(() => {});
  } catch (error) {
    // Telemetría: un fallo acá nunca debe notarse en la app.
  }
}

/**
 * Marca que se abrió una hoja identificada por `clave`, y avisa si es
 * la tercera vez o más en menos de 60 segundos sin nada de por medio
 * — la señal de fricción que pide el documento ("entrar a una ficha,
 * salir, volver a entrar").
 *
 * @param {string} clave - Algo estable para esa ficha, ej. 'invitado-45'.
 * @returns {void}
 */
function registrarAbrirDeNuevo(clave) {
  const ahora = Date.now ? Date.now() : new Date().getTime();
  const rastro = RASTRO_DE_ABRIR_CERRAR[clave];

  if (rastro && ahora - rastro.ultima < 60000) {
    rastro.veces++;
    rastro.ultima = ahora;
    if (rastro.veces === 3) {
      registrarEvento('friccion', 'abrir_cerrar_repetido', { elemento: clave });
    }
  } else {
    RASTRO_DE_ABRIR_CERRAR[clave] = { veces: 1, ultima: ahora };
  }
}
