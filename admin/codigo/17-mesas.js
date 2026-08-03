/* ══════════════════════════════════════════════════════════════════════
   17 · MESAS Y ACOMODO

   QUÉ HACE ESTE ARCHIVO
   La pantalla donde se decide quién se sienta dónde: crear las mesas,
   dejar que se acomoden solas, y corregir a mano lo que haga falta.

   CÓMO ESTÁ PENSADA
   Arriba, siempre, los cuatro números que contestan "¿entra todo el
   mundo?". Después, los que todavía no tienen mesa —porque eso es lo
   que hay que resolver—. Y al final las mesas con su gente.

   La computadora propone, la persona dispone: cualquier cosa que se
   acomode a mano queda FIJADA y el acomodo automático no la vuelve a
   tocar nunca. Es lo que permite usar el botón sin miedo.

   ÍNDICE
     1. Datos y dibujado
     2. Cuando todavía no hay mesas
     3. Las mesas y su gente
     4. Sentar a mano
     5. Grupos, peleas y preferencias
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió mesas.php la última vez. */
let MESAS = null;


/* ─── 1. DATOS Y DIBUJADO ──────────────────────────────────────────── */

/**
 * Pide el panorama y arma la pantalla.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function pintarMesas(cuerpo) {
  pintarCargando(cuerpo, 4);

  try {
    MESAS = await traer('mesas.php?accion=todo');
  } catch (error) {
    pintarError(cuerpo, error.message, () => pintarMesas(cuerpo));
    return;
  }

  // Sin mesas creadas no hay nada que acomodar: se ofrece crearlas.
  if (!MESAS.mesas.length) {
    pintarArranqueDeMesas(cuerpo);
    return;
  }

  cuerpo.innerHTML =
    bloqueResumenDeMesas(MESAS.resumen) +
    bloqueBotonesDeMesas() +
    bloqueSinSentar(MESAS.sin_sentar) +
    bloqueDeLasMesas(MESAS.mesas);

  engancharMesas(cuerpo);
}

/**
 * Los cuatro números de arriba.
 *
 * @param {Object} r
 * @returns {string} HTML
 */
function bloqueResumenDeMesas(r) {
  /* El aviso de que falta lugar va arriba y en rojo porque es el único
     problema que NO se arregla acomodando mejor: hay que agregar mesas
     o sillas, y cuanto antes se sepa, mejor. */
  const falta = r.faltan_lugares > 0
    ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
      'Faltan ' + seguro(r.faltan_lugares) + ' lugares: hay ' +
      seguro(r.gente) + ' personas y solo ' + seguro(r.capacidad) +
      ' sillas. Agregá mesas o subile la capacidad a las que hay.</p>'
    : '';

  return '' +
    '<div class="tarjeta">' +
      '<div class="rejilla-datos" style="margin-bottom:0">' +
        tarjetaDato(r.gente,      'Personas') +
        tarjetaDato(r.capacidad,  'Lugares') +
        tarjetaDato(r.mesas,      'Mesas') +
        tarjetaDato(r.sin_sentar, 'Sin mesa') +
      '</div>' +
      falta +
    '</div>';
}

/**
 * Los botones de acción.
 *
 * @returns {string} HTML
 */
function bloqueBotonesDeMesas() {
  return '' +
    '<div style="display:flex;gap:var(--esp-2);margin-bottom:var(--esp-2)">' +
      '<button class="boton boton--principal" style="flex:2" id="mesa-auto">' +
        'Acomodar solo' +
      '</button>' +
      '<button class="boton" style="flex:1" id="mesa-opciones">Opciones</button>' +
    '</div>';
}

/**
 * Los que todavía no tienen mesa.
 *
 * @param {Array} gente
 * @returns {string} HTML
 */
function bloqueSinSentar(gente) {
  if (!gente.length) {
    return '<div class="tarjeta" style="border-color:var(--bien)">' +
           '<p class="vacio__texto" style="color:var(--bien)">' +
           'Todos los que confirmaron tienen mesa.</p></div>';
  }

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      'Sin mesa (' + gente.length + ')' +
    '</div>' +
    gente.map(p =>
      '<button class="lista__fila" data-sentar="' + seguro(p.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
          '<span class="lista__pie">' +
            seguro(pluralizar(p.lugares, 'lugar', 'lugares') +
                   (p.grupo ? ' · ' + p.grupo : '')) +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="etiqueta etiqueta--ojo">Sentar</span>' +
        '</span>' +
      '</button>'
    ).join('');
}

/**
 * Las mesas con su gente adentro.
 *
 * @param {Array} mesas
 * @returns {string} HTML
 */
function bloqueDeLasMesas(mesas) {
  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-4) 0 var(--esp-2)">' +
      'Las mesas' +
    '</div>' +

    mesas.map(mesa => {
      const libres = mesa.capacidad - mesa.ocupados;
      const llena  = mesa.ocupados > mesa.capacidad;

      const estado = llena
        ? '<span class="etiqueta etiqueta--alerta">Se pasa por ' +
          seguro(mesa.ocupados - mesa.capacidad) + '</span>'
        : libres === 0
          ? '<span class="etiqueta etiqueta--bien">Completa</span>'
          : '<span class="etiqueta etiqueta--tenue">' +
            seguro(pluralizar(libres, 'libre', 'libres')) + '</span>';

      const pct = mesa.capacidad > 0
        ? Math.min(100, Math.round(mesa.ocupados / mesa.capacidad * 100)) : 0;

      const gente = mesa.invitados.length
        ? mesa.invitados.map(inv =>
            '<button class="lista__fila" style="margin-left:var(--esp-2)" ' +
                    'data-mover="' + seguro(inv.id) + '">' +
              '<span class="lista__cuerpo">' +
                '<span class="lista__titulo">' +
                  (inv.fijada ? '<span style="color:var(--oro)">•</span> ' : '') +
                  seguro(inv.nombre) +
                '</span>' +
                '<span class="lista__pie">' +
                  seguro(pluralizar(inv.lugares, 'lugar', 'lugares') +
                         (inv.grupo ? ' · ' + inv.grupo : '')) +
                '</span>' +
              '</span>' +
            '</button>'
          ).join('')
        : '<p class="vacio__texto" style="margin-left:var(--esp-3)">Vacía</p>';

      return '' +
        '<div class="tarjeta" style="padding:var(--esp-2)">' +
          '<div style="display:flex;justify-content:space-between;' +
                      'align-items:center;gap:var(--esp-2)">' +
            '<button style="border:0;background:none;color:inherit;' +
                    'text-align:left;flex:1;padding:0" ' +
                    'data-editar-mesa="' + seguro(mesa.id) + '">' +
              '<strong>' + seguro(mesa.nombre) + '</strong>' +
              '<span class="vacio__texto"> · ' +
                seguro(mesa.ocupados + '/' + mesa.capacidad) + '</span>' +
              (mesa.ubicacion
                ? '<span class="lista__pie">' + seguro(mesa.ubicacion) + '</span>'
                : '') +
            '</button>' +
            estado +
          '</div>' +

          '<div class="barra" style="margin:6px 0 var(--esp-1)">' +
            '<div class="barra__relleno' + (llena ? ' barra__relleno--pasado' : '') +
                 '" style="width:' + pct + '%"></div>' +
          '</div>' +

          gente +
        '</div>';
    }).join('') +

    '<button class="boton boton--ancho" id="mesa-nueva" ' +
            'style="margin-top:var(--esp-2)">Agregar una mesa</button>';
}


/* ─── 2. CUANDO TODAVÍA NO HAY MESAS ───────────────────────────────── */

/**
 * La pantalla de arranque: crear el salón de una vez.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarArranqueDeMesas(cuerpo) {
  const gente = MESAS.resumen.gente;

  /* Se sugiere una cantidad de mesas que alcance para la gente que ya
     confirmó, redondeando para arriba. Es solo una sugerencia: el campo
     queda editable. */
  const sugeridas = Math.max(1, Math.ceil(gente / 10)) || 8;

  cuerpo.innerHTML =
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Armar el salón</div>' +
      '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
        'Creá todas las mesas de una vez y después acomodá la gente. ' +
        'Podés cambiar cualquier mesa después, una por una.' +
      '</p>' +

      '<div class="campo-par">' +
        campoTexto({ id: 'lote-cuantas', rotulo: 'Cuántas mesas',
                     tipo: 'number', valor: sugeridas }) +
        campoTexto({ id: 'lote-capacidad', rotulo: 'Sillas por mesa',
                     tipo: 'number', valor: 10 }) +
      '</div>' +

      campoTexto({ id: 'lote-prefijo', rotulo: 'Cómo se llaman',
                   valor: 'Mesa',
                   ayuda: 'Se numeran solas: Mesa 1, Mesa 2, Mesa 3…' }) +

      '<button class="boton boton--principal boton--ancho" id="lote-crear">' +
        'Crear las mesas' +
      '</button>' +

      (gente
        ? '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
          'Hay ' + seguro(gente) + ' personas confirmadas.</p>'
        : '') +
    '</div>';

  buscar('#lote-crear', cuerpo).addEventListener('click', async () => {
    const cuantas = Number(valorDe('lote-cuantas', cuerpo)) || 0;
    const sillas  = Number(valorDe('lote-capacidad', cuerpo)) || 0;

    if (cuantas < 1) { avisar('Poné cuántas mesas.', true); return; }
    if (sillas < 1)  { avisar('Poné cuántas sillas por mesa.', true); return; }

    try {
      const r = await mandar('mesas.php?accion=crear_lote', {
        cuantas: cuantas,
        capacidad: sillas,
        prefijo: valorDe('lote-prefijo', cuerpo) || 'Mesa',
      });
      avisar(r.mensaje);
      pintarMesas(cuerpo);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/* ─── 3. LAS MESAS Y SU GENTE ──────────────────────────────────────── */

/**
 * Engancha todos los botones de la pantalla.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharMesas(cuerpo) {
  const refrescar = () => pintarMesas(cuerpo);

  buscar('#mesa-auto', cuerpo).addEventListener('click', () => acomodarSolo(refrescar));
  buscar('#mesa-opciones', cuerpo).addEventListener('click', () => abrirOpcionesDeMesas(refrescar));
  buscar('#mesa-nueva', cuerpo).addEventListener('click', () => formularioEvento('mesas'));

  buscarTodos('[data-sentar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.sentar), refrescar));
  });

  buscarTodos('[data-mover]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.mover), refrescar));
  });

  buscarTodos('[data-editar-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const mesa = (EVENTO.mesas || []).find(m =>
        String(m.id) === boton.dataset.editarMesa);
      if (mesa) formularioEvento('mesas', mesa);
    });
  });
}

/**
 * Corre el acomodo automático, mostrando antes qué va a pasar.
 *
 * SE MUESTRA UNA VISTA PREVIA A PROPÓSITO. Acomodar cien personas de un
 * botonazo, sin saber qué va a cambiar, da miedo — y con razón. Ver
 * "van a quedar 3 sin lugar" ANTES de aplicar convierte un salto al
 * vacío en una decisión.
 *
 * @param {Function} refrescar
 * @returns {Promise<void>}
 */
async function acomodarSolo(refrescar) {
  let previa;
  try {
    previa = await mandar('mesas.php?accion=vista_previa', {});
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  const sinLugar = previa.sin_lugar || [];
  const fijados = (MESAS.mesas || []).reduce((n, m) =>
    n + m.invitados.filter(i => i.fijada).length, 0);

  const cuerpo = abrirHoja('Acomodar solo',
    '<p style="margin-bottom:var(--esp-3)">' +
      'Se van a sentar <strong>' + seguro(Object.keys(previa.plan || {}).length) +
      '</strong> confirmaciones.' +
    '</p>' +

    (fijados
      ? '<p class="vacio__texto">' +
        seguro(fijados === 1
          ? 'La que acomodaste a mano no se va a tocar.'
          : 'Las ' + fijados + ' que acomodaste a mano no se van a tocar.') +
        '</p>'
      : '') +

    (sinLugar.length
      ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
          'Van a quedar ' + seguro(sinLugar.length) + ' sin lugar:<br>' +
          sinLugar.map(s => seguro(s.nombre) + ' (' +
                       seguro(pluralizar(s.lugares, 'lugar', 'lugares')) + ')')
                  .join('<br>') +
        '</p>'
      : '<p class="vacio__texto" style="color:var(--bien);margin-top:var(--esp-2)">' +
        'Entran todos.</p>') +

    '<div class="acciones">' +
      '<button class="boton" id="acomodo-cancelar">Cancelar</button>' +
      '<button class="boton boton--principal" id="acomodo-aplicar">Acomodar</button>' +
    '</div>'
  );

  buscar('#acomodo-cancelar', cuerpo).addEventListener('click', cerrarHoja);

  buscar('#acomodo-aplicar', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('mesas.php?accion=autoasignar', {});
      cerrarHoja();
      avisar(r.mensaje);
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/* ─── 4. SENTAR A MANO ─────────────────────────────────────────────── */

/**
 * Abre la hoja para elegir mesa para alguien.
 *
 * @param {number} confirmacionId
 * @param {Function} refrescar
 * @returns {void}
 */
function elegirMesaPara(confirmacionId, refrescar) {
  // Buscar a la persona, esté sentada o no.
  let quien = (MESAS.sin_sentar || []).find(p => p.id === confirmacionId);
  let mesaActual = 0;

  if (!quien) {
    (MESAS.mesas || []).forEach(mesa => {
      const encontrado = mesa.invitados.find(i => i.id === confirmacionId);
      if (encontrado) { quien = encontrado; mesaActual = mesa.id; }
    });
  }
  if (!quien) return;

  /* Las mesas se ordenan poniendo primero las que tienen lugar, y entre
     esas, las que ya tienen gente de su mismo grupo. Es el orden en que
     una persona las miraría. */
  const opciones = (MESAS.mesas || []).map(mesa => {
    const libres = mesa.capacidad - mesa.ocupados +
                   (mesa.id === mesaActual ? quien.lugares : 0);

    const tieneSuGrupo = quien.grupo_id &&
      mesa.invitados.some(i => i.grupo_id === quien.grupo_id && i.id !== quien.id);

    return { mesa, libres, entra: libres >= quien.lugares, tieneSuGrupo };
  }).sort((a, b) => {
    if (a.entra !== b.entra) return a.entra ? -1 : 1;
    if (a.tieneSuGrupo !== b.tieneSuGrupo) return a.tieneSuGrupo ? -1 : 1;
    return a.libres - b.libres;
  });

  const cuerpo = abrirHoja(quien.nombre,
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Ocupa ' + seguro(pluralizar(quien.lugares, 'lugar', 'lugares')) +
      (quien.grupo ? ' · ' + seguro(quien.grupo) : '') +
    '</p>' +

    opciones.map(o =>
      '<button class="lista__fila" data-mesa="' + seguro(o.mesa.id) + '"' +
        (o.mesa.id === mesaActual ? ' style="border-color:var(--oro)"' : '') + '>' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(o.mesa.nombre) +
            (o.mesa.id === mesaActual ? ' (actual)' : '') + '</span>' +
          '<span class="lista__pie">' +
            seguro(o.mesa.ocupados + ' de ' + o.mesa.capacidad) +
            (o.tieneSuGrupo ? ' · están los de su grupo' : '') +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          (o.entra
            ? '<span class="etiqueta etiqueta--bien">Entra</span>'
            : '<span class="etiqueta etiqueta--alerta">No entra</span>') +
        '</span>' +
      '</button>'
    ).join('') +

    '<div class="acciones">' +
      (mesaActual
        ? '<button class="boton" id="mesa-fijar">' +
          (quien.fijada ? 'Dejar que se mueva' : 'Fijar acá') + '</button>' +
          '<button class="boton boton--peligro" id="mesa-quitar">Sacar de la mesa</button>'
        : '') +
    '</div>' +

    '<button class="boton boton--ancho" id="mesa-preferencias" ' +
            'style="margin-top:var(--esp-2)">Grupo, sillas extra y reglas</button>'
  );

  buscarTodos('[data-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=sentar', {
          confirmacion_id: confirmacionId,
          mesa_id: Number(boton.dataset.mesa),
        });
        cerrarHoja();
        avisar(r.mensaje);
        if (r.se_excede) avisar(r.aviso, true);
        refrescar();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  const fijar = buscar('#mesa-fijar', cuerpo);
  if (fijar) {
    fijar.addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=fijar',
                               { confirmacion_id: confirmacionId });
        cerrarHoja();
        avisar(r.mensaje);
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const quitar = buscar('#mesa-quitar', cuerpo);
  if (quitar) {
    quitar.addEventListener('click', async () => {
      try {
        await mandar('mesas.php?accion=sentar',
                     { confirmacion_id: confirmacionId, mesa_id: 0 });
        cerrarHoja();
        avisar('Se quitó de la mesa.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  buscar('#mesa-preferencias', cuerpo).addEventListener('click', () => {
    abrirPreferenciasDe(quien, refrescar);
  });
}


/* ─── 5. GRUPOS, PELEAS Y PREFERENCIAS ─────────────────────────────── */

/**
 * Las preferencias de una persona: grupo, sillas extra y con quién no.
 *
 * @param {Object} quien
 * @param {Function} refrescar
 * @returns {void}
 */
function abrirPreferenciasDe(quien, refrescar) {
  const todos = (MESAS.sin_sentar || []).concat(
    ...(MESAS.mesas || []).map(m => m.invitados)
  ).filter(p => p.id !== quien.id);

  const misPeleas = (MESAS.peleas || []).filter(p =>
    Number(p.invitado_a) === quien.id || Number(p.invitado_b) === quien.id);

  const nombreDe = id => {
    const p = (MESAS.sin_sentar || []).concat(
      ...(MESAS.mesas || []).map(m => m.invitados)
    ).find(x => x.id === Number(id));
    return p ? p.nombre : 'alguien';
  };

  const cuerpo = abrirHoja(quien.nombre,
    campoLista({
      id: 'pref-grupo', rotulo: 'Grupo',
      valor: quien.grupo_id ? String(quien.grupo_id) : '',
      opciones: [{ valor: '', texto: 'Sin grupo' }].concat(
        (MESAS.grupos || []).map(g => ({ valor: String(g.id), texto: g.nombre }))),
    }) +

    campoTexto({ id: 'pref-extra', rotulo: 'Sillas de más',
                 tipo: 'number', valor: quien.extra || 0,
                 ayuda: 'Para la silla alta de un bebé, un andador, o alguien ' +
                        'que viene sin confirmar.' }) +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      'No sentarlo con' +
    '</div>' +

    (misPeleas.length
      ? misPeleas.map(p => {
          const otro = Number(p.invitado_a) === quien.id ? p.invitado_b : p.invitado_a;
          return '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(nombreDe(otro)) + '</span>' +
              (p.motivo
                ? '<span class="lista__pie">' + seguro(p.motivo) + '</span>' : '') +
            '</span>' +
            '<button class="boton-icono" data-quitar-pelea="' + seguro(p.id) + '" ' +
                    'aria-label="Quitar regla">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" ' +
                      'stroke-width="2" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>';
        }).join('')
      : '<p class="vacio__texto">Se lleva bien con todos.</p>') +

    campoLista({
      id: 'pref-pelea', rotulo: 'Agregar a alguien',
      valor: '',
      opciones: [{ valor: '', texto: 'Elegir…' }].concat(
        todos.map(p => ({ valor: String(p.id), texto: p.nombre }))),
    }) +

    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    try {
      await mandar('mesas.php?accion=preferencia', {
        confirmacion_id: quien.id,
        grupo_id: valorDe('pref-grupo', cuerpo),
        sillas_extra: valorDe('pref-extra', cuerpo),
      });

      const conQuien = valorDe('pref-pelea', cuerpo);
      if (conQuien) {
        await mandar('mesas.php?accion=pelea', {
          invitado_a: quien.id,
          invitado_b: Number(conQuien),
        });
      }

      cerrarHoja();
      avisar('Guardado.');
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  buscarTodos('[data-quitar-pelea]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        await mandar('mesas.php?accion=borrar_pelea', { id: boton.dataset.quitarPelea });
        cerrarHoja();
        avisar('Regla eliminada.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  });
}

/**
 * Las opciones del acomodo: grupos, vaciar y el automático.
 *
 * @param {Function} refrescar
 * @returns {void}
 */
function abrirOpcionesDeMesas(refrescar) {
  const cuerpo = abrirHoja('Opciones del acomodo',

    '<div class="tarjeta__titulo">Grupos</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'La gente del mismo grupo se sienta junta. Los de orden más bajo ' +
      'eligen mesa primero.' +
    '</p>' +

    ((MESAS.grupos || []).length
      ? (MESAS.grupos || []).map(g =>
          '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(g.nombre) + '</span>' +
              '<span class="lista__pie">Orden ' + seguro(g.orden) + '</span>' +
            '</span>' +
            '<button class="boton-icono" data-borrar-grupo="' + seguro(g.id) + '" ' +
                    'aria-label="Borrar grupo">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" ' +
                      'stroke-width="2" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>'
        ).join('')
      : '<p class="vacio__texto">Todavía no hay grupos.</p>') +

    '<div class="campo-par" style="margin-top:var(--esp-2)">' +
      campoTexto({ id: 'gr-nombre', rotulo: 'Grupo nuevo',
                   pista: 'Familia Zelaya' }) +
      campoTexto({ id: 'gr-orden', rotulo: 'Orden', tipo: 'number', valor: 50 }) +
    '</div>' +
    '<button class="boton boton--ancho" id="gr-crear">Crear el grupo</button>' +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      'Al recibir una confirmación' +
    '</div>' +
    campoCasilla({ id: 'auto-confirmar',
                   rotulo: 'Sentarlo solo apenas confirma',
                   marcado: !!MESAS.auto_al_confirmar }) +
    '<p class="vacio__texto">Busca la mejor mesa respetando su grupo y las ' +
      'reglas. Si no hay lugar, queda sin mesa y te avisa acá.</p>' +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      'Empezar de nuevo' +
    '</div>' +
    '<button class="boton boton--ancho boton--peligro" id="mesa-vaciar" ' +
            'style="margin-bottom:var(--esp-1)">' +
      'Vaciar las mesas (respeta lo fijado)' +
    '</button>' +
    '<button class="boton boton--ancho boton--peligro" id="mesa-vaciar-todo">' +
      'Vaciar TODO, incluso lo fijado' +
    '</button>'
  );

  buscar('#gr-crear', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('gr-nombre', cuerpo);
    if (!nombre) { avisar('Poné el nombre del grupo.', true); return; }

    try {
      await mandar('mesas.php?accion=guardar_grupo', {
        nombre: nombre,
        orden: valorDe('gr-orden', cuerpo),
      });
      cerrarHoja();
      avisar('Grupo creado.');
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscarTodos('[data-borrar-grupo]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar este grupo? Sus invitados quedan sin grupo.')) return;
      try {
        await mandar('mesas.php?accion=borrar_grupo', { id: boton.dataset.borrarGrupo });
        cerrarHoja();
        avisar('Grupo eliminado.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  });

  buscar('#auto-confirmar', cuerpo).addEventListener('change', async evento => {
    try {
      const r = await mandar('mesas.php?accion=auto_al_confirmar',
                             { prender: evento.target.checked });
      avisar(r.mensaje);
    } catch (error) {
      evento.target.checked = !evento.target.checked;
      avisar(error.message, true);
    }
  });

  buscar('#mesa-vaciar', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion('¿Sacar a todos de las mesas?\n\n' +
                         'Lo que fijaste a mano queda como está.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', {});
      cerrarHoja();
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscar('#mesa-vaciar-todo', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion('¿Vaciar TODO, incluso lo que fijaste a mano?\n\n' +
                         'Esto no se puede deshacer.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', { todo: true });
      cerrarHoja();
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });
}
