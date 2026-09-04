/* ══════════════════════════════════════════════════════════════════════
   09 · VISTA DINERO

   QUÉ HACE ESTE ARCHIVO
   El presupuesto completo: totales, categorías con su techo, gastos,
   pagos, padrinos, proveedores y cotizaciones.

   LA DECISIÓN QUE ORDENA ESTA PANTALLA
   Arriba, siempre, las dos cifras que importan: lo que CUESTA la fiesta
   y lo que sale DE TU BOLSILLO. Son distintas porque los padrinos cubren
   parte, y confundirlas lleva a decisiones malas en las dos direcciones:
   creer que no alcanza cuando sí, o gastar de más creyendo que alguien
   más lo cubre cuando todavía no lo entregó.

   ÍNDICE
     1. Dibujar la vista
     2. Sub-pestañas
     3. Cada sección
     4. Formularios
   ══════════════════════════════════════════════════════════════════════ */


/** Todo lo que devolvió el servidor la última vez. */
let DINERO = null;

/** Qué sub-pestaña se está viendo. */
let SECCION_DINERO = 'resumen';


/* ─── 1. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide los datos del presupuesto y arma la pantalla.
 *
 * @returns {Promise<void>}
 */
async function dibujarDinero() {
  const vista = buscar('#vista-dinero');
  pintarCargando(vista, 5);

  try {
    DINERO = await traer('presupuesto.php?accion=todo');
  } catch (error) {
    pintarError(vista, error.message, () => dibujarDinero());
    throw error;
  }

  /* ⚡ LOS CHIPS DE SECCIÓN, ARRIBA (2026-09-03)
   *
   * Estaban debajo de la tarjeta "Cómo vamos", de "Qué hay que pagar" y
   * del buscador. Con pagos pendientes cargados eso son una pantalla y
   * media antes de llegar al control con el que se navega: TODA
   * navegación dentro de Dinero costaba un desplazamiento fijo, y como
   * cada guardado redibuja la vista entera y devuelve el scroll a cero,
   * cargar tres pagos seguidos costaba tres desplazamientos completos.
   *
   * Ahora el orden es: qué escenario miro · dónde quiero ir · cómo
   * vamos · qué hay que pagar. Lo que sirve para moverse va antes que
   * lo que sirve para leer.
   */
  vista.innerHTML =
    bloqueSelectorDePresupuesto(DINERO.presupuestos, DINERO.presupuesto_activo) +

    '<div class="filtros" id="secciones-dinero">' +
      botonSeccion('resumen',      et('dinero.resumen', 'Categorías')) +
      botonSeccion('gastos',       et('dinero.gastos', 'Gastos'),
                   DINERO.gastos.length) +
      botonSeccion('pagos',        et('dinero.pagos', 'Pagos'),
                   DINERO.totales.por_pagar_cuantos) +
      botonSeccion('padrinos',     et('dinero.padrinos', 'Padrinos'),
                   DINERO.padrinos.length) +
      botonSeccion('proveedores',  et('dinero.proveedores', 'Proveedores'),
                   DINERO.proveedores.length) +
      botonSeccion('cotizaciones', et('dinero.cotizaciones', 'Cotizaciones'),
                   DINERO.cotizaciones.length) +
    '</div>' +

    bloqueTotales(DINERO.totales) +
    bloqueProximosPagos(DINERO.pagos) +

    '<div class="buscador">' +
      '<svg class="buscador__lupa" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      /* Dice "en esta sección" porque es lo que hace: filtrarPorBusqueda
         corre dentro de cada pintarX, y solo se pinta la sección
         activa. El texto anterior —"Buscar en todo el presupuesto"—
         prometía una búsqueda global que nunca existió, y el estado
         vacío tenía que salir a aclarar "mira en otra sección". */
      '<input type="search" id="buscar-dinero" class="buscador__control" ' +
             'placeholder="Buscar en esta sección" ' +
             'autocapitalize="off" spellcheck="false">' +
    '</div>' +

    '<div id="cuerpo-dinero"></div>';

  buscarTodos('[data-seccion]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_DINERO = boton.dataset.seccion;
      buscarTodos('[data-seccion]', vista).forEach(otro => {
        otro.classList.toggle('activo', otro === boton);
      });
      pintarSeccionDeDinero();
    });
  });

  // Cambiar de moneda redibuja todo: los montos se recalculan al pintar.
  buscarTodos('[data-moneda]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      elegirMoneda(boton.dataset.moneda);
      ensuciarVistas('resumen');
      dibujarDinero();
    });
  });

  buscar('#exportar-dinero', vista).addEventListener('click', abrirHojaDeDescarga);
  buscar('#resumen-ejecutivo', vista).addEventListener('click', exportarResumenEjecutivoDinero);

  buscarTodos('[data-proximo-pago]', vista).forEach(boton => {
    boton.addEventListener('click', () => {
      SECCION_DINERO = 'pagos';
      buscarTodos('[data-seccion]', vista).forEach(o =>
        o.classList.toggle('activo', o.dataset.seccion === 'pagos'));
      pintarSeccionDeDinero();
      formularioPago(DINERO.pagos.find(p => String(p.id) === boton.dataset.proximoPago));
    });
  });

  const cambiarPresupuesto = buscar('#presupuesto-cambiar', vista);
  if (cambiarPresupuesto) {
    cambiarPresupuesto.addEventListener('click', abrirSelectorDePresupuesto);
  }

  const buscador = buscar('#buscar-dinero', vista);
  buscador.value = BUSQUEDA_DINERO;
  buscador.addEventListener('input', () => {
    BUSQUEDA_DINERO = buscador.value;
    pintarSeccionDeDinero();
  });

  pintarSeccionDeDinero();
}


/* ─── BÚSQUEDA ─────────────────────────────────────────────────────── */

/** Lo escrito en el buscador del presupuesto. */
let BUSQUEDA_DINERO = '';

/**
 * Filtra una lista con lo que se escribió en el buscador.
 *
 * Se busca dentro de TODOS los campos de texto de cada fila, no solo el
 * nombre: así escribir "salón" encuentra el gasto, el proveedor y la
 * cotización, aunque la palabra esté en el servicio o en las notas.
 *
 * @param {Array} filas
 * @param {string[]} campos - Qué columnas mirar.
 * @returns {Array}
 */
function filtrarPorBusqueda(filas, campos) {
  const aguja = paraBuscar(BUSQUEDA_DINERO);
  if (!aguja) return filas;

  return filas.filter(fila =>
    paraBuscar(campos.map(c => fila[c] || '').join(' ')).includes(aguja)
  );
}

/**
 * El aviso de "nada coincide" cuando la búsqueda vació una sección.
 *
 * @param {Element} cuerpo
 * @returns {boolean} true si se pintó el vacío (o sea, no hay nada).
 */
function sinResultadosDeBusqueda(cuerpo) {
  if (!BUSQUEDA_DINERO.trim()) return false;

  cuerpo.innerHTML = '';
  pintarVacio(cuerpo, 'Nada coincide con "' + BUSQUEDA_DINERO + '"',
    'Prueba con otra palabra, o mira en otra sección.');
  return true;
}


/**
 * Ofrece descargar el presupuesto en los cuatro formatos.
 *
 * @returns {void}
 */
function abrirHojaDeDescarga() {
  abrirHojaDeFormatos('Descargar el presupuesto', exportarPresupuesto);
}

/**
 * El HTML de un botón de sub-pestaña.
 *
 * @param {string} clave
 * @param {string} texto
 * @param {number} [cuantos]
 * @returns {string}
 */
function botonSeccion(clave, texto, cuantos) {
  const activo = clave === SECCION_DINERO ? ' activo' : '';
  const numero = cuantos ? ' (' + cuantos + ')' : '';
  return '<button class="filtro' + activo + '" data-seccion="' + clave + '">' +
         seguro(texto + numero) + '</button>';
}

/**
 * La barra de "qué presupuesto estás viendo" (Fase 7 del rediseño).
 * No se muestra nada si la instalación todavía no corrió la migración
 * (`presupuestos` llega vacío) — es el mismo criterio de degradar sin
 * romper que ya usa el resto del panel con columnas nuevas.
 *
 * @param {Array} presupuestos
 * @param {number} activoId
 * @returns {string} HTML
 */
function bloqueSelectorDePresupuesto(presupuestos, activoId) {
  // Vacío = la instalación no corrió la migración todavía: no se
  // muestra nada, mismo criterio que el resto del panel con columnas
  // nuevas. Con la migración corrida, siempre hay al menos uno (el
  // principal) — la barra queda visible para poder crear el segundo.
  if (!presupuestos || !presupuestos.length) return '';

  const activo = presupuestos.find(p => Number(p.id) === Number(activoId));

  return '' +
    '<button class="tarjeta" id="presupuesto-cambiar" style="width:100%;' +
            'text-align:left;display:flex;align-items:center;' +
            'justify-content:space-between;margin-bottom:var(--esp-2)">' +
      '<span>' +
        '<span class="vacio__texto" style="display:block">Viendo presupuesto</span>' +
        '<strong>' + seguro(activo ? activo.nombre : 'Presupuesto principal') + '</strong>' +
      '</span>' +
      '<span class="etiqueta etiqueta--tenue">Cambiar</span>' +
    '</button>';
}

/**
 * Hoja para elegir qué presupuesto está activo, o crear uno nuevo.
 *
 * @returns {void}
 */
function abrirSelectorDePresupuesto() {
  const presupuestos = DINERO.presupuestos || [];
  const activoId = Number(DINERO.presupuesto_activo);

  const cuerpo = abrirHoja('Presupuestos',
    presupuestos.map(p =>
      '<button class="lista__fila" data-activar-presupuesto="' + seguro(p.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
        '</span>' +
        (Number(p.id) === activoId
          ? '<span class="etiqueta etiqueta--bien">Activo</span>'
          : '') +
      '</button>'
    ).join('') +

    campoTexto({ id: 'presu-nombre', rotulo: 'Nuevo presupuesto',
                 pista: 'Plan A, Plan B con menos invitados…' }) +
    '<button class="boton boton--principal boton--ancho" id="presu-crear">' +
      'Crear y activar' +
    '</button>'
  );

  buscarTodos('[data-activar-presupuesto]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const id = Number(boton.dataset.activarPresupuesto);
      if (id === activoId) { cerrarHoja(true); return; }
      try {
        const r = await mandar('presupuesto.php?accion=activar_presupuesto', { id: id });
        cerrarHoja(true);
        avisar(r.mensaje);
        dibujarDinero();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  buscar('#presu-crear', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('presu-nombre', cuerpo);
    if (!nombre) { avisar('Ponle un nombre al presupuesto.', true); return; }

    try {
      const r = await mandar('presupuesto.php?accion=crear_presupuesto', { nombre: nombre });
      await mandar('presupuesto.php?accion=activar_presupuesto', { id: r.id });
      cerrarHoja(true);
      avisar('Presupuesto creado y activado.');
      dibujarDinero();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * La cabecera de Dinero: el estado, la cifra que manda y el resto.
 *
 * ⚡ UNA SOLA CIFRA DOMINANTE (2026-09-03)
 * Acá había dos cifras de 30px del mismo peso —"Cuesta" y "De tu
 * bolsillo"— aunque la segunda sea un subconjunto optimista de la
 * primera, y debajo entre veinte y veinticinco números más en gris
 * chico. El ojo no sabía dónde caer.
 *
 * Ahora manda una: LO QUE FALTA PAGAR DE VERDAD. Es la pregunta con la
 * que se abre esta pantalla. El resto se agrupa por pregunta, y cada
 * número se gana su lugar contestando algo distinto en vez de repetir
 * lo mismo con otra fórmula.
 *
 * @param {Object} t - Los totales (ver cifrasDelPresupuesto en
 *   _lib/dinero.php: son las MISMAS que usa la pantalla de inicio).
 * @returns {string} HTML
 */
function bloqueTotales(t) {
  /* El selector de moneda. Cambia SOLO cómo se ven los números: en la
     base de datos todo sigue guardado en pesos. Por eso, cuando está en
     dólares, se aclara con qué tipo de cambio y de cuándo — para que
     nadie confunda una conversión aproximada con una cotización de hoy. */
  const cual = monedaElegida();
  const selector =
    '<div class="filtros" style="margin-bottom:var(--esp-2)">' +
      Object.keys(CONFIGURACION.dinero.monedas).map(clave => {
        const m = CONFIGURACION.dinero.monedas[clave];
        return '<button class="filtro' + (clave === cual ? ' activo' : '') +
               '" data-moneda="' + clave + '">' + seguro(m.nombre) + '</button>';
      }).join('') +
    '</div>';

  const nota = cual !== CONFIGURACION.dinero.monedaBase
    ? '<p class="vacio__texto">Convertido a ' +
      seguro(CONFIGURACION.dinero.pesosPorDolar) + ' pesos por dólar ' +
      '(actualizado el ' +
      seguro(comoFecha(CONFIGURACION.dinero.tipoDeCambioActualizado)) +
      '). Los montos se guardan en pesos.</p>'
    : '';

  return selector +
         '<div class="tarjeta">' +
           bloqueComoVamos(t) +
           nota +
           '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-3)">' +
             '<button class="boton boton--chico" style="flex:1" id="exportar-dinero">' +
               'Descargar</button>' +
             '<button class="boton boton--chico" style="flex:1" id="resumen-ejecutivo">' +
               'Resumen ejecutivo' +
             '</button>' +
           '</div>' +
         '</div>';
}

/**
 * "Cómo vamos": la frase de estado, la cifra que manda y las tres
 * lecturas que hasta ahora solo existían dentro del PDF.
 *
 * POR QUÉ ESTO NO SIGUE VIVIENDO EN EL PDF
 * El resumen ejecutivo (13-exportar.js) tenía todo el pensamiento
 * contable que la app no mostraba: exposición restante, comprometido
 * frente a pagado, gastos sin ningún pago. Que eso viviera en un PDF
 * que hay que generar, y no en la pantalla que se abre todos los días,
 * era el mayor desperdicio del módulo.
 *
 * @param {Object} t
 * @returns {string} HTML
 */
function bloqueComoVamos(t) {
  const costo  = Number(t.costo) || 0;
  const pagado = Number(t.pagado) || 0;
  const falta  = Number(t.falta) || 0;
  /* `pagado_de_mas` es una clave propia y no un `falta` negativo: el
     servidor corta `falta` en cero a propósito, porque mezcla un costo
     filtrado por plan con pagos que pueden ser de cualquiera (ver
     cifrasDelPresupuesto). Un número con signo obligaba a interpretarlo;
     dos claves explícitas, no. */
  const dePlus = Number(t.pagado_de_mas) || 0;

  /* ─── La cifra que manda ──────────────────────────────────────────
   *
   * ⚡ "AL DÍA" NO TAPA DOS SITUACIONES DISTINTAS. Antes cualquier resta
   * negativa se mostraba como "Al día", y eso producía una pantalla que
   * se contradice sola: decía que la fiesta cuesta $10,000, que ya se
   * pagaron $128,145, y donde debería decir cuánto falta decía "Al día".
   * Nadie lee eso como "no debes nada": se lee como que la pantalla está
   * rota, y quien la usa deja de confiar en el resto de los números. */
  let rotulo, cifra, pie, clase;

  if (falta > 0.01) {
    rotulo = 'Falta pagar';
    cifra  = comoDinero(falta, false);
    clase  = '';
    pie    = 'De ' + comoDinero(costo, false) + ' que cuesta, llevas ' +
             comoDinero(pagado, false) + ' pagados.';
  } else if (costo > 0.01 && pagado > costo * 2) {
    rotulo = 'Falta pagar';
    cifra  = '—';
    clase  = ' cuenta__cifra--alerta';
    pie    = 'Lo pagado (' + comoDinero(pagado, false) + ') supera por mucho al ' +
             'presupuesto cargado (' + comoDinero(costo, false) + '). ' +
             'Carga el costo real de los gastos para ver cuánto falta.';
  } else if (dePlus > 0.01) {
    rotulo = 'Pagado de más';
    cifra  = comoDinero(dePlus, false);
    clase  = ' cuenta__cifra--alerta';
    pie    = 'Pagaste más que el costo cargado. Revisa si falta subir algún costo real.';
  } else {
    rotulo = 'Al día';
    cifra  = comoDinero(0, false);
    clase  = ' cuenta__cifra--bien';
    pie    = 'Todo lo que está cargado ya está pagado.';
  }

  /* ─── Una sola frase de estado, arriba de todo ────────────────────
   * Es lo que Lucila quiere saber antes de mirar un solo número. Mismo
   * criterio que la "salud del presupuesto" del PDF: alerta si el costo
   * se pasó de lo planeado, ojo si lo que falta pagar es una porción
   * material (15%+), bien si no. */
  const planeado  = Number(t.planeado) || 0;
  const sobregiro = costo - planeado;
  const expuesto  = planeado > 0 ? falta / planeado : 0;

  let estado, tono;
  if (planeado > 0 && sobregiro > planeado * 0.01) {
    tono   = 'alerta';
    estado = 'Estás <strong>' + comoDinero(sobregiro, false) +
             '</strong> por encima de lo que habías planeado.';
  } else if (expuesto >= 0.15) {
    tono   = 'ojo';
    estado = 'Vas bien, pero todavía falta pagar <strong>' +
             Math.round(expuesto * 100) + '%</strong> de lo planeado.';
  } else if (costo > 0) {
    tono   = 'bien';
    estado = '<strong>Vas bien.</strong> Lo que falta pagar está dentro de lo planeado.';
  } else {
    tono   = 'ojo';
    estado = 'Todavía no hay gastos cargados.';
  }

  /* ─── Las tres lecturas del PDF, una línea cada una ─────────────── */
  const lecturas = [];

  /* "Si ningún padrino más entrega". Resta lo ENTREGADO de verdad, no lo
     asignado a gastos: un padrino que ya pagó pero cuyo aporte todavía
     no se enlazó a ningún gasto —el caso más común— hacía que esta
     cifra mostrara el costo entero como si nadie hubiera entregado. */
  const prometido = Number(t.prometido_padrinos) || 0;
  if (prometido > 0) {
    const sinEntregar = prometido - (Number(t.entregado_padrinos) || 0);
    if (sinEntregar > 0.01) {
      lecturas.push('Si ningún padrino más entrega, tu bolsillo real es <strong>' +
        comoDinero(t.bolsillo_si_nadie_mas_entrega, false) + '</strong> — hay ' +
        comoDinero(sinEntregar, false) + ' prometidos y todavía sin entregar.');
    }
  }

  /* "Por pagar" es solo lo que YA está cargado como pago pendiente, y
     siempre es menor o igual a "Falta". La diferencia entre las dos es
     dinero que se debe y ni siquiera está anotado — por eso van juntas
     y explicadas, nunca una al lado de la otra sin nada que las
     distinga, que es como estaban. */
  if ((Number(t.por_pagar) || 0) > 0) {
    lecturas.push('<strong>' + comoDinero(t.por_pagar, false) + '</strong> ya está ' +
      'anotado como pago pendiente, en ' +
      pluralizar(t.por_pagar_cuantos, 'pago', 'pagos') + '. El resto de lo que ' +
      'falta todavía no tiene un pago cargado.');
  }

  // La zona gris que el PDF ya declaraba en vez de asumir.
  const sinPago = Number(t.sin_ningun_pago) || 0;
  if (sinPago > 0) {
    lecturas.push('<strong>' + pluralizar(sinPago, 'gasto', 'gastos') +
      '</strong> no ' + (sinPago === 1 ? 'tiene' : 'tienen') +
      ' ningún pago cargado (' + comoDinero(t.sin_ningun_pago_monto, false) + '). ' +
      'No se sabe si ya se pagaron en efectivo o si faltan.');
  }

  /* ─── Las cifras de apoyo, agrupadas por pregunta ────────────────
   * Cada una contesta algo DISTINTO. "De tu bolsillo" baja de tamaño a
   * propósito: es un subconjunto optimista de "Cuesta", no su igual. */
  const renglon = (pregunta, valor) =>
    '<div class="cuenta__renglon"><span>' + pregunta + '</span>' +
    '<span class="cifra">' + valor + '</span></div>';

  const apoyo =
    renglon('Cuánto sale en total', seguro(comoDinero(costo, false))) +
    renglon('Cuánto sale de tu bolsillo' + ayuda('dinero.dos-cifras'),
            seguro(comoDinero(t.propio, false))) +
    renglon('Cuánto llevas pagado', seguro(comoDinero(pagado, false))) +

    /* ⚡ El costo por invitado tiene renglón propio (2026-09-03): es el
       número con el que se decide si se invita a alguien más, y competía
       con otras diez cifras chicas apiladas. Viene null cuando todavía
       no hay nadie confirmado, y se dice por qué en vez de mostrar
       "$0 por invitado" como si costara gratis. */
    renglon('Cuánto sale por invitado',
      (t.costo_por_invitado === null || t.costo_por_invitado === undefined)
        ? '<span class="vacio__texto">en cuanto haya una confirmación</span>'
        : seguro(comoDinero(t.costo_por_invitado, false)) +
          ' <span class="vacio__texto">· ' + seguro(t.confirmados) + '</span>');

  return '' +
    '<div class="cuenta__estado cuenta__estado--' + tono + '">' + estado + '</div>' +

    '<div class="cuenta__rotulo">' + seguro(rotulo) + '</div>' +
    '<div class="cuenta__cifra' + clase + '">' + seguro(cifra) + '</div>' +
    '<div class="cuenta__pie">' + seguro(pie) + '</div>' +

    (lecturas.length
      ? '<div class="cuenta__lecturas">' +
          lecturas.map(l => '<p class="cuenta__lectura">' + l + '</p>').join('') +
        '</div>'
      : '') +

    '<div style="margin-top:var(--esp-3)">' + apoyo + '</div>';
}


/**
 * Qué hay que pagar, cortado por cuándo.
 *
 * ⚡ LA CUARTA PREGUNTA: "¿QUÉ PAGO ESTE MES?" (2026-09-03)
 * Esto listaba los cinco próximos vencimientos, sin agrupar y sin
 * totales — para saber cuánto había que juntar este mes había que
 * sumarlos de cabeza, y el flujo a noventa días solo existía dentro del
 * PDF. Ahora el corte es el que se usa para decidir: este mes, el que
 * viene, y más adelante.
 *
 * Y LOS PAGOS SIN FECHA DEJAN DE SER INVISIBLES. Un pago pendiente sin
 * `fecha_limite` no aparecía en ninguna vista de urgencia —el filtro
 * pedía fecha— pero SÍ sumaba en "Por pagar". Plata que se debe,
 * contada en el total y que no figuraba en ninguna lista: la forma más
 * segura de que a alguien se le pase. Van en su propio grupo, para
 * ponerles fecha.
 *
 * @param {Array} pagos
 * @returns {string} HTML, o '' si no hay ningún pago pendiente.
 */
function bloqueProximosPagos(pagos) {
  const pendientes = (pagos || []).filter(p => p.estado !== 'pagado');
  if (!pendientes.length) return '';

  /* ⚡ LOS DOS MESES SE ARMAN EN HORA LOCAL (2026-09-03)
   *
   * Antes salían de `toISOString()`, que es UTC. México va seis horas
   * atrás, así que el último día del mes, después de las 18:00:
   *
   *   · `esteMes` ya decía el mes siguiente, y
   *   · `mesQueViene` —el día 1 a medianoche LOCAL, pasado a UTC— caía
   *     el último día del mes anterior, o sea el mes ACTUAL.
   *
   * Los dos terminaban valiendo lo mismo: el grupo "El mes que viene"
   * se quedaba vacío y sus pagos desaparecían de la pantalla, la noche
   * anterior al cierre de mes, que es justo cuando se miran.
   */
  const hoy = new Date();
  const mesDe = fecha => String(fecha).slice(0, 7);          // "2026-10"
  const esteMes = mesDe(hoyEnFecha());
  const siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const mesQueViene =
    siguiente.getFullYear() + '-' +
    String(siguiente.getMonth() + 1).padStart(2, '0');

  const grupos = [
    { clave: 'atrasado',  titulo: 'Atrasados',      pagos: [] },
    { clave: 'este',      titulo: 'Este mes',       pagos: [] },
    { clave: 'siguiente', titulo: 'El mes que viene', pagos: [] },
    { clave: 'despues',   titulo: 'Más adelante',   pagos: [] },
    { clave: 'sin_fecha', titulo: 'Sin fecha',      pagos: [] },
  ];
  const porClave = {};
  grupos.forEach(g => { porClave[g.clave] = g; });

  pendientes.forEach(pago => {
    if (!pago.fecha_limite)              { porClave.sin_fecha.pagos.push(pago); return; }
    if (diasHasta(pago.fecha_limite) < 0){ porClave.atrasado.pagos.push(pago);  return; }

    const mes = mesDe(pago.fecha_limite);
    if (mes === esteMes)           porClave.este.pagos.push(pago);
    else if (mes === mesQueViene)  porClave.siguiente.pagos.push(pago);
    else                           porClave.despues.pagos.push(pago);
  });

  const suma = lista => lista.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const filaDePago = pago =>
    '<button class="lista__fila" data-proximo-pago="' + seguro(pago.id) + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' +
          seguro(pago.concepto || pago.gasto_concepto || 'Pago') + '</span>' +
        '<span class="lista__pie">' +
          (pago.fecha_limite
            ? (diasHasta(pago.fecha_limite) < 0
                ? '<span class="etiqueta etiqueta--alerta">Atrasado</span> desde ' +
                  seguro(comoFecha(pago.fecha_limite))
                : 'Vence ' + seguro(comoCuando(pago.fecha_limite)))
            // Se dice qué hacer, no solo que falta el dato.
            : 'Sin fecha — tócalo para ponerle una') +
        '</span>' +
      '</span>' +
      '<span class="lista__lado cifra">' + seguro(comoDinero(pago.monto, false)) + '</span>' +
    '</button>';

  const bloques = grupos
    .filter(g => g.pagos.length)
    .map(g =>
      '<div class="cuenta__renglon" style="border-top:none;padding-bottom:0">' +
        '<span>' + seguro(g.titulo) + ' · ' +
          seguro(pluralizar(g.pagos.length, 'pago', 'pagos')) + '</span>' +
        '<span class="cifra"><strong>' +
          seguro(comoDinero(suma(g.pagos), false)) + '</strong></span>' +
      '</div>' +
      /* Ordenados por fecha dentro del grupo; los sin fecha conservan
         el orden en que vinieron, que es el de carga. */
      g.pagos
        .slice()
        .sort((a, b) => String(a.fecha_limite || '').localeCompare(String(b.fecha_limite || '')))
        .map(filaDePago).join('')
    ).join('');

  return '' +
    '<div class="tarjeta" style="margin-top:var(--esp-2)">' +
      '<div class="tarjeta__titulo">Qué hay que pagar</div>' +
      bloques +
    '</div>';
}


/* ─── 2. SUB-PESTAÑAS ──────────────────────────────────────────────── */

/**
 * Pinta la sección elegida.
 *
 * @returns {void}
 */
function pintarSeccionDeDinero() {
  const cuerpo = buscar('#cuerpo-dinero');
  if (!cuerpo) return;

  const secciones = {
    resumen:      pintarCategorias,
    gastos:       pintarGastos,
    pagos:        pintarPagos,
    padrinos:     pintarPadrinos,
    proveedores:  pintarProveedores,
    cotizaciones: pintarCotizaciones,
  };

  (secciones[SECCION_DINERO] || pintarCategorias)(cuerpo);
}

/**
 * El botón de "agregar" que va al pie de cada sección.
 *
 * @param {string} texto
 * @returns {string} HTML
 */
function botonAgregar(texto) {
  return '<button class="boton boton--principal boton--ancho" id="agregar" ' +
         'style="margin-top:var(--esp-3)">' + seguro(texto) + '</button>';
}


/* ─── 3. CADA SECCIÓN ──────────────────────────────────────────────── */

/**
 * El único gráfico de esta pantalla: de lo que se pensó gastar a lo
 * que ya se pagó de verdad, en tres barras. Responde una decisión
 * concreta —¿cuánto de lo planeado sigue siendo solo un número, y
 * cuánto ya es plata que salió?— sin depender de ninguna librería:
 * es SVG a mano, con los mismos colores que ya usa el resto del panel.
 *
 * @param {Object} t - DINERO.totales
 * @returns {string} HTML, o '' si todavía no hay nada planeado.
 */
function graficoDeFlujoDePresupuesto(t) {
  const planeado = Number(t.planeado) || 0;
  if (planeado <= 0) return '';

  const costo  = Number(t.costo)  || 0;
  const pagado = Number(t.pagado) || 0;
  const referencia = Math.max(planeado, costo, 1);

  const filas = [
    ['Planeado',   planeado, 'var(--texto-tenue)'],
    ['Costo real', costo,    'var(--oro)'],
    ['Pagado',     pagado,   'var(--bien)'],
  ];

  const ALTO_FILA   = 34;
  const ANCHO_BARRA = 220;
  const svgAlto = filas.length * ALTO_FILA;

  const filasSvg = filas.map(([nombre, valor, color], i) => {
    const y = i * ALTO_FILA;
    // Mínimo 3 unidades para que un valor > 0 no desaparezca del todo.
    const ocupado = valor > 0 ? Math.max((valor / referencia) * ANCHO_BARRA, 3) : 0;

    return '' +
      '<text x="0" y="' + (y + 11) + '" font-size="11" fill="var(--texto-suave)">' +
        seguro(nombre) + '</text>' +
      '<rect x="0" y="' + (y + 16) + '" width="' + ANCHO_BARRA + '" height="12" rx="4" ' +
            'fill="var(--borde)"></rect>' +
      '<rect x="0" y="' + (y + 16) + '" width="' + ocupado + '" height="12" rx="4" ' +
            'fill="' + color + '"></rect>' +
      '<text x="' + (ANCHO_BARRA + 8) + '" y="' + (y + 25) + '" font-size="11" ' +
            'fill="var(--texto-suave)">' + seguro(comoDinero(valor, false)) + '</text>';
  }).join('');

  return '' +
    '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
      '<div class="tarjeta__titulo">De lo planeado a lo pagado</div>' +
      '<svg viewBox="0 0 ' + (ANCHO_BARRA + 90) + ' ' + svgAlto + '" ' +
           'style="width:100%;height:auto;display:block;margin-top:var(--esp-1)" ' +
           'role="img" aria-label="Comparación entre lo planeado, el costo real y lo pagado">' +
        filasSvg +
      '</svg>' +
    '</div>';
}

/**
 * Categorías con su barra de gasto contra el techo.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarCategorias(cuerpo) {
  const categorias = filtrarPorBusqueda(DINERO.categorias, ['nombre']);
  if (!categorias.length && sinResultadosDeBusqueda(cuerpo)) return;

  const filas = categorias.map(categoria => {
    const techo    = Number(categoria.techo) || 0;
    const gastado  = Number(categoria.gastado) || 0;
    const planeado = Number(categoria.planeado) || 0;

    // Sin techo no hay con qué comparar: se muestra solo lo gastado.
    const pct = techo > 0 ? porcentaje(gastado, techo) : 0;

    let clase = '';
    if (techo > 0 && gastado > techo) clase = ' barra__relleno--pasado';
    else if (techo > 0 && gastado / techo >= CONFIGURACION.dinero.avisarDesde) {
      clase = ' barra__relleno--cerca';
    }

    const derecha = techo > 0
      ? comoDinero(gastado, false) + ' / ' + comoDinero(techo, false)
      : comoDinero(gastado, false);

    /* ⚡ EL RENGLÓN "SIN CATEGORÍA" (2026-09-03). Los gastos que no
       tienen categoría no aparecían en NINGÚN renglón del desglose —y
       los tres flujos automáticos (pago a proveedor, recibo,
       cotización) crean el gasto justamente sin categoría. Era plata
       que estaba en el total de arriba y en ninguna fila de abajo.
       Viene con id null desde categoriasConGasto() (_lib/dinero.php);
       no es una categoría de verdad, así que no se puede editar ni
       borrar: se toca para ver qué gastos son y ponerles una. */
    const esHuerfanos = categoria.id === null || categoria.id === undefined;

    return '' +
      '<button class="tarjeta" style="display:block;width:100%;text-align:left" ' +
              (esHuerfanos
                ? 'data-sin-categoria="1"'
                : 'data-categoria="' + seguro(categoria.id) + '"') + '>' +
        '<div style="display:flex;justify-content:space-between;gap:var(--esp-2)">' +
          '<span>' + seguro(categoria.nombre) +
            (esHuerfanos
              ? ' <span class="etiqueta etiqueta--ojo">' +
                seguro(pluralizar(categoria.cuantos_gastos, 'gasto', 'gastos')) +
                '</span>'
              : '') +
          '</span>' +
          '<span class="cifra" style="color:var(--texto-suave);white-space:nowrap">' +
            seguro(derecha) + '</span>' +
        '</div>' +
        (techo > 0
          ? '<div class="barra" style="margin-top:var(--esp-1)">' +
              '<div class="barra__relleno' + clase + '" style="width:' +
                Math.min(pct, 100) + '%"></div>' +
            '</div>'
          : '<div class="vacio__texto" style="margin-top:4px">' +
            (esHuerfanos
              // No es una categoría sin techo: es lo que le falta categoría.
              ? 'Estos gastos no están en ninguna categoría, así que no ' +
                'cuentan contra ningún techo. Tócalos para ponerles una.'
              : 'Sin techo definido' + ayuda('dinero.techo')) +
            '</div>') +
        /* Estimado vs. real: `planeado` es lo que se pensó gastar al
           cargar cada gasto, `gastado` es lo que costó DE VERDAD. Verlos
           juntos avisa cuando una categoría todavía es puro cálculo —
           no hay que confundir "lo pensado" con "lo que ya pasó". */
        (planeado > 0
          ? '<div class="vacio__texto" style="margin-top:4px">Estimado ' +
            seguro(comoDinero(planeado, false)) +
            (gastado === 0 ? ' — todavía sin costo real cargado' : '') +
            '</div>'
          : '') +
      '</button>';
  }).join('');

  // El gráfico es del presupuesto entero, no de las categorías que haya
  // dejado el buscador: no tiene sentido esconderlo al filtrar.
  const grafico = BUSQUEDA_DINERO.trim() ? '' : graficoDeFlujoDePresupuesto(DINERO.totales);

  cuerpo.innerHTML = grafico + filas + botonAgregar('Nueva categoría');

  buscarTodos('[data-categoria]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const cat = DINERO.categorias.find(c => String(c.id) === boton.dataset.categoria);
      abrirDetalleDeCategoria(cat);
    });
  });

  // El renglón "Sin categoría" no abre una ficha de categoría —no lo
  // es—: lleva a la lista de gastos filtrada por los que no tienen una.
  const sinCategoria = buscar('[data-sin-categoria]', cuerpo);
  if (sinCategoria) {
    sinCategoria.addEventListener('click', () => abrirGastosSinCategoria());
  }

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCategoria());
}

/**
 * Los gastos que no están en ninguna categoría, para poder ponérsela.
 *
 * POR QUÉ EXISTE
 * El desglose por categoría no los mostraba en ningún renglón, así que
 * eran plata que estaba en el total de arriba y en ninguna fila de
 * abajo. Ahora aparecen en "Sin categoría", y desde acá se arregla de
 * un toque: se abre el gasto y se le pone la que corresponda.
 *
 * @returns {void}
 */
function abrirGastosSinCategoria() {
  const huerfanos = (DINERO.gastos || []).filter(g => !g.categoria_id);

  const cuerpo = abrirHoja('Sin categoría',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Estos gastos cuentan en el total pero no están en ninguna ' +
      'categoría, así que no aparecen en el desglose ni cuentan contra ' +
      'ningún techo. Toca uno para ponerle la suya.' +
    '</p>' +
    (huerfanos.length
      ? huerfanos.map(g =>
          '<button class="lista__fila" data-gasto-huerfano="' + seguro(g.id) + '">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(g.concepto) + '</span>' +
              '<span class="lista__pie">' +
                seguro(g.proveedor_nombre || 'Sin proveedor') + '</span>' +
            '</span>' +
            '<span class="lista__lado cifra">' +
              seguro(comoDinero(costoDelGasto(g), false)) + '</span>' +
          '</button>'
        ).join('')
      : '<p class="vacio__texto">Ya no queda ninguno: todos tienen categoría.</p>')
  );

  buscarTodos('[data-gasto-huerfano]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const gasto = huerfanos.find(g => String(g.id) === boton.dataset.gastoHuerfano);
      if (gasto) formularioGasto(gasto);
    });
  });
}

/**
 * Ficha de solo lectura de una categoría, antes de editar — mismo
 * patrón que abrirDetalleDeProveedor()/abrirDetalleDePadrino(): tocar
 * una fila de la lista nunca abre directo un formulario editable, para
 * que no haya cambios por error de dedo. El botón "Editar" abre
 * formularioCategoria(), que ya trae su propio "Borrar" adentro (ver
 * pieDeFormulario), así que acá no hace falta repetirlo.
 *
 * @param {Object} categoria
 * @returns {void}
 */
function abrirDetalleDeCategoria(categoria) {
  const detalle = [
    ['Techo', categoria.techo > 0 ? comoDinero(categoria.techo, false) : 'Sin techo definido'],
    ['Planeado', comoDinero(categoria.planeado, false)],
    ['Gastado', comoDinero(categoria.gastado, false)],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(categoria.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioCategoria(categoria));
}

/**
 * La lista de gastos.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarGastos(cuerpo) {
  const gastos = filtrarPorBusqueda(DINERO.gastos,
    ['concepto', 'categoria_nombre', 'proveedor_nombre', 'padrino_nombre', 'notas']);
  if (!gastos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!gastos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay gastos',
      'Carga el primero para empezar a ver el presupuesto.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo gasto'));
  } else {
    cuerpo.innerHTML = gastos.map(gasto => {
      const pie = [gasto.categoria_nombre, gasto.proveedor_nombre]
        .filter(Boolean).join(' · ');

      // La etiqueta del padrino cambia de color según si ya entregó:
      // verde entregado, ojo si todavía es una promesa.
      const padrino = gasto.padrino_nombre
        ? '<span class="etiqueta etiqueta--' +
            (gasto.padrino_estado === 'entregado' ? 'bien' : 'ojo') + '">' +
            seguro(gasto.padrino_nombre) + '</span>'
        : '';

      /* `monto_real` es lo que costó DE VERDAD, y se carga cuando ya se
         sabe con certeza (a veces al pagar). Hasta entonces vale $0, y
         mostrar eso a secas parecía un gasto sin plata cuando en
         realidad sí había un presupuestado cargado — solo que en el
         otro campo. Acá se avisa cuál de los dos se está mostrando. */
      const tieneReal = Number(gasto.monto_real) > 0;
      const cifra = tieneReal
        ? seguro(comoDinero(gasto.monto_real, false))
        : (Number(gasto.presupuestado) > 0
            ? seguro(comoDinero(gasto.presupuestado, false)) +
              ' <span style="font-size:11px;color:var(--texto-tenue)">estimado</span>'
            : seguro(comoDinero(0, false)));

      return '' +
        '<button class="lista__fila" data-gasto="' + seguro(gasto.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(gasto.concepto) + '</span>' +
            '<span class="lista__pie">' + seguro(pie) + '</span>' +
            (padrino ? '<span class="menus-mini">' + padrino + '</span>' : '') +
          '</span>' +
          '<span class="lista__lado cifra">' + cifra + '</span>' +
        '</button>';
    }).join('') + botonAgregar('Nuevo gasto');

    buscarTodos('[data-gasto]', cuerpo).forEach(boton => {
      boton.addEventListener('click', () => {
        abrirDetalleDeGasto(DINERO.gastos.find(g => String(g.id) === boton.dataset.gasto));
      });
    });
  }

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioGasto());
}

/**
 * PLAN.tareas ya cargado, pidiéndolo si hace falta — mismo criterio que
 * datosDePlanParaElAsistente() en 34-asistente-datos.js, pero sin pasar
 * por el asistente: cualquier ficha de Dinero puede necesitarlo.
 *
 * @returns {Promise<Array>}
 */
async function tareasParaLaFicha() {
  if (PLAN.tareas && PLAN.tareas.length) return PLAN.tareas;
  try { await traerPlanificador(); } catch (error) { /* sin señal: sigue vacío */ }
  return PLAN.tareas || [];
}

/**
 * Engancha "Nueva tarea" y pinta las tareas ya atadas a esta ficha —
 * mismo patrón en las tres fichas que lo usan (proveedor, gasto,
 * padrino). Fuera de un `await` a propósito, igual que ya hace
 * insertarAdjuntosDeSoloLectura(): la ficha se ve completa al toque,
 * y esto se rellena solo apenas responde.
 *
 * @param {Element} cuerpo
 * @param {'proveedor'|'gasto'|'padrino'} tipo
 * @param {number} id
 * @param {string} tituloParaLaTarea
 * @returns {void}
 */
function engancharTareasDeLaFicha(cuerpo, tipo, id, tituloParaLaTarea) {
  const boton = buscar('#detalle-nueva-tarea', cuerpo);
  if (boton) {
    boton.addEventListener('click', () =>
      formularioTarea({ atada_a_tipo: tipo, atada_a_id: id, titulo: tituloParaLaTarea }));
  }

  tareasParaLaFicha().then(tareas => {
    const relacionadas = tareas.filter(t => t.atada_a_tipo === tipo && t.atada_a_id === id);
    const contenedor = buscar('#tareas-de-la-ficha', cuerpo);
    if (!contenedor || !relacionadas.length) return;

    contenedor.innerHTML =
      '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Tareas</div>' +
      relacionadas.map(t =>
        '<button class="lista__fila" data-tarea-de-la-ficha="' + seguro(t.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(t.titulo) + '</span>' +
            '<span class="lista__pie">' +
              seguro({ pendiente: 'Pendiente', haciendo: 'En eso', hecha: 'Hecha' }[t.estado] || t.estado) +
            '</span>' +
          '</span>' +
        '</button>'
      ).join('');

    buscarTodos('[data-tarea-de-la-ficha]', contenedor).forEach(fila => {
      fila.addEventListener('click', () => {
        const tarea = relacionadas.find(t => String(t.id) === fila.dataset.tareaDeLaFicha);
        if (tarea) formularioTarea(tarea);
      });
    });
  });
}

/**
 * Cuánto falta pagar de un gasto, y en qué estado está.
 *
 * POR QUÉ EXISTE
 * La ficha del gasto listaba sus pagos SIN SUMARLOS: contestar "¿cuánto
 * falta pagar de esto?" —la pregunta más frecuente sobre un gasto—
 * había que hacerlo de cabeza mirando una lista. Y elegir a cuál de los
 * gastos de un proveedor va un pago nuevo es imposible de decidir sin
 * este número.
 *
 * Solo cuentan los pagos MARCADOS COMO PAGADOS: un pago pendiente es
 * una intención, no plata que salió.
 *
 * @param {Object} gasto
 * @returns {{costo:number, pagado:number, saldo:number, estado:string}}
 */
function saldoDelGasto(gasto) {
  const costo = costoDelGasto(gasto);

  const pagado = (DINERO.pagos || [])
    .filter(p => p.gasto_id === gasto.id && p.estado === 'pagado')
    .reduce((suma, p) => suma + (Number(p.monto) || 0), 0);

  const saldo = costo - pagado;

  /* El medio centavo de holgura es para que un redondeo no convierta un
     gasto liquidado en "faltan $0.00". */
  const estado =
    pagado === 0   ? 'sin pagar' :
    saldo >  0.005 ? 'abonado'   :
    saldo < -0.005 ? 'pagado de más' :
                     'liquidado';

  return { costo: costo, pagado: pagado, saldo: saldo, estado: estado };
}

/**
 * Ficha de solo lectura de un gasto, antes de editar.
 *
 * @param {Object} gasto
 * @returns {void}
 */
function abrirDetalleDeGasto(gasto) {
  const detalle = [
    ['Categoría', gasto.categoria_nombre || '—'],
    ['Proveedor', gasto.proveedor_nombre || '—'],
    ['Lo cubre', gasto.padrino_nombre
      ? gasto.padrino_nombre + (gasto.padrino_estado === 'entregado' ? ' (ya entregó)' : ' (todavía no entrega)')
      : 'Tu bolsillo'],
    ['Presupuestado', comoDinero(gasto.presupuestado, false)],
    ['Costo real', Number(gasto.monto_real) > 0 ? comoDinero(gasto.monto_real, false) : 'Todavía sin cargar'],
    ['Notas', gasto.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  /* ⚡ EL GASTO ERA UNA ISLA (2026-08-27): no mostraba sus propios pagos
     ni tenía forma de generar/ver un recibo o contrato, a pesar de ser
     el vínculo más directo y estable al proveedor (gastos.proveedor_id
     es una FK real; desde un pago hay que pasar por el gasto para
     llegar ahí). Mismo patrón que "Pagos registrados" en
     abrirDetalleDeProveedor, pero acotado a ESTE gasto. */
  const pagosDeEsteGasto = (DINERO.pagos || []).filter(p => p.gasto_id === gasto.id);

  /* ⚡ LA PRIMERA PREGUNTA: "¿CUÁNTO FALTA PAGAR DE ESTO?" (2026-09-03)
     La ficha listaba sus pagos SIN SUMARLOS: contestar la pregunta más
     frecuente sobre un gasto había que hacerlo de cabeza, mirando una
     lista. Ahora el saldo va arriba de la lista y con estado explícito
     (sin pagar / abonado / liquidado / pagado de más), que es lo que
     dice si hay algo que hacer o no. */
  const s = saldoDelGasto(gasto);
  const comoSeLee = {
    'sin pagar':     ['alerta', 'Sin pagar'],
    'abonado':       ['ojo',    'Abonado'],
    'liquidado':     ['bien',   'Liquidado'],
    'pagado de más': ['alerta', 'Pagado de más'],
  }[s.estado];

  const seccionSaldo = s.costo > 0
    ? '<div class="cuenta__renglon" style="border-top:none;margin-top:var(--esp-3)">' +
        '<span>Falta pagar de este gasto</span>' +
        '<span class="cifra"><strong>' +
          seguro(comoDinero(Math.max(0, s.saldo), false)) + '</strong></span>' +
      '</div>' +
      '<p class="vacio__texto">' +
        '<span class="etiqueta etiqueta--' + comoSeLee[0] + '">' +
          seguro(comoSeLee[1]) + '</span> ' +
        'Cuesta ' + seguro(comoDinero(s.costo, false)) +
        ' y lleva ' + seguro(comoDinero(s.pagado, false)) + ' pagados' +
        (s.saldo < -0.005
          ? ' — ' + seguro(comoDinero(Math.abs(s.saldo), false)) + ' de más.'
          : '.') +
      '</p>' +

      /* ⚡ LA FICHA PUEDE PAGAR, NO SOLO MIRAR (2026-09-03)
         Mostraba la deuda y no dejaba hacer nada con ella: para cargar
         el pago del gasto que se estaba mirando había que cerrar,
         desplazarse, entrar a Pagos, bajar hasta el final, tocar "Nuevo
         pago" y volver a elegir el proveedor y el gasto que ya se
         tenían delante. Siete toques para algo que son dos. */
      (s.saldo > 0.005
        ? '<button class="boton boton--principal boton--ancho" ' +
                  'id="detalle-pagar" style="margin-top:var(--esp-2)">' +
            'Registrar un pago de ' + seguro(comoDinero(s.saldo, false)) +
          '</button>'
        : '')
    : '';

  const seccionPagos = seccionSaldo + (pagosDeEsteGasto.length
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Pagos de este gasto</div>' +
      '<div class="lista">' +
        pagosDeEsteGasto.map(p =>
          '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(p.concepto || 'Pago') + '</span>' +
              '<span class="lista__pie">' + seguro(p.estado === 'pagado'
                ? 'Pagado ' + comoFecha(p.fecha_pagado) : 'Pendiente') + '</span>' +
            '</span>' +
            '<span class="cifra">' + seguro(comoDinero(p.monto, false)) + '</span>' +
          '</div>'
        ).join('') +
      '</div>'
    // Sin ningún pago cargado no se sabe si ya se pagó o si falta: se
    // dice, en vez de dejar el silencio como si fuera un cero.
    : '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
      'Este gasto no tiene ningún pago cargado.</p>');

  const proveedor = gasto.proveedor_id
    ? (DINERO.proveedores || []).find(p => p.id === gasto.proveedor_id)
    : null;

  // Mismos 4 botones que la ficha de proveedor, resolviendo el
  // proveedor directo desde gasto.proveedor_id — sin la indirección
  // frágil gasto→DINERO.gastos→proveedor que tenía el pago.
  const seccionDocumentos = proveedor
    ? '<div class="acciones" style="margin-top:var(--esp-3)">' +
        '<button class="boton" id="detalle-recibo">Generar recibo</button>' +
        '<button class="boton" id="detalle-contrato">Generar contrato</button>' +
      '</div>' +
      '<div class="acciones" style="margin-top:var(--esp-2)">' +
        '<button class="boton" id="detalle-ver-recibos">Ver recibos</button>' +
        '<button class="boton" id="detalle-ver-contratos">Ver contratos</button>' +
      '</div>'
    : '';

  const cuerpo = abrirHoja(gasto.concepto,
    '<div class="detalle">' + detalle + '</div>' +
    seccionPagos +
    seccionDocumentos +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'gasto', gasto.id, 'Facturas y comprobantes');
  engancharTareasDeLaFicha(cuerpo, 'gasto', gasto.id, 'Sobre ' + gasto.concepto);

  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: gasto.concepto, tipo: 'gasto', id: gasto.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioGasto(gasto));

  /* Pagar desde acá: el formulario abre con el gasto, el proveedor, el
     monto que falta y la fecha de hoy ya puestos. No queda nada que
     elegir salvo confirmar. */
  const botonPagar = buscar('#detalle-pagar', cuerpo);
  if (botonPagar) {
    botonPagar.addEventListener('click', () => formularioPago({
      gasto_id:  gasto.id,
      concepto:  gasto.concepto,
      monto:     s.saldo,
      estado:    'pagado',
      _desdeGasto: true,
    }));
  }

  if (proveedor) {
    buscar('#detalle-recibo', cuerpo).addEventListener('click', () => abrirGeneradorDeRecibo(proveedor));
    buscar('#detalle-contrato', cuerpo).addEventListener('click', () => abrirGeneradorDeContrato(proveedor));
    buscar('#detalle-ver-recibos', cuerpo).addEventListener('click',
      () => abrirListaDeDocumentos('recibo', proveedor));
    buscar('#detalle-ver-contratos', cuerpo).addEventListener('click',
      () => abrirListaDeDocumentos('contrato', proveedor));
  }
}

/**
 * La lista de pagos, pendientes primero.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarPagos(cuerpo) {
  const pagos = filtrarPorBusqueda(DINERO.pagos,
    ['concepto', 'gasto_concepto', 'metodo', 'notas']);
  if (!pagos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!pagos.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay pagos',
      'Carga los anticipos y las fechas límite para que el panel te avise.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo pago'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
    return;
  }

  cuerpo.innerHTML = pagos.map(pago => {
    const pagado   = pago.estado === 'pagado';
    const atrasado = !pagado && pago.fecha_limite && diasHasta(pago.fecha_limite) < 0;

    const etiqueta = pagado
      ? '<span class="etiqueta etiqueta--bien">Pagado</span>'
      : atrasado
        ? '<span class="etiqueta etiqueta--alerta">Atrasado</span>'
        : '<span class="etiqueta etiqueta--tenue">Pendiente</span>';

    const cuando = pago.fecha_limite
      ? (pagado ? comoFecha(pago.fecha_pagado) : 'vence ' + comoCuando(pago.fecha_limite))
      : '';

    return '' +
      '<div class="lista__fila">' +
        // La casilla marca como pagado de un toque, sin abrir nada.
        '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--oro)" ' +
               (pagado ? 'checked ' : '') +
               'data-pagar="' + seguro(pago.id) + '" aria-label="Marcar como pagado">' +
        '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                'data-pago="' + seguro(pago.id) + '">' +
          '<span class="lista__titulo">' +
            seguro(pago.concepto || pago.gasto_concepto || 'Pago') + '</span>' +
          '<span class="lista__pie">' + seguro(cuando) + '</span>' +
        '</button>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(comoDinero(pago.monto, false)) + '</span>' +
          '<br>' + etiqueta +
        '</span>' +
      '</div>';
  }).join('') + botonAgregar('Nuevo pago');

  buscarTodos('[data-pagar]', cuerpo).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      const seMarcoComoPagado = casilla.checked;
      try {
        await mandar('presupuesto.php?accion=marcar_pagado', { id: casilla.dataset.pagar });
        registrarEvento('accion', 'marcar_pago');
        ensuciarVistas('resumen');
        dibujarDinero();

        // Mismo ofrecimiento que al dar de alta un pago ya pagado (ver
        // ofrecerGenerarReciboDeEstePago) — acá el pago YA existía, así
        // que se busca en DINERO.pagos en vez de usar la respuesta del
        // servidor. Nunca al DESmarcar: eso no es un pago nuevo.
        if (seMarcoComoPagado) {
          const pago = DINERO.pagos.find(p => String(p.id) === casilla.dataset.pagar);
          // DINERO.pagos todavía tiene el estado VIEJO acá (dibujarDinero()
          // recién disparó el pedido, no esperó la respuesta) — se fuerza
          // 'pagado' a mano en vez de confiar en lo que diga esa copia.
          if (pago) ofrecerGenerarReciboDeEstePago({ ...pago, estado: 'pagado' }, { id: pago.id });
        }
      } catch (error) {
        casilla.checked = !casilla.checked;   // deshacer si falló
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-pago]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleDePago(DINERO.pagos.find(p => String(p.id) === boton.dataset.pago));
    });
  });

  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPago());
}

/**
 * Ficha de solo lectura de un pago, antes de editar. La casilla de
 * "marcar pagado" en la lista sigue siendo de un toque, a propósito —
 * es una acción chica y reversible; esto es para no editar el monto o
 * la fecha por error.
 *
 * @param {Object} pago
 * @returns {void}
 */
async function abrirDetalleDePago(pago) {
  const pagado = pago.estado === 'pagado';

  const detalle = [
    ['Parte de', pago.gasto_concepto || 'Suelto (no pertenece a ningún gasto)'],
    ['Monto', comoDinero(pago.monto, false)],
    ['Estado', pagado ? 'Pagado' : 'Pendiente'],
    [pagado ? 'Pagado el' : 'Vence el',
      (pagado ? pago.fecha_pagado : pago.fecha_limite)
        ? comoFecha(pagado ? pago.fecha_pagado : pago.fecha_limite) : '—'],
    ['Método', pago.metodo || '—'],
    ['Notas', pago.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  // El proveedor de este pago, buscado vía su gasto — DINERO.gastos ya
  // trae proveedor_id (no hace falta pedirle nada nuevo al servidor).
  const gasto = (DINERO.gastos || []).find(g => g.id === pago.gasto_id);
  const proveedor = gasto ? (DINERO.proveedores || []).find(p => p.id === gasto.proveedor_id) : null;

  const cuerpo = abrirHoja(pago.concepto || pago.gasto_concepto || 'Pago',
    '<div class="detalle">' + detalle + '</div>' +
    (proveedor
      ? '<div class="acciones" style="margin-top:var(--esp-3)">' +
          '<button class="boton" id="detalle-generar-recibo">Generar recibo</button>' +
        '</div>'
      : '') +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'pago', pago.id, 'Comprobante del pago');

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioPago(pago));

  /* ─── CAMINO SIMÉTRICO AL DE LA FICHA DE PROVEEDOR ───────────────────
     Si Lucila ya cargó el pago a mano en Presupuesto (el flujo de
     siempre) y después quiere el PDF, no hace falta repetir monto,
     fecha ni forma de pago: recibos.php ya los saca directo del pago
     cuando le llega pago_id (ver la nota grande en ese archivo). Antes
     de ofrecer el botón, se chequea que este pago no tenga ya un
     recibo — nunca dos recibos del mismo pago por error. */
  const botonRecibo = buscar('#detalle-generar-recibo', cuerpo);
  if (botonRecibo && proveedor) {
    let yaTieneRecibo = false;
    try {
      const existentes = await traer('recibos.php?accion=listar&pago_id=' + pago.id);
      yaTieneRecibo = Array.isArray(existentes) && existentes.length > 0;
    } catch (error) {
      // Sin señal: se deja el botón, en el peor caso generaría uno de más.
    }

    if (yaTieneRecibo) {
      botonRecibo.textContent = 'Ya tiene recibo — verlo';
      botonRecibo.addEventListener('click', () => abrirListaDeDocumentos('recibo', proveedor));
    } else {
      botonRecibo.addEventListener('click', async () => {
        botonRecibo.disabled = true;
        try {
          const resultado = await mandar('recibos.php?accion=generar', { pago_id: pago.id });
          cerrarHoja(true);
          abrirResultadoDeDocumento('Recibo ' + resultado.numero + ' generado.',
            resultado.archivo_id, resultado.nombre, proveedor);
        } catch (error) {
          avisar(error.message, true);
          botonRecibo.disabled = false;
        }
      });
    }
  }
}

/**
 * La lista de padrinos.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
/**
 * Cuánto suma cada etapa del compromiso de los padrinos ("lo habló",
 * "ya lo confirmó", "ya entregó"), para ver el embudo de un vistazo.
 *
 * Solo cuenta los que aportan en dinero: "en especie" no tiene un
 * monto comparable de verdad —el que se carga es solo aproximado—, y
 * sumarlo junto con dinero real daría un total que no significa nada.
 *
 * @param {Array} padrinos
 * @returns {string} HTML, o '' si no hay ninguno que aporte en dinero.
 */
function resumenDePipelineDePadrinos(padrinos) {
  const enDinero = (padrinos || []).filter(p => p.tipo_aporte !== 'especie');
  if (!enDinero.length) return '';

  const porEstado = { hablado: 0, confirmado: 0, entregado: 0 };
  enDinero.forEach(p => {
    const clave = porEstado.hasOwnProperty(p.estado) ? p.estado : 'hablado';
    porEstado[clave] += Number(p.monto) || 0;
  });

  const etiquetas = [
    ['hablado', 'Hablado'], ['confirmado', 'Confirmado'], ['entregado', 'Ya entregó'],
  ];

  return '' +
    '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
      '<div class="tarjeta__titulo">Cuánto va en cada etapa' +
        ayuda('dinero.pipeline-padrinos') + '</div>' +
      etiquetas.map(([clave, texto]) =>
        '<div class="detalle__rotulo" style="display:flex;justify-content:space-between;' +
             'padding:var(--esp-1) 0">' +
          '<span>' + seguro(texto) + '</span>' +
          '<span class="cifra">' + seguro(comoDinero(porEstado[clave], false)) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
}

function pintarPadrinos(cuerpo) {
  const padrinos = filtrarPorBusqueda(DINERO.padrinos,
    ['nombre', 'apadrina', 'telefono', 'correo', 'notas']);
  if (!padrinos.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!padrinos.length) {
    cuerpo.innerHTML = '';
    /* El "?" va acá, en el vacío, que es justo cuando alguien se
       pregunta qué se supone que va en esta sección. */
    cuerpo.insertAdjacentHTML('beforeend',
      '<div class="tarjeta__titulo">Padrinos' + ayuda('dinero.padrinos') + '</div>');
    pintarVacio(cuerpo, 'Todavía no hay padrinos',
      'Anota quién apadrina qué para saber cuánto sale de tu bolsillo de verdad.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo padrino'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
    return;
  }

  const estados = {
    hablado:    ['tenue',  'Hablado'],
    confirmado: ['ojo',    'Confirmado'],
    entregado:  ['bien',   'Entregado'],
  };

  cuerpo.innerHTML = resumenDePipelineDePadrinos(DINERO.padrinos) +

  padrinos.map(padrino => {
    const estado = estados[padrino.estado] || estados.hablado;

    const monto = padrino.tipo_aporte === 'especie'
      ? 'En especie'
      : comoDinero(padrino.monto, false);

    return '' +
      '<button class="lista__fila" data-padrino="' + seguro(padrino.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(padrino.nombre) + '</span>' +
          '<span class="lista__pie">' +
            seguro(padrino.apadrina || 'Sin asignar') + '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(monto) + '</span><br>' +
          '<span class="etiqueta etiqueta--' + estado[0] + '">' + estado[1] + '</span>' +
        '</span>' +
      '</button>';
  }).join('') + botonAgregar('Nuevo padrino');

  buscarTodos('[data-padrino]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleDePadrino(
        DINERO.padrinos.find(p => String(p.id) === boton.dataset.padrino));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioPadrino());
}

/**
 * Ficha de solo lectura de un padrino, antes de editar. Mismo patrón que
 * abrirDetalleDeInvitado() (08-vista-invitados.js).
 *
 * @param {Object} padrino
 * @returns {void}
 */
function abrirDetalleDePadrino(padrino) {
  const monto = padrino.tipo_aporte === 'especie'
    ? 'En especie' + (padrino.monto > 0 ? ' (aprox. ' + comoDinero(padrino.monto, false) + ')' : '')
    : comoDinero(padrino.monto, false);

  const estados = { hablado: 'Hablado', confirmado: 'Confirmado en firme', entregado: 'Ya entregó' };

  const detalle = [
    ['Apadrina', padrino.apadrina || '—'],
    ['Aporte', monto],
    ['Estado', estados[padrino.estado] || padrino.estado || '—'],
    ['Teléfono', padrino.telefono || '—'],
    ['Correo', padrino.correo || '—'],
    ['Notas', padrino.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  /* ⚡ LOS TRES NÚMEROS JUNTOS (2026-09-03)
     Prometido, aplicado y entregado cuentan una parte distinta de la
     misma historia, y ver solo una desorienta:
       · prometido = lo que dijo que iba a poner.
       · aplicado  = cuánto de eso ya quedó atado a un gasto concreto
                     (el SQL lo calculaba y el dato se tiraba).
       · entregado = cuánto puso de verdad.
     Cuando no coinciden hay algo que hacer, y se dice cuál. */
  const prometido = Number(padrino.monto) || 0;
  const aplicado  = Number(padrino.cubre) || 0;
  const entregado = Number(padrino.monto_entregado) || 0;

  const desajustes = [];
  if (prometido - entregado > 0.01) {
    desajustes.push('Faltan ' + comoDinero(prometido - entregado, false) +
      ' por entregar.');
  }
  if (prometido - aplicado > 0.01) {
    desajustes.push('Hay ' + comoDinero(prometido - aplicado, false) +
      ' prometidos que todavía no están asignados a ningún gasto, así que ' +
      'no bajan «De tu bolsillo».');
  }
  if (aplicado - prometido > 0.01) {
    desajustes.push('Cubre ' + comoDinero(aplicado - prometido, false) +
      ' más de lo que prometió: revisa los gastos que tiene asignados.');
  }

  const seccionAporte = padrino.tipo_aporte === 'dinero' && prometido > 0
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Su aporte</div>' +
      '<div class="cuenta__renglon" style="border-top:none">' +
        '<span>Prometió</span><span class="cifra">' +
        seguro(comoDinero(prometido, false)) + '</span></div>' +
      '<div class="cuenta__renglon">' +
        '<span>Ya entregó</span><span class="cifra">' +
        seguro(comoDinero(entregado, false)) + '</span></div>' +
      '<div class="cuenta__renglon">' +
        '<span>Aplicado a gastos</span><span class="cifra">' +
        seguro(comoDinero(aplicado, false)) + '</span></div>' +
      desajustes.map(d =>
        '<p class="vacio__texto" style="color:var(--ojo)">' + seguro(d) + '</p>'
      ).join('')
    : '';

  /* ─── GASTOS QUE CUBRE (el sentido que faltaba) ──────────────────────
     gastos.padrino_id ya conecta gasto→padrino, y abrirDetalleDeGasto
     ya muestra "Lo cubre" con el nombre del padrino. Acá faltaba el
     sentido inverso: antes había que ir a la pestaña Gastos y buscar a
     mano cuáles tenían este nombre. DINERO.gastos ya está cargado. */
  const gastosQueCubre = (DINERO.gastos || []).filter(g => g.padrino_id === padrino.id);
  const seccionGastos = gastosQueCubre.length
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Gastos que cubre</div>' +
      gastosQueCubre.map(g =>
        '<button class="lista__fila" data-gasto-que-cubre="' + seguro(g.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(g.concepto) + '</span>' +
          '</span>' +
          '<span class="lista__lado cifra">' + seguro(comoDinero(costoDelGasto(g), false)) + '</span>' +
        '</button>'
      ).join('')
    : '';

  const cuerpo = abrirHoja(padrino.nombre,
    '<div class="detalle">' + detalle + '</div>' +
    seccionAporte +

    /* ⚡ ANOTAR UNA ENTREGA DEJA DE SER "EDITAR EL PADRINO" (2026-09-03)
       Es lo que más se hace sobre un padrino, y costaba siete toques:
       abrir la ficha, bajar hasta el final, Editar, bajar hasta el
       quinto campo de nueve, escribir, cambiar el estado en un
       desplegable, guardar. Y como el monto y el estado no están
       enlazados por nada, era fácil dejar "entregó $30,000" con estado
       "Hablado" y que las dos pantallas que resumen padrinos se
       contradijeran.

       Un botón, un campo, guardar. El estado se deduce de la cifra. */
    (padrino.tipo_aporte === 'dinero' && prometido > 0 && prometido - entregado > 0.005
      ? '<button class="boton boton--principal boton--ancho" ' +
                'id="padrino-entrego" style="margin-top:var(--esp-2)">' +
          'Anotar una entrega' +
        '</button>'
      : '') +

    seccionGastos +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="detalle-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'padrino', padrino.id, 'Comprobante de lo entregado');
  engancharTareasDeLaFicha(cuerpo, 'padrino', padrino.id, 'Sobre ' + padrino.nombre);

  buscarTodos('[data-gasto-que-cubre]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const gasto = gastosQueCubre.find(g => String(g.id) === boton.dataset.gastoQueCubre);
      if (gasto) abrirDetalleDeGasto(gasto);
    });
  });

  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: 'Sobre ' + padrino.nombre, tipo: 'padrino', id: padrino.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioPadrino(padrino));

  const botonEntrego = buscar('#padrino-entrego', cuerpo);
  if (botonEntrego) {
    botonEntrego.addEventListener('click', () =>
      anotarEntregaDePadrino(padrino, prometido, entregado));
  }

  buscar('#detalle-borrar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
    guardarDinero('borrar_padrino', { id: padrino.id }, 'Eliminado.');
  });
}

/**
 * La lista de proveedores.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarProveedores(cuerpo) {
  const proveedores = filtrarPorBusqueda(DINERO.proveedores,
    ['nombre', 'servicio', 'contacto', 'telefono', 'correo', 'notas']);
  if (!proveedores.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!proveedores.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay proveedores',
      'El salón, el DJ, el fotógrafo, el banquete…');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nuevo proveedor'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioProveedor());
    return;
  }

  const estados = {
    candidato:  ['tenue',  'Candidato'],
    contratado: ['info',   'Contratado'],
    pagado:     ['bien',   'Pagado'],
    cancelado:  ['alerta', 'Cancelado'],
  };

  cuerpo.innerHTML = proveedores.map(prov => {
    const estado = estados[prov.estado] || estados.candidato;
    const falta  = (Number(prov.monto_total) || 0) - (Number(prov.pagado_real) || 0);

    return '' +
      '<button class="lista__fila" data-proveedor="' + seguro(prov.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(prov.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(prov.servicio || '') +
            (falta > 0 ? ' · falta ' + seguro(comoDinero(falta, false)) : '') +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="cifra">' + seguro(comoDinero(prov.monto_total, false)) + '</span>' +
          '<br><span class="etiqueta etiqueta--' + estado[0] + '">' + estado[1] + '</span>' +
        '</span>' +
      '</button>';
  }).join('') + botonAgregar('Nuevo proveedor');

  buscarTodos('[data-proveedor]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleDeProveedor(
        DINERO.proveedores.find(p => String(p.id) === boton.dataset.proveedor));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioProveedor());
}

/**
 * Las cotizaciones, agrupadas por servicio para poder compararlas.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
/**
 * Un resumen de una línea de "qué incluye" una cotización, para la
 * fila de la lista. Prefiere los ítems estructurados; si todavía no se
 * migró (formato viejo, texto corrido), cae al texto tal cual.
 *
 * @param {Object} cot
 * @returns {string}
 */
function resumenDeQueIncluye(cot) {
  if (cot.detalle_items && cot.detalle_items.length) {
    return cot.detalle_items.map(it => it.texto).join(' · ');
  }
  return cot.que_incluye || '';
}

function pintarCotizaciones(cuerpo) {
  const cotizaciones = filtrarPorBusqueda(DINERO.cotizaciones,
    ['servicio', 'proveedor', 'que_incluye', 'notas']);
  if (!cotizaciones.length && sinResultadosDeBusqueda(cuerpo)) return;

  if (!cotizaciones.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay cotizaciones',
      'Carga las que vayas pidiendo para compararlas lado a lado antes de contratar.');
    cuerpo.insertAdjacentHTML('beforeend', botonAgregar('Nueva cotización'));
    buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
    return;
  }

  /* Se agrupan por servicio porque el sentido de una cotización es
     compararla con las otras del MISMO servicio. Una lista plana
     mezclaría el DJ con el pastel y no serviría para decidir nada. */
  const porServicio = {};
  cotizaciones.forEach(cot => {
    const clave = cot.servicio || 'Sin servicio';
    if (!porServicio[clave]) porServicio[clave] = [];
    porServicio[clave].push(cot);
  });

  cuerpo.innerHTML = Object.keys(porServicio).sort().map(servicio => {
    const grupo = porServicio[servicio];

    // La más barata del grupo se marca, que es la información que uno
    // busca de un vistazo al comparar presupuestos. Se compara con el
    // mismo número que se muestra: precio por persona contra precio por
    // persona, precio cerrado contra precio cerrado.
    const menor = Math.min(...grupo.map(c =>
      (c.tipo_precio === 'por_persona' ? Number(c.precio_pp) : Number(c.monto)) || Infinity
    ));

    const filas = grupo.map(cot => {
      const monto = Number(cot.monto) || 0;

      /* Las que cobran "por persona" casi nunca tienen nada cargado en
         `monto` —ese campo es para precio CERRADO— y su plata de verdad
         vive en `precio_pp`. Mostrar el `monto` a secas ahí daba un "$0"
         que confundía: la cotización sí tenía un precio, solo que no en
         ese campo. */
      const esPorPersona = cot.tipo_precio === 'por_persona';
      const precioPp = Number(cot.precio_pp) || 0;

      const cifra = (esPorPersona && precioPp > 0)
        ? seguro(comoDinero(precioPp, false)) + ' <span style="font-size:11px;' +
          'color:var(--texto-tenue)">/ persona</span>'
        : seguro(comoDinero(monto, false));

      /* Y "la más barata" se compara con el mismo criterio que se
         muestra, no siempre contra `monto`: comparar el precio cerrado
         de una contra el por-persona de otra no dice nada. */
      const comparable = esPorPersona ? precioPp : monto;

      const marcas = [];
      if (Number(cot.elegida) === 1) {
        marcas.push('<span class="etiqueta etiqueta--bien">Elegida</span>');
      } else if (comparable > 0 && comparable === menor && grupo.length > 1) {
        marcas.push('<span class="etiqueta etiqueta--info">Más barata</span>');
      }
      if (cot.vigencia && diasHasta(cot.vigencia) < 0) {
        marcas.push('<span class="etiqueta etiqueta--alerta">Vencida</span>');
      }

      return '' +
        '<button class="lista__fila" data-cotizacion="' + seguro(cot.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(cot.proveedor) + '</span>' +
            '<span class="lista__pie">' +
              seguro(acortar(resumenDeQueIncluye(cot), 60)) + '</span>' +
            (marcas.length ? '<span class="menus-mini">' + marcas.join('') + '</span>' : '') +
          '</span>' +
          '<span class="lista__lado cifra">' + cifra + '</span>' +
        '</button>';
    }).join('');

    return '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
             seguro(servicio) + '</div>' + filas;
  }).join('') + botonAgregar('Nueva cotización');

  /* El botón de comparar va ARRIBA de la lista, no al final: comparar
     es para lo que se cargan las cotizaciones, y dejarlo abajo de veinte
     renglones lo esconde justo de quien más lo necesita. */
  cuerpo.insertAdjacentHTML('afterbegin',
    '<button class="boton boton--principal boton--ancho" id="cot-comparar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      'Comparar lado a lado' +
    '</button>');

  buscar('#cot-comparar', cuerpo).addEventListener('click', abrirComparador);

  buscarTodos('[data-cotizacion]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirVistaPreviaDeCotizacion(
        DINERO.cotizaciones.find(c => String(c.id) === boton.dataset.cotizacion));
    });
  });
  buscar('#agregar', cuerpo).addEventListener('click', () => formularioCotizacion());
}

/**
 * Ficha de solo lectura de una cotización, antes de editar.
 *
 * NOTA DE NOMBRE: no se llama abrirDetalleDeCotizacion() a propósito.
 * 21-cotizador.js (el comparador de cotizaciones, más viejo que esta
 * función) ya tiene una función con exactamente ese nombre — toma un id
 * numérico y abre el desglose de costos por invitados, no esta ficha.
 * Como no hay módulos, los dos <script> comparten un mismo espacio de
 * nombres global: la que carga después (21-cotizador.js, ver
 * index.html) pisaba a esta silenciosamente, y la lista de Cotizaciones
 * terminaba llamando accion=ver de cotizador.php con el objeto entero
 * como "id" — de ahí el "Esa cotización no existe" que reportó Lucila.
 *
 * @param {Object} cotizacion
 * @returns {void}
 */
function abrirVistaPreviaDeCotizacion(cotizacion) {
  const esPorPersona = cotizacion.tipo_precio === 'por_persona';
  const precio = esPorPersona
    ? comoDinero(cotizacion.precio_pp, false) + ' / persona'
    : comoDinero(cotizacion.monto, false);

  const detalle = [
    ['Servicio', cotizacion.servicio],
    ['Precio', precio],
    ['Vale hasta', cotizacion.vigencia ? comoFecha(cotizacion.vigencia) : '—'],
    ['Teléfono', cotizacion.telefono || '—'],
    ['Elegida', Number(cotizacion.elegida) === 1 ? 'Sí' : 'No'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(cotizacion.proveedor,
    '<div class="detalle">' + detalle + '</div>' +
    vinetasDeQueIncluye(cotizacion.detalle_items) +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  insertarAdjuntosDeSoloLectura(cuerpo, 'cotizacion', cotizacion.id, 'La cotización en PDF o foto');

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioCotizacion(cotizacion));
}


/* ─── 4. FORMULARIOS ───────────────────────────────────────────────── */

/**
 * Guarda y refresca. Lo usan los seis formularios.
 *
 * @param {string} accion - 'guardar_gasto', 'borrar_pago'…
 * @param {Object} carga
 * @param {string} mensaje
 * @returns {Promise<void>}
 */
async function guardarDinero(accion, carga, mensaje, despues) {
  try {
    const resultado = await mandar('presupuesto.php?accion=' + accion, carga);
    cerrarHoja(true);
    avisar(mensaje);
    // El Resumen muestra totales de dinero: hay que refrescarlo también.
    ensuciarVistas('resumen');
    dibujarDinero();
    // Para acciones que quieran hacer algo más con lo recién guardado
    // (ver ofrecerGenerarReciboDeEstePago, más abajo) — opcional,
    // ninguna otra pantalla lo necesita todavía.
    if (despues) despues(resultado);
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Al dar de alta un pago YA marcado "pagado", ofrece generar su recibo
 * ahí mismo — sin esto, Lucila tendría que ir a buscar al proveedor y
 * tocar "Generar recibo" por separado para algo que ya sabe que pasó.
 * Nunca se genera solo: siempre pregunta primero.
 *
 * Solo tiene sentido si el pago quedó atado a un gasto con proveedor
 * —recibos.php necesita saber a quién va el recibo—; un pago suelto o
 * de un gasto sin proveedor simplemente avisa que no puede, en vez de
 * quedarse callado (ver la nota de más abajo, 2026-08-27).
 *
 * ⚡ YA NO RESUELVE EL PROVEEDOR ACÁ (2026-08-27). Antes se buscaba
 * `gasto = DINERO.gastos.find(...)` y de ahí el proveedor, a mano, en el
 * cliente — una segunda copia de una resolución que `recibos.php` YA
 * hace del lado del servidor con solo el `pago_id` (ver
 * admin/api/recibos.php, case 'generar'). Esa copia dependía de que
 * `DINERO.gastos` ya tuviera el gasto correcto en memoria, y fallaba en
 * silencio si no — sin avisar nunca por qué "no pasaba nada". Ahora se
 * pregunta siempre que el pago quedó marcado pagado, se le pasa el
 * trabajo al servidor, y si el servidor dice que no hay proveedor (pago
 * suelto), se avisa con un mensaje claro en vez de callar.
 *
 * @param {Object} carga     Lo que se mandó a guardar (tiene estado).
 * @param {Object} resultado La respuesta del servidor (tiene id).
 * @returns {Promise<void>}
 */
async function ofrecerGenerarReciboDeEstePago(carga, resultado) {
  // Esto sí queda en silencio a propósito: un pago que no está marcado
  // "pagado" todavía no ocurrió de verdad, así que no corresponde
  // ofrecerle un recibo — no es un error, es la conducta esperada.
  if (carga.estado !== 'pagado' || !resultado || !resultado.id) return;

  if (!await confirmarAccion('Este pago quedó marcado como pagado. ¿Generar su recibo ahora?')) return;

  try {
    const doc = await mandar('recibos.php?accion=generar', { pago_id: resultado.id });
    const proveedor = doc.proveedor_id
      ? (DINERO.proveedores || []).find(p => p.id === doc.proveedor_id)
      : null;
    abrirResultadoDeDocumento('Recibo ' + doc.numero + ' generado.',
      doc.archivo_id, doc.nombre, proveedor || null);
  } catch (error) {
    // "Ese pago no está atado a ningún proveedor" es el 400 que devuelve
    // recibos.php para un pago suelto: acá sí es información útil para
    // Lucila, no un error del sistema — se muestra tal cual.
    avisar(error.message, true);
  }
}

/**
 * Engancha los botones Guardar y Borrar de un formulario.
 *
 * @param {Element} cuerpo
 * @param {Function} armarCarga - Devuelve el objeto a mandar, o null si
 *                                falta algo (ya avisó por su cuenta).
 * @param {string} nombreAccion - 'gasto', 'pago'…
 * @param {Object} [existente]
 * @returns {void}
 */
/**
 * A qué arreglo de DINERO pertenece cada tipo de registro que edita
 * engancharFormularioDinero(). Solo entran acá los que se pueden mutar
 * en memoria de forma segura al editar (fila plana, sin recalcular
 * nada agregado): cotización y categoría se quedan fuera porque su
 * forma en DINERO es agrupada, no una lista plana por id.
 */
const COLECCIONES_DINERO = {
  proveedor: 'proveedores',
  padrino:   'padrinos',
  gasto:     'gastos',
  pago:      'pagos',
};

function engancharFormularioDinero(cuerpo, armarCarga, nombreAccion, existente) {

  /* TODAS las secciones del presupuesto llevan adjuntos: el contrato del
     proveedor, la foto del comprobante de un pago, la cotización en PDF,
     el recibo del padrino. */
  const rotulos = {
    gasto:       'Facturas y comprobantes',
    pago:        'Comprobante del pago',
    proveedor:   'Contrato y documentos',
    padrino:     'Comprobante de lo entregado',
    cotizacion:  'La cotización en PDF o foto',
    categoria:   'Documentos',
  };

  montarAdjuntos({
    cuerpo:  cuerpo,
    tipo:    nombreAccion,
    titulo:  rotulos[nombreAccion] || 'Archivos',
    id:      existente ? existente.id : 0,
    // Al crear algo nuevo todavía no hay id al que atar el archivo, así
    // que primero se guarda el registro y recién después se adjunta.
    guardarPrimero: async () => {
      const carga = armarCarga();
      if (!carga) return 0;

      const r = await mandar('presupuesto.php?accion=guardar_' + nombreAccion, carga);

      /* Sin señal el guardado queda en la cola y todavía NO tiene id: lo
         va a poner el servidor cuando el cambio salga de verdad. Antes
         acá se devolvía undefined y el archivo terminaba atado al id 0,
         o sea colgado de nada.

         Se devuelve 0 para que montarAdjuntos() sepa que no hay dónde
         atarlo y lo diga, en vez de subirlo a un registro inexistente. */
      if (r && r._offline) {
        avisar('Se guardó sin señal. Puedes adjuntar el archivo cuando ' +
               'vuelva la conexión.', true);
        return 0;
      }

      ensuciarVistas('resumen');
      return r.id;
    },
  });

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const carga = armarCarga();
    if (!carga) return;
    if (existente) carga.id = existente.id;

    /* Editar un registro que ya existe puede aplicarse de una: ya hay
       una fila en memoria para mutar y repintar al instante (A1, ver
       36-optimista.js) — mismo patrón que abrirFormularioDeInvitado()
       en 08-vista-invitados.js. Dar de alta uno nuevo no tiene id
       todavía, así que sigue esperando la respuesta del servidor. */
    const coleccion = existente && COLECCIONES_DINERO[nombreAccion];
    if (!coleccion) {
      guardarDinero('guardar_' + nombreAccion, carga, 'Guardado.',
        nombreAccion === 'pago' ? r => ofrecerGenerarReciboDeEstePago(carga, r) : null);
      return;
    }

    cerrarHoja(true);
    try {
      const resultado = await aplicarOptimista(
        'presupuesto.php?accion=guardar_' + nombreAccion, carga,
        {
          mutar: () => {
            const lista = DINERO[coleccion];
            const i = lista.findIndex(f => Number(f.id) === Number(existente.id));
            if (i !== -1) Object.assign(lista[i], carga);
          },
          repintar: pintarSeccionDeDinero,
        }
      );
      avisar(resultado.offline
        ? 'Sin conexión: se guardó y se va a mandar solo.'
        : 'Guardado.');
      ensuciarVistas('resumen');
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar && existente) {
    borrar.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
      guardarDinero('borrar_' + nombreAccion, { id: existente.id }, 'Eliminado.');
    });
  }
}

/**
 * Devuelve las opciones de una lista desplegable a partir de una tabla.
 *
 * @param {Array} filas
 * @param {string} vacio - Texto de la opción "ninguno".
 * @returns {Array<{valor:string,texto:string}>}
 */
function opcionesDe(filas, vacio) {
  return [{ valor: '', texto: vacio }].concat(
    filas.map(f => ({ valor: String(f.id), texto: f.nombre }))
  );
}


/* ─── LISTAS A LAS QUE SE LES PUEDEN AGREGAR OPCIONES ──────────────── */

/**
 * Devuelve los métodos de pago: los de fábrica más los agregados.
 *
 * Los que agrega la persona se guardan en el teléfono. No van a la base
 * de datos a propósito: son una comodidad para escribir más rápido, no
 * un dato del evento, y no vale la pena una tabla para eso.
 *
 * @returns {string[]}
 */
function metodosDePago() {
  const propios = recordado('metodos-pago', []);
  return CONFIGURACION.metodosDePago.concat(
    propios.filter(m => !CONFIGURACION.metodosDePago.includes(m))
  );
}

/**
 * Agrega un método de pago nuevo a la lista guardada.
 *
 * @param {string} nombre
 * @returns {void}
 */
function agregarMetodoDePago(nombre) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return;

  const propios = recordado('metodos-pago', []);
  if (!propios.includes(limpio) && !CONFIGURACION.metodosDePago.includes(limpio)) {
    propios.push(limpio);
    recordar('metodos-pago', propios);
  }
}

/**
 * Arma una lista desplegable que permite agregar opciones nuevas.
 *
 * Al elegir "➕ Agregar otro…" aparece un campo de texto debajo. Se
 * resuelve así y no con una ventana emergente porque prompt() está
 * bloqueado en varias PWA instaladas y quedaría sin funcionar justo en
 * el modo en que se va a usar la app.
 *
 * @param {Object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.rotulo
 * @param {Array<{valor:string,texto:string}>} opciones.opciones
 * @param {string} [opciones.valor]
 * @param {string} [opciones.textoAgregar]
 * @returns {string} HTML
 */
function campoListaAmpliable(opciones) {
  const conAgregar = opciones.opciones.concat([
    { valor: '__nuevo__', texto: opciones.textoAgregar || 'Agregar otro…' },
  ]);

  return campoLista({
    id: opciones.id,
    rotulo: opciones.rotulo,
    valor: opciones.valor,
    opciones: conAgregar,
  }) +
  '<div id="' + seguro(opciones.id) + '-nuevo-caja" class="oculto" ' +
       'style="margin-top:calc(var(--esp-3) * -1);margin-bottom:var(--esp-3)">' +
    '<input type="text" id="' + seguro(opciones.id) + '-nuevo" ' +
           'class="campo__control" placeholder="Escribe el nombre nuevo">' +
  '</div>';
}

/**
 * Engancha una lista ampliable para que muestre el campo al elegir
 * "agregar otro".
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharListaAmpliable(id, cuerpo) {
  const lista = buscar('#' + id, cuerpo);
  const caja  = buscar('#' + id + '-nuevo-caja', cuerpo);
  if (!lista || !caja) return;

  lista.addEventListener('change', () => {
    const agregando = lista.value === '__nuevo__';
    caja.classList.toggle('oculto', !agregando);
    if (agregando) buscar('#' + id + '-nuevo', cuerpo).focus();
  });
}

/**
 * Lee el valor de una lista ampliable, sea de la lista o el escrito.
 *
 * @param {string} id
 * @param {Element} cuerpo
 * @returns {string}
 */
function valorDeListaAmpliable(id, cuerpo) {
  const elegido = valorDe(id, cuerpo);
  if (elegido !== '__nuevo__') return elegido;
  return valorDe(id + '-nuevo', cuerpo);
}


function formularioCategoria(categoria) {
  const d = categoria || {};
  const cuerpo = abrirHoja(categoria ? 'Editar categoría' : 'Nueva categoría',
    campoTexto({ id: 'cat-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'cat-techo', rotulo: 'Techo de presupuesto', tipo: 'number',
                 paso: '0.01', valor: d.techo ? desdePesos(d.techo) : '',
                 ayuda: 'Dejalo en 0 si no quieres poner límite.' }) +
    pieDeFormulario('Guardar', !!categoria)
  );

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('cat-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return { nombre: nombre, techo: aPesos(valorDe('cat-techo', cuerpo)) };
  }, 'categoria', categoria);
}


function formularioGasto(gasto) {
  const d = gasto || {};
  const cuerpo = abrirHoja(gasto ? 'Editar gasto' : 'Nuevo gasto',
    campoTexto({ id: 'gas-concepto', rotulo: 'Concepto', valor: d.concepto }) +

    campoLista({ id: 'gas-categoria', rotulo: 'Categoría',
                 valor: d.categoria_id || '',
                 opciones: opcionesDe(DINERO.categorias, 'Sin categoría') }) +

    '<div class="campo-par">' +
      campoDinero({ id: 'gas-planeado', rotulo: 'Presupuestado',
                    valor: d.presupuestado ? desdePesos(d.presupuestado) : '' }) +
      campoDinero({ id: 'gas-real', rotulo: 'Costo real',
                    valor: d.monto_real ? desdePesos(d.monto_real) : '' }) +
    '</div>' +

    campoLista({ id: 'gas-proveedor', rotulo: 'Proveedor',
                 valor: d.proveedor_id || '',
                 opciones: opcionesDe(DINERO.proveedores, 'Sin proveedor') }) +

    campoLista({ id: 'gas-padrino', rotulo: 'Lo cubre un padrino',
                 valor: d.padrino_id || '',
                 opciones: opcionesDe(DINERO.padrinos, 'No, sale de tu bolsillo') }) +

    campoLargo({ id: 'gas-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!gasto)
  );

  activarFormatoDeMiles('gas-planeado', cuerpo);
  activarFormatoDeMiles('gas-real', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const concepto = valorDe('gas-concepto', cuerpo);
    if (!concepto) { avisar('Falta el concepto.', true); return null; }
    return {
      concepto:      concepto,
      categoria_id:  valorDe('gas-categoria', cuerpo),
      proveedor_id:  valorDe('gas-proveedor', cuerpo),
      padrino_id:    valorDe('gas-padrino', cuerpo),
      presupuestado: aPesos(valorDe('gas-planeado', cuerpo)),
      monto_real:    aPesos(valorDe('gas-real', cuerpo)),
      notas:         valorDe('gas-notas', cuerpo),
    };
  }, 'gasto', gasto);
}


function formularioPago(pago) {
  const d = pago || {};
  const moneda = CONFIGURACION.dinero.monedas[monedaElegida()];

  /* Si el método guardado no está en la lista (porque se agregó en otro
     teléfono), se suma para que no se pierda al editar. */
  const metodos = metodosDePago().slice();
  if (d.metodo && !metodos.includes(d.metodo)) metodos.unshift(d.metodo);

  /* ⚡ PROVEEDOR, NO "GASTO" (2026-08-27). Antes se preguntaba "Es parte
     del gasto", con un desplegable de gastos ya cargados + "Suelto" +
     "Crear un gasto nuevo…" — esta última opción era una ilusión: no
     creaba nada, dejaba el pago suelto igual, y nunca hubo forma de
     decir A QUIÉN se le pagaba. Ahora se pregunta directamente el
     proveedor (mismo patrón que abrirGeneradorDeReciboGenerico): uno
     existente, "Personal / sin proveedor", o escribir uno nuevo — el
     backend (presupuesto.php, guardar_pago) arma o reusa el gasto por
     detrás, sin que Lucila tenga que pensar en esa palabra. Al editar
     un pago existente, el proveedor se resuelve desde su gasto actual. */
  const gastoActual = d.gasto_id ? DINERO.gastos.find(g => g.id === d.gasto_id) : null;
  const proveedorActualId = gastoActual && gastoActual.proveedor_id ? gastoActual.proveedor_id : '';

  /* `pago.id` y no `pago` a secas: desde la ficha de un gasto o de un
     proveedor se abre este mismo formulario PRE-LLENADO pero sin id —
     es un alta, no una edición—. Mirando solo si el objeto existe, el
     título decía "Editar pago" y aparecía un botón Borrar para algo que
     todavía no se había guardado. */
  const esEdicion = !!(pago && pago.id);

  const cuerpo = abrirHoja(esEdicion ? 'Editar pago' : 'Nuevo pago',
    campoTexto({ id: 'pag-concepto', rotulo: 'Concepto', valor: d.concepto }) +

    campoListaAmpliable({
      id: 'pag-proveedor',
      rotulo: 'A quién le pagás',
      valor: proveedorActualId ? String(proveedorActualId) : '',
      textoAgregar: 'Agregar uno nuevo…',
      opciones: [{ valor: '', texto: 'Personal / sin proveedor' }]
        .concat(DINERO.proveedores.map(p => ({ valor: String(p.id), texto: p.nombre }))),
    }) +

    /* A cuál de sus gastos va. Aparece solo cuando el proveedor elegido
       tiene más de uno — ver refrescarGastosDelProveedor(). Con uno
       solo no hay nada que preguntar. */
    '<div id="pag-gasto-envoltura" class="oculto"></div>' +

    '<div class="campo-par">' +
      campoDinero({ id: 'pag-monto', rotulo: 'Monto en ' + moneda.nombre.toLowerCase(),
                    valor: d.monto ? desdePesos(d.monto) : '' }) +
      campoTexto({ id: 'pag-fecha', rotulo: 'Vence el', tipo: 'date',
                   valor: d.fecha_limite || '' }) +
    '</div>' +

    campoListaAmpliable({
      id: 'pag-metodo',
      rotulo: 'Método de pago',
      valor: d.metodo || '',
      textoAgregar: 'Agregar otro método…',
      opciones: [{ valor: '', texto: 'Sin especificar' }]
        .concat(metodos.map(m => ({ valor: m, texto: m }))),
    }) +

    campoCasilla({ id: 'pag-pagado', rotulo: 'Ya está pagado',
                   marcado: d.estado === 'pagado' }) +

    /* ⚡ CUÁNDO SE PAGÓ — EL CAMPO QUE NO EXISTÍA (2026-09-03)
       El formulario tenía "Vence el" (una fecha límite) y nada más, así
       que la fecha del pago la estampaba el servidor con el día en que
       se cargaba: un pago hecho el martes y anotado el viernes quedaba
       fechado el viernes. El propio presupuesto.php decía "se cambia a
       mano desde el formulario del pago", refiriéndose a un campo que
       no estaba. Y la ficha lo mostraba después como "Pagado el",
       mientras el formulario que lo produjo lo llamaba "Vence el".

       El servidor ya aceptaba `fecha_pagado` desde siempre; solo
       faltaba mandárselo. Aparece al marcar "Ya está pagado", porque
       antes de eso no hay ninguna fecha de pago que poner. */
    '<div id="pag-cuando-envoltura"' +
         (d.estado === 'pagado' ? '' : ' class="oculto"') + '>' +
      campoTexto({ id: 'pag-fecha-pago', rotulo: 'Cuándo se pagó', tipo: 'date',
                   valor: d.fecha_pagado || hoyEnFecha(),
                   ayuda: 'El día en que salió la plata, no el día en que lo anotas.' }) +
    '</div>' +

    campoLargo({ id: 'pag-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', esEdicion)
  );

  activarFormatoDeMiles('pag-monto', cuerpo);
  engancharListaAmpliable('pag-metodo', cuerpo);
  engancharListaAmpliable('pag-proveedor', cuerpo);

  /* El selector de gasto se rearma cada vez que cambia el proveedor, y
     una vez al abrir para el caso de estar editando un pago que ya
     tiene proveedor. */
  const campoProveedor = buscar('#pag-proveedor', cuerpo);
  if (campoProveedor) {
    campoProveedor.addEventListener('change', () =>
      refrescarGastosDelProveedor(cuerpo, d.gasto_id));
  }
  refrescarGastosDelProveedor(cuerpo, d.gasto_id);

  /* "Cuándo se pagó" solo tiene sentido si está pagado: aparece y
     desaparece con la casilla, en vez de estar siempre ahí pidiendo una
     fecha que todavía no existe. */
  const casillaPagado = buscar('#pag-pagado', cuerpo);
  const cuandoSePago  = buscar('#pag-cuando-envoltura', cuerpo);
  if (casillaPagado && cuandoSePago) {
    casillaPagado.addEventListener('change', () => {
      cuandoSePago.classList.toggle('oculto', !casillaPagado.checked);
    });
  }

  engancharFormularioDinero(cuerpo, () => {
    const concepto = valorDe('pag-concepto', cuerpo);
    const metodo   = valorDeListaAmpliable('pag-metodo', cuerpo);
    const monto    = aPesos(valorDe('pag-monto', cuerpo));

    if (!monto || monto <= 0) {
      avisar('Pon un monto mayor a cero.', true);
      return null;
    }

    // Igual que antes: si no se eligió proveedor, hace falta al menos
    // un concepto para que el pago diga algo.
    const proveedorElegido = valorDe('pag-proveedor', cuerpo);
    if (!concepto && !proveedorElegido) {
      avisar('Pon un concepto o elige a quién le pagas.', true);
      return null;
    }

    // Se guarda el método nuevo para que aparezca la próxima vez.
    agregarMetodoDePago(metodo);

    // gasto_id existente solo se conserva si el proveedor NO cambió —
    // si cambió (o se quitó), se omite y el backend arma/reusa el gasto
    // que corresponda al nuevo proveedor (o deja el pago suelto).
    const proveedorNoCambio = proveedorElegido === (proveedorActualId ? String(proveedorActualId) : '');

    /* A cuál de los gastos del proveedor va. Si el selector está a la
       vista (el proveedor tiene más de uno), manda lo elegido; si no,
       vale la regla de siempre: conservar el gasto actual mientras el
       proveedor no cambie, y dejar que el servidor resuelva el resto. */
    const gastoElegido = valorDe('pag-gasto', cuerpo);

    const carga = {
      concepto:     concepto,
      gasto_id:     gastoElegido ||
                    ((proveedorNoCambio && d.gasto_id) ? d.gasto_id : ''),
      // El campo está en la moneda que se está mirando; la base guarda pesos.
      monto:        monto,
      fecha_limite: valorDe('pag-fecha', cuerpo),
      metodo:       metodo,
      estado:       valorDe('pag-pagado', cuerpo) ? 'pagado' : 'pendiente',
      /* Cuándo salió la plata de verdad. El servidor ya lo aceptaba
         desde siempre (presupuesto.php, guardar_pago) y cae a hoy si no
         viene; lo que faltaba era mandárselo. */
      fecha_pagado: valorDe('pag-fecha-pago', cuerpo),
      notas:        valorDe('pag-notas', cuerpo),
    };

    if (proveedorElegido === '__nuevo__') {
      const nombreNuevo = valorDe('pag-proveedor-nuevo', cuerpo);
      if (!nombreNuevo) {
        avisar('Escribe el nombre del proveedor nuevo.', true);
        return null;
      }
      carga.proveedor_nuevo = nombreNuevo;
    } else if (proveedorElegido) {
      carga.proveedor_id = proveedorElegido;
    }
    // proveedorElegido === '' → Personal/sin proveedor: no se manda nada,
    // igual que "Suelto" antes.

    return carga;
  }, 'pago', esEdicion ? pago : null);
}

/**
 * Muestra u oculta "¿A cuál de sus gastos?" según el proveedor elegido.
 *
 * POR QUÉ EXISTE
 * Sin preguntar, TODOS los pagos a un proveedor caían en su gasto más
 * viejo: el servidor tomaba el primero por id (`ORDER BY id ASC LIMIT
 * 1`). Con un salón que tiene el paquete y la barra libre como dos
 * gastos separados, cada pago de la barra se anotaba contra el paquete
 * — y los dos saldos quedaban mal, sin que nada lo dijera.
 *
 * Se pregunta SOLO cuando hay más de un gasto, que es cuando la
 * pregunta tiene sentido. Y con el saldo de cada uno a la vista, que es
 * el dato que hace obvia la respuesta.
 *
 * @param {Element} cuerpo
 * @param {number} [gastoActualId] - El del pago que se está editando.
 * @returns {void}
 */
function refrescarGastosDelProveedor(cuerpo, gastoActualId) {
  const envoltura = buscar('#pag-gasto-envoltura', cuerpo);
  if (!envoltura) return;

  const proveedorId = valorDe('pag-proveedor', cuerpo);
  const suyos = proveedorId && proveedorId !== '__nuevo__'
    ? (DINERO.gastos || []).filter(g => String(g.proveedor_id) === String(proveedorId))
    : [];

  /* ⚡ NO SE PREGUNTA CUANDO LA RESPUESTA ES UNA SOLA (2026-09-03)
     Esto aparecía siempre que el proveedor tuviera dos gastos o más,
     aunque uno solo tuviera saldo abierto: se obligaba a elegir entre
     "Barra libre — faltan $8,000" y "Paquete — liquidado", que no es
     una elección. El saldo ya se calcula acá abajo para armar cada
     opción, así que el dato para saltearlo estaba en la mano.

     Si queda un solo gasto con saldo, se usa ese y no se pregunta
     nada. */
  const conSaldo = suyos.filter(g => saldoDelGasto(g).saldo > 0.005);
  const hayQuePreguntar = suyos.length >= 2 && conSaldo.length >= 2;

  if (!hayQuePreguntar) {
    /* Se recuerda cuál se resolvió solo, para que el guardado lo mande:
       sin esto, el servidor volvería a elegir por su cuenta el gasto
       más viejo, que es justo lo que este selector vino a evitar. */
    const unico = gastoActualId
      || (conSaldo.length === 1 ? conSaldo[0].id : (suyos.length === 1 ? suyos[0].id : 0));

    envoltura.innerHTML = unico
      ? '<input type="hidden" id="pag-gasto" value="' + seguro(unico) + '">'
      : '';
    envoltura.classList.add('oculto');
    return;
  }

  envoltura.classList.remove('oculto');
  envoltura.innerHTML = campoLista({
    id: 'pag-gasto',
    rotulo: '¿A cuál de sus gastos?',
    valor: gastoActualId ? String(gastoActualId) : String(conSaldo[0].id),
    // Primero los que deben algo: es entre ellos que hay que decidir.
    opciones: conSaldo.concat(suyos.filter(g => !conSaldo.includes(g))).map(g => {
      const s = saldoDelGasto(g);
      return {
        valor: String(g.id),
        // El saldo va en el propio rótulo: es lo que decide, y en un
        // desplegable no hay lugar para una segunda línea.
        texto: g.concepto + ' — ' + (s.saldo > 0.005
          ? 'faltan ' + comoDinero(s.saldo, false)
          : comoSeLeeElSaldo(s.estado)),
      };
    }),
  });
}

/**
 * El estado de un saldo, en palabras de una persona.
 *
 * `saldoDelGasto()` devuelve la clave en minúsculas para comparar, y
 * eso terminaba escrito crudo dentro de un desplegable: "Barra libre —
 * liquidado". Son palabras de contador, y encima en minúscula en medio
 * de una frase.
 *
 * @param {string} estado
 * @returns {string}
 */
function comoSeLeeElSaldo(estado) {
  return {
    'sin pagar':     'sin pagar todavía',
    'abonado':       'abonado en parte',
    'liquidado':     'ya está pagado',
    'pagado de más': 'pagado de más',
  }[estado] || estado;
}


function formularioPadrino(padrino) {
  const d = padrino || {};
  const cuerpo = abrirHoja(padrino ? 'Editar padrino' : 'Nuevo padrino',
    campoTexto({ id: 'pad-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'pad-apadrina', rotulo: 'Qué apadrina', valor: d.apadrina,
                 pista: 'Vals, pastel, ramo, música…' }) +

    campoLista({ id: 'pad-tipo', rotulo: 'Cómo aporta',
                 valor: d.tipo_aporte || 'dinero',
                 opciones: [
                   { valor: 'dinero',  texto: 'Dinero' },
                   { valor: 'especie', texto: 'En especie (pone la cosa)' },
                 ] }) +

    /* campoDinero y no campoTexto: los montos de padrino eran los
       únicos sin separador de miles —30000 se veía "30000" acá y
       "30,000" en el formulario de al lado— y sin el aviso de en qué
       moneda se está escribiendo. */
    campoDinero({ id: 'pad-monto', rotulo: 'Cuánto prometió',
                  valor: d.monto ? desdePesos(d.monto) : '',
                  pista: 'Si aporta en especie, el valor aproximado' }) +

    /* ⚡ CUÁNTO ENTREGÓ DE VERDAD (2026-09-03). `estado` es un sí/no, así
       que una entrega parcial —"de los $30,000 me dio $10,000 y el
       resto en octubre", que es lo más común— era irrepresentable: había
       que elegir entre mentir diciendo que ya entregó todo o mentir
       diciendo que no entregó nada. */
    campoDinero({ id: 'pad-entregado', rotulo: 'Cuánto entregó ya',
                  valor: d.monto_entregado ? desdePesos(d.monto_entregado) : '',
                  pista: 'Vacío si todavía no entregó nada' }) +

    campoLista({ id: 'pad-estado', rotulo: 'En qué va',
                 valor: d.estado || 'hablado',
                 opciones: [
                   { valor: 'hablado',    texto: 'Hablado (dijo que sí)' },
                   { valor: 'confirmado', texto: 'Confirmado en firme' },
                   { valor: 'entregado',  texto: 'Ya entregó' },
                 ] }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'pad-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono }) +
      campoTexto({ id: 'pad-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +
    '</div>' +

    campoLargo({ id: 'pad-notas', rotulo: 'Notas', valor: d.notas }) +
    pieDeFormulario('Guardar', !!padrino)
  );

  // campoDinero necesita esto para el separador de miles en vivo.
  activarFormatoDeMiles('pad-monto', cuerpo);
  activarFormatoDeMiles('pad-entregado', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('pad-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return {
      nombre:          nombre,
      apadrina:        valorDe('pad-apadrina', cuerpo),
      tipo_aporte:     valorDe('pad-tipo', cuerpo),
      monto:           aPesos(valorDe('pad-monto', cuerpo)),
      monto_entregado: aPesos(valorDe('pad-entregado', cuerpo)),
      estado:          valorDe('pad-estado', cuerpo),
      telefono:        valorDe('pad-telefono', cuerpo),
      correo:          valorDe('pad-correo', cuerpo),
      notas:           valorDe('pad-notas', cuerpo),
    };
  }, 'padrino', padrino);
}


/**
 * Anota que un padrino entregó dinero. Un campo, y listo.
 *
 * POR QUÉ NO ES "EDITAR EL PADRINO"
 * Es la acción más frecuente sobre un padrino y costaba siete toques:
 * abrir la ficha, bajar, Editar, bajar hasta el quinto campo de nueve,
 * escribir, cambiar el estado en un desplegable, guardar. Todo para
 * tocar un número.
 *
 * EL ESTADO SE DEDUCE, NO SE PREGUNTA
 * `monto_entregado` y `estado` decían lo mismo por dos caminos que
 * nadie mantenía sincronizados: se podía guardar "entregó $30,000" con
 * estado "Hablado", y las dos pantallas que resumen padrinos —una
 * agrupa por estado, la otra suma montos— se contradecían. Acá el
 * estado sale de la cifra: si completó lo prometido queda 'entregado',
 * si entregó una parte queda 'confirmado' (comprometido en firme, y con
 * plata puesta), y eso es coherente por construcción.
 *
 * @param {Object} padrino
 * @param {number} prometido
 * @param {number} entregado - Lo que ya había entregado antes de esto.
 * @returns {void}
 */
function anotarEntregaDePadrino(padrino, prometido, entregado) {
  const falta = Math.max(0, prometido - entregado);

  const cuerpo = abrirHoja('Entrega de ' + padrino.nombre,
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Prometió <strong>' + seguro(comoDinero(prometido, false)) + '</strong>' +
      (entregado > 0.005
        ? ' y ya entregó ' + seguro(comoDinero(entregado, false)) + '.'
        : '.') +
      (falta > 0.005
        ? ' Faltan <strong>' + seguro(comoDinero(falta, false)) + '</strong>.'
        : '') +
    '</p>' +

    campoDinero({ id: 'entrega-monto', rotulo: 'Cuánto entregó ahora',
                  valor: desdePesos(falta),
                  pista: 'Puede ser una parte' }) +

    campoTexto({ id: 'entrega-fecha', rotulo: 'Cuándo', tipo: 'date',
                 valor: hoyEnFecha() }) +

    pieDeFormulario('Guardar')
  );

  activarFormatoDeMiles('entrega-monto', cuerpo);

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const ahora = aPesos(valorDe('entrega-monto', cuerpo));
    if (!ahora || ahora <= 0) { avisar('Pon cuánto entregó.', true); return; }

    // Se SUMA a lo que ya había: son entregas parciales, no un reemplazo.
    const total = entregado + ahora;

    /* El estado sale de la cifra, no de un desplegable aparte: es lo
       que evita que los dos datos se contradigan. */
    const estado = (total >= prometido - 0.005) ? 'entregado' : 'confirmado';

    try {
      await mandar('presupuesto.php?accion=guardar_padrino', {
        id:              padrino.id,
        nombre:          padrino.nombre,
        apadrina:        padrino.apadrina,
        tipo_aporte:     padrino.tipo_aporte,
        monto:           padrino.monto,
        monto_entregado: total,
        estado:          estado,
        telefono:        padrino.telefono,
        correo:          padrino.correo,
        notas:           padrino.notas,
        fecha_entrega:   valorDe('entrega-fecha', cuerpo),
      });

      cerrarHoja(true);
      avisar(total >= prometido - 0.005
        ? 'Anotado: ya entregó todo lo que prometió.'
        : 'Anotado. Le faltan ' + comoDinero(prometido - total, false) + '.');

      ensuciarVistas('resumen');
      dibujarDinero();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Ficha de solo lectura de un proveedor, antes de editar. Mismo patrón
 * que abrirDetalleDeInvitado() (08-vista-invitados.js).
 *
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirDetalleDeProveedor(proveedor) {
  const estados = {
    candidato: 'Candidato', contratado: 'Contratado',
    pagado: 'Pagado por completo', cancelado: 'Cancelado',
  };
  /* ⚡ "FALTA" YA NO USA `anticipo` (2026-08-27). `anticipo` era un
     número a mano que un pago marcado 'pagado' en Presupuesto nunca
     tocaba — se podía pagar de verdad y "Falta" seguir mostrando el
     mismo hueco de siempre. `pagado_real` lo calcula el servidor
     sumando los pagos de verdad de este proveedor (presupuesto.php,
     acción 'todo'): una sola fuente, sin nada que sincronizar a mano. */
  const pagadoReal = Number(proveedor.pagado_real) || 0;
  const falta = (Number(proveedor.monto_total) || 0) - pagadoReal;

  const detalle = [
    ['Servicio', proveedor.servicio || '—'],
    ['Estado', estados[proveedor.estado] || proveedor.estado || '—'],
    ['Monto total', comoDinero(proveedor.monto_total, false)],
    ['Pagado', comoDinero(pagadoReal, false)],
    ['Falta', falta > 0 ? comoDinero(falta, false) : '—'],
    ['Contacto', proveedor.contacto || '—'],
    ['Teléfono', proveedor.telefono || '—'],
    ['Correo', proveedor.correo || '—'],
    ['Notas', proveedor.notas || '—'],
  ].map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  /* Cantidad de pagos, para dar contexto a "Pagado" de arriba —
     `DINERO.gastos`/`DINERO.pagos` ya están en memoria por
     dibujarDinero(), así que esto no pide nada nuevo al servidor. */
  const gastosDeEsteProveedor = (DINERO.gastos || []).filter(g => g.proveedor_id === proveedor.id);
  const idsDeEsosGastos = new Set(gastosDeEsteProveedor.map(g => g.id));
  const cuantosPagos = (DINERO.pagos || [])
    .filter(p => idsDeEsosGastos.has(p.gasto_id) && p.estado === 'pagado').length;

  const seccionPagosReales = cuantosPagos
    ? '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Pagos registrados en Presupuesto</div>' +
      '<div class="detalle">' +
        '<span class="detalle__rotulo">Cantidad de pagos</span>' +
        '<span class="detalle__valor">' + cuantosPagos + '</span>' +
      '</div>'
    : '';

  const cuerpo = abrirHoja(proveedor.nombre,
    '<div class="detalle">' + detalle + '</div>' +

    /* ⚡ PAGARLE DESDE SU FICHA (2026-09-03). La ficha decía cuánto le
       falta y no dejaba hacer nada al respecto: había que cerrar, ir a
       Pagos, bajar hasta el final, tocar "Nuevo pago" y volver a elegir
       el proveedor que se estaba mirando. Se abre pre-llenado con lo
       que falta. */
    (falta > 0.005
      ? '<button class="boton boton--principal boton--ancho" ' +
                'id="detalle-pagar-proveedor" style="margin-top:var(--esp-2)">' +
          'Registrar un pago de ' + seguro(comoDinero(falta, false)) +
        '</button>'
      : '') +

    seccionPagosReales +
    vinetasDeQueIncluye(proveedor.detalle_items) +
    botonesDeContacto(proveedor) +
    /* Generar recibo SIEMPRE está acá, disponible, sin importar si este
       proveedor tiene o no un contrato adjunto abajo. Nunca se deshabilita
       ni se le pide nada antes: ver la nota grande de recibos.php sobre
       por qué el recibo no depende del contrato. */
    /* Los dos botones van juntos y con el mismo peso visual: ninguno es
       "el paso 1 del otro". Generar un contrato es enteramente opcional
       —ver la nota grande en contratos.php—, así que no se ordenan como
       un asistente de pasos ni uno se deshabilita esperando al otro. */
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton" id="detalle-recibo">Generar recibo</button>' +
      '<button class="boton" id="detalle-contrato">Generar contrato</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton" id="detalle-ver-recibos">Ver recibos</button>' +
      '<button class="boton" id="detalle-ver-contratos">Ver contratos</button>' +
    '</div>' +
    '<div id="tareas-de-la-ficha"></div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton" id="detalle-nueva-tarea">Nueva tarea</button>' +
      '<button class="boton" id="detalle-alarma">Ponerle alarma</button>' +
    '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="detalle-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  engancharBotonesDeContacto(cuerpo, proveedor);
  insertarAdjuntosDeSoloLectura(cuerpo, 'proveedor', proveedor.id, 'Contrato y documentos');
  engancharTareasDeLaFicha(cuerpo, 'proveedor', proveedor.id, 'Sobre ' + proveedor.nombre);

  buscar('#detalle-ver-recibos', cuerpo).addEventListener('click',
    () => abrirListaDeDocumentos('recibo', proveedor));
  buscar('#detalle-ver-contratos', cuerpo).addEventListener('click',
    () => abrirListaDeDocumentos('contrato', proveedor));

  /* El pago abre con el proveedor y el monto ya puestos. Si tiene un
     solo gasto, el formulario ni siquiera va a preguntar a cuál va. */
  const pagarAlProveedor = buscar('#detalle-pagar-proveedor', cuerpo);
  if (pagarAlProveedor) {
    pagarAlProveedor.addEventListener('click', () => {
      const suyos = (DINERO.gastos || []).filter(g => g.proveedor_id === proveedor.id);
      formularioPago({
        gasto_id: suyos.length === 1 ? suyos[0].id : 0,
        concepto: proveedor.servicio || proveedor.nombre,
        monto:    falta,
        estado:   'pagado',
      });
    });
  }

  buscar('#detalle-recibo', cuerpo).addEventListener('click', () => abrirGeneradorDeRecibo(proveedor));
  buscar('#detalle-contrato', cuerpo).addEventListener('click', () => abrirGeneradorDeContrato(proveedor));

  // ponerleAlarmaA ya existía (22-alarmas.js) con todo el mecanismo de
  // vínculo (atada_a_tipo/atada_a_id) armado — antes de esta ronda nadie
  // la llamaba desde ninguna ficha. Al tocar la notificación, lleva de
  // vuelta acá mismo.
  buscar('#detalle-alarma', cuerpo).addEventListener('click', () =>
    ponerleAlarmaA({ titulo: 'Sobre ' + proveedor.nombre, tipo: 'proveedor', id: proveedor.id }));

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => formularioProveedor(proveedor));

  buscar('#detalle-borrar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
    guardarDinero('borrar_proveedor', { id: proveedor.id }, 'Eliminado.');
  });
}

/**
 * Formulario chico para generar un recibo de pago de este proveedor.
 * No pregunta nada de contratos: un recibo se genera solo, en cualquier
 * momento (ver la nota grande en admin/api/recibos.php).
 *
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirGeneradorDeRecibo(proveedor) {
  const falta = (Number(proveedor.monto_total) || 0) - (Number(proveedor.pagado_real) || 0);
  const hoy   = hoyEnFecha();   // local, no UTC: ver hoyEnFecha()

  const cuerpo = abrirHoja('Recibo · ' + proveedor.nombre,
    '<button type="button" class="lista__fila" id="rec-configurar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">⚙️ Numeración y datos de quien paga</span>' +
      '</span>' +
    '</button>' +
    campoDinero({ id: 'rec-monto', rotulo: 'Monto',
                 valor: falta > 0 ? desdePesos(falta) : '',
                 pista: 'Lo que se está pagando ahora' }) +
    campoLargo({ id: 'rec-concepto', rotulo: 'Concepto',
                 valor: falta > 0 ? 'Saldo' : 'Anticipo' }) +
    campoLista({ id: 'rec-forma', rotulo: 'Forma de pago', valor: 'Transferencia',
                 opciones: [
                   { valor: 'Efectivo',      texto: 'Efectivo' },
                   { valor: 'Transferencia', texto: 'Transferencia' },
                   { valor: 'Tarjeta',       texto: 'Tarjeta' },
                   { valor: 'Otro',          texto: 'Otro' },
                 ] }) +
    campoTexto({ id: 'rec-fecha', rotulo: 'Fecha', tipo: 'date', valor: hoy }) +
    /* Tildado por defecto: mantener los libros de Presupuesto al día es
       lo esperable, no la excepción. Destildar es la elección
       consciente para un recibo que de verdad no debe contarse (ver
       la nota grande en recibos.php sobre por qué esto es opcional). */
    campoCasilla({ id: 'rec-tambien-pago',
                   rotulo: 'También registrarlo como pago en Presupuesto',
                   marcado: true }) +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="rec-generar">' +
        'Generar PDF' +
      '</button>' +
    '</div>'
  );

  activarFormatoDeMiles('rec-monto', cuerpo);

  buscar('#rec-configurar', cuerpo).addEventListener('click', () => abrirConfiguracionDeDocumentos());

  buscar('#rec-generar', cuerpo).addEventListener('click', async () => {
    const monto = aPesos(valorDe('rec-monto', cuerpo));
    if (!monto || monto <= 0) {
      avisar('Pon un monto mayor a cero.', true);
      return;
    }

    try {
      const resultado = await mandar('recibos.php?accion=generar', {
        proveedor_id: proveedor.id,
        monto:        monto,
        concepto:     valorDe('rec-concepto', cuerpo),
        forma_pago:   valorDe('rec-forma', cuerpo),
        fecha:        valorDe('rec-fecha', cuerpo),
        tambien_registrar_pago: !!valorDe('rec-tambien-pago', cuerpo),
      });
      cerrarHoja(true);

      // `pagado_real` (presupuesto.php) se recalcula solo con el pago
      // que este recibo puede haber creado (`tambien_registrar_pago`) —
      // por eso hay que refrescar DINERO siempre, mismo patrón que ya
      // usa guardarDinero() al guardar cualquier otra cosa. Sin esto,
      // "Falta" seguía mostrando el número viejo y el próximo recibo
      // sugería el mismo monto, como si nada se hubiera guardado.
      ensuciarVistas('resumen');
      await dibujarDinero();

      // El `proveedor` de acá arriba quedó con el `pagado_real` VIEJO
      // —se armó antes de este guardado—; dibujarDinero() ya trajo una
      // copia nueva. Sin este re-lookup, cerrar esta pantalla reabriría
      // la ficha con el mismo "Falta" de siempre, aunque el número ya
      // había cambiado en el servidor.
      const proveedorActualizado =
        DINERO.proveedores.find(p => p.id === proveedor.id) || proveedor;

      abrirResultadoDeDocumento(
        'Recibo ' + resultado.numero + ' generado.'
          + (resultado.pago_id ? ' Registrado también como pago.' : ''),
        resultado.archivo_id, resultado.nombre, proveedorActualizado);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * El generador de recibo de verdad, sin dueño fijo: a diferencia de
 * abrirGeneradorDeRecibo(proveedor) —pensado para abrirse YA sabiendo
 * de qué proveedor se trata—, este elige a quién le pagás en el mismo
 * paso, de una lista que junta proveedores y padrinos, con la opción
 * de escribir cualquier otro nombre. Es el que abre "Nuevo recibo"
 * desde el botón flotante (29-fab.js).
 *
 * POR QUÉ NO ERA SOLO "ELEGIR UN PROVEEDOR"
 * `recibos.proveedor_id` dejó de ser obligatorio (ver la nota grande en
 * admin/migracion.sql): un recibo puede ir a nombre de un padrino —para
 * reembolsarle algo que adelantó, por ejemplo— o de alguien sin ficha
 * propia. Antes de este cambio, la única forma de darle un recibo a
 * alguien así era inventarle una ficha de proveedor falsa.
 *
 * @returns {Promise<void>}
 */
async function abrirGeneradorDeReciboGenerico() {
  const dinero = await datosDeDineroParaElAsistente();
  if (!dinero) { avisar('No se pudo cargar Presupuesto.', true); return; }

  const hoy = hoyEnFecha();   // local, no UTC: ver hoyEnFecha()

  const opcionesDeQuien = (dinero.proveedores || [])
    .map(p => ({ valor: 'prov:' + p.id, texto: p.nombre }))
    .concat((dinero.padrinos || [])
      .map(p => ({ valor: 'padrino:' + p.id, texto: p.nombre + ' (padrino)' })));

  const cuerpo = abrirHoja('Nuevo recibo',
    '<button type="button" class="lista__fila" id="rec2-configurar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">⚙️ Numeración y datos de quien paga</span>' +
      '</span>' +
    '</button>' +
    campoListaAmpliable({
      id: 'rec2-quien',
      rotulo: 'A quién le pagás',
      valor: '',
      textoAgregar: 'Alguien más (escribir el nombre)…',
      opciones: opcionesDeQuien,
    }) +
    campoDinero({ id: 'rec2-monto', rotulo: 'Monto' }) +
    campoLargo({ id: 'rec2-concepto', rotulo: 'Concepto' }) +
    campoLista({ id: 'rec2-forma', rotulo: 'Forma de pago', valor: 'Transferencia',
                 opciones: [
                   { valor: 'Efectivo',      texto: 'Efectivo' },
                   { valor: 'Transferencia', texto: 'Transferencia' },
                   { valor: 'Tarjeta',       texto: 'Tarjeta' },
                   { valor: 'Otro',          texto: 'Otro' },
                 ] }) +
    campoTexto({ id: 'rec2-fecha', rotulo: 'Fecha', tipo: 'date', valor: hoy }) +
    campoCasilla({ id: 'rec2-tambien-pago',
                   rotulo: 'También registrarlo como pago en Presupuesto (solo si es un proveedor)',
                   marcado: true }) +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="rec2-generar">Generar PDF</button>' +
    '</div>'
  );

  activarFormatoDeMiles('rec2-monto', cuerpo);
  engancharListaAmpliable('rec2-quien', cuerpo);
  buscar('#rec2-configurar', cuerpo).addEventListener('click', () => abrirConfiguracionDeDocumentos());

  buscar('#rec2-generar', cuerpo).addEventListener('click', async () => {
    const monto = aPesos(valorDe('rec2-monto', cuerpo));
    if (!monto || monto <= 0) {
      avisar('Pon un monto mayor a cero.', true);
      return;
    }

    const quien = valorDeListaAmpliable('rec2-quien', cuerpo);
    if (!quien) {
      avisar('Elige o escribe a quién le pagas.', true);
      return;
    }

    // "prov:12" / "padrino:5" / cualquier otro texto escrito a mano.
    const carga = {
      monto:        monto,
      concepto:     valorDe('rec2-concepto', cuerpo),
      forma_pago:   valorDe('rec2-forma', cuerpo),
      fecha:        valorDe('rec2-fecha', cuerpo),
      tambien_registrar_pago: !!valorDe('rec2-tambien-pago', cuerpo),
    };
    let proveedorElegido = null;
    if (quien.startsWith('prov:')) {
      carga.proveedor_id = quien.slice(5);
      proveedorElegido = (dinero.proveedores || []).find(p => String(p.id) === carga.proveedor_id);
    } else if (quien.startsWith('padrino:')) {
      carga.padrino_id = quien.slice(8);
    } else {
      carga.beneficiario = quien;
    }

    try {
      const resultado = await mandar('recibos.php?accion=generar', carga);
      cerrarHoja(true);

      if (carga.proveedor_id || resultado.pago_id) {
        ensuciarVistas('resumen');
        await dibujarDinero();
      }

      const proveedorActualizado = proveedorElegido
        ? (DINERO.proveedores.find(p => p.id === proveedorElegido.id) || proveedorElegido)
        : null;

      abrirResultadoDeDocumento(
        'Recibo ' + resultado.numero + ' generado.'
          + (resultado.pago_id ? ' Registrado también como pago.' : ''),
        resultado.archivo_id, resultado.nombre, proveedorActualizado,
        proveedorActualizado ? undefined : () => {});   // sin ficha a la que volver
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Pantallita corta que aparece justo después de generar un recibo o un
 * contrato: confirma el número, ofrece mandarlo por WhatsApp ahí mismo
 * (ver compartirArchivoPorWhatsApp en 06-piezas.js) y, al cerrarla,
 * vuelve a la ficha del proveedor para que el PDF ya se vea en la lista
 * de "Contrato y documentos".
 *
 * @param {string} mensaje
 * @param {number} archivoId
 * @param {string} nombreArchivo
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirResultadoDeDocumento(mensaje, archivoId, nombreArchivo, proveedor, alCerrarPersonalizado) {
  // proveedor puede venir null (recibo a un padrino, o a alguien sin
  // ficha propia): en ese caso no hay a qué ficha volver al cerrar,
  // salvo que quien llamó haya pasado su propio alCerrarPersonalizado.
  const cuerpo = abrirHoja('Listo', '' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' + seguro(mensaje) + '</p>' +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="doc-ver">Ver PDF</button>' +
      '<button type="button" class="boton" id="doc-whatsapp">Enviar por WhatsApp</button>' +
    '</div>',
    alCerrarPersonalizado || (proveedor ? () => abrirDetalleDeProveedor(proveedor) : undefined)
  );

  // ⚡ "VER PDF" (2026-08-27). Antes el único botón era "Enviar por
  // WhatsApp", que en realidad DESCARGA el archivo (compartirArchivoPor
  // WhatsApp usa un <a download>) — nunca hubo forma de simplemente
  // VER el PDF recién generado. abrirArchivo ya existe (14-archivos.js,
  // usado para los adjuntos normales) y sabe mostrar un PDF en un visor
  // en vez de descargarlo — se reusa tal cual, no se reinventa.
  buscar('#doc-ver', cuerpo).addEventListener('click', () => {
    abrirArchivo(archivoId, { tipo_mime: 'application/pdf', nombre_real: nombreArchivo });
  });

  buscar('#doc-whatsapp', cuerpo).addEventListener('click', () => {
    compartirArchivoPorWhatsApp(archivoId, nombreArchivo, proveedor ? proveedor.telefono : '');
  });
}

/**
 * Configuración de cada tipo de documento guardado: dónde pedirlos,
 * cómo mostrarlos en la lista y en el detalle. Un solo lugar para las
 * diferencias entre "recibo" y "contrato", en vez de tener dos pares de
 * funciones casi idénticas.
 */
const TIPOS_DE_DOCUMENTO = {
  recibo: {
    endpoint: 'recibos.php',
    titulo: 'Recibos',
    tituloSingular: 'Recibo',
    filaLista: r => [seguro(r.numero), comoDinero(r.monto, false) + ' · ' + seguro(r.concepto || '—')],
    campos: r => [
      ['Fecha', comoFecha(r.fecha)],
      ['Concepto', r.concepto || '—'],
      ['Monto', comoDinero(r.monto, false)],
      ['Forma de pago', r.forma_pago || '—'],
      ['Estado', { pendiente: 'Pendiente', enviado: 'Enviado', firmado: 'Firmado' }[r.estado] || r.estado],
    ],
    tieneEstado: true,
  },
  contrato: {
    endpoint: 'contratos.php',
    titulo: 'Contratos',
    tituloSingular: 'Contrato',
    filaLista: c => [seguro(c.numero || ('Contrato #' + c.id)), comoDinero(c.monto_total, false)],
    campos: c => [
      ['Fecha de firma', comoFecha(c.fecha_firma)],
      ['Servicio', c.descripcion_servicio || '—'],
      ['Monto total', comoDinero(c.monto_total, false)],
      ['Lugar', c.lugar || '—'],
    ],
    tieneEstado: false,
  },
};

/**
 * La lista de recibos o contratos ya generados para este proveedor —
 * solo para CONSULTAR. Tocar una fila abre el detalle de solo lectura
 * (abrirDetalleDeDocumentoGuardado); ahí, y solo ahí, aparecen Editar y
 * Borrar, cada uno detrás de una confirmación explícita.
 *
 * POR QUÉ HAY FRICCIÓN A PROPÓSITO
 * Un recibo o un contrato ya generado es, en la práctica, un documento
 * legal/contable entregado: no debería poder tocarse con el mismo toque
 * despreocupado con el que se edita una nota. Ver la nota grande en
 * recibos.php y contratos.php sobre por qué "editar" ni siquiera
 * rehace el PDF — esto es la misma idea, del lado de la interfaz.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} proveedor
 * @returns {Promise<void>}
 */
async function abrirListaDeDocumentos(tipo, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const titulo = proveedor ? config.titulo + ' · ' + proveedor.nombre : config.titulo;

  // Sin proveedor: se ve TODO (recibos.php/contratos.php ya soportan
  // listar sin filtro), con un desplegable para acotar a uno solo si
  // hace falta — nunca es obligatorio elegir uno primero.
  const selectorProveedor = !proveedor
    ? campoLista({
        id: 'doc-filtro-proveedor',
        rotulo: 'Filtrar por proveedor',
        valor: '',
        opciones: [{ valor: '', texto: 'Todos los proveedores' }].concat(
          (DINERO.proveedores || []).map(p => ({ valor: p.id, texto: p.nombre }))
        ),
      })
    : '';

  const cuerpo = abrirHoja(titulo,
    selectorProveedor + '<div id="doc-lista-contenedor">' + '<div class="esqueleto"></div>'.repeat(3) + '</div>');

  const contenedor = buscar('#doc-lista-contenedor', cuerpo);

  // Sin proveedor fijo, cada fila necesita decir a nombre de quién es —
  // los recibos ya traen `beneficiario` (siempre completo, ver
  // recibos.php); los contratos solo tienen proveedor_id, así que se
  // busca el nombre en DINERO.proveedores, ya cargado en memoria.
  const nombreDelDocumento = fila => {
    if (tipo === 'recibo') return fila.beneficiario || '—';
    const p = (DINERO.proveedores || []).find(x => x.id === fila.proveedor_id);
    return p ? p.nombre : '—';
  };

  const pintarLista = async (proveedorIdFiltro) => {
    contenedor.innerHTML = '<div class="esqueleto"></div>'.repeat(3);

    let filas;
    try {
      filas = await traer(config.endpoint + '?accion=listar'
        + (proveedorIdFiltro ? '&proveedor_id=' + proveedorIdFiltro : ''));
    } catch (error) {
      contenedor.innerHTML = '';
      pintarError(contenedor, error.message, () => pintarLista(proveedorIdFiltro));
      return;
    }

    if (!filas.length) {
      contenedor.innerHTML = '';
      pintarVacio(contenedor, 'Todavía no hay ' + config.titulo.toLowerCase(),
        'Los que generes van a aparecer aquí, solo para consultar.');
      return;
    }

    contenedor.innerHTML = filas.map(fila => {
      const [tituloFila, pie] = config.filaLista(fila);
      return '<button class="lista__fila" data-doc-id="' + seguro(fila.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + tituloFila + '</span>' +
          (proveedor ? '' : '<span class="lista__pie">' + seguro(nombreDelDocumento(fila)) + '</span>') +
          '<span class="lista__pie">' + pie + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    buscarTodos('[data-doc-id]', contenedor).forEach(boton => {
      boton.addEventListener('click', () => {
        const fila = filas.find(f => String(f.id) === boton.dataset.docId);
        if (!fila) return;
        const proveedorDeEsteDoc = proveedor
          || (DINERO.proveedores || []).find(p => p.id === fila.proveedor_id)
          || null;
        abrirDetalleDeDocumentoGuardado(tipo, fila, proveedorDeEsteDoc);
      });
    });
  };

  if (!proveedor) {
    buscar('#doc-filtro-proveedor', cuerpo).addEventListener('change', e => pintarLista(e.target.value));
  }

  await pintarLista(proveedor ? proveedor.id : '');
}

/**
 * El detalle de solo lectura de UN recibo o contrato ya generado.
 * Editar y Borrar están acá, nunca en la lista, y cada uno pide
 * confirmación explícita antes de hacer nada — ver la nota grande de
 * abrirListaDeDocumentos() sobre por qué.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} documento
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirDetalleDeDocumentoGuardado(tipo, documento, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const detalle = config.campos(documento).map(r =>
    '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
    '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
  ).join('');

  const botonesDeEstado = config.tieneEstado
    ? '<div class="acciones" style="margin-top:var(--esp-2)">' +
        '<button class="boton" data-marcar="enviado">Marcar enviado</button>' +
        '<button class="boton" data-marcar="firmado">Marcar firmado</button>' +
      '</div>'
    : '';

  const cuerpo = abrirHoja(
    config.tituloSingular + ' ' + (documento.numero || '#' + documento.id),
    '<div class="detalle">' + detalle + '</div>' +
    botonesDeEstado +
    (documento.archivo_id
      ? '<div class="acciones" style="margin-top:var(--esp-2)">' +
          '<button class="boton boton--principal" id="doc-ver">Ver PDF</button>' +
          '<button class="boton" id="doc-ver-whatsapp">Enviar por WhatsApp</button>' +
        '</div>'
      : '') +
    '<p class="vacio__texto" style="margin-top:var(--esp-3)">' +
      'Ya se generó y se guardó: el PDF no cambia aunque edites estos datos. ' +
      'Si el monto o la fecha estaban mal de verdad, lo correcto es borrar ' +
      'este ' + config.tituloSingular.toLowerCase() + ' y generar uno nuevo.' +
    '</p>' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      '<button class="boton boton--peligro" id="doc-borrar">Borrar</button>' +
      '<button class="boton" id="doc-editar">Editar datos</button>' +
    '</div>',
    () => abrirListaDeDocumentos(tipo, proveedor)
  );

  if (documento.archivo_id) {
    const nombreParaElArchivo = config.tituloSingular + ' ' + (documento.numero || documento.id) + '.pdf';

    buscar('#doc-ver', cuerpo).addEventListener('click', () => {
      abrirArchivo(documento.archivo_id, { tipo_mime: 'application/pdf', nombre_real: nombreParaElArchivo });
    });

    buscar('#doc-ver-whatsapp', cuerpo).addEventListener('click', () => {
      compartirArchivoPorWhatsApp(documento.archivo_id, nombreParaElArchivo,
        proveedor ? proveedor.telefono : '');
    });
  }

  buscarTodos('[data-marcar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        await mandar('recibos.php?accion=marcar_estado',
          { id: documento.id, estado: boton.dataset.marcar });
        avisar('Marcado como ' + boton.dataset.marcar + '.');
        documento.estado = boton.dataset.marcar;
        abrirDetalleDeDocumentoGuardado(tipo, documento, proveedor);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  // ⚡ FRICCIÓN INTENCIONAL: ni Editar ni Borrar hacen nada al primer
  // toque. Los dos piden confirmación explícita antes de seguir —un
  // documento ya generado no se toca con el mismo descuido que una nota.
  buscar('#doc-editar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion(
      'Esto corrige solo los datos guardados; el PDF ya generado no cambia. ¿Seguro que quieres editar?'
    )) return;
    abrirEdicionDeDocumento(tipo, documento, proveedor);
  });

  buscar('#doc-borrar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion(
      '¿Borrar este ' + config.tituloSingular.toLowerCase() + ' y su PDF?\n\n' +
      'No se puede deshacer.',
      { confirmar: 'Borrar ' + config.tituloSingular.toLowerCase(), peligro: true }
    )) return;

    try {
      const r = await mandar(config.endpoint + '?accion=borrar', { id: documento.id });

      /* Un recibo generado con "también registrarlo como pago" deja ese
         pago vivo al borrarse: el dinero seguía contando como pagado
         sin ningún papel detrás. El servidor dice cuál quedó y se
         ofrece borrarlo, nombrándolo — no se borra solo porque el pago
         pudo existir antes o haberse cargado a mano. */
      if (r && r.pago_sin_respaldo) {
        const p = r.pago_sin_respaldo;
        if (await confirmarAccion(
          'Queda un pago sin respaldo.\n\n' +
          '«' + p.concepto + '» por ' + comoDinero(p.monto) + ' se cargó junto ' +
          'con este recibo y sigue contando como pagado. ¿Lo borras también?',
          { confirmar: 'Borrar el pago', cancelar: 'Dejarlo', peligro: true }
        )) {
          await mandar('presupuesto.php?accion=borrar_pago', { id: p.id })
            .catch(error => avisar(error.message, true));
          ensuciarVistas('resumen', 'dinero');
        }
      }

      cerrarHoja(true);
      avisar(config.tituloSingular + ' eliminado.');
      // Sin proveedor (recibo a un padrino o a alguien sin ficha, o
      // se venía navegando desde la lista sin filtrar) no hay a qué
      // ficha volver — se vuelve a la lista general.
      if (proveedor) abrirDetalleDeProveedor(proveedor);
      else abrirListaDeDocumentos(tipo, null);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * El formulario de edición de un documento ya guardado — solo se llega
 * acá DESPUÉS de confirmar en abrirDetalleDeDocumentoGuardado(). Reusa
 * los mismos campos según el tipo; guarda con ?accion=editar.
 *
 * @param {'recibo'|'contrato'} tipo
 * @param {Object} documento
 * @param {Object} proveedor
 * @returns {void}
 */
function abrirEdicionDeDocumento(tipo, documento, proveedor) {
  const config = TIPOS_DE_DOCUMENTO[tipo];
  const esRecibo = tipo === 'recibo';

  const cuerpo = abrirHoja('Editar ' + config.tituloSingular.toLowerCase(),
    esRecibo
      /* El monto se muestra pero NO se edita: el PDF ya está numerado y
         entregado, y no se puede reescribir. Dejar cambiarlo hacía que
         el papel del proveedor y los libros dijeran cifras distintas.
         Se dice qué hacer en su lugar, en vez de ofrecer un campo que
         miente. */
      ? '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
          '<span class="detalle__rotulo">Monto</span> ' +
          '<span class="cifra">' + seguro(comoDinero(documento.monto)) + '</span>' +
          '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
            'El monto no se puede cambiar: el PDF ya entregado no se ' +
            'reescribe. Si el monto está mal, borra este recibo y haz ' +
            'uno nuevo.</p>' +
        '</div>' +
        campoLargo({ id: 'ed-concepto', rotulo: 'Concepto', valor: documento.concepto }) +
        campoTexto({ id: 'ed-forma', rotulo: 'Forma de pago', valor: documento.forma_pago }) +
        campoTexto({ id: 'ed-fecha', rotulo: 'Fecha', tipo: 'date', valor: documento.fecha })
      : campoTexto({ id: 'ed-monto', rotulo: 'Monto total', tipo: 'number', paso: '0.01',
                     valor: desdePesos(documento.monto_total) }) +
        campoLargo({ id: 'ed-descripcion', rotulo: 'Descripción del servicio',
                     valor: documento.descripcion_servicio }) +
        campoTexto({ id: 'ed-lugar', rotulo: 'Lugar', valor: documento.lugar }) +
    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const cambios = esRecibo
      // Sin `monto`: ver arriba, y el case 'editar' de recibos.php.
      ? {
          concepto:   valorDe('ed-concepto', cuerpo),
          forma_pago: valorDe('ed-forma', cuerpo),
          fecha:      valorDe('ed-fecha', cuerpo),
        }
      : {
          monto_total:          aPesos(valorDe('ed-monto', cuerpo)),
          descripcion_servicio: valorDe('ed-descripcion', cuerpo),
          lugar:                valorDe('ed-lugar', cuerpo),
        };

    try {
      await mandar(config.endpoint + '?accion=editar',
        Object.assign({ id: documento.id }, cambios));
      cerrarHoja(true);
      avisar('Guardado.');
      if (proveedor) abrirDetalleDeProveedor(proveedor);
      else abrirListaDeDocumentos(tipo, null);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Formulario de contrato de este proveedor. Casi todo viene pre-lleno
 * con lo que la ficha ya sabe: la idea es que aceptar los valores tal
 * cual, sin tocar nada, sea una opción real y rápida (ver la nota
 * grande en contratos.php sobre por qué). Es igual de opcional que
 * siempre — no bloquea ni pide nada para poder generar un recibo.
 *
 * @param {Object} proveedor
 * @returns {void}
 */
/** Cláusulas adicionales típicas de un contrato de servicio para una fiesta. */
const CLAUSULAS_SUGERIDAS = [
  'Confidencialidad: ninguna de las partes divulgará información privada de la otra conocida por este contrato.',
  'EL PRESTADOR podrá usar fotografías o video del evento con fines de promoción, salvo que LA CONTRATANTE lo prohíba expresamente por escrito.',
  'Ninguna de las partes será responsable por incumplimientos causados por caso fortuito o fuerza mayor.',
  'Cualquier modificación a este contrato deberá constar por escrito y estar firmada por ambas partes.',
  'EL PRESTADOR entregará el material adicional pactado (fotografías, video, recuerdos) en un plazo máximo de 30 días naturales tras el evento.',
];

/** Penalizaciones típicas por incumplimiento. */
const PENALIZACIONES_SUGERIDAS = [
  'Si EL PRESTADOR incumple sin causa justificada, reembolsará a LA CONTRATANTE la totalidad de lo ya entregado como anticipo.',
  'Por cada día de atraso injustificado en la entrega del servicio, EL PRESTADOR bonificará el 5% del monto total pactado.',
  'Si el servicio se entrega incompleto o de calidad menor a la pactada, LA CONTRATANTE podrá exigir un descuento proporcional.',
];

/** Políticas de cancelación típicas. */
const CANCELACION_SUGERIDA = [
  'Si LA CONTRATANTE cancela con 15 días naturales o menos de anticipación, el anticipo entregado no será reembolsable.',
  'Si LA CONTRATANTE cancela con 30 días naturales o más de anticipación, se reembolsará el 50% del anticipo entregado.',
  'La fecha del servicio podrá reprogramarse sin costo adicional si se avisa con al menos 30 días de anticipación y EL PRESTADOR tiene disponibilidad.',
  'Si es EL PRESTADOR quien cancela por cualquier motivo, reembolsará a LA CONTRATANTE la totalidad del anticipo entregado.',
];

function abrirGeneradorDeContrato(proveedor) {
  const hoy = hoyEnFecha();   // local, no UTC: ver hoyEnFecha()
  const fechaDelEvento = (CONFIGURACION.fiesta.fechaYHora || '').slice(0, 10);
  const horaDelEvento = (CONFIGURACION.fiesta.fechaYHora || '').slice(11, 16);

  const descripcionSugerida = (proveedor.detalle_items && proveedor.detalle_items.length)
    ? 'Servicio de ' + proveedor.servicio + ', que incluye: '
      + proveedor.detalle_items.map(it => it.texto).join(', ') + '.'
    : 'Servicio de ' + proveedor.servicio + '.';

  const formaDePagoSugerida = (Number(proveedor.pagado_real) || 0) > 0
    ? 'Anticipo de ' + comoDinero(proveedor.pagado_real, false)
      + ' y el saldo restante contra entrega del servicio.'
    : 'A convenir entre las partes.';

  const cuerpo = abrirHoja('Contrato · ' + proveedor.nombre,
    '<button type="button" class="lista__fila" id="con-configurar" ' +
            'style="margin-bottom:var(--esp-2)">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">⚙️ Numeración y datos de quien paga</span>' +
      '</span>' +
    '</button>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Ya viene lleno con lo que sabemos de este proveedor — revisa y ' +
      'ajusta lo que haga falta. Las cláusulas de abajo son sugerencias ' +
      'legales típicas: tilda las que quieras incluir, o escribe las tuyas.' +
    '</p>' +
    campoLargo({ id: 'con-descripcion', rotulo: 'Descripción del servicio',
                 valor: descripcionSugerida }) +
    /* Antes iban lado a lado en .campo-par: un input type="date" a media
       columna queda apretado (el navegador dibuja día/mes/año más el
       ícono del calendario, y a 50% de ancho en un teléfono se corta).
       Una fecha por renglón completo se ve entera siempre. */
    campoTexto({ id: 'con-fecha-evento', rotulo: 'Fecha del servicio', tipo: 'date',
                 valor: fechaDelEvento }) +
    campoTexto({ id: 'con-fecha-firma', rotulo: 'Fecha de firma', tipo: 'date',
                 valor: hoy }) +
    campoDinero({ id: 'con-monto', rotulo: 'Monto total',
                 valor: proveedor.monto_total ? desdePesos(proveedor.monto_total) : '' }) +
    campoLargo({ id: 'con-forma-pago', rotulo: 'Forma de pago', valor: formaDePagoSugerida }) +
    campoTexto({ id: 'con-lugar', rotulo: 'Lugar',
                 valor: CONFIGURACION.fiesta.lugar || '' }) +
    campoTexto({ id: 'con-horario', rotulo: 'Horario', tipo: 'time',
                 valor: horaDelEvento, pista: 'Opcional' }) +
    campoTexto({ id: 'con-identificacion', rotulo: 'RFC o identificación del proveedor',
                 pista: 'Opcional — si lo dejas vacío, no aparece en el contrato' }) +
    campoDeClausulas({ id: 'con-clausulas', rotulo: 'Cláusulas adicionales (opcional)',
                       opciones: CLAUSULAS_SUGERIDAS }) +
    campoDeClausulas({ id: 'con-penalizaciones', rotulo: 'Penalizaciones',
                       opciones: PENALIZACIONES_SUGERIDAS }) +
    campoDeClausulas({ id: 'con-cancelacion', rotulo: 'Política de cancelación',
                       opciones: CANCELACION_SUGERIDA }) +
    campoTexto({ id: 'con-jurisdiccion', rotulo: 'Jurisdicción', valor: 'México' }) +
    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="con-generar">' +
        'Generar PDF' +
      '</button>' +
    '</div>'
  );

  activarFormatoDeMiles('con-monto', cuerpo);

  buscar('#con-configurar', cuerpo).addEventListener('click', () => abrirConfiguracionDeDocumentos());

  buscar('#con-generar', cuerpo).addEventListener('click', async () => {
    const monto = aPesos(valorDe('con-monto', cuerpo));
    if (!monto || monto <= 0) {
      avisar('Pon un monto total mayor a cero.', true);
      return;
    }

    try {
      const resultado = await mandar('contratos.php?accion=generar', {
        proveedor_id:          proveedor.id,
        descripcion_servicio:  valorDe('con-descripcion', cuerpo),
        fecha_inicio:          valorDe('con-fecha-evento', cuerpo),
        fecha_firma:           valorDe('con-fecha-firma', cuerpo),
        monto_total:           monto,
        forma_pago:            valorDe('con-forma-pago', cuerpo),
        lugar:                 valorDe('con-lugar', cuerpo),
        horario:               valorDe('con-horario', cuerpo),
        proveedor_identificacion: valorDe('con-identificacion', cuerpo),
        clausulas_adicionales: valorDeClausulasDe('con-clausulas', cuerpo),
        penalizaciones:        valorDeClausulasDe('con-penalizaciones', cuerpo),
        cancelacion:           valorDeClausulasDe('con-cancelacion', cuerpo),
        jurisdiccion:          valorDe('con-jurisdiccion', cuerpo),
      });
      cerrarHoja(true);
      abrirResultadoDeDocumento(
        'Contrato ' + (resultado.numero ? resultado.numero + ' ' : '') + 'generado.',
        resultado.archivo_id, resultado.nombre, proveedor);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

function formularioProveedor(proveedor) {
  const d = proveedor || {};
  const cuerpo = abrirHoja(proveedor ? 'Editar proveedor' : 'Nuevo proveedor',
    campoTexto({ id: 'pro-nombre', rotulo: 'Nombre', valor: d.nombre }) +
    campoTexto({ id: 'pro-servicio', rotulo: 'Servicio', valor: d.servicio,
                 pista: 'Salón, DJ, fotografía…' }) +

    /* ⚡ SIN "ANTICIPO PAGADO" (2026-08-27). Antes era un número a mano
       que un pago marcado 'pagado' en Presupuesto nunca actualizaba —
       la ficha del proveedor ya muestra "Pagos registrados" con la
       suma real de sus pagos (`pagado_real`, calculado en
       presupuesto.php); pedir este número aparte solo invitaba a que
       se desincronizara, como pasó en la práctica. */
    campoDinero({ id: 'pro-total', rotulo: 'Monto total',
                  valor: d.monto_total ? desdePesos(d.monto_total) : '' }) +

    campoLista({ id: 'pro-estado', rotulo: 'Estado',
                 valor: d.estado || 'candidato',
                 opciones: [
                   { valor: 'candidato',  texto: 'Candidato' },
                   { valor: 'contratado', texto: 'Contratado' },
                   { valor: 'pagado',     texto: 'Pagado por completo' },
                   { valor: 'cancelado',  texto: 'Cancelado' },
                 ] }) +

    campoTexto({ id: 'pro-contacto', rotulo: 'Persona de contacto', valor: d.contacto }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'pro-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono,
                   ayuda: 'Con clave de país para poder abrirle WhatsApp: 52 722 123 4567' }) +
      campoTexto({ id: 'pro-correo', rotulo: 'Correo', tipo: 'email', valor: d.correo }) +
    '</div>' +

    /* Qué se le manda por WhatsApp de un toque. Los textos los arma
       compartir.php; acá solo se elige cuál le toca a este proveedor. */
    campoLista({ id: 'pro-paquete', rotulo: '¿Qué le mando a este?',
                 valor: d.paquete || '',
                 opciones: [
                   { valor: '',          texto: 'Nada automático' },
                   { valor: 'banquete',  texto: 'Menús y alergias' },
                   { valor: 'salon',     texto: 'Mesas y acomodo' },
                   { valor: 'fotografo', texto: 'Lista de tomas y cronograma' },
                   { valor: 'dj',        texto: 'Canciones y las prohibidas' },
                   { valor: 'iglesia',   texto: 'Datos de la misa y papeles' },
                   { valor: 'modista',   texto: 'Pruebas de vestido' },
                 ] }) +

    /* Aparte de las notas libres: acá va la lista de "qué trae" el
       proveedor, en renglones — no un párrafo. Ver 06-piezas.js. */
    campoListaDeDetalle({ id: 'pro-detalle', rotulo: 'Qué incluye',
                           items: d.detalle_items,
                           plantillas: plantillasSugeridasPara(d.servicio) }) +

    campoLargo({ id: 'pro-notas', rotulo: 'Notas', valor: d.notas }) +
    (proveedor ? botonesDeContacto(proveedor) : '') +
    pieDeFormulario('Guardar', !!proveedor)
  );

  if (proveedor) engancharBotonesDeContacto(cuerpo, proveedor);
  engancharListaDeDetalle('pro-detalle', cuerpo, plantillasSugeridasPara(d.servicio));
  activarFormatoDeMiles('pro-total', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const nombre = valorDe('pro-nombre', cuerpo);
    if (!nombre) { avisar('Falta el nombre.', true); return null; }
    return {
      nombre:        nombre,
      servicio:      valorDe('pro-servicio', cuerpo),
      monto_total:   aPesos(valorDe('pro-total', cuerpo)),
      estado:        valorDe('pro-estado', cuerpo),
      contacto:      valorDe('pro-contacto', cuerpo),
      telefono:      valorDe('pro-telefono', cuerpo),
      correo:        valorDe('pro-correo', cuerpo),
      paquete:       valorDe('pro-paquete', cuerpo),
      notas:         valorDe('pro-notas', cuerpo),
      detalle_items: valorDeListaDeDetalle('pro-detalle', cuerpo),
    };
  }, 'proveedor', proveedor);
}

/**
 * Los botones de llamar, escribir y mandarle lo suyo.
 *
 * Antes había que salir de Presupuesto e irse a la Agenda de contactos
 * solo para conseguir un teléfono que ya estaba en esta misma pantalla.
 *
 * @param {Object} p - El proveedor.
 * @returns {string} HTML
 */
function botonesDeContacto(p) {
  const numero = paraWhatsApp(p.telefono);
  const acciones = [];

  if (p.telefono) {
    acciones.push('<a class="boton" style="flex:1" href="tel:' +
                  seguro(p.telefono) + '">Llamar</a>');
  }

  if (numero) {
    acciones.push('<a class="boton" style="flex:1" target="_blank" rel="noopener" ' +
                  'href="https://wa.me/' + seguro(numero) + '">WhatsApp</a>');
  }

  if (p.correo) {
    acciones.push('<a class="boton" style="flex:1" href="mailto:' +
                  seguro(p.correo) + '">Correo</a>');
  }

  /* Un teléfono cargado que no sirve para WhatsApp se avisa acá y no
     cuando el chat abre vacío. Y si además tiene un paquete que
     mandarle, se dice por qué no aparece el botón de mandárselo: un
     botón que desaparece sin explicación se lee como que la app está
     rota, no como que falta un dato. */
  const problema =
      (p.telefono && !numero)
        ? '<p class="aviso-error" style="margin-top:var(--esp-1)">' +
          'Ese teléfono no sirve para WhatsApp: le falta la clave de país.' +
          (p.paquete ? ' Corrígelo y podrás mandarle lo suyo.' : '') + '</p>'
    : (p.paquete && !p.telefono)
        ? '<p class="aviso-error" style="margin-top:var(--esp-1)">' +
          'Tiene un paquete para mandarle, pero no tiene teléfono cargado.</p>'
    : '';

  /* El mismo criterio que el botón de WhatsApp de arriba: sin un número
     que sirva no se ofrece "mandarle", porque el enlace abría el
     selector de contactos vacío y —peor— al tocarlo se anotaba que ya
     se le había mandado. Un proveedor que nunca recibió nada quedaba
     marcado como avisado. Con teléfono cargado pero inservible, el
     aviso de abajo ya explica qué le falta. */
  const mandarle = (p.paquete && numero)
    ? '<button class="boton boton--ancho" id="pro-mandarle" ' +
              'style="margin-top:var(--esp-1)">Mandarle lo suyo por WhatsApp</button>'
    : '';

  /* "Van $X, queda $Y para el 10 de octubre." Es la conversación que se
     tiene con cada proveedor antes de cada pago, y el dato estaba
     entero en esta misma ficha sin forma de mandárselo. No depende del
     paquete: cualquier proveedor con teléfono tiene una cuenta. */
  const estadoDeCuenta = numero
    ? '<button class="boton boton--ancho" id="pro-cuenta" ' +
              'style="margin-top:var(--esp-1)">Mandarle su estado de cuenta</button>'
    : '';

  if (!acciones.length && !mandarle && !estadoDeCuenta) return problema;

  return '' +
    '<div class="acciones" style="margin-top:var(--esp-2)">' +
      acciones.join('') +
    '</div>' +
    mandarle +
    estadoDeCuenta +
    problema;
}

/**
 * Engancha el botón de "mandarle lo suyo".
 *
 * @param {Element} cuerpo
 * @param {Object} p
 * @returns {void}
 */
function engancharBotonesDeContacto(cuerpo, p) {
  const cuenta = buscar('#pro-cuenta', cuerpo);
  if (cuenta) {
    cuenta.addEventListener('click', () => {
      /* Sin `enviado_en`/`huella`: el aviso de "esto cambió desde que se
         lo mandaste" es del PAQUETE del proveedor, y un estado de cuenta
         cambia con cada pago — avisar de eso sería ruido, no protección.
         El envío igual queda anotado con paquete 'cuenta', que no se
         mezcla con el del paquete real (la comparación filtra por
         paquete; ver la subconsulta de enviado_en en presupuesto.php). */
      armarParaCompartir('cuenta', { id: p.id, nombre: p.nombre });
    });
  }

  const boton = buscar('#pro-mandarle', cuerpo);
  if (!boton) return;

  boton.addEventListener('click', () => {
    /* armarParaCompartir abre su propia hoja encima de esta.
       `enviado_en` y `huella` son lo que le permite avisar "esto cambió
       desde que se lo mandaste": sin pasarlos, ese aviso solo salía
       entrando por Menú → Compartir, y por acá —que es la puerta que se
       usa a diario— se mandaba una lista vieja sin una sola palabra. */
    armarParaCompartir(p.paquete, {
      id:         p.id,
      nombre:     p.nombre,
      enviado_en: p.enviado_en,
      huella:     p.huella,
    });
  });
}


function formularioCotizacion(cotizacion) {
  const d = cotizacion || {};
  const cuerpo = abrirHoja(cotizacion ? 'Editar cotización' : 'Nueva cotización',
    campoTexto({ id: 'cot-servicio', rotulo: 'Servicio', valor: d.servicio,
                 ayuda: 'Escribe el mismo nombre en todas las del mismo rubro ' +
                        'para poder compararlas juntas.' }) +
    campoTexto({ id: 'cot-proveedor', rotulo: 'Quién cotiza', valor: d.proveedor }) +

    /* Casi todos los salones cobran POR PERSONA. Sin esta distinción no
       se puede comparar nada: $550 por persona y $60,000 cerrados son
       números que no se pueden mirar uno al lado del otro. */
    campoLista({ id: 'cot-tipo', rotulo: 'Cómo cobra',
                 valor: d.tipo_precio || 'fijo',
                 opciones: [
                   { valor: 'fijo',        texto: 'Un precio cerrado' },
                   { valor: 'por_persona', texto: 'Por persona' },
                 ] }) +

    '<div class="campo-par">' +
      campoDinero({ id: 'cot-monto', rotulo: 'Precio cerrado',
                    valor: d.monto ? desdePesos(d.monto) : '' }) +
      campoDinero({ id: 'cot-pp', rotulo: 'Precio por persona',
                    valor: d.precio_pp ? desdePesos(d.precio_pp) : '' }) +
    '</div>' +

    campoTexto({ id: 'cot-vigencia', rotulo: 'Vale hasta', tipo: 'date',
                 valor: d.vigencia || '' }) +

    campoTexto({ id: 'cot-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: d.telefono }) +

    /* Migra sola la primera vez que se abre: si ya tiene detalle_items
       (formato nuevo) se usa tal cual; si no, se parte el que_incluye
       viejo en renglones. Nada se borra hasta que se guarde. */
    campoListaDeDetalle({
      id: 'cot-incluye', rotulo: 'Qué incluye',
      items: (d.detalle_items && d.detalle_items.length)
        ? d.detalle_items : itemsDesdeTexto(d.que_incluye),
    }) +

    campoCasilla({ id: 'cot-elegida', rotulo: 'Es la que elegimos',
                   marcado: Number(d.elegida) === 1 }) +
    pieDeFormulario('Guardar', !!cotizacion)
  );

  engancharListaDeDetalle('cot-incluye', cuerpo);

  activarFormatoDeMiles('cot-monto', cuerpo);
  activarFormatoDeMiles('cot-pp', cuerpo);

  engancharFormularioDinero(cuerpo, () => {
    const servicio  = valorDe('cot-servicio', cuerpo);
    const proveedor = valorDe('cot-proveedor', cuerpo);
    if (!servicio || !proveedor) {
      avisar('Falta el servicio o quién cotiza.', true);
      return null;
    }

    const items = valorDeListaDeDetalle('cot-incluye', cuerpo);

    return {
      servicio:      servicio,
      proveedor:     proveedor,
      tipo_precio:   valorDe('cot-tipo', cuerpo),
      monto:         aPesos(valorDe('cot-monto', cuerpo)),
      precio_pp:     aPesos(valorDe('cot-pp', cuerpo)),
      vigencia:      valorDe('cot-vigencia', cuerpo),
      telefono:      valorDe('cot-telefono', cuerpo),
      detalle_items: items,
      /* Espejo en texto plano: lo sigue leyendo el comparador viejo
         (21-cotizador.js, "Notas del paquete"). La fuente de verdad
         para editar es detalle_items; esto es solo para no dejarlo
         vacío mientras ese lector no se actualice también. */
      que_incluye:   items.map(it => it.texto).join('; '),
      elegida:       !!valorDe('cot-elegida', cuerpo),
    };
  }, 'cotizacion', cotizacion);
}
