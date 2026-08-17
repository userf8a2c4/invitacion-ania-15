/* ══════════════════════════════════════════════════════════════════════
   41 · AGENTE DINERO (Paso 5)

   QUÉ SUGIERE
   Pagos pendientes que ya vencieron o están por vencer en los próximos
   3 días — la misma idea que bloqueProximosPagos() en
   09-vista-dinero.js, pero acá como sugerencias que el asistente puede
   resolver con un toque, en vez de tener que ir a la pestaña Dinero.

   NO INVENTA UN SEGUNDO CAMINO
   ejecutar() llama exactamente al mismo endpoint que ya usa el resto
   del panel — presupuesto.php?accion=marcar_pagado (ver
   09-vista-dinero.js y 32-asistente.js) — y lee de DINERO a través de
   datosDeDineroParaElAsistente() (34-asistente-datos.js), nunca pide
   nada por su cuenta.
   ══════════════════════════════════════════════════════════════════════ */

registrarAgente('dinero', 'Dinero', async () => {
  const dinero = await datosDeDineroParaElAsistente();
  if (!dinero) return [];

  const pendientes = (dinero.pagos || []).filter(p => p.estado !== 'pagado' && p.fecha_limite);

  return pendientes
    .map(pago => {
      const dias = diasHasta(pago.fecha_limite);
      const atrasado = dias < 0;
      const proximo  = dias >= 0 && dias <= 3;

      // Ni atrasado ni por vencer pronto: no hay nada urgente que decir.
      if (!atrasado && !proximo) return null;

      const nombre = pago.concepto || pago.gasto_concepto || 'Pago';

      const cuando = atrasado
        ? 'venció hace ' + pluralizar(Math.abs(dias), 'día', 'días')
        : (dias === 0 ? 'vence hoy' : 'vence en ' + pluralizar(dias, 'día', 'días'));

      return {
        id: 'dinero-pago-' + pago.id,
        agente: 'dinero',
        titulo: (atrasado ? 'Pago atrasado: ' : 'Vence pronto: ') + nombre,
        detalle: comoDinero(pago.monto, false) + ' — ' + cuando,
        // Atrasado pesa más que "vence pronto": es lo primero que
        // conviene resolver.
        prioridad: atrasado ? 90 : 60,
        requiereConfirmacion: true,
        detalleHecho: 'Marcado como pagado: ' + nombre,
        ejecutar: async () => {
          await mandar('presupuesto.php?accion=marcar_pagado', { id: pago.id });
          ensuciarVistas('resumen', 'dinero');
        },
      };
    })
    .filter(Boolean);
});
