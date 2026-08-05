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

/** Cómo estaban los campos al abrir, para detectar lo escrito sin guardar. */
let LO_QUE_HABIA_AL_ABRIR = '';

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

  /* Se guarda cómo quedó la hoja recién abierta. Al cerrarla se compara
     contra esto para saber si se escribió algo que se perdería. */
  LO_QUE_HABIA_AL_ABRIR = loEscritoEnLaHoja();

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
function cerrarHoja(forzar) {
  const hoja = buscar('#hoja');
  if (hoja.classList.contains('oculto')) return;

  /* ¿Hay algo escrito que se va a perder?
   *
   * El fondo oscuro de la hoja cierra al tocarlo, y es MUY fácil rozarlo
   * queriendo tocar un campo del borde. Sin este control, media hora
   * cargando un proveedor se borraba con un dedo mal apoyado y sin una
   * sola palabra de aviso.
   *
   * El código llama a cerrarHoja(true) después de guardar: ahí no hay
   * nada que preguntar porque ya está guardado. */
  if (!forzar && loEscritoEnLaHoja() !== LO_QUE_HABIA_AL_ABRIR) {
    if (!confirmarAccion('Escribiste cosas que todavía no se guardaron.\n\n' +
                         '¿Cerrar igual y perderlas?')) return;
  }

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
  buscar('#hoja-cerrar').addEventListener('click', () => cerrarHoja());
  buscar('#hoja-fondo').addEventListener('click', () => cerrarHoja());

  /* ─── QUE GUARDAR NO SE PUEDA TOCAR DOS VECES ──────────────────────
   *
   * Con mala señal, guardar puede tardar varios segundos sin que pase
   * nada visible. El reflejo natural es volver a tocar el botón — y con
   * eso se creaban dos gastos, dos tareas, dos proveedores.
   *
   * Va acá y no en cada formulario por la misma razón que la clave de
   * idempotencia vive en cuerpoJson(): son cuarenta formularios y basta
   * que uno se olvide para que el problema siga existiendo. En fase de
   * captura para correr ANTES que el manejador de la vista.
   *
   * Se vuelve a habilitar sola: si el guardado falla, la hoja queda
   * abierta y hay que poder reintentar. */
  buscar('#hoja-cuerpo').addEventListener('click', evento => {
    const boton = evento.target.closest('#pie-guardar, .boton--principal');
    if (!boton || boton.disabled) return;

    boton.disabled = true;
    boton.dataset.textoOriginal = boton.textContent;
    boton.textContent = 'Guardando…';

    setTimeout(() => {
      if (!boton.isConnected) return;
      boton.disabled = false;
      if (boton.dataset.textoOriginal) boton.textContent = boton.dataset.textoOriginal;
    }, 4000);
  }, true);
}

/**
 * Toma una foto de lo que hay escrito en la hoja.
 *
 * Sirve para saber, al cerrarla, si se perdería algo.
 *
 * @returns {string}
 */
function loEscritoEnLaHoja() {
  return buscarTodos('#hoja-cuerpo input, #hoja-cuerpo textarea, #hoja-cuerpo select')
    .map(c => (c.type === 'checkbox' ? (c.checked ? '1' : '0') : c.value))
    .join('');
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


/* ─── 3B. EL ÍNDICE AGRUPADO ───────────────────────────────────────── */

/*
   QUÉ ES Y POR QUÉ EXISTE

   Una pantalla que tiene muchas secciones adentro no puede mostrarlas
   como una tira de píldoras. Evento llegó a tener catorce: en un
   teléfono se apilaban en cinco renglones y el contenido arrancaba a
   media pantalla.

   Un índice resuelve las dos cosas de una: entra en un vistazo, y cada
   renglón tiene lugar para explicar QUÉ ES esa sección. Es el patrón de
   la pantalla de Ajustes del teléfono, así que no hay que enseñárselo a
   nadie.

   La línea de explicación no es decoración: es la diferencia entre
   "Papeles" —que no significa nada— y "Fe de bautismo, pláticas y qué
   falta entregar".
*/

/**
 * Dibuja un índice de secciones, agrupadas bajo títulos.
 *
 * @param {Element} donde
 * @param {Array<{titulo: string, filas: Array}>} grupos
 *        Cada fila: { clave, nombre, descripcion, cuantos?, alerta? }
 *        - cuantos: número que se muestra a la derecha (0 no se muestra).
 *        - alerta: si es true, el número se pinta en rojo.
 * @param {Function} alElegir - Recibe la clave de la fila tocada.
 * @returns {void}
 *
 * @example
 *   pintarIndice(cuerpo, [
 *     { titulo: 'Organización', filas: [
 *       { clave: 'tareas', nombre: 'Tareas',
 *         descripcion: 'Lo que hay que hacer y quién se encarga',
 *         cuantos: 3 },
 *     ]},
 *   ], clave => abrirSeccion(clave));
 */
function pintarIndice(donde, grupos, alElegir) {
  donde.innerHTML = grupos.map(grupo =>
    '<div class="indice__grupo">' +
      '<div class="indice__titulo">' + seguro(grupo.titulo) + '</div>' +

      grupo.filas.map(fila => {
        /* El contador solo aparece si hay algo que contar. Un "0" al
           lado de cada renglón es ruido: la ausencia ya dice lo mismo. */
        const n = Number(fila.cuantos) || 0;
        /* Cuenta propia y no .burbuja: esa es position:absolute porque
           vive pegada al icono de la barra de abajo, y acá tiene que
           fluir dentro del renglón. */
        const burbuja = n
          ? '<span class="indice__cuenta' +
            (fila.alerta ? ' indice__cuenta--alerta' : '') + '">' +
            seguro(n) + '</span>'
          : '';

        return '' +
          '<button class="indice__fila" data-indice="' + seguro(fila.clave) + '">' +
            '<span class="indice__cuerpo">' +
              '<span class="indice__nombre">' + seguro(fila.nombre) + '</span>' +
              '<span class="indice__descripcion">' +
                seguro(fila.descripcion || '') +
              '</span>' +
            '</span>' +
            burbuja +
            /* La flecha dice "esto se abre", que es lo único que hay que
               entender antes de tocarlo. */
            '<svg viewBox="0 0 24 24" class="indice__flecha" aria-hidden="true">' +
              '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" ' +
                    'stroke-width="2" stroke-linecap="round" ' +
                    'stroke-linejoin="round"/>' +
            '</svg>' +
          '</button>';
      }).join('') +
    '</div>'
  ).join('');

  buscarTodos('[data-indice]', donde).forEach(boton => {
    boton.addEventListener('click', () => alElegir(boton.dataset.indice));
  });
}

/**
 * La barra de "volver" que encabeza una sección abierta desde un índice.
 *
 * Devuelve HTML: quien lo use tiene que enganchar #indice-volver.
 *
 * @param {string} titulo - Cómo se llama la sección abierta.
 * @param {string} [descripcion] - La misma línea que se ve en el índice.
 * @returns {string} HTML
 */
function barraDeVuelta(titulo, descripcion) {
  return '' +
    '<div class="volver">' +
      '<button class="volver__boton" id="indice-volver">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round"/>' +
        '</svg>' +
        '<span>' + seguro(titulo) + '</span>' +
      '</button>' +
      (descripcion
        ? '<p class="volver__descripcion">' + seguro(descripcion) + '</p>'
        : '') +
    '</div>';
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
