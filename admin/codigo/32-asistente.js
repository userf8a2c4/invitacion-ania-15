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
  dinero:     ['Marcar pago', 'Sincronizar'],
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
        resultado.innerHTML = '<p class="aviso-error">Decime qué tarea, además de la fecha.</p>';
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


/* ─── 4. LA HOJA DEL ASISTENTE ──────────────────────────────────────── */

/**
 * Abre el asistente: un campo para escribir, chips de contexto según
 * la pestaña donde se esté, y el resultado de lo que se pida.
 *
 * @returns {void}
 */
function abrirAsistente() {
  const chips = CONTEXTO_DEL_ASISTENTE[VISTA_ACTUAL] || CONTEXTO_DEL_ASISTENTE.resumen;

  const cuerpo = abrirHoja('Asistente',
    // .filtros ya existe (estilos/03-vistas.css) y es exactamente esto:
    // una fila de botones chicos que se acomodan solos.
    '<div class="filtros">' +
      chips.map(c => '<button class="filtro" data-asistente-chip="' + seguro(c) + '">' +
                       seguro(c) + '</button>').join('') +
    '</div>' +

    '<div style="display:flex;gap:var(--esp-1);margin-top:var(--esp-2)">' +
      '<input type="text" id="asistente-entrada" class="campo__control" ' +
             'placeholder="Escribe qué necesitas…" autocomplete="off">' +
      '<button class="boton boton--principal" id="asistente-mandar" ' +
              'style="flex-shrink:0">Ir</button>' +
    '</div>' +

    '<div id="asistente-resultado" style="margin-top:var(--esp-3)"></div>'
  );

  const entrada = buscar('#asistente-entrada', cuerpo);
  const resultado = buscar('#asistente-resultado', cuerpo);
  entrada.focus();

  const procesar = async texto => {
    if (!texto || !texto.trim()) return;
    resultado.innerHTML = '';

    // Primero se prueba si la frase nombra algo real (un pago, un
    // invitado). Si algún patrón se hace cargo, no sigue al camino de
    // las frases fijas.
    const seHizoCargo = await intentarConEntidad(texto, resultado);
    if (seHizoCargo) {
      registrarEvento('asistente', 'frase_exitosa', { texto: texto.trim() });
      return;
    }

    const coincidencias = buscarCoincidencias(texto);
    const mejor = coincidencias[0];

    if (mejor && mejor.puntaje >= 60) {
      // Confianza alta: se ejecuta directo. Ninguna de las acciones de
      // este catálogo es destructiva ni masiva —todas abren una
      // pantalla o navegan—, así que no hace falta pedir confirmación
      // antes de correrla.
      registrarEvento('asistente', 'frase_exitosa', { texto: texto.trim() });
      cerrarHoja(true);
      mejor.intencion.ejecutar();
      return;
    }

    if (coincidencias.length) {
      // Confianza media o baja: cuenta como "no entendió a la primera",
      // igual que el caso sin ninguna coincidencia — en los dos tuvo
      // que reformular o elegir a mano.
      registrarEvento('asistente', 'frase_fallida', { texto: texto.trim() });

      resultado.innerHTML =
        '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
          'No estoy segura. ¿Quisiste decir…' +
        '</p>' +
        coincidencias.slice(0, 3).map((c, i) =>
          '<button class="lista__fila" data-asistente-opcion="' + i + '">' +
            '<span class="lista__cuerpo">' +
              '<span class="lista__titulo">' + seguro(c.intencion.nombre) + '</span>' +
            '</span>' +
          '</button>'
        ).join('');

      buscarTodos('[data-asistente-opcion]', resultado).forEach(boton => {
        boton.addEventListener('click', async () => {
          const c = coincidencias[Number(boton.dataset.asistenteOpcion)];
          await enseñarFrase(c.intencion.clave, texto.trim());
          cerrarHoja(true);
          c.intencion.ejecutar();
        });
      });
      return;
    }

    registrarEvento('asistente', 'frase_fallida', { texto: texto.trim() });

    resultado.innerHTML =
      '<p class="aviso-error">No conozco esa frase todavía. Probá con otras ' +
      'palabras, o elegí una de arriba.</p>';
  };

  buscar('#asistente-mandar', cuerpo).addEventListener('click', () => procesar(entrada.value));
  entrada.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') procesar(entrada.value);
  });

  buscarTodos('[data-asistente-chip]', cuerpo).forEach(chip => {
    chip.addEventListener('click', () => procesar(chip.dataset.asistenteChip));
  });
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
      'Estas son tus frases. El asistente aprende solo cuando confirmás ' +
      'una sugerencia, pero también podés agregarlas acá a mano.' +
    '</p>' +
    '<div id="comandos-lista"></div>'
  );

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
                               'stroke-width="2" stroke-linecap="round"/></svg>' +
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
