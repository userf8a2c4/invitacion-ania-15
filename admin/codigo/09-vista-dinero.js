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
    bloqueSelectorDePresupuesto(DINERO.presupuestos, DINERO.presupuesto_activo) +
    bloqueTotales(DINERO.totales) +
    bloqueProximosPagos(DINERO.pagos) +

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
  buscar('#resumen-ejecutivo', vista).addEventListener('click', exportarResumenEjecutivoDinero);

  buscarTodos('[data-proximo-pago]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_DINERO = 'pagos';
      buscarTodos('[data-seccion]', vista).forEach(o =>
        o.classList.toggle('activo', o.dataset.seccion === 'pagos'));
      pintarSeccionDeDinero();
      formularioPago(DINERO.pagos.find(p => String(p.id) === boton.dataset.proximoPago));
    });
  });

  const cambiarPresupuesto = buscar('#presupuesto-cambiar', vista);
  if (cambiarPresupuesto) {
    cambiarPresupuesto.addEventListener('click', abrirSelectorDePresupuesto);
  }

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
 * La barra de "qué presupuesto estás viendo" (Fase 7 del rediseño).
 * No se muestra nada si la instalación todavía no corrió la migración
 * (`presupuestos` llega vacío) — es el mismo criterio de degradar sin
 * romper que ya usa el resto del panel con columnas nuevas.
 *
 * @param {Array} presupuestos
 * @param {number} activoId
 * @returns {string} HTML
 */
function bloqueSelectorDePresupuesto(presupuestos, activoId) {
  // Vacío = la instalación no corrió la migración todavía: no se
  // muestra nada, mismo criterio que el resto del panel con columnas
  // nuevas. Con la migración corrida, siempre hay al menos uno (el
  // principal) — la barra queda visible para poder crear el segundo.
  if (!presupuestos || !presupuestos.length) return '';

  const activo = presupuestos.find(p => Number(p.id) === Number(activoId));

  return '' +
    '<button class="tarjeta" id="presupuesto-cambiar" style="width:100%;' +
            'text-align:left;display:flex;align-items:center;' +
            'justify-content:space-between;margin-bottom:var(--esp-2)">' +
      '<span>' +
        '<span class="vacio__texto" style="display:block">Viendo presupuesto</span>' +
        '<strong>' + seguro(activo ? activo.nombre : 'Presupuesto principal') + '</strong>' +
      '</span>' +
      '<span class="etiqueta etiqueta--tenue">Cambiar</span>' +
    '</button>';
}

/**
 * Hoja para elegir qué presupuesto está activo, o crear uno nuevo.
 *
 * @returns {void}
 */
function abrirSelectorDePresupuesto() {
  const presupuestos = DINERO.presupuestos || [];
  const activoId = Number(DINERO.presupuesto_activo);

  const cuerpo = abrirHoja('Presupuestos',
    presupuestos.map(p =>
      '<button class="lista__fila" data-activar-presupuesto="' + seguro(p.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
        '</span>' +
        (Number(p.id) === activoId
          ? '<span class="etiqueta etiqueta--bien">Activo</span>'
          : '') +
      '</button>'
    ).join('') +

    campoTexto({ id: 'presu-nombre', rotulo: 'Nuevo presupuesto',
                 pista: 'Plan A, Plan B con menos invitados…' }) +
    '<button class="boton boton--principal boton--ancho" id="presu-crear">' +
      'Crear y activar' +
    '</button>'
  );

  buscarTodos('[data-activar-presupuesto]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const id = Number(boton.dataset.activarPresupuesto);
      if (id === activoId) { cerrarHoja(true); return; }
      try {
        const r = await mandar('presupuesto.php?accion=activar_presupuesto', { id: id });
        cerrarHoja(true);
        avisar(r.mensaje);
        dibujarDinero();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  buscar('#presu-crear', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('presu-nombre', cuerpo);
    if (!nombre) { avisar('Ponle un nombre al presupuesto.', true); return; }

    try {
      const r = await mandar('presupuesto.php?accion=crear_presupuesto', { nombre: nombre });
      await mandar('presupuesto.php?accion=activar_presupuesto', { id: r.id });
      cerrarHoja(true);
      avisar('Presupuesto creado y activado.');
      dibujarDinero();
    } catch (error) {
      avisar(error.message, true);
    }
  });
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

  /* "De tu bolsillo" (arriba) da por hecho que todo padrino asignado a
     un gasto SÍ va a entregar. Cuando hay gastos cubiertos por un
     padrino que todavía no entregó (solo lo habló o lo confirmó), ese
     dinero no es seguro todavía — se avisa cuál sería el bolsillo real
     si nadie más entrega, para no gastar de más confiando en una
     promesa. */
  const prometidoSinEntregar = (t.de_padrinos || 0) - (t.de_padrinos_entregado || 0);
  if (prometidoSinEntregar > 0.01) {
    avisos += '<p class="vacio__texto" style="color:var(--ojo)">' +
              seguro(comoDinero(prometidoSinEntregar, false)) + ' de padrinos ' +
              'todavía no entregado — si nadie más entrega, tu bolsillo real ' +
              'sería <strong>' + seguro(comoDinero(t.bolsillo_si_nadie_mas_entrega, false)) +
              '</strong>.</p>';
  }

  /* costo_por_invitado viene null cuando todavía no hay nadie
     confirmado (presupuesto.php lo calcula así a propósito): se dice
     explícito por qué no hay número, en vez de mostrar "$0/persona"
     como si costara gratis. */
  const costoPorInvitado = t.costo_por_invitado === null || t.costo_por_invitado === undefined
    ? '<p class="vacio__texto">Costo por invitado: se calcula en cuanto ' +
      'haya al menos una confirmación que asiste.</p>'
    : '<p class="vacio__texto">' +
      seguro(comoDinero(t.costo_por_invitado, false)) + ' por invitado' +
      ' (' + seguro(pluralizar(t.confirmados, 'confirmado', 'confirmados')) + ').</p>';

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
      costoPorInvitado +
      avisos +
      '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-2)">' +
        '<button class="boton boton--chico" style="flex:1" id="exportar-dinero">' +
          'Descargar</button>' +
        '<button class="boton boton--chico" style="flex:1" id="resumen-ejecutivo">' +
          'Resumen ejecutivo' +
        '</button>' +
      '</div>' +
    '</div>';
}


/**
 * Los pagos pendientes que vencen más pronto, para no tener que abrir
 * la pestaña de Pagos y hacer memoria de cuál era el próximo.
 *
 * Se arma en el teléfono con lo que ya trae `case 'todo'` — no hace
 * falta un endpoint aparte, `pagos.fecha_limite` ya existe de antes.
 *
 * @param {Array} pagos
 * @returns {string} HTML, o '' si no hay ningún pago pendiente con fecha.
 */
function bloqueProximosPagos(pagos) {
  const proximos = (pagos || [])
    .filter(p => p.estado !== 'pagado' && p.fecha_limite)
    .sort((a, b) => (a.fecha_limite < b.fecha_limite ? -1 : 1))
    .slice(0, 5);

  if (!proximos.length) return '';

  return '' +
    '<div class="tarjeta" style="margin-top:var(--esp-2)">' +
      '<div class="tarjeta__titulo">Próximos pagos</div>' +
      proximos.map(pago => {
        const atrasado = diasHasta(pago.fecha_limite) < 0;
        return '' +
          '<button class="lista__fila" data-proximo-pago="' + seguro(pago.id) + '">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' +
                seguro(pago.concepto || pago.gasto_concepto || 'Pago') + '</span>' +
              '<span class="lista__pie">' +
                (atrasado
                  ? '<span class="etiqueta etiqueta--alerta">Atrasado</span> desde ' +
                    seguro(comoFecha(pago.fecha_limite))
                  : 'Vence ' + seguro(comoCuando(pago.fecha_limite))) +
              '</span>' +
            '</span>' +
            '<span class="lista__lado cifra">' + seguro(comoDinero(pago.monto, false)) + '</span>' +
          '</button>';
      }).join('') +
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
 * El único gráfico de esta pantalla: de lo que se pensó gastar a lo
 * que ya se pagó de verdad, en tres barras. Responde una decisión
 * concreta —¿cuánto de lo planeado sigue siendo solo un número, y
 * cuánto ya es plata que salió?— sin depender de ninguna librería:
 * es SVG a mano, con los mismos colores que ya usa el resto del panel.
 *
 * @param {Object} t - DINERO.totales
 * @returns {string} HTML, o '' si todavía no hay nada planeado.
 */
function graficoDeFlujoDePresupuesto(t) {
  const planeado = Number(t.planeado) || 0;
  if (planeado <= 0) return '';

  const costo  = Number(t.costo)  || 0;
  const pagado = Number(t.pagado) || 0;
  const referencia = Math.max(planeado, costo, 1);

  const filas = [
    ['Planeado',   planeado, 'var(--texto-tenue)'],
    ['Costo real', costo,    'var(--oro)'],
    ['Pagado',     pagado,   'var(--bien)'],
  ];

  const ALTO_FILA   = 34;
  const ANCHO_BARRA = 220;
  const svgAlto = filas.length * ALTO_FILA;

  const filasSvg = filas.map(([nombre, valor, color], i) => {
    const y = i * ALTO_FILA;
    // Mínimo 3 unidades para que un valor > 0 no desaparezca del todo.
    const ocupado = valor > 0 ? Math.max((valor / referencia) * ANCHO_BARRA, 3) : 0;

    return '' +
      '<text x="0" y="' + (y + 11) + '" font-size="11" fill="var(--texto-suave)">' +
        seguro(nombre) + '</text>' +
      '<rect x="0" y="' + (y + 16) + '" width="' + ANCHO_BARRA + '" height="12" rx="4" ' +
            'fill="var(--borde)"></rect>' +
      '<rect x="0" y="' + (y + 16) + '" width="' + ocupado + '" height="12" rx="4" ' +
            'fill="' + color + '"></rect>' +
      '<text x="' + (ANCHO_BARRA + 8) + '" y="' + (y + 25) + '" font-size="11" ' +
            'fill="var(--texto-suave)">' + seguro(comoDinero(valor, false)) + '</text>';
  }).join('');

  return '' +
    '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
      '<div class="tarjeta__titulo">De lo planeado a lo pagado</div>' +
      '<svg viewBox="0 0 ' + (ANCHO_BARRA + 90) + ' ' + svgAlto + '" ' +
           'style="width:100%;height:auto;display:block;margin-top:var(--esp-1)" ' +
           'role="img" aria-label="Comparación entre lo planeado, el costo real y lo pagado">' +
        filasSvg +
      '</svg>' +
    '</div>';
}

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
    const techo    = Number(categoria.techo) || 0;
    const gastado  = Number(categoria.gastado) || 0;
    const planeado = Number(categoria.planeado) || 0;

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
        /* Estimado vs. real: `planeado` es lo que se pensó gastar al
           cargar cada gasto, `gastado` es lo que costó DE VERDAD. Verlos
           juntos avisa cuando una categoría todavía es puro cálculo —
           no hay que confundir "lo pensado" con "lo que ya pasó". */
        (planeado > 0
          ? '<div class="vacio__texto" style="margin-top:4px">Estimado ' +
            seguro(comoDinero(planeado, false)) +
            (gastado === 0 ? ' — todavía sin costo real cargado' : '') +
            '</div>'
          : '') +
      '</button>';
  }).join('');

  // El gráfico es del presupuesto entero, no de las categorías que haya
  // dejado el buscador: no tiene sentido esconderlo al filtrar.
  const grafico = BUSQUEDA_DINERO.trim() ? '' : graficoDeFlujoDePresupuesto(DINERO.totales);

  cuerpo.innerHTML = grafico + filas + botonAgregar('Nueva categoría');

  buscarTodos('[data-categoria]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const cat = DINERO.categorias.find(c => String(c.id) === boton.dataset.categoria);
      abrirDetalleDeCategoria(cat);
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCategoria());
}

/**
 * Ficha de solo lectura de una categoría, antes de editar — mismo
 * patrón que abrirDetalleDeProveedor()/abrirDetalleDePadrino(): tocar
 * una fila de la lista nunca abre directo un formulario editable, para
 * que no haya cambios por error de dedo. El botón "Editar" abre
 * formularioCategoria(), que ya trae su propio "Borrar" adentro (ver
 * pieDeFormulario), así que acá no hace falta repetirlo.
 *
 * @param {Object} categoria
 * @returns {void}
 */
function abrirDetalleDeCategoria(categoria) {
  const detalle = [
    ['Techo', categoria.techo > 0 ? comoDinero(categoria.techo, false) : 'Sin techo definido'],
    ['Planeado', comoDinero(categoria.planeado, false)],
    ['Gastado', comoDinero(categoria.gastado, false)],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(categoria.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioCategoria(categoria));
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
        abrirDetalleDeGasto(DINERO.gastos.find(g => String(g.id) === boton.dataset.gasto));
      });
    });
  }

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioGasto());
}

/**
 * PLAN.tareas ya cargado, pidiéndolo si hace falta — mismo criterio que
 * datosDePlanParaElAsistente() en 34-asistente-datos.js, pero sin pasar
 * por el asistente: cualquier ficha de Dinero puede necesitarlo.
 *
 * @returns {Promise<Array>}
 */
async function tareasParaLaFicha() {
  if (PLAN.tareas && PLAN.tareas.length) return PLAN.tareas;
  try { await traerPlanificador(); } catch (error) { /* sin señal: sigue vacío */ }
  return PLAN.tareas || [];
}

/**
 * Engancha "Nueva tarea" y pinta las tareas ya atadas a esta ficha —
 * mismo patrón en las tres fichas que lo usan (proveedor, gasto,
 * padrino). Fuera de un `await` a propósito, igual que ya hace
 * insertarAdjuntosDeSoloLectura(): la ficha se ve completa al toque,
 * y esto se rellena solo apenas responde.
 *
 * @param {Element} cuerpo
 * @param {'proveedor'|'gasto'|'padrino'} tipo
 * @param {number} id
 * @param {string} tituloParaLaTarea
 * @returns {void}
 */
function engancharTareasDeLaFicha(cuerpo, tipo, id, tituloParaLaTarea) {
  const boton = buscar('#detalle-nueva-tarea', cuerpo);
  if (boton) {
    boton.addEventListener('click', () =>
      formularioTarea({ atada_a_tipo: tipo, atada_a_id: id, titulo: tituloParaLaTarea }));
  }

  tareasParaLaFicha().then(tareas => {
    const relacionadas = tareas.filter(t => t.atada_a_tipo === tipo && t.atada_a_id === id);
    const contenedor = buscar('#tareas-de-la-ficha', cuerpo);
    if (!contenedor || !relacionadas.length) return;

    contenedor.innerHTML =
      '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Tareas</div>' +
      relacionadas.map(t =>
        '<button class="lista__fila" data-tarea-de-la-ficha="' + seguro(t.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(t.titulo) + '</span>' +
            '<span class="lista__pie">' +
              seguro({ pendiente: 'Pendiente', haciendo: 'En eso', hecha: 'Hecha' }[t.estado] || t.estado) +
            '</span>' +
          '</span>' +
        '</button>'
      ).join('');

    buscarTodos('[data-tarea-de-la-ficha]', contenedor).forEach(fila => {
      fila.addEventListener('click', () => {
        const tarea = relacionadas.find(t => String(t.id) === fila.dataset.tareaDeLaFicha);
        if (tarea) formularioTarea(tarea);
      });
    });
  });
}

/**
 * Ficha de solo lectura de un gasto, antes de editar.
 *
 * @param {Object} gasto
 * @returns {void}
 */
function abrirDetalleDeGasto(gasto) {
  const detalle = [
    ['Categoría', gasto.categoria_nombre || '—'],
    ['Proveedor', gasto.proveedor_nombre || '—'],
    ['Lo cubre', gasto.padrino_nombre
      ? gasto.padrino_nombre + (gasto.padrino_estado === 'entregado' ? ' (ya entregó)' : ' (todavía no entrega)')
      : 'Tu bolsillo'],
    ['Presupuestado', comoDinero(gasto.presupuestado, false)],
    ['Costo real', Number(gasto.monto_real) > 0 ? comoDinero(gasto.monto_real, false) : 'Todavía sin cargar'],
    ['Notas', gasto.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(gasto.concepto,
    '<div class="detalle">' + detalle + '</div>' +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'gasto', gasto.id, 'Facturas y comprobantes');
  engancharTareasDeLaFicha(cuerpo, 'gasto', gasto.id, 'Sobre ' + gasto.concepto);

  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: gasto.concepto, tipo: 'gasto', id: gasto.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioGasto(gasto));
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
      const seMarcoComoPagado = casilla.checked;
      try {
        await mandar('presupuesto.php?accion=marcar_pagado', { id: casilla.dataset.pagar });
        registrarEvento('accion', 'marcar_pago');
        ensuciarVistas('resumen');
        dibujarDinero();

        // Mismo ofrecimiento que al dar de alta un pago ya pagado (ver
        // ofrecerGenerarReciboDeEstePago) — acá el pago YA existía, así
        // que se busca en DINERO.pagos en vez de usar la respuesta del
        // servidor. Nunca al DESmarcar: eso no es un pago nuevo.
        if (seMarcoComoPagado) {
          const pago = DINERO.pagos.find(p => String(p.id) === casilla.dataset.pagar);
          // DINERO.pagos todavía tiene el estado VIEJO acá (dibujarDinero()
          // recién disparó el pedido, no esperó la respuesta) — se fuerza
          // 'pagado' a mano en vez de confiar en lo que diga esa copia.
          if (pago) ofrecerGenerarReciboDeEstePago({ ...pago, estado: 'pagado' }, { id: pago.id });
        }
      } catch (error) {
        casilla.checked = !casilla.checked;   // deshacer si falló
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-pago]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleDePago(DINERO.pagos.find(p => String(p.id) === boton.dataset.pago));
    });
  });

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
}

/**
 * Ficha de solo lectura de un pago, antes de editar. La casilla de
 * "marcar pagado" en la lista sigue siendo de un toque, a propósito —
 * es una acción chica y reversible; esto es para no editar el monto o
 * la fecha por error.
 *
 * @param {Object} pago
 * @returns {void}
 */
async function abrirDetalleDePago(pago) {
  const pagado = pago.estado === 'pagado';

  const detalle = [
    ['Parte de', pago.gasto_concepto || 'Suelto (no pertenece a ningún gasto)'],
    ['Monto', comoDinero(pago.monto, false)],
    ['Estado', pagado ? 'Pagado' : 'Pendiente'],
    [pagado ? 'Pagado el' : 'Vence el',
      (pagado ? pago.fecha_pagado : pago.fecha_limite)
        ? comoFecha(pagado ? pago.fecha_pagado : pago.fecha_limite) : '—'],
    ['Método', pago.metodo || '—'],
    ['Notas', pago.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  // El proveedor de este pago, buscado vía su gasto — DINERO.gastos ya
  // trae proveedor_id (no hace falta pedirle nada nuevo al servidor).
  const gasto = (DINERO.gastos || []).find(g => g.id === pago.gasto_id);
  const proveedor = gasto ? (DINERO.proveedores || []).find(p => p.id === gasto.proveedor_id) : null;

  const cuerpo = abrirHoja(pago.concepto || pago.gasto_concepto || 'Pago',
    '<div class="detalle">' + detalle + '</div>' +
    (proveedor
      ? '<div class="acciones" style="margin-top:var(--esp-3)">' +
          '<button class="boton" id="detalle-generar-recibo">Generar recibo</button>' +
        '</div>'
      : '') +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'pago', pago.id, 'Comprobante del pago');

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioPago(pago));

  /* ─── CAMINO SIMÉTRICO AL DE LA FICHA DE PROVEEDOR ───────────────────
     Si Lucila ya cargó el pago a mano en Presupuesto (el flujo de
     siempre) y después quiere el PDF, no hace falta repetir monto,
     fecha ni forma de pago: recibos.php ya los saca directo del pago
     cuando le llega pago_id (ver la nota grande en ese archivo). Antes
     de ofrecer el botón, se chequea que este pago no tenga ya un
     recibo — nunca dos recibos del mismo pago por error. */
  const botonRecibo = buscar('#detalle-generar-recibo', cuerpo);
  if (botonRecibo && proveedor) {
    let yaTieneRecibo = false;
    try {
      const existentes = await traer('recibos.php?accion=listar&pago_id=' + pago.id);
      yaTieneRecibo = Array.isArray(existentes) && existentes.length > 0;
    } catch (error) {
      // Sin señal: se deja el botón, en el peor caso generaría uno de más.
    }

    if (yaTieneRecibo) {
      botonRecibo.textContent = 'Ya tiene recibo — verlo';
      botonRecibo.addEventListener('click', () => abrirListaDeDocumentos('recibo', proveedor));
    } else {
      botonRecibo.addEventListener('click', async () => {
        botonRecibo.disabled = true;
        try {
          const resultado = await mandar('recibos.php?accion=generar', { pago_id: pago.id });
          cerrarHoja(true);
          abrirResultadoDeDocumento('Recibo ' + resultado.numero + ' generado.',
            resultado.archivo_id, resultado.nombre, proveedor);
        } catch (error) {
          avisar(error.message, true);
          botonRecibo.disabled = false;
        }
      });
    }
  }
}

/**
 * La lista de padrinos.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
/**
 * Cuánto suma cada etapa del compromiso de los padrinos ("lo habló",
 * "ya lo confirmó", "ya entregó"), para ver el embudo de un vistazo.
 *
 * Solo cuenta los que aportan en dinero: "en especie" no tiene un
 * monto comparable de verdad —el que se carga es solo aproximado—, y
 * sumarlo junto con dinero real daría un total que no significa nada.
 *
 * @param {Array} padrinos
 * @returns {string} HTML, o '' si no hay ninguno que aporte en dinero.
 */
function resumenDePipelineDePadrinos(padrinos) {
  const enDinero = (padrinos || []).filter(p => p.tipo_aporte !== 'especie');
  if (!enDinero.length) return '';

  const porEstado = { hablado: 0, confirmado: 0, entregado: 0 };
  enDinero.forEach(p => {
    const clave = porEstado.hasOwnProperty(p.estado) ? p.estado : 'hablado';
    porEstado[clave] += Number(p.monto) || 0;
  });

  const etiquetas = [
    ['hablado', 'Hablado'], ['confirmado', 'Confirmado'], ['entregado', 'Ya entregó'],
  ];

  return '' +
    '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
      '<div class="tarjeta__titulo">Cuánto va en cada etapa' +
        ayuda('dinero.pipeline-padrinos') + '</div>' +
      etiquetas.map(([clave, texto]) =>
        '<div class="detalle__rotulo" style="display:flex;justify-content:space-between;' +
             'padding:var(--esp-1) 0">' +
          '<span>' + seguro(texto) + '</span>' +
          '<span class="cifra">' + seguro(comoDinero(porEstado[clave], false)) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

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

  cuerpo.innerHTML = resumenDePipelineDePadrinos(DINERO.padrinos) +

  padrinos.map(padrino => {
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
      abrirDetalleDePadrino(
        DINERO.padrinos.find(p => String(p.id) === boton.dataset.padrino));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
}

/**
 * Ficha de solo lectura de un padrino, antes de editar. Mismo patrón que
 * abrirDetalleDeInvitado() (08-vista-invitados.js).
 *
 * @param {Object} padrino
 * @returns {void}
 */
function abrirDetalleDePadrino(padrino) {
  const monto = padrino.tipo_aporte === 'especie'
    ? 'En especie' + (padrino.monto > 0 ? ' (aprox. ' + comoDinero(padrino.monto, false) + ')' : '')
    : comoDinero(padrino.monto, false);

  const estados = { hablado: 'Hablado', confirmado: 'Confirmado en firme', entregado: 'Ya entregó' };

  const detalle = [
    ['Apadrina', padrino.apadrina || '—'],
    ['Aporte', monto],
    ['Estado', estados[padrino.estado] || padrino.estado || '—'],
    ['Teléfono', padrino.telefono || '—'],
    ['Correo', padrino.correo || '—'],
    ['Notas', padrino.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  /* ─── GASTOS QUE CUBRE (el sentido que faltaba) ──────────────────────
     gastos.padrino_id ya conecta gasto→padrino, y abrirDetalleDeGasto
     ya muestra "Lo cubre" con el nombre del padrino. Acá faltaba el
     sentido inverso: antes había que ir a la pestaña Gastos y buscar a
     mano cuáles tenían este nombre. DINERO.gastos ya está cargado. */
  const gastosQueCubre = (DINERO.gastos || []).filter(g => g.padrino_id === padrino.id);
  const seccionGastos = gastosQueCubre.length
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Gastos que cubre</div>' +
      gastosQueCubre.map(g =>
        '<button class="lista__fila" data-gasto-que-cubre="' + seguro(g.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(g.concepto) + '</span>' +
          '</span>' +
          '<span class="lista__lado cifra">' + seguro(comoDinero(g.monto_real || g.presupuestado, false)) + '</span>' +
        '</button>'
      ).join('')
    : '';

  const cuerpo = abrirHoja(padrino.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    seccionGastos +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="detalle-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'padrino', padrino.id, 'Comprobante de lo entregado');
  engancharTareasDeLaFicha(cuerpo, 'padrino', padrino.id, 'Sobre ' + padrino.nombre);

  buscarTodos('[data-gasto-que-cubre]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const gasto = gastosQueCubre.find(g => String(g.id) === boton.dataset.gastoQueCubre);
      if (gasto) abrirDetalleDeGasto(gasto);
    });
  });

  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: 'Sobre ' + padrino.nombre, tipo: 'padrino', id: padrino.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioPadrino(padrino));

  buscar('#detalle-borrar', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
    guardarDinero('borrar_padrino', { id: padrino.id }, 'Eliminado.');
  });
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
      abrirDetalleDeProveedor(
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
/**
 * Un resumen de una línea de "qué incluye" una cotización, para la
 * fila de la lista. Prefiere los ítems estructurados; si todavía no se
 * migró (formato viejo, texto corrido), cae al texto tal cual.
 *
 * @param {Object} cot
 * @returns {string}
 */
function resumenDeQueIncluye(cot) {
  if (cot.detalle_items && cot.detalle_items.length) {
    return cot.detalle_items.map(it => it.texto).join(' · ');
  }
  return cot.que_incluye || '';
}

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
              seguro(acortar(resumenDeQueIncluye(cot), 60)) + '</span>' +
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
      abrirVistaPreviaDeCotizacion(
        DINERO.cotizaciones.find(c => String(c.id) === boton.dataset.cotizacion));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
}

/**
 * Ficha de solo lectura de una cotización, antes de editar.
 *
 * NOTA DE NOMBRE: no se llama abrirDetalleDeCotizacion() a propósito.
 * 21-cotizador.js (el comparador de cotizaciones, más viejo que esta
 * función) ya tiene una función con exactamente ese nombre — toma un id
 * numérico y abre el desglose de costos por invitados, no esta ficha.
 * Como no hay módulos, los dos <script> comparten un mismo espacio de
 * nombres global: la que carga después (21-cotizador.js, ver
 * index.html) pisaba a esta silenciosamente, y la lista de Cotizaciones
 * terminaba llamando accion=ver de cotizador.php con el objeto entero
 * como "id" — de ahí el "Esa cotización no existe" que reportó Lucila.
 *
 * @param {Object} cotizacion
 * @returns {void}
 */
function abrirVistaPreviaDeCotizacion(cotizacion) {
  const esPorPersona = cotizacion.tipo_precio === 'por_persona';
  const precio = esPorPersona
    ? comoDinero(cotizacion.precio_pp, false) + ' / persona'
    : comoDinero(cotizacion.monto, false);

  const detalle = [
    ['Servicio', cotizacion.servicio],
    ['Precio', precio],
    ['Vale hasta', cotizacion.vigencia ? comoFecha(cotizacion.vigencia) : '—'],
    ['Teléfono', cotizacion.telefono || '—'],
    ['Elegida', Number(cotizacion.elegida) === 1 ? 'Sí' : 'No'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(cotizacion.proveedor,
    '<div class="detalle">' + detalle + '</div>' +
    vinetasDeQueIncluye(cotizacion.detalle_items) +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'cotizacion', cotizacion.id, 'La cotización en PDF o foto');

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioCotizacion(cotizacion));
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
async function guardarDinero(accion, carga, mensaje, despues) {
  try {
    const resultado = await mandar('presupuesto.php?accion=' + accion, carga);
    cerrarHoja(true);
    avisar(mensaje);
    // El Resumen muestra totales de dinero: hay que refrescarlo también.
    ensuciarVistas('resumen');
    dibujarDinero();
    // Para acciones que quieran hacer algo más con lo recién guardado
    // (ver ofrecerGenerarReciboDeEstePago, más abajo) — opcional,
    // ninguna otra pantalla lo necesita todavía.
    if (despues) despues(resultado);
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Al dar de alta un pago YA marcado "pagado", ofrece generar su recibo
 * ahí mismo — sin esto, Lucila tendría que ir a buscar al proveedor y
 * tocar "Generar recibo" por separado para algo que ya sabe que pasó.
 * Nunca se genera solo: siempre pregunta primero.
 *
 * Solo tiene sentido si el pago quedó atado a un gasto con proveedor
 * —recibos.php necesita saber a quién va el recibo—; un pago suelto o
 * de un gasto sin proveedor simplemente no ofrece nada.
 *
 * @param {Object} carga     Lo que se mandó a guardar (tiene gasto_id).
 * @param {Object} resultado La respuesta del servidor (tiene id).
 * @returns {Promise<void>}
 */
async function ofrecerGenerarReciboDeEstePago(carga, resultado) {
  if (carga.estado !== 'pagado' || !carga.gasto_id || !resultado || !resultado.id) return;

  const gasto = (DINERO.gastos || []).find(g => Number(g.id) === Number(carga.gasto_id));
  const proveedor = gasto ? (DINERO.proveedores || []).find(p => p.id === gasto.proveedor_id) : null;
  if (!proveedor) return;   // sin proveedor no hay a quién nombrar en el recibo

  if (!confirmarAccion('Este pago quedó marcado como pagado. ¿Generar su recibo ahora?')) return;

  try {
    const doc = await mandar('recibos.php?accion=generar', { pago_id: resultado.id });
    abrirResultadoDeDocumento('Recibo ' + doc.numero + ' generado.',
      doc.archivo_id, doc.nombre, proveedor);
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
/**
 * A qué arreglo de DINERO pertenece cada tipo de registro que edita
 * engancharFormularioDinero(). Solo entran acá los que se pueden mutar
 * en memoria de forma segura al editar (fila plana, sin recalcular
 * nada agregado): cotización y categoría se quedan fuera porque su
 * forma en DINERO es agrupada, no una lista plana por id.
 */
const COLECCIONES_DINERO = {
  proveedor: 'proveedores',
  padrino:   'padrinos',
  gasto:     'gastos',
  pago:      'pagos',
};

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

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const carga = armarCarga();
    if (!carga) return;
    if (existente) carga.id = existente.id;

    /* Editar un registro que ya existe puede aplicarse de una: ya hay
       una fila en memoria para mutar y repintar al instante (A1, ver
       36-optimista.js) — mismo patrón que abrirFormularioDeInvitado()
       en 08-vista-invitados.js. Dar de alta uno nuevo no tiene id
       todavía, así que sigue esperando la respuesta del servidor. */
    const coleccion = existente && COLECCIONES_DINERO[nombreAccion];
    if (!coleccion) {
      guardarDinero('guardar_' + nombreAccion, carga, 'Guardado.',
        nombreAccion === 'pago' ? r => ofrecerGenerarReciboDeEstePago(carga, r) : null);
      return;
    }

    cerrarHoja(true);
    try {
      const resultado = await aplicarOptimista(
        'presupuesto.php?accion=guardar_' + nombreAccion, carga,
        {
          mutar: () => {
            const lista = DINERO[coleccion];
            const i = lista.findIndex(f => Number(f.id) === Number(existente.id));
            if (i !== -1) Object.assign(lista[i], carga);
          },
          repintar: pintarSeccionDeDinero,
        }
      );
      avisar(resultado.offline
        ? 'Sin conexión: se guardó y se va a mandar solo.'
        : 'Guardado.');
      ensuciarVistas('resumen');
    } catch (error) {
      avisar(error.message, true);
    }
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


/**
 * Ficha de solo lectura de un proveedor, antes de editar. Mismo patrón
 * que abrirDetalleDeInvitado() (08-vista-invitados.js).
 *
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirDetalleDeProveedor(proveedor) {
  const estados = {
    candidato: 'Candidato', contratado: 'Contratado',
    pagado: 'Pagado por completo', cancelado: 'Cancelado',
  };
  const falta = (Number(proveedor.monto_total) || 0) - (Number(proveedor.anticipo) || 0);

  const detalle = [
    ['Servicio', proveedor.servicio || '—'],
    ['Estado', estados[proveedor.estado] || proveedor.estado || '—'],
    ['Monto total', comoDinero(proveedor.monto_total, false)],
    ['Anticipo pagado', comoDinero(proveedor.anticipo, false)],
    ['Falta', falta > 0 ? comoDinero(falta, false) : '—'],
    ['Contacto', proveedor.contacto || '—'],
    ['Teléfono', proveedor.telefono || '—'],
    ['Correo', proveedor.correo || '—'],
    ['Notas', proveedor.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  /* ─── PAGOS REGISTRADOS EN PRESUPUESTO (de verdad, no manual) ────────
     `monto_total`/`anticipo` son campos que Lucila carga a mano al dar
     de alta al proveedor — pueden quedar desactualizados. Esto suma lo
     que EN REALIDAD se cargó como pagado en Gastos/Pagos para este
     proveedor, sin reemplazar los campos manuales (cambiar ese modelo
     es más grande que este pedido) — se muestra al lado, como dato
     adicional de verificación. `DINERO.gastos`/`DINERO.pagos` ya están
     cargados en memoria por dibujarDinero(), así que esto no pide nada
     nuevo al servidor. */
  const gastosDeEsteProveedor = (DINERO.gastos || []).filter(g => g.proveedor_id === proveedor.id);
  const idsDeEsosGastos = new Set(gastosDeEsteProveedor.map(g => g.id));
  const pagosDeEsteProveedor = (DINERO.pagos || []).filter(p => idsDeEsosGastos.has(p.gasto_id));
  const totalPagadoDeVerdad = pagosDeEsteProveedor
    .filter(p => p.estado === 'pagado')
    .reduce((suma, p) => suma + (Number(p.monto) || 0), 0);

  const seccionPagosReales = pagosDeEsteProveedor.length
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Pagos registrados en Presupuesto</div>' +
      '<div class="detalle">' +
        '<span class="detalle__rotulo">Pagado de verdad</span>' +
        '<span class="detalle__valor">' + seguro(comoDinero(totalPagadoDeVerdad, false)) + '</span>' +
        '<span class="detalle__rotulo">Cantidad de pagos</span>' +
        '<span class="detalle__valor">' + pagosDeEsteProveedor.length + '</span>' +
      '</div>'
    : '';

  const cuerpo = abrirHoja(proveedor.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    seccionPagosReales +
    vinetasDeQueIncluye(proveedor.detalle_items) +
    botonesDeContacto(proveedor) +
    /* Generar recibo SIEMPRE está acá, disponible, sin importar si este
       proveedor tiene o no un contrato adjunto abajo. Nunca se deshabilita
       ni se le pide nada antes: ver la nota grande de recibos.php sobre
       por qué el recibo no depende del contrato. */
    /* Los dos botones van juntos y con el mismo peso visual: ninguno es
       "el paso 1 del otro". Generar un contrato es enteramente opcional
       —ver la nota grande en contratos.php—, así que no se ordenan como
       un asistente de pasos ni uno se deshabilita esperando al otro. */
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-recibo">Generar recibo</button>' +
      '<button class="boton" id="detalle-contrato">Generar contrato</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton" id="detalle-ver-recibos">Ver recibos</button>' +
      '<button class="boton" id="detalle-ver-contratos">Ver contratos</button>' +
    '</div>' +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="detalle-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  engancharBotonesDeContacto(cuerpo, proveedor);
  insertarAdjuntosDeSoloLectura(cuerpo, 'proveedor', proveedor.id, 'Contrato y documentos');
  engancharTareasDeLaFicha(cuerpo, 'proveedor', proveedor.id, 'Sobre ' + proveedor.nombre);

  buscar('#detalle-ver-recibos', cuerpo).addEventListener('click',
    () => abrirListaDeDocumentos('recibo', proveedor));
  buscar('#detalle-ver-contratos', cuerpo).addEventListener('click',
    () => abrirListaDeDocumentos('contrato', proveedor));

  buscar('#detalle-recibo', cuerpo).addEventListener('click', () => abrirGeneradorDeRecibo(proveedor));
  buscar('#detalle-contrato', cuerpo).addEventListener('click', () => abrirGeneradorDeContrato(proveedor));

  // ponerleAlarmaA ya existía (22-alarmas.js) con todo el mecanismo de
  // vínculo (atada_a_tipo/atada_a_id) armado — antes de esta ronda nadie
  // la llamaba desde ninguna ficha. Al tocar la notificación, lleva de
  // vuelta acá mismo.
  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: 'Sobre ' + proveedor.nombre, tipo: 'proveedor', id: proveedor.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioProveedor(proveedor));

  buscar('#detalle-borrar', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
    guardarDinero('borrar_proveedor', { id: proveedor.id }, 'Eliminado.');
  });
}

/**
 * Formulario chico para generar un recibo de pago de este proveedor.
 * No pregunta nada de contratos: un recibo se genera solo, en cualquier
 * momento (ver la nota grande en admin/api/recibos.php).
 *
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirGeneradorDeRecibo(proveedor) {
  const falta = (Number(proveedor.monto_total) || 0) - (Number(proveedor.anticipo) || 0);
  const hoy   = new Date().toISOString().slice(0, 10);

  const cuerpo = abrirHoja('Recibo · ' + proveedor.nombre,
    '<button type="button" class="lista__fila" id="rec-configurar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">⚙️ Numeración y datos de quien paga</span>' +
      '</span>' +
    '</button>' +
    campoDinero({ id: 'rec-monto', rotulo: 'Monto',
                 valor: falta > 0 ? desdePesos(falta) : '',
                 pista: 'Lo que se está pagando ahora' }) +
    campoLargo({ id: 'rec-concepto', rotulo: 'Concepto',
                 valor: falta > 0 ? 'Saldo' : 'Anticipo' }) +
    campoLista({ id: 'rec-forma', rotulo: 'Forma de pago', valor: 'Transferencia',
                 opciones: [
                   { valor: 'Efectivo',      texto: 'Efectivo' },
                   { valor: 'Transferencia', texto: 'Transferencia' },
                   { valor: 'Tarjeta',       texto: 'Tarjeta' },
                   { valor: 'Otro',          texto: 'Otro' },
                 ] }) +
    campoTexto({ id: 'rec-fecha', rotulo: 'Fecha', tipo: 'date', valor: hoy }) +
    /* Tildado por defecto: mantener los libros de Presupuesto al día es
       lo esperable, no la excepción. Destildar es la elección
       consciente para un recibo que de verdad no debe contarse (ver
       la nota grande en recibos.php sobre por qué esto es opcional). */
    campoCasilla({ id: 'rec-tambien-pago',
                   rotulo: 'También registrarlo como pago en Presupuesto',
                   marcado: true }) +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="rec-generar">' +
        'Generar PDF' +
      '</button>' +
    '</div>'
  );

  activarFormatoDeMiles('rec-monto', cuerpo);

  buscar('#rec-configurar', cuerpo).addEventListener('click', () => abrirConfiguracionDeDocumentos());

  buscar('#rec-generar', cuerpo).addEventListener('click', async () => {
    const monto = aPesos(valorDe('rec-monto', cuerpo));
    if (!monto || monto <= 0) {
      avisar('Poné un monto mayor a cero.', true);
      return;
    }

    try {
      const resultado = await mandar('recibos.php?accion=generar', {
        proveedor_id: proveedor.id,
        monto:        monto,
        concepto:     valorDe('rec-concepto', cuerpo),
        forma_pago:   valorDe('rec-forma', cuerpo),
        fecha:        valorDe('rec-fecha', cuerpo),
        tambien_registrar_pago: !!valorDe('rec-tambien-pago', cuerpo),
      });
      cerrarHoja(true);

      // Si quedó vinculado a un pago, Presupuesto tiene datos nuevos:
      // mismo refresco que ya usa guardarDinero() al guardar cualquier
      // otra cosa, para que "Pagos registrados" y las pestañas de
      // Gastos/Pagos lo vean sin tener que salir y volver a entrar.
      if (resultado.pago_id) {
        ensuciarVistas('resumen');
        await dibujarDinero();
      }

      abrirResultadoDeDocumento(
        'Recibo ' + resultado.numero + ' generado.'
          + (resultado.pago_id ? ' Registrado también como pago.' : ''),
        resultado.archivo_id, resultado.nombre, proveedor);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Pantallita corta que aparece justo después de generar un recibo o un
 * contrato: confirma el número, ofrece mandarlo por WhatsApp ahí mismo
 * (ver compartirArchivoPorWhatsApp en 06-piezas.js) y, al cerrarla,
 * vuelve a la ficha del proveedor para que el PDF ya se vea en la lista
 * de "Contrato y documentos".
 *
 * @param {string} mensaje
 * @param {number} archivoId
 * @param {string} nombreArchivo
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirResultadoDeDocumento(mensaje, archivoId, nombreArchivo, proveedor) {
  const cuerpo = abrirHoja('Listo', '' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' + seguro(mensaje) + '</p>' +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="doc-whatsapp">' +
        'Enviar por WhatsApp' +
      '</button>' +
    '</div>',
    () => abrirDetalleDeProveedor(proveedor)
  );

  buscar('#doc-whatsapp', cuerpo).addEventListener('click', () => {
    compartirArchivoPorWhatsApp(archivoId, nombreArchivo, proveedor.telefono);
  });
}

/**
 * Configuración de cada tipo de documento guardado: dónde pedirlos,
 * cómo mostrarlos en la lista y en el detalle. Un solo lugar para las
 * diferencias entre "recibo" y "contrato", en vez de tener dos pares de
 * funciones casi idénticas.
 */
const TIPOS_DE_DOCUMENTO = {
  recibo: {
    endpoint: 'recibos.php',
    titulo: 'Recibos',
    tituloSingular: 'Recibo',
    filaLista: r => [seguro(r.numero), comoDinero(r.monto, false) + ' · ' + seguro(r.concepto || '—')],
    campos: r => [
      ['Fecha', comoFecha(r.fecha)],
      ['Concepto', r.concepto || '—'],
      ['Monto', comoDinero(r.monto, false)],
      ['Forma de pago', r.forma_pago || '—'],
      ['Estado', { pendiente: 'Pendiente', enviado: 'Enviado', firmado: 'Firmado' }[r.estado] || r.estado],
    ],
    tieneEstado: true,
  },
  contrato: {
    endpoint: 'contratos.php',
    titulo: 'Contratos',
    tituloSingular: 'Contrato',
    filaLista: c => [seguro(c.numero || ('Contrato #' + c.id)), comoDinero(c.monto_total, false)],
    campos: c => [
      ['Fecha de firma', comoFecha(c.fecha_firma)],
      ['Servicio', c.descripcion_servicio || '—'],
      ['Monto total', comoDinero(c.monto_total, false)],
      ['Lugar', c.lugar || '—'],
    ],
    tieneEstado: false,
  },
};

/**
 * La lista de recibos o contratos ya generados para este proveedor —
 * solo para CONSULTAR. Tocar una fila abre el detalle de solo lectura
 * (abrirDetalleDeDocumentoGuardado); ahí, y solo ahí, aparecen Editar y
 * Borrar, cada uno detrás de una confirmación explícita.
 *
 * POR QUÉ HAY FRICCIÓN A PROPÓSITO
 * Un recibo o un contrato ya generado es, en la práctica, un documento
 * legal/contable entregado: no debería poder tocarse con el mismo toque
 * despreocupado con el que se edita una nota. Ver la nota grande en
 * recibos.php y contratos.php sobre por qué "editar" ni siquiera
 * rehace el PDF — esto es la misma idea, del lado de la interfaz.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} proveedor
 * @returns {Promise<void>}
 */
async function abrirListaDeDocumentos(tipo, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const cuerpo = abrirHoja(config.titulo + ' · ' + proveedor.nombre,
    '<div class="esqueleto"></div>'.repeat(3));

  let filas;
  try {
    filas = await traer(config.endpoint + '?accion=listar&proveedor_id=' + proveedor.id);
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirListaDeDocumentos(tipo, proveedor));
    return;
  }

  if (!filas.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay ' + config.titulo.toLowerCase(),
      'Los que generes van a aparecer acá, solo para consultar.');
    return;
  }

  cuerpo.innerHTML = filas.map(fila => {
    const [titulo, pie] = config.filaLista(fila);
    return '<button class="lista__fila" data-doc-id="' + seguro(fila.id) + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + titulo + '</span>' +
        '<span class="lista__pie">' + pie + '</span>' +
      '</span>' +
    '</button>';
  }).join('');

  buscarTodos('[data-doc-id]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const fila = filas.find(f => String(f.id) === boton.dataset.docId);
      if (fila) abrirDetalleDeDocumentoGuardado(tipo, fila, proveedor);
    });
  });
}

/**
 * El detalle de solo lectura de UN recibo o contrato ya generado.
 * Editar y Borrar están acá, nunca en la lista, y cada uno pide
 * confirmación explícita antes de hacer nada — ver la nota grande de
 * abrirListaDeDocumentos() sobre por qué.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} documento
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirDetalleDeDocumentoGuardado(tipo, documento, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const detalle = config.campos(documento).map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const botonesDeEstado = config.tieneEstado
    ? '<div class="acciones" style="margin-top:var(--esp-2)">' +
        '<button class="boton" data-marcar="enviado">Marcar enviado</button>' +
        '<button class="boton" data-marcar="firmado">Marcar firmado</button>' +
      '</div>'
    : '';

  const cuerpo = abrirHoja(
    config.tituloSingular + ' ' + (documento.numero || '#' + documento.id),
    '<div class="detalle">' + detalle + '</div>' +
    botonesDeEstado +
    (documento.archivo_id
      ? '<div class="acciones" style="margin-top:var(--esp-2)">' +
          '<button class="boton boton--principal" id="doc-ver-whatsapp">Enviar por WhatsApp</button>' +
        '</div>'
      : '') +
    '<p class="vacio__texto" style="margin-top:var(--esp-3)">' +
      'Ya se generó y se guardó: el PDF no cambia aunque edites estos datos. ' +
      'Si el monto o la fecha estaban mal de verdad, lo correcto es borrar ' +
      'este ' + config.tituloSingular.toLowerCase() + ' y generar uno nuevo.' +
    '</p>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="doc-borrar">Borrar</button>' +
      '<button class="boton" id="doc-editar">Editar datos</button>' +
    '</div>',
    () => abrirListaDeDocumentos(tipo, proveedor)
  );

  if (documento.archivo_id) {
    buscar('#doc-ver-whatsapp', cuerpo).addEventListener('click', () => {
      compartirArchivoPorWhatsApp(documento.archivo_id,
        config.tituloSingular + ' ' + (documento.numero || documento.id) + '.pdf',
        proveedor.telefono);
    });
  }

  buscarTodos('[data-marcar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        await mandar('recibos.php?accion=marcar_estado',
          { id: documento.id, estado: boton.dataset.marcar });
        avisar('Marcado como ' + boton.dataset.marcar + '.');
        documento.estado = boton.dataset.marcar;
        abrirDetalleDeDocumentoGuardado(tipo, documento, proveedor);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  // ⚡ FRICCIÓN INTENCIONAL: ni Editar ni Borrar hacen nada al primer
  // toque. Los dos piden confirmación explícita antes de seguir —un
  // documento ya generado no se toca con el mismo descuido que una nota.
  buscar('#doc-editar', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion(
      'Esto corrige solo los datos guardados; el PDF ya generado no cambia. ¿Seguro que quieres editar?'
    )) return;
    abrirEdicionDeDocumento(tipo, documento, proveedor);
  });

  buscar('#doc-borrar', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion(
      '¿Borrar este ' + config.tituloSingular.toLowerCase() + ' y su PDF? No se puede deshacer.'
    )) return;

    mandar(config.endpoint + '?accion=borrar', { id: documento.id })
      .then(() => {
        cerrarHoja(true);
        avisar(config.tituloSingular + ' eliminado.');
        abrirDetalleDeProveedor(proveedor);
      })
      .catch(error => avisar(error.message, true));
  });
}

/**
 * El formulario de edición de un documento ya guardado — solo se llega
 * acá DESPUÉS de confirmar en abrirDetalleDeDocumentoGuardado(). Reusa
 * los mismos campos según el tipo; guarda con ?accion=editar.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} documento
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirEdicionDeDocumento(tipo, documento, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const esRecibo = tipo === 'recibo';

  const cuerpo = abrirHoja('Editar ' + config.tituloSingular.toLowerCase(),
    esRecibo
      ? campoTexto({ id: 'ed-monto', rotulo: 'Monto', tipo: 'number', paso: '0.01',
                     valor: desdePesos(documento.monto) }) +
        campoLargo({ id: 'ed-concepto', rotulo: 'Concepto', valor: documento.concepto }) +
        campoTexto({ id: 'ed-forma', rotulo: 'Forma de pago', valor: documento.forma_pago }) +
        campoTexto({ id: 'ed-fecha', rotulo: 'Fecha', tipo: 'date', valor: documento.fecha })
      : campoTexto({ id: 'ed-monto', rotulo: 'Monto total', tipo: 'number', paso: '0.01',
                     valor: desdePesos(documento.monto_total) }) +
        campoLargo({ id: 'ed-descripcion', rotulo: 'Descripción del servicio',
                     valor: documento.descripcion_servicio }) +
        campoTexto({ id: 'ed-lugar', rotulo: 'Lugar', valor: documento.lugar }) +
    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const cambios = esRecibo
      ? {
          monto:      aPesos(valorDe('ed-monto', cuerpo)),
          concepto:   valorDe('ed-concepto', cuerpo),
          forma_pago: valorDe('ed-forma', cuerpo),
          fecha:      valorDe('ed-fecha', cuerpo),
        }
      : {
          monto_total:          aPesos(valorDe('ed-monto', cuerpo)),
          descripcion_servicio: valorDe('ed-descripcion', cuerpo),
          lugar:                valorDe('ed-lugar', cuerpo),
        };

    try {
      await mandar(config.endpoint + '?accion=editar',
        Object.assign({ id: documento.id }, cambios));
      cerrarHoja(true);
      avisar('Guardado.');
      abrirDetalleDeProveedor(proveedor);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Formulario de contrato de este proveedor. Casi todo viene pre-lleno
 * con lo que la ficha ya sabe: la idea es que aceptar los valores tal
 * cual, sin tocar nada, sea una opción real y rápida (ver la nota
 * grande en contratos.php sobre por qué). Es igual de opcional que
 * siempre — no bloquea ni pide nada para poder generar un recibo.
 *
 * @param {Object} proveedor
 * @returns {void}
 */
/** Cláusulas adicionales típicas de un contrato de servicio para una fiesta. */
const CLAUSULAS_SUGERIDAS = [
  'Confidencialidad: ninguna de las partes divulgará información privada de la otra conocida por este contrato.',
  'EL PRESTADOR podrá usar fotografías o video del evento con fines de promoción, salvo que LA CONTRATANTE lo prohíba expresamente por escrito.',
  'Ninguna de las partes será responsable por incumplimientos causados por caso fortuito o fuerza mayor.',
  'Cualquier modificación a este contrato deberá constar por escrito y estar firmada por ambas partes.',
  'EL PRESTADOR entregará el material adicional pactado (fotografías, video, recuerdos) en un plazo máximo de 30 días naturales tras el evento.',
];

/** Penalizaciones típicas por incumplimiento. */
const PENALIZACIONES_SUGERIDAS = [
  'Si EL PRESTADOR incumple sin causa justificada, reembolsará a LA CONTRATANTE la totalidad de lo ya entregado como anticipo.',
  'Por cada día de atraso injustificado en la entrega del servicio, EL PRESTADOR bonificará el 5% del monto total pactado.',
  'Si el servicio se entrega incompleto o de calidad menor a la pactada, LA CONTRATANTE podrá exigir un descuento proporcional.',
];

/** Políticas de cancelación típicas. */
const CANCELACION_SUGERIDA = [
  'Si LA CONTRATANTE cancela con 15 días naturales o menos de anticipación, el anticipo entregado no será reembolsable.',
  'Si LA CONTRATANTE cancela con 30 días naturales o más de anticipación, se reembolsará el 50% del anticipo entregado.',
  'La fecha del servicio podrá reprogramarse sin costo adicional si se avisa con al menos 30 días de anticipación y EL PRESTADOR tiene disponibilidad.',
  'Si es EL PRESTADOR quien cancela por cualquier motivo, reembolsará a LA CONTRATANTE la totalidad del anticipo entregado.',
];

function abrirGeneradorDeContrato(proveedor) {
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaDelEvento = (CONFIGURACION.fiesta.fechaYHora || '').slice(0, 10);
  const horaDelEvento = (CONFIGURACION.fiesta.fechaYHora || '').slice(11, 16);

  const descripcionSugerida = (proveedor.detalle_items && proveedor.detalle_items.length)
    ? 'Servicio de ' + proveedor.servicio + ', que incluye: '
      + proveedor.detalle_items.map(it => it.texto).join(', ') + '.'
    : 'Servicio de ' + proveedor.servicio + '.';

  const formaDePagoSugerida = (Number(proveedor.anticipo) || 0) > 0
    ? 'Anticipo de ' + comoDinero(proveedor.anticipo, false)
      + ' y el saldo restante contra entrega del servicio.'
    : 'A convenir entre las partes.';

  const cuerpo = abrirHoja('Contrato · ' + proveedor.nombre,
    '<button type="button" class="lista__fila" id="con-configurar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">⚙️ Numeración y datos de quien paga</span>' +
      '</span>' +
    '</button>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Ya viene lleno con lo que sabemos de este proveedor — revisa y ' +
      'ajusta lo que haga falta. Las cláusulas de abajo son sugerencias ' +
      'legales típicas: tilda las que quieras incluir, o escribe las tuyas.' +
    '</p>' +
    campoLargo({ id: 'con-descripcion', rotulo: 'Descripción del servicio',
                 valor: descripcionSugerida }) +
    /* Antes iban lado a lado en .campo-par: un input type="date" a media
       columna queda apretado (el navegador dibuja día/mes/año más el
       ícono del calendario, y a 50% de ancho en un teléfono se corta).
       Una fecha por renglón completo se ve entera siempre. */
    campoTexto({ id: 'con-fecha-evento', rotulo: 'Fecha del servicio', tipo: 'date',
                 valor: fechaDelEvento }) +
    campoTexto({ id: 'con-fecha-firma', rotulo: 'Fecha de firma', tipo: 'date',
                 valor: hoy }) +
    campoDinero({ id: 'con-monto', rotulo: 'Monto total',
                 valor: proveedor.monto_total ? desdePesos(proveedor.monto_total) : '' }) +
    campoLargo({ id: 'con-forma-pago', rotulo: 'Forma de pago', valor: formaDePagoSugerida }) +
    campoTexto({ id: 'con-lugar', rotulo: 'Lugar',
                 valor: CONFIGURACION.fiesta.lugar || '' }) +
    campoTexto({ id: 'con-horario', rotulo: 'Horario', tipo: 'time',
                 valor: horaDelEvento, pista: 'Opcional' }) +
    campoTexto({ id: 'con-identificacion', rotulo: 'RFC o identificación del proveedor',
                 pista: 'Opcional — si lo dejas vacío, no aparece en el contrato' }) +
    campoDeClausulas({ id: 'con-clausulas', rotulo: 'Cláusulas adicionales (opcional)',
                       opciones: CLAUSULAS_SUGERIDAS }) +
    campoDeClausulas({ id: 'con-penalizaciones', rotulo: 'Penalizaciones',
                       opciones: PENALIZACIONES_SUGERIDAS }) +
    campoDeClausulas({ id: 'con-cancelacion', rotulo: 'Política de cancelación',
                       opciones: CANCELACION_SUGERIDA }) +
    campoTexto({ id: 'con-jurisdiccion', rotulo: 'Jurisdicción', valor: 'México' }) +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="con-generar">' +
        'Generar PDF' +
      '</button>' +
    '</div>'
  );

  activarFormatoDeMiles('con-monto', cuerpo);

  buscar('#con-configurar', cuerpo).addEventListener('click', () => abrirConfiguracionDeDocumentos());

  buscar('#con-generar', cuerpo).addEventListener('click', async () => {
    const monto = aPesos(valorDe('con-monto', cuerpo));
    if (!monto || monto <= 0) {
      avisar('Poné un monto total mayor a cero.', true);
      return;
    }

    try {
      const resultado = await mandar('contratos.php?accion=generar', {
        proveedor_id:          proveedor.id,
        descripcion_servicio:  valorDe('con-descripcion', cuerpo),
        fecha_inicio:          valorDe('con-fecha-evento', cuerpo),
        fecha_firma:           valorDe('con-fecha-firma', cuerpo),
        monto_total:           monto,
        forma_pago:            valorDe('con-forma-pago', cuerpo),
        lugar:                 valorDe('con-lugar', cuerpo),
        horario:               valorDe('con-horario', cuerpo),
        proveedor_identificacion: valorDe('con-identificacion', cuerpo),
        clausulas_adicionales: valorDeClausulasDe('con-clausulas', cuerpo),
        penalizaciones:        valorDeClausulasDe('con-penalizaciones', cuerpo),
        cancelacion:           valorDeClausulasDe('con-cancelacion', cuerpo),
        jurisdiccion:          valorDe('con-jurisdiccion', cuerpo),
      });
      cerrarHoja(true);
      abrirResultadoDeDocumento(
        'Contrato ' + (resultado.numero ? resultado.numero + ' ' : '') + 'generado.',
        resultado.archivo_id, resultado.nombre, proveedor);
    } catch (error) {
      avisar(error.message, true);
    }
  });
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

    /* Aparte de las notas libres: acá va la lista de "qué trae" el
       proveedor, en renglones — no un párrafo. Ver 06-piezas.js. */
    campoListaDeDetalle({ id: 'pro-detalle', rotulo: 'Qué incluye',
                           items: d.detalle_items,
                           plantillas: plantillasSugeridasPara(d.servicio) }) +

    campoLargo({ id: 'pro-notas', rotulo: 'Notas', valor: d.notas }) +
    (proveedor ? botonesDeContacto(proveedor) : '') +
    pieDeFormulario('Guardar', !!proveedor)
  );

  if (proveedor) engancharBotonesDeContacto(cuerpo, proveedor);
  engancharListaDeDetalle('pro-detalle', cuerpo, plantillasSugeridasPara(d.servicio));

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('pro-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return {
      nombre:        nombre,
      servicio:      valorDe('pro-servicio', cuerpo),
      monto_total:   aPesos(valorDe('pro-total', cuerpo)),
      anticipo:      aPesos(valorDe('pro-anticipo', cuerpo)),
      estado:        valorDe('pro-estado', cuerpo),
      contacto:      valorDe('pro-contacto', cuerpo),
      telefono:      valorDe('pro-telefono', cuerpo),
      correo:        valorDe('pro-correo', cuerpo),
      paquete:       valorDe('pro-paquete', cuerpo),
      notas:         valorDe('pro-notas', cuerpo),
      detalle_items: valorDeListaDeDetalle('pro-detalle', cuerpo),
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

    /* Migra sola la primera vez que se abre: si ya tiene detalle_items
       (formato nuevo) se usa tal cual; si no, se parte el que_incluye
       viejo en renglones. Nada se borra hasta que se guarde. */
    campoListaDeDetalle({
      id: 'cot-incluye', rotulo: 'Qué incluye',
      items: (d.detalle_items && d.detalle_items.length)
        ? d.detalle_items : itemsDesdeTexto(d.que_incluye),
    }) +

    campoCasilla({ id: 'cot-elegida', rotulo: 'Es la que elegimos',
                   marcado: Number(d.elegida) === 1 }) +
    pieDeFormulario('Guardar', !!cotizacion)
  );

  engancharListaDeDetalle('cot-incluye', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const servicio  = valorDe('cot-servicio', cuerpo);
    const proveedor = valorDe('cot-proveedor', cuerpo);
    if (!servicio || !proveedor) {
      avisar('Falta el servicio o quién cotiza.', true);
      return null;
    }

    const items = valorDeListaDeDetalle('cot-incluye', cuerpo);

    return {
      servicio:      servicio,
      proveedor:     proveedor,
      tipo_precio:   valorDe('cot-tipo', cuerpo),
      monto:         aPesos(valorDe('cot-monto', cuerpo)),
      precio_pp:     aPesos(valorDe('cot-pp', cuerpo)),
      vigencia:      valorDe('cot-vigencia', cuerpo),
      telefono:      valorDe('cot-telefono', cuerpo),
      detalle_items: items,
      /* Espejo en texto plano: lo sigue leyendo el comparador viejo
         (21-cotizador.js, "Notas del paquete"). La fuente de verdad
         para editar es detalle_items; esto es solo para no dejarlo
         vacío mientras ese lector no se actualice también. */
      que_incluye:   items.map(it => it.texto).join('; '),
      elegida:       !!valorDe('cot-elegida', cuerpo),
    };
  }, 'cotizacion', cotizacion);
}
