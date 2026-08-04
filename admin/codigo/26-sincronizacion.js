/* ══════════════════════════════════════════════════════════════════════
   26 · SINCRONIZACIÓN OFFLINE

   QUÉ HACE ESTE ARCHIVO
   Deja usar el panel sin señal: guarda en el teléfono (IndexedDB) todo lo
   que ya se leyó, y si Lucila hace un cambio sin conexión, lo anota en
   una cola y lo manda solo apenas vuelve la señal.

   CÓMO SE ENGANCHA CON EL RESTO
   No toca las vistas. pedir(), en 03-servidor.js, es el ÚNICO lugar por
   donde pasa cada llamada a la API — así que ahí se enganchan las dos
   puntas:
     · Después de un GET que salió bien, se guarda una copia acá.
     · Si un GET falla por falta de señal, se devuelve esa copia en vez
       del error.
     · Si un POST falla por falta de señal, se guarda en la cola en vez
       de perderse, y se avisa que se va a mandar solo.

   POR QUÉ SOLO SE ACTÚA CUANDO EL TELÉFONO DICE "SIN SEÑAL"
   navigator.onLine es la única pista confiable de que esto es una caída
   de conexión y no un error real del servidor. Si el servidor devuelve
   un 500 estando online, hay que mostrar el error de siempre, no
   esconderlo en la cola.

   ÍNDICE
     1. La base (IndexedDB)
     2. Guardar y leer lo último visto
     3. La cola de cambios pendientes
     4. Mandar la cola cuando vuelve la señal
     5. El aviso de arriba
   ══════════════════════════════════════════════════════════════════════ */


const BD_OFFLINE_NOMBRE   = 'ania-admin-offline';
const BD_OFFLINE_VERSION  = 1;

/** La conexión a IndexedDB, una sola vez por sesión. */
let _bdOffline = null;

/** Si ahora mismo se está mandando la cola (para no mandarla dos veces). */
let _sincronizando = false;


/* ─── 1. LA BASE (INDEXEDDB) ───────────────────────────────────────── */

/**
 * Abre (o crea) la base de datos del teléfono.
 *
 * @returns {Promise<IDBDatabase>}
 */
function abrirBdOffline() {
  if (_bdOffline) return Promise.resolve(_bdOffline);

  return new Promise((resolver, rechazar) => {
    if (!('indexedDB' in window)) {
      rechazar(new Error('Este navegador no guarda datos offline.'));
      return;
    }

    const pedido = indexedDB.open(BD_OFFLINE_NOMBRE, BD_OFFLINE_VERSION);

    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains('lecturas')) {
        bd.createObjectStore('lecturas', { keyPath: 'ruta' });
      }
      if (!bd.objectStoreNames.contains('cola')) {
        bd.createObjectStore('cola', { keyPath: 'id', autoIncrement: true });
      }
    };

    pedido.onsuccess = () => { _bdOffline = pedido.result; resolver(_bdOffline); };
    pedido.onerror   = () => rechazar(pedido.error);
  });
}

/**
 * Envuelve una transacción para no repetir el mismo try/catch siempre.
 *
 * @param {string} almacen
 * @param {'readonly'|'readwrite'} modo
 * @param {(store: IDBObjectStore) => IDBRequest} accion
 * @returns {Promise<*>}
 */
async function conAlmacen(almacen, modo, accion) {
  const bd = await abrirBdOffline();
  return new Promise((resolver, rechazar) => {
    const tx    = bd.transaction(almacen, modo);
    const store = tx.objectStore(almacen);
    const pedido = accion(store);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror   = () => rechazar(pedido.error);
  });
}


/* ─── 2. GUARDAR Y LEER LO ÚLTIMO VISTO ────────────────────────────── */

/**
 * Guarda la última respuesta buena de una ruta GET.
 *
 * @param {string} ruta
 * @param {*} datos
 * @returns {void}
 */
function guardarLectura(ruta, datos) {
  conAlmacen('lecturas', 'readwrite', store =>
    store.put({ ruta: ruta, datos: datos, guardado_en: Date.now() })
  ).catch(() => {});
  // Sin await ni manejo de error hacia afuera a propósito: guardar la
  // copia offline nunca debe frenar ni romper la pantalla que sí cargó.
}

/**
 * Busca la última copia guardada de una ruta.
 *
 * @param {string} ruta
 * @returns {Promise<{datos: *, guardado_en: number}|null>}
 */
async function leerLectura(ruta) {
  try {
    const fila = await conAlmacen('lecturas', 'readonly', store => store.get(ruta));
    return fila || null;
  } catch (error) {
    return null;
  }
}


/* ─── 3. LA COLA DE CAMBIOS PENDIENTES ─────────────────────────────── */

/**
 * Anota un envío que no pudo salir por falta de señal.
 *
 * @param {string} ruta
 * @param {Object} cuerpo
 * @returns {Promise<number>} El id que le tocó en la cola.
 */
function encolarEscritura(ruta, cuerpo) {
  return conAlmacen('cola', 'readwrite', store =>
    store.add({ ruta: ruta, cuerpo: cuerpo, creado_en: Date.now() })
  );
}

/**
 * Todo lo que está esperando para mandarse, en el orden en que se hizo.
 *
 * @returns {Promise<Array>}
 */
function listarCola() {
  return conAlmacen('cola', 'readonly', store => store.getAll());
}

/**
 * Saca un envío de la cola porque ya se mandó.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
function borrarDeCola(id) {
  return conAlmacen('cola', 'readwrite', store => store.delete(id));
}

/**
 * Cuántos cambios están esperando.
 *
 * @returns {Promise<number>}
 */
async function contarCola() {
  try {
    const todos = await listarCola();
    return todos.length;
  } catch (error) {
    return 0;
  }
}


/* ─── 4. MANDAR LA COLA CUANDO VUELVE LA SEÑAL ─────────────────────── */

/**
 * Manda, uno por uno y en orden, todo lo que quedó pendiente.
 *
 * Si uno falla (por ejemplo porque el servidor lo rechaza, no por falta
 * de señal), se corta ahí: los que ya se mandaron no se vuelven a
 * mandar, y los que faltan esperan a la próxima vez. Así nunca se manda
 * un cambio dos veces ni se pierde el orden en que se hicieron.
 *
 * @returns {Promise<void>}
 */
async function sincronizarCola() {
  if (_sincronizando || !navigator.onLine) return;

  const pendientes = await listarCola().catch(() => []);
  if (!pendientes.length) return;

  _sincronizando = true;
  actualizarBannerConexion();

  let mandados = 0;
  for (const item of pendientes) {
    try {
      // _sync avisa a pedir() que esto YA viene de la cola: si vuelve a
      // fallar por señal, hay que dejarlo en la cola y no duplicarlo.
      await pedir(item.ruta, { metodo: 'POST', cuerpo: item.cuerpo, _sync: true });
      await borrarDeCola(item.id);
      mandados++;
    } catch (error) {
      break;
    }
  }

  _sincronizando = false;
  actualizarBannerConexion();

  if (mandados) {
    avisar(mandados === 1
      ? 'Se mandó 1 cambio que había quedado pendiente.'
      : 'Se mandaron ' + mandados + ' cambios que habían quedado pendientes.');

    // Lo que se ve en pantalla puede haber quedado desactualizado
    // mientras se estaba offline: se vuelve a pedir todo.
    ['resumen', 'invitados', 'dinero', 'evento'].forEach(v => ensuciarVistas(v));
    if (VISTAS[VISTA_ACTUAL]) irA(VISTA_ACTUAL, true);
  }
}


/* ─── 5. EL AVISO DE ARRIBA ────────────────────────────────────────── */

/**
 * Pinta (o esconde) el cartel de conexión, según cómo esté todo.
 *
 * @returns {Promise<void>}
 */
async function actualizarBannerConexion() {
  const banner = buscar('#banner-conexion');
  if (!banner) return;

  if (!navigator.onLine) {
    banner.textContent = 'Sin conexión — viendo la última copia guardada. ' +
                          'Lo que cambies se manda solo cuando vuelva la señal.';
    banner.classList.remove('oculto', 'banner-conexion--sincronizando');
    return;
  }

  if (_sincronizando) {
    banner.textContent = 'Volvió la señal: mandando lo que quedó pendiente…';
    banner.classList.remove('oculto');
    banner.classList.add('banner-conexion--sincronizando');
    return;
  }

  const cuantos = await contarCola();
  if (cuantos) {
    banner.textContent = cuantos === 1
      ? 'Hay 1 cambio por mandar.'
      : 'Hay ' + cuantos + ' cambios por mandar.';
    banner.classList.remove('oculto');
    banner.classList.add('banner-conexion--sincronizando');
    return;
  }

  banner.classList.add('oculto');
}

window.addEventListener('online',  () => { actualizarBannerConexion(); sincronizarCola(); });
window.addEventListener('offline', () => actualizarBannerConexion());
