/* ══════════════════════════════════════════════════════════════════════
   52-MENSAJES.JS · lo que le escribieron a Ania

   QUÉ ES ESTA PANTALLA
   Todo lo que los invitados escribieron en «¿Algo más que quieras
   decirnos?», junto, con quién lo escribió y cuándo. Se lee acá y se
   guarda en una página aparte, con la tipografía y los dorados de la
   invitación, lista para imprimir.

   ⚠️ POR QUÉ LA DESCARGA NO ES UNA COMODIDAD

   Ese campo vive en `confirmaciones.notas`, y `confirmaciones` es la
   primera tabla que vacía el borrado post-fiesta. Lo único que Ania va a
   querer conservar para siempre es justo lo que esa herramienta
   destruye — y no se arregla dejando la tabla afuera, porque el mensaje
   lleva el nombre de quien lo escribió y a esa persona se le prometió
   que sus datos se borran cuando pase el evento.

   Así que la descarga ES el rescate: los mensajes quedan en un archivo,
   con la familia, y el dato se borra del servidor como se prometió. Las
   dos cosas se cumplen, pero solo si alguien descarga ANTES. Por eso el
   borrado avisa, y por eso el botón de acá está grande.

   POR QUÉ SE ARMA LA PÁGINA EN EL NAVEGADOR Y NO EN EL SERVIDOR
   Porque para abrirla haría falta mandarle la sesión, y un enlace que se
   abre en otra pestaña no puede llevar la cabecera de autorización.
   Poner el token en la dirección sería dejarlo escrito en el historial
   del navegador. Acá los datos ya están: se arma el HTML y listo.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * La hoja con todos los mensajes.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeMensajes() {
  const cuerpo = abrirHoja('Mensajes para Ania',
    '<p class="vacio__texto">Buscando…</p>');

  let datos;
  try {
    datos = await traer('mensajes.php?accion=listar');
  } catch (error) {
    cuerpo.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  const filas = datos.filas || [];

  if (!filas.length) {
    cuerpo.innerHTML =
      '<div class="tarjeta">' +
        '<p>Todavía nadie escribió nada.</p>' +
        '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'Aparecen acá los mensajes que dejan los invitados en «¿Algo más ' +
          'que quieras decirnos?» al confirmar.' +
        '</p>' +
      '</div>';
    return;
  }

  cuerpo.innerHTML =
    '<div class="tarjeta">' +
      '<p><strong>' + filas.length + '</strong> ' +
        (filas.length === 1 ? 'mensaje' : 'mensajes') + ' hasta ahora.</p>' +
      '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
        'Estos mensajes se borran junto con los datos de los invitados ' +
        'cuando pase la fiesta. Guardá la página antes: es la única copia ' +
        'que va a quedar.' +
      '</p>' +
    '</div>' +

    '<button type="button" class="boton boton--principal boton--ancho" ' +
            'id="msj-guardar" style="margin-bottom:var(--esp-3)">' +
      'Abrir para leer, imprimir o guardar' +
    '</button>' +

    filas.map(m =>
      '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
        '<p style="white-space:pre-wrap;margin:0">' + seguro(m.mensaje) + '</p>' +
        '<p class="vacio__texto" style="margin:var(--esp-1) 0 0;text-align:right">' +
          '— ' + seguro(m.nombre) +
          (m.cuando ? ' · ' + seguro(comoFecha(m.cuando)) : '') +
        '</p>' +
      '</div>'
    ).join('');

  buscar('#msj-guardar', cuerpo).addEventListener('click', () => abrirElLibro(filas));
}

/**
 * La fecha con el mes escrito entero: «3 de septiembre de 2026».
 *
 * Para la lista del panel se usa comoFecha() (02-utilidades.js), que da
 * la forma corta de siempre. Acá se escribe larga porque es un recuerdo
 * y no una tabla — y se arma con toLocaleDateString y la región que ya
 * usa el proyecto, no con una lista de meses a mano.
 *
 * @param {string} cuando - Como lo da la base.
 * @returns {string}
 */
function fechaEnPalabras(cuando) {
  const d = aFecha(cuando);
  if (!d) return '';

  return d.toLocaleDateString(CONFIGURACION.dinero.region,
    { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Abre el libro en una pestaña nueva: para leerlo, imprimirlo o
 * guardarlo como PDF desde el navegador.
 *
 * ⚠️ LAS TIPOGRAFÍAS SE PIDEN AL SITIO, ASÍ QUE SON PRESTADAS.
 * Mientras la web exista, la página se ve con las letras de la
 * invitación. El día que el sitio no esté, el navegador cae a las
 * alternativas declaradas y el texto se sigue leyendo perfecto — que es
 * lo que importa de un recuerdo. Incrustar las tipografías adentro haría
 * el archivo varias veces más pesado para ganar el tipo de letra, no el
 * contenido.
 *
 * @param {Array} filas
 * @returns {void}
 */
function abrirElLibro(filas) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    avisar('El navegador bloqueó la ventana. Permitila y volvé a intentar.', true);
    return;
  }

  const titulo = 'Mensajes para Ania';

  /* ⚠️ LA RAÍZ NO SIEMPRE ES «/».
     El panel vive en /admin/ en producción, pero en PBE puede estar en
     /pbe/admin/. Con «/recursos/…» a secas las tipografías no cargarían
     ahí y no lo notaría nadie: el navegador cae a la alternativa en
     silencio y la página se ve bien igual, solo que con otra letra. Se
     saca del sitio donde está el panel, que es la única fuente honesta. */
  const raizDelSitio = location.origin +
    location.pathname.replace(/admin\/.*$/, '');

  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + titulo + '</title><style>' +

    '@font-face{font-family:"Cinzel Decorative";font-weight:700;font-display:swap;' +
      'src:url("' + raizDelSitio + 'recursos/tipografias/cinzel-decorative-700-normal-latin.woff2") format("woff2")}' +
    '@font-face{font-family:"Cormorant Garamond";font-weight:300;font-display:swap;' +
      'src:url("' + raizDelSitio + 'recursos/tipografias/cormorant-garamond-300-normal-latin.woff2") format("woff2")}' +

    'body{margin:0;background:#120c07;color:#e8dcc8;' +
      'font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;' +
      'font-size:19px;line-height:1.75;padding:56px 22px 80px}' +
    '.hoja{max-width:660px;margin:0 auto}' +
    'h1{font-family:"Cinzel Decorative",Georgia,serif;font-weight:700;' +
      'font-size:2.5rem;text-align:center;margin:0 0 6px;' +
      'background:linear-gradient(100deg,#8a6a2c,#c9a84c 40%,#f4e2a0 55%,#c9a84c 70%,#8a6a2c);' +
      '-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.sub{text-align:center;opacity:.6;margin:0 0 46px;font-size:.95rem;' +
      'letter-spacing:.12em;text-transform:uppercase}' +
    '.msj{margin:0 0 40px;padding:0 0 34px;border-bottom:1px solid rgba(201,168,76,.22)}' +
    '.msj:last-of-type{border-bottom:none}' +
    '.texto{white-space:pre-wrap;margin:0;font-size:1.16rem}' +
    '.firma{text-align:right;margin:14px 0 0;color:#c9a84c;font-style:italic}' +
    '.pie{text-align:center;opacity:.45;font-size:.85rem;margin-top:56px}' +

    /* Al imprimir: fondo blanco y tinta oscura. Un fondo negro a página
       completa se lleva medio cartucho y sale gris sucio. */
    '@media print{body{background:#fff;color:#2a2016;padding:0}' +
      'h1{color:#8a6a2c;-webkit-text-fill-color:#8a6a2c}' +
      '.firma{color:#7a5c22}' +
      '.msj{border-bottom:1px solid #d8cdb4;break-inside:avoid}}' +

    '</style></head><body><div class="hoja">' +

    '<h1>' + titulo + '</h1>' +
    '<p class="sub">XV Años</p>' +

    filas.map(m =>
      '<div class="msj">' +
        '<p class="texto">' + seguro(m.mensaje) + '</p>' +
        '<p class="firma">— ' + seguro(m.nombre) +
          (m.cuando ? ', ' + seguro(fechaEnPalabras(m.cuando)) : '') +
        '</p>' +
      '</div>'
    ).join('') +

    '<p class="pie">' + filas.length + ' ' +
      (filas.length === 1 ? 'mensaje' : 'mensajes') + '</p>' +

    '</div></body></html>';

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}
