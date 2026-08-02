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

  partes.push(bloqueCuentaAtras(datos.dias_para_la_fiesta));
  partes.push(bloqueInvitados(datos.invitados));
  partes.push(bloqueDinero(datos.dinero));
  partes.push(bloqueAtencion(datos));

  vista.innerHTML = partes.filter(Boolean).join('');

  actualizarBurbujas(datos);
  engancharResumen(vista);
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
        'Empezá desde la pestaña Dinero.</p>' +
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
      'Tocá para verlos',
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

  ponerBurbuja('#burbuja-dinero', pagos + sobregiros);
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
