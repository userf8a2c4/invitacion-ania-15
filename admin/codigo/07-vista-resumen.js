/* ══════════════════════════════════════════════════════════════════════
   07 · VISTA RESUMEN

   QUÉ HACE ESTE ARCHIVO
   El centro de control ejecutivo: en menos de tres segundos hay que
   entender el estado del evento y qué necesita atención hoy.

   QUÉ SE MUESTRA Y EN QUÉ ORDEN (Fase 3 del rediseño)
     1. La tarjeta ejecutiva: confirmados, pendientes, % de presupuesto
        usado y la tarea más crítica. Cuatro números, no treinta.
     2. "Necesita tu atención": lo más urgente de verdad, hasta 6 filas.
        Si no hay nada, un estado vacío tranquilo.
     3. Accesos rápidos a lo que se usa casi todos los días.
     4. Los invitados y el dinero en detalle, y "Qué viene" — para
        cuando uno se sienta a mirar cómo va todo, no solo a resolver.

   POR QUÉ "HOY" YA NO VIVE ACÁ
   Antes el bloque de hoy.php estaba arriba de todo. Desde el rediseño
   tiene su propia pestaña (30-vista-hoy.js) con una pantalla entera
   pensada para eso; repetirlo acá era mostrar lo mismo dos veces.
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

  /* La cuenta atrás ya no va acá: desde el rediseño Lucila vive en el
     encabezado como el contador persistente en oro (ver
     actualizarContadorDeDias(), 05-navegacion.js), visible en TODAS
     las pantallas, no solo en Resumen. Repetirla acá abajo sería la
     misma cifra dos veces en la misma pantalla. */
  ponerTitulo('Resumen');

  const pendientes = listaDeAtencion(datos);

  const partes = [
    bloqueEjecutivo(datos, pendientes),
    bloqueAtencion(pendientes),
    bloqueAccesosRapidos(),
    bloqueInvitados(datos.invitados),
    bloqueDinero(datos.dinero),
    bloqueLineaDeTiempo(datos.linea_de_tiempo),
  ];

  vista.innerHTML = partes.filter(Boolean).join('');

  actualizarBurbujas(datos);
  engancharResumen(vista);
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
 * El subtítulo del encabezado: "24 días para la fiesta", "¡Hoy!",
 * etc. Antes esto era un bloque grande propio (cuenta-atras); desde el
 * rediseño va en el encabezado, junto al título "Resumen" — la misma
 * idea que ya usa la pestaña Hoy con su fecha corta.
 *
 * @param {number} dias
 * @returns {string}
 */
function textoDeCuentaAtras(dias) {
  const n = Number(dias) || 0;

  if (n > 0)  return (n === 1 ? '1 día' : n + ' días') + ' para la fiesta';
  if (n === 0) return '¡Hoy son los XV!';
  return (Math.abs(n) === 1 ? '1 día' : Math.abs(n) + ' días') + ' desde la fiesta';
}

/**
 * La tarjeta ejecutiva: cuatro cifras, no treinta. Es lo primero que
 * hay que entender al abrir la app — el resto de la pantalla es
 * detalle para quien quiera profundizar.
 *
 * @param {Object} datos - La respuesta entera de estadisticas.php.
 * @param {Array} pendientes - Lo que devuelve listaDeAtencion(), SIN recortar.
 * @returns {string} HTML
 */
function bloqueEjecutivo(datos, pendientes) {
  const invitados = datos.invitados || {};
  const dinero = datos.dinero || {};

  const porcentajeUsado = (dinero.hay && dinero.presupuestado > 0)
    ? Math.round((dinero.costo / dinero.presupuestado) * 100)
    : null;

  // La tarea más crítica: la primera tarea (no pago, no cita) de la
  // lista ya ordenada por urgencia real.
  const tareaCritica = pendientes.find(p => p.esTarea);

  return '' +
    '<div class="tarjeta rejilla-ejecutiva">' +
      /* ⚠️ `contestaron` Y NO `si_asisten` (2026-09-04). `si_asisten`
         cuenta `asiste = 1`, y una confirmación nace con asiste = 1
         porque el cupo se aparta desde el día uno. Este número decía
         "51 confirmaron" con la invitación sin mandar. Mismo criterio
         que la tarjeta de Hoy y que la lista de Gente. */
      '<button class="rejilla-ejecutiva__dato" data-lleva-a="invitados">' +
        '<span class="rejilla-ejecutiva__numero">' +
          seguro(invitados.hay ? (invitados.contestaron || 0) : '—') +
        '</span>' +
        '<span class="rejilla-ejecutiva__rotulo">Confirmaron</span>' +
      '</button>' +

      '<button class="rejilla-ejecutiva__dato' +
             (pendientes.length ? ' rejilla-ejecutiva__dato--alerta' : '') + '">' +
        '<span class="rejilla-ejecutiva__numero">' + seguro(pendientes.length) + '</span>' +
        '<span class="rejilla-ejecutiva__rotulo">Pendientes</span>' +
      '</button>' +

      '<button class="rejilla-ejecutiva__dato" data-lleva-a="dinero">' +
        '<span class="rejilla-ejecutiva__numero">' +
          (porcentajeUsado === null ? '—' : seguro(porcentajeUsado) + '%') +
        '</span>' +
        '<span class="rejilla-ejecutiva__rotulo">Del presupuesto</span>' +
      '</button>' +

      '<button class="rejilla-ejecutiva__dato" data-lleva-a="evento">' +
        '<span class="rejilla-ejecutiva__numero rejilla-ejecutiva__numero--chico">' +
          (tareaCritica ? seguro(acortar(tareaCritica.texto.replace(/^Tarea( atrasada)?: /, ''), 26))
                        : 'Ninguna') +
        '</span>' +
        '<span class="rejilla-ejecutiva__rotulo">Tarea crítica</span>' +
      '</button>' +
    '</div>';
}

/**
 * Los accesos rápidos a lo que se usa casi todos los días. El resto de
 * las herramientas vive en Planificar; acá solo lo de uso diario.
 *
 * Vive en el módulo (no adentro de la función) porque engancharResumen()
 * necesita la MISMA lista para saber qué ejecutar en cada botón — un
 * solo lugar donde agregar un acceso nuevo, no dos que se puedan
 * desincronizar.
 */
/* ⚡ SIN "GENTE" NI "DINERO" DESDE QUE ESTÁN EN LA BARRA (2026-09-03).
   Los dos tienen ahora su propio botón abajo, así que repetirlos acá era
   ofrecer dos caminos al mismo sitio en la misma pantalla — ruido, y una
   decisión de más para alguien que solo quiere llegar. En su lugar entran
   Evento y Notas, que se quedaron sin casa cuando "Planificar" dejó de ser
   una parada obligatoria. */
const ACCESOS_RAPIDOS = [
  { clave: 'mesas',     nombre: 'Mesas',     ir: () => verPlanoDeMesas() },
  { clave: 'tareas',    nombre: 'Tareas',    ir: () => { SECCION_EVENTO = 'tareas'; irA('evento', true); } },
  { clave: 'evento',    nombre: 'Evento',    ir: () => irA('evento') },
  { clave: 'correo',    nombre: 'Correo',    ir: () => irA('correo') },
  { clave: 'contactos', nombre: 'Contactos', ir: () => { SECCION_GENTE = 'contactos'; irA('invitados', true); } },
  { clave: 'notas',     nombre: 'Notas',     ir: () => abrirHojaDeNota() },
];

/**
 * Engancha los accesos rápidos dentro de un contenedor cualquiera.
 *
 * Existe suelta porque ahora la misma rejilla se pinta en dos pantallas —
 * Resumen y Hoy—, y tener el enganche en un solo sitio evita el clásico de
 * agregar un acceso nuevo y que funcione en una pantalla y en la otra no.
 *
 * @param {HTMLElement} donde
 * @returns {void}
 */
function engancharAccesosRapidos(donde) {
  buscarTodos('[data-acceso]', donde).forEach(boton => {
    const acceso = ACCESOS_RAPIDOS.find(a => a.clave === boton.dataset.acceso);
    if (acceso) boton.addEventListener('click', () => acceso.ir());
  });
}

/**
 * El HTML de la rejilla de accesos rápidos.
 *
 * @returns {string} HTML
 */
function bloqueAccesosRapidos() {
  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">Accesos rápidos</div>' +
    '<div class="rejilla-accesos">' +
      ACCESOS_RAPIDOS.map(a =>
        '<button class="rejilla-accesos__boton" data-acceso="' + a.clave + '">' +
          seguro(a.nombre) +
        '</button>'
      ).join('') +
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
      // ⚡ (2026-08-30) Cupo sustractivo real: "Libres" resta contra
      // SUM(mesas.capacidad) -140 hoy, pero calculado, no pisado a
      // mano-, no contra cantidad de invitaciones ni de filas RSVP.
      tarjetaDato(invitados.libres, 'Libres') +
      // "Confirmaron" son los que contestaron (ver la nota de arriba);
      // "Apartados" es el cupo reservado, que es lo que `si_asisten`
      // siempre midió y lo que se le dice al salón.
      tarjetaDato(invitados.contestaron || 0, 'Confirmaron') +
      tarjetaDato(invitados.si_asisten, 'Apartados') +
      tarjetaDato(invitados.no_asisten, 'No vienen') +
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
        '<div class="tarjeta__titulo">Dinero</div>' +
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

  /* `padrinos_pendientes` es el monto y `_cuantos` la cantidad — dos
     claves sueltas, la misma forma que devuelve presupuesto.php. Antes
     acá era un objeto {monto, cuantos} y allá dos claves: el mismo dato
     con dos formas según la pantalla. */
  if (dinero.padrinos_pendientes_cuantos > 0) {
    // En ojo y no en rojo: no es un error, es algo que hay que seguir.
    extra += '<p class="vacio__texto" style="color:var(--ojo)">' +
             seguro(comoDinero(dinero.padrinos_pendientes, false)) + ' de ' +
             seguro(pluralizar(dinero.padrinos_pendientes_cuantos,
                               'padrino', 'padrinos')) +
             ' todavía sin entregar.</p>';
  }

  return '' +
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Dinero</div>' +
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
 * Arma la lista de lo que necesita atención, YA ordenada por urgencia
 * real y recortada a lo que de verdad se puede leer.
 *
 * POR QUÉ SEPARADO DEL HTML
 * bloqueEjecutivo() necesita "la tarea más crítica" y bloqueAtencion()
 * necesita la lista completa — las dos parten de esta misma función
 * para no calcular la urgencia dos veces ni arriesgarse a que se
 * desincronicen.
 *
 * EL ORDEN
 * Antes las filas salían agrupadas por origen (primero categorías,
 * después pagos, después tareas…): un pago atrasado por un mes podía
 * aparecer más abajo que una cita informativa de la semana que viene,
 * solo porque "agenda" se agregaba después en el código. Acá se
 * ordena por urgencia de verdad: 0 = atrasado, 1 = esta semana,
 * 2 = el resto — mismo criterio que ya usa hoy.php.
 *
 * @param {Object} datos - La respuesta entera de estadisticas.php.
 * @returns {Array<{urgencia:number, tono:string, texto:string, pie:string, irA:string}>}
 */
function listaDeAtencion(datos) {
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
    filas.push({
      urgencia: pasado ? 0 : 1,
      tono: pasado ? 'urgente' : '',
      texto: seguro(categoria.nombre) +
        (pasado ? ' se pasó del presupuesto' : ' está por pasarse'),
      pie: comoDinero(gastado, false) + ' de ' + comoDinero(techo, false),
      irA: 'dinero',
    });
  });

  /* ─── Pagos por vencer ───────────────────────────────────────────── */
  (datos.pagos || []).forEach(pago => {
    const dias = diasHasta(pago.fecha_limite);
    filas.push({
      urgencia: dias < 0 ? 0 : (dias <= 3 ? 1 : 2),
      tono: dias < 0 ? 'urgente' : '',
      texto: (dias < 0 ? 'Pago atrasado: ' : 'Pago: ') +
        seguro(pago.concepto || pago.gasto || 'sin concepto'),
      pie: comoDinero(pago.monto, false) + ' · vence ' + comoCuando(pago.fecha_limite),
      irA: 'dinero',
      esTarea: false,
    });
  });

  /* ─── Tareas ─────────────────────────────────────────────────────── */
  (datos.tareas || []).forEach(tarea => {
    const dias = diasHasta(tarea.fecha_limite);
    filas.push({
      urgencia: dias < 0 ? 0 : (dias <= 3 ? 1 : 2),
      tono: dias < 0 ? 'urgente' : '',
      texto: (dias < 0 ? 'Tarea atrasada: ' : 'Tarea: ') + seguro(tarea.titulo),
      pie: (tarea.responsable ? seguro(tarea.responsable) + ' · ' : '') +
        comoCuando(tarea.fecha_limite),
      irA: 'evento',
      esTarea: true,
      dias: dias,
    });
  });

  /* ─── Agenda ─────────────────────────────────────────────────────── */
  (datos.agenda || []).forEach(cita => {
    const dias = diasHasta(cita.fecha);
    filas.push({
      urgencia: dias <= 3 ? 1 : 2,
      tono: 'bien',
      texto: seguro(cita.titulo),
      pie: comoCuando(cita.fecha) + (cita.lugar ? ' · ' + seguro(cita.lugar) : ''),
      irA: 'evento',
    });
  });

  /* ─── Regalos sin agradecer ──────────────────────────────────────── */
  if (datos.regalos_sin_agradecer > 0) {
    filas.push({
      urgencia: 2,
      tono: '',
      texto: pluralizar(datos.regalos_sin_agradecer, 'regalo', 'regalos') + ' sin agradecer',
      pie: 'Toca para verlos',
      irA: 'evento',
    });
  }

  filas.sort((a, b) => a.urgencia - b.urgencia);
  return filas;
}

/**
 * El HTML de "Necesita tu atención" — o el estado vacío, tranquilo,
 * cuando no hay nada.
 *
 * @param {Array} pendientes - Lo que devuelve listaDeAtencion().
 * @returns {string} HTML
 */
function bloqueAtencion(pendientes) {
  if (!pendientes.length) {
    return '' +
      '<div class="tarjeta" style="border-color:var(--bien);margin-top:var(--esp-2)">' +
        '<p class="vacio__texto" style="color:var(--bien);text-align:center">' +
          'Todo bajo control. No hay nada urgente ahora.' +
        '</p>' +
      '</div>';
  }

  // Hasta 6: una lista de veinte pendientes es una lista que no se lee,
  // y ya está la pestaña Planificar para ver todo el detalle. El total
  // real (sin recortar) ya se mostró arriba, en la tarjeta ejecutiva.
  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      'Necesita tu atención' +
    '</div>' +
    pendientes.slice(0, 6).map(filaDeAtencion).join('');
}

/**
 * Una fila de la lista de pendientes.
 *
 * @param {Object} p - Una fila de listaDeAtencion().
 * @returns {string} HTML
 */
function filaDeAtencion(p) {
  const clase = 'alerta-fila' + (p.tono ? ' alerta-fila--' + p.tono : '');

  return '' +
    '<button class="' + clase + '" data-lleva-a="' + seguro(p.irA) + '">' +
      '<span class="alerta-fila__texto">' + p.texto +
        '<span class="alerta-fila__pie" style="display:block">' + p.pie + '</span>' +
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

  // Los accesos rápidos, algunos con sub-sección propia (ver
  // ACCESOS_RAPIDOS más arriba). El enganche está suelto porque Hoy pinta
  // la misma rejilla.
  engancharAccesosRapidos(vista);

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
