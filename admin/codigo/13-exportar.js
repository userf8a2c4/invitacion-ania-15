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
/** Los mismos cuatro tintes del PDF, en el atributo que entiende Excel. */
const TINTE_DE_ESTADO = {
  sin_enviar: '#F5F5F7',
  enviada:    '#EEF3FD',
  confirmo:   '#ECF8F1',
  no_viene:   '#FDEEF0',
};

/**
 * @param {string} [estado]
 * @returns {string} ' bgcolor="#ECF8F1"' o vacío
 */
function colorDeFilaExcel(estado) {
  const tinte = TINTE_DE_ESTADO[estado];
  return tinte ? ' bgcolor="' + tinte + '"' : '';
}

function armarExcel(titulo, bloques) {
  const tablas = bloques.map(bloque =>
    '<h2>' + seguro(bloque.titulo) + '</h2>' +
    '<table border="1">' +
      '<tr>' + bloque.encabezados.map(h =>
        '<th style="background:#f0dca2">' + seguro(h) + '</th>').join('') + '</tr>' +
      /* El mismo estado que el PDF, que en Excel cuesta un atributo.
         CSV y TXT no llevan color porque no existe el concepto. */
      bloque.filas.map((fila, i) =>
        '<tr' + colorDeFilaExcel(bloque.estados && bloque.estados[i]) + '>' +
          fila.map(c => '<td>' + seguro(c) + '</td>').join('') +
        '</tr>'
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
/**
 * La clase CSS de una fila según el estado de su invitación.
 *
 * Devuelve la cadena entera lista para pegar —' class="e-confirmo"'— o
 * vacío. Así el <tr> de un bloque sin estados sale exactamente como
 * salía antes, sin un class="" colgando.
 *
 * ⚠️ Se acepta solo uno de los cuatro estados conocidos. Si mañana
 * apareciera uno nuevo y nadie le escribiera su color, la fila saldría
 * sin clase —blanca, legible— en vez de con una clase que no existe en
 * el <style> y que se vería igual pero dejaría de avisar.
 *
 * @param {string} [estado] - sin_enviar | enviada | confirmo | no_viene
 * @returns {string}
 */
function claseDeEstado(estado) {
  const conocidos = ['sin_enviar', 'enviada', 'confirmo', 'no_viene'];
  return conocidos.indexOf(estado) === -1 ? '' : ' class="e-' + estado + '"';
}

function armarPdf(titulo, bloques, extra) {
  /* ⚠️ LA VENTANA PUEDE VENIR YA ABIERTA, Y ES A PROPÓSITO (2026-09-09)
     `window.open()` solo funciona si la llamada nace de un toque del
     usuario. Desde que la descarga de invitados pide los menús al
     servidor ANTES de armar el archivo, este `open()` ya no ocurre
     dentro del toque —ocurre después del `await`— y el navegador lo
     bloquea. Quien tenga que esperar algo abre la ventana primero,
     mientras el toque todavía cuenta, y la pasa acá. */
  const ventana = (extra && extra.ventana) || window.open('', '_blank');

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
              '<tbody>' + bloque.filas.map((fila, i) =>
                /* La clase sale de bloque.estados[i], si el bloque la trae.
                   Un bloque sin estados sigue emitiendo <tr> pelado. */
                '<tr' + claseDeEstado(bloque.estados && bloque.estados[i]) + '>' +
                  fila.map(c => '<td>' + seguro(c) + '</td>').join('') +
                '</tr>'
              ).join('') + '</tbody>' +
            '</table>');
  }).join('');

  ventana.document.write(
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<title>' + seguro(nombreConFechaYHora(titulo)) + '</title><style>' +
      // Impreso en papel: fondo blanco y letra negra, no la paleta oscura.
      'body{font-family:Georgia,serif;color:#222;padding:24px;}' +
      'h1{color:#8a6a2c;border-bottom:2px solid #d4a843;padding-bottom:8px;' +
        'margin-bottom:6px;}' +
      // El subtítulo va pegado al título: son una sola cabecera.
      '.subtitulo{margin:0 0 2px;font-size:13px;color:#5a4a2c;}' +
      /* El aviso de uso interno se ve, pero no compite con los datos:
         recuadro tenue, no un cartel rojo. Se lee una vez, al recibir la
         hoja, y después estorba. */
      '.uso-interno{font-size:11px;color:#7a6a4a;background:#fdf3e3;' +
        'border:1px solid #e8d5b0;border-radius:4px;padding:6px 8px;' +
        'margin:10px 0 4px;}' +
      'h2{color:#8a6a2c;margin-top:24px;font-size:15px;}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;}' +
      'th{background:#fdf3e3;text-align:left;border:1px solid #e8d5b0;padding:6px;}' +
      'td{border:1px solid #eee;padding:6px;}' +

      /* ⛔ SIN ESTO EL COLOR NO SE IMPRIME (2026-09-16)
         Los navegadores descartan los fondos al imprimir salvo que la
         persona marque «Gráficos de fondo» en el diálogo. Un color de
         fila que solo se ve en pantalla no sirve para nada: este papel
         existe para usarse impreso, sobre una mesa. Ya pasaba con el
         fondo crema de los th, solo que era tan pálido que nadie lo
         notó. */
      'body,table,tr,td,th{-webkit-print-color-adjust:exact;' +
        'print-color-adjust:exact;}' +

      /* ⚡ EL ESTADO DE CADA FILA, EN COLOR (2026-09-16, a pedido)
       *
       * Sutil a propósito: el papel tiene ciento treinta renglones y si
       * cada uno grita, no se lee ninguno. Tinte muy claro de fondo y
       * una franja saturada a la izquierda.
       *
       * ⚠️ LA FRANJA NO ES ADORNO, ES EL RESPALDO. Los bordes SÍ se
       * imprimen siempre, pase lo que pase con print-color-adjust. Si un
       * día un navegador ignora la regla de arriba, el tinte desaparece
       * y la franja queda: se sigue distinguiendo el estado.
       *
       * ⚠️ Y LOS TONOS SON PARA PAPEL BLANCO, no los del panel. El
       * --bien del panel (#3DDC97) está calibrado contra fondo casi
       * negro; sobre papel se ve fluorescente.
       *
       * ⚠️ EL AZUL DE «SIN RESPONDER» ES A PEDIDO EXPLÍCITO. La tabla
       * COMO_SE_LEE_EL_ESTADO (06-piezas.js) usa ÁMBAR para ese estado,
       * y tiene escrito por qué: «azul se lee como informativo, todo en
       * orden». Acá va azul porque es lo que se pidió, y porque coincide
       * con .punto--enviada, que ya es azul en el panel. No es un
       * descuido: si alguien lo unifica algún día, que sea a propósito. */
      'tr.e-sin_enviar{background:#f5f5f7;box-shadow:inset 3px 0 0 #9a9aa8;}' +
      'tr.e-enviada   {background:#eef3fd;box-shadow:inset 3px 0 0 #4a7fd4;}' +
      'tr.e-confirmo  {background:#ecf8f1;box-shadow:inset 3px 0 0 #2e9e63;}' +
      'tr.e-no_viene  {background:#fdeef0;box-shadow:inset 3px 0 0 #c94257;}' +
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

    /* ⚡ EL DOCUMENTO SE PRESENTA (2026-09-09)
       Antes empezaba con el título y una línea gris con la fecha de
       generación. Impreso y sobre una mesa, eso no dice de qué fiesta es
       ni qué contiene: aparecía un papel con 48 nombres y ningún
       encabezado. Ahora lleva el subtítulo con la fecha y el lugar del
       evento, y el aviso de que es de uso interno — que importa porque
       estas hojas se imprimen, se dejan en el salón y traen teléfonos y
       correos de 108 personas. */
    '<h1>' + seguro(titulo) + '</h1>' +
    (extra && extra.subtitulo
      ? '<p class="subtitulo">' + seguro(extra.subtitulo) + '</p>'
      : '') +
    '<p style="font-size:12px;color:#888">Generado el ' +
      seguro(new Date().toLocaleString(CONFIGURACION.dinero.region)) + '</p>' +
    (extra && extra.aviso
      ? '<p class="uso-interno">' + seguro(extra.aviso) + '</p>'
      : '') +
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
function exportar(formato, nombreBase, titulo, bloques, extra) {
  if (formato === 'pdf') { armarPdf(titulo, bloques, extra); return; }

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
   * ⚡ EL SERVIDOR YA NO CONTRADICE A ESTE REPORTE (2026-09-03). Acá se
   * calculaba `entregadoTotal` a mano y se evitaba a propósito el
   * `t.bolsillo_si_nadie_mas_entrega` del servidor, porque ese restaba
   * solo lo YA APLICADO a un gasto puntual: con aportes entregados pero
   * todavía sin asignar (el caso más común — el padrino ya pagó, falta
   * cargar en qué se usó) mostraba el costo entero como si nadie
   * hubiera entregado nada. Ahora el servidor usa este mismo criterio
   * (ver cifrasDelPresupuesto en _lib/dinero.php), así que los dos dan
   * lo mismo. Se sigue calculando acá porque el desglose por capas
   * —prometido / entregado / aplicado— es propio de este reporte.
   *
   * `monto_entregado` es la columna nueva: una entrega parcial cuenta
   * por lo que se entregó, no por todo o nada como hacía `estado`. */
  const padrinosDinero = (DINERO.padrinos || []).filter(p => p.tipo_aporte === 'dinero');
  const prometidoTotal = padrinosDinero.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const entregadoTotal = padrinosDinero
    .reduce((s, p) => s + (Number(p.monto_entregado) || 0), 0);
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
/**
 * El plato de una persona, con el de fábrica cuando nadie eligió.
 *
 * ⚡ POR QUÉ SE COMPLETA, Y QUÉ SE ESTÁ ASUMIENDO (2026-09-16, decidido)
 *
 * Hay gente confirmada sin plato en la ficha. No es que el formulario no
 * lo exija —el formulario trae Estándar o Infantil ya marcado, así que
 * quien confirma por ahí siempre manda uno—: son las filas que se cargan
 * desde el panel a mano, que nacen con el menú vacío y nadie vuelve a
 * tocar.
 *
 * En el papel de la cocina eso salía como un guion, y un guion no se
 * puede cocinar: el número de platos no cerraba contra la cantidad de
 * sillas. Se completa con el de fábrica —Estándar para los adultos,
 * Infantil para los niños— para que cierre.
 *
 * ⚠️ LO QUE ESTO CUESTA, ESCRITO PARA QUE NADIE SE SORPRENDA. Es un
 * plato que esa persona NO eligió. Si alguno de esos era vegetariano y
 * nunca lo dijo, este papel va a decir Estándar con toda seguridad y
 * nadie se va a enterar hasta que le pongan el plato delante. Se eligió
 * a conciencia: la alternativa era dejar el hueco a la vista y perseguir
 * a cada uno, y con la fiesta encima no daba el tiempo.
 *
 * ⚠️ NO TOCA LA BASE. El dato guardado sigue vacío, que es la verdad:
 * acá solo se rellena lo que se imprime. El día que esa persona entre a
 * su invitación y elija, lo suyo pisa este supuesto sin que nadie tenga
 * que deshacer nada.
 *
 * @param {Object} persona - con `tipo` y `menu`
 * @returns {string}
 */
function platoDeLaPersona(persona, familiaConfirmo) {
  const elegido = String((persona && persona.menu) || '').trim();
  if (elegido) return elegido;

  /* ⛔ A QUIEN NO CONTESTÓ NO SE LE INVENTA EL PLATO (2026-09-16)
     La primera versión de esto completaba SIEMPRE, y el resultado era
     que una invitación «Sin responder» aparecía con cinco personas
     comiendo Estándar. Eso no es un supuesto de trabajo: es decirle a la
     cocina que alguien confirmó cuando ni siquiera abrió el link.
     El de fábrica solo entra cuando la familia ya dijo que viene. */
  if (!familiaConfirmo) return '';

  return (persona && persona.tipo === 'nino') ? 'Infantil' : 'Estándar';
}

/**
 * La gente de una familia: las filas cargadas más los lugares que
 * todavía no tienen una.
 *
 * ⚡ UN SOLO SITIO QUE SABE QUIÉNES SON (2026-09-16)
 *
 * Esta expansión vivía suelta dentro del cuadro por persona. Al pasar
 * «Confirmaciones» a una fila por persona habría quedado copiada en dos
 * lados, y los dos cuadros del mismo documento habrían podido contar
 * distinta cantidad de gente para la misma familia.
 *
 * ⚠️ SE COMPLETAN LOS LUGARES SIN FILA PROPIA. Una familia de cuatro con
 * un solo nombre cargado son cuatro personas, no una: los otros tres
 * lugares están apartados y alguien se va a sentar ahí. Se nombran
 * «Adulto 2», «Niño 1», igual que en la invitación.
 *
 * ⚠️ Y EL NÚMERO SE CUENTA ACÁ, sobre la lista final. Hay filas reales
 * con el nombre vacío —confirmar.php las crea así cuando la familia
 * elige plato para un lugar sin nombre—; si el número saliera solo de
 * los lugares inventados, esas decían «Adulto undefined».
 *
 * @param {Object} familia
 * @param {Object[]} [suyos] - sus filas de `acompanantes`
 * @returns {Object[]} con nombre ya resuelto, tipo, menu y alergias
 */
function gentePorFamilia(familia, suyos) {
  const cargados = (suyos || []).slice();

  const adultos = Number(familia.adultos) || 0;
  const ninos   = Number(familia.ninos)   || 0;

  const cuantosHay = { adulto: 0, nino: 0 };
  cargados.forEach(p => { cuantosHay[p.tipo === 'nino' ? 'nino' : 'adulto']++; });

  /* ⛔ EL HUECO SE MIDE SOBRE EL TOTAL, NO POR TIPO (2026-09-16)
   *
   * Acá se calculaba cuántos adultos faltaban y cuántos niños, cada uno
   * por su lado. Pero `familia.adultos` y `familia.ninos` son lo que
   * contestó la familia, y los `tipo` de las filas cargadas los pone
   * quien las carga: las dos cuentas pueden no coincidir.
   *
   * Cuando no coinciden, la cuenta por tipo INVENTA GENTE. Una familia de
   * cinco lugares con sus cinco filas ya cargadas, pero todas tipadas
   * «adulto», declarada como «4 adultos y 1 niño», daba `cuantosHay.nino
   * = 0 < 1` y se agregaba un «Niño 1» que no existe: seis personas para
   * cinco sillas, y un plato de más pedido al banquete.
   *
   * Midiendo sobre el total, si ya hay cinco filas no falta nadie,
   * importa poco de qué tipo sean. El reparto por tipo se conserva para
   * los que SÍ faltan, y en el mismo orden de siempre: adultos primero. */
  const lugares      = adultos + ninos;
  const faltanEnTotal = Math.max(0, lugares - cargados.length);

  let debenSerAdultos = Math.max(0, adultos - cuantosHay.adulto);
  let debenSerNinos   = Math.max(0, ninos   - cuantosHay.nino);

  const faltan = [];
  for (let i = 0; i < faltanEnTotal; i++) {
    if (debenSerAdultos > 0)    { faltan.push({ tipo: 'adulto' }); debenSerAdultos--; }
    else if (debenSerNinos > 0) { faltan.push({ tipo: 'nino' });   debenSerNinos--; }
    else                          faltan.push({ tipo: 'adulto' });
  }

  /* ⛔ EL RELLENO NO PUEDE LLAMARSE IGUAL QUE ALGUIEN QUE YA ESTÁ
   *
   * «Adulto 2» y «Niño 1» no son solo etiquetas de pantalla: el
   * importador las guarda como NOMBRE DE VERDAD en la base
   * (admin/api/importar.php:492 y :500) para toda planilla que no traiga
   * la columna `integrantes` — o sea, la lista real de Ania.
   *
   * Y acá se numeraba por posición, sin mirar qué nombres ya estaban
   * ocupados. Bastaba con que una fila real quedara corrida de su número
   * para que el relleno cayera justo encima: dos renglones seguidos
   * diciendo «Adulto 3» en el papel que se lleva al salón. Eso es lo que
   * se ve como un duplicado, porque es un duplicado.
   *
   * Se lleva la lista de los ocupados y el número salta al primero libre.
   * Los nombres reales no se tocan nunca: solo se elige el del relleno. */
  const nombresOcupados = new Set(
    cargados
      .map(p => String(p.nombre || '').trim().toLowerCase())
      .filter(n => n !== '')
  );

  const vanContados = { adulto: 0, nino: 0 };

  return cargados.concat(faltan).map(p => {
    const esNino = p.tipo === 'nino';
    const clave  = esNino ? 'nino' : 'adulto';
    vanContados[clave]++;

    const nombre = String(p.nombre || '').trim();
    if (nombre) return {
      tipo: clave, nombre: nombre,
      menu: p.menu || '', alergias: p.alergias || '',
    };

    const comoSeLlama = esNino ? 'Niño' : 'Adulto';
    let numero = vanContados[clave];
    let puesto = comoSeLlama + ' ' + numero;

    /* El tope es por si alguien cargara cien filas llamadas «Adulto N»:
       vale más un nombre repetido que un panel colgado. */
    let vueltas = 0;
    while (nombresOcupados.has(puesto.toLowerCase()) && vueltas < 200) {
      numero++; vueltas++;
      puesto = comoSeLlama + ' ' + numero;
    }
    nombresOcupados.add(puesto.toLowerCase());

    return {
      tipo:     clave,
      nombre:   puesto,
      menu:     p.menu || '',
      alergias: p.alergias || '',
    };
  });
}

/**
 * Un guion en vez de una celda vacía.
 *
 * ⚡ POR QUÉ (2026-09-09). Una fila con cuatro huecos en blanco no se lee
 * como "esto todavía no se sabe": se lee como si el documento estuviera
 * a medio hacer, o como si el renglón se hubiera cortado. El guion dice
 * que el dato se miró y no está, que es información distinta.
 *
 * @param {*} valor
 * @returns {string}
 */
function oGuion(valor) {
  const texto = String(valor === undefined || valor === null ? '' : valor).trim();
  return texto === '' ? '—' : texto;
}

/**
 * Lo que el invitado escribió de verdad en «Notas», o cadena vacía.
 *
 * ⚡ SALÍAN COMAS SUELTAS EN LA COLUMNA NOTAS (2026-09-15)
 *
 * El formulario público manda `', '` cuando la persona no escribió nada
 * —`notas: notas || ', '` en codigo/11-formulario-confirmacion.js:989—,
 * así que la base guarda una coma y un espacio, no una celda vacía. En
 * el PDF de invitados eso se imprimía tal cual: una coma suelta, que
 * parece un error de la app o un mensaje que se cortó.
 *
 * El servidor ya sabía esto: admin/api/mensajes.php tiene
 * loQueEscribio(), con la MISMA regla. Acá se repite porque son dos
 * mundos distintos —PHP y el navegador— y no comparten código; lo que
 * no se puede es que digan cosas distintas.
 *
 * ⚠️ SOLO comas y espacios. «Vamos, con gusto» lleva una coma adentro y
 * es un mensaje de verdad: tiene que pasar entero.
 *
 * @param {*} valor
 * @returns {string} '' si era el centinela o estaba vacío.
 */
function loQueEscribio(valor) {
  const texto = String(valor === undefined || valor === null ? '' : valor).trim();
  return /^[,\s]+$/.test(texto) ? '' : texto;
}




async function exportarInvitados(formato) {
  if (!INVITADOS || !INVITADOS.length) {
    avisar('Todavía no hay invitados que descargar.', true);
    return;
  }

  /* Se baja EN EL MISMO ORDEN QUE SE VE (2026-09-14). El filtro ya se
     respetaba acá desde siempre; que el orden no lo hiciera sería media
     promesa: uno ordena por «Personas · más primero», toca Descargar, y
     el archivo sale en otro orden sin que nada lo avise.
     enElOrdenElegido() vive en 08-vista-invitados.js — mismo scope
     global, sin import, como todo el panel, y ese archivo se carga antes
     (admin/index.html:382 contra :391). */
  const visibles = enElOrdenElegido(INVITADOS.filter(invitadoPasaElFiltro));

  /* ⚠️ LA VENTANA DEL PDF SE ABRE ACÁ, ANTES DE ESPERAR NADA.
     Abajo se le piden los menús al servidor, y después de ese `await` el
     navegador ya no considera que estemos dentro del toque del usuario:
     un `window.open()` ahí se bloquea y la descarga en PDF no sale
     nunca. Se abre primero, en blanco, y se le escribe cuando estén los
     datos. Para los otros tres formatos no hace falta ninguna ventana. */
  const ventana = formato === 'pdf' ? window.open('', '_blank') : null;

  /* Los menús de cada persona no están en la lista de la pantalla: viven
     en `acompanantes`. Se piden en UNA sola consulta para las 48
     familias (ver la nota de listar_todos). Si falla —sin señal, por
     ejemplo— la descarga sale igual con el resumen de siempre: es mejor
     un archivo con menos detalle que ningún archivo. */
  let porFamilia = {};
  let falloElDetalle = false;
  try {
    const r = await traer('acompanantes.php?accion=listar_todos&con_menus=1');
    for (const p of (r.filas || [])) {
      (porFamilia[p.confirmacion_id] = porFamilia[p.confirmacion_id] || []).push(p);
    }
  } catch (error) {
    /* ⛔ ANTES ESTO SOLO SACABA UN AVISO EN PANTALLA (2026-09-14), que
       dura tres segundos y se lo pierde cualquiera que toque Descargar y
       mire el PDF. El archivo salía sin desglose y no había forma de
       saber si era porque nadie eligió plato o porque la consulta falló.
       Ahora queda escrito ADENTRO del documento. */
    falloElDetalle = true;
    avisar('No pude traer el detalle por persona; va el resumen.', true);
  }

  /* ⚡ EL ESTADO DE VERDAD, NO EL SUPUESTO (2026-09-09)
     La columna se llamaba "Asiste" y decía "Sí" para TODOS, incluso para
     invitaciones que ni siquiera se mandaron. No era un error de la
     descarga: `asiste` arranca en 1 a propósito, para que el bot de
     mesas pueda acomodar antes de que nadie conteste. Es un supuesto de
     trabajo, no una respuesta.
     Ahora se lee con la misma función que la pantalla
     (comoEstaLaAsistencia), así que el archivo y el panel no pueden
     decir cosas distintas: "Sin enviar", "Sin responder", "Confirmó",
     "No viene". */
  const comoSeLee = f =>
    (COMO_SE_LEE_EL_ESTADO[comoEstaLaAsistencia(f)] || {}).texto || '—';

  const confirmados = visibles.filter(f => comoEstaLaAsistencia(f) === 'confirmo');
  const sumar = (lista, campo) =>
    lista.reduce((total, f) => total + (Number(f[campo]) || 0), 0);

  const adultos = sumar(confirmados, 'adultos');
  const ninos   = sumar(confirmados, 'ninos');

  /* Las filas de «Confirmaciones», una por persona, y su color en
     paralelo. Se arman acá arriba porque el bloque de abajo las nombra
     dos veces y calcularlas dos veces podría dar dos resultados. */
  const filasDeConfirmaciones = [];
  const estadosDeConfirmaciones = [];

  visibles.forEach(f => {
    const como    = comoEstaLaAsistencia(f);
    const vienen  = como === 'confirmo';
    const suGente = gentePorFamilia(f, porFamilia[f.id]);
    const total   = (Number(f.adultos) || 0) + (Number(f.ninos) || 0);

    /* Una familia sin nadie cargado y sin lugares igual tiene que
       aparecer: es una invitación que existe y a la que hay que
       perseguir. Sale con un renglón y la celda de persona en blanco. */
    const gente = suGente.length ? suGente : [null];

    gente.forEach((p, i) => {
      const primero = i === 0;

      filasDeConfirmaciones.push([
        primero ? oGuion(f.nombre) : '',
        primero ? oGuion(f.invitacion_telefono) : '',
        primero ? oGuion(f.correo) : '',
        primero ? comoSeLee(f) : '',
        primero ? total : '',
        p ? p.nombre : '—',
        p ? (p.tipo === 'nino' ? 'Niño' : 'Adulto') : '—',
        p ? oGuion(platoDeLaPersona(p, vienen)) : '—',
        p ? oGuion(String(p.alergias || '').trim()) : '—',
        primero ? oGuion(loQueEscribio(f.notas)) : '',
        primero ? oGuion(f.codigo) : '',
        primero
          ? oGuion(f.invitacion_respondida_en
              ? comoFecha(f.invitacion_respondida_en) : '')
          : '',
      ]);

      /* El color va en TODOS los renglones del grupo, no solo en el
         primero: media familia pintada y media en blanco se leería como
         dos grupos distintos. */
      estadosDeConfirmaciones.push(como);
    });
  });

  const bloques = [
    /* El resumen va PRIMERO y como bloque propio: así aparece en los
       cuatro formatos —no solo en el PDF— y es lo primero que se lee. */
    {
      titulo: 'Resumen',
      encabezados: ['Dato', 'Cantidad'],
      filas: [
        ['Grupos confirmados', confirmados.length + ' de ' + visibles.length],
        ['Total de personas confirmadas', adultos + ninos],
        ['· Adultos', adultos],
        ['· Niños', ninos],
      ],
    },
    {
      titulo: 'Confirmaciones',
      /* ⚡ EL TELÉFONO, A PEDIDO (2026-09-14). Es el dato con el que se
         persigue a quien no contestó, y era el único que obligaba a
         volver a la app teniendo el PDF en la mano. Sale de
         `invitaciones.telefono`, que es el mismo que usa el botón de
         WhatsApp —no el de las notas, que era el que mentía—. */
      /* ⚡ UNA FILA POR PERSONA, NO UNA POR FAMILIA (2026-09-16, a pedido)
       *
       * La columna «Menús» era un párrafo entero metido en una celda:
       * «Monserrat Barrera: sin elegir · Francisco Gonzalez: sin elegir ·
       * Evelyn Gabriela: sin elegir · Sofía Godínez: sin elegir…». Con
       * cinco personas ya no se leía, y con ocho tampoco se podía usar.
       *
       * Ahora cada persona tiene su renglón. Los datos del grupo
       * —teléfono, estado, código, cuándo contestó— van SOLO en el
       * primero y los siguientes los dejan en blanco: así el ojo agrupa
       * solo, sin una línea repetida ocho veces que tape lo que cambia.
       *
       * ⚠️ Se fueron «Adultos» y «Niños» como columnas sueltas. Con una
       * fila por persona, contar los renglones del grupo da lo mismo, y
       * la columna «Tipo» lo dice por cada uno. «Total» se queda en el
       * primer renglón, que es el número que se le canta al salón. */
      encabezados: ['Grupo', 'Teléfono', 'Correo', 'Estado', 'Total',
                    'Persona', 'Tipo', 'Menú', 'Alergias',
                    'Notas', 'Código', 'Confirmó el'],
      filas: filasDeConfirmaciones,
      /* ⚡ EL COLOR DE CADA FILA (2026-09-16, a pedido)
         Paralelo a `filas` por índice, y NO adentro de cada fila: los
         cuatro renderizadores dan por hecho que una fila es un arreglo
         de texto, y meterle un objeto reventaría CSV, Excel y TXT de
         una. Como propiedad hermana del bloque, los tres que no saben
         de color ni se enteran.

         Sale de comoEstaLaAsistencia(), la misma función que llena la
         columna «Estado». Un solo dueño: el color y la palabra no pueden
         decir cosas distintas.

         ⚠️ SE ARMA JUNTO CON LAS FILAS, no con visibles.map(). Desde que
         cada persona tiene su renglón hay MÁS filas que familias, y un
         color por familia dejaría de coincidir con la fila que pinta a
         partir del primer grupo de dos personas: el resto del documento
         saldría con el color corrido. */
      estados: estadosDeConfirmaciones,
    },
  ];

  /* ══════════════════════════════════════════════════════════════════
     UNA FILA POR PERSONA
     ══════════════════════════════════════════════════════════════════

     ⚡ (2026-09-14) Carlos: «detalle de quién elige qué plato, quién
     tiene alergia… detalles, detalles».

     El bloque de arriba es una fila por FAMILIA, y meterle el desglose
     adentro de una celda lo volvía ilegible: «José: estándar · Ana:
     infantil · Luis: sin elegir» en una columna de tabla, con veinte
     familias, no se lee ni se usa.

     Este bloque es la misma información con la forma que pide el uso: la
     cocina recorre PERSONAS, no familias. Una línea por cada una, con su
     plato, su alergia, su grupo y su mesa.

     ⚠️ SOLO SALEN LAS PERSONAS QUE EXISTEN como fila en `acompanantes`.
     Las familias que confirmaron con el formulario viejo —cuántos van +
     menú por lugar, sin nombres— no tienen esas filas, y ahí no hay
     detalle que mostrar: aparecen marcadas «sin desglose» en el bloque
     de arriba, que es la señal de a quién hay que preguntarle. */

  /* ⛔ TODOS LOS LUGARES, NO SOLO LOS QUE TIENEN NOMBRE (2026-09-16)
   *
   * Este cuadro salía SOLO con las personas que existen como fila en
   * `acompanantes`. Una familia con cuatro lugares apartados y un solo
   * nombre cargado aportaba una línea, no cuatro — y la cocina, contando
   * este papel, sacaba menos platos que gente sentada.
   *
   * Los lugares sin nombre ahora aparecen igual, como «Adulto 2» o
   * «Niño 1», que es exactamente como los nombra la invitación cuando la
   * familia todavía no los completó. Su menú SÍ está guardado
   * (confirmar.php lo escribe aunque no haya nombre, desde el
   * 2026-09-03), así que la línea trae el plato aunque no traiga a quién.
   *
   * Un cuadro que suma menos que el total del banquete es peor que uno
   * con huecos: el hueco se ve y se pregunta, el faltante no. */
  const personas = [];

  /* ⛔ SOLO LOS QUE VAN A VENIR (2026-09-16, a pedido)
   *
   * «No necesitamos ver siquiera el campo de menú de alguien que no ha
   * respondido o rechazado».
   *
   * Y el cuadro además NO CERRABA: decía 133 personas mientras el panel
   * contaba 113 lugares apartados, porque metía a la gente de
   * invitaciones que ya habían contestado que no. Un papel que va a la
   * cocina y suma más platos que sillas es peor que uno incompleto: el
   * incompleto se nota, el inflado no.
   *
   * ⚠️ Quiénes son las personas de cada familia lo decide
   * gentePorFamilia(), la misma que usa «Confirmaciones». Si cada cuadro
   * las contara por su cuenta, dos tablas del mismo documento podrían
   * decir que una familia tiene cuatro y cinco a la vez. */
  visibles
    .filter(familia => comoEstaLaAsistencia(familia) === 'confirmo')
    .forEach(familia => {
      gentePorFamilia(familia, porFamilia[familia.id]).forEach((p, orden) => {
        personas.push({
          mesa:  familia.mesa || '',
          grupo: familia.nombre || '',
          orden: orden,
          fila: [
            oGuion(familia.mesa),
            oGuion(familia.nombre),
            p.nombre,
            p.tipo === 'nino' ? 'Niño' : 'Adulto',
            /* true: acá ya se filtró a los que vienen, así que a quien no
               eligió le entra el plato de fábrica. */
            oGuion(platoDeLaPersona(p, true)),
            oGuion(String(p.alergias || '').trim()),
            /* Sin celda de «Estado»: acá ya son todos los que vienen. Una
               columna repitiendo «Confirmó» en cada renglón solo le roba
               ancho a Menú y a Alergias, que son las dos que se leen. */
          ],
        });
      });
    });

  /* ⚡ ORDENADO POR MESA, NO ALFABÉTICO (2026-09-16)
   *
   * Antes iba por nombre de persona, y eso dispersaba a cada familia por
   * todo el papel: para servir la mesa 7 había que buscar ocho apellidos
   * sueltos entre ciento sesenta renglones.
   *
   * Quien usa este cuadro lo recorre POR MESA —el mesero va con la
   * bandeja a una mesa, no a una letra del abecedario—, así que ese es el
   * orden: mesa, después grupo, después el orden en que la familia
   * cargó a su gente. Leído de arriba abajo, cada mesa es un bloque
   * continuo.
   *
   * La mesa se compara por número cuando lo tiene: si no, «Mesa 10»
   * queda antes que «Mesa 2». */
  const numeroDeMesa = (texto) => {
    const m = /(\d+)/.exec(String(texto || ''));
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };

  personas.sort((a, b) =>
    numeroDeMesa(a.mesa) - numeroDeMesa(b.mesa) ||
    String(a.mesa).localeCompare(String(b.mesa), 'es', { sensitivity: 'base' }) ||
    String(a.grupo).localeCompare(String(b.grupo), 'es', { sensitivity: 'base' }) ||
    a.orden - b.orden);

  if (personas.length) {
    bloques.push({
      titulo: 'Persona por persona · solo quienes confirmaron (' +
              personas.length + ')',
      encabezados: ['Mesa', 'Grupo', 'Persona', 'Tipo', 'Menú', 'Alergias'],
      filas: personas.map(p => p.fila),
    });
  }

  /* ⛔ Y SI EL DETALLE NO LLEGÓ, QUE SE VEA EN EL PAPEL. */
  if (falloElDetalle) {
    bloques.push({
      titulo: '⚠️ Falta el detalle por persona',
      encabezados: ['Qué pasó'],
      filas: [['No se pudo traer quién eligió qué plato ni quién tiene ' +
               'cada alergia. Las columnas de menús y alergias de arriba ' +
               'traen el resumen del grupo. Probá descargar de nuevo con ' +
               'señal.']],
    });
  }

  /* ⛔ UNA CONSULTA QUE RESPONDE «NADA» SE VEÍA IGUAL QUE TODO EN ORDEN
   *    (2026-09-15)
   *
   * falloElDetalle solo se enciende si la red falla. Pero el caso que de
   * verdad pasó fue otro: la consulta respondió bien y trajo CERO filas
   * —los acompañantes se habían perdido—, y entonces el PDF se degradaba
   * solo: las columnas mostraban el resumen del grupo con un «(sin
   * desglose por persona)» minúsculo dentro de la celda, y la hoja
   * «Persona por persona» directamente no se imprimía. Nada gritaba.
   *
   * Y esto no es un detalle de presentación. Cada invitado elige SU
   * plato y escribe SUS alergias en la invitación; si el papel que llega
   * a la cocina dice «3 Estándar, 1 Infantil» y nada más, esa elección
   * no sirvió para nada y una alergia puede terminar en el plato
   * equivocado.
   *
   * Es el mismo error que ya nos costó caro con el eclipse, ahora del
   * lado de los datos: algo que responde sin fallar no es algo que
   * funcione. Acá se nombra, y se nombra ARRIBA de todo. */
  const sinDetalle = confirmados.filter(
    f => !(porFamilia[f.id] && porFamilia[f.id].length));

  if (!falloElDetalle && confirmados.length && sinDetalle.length) {
    const todas = sinDetalle.length === confirmados.length;

    bloques.unshift({
      titulo: todas
        ? '⛔ LA COCINA NO VA A RECIBIR NADA'
        : '⚠️ Sin detalle por persona: ' + sinDetalle.length +
          ' de ' + confirmados.length + ' grupos confirmados',
      encabezados: todas ? ['Qué pasa'] : ['Grupo', 'Personas', 'Qué falta'],
      filas: todas
        ? [['Ninguno de los ' + confirmados.length + ' grupos confirmados ' +
            'tiene cargadas sus personas, así que no hay a quién atribuirle ' +
            'ningún plato ni ninguna alergia. Las columnas «Menús» y ' +
            '«Alergias» de abajo traen SOLO el total del grupo, y la hoja ' +
            '«Persona por persona» no se imprimió porque no hay con qué ' +
            'armarla. Esto no es que nadie haya elegido: es que faltan las ' +
            'filas de acompañantes en la base.']]
        : sinDetalle.map(f => [
            oGuion(f.nombre),
            (Number(f.adultos) || 0) + (Number(f.ninos) || 0),
            'No están cargadas sus personas: no se sabe quién come qué ' +
            'ni quién tiene alergia.',
          ]),
    });
  }

  exportar(formato, 'invitados-ania-xv', 'Invitados · Ania XV', bloques, {
    ventana: ventana,
    subtitulo: 'Lista de confirmaciones · ' + CONFIGURACION.fiesta.fechaEnPalabras +
               ' · ' + CONFIGURACION.fiesta.lugar,
    aviso: 'Documento de uso interno. Contiene datos personales de los ' +
           'invitados: no se comparte fuera de la organización de la fiesta.',
  });
}

/* ─── LA MUDANZA DE UN ENTORNO A OTRO ───────────────────────────────

   PARA QUÉ SIRVE
   Bajar la lista de invitados con la forma EXACTA que entiende
   admin/api/importar.php, para poder pasarla de PBE a producción sin que
   nadie tenga que reescribir 51 familias a mano.

   POR QUÉ NO SIRVE exportarInvitados()
   Esa baja la vista de Confirmaciones —Asiste, Menús, Alergias, Código—
   que es lo que hace falta para trabajar el día del evento. Pero NO trae
   el grupo, y el grupo es justo lo que el importador necesita para
   rearmar los 51 grupos del otro lado. Son dos descargas con dos
   propósitos distintos; mezclarlas haría que ninguna de las dos sirva
   del todo.

   POR QUÉ NO PASA POR exportar()
   Porque en CSV esa función escribe una línea con el título del bloque
   ANTES de los encabezados, para que se entienda cuando hay varias
   tablas en un mismo archivo. Acá hay una sola tabla y el archivo lo va
   a leer un importador, no una persona: una línea de más arriba del
   encabezado es una manera fácil de que adivine mal qué fila es cuál.
   Se arma con armarCsv() directo — una tabla y nada más.

   SIN BOM, Y A PROPÓSITO
   El archivo está pensado para subirse tal cual, no para abrirlo. Si se
   abre en Excel y se vuelve a guardar, Excel le cambia la codificación y
   los acentos se rompen. Ver el aviso de la pantalla de importar.
*/

/**
 * Baja la lista completa con la forma que entiende el importador.
 *
 * NO respeta el filtro de la pantalla, a propósito: una mudanza es todo
 * o no es nada. Bajar media lista porque había un filtro puesto sería el
 * error más fácil de cometer y el más difícil de notar.
 *
 * @returns {Promise<void>}
 */
async function exportarParaMudanza() {
  if (!INVITADOS || !INVITADOS.length) {
    avisar('Todavía no hay invitados que mudar.', true);
    return;
  }

  avisar('Preparando la lista…');

  /* Los integrantes de TODAS las familias, en UNA consulta. Ver por qué
     no se piden de a uno en admin/api/acompanantes.php (listar_todos). */
  const porFamilia = new Map();
  let hubosIntegrantes = true;

  try {
    const r = await traer('acompanantes.php?accion=listar_todos');
    (r.filas || []).forEach(persona => {
      const suNombre = String(persona.nombre || '').trim();
      if (suNombre === '') return;

      const clave = String(persona.confirmacion_id);
      if (!porFamilia.has(clave)) porFamilia.set(clave, []);

      /* El tipo va DELANTE del nombre y no se deduce del orden: si una
         familia tiene cargado solo al niño, deducirlo por posición lo
         convertiría en adulto del otro lado, y con él su menú y su
         lugar en la mesa. Ver COLUMNAS_CONOCIDAS en importar.php. */
      porFamilia.get(clave).push(
        (String(persona.tipo) === 'nino' ? 'nino:' : 'adulto:') + suNombre);
    });
  } catch (error) {
    hubosIntegrantes = false;
  }

  const filas = INVITADOS.map(f => [
    f.nombre || '',
    f.invitacion_grupo_nombre || '',
    contactoParaMudanza(f),
    Number(f.adultos) || 0,
    Number(f.ninos) || 0,
    (porFamilia.get(String(f.id)) || []).join('; '),
    loQueEscribio(f.notas),
  ]);

  const csv = armarCsv(
    ['Nombre', 'Grupo', 'Contacto', 'Adultos', 'Niños', 'Integrantes', 'Notas'],
    filas
  );

  const ahora = new Date();
  const dos = n => String(n).padStart(2, '0');
  bajarArchivo(
    'lista-invitados-' + ahora.getFullYear() + dos(ahora.getMonth() + 1) +
      dos(ahora.getDate()) + '.csv',
    csv, 'text/csv');

  avisar(hubosIntegrantes
    ? 'Listo: ' + pluralizar(filas.length, 'familia', 'familias') + ' con sus integrantes.'
    : 'Bajé ' + pluralizar(filas.length, 'familia', 'familias') + ', pero SIN los nombres ' +
      'de cada integrante: no se pudieron traer.',
    !hubosIntegrantes);
}

/**
 * El teléfono y el correo en una sola celda, que es como los lee el
 * importador (busca cada uno con su propio patrón, ver importar.php).
 *
 * @param {Object} f - Una fila de INVITADOS.
 * @returns {string}
 */
function contactoParaMudanza(f) {
  const partes = [];
  const telefono = String(f.invitacion_telefono || '').trim();
  const correo = String(f.correo || f.invitacion_correo || '').trim();

  if (telefono) partes.push(telefono);
  if (correo) partes.push(correo);
  return partes.join(' / ');
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
