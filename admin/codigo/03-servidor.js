/* ══════════════════════════════════════════════════════════════════════
   03 · SERVIDOR

   QUÉ ES ESTE ARCHIVO
   El único lugar del panel que habla con la API. Todas las vistas piden
   sus datos a través de estas funciones y ninguna llama a fetch() por su
   cuenta.

   POR QUÉ TODO PASA POR ACÁ
   Porque hay cuatro cosas que hay que hacer SIEMPRE, en cada llamada, y
   si cada vista las hiciera por su cuenta, tarde o temprano una se
   olvidaría de alguna:
     · Poner el token de la sesión.
     · Cortar la espera si el servidor no contesta.
     · Detectar que la sesión venció y mandar al login.
     · Traducir cualquier falla a un mensaje que se entienda.

   EL FORMATO QUE DEVUELVE EL SERVIDOR
   Siempre el mismo, lo arma responder.php:
     Bien: { ok: true,  datos: ... }
     Mal:  { ok: false, error: "texto" }
   ══════════════════════════════════════════════════════════════════════ */


/* ─── EL TOKEN ─────────────────────────────────────────────────────── */

/**
 * Devuelve el token guardado, o null si no hay sesión.
 *
 * @returns {string|null}
 */
function tokenGuardado() {
  return recordado('token', null);
}

/**
 * Guarda el token de una sesión recién abierta.
 *
 * @param {string} token
 * @returns {void}
 */
function guardarToken(token) {
  recordar('token', token);
}

/**
 * Borra el token. Se usa al salir y cuando el servidor lo rechaza.
 *
 * @returns {void}
 */
function borrarToken() {
  olvidar('token');
  olvidar('usuario');
}


/* ─── LA LLAMADA ───────────────────────────────────────────────────── */

/**
 * Error propio del panel, con el código HTTP adentro.
 *
 * Tener una clase propia permite que quien llama distinga un 401 (sesión
 * vencida) de un 500 (falla del servidor) sin adivinar por el texto.
 */
class ErrorDelServidor extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'ErrorDelServidor';
    this.codigo = codigo || 0;
  }
}

/**
 * Llama a la API.
 *
 * @param {string} ruta - 'confirmaciones.php?accion=listar'
 * @param {Object} [opciones]
 * @param {string} [opciones.metodo='GET']
 * @param {Object} [opciones.cuerpo] - Se manda como JSON.
 * @param {boolean} [opciones.sinSesion=false] - Para el login.
 * @param {boolean} [opciones.noEncolar=false] - Que falle en vez de
 *        guardarse para más tarde. Para lo que no tiene sentido
 *        reintentar después, como cerrar sesión.
 * @returns {Promise<*>} El contenido de "datos".
 * @throws {ErrorDelServidor}
 *
 * @example
 *   const lista = await pedir('confirmaciones.php?accion=listar');
 *   await pedir('planificador.php?accion=guardar_nota', {
 *     metodo: 'POST',
 *     cuerpo: { titulo: 'Llamar al DJ' },
 *   });
 */
async function pedir(ruta, opciones) {
  const config = opciones || {};
  const metodo = config.metodo || 'GET';

  // Fase 8: cuánto tarda de verdad cada endpoint. Arranca acá, antes de
  // cualquier otra cosa, para que el tiempo de espera del token o del
  // AbortController no se le sume a lo que tarda el servidor.
  const empezoEn = Date.now();

  const cabeceras = {};
  if (config.cuerpo) cabeceras['Content-Type'] = 'application/json';

  if (!config.sinSesion) {
    const token = tokenGuardado();
    if (!token) {
      // Sin token no tiene sentido ni salir a la red.
      manejarSesionVencida();
      throw new ErrorDelServidor('No hay sesión iniciada.', 401);
    }
    cabeceras['Authorization'] = 'Bearer ' + token;
  }

  // AbortController es lo que corta la espera. Sin esto, con mala señal
  // el girador daría vueltas para siempre y parecería que la app colgó.
  const cortador = new AbortController();
  const reloj = setTimeout(
    () => cortador.abort(),
    CONFIGURACION.servidor.segundosDeEspera * 1000
  );

  let respuesta;
  try {
    respuesta = await fetch(CONFIGURACION.servidor.base + ruta, {
      method: metodo,
      headers: cabeceras,
      body: config.cuerpo ? JSON.stringify(config.cuerpo) : undefined,
      signal: cortador.signal,
      // Que el navegador no sirva una copia vieja por su cuenta.
      cache: 'no-store',
    });
  } catch (error) {
    clearTimeout(reloj);

    const seAcaboElTiempo = error.name === 'AbortError';

    // No llegó al servidor: el banner tiene que reflejarlo.
    anotarSiLlego(false);

    /* ⚠️ NO SE PREGUNTA POR navigator.onLine, Y ES A PROPÓSITO.
     *
     * Ese valor solo sabe si hay una red enchufada, no si esa red llega
     * a algún lado. Con el wifi de un salón que pide contraseña en un
     * portal, o con datos móviles saturados, dice `true` mientras nada
     * funciona. Confiando en él, el rescate no se activaba y el cambio
     * se perdía con un mensaje de "revisa tu internet".
     *
     * Lo que sí es información honesta es que la petición FALLÓ: se
     * cortó por tiempo o murió en la red. En los dos casos no hay
     * servidor del otro lado, que es lo único que hacía falta saber.
     *
     * Que el timeout entre acá también es la mitad del arreglo: antes
     * el AbortError salía por su cuenta unas líneas más arriba, así que
     * en un salón lleno se esperaban veinte segundos para ver un error
     * TENIENDO la copia guardada en el teléfono.
     *
     * Lo único que se excluye es lo que ya viene de la cola
     * (config._sync): ahí conviene que falle, para que sincronizarCola()
     * lo deje esperando en vez de darlo por mandado. */
    if (!config._sync && !config.noEncolar) {
      if (metodo === 'GET') {
        const copia = await leerLectura(ruta);
        if (copia) {
          actualizarBannerConexion();
          avisarDatosGuardados(copia.guardado_en);
          return copia.datos;
        }
      } else if (config.cuerpo) {
        await encolarEscritura(ruta, config.cuerpo);
        actualizarBannerConexion();
        // El "mensaje" genérico es para las vistas que hacen
        // avisar(r.mensaje) después de guardar: sin esto, mostrarían
        // "undefined" en vez de una frase con sentido.
        return { _offline: true, mensaje: 'Sin conexión: se guardó y se va a mandar solo.' };
      }
    }

    /* No había copia de qué agarrarse. Recién acá se distingue el
       motivo, porque ahora sí cambia qué conviene hacer: si se acabó el
       tiempo, reintentar puede servir; si no hay red, hay que esperar. */
    throw new ErrorDelServidor(
      seAcaboElTiempo
        ? 'El servidor tardó demasiado. Prueba de nuevo.'
        : 'Sin conexión. Revisa tu internet.',
      0
    );
  }
  clearTimeout(reloj);

  /* Contestó el servidor —aunque sea con un error suyo—, o sea que hay
     camino hasta él. Si veníamos de una racha sin señal, esto además
     dispara el envío de lo que haya quedado en la cola. */
  anotarSiLlego(true);

  /* Fase 8: solo se anota lo que tardó de verdad — de otro modo la
     tabla se infla con miles de filas de 200ms que no dicen nada nuevo.
     metricas.php queda afuera a propósito: es la propia llamada que
     mandaría este evento, y medirse a sí misma no aporta nada. */
  const tardoMs = Date.now() - empezoEn;
  if (tardoMs > 1500 && !ruta.startsWith('metricas.php')) {
    registrarEvento('accion', 'endpoint_lento', { ruta: ruta, ms: tardoMs });
  }

  /* La respuesta debería ser JSON siempre. Si no lo es, casi seguro que
     el servidor devolvió una página de error de Apache o de PHP: se
     avisa con un mensaje claro en vez de reventar al parsear. */
  let carga;
  try {
    carga = await respuesta.json();
  } catch (error) {
    throw new ErrorDelServidor(
      'El servidor respondió algo inesperado (código ' + respuesta.status + ').',
      respuesta.status
    );
  }

  if (respuesta.status === 401 && !config.sinSesion) {
    manejarSesionVencida();
    throw new ErrorDelServidor(carga.error || 'Tu sesión expiró.', 401);
  }

  if (!respuesta.ok || carga.ok === false) {
    throw new ErrorDelServidor(
      carga.error || 'No se pudo completar la operación.',
      respuesta.status
    );
  }

  // Se guarda una copia de toda lectura que salió bien, para poder
  // mostrarla si la próxima vez no hay señal.
  if (metodo === 'GET') guardarLectura(ruta, carga.datos);

  return carga.datos;
}


/* ─── ATAJOS ───────────────────────────────────────────────────────── */

/**
 * Atajo de lectura.
 *
 * @param {string} ruta
 * @returns {Promise<*>}
 */
function traer(ruta) {
  return pedir(ruta);
}

/**
 * Atajo de escritura.
 *
 * @param {string} ruta
 * @param {Object} cuerpo
 * @returns {Promise<*>}
 */
function mandar(ruta, cuerpo) {
  return pedir(ruta, { metodo: 'POST', cuerpo: cuerpo });
}

/**
 * Igual que mandar(), pero sin la cola de escrituras pendientes.
 *
 * POR QUÉ EXISTE
 * La cola está pensada para escrituras de negocio: un pago, un
 * invitado, una tarea. Ahí, guardar y mandar más tarde es exactamente
 * lo que se quiere. Un mensaje de chat no funciona así: contestar
 * dentro de veinte minutos, cuando vuelva la señal y ya no venga a
 * cuento, no le sirve a nadie — y mientras tanto el hilo se queda mudo,
 * porque el mensaje "se mandó" y nunca falló, así que el relevo sin
 * internet no llegaba a activarse nunca.
 *
 * Sin cola, la falta de señal falla de verdad, y ese error es la señal
 * que hace entrar a los agentes que resuelven en el teléfono.
 *
 * @param {string} ruta
 * @param {Object} cuerpo
 * @returns {Promise<Object>}
 */
function mandarSinCola(ruta, cuerpo) {
  return pedir(ruta, { metodo: 'POST', cuerpo: cuerpo, noEncolar: true });
}

/**
 * Baja un archivo del servidor al dispositivo.
 *
 * POR QUÉ NO ALCANZA CON window.open() NI CON UN ENLACE
 * La sesión de este panel viaja en la cabecera `Authorization: Bearer`,
 * no en una cookie (ver pedir(), arriba). Una pestaña nueva o un
 * <a href> salen SIN esa cabecera, así que el servidor contestaría 401
 * y la descarga fallaría siempre. Hay que pedirlo con fetch para poder
 * mandar el token, y recién después entregárselo al navegador.
 *
 * POR QUÉ NO PASA POR pedir()
 * pedir() espera JSON y lo interpreta. Acá lo que vuelve es un binario.
 * Se comparte el token y la base, no el parseo.
 *
 * POR QUÉ blob Y NO STREAM A DISCO
 * Bajar por partes necesitaría la API de acceso al sistema de archivos,
 * que Safari en iPhone no tiene — y el panel se usa desde el teléfono.
 * El navegador respalda los blobs grandes en disco por su cuenta, así
 * que en la práctica aguanta lo que haga falta.
 *
 * @param {string} ruta - Relativa a la API, como en traer().
 * @param {string} nombreSugerido - Con qué nombre se guarda.
 * @returns {Promise<void>} Falla con ErrorDelServidor si algo salió mal.
 */
async function bajarDelServidor(ruta, nombreSugerido) {
  const token = tokenGuardado();
  if (!token) {
    manejarSesionVencida();
    throw new ErrorDelServidor('No hay sesión iniciada.', 401);
  }

  const respuesta = await fetch(CONFIGURACION.servidor.base + ruta, {
    headers: { 'Authorization': 'Bearer ' + token },
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    /* El servidor contesta los errores en JSON aunque el camino feliz
       sea un binario, así que se intenta leer el motivo de verdad antes
       de caer en un mensaje genérico. */
    let motivo = 'No se pudo bajar el archivo.';
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo && cuerpo.error) motivo = cuerpo.error;
    } catch (error) {
      // No era JSON: se queda el mensaje genérico.
    }
    if (respuesta.status === 401) manejarSesionVencida();
    throw new ErrorDelServidor(motivo, respuesta.status);
  }

  const contenido = await respuesta.blob();
  const direccion = URL.createObjectURL(contenido);

  const enlace = document.createElement('a');
  enlace.href = direccion;
  enlace.download = nombreSugerido;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  /* Se libera un rato después y no en el acto: revocar la dirección
     antes de que el navegador termine de leerla cancela la descarga en
     algunos navegadores. */
  setTimeout(() => URL.revokeObjectURL(direccion), 60000);
}


/* ─── CUANDO LA SESIÓN VENCE ───────────────────────────────────────── */

/**
 * Borra la sesión y devuelve al login.
 *
 * Está acá y no en 04-sesion.js porque pedir() la necesita, y este
 * archivo se carga antes. La comprobación de que la función exista evita
 * un error si algo llama a esto durante el arranque.
 *
 * @returns {void}
 */
function manejarSesionVencida() {
  borrarToken();
  if (typeof mostrarPantallaDeEntrada === 'function') {
    mostrarPantallaDeEntrada('Tu sesión expiró. Vuelve a entrar.');
  }
}
