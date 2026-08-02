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
 * Arma un archivo que Excel abre como planilla.
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
 * Abre una ventana lista para imprimir o guardar como PDF.
 *
 * @param {string} titulo
 * @param {Array} bloques
 * @returns {void}
 */
function armarPdf(titulo, bloques) {
  const ventana = window.open('', '_blank');

  if (!ventana) {
    avisar('El navegador bloqueó la ventana. Permití las ventanas emergentes.', true);
    return;
  }

  const tablas = bloques.map(bloque =>
    '<h2>' + seguro(bloque.titulo) + '</h2>' +
    (bloque.filas.length
      ? '<table>' +
          '<thead><tr>' + bloque.encabezados.map(h =>
            '<th>' + seguro(h) + '</th>').join('') + '</tr></thead>' +
          '<tbody>' + bloque.filas.map(fila =>
            '<tr>' + fila.map(c => '<td>' + seguro(c) + '</td>').join('') + '</tr>'
          ).join('') + '</tbody>' +
        '</table>'
      : '<p>(vacío)</p>')
  ).join('');

  ventana.document.write(
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<title>' + seguro(titulo) + '</title><style>' +
      // Impreso en papel: fondo blanco y letra negra, no la paleta oscura.
      'body{font-family:Georgia,serif;color:#222;padding:24px;}' +
      'h1{color:#8a6a2c;border-bottom:2px solid #d4a843;padding-bottom:8px;}' +
      'h2{color:#8a6a2c;margin-top:24px;font-size:15px;}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;}' +
      'th{background:#fdf3e3;text-align:left;border:1px solid #e8d5b0;padding:6px;}' +
      'td{border:1px solid #eee;padding:6px;}' +
      // Que una tabla no se parta a la mitad entre dos hojas.
      'table{page-break-inside:auto;} tr{page-break-inside:avoid;}' +
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
      cerrarHoja();
    });
  });
}
