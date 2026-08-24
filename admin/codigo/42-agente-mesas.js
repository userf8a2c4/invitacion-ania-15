/* ══════════════════════════════════════════════════════════════════════
   42 · AGENTE MESAS (Paso 5 → ampliado)

   QUÉ SUGIERE — cuatro reglas fijas:
     1. Incompatibilidad sentada junta (prioridad más alta de todo el
        sistema de agentes: es lo único que puede arruinar la fiesta de
        verdad). Se cruza `peleas` contra quién está sentado en cada
        mesa — mismo concepto de "clave de unidad" ('c5'/'a12') que ya
        usa _lib/mesas.php, sin volver a pedirle nada al servidor.
        Informativa: mover gente ya sentada es una decisión humana, no
        hay una única respuesta correcta que un toque pueda resolver.
     2. Grupo partido entre mesas (mismo grupo_id sentado en mesas
        distintas). Informativa, mismo motivo que la de arriba.
     3. "Faltan N lugares" — resumen agregado, ya calculado
        server-side (`resumen.faltan_lugares`), sin cálculo propio.
     4. Si quedan MUCHOS invitados sin mesa (≥ UMBRAL_ACOMODO_COMPLETO),
        se ofrece el acomodo automático COMPLETO en vez de ir de a uno
        — con el detalle real de qué se mueve (mismo `movimientos` que
        ya usa "Acomodar solo" en la pantalla, vía
        mesas.php?accion=vista_previa) y deshacer real
        (mesas.php?accion=deshacer, restaura desde acomodo_respaldo).
        Si son pocos, se sigue sentando de a uno (regla original, sin
        cambios) — las dos formas no compiten por el mismo cupo de la
        lista.

   POR QUÉ EL MOTIVO ES CONFIABLE (regla de sentar de a uno)
   La propuesta sale de mesas.php?accion=sugerir_asiento, que llama a
   previsualizarAsientoPara() (_lib/mesas.php) — el MISMO cálculo que
   usa sentar_auto para asignar de verdad. No hay un puntaje inventado
   acá aparte: lo que se muestra es exactamente lo que se va a hacer si
   se confirma.

   NO INVENTA UN SEGUNDO CAMINO
   Cada ejecutar() llama exactamente al endpoint que ya usa la pantalla
   manual de Mesas para esa misma acción — nunca un camino aparte.
   ══════════════════════════════════════════════════════════════════════ */

/** A partir de cuántos sin sentar conviene ofrecer el acomodo completo
 *  en vez de ir de a uno. Bajo este número, uno por uno alcanza y es
 *  menos disruptivo (no mueve a nadie que ya esté sentado). */
const UMBRAL_ACOMODO_COMPLETO = 8;

/**
 * La clave de unidad ('c5' confirmación, 'a12' acompañante) — mismo
 * criterio que claveDeUnidad() en _lib/mesas.php, para poder cruzar
 * `peleas` contra quién está sentado en cada mesa sin pedirle nada
 * nuevo al servidor.
 *
 * @param {string} tipo
 * @param {number} id
 * @returns {string}
 */
function claveDeUnidadMesas(tipo, id) {
  return (tipo === 'acompanante' ? 'a' : 'c') + id;
}

/**
 * Mapa clave de unidad → dónde está sentada, a partir de `mesas.mesas`
 * (cada mesa ya trae su lista de invitados).
 *
 * @param {Array} mesasConGente
 * @returns {Object<string, {mesaId:number, mesaNombre:string, nombre:string, grupoId:?number}>}
 */
function mapaDeAsientos(mesasConGente) {
  const mapa = {};
  for (const mesa of mesasConGente || []) {
    for (const inv of mesa.invitados || []) {
      mapa[claveDeUnidadMesas(inv.tipo, inv.id)] = {
        mesaId: mesa.id,
        mesaNombre: mesa.nombre,
        nombre: inv.nombre,
        grupoId: inv.grupo_id || null,
      };
    }
  }
  return mapa;
}

registrarAgente('mesas', 'Mesas', async () => {
  const mesas = await datosDeMesasParaElAsistente();
  if (!mesas) return [];

  const asientos = mapaDeAsientos(mesas.mesas);

  /* 1 · Incompatibilidad sentada junta. */
  const sugerenciasDePeleas = (mesas.peleas || [])
    .map(pelea => {
      const acompA = Number(pelea.acompanante_a) || 0;
      const acompB = Number(pelea.acompanante_b) || 0;
      const claveA = acompA > 0 && acompB > 0
        ? claveDeUnidadMesas('acompanante', acompA)
        : claveDeUnidadMesas('confirmacion', pelea.invitado_a);
      const claveB = acompA > 0 && acompB > 0
        ? claveDeUnidadMesas('acompanante', acompB)
        : claveDeUnidadMesas('confirmacion', pelea.invitado_b);

      const ua = asientos[claveA];
      const ub = asientos[claveB];
      // Las dos existen, están sentadas, y es la MISMA mesa: ahí está el problema.
      if (!ua || !ub || ua.mesaId !== ub.mesaId) return null;

      return {
        id: 'mesas-pelea-' + pelea.id,
        agente: 'mesas',
        titulo: 'Sentados juntos, y no deberían: ' + ua.nombre + ' y ' + ub.nombre,
        detalle: ua.mesaNombre + (pelea.motivo ? ' — ' + pelea.motivo : ''),
        prioridad: 95,
        requiereConfirmacion: false,
        ejecutar: async () => { cerrarHoja(true); irA('mesas', true); },
      };
    })
    .filter(Boolean);

  /* 2 · Grupo partido entre mesas distintas. */
  const mesasPorGrupo = {};
  for (const clave in asientos) {
    const a = asientos[clave];
    if (!a.grupoId) continue;
    if (!mesasPorGrupo[a.grupoId]) mesasPorGrupo[a.grupoId] = new Set();
    mesasPorGrupo[a.grupoId].add(a.mesaId);
  }
  const nombreDeGrupo = {};
  (mesas.grupos || []).forEach(g => { nombreDeGrupo[g.id] = g.nombre; });

  const sugerenciasDeGrupos = Object.keys(mesasPorGrupo)
    .filter(grupoId => mesasPorGrupo[grupoId].size > 1)
    .map(grupoId => ({
      id: 'mesas-grupo-' + grupoId,
      agente: 'mesas',
      titulo: 'Grupo partido entre mesas: ' + (nombreDeGrupo[grupoId] || 'sin nombre'),
      detalle: 'Repartido en ' + mesasPorGrupo[grupoId].size + ' mesas distintas',
      prioridad: 55,
      requiereConfirmacion: false,
      ejecutar: async () => { cerrarHoja(true); irA('mesas', true); },
    }));

  /* 3 · Faltan lugares — resumen agregado, ya calculado server-side. */
  const sugerenciasDeCapacidad = (mesas.resumen && mesas.resumen.faltan_lugares > 0)
    ? [{
        id: 'mesas-faltan-lugares',
        agente: 'mesas',
        titulo: 'Faltan ' + pluralizar(mesas.resumen.faltan_lugares, 'lugar', 'lugares'),
        detalle: 'La capacidad total no alcanza para toda la gente confirmada',
        prioridad: 65,
        requiereConfirmacion: false,
        ejecutar: async () => { cerrarHoja(true); irA('mesas', true); },
      }]
    : [];

  /* 4 · Sentar sin mesa: de a uno si son pocos, acomodo completo si son
   * muchos — las dos formas no conviven en la misma carga. */
  const sinSentar = mesas.sin_sentar || [];
  let sugerenciasDeAsientos = [];

  if (sinSentar.length && sinSentar.length < UMBRAL_ACOMODO_COMPLETO) {
    // Como cada propuesta es un viaje al servidor, se limita a los
    // primeros 3 — el mismo tope que pide el mega-prompt ("top 1–3").
    const candidatos = sinSentar.slice(0, 3);

    for (const invitado of candidatos) {
      let propuesta;
      try {
        propuesta = await traer(
          'mesas.php?accion=sugerir_asiento&confirmacion_id=' + invitado.id
        );
      } catch (error) {
        // Sin mesa posible para este, o sin señal: se salta sin inventar
        // nada — mejor una sugerencia de menos que una mala.
        continue;
      }

      // Se resolvió por otro lado mientras se armaba la lista: no hay
      // nada que proponer.
      if (propuesta.ya_estaba) continue;

      const motivo = propuesta.por_grupo
        ? 'con gente de su grupo'
        : 'el mejor ajuste de espacio disponible';

      sugerenciasDeAsientos.push({
        id: 'mesas-' + invitado.id,
        agente: 'mesas',
        titulo: 'Sentar a ' + invitado.nombre,
        detalle: propuesta.mesa_nombre + ' — ' + motivo,
        // Con su grupo pesa un poco más: es la razón que ya prioriza el
        // propio algoritmo del panel (ver previsualizarAsientoPara()).
        prioridad: propuesta.por_grupo ? 55 : 40,
        requiereConfirmacion: true,
        detalleHecho: 'Sentado en ' + propuesta.mesa_nombre,
        ejecutar: async () => {
          await mandar('mesas.php?accion=sentar_auto', { confirmacion_id: invitado.id });
          ensuciarVistas('resumen', 'evento', 'invitados');
        },
        // mesas.php?accion=sentar con mesa_id=0 saca a alguien del
        // acomodo (ver el caso 'sentar' en mesas.php) — el mismo camino
        // que ya existe, no un unsentar inventado para esta sugerencia.
        deshacer: async () => {
          await mandar('mesas.php?accion=sentar', { confirmacion_id: invitado.id, mesa_id: 0 });
          ensuciarVistas('resumen', 'evento', 'invitados');
        },
      });
    }
  } else if (sinSentar.length >= UMBRAL_ACOMODO_COMPLETO) {
    let vista = null;
    try {
      vista = await mandar('mesas.php?accion=vista_previa', {});
    } catch (error) {
      vista = null;
    }

    if (vista && vista.ok !== false) {
      const movimientos = vista.movimientos || [];
      const sentados = movimientos.filter(m => m.que_pasa === 'se_sienta').length;
      const mudados  = movimientos.filter(m => m.que_pasa === 'se_muda').length;
      const sinLugar = (vista.sin_lugar || []).length;

      const detalle = 'Se sientan ' + sentados +
        (mudados ? ', se mudan ' + mudados + ' que ya estaban sentados' : '') +
        (sinLugar ? ' — ' + pluralizar(sinLugar, 'persona queda', 'personas quedan') + ' sin lugar' : '') +
        '.';

      sugerenciasDeAsientos = [{
        id: 'mesas-acomodo-completo',
        agente: 'mesas',
        titulo: 'Acomodar automáticamente a ' + pluralizar(sinSentar.length, 'invitado', 'invitados') + ' sin mesa',
        detalle: detalle,
        prioridad: 70,
        requiereConfirmacion: true,
        detalleHecho: 'Acomodo aplicado.',
        ejecutar: async () => {
          await mandar('mesas.php?accion=autoasignar', {});
          ensuciarVistas('resumen', 'evento', 'invitados');
        },
        // El mismo "Volver al acomodo anterior" que ya existe en la
        // pantalla de Mesas — autoasignar guarda su propia foto de
        // respaldo antes de aplicar (ver guardarFotoDelAcomodo en
        // _lib/mesas.php), así que esto restaura de verdad.
        deshacer: async () => {
          await mandar('mesas.php?accion=deshacer', {});
          ensuciarVistas('resumen', 'evento', 'invitados');
        },
      }];
    }
  }

  return [].concat(
    sugerenciasDePeleas,
    sugerenciasDeGrupos,
    sugerenciasDeCapacidad,
    sugerenciasDeAsientos
  );
});
