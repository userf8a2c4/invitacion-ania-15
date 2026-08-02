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
    '<div class="filtros" id="secciones-dinero">' +
      botonSeccion('resumen',      'Resumen') +
      botonSeccion('gastos',       'Gastos',       DINERO.gastos.length) +
      botonSeccion('pagos',        'Pagos',        DINERO.totales.por_pagar_cuantos) +
      botonSeccion('padrinos',     'Padrinos',     DINERO.padrinos.length) +
      botonSeccion('proveedores',  'Proveedores',  DINERO.proveedores.length) +
      botonSeccion('cotizaciones', 'Cotizaciones', DINERO.cotizaciones.length) +
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

  pintarSeccionDeDinero();
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
          '<div class="dinero-resumen__rotulo">De tu bolsillo</div>' +
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
  const filas = DINERO.categorias.map(categoria => {
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
          : '<div class="vacio__texto" style="margin-top:4px">Sin techo definido</div>') +
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
  if (!DINERO.gastos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay gastos',
      'Cargá el primero para empezar a ver el presupuesto.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo gasto'));
  } else {
    cuerpo.innerHTML = DINERO.gastos.map(gasto => {
      const pie = [gasto.categoria_nombre, gasto.proveedor_nombre]
        .filter(Boolean).join(' · ');

      // La etiqueta del padrino cambia de color según si ya entregó:
      // verde entregado, ojo si todavía es una promesa.
      const padrino = gasto.padrino_nombre
        ? '<span class="etiqueta etiqueta--' +
            (gasto.padrino_estado === 'entregado' ? 'bien' : 'ojo') + '">' +
            seguro(gasto.padrino_nombre) + '</span>'
        : '';

      return '' +
        '<button class="lista__fila" data-gasto="' + seguro(gasto.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(gasto.concepto) + '</span>' +
            '<span class="lista__pie">' + seguro(pie) + '</span>' +
            (padrino ? '<span class="menus-mini">' + padrino + '</span>' : '') +
          '</span>' +
          '<span class="lista__lado cifra">' +
            seguro(comoDinero(gasto.monto_real, false)) + '</span>' +
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
  if (!DINERO.pagos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay pagos',
      'Cargá los anticipos y las fechas límite para que el panel te avise.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo pago'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
    return;
  }

  cuerpo.innerHTML = DINERO.pagos.map(pago => {
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
  if (!DINERO.padrinos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay padrinos',
      'Anotá quién apadrina qué para saber cuánto sale de tu bolsillo de verdad.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo padrino'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
    return;
  }

  const estados = {
    hablado:    ['tenue',  'Hablado'],
    confirmado: ['ojo',    'Confirmado'],
    entregado:  ['bien',   'Entregado'],
  };

  cuerpo.innerHTML = DINERO.padrinos.map(padrino => {
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
  if (!DINERO.proveedores.length) {
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

  cuerpo.innerHTML = DINERO.proveedores.map(prov => {
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
  if (!DINERO.cotizaciones.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay cotizaciones',
      'Cargá las que vayas pidiendo para compararlas lado a lado antes de contratar.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nueva cotización'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
    return;
  }

  /* Se agrupan por servicio porque el sentido de una cotización es
     compararla con las otras del MISMO servicio. Una lista plana
     mezclaría el DJ con el pastel y no serviría para decidir nada. */
  const porServicio = {};
  DINERO.cotizaciones.forEach(cot => {
    const clave = cot.servicio || 'Sin servicio';
    if (!porServicio[clave]) porServicio[clave] = [];
    porServicio[clave].push(cot);
  });

  cuerpo.innerHTML = Object.keys(porServicio).sort().map(servicio => {
    const grupo = porServicio[servicio];

    // La más barata del grupo se marca, que es la información que uno
    // busca de un vistazo al comparar presupuestos.
    const menor = Math.min(...grupo.map(c => Number(c.monto) || Infinity));

    const filas = grupo.map(cot => {
      const monto = Number(cot.monto) || 0;
      const marcas = [];
      if (Number(cot.elegida) === 1) {
        marcas.push('<span class="etiqueta etiqueta--bien">Elegida</span>');
      } else if (monto === menor && grupo.length > 1) {
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
          '<span class="lista__lado cifra">' +
            seguro(comoDinero(monto, false)) + '</span>' +
        '</button>';
    }).join('');

    return '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
             seguro(servicio) + '</div>' + filas;
  }).join('') + botonAgregar('Nueva cotización');

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
    cerrarHoja();
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

  /* Los adjuntos solo tienen sentido sobre algo que ya existe: hace
     falta un id al que atarlos. Por eso al crear un registro nuevo el
     bloque no aparece, y sí lo hace al volver a abrirlo para editar. */
  if (existente && ['gasto', 'pago', 'proveedor'].includes(nombreAccion)) {
    const bloque = crear('div');
    bloque.innerHTML =
      '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
        (nombreAccion === 'pago' ? 'Comprobante' : 'Contrato y archivos') +
      '</div>' +
      '<div id="archivos-de-esto"></div>' +
      botonesDeArchivo({ tipo: nombreAccion, id: existente.id });

    // Va antes del pie de botones, para que Guardar quede siempre último.
    const pie = buscar('.acciones', cuerpo);
    cuerpo.insertBefore(bloque, pie);

    const lista = buscar('#archivos-de-esto', bloque);
    pintarArchivosDe(lista, nombreAccion, existente.id);

    engancharBotonesDeArchivo(bloque, {
      tipo: nombreAccion,
      id: existente.id,
      despues: () => pintarArchivosDe(lista, nombreAccion, existente.id),
    });
  }

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
           'class="campo__control" placeholder="Escribí el nombre nuevo">' +
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
                 ayuda: 'Dejalo en 0 si no querés poner límite.' }) +
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
        avisar('Escribí el nombre del gasto nuevo.', true);
        return null;
      }
      gastoId = '';
      if (!conceptoFinal) conceptoFinal = nombreNuevo;
      avisar('El pago queda suelto. Creá el gasto desde la pestaña Gastos ' +
             'si querés vincularlo.');
    }

    if (!conceptoFinal && !gastoId) {
      avisar('Poné un concepto o elegí a qué gasto pertenece.', true);
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
                 ayuda: 'Si aporta en especie, poné el valor aproximado o dejalo en 0.' }) +

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
      campoTexto({ id: 'pro-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono }) +
      campoTexto({ id: 'pro-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +
    '</div>' +

    campoLargo({ id: 'pro-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!proveedor)
  );

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
      notas:       valorDe('pro-notas', cuerpo),
    };
  }, 'proveedor', proveedor);
}


function formularioCotizacion(cotizacion) {
  const d = cotizacion || {};
  const cuerpo = abrirHoja(cotizacion ? 'Editar cotización' : 'Nueva cotización',
    campoTexto({ id: 'cot-servicio', rotulo: 'Servicio', valor: d.servicio,
                 ayuda: 'Escribí el mismo nombre en todas las del mismo rubro ' +
                        'para poder compararlas juntas.' }) +
    campoTexto({ id: 'cot-proveedor', rotulo: 'Quién cotiza', valor: d.proveedor }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'cot-monto', rotulo: 'Monto', tipo: 'number',
                   paso: '0.01', valor: d.monto ? desdePesos(d.monto) : '' }) +
      campoTexto({ id: 'cot-vigencia', rotulo: 'Vale hasta', tipo: 'date',
                   valor: d.vigencia || '' }) +
    '</div>' +

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
      monto:       aPesos(valorDe('cot-monto', cuerpo)),
      vigencia:    valorDe('cot-vigencia', cuerpo),
      telefono:    valorDe('cot-telefono', cuerpo),
      que_incluye: valorDe('cot-incluye', cuerpo),
      elegida:     !!valorDe('cot-elegida', cuerpo),
    };
  }, 'cotizacion', cotizacion);
}
