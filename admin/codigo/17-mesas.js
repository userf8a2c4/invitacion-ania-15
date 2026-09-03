/* ══════════════════════════════════════════════════════════════════════
   17 · MESAS Y ACOMODO

   QUÉ HACE ESTE ARCHIVO
   La pantalla donde se decide quién se sienta dónde: crear las mesas,
   dejar que se acomoden solas, y corregir a mano lo que haga falta.

   CÓMO ESTÁ PENSADA
   Arriba, siempre, los cuatro números que contestan "¿entra todo el
   mundo?". Después, los que todavía no tienen mesa —porque eso es lo
   que hay que resolver—. Y al final el salón: el PLANO, que dibuja las
   mesas donde están de verdad, o la lista para repasar nombre por
   nombre.

   LA COMPUTADORA PROPONE, LA PERSONA DISPONE
   Sentar a alguien a mano es una propuesta, no un candado: el acomodo
   automático puede volver a moverlo. Para trabar una asignación hay que
   tocar "Fijar aquí" a propósito.

   Antes todo sentado manual quedaba fijado, y después de mover cinco
   personas de prueba el automático ya casi no tenía margen. Además,
   ahora se guarda una foto antes de cada acomodo, así que se puede
   probar y volver atrás.

   ÍNDICE
     1. Datos y dibujado
     1B. El plano del salón
     2. Cuando todavía no hay mesas
     3. Las mesas y su gente
     4. Sentar a mano
     5. Grupos, peleas y preferencias
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió mesas.php la última vez. */
let MESAS = null;

/** Si se está viendo el plano del salón o la lista: 'plano' o 'lista'. */
let VISTA_DE_MESAS = recordado('vista-de-mesas', 'plano');

/** Modo del plano: 'ver' (solo mirar) o 'editar' (se puede arrastrar
    gente a una mesa). Arranca siempre en 'ver' para que nada se mueva
    sin querer al abrir la pantalla (Fase 5 del rediseño). */
let MODO_PLANO = 'ver';

/** Estado del arrastre en curso desde "Sin mesa" hacia una mesa, o null
    si no se está arrastrando nada. */
let ARRASTRE_PLANO = null;


/* ─── 1. DATOS Y DIBUJADO ──────────────────────────────────────────── */

/**
 * Pide el panorama y arma la pantalla.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function pintarMesas(cuerpo) {
  pintarCargando(cuerpo, 4);

  try {
    MESAS = await traer('mesas.php?accion=todo');
  } catch (error) {
    pintarError(cuerpo, error.message, () => pintarMesas(cuerpo));
    return;
  }

  // Sin mesas creadas no hay nada que acomodar: se ofrece crearlas.
  if (!MESAS.mesas.length) {
    pintarArranqueDeMesas(cuerpo);
    return;
  }

  cuerpo.innerHTML =
    bloqueResumenDeMesas(MESAS.resumen) +
    bloqueBotonesDeMesas() +

    /* Plano o lista. El plano es el que sirve para decidir —muestra
       dónde queda cada mesa— y la lista para repasar nombre por nombre. */
    '<div class="filtros">' +
      '<button class="filtro' + (VISTA_DE_MESAS === 'plano' ? ' activo' : '') +
        '" data-vista-mesas="plano">Plano</button>' +
      '<button class="filtro' + (VISTA_DE_MESAS === 'lista' ? ' activo' : '') +
        '" data-vista-mesas="lista">Lista</button>' +
    '</div>' +

    bloqueSinSentar(MESAS.sin_sentar) +
    (VISTA_DE_MESAS === 'plano'
      ? bloqueDelPlano(MESAS.mesas)
      : bloqueDeLasMesas(MESAS.mesas));

  engancharMesas(cuerpo);

  buscarTodos('[data-vista-mesas]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      VISTA_DE_MESAS = boton.dataset.vistaMesas;
      recordar('vista-de-mesas', VISTA_DE_MESAS);
      pintarMesas(cuerpo);
    });
  });
}


/* ─── 1B. EL PLANO DEL SALÓN ───────────────────────────────────────── */

/*
   QUÉ ES Y POR QUÉ EXISTE

   El dibujo del salón como es de verdad: la mesa principal arriba, la
   pista, las catorce mesas en cuatro columnas, el bufet, los baños, la
   barra y la entrada. Sale de la planilla que ya usaba Lucila.

   POR QUÉ UNA LISTA NO ALCANZABA
   Acomodar gente es decidir QUIÉN QUEDA CERCA DE QUÉ: los abuelos lejos
   del parlante, los amigos pegados a la pista, la familia cerca de la
   mesa principal. Con una lista de nombres esa decisión se toma de
   memoria, imaginándose el salón. Acá se ve.

   Por eso `mesas.ubicacion` existía desde el principio y no servía para
   nada: se podía escribir "cerca de la pista" pero nunca se dibujaba.
*/

/**
 * Dibuja el plano completo.
 *
 * @param {Array} mesas
 * @returns {string} HTML
 */
function bloqueDelPlano(mesas) {
  const salon = CONFIGURACION.salon;

  /* Las que todavía no tienen lugar en el plano van aparte, abajo. Sin
     esto desaparecerían de la pantalla sin explicación. */
  const ubicadas  = mesas.filter(m => m.fila > 0 && m.columna > 0);
  const sinUbicar = mesas.filter(m => !(m.fila > 0 && m.columna > 0));

  if (!ubicadas.length) {
    return '' +
      '<div class="tarjeta">' +
        '<div class="tarjeta__titulo">El plano está vacío</div>' +
        '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
          'Ninguna mesa tiene todavía su lugar en el salón. Con el botón ' +
          'de abajo se crean las catorce del Salón Estrella, cada una en ' +
          'su sitio, tal como están en la hoja de cálculo.' +
        '</p>' +
        '<button class="boton boton--principal boton--ancho" id="mesa-armar-salon">' +
          'Armar el salón de Alvi' +
        '</button>' +
      '</div>' +
      (sinUbicar.length ? bloqueDeLasMesas(sinUbicar) : '');
  }

  const celdas = salon.fijos.map(f =>
    '<div class="plano__fijo plano__fijo--' + seguro(f.tipo) + '" ' +
         'style="grid-row:' + f.fila + ';grid-column:' + f.desde +
         ' / span ' + f.ancho + '">' +
      '<span aria-hidden="true">' + f.icono + '</span> ' + seguro(f.nombre) +
    '</div>'
  ).concat(ubicadas.map(m => celdaDeMesaEnElPlano(m))).join('');

  return '' +
    bloqueModoDelPlano() +

    '<div class="plano-lienzo-exterior" id="plano-lienzo-exterior">' +
      '<div class="plano-lienzo" id="plano-lienzo">' +
        '<div class="plano" style="grid-template-columns:repeat(' +
             salon.columnas + ',1fr)">' + celdas + '</div>' +
      '</div>' +
    '</div>' +

    leyendaDelPlano() +

    '<p class="vacio__texto" style="text-align:center;margin-bottom:var(--esp-3)">' +
      (MODO_PLANO === 'editar'
        ? 'Arrastra a alguien de "Sin mesa" hasta una mesa, o toca una mesa para verla.'
        : 'Toca una mesa para ver quién se sienta ahí.') +
    '</p>' +

    (sinUbicar.length
      ? '<div class="tarjeta__titulo">Sin lugar en el plano</div>' +
        bloqueDeLasMesas(sinUbicar)
      : '');
}

/**
 * El interruptor "ver / editar" del plano. En "ver" nada se puede
 * arrastrar sin querer; en "editar" se habilita el arrastre desde
 * "Sin mesa" hacia las mesas del plano.
 *
 * @returns {string} HTML
 */
function bloqueModoDelPlano() {
  return '' +
    '<div class="modo-plano">' +
      '<button class="modo-plano__opcion' +
        (MODO_PLANO === 'ver' ? ' activo' : '') + '" data-modo-plano="ver">' +
        'Ver</button>' +
      '<button class="modo-plano__opcion' +
        (MODO_PLANO === 'editar' ? ' activo' : '') + '" data-modo-plano="editar">' +
        'Editar</button>' +
    '</div>';
}

/**
 * La leyenda del plano: qué significa cada color y cada punto.
 *
 * "Como el original" (la planilla de Lucila) tenía su propia leyenda de
 * colores; esta es la versión de la app, con los mismos cuatro estados
 * más el significado de las sillitas.
 *
 * @returns {string} HTML
 */
function leyendaDelPlano() {
  const item = (claseMesa, texto) =>
    '<span class="leyenda__item">' +
      '<span class="leyenda__muestra plano__mesa--' + claseMesa + '"></span>' +
      seguro(texto) +
    '</span>';

  return '' +
    '<div class="leyenda">' +
      item('vacia', 'Vacía') +
      item('con-gente', 'Con gente') +
      item('completa', 'Completa') +
      item('pasada', 'Se pasó') +
      '<span class="leyenda__item">' +
        '<span class="plano__silla plano__silla--llena" ' +
             'style="position:static;display:inline-block"></span>' +
        'Silla ocupada' +
      '</span>' +
      '<span class="leyenda__item">' +
        '<span class="plano__silla plano__silla--vacia" ' +
             'style="position:static;display:inline-block"></span>' +
        'Silla libre' +
      '</span>' +
    '</div>';
}

/**
 * Una mesa dentro del plano.
 *
 * El color dice de un vistazo cómo está: vacía, con lugar, completa o
 * pasada. Es la información que uno busca al mirar el salón entero, y
 * leerla en números mesa por mesa sería mucho más lento.
 *
 * @param {Object} mesa
 * @returns {string} HTML
 */
function celdaDeMesaEnElPlano(mesa) {
  const libres = mesa.capacidad - mesa.ocupados;

  let como = 'vacia';
  if (mesa.ocupados > mesa.capacidad) como = 'pasada';
  else if (libres === 0)              como = 'completa';
  else if (mesa.ocupados > 0)         como = 'con-gente';

  /* El nombre se acorta porque en una grilla de cuatro columnas en un
     teléfono no entra "Mesa de los abuelos" entero. */
  const corto = mesa.nombre.replace(/^Mesa\s+/i, '');

  return '' +
    '<button class="plano__mesa plano__mesa--' + como + '" ' +
            'data-plano-mesa="' + seguro(mesa.id) + '" ' +
            'style="grid-row:' + mesa.fila + ';grid-column:' + mesa.columna + '" ' +
            'aria-label="' + seguro(mesa.nombre + ': ' + mesa.ocupados +
                                    ' de ' + mesa.capacidad) + '">' +
      sillasDeLaMesa(mesa) +
      '<span class="plano__nombre">' + seguro(corto) + '</span>' +
      nombresEnLaCelda(mesa) +
      '<span class="plano__cuenta">' +
        seguro(mesa.ocupados + '/' + mesa.capacidad) +
      '</span>' +
    '</button>';
}

/**
 * El anillo de sillitas alrededor de la mesa: llenas las ocupadas,
 * vacías las libres. De un vistazo se ve dónde hay lugar sin leer un
 * número — que es justo lo que un número por sí solo no dice.
 *
 * Se ponen en círculo con trigonometría simple (ángulo según la
 * posición de cada silla), igual que se dibujarían alrededor de una
 * mesa redonda de verdad.
 *
 * @param {Object} mesa
 * @returns {string} HTML
 */
function sillasDeLaMesa(mesa) {
  // Más de 10 sillas ya no se leen bien en una celda de teléfono: a
  // partir de ahí se confía en el número de abajo, no en los puntos.
  const total = Math.min(mesa.capacidad, 10);
  if (total < 1) return '';

  const sillas = [];
  for (let i = 0; i < total; i++) {
    const angulo = (i / total) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + 46 * Math.cos(angulo);
    const y = 50 + 46 * Math.sin(angulo);
    const llena = i < mesa.ocupados;

    sillas.push(
      '<span class="plano__silla plano__silla--' + (llena ? 'llena' : 'vacia') + '" ' +
           'style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%"></span>'
    );
  }
  return '<span class="plano__sillas" aria-hidden="true">' + sillas.join('') + '</span>';
}

/**
 * Hasta dos nombres de quiénes están sentados, para no tener que abrir
 * la mesa solo para saber si son "los primos" o "los del trabajo".
 *
 * @param {Object} mesa
 * @returns {string} HTML
 */
function nombresEnLaCelda(mesa) {
  const invitados = mesa.invitados || [];
  if (!invitados.length) return '';

  const primeros = invitados.slice(0, 2).map(i => primerNombre(i.nombre));
  const resto = invitados.length - primeros.length;

  return '<span class="plano__nombres">' +
    seguro(primeros.join(', ') + (resto > 0 ? ' +' + resto : '')) +
  '</span>';
}

/**
 * El primer nombre de pila, para que quepa en la celda.
 *
 * @param {string} nombreCompleto
 * @returns {string}
 */
function primerNombre(nombreCompleto) {
  return String(nombreCompleto || '').trim().split(/\s+/)[0] || '';
}

/**
 * Los cuatro números de arriba.
 *
 * @param {Object} r
 * @returns {string} HTML
 */
function bloqueResumenDeMesas(r) {
  /* El aviso de que falta lugar va arriba y en rojo porque es el único
     problema que NO se arregla acomodando mejor: hay que agregar mesas
     o sillas, y cuanto antes se sepa, mejor. */
  const falta = r.faltan_lugares > 0
    ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
      'Faltan ' + seguro(r.faltan_lugares) + ' lugares: hay ' +
      seguro(r.gente) + ' personas y solo ' + seguro(r.capacidad) +
      ' sillas. Agrega mesas o subile la capacidad a las que hay.</p>'
    : '';

  return '' +
    '<div class="tarjeta">' +
      '<div class="rejilla-datos" style="margin-bottom:0">' +
        tarjetaDato(r.gente,      'Personas') +
        tarjetaDato(r.capacidad,  'Lugares') +
        tarjetaDato(r.mesas,      'Mesas') +
        tarjetaDato(r.sin_sentar, 'Sin mesa') +
      '</div>' +
      falta +
    '</div>';
}

/**
 * Los botones de acción.
 *
 * @returns {string} HTML
 */
function bloqueBotonesDeMesas() {
  return '' +
    '<div style="display:flex;gap:var(--esp-2);margin-bottom:var(--esp-2)">' +
      '<button class="boton boton--principal" style="flex:2" id="mesa-auto">' +
        'Acomodar a todos' +
      '</button>' +
      '<span style="display:flex;align-items:center">' +
        ayuda('mesas.acomodar') + '</span>' +
      '<button class="boton" style="flex:1" id="mesa-reglas">Reglas de acomodo</button>' +
    '</div>';
}

/**
 * Los que todavía no tienen mesa.
 *
 * @param {Array} gente
 * @returns {string} HTML
 */
function bloqueSinSentar(gente) {
  if (!gente.length) {
    return '<div class="tarjeta" style="border-color:var(--bien)">' +
           '<p class="vacio__texto" style="color:var(--bien)">' +
           'Todos los que confirmaron tienen mesa.</p></div>';
  }

  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-3) 0 var(--esp-2)">' +
      'Sin mesa (' + gente.length + ')' +
    '</div>' +
    gente.map(p =>
      '<button class="lista__fila" data-sentar="' + seguro(p.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
          '<span class="lista__pie">' +
            seguro(pluralizar(p.lugares, 'lugar', 'lugares') +
                   (p.grupo ? ' · ' + p.grupo : '')) +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          '<span class="etiqueta etiqueta--ojo">Sentar</span>' +
        '</span>' +
      '</button>'
    ).join('');
}

/**
 * Las mesas con su gente adentro.
 *
 * @param {Array} mesas
 * @returns {string} HTML
 */
function bloqueDeLasMesas(mesas) {
  return '' +
    '<div class="tarjeta__titulo" style="margin:var(--esp-4) 0 var(--esp-2)">' +
      'Las mesas' +
    '</div>' +

    mesas.map(mesa => {
      const libres = mesa.capacidad - mesa.ocupados;
      const llena  = mesa.ocupados > mesa.capacidad;

      const estado = llena
        ? '<span class="etiqueta etiqueta--alerta">Se pasa por ' +
          seguro(mesa.ocupados - mesa.capacidad) + '</span>'
        : libres === 0
          ? '<span class="etiqueta etiqueta--bien">Completa</span>'
          : '<span class="etiqueta etiqueta--tenue">' +
            seguro(pluralizar(libres, 'libre', 'libres')) + '</span>';

      const pct = mesa.capacidad > 0
        ? Math.min(100, Math.round(mesa.ocupados / mesa.capacidad * 100)) : 0;

      const gente = mesa.invitados.length
        ? mesa.invitados.map(inv =>
            '<button class="lista__fila" style="margin-left:var(--esp-2)" ' +
                    'data-mover="' + seguro(inv.id) + '">' +
              '<span class="lista__cuerpo">' +
                '<span class="lista__titulo">' +
                  (inv.fijada ? '<span style="color:var(--oro)">•</span> ' : '') +
                  seguro(inv.nombre) +
                '</span>' +
                '<span class="lista__pie">' +
                  seguro(pluralizar(inv.lugares, 'lugar', 'lugares') +
                         (inv.grupo ? ' · ' + inv.grupo : '')) +
                '</span>' +
              '</span>' +
            '</button>'
          ).join('')
        : '<p class="vacio__texto" style="margin-left:var(--esp-3)">Vacía</p>';

      return '' +
        '<div class="tarjeta" style="padding:var(--esp-2)">' +
          '<div style="display:flex;justify-content:space-between;' +
                      'align-items:center;gap:var(--esp-2)">' +
            '<button style="border:0;background:none;color:inherit;' +
                    'text-align:left;flex:1;padding:0" ' +
                    'data-editar-mesa="' + seguro(mesa.id) + '">' +
              '<strong>' + seguro(mesa.nombre) + '</strong>' +
              '<span class="vacio__texto"> · ' +
                seguro(mesa.ocupados + '/' + mesa.capacidad) + '</span>' +
              (mesa.ubicacion
                ? '<span class="lista__pie">' + seguro(mesa.ubicacion) + '</span>'
                : '') +
            '</button>' +
            estado +
          '</div>' +

          '<div class="barra" style="margin:6px 0 var(--esp-1)">' +
            '<div class="barra__relleno' + (llena ? ' barra__relleno--pasado' : '') +
                 '" style="width:' + pct + '%"></div>' +
          '</div>' +

          gente +
        '</div>';
    }).join('') +

    '<button class="boton boton--ancho" id="mesa-nueva" ' +
            'style="margin-top:var(--esp-2)">Agregar una mesa</button>';
}


/* ─── 2. CUANDO TODAVÍA NO HAY MESAS ───────────────────────────────── */

/**
 * La pantalla de arranque: crear el salón de una vez.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarArranqueDeMesas(cuerpo) {
  const gente = MESAS.resumen.gente;

  /* Se sugiere una cantidad de mesas que alcance para la gente que ya
     confirmó, redondeando para arriba. Es solo una sugerencia: el campo
     queda editable. */
  const sugeridas = Math.max(1, Math.ceil(gente / 10)) || 8;

  cuerpo.innerHTML =
    /* ─── EL CAMINO CORTO ────────────────────────────────────────────
     *
     * Va PRIMERO y destacado porque es el que sirve en este evento: el
     * salón ya está contratado y su plano ya se conoce. Pedirle a
     * alguien que cuente las mesas de Alvi a mano, cuando el panel las
     * sabe, es trabajo inventado.
     *
     * ⚠️ Antes este botón solo existía dentro del plano, o sea que
     * hacía falta tener mesas para poder crear las mesas. Con la base
     * vacía no aparecía por ningún lado. */
    '<div class="tarjeta" style="border-color:var(--oro)">' +
      '<div class="tarjeta__titulo">El salón de Alvi' +
        ayuda('mesas.acomodar') + '</div>' +
      '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
        'Creo las ' + CONFIGURACION.salon.mesas.length + ' mesas del Salón ' +
        'Estrella de ' + CONFIGURACION.salon.capacidad + ' lugares cada una, ' +
        'y las coloco en el plano donde están de verdad: la principal ' +
        'arriba, la pista, el bufet, los baños y la barra.' +
      '</p>' +
      '<button class="boton boton--principal boton--ancho" id="mesa-armar-salon">' +
        'Armar el salón de Alvi' +
      '</button>' +
    '</div>' +

    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">O crearlas a mano</div>' +
      '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
        'Si el salón fuera otro: crea todas las mesas de una vez y después ' +
        'acomoda la gente. Puedes cambiar cualquiera después, una por una. ' +
        'Estas nacen sin lugar en el plano; se les puede poner después.' +
      '</p>' +

      '<div class="campo-par">' +
        campoTexto({ id: 'lote-cuantas', rotulo: 'Cuántas mesas',
                     tipo: 'number', valor: sugeridas }) +
        campoTexto({ id: 'lote-capacidad', rotulo: 'Sillas por mesa',
                     tipo: 'number', valor: 10 }) +
      '</div>' +

      campoTexto({ id: 'lote-prefijo', rotulo: 'Cómo se llaman',
                   valor: 'Mesa',
                   ayuda: 'Se numeran solas: Mesa 1, Mesa 2, Mesa 3…' }) +

      '<button class="boton boton--principal boton--ancho" id="lote-crear">' +
        'Crear las mesas' +
      '</button>' +

      (gente
        ? '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
          'Hay ' + seguro(gente) + ' personas confirmadas.</p>'
        : '') +
    '</div>';

  buscar('#mesa-armar-salon', cuerpo).addEventListener('click',
    () => armarElSalon(() => pintarMesas(cuerpo)));

  buscar('#lote-crear', cuerpo).addEventListener('click', async () => {
    const cuantas = Number(valorDe('lote-cuantas', cuerpo)) || 0;
    const sillas  = Number(valorDe('lote-capacidad', cuerpo)) || 0;

    if (cuantas < 1) { avisar('Pon cuántas mesas.', true); return; }
    if (sillas < 1)  { avisar('Pon cuántas sillas por mesa.', true); return; }

    try {
      const r = await mandar('mesas.php?accion=crear_lote', {
        cuantas: cuantas,
        capacidad: sillas,
        prefijo: valorDe('lote-prefijo', cuerpo) || 'Mesa',
      });
      avisar(r.mensaje);
      pintarMesas(cuerpo);
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/* ─── 3. LAS MESAS Y SU GENTE ──────────────────────────────────────── */

/**
 * Engancha todos los botones de la pantalla.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function engancharMesas(cuerpo) {
  const refrescar = () => pintarMesas(cuerpo);

  buscar('#mesa-auto', cuerpo).addEventListener('click', () => acomodarSolo(refrescar));
  buscar('#mesa-reglas', cuerpo).addEventListener('click', () => abrirReglasDeAcomodo(refrescar));

  /* Estos tres pueden no estar según qué vista se esté mirando. */
  const nueva = buscar('#mesa-nueva', cuerpo);
  if (nueva) nueva.addEventListener('click', () => formularioEvento('mesas'));

  const armar = buscar('#mesa-armar-salon', cuerpo);
  if (armar) armar.addEventListener('click', () => armarElSalon(refrescar));

  // Tocar una mesa del plano abre quiénes se sientan ahí.
  buscarTodos('[data-plano-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      abrirLaMesa(Number(boton.dataset.planoMesa), refrescar));
  });

  buscarTodos('[data-sentar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.sentar), refrescar));
  });

  buscarTodos('[data-mover]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.mover), refrescar));
  });

  buscarTodos('[data-editar-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const mesa = mesaParaEditar(boton.dataset.editarMesa);
      if (mesa) formularioEvento('mesas', mesa);
      else avisar('Esa mesa ya no está. Actualiza la pantalla.', true);
    });
  });

  const modoPlano = buscar('.modo-plano', cuerpo);
  if (modoPlano) {
    buscarTodos('[data-modo-plano]', modoPlano).forEach(boton => {
      boton.addEventListener('click', () => {
        MODO_PLANO = boton.dataset.modoPlano;
        pintarMesas(cuerpo);
      });
    });
  }

  const lienzoExterior = buscar('#plano-lienzo-exterior', cuerpo);
  if (lienzoExterior) {
    if (MODO_PLANO === 'editar') engancharArrastreHaciaElPlano(cuerpo, refrescar);
  }
}


/* ⚡ ACÁ YA NO HAY ZOOM NI DESPLAZAMIENTO DEL PLANO (2026-09-02).

   El plano tenía pellizco para acercar (de 0,5x a 3x), arrastre para
   moverse y tres botones de control. Eso convertía el plano en algo que
   hay que MANEJAR antes de poder consultarlo: para saber quién está en la
   mesa 7 había que acercar, buscar, y después volver a encuadrar.

   La pregunta real nunca fue "¿cómo agrando el plano?" sino "¿quién está
   en esta mesa y qué come?". Para eso alcanza con tocar la mesa: se abre
   su detalle, con cada persona, su plato y su alergia. Un gesto que nadie
   tiene que aprender, en lugar de dos que hay que descubrir.

   Se quitaron también ZOOM_PLANO y aplicarTransformDelPlano(): sin gestos
   que lo cambien, el lienzo se dibuja siempre en su tamaño natural. */

/**
 * Arrastrar a alguien de "Sin mesa" hasta una mesa del plano, solo en
 * modo editar. No se usa drag-and-drop nativo de HTML5 porque no
 * funciona con el dedo en pantallas táctiles: se arma a mano con
 * Pointer Events, un elemento "fantasma" que sigue al dedo, y
 * document.elementFromPoint() para saber sobre qué mesa se soltó.
 *
 * El toque corto (sin mover) sigue abriendo el selector de mesa de
 * siempre — solo un arrastre real dispara el suelte directo.
 *
 * @param {Element} cuerpo
 * @param {Function} refrescar
 * @returns {void}
 */
function engancharArrastreHaciaElPlano(cuerpo, refrescar) {
  const UMBRAL_ARRASTRE = 10; // px antes de considerarlo arrastre y no toque.

  buscarTodos('[data-sentar]', cuerpo).forEach(fila => {
    fila.addEventListener('pointerdown', evento => {
      const id = Number(fila.dataset.sentar);
      const persona = (MESAS.sin_sentar || []).find(p => p.id === id);
      if (!persona) return;

      ARRASTRE_PLANO = {
        id, persona,
        inicioX: evento.clientX, inicioY: evento.clientY,
        movido: false,
        fantasma: null,
      };

      const seguirDedo = e => {
        if (!ARRASTRE_PLANO) return;
        const dx = e.clientX - ARRASTRE_PLANO.inicioX;
        const dy = e.clientY - ARRASTRE_PLANO.inicioY;

        if (!ARRASTRE_PLANO.movido && Math.hypot(dx, dy) > UMBRAL_ARRASTRE) {
          ARRASTRE_PLANO.movido = true;
          const fantasma = document.createElement('div');
          fantasma.className = 'plano-fantasma';
          fantasma.textContent = persona.nombre;
          document.body.appendChild(fantasma);
          ARRASTRE_PLANO.fantasma = fantasma;
        }

        if (ARRASTRE_PLANO.movido && ARRASTRE_PLANO.fantasma) {
          ARRASTRE_PLANO.fantasma.style.left = e.clientX + 'px';
          ARRASTRE_PLANO.fantasma.style.top  = e.clientY + 'px';

          buscarTodos('.plano__mesa', cuerpo).forEach(m =>
            m.classList.remove('plano__mesa--objetivo'));
          const debajo = document.elementFromPoint(e.clientX, e.clientY);
          const mesa = debajo && debajo.closest('.plano__mesa');
          if (mesa) mesa.classList.add('plano__mesa--objetivo');
        }
      };

      const soltarDedo = async e => {
        document.removeEventListener('pointermove', seguirDedo);
        document.removeEventListener('pointerup', soltarDedo);

        if (!ARRASTRE_PLANO) return;

        if (ARRASTRE_PLANO.fantasma) ARRASTRE_PLANO.fantasma.remove();
        buscarTodos('.plano__mesa', cuerpo).forEach(m =>
          m.classList.remove('plano__mesa--objetivo'));

        if (!ARRASTRE_PLANO.movido) {
          // No se movió: fue un toque normal, se abre el selector de
          // siempre en vez de intentar interpretar un arrastre.
          const idSuelto = ARRASTRE_PLANO.id;
          ARRASTRE_PLANO = null;
          elegirMesaPara(idSuelto, refrescar);
          return;
        }

        const debajo = document.elementFromPoint(e.clientX, e.clientY);
        const mesa = debajo && debajo.closest('[data-plano-mesa]');
        const idPersona = ARRASTRE_PLANO.id;
        ARRASTRE_PLANO = null;

        if (!mesa) return;

        try {
          const r = await mandar('mesas.php?accion=sentar', {
            confirmacion_id: idPersona,
            mesa_id: Number(mesa.dataset.planoMesa),
          });
          registrarEvento('accion', 'asignar_mesa', { desde: 'arrastre' });
          avisar(r.mensaje);
          if (r.se_excede) avisar(r.aviso, true);
          refrescar();
        } catch (error) {
          avisar(error.message, true);
        }
      };

      document.addEventListener('pointermove', seguirDedo);
      document.addEventListener('pointerup', soltarDedo);
    });
  });
}

/**
 * Corre el acomodo automático, mostrando antes qué va a pasar.
 *
 * SE MUESTRA UNA VISTA PREVIA A PROPÓSITO. Acomodar cien personas de un
 * botonazo, sin saber qué va a cambiar, da miedo — y con razón. Ver
 * "van a quedar 3 sin lugar" ANTES de aplicar convierte un salto al
 * vacío en una decisión.
 *
 * @param {Function} refrescar
 * @returns {Promise<void>}
 */
async function acomodarSolo(refrescar) {
  let previa;
  try {
    previa = await mandar('mesas.php?accion=vista_previa', {});
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  const sinLugar = previa.sin_lugar || [];
  const fijados = (MESAS.mesas || []).reduce((n, m) =>
    n + m.invitados.filter(i => i.fijada).length, 0);

  /* Lo que se va a MOVER, no solo lo que va a entrar.
   *
   * Antes esta pantalla decía cuántos se sentaban y cuántos quedaban
   * afuera, y con eso no alcanzaba para animarse: lo que uno teme al
   * tocar "acomodar solo" no es que falte lugar, es que se desarme el
   * trabajo que ya venía haciendo a mano. */
  const movimientos = previa.movimientos || [];
  const mudanzas = movimientos.filter(m => m.que_pasa === 'se_muda');
  const levantados = movimientos.filter(m => m.que_pasa === 'se_levanta');

  const comoSeLee = m =>
    m.que_pasa === 'se_muda'    ? seguro(m.nombre + ': ' + m.de + ' → ' + m.a)
  : m.que_pasa === 'se_levanta' ? seguro(m.nombre + ': sale de ' + m.de)
  :                               seguro(m.nombre + ' → ' + m.a);

  const bloqueDeCambios =
    (mudanzas.length || levantados.length)
      ? '<div class="tarjeta" style="margin-bottom:var(--esp-2)">' +
          '<div class="tarjeta__titulo">Lo que se mueve de lugar</div>' +
          mudanzas.concat(levantados).slice(0, 12).map(m =>
            '<p class="lista__pie" style="margin:2px 0">' + comoSeLee(m) + '</p>'
          ).join('') +
          (mudanzas.length + levantados.length > 12
            ? '<p class="vacio__texto">y ' +
              seguro(mudanzas.length + levantados.length - 12) + ' más</p>'
            : '') +
        '</div>'
      : '<p class="vacio__texto" style="color:var(--bien)">' +
        'No se mueve de mesa nadie que ya estuviera sentado.</p>';

  const cuerpo = abrirHoja('Acomodar a todos',
    '<p style="margin-bottom:var(--esp-2)">' +
      'Se van a sentar <strong>' + seguro(Object.keys(previa.plan || {}).length) +
      '</strong> confirmaciones.' +
    '</p>' +

    bloqueDeCambios +

    (fijados
      ? '<p class="vacio__texto">' +
        seguro(fijados === 1
          ? 'La que fijaste con el candado no se va a tocar.'
          : 'Las ' + fijados + ' que fijaste con el candado no se van a tocar.') +
        '</p>'
      : '') +

    (sinLugar.length
      ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
          'Van a quedar ' + seguro(sinLugar.length) + ' sin lugar:<br>' +
          sinLugar.map(s => seguro(s.nombre) + ' (' +
                       seguro(pluralizar(s.lugares, 'lugar', 'lugares')) + ')')
                  .join('<br>') +
        '</p>'
      : '<p class="vacio__texto" style="color:var(--bien);margin-top:var(--esp-2)">' +
        'Entran todos.</p>') +

    '<div class="acciones">' +
      '<button class="boton" id="acomodo-cancelar">Cancelar</button>' +
      '<button class="boton boton--principal" id="acomodo-aplicar">Acomodar</button>' +
    '</div>'
  );

  buscar('#acomodo-cancelar', cuerpo).addEventListener('click', () => cerrarHoja(true));

  buscar('#acomodo-aplicar', cuerpo).addEventListener('click', async () => {
    try {
      const r = await mandar('mesas.php?accion=autoasignar', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}


/**
 * Crea las 14 mesas del salón con su lugar en el plano.
 *
 * @param {Function} refrescar
 * @returns {Promise<void>}
 */
async function armarElSalon(refrescar) {
  const salon = CONFIGURACION.salon;

  /* La prioridad sale de la fila: la primera está pegada a la pista y
     es la mejor, la última es el fondo. Es lo que hace que el acomodo
     automático les dé las buenas mesas a los grupos de orden más bajo. */
  const mesas = salon.mesas.map(m => ({
    nombre:    m.nombre,
    fila:      m.fila,
    columna:   m.columna,
    prioridad: salon.prioridadPorFila[m.fila] || 50,
  }));

  if (!await confirmarAccion(
    'Se van a crear ' + mesas.length + ' mesas de ' + salon.capacidad +
    ' lugares, cada una en su sitio del plano.\n\n' +
    'Las que ya existan con ese nombre no se duplican: solo se les ' +
    'pone su lugar.\n\n¿Armar el salón?'
  )) return;

  try {
    const r = await mandar('mesas.php?accion=armar_salon',
                           { mesas: mesas, capacidad: salon.capacidad });
    avisar(r.mensaje);
    refrescar();
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Abre una mesa: quiénes se sientan, y qué se puede hacer con ella.
 *
 * @param {number} mesaId
 * @param {Function} refrescar
 * @returns {void}
 */
/**
 * Quién se sienta en esta mesa, persona por persona, con su plato y su
 * alergia.
 *
 * POR QUÉ EXISTE
 * El plano y la ficha de la mesa listan FAMILIAS ("Alan, Ania +3") y
 * cuántos lugares ocupan. Eso alcanza para acomodar, pero no para servir:
 * el día de la fiesta hace falta saber que en esta mesa hay dos
 * vegetarianos y alguien alérgico a los mariscos, y quiénes son. Ese
 * cruce no existía en ningún lado — había que entrar invitado por
 * invitado, con la fiesta encima.
 *
 * @param {number} mesaId
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function pintarQuienComeQue(mesaId, donde) {
  if (!donde) return;
  donde.innerHTML = '<div class="esqueleto"></div>';

  let gente;
  try {
    const r = await traer('mesas.php?accion=detalle_mesa&mesa_id=' + mesaId);
    gente = (r && r.gente) || [];
  } catch (error) {
    donde.innerHTML = '<p class="vacio__texto">No se pudo cargar qué come cada quien.</p>';
    return;
  }

  if (!gente.length) { donde.innerHTML = ''; return; }

  const conAlergia = gente.filter(p => p.alergias).length;
  const vegetarianos = gente.filter(p => /vegetarian/i.test(p.menu || '')).length;

  /* El resumen va ARRIBA de la lista: es lo que se necesita de un vistazo
     al pasar por la mesa con los platos. El detalle queda abajo, para
     cuando hay que saber de quién se trata. */
  const resumen = [];
  if (vegetarianos) resumen.push(pluralizar(vegetarianos, 'vegetariano', 'vegetarianos'));
  if (conAlergia)   resumen.push(pluralizar(conAlergia, 'alergia', 'alergias'));

  donde.innerHTML =
    '<span class="campo__rotulo">Qué come cada quien</span>' +
    (resumen.length
      ? '<p class="vacio__texto" style="margin:.2rem 0 .6rem">' +
          seguro(resumen.join(' · ')) + '</p>'
      : '') +
    gente.map(p =>
      '<div class="lista__fila" style="cursor:default">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' +
            seguro(p.nombre || (p.tipo === 'nino' ? 'Niño' : 'Adulto')) +
          '</span>' +
          '<span class="lista__pie">' +
            seguro([
              p.tipo === 'nino' ? 'Menú infantil' : (p.menu || 'Sin menú elegido'),
              p.familia || '',
            ].filter(Boolean).join(' · ')) +
          '</span>' +
        '</span>' +
        (p.alergias
          ? '<span class="etiqueta etiqueta--alerta lista__lado">⚠ ' +
              seguro(p.alergias) + '</span>'
          : '') +
      '</div>'
    ).join('');
}

function abrirLaMesa(mesaId, refrescar) {
  const mesa = (MESAS.mesas || []).find(m => Number(m.id) === mesaId);
  if (!mesa) return;

  const libres = mesa.capacidad - mesa.ocupados;

  const gente = mesa.invitados.length
    ? mesa.invitados.map(inv =>
        '<button class="lista__fila" data-mover-de-mesa="' + seguro(inv.id) + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' +
              (inv.fijada ? '<span style="color:var(--oro)">🔒</span> ' : '') +
              seguro(inv.nombre) +
            '</span>' +
            '<span class="lista__pie">' +
              seguro(pluralizar(inv.lugares, 'lugar', 'lugares') +
                     (inv.grupo ? ' · ' + inv.grupo : '')) +
            '</span>' +
          '</span>' +
        '</button>'
      ).join('')
    : '<p class="vacio__texto">Esta mesa está vacía.</p>';

  const cuerpo = abrirHoja(mesa.nombre,
    '<div class="detalle" style="margin-bottom:var(--esp-3)">' +
      '<span class="detalle__rotulo">Ocupación</span>' +
      '<span class="detalle__valor">' +
        seguro(mesa.ocupados + ' de ' + mesa.capacidad) +
        (mesa.ocupados > mesa.capacidad
          ? ' <span class="etiqueta etiqueta--alerta">Se pasa por ' +
            seguro(mesa.ocupados - mesa.capacidad) + '</span>'
          : libres === 0
            ? ' <span class="etiqueta etiqueta--bien">Completa</span>'
            : ' <span class="etiqueta etiqueta--tenue">' +
              seguro(pluralizar(libres, 'libre', 'libres')) + '</span>') +
      '</span>' +
      (mesa.ubicacion
        ? '<span class="detalle__rotulo">Dónde está</span>' +
          '<span class="detalle__valor">' + seguro(mesa.ubicacion) + '</span>'
        : '') +
    '</div>' +

    gente +

    /* Quién come qué en esta mesa. Se pide al servidor al abrir, porque el
       plano solo trae familias y cuántos lugares ocupan — no el detalle por
       persona. Ver 'detalle_mesa' en admin/api/mesas.php. */
    '<div id="mesa-quien-come" style="margin-top:var(--esp-3)"></div>' +

    // Etiquetas (Entrega 2): "Mesa ruidosa", "Jóvenes", "Familia
    // materna"… — el bot las cruza con las de cada persona para
    // preferir sentarla acá (ver mejorMesaPara() en _lib/mesas.php).
    '<div class="campo" id="mesa-etiquetas" style="margin-top:var(--esp-3)"></div>' +

    /* La hoja de la mesa para el mesero y la coordinadora: quién se
       sienta, qué come cada uno y las alergias. El cruce ya estaba
       hecho en esta misma pantalla y no tenía forma de salir del
       teléfono — había que dictarlo o mandar una foto. */
    '<button class="boton boton--ancho" id="mesa-compartir" ' +
            'style="margin-top:var(--esp-2)">Mandar esta mesa por WhatsApp</button>' +

    '<button class="boton boton--ancho" id="mesa-editar" ' +
            'style="margin-top:var(--esp-1)">Cambiar nombre o capacidad</button>'
  );

  pintarEtiquetasDe('mesa', mesaId, buscar('#mesa-etiquetas', cuerpo));
  pintarQuienComeQue(mesaId, buscar('#mesa-quien-come', cuerpo));

  buscarTodos('[data-mover-de-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () =>
      elegirMesaPara(Number(boton.dataset.moverDeMesa), refrescar));
  });

  buscar('#mesa-compartir', cuerpo).addEventListener('click', () => {
    // armarParaCompartir abre su propia hoja encima de esta.
    armarParaCompartir('mesa', null, mesaId);
  });

  buscar('#mesa-editar', cuerpo).addEventListener('click', () => {
    const cruda = mesaParaEditar(mesaId);
    if (cruda) formularioEvento('mesas', cruda);
    else avisar('Esa mesa ya no está. Actualiza la pantalla.', true);
  });
}

/**
 * La mesa con la que hay que abrir el formulario de edición.
 *
 * POR QUÉ EXISTE
 * Esto buscaba en `EVENTO.mesas`, que es la lista de la pestaña Evento
 * y en esta pantalla está vacía desde que Mesas se fusionó con Gente:
 * tocar una mesa recién creada no hacía absolutamente nada por un
 * camino, y por el otro mandaba a "abre la sección Mesas de Evento",
 * que ya no existe. Se busca en `MESAS`, que es lo que se está viendo,
 * y que además trae `fila` y `columna` — los dos campos que el
 * formulario necesita para poder ubicarla en el plano.
 *
 * @param {number|string} mesaId
 * @returns {Object|null}
 */
function mesaParaEditar(mesaId) {
  return (MESAS && MESAS.mesas || []).find(m =>
    String(m.id) === String(mesaId)) || null;
}


/* ─── 4. SENTAR A MANO ─────────────────────────────────────────────── */

/**
 * Abre la hoja para elegir mesa para alguien.
 *
 * @param {number} confirmacionId
 * @param {Function} refrescar
 * @returns {void}
 */
function elegirMesaPara(confirmacionId, refrescar) {
  // Buscar a la persona, esté sentada o no.
  let quien = (MESAS.sin_sentar || []).find(p => p.id === confirmacionId);
  let mesaActual = 0;

  if (!quien) {
    (MESAS.mesas || []).forEach(mesa => {
      const encontrado = mesa.invitados.find(i => i.id === confirmacionId);
      if (encontrado) { quien = encontrado; mesaActual = mesa.id; }
    });
  }
  if (!quien) return;

  /* Las mesas se ordenan poniendo primero las que tienen lugar, y entre
     esas, las que ya tienen gente de su mismo grupo. Es el orden en que
     una persona las miraría. */
  const opciones = (MESAS.mesas || []).map(mesa => {
    const libres = mesa.capacidad - mesa.ocupados +
                   (mesa.id === mesaActual ? quien.lugares : 0);

    const tieneSuGrupo = quien.grupo_id &&
      mesa.invitados.some(i => i.grupo_id === quien.grupo_id && i.id !== quien.id);

    return { mesa, libres, entra: libres >= quien.lugares, tieneSuGrupo };
  }).sort((a, b) => {
    if (a.entra !== b.entra) return a.entra ? -1 : 1;
    if (a.tieneSuGrupo !== b.tieneSuGrupo) return a.tieneSuGrupo ? -1 : 1;
    return a.libres - b.libres;
  });

  const cuerpo = abrirHoja(quien.nombre,
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Ocupa ' + seguro(pluralizar(quien.lugares, 'lugar', 'lugares')) +
      (quien.grupo ? ' · ' + seguro(quien.grupo) : '') +
    '</p>' +

    opciones.map(o =>
      '<button class="lista__fila" data-mesa="' + seguro(o.mesa.id) + '"' +
        (o.mesa.id === mesaActual ? ' style="border-color:var(--oro)"' : '') + '>' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(o.mesa.nombre) +
            (o.mesa.id === mesaActual ? ' (actual)' : '') + '</span>' +
          '<span class="lista__pie">' +
            seguro(o.mesa.ocupados + ' de ' + o.mesa.capacidad) +
            (o.tieneSuGrupo ? ' · están los de su grupo' : '') +
          '</span>' +
        '</span>' +
        '<span class="lista__lado">' +
          (o.entra
            ? '<span class="etiqueta etiqueta--bien">Entra</span>'
            : '<span class="etiqueta etiqueta--alerta">No entra</span>') +
        '</span>' +
      '</button>'
    ).join('') +

    '<div class="acciones">' +
      (mesaActual
        ? '<button class="boton" id="mesa-fijar">' +
          (quien.fijada ? 'Dejar que se mueva' : 'Fijar aquí') + '</button>' +
          '<button class="boton boton--peligro" id="mesa-quitar">Sacar de la mesa</button>'
        : '') +
    '</div>' +

    '<button class="boton boton--ancho" id="mesa-preferencias" ' +
            'style="margin-top:var(--esp-2)">Grupo, sillas extra y reglas</button>'
  );

  buscarTodos('[data-mesa]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=sentar', {
          confirmacion_id: confirmacionId,
          mesa_id: Number(boton.dataset.mesa),
        });
        registrarEvento('accion', 'asignar_mesa', { desde: 'selector' });
        cerrarHoja(true);
        avisar(r.mensaje);
        if (r.se_excede) avisar(r.aviso, true);
        refrescar();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  const fijar = buscar('#mesa-fijar', cuerpo);
  if (fijar) {
    fijar.addEventListener('click', async () => {
      try {
        const r = await mandar('mesas.php?accion=fijar',
                               { confirmacion_id: confirmacionId });
        cerrarHoja(true);
        avisar(r.mensaje);
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const quitar = buscar('#mesa-quitar', cuerpo);
  if (quitar) {
    quitar.addEventListener('click', async () => {
      /* Se pregunta, y quitar una regla de "no sentar juntos" también:
         antes esto no preguntaba nada y quitar la regla sí, o sea que
         la app protegía lo leve y no lo grave. Sacar a alguien de su
         mesa deshace un acomodo hecho a mano y no tiene deshacer
         propio. */
      const nombreMesa = (MESAS.mesas || []).find(m => m.id === mesaActual);
      if (!await confirmarAccion(
        '¿Sacar a ' + quien.nombre + ' de la mesa?\n\n' +
        'Vuelve a «sin mesa»' +
        (nombreMesa ? ' y deja ' + pluralizar(quien.lugares, 'lugar libre', 'lugares libres') +
                      ' en ' + nombreMesa.nombre : '') + '.',
        { confirmar: 'Sacar de la mesa', peligro: true })) return;

      try {
        await mandar('mesas.php?accion=sentar',
                     { confirmacion_id: confirmacionId, mesa_id: 0 });
        cerrarHoja(true);
        avisar('Se quitó de la mesa.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  buscar('#mesa-preferencias', cuerpo).addEventListener('click', () => {
    abrirPreferenciasDe(quien, refrescar);
  });
}


/* ─── 5. GRUPOS, PELEAS Y PREFERENCIAS ─────────────────────────────── */

/**
 * Las preferencias de una persona: grupo, sillas extra y con quién no.
 *
 * @param {Object} quien
 * @param {Function} refrescar
 * @returns {void}
 */
function abrirPreferenciasDe(quien, refrescar) {
  const todos = (MESAS.sin_sentar || []).concat(
    ...(MESAS.mesas || []).map(m => m.invitados)
  ).filter(p => p.id !== quien.id);

  const misPeleas = (MESAS.peleas || []).filter(p =>
    Number(p.invitado_a) === quien.id || Number(p.invitado_b) === quien.id);

  const nombreDe = id => {
    const p = (MESAS.sin_sentar || []).concat(
      ...(MESAS.mesas || []).map(m => m.invitados)
    ).find(x => x.id === Number(id));
    return p ? p.nombre : 'alguien';
  };

  const cuerpo = abrirHoja(quien.nombre,
    campoLista({
      id: 'pref-grupo', rotulo: 'Grupo',
      valor: quien.grupo_id ? String(quien.grupo_id) : '',
      opciones: [{ valor: '', texto: 'Sin grupo' }].concat(
        (MESAS.grupos || []).map(g => ({ valor: String(g.id), texto: g.nombre }))),
    }) +

    campoTexto({ id: 'pref-extra', rotulo: 'Sillas de más',
                 tipo: 'number', valor: quien.extra || 0,
                 ayuda: 'Para la silla alta de un bebé, un andador, o alguien ' +
                        'que viene sin confirmar.' }) +

    campoLista({
      id: 'pref-mesa-preferida', rotulo: 'Mesa preferida',
      valor: quien.mesa_preferida ? String(quien.mesa_preferida) : '',
      opciones: [{ valor: '', texto: 'Sin preferencia' }].concat(
        (MESAS.mesas || []).map(m => ({ valor: String(m.id), texto: m.nombre }))),
    }) +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      'No sentarlo con' +
    '</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-1)">' +
      'El acomodo automático nunca los va a sentar en la misma mesa.' +
    '</p>' +

    (misPeleas.length
      ? misPeleas.map(p => {
          const otro = Number(p.invitado_a) === quien.id ? p.invitado_b : p.invitado_a;
          return '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(nombreDe(otro)) + '</span>' +
              (p.motivo
                ? '<span class="lista__pie">' + seguro(p.motivo) + '</span>' : '') +
            '</span>' +
            '<button class="boton-icono" data-quitar-pelea="' + seguro(p.id) + '" ' +
                    'aria-label="Quitar regla">' +
              '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" ' +
                      'stroke-width="1.5" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>';
        }).join('')
      : '<p class="vacio__texto" style="font-style:italic">Por ahora, ninguna regla puesta.</p>') +

    (todos.length
      ? campoLista({
          id: 'pref-pelea', rotulo: 'Agregar a alguien más',
          valor: '',
          opciones: [{ valor: '', texto: 'Elegir…' }].concat(
            todos.map(p => ({ valor: String(p.id), texto: p.nombre }))),
        }) +
        campoTexto({ id: 'pref-pelea-motivo', rotulo: 'Motivo (opcional)',
                     pista: 'Ej. "no se hablan", "pelea de terrenos"…' })
      : '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'Todavía no hay nadie más confirmado para elegir — cuando confirme otra ' +
          'persona, va a aparecer acá.' +
        '</p>') +

    '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
      'Toca Guardar para que la regla quede puesta.' +
    '</p>' +

    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    try {
      await mandar('mesas.php?accion=preferencia', {
        confirmacion_id: quien.id,
        grupo_id: valorDe('pref-grupo', cuerpo),
        sillas_extra: valorDe('pref-extra', cuerpo),
        mesa_preferida: valorDe('pref-mesa-preferida', cuerpo),
      });

      const conQuien = valorDe('pref-pelea', cuerpo);
      if (conQuien) {
        await mandar('mesas.php?accion=pelea', {
          invitado_a: quien.id,
          invitado_b: Number(conQuien),
          motivo: valorDe('pref-pelea-motivo', cuerpo),
        });
      }

      cerrarHoja(true);
      avisar('Guardado.');
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  buscarTodos('[data-quitar-pelea]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      /* Borrar una regla de "no sentar juntos" pedía confirmación en
         ningún lado, a diferencia de borrar un grupo diez líneas más
         abajo. Y es peor equivocarse acá: el motivo por el que dos
         personas no se pueden sentar juntas rara vez se vuelve a
         escribir, y el error recién se descubre en la fiesta. */
      if (!await confirmarAccion('¿Quitar esta regla?\n\n' +
                           'Estas dos personas van a poder quedar en la ' +
                           'misma mesa.')) return;
      try {
        await mandar('mesas.php?accion=borrar_pelea', { id: boton.dataset.quitarPelea });
        cerrarHoja(true);
        avisar('Regla eliminada.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  });
}

/**
 * Todas las "unidades" que se pueden sentar (familias enteras y
 * personas que ya se sacaron de la suya), en un solo arreglo — mismo
 * criterio que arma MESAS del lado del servidor. Se usa acá para
 * buscar a cualquiera por nombre sin tener que abrirlo primero.
 *
 * @returns {Array}
 */
function todasLasUnidadesDeMesas() {
  return (MESAS.sin_sentar || []).concat(...(MESAS.mesas || []).map(m => m.invitados));
}

/**
 * El nombre de una unidad puntual, buscándola por tipo + id.
 *
 * @param {string} tipo 'confirmacion' | 'acompanante'
 * @param {number} id
 * @returns {string}
 */
function nombreDeUnidadDeMesas(tipo, id) {
  const u = todasLasUnidadesDeMesas().find(x => x.tipo === tipo && x.id === Number(id));
  return u ? u.nombre : 'alguien';
}

/**
 * Los dos nombres de una fila de `peleas` — familia con familia, o
 * persona puntual con persona puntual (Fase 9). Mismo criterio que
 * indiceDePeleas() en _lib/mesas.php.
 *
 * @param {Object} pelea
 * @returns {[string, string]}
 */
function nombresDePelea(pelea) {
  const acompA = Number(pelea.acompanante_a) || 0;
  const acompB = Number(pelea.acompanante_b) || 0;

  if (acompA > 0 && acompB > 0) {
    return [nombreDeUnidadDeMesas('acompanante', acompA), nombreDeUnidadDeMesas('acompanante', acompB)];
  }
  return [nombreDeUnidadDeMesas('confirmacion', pelea.invitado_a),
          nombreDeUnidadDeMesas('confirmacion', pelea.invitado_b)];
}

/**
 * Todo lo que le enseña al acomodo automático cómo sentar a la gente,
 * en un solo lugar con nombres en criollo — antes repartido entre un
 * botón genérico ("Opciones") y un botón de texto escondido al pie de
 * la ficha de cada persona.
 *
 * Las acciones destructivas (deshacer, vaciar) quedan abajo de todo,
 * separadas con una línea, como "Zona de riesgo": no son reglas, son
 * emergencias, y mezclarlas con la configuración era parte de por qué
 * esto no se encontraba fácil.
 *
 * @param {Function} refrescar
 * @returns {void}
 */
function abrirReglasDeAcomodo(refrescar) {
  const svgX =
    '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" ' +
            'stroke-width="1.5" stroke-linecap="round"/></svg>';

  const unidades = todasLasUnidadesDeMesas();
  const familias = unidades.filter(u => u.tipo === 'confirmacion');
  const opcionesDePersonas = unidades.map(u =>
    ({ valor: (u.tipo === 'acompanante' ? 'a' : 'c') + u.id, texto: u.nombre }));

  const cuerpo = abrirHoja('Reglas de acomodo',

    /* ── 1. Quién va junto ─────────────────────────────────────────── */
    '<div class="tarjeta__titulo">Quién va junto</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'La gente del mismo grupo se sienta junta. Los de orden más bajo ' +
      'eligen mesa primero.' +
    '</p>' +

    ((MESAS.grupos || []).length
      ? (MESAS.grupos || []).map(g =>
          '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(g.nombre) + '</span>' +
              '<span class="lista__pie">Orden ' + seguro(g.orden) + '</span>' +
            '</span>' +
            '<button class="boton-icono" data-borrar-grupo="' + seguro(g.id) + '" ' +
                    'aria-label="Borrar grupo">' + svgX + '</button>' +
          '</div>'
        ).join('')
      : '<p class="vacio__texto">Todavía no hay grupos.</p>') +

    '<div class="campo-par" style="margin-top:var(--esp-2)">' +
      campoTexto({ id: 'gr-nombre', rotulo: 'Grupo nuevo',
                   pista: 'Familia Zelaya' }) +
      campoTexto({ id: 'gr-orden', rotulo: 'Orden', tipo: 'number', valor: 50 }) +
    '</div>' +
    '<button class="boton boton--ancho" id="gr-crear">Crear el grupo</button>' +
    '<p class="vacio__texto" style="margin-top:4px">' +
      'Para poner a alguien DENTRO de un grupo: tocalo en "Sin mesa" o en el ' +
      'plano → "Grupo, sillas extra y reglas".' +
    '</p>' +

    /* ── 2. Quién no va junto ──────────────────────────────────────── */
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">Quién no va junto</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'El acomodo automático nunca los sienta en la misma mesa.' +
    '</p>' +

    ((MESAS.peleas || []).length
      ? (MESAS.peleas || []).map(p => {
          const [nombreA, nombreB] = nombresDePelea(p);
          return '<div class="lista__fila">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(nombreA + ' — ' + nombreB) + '</span>' +
              (p.motivo ? '<span class="lista__pie">' + seguro(p.motivo) + '</span>' : '') +
            '</span>' +
            '<button class="boton-icono" data-quitar-pelea-hub="' + seguro(p.id) + '" ' +
                    'aria-label="Quitar regla">' + svgX + '</button>' +
          '</div>';
        }).join('')
      : '<p class="vacio__texto" style="font-style:italic">Por ahora, ninguna regla puesta.</p>') +

    (opcionesDePersonas.length >= 2
      ? '<div class="campo-par" style="margin-top:var(--esp-2)">' +
          campoLista({ id: 'pel-a', rotulo: 'Esta persona',
            opciones: [{ valor: '', texto: 'Elegir…' }].concat(opcionesDePersonas) }) +
          campoLista({ id: 'pel-b', rotulo: 'No se sienta con',
            opciones: [{ valor: '', texto: 'Elegir…' }].concat(opcionesDePersonas) }) +
        '</div>' +
        campoTexto({ id: 'pel-motivo', rotulo: 'Motivo (opcional)',
                     pista: 'Ej. "no se hablan", "pelea de terrenos"…' }) +
        '<button class="boton boton--ancho" id="pel-crear">Agregar la regla</button>'
      : '<p class="vacio__texto">Hace falta que confirmen al menos dos para poder elegir.</p>') +

    /* ── 3. Se sienta aparte de su familia ─────────────────────────── */
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      'Se sienta aparte de su familia' +
    '</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Para cuando una persona de una familia necesita su propio grupo o ' +
      'mesa, sin que el resto se mueva con ella.' +
    '</p>' +
    (familias.length
      ? campoLista({ id: 'rp-familia', rotulo: 'De qué familia',
          opciones: [{ valor: '', texto: 'Elegir…' }].concat(
            familias.map(f => ({ valor: String(f.id), texto: f.nombre }))) }) +
        '<button class="boton boton--ancho" id="rp-elegir-familia">Elegir a la persona</button>'
      : '<p class="vacio__texto">Todavía no hay confirmaciones para elegir.</p>') +

    /* ── 4. Al confirmar alguien nuevo ─────────────────────────────── */
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      'Al confirmar alguien nuevo' +
    '</div>' +
    campoCasilla({ id: 'auto-confirmar',
                   rotulo: 'Sentarlo solo apenas confirma',
                   marcado: !!MESAS.auto_al_confirmar }) +
    '<p class="vacio__texto">Busca la mejor mesa respetando su grupo y las ' +
      'reglas. Si no hay lugar, queda sin mesa y te avisa aquí.</p>' +

    /* ── Zona de riesgo ─────────────────────────────────────────────
     * Deshacer y vaciar no son reglas: son emergencias. Separadas con
     * una línea a propósito, para que no compitan visualmente con la
     * configuración de arriba. */
    '<div style="border-top:1px solid var(--borde);margin:var(--esp-4) 0 var(--esp-3)"></div>' +
    '<div class="tarjeta__titulo" style="color:var(--alerta)">Zona de riesgo</div>' +

    '<button class="boton boton--ancho" id="mesa-deshacer" ' +
            'style="margin-top:var(--esp-2);margin-bottom:var(--esp-1)">' +
      'Volver al acomodo anterior' +
    '</button>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'Antes de cada acomodo automático, y antes de borrar una mesa, se ' +
      'guarda cómo estaba. Esto devuelve todo a la última foto.</p>' +

    '<button class="boton boton--ancho boton--peligro" id="mesa-vaciar" ' +
            'style="margin-bottom:var(--esp-1)">' +
      'Vaciar las mesas (respeta lo fijado)' +
    '</button>' +
    '<button class="boton boton--ancho boton--peligro" id="mesa-vaciar-todo">' +
      'Vaciar TODO, incluso lo fijado' +
    '</button>'
  );

  buscar('#gr-crear', cuerpo).addEventListener('click', async () => {
    const nombre = valorDe('gr-nombre', cuerpo);
    if (!nombre) { avisar('Pon el nombre del grupo.', true); return; }

    try {
      await mandar('mesas.php?accion=guardar_grupo', {
        nombre: nombre,
        orden: valorDe('gr-orden', cuerpo),
      });
      cerrarHoja(true);
      avisar('Grupo creado.');
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscarTodos('[data-borrar-grupo]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar este grupo? Sus invitados quedan sin grupo.')) return;
      try {
        await mandar('mesas.php?accion=borrar_grupo', { id: boton.dataset.borrarGrupo });
        cerrarHoja(true);
        avisar('Grupo eliminado.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  });

  const crearPelea = buscar('#pel-crear', cuerpo);
  if (crearPelea) {
    crearPelea.addEventListener('click', async () => {
      const a = valorDe('pel-a', cuerpo);
      const b = valorDe('pel-b', cuerpo);
      if (!a || !b) { avisar('Elige a las dos personas.', true); return; }
      if (a === b) { avisar('Elige a dos personas distintas.', true); return; }

      const cuerpoPelea = { motivo: valorDe('pel-motivo', cuerpo) };
      if (a[0] === 'a' && b[0] === 'a') {
        cuerpoPelea.acompanante_a = Number(a.slice(1));
        cuerpoPelea.acompanante_b = Number(b.slice(1));
      } else if (a[0] === 'c' && b[0] === 'c') {
        cuerpoPelea.invitado_a = Number(a.slice(1));
        cuerpoPelea.invitado_b = Number(b.slice(1));
      } else {
        avisar('Por ahora, la regla tiene que ser entre dos familias, o entre ' +
               'dos personas que ya se sientan aparte de la suya — no se puede ' +
               'mezclar una cosa con la otra.', true);
        return;
      }

      try {
        await mandar('mesas.php?accion=pelea', cuerpoPelea);
        cerrarHoja(true);
        avisar('Regla agregada.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  buscarTodos('[data-quitar-pelea-hub]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Quitar esta regla?\n\n' +
                           'Estas dos personas van a poder quedar en la misma mesa.')) return;
      try {
        await mandar('mesas.php?accion=borrar_pelea', { id: boton.dataset.quitarPeleaHub });
        cerrarHoja(true);
        avisar('Regla eliminada.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  });

  const elegirFamilia = buscar('#rp-elegir-familia', cuerpo);
  if (elegirFamilia) {
    elegirFamilia.addEventListener('click', () => {
      const id = Number(valorDe('rp-familia', cuerpo));
      if (!id) { avisar('Elige una familia.', true); return; }
      abrirReglaDePersona(id, refrescar);
    });
  }

  buscar('#auto-confirmar', cuerpo).addEventListener('change', async evento => {
    try {
      const r = await mandar('mesas.php?accion=auto_al_confirmar',
                             { prender: evento.target.checked });
      avisar(r.mensaje);
    } catch (error) {
      evento.target.checked = !evento.target.checked;
      avisar(error.message, true);
    }
  });

  buscar('#mesa-deshacer', cuerpo).addEventListener('click', async () => {
    /* Esto no preguntaba nada, y es de lo más destructivo que hay acá:
       vuelve a la última foto y con eso pisa TODO lo que se acomodó a
       mano después de ella. La pregunta dice de cuándo es la foto —el
       dato con el que se decide— en vez de un "¿estás seguro?". */
    const foto = MESAS.ultimo_respaldo;
    if (!await confirmarAccion(
      '¿Volver al acomodo anterior?\n\n' +
      (foto
        ? 'Se vuelve a como estaba el ' + comoFecha(String(foto.cuando).slice(0, 10)) +
          (foto.motivo ? ' (' + foto.motivo + ')' : '') + '. '
        : '') +
      'Todo lo que hayas acomodado a mano después de esa foto se pierde.',
      { confirmar: 'Volver atrás', peligro: true })) return;

    try {
      const r = await mandar('mesas.php?accion=deshacer', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscar('#mesa-vaciar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Sacar a todos de las mesas?\n\n' +
                         'Lo que fijaste con el candado queda como está.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', {});
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  buscar('#mesa-vaciar-todo', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Vaciar TODO, incluso lo que fijaste a mano?\n\n' +
                         'Esto no se puede deshacer.')) return;
    try {
      const r = await mandar('mesas.php?accion=vaciar', { todo: true });
      cerrarHoja(true);
      avisar(r.mensaje);
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });
}

/**
 * A quién, de una familia puntual, se puede sacar para que se siente
 * aparte — Fase 9 del motor (mesas.php?accion=regla_persona), que hasta
 * esta ronda no tenía ningún botón en toda la aplicación.
 *
 * @param {number} confirmacionId
 * @param {Function} refrescar
 * @returns {Promise<void>}
 */
async function abrirReglaDePersona(confirmacionId, refrescar) {
  const cuerpo = abrirHoja('Se sienta aparte', '<p class="vacio__texto">Cargando…</p>');

  let personas;
  try {
    personas = await traer('mesas.php?accion=personas_de&confirmacion_id=' + confirmacionId);
  } catch (error) {
    cuerpo.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  if (!personas.length) {
    cuerpo.innerHTML = '<p class="vacio__texto">' +
      'Esta familia todavía no tiene a sus integrantes nombrados uno por ' +
      'uno — se cargan desde su ficha, en Invitados.</p>';
    return;
  }

  cuerpo.innerHTML =
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Elige a quién sienta aparte de su familia.' +
    '</p>' +
    personas.map(p =>
      '<button class="lista__fila" data-persona="' + seguro(p.id) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
          (p.tiene_regla
            ? '<span class="lista__pie">Ya se sienta aparte' +
              (p.grupo_nombre ? ' · ' + seguro(p.grupo_nombre) : '') + '</span>'
            : '') +
        '</span>' +
      '</button>'
    ).join('');

  buscarTodos('[data-persona]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const persona = personas.find(p => p.id === Number(boton.dataset.persona));
      if (persona) pintarFormularioDeReglaDePersona(cuerpo, persona, refrescar);
    });
  });
}

/**
 * El formulario para una persona puntual: su propio grupo, mesa
 * preferida y una nota — o devolverla a su familia si ya tenía regla.
 *
 * @param {Element} cuerpo - El de abrirReglaDePersona().
 * @param {Object} persona - Fila de mesas.php?accion=personas_de.
 * @param {Function} refrescar
 * @returns {void}
 */
function pintarFormularioDeReglaDePersona(cuerpo, persona, refrescar) {
  cuerpo.innerHTML =
    '<div class="tarjeta__titulo">' + seguro(persona.nombre) + '</div>' +

    campoLista({
      id: 'rp-grupo', rotulo: 'Grupo',
      valor: persona.grupo_id ? String(persona.grupo_id) : '',
      opciones: [{ valor: '', texto: 'Sin grupo' }].concat(
        (MESAS.grupos || []).map(g => ({ valor: String(g.id), texto: g.nombre }))),
    }) +

    campoLista({
      id: 'rp-mesa', rotulo: 'Mesa preferida',
      valor: persona.mesa_preferida ? String(persona.mesa_preferida) : '',
      opciones: [{ valor: '', texto: 'Sin preferencia' }].concat(
        (MESAS.mesas || []).map(m => ({ valor: String(m.id), texto: m.nombre }))),
    }) +

    campoTexto({ id: 'rp-notas', rotulo: 'Nota (opcional)', valor: persona.notas || '' }) +

    '<p class="vacio__texto" style="margin:var(--esp-2) 0">' +
      'El acomodo automático la va a tratar como su propia unidad — no ' +
      'como parte del bloque familiar.' +
    '</p>' +

    pieDeFormulario('Guardar') +

    (persona.tiene_regla
      ? '<button class="boton boton--ancho" id="rp-devolver" style="margin-top:var(--esp-1)">' +
          'Devolver a su familia' +
        '</button>'
      : '');

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    try {
      await mandar('mesas.php?accion=regla_persona', {
        acompanante_id: persona.id,
        grupo_id: valorDe('rp-grupo', cuerpo),
        mesa_preferida: valorDe('rp-mesa', cuerpo),
        notas: valorDe('rp-notas', cuerpo),
      });
      cerrarHoja(true);
      avisar(persona.nombre + ' ahora se sienta aparte de su familia.');
      refrescar();
    } catch (error) { avisar(error.message, true); }
  });

  const devolver = buscar('#rp-devolver', cuerpo);
  if (devolver) {
    devolver.addEventListener('click', async () => {
      if (!await confirmarAccion(persona.nombre + ' vuelve a viajar con su familia. ¿Seguro?')) return;
      try {
        await mandar('mesas.php?accion=regla_persona', {
          acompanante_id: persona.id, grupo_id: 0, mesa_preferida: 0, notas: '',
        });
        cerrarHoja(true);
        avisar('Listo.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }
}
