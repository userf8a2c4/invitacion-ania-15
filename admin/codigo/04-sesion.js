/* ══════════════════════════════════════════════════════════════════════
   04 · SESIÓN

   QUÉ HACE ESTE ARCHIVO
   Las tres pantallas del arranque: la de carga, la de entrada y la app.
   Decide cuál se muestra y maneja el formulario de login.

   CÓMO ES EL ARRANQUE
     1. Se ve la pantalla de carga.
     2. Si hay un token guardado, se le pregunta al servidor si sirve.
     3. Si sirve → la app. Si no → la pantalla de entrada.

   POR QUÉ SE PREGUNTA AL SERVIDOR Y NO SE CONFÍA EN EL TOKEN GUARDADO
   Porque el token pudo haber sido revocado desde otro dispositivo, o la
   cuenta pudo desactivarse. El teléfono no tiene forma de enterarse solo.
   ══════════════════════════════════════════════════════════════════════ */


/** Quién está usando el panel. Lo leen las otras vistas. */
let USUARIO = null;


/* ─── CAMBIAR DE PANTALLA ──────────────────────────────────────────── */

/**
 * Muestra una de las tres pantallas y esconde las otras dos.
 *
 * @param {'carga'|'entrada'|'app'} cual
 * @returns {void}
 */
function mostrarPantalla(cual) {
  buscar('#pantalla-carga').classList.toggle('oculto', cual !== 'carga');
  buscar('#pantalla-entrada').classList.toggle('oculto', cual !== 'entrada');
  buscar('#app').classList.toggle('oculto', cual !== 'app');
}

/**
 * Escribe una frase al azar en la pantalla de bienvenida.
 *
 * Se llama al arrancar, antes de que se sepa si hay sesión: así la frase
 * ya está puesta cuando la pantalla se muestra, sin parpadeo.
 *
 * @returns {void}
 */
function ponerFraseDeBienvenida() {
  const caja = buscar('#frase-bienvenida');
  if (!caja) return;

  const frases = (CONFIGURACION.bienvenida && CONFIGURACION.bienvenida.frases) || [];
  if (!frases.length) return;

  /* Se evita repetir la de la vez anterior. Con doce frases, que salga
     dos veces seguidas la misma es más probable de lo que uno cree, y
     rompe la sensación de que la app "te dice algo". */
  const anterior = recordado('ultima-frase', -1);
  let elegida = Math.floor(Math.random() * frases.length);
  if (frases.length > 1 && elegida === anterior) {
    elegida = (elegida + 1) % frases.length;
  }
  recordar('ultima-frase', elegida);

  caja.textContent = frases[elegida];
}

/**
 * Espera a que la frase se lea, y la desvanece.
 *
 * @returns {Promise<void>}
 */
function esperarLaFrase() {
  const caja = buscar('#frase-bienvenida');
  const duracion = (CONFIGURACION.bienvenida && CONFIGURACION.bienvenida.duracion) || 2600;

  // Si la persona pidió menos movimiento, no se la hace esperar.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }

  return new Promise(resolver => {
    setTimeout(() => {
      if (caja) caja.classList.add('pantalla-carga__frase--saliendo');
      setTimeout(resolver, 400);
    }, duracion);
  });
}

/**
 * Lleva a la pantalla de entrada, con un aviso opcional.
 *
 * @param {string} [aviso] - Por ejemplo, "Tu sesión expiró".
 * @returns {void}
 */
function mostrarPantallaDeEntrada(aviso) {
  USUARIO = null;
  mostrarPantalla('entrada');

  const caja = buscar('#entrada-error');
  if (aviso) {
    caja.textContent = aviso;
    caja.classList.remove('oculto');
  } else {
    caja.classList.add('oculto');
  }

  // El campo de contraseña se limpia siempre: si la sesión venció con la
  // app abierta, no queda escrita de antes.
  buscar('#entrada-contrasena').value = '';
}


/* ─── COMPROBAR LA SESIÓN AL ABRIR ─────────────────────────────────── */

/**
 * Pregunta si el token guardado sigue sirviendo.
 *
 * @returns {Promise<boolean>}
 */
async function haySesionValida() {
  if (!tokenGuardado()) return false;

  try {
    const respuesta = await traer('sesion.php?accion=quien');
    USUARIO = respuesta.usuario;
    recordar('usuario', USUARIO);
    return true;
  } catch (error) {
    /* Un 401 significa que el token ya no sirve: hay que volver a entrar.

       Pero un error de red (código 0) NO significa eso: significa que el
       teléfono está sin señal. En ese caso se deja entrar igual con los
       datos guardados de la última vez, para que la app abra y muestre
       lo que tenga en vez de exigir una contraseña que tampoco se puede
       comprobar sin internet. */
    if (error.codigo === 0) {
      const guardado = recordado('usuario', null);
      if (guardado) {
        USUARIO = guardado;
        avisar('Sin conexión. Puede que veas datos viejos.', true);
        return true;
      }
    }
    return false;
  }
}


/* ─── EL FORMULARIO DE ENTRADA ─────────────────────────────────────── */

/**
 * Engancha el formulario de login.
 *
 * @returns {void}
 */
function prepararEntrada() {
  const forma  = buscar('#forma-entrada');
  const boton  = buscar('#entrada-boton');
  const error  = buscar('#entrada-error');

  forma.addEventListener('submit', async evento => {
    evento.preventDefault();

    const correo     = buscar('#entrada-correo').value.trim();
    const contrasena = buscar('#entrada-contrasena').value;

    if (!correo || !contrasena) {
      error.textContent = 'Escribe tu correo y tu contraseña.';
      error.classList.remove('oculto');
      return;
    }

    // Se desactiva el botón mientras se comprueba, para que dos toques
    // seguidos no manden dos intentos y gasten el freno de la API.
    boton.disabled = true;
    boton.textContent = 'Entrando…';
    error.classList.add('oculto');

    try {
      const respuesta = await pedir('sesion.php?accion=entrar', {
        metodo: 'POST',
        sinSesion: true,
        cuerpo: { correo: correo, contrasena: contrasena },
      });

      guardarToken(respuesta.token);
      USUARIO = respuesta.usuario;
      recordar('usuario', USUARIO);

      buscar('#entrada-contrasena').value = '';
      arrancarLaApp();

    } catch (fallo) {
      error.textContent = fallo.message;
      error.classList.remove('oculto');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Entrar';
    }
  });
}


/* ─── SALIR ────────────────────────────────────────────────────────── */

/**
 * Cierra la sesión en este dispositivo.
 *
 * @returns {Promise<void>}
 */
async function salir() {
  /* Si quedaron cambios sin mandar, se avisa ANTES de cerrar. Salir no
     los borra —esperan a que esta misma persona vuelva a entrar— pero
     nadie debería irse creyendo que guardó algo que todavía no salió
     del teléfono. */
  const pendientes = await contarCola();
  if (pendientes > 0) {
    const aviso = pendientes === 1
      ? 'Queda 1 cambio sin mandar al servidor.'
      : 'Quedan ' + pendientes + ' cambios sin mandar al servidor.';

    if (!confirmarAccion(aviso + '\n\nSe van a mandar cuando vuelvas a ' +
                         'entrar con esta cuenta y haya señal.\n\n¿Salir igual?')) {
      return;
    }
  }

  try {
    /* noEncolar: sin esto, salir sin señal metía el propio "cerrar
       sesión" en la cola de cambios pendientes, para mandarlo más
       tarde. No tiene ningún sentido: si falla, alcanza con borrar el
       token de acá y dejar que caduque solo en el servidor. */
    await pedir('sesion.php?accion=salir',
                { metodo: 'POST', cuerpo: {}, noEncolar: true });
  } catch (error) {
    // Ídem: se sale localmente igual.
  }

  /* Las copias de lectura SÍ se borran: son lo que otra persona podría
     llegar a ver en este mismo teléfono. La cola no, porque son cambios
     de verdad que todavía no se guardaron en ningún lado. */
  await borrarCopiasGuardadas();

  borrarToken();
  mostrarPantallaDeEntrada();
}
