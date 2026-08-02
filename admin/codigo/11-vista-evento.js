/* ══════════════════════════════════════════════════════════════════════
   11 · VISTA EVENTO

   QUÉ HACE ESTE ARCHIVO
   Todo lo propio de unos XV: tareas, agenda, cronograma del día, corte
   de honor, ensayos del vals, la misa, la música, las citas de vestido,
   las tomas de foto, las mesas, los regalos y los invitados foráneos.

   POR QUÉ ESTÁ ESCRITO CON UNA TABLA DE DESCRIPCIONES
   Son doce secciones que hacen lo mismo: listar, abrir un formulario,
   guardar y borrar. Escribirlas una por una serían mil líneas casi
   idénticas, y arreglar un detalle obligaría a tocarlas todas.

   En vez de eso, SECCIONES describe cada una con datos —qué campos
   tiene, cómo se ve cada fila— y hay UNA sola función que lista y UNA
   sola que arma formularios. Agregar una sección nueva es agregar un
   renglón a esa tabla.

   ÍNDICE
     1. Descripción de las secciones
     2. Dibujar la vista
     3. Listado y formulario genéricos
     4. Las secciones que no son listas
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió evento.php la última vez. */
let EVENTO = null;

/** Qué sub-pestaña se está viendo. */
let SECCION_EVENTO = 'tareas';


/* ─── 1. DESCRIPCIÓN DE LAS SECCIONES ──────────────────────────────── */

/**
 * Cada sección: cómo se llama, de qué tabla sale, qué campos tiene el
 * formulario, y cómo se arma cada fila de la lista.
 *
 * `fila` recibe un registro y devuelve { titulo, pie, lado, tenue }.
 */
const SECCIONES = {

  corte_honor: {
    rotulo: 'Corte',
    titulo: 'Chambelanes y damas',
    vacio: ['Todavía no hay corte de honor',
            'Anotá a los chambelanes y las damas, con su talla.'],
    campos: [
      { id: 'nombre',   rotulo: 'Nombre' },
      { id: 'rol',      rotulo: 'Rol', lista: [
          ['chambelan', 'Chambelán'], ['dama', 'Dama'],
          ['pareja_vals', 'Pareja del vals'], ['otro', 'Otro']] },
      { id: 'telefono', rotulo: 'Teléfono', tipo: 'tel' },
      { id: 'talla',    rotulo: 'Talla' },
      { id: 'vestuario', rotulo: 'Vestuario', lista: [
          ['pendiente', 'Pendiente'], ['medido', 'Ya se midió'], ['listo', 'Listo']] },
      { id: 'notas',    rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.nombre,
      pie: [{ chambelan: 'Chambelán', dama: 'Dama',
              pareja_vals: 'Pareja del vals' }[r.rol] || 'Otro',
            r.talla ? 'talla ' + r.talla : ''].filter(Boolean).join(' · '),
      lado: etiquetaDe(r.vestuario,
            { pendiente: ['tenue','Pendiente'], medido: ['ojo','Medido'],
              listo: ['bien','Listo'] }),
    }),
  },

  ensayos: {
    rotulo: 'Ensayos',
    titulo: 'Ensayos del vals',
    vacio: ['Todavía no hay ensayos', 'Agendá los ensayos del vals.'],
    campos: [
      { id: 'fecha', rotulo: 'Fecha', tipo: 'date' },
      { id: 'hora',  rotulo: 'Hora',  tipo: 'time' },
      { id: 'lugar', rotulo: 'Dónde' },
      { id: 'notas', rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: comoFecha(r.fecha) + (r.hora ? ' · ' + String(r.hora).slice(0,5) : ''),
      pie: r.lugar || '',
      lado: '<span class="etiqueta etiqueta--info">' + seguro(comoCuando(r.fecha)) + '</span>',
      tenue: diasHasta(r.fecha) < 0,
    }),
  },

  requisitos_ceremonia: {
    rotulo: 'Papeles',
    titulo: 'Requisitos de la iglesia',
    vacio: ['Todavía no hay requisitos',
            'Fe de bautismo, plática prebautismal, constancias…'],
    campos: [
      { id: 'requisito', rotulo: 'Qué piden' },
      { id: 'estado',    rotulo: 'Cómo va', lista: [
          ['pendiente', 'Pendiente'], ['en_tramite', 'En trámite'], ['listo', 'Listo']] },
      { id: 'fecha_limite', rotulo: 'Para cuándo', tipo: 'date' },
      { id: 'notas',     rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.requisito,
      pie: r.fecha_limite ? comoCuando(r.fecha_limite) : '',
      lado: etiquetaDe(r.estado,
            { pendiente: ['alerta','Pendiente'], en_tramite: ['ojo','En trámite'],
              listo: ['bien','Listo'] }),
    }),
  },

  musica: {
    rotulo: 'Música',
    titulo: 'Canciones',
    vacio: ['Todavía no hay canciones',
            'El vals, la entrada, el pastel… y las que NO querés que suenen.'],
    campos: [
      { id: 'cancion', rotulo: 'Canción' },
      { id: 'artista', rotulo: 'Artista' },
      { id: 'momento', rotulo: 'Para qué momento', lista: [
          ['entrada', 'Entrada'], ['vals', 'Vals'], ['brindis', 'Brindis'],
          ['pastel', 'Pastel'], ['baile', 'Baile'], ['otro', 'Otro'],
          ['prohibida', 'Prohibida — que NO suene']] },
      { id: 'enlace',  rotulo: 'Enlace' },
      { id: 'notas',   rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.cancion,
      pie: r.artista || '',
      lado: r.momento === 'prohibida'
            ? '<span class="etiqueta etiqueta--alerta">Prohibida</span>'
            : '<span class="etiqueta">' + seguro(r.momento) + '</span>',
    }),
  },

  citas_arreglo: {
    rotulo: 'Vestido',
    titulo: 'Vestido y arreglo',
    vacio: ['Todavía no hay citas',
            'Pruebas de vestido, maquillaje, peinado, zapatos.'],
    campos: [
      { id: 'titulo', rotulo: 'Qué es' },
      { id: 'tipo',   rotulo: 'Tipo', lista: [
          ['vestido', 'Vestido'], ['maquillaje', 'Maquillaje'],
          ['peinado', 'Peinado'], ['zapatos', 'Zapatos'], ['otro', 'Otro']] },
      { id: 'fecha',  rotulo: 'Fecha', tipo: 'date' },
      { id: 'hora',   rotulo: 'Hora',  tipo: 'time' },
      { id: 'lugar',  rotulo: 'Dónde' },
      { id: 'costo',  rotulo: 'Costo', tipo: 'number', paso: '0.01' },
      { id: 'estado', rotulo: 'Estado', lista: [
          ['pendiente', 'Pendiente'], ['hecha', 'Hecha'], ['cancelada', 'Cancelada']] },
      { id: 'notas',  rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.titulo,
      pie: [r.fecha ? comoFecha(r.fecha) : '', r.lugar].filter(Boolean).join(' · '),
      lado: etiquetaDe(r.estado,
            { pendiente: ['ojo','Pendiente'], hecha: ['bien','Hecha'],
              cancelada: ['tenue','Cancelada'] }),
    }),
  },

  cronograma: {
    rotulo: 'El día',
    titulo: 'Cronograma del día',
    vacio: ['Todavía no hay cronograma',
            'La hora a hora del 24 de octubre: llegada, misa, vals, cena…'],
    campos: [
      { id: 'hora',        rotulo: 'Hora', tipo: 'time' },
      { id: 'momento',     rotulo: 'Qué pasa' },
      { id: 'responsable', rotulo: 'Quién se encarga' },
      { id: 'detalle',     rotulo: 'Detalle', largo: true },
    ],
    fila: r => ({
      titulo: (r.hora ? String(r.hora).slice(0,5) + '  ' : '') + r.momento,
      pie: r.responsable || '',
    }),
  },

  tomas_foto: {
    rotulo: 'Fotos',
    titulo: 'Tomas imprescindibles',
    vacio: ['Todavía no hay lista de tomas',
            'Las fotos que no se pueden perder. Se la pasás al fotógrafo.'],
    alternar: 'hecha',
    campos: [
      { id: 'toma',     rotulo: 'Qué foto' },
      { id: 'momento',  rotulo: 'Cuándo' },
      { id: 'personas', rotulo: 'Quiénes salen' },
      { id: 'orden',    rotulo: 'Orden', tipo: 'number' },
    ],
    fila: r => ({
      titulo: r.toma,
      pie: [r.momento, r.personas].filter(Boolean).join(' · '),
      tenue: Number(r.hecha) === 1,
    }),
  },

  mesas: {
    rotulo: 'Mesas',
    titulo: 'Mesas',
    vacio: ['Todavía no hay mesas',
            'Creá las mesas y después acomodá a los invitados.'],
    campos: [
      { id: 'nombre',    rotulo: 'Nombre o número' },
      { id: 'capacidad', rotulo: 'Cuántos caben', tipo: 'number' },
      { id: 'ubicacion', rotulo: 'Dónde está' },
      { id: 'notas',     rotulo: 'Notas', largo: true },
    ],
    fila: r => {
      // La ocupación viene calculada aparte, cruzando con las mesas.
      const oc = (EVENTO.ocupacion || []).find(o => String(o.id) === String(r.id));
      const usados = oc ? Number(oc.ocupados) : 0;
      const lleno  = usados > Number(r.capacidad);

      return {
        titulo: r.nombre,
        pie: r.ubicacion || '',
        lado: '<span class="etiqueta etiqueta--' + (lleno ? 'alerta' : 'tenue') + '">' +
              usados + ' / ' + seguro(r.capacidad) + '</span>',
      };
    },
  },

  regalos: {
    rotulo: 'Regalos',
    titulo: 'Regalos recibidos',
    vacio: ['Todavía no hay regalos',
            'Anotá lo que llegue para no olvidarte de agradecer.'],
    alternar: 'agradecido',
    campos: [
      { id: 'de_parte_de', rotulo: 'De parte de' },
      { id: 'descripcion', rotulo: 'Qué regaló' },
      { id: 'origen',      rotulo: 'De dónde vino', lista: [
          ['amazon', 'Lista de Amazon'], ['directo', 'Lo trajo'],
          ['efectivo', 'Efectivo'], ['otro', 'Otro']] },
      { id: 'monto',       rotulo: 'Valor', tipo: 'number', paso: '0.01' },
      { id: 'recibido_en', rotulo: 'Cuándo llegó', tipo: 'date' },
      { id: 'notas',       rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.de_parte_de,
      pie: r.descripcion || '',
      lado: Number(r.agradecido) === 1
            ? '<span class="etiqueta etiqueta--bien">Agradecido</span>'
            : '<span class="etiqueta etiqueta--ojo">Falta agradecer</span>',
      tenue: Number(r.agradecido) === 1,
    }),
  },

  foraneos: {
    rotulo: 'Foráneos',
    titulo: 'Invitados de fuera',
    vacio: ['Todavía no hay foráneos',
            'Quién viene de otra ciudad, dónde se queda y cómo llega.'],
    campos: [
      { id: 'nombre',     rotulo: 'Nombre' },
      { id: 'ciudad',     rotulo: 'De dónde viene' },
      { id: 'telefono',   rotulo: 'Teléfono', tipo: 'tel' },
      { id: 'hospedaje',  rotulo: 'Dónde se queda' },
      { id: 'llega',      rotulo: 'Llega', tipo: 'date' },
      { id: 'se_va',      rotulo: 'Se va',  tipo: 'date' },
      { id: 'transporte', rotulo: 'Cómo se mueve' },
      { id: 'notas',      rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.nombre,
      pie: [r.ciudad, r.hospedaje].filter(Boolean).join(' · '),
      lado: r.llega
            ? '<span class="etiqueta etiqueta--info">' + seguro(comoFecha(r.llega)) + '</span>'
            : '',
    }),
  },
};

/**
 * Devuelve la etiqueta de color de un estado.
 *
 * @param {string} valor
 * @param {Object} mapa - estado => [color, texto]
 * @returns {string} HTML
 */
function etiquetaDe(valor, mapa) {
  const par = mapa[valor] || ['tenue', valor || '—'];
  return '<span class="etiqueta etiqueta--' + par[0] + '">' + seguro(par[1]) + '</span>';
}


/* ─── 2. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide los datos y arma la pantalla Evento.
 *
 * @returns {Promise<void>}
 */
async function dibujarEvento() {
  const vista = buscar('#vista-evento');
  pintarCargando(vista, 5);

  try {
    // Las dos llamadas van en paralelo: tardan lo que la más lenta.
    const [evento] = await Promise.all([
      traer('evento.php?accion=todo'),
      traerPlanificador(),
    ]);
    EVENTO = evento;
  } catch (error) {
    pintarError(vista, error.message, () => dibujarEvento());
    throw error;
  }

  /* El orden de las pestañas sigue el orden en que se usan a lo largo
     del año: primero lo que se hace todos los días (tareas, agenda),
     al final lo del día del evento. */
  const pestanas = [
    ['tareas',   'Tareas',  (PLAN.tareas || []).filter(t => t.estado !== 'hecha').length],
    ['agenda',   'Agenda',  (PLAN.agenda || []).length],
    ['corte_honor', null],
    ['ensayos',  null],
    ['ceremonia', 'Misa'],
    ['requisitos_ceremonia', null],
    ['musica',   null],
    ['citas_arreglo', null],
    ['mesas',    null],
    ['cronograma', null],
    ['tomas_foto', null],
    ['regalos',  null, (EVENTO.regalos || []).filter(r => Number(r.agradecido) === 0).length],
    ['foraneos', null],
  ];

  vista.innerHTML =
    '<div class="filtros" id="pestanas-evento">' +
      pestanas.map(p => {
        const clave  = p[0];
        const rotulo = p[1] || (SECCIONES[clave] ? SECCIONES[clave].rotulo : clave);
        const n      = p[2];
        return '<button class="filtro' +
               (clave === SECCION_EVENTO ? ' activo' : '') +
               '" data-ev="' + clave + '">' +
               seguro(rotulo + (n ? ' (' + n + ')' : '')) + '</button>';
      }).join('') +
    '</div>' +
    '<div id="cuerpo-evento"></div>';

  buscarTodos('[data-ev]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_EVENTO = boton.dataset.ev;
      buscarTodos('[data-ev]', vista).forEach(o => o.classList.toggle('activo', o === boton));
      pintarSeccionDeEvento();
    });
  });

  pintarSeccionDeEvento();
}

/**
 * Pinta la sub-pestaña elegida.
 *
 * @returns {void}
 */
function pintarSeccionDeEvento() {
  const cuerpo = buscar('#cuerpo-evento');
  if (!cuerpo) return;

  // Las tres que no son listas genéricas tienen su propia función.
  if (SECCION_EVENTO === 'tareas')    { pintarTareas(cuerpo); return; }
  if (SECCION_EVENTO === 'agenda')    { pintarAgenda(cuerpo); return; }
  if (SECCION_EVENTO === 'ceremonia') { pintarCeremonia(cuerpo); return; }

  pintarSeccionGenerica(cuerpo, SECCION_EVENTO);
}


/* ─── 3. LISTADO Y FORMULARIO GENÉRICOS ────────────────────────────── */

/**
 * Pinta cualquiera de las secciones descritas en SECCIONES.
 *
 * @param {Element} cuerpo
 * @param {string} clave
 * @returns {void}
 */
function pintarSeccionGenerica(cuerpo, clave) {
  const config    = SECCIONES[clave];
  const registros = EVENTO[clave] || [];

  const botonNuevo =
    '<button class="boton boton--principal boton--ancho" id="ev-nuevo" ' +
    'style="margin-top:var(--esp-3)">Agregar</button>';

  if (!registros.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, config.vacio[0], config.vacio[1]);
    cuerpo.insertAdjacentHTML('beforeend', botonNuevo);
    buscar('#ev-nuevo', cuerpo).addEventListener('click',
      () => formularioEvento(clave));
    return;
  }

  cuerpo.innerHTML = registros.map(registro => {
    const f = config.fila(registro);

    // Las secciones con `alternar` llevan casilla al principio.
    const casilla = config.alternar
      ? '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--oro)" ' +
        (Number(registro[config.alternar]) === 1 ? 'checked ' : '') +
        'data-alt="' + seguro(registro.id) + '" aria-label="Marcar">'
      : '';

    const estilo = f.tenue ? ' style="opacity:.55"' : '';

    return '' +
      '<div class="lista__fila"' + estilo + '>' +
        casilla +
        '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                'data-ev-id="' + seguro(registro.id) + '">' +
          '<span class="lista__titulo">' + seguro(f.titulo) + '</span>' +
          (f.pie ? '<span class="lista__pie">' + seguro(f.pie) + '</span>' : '') +
        '</button>' +
        (f.lado ? '<span class="lista__lado">' + f.lado + '</span>' : '') +
      '</div>';
  }).join('') + botonNuevo;

  buscarTodos('[data-ev-id]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioEvento(clave,
        registros.find(r => String(r.id) === boton.dataset.evId));
    });
  });

  buscarTodos('[data-alt]', cuerpo).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      try {
        await mandar('evento.php?accion=alternar&que=' + clave, { id: casilla.dataset.alt });
        ensuciarVistas('resumen');
        await dibujarEvento();
      } catch (error) {
        casilla.checked = !casilla.checked;
        avisar(error.message, true);
      }
    });
  });

  buscar('#ev-nuevo', cuerpo).addEventListener('click', () => formularioEvento(clave));
}

/**
 * Arma el formulario de cualquier sección a partir de su descripción.
 *
 * @param {string} clave
 * @param {Object} [registro] - Si viene, se edita.
 * @returns {void}
 */
function formularioEvento(clave, registro) {
  const config = SECCIONES[clave];
  const d      = registro || {};

  const campos = config.campos.map(campo => {
    const valor = d[campo.id];

    if (campo.lista) {
      return campoLista({
        id: 'ev-' + campo.id,
        rotulo: campo.rotulo,
        valor: valor === undefined ? campo.lista[0][0] : String(valor),
        opciones: campo.lista.map(o => ({ valor: o[0], texto: o[1] })),
      });
    }

    if (campo.largo) {
      return campoLargo({ id: 'ev-' + campo.id, rotulo: campo.rotulo, valor: valor });
    }

    return campoTexto({
      id: 'ev-' + campo.id,
      rotulo: campo.rotulo,
      tipo: campo.tipo || 'text',
      paso: campo.paso,
      // Las horas vienen de MySQL como HH:MM:SS y el campo de tipo time
      // solo entiende HH:MM.
      valor: (campo.tipo === 'time' && valor) ? String(valor).slice(0, 5) : valor,
    });
  }).join('');

  const cuerpo = abrirHoja(
    registro ? 'Editar' : config.titulo,
    campos + pieDeFormulario('Guardar', !!registro)
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const carga = {};
    config.campos.forEach(campo => {
      carga[campo.id] = valorDe('ev-' + campo.id, cuerpo);
    });

    // Las casillas de alternar no están en el formulario: se conserva
    // el valor que ya tenía para no desmarcarlas al editar otra cosa.
    if (config.alternar && registro) {
      carga[config.alternar] = Number(registro[config.alternar]) === 1;
    }
    if (registro) carga.id = registro.id;

    try {
      await mandar('evento.php?accion=guardar&que=' + clave, carga);
      cerrarHoja();
      avisar('Guardado.');
      ensuciarVistas('resumen');
      await dibujarEvento();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
      try {
        await mandar('evento.php?accion=borrar&que=' + clave, { id: registro.id });
        cerrarHoja();
        avisar('Eliminado.');
        await dibujarEvento();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }
}


/* ─── 4. LAS SECCIONES QUE NO SON LISTAS ───────────────────────────── */

/**
 * La ceremonia es una sola ficha, no una lista.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarCeremonia(cuerpo) {
  const c = EVENTO.ceremonia || {};
  const hay = c.iglesia || c.fecha;

  if (!hay) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no cargaste la misa',
      'La iglesia, la fecha, el sacerdote y lo que cuesta.');
    cuerpo.insertAdjacentHTML('beforeend',
      '<button class="boton boton--principal boton--ancho" id="cer-editar" ' +
      'style="margin-top:var(--esp-3)">Cargar los datos</button>');
  } else {
    const renglones = [
      ['Iglesia',   c.iglesia],
      ['Dirección', c.direccion],
      ['Fecha',     c.fecha ? comoFecha(c.fecha) : ''],
      ['Hora',      c.hora ? String(c.hora).slice(0, 5) : ''],
      ['Sacerdote', c.sacerdote],
      ['Teléfono',  c.telefono],
      ['Costo',     Number(c.costo) ? comoDinero(c.costo) : ''],
      ['Notas',     c.notas],
    ].filter(r => r[1]);

    cuerpo.innerHTML =
      '<div class="tarjeta"><div class="detalle">' +
        renglones.map(r =>
          '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
          '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
        ).join('') +
      '</div></div>' +
      '<button class="boton boton--ancho" id="cer-editar">Editar</button>';
  }

  buscar('#cer-editar', cuerpo).addEventListener('click', formularioCeremonia);
}

/**
 * Formulario de la ceremonia.
 *
 * @returns {void}
 */
function formularioCeremonia() {
  const c = EVENTO.ceremonia || {};

  const cuerpo = abrirHoja('La misa',
    campoTexto({ id: 'cer-iglesia', rotulo: 'Iglesia', valor: c.iglesia }) +
    campoTexto({ id: 'cer-direccion', rotulo: 'Dirección', valor: c.direccion }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'cer-fecha', rotulo: 'Fecha', tipo: 'date', valor: c.fecha || '' }) +
      campoTexto({ id: 'cer-hora', rotulo: 'Hora', tipo: 'time',
                   valor: c.hora ? String(c.hora).slice(0,5) : '' }) +
    '</div>' +
    campoTexto({ id: 'cer-sacerdote', rotulo: 'Sacerdote', valor: c.sacerdote }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'cer-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: c.telefono }) +
      campoTexto({ id: 'cer-costo', rotulo: 'Costo', tipo: 'number',
                   paso: '0.01', valor: c.costo || '' }) +
    '</div>' +
    campoLargo({ id: 'cer-notas', rotulo: 'Notas', valor: c.notas }) +
    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    try {
      await mandar('evento.php?accion=guardar&que=ceremonia', {
        iglesia:   valorDe('cer-iglesia', cuerpo),
        direccion: valorDe('cer-direccion', cuerpo),
        fecha:     valorDe('cer-fecha', cuerpo),
        hora:      valorDe('cer-hora', cuerpo),
        sacerdote: valorDe('cer-sacerdote', cuerpo),
        telefono:  valorDe('cer-telefono', cuerpo),
        costo:     valorDe('cer-costo', cuerpo),
        notas:     valorDe('cer-notas', cuerpo),
      });
      cerrarHoja();
      avisar('Guardado.');
      await dibujarEvento();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}
