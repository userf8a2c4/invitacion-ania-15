/* ══════════════════════════════════════════════════════════════════════
   29 · EL BOTÓN DE ACCIÓN RÁPIDA (FAB)

   QUÉ HACE ESTE ARCHIVO
   El botón redondo de abajo a la derecha (#boton-accion). Es la capa de
   mínimo esfuerzo del panel: hasta tres herramientas que cada persona
   elige, a un toque de distancia desde cualquier pantalla.

   UN TOQUE. NO HAY GESTO OCULTO.
   El toque abre el sandwich: hasta tres herramientas fijas, un toque y
   listo, sin escribir nada. Abajo de las tres va MegaBot, siempre, para
   lo que no entra en un botón.

   Hasta el 2026-09-09 era al revés —toque simple = chat de MegaBot,
   toque largo = las herramientas— y el toque largo no se anunciaba en
   ninguna parte de la app. Ver la nota en prepararFab().

   ES POR PERSONA, NO DEL EVENTO
   Lo que Carlos elige no tiene por qué ser lo que elige Lucila. Se
   guarda con la clave 'fab_<id-de-usuario>' en la tabla `ajustes`
   —api/ajustes.php tiene una excepción puntual para dejar guardar esa
   clave sin ser administradora— más una copia en localStorage por
   cuenta, para que abra ya configurado sin esperar al servidor.

   ÍNDICE
     1. El catálogo de herramientas
     2. Guardar, cargar y sincronizar la elección
     3. El toque: abrir el sandwich
     4. La pantalla para elegir
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. EL CATÁLOGO DE HERRAMIENTAS ───────────────────────────────── */

/**
 * Todo lo que se puede poner en el sandwich. `ejecutar` es lo que corre
 * al tocarlo; `soloAdmin` esconde la herramienta para una cuenta que no
 * sea administradora (mismo motivo que en cada uno de estos endpoints:
 * marcar un pago es dinero, y el dinero ya está protegido en el
 * servidor — acá solo evita ofrecer un botón que va a fallar).
 */
const CATALOGO_FAB = [
  { clave: 'escanear', nombre: 'Escanear pase',
    descripcion: 'Leer un QR en la puerta y marcar quién llegó',
    ejecutar: () => abrirEscaner() },

  { clave: 'buscar', nombre: 'Buscar persona',
    descripcion: 'El buscador de todo el panel',
    ejecutar: () => abrirBuscadorGlobal() },

  { clave: 'tarea', nombre: 'Nueva tarea',
    descripcion: 'Anotar algo pendiente, con fecha si hace falta',
    ejecutar: () => formularioTarea() },

  { clave: 'nota', nombre: 'Nueva nota',
    descripcion: 'Un apunte rápido, para no perderlo',
    ejecutar: () => abrirHojaDeNota() },

  { clave: 'plano', nombre: 'Ver plano de mesas',
    descripcion: 'El acomodo del salón, directo',
    ejecutar: () => verPlanoDeMesas() },

  { clave: 'pago', nombre: 'Marcar pago rápido',
    descripcion: 'Los pagos pendientes, para marcarlos con un toque',
    soloAdmin: true,
    ejecutar: () => abrirMarcarPagoRapido() },

  { clave: 'sync', nombre: 'Sincronizar ahora',
    descripcion: 'Mandar ya lo que haya quedado en la cola',
    ejecutar: () => sincronizarAhora() },

  { clave: 'alarma', nombre: 'Nueva alarma',
    descripcion: 'Un recordatorio con fecha y hora exactas',
    // formularioDeAlarma() llama a `despues()` sin comprobar que exista
    // al terminar de guardar — hace falta pasarle algo, aunque no haya
    // ninguna lista abierta atrás para refrescar.
    ejecutar: () => formularioDeAlarma(null, () => {}) },

  { clave: 'resumen-ejecutivo', nombre: 'Resumen ejecutivo',
    descripcion: 'El PDF del presupuesto, listo para mandar o imprimir',
    soloAdmin: true,
    ejecutar: () => exportarResumenEjecutivoDinero() },

  { clave: 'respaldo', nombre: 'Respaldar ahora',
    descripcion: 'Mandar por correo la copia de todo, con los archivos adjuntos',
    soloAdmin: true,
    ejecutar: () => abrirHojaDeRespaldo() },

  { clave: 'recibo-rapido', nombre: 'Nuevo recibo',
    descripcion: 'Elegir a quién le pagás (proveedor, padrino, o cualquier otro) y generar su recibo',
    soloAdmin: true,
    ejecutar: () => abrirGeneradorDeReciboGenerico() },

  { clave: 'contrato-rapido', nombre: 'Nuevo contrato',
    descripcion: 'Elegir un proveedor y generar su contrato, sin pasar por Presupuesto',
    soloAdmin: true,
    ejecutar: () => abrirElegirProveedorPara('Elige el proveedor',
                                             p => abrirGeneradorDeContrato(p)) },

  /* "Ver recibos/contratos" es también el camino para MODIFICAR o
     BORRAR uno por chat: lleva directo a la lista protegida
     (abrirListaDeDocumentos, en 09-vista-dinero.js), donde tocar una
     fila abre el detalle de solo lectura y ahí —recién ahí— aparecen
     Editar y Borrar, cada uno detrás de su propia confirmación.

     ⚡ YA NO PIDEN ELEGIR PROVEEDOR PRIMERO (2026-08-27). Antes exigían
     `abrirElegirProveedorPara(...)` como paso obligatorio, a pesar de
     que recibos.php/contratos.php ya soportan listar TODO sin filtro —
     la restricción era puramente del frontend. Ahora abren la lista
     completa de una vez (con un desplegable adentro para acotar a un
     proveedor si hace falta), igual que ya hacía "Nuevo recibo". Los
     contratos sí siguen exigiendo proveedor para GENERARLOS (abajo,
     contrato-rapido) porque `contratos.proveedor_id` es obligatorio en
     la base — pero para solo VERLOS no hace falta pedirlo de entrada. */
  { clave: 'ver-recibos', nombre: 'Ver recibos',
    descripcion: 'Ver, editar o borrar los recibos ya generados (con filtro opcional por proveedor)',
    soloAdmin: true,
    ejecutar: () => abrirListaDeDocumentos('recibo', null) },

  { clave: 'ver-contratos', nombre: 'Ver contratos',
    descripcion: 'Ver, editar o borrar los contratos ya generados (con filtro opcional por proveedor)',
    soloAdmin: true,
    ejecutar: () => abrirListaDeDocumentos('contrato', null) },
];

/**
 * Lista corta de proveedores para elegir uno y actuar de inmediato —
 * mismo espíritu que abrirMarcarPagoRapido(): un toque acá, y ya está
 * en el formulario, sin pasar por la pestaña Presupuesto ni por su
 * buscador. Es el atajo que hace que "Nuevo recibo" y "Nuevo contrato"
 * cumplan con las tres toques de siempre (y dos el día de la fiesta,
 * cuando la mayoría de los datos ya vienen pre-llenados).
 *
 * @param {string} titulo
 * @param {(proveedor: Object) => void} alElegir
 * @returns {Promise<void>}
 */
async function abrirElegirProveedorPara(titulo, alElegir) {
  const cuerpo = abrirHoja(titulo, '<div class="esqueleto"></div>'.repeat(3));

  let datos;
  try {
    datos = await traer('presupuesto.php?accion=todo');
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirElegirProveedorPara(titulo, alElegir));
    return;
  }

  const proveedores = (datos.proveedores || []).slice()
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  if (!proveedores.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no hay proveedores',
      'Da de alta uno primero, desde Dinero › Proveedores.');
    return;
  }

  cuerpo.innerHTML = proveedores.map(p =>
    '<button class="lista__fila" data-elegir-proveedor="' + seguro(p.id) + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
        '<span class="lista__pie">' + seguro(p.servicio || '—') + '</span>' +
      '</span>' +
    '</button>'
  ).join('');

  buscarTodos('[data-elegir-proveedor]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const proveedor = proveedores.find(p => String(p.id) === boton.dataset.elegirProveedor);
      cerrarHoja(true);
      if (proveedor) alElegir(proveedor);
    });
  });
}

/**
 * Salta directo a la pestaña Gente, sección Mesas — sin pasar por su
 * índice. SECCION_GENTE es la misma variable global que ya usa
 * 08-vista-invitados.js para recordar qué sección de Gente se está
 * viendo; fijarla antes de entrar es el mismo patrón que ya usan los
 * atajos de Hoy con SECCION_DINERO y SECCION_EVENTO.
 *
 * @returns {void}
 */
function verPlanoDeMesas() {
  SECCION_GENTE = 'mesas';
  irA('invitados', true);
}

/**
 * Los pagos pendientes, para marcarlos pagados con un toque sin tener
 * que entrar a Presupuesto y buscarlos. Reusa presupuesto.php tal cual
 * está: 'todo' para traerlos y 'marcar_pagado' (ya existe, protegido
 * por exigirAdministrador() en el propio archivo) para marcarlos.
 *
 * @returns {Promise<void>}
 */
async function abrirMarcarPagoRapido() {
  const cuerpo = abrirHoja('Marcar pago', '<div class="esqueleto"></div>'.repeat(3));

  let datos;
  try {
    datos = await traer('presupuesto.php?accion=todo');
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => abrirMarcarPagoRapido());
    return;
  }

  const pendientes = (datos.pagos || [])
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => (a.fecha_limite || '9999') < (b.fecha_limite || '9999') ? -1 : 1)
    .slice(0, 8);

  if (!pendientes.length) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'No hay pagos pendientes', 'Todo lo que había, ya está pagado.');
    return;
  }

  cuerpo.innerHTML = pendientes.map(p =>
    '<button class="lista__fila" data-pago-rapido="' + seguro(p.id) + '">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(p.concepto || p.gasto_concepto || 'Pago') + '</span>' +
        '<span class="lista__pie">' +
          (p.fecha_limite ? seguro(comoFecha(String(p.fecha_limite).slice(0, 10))) : 'Sin fecha') +
        '</span>' +
      '</span>' +
      '<span class="lista__lado cifra">' + seguro(comoDinero(p.monto, false)) + '</span>' +
    '</button>'
  ).join('');

  buscarTodos('[data-pago-rapido]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      boton.disabled = true;
      try {
        await mandar('presupuesto.php?accion=marcar_pagado', { id: boton.dataset.pagoRapido });
        cerrarHoja(true);
        avisar('Marcado como pagado.');
        ensuciarVistas('resumen', 'dinero');
      } catch (error) {
        avisar(error.message, true);
        boton.disabled = false;
      }
    });
  });
}


/* ─── 2. GUARDAR, CARGAR Y SINCRONIZAR LA ELECCIÓN ─────────────────── */

/* Lo que trae la app de fábrica, antes de que nadie elija nada.
 *
 * ⚡ SALE 'buscar', ENTRA 'tarea' (2026-09-09). Buscar ya vive en la
 * lupa del encabezado, visible desde CUALQUIER pantalla del panel:
 * repetirlo acá era gastar uno de los tres únicos lugares en un camino
 * que ya estaba a un toque.
 *
 * Los tres de ahora son las tres cosas que Lucila hace de verdad todos
 * los días: dejar entrar a alguien, anotar algo que se acaba de acordar,
 * y apuntar un pendiente. El plano de mesas no entra porque ya es un
 * botón entero en Hoy. */
const SANDWICH_DE_FABRICA = ['escanear', 'nota', 'tarea'];

/** Las claves elegidas, en orden. Se llenan al arrancar. */
let SANDWICH_FAB = SANDWICH_DE_FABRICA.slice();

/**
 * La clave de localStorage y de `ajustes`, propia de esta cuenta.
 *
 * @returns {string}
 */
function claveDelSandwich() {
  return 'fab_' + (USUARIO && USUARIO.id ? USUARIO.id : '0');
}

/**
 * Aplica lo que haya guardado en este teléfono para esta cuenta, sin
 * esperar al servidor — mismo criterio que la paleta de colores.
 *
 * @returns {void}
 */
function cargarSandwichGuardadoEnElTelefono() {
  try {
    const guardado = localStorage.getItem(claveDelSandwich());
    if (guardado) {
      const lista = JSON.parse(guardado);
      if (Array.isArray(lista) && lista.length) SANDWICH_FAB = lista;
    }
  } catch (error) {
    // JSON corrupto: se sigue con el de fábrica.
  }
}

/**
 * Pide al servidor la elección guardada para ESTA cuenta y, si es
 * distinta, la aplica y la copia al teléfono. Se llama después de
 * entrar, para que un cambio hecho desde otro teléfono también llegue.
 *
 * @returns {Promise<void>}
 */
async function sincronizarSandwichConServidor() {
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=' + claveDelSandwich());
    if (!r || !r.valor) return;

    const lista = JSON.parse(r.valor);
    if (!Array.isArray(lista) || !lista.length) return;

    localStorage.setItem(claveDelSandwich(), JSON.stringify(lista));
    SANDWICH_FAB = lista;
  } catch (error) {
    // Sin señal, o todavía no había elegido nada: se sigue con lo que
    // ya estaba aplicado.
  }
}

/**
 * Guarda la elección en el servidor y en el teléfono.
 *
 * @param {string[]} claves
 * @returns {Promise<void>}
 */
async function guardarSandwich(claves) {
  await mandar('ajustes.php?accion=guardar', {
    clave: claveDelSandwich(),
    valor: JSON.stringify(claves),
  });
  localStorage.setItem(claveDelSandwich(), JSON.stringify(claves));
  SANDWICH_FAB = claves;
}


/* ─── 3. EL TOQUE: ABRIR EL SANDWICH ───────────────────────────────── */

/**
 * Engancha el FAB. Un toque abre las herramientas elegidas. Nada más.
 *
 * ⚡ SE RETIRÓ EL TOQUE LARGO (2026-09-09)
 *
 * QUÉ PASABA
 * El botón decía `aria-label="Acción rápida"`, mostraba un rayo, y un
 * toque abría el CHAT de MegaBot. Las tres herramientas —lo que de
 * verdad es una acción rápida, y lo único que se puede configurar de
 * este botón— estaban detrás de sostener el dedo 480 ms, sin que nada
 * en toda la app lo dijera nunca.
 *
 * Un gesto que no se anuncia no es una función escondida: es una
 * función que para quien usa la app no existe. Lucila puede haber
 * elegido sus tres herramientas en Ajustes y no haberlas visto jamás.
 *
 * Y encima el toque largo tenía un costo real que se notaba: sostener
 * el dedo sobre un botón es, para el teléfono, el gesto de SELECCIONAR
 * TEXTO. Al soltar quedaba el texto de algún botón resaltado, con la
 * lupa y el menú de «Copiar» tapando la pantalla. (Eso se arregló
 * aparte, con `user-select: none` en 02-componentes.css, porque pasaba
 * en todos los controles y no solo acá.)
 *
 * DÓNDE QUEDÓ MEGABOT
 * Abajo del sandwich, como fila fija: sigue estando a un toque más,
 * pero no gasta ninguno de los tres lugares elegibles. Ver
 * abrirSandwich(). La campana (37-campana.js) también lo sigue
 * abriendo directo.
 *
 * @returns {void}
 */
function prepararFab() {
  const boton = buscar('#boton-accion');
  if (!boton) return;

  boton.addEventListener('click', () => abrirSandwich());
}

/**
 * Abre la hoja con las herramientas elegidas, listas para tocar.
 *
 * @returns {void}
 */
function abrirSandwich() {
  const esAdmin = USUARIO.rol === 'admin';

  const elegidas = SANDWICH_FAB
    .map(clave => CATALOGO_FAB.find(h => h.clave === clave))
    .filter(Boolean)
    .filter(h => !h.soloAdmin || esAdmin);

  /* MegaBot va SIEMPRE, y va último. Antes era lo que abría el toque
     simple de este botón; al pasar el toque simple a las herramientas,
     habría desaparecido de acá sin más. No gasta uno de los tres
     lugares elegibles porque no es una herramienta que se elige: es la
     otra forma de pedirle algo al panel, la de escribirlo. */
  const filaDeMegaBot =
    '<button class="boton boton--ancho" id="fab-megabot" ' +
            'style="min-height:52px;justify-content:flex-start;text-align:left;' +
                   'margin-top:var(--esp-2)">' +
      '<span>' +
        '<span style="display:block;font-weight:600">Preguntarle a MegaBot</span>' +
        '<span style="display:block;font-size:12px;color:var(--texto-tenue);' +
                     'font-weight:400">Escribile qué necesitás y lo hace</span>' +
      '</span>' +
    '</button>';

  const engancharMegaBot = (cuerpo) => {
    buscar('#fab-megabot', cuerpo).addEventListener('click', () => {
      cerrarHoja(true);
      abrirAsistente();
    });
  };

  if (!elegidas.length) {
    const cuerpo = abrirHoja('Acción rápida',
      '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
        'Todavía no elegiste ninguna herramienta para este botón.' +
      '</p>' +
      '<button class="boton boton--principal boton--ancho" id="fab-configurar-ahora">' +
        'Elegir herramientas' +
      '</button>' +
      filaDeMegaBot
    );
    buscar('#fab-configurar-ahora', cuerpo).addEventListener('click', () => {
      cerrarHoja(true);
      abrirConfiguracionDelFab();
    });
    engancharMegaBot(cuerpo);
    return;
  }

  const cuerpo = abrirHoja('Acción rápida',
    elegidas.map(h =>
      '<button class="boton boton--ancho" data-fab-herramienta="' + seguro(h.clave) + '" ' +
              'style="min-height:52px;justify-content:flex-start;text-align:left;' +
                     'margin-bottom:var(--esp-1)">' +
        '<span>' +
          '<span style="display:block;font-weight:600">' + seguro(h.nombre) + '</span>' +
          '<span style="display:block;font-size:12px;color:var(--texto-tenue);' +
                       'font-weight:400">' + seguro(h.descripcion) + '</span>' +
        '</span>' +
      '</button>'
    ).join('') +
    filaDeMegaBot +

    /* Que se pueda cambiar desde donde se usa, y no solo desde el fondo
       de Más → La app. Si estas tres no son las que hacen falta, el
       lugar donde uno se da cuenta es justo acá. */
    '<button class="boton boton--fantasma boton--ancho" id="fab-cambiar" ' +
            'style="margin-top:var(--esp-1)">Cambiar estas herramientas</button>'
  );

  buscarTodos('[data-fab-herramienta]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const herramienta = CATALOGO_FAB.find(h => h.clave === boton.dataset.fabHerramienta);
      cerrarHoja(true);
      if (herramienta) herramienta.ejecutar();
    });
  });

  engancharMegaBot(cuerpo);

  buscar('#fab-cambiar', cuerpo).addEventListener('click', () => {
    cerrarHoja(true);
    abrirConfiguracionDelFab();
  });
}


/* ─── 4. LA PANTALLA PARA ELEGIR ───────────────────────────────────── */

/**
 * Ajustes → "Mis herramientas rápidas". Elegir de 1 a 3, en el orden en
 * que se tocan — no hay arrastre para reordenar: el orden de toque ya
 * es la forma más simple de decidirlo, y con tres opciones como mucho
 * no hace falta más.
 *
 * @returns {void}
 */
function abrirConfiguracionDelFab() {
  const esAdmin = USUARIO.rol === 'admin';
  const disponibles = CATALOGO_FAB.filter(h => !h.soloAdmin || esAdmin);

  // Copia de trabajo: se edita acá y solo se guarda al tocar Guardar.
  let elegidas = SANDWICH_FAB.filter(clave => disponibles.some(h => h.clave === clave));

  const cuerpo = abrirHoja('Mis herramientas rápidas',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Elige hasta tres. Aparecen al tocar el botón redondo de abajo, en ' +
      'el orden en que las toques acá. MegaBot está siempre ahí, no ' +
      'ocupa ninguno de los tres lugares.' +
    '</p>' +
    '<div id="fab-lista"></div>' +
    '<button class="boton boton--principal boton--ancho" id="fab-guardar" ' +
            'style="margin-top:var(--esp-3)">Guardar</button>'
  );

  const listaEl = buscar('#fab-lista', cuerpo);

  const pintar = () => {
    listaEl.innerHTML = disponibles.map(h => {
      const posicion = elegidas.indexOf(h.clave);
      const marcada = posicion !== -1;

      return '<button class="lista__fila" data-fab-elegir="' + seguro(h.clave) + '" ' +
                    'style="' + (marcada ? 'border-color:var(--oro)' : '') + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(h.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(h.descripcion) + '</span>' +
        '</span>' +
        (marcada
          ? '<span class="etiqueta etiqueta--bien">' + (posicion + 1) + 'º</span>'
          : '') +
      '</button>';
    }).join('');

    buscarTodos('[data-fab-elegir]', listaEl).forEach(boton => {
      boton.addEventListener('click', () => {
        const clave = boton.dataset.fabElegir;
        const yaEstaba = elegidas.indexOf(clave);

        if (yaEstaba !== -1) {
          elegidas.splice(yaEstaba, 1);
        } else {
          if (elegidas.length >= 3) {
            avisar('Como mucho tres. Quita una para agregar otra.', true);
            return;
          }
          elegidas.push(clave);
        }
        pintar();
      });
    });
  };

  pintar();

  buscar('#fab-guardar', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#fab-guardar', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    try {
      await guardarSandwich(elegidas);
      cerrarHoja(true);
      avisar('Guardado.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Guardar';
    }
  });
}
