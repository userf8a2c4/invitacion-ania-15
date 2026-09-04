/* ══════════════════════════════════════════════════════════════════════
   18 · IMPORTAR DESDE UNA PLANILLA

   QUÉ HACE ESTE ARCHIVO
   Trae los invitados desde Google Sheets o Excel: se copia el rango, se
   pega acá, y el panel se encarga del resto.

   POR QUÉ SE PEGA Y NO SE SUBE EL ARCHIVO
   Porque copiar un rango y pegarlo son dos gestos, y exportar un .xlsx,
   encontrarlo en Descargas y subirlo son cinco. Además, cuando se copia
   una selección de una planilla, el navegador recibe el contenido
   separado por tabuladores — un formato mucho más simple y confiable de
   leer que un archivo de Excel, que por dentro es un ZIP con XML.

   Funciona igual desde Google Sheets, Excel de escritorio o Numbers.

   NADA SE IMPORTA SIN VER ANTES QUÉ ENTENDIÓ. Meter 110 invitados mal
   interpretados y tener que borrarlos de a uno sería peor que no tener
   importador.

   ÍNDICE
     1. Leer lo pegado
     2. La pantalla
     3. La vista previa
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió el análisis del servidor. */
let IMPORTACION = null;


/* ─── 1. LEER LO PEGADO ────────────────────────────────────────────── */

/**
 * Convierte un texto pegado en filas y columnas.
 *
 * SEPARADOR AUTOMÁTICO. Al copiar de una planilla, las columnas vienen
 * separadas por tabuladores. Al exportar a CSV, por comas o por punto y
 * coma según el idioma del sistema. Se cuenta cuál aparece más en la
 * primera línea y se usa ese: adivinarlo evita tener que preguntárselo a
 * quien solo quiere pegar sus datos.
 *
 * @param {string} texto
 * @returns {Array[]} Filas, cada una un arreglo de celdas.
 */
function leerPlanillaPegada(texto) {
  if (!texto || !texto.trim()) return [];

  const primeraLinea = texto.split(/\r?\n/)[0] || '';

  const candidatos = [
    { signo: '\t', cuantos: (primeraLinea.match(/\t/g) || []).length },
    { signo: ';',  cuantos: (primeraLinea.match(/;/g) || []).length },
    { signo: ',',  cuantos: (primeraLinea.match(/,/g) || []).length },
  ].sort((a, b) => b.cuantos - a.cuantos);

  const separador = candidatos[0].cuantos > 0 ? candidatos[0].signo : '\t';

  return partirRespetandoComillas(texto, separador);
}

/**
 * Parte el texto en filas y celdas, respetando las comillas.
 *
 * Una celda entre comillas puede contener el separador, saltos de línea
 * y comillas dobladas. Sin respetar eso, una nota con una coma parte la
 * fila en dos y desalinea todo lo que sigue.
 *
 * @param {string} texto
 * @param {string} separador
 * @returns {Array[]}
 */
function partirRespetandoComillas(texto, separador) {
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"') {
        // Dos comillas seguidas son una comilla literal.
        if (texto[i + 1] === '"') { celda += '"'; i++; }
        else entreComillas = false;
      } else {
        celda += c;
      }
      continue;
    }

    if (c === '"')            { entreComillas = true; continue; }
    if (c === separador)      { fila.push(celda); celda = ''; continue; }

    if (c === '\n' || c === '\r') {
      // \r\n cuenta como un solo salto.
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
      continue;
    }

    celda += c;
  }

  // Lo que quedó sin cerrar al final.
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }

  // Se descartan las filas totalmente vacías.
  return filas.filter(f => f.some(x => String(x).trim() !== ''));
}


/* ─── 2. LA PANTALLA ───────────────────────────────────────────────── */

/**
 * Abre el importador.
 *
 * @returns {void}
 */
function abrirImportador() {
  const cuerpo = abrirHoja('Importar desde una hoja de cálculo',
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      '<button class="filtro activo" data-que="invitados">Invitados</button>' +
      '<button class="filtro" data-que="cotizaciones">Cotizaciones</button>' +
    '</div>' +

    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'En Google Sheets o Excel, selecciona las filas <strong>incluyendo ' +
      'la de los títulos</strong>, copia con Ctrl+C, y pega aquí abajo. ' +
      'O sube un archivo, que para listas largas es más cómodo.' +
    '</p>' +

    /* ⚡ MUDAR LA LISTA DE UN ENTORNO A OTRO (2026-09-04)
       La lista de invitados se carga una vez y hay que tenerla en los
       dos lados. Reescribir 51 familias a mano es horas de tipeo y una
       fuente de errores. Las dos mitades viven acá, juntas y en orden:
       se baja de un entorno y se sube en el otro. */
    '<div class="tarjeta" style="padding:var(--esp-2);margin-bottom:var(--esp-3)">' +
      '<p class="campo__rotulo" style="margin:0 0 var(--gota)">' +
        'Mudar la lista a otro entorno' +
      '</p>' +
      '<p class="vacio__texto" style="margin:0 0 var(--esp-2)">' +
        'Descarga la lista completa de aquí y súbela allá con el selector ' +
        'de abajo. <strong>No hace falta abrir el archivo</strong>: si lo ' +
        'abres en Excel y lo vuelves a guardar, los acentos se rompen.' +
      '</p>' +
      '<button class="boton" id="imp-bajar-lista">' +
        'Descargar la lista de este entorno' +
      '</button>' +
    '</div>' +

    '<label class="campo">' +
      '<span class="campo__rotulo">Sube el archivo</span>' +
      '<input type="file" id="imp-archivo" ' +
             'accept=".csv,.txt,text/csv,text/plain">' +
    '</label>' +

    '<label class="campo">' +
      '<span class="campo__rotulo">…o pega aquí</span>' +
      '<textarea id="imp-pegado" class="campo__control" style="min-height:150px" ' +
                'placeholder="Ctrl+V"></textarea>' +
    '</label>' +

    '<button class="boton boton--principal boton--ancho" id="imp-analizar">' +
      'Ver qué entendí' +
    '</button>' +

    '<div id="imp-resultado" style="margin-top:var(--esp-3)"></div>'
  );

  const area = buscar('#imp-pegado', cuerpo);
  area.focus();

  /* Analizar apenas se pega, sin tener que apretar el botón. El botón
     igual queda, por si se escribe a mano o se pega con el menú. */
  area.addEventListener('paste', () => {
    setTimeout(() => analizarLoPegado(cuerpo), 60);
  });

  buscar('#imp-analizar', cuerpo).addEventListener('click', () =>
    analizarLoPegado(cuerpo));

  /* ⚡ EL ARCHIVO ENTRA POR EL MISMO CAMINO QUE EL PEGADO (2026-09-04)
     Se vuelca en el mismo <textarea> y se llama al mismo analizador. No
     hay una segunda ruta que mantener, ni una vista previa que se
     comporte distinto según por dónde entraron los datos — que es
     exactamente el tipo de diferencia que después nadie prueba.

     Y queda a la vista en el cuadro de texto: si el archivo trae algo
     raro, se ve antes de importar y se puede corregir a mano. */
  const entradaDeArchivo = buscar('#imp-archivo', cuerpo);
  entradaDeArchivo.addEventListener('change', () => {
    const archivo = entradaDeArchivo.files && entradaDeArchivo.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      area.value = String(lector.result || '');
      analizarLoPegado(cuerpo);
    };
    lector.onerror = () => avisar('No pude leer ese archivo.', true);

    // UTF-8 explícito: es como lo escribe el exportador del panel.
    lector.readAsText(archivo, 'UTF-8');
  });

  buscar('#imp-bajar-lista', cuerpo).addEventListener('click', () =>
    exportarParaMudanza());

  buscarTodos('[data-que]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      QUE_SE_IMPORTA = boton.dataset.que;
      buscarTodos('[data-que]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o === boton));

      buscar('#imp-resultado', cuerpo).innerHTML = '';
      if (buscar('#imp-pegado', cuerpo).value.trim()) analizarLoPegado(cuerpo);
    });
  });
}

/** Qué se está importando: 'invitados' o 'cotizaciones'. */
let QUE_SE_IMPORTA = 'invitados';

/**
 * Lee una tabla de cotizaciones pegada.
 *
 * SE INTERPRETA ACÁ Y NO EN EL SERVIDOR porque una comparativa no tiene
 * una forma fija: la de Ania tiene los proveedores en COLUMNAS y los
 * servicios en FILAS, que es al revés de una tabla normal. Adivinar eso
 * necesita mirar la planilla, no un mapa de columnas.
 *
 * Se busca la fila que tenga varios precios y se toma cada columna como
 * un proveedor distinto.
 *
 * @param {Array[]} filas
 * @returns {Array} [{ proveedor, monto, incluye }]
 */
function leerCotizacionesPegadas(filas) {
  if (filas.length < 2) return [];

  /* Se busca la fila con más números que parezcan precios. En la
     planilla de Ania es la de "Precio por persona". */
  let filaDePrecios = -1;
  let masPrecios = 0;

  filas.forEach((fila, i) => {
    const precios = fila.filter(c => sacarNumero(c) > 0).length;
    if (precios > masPrecios) { masPrecios = precios; filaDePrecios = i; }
  });

  if (filaDePrecios < 0 || masPrecios < 2) return [];

  /* Los nombres salen de alguna fila de arriba. Se toma la que tenga
     más celdas con texto y sin números: los encabezados. */
  let filaDeNombres = 0;
  let masTexto = 0;

  for (let i = 0; i < filaDePrecios; i++) {
    const texto = filas[i].filter(c =>
      String(c).trim().length > 2 && sacarNumero(c) === 0).length;
    if (texto > masTexto) { masTexto = texto; filaDeNombres = i; }
  }

  const salida = [];

  filas[filaDePrecios].forEach((celda, columna) => {
    const monto = sacarNumero(celda);
    if (monto <= 0) return;

    const nombre = String(filas[filaDeNombres][columna] || '').trim();
    if (!nombre) return;

    /* Todo lo que diga esa columna en las demás filas, como resumen de
       qué incluye. Es texto libre: sirve para leerlo, no para calcular. */
    const incluye = filas
      .map((fila, i) => {
        if (i === filaDePrecios || i === filaDeNombres) return '';
        const que = String(fila[0] || '').trim();
        const valor = String(fila[columna] || '').trim();
        if (!que || !valor || valor === '—') return '';
        return que + ': ' + valor;
      })
      .filter(Boolean)
      .slice(0, 25)
      .join('\n');

    salida.push({ proveedor: nombre, monto: monto, incluye: incluye });
  });

  return salida;
}

/** Los números chicos que se leyeron como precio en la tanda actual.
    Puede que sean cantidades ("6 horas") y no pesos: se avisa en la
    vista previa en vez de convertirlos en 0 por las dudas. */
let NUMEROS_SOSPECHOSOS = [];

/**
 * Saca un precio de una celda como "$880 pp" o "620.0".
 *
 * @param {*} celda
 * @returns {number} 0 si no hay número.
 */
function sacarNumero(celda) {
  const texto = String(celda === null || celda === undefined ? '' : celda);
  const limpio = texto.replace(/[^\d.,]/g, '').replace(/,/g, '');

  const numero = parseFloat(limpio);
  if (!isFinite(numero) || numero <= 0) return 0;

  /* ⚠️ YA NO SE TIRA EL NÚMERO, SE AVISA (2026-09-04).
     Acá había un `numero >= 50 ? numero : 0`: todo precio menor a 50 se
     convertía en 0 EN SILENCIO. La intención era buena —en una planilla
     de cotizaciones un "6" suele ser "6 horas" y no seis pesos— pero el
     efecto era que una cotización de $40 por servilleta entraba como
     gratis, y quedaba así en el presupuesto sin que nada lo dijera.

     Ahora el número se conserva y se anota qué se dudó. Quien pega la
     planilla ve la vista previa antes de confirmar (ver
     analizarLoPegado): con el aviso puede corregirlo ahí; con el 0
     silencioso no tenía cómo enterarse. */
  if (numero < 50) NUMEROS_SOSPECHOSOS.push(numero);

  return numero;
}

/**
 * Manda lo pegado al servidor y pinta la vista previa.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function analizarLoPegado(cuerpo) {
  const donde = buscar('#imp-resultado', cuerpo);
  const texto = buscar('#imp-pegado', cuerpo).value;

  const filas = leerPlanillaPegada(texto);

  if (filas.length < 2) {
    donde.innerHTML = '<p class="aviso-error">Pega al menos la fila de ' +
                      'títulos y una fila de datos.</p>';
    return;
  }

  // Las cotizaciones se interpretan en el teléfono: ver el comentario
  // de leerCotizacionesPegadas().
  if (QUE_SE_IMPORTA === 'cotizaciones') {
    // Se vacía antes de leer: el aviso tiene que ser de ESTA tanda.
    NUMEROS_SOSPECHOSOS = [];
    pintarPreviaDeCotizaciones(donde, cuerpo, leerCotizacionesPegadas(filas));
    return;
  }

  donde.innerHTML = '<div class="esqueleto"></div>'.repeat(2);

  try {
    IMPORTACION = await mandar('importar.php?accion=analizar', { filas: filas });
  } catch (error) {
    donde.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  pintarVistaPreviaDeImportacion(donde, cuerpo);
}


/* ─── 3. LA VISTA PREVIA ───────────────────────────────────────────── */

/**
 * Muestra qué entendió el servidor y ofrece importar.
 *
 * @param {Element} donde
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarVistaPreviaDeImportacion(donde, cuerpo) {
  const r = IMPORTACION.resumen;

  /* Qué columna reconoció para cada cosa. Se muestra porque es el punto
     donde una importación se tuerce sin que nadie se dé cuenta: si tomó
     la columna equivocada como "nombre", lo mejor es verlo ahora. */
  const nombresDeCampo = {
    nombre: 'Nombre', contacto: 'Contacto', grupo: 'Grupo o relación',
    mesa: 'Mesa', rsvp: 'Confirmación', menu: 'Menú o alergias',
    adultos: 'Adultos', ninos: 'Niños', notas: 'Notas',
  };

  const columnas = Object.keys(IMPORTACION.columnas).map(campo =>
    '<span class="etiqueta etiqueta--info">' +
      seguro(nombresDeCampo[campo] || campo) +
    '</span>'
  ).join(' ');

  const faltantes = Object.keys(nombresDeCampo)
    .filter(c => IMPORTACION.columnas[c] === undefined)
    .map(c => nombresDeCampo[c]);

  const grupos = Object.keys(IMPORTACION.grupos || {});

  // Las primeras filas, para poder confirmar de un vistazo.
  const muestra = IMPORTACION.filas.slice(0, 5).map(f =>
    '<div class="lista__fila">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(f.nombre) + '</span>' +
        '<span class="lista__pie">' +
          seguro([
            (f.adultos + f.ninos) + ' personas',
            f.grupo,
            f.mesa,
          ].filter(Boolean).join(' · ')) +
        '</span>' +
      '</span>' +
      '<span class="lista__lado">' +
        (f.asiste
          ? '<span class="etiqueta etiqueta--bien">Asiste</span>'
          : '<span class="etiqueta etiqueta--tenue">Sin confirmar</span>') +
      '</span>' +
    '</div>'
  ).join('');

  donde.innerHTML =
    '<div class="rejilla-datos">' +
      tarjetaDato(r.filas,    'Filas') +
      tarjetaDato(r.personas, 'Personas') +
      tarjetaDato(r.grupos,   'Grupos') +
      tarjetaDato(r.mesas,    'Mesas') +
    '</div>' +

    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Columnas reconocidas</div>' +
      '<div class="menus-mini">' + columnas + '</div>' +
      (faltantes.length
        ? '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'No encontré: ' + seguro(faltantes.join(', ')) + '. ' +
          'Si alguna de esas te importa, agregale el título a la columna ' +
          'en la hoja de cálculo y vuelve a pegar.</p>'
        : '') +
    '</div>' +

    (grupos.length
      ? '<div class="tarjeta">' +
          '<div class="tarjeta__titulo">Grupos que encontré</div>' +
          '<div class="menus-mini">' +
            grupos.map(g => '<span class="etiqueta">' + seguro(g) +
                            ' (' + IMPORTACION.grupos[g] + ')</span>').join(' ') +
          '</div>' +
        '</div>'
      : '') +

    ((IMPORTACION.repetidos || []).length
      ? '<p class="aviso-error">' +
        seguro(IMPORTACION.repetidos.length) + ' ya están en la base: ' +
        seguro(acortar(IMPORTACION.repetidos.join(', '), 120)) +
        '</p>'
      : '') +

    (IMPORTACION.descartadas
      ? '<p class="vacio__texto">Se ignoraron ' + seguro(IMPORTACION.descartadas) +
        ' filas vacías o de totales.</p>'
      : '') +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      'Las primeras ' + Math.min(5, IMPORTACION.filas.length) +
    '</div>' +
    muestra +

    '<div class="tarjeta" style="margin-top:var(--esp-3)">' +
      campoCasilla({ id: 'imp-grupos', rotulo: 'Crear los grupos que encontré',
                     marcado: grupos.length > 0 }) +
      campoCasilla({ id: 'imp-mesas', rotulo: 'Crear las mesas y sentar a la gente',
                     marcado: (IMPORTACION.mesas || []).length > 0 }) +
      campoCasilla({ id: 'imp-repetidos', rotulo: 'Saltear los que ya están',
                     marcado: true }) +
    '</div>' +

    '<button class="boton boton--principal boton--ancho" id="imp-importar">' +
      'Importar ' + seguro(r.filas) + ' invitados' +
    '</button>';

  buscar('#imp-importar', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#imp-importar', cuerpo);

    if (!await confirmarAccion('¿Importar ' + r.filas + ' invitados?\n\n' +
                         'Suman ' + r.personas + ' personas.')) return;

    boton.disabled = true;
    boton.textContent = 'Importando…';

    try {
      const salida = await mandar('importar.php?accion=invitados', {
        filas: IMPORTACION.filas,
        crear_grupos:      !!valorDe('imp-grupos', cuerpo),
        crear_mesas:       !!valorDe('imp-mesas', cuerpo),
        saltear_repetidos: !!valorDe('imp-repetidos', cuerpo),
      });

      cerrarHoja(true);
      avisar(salida.mensaje);

      // Todo lo que muestra invitados cambió: se recarga entero.
      ensuciarVistas('resumen', 'invitados', 'evento');
      CONTACTOS = [];
      irA('invitados', true);

    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Importar ' + r.filas + ' invitados';
    }
  });
}


/* ─── 4. COTIZACIONES ──────────────────────────────────────────────── */

/**
 * Muestra las cotizaciones que se entendieron y ofrece importarlas.
 *
 * @param {Element} donde
 * @param {Element} cuerpo
 * @param {Array} encontradas
 * @returns {void}
 */
function pintarPreviaDeCotizaciones(donde, cuerpo, encontradas) {
  if (!encontradas.length) {
    donde.innerHTML =
      '<p class="aviso-error">No encontré precios en lo que pegaste.<br><br>' +
      'Para una comparativa, pega el bloque que tenga los nombres de los ' +
      'salones arriba y la fila de precios debajo.</p>';
    return;
  }

  /* Los números chicos que se leyeron como precio. Antes se convertían
     en 0 en silencio y una cotización de $40 entraba como gratis; ahora
     se muestran acá, que es el único momento en que se pueden corregir
     antes de que queden guardados. Ver sacarNumero(). */
  const dudosos = NUMEROS_SOSPECHOSOS.length
    ? '<p class="aviso-error" style="margin-bottom:var(--esp-2)">' +
        'Ojo con ' + seguro(NUMEROS_SOSPECHOSOS.join(', ')) + ': son ' +
        'números muy chicos para ser precios. Si en la planilla eran ' +
        'cantidades («6 horas») y no pesos, corrígelos antes de guardar.' +
      '</p>'
    : '';

  donde.innerHTML =
    dudosos +
    '<div class="rejilla-datos">' +
      tarjetaDato(encontradas.length, 'Encontradas') +
    '</div>' +

    campoTexto({ id: 'imp-servicio', rotulo: 'Qué servicio son',
                 valor: 'Salón',
                 ayuda: 'Todas se guardan bajo este rubro, que es lo que ' +
                        'después permite compararlas entre sí.' }) +

    encontradas.map(c =>
      '<div class="lista__fila">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(c.proveedor) + '</span>' +
          '<span class="lista__pie">' +
            seguro(acortar(c.incluye.replace(/\n/g, ' · '), 60)) + '</span>' +
        '</span>' +
        '<span class="lista__lado cifra">' +
          seguro(comoDinero(c.monto, false)) + '</span>' +
      '</div>'
    ).join('') +

    '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
      'Los precios se guardan como <strong>precio por persona</strong>, que ' +
      'es como cobran casi todos los salones. Si alguno es un precio ' +
      'cerrado, cambialo después en su ficha.' +
    '</p>' +

    '<button class="boton boton--principal boton--ancho" id="imp-cot" ' +
            'style="margin-top:var(--esp-2)">' +
      'Importar ' + seguro(encontradas.length) + ' cotizaciones' +
    '</button>';

  buscar('#imp-cot', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#imp-cot', cuerpo);

    /* Importar invitados pregunta y esto no preguntaba nada, siendo la
       misma clase de acción: escribir de golpe un montón de filas que
       después hay que borrar una por una si estaban mal. */
    if (!await confirmarAccion(
      '¿Importar ' + encontradas.length + ' cotizaciones?\n\n' +
      'Se agregan al rubro «' + (valorDe('imp-servicio', cuerpo) || 'Salón') +
      '». Si algo sale mal, hay que borrarlas una por una.',
      { confirmar: 'Importar' })) return;

    boton.disabled = true;
    boton.textContent = 'Importando…';

    try {
      const r = await mandar('importar.php?accion=cotizaciones', {
        servicio: valorDe('imp-servicio', cuerpo) || 'Salón',
        filas: encontradas.map(c => ({
          proveedor: c.proveedor,
          monto: c.monto,
          incluye: c.incluye,
        })),
      });

      cerrarHoja(true);
      avisar(r.mensaje);
      ensuciarVistas('dinero');
      SECCION_DINERO = 'cotizaciones';
      irA('dinero', true);

    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Importar ' + encontradas.length + ' cotizaciones';
    }
  });
}
