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
     6. Lista de detalle (ítems de "qué incluye")
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. LA HOJA DE ABAJO ──────────────────────────────────────────── */

/** Qué hacer cuando la hoja se cierre. Se usa para refrescar la vista. */
let AL_CERRAR_HOJA = null;

/* ─── COMPENSAR EL TECLADO DEL CELULAR ──────────────────────────────
   QUÉ PROBLEMA RESUELVE
   Ni `vh` ni `dvh` ni `svh` reaccionan a que aparezca el teclado virtual
   —por especificación, esa distinción queda afuera de lo que esas
   unidades cubren—, así que `.hoja__panel` (con `max-height` fijo) podía
   terminar más alto que lo que de verdad se ve en pantalla, tapando un
   campo de texto o el botón de abajo detrás del teclado (el caso real: el
   Asistente, admin/codigo/32-asistente.js). `visualViewport` sí sabe
   cuánto se ve de verdad.

   Se engancha en abrirHoja() y se desengancha en cerrarHoja(): un
   listener global permanente no tiene sentido si la hoja no está en
   pantalla, y así cualquier formulario futuro con un campo de texto
   queda cubierto gratis, no solo el Asistente. */
let quitarCompensacionDeTeclado = null;

/**
 * Engancha el ajuste de `--alto-hoja` Y `--desplazamiento-hoja` a
 * `visualViewport` mientras la hoja esté abierta. Sin soporte de
 * `visualViewport`, no hace nada: el CSS ya tiene `88dvh` como valor de
 * respaldo, igual que antes de este cambio.
 *
 * ⚡ POR QUÉ SE SUMÓ `--desplazamiento-hoja`, Y POR QUÉ LA PRIMERA
 * VERSIÓN NO SERVÍA (2026-08-27). Achicar el ALTO del panel no
 * alcanza: `.hoja` es `position:fixed; inset:0` — ocupa el *layout*
 * viewport completo — y con `interactive-widget=resizes-visual`
 * (admin/index.html) ese layout viewport NO se achica cuando aparece
 * el teclado, solo el *visual* viewport sí. Como `.hoja` usa
 * `align-items:flex-end`, el panel queda pegado al fondo del layout
 * viewport — que en ese momento está DETRÁS del teclado, fuera de lo
 * que se ve.
 *
 * La primera versión de este arreglo usaba `visualViewport.offsetTop`
 * a secas — pero ese valor es 0 en el caso normal de abrir un teclado
 * (mide cuánto SCROLLEÓ el visual viewport, no cuánto tapa el
 * teclado), así que `translateY(0)` no cambiaba nada y el bug seguía
 * intacto. Lo que hace falta es la distancia entre el fondo de la
 * pantalla física (`window.innerHeight`) y el fondo de lo que
 * realmente se ve (`offsetTop + height`) — esa es la porción tapada
 * por el teclado, y hay que subir `.hoja` esa distancia (valor
 * NEGATIVO de `translateY`, ver `.hoja` en 02-componentes.css).
 * @returns {void}
 */
function activarCompensacionDeTeclado() {
  if (!window.visualViewport) return;

  function ajustar() {
    const vv = window.visualViewport;
    document.documentElement.style.setProperty('--alto-hoja', Math.round(vv.height * 0.88) + 'px');
    const tapadoPorElTeclado = window.innerHeight - (vv.offsetTop + vv.height);
    document.documentElement.style.setProperty('--desplazamiento-hoja', Math.round(-tapadoPorElTeclado) + 'px');
  }

  // Red de seguridad adicional: si el campo que se tocó queda tapado de
  // todos modos (por ejemplo, estaba más abajo del área recién
  // liberada), se lo trae a la vista. El setTimeout espera a que el
  // teclado termine de animar — sin esto, scrollIntoView mide contra un
  // viewport que todavía se está achicando y calcula mal.
  function alEnfocar(evento) {
    const campo = evento.target;
    if (!campo || !campo.matches || !campo.matches('input, textarea, select')) return;
    setTimeout(() => campo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  }

  const cuerpo = buscar('#hoja-cuerpo');
  cuerpo.addEventListener('focusin', alEnfocar);

  ajustar();
  window.visualViewport.addEventListener('resize', ajustar);
  // Safari a veces avisa el cambio de alto por acá y no por 'resize'.
  window.visualViewport.addEventListener('scroll', ajustar);

  quitarCompensacionDeTeclado = () => {
    window.visualViewport.removeEventListener('resize', ajustar);
    window.visualViewport.removeEventListener('scroll', ajustar);
    cuerpo.removeEventListener('focusin', alEnfocar);
    document.documentElement.style.removeProperty('--alto-hoja');
    document.documentElement.style.removeProperty('--desplazamiento-hoja');
  };
}

/**
 * Desengancha lo que haya activado activarCompensacionDeTeclado().
 * @returns {void}
 */
function desactivarCompensacionDeTeclado() {
  if (!quitarCompensacionDeTeclado) return;
  quitarCompensacionDeTeclado();
  quitarCompensacionDeTeclado = null;
}

/** Cómo estaban los campos al abrir, para detectar lo escrito sin guardar. */
let LO_QUE_HABIA_AL_ABRIR = '';

/** El título con el que se abrió la hoja actual (Fase 8: para saber qué
    formulario es el que se abandona). */
let HOJA_TITULO_ACTUAL = '';

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
  HOJA_TITULO_ACTUAL = titulo;

  cuerpo.innerHTML = '';
  if (typeof contenido === 'string') {
    cuerpo.innerHTML = contenido;
  } else if (contenido) {
    cuerpo.appendChild(contenido);
  }

  AL_CERRAR_HOJA = alCerrar || null;
  hoja.classList.remove('oculto');
  activarCompensacionDeTeclado();

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
  const huboAlgoEscrito = loEscritoEnLaHoja() !== LO_QUE_HABIA_AL_ABRIR;

  if (!forzar && huboAlgoEscrito) {
    if (!confirmarAccion('Escribiste cosas que todavía no se guardaron.\n\n' +
                         '¿Cerrar igual y perderlas?')) return;
  }

  /* Fase 8, la señal más valiosa que antes no existía: qué formulario se
   * empieza y no se termina. forzar=true solo pasa después de una acción
   * ya completada (guardar, borrar…) en todo el resto del código — así
   * que un cierre SIN forzar y CON algo escrito es, por definición, un
   * abandono: se tocó algo y se dejó a medias. */
  if (huboAlgoEscrito && !forzar) {
    registrarEvento('friccion', 'formulario_abandonado', { titulo: HOJA_TITULO_ACTUAL });
  }

  hoja.classList.add('oculto');
  desactivarCompensacionDeTeclado();
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


/* ─── 1B. EL VISOR DE ARCHIVOS (Fase 7 del rediseño) ────────────────── */

/* Correo y Archivos comparten esta capa para mostrar una imagen o un PDF
   sin salir del panel. Antes cada uno abría el archivo con
   window.open(url,'_blank'): en el teléfono eso es una pestaña nueva sin
   forma cómoda de acercarse a un detalle, y en el caso del correo ni
   siquiera funcionaba (ver abrirAdjunto() en 12-vista-correo.js, el
   enlace directo no podía mandar el token de sesión). */

/** La URL de blob que está mostrando el visor, para liberarla al cerrar. */
let VISOR_ARCHIVO_URL = null;

/**
 * Abre el visor con una imagen o un PDF ya descargado como blob.
 *
 * @param {string} url - Un object URL (URL.createObjectURL), no una URL remota.
 * @param {string} tipo - El MIME type, para decidir cómo mostrarlo.
 * @param {string} nombre - Nombre del archivo, para el título y la descarga.
 * @returns {void}
 */
function abrirVisorDeArchivo(url, tipo, nombre) {
  const visor  = buscar('#visor-archivo');
  const cuerpo = buscar('#visor-archivo-cuerpo');

  VISOR_ARCHIVO_URL = url;
  buscar('#visor-archivo-nombre').textContent = nombre || '';

  const bajar = buscar('#visor-archivo-bajar');
  bajar.href = url;
  bajar.download = nombre || 'archivo';

  const esImagen = /^image\//.test(tipo || '');

  cuerpo.innerHTML = esImagen
    ? '<img id="visor-archivo-img" src="' + url + '" alt="' + seguro(nombre || '') + '">'
    : '<iframe src="' + url + '" title="' + seguro(nombre || 'Documento') + '"></iframe>';

  if (esImagen) engancharZoomDeImagen(buscar('#visor-archivo-img', cuerpo));

  visor.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}

/**
 * Cierra el visor y libera la memoria del blob.
 *
 * @returns {void}
 */
function cerrarVisorDeArchivo() {
  const visor = buscar('#visor-archivo');
  visor.classList.add('oculto');
  buscar('#visor-archivo-cuerpo').innerHTML = '';
  document.body.style.overflow = '';

  if (VISOR_ARCHIVO_URL) {
    URL.revokeObjectURL(VISOR_ARCHIVO_URL);
    VISOR_ARCHIVO_URL = null;
  }
}

/**
 * Doble-toque para alternar zoom 1× / 2.5× sobre el punto tocado, y
 * arrastre con un dedo cuando está en zoom. Mismo mecanismo de Pointer
 * Events que engancharZoomYPanDelPlano() en 17-mesas.js — se adapta acá
 * en vez de reinventarlo, con la variante de que el zoom se dispara con
 * doble-toque en lugar de pellizco (más natural para una sola imagen).
 *
 * @param {Element} img
 * @returns {void}
 */
function engancharZoomDeImagen(img) {
  if (!img) return;

  const ZOOM_ACERCADO = 2.5;
  let escala = 1;
  let x = 0, y = 0;
  let arrastrando = false;
  let ultimoPunto = null;

  const aplicar = () => {
    img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + escala + ')';
  };

  img.addEventListener('dblclick', evento => {
    evento.preventDefault();
    alternarZoom(evento.clientX, evento.clientY);
  });

  // El equivalente táctil de dblclick: dos toques rápidos y cercanos.
  let ultimoToque = 0;
  img.addEventListener('pointerup', evento => {
    if (evento.pointerType !== 'touch') return;
    const ahora = Date.now ? Date.now() : new Date().getTime();
    if (ahora - ultimoToque < 300) alternarZoom(evento.clientX, evento.clientY);
    ultimoToque = ahora;
  });

  function alternarZoom(clientX, clientY) {
    if (escala > 1) {
      escala = 1; x = 0; y = 0;
    } else {
      const rect = img.getBoundingClientRect();
      // Centra el acercamiento en el punto tocado, no en el centro de
      // la imagen: tocar dos veces sobre una firma la deja ahí mismo.
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      escala = ZOOM_ACERCADO;
      x = (0.5 - px) * rect.width * (ZOOM_ACERCADO - 1);
      y = (0.5 - py) * rect.height * (ZOOM_ACERCADO - 1);
    }
    aplicar();
  }

  img.addEventListener('pointerdown', evento => {
    if (escala <= 1) return;
    arrastrando = true;
    ultimoPunto = { x: evento.clientX, y: evento.clientY };
    img.setPointerCapture(evento.pointerId);
  });

  img.addEventListener('pointermove', evento => {
    if (!arrastrando || !ultimoPunto) return;
    x += evento.clientX - ultimoPunto.x;
    y += evento.clientY - ultimoPunto.y;
    ultimoPunto = { x: evento.clientX, y: evento.clientY };
    aplicar();
  });

  const soltar = () => { arrastrando = false; ultimoPunto = null; };
  img.addEventListener('pointerup', soltar);
  img.addEventListener('pointercancel', soltar);
}

/**
 * Engancha los botones de cerrar del visor. Se llama una sola vez.
 *
 * @returns {void}
 */
function prepararVisorDeArchivo() {
  buscar('#visor-archivo-cerrar').addEventListener('click', () => cerrarVisorDeArchivo());
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
  // Fase 8: qué errores ve la persona de verdad. Sirve para encontrar
  // la validación que se repite —eso es un formulario que no se
  // entiende, no gente que se equivoca seguido.
  if (esMalo) registrarEvento('error', 'aviso', { texto: texto });

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

/** Las dos siluetas disponibles para pintarVacio() — nada más que
    estas dos, a propósito: el brief pide guiños "con extrema
    moderación", no un set de iconos por sección. Ambas son una sola
    silueta rellena (currentColor), sin detalle interno: a la opacidad
    bajísima con la que se muestran, cualquier detalle se pierde y solo
    ensucia el trazo. */
const GUINOS_DE_VACIO = {
  gato: '<svg viewBox="0 0 100 100" class="vacio__guino" aria-hidden="true">' +
          '<path d="M50 90c-16 0-29-11-29-27 0-8 3-15 3-15l-9-19c-1-2 1-4 3-3l16 9c5-2 10-3 16-3s11 1 16 3l16-9c2-1 4 1 3 3l-9 19s3 7 3 15c0 16-13 27-29 27z"/>' +
        '</svg>',
  murcielago: '<svg viewBox="0 0 100 60" class="vacio__guino" aria-hidden="true">' +
          '<path d="M50 30c-6-10-20-22-38-22-4 0-6 3-3 6 8 8 14 14 16 18-6 0-16 4-20 10-2 3 0 5 3 4 8-3 15-4 20-3-3 4-8 12-8 18 0 3 3 4 5 2 6-6 12-14 15-19h20c3 5 9 13 15 19 2 2 5 1 5-2 0-6-5-14-8-18 5-1 12 0 20 3 3 1 5-1 3-4-4-6-14-10-20-10 2-4 8-10 16-18 3-3 1-6-3-6-18 0-32 12-38 22z"/>' +
        '</svg>',
};

/**
 * Pinta el estado de lista vacía.
 *
 * @param {Element} donde
 * @param {string} titulo - 'Todavía no hay gastos'
 * @param {string} texto - Qué hacer para que deje de estar vacío.
 * @param {string} [guino] - 'gato' | 'murcielago'. Opcional a propósito:
 *   la mayoría de los vacíos del panel siguen sin ninguno — es un
 *   guiño puntual, no algo que aparezca en todos lados (ver el brief:
 *   "con extrema moderación").
 * @returns {void}
 */
function pintarVacio(donde, titulo, texto, guino) {
  donde.innerHTML =
    '<div class="vacio">' +
      (guino && GUINOS_DE_VACIO[guino] ? GUINOS_DE_VACIO[guino] : '') +
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
  registrarEvento('error', 'pantalla', { texto: mensaje });

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


/* ─── 2B. LOS GLOBOS DE AYUDA ──────────────────────────────────────── */

/*
   POR QUÉ EXISTEN

   Este panel lo va a usar gente que no lo construyó. "De tu bolsillo",
   "sin techo definido" o "fijar una mesa" son términos que significan
   algo muy concreto acá adentro y nada en ningún otro lado.

   La alternativa a explicarlos es que alguien toque un botón sin saber
   qué hace, o —peor— que no lo toque nunca.

   POR QUÉ UN "?" Y NO UN TEXTO SIEMPRE VISIBLE
   Porque quien ya sabe no necesita leerlo cien veces. Un párrafo fijo
   debajo de cada título convierte una pantalla de trabajo en un manual.
*/

/**
 * Devuelve el HTML de un botón "?" al lado de un título.
 *
 * @param {string} clave - Una de CONFIGURACION.ayuda.
 * @returns {string} HTML, o vacío si esa clave no tiene texto.
 *
 * @example
 *   '<div class="tarjeta__titulo">Padrinos' + ayuda('dinero.padrinos') + '</div>'
 */
function ayuda(clave) {
  if (!CONFIGURACION.ayuda[clave]) return '';

  return '<button class="ayuda" data-ayuda="' + seguro(clave) + '" ' +
                 'aria-label="Qué es esto">?</button>';
}

/**
 * Abre el globo con una explicación.
 *
 * @param {string} clave
 * @returns {void}
 */
function abrirAyuda(clave) {
  const texto = CONFIGURACION.ayuda[clave];
  if (!texto) return;

  buscar('#globo-titulo').textContent = texto.titulo;
  buscar('#globo-texto').textContent  = texto.texto;
  buscar('#globo').classList.remove('oculto');
}

/**
 * Cierra el globo.
 *
 * @returns {void}
 */
function cerrarAyuda() {
  buscar('#globo').classList.add('oculto');
}

/**
 * Engancha los globos. Se llama una sola vez, al arrancar.
 *
 * Escucha en todo el documento en vez de en cada botón: los "?" se
 * dibujan y se borran cada vez que se repinta una vista, así que
 * engancharlos uno por uno obligaría a acordarse de hacerlo en cada
 * pantalla nueva.
 *
 * @returns {void}
 */
function prepararAyuda() {
  document.addEventListener('click', evento => {
    const boton = evento.target.closest('[data-ayuda]');
    if (!boton) return;

    /* Los "?" viven dentro de títulos que a veces son botones. Sin esto,
       tocar la ayuda abriría además la sección de atrás. */
    evento.preventDefault();
    evento.stopPropagation();

    abrirAyuda(boton.dataset.ayuda);
  });

  buscar('#globo-cerrar').addEventListener('click', cerrarAyuda);
  buscar('#globo-fondo').addEventListener('click', cerrarAyuda);
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
                    'stroke-width="1.5" stroke-linecap="round" ' +
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
                'stroke-width="1.5" stroke-linecap="round" ' +
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
 * "150000.5" → "150,000.5". Sin librería: separa la parte entera cada
 * tres dígitos, deja los decimales tal cual venían.
 *
 * @param {string} texto
 * @returns {string}
 */
function formatoDeMiles(texto) {
  const limpio = String(texto || '').replace(/[^\d.]/g, '');
  const punto = limpio.indexOf('.');
  const entero = punto === -1 ? limpio : limpio.slice(0, punto);
  const decimales = punto === -1 ? '' : limpio.slice(punto);
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decimales;
}

/**
 * Un campo de dinero con separador de miles NATIVO: "1000" se ve
 * "1,000" apenas se tipea el cuarto dígito, como cualquier app de
 * plata de verdad. Por dentro sigue siendo texto —los `type="number"`
 * del navegador no aceptan comas—, pero aPesos() ya limpia cualquier
 * caracter que no sea dígito o punto al leerlo, así que nada más
 * cambia con este campo.
 *
 * ⚠️ Requiere llamar a activarFormatoDeMiles(id, cuerpo) después de
 * abrirHoja(), para que el formato se actualice mientras se escribe.
 *
 * @param {Object} opciones - id, rotulo, valor (en pesos), pista.
 * @returns {string}
 */
function campoDinero(opciones) {
  const valor = (opciones.valor !== undefined && opciones.valor !== '' && opciones.valor !== null)
    ? formatoDeMiles(String(opciones.valor))
    : '';
  return '' +
    '<label class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      '<input type="text" inputmode="decimal" id="' + seguro(opciones.id) + '" ' +
             'class="campo__control" value="' + seguro(valor) + '"' +
             (opciones.pista ? ' placeholder="' + seguro(opciones.pista) + '"' : '') +
      '>' +
    '</label>';
}

/**
 * Engancha el separador de miles en vivo sobre un campoDinero() ya
 * insertado en el DOM. El cursor se mantiene al final salvo que se
 * estuviera editando en medio del número —caso raro en un monto—, para
 * no complicar el cálculo exacto de dónde reinsertarlo.
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {void}
 */
function activarFormatoDeMiles(id, cuerpo) {
  const campo = buscar('#' + id, cuerpo);
  if (!campo) return;
  campo.addEventListener('input', () => {
    const estabaAlFinal = campo.selectionStart === campo.value.length;
    campo.value = formatoDeMiles(campo.value);
    if (estabaAlFinal) {
      campo.selectionStart = campo.value.length;
      campo.selectionEnd = campo.value.length;
    }
  });
}

/**
 * Una lista de cláusulas típicas para elegir con casillas, más un
 * texto libre para agregar cualquier otra cosa a mano. Pensado para
 * que un contrato quede con base legal razonable sin que Lucila tenga
 * que redactar cláusulas ella misma: puede aceptar las sugeridas tal
 * cual, tildar solo las que quiera, y sumar lo demás con sus palabras.
 *
 * @param {Object} opciones - id, rotulo, opciones (string[]), valorLibre.
 * @returns {string}
 */
function campoDeClausulas(opciones) {
  const casillas = opciones.opciones.map(texto =>
    '<label class="casilla" style="align-items:flex-start;margin-bottom:6px">' +
      '<input type="checkbox" data-clausula-de="' + seguro(opciones.id) + '" ' +
             'value="' + seguro(texto) + '">' +
      '<span>' + seguro(texto) + '</span>' +
    '</label>'
  ).join('');

  return '' +
    '<div class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      '<div style="margin:6px 0">' + casillas + '</div>' +
      '<textarea id="' + seguro(opciones.id) + '-libre" class="campo__control" ' +
                'placeholder="Agrega cualquier otra, con tus palabras (opcional)">' +
        seguro(opciones.valorLibre || '') +
      '</textarea>' +
    '</div>';
}

/**
 * Junta lo tildado en campoDeClausulas() más el texto libre en un solo
 * bloque de texto, separado por renglones en blanco — el servidor
 * sigue recibiendo texto plano, como siempre.
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {string}
 */
function valorDeClausulasDe(id, cuerpo) {
  const tildadas = buscarTodos('[data-clausula-de="' + id + '"]', cuerpo)
    .filter(casilla => casilla.checked)
    .map(casilla => casilla.value);
  const libre = valorDe(id + '-libre', cuerpo);
  return tildadas.concat(libre ? [libre] : []).join('\n\n');
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
 * Los códigos de país de todo el continente americano, para que nadie
 * tenga que acordarse de escribir +52 a mano. México va primero: es
 * quien usa este panel casi siempre.
 */
const CODIGOS_DE_PAIS_AMERICA = [
  { pais: 'México',               codigo: '+52'  },
  { pais: 'Estados Unidos',       codigo: '+1'   },
  { pais: 'Canadá',               codigo: '+1'   },
  { pais: 'Guatemala',            codigo: '+502' },
  { pais: 'Belice',               codigo: '+501' },
  { pais: 'Honduras',             codigo: '+504' },
  { pais: 'El Salvador',          codigo: '+503' },
  { pais: 'Nicaragua',            codigo: '+505' },
  { pais: 'Costa Rica',           codigo: '+506' },
  { pais: 'Panamá',               codigo: '+507' },
  { pais: 'Cuba',                 codigo: '+53'  },
  { pais: 'República Dominicana', codigo: '+1'   },
  { pais: 'Puerto Rico',          codigo: '+1'   },
  { pais: 'Colombia',             codigo: '+57'  },
  { pais: 'Venezuela',            codigo: '+58'  },
  { pais: 'Ecuador',              codigo: '+593' },
  { pais: 'Perú',                 codigo: '+51'  },
  { pais: 'Brasil',               codigo: '+55'  },
  { pais: 'Bolivia',              codigo: '+591' },
  { pais: 'Paraguay',             codigo: '+595' },
  { pais: 'Chile',                codigo: '+56'  },
  { pais: 'Argentina',            codigo: '+54'  },
  { pais: 'Uruguay',              codigo: '+598' },
];

/**
 * Separa "+52 55 1147 8600" en { codigo: '+52', numero: '55 1147 8600' }.
 * Si no reconoce ningún código al principio, asume México (+52) y deja
 * el texto entero como número — nunca se pierde lo que ya estaba
 * escrito, con o sin código.
 *
 * @param {string} telefonoCompleto
 * @returns {{codigo: string, numero: string}}
 */
function separarCodigoDePais(telefonoCompleto) {
  const texto = String(telefonoCompleto || '').trim();
  const porLargo = CODIGOS_DE_PAIS_AMERICA.slice()
    .sort((a, b) => b.codigo.length - a.codigo.length);
  const encontrado = porLargo.find(c => texto.startsWith(c.codigo));

  return encontrado
    ? { codigo: encontrado.codigo, numero: texto.slice(encontrado.codigo.length).trim() }
    : { codigo: '+52', numero: texto };
}

/**
 * Un teléfono con su código de país al lado, en vez de un campo de
 * texto suelto — así nadie tiene que acordarse de escribir "+52" cada
 * vez. México sale elegido de fábrica, porque es el país de quien usa
 * este panel casi siempre.
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {string} [opciones.valor]  - Puede venir con o sin código.
 * @param {string} [opciones.pista]
 * @returns {string}
 */
function campoTelefono(opciones) {
  const partes = separarCodigoDePais(opciones.valor || '');

  const items = CODIGOS_DE_PAIS_AMERICA.map(c =>
    '<option value="' + seguro(c.codigo) + '"' +
    (c.codigo === partes.codigo ? ' selected' : '') + '>' +
      seguro(c.codigo) + ' ' + seguro(c.pais) +
    '</option>'
  ).join('');

  return '' +
    '<label class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo || 'Teléfono') + '</span>' +
      '<div style="display:flex;gap:6px">' +
        '<select id="' + seguro(opciones.id) + '-cod" class="campo__control" ' +
                'style="flex:0 0 auto;width:auto">' +
          items +
        '</select>' +
        '<input type="tel" id="' + seguro(opciones.id) + '" class="campo__control" ' +
               'value="' + seguro(partes.numero) + '"' +
               (opciones.pista ? ' placeholder="' + seguro(opciones.pista) + '"' : '') +
               ' style="flex:1 1 auto">' +
      '</div>' +
    '</label>';
}

/**
 * Lee un campoTelefono() ya armado y devuelve el número completo, con
 * su código de país adelante (p. ej. "+52 55 1147 8600"). Vacío si no
 * se escribió ningún número, aunque haya un país elegido.
 *
 * @param {string} id
 * @param {Element} [dentroDe]
 * @returns {string}
 */
function valorTelefonoDe(id, dentroDe) {
  const numero = valorDe(id, dentroDe);
  if (!numero) return '';
  const codigo = valorDe(id + '-cod', dentroDe) || '+52';
  return codigo + ' ' + numero;
}

/**
 * Manda un archivo ya guardado (un recibo, un contrato) por WhatsApp.
 *
 * CÓMO LO HACE
 * En el teléfono, usa el panel para compartir del propio sistema
 * operativo (Web Share API) con el PDF ya adjunto: Lucila toca
 * WhatsApp ahí mismo y el archivo llega adjunto, sin descargar nada a
 * mano. En escritorio (donde ese panel no sabe compartir archivos) baja
 * el PDF y abre el chat de WhatsApp del proveedor, listo para arrastrar
 * el archivo que se acaba de descargar.
 *
 * @param {number} archivoId
 * @param {string} nombreArchivo
 * @param {string} [telefonoProveedor] - Para el chat, si hay que hacer
 *   el camino largo de escritorio.
 * @returns {Promise<void>}
 */
async function compartirArchivoPorWhatsApp(archivoId, nombreArchivo, telefonoProveedor) {
  let blob;
  try {
    const respuesta = await fetch('archivos.php?accion=ver&id=' + archivoId,
                                   { credentials: 'same-origin' });
    if (!respuesta.ok) throw new Error('No se pudo abrir el archivo.');
    blob = await respuesta.blob();
  } catch (error) {
    avisar(error.message || 'No se pudo abrir el archivo.', true);
    return;
  }

  const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombreArchivo });
    } catch (error) {
      // La persona canceló el panel de compartir: no es un error real.
    }
    return;
  }

  // Escritorio, o un navegador sin soporte para compartir archivos:
  // se descarga y, si hay teléfono, se abre el chat para adjuntarlo.
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  const numero = paraWhatsApp(telefonoProveedor);
  if (numero) {
    window.open('https://wa.me/' + numero + '?text='
      + encodeURIComponent('Te comparto: ' + nombreArchivo), '_blank');
  }
  avisar('Se descargó el PDF' + (numero ? ' y se abrió WhatsApp: adjúntalo ahí.' : '.'));
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


/* ─── 6. LISTA DE DETALLE (ÍTEMS DE "QUÉ INCLUYE") ─────────────────── */

/**
 * Contador para dar id único a los ítems que se agregan en el momento
 * (todavía no tienen uno del servidor). No hace falta que sobreviva
 * entre recargas: solo sirve para no repetir key mientras la hoja está
 * abierta.
 */
let _SIGUIENTE_ID_DE_DETALLE = 1;

/**
 * Un ítem nuevo, con id propio para poder quitarlo del renglón correcto
 * aunque dos ítems tengan el mismo texto.
 *
 * @param {string} [texto]
 * @param {boolean} [hecho]
 * @returns {{id:string, texto:string, hecho:boolean}}
 */
function nuevoItemDeDetalle(texto, hecho) {
  return { id: 'nuevo-' + (_SIGUIENTE_ID_DE_DETALLE++), texto: texto || '', hecho: !!hecho };
}

/**
 * Convierte lo que haya en la columna vieja de texto libre ("qué
 * incluye" corrido) a la lista de ítems nueva. No borra nada: si no hay
 * texto, devuelve una lista vacía en vez de inventar un ítem.
 *
 * Si lo que llega ya es un JSON de una lista (porque se está reabriendo
 * algo que ya se guardó con el formato nuevo), se respeta tal cual.
 *
 * @param {string|Array} texto
 * @returns {Array<{id:string, texto:string, hecho:boolean}>}
 */
function itemsDesdeTexto(texto) {
  if (Array.isArray(texto)) {
    return texto
      .map(it => (it && typeof it === 'object')
        ? nuevoItemDeDetalle(String(it.texto || ''), !!it.hecho)
        : nuevoItemDeDetalle(String(it || '')))
      .filter(it => it.texto.trim());
  }

  const crudo = String(texto || '').trim();
  if (!crudo) return [];

  // Si ya es JSON de una lista (reabrir algo guardado con el formato
  // nuevo), se usa esa lista directo en vez de partirla por renglón.
  if (crudo.startsWith('[')) {
    try {
      const lista = JSON.parse(crudo);
      if (Array.isArray(lista)) return itemsDesdeTexto(lista);
    } catch (error) {
      // No era JSON de verdad: sigue como texto plano de abajo.
    }
  }

  // Texto corrido de siempre: una línea o un ";" por ítem.
  return crudo
    .split(/\r?\n|;/)
    .map(linea => linea.trim())
    .filter(Boolean)
    .map(linea => nuevoItemDeDetalle(linea));
}

/**
 * El HTML de un renglón de ítem.
 *
 * @param {{id:string, texto:string, hecho:boolean}} item
 * @returns {string}
 */
function _filaDeDetalle(item) {
  return '' +
    '<div class="lista__fila" data-detalle-fila="' + seguro(item.id) + '" ' +
         'style="gap:var(--esp-1)">' +
      '<input type="checkbox" data-detalle-hecho' +
             (item.hecho ? ' checked' : '') + ' aria-label="Ya está">' +
      '<input type="text" class="campo__control" data-detalle-texto ' +
             'value="' + seguro(item.texto) + '" placeholder="Ej. Montaje incluido">' +
      '<button type="button" class="boton boton--chico" data-detalle-quitar ' +
              'aria-label="Quitar">✕</button>' +
    '</div>';
}

/**
 * Ítems típicos por tipo de servicio, para no empezar de cero. Son un
 * punto de partida MX-XV, no una verdad absoluta: agregan, no
 * reemplazan lo que ya se haya escrito, así que sumar una plantilla de
 * más no borra nada.
 */
const PLANTILLAS_DETALLE_PROVEEDOR = {
  salon: {
    nombre: 'Salón',
    palabras: ['salon', 'salón', 'jardin', 'jardín', 'quinta', 'terraza'],
    items: [
      'Montaje y desmontaje', 'Mobiliario y mantelería',
      'Iluminación básica del salón', 'Seguridad y valet parking',
      'Horas de renta incluidas', 'Estacionamiento',
    ],
  },
  dj: {
    nombre: 'DJ',
    palabras: ['dj', 'musica', 'música', 'sonido'],
    items: [
      'Horas de música incluidas', 'Equipo de sonido e iluminación',
      'Micrófono para brindis', 'Ambientación de la ceremonia',
      'Lista de canciones y prohibidas por escrito',
    ],
  },
  foto: {
    nombre: 'Foto',
    palabras: ['foto', 'fotograf', 'fotógrafo'],
    items: [
      'Horas de cobertura', 'Número de fotógrafos',
      'Fotos editadas entregadas', 'Álbum impreso',
      'Sesión previa (save the date)',
    ],
  },
  video: {
    nombre: 'Video',
    palabras: ['video', 'vídeo', 'filmacion', 'filmación'],
    items: [
      'Horas de cobertura', 'Video resumen (highlights)',
      'Video completo de la ceremonia', 'Dron',
      'Entrega en USB o nube',
    ],
  },
  decoracion: {
    nombre: 'Decoración',
    palabras: ['decora', 'flores', 'floral', 'ambientacion', 'ambientación'],
    items: [
      'Centros de mesa', 'Arco o backdrop de ceremonia',
      'Flores para el vals', 'Montaje y desmontaje',
      'Mesa de dulces / postres',
    ],
  },
  pastel: {
    nombre: 'Pastel',
    palabras: ['pastel', 'reposteria', 'repostería', 'postre'],
    items: [
      'Número de personas que rinde', 'Sabor y relleno',
      'Piso de exhibición (falso)', 'Entrega y montaje el día del evento',
      'Cuchillo y servicio de corte',
    ],
  },
};

/**
 * Qué plantillas sugerirle a un proveedor según lo que escribió en
 * "Servicio". Puede devolver más de una si el texto es ambiguo (ej.
 * "Foto y video"), y ninguna si no reconoce nada — no inventa.
 *
 * @param {string} servicio
 * @returns {Array<{nombre:string, items:string[]}>}
 */
function plantillasSugeridasPara(servicio) {
  const normalizado = paraBuscar(servicio || '');
  if (!normalizado) return [];

  return Object.values(PLANTILLAS_DETALLE_PROVEEDOR).filter(p =>
    p.palabras.some(palabra => normalizado.includes(paraBuscar(palabra)))
  );
}

/**
 * Devuelve el HTML de la lista editable de "qué incluye": un renglón
 * por ítem, más agregar uno y pegar varias líneas de un tirón.
 *
 * Sigue el mismo molde que los demás campoX() de este archivo: arma el
 * HTML acá, y quien abre la hoja llama a engancharListaDeDetalle()
 * después de insertarlo en el DOM (igual que engancharListaAmpliable()
 * en 09-vista-dinero.js).
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {Array} [opciones.items] - Ya en formato {id,texto,hecho}.
 * @param {string} [opciones.ayuda]
 * @param {Array<{nombre:string,items:string[]}>} [opciones.plantillas]
 *   - Botones de "Usar plantilla de X" (ver plantillasSugeridasPara()).
 * @returns {string}
 */
function campoListaDeDetalle(opciones) {
  const items = opciones.items && opciones.items.length ? opciones.items : [];
  const plantillas = opciones.plantillas || [];

  return '' +
    '<div class="campo">' +
      '<span class="campo__rotulo">' + seguro(opciones.rotulo) + '</span>' +
      (opciones.ayuda
        ? '<span class="vacio__texto">' + seguro(opciones.ayuda) + '</span>'
        : '') +
      '<div id="' + seguro(opciones.id) + '">' +
        items.map(_filaDeDetalle).join('') +
      '</div>' +
      '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-1);flex-wrap:wrap">' +
        '<button type="button" class="boton boton--chico" data-detalle-agregar>' +
          'Agregar línea</button>' +
        '<button type="button" class="boton boton--chico" data-detalle-pegar>' +
          'Pegar varias…</button>' +
        plantillas.map((p, i) =>
          '<button type="button" class="boton boton--chico" data-detalle-plantilla="' + i + '">' +
            'Usar plantilla de ' + seguro(p.nombre) + '</button>'
        ).join('') +
      '</div>' +
    '</div>';
}

/**
 * Engancha los botones de una lista de detalle ya insertada en el DOM.
 * Se llama una vez, después de abrirHoja(), igual que
 * engancharListaAmpliable().
 *
 * @param {string} id - El mismo que se le dio a campoListaDeDetalle().
 * @param {Element} [cuerpo]
 * @param {Array<{nombre:string,items:string[]}>} [plantillas] - Mismo
 *   arreglo, en el mismo orden, que se le pasó a campoListaDeDetalle().
 * @returns {void}
 */
function engancharListaDeDetalle(id, cuerpo, plantillas) {
  const contenedor = buscar('#' + id, cuerpo);
  if (!contenedor) return;

  const raiz = contenedor.parentElement; // el <div class="campo"> entero

  const agregarFila = (item) => {
    contenedor.insertAdjacentHTML('beforeend', _filaDeDetalle(item));
    engancharQuitar(buscar('[data-detalle-fila="' + item.id + '"]', contenedor));
  };

  const engancharQuitar = (fila) => {
    if (!fila) return;
    buscar('[data-detalle-quitar]', fila).addEventListener('click', () => fila.remove());
  };

  buscarTodos('[data-detalle-fila]', contenedor).forEach(engancharQuitar);

  buscarTodos('[data-detalle-plantilla]', raiz).forEach(boton => {
    boton.addEventListener('click', () => {
      const plantilla = (plantillas || [])[Number(boton.dataset.detallePlantilla)];
      if (!plantilla) return;

      // No repite lo que ya está escrito, para poder tocar el botón
      // más de una vez (ej. "Foto y video") sin duplicar renglones.
      const yaEscritos = new Set(
        buscarTodos('[data-detalle-texto]', contenedor).map(i => paraBuscar(i.value))
      );
      plantilla.items
        .filter(texto => !yaEscritos.has(paraBuscar(texto)))
        .forEach(texto => agregarFila(nuevoItemDeDetalle(texto)));
    });
  });

  const botonAgregar = buscar('[data-detalle-agregar]', raiz);
  if (botonAgregar) {
    botonAgregar.addEventListener('click', () => {
      agregarFila(nuevoItemDeDetalle());
      const nuevoTexto = contenedor.lastElementChild &&
        buscar('[data-detalle-texto]', contenedor.lastElementChild);
      if (nuevoTexto) nuevoTexto.focus();
    });
  }

  /* "Pegar varias…" abre un prompt() de una sola vez en vez de armar un
     textarea aparte: es lo más rápido para pegar una lista que ya se
     tenía copiada de una cotización en PDF o un WhatsApp, sin agregar
     otro control permanente a un formulario que ya tiene bastantes. */
  const botonPegar = buscar('[data-detalle-pegar]', raiz);
  if (botonPegar) {
    botonPegar.addEventListener('click', () => {
      const texto = window.prompt(
        'Pega aquí varias líneas (una por ítem, o separadas por ";"):', '');
      if (!texto) return;
      itemsDesdeTexto(texto).forEach(agregarFila);
    });
  }
}

/**
 * El HTML de solo lectura de "qué incluye", para las fichas de
 * detalle (no editables) de proveedor y cotización. Los ítems marcados
 * "hecho" salen tachados en vez de desaparecer — sigue siendo parte de
 * lo acordado, solo que ya se cumplió.
 *
 * @param {Array} [items]
 * @returns {string} HTML, o '' si no hay ítems (nada que mostrar).
 */
function vinetasDeQueIncluye(items) {
  if (!items || !items.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-2)">Incluye</div>' +
    '<ul style="margin:0 0 var(--esp-2);padding-left:1.2em">' +
      items.map(item =>
        '<li' + (item.hecho ? ' style="text-decoration:line-through;color:var(--texto-tenue)"' : '') +
        '>' + seguro(item.texto) + '</li>'
      ).join('') +
    '</ul>';
}

/**
 * Lee los ítems actuales de una lista de detalle ya abierta. Los
 * renglones que se dejaron vacíos no se guardan.
 *
 * @param {string} id
 * @param {Element} [dentroDe]
 * @returns {Array<{id:string, texto:string, hecho:boolean}>}
 */
function valorDeListaDeDetalle(id, dentroDe) {
  const contenedor = buscar('#' + id, dentroDe);
  if (!contenedor) return [];

  return buscarTodos('[data-detalle-fila]', contenedor)
    .map(fila => ({
      id:    fila.dataset.detalleFila,
      texto: buscar('[data-detalle-texto]', fila).value.trim(),
      hecho: buscar('[data-detalle-hecho]', fila).checked,
    }))
    .filter(item => item.texto);
}


/* ─── 7. ETIQUETAS LIBRES (ENTREGA 2) ──────────────────────────────── */

/**
 * Pinta los "chips" de etiquetas de una persona o una mesa, con forma
 * de agregar (elegir una existente o escribir una nueva) y de quitar
 * cada una. Autocontenido a propósito: se llama una vez, con el
 * contenedor vacío donde va, y desde ahí se arma y refresca solo — así
 * sirve igual desde la ficha de un acompañante (08-vista-invitados.js)
 * que desde la de una mesa (17-mesas.js), sin duplicar nada.
 *
 * @param {'acompanante'|'mesa'} tipo
 * @param {number} id
 * @param {Element} contenedor
 * @returns {Promise<void>}
 */
async function pintarEtiquetasDe(tipo, id, contenedor) {
  if (!contenedor) return;

  let puestas;
  try {
    const r = await traer('etiquetas_acomodo.php?accion=por_objeto&tipo=' + tipo + '&id=' + id);
    puestas = r.filas || [];
  } catch (error) {
    contenedor.innerHTML = '';
    return; // No es crítico: la ficha se puede ver igual sin esto.
  }

  contenedor.innerHTML =
    '<span class="campo__rotulo">Etiquetas</span>' +
    '<div class="menus-mini" style="margin-bottom:var(--esp-1)">' +
      (puestas.length
        ? puestas.map(e =>
            '<span class="etiqueta" data-etiqueta-puesta="' + seguro(e.id) + '" ' +
                  'style="cursor:pointer" title="Tocar para quitar">' +
              seguro(e.nombre) + ' ✕' +
            '</span>'
          ).join('')
        : '<span class="vacio__texto" style="margin:0">Ninguna todavía.</span>') +
    '</div>' +
    '<div style="display:flex;gap:6px">' +
      '<input type="text" id="etiqueta-nueva-' + tipo + id + '" class="campo__control" ' +
             'placeholder="Escribí o elegí una etiqueta" list="etiquetas-existentes" ' +
             'style="flex:1">' +
      '<button type="button" class="boton boton--chico" id="etiqueta-agregar-' + tipo + id + '">' +
        'Agregar</button>' +
    '</div>' +
    '<datalist id="etiquetas-existentes"></datalist>';

  // La lista completa, para el autocompletar del <input list="…">. No
  // es crítico si falla: el campo sigue funcionando como texto libre.
  try {
    const catalogo = await traer('etiquetas_acomodo.php?accion=listar');
    const datalist = buscar('#etiquetas-existentes', contenedor);
    if (datalist) {
      datalist.innerHTML = (catalogo.filas || [])
        .map(e => '<option value="' + seguro(e.nombre) + '">').join('');
    }
  } catch (error) { /* sin autocompletar, se sigue igual */ }

  buscarTodos('[data-etiqueta-puesta]', contenedor).forEach(chip => {
    chip.addEventListener('click', async () => {
      try {
        await mandar('etiquetas_acomodo.php?accion=quitar', {
          etiqueta_id: Number(chip.dataset.etiquetaPuesta), tipo: tipo, id: id,
        });
        pintarEtiquetasDe(tipo, id, contenedor);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  const campoNueva = buscar('#etiqueta-nueva-' + tipo + id, contenedor);
  const agregar = async () => {
    const nombre = campoNueva.value.trim();
    if (!nombre) return;
    try {
      await mandar('etiquetas_acomodo.php?accion=asignar', { nombre: nombre, tipo: tipo, id: id });
      pintarEtiquetasDe(tipo, id, contenedor);
    } catch (error) {
      avisar(error.message, true);
    }
  };

  buscar('#etiqueta-agregar-' + tipo + id, contenedor).addEventListener('click', agregar);
  campoNueva.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') { evento.preventDefault(); agregar(); }
  });
}
