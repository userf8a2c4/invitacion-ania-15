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

  /* ⚡ escucharEventoQueQuizasYaPaso() Y NO addEventListener DIRECTO
     (2026-09-02). Este archivo se inyecta recién al hacer clic en el
     sobre, mientras que 04-invitado-personalizado.js es "core" y dispara
     'invitacion-lista' apenas le contesta el servidor —mucho antes—. Con
     un addEventListener común el evento ya había pasado y se perdía: el
     invitado abría su link personal y veía igual el formulario genérico.
     Esta función (02-utilidades.js) entrega el evento aunque haya ocurrido
     antes, con su mismo `detail`. */
  escucharEventoQueQuizasYaPaso('invitacion-lista', function (evento) {
    activarModoInvitacionPersonalizada(evento.detail);
  });

  /* Sin link personal válido no se muestra ningún formulario: las
     invitaciones son nominales y con cupo. Ver la nota en 04. */
  escucharEventoQueQuizasYaPaso('invitacion-sin-acceso', function (evento) {
    cerrarElFormularioSinLink((evento.detail || {}).motivo);
  });

  /**
   * Reemplaza el formulario por un mensaje, según por qué no hay acceso.
   *
   * @param {string} motivo - 'sin-link', 'no-encontrada' o 'sin-conexion'.
   * @returns {void}
   */
  function cerrarElFormularioSinLink(motivo) {
    if (!formulario || buscar('#invitacion-sin-acceso')) return;

    const textos = {
      'sin-link':
        'Esta invitación es personal. Abrí el enlace que te enviamos para ' +
        'confirmar tu asistencia — ahí van a aparecer los nombres de tu ' +
        'familia y sus lugares.',
      'no-encontrada':
        'No encontramos esta invitación. Puede que el enlace esté incompleto: ' +
        'volvé a abrirlo desde el mensaje que te enviamos.',
      'sin-conexion':
        'No pudimos cargar tu invitación. Revisá tu conexión y volvé a ' +
        'cargar la página.',
    };

    formulario.style.display = 'none';
    const contenedorFormulario = formulario.parentElement;
    if (!contenedorFormulario) return;

    const aviso = document.createElement('p');
    aviso.id = 'invitacion-sin-acceso';
    aviso.className = 'formulario__introduccion';
    aviso.textContent = textos[motivo] || textos['sin-link'];
    contenedorFormulario.appendChild(aviso);
  }

  /**
   * Adapta el formulario a una invitación con token: nombre y correo
   * quedan fijos, y se reemplaza el conteo de adultos/niños por la
   * lista de personas del grupo (si se cargaron) o por un tope de
   * lugares (si no).
   *
   * @param {Object} datos - La respuesta de invitacion.php.
   * @returns {void}
   */
  /**
   * Cómo se saluda a este grupo arriba del formulario.
   *
   * El nombre lo escribe Lucila en el panel y es texto libre: puede ser una
   * persona ("Monserrat Barrera") o ya una familia ("Familia Zelaya"). Si el
   * grupo tiene más de un lugar, se agrega " y familia" — pero solo cuando
   * el nombre no dice ya algo así, para no terminar en "Familia Zelaya y
   * familia".
   *
   * @param {Object} datos - La respuesta de invitacion.php.
   * @returns {string}
   */
  function nombreParaMostrar(datos) {
    const nombre = (datos.nombre || '').trim();
    if (!nombre) return nombre;

    const cuantos = (datos.personas && datos.personas.length) || Number(datos.pases) || 1;
    if (cuantos < 2) return nombre;

    const enMinusculas = nombre.toLowerCase();
    const yaEsFamilia = enMinusculas.indexOf('familia') !== -1 ||
                        enMinusculas.indexOf('flia') !== -1 ||
                        enMinusculas.indexOf(' y ') !== -1;
    return yaEsFamilia ? nombre : nombre + ' y familia';
  }

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
      campoNombre.value = nombreParaMostrar(datos);
      campoNombre.readOnly = true;

      /* ⚡ (2026-08-28) Antes esto dejaba el input intacto (solo con
         readOnly, sin ningún cambio visual): se veía IDÉNTICO a un campo
         que pide escribir el nombre, aunque no se pudiera tocar — muy
         fácil de leer como "quiere que yo escriba mi nombre". Con la
         invitación ya nominal, no hace falta pedirlo: se muestra como un
         dato fijo, no como una pregunta. */
      campoNombre.style.background = 'transparent';
      campoNombre.style.border = 'none';
      campoNombre.style.padding = '0';
      campoNombre.style.cursor = 'default';
      campoNombre.tabIndex = -1;
      const etiquetaNombre = campoNombre.closest('.campo')
        ? campoNombre.closest('.campo').querySelector('label') : null;
      /* "Te" o "Les" según cuántos lugares tiene el grupo: hablarle de
         usted a una sola persona, o en singular a una familia, se nota. */
      if (etiquetaNombre) {
        const cuantosLugares = (datos.personas && datos.personas.length) ||
                               Number(datos.pases) || 1;
        etiquetaNombre.textContent = cuantosLugares > 1 ? 'Les invitamos' : 'Te invitamos';
      }
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
        const alergiaPrevia = (p.alergias || '').trim();
        return {
          id: p.id,
          nombre: p.nombre,
          tipo: esNino ? 'nino' : 'adulto',
          /* ⚡ DESTILDADAS AL ABRIR (2026-09-02). Antes una invitación nueva
             llegaba con todos tildados y el contador decía "5 de 5
             confirmados" sin que nadie hubiera elegido nada: la página
             daba por hecha la respuesta y quien venía a decir que falta
             uno tenía que DESmarcar. Ahora arranca en cero y confirmar es
             un acto deliberado. Si ya había respondido, se respeta lo que
             dejó guardado. */
          marcado: datos.ya_respondio ? !!p.menu : false,
          menu: p.menu || (esNino ? 'Infantil' : 'Estándar'),
          tieneAlergia: alergiaPrevia !== '',
          alergia: alergiaPrevia,
        };
      });

      /* ⚡ (2026-08-28) Bug real, no un borde: en una invitación NUEVA
         (todavía nadie contestó), el bloque que contiene la lista de
         personas (id="bloque-si-asiste") solo se muestra con la clase
         .visible, y esa clase SOLO se agregaba en el `change` del
         desplegable de asistencia — que corre nada más si `ya_respondio`
         es true. Resultado: el invitado abría su link, veía "Hemos
         reservado 4 lugares" y el formulario entero quedaba vacío.

         ⚡⚡ (2026-08-28, segunda vuelta) La primera corrección todavía
         dependía del desplegable oculto: le forzaba el valor "Sí" y
         disparaba su `change` para que ESE handler mostrara el bloque.
         Eso rompía justo el caso de alguien que había declinado antes
         (ya_respondio=true, asiste=false): el bloque de arriba dejaba el
         desplegable en "No podré asistir" y SU `change` escondía el
         checklist — el invitado no tenía forma de volver a tildar a
         nadie, aunque el plan explícitamente pide que puedan cambiar de
         opinión cuantas veces quieran antes de la fecha límite.

         Con personas nombradas, la pregunta "¿confirmas tu asistencia?"
         no existe: quién viene se dice tildando o destildando cada
         nombre (destildarlos a todos equivale a "no viene nadie" — ver
         el submit), así que el checklist queda SIEMPRE visible, sin
         pasar por el desplegable ni por su lógica de visibilidad. */
      /* ⚡ EL DESPLEGABLE DE ASISTENCIA SE QUEDA (2026-09-02). Se había
         ocultado en modo personas, con la idea de que destildar a todos
         alcanzara para decir "no vamos". En la práctica eso obliga a
         deducir: hay que darse cuenta de que NO marcar es una respuesta.
         La pregunta directa —"¿confirmas tu asistencia?"— no se malentiende,
         y deja la lista para lo único que la lista sabe contestar bien:
         quiénes de la familia vienen. */
      if (campoAsistencia && campoAsistencia.value === '') {
        campoAsistencia.value = '';
      }
      if (bloqueSiAsiste && campoAsistencia &&
          campoAsistencia.value === RESPUESTA_AFIRMATIVA) {
        bloqueSiAsiste.classList.add('visible');
      }

      if (cajaCantidad) cajaCantidad.style.display = 'none';
      if (bloqueMenuInfantil) bloqueMenuInfantil.classList.remove('visible');

      // La caja de alergias compartida deja de tener sentido: cada
      // persona tiene la suya, dentro de su propia fila (ver
      // dibujarChecklistDePersonas()).
      if (campoAlergias) {
        const cajaAlergias = campoAlergias.closest('.campo');
        if (cajaAlergias) cajaAlergias.style.display = 'none';
      }

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
      if (titulo) titulo.textContent = 'Menú de invitados';

      /* Una línea que dice QUÉ HACER, no solo qué es esto. Las casillas
         arrancan vacías, así que sin esta frase alguien puede quedarse
         mirando la lista sin darse cuenta de que tiene que marcar. Se
         inserta una sola vez, justo debajo del título. */
      if (titulo && !cajaDelTitulo.querySelector('#instruccion-personas')) {
        const instruccion = document.createElement('p');
        instruccion.id = 'instruccion-personas';
        instruccion.className = 'nota-campo';
        instruccion.textContent = 'Marca quiénes vienen y elige su plato.';
        titulo.insertAdjacentElement('afterend', instruccion);
      }
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

      // ⚡ (2026-08-28) Alergia por persona, a pedido explícito: antes
      // había una sola caja de alergias para todo el grupo, y no decía
      // cuál de los tildados era el alérgico. Con esto se sabe, por
      // nombre, quién tiene qué — la caja compartida queda oculta (ver
      // activarModoInvitacionPersonalizada()).
      /* ⚡ LA ALERGIA VA EN LA MISMA FILA (2026-09-02), a la derecha del
         menú, no debajo. Colgada abajo se leía como una nota suelta del
         bloque entero; al lado del plato de esa persona queda claro de
         quién es la alergia. La casilla es cuadrada, igual que la de
         asistencia: las dos son preguntas de sí/no. */
      const alergiaEnHtml =
        '<div class="fila-persona__alergia">' +
          '<label class="fila-persona__alergia-check">' +
            '<input type="checkbox" data-persona-tiene-alergia' +
              (persona.tieneAlergia ? ' checked' : '') + '>' +
            '<span>Alergia</span>' +
          '</label>' +
          '<input type="text" data-persona-alergia-texto placeholder="¿Cuál? Ej. mariscos"' +
            ' value="' + limpiarTexto(persona.alergia || '') + '"' +
            (persona.tieneAlergia ? '' : ' style="display:none"') + '>' +
        '</div>';

      return '<div class="fila-persona" data-persona-indice="' + indice + '">' +
        '<label class="fila-persona__nombre" style="display:flex;align-items:center;gap:8px">' +
          '<input type="checkbox" data-persona-marcada' + (persona.marcado ? ' checked' : '') + '>' +
          limpiarTexto(persona.nombre) +
        '</label>' +
        '<div class="fila-persona__opciones" data-persona-opciones' +
          (persona.marcado ? '' : ' style="display:none"') + '>' +
          '<div class="fila-persona__menus">' + opcionesEnHtml + '</div>' +
          alergiaEnHtml +
        '</div>' +
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

      const casillaAlergia = fila.querySelector('[data-persona-tiene-alergia]');
      const textoAlergia   = fila.querySelector('[data-persona-alergia-texto]');
      if (casillaAlergia) {
        casillaAlergia.addEventListener('change', function () {
          PERSONAS_INVITACION[indice].tieneAlergia = casillaAlergia.checked;
          if (textoAlergia) {
            textoAlergia.style.display = casillaAlergia.checked ? '' : 'none';
            if (casillaAlergia.checked) textoAlergia.focus();
            else { textoAlergia.value = ''; PERSONAS_INVITACION[indice].alergia = ''; }
          }
        });
      }
      if (textoAlergia) {
        textoAlergia.addEventListener('input', function () {
          PERSONAS_INVITACION[indice].alergia = textoAlergia.value;
        });
      }
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

  /**
   * Con personas nombradas, la alergia se carga una por una (ver
   * dibujarChecklistDePersonas()) — esto arma el resumen de grupo que
   * sigue viajando a confirmar.php (columna compartida de siempre) y a
   * los correos, para no tener que leer cada acompanante por separado
   * para saber si alguien del grupo tiene alguna.
   *
   * @param {Array} personasMarcadas
   * @returns {string}
   */
  function armarResumenDeAlergiasPorPersona(personasMarcadas) {
    const conAlergia = personasMarcadas.filter(function (p) {
      return p.tieneAlergia && (p.alergia || '').trim() !== '';
    });
    if (!conAlergia.length) return '';
    return conAlergia
      .map(function (p) { return p.nombre + ': ' + p.alergia.trim(); })
      .join(' | ');
  }

  /* ─── 4. MOSTRAR Y OCULTAR SECCIONES ───────────────────────────── */

  if (campoAsistencia) {
    campoAsistencia.addEventListener('change', function alElegirSiViene() {
      const vieneALaFiesta = this.value === RESPUESTA_AFIRMATIVA;
      bloqueSiAsiste.classList.toggle('visible', vieneALaFiesta);

      // Agradecimiento cuando avisan que no pueden venir.
      const gracias = buscar('#gracias-por-avisar');
      if (gracias) {
        gracias.style.display =
          this.value === RESPUESTA_NEGATIVA ? 'block' : 'none';
      }
      /* En modo personas la lista ya está dibujada con los nombres reales
         del grupo: actualizarFilasDeAdultos() armaría las filas genéricas
         por cantidad y las pisaría. */
      if (!MODO_PERSONAS_ACTIVO && vieneALaFiesta && contenedorMenusAdultos &&
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

    if (!nombre) return mostrarError('Por favor escribe tu nombre completo.');

    /* ⚡ EL CORREO YA NO SE EXIGE (2026-09-02). Dejó de pedirse: los datos
       de contacto los administra Lucila desde el panel (ver la nota en el
       campo oculto de index.html). Igual se valida SI viene, porque el que
       viene sale del panel y un correo mal escrito ahí tiene que avisarse
       en vez de fallar callado al mandar el pase. */
    if (correo && !pareceUnCorreoValido(correo)) {
      return mostrarError('El correo que tenemos cargado no parece válido. Avísanos, por favor.');
    }
    // ⚡ (2026-08-28) Con personas nombradas no existe el desplegable de
    // asistencia (queda oculto desde que se activa el modo personas): "
    // ¿va a venir?" ya no se contesta ahí, se contesta tildando o
    // destildando cada nombre de la lista. Exigirle un valor a un campo
    // que ni siquiera se ve habría bloqueado el envío para siempre.
    if (!asistencia) {
      return mostrarError('Cuéntanos si van a poder acompañarnos.');
    }

    // Con personas nombradas, "viene" significa "al menos una tildada" —
    // el número real (y quién viene) sale siempre de la lista, nunca del
    // desplegable de asistencia (que en este modo ni se muestra).
    const personasMarcadas = MODO_PERSONAS_ACTIVO
      ? PERSONAS_INVITACION.filter(function (p) { return p.marcado; })
      : [];

    /* ⚡ QUIÉN CONTESTA QUÉ (2026-09-02): el desplegable dice SI VIENEN; la
       lista dice QUIÉNES. Antes, en modo personas, venir se deducía de que
       hubiera al menos una casilla marcada — o sea que "no vamos" se decía
       no haciendo nada, que es justo lo que nadie adivina. */
    const vieneALaFiesta = asistencia === RESPUESTA_AFIRMATIVA;

    /* ⚡ AVISO ANTES DE REGISTRAR UN "NO VAMOS" (2026-09-02). Desde que las
       casillas arrancan destildadas, mandar el formulario sin tocar nada es
       un camino fácil de recorrer sin querer — y significa exactamente lo
       contrario de lo que casi todos quieren decir. Se pregunta una sola vez,
       y si dice que no, no se manda nada y puede seguir marcando. Declinar
       sigue siendo posible: alcanza con confirmar acá. */
    /* Dijeron que sí vienen pero no marcaron a nadie: es una contradicción,
       y guardarla dejaría una confirmación de cero personas. Se pide el dato
       que falta en vez de adivinarlo. */
    if (vieneALaFiesta && MODO_PERSONAS_ACTIVO && personasMarcadas.length === 0) {
      return mostrarError('Marca al menos a una persona que va a acompañarnos.');
    }

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
    const alergias        = MODO_PERSONAS_ACTIVO
      ? armarResumenDeAlergiasPorPersona(personasMarcadas)
      : (campoAlergias ? campoAlergias.value.trim() : '');
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
          return {
            id: p.id,
            marcado: p.marcado,
            menu: p.tipo === 'nino' ? 'Infantil' : p.menu,
            alergia: p.tieneAlergia ? (p.alergia || '').trim() : '',
          };
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
