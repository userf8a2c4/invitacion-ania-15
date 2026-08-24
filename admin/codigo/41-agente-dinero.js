/* ══════════════════════════════════════════════════════════════════════
   41 · AGENTE DINERO (Paso 5 → ampliado)

   QUÉ SUGIERE — cinco reglas fijas, ninguna inventa un camino de
   escritura nuevo ni un umbral propio:
     1. Pagos vencidos o por vencer (la de siempre).
     2. Categorías al techo o cerca — mismo umbral que ya usa
        pintarCategorias() en 09-vista-dinero.js (CONFIGURACION.dinero.
        avisarDesde), vía la función compartida semaforoDeCategoria()
        (02-utilidades.js) — no puede desalinearse con la pantalla ni
        con el resumen ejecutivo (13-exportar.js), porque los tres usan
        la misma función.
     3. Padrinos "solo hablado" con un monto prometido — el mismo
        criterio que ya usa el resumen ejecutivo para marcarlos como
        liquidez no segura.
     4. Cotizaciones vencidas (mismo criterio que la etiqueta "Vencida"
        de la pantalla de Dinero).
     5. Proveedores contratados con saldo pendiente (monto_total menos
        anticipo).

   Las reglas 2-5 son INFORMATIVAS (requiereConfirmacion: false): no hay
   una sola acción correcta que un toque pueda resolver (asignar una
   categoría, decidir si insistir con un padrino, repedir una cotización
   o pagar un proveedor son decisiones humanas) — el botón lleva
   directo a la pestaña Dinero, mismo patrón que ya usa el Agente Hoy
   con los eventos de agenda.

   NO INVENTA UN SEGUNDO CAMINO
   Lee de DINERO a través de datosDeDineroParaElAsistente()
   (34-asistente-datos.js), nunca pide nada por su cuenta. La única
   regla que escribe (la de pagos) llama exactamente al mismo endpoint
   que ya usa el resto del panel — presupuesto.php?accion=marcar_pagado
   (ver 09-vista-dinero.js y 32-asistente.js).
   ══════════════════════════════════════════════════════════════════════ */

registrarAgente('dinero', 'Dinero', async () => {
  const dinero = await datosDeDineroParaElAsistente();
  if (!dinero) return [];

  const irADinero = async () => { cerrarHoja(true); irA('dinero', true); };

  /* 1 · Pagos vencidos o por vencer (regla original, sin cambios). */
  const pendientes = (dinero.pagos || []).filter(p => p.estado !== 'pagado' && p.fecha_limite);

  const sugerenciasDePagos = pendientes
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
        // marcar_pagado ALTERNA pagado/pendiente (presupuesto.php) — así
        // que deshacer es, literalmente, llamarlo de nuevo. No es un
        // atajo inventado: es el mismo botón que ya existe en la
        // pestaña Pagos, aplicado al revés.
        deshacer: async () => {
          await mandar('presupuesto.php?accion=marcar_pagado', { id: pago.id });
          ensuciarVistas('resumen', 'dinero');
        },
      };
    })
    .filter(Boolean);

  /* 2 · Categorías al techo o cerca. */
  const sugerenciasDeCategorias = (dinero.categorias || [])
    .map(c => ({ categoria: c, semaforo: semaforoDeCategoria(c) }))
    .filter(x => x.semaforo === 'rojo' || x.semaforo === 'amarillo')
    .map(({ categoria: c, semaforo }) => ({
      id: 'dinero-categoria-' + c.id,
      agente: 'dinero',
      titulo: (semaforo === 'rojo' ? 'Categoría pasada del techo: ' : 'Cerca del techo: ') + c.nombre,
      detalle: comoDinero(c.gastado, false) + ' de ' + comoDinero(c.techo, false) +
        ' (' + porcentaje(c.gastado, c.techo) + '%)',
      prioridad: semaforo === 'rojo' ? 80 : 50,
      requiereConfirmacion: false,
      ejecutar: irADinero,
    }));

  /* 3 · Padrinos solo hablados, con monto — liquidez no segura todavía. */
  const sugerenciasDePadrinos = (dinero.padrinos || [])
    .filter(p => p.estado === 'hablado' && Number(p.monto) > 0)
    .map(p => ({
      id: 'dinero-padrino-' + p.id,
      agente: 'dinero',
      titulo: 'Sin confirmar por escrito: ' + p.nombre,
      detalle: comoDinero(p.monto, false) + ' prometidos' +
        (p.apadrina ? ' para ' + p.apadrina : '') + ' — todavía solo hablado',
      prioridad: 45,
      requiereConfirmacion: false,
      ejecutar: irADinero,
    }));

  /* 4 · Cotizaciones vencidas — mismo criterio que la etiqueta "Vencida"
   * de la pantalla de Dinero. Una ya elegida no importa que venza: ya
   * se usó para decidir. */
  const sugerenciasDeCotizaciones = (dinero.cotizaciones || [])
    .filter(c => c.vigencia && !c.elegida && diasHasta(c.vigencia) < 0)
    .map(c => ({
      id: 'dinero-cotizacion-' + c.id,
      agente: 'dinero',
      titulo: 'Cotización vencida: ' + (c.servicio || c.proveedor || 'sin nombre'),
      detalle: (c.proveedor ? c.proveedor + ' — ' : '') + 'venció el ' + comoFecha(c.vigencia),
      prioridad: 30,
      requiereConfirmacion: false,
      ejecutar: irADinero,
    }));

  /* 5 · Proveedores contratados con saldo pendiente. */
  const sugerenciasDeProveedores = (dinero.proveedores || [])
    .filter(p => p.estado === 'contratado' && (Number(p.monto_total) - Number(p.anticipo)) > 0)
    .map(p => ({
      id: 'dinero-proveedor-' + p.id,
      agente: 'dinero',
      titulo: 'Saldo pendiente: ' + p.nombre,
      detalle: 'Faltan ' + comoDinero(Number(p.monto_total) - Number(p.anticipo), false) +
        (p.servicio ? ' (' + p.servicio + ')' : ''),
      prioridad: 40,
      requiereConfirmacion: false,
      ejecutar: irADinero,
    }));

  return [].concat(
    sugerenciasDePagos,
    sugerenciasDeCategorias,
    sugerenciasDePadrinos,
    sugerenciasDeCotizaciones,
    sugerenciasDeProveedores
  );
});
