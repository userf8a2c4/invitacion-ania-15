/* ══════════════════════════════════════════════════════════════════════
   09 · VISTA DINERO

   QUÉ HACE ESTE ARCHIVO
   El presupuesto completo: totales, categorías con su techo, gastos,
   pagos, padrinos, proveedores y cotizaciones.

   LA DECISIÓN QUE ORDENA ESTA PANTALLA
   Arriba, siempre, las dos cifras que importan: lo que CUESTA la fiesta
   y lo que sale DE TU BOLSILLO. Son distintas porque los padrinos cubren
   parte, y confundirlas lleva a decisiones malas en las dos direcciones:
   creer que no alcanza cuando sí, o gastar de más creyendo que alguien
   más lo cubre cuando todavía no lo entregó.

   ÍNDICE
     1. Dibujar la vista
     2. Sub-pestañas
     3. Cada sección
     4. Formularios
   ══════════════════════════════════════════════════════════════════════ */


/** Todo lo que devolvió el servidor la última vez. */
let DINERO = null;

/** Qué sub-pestaña se está viendo. */
let SECCION_DINERO = 'resumen';


/* ─── 1. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide los datos del presupuesto y arma la pantalla.
 *
 * @returns {Promise<void>}
 */
async function dibujarDinero() {
  const vista = buscar('#vista-dinero');
  pintarCargando(vista, 5);

  try {
    DINERO = await traer('presupuesto.php?accion=todo');
  } catch (error) {
    pintarError(vista, error.message, () => dibujarDinero());
    throw error;
  }

  vista.innerHTML =
    bloqueTotales(DINERO.totales) +

    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<input type="search" id="buscar-dinero" class="buscador__control" ' +
             'placeholder="Buscar en todo el presupuesto" ' +
             'autocapitalize="off" spellcheck="false">' +
    '</div>' +

    '<div class="filtros" id="secciones-dinero">' +
      botonSeccion('resumen',      et('dinero.resumen', 'Resumen')) +
      botonSeccion('gastos',       et('dinero.gastos', 'Gastos'),
                   DINERO.gastos.length) +
      botonSeccion('pagos',        et('dinero.pagos', 'Pagos'),
                   DINERO.totales.por_pagar_cuantos) +
      botonSeccion('padrinos',     et('dinero.padrinos', 'Padrinos'),
                   DINERO.padrinos.length) +
      botonSeccion('proveedores',  et('dinero.proveedores', 'Proveedores'),
                   DINERO.proveedores.length) +
      botonSeccion('cotizaciones', et('dinero.cotizaciones', 'Cotizaciones'),
                   DINERO.cotizaciones.length) +
    '</div>' +
    '<div id="cuerpo-dinero"></div>';

  buscarTodos('[data-seccion]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_DINERO = boton.dataset.seccion;
      buscarTodos('[data-seccion]', vista).forEach(otro => {
        otro.classList.toggle('activo', otro === boton);
      });
      pintarSeccionDeDinero();
    });
  });

  // Cambiar de moneda redibuja todo: los montos se recalculan al pintar.
  buscarTodos('[data-moneda]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      elegirMoneda(boton.dataset.moneda);
      ensuciarVistas('resumen');
      dibujarDinero();
    });
  });

  buscar('#exportar-dinero', vista).addEventListener('click', abrirHojaDeDescarga);

  const buscador = buscar('#buscar-dinero', vista);
  buscador.value = BUSQUEDA_DINERO;
  buscador.addEventListener('input', () => {
    BUSQUEDA_DINERO = buscador.value;
    pintarSeccionDeDinero();
  });

  pintarSeccionDeDinero();
}


/* ─── BÚSQUEDA ─────────────────────────────────────────────────────── */

/** Lo escrito en el buscador del presupuesto. */
let BUSQUEDA_DINERO = '';

/**
 * Filtra una lista con lo que se escribió en el buscador.
 *
 * Se busca dentro de TODOS los campos de texto de cada fila, no solo el
 * nombre: así escribir "salón" encuentra el gasto, el proveedor y la
 * cotización, aunque la palabra esté en el servicio o en las notas.
 *
 * @param {Array} filas
 * @param {string[]} campos - Qué columnas mirar.
 * @returns {Array}
 */
function filtrarPorBusqueda(filas, campos) {
  const aguja = paraBuscar(BUSQUEDA_DINERO);
  if (!aguja) return filas;

  return filas.filter(fila =>
    paraBuscar(campos.map(c => fila[c] || '').join(' ')).includes(aguja)
  );
}

/**
 * El aviso de "nada coincide" cuando la búsqueda vació una sección.
 *
 * @param {Element} cuerpo
 * @returns {boolean} true si se pintó el vacío (o sea, no hay nada).
 */
function sinResultadosDeBusqueda(cuerpo) {
  if (!BUSQUEDA_DINERO.trim()) return false;

  cuerpo.innerHTML = '';
  pintarVacio(cuerpo, 'Nada coincide con "' + BUSQUEDA_DINERO + '"',
    'Prueba con otra palabra, o mira en otra sección.');
  return true;
}


/**
 * Ofrece descargar el presupuesto en los cuatro formatos.
 *
 * @returns {void}
 */
function abrirHojaDeDescarga() {
  abrirHojaDeFormatos('Descargar el presupuesto', exportarPresupuesto);
}

/**
 * El HTML de un botón de sub-pestaña.
 *
 * @param {string} clave
 * @param {string} texto
 * @param {number} [cuantos]
 * @returns {string}
 */
function botonSeccion(clave, texto, cuantos) {
  const activo = clave === SECCION_DINERO ? ' activo' : '';
  const numero = cuantos ? ' (' + cuantos + ')' : '';
  return '<button class="filtro' + activo + '" data-seccion="' + clave + '">' +
         seguro(texto + numero) + '</button>';
}

/**
 * Las dos cifras de arriba, más lo pendiente.
 *
 * @param {Object} t - Los totales.
 * @returns {string} HTML
 */
function bloqueTotales(t) {
  let avisos = '';

  /* El selector de moneda. Cambia SOLO cómo se ven los números: en la
     base de datos todo sigue guardado en pesos. Por eso, cuando está en
     dólares, se aclara con qué tipo de cambio y de cuándo — para que
     nadie confunda una conversión aproximada con una cotización de hoy. */
  const cual = monedaElegida();
  const selector =
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      Object.keys(CONFIGURACION.dinero.monedas).map(clave => {
        const m = CONFIGURACION.dinero.monedas[clave];
        return '<button class="filtro' + (clave === cual ? ' activo' : '') +
               '" data-moneda="' + clave + '">' + seguro(m.nombre) + '</button>';
      }).join('') +
    '</div>';

  if (cual !== CONFIGURACION.dinero.monedaBase) {
    avisos += '<p class="vacio__texto">Convertido a ' +
              seguro(CONFIGURACION.dinero.pesosPorDolar) + ' pesos por dólar ' +
              '(actualizado el ' +
              seguro(comoFecha(CONFIGURACION.dinero.tipoDeCambioActualizado)) +
              '). Los montos se guardan en pesos.</p>';
  }

  /* Si "Cuesta" da $0 pero hay algo planeado, no es que la fiesta
     salga gratis: es que todavía ningún gasto tiene cargado su monto
     REAL (el estimado y el real son campos distintos a propósito, ver
     presupuesto.php). Sin este aviso, un $0 con gastos cargados parece
     un error del panel. */
  if (t.costo === 0 && t.planeado > 0) {
    avisos += '<p class="vacio__texto">Todavía no cargaste el monto ' +
              '<strong>real</strong> de ningún gasto — solo el estimado. ' +
              'Lo planeado suma <strong>' + seguro(comoDinero(t.planeado, false)) +
              '</strong>.</p>';
  }

  if (t.por_pagar > 0) {
    avisos += '<p class="vacio__texto">Por pagar: <strong>' +
              seguro(comoDinero(t.por_pagar, false)) + '</strong> en ' +
              seguro(pluralizar(t.por_pagar_cuantos, 'pago', 'pagos')) + '.</p>';
  }

  if (t.padrinos_pendientes > 0) {
    avisos += '<p class="vacio__texto" style="color:var(--ojo)">' +
              seguro(comoDinero(t.padrinos_pendientes, false)) + ' de ' +
              seguro(pluralizar(t.padrinos_pendientes_cuantos, 'padrino', 'padrinos')) +
              ' sin entregar todavía.</p>';
  }

  return '' +
    selector +
    '<div class="tarjeta">' +
      '<div class="dinero-resumen">' +
        '<div class="dinero-resumen__mitad">' +
          '<div class="dinero-resumen__rotulo">Cuesta</div>' +
          '<div class="dinero-resumen__cifra">' +
            seguro(comoDinero(t.costo, false)) + '</div>' +
        '</div>' +
        '<div class="dinero-resumen__mitad">' +
          '<div class="dinero-resumen__rotulo">De tu bolsillo' +
            ayuda('dinero.dos-cifras') + '</div>' +
          '<div class="dinero-resumen__cifra dinero-resumen__cifra--propio">' +
            seguro(comoDinero(t.propio, false)) + '</div>' +
        '</div>' +
      '</div>' +
      avisos +
      '<button class="boton boton--chico boton--ancho" id="exportar-dinero" ' +
              'style="margin-top:var(--esp-2)">Descargar</button>' +
    '</div>';
}


/* ─── 2. SUB-PESTAÑAS ──────────────────────────────────────────────── */

/**
 * Pinta la sección elegida.
 *
 * @returns {void}
 */
function pintarSeccionDeDinero() {
  const cuerpo = buscar('#cuerpo-dinero');
  if (!cuerpo) return;

  const secciones = {
    resumen:      pintarCategorias,
    gastos:       pintarGastos,
    pagos:        pintarPagos,
    padrinos:     pintarPadrinos,
    proveedores:  pintarProveedores,
    cotizaciones: pintarCotizaciones,
  };

  (secciones[SECCION_DINERO] || pintarCategorias)(cuerpo);
}

/**
 * El botón de "agregar" que va al pie de cada sección.
 *
 * @param {string} texto
 * @returns {string} HTML
 */
function botonAgregar(texto) {
  return '<button class="boton boton--principal boton--ancho" id="agregar" ' +
         'style="margin-top:var(--esp-3)">' + seguro(texto) + '</button>';
}


/* ─── 3. CADA SECCIÓN ──────────────────────────────────────────────── */

/**
 * Categorías con su barra de gasto contra el techo.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarCategorias(cuerpo) {
  const categorias = filtrarPorBusqueda(DINERO.categorias, ['nombre']);
  if (!categorias.length && sinResultadosDeBusqueda(cuerpo)) return;

  const filas = categorias.map(categoria => {
    const techo   = Number(categoria.techo) || 0;
    const gastado = Number(categoria.gastado) || 0;

    // Sin techo no hay con qué comparar: se muestra solo lo gastado.
    const pct = techo > 0 ? porcentaje(gastado, techo) : 0;

    let clase = '';
    if (techo > 0 && gastado > techo) clase = ' barra__relleno--pasado';
    else if (techo > 0 && gastado / techo >= CONFIGURACION.dinero.avisarDesde) {
      clase = ' barra__relleno--cerca';
    }

    const derecha = techo > 0
      ? comoDinero(gastado, false) + ' / ' + comoDinero(techo, false)
      : comoDinero(gastado, false);

    return '' +
      '<button class="tarjeta" style="display:block;width:100%;text-align:left" ' +
              'data-categoria="' + seguro(categoria.id) + '">' +
        '<div style="display:flex;justify-content:space-between;gap:var(--esp-2)">' +
          '<span>' + seguro(categoria.nombre) + '</span>' +
          '<span class="cifra" style="color:var(--texto-suave);white-space:nowrap">' +
            seguro(derecha) + '</span>' +
        '</div>' +
        (techo > 0
          ? '<div class="barra" style="margin-top:var(--esp-1)">' +
              '<div class="barra__relleno' + clase + '" style="width:' +
                Math.min(pct, 100) + '%"></div>' +
            '</div>'
          : '<div class="vacio__texto" style="margin-top:4px">Sin techo definido' +
            ayuda('dinero.techo') + '</div>') +
      '</button>';
  }).join('');

  cuerpo.innerHTML = filas + botonAgregar('Nueva categoría');

  buscarTodos('[data-categoria]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const cat = DINERO.categorias.find(c => String(c.id) === boton.dataset.categoria);
      formularioCategoria(cat);
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCategoria());
}

/**
 * La lista de gastos.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarGastos(cuerpo) {
  const gastos = filtrarPorBusqueda(DINERO.gastos,
    ['concepto', 'categoria_nombre', 'proveedor_nombre', 'padrino_nombre', 'notas']);
  if (!gastos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!gastos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay gastos',
      'Carga el primero para empezar a ver el presupuesto.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo gasto'));
  } else {
    cuerpo.innerHTML = gastos.map(gasto => {
      const pie = [gasto.categoria_nombre, gasto.proveedor_nombre]
        .filter(Boolean).join(' · ');

      // La etiqueta del padrino cambia de color según si ya entregó:
      // verde entregado, ojo si todavía es una promesa.
      const padrino = gasto.padrino_nombre
        ? '<span class="etiqueta etiqueta--' +
            (gasto.padrino_estado === 'entregado' ? 'bien' : 'ojo') + '">' +
            seguro(gasto.padrino_nombre) + '</span>'
        : '';

      /* `monto_real` es lo que costó DE VERDAD, y se carga cuando ya se
         sabe con certeza (a veces al pagar). Hasta entonces vale $0, y
         mostrar eso a secas parecía un gasto sin plata cuando en
         realidad sí había un presupuestado cargado — solo que en el
         otro campo. Acá se avisa cuál de los dos se está mostrando. */
      const tieneReal = Number(gasto.monto_real) > 0;
      const cifra = tieneReal
        ? seguro(comoDinero(gasto.monto_real, false))
        : (Number(gasto.presupuestado) > 0
            ? seguro(comoDinero(gasto.presupuestado, false)) +
              ' <span style="font-size:11px;color:var(--texto-tenue)">estimado</span>'
            : seguro(comoDinero(0, false)));

      return '' +
        '<button class="lista__fila" data-gasto="' + seguro(gasto.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(gasto.concepto) + '</span>' +
            '<span class="lista__pie">' + seguro(pie) + '</span>' +
            (padrino ? '<span class="menus-mini">' + padrino + '</span>' : '') +
          '</span>' +
          '<span class="lista__lado cifra">' + cifra + '</span>' +
        '</button>';
    }).join('') + botonAgregar('Nuevo gasto');

    buscarTodos('[data-gasto]', cuerpo).forEach(boton => {
      boton.addEventListener('click', () => {
        formularioGasto(DINERO.gastos.find(g => String(g.id) === boton.dataset.gasto));
      });
    });
  }

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioGasto());
}

/**
 * La lista de pagos, pendientes primero.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarPagos(cuerpo) {
  const pagos = filtrarPorBusqueda(DINERO.pagos,
    ['concepto', 'gasto_concepto', 'metodo', 'notas']);
  if (!pagos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!pagos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay pagos',
      'Carga los anticipos y las fechas límite para que el panel te avise.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo pago'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
    return;
  }

  cuerpo.innerHTML = pagos.map(pago => {
    const pagado   = pago.estado === 'pagado';
    const atrasado = !pagado && pago.fecha_limite && diasHasta(pago.fecha_limite) < 0;

    const etiqueta = pagado
      ? '<span class="etiqueta etiqueta--bien">Pagado</span>'
      : atrasado
        ? '<span class="etiqueta etiqueta--alerta">Atrasado</span>'
        : '<span class="etiqueta etiqueta--tenue">Pendiente</span>';

    const cuando = pago.fecha_limite
      ? (pagado ? comoFecha(pago.fecha_pagado) : 'vence ' + comoCuando(pago.fecha_limite))
      : '';

    return '' +
      '<div class="lista__fila">' +
        // La casilla marca como pagado de un toque, sin abrir nada.
        '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--oro)" ' +
               (pagado ? 'checked ' : '') +
               'data-pagar="' + seguro(pago.id) + '" aria-label="Marcar como pagado">' +
        '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                'data-pago="' + seguro(pago.id) + '">' +
          '<span class="lista__titulo">' +
            seguro(pago.concepto || pago.gasto_concepto || 'Pago') + '</span>' +
          '<span class="lista__pie">' + seguro(cuando) + '</span>' +
        '</button>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(comoDinero(pago.monto, false)) + '</span>' +
          '<br>' + etiqueta +
        '</span>' +
      '</div>';
  }).join('') + botonAgregar('Nuevo pago');

  buscarTodos('[data-pagar]', cuerpo).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      try {
        await mandar('presupuesto.php?accion=marcar_pagado', { id: casilla.dataset.pagar });
        ensuciarVistas('resumen');
        dibujarDinero();
      } catch (error) {
        casilla.checked = !casilla.checked;   // deshacer si falló
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-pago]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioPago(DINERO.pagos.find(p => String(p.id) === boton.dataset.pago));
    });
  });

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
}

/**
 * La lista de padrinos.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarPadrinos(cuerpo) {
  const padrinos = filtrarPorBusqueda(DINERO.padrinos,
    ['nombre', 'apadrina', 'telefono', 'correo', 'notas']);
  if (!padrinos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!padrinos.length) {
    cuerpo.innerHTML = '';
    /* El "?" va acá, en el vacío, que es justo cuando alguien se
       pregunta qué se supone que va en esta sección. */
    cuerpo.insertAdjacentHTML('beforeend',
      '<div class="tarjeta__titulo">Padrinos' + ayuda('dinero.padrinos') + '</div>');
    pintarVacio(cuerpo, 'Todavía no hay padrinos',
      'Anota quién apadrina qué para saber cuánto sale de tu bolsillo de verdad.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo padrino'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
    return;
  }

  const estados = {
    hablado:    ['tenue',  'Hablado'],
    confirmado: ['ojo',    'Confirmado'],
    entregado:  ['bien',   'Entregado'],
  };

  cuerpo.innerHTML = padrinos.map(padrino => {
    const estado = estados[padrino.estado] || estados.hablado;

    const monto = padrino.tipo_aporte === 'especie'
      ? 'En especie'
      : comoDinero(padrino.monto, false);

    return '' +
      '<button class="lista__fila" data-padrino="' + seguro(padrino.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(padrino.nombre) + '</span>' +
          '<span class="lista__pie">' +
            seguro(padrino.apadrina || 'Sin asignar') + '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(monto) + '</span><br>' +
          '<span class="etiqueta etiqueta--' + estado[0] + '">' + estado[1] + '</span>' +
        '</span>' +
      '</button>';
  }).join('') + botonAgregar('Nuevo padrino');

  buscarTodos('[data-padrino]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioPadrino(DINERO.padrinos.find(p => String(p.id) === boton.dataset.padrino));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
}

/**
 * La lista de proveedores.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarProveedores(cuerpo) {
  const proveedores = filtrarPorBusqueda(DINERO.proveedores,
    ['nombre', 'servicio', 'contacto', 'telefono', 'correo', 'notas']);
  if (!proveedores.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!proveedores.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay proveedores',
      'El salón, el DJ, el fotógrafo, el banquete…');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo proveedor'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioProveedor());
    return;
  }

  const estados = {
    candidato:  ['tenue',  'Candidato'],
    contratado: ['info',   'Contratado'],
    pagado:     ['bien',   'Pagado'],
    cancelado:  ['alerta', 'Cancelado'],
  };

  cuerpo.innerHTML = proveedores.map(prov => {
    const estado = estados[prov.estado] || estados.candidato;
    const falta  = (Number(prov.monto_total) || 0) - (Number(prov.anticipo) || 0);

    return '' +
      '<button class="lista__fila" data-proveedor="' + seguro(prov.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(prov.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(prov.servicio || '') +
            (falta > 0 ? ' · falta ' + seguro(comoDinero(falta, false)) : '') +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(comoDinero(prov.monto_total, false)) + '</span>' +
          '<br><span class="etiqueta etiqueta--' + estado[0] + '">' + estado[1] + '</span>' +
        '</span>' +
      '</button>';
  }).join('') + botonAgregar('Nuevo proveedor');

  buscarTodos('[data-proveedor]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioProveedor(
        DINERO.proveedores.find(p => String(p.id) === boton.dataset.proveedor));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioProveedor());
}

/**
 * Las cotizaciones, agrupadas por servicio para poder compararlas.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarCotizaciones(cuerpo) {
  const cotizaciones = filtrarPorBusqueda(DINERO.cotizaciones,
    ['servicio', 'proveedor', 'que_incluye', 'notas']);
  if (!cotizaciones.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!cotizaciones.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay cotizaciones',
      'Carga las que vayas pidiendo para compararlas lado a lado antes de contratar.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nueva cotización'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
    return;
  }

  /* Se agrupan por servicio porque el sentido de una cotización es
     compararla con las otras del MISMO servicio. Una lista plana
     mezclaría el DJ con el pastel y no serviría para decidir nada. */
  const porServicio = {};
  cotizaciones.forEach(cot => {
    const clave = cot.servicio || 'Sin servicio';
    if (!porServicio[clave]) porServicio[clave] = [];
    porServicio[clave].push(cot);
  });

  cuerpo.innerHTML = Object.keys(porServicio).sort().map(servicio => {
    const grupo = porServicio[servicio];

    // La más barata del grupo se marca, que es la información que uno
    // busca de un vistazo al comparar presupuestos. Se compara con el
    // mismo número que se muestra: precio por persona contra precio por
    // persona, precio cerrado contra precio cerrado.
    const menor = Math.min(...grupo.map(c =>
      (c.tipo_precio === 'por_persona' ? Number(c.precio_pp) : Number(c.monto)) || Infinity
    ));

    const filas = grupo.map(cot => {
      const monto = Number(cot.monto) || 0;

      /* Las que cobran "por persona" casi nunca tienen nada cargado en
         `monto` —ese campo es para precio CERRADO— y su plata de verdad
         vive en `precio_pp`. Mostrar el `monto` a secas ahí daba un "$0"
         que confundía: la cotización sí tenía un precio, solo que no en
         ese campo. */
      const esPorPersona = cot.tipo_precio === 'por_persona';
      const precioPp = Number(cot.precio_pp) || 0;

      const cifra = (esPorPersona && precioPp > 0)
        ? seguro(comoDinero(precioPp, false)) + ' <span style="font-size:11px;' +
          'color:var(--texto-tenue)">/ persona</span>'
        : seguro(comoDinero(monto, false));

      /* Y "la más barata" se compara con el mismo criterio que se
         muestra, no siempre contra `monto`: comparar el precio cerrado
         de una contra el por-persona de otra no dice nada. */
      const comparable = esPorPersona ? precioPp : monto;

      const marcas = [];
      if (Number(cot.elegida) === 1) {
        marcas.push('<span class="etiqueta etiqueta--bien">Elegida</span>');
      } else if (comparable > 0 && comparable === menor && grupo.length > 1) {
        marcas.push('<span class="etiqueta etiqueta--info">Más barata</span>');
      }
      if (cot.vigencia && diasHasta(cot.vigencia) < 0) {
        marcas.push('<span class="etiqueta etiqueta--alerta">Vencida</span>');
      }

      return '' +
        '<button class="lista__fila" data-cotizacion="' + seguro(cot.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(cot.proveedor) + '</span>' +
            '<span class="lista__pie">' +
              seguro(acortar(cot.que_incluye || '', 60)) + '</span>' +
            (marcas.length ? '<span class="menus-mini">' + marcas.join('') + '</span>' : '') +
          '</span>' +
          '<span class="lista__lado cifra">' + cifra + '</span>' +
        '</button>';
    }).join('');

    return '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
             seguro(servicio) + '</div>' + filas;
  }).join('') + botonAgregar('Nueva cotización');

  /* El botón de comparar va ARRIBA de la lista, no al final: comparar
     es para lo que se cargan las cotizaciones, y dejarlo abajo de veinte
     renglones lo esconde justo de quien más lo necesita. */
  cuerpo.insertAdjacentHTML('afterbegin',
    '<button class="boton boton--principal boton--ancho" id="cot-comparar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      'Comparar lado a lado' +
    '</button>');

  buscar('#cot-comparar', cuerpo).addEventListener('click', abrirComparador);

  buscarTodos('[data-cotizacion]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      formularioCotizacion(
        DINERO.cotizaciones.find(c => String(c.id) === boton.dataset.cotizacion));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
}


/* ─── 4. FORMULARIOS ───────────────────────────────────────────────── */

/**
 * Guarda y refresca. Lo usan los seis formularios.
 *
 * @param {string} accion - 'guardar_gasto', 'borrar_pago'…
 * @param {Object} carga
 * @param {string} mensaje
 * @returns {Promise<void>}
 */
async function guardarDinero(accion, carga, mensaje) {
  try {
    await mandar('presupuesto.php?accion=' + accion, carga);
    cerrarHoja(true);
    avisar(mensaje);
    // El Resumen muestra totales de dinero: hay que refrescarlo también.
    ensuciarVistas('resumen');
    dibujarDinero();
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Engancha los botones Guardar y Borrar de un formulario.
 *
 * @param {Element} cuerpo
 * @param {Function} armarCarga - Devuelve el objeto a mandar, o null si
 *                                falta algo (ya avisó por su cuenta).
 * @param {string} nombreAccion - 'gasto', 'pago'…
 * @param {Object} [existente]
 * @returns {void}
 */
function engancharFormularioDinero(cuerpo, armarCarga, nombreAccion, existente) {

  /* TODAS las secciones del presupuesto llevan adjuntos: el contrato del
     proveedor, la foto del comprobante de un pago, la cotización en PDF,
     el recibo del padrino. */
  const rotulos = {
    gasto:       'Facturas y comprobantes',
    pago:        'Comprobante del pago',
    proveedor:   'Contrato y documentos',
    padrino:     'Comprobante de lo entregado',
    cotizacion:  'La cotización en PDF o foto',
    categoria:   'Documentos',
  };

  montarAdjuntos({
    cuerpo:  cuerpo,
    tipo:    nombreAccion,
    titulo:  rotulos[nombreAccion] || 'Archivos',
    id:      existente ? existente.id : 0,
    // Al crear algo nuevo todavía no hay id al que atar el archivo, así
    // que primero se guarda el registro y recién después se adjunta.
    guardarPrimero: async () => {
      const carga = armarCarga();
      if (!carga) return 0;

      const r = await mandar('presupuesto.php?accion=guardar_' + nombreAccion, carga);

      /* Sin señal el guardado queda en la cola y todavía NO tiene id: lo
         va a poner el servidor cuando el cambio salga de verdad. Antes
         acá se devolvía undefined y el archivo terminaba atado al id 0,
         o sea colgado de nada.

         Se devuelve 0 para que montarAdjuntos() sepa que no hay dónde
         atarlo y lo diga, en vez de subirlo a un registro inexistente. */
      if (r && r._offline) {
        avisar('Se guardó sin señal. Puedes adjuntar el archivo cuando ' +
               'vuelva la conexión.', true);
        return 0;
      }

      ensuciarVistas('resumen');
      return r.id;
    },
  });

  buscar('#pie-guardar', cuerpo).addEventListener('click', () => {
    const carga = armarCarga();
    if (!carga) return;
    if (existente) carga.id = existente.id;
    guardarDinero('guardar_' + nombreAccion, carga, 'Guardado.');
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar && existente) {
    borrar.addEventListener('click', () => {
      if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
      guardarDinero('borrar_' + nombreAccion, { id: existente.id }, 'Eliminado.');
    });
  }
}

/**
 * Devuelve las opciones de una lista desplegable a partir de una tabla.
 *
 * @param {Array} filas
 * @param {string} vacio - Texto de la opción "ninguno".
 * @returns {Array<{valor:string,texto:string}>}
 */
function opcionesDe(filas, vacio) {
  return [{ valor: '', texto: vacio }].concat(
    filas.map(f => ({ valor: String(f.id), texto: f.nombre }))
  );
}


/* ─── LISTAS A LAS QUE SE LES PUEDEN AGREGAR OPCIONES ──────────────── */

/**
 * Devuelve los métodos de pago: los de fábrica más los agregados.
 *
 * Los que agrega la persona se guardan en el teléfono. No van a la base
 * de datos a propósito: son una comodidad para escribir más rápido, no
 * un dato del evento, y no vale la pena una tabla para eso.
 *
 * @returns {string[]}
 */
function metodosDePago() {
  const propios = recordado('metodos-pago', []);
  return CONFIGURACION.metodosDePago.concat(
    propios.filter(m => !CONFIGURACION.metodosDePago.includes(m))
  );
}

/**
 * Agrega un método de pago nuevo a la lista guardada.
 *
 * @param {string} nombre
 * @returns {void}
 */
function agregarMetodoDePago(nombre) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return;

  const propios = recordado('metodos-pago', []);
  if (!propios.includes(limpio) && !CONFIGURACION.metodosDePago.includes(limpio)) {
    propios.push(limpio);
    recordar('metodos-pago', propios);
  }
}

/**
 * Arma una lista desplegable que permite agregar opciones nuevas.
 *
 * Al elegir "➕ Agregar otro…" aparece un campo de texto debajo. Se
 * resuelve así y no con una ventana emergente porque prompt() está
 * bloqueado en varias PWA instaladas y quedaría sin funcionar justo en
 * el modo en que se va a usar la app.
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {Array<{valor:string,texto:string}>} opciones.opciones
 * @param {string} [opciones.valor]
 * @param {string} [opciones.textoAgregar]
 * @returns {string} HTML
 */
function campoListaAmpliable(opciones) {
  const conAgregar = opciones.opciones.concat([
    { valor: '__nuevo__', texto: opciones.textoAgregar || 'Agregar otro…' },
  ]);

  return campoLista({
    id: opciones.id,
    rotulo: opciones.rotulo,
    valor: opciones.valor,
    opciones: conAgregar,
  }) +
  '<div id="' + seguro(opciones.id) + '-nuevo-caja" class="oculto" ' +
       'style="margin-top:calc(var(--esp-3) * -1);margin-bottom:var(--esp-3)">' +
    '<input type="text" id="' + seguro(opciones.id) + '-nuevo" ' +
           'class="campo__control" placeholder="Escribe el nombre nuevo">' +
  '</div>';
}

/**
 * Engancha una lista ampliable para que muestre el campo al elegir
 * "agregar otro".
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharListaAmpliable(id, cuerpo) {
  const lista = buscar('#' + id, cuerpo);
  const caja  = buscar('#' + id + '-nuevo-caja', cuerpo);
  if (!lista || !caja) return;

  lista.addEventListener('change', () => {
    const agregando = lista.value === '__nuevo__';
    caja.classList.toggle('oculto', !agregando);
    if (agregando) buscar('#' + id + '-nuevo', cuerpo).focus();
  });
}

/**
 * Lee el valor de una lista ampliable, sea de la lista o el escrito.
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {string}
 */
function valorDeListaAmpliable(id, cuerpo) {
  const elegido = valorDe(id, cuerpo);
  if (elegido !== '__nuevo__') return elegido;
  return valorDe(id + '-nuevo', cuerpo);
}


function formularioCategoria(categoria) {
  const d = categoria || {};
  const cuerpo = abrirHoja(categoria ? 'Editar categoría' : 'Nueva categoría',
    campoTexto({ id: 'cat-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'cat-techo', rotulo: 'Techo de presupuesto', tipo: 'number',
                 paso: '0.01', valor: d.techo ? desdePesos(d.techo) : '',
                 ayuda: 'Dejalo en 0 si no quieres poner límite.' }) +
    pieDeFormulario('Guardar', !!categoria)
  );

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('cat-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return { nombre: nombre, techo: aPesos(valorDe('cat-techo', cuerpo)) };
  }, 'categoria', categoria);
}


function formularioGasto(gasto) {
  const d = gasto || {};
  const cuerpo = abrirHoja(gasto ? 'Editar gasto' : 'Nuevo gasto',
    campoTexto({ id: 'gas-concepto', rotulo: 'Concepto', valor: d.concepto }) +

    campoLista({ id: 'gas-categoria', rotulo: 'Categoría',
                 valor: d.categoria_id || '',
                 opciones: opcionesDe(DINERO.categorias, 'Sin categoría') }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'gas-planeado', rotulo: 'Presupuestado', tipo: 'number',
                   paso: '0.01', valor: d.presupuestado ? desdePesos(d.presupuestado) : '' }) +
      campoTexto({ id: 'gas-real', rotulo: 'Costo real', tipo: 'number',
                   paso: '0.01', valor: d.monto_real ? desdePesos(d.monto_real) : '' }) +
    '</div>' +

    campoLista({ id: 'gas-proveedor', rotulo: 'Proveedor',
                 valor: d.proveedor_id || '',
                 opciones: opcionesDe(DINERO.proveedores, 'Sin proveedor') }) +

    campoLista({ id: 'gas-padrino', rotulo: 'Lo cubre un padrino',
                 valor: d.padrino_id || '',
                 opciones: opcionesDe(DINERO.padrinos, 'No, sale de tu bolsillo') }) +

    campoLargo({ id: 'gas-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!gasto)
  );

  engancharFormularioDinero(cuerpo, () => {
    const concepto = valorDe('gas-concepto', cuerpo);
    if (!concepto) { avisar('Falta el concepto.', true); return null; }
    return {
      concepto:      concepto,
      categoria_id:  valorDe('gas-categoria', cuerpo),
      proveedor_id:  valorDe('gas-proveedor', cuerpo),
      padrino_id:    valorDe('gas-padrino', cuerpo),
      presupuestado: aPesos(valorDe('gas-planeado', cuerpo)),
      monto_real:    aPesos(valorDe('gas-real', cuerpo)),
      notas:         valorDe('gas-notas', cuerpo),
    };
  }, 'gasto', gasto);
}


function formularioPago(pago) {
  const d = pago || {};
  const moneda = CONFIGURACION.dinero.monedas[monedaElegida()];

  /* Si el método guardado no está en la lista (porque se agregó en otro
     teléfono), se suma para que no se pierda al editar. */
  const metodos = metodosDePago().slice();
  if (d.metodo && !metodos.includes(d.metodo)) metodos.unshift(d.metodo);

  const cuerpo = abrirHoja(pago ? 'Editar pago' : 'Nuevo pago',
    campoTexto({ id: 'pag-concepto', rotulo: 'Concepto', valor: d.concepto }) +

    campoListaAmpliable({
      id: 'pag-gasto',
      rotulo: 'Es parte del gasto',
      valor: d.gasto_id ? String(d.gasto_id) : '',
      textoAgregar: 'Crear un gasto nuevo…',
      opciones: [{ valor: '', texto: 'Suelto (no pertenece a ningún gasto)' }]
        .concat(DINERO.gastos.map(g => ({ valor: String(g.id), texto: g.concepto }))),
    }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'pag-monto', rotulo: 'Monto en ' + moneda.nombre.toLowerCase(),
                   tipo: 'number', paso: '0.01',
                   valor: d.monto ? desdePesos(d.monto) : '' }) +
      campoTexto({ id: 'pag-fecha', rotulo: 'Vence el', tipo: 'date',
                   valor: d.fecha_limite || '' }) +
    '</div>' +

    campoListaAmpliable({
      id: 'pag-metodo',
      rotulo: 'Método de pago',
      valor: d.metodo || '',
      textoAgregar: 'Agregar otro método…',
      opciones: [{ valor: '', texto: 'Sin especificar' }]
        .concat(metodos.map(m => ({ valor: m, texto: m }))),
    }) +

    campoCasilla({ id: 'pag-pagado', rotulo: 'Ya está pagado',
                   marcado: d.estado === 'pagado' }) +
    campoLargo({ id: 'pag-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!pago)
  );

  engancharListaAmpliable('pag-metodo', cuerpo);
  engancharListaAmpliable('pag-gasto', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const concepto = valorDe('pag-concepto', cuerpo);
    const metodo   = valorDeListaAmpliable('pag-metodo', cuerpo);

    /* El gasto es distinto de los demás: si se eligió "crear uno nuevo",
       lo que se escribió es el NOMBRE de un gasto que todavía no existe.
       Se avisa y se manda como concepto del pago, en vez de guardar un
       id inventado que rompería la llave foránea. */
    const gastoElegido = valorDe('pag-gasto', cuerpo);
    let gastoId = gastoElegido;
    let conceptoFinal = concepto;

    if (gastoElegido === '__nuevo__') {
      const nombreNuevo = valorDe('pag-gasto-nuevo', cuerpo);
      if (!nombreNuevo) {
        avisar('Escribe el nombre del gasto nuevo.', true);
        return null;
      }
      gastoId = '';
      if (!conceptoFinal) conceptoFinal = nombreNuevo;
      avisar('El pago queda suelto. Crea el gasto desde la pestaña Gastos ' +
             'si quieres vincularlo.');
    }

    if (!conceptoFinal && !gastoId) {
      avisar('Pon un concepto o elige a qué gasto pertenece.', true);
      return null;
    }

    // Se guarda el método nuevo para que aparezca la próxima vez.
    agregarMetodoDePago(metodo);

    return {
      concepto:     conceptoFinal,
      gasto_id:     gastoId,
      // El campo está en la moneda que se está mirando; la base guarda pesos.
      monto:        aPesos(valorDe('pag-monto', cuerpo)),
      fecha_limite: valorDe('pag-fecha', cuerpo),
      metodo:       metodo,
      estado:       valorDe('pag-pagado', cuerpo) ? 'pagado' : 'pendiente',
      notas:        valorDe('pag-notas', cuerpo),
    };
  }, 'pago', pago);
}


function formularioPadrino(padrino) {
  const d = padrino || {};
  const cuerpo = abrirHoja(padrino ? 'Editar padrino' : 'Nuevo padrino',
    campoTexto({ id: 'pad-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'pad-apadrina', rotulo: 'Qué apadrina', valor: d.apadrina,
                 pista: 'Vals, pastel, ramo, música…' }) +

    campoLista({ id: 'pad-tipo', rotulo: 'Cómo aporta',
                 valor: d.tipo_aporte || 'dinero',
                 opciones: [
                   { valor: 'dinero',  texto: 'Dinero' },
                   { valor: 'especie', texto: 'En especie (pone la cosa)' },
                 ] }) +

    campoTexto({ id: 'pad-monto', rotulo: 'Monto', tipo: 'number',
                 paso: '0.01', valor: d.monto ? desdePesos(d.monto) : '',
                 ayuda: 'Si aporta en especie, pon el valor aproximado o dejalo en 0.' }) +

    campoLista({ id: 'pad-estado', rotulo: 'En qué va',
                 valor: d.estado || 'hablado',
                 opciones: [
                   { valor: 'hablado',    texto: 'Hablado (dijo que sí)' },
                   { valor: 'confirmado', texto: 'Confirmado en firme' },
                   { valor: 'entregado',  texto: 'Ya entregó' },
                 ] }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'pad-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono }) +
      campoTexto({ id: 'pad-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +
    '</div>' +

    campoLargo({ id: 'pad-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!padrino)
  );

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('pad-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return {
      nombre:      nombre,
      apadrina:    valorDe('pad-apadrina', cuerpo),
      tipo_aporte: valorDe('pad-tipo', cuerpo),
      monto:       aPesos(valorDe('pad-monto', cuerpo)),
      estado:      valorDe('pad-estado', cuerpo),
      telefono:    valorDe('pad-telefono', cuerpo),
      correo:      valorDe('pad-correo', cuerpo),
      notas:       valorDe('pad-notas', cuerpo),
    };
  }, 'padrino', padrino);
}


function formularioProveedor(proveedor) {
  const d = proveedor || {};
  const cuerpo = abrirHoja(proveedor ? 'Editar proveedor' : 'Nuevo proveedor',
    campoTexto({ id: 'pro-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'pro-servicio', rotulo: 'Servicio', valor: d.servicio,
                 pista: 'Salón, DJ, fotografía…' }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'pro-total', rotulo: 'Monto total', tipo: 'number',
                   paso: '0.01', valor: d.monto_total ? desdePesos(d.monto_total) : '' }) +
      campoTexto({ id: 'pro-anticipo', rotulo: 'Anticipo pagado', tipo: 'number',
                   paso: '0.01', valor: d.anticipo ? desdePesos(d.anticipo) : '' }) +
    '</div>' +

    campoLista({ id: 'pro-estado', rotulo: 'Estado',
                 valor: d.estado || 'candidato',
                 opciones: [
                   { valor: 'candidato',  texto: 'Candidato' },
                   { valor: 'contratado', texto: 'Contratado' },
                   { valor: 'pagado',     texto: 'Pagado por completo' },
                   { valor: 'cancelado',  texto: 'Cancelado' },
                 ] }) +

    campoTexto({ id: 'pro-contacto', rotulo: 'Persona de contacto', valor: d.contacto }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'pro-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono,
                   ayuda: 'Con clave de país para poder abrirle WhatsApp: 52 722 123 4567' }) +
      campoTexto({ id: 'pro-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +
    '</div>' +

    /* Qué se le manda por WhatsApp de un toque. Los textos los arma
       compartir.php; acá solo se elige cuál le toca a este proveedor. */
    campoLista({ id: 'pro-paquete', rotulo: '¿Qué le mando a este?',
                 valor: d.paquete || '',
                 opciones: [
                   { valor: '',          texto: 'Nada automático' },
                   { valor: 'banquete',  texto: 'Menús y alergias' },
                   { valor: 'salon',     texto: 'Mesas y acomodo' },
                   { valor: 'fotografo', texto: 'Lista de tomas y cronograma' },
                   { valor: 'dj',        texto: 'Canciones y las prohibidas' },
                   { valor: 'iglesia',   texto: 'Datos de la misa y papeles' },
                   { valor: 'modista',   texto: 'Pruebas de vestido' },
                 ] }) +

    campoLargo({ id: 'pro-notas', rotulo: 'Notas', valor: d.notas }) +
    (proveedor ? botonesDeContacto(proveedor) : '') +
    pieDeFormulario('Guardar', !!proveedor)
  );

  if (proveedor) engancharBotonesDeContacto(cuerpo, proveedor);

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('pro-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return {
      nombre:      nombre,
      servicio:    valorDe('pro-servicio', cuerpo),
      monto_total: aPesos(valorDe('pro-total', cuerpo)),
      anticipo:    aPesos(valorDe('pro-anticipo', cuerpo)),
      estado:      valorDe('pro-estado', cuerpo),
      contacto:    valorDe('pro-contacto', cuerpo),
      telefono:    valorDe('pro-telefono', cuerpo),
      correo:      valorDe('pro-correo', cuerpo),
      paquete:     valorDe('pro-paquete', cuerpo),
      notas:       valorDe('pro-notas', cuerpo),
    };
  }, 'proveedor', proveedor);
}

/**
 * Los botones de llamar, escribir y mandarle lo suyo.
 *
 * Antes había que salir de Presupuesto e irse a la Agenda de contactos
 * solo para conseguir un teléfono que ya estaba en esta misma pantalla.
 *
 * @param {Object} p - El proveedor.
 * @returns {string} HTML
 */
function botonesDeContacto(p) {
  const numero = paraWhatsApp(p.telefono);
  const acciones = [];

  if (p.telefono) {
    acciones.push('<a class="boton" style="flex:1" href="tel:' +
                  seguro(p.telefono) + '">Llamar</a>');
  }

  if (numero) {
    acciones.push('<a class="boton" style="flex:1" target="_blank" rel="noopener" ' +
                  'href="https://wa.me/' + seguro(numero) + '">WhatsApp</a>');
  }

  if (p.correo) {
    acciones.push('<a class="boton" style="flex:1" href="mailto:' +
                  seguro(p.correo) + '">Correo</a>');
  }

  /* Un teléfono cargado que no sirve para WhatsApp se avisa acá y no
     cuando el chat abre vacío. */
  const problema = (p.telefono && !numero)
    ? '<p class="aviso-error" style="margin-top:var(--esp-1)">' +
      'Ese teléfono no sirve para WhatsApp: le falta la clave de país.</p>'
    : '';

  const mandarle = p.paquete
    ? '<button class="boton boton--ancho" id="pro-mandarle" ' +
              'style="margin-top:var(--esp-1)">Mandarle lo suyo por WhatsApp</button>'
    : '';

  if (!acciones.length && !mandarle) return problema;

  return '' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      acciones.join('') +
    '</div>' +
    mandarle +
    problema;
}

/**
 * Engancha el botón de "mandarle lo suyo".
 *
 * @param {Element} cuerpo
 * @param {Object} p
 * @returns {void}
 */
function engancharBotonesDeContacto(cuerpo, p) {
  const boton = buscar('#pro-mandarle', cuerpo);
  if (!boton) return;

  boton.addEventListener('click', () => {
    // armarParaCompartir abre su propia hoja encima de esta.
    armarParaCompartir(p.paquete, { id: p.id, nombre: p.nombre });
  });
}


function formularioCotizacion(cotizacion) {
  const d = cotizacion || {};
  const cuerpo = abrirHoja(cotizacion ? 'Editar cotización' : 'Nueva cotización',
    campoTexto({ id: 'cot-servicio', rotulo: 'Servicio', valor: d.servicio,
                 ayuda: 'Escribe el mismo nombre en todas las del mismo rubro ' +
                        'para poder compararlas juntas.' }) +
    campoTexto({ id: 'cot-proveedor', rotulo: 'Quién cotiza', valor: d.proveedor }) +

    /* Casi todos los salones cobran POR PERSONA. Sin esta distinción no
       se puede comparar nada: $550 por persona y $60,000 cerrados son
       números que no se pueden mirar uno al lado del otro. */
    campoLista({ id: 'cot-tipo', rotulo: 'Cómo cobra',
                 valor: d.tipo_precio || 'fijo',
                 opciones: [
                   { valor: 'fijo',        texto: 'Un precio cerrado' },
                   { valor: 'por_persona', texto: 'Por persona' },
                 ] }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'cot-monto', rotulo: 'Precio cerrado', tipo: 'number',
                   paso: '0.01', valor: d.monto ? desdePesos(d.monto) : '' }) +
      campoTexto({ id: 'cot-pp', rotulo: 'Precio por persona', tipo: 'number',
                   paso: '0.01', valor: d.precio_pp ? desdePesos(d.precio_pp) : '' }) +
    '</div>' +

    campoTexto({ id: 'cot-vigencia', rotulo: 'Vale hasta', tipo: 'date',
                 valor: d.vigencia || '' }) +

    campoTexto({ id: 'cot-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono }) +
    campoLargo({ id: 'cot-incluye', rotulo: 'Qué incluye', valor: d.que_incluye }) +
    campoCasilla({ id: 'cot-elegida', rotulo: 'Es la que elegimos',
                   marcado: Number(d.elegida) === 1 }) +
    pieDeFormulario('Guardar', !!cotizacion)
  );

  engancharFormularioDinero(cuerpo, () => {
    const servicio  = valorDe('cot-servicio', cuerpo);
    const proveedor = valorDe('cot-proveedor', cuerpo);
    if (!servicio || !proveedor) {
      avisar('Falta el servicio o quién cotiza.', true);
      return null;
    }
    return {
      servicio:    servicio,
      proveedor:   proveedor,
      tipo_precio: valorDe('cot-tipo', cuerpo),
      monto:       aPesos(valorDe('cot-monto', cuerpo)),
      precio_pp:   aPesos(valorDe('cot-pp', cuerpo)),
      vigencia:    valorDe('cot-vigencia', cuerpo),
      telefono:    valorDe('cot-telefono', cuerpo),
      que_incluye: valorDe('cot-incluye', cuerpo),
      elegida:     !!valorDe('cot-elegida', cuerpo),
    };
  }, 'cotizacion', cotizacion);
}
