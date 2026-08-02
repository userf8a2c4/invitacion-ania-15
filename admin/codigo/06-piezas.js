/* ══════════════════════════════════════════════════════════════════════
   06 · PIEZAS QUE SE REUSAN

   QUÉ HAY EN ESTE ARCHIVO
   Las cosas que usan todas las vistas: la hoja que sube desde abajo, el
   mensajito de "Guardado", los estados de carga y de lista vacía, y los
   armadores de formularios.

   POR QUÉ HAY UNA SOLA HOJA PARA TODA LA APP
   Porque si cada formulario tuviera la suya escondida en el HTML,
   habría veinte pedazos de HTML muerto en la página. Acá hay una sola y
   se le cambia el contenido: menos código y siempre se ve igual.

   ÍNDICE
     1. La hoja de abajo
     2. Mensajitos
     3. Cargando y vacío
     4. Armar formularios
     5. Confirmar antes de borrar
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. LA HOJA DE ABAJO ──────────────────────────────────────────── */

/** Qué hacer cuando la hoja se cierre. Se usa para refrescar la vista. */
let AL_CERRAR_HOJA = null;

/**
 * Abre la hoja con un título y un contenido.
 *
 * @param {string} titulo
 * @param {string|Element} contenido - HTML ya escapado, o un elemento.
 * @param {Function} [alCerrar] - Se llama al cerrarse.
 * @returns {Element} El cuerpo de la hoja, para engancharle eventos.
 *
 * @example
 *   const cuerpo = abrirHoja('Nueva nota', '<p>Hola</p>');
 *   buscar('#guardar', cuerpo).addEventListener('click', ...);
 */
function abrirHoja(titulo, contenido, alCerrar) {
  const hoja   = buscar('#hoja');
  const cuerpo = buscar('#hoja-cuerpo');

  buscar('#hoja-titulo').textContent = titulo;

  cuerpo.innerHTML = '';
  if (typeof contenido === 'string') {
    cuerpo.innerHTML = contenido;
  } else if (contenido) {
    cuerpo.appendChild(contenido);
  }

  AL_CERRAR_HOJA = alCerrar || null;
  hoja.classList.remove('oculto');

  // Que el fondo no se desplace mientras la hoja está abierta: si no,
  // arrastrar dentro del formulario mueve la lista de atrás.
  document.body.style.overflow = 'hidden';

  cuerpo.scrollTop = 0;
  return cuerpo;
}

/**
 * Cierra la hoja.
 *
 * @returns {void}
 */
function cerrarHoja() {
  const hoja = buscar('#hoja');
  if (hoja.classList.contains('oculto')) return;

  hoja.classList.add('oculto');
  buscar('#hoja-cuerpo').innerHTML = '';
  document.body.style.overflow = '';

  if (AL_CERRAR_HOJA) {
    const quehacer = AL_CERRAR_HOJA;
    AL_CERRAR_HOJA = null;
    quehacer();
  }
}

/**
 * Engancha los botones de cerrar de la hoja. Se llama una sola vez.
 *
 * @returns {void}
 */
function prepararHoja() {
  buscar('#hoja-cerrar').addEventListener('click', cerrarHoja);
  buscar('#hoja-fondo').addEventListener('click', cerrarHoja);
}


/* ─── 2. MENSAJITOS ────────────────────────────────────────────────── */

/** El reloj del mensajito actual, para poder cancelarlo. */
let RELOJ_TOSTADA = null;

/**
 * Muestra un mensajito abajo que se va solo.
 *
 * @param {string} texto
 * @param {boolean} [esMalo=false] - Lo pinta de rojo.
 * @returns {void}
 *
 * @example
 *   avisar('Gasto guardado');
 *   avisar('No se pudo guardar', true);
 */
function avisar(texto, esMalo) {
  const tostada = buscar('#tostada');

  tostada.textContent = texto;
  tostada.classList.toggle('tostada--mal', !!esMalo);
  tostada.classList.remove('oculto');

  // Si ya había uno, se reinicia el reloj en vez de acumularlos.
  clearTimeout(RELOJ_TOSTADA);
  RELOJ_TOSTADA = setTimeout(
    () => tostada.classList.add('oculto'),
    esMalo ? 4000 : 2200   // los errores se leen más despacio
  );
}


/* ─── 3. CARGANDO Y VACÍO ──────────────────────────────────────────── */

/**
 * Pinta bloques que laten mientras se cargan los datos.
 *
 * Se usa en vez de un girador porque sostiene el lugar del contenido:
 * la pantalla no salta cuando llegan los datos.
 *
 * @param {Element} donde
 * @param {number} [cuantos=4]
 * @returns {void}
 */
function pintarCargando(donde, cuantos) {
  const n = cuantos || 4;
  donde.innerHTML = '<div class="esqueleto"></div>'.repeat(n);
}

/**
 * Pinta el estado de lista vacía.
 *
 * @param {Element} donde
 * @param {string} titulo - 'Todavía no hay gastos'
 * @param {string} texto - Qué hacer para que deje de estar vacío.
 * @returns {void}
 */
function pintarVacio(donde, titulo, texto) {
  donde.innerHTML =
    '<div class="vacio">' +
      '<p class="vacio__titulo">' + seguro(titulo) + '</p>' +
      '<p class="vacio__texto">' + seguro(texto) + '</p>' +
    '</div>';
}

/**
 * Pinta un error con botón de reintentar.
 *
 * @param {Element} donde
 * @param {string} mensaje
 * @param {Function} reintentar
 * @returns {void}
 */
function pintarError(donde, mensaje, reintentar) {
  donde.innerHTML =
    '<div class="vacio">' +
      '<p class="vacio__titulo">No se pudo cargar</p>' +
      '<p class="vacio__texto">' + seguro(mensaje) + '</p>' +
      '<button class="boton boton--chico" id="reintentar" ' +
        'style="margin-top:var(--esp-3)">Reintentar</button>' +
    '</div>';

  const boton = buscar('#reintentar', donde);
  if (boton && reintentar) boton.addEventListener('click', reintentar);
}


/* ─── 4. ARMAR FORMULARIOS ─────────────────────────────────────────── */

/**
 * Devuelve el HTML de un campo de texto.
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {string} [opciones.valor='']
 * @param {string} [opciones.tipo='text'] - 'text','number','date','email','tel'
 * @param {string} [opciones.ayuda] - Texto chico debajo.
 * @returns {string}
 */
function campoTexto(opciones) {
  const tipo  = opciones.tipo || 'text';
  const valor = seguro(opciones.valor === undefined ? '' : opciones.valor);

  return '' +
    '<label class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      '<input type="' + tipo + '" id="' + seguro(opciones.id) + '" ' +
             'class="campo__control" value="' + valor + '"' +
             (opciones.paso ? ' step="' + seguro(opciones.paso) + '"' : '') +
             (opciones.pista ? ' placeholder="' + seguro(opciones.pista) + '"' : '') +
      '>' +
      (opciones.ayuda
        ? '<span class="vacio__texto">' + seguro(opciones.ayuda) + '</span>'
        : '') +
    '</label>';
}

/**
 * Devuelve el HTML de un área de texto largo.
 *
 * @param {Object} opciones - id, rotulo, valor.
 * @returns {string}
 */
function campoLargo(opciones) {
  return '' +
    '<label class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      '<textarea id="' + seguro(opciones.id) + '" class="campo__control">' +
        seguro(opciones.valor || '') +
      '</textarea>' +
    '</label>';
}

/**
 * Devuelve el HTML de una lista desplegable.
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {Array<{valor:string,texto:string}>} opciones.opciones
 * @param {string} [opciones.valor] - Cuál viene elegida.
 * @returns {string}
 */
function campoLista(opciones) {
  const elegido = String(opciones.valor === undefined ? '' : opciones.valor);

  const items = opciones.opciones.map(o =>
    '<option value="' + seguro(o.valor) + '"' +
    (String(o.valor) === elegido ? ' selected' : '') + '>' +
    seguro(o.texto) + '</option>'
  ).join('');

  return '' +
    '<label class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      '<select id="' + seguro(opciones.id) + '" class="campo__control">' +
        items +
      '</select>' +
    '</label>';
}

/**
 * Devuelve el HTML de una casilla de verificación.
 *
 * @param {Object} opciones - id, rotulo, marcado.
 * @returns {string}
 */
function campoCasilla(opciones) {
  return '' +
    '<label class="casilla">' +
      '<input type="checkbox" id="' + seguro(opciones.id) + '"' +
        (opciones.marcado ? ' checked' : '') + '>' +
      '<span>' + seguro(opciones.rotulo) + '</span>' +
    '</label>';
}

/**
 * Devuelve el HTML de la fila de botones del pie de un formulario.
 *
 * @param {string} [textoGuardar='Guardar']
 * @param {boolean} [conBorrar=false]
 * @returns {string}
 */
function pieDeFormulario(textoGuardar, conBorrar) {
  return '' +
    '<div class="acciones">' +
      (conBorrar
        ? '<button type="button" class="boton boton--peligro" id="pie-borrar">Borrar</button>'
        : '') +
      '<button type="button" class="boton boton--principal" id="pie-guardar">' +
        seguro(textoGuardar || 'Guardar') +
      '</button>' +
    '</div>';
}

/**
 * Lee el valor de un campo de la hoja abierta.
 *
 * @param {string} id
 * @param {Element} [dentroDe]
 * @returns {string}
 */
function valorDe(id, dentroDe) {
  const campo = buscar('#' + id, dentroDe);
  if (!campo) return '';
  if (campo.type === 'checkbox') return campo.checked ? '1' : '';
  return campo.value.trim();
}


/* ─── 5. CONFIRMAR ANTES DE BORRAR ─────────────────────────────────── */

/**
 * Pregunta antes de hacer algo que no se puede deshacer.
 *
 * Se usa el confirm() del navegador a propósito: es feo pero es el
 * diálogo del sistema, imposible de ignorar por accidente, y para borrar
 * un proveedor o un gasto eso es exactamente lo que se busca.
 *
 * @param {string} pregunta
 * @returns {boolean}
 */
function confirmarAccion(pregunta) {
  return window.confirm(pregunta);
}
