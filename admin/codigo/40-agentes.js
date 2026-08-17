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
      '<div class="tarjeta" style="margin-bottom:var(--esp-1)">' +
        '<div class="lista__titulo">' + seguro(s.titulo) + '</div>' +
        (s.detalle
          ? '<div class="vacio__texto" style="margin-top:2px">' + seguro(s.detalle) + '</div>'
          : '') +
        '<div class="acciones" style="margin-top:var(--esp-1)">' +
          '<button class="boton boton--chico" data-sugerencia-ejecutar="' + i + '">' +
            (s.requiereConfirmacion ? 'Revisar' : 'Hacer') +
          '</button>' +
        '</div>' +
      '</div>'
    ).join('') +
  '</div>';
}

/**
 * Engancha los botones de la caja de sugerencias.
 *
 * @param {Element} contenedor
 * @param {Array} sugerencias
 * @param {Function} [alTerminar] - Se llama después de resolver una,
 *   para refrescar la caja (la que ya se hizo no debe seguir ahí).
 * @returns {void}
 */
function engancharSugerencias(contenedor, sugerencias, alTerminar) {
  buscarTodos('[data-sugerencia-ejecutar]', contenedor).forEach(boton => {
    boton.addEventListener('click', () => {
      const s = sugerencias[Number(boton.dataset.sugerenciaEjecutar)];
      if (!s) return;

      if (s.requiereConfirmacion) {
        abrirConfirmacionDeSugerencia(s, alTerminar);
      } else {
        ejecutarSugerencia(s, alTerminar);
      }
    });
  });
}

/**
 * Corre ejecutar() de una sugerencia y avisa el resultado.
 *
 * @param {Object} s
 * @param {Function} [alTerminar]
 * @returns {Promise<void>}
 */
async function ejecutarSugerencia(s, alTerminar) {
  try {
    await s.ejecutar();
    registrarEvento('asistente', 'sugerencia_hecha', { agente: s.agente, id: s.id });
    avisar(s.detalleHecho || 'Hecho.');
    if (typeof alTerminar === 'function') alTerminar();
  } catch (error) {
    avisar(error.message, true);
  }
}

/**
 * Pide un toque de más antes de ejecutar una sugerencia que escribe —
 * esto no es opcional para el agente: toda sugerencia con
 * requiereConfirmacion pasa por acá antes de tocar la base.
 *
 * @param {Object} s
 * @param {Function} [alTerminar]
 * @returns {void}
 */
function abrirConfirmacionDeSugerencia(s, alTerminar) {
  const cuerpo = abrirHoja(s.titulo,
    '<p style="margin-bottom:var(--esp-2)">' +
      seguro(s.detalle || '¿Confirmás esta acción?') +
    '</p>' +
    '<div class="acciones">' +
      '<button class="boton" id="sugerencia-cancelar">Cancelar</button>' +
      '<button class="boton boton--principal" id="sugerencia-confirmar">Confirmar</button>' +
    '</div>'
  );

  buscar('#sugerencia-cancelar', cuerpo).addEventListener('click', () => cerrarHoja(true));
  buscar('#sugerencia-confirmar', cuerpo).addEventListener('click', async () => {
    cerrarHoja(true);
    await ejecutarSugerencia(s, alTerminar);
  });
}
