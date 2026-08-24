/* ══════════════════════════════════════════════════════════════════════
   15 · INSTALAR LA APP, ADMINISTRADORES Y AVISOS

   QUÉ HAY EN ESTE ARCHIVO
   Las tres opciones del menú que no son listas:
     · Instalar el acceso directo en la pantalla de inicio
     · Agregar otra persona con acceso al panel
     · Activar y probar los recordatorios

   ÍNDICE
     1. Instalar la app
     2. Agregar administrador
     3. Avisos y recordatorios
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. INSTALAR LA APP ───────────────────────────────────────────── */

/**
 * El navegador nos avisa cuándo se puede instalar, y hay que guardar ese
 * aviso para poder disparar la instalación después.
 *
 * @type {Event|null}
 */
let INVITACION_A_INSTALAR = null;

/**
 * Queda atento a si el navegador ofrece instalar la app.
 *
 * CÓMO FUNCIONA ESTO EN CADA SISTEMA
 * En Android, Chrome dispara 'beforeinstallprompt' cuando considera que
 * la app se puede instalar. Se guarda ese evento y el botón del menú lo
 * dispara cuando la persona quiere, en vez de que aparezca solo.
 *
 * En iPhone NO existe ese evento: Safari nunca lo dispara. Ahí no hay
 * forma de instalar por código, hay que hacerlo a mano desde el botón
 * Compartir. Por eso el botón del menú, en iOS, muestra las
 * instrucciones en vez de instalar.
 *
 * @returns {void}
 */
function prepararInstalacion() {
  window.addEventListener('beforeinstallprompt', evento => {
    // Sin esto, Chrome muestra su propio cartel abajo, que es feo y
    // aparece en el peor momento.
    evento.preventDefault();
    INVITACION_A_INSTALAR = evento;
    mostrarOpcionDeInstalar();
  });

  // Cuando se instala, el botón deja de tener sentido.
  window.addEventListener('appinstalled', () => {
    INVITACION_A_INSTALAR = null;
    const opcion = buscar('#opcion-instalar');
    if (opcion) opcion.classList.add('oculto');
    avisar('App instalada. Ya la puedes abrir desde la pantalla de inicio.');
  });

  mostrarOpcionDeInstalar();
}

/**
 * Muestra u oculta la opción del menú según haga falta.
 *
 * @returns {void}
 */
function mostrarOpcionDeInstalar() {
  const opcion = buscar('#opcion-instalar');
  if (!opcion) return;

  // Si ya está instalada, el navegador la abre en modo "standalone".
  const yaInstalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  // En iPhone se muestra siempre (con instrucciones), porque no hay
  // evento que avise si se puede instalar o no.
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  opcion.classList.toggle('oculto', yaInstalada || (!INVITACION_A_INSTALAR && !esIOS));
}

/**
 * Instala la app, o explica cómo hacerlo si el navegador no deja.
 *
 * @returns {Promise<void>}
 */
async function instalarLaApp() {

  // Camino de Android: el navegador ya nos dio permiso de preguntar.
  if (INVITACION_A_INSTALAR) {
    INVITACION_A_INSTALAR.prompt();

    const resultado = await INVITACION_A_INSTALAR.userChoice;
    // El evento se puede usar UNA sola vez.
    INVITACION_A_INSTALAR = null;

    avisar(resultado.outcome === 'accepted'
      ? 'Instalando…'
      : 'No se instaló. Puedes hacerlo más tarde desde el menú.');

    mostrarOpcionDeInstalar();
    return;
  }

  // Camino de iPhone: se explica, porque no se puede hacer por código.
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  abrirHoja('Instalar en la pantalla de inicio',
    esIOS
      ? '<p>En iPhone hay que hacerlo a mano, Safari no permite ' +
        'instalarlo desde un botón:</p>' +
        '<ol style="line-height:2;padding-left:20px;color:var(--texto-suave)">' +
          '<li>Toca el botón <strong>Compartir</strong> (el cuadradito ' +
              'con la flecha hacia arriba, abajo en el centro).</li>' +
          '<li>Desliza hacia abajo y elige <strong>Agregar a inicio</strong>.</li>' +
          '<li>Toca <strong>Agregar</strong>.</li>' +
        '</ol>' +
        '<p class="vacio__texto">Tiene que ser desde Safari. Si estás en ' +
        'Chrome o dentro de otra app, la opción no aparece.</p>'

      : '<p>En Android:</p>' +
        '<ol style="line-height:2;padding-left:20px;color:var(--texto-suave)">' +
          '<li>Toca el menú del navegador (los tres puntitos, arriba).</li>' +
          '<li>Elige <strong>Instalar aplicación</strong> o ' +
              '<strong>Agregar a pantalla de inicio</strong>.</li>' +
        '</ol>' +
        '<p class="vacio__texto">Si no aparece la opción, puede que ya ' +
        'esté instalada, o que estés abriendo el panel dentro de otra ' +
        'app en vez de en el navegador.</p>'
  );
}


/* ─── 2. AGREGAR ADMINISTRADOR ─────────────────────────────────────── */

/**
 * Formulario para dar de alta a otra persona con acceso.
 *
 * @returns {void}
 */
function abrirHojaDeNuevoAdministrador() {
  if (USUARIO.rol !== 'admin') {
    avisar('Solo una administradora puede agregar personas.', true);
    return;
  }

  const perfiles   = CONFIGURACION.perfiles || [];
  const secciones  = CONFIGURACION.seccionesDePermiso || [];
  const especiales = [
    ['escanear',      'Puede escanear pases en la puerta'],
    ['ver_dinero',    'Puede ver el dinero (presupuesto, pagos, cotizaciones)'],
    ['borrar',        'Puede borrar (no solo editar)'],
    ['crear_cuentas', 'Puede crear otras cuentas'],
  ];

  const cuerpo = abrirHoja('Agregar persona al panel',
    campoTexto({ id: 'na-nombre', rotulo: 'Nombre' }) +
    campoTexto({ id: 'na-correo', rotulo: 'Correo', tipo: 'email' }) +

    campoLista({ id: 'na-rol', rotulo: 'Tipo de cuenta',
                 valor: 'entrada',
                 opciones: [
                   { valor: 'admin',   texto: 'Administradora (ve y puede todo)' },
                   { valor: 'entrada', texto: 'Cuenta con permisos elegidos abajo' },
                 ] }) +

    campoTexto({ id: 'na-clave', rotulo: 'Contraseña', tipo: 'password',
                 ayuda: 'Al menos 10 caracteres. Pásasela por un medio seguro; ' +
                        'esa persona puede cambiarla desde Mi cuenta.' }) +

    '<div id="na-organigrama">' +
      campoLista({ id: 'na-perfil', rotulo: 'Perfil (solo para prellenar, se puede ajustar abajo)',
                   valor: '',
                   opciones: [{ valor: '', texto: '— Elegir a mano —' }]
                     .concat(perfiles.map(p => ({ valor: p.clave, texto: p.nombre + ' · ' + p.quien }))) }) +

      '<p class="detalle__rotulo" style="margin-top:var(--esp-2)">Qué puede ver o editar</p>' +
      secciones.map(s =>
        '<div class="campo-par" style="align-items:center;padding:4px 0">' +
          '<span>' + seguro(s[1]) + '</span>' +
          campoLista({ id: 'na-sec-' + s[0], rotulo: '', valor: 'nada',
                       opciones: [
                         { valor: 'nada',   texto: 'Nada' },
                         { valor: 'ver',    texto: 'Ver' },
                         { valor: 'editar', texto: 'Editar' },
                       ] }) +
        '</div>'
      ).join('') +

      '<p class="detalle__rotulo" style="margin-top:var(--esp-2)">Permisos especiales</p>' +
      especiales.map(e =>
        '<label style="display:flex;align-items:center;gap:var(--esp-1);padding:4px 0">' +
          '<input type="checkbox" class="na-especial" value="' + e[0] + '"> ' + seguro(e[1]) +
        '</label>'
      ).join('') +
    '</div>' +

    '<button type="button" class="boton boton--principal boton--ancho" ' +
            'id="na-crear" style="margin-top:var(--esp-3)">Crear la cuenta</button>'
  );

  /* El rol 'admin' ya lo puede todo por diseño (exigirAdministrador() en
     el backend), así que el organigrama de abajo no le pinta nada: para
     esa cuenta se esconde y no confunde con casillas que no hacen nada. */
  const organigrama = buscar('#na-organigrama', cuerpo);
  const rolSelector  = buscar('#na-rol', cuerpo);
  const actualizarVisibilidad = () => {
    organigrama.classList.toggle('oculto', rolSelector.value === 'admin');
  };
  rolSelector.addEventListener('change', actualizarVisibilidad);
  actualizarVisibilidad();

  // Elegir un perfil prellena las casillas; se pueden seguir tocando después.
  buscar('#na-perfil', cuerpo).addEventListener('change', () => {
    const clave  = valorDe('na-perfil', cuerpo);
    const perfil = perfiles.find(p => p.clave === clave);
    if (!perfil) return;

    const permisos = perfil.permisos === 'todo_editar'
      ? Object.fromEntries(secciones.map(s => [s[0], 'editar']))
      : (perfil.permisos || {});

    secciones.forEach(s => {
      const campo = buscar('#na-sec-' + s[0], cuerpo);
      if (campo) campo.value = permisos[s[0]] || 'nada';
    });

    buscarTodos('.na-especial', cuerpo).forEach(caja => {
      caja.checked = (perfil.especiales || []).includes(caja.value);
    });
  });

  buscar('#na-crear', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('na-nombre', cuerpo);
    const correo = valorDe('na-correo', cuerpo);
    const clave  = valorDe('na-clave', cuerpo);
    const rol    = valorDe('na-rol', cuerpo);

    if (!nombre) { avisar('Falta el nombre.', true); return; }
    if (!correo || correo.indexOf('@') < 0) {
      avisar('El correo no parece válido.', true);
      return;
    }
    if (clave.length < 10) {
      avisar('La contraseña necesita al menos 10 caracteres.', true);
      return;
    }

    const carga = { nombre: nombre, correo: correo, contrasena: clave, rol: rol };

    if (rol !== 'admin') {
      carga.perfil = valorDe('na-perfil', cuerpo);
      carga.permisos = secciones
        .map(s => ({ seccion: s[0], nivel: valorDe('na-sec-' + s[0], cuerpo) }))
        .filter(p => p.nivel !== 'nada');
      carga.especiales = buscarTodos('.na-especial', cuerpo)
        .filter(c => c.checked)
        .map(c => c.value);
    }

    const boton = buscar('#na-crear', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Creando…';

    try {
      await mandar('usuarios.php?accion=crear', carga);
      cerrarHoja(true);
      avisar('Cuenta creada para ' + nombre + '.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Crear la cuenta';
    }
  });
}


/* ─── 3. AVISOS Y RECORDATORIOS ────────────────────────────────────── */

/**
 * Hoja con el estado de los avisos y los botones para activarlos.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeAvisos() {
  const hayApi = ('Notification' in window) &&
                 ('serviceWorker' in navigator) &&
                 ('PushManager' in window);

  const permiso = hayApi ? Notification.permission : 'unsupported';

  const estados = {
    granted: ['bien',   'Activados'],
    denied:  ['alerta', 'Bloqueados'],
    default: ['tenue',  'Sin activar'],
    unsupported: ['alerta', 'No disponibles'],
  };
  const estado = estados[permiso] || estados.default;

  const cuerpo = abrirHoja('Avisos y recordatorios',
    '<div class="tarjeta">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span>Este teléfono</span>' +
        '<span class="etiqueta etiqueta--' + estado[0] + '">' + estado[1] + '</span>' +
      '</div>' +
    '</div>' +

    '<p class="vacio__texto" style="margin:var(--esp-2) 0">' +
      'Todos los días a la mañana te avisamos de los pagos que vencen en ' +
      'los próximos 3 días, las tareas atrasadas y las fechas que se ' +
      'acercan. El correo llega siempre a info@aniaxv.com; la ' +
      'notificación al teléfono, solo si la activas aquí.' +
    '</p>' +

    (permiso === 'denied'
      ? '<p class="aviso-error">Los bloqueaste antes. El navegador no ' +
        'vuelve a preguntar: hay que reactivarlos desde los ajustes del ' +
        'teléfono, en los permisos de este sitio.</p>'
      : '') +

    (permiso === 'unsupported'
      ? '<p class="aviso-error">Este navegador no admite notificaciones. ' +
        'En iPhone hace falta iOS 16.4 o más nuevo, y tener la app ' +
        'instalada en la pantalla de inicio.</p>'
      : '') +

    (hayApi && permiso !== 'denied'
      ? '<button type="button" class="boton boton--principal boton--ancho" ' +
                'id="av-activar" style="margin-bottom:var(--esp-1)">' +
          (permiso === 'granted' ? 'Volver a registrar este teléfono'
                                 : 'Activar en este teléfono') +
        '</button>'
      : '') +

    (permiso === 'granted'
      ? '<button type="button" class="boton boton--ancho" id="av-probar" ' +
                'style="margin-bottom:var(--esp-3)">' +
          'Mandarme un aviso de prueba' +
        '</button>'
      : '') +

    /* Paso 5 · avisos proactivos de los agentes — SOLO tiene sentido
     * ofrecerlos con el push ya activado en este teléfono; por eso van
     * adentro del mismo `if`, no en una hoja aparte. Apagados los dos
     * por defecto (opt-in, nunca opt-out) — se leen y guardan recién
     * al abrir esta sección, ver más abajo. */
    (permiso === 'granted'
      ? '<div class="tarjeta__titulo">Avisos al instante de los agentes</div>' +
        '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
          'Además del resumen de la mañana, avisar apenas pase algo puntual — ' +
          'aunque el panel esté cerrado.' +
        '</p>' +
        '<div id="av-agentes"><p class="vacio__texto">Cargando…</p></div>'
      : '')
  );

  const activar = buscar('#av-activar', cuerpo);
  if (activar) activar.addEventListener('click', () => suscribirAAvisos());

  const probar = buscar('#av-probar', cuerpo);
  if (probar) {
    probar.addEventListener('click', async () => {
      probar.disabled = true;
      probar.textContent = 'Enviando…';
      try {
        const r = await mandar('recordatorios.php?accion=probar', {});
        avisar(r.mensaje);
      } catch (error) {
        avisar(error.message, true);
      }
      probar.disabled = false;
      probar.textContent = 'Mandarme un aviso de prueba';
    });
  }

  const donde = buscar('#av-agentes', cuerpo);
  if (donde) pintarAvisosDeAgentes(donde);
}

/**
 * Los dos interruptores de aviso proactivo por categoría (Paso 5) —
 * clave 'avisos_agentes_<id>' en ajustes, propia de cada cuenta (ver
 * la excepción en api/ajustes.php). Por defecto los dos apagados.
 *
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function pintarAvisosDeAgentes(donde) {
  const clave = 'avisos_agentes_' + (USUARIO && USUARIO.id ? USUARIO.id : '0');

  let prefs = {};
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=' + clave);
    if (r && r.valor) prefs = JSON.parse(r.valor) || {};
  } catch (error) {
    prefs = {};
  }

  donde.innerHTML =
    campoCasilla({
      id: 'av-dinero-urgente',
      rotulo: 'Un pago vence hoy',
      marcado: !!prefs.dinero_urgente,
    }) +
    campoCasilla({
      id: 'av-mesas-urgente',
      rotulo: 'Sentaron juntas a dos personas que no deberían',
      marcado: !!prefs.mesas_urgente,
    });

  const guardar = async () => {
    prefs = {
      dinero_urgente: buscar('#av-dinero-urgente', donde).checked,
      mesas_urgente: buscar('#av-mesas-urgente', donde).checked,
    };
    try {
      await mandar('ajustes.php?accion=guardar', { clave: clave, valor: JSON.stringify(prefs) });
    } catch (error) {
      avisar(error.message, true);
    }
  };

  buscar('#av-dinero-urgente', donde).addEventListener('change', guardar);
  buscar('#av-mesas-urgente', donde).addEventListener('change', guardar);
}

/**
 * Pide permiso, se suscribe y le manda la suscripción al servidor.
 *
 * @returns {Promise<void>}
 */
async function suscribirAAvisos() {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      avisar('No se activaron los avisos.', true);
      return;
    }

    avisar('Registrando este teléfono…');

    // La llave pública del servidor: sin ella el navegador no deja
    // suscribirse.
    const datos = await traer('recordatorios.php?accion=llave');
    const registro = await navigator.serviceWorker.ready;

    /* Si ya había una suscripción vieja se reutiliza; si no, se crea.
       userVisibleOnly es obligatorio: promete que cada aviso va a
       mostrar una notificación visible y no se va a usar para espiar. */
    let suscripcion = await registro.pushManager.getSubscription();

    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: llaveABytes(datos.llave),
      });
    }

    const crudo = suscripcion.toJSON();

    await mandar('recordatorios.php?accion=suscribir', {
      endpoint: crudo.endpoint,
      p256dh: crudo.keys ? crudo.keys.p256dh : '',
      auth:   crudo.keys ? crudo.keys.auth   : '',
    });

    cerrarHoja(true);
    avisar('Listo. Este teléfono va a recibir los recordatorios.');

  } catch (error) {
    avisar(error.message || 'No se pudieron activar los avisos.', true);
  }
}

/**
 * Convierte la llave pública del servidor al formato que pide el
 * navegador.
 *
 * La llave viaja como texto en base64 "para URL" (sin + ni / ni =), pero
 * pushManager.subscribe() exige un arreglo de bytes. Esta función
 * deshace esa codificación.
 *
 * @param {string} texto
 * @returns {Uint8Array}
 */
function llaveABytes(texto) {
  // Se vuelve a poner el relleno "=" que se le quitó, y los + y / .
  const relleno = '='.repeat((4 - (texto.length % 4)) % 4);
  const normal  = (texto + relleno).replace(/-/g, '+').replace(/_/g, '/');

  const crudo  = atob(normal);
  const bytes  = new Uint8Array(crudo.length);

  for (let i = 0; i < crudo.length; i++) {
    bytes[i] = crudo.charCodeAt(i);
  }
  return bytes;
}
