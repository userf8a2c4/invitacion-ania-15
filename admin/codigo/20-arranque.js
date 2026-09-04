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

  /* SALIDA DE EMERGENCIA: abrir el panel con ?sw=no lo carga sin caché.
   *
   * Sirve cuando se acaba de subir un cambio y el teléfono sigue
   * mostrando la versión vieja. En vez de tener que explicar cómo se
   * borran los datos del sitio desde los ajustes del navegador, se abre
   *     https://aniaxv.com/admin/?sw=no
   * y se ve lo último, garantizado. También desregistra el que hubiera,
   * así la próxima visita normal ya arranca limpia. */
  if (new URLSearchParams(location.search).get('sw') === 'no') {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(cs => cs.forEach(c => caches.delete(c)));
    return;
  }

  // Se espera al load para no competir por el ancho de banda con los
  // archivos que la app necesita para mostrarse.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .catch(() => {
        // Sin Service Worker la app funciona igual, solo que no abre sin
        // internet. No vale la pena molestar a nadie con este error.
      });

    avisarSiHayActualizacion();
  });
}

/**
 * Muestra el botón de "hay una versión nueva" cuando —y solo cuando— el
 * Service Worker de verdad cambió de versión mientras esta pestaña
 * seguía abierta.
 *
 * CÓMO SE DISTINGUE UNA ACTUALIZACIÓN REAL DE LA PRIMERA VISITA
 * sw.js llama a self.skipWaiting() + clients.claim() (ver ahí el
 * porqué), así que la primera vez que alguien entra al panel TAMBIÉN
 * dispara el evento 'controllerchange' — pasa de "sin Service Worker
 * controlando la página" a "con uno". Eso no es una actualización, es
 * arrancar de cero, y no hay que ofrecer "actualizar" para eso.
 *
 * La diferencia está en si YA HABÍA un controlador ANTES de este
 * cambio: si lo había, es que esta pestaña venía funcionando con una
 * versión y el navegador activó una distinta por detrás — ahí sí hay
 * algo nuevo para mostrar.
 *
 * POR QUÉ ESTO NUNCA AVISA DE ALGO "A MEDIAS"
 * No hay ningún archivo intermedio que dispare esto. El navegador solo
 * detecta una versión nueva cuando pide sw.js y el número de VERSION
 * ahí adentro cambió — y ese número se sube a mano, como último paso,
 * cuando quien despliega decide que el cambio ya está listo. Mientras
 * VERSION no cambie, no pasa nada acá, sin importar cuántos archivos
 * se hayan subido por separado mientras tanto.
 *
 * @returns {void}
 */
function avisarSiHayActualizacion() {
  if (!('serviceWorker' in navigator)) return;

  const yaHabiaControlador = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!yaHabiaControlador) return;

    const boton = buscar('#boton-actualizar');
    if (!boton) return;

    boton.classList.remove('oculto');
    boton.addEventListener('click', () => location.reload());
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
  actualizarContadorDeDias();

  /* Antes de nada: comprobar que lo guardado en el teléfono sea de esta
     cuenta. Si era de otra, se borra. Recién después se mira la cola,
     para no mandar cambios ajenos con este token. */
  prepararGuardadoParaLaSesion().then(() => {
    actualizarBannerConexion();
    sincronizarCola();
  });

  // F1: refresca sola la vista que se esté mirando cada 60-120s con
  // señal. Se llama una sola vez; la función misma se cuida de no
  // duplicar el temporizador si arrancarLaApp() corriera de nuevo.
  if (typeof arrancarRefrescoPeriodico === 'function') arrancarRefrescoPeriodico();

  // Paso 5, nivel A: corre los agentes UNA vez al entrar, sin que haga
  // falta abrir la pestaña del asistente — así la campana ya sabe si
  // hay algo que revisar (ver 37-campana.js). No se espera (no debe
  // atrasar el resto del arranque): si tarda o falla, la campana
  // simplemente se actualiza un instante después, o se queda en lo que
  // ya tenía.
  if (typeof refrescarSugerenciasDeAgentesParaLaCampana === 'function') {
    refrescarSugerenciasDeAgentesParaLaCampana();
  }

  // Si se entró desde un atajo del icono ("Invitados", "Dinero"…), se
  // abre esa vista en lugar del Resumen.
  const parametros = new URLSearchParams(location.search);
  const atajo = parametros.get('ir');

  /* ⚡ LA APP ABRE EN "HOY" (2026-09-03). Abría en Resumen, aunque el HTML
     marcaba Hoy como la vista activa y tres comentarios distintos del código
     afirmaban que "Hoy es la puerta de entrada". Nadie lo había notado
     porque la contradicción estaba repartida en dos archivos.

     No es un detalle: el día de la fiesta, TODA tarea empezaba pagando un
     toque para llegar a la pantalla que se hizo justamente para ese día
     —marcar llegadas, buscar a alguien, ver el plano—, y el objetivo ahí son
     dos toques en total. Ese peaje se lo comía uno de los dos. */
  if (atajo === 'nota') {
    irA('hoy');
    abrirHojaDeNota();
  } else if (atajo && VISTAS[atajo]) {
    irA(atajo);
  } else {
    irA('hoy');
  }

  /* Se limpia el parámetro de la barra de direcciones para que al recargar
     no vuelva a abrirse el atajo.

     ⚠️ SE CONSERVA history.state (2026-09-03). Acá se pasaba `null` como
     estado, lo que borraba la marca de vista que deja irA() para que el
     gesto de "atrás" de Android funcione (ver la nota en 05-navegacion.js).
     El resultado era que el atrás quedaba roto justamente al entrar por un
     atajo del icono, que es la forma más rápida de abrir el panel. */
  if (atajo) history.replaceState(history.state, '', location.pathname);
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
        'Aquí va a quedar registrado cada cambio, con quién lo hizo.');
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
async function abrirHojaDeCuenta() {
  // Se pide 'quien' de nuevo en vez de confiar en el USUARIO ya cargado:
  // así la pregunta de seguridad que se muestra es siempre la que hay de
  // verdad en el servidor, no una copia que pudo quedar vieja desde que
  // se entró (ver por qué en sesion.php: 'entrar' no la manda, 'quien' sí).
  let usuarioAlDia = USUARIO;
  try {
    const respuesta = await traer('sesion.php?accion=quien');
    usuarioAlDia = respuesta.usuario;
  } catch (error) {
    // Sin señal, se sigue con lo que ya había en memoria: mejor una
    // pregunta quizás desactualizada que la hoja entera sin abrir.
  }

  const cuerpo = abrirHoja('Mi cuenta',
    '<div class="detalle" style="margin-bottom:var(--esp-4)">' +
      '<span class="detalle__rotulo">Nombre</span>' +
      '<span class="detalle__valor">' + seguro(usuarioAlDia.nombre) + '</span>' +
      '<span class="detalle__rotulo">Correo</span>' +
      '<span class="detalle__valor">' + seguro(usuarioAlDia.correo) + '</span>' +
      '<span class="detalle__rotulo">Rol</span>' +
      '<span class="detalle__valor">' +
        (usuarioAlDia.rol === 'admin' ? 'Administradora' : 'Entrada') +
      '</span>' +
    '</div>' +

    '<h3 style="margin-bottom:var(--esp-2)">Cambiar contraseña</h3>' +
    campoTexto({ id: 'clave-actual', rotulo: 'Contraseña actual', tipo: 'password' }) +
    campoTexto({ id: 'clave-nueva',  rotulo: 'Contraseña nueva',  tipo: 'password',
                 ayuda: 'Al menos 10 caracteres. Se cerrará la sesión en todos los dispositivos.' }) +
    '<button type="button" class="boton boton--principal boton--ancho" id="cambiar-clave">' +
      'Cambiar contraseña' +
    '</button>' +

    '<h3 style="margin-top:var(--esp-5);margin-bottom:var(--esp-2)">Pregunta de seguridad</h3>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      (usuarioAlDia.pregunta_seguridad
        ? 'Configurada: "' + seguro(usuarioAlDia.pregunta_seguridad) + '". Se usa para pedir el ' +
          'código de "olvidé mi contraseña" en el login — sin acertarla, el código no se manda.'
        : 'Todavía no tienes una. Sin ella, si olvidas tu contraseña, alguien con rol ' +
          'administradora tiene que ponerte una nueva a mano desde Ajustes → Cuentas.') +
    '</p>' +
    campoLista({
      id: 'pregunta-elegida', rotulo: 'Pregunta',
      opciones: PREGUNTAS_DE_SEGURIDAD.map(p => ({ valor: p, texto: p })),
      valor: usuarioAlDia.pregunta_seguridad || '',
    }) +
    campoTexto({ id: 'pregunta-respuesta', rotulo: 'Tu respuesta',
                 ayuda: 'No hace falta mayúsculas ni acentos exactos: se compara sin eso.' }) +
    campoTexto({ id: 'pregunta-clave-actual', rotulo: 'Tu contraseña actual', tipo: 'password',
                 ayuda: 'Para confirmar que eres tú quien la está cambiando.' }) +
    '<button type="button" class="boton boton--principal boton--ancho" id="guardar-pregunta">' +
      'Guardar pregunta de seguridad' +
    '</button>'
  );

  buscar('#cambiar-clave', cuerpo).addEventListener('click', async () => {
    const actual = valorDe('clave-actual', cuerpo);
    const nueva  = valorDe('clave-nueva', cuerpo);

    if (!actual || !nueva) { avisar('Completa los dos campos.', true); return; }

    try {
      await mandar('sesion.php?accion=cambiar', { actual: actual, nueva: nueva });
      cerrarHoja(true);
      borrarToken();
      mostrarPantallaDeEntrada('Contraseña cambiada. Entra con la nueva.');
    } catch (error) {
      avisar(error.message, true);
    }
  });

  buscar('#guardar-pregunta', cuerpo).addEventListener('click', async () => {
    const pregunta  = valorDe('pregunta-elegida', cuerpo);
    const respuesta = valorDe('pregunta-respuesta', cuerpo);
    const actual    = valorDe('pregunta-clave-actual', cuerpo);

    if (!pregunta || !respuesta || !actual) {
      avisar('Completa la pregunta, la respuesta y tu contraseña actual.', true);
      return;
    }

    try {
      await mandar('sesion.php?accion=pregunta_seguridad',
        { actual: actual, pregunta: pregunta, respuesta: respuesta });
      cerrarHoja(true);
      avisar('Pregunta de seguridad guardada.');
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Cuándo fue la última vez que se guardó la copia semanal de todo (base
 * de datos + los archivos adjuntos de verdad), y un botón para correrla
 * en el momento. Ver cron_respaldo.php: el respaldo puede fallar en
 * silencio si el cron de Hostinger apunta al archivo equivocado —esto es
 * justamente para notarlo antes de que pasen meses, como pasó una vez.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeRespaldo() {
  const cuerpo = abrirHoja('Estado del respaldo', '<div id="respaldo-estado"></div>');
  const donde = buscar('#respaldo-estado', cuerpo);
  pintarCargando(donde, 2);

  const pintar = async () => {
    let estado;
    try {
      estado = await traer('cron_respaldo.php?accion=estado');
    } catch (error) {
      pintarError(donde, error.message, pintar);
      return;
    }

    if (!estado) {
      donde.innerHTML =
        '<p class="aviso-error">Todavía no corrió ni una vez. Si el cron ya está ' +
        'programado en hPanel, revisa que el comando apunte exactamente a ' +
        'admin/api/cron_respaldo.php — un cron apuntando a otro archivo no avisa ' +
        'de ningún error, simplemente nunca hace nada.</p>' +
        '<button type="button" class="boton boton--principal boton--ancho" ' +
                'id="respaldo-correr" style="margin-top:var(--esp-3)">' +
          'Respaldar ahora' +
        '</button>' +
        bloqueDeDescargarTodo();
    } else {
      const dias = diasHasta(String(estado.cuando).slice(0, 10));
      const haceCuanto = dias === 0 ? 'hoy'
        : dias === -1 ? 'ayer'
        : dias < 0 ? 'hace ' + (-dias) + ' días'
        : 'en el futuro (revisa la hora del servidor)';

      const vieja = dias < -10;

      donde.innerHTML =
        '<div class="detalle">' +
          '<span class="detalle__rotulo">Última vez</span>' +
          '<span class="detalle__valor">' + seguro(comoFecha(String(estado.cuando).slice(0, 10))) +
            ' (' + haceCuanto + ')</span>' +
          '<span class="detalle__rotulo">Registros guardados</span>' +
          '<span class="detalle__valor">' + seguro(estado.registros) + '</span>' +
          '<span class="detalle__rotulo">Archivos adjuntos incluidos</span>' +
          '<span class="detalle__valor">' + seguro(estado.archivos_incluidos) +
            (estado.archivos_afuera
              ? ' (' + estado.archivos_afuera + ' quedaron afuera por peso, se reintentan solos)'
              : '') + '</span>' +
          '<span class="detalle__rotulo">Correos enviados</span>' +
          '<span class="detalle__valor">' + seguro(estado.enviados) +
            (estado.errores ? ' (' + estado.errores + ' con error)' : '') + '</span>' +
        '</div>' +
        (vieja
          ? '<p class="aviso-error" style="margin-top:var(--esp-2)">Van más de 10 días ' +
            'sin respaldo. Revisa en hPanel que el cron semanal siga programado y ' +
            'apuntando a este archivo.</p>'
          : '') +
        '<button type="button" class="boton boton--principal boton--ancho" ' +
                'id="respaldo-correr" style="margin-top:var(--esp-3)">' +
          'Respaldar ahora' +
        '</button>' +
        bloqueDeDescargarTodo();
    }

    buscar('#respaldo-correr', donde).addEventListener('click', async () => {
      const boton = buscar('#respaldo-correr', donde);
      boton.disabled = true;
      boton.textContent = 'Respaldando…';

      try {
        await mandar('cron_respaldo.php', {});
        avisar('Respaldo enviado.');
        pintar();
      } catch (error) {
        avisar(error.message, true);
        boton.disabled = false;
        boton.textContent = 'Respaldar ahora';
      }
    });

    engancharDescargarTodo(donde);
  };

  pintar();
}

/**
 * El bloque "Descargar todo", que va debajo de "Respaldar ahora".
 *
 * POR QUÉ SON DOS BOTONES Y NO UNO
 * Hacen cosas distintas y se usan en momentos distintos:
 *
 *   · Respaldar ahora   → manda el correo semanal a mano. Entra la base
 *     entera y hasta 12 MB de archivos, que es lo que tolera un correo.
 *     Es la red de seguridad de todas las semanas.
 *   · Descargar todo    → se baja acá, ahora, la base entera MÁS TODOS
 *     los archivos, sin tope. Es lo que hay que hacer antes de tocar el
 *     hosting o de subir una versión nueva.
 *
 * El texto de abajo lo dice con esas palabras a propósito: si hay que
 * adivinar cuál de los dos usar, el que sabe no está en la pantalla.
 *
 * @returns {string} HTML
 */
function bloqueDeDescargarTodo() {
  return '' +
    '<div style="margin-top:var(--esp-4);padding-top:var(--esp-3);' +
                'border-top:1px solid var(--borde)">' +
      '<button type="button" class="boton boton--ancho" id="respaldo-bajar">' +
        'Descargar todo' +
      '</button>' +
      '<p class="vacio__texto" style="margin-top:var(--esp-2);font-size:13px">' +
        'Se baja a este dispositivo un ZIP con la base entera y ' +
        '<strong>todos</strong> los archivos, sin el tope de peso del correo. ' +
        'Hazlo antes de subir una versión nueva o de tocar el hosting.<br>' +
        'Se abre con la misma contraseña que los respaldos del correo.' +
      '</p>' +
    '</div>';
}

/**
 * Engancha el botón "Descargar todo".
 *
 * Pasa por bajarDelServidor() (03-servidor.js) y no por window.open()
 * ni por un enlace: la sesión del panel viaja en la cabecera
 * `Authorization`, y una pestaña nueva sale sin ella — el servidor
 * contestaría 401 y la descarga no funcionaría nunca.
 *
 * @param {Element} donde
 * @returns {void}
 */
function engancharDescargarTodo(donde) {
  const boton = buscar('#respaldo-bajar', donde);
  if (!boton) return;

  boton.addEventListener('click', async () => {
    if (!navigator.onLine) {
      avisar('Necesitas conexión para bajar el respaldo.', true);
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Armando el archivo…';

    try {
      await bajarDelServidor(
        'cron_respaldo.php?accion=descargar',
        'ania-xv-completo-' + hoyEnFecha() + '.zip'
      );
      avisar('Listo, revisa tus descargas.');
    } catch (error) {
      avisar(error.message, true);
    } finally {
      boton.disabled = false;
      boton.textContent = 'Descargar todo';
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

  ponerFraseDeBienvenida();

  prepararEntrada();
  prepararNavegacion();
  prepararHoja();
  prepararVisorDeArchivo();
  prepararAyuda();
  prepararBotonFlotante();
  prepararFab();

  /* Va acá y no dentro de la app porque el navegador dispara el aviso de
     "se puede instalar" muy temprano, a veces antes de que se abra la
     sesión. Si se enganchara después, ese aviso ya se habría perdido. */
  prepararInstalacion();

  buscar('#boton-buscar').addEventListener('click', abrirBuscadorGlobal);

  /* Se comprueba la sesión Y se espera la frase al mismo tiempo, no uno
     después del otro: así la frase no agrega ni un segundo de espera.
     Cuando la red es lenta, la frase se lee mientras se carga; cuando es
     rápida, la frase es lo que marca el ritmo. */
  const [haySesion] = await Promise.all([
    haySesionValida(),
    esperarLaFrase(),
  ]);

  if (haySesion) {
    /* Las etiquetas se traen ANTES de dibujar nada: si se pidieran
       después, las pestañas aparecerían con los nombres de fábrica y
       cambiarían solas un segundo más tarde. */
    await cargarEtiquetas();
    aplicarEtiquetas();

    // El sandwich del FAB y las frases del asistente son por cuenta:
    // recién acá se sabe quién es USUARIO, así que recién acá se puede
    // leer su localStorage.
    cargarSandwichGuardadoEnElTelefono();
    cargarFrasesAprendidasEnElTelefono();
    // ⚡ (2026-08-30) Vive en 46-agente-motivador.js, que dejó de
    // cargarse (MegaBot lo reemplaza) — el archivo queda en el repo por
    // si hace falta volver atrás, pero esta llamada tiene que
    // sobrevivir a que no esté, o el login entero tira ReferenceError.
    if (typeof cargarDiccionarioCarinosoEnElTelefono === 'function') {
      cargarDiccionarioCarinosoEnElTelefono();
    }

    arrancarLaApp();

    /* La paleta, el sandwich y las frases aprendidas, al revés que las
       etiquetas: NO se esperan. Ya se aplicó lo que había en el
       teléfono, así que la app ya se ve lista. Esto solo trae una
       versión más nueva por si se cambió desde otro teléfono, y se
       aplica calladamente cuando llegue — no vale la pena demorar el
       arranque por esto. */
    sincronizarPaletaConServidor();
    sincronizarSandwichConServidor();
    sincronizarFrasesConServidor();
    // ⚡ (2026-08-30) Mismo motivo que arriba: 46-agente-motivador.js
    // dejó de cargarse.
    if (typeof sincronizarDiccionarioCarinosoConServidor === 'function') {
      sincronizarDiccionarioCarinosoConServidor();
    }

    // Deja guardada una copia de cada sección por si se corta la señal
    // más tarde (Fase 8 del rediseño). Mismo criterio: no se espera, no
    // se avisa, trabaja calladamente por detrás.
    precalentarCopias();
  } else {
    mostrarPantallaDeEntrada();
  }
}

/**
 * Hace que el botón de notas se aparte al bajar y vuelva al subir.
 *
 * Antes tapaba el último botón de cada lista justo cuando uno terminaba
 * de recorrerla y quería usarlo.
 *
 * @returns {void}
 */
function prepararBotonFlotante() {
  const boton = buscar('#boton-accion');
  const contenido = buscar('#contenido');
  if (!boton || !contenido) return;

  let ultimoScroll = 0;

  /* Se escucha en window y no en el contenedor porque el que se desplaza
     de verdad es el documento: el contenido no tiene overflow propio. */
  window.addEventListener('scroll', () => {
    const ahora = window.scrollY;

    // Cerca del final se muestra siempre: ahí están los botones de
    // agregar, y esconderlo justo ahí no serviría de nada.
    const cercaDelFinal =
      (window.innerHeight + ahora) >= (document.documentElement.scrollHeight - 80);

    const bajando = ahora > ultimoScroll && ahora > 60;

    boton.classList.toggle('boton-flotante--apartado', bajando && !cercaDelFinal);
    ultimoScroll = ahora;
  }, { passive: true });
}

// Si el HTML todavía se está leyendo, se espera; si ya está listo (que
// es lo normal porque este script va al final), arranca de una.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', encender);
} else {
  encender();
}
