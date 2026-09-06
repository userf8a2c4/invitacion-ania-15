/* ══════════════════════════════════════════════════════════════════════
   32 · EL ASISTENTE

   QUÉ ES Y QUÉ NO ES
   NO es una inteligencia artificial. Es un motor de intenciones
   determinista: compara lo que se escribe contra una lista de frases
   por acción —de fábrica, más las que cada persona le va enseñando— y
   ejecuta la que mejor puntaje saque. Sin descargar nada, sin esperar
   a un servidor de IA, sin costo, funcionando igual sin señal.

   No entiende nada que no esté en su lista. Si no reconoce una frase,
   lo dice y ofrece la más parecida — nunca inventa una acción.

   CÓMO APRENDE, Y POR QUÉ ES POR CUENTA
   Cuando alguien confirma "sí, quería decir X" con una frase que el
   motor no tenía, esa frase se guarda para SU cuenta (quienSoy(),
   26-sincronizacion.js) — primero en el teléfono (para seguir
   funcionando sin señal) y después en el servidor (api/comandos.php).
   Lo que aprende Lucila nunca le aparece a Carlos, y al revés.

   LAS ACCIONES SON LAS MISMAS QUE YA EJECUTA EL FAB
   CATALOGO_FAB (29-fab.js) ya es la lista de "cosas que se pueden
   hacer con un toque". El asistente reusa exactamente esas funciones
   —nunca escribe a la base por su cuenta— y solo agrega las frases
   para reconocerlas escritas, más un puñado de "ir a tal pestaña".

   ÍNDICE
     1. El registro de intenciones
     2. Aprendizaje por cuenta
     3. El motor de coincidencia
     3b. Frases con una entidad adentro (Fase 4b)
     4. La hoja del asistente
     5. Ajustes → Comandos del asistente
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. EL REGISTRO DE INTENCIONES ────────────────────────────────── */

/**
 * Cada intención: una clave, cómo se llama, sus frases de fábrica, y
 * qué ejecutar. Las primeras siete son las mismas de CATALOGO_FAB
 * (29-fab.js) — se arman acá abajo, no a mano, para no mantener la
 * misma lista escrita dos veces.
 */
function intencionesDelAsistente() {
  const deLasHerramientas = CATALOGO_FAB
    .filter(h => !h.soloAdmin || USUARIO.rol === 'admin')
    .map(h => ({
      clave: h.clave,
      nombre: h.nombre,
      frases: FRASES_DE_FABRICA[h.clave] || [h.nombre],
      ejecutar: h.ejecutar,
    }));

  const deNavegar = Object.keys(FRASES_DE_NAVEGACION).map(clave => ({
    clave: 'ir_' + clave,
    nombre: 'Ir a ' + (VISTAS[clave] ? VISTAS[clave].titulo : clave),
    frases: FRASES_DE_NAVEGACION[clave],
    ejecutar: () => irA(clave, clave === VISTA_ACTUAL),
  }));

  return deLasHerramientas.concat(deNavegar);
}

/** Las frases de fábrica de cada herramienta del FAB. */
const FRASES_DE_FABRICA = {
  escanear: ['escanear pase', 'leer un qr', 'escanear', 'abrir el escaner'],
  buscar:   ['buscar persona', 'buscar invitado', 'buscar', 'quien es', 'donde esta', 'localizar a'],
  tarea:    ['nueva tarea', 'agregar tarea', 'crear tarea', 'anotar una tarea', 'pendiente nuevo'],
  nota:     ['nueva nota', 'agregar nota', 'anotar', 'tomar nota', 'apuntar algo'],
  plano:    ['ver plano', 'ver mesas', 'plano de mesas', 'como estan las mesas', 'salon de mesas'],
  pago:     ['marcar pago', 'pagos pendientes', 'marcar pagado', 'que falta pagar',
             'ya pago', 'cobrar', 'liquidar pago', 'saldar cuenta'],
  sync:     ['sincronizar', 'sincronizar ahora', 'actualizar todo', 'mandar los cambios'],
  'recibo-rapido':   ['nuevo recibo', 'generar recibo', 'hacer un recibo', 'dar un recibo',
                       'quiero un recibo', 'recibo de pago'],
  'contrato-rapido': ['nuevo contrato', 'generar contrato', 'hacer un contrato',
                       'quiero un contrato', 'contrato de servicio'],
  /* ⚡ "BORRAR RECIBO" Y "BORRAR CONTRATO" SE SACARON (2026-09-03).
     Eran frases de fábrica: decirle "borrar recibo" al asistente abría
     la lista y dejaba a dos toques de destruir un documento numerado y
     ya entregado. Contradice la regla del módulo —MegaBot ejecuta
     confirmando, NUNCA borra— y ninguna otra frase de la lista lleva a
     un borrado. Buscar y editar siguen; para borrar hay que ir a la
     ficha, que es donde la pregunta explica qué se pierde. */
  'ver-recibos':     ['ver recibos', 'mis recibos', 'buscar recibo', 'editar recibo',
                       'recibos de un proveedor'],
  'ver-contratos':   ['ver contratos', 'mis contratos', 'buscar contrato', 'editar contrato',
                       'contratos de un proveedor'],
};

/** A qué pestaña lleva cada frase de navegación. */
const FRASES_DE_NAVEGACION = {
  hoy:        ['ir a hoy', 'abrir hoy', 'pantalla de hoy'],
  resumen:    ['ir a resumen', 'ver resumen', 'como vamos', 'que necesita atencion',
               'panorama general'],
  invitados:  ['ir a gente', 'ver invitados', 'abrir gente'],
  dinero:     ['ir a dinero', 'ver presupuesto', 'abrir presupuesto', 'cuanto llevamos gastado',
               'ver gastos'],
  correo:     ['ir a correo', 'ver correo', 'abrir el correo'],
  evento:     ['ir a evento', 'ver evento', 'abrir evento'],
  planificar: ['ir a planificar', 'ver herramientas'],
};

/**
 * Frases de contexto: dos o tres, según en qué pestaña esté parada
 * quien abre el asistente. Se muestran como chips, listas para tocar.
 */
const CONTEXTO_DEL_ASISTENTE = {
  hoy:        ['Escanear pase', 'Buscar invitado', 'Ver plano'],
  resumen:    ['¿Qué necesita atención?', 'Ir a dinero'],
  invitados:  ['Buscar invitado', 'Ver plano'],
  dinero:     ['Marcar pago', 'Nuevo recibo', 'Ver recibos', 'Sincronizar'],
  correo:     ['Sincronizar', 'Ir a resumen'],
  evento:     ['Nueva tarea', 'Ir a resumen'],
  planificar: ['Nueva tarea', 'Ir a correo'],
  mas:        ['Sincronizar ahora'],
};


/* ─── 2. APRENDIZAJE POR CUENTA ─────────────────────────────────────── */

/**
 * La clave de localStorage, propia de esta cuenta — mismo criterio que
 * el sandwich del FAB (29-fab.js, claveDelSandwich()).
 *
 * @returns {string}
 */
function claveDeFrasesAprendidas() {
  return 'asistente_frases_' + quienSoy();
}

/** Lo aprendido: [{id, intencion, frase}]. Se llena al arrancar. */
let FRASES_APRENDIDAS = [];

/**
 * Aplica lo que haya guardado en este teléfono para esta cuenta.
 *
 * @returns {void}
 */
function cargarFrasesAprendidasEnElTelefono() {
  try {
    const guardado = localStorage.getItem(claveDeFrasesAprendidas());
    FRASES_APRENDIDAS = guardado ? JSON.parse(guardado) : [];
  } catch (error) {
    FRASES_APRENDIDAS = [];
  }
}

/**
 * Trae lo aprendido desde el servidor y lo copia al teléfono. Se llama
 * después de entrar, sin esperarla — mismo patrón que la paleta y el
 * sandwich del FAB.
 *
 * @returns {Promise<void>}
 */
async function sincronizarFrasesConServidor() {
  try {
    const filas = await traer('comandos.php?accion=listar');
    if (!Array.isArray(filas)) return;
    FRASES_APRENDIDAS = filas;
    localStorage.setItem(claveDeFrasesAprendidas(), JSON.stringify(filas));
  } catch (error) {
    // Sin señal: se sigue con lo que ya había en el teléfono.
  }
}

/**
 * Enseña una frase nueva: la guarda en el teléfono YA (para que sirva
 * de inmediato, incluso sin señal) y la manda al servidor.
 *
 * @param {string} intencion
 * @param {string} frase
 * @returns {Promise<void>}
 */
async function enseñarFrase(intencion, frase) {
  const yaLaSabe = FRASES_APRENDIDAS.some(f => paraBuscar(f.frase) === paraBuscar(frase));
  if (yaLaSabe) return;

  FRASES_APRENDIDAS.push({ id: null, intencion, frase });
  localStorage.setItem(claveDeFrasesAprendidas(), JSON.stringify(FRASES_APRENDIDAS));

  try {
    await mandar('comandos.php?accion=agregar', { intencion, frase });
  } catch (error) {
    // Quedó guardada en el teléfono; sincronizarFrasesConServidor() la
    // va a alinear la próxima vez que haya señal (mandar() ya la
    // encola sola si estaba offline — ver 03-servidor.js).
  }
}


/* ─── 3. EL MOTOR DE COINCIDENCIA ───────────────────────────────────── */

/**
 * Qué tan parecidas son dos frases, de 0 (nada) a 100 (idénticas).
 * Sin inteligencia artificial: coincidencia exacta, una contenida en
 * la otra, o cuántas palabras comparten.
 *
 * @param {string} entrada - Ya normalizada con paraBuscar().
 * @param {string} frase   - Ya normalizada con paraBuscar().
 * @returns {number}
 */
function puntajeDeParecido(entrada, frase) {
  if (!entrada || !frase) return 0;
  if (entrada === frase) return 100;
  if (frase.includes(entrada) || entrada.includes(frase)) return 80;

  const palabrasEntrada = entrada.split(' ').filter(Boolean);
  const palabrasFrase   = frase.split(' ').filter(Boolean);
  const comunes = palabrasFrase.filter(p => palabrasEntrada.includes(p)).length;

  return comunes > 0 ? Math.round(40 + (comunes / palabrasFrase.length) * 30) : 0;
}

/**
 * Busca, entre TODAS las intenciones y TODAS sus frases (fábrica +
 * aprendidas), las que mejor coinciden con lo que se escribió.
 *
 * @param {string} texto - Lo que escribió la persona.
 * @returns {Array<{intencion:Object, puntaje:number, frase:string}>} De mayor a menor puntaje.
 */
function buscarCoincidencias(texto) {
  const entrada = paraBuscar(texto);
  const intenciones = intencionesDelAsistente();
  const resultados = [];

  intenciones.forEach(intencion => {
    const aprendidas = FRASES_APRENDIDAS
      .filter(f => f.intencion === intencion.clave)
      .map(f => f.frase);

    let mejor = 0;
    let mejorFrase = '';

    intencion.frases.concat(aprendidas).forEach(frase => {
      const p = puntajeDeParecido(entrada, paraBuscar(frase));
      if (p > mejor) { mejor = p; mejorFrase = frase; }
    });

    if (mejor > 0) resultados.push({ intencion, puntaje: mejor, frase: mejorFrase });
  });

  return resultados.sort((a, b) => b.puntaje - a.puntaje);
}


/* ─── 3b. FRASES CON UNA ENTIDAD ADENTRO (Fase 4b) ──────────────────── */

/*
   Antes de comparar la frase contra la lista fija de arriba, se prueba
   si empieza con uno de estos patrones. Si empieza, lo que sigue no es
   una frase para reconocer tal cual: es texto libre que hay que buscar
   entre los datos reales (34-asistente-datos.js).

   Se usa el texto ORIGINAL (no el normalizado con paraBuscar) para no
   perder mayúsculas ni acentos del nombre que se va a buscar — la
   búsqueda en sí ya normaliza los dos lados por su cuenta.
*/
const PATRONES_DE_ENTIDAD = [
  /* Fase B (Paso 5): más formas de decir "ya se pagó" — antes solo
     entendía "marca(r) pagado/a". El grupo de después del verbo se
     prueba de más específico ("el pago de") a más genérico ("a"), para
     que "liquida el pago de flores" no se coma "el pago de" como si
     fuera parte del nombre. */
  { tipo: 'pago',    regex: /^(?:marca(?:r)?\s+pagad[oa]|ya\s+pagu[eé]|ya\s+se\s+pag[oó]|cobra(?:r)?|liquida(?:r)?|salda(?:r)?)\s+(?:el\s+pago\s+de\s+|la\s+cuenta\s+de\s+|el\s+|la\s+|al\s+|a\s+)?(.+)/i },
  { tipo: 'buscar',  regex: /^(?:busca(?:r)?\s+a|quien\s+es)\s+(.+)/i },
  /* Fase B: "sienta a Juan en la mesa 5" — el segundo grupo (la mesa)
     es opcional; si no está, sigue funcionando como antes (abre el
     selector de mesas de siempre). */
  { tipo: 'sentar',  regex: /^(?:sienta(?:r|n)?|acomoda(?:r)?)\s+a\s+(.+?)(?:\s+en\s+(?:la\s+)?mesa\s+(.+))?$/i },
  { tipo: 'tarea',   regex: /^(?:crea(?:r)?|agrega(?:r)?)\s+una?\s+tarea\s+(?:de\s+)?(.+)/i },
];

/**
 * Fase B (Paso 5): separa una fecha del final de una tarea SIN la
 * palabra "para" — "llamar al DJ mañana", "confirmar flores el
 * viernes". Prueba las últimas 1, 2, 3… palabras como fecha, de MENOS
 * palabras a MÁS: "el viernes" ya matchea con la palabra "viernes"
 * sola (interpretarFechaParaElAsistente busca por substring), así que
 * si se probara de más a menos primero, "confirmar flores el viernes"
 * se comería "flores el" como si fueran parte de la fecha. Probando
 * de a poco, "en 3 dias" igual se arma completo: "dias" sola no
 * significa nada, así que sigue probando hasta llegar a la frase
 * entera.
 *
 * Es ambiguo a propósito, de forma conservadora: si el final de una
 * tarea real fuera "...el pago de mañana" (mañana como parte del
 * título, no como fecha), esto igual la separaría. Es un costado
 * aceptado del Paso 5 — la tarea se crea igual, solo con el título
 * recortado, y se corrige a mano abriendo la tarea después.
 *
 * @param {string} resto
 * @returns {{titulo:string, fecha:string}|null} null si nada del final
 *   se entendió como fecha.
 */
function separarFechaSueltaDeTarea(resto) {
  const palabras = resto.trim().split(/\s+/).filter(Boolean);
  const maximo = Math.min(4, palabras.length - 1);

  for (let n = 1; n <= maximo; n++) {
    const candidata = palabras.slice(-n).join(' ');
    const fecha = interpretarFechaParaElAsistente(candidata);
    if (!fecha) continue;

    // Puede quedar un conector suelto al final ("...flores el" →
    // "...flores"): se saca, que ese sí es siempre parte de la fecha
    // que se acaba de separar, nunca del título.
    const titulo = palabras.slice(0, -n).join(' ')
      .replace(/\s+(?:el|la|del|de|para)$/i, '');

    return { titulo: titulo, fecha: fecha };
  }

  return null;
}

/**
 * Prueba los patrones de entidad. Si alguno matchea, resuelve la
 * entidad contra los datos reales y pinta el resultado — confirmación
 * para lo que escribe, directo para lo que solo lee.
 *
 * @param {string} texto - Lo que escribió la persona, tal cual.
 * @param {Element} resultado - Dónde pintar.
 * @returns {Promise<boolean>} true si algún patrón se hizo cargo.
 */
async function intentarConEntidad(texto, resultado) {
  const entrada = texto.trim();

  for (const patron of PATRONES_DE_ENTIDAD) {
    const m = entrada.match(patron.regex);
    if (!m) continue;

    const resto = m[1].trim();
    resultado.innerHTML = '<p class="vacio__texto">Buscando…</p>';

    if (patron.tipo === 'pago') {
      const opciones = await buscarPagoPendienteParaElAsistente(resto);
      mostrarOpcionesDeEntidad(resultado, opciones, o => o.nombre, pago => {
        resultado.innerHTML =
          '<p style="margin-bottom:var(--esp-2)">¿Marcar pagado <strong>' +
            seguro(pago.nombre) + '</strong>, ' + seguro(comoDinero(pago.monto, false)) + '?' +
          '</p>' +
          '<div class="acciones">' +
            '<button class="boton" id="entidad-cancelar">Cancelar</button>' +
            '<button class="boton boton--principal" id="entidad-confirmar">Marcar pagado</button>' +
          '</div>';

        buscar('#entidad-cancelar', resultado).addEventListener('click', () => { resultado.innerHTML = ''; });
        buscar('#entidad-confirmar', resultado).addEventListener('click', async () => {
          try {
            await mandar('presupuesto.php?accion=marcar_pagado', { id: pago.id });
            cerrarHoja(true);
            avisar('Marcado como pagado: ' + pago.nombre);
            ensuciarVistas('resumen', 'dinero');
          } catch (error) {
            avisar(error.message, true);
          }
        });
      });
      return true;
    }

    if (patron.tipo === 'buscar') {
      const opciones = await buscarInvitadoParaElAsistente(resto);
      // Solo lee: no hace falta confirmar nada, se abre directo.
      mostrarOpcionesDeEntidad(resultado, opciones, o => o.nombre, inv => {
        cerrarHoja(true);
        abrirDetalleDeInvitado(inv.id);
      });
      return true;
    }

    if (patron.tipo === 'sentar') {
      // m[1] es siempre el nombre; m[2] (Fase B) es la mesa SI se dijo
      // "en la mesa N" — si no, sigue undefined y se comporta como antes.
      const nombreBuscado = m[1].trim();
      const mesaBuscada = m[2] ? m[2].trim() : '';
      const opciones = await buscarParaSentarParaElAsistente(nombreBuscado);

      if (!mesaBuscada) {
        // Sin mesa explícita: la computadora propone, la persona decide
        // — mismo camino que ya existe, no hace falta confirmación
        // aparte acá porque elegirMesaPara() ya la pide por su cuenta.
        mostrarOpcionesDeEntidad(resultado, opciones, o => o.nombre, inv => {
          cerrarHoja(true);
          elegirMesaPara(inv.id, () => {
            ensuciarVistas('resumen', 'evento', 'invitados');
            if (VISTA_ACTUAL === 'invitados') dibujarGente();
          });
        });
        return true;
      }

      // Con mesa explícita ("en la mesa 5"): esto SÍ escribe directo,
      // sin pasar por el selector de siempre — por eso acá adentro hace
      // falta su propia confirmación antes de mandar mesas.php?accion=
      // sentar (el mismo endpoint que ya usa 08-vista-invitados.js).
      mostrarOpcionesDeEntidad(resultado, opciones, o => o.nombre, async inv => {
        const mesas = await datosDeMesasParaElAsistente();
        const mesaEncontrada = (mesas && mesas.mesas || []).find(m2 =>
          paraBuscar(m2.nombre).includes(paraBuscar(mesaBuscada)));

        if (!mesaEncontrada) {
          resultado.innerHTML =
            '<p class="aviso-error">No encontré una mesa que coincida con "' +
              seguro(mesaBuscada) + '".</p>' +
            '<div class="acciones">' +
              '<button class="boton boton--principal" id="entidad-abrir-selector">' +
                'Elegir mesa a mano</button>' +
            '</div>';
          buscar('#entidad-abrir-selector', resultado).addEventListener('click', () => {
            cerrarHoja(true);
            elegirMesaPara(inv.id, () => {
              ensuciarVistas('resumen', 'evento', 'invitados');
              if (VISTA_ACTUAL === 'invitados') dibujarGente();
            });
          });
          return;
        }

        resultado.innerHTML =
          '<p style="margin-bottom:var(--esp-2)">¿Sentar a <strong>' + seguro(inv.nombre) +
            '</strong> en <strong>' + seguro(mesaEncontrada.nombre) + '</strong>?</p>' +
          '<div class="acciones">' +
            '<button class="boton" id="entidad-cancelar">Cancelar</button>' +
            '<button class="boton boton--principal" id="entidad-confirmar">Sentar</button>' +
          '</div>';

        buscar('#entidad-cancelar', resultado).addEventListener('click', () => { resultado.innerHTML = ''; });
        buscar('#entidad-confirmar', resultado).addEventListener('click', async () => {
          try {
            await mandar('mesas.php?accion=sentar',
              { confirmacion_id: inv.id, mesa_id: mesaEncontrada.id });
            cerrarHoja(true);
            avisar('Sentado en ' + mesaEncontrada.nombre + '.');
            ensuciarVistas('resumen', 'evento', 'invitados');
            if (VISTA_ACTUAL === 'invitados') dibujarGente();
          } catch (error) {
            avisar(error.message, true);
          }
        });
      });
      return true;
    }

    if (patron.tipo === 'tarea') {
      // Primero "para <fecha>", que es lo explícito de siempre. Si no
      // está (Fase B), se prueba si el final de la frase YA ES una
      // fecha por su cuenta ("...llamar al DJ mañana"), sin la palabra
      // "para" — separarFechaSueltaDeTarea() prueba de más palabras a
      // menos para no cortar "en 3 dias" por la mitad.
      const conFecha = resto.match(/^(.*?)\s+para\s+(.+)$/i);
      let titulo, fecha;

      if (conFecha) {
        titulo = conFecha[1].trim();
        fecha  = interpretarFechaParaElAsistente(conFecha[2]);
      } else {
        const suelta = separarFechaSueltaDeTarea(resto);
        titulo = suelta ? suelta.titulo : resto.trim();
        fecha  = suelta ? suelta.fecha : null;
      }

      if (!titulo) {
        resultado.innerHTML = '<p class="aviso-error">Dime qué tarea, además de la fecha.</p>';
        return true;
      }

      cerrarHoja(true);
      // Sin id: formularioTarea() lo trata como alta, no como edición
      // (ver el arreglo en 10-planificador.js).
      formularioTarea({ titulo: titulo, fecha_limite: fecha || '' });
      return true;
    }
  }

  return false;
}

/**
 * Cero, una, o varias opciones encontradas — el mismo patrón para
 * cualquier tipo de entidad: si hay una sola, se resuelve sola; si hay
 * varias, se listan para elegir; si no hay ninguna, se avisa.
 *
 * @param {Element} resultado
 * @param {Array} opciones
 * @param {Function} etiqueta - opción → texto a mostrar.
 * @param {Function} alElegir - Qué hacer con la opción elegida.
 * @returns {void}
 */
function mostrarOpcionesDeEntidad(resultado, opciones, etiqueta, alElegir) {
  if (!opciones.length) {
    resultado.innerHTML = '<p class="aviso-error">No encontré nada con eso.</p>';
    return;
  }

  if (opciones.length === 1) {
    alElegir(opciones[0]);
    return;
  }

  resultado.innerHTML =
    '<p class="vacio__texto" style="margin-bottom:var(--esp-1)">¿Cuál de estas?</p>' +
    opciones.slice(0, 6).map((o, i) =>
      '<button class="lista__fila" data-entidad-opcion="' + i + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(etiqueta(o)) + '</span>' +
        '</span>' +
      '</button>'
    ).join('');

  buscarTodos('[data-entidad-opcion]', resultado).forEach(boton => {
    boton.addEventListener('click', () => alElegir(opciones[Number(boton.dataset.entidadOpcion)]));
  });
}


/* ─── 4. MEGABOT — EL CHAT (2026-08-30) ─────────────────────────────
   Reemplaza el cuerpo de abrirAsistente() de arriba (que comparaba lo
   escrito contra FRASES_DE_FABRICA/aprendidas y ejecutaba directo).
   Las funciones de las secciones 2 y 3 (aprendizaje, motor de
   coincidencia, intentarConEntidad) QUEDAN en el archivo sin usar
   desde acá, a propósito — es el camino de rollback si hiciera falta
   volver atrás. `abrirComandosDelAsistente()` (sección 5, más abajo)
   sigue abriendo el matcher de frases viejo, para quien lo use desde
   el menú de Ajustes.

   El "cerebro" de MegaBot vive AFUERA de este repo (un Orquestador,
   equipo Cursor) — este archivo solo dibuja el hilo, manda lo que
   Lucila escribe a chat.php, y hace polling cada 2s mientras la hoja
   está abierta para ver las respuestas nuevas sin recargar. */

/** La whitelist de acciones que una propuesta de MegaBot puede pedir
    ejecutar — MISMA LISTA que ACCIONES_PERMITIDAS_PARA_MEGABOT en
    admin/api/chat.php. Si se cambia una, hay que cambiar la otra. */
const ACCIONES_PERMITIDAS_PARA_MEGABOT = [
  'presupuesto.php?accion=marcar_pagado',
  'mesas.php?accion=sentar_auto',
  'mesas.php?accion=autoasignar',
  'mesas.php?accion=deshacer',
  'planificador.php?accion=estado_tarea',
  // La única que mueve dinero. Ver la nota en chat.php: proponer no
  // cobra; el cobro sale del botón Confirmar de acá abajo.
  'compras.php?accion=cobrar',

  /* Deja la compra anotada sin cobrar. `confirmar` NO está y no puede
     estar: es la que dispara el cobro de una propuesta, y eso lo hace
     una persona. Ver la nota larga en chat.php. */
  'compras.php?accion=proponer',
];

/** El id del último mensaje ya pintado, para pedir solo los nuevos. */
let MEGABOT_ULTIMO_ID = 0;
/** El temporizador de polling activo, o null si está apagado. */
let MEGABOT_INTERVALO = null;

/**
 * Cuántas veces se abrió el chat en esta sesión.
 *
 * Cada apertura crea su propia closure de polling, con su propio `hilo`.
 * Si se cierra y se reabre rápido, la closure vieja puede despertar
 * DESPUÉS de que la nueva ya arrancó, y sin forma de distinguirse
 * apagaba el poll de la nueva dejando el chat mudo. Comparando su
 * número contra este, la vieja sabe que ya no manda.
 */
let MEGABOT_GENERACION = 0;

/**
 * Le avisa al polling que hay una respuesta en camino, para que vuelva
 * al ritmo rápido. La define abrirMegaBot() mientras la hoja vive; en
 * null significa que no hay chat abierto.
 *
 * Existe porque el poll adaptativo se apaga solo tras un rato en
 * silencio (ver la nota grande allá abajo): sin esta señal, escribir
 * después de cinco minutos quietos dejaría el mensaje mandado y el hilo
 * mudo hasta reabrir la hoja.
 */
let MEGABOT_ESPERAR_RESPUESTA = null;

/**
 * Qué pantallas hay que refrescar después de que una propuesta de
 * MegaBot se ejecutó — mismo criterio que ya usan las pantallas reales
 * al llamar a esa misma acción a mano.
 *
 * @param {string} accion
 * @returns {string[]}
 */
function vistasParaEnsuciarPorAccion(accion) {
  if (accion.startsWith('presupuesto.php')) return ['resumen', 'dinero'];
  if (accion.startsWith('mesas.php'))       return ['resumen', 'evento', 'invitados'];
  if (accion.startsWith('planificador.php')) return ['resumen', 'evento'];
  // Una compra cobrada cambia lo gastado, así que Dinero queda viejo.
  if (accion.startsWith('compras.php'))     return ['resumen', 'dinero'];
  return ['resumen'];
}

/** Cuánto de la pregunta citada se muestra antes de cortar. */
const LARGO_DE_CITA_MEGABOT = 80;

/**
 * El encabezado "En respuesta a: …" de una burbuja que contesta algo
 * que NO es el mensaje justo anterior.
 *
 * ⚡ POR QUÉ EXISTE (2026-09-04)
 * La cadena de agentes trabaja con cola, y cuando la cola trae atraso
 * una respuesta puede llegar tanto después que ya se olvidó qué se
 * preguntó. Pasó: llegó una contestando algo pedido hacía rato, y el
 * panel la pintó al final del hilo, debajo de cuatro mensajes
 * distintos, sin nada que la conectara con su pregunta.
 *
 * Solo se cita cuando hace falta. Si la respuesta viene pegada a su
 * pregunta —el caso normal— citarla es ruido: se ve igual mirando la
 * burbuja de arriba.
 *
 * @param {Object} m - La fila que se está por pintar.
 * @param {Element} hilo - El contenedor, para buscar la pregunta.
 * @returns {string} HTML, o '' si no hay nada que citar.
 */
function htmlDeCitaDeMegaBot(m, hilo) {
  if (!hilo || !m.en_respuesta_a) return '';

  const citada = hilo.querySelector('[data-mensaje-id="' + m.en_respuesta_a + '"]');
  // La pregunta no está en pantalla (hilo recortado, o id de otra
  // sesión): no se inventa un texto que no se tiene.
  if (!citada) return '';

  // Es la de justo arriba: se ve sola, citarla sobra.
  const filas = hilo.querySelectorAll('[data-mensaje-id]');
  if (filas.length && filas[filas.length - 1] === citada) return '';

  const texto = citada.dataset.mensajeTexto || '';
  if (!texto) return '';

  const corto = texto.length > LARGO_DE_CITA_MEGABOT
    ? texto.slice(0, LARGO_DE_CITA_MEGABOT).trimEnd() + '…'
    : texto;

  return '<div class="megabot-cita">En respuesta a: «' + seguro(corto) + '»</div>';
}

/**
 * El HTML de una burbuja, según quién habla.
 *
 * ⚡ MEGABOT Y FAB NO SON LO MISMO (2026-09-04)
 * Las respuestas que resuelve el teléfono (resolverMegaBotOffline y sus
 * tres vías) se pintaban con `rol: 'megabot'`, idénticas a las del
 * servicio en línea: misma burbuja, mismo estilo, ningún distintivo. Y
 * eso se dispara solo —webhook que no acepta en 3 s, o MegaBot en
 * reposo tras un fallo— así que era invisible desde afuera.
 *
 * No es un detalle de etiqueta: FAB contesta con lo que hay en el
 * teléfono y no tiene detrás la cuota de GrokBot. Creer que una
 * respuesta suya vino de MegaBot es confiar en algo que nunca miró los
 * datos que uno supone.
 *
 * @param {Object} m - Fila de chat_mensajes, con `propuestas` adjuntas.
 *                     `origen: 'fab'` marca las que resolvió el teléfono.
 * @param {Element} [hilo] - Para resolver la cita de `en_respuesta_a`.
 * @returns {string}
 */
function htmlDeBurbujaMegaBot(m, hilo) {
  const esLucila = m.rol === 'lucila';
  const esSistema = m.rol === 'sistema';
  const esFab = m.origen === 'fab';

  /* El rótulo va solo en las respuestas: las de Lucila son suyas y no
     hace falta decírselo, y las de sistema no las firma nadie. */
  const autor = (!esLucila && !esSistema)
    ? '<div class="megabot-autor' + (esFab ? ' megabot-autor--fab' : '') + '">' +
        (esFab ? 'FAB · desde este teléfono' : 'MegaBot') +
      '</div>'
    : '';

  return '' +
    /* El texto viaja también en un atributo. Sirve para dos cosas:
       "Reintentar" lo leía del `firstChild.textContent` de la burbuja
       —cualquier cambio en cómo se arma la dejaba reenviando una cadena
       vacía, en silencio— y ahora además es la clave con la que una
       burbuja optimista se reconcilia con su fila real (ver
       burbujaOptimistaConEsteTexto).

       `data-optimista` marca la que todavía espera su id de la base. Se
       borra al adoptarlo, así que una burbuja ya reconciliada nunca se
       vuelve a tomar por otra. */
    '<div class="megabot-fila megabot-fila--' + m.rol + (esFab ? ' megabot-fila--fab' : '') +
         '" data-mensaje-id="' + seguro(m.id) + '"' +
         ' data-mensaje-texto="' + seguro(m.texto) + '"' +
         (m.optimista ? ' data-optimista="1"' : '') + '>' +
      htmlDeCitaDeMegaBot(m, hilo) +
      autor +
      '<div class="megabot-burbuja megabot-burbuja--' + m.rol +
           (esFab ? ' megabot-burbuja--fab' : '') + '">' +
        seguro(m.texto) +
        (m.estado === 'error'
          ? '<div class="megabot-burbuja__error">No se pudo mandar. ' +
            '<button type="button" data-megabot-reenviar="' + seguro(m.id) + '">Reintentar</button></div>'
          : '') +
      '</div>' +
      (!esLucila && !esSistema && m.propuestas && m.propuestas.length
        ? m.propuestas.map(p => htmlDePropuestaMegaBot(p)).join('')
        : '') +
      htmlDeTiemposDeMegaBot(m) +
    '</div>';
}

/**
 * El desglose de cuánto tardó cada salto, plegado.
 *
 * SOLO LO VE LA CUENTA OBSERVADORA, y no porque lo decida este archivo:
 * el servidor manda `latencia` únicamente a esa cuenta (ver `case
 * 'listar'` en chat.php). Acá no hay ninguna comprobación de permisos
 * que se pueda saltar desde el navegador — si el campo no viene, no hay
 * nada que pintar. Es el mismo criterio que el bloque técnico de pagos.
 *
 * ⚠️ Los tramos que llegan ya vienen filtrados por deltasDeLatencia():
 * ahí se descartan los que cruzarían dos relojes distintos. Acá no se
 * resta nada, solo se muestra lo que el servidor pudo afirmar.
 *
 * @param {Object} m
 * @returns {string}
 */
function htmlDeTiemposDeMegaBot(m) {
  const tramos = m.latencia && m.latencia.tramos;
  if (!tramos) return '';

  const NOMBRES = {
    enviar_a_webhook:    'Salir hacia MegaBot',
    webhook_a_responder: 'MegaBot piensa y contesta',
    megabot_interno:     'Sus saltos internos',
    total_servidor:      'Total',
  };

  const filas = Object.keys(NOMBRES)
    .filter(clave => typeof tramos[clave] === 'number')
    .map(clave =>
      '<div class="megabot-tiempos__fila">' +
        '<span>' + seguro(NOMBRES[clave]) + '</span>' +
        '<span>' + seguro(msEnPalabras(tramos[clave])) + '</span>' +
      '</div>');

  if (!filas.length) return '';

  return '<details class="megabot-tiempos">' +
      '<summary>Tiempos</summary>' + filas.join('') +
    '</details>';
}

/**
 * Milisegundos en algo legible de un vistazo.
 *
 * @param {number} ms
 * @returns {string}
 */
function msEnPalabras(ms) {
  if (ms < 1000) return ms + ' ms';
  if (ms < 60000) return (ms / 1000).toFixed(1).replace('.', ',') + ' s';
  return Math.floor(ms / 60000) + ' min ' + Math.round((ms % 60000) / 1000) + ' s';
}

/** Texto de cada estado final de una propuesta, para no dejarla muda. */
const TEXTO_DE_ESTADO_PROPUESTA = {
  ejecutada: 'Hecho.',
  rechazada: 'Descartado.',
  fallida:   'No se pudo hacer.',
};

/**
 * El HTML de UNA propuesta dentro de una burbuja de MegaBot. Si su
 * acción no está en la whitelist, no se pinta ningún botón — "acción
 * fuera de whitelist: no hay botón", tal como lo pide el contrato.
 *
 * @param {Object} p - Fila de chat_propuestas.
 * @returns {string}
 */
function htmlDePropuestaMegaBot(p) {
  if (p.estado !== 'abierta') {
    return '<div class="megabot-propuesta megabot-propuesta--resuelta" data-propuesta-id="' + seguro(p.id) + '">' +
      '<div class="megabot-propuesta__titulo">' + seguro(p.titulo) + '</div>' +
      '<div class="vacio__texto">' + seguro(TEXTO_DE_ESTADO_PROPUESTA[p.estado] || p.estado) + '</div>' +
    '</div>';
  }

  if (!ACCIONES_PERMITIDAS_PARA_MEGABOT.includes(p.accion)) {
    return '';
  }

  return '' +
    '<div class="megabot-propuesta" data-propuesta-id="' + seguro(p.id) + '">' +
      '<div class="megabot-propuesta__titulo">' + seguro(p.titulo) + '</div>' +
      (p.detalle ? '<div class="vacio__texto" style="margin:2px 0 6px">' + seguro(p.detalle) + '</div>' : '') +
      '<div class="acciones">' +
        '<button class="boton boton--chico" data-propuesta-cancelar="' + seguro(p.id) + '">Cancelar</button>' +
        '<button class="boton boton--chico boton--principal" data-propuesta-confirmar="' + seguro(p.id) + '">' +
          'Confirmar</button>' +
      '</div>' +
    '</div>';
}

/**
 * Engancha los botones de reenviar y de propuestas de TODO el hilo, por
 * delegación en el contenedor — así sirve para las burbujas ya
 * pintadas y para las que llegan después por polling, sin re-enganchar
 * cada vez.
 *
 * @param {Element} hilo
 * @returns {void}
 */
function engancharHiloDeMegaBot(hilo) {
  if (hilo.dataset.megabotEnganchado) return;
  hilo.dataset.megabotEnganchado = '1';

  hilo.addEventListener('click', async evento => {
    const botonReenviar = evento.target.closest('[data-megabot-reenviar]');
    if (botonReenviar) {
      // El texto original vive en la fila de Lucila, en un atributo
      // propio — hace falta para resolverMegaBotOffline() si esto sigue
      // sin señal.
      const filaOriginal = botonReenviar.closest('[data-mensaje-id]');
      const textoOriginal = (filaOriginal && filaOriginal.dataset.mensajeTexto) || '';

      try {
        const r = await mandarSinCola('chat.php?accion=reenviar',
          { mensaje_id: Number(botonReenviar.dataset.megabotReenviar) });

        /* Las DOS formas de "no llegó": `offline` lo manda chat.php
           cuando el servidor sí contestó pero MegaBot no, y `_offline`
           lo pone pedir() cuando no se llegó ni al servidor. Mirando
           solo la primera, un reintento sin señal caía en el `else` y
           decía "Reenviado." — la palabra exactamente contraria a lo
           que había pasado. */
        if (r && (r.offline || r._offline)) {
          await resolverMegaBotOffline(hilo, textoOriginal);
        } else {
          avisar('Reenviado.');
        }
      } catch (error) {
        avisar(error.message, true);
        await resolverMegaBotOffline(hilo, textoOriginal);
      }
      return;
    }

    const botonCancelar = evento.target.closest('[data-propuesta-cancelar]');
    if (botonCancelar) {
      const id = Number(botonCancelar.dataset.propuestaCancelar);
      const tarjeta = botonCancelar.closest('[data-propuesta-id]');
      try {
        await mandar('chat.php?accion=propuesta_estado', { id: id, estado: 'rechazada' });
        if (tarjeta) {
          tarjeta.className = 'megabot-propuesta megabot-propuesta--resuelta';
          tarjeta.innerHTML = tarjeta.querySelector('.megabot-propuesta__titulo').outerHTML +
            '<div class="vacio__texto">Descartado.</div>';
        }
      } catch (error) {
        avisar(error.message, true);
      }
      return;
    }

    const botonConfirmar = evento.target.closest('[data-propuesta-confirmar]');
    if (botonConfirmar) {
      const tarjeta = botonConfirmar.closest('[data-propuesta-id]');
      const id = Number(botonConfirmar.dataset.propuestaConfirmar);
      const filaPropuesta = ESTADO_PROPUESTAS_MEGABOT[id];
      if (!filaPropuesta) return;

      /* ⚡ UNA PROPUESTA QUE NO SE PUEDE HACER LO DICE (2026-09-03).
         Acá se hacía `return` a secas cuando la acción no estaba en la
         whitelist: el botón quedaba ahí, tocarlo no hacía absolutamente
         nada, y la burbuja seguía diciendo "voy a hacer X". Ahora se
         dice la verdad y se anota el estado `fallida`, que existe en la
         base desde el principio y nadie escribía nunca. */
      if (!ACCIONES_PERMITIDAS_PARA_MEGABOT.includes(filaPropuesta.accion)) {
        marcarPropuestaFallida(tarjeta, id, 'Esto no lo puedo hacer desde aquí.');
        return;
      }

      /* ⚡ AUTOASIGNAR PASA POR LA VISTA PREVIA REAL (2026-09-03).
         Es la única acción de la whitelist que MUEVE gente ya sentada, y
         lo único que se veía antes de aceptarla era el texto que había
         redactado el modelo — que el panel no verifica contra nada. Una
         propuesta que dijera "acomodo a los que faltan" podía en
         realidad mudar a treinta personas que ya estaban ubicadas a
         mano. mesas.php?accion=vista_previa dice qué va a pasar de
         verdad, y es la misma que el agente de mesas ya usa. */
      if (filaPropuesta.accion.indexOf('autoasignar') !== -1) {
        if (!await confirmarAcomodoConVistaPrevia()) return;
      }

      botonConfirmar.disabled = true;
      try {
        const cuerpo = JSON.parse(filaPropuesta.cuerpo_json || '{}');

        /* ⚡ COBRAR PUEDE PEDIR LA CONTRASEÑA (2026-09-05)
           Es la única acción de la whitelist que saca dinero, y este
           botón es uno de sus dos caminos. Lo que autoriza la compra es
           este Confirmar; la contraseña es la capa de abajo, y el
           servidor decide si hace falta —vale un rato, así que cinco
           compras seguidas no la piden cinco veces (ver compras.php)—.
           Por eso se manda y solo si la exige se pregunta. */
        if (filaPropuesta.accion.indexOf('compras.php') !== -1) {
          const hecho = await mandarTocandoDinero(filaPropuesta.accion, cuerpo,
            'Esta propuesta va a cobrar a la tarjeta del evento.');
          // Si el cobro salió pero el aviso no, hay que decirlo.
          contarComoSalioElAviso(hecho && hecho.aviso);
        } else {
          await mandar(filaPropuesta.accion, cuerpo);
        }
        await mandar('chat.php?accion=propuesta_estado', { id: id, estado: 'aceptada' });
        ensuciarVistas.apply(null, vistasParaEnsuciarPorAccion(filaPropuesta.accion));
        if (tarjeta) {
          tarjeta.className = 'megabot-propuesta megabot-propuesta--resuelta';
          tarjeta.innerHTML = tarjeta.querySelector('.megabot-propuesta__titulo').outerHTML +
            '<div class="vacio__texto">Hecho.</div>';
        }
      } catch (error) {
        botonConfirmar.disabled = false;
        /* codigo 0 = cerró la ventana de la contraseña. La propuesta
           queda como estaba, lista para confirmarla cuando quiera: no es
           un fallo del que haya que avisar. */
        if (error && error.codigo !== 0) avisar(error.message, true);
      }
      return;
    }
  });
}

/**
 * Pregunta por el acomodo automático diciendo qué va a pasar de verdad.
 *
 * POR QUÉ NO ALCANZA CON EL TEXTO DE LA PROPUESTA
 * El título y el detalle de una propuesta de MegaBot los redacta el
 * modelo, y el panel no los verifica contra nada. `autoasignar` es la
 * única acción de la whitelist que mueve gente YA SENTADA: aceptar eso
 * confiando en una frase generada es exactamente lo que este plan
 * intenta sacar de la app. La vista previa la calcula el servidor con
 * el mismo repartidor que va a correr después, así que dice lo que va
 * a pasar, no lo que alguien cree que va a pasar.
 *
 * Si la vista previa falla, se pregunta igual pero diciendo que no se
 * pudo calcular: es peor bloquear una acción legítima que preguntar sin
 * el detalle.
 *
 * @returns {Promise<boolean>}
 */
async function confirmarAcomodoConVistaPrevia() {
  let vista = null;
  try {
    vista = await mandar('mesas.php?accion=vista_previa', {});
  } catch (error) {
    vista = null;
  }

  if (!vista || vista.ok === false) {
    return confirmarAccion(
      '¿Acomodar automáticamente?\n\n' +
      'No pude calcular de antemano a quién mueve. Lo que ya fijaste con ' +
      'candado no se toca, y podrás volver atrás desde Reglas → Volver al ' +
      'acomodo anterior.',
      { confirmar: 'Acomodar', peligro: true });
  }

  const movimientos = vista.movimientos || [];
  const sentados = movimientos.filter(m => m.que_pasa === 'se_sienta').length;
  const mudados  = movimientos.filter(m => m.que_pasa === 'se_muda').length;
  const sinLugar = (vista.sin_lugar || []).length;

  const detalle =
    'Se sientan ' + pluralizar(sentados, 'persona', 'personas') + '.' +
    (mudados
      ? '\nSe MUDAN ' + pluralizar(mudados, 'persona', 'personas') +
        ' que ya estaban sentadas.'
      : '') +
    (sinLugar
      ? '\nQuedan sin lugar ' + pluralizar(sinLugar, 'persona', 'personas') + '.'
      : '') +
    '\n\nLo que fijaste con candado no se toca, y puedes volver atrás ' +
    'desde Reglas → Volver al acomodo anterior.';

  return confirmarAccion('¿Acomodar automáticamente?\n\n' + detalle,
    { confirmar: 'Acomodar', peligro: mudados > 0 });
}

/**
 * Pinta la burbuja de "está escribiendo" al final del hilo.
 *
 * Una sola a la vez: si se manda otro mensaje antes de que llegue la
 * respuesta del anterior, se reusa la que ya está en vez de apilar dos.
 *
 * @param {Element} hilo
 * @returns {void}
 */
/* ⚡ EL TOPE ERA MÁS CORTO QUE LA ESPERA NORMAL (2026-09-04)
 *
 * Eran 90 s, y una respuesta tarda ~68 s con la cola vacía y bastante
 * más cuando trae atraso. O sea que el aviso de "esto ya no viene"
 * saltaba ANTES que la respuesta, casi siempre: no era un tope, era un
 * falso negativo en cada mensaje. 210 s deja margen sobre la espera
 * real medida sin volverse eterno. */
const TOPE_DE_ESPERA_MEGABOT_MS = 210000;

/** Qué decir mientras se espera, según qué pasó al entregar. */
const NOTA_DE_ENTREGA_MEGABOT = {
  /* El servidor contesta antes de hablar con MegaBot, así que hay un
     instante en que todavía no se sabe si aceptó. Dura menos de un
     segundo: el long-poll trae el estado real enseguida. Ver el bloque
     del webhook en chat.php. */
  enviando:  'Entregando…',
  enviado:   'Entregado · esperando respuesta',
  error:     'No se pudo entregar a MegaBot',
  pendiente: 'MegaBot no responde desde hace un rato',
};

/**
 * Cuánto lleva esperando, en palabras cortas.
 *
 * ⚡ POR QUÉ HAY UN CRONÓMETRO A LA VISTA (2026-09-06)
 * La respuesta tarda decenas de segundos y no hay forma de acortarlas
 * desde acá: los saltos entre agentes viven fuera de esta app. Pero una
 * espera muda no se distingue de algo colgado, y esa duda es justo lo
 * que lleva a volver a escribir —que suma otro turno a la cola y hace
 * la espera MÁS larga—. Un número que avanza dice "esto sigue vivo" sin
 * prometer nada que no se pueda cumplir.
 *
 * @param {number} desdeMs
 * @returns {string}
 */
function esperaDeMegaBotEnPalabras(desdeMs) {
  const s = Math.max(0, Math.round((Date.now() - desdeMs) / 1000));
  if (s < 60) return s + ' s';

  const m = Math.floor(s / 60);
  const resto = s % 60;
  return resto ? m + ' min ' + resto + ' s' : m + ' min';
}

/** Y qué decir cuando se agotó la espera, para cada caso. */
const NOTA_DE_ESPERA_AGOTADA_MEGABOT = {
  enviado:   'Tu mensaje sí llegó a MegaBot y todavía no hay respuesta. ' +
             'Puede seguir tardando: mandarlo otra vez no lo apura.',
  error:     'No se pudo entregar a MegaBot. El mensaje quedó guardado, ' +
             'y puedes reintentarlo cuando quieras.',
  pendiente: 'No se intentó entregar: MegaBot venía fallando. Se vuelve a ' +
             'probar solo en un rato.',
};

/**
 * Repinta la burbuja de espera con lo que se sabe en este momento:
 * cuántas preguntas hay en cola, qué pasó al entregar, y si ya se agotó
 * el tope de espera.
 *
 * @param {Element} fila - La fila `.megabot-escribiendo`.
 * @returns {void}
 */
function repintarEsperaDeMegaBot(fila) {
  if (!fila) return;

  const enCola  = Number(fila.dataset.enCola || '1');
  const entrega = fila.dataset.entrega || '';
  const agotada = fila.dataset.agotado === '1';

  const notas = [];

  /* ⚡ EL DOBLE ENVÍO NO APURA: ALARGA (2026-09-04)
     Sin nada que mirar durante un minuto, lo natural es volver a
     mandar — y cada reenvío suma un turno entero a la cola de agentes.
     Pasó: cuatro envíos del mismo pedido dieron UNA respuesta, más
     tarde. No se bloquea nada; se dice lo que cuesta. */
  if (enCola > 1) {
    notas.push(enCola + ' preguntas en cola · cada una retrasa a la anterior');
  }
  if (!agotada && NOTA_DE_ENTREGA_MEGABOT[entrega]) {
    notas.push(NOTA_DE_ENTREGA_MEGABOT[entrega]);
  }

  /* El tiempo va SIEMPRE, incluso con la espera agotada: ahí es cuando
     más importa saber si lleva un minuto o quince. Solo se omite si la
     fila no trae marca de cuándo empezó (una burbuja de antes de esta
     versión, que sigue en pantalla tras recargar el código). */
  const desde = Number(fila.dataset.desde || '0');
  if (desde > 0) notas.push(esperaDeMegaBotEnPalabras(desde));

  const cuerpo = agotada
    ? '<div class="megabot-burbuja megabot-burbuja--megabot">' +
        seguro(NOTA_DE_ESPERA_AGOTADA_MEGABOT[entrega] ||
               'Todavía no llega respuesta. El mensaje quedó mandado.') +
      '</div>'
    : '<div class="megabot-burbuja megabot-burbuja--megabot megabot-puntitos" ' +
           'role="status" aria-label="MegaBot está escribiendo">' +
        '<span></span><span></span><span></span>' +
      '</div>';

  fila.innerHTML =
    '<div class="megabot-autor">MegaBot</div>' +
    cuerpo +
    (notas.length
      ? '<div class="megabot-espera__nota">' + seguro(notas.join(' · ')) + '</div>'
      : '');
}

/**
 * Pinta la burbuja de "está escribiendo" al final del hilo.
 *
 * Una sola a la vez: si se manda otro mensaje antes de que llegue la
 * respuesta del anterior, se reusa la que ya está en vez de apilar dos.
 *
 * @param {Element} hilo
 * @returns {void}
 */
function mostrarEscribiendoDeMegaBot(hilo) {
  if (!hilo) return;

  /* Ya hay una espera en curso: este mensaje entra detrás. Antes esto
     no se notaba porque el tope de abajo le quitaba la clase a la fila
     vieja, así que dejaba de reconocerse y se apilaba otra burbuja —de
     ahí las cuatro "está tardando" una debajo de la otra. */
  const enCurso = hilo.querySelector('.megabot-escribiendo');
  if (enCurso) {
    enCurso.dataset.enCola = String(Number(enCurso.dataset.enCola || '1') + 1);
    delete enCurso.dataset.agotado;   // hay algo nuevo en camino
    repintarEsperaDeMegaBot(enCurso);
    hilo.scrollTop = hilo.scrollHeight;
    return;
  }

  const fila = document.createElement('div');
  fila.className = 'megabot-fila megabot-fila--megabot megabot-escribiendo';
  fila.dataset.enCola = '1';
  fila.dataset.desde = String(Date.now());
  repintarEsperaDeMegaBot(fila);

  hilo.appendChild(fila);
  hilo.scrollTop = hilo.scrollHeight;

  /* El cronómetro de la espera. Cada segundo sería ruido visual y
     trabajo de más; cada cinco alcanza para que se vea avanzar.

     Se apaga solo cuando la fila deja el DOM —la respuesta llegó y
     quitarEscribiendoDeMegaBot() la retiró—, así que no hace falta
     recordar el id en ningún lado ni limpiarlo desde afuera. Es la
     misma forma en que se apaga el reloj del contador de uso. */
  const reloj = setInterval(() => {
    if (!document.body.contains(fila)) { clearInterval(reloj); return; }
    repintarEsperaDeMegaBot(fila);
  }, 5000);

  /* ⚡ LA CLASE NO SE QUITA (2026-09-04)
   *
   * Acá se hacía `fila.classList.remove('megabot-escribiendo')`, y esa
   * es exactamente la clase que quitarEscribiendoDeMegaBot() busca para
   * retirar la fila. O sea que al rendirse, el aviso quedaba clavado en
   * el hilo PARA SIEMPRE: la respuesta real aparecía debajo de un
   * cartel que decía que algo había fallado, y no había forma de
   * sacarlo. Ahora solo se marca `agotado` y se repinta: la fila sigue
   * siendo retirable cuando la respuesta llegue, tarde lo que tarde. */
  setTimeout(() => {
    if (!document.body.contains(fila)) return;
    fila.dataset.agotado = '1';
    repintarEsperaDeMegaBot(fila);
  }, TOPE_DE_ESPERA_MEGABOT_MS);
}

/**
 * Pinta la línea de "quién está atendiendo" arriba del hilo.
 *
 * Solo dice algo cuando hay algo que decir: con MegaBot en pie, el
 * rótulo de cada burbuja ya lo aclara y una línea fija repitiéndolo
 * sería ruido. Cuando MegaBot está caído sí importa, porque explica de
 * antemano por qué las respuestas van a venir de otro lado.
 *
 * @param {boolean|undefined} vivo - Lo que dice el servidor.
 * @returns {void}
 */
function pintarQuienAtiendeMegaBot(vivo) {
  const caja = document.getElementById('megabot-quien');
  if (!caja) return;

  // `undefined` es "el servidor no lo dijo": no se afirma nada.
  if (vivo !== false) {
    caja.textContent = '';
    caja.hidden = true;
    return;
  }

  caja.textContent = 'MegaBot no está respondiendo. Te contesta FAB, ' +
                     'con lo que hay en este teléfono.';
  caja.hidden = false;
}

/**
 * Anota en la burbuja de espera qué pasó al intentar entregar el
 * mensaje, para que la espera deje de ser muda.
 *
 * ⚡ POR QUÉ (2026-09-04)
 * Los tres casos se veían idénticos desde acá: el webhook aceptó y
 * MegaBot está pensando, el webhook no aceptó, o ni se intentó porque
 * venía fallando. El dato ya viajaba en `estado` de la fila; solo que
 * nadie lo miraba, y el panel contestaba siempre "revisa la conexión"
 * —el mismo error de diagnóstico que se corrigió en confirmar.php.
 *
 * @param {Element} hilo
 * @param {string} estado - 'enviado' | 'error' | 'pendiente'
 * @returns {void}
 */
function anotarEntregaDeMegaBot(hilo, estado) {
  if (!hilo || !estado) return;
  const fila = hilo.querySelector('.megabot-escribiendo');
  if (!fila) return;

  fila.dataset.entrega = estado;
  repintarEsperaDeMegaBot(fila);
}

/**
 * Saca la burbuja de "está escribiendo", si estaba.
 *
 * @param {Element} hilo
 * @returns {void}
 */
function quitarEscribiendoDeMegaBot(hilo) {
  if (!hilo) return;
  const fila = hilo.querySelector('.megabot-escribiendo');
  if (fila) fila.remove();
}

/**
 * Deja una propuesta como "no se pudo", en pantalla y en la base.
 *
 * POR QUÉ EXISTE
 * Cuando MegaBot proponía una acción fuera de la whitelist, el botón
 * "Confirmar" no hacía nada: ni se ejecutaba, ni fallaba, ni se
 * apagaba. La burbuja seguía diciendo "voy a hacer X" y el botón seguía
 * invitando a tocarlo. Una línea honesta cierra el asunto — y el estado
 * `fallida`, que la tabla tiene desde el primer día y nadie escribía,
 * deja el rastro de qué propuso MegaBot que el panel no pudo hacer.
 *
 * @param {Element} tarjeta
 * @param {number} id
 * @param {string} porque
 * @returns {void}
 */
function marcarPropuestaFallida(tarjeta, id, porque) {
  if (tarjeta) {
    tarjeta.className = 'megabot-propuesta megabot-propuesta--resuelta';
    tarjeta.innerHTML = tarjeta.querySelector('.megabot-propuesta__titulo').outerHTML +
      '<div class="vacio__texto">' + seguro(porque) + '</div>';
  }

  // Que no se pueda anotar no cambia lo que se le dijo a la persona.
  mandar('chat.php?accion=propuesta_estado', { id: id, estado: 'fallida' })
    .catch(() => {});
}

/** Las propuestas ya pintadas, por id — para leer su `accion`/
    `cuerpo_json` al confirmar sin tener que releerlo del DOM. */
let ESTADO_PROPUESTAS_MEGABOT = {};

/**
 * Agrega los mensajes nuevos al hilo (los que ya estaban, por id, se
 * saltean — puede llegar el mismo dos veces entre un poll y otro).
 *
 * @param {Element} hilo
 * @param {Object[]} mensajes
 * @returns {void}
 */
function pintarMensajesNuevosDeMegaBot(hilo, mensajes) {
  mensajes.forEach(m => {
    // Ya está pintado con su id real: no hay nada que hacer.
    if (hilo.querySelector('[data-mensaje-id="' + m.id + '"]')) return;

    /* ⚡ RECONCILIACIÓN POR IDENTIDAD, NO POR CARRERA (2026-09-03)
     *
     * EL DUPLICADO QUE NO SE IBA
     * Al mandar un mensaje se pinta una burbuja optimista con un id
     * `local-…`, y en paralelo el servidor ya guardó la fila real. El
     * poll corre cada 2 s mientras se espera; el envío no puede volver
     * en menos de eso, porque chat.php llama al webhook EN LÍNEA con
     * timeout de 10 s. O sea que el poll casi siempre llega primero,
     * trae la fila real, no la reconoce —la optimista todavía se llama
     * `local-…`— y pinta la segunda burbuja.
     *
     * El intento anterior (adoptarIdRealDeBurbuja, abajo) solo podía
     * ganar si el POST contestaba en menos de 2 segundos: en la
     * práctica, solo cuando no había webhook configurado. Por eso el
     * duplicado seguía apareciendo.
     *
     * LA SOLUCIÓN
     * No competir. Cuando llega un mensaje de Lucila que no está
     * pintado, primero se busca una burbuja optimista con EL MISMO
     * TEXTO y se la adopta. Gane quien gane la carrera, hay una sola
     * burbuja — y si el envío contesta después, encuentra la burbuja ya
     * adoptada y no hace nada.
     */
    if (m.rol === 'lucila') {
      const optimista = burbujaOptimistaConEsteTexto(hilo, m.texto);
      if (optimista) {
        optimista.dataset.mensajeId = String(m.id);
        delete optimista.dataset.optimista;

        const idAdoptado = Number(m.id);
        if (Number.isFinite(idAdoptado)) {
          MEGABOT_ULTIMO_ID = Math.max(MEGABOT_ULTIMO_ID, idAdoptado);
        }
        return;
      }
    }

    (m.propuestas || []).forEach(p => { ESTADO_PROPUESTAS_MEGABOT[p.id] = p; });
    /* El hilo va como segundo argumento para que la cita de
       `en_respuesta_a` pueda buscar la pregunta. Se arma ANTES de
       insertar: así la última fila del hilo sigue siendo el mensaje
       anterior y no esta misma. */
    hilo.insertAdjacentHTML('beforeend', htmlDeBurbujaMegaBot(m, hilo));

    /* Solo los ids de la base hacen avanzar la marca. Los optimistas y
       los de las respuestas offline son 'local-1725…', y
       Math.max(0, 'local-1725…') da NaN: desde ese momento el poll
       pedía `despues_de=NaN`, PHP lo leía como 0 y volvía a bajar el
       hilo ENTERO cada dos segundos. */
    const id = Number(m.id);
    if (Number.isFinite(id)) MEGABOT_ULTIMO_ID = Math.max(MEGABOT_ULTIMO_ID, id);
  });
  if (mensajes.length) hilo.scrollTop = hilo.scrollHeight;
}

/**
 * La burbuja optimista que corresponde a este texto, si todavía hay una
 * esperando su id real.
 *
 * Se compara el texto exacto porque es lo único que las dos versiones
 * de la misma burbuja comparten con seguridad: la optimista se pinta
 * con lo que se escribió, y el servidor devuelve eso mismo. Se toma la
 * PRIMERA sin adoptar, que con dos mensajes iguales seguidos es la más
 * vieja — el orden se conserva.
 *
 * @param {Element} hilo
 * @param {string} texto
 * @returns {Element|null}
 */
function burbujaOptimistaConEsteTexto(hilo, texto) {
  const candidatas = hilo.querySelectorAll('[data-optimista="1"]');

  for (const fila of candidatas) {
    if (fila.dataset.mensajeTexto === texto) return fila;
  }
  return null;
}

/**
 * Le pone a la burbuja optimista el id que le dio la base.
 *
 * Es el camino rápido: si el envío contesta antes de que el poll traiga
 * la fila, se adopta acá y el poll ya la encuentra por id. Si el poll
 * gana —lo normal, ver la nota de pintarMensajesNuevosDeMegaBot—, la
 * adopción ya ocurrió allá y esto no encuentra nada que hacer.
 *
 * Los dos caminos son idempotentes: el que llegue segundo no duplica ni
 * pisa nada.
 *
 * @param {Element} hilo
 * @param {string} idLocal
 * @param {number} idReal
 * @returns {void}
 */
function adoptarIdRealDeBurbuja(hilo, idLocal, idReal) {
  const id = Number(idReal);
  if (!Number.isFinite(id) || id <= 0) return;

  // Si el poll ya la adoptó, no hay dos: hay una, con su id real.
  if (!hilo.querySelector('[data-mensaje-id="' + id + '"]')) {
    const burbuja = hilo.querySelector('[data-mensaje-id="' + idLocal + '"]');
    if (burbuja) {
      burbuja.dataset.mensajeId = String(id);
      delete burbuja.dataset.optimista;
    }
  }

  MEGABOT_ULTIMO_ID = Math.max(MEGABOT_ULTIMO_ID, id);
}

/**
 * Preguntas de lectura que se contestan con la copia guardada en el
 * teléfono, sin internet.
 *
 * POR QUÉ ESTO ES LA MITAD DE LO QUE FALTABA
 * Sin señal, "¿cuánto debo?" o "¿quién falta por confirmar?" caían en
 * "No tengo eso a mano" — y son la mitad de lo que se le pregunta a un
 * asistente. No hacía falta ningún dato nuevo: DINERO, INVITADOS y
 * MESAS ya están cargados en memoria, y 26-sincronizacion.js guarda una
 * copia de todo. Lo único que faltaba era mirarlos.
 *
 * Cada entrada tiene las palabras que la disparan y una función que
 * arma la respuesta con lo que haya. Devolver null significa "no tengo
 * ese dato cargado", y la cascada sigue al paso siguiente.
 */
const PREGUNTAS_QUE_SE_LEEN = [
  {
    palabras: ['cuanto debo', 'cuánto debo', 'cuanto falta pagar', 'cuánto falta pagar',
               'cuanto falta', 'cuánto falta', 'que debo', 'qué debo'],
    responder: () => {
      if (!DINERO || !DINERO.totales) return null;
      const t = DINERO.totales;
      if (!(t.falta > 0.01)) return 'Estás al día: no queda nada por pagar de lo cargado.';

      return 'Faltan ' + comoDinero(t.falta, false) + '. De ' +
             comoDinero(t.costo, false) + ' que cuesta, llevas ' +
             comoDinero(t.pagado, false) + ' pagados.';
    },
  },
  {
    palabras: ['cuanto cuesta', 'cuánto cuesta', 'cuanto sale', 'cuánto sale',
               'cuanto llevamos', 'cuánto llevamos', 'cuanto va', 'cuánto va'],
    responder: () => {
      if (!DINERO || !DINERO.totales) return null;
      const t = DINERO.totales;
      return 'La fiesta cuesta ' + comoDinero(t.costo, false) + '. De tu bolsillo, ' +
             comoDinero(t.propio, false) + '.' +
             (t.costo_por_invitado
               ? ' Son ' + comoDinero(t.costo_por_invitado, false) + ' por invitado.'
               : '');
    },
  },
  {
    palabras: ['que pago este mes', 'qué pago este mes', 'que vence', 'qué vence',
               'proximos pagos', 'próximos pagos', 'que hay que pagar', 'qué hay que pagar'],
    responder: () => {
      if (!DINERO || !DINERO.pagos) return null;

      const pendientes = DINERO.pagos.filter(p => p.estado !== 'pagado');
      if (!pendientes.length) return 'No hay ningún pago pendiente cargado.';

      // Local, no UTC: el último día del mes después de las 18:00, el
      // asistente contestaba sobre el mes siguiente.
      const mesAhora = hoyEnFecha().slice(0, 7);
      const deEsteMes = pendientes.filter(p =>
        p.fecha_limite && String(p.fecha_limite).slice(0, 7) === mesAhora);
      const atrasados = pendientes.filter(p =>
        p.fecha_limite && diasHasta(p.fecha_limite) < 0);
      const sinFecha  = pendientes.filter(p => !p.fecha_limite);

      const suma = l => l.reduce((s, p) => s + (Number(p.monto) || 0), 0);
      const partes = [];

      if (atrasados.length) {
        partes.push('⚠️ ' + pluralizar(atrasados.length, 'pago atrasado', 'pagos atrasados') +
                    ' por ' + comoDinero(suma(atrasados), false));
      }
      partes.push('Este mes: ' + comoDinero(suma(deEsteMes), false) +
                  ' en ' + pluralizar(deEsteMes.length, 'pago', 'pagos'));
      if (sinFecha.length) {
        partes.push(pluralizar(sinFecha.length, 'pago', 'pagos') + ' sin fecha (' +
                    comoDinero(suma(sinFecha), false) + ')');
      }

      return partes.join('.\n') + '.';
    },
  },
  {
    palabras: ['quien falta', 'quién falta', 'cuantos confirmaron', 'cuántos confirmaron',
               'quien no ha confirmado', 'quién no ha confirmado', 'cuantos vienen',
               'cuántos vienen', 'cuanta gente', 'cuánta gente'],
    responder: () => {
      if (!INVITADOS || !INVITADOS.length) return null;

      /* ⚠️ "APARTADOS" NO ES "CONFIRMADOS", y acá es donde más fácil se
         confunden. En el modelo sustractivo una confirmación NACE con
         asiste=1 —el cupo está reservado desde el día uno—, así que
         contar por `asiste` diría que confirmaron todos desde antes de
         mandar la primera invitación. Quien de verdad CONTESTÓ lo dice
         yaRespondio() (08-vista-invitados.js), que es el mismo criterio
         que usa la lista y el contador de la pestaña. */
      const contestaron = INVITADOS.filter(f => yaRespondio(f));
      const vienen = contestaron.filter(f => Number(f.asiste) === 1);
      const gente = vienen.reduce((s, f) =>
        s + (Number(f.adultos) || 0) + (Number(f.ninos) || 0), 0);
      const faltan = INVITADOS.length - contestaron.length;

      return 'Contestaron ' + pluralizar(contestaron.length, 'grupo', 'grupos') +
             ': vienen ' + vienen.length + ' (' + gente + ' personas).' +
             (faltan > 0
               ? '\nTodavía no contestan ' +
                 pluralizar(faltan, 'grupo', 'grupos') + '.'
               : '\nYa contestaron todos.');
    },
  },
  {
    palabras: ['quien sin mesa', 'quién sin mesa', 'falta sentar', 'sin mesa',
               'como van las mesas', 'cómo van las mesas'],
    responder: () => {
      if (!MESAS || !MESAS.resumen) return null;
      const r = MESAS.resumen;

      return 'Hay ' + pluralizar(r.mesas, 'mesa', 'mesas') + ' para ' + r.capacidad +
             ' lugares. Sentados: ' + r.sentados + ' de ' + r.gente + '.' +
             (r.sin_sentar > 0
               ? '\nQuedan ' + pluralizar(r.sin_sentar, 'grupo', 'grupos') + ' sin mesa.'
               : '\nNo queda nadie sin mesa.') +
             (r.faltan_lugares > 0
               ? '\n⚠️ Faltan ' + r.faltan_lugares + ' lugares.'
               : '');
    },
  },
];

/**
 * Contesta una pregunta de lectura con los datos que ya están cargados.
 *
 * @param {string} texto
 * @returns {string|null} La respuesta, o null si no era una de estas.
 */
function responderPreguntaDeLectura(texto) {
  const limpio = texto.toLocaleLowerCase('es').trim();

  for (const pregunta of PREGUNTAS_QUE_SE_LEEN) {
    if (!pregunta.palabras.some(p => limpio.includes(p))) continue;

    try {
      const respuesta = pregunta.responder();
      if (respuesta) return respuesta;
    } catch (error) {
      /* Un dato a medio cargar no puede tumbar el asistente: se sigue
         al paso siguiente de la cascada como si no hubiera matcheado. */
    }
  }

  return null;
}

/**
 * MegaBot offline (sin URL guardada, webhook caído, o timeout — ver
 * chat.php?accion=enviar): resuelve EN EL TELÉFONO con lo que ya existía
 * antes de este chat. Nunca cae a esto el servidor — lo decide esta
 * función, cliente, cuando `enviar`/`reenviar` vuelven con `offline` o
 * `_offline`.
 *
 * LA CASCADA, en orden:
 *
 *   1. ENTIDADES — hace la tarea, confirmando. "sienta a Juan en la
 *      mesa 5", "ya se pagó el DJ", "busca a Marta", "crea una tarea…".
 *      Extrae el nombre, lo busca en la copia local (funciona sin
 *      señal), desambigua mostrando hasta seis opciones, pide
 *      confirmación y recién ahí escribe.
 *
 *      ⚡ ESTE PASO NO EXISTÍA (2026-09-03). `intentarConEntidad()`
 *      estaba escrito, probado y completo — y NO SE LLAMABA DESDE
 *      NINGÚN LADO: había quedado como "camino de rollback" al pasar a
 *      MegaBot. Engancharlo cambia el asistente sin internet de "te
 *      abro una pantalla" a "hago lo que pediste".
 *
 *   2. PREGUNTAS DE LECTURA — "¿cuánto debo?", "¿quién falta?". Se
 *      contestan con los mismos datos cacheados. Era la mitad de lo que
 *      se pregunta y caía en "No tengo eso a mano".
 *
 *   3. FRASES (el matcher de siempre) — abre pantallas. Son las mismas
 *      herramientas que el sandwich del FAB ya ejecuta con un toque,
 *      nunca escrituras silenciosas.
 *
 *   4. SUGERENCIAS de los agentes — anunciadas COMO LO QUE SON. Antes
 *      se pintaban como si fueran una respuesta, ignorando lo que ella
 *      había escrito.
 *
 *   5. Una palabra cariñosa (46), si el texto la dispara.
 *
 *   6. Una línea corta y honesta. Nunca "pedile a Carlos que configure
 *      MegaBot" como respuesta principal.
 *
 * Todo se pinta en el MISMO hilo, como burbuja de MegaBot — Lucila
 * nunca ve "agente dinero" ni "agente mesas" como quien le contesta.
 *
 * @param {Element} hilo
 * @param {string} texto
 * @returns {Promise<void>}
 */
async function resolverMegaBotOffline(hilo, texto) {
  // Contesta el teléfono: la espera terminó, aunque no haya llegado
  // nada de afuera.
  quitarEscribiendoDeMegaBot(hilo);

  /* `origen: 'fab'` es lo que separa esta respuesta de una de MegaBot.
     Sin eso las dos se pintan igual y no hay forma de saber cuál
     contestó — ver la nota de htmlDeBurbujaMegaBot(). */
  const decir = mensaje => pintarMensajesNuevosDeMegaBot(hilo, [{
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    rol: 'megabot', origen: 'fab', texto: mensaje, estado: 'enviado', propuestas: [],
  }]);

  /* ─── 1. Entidades: hacer la tarea ─────────────────────────────── */
  const cajaDeEntidad = crearBurbujaDeTrabajoDeMegaBot(hilo);
  let seHizoCargo = false;
  try {
    seHizoCargo = await intentarConEntidad(texto, cajaDeEntidad);
  } catch (error) {
    seHizoCargo = false;
  }
  if (seHizoCargo) return;

  // No era una entidad: la burbuja de trabajo se saca sin dejar rastro.
  cajaDeEntidad.closest('.megabot-fila').remove();

  /* ─── 2. Preguntas de lectura ──────────────────────────────────── */
  const respuesta = responderPreguntaDeLectura(texto);
  if (respuesta) { decir(respuesta); return; }

  /* ─── 3. Frases de siempre: abrir una pantalla ─────────────────── */
  const coincidencias = buscarCoincidencias(texto);
  const mejor = coincidencias[0];

  if (mejor && mejor.puntaje >= 60) {
    decir('Abriendo: ' + mejor.intencion.nombre + '.');
    cerrarHoja(true);
    mejor.intencion.ejecutar();
    return;
  }

  /* ─── 4. Sugerencias, dichas como lo que son ───────────────────── */
  if (typeof recogerSugerencias === 'function') {
    try {
      const sugerencias = await recogerSugerencias(VISTA_ACTUAL);
      if (sugerencias.length) {
        pintarSugerenciasEnHiloDeMegaBot(hilo, sugerencias.slice(0, 3));
        return;
      }
    } catch (error) {
      // Sigue al resto de los pasos — nunca se corta acá.
    }
  }

  /* ─── 5. Una palabra cariñosa ──────────────────────────────────── */
  if (typeof respuestaCarinosaPara === 'function') {
    const carinosa = respuestaCarinosaPara(texto);
    if (carinosa) { decir(carinosa); return; }
  }

  /* ─── 6. La verdad, corta ──────────────────────────────────────── */
  decir('No entendí eso, y ahora mismo no tengo conexión para preguntar. ' +
        'Puedes pedirme cosas como «cuánto debo», «quién falta» o ' +
        '«sienta a Juan en la mesa 5».');
}

/**
 * Una burbuja de MegaBot vacía donde intentarConEntidad() puede pintar.
 *
 * POR QUÉ HACE FALTA
 * `intentarConEntidad()` fue escrita para la hoja del asistente viejo:
 * recibe un elemento y escribe adentro ("Buscando…", las opciones para
 * desambiguar, la confirmación). Para reusarla tal cual —sin tocar una
 * función que ya funciona— se le da una burbuja del hilo como si fuera
 * ese elemento.
 *
 * @param {Element} hilo
 * @returns {Element} El contenedor donde pintar.
 */
function crearBurbujaDeTrabajoDeMegaBot(hilo) {
  const fila = document.createElement('div');
  fila.className = 'megabot-fila megabot-fila--megabot megabot-fila--fab';
  fila.dataset.mensajeId = 'local-trabajo-' + Date.now();

  // Esto lo hace el teléfono, no MegaBot: se firma como lo que es.
  const autor = document.createElement('div');
  autor.className = 'megabot-autor megabot-autor--fab';
  autor.textContent = 'FAB · desde este teléfono';

  const caja = document.createElement('div');
  caja.className = 'megabot-burbuja megabot-burbuja--megabot megabot-burbuja--fab';

  fila.appendChild(autor);
  fila.appendChild(caja);
  hilo.appendChild(fila);
  hilo.scrollTop = hilo.scrollHeight;

  return caja;
}
/**
 * La versión mínima —solo lectura + confirmar— de la caja de
 * sugerencias (40-agentes.js), pensada para vivir DENTRO de una burbuja
 * de chat en vez de en su propia caja. No reusa cajaDeSugerencias()/
 * engancharSugerencias() tal cual porque esas están armadas para un
 * contenedor y un array fijos propios de la campana — acá el contenedor
 * es el hilo del chat, que sigue recibiendo burbujas nuevas por polling.
 *
 * @param {Element} hilo
 * @param {Array} sugerencias
 * @returns {void}
 */
function pintarSugerenciasEnHiloDeMegaBot(hilo, sugerencias) {
  const idBurbuja = 'local-' + Date.now();

  const html =
    '<div class="megabot-fila megabot-fila--megabot megabot-fila--fab" ' +
         'data-mensaje-id="' + seguro(idBurbuja) + '">' +
      '<div class="megabot-autor megabot-autor--fab">FAB · desde este teléfono</div>' +
      '<div class="megabot-burbuja megabot-burbuja--megabot megabot-burbuja--fab">' +
        'MegaBot no está contestando ahora mismo, así que esto es lo que veo yo:' +
      '</div>' +
      sugerencias.map((s, i) =>
        '<div class="megabot-propuesta" data-offline-sugerencia="' + i + '">' +
          '<div class="megabot-propuesta__titulo">' + seguro(s.titulo) + '</div>' +
          (s.detalle
            ? '<div class="vacio__texto" style="margin:2px 0 6px">' + seguro(s.detalle) + '</div>'
            : '') +
          '<div class="acciones">' +
            (s.requiereConfirmacion
              ? '<button class="boton boton--chico" data-offline-cancelar="' + i + '">Descartar</button>' +
                '<button class="boton boton--chico boton--principal" data-offline-confirmar="' + i + '">' +
                  'Confirmar</button>'
              : '<button class="boton boton--chico boton--principal" data-offline-confirmar="' + i + '">' +
                  'Hacer</button>') +
          '</div>' +
        '</div>'
      ).join('') +
    '</div>';

  hilo.insertAdjacentHTML('beforeend', html);
  hilo.scrollTop = hilo.scrollHeight;

  const contenedor = hilo.querySelector('[data-mensaje-id="' + idBurbuja + '"]');
  contenedor.addEventListener('click', async evento => {
    const cancelar = evento.target.closest('[data-offline-cancelar]');
    if (cancelar) {
      const tarjeta = cancelar.closest('[data-offline-sugerencia]');
      if (tarjeta) tarjeta.remove();
      return;
    }

    const confirmar = evento.target.closest('[data-offline-confirmar]');
    if (confirmar) {
      const s = sugerencias[Number(confirmar.dataset.offlineConfirmar)];
      if (!s) return;

      confirmar.disabled = true;
      try {
        await s.ejecutar();
        registrarEvento('asistente', 'sugerencia_hecha', { agente: s.agente, id: s.id });
        const tarjeta = confirmar.closest('[data-offline-sugerencia]');
        if (tarjeta) {
          tarjeta.innerHTML =
            '<div class="megabot-propuesta__titulo">✓ ' + seguro(s.titulo) + '</div>' +
            '<div class="vacio__texto">' + seguro(s.detalleHecho || 'Hecho.') + '</div>';
        }
      } catch (error) {
        confirmar.disabled = false;
        avisar(error.message, true);
      }
    }
  });
}

/**
 * Segundos hasta el reinicio → "1 h 17 min" / "23 min" / "1 h", en
 * español corto — nada de horas Y minutos si uno de los dos es cero.
 *
 * @param {number} segundos
 * @returns {string}
 */
function compactarTiempoDeUsoDeMegaBot(segundos) {
  const minutosTotales = Math.round(segundos / 60);
  const horasTotales   = Math.floor(minutosTotales / 60);
  const dias           = Math.floor(horasTotales / 24);
  const horas          = horasTotales % 24;
  const minutos        = minutosTotales % 60;

  // Menos de un minuto: se dice en segundos, no "0 min", que se lee
  // como que ya pasó.
  if (minutosTotales <= 0) return Math.max(0, Math.round(segundos)) + ' s';
  if (horasTotales <= 0) return minutos + ' min';

  /* ⚡ DÍAS (2026-09-04). La cuota de GrokBot es SEMANAL, así que el
     reinicio puede estar a varios días — y esta función llegaba hasta
     las horas: cuatro días y cinco horas se leían como "101 h 0 min".
     No está mal, pero nadie lee "101 h" y entiende "el jueves".

     Mismo criterio que ya usaba: dos unidades como mucho, y nunca un
     cero que se lea como que ya pasó ("4 d" a secas, no "4 d 0 h"). */
  if (dias > 0) return horas > 0 ? dias + ' d ' + horas + ' h' : dias + ' d';

  if (minutos <= 0) return horasTotales + ' h';
  return horasTotales + ' h ' + minutos + ' min';
}

/* Desde cuándo el número de uso deja de presentarse como si fuera de
   ahora, y cuándo directamente se calla. La cuota es SEMANAL: a la hora
   sigue orientando pero conviene decir de cuándo es, y a los dos días ya
   no dice nada que valga la pena afirmar. */
const EDAD_VISIBLE_DE_USO_S = 3600;      // 1 hora
const EDAD_MAXIMA_DE_USO_S  = 172800;    // 2 días

/** Si el servidor es el de pruebas. Lo dice `listar`, no el navegador. */
let MEGABOT_EN_PRUEBAS = false;

/** El último uso conocido y el reloj que lo hace bajar en pantalla. */
let MEGABOT_USO = null;
let MEGABOT_RELOJ_DE_USO = null;

/**
 * Arranca la cuenta regresiva del reinicio de cuota.
 *
 * POR QUÉ HACE FALTA
 * El servidor ya descuenta el tiempo transcurrido, pero solo se le
 * pregunta cada vez que hay un poll. Sin esto, el número se quedaba
 * quieto entre viaje y viaje y no se leía como un reloj. Se descuenta
 * en el teléfono cada diez segundos —suficiente para que se note que
 * corre, sin repintar de más— y cualquier respuesta del servidor lo
 * corrige.
 *
 * @returns {void}
 */
function arrancarRelojDeUsoDeMegaBot() {
  if (MEGABOT_RELOJ_DE_USO) clearInterval(MEGABOT_RELOJ_DE_USO);

  MEGABOT_RELOJ_DE_USO = setInterval(() => {
    const span = document.getElementById('hoja-uso');

    // La hoja se cerró: no hay nada que actualizar y el reloj se apaga
    // solo, sin dejar un intervalo vivo por cada vez que se abrió.
    if (!span || span.hidden || !MEGABOT_USO) {
      clearInterval(MEGABOT_RELOJ_DE_USO);
      MEGABOT_RELOJ_DE_USO = null;
      return;
    }

    /* El dato también envejece entre viaje y viaje. Sin esto, un uso sin
       reloj se quedaría con la edad que traía al llegar y nunca cruzaría
       los umbrales de "hace un rato" ni el de callarse. */
    if (typeof MEGABOT_USO.hace_segundos === 'number') {
      MEGABOT_USO.hace_segundos += 10;
    }

    if (!(MEGABOT_USO.reinicia_en > 0)) {
      // Sin reloj no hay cuenta regresiva, pero sí hay que repintar: la
      // antigüedad cambió, y pasado el tope el span se oculta solo.
      pintarUsoDeMegaBot(MEGABOT_USO, true);
      return;
    }

    MEGABOT_USO.reinicia_en = Math.max(0, MEGABOT_USO.reinicia_en - 10);

    /* Llegó a cero: la cuota se reinició. Se refleja al toque en vez de
       esperar a que MegaBot lo confirme — es lo que significa que el
       reloj termine. */
    if (MEGABOT_USO.reinicia_en === 0) {
      MEGABOT_USO.porcentaje = 0;
      MEGABOT_USO.agotado = false;
    }

    pintarUsoDeMegaBot(MEGABOT_USO, true);
  }, 10000);
}

/**
 * Pinta los números chicos del encabezado de la hoja MegaBot —
 * "65% · 1 h 17 min", o solo una de las dos partes, según lo que haya.
 * Nunca inventa un dato: sin nada que mostrar, el span queda oculto
 * (ver la tabla del contrato en chat.php). Solo esta hoja lo llena —
 * abrirHoja()/cerrarHoja() (06-piezas.js) lo vacían para el resto.
 *
 * @param {{porcentaje:?number, reinicia_en:number, agotado:boolean}|null} uso
 * @returns {void}
 */
function pintarUsoDeMegaBot(uso, esDelReloj) {
  const span = document.getElementById('hoja-uso');
  if (!span) return;

  const tienePorcentaje = uso && typeof uso.porcentaje === 'number';

  /* ⚡ UN DATO VIEJO NO ES UN DATO (2026-09-04)
   *
   * El uso solo se refresca cuando MegaBot contesta mandándolo, y casi
   * nunca lo manda. Así que el número podía tener horas o días y se
   * pintaba con la misma seguridad que uno recién llegado.
   *
   * Sobre una cuota SEMANAL, lo de hace dos días ya no dice nada: el
   * porcentaje solo pudo haber subido, y cuánto es exactamente lo que no
   * se sabe. Este archivo ya tiene la regla escrita —"nunca inventa un
   * dato: sin nada que mostrar, el span queda oculto"— y esto es
   * aplicarla también al paso del tiempo, que era el caso que faltaba.
   *
   * El reloj corriendo es la excepción: mientras `reinicia_en` baja, el
   * dato se está manteniendo solo y no hace falta desconfiar de él. */
  const edad = uso && typeof uso.hace_segundos === 'number' ? uso.hace_segundos : null;
  const relojCorriendo = uso && uso.reinicia_en > 0;
  const demasiadoViejo = edad !== null && edad > EDAD_MAXIMA_DE_USO_S && !relojCorriendo;

  /* ⚡ EN PRUEBAS, «NO HAY DATO» TAMBIÉN SE DICE (2026-09-06)
   *
   * Cuando MegaBot no manda el campo, esto se ocultaba entero. Es lo
   * correcto para Lucila —inventar un porcentaje sobre la cuota de un
   * servicio ajeno sería peor que callar— pero hacía que "no lo manda"
   * y "todo bien" se vieran igual: un hueco. Se perdieron días
   * creyendo que el contador estaba roto cuando lo que faltaba era el
   * dato del otro lado.
   *
   * En PBE se dice cuál de las dos cosas pasa. Sigue sin inventarse
   * ningún número: se informa la AUSENCIA, que es un hecho
   * comprobable, no una estimación. */
  if (MEGABOT_EN_PRUEBAS && (!uso || (!tienePorcentaje && !uso.agotado))) {
    span.className = 'hoja__uso';
    span.textContent = 'cuota: MegaBot no la informa';
    span.hidden = false;
    return;
  }

  if (!uso || (!tienePorcentaje && !uso.agotado) || demasiadoViejo) {
    span.textContent = '';
    span.hidden = true;
    span.className = 'hoja__uso';
    return;
  }

  // Lo que viene del servidor pisa lo que venía contando el reloj; lo
  // que viene del reloj es ese mismo objeto, ya descontado.
  if (!esDelReloj) MEGABOT_USO = uso;

  const tiempo = uso.reinicia_en > 0 ? compactarTiempoDeUsoDeMegaBot(uso.reinicia_en) : '';

  /* Pasada la hora, el número deja de presentarse como si fuera de
     ahora. No se esconde —sigue orientando— pero se dice de cuándo es.
     Con el reloj corriendo no hace falta: ese ya se actualiza solo. */
  const antiguedad = (!relojCorriendo && edad !== null && edad >= EDAD_VISIBLE_DE_USO_S)
    ? ' · hace ' + compactarTiempoDeUsoDeMegaBot(edad)
    : '';

  let texto = '';

  if (uso.agotado) {
    // Agotado: lo único que importa es cuándo vuelve.
    texto = tiempo ? 'Sin cuota · vuelve en ' + tiempo : 'Sin cuota' + antiguedad;
  } else if (tienePorcentaje) {
    texto = tiempo
      ? uso.porcentaje + '% usado · se reinicia en ' + tiempo
      : uso.porcentaje + '% usado' + antiguedad;
  }

  /* El color dice de un vistazo si hay margen o no, sin tener que leer
     el número: es lo que se mira de reojo mientras se escribe. */
  span.className = 'hoja__uso' +
    (uso.agotado || uso.porcentaje >= 90 ? ' hoja__uso--alerta'
     : uso.porcentaje >= 70 ? ' hoja__uso--ojo' : '');

  span.textContent = texto;
  span.hidden = !texto;

  if (texto && !esDelReloj) arrancarRelojDeUsoDeMegaBot();
}

/**
 * Abre el chat de MegaBot: historial persistente (no se borra al
 * cerrar), un campo para escribir, y chips que mandan una pregunta
 * directo al hilo (ya no ejecutan CATALOGO_FAB — eso lo sigue haciendo
 * el sandwich del toque largo, ver 29-fab.js).
 *
 * @returns {void}
 */
function abrirAsistente() {
  /* ⚡ LOS CHIPS AHORA SON DE LA PANTALLA EN LA QUE ESTÁS (2026-09-03).
     `CONTEXTO_DEL_ASISTENTE` estaba escrito desde el principio y no lo
     usaba nadie: los cuatro chips eran los mismos en todas partes.
     Estando en Dinero, ofrecer "¿Qué mesas faltan?" es ofrecer lo que
     no se está mirando. Los generales quedan al final, para lo que se
     pregunta desde cualquier lado. */
  const delContexto = CONTEXTO_DEL_ASISTENTE[VISTA_ACTUAL] || [];
  const generales = ['¿Cuánto debo?', '¿Quién falta?'];
  const chips = delContexto.concat(generales).slice(0, 5);

  const cuerpo = abrirHoja('MegaBot',
    /* Quién atiende, siempre a la vista. Cuando MegaBot no contesta, el
       que responde es el teléfono (FAB) y antes eso pasaba sin que nadie
       se enterara: las respuestas salían con la misma cara. Ver la nota
       de htmlDeBurbujaMegaBot. */
    '<div id="megabot-quien" class="megabot-quien" hidden></div>' +
    '<div id="megabot-hilo" class="megabot-hilo"></div>' +

    '<div class="filtros" style="margin:var(--esp-2) 0">' +
      chips.map(c => '<button class="filtro" data-megabot-chip="' + seguro(c) + '">' +
                       seguro(c) + '</button>').join('') +
    '</div>' +

    /* Un <textarea> y no un <input>: se le escriben frases largas
       ("sienta a la familia Zelaya en la mesa 5 con los de la
       preparatoria") y en un input de una línea eso se escribe a
       ciegas, viendo solo el final. Crece hasta cuatro renglones y ahí
       scrollea. Enter manda; Shift+Enter hace renglón nuevo. */
    '<div style="display:flex;gap:var(--esp-1);align-items:flex-end">' +
      '<textarea id="asistente-entrada" class="campo__control megabot-entrada" ' +
                'placeholder="Escríbele a MegaBot…" rows="1" ' +
                'autocomplete="off"></textarea>' +
      '<button class="boton boton--principal" id="asistente-mandar" ' +
              'style="flex-shrink:0">Enviar</button>' +
    '</div>'
  );

  const hilo = buscar('#megabot-hilo', cuerpo);
  const entrada = buscar('#asistente-entrada', cuerpo);
  MEGABOT_ULTIMO_ID = 0;
  ESTADO_PROPUESTAS_MEGABOT = {};
  engancharHiloDeMegaBot(hilo);

  hilo.innerHTML = '<p class="vacio__texto">Cargando…</p>';
  traer('chat.php?accion=listar&despues_de=0').then(r => {
    hilo.innerHTML = '';
    pintarMensajesNuevosDeMegaBot(hilo, r.mensajes || []);
    if (!(r.mensajes || []).length) {
      // Con id propio: es lo único que `enviar` puede sacar del hilo.
      // Ver la nota de ahí sobre por qué ya no se borra por clase.
      hilo.innerHTML = '<p class="vacio__texto" id="megabot-vacio">' +
        'Escríbele a MegaBot lo que necesites.</p>';
    }
    pintarUsoDeMegaBot(r.uso);
    pintarQuienAtiendeMegaBot(r.megabot_vivo);
    entrada.focus();
  }).catch(error => {
    hilo.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
  });

  /* ⚡ UN ENVÍO A LA VEZ (2026-09-03)
   *
   * Ni el botón ni los chips se deshabilitaban mientras se mandaba, y
   * `enviar` no tenía guardia de reentrada. Como el envío puede tardar
   * hasta diez segundos —chat.php llama al webhook en línea—, lo normal
   * era tocar de nuevo creyendo que no había pasado nada: dos POST, dos
   * filas distintas en la base, dos burbujas que ningún deduplicador
   * puede unir porque legítimamente son dos mensajes.
   *
   * En las capturas se ve exactamente eso: "¿Qué vence hoy?" dos veces
   * CON dos respuestas.
   */
  let mandando = false;

  const bloquearEnvio = bloqueado => {
    mandando = bloqueado;

    const boton = buscar('#asistente-mandar', cuerpo);
    if (boton) {
      boton.disabled = bloqueado;
      boton.textContent = bloqueado ? 'Enviando…' : 'Enviar';
    }
    // Los chips también: son el camino por el que más se toca dos veces.
    buscarTodos('[data-megabot-chip]', cuerpo).forEach(chip => {
      chip.disabled = bloqueado;
    });
  };

  const enviar = async textoCrudo => {
    if (mandando) return;

    const texto = (textoCrudo || '').trim();
    if (!texto) return;
    entrada.value = '';
    bloquearEnvio(true);

    // Optimista: se pinta ya, con un id temporal que nunca va a chocar
    // con uno real (los de la base son numéricos). El poll de abajo va
    // a traer la fila de verdad — misma idea que el resto del panel
    // (ver 36-optimista.js), simplificada porque acá no hace falta
    // deshacer nada si falla: el mensaje ya quedó guardado del lado
    // del servidor salvo que la red haya fallado de verdad.
    /* ⚡ SOLO SE BORRA EL ESTADO VACÍO, NO EL HILO (2026-09-03)
       Acá decía `if (hilo.querySelector('.vacio__texto')) hilo.innerHTML = ''`.
       Pero `.vacio__texto` no es solo el cartel de "todavía no hay
       nada": lo usan también las propuestas ya resueltas, su detalle y
       las sugerencias offline. O sea que si el hilo tenía UNA propuesta,
       el siguiente mensaje borraba la conversación entera — y como
       MEGABOT_ULTIMO_ID no se reinicia, esos mensajes no volvían nunca
       más. Ahora se quita el cartel, que es lo único que sobra. */
    const cartelDeVacio = hilo.querySelector('#megabot-vacio');
    if (cartelDeVacio) cartelDeVacio.remove();

    const idLocal = 'local-' + Date.now();
    pintarMensajesNuevosDeMegaBot(hilo, [{
      id: idLocal, rol: 'lucila', texto: texto, estado: 'enviado', propuestas: [],
      // La marca que permite reconciliarla con su fila real cuando
      // llegue, gane el poll o gane la respuesta del envío.
      optimista: true,
    }]);

    // Hay respuesta en camino: el poll pasa al ritmo rápido (y se
    // enciende si estaba apagado por inactividad).
    if (MEGABOT_ESPERAR_RESPUESTA) MEGABOT_ESPERAR_RESPUESTA();

    /* ⚡ "ESCRIBIENDO…" (2026-09-03). MegaBot tarda decenas de segundos
       en contestar, y en ese rato la pantalla se quedaba EXACTAMENTE
       igual que si el mensaje no se hubiera mandado: sin nada que
       mirar, la reacción natural es volver a escribir o dar por hecho
       que se colgó. Tres puntos que laten alcanzan para que se note la
       diferencia entre "está pensando" y "no pasó nada". */
    mostrarEscribiendoDeMegaBot(hilo);

    try {
      /* Sin cola a propósito: un mensaje de chat no es un pago, y
         encolarlo dejaba el hilo mudo esperando una señal que podía
         tardar horas, en vez de dejar que fallara y entraran los
         agentes que contestan desde el teléfono. */
      /* ⚡ `_clave` FRENA LOS DUPLICADOS (2026-09-06)
       *
       * MegaBot señaló dos pares de mensajes repetidos (26/27, 53/54)
       * que le alargaron la cola: cada duplicado le cuesta una vuelta
       * entera de agentes, y esa vuelta es la espera que después se
       * siente como que "el chat tarda".
       *
       * El freno ya existía y el chat era el único que no lo usaba: con
       * `_clave`, cuerpoJson() (_lib/responder.php) reconoce un
       * reintento del MISMO envío y devuelve la respuesta de la primera
       * vez sin ejecutar una línea del endpoint — o sea sin insertar
       * otro mensaje ni despertar a MegaBot de nuevo.
       *
       * Se inventa ACÁ y no dentro de mandarSinCola: tiene que ser la
       * misma en todos los intentos de ESTE mensaje. Una clave nueva por
       * intento los volvería envíos distintos, que es justo el duplicado
       * que se quiere evitar (misma razón que encolarEscritura). */
      const r = await mandarSinCola('chat.php?accion=enviar',
        { texto: texto, pantalla: VISTA_ACTUAL, _clave: claveDeEnvio() });

      // La fila ya existe y tiene id: la burbuja que se pintó al toque
      // lo adopta, y así el poll no la pinta de nuevo al lado.
      if (r && r.id) adoptarIdRealDeBurbuja(hilo, idLocal, r.id);

      // Qué pasó al entregar. La espera deja de ser muda: dice si el
      // mensaje llegó a MegaBot o se quedó en el camino.
      if (r && r.estado) anotarEntregaDeMegaBot(hilo, r.estado);

      if (r && (r.offline || r._offline)) await resolverMegaBotOffline(hilo, texto);
    } catch (error) {
      /* ⚡ UN 429 NO ES "SIN CONEXIÓN" (2026-09-03). El servidor tiene
         un techo de peticiones por IP, y el poll del chat consume de
         ahí. Al pasarse, la respuesta es 429 — el servidor contestó
         perfectamente, solo que dijo "más despacio". Reportarlo como
         falta de señal manda a buscar el problema al lugar equivocado,
         y encima el mensaje no queda en la base, así que reintentar SÍ
         sirve. */
      if (error && error.codigo === 429) {
        avisar('Demasiadas peticiones seguidas. Espera unos segundos y ' +
               'vuelve a intentarlo.', true);
        quitarEscribiendoDeMegaBot(hilo);

        /* El mensaje NO llegó a guardarse, así que su burbuja optimista
           no tiene fila real que la adopte nunca: quedaría ahí para
           siempre, indistinguible de un mensaje mandado. Se retira y se
           devuelve el texto al campo, listo para reintentar sin volver
           a escribirlo. */
        const huerfana = hilo.querySelector('[data-mensaje-id="' + idLocal + '"]');
        if (huerfana) huerfana.remove();
        entrada.value = texto;

        return;
      }

      // Sin red ni para llegar a chat.php: mandar() tira acá, así que
      // nunca llega el offline:true de arriba. Es exactamente el caso
      // sin señal que 40-44/46 tienen que resolver — no basta con
      // avisar el error y dejar el hilo mudo.
      avisar(error.message, true);
      await resolverMegaBotOffline(hilo, texto);
    } finally {
      /* Se libera cuando el mensaje ESTÁ MANDADO, no cuando llega la
         respuesta: ya se puede escribir el siguiente. Lo que evita el
         bloqueo es el doble toque por impaciencia durante el envío, no
         seguir conversando. */
      bloquearEnvio(false);
    }

    /* Los puntitos NO se quitan acá. `enviar` termina cuando el
       servidor confirma que RECIBIÓ el mensaje; la respuesta de MegaBot
       llega después, por el poll. Quitarlos ahora sería apagar la señal
       justo cuando empieza la espera de verdad.
       Los quita: el poll al traer algo nuevo, resolverMegaBotOffline()
       al contestar en el teléfono, o el tope de seguridad de la propia
       burbuja si no llega nada. */
  };

  buscar('#asistente-mandar', cuerpo).addEventListener('click', () => enviar(entrada.value));

  /* Enter manda, Shift+Enter hace renglón nuevo — lo que ya hace
     cualquier chat. Sin la excepción del Shift, un textarea de varias
     líneas no serviría para escribir varias líneas. */
  entrada.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      enviar(entrada.value);
    }
  });

  /* El campo crece con lo escrito, hasta cuatro renglones. Se hace acá
     y no con CSS porque un textarea no sabe medirse solo: hay que
     bajarlo a 'auto' antes de leer scrollHeight, o al borrar texto se
     queda con el alto que llegó a tener. */
  const ALTO_MAXIMO_ENTRADA = 96;
  entrada.addEventListener('input', () => {
    entrada.style.height = 'auto';
    entrada.style.height = Math.min(entrada.scrollHeight, ALTO_MAXIMO_ENTRADA) + 'px';
  });
  buscarTodos('[data-megabot-chip]', cuerpo).forEach(chip => {
    chip.addEventListener('click', () => enviar(chip.dataset.megabotChip));
  });

  /* ⚡ POLLING ADAPTATIVO (2026-09-03)
   *
   * EL PROBLEMA
   * Preguntar cada 2 segundos son 30 peticiones por minuto. El tope del
   * panel es de 300 cada 5 minutos por IP: diez minutos con el chat
   * abierto —que es lo normal mientras se resuelve algo— agotaban la
   * cuota, y a partir de ahí TODA la app (no solo el chat) recibía 429.
   * El chat podía tumbar el panel entero.
   *
   * LA IDEA
   * Preguntar seguido hace falta en un solo momento: mientras se espera
   * una respuesta que está por llegar. El resto del tiempo el hilo no
   * cambia solo, y preguntar tan seguido es tirar cuota a la basura.
   *
   *   · esperando → una petición abierta (long-poll), que contesta
   *                 apenas hay algo. Ver la nota de abajo.
   *   · 15 s      en reposo.
   *   · se apaga tras 5 minutos sin novedad SI no hay nada pendiente,
   *     y vuelve al escribir.
   *
   * Con eso, esos mismos diez minutos pasan de ~300 peticiones a ~40. */
  /* Cada apertura del chat se lleva un número. Es lo que permite que
     una closure de una apertura anterior sepa que ya no manda y se
     retire sin tocar nada — ver la nota grande en `consultar`. */
  const miGeneracion = ++MEGABOT_GENERACION;

  /* ⚡ LONG-POLLING MIENTRAS SE ESPERA (2026-09-04)
   *
   * EL PROBLEMA
   * El ritmo rápido se rendía al minuto (`esperaLarga`) y bajaba a 15 s
   * aunque siguiera habiendo una respuesta pendiente. Con esperas de
   * ~68 s eso es puro retraso agregado: la medición del propio MegaBot
   * cayó a los 66,2 s, o sea SEIS segundos después de que el poll se
   * hubiera puesto lento. Incluso en el mejor caso, el panel pintaba
   * tarde.
   *
   * LA IDEA
   * Mientras hay algo pendiente no se pregunta cada tantos segundos: se
   * deja UNA petición abierta y el servidor contesta apenas aparece la
   * fila. Entrega en ≤1 s en vez de 2-15 s, y encima gasta MENOS cuota
   * (~8 peticiones en tres minutos de espera, contra ~38 de antes).
   *
   * POR QUÉ SE PUEDE
   * El panel no usa session_start(): la sesión va por token en la base
   * (_lib/sesion.php). Con sesiones de archivo, una petición abierta
   * bloquearía el archivo y congelaría TODO lo demás del mismo usuario.
   *
   * EL FALLBACK NO ES OPCIONAL
   * Este hosting es compartido y puede cortar una petición larga por
   * límites que no se ven desde acá. Si `esperar=1` falla dos veces
   * seguidas, se apaga solo y queda el ritmo escalonado de abajo. El
   * chat nunca depende de que el long-poll funcione. */
  const POLL_REPOSO_MS   = 15000;
  const APAGAR_TRAS_MS   = 300000;   // 5 minutos sin nada nuevo
  /* Reconexión tras un long-poll que volvió vacío: el servidor ya
     esperó sus 25 s, no hay por qué esperar más de este lado. */
  const RECONECTAR_MS    = 300;
  const FALLOS_PARA_RENDIRSE = 2;

  let esperandoRespuesta = false;
  let ultimaNovedad = Date.now();
  let inicioDeEspera = 0;
  let longPollSirve = true;
  let fallosDeLongPoll = 0;
  /* El último estado de entrega ya avisado, para no repetirlo en cada
     vuelta: el servidor lo manda siempre, cambie o no. */
  let entregaAvisada = '';

  /* El escalonado de reserva. Los 2 s hacen falta al principio, cuando
     una respuesta rápida todavía es posible; después no tiene sentido
     sostenerlos contra una cadena que tarda un minuto. */
  const ritmoDeEspera = () => {
    const esperando = Date.now() - inicioDeEspera;
    if (esperando < 30000) return 2000;
    if (esperando < 90000) return 5000;
    return 10000;
  };

  /** Lo llama `enviar` al mandar: hay respuesta en camino. */
  MEGABOT_ESPERAR_RESPUESTA = () => {
    esperandoRespuesta = true;
    ultimaNovedad = Date.now();
    inicioDeEspera = Date.now();
    /* Hay un mensaje nuevo en camino: el estado de entrega del anterior
       ya no dice nada de éste. Sin esto, mandar otro después de uno que
       falló no volvería a avisar —el valor sería el mismo 'error'— y la
       caída al modo local no se dispararía la segunda vez. */
    entregaAvisada = '';
    programarPoll(0);
  };

  const consultar = async () => {
    /* ⚡ UNA CLOSURE VIEJA NO PUEDE APAGAR EL CHAT NUEVO (2026-09-03)
     *
     * Acá se hacía `clearTimeout(MEGABOT_INTERVALO)` y
     * `MEGABOT_ESPERAR_RESPUESTA = null` a secas. Esas dos son globales
     * de módulo, pero `hilo` y `consultar` son de la closure de cada
     * apertura del chat.
     *
     * El caso real: se cierra la hoja con una consulta en vuelo y se
     * vuelve a abrir enseguida. Cuando la consulta vieja despierta, ve
     * su propio hilo desprendido y "limpia" — pero para entonces
     * MEGABOT_INTERVALO ya es el temporizador de la hoja NUEVA. La
     * apaga, y de paso deja MEGABOT_ESPERAR_RESPUESTA en null, con lo
     * cual el chat nuevo queda sin poll y sin forma de reencenderlo:
     * mudo para siempre, con los puntitos girando.
     *
     * `resolverMegaBotOffline` llama a `cerrarHoja(true)` en medio del
     * flujo, así que este escenario no es teórico.
     *
     * La marca de generación lo resuelve: solo el poll vigente puede
     * tocar las globales. */
    if (!document.body.contains(hilo)) {
      if (MEGABOT_GENERACION === miGeneracion) {
        if (MEGABOT_INTERVALO) clearTimeout(MEGABOT_INTERVALO);
        MEGABOT_INTERVALO = null;
        MEGABOT_ESPERAR_RESPUESTA = null;
      }
      return;
    }

    // Quedó una closure de una apertura anterior: se retira en silencio.
    if (MEGABOT_GENERACION !== miGeneracion) return;

    /* Con la pestaña en segundo plano no se pregunta nada: el chat no se
       está mirando, y gastar cuota ahí es exactamente lo que dejaba sin
       peticiones al resto del panel. */
    if (document.hidden) { programarPoll(POLL_REPOSO_MS); return; }

    let huboNovedad = false;
    /* Solo se deja la petición abierta cuando hay algo que esperar. En
       reposo no hay nada que llegue solo, y tener un worker de PHP
       ocupado para no recibir nada sería peor que preguntar cada 15 s. */
    const conEspera = longPollSirve && esperandoRespuesta;
    try {
      /* El tope del cliente tiene que ser MAYOR que el del servidor (25 s),
         o el navegador aborta la espera antes de que el servidor tenga
         ocasión de contestar y el long-poll no sirve para nada. Los 8 s
         generales de CONFIGURACION la cortarían siempre. */
      const r = await traer(
        'chat.php?accion=listar&despues_de=' + MEGABOT_ULTIMO_ID +
        (conEspera ? '&esperar=1' : ''),
        conEspera ? { segundosDeEspera: 30 } : undefined
      );
      if (conEspera) fallosDeLongPoll = 0;

      /* ⚡ LA MARCA SE VUELVE A MIRAR DESPUÉS DEL await (2026-09-03)
       *
       * La comprobación de arriba mira el estado de ANTES de la
       * petición, y esta petición puede tardar varios segundos. En esa
       * ventana el chat se puede cerrar y reabrir —`cerrarHoja(true)`
       * pasa solo, desde resolverMegaBotOffline— y entonces esta
       * closure vieja seguía de largo: pintaba en un hilo desprendido y,
       * peor, más abajo llamaba a programarPoll(), que pisa
       * MEGABOT_INTERVALO, que para entonces ya es el temporizador del
       * chat NUEVO. El chat nuevo quedaba mudo con los puntitos
       * girando: exactamente el síntoma que la marca vino a arreglar,
       * corrido un `await` más adelante.
       *
       * Por eso hay dos comprobaciones y no una: una tapa la ventana
       * anterior a la petición, ésta tapa la de la petición misma. */
      if (MEGABOT_GENERACION !== miGeneracion) return;
      if (!document.body.contains(hilo)) return;

      const llegaron = r.mensajes || [];

      /* ⚡ EL ECO DEL PROPIO MENSAJE NO ES UNA RESPUESTA (2026-09-03)
       * `listar` no filtra por rol: devuelve también la fila de Lucila
       * que se acaba de guardar. Antes eso contaba como novedad, y con
       * eso se apagaban los puntitos y el poll volvía a 15 s AUNQUE
       * MegaBot no hubiera contestado todavía. La espera de verdad
       * quedaba sin señal y a ritmo lento — y si MegaBot tardaba más de
       * cinco minutos, el poll se apagaba del todo.
       *
       * Novedad es que conteste ALGUIEN MÁS. La fila propia se pinta
       * igual (o se reconcilia con su burbuja optimista), solo que no
       * cuenta como respuesta. */
      const respuestas = llegaron.filter(m => m.rol !== 'lucila');
      huboNovedad = respuestas.length > 0;

      // Llegó la respuesta: los puntitos se van justo antes de que
      // aparezca la burbuja de verdad, no después.
      if (huboNovedad) quitarEscribiendoDeMegaBot(hilo);

      pintarMensajesNuevosDeMegaBot(hilo, llegaron);
      MEGABOT_EN_PRUEBAS = !!r.pruebas;
      pintarUsoDeMegaBot(r.uso);
      pintarQuienAtiendeMegaBot(r.megabot_vivo);

      /* ⚡ CÓMO TERMINÓ LA ENTREGA (2026-09-06)
       *
       * Desde que `enviar` contesta antes de hablar con el webhook, ya
       * no puede decir si MegaBot lo aceptó: eso se sabe un instante
       * después. El servidor lo manda acá en cada vuelta.
       *
       * Si falló, esta es la ÚNICA forma de enterarse —el mensaje ya
       * está pintado, así que el poll no lo vuelve a traer—, y sin
       * enterarse la pregunta se quedaba esperando a alguien que nunca
       * la recibió en vez de pasársela a los agentes del teléfono.
       *
       * `entregaAvisada` evita repetirlo en cada vuelta del poll: el
       * estado sigue siendo 'error' mientras no se mande otra cosa. */
      if (esperandoRespuesta && r.entrega && r.entrega !== entregaAvisada) {
        entregaAvisada = r.entrega;
        anotarEntregaDeMegaBot(hilo, r.entrega);

        if (r.entrega === 'error' || r.entrega === 'pendiente') {
          esperandoRespuesta = false;
          const ultimoSuyo = [...hilo.querySelectorAll('.megabot-fila--lucila')].pop();
          const texto = ultimoSuyo ? ultimoSuyo.dataset.mensajeTexto : '';
          if (texto) await resolverMegaBotOffline(hilo, texto);
        }
      }

      // Llegó lo que se esperaba: se vuelve al ritmo de reposo.
      if (huboNovedad) {
        esperandoRespuesta = false;
        ultimaNovedad = Date.now();
      } else if (llegaron.length) {
        /* Solo llegó el eco. No es una respuesta, pero sí prueba de que
           el hilo está vivo: se corre el reloj del apagado por
           inactividad para no dejar de escuchar justo mientras MegaBot
           está pensando. */
        ultimaNovedad = Date.now();
      }
    } catch (error) {
      /* Sin red: se reintenta en el próximo tick, sin avisar cada vez
         que algo falló.

         Pero si lo que falló fue una petición CON espera, puede ser el
         hosting cortando la conexión larga —cosa que desde acá no se
         distingue de un problema de red—. A la segunda seguida se deja
         de usar y queda el escalonado: vale más un chat un poco más
         lento que uno que se queda mudo. */
      if (conEspera && ++fallosDeLongPoll >= FALLOS_PARA_RENDIRSE) {
        longPollSirve = false;
      }
    }

    /* La petición también puede fallar DESPUÉS de que el chat se
       reabrió. Sin esta línea, el catch dejaba pasar a la closure vieja
       hasta programarPoll() y le pisaba el temporizador al nuevo. */
    if (MEGABOT_GENERACION !== miGeneracion) return;

    /* ⚡ NO SE APAGA CON ALGO PENDIENTE (2026-09-04)
     *
     * Cinco minutos sin novedad apagaban el poll del todo. Para un chat
     * que nadie está usando está bien; para uno que ESTÁ ESPERANDO una
     * respuesta, no: la fila llegaba a la base y el hilo se quedaba
     * mudo hasta reabrir la hoja. Ése era el "a veces no responde
     * nunca", y con la cola atrasada pasaba seguido.
     *
     * El apagado por inactividad ahora solo aplica cuando no hay nada
     * pendiente. */
    if (!huboNovedad && !esperandoRespuesta &&
        Date.now() - ultimaNovedad > APAGAR_TRAS_MS) {
      MEGABOT_INTERVALO = null;
      return;
    }

    /* Con espera pendiente: si el long-poll sirve, se reconecta casi al
       toque (el servidor ya puso los 25 s de paciencia). Si no, queda
       el escalonado. En reposo, 15 s como siempre. */
    programarPoll(!esperandoRespuesta ? POLL_REPOSO_MS
                : longPollSirve       ? RECONECTAR_MS
                                      : ritmoDeEspera());
  };

  /* setTimeout encadenado y no setInterval: con setInterval, una
     consulta que tarda más que el intervalo hace que se encimen dos, y
     con mala señal eso multiplica el problema en vez de aliviarlo. */
  const programarPoll = ms => {
    if (MEGABOT_INTERVALO) clearTimeout(MEGABOT_INTERVALO);
    MEGABOT_INTERVALO = setTimeout(consultar, ms);
  };

  programarPoll(POLL_REPOSO_MS);
}


/* ─── 5. AJUSTES → COMANDOS DEL ASISTENTE ──────────────────────────── */

/**
 * Muestra, por intención, las frases de fábrica y las que esta cuenta
 * enseñó — con botón para borrar las propias y un campo para agregar
 * una nueva a mano.
 *
 * @returns {void}
 */
function abrirComandosDelAsistente() {
  const intenciones = intencionesDelAsistente();

  const cuerpo = abrirHoja('Comandos del asistente',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Estas son tus frases. El asistente aprende solo cuando confirmas ' +
      'una sugerencia, pero también puedes agregarlas aquí a mano.' +
    '</p>' +
    '<div id="comandos-lista"></div>'
  );

  // La sección de "Palabras cariñosas" (46-agente-motivador.js) vive acá
  // mismo, debajo de la lista de comandos — mismo espíritu ("enseñarle
  // cómo hablo yo"), sin sumar otra entrada al menú de Ajustes.
  if (typeof pintarSeccionCarinosa === 'function') pintarSeccionCarinosa(cuerpo);

  const pintar = () => {
    buscar('#comandos-lista', cuerpo).innerHTML = intenciones.map(intencion => {
      const propias = FRASES_APRENDIDAS.filter(f => f.intencion === intencion.clave);

      return '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
               seguro(intencion.nombre) +
             '</div>' +
             '<p class="vacio__texto">' + seguro(intencion.frases.join(' · ')) + '</p>' +
             propias.map(f =>
               '<div class="lista__fila">' +
                 '<span class="lista__cuerpo">' +
                   '<span class="lista__titulo">' + seguro(f.frase) + '</span>' +
                 '</span>' +
                 (f.id
                   ? '<button class="boton-icono" data-comando-borrar="' + f.id + '" ' +
                            'aria-label="Olvidar">' +
                       '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
                         '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" ' +
                               'stroke-width="1.5" stroke-linecap="round"/></svg>' +
                     '</button>'
                   : '') +
               '</div>'
             ).join('') +
             '<div style="display:flex;gap:6px;margin-top:4px">' +
               '<input type="text" class="campo__control" ' +
                      'data-comando-nueva="' + seguro(intencion.clave) + '" ' +
                      'placeholder="Agregar una frase" style="flex:1">' +
               '<button class="boton" data-comando-agregar="' + seguro(intencion.clave) + '">' +
                 '+' +
               '</button>' +
             '</div>';
    }).join('');

    engancharComandos(cuerpo, pintar);
  };

  pintar();
}

/**
 * @param {Element} cuerpo
 * @param {Function} repintar
 * @returns {void}
 */
function engancharComandos(cuerpo, repintar) {
  buscarTodos('[data-comando-borrar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const id = Number(boton.dataset.comandoBorrar);

      /* ⚠️ ERA EL ÚNICO BORRADO DE LOS DIECINUEVE SIN PREGUNTAR
         (2026-09-04). La X está pegada al renglón de la frase, en una
         lista donde todo lo demás se toca para editar: un toque de más
         y la frase enseñada se iba sin vuelta atrás. Nada en el panel
         borra sin preguntar; esto se había quedado afuera. */
      const frase = boton.closest('.lista__fila');
      const texto = frase ? (frase.textContent || '').trim() : 'esta frase';

      if (!await confirmarAccion(
        '¿Olvidar "' + texto + '"?\n\n' +
        'El asistente deja de reconocer esa forma de pedirlo. Las demás ' +
        'frases de este comando siguen funcionando.',
        { confirmar: 'Olvidarla', peligro: true })) return;

      try {
        await mandar('comandos.php?accion=borrar', { id: id });
        FRASES_APRENDIDAS = FRASES_APRENDIDAS.filter(f => f.id !== id);
        localStorage.setItem(claveDeFrasesAprendidas(), JSON.stringify(FRASES_APRENDIDAS));
        repintar();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  buscarTodos('[data-comando-agregar]', cuerpo).forEach(boton => {
    boton.addEventListener('click', async () => {
      const clave = boton.dataset.comandoAgregar;
      const campo = buscar('[data-comando-nueva="' + clave + '"]', cuerpo);
      const frase = campo.value.trim();
      if (!frase) return;

      await enseñarFrase(clave, frase);
      avisar('Aprendida.');
      repintar();
    });
  });
}


/* ─── 6. AJUSTES → MEGABOT ──────────────────────────────────────────── */

/**
 * La hoja donde Carlos pega la URL del webhook de MegaBot y maneja sus
 * dos claves. Mismo molde que abrirConfiguracionDelFab() (29-fab.js):
 * abrirHoja + campos + Guardar.
 *
 * Solo admin — el menú ya esconde esta fila para 'entrada' (ver
 * dibujarMas() en 05-navegacion.js); este chequeo es el cinturón por si
 * alguna vez se llama a mano.
 *
 * @returns {void}
 */
async function abrirConfiguracionMegaBot() {
  if (USUARIO.rol !== 'admin') {
    avisar('Solo una cuenta admin configura MegaBot.', true);
    return;
  }

  let urlActual = '';
  let yaTieneClaveSaliente = false;
  try {
    const [rUrl, rClave] = await Promise.all([
      traer('ajustes.php?accion=obtener&clave=megabot_webhook_url'),
      traer('ajustes.php?accion=obtener&clave=megabot_webhook_clave'),
    ]);
    urlActual = rUrl && rUrl.valor ? rUrl.valor : '';
    yaTieneClaveSaliente = !!(rClave && rClave.valor);
  } catch (error) { /* se abre igual, con los campos vacíos */ }

  const cuerpo = abrirHoja('MegaBot',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'El chat del botón redondo habla con MegaBot. Sin URL, los ' +
      'mensajes se guardan pero nadie contesta. Solo una cuenta admin ' +
      've esta pantalla.' +
    '</p>' +

    campoTexto({ id: 'megabot-url', rotulo: 'URL del webhook', tipo: 'url', valor: urlActual }) +

    '<div class="campo">' +
      '<label for="megabot-clave-saliente">Clave que se manda al webhook</label>' +
      '<input type="password" id="megabot-clave-saliente" class="campo__control" ' +
             'autocomplete="new-password" placeholder="' +
             (yaTieneClaveSaliente ? 'Dejar en blanco para no cambiarla' : 'Sin clave todavía') + '">' +
      (yaTieneClaveSaliente
        ? '<p class="nota-campo">Ya hay una clave guardada.</p>'
        : '') +
    '</div>' +

    '<div class="campo">' +
      '<span class="campo__rotulo">Clave de servicio</span>' +
      '<p class="vacio__texto" style="margin:4px 0 8px">' +
        'La que usa MegaBot para contestar. Nunca se muestra, salvo la ' +
        'vez que la generás.' +
      '</p>' +
      '<div id="megabot-clave-servicio-resultado"></div>' +
      '<button type="button" class="boton" id="megabot-rotar-clave">' +
        'Generar / rotar clave de servicio</button>' +
    '</div>' +

    pieDeFormulario('Guardar')
  );

  buscar('#megabot-rotar-clave', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion(
      'La clave anterior deja de servir. Copiá la nueva ahora — no se ' +
      'vuelve a mostrar. ¿Generar una nueva?'
    )) return;

    mandar('chat.php?accion=rotar_clave', {}).then(r => {
      buscar('#megabot-clave-servicio-resultado', cuerpo).innerHTML =
        '<p class="aviso-error" style="margin-bottom:6px">' +
          'Copiala ahora. Al cerrar esta hoja no la vas a ver otra vez.' +
        '</p>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<code style="flex:1;overflow-wrap:anywhere">' + seguro(r.clave) + '</code>' +
          '<button type="button" class="boton boton--chico" id="megabot-copiar-clave">Copiar</button>' +
        '</div>';

      buscar('#megabot-copiar-clave', cuerpo).addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(r.clave);
          avisar('Copiada.');
        } catch (error) { avisar('No se pudo copiar — seleccionala a mano.', true); }
      });
    }).catch(error => avisar(error.message, true));
  });

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#pie-guardar', cuerpo);
    const url = valorDe('megabot-url', cuerpo).trim();
    const claveSaliente = buscar('#megabot-clave-saliente', cuerpo).value;

    if (url !== '' && !url.startsWith('https://')) {
      avisar('La URL tiene que empezar con https://', true);
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';

    try {
      await mandar('ajustes.php?accion=guardar', { clave: 'megabot_webhook_url', valor: url });
      // No pisar la clave existente si el campo quedó vacío — dejarlo
      // en blanco significa "no cambiarla", no "borrarla".
      if (claveSaliente !== '') {
        await mandar('ajustes.php?accion=guardar', { clave: 'megabot_webhook_clave', valor: claveSaliente });
      }
      cerrarHoja(true);
      avisar('Guardado.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Guardar';
    }
  });
}
