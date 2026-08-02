/* ══════════════════════════════════════════════════════════════════════
   12 · VISTA CORREO

   QUÉ HACE ESTE ARCHIVO
   La bandeja de info@aniaxv.com: leer, responder y escribir.

   POR QUÉ LA BANDEJA TARDA MÁS QUE LAS OTRAS PESTAÑAS
   Las demás leen la base de datos, que está en el mismo servidor. Esta
   abre una conexión al servidor de correo, se identifica y baja los
   encabezados de 40 mensajes. Son unos segundos, y por eso se avisa
   mientras carga en vez de dejar la pantalla quieta.
   ══════════════════════════════════════════════════════════════════════ */


/** Los mensajes de la última carga. */
let CORREOS = [];


/**
 * Pide la bandeja y la dibuja.
 *
 * @returns {Promise<void>}
 */
async function dibujarCorreo() {
  const vista = buscar('#vista-correo');

  vista.innerHTML =
    '<button class="boton boton--principal boton--ancho" id="correo-nuevo" ' +
            'style="margin-bottom:var(--esp-3)">Escribir un correo</button>' +
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

  lista.innerHTML = CORREOS.map(m => {
    // Los no leídos van en negrita, como en cualquier bandeja.
    const peso = m.leido ? '' : ' style="font-weight:600"';

    return '' +
      '<button class="lista__fila" data-correo="' + seguro(m.numero) + '">' +
        (m.leido ? '' : '<span class="punto punto--si"></span>') +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo"' + peso + '>' +
            seguro(acortar(m.asunto, 45)) + '</span>' +
          '<span class="lista__pie">' + seguro(acortar(m.de, 40)) + '</span>' +
        '</span>' +
        '<span class="lista__lado vacio__texto">' +
          seguro(m.fecha ? comoCuando(m.fecha.slice(0, 10)) : '') + '</span>' +
      '</button>';
  }).join('');

  buscarTodos('[data-correo]', lista).forEach(boton => {
    boton.addEventListener('click', () => abrirCorreo(Number(boton.dataset.correo)));
  });
}


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
    // white-space:pre-wrap conserva los saltos de línea del correo sin
    // necesidad de convertirlos a <br>, y por lo tanto sin meter HTML.
    '<div class="tarjeta" style="white-space:pre-wrap;line-height:1.6">' +
      seguro(m.texto || '(sin contenido)') +
    '</div>' +
    (m.correo_de
      ? '<button class="boton boton--principal boton--ancho" id="responder" ' +
        'style="margin-top:var(--esp-3)">Responder</button>'
      : '');

  const boton = buscar('#responder', cuerpo);
  if (boton) {
    boton.addEventListener('click', () => {
      formularioCorreo({
        para: m.correo_de,
        asunto: /^re:/i.test(m.asunto) ? m.asunto : 'Re: ' + m.asunto,
      });
    });
  }
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
