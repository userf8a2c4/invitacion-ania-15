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
    datos = await traer('correo.php?accion=bandeja');
  } catch (error) {
    pintarError(lista, error.message, () => dibujarCorreo());
    throw error;
  }

  CORREOS = datos.mensajes || [];
  ponerTitulo('Correo', datos.buzon);
  ponerBurbuja('#burbuja-correo', datos.sin_leer);

  if (!CORREOS.length) {
    pintarVacio(lista, 'La bandeja está vacía',
      'Acá van a aparecer los correos que lleguen a ' + (datos.buzon || 'tu buzón') + '.');
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
      '<p class="pista-deslizar">Deslizá un correo hacia la izquierda ' +
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
      abrirCorreo(CORREOS[Number(tapa.dataset.abrir)].numero);
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
      const m = await traer('correo.php?accion=leer&n=' + correo.numero);
      formularioCorreo({
        para: m.correo_de,
        asunto: /^re:/i.test(m.asunto) ? m.asunto : 'Re: ' + m.asunto,
      });
    } catch (error) {
      avisar(error.message, true);
    }
    return;
  }

  if (accion === 'marcar') {
    try {
      const r = await mandar('correo.php?accion=marcar', {
        numero: correo.numero,
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
      const r = await mandar('correo.php?accion=borrar', { numero: correo.numero });
      avisar(r.mensaje);
      /* Se recarga la bandeja entera y no se saca la fila a mano: al
         borrar, el servidor renumera los mensajes, así que los índices
         que teníamos en memoria ya no valen. */
      dibujarCorreo();
    } catch (error) {
      avisar(error.message, true);
    }
  }
}


/* ─── 4. LEER Y ESCRIBIR ───────────────────────────────────────────── */

/**
 * Abre un mensaje y ofrece responderlo.
 *
 * @param {number} numero
 * @returns {Promise<void>}
 */
async function abrirCorreo(numero) {
  const cuerpo = abrirHoja('Cargando…', '<div class="esqueleto"></div>'.repeat(3));

  let m;
  try {
    m = await traer('correo.php?accion=leer&n=' + numero);
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirCorreo(numero));
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

    /* white-space:pre-wrap conserva los saltos de línea del correo sin
       convertirlos a <br>, o sea sin meter HTML. Y overflow-wrap:anywhere
       corta las URLs largas, que si no desbordan la pantalla a lo ancho. */
    '<div class="tarjeta" style="white-space:pre-wrap;line-height:1.6;' +
         'overflow-wrap:anywhere">' +
      seguro(m.texto || '(sin contenido)') +
    '</div>' +

    '<div class="acciones">' +
      '<button class="boton" id="no-leido">Marcar sin leer</button>' +
      (m.correo_de
        ? '<button class="boton boton--principal" id="responder">Responder</button>'
        : '') +
    '</div>';

  const responder = buscar('#responder', cuerpo);
  if (responder) {
    responder.addEventListener('click', () => {
      formularioCorreo({
        para: m.correo_de,
        asunto: /^re:/i.test(m.asunto) ? m.asunto : 'Re: ' + m.asunto,
      });
    });
  }

  buscar('#no-leido', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('correo.php?accion=no_leido', { numero: numero });
      cerrarHoja();
      avisar(r.mensaje);
      dibujarCorreo();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Formulario para escribir o responder.
 *
 * @param {Object} [previo] - { para, asunto }
 * @returns {void}
 */
function formularioCorreo(previo) {
  const d = previo || {};

  const cuerpo = abrirHoja(previo ? 'Responder' : 'Escribir',
    campoTexto({ id: 'cor-para', rotulo: 'Para', tipo: 'email', valor: d.para }) +
    campoTexto({ id: 'cor-asunto', rotulo: 'Asunto', valor: d.asunto }) +
    campoLargo({ id: 'cor-texto', rotulo: 'Mensaje' }) +
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

    const boton = buscar('#enviar', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    try {
      const r = await mandar('correo.php?accion=escribir', {
        para: para,
        asunto: valorDe('cor-asunto', cuerpo),
        texto: texto,
      });
      cerrarHoja();
      avisar(r.mensaje || 'Correo enviado.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Enviar';
    }
  });
}
