/* ══════════════════════════════════════════════════════════════════════
   38 · REGISTRAR MÉTRICAS DE USO (Fase 8 del rediseño)

   QUÉ HACE ESTE ARCHIVO
   Una sola función, registrarEvento(), que el resto del código llama en
   los puntos que de verdad importan. Nunca interrumpe ni avisa si algo
   falla: es telemetría, no una acción que la persona esté esperando.

   NO SOLO "QUÉ SE TOCA". Cada evento sale con contexto automático (sin
   señal, días para el evento, ancho de pantalla) y un id de sesión de
   uso, para que el resumen pueda reconstruir la secuencia real de
   trabajo y no solo una nube de eventos sueltos.

   POR QUÉ NO HACE FALTA UNA COLA PROPIA
   mandar() (03-servidor.js) ya encola sola cualquier POST que falle por
   falta de señal (ver encolarEscritura(), 26-sincronizacion.js) y la
   reintenta cuando vuelve la conexión — se reusa tal cual.

   ÍNDICE
     1. La sesión de uso
     2. Registrar un evento
     3. Fricción: abrir/cerrar lo mismo varias veces
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. LA SESIÓN DE USO ──────────────────────────────────────────── */

/* Sin esto, los eventos son una nube: con esto se puede reconstruir el
   camino real ("Resumen → Gente → Mesas → Resumen → Gente" = está
   buscando algo que no encuentra). Se genera una vez al cargar la
   página y viaja en cada evento. */
const SESION_DE_USO = (window.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);


/* ─── 2. REGISTRAR UN EVENTO ────────────────────────────────────────── */

/**
 * Anota un evento de uso. Nunca lanza, nunca avisa: si falla, se pierde
 * ese renglón de métricas y nada más — la app sigue exactamente igual.
 *
 * @param {string} tipo - 'vista' | 'accion' | 'busqueda' | 'asistente' | 'friccion' | 'error'
 * @param {string} nombre
 * @param {Object} [payload]
 * @returns {void}
 */
function registrarEvento(tipo, nombre, payload) {
  try {
    if (typeof USUARIO === 'undefined' || !USUARIO) return;

    const carga = Object.assign(
      {
        _sesion: SESION_DE_USO,
        // Contexto automático, gratis en cada evento: separa "modo
        // planificación" de "día del evento" sin que cada llamador
        // tenga que acordarse de mandarlo.
        _sin_senal: typeof SIN_LLEGADA !== 'undefined' ? !!SIN_LLEGADA : null,
        _dias_para_el_evento: diasParaElEvento(),
        _ancho_pantalla: window.innerWidth,
      },
      payload || {}
    );

    /* ⚡ LA TELEMETRÍA NO VIAJA EN LA COLA (2026-09-03)
     *
     * QUÉ PASABA
     * Esto usaba mandar(), que sin señal ENCOLA la escritura junto a los
     * pagos y los invitados. Un rato sin conexión acumulaba decenas de
     * eventos de métrica; al volver la señal se mandaban todos de golpe,
     * agotaban el techo de peticiones del servidor (300 cada 5 minutos
     * por IP) y volvían con 429 — y cada rechazo se apartaba en "Cambios
     * que el servidor rechazó", la bandeja donde Lucila tiene que ver
     * los cambios de VERDAD que se perdieron.
     *
     * Resultado: una lista de "metricas.php?accion=registrar ·
     * Demasiadas peticiones seguidas" que no le dice nada a nadie, y que
     * de paso empujaba fuera de la cuota a las peticiones que sí
     * importan.
     *
     * Un renglón de telemetría que no llega no es un cambio perdido: es
     * un renglón de telemetría que no llega. Sin cola, falla y se pierde
     * en silencio — que es exactamente lo que dice el comentario de
     * arriba de esta función, y lo que no estaba pasando. */
    mandarSinCola('metricas.php?accion=registrar', {
      tipo: tipo,
      nombre: nombre,
      payload: carga,
      pantalla: (typeof VISTA_ACTUAL !== 'undefined' && VISTA_ACTUAL) || '',
    }).catch(() => {});
  } catch (error) {
    // Telemetría: un fallo acá nunca debe notarse en la app.
  }
}

/**
 * Cuántos días faltan para la fiesta, redondeado. Negativo después del
 * 24 de octubre — sirve igual, para saber que ya se está viviendo el
 * día o el después.
 *
 * @returns {number|null}
 */
function diasParaElEvento() {
  try {
    const fecha = new Date(CONFIGURACION.fiesta.fechaYHora);
    return Math.round((fecha - new Date()) / 86400000);
  } catch (error) {
    return null;
  }
}


/* ─── 3. FRICCIÓN: ABRIR/CERRAR LO MISMO VARIAS VECES ──────────────── */

/** Cuándo se abrió cada cosa por última vez y cuántas veces seguidas,
    por clave libre que cada llamador elige (el nombre de la ficha, por
    ejemplo). */
const RASTRO_DE_ABRIR_CERRAR = {};

/**
 * Marca que se abrió algo identificado por `clave`, y avisa si es la
 * tercera vez o más en menos de 60 segundos — la señal de fricción de
 * "entrar a una ficha, salir, volver a entrar".
 *
 * @param {string} clave - Algo estable para eso, ej. 'invitado-45'.
 * @returns {void}
 */
function registrarAbrirDeNuevo(clave) {
  const ahora = Date.now();
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
