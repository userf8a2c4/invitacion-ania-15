/* ══════════════════════════════════════════════════════════════════════
   48-INVITACIONES.JS · LISTA PRECARGADA, LINK PERSONAL, BOLETOS LIMITADOS

   QUÉ HACE ESTE ARCHIVO
   Pinta la sección "Invitaciones" dentro de la pestaña Gente. Es el
   modelo sustractivo: se precarga cada grupo familiar con un cupo fijo
   de lugares y —opcionalmente— los nombres de quienes lo integran; el
   bot de mesas (admin/api/mesas.php) los ve como asistentes desde el
   día uno. Ver la nota grande en admin/api/invitaciones.php.

   DOS VERDADES SEPARADAS, A PROPÓSITO
   "Apartados" (cupo reservado, para el acomodo) nunca se muestra como
   sinónimo de "Confirmados" (quien de verdad contestó que sí). Ver la
   fila de totales de dibujarInvitaciones().

   NADIE ES "TITULAR". Una invitación es del GRUPO. Cualquiera de sus
   integrantes puede ser a quien se le mande el link — nunca se dice
   "titular" ni "acompañante" en la interfaz.
   ══════════════════════════════════════════════════════════════════════ */

/** Última respuesta de invitaciones.php?accion=listar, para no volver a
    pedirla en cada filtro. */
let INVITACIONES = [];
let FILTRO_INVITACIONES = 'todas';

/** La fecha límite para confirmar, en texto — viene del servidor
    (ajuste `fecha_limite_confirmar`), NUNCA de `CONFIGURACION.fiesta`:
    ese dato vive en el sitio público (codigo/01-configuracion.js), que
    es una app completamente separada y nunca se carga acá. */
let FECHA_LIMITE_TEXTO = '';

/**
 * Pinta la sección "Invitaciones".
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function dibujarInvitaciones(cuerpo) {
  pintarCargando(cuerpo, 4);

  try {
    const respuesta = await traer('invitaciones.php?accion=listar');
    INVITACIONES = respuesta.filas || [];
    FECHA_LIMITE_TEXTO = respuesta.fecha_limite_texto || '';
    pintarListaDeInvitaciones(cuerpo, respuesta.totales, respuesta.capacidad);
  } catch (error) {
    pintarError(cuerpo, error.message, () => dibujarInvitaciones(cuerpo));
  }
}

/**
 * Arma el HTML de la lista + fila de totales + filtros.
 *
 * @param {Element} cuerpo
 * @param {Object} totales
 * @param {number} capacidad
 * @returns {void}
 */
function pintarListaDeInvitaciones(cuerpo, totales, capacidad) {
  const t = totales || {};

  const filtros = [
    ['todas',        'Todas'],
    ['sin_enviar',   'Sin enviar'],
    ['sin_responder','Sin responder'],
    ['confirmada',   'Confirmadas'],
    ['declinada',    'Declinadas'],
    ['sin_telefono', 'Sin teléfono'],
  ];

  const visibles = INVITACIONES.filter(filtroDeInvitacionPasa);

  cuerpo.innerHTML =
    '<div class="tarjeta" style="padding:var(--esp-3);margin-bottom:var(--esp-3)">' +
      '<p class="vacio__texto" style="margin:0">' +
        'Apartados <strong>' + seguro(t.apartados || 0) + '</strong> · ' +
        'Confirmados <strong>' + seguro(t.confirmadas || 0) + '</strong> · ' +
        'Sin responder <strong>' + seguro(t.sin_responder || 0) + '</strong> · ' +
        'No vienen <strong>' + seguro(t.declinadas || 0) + '</strong>' +
        (capacidad ? ' · Capacidad de mesas <strong>' + seguro(capacidad) + '</strong>' : '') +
      '</p>' +
    '</div>' +

    '<button type="button" class="lista__fila" id="inv-configurar" ' +
      'style="margin-bottom:var(--esp-2)">⚙️ Fecha límite para confirmar</button>' +

    '<div class="filtros" style="margin-bottom:var(--esp-2);flex-wrap:wrap">' +
      filtros.map(f =>
        '<button class="filtro' + (FILTRO_INVITACIONES === f[0] ? ' activo' : '') +
        '" data-filtro-inv="' + f[0] + '">' + seguro(f[1]) + '</button>'
      ).join('') +
    '</div>' +

    '<div id="lista-invitaciones"></div>' +
    botonAgregar('Nueva invitación');

  buscar('#inv-configurar', cuerpo).addEventListener('click', abrirConfiguracionDeInvitaciones);

  buscarTodos('[data-filtro-inv]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      FILTRO_INVITACIONES = boton.dataset.filtroInv;
      pintarListaDeInvitaciones(cuerpo, totales, capacidad);
    });
  });

  const listaEl = buscar('#lista-invitaciones', cuerpo);

  if (!visibles.length) {
    pintarVacio(listaEl, 'No hay invitaciones acá',
      'Cambiá el filtro o creá la primera con el botón de abajo.');
  } else {
    listaEl.innerHTML = visibles.map(filaDeInvitacion).join('');
    buscarTodos('[data-inv]', listaEl).forEach(fila => {
      fila.addEventListener('click', () => {
        const inv = INVITACIONES.find(i => String(i.id) === fila.dataset.inv);
        if (inv) abrirDetalleDeInvitacion(inv);
      });
    });
  }

  buscar('#agregar', cuerpo).addEventListener('click', () => abrirFormularioDeInvitacion());
}

/**
 * Si una invitación pasa el filtro activo.
 *
 * @param {Object} inv
 * @returns {boolean}
 */
function filtroDeInvitacionPasa(inv) {
  switch (FILTRO_INVITACIONES) {
    case 'sin_telefono':    return !inv.telefono;
    case 'sin_responder':   return inv.estado === 'sin_enviar' || inv.estado === 'enviada';
    case 'sin_enviar':
    case 'confirmada':
    case 'declinada':       return inv.estado === FILTRO_INVITACIONES;
    default:                return true;
  }
}

/** Etiqueta visual de cada estado — mismo patrón de clases que ya usa
    09-vista-dinero.js (etiqueta--bien / etiqueta--alerta / etiqueta--tenue). */
// (2026-08-30) "Enviada" pasa de gris a azul (etiqueta--info) para que
// coincida con el punto de color de la lista de Invitados: gris =
// nadie la tocó todavía, azul = se mandó y espera respuesta.
const ETIQUETA_DE_ESTADO_INV = {
  sin_enviar:  '<span class="etiqueta etiqueta--tenue">Sin enviar</span>',
  enviada:     '<span class="etiqueta etiqueta--info">Enviada</span>',
  confirmada:  '<span class="etiqueta etiqueta--bien">Confirmada</span>',
  declinada:   '<span class="etiqueta etiqueta--alerta">No viene</span>',
};

/** Mismos cuatro estados, en texto plano — para donde hace falta el
    valor solo (la ficha de detalle), sin el <span> de la lista. */
const TEXTO_DE_ESTADO_INV = {
  sin_enviar: 'Sin enviar',
  enviada:    'Enviada, sin responder',
  confirmada: 'Confirmada',
  declinada:  'No viene',
};

/**
 * Una fila de la lista de invitaciones.
 *
 * @param {Object} inv
 * @returns {string}
 */
function filaDeInvitacion(inv) {
  const pie = seguro(inv.pases) + ' ' + (Number(inv.pases) === 1 ? 'lugar' : 'lugares') +
    (inv.grupo_nombre ? ' · ' + seguro(inv.grupo_nombre) : '') +
    (!inv.telefono ? ' · Sin teléfono' : '');

  return '' +
    '<button class="lista__fila" data-inv="' + seguro(inv.id) + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(inv.nombre) + '</span>' +
        '<span class="lista__pie">' + pie + '</span>' +
      '</span>' +
      (ETIQUETA_DE_ESTADO_INV[inv.estado] || '') +
    '</button>';
}

/**
 * Ficha de una invitación: link, y las acciones de envío/edición/borrado.
 *
 * @param {Object} inv
 * @returns {void}
 */
function abrirDetalleDeInvitacion(inv) {
  const detalle = [
    ['Grupo', inv.nombre],
    ['Lugares apartados', inv.pases],
    ['Estado', TEXTO_DE_ESTADO_INV[inv.estado] || inv.estado],
    ['Teléfono', inv.telefono || '—'],
    ['Correo', inv.correo || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(inv.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    '<div class="campo" style="margin-top:var(--esp-3)">' +
      '<span class="campo__rotulo">Link personal</span>' +
      '<input type="text" id="inv-link" class="campo__control" value="' +
        seguro(inv.link) + '" readonly>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2);flex-wrap:wrap">' +
      /* ⚡ (2026-08-28) Antes se mostraba con cualquier `telefono` no
         vacío, aunque no sirviera para WhatsApp (muy corto, un interno,
         etc.) — el botón abría wa.me/?text=… sin destinatario y encima
         se marcaba como "enviada". sirveParaWhatsApp() (02-utilidades.js)
         es la misma comprobación que ya usa paraWhatsApp() más abajo. */
      (sirveParaWhatsApp(inv.telefono)
        ? '<button class="boton boton--principal" id="inv-whatsapp">Mandar por WhatsApp</button>'
        : '') +
      '<button class="boton" id="inv-copiar">Copiar link</button>' +
      (inv.correo
        ? '<button class="boton" id="inv-correo">Mandar por correo</button>'
        : '') +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="inv-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="inv-editar">Editar</button>' +
    '</div>'
  );

  const marcarEnviadaSiHaceFalta = async () => {
    try { await mandar('invitaciones.php?accion=marcar_enviada', { id: inv.id }); }
    catch (error) { /* no bloquea el envío si esto falla */ }
  };

  const botonWhatsapp = buscar('#inv-whatsapp', cuerpo);
  if (botonWhatsapp) {
    botonWhatsapp.addEventListener('click', async () => {
      const texto = textoDeInvitacion(inv);
      const numero = paraWhatsApp(inv.telefono);
      window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(texto), '_blank');
      await marcarEnviadaSiHaceFalta();
    });
  }

  buscar('#inv-copiar', cuerpo).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inv.link);
    } catch (error) {
      const campo = buscar('#inv-link', cuerpo);
      campo.removeAttribute('readonly');
      campo.select();
      document.execCommand('copy');
      campo.setAttribute('readonly', 'readonly');
    }
    avisar('Link copiado.');
    await marcarEnviadaSiHaceFalta();
  });

  const botonCorreo = buscar('#inv-correo', cuerpo);
  if (botonCorreo) {
    botonCorreo.addEventListener('click', async () => {
      if (!confirmarAccion('¿Mandar la invitación por correo a ' + inv.nombre + '?')) return;
      try {
        const r = await mandar('invitaciones.php?accion=enviar_correo', {
          ids: [inv.id],
        });
        avisar(r.mandados ? 'Correo enviado.' : 'No se pudo mandar.', !r.mandados);
        // ⚡ (2026-08-28) Sin cerrar la hoja primero, la ficha vieja
        // quedaba encima del fondo recién repintado por dibujarGente().
        cerrarHoja(true);
        dibujarGente();
      } catch (error) { avisar(error.message, true); }
    });
  }

  buscar('#inv-editar', cuerpo).addEventListener('click', () => abrirFormularioDeInvitacion(inv));

  buscar('#inv-borrar', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion('¿Borrar esta invitación y su confirmación? No se puede deshacer.')) return;
    mandar('invitaciones.php?accion=borrar', { id: inv.id })
      .then(() => { cerrarHoja(true); avisar('Invitación eliminada.'); dibujarGente(); })
      .catch(error => avisar(error.message, true));
  });
}

/**
 * El texto de WhatsApp/correo — tuteo mexicano, igual palabra por
 * palabra en los dos canales (ver la nota grande del plan sobre voz).
 *
 * @param {Object} inv
 * @returns {string}
 */
function textoDeInvitacion(inv) {
  const fechaLimite = FECHA_LIMITE_TEXTO;
  return '✦ Ania cumple quince años ✦\n\n' +
    inv.nombre + ':\n\n' +
    'Hay fechas que uno quiere recordar acompañado, y esta es una de ellas. ' +
    'Nos dará mucha alegría contar con ustedes.\n\n' +
    'Hemos reservado ' + inv.pases + ' lugares a su nombre.\n\n' +
    'Aquí está su invitación. Ahí mismo pueden confirmar y elegir su menú:\n' +
    inv.link + '\n\n' +
    (fechaLimite
      ? 'Les pedimos confirmar antes del ' + fechaLimite + '. ' +
        'Pueden modificar su respuesta cuantas veces gusten hasta esa fecha.'
      : 'Pueden modificar su respuesta cuantas veces gusten.');
}


/* ─── FORMULARIO: CREAR/EDITAR ────────────────────────────────────────── */

/** Personas cargadas en el formulario abierto (se arma en memoria y se
    manda entero al guardar — nunca se sincroniza fila por fila con el
    servidor mientras se edita, solo al tocar Guardar). */
let PERSONAS_DEL_FORMULARIO = [];

/**
 * Abre el formulario de alta/edición de una invitación.
 *
 * @param {Object} [inv]
 * @returns {Promise<void>}
 */
function abrirFormularioDeInvitacion(inv) {
  const d = inv || {};
  PERSONAS_DEL_FORMULARIO = (d.personas || []).slice();

  /* ⚡ (2026-08-28) Antes el `await traer('mesas.php?accion=todo')` corría
     ACÁ, antes de abrirHoja(): con red lenta no pasaba nada visible en
     pantalla por varios segundos, y un doble toque impaciente disparaba
     dos veces esta función, cada una pisando la misma global
     PERSONAS_DEL_FORMULARIO. Ahora la hoja se abre de inmediato (el
     selector de grupo arranca con solo "Sin grupo") y los grupos reales
     se cargan y se agregan al selector después, en segundo plano. */
  const cuerpo = abrirHoja(inv ? 'Editar invitación' : 'Nueva invitación',
    campoTexto({ id: 'inv-nombre', rotulo: 'Nombre del grupo', valor: d.nombre,
                 pista: 'Familia Zelaya, Ana y Miguel…' }) +

    campoTelefono({ id: 'inv-telefono', rotulo: 'Teléfono (para WhatsApp)', valor: d.telefono }) +
    campoTexto({ id: 'inv-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +

    campoListaAmpliable({
      id: 'inv-grupo',
      rotulo: 'Grupo (para sentarlos juntos)',
      valor: d.grupo_id ? String(d.grupo_id) : '',
      textoAgregar: 'Crear grupo nuevo…',
      // Arranca solo con "Sin grupo"; los grupos reales se agregan más
      // abajo, apenas responde mesas.php?accion=todo (ver cargarGrupos()).
      opciones: [{ valor: '', texto: 'Sin grupo' }],
    }) +

    '<div class="campo">' +
      '<span class="campo__rotulo">Personas del grupo (opcional)</span>' +
      '<p class="vacio__texto" style="margin:4px 0 8px">' +
        'Si no sabés los nombres todavía, dejalo vacío y poné solo cuántos lugares apartás.' +
      '</p>' +
      '<div id="inv-personas"></div>' +
      '<button type="button" class="boton boton--chico" id="inv-agregar-persona" ' +
        'style="margin-top:var(--esp-1)">Agregar persona</button>' +
    '</div>' +

    '<div id="inv-caja-pases">' +
      campoTexto({ id: 'inv-pases', rotulo: 'Lugares apartados', tipo: 'number',
                   valor: d.pases || 1 }) +
    '</div>' +

    /* ⚡ (2026-08-28) `pieDeFormulario(texto, conBorrar)` pintaba un botón
       "Borrar" acá con `!!inv`, pero nunca se le enganchó ningún listener
       — un botón muerto. El borrado real ya vive en la ficha de detalle
       (#inv-borrar, con su confirmación); acá siempre va `false`. */
    pieDeFormulario('Guardar', false)
  );

  engancharListaAmpliable('inv-grupo', cuerpo);

  // Carga los grupos reales en segundo plano y los agrega al selector,
  // sin bloquear la apertura de la hoja. Si para cuando responde el
  // usuario ya cerró la hoja, document.contains() lo detecta y no toca
  // nada — cuerpo es el <section> que abrirHoja() ya sacó del DOM.
  (async () => {
    let grupos = [];
    try {
      const datosDeMesas = await traer('mesas.php?accion=todo');
      grupos = datosDeMesas.grupos || [];
    } catch (error) { return; /* sin grupos, se sigue igual */ }
    if (!grupos.length || !document.contains(cuerpo)) return;

    const selectorGrupo = buscar('#inv-grupo', cuerpo);
    if (!selectorGrupo) return;
    const opcionAgregar = selectorGrupo.querySelector('option[value="__nuevo__"]');
    grupos.forEach(g => {
      const opcion = document.createElement('option');
      opcion.value = String(g.id);
      opcion.textContent = g.nombre;
      if (d.grupo_id && String(d.grupo_id) === String(g.id)) opcion.selected = true;
      selectorGrupo.insertBefore(opcion, opcionAgregar);
    });
  })();

  const listaPersonas = buscar('#inv-personas', cuerpo);
  const cajaPases     = buscar('#inv-caja-pases', cuerpo);

  const actualizarCajaPases = () => {
    const hayPersonas = PERSONAS_DEL_FORMULARIO.some(p => (p.nombre || '').trim() !== '');
    cajaPases.classList.toggle('oculto', hayPersonas);
  };

  const repintarPersonas = () => {
    listaPersonas.innerHTML = PERSONAS_DEL_FORMULARIO.map((p, i) =>
      '<div class="campo-par" data-persona-fila="' + i + '" style="align-items:flex-end;margin-bottom:var(--esp-1)">' +
        '<label class="campo" style="flex:2">' +
          '<input type="text" class="campo__control" data-persona-nombre placeholder="Nombre" ' +
                 'value="' + seguro(p.nombre || '') + '">' +
        '</label>' +
        '<label class="campo" style="flex:1">' +
          '<select class="campo__control" data-persona-tipo>' +
            '<option value="adulto"' + (p.tipo !== 'nino' ? ' selected' : '') + '>Adulto</option>' +
            '<option value="nino"' + (p.tipo === 'nino' ? ' selected' : '') + '>Niño</option>' +
          '</select>' +
        '</label>' +
        '<button type="button" class="boton boton--chico" data-persona-quitar>Quitar</button>' +
      '</div>'
    ).join('');

    buscarTodos('[data-persona-nombre]', listaPersonas).forEach((input, i) => {
      input.addEventListener('input', () => {
        PERSONAS_DEL_FORMULARIO[i].nombre = input.value;
        actualizarCajaPases();
      });
    });
    buscarTodos('[data-persona-tipo]', listaPersonas).forEach((select, i) => {
      select.addEventListener('change', () => { PERSONAS_DEL_FORMULARIO[i].tipo = select.value; });
    });
    buscarTodos('[data-persona-quitar]', listaPersonas).forEach((boton, i) => {
      boton.addEventListener('click', () => {
        PERSONAS_DEL_FORMULARIO.splice(i, 1);
        repintarPersonas();
        actualizarCajaPases();
      });
    });
  };

  buscar('#inv-agregar-persona', cuerpo).addEventListener('click', () => {
    PERSONAS_DEL_FORMULARIO.push({ nombre: '', tipo: 'adulto' });
    repintarPersonas();
    actualizarCajaPases();
    const ultimo = listaPersonas.querySelector('[data-persona-fila]:last-child [data-persona-nombre]');
    if (ultimo) ultimo.focus();
  });

  repintarPersonas();
  actualizarCajaPases();

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('inv-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre del grupo.', true); return; }

    let grupoElegido = valorDe('inv-grupo', cuerpo);
    let grupoId = 0;

    if (grupoElegido === '__nuevo__') {
      const nombreNuevo = valorDe('inv-grupo-nuevo', cuerpo);
      if (!nombreNuevo) { avisar('Escribí el nombre del grupo nuevo.', true); return; }
      try {
        const r = await mandar('mesas.php?accion=guardar_grupo', { nombre: nombreNuevo });
        grupoId = r.id;
      } catch (error) { avisar(error.message, true); return; }
    } else if (grupoElegido) {
      grupoId = Number(grupoElegido);
    }

    const personasValidas = PERSONAS_DEL_FORMULARIO
      .filter(p => (p.nombre || '').trim() !== '')
      .map(p => ({ id: p.id, nombre: p.nombre.trim(), tipo: p.tipo === 'nino' ? 'nino' : 'adulto' }));

    const carga = {
      nombre: nombre,
      telefono: valorTelefonoDe('inv-telefono', cuerpo),
      correo: valorDe('inv-correo', cuerpo),
      grupo_id: grupoId,
      personas: personasValidas,
    };
    if (!personasValidas.length) {
      carga.pases = Math.max(1, Number(valorDe('inv-pases', cuerpo)) || 1);
    }
    if (inv) carga.id = inv.id;

    try {
      const r = await mandar('invitaciones.php?accion=guardar', carga);
      cerrarHoja(true);
      avisar('Guardado.');
      // ⚡ (2026-08-30) Cupo sustractivo: se avisa, no se bloquea — la
      // decisión de sobre-reservar es de Lucila, no del formulario.
      if (r && r.se_excede) avisar(r.aviso, true);
      // ⚡ (2026-08-28) Si el filtro activo era, por ejemplo, "Confirmadas"
      // y se crea una invitación nueva (nace "Sin enviar"), sin este
      // reset la lista repintada la esconde y parece que no se guardó
      // nada. Volver siempre a "Todas" tras guardar.
      FILTRO_INVITACIONES = 'todas';
      dibujarGente();
    } catch (error) { avisar(error.message, true); }
  });
}


/* ─── CONFIGURACIÓN: FECHA LÍMITE PARA CONFIRMAR ─────────────────────── */

/**
 * Cuándo se cierran las ediciones (?i=TOKEN deja de poder cambiarse
 * después de esta fecha; una primera respuesta tardía sigue
 * aceptándose — ver la nota grande en confirmar.php). Se guarda en
 * `ajustes` (mismo patrón que admin/codigo/47-config-documentos.js),
 * en formato AAAA-MM-DD para poder compararla contra la fecha de hoy
 * del lado del servidor — nunca como texto libre en español.
 *
 * @returns {Promise<void>}
 */
async function abrirConfiguracionDeInvitaciones() {
  let valorActual = '2026-10-01';
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=fecha_limite_confirmar');
    if (r && r.valor) valorActual = r.valor;
  } catch (error) { /* se usa el respaldo */ }

  const cuerpo = abrirHoja('Fecha límite para confirmar',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Hasta esta fecha, cada grupo puede entrar a su link y cambiar su ' +
      'respuesta cuantas veces quiera. Después de esa fecha, ya no se ' +
      'puede editar una respuesta ya dada — pero contestar por primera ' +
      'vez, aunque sea tarde, sigue aceptándose.' +
    '</p>' +
    campoTexto({ id: 'cfg-inv-fecha-limite', rotulo: 'Fecha límite', tipo: 'date',
                 valor: valorActual }) +
    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const valor = valorDe('cfg-inv-fecha-limite', cuerpo);
    if (!valor) { avisar('Elegí una fecha.', true); return; }
    try {
      await mandar('ajustes.php?accion=guardar', { clave: 'fecha_limite_confirmar', valor: valor });
      cerrarHoja(true);
      avisar('Guardado.');
    } catch (error) { avisar(error.message, true); }
  });
}
