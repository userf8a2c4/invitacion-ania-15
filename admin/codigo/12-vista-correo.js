/* ══════════════════════════════════════════════════════════════════════
   12 · VISTA CORREO

   QUÉ HACE ESTE ARCHIVO
   La bandeja de info@aniaxv.com: leer, responder, marcar y borrar,
   deslizando cada correo hacia la izquierda como en cualquier app de
   correo del teléfono.

   POR QUÉ LA BANDEJA TARDA MÁS QUE LAS OTRAS PESTAÑAS
   Las demás leen la base de datos, que está en el mismo servidor. Esta
   abre una conexión al servidor de correo, se identifica y baja los
   encabezados de 40 mensajes. Son unos segundos, y por eso se avisa
   mientras carga en vez de dejar la pantalla quieta.

   ÍNDICE
     1. Dibujar la bandeja
     2. Deslizar
     3. Las acciones
     4. Leer y escribir
   ══════════════════════════════════════════════════════════════════════ */


/** Los mensajes de la última carga. */
let CORREOS = [];

/** Qué carpeta se está viendo. 'INBOX' hasta que exista el selector
    de carpetas (Fase F) — todo lo demás ya sabe pasarla de un lado a
    otro, así que agregar el selector después no toca esta parte. */
let CARPETA_ACTUAL = 'INBOX';

/** Cuánto mide la zona de botones que queda detrás de cada correo. */
const ANCHO_ACCIONES = 216;   // 3 botones de 72px


/* ─── 1. DIBUJAR LA BANDEJA ────────────────────────────────────────── */

/**
 * Pide la bandeja y la dibuja.
 *
 * @returns {Promise<void>}
 */
async function dibujarCorreo() {
  const vista = buscar('#vista-correo');

  vista.innerHTML =
    '<button class="boton boton--principal boton--ancho" id="correo-nuevo" ' +
            'style="margin-bottom:var(--esp-2)">Escribir un correo</button>' +
    '<div id="lista-correo"></div>';

  buscar('#correo-nuevo', vista).addEventListener('click', () => formularioCorreo());

  const lista = buscar('#lista-correo', vista);
  lista.innerHTML =
    '<p class="vacio__texto" style="text-align:center;padding:var(--esp-3)">' +
    'Conectando con el buzón…</p>' +
    '<div class="esqueleto"></div>'.repeat(4);

  let datos;
  try {
    datos = await traer('correo.php?accion=bandeja&carpeta=' +
                         encodeURIComponent(CARPETA_ACTUAL));
  } catch (error) {
    pintarError(lista, error.message, () => dibujarCorreo());
    throw error;
  }

  CORREOS = datos.mensajes || [];
  CARPETA_ACTUAL = datos.carpeta || CARPETA_ACTUAL;
  ponerTitulo('Correo', datos.buzon);
  ponerBurbuja('#burbuja-correo', datos.sin_leer);

  if (!CORREOS.length) {
    pintarVacio(lista, 'La bandeja está vacía',
      'Aquí van a aparecer los correos que lleguen a ' + (datos.buzon || 'tu buzón') + '.');
    return;
  }

  pintarBandeja(lista);
}

/**
 * Pinta las filas de la bandeja.
 *
 * @param {Element} lista
 * @returns {void}
 */
function pintarBandeja(lista) {
  /* La pista de deslizar se muestra solo hasta que se use por primera
     vez. Después estorba: quien ya lo sabe no necesita que se lo
     recuerden cada vez que abre el correo. */
  const yaSabeDeslizar = recordado('sabe-deslizar', false);

  lista.innerHTML =
    (yaSabeDeslizar ? '' :
      '<p class="pista-deslizar">Desliza un correo hacia la izquierda ' +
      'para responder, marcar o borrar</p>') +

    CORREOS.map((m, indice) => {
      const fecha = m.fecha ? comoCuando(m.fecha.slice(0, 10)) : '';

      return '' +
        '<div class="correo' + (m.leido ? '' : ' correo--sin-leer') + '" ' +
             'data-correo-fila="' + indice + '">' +

          /* Los botones van PRIMERO en el HTML pero se ven detrás,
             porque la tapa se pinta encima con position:relative. */
          '<div class="correo__acciones">' +
            '<button class="correo__accion correo__accion--responder" ' +
                    'data-accion="responder" data-i="' + indice + '">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M10 9V5l-7 7 7 7v-4c5 0 8 1.5 10 5-1-5-4-10-10-11z" ' +
                      'fill="currentColor"/></svg>' +
              'Responder' +
            '</button>' +

            '<button class="correo__accion correo__accion--marcar" ' +
                    'data-accion="marcar" data-i="' + indice + '">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M12 3l2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L12 17l-5.6 3 ' +
                      '1.4-6.2L3 9.5l6.4-.7z" fill="currentColor"/></svg>' +
              (m.marcado ? 'Quitar' : 'Marcar') +
            '</button>' +

            '<button class="correo__accion correo__accion--borrar" ' +
                    'data-accion="borrar" data-i="' + indice + '">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM9 4h6l1 2H8z" ' +
                      'fill="currentColor"/></svg>' +
              'Borrar' +
            '</button>' +
          '</div>' +

          '<button class="correo__tapa" data-abrir="' + indice + '">' +
            (m.leido ? '' : '<span class="punto punto--si"></span>') +
            '<span class="correo__cuerpo">' +
              '<span class="correo__asunto">' +
                (m.marcado ? '<span class="correo__estrella">★</span> ' : '') +
                seguro(m.asunto || '(sin asunto)') +
              '</span>' +
              '<span class="correo__de">' + seguro(m.de) + '</span>' +
            '</span>' +
            '<span class="correo__lado">' + seguro(fecha) + '</span>' +
          '</button>' +
        '</div>';
    }).join('');

  engancharBandeja(lista);
}


/* ─── 2. DESLIZAR ──────────────────────────────────────────────────── */

/**
 * Engancha el gesto de deslizar y los toques de cada fila.
 *
 * CÓMO FUNCIONA EL GESTO
 * Se sigue el dedo con touchstart / touchmove / touchend y se mueve la
 * tapa con transform, que es lo único que el navegador puede animar sin
 * recalcular el diseño de la página — por eso se siente fluido.
 *
 * Al soltar, si se corrió más de un tercio queda abierta; si no, vuelve.
 * Ese "imán" evita que quede a medio camino, que se ve descuidado.
 *
 * @param {Element} lista
 * @returns {void}
 */
function engancharBandeja(lista) {

  buscarTodos('.correo', lista).forEach(fila => {
    const tapa = buscar('.correo__tapa', fila);

    let inicioX = 0;
    let inicioY = 0;
    let corrido = 0;
    let arrastrando = false;
    /* Hasta no saber si el dedo va horizontal o vertical no se decide
       nada: si se moviera la tapa apenas empieza el toque, sería
       imposible desplazar la lista hacia abajo. */
    let ejeDecidido = false;

    tapa.addEventListener('touchstart', evento => {
      inicioX = evento.touches[0].clientX;
      inicioY = evento.touches[0].clientY;
      corrido = abiertaAhora(tapa);
      arrastrando = true;
      ejeDecidido = false;
      tapa.style.transition = 'none';
    }, { passive: true });

    tapa.addEventListener('touchmove', evento => {
      if (!arrastrando) return;

      const dx = evento.touches[0].clientX - inicioX;
      const dy = evento.touches[0].clientY - inicioY;

      if (!ejeDecidido) {
        // Se necesitan unos píxeles para saber hacia dónde va el dedo.
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

        if (Math.abs(dy) > Math.abs(dx)) {
          // Va vertical: es la lista, no el correo. Se suelta el gesto.
          arrastrando = false;
          tapa.style.transition = '';
          return;
        }
        ejeDecidido = true;
      }

      // Solo hacia la izquierda, y nunca más allá de los botones.
      const nuevo = Math.max(-ANCHO_ACCIONES, Math.min(0, corrido + dx));
      tapa.style.transform = 'translateX(' + nuevo + 'px)';
    }, { passive: true });

    tapa.addEventListener('touchend', () => {
      if (!arrastrando) return;
      arrastrando = false;

      tapa.style.transition = '';
      const posicion = abiertaAhora(tapa);

      // El imán: más de un tercio corrido, se abre; si no, se cierra.
      if (posicion < -ANCHO_ACCIONES / 3) {
        cerrarLasDemas(lista, tapa);
        tapa.style.transform = 'translateX(-' + ANCHO_ACCIONES + 'px)';
        recordar('sabe-deslizar', true);
      } else {
        tapa.style.transform = '';
      }
    });

    /* Tocar la tapa abre el correo, salvo que esté corrida: en ese caso
       el toque solo la cierra, que es lo que uno espera. */
    tapa.addEventListener('click', evento => {
      if (abiertaAhora(tapa) < -4) {
        evento.preventDefault();
        evento.stopPropagation();
        tapa.style.transform = '';
        return;
      }
      abrirCorreo(CORREOS[Number(tapa.dataset.abrir)].uid);
    });
  });

  buscarTodos('[data-accion]', lista).forEach(boton => {
    boton.addEventListener('click', () => {
      const correo = CORREOS[Number(boton.dataset.i)];
      accionDeCorreo(boton.dataset.accion, correo, lista);
    });
  });
}

/**
 * Cuántos píxeles está corrida una tapa ahora mismo.
 *
 * @param {Element} tapa
 * @returns {number} Negativo, o 0 si está cerrada.
 */
function abiertaAhora(tapa) {
  const t = tapa.style.transform;
  const m = t.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Cierra todas las tapas menos una.
 *
 * Tener dos correos abiertos a la vez confunde: no se sabe a cuál
 * pertenecen los botones que se ven.
 *
 * @param {Element} lista
 * @param {Element} menosEsta
 * @returns {void}
 */
function cerrarLasDemas(lista, menosEsta) {
  buscarTodos('.correo__tapa', lista).forEach(otra => {
    if (otra !== menosEsta) otra.style.transform = '';
  });
}


/* ─── 3. LAS ACCIONES ──────────────────────────────────────────────── */

/**
 * Hace lo que pide el botón que se tocó.
 *
 * @param {string} accion - 'responder' | 'marcar' | 'borrar'
 * @param {Object} correo
 * @param {Element} lista
 * @returns {Promise<void>}
 */
async function accionDeCorreo(accion, correo, lista) {

  if (accion === 'responder') {
    cerrarLasDemas(lista, null);

    /* Para responder hace falta la dirección del remitente, y la lista
       solo trae el nombre visible. Se abre el mensaje para sacarla. */
    try {
      const m = await traer('correo.php?accion=leer&uid=' + correo.uid +
                             '&carpeta=' + encodeURIComponent(CARPETA_ACTUAL));
      formularioCorreo({
        para: m.correo_de,
        asunto: /^re:/i.test(m.asunto) ? m.asunto : 'Re: ' + m.asunto,
        adjuntosDelOriginal: m.adjuntos || [],
        uidDelOriginal: m.uid,
        carpetaDelOriginal: m.carpeta,
      });
    } catch (error) {
      avisar(error.message, true);
    }
    return;
  }

  if (accion === 'marcar') {
    try {
      const r = await mandar('correo.php?accion=marcar', {
        uid: correo.uid,
        carpeta: CARPETA_ACTUAL,
        marcar: !correo.marcado,
      });
      correo.marcado = r.marcado;
      avisar(r.mensaje);
      pintarBandeja(lista);
    } catch (error) {
      avisar(error.message, true);
    }
    return;
  }

  if (accion === 'borrar') {
    if (!confirmarAccion('¿Mover este correo a la papelera?\n\n' +
                         acortar(correo.asunto, 60))) {
      cerrarLasDemas(lista, null);
      return;
    }

    try {
      const r = await mandar('correo.php?accion=borrar',
        { uid: correo.uid, carpeta: CARPETA_ACTUAL });
      avisar(r.mensaje);
      /* Se recarga la bandeja entera y no se saca la fila a mano: aunque
         ahora se borra por UID (ver imap.php), el EXPUNGE de todos modos
         puede correr el resto de la lista visible, así que lo más
         simple y seguro sigue siendo volver a pedirla completa. */
      dibujarCorreo();
    } catch (error) {
      avisar(error.message, true);
    }
  }
}


/* ─── 4. LEER Y ESCRIBIR ───────────────────────────────────────────── */

/**
 * El cuerpo del correo, listo para insertarse en el HTML de la hoja:
 * un <iframe> en sandbox si el mensaje trae parte HTML, o el texto
 * plano de siempre si no.
 *
 * @param {Object} m - El mensaje devuelto por correo.php?accion=leer
 * @returns {string}
 */
function cuerpoDeCorreo(m) {
  if (m.html) {
    // El srcdoc de verdad se pone después, en engancharCorreoHtml(): un
    // <iframe srcdoc="..."> armado a mano acá tendría que escapar
    // comillas dentro de HTML dentro de un atributo HTML — frágil y
    // fácil de romper con un correo raro. Más simple y más seguro:
    // crear el iframe vacío y asignarle .srcdoc como propiedad de JS.
    return '' +
      '<iframe id="correo-html" title="Contenido del correo" ' +
              'sandbox="allow-same-origin" ' +
              'style="width:100%;border:1px solid var(--borde);' +
                     'border-radius:8px;background:#fff;display:block;' +
                     'height:120px;margin-bottom:var(--esp-2)"></iframe>';
  }

  /* Sin parte HTML: el texto plano de siempre. white-space:pre-wrap
     conserva los saltos de línea sin convertirlos a <br> (o sea, sin
     meter HTML), y overflow-wrap:anywhere corta las URLs largas. */
  return '<div class="tarjeta" style="white-space:pre-wrap;line-height:1.6;' +
              'overflow-wrap:anywhere;margin-bottom:var(--esp-2)">' +
           seguro(m.texto || '(sin contenido)') +
         '</div>';
}

/**
 * Le pone el contenido al <iframe sandbox> del correo y ajusta su alto
 * al contenido real, una vez que termina de cargar.
 *
 * POR QUÉ ES SEGURO SIN "SANITIZAR" EL HTML A MANO
 * El sandbox NO lleva allow-scripts: ni un <script>, ni un onclick="",
 * ni nada del correo puede ejecutar código, sea lo que sea que traiga.
 * allow-same-origin solo deja que ESTA página mida el alto real del
 * contenido para no dejar un hueco en blanco ni cortar el correo — no
 * le da al correo ningún permiso nuevo, porque adentro nada corre.
 *
 * POR QUÉ NO SE PUEDEN TOCAR LOS ENLACES
 * Sin allow-popups, tocar un enlace del correo no hace nada. Es
 * a propósito: dejar que un correo ajeno abra pestañas nuevas abre la
 * puerta a que esa pestaña controle a esta (si al enlace le faltara
 * rel="noopener", que es justamente lo que no se puede garantizar en
 * HTML que no escribimos nosotros). Mejor un enlace inerte que uno que
 * podría redirigir el panel a otro lado.
 *
 * @param {string} html
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharCorreoHtml(html, cuerpo) {
  const marco = buscar('#correo-html', cuerpo);
  if (!marco) return;

  marco.addEventListener('load', () => {
    try {
      const alto = marco.contentDocument.documentElement.scrollHeight;
      marco.style.height = Math.min(Math.max(alto + 16, 120), 2400) + 'px';
    } catch (error) {
      // Si por lo que sea no se pudo medir, se deja un alto fijo
      // razonable con scroll propio en vez de quedar en blanco.
      marco.style.height = '480px';
      marco.style.overflowY = 'auto';
    }
  });

  marco.srcdoc =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' +
      'body{margin:0;padding:12px;font-family:-apple-system,"Segoe UI",' +
        'Roboto,Arial,sans-serif;color:#111;background:#fff;' +
        'word-wrap:break-word;}' +
      'img{max-width:100%;height:auto;}' +
      'table{max-width:100%;}' +
    '</style></head><body>' +
    html +
    '</body></html>';
}

/**
 * Abre un mensaje y ofrece responderlo.
 *
 * @param {number} uid
 * @returns {Promise<void>}
 */
async function abrirCorreo(uid) {
  const cuerpo = abrirHoja('Cargando…', '<div class="esqueleto"></div>'.repeat(3));

  let m;
  try {
    m = await traer('correo.php?accion=leer&uid=' + uid +
                     '&carpeta=' + encodeURIComponent(CARPETA_ACTUAL));
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirCorreo(uid));
    return;
  }

  buscar('#hoja-titulo').textContent = m.asunto || '(sin asunto)';

  cuerpo.innerHTML =
    '<div class="detalle" style="margin-bottom:var(--esp-3)">' +
      '<span class="detalle__rotulo">De</span>' +
      '<span class="detalle__valor">' + seguro(m.de) + '</span>' +
      '<span class="detalle__rotulo">Fecha</span>' +
      '<span class="detalle__valor">' + seguro(m.fecha) + '</span>' +
    '</div>' +

    cuerpoDeCorreo(m) +

    pintarAdjuntos(m) +

    '<div class="acciones">' +
      '<button class="boton" id="no-leido">Marcar sin leer</button>' +
      (m.correo_de
        ? '<button class="boton boton--principal" id="responder">Responder</button>'
        : '') +
    '</div>';

  if (m.html) engancharCorreoHtml(m.html, cuerpo);

  const responder = buscar('#responder', cuerpo);
  if (responder) {
    responder.addEventListener('click', () => {
      formularioCorreo({
        para: m.correo_de,
        asunto: /^re:/i.test(m.asunto) ? m.asunto : 'Re: ' + m.asunto,
        adjuntosDelOriginal: m.adjuntos || [],
        uidDelOriginal: m.uid,
        carpetaDelOriginal: m.carpeta,
      });
    });
  }

  buscar('#no-leido', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('correo.php?accion=no_leido',
        { uid: uid, carpeta: CARPETA_ACTUAL });
      cerrarHoja(true);
      avisar(r.mensaje);
      dibujarCorreo();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const adjuntos = m.adjuntos || [];

  buscarTodos('[data-ver-adjunto]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      abrirAdjunto(m.uid, m.carpeta, adjuntos[Number(boton.dataset.verAdjunto)], false));
  });

  buscarTodos('[data-bajar-adjunto]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      abrirAdjunto(m.uid, m.carpeta, adjuntos[Number(boton.dataset.bajarAdjunto)], true));
  });
}

/**
 * Baja un adjunto con el token de sesión y lo muestra en el visor
 * compartido (imagen o PDF), o fuerza la descarga.
 *
 * @param {number} uid - El UID del mensaje en el buzón.
 * @param {string} carpeta
 * @param {Object} adjunto - { nombre, ruta, tipo, tamano }
 * @param {boolean} forzarDescarga
 * @returns {Promise<void>}
 */
async function abrirAdjunto(uid, carpeta, adjunto, forzarDescarga) {
  const token = tokenGuardado();
  if (!token) { manejarSesionVencida(); return; }

  avisar(forzarDescarga ? 'Bajando…' : 'Abriendo…');

  try {
    const url = CONFIGURACION.servidor.base + 'correo.php?accion=adjunto&uid=' +
                uid + '&carpeta=' + encodeURIComponent(carpeta) +
                '&ruta=' + encodeURIComponent(adjunto.ruta) +
                (forzarDescarga ? '&descargar=1' : '');

    const respuesta = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!respuesta.ok) { avisar('No se pudo abrir el adjunto.', true); return; }

    const bolsa    = await respuesta.blob();
    const blobUrl  = URL.createObjectURL(bolsa);

    if (forzarDescarga) {
      const enlace = document.createElement('a');
      enlace.href = blobUrl;
      enlace.download = adjunto.nombre || 'archivo';
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      abrirVisorDeArchivo(blobUrl, adjunto.tipo, adjunto.nombre);
    }
  } catch (error) {
    avisar('No se pudo abrir el adjunto.', true);
  }
}

/**
 * Da formato legible a un tamaño en bytes.
 *
 * @param {number} bytes
 * @returns {string}
 */
function pesoLegible(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Pinta la lista de adjuntos de un mensaje, con enlaces para verlo o
 * bajarlo. Las imágenes y PDF se abren dentro del panel; el resto baja
 * directo, que es lo único que el navegador sabe hacer con ellos.
 *
 * @param {Object} m - El mensaje devuelto por correo.php?accion=leer
 * @returns {string}
 */
function pintarAdjuntos(m) {
  const lista = m.adjuntos || [];
  if (!lista.length) return '';

  /* ⚠️ NO son <a href="correo.php?...">: ese endpoint exige el token de
     sesión en la cabecera Authorization, y un enlace normal no la manda
     — el botón "Ver" tocaba y devolvía 401. Acá se engancha en
     abrirCorreo() con adjuntoAlDedo() (fetch + token), igual que ya
     resuelve esto abrirArchivo() en 14-archivos.js. */
  return '<div class="tarjeta" style="margin-top:var(--esp-2)">' +
    '<p class="detalle__rotulo" style="margin-bottom:var(--esp-1)">' +
      'Adjuntos (' + lista.length + ')' +
    '</p>' +
    lista.map((a, i) => {
      const seVePorDentro = /^image\/|^application\/pdf/.test(a.tipo || '');

      return '<div class="fila-adjunto" style="display:flex;align-items:center;' +
                  'justify-content:space-between;padding:var(--esp-1) 0;' +
                  'border-top:1px solid var(--borde)">' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          seguro(a.nombre) +
          '<span style="color:var(--texto-tenue);font-size:.85em"> · ' +
            pesoLegible(a.tamano) + '</span>' +
        '</span>' +
        '<span style="flex-shrink:0;margin-left:var(--esp-1)">' +
          (seVePorDentro
            ? '<button class="boton boton--chico" data-ver-adjunto="' + i + '">Ver</button> '
            : '') +
          '<button class="boton boton--chico" data-bajar-adjunto="' + i + '">Bajar</button>' +
        '</span>' +
      '</div>';
    }).join('') +
  '</div>';
}

/**
 * Formulario para escribir o responder.
 *
 * @param {Object} [previo] - { para, asunto, adjuntosDelOriginal,
 *   uidDelOriginal, carpetaDelOriginal }
 * @returns {void}
 */
function formularioCorreo(previo) {
  const d = previo || {};
  const adjuntosDisponibles = d.adjuntosDelOriginal || [];

  const cuerpo = abrirHoja(previo ? 'Responder' : 'Escribir',
    campoTexto({ id: 'cor-para', rotulo: 'Para', tipo: 'email', valor: d.para }) +
    campoTexto({ id: 'cor-asunto', rotulo: 'Asunto', valor: d.asunto }) +
    campoLargo({ id: 'cor-texto', rotulo: 'Mensaje' }) +

    (adjuntosDisponibles.length
      ? '<p class="detalle__rotulo" style="margin-top:var(--esp-2)">' +
          'Reenviar del correo original' +
        '</p>' +
        adjuntosDisponibles.map((a, i) =>
          '<label style="display:flex;align-items:center;gap:var(--esp-1);' +
                 'padding:var(--esp-1) 0">' +
            '<input type="checkbox" class="cor-adjunto" value="' + i + '">' +
            seguro(a.nombre) + ' <span style="color:var(--texto-tenue);font-size:.85em">' +
              '(' + pesoLegible(a.tamano) + ')</span>' +
          '</label>'
        ).join('')
      : '') +

    '<button type="button" class="boton boton--principal boton--ancho" id="enviar">' +
      'Enviar' +
    '</button>'
  );

  buscar('#cor-texto', cuerpo).focus();

  buscar('#enviar', cuerpo).addEventListener('click', async () => {
    const para  = valorDe('cor-para', cuerpo);
    const texto = valorDe('cor-texto', cuerpo);

    if (!para)  { avisar('Falta el destinatario.', true); return; }
    if (!texto) { avisar('El mensaje está vacío.', true); return; }

    const adjuntosElegidos = buscarTodos('.cor-adjunto', cuerpo)
      .filter(caja => caja.checked)
      .map(caja => {
        const a = adjuntosDisponibles[Number(caja.value)];
        return { uid: d.uidDelOriginal, carpeta: d.carpetaDelOriginal, ruta: a.ruta };
      });

    const boton = buscar('#enviar', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    try {
      const r = await mandar('correo.php?accion=' + (previo ? 'responder' : 'escribir'), {
        para: para,
        asunto: valorDe('cor-asunto', cuerpo),
        texto: texto,
        adjuntos: adjuntosElegidos,
      });
      cerrarHoja(true);
      avisar(r.mensaje || 'Correo enviado.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Enviar';
    }
  });
}
