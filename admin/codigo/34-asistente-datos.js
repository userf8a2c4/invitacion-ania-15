/* ══════════════════════════════════════════════════════════════════════
   34 · DATOS DEL ASISTENTE (Fase 4b del rediseño)

   QUÉ HACE ESTE ARCHIVO
   La única parte del asistente que CONSULTA — nunca escribe. Busca una
   entidad nombrada en una frase (un pago, un invitado) contra los datos
   reales, y entiende fechas en lenguaje natural ("mañana", "el viernes").

   POR QUÉ NO HAY UN "ACCIONES.JS" APARTE
   Las acciones ya existen: marcar_pagado (api/presupuesto.php),
   formularioTarea() (10-planificador.js), elegirMesaPara() (17-mesas.js).
   Este archivo las deja listas para llamar, pero quien escribe a la
   base sigue siendo exactamente el mismo código de siempre — el
   asistente no inventa un segundo camino para guardar nada.

   DE DÓNDE SALEN LOS DATOS
   De las mismas variables globales que ya llenan las vistas (DINERO,
   INVITADOS, MESAS). Si el asistente se abre sin haber visitado esa
   pestaña, se piden bajo demanda con el mismo traer() de siempre —
   mismo endpoint, mismo caché offline de 26-sincronizacion.js.

   ÍNDICE
     1. Traer los datos bajo demanda
     2. Buscar una entidad por nombre
     3. Fechas en lenguaje natural
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. TRAER LOS DATOS BAJO DEMANDA ───────────────────────────────── */

/**
 * DINERO ya poblado, pidiéndolo si hace falta.
 *
 * @returns {Promise<Object|null>}
 */
async function datosDeDineroParaElAsistente() {
  if (DINERO) return DINERO;
  try {
    DINERO = await traer('presupuesto.php?accion=todo');
  } catch (error) {
    return null;
  }
  return DINERO;
}

/**
 * INVITADOS ya poblado, pidiéndolo si hace falta.
 *
 * @returns {Promise<Array>}
 */
async function datosDeInvitadosParaElAsistente() {
  if (INVITADOS && INVITADOS.length) return INVITADOS;
  try {
    const r = await traer('confirmaciones.php?accion=listar');
    INVITADOS = r.filas || [];
  } catch (error) {
    return [];
  }
  return INVITADOS;
}

/**
 * MESAS ya poblado, pidiéndolo si hace falta.
 *
 * @returns {Promise<Object|null>}
 */
async function datosDeMesasParaElAsistente() {
  if (MESAS) return MESAS;
  try {
    MESAS = await traer('mesas.php?accion=todo');
  } catch (error) {
    return null;
  }
  return MESAS;
}


/* ─── 2. BUSCAR UNA ENTIDAD POR NOMBRE ──────────────────────────────── */

/**
 * Filtra una lista por si algún campo contiene la palabra buscada.
 * Mismo criterio que ya usa el buscador global (27-buscador.js) y el
 * filtro de invitados (08-vista-invitados.js): sin IA, solo
 * paraBuscar().includes().
 *
 * @param {Array} lista
 * @param {string[]} campos
 * @param {string} aguja
 * @returns {Array}
 */
function filtrarPorNombreParaElAsistente(lista, campos, aguja) {
  const buscada = paraBuscar(aguja);
  if (!buscada) return [];

  return lista.filter(fila =>
    campos.some(campo => paraBuscar(String(fila[campo] || '')).includes(buscada))
  );
}

/**
 * Pagos PENDIENTES cuyo concepto (propio o del gasto que cubren)
 * coincide con lo escrito.
 *
 * @param {string} aguja
 * @returns {Promise<Array<{id:number, nombre:string, monto:number}>>}
 */
async function buscarPagoPendienteParaElAsistente(aguja) {
  const dinero = await datosDeDineroParaElAsistente();
  if (!dinero) return [];

  const pendientes = (dinero.pagos || []).filter(p => p.estado === 'pendiente')
    .map(p => ({ ...p, nombreBusqueda: p.concepto || p.gasto_concepto || '' }));

  return filtrarPorNombreParaElAsistente(pendientes, ['nombreBusqueda'], aguja)
    .map(p => ({ id: p.id, nombre: p.concepto || p.gasto_concepto || 'Pago', monto: p.monto }));
}

/**
 * Invitados (cualquiera, para "buscar a") cuyo nombre coincide.
 *
 * @param {string} aguja
 * @returns {Promise<Array<{id:number, nombre:string}>>}
 */
async function buscarInvitadoParaElAsistente(aguja) {
  const invitados = await datosDeInvitadosParaElAsistente();
  return filtrarPorNombreParaElAsistente(invitados, ['nombre'], aguja)
    .map(f => ({ id: f.id, nombre: f.nombre }));
}

/**
 * Invitados que ASISTEN (sentados o no) cuyo nombre coincide — para
 * "sienta a" / "acomoda a", que necesita a alguien que de verdad tenga
 * un lugar que asignar. Sale de MESAS y no de INVITADOS porque
 * elegirMesaPara() (17-mesas.js) busca ahí adentro.
 *
 * @param {string} aguja
 * @returns {Promise<Array<{id:number, nombre:string}>>}
 */
async function buscarParaSentarParaElAsistente(aguja) {
  const mesas = await datosDeMesasParaElAsistente();
  if (!mesas) return [];

  const todos = (mesas.sin_sentar || []).concat(
    ...(mesas.mesas || []).map(m => m.invitados || [])
  );

  return filtrarPorNombreParaElAsistente(todos, ['nombre'], aguja)
    .map(f => ({ id: f.id, nombre: f.nombre }));
}


/* ─── 3. FECHAS EN LENGUAJE NATURAL ─────────────────────────────────── */

/** Nombres de día, en el orden que usa Date.getDay() (0 = domingo). */
const DIAS_DE_LA_SEMANA = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
];

/**
 * A partir de un texto en lenguaje natural, la fecha que quiere decir
 * ("hoy", "mañana", "el viernes", "en 3 dias", "el 12"). Sin librería:
 * un puñado de expresiones y aritmética con Date.
 *
 * @param {string} texto
 * @returns {string|null} AAAA-MM-DD, o null si no se entendió.
 */
function interpretarFechaParaElAsistente(texto) {
  const t = paraBuscar(texto).trim();
  if (!t) return null;

  const hoy = new Date();

  /* A mano, con los componentes LOCALES — no toISOString(). Esa
     convierte a UTC antes de recortar, y en un huso con offset
     negativo (México, por ejemplo) la medianoche local ya es el día
     anterior en UTC: "mañana" podía terminar guardando hoy. */
  const comoISO = fecha => {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return fecha.getFullYear() + '-' + mes + '-' + dia;
  };

  if (t === 'hoy') return comoISO(hoy);

  if (t === 'mañana' || t === 'manana') {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return comoISO(d);
  }

  const enDias = t.match(/^en (\d+) dias?$/);
  if (enDias) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + Number(enDias[1]));
    return comoISO(d);
  }

  const diaDelMes = t.match(/^el (\d{1,2})$/);
  if (diaDelMes) {
    const numero = Number(diaDelMes[1]);
    if (numero >= 1 && numero <= 31) {
      let d = new Date(hoy.getFullYear(), hoy.getMonth(), numero);
      // Si ese día ya pasó este mes, se entiende que es del que viene.
      if (d < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
        d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, numero);
      }
      return comoISO(d);
    }
  }

  const nombreDeDia = DIAS_DE_LA_SEMANA.findIndex(dia => t.includes(dia));
  if (nombreDeDia !== -1) {
    const d = new Date(hoy);
    // Cuántos días hasta el próximo. Si hoy ES ese día, se entiende el
    // de la semana que viene — "el viernes", dicho un viernes, no
    // significa "ahora mismo".
    let diferencia = (nombreDeDia - d.getDay() + 7) % 7;
    if (diferencia === 0) diferencia = 7;
    d.setDate(d.getDate() + diferencia);
    return comoISO(d);
  }

  return null;
}
