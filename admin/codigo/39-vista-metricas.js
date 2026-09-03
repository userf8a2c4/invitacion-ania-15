/* ══════════════════════════════════════════════════════════════════════
   39 · PANEL DE MÉTRICAS (Fase 8 del rediseño)

   QUÉ HACE ESTE ARCHIVO
   La hoja "Métricas de uso", visible solo para la cuenta observadora
   (ver esObservador(), api/_lib/sesion.php, y el filtro en dibujarMas(),
   05-navegacion.js). Resume los eventos que anota registrarEvento()
   (38-metricas.js) — no solo qué se toca, sino qué cuesta: ranking de
   fricción, tendencia por día, tiempo por pantalla, endpoints lentos, y
   completitud del evento como contexto para interpretar todo lo demás.

   POR QUÉ EL .TXT SE ARMA ACÁ Y NO EN EL SERVIDOR
   Mismo criterio que ya usa 13-exportar.js: los datos ya están (o se
   piden una vez) en el teléfono, así que armar el texto en JS evita un
   viaje de ida y vuelta y funciona igual con mala señal.
   ══════════════════════════════════════════════════════════════════════ */


/** El rango que se está mostrando ahora mismo. */
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
      tarjetaDato(r.ranking_friccion.reduce((s, f) => s + Number(f.cuantos), 0), 'Fricciones') +
    '</div>' +

    bloqueCompletitud(r.completitud) +
    bloqueTendencia(r.tendencia_por_dia) +
    bloqueRankingDeFriccion(r.ranking_friccion) +
    bloqueTiempoPorPantalla(r.tiempo_por_pantalla) +
    bloqueTopDeMetricas('Pantallas más usadas', r.top_pantallas) +
    bloqueTopDeMetricas('Acciones más frecuentes', r.top_acciones) +
    bloqueEndpointsLentos(r.endpoints_lentos) +
    bloqueFrasesDeMetricas('Frases que el asistente entendió', r.frases_ok, 'bien') +
    bloqueFrasesDeMetricas('Frases que no entendió', r.frases_fallidas, 'alerta') +

    '<button class="boton boton--principal boton--ancho" id="metricas-descargar" ' +
            'style="margin-top:var(--esp-3)">Descargar métricas (.txt)</button>';

  buscarTodos('[data-rango-metricas]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      cargarYPintarMetricas(cuerpo, Number(boton.dataset.rangoMetricas)));
  });

  buscar('#metricas-descargar', cuerpo).addEventListener('click', () => descargarMetricas(dias));
}

/**
 * Qué tan completo está el evento — el contexto sin el cual el resto de
 * los números no se puede interpretar (poca actividad puede ser "ya
 * está todo cargado", no "no se usa").
 *
 * @param {Object} c - { mesas_pct, acompanantes_pct, pagos_al_dia_pct }
 * @returns {string} HTML
 */
function bloqueCompletitud(c) {
  if (!c || (c.mesas_pct === null && c.acompanantes_pct === null && c.pagos_al_dia_pct === null)) {
    return '';
  }

  const pct = v => v === null ? '—' : v + '%';

  return '' +
    '<div class="tarjeta__titulo" style="margin-bottom:var(--esp-2)">Completitud del evento</div>' +
    '<div class="rejilla-datos" style="margin-bottom:var(--esp-3)">' +
      tarjetaDato(pct(c.mesas_pct), 'Con mesa') +
      tarjetaDato(pct(c.acompanantes_pct), 'Acompañantes nombrados') +
      tarjetaDato(pct(c.pagos_al_dia_pct), 'Pagos al día') +
    '</div>';
}

/**
 * Eventos por día — contesta "¿cuándo trabaja?" de un vistazo, como una
 * barra horizontal simple por fila (sin librería de gráficos).
 *
 * @param {Array<{dia:string, cuantos:number}>} filas
 * @returns {string} HTML
 */
function bloqueTendencia(filas) {
  if (!filas || filas.length < 2) return '';

  const maximo = Math.max(...filas.map(f => Number(f.cuantos))) || 1;

  return '' +
    '<div class="tarjeta__titulo" style="margin-bottom:var(--esp-2)">Cuándo se usa</div>' +
    '<div class="tarjeta">' +
      filas.map(f => {
        const pct = Math.max(4, Math.round(Number(f.cuantos) / maximo * 100));
        return '' +
          '<div style="margin-bottom:var(--esp-1)">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;' +
                 'color:var(--texto-tenue);margin-bottom:2px">' +
              '<span>' + seguro(comoFecha(f.dia)) + '</span><span>' + seguro(f.cuantos) + '</span>' +
            '</div>' +
            '<div class="barra"><div class="barra__relleno" style="width:' + pct + '%"></div></div>' +
          '</div>';
      }).join('') +
    '</div>';
}

/**
 * El ranking de fricción: lo único de verdad accionable. Abandonos,
 * errores y búsquedas vacías, todo junto y ordenado por cuánto pasa —
 * no separado por tipo, porque lo que importa es DÓNDE, no cómo se
 * llame el evento.
 *
 * @param {Array} filas
 * @returns {string} HTML
 */
function bloqueRankingDeFriccion(filas) {
  if (!filas || !filas.length) {
    return '<p class="vacio__texto" style="margin:var(--esp-2) 0;color:var(--bien)">' +
      'Sin señales de fricción en este rango.</p>';
  }

  const etiquetas = {
    formulario_abandonado: 'Formulario abandonado',
    abrir_cerrar_repetido: 'Abrir y cerrar lo mismo varias veces',
    busqueda_vacia:        'Búsqueda sin resultado',
    aviso:                 'Error visto (aviso)',
    pantalla:               'Error visto (pantalla)',
  };

  return '' +
    '<div class="tarjeta__titulo" style="margin-bottom:var(--esp-2)">' +
      'Dónde hay más fricción' +
    '</div>' +
    '<div class="tarjeta">' +
      filas.map(f =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(etiquetas[f.nombre] || f.nombre) +
            (f.pantalla ? ' <span class="vacio__texto">· ' + seguro(nombreLegibleDeMetrica(f.pantalla)) +
              '</span>' : '') +
          '</span>' +
          '<span class="etiqueta etiqueta--ojo">' + seguro(f.cuantos) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * Tiempo total y promedio por pantalla.
 *
 * @param {Array} filas
 * @returns {string} HTML
 */
function bloqueTiempoPorPantalla(filas) {
  if (!filas || !filas.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">Tiempo por pantalla</div>' +
    '<div class="tarjeta">' +
      filas.slice(0, 8).map(f =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(nombreLegibleDeMetrica(f.pantalla)) + '</span>' +
          '<span class="cifra">' + seguro(minutosYSegundos(f.total_seg)) +
            ' <span class="vacio__texto">(~' + f.promedio_seg + 's c/u)</span></span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * Los endpoints que tardaron más de lo esperado.
 *
 * @param {Array} filas
 * @returns {string} HTML
 */
function bloqueEndpointsLentos(filas) {
  if (!filas || !filas.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">Endpoints lentos</div>' +
    '<div class="tarjeta">' +
      filas.slice(0, 8).map(f =>
        '<div class="comparador__renglon">' +
          '<span>' + seguro(f.ruta) + ' <span class="vacio__texto">×' + f.veces + '</span></span>' +
          '<span class="cifra">' + f.promedio_ms + 'ms <span class="vacio__texto">' +
            '(peor ' + f.peor_ms + 'ms)</span></span>' +
        '</div>'
      ).join('') +
    '</div>';
}

/**
 * Segundos a "Xm Ys" legible.
 *
 * @param {number} total
 * @returns {string}
 */
function minutosYSegundos(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? m + 'm ' + s + 's' : s + 's';
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
 * El nombre técnico de un evento o pantalla, en palabras.
 *
 * @param {string} clave
 * @returns {string}
 */
function nombreLegibleDeMetrica(clave) {
  const nombres = {
    hoy: 'Hoy', resumen: 'Resumen', planificar: 'Planificar', mas: 'Más',
    invitados: 'Gente', correo: 'Correo', dinero: 'Dinero', evento: 'Evento',
    abrir_ficha_invitado: 'Abrir ficha de invitado',
    asignar_mesa: 'Asignar mesa',
    marcar_llegada: 'Marcar llegada / escanear pase',
    crear_editar_acompanante: 'Crear o editar acompañante',
    marcar_pago: 'Marcar pago',
    crear_tarea: 'Crear tarea',
    endpoint_lento: 'Endpoint lento',
  };
  return nombres[clave] || clave;
}

/**
 * Pide los eventos crudos del rango y arma el .txt: encabezado, resumen
 * rápido, tendencia, tiempo por pantalla, ranking de fricción, top
 * pantallas/acciones, frases del asistente, y eventos detallados —
 * pensado para pegarse directo en Claude Code.
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
  const totalFriccion = resumen.ranking_friccion.reduce((s, f) => s + Number(f.cuantos), 0);

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
  lineas.push('- Posibles fricciones detectadas: ' + totalFriccion);
  if (resumen.completitud) {
    const c = resumen.completitud;
    lineas.push('- Completitud: mesas ' + (c.mesas_pct ?? '—') + '% · acompañantes ' +
      (c.acompanantes_pct ?? '—') + '% · pagos al día ' + (c.pagos_al_dia_pct ?? '—') + '%');
  }
  lineas.push('');

  lineas.push('## TENDENCIA POR DÍA');
  if (resumen.tendencia_por_dia.length) {
    resumen.tendencia_por_dia.forEach(f => lineas.push('- ' + f.dia + ': ' + f.cuantos + ' eventos'));
  } else {
    lineas.push('(sin datos suficientes en este rango)');
  }
  lineas.push('');

  lineas.push('## DÓNDE HAY MÁS FRICCIÓN');
  if (resumen.ranking_friccion.length) {
    resumen.ranking_friccion.forEach(f =>
      lineas.push('- ' + f.nombre + (f.pantalla ? ' en ' + f.pantalla : '') + ': ' + f.cuantos + ' casos'));
  } else {
    lineas.push('(sin señales de fricción en este rango)');
  }
  lineas.push('');

  lineas.push('## TIEMPO POR PANTALLA');
  if (resumen.tiempo_por_pantalla.length) {
    resumen.tiempo_por_pantalla.forEach(f =>
      lineas.push('- ' + nombreLegibleDeMetrica(f.pantalla) + ': ' + minutosYSegundos(f.total_seg) +
        ' total, ~' + f.promedio_seg + 's por visita'));
  } else {
    lineas.push('(sin datos suficientes en este rango)');
  }
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

  lineas.push('## ENDPOINTS LENTOS (más de 1.5s)');
  if (resumen.endpoints_lentos.length) {
    resumen.endpoints_lentos.forEach(f =>
      lineas.push('- ' + f.ruta + ': ' + f.veces + ' veces, promedio ' + f.promedio_ms +
        'ms, peor ' + f.peor_ms + 'ms'));
  } else {
    lineas.push('(nada por encima del umbral en este rango)');
  }
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
