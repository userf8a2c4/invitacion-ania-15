/* ══════════════════════════════════════════════════════════════════════
   08 · VISTA INVITADOS

   QUÉ HACE ESTE ARCHIVO
   La lista de quién confirmó, con buscador y filtros, el detalle de cada
   confirmación, y la edición.

   POR QUÉ SE FILTRA EN EL TELÉFONO Y NO EN EL SERVIDOR
   Los invitados de unos XV son decenas, no millones: caben de sobra en
   la memoria del teléfono. Traerlos una vez y filtrarlos acá hace que
   escribir en el buscador sea instantáneo, sin un viaje al servidor por
   cada letra. Si algún día fueran miles, habría que cambiarlo — pero
   optimizar para un caso que no existe es perder tiempo.

   ÍNDICE
     1. Dibujar la vista
     2. Filtrar y pintar la lista
     3. Detalle de una confirmación
     4. Editar y dar de alta
   ══════════════════════════════════════════════════════════════════════ */


/** Todas las confirmaciones, tal como llegaron del servidor. */
let INVITADOS = [];

/** Si la tabla permite editar (o sea, si tiene columna id). */
let INVITADOS_EDITABLES = false;

/** Qué filtro está puesto: 'todos', 'asisten', 'no_asisten'. */
let FILTRO_INVITADOS = 'todos';

/** Qué se escribió en el buscador. */
let BUSQUEDA_INVITADOS = '';


/* ─── 1. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide la lista y arma la pantalla de Invitados.
 *
 * @returns {Promise<void>}
 */
/** Qué sub-pestaña de "Gente" se está viendo: 'invitados' o 'contactos'. */
let SECCION_GENTE = 'invitados';

/**
 * Dibuja la pestaña Gente: las confirmaciones o la agenda completa.
 *
 * POR QUÉ LAS DOS COSAS COMPARTEN PESTAÑA
 * Porque las dos son personas, y meter una sexta pestaña abajo dejaba
 * los rótulos ilegibles en un teléfono angosto. Invitados queda primero
 * y es lo que se abre por defecto, así que para el uso de todos los
 * días no cambia nada.
 *
 * @returns {Promise<void>}
 */
async function dibujarGente() {
  const vista = buscar('#vista-invitados');

  vista.innerHTML =
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      '<button class="filtro' + (SECCION_GENTE === 'invitados' ? ' activo' : '') +
        '" data-gente="invitados">' + seguro(et('gente.invitados','Invitados')) + '</button>' +
      '<button class="filtro' + (SECCION_GENTE === 'contactos' ? ' activo' : '') +
        '" data-gente="contactos">' + seguro(et('gente.contactos','Agenda de contactos')) + '</button>' +
    '</div>' +
    '<div id="cuerpo-invitados"' +
      (SECCION_GENTE === 'invitados' ? '' : ' class="oculto"') + '></div>' +
    '<div id="cuerpo-contactos"' +
      (SECCION_GENTE === 'contactos' ? '' : ' class="oculto"') + '></div>';

  buscarTodos('[data-gente]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_GENTE = boton.dataset.gente;

      buscarTodos('[data-gente]', vista).forEach(o =>
        o.classList.toggle('activo', o === boton));

      buscar('#cuerpo-invitados', vista)
        .classList.toggle('oculto', SECCION_GENTE !== 'invitados');
      buscar('#cuerpo-contactos', vista)
        .classList.toggle('oculto', SECCION_GENTE !== 'contactos');

      // Cada una se carga la primera vez que se abre, no antes.
      if (SECCION_GENTE === 'contactos' && !CONTACTOS.length) dibujarContactos();
      if (SECCION_GENTE === 'invitados' && !INVITADOS.length) dibujarInvitados();
      else if (SECCION_GENTE === 'invitados') ponerTituloDeInvitados();
    });
  });

  if (SECCION_GENTE === 'contactos') await dibujarContactos();
  else await dibujarInvitados();
}

/**
 * Pone el título del encabezado con el recuento de invitados.
 *
 * Si se la llama sin números, los recalcula de lo que haya en memoria.
 * Eso hace falta al volver de la agenda de contactos, donde el título
 * quedó cambiado.
 *
 * @param {number} [confirmaciones]
 * @param {number} [personas]
 * @returns {void}
 */
function ponerTituloDeInvitados(confirmaciones, personas) {
  if (confirmaciones === undefined) {
    const visibles = INVITADOS.filter(invitadoPasaElFiltro);
    confirmaciones = visibles.length;
    personas = visibles.reduce((suma, fila) => {
      if (Number(fila.asiste) !== 1) return suma;
      return suma + (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);
    }, 0);
  }

  ponerTitulo('Gente',
    pluralizar(confirmaciones, 'confirmación', 'confirmaciones') +
    (personas ? ' · ' + pluralizar(personas, 'persona', 'personas') : ''));
}

/**
 * Pide la lista de confirmaciones y arma su sección.
 *
 * @returns {Promise<void>}
 */
async function dibujarInvitados() {
  const vista = buscar('#cuerpo-invitados');
  if (!vista) return;

  vista.innerHTML =
    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<input type="search" id="buscar-invitado" class="buscador__control" ' +
             'placeholder="Buscar por nombre, correo o código" ' +
             'autocapitalize="off" spellcheck="false">' +
    '</div>' +

    '<div class="filtros">' +
      '<button class="filtro activo" data-filtro="todos">Todos</button>' +
      '<button class="filtro" data-filtro="asisten">Asisten</button>' +
      '<button class="filtro" data-filtro="no_asisten">No asisten</button>' +
      '<button class="filtro" data-filtro="alergias">Con alergias</button>' +
      '<button class="filtro" data-filtro="sin_mesa">Sin mesa</button>' +
    '</div>' +

    '<div id="lista-invitados"></div>' +

    '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-3)">' +
      '<button class="boton" style="flex:1" id="inv-descargar">Descargar</button>' +
      '<button class="boton boton--principal" style="flex:1" id="inv-nuevo">' +
        'Agregar invitado</button>' +
    '</div>';

  const lista = buscar('#lista-invitados', vista);
  pintarCargando(lista, 6);

  try {
    const respuesta = await traer('confirmaciones.php?accion=listar');
    INVITADOS = respuesta.filas || [];
    INVITADOS_EDITABLES = !!respuesta.editable;
  } catch (error) {
    pintarError(lista, error.message, () => dibujarInvitados());
    throw error;
  }

  // Si la tabla no tiene id, el panel no puede editar ni borrar filas.
  // Se avisa una vez, en lugar de mostrar botones que fallarían.
  if (!INVITADOS_EDITABLES) {
    avisar('La tabla no tiene columna id: solo se puede consultar.', true);
  }

  engancharInvitados(vista);
  pintarListaDeInvitados();
}

/**
 * Engancha el buscador y los filtros.
 *
 * @param {Element} vista
 * @returns {void}
 */
function engancharInvitados(vista) {

  buscar('#inv-descargar', vista).addEventListener('click', () => {
    abrirHojaDeFormatos('Descargar invitados', exportarInvitados);
  });

  buscar('#inv-nuevo', vista).addEventListener('click', () => {
    if (!INVITADOS_EDITABLES) {
      avisar('La tabla no permite agregar invitados.', true);
      return;
    }
    abrirFormularioDeInvitado();
  });

  const buscador = buscar('#buscar-invitado', vista);

  buscador.value = BUSQUEDA_INVITADOS;
  buscador.addEventListener('input', () => {
    BUSQUEDA_INVITADOS = buscador.value;
    pintarListaDeInvitados();
  });

  buscarTodos('.filtro', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      FILTRO_INVITADOS = boton.dataset.filtro;

      buscarTodos('.filtro', vista).forEach(otro => {
        otro.classList.toggle('activo', otro === boton);
      });

      pintarListaDeInvitados();
    });
  });
}


/* ─── 2. FILTRAR Y PINTAR LA LISTA ─────────────────────────────────── */

/**
 * Aplica el filtro y la búsqueda, y pinta las filas.
 *
 * @returns {void}
 */
function pintarListaDeInvitados() {
  const lista = buscar('#lista-invitados');
  if (!lista) return;

  const visibles = INVITADOS.filter(invitadoPasaElFiltro);

  if (!visibles.length) {
    if (!INVITADOS.length) {
      pintarVacio(lista, 'Todavía no hay confirmaciones',
        'Van a aparecer acá en cuanto alguien responda la invitación.');
    } else {
      pintarVacio(lista, 'Nada coincide',
        'Probá con otra búsqueda o cambiá el filtro.');
    }
    ponerTitulo('Gente');
    return;
  }

  // El subtítulo dice cuántas personas suman los que se están viendo, no
  // cuántas filas hay: una confirmación puede traer cinco personas.
  const personas = visibles.reduce((suma, fila) => {
    if (Number(fila.asiste) !== 1) return suma;
    return suma + (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);
  }, 0);

  ponerTituloDeInvitados(visibles.length, personas);

  lista.innerHTML = visibles.map(filaDeInvitado).join('');

  buscarTodos('[data-invitado]', lista).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleDeInvitado(Number(boton.dataset.invitado));
    });
  });
}

/**
 * Dice si una confirmación pasa el filtro y la búsqueda actuales.
 *
 * @param {Object} fila
 * @returns {boolean}
 */
function invitadoPasaElFiltro(fila) {
  // Filtro.
  if (FILTRO_INVITADOS === 'asisten'    && Number(fila.asiste) !== 1) return false;
  if (FILTRO_INVITADOS === 'no_asisten' && Number(fila.asiste) !== 0) return false;

  if (FILTRO_INVITADOS === 'alergias') {
    const alergias = paraBuscar(fila.alergias || '');
    const nada = ['', 'ninguna', 'ninguno', 'no', 'n/a', '-'];
    if (nada.includes(alergias)) return false;
  }

  if (FILTRO_INVITADOS === 'sin_mesa' && fila.mesa) return false;

  // Búsqueda.
  if (!BUSQUEDA_INVITADOS.trim()) return true;

  const aguja = paraBuscar(BUSQUEDA_INVITADOS);
  const pajar = paraBuscar(
    [fila.nombre, fila.correo, fila.codigo, fila.notas].join(' ')
  );

  return pajar.includes(aguja);
}

/**
 * El HTML de una fila de la lista.
 *
 * @param {Object} fila
 * @returns {string}
 */
function filaDeInvitado(fila) {
  const asiste = Number(fila.asiste) === 1;
  const gente  = (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);

  const pie = [];
  if (asiste && gente) pie.push(pluralizar(gente, 'persona', 'personas'));
  if (fila.correo)     pie.push(fila.correo);

  return '' +
    '<button class="lista__fila" data-invitado="' + seguro(fila.id) + '">' +
      '<span class="punto punto--' + (asiste ? 'si' : 'no') + '"></span>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(fila.nombre || 'Sin nombre') + '</span>' +
        '<span class="lista__pie">' + seguro(pie.join(' · ')) + '</span>' +
      '</span>' +
      (fila.codigo && asiste
        ? '<span class="lista__lado codigo-pase">' + seguro(fila.codigo) + '</span>'
        : '') +
    '</button>';
}


/* ─── 3. DETALLE DE UNA CONFIRMACIÓN ───────────────────────────────── */

/**
 * Abre la hoja con todos los datos de una confirmación.
 *
 * @param {number} id
 * @returns {void}
 */
function abrirDetalleDeInvitado(id) {
  const fila = INVITADOS.find(f => Number(f.id) === Number(id));
  if (!fila) return;

  const asiste = Number(fila.asiste) === 1;
  const gente  = (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);

  const renglones = [
    ['Asistencia', asiste
      ? '<span class="etiqueta etiqueta--bien">Sí asiste</span>'
      : '<span class="etiqueta etiqueta--alerta">No puede</span>', true],
    ['Correo',   seguro(fila.correo || '—')],
    ['Personas', asiste
                 ? seguro(gente + ' (' +
                     pluralizar(fila.adultos || 0, 'adulto', 'adultos') + ', ' +
                     pluralizar(fila.ninos || 0, 'niño', 'niños') + ')')
                 : '—'],
    ['Menús',    seguro(fila.resumen_menus || '—')],
    ['Detalle',  seguro(fila.menus || '—')],
    ['Alergias', seguro(fila.alergias || 'Ninguna')],
    ['Notas',    seguro(fila.notas || '—')],
    ['Código',   fila.codigo
                 ? '<span class="codigo-pase">' + seguro(fila.codigo) + '</span>'
                 : '—', true],
  ];

  const detalle = renglones.map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + r[1] + '</span>'
  ).join('');

  const cuerpo = abrirHoja(fila.nombre || 'Confirmación',
    '<div class="detalle">' + detalle + '</div>' +
    (INVITADOS_EDITABLES
      ? '<div class="acciones">' +
          '<button class="boton boton--peligro" id="borrar-invitado">Borrar</button>' +
          '<button class="boton boton--principal" id="editar-invitado">Editar</button>' +
        '</div>'
      : '')
  );

  if (!INVITADOS_EDITABLES) return;

  buscar('#editar-invitado', cuerpo).addEventListener('click', () => {
    abrirFormularioDeInvitado(fila);
  });

  buscar('#borrar-invitado', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion(
      '¿Borrar la confirmación de ' + (fila.nombre || 'esta persona') + '?\n\n' +
      'No se puede deshacer.'
    )) return;

    try {
      await mandar('confirmaciones.php?accion=borrar', { id: fila.id });
      cerrarHoja();
      avisar('Confirmación eliminada.');
      ensuciarVistas('resumen');
      dibujarGente();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/* ─── 4. EDITAR Y DAR DE ALTA ──────────────────────────────────────── */

/**
 * Abre el formulario de edición o de alta.
 *
 * @param {Object} [fila] - Si viene, se edita. Si no, se da de alta.
 * @returns {void}
 */
function abrirFormularioDeInvitado(fila) {
  const esNuevo = !fila;
  const datos   = fila || {};

  const cuerpo = abrirHoja(esNuevo ? 'Agregar invitado' : 'Editar',
    campoTexto({ id: 'inv-nombre', rotulo: 'Nombre', valor: datos.nombre }) +
    campoTexto({ id: 'inv-correo', rotulo: 'Correo', valor: datos.correo, tipo: 'email' }) +

    campoLista({
      id: 'inv-asiste', rotulo: 'Asistencia',
      valor: Number(datos.asiste) === 1 ? '1' : '0',
      opciones: [
        { valor: '1', texto: 'Sí asiste' },
        { valor: '0', texto: 'No puede asistir' },
      ],
    }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'inv-adultos', rotulo: 'Adultos',
                   valor: datos.adultos || 0, tipo: 'number' }) +
      campoTexto({ id: 'inv-ninos', rotulo: 'Niños',
                   valor: datos.ninos || 0, tipo: 'number' }) +
    '</div>' +

    campoTexto({ id: 'inv-menus', rotulo: 'Resumen de menús',
                 valor: datos.resumen_menus,
                 pista: 'Por ejemplo: 2 pollo, 1 vegetariano' }) +
    campoTexto({ id: 'inv-alergias', rotulo: 'Alergias', valor: datos.alergias }) +
    campoLargo({ id: 'inv-notas', rotulo: 'Notas', valor: datos.notas }) +
    campoTexto({ id: 'inv-codigo', rotulo: 'Código de pase', valor: datos.codigo }) +

    pieDeFormulario(esNuevo ? 'Agregar' : 'Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('inv-nombre', cuerpo);
    if (!nombre) { avisar('El nombre no puede quedar vacío.', true); return; }

    const carga = {
      nombre:        nombre,
      correo:        valorDe('inv-correo', cuerpo),
      asiste:        valorDe('inv-asiste', cuerpo) === '1',
      adultos:       Number(valorDe('inv-adultos', cuerpo)) || 0,
      ninos:         Number(valorDe('inv-ninos', cuerpo)) || 0,
      resumen_menus: valorDe('inv-menus', cuerpo),
      alergias:      valorDe('inv-alergias', cuerpo),
      notas:         valorDe('inv-notas', cuerpo),
      codigo:        valorDe('inv-codigo', cuerpo),
    };

    if (!esNuevo) carga.id = datos.id;

    try {
      await mandar('confirmaciones.php?accion=' + (esNuevo ? 'crear' : 'editar'), carga);
      cerrarHoja();
      avisar(esNuevo ? 'Invitado agregado.' : 'Cambios guardados.');
      ensuciarVistas('resumen');
      dibujarGente();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}
