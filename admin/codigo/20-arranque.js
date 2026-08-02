/* ══════════════════════════════════════════════════════════════════════
   20 · ARRANQUE

   QUÉ HACE ESTE ARCHIVO
   Es el que enciende todo. Va último porque usa cosas de todos los
   anteriores.

   EL ORDEN DEL ARRANQUE
     1. Registrar el Service Worker (para que la app abra offline).
     2. Enganchar los botones que existen siempre.
     3. Preguntar si hay sesión válida.
     4. Entrar a la app, o mostrar el login.

   ÍNDICE
     1. Service Worker
     2. Encender la app
     3. Vistas todavía no construidas
     4. Opciones del menú
     5. Punto de entrada
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. SERVICE WORKER ────────────────────────────────────────────── */

/**
 * Registra el Service Worker del panel.
 *
 * El scope './' hace que solo gobierne /admin/. El de la invitación, que
 * está en la raíz, ya deja pasar de largo todo lo que empieza con /admin.
 *
 * @returns {void}
 */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Se espera al load para no competir por el ancho de banda con los
  // archivos que la app necesita para mostrarse.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .catch(() => {
        // Sin Service Worker la app funciona igual, solo que no abre sin
        // internet. No vale la pena molestar a nadie con este error.
      });
  });
}


/* ─── 2. ENCENDER LA APP ───────────────────────────────────────────── */

/**
 * Muestra la app y carga la primera vista.
 *
 * @returns {void}
 */
function arrancarLaApp() {
  mostrarPantalla('app');

  // Si se entró desde un atajo del icono ("Invitados", "Dinero"…), se
  // abre esa vista en lugar del Resumen.
  const parametros = new URLSearchParams(location.search);
  const atajo = parametros.get('ir');

  if (atajo === 'nota') {
    irA('resumen');
    abrirHojaDeNota();
  } else if (atajo && VISTAS[atajo]) {
    irA(atajo);
  } else {
    irA('resumen');
  }

  // Se limpia el parámetro de la barra de direcciones para que al
  // recargar no vuelva a abrirse el atajo.
  if (atajo) history.replaceState(null, '', location.pathname);
}


/* ─── 3. LO QUE FALTA ──────────────────────────────────────────────── */

/* Correo, Presupuesto, Evento y Notas ya tienen su propio archivo:
   09-vista-dinero.js, 10-planificador.js, 11-vista-evento.js y
   12-vista-correo.js. Acá solo quedan las dos hojas del menú que
   todavía no se construyeron. */

/**
 * Lista de personas con acceso al panel.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeUsuarios() {
  const cuerpo = abrirHoja('Personas con acceso',
    '<div id="lista-usuarios"></div>');

  const lista = buscar('#lista-usuarios', cuerpo);
  pintarCargando(lista, 2);

  try {
    const usuarios = await traer('usuarios.php?accion=listar');

    lista.innerHTML = usuarios.map(u =>
      '<div class="lista__fila">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(u.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(u.correo) + '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="etiqueta etiqueta--' +
            (Number(u.activo) === 1 ? 'bien' : 'tenue') + '">' +
            seguro(u.rol === 'admin' ? 'Administradora' : 'Entrada') +
          '</span>' +
        '</span>' +
      '</div>'
    ).join('');
  } catch (error) {
    pintarError(lista, error.message, () => abrirHojaDeUsuarios());
  }
}

/**
 * Historial de cambios: quién tocó qué y cuándo.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeBitacora() {
  const cuerpo = abrirHoja('Historial de cambios',
    '<div id="lista-bitacora"></div>');

  const lista = buscar('#lista-bitacora', cuerpo);
  pintarCargando(lista, 4);

  try {
    const filas = await traer('bitacora.php?accion=listar');

    if (!filas.length) {
      pintarVacio(lista, 'Todavía no hay movimientos',
        'Acá va a quedar registrado cada cambio, con quién lo hizo.');
      return;
    }

    lista.innerHTML = filas.map(f =>
      '<div class="lista__fila">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' +
            seguro(f.usuario_nombre + ' ' + f.accion) + '</span>' +
          '<span class="lista__pie">' +
            seguro(acortar(f.detalle || f.tabla_afectada, 60)) + '</span>' +
        '</span>' +
        '<span class="lista__lado vacio__texto">' +
          seguro(comoCuando(String(f.cuando).slice(0, 10))) + '</span>' +
      '</div>'
    ).join('');
  } catch (error) {
    pintarError(lista, error.message, () => abrirHojaDeBitacora());
  }
}


/* ─── 4. OPCIONES DEL MENÚ ─────────────────────────────────────────── */

/**
 * Muestra los datos de la cuenta propia y deja cambiar la contraseña.
 *
 * @returns {void}
 */
function abrirHojaDeCuenta() {
  const cuerpo = abrirHoja('Mi cuenta',
    '<div class="detalle" style="margin-bottom:var(--esp-4)">' +
      '<span class="detalle__rotulo">Nombre</span>' +
      '<span class="detalle__valor">' + seguro(USUARIO.nombre) + '</span>' +
      '<span class="detalle__rotulo">Correo</span>' +
      '<span class="detalle__valor">' + seguro(USUARIO.correo) + '</span>' +
      '<span class="detalle__rotulo">Rol</span>' +
      '<span class="detalle__valor">' +
        (USUARIO.rol === 'admin' ? 'Administradora' : 'Entrada') +
      '</span>' +
    '</div>' +

    '<h3 style="margin-bottom:var(--esp-2)">Cambiar contraseña</h3>' +
    campoTexto({ id: 'clave-actual', rotulo: 'Contraseña actual', tipo: 'password' }) +
    campoTexto({ id: 'clave-nueva',  rotulo: 'Contraseña nueva',  tipo: 'password',
                 ayuda: 'Al menos 10 caracteres. Se cerrará la sesión en todos los dispositivos.' }) +
    '<button type="button" class="boton boton--principal boton--ancho" id="cambiar-clave">' +
      'Cambiar contraseña' +
    '</button>'
  );

  buscar('#cambiar-clave', cuerpo).addEventListener('click', async () => {
    const actual = valorDe('clave-actual', cuerpo);
    const nueva  = valorDe('clave-nueva', cuerpo);

    if (!actual || !nueva) { avisar('Completá los dos campos.', true); return; }

    try {
      await mandar('sesion.php?accion=cambiar', { actual: actual, nueva: nueva });
      cerrarHoja();
      borrarToken();
      mostrarPantallaDeEntrada('Contraseña cambiada. Entrá con la nueva.');
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/* La gestión de avisos y la instalación viven en 15-instalar-y-avisos.js:
   abrirHojaDeAvisos(), instalarLaApp() y abrirHojaDeNuevoAdministrador(). */


/* ─── 5. PUNTO DE ENTRADA ──────────────────────────────────────────── */

/**
 * Enciende todo. Es lo primero y lo único que se llama solo.
 *
 * @returns {Promise<void>}
 */
async function encender() {
  registrarServiceWorker();

  prepararEntrada();
  prepararNavegacion();
  prepararHoja();

  /* Va acá y no dentro de la app porque el navegador dispara el aviso de
     "se puede instalar" muy temprano, a veces antes de que se abra la
     sesión. Si se enganchara después, ese aviso ya se habría perdido. */
  prepararInstalacion();

  buscar('#boton-nota').addEventListener('click', abrirHojaDeNota);

  if (await haySesionValida()) {
    arrancarLaApp();
  } else {
    mostrarPantallaDeEntrada();
  }
}

// Si el HTML todavía se está leyendo, se espera; si ya está listo (que
// es lo normal porque este script va al final), arranca de una.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', encender);
} else {
  encender();
}
