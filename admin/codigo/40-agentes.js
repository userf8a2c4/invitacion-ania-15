/* ══════════════════════════════════════════════════════════════════════
   40 · AGENTES — EL REGISTRO Y LA CAJA DE SUGERENCIAS (Paso 5)

   QUÉ ES UN "AGENTE" ACÁ
   Nada de inteligencia artificial: una función que mira los datos
   reales (dinero, mesas, fechas) y arma una lista de sugerencias con
   reglas fijas — "este pago vence mañana", "esta mesa tiene un lugar
   libre para X". Cada agente vive en su propio archivo (41 dinero,
   42 mesas, 43 fechas, 44 hoy) y se anota acá con registrarAgente().

   EL CONTRATO DE UNA SUGERENCIA
     { id, agente, titulo, detalle, prioridad, ejecutar,
       requiereConfirmacion, deshacer?, detalleHecho? }
   - id: única dentro de esta carga (agente + algo del dato, ej. 'dinero-42').
   - agente: la clave del agente que la generó.
   - titulo / detalle: lo que se muestra en la tarjeta.
   - prioridad: número, más alto = más arriba en la lista.
   - ejecutar: función async que hace el cambio DE VERDAD — siempre
     llamando a la misma función que ya usa el resto del panel, nunca
     un segundo camino de escritura (ver 34-asistente-datos.js).
   - requiereConfirmacion: true si ejecutar() escribe algo. La caja de
     acá SIEMPRE pide un toque de más en ese caso — no es opcional ni
     el agente lo puede saltar.
   - deshacer: función async opcional que revierte lo que hizo
     ejecutar(). Si no existe, no se ofrece un botón de deshacer
     fingido: se dice la verdad ("abrí la ficha para corregirlo").
   - detalleHecho: texto del aviso al terminar (si no viene, "Hecho.").

   PRINCIPIO SAGRADO (el mismo de 32-asistente.js)
   Los agentes NUNCA inventan un segundo camino para guardar. Leen de
   34-asistente-datos.js (mismos globales DINERO/INVITADOS/MESAS que ya
   usan las vistas) y escriben con las mismas funciones que ya usa el
   resto del panel.

   ÍNDICE
     1. El registro
     2. Juntar sugerencias
     3. La caja (UI)
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. EL REGISTRO ───────────────────────────────────────────────── */

/** Cada agente anotado: {clave, nombre, generar}. */
const REGISTRO_DE_AGENTES = [];

/**
 * Anota un agente. Se llama una vez por archivo de agente (41, 42, 43,
 * 44), así agregar uno nuevo no obliga a tocar este archivo.
 *
 * @param {string} clave - 'dinero' | 'mesas' | 'fechas' | 'hoy'…
 * @param {string} nombre - Para mostrar si hiciera falta.
 * @param {Function} generar - async () => Sugerencia[]
 * @returns {void}
 */
function registrarAgente(clave, nombre, generar) {
  REGISTRO_DE_AGENTES.push({ clave: clave, nombre: nombre, generar: generar });
}


/* ─── 2. JUNTAR SUGERENCIAS ────────────────────────────────────────── */

/**
 * Corre todos los agentes registrados y junta sus sugerencias,
 * ordenadas por prioridad. Un agente que falla (sin datos, sin señal,
 * un error cualquiera) no tira abajo a los demás: se salta y sigue —
 * mejor mostrar tres sugerencias buenas que ninguna por culpa de una.
 *
 * @returns {Promise<Array>} De mayor a menor prioridad.
 */
async function recogerSugerencias() {
  const listas = await Promise.all(
    REGISTRO_DE_AGENTES.map(async agente => {
      try {
        const propias = await agente.generar();
        return Array.isArray(propias) ? propias : [];
      } catch (error) {
        return [];
      }
    })
  );

  return listas.flat().sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
}


/* ─── 3. LA CAJA (UI) ──────────────────────────────────────────────── */

/**
 * El HTML de la caja de sugerencias.
 *
 * @param {Array} sugerencias
 * @returns {string}
 */
function cajaDeSugerencias(sugerencias) {
  if (!sugerencias.length) {
    return '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
           'Nada urgente por ahora.</p>';
  }

  return '<div id="lista-sugerencias" style="margin-bottom:var(--esp-2)">' +
    sugerencias.slice(0, 5).map((s, i) =>
      '<div class="tarjeta" style="margin-bottom:var(--esp-1)" data-sugerencia-tarjeta="' + i + '">' +
        contenidoDeTarjetaDeSugerencia(s, i) +
      '</div>'
    ).join('') +
  '</div>';
}

/**
 * El HTML de una tarjeta en su estado normal (sin confirmar, sin
 * resolver todavía). Aparte porque "Cancelar" vuelve a este mismo
 * estado sin tener que repintar toda la caja.
 *
 * @param {Object} s
 * @param {number} indice
 * @returns {string}
 */
function contenidoDeTarjetaDeSugerencia(s, indice) {
  return '' +
    '<div class="lista__titulo">' + seguro(s.titulo) + '</div>' +
    (s.detalle
      ? '<div class="vacio__texto" style="margin-top:2px">' + seguro(s.detalle) + '</div>'
      : '') +
    '<div class="acciones" style="margin-top:var(--esp-1)">' +
      '<button class="boton boton--chico" data-sugerencia-ejecutar="' + indice + '">' +
        (s.requiereConfirmacion ? 'Revisar' : 'Hacer') +
      '</button>' +
    '</div>';
}

/**
 * Engancha la caja de sugerencias con UN SOLO listener por delegación,
 * en el contenedor — no uno por botón. Hace falta así porque las
 * tarjetas cambian de estado in-place (pidiendo confirmación, después
 * mostrando "hecho" con su deshacer) reescribiendo su propio HTML; un
 * listener puesto en el botón de un estado anterior se perdería en
 * cuanto ese HTML se reemplaza.
 *
 * @param {Element} contenedor
 * @param {Array} sugerencias
 * @returns {void}
 */
function engancharSugerencias(contenedor, sugerencias) {
  if (!contenedor || contenedor.dataset.sugerenciasEnganchadas) return;
  contenedor.dataset.sugerenciasEnganchadas = '1';

  contenedor.addEventListener('click', async evento => {
    const botonEjecutar = evento.target.closest('[data-sugerencia-ejecutar]');
    if (botonEjecutar) {
      const s = sugerencias[Number(botonEjecutar.dataset.sugerenciaEjecutar)];
      if (!s) return;

      // requiereConfirmacion NO es opcional para el agente: la caja lo
      // exige siempre, sin importar lo que el agente diga que necesita.
      if (s.requiereConfirmacion) {
        pintarConfirmacionDeSugerencia(contenedor, sugerencias, s);
      } else {
        await ejecutarSugerencia(s, () => marcarSugerenciaResuelta(contenedor, sugerencias, s));
      }
      return;
    }

    const botonCancelar = evento.target.closest('[data-sugerencia-cancelar]');
    if (botonCancelar) {
      const indice = Number(botonCancelar.dataset.sugerenciaCancelar);
      const s = sugerencias[indice];
      const tarjeta = buscar('[data-sugerencia-tarjeta="' + indice + '"]', contenedor);
      if (s && tarjeta) tarjeta.innerHTML = contenidoDeTarjetaDeSugerencia(s, indice);
      return;
    }

    const botonConfirmar = evento.target.closest('[data-sugerencia-confirmar]');
    if (botonConfirmar) {
      const s = sugerencias[Number(botonConfirmar.dataset.sugerenciaConfirmar)];
      if (!s) return;
      await ejecutarSugerencia(s, () => marcarSugerenciaResuelta(contenedor, sugerencias, s));
      return;
    }

    const botonDeshacer = evento.target.closest('[data-sugerencia-deshacer]');
    if (botonDeshacer) {
      const s = sugerencias[Number(botonDeshacer.dataset.sugerenciaDeshacer)];
      if (!s || !s.deshacer) return;

      botonDeshacer.disabled = true;
      botonDeshacer.textContent = 'Deshaciendo…';
      try {
        await s.deshacer();
        const indice = sugerencias.indexOf(s);
        const tarjeta = buscar('[data-sugerencia-tarjeta="' + indice + '"]', contenedor);
        if (tarjeta) {
          tarjeta.innerHTML =
            '<div class="lista__titulo">' + seguro(s.titulo) + '</div>' +
            '<p class="vacio__texto" style="margin-top:2px">Deshecho.</p>';
        }
      } catch (error) {
        avisar(error.message, true);
        botonDeshacer.disabled = false;
        botonDeshacer.textContent = 'Deshacer';
      }
    }
  });
}

/**
 * Reemplaza una tarjeta por su versión "pedir confirmación" — adentro
 * de la misma tarjeta, no en una hoja nueva: el asistente ya tiene UNA
 * sola hoja abierta (ver 06-piezas.js) y abrir otra encima se comería
 * la lista de sugerencias en vez de apilarse.
 *
 * @param {Element} contenedor
 * @param {Array} sugerencias
 * @param {Object} s
 * @returns {void}
 */
function pintarConfirmacionDeSugerencia(contenedor, sugerencias, s) {
  const indice = sugerencias.indexOf(s);
  const tarjeta = buscar('[data-sugerencia-tarjeta="' + indice + '"]', contenedor);
  if (!tarjeta) return;

  tarjeta.innerHTML =
    '<div class="lista__titulo">' + seguro(s.titulo) + '</div>' +
    '<p style="margin:var(--esp-1) 0">' + seguro(s.detalle || '¿Confirmás esta acción?') + '</p>' +
    '<div class="acciones">' +
      '<button class="boton boton--chico" data-sugerencia-cancelar="' + indice + '">Cancelar</button>' +
      '<button class="boton boton--chico boton--principal" data-sugerencia-confirmar="' + indice + '">' +
        'Confirmar' +
      '</button>' +
    '</div>';
}

/**
 * Corre ejecutar() de una sugerencia.
 *
 * @param {Object} s
 * @param {Function} [alResolver] - Se llama si salió bien, para dejar
 *   la tarjeta en su estado "hecho".
 * @returns {Promise<void>}
 */
async function ejecutarSugerencia(s, alResolver) {
  try {
    await s.ejecutar();
    registrarEvento('asistente', 'sugerencia_hecha', { agente: s.agente, id: s.id });
    if (typeof alResolver === 'function') alResolver();
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Deja una tarjeta en su estado final: qué se hizo, y cómo deshacerlo
 * si hay una forma real de hacerlo — nunca un botón de deshacer que en
 * realidad no deshace nada (ver el contrato al principio del archivo).
 *
 * @param {Element} contenedor
 * @param {Array} sugerencias
 * @param {Object} s
 * @returns {void}
 */
function marcarSugerenciaResuelta(contenedor, sugerencias, s) {
  const indice = sugerencias.indexOf(s);
  const tarjeta = buscar('[data-sugerencia-tarjeta="' + indice + '"]', contenedor);
  if (!tarjeta) return;

  tarjeta.innerHTML =
    '<div class="lista__titulo">✓ ' + seguro(s.titulo) + '</div>' +
    '<div class="vacio__texto" style="margin-top:2px">' + seguro(s.detalleHecho || 'Hecho.') + '</div>' +
    (s.deshacer
      ? '<div class="acciones" style="margin-top:var(--esp-1)">' +
          '<button class="boton boton--chico" data-sugerencia-deshacer="' + indice + '">' +
            'Deshacer' +
          '</button>' +
        '</div>'
      // Alternativa honesta cuando no hay forma real de deshacer: se
      // dice qué hacer en vez de fingir un botón que no cumpliría.
      : '<p class="vacio__texto" style="margin-top:var(--esp-1);font-style:italic">' +
          'Si hace falta corregir esto, abrí la ficha correspondiente.</p>');
}
