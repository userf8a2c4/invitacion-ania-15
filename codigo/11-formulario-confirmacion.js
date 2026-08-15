/* ══════════════════════════════════════════════════════════════════════
   11 · FORMULARIO DE CONFIRMACIÓN
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Todo lo relacionado con el formulario donde el invitado confirma:
   · muestra u oculta las preguntas según si viene o no
   · crea UNA FILA DE MENÚ POR PERSONA
   · valida que no falte nada
   · llama a confirmar.php (PHP guarda en MySQL y manda los dos correos)
   · llama a anotarEnLaHoja() como respaldo (Google Sheets)
   · guarda la confirmación y muestra el pase de acceso

   ÍNDICE
   1. Elementos del formulario
   2. Crear las filas de menú por persona
   3. Leer lo que se eligió y armar los resúmenes
   4. Mostrar y ocultar secciones según las respuestas
   5. Validación
   6. Envío
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElFormularioDeConfirmacion() {

  /* ─── 1. ELEMENTOS DEL FORMULARIO ──────────────────────────────── */

  const formulario             = buscar('#formulario-confirmacion');
  const campoNombre            = buscar('#campo-nombre');
  const campoCorreo            = buscar('#campo-correo');
  const campoAsistencia        = buscar('#campo-asistencia');
  const bloqueSiAsiste         = buscar('#bloque-si-asiste');
  const campoAdultos           = buscar('#campo-adultos');
  const campoNinos             = buscar('#campo-ninos');
  const contenedorMenusAdultos = buscar('#menus-de-adultos');
  const bloqueMenuInfantil     = buscar('#bloque-menu-infantil');
  const contenedorMenusNinos   = buscar('#menus-de-ninos');
  const campoAlergias          = buscar('#campo-alergias');
  const campoNotas             = buscar('#campo-notas');
  const botonEnviar            = buscar('#boton-enviar');
  const cajaDeError            = buscar('#error-del-formulario');
  const mensajeDeExito         = buscar('#mensaje-de-exito');

  if (!formulario) return;

  /* La biblioteca del QR (codigo/12-pase-de-acceso.js) ya no se carga
     sola al entrar a la web: se pide apenas alguien toca el formulario,
     de fondo, sin bloquear nada. Así, para cuando llegue al botón de
     confirmar —que tarda, como mínimo, lo que lleva llenar los campos—
     ya está lista y no se nota ninguna espera.

     ⚠️ EL "typeof" VA DENTRO DEL LISTENER, NO ACÁ AFUERA. Este archivo
     (11) se ejecuta ANTES que 12-pase-de-acceso.js en el orden de
     index.html, así que a esta altura cargarQRCode todavía no existe.
     Revisarlo recién cuando el evento dispara —bien después de que
     todos los <script defer> ya corrieron— es lo que lo hace andar.
     { once: true } porque con una vez alcanza: la promesa ya queda
     guardada adentro de cargarQRCode(). */
  formulario.addEventListener('focusin', () => {
    if (typeof cargarQRCode === 'function') cargarQRCode();
  }, { once: true });

  /** La respuesta que significa "sí, voy" en la lista desplegable. */
  const RESPUESTA_AFIRMATIVA = 'Sí, asistiré';

  /** Menús que puede elegir un adulto. */
  const MENUS_DE_ADULTO = [
    { valor: 'Estándar',    etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-menus"/></svg> Estándar' },
    { valor: 'Vegetariano', etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-hoja-menu"/></svg> Vegetariano' },
  ];

  /* ─── 2. CREAR LAS FILAS DE MENÚ POR PERSONA ───────────────────── */

  function leerEleccionesActuales(contenedor, prefijo) {
    const elecciones = [];
    if (!contenedor) return elecciones;
    const filas = contenedor.querySelectorAll('.fila-persona');
    filas.forEach((fila, indice) => {
      const marcado = fila.querySelector(`input[name="menu-${prefijo}-${indice + 1}"]:checked`);
      elecciones.push(marcado ? marcado.value : null);
    });
    return elecciones;
  }

  function dibujarFilasDeMenu(contenedor, cantidadDePersonas, prefijo,
    palabraSingular, menusDisponibles, menuPorDefecto) {
    if (!contenedor) return;
    const eleccionesPrevias = leerEleccionesActuales(contenedor, prefijo);
    contenedor.innerHTML = '';
    for (let numeroDePersona = 1; numeroDePersona <= cantidadDePersonas; numeroDePersona++) {
      const menuElegido = eleccionesPrevias[numeroDePersona - 1] || menuPorDefecto;
      const aclaracion  = (prefijo === 'adulto' && numeroDePersona === 1)
        ? '<small>quien confirma</small>'
        : '';
      const opcionesEnHtml = menusDisponibles.map(menu => `
        <label class="opcion-menu opcion-menu--unica">
          <input type="radio"
            name="menu-${prefijo}-${numeroDePersona}"
            value="${menu.valor}"
            ${menu.valor === menuElegido ? 'checked' : ''}>
          <span>${menu.etiqueta}</span>
        </label>`).join('');
      const fila = document.createElement('div');
      fila.className = 'fila-persona';
      fila.innerHTML = `
        <span class="fila-persona__nombre">${palabraSingular} ${numeroDePersona}${aclaracion}</span>
        <div class="fila-persona__opciones">${opcionesEnHtml}</div>`;
      contenedor.appendChild(fila);
    }
  }

  function actualizarFilasDeAdultos() {
    const cantidad = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    dibujarFilasDeMenu(contenedorMenusAdultos, cantidad, 'adulto', 'Adulto',
      MENUS_DE_ADULTO, 'Estándar');
  }

  function actualizarFilasDeNinos() {
    const cantidad  = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    const hayNinos  = cantidad > 0;
    if (bloqueMenuInfantil) {
      bloqueMenuInfantil.classList.toggle('visible', hayNinos);
    }
    if (!contenedorMenusNinos) return;
    if (!hayNinos) {
      contenedorMenusNinos.innerHTML = '';
      return;
    }
    contenedorMenusNinos.innerHTML = `
      <div class="tarjeta-infantil">
        <span class="tarjeta-infantil__icono"><svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-ninos"/></svg></span>
        <span class="tarjeta-infantil__texto">
          Menú infantil
          <small>${cantidad === 1 ? 'para 1 niño' : 'para los ' + cantidad + ' niños'}</small>
        </span>
        <span class="tarjeta-infantil__cantidad">×${cantidad}</span>
      </div>`;
  }

  if (campoAdultos) campoAdultos.addEventListener('input', actualizarFilasDeAdultos);
  if (campoNinos)   campoNinos.addEventListener('input', actualizarFilasDeNinos);

  /* ─── 3. LEER LO ELEGIDO Y ARMAR LOS RESÚMENES ─────────────────── */

  function recolectarMenusElegidos() {
    const elegidos = [];
    const cantidadAdultos = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    for (let i = 1; i <= cantidadAdultos; i++) {
      const marcado = formulario.querySelector(`input[name="menu-adulto-${i}"]:checked`);
      elegidos.push({ quien: `Adulto ${i}`, menu: marcado ? marcado.value : 'Estándar' });
    }
    const cantidadNinos = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    for (let i = 1; i <= cantidadNinos; i++) {
      elegidos.push({ quien: `Niño ${i}`, menu: 'Infantil' });
    }
    return elegidos;
  }

  function armarResumenDeMenus(menusElegidos) {
    const cuantosDeCada = {};
    menusElegidos.forEach(persona => {
      cuantosDeCada[persona.menu] = (cuantosDeCada[persona.menu] || 0) + 1;
    });
    return Object.entries(cuantosDeCada)
      .map(([nombreDelMenu, cantidad]) => `${cantidad} ${nombreDelMenu.toLowerCase()}`)
      .join(' · ');
  }

  function armarDetalleDeMenus(menusElegidos) {
    return menusElegidos
      .map(persona => `${persona.quien}: ${persona.menu}`)
      .join(' | ');
  }

  /* ─── 4. MOSTRAR Y OCULTAR SECCIONES ───────────────────────────── */

  if (campoAsistencia) {
    campoAsistencia.addEventListener('change', function alElegirSiViene() {
      const vieneALaFiesta = this.value === RESPUESTA_AFIRMATIVA;
      bloqueSiAsiste.classList.toggle('visible', vieneALaFiesta);
      if (vieneALaFiesta && contenedorMenusAdultos &&
          contenedorMenusAdultos.children.length === 0) {
        actualizarFilasDeAdultos();
      }
    });
  }

  /* ─── 5. VALIDACIÓN ────────────────────────────────────────────── */

  function mostrarError(mensaje) {
    if (!cajaDeError) return;
    cajaDeError.textContent = mensaje;
    cajaDeError.style.display = mensaje ? 'block' : 'none';
  }

  function pareceUnCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  /* ─── 6. ENVÍO ─────────────────────────────────────────────────── */

  formulario.addEventListener('submit', async function alEnviarElFormulario(evento) {
    evento.preventDefault();
    mostrarError('');

    const nombre     = campoNombre.value.trim();
    const correo     = campoCorreo.value.trim();
    const asistencia = campoAsistencia.value;

    if (!nombre)     return mostrarError('Por favor escribe tu nombre completo.');
    if (!correo)     return mostrarError('Por favor escribe tu correo electrónico.');
    if (!pareceUnCorreoValido(correo)) {
      return mostrarError('Ese correo no parece válido. Revisa que tenga @ y un punto.');
    }
    if (!asistencia) return mostrarError('Cuéntanos si vas a poder acompañarnos.');

    const vieneALaFiesta  = asistencia === RESPUESTA_AFIRMATIVA;
    const cantidadAdultos = vieneALaFiesta ? limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20) : 0;
    const cantidadNinos   = vieneALaFiesta ? limitar(parseInt(campoNinos.value, 10) || 0, 0, 20) : 0;
    const menusElegidos   = vieneALaFiesta ? recolectarMenusElegidos() : [];
    const resumenDeMenus  = vieneALaFiesta ? armarResumenDeMenus(menusElegidos) : ', ';
    const detalleDeMenus  = vieneALaFiesta ? armarDetalleDeMenus(menusElegidos) : ', ';
    const alergias        = campoAlergias ? campoAlergias.value.trim() : '';
    const notas           = campoNotas ? campoNotas.value.trim() : '';

    const datosDeLaConfirmacion = {
      nombre,
      correo,
      asiste: vieneALaFiesta,
      adultos: cantidadAdultos,
      ninos: cantidadNinos,
      resumenDeMenus,
      detalleDeMenus,
      alergias: alergias || 'Ninguna',
      notas: notas || ', ',
      codigo: generarCodigoDePase(nombre + correo),
    };

    /* ESTADO DE ESPERA */
    const textoOriginalDelBoton = botonEnviar.innerHTML;
    botonEnviar.disabled = true;
    botonEnviar.classList.add('esta-enviando');
    botonEnviar.innerHTML =
      '<span class="rombos-de-carga" role="status" aria-label="Enviando tu confirmación">' +
      '<i></i><i></i><i></i></span>';

    const esperaMinima = esperar(900);

    /* ══════════════════════════════════════════════════════════════
       ENVÍO PRINCIPAL: confirmar.php (MySQL + correos)
       Se manda SIEMPRE, asista o no, porque ambos casos necesitan
       guardarse en BD y avisar a la administradora.
       ══════════════════════════════════════════════════════════════ */
    /* Se pide el envío al servidor y, en paralelo, la anotación de
       respaldo. Solo el primero decide si la confirmación valió: la hoja
       de Google es opcional y su fallo no debe frenar a nadie.

       Si enviarAlServidor no existiera (por ejemplo, porque el navegador
       cargó una versión vieja del código desde su caché), la llamada
       lanzaría una excepción. Se captura acá a propósito: sin esto, el
       formulario mostraba "confirmado" sin haber mandado nada, que es
       justo como este problema pasó desapercibido tanto tiempo. */
    let seGuardoEnElServidor = false;
    try {
      const [resultadoDelServidor] = await Promise.all([
        enviarAlServidor(datosDeLaConfirmacion),  // PHP: MySQL + correos
        anotarEnLaHoja(datosDeLaConfirmacion),    // Google Sheets: respaldo
      ]);
      seGuardoEnElServidor = resultadoDelServidor === true;
    } catch (error) {
      console.error('[Ania XV] El envío falló:', error);
    }

    await esperaMinima;

    botonEnviar.classList.remove('esta-enviando');
    botonEnviar.innerHTML = textoOriginalDelBoton;
    botonEnviar.disabled = false;

    /* Si no se guardó, se dice. Nunca un "éxito" que no ocurrió: la
       persona debe poder reintentar en vez de creer que ya confirmó. */
    if (!seGuardoEnElServidor) {
      return mostrarError(
        'No pudimos registrar tu confirmación. Revisa tu conexión e ' +
        'inténtalo de nuevo. Si vuelve a fallar, escríbenos a ' +
        'info@aniaxv.com y te confirmamos a mano.'
      );
    }

    guardarEnMemoria('pase', datosDeLaConfirmacion);

    formulario.style.display = 'none';
    if (mensajeDeExito) mensajeDeExito.classList.add('visible');

    if (vieneALaFiesta) {
      await esperar(600);
      mostrarPaseDeAcceso(datosDeLaConfirmacion);
    }
  });

  /* Al cargar la página dibujamos la fila del primer adulto */
  if (campoAdultos) actualizarFilasDeAdultos();

})();
