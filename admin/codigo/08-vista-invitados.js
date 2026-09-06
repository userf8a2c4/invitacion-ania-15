/* ══════════════════════════════════════════════════════════════════════
   08 · VISTA INVITADOS

   QUÉ HACE ESTE ARCHIVO
   La lista de quién confirmó, con buscador y filtros, el detalle de cada
   confirmación, y la edición.

   POR QUÉ SE FILTRA EN EL TELÉFONO Y NO EN EL SERVIDOR
   Los invitados de unos XV son decenas, no millones: caben de sobra en
   la memoria del teléfono. Traerlos una vez y filtrarlos acá hace que
   escribir en el buscador sea instantáneo, sin un viaje al servidor por
   cada letra. Si algún día fueran miles, habría que cambiarlo — pero
   optimizar para un caso que no existe es perder tiempo.

   ÍNDICE
     1. Dibujar la vista
     2. Filtrar y pintar la lista
     3. Detalle de una confirmación
     4. Editar y dar de alta
   ══════════════════════════════════════════════════════════════════════ */


/** Todas las confirmaciones, tal como llegaron del servidor. */
let INVITADOS = [];

/** Si la tabla permite editar (o sea, si tiene columna id). */
let INVITADOS_EDITABLES = false;

/** Qué filtro está puesto: 'todos', 'asisten', 'no_asisten'. */
let FILTRO_INVITADOS = 'todos';

/** Los chips de filtro: [clave, lo que se lee en pantalla].
 *
 *  Están acá, en una lista, y no escritos a mano en el HTML, por dos motivos:
 *  el chip encendido se deduce de FILTRO_INVITADOS al dibujar (antes se fijaba
 *  a mano en "Todos" y mentía), y las palabras quedan en un solo sitio.
 *
 *  ⚠️ Las CLAVES son las que entiende invitadoPasaElFiltro() y no se tocan;
 *  lo que cambia es solo el texto. "Confirmaron" y "No vienen" son las
 *  palabras únicas del proyecto para esos dos estados: la misma gente aparecía
 *  como "Asisten/Confirmados/Confirman" en unas pantallas y como
 *  "No asisten/No puede/No viene/Declinadas" en otras. */
const FILTROS_DE_GENTE = [
  ['todos',         'Todos'],
  ['asisten',       'Confirmaron'],
  ['no_asisten',    'No vienen'],
  ['sin_enviar',    'Sin enviar'],
  ['sin_responder', 'Sin responder'],
  ['alergias',      'Con alergias'],
  ['sin_mesa',      'Sin mesa'],
  ['sin_telefono',  'Sin teléfono'],
];

/** Qué se escribió en el buscador. */
let BUSQUEDA_INVITADOS = '';

/** Si está activo el modo de selección múltiple (Fase 5 del rediseño). */
let SELECCION_ACTIVA = false;

/** Los id de confirmación marcados en modo selección. */
let SELECCIONADOS = new Set();


/* ─── 1. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide la lista y arma la pantalla de Invitados.
 *
 * @returns {Promise<void>}
 */
/** Qué sección de "Gente" se está viendo. Las claves salen de CONFIGURACION. */
let SECCION_GENTE = 'invitados';

/** Qué secciones ya pidieron sus datos, para no pedirlos dos veces. */
const GENTE_CARGADA = {};

/**
 * Dibuja la pestaña Gente.
 *
 * QUÉ HAY ACÁ ADENTRO
 * Invitados, Mesas, Regalos, Foráneos y la Agenda de contactos. Las
 * cinco son cosas sobre PERSONAS, y por eso viven juntas.
 *
 * POR QUÉ MESAS, REGALOS Y FORÁNEOS SE MUDARON DESDE EVENTO
 * Porque no son "qué falta preparar", son "quién viene". Estando en
 * Evento había que saltar de pestaña para ver quién confirmó y dónde
 * sentarlo, que son la misma decisión tomada en dos pantallas.
 *
 * POR QUÉ ACÁ SIGUEN SIENDO PÍLDORAS Y NO UN ÍNDICE COMO EVENTO
 * Porque son cinco y entran en un renglón. El índice de Evento existe
 * porque catorce píldoras se apilaban en cinco renglones; con cinco, el
 * índice sería un paso de más para llegar a lo mismo.
 *
 * @returns {Promise<void>}
 */
async function dibujarGente() {
  const vista    = buscar('#vista-invitados');
  const secciones = CONFIGURACION.seccionesDeGente;

  /* Se rehace el HTML entero, así que lo dibujado antes ya no existe.
     Sin esta limpieza, una sección quedaría marcada como cargada
     apuntando a un contenedor vacío y no se volvería a pintar nunca. */
  Object.keys(GENTE_CARGADA).forEach(k => { delete GENTE_CARGADA[k]; });


  vista.innerHTML =
    '<div class="filtros" style="margin-bottom:6px">' +
      secciones.map(s =>
        '<button class="filtro' + (SECCION_GENTE === s[0] ? ' activo' : '') +
        '" data-gente="' + seguro(s[0]) + '">' +
        seguro(et('gente.' + s[0], s[1])) + '</button>'
      ).join('') +
    '</div>' +

    /* ⚡ (2026-08-28) El texto que explica qué es cada sección (tercer
       valor de CONFIGURACION.seccionesDeGente) existía desde siempre
       pero nunca se pintaba en ningún lado — justo el motivo por el que
       "Invitados" e "Invitaciones" se prestaban a confusión: no había
       forma de leer, sin adivinar, en qué se diferencian. */
    '<p class="vacio__texto" id="subtitulo-gente" ' +
       'style="margin:0 0 var(--esp-2)"></p>' +

    /* Los cinco cuerpos conviven en el DOM y se alternan con .oculto,
       en vez de repintar uno solo. Así volver a una sección que ya se
       miró es instantáneo y no vuelve a pedir nada al servidor. */
    secciones.map(s =>
      '<div id="cuerpo-' + seguro(s[0]) + '"' +
      (SECCION_GENTE === s[0] ? '' : ' class="oculto"') + '></div>'
    ).join('');

  buscarTodos('[data-gente]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_GENTE = boton.dataset.gente;

      buscarTodos('[data-gente]', vista).forEach(o =>
        o.classList.toggle('activo', o === boton));

      secciones.forEach(s => {
        buscar('#cuerpo-' + s[0], vista)
          .classList.toggle('oculto', SECCION_GENTE !== s[0]);
      });

      pintarSubtituloDeGente(vista);
      pintarSeccionDeGente();
    });
  });

  pintarSubtituloDeGente(vista);
  await pintarSeccionDeGente();
}

/**
 * El texto de una línea que explica qué es la sección de Gente que
 * está abierta — el tercer valor de cada fila de
 * CONFIGURACION.seccionesDeGente.
 *
 * @param {Element} vista
 * @returns {void}
 */
function pintarSubtituloDeGente(vista) {
  const subtitulo = buscar('#subtitulo-gente', vista);
  if (!subtitulo) return;
  const fila = CONFIGURACION.seccionesDeGente.find(s => s[0] === SECCION_GENTE);
  subtitulo.textContent = fila ? (fila[2] || '') : '';
}

/**
 * Pinta la sección de Gente que esté abierta.
 *
 * Cada una se carga la primera vez que se mira, no al abrir la pestaña:
 * pedir las cinco de entrada serían cinco viajes al servidor para ver
 * uno solo.
 *
 * @returns {Promise<void>}
 */
async function pintarSeccionDeGente() {
  const clave  = SECCION_GENTE;
  const cuerpo = buscar('#cuerpo-' + clave);
  if (!cuerpo) return;

  // Ya estaba dibujada: solo hay que corregir el título del encabezado.
  if (GENTE_CARGADA[clave]) {
    if (clave === 'invitados') ponerTituloDeInvitados();
    else ponerTitulo(tituloDeGente(clave));
    return;
  }

  GENTE_CARGADA[clave] = true;

  try {
    /* Invitados es la única que pone su propio título, porque le agrega
       el recuento de gente. Las demás lo toman de la configuración; si
       no se pusiera acá, quedaría el título de la sección anterior. */
    if (clave === 'invitados') { await dibujarInvitados(); return; }

    ponerTitulo(tituloDeGente(clave));

    if (clave === 'contactos') { await dibujarContactos(); return; }

    /* Mesas, Regalos y Foráneos salen de evento.php, que puede no
       haberse pedido todavía si nadie entró a la pestaña Evento. */
    pintarCargando(cuerpo, 4);
    await asegurarEvento();

    if (clave === 'mesas') { await pintarMesas(cuerpo); return; }

    if (clave === 'regalos') {
      // Los regalos llevan arriba la tarjeta de la lista de Amazon.
      cuerpo.innerHTML = tarjetaMesaDeRegalos() + '<div id="lista-regalos"></div>';
      engancharMesaDeRegalos(cuerpo);
      pintarSeccionGenerica(buscar('#lista-regalos', cuerpo), 'regalos');
      return;
    }

    pintarSeccionGenerica(cuerpo, clave);

  } catch (error) {
    // Se desmarca para que al volver a entrar lo intente de nuevo.
    GENTE_CARGADA[clave] = false;
    pintarError(cuerpo, error.message, () => {
      GENTE_CARGADA[clave] = false;
      pintarSeccionDeGente();
    });
  }
}

/**
 * Cómo se llama una sección de Gente en el encabezado.
 *
 * @param {string} clave
 * @returns {string}
 */
function tituloDeGente(clave) {
  const fila = CONFIGURACION.seccionesDeGente.find(s => s[0] === clave);
  return et('gente.' + clave, fila ? fila[1] : clave);
}

/**
 * Pone el título del encabezado con el recuento de invitados.
 *
 * Si se la llama sin números, los recalcula de lo que haya en memoria.
 * Eso hace falta al volver de la agenda de contactos, donde el título
 * quedó cambiado.
 *
 * @param {number} [confirmaciones]
 * @param {number} [personas]
 * @returns {void}
 */
function ponerTituloDeInvitados(confirmaciones, personas) {
  if (confirmaciones === undefined) {
    const visibles = INVITADOS.filter(invitadoPasaElFiltro);
    confirmaciones = visibles.length;
    personas = visibles.reduce((suma, fila) => {
      if (Number(fila.asiste) !== 1) return suma;
      return suma + (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);
    }, 0);
  }

  ponerTitulo('Gente',
    pluralizar(confirmaciones, 'confirmación', 'confirmaciones') +
    (personas ? ' · ' + pluralizar(personas, 'persona', 'personas') : ''));
}

/**
 * "2026-10-01" → "1 de octubre de 2026" — mismo formato que arma
 * fechaLimiteConfigurada() en admin/api/invitaciones.php, copiado en JS
 * porque ese texto no viaja armado en confirmaciones.php?accion=listar
 * (esa consulta no toca `ajustes`, a propósito: una tabla más en el
 * LEFT JOIN de la lista principal por un dato que se usa una vez, al
 * apretar "Mandar por WhatsApp", no vale la pena).
 *
 * @param {string} iso - "AAAA-MM-DD"
 * @returns {string}
 */
function formatearFechaLimiteLarga(iso) {
  const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;
  const [anio, mes, dia] = partes;
  return Number(dia) + ' de ' + (meses[Number(mes)] || mes) + ' de ' + anio;
}

/**
 * Pide la lista de confirmaciones y arma su sección.
 *
 * @returns {Promise<void>}
 */
async function dibujarInvitados() {
  const vista = buscar('#cuerpo-invitados');
  if (!vista) return;

  vista.innerHTML =
    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<input type="search" id="buscar-invitado" class="buscador__control" ' +
             'placeholder="Buscar por nombre, correo o código" ' +
             'autocapitalize="off" spellcheck="false">' +
    '</div>' +

    /* ⚡ (2026-08-28) Los filtros de "sin_enviar/sin_responder/sin_telefono"
       vienen de la extinta pestaña Envíos, fusionada acá — ver la nota
       grande en confirmaciones.php?accion=listar. */
    /* ⚡ EL CHIP ENCENDIDO SE DEDUCE DEL FILTRO, NO SE FIJA A MANO
       (2026-09-03). Antes "Todos" venía escrito con la clase `activo` en el
       HTML, mientras que el filtro de verdad vive en FILTRO_INVITADOS, una
       global que sobrevive al redibujado. Bastaba entrar desde Hoy → cifra
       "Alergias" (que pone FILTRO_INVITADOS='alergias' y luego redibuja) para
       que la lista saliera filtrada por alergias con el chip de "Todos"
       encendido: la pantalla decía una cosa y mostraba otra, y no había forma
       de darse cuenta salvo contando las filas. */
    '<div class="filtros" style="flex-wrap:wrap">' +
      FILTROS_DE_GENTE.map(f =>
        '<button class="filtro' + (FILTRO_INVITADOS === f[0] ? ' activo' : '') + '" ' +
                'data-filtro="' + f[0] + '">' + f[1] + '</button>'
      ).join('') +
    '</div>' +

    /* ⚡ "AGREGAR INVITADO" SUBIÓ ACÁ, ANTES DE LA LISTA (2026-09-03).
       Estaba al fondo, después de la lista COMPLETA y del botón de fecha
       límite. O sea que el costo de dar de alta a alguien crecía con cada
       invitado ya cargado: con la lista real hay que recorrer decenas de
       filas para llegar al botón que se usa justamente cuando la lista va
       creciendo. Medido: 4 toques y un scroll largo, para una tarea que es
       de las más frecuentes mientras se arma la fiesta.

       Arriba, junto al buscador, está siempre a la vista y no se mueve
       nunca. "Seleccionar" y "Descargar" se quedan abajo: son de usar
       después de mirar la lista, no antes. */
    '<div style="display:flex;gap:var(--esp-2);margin-bottom:var(--esp-2)">' +
      '<button class="boton boton--principal" style="flex:1" id="inv-nuevo">' +
        'Agregar invitado</button>' +
    '</div>' +

    '<div id="lista-invitados"></div>' +

    // ⚡ (2026-08-28) "Fecha límite" vivía en el encabezado de la extinta
    // pestaña Envíos (abrirConfiguracionDeInvitaciones() sigue en
    // 48-invitaciones.js, sin tocar — solo cambia desde dónde se llama).
    '<button type="button" class="lista__fila" id="inv-fecha-limite" ' +
      'style="margin-bottom:var(--esp-2)">⚙️ Fecha límite para confirmar</button>' +

    '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-1)">' +
      '<button class="boton" style="flex:1" id="inv-seleccionar">Seleccionar</button>' +
      '<button class="boton" style="flex:1" id="inv-descargar">Descargar</button>' +
    '</div>' +

    /* La barra flotante de acciones en lote. Vive siempre en el DOM,
       oculta hasta que haya algo seleccionado — más simple que armarla
       y desarmarla cada vez que cambia la selección. */
    '<div id="barra-seleccion" class="barra-seleccion oculto">' +
      '<span id="seleccion-cuantos" class="barra-seleccion__cuantos"></span>' +
      '<div class="barra-seleccion__botones">' +
        '<button class="boton boton--chico" id="sel-recordar">Recordar</button>' +
        '<button class="boton boton--chico" id="sel-mesa">Asignar mesa</button>' +
        '<button class="boton boton--chico" id="sel-llegada">Marcar llegada</button>' +
        '<button class="boton boton--chico boton--peligro" id="sel-cancelar">Cancelar</button>' +
      '</div>' +
    '</div>';

  const lista = buscar('#lista-invitados', vista);
  pintarCargando(lista, 6);

  try {
    const respuesta = await traer('confirmaciones.php?accion=listar');
    INVITADOS = respuesta.filas || [];
    INVITADOS_EDITABLES = !!respuesta.editable;
  } catch (error) {
    pintarError(lista, error.message, () => dibujarInvitados());
    throw error;
  }

  /* ⚡ (2026-08-28) FECHA_LIMITE_TEXTO (global de 48-invitaciones.js, la
     usa textoDeInvitacion() en el mensaje de WhatsApp) antes se cargaba
     sola al abrir la extinta pestaña Envíos. Con esa pestaña fusionada
     acá, se pide al entrar a Invitados.

     Se ESPERA (2026-09-03): era un `.then()` suelto y mandar rápido
     armaba el texto sin la fecha, o sea sin el párrafo que pide
     confirmar. Ver asegurarFechaLimiteDeConfirmacion().

     El texto base viaja al lado por la misma razón: se edita desde
     Invitaciones → configuración y tiene que estar cargado antes de que
     haya un botón de "Mandar por WhatsApp" que tocar. */
  await Promise.all([
    asegurarFechaLimiteDeConfirmacion(),
    asegurarTextoDeInvitacion(),
  ]);

  // Si la tabla no tiene id, el panel no puede editar ni borrar filas.
  // Se avisa una vez, en lugar de mostrar botones que fallarían.
  if (!INVITADOS_EDITABLES) {
    avisar('Esta lista es de solo lectura: se puede mirar, pero no editar.', true);
  }

  /* ⚡ ENTRAR ACÁ ES "YA LAS VI" (2026-09-03). La pestaña Gente lleva un
     número con las respuestas nuevas desde la última vez (lo calcula
     actualizarBurbujasDeLaBarra() en 30-vista-hoy.js, con el total que
     manda hoy.php). Abrir la lista es exactamente el gesto de mirarlas, así
     que acá se guarda el total de ahora y el número se apaga solo — sin un
     botón de "marcar como visto", que sería trabajo extra para decir algo
     que la propia visita ya dijo.

     ⚠️ SE GUARDA EL NÚMERO DE hoy.php, NO UNO CONTADO ACÁ. Las dos cuentas
     deberían dar igual, pero salen de tablas distintas (hoy.php cuenta
     `invitaciones`; esta lista son `confirmaciones` con la invitación
     embebida) y basta una invitación sin confirmación para que difieran en
     uno — y entonces la burbuja quedaría encendida para siempre, sin forma
     de apagarla. Guardando lo que dijo la misma fuente que la enciende, la
     resta da cero seguro. Si todavía no se abrió Hoy en esta sesión, se cae
     al conteo local, que es mejor que no apagar nada. */
  const respondidasSegunHoy = (typeof ULTIMO_HOY !== 'undefined' && ULTIMO_HOY)
    ? Number(ULTIMO_HOY.respondidas)
    : NaN;
  recordar('gente-respuestas-vistas', Number.isFinite(respondidasSegunHoy)
    ? respondidasSegunHoy
    : INVITADOS.filter(f => f.invitacion_respondida_en).length);
  if (typeof ponerBurbuja === 'function') ponerBurbuja('#burbuja-gente', 0);

  engancharInvitados(vista);
  pintarListaDeInvitados();
}

/**
 * Engancha el buscador y los filtros.
 *
 * @param {Element} vista
 * @returns {void}
 */
function engancharInvitados(vista) {

  buscar('#inv-descargar', vista).addEventListener('click', () => {
    abrirHojaDeFormatos('Descargar invitados', exportarInvitados);
  });

  buscar('#inv-fecha-limite', vista).addEventListener('click', () => {
    abrirConfiguracionDeInvitaciones();
  });

  buscar('#inv-nuevo', vista).addEventListener('click', () => {
    if (!INVITADOS_EDITABLES) {
      avisar('Esta lista es de solo lectura: no se pueden agregar invitados.', true);
      return;
    }
    // ⚡ (2026-08-28) A pedido explícito: crear un invitado SIEMPRE
    // genera su link de una, no dos caminos distintos según por dónde
    // se lo cree. abrirFormularioDeInvitacion() vive en 48-invitaciones.js
    // -mismo scope global, sin import- y llama a invitaciones.php?accion
    // =guardar, que arma la confirmación y el token juntos.
    abrirFormularioDeInvitacion();
  });

  const buscador = buscar('#buscar-invitado', vista);

  buscador.value = BUSQUEDA_INVITADOS;
  buscador.addEventListener('input', () => {
    BUSQUEDA_INVITADOS = buscador.value;
    pintarListaDeInvitados();
  });

  buscarTodos('.filtro', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      FILTRO_INVITADOS = boton.dataset.filtro;

      buscarTodos('.filtro', vista).forEach(otro => {
        otro.classList.toggle('activo', otro === boton);
      });

      pintarListaDeInvitados();
    });
  });

  const botonSeleccionar = buscar('#inv-seleccionar', vista);
  botonSeleccionar.addEventListener('click', () => {
    SELECCION_ACTIVA = !SELECCION_ACTIVA;
    if (!SELECCION_ACTIVA) SELECCIONADOS.clear();
    botonSeleccionar.textContent = SELECCION_ACTIVA ? 'Cancelar selección' : 'Seleccionar';
    pintarListaDeInvitados();
    actualizarBarraSeleccion();
  });

  buscar('#sel-cancelar', vista).addEventListener('click', salirDeSeleccion);

  buscar('#sel-recordar', vista).addEventListener('click', () => recordarEnLote());
  buscar('#sel-mesa', vista).addEventListener('click', () => asignarMesaEnLote());
  buscar('#sel-llegada', vista).addEventListener('click', () => marcarLlegadaEnLote());
}


/* ─── 2. FILTRAR Y PINTAR LA LISTA ─────────────────────────────────── */

/**
 * Aplica el filtro y la búsqueda, y pinta las filas.
 *
 * @returns {void}
 */
/**
 * Escribe en el chip "Sin responder" cuánta gente falta, contando sobre
 * LA MISMA lista que se está mostrando.
 *
 * ⚡ POR QUÉ EL NÚMERO VA ACÁ Y NO VIENE DEL SERVIDOR (2026-09-02).
 * Había dos cuentas de "sin responder" hechas por separado —una para la
 * lista y otra para el resumen de arriba— y medían poblaciones
 * distintas, así que se contradecían en pantalla: el resumen podía decir
 * 0 mientras la lista mostraba a todo el mundo. Calculándolo acá, sobre
 * el mismo arreglo que se filtra dos líneas más abajo, es imposible que
 * el número y la lista dejen de coincidir.
 *
 * El trabajo #1 en la app es saber quién falta: el número tiene que
 * estar a la vista sin tener que tocar el filtro para averiguarlo.
 *
 * @returns {void}
 */
function actualizarElNumeroDeQuienFalta() {
  const chip = buscar('[data-filtro="sin_responder"]');
  if (!chip) return;
  const faltan = INVITADOS.reduce((suma, fila) => suma + (yaRespondio(fila) ? 0 : 1), 0);
  chip.textContent = faltan ? 'Sin responder · ' + faltan : 'Sin responder';
}

function pintarListaDeInvitados() {
  const lista = buscar('#lista-invitados');
  if (!lista) return;

  actualizarElNumeroDeQuienFalta();

  const visibles = INVITADOS.filter(invitadoPasaElFiltro);

  if (!visibles.length) {
    if (!INVITADOS.length) {
      pintarVacio(lista, 'Todavía no hay nadie confirmado',
        'Van a aparecer aquí, uno a uno, en cuanto respondan la invitación.');
    } else {
      pintarVacio(lista, 'Nada coincide',
        'Prueba con otra búsqueda o cambia el filtro.');
    }
    ponerTitulo('Gente');
    return;
  }

  // El subtítulo dice cuántas personas suman los que se están viendo, no
  // cuántas filas hay: una confirmación puede traer cinco personas.
  const personas = visibles.reduce((suma, fila) => {
    if (Number(fila.asiste) !== 1) return suma;
    return suma + (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);
  }, 0);

  ponerTituloDeInvitados(visibles.length, personas);

  lista.innerHTML = visibles.map(filaDeInvitado).join('');

  buscarTodos('[data-invitado]', lista).forEach(boton => {
    boton.addEventListener('click', () => {
      const id = Number(boton.dataset.invitado);
      if (SELECCION_ACTIVA) {
        alternarSeleccion(id);
      } else {
        abrirDetalleDeInvitado(id);
      }
    });
  });
}

/**
 * Prende o apaga una confirmación en la selección múltiple.
 *
 * @param {number} id
 * @returns {void}
 */
function alternarSeleccion(id) {
  if (SELECCIONADOS.has(id)) {
    SELECCIONADOS.delete(id);
  } else {
    SELECCIONADOS.add(id);
  }
  pintarListaDeInvitados();
  actualizarBarraSeleccion();
}

/**
 * Muestra u oculta la barra flotante según haya algo seleccionado, y
 * actualiza el contador.
 *
 * @returns {void}
 */
function actualizarBarraSeleccion() {
  const barra = buscar('#barra-seleccion');
  if (!barra) return;

  const cuantos = SELECCIONADOS.size;
  barra.classList.toggle('oculto', !SELECCION_ACTIVA || cuantos === 0);

  const texto = buscar('#seleccion-cuantos', barra);
  if (texto) texto.textContent = pluralizar(cuantos, 'seleccionado', 'seleccionados');
}

/**
 * Olvida el modo selección al dejar la pantalla de Gente.
 *
 * ⚠️ POR QUÉ HACE FALTA (2026-09-04)
 * SELECCION_ACTIVA y SELECCIONADOS viven en este archivo y no se
 * reiniciaban nunca. Marcar cinco personas, irse a Dinero y volver
 * dejaba la lista en modo selección CON esas cinco marcadas — pero el
 * botón se repinta con su texto por omisión, "Seleccionar", así que
 * tocarlo APAGABA el modo en vez de encenderlo. Y si alguna de esas
 * cinco se borró mientras tanto, la asignación en lote salía igual
 * sobre ids que ya no existen.
 *
 * POR QUÉ ACÁ Y NO EN dibujarGente()
 * Porque dibujarGente() también corre al REFRESCAR: al editar a alguien,
 * al ejecutar una sugerencia del asistente, y cada 60-120 s por el
 * refresco periódico. Limpiar ahí borraría una selección a medio armar
 * sin que nadie la haya tocado. Lo llama irA() (05-navegacion.js), que
 * es el único lugar por donde se cambia de vista.
 *
 * @returns {void}
 */
function olvidarSeleccionDeGente() {
  SELECCION_ACTIVA = false;
  SELECCIONADOS.clear();
}

/**
 * Sale del modo selección y limpia lo marcado.
 *
 * @returns {void}
 */
function salirDeSeleccion() {
  SELECCION_ACTIVA = false;
  SELECCIONADOS.clear();

  const boton = buscar('#inv-seleccionar');
  if (boton) boton.textContent = 'Seleccionar';

  pintarListaDeInvitados();
  actualizarBarraSeleccion();
}

/**
 * ¿Esta persona YA contestó la invitación?
 *
 * ⚡ DEFINICIÓN ÚNICA (2026-09-02). Antes "sin responder" se calculaba en
 * dos lugares distintos y sobre poblaciones distintas, y por eso se
 * contradecían en pantalla:
 *   · La lista miraba solo `invitacion_estado`, y salía temprano si ese
 *     dato faltaba — así que las filas importadas (que no tienen
 *     invitación todavía, o sea la mayoría de la lista real) pasaban
 *     SIEMPRE el filtro: tocar "Sin responder" dejaba la lista igual a
 *     "Todos".
 *   · El contador de arriba contaba solo sobre la tabla de invitaciones,
 *     así que esas mismas filas no existían para él y podía decir 0.
 *
 * Contestó = su invitación quedó confirmada o declinada, o tiene fecha de
 * respuesta cargada. Todo lo demás —incluido "no tiene invitación
 * todavía"— es alguien que falta, que es justo lo que hay que resolver.
 *
 * @param {Object} fila
 * @returns {boolean}
 */
function yaRespondio(fila) {
  if (fila.invitacion_respondida_en) return true;
  return fila.invitacion_estado === 'confirmada' ||
         fila.invitacion_estado === 'declinada';
}

/**
 * Dice si una confirmación pasa el filtro y la búsqueda actuales.
 *
 * @param {Object} fila
 * @returns {boolean}
 */
function invitadoPasaElFiltro(fila) {
  // Filtro.
  if (FILTRO_INVITADOS === 'asisten'    && Number(fila.asiste) !== 1) return false;
  if (FILTRO_INVITADOS === 'no_asisten' && Number(fila.asiste) !== 0) return false;

  if (FILTRO_INVITADOS === 'alergias') {
    const alergias = paraBuscar(fila.alergias || '');
    const nada = ['', 'ninguna', 'ninguno', 'no', 'n/a', '-'];
    if (nada.includes(alergias)) return false;
  }

  if (FILTRO_INVITADOS === 'sin_mesa' && fila.mesa) return false;


  // ⚡ (2026-08-28) Estos tres vienen de la extinta pestaña Envíos.
  // invitacion_estado es NULL cuando la confirmación todavía no tiene
  // link (formulario abierto viejo, o recién creada sin generar_link) —
  // se la trata como "sin enviar" a propósito: es justo lo que hace
  // falta resolver, no algo para esconder del filtro.
  if (FILTRO_INVITADOS === 'sin_enviar' &&
      fila.invitacion_estado && fila.invitacion_estado !== 'sin_enviar') return false;
  if (FILTRO_INVITADOS === 'sin_responder' && yaRespondio(fila)) return false;
  if (FILTRO_INVITADOS === 'sin_telefono' && fila.invitacion_telefono) return false;

  // Búsqueda.
  if (!BUSQUEDA_INVITADOS.trim()) return true;

  const aguja = paraBuscar(BUSQUEDA_INVITADOS);
  const pajar = paraBuscar(
    [fila.nombre, fila.correo, fila.codigo, fila.notas].join(' ')
  );

  return pajar.includes(aguja);
}

/**
 * El HTML de una fila de la lista.
 *
 * @param {Object} fila
 * @returns {string}
 */
/* Nombres CORTOS de estado para la lista de Gente. El largo
   (TEXTO_DE_ESTADO_INV, en 48-invitaciones.js) se sigue usando en la ficha
   y en el `title`; acá hace falta algo que entre al lado del punto de
   color sin romper la fila en un teléfono. */
const TEXTO_CORTO_DE_ESTADO_INV = {
  sin_enviar: 'Sin enviar',
  enviada:    'Sin responder',
  confirmada: 'Confirmada',
  declinada:  'No viene',
};

function filaDeInvitado(fila) {
  const asiste = Number(fila.asiste) === 1;
  const gente  = (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);

  const alergiaBuscada = paraBuscar(fila.alergias || '');
  const nada = ['', 'ninguna', 'ninguno', 'no', 'n/a', '-'];
  const tieneAlergia = asiste && !nada.includes(alergiaBuscada);

  const pie = [];
  if (asiste && gente)  pie.push(pluralizar(gente, 'persona', 'personas'));
  if (asiste && fila.mesa) pie.push(fila.mesa);
  if (!asiste && fila.correo) pie.push(fila.correo);
  // ⚡ (2026-08-28) Visible sin tener que abrir la ficha: si todavía no
  // tiene link, no hay forma de mandarle la invitación.
  if (!fila.invitacion_id) pie.push('Sin link');

  const marcado = SELECCIONADOS.has(Number(fila.id));

  /* ⚡ (2026-08-30) Punto de color + cuántas veces se mandó, a pedido
     explícito: gris sin enviar, azul enviada (sin responder todavía),
     verde confirmada, rojo declinada — mismos colores que ya usa el
     punto de "asiste" a la izquierda, reutilizados por semántica
     (verde/rojo significan lo mismo ahí y acá). El número de al lado
     es "veces que se tocó Mandar", no "veces que llegó de verdad" —
     WhatsApp no avisa si el mensaje se mandó de verdad (mismo límite
     que ya tiene envios_proveedor, documentado en migracion.sql). */
  const puntoEnvio = fila.invitacion_id
    ? '<span class="punto-envio" title="' +
        seguro((TEXTO_DE_ESTADO_INV[fila.invitacion_estado] || fila.invitacion_estado) +
               ' · mandado ' + pluralizar(Number(fila.invitacion_veces_enviado) || 0, 'vez', 'veces')) + '">' +
        '<span class="punto ' +
          (fila.invitacion_estado === 'confirmada' ? 'punto--si'
            : fila.invitacion_estado === 'declinada' ? 'punto--no'
            : fila.invitacion_estado === 'enviada' ? 'punto--enviada' : '') +
        '"></span>' +
        /* ⚡ EL ESTADO TAMBÉN SE ESCRIBE, no solo se pinta (2026-09-02).
           El color estaba solo en el punto y su significado únicamente en
           el `title`, que en un teléfono no se ve nunca: no hay dónde
           apoyar el cursor. Así que la leyenda no existía para quien usa
           la app en el celular, que es como se usa de verdad. Se escribe
           corto al lado, para no tener que acordarse de qué quiere decir
           cada color. */
        '<span class="vacio__texto" style="margin:0">' +
          seguro(TEXTO_CORTO_DE_ESTADO_INV[fila.invitacion_estado] ||
                 fila.invitacion_estado || '') +
        '</span>' +
        (Number(fila.invitacion_veces_enviado) > 0
          ? '<span class="vacio__texto" style="margin:0">×' +
              seguro(fila.invitacion_veces_enviado) + '</span>'
          : '') +
      '</span>'
    : '';

  return '' +
    '<button class="lista__fila" data-invitado="' + seguro(fila.id) + '">' +
      (SELECCION_ACTIVA
        ? '<span class="lista__casilla' + (marcado ? ' lista__casilla--marcada' : '') + '"></span>'
        : '<span class="punto punto--' + (asiste ? 'si' : 'no') + '"></span>') +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(fila.nombre || 'Sin nombre') + '</span>' +
        '<span class="lista__pie">' + seguro(pie.join(' · ')) + '</span>' +
      '</span>' +
      puntoEnvio +
      (esFilaPendiente(fila.id)
        ? '<span class="etiqueta etiqueta--tenue lista__lado">Pendiente</span>'
        : (tieneAlergia
            ? '<span class="etiqueta etiqueta--alerta lista__lado">Alergia</span>'
            : (fila.codigo && asiste && !SELECCION_ACTIVA
                ? '<span class="lista__lado codigo-pase">' + seguro(fila.codigo) + '</span>'
                : ''))) +
    '</button>';
}


/* ─── 3. DETALLE DE UNA CONFIRMACIÓN ───────────────────────────────── */

/**
 * Copia el link personal al portapapeles y avisa.
 *
 * Vive suelta acá, y no dentro del detalle, porque hacen falta dos: la del
 * link que ya existía y la del que se acaba de generar (ver el comentario
 * grande en el botón de generar). Una sola función evita que una de las dos
 * se arregle y la otra se quede vieja.
 *
 * @param {string} link - La dirección a copiar.
 * @param {HTMLElement} cuerpo - La hoja abierta, para el camino de respaldo.
 * @returns {Promise<void>}
 */
async function copiarElLinkPersonal(link, cuerpo) {
  try {
    await navigator.clipboard.writeText(link);
  } catch (error) {
    /* Sin permiso de portapapeles (o sin https): se selecciona el campo y se
       copia a la vieja usanza. */
    const campo = buscar('#link-invitacion-valor', cuerpo);
    if (campo) {
      campo.removeAttribute('readonly');
      campo.select();
      document.execCommand('copy');
      campo.setAttribute('readonly', 'readonly');
    }
  }
  avisar('Link copiado.');
}

/**
 * Abre la hoja con todos los datos de una confirmación.
 *
 * @param {number} id
 * @returns {void}
 */
function abrirDetalleDeInvitado(id) {
  const fila = INVITADOS.find(f => Number(f.id) === Number(id));
  if (!fila) return;

  registrarEvento('accion', 'abrir_ficha_invitado', { id: fila.id });
  registrarAbrirDeNuevo('invitado-' + fila.id);

  const asiste = Number(fila.asiste) === 1;
  const gente  = (Number(fila.adultos) || 0) + (Number(fila.ninos) || 0);

  // ⚡ (2026-08-28) FUSIÓN CON LA EXTINTA PESTAÑA "ENVÍOS" — ver la nota
  // grande en confirmaciones.php?accion=listar. Todo lo que antes vivía
  // solo en `invitaciones` (grupo, teléfono, link, estado del envío)
  // ahora viaja embebido en la misma fila; nada de esto pide otro viaje
  // al servidor.
  const tieneInvitacion = !!fila.invitacion_id;

  /* ⚡ EL ORDEN DE ESTOS RENGLONES ES UNA DECISIÓN, NO EL AZAR DE CÓMO SE
     FUE ESCRIBIENDO (2026-09-03).

     Antes la Mesa era el ÚLTIMO de trece renglones —después de correo,
     teléfono, grupo, estado del envío, menús, notas y código— y la alergia
     el décimo. Las dos cosas que se preguntan de pie, en la puerta, con
     alguien esperando enfrente, estaban al fondo de un modal que hay que
     scrollear.

     Ahora manda quién pregunta y cuándo:
       · Arriba, lo del día de la fiesta: si viene, dónde se sienta, qué no
         puede comer, cuántos son.
       · Abajo, lo de la gestión: correo, teléfono, grupo, envío, notas,
         código. Eso se mira sentada en casa, con tiempo. */
  const renglones = [
    ['Asistencia', asiste
      ? '<span class="etiqueta etiqueta--bien">Confirmó</span>'
      : '<span class="etiqueta etiqueta--alerta">No viene</span>', true],
  ];

  if (asiste) {
    renglones.push(['Mesa', fila.mesa
      ? '<span class="etiqueta etiqueta--bien">' + seguro(fila.mesa) + '</span>'
      : '<span class="etiqueta etiqueta--alerta">Sin asignar</span>', true]);
  }

  renglones.push(
    ['Alergias', fila.alergias && !/^(ninguna|ninguno|no|-)$/i.test(fila.alergias)
                 ? '<span class="etiqueta etiqueta--ojo">⚠ ' +
                   seguro(fila.alergias) + '</span>'
                 : 'Ninguna', true],
    ['Personas', asiste
                 ? seguro(gente + ' (' +
                     pluralizar(fila.adultos || 0, 'adulto', 'adultos') + ', ' +
                     pluralizar(fila.ninos || 0, 'niño', 'niños') + ')')
                 : '—'],
    ['Menús',    seguro(fila.resumen_menus || '—')],
    ['Detalle',  seguro(fila.menus || '—')],
    ['Correo',   seguro(fila.correo || '—')]
  );

  if (tieneInvitacion) {
    const vecesEnviado = Number(fila.invitacion_veces_enviado) || 0;
    renglones.push(
      ['Teléfono', seguro(fila.invitacion_telefono || '—')],
      ['Grupo',    seguro(fila.invitacion_grupo_nombre || '—')],
      ['Envío',    (ETIQUETA_DE_ESTADO_INV[fila.invitacion_estado] ||
                    seguro(fila.invitacion_estado || '—')) +
                   (vecesEnviado > 0
                     ? ' <span class="vacio__texto" style="margin:0">· mandado ' +
                       seguro(pluralizar(vecesEnviado, 'vez', 'veces')) + '</span>'
                     : ''), true]
    );
  }

  renglones.push(
    ['Notas',    seguro(fila.notas || '—')],
    ['Código',   fila.codigo
                 ? '<span class="codigo-pase">' + seguro(fila.codigo) + '</span>'
                 : '—', true]
  );

  const detalle = renglones.map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + r[1] + '</span>'
  ).join('');

  // El link + WhatsApp + copiar, o el botón para crearlo si esta
  // confirmación es de antes de este modelo (formulario abierto, sin
  // token) y todavía no tiene ninguno.
  const bloqueLink = tieneInvitacion
    ? '<div class="campo" style="margin-top:var(--esp-3)">' +
        '<span class="campo__rotulo">Link personal</span>' +
        '<input type="text" id="link-invitacion-valor" class="campo__control" ' +
               'value="' + seguro(fila.invitacion_link || '') + '" readonly>' +
      '</div>' +
      '<div class="acciones" style="flex-wrap:wrap">' +
        (sirveParaWhatsApp(fila.invitacion_telefono)
          ? '<button class="boton boton--principal" id="inv-whatsapp">Mandar por WhatsApp</button>'
          : '') +
        /* ⚡ EL CORREO VUELVE (2026-09-03). El endpoint
           invitaciones.php?accion=enviar_correo existía y funcionaba, y
           no tenía UN SOLO BOTÓN en toda la app: quedó dentro de
           dibujarInvitaciones(), que es código inalcanzable desde que la
           sección se fusionó con Gente. Mandar una invitación por correo
           era, de hecho, imposible. */
        (fila.invitacion_correo
          ? '<button class="boton" id="inv-mandar-correo">Mandar por correo</button>'
          : '') +
        '<button class="boton" id="copiar-link-invitacion">Copiar link</button>' +
      '</div>' +

      /* ⚡ POR QUÉ FALTA EL BOTÓN DE WHATSAPP (2026-09-03)
         Antes, cuando el número no servía, el botón simplemente no
         estaba y el único mensaje era "Sin teléfono ni correo
         cargados" — que es falso si el teléfono SÍ está y lo que le
         falta es la clave de país. Un botón que no aparece sin decir
         por qué se lee como que la app está rota.

         Y hay una segunda trampa, la que más confunde: el teléfono que
         cuenta acá es el de la INVITACIÓN, no el de la ficha de la
         persona ni el de Contactos. Son campos distintos, y tener uno
         cargado no llena el otro. Se dice dónde se carga. */
      avisoDePorQueNoHayWhatsApp(fila)
    : '<button type="button" class="boton boton--ancho" style="margin-top:var(--esp-3)" ' +
              'id="generar-link-invitado">Generar link personal</button>';

  /* ⚡ EL ORDEN DE LOS BOTONES SIGUE AL DE LOS DATOS (2026-09-03).
     "Editar" estaba al final de todo: después de trece renglones de detalle,
     del bloque del link, de los botones de mesa, de la lista de acompañantes
     con sus propios botones y de las etiquetas. Editar a alguien costaba
     cinco toques y un scroll largo dentro del modal.

     Ahora, de arriba abajo: primero lo del día de la fiesta (llegada y
     mesa), después editar, y al fondo la gestión (link, acompañantes,
     etiquetas). "Borrar" se queda solo, hasta abajo del todo, lejos del
     pulgar y lejos de "Editar": son dos botones que nunca deberían estar
     uno al lado del otro. */
  const cuerpo = abrirHoja(fila.nombre || 'Confirmación',
    '<div class="detalle">' + detalle + '</div>' +
    (asiste && fila.codigo
      ? '<div class="acciones">' +
          '<button class="boton boton--ancho" id="marcar-llegada-invitado">' +
            'Marcar llegada</button>' +
        '</div>'
      : '') +
    (asiste
      ? '<div class="acciones">' +
          '<button class="boton" id="mesa-auto-invitado">Sentar solo</button>' +
          '<button class="boton boton--principal" id="mesa-elegir-invitado">' +
            (fila.mesa ? 'Cambiar mesa' : 'Elegir mesa') +
          '</button>' +
        '</div>'
      : '') +
    (INVITADOS_EDITABLES
      ? '<div class="acciones">' +
          '<button class="boton boton--ancho" id="editar-invitado">Editar</button>' +
        '</div>'
      : '') +
    bloqueLink +
    (asiste && gente ? '<div id="bloque-acompanantes"></div>' : '') +
    /* ⚡ (2026-08-30) Etiquetas del PAQUETE, siempre visibles — no solo
       cuando hay acompañantes nombrados. Es lo que permite taguear
       "Familia paterna"/"Jóvenes" a un grupo entero (la mayoría de la
       lista real no tiene ni un nombre cargado todavía), para que el
       acomodo automático tenga con qué calcular afinidad — ver
       etiquetasDeUnidad() en _lib/mesas.php. */
    '<div class="campo" style="margin-top:var(--esp-2)">' +
      '<div id="etiquetas-confirmacion"></div>' +
    '</div>' +
    /* ⚡ EL BOTÓN QUE FALTABA (2026-09-04)
       Todo lo de esta ficha se guarda SOLO en cuanto se toca: las
       etiquetas, la mesa, el nombre de cada lugar. No hay ningún cambio
       pendiente, así que técnicamente no hacía falta un "Guardar".

       Pero desde el otro lado de la pantalla eso no se ve. Se toca una
       etiqueta, cambia de color, y no pasa nada más: ni un aviso, ni un
       botón que apretar. La sensación es que el cambio quedó a medias y
       que falta confirmarlo — y sin dónde hacerlo, uno se queda con la
       duda de si se guardó.

       Este botón cierra la ficha y refresca la lista, y sobre todo dice
       en voz alta lo que ya era cierto. La otra mitad del arreglo está
       en pintarEtiquetasDe() (06-piezas.js): ahora cada etiqueta avisa
       cuando se guarda, no solo cuando falla. */
    '<p class="vacio__texto" style="margin-top:var(--esp-4);text-align:center">' +
      'Todo lo de esta ficha se guarda solo, en cuanto lo tocas.' +
    '</p>' +
    '<div class="acciones" style="margin-top:var(--esp-1)">' +
      '<button class="boton boton--principal boton--ancho" id="listo-invitado">' +
        'Listo</button>' +
    '</div>' +

    (INVITADOS_EDITABLES
      ? '<div class="acciones" style="margin-top:var(--esp-3)">' +
          '<button class="boton boton--peligro boton--ancho" id="borrar-invitado">' +
            'Borrar</button>' +
        '</div>'
      : '')
  );

  buscar('#listo-invitado', cuerpo).addEventListener('click', () => {
    cerrarHoja(true);
    // La lista de atrás puede haber quedado vieja: cambiar una etiqueta
    // o una mesa cambia lo que muestra cada renglón.
    dibujarGente();
  });

  if (asiste && gente) {
    dibujarAcompanantes(fila.id, gente, buscar('#bloque-acompanantes', cuerpo));
  }

  pintarEtiquetasDe('confirmacion', fila.id, buscar('#etiquetas-confirmacion', cuerpo));

  if (tieneInvitacion) {
    const botonWhatsapp = buscar('#inv-whatsapp', cuerpo);
    if (botonWhatsapp) {
      /* precargarLaTarjeta() y mandarInvitacionPorWhatsApp() viven en
         48-invitaciones.js (mismo scope global), igual que
         textoDeInvitacion() — mismo texto y misma imagen que manda la
         pantalla de Invitaciones. La imagen se baja acá, al abrir la
         ficha, no dentro del click. */
      precargarLaTarjeta();
      botonWhatsapp.addEventListener('click', () => {
        mandarInvitacionPorWhatsApp({
          nombre: fila.nombre,
          pases: fila.invitacion_pases,
          link: fila.invitacion_link,
          telefono: fila.invitacion_telefono,
        }).then(seMando => {
          // Si cancelaron, no se mandó nada: no se marca como enviada.
          if (!seMando) return;
          mandar('invitaciones.php?accion=marcar_enviada',
                 { id: fila.invitacion_id }).catch(() => {});
        });
      });
    }

    const botonCorreo = buscar('#inv-mandar-correo', cuerpo);
    if (botonCorreo) {
      botonCorreo.addEventListener('click', async () => {
        if (!await confirmarAccion(
          '¿Mandarle la invitación por correo a ' + fila.nombre + '?\n\n' +
          'Va a ' + fila.invitacion_correo + ', con el mismo texto que ' +
          'manda WhatsApp.',
          { confirmar: 'Mandar el correo' })) return;

        botonCorreo.disabled = true;
        botonCorreo.textContent = 'Mandando…';

        try {
          const r = await mandar('invitaciones.php?accion=enviar_correo',
                                 { ids: [fila.invitacion_id] });

          /* El endpoint contesta cuántos salieron, cuántos no tenían
             correo y cuántos fallaron. Acá es siempre uno solo, así que
             se dice qué pasó con ESE en vez de un "Listo" que no
             distingue haber mandado de no haber mandado nada. */
          if (r && r.mandados) avisar('Invitación mandada por correo.');
          else if (r && r.fallidos) avisar('No se pudo mandar el correo. Revisa la dirección.', true);
          else avisar('No tiene correo cargado.', true);

          ensuciarVistas('invitados');
          await dibujarGente();
        } catch (error) {
          avisar(error.message, true);
        } finally {
          botonCorreo.disabled = false;
          botonCorreo.textContent = 'Mandar por correo';
        }
      });
    }

    buscar('#copiar-link-invitacion', cuerpo)
      .addEventListener('click', () => copiarElLinkPersonal(fila.invitacion_link, cuerpo));
  } else {
    const botonGenerar = buscar('#generar-link-invitado', cuerpo);
    if (botonGenerar) {
      botonGenerar.addEventListener('click', async () => {
        try {
          const creado = await mandar('invitaciones.php?accion=generar_link',
                                      { confirmacion_id: fila.id });

          /* ⚡ LA HOJA YA NO SE CIERRA AL GENERAR EL LINK (2026-09-03).
             Acá había `cerrarHoja(true)` + `dibujarGente()`: el link se creaba
             y la ficha desaparecía en el mismo movimiento, así que para
             copiarlo había que volver a escribir el nombre en el buscador,
             abrir la ficha otra vez y recién entonces copiar. Medido: siete
             toques para una tarea de tres, y los tres de más caían justo
             después de la acción, que es cuando uno cree que ya terminó.

             Ahora el botón se convierte en el link con su botón de copiar, en
             el sitio, sin perder el contexto. La lista se marca sucia y se
             redibuja sola la próxima vez que se entre a Gente. */
          fila.invitacion_id = creado.id;
          fila.invitacion_link = creado.link;

          botonGenerar.outerHTML =
            '<div class="campo" style="margin-top:var(--esp-3)">' +
              '<span class="campo__rotulo">Link personal</span>' +
              '<input type="text" id="link-invitacion-valor" class="campo__control" ' +
                     'value="' + seguro(creado.link) + '" readonly>' +
            '</div>' +
            '<div class="acciones" style="flex-wrap:wrap">' +
              '<button class="boton boton--principal" id="copiar-link-invitacion">' +
                'Copiar link</button>' +
            '</div>';

          buscar('#copiar-link-invitacion', cuerpo)
            .addEventListener('click', () => copiarElLinkPersonal(creado.link, cuerpo));

          avisar('Link listo. Ya lo puedes copiar.');
          ensuciarVistas('invitados', 'resumen');
        } catch (error) {
          avisar(error.message, true);
        }
      });
    }
  }

  if (asiste) {
    const refrescar = () => { dibujarGente(); ensuciarVistas('resumen', 'evento'); };

    buscar('#mesa-auto-invitado', cuerpo).addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=sentar_auto', { confirmacion_id: fila.id });
        cerrarHoja(true);
        avisar(r.mensaje);
        refrescar();
      } catch (error) {
        avisar(error.message, true);
      }
    });

    buscar('#mesa-elegir-invitado', cuerpo).addEventListener('click', async () => {
      try {
        if (!MESAS) MESAS = await traer('mesas.php?accion=todo');
        if (!MESAS.mesas.length) {
          avisar('Todavía no has armado ninguna mesa. Ve a Gente → Mesas.', true);
          return;
        }
        elegirMesaPara(fila.id, refrescar);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }

  const botonLlegada = buscar('#marcar-llegada-invitado', cuerpo);
  if (botonLlegada) {
    botonLlegada.addEventListener('click', async () => {
      try {
        const r = await mandar('llegadas.php?accion=marcar', { codigo: fila.codigo });
        registrarEvento('accion', 'marcar_llegada', { id: fila.id, en_lote: false });
        cerrarHoja(true);
        avisar(r.mensaje || 'Llegada marcada.');
        ensuciarVistas('hoy', 'resumen');
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }

  if (!INVITADOS_EDITABLES) return;

  buscar('#editar-invitado', cuerpo).addEventListener('click', async () => {
    // ⚡ (2026-08-28) Con link, se edita por el camino nuevo (nombre del
    // grupo, teléfono, correo, grupo para sentar juntos, y las personas
    // con nombre — con sus etiquetas) para no tener dos formularios que
    // hacen casi lo mismo. Sin link (confirmación vieja, formulario
    // abierto), se sigue usando el formulario simple de siempre.
    if (!tieneInvitacion) { abrirFormularioDeInvitado(fila); return; }

    let personas = [];
    try {
      const r = await traer('acompanantes.php?accion=listar&confirmacion_id=' + fila.id);
      personas = (r.filas || []).map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }));
    } catch (error) { /* se edita igual, sin la lista de nombres precargada */ }

    abrirFormularioDeInvitacion({
      id: fila.invitacion_id,
      nombre: fila.nombre,
      telefono: fila.invitacion_telefono,
      /* ⚡ EL CORREO DE LA INVITACIÓN, NO EL DE LA CONFIRMACIÓN
         (2026-09-03). Acá se precargaba `fila.correo`, que es el correo
         que dejó la persona AL CONFIRMAR — otro campo, otra tabla. Este
         formulario guarda sobre `invitaciones.correo`, así que abrir
         "Editar" y guardar sin tocar nada pisaba el correo al que se
         manda la invitación con el que dejó al contestar. Cuando eran
         distintos, el de la invitación se perdía sin que nadie lo
         hubiera cambiado a propósito. */
      correo: fila.invitacion_correo,
      grupo_id: fila.invitacion_grupo_id,
      pases: fila.invitacion_pases,
      personas: personas,
    });
  });

  buscar('#borrar-invitado', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion(
      '¿Borrar la confirmación de ' + (fila.nombre || 'esta persona') + '?\n\n' +
      'No se puede deshacer.'
    )) return;

    try {
      await mandar('confirmaciones.php?accion=borrar', { id: fila.id });
      cerrarHoja(true);
      avisar('Confirmación eliminada.');
      ensuciarVistas('resumen');
      dibujarGente();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/**
 * Abre un selector de mesa y la asigna a todas las confirmaciones
 * marcadas en modo selección. No reusa elegirMesaPara() porque esa
 * está armada para una sola persona a la vez — acá se elige la mesa
 * una vez y se aplica en lote.
 *
 * @returns {Promise<void>}
 */
async function asignarMesaEnLote() {
  if (!SELECCIONADOS.size) return;

  try {
    if (!MESAS) MESAS = await traer('mesas.php?accion=todo');
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  if (!MESAS.mesas.length) {
    avisar('Todavía no has armado ninguna mesa. Ve a Gente → Mesas.', true);
    return;
  }

  const ids     = Array.from(SELECCIONADOS);
  const cuantos = ids.length;

  const cuerpo = abrirHoja('Asignar mesa a ' + pluralizar(cuantos, 'persona', 'personas'),
    MESAS.mesas.map(mesa =>
      '<button class="lista__fila" data-mesa="' + seguro(mesa.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(mesa.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(mesa.ocupados + ' de ' + mesa.capacidad) + '</span>' +
        '</span>' +
      '</button>'
    ).join('')
  );

  buscarTodos('[data-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const mesaId = Number(boton.dataset.mesa);
      cerrarHoja(true);

      let listas = 0;
      for (const id of ids) {
        try {
          await mandar('mesas.php?accion=sentar', { confirmacion_id: id, mesa_id: mesaId });
          listas++;
        } catch (error) {
          // Un rechazo (mesa llena, por ejemplo) no debe frenar al resto.
        }
      }

      if (listas) registrarEvento('accion', 'asignar_mesa', { desde: 'lote', cuantos: listas });

      avisar(
        listas === cuantos
          ? 'Se asignó mesa a ' + pluralizar(listas, 'persona', 'personas') + '.'
          : 'Se asignó a ' + listas + ' de ' + cuantos + '. Revisa los que quedaron fuera.',
        listas !== cuantos
      );

      MESAS = null;
      ensuciarVistas('resumen', 'evento');
      salirDeSeleccion();
      dibujarGente();
    });
  });
}

/**
 * Marca la llegada de todas las confirmaciones marcadas en modo
 * selección que tengan código de pase.
 *
 * @returns {Promise<void>}
 */
async function marcarLlegadaEnLote() {
  if (!SELECCIONADOS.size) return;

  const ids      = Array.from(SELECCIONADOS);
  const filas    = ids.map(id => INVITADOS.find(f => Number(f.id) === id)).filter(Boolean);
  const conCodigo = filas.filter(f => f.codigo);

  if (!conCodigo.length) {
    avisar('Ninguno de los seleccionados tiene pase para marcar llegada.', true);
    return;
  }

  /* ⚡ SIN PREGUNTAR (2026-09-03). Acá había un confirm() del navegador, y
     era el único de los 36 del panel que no protegía nada: marcar una
     llegada no borra ni pisa nada, se puede volver a marcar, y el propio
     escáner ya avisa cuando un pase se lee dos veces.

     Lo que sí costaba era el momento: esto se usa en la puerta, con gente
     esperando, y en Chrome de Android el diálogo del sistema aparece
     anunciado como "aniaxv.com dice:" — rompe la ilusión de app justo en el
     minuto en que la app tiene que desaparecer detrás de la tarea. Los
     confirm() de los borrados se quedan donde están: ahí el freno es el
     punto. */

  let listas = 0;
  for (const fila of conCodigo) {
    try {
      await mandar('llegadas.php?accion=marcar', { codigo: fila.codigo });
      listas++;
    } catch (error) {
      // Un pase ya marcado no debe frenar al resto.
    }
  }

  if (listas) registrarEvento('accion', 'marcar_llegada', { cuantos: listas, en_lote: true });

  const saltados = filas.length - conCodigo.length;
  avisar(
    'Se marcó llegada de ' + pluralizar(listas, 'persona', 'personas') + '.' +
    (saltados ? ' ' + saltados + ' sin pase, se saltaron.' : '')
  );

  ensuciarVistas('hoy', 'resumen');
  salirDeSeleccion();
  dibujarGente();
}


/**
 * Abre una lista para mandarle el recordatorio, uno por uno, a todos los
 * seleccionados — sin tener que volver a buscar a nadie entre medio.
 *
 * ⚡ POR QUÉ ESTO NO MANDA TODO DE UNA SOLA VEZ.
 * WhatsApp abre UN chat por vez: no existe forma desde una web de mandarle
 * el mismo mensaje a veinte personas de un tirón, y prometerlo sería mentir.
 * Lo que sí se puede arreglar es el verdadero costo, que no era mandar el
 * mensaje sino ENCONTRAR a la persona siguiente: hasta ahora, insistirle a
 * quien no respondió era escribir el nombre en el buscador, tocar la fila,
 * bajar dentro de la ficha, tocar WhatsApp, volver, y repetir el recorrido
 * entero por cada uno. Cinco toques por persona, veinte personas.
 *
 * Con esta lista el recorrido se hace una sola vez: se filtra por "Sin
 * responder", se seleccionan todos, y desde acá cada persona es UN toque.
 * Los que ya se mandaron quedan marcados, para saber por dónde iba una si
 * la interrumpen — que con veinte mensajes es seguro que pasa.
 *
 * @returns {Promise<void>}
 */
async function recordarEnLote() {
  if (!SELECCIONADOS.size) return;

  const filas = Array.from(SELECCIONADOS)
    .map(id => INVITADOS.find(f => Number(f.id) === id))
    .filter(Boolean);

  const conWhatsApp = filas.filter(f =>
    f.invitacion_link && sirveParaWhatsApp(f.invitacion_telefono));

  if (!conWhatsApp.length) {
    avisar('Ninguno de los seleccionados tiene link y teléfono para WhatsApp.', true);
    return;
  }

  const sinTelefono = filas.length - conWhatsApp.length;

  const cuerpo = abrirHoja('Mandar recordatorio',
    '<p class="vacio__texto" style="margin-top:0">' +
      'Toca a cada quien para abrir su chat. Los que ya mandaste quedan ' +
      'marcados.' +
      (sinTelefono
        ? ' ' + pluralizar(sinTelefono, 'persona', 'personas') +
          ' sin teléfono o sin link: no aparecen acá.'
        : '') +
    '</p>' +
    '<div id="lista-recordatorios"></div>');

  const lista = buscar('#lista-recordatorios', cuerpo);
  lista.innerHTML = conWhatsApp.map(f =>
    '<button class="lista__fila" data-recordar="' + f.id + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(f.nombre) + '</span>' +
        '<span class="lista__pie">' + seguro(f.invitacion_telefono) + '</span>' +
      '</span>' +
      '<span class="lista__lado" data-marca="' + f.id + '"></span>' +
    '</button>'
  ).join('');

  // La tarjeta, una sola vez para toda la lista. Ver 48-invitaciones.js.
  precargarLaTarjeta();

  buscarTodos('[data-recordar]', lista).forEach(boton => {
    boton.addEventListener('click', () => {
      const fila = conWhatsApp.find(f => Number(f.id) === Number(boton.dataset.recordar));
      if (!fila) return;

      mandarInvitacionPorWhatsApp({
        nombre: fila.nombre,
        pases: fila.invitacion_pases,
        link: fila.invitacion_link,
        telefono: fila.invitacion_telefono,
      }).then(seMando => {
        // La palomita miente si la persona canceló la hoja de compartir.
        if (!seMando) return;

        mandar('invitaciones.php?accion=marcar_enviada',
               { id: fila.invitacion_id }).catch(() => {});

        const marca = buscar('[data-marca="' + fila.id + '"]', lista);
        if (marca) marca.textContent = '✓';
        boton.style.opacity = '.5';
      });
    });
  });

  registrarEvento('accion', 'recordar_en_lote', { cuantos: conWhatsApp.length });
  ensuciarVistas('invitados');
}


/* ─── 4. EDITAR Y DAR DE ALTA ──────────────────────────────────────── */

/**
 * Abre el formulario de edición o de alta.
 *
 * @param {Object} [fila] - Si viene, se edita. Si no, se da de alta.
 * @returns {void}
 */
function abrirFormularioDeInvitado(fila) {
  const esNuevo = !fila;
  const datos   = fila || {};

  const cuerpo = abrirHoja(esNuevo ? 'Agregar invitado' : 'Editar',
    campoTexto({ id: 'inv-nombre', rotulo: 'Nombre', valor: datos.nombre }) +
    campoTexto({ id: 'inv-correo', rotulo: 'Correo', valor: datos.correo, tipo: 'email' }) +

    campoLista({
      id: 'inv-asiste', rotulo: 'Asistencia',
      valor: Number(datos.asiste) === 1 ? '1' : '0',
      opciones: [
        { valor: '1', texto: 'Confirmó' },
        { valor: '0', texto: 'No viene' },
      ],
    }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'inv-adultos', rotulo: 'Adultos',
                   valor: datos.adultos || 0, tipo: 'number' }) +
      campoTexto({ id: 'inv-ninos', rotulo: 'Niños',
                   valor: datos.ninos || 0, tipo: 'number' }) +
    '</div>' +

    campoTexto({ id: 'inv-menus', rotulo: 'Resumen de menús',
                 valor: datos.resumen_menus,
                 pista: 'Por ejemplo: 2 pollo, 1 vegetariano' }) +
    campoTexto({ id: 'inv-alergias', rotulo: 'Alergias', valor: datos.alergias }) +
    campoLargo({ id: 'inv-notas', rotulo: 'Notas', valor: datos.notas }) +
    campoTexto({ id: 'inv-codigo', rotulo: 'Código de pase', valor: datos.codigo }) +

    pieDeFormulario(esNuevo ? 'Agregar' : 'Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('inv-nombre', cuerpo);
    if (!nombre) { avisar('El nombre no puede quedar vacío.', true); return; }

    const carga = {
      nombre:        nombre,
      correo:        valorDe('inv-correo', cuerpo),
      asiste:        valorDe('inv-asiste', cuerpo) === '1',
      adultos:       Number(valorDe('inv-adultos', cuerpo)) || 0,
      ninos:         Number(valorDe('inv-ninos', cuerpo)) || 0,
      resumen_menus: valorDe('inv-menus', cuerpo),
      alergias:      valorDe('inv-alergias', cuerpo),
      notas:         valorDe('inv-notas', cuerpo),
      codigo:        valorDe('inv-codigo', cuerpo),
    };

    if (!esNuevo) carga.id = datos.id;

    /* Editar un invitado que ya existe puede aplicarse de una: ya hay
       una fila en INVITADOS para mutar y repintar al instante (A1, ver
       36-optimista.js). Agregar uno nuevo no tiene id todavía, así que
       ese camino sigue esperando la respuesta del servidor como antes. */
    if (esNuevo) {
      try {
        const r = await mandar('confirmaciones.php?accion=crear', carga);
        cerrarHoja(true);
        avisar('Invitado agregado.');
        // ⚡ (2026-08-30) Cupo sustractivo: aviso, no bloqueo.
        if (r && r.se_excede) avisar(r.aviso, true);
        ensuciarVistas('resumen');
        dibujarGente();
      } catch (error) {
        avisar(error.message, true);
      }
      return;
    }

    cerrarHoja(true);
    try {
      const resultado = await aplicarOptimista(
        'confirmaciones.php?accion=editar', carga,
        {
          idFila: datos.id,
          mutar: () => {
            const i = INVITADOS.findIndex(f => Number(f.id) === Number(datos.id));
            if (i !== -1) Object.assign(INVITADOS[i], carga);
          },
          repintar: pintarListaDeInvitados,
        }
      );
      avisar(resultado.offline
        ? 'Sin conexión: se guardó y se va a mandar solo.'
        : 'Cambios guardados.');
      ensuciarVistas('resumen');
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/**
 * Explica por qué no está el botón de "Mandar por WhatsApp", si no está.
 *
 * LAS TRES SITUACIONES, QUE SE VEÍAN TODAS IGUAL
 *   1. No hay teléfono cargado en la invitación → se dice dónde se carga.
 *   2. Hay teléfono, pero no sirve para WhatsApp (le falta la clave de
 *      país) → se dice qué le falta, con el número a la vista para que
 *      se note. Este es el caso que más desconcierta: el número ESTÁ,
 *      se ve en la ficha, y el botón no aparece.
 *   3. Está todo bien → no se dice nada.
 *
 * @param {Object} fila
 * @returns {string} HTML, o '' si el botón sí se pintó.
 */
function avisoDePorQueNoHayWhatsApp(fila) {
  if (sirveParaWhatsApp(fila.invitacion_telefono)) return '';

  const tieneAlgo = String(fila.invitacion_telefono || '').trim() !== '';

  const porque = tieneAlgo
    ? 'El teléfono cargado (<strong>' + seguro(fila.invitacion_telefono) + '</strong>) ' +
      'no sirve para WhatsApp: le falta la clave de país. Un número ' +
      'mexicano de 10 dígitos se completa solo; si es de otro país, ' +
      'escríbelo con su clave (por ejemplo +54…).'
    : 'Esta invitación no tiene teléfono cargado.';

  /* El "dónde" es la mitad útil del aviso: el teléfono de la invitación
     es un campo aparte del de la ficha de la persona y del de
     Contactos, y no es evidente que sean tres cosas distintas. */
  return '<p class="aviso-error" style="margin-top:var(--esp-1)">' +
    porque + '<br>Se carga en <strong>Editar</strong>, en el campo ' +
    '«Teléfono (para WhatsApp)».' +
    (fila.invitacion_correo
      ? ''
      : ' Mientras tanto, puedes copiar el link y mandárselo por donde lo tengas.') +
  '</p>';
}


/* ─── 5. LOS NOMBRES DE CADA ACOMPAÑANTE ───────────────────────────── */

/**
 * Pide y pinta la lista de acompañantes nombrados de una confirmación.
 *
 * El número de la confirmación (adultos + niños) sigue mandando: acá
 * solo se puede nombrar hasta llegar a esa cantidad, nunca de más.
 *
 * @param {number} confirmacionId
 * @param {number} cupo - Cuántas personas declaró la confirmación.
 * @param {Element} contenedor
 * @returns {Promise<void>}
 */
async function dibujarAcompanantes(confirmacionId, cupo, contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="esqueleto"></div>';

  let filas;
  try {
    const r = await traer('acompanantes.php?accion=listar&confirmacion_id=' + confirmacionId);
    filas = r.filas || [];
  } catch (error) {
    contenedor.innerHTML = '';
    return; // No es crítico: la confirmación se puede ver igual sin esto.
  }

  pintarAcompanantes(confirmacionId, cupo, filas, contenedor);
}

/**
 * ⚡ "EDITAR" Y "QUITAR" NO DECÍAN QUÉ HACÍAN (2026-09-03)
 *
 * Los dos botones se llamaban igual que los de borrar un gasto o un
 * proveedor, y en esta pantalla significan algo completamente distinto.
 * La pregunta que llegó, textual: "¿editar el nombre? ¿quitar a ese
 * invitado? ¿resetear su información? ¿puedo quitarlo de la lista?".
 * Si quien construyó la app duda, Lucila también.
 *
 * LO QUE HAY QUE ENTENDER, Y QUE LA PANTALLA NO DECÍA
 * El CUPO y los NOMBRES son dos cosas separadas:
 *   · El cupo son los lugares que tiene la familia. Sale de lo que
 *     contestaron al confirmar, y solo se cambia editando la invitación.
 *   · Los nombres son quiénes ocupan esos lugares. Se pueden llenar,
 *     corregir y vaciar sin que el cupo se mueva ni un poco.
 *
 * "Adulto 2" no es una persona: es un lugar reservado todavía sin
 * nombre. Por eso "Quitar" no saca a nadie del evento — deja ese lugar
 * sin nombre, que es exactamente el "resetear" que se estaba buscando.
 *
 * Ahora los botones se llaman por lo que hacen ("Cambiar nombre",
 * "Dejar sin nombre"), hay una línea que explica la diferencia, y la
 * confirmación dice qué pasa con el lugar.
 *
 * @param {number} confirmacionId
 * @param {number} cupo
 * @param {Object[]} filas
 * @param {Element} contenedor
 * @returns {void}
 */
function pintarAcompanantes(confirmacionId, cupo, filas, contenedor) {
  const puedeAgregarMas = filas.length < cupo;
  const sinNombre = Math.max(0, cupo - filas.length);

  contenedor.innerHTML =
    '<p class="detalle__rotulo" style="margin-top:var(--esp-2)">' +
      'Quién ocupa cada lugar (' + filas.length + ' de ' + cupo + ')' +
    '</p>' +

    /* La explicación va acá arriba y no en un tooltip: es la idea que
       ordena toda la sección, y un tooltip es algo que hay que descubrir
       antes de poder leerlo. Dos renglones, una sola vez. */
    '<p class="vacio__texto" style="margin:2px 0 var(--esp-1)">' +
      'Esta familia tiene <strong>' + cupo + '</strong> ' +
      (cupo === 1 ? 'lugar reservado' : 'lugares reservados') + '. Aquí pones ' +
      'el nombre de quién ocupa cada uno' +
      (sinNombre > 0
        ? ' — ' + (sinNombre === 1 ? 'falta 1' : 'faltan ' + sinNombre) + '.'
        : '.') +
      '<br>Cambiar los nombres no cambia cuántos lugares tienen: eso se ' +
      'edita en la invitación.' +
    '</p>' +

    (filas.length
      ? filas.map(a =>
          '<div class="fila-adjunto" style="padding:var(--esp-1) 0;' +
               'border-top:1px solid var(--borde)">' +
            '<div style="display:flex;align-items:center;justify-content:space-between">' +
              '<span>' + seguro(a.nombre) +
                (a.alergias ? ' <span style="color:var(--texto-tenue);font-size:.85em">· ' +
                  seguro(a.alergias) + '</span>' : '') +
              '</span>' +
              '<span style="display:flex;gap:6px;flex-shrink:0">' +
                /* Los rótulos dicen la acción, no la categoría. "Editar"
                   y "Quitar" podían leerse como "editar al invitado" y
                   "sacarlo del evento", que es lo que NO hacen. */
                '<button class="boton boton--chico" data-editar-acomp="' + a.id + '" ' +
                        'title="Corregir cómo se escribe su nombre">Cambiar nombre</button>' +
                '<button class="boton boton--chico" data-quitar-acomp="' + a.id + '" ' +
                        'title="El lugar sigue reservado, pero queda sin nombre">' +
                  'Dejar sin nombre</button>' +
              '</span>' +
            '</div>' +
            /* ⚡ (2026-08-28) A pedido: las etiquetas de cada persona se
               ven y se tocan ACÁ MISMO, sin tener que abrir "Editar"
               primero — pintarEtiquetasDe() (06-piezas.js) ya es
               autónoma (trae, agrega, quita), se reusa tal cual. */
            '<div id="etiquetas-acomp-' + a.id + '" style="margin-top:4px"></div>' +
          '</div>'
        ).join('')
      : '<p class="vacio__texto" style="padding:var(--esp-1) 0">' +
        'Todavía nadie tiene nombre. Los lugares están reservados igual.</p>') +

    (puedeAgregarMas
      ? '<button class="boton boton--ancho" style="margin-top:var(--esp-1)" ' +
               'id="agregar-acompanante">' +
          'Ponerle nombre a ' + (sinNombre === 1 ? 'el lugar que falta'
                                                 : 'uno de los ' + sinNombre + ' que faltan') +
        '</button>'
      // Todos nombrados: se dice por qué no hay botón, en vez de que
      // simplemente no esté y parezca que falta algo.
      : '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
        'Ya están nombrados los ' + cupo + ' lugares. Para agregar a ' +
        'alguien más, primero súbele los pases a la invitación.</p>');

  filas.forEach(a => {
    pintarEtiquetasDe('acompanante', a.id, buscar('#etiquetas-acomp-' + a.id, contenedor));
  });

  buscarTodos('[data-editar-acomp]', contenedor).forEach(boton => {
    boton.addEventListener('click', () => {
      const persona = filas.find(a => Number(a.id) === Number(boton.dataset.editarAcomp));
      if (!persona) return;
      formularioDeAcompanante(confirmacionId, 0, () =>
        dibujarAcompanantes(confirmacionId, cupo, contenedor), persona);
    });
  });

  buscarTodos('[data-quitar-acomp]', contenedor).forEach(boton => {
    boton.addEventListener('click', async () => {
      const persona = filas.find(a => Number(a.id) === Number(boton.dataset.quitarAcomp));
      const comoSeLlama = persona ? persona.nombre : 'esta persona';

      /* La pregunta dice qué se pierde y qué NO se pierde. La de antes
         —"¿Quitar a esta persona de la lista de nombrados?"— usaba
         "lista de nombrados", que es vocabulario del programa, no de
         quien lo usa. */
      if (!await confirmarAccion(
        '¿Dejar sin nombre el lugar de ' + comoSeLlama + '?\n\n' +
        'El lugar sigue reservado para esta familia: solo se borra el ' +
        'nombre, y puedes ponerle otro cuando quieras.\n\n' +
        'Se pierden sus etiquetas y lo que tenga cargado de menú y alergias.',
        { confirmar: 'Dejar sin nombre', peligro: true })) return;

      try {
        await mandar('acompanantes.php?accion=borrar', { id: Number(boton.dataset.quitarAcomp) });
        dibujarAcompanantes(confirmacionId, cupo, contenedor);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  const agregar = buscar('#agregar-acompanante', contenedor);
  if (agregar) {
    agregar.addEventListener('click', () => {
      formularioDeAcompanante(confirmacionId, cupo - filas.length, () =>
        dibujarAcompanantes(confirmacionId, cupo, contenedor)
      );
    });
  }
}


/**
 * Formulario para nombrar a un acompañante, o para corregir a uno que
 * ya tiene nombre.
 *
 * Si el teléfono soporta la Contact Picker API (Chrome en Android, nada
 * más — ni iPhone ni computadora la tienen) se ofrece un botón para
 * traer nombre y teléfono de los contactos en vez de escribirlos. En
 * todos los demás casos se escribe a mano, que es el camino normal.
 *
 * ⚡ (2026-08-28) El backend (acompanantes.php?accion=editar) ya existía
 * desde siempre, pero esta pantalla nunca lo llamaba: la única acción
 * disponible por persona era "Quitar" (borrar y volver a cargar de
 * cero). Ahora el mismo formulario sirve para las dos cosas — se le
 * pasa el acompañante existente para editar, o nada para agregar uno.
 *
 * @param {number} confirmacionId
 * @param {number} cupan Cuántos faltan por nombrar (solo informativo, alta nueva).
 * @param {Function} alGuardar
 * @param {Object} [existente] - Si se manda, el formulario edita esta persona en vez de crear una.
 * @returns {void}
 */
function formularioDeAcompanante(confirmacionId, cupan, alGuardar, existente) {
  const tieneContactPicker =
    typeof navigator !== 'undefined' && navigator.contacts && navigator.contacts.select;
  const d = existente || {};

  const cuerpo = abrirHoja(existente ? 'Editar acompañante' : 'Agregar acompañante',
    (!existente && tieneContactPicker
      ? '<button type="button" class="boton boton--ancho" id="acomp-de-contactos" ' +
               'style="margin-bottom:var(--esp-2)">Traer de mis contactos</button>'
      : '') +
    campoTexto({ id: 'acomp-nombre', rotulo: 'Nombre', valor: d.nombre || '' }) +
    campoLista({
      id: 'acomp-tipo', rotulo: 'Tipo', valor: d.tipo || 'adulto',
      opciones: [
        { valor: 'adulto', texto: 'Adulto' },
        { valor: 'nino', texto: 'Niño' },
      ],
    }) +
    campoTexto({ id: 'acomp-telefono', rotulo: 'Teléfono', valor: d.telefono || '' }) +
    campoTexto({ id: 'acomp-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo || '' }) +
    campoTexto({ id: 'acomp-menu', rotulo: 'Menú', valor: d.menu || '' }) +
    campoTexto({ id: 'acomp-alergias', rotulo: 'Alergias', valor: d.alergias || '' }) +
    // Las etiquetas (Entrega 2) solo tienen sentido una vez que la
    // persona ya existe (necesitan su id) — no se ofrecen al crear una
    // nueva, recién en su edición posterior.
    (existente ? '<div class="campo" id="acomp-etiquetas"></div>' : '') +
    pieDeFormulario(existente ? 'Guardar' : 'Agregar')
  );

  if (existente) {
    pintarEtiquetasDe('acompanante', existente.id, buscar('#acomp-etiquetas', cuerpo));
  }

  if (!existente && tieneContactPicker) {
    buscar('#acomp-de-contactos', cuerpo).addEventListener('click', async () => {
      try {
        const elegidos = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (!elegidos || !elegidos.length) return;

        const c = elegidos[0];
        if (c.name && c.name[0]) buscar('#acomp-nombre', cuerpo).value = c.name[0];
        if (c.tel && c.tel[0])   buscar('#acomp-telefono', cuerpo).value = c.tel[0];
      } catch (error) {
        // El usuario canceló el selector, o el navegador lo rechazó: no
        // es un error que valga la pena mostrar, se sigue escribiendo a mano.
      }
    });
  }

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('acomp-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return; }

    const campos = {
      nombre:   nombre,
      tipo:     valorDe('acomp-tipo', cuerpo),
      telefono: valorDe('acomp-telefono', cuerpo),
      correo:   valorDe('acomp-correo', cuerpo),
      menu:     valorDe('acomp-menu', cuerpo),
      alergias: valorDe('acomp-alergias', cuerpo),
    };

    try {
      if (existente) {
        await mandar('acompanantes.php?accion=editar',
          Object.assign({ id: existente.id }, campos));
      } else {
        await mandar('acompanantes.php?accion=agregar',
          Object.assign({ confirmacion_id: confirmacionId }, campos));
      }
      registrarEvento('accion', 'crear_editar_acompanante');
      cerrarHoja(true);
      avisar(existente ? 'Guardado.' : 'Agregado.');
      alGuardar();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}
