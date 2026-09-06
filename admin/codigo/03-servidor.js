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

/* ─── UNA LECTURA POR VEZ, Y RETROCESO ANTE EL 429 ─────────────────── */

/*
   POR QUÉ ESTO ESTÁ ACÁ (2026-09-04)

   Cada apertura del panel dispara unas veinte peticiones sin que nadie
   toque nada: las dos de Hoy, las nueve del precalentado, y una por
   cada uno de los cinco agentes de la campana. Varias son LA MISMA:
   43-agente-fechas y 44-agente-hoy piden los dos
   `planificador.php?accion=todo`; el agente de mesas y el precalentado
   piden los dos `mesas.php?accion=todo`; el de dinero y el precalentado,
   `presupuesto.php?accion=todo`. Salían en paralelo y el servidor las
   atendía todas.

   El techo del hosting es de 300 peticiones cada 5 minutos POR IP.
   Trece aperturas en cinco minutos lo agotan para TODO el equipo — y
   con la PWA, cada vez que el sistema descarta la pestaña y se vuelve a
   entrar cuenta como una apertura. Después del 429, la pantalla ofrecía
   un botón "Reintentar" que reintentaba en el acto, o sea que empujaba
   la cuota todavía más abajo.

   Dos frenos, los dos acá porque acá pasan todas las llamadas:

   1. Una lectura por vez. Si ya hay una petición IGUAL en vuelo, la
      segunda espera a la primera en vez de salir a la red.
   2. Retroceso ante el 429. Cuando el servidor dice "basta", se deja de
      leer por un rato y se contesta con la copia guardada.
*/

/** ruta => promesa de la lectura que ya está en vuelo. */
const LECTURAS_EN_VUELO = new Map();

/** Hasta cuándo no conviene volver a leer del servidor (ms de reloj). */
let ESPERAR_LECTURAS_HASTA = 0;

/** Cuánto se espera tras el primer 429; se duplica si vuelve a pasar. */
let ESPERA_TRAS_429 = 20000;

/** Techo del retroceso: dos minutos. Más que eso el panel se siente roto. */
const ESPERA_MAXIMA_TRAS_429 = 120000;

/** ruta => cuándo se avisó por última vez que estaba lenta. */
const LENTITUD_YA_AVISADA = new Map();

/**
 * Cuántos segundos faltan para poder volver a leer del servidor.
 *
 * Lo usa pintarError() (06-piezas.js) para no ofrecer un "Reintentar"
 * que va a chocar contra el mismo 429.
 *
 * @returns {number} 0 si se puede leer ahora mismo.
 */
function segundosDeEsperaDelServidor() {
  const faltan = ESPERAR_LECTURAS_HASTA - Date.now();
  return faltan > 0 ? Math.ceil(faltan / 1000) : 0;
}

/**
 * Anota que el servidor contestó 429 y calcula hasta cuándo esperar.
 *
 * Se respeta `Retry-After` si vino: es el propio servidor diciendo
 * cuánto falta, y adivinar por encima de eso no tiene sentido.
 *
 * @param {Response} respuesta
 * @returns {void}
 */
function anotarDemasiadasPeticiones(respuesta) {
  let esperaMs = ESPERA_TRAS_429;

  const cabecera = respuesta.headers.get('Retry-After');
  const segundos = cabecera ? parseInt(cabecera, 10) : NaN;
  if (!isNaN(segundos) && segundos > 0) esperaMs = segundos * 1000;

  ESPERAR_LECTURAS_HASTA = Date.now() + esperaMs;
  ESPERA_TRAS_429 = Math.min(ESPERA_TRAS_429 * 2, ESPERA_MAXIMA_TRAS_429);
}

/**
 * Se volvió a leer bien: se olvida el retroceso acumulado.
 *
 * @returns {void}
 */
function olvidarDemasiadasPeticiones() {
  ESPERAR_LECTURAS_HASTA = 0;
  ESPERA_TRAS_429 = 20000;
}

/**
 * Llama a la API, sin dejar que dos lecturas iguales salgan a la vez.
 *
 * Envuelve a pedirAlServidor(), que es la que hace el trabajo. Las
 * escrituras NO se agrupan: dos POST iguales son dos decisiones
 * distintas, no la misma pregunta hecha dos veces.
 *
 * @param {string} ruta
 * @param {Object} [opciones] - Ver pedirAlServidor().
 * @returns {Promise<*>}
 */
function pedir(ruta, opciones) {
  const config = opciones || {};
  if ((config.metodo || 'GET') !== 'GET') return pedirAlServidor(ruta, config);

  const yaEnVuelo = LECTURAS_EN_VUELO.get(ruta);
  if (yaEnVuelo) {
    /* Copia propia para quien llega segundo. Sin esto los dos se
       quedarían con EL MISMO objeto, y a la vista que ordena su lista
       con .sort() —que muta— se le reordenaría la del otro por debajo.
       Una copia extra en el arranque sale muchísimo más barata que una
       petición extra. */
    return yaEnVuelo.then(datos => {
      try {
        return typeof structuredClone === 'function'
          ? structuredClone(datos)
          : JSON.parse(JSON.stringify(datos));
      } catch (error) {
        // Algo que no se puede copiar (no debería pasar: vino de JSON).
        // Mejor compartir el objeto que fallar la lectura.
        return datos;
      }
    });
  }

  const promesa = pedirAlServidor(ruta, config);

  LECTURAS_EN_VUELO.set(ruta, promesa);
  // Se saca del registro pase lo que pase; si no, una ruta que falló una
  // vez quedaría devolviendo ese mismo error para siempre.
  promesa.then(
    () => LECTURAS_EN_VUELO.delete(ruta),
    () => LECTURAS_EN_VUELO.delete(ruta)
  );

  return promesa;
}

/**
 * Llama a la API de verdad. El envoltorio que agrupa las lecturas
 * iguales es pedir(), acá arriba: todo el panel entra por ahí.
 *
 * @param {string} ruta - 'confirmaciones.php?accion=listar'
 * @param {Object} [opciones]
 * @param {string} [opciones.metodo='GET']
 * @param {Object} [opciones.cuerpo] - Se manda como JSON.
 * @param {boolean} [opciones.sinSesion=false] - Para el login.
 * @param {boolean} [opciones.noEncolar=false] - Que falle en vez de
 *        guardarse para más tarde. Para lo que no tiene sentido
 *        reintentar después, como cerrar sesión.
 * @param {number} [opciones.segundosDeEspera] - Tope propio, para lo
 *        que tarda mucho a propósito (el long-poll del chat). Sin esto
 *        vale el general de CONFIGURACION.servidor.
 * @returns {Promise<*>} El contenido de "datos".
 * @throws {ErrorDelServidor}
 *
 * @example
 *   const lista = await traer('confirmaciones.php?accion=listar');
 *   await pedir('planificador.php?accion=guardar_nota', {
 *     metodo: 'POST',
 *     cuerpo: { titulo: 'Llamar al DJ' },
 *   });
 */
async function pedirAlServidor(ruta, opciones) {
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

  /* El servidor ya dijo "basta" hace poco: no se vuelve a preguntar
     hasta que pase el retroceso. Se contesta con la copia guardada, que
     es lo mismo que se hace sin señal — desde el punto de vista de quien
     mira la pantalla, un 429 y un corte de red son la misma cosa: el
     servidor no está disponible ahora. Las ESCRITURAS sí salen: son
     pocas, las pidió una persona, y encolarlas por un límite de lectura
     sería peor. */
  if (metodo === 'GET' && !config.sinSesion && Date.now() < ESPERAR_LECTURAS_HASTA) {
    const copia = await leerLectura(ruta);
    if (copia) {
      // 'ocupado' y no falta de red: se llega acá por un 429 anterior.
      avisarDatosGuardados(copia.guardado_en, 'ocupado');
      return copia.datos;
    }
    throw new ErrorDelServidor(
      'El servidor recibió demasiadas peticiones seguidas. Vuelve a intentar en ' +
      segundosDeEsperaDelServidor() + ' segundos.',
      429
    );
  }

  /* AbortController es lo que corta la espera. Sin esto, con mala señal
     el girador daría vueltas para siempre y parecería que la app colgó.

     ⚡ `segundosDeEspera` PROPIO (2026-09-04). Los 8 s de
     CONFIGURACION son la medida de "el servidor no contesta" para todo
     el panel, y están bien para todo el panel. Pero el long-poll del
     chat (chat.php?accion=listar&esperar=1) se queda abierto A
     PROPÓSITO hasta 25 s esperando que MegaBot conteste: con el tope
     general, el navegador lo abortaba SIEMPRE a los 8 s y esa espera no
     habría servido para nada. Quien pide una espera larga la declara
     acá; nadie más cambia de comportamiento. */
  const cortador = new AbortController();
  const reloj = setTimeout(
    () => cortador.abort(),
    (config.segundosDeEspera || CONFIGURACION.servidor.segundosDeEspera) * 1000
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

  /* ⚠️ EL 429 SE TRATA COMO "EL SERVIDOR NO ESTÁ AHORA" (2026-09-04).
     Antes seguía de largo hasta el error genérico, la pantalla mostraba
     "Reintentar" y cada toque gastaba otra petición de la misma cuota
     que ya estaba agotada — para todo el equipo, no solo para quien
     tocaba. Ahora se anota hasta cuándo esperar (con Retry-After si el
     servidor lo mandó) y, si hay copia guardada, se muestra esa. */
  if (respuesta.status === 429) {
    anotarDemasiadasPeticiones(respuesta);

    if (metodo === 'GET') {
      const copia = await leerLectura(ruta);
      if (copia) {
        /* El servidor CONTESTÓ, y rápido: decir "sin conexión" acá
           manda a revisar el wifi cuando lo que hay que hacer es
           esperar medio minuto. */
        avisarDatosGuardados(copia.guardado_en, 'ocupado');
        return copia.datos;
      }
    }
  } else if (metodo === 'GET' && respuesta.ok) {
    // Se pudo leer: se olvida el retroceso acumulado.
    olvidarDemasiadasPeticiones();
  }

  /* Fase 8: solo se anota lo que tardó de verdad — de otro modo la
     tabla se infla con miles de filas de 200ms que no dicen nada nuevo.
     metricas.php queda afuera a propósito: es la propia llamada que
     mandaría este evento, y medirse a sí misma no aporta nada. */
  const tardoMs = Date.now() - empezoEn;
  if (tardoMs > 1500 && !ruta.startsWith('metricas.php')) {
    /* ⚠️ UNA VEZ POR RUTA CADA CINCO MINUTOS (2026-09-04).
       Sin freno, toda petición de más de 1500 ms generaba un POST extra
       de métrica — o sea que la red lenta DUPLICABA el volumen justo
       cuando la cuota estaba más ajustada, y era la red lenta la que
       hacía que las peticiones pasaran de 1500 ms. Se retroalimentaba
       sola. Que un endpoint esté lento se sabe con una muestra cada
       cinco minutos igual que con doscientas. */
    const ahora = Date.now();
    const ultima = LENTITUD_YA_AVISADA.get(ruta) || 0;
    if (ahora - ultima > 300000) {
      LENTITUD_YA_AVISADA.set(ruta, ahora);
      registrarEvento('accion', 'endpoint_lento', { ruta: ruta, ms: tardoMs });
    }
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
 * @param {Object} [opciones] - Ver pedirAlServidor(). Se usa para el
 *        long-poll del chat, que necesita su propio tope de espera.
 * @returns {Promise<*>}
 */
function traer(ruta, opciones) {
  return pedir(ruta, opciones);
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
