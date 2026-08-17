/* ══════════════════════════════════════════════════════════════════════
   36 · UI OPTIMISTA

   QUÉ HACE ESTE ARCHIVO
   Cuando Lucila edita algo, el panel deja de decir "un segundo..." y
   confía en el cambio de una vez: lo aplica en memoria, lo repinta, y
   recién ahí lo manda de verdad. Si el envío se cae por falta de señal,
   la fila se queda marcada "Pendiente" hasta que sincronizarCola() (ver
   26-sincronizacion.js) consiga mandarla.

   POR QUÉ NO ES SOLO "PINTAR ANTES DE MANDAR"
   pedir() (03-servidor.js) ya sabe distinguir sin señal de un rechazo de
   verdad del servidor (ErrorDelServidor.codigo === 0 vs > 0). Este
   archivo se apoya en esa distinción para decidir si la marca
   "Pendiente" se queda (sin señal: se va a mandar sola) o se quita y se
   avisa el error (el servidor lo rechazó, no tiene sentido fingir que
   está en curso).

   CARGA DESPUÉS de 26-sincronizacion.js (usa pedir()) y ANTES de
   20-arranque.js. Ver el orden completo en index.html.
   ══════════════════════════════════════════════════════════════════════ */


/** IDs de fila que están esperando que su cambio salga de verdad. */
const IDS_PENDIENTES = new Set();

/**
 * Si esta fila tiene un cambio esperando salir.
 *
 * @param {number|string} id
 * @returns {boolean}
 */
function esFilaPendiente(id) {
  return IDS_PENDIENTES.has(Number(id));
}

/**
 * Aplica un cambio de forma optimista: muta la memoria, repinta, y solo
 * después manda el cambio real al servidor.
 *
 * @param {string} ruta - Igual que para mandar(), ej. 'confirmaciones.php?accion=editar'.
 * @param {Object} cuerpo
 * @param {Object} opciones
 * @param {Function} [opciones.mutar] - Aplica el cambio en la variable
 *   global de memoria (INVITADOS, etc) ANTES de mandar nada.
 * @param {Function} [opciones.repintar] - Vuelve a dibujar la lista/vista
 *   afectada. Se llama después de mutar() y otra vez al resolverse.
 * @param {number|string} [opciones.idFila] - Para marcar/desmarcar la
 *   fila como "Pendiente" mientras el envío está en curso o encolado.
 * @returns {Promise<{ok:boolean, offline:boolean}>}
 * @throws {ErrorDelServidor} Si el servidor rechazó el cambio de verdad
 *   (no por falta de señal) — quien llama debe avisar con error.message.
 */
async function aplicarOptimista(ruta, cuerpo, opciones) {
  const { mutar, repintar, idFila } = opciones || {};

  if (typeof mutar === 'function') mutar();
  if (idFila != null) IDS_PENDIENTES.add(Number(idFila));
  if (typeof repintar === 'function') repintar();

  try {
    const resultado = await pedir(ruta, { metodo: 'POST', cuerpo: cuerpo });

    if (resultado && resultado._offline) {
      // Sin señal: pedir() ya lo encoló. Sigue "Pendiente" hasta que
      // sincronizarCola() lo mande y llame limpiarPendientesOptimistas().
      return { ok: true, offline: true };
    }

    // Se mandó de verdad, ya no hace falta la marca.
    if (idFila != null) IDS_PENDIENTES.delete(Number(idFila));
    if (typeof repintar === 'function') repintar();
    return { ok: true, offline: false };
  } catch (error) {
    // El servidor respondió y lo rechazó (dato inválido, permiso, etc):
    // no tiene sentido dejarlo "Pendiente" como si se fuera a resolver
    // solo. Se quita la marca y se deja que quien llamó avise el error.
    if (idFila != null) IDS_PENDIENTES.delete(Number(idFila));
    if (typeof repintar === 'function') repintar();
    throw error;
  }
}

/**
 * Borra todas las marcas "Pendiente". Se llama desde sincronizarCola()
 * (26-sincronizacion.js) apenas mandó algo de verdad: en ese momento la
 * vista se vuelve a pedir entera (ensuciarVistas + irA(recargar)), así
 * que cualquier marca vieja quedaría mintiendo si no se limpia acá.
 *
 * @returns {void}
 */
function limpiarPendientesOptimistas() {
  IDS_PENDIENTES.clear();
}
