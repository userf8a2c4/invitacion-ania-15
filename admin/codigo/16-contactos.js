/* ══════════════════════════════════════════════════════════════════════
   16 · CONTACTOS

   QUÉ HACE ESTE ARCHIVO
   La agenda del evento: todas las personas juntas, vengan de la tabla
   que vengan — invitados, proveedores, padrinos, corte de honor y
   foráneos.

   POR QUÉ ESTÁ TODO EN UNA SOLA LISTA
   Porque cuando suena el teléfono y dice "Hola, soy Martín", no se sabe
   de qué tabla es. Antes había que buscarlo en tres pestañas. Acá se
   escribe una vez y aparece, con su teléfono a un toque de distancia.

   LAS RELACIONES
   Al abrir un contacto no solo se ven sus datos: se ve todo lo que
   cuelga de él. Del DJ salen sus gastos, sus pagos y sus cotizaciones;
   de un invitado, su mesa y con quién se sienta. Y cada una de esas
   cosas se puede tocar para saltar directo a ella.

   ÍNDICE
     1. Datos y dibujado
     2. La lista
     3. La ficha de una persona
     4. Saltar a lo relacionado
   ══════════════════════════════════════════════════════════════════════ */


/** Todo lo que devolvió el servidor. */
let CONTACTOS = [];

/** Si esta persona puede ver montos. */
let CONTACTOS_VE_PLATA = true;

/** Qué grupo se está viendo. */
let FILTRO_CONTACTOS = 'todos';

/** Lo escrito en el buscador. */
let BUSQUEDA_CONTACTOS = '';

/**
 * Cómo se llama y se pinta cada tipo de contacto.
 */
const TIPOS_DE_CONTACTO = {
  invitado:  { rotulo: 'Invitados',   singular: 'Invitado' },
  proveedor: { rotulo: 'Proveedores', singular: 'Proveedor' },
  padrino:   { rotulo: 'Padrinos',    singular: 'Padrino' },
  corte:     { rotulo: 'Corte',       singular: 'Corte de honor' },
  foraneo:   { rotulo: 'Foráneos',    singular: 'Invitado de fuera' },
};


/* ─── 1. DATOS Y DIBUJADO ──────────────────────────────────────────── */

/**
 * Pide la agenda y arma la pantalla.
 *
 * @returns {Promise<void>}
 */
async function dibujarContactos() {
  const cuerpo = buscar('#cuerpo-contactos');
  if (!cuerpo) return;

  pintarCargando(cuerpo, 6);

  try {
    const datos = await traer('contactos.php?accion=todos');
    CONTACTOS = datos.contactos || [];
    CONTACTOS_VE_PLATA = !!datos.ve_plata;
  } catch (error) {
    pintarError(cuerpo, error.message, () => dibujarContactos());
    throw error;
  }

  // Cuántos hay de cada tipo, para los números de los filtros.
  const cuantos = {};
  CONTACTOS.forEach(c => { cuantos[c.tipo] = (cuantos[c.tipo] || 0) + 1; });

  cuerpo.innerHTML =
    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<input type="search" id="buscar-contacto" class="buscador__control" ' +
             'placeholder="Buscar por nombre, teléfono o servicio" ' +
             'autocapitalize="off" spellcheck="false">' +
    '</div>' +

    '<div class="filtros" id="filtros-contactos">' +
      '<button class="filtro activo" data-tipo="todos">Todos (' +
        CONTACTOS.length + ')</button>' +
      Object.keys(TIPOS_DE_CONTACTO).map(tipo =>
        cuantos[tipo]
          ? '<button class="filtro" data-tipo="' + tipo + '">' +
            seguro(TIPOS_DE_CONTACTO[tipo].rotulo) + ' (' + cuantos[tipo] + ')</button>'
          : ''
      ).join('') +
    '</div>' +

    '<div id="lista-contactos"></div>';

  const buscador = buscar('#buscar-contacto', cuerpo);
  buscador.value = BUSQUEDA_CONTACTOS;
  buscador.addEventListener('input', () => {
    BUSQUEDA_CONTACTOS = buscador.value;
    pintarListaDeContactos();
  });

  buscarTodos('[data-tipo]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      FILTRO_CONTACTOS = boton.dataset.tipo;
      buscarTodos('[data-tipo]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o === boton));
      pintarListaDeContactos();
    });
  });

  pintarListaDeContactos();
}


/* ─── 2. LA LISTA ──────────────────────────────────────────────────── */

/**
 * Aplica filtro y búsqueda, y pinta las filas.
 *
 * @returns {void}
 */
function pintarListaDeContactos() {
  const lista = buscar('#lista-contactos');
  if (!lista) return;

  const aguja = paraBuscar(BUSQUEDA_CONTACTOS);

  const visibles = CONTACTOS.filter(c => {
    if (FILTRO_CONTACTOS !== 'todos' && c.tipo !== FILTRO_CONTACTOS) return false;
    if (!aguja) return true;

    return paraBuscar([c.nombre, c.telefono, c.correo, c.detalle].join(' '))
      .includes(aguja);
  });

  if (!visibles.length) {
    pintarVacio(lista,
      CONTACTOS.length ? 'Nada coincide' : 'Todavía no hay contactos',
      CONTACTOS.length
        ? 'Probá con otra búsqueda.'
        : 'Van apareciendo solos a medida que cargues invitados, proveedores y padrinos.');
    return;
  }

  lista.innerHTML = visibles.map((c, indice) => {
    // El índice real dentro de CONTACTOS, para poder recuperarlo al tocar.
    const posicion = CONTACTOS.indexOf(c);

    const lado = (c.extra !== null && c.extra !== undefined && c.extra !== '')
      ? (typeof c.extra === 'number'
          ? '<span class="cifra">' + seguro(comoDinero(c.extra, false)) + '</span><br>'
          : '<span class="codigo-pase">' + seguro(c.extra) + '</span><br>')
      : '';

    return '' +
      '<button class="lista__fila" data-contacto="' + posicion + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(c.nombre) + '</span>' +
          '<span class="lista__pie">' +
            seguro(TIPOS_DE_CONTACTO[c.tipo].singular +
                   (c.detalle ? ' · ' + c.detalle : '')) +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' + lado +
          '<span class="etiqueta etiqueta--' + seguro(c.estado) + '">' +
            seguro(c.etiqueta) + '</span>' +
        '</span>' +
      '</button>';
  }).join('');

  buscarTodos('[data-contacto]', lista).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirFichaDeContacto(CONTACTOS[Number(boton.dataset.contacto)]);
    });
  });
}


/* ─── 3. LA FICHA DE UNA PERSONA ───────────────────────────────────── */

/**
 * Abre la ficha con datos, botones de contacto y relaciones.
 *
 * @param {Object} contacto
 * @returns {Promise<void>}
 */
async function abrirFichaDeContacto(contacto) {
  if (!contacto) return;

  /* Los botones de llamar, WhatsApp y correo son lo más útil de toda
     esta pantalla: convierten la agenda en algo que se usa, no que se
     consulta. Se arman con enlaces tel:, wa.me y mailto:, que el
     teléfono abre en la app correspondiente. */
  const soloDigitos = String(contacto.telefono || '').replace(/[^\d+]/g, '');

  const acciones = [];
  if (soloDigitos) {
    acciones.push(
      '<a class="boton" style="flex:1" href="tel:' + seguro(soloDigitos) + '">Llamar</a>',
      // wa.me no acepta el +, solo dígitos.
      '<a class="boton" style="flex:1" target="_blank" rel="noopener" ' +
         'href="https://wa.me/' + seguro(soloDigitos.replace(/\D/g, '')) + '">WhatsApp</a>'
    );
  }
  if (contacto.correo) {
    acciones.push('<a class="boton" style="flex:1" href="mailto:' +
                  seguro(contacto.correo) + '">Correo</a>');
  }

  const renglones = [
    ['Tipo',     TIPOS_DE_CONTACTO[contacto.tipo].singular],
    ['Detalle',  contacto.detalle],
    ['Teléfono', contacto.telefono],
    ['Correo',   contacto.correo],
  ].filter(r => r[1]);

  const cuerpo = abrirHoja(contacto.nombre,
    '<div class="tarjeta"><div class="detalle">' +
      renglones.map(r =>
        '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
        '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
      ).join('') +
    '</div></div>' +

    (acciones.length
      ? '<div style="display:flex;gap:var(--esp-2);margin-bottom:var(--esp-3)">' +
        acciones.join('') + '</div>'
      : '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
        'No tiene teléfono ni correo cargado.</p>') +

    '<button class="boton boton--ancho" id="ficha-editar" ' +
            'style="margin-bottom:var(--esp-3)">Abrir la ficha completa</button>' +

    '<div id="relaciones-contacto">' +
      '<div class="esqueleto"></div>' +
    '</div>'
  );

  buscar('#ficha-editar', cuerpo).addEventListener('click', () => {
    abrirFichaCompleta(contacto);
  });

  pintarRelaciones(buscar('#relaciones-contacto', cuerpo), contacto);
}

/**
 * Trae y pinta todo lo que cuelga de una persona.
 *
 * @param {Element} donde
 * @param {Object} contacto
 * @returns {Promise<void>}
 */
async function pintarRelaciones(donde, contacto) {
  let datos;
  try {
    datos = await traer('contactos.php?accion=relaciones&tipo=' +
                        encodeURIComponent(contacto.tipo) + '&id=' + contacto.id);
  } catch (error) {
    donde.innerHTML = '<p class="vacio__texto">No se pudieron cargar las relaciones.</p>';
    return;
  }

  const grupos = datos.grupos || [];

  if (!grupos.length) {
    donde.innerHTML =
      '<p class="vacio__texto">Todavía no hay nada enlazado a esta persona.</p>';
    return;
  }

  donde.innerHTML = grupos.map((grupo, iGrupo) =>
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      seguro(grupo.titulo) +
    '</div>' +
    grupo.filas.map((fila, iFila) => {
      const lado = (fila.lado !== null && fila.lado !== undefined)
        ? '<span class="lista__lado cifra">' +
          seguro(comoDinero(fila.lado, false)) + '</span>'
        : '';

      /* Las filas con id 0 son texto informativo ("es el único en esta
         mesa"), no algo a lo que se pueda saltar. */
      const tocable = fila.id > 0 && (grupo.ir_a || fila.archivo);

      return '' +
        '<' + (tocable ? 'button' : 'div') + ' class="lista__fila"' +
          (tocable ? ' data-rel="' + iGrupo + '-' + iFila + '"' : '') + '>' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(fila.texto) + '</span>' +
          '</span>' + lado +
        '</' + (tocable ? 'button' : 'div') + '>';
    }).join('')
  ).join('');

  buscarTodos('[data-rel]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      const [iGrupo, iFila] = boton.dataset.rel.split('-').map(Number);
      saltarARelacion(grupos[iGrupo], grupos[iGrupo].filas[iFila]);
    });
  });
}


/* ─── 4. SALTAR A LO RELACIONADO ───────────────────────────────────── */

/**
 * Lleva a la pestaña donde vive lo que se tocó.
 *
 * @param {Object} grupo
 * @param {Object} fila
 * @returns {void}
 */
function saltarARelacion(grupo, fila) {
  // Los archivos se abren en el momento, no llevan a ninguna pestaña.
  if (fila.archivo) { abrirArchivo(fila.id); return; }

  if (!grupo.ir_a) return;

  cerrarHoja();

  /* Se deja anotado a qué sub-sección hay que ir, y la vista de destino
     lo lee al dibujarse. Es la forma más simple de cruzar de una
     pestaña a otra sin que cada vista tenga que conocer a las demás. */
  if (grupo.ir_a === 'dinero' && grupo.seccion) SECCION_DINERO = grupo.seccion;
  if (grupo.ir_a === 'evento' && grupo.seccion) SECCION_EVENTO = grupo.seccion;

  irA(grupo.ir_a, true);
}

/**
 * Abre el formulario propio de ese tipo de contacto.
 *
 * Cada tipo vive en una pestaña distinta, así que se salta a la suya y
 * se abre su ficha de siempre — la misma que se usa para editarlo desde
 * su propia sección, sin duplicar formularios.
 *
 * @param {Object} contacto
 * @returns {void}
 */
function abrirFichaCompleta(contacto) {
  cerrarHoja();

  switch (contacto.tipo) {
    case 'invitado':
      irA('invitados');
      // La lista puede no estar cargada todavía si se entró directo acá.
      setTimeout(() => abrirDetalleDeInvitado(contacto.id), 400);
      break;

    case 'proveedor':
      SECCION_DINERO = 'proveedores';
      irA('dinero', true);
      setTimeout(() => {
        const p = (DINERO.proveedores || []).find(x => Number(x.id) === contacto.id);
        if (p) formularioProveedor(p);
      }, 600);
      break;

    case 'padrino':
      SECCION_DINERO = 'padrinos';
      irA('dinero', true);
      setTimeout(() => {
        const p = (DINERO.padrinos || []).find(x => Number(x.id) === contacto.id);
        if (p) formularioPadrino(p);
      }, 600);
      break;

    case 'corte':
      SECCION_EVENTO = 'corte_honor';
      irA('evento', true);
      setTimeout(() => {
        const m = (EVENTO.corte_honor || []).find(x => Number(x.id) === contacto.id);
        if (m) formularioEvento('corte_honor', m);
      }, 600);
      break;

    case 'foraneo':
      SECCION_EVENTO = 'foraneos';
      irA('evento', true);
      setTimeout(() => {
        const f = (EVENTO.foraneos || []).find(x => Number(x.id) === contacto.id);
        if (f) formularioEvento('foraneos', f);
      }, 600);
      break;
  }
}
