/* ══════════════════════════════════════════════════════════════════════
   21 · COMPARADOR Y CALCULADORA DE COTIZACIONES

   QUÉ HACE ESTE ARCHIVO
   Pone dos o más presupuestos uno al lado del otro, calcula cuánto sale
   cada uno de verdad con la cantidad de invitados que haya, y muestra
   qué pasaría con el presupuesto si se elige ese.

   POR QUÉ NO ALCANZA CON MIRAR EL PRECIO POR PERSONA
   El paquete más barato por persona casi nunca es el más barato al
   final. En la planilla de Ania, SEEM Light sale $350 por persona y Alvi
   Bronce $550 — pero SEEM no incluye el DJ, que cuesta $17,900 aparte.
   Con 110 invitados esa diferencia se da vuelta. Esta pantalla existe
   para que esa vuelta se vea antes de firmar, no después.

   LA CALCULADORA ESTÁ ADENTRO, NO AL LADO
   Cambiar la cantidad de personas recalcula todo al instante. Eso ES la
   calculadora: no hace falta una aparte donde copiar números a mano y
   equivocarse al transcribirlos.

   ÍNDICE
     1. Estado y dibujado
     2. La comparación
     3. El detalle de una
     4. Los renglones
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió el servidor. */
let COMPARACION = null;

/** Qué servicio se está comparando. */
let SERVICIO_COMPARADO = '';

/** Con cuántas personas se está calculando. */
let PERSONAS_CALCULO = 0;


/* ─── 1. ESTADO Y DIBUJADO ─────────────────────────────────────────── */

/**
 * Abre el comparador.
 *
 * @returns {Promise<void>}
 */
async function abrirComparador() {
  const cuerpo = abrirHoja('Comparar cotizaciones',
    '<div id="comp-cuerpo"><div class="esqueleto"></div>'.repeat(1) + '</div>');

  let servicios;
  try {
    servicios = await traer('cotizador.php?accion=servicios');
  } catch (error) {
    buscar('#comp-cuerpo', cuerpo).innerHTML =
      '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  if (!servicios.length) {
    pintarVacio(buscar('#comp-cuerpo', cuerpo), 'Todavía no hay cotizaciones',
      'Cargá al menos dos del mismo servicio para poder compararlas.');
    return;
  }

  // Si hay un solo rubro, se entra directo: preguntar sobraría.
  if (servicios.length === 1) {
    SERVICIO_COMPARADO = servicios[0].servicio;
    compararServicio(cuerpo);
    return;
  }

  buscar('#comp-cuerpo', cuerpo).innerHTML =
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      '¿Qué querés comparar?</p>' +
    servicios.map(s =>
      '<button class="lista__fila" data-servicio="' + seguro(s.servicio) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(s.servicio) + '</span>' +
          '<span class="lista__pie">' +
            seguro(pluralizar(s.cuantas, 'cotización', 'cotizaciones')) + '</span>' +
        '</span>' +
        (Number(s.elegidas) > 0
          ? '<span class="lista__lado">' +
            '<span class="etiqueta etiqueta--bien">Ya elegiste</span></span>'
          : '') +
      '</button>'
    ).join('');

  buscarTodos('[data-servicio]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      SERVICIO_COMPARADO = boton.dataset.servicio;
      compararServicio(cuerpo);
    });
  });
}

/**
 * Pide la comparación y la pinta.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function compararServicio(cuerpo) {
  const caja = buscar('#comp-cuerpo', cuerpo);
  caja.innerHTML = '<div class="esqueleto"></div>'.repeat(3);

  const url = 'cotizador.php?accion=comparar&servicio=' +
              encodeURIComponent(SERVICIO_COMPARADO) +
              (PERSONAS_CALCULO ? '&personas=' + PERSONAS_CALCULO : '');

  try {
    COMPARACION = await traer(url);
    PERSONAS_CALCULO = COMPARACION.personas;
  } catch (error) {
    pintarError(caja, error.message, () => compararServicio(cuerpo));
    return;
  }

  buscar('#hoja-titulo').textContent = SERVICIO_COMPARADO;
  pintarComparacion(caja, cuerpo);
}


/* ─── 2. LA COMPARACIÓN ────────────────────────────────────────────── */

/**
 * Pinta las columnas, una por cotización.
 *
 * @param {Element} caja
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarComparacion(caja, cuerpo) {
  const cotizaciones = COMPARACION.cotizaciones || [];
  const masBarata = cotizaciones[0];

  caja.innerHTML =
    /* El control de personas es la calculadora: mover ese número
       recalcula las columnas enteras. */
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Calculado para</div>' +
      '<div style="display:flex;align-items:center;gap:var(--esp-2)">' +
        '<button class="boton boton--chico" id="comp-menos">−10</button>' +
        '<input type="number" id="comp-personas" class="campo__control" ' +
               'style="text-align:center;flex:1" value="' +
               seguro(PERSONAS_CALCULO) + '">' +
        '<button class="boton boton--chico" id="comp-mas">+10</button>' +
      '</div>' +
      '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
        'personas. Cambialo y se recalcula todo.</p>' +
    '</div>' +

    (COMPARACION.diferencia > 0
      ? '<p class="vacio__texto" style="text-align:center;margin:var(--esp-2) 0">' +
        'Entre la más barata y la más cara hay <strong style="color:var(--oro)">' +
        seguro(comoDinero(COMPARACION.diferencia, false)) + '</strong> de diferencia.' +
        '</p>'
      : '') +

    /* Las columnas se desplazan de lado. Es la única parte de la app
       donde eso está bien: una tabla comparativa NECESITA el ancho, y
       la flecha de "hay más" se entiende porque las columnas están
       cortadas a propósito en el borde. */
    '<div class="comparador">' +
      cotizaciones.map((c, i) => columnaDeCotizacion(c, i === 0, masBarata)).join('') +
    '</div>' +

    bloqueImpactoEnPresupuesto(cotizaciones);

  /* ─── Enganches ─────────────────────────────────────────────────── */
  const campo = buscar('#comp-personas', cuerpo);

  const recalcular = cuantas => {
    PERSONAS_CALCULO = Math.max(1, Math.min(2000, cuantas));
    campo.value = PERSONAS_CALCULO;
    compararServicio(cuerpo);
  };

  buscar('#comp-menos', cuerpo).addEventListener('click',
    () => recalcular(PERSONAS_CALCULO - 10));
  buscar('#comp-mas', cuerpo).addEventListener('click',
    () => recalcular(PERSONAS_CALCULO + 10));

  /* Se espera a que deje de escribir antes de recalcular: si no, tipear
     "110" dispararía tres consultas, una por dígito. */
  let reloj = null;
  campo.addEventListener('input', () => {
    clearTimeout(reloj);
    reloj = setTimeout(() => recalcular(Number(campo.value) || 1), 500);
  });

  buscarTodos('[data-ver-cot]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      abrirDetalleDeCotizacion(Number(boton.dataset.verCot), cuerpo));
  });

  buscarTodos('[data-elegir-cot]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      pasarAlPresupuesto(Number(boton.dataset.elegirCot)));
  });
}

/**
 * Una columna del comparador.
 *
 * @param {Object} c
 * @param {boolean} esLaMasBarata
 * @param {Object} masBarata
 * @returns {string} HTML
 */
function columnaDeCotizacion(c, esLaMasBarata, masBarata) {
  const diferencia = c.total - masBarata.total;

  const vencida = c.vigencia && diasHasta(c.vigencia) < 0;

  return '' +
    '<div class="comparador__columna' +
      (esLaMasBarata ? ' comparador__columna--gana' : '') + '">' +

      '<div class="comparador__titulo">' + seguro(c.proveedor) + '</div>' +

      (esLaMasBarata
        ? '<span class="etiqueta etiqueta--bien">La más barata</span>'
        : '<span class="etiqueta etiqueta--tenue">+' +
          seguro(comoDinero(diferencia, false)) + '</span>') +

      (c.elegida ? '<span class="etiqueta etiqueta--info">Elegida</span>' : '') +
      (vencida ? '<span class="etiqueta etiqueta--alerta">Vencida</span>' : '') +

      '<div class="comparador__total cifra">' +
        seguro(comoDinero(c.total, false)) +
      '</div>' +

      '<div class="comparador__renglon">' +
        '<span>Por persona</span>' +
        '<span class="cifra">' + seguro(comoDinero(c.real_pp, false)) + '</span>' +
      '</div>' +

      '<div class="comparador__renglon">' +
        '<span>Base</span>' +
        '<span class="cifra">' + seguro(comoDinero(c.base, false)) + '</span>' +
      '</div>' +

      (c.extras > 0
        ? '<div class="comparador__renglon">' +
            '<span>Extras</span>' +
            '<span class="cifra">' + seguro(comoDinero(c.extras, false)) + '</span>' +
          '</div>'
        : '') +

      (c.comisiones > 0
        ? '<div class="comparador__renglon">' +
            '<span>Comisión</span>' +
            '<span class="cifra">' + seguro(comoDinero(c.comisiones, false)) + '</span>' +
          '</div>'
        : '') +

      (c.incluidos.length
        ? '<div class="comparador__incluye">Incluye ' + c.incluidos.length +
          ' cosas</div>'
        : '') +

      '<button class="boton boton--chico boton--ancho" data-ver-cot="' +
              seguro(c.id) + '" style="margin-top:var(--esp-1)">Ver detalle</button>' +

      '<button class="boton boton--chico boton--principal boton--ancho" ' +
              'data-elegir-cot="' + seguro(c.id) + '" ' +
              'style="margin-top:4px">Elegir</button>' +
    '</div>';
}

/**
 * Qué pasa con el presupuesto si se elige cada una.
 *
 * @param {Array} cotizaciones
 * @returns {string} HTML
 */
function bloqueImpactoEnPresupuesto(cotizaciones) {
  const p = COMPARACION.presupuesto;
  if (!p || !cotizaciones.length) return '';

  const masBarata = cotizaciones[0];
  const masCara   = cotizaciones[cotizaciones.length - 1];

  /* Solo tiene sentido hablar de "te pasás" si hay un techo puesto. Sin
     techo, mostrar un porcentaje de nada sería inventar. */
  if (!p.techo) {
    return '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">En el presupuesto</div>' +
      '<p class="vacio__texto">Llevás ' + seguro(comoDinero(p.gastado, false)) +
      ' gastados. Poné techos por categoría en Presupuesto para ver si esto ' +
      'te alcanza.</p></div>';
  }

  const conMasBarata = p.gastado + masBarata.total;
  const conMasCara   = p.gastado + masCara.total;
  const pct = Math.round(conMasBarata / p.techo * 100);

  return '' +
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">En el presupuesto</div>' +

      '<div class="comparador__renglon">' +
        '<span>Llevás gastado</span>' +
        '<span class="cifra">' + seguro(comoDinero(p.gastado, false)) + '</span>' +
      '</div>' +
      '<div class="comparador__renglon">' +
        '<span>Con la más barata</span>' +
        '<span class="cifra">' + seguro(comoDinero(conMasBarata, false)) + '</span>' +
      '</div>' +
      (cotizaciones.length > 1
        ? '<div class="comparador__renglon">' +
            '<span>Con la más cara</span>' +
            '<span class="cifra">' + seguro(comoDinero(conMasCara, false)) + '</span>' +
          '</div>'
        : '') +
      '<div class="comparador__renglon">' +
        '<span>Techo total</span>' +
        '<span class="cifra">' + seguro(comoDinero(p.techo, false)) + '</span>' +
      '</div>' +

      '<div class="barra" style="margin-top:var(--esp-1)">' +
        '<div class="barra__relleno' +
          (conMasBarata > p.techo ? ' barra__relleno--pasado' : '') +
          '" style="width:' + Math.min(100, pct) + '%"></div>' +
      '</div>' +

      (conMasBarata > p.techo
        ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
          'Aun con la más barata te pasás por ' +
          seguro(comoDinero(conMasBarata - p.techo, false)) + '.</p>'
        : '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'Con la más barata quedarías al ' + pct + '% del techo.</p>') +
    '</div>';
}


/* ─── 3. EL DETALLE DE UNA ─────────────────────────────────────────── */

/**
 * Muestra el desglose completo de una cotización.
 *
 * @param {number} id
 * @param {Element} volver
 * @returns {Promise<void>}
 */
async function abrirDetalleDeCotizacion(id, volver) {
  const cuerpo = abrirHoja('Cargando…', '<div class="esqueleto"></div>'.repeat(3));

  let datos;
  try {
    datos = await traer('cotizador.php?accion=ver&id=' + id +
                        '&personas=' + PERSONAS_CALCULO);
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirDetalleDeCotizacion(id, volver));
    return;
  }

  const c = datos.calculo;
  buscar('#hoja-titulo').textContent = c.proveedor;

  const tipos = {
    por_persona: 'por persona',
    fijo: 'fijo',
    por_unidad: 'por unidad',
    porcentaje: '% del total',
  };

  cuerpo.innerHTML =
    '<div class="tarjeta">' +
      '<div class="comparador__renglon">' +
        '<span>' + (c.tipo_precio === 'por_persona'
          ? 'Base (' + seguro(comoDinero(c.precio_pp, false)) + ' × ' +
            seguro(c.personas) + ')'
          : 'Precio cerrado') + '</span>' +
        '<span class="cifra">' + seguro(comoDinero(c.base, false)) + '</span>' +
      '</div>' +

      c.detalle.map(d =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(d.concepto) +
            ' <span class="vacio__texto">(' + seguro(tipos[d.tipo] || d.tipo) +
            ')</span></span>' +
          '<span class="cifra">' + seguro(comoDinero(d.subtotal, false)) + '</span>' +
        '</div>'
      ).join('') +

      '<div class="comparador__renglon" style="border-top:1px solid var(--oro);' +
           'margin-top:var(--esp-1);padding-top:var(--esp-1);font-weight:700">' +
        '<span>Total</span>' +
        '<span class="cifra" style="color:var(--oro)">' +
          seguro(comoDinero(c.total, false)) + '</span>' +
      '</div>' +
    '</div>' +

    (c.incluidos.length
      ? '<div class="tarjeta">' +
          '<div class="tarjeta__titulo">Ya incluido</div>' +
          '<div class="menus-mini">' +
            c.incluidos.map(i =>
              '<span class="etiqueta etiqueta--bien">' + seguro(i) + '</span>'
            ).join(' ') +
          '</div>' +
        '</div>'
      : '') +

    (c.que_incluye
      ? '<div class="tarjeta"><div class="tarjeta__titulo">Notas del paquete</div>' +
        '<p style="white-space:pre-wrap">' + seguro(c.que_incluye) + '</p></div>'
      : '') +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      'Renglones' +
    '</div>' +

    (datos.items.length
      ? datos.items.map(item => renglonDeCotizacion(item, tipos)).join('')
      : '<p class="vacio__texto">Todavía no cargaste renglones. Agregá los ' +
        'extras y lo que ya viene incluido para que el total sea real.</p>') +

    '<button class="boton boton--ancho" id="cot-item-nuevo" ' +
            'style="margin-top:var(--esp-2)">Agregar un renglón</button>';

  /* ─── Enganches ─────────────────────────────────────────────────── */
  buscarTodos('[data-item-activar]', cuerpo).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      try {
        await mandar('cotizador.php?accion=activar_item',
                     { id: casilla.dataset.itemActivar });
        abrirDetalleDeCotizacion(id, volver);
      } catch (error) {
        casilla.checked = !casilla.checked;
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-item-editar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const item = datos.items.find(i => String(i.id) === boton.dataset.itemEditar);
      formularioDeRenglon(id, item, () => abrirDetalleDeCotizacion(id, volver));
    });
  });

  buscar('#cot-item-nuevo', cuerpo).addEventListener('click', () =>
    formularioDeRenglon(id, null, () => abrirDetalleDeCotizacion(id, volver)));
}

/**
 * Un renglón en la lista de detalle.
 *
 * @param {Object} item
 * @param {Object} tipos
 * @returns {string} HTML
 */
function renglonDeCotizacion(item, tipos) {
  const incluido = Number(item.incluido) === 1;
  const activo   = Number(item.activo) === 1;

  const cuanto = incluido
    ? 'Incluido'
    : (item.tipo === 'porcentaje'
        ? item.monto + '%'
        : comoDinero(item.monto, false) +
          (item.tipo === 'por_persona' ? ' pp' : '') +
          (item.tipo === 'por_unidad' ? ' × ' + item.unidades : ''));

  return '' +
    '<div class="lista__fila"' + (activo || incluido ? '' : ' style="opacity:.5"') + '>' +
      (incluido
        ? '<span class="etiqueta etiqueta--bien">✓</span>'
        : '<input type="checkbox" style="width:20px;height:20px;' +
                 'accent-color:var(--oro)" ' + (activo ? 'checked ' : '') +
                 'data-item-activar="' + seguro(item.id) + '" ' +
                 'aria-label="Contar este extra">') +

      '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
              'data-item-editar="' + seguro(item.id) + '">' +
        '<span class="lista__titulo">' + seguro(item.concepto) + '</span>' +
        '<span class="lista__pie">' +
          seguro((tipos[item.tipo] || item.tipo) +
                 (item.notas ? ' · ' + item.notas : '')) + '</span>' +
      '</button>' +

      '<span class="lista__lado cifra">' + seguro(cuanto) + '</span>' +
    '</div>';
}


/* ─── 4. LOS RENGLONES ─────────────────────────────────────────────── */

/**
 * Formulario de un renglón.
 *
 * @param {number} cotizacionId
 * @param {Object} [item]
 * @param {Function} despues
 * @returns {void}
 */
function formularioDeRenglon(cotizacionId, item, despues) {
  const d = item || {};

  const cuerpo = abrirHoja(item ? 'Editar renglón' : 'Nuevo renglón',
    campoTexto({ id: 'ren-concepto', rotulo: 'Qué es', valor: d.concepto,
                 pista: 'DJ profesional, copa de vino…' }) +

    campoLista({ id: 'ren-tipo', rotulo: 'Cómo se cobra',
                 valor: d.tipo || 'fijo',
                 opciones: [
                   { valor: 'fijo',        texto: 'Precio fijo' },
                   { valor: 'por_persona', texto: 'Por persona' },
                   { valor: 'por_unidad',  texto: 'Por unidad' },
                   { valor: 'porcentaje',  texto: 'Porcentaje del total' },
                 ] }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'ren-monto', rotulo: 'Monto', tipo: 'number',
                   paso: '0.01', valor: d.monto || '' }) +
      campoTexto({ id: 'ren-unidades', rotulo: 'Unidades', tipo: 'number',
                   valor: d.unidades || 1,
                   ayuda: 'Solo si se cobra por unidad.' }) +
    '</div>' +

    campoCasilla({ id: 'ren-incluido', rotulo: 'Ya viene incluido en el paquete',
                   marcado: Number(d.incluido) === 1 }) +

    campoTexto({ id: 'ren-categoria', rotulo: 'Categoría', valor: d.categoria,
                 pista: 'Banquete, Decoración, Entretenimiento…' }) +
    campoTexto({ id: 'ren-notas', rotulo: 'Notas', valor: d.notas }) +

    pieDeFormulario('Guardar', !!item)
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const concepto = valorDe('ren-concepto', cuerpo);
    if (!concepto) { avisar('Falta el concepto.', true); return; }

    const carga = {
      cotizacion_id: cotizacionId,
      concepto:  concepto,
      tipo:      valorDe('ren-tipo', cuerpo),
      monto:     valorDe('ren-monto', cuerpo),
      unidades:  valorDe('ren-unidades', cuerpo),
      incluido:  !!valorDe('ren-incluido', cuerpo),
      categoria: valorDe('ren-categoria', cuerpo),
      notas:     valorDe('ren-notas', cuerpo),
    };
    if (item) carga.id = item.id;

    try {
      await mandar('cotizador.php?accion=guardar_item', carga);
      cerrarHoja();
      avisar('Guardado.');
      despues();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar este renglón?')) return;
      try {
        await mandar('cotizador.php?accion=borrar_item', { id: item.id });
        cerrarHoja();
        avisar('Renglón eliminado.');
        despues();
      } catch (error) { avisar(error.message, true); }
    });
  }
}

/**
 * Pasa una cotización al presupuesto como gasto.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
async function pasarAlPresupuesto(id) {
  const c = (COMPARACION.cotizaciones || []).find(x => x.id === id);
  if (!c) return;

  if (!confirmarAccion(
    '¿Elegir ' + c.proveedor + '?\n\n' +
    'Se va a agregar al presupuesto como un gasto de ' +
    comoDinero(c.total, false) + ' y se marca como la elegida.'
  )) return;

  try {
    const r = await mandar('cotizador.php?accion=a_presupuesto',
                           { id: id, personas: PERSONAS_CALCULO });
    cerrarHoja();
    avisar(r.mensaje);
    ensuciarVistas('resumen', 'dinero');
    SECCION_DINERO = 'gastos';
    irA('dinero', true);
  } catch (error) {
    avisar(error.message, true);
  }
}
