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

  buscar('#entrada-olvide').addEventListener('click', () => {
    abrirRecuperarContrasena(buscar('#entrada-correo').value.trim());
  });

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


/* ─── OLVIDÉ MI CONTRASEÑA ─────────────────────────────────────────── */

/**
 * Abre la hoja de "olvidé mi contraseña": primero pide el correo, y una
 * vez mandado el código pasa al segundo paso (código + contraseña nueva).
 * Es la misma hoja (#hoja) que usa el resto del panel — funciona incluso
 * antes de entrar porque #hoja vive fuera de #pantalla-entrada y #app.
 *
 * @param {string} [correoPrecargado] - Lo que ya estaba escrito en el login.
 * @returns {void}
 */
function abrirRecuperarContrasena(correoPrecargado) {
  const cuerpo = abrirHoja('¿Olvidaste tu contraseña?',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'Escribe el correo de tu cuenta y te mandamos un código para poner ' +
      'una contraseña nueva.' +
    '</p>' +
    campoTexto({ id: 'recuperar-correo', rotulo: 'Correo', tipo: 'email',
                 valor: correoPrecargado || '' }) +
    '<p id="recuperar-error" class="aviso-error oculto" role="alert"></p>' +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="recuperar-pedir">' +
        'Mandar código' +
      '</button>' +
    '</div>'
  );

  buscar('#recuperar-pedir', cuerpo).addEventListener('click', async () => {
    const boton  = buscar('#recuperar-pedir', cuerpo);
    const error  = buscar('#recuperar-error', cuerpo);
    const correo = buscar('#recuperar-correo', cuerpo).value.trim();

    if (!correo) {
      error.textContent = 'Escribe tu correo.';
      error.classList.remove('oculto');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Mandando…';
    error.classList.add('oculto');

    try {
      const respuesta = await pedir('sesion.php?accion=recuperar', {
        metodo: 'POST',
        sinSesion: true,
        noEncolar: true,
        cuerpo: { correo: correo },
      });
      abrirConfirmarCodigo(correo, respuesta.mensaje);
    } catch (fallo) {
      error.textContent = fallo.message;
      error.classList.remove('oculto');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Mandar código';
    }
  });
}

/**
 * Segundo paso: el código que llegó por correo, más la contraseña nueva.
 *
 * @param {string} correo - El mismo que se usó para pedir el código.
 * @param {string} mensaje - El aviso genérico del servidor, para mostrarlo tal cual.
 * @returns {void}
 */
function abrirConfirmarCodigo(correo, mensaje) {
  const cuerpo = abrirHoja('Escribe el código',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' + seguro(mensaje) + '</p>' +
    campoTexto({ id: 'recuperar-codigo', rotulo: 'Código de 6 dígitos', tipo: 'text' }) +
    campoTexto({ id: 'recuperar-nueva', rotulo: 'Contraseña nueva', tipo: 'password',
                 ayuda: 'Al menos 10 caracteres.' }) +
    campoTexto({ id: 'recuperar-repetir', rotulo: 'Repite la contraseña nueva', tipo: 'password' }) +
    '<p id="recuperar-error-2" class="aviso-error oculto" role="alert"></p>' +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="recuperar-confirmar">' +
        'Cambiar contraseña' +
      '</button>' +
    '</div>'
  );

  buscar('#recuperar-codigo', cuerpo).setAttribute('inputmode', 'numeric');
  buscar('#recuperar-codigo', cuerpo).setAttribute('autocomplete', 'one-time-code');
  buscar('#recuperar-nueva', cuerpo).setAttribute('autocomplete', 'new-password');

  buscar('#recuperar-confirmar', cuerpo).addEventListener('click', async () => {
    const boton   = buscar('#recuperar-confirmar', cuerpo);
    const error   = buscar('#recuperar-error-2', cuerpo);
    const codigo  = buscar('#recuperar-codigo', cuerpo).value.trim();
    const nueva   = buscar('#recuperar-nueva', cuerpo).value;
    const repetir = buscar('#recuperar-repetir', cuerpo).value;

    if (!codigo || !nueva) {
      error.textContent = 'Completa el código y la contraseña nueva.';
      error.classList.remove('oculto');
      return;
    }
    if (nueva !== repetir) {
      error.textContent = 'Las dos contraseñas no son iguales.';
      error.classList.remove('oculto');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Cambiando…';
    error.classList.add('oculto');

    try {
      await pedir('sesion.php?accion=restablecer', {
        metodo: 'POST',
        sinSesion: true,
        noEncolar: true,
        cuerpo: { correo: correo, codigo: codigo, nueva: nueva },
      });

      cerrarHoja(true);
      avisar('Contraseña cambiada. Ya puedes entrar con la nueva.');
      buscar('#entrada-correo').value = correo;
      buscar('#entrada-contrasena').focus();
    } catch (fallo) {
      error.textContent = fallo.message;
      error.classList.remove('oculto');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Cambiar contraseña';
    }
  });
}
