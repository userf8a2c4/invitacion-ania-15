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


/* ─── 3. VISTAS TODAVÍA NO CONSTRUIDAS ─────────────────────────────── */

/* Estas tres vistas están planificadas pero todavía no escritas. Se
   dejan estos avisos honestos en lugar de una pantalla en blanco o un
   error de JavaScript que rompería la navegación entera.

   A medida que se construya cada una, se borra su función de acá y se
   crea su archivo (09-vista-correo.js, 10-vista-dinero.js, etc.). */

/**
 * Aviso de sección en construcción.
 *
 * @param {string} idVista
 * @param {string} queVaAHaber
 * @returns {void}
 */
function pintarEnConstruccion(idVista, queVaAHaber) {
  pintarVacio(
    buscar('#vista-' + idVista),
    'Todavía no está lista',
    'Acá va a estar ' + queVaAHaber + '.'
  );
}

function dibujarCorreo() {
  pintarEnConstruccion('correo',
    'la bandeja de info@aniaxv.com, para leer y responder desde el teléfono');
}

function dibujarEvento() {
  pintarEnConstruccion('evento',
    'las mesas, el corte de honor, la ceremonia, la música y el cronograma');
}

function abrirHojaDeNota() {
  avisar('Las notas todavía no están listas.');
}

function abrirHojaDeUsuarios() {
  avisar('La gestión de personas todavía no está lista.');
}

function abrirHojaDeBitacora() {
  avisar('El historial todavía no está listo.');
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

/**
 * Pide permiso para mandar avisos al teléfono.
 *
 * @returns {Promise<void>}
 */
async function pedirPermisoDeAvisos() {
  if (!('Notification' in window)) {
    avisar('Este teléfono no admite avisos.', true);
    return;
  }

  if (Notification.permission === 'granted') {
    avisar('Los avisos ya están activados.');
    return;
  }

  if (Notification.permission === 'denied') {
    // Una vez denegado, el navegador no vuelve a preguntar: hay que
    // decirle a la persona dónde cambiarlo a mano.
    avisar('Los avisos están bloqueados. Se activan desde los ajustes del teléfono.', true);
    return;
  }

  const respuesta = await Notification.requestPermission();
  avisar(respuesta === 'granted'
    ? 'Avisos activados.'
    : 'No se activaron los avisos.');
}


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
