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

/** Si está activo el modo de selección múltiple (Fase 5 del rediseño). */
let SELECCION_ACTIVA = false;

/** Los id de confirmación marcados en modo selección. */
let SELECCIONADOS = new Set();


/* ─── 1. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide la lista y arma la pantalla de Invitados.
 *
 * @returns {Promise<void>}
 */
/** Qué sección de "Gente" se está viendo. Las claves salen de CONFIGURACION. */
let SECCION_GENTE = 'invitados';

/** Qué secciones ya pidieron sus datos, para no pedirlos dos veces. */
const GENTE_CARGADA = {};

/**
 * Dibuja la pestaña Gente.
 *
 * QUÉ HAY ACÁ ADENTRO
 * Invitados, Mesas, Regalos, Foráneos y la Agenda de contactos. Las
 * cinco son cosas sobre PERSONAS, y por eso viven juntas.
 *
 * POR QUÉ MESAS, REGALOS Y FORÁNEOS SE MUDARON DESDE EVENTO
 * Porque no son "qué falta preparar", son "quién viene". Estando en
 * Evento había que saltar de pestaña para ver quién confirmó y dónde
 * sentarlo, que son la misma decisión tomada en dos pantallas.
 *
 * POR QUÉ ACÁ SIGUEN SIENDO PÍLDORAS Y NO UN ÍNDICE COMO EVENTO
 * Porque son cinco y entran en un renglón. El índice de Evento existe
 * porque catorce píldoras se apilaban en cinco renglones; con cinco, el
 * índice sería un paso de más para llegar a lo mismo.
 *
 * @returns {Promise<void>}
 */
async function dibujarGente() {
  const vista    = buscar('#vista-invitados');
  const secciones = CONFIGURACION.seccionesDeGente;

  /* Se rehace el HTML entero, así que lo dibujado antes ya no existe.
     Sin esta limpieza, una sección quedaría marcada como cargada
     apuntando a un contenedor vacío y no se volvería a pintar nunca. */
  Object.keys(GENTE_CARGADA).forEach(k => { delete GENTE_CARGADA[k]; });

  vista.innerHTML =
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      secciones.map(s =>
        '<button class="filtro' + (SECCION_GENTE === s[0] ? ' activo' : '') +
        '" data-gente="' + seguro(s[0]) + '">' +
        seguro(et('gente.' + s[0], s[1])) + '</button>'
      ).join('') +
    '</div>' +

    /* Los cinco cuerpos conviven en el DOM y se alternan con .oculto,
       en vez de repintar uno solo. Así volver a una sección que ya se
       miró es instantáneo y no vuelve a pedir nada al servidor. */
    secciones.map(s =>
      '<div id="cuerpo-' + seguro(s[0]) + '"' +
      (SECCION_GENTE === s[0] ? '' : ' class="oculto"') + '></div>'
    ).join('');

  buscarTodos('[data-gente]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_GENTE = boton.dataset.gente;

      buscarTodos('[data-gente]', vista).forEach(o =>
        o.classList.toggle('activo', o === boton));

      secciones.forEach(s => {
        buscar('#cuerpo-' + s[0], vista)
          .classList.toggle('oculto', SECCION_GENTE !== s[0]);
      });

      pintarSeccionDeGente();
    });
  });

  await pintarSeccionDeGente();
}

/**
 * Pinta la sección de Gente que esté abierta.
 *
 * Cada una se carga la primera vez que se mira, no al abrir la pestaña:
 * pedir las cinco de entrada serían cinco viajes al servidor para ver
 * uno solo.
 *
 * @returns {Promise<void>}
 */
async function pintarSeccionDeGente() {
  const clave  = SECCION_GENTE;
  const cuerpo = buscar('#cuerpo-' + clave);
  if (!cuerpo) return;

  // Ya estaba dibujada: solo hay que corregir el título del encabezado.
  if (GENTE_CARGADA[clave]) {
    if (clave === 'invitados') ponerTituloDeInvitados();
    else ponerTitulo(tituloDeGente(clave));
    return;
  }

  GENTE_CARGADA[clave] = true;

  try {
    /* Invitados es la única que pone su propio título, porque le agrega
       el recuento de gente. Las demás lo toman de la configuración; si
       no se pusiera acá, quedaría el título de la sección anterior. */
    if (clave === 'invitados') { await dibujarInvitados(); return; }

    ponerTitulo(tituloDeGente(clave));

    if (clave === 'contactos') { await dibujarContactos(); return; }

    /* Mesas, Regalos y Foráneos salen de evento.php, que puede no
       haberse pedido todavía si nadie entró a la pestaña Evento. */
    pintarCargando(cuerpo, 4);
    await asegurarEvento();

    if (clave === 'mesas') { await pintarMesas(cuerpo); return; }

    if (clave === 'regalos') {
      // Los regalos llevan arriba la tarjeta de la lista de Amazon.
      cuerpo.innerHTML = tarjetaMesaDeRegalos() + '<div id="lista-regalos"></div>';
      engancharMesaDeRegalos(cuerpo);
      pintarSeccionGenerica(buscar('#lista-regalos', cuerpo), 'regalos');
      return;
    }

    pintarSeccionGenerica(cuerpo, clave);

  } catch (error) {
    // Se desmarca para que al volver a entrar lo intente de nuevo.
    GENTE_CARGADA[clave] = false;
    pintarError(cuerpo, error.message, () => {
      GENTE_CARGADA[clave] = false;
      pintarSeccionDeGente();
    });
  }
}

/**
 * Cómo se llama una sección de Gente en el encabezado.
 *
 * @param {string} clave
 * @returns {string}
 */
function tituloDeGente(clave) {
  const fila = CONFIGURACION.seccionesDeGente.find(s => s[0] === clave);
  return et('gente.' + clave, fila ? fila[1] : clave);
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
      '<button class="boton" style="flex:1" id="inv-seleccionar">Seleccionar</button>' +
      '<button class="boton" style="flex:1" id="inv-descargar">Descargar</button>' +
      '<button class="boton boton--principal" style="flex:1" id="inv-nuevo">' +
        'Agregar invitado</button>' +
    '</div>' +

    /* La barra flotante de acciones en lote. Vive siempre en el DOM,
       oculta hasta que haya algo seleccionado — más simple que armarla
       y desarmarla cada vez que cambia la selección. */
    '<div id="barra-seleccion" class="barra-seleccion oculto">' +
      '<span id="seleccion-cuantos" class="barra-seleccion__cuantos"></span>' +
      '<div class="barra-seleccion__botones">' +
        '<button class="boton boton--chico" id="sel-mesa">Asignar mesa</button>' +
        '<button class="boton boton--chico" id="sel-llegada">Marcar llegada</button>' +
        '<button class="boton boton--chico boton--peligro" id="sel-cancelar">Cancelar</button>' +
      '</div>' +
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

  const botonSeleccionar = buscar('#inv-seleccionar', vista);
  botonSeleccionar.addEventListener('click', () => {
    SELECCION_ACTIVA = !SELECCION_ACTIVA;
    if (!SELECCION_ACTIVA) SELECCIONADOS.clear();
    botonSeleccionar.textContent = SELECCION_ACTIVA ? 'Cancelar selección' : 'Seleccionar';
    pintarListaDeInvitados();
    actualizarBarraSeleccion();
  });

  buscar('#sel-cancelar', vista).addEventListener('click', salirDeSeleccion);

  buscar('#sel-mesa', vista).addEventListener('click', () => asignarMesaEnLote());
  buscar('#sel-llegada', vista).addEventListener('click', () => marcarLlegadaEnLote());
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
        'Van a aparecer aquí en cuanto alguien responda la invitación.');
    } else {
      pintarVacio(lista, 'Nada coincide',
        'Prueba con otra búsqueda o cambia el filtro.');
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
      const id = Number(boton.dataset.invitado);
      if (SELECCION_ACTIVA) {
        alternarSeleccion(id);
      } else {
        abrirDetalleDeInvitado(id);
      }
    });
  });
}

/**
 * Prende o apaga una confirmación en la selección múltiple.
 *
 * @param {number} id
 * @returns {void}
 */
function alternarSeleccion(id) {
  if (SELECCIONADOS.has(id)) {
    SELECCIONADOS.delete(id);
  } else {
    SELECCIONADOS.add(id);
  }
  pintarListaDeInvitados();
  actualizarBarraSeleccion();
}

/**
 * Muestra u oculta la barra flotante según haya algo seleccionado, y
 * actualiza el contador.
 *
 * @returns {void}
 */
function actualizarBarraSeleccion() {
  const barra = buscar('#barra-seleccion');
  if (!barra) return;

  const cuantos = SELECCIONADOS.size;
  barra.classList.toggle('oculto', !SELECCION_ACTIVA || cuantos === 0);

  const texto = buscar('#seleccion-cuantos', barra);
  if (texto) texto.textContent = pluralizar(cuantos, 'seleccionado', 'seleccionados');
}

/**
 * Sale del modo selección y limpia lo marcado.
 *
 * @returns {void}
 */
function salirDeSeleccion() {
  SELECCION_ACTIVA = false;
  SELECCIONADOS.clear();

  const boton = buscar('#inv-seleccionar');
  if (boton) boton.textContent = 'Seleccionar';

  pintarListaDeInvitados();
  actualizarBarraSeleccion();
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

  const alergiaBuscada = paraBuscar(fila.alergias || '');
  const nada = ['', 'ninguna', 'ninguno', 'no', 'n/a', '-'];
  const tieneAlergia = asiste && !nada.includes(alergiaBuscada);

  const pie = [];
  if (asiste && gente)  pie.push(pluralizar(gente, 'persona', 'personas'));
  if (asiste && fila.mesa) pie.push(fila.mesa);
  if (!asiste && fila.correo) pie.push(fila.correo);

  const marcado = SELECCIONADOS.has(Number(fila.id));

  return '' +
    '<button class="lista__fila" data-invitado="' + seguro(fila.id) + '">' +
      (SELECCION_ACTIVA
        ? '<span class="lista__casilla' + (marcado ? ' lista__casilla--marcada' : '') + '"></span>'
        : '<span class="punto punto--' + (asiste ? 'si' : 'no') + '"></span>') +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(fila.nombre || 'Sin nombre') + '</span>' +
        '<span class="lista__pie">' + seguro(pie.join(' · ')) + '</span>' +
      '</span>' +
      (tieneAlergia
        ? '<span class="etiqueta etiqueta--alerta lista__lado">Alergia</span>'
        : (fila.codigo && asiste && !SELECCION_ACTIVA
            ? '<span class="lista__lado codigo-pase">' + seguro(fila.codigo) + '</span>'
            : '')) +
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

  if (asiste) {
    renglones.push(['Mesa', fila.mesa
      ? '<span class="etiqueta etiqueta--bien">' + seguro(fila.mesa) + '</span>'
      : '<span class="etiqueta etiqueta--alerta">Sin asignar</span>', true]);
  }

  const detalle = renglones.map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + r[1] + '</span>'
  ).join('');

  const cuerpo = abrirHoja(fila.nombre || 'Confirmación',
    '<div class="detalle">' + detalle + '</div>' +
    (asiste
      ? '<div class="acciones">' +
          '<button class="boton" id="mesa-auto-invitado">Sentar solo</button>' +
          '<button class="boton boton--principal" id="mesa-elegir-invitado">' +
            (fila.mesa ? 'Cambiar mesa' : 'Elegir mesa') +
          '</button>' +
        '</div>'
      : '') +
    (asiste && fila.codigo
      ? '<div class="acciones">' +
          '<button class="boton boton--ancho" id="marcar-llegada-invitado">' +
            'Marcar llegada</button>' +
        '</div>'
      : '') +
    (asiste && gente ? '<div id="bloque-acompanantes"></div>' : '') +
    (INVITADOS_EDITABLES
      ? '<div class="acciones">' +
          '<button class="boton boton--peligro" id="borrar-invitado">Borrar</button>' +
          '<button class="boton boton--principal" id="editar-invitado">Editar</button>' +
        '</div>'
      : '')
  );

  if (asiste && gente) {
    dibujarAcompanantes(fila.id, gente, buscar('#bloque-acompanantes', cuerpo));
  }

  if (asiste) {
    const refrescar = () => { dibujarGente(); ensuciarVistas('resumen', 'evento'); };

    buscar('#mesa-auto-invitado', cuerpo).addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=sentar_auto', { confirmacion_id: fila.id });
        cerrarHoja(true);
        avisar(r.mensaje);
        refrescar();
      } catch (error) {
        avisar(error.message, true);
      }
    });

    buscar('#mesa-elegir-invitado', cuerpo).addEventListener('click', async () => {
      try {
        if (!MESAS) MESAS = await traer('mesas.php?accion=todo');
        if (!MESAS.mesas.length) {
          avisar('Todavía no armaste ninguna mesa. Ve a Evento → Mesas.', true);
          return;
        }
        elegirMesaPara(fila.id, refrescar);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }

  const botonLlegada = buscar('#marcar-llegada-invitado', cuerpo);
  if (botonLlegada) {
    botonLlegada.addEventListener('click', async () => {
      try {
        const r = await mandar('llegadas.php?accion=marcar', { codigo: fila.codigo });
        cerrarHoja(true);
        avisar(r.mensaje || 'Llegada marcada.');
        ensuciarVistas('hoy', 'resumen');
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }

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
      cerrarHoja(true);
      avisar('Confirmación eliminada.');
      ensuciarVistas('resumen');
      dibujarGente();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/**
 * Abre un selector de mesa y la asigna a todas las confirmaciones
 * marcadas en modo selección. No reusa elegirMesaPara() porque esa
 * está armada para una sola persona a la vez — acá se elige la mesa
 * una vez y se aplica en lote.
 *
 * @returns {Promise<void>}
 */
async function asignarMesaEnLote() {
  if (!SELECCIONADOS.size) return;

  try {
    if (!MESAS) MESAS = await traer('mesas.php?accion=todo');
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  if (!MESAS.mesas.length) {
    avisar('Todavía no armaste ninguna mesa. Ve a Evento → Mesas.', true);
    return;
  }

  const ids     = Array.from(SELECCIONADOS);
  const cuantos = ids.length;

  const cuerpo = abrirHoja('Asignar mesa a ' + pluralizar(cuantos, 'persona', 'personas'),
    MESAS.mesas.map(mesa =>
      '<button class="lista__fila" data-mesa="' + seguro(mesa.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(mesa.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(mesa.ocupados + ' de ' + mesa.capacidad) + '</span>' +
        '</span>' +
      '</button>'
    ).join('')
  );

  buscarTodos('[data-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const mesaId = Number(boton.dataset.mesa);
      cerrarHoja(true);

      let listas = 0;
      for (const id of ids) {
        try {
          await mandar('mesas.php?accion=sentar', { confirmacion_id: id, mesa_id: mesaId });
          listas++;
        } catch (error) {
          // Un rechazo (mesa llena, por ejemplo) no debe frenar al resto.
        }
      }

      avisar(
        listas === cuantos
          ? 'Se asignó mesa a ' + pluralizar(listas, 'persona', 'personas') + '.'
          : 'Se asignó a ' + listas + ' de ' + cuantos + '. Revisa los que quedaron fuera.',
        listas !== cuantos
      );

      MESAS = null;
      ensuciarVistas('resumen', 'evento');
      salirDeSeleccion();
      dibujarGente();
    });
  });
}

/**
 * Marca la llegada de todas las confirmaciones marcadas en modo
 * selección que tengan código de pase.
 *
 * @returns {Promise<void>}
 */
async function marcarLlegadaEnLote() {
  if (!SELECCIONADOS.size) return;

  const ids      = Array.from(SELECCIONADOS);
  const filas    = ids.map(id => INVITADOS.find(f => Number(f.id) === id)).filter(Boolean);
  const conCodigo = filas.filter(f => f.codigo);

  if (!conCodigo.length) {
    avisar('Ninguno de los seleccionados tiene pase para marcar llegada.', true);
    return;
  }

  if (!confirmarAccion(
    '¿Marcar llegada de ' + pluralizar(conCodigo.length, 'persona', 'personas') + '?'
  )) return;

  let listas = 0;
  for (const fila of conCodigo) {
    try {
      await mandar('llegadas.php?accion=marcar', { codigo: fila.codigo });
      listas++;
    } catch (error) {
      // Un pase ya marcado no debe frenar al resto.
    }
  }

  const saltados = filas.length - conCodigo.length;
  avisar(
    'Se marcó llegada de ' + pluralizar(listas, 'persona', 'personas') + '.' +
    (saltados ? ' ' + saltados + ' sin pase, se saltaron.' : '')
  );

  ensuciarVistas('hoy', 'resumen');
  salirDeSeleccion();
  dibujarGente();
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
      cerrarHoja(true);
      avisar(esNuevo ? 'Invitado agregado.' : 'Cambios guardados.');
      ensuciarVistas('resumen');
      dibujarGente();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/* ─── 5. LOS NOMBRES DE CADA ACOMPAÑANTE ───────────────────────────── */

/**
 * Pide y pinta la lista de acompañantes nombrados de una confirmación.
 *
 * El número de la confirmación (adultos + niños) sigue mandando: acá
 * solo se puede nombrar hasta llegar a esa cantidad, nunca de más.
 *
 * @param {number} confirmacionId
 * @param {number} cupo - Cuántas personas declaró la confirmación.
 * @param {Element} contenedor
 * @returns {Promise<void>}
 */
async function dibujarAcompanantes(confirmacionId, cupo, contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="esqueleto"></div>';

  let filas;
  try {
    const r = await traer('acompanantes.php?accion=listar&confirmacion_id=' + confirmacionId);
    filas = r.filas || [];
  } catch (error) {
    contenedor.innerHTML = '';
    return; // No es crítico: la confirmación se puede ver igual sin esto.
  }

  pintarAcompanantes(confirmacionId, cupo, filas, contenedor);
}

/**
 * @param {number} confirmacionId
 * @param {number} cupo
 * @param {Object[]} filas
 * @param {Element} contenedor
 * @returns {void}
 */
function pintarAcompanantes(confirmacionId, cupo, filas, contenedor) {
  const puedeAgregarMas = filas.length < cupo;

  contenedor.innerHTML =
    '<p class="detalle__rotulo" style="margin-top:var(--esp-2)">' +
      'Con nombre (' + filas.length + ' de ' + cupo + ')' +
    '</p>' +
    (filas.length
      ? filas.map(a =>
          '<div class="fila-adjunto" style="display:flex;align-items:center;' +
               'justify-content:space-between;padding:var(--esp-1) 0;' +
               'border-top:1px solid var(--borde)">' +
            '<span>' + seguro(a.nombre) +
              (a.alergias ? ' <span style="color:var(--texto-tenue);font-size:.85em">· ' +
                seguro(a.alergias) + '</span>' : '') +
            '</span>' +
            '<button class="boton boton--chico" data-quitar-acomp="' + a.id + '">Quitar</button>' +
          '</div>'
        ).join('')
      : '<p class="vacio__texto" style="padding:var(--esp-1) 0">Todavía nadie tiene nombre.</p>') +
    (puedeAgregarMas
      ? '<button class="boton boton--ancho" style="margin-top:var(--esp-1)" ' +
               'id="agregar-acompanante">Agregar</button>'
      : '');

  buscarTodos('[data-quitar-acomp]', contenedor).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!confirmarAccion('¿Quitar a esta persona de la lista de nombrados?')) return;
      try {
        await mandar('acompanantes.php?accion=borrar', { id: Number(boton.dataset.quitarAcomp) });
        dibujarAcompanantes(confirmacionId, cupo, contenedor);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  const agregar = buscar('#agregar-acompanante', contenedor);
  if (agregar) {
    agregar.addEventListener('click', () => {
      formularioDeAcompanante(confirmacionId, cupo - filas.length, () =>
        dibujarAcompanantes(confirmacionId, cupo, contenedor)
      );
    });
  }
}

/**
 * Formulario para nombrar a un acompañante.
 *
 * Si el teléfono soporta la Contact Picker API (Chrome en Android, nada
 * más — ni iPhone ni computadora la tienen) se ofrece un botón para
 * traer nombre y teléfono de los contactos en vez de escribirlos. En
 * todos los demás casos se escribe a mano, que es el camino normal.
 *
 * @param {number} confirmacionId
 * @param {number} cupan Cuántos faltan por nombrar (solo informativo).
 * @param {Function} alGuardar
 * @returns {void}
 */
function formularioDeAcompanante(confirmacionId, cupan, alGuardar) {
  const tieneContactPicker =
    typeof navigator !== 'undefined' && navigator.contacts && navigator.contacts.select;

  const cuerpo = abrirHoja('Agregar acompañante',
    (tieneContactPicker
      ? '<button type="button" class="boton boton--ancho" id="acomp-de-contactos" ' +
               'style="margin-bottom:var(--esp-2)">Traer de mis contactos</button>'
      : '') +
    campoTexto({ id: 'acomp-nombre', rotulo: 'Nombre' }) +
    campoLista({
      id: 'acomp-tipo', rotulo: 'Tipo', valor: 'adulto',
      opciones: [
        { valor: 'adulto', texto: 'Adulto' },
        { valor: 'nino', texto: 'Niño' },
      ],
    }) +
    campoTexto({ id: 'acomp-telefono', rotulo: 'Teléfono', valor: '' }) +
    campoTexto({ id: 'acomp-correo', rotulo: 'Correo', tipo: 'email', valor: '' }) +
    campoTexto({ id: 'acomp-menu', rotulo: 'Menú', valor: '' }) +
    campoTexto({ id: 'acomp-alergias', rotulo: 'Alergias', valor: '' }) +
    pieDeFormulario('Agregar')
  );

  if (tieneContactPicker) {
    buscar('#acomp-de-contactos', cuerpo).addEventListener('click', async () => {
      try {
        const elegidos = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (!elegidos || !elegidos.length) return;

        const c = elegidos[0];
        if (c.name && c.name[0]) buscar('#acomp-nombre', cuerpo).value = c.name[0];
        if (c.tel && c.tel[0])   buscar('#acomp-telefono', cuerpo).value = c.tel[0];
      } catch (error) {
        // El usuario canceló el selector, o el navegador lo rechazó: no
        // es un error que valga la pena mostrar, se sigue escribiendo a mano.
      }
    });
  }

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('acomp-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return; }

    try {
      await mandar('acompanantes.php?accion=agregar', {
        confirmacion_id: confirmacionId,
        nombre:   nombre,
        tipo:     valorDe('acomp-tipo', cuerpo),
        telefono: valorDe('acomp-telefono', cuerpo),
        correo:   valorDe('acomp-correo', cuerpo),
        menu:     valorDe('acomp-menu', cuerpo),
        alergias: valorDe('acomp-alergias', cuerpo),
      });
      cerrarHoja(true);
      avisar('Agregado.');
      alGuardar();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}
