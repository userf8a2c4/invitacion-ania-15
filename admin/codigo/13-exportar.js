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
      /* Esta ventana la abre window.open() con el historial vacío: no
         hay ninguna página "de antes" a la que volver con el botón
         atrás del navegador — quedaba como un callejón sin salida,
         sobre todo en el celular, donde no siempre es obvio que esto
         es una pestaña nueva que se puede cerrar. window.close()
         funciona acá porque la ventana la abrió el propio script (los
         navegadores lo bloquean si no fue así). */
      '.volver{position:fixed;top:16px;right:16px;background:#8a6a2c;' +
        'color:#fff;border:0;border-radius:6px;padding:10px 18px;' +
        'font-family:Georgia,serif;font-size:14px;cursor:pointer;}' +
      '@media print{ body{padding:0;} .volver{display:none;} }' +
    '</style></head><body>' +
    '<button type="button" class="volver" onclick="window.close()">← Volver</button>' +
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
                    'Pagado (' + moneda + ')', 'Estado', 'Teléfono'],
      filas: DINERO.proveedores.map(p => [
        p.nombre, p.servicio || '', monto(p.monto_total), monto(p.pagado_real),
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
 * ⚡ AMPLIADO (2026-08-24), A PEDIDO DE UN BRIEF PUNTUAL: el informe
 * dejó de ser solo un estado de cuenta y pasó a ser herramienta de
 * decisión — desglose COMPLETO por categoría (antes solo mostraba las
 * cerca del techo), exposición restante real (aclara la confusión de
 * "por pagar $0"), 3 escenarios de padrinos, invitados + costo por
 * persona, flujo de caja de 90 días, semáforo por categoría, más
 * recomendaciones y un checklist de decisiones pendientes. Todo lo que
 * ya funcionaba (panorama, compromiso de padrinos, padrino por padrino,
 * categorías cerca del techo, próximos pagos, lectura) se dejó tal cual
 * y se agregó al lado — no se reescribió nada de eso.
 *
 * TODO SALE DE `DINERO`, YA CARGADO — nada de esto pide datos nuevos al
 * servidor, salvo la meta de invitados (ajustes.php, ver más abajo),
 * porque ese dato no existía en ningún lado todavía. Por eso la función
 * pasó a ser async: es la única espera real.
 *
 * @returns {Promise<void>}
 */
async function exportarResumenEjecutivoDinero() {
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

  /* EXPOSICIÓN RESTANTE REAL — aclara la confusión de "por pagar $0".
   *
   * `t.por_pagar` (arriba, en "Panorama general") solo suma pagos
   * PENDIENTES CON FECHA DE VENCIMIENTO CARGADA — si nadie anotó cuotas
   * todavía, da $0, y $0 ahí NO quiere decir "el evento ya está cubierto".
   * La exposición real es costo total menos lo que consta como pagado,
   * sin importar si hay una cuota anotada o no. Las dos cifras se
   * muestran juntas, a propósito, para que esa diferencia sea visible. */
  const exposicionRestante = Math.max(0, t.costo - t.pagado);

  /* Gastos con monto real cargado pero sin NINGÚN pago registrado — ni
   * pendiente ni pagado. Es una zona gris real (¿ya se pagó en efectivo
   * y no se anotó, o falta pagarlo?), así que se cuenta y se declara,
   * no se asume ninguna de las dos cosas. */
  const idsGastoConPago = new Set(
    (DINERO.pagos || []).filter(p => p.gasto_id).map(p => Number(p.gasto_id))
  );
  const gastosSinPago = (DINERO.gastos || [])
    .filter(g => Number(g.monto_real) > 0 && !idsGastoConPago.has(Number(g.id)));
  const montoGastosSinPago = gastosSinPago.reduce((s, g) => s + Number(g.monto_real), 0);

  /* DESGLOSE COMPLETO POR CATEGORÍA — todas, no solo las cerca del techo.
   * `comprometido` = lo gastado que todavía no tiene un pago 'pagado' en
   * contra (aproximación real dada la base: un pago no distingue a qué
   * PARTE del gasto cubre, así que se resta el total pagado del gasto
   * completo — con un solo pago total por gasto, que es el caso normal,
   * da exacto). Semáforo con el mismo umbral que ya usa toda la pantalla
   * (`CONFIGURACION.dinero.avisarDesde`), no uno inventado para el PDF. */
  const pagadoPorGasto = {};
  (DINERO.pagos || []).forEach(p => {
    if (!p.gasto_id || p.estado !== 'pagado') return;
    const id = Number(p.gasto_id);
    pagadoPorGasto[id] = (pagadoPorGasto[id] || 0) + Number(p.monto);
  });
  const SEMAFORO_TEXTO = { rojo: '🔴 Rojo', amarillo: '🟡 Cerca', verde: '🟢 Bien', sin_techo: '⚪ Sin techo' };
  const categoriasCompletas = (DINERO.categorias || []).map(c => {
    const techo = Number(c.techo) || 0;
    const gastado = Number(c.gastado) || 0;
    const pagadoCategoria = (DINERO.gastos || [])
      .filter(g => Number(g.categoria_id) === Number(c.id))
      .reduce((s, g) => s + (pagadoPorGasto[Number(g.id)] || 0), 0);
    const comprometido = Math.max(0, gastado - pagadoCategoria);
    // Mismo umbral que toda la pantalla de dinero — ver semaforoDeCategoria()
    // en 02-utilidades.js, compartida con el agente de dinero.
    const semaforo = semaforoDeCategoria(c);
    return { nombre: c.nombre, techo: techo, planeado: Number(c.planeado) || 0,
      gastado: gastado, comprometido: comprometido, semaforo: semaforo };
  });
  const desgloseCategorias = categoriasCompletas.length ? categoriasCompletas.map(c => [
    c.nombre, monto(c.planeado), monto(c.gastado), monto(c.comprometido),
    c.techo > 0 ? monto(Math.max(0, c.techo - c.gastado)) : 'sin techo',
    c.techo > 0 ? porcentaje(c.gastado, c.techo) + '%' : '—',
    SEMAFORO_TEXTO[c.semaforo],
  ]) : [['(sin categorías cargadas todavía)', '', '', '', '', '', '']];

  /* ESCENARIOS DE PADRINOS — optimista/base/pesimista.
   *
   * "Solo hablado" (dijo que sí, nada firme) cuenta $0 para liquidez en
   * los escenarios base y pesimista, a propósito: es la regla del brief
   * y la misma que ya rige "de tu bolsillo si nadie más entrega" arriba
   * (que usa solo `entregado`). `optimista` es lo mismo que ya se
   * calculó como `prometidoTotal`, y `pesimista` lo mismo que
   * `entregadoTotal` — no se duplican, se reusan tal cual. */
  const baseTotal = padrinosDinero
    .filter(p => p.estado === 'confirmado' || p.estado === 'entregado')
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const escenariosPadrinos = padrinosDinero.length ? [
    ['Optimista — todo lo prometido se entrega', monto(prometidoTotal), monto(Math.max(0, t.costo - prometidoTotal))],
    ['Base — solo lo confirmado en firme o ya entregado', monto(baseTotal), monto(Math.max(0, t.costo - baseTotal))],
    ['Pesimista — no entra nada más de lo ya entregado', monto(entregadoTotal), monto(Math.max(0, t.costo - entregadoTotal))],
  ] : [];
  const padrinosSoloHablados = padrinosDinero.filter(p => p.estado === 'hablado' && Number(p.monto) > 0);

  /* INVITADOS Y COSTO POR PERSONA — la meta vive en ajustes.php (clave
   * 'invitados_meta'), la única pieza de este bloque que no estaba ya
   * cargada en DINERO. Es la única espera real de toda la función; si
   * falla o no está cargada, se declara el hueco, no se inventa un
   * número. Rotulado como promedio simple porque el esquema no separa
   * costo fijo de variable — no existe un "costo marginal" real para
   * calcular sin eso. */
  let invitadosMeta = null;
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=invitados_meta');
    const n = r && r.valor !== null ? parseInt(r.valor, 10) : NaN;
    invitadosMeta = Number.isFinite(n) && n > 0 ? n : null;
  } catch (error) { invitadosMeta = null; }

  const filasInvitados = [
    ['Confirmados hasta hoy', String(t.confirmados || 0)],
    ['Meta de invitados', invitadosMeta ? String(invitadosMeta) : 'sin meta cargada'],
  ];
  if (invitadosMeta) {
    const escenariosInvitados = [
      Math.round(invitadosMeta * 0.8), invitadosMeta, Math.round(invitadosMeta * 1.2),
    ];
    escenariosInvitados.forEach(cantidad => {
      filasInvitados.push([
        'Costo por persona con ' + cantidad + ' invitados (promedio simple, no marginal)',
        monto(t.costo / cantidad),
      ]);
    });
  }

  /* FLUJO DE CAJA — próximos 90 días. Mismo criterio de scoping que ya
   * usa "Por pagar" arriba (pagos del presupuesto activo, o sin gasto
   * asociado); se arma acá y no reusando calendario.php porque ese
   * endpoint no filtra por presupuesto activo y mezclaría pagos de un
   * plan que no es el que se está viendo. */
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limiteFlujo = new Date(hoy); limiteFlujo.setDate(limiteFlujo.getDate() + 90);
  const flujoDeCaja = (DINERO.pagos || [])
    .filter(p => {
      if (!p.fecha_limite) return false;
      const f = new Date(p.fecha_limite + 'T00:00:00');
      return f >= hoy && f <= limiteFlujo;
    })
    .sort((a, b) => (a.fecha_limite < b.fecha_limite ? -1 : 1))
    .map(p => [
      comoFecha(p.fecha_limite),
      p.concepto || p.gasto_concepto || 'Pago',
      monto(p.monto),
      p.estado === 'pagado' ? 'Pagado' : (diasHasta(p.fecha_limite) < 0 ? 'Atrasado' : 'Pendiente'),
    ]);

  /* RECOMENDACIONES AMPLIADAS — se agregan a `lectura`, no la reemplazan:
   * las 2-3 líneas que ya arma el reporte siguen ahí, esto solo suma lo
   * que el brief pide como lectura accionable de un asesor de verdad. */
  categoriasCompletas.filter(c => c.semaforo === 'rojo').forEach(c => {
    lectura.push('Congela nuevos gastos en «' + c.nombre + '»: ya superó su techo por ' +
      monto(c.gastado - c.techo) + '.');
  });
  categoriasCompletas.filter(c => c.semaforo === 'amarillo').forEach(c => {
    lectura.push('«' + c.nombre + '» está al ' + porcentaje(c.gastado, c.techo) +
      '% de su techo — conviene revisar antes de aprobar más gasto ahí.');
  });
  padrinosSoloHablados.forEach(p => {
    lectura.push('«' + p.nombre + '» prometió ' + monto(p.monto) +
      ' pero sigue solo hablado — conviene pedirle que lo confirme por escrito, o bajarlo de lo comprometido.');
  });
  if (exposicionRestante > 0) {
    lectura.push('Exposición real todavía por cubrir: ' + monto(exposicionRestante) +
      ' (costo total menos lo pagado hasta hoy, exista o no una cuota anotada con vencimiento).');
  }
  if (montoGastosSinPago > 0) {
    lectura.push(pluralizar(gastosSinPago.length, 'gasto tiene', 'gastos tienen') + ' ' + monto(montoGastosSinPago) +
      ' cargados sin ningún pago registrado — confirma si ya se pagaron en efectivo o si siguen pendientes.');
  }
  if (!invitadosMeta) {
    lectura.push('No hay una meta de invitados definida todavía — sin ella, el costo por invitado confirmado es la única referencia posible.');
  }

  /* DECISIONES PENDIENTES — el mismo payload, en forma de checklist para
   * la reunión, no una fuente de datos aparte. */
  const decisiones = [];
  categoriasCompletas.filter(c => c.semaforo === 'rojo').forEach(c => {
    decisiones.push('«' + c.nombre + '» superó su techo — ¿se acepta el nuevo total o se recorta el gasto?');
  });
  padrinosSoloHablados.forEach(p => {
    decisiones.push('«' + p.nombre + '»: ¿se confirma por escrito, o se retira de lo comprometido?');
  });
  if (montoGastosSinPago > 0) {
    decisiones.push('Confirmar el estado real de ' + pluralizar(gastosSinPago.length, 'gasto', 'gastos') +
      ' sin pago registrado (' + monto(montoGastosSinPago) + ').');
  }
  categoriasCompletas.filter(c => c.semaforo === 'sin_techo').forEach(c => {
    decisiones.push('Definir un techo para «' + c.nombre + '» — sin techo no hay semáforo posible.');
  });
  if (!invitadosMeta) decisiones.push('Definir la meta de invitados de esta semana.');

  /* SALUD DEL PRESUPUESTO — una sola línea, arriba de todo. Mismos
   * umbrales de siempre, ningún número nuevo: rojo si alguna categoría
   * está pasada de su techo; si no, amarillo si alguna está cerca (85%+)
   * o si la exposición restante es una porción material del costo total
   * (15% o más); si no, verde. */
  const hayRoja = categoriasCompletas.some(c => c.semaforo === 'rojo');
  const hayAmarilla = categoriasCompletas.some(c => c.semaforo === 'amarillo');
  const exposicionMaterial = t.costo > 0 && (exposicionRestante / t.costo) >= 0.15;
  const salud = hayRoja ? '🔴 ROJO' : (hayAmarilla || exposicionMaterial) ? '🟡 AMARILLO' : '🟢 VERDE';
  const saludDetalle = 'Exposición restante: ' + monto(exposicionRestante) +
    (padrinosDinero.length ? ' · Padrinos, escenario base: ' + monto(baseTotal) + ' de ' + monto(t.costo) : '') +
    ' · ' + (hayRoja ? categoriasCompletas.filter(c => c.semaforo === 'rojo').length : 0) + ' categoría(s) al rojo' +
    (t.por_pagar > 0 ? ' · ' + t.por_pagar_cuantos + ' pago(s) pendiente(s) con vencimiento' : ' · sin pagos vencidos cargados') +
    (invitadosMeta ? '' : ' · falta definir meta de invitados');

  const bloques = [
    { titulo: 'Salud del presupuesto',
      encabezados: ['Estado', 'Detalle'],
      filas: [[salud, saludDetalle]] },
    { titulo: 'Panorama general', encabezados: ['Concepto', 'Monto'], filas: panorama },
    { titulo: 'Exposición restante real',
      encabezados: ['Concepto', 'Monto'],
      filas: [
        ['Costo total', monto(t.costo)],
        ['Pagado hasta hoy', monto(t.pagado)],
        ['Exposición restante (costo − pagado)', monto(exposicionRestante)],
        ['"Por pagar" con vencimiento anotado — no es lo mismo', monto(t.por_pagar) +
          '. Un "$0 por pagar" solo dice que no hay cuotas con fecha cargada — no dice que el evento esté cubierto.'],
        ['Gastos cargados sin ningún pago registrado', gastosSinPago.length + ' (' + monto(montoGastosSinPago) + ')'],
      ] },
  ];

  if (padrinos.length) {
    bloques.push({ titulo: 'Compromiso de los padrinos',
      encabezados: ['Concepto', 'Monto'], filas: padrinos });
    bloques.push({ titulo: 'Escenarios de padrinos',
      encabezados: ['Escenario', 'Aportan los padrinos', 'Sale de tu bolsillo'],
      filas: escenariosPadrinos });
    bloques.push({ titulo: 'Padrino por padrino',
      encabezados: ['Padrino', 'Apadrina', 'Monto', 'Estado'],
      filas: detallePadrinos });
  }

  bloques.push(
    { titulo: 'Desglose por categoría',
      encabezados: ['Categoría', 'Presupuestado', 'Gastado', 'Comprometido', 'Disponible', '% usado', 'Semáforo'],
      filas: desgloseCategorias },
    { titulo: 'Categorías cerca o pasadas de su techo',
      encabezados: ['Categoría', 'Situación', 'Gastado / Techo'],
      filas: alertasTecho.length ? alertasTecho : [['(ninguna categoría cerca de su techo)', '', '']] },
    { titulo: 'Invitados y costo por persona',
      encabezados: ['Concepto', 'Valor'],
      filas: filasInvitados },
    { titulo: 'Flujo de caja — próximos 90 días',
      encabezados: ['Vence', 'Concepto', 'Monto', 'Estado'],
      filas: flujoDeCaja.length ? flujoDeCaja : [['(sin pagos con vencimiento cargado en los próximos 90 días)', '', '', '']] },
    { titulo: 'Próximos pagos',
      encabezados: ['Concepto', 'Vence', 'Estado', 'Monto'],
      filas: proximosPagos },
    { titulo: 'Lectura del asesor',
      encabezados: ['Diagnóstico'],
      filas: lectura.map(l => [l]) },
    { titulo: 'Decisiones pendientes para la reunión',
      encabezados: ['☐', 'Decisión'],
      filas: decisiones.length ? decisiones.map(d => ['☐', d]) : [['—', 'Sin decisiones puntuales detectadas por ahora.']] },
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
