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
  'ver-recibos':     ['ver recibos', 'mis recibos', 'buscar recibo', 'editar recibo',
                       'borrar recibo', 'recibos de un proveedor'],
  'ver-contratos':   ['ver contratos', 'mis contratos', 'buscar contrato', 'editar contrato',
                       'borrar contrato', 'contratos de un proveedor'],
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
];

/** El id del último mensaje ya pintado, para pedir solo los nuevos. */
let MEGABOT_ULTIMO_ID = 0;
/** El intervalo de polling activo, o null si la hoja está cerrada. */
let MEGABOT_INTERVALO = null;

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
  return ['resumen'];
}

/**
 * El HTML de una burbuja, según quién habla.
 *
 * @param {Object} m - Fila de chat_mensajes, con `propuestas` adjuntas.
 * @returns {string}
 */
function htmlDeBurbujaMegaBot(m) {
  const esLucila = m.rol === 'lucila';
  const esSistema = m.rol === 'sistema';

  return '' +
    '<div class="megabot-fila megabot-fila--' + m.rol + '" data-mensaje-id="' + seguro(m.id) + '">' +
      '<div class="megabot-burbuja megabot-burbuja--' + m.rol + '">' +
        seguro(m.texto) +
        (m.estado === 'error'
          ? '<div class="megabot-burbuja__error">No se pudo mandar. ' +
            '<button type="button" data-megabot-reenviar="' + seguro(m.id) + '">Reintentar</button></div>'
          : '') +
      '</div>' +
      (!esLucila && !esSistema && m.propuestas && m.propuestas.length
        ? m.propuestas.map(p => htmlDePropuestaMegaBot(p)).join('')
        : '') +
    '</div>';
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
      try {
        await mandar('chat.php?accion=reenviar', { mensaje_id: Number(botonReenviar.dataset.megabotReenviar) });
        avisar('Reenviado.');
      } catch (error) {
        avisar(error.message, true);
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

      // Cinturón además del tirante: el servidor (chat.php?accion=
      // responder) ya descarta cualquier propuesta fuera de la
      // whitelist antes de guardarla — esto es solo para no confiar
      // ciegamente en lo que haya quedado pintado en pantalla.
      if (!ACCIONES_PERMITIDAS_PARA_MEGABOT.includes(filaPropuesta.accion)) return;

      botonConfirmar.disabled = true;
      try {
        const cuerpo = JSON.parse(filaPropuesta.cuerpo_json || '{}');
        await mandar(filaPropuesta.accion, cuerpo);
        await mandar('chat.php?accion=propuesta_estado', { id: id, estado: 'aceptada' });
        ensuciarVistas.apply(null, vistasParaEnsuciarPorAccion(filaPropuesta.accion));
        if (tarjeta) {
          tarjeta.className = 'megabot-propuesta megabot-propuesta--resuelta';
          tarjeta.innerHTML = tarjeta.querySelector('.megabot-propuesta__titulo').outerHTML +
            '<div class="vacio__texto">Hecho.</div>';
        }
      } catch (error) {
        botonConfirmar.disabled = false;
        avisar(error.message, true);
      }
      return;
    }
  });
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
    if (hilo.querySelector('[data-mensaje-id="' + m.id + '"]')) return;
    (m.propuestas || []).forEach(p => { ESTADO_PROPUESTAS_MEGABOT[p.id] = p; });
    hilo.insertAdjacentHTML('beforeend', htmlDeBurbujaMegaBot(m));
    MEGABOT_ULTIMO_ID = Math.max(MEGABOT_ULTIMO_ID, m.id);
  });
  if (mensajes.length) hilo.scrollTop = hilo.scrollHeight;
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
  const chips = ['¿Cómo vamos de cupo?', '¿Qué mesas faltan?', '¿Qué vence hoy?', 'Pagos pendientes'];

  const cuerpo = abrirHoja('MegaBot',
    '<div id="megabot-hilo" class="megabot-hilo"></div>' +

    '<div class="filtros" style="margin:var(--esp-2) 0">' +
      chips.map(c => '<button class="filtro" data-megabot-chip="' + seguro(c) + '">' +
                       seguro(c) + '</button>').join('') +
    '</div>' +

    '<div style="display:flex;gap:var(--esp-1)">' +
      '<input type="text" id="asistente-entrada" class="campo__control" ' +
             'placeholder="Escribile a MegaBot…" autocomplete="off">' +
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
      hilo.innerHTML = '<p class="vacio__texto">Escribile a MegaBot lo que necesites.</p>';
    }
    entrada.focus();
  }).catch(error => {
    hilo.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
  });

  const enviar = async textoCrudo => {
    const texto = (textoCrudo || '').trim();
    if (!texto) return;
    entrada.value = '';

    // Optimista: se pinta ya, con un id temporal que nunca va a chocar
    // con uno real (los de la base son numéricos). El poll de abajo va
    // a traer la fila de verdad — misma idea que el resto del panel
    // (ver 36-optimista.js), simplificada porque acá no hace falta
    // deshacer nada si falla: el mensaje ya quedó guardado del lado
    // del servidor salvo que la red haya fallado de verdad.
    if (hilo.querySelector('.vacio__texto')) hilo.innerHTML = '';
    pintarMensajesNuevosDeMegaBot(hilo, [{
      id: 'local-' + Date.now(), rol: 'lucila', texto: texto, estado: 'enviado', propuestas: [],
    }]);

    try {
      await mandar('chat.php?accion=enviar', { texto: texto, pantalla: VISTA_ACTUAL });
    } catch (error) {
      avisar(error.message, true);
    }
  };

  buscar('#asistente-mandar', cuerpo).addEventListener('click', () => enviar(entrada.value));
  entrada.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') enviar(entrada.value);
  });
  buscarTodos('[data-megabot-chip]', cuerpo).forEach(chip => {
    chip.addEventListener('click', () => enviar(chip.dataset.megabotChip));
  });

  // Poll cada 2s mientras la hoja exista. Un solo intervalo activo a la
  // vez: si se abre el chat dos veces sin que el anterior se cerrara
  // del todo, el viejo se corta acá, nunca quedan dos corriendo juntos.
  if (MEGABOT_INTERVALO) clearInterval(MEGABOT_INTERVALO);
  MEGABOT_INTERVALO = setInterval(async () => {
    if (!document.body.contains(hilo)) {
      clearInterval(MEGABOT_INTERVALO);
      MEGABOT_INTERVALO = null;
      return;
    }
    try {
      const r = await traer('chat.php?accion=listar&despues_de=' + MEGABOT_ULTIMO_ID);
      // Los locales (optimistas, sin llegar todavía por el servidor) no
      // tienen id numérico — no hace falta sacarlos, la fila real de
      // Lucila llega con OTRO id y simplemente se agrega al lado.
      pintarMensajesNuevosDeMegaBot(hilo, r.mensajes || []);
    } catch (error) {
      // Sin red: se reintenta solo en el próximo tick, sin avisar cada
      // 2 segundos que algo falló.
    }
  }, 2000);
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
      'una sugerencia, pero también puedes agregarlas acá a mano.' +
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

  buscar('#megabot-rotar-clave', cuerpo).addEventListener('click', () => {
    if (!confirmarAccion(
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
