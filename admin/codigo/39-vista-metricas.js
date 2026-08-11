/* ══════════════════════════════════════════════════════════════════════
   39 · PANEL DE MÉTRICAS (Fase 7 del rediseño)

   QUÉ HACE ESTE ARCHIVO
   La hoja "Métricas de uso", visible solo para la cuenta observadora
   (ver esObservador(), api/_lib/sesion.php, y el filtro en dibujarMas(),
   05-navegacion.js). Resume los eventos que ya viene anotando
   registrarEvento() (38-metricas.js) y arma la descarga en .txt.

   POR QUÉ EL .TXT SE ARMA ACÁ Y NO EN EL SERVIDOR
   Mismo criterio que ya usa 13-exportar.js: los datos ya están (o se
   piden una vez) en el teléfono, así que armar el texto en JS evita un
   viaje de ida y vuelta y funciona igual con mala señal.
   ══════════════════════════════════════════════════════════════════════ */


/** El resumen que se está mostrando ahora mismo, para no volver a
    pedirlo al cambiar de rango si ya se tiene. */
let METRICAS_RANGO_DIAS = 7;

/**
 * Abre la hoja de métricas.
 *
 * @returns {void}
 */
function abrirMetricas() {
  const cuerpo = abrirHoja('Métricas de uso', '<div class="esqueleto"></div>'.repeat(4));
  cargarYPintarMetricas(cuerpo, METRICAS_RANGO_DIAS);
}

/**
 * Pide el resumen de un rango y lo pinta.
 *
 * @param {Element} cuerpo
 * @param {number} dias - 7, 30, o 0 para todo el historial.
 * @returns {Promise<void>}
 */
async function cargarYPintarMetricas(cuerpo, dias) {
  METRICAS_RANGO_DIAS = dias;

  let r;
  try {
    r = await traer('metricas.php?accion=resumen&dias=' + dias);
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => cargarYPintarMetricas(cuerpo, dias));
    return;
  }

  cuerpo.innerHTML =
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      ['7', '30', '0'].map(valor =>
        '<button class="filtro' + (dias === Number(valor) ? ' activo' : '') +
          '" data-rango-metricas="' + valor + '">' +
          (valor === '0' ? 'Todo' : 'Últimos ' + valor + ' días') +
        '</button>'
      ).join('') +
    '</div>' +

    '<div class="rejilla-datos" style="margin-bottom:var(--esp-3)">' +
      tarjetaDato(r.total_eventos, 'Eventos') +
      tarjetaDato(r.usuarios_activos, 'Usuarios activos') +
      tarjetaDato(r.frases_fallidas.length, 'Frases sin entender') +
      tarjetaDato(sumaDeFricciones(r.fricciones), 'Posibles fricciones') +
    '</div>' +

    bloqueTopDeMetricas('Pantallas más usadas', r.top_pantallas) +
    bloqueTopDeMetricas('Acciones más frecuentes', r.top_acciones) +
    bloqueFrasesDeMetricas('Frases que el asistente entendió', r.frases_ok, 'bien') +
    bloqueFrasesDeMetricas('Frases que no entendió', r.frases_fallidas, 'alerta') +
    bloqueFriccionesDeMetricas(r.fricciones) +

    '<button class="boton boton--principal boton--ancho" id="metricas-descargar" ' +
            'style="margin-top:var(--esp-3)">Descargar métricas (.txt)</button>';

  buscarTodos('[data-rango-metricas]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      cargarYPintarMetricas(cuerpo, Number(boton.dataset.rangoMetricas)));
  });

  buscar('#metricas-descargar', cuerpo).addEventListener('click', () => descargarMetricas(dias));
}

/**
 * Suma cuántas fricciones hay en total, para la tarjeta resumen.
 *
 * @param {Object} fricciones - { nombre: cuantos }
 * @returns {number}
 */
function sumaDeFricciones(fricciones) {
  return Object.values(fricciones || {}).reduce((suma, n) => suma + Number(n), 0);
}

/**
 * Una lista simple "nombre — cuantos", para pantallas y acciones.
 *
 * @param {string} titulo
 * @param {Array<{nombre:string, cuantos:number}>} filas
 * @returns {string} HTML
 */
function bloqueTopDeMetricas(titulo, filas) {
  if (!filas || !filas.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      seguro(titulo) +
    '</div>' +
    '<div class="tarjeta">' +
      filas.map(f =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(nombreLegibleDeMetrica(f.nombre)) + '</span>' +
          '<span class="cifra">' + seguro(f.cuantos) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * Las frases del asistente, usadas o fallidas.
 *
 * @param {string} titulo
 * @param {Array<{texto:string, cuantos:number}>} filas
 * @param {string} tono - 'bien' | 'alerta'
 * @returns {string} HTML
 */
function bloqueFrasesDeMetricas(titulo, filas, tono) {
  if (!filas || !filas.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      seguro(titulo) +
    '</div>' +
    '<div class="tarjeta">' +
      filas.map(f =>
        '<div class="comparador__renglon">' +
          '<span>"' + seguro(f.texto) + '"</span>' +
          '<span class="etiqueta etiqueta--' + tono + '">' + seguro(f.cuantos) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * Los puntos de fricción detectados, en lenguaje llano.
 *
 * @param {Object} fricciones - { nombre: cuantos }
 * @returns {string} HTML
 */
function bloqueFriccionesDeMetricas(fricciones) {
  const claves = Object.keys(fricciones || {});
  if (!claves.length) {
    return '<p class="vacio__texto" style="margin-top:var(--esp-3);color:var(--bien)">' +
      'Sin señales de fricción en este rango.</p>';
  }

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      'Posibles puntos de fricción' +
    '</div>' +
    '<div class="tarjeta">' +
      claves.map(clave =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(nombreLegibleDeMetrica(clave)) + '</span>' +
          '<span class="etiqueta etiqueta--ojo">' + seguro(fricciones[clave]) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * El nombre técnico de un evento, en palabras.
 *
 * @param {string} clave
 * @returns {string}
 */
function nombreLegibleDeMetrica(clave) {
  const nombres = {
    hoy: 'Hoy', resumen: 'Resumen', planificar: 'Planificar', mas: 'Más',
    invitados: 'Gente', correo: 'Correo', dinero: 'Presupuesto', evento: 'Evento',
    abrir_ficha_invitado: 'Abrir ficha de invitado',
    asignar_mesa: 'Asignar mesa',
    marcar_llegada: 'Marcar llegada / escanear pase',
    crear_editar_acompanante: 'Crear o editar acompañante',
    marcar_pago: 'Marcar pago',
    crear_tarea: 'Crear tarea',
    busqueda_vacia: 'Búsquedas que no encontraron nada',
    abrir_cerrar_repetido: 'Abrir y cerrar lo mismo varias veces seguidas',
  };
  return nombres[clave] || clave;
}

/**
 * Pide los eventos crudos del rango y arma el .txt, con el mismo
 * formato que describe panel-metricas-observabilidad.txt: pensado para
 * pegarse directo en Claude Code y pedirle un análisis.
 *
 * @param {number} dias
 * @returns {Promise<void>}
 */
async function descargarMetricas(dias) {
  avisar('Preparando el archivo…');

  let resumen, crudo;
  try {
    [resumen, crudo] = await Promise.all([
      traer('metricas.php?accion=resumen&dias=' + dias),
      traer('metricas.php?accion=exportar&dias=' + dias),
    ]);
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  const eventos = crudo.eventos || [];
  const ahora = new Date();
  const exportadoEn =
    ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
    String(ahora.getDate()).padStart(2, '0') + ' ' +
    String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');

  const pantallaTop = resumen.top_pantallas[0];
  const accionTop = resumen.top_acciones[0];
  const totalVistas = resumen.top_pantallas.reduce((s, f) => s + Number(f.cuantos), 0) || 1;

  const lineas = [];
  lineas.push('═'.repeat(60));
  lineas.push('MÉTRICAS DE USO · ANIA XV ADMIN');
  lineas.push('Exportado: ' + exportadoEn);
  lineas.push('Rango: ' + (dias === 0 ? 'todo el historial' : 'últimos ' + dias + ' días'));
  lineas.push('═'.repeat(60));
  lineas.push('');

  lineas.push('## RESUMEN RÁPIDO');
  lineas.push('- Eventos totales: ' + resumen.total_eventos);
  lineas.push('- Usuarios activos: ' + resumen.usuarios_activos);
  lineas.push('- Pantalla más usada: ' + (pantallaTop
    ? nombreLegibleDeMetrica(pantallaTop.nombre) + ' (' +
      Math.round(pantallaTop.cuantos / totalVistas * 100) + '%)'
    : '—'));
  lineas.push('- Acción más frecuente: ' + (accionTop
    ? nombreLegibleDeMetrica(accionTop.nombre) + ' (' + accionTop.cuantos + ')'
    : '—'));
  lineas.push('- Frases de asistente no entendidas: ' + resumen.frases_fallidas.length);
  lineas.push('- Posibles fricciones detectadas: ' + sumaDeFricciones(resumen.fricciones));
  lineas.push('');

  lineas.push('## TOP PANTALLAS');
  resumen.top_pantallas.forEach((f, i) => {
    lineas.push((i + 1) + '. ' + nombreLegibleDeMetrica(f.nombre) + ' — ' + f.cuantos + ' vistas — ' +
      Math.round(f.cuantos / totalVistas * 100) + '%');
  });
  lineas.push('');

  lineas.push('## TOP ACCIONES');
  resumen.top_acciones.forEach((f, i) => {
    lineas.push((i + 1) + '. ' + nombreLegibleDeMetrica(f.nombre) + ' — ' + f.cuantos);
  });
  lineas.push('');

  lineas.push('## FRASES DEL ASISTENTE');
  lineas.push('Usadas con éxito:');
  if (resumen.frases_ok.length) {
    resumen.frases_ok.forEach(f => lineas.push('- "' + f.texto + '"  ' + f.cuantos));
  } else {
    lineas.push('(ninguna en este rango)');
  }
  lineas.push('No entendidas / fallidas:');
  if (resumen.frases_fallidas.length) {
    resumen.frases_fallidas.forEach(f => lineas.push('- "' + f.texto + '"  ' + f.cuantos));
  } else {
    lineas.push('(ninguna en este rango)');
  }
  lineas.push('');

  lineas.push('## POSIBLES PUNTOS DE FRICCIÓN');
  const clavesFriccion = Object.keys(resumen.fricciones || {});
  if (clavesFriccion.length) {
    clavesFriccion.forEach(clave =>
      lineas.push('- ' + nombreLegibleDeMetrica(clave) + ': ' + resumen.fricciones[clave] + ' casos'));
  } else {
    lineas.push('(sin señales de fricción en este rango)');
  }
  lineas.push('');

  lineas.push('## EVENTOS DETALLADOS (orden cronológico)');
  eventos.forEach(e => {
    const detalle = e.payload ? ' detalle=' + e.payload : '';
    lineas.push(
      e.creado_en + '  ' + e.usuario + '  pantalla=' + (e.pantalla || '—') +
      '  tipo=' + e.tipo + '  evento=' + e.nombre + detalle
    );
  });

  lineas.push('');
  lineas.push('Este archivo está pensado para pegarse en Claude Code junto con el');
  lineas.push('contexto del proyecto y pedirle: "Analiza este uso real del panel y');
  lineas.push('dime dónde hay más fricción, qué atajos faltan y qué mejoras concretas');
  lineas.push('priorizar".');

  const nombreArchivo = 'metricas-aniaxv-' + exportadoEn.slice(0, 10) + '.txt';
  bajarArchivo(nombreArchivo, lineas.join('\n'), 'text/plain');
}
