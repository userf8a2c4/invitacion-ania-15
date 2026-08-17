/* ══════════════════════════════════════════════════════════════════════
   44 · AGENTE HOY (Paso 5)

   QUÉ SUGIERE, Y EN QUÉ SE DIFERENCIA DEL AGENTE DE FECHAS
   43-agente-fechas.js avisa tareas YA VENCIDAS. Este agente mira el día
   de hoy en particular: tareas que vencen HOY (todavía no vencidas) y
   fechas de la agenda para hoy. Las dos cosas responden la misma
   pregunta que ya responde la pestaña Hoy del panel — "¿qué necesito
   saber ahora mismo?" — pero desde el asistente, sin cambiar de pestaña.

   NO INVENTA UN SEGUNDO CAMINO
   Lee de PLAN vía datosDePlanParaElAsistente() (34-asistente-datos.js).
   La fecha de "hoy" sale de interpretarFechaParaElAsistente('hoy')
   (32-asistente.js) — la misma cuenta que ya usa el resto del
   asistente para no calcular la fecha de dos formas distintas.
   ══════════════════════════════════════════════════════════════════════ */

registrarAgente('hoy', 'Hoy', async () => {
  const plan = await datosDePlanParaElAsistente();
  if (!plan) return [];

  const hoyISO = interpretarFechaParaElAsistente('hoy');
  const sugerencias = [];

  // Tareas que vencen HOY — las ya vencidas las cubre 43-agente-fechas.js.
  (plan.tareas || [])
    .filter(t => t.estado !== 'hecha' && t.fecha_limite === hoyISO)
    .forEach(tarea => {
      sugerencias.push({
        id: 'hoy-tarea-' + tarea.id,
        agente: 'hoy',
        titulo: 'Vence hoy: ' + tarea.titulo,
        detalle: tarea.responsable || '',
        prioridad: 65,
        requiereConfirmacion: true,
        detalleHecho: 'Marcada como hecha: ' + tarea.titulo,
        ejecutar: async () => {
          await mandar('planificador.php?accion=estado_tarea', { id: tarea.id });
          ensuciarVistas('resumen');
        },
        // estado_tarea alterna pendiente/hecha — deshacer es llamarla otra vez.
        deshacer: async () => {
          await mandar('planificador.php?accion=estado_tarea', { id: tarea.id });
          ensuciarVistas('resumen');
        },
      });
    });

  // Agenda de hoy: solo informa, no escribe nada — "confirmar" acá no
  // tendría sentido, así que no lo pide.
  (plan.agenda || [])
    .filter(evento => evento.fecha === hoyISO)
    .forEach(evento => {
      sugerencias.push({
        id: 'hoy-agenda-' + evento.id,
        agente: 'hoy',
        titulo: 'Hoy: ' + evento.titulo,
        detalle: [evento.hora, evento.lugar].filter(Boolean).join(' · '),
        prioridad: 70,
        requiereConfirmacion: false,
        // No hay nada que "hacer": el botón lleva a Evento, donde vive
        // la agenda, para quien quiera el detalle completo.
        ejecutar: async () => {
          cerrarHoja(true);
          irA('evento', true);
        },
      });
    });

  return sugerencias;
});
