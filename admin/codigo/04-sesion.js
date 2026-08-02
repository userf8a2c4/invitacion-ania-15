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
      error.textContent = 'Escribí tu correo y tu contraseña.';
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
  try {
    await mandar('sesion.php?accion=salir', {});
  } catch (error) {
    // Si el servidor no contesta, igual se sale localmente: el token se
    // borra del teléfono y caducará solo en el servidor.
  }
  borrarToken();
  mostrarPantallaDeEntrada();
}
