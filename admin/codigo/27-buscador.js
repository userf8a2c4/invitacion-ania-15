/* ══════════════════════════════════════════════════════════════════════
   27 · BUSCADOR GLOBAL

   QUÉ HACE ESTE ARCHIVO
   Busca una palabra en TODO el panel a la vez —invitados, contactos,
   gastos, pagos, padrinos, proveedores, cotizaciones, notas, tareas,
   agenda y las listas de Evento— y lleva de un toque al registro.

   POR QUÉ HACÍA FALTA
   Antes había cinco buscadores, cada uno encerrado en su pantalla. El de
   Presupuesto llegaba a decir "mira en otra sección" cuando no
   encontraba algo: sabía que lo que buscabas podía existir en otro lado
   y aun así te mandaba a buscarlo a mano.

   Con muchos datos, el problema deja de ser "¿está cargado?" y pasa a
   ser "¿dónde lo cargué?". Esa segunda pregunta no debería existir.

   POR QUÉ BUSCA EN EL TELÉFONO Y NO EN EL SERVIDOR
   Porque todo lo que hay que mirar ya está en memoria o en la copia
   local. Buscar acá es instantáneo, no gasta datos, y —lo que más
   importa— SIGUE FUNCIONANDO SIN SEÑAL, que es justo cuando uno está
   parado en el salón tratando de encontrar algo.

   ÍNDICE
     1. Qué se busca en cada cosa
     2. Traer lo que falte
     3. Buscar
     4. La pantalla
   ══════════════════════════════════════════════════════════════════════ */


/** Cuántos resultados se muestran por grupo. Más que esto no se lee. */
const TOPE_POR_GRUPO = 5;

/** Desde cuántas letras se empieza a buscar. */
const MINIMO_PARA_BUSCAR = 2;


/* ─── 1. QUÉ SE BUSCA EN CADA COSA ─────────────────────────────────── */

/*
   Cada renglón describe un tipo de dato:
     grupo   → el título bajo el que se agrupan sus resultados.
     datos   → función que devuelve la lista (o [] si no se cargó).
     campos  → en qué propiedades buscar.
     titulo  → cómo se ve el resultado.
     pie     → el renglón chico de abajo.
     ir      → qué hacer al tocarlo.

   Está escrito como tabla y no como una cadena de "if" para que sumar
   algo nuevo al buscador sea agregar un renglón acá.
*/
const DONDE_BUSCAR = [
  {
    grupo: 'Invitados',
    datos: () => INVITADOS,
    campos: ['nombre', 'correo', 'codigo', 'alergias', 'notas'],
    titulo: r => r.nombre,
    pie: r => [r.correo, r.codigo].filter(Boolean).join(' · '),
    ir: r => { SECCION_GENTE = 'invitados'; irA('invitados', true);
               setTimeout(() => abrirDetalleDeInvitado(r.id), 400); },
  },
  {
    grupo: 'Contactos',
    datos: () => CONTACTOS,
    campos: ['nombre', 'telefono', 'correo', 'detalle'],
    titulo: r => r.nombre,
    pie: r => r.detalle || '',
    ir: () => { SECCION_GENTE = 'contactos'; irA('invitados', true); },
  },
  {
    grupo: 'Gastos',
    datos: () => (DINERO ? DINERO.gastos : []),
    campos: ['concepto', 'notas'],
    titulo: r => r.concepto,
    pie: r => comoDinero(r.monto_real || r.presupuestado),
    ir: () => { SECCION_DINERO = 'gastos'; irA('dinero', true); },
  },
  {
    grupo: 'Pagos',
    datos: () => (DINERO ? DINERO.pagos : []),
    campos: ['concepto', 'notas', 'metodo'],
    titulo: r => r.concepto,
    pie: r => comoDinero(r.monto),
    ir: () => { SECCION_DINERO = 'pagos'; irA('dinero', true); },
  },
  {
    grupo: 'Padrinos',
    datos: () => (DINERO ? DINERO.padrinos : []),
    campos: ['nombre', 'apadrina', 'telefono', 'correo', 'notas'],
    titulo: r => r.nombre,
    pie: r => r.apadrina || '',
    ir: () => { SECCION_DINERO = 'padrinos'; irA('dinero', true); },
  },
  {
    grupo: 'Proveedores',
    datos: () => (DINERO ? DINERO.proveedores : []),
    campos: ['nombre', 'servicio', 'contacto', 'telefono', 'correo', 'notas'],
    titulo: r => r.nombre,
    pie: r => r.servicio || '',
    ir: () => { SECCION_DINERO = 'proveedores'; irA('dinero', true); },
  },
  {
    grupo: 'Cotizaciones',
    datos: () => (DINERO ? DINERO.cotizaciones : []),
    campos: ['proveedor', 'servicio', 'que_incluye', 'notas'],
    titulo: r => r.proveedor,
    pie: r => r.servicio || '',
    ir: () => { SECCION_DINERO = 'cotizaciones'; irA('dinero', true); },
  },
  {
    grupo: 'Notas',
    datos: () => PLAN.notas,
    campos: ['titulo', 'cuerpo', 'etiqueta'],
    titulo: r => r.titulo || 'Nota',
    pie: r => acortar(r.cuerpo || '', 60),
    // abrirHojaDeNota() no recibe cuál: abre la lista, que ya trae su
    // propio buscador. Llegar ahí es suficiente.
    ir: () => abrirHojaDeNota(),
  },
  {
    grupo: 'Tareas',
    datos: () => PLAN.tareas,
    campos: ['titulo', 'responsable'],
    titulo: r => r.titulo,
    pie: r => r.responsable || '',
    ir: () => irASeccionDeEvento('tareas'),
  },
  {
    grupo: 'Agenda',
    datos: () => PLAN.agenda,
    campos: ['titulo', 'lugar', 'notas'],
    titulo: r => r.titulo,
    pie: r => [comoFecha(r.fecha), r.lugar].filter(Boolean).join(' · '),
    ir: () => irASeccionDeEvento('agenda'),
  },
];

/*
   Las listas de Evento se agregan solas a partir de SECCIONES, que ya
   describe cada una. Escribirlas a mano sería repetir información que
   ya existe, y sumar una sección nueva obligaría a acordarse de tocar
   también este archivo.
*/
const EVENTO_EN_GENTE = { mesas: 1, regalos: 1, foraneos: 1 };

/**
 * Arma los renglones del buscador para las listas de Evento.
 *
 * @returns {Array}
 */
function dondeBuscarEnEvento() {
  return Object.keys(SECCIONES).map(clave => {
    const config = SECCIONES[clave];

    /* En qué campos buscar: los de texto del formulario. Los números y
       las fechas se saltean porque nadie busca "0" ni "2026-10-24". */
    const campos = config.campos
      .filter(c => !c.lista && c.tipo !== 'date' && c.tipo !== 'time' &&
                   c.tipo !== 'number')
      .map(c => c.id);

    return {
      grupo: config.rotulo,
      datos: () => (EVENTO ? (EVENTO[clave] || []) : []),
      campos: campos,
      titulo: r => config.fila(r).titulo,
      pie: r => config.fila(r).pie,
      /* Estas tres se mudaron a Gente; el resto sigue en Evento. */
      ir: EVENTO_EN_GENTE[clave]
        ? () => { SECCION_GENTE = clave; irA('invitados', true); }
        : () => irASeccionDeEvento(clave),
    };
  });
}


/* ─── 2. TRAER LO QUE FALTE ────────────────────────────────────────── */

/**
 * Se asegura de que estén cargadas las cuatro fuentes de datos.
 *
 * Solo pide lo que falta. Y si alguna falla —sin señal, por ejemplo— se
 * sigue igual con las que sí están: un buscador que encuentra la mitad
 * sirve muchísimo más que uno que no abre.
 *
 * @returns {Promise<void>}
 */
async function asegurarDatosParaBuscar() {
  const intentos = [];

  if (!INVITADOS.length)          intentos.push(traerInvitadosParaBuscar());
  if (!CONTACTOS.length)          intentos.push(traerContactosParaBuscar());
  if (!DINERO)                    intentos.push(traer('presupuesto.php?accion=todo')
                                    .then(d => { DINERO = d; }));
  if (!PLAN.tareas.length)        intentos.push(traerPlanificador());
  if (!EVENTO)                    intentos.push(asegurarEvento());

  // allSettled y no all: que una falle no puede tumbar a las demás.
  await Promise.allSettled(intentos);
}

/**
 * Trae las confirmaciones sin dibujar la vista de invitados.
 *
 * @returns {Promise<void>}
 */
async function traerInvitadosParaBuscar() {
  const datos = await traer('confirmaciones.php?accion=listar');
  INVITADOS = datos.filas || [];
  INVITADOS_EDITABLES = !!datos.editable;
}

/**
 * Trae la agenda de contactos sin dibujar su vista.
 *
 * @returns {Promise<void>}
 */
async function traerContactosParaBuscar() {
  const datos = await traer('contactos.php?accion=todos');
  CONTACTOS = datos.contactos || [];
  CONTACTOS_VE_PLATA = !!datos.ve_plata;
}


/* ─── 3. BUSCAR ────────────────────────────────────────────────────── */

/**
 * Busca en todo y devuelve los resultados agrupados.
 *
 * @param {string} loEscrito
 * @returns {Array<{grupo: string, cuantos: number, filas: Array}>}
 */
function buscarEnTodo(loEscrito) {
  const aguja = paraBuscar(loEscrito).trim();
  if (aguja.length < MINIMO_PARA_BUSCAR) return [];

  return DONDE_BUSCAR.concat(dondeBuscarEnEvento())
    .map(fuente => {
      const encontrados = (fuente.datos() || []).filter(registro =>
        fuente.campos.some(campo =>
          paraBuscar(registro[campo]).includes(aguja)));

      return {
        grupo: fuente.grupo,
        cuantos: encontrados.length,
        /* Se guarda la fuente en cada fila para saber, al tocarla, a
           dónde hay que ir. */
        filas: encontrados.slice(0, TOPE_POR_GRUPO)
                          .map(r => ({ registro: r, fuente: fuente })),
      };
    })
    .filter(g => g.cuantos > 0);
}


/* ─── 4. LA PANTALLA ───────────────────────────────────────────────── */

/** Los resultados de la última búsqueda, para poder abrirlos. */
let RESULTADOS_BUSQUEDA = [];

/** El temporizador que evita anotar cada letra de una búsqueda vacía. */
let BUSQUEDA_VACIA_TIMER = null;

/**
 * Abre el buscador global.
 *
 * @returns {Promise<void>}
 */
async function abrirBuscadorGlobal() {
  const cuerpo = abrirHoja('Buscar',
    '<div class="buscador">' +
      '<input type="search" id="buscar-todo" class="buscador__control" ' +
             'placeholder="Buscar en todo el panel" ' +
             'autocomplete="off" autocorrect="off">' +
    '</div>' +
    '<div id="buscar-resultados">' +
      '<p class="vacio__texto" style="text-align:center;padding:var(--esp-3)">' +
        'Escribe al menos ' + MINIMO_PARA_BUSCAR + ' letras.' +
      '</p>' +
    '</div>');

  const campo = buscar('#buscar-todo', cuerpo);
  const donde = buscar('#buscar-resultados', cuerpo);

  campo.focus();

  /* Se busca mientras se escribe, sin botón: con los datos ya en
     memoria filtrar es instantáneo y esperar un "Buscar" sería pedir un
     toque de más por nada. */
  campo.addEventListener('input', () => pintarResultados(donde, campo.value));

  /* Los datos se traen POR DETRÁS, sin bloquear. Se puede empezar a
     escribir con lo que ya esté cargado, y cuando llega el resto se
     repite la búsqueda sola. */
  asegurarDatosParaBuscar().then(() => {
    if (buscar('#buscar-todo')) pintarResultados(donde, campo.value);
  });
}

/**
 * Dibuja los resultados.
 *
 * @param {Element} donde
 * @param {string} loEscrito
 * @returns {void}
 */
function pintarResultados(donde, loEscrito) {
  if (paraBuscar(loEscrito).trim().length < MINIMO_PARA_BUSCAR) {
    donde.innerHTML =
      '<p class="vacio__texto" style="text-align:center;padding:var(--esp-3)">' +
        'Escribe al menos ' + MINIMO_PARA_BUSCAR + ' letras.' +
      '</p>';
    return;
  }

  const grupos = buscarEnTodo(loEscrito);

  if (!grupos.length) {
    pintarVacio(donde, 'No encontré nada',
      'Prueba con otra palabra, o con una parte del nombre.');

    // Evento 8 del panel de métricas: cuánto no encuentra el buscador.
    // Con un pequeño retraso, para no anotar cada letra de una palabra
    // que a mitad de camino todavía no tiene resultados.
    clearTimeout(BUSQUEDA_VACIA_TIMER);
    BUSQUEDA_VACIA_TIMER = setTimeout(() => {
      registrarEvento('busqueda', 'busqueda_vacia', { texto: loEscrito });
    }, 800);

    return;
  }

  // Se aplana para poder identificar cada fila con un solo número.
  RESULTADOS_BUSQUEDA = [];
  grupos.forEach(g => g.filas.forEach(f => RESULTADOS_BUSQUEDA.push(f)));

  let n = -1;
  donde.innerHTML = grupos.map(grupo => {
    const deMas = grupo.cuantos - grupo.filas.length;

    return '' +
      '<div class="indice__titulo" style="margin-top:var(--esp-2)">' +
        seguro(grupo.grupo) +
        (deMas > 0 ? ' · ' + seguro(grupo.cuantos) : '') +
      '</div>' +

      grupo.filas.map(fila => {
        n++;
        return '<button class="lista__fila" data-resultado="' + n + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' +
              seguro(fila.fuente.titulo(fila.registro) || '—') + '</span>' +
            '<span class="lista__pie">' +
              seguro(fila.fuente.pie(fila.registro) || '') + '</span>' +
          '</span>' +
        '</button>';
      }).join('') +

      (deMas > 0
        ? '<p class="vacio__texto" style="padding:0 var(--esp-1)">y ' +
          seguro(deMas) + ' más</p>'
        : '');
  }).join('');

  buscarTodos('[data-resultado]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      const fila = RESULTADOS_BUSQUEDA[Number(boton.dataset.resultado)];
      if (!fila) return;
      cerrarHoja(true);
      fila.fuente.ir(fila.registro);
    });
  });
}
