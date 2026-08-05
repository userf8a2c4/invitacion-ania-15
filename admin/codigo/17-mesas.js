/* ══════════════════════════════════════════════════════════════════════
   17 · MESAS Y ACOMODO

   QUÉ HACE ESTE ARCHIVO
   La pantalla donde se decide quién se sienta dónde: crear las mesas,
   dejar que se acomoden solas, y corregir a mano lo que haga falta.

   CÓMO ESTÁ PENSADA
   Arriba, siempre, los cuatro números que contestan "¿entra todo el
   mundo?". Después, los que todavía no tienen mesa —porque eso es lo
   que hay que resolver—. Y al final el salón: el PLANO, que dibuja las
   mesas donde están de verdad, o la lista para repasar nombre por
   nombre.

   LA COMPUTADORA PROPONE, LA PERSONA DISPONE
   Sentar a alguien a mano es una propuesta, no un candado: el acomodo
   automático puede volver a moverlo. Para trabar una asignación hay que
   tocar "Fijar acá" a propósito.

   Antes todo sentado manual quedaba fijado, y después de mover cinco
   personas de prueba el automático ya casi no tenía margen. Además,
   ahora se guarda una foto antes de cada acomodo, así que se puede
   probar y volver atrás.

   ÍNDICE
     1. Datos y dibujado
     1B. El plano del salón
     2. Cuando todavía no hay mesas
     3. Las mesas y su gente
     4. Sentar a mano
     5. Grupos, peleas y preferencias
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió mesas.php la última vez. */
let MESAS = null;

/** Si se está viendo el plano del salón o la lista: 'plano' o 'lista'. */
let VISTA_DE_MESAS = recordado('vista-de-mesas', 'plano');


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

    /* Plano o lista. El plano es el que sirve para decidir —muestra
       dónde queda cada mesa— y la lista para repasar nombre por nombre. */
    '<div class="filtros">' +
      '<button class="filtro' + (VISTA_DE_MESAS === 'plano' ? ' activo' : '') +
        '" data-vista-mesas="plano">Plano</button>' +
      '<button class="filtro' + (VISTA_DE_MESAS === 'lista' ? ' activo' : '') +
        '" data-vista-mesas="lista">Lista</button>' +
    '</div>' +

    bloqueSinSentar(MESAS.sin_sentar) +
    (VISTA_DE_MESAS === 'plano'
      ? bloqueDelPlano(MESAS.mesas)
      : bloqueDeLasMesas(MESAS.mesas));

  engancharMesas(cuerpo);

  buscarTodos('[data-vista-mesas]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      VISTA_DE_MESAS = boton.dataset.vistaMesas;
      recordar('vista-de-mesas', VISTA_DE_MESAS);
      pintarMesas(cuerpo);
    });
  });
}


/* ─── 1B. EL PLANO DEL SALÓN ───────────────────────────────────────── */

/*
   QUÉ ES Y POR QUÉ EXISTE

   El dibujo del salón como es de verdad: la mesa principal arriba, la
   pista, las catorce mesas en cuatro columnas, el bufet, los baños, la
   barra y la entrada. Sale de la planilla que ya usaba Lucila.

   POR QUÉ UNA LISTA NO ALCANZABA
   Acomodar gente es decidir QUIÉN QUEDA CERCA DE QUÉ: los abuelos lejos
   del parlante, los amigos pegados a la pista, la familia cerca de la
   mesa principal. Con una lista de nombres esa decisión se toma de
   memoria, imaginándose el salón. Acá se ve.

   Por eso `mesas.ubicacion` existía desde el principio y no servía para
   nada: se podía escribir "cerca de la pista" pero nunca se dibujaba.
*/

/**
 * Dibuja el plano completo.
 *
 * @param {Array} mesas
 * @returns {string} HTML
 */
function bloqueDelPlano(mesas) {
  const salon = CONFIGURACION.salon;

  /* Las que todavía no tienen lugar en el plano van aparte, abajo. Sin
     esto desaparecerían de la pantalla sin explicación. */
  const ubicadas  = mesas.filter(m => m.fila > 0 && m.columna > 0);
  const sinUbicar = mesas.filter(m => !(m.fila > 0 && m.columna > 0));

  if (!ubicadas.length) {
    return '' +
      '<div class="tarjeta">' +
        '<div class="tarjeta__titulo">El plano está vacío</div>' +
        '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
          'Ninguna mesa tiene todavía su lugar en el salón. Con el botón ' +
          'de abajo se crean las catorce del Salón Estrella, cada una en ' +
          'su sitio, tal como están en la planilla.' +
        '</p>' +
        '<button class="boton boton--principal boton--ancho" id="mesa-armar-salon">' +
          'Armar el salón de Alvi' +
        '</button>' +
      '</div>' +
      (sinUbicar.length ? bloqueDeLasMesas(sinUbicar) : '');
  }

  const celdas = salon.fijos.map(f =>
    '<div class="plano__fijo plano__fijo--' + seguro(f.tipo) + '" ' +
         'style="grid-row:' + f.fila + ';grid-column:' + f.desde +
         ' / span ' + f.ancho + '">' +
      '<span aria-hidden="true">' + f.icono + '</span> ' + seguro(f.nombre) +
    '</div>'
  ).concat(ubicadas.map(m => celdaDeMesaEnElPlano(m))).join('');

  return '' +
    '<div class="plano" style="grid-template-columns:repeat(' +
         salon.columnas + ',1fr)">' + celdas + '</div>' +

    '<p class="vacio__texto" style="text-align:center;margin-bottom:var(--esp-3)">' +
      'Tocá una mesa para ver quién se sienta ahí.' +
    '</p>' +

    (sinUbicar.length
      ? '<div class="tarjeta__titulo">Sin lugar en el plano</div>' +
        bloqueDeLasMesas(sinUbicar)
      : '');
}

/**
 * Una mesa dentro del plano.
 *
 * El color dice de un vistazo cómo está: vacía, con lugar, completa o
 * pasada. Es la información que uno busca al mirar el salón entero, y
 * leerla en números mesa por mesa sería mucho más lento.
 *
 * @param {Object} mesa
 * @returns {string} HTML
 */
function celdaDeMesaEnElPlano(mesa) {
  const libres = mesa.capacidad - mesa.ocupados;

  let como = 'vacia';
  if (mesa.ocupados > mesa.capacidad) como = 'pasada';
  else if (libres === 0)              como = 'completa';
  else if (mesa.ocupados > 0)         como = 'con-gente';

  /* El nombre se acorta porque en una grilla de cuatro columnas en un
     teléfono no entra "Mesa de los abuelos" entero. */
  const corto = mesa.nombre.replace(/^Mesa\s+/i, '');

  return '' +
    '<button class="plano__mesa plano__mesa--' + como + '" ' +
            'data-plano-mesa="' + seguro(mesa.id) + '" ' +
            'style="grid-row:' + mesa.fila + ';grid-column:' + mesa.columna + '" ' +
            'aria-label="' + seguro(mesa.nombre + ': ' + mesa.ocupados +
                                    ' de ' + mesa.capacidad) + '">' +
      '<span class="plano__nombre">' + seguro(corto) + '</span>' +
      '<span class="plano__cuenta">' +
        seguro(mesa.ocupados + '/' + mesa.capacidad) +
      '</span>' +
    '</button>';
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

  /* Estos tres pueden no estar según qué vista se esté mirando. */
  const nueva = buscar('#mesa-nueva', cuerpo);
  if (nueva) nueva.addEventListener('click', () => formularioEvento('mesas'));

  const armar = buscar('#mesa-armar-salon', cuerpo);
  if (armar) armar.addEventListener('click', () => armarElSalon(refrescar));

  // Tocar una mesa del plano abre quiénes se sientan ahí.
  buscarTodos('[data-plano-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      abrirLaMesa(Number(boton.dataset.planoMesa), refrescar));
  });

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

  /* Lo que se va a MOVER, no solo lo que va a entrar.
   *
   * Antes esta pantalla decía cuántos se sentaban y cuántos quedaban
   * afuera, y con eso no alcanzaba para animarse: lo que uno teme al
   * tocar "acomodar solo" no es que falte lugar, es que se desarme el
   * trabajo que ya venía haciendo a mano. */
  const movimientos = previa.movimientos || [];
  const mudanzas = movimientos.filter(m => m.que_pasa === 'se_muda');
  const levantados = movimientos.filter(m => m.que_pasa === 'se_levanta');

  const comoSeLee = m =>
    m.que_pasa === 'se_muda'    ? seguro(m.nombre + ': ' + m.de + ' → ' + m.a)
  : m.que_pasa === 'se_levanta' ? seguro(m.nombre + ': sale de ' + m.de)
  :                               seguro(m.nombre + ' → ' + m.a);

  const bloqueDeCambios =
    (mudanzas.length || levantados.length)
      ? '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
          '<div class="tarjeta__titulo">Lo que se mueve de lugar</div>' +
          mudanzas.concat(levantados).slice(0, 12).map(m =>
            '<p class="lista__pie" style="margin:2px 0">' + comoSeLee(m) + '</p>'
          ).join('') +
          (mudanzas.length + levantados.length > 12
            ? '<p class="vacio__texto">y ' +
              seguro(mudanzas.length + levantados.length - 12) + ' más</p>'
            : '') +
        '</div>'
      : '<p class="vacio__texto" style="color:var(--bien)">' +
        'No se mueve de mesa nadie que ya estuviera sentado.</p>';

  const cuerpo = abrirHoja('Acomodar solo',
    '<p style="margin-bottom:var(--esp-2)">' +
      'Se van a sentar <strong>' + seguro(Object.keys(previa.plan || {}).length) +
      '</strong> confirmaciones.' +
    '</p>' +

    bloqueDeCambios +

    (fijados
      ? '<p class="vacio__texto">' +
        seguro(fijados === 1
          ? 'La que fijaste con el candado no se va a tocar.'
          : 'Las ' + fijados + ' que fijaste con el candado no se van a tocar.') +
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

  buscar('#acomodo-cancelar', cuerpo).addEventListener('click', () => cerrarHoja(true));

  buscar('#acomodo-aplicar', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('mesas.php?accion=autoasignar', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/**
 * Crea las 14 mesas del salón con su lugar en el plano.
 *
 * @param {Function} refrescar
 * @returns {Promise<void>}
 */
async function armarElSalon(refrescar) {
  const salon = CONFIGURACION.salon;

  /* La prioridad sale de la fila: la primera está pegada a la pista y
     es la mejor, la última es el fondo. Es lo que hace que el acomodo
     automático les dé las buenas mesas a los grupos de orden más bajo. */
  const mesas = salon.mesas.map(m => ({
    nombre:    m.nombre,
    fila:      m.fila,
    columna:   m.columna,
    prioridad: salon.prioridadPorFila[m.fila] || 50,
  }));

  if (!confirmarAccion(
    'Se van a crear ' + mesas.length + ' mesas de ' + salon.capacidad +
    ' lugares, cada una en su sitio del plano.\n\n' +
    'Las que ya existan con ese nombre no se duplican: solo se les ' +
    'pone su lugar.\n\n¿Armar el salón?'
  )) return;

  try {
    const r = await mandar('mesas.php?accion=armar_salon',
                           { mesas: mesas, capacidad: salon.capacidad });
    avisar(r.mensaje);
    refrescar();
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Abre una mesa: quiénes se sientan, y qué se puede hacer con ella.
 *
 * @param {number} mesaId
 * @param {Function} refrescar
 * @returns {void}
 */
function abrirLaMesa(mesaId, refrescar) {
  const mesa = (MESAS.mesas || []).find(m => Number(m.id) === mesaId);
  if (!mesa) return;

  const libres = mesa.capacidad - mesa.ocupados;

  const gente = mesa.invitados.length
    ? mesa.invitados.map(inv =>
        '<button class="lista__fila" data-mover-de-mesa="' + seguro(inv.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' +
              (inv.fijada ? '<span style="color:var(--oro)">🔒</span> ' : '') +
              seguro(inv.nombre) +
            '</span>' +
            '<span class="lista__pie">' +
              seguro(pluralizar(inv.lugares, 'lugar', 'lugares') +
                     (inv.grupo ? ' · ' + inv.grupo : '')) +
            '</span>' +
          '</span>' +
        '</button>'
      ).join('')
    : '<p class="vacio__texto">Esta mesa está vacía.</p>';

  const cuerpo = abrirHoja(mesa.nombre,
    '<div class="detalle" style="margin-bottom:var(--esp-3)">' +
      '<span class="detalle__rotulo">Ocupación</span>' +
      '<span class="detalle__valor">' +
        seguro(mesa.ocupados + ' de ' + mesa.capacidad) +
        (mesa.ocupados > mesa.capacidad
          ? ' <span class="etiqueta etiqueta--alerta">Se pasa por ' +
            seguro(mesa.ocupados - mesa.capacidad) + '</span>'
          : libres === 0
            ? ' <span class="etiqueta etiqueta--bien">Completa</span>'
            : ' <span class="etiqueta etiqueta--tenue">' +
              seguro(pluralizar(libres, 'libre', 'libres')) + '</span>') +
      '</span>' +
      (mesa.ubicacion
        ? '<span class="detalle__rotulo">Dónde está</span>' +
          '<span class="detalle__valor">' + seguro(mesa.ubicacion) + '</span>'
        : '') +
    '</div>' +

    gente +

    '<button class="boton boton--ancho" id="mesa-editar" ' +
            'style="margin-top:var(--esp-3)">Cambiar nombre o capacidad</button>'
  );

  buscarTodos('[data-mover-de-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.moverDeMesa), refrescar));
  });

  buscar('#mesa-editar', cuerpo).addEventListener('click', () => {
    const cruda = (EVENTO && EVENTO.mesas || []).find(m => Number(m.id) === mesaId);
    if (cruda) formularioEvento('mesas', cruda);
    else avisar('Abrí la sección Mesas de Evento para editarla.', true);
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
        cerrarHoja(true);
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
        cerrarHoja(true);
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
        cerrarHoja(true);
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

      cerrarHoja(true);
      avisar('Guardado.');
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  buscarTodos('[data-quitar-pelea]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      /* Borrar una regla de "no sentar juntos" pedía confirmación en
         ningún lado, a diferencia de borrar un grupo diez líneas más
         abajo. Y es peor equivocarse acá: el motivo por el que dos
         personas no se pueden sentar juntas rara vez se vuelve a
         escribir, y el error recién se descubre en la fiesta. */
      if (!confirmarAccion('¿Quitar esta regla?\n\n' +
                           'Estas dos personas van a poder quedar en la ' +
                           'misma mesa.')) return;
      try {
        await mandar('mesas.php?accion=borrar_pelea', { id: boton.dataset.quitarPelea });
        cerrarHoja(true);
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
      'Si algo salió mal' +
    '</div>' +
    '<button class="boton boton--ancho" id="mesa-deshacer" ' +
            'style="margin-bottom:var(--esp-1)">' +
      'Volver al acomodo anterior' +
    '</button>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'Antes de cada acomodo automático se guarda cómo estaba. Esto ' +
      'devuelve todo a la última foto.</p>' +

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
      cerrarHoja(true);
      avisar('Grupo creado.');
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscarTodos('[data-borrar-grupo]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar este grupo? Sus invitados quedan sin grupo.')) return;
      try {
        await mandar('mesas.php?accion=borrar_grupo', { id: boton.dataset.borrarGrupo });
        cerrarHoja(true);
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

  buscar('#mesa-deshacer', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('mesas.php?accion=deshacer', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscar('#mesa-vaciar', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion('¿Sacar a todos de las mesas?\n\n' +
                         'Lo que fijaste con el candado queda como está.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscar('#mesa-vaciar-todo', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion('¿Vaciar TODO, incluso lo que fijaste a mano?\n\n' +
                         'Esto no se puede deshacer.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', { todo: true });
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });
}
