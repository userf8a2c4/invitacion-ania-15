/* ══════════════════════════════════════════════════════════════════════
   43 · AGENTE FECHAS Y TAREAS (Paso 5)

   QUÉ SUGIERE
   Tareas vencidas (fecha_limite ya pasó y todavía no están "hecha").
   Si no hay ninguna tarea cargada, o ninguna está vencida, no sugiere
   nada — no inventa trabajo que no existe.

   NO INVENTA UN SEGUNDO CAMINO
   Lee de PLAN vía datosDePlanParaElAsistente() (34-asistente-datos.js,
   mismo traerPlanificador() que ya usa 10-planificador.js) y confirma
   contra planificador.php?accion=estado_tarea — el mismo endpoint que
   ya usa la casilla de cada tarea en la pestaña Planificar. Como esa
   acción ALTERNA pendiente/hecha, deshacer es llamarla de nuevo.
   ══════════════════════════════════════════════════════════════════════ */

registrarAgente('fechas', 'Fechas y tareas', async () => {
  const plan = await datosDePlanParaElAsistente();
  if (!plan || !plan.tareas || !plan.tareas.length) return [];

  const vencidas = plan.tareas.filter(t =>
    t.estado !== 'hecha' && t.fecha_limite && diasHasta(t.fecha_limite) < 0
  );

  return vencidas.map(tarea => {
    const dias = Math.abs(diasHasta(tarea.fecha_limite));

    return {
      id: 'fechas-tarea-' + tarea.id,
      agente: 'fechas',
      titulo: 'Tarea vencida: ' + tarea.titulo,
      detalle: 'Venció hace ' + pluralizar(dias, 'día', 'días') +
        (tarea.responsable ? ' · ' + tarea.responsable : ''),
      // Cuanto más atrasada, más urgente — pero se acota para no dejar
      // que una tarea de hace meses tape todo lo demás para siempre.
      prioridad: Math.min(70, 40 + dias),
      requiereConfirmacion: true,
      detalleHecho: 'Marcada como hecha: ' + tarea.titulo,
      ejecutar: async () => {
        await mandar('planificador.php?accion=estado_tarea', { id: tarea.id });
        ensuciarVistas('resumen');
      },
      deshacer: async () => {
        await mandar('planificador.php?accion=estado_tarea', { id: tarea.id });
        ensuciarVistas('resumen');
      },
    };
  });
});
