/* ══════════════════════════════════════════════════════════════════════
   07 · VISTA RESUMEN

   QUÉ HACE ESTE ARCHIVO
   Dibuja el tablero: la primera pantalla que se ve al abrir la app.

   QUÉ SE MUESTRA Y EN QUÉ ORDEN
     1. Cuántos días faltan.
     2. Los invitados en números.
     3. El dinero: lo que cuesta contra lo que sale del bolsillo.
     4. Lo que necesita atención: pagos por vencer, tareas atrasadas,
        categorías pasadas de presupuesto, fechas cercanas.

   EL CRITERIO DEL ORDEN
   Arriba lo que se mira de reojo (días, invitados). Abajo lo que exige
   hacer algo. Si al abrir la app no hay nada abajo, es que todo está en
   orden — y eso también es información.
   ══════════════════════════════════════════════════════════════════════ */


/**
 * Pide los datos y dibuja la pantalla de Resumen.
 *
 * @returns {Promise<void>}
 */
async function dibujarResumen() {
  const vista = buscar('#vista-resumen');
  pintarCargando(vista, 5);

  let datos;
  try {
    datos = await traer('estadisticas.php');
  } catch (error) {
    pintarError(vista, error.message, () => dibujarResumen());
    throw error;
  }

  const partes = [];

  /* "Hoy" va PRIMERO, antes que cualquier número. Es la única pregunta
     que hay que contestar al abrir la app; el resto es contexto. */
  partes.push('<div id="bloque-hoy"></div>');
  partes.push(bloqueCuentaAtras(datos.dias_para_la_fiesta));
  partes.push(bloqueInvitados(datos.invitados));
  partes.push(bloqueDinero(datos.dinero));
  partes.push(bloqueAtencion(datos));
  partes.push(bloqueLineaDeTiempo(datos.linea_de_tiempo));

  vista.innerHTML = partes.filter(Boolean).join('');

  actualizarBurbujas(datos);
  engancharResumen(vista);

  /* Se pide aparte y sin esperarlo: si hoy.php tardara, el Resumen ya
     está pintado y el bloque aparece encima cuando llega. */
  pintarHoy(buscar('#bloque-hoy', vista));
}


/* ─── LA LÍNEA DE TIEMPO ───────────────────────────────────────────── */

/**
 * Todo lo que tiene fecha, en orden, de acá hasta la fiesta.
 *
 * POR QUÉ VA APARTE DE "NECESITA ATENCIÓN"
 * Ese bloque contesta "¿qué está por vencer?" y corta a los 14 días.
 * Este contesta otra cosa: "¿qué viene y en qué orden?". Sin él, un pago
 * grande a 40 días no aparece en ningún lado hasta que ya está encima, y
 * cuando aparece puede ser tarde para juntar la plata.
 *
 * @param {Array} hitos
 * @returns {string} HTML
 */
function bloqueLineaDeTiempo(hitos) {
  if (!hitos || !hitos.length) return '';

  /* Se agrupa por cercanía y no por mes, porque lo que uno necesita
     saber es "¿esto es urgente o puedo dejarlo para después?", y esa
     respuesta cambia según cuán cerca esté, no según en qué mes caiga. */
  const grupos = [
    { clave: 'atrasado', titulo: 'Atrasado',      hitos: [] },
    { clave: 'semana',   titulo: 'Esta semana',   hitos: [] },
    { clave: 'mes',      titulo: 'Este mes',      hitos: [] },
    { clave: 'despues',  titulo: 'Más adelante',  hitos: [] },
  ];

  hitos.forEach(hito => {
    const dias = diasHasta(hito.fecha);

    if (dias < 0)       grupos[0].hitos.push(hito);
    else if (dias <= 7) grupos[1].hitos.push(hito);
    else if (dias <= 30) grupos[2].hitos.push(hito);
    else                grupos[3].hitos.push(hito);
  });

  /* Un punto de color por tipo. Va siempre acompañado del texto, nunca
     solo el color: quien no distingue bien los colores lee igual. */
  const colores = {
    pago:    'alerta',
    tarea:   'ojo',
    agenda:  'info',
    vestido: 'oro',
    ensayo:  'info',
    papeles: 'ojo',
    fiesta:  'oro',
  };

  const secciones = grupos.filter(g => g.hitos.length).map(grupo => {
    const filas = grupo.hitos.map(hito => {
      const color = colores[hito.tipo] || 'tenue';
      const tocable = !!hito.ir_a;

      return '' +
        '<' + (tocable ? 'button' : 'div') + ' class="hito"' +
          (tocable ? ' data-hito="' + seguro(hito.ir_a) + '|' +
                     seguro(hito.seccion || '') + '"' : '') + '>' +

          '<span class="hito__fecha">' +
            seguro(comoFechaCorta(hito.fecha)) +
          '</span>' +

          '<span class="hito__marca hito__marca--' + color + '"></span>' +

          '<span class="hito__cuerpo">' +
            '<span class="hito__texto">' + seguro(hito.texto) + '</span>' +
            (hito.detalle
              ? '<span class="hito__detalle">' + seguro(hito.detalle) + '</span>'
              : '') +
          '</span>' +

          '<span class="hito__cuando">' + seguro(comoCuando(hito.fecha)) + '</span>' +
        '</' + (tocable ? 'button' : 'div') + '>';
    }).join('');

    return '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
           seguro(grupo.titulo) + '</div>' +
           '<div class="linea-tiempo">' + filas + '</div>';
  }).join('');

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-4) 0 0">' +
      'Qué viene' +
    '</div>' +
    secciones;
}

/**
 * Escribe una fecha en dos renglones cortos: "24" y "oct".
 *
 * Ocupa poco a la izquierda de cada hito y deja el ancho para el texto,
 * que es lo que de verdad hay que leer.
 *
 * @param {string} fecha
 * @returns {string}
 */
function comoFechaCorta(fecha) {
  const d = aFecha(fecha);
  if (!d) return '';

  return d.getDate() + ' ' +
         d.toLocaleDateString(CONFIGURACION.dinero.region, { month: 'short' })
          .replace('.', '');
}


/* ─── LOS BLOQUES ──────────────────────────────────────────────────── */

/**
 * Cuántos días faltan para la fiesta.
 *
 * @param {number} dias
 * @returns {string} HTML
 */
function bloqueCuentaAtras(dias) {
  const n = Number(dias) || 0;

  let numero, texto;

  if (n > 0) {
    numero = n;
    texto  = (n === 1 ? 'día' : 'días') + ' para los XV de ' +
             CONFIGURACION.fiesta.nombre;
  } else if (n === 0) {
    numero = '¡Hoy!';
    texto  = CONFIGURACION.fiesta.lugar;
  } else {
    numero = Math.abs(n);
    texto  = (Math.abs(n) === 1 ? 'día' : 'días') + ' desde la fiesta';
  }

  return '' +
    '<div class="cuenta-atras">' +
      '<div class="cuenta-atras__numero">' + seguro(numero) + '</div>' +
      '<div class="cuenta-atras__texto">' + seguro(texto) + '</div>' +
    '</div>';
}

/**
 * Los invitados en números.
 *
 * @param {Object} invitados
 * @returns {string} HTML
 */
function bloqueInvitados(invitados) {
  if (!invitados || !invitados.hay) return '';

  /* "Personas" va primero y es el número más importante de todos: es el
     que se le dice al salón y al banquete. Los demás son el detalle. */
  return '' +
    '<div class="rejilla-datos">' +
      tarjetaDato(invitados.personas, 'Personas') +
      tarjetaDato(invitados.si_asisten, 'Confirman') +
      tarjetaDato(invitados.no_asisten, 'No pueden') +
      tarjetaDato(invitados.adultos, 'Adultos') +
      tarjetaDato(invitados.ninos, 'Niños') +
    '</div>' +
    bloqueMenus(invitados.menus);
}

/**
 * Cuántos platos de cada menú hay que pedir.
 *
 * Es el dato que pide el banquete, y el que uno necesita tener a mano
 * cuando llama para cerrar cantidades. Por eso va en el Resumen y no
 * escondido en la ficha de cada invitado.
 *
 * @param {Object} menus - { "estándar": 14, "vegetariano": 5, … }
 * @returns {string} HTML
 */
function bloqueMenus(menus) {
  if (!menus) return '';

  /* El servidor cuenta lo que la gente escribió en el formulario, que
     puede venir como "estandar", "estándar" o "Estándar". Se juntan las
     variantes de lo mismo para no mostrar tres tarjetas del mismo plato.

     Cada renglón es: [cómo se muestra, qué palabras lo identifican]. */
  const familias = [
    ['Estándar',    ['estandar', 'normal', 'pollo', 'carne', 'res', 'adulto']],
    ['Vegetariano', ['vegetarian', 'vegan', 'verdura', 'sin carne']],
    ['Infantil',    ['infantil', 'nino', 'nene', 'kids']],
  ];

  const totales = { 'Estándar': 0, 'Vegetariano': 0, 'Infantil': 0, 'Otros': 0 };
  let hayAlguno = false;

  Object.keys(menus).forEach(nombre => {
    const cuantos = Number(menus[nombre]) || 0;
    if (!cuantos) return;
    hayAlguno = true;

    const limpio = paraBuscar(nombre);
    const familia = familias.find(f => f[1].some(palabra => limpio.includes(palabra)));

    totales[familia ? familia[0] : 'Otros'] += cuantos;
  });

  if (!hayAlguno) return '';

  const tarjetas = Object.keys(totales)
    // "Otros" solo aparece si de verdad hay algo que no encajó.
    .filter(nombre => totales[nombre] > 0 || nombre !== 'Otros')
    .map(nombre => tarjetaDato(totales[nombre], nombre))
    .join('');

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      'Menús a pedir' +
    '</div>' +
    '<div class="rejilla-datos">' + tarjetas + '</div>';
}

/**
 * Una tarjeta de número grande con su rótulo.
 *
 * @param {number|string} numero
 * @param {string} rotulo
 * @returns {string} HTML
 */
function tarjetaDato(numero, rotulo) {
  return '' +
    '<div class="tarjeta-dato">' +
      '<div class="tarjeta-dato__numero">' + seguro(numero || 0) + '</div>' +
      '<div class="tarjeta-dato__rotulo">' + seguro(rotulo) + '</div>' +
    '</div>';
}

/**
 * El dinero: lo que cuesta contra lo que sale del bolsillo.
 *
 * @param {Object} dinero
 * @returns {string} HTML
 */
function bloqueDinero(dinero) {
  if (!dinero || !dinero.hay) return '';

  // Si todavía no se cargó ningún gasto, no se muestra un bloque de
  // ceros: se invita a empezar.
  if (!dinero.costo && !dinero.presupuestado) {
    return '' +
      '<div class="tarjeta">' +
        '<div class="tarjeta__titulo">Presupuesto</div>' +
        '<p class="vacio__texto">Todavía no cargaste ningún gasto. ' +
        'Empieza desde la pestaña Dinero.</p>' +
      '</div>';
  }

  let extra = '';

  if (dinero.de_padrinos > 0) {
    extra += '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
             'Los padrinos cubren ' + seguro(comoDinero(dinero.de_padrinos, false)) +
             '.</p>';
  }

  const pendientes = dinero.padrinos_pendientes;
  if (pendientes && pendientes.cuantos > 0) {
    // En ojo y no en rojo: no es un error, es algo que hay que seguir.
    extra += '<p class="vacio__texto" style="color:var(--ojo)">' +
             seguro(comoDinero(pendientes.monto, false)) + ' de ' +
             seguro(pluralizar(pendientes.cuantos, 'padrino', 'padrinos')) +
             ' todavía sin entregar.</p>';
  }

  return '' +
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Presupuesto</div>' +
      '<div class="dinero-resumen">' +
        '<div class="dinero-resumen__mitad">' +
          '<div class="dinero-resumen__rotulo">Cuesta</div>' +
          '<div class="dinero-resumen__cifra">' +
            seguro(comoDinero(dinero.costo, false)) +
          '</div>' +
        '</div>' +
        '<div class="dinero-resumen__mitad">' +
          '<div class="dinero-resumen__rotulo">De tu bolsillo</div>' +
          '<div class="dinero-resumen__cifra dinero-resumen__cifra--propio">' +
            seguro(comoDinero(dinero.propio, false)) +
          '</div>' +
        '</div>' +
      '</div>' +
      extra +
    '</div>';
}

/**
 * Lo que necesita atención: pagos, tareas, sobregiros, fechas.
 *
 * @param {Object} datos - La respuesta entera de estadisticas.php.
 * @returns {string} HTML
 */
function bloqueAtencion(datos) {
  const filas = [];

  /* ─── Categorías pasadas de su techo ─────────────────────────────── */
  const categorias = (datos.dinero && datos.dinero.categorias) || [];
  categorias.forEach(categoria => {
    const techo   = Number(categoria.techo) || 0;
    const gastado = Number(categoria.gastado) || 0;
    if (techo <= 0) return;

    const parte = gastado / techo;
    if (parte < CONFIGURACION.dinero.avisarDesde) return;

    const pasado = gastado > techo;
    filas.push(filaDeAtencion(
      pasado ? 'urgente' : '',
      seguro(categoria.nombre) +
        (pasado ? ' se pasó del presupuesto' : ' está por pasarse'),
      comoDinero(gastado, false) + ' de ' + comoDinero(techo, false),
      'dinero'
    ));
  });

  /* ─── Pagos por vencer ───────────────────────────────────────────── */
  (datos.pagos || []).forEach(pago => {
    const dias = diasHasta(pago.fecha_limite);
    filas.push(filaDeAtencion(
      dias < 0 ? 'urgente' : '',
      (dias < 0 ? 'Pago atrasado: ' : 'Pago: ') +
        seguro(pago.concepto || pago.gasto || 'sin concepto'),
      comoDinero(pago.monto, false) + ' · vence ' + comoCuando(pago.fecha_limite),
      'dinero'
    ));
  });

  /* ─── Tareas ─────────────────────────────────────────────────────── */
  (datos.tareas || []).forEach(tarea => {
    const dias = diasHasta(tarea.fecha_limite);
    filas.push(filaDeAtencion(
      dias < 0 ? 'urgente' : '',
      (dias < 0 ? 'Tarea atrasada: ' : 'Tarea: ') + seguro(tarea.titulo),
      (tarea.responsable ? seguro(tarea.responsable) + ' · ' : '') +
        comoCuando(tarea.fecha_limite),
      'evento'
    ));
  });

  /* ─── Agenda ─────────────────────────────────────────────────────── */
  (datos.agenda || []).forEach(cita => {
    filas.push(filaDeAtencion(
      'bien',
      seguro(cita.titulo),
      comoCuando(cita.fecha) +
        (cita.lugar ? ' · ' + seguro(cita.lugar) : ''),
      'evento'
    ));
  });

  /* ─── Regalos sin agradecer ──────────────────────────────────────── */
  if (datos.regalos_sin_agradecer > 0) {
    filas.push(filaDeAtencion(
      '',
      pluralizar(datos.regalos_sin_agradecer, 'regalo', 'regalos') + ' sin agradecer',
      'Toca para verlos',
      'evento'
    ));
  }

  if (!filas.length) {
    return '' +
      '<div class="tarjeta">' +
        '<div class="tarjeta__titulo">Pendientes</div>' +
        '<p class="vacio__texto">Nada urgente por ahora.</p>' +
      '</div>';
  }

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-4) 0 var(--esp-2)">' +
      'Necesita atención' +
    '</div>' +
    filas.join('');
}

/**
 * Una fila de la lista de pendientes.
 *
 * @param {string} tono - 'urgente', 'bien', o vacío.
 * @param {string} texto - Ya escapado.
 * @param {string} pie - Ya escapado.
 * @param {string} irA - A qué pestaña lleva al tocarla.
 * @returns {string} HTML
 */
function filaDeAtencion(tono, texto, pie, irA) {
  const clase = 'alerta-fila' + (tono ? ' alerta-fila--' + tono : '');

  return '' +
    '<button class="' + clase + '" data-lleva-a="' + seguro(irA) + '">' +
      '<span class="alerta-fila__texto">' + texto +
        '<span class="alerta-fila__pie" style="display:block">' + pie + '</span>' +
      '</span>' +
    '</button>';
}


/* ─── DESPUÉS DE DIBUJAR ───────────────────────────────────────────── */

/**
 * Hace que tocar una fila de pendientes lleve a su pestaña.
 *
 * @param {Element} vista
 * @returns {void}
 */
function engancharResumen(vista) {
  buscarTodos('[data-lleva-a]', vista).forEach(fila => {
    fila.addEventListener('click', () => irA(fila.dataset.llevaA));
  });

  // Los hitos de la línea de tiempo llevan además a su sub-sección.
  buscarTodos('[data-hito]', vista).forEach(fila => {
    fila.addEventListener('click', () => {
      const [destino, seccion] = fila.dataset.hito.split('|');
      if (!destino) return;

      if (destino === 'dinero' && seccion) SECCION_DINERO = seccion;
      if (destino === 'evento' && seccion) SECCION_EVENTO = seccion;

      irA(destino, true);
    });
  });
}

/**
 * Pone las burbujas de aviso en la navegación de abajo.
 *
 * @param {Object} datos
 * @returns {void}
 */
function actualizarBurbujas(datos) {
  // Cuántas cosas de dinero necesitan atención.
  const pagos = (datos.pagos || []).length;
  const sobregiros = ((datos.dinero && datos.dinero.categorias) || [])
    .filter(c => Number(c.techo) > 0 && Number(c.gastado) > Number(c.techo))
    .length;

  // Antes vivía en la pestaña Presupuesto; con las cuatro pestañas
  // nuevas (Fase 1 del rediseño), Presupuesto ya no tiene botón propio
  // abajo — se llega desde Planificar. El aviso de "algo de dinero
  // necesita atención" se muda a la pestaña Resumen, que es quien
  // ahora contesta esa pregunta.
  ponerBurbuja('#burbuja-resumen', pagos + sobregiros);
}

/**
 * Muestra o esconde una burbuja con su número.
 *
 * @param {string} selector
 * @param {number} cuantos
 * @returns {void}
 */
function ponerBurbuja(selector, cuantos) {
  const burbuja = buscar(selector);
  if (!burbuja) return;

  const n = Number(cuantos) || 0;
  burbuja.textContent = n > 9 ? '9+' : String(n);
  burbuja.classList.toggle('oculto', n === 0);
}
