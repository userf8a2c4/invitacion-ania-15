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
  /** Y la que significa que no — se usa para precargar la respuesta ya
      dada, en el modo de invitación personalizada (ver más abajo). */
  const RESPUESTA_NEGATIVA = 'No podré asistir';

  /* ─── 0b. INVITACIÓN PERSONALIZADA (?i=TOKEN) ──────────────────────
     SOLO SE INTERCAMBIA EL FORMULARIO — el sobre, la cuenta regresiva,
     el mapa, todo lo demás de la web queda igual. Acá adentro, en vez
     de borrar el formulario del HTML, se ocultan sus campos numéricos
     y se inyecta un bloque hermano con la lista de personas del grupo
     (si el admin las cargó) o se deja el número de siempre, pero con
     tope de lugares.

     Escucha 'invitacion-lista' (disparado por
     codigo/04-invitado-personalizado.js) en vez de leer INVITACION
     directamente, porque ese archivo hace un fetch: para cuando este
     archivo termina de ejecutarse, todavía no hay respuesta. */
  let MODO_PERSONAS_ACTIVO = false;
  let PERSONAS_INVITACION = [];

  document.addEventListener('invitacion-lista', function (evento) {
    activarModoInvitacionPersonalizada(evento.detail);
  });

  /**
   * Adapta el formulario a una invitación con token: nombre y correo
   * quedan fijos, y se reemplaza el conteo de adultos/niños por la
   * lista de personas del grupo (si se cargaron) o por un tope de
   * lugares (si no).
   *
   * @param {Object} datos - La respuesta de invitacion.php.
   * @returns {void}
   */
  function activarModoInvitacionPersonalizada(datos) {
    if (!formulario || !datos) return;

    // Ya respondió y ya pasó la fecha límite: se reemplaza el formulario
    // entero por su pase, del lado del servidor TAMBIÉN se rechaza
    // cualquier intento de cambio (ver confirmar.php) — esto es solo
    // para no mostrar un formulario que de todos modos va a rechazar.
    if (datos.cerrado) {
      formulario.style.display = 'none';
      const contenedorFormulario = formulario.parentElement;
      if (contenedorFormulario && !buscar('#invitacion-cerrada')) {
        const aviso = document.createElement('p');
        aviso.id = 'invitacion-cerrada';
        aviso.className = 'formulario__introduccion';
        aviso.textContent = 'Las confirmaciones ya se cerraron. Si necesitas hacer un ' +
          'cambio, escríbenos.';
        contenedorFormulario.appendChild(aviso);
      }
      return;
    }

    if (campoNombre) {
      campoNombre.value = datos.nombre;
      campoNombre.readOnly = true;
    }
    if (campoCorreo && datos.correo) {
      campoCorreo.value = datos.correo;
      campoCorreo.readOnly = true;
    }

    if (datos.ya_respondio && campoAsistencia) {
      campoAsistencia.value = datos.asiste ? RESPUESTA_AFIRMATIVA : RESPUESTA_NEGATIVA;
      campoAsistencia.dispatchEvent(new Event('change'));
      if (botonEnviar) {
        botonEnviar.textContent = 'Actualizar mi respuesta ✦';
      }
    }

    const introduccion = buscar('.formulario__introduccion');
    if (introduccion) {
      introduccion.innerHTML = 'Hemos reservado <strong>' + datos.pases +
        (datos.pases === 1 ? ' lugar' : ' lugares') +
        '</strong> para ustedes. Pueden modificar su respuesta cuantas ' +
        'veces gusten mientras las confirmaciones sigan abiertas.';
    }

    const cajaCantidad = campoAdultos ? campoAdultos.closest('.campo') : null;

    if (datos.personas && datos.personas.length) {
      MODO_PERSONAS_ACTIVO = true;
      PERSONAS_INVITACION = datos.personas.map(function (p) {
        const esNino = p.tipo === 'nino';
        return {
          id: p.id,
          nombre: p.nombre,
          tipo: esNino ? 'nino' : 'adulto',
          marcado: datos.ya_respondio ? !!p.menu : true,
          menu: p.menu || (esNino ? 'Infantil' : 'Estándar'),
        };
      });

      /* ⚡ (2026-08-28) Bug real, no un borde: en una invitación NUEVA
         (todavía nadie contestó), el bloque que contiene la lista de
         personas (id="bloque-si-asiste") solo se muestra con la clase
         .visible, y esa clase SOLO se agregaba en el `change` de acá
         abajo (línea ~128) — que corre nada más si `ya_respondio` es
         true. Resultado: el invitado abría su link, veía "Hemos
         reservado 4 lugares" y el formulario entero quedaba vacío,
         porque la lista de nombres se dibujaba DENTRO de un contenedor
         invisible. Con personas nombradas, la pregunta "¿confirmas tu
         asistencia?" ya no aplica igual — el grupo YA fue invitado; lo
         que falta decir es QUIÉNES, y eso se dice destildando casillas
         (incluida la opción de destildarlas todas, que equivale a "no
         viene nadie" — ver el submit). Por eso se pre-elige "Sí" y se
         esconde el desplegable, en vez de dejarlo a mitad de camino.

         ⚠️ SOLO si todavía no había respondido: si ya_respondio es true,
         el bloque de arriba (línea ~126) ya puso el valor correcto
         (Sí/No según lo que declinó o confirmó la vez pasada) y ya
         disparó el `change` — pisarlo acá de nuevo con "Sí" siempre
         perdería una respuesta negativa ya guardada. */
      if (campoAsistencia) {
        if (!datos.ya_respondio) {
          campoAsistencia.value = RESPUESTA_AFIRMATIVA;
          campoAsistencia.dispatchEvent(new Event('change'));
        }
        const cajaAsistencia = campoAsistencia.closest('.campo');
        if (cajaAsistencia) cajaAsistencia.style.display = 'none';
      }

      if (cajaCantidad) cajaCantidad.style.display = 'none';
      if (bloqueMenuInfantil) bloqueMenuInfantil.classList.remove('visible');

      dibujarChecklistDePersonas();
    } else {
      // ⚡ (2026-08-28) Antes cada campo tenía `max = pases` por
      // separado: con 4 lugares, el HTML dejaba tipear 4 adultos Y 4
      // niños (8 en total) y recién el servidor lo rechazaba con un
      // 422 — un rebote evitable. Ahora cada campo recalcula su propio
      // tope descontando lo que ya se puso en el otro.
      const recalcularTopes = function () {
        const adultosPuestos = campoAdultos ? (parseInt(campoAdultos.value, 10) || 0) : 0;
        const ninosPuestos   = campoNinos   ? (parseInt(campoNinos.value, 10) || 0)   : 0;
        if (campoAdultos) campoAdultos.setAttribute('max', String(Math.max(1, datos.pases - ninosPuestos)));
        if (campoNinos)   campoNinos.setAttribute('max', String(Math.max(0, datos.pases - adultosPuestos)));
      };
      recalcularTopes();
      if (campoAdultos) campoAdultos.addEventListener('input', recalcularTopes);
      if (campoNinos)   campoNinos.addEventListener('input', recalcularTopes);

      if (datos.ya_respondio) {
        if (campoAdultos) campoAdultos.value = String(datos.adultos || 1);
        if (campoNinos) campoNinos.value = String(datos.ninos || 0);
        recalcularTopes();
        actualizarFilasDeAdultos();
        actualizarFilasDeNinos();
      }
    }

    if (datos.ya_respondio && campoAlergias && datos.alergias) {
      campoAlergias.value = datos.alergias;
    }
  }

  /**
   * Pinta la lista de personas con casillas + menú, dentro del
   * contenedor que normalmente lleva las filas de menú por adulto —
   * se reusa ese lugar del formulario, no se agrega uno nuevo al HTML.
   *
   * @returns {void}
   */
  function dibujarChecklistDePersonas() {
    if (!contenedorMenusAdultos) return;
    const cajaDelTitulo = contenedorMenusAdultos.closest('.campo');
    if (cajaDelTitulo) {
      const titulo = cajaDelTitulo.querySelector('.campo__titulo');
      if (titulo) titulo.textContent = 'Personas del grupo';
    }

    contenedorMenusAdultos.innerHTML = PERSONAS_INVITACION.map(function (persona, indice) {
      // A los niños no se les ofrece elegir menú — el formulario abierto
      // de siempre tampoco lo hace, todos llevan el mismo infantil (ver
      // "Menú de los niños" en index.html). Antes de esto se les
      // mostraban los mismos radios de adulto, y si ya tenían guardado
      // 'Infantil' ningún radio matcheaba (esa etiqueta no está en
      // MENUS_DE_ADULTO) — la fila se veía sin nada tildado, mintiendo
      // sobre lo que se iba a guardar al enviar.
      const opcionesEnHtml = persona.tipo === 'nino'
        ? '<span class="fila-persona__nino">Menú infantil</span>'
        : MENUS_DE_ADULTO.map(function (menu) {
            return '<label class="opcion-menu opcion-menu--unica">' +
              '<input type="radio" name="persona-menu-' + indice + '" value="' + menu.valor + '"' +
              (menu.valor === persona.menu ? ' checked' : '') + '>' +
              '<span>' + menu.etiqueta + '</span></label>';
          }).join('');

      return '<div class="fila-persona" data-persona-indice="' + indice + '">' +
        '<label class="fila-persona__nombre" style="display:flex;align-items:center;gap:8px">' +
          '<input type="checkbox" data-persona-marcada' + (persona.marcado ? ' checked' : '') + '>' +
          limpiarTexto(persona.nombre) +
        '</label>' +
        '<div class="fila-persona__opciones" data-persona-opciones' +
          (persona.marcado ? '' : ' style="display:none"') + '>' + opcionesEnHtml + '</div>' +
      '</div>';
    }).join('');

    contenedorMenusAdultos.querySelectorAll('[data-persona-marcada]').forEach(function (casilla, indice) {
      casilla.addEventListener('change', function () {
        PERSONAS_INVITACION[indice].marcado = casilla.checked;
        const opciones = contenedorMenusAdultos.querySelector(
          '[data-persona-indice="' + indice + '"] [data-persona-opciones]');
        if (opciones) opciones.style.display = casilla.checked ? '' : 'none';
        actualizarContadorDePersonas();
      });
    });

    contenedorMenusAdultos.querySelectorAll('[data-persona-indice]').forEach(function (fila, indice) {
      fila.querySelectorAll('input[type="radio"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          if (radio.checked) PERSONAS_INVITACION[indice].menu = radio.value;
        });
      });
    });

    actualizarContadorDePersonas();
  }

  /**
   * "3 de 4 lugares confirmados", debajo de la lista de personas.
   *
   * @returns {void}
   */
  function actualizarContadorDePersonas() {
    if (!contenedorMenusAdultos) return;
    let nota = contenedorMenusAdultos.parentElement.querySelector('.nota-personas');
    if (!nota) {
      nota = document.createElement('p');
      nota.className = 'nota-campo nota-personas';
      contenedorMenusAdultos.parentElement.appendChild(nota);
    }
    const marcados = PERSONAS_INVITACION.filter(function (p) { return p.marcado; }).length;
    nota.textContent = marcados + ' de ' + PERSONAS_INVITACION.length + ' lugares confirmados';
  }

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
    // Modo con personas nombradas: el menú de cada quien ya se leyó al
    // vuelo en dibujarChecklistDePersonas() (PERSONAS_INVITACION[i].menu).
    // Acá solo se arma la lista con las que quedaron tildadas.
    if (MODO_PERSONAS_ACTIVO) {
      return PERSONAS_INVITACION
        .filter(function (p) { return p.marcado; })
        .map(function (p) {
          return { quien: p.nombre, menu: p.tipo === 'nino' ? 'Infantil' : p.menu };
        });
    }

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

    // Con personas nombradas, "viene" significa "al menos una tildada" —
    // el desplegable de asistencia sigue mandando (si dice que no, nadie
    // viene aunque hubiera tildes), pero dentro del sí, el número real
    // sale de la lista, no de un campo numérico que ni se ve.
    const personasMarcadas = MODO_PERSONAS_ACTIVO
      ? PERSONAS_INVITACION.filter(function (p) { return p.marcado; })
      : [];

    const vieneALaFiesta = asistencia === RESPUESTA_AFIRMATIVA &&
      (!MODO_PERSONAS_ACTIVO || personasMarcadas.length > 0);

    const cantidadAdultos = !vieneALaFiesta ? 0
      : MODO_PERSONAS_ACTIVO
        ? personasMarcadas.filter(function (p) { return p.tipo !== 'nino'; }).length
        : limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    const cantidadNinos = !vieneALaFiesta ? 0
      : MODO_PERSONAS_ACTIVO
        ? personasMarcadas.filter(function (p) { return p.tipo === 'nino'; }).length
        : limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
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

    // Con invitación personalizada, el token viaja siempre: es lo que
    // hace que confirmar.php actualice ESA fila en vez de crear una
    // nueva (ver la nota grande en confirmar.php, Fase 5 del plan).
    if (typeof INVITACION !== 'undefined' && INVITACION && INVITACION.ok) {
      datosDeLaConfirmacion.token = new URLSearchParams(window.location.search).get('i') || '';

      // Con personas nombradas, cada una lleva su propio menú (o marca
      // que no viene) — confirmar.php actualiza `acompanantes` fila por
      // fila con esto, sin borrar y reinsertar a nadie.
      if (MODO_PERSONAS_ACTIVO) {
        datosDeLaConfirmacion.personas = PERSONAS_INVITACION.map(function (p) {
          return { id: p.id, marcado: p.marcado, menu: p.tipo === 'nino' ? 'Infantil' : p.menu };
        });
      }
    }

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
