/* ══════════════════════════════════════════════════════════════════════
   10 · PLANIFICADOR: NOTAS, TAREAS Y AGENDA

   QUÉ HACE ESTE ARCHIVO
   Las notas (con su botón flotante desde cualquier pantalla), las tareas
   y las fechas de la agenda.

   POR QUÉ LAS NOTAS TIENEN BOTÓN PROPIO Y NO UNA PESTAÑA
   Porque una nota se escribe cuando aparece la idea, no cuando uno se
   acuerda de ir a buscarla. Si hay que navegar hasta una pestaña, la
   nota no se escribe. El botón flotante está siempre a un toque.

   ÍNDICE
     1. Datos
     2. Notas
     3. Tareas
     4. Agenda
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió el servidor la última vez. */
let PLAN = { notas: [], tareas: [], agenda: [] };


/* ─── 1. DATOS ─────────────────────────────────────────────────────── */

/**
 * Trae notas, tareas y agenda.
 *
 * @returns {Promise<Object>}
 */
async function traerPlanificador() {
  PLAN = await traer('planificador.php?accion=todo');
  return PLAN;
}

/**
 * Guarda algo del planificador y refresca lo que corresponda.
 *
 * @param {string} accion
 * @param {Object} carga
 * @param {Function} [despues]
 * @returns {Promise<boolean>}
 */
async function guardarPlan(accion, carga, despues) {
  try {
    await mandar('planificador.php?accion=' + accion, carga);
    cerrarHoja(true);
    avisar('Guardado.');
    // Tareas y agenda aparecen en el Resumen: hay que refrescarlo.
    ensuciarVistas('resumen');
    if (despues) await despues();
    return true;
  } catch (error) {
    avisar(error.message, true);
    return false;
  }
}


/* ─── 2. NOTAS ─────────────────────────────────────────────────────── */

/**
 * Abre la hoja de notas: la lista, con buscador y botón de nueva.
 *
 * Es lo que hace el botón flotante.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeNota() {
  const cuerpo = abrirHoja('Notas',
    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<input type="search" id="buscar-nota" class="buscador__control" ' +
             'placeholder="Buscar en las notas" autocapitalize="off">' +
    '</div>' +
    '<button class="boton boton--principal boton--ancho" id="nota-nueva" ' +
            'style="margin-bottom:var(--esp-3)">Escribir una nota</button>' +
    '<div id="lista-notas"></div>'
  );

  const lista = buscar('#lista-notas', cuerpo);
  pintarCargando(lista, 3);

  buscar('#nota-nueva', cuerpo).addEventListener('click', () => formularioNota());

  /* El buscador espera 250 ms desde la última tecla antes de consultar.
     Sin esa espera, escribir "pastel" dispararía seis búsquedas. */
  let reloj = null;
  buscar('#buscar-nota', cuerpo).addEventListener('input', evento => {
    clearTimeout(reloj);
    const texto = evento.target.value;
    reloj = setTimeout(() => cargarNotas(lista, texto), 250);
  });

  cargarNotas(lista, '');
}

/**
 * Pide las notas y las pinta.
 *
 * @param {Element} donde
 * @param {string} busca
 * @returns {Promise<void>}
 */
async function cargarNotas(donde, busca) {
  let notas;
  try {
    notas = await traer('planificador.php?accion=notas&busca=' + encodeURIComponent(busca));
  } catch (error) {
    pintarError(donde, error.message, () => cargarNotas(donde, busca));
    return;
  }

  PLAN.notas = notas;

  if (!notas.length) {
    pintarVacio(donde,
      busca ? 'Nada coincide' : 'Todavía no hay notas',
      busca ? 'Prueba con otras palabras.'
            : 'Anota lo que no quieres que se te olvide.');
    return;
  }

  donde.innerHTML = notas.map(nota =>
    '<button class="lista__fila" data-nota="' + seguro(nota.id) + '"' +
      (Number(nota.fijada) === 1
        ? ' style="border-left:3px solid var(--oro)"' : '') + '>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' +
          // Las notas fijadas se marcan con una barra dorada al costado,
          // no con un emoji: se lee igual y va con el resto del panel.
          seguro(nota.titulo) +
        '</span>' +
        '<span class="lista__pie">' +
          seguro(acortar(nota.cuerpo || '', 70)) + '</span>' +
      '</span>' +
    '</button>'
  ).join('');

  buscarTodos('[data-nota]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioNota(notas.find(n => String(n.id) === boton.dataset.nota));
    });
  });
}

/**
 * Formulario de una nota.
 *
 * @param {Object} [nota]
 * @returns {void}
 */
function formularioNota(nota) {
  const d = nota || {};

  const cuerpo = abrirHoja(nota ? 'Nota' : 'Nueva nota',
    campoTexto({ id: 'not-titulo', rotulo: 'Título', valor: d.titulo,
                 ayuda: 'Si lo dejas vacío se arma solo con la primera línea.' }) +
    campoLargo({ id: 'not-cuerpo', rotulo: 'Nota', valor: d.cuerpo }) +
    campoTexto({ id: 'not-etiqueta', rotulo: 'Etiqueta', valor: d.etiqueta,
                 pista: 'Salón, vestido, música…' }) +
    campoCasilla({ id: 'not-fijada', rotulo: 'Fijar arriba de todo',
                   marcado: Number(d.fijada) === 1 }) +
    pieDeFormulario('Guardar', !!nota)
  );

  // El cursor va directo al cuerpo: al abrir para escribir una nota,
  // lo que uno quiere es empezar a escribir, no elegir un título.
  const area = buscar('#not-cuerpo', cuerpo);
  if (!nota) area.focus();

  /**
   * Junta lo escrito en el formulario.
   *
   * @returns {Object|null} null si la nota está vacía.
   */
  const armarCarga = () => {
    const datos = {
      titulo:   valorDe('not-titulo', cuerpo),
      cuerpo:   valorDe('not-cuerpo', cuerpo),
      etiqueta: valorDe('not-etiqueta', cuerpo),
      fijada:   !!valorDe('not-fijada', cuerpo),
    };
    if (!datos.titulo && !datos.cuerpo) {
      avisar('La nota está vacía.', true);
      return null;
    }
    return datos;
  };

  /* Una nota también puede llevar adjuntos: la foto del vestido que le
     gustó, el PDF que mandó el salón, la captura de una idea. */
  montarAdjuntos({
    cuerpo: cuerpo,
    tipo:   'nota',
    titulo: 'Fotos y documentos',
    id:     nota ? nota.id : 0,
    guardarPrimero: async () => {
      const carga = armarCarga();
      if (!carga) return 0;

      const r = await mandar('planificador.php?accion=guardar_nota', carga);
      return r.id;
    },
  });

  buscar('#pie-guardar', cuerpo).addEventListener('click', () => {
    const carga = armarCarga();
    if (!carga) return;
    if (nota) carga.id = nota.id;

    guardarPlan('guardar_nota', carga, () => abrirHojaDeNota());
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar esta nota?')) return;
      guardarPlan('borrar_nota', { id: nota.id }, () => abrirHojaDeNota());
    });
  }
}


/* ─── 3. TAREAS ────────────────────────────────────────────────────── */

/**
 * Pinta la lista de tareas dentro de un contenedor.
 *
 * @param {Element} donde
 * @returns {void}
 */
function pintarTareas(donde) {
  const tareas = PLAN.tareas || [];

  if (!tareas.length) {
    donde.innerHTML = '';
    pintarVacio(donde, 'Todavía no hay tareas',
      'Anota lo que hay que hacer y quién se encarga.');
    donde.insertAdjacentHTML('beforeend',
      '<button class="boton boton--principal boton--ancho" id="tarea-nueva" ' +
      'style="margin-top:var(--esp-3)">Nueva tarea</button>');
    buscar('#tarea-nueva', donde).addEventListener('click', () => formularioTarea());
    return;
  }

  const prioridades = { alta: 'alerta', media: 'ojo', baja: 'tenue' };

  donde.innerHTML = tareas.map(tarea => {
    const hecha    = tarea.estado === 'hecha';
    const atrasada = !hecha && tarea.fecha_limite && diasHasta(tarea.fecha_limite) < 0;

    const pie = [
      tarea.responsable,
      tarea.fecha_limite ? comoCuando(tarea.fecha_limite) : '',
    ].filter(Boolean).join(' · ');

    return '' +
      '<div class="lista__fila">' +
        '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--oro)" ' +
               (hecha ? 'checked ' : '') + 'data-tarea-check="' + seguro(tarea.id) + '" ' +
               'aria-label="Marcar como hecha">' +
        '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                'data-tarea="' + seguro(tarea.id) + '">' +
          '<span class="lista__titulo"' +
            (hecha ? ' style="text-decoration:line-through;opacity:.55"' : '') + '>' +
            seguro(tarea.titulo) + '</span>' +
          '<span class="lista__pie"' + (atrasada ? ' style="color:var(--alerta)"' : '') + '>' +
            seguro(pie) + '</span>' +
        '</button>' +
        (hecha ? '' :
          '<span class="lista__lado">' +
            '<span class="etiqueta etiqueta--' + (prioridades[tarea.prioridad] || 'tenue') +
            '">' + seguro(tarea.prioridad) + '</span>' +
          '</span>') +
      '</div>';
  }).join('') +
  '<button class="boton boton--principal boton--ancho" id="tarea-nueva" ' +
  'style="margin-top:var(--esp-3)">Nueva tarea</button>';

  buscarTodos('[data-tarea-check]', donde).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      try {
        await mandar('planificador.php?accion=estado_tarea',
                     { id: casilla.dataset.tareaCheck });
        ensuciarVistas('resumen');
        await traerPlanificador();
        pintarTareas(donde);
      } catch (error) {
        casilla.checked = !casilla.checked;
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-tarea]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioTarea(tareas.find(t => String(t.id) === boton.dataset.tarea));
    });
  });

  buscar('#tarea-nueva', donde).addEventListener('click', () => formularioTarea());
}

/**
 * Formulario de una tarea.
 *
 * @param {Object} [tarea]
 * @returns {void}
 */
function formularioTarea(tarea) {
  const d = tarea || {};
  // Con id es una edición de verdad. Sin id —una precarga, como la que
  // arma el asistente (34-asistente-datos.js) con el título y la fecha
  // ya puestos— es un alta: mismo criterio que ya usa formularioEvento()
  // en 11-vista-evento.js para no confundir "datos sugeridos" con
  // "esto ya existe en la base".
  const esEdicion = !!(tarea && tarea.id);

  const cuerpo = abrirHoja(esEdicion ? 'Editar tarea' : 'Nueva tarea',
    campoTexto({ id: 'tar-titulo', rotulo: 'Qué hay que hacer', valor: d.titulo }) +
    campoTexto({ id: 'tar-responsable', rotulo: 'Quién', valor: d.responsable }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'tar-fecha', rotulo: 'Para cuándo', tipo: 'date',
                   valor: d.fecha_limite || '' }) +
      campoLista({ id: 'tar-prioridad', rotulo: 'Prioridad',
                   valor: d.prioridad || 'media',
                   opciones: [
                     { valor: 'alta',  texto: 'Alta' },
                     { valor: 'media', texto: 'Media' },
                     { valor: 'baja',  texto: 'Baja' },
                   ] }) +
    '</div>' +

    campoLista({ id: 'tar-estado', rotulo: 'Estado',
                 valor: d.estado || 'pendiente',
                 opciones: [
                   { valor: 'pendiente', texto: 'Pendiente' },
                   { valor: 'haciendo',  texto: 'En eso' },
                   { valor: 'hecha',     texto: 'Hecha' },
                 ] }) +

    campoLargo({ id: 'tar-detalle', rotulo: 'Detalle', valor: d.detalle }) +
    pieDeFormulario('Guardar', esEdicion)
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', () => {
    const titulo = valorDe('tar-titulo', cuerpo);
    if (!titulo) { avisar('Falta el título.', true); return; }

    const carga = {
      titulo:       titulo,
      responsable:  valorDe('tar-responsable', cuerpo),
      fecha_limite: valorDe('tar-fecha', cuerpo),
      prioridad:    valorDe('tar-prioridad', cuerpo),
      estado:       valorDe('tar-estado', cuerpo),
      detalle:      valorDe('tar-detalle', cuerpo),
      /* No hay campo en el formulario para esto — se conserva tal cual
         venía (de una edición real, o de una precarga como la que arma
         abrirDetalleDeProveedor() con "Nueva tarea"). Sin esto, guardar
         cualquier edición borraría en silencio el vínculo con su
         proveedor/gasto/padrino: guardarOEditar() manda TODAS las
         columnas en cada UPDATE, no solo las que cambiaron. */
      atada_a_tipo: d.atada_a_tipo || '',
      atada_a_id:   d.atada_a_id || 0,
    };
    if (esEdicion) carga.id = tarea.id;
    else registrarEvento('accion', 'crear_tarea');

    guardarPlan('guardar_tarea', carga, refrescarVistaEvento);
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar esta tarea?')) return;
      guardarPlan('borrar_tarea', { id: tarea.id }, refrescarVistaEvento);
    });
  }
}


/* ─── 4. AGENDA ────────────────────────────────────────────────────── */

/**
 * Pinta la agenda dentro de un contenedor.
 *
 * @param {Element} donde
 * @returns {void}
 */
function pintarAgenda(donde) {
  const citas = PLAN.agenda || [];

  if (!citas.length) {
    donde.innerHTML = '';
    pintarVacio(donde, 'Todavía no hay fechas',
      'Pruebas de vestido, pagos, la misa, el ensayo del vals…');
    donde.insertAdjacentHTML('beforeend',
      '<button class="boton boton--principal boton--ancho" id="cita-nueva" ' +
      'style="margin-top:var(--esp-3)">Nueva fecha</button>');
    buscar('#cita-nueva', donde).addEventListener('click', () => formularioCita());
    return;
  }

  donde.innerHTML = citas.map(cita => {
    const dias  = diasHasta(cita.fecha);
    const pasó  = dias < 0;

    const pie = [
      comoFecha(cita.fecha) + (cita.hora ? ' · ' + String(cita.hora).slice(0, 5) : ''),
      cita.lugar,
    ].filter(Boolean).join(' · ');

    return '' +
      '<button class="lista__fila" data-cita="' + seguro(cita.id) + '"' +
              (pasó ? ' style="opacity:.55"' : '') + '>' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(cita.titulo) + '</span>' +
          '<span class="lista__pie">' + seguro(pie) + '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="etiqueta etiqueta--' + (pasó ? 'tenue' : 'info') + '">' +
            seguro(comoCuando(cita.fecha)) + '</span>' +
        '</span>' +
      '</button>';
  }).join('') +
  '<button class="boton boton--principal boton--ancho" id="cita-nueva" ' +
  'style="margin-top:var(--esp-3)">Nueva fecha</button>';

  buscarTodos('[data-cita]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioCita(citas.find(c => String(c.id) === boton.dataset.cita));
    });
  });

  buscar('#cita-nueva', donde).addEventListener('click', () => formularioCita());
}

/**
 * Formulario de una fecha de la agenda.
 *
 * @param {Object} [cita]
 * @returns {void}
 */
function formularioCita(cita) {
  const d = cita || {};

  const cuerpo = abrirHoja(cita ? 'Editar fecha' : 'Nueva fecha',
    campoTexto({ id: 'cit-titulo', rotulo: 'Qué es', valor: d.titulo }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'cit-fecha', rotulo: 'Fecha', tipo: 'date',
                   valor: d.fecha || '' }) +
      campoTexto({ id: 'cit-hora', rotulo: 'Hora', tipo: 'time',
                   valor: d.hora ? String(d.hora).slice(0, 5) : '' }) +
    '</div>' +

    campoTexto({ id: 'cit-lugar', rotulo: 'Dónde', valor: d.lugar }) +

    campoLista({ id: 'cit-avisar', rotulo: 'Avisarme antes',
                 valor: String(d.avisar_dias || 0),
                 opciones: [
                   { valor: '0',  texto: 'No avisar' },
                   { valor: '1',  texto: 'Un día antes' },
                   { valor: '3',  texto: 'Tres días antes' },
                   { valor: '7',  texto: 'Una semana antes' },
                   { valor: '15', texto: 'Quince días antes' },
                 ] }) +

    campoLargo({ id: 'cit-detalle', rotulo: 'Detalle', valor: d.detalle }) +
    pieDeFormulario('Guardar', !!cita)
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', () => {
    const titulo = valorDe('cit-titulo', cuerpo);
    const fecha  = valorDe('cit-fecha', cuerpo);
    if (!titulo) { avisar('Falta el título.', true); return; }
    if (!fecha)  { avisar('Falta la fecha.', true); return; }

    const carga = {
      titulo:      titulo,
      fecha:       fecha,
      hora:        valorDe('cit-hora', cuerpo),
      lugar:       valorDe('cit-lugar', cuerpo),
      avisar_dias: valorDe('cit-avisar', cuerpo),
      detalle:     valorDe('cit-detalle', cuerpo),
    };
    if (cita) carga.id = cita.id;

    guardarPlan('guardar_cita', carga, refrescarVistaEvento);
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar esta fecha?')) return;
      guardarPlan('borrar_cita', { id: cita.id }, refrescarVistaEvento);
    });
  }
}

/**
 * Vuelve a dibujar la vista Evento si es la que se está mirando.
 *
 * Tareas y agenda viven dentro de esa vista, así que al guardar una hay
 * que refrescarla; pero si se guardó desde el botón flotante estando en
 * otra pestaña, no hay nada que refrescar.
 *
 * @returns {Promise<void>}
 */
async function refrescarVistaEvento() {
  if (VISTA_ACTUAL === 'evento' && typeof dibujarEvento === 'function') {
    await dibujarEvento();
  }
}
