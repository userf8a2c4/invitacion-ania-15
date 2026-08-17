/* ══════════════════════════════════════════════════════════════════════
   19 · CALENDARIO

   QUÉ HACE ESTE ARCHIVO
   El mapa del tiempo: un mes entero de un vistazo, con todo lo que cae
   en cada día. Tocar un día muestra qué hay, y tocar cualquier cosa
   lleva a su ficha.

   EN QUÉ SE DIFERENCIA DE LA LÍNEA DE TIEMPO DEL RESUMEN
   Aquella contesta "¿qué viene ahora?" y ordena por urgencia. Esta
   contesta "¿cómo está repartido el mes?", que es una pregunta de forma:
   sirve para ver que hay tres cosas el mismo sábado y la semana
   siguiente entera vacía. Eso no se ve en una lista.

   POR QUÉ CADA ETIQUETA ES UN BOTÓN
   Porque un calendario que solo muestra no sirve para trabajar. Si al
   ver "Anticipo del salón" el jueves hay que ir a buscarlo a Presupuesto
   y encontrarlo entre veinte pagos, nadie lo usa dos veces. Acá se toca
   y se abre.

   ÍNDICE
     1. Estado y dibujado
     2. La cuadrícula del mes
     3. El día tocado
     4. Colores y textos
   ══════════════════════════════════════════════════════════════════════ */


/** Qué mes se está mirando. */
let CAL_ANIO = new Date().getFullYear();
let CAL_MES  = new Date().getMonth() + 1;   // 1 a 12

/** Lo que devolvió el servidor para ese mes. */
let CALENDARIO = null;

/** Qué día está abierto abajo, o null. */
let CAL_DIA_ABIERTO = null;

/**
 * El color y el nombre de cada tipo de hito.
 *
 * El color va SIEMPRE acompañado del texto, nunca solo: quien no
 * distingue bien los colores tiene que poder leer de qué se trata.
 */
const TIPOS_DE_HITO = {
  pago:    { color: 'alerta', nombre: 'Pago' },
  tarea:   { color: 'ojo',    nombre: 'Tarea' },
  agenda:  { color: 'info',   nombre: 'Agenda' },
  vestido: { color: 'oro',    nombre: 'Vestido' },
  ensayo:  { color: 'info',   nombre: 'Ensayo' },
  papeles: { color: 'ojo',    nombre: 'Papeles' },
  misa:    { color: 'oro',    nombre: 'Misa' },
  fiesta:  { color: 'oro',    nombre: 'La fiesta' },
};

/** Los días de la semana, empezando en lunes. */
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];


/* ─── 1. ESTADO Y DIBUJADO ─────────────────────────────────────────── */

/**
 * Pide el mes y dibuja el calendario.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function pintarCalendario(cuerpo) {
  pintarCargando(cuerpo, 4);

  try {
    CALENDARIO = await traer(
      'calendario.php?accion=mes&anio=' + CAL_ANIO + '&mes=' + CAL_MES);
  } catch (error) {
    pintarError(cuerpo, error.message, () => pintarCalendario(cuerpo));
    return;
  }

  cuerpo.innerHTML =
    barraDelMes() +
    cuadriculaDelMes() +
    '<div id="cal-dia"></div>' +
    bloqueDeEstaSemana();

  engancharCalendario(cuerpo);

  // Si hay un día abierto de antes, se vuelve a mostrar.
  if (CAL_DIA_ABIERTO) mostrarDia(CAL_DIA_ABIERTO, cuerpo);
}

/**
 * El encabezado con el mes y las flechas.
 *
 * @returns {string} HTML
 */
function barraDelMes() {
  const nombre = new Date(CAL_ANIO, CAL_MES - 1, 1)
    .toLocaleDateString(CONFIGURACION.dinero.region,
                        { month: 'long', year: 'numeric' });

  const hoy = new Date();
  const esEsteMes = hoy.getFullYear() === CAL_ANIO && (hoy.getMonth() + 1) === CAL_MES;

  return '' +
    '<div style="display:flex;align-items:center;gap:var(--esp-2);' +
                'margin-bottom:var(--esp-2)">' +
      '<button class="boton-icono" id="cal-antes" aria-label="Mes anterior">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" ' +
                'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +

      '<strong style="flex:1;text-align:center;text-transform:capitalize">' +
        seguro(nombre) +
      '</strong>' +

      '<button class="boton-icono" id="cal-despues" aria-label="Mes siguiente">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" ' +
                'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
    '</div>' +

    (esEsteMes ? '' :
      '<button class="boton boton--chico boton--ancho" id="cal-hoy" ' +
              'style="margin-bottom:var(--esp-2)">Volver a hoy</button>');
}

/**
 * Vuelve a pedir y pintar.
 *
 * @returns {void}
 */
function refrescarCalendario() {
  const cuerpo = buscar('#cuerpo-evento');
  if (cuerpo && SECCION_EVENTO === 'calendario') pintarCalendario(cuerpo);
}


/* ─── 2. LA CUADRÍCULA DEL MES ─────────────────────────────────────── */

/**
 * Dibuja la grilla de días.
 *
 * LA SEMANA EMPIEZA EN LUNES. getDay() de JavaScript devuelve 0 para el
 * domingo, así que hay que correr el número: si no, el mes entero queda
 * desplazado un día y las fechas caen en el día de semana equivocado.
 *
 * @returns {string} HTML
 */
function cuadriculaDelMes() {
  const primero = new Date(CAL_ANIO, CAL_MES - 1, 1);
  const ultimo  = new Date(CAL_ANIO, CAL_MES, 0);

  // Lunes = 0, domingo = 6.
  const arranque = (primero.getDay() + 6) % 7;
  const cuantos  = ultimo.getDate();

  const porDia = (CALENDARIO && CALENDARIO.por_dia) || {};
  const hoy    = (CALENDARIO && CALENDARIO.hoy) || '';

  let celdas = '';

  // Los huecos antes del día 1.
  for (let i = 0; i < arranque; i++) celdas += '<div class="cal__hueco"></div>';

  for (let dia = 1; dia <= cuantos; dia++) {
    const fecha = CAL_ANIO + '-' +
                  String(CAL_MES).padStart(2, '0') + '-' +
                  String(dia).padStart(2, '0');

    const hitos = porDia[fecha] || [];
    const esHoy = fecha === hoy;
    const esLaFiesta = hitos.some(h => h.tipo === 'fiesta');

    /* Los puntitos: uno por hito, hasta cuatro. Más de cuatro se
       resumen con un "+N", porque cinco puntos en una celda de 40px no
       se distinguen y solo ensucian. */
    const puntos = hitos.slice(0, 4).map(h =>
      '<span class="cal__punto cal__punto--' +
      (TIPOS_DE_HITO[h.tipo] ? TIPOS_DE_HITO[h.tipo].color : 'tenue') +
      (h.hecho ? ' cal__punto--hecho' : '') + '"></span>'
    ).join('');

    const mas = hitos.length > 4
      ? '<span class="cal__mas">+' + (hitos.length - 4) + '</span>' : '';

    celdas +=
      '<button class="cal__dia' +
        (esHoy ? ' cal__dia--hoy' : '') +
        (esLaFiesta ? ' cal__dia--fiesta' : '') +
        (hitos.length ? '' : ' cal__dia--vacio') +
        '" data-dia="' + fecha + '">' +
        '<span class="cal__numero">' + dia + '</span>' +
        '<span class="cal__puntos">' + puntos + mas + '</span>' +
      '</button>';
  }

  return '' +
    '<div class="cal">' +
      '<div class="cal__semana">' +
        DIAS_CORTOS.map(d => '<span class="cal__rotulo">' + d + '</span>').join('') +
      '</div>' +
      '<div class="cal__grilla">' + celdas + '</div>' +
    '</div>' +

    (CALENDARIO && CALENDARIO.cuantos === 0
      ? '<p class="vacio__texto" style="text-align:center;padding:var(--esp-2)">' +
        'Este mes no tiene nada anotado.</p>'
      : '');
}


/* ─── 3. EL DÍA TOCADO ─────────────────────────────────────────────── */

/**
 * Engancha las flechas, los días y las etiquetas.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharCalendario(cuerpo) {
  const mover = cuantos => {
    let mes = CAL_MES + cuantos;
    let anio = CAL_ANIO;

    if (mes < 1)  { mes = 12; anio--; }
    if (mes > 12) { mes = 1;  anio++; }

    CAL_MES = mes;
    CAL_ANIO = anio;
    CAL_DIA_ABIERTO = null;
    pintarCalendario(cuerpo);
  };

  buscar('#cal-antes', cuerpo).addEventListener('click', () => mover(-1));
  buscar('#cal-despues', cuerpo).addEventListener('click', () => mover(1));

  const hoy = buscar('#cal-hoy', cuerpo);
  if (hoy) {
    hoy.addEventListener('click', () => {
      const ahora = new Date();
      CAL_ANIO = ahora.getFullYear();
      CAL_MES  = ahora.getMonth() + 1;
      CAL_DIA_ABIERTO = null;
      pintarCalendario(cuerpo);
    });
  }

  buscarTodos('[data-dia]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const fecha = boton.dataset.dia;

      // Tocar el día ya abierto lo cierra.
      CAL_DIA_ABIERTO = (CAL_DIA_ABIERTO === fecha) ? null : fecha;

      buscarTodos('[data-dia]', cuerpo).forEach(otro =>
        otro.classList.toggle('cal__dia--abierto',
                              otro.dataset.dia === CAL_DIA_ABIERTO));

      mostrarDia(CAL_DIA_ABIERTO, cuerpo);
    });
  });

  engancharEtiquetasDelCalendario(cuerpo);
}

/**
 * Muestra abajo lo que hay en un día.
 *
 * @param {string|null} fecha
 * @param {Element} cuerpo
 * @returns {void}
 */
function mostrarDia(fecha, cuerpo) {
  const caja = buscar('#cal-dia', cuerpo);
  if (!caja) return;

  if (!fecha) { caja.innerHTML = ''; return; }

  const hitos = ((CALENDARIO && CALENDARIO.por_dia) || {})[fecha] || [];

  const titulo = aFecha(fecha).toLocaleDateString(CONFIGURACION.dinero.region,
    { weekday: 'long', day: 'numeric', month: 'long' });

  caja.innerHTML =
    '<div class="tarjeta" style="margin-top:var(--esp-2)">' +
      '<div style="display:flex;justify-content:space-between;' +
                  'align-items:baseline;gap:var(--esp-2)">' +
        '<strong style="text-transform:capitalize">' + seguro(titulo) + '</strong>' +
        '<span class="vacio__texto">' + seguro(comoCuando(fecha)) + '</span>' +
      '</div>' +

      (hitos.length
        ? '<div style="margin-top:var(--esp-2)">' +
            hitos.map(h => etiquetaDeHito(h, true)).join('') +
          '</div>'
        : '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'Nada anotado este día.</p>') +

      '<button class="boton boton--chico boton--ancho" ' +
              'data-agregar-en="' + seguro(fecha) + '" ' +
              'style="margin-top:var(--esp-2)">Agregar algo este día</button>' +
    '</div>';

  engancharEtiquetasDelCalendario(cuerpo);

  // Que la tarjeta del día quede a la vista sin tener que buscarla.
  caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * El HTML de un hito, como botón que lleva a su ficha.
 *
 * @param {Object} hito
 * @param {boolean} conDetalle
 * @returns {string} HTML
 */
function etiquetaDeHito(hito, conDetalle) {
  const tipo = TIPOS_DE_HITO[hito.tipo] || { color: 'tenue', nombre: hito.tipo };

  const pie = [
    hito.hora,
    hito.detalle,
  ].filter(Boolean).join(' · ');

  return '' +
    '<button class="lista__fila" data-hito-ir="' +
            seguro(hito.ir_a + '|' + hito.seccion + '|' + hito.tipo + '|' + hito.id) + '"' +
            (hito.hecho ? ' style="opacity:.5"' : '') + '>' +
      '<span class="hito__marca hito__marca--' + tipo.color + '" ' +
            'style="position:static;box-shadow:none"></span>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo"' +
          (hito.hecho ? ' style="text-decoration:line-through"' : '') + '>' +
          seguro(hito.texto) + '</span>' +
        (conDetalle && pie
          ? '<span class="lista__pie">' + seguro(pie) + '</span>' : '') +
      '</span>' +
      '<span class="lista__lado">' +
        '<span class="etiqueta etiqueta--' + tipo.color + '">' +
          seguro(tipo.nombre) + '</span>' +
      '</span>' +
    '</button>';
}

/**
 * Hace que tocar una etiqueta abra su ficha.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharEtiquetasDelCalendario(cuerpo) {
  buscarTodos('[data-hito-ir]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const [destino, seccion, tipo, id] = boton.dataset.hitoIr.split('|');
      abrirFichaDelHito(destino, seccion, tipo, Number(id));
    });
  });

  buscarTodos('[data-agregar-en]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => agregarEnEseDia(boton.dataset.agregarEn));
  });
}

/**
 * Salta a la ficha del registro que se tocó.
 *
 * @param {string} destino
 * @param {string} seccion
 * @param {string} tipo
 * @param {number} id
 * @returns {void}
 */
function abrirFichaDelHito(destino, seccion, tipo, id) {
  if (!destino) return;

  if (destino === 'dinero') {
    SECCION_DINERO = seccion || 'pagos';
    irA('dinero', true);

    // Se espera a que la vista termine de cargar antes de abrir la ficha.
    setTimeout(() => {
      const pago = (DINERO && DINERO.pagos || []).find(p => Number(p.id) === id);
      if (pago) formularioPago(pago);
    }, 700);
    return;
  }

  if (destino === 'evento') {
    SECCION_EVENTO = seccion || 'tareas';
    irA('evento', true);

    setTimeout(() => {
      // Las tareas y la agenda viven en el planificador; el resto, en
      // la tabla genérica de la vista Evento.
      if (seccion === 'tareas') {
        const t = (PLAN.tareas || []).find(x => Number(x.id) === id);
        if (t) formularioTarea(t);
        return;
      }
      if (seccion === 'agenda') {
        const a = (PLAN.agenda || []).find(x => Number(x.id) === id);
        if (a) formularioCita(a);
        return;
      }
      if (seccion === 'ceremonia') { formularioCeremonia(); return; }

      const lista = (EVENTO && EVENTO[seccion]) || [];
      const fila = lista.find(x => Number(x.id) === id);
      if (fila) formularioEvento(seccion, fila);
    }, 700);
  }
}

/**
 * Ofrece crear algo en el día que se tocó.
 *
 * @param {string} fecha
 * @returns {void}
 */
function agregarEnEseDia(fecha) {
  const cuerpo = abrirHoja('Agregar el ' + comoFecha(fecha),
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      '¿Qué quieres anotar este día?</p>' +

    '<button class="boton boton--ancho" data-crear="tarea" ' +
            'style="margin-bottom:var(--esp-1)">Una tarea</button>' +
    '<button class="boton boton--ancho" data-crear="agenda" ' +
            'style="margin-bottom:var(--esp-1)">Una fecha de la agenda</button>' +
    '<button class="boton boton--ancho" data-crear="pago" ' +
            'style="margin-bottom:var(--esp-1)">Un pago</button>' +
    '<button class="boton boton--ancho" data-crear="cita">Una prueba de vestido</button>'
  );

  buscarTodos('[data-crear]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const que = boton.dataset.crear;
      cerrarHoja(true);

      /* Se abre el formulario de siempre con la fecha ya puesta. No se
         duplica ningún formulario: son los mismos que se usan desde su
         propia sección. */
      if (que === 'tarea')  formularioTarea({ fecha_limite: fecha });
      if (que === 'agenda') formularioCita({ fecha: fecha });
      if (que === 'cita')   formularioEvento('citas_arreglo', { fecha: fecha });

      if (que === 'pago') {
        SECCION_DINERO = 'pagos';
        irA('dinero', true);
        setTimeout(() => formularioPago({ fecha_limite: fecha }), 700);
      }
    });
  });
}


/* ─── 4. LO QUE TOCA ESTA SEMANA ───────────────────────────────────── */

/**
 * La lista de los próximos siete días, debajo del calendario.
 *
 * Está porque la cuadrícula contesta "¿cómo viene el mes?" pero no
 * "¿qué tengo que hacer ahora?". Los puntitos no se leen: hay que tocar
 * cada día para saber qué son. Esta lista da la respuesta directa.
 *
 * @returns {string} HTML
 */
function bloqueDeEstaSemana() {
  if (!CALENDARIO || !CALENDARIO.hitos) return '';

  const proximos = CALENDARIO.hitos.filter(h => {
    if (h.hecho) return false;
    const dias = diasHasta(h.fecha);
    return dias >= 0 && dias <= 7;
  });

  if (!proximos.length) return '';

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-4) 0 var(--esp-2)">' +
      'Los próximos 7 días' +
    '</div>' +
    proximos.map(h =>
      etiquetaDeHito(Object.assign({}, h, {
        detalle: comoCuando(h.fecha) + (h.detalle ? ' · ' + h.detalle : ''),
      }), true)
    ).join('');
}
