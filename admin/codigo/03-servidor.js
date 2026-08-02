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
 * @returns {Promise<*>} El contenido de "datos".
 * @throws {ErrorDelServidor}
 *
 * @example
 *   const lista = await pedir('confirmaciones.php?accion=listar');
 *   await pedir('notas.php?accion=crear', {
 *     metodo: 'POST',
 *     cuerpo: { titulo: 'Llamar al DJ' },
 *   });
 */
async function pedir(ruta, opciones) {
  const config = opciones || {};
  const metodo = config.metodo || 'GET';

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

    // Se distingue "se acabó el tiempo" de "no hay internet" porque lo
    // que conviene hacer es distinto: en un caso reintentar, en el otro
    // esperar a tener señal.
    if (error.name === 'AbortError') {
      throw new ErrorDelServidor('El servidor tardó demasiado. Probá de nuevo.', 0);
    }
    throw new ErrorDelServidor('Sin conexión. Revisá tu internet.', 0);
  }
  clearTimeout(reloj);

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
    mostrarPantallaDeEntrada('Tu sesión expiró. Volvé a entrar.');
  }
}
