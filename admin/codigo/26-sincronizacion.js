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
const BD_OFFLINE_VERSION  = 2;

/** La conexión a IndexedDB, una sola vez por sesión. */
let _bdOffline = null;

/** Si ahora mismo se está mandando la cola (para no mandarla dos veces). */
let _sincronizando = false;

/**
 * Si la última llamada al servidor no llegó.
 *
 * Es la señal de conexión de verdad del panel, y le gana a
 * navigator.onLine porque se basa en lo único comprobado: que una
 * petición real funcionó o no. navigator.onLine solo mira si hay una
 * red enchufada, no si esa red llega a alguna parte —con el wifi de un
 * salón detrás de un portal, dice que sí mientras nada anda—.
 */
let SIN_LLEGADA = false;

/**
 * Anota si la última petición llegó al servidor o no.
 *
 * @param {boolean} llego
 * @returns {void}
 */
function anotarSiLlego(llego) {
  const antes = SIN_LLEGADA;
  SIN_LLEGADA = !llego;

  // Solo se repinta si cambió de verdad, para no tocar el DOM al pedo.
  if (antes !== SIN_LLEGADA) actualizarBannerConexion();

  // Volvió la señal: se aprovecha para mandar lo que haya esperando, y
  // para refrescar en silencio lo que se va a necesitar si se vuelve a
  // cortar (ver precalentarCopias()).
  if (antes && llego) {
    sincronizarCola();
    precalentarCopias();
  }
}


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
      // v2: cambios que el servidor rechazó de verdad (no por falta de
      // señal). Ver "apartarComoRechazado()" más abajo.
      if (!bd.objectStoreNames.contains('rechazados')) {
        bd.createObjectStore('rechazados', { keyPath: 'id', autoIncrement: true });
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


/* ─── 1B. DE QUIÉN SON ESTOS DATOS ─────────────────────────────────── */

/*
   POR QUÉ LA BASE LOCAL LLEVA DUEÑO

   Un teléfono lo puede usar más de una persona, y las cuentas de este
   panel no ven lo mismo: la de "entrada" no tiene por qué ver el
   presupuesto. Sin marcar de quién es cada cosa pasaban dos cosas feas:

     1. Lucila cerraba sesión, entraba otra persona, se caía la señal, y
        el panel le mostraba los datos cacheados de Lucila —incluidos
        los correos de todas las cuentas—.

     2. Peor: los cambios que quedaban sin mandar se mandaban con el
        token de QUIEN ESTUVIERA LOGUEADO DESPUÉS, porque la cola no
        guardaba de quién eran. La bitácora terminaba diciendo que los
        hizo la persona equivocada, que es justo lo único que las
        cuentas separadas tenían que garantizar.
*/

/** Cuántos días vale una copia guardada antes de tirarla. */
const DIAS_QUE_DURA_UNA_COPIA = 7;

/**
 * De quién es la sesión actual.
 *
 * @returns {number} 0 si no hay nadie identificado.
 */
function quienSoy() {
  return (USUARIO && Number(USUARIO.id)) || 0;
}

/**
 * Borra las copias de lectura. NO toca la cola.
 *
 * @returns {Promise<void>}
 */
async function borrarCopiasGuardadas() {
  try {
    await conAlmacen('lecturas', 'readwrite', s => s.clear());
  } catch (error) {
    // Si no se pudo, no hay nada mejor que hacer que seguir.
  }
}

/**
 * Se llama al abrir sesión: comprueba que lo guardado sea de esta cuenta.
 *
 * QUÉ SE BORRA Y QUÉ NO, Y POR QUÉ
 *
 * Al entrar alguien distinto se borran las COPIAS DE LECTURA. Son lo
 * que la app le mostraría en pantalla si se cae la señal, o sea lo
 * único que puede terminar viendo quien no debía.
 *
 * La COLA NO SE TOCA, ni siquiera la de otra persona. Ahí no hay datos
 * para mirar: hay trabajo sin guardar. Borrarla sería destruir cambios
 * que alguien dio por hechos, y esta app no tiene derecho a eso. Como
 * cada envío lleva anotado su dueño y sincronizarCola() solo manda los
 * propios, lo ajeno se queda quieto hasta que esa persona vuelva a
 * entrar, y entonces sale firmado por quien de verdad lo hizo.
 *
 * @returns {Promise<void>}
 */
async function prepararGuardadoParaLaSesion() {
  const yo = quienSoy();
  const dueno = Number(recordado('dueno-de-los-datos', 0));

  if (dueno !== yo) {
    await borrarCopiasGuardadas();
    recordar('dueno-de-los-datos', yo);
    return;
  }

  await tirarLasCopiasVencidas();
}

/**
 * Tira las copias más viejas que DIAS_QUE_DURA_UNA_COPIA.
 *
 * Se guardaba la fecha desde el principio pero nadie la miraba, así que
 * una copia de hace meses se seguía mostrando como si fuera de ayer.
 *
 * @returns {Promise<void>}
 */
async function tirarLasCopiasVencidas() {
  try {
    const todas = await conAlmacen('lecturas', 'readonly', s => s.getAll());
    const limite = Date.now() - DIAS_QUE_DURA_UNA_COPIA * 24 * 60 * 60 * 1000;

    for (const fila of todas) {
      if (!fila.guardado_en || fila.guardado_en < limite) {
        await conAlmacen('lecturas', 'readwrite', s => s.delete(fila.ruta));
      }
    }
  } catch (error) {
    // Ídem.
  }
}


/**
 * La marca de tiempo más nueva entre todas las copias guardadas, para
 * decir "de cuándo son los datos" en el banner sin conexión aunque
 * todavía no se haya intentado abrir ninguna vista en particular.
 *
 * @returns {Promise<number|null>}
 */
async function ultimaLecturaGuardadaEn() {
  try {
    const todas = await conAlmacen('lecturas', 'readonly', s => s.getAll());
    if (!todas.length) return null;
    return Math.max(...todas.map(f => f.guardado_en || 0));
  } catch (error) {
    return null;
  }
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
    store.put({
      ruta: ruta,
      datos: datos,
      guardado_en: Date.now(),
      // De quién son estos datos. Ver la sección 1B.
      usuario_id: quienSoy(),
    })
  ).catch(() => {});
  // Sin await ni manejo de error hacia afuera a propósito: guardar la
  // copia offline nunca debe frenar ni romper la pantalla que sí cargó.
}

/**
 * Busca la última copia guardada de una ruta, si es de esta sesión.
 *
 * @param {string} ruta
 * @returns {Promise<{datos: *, guardado_en: number}|null>}
 */
async function leerLectura(ruta) {
  try {
    const fila = await conAlmacen('lecturas', 'readonly', store => store.get(ruta));
    if (!fila) return null;

    /* Segundo cerrojo, además del borrado al cambiar de cuenta. Si por
       lo que sea quedó una copia de otra persona, no se muestra: más
       vale un error honesto que datos ajenos. */
    if (Number(fila.usuario_id || 0) !== quienSoy()) return null;

    // Vencida: se la trata como si no existiera.
    const limite = Date.now() - DIAS_QUE_DURA_UNA_COPIA * 24 * 60 * 60 * 1000;
    if (!fila.guardado_en || fila.guardado_en < limite) return null;

    return fila;
  } catch (error) {
    return null;
  }
}


/** Cuándo se avisó por última vez que se están viendo datos guardados. */
let ULTIMO_AVISO_DE_COPIA = 0;

/**
 * Avisa que lo que se está viendo es una copia, y de cuándo es.
 *
 * POR QUÉ IMPORTA DECIR LA HORA
 * Un panel que muestra datos viejos sin avisar es peor que uno que no
 * abre: se toman decisiones creyendo que son de ahora. "Datos de las
 * 14:30" deja decidir con la verdad a la vista.
 *
 * POR QUÉ NO SE AVISA EN CADA LLAMADA
 * Abrir una vista puede disparar cuatro lecturas juntas. Sin este freno
 * serían cuatro mensajes seguidos diciendo lo mismo.
 *
 * @param {number} guardadoEn - Marca de tiempo de cuando se guardó.
 * @returns {void}
 */
function avisarDatosGuardados(guardadoEn) {
  const ahora = Date.now();
  if (ahora - ULTIMO_AVISO_DE_COPIA < 8000) return;
  ULTIMO_AVISO_DE_COPIA = ahora;

  const cuando = new Date(guardadoEn || ahora);
  const hora = cuando.toLocaleTimeString(CONFIGURACION.dinero.region,
                                         { hour: '2-digit', minute: '2-digit' });

  /* Si la copia es de otro día, la hora sola engaña: a las 14:30 de un
     martes, "datos de las 14:30" parece de hace un rato aunque sea del
     jueves pasado. */
  const hoy = new Date();
  const esDeHoy = cuando.toDateString() === hoy.toDateString();

  avisar(esDeHoy
    ? 'Sin conexión. Estás viendo los datos de las ' + hora + '.'
    : 'Sin conexión. Estás viendo los datos del ' + comoFecha(cuando) + '.', true);
}


/* ─── 3. LA COLA DE CAMBIOS PENDIENTES ─────────────────────────────── */

/**
 * Inventa una clave única para un envío.
 *
 * Sirve para que el servidor reconozca un reintento y no guarde el mismo
 * cambio dos veces. Ver la tabla `escrituras_hechas` en migracion.sql.
 *
 * @returns {string}
 */
function claveDeEnvio() {
  /* crypto.randomUUID no existe en Safari viejos ni fuera de HTTPS, así
     que hay un respaldo. No hace falta que sea criptográfico: solo que
     dos envíos distintos no choquen. */
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();

  return 'k-' + Date.now().toString(36) + '-' +
         Math.random().toString(36).slice(2, 10);
}

/**
 * Anota un envío que no pudo salir por falta de señal.
 *
 * @param {string} ruta
 * @param {Object} cuerpo
 * @returns {Promise<number>} El id que le tocó en la cola.
 */
function encolarEscritura(ruta, cuerpo) {
  return conAlmacen('cola', 'readwrite', store =>
    store.add({
      ruta: ruta,
      /* La clave se pega al cuerpo acá, en el momento de encolar, y no
         al mandarlo. Es la diferencia entre que funcione y que no: si se
         inventara en cada intento de envío, cada reintento llevaría una
         clave distinta y el servidor los vería como cambios diferentes,
         que es exactamente el duplicado que se quiere evitar. */
      cuerpo: Object.assign({}, cuerpo, { _clave: claveDeEnvio() }),
      creado_en: Date.now(),
      /* Quién hizo este cambio. Es lo que impide que se mande con el
         token de otra persona y que la bitácora le eche la culpa a
         quien no fue. Ver la sección 1B. */
      usuario_id: quienSoy(),
    })
  );
}

/**
 * Todo lo que está esperando para mandarse, en el orden en que se hizo.
 *
 * @param {boolean} [soloMios=false] - Solo los de la sesión actual.
 * @returns {Promise<Array>}
 */
async function listarCola(soloMios) {
  const todos = await conAlmacen('cola', 'readonly', store => store.getAll());
  if (!soloMios) return todos;

  const yo = quienSoy();
  return todos.filter(i => Number(i.usuario_id || 0) === yo);
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
 * Aparta un cambio que el servidor rechazó de verdad (no por falta de
 * señal): un dato inválido, un permiso, un 500 real. Se saca de la cola
 * para que NO bloquee a los que vienen atrás, y se guarda con el motivo
 * real que dio el servidor, para poder revisarlo después. Nada se pierde
 * en silencio.
 *
 * @param {{ruta:string, cuerpo:Object, creado_en:number, usuario_id:number}} item
 * @param {ErrorDelServidor} error
 * @returns {Promise<void>}
 */
function apartarComoRechazado(item, error) {
  return conAlmacen('rechazados', 'readwrite', store =>
    store.add({
      ruta: item.ruta,
      cuerpo: item.cuerpo,
      creado_en: item.creado_en,
      usuario_id: item.usuario_id,
      rechazado_en: Date.now(),
      codigo_http: (error && error.codigo) || 0,
      mensaje_servidor: (error && error.message) || '',
    })
  );
}

/**
 * Los cambios apartados de esta cuenta, para mostrarlos en la campana
 * de avisos.
 *
 * @returns {Promise<Array>}
 */
async function listarRechazados() {
  try {
    const todos = await conAlmacen('rechazados', 'readonly', store => store.getAll());
    const yo = quienSoy();
    return todos.filter(i => Number(i.usuario_id || 0) === yo);
  } catch (error) {
    return [];
  }
}

/**
 * El usuario ya vio un rechazo y lo descarta.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
function borrarRechazado(id) {
  return conAlmacen('rechazados', 'readwrite', store => store.delete(id));
}

/**
 * Cuántos cambios están esperando.
 *
 * @returns {Promise<number>}
 */
async function contarCola() {
  try {
    const mios = await listarCola(true);
    return mios.length;
  } catch (error) {
    /* -1 y no 0: "no pude leer" no es "no hay nada". Devolviendo 0 el
       banner decía que estaba todo mandado cuando en realidad no se
       sabía, que es la clase de mentira que hace perder datos. */
    return -1;
  }
}


/* ─── 4. MANDAR LA COLA CUANDO VUELVE LA SEÑAL ─────────────────────── */

/**
 * Manda, uno por uno y en orden, todo lo que quedó pendiente.
 *
 * Si uno falla por falta de señal, se corta ahí: los que ya se mandaron
 * no se vuelven a mandar, y los que faltan (incluido ese) esperan a la
 * próxima vez. Pero si uno falla porque el SERVIDOR LO RECHAZA de
 * verdad —un dato inválido, un permiso, un 500 real—, seguir cortando
 * ahí sería dejar la cola trabada para siempre por un solo cambio malo:
 * en vez de eso, ese cambio se aparta (ver apartarComoRechazado()) y se
 * sigue con los demás, que no tienen ninguna culpa.
 *
 * @returns {Promise<void>}
 */
async function sincronizarCola() {
  /* Se intenta aunque navigator.onLine diga que no hay red: ese valor
     se equivoca en los dos sentidos —dice que sí con un portal cautivo,
     y a veces dice que no cuando la señal ya volvió—. Si de verdad no
     hay, el primer envío falla y todo queda esperando, que es
     exactamente lo que corresponde. Intentar de más no cuesta nada;
     no intentar deja los cambios sin mandar. */
  if (_sincronizando) return;

  /* SOLO LOS CAMBIOS DE ESTA SESIÓN.
   *
   * Antes se mandaba todo lo que hubiera, y como pedir() pone el token
   * de quien está logueado AHORA, los cambios que había dejado otra
   * persona salían firmados con la cuenta equivocada. La bitácora
   * —que es la única razón por la que hay cuentas separadas— terminaba
   * mintiendo sobre quién hizo qué.
   *
   * Lo ajeno no se borra: espera a que esa persona vuelva a entrar. */
  const pendientes = await listarCola(true).catch(() => []);
  if (!pendientes.length) return;

  _sincronizando = true;
  actualizarBannerConexion();

  let mandados = 0;
  let apartados = 0;
  for (const item of pendientes) {
    try {
      // _sync avisa a pedir() que esto YA viene de la cola: si vuelve a
      // fallar por señal, hay que dejarlo en la cola y no duplicarlo.
      await pedir(item.ruta, { metodo: 'POST', cuerpo: item.cuerpo, _sync: true });
      await borrarDeCola(item.id);
      mandados++;
    } catch (error) {
      // codigo 0 = no llegó al servidor (sin señal, se acabó el tiempo):
      // se corta acá y este item y los siguientes esperan a la próxima.
      // codigo 401 = la sesión ya no vale: seguir mandando con ella no
      // tiene sentido, y pedir() ya mandó al login por su cuenta.
      if (!error || error.codigo === 0 || error.codigo === 401) break;

      // Cualquier otro código es el servidor rechazando ESTE cambio en
      // particular: se aparta con su motivo real y se sigue con el resto.
      await apartarComoRechazado(item, error);
      await borrarDeCola(item.id);
      apartados++;
    }
  }

  _sincronizando = false;
  actualizarBannerConexion();
  actualizarBurbujaCola();

  if (mandados || apartados) {
    let texto;
    if (mandados && apartados) {
      texto = 'Se mandaron ' + mandados + ' cambios' +
        (mandados === 1 ? '' : '') + '. ' +
        (apartados === 1
          ? '1 cambio no se pudo mandar y quedó apartado en Avisos.'
          : apartados + ' cambios no se pudieron mandar y quedaron apartados en Avisos.');
    } else if (mandados) {
      texto = mandados === 1
        ? 'Se mandó 1 cambio que había quedado pendiente.'
        : 'Se mandaron ' + mandados + ' cambios que habían quedado pendientes.';
    } else {
      texto = apartados === 1
        ? 'El servidor rechazó 1 cambio. Quedó apartado en Avisos para revisarlo.'
        : 'El servidor rechazó ' + apartados + ' cambios. Quedaron apartados en Avisos para revisarlos.';
    }
    avisar(texto, !mandados && !!apartados);

    // La marca "Pendiente" de A1 (36-optimista.js) ya cumplió su función:
    // lo que sigue es una recarga completa, que trae la verdad del server.
    if (typeof limpiarPendientesOptimistas === 'function') limpiarPendientesOptimistas();

    // Lo que se ve en pantalla puede haber quedado desactualizado
    // mientras se estaba offline: se vuelve a pedir todo.
    ['resumen', 'invitados', 'dinero', 'evento'].forEach(v => ensuciarVistas(v));
    if (VISTAS[VISTA_ACTUAL]) irA(VISTA_ACTUAL, true);
  }
}

/**
 * Sincroniza a pedido, con el giro del ícono mientras dura.
 *
 * Usada por el botón del encabezado (05-navegacion.js) y por la
 * herramienta "Sincronizar ahora" del sandwich del FAB (29-fab.js):
 * un solo lugar para no repetir la misma lógica dos veces.
 *
 * sincronizarCola() nunca tira error (si no hay señal, deja todo
 * esperando en silencio) y ya avisa sola cuando manda algo. Esta
 * función solo agrega el único caso que ella no cubre: decir que no
 * había nada pendiente, para quien igual quiere la confirmación.
 *
 * @param {Element} [boton] - Si viene, gira mientras sincroniza.
 * @returns {Promise<void>}
 */
async function sincronizarAhora(boton) {
  if (boton) boton.classList.add('boton-icono--girando');

  const antes = await contarCola();
  await sincronizarCola();
  await actualizarBannerConexion();
  if (antes <= 0) avisar('Ya estaba todo al día.');

  if (boton) boton.classList.remove('boton-icono--girando');
}


/**
 * El texto canónico de "cómo está la conexión ahora mismo", con la hora
 * real de la última copia si hay una. Lo usan el banner de arriba
 * (actualizarBannerConexion()) y la pantalla Hoy (30-vista-hoy.js), para
 * que digan siempre la misma frase.
 *
 * @returns {Promise<string>}
 */
async function textoDeConexionConHora() {
  if (!(SIN_LLEGADA || !navigator.onLine)) return 'En línea';

  const guardadoEn = await ultimaLecturaGuardadaEn();
  if (!guardadoEn) return 'Sin señal — sin copia guardada todavía.';

  const hora = new Date(guardadoEn).toLocaleTimeString(
    CONFIGURACION.dinero.region, { hour: '2-digit', minute: '2-digit' });
  return 'Sin señal — última copia guardada ' + hora + '.';
}

/**
 * Pinta la burbuja de #boton-sincronizar con cuántos cambios quedan por
 * mandar. NUNCA comparte contador con #burbuja-campana (C2): esta cuenta
 * cambios sin mandar, la campana cuenta avisos. -1 (no se pudo leer la
 * cola) se muestra igual que 0, oculta: mostrar un número inventado
 * sería peor que no mostrar nada.
 *
 * @returns {Promise<void>}
 */
async function actualizarBurbujaCola() {
  const n = await contarCola();
  ponerBurbuja('#burbuja-cola', n < 0 ? 0 : n);
}


/* ─── 5. EL AVISO DE ARRIBA ────────────────────────────────────────── */

/**
 * Pinta (o esconde) el cartel de conexión, según cómo esté todo.
 *
 * @returns {Promise<void>}
 */
async function actualizarBannerConexion() {
  actualizarBurbujaCola();

  const banner = buscar('#banner-conexion');
  if (!banner) return;

  /* SIN_LLEGADA primero: es lo comprobado. navigator.onLine se mira
     también porque avisa apenas se apaga el wifi, sin esperar a que
     falle una petición. */
  if (SIN_LLEGADA || !navigator.onLine) {
    const guardadoEn = await ultimaLecturaGuardadaEn();
    const antiguedad = guardadoEn
      ? ' Datos de las ' + new Date(guardadoEn).toLocaleTimeString(
          CONFIGURACION.dinero.region, { hour: '2-digit', minute: '2-digit' }) + '.'
      : '';

    banner.textContent = 'Sin conexión — viendo la última copia guardada.' +
                          antiguedad +
                          ' Lo que cambies se manda solo cuando vuelva la señal.';
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

  // -1 es "no pude leer la cola", que no es lo mismo que "no hay nada".
  if (cuantos < 0) {
    banner.textContent = 'No pude comprobar si quedaron cambios por mandar.';
    banner.classList.remove('oculto');
    banner.classList.add('banner-conexion--sincronizando');
    return;
  }

  if (cuantos > 0) {
    banner.textContent = cuantos === 1
      ? 'Hay 1 cambio por mandar.'
      : 'Hay ' + cuantos + ' cambios por mandar.';
    banner.classList.remove('oculto');
    banner.classList.add('banner-conexion--sincronizando');
    return;
  }

  banner.classList.add('oculto');
}

/* ─── 6. PRECALENTAR (Fase 8 del rediseño) ─────────────────────────── */

/* El caché de arriba es genérico y funciona bien, pero solo guarda copia
   de lo que se pidió online alguna vez en los últimos 7 días. Mesas, por
   ejemplo, es una sección dentro de Gente que encadena dos pedidos
   (evento.php + mesas.php) — si nunca se abrió con señal, no hay nada
   que mostrar sin ella. Esta función pide en silencio, por detrás, las
   rutas que arman cada sección, para que abrirlas sin conexión muestre
   la última copia en vez de un error.

   Correo queda afuera a propósito: abre una conexión IMAP real y tarda
   segundos — precalentarlo en cada arranque castigaría el arranque por
   una sección que además no sirve de nada sin red. */

/** Las rutas que hace falta tener guardadas para que cada sección abra
    sin señal. Ver 26-sincronizacion.js:26 (por qué acá y no en 03). */
const RUTAS_A_PRECALENTAR = [
  'evento.php?accion=todo',
  'mesas.php?accion=todo',
  'confirmaciones.php?accion=listar',
  'estadisticas.php',
  'presupuesto.php?accion=todo',
  'planificador.php?accion=todo',
  'hoy.php',
  'contactos.php?accion=todos',
  'llegadas.php?accion=ultimas&cuantas=10',
];

/** Para no lanzar dos precalentamientos a la vez (arranque + reconexión
    casi juntos, por ejemplo). */
let _precalentando = false;

/**
 * Pide en segundo plano las rutas de RUTAS_A_PRECALENTAR, una por una,
 * para que queden guardadas por si se pierde la señal. No bloquea nada,
 * no avisa nada, y una ruta que falle no frena a las demás.
 *
 * @returns {Promise<void>}
 */
async function precalentarCopias() {
  if (_precalentando || SIN_LLEGADA) return;
  _precalentando = true;

  try {
    for (const ruta of RUTAS_A_PRECALENTAR) {
      try {
        // sinSesion:false (el respaldo) exige token, que es justo lo que
        // hace falta: sin sesión no hay nada propio que precalentar.
        await traer(ruta);
      } catch (error) {
        // Una ruta caída (sección sin datos todavía, permiso, lo que
        // sea) no debe frenar el resto.
      }
      // Pausa corta entre una y otra: nueve pedidos de golpe se sienten
      // en una red de salón compartida, aunque sea en silencio.
      await new Promise(resolver => setTimeout(resolver, 400));
    }
  } finally {
    _precalentando = false;
  }
}


/* ─── 7. REFRESCO PERIÓDICO (Fase 1 del rediseño, F1) ──────────────── */

/* Con señal, lo que se está mirando puede quedar viejo sin que nadie
   toque nada: otra persona confirma, marca un pago, escanea un pase.
   Los listeners de abajo (online / visibilitychange) ya cubren "volver
   a la app", pero no "quedarse quieto mirando Hoy durante diez
   minutos". Esto cubre ese hueco sin pisar nada de lo que ya hace la
   cola: se salta solo si no hay señal, si la pestaña está oculta, o si
   ya hay una sincronización en curso. */

/** Entre 60 y 120s pide el mega-prompt; 90 es el punto medio. */
const INTERVALO_REFRESCO_MS = 90000;

let _temporizadorRefresco = null;

/**
 * Arranca el refresco periódico de la vista actual. Se llama una sola
 * vez, desde arrancarLaApp() (20-arranque.js).
 *
 * @returns {void}
 */
function arrancarRefrescoPeriodico() {
  if (_temporizadorRefresco) return;

  _temporizadorRefresco = setInterval(() => {
    if (SIN_LLEGADA) return;
    if (document.hidden) return;
    if (_sincronizando) return; // no competir con la cola al reconectar
    if (!VISTAS[VISTA_ACTUAL]) return;

    ensuciarVistas(VISTA_ACTUAL);
    irA(VISTA_ACTUAL, true);
  }, INTERVALO_REFRESCO_MS);
}


window.addEventListener('online',  () => { actualizarBannerConexion(); sincronizarCola(); });
window.addEventListener('offline', () => actualizarBannerConexion());

/* Volver a la app después de un rato también dispara el reintento.
   En Android el evento 'online' no siempre salta al recuperar señal
   móvil, así que sin esto la cola podía quedarse esperando para
   siempre en el teléfono de alguien que nunca cierra la app. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    actualizarBannerConexion();
    sincronizarCola();
  }
});
