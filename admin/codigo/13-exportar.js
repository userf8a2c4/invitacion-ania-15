/* ══════════════════════════════════════════════════════════════════════
   13 · EXPORTAR

   QUÉ HACE ESTE ARCHIVO
   Convierte cualquier lista del panel en un archivo descargable: CSV,
   Excel, texto simple o PDF.

   POR QUÉ SE ARMA EN EL TELÉFONO Y NO EN EL SERVIDOR
   Porque los datos ya están en la pantalla: pedírselos otra vez al
   servidor sería un viaje de ida y vuelta para algo que ya se tiene. Y
   porque así funciona incluso con mala señal.

   CÓMO SE HACE CADA FORMATO
     · CSV   → texto separado por comas. Lo abre todo.
     · Excel → una tabla HTML con extensión .xls. Excel la abre como
               planilla de verdad, con celdas. Es el truco estándar para
               generar Excel sin una biblioteca de 500 KB.
     · TXT   → columnas alineadas con espacios, para leer de un vistazo.
     · PDF   → se abre una ventana con el documento ya formateado y se
               usa la impresión del sistema, que en cualquier teléfono
               ofrece "Guardar como PDF". Sin bibliotecas externas.

   ÍNDICE
     1. Bajar un archivo
     2. Los cuatro formatos
     3. Exportadores de cada pantalla
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. BAJAR UN ARCHIVO ──────────────────────────────────────────── */

/**
 * Dispara la descarga de un texto como archivo.
 *
 * @param {string} nombre - Con extensión.
 * @param {string} contenido
 * @param {string} tipo - El tipo MIME.
 * @returns {void}
 */
function bajarArchivo(nombre, contenido, tipo) {
  /* El BOM (﻿) es lo que hace que Excel abra el archivo con los
     acentos bien. Sin él, "María" se ve como "MarÃ­a". */
  const bolsa = new Blob(['﻿' + contenido], { type: tipo + ';charset=utf-8' });
  const url   = URL.createObjectURL(bolsa);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  // Liberar la memoria del blob; si no, queda retenida hasta recargar.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  avisar('Descargando ' + nombre);
}


/* ─── 2. LOS CUATRO FORMATOS ───────────────────────────────────────── */

/**
 * Escapa un valor para CSV.
 *
 * Si el texto tiene comas, comillas o saltos de línea hay que envolverlo
 * en comillas y duplicar las que lleve adentro. Sin esto, una nota con
 * una coma parte la fila en dos columnas y desalinea toda la planilla.
 *
 * @param {*} valor
 * @returns {string}
 */
function paraCsv(valor) {
  const texto = String(valor === null || valor === undefined ? '' : valor);
  if (/[",\n\r]/.test(texto)) return '"' + texto.replace(/"/g, '""') + '"';
  return texto;
}

/**
 * Arma un CSV.
 *
 * @param {string[]} encabezados
 * @param {Array[]} filas
 * @returns {string}
 */
function armarCsv(encabezados, filas) {
  return [encabezados.map(paraCsv).join(',')]
    .concat(filas.map(fila => fila.map(paraCsv).join(',')))
    .join('\r\n');
}

/**
 * Arma un archivo que Excel abre como hoja de cálculo.
 *
 * @param {string} titulo
 * @param {Array} bloques - [{ titulo, encabezados, filas }]
 * @returns {string}
 */
function armarExcel(titulo, bloques) {
  const tablas = bloques.map(bloque =>
    '<h2>' + seguro(bloque.titulo) + '</h2>' +
    '<table border="1">' +
      '<tr>' + bloque.encabezados.map(h =>
        '<th style="background:#f0dca2">' + seguro(h) + '</th>').join('') + '</tr>' +
      bloque.filas.map(fila =>
        '<tr>' + fila.map(c => '<td>' + seguro(c) + '</td>').join('') + '</tr>'
      ).join('') +
    '</table><br>'
  ).join('');

  return '<html xmlns:x="urn:schemas-microsoft-com:office:excel">' +
         '<head><meta charset="UTF-8"></head><body>' +
         '<h1>' + seguro(titulo) + '</h1>' + tablas +
         '</body></html>';
}

/**
 * Arma texto simple con las columnas alineadas.
 *
 * @param {string} titulo
 * @param {Array} bloques
 * @returns {string}
 */
function armarTxt(titulo, bloques) {
  const lineas = [titulo, '='.repeat(titulo.length), ''];

  bloques.forEach(bloque => {
    lineas.push(bloque.titulo, '-'.repeat(bloque.titulo.length));

    if (!bloque.filas.length) {
      lineas.push('(vacío)', '');
      return;
    }

    /* Se mide la columna más ancha de cada una para poder alinearlas.
       Sin esto las columnas bailan y la tabla no se lee. */
    const anchos = bloque.encabezados.map((h, i) =>
      Math.max(String(h).length,
               ...bloque.filas.map(f => String(f[i] === undefined ? '' : f[i]).length))
    );

    const renglon = celdas => celdas
      .map((c, i) => String(c === undefined ? '' : c).padEnd(anchos[i]))
      .join('  ').trimEnd();

    lineas.push(renglon(bloque.encabezados));
    lineas.push(anchos.map(a => '-'.repeat(a)).join('  '));
    bloque.filas.forEach(f => lineas.push(renglon(f)));
    lineas.push('');
  });

  return lineas.join('\r\n');
}

/**
 * Con qué nombre y fecha sugerir el archivo al "Guardar como PDF" del
 * navegador — que usa el <title> de la página como nombre sugerido.
 * Sin la fecha, guardar dos resúmenes en semanas distintas termina en
 * "Resumen ejecutivo.pdf" y "Resumen ejecutivo (1).pdf", indistinguibles
 * a simple vista un mes después.
 *
 * @param {string} base - El título limpio, sin fecha.
 * @returns {string}
 */
function nombreConFechaYHora(base) {
  const ahora = new Date();
  const dos = n => String(n).padStart(2, '0');

  return base + ' · ' +
    ahora.getFullYear() + '-' + dos(ahora.getMonth() + 1) + '-' + dos(ahora.getDate()) +
    ' ' + dos(ahora.getHours()) + 'h' + dos(ahora.getMinutes());
}

/**
 * Abre una ventana lista para imprimir o guardar como PDF.
 *
 * @param {string} titulo - El encabezado visible en la hoja (sin fecha).
 * @param {Array} bloques
 * @returns {void}
 */
function armarPdf(titulo, bloques) {
  const ventana = window.open('', '_blank');

  if (!ventana) {
    avisar('El navegador bloqueó la ventana. Permite las ventanas emergentes.', true);
    return;
  }

  /* Un bloque de una sola columna (ej. "Lectura del asesor") se lee mejor
     como párrafos corridos que como una tabla con un único encabezado
     repetido en cada fila — por eso `parrafos` se detecta acá y se salta
     la tabla entera para ese bloque. */
  const tablas = bloques.map(bloque => {
    const esDeParrafos = bloque.encabezados.length === 1 &&
      bloque.filas.every(f => f.length === 1);

    return '<h2>' + seguro(bloque.titulo) + '</h2>' +
      (!bloque.filas.length
        ? '<p>(vacío)</p>'
        : esDeParrafos
          ? bloque.filas.map(f => '<p class="lectura">' + seguro(f[0]) + '</p>').join('')
          : '<table>' +
              '<thead><tr>' + bloque.encabezados.map(h =>
                '<th>' + seguro(h) + '</th>').join('') + '</tr></thead>' +
              '<tbody>' + bloque.filas.map(fila =>
                '<tr>' + fila.map(c => '<td>' + seguro(c) + '</td>').join('') + '</tr>'
              ).join('') + '</tbody>' +
            '</table>');
  }).join('');

  ventana.document.write(
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<title>' + seguro(nombreConFechaYHora(titulo)) + '</title><style>' +
      // Impreso en papel: fondo blanco y letra negra, no la paleta oscura.
      'body{font-family:Georgia,serif;color:#222;padding:24px;}' +
      'h1{color:#8a6a2c;border-bottom:2px solid #d4a843;padding-bottom:8px;}' +
      'h2{color:#8a6a2c;margin-top:24px;font-size:15px;}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;}' +
      'th{background:#fdf3e3;text-align:left;border:1px solid #e8d5b0;padding:6px;}' +
      'td{border:1px solid #eee;padding:6px;}' +
      // Que una tabla no se parta a la mitad entre dos hojas.
      'table{page-break-inside:auto;} tr{page-break-inside:avoid;}' +
      // La lectura del asesor: párrafo corrido, no fila de tabla.
      '.lectura{line-height:1.5;margin:0 0 10px;padding-left:12px;' +
        'border-left:3px solid #d4a843;}' +
      '@media print{ body{padding:0;} }' +
    '</style></head><body>' +
    '<h1>' + seguro(titulo) + '</h1>' +
    '<p style="font-size:12px;color:#888">Generado el ' +
      seguro(new Date().toLocaleString(CONFIGURACION.dinero.region)) + '</p>' +
    tablas +
    '</body></html>'
  );
  ventana.document.close();

  // Un instante para que termine de renderizar antes de abrir el diálogo.
  setTimeout(() => ventana.print(), 400);
}

/**
 * Descarga un conjunto de bloques en el formato pedido.
 *
 * @param {string} formato - 'csv' | 'excel' | 'txt' | 'pdf'
 * @param {string} nombreBase - Sin extensión.
 * @param {string} titulo
 * @param {Array} bloques - [{ titulo, encabezados, filas }]
 * @returns {void}
 */
function exportar(formato, nombreBase, titulo, bloques) {
  if (formato === 'pdf') { armarPdf(titulo, bloques); return; }

  // Mismo motivo que en el PDF: sin fecha, dos descargas de semanas
  // distintas se pisan o quedan indistinguibles ("(1)", "(2)"…).
  const ahora = new Date();
  const dos = n => String(n).padStart(2, '0');
  nombreBase += '-' + ahora.getFullYear() + dos(ahora.getMonth() + 1) + dos(ahora.getDate()) +
                '-' + dos(ahora.getHours()) + dos(ahora.getMinutes());

  if (formato === 'excel') {
    bajarArchivo(nombreBase + '.xls', armarExcel(titulo, bloques),
                 'application/vnd.ms-excel');
    return;
  }

  if (formato === 'txt') {
    bajarArchivo(nombreBase + '.txt', armarTxt(titulo, bloques), 'text/plain');
    return;
  }

  /* El CSV es un archivo de UNA tabla: no admite varios bloques. Cuando
     hay más de uno se los pega uno debajo del otro, separados por una
     línea con el nombre del bloque. Excel lo abre igual y se entiende. */
  const partes = bloques.map(bloque =>
    paraCsv(bloque.titulo) + '\r\n' + armarCsv(bloque.encabezados, bloque.filas)
  );
  bajarArchivo(nombreBase + '.csv', partes.join('\r\n\r\n'), 'text/csv');
}


/* ─── 3. EXPORTADORES DE CADA PANTALLA ─────────────────────────────── */

/**
 * Descarga el presupuesto completo.
 *
 * @param {string} formato
 * @returns {void}
 */
function exportarPresupuesto(formato) {
  if (!DINERO) { avisar('Todavía no cargaron los datos.', true); return; }

  const moneda = CONFIGURACION.dinero.monedas[monedaElegida()].rotulo;

  // Los montos van como número puro, sin símbolo: así Excel los suma.
  const monto = v => desdePesos(v);

  const bloques = [
    {
      titulo: 'Resumen',
      encabezados: ['Concepto', 'Monto (' + moneda + ')'],
      filas: [
        ['Presupuestado',        monto(DINERO.totales.planeado)],
        ['Costo real',           monto(DINERO.totales.costo)],
        ['De tu bolsillo',       monto(DINERO.totales.propio)],
        ['Cubren los padrinos',  monto(DINERO.totales.de_padrinos)],
        ['Pagado',               monto(DINERO.totales.pagado)],
        ['Por pagar',            monto(DINERO.totales.por_pagar)],
      ],
    },
    {
      titulo: 'Categorías',
      encabezados: ['Categoría', 'Techo (' + moneda + ')', 'Gastado (' + moneda + ')'],
      filas: DINERO.categorias.map(c => [c.nombre, monto(c.techo), monto(c.gastado)]),
    },
    {
      titulo: 'Gastos',
      encabezados: ['Concepto', 'Categoría', 'Proveedor', 'Padrino',
                    'Presupuestado (' + moneda + ')', 'Real (' + moneda + ')'],
      filas: DINERO.gastos.map(g => [
        g.concepto, g.categoria_nombre || '', g.proveedor_nombre || '',
        g.padrino_nombre || '', monto(g.presupuestado), monto(g.monto_real),
      ]),
    },
    {
      titulo: 'Pagos',
      encabezados: ['Concepto', 'Monto (' + moneda + ')', 'Vence', 'Estado', 'Método'],
      filas: DINERO.pagos.map(p => [
        p.concepto || p.gasto_concepto || '', monto(p.monto),
        p.fecha_limite || '', p.estado, p.metodo || '',
      ]),
    },
    {
      titulo: 'Padrinos',
      encabezados: ['Nombre', 'Apadrina', 'Aporte', 'Monto (' + moneda + ')',
                    'Estado', 'Teléfono'],
      filas: DINERO.padrinos.map(p => [
        p.nombre, p.apadrina || '', p.tipo_aporte, monto(p.monto),
        p.estado, p.telefono || '',
      ]),
    },
    {
      titulo: 'Proveedores',
      encabezados: ['Nombre', 'Servicio', 'Total (' + moneda + ')',
                    'Anticipo (' + moneda + ')', 'Estado', 'Teléfono'],
      filas: DINERO.proveedores.map(p => [
        p.nombre, p.servicio || '', monto(p.monto_total), monto(p.anticipo),
        p.estado, p.telefono || '',
      ]),
    },
    {
      titulo: 'Cotizaciones',
      encabezados: ['Servicio', 'Proveedor', 'Monto (' + moneda + ')',
                    'Vale hasta', 'Elegida'],
      filas: DINERO.cotizaciones.map(c => [
        c.servicio, c.proveedor, monto(c.monto), c.vigencia || '',
        Number(c.elegida) === 1 ? 'Sí' : '',
      ]),
    },
  ];

  exportar(formato, 'presupuesto-ania-xv',
           'Presupuesto · XV de Ania', bloques);
}

/**
 * El PDF de una reunión familiar: no la base de datos entera en tablas
 * (eso ya lo hace exportarPresupuesto → PDF), sino las pocas cifras que
 * importan para decidir algo, con la lectura y el criterio de un asesor
 * financiero — qué significa cada número, no solo cuál es.
 *
 * Reusa armarPdf() con bloques armados a mano en vez de volcar tablas
 * completas — mismo motor de impresión, contenido curado.
 *
 * @returns {void}
 */
function exportarResumenEjecutivoDinero() {
  if (!DINERO) { avisar('Todavía no cargaron los datos.', true); return; }

  const t = DINERO.totales;
  const monto = v => comoDinero(v, false);

  // Cuánto del presupuesto original ya se comprometió — el número que un
  // asesor mira primero para saber si todavía hay margen de maniobra.
  const pctComprometido = t.planeado > 0 ? Math.round((t.costo / t.planeado) * 100) : null;

  const panorama = [
    ['Costo total del evento',        monto(t.costo)],
    ['Presupuestado originalmente',   monto(t.planeado)],
    ['Desvío contra lo planeado',
      (t.costo > t.planeado ? '+' : '') + monto(t.costo - t.planeado) +
      (pctComprometido !== null ? ' (' + pctComprometido + '% de lo planeado)' : '')],
    ['Pagado hasta hoy',              monto(t.pagado)],
    ['Por pagar',                     monto(t.por_pagar) +
      (t.por_pagar_cuantos ? ' (' + t.por_pagar_cuantos +
        (t.por_pagar_cuantos === 1 ? ' pago pendiente)' : ' pagos pendientes)') : '')],
    ['Costo por invitado confirmado',
      t.costo_por_invitado === null || t.costo_por_invitado === undefined
        ? 'Todavía no hay confirmados'
        : monto(t.costo_por_invitado) + ' (' + (t.confirmados || 0) + ' personas)'],
  ];

  /* EL COMPROMISO DE LOS PADRINOS, COMPLETO.
   *
   * `de_padrinos` (lo que devuelve presupuesto.php) solo cuenta el dinero
   * de un padrino que YA está asignado a un gasto concreto — así que un
   * padrino recién cargado, con su monto prometido pero sin un gasto
   * todavía enlazado, no suma ahí y el reporte mostraba $0 aunque hubiera
   * padrinos reales con plata comprometida. Acá se sacan las capas por
   * separado, calculadas del propio arreglo de padrinos (ya viene
   * cargado, no hace falta pedirlo de nuevo): cuánto se PROMETIÓ en
   * total, cuánto ya ENTREGARON, y cuánto de eso ya quedó APLICADO a un
   * gasto puntual. Las tres cuentan una parte distinta de la misma
   * historia y ver solo una desorienta.
   *
   * "De tu bolsillo si nadie más entrega" usa `entregadoTotal` (calculado
   * acá mismo) y NO `t.bolsillo_si_nadie_mas_entrega` (que manda el
   * servidor): ese número del servidor resta solo lo YA APLICADO a un
   * gasto puntual, así que con aportes entregados pero todavía sin
   * asignar a un gasto (el caso más común: el padrino ya pagó, falta
   * cargar en qué se usó) mostraba el costo total completo como si nadie
   * hubiera entregado nada — contradecía a la propia fila de arriba. */
  const padrinosDinero = (DINERO.padrinos || []).filter(p => p.tipo_aporte === 'dinero');
  const prometidoTotal = padrinosDinero.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const entregadoTotal = padrinosDinero
    .filter(p => p.estado === 'entregado')
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const coberturaPct = t.costo > 0 ? Math.round((prometidoTotal / t.costo) * 100) : null;

  const padrinos = prometidoTotal > 0 || (t.de_padrinos > 0) ? [
    ['Comprometido en total (' + padrinosDinero.length +
      (padrinosDinero.length === 1 ? ' padrino)' : ' padrinos)'), monto(prometidoTotal) +
      (coberturaPct !== null ? ' (cubre ' + coberturaPct + '% del costo total)' : '')],
    ['Ya entregado',                     monto(entregadoTotal)],
    ['Todavía prometido, sin entregar',  monto(prometidoTotal - entregadoTotal) +
      (t.padrinos_pendientes_cuantos ? ' (' + t.padrinos_pendientes_cuantos + ')' : '')],
    ['  · de eso, ya aplicado a un gasto concreto', monto(t.de_padrinos)],
    ['De tu bolsillo si nadie más entrega', monto(Math.max(0, t.costo - entregadoTotal))],
  ] : [];

  // El desglose padrino por padrino: quién falta, no solo cuánto falta.
  const detallePadrinos = padrinosDinero
    .slice()
    .sort((a, b) => (a.estado === 'entregado') - (b.estado === 'entregado'))
    .map(p => [
      p.nombre,
      p.apadrina || '—',
      monto(p.monto),
      p.estado === 'entregado' ? 'Entregado'
        : p.estado === 'confirmado' ? 'Confirmado, sin entregar'
        : 'Solo hablado',
    ]);

  // Categorías al 85% de su techo o pasadas — lo único que amerita
  // frenar y decidir algo, no la lista completa de categorías sanas.
  const alertasTecho = (DINERO.categorias || [])
    .filter(c => Number(c.techo) > 0 &&
                 Number(c.gastado) / Number(c.techo) >= CONFIGURACION.dinero.avisarDesde)
    .map(c => [
      c.nombre,
      Number(c.gastado) > Number(c.techo) ? 'Pasada' : 'Cerca del techo',
      monto(c.gastado) + ' / ' + monto(c.techo),
    ]);

  const proximosPagos = (DINERO.pagos || [])
    .filter(p => p.estado !== 'pagado' && p.fecha_limite)
    .sort((a, b) => (a.fecha_limite < b.fecha_limite ? -1 : 1))
    .slice(0, 8)
    .map(p => [
      p.concepto || p.gasto_concepto || 'Pago',
      p.fecha_limite,
      diasHasta(p.fecha_limite) < 0 ? 'Atrasado' : 'Pendiente',
      monto(p.monto),
    ]);

  /* LA LECTURA, NO SOLO LOS NÚMEROS.
   *
   * Un asesor de verdad no entrega una planilla y se va: dice qué
   * significa. Estas dos o tres líneas se arman solas a partir de los
   * mismos datos de arriba — nunca inventan nada que la base no
   * respalde, solo lo traducen a una frase directa. */
  const lectura = [];

  if (t.costo > t.planeado && t.planeado > 0) {
    lectura.push('El costo real ya superó lo presupuestado por ' +
      monto(t.costo - t.planeado) + '. Vale revisar qué categoría se movió antes de seguir comprometiendo gasto.');
  } else if (t.planeado > 0) {
    lectura.push('El costo real sigue dentro de lo presupuestado, con ' +
      monto(t.planeado - t.costo) + ' de margen.');
  }

  if (prometidoTotal - entregadoTotal > 0) {
    lectura.push('Hay ' + monto(prometidoTotal - entregadoTotal) +
      ' prometidos por padrinos que todavía no entraron: hasta que eso se entregue, ese monto sale del bolsillo propio si hay que pagarlo antes.');
  }

  if (coberturaPct !== null && padrinosDinero.length) {
    lectura.push('Los padrinos cubren ' + coberturaPct + '% del costo total si todos entregan lo prometido' +
      (coberturaPct < 100 ? '; el ' + (100 - coberturaPct) + '% restante sale del bolsillo propio pase lo que pase.' : '.'));
  }

  if (t.por_pagar > 0) {
    lectura.push('Quedan ' + monto(t.por_pagar) + ' comprometidos en pagos pendientes' +
      (alertasTecho.length ? ', con ' + alertasTecho.length +
        (alertasTecho.length === 1 ? ' categoría' : ' categorías') + ' ya cerca o pasada de su techo' : '') + '.');
  } else {
    lectura.push('No hay pagos pendientes cargados en este momento.');
  }

  const bloques = [
    { titulo: 'Panorama general', encabezados: ['Concepto', 'Monto'], filas: panorama },
  ];

  if (padrinos.length) {
    bloques.push({ titulo: 'Compromiso de los padrinos',
      encabezados: ['Concepto', 'Monto'], filas: padrinos });
    bloques.push({ titulo: 'Padrino por padrino',
      encabezados: ['Padrino', 'Apadrina', 'Monto', 'Estado'],
      filas: detallePadrinos });
  }

  bloques.push(
    { titulo: 'Categorías cerca o pasadas de su techo',
      encabezados: ['Categoría', 'Situación', 'Gastado / Techo'],
      filas: alertasTecho },
    { titulo: 'Próximos pagos',
      encabezados: ['Concepto', 'Vence', 'Estado', 'Monto'],
      filas: proximosPagos },
    { titulo: 'Lectura del asesor',
      encabezados: ['Diagnóstico'],
      filas: lectura.map(l => [l]) },
  );

  armarPdf('Resumen ejecutivo · Presupuesto XV de Ania', bloques);
}

/**
 * Descarga la lista de invitados.
 *
 * @param {string} formato
 * @returns {void}
 */
function exportarInvitados(formato) {
  if (!INVITADOS || !INVITADOS.length) {
    avisar('Todavía no hay invitados que descargar.', true);
    return;
  }

  const visibles = INVITADOS.filter(invitadoPasaElFiltro);

  const bloques = [{
    titulo: 'Confirmaciones',
    encabezados: ['Nombre', 'Correo', 'Asiste', 'Adultos', 'Niños', 'Total',
                  'Menús', 'Alergias', 'Notas', 'Código', 'Fecha'],
    filas: visibles.map(f => [
      f.nombre || '', f.correo || '',
      Number(f.asiste) === 1 ? 'Sí' : 'No',
      f.adultos || 0, f.ninos || 0,
      (Number(f.adultos) || 0) + (Number(f.ninos) || 0),
      f.resumen_menus || '', f.alergias || '', f.notas || '',
      f.codigo || '', f.fecha_hora || '',
    ]),
  }];

  exportar(formato, 'invitados-ania-xv', 'Invitados · XV de Ania', bloques);
}

/**
 * Ofrece los cuatro formatos para una pantalla cualquiera.
 *
 * @param {string} titulo
 * @param {Function} queHacer - Recibe el formato elegido.
 * @returns {void}
 */
function abrirHojaDeFormatos(titulo, queHacer) {
  const cuerpo = abrirHoja(titulo,
    ['csv', 'excel', 'txt', 'pdf'].map(formato =>
      '<button class="boton boton--ancho" data-bajar="' + formato + '" ' +
              'style="margin-bottom:var(--esp-1)">' +
        seguro({ csv: 'CSV (para cualquier planilla)',
                 excel: 'Excel (.xls)',
                 txt: 'Texto simple (.txt)',
                 pdf: 'PDF (para imprimir)' }[formato]) +
      '</button>'
    ).join('')
  );

  buscarTodos('[data-bajar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      queHacer(boton.dataset.bajar);
      cerrarHoja(true);
    });
  });
}
