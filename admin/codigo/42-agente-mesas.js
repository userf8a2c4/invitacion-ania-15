/* ══════════════════════════════════════════════════════════════════════
   42 · AGENTE MESAS (Paso 5)

   QUÉ SUGIERE
   Hasta 3 invitados sin mesa, cada uno con la mesa que le tocaría y el
   motivo (con su grupo, o el mejor ajuste de espacio disponible).

   POR QUÉ EL MOTIVO ES CONFIABLE
   La propuesta sale de mesas.php?accion=sugerir_asiento, que llama a
   previsualizarAsientoPara() (_lib/mesas.php) — el MISMO cálculo que
   usa sentar_auto para asignar de verdad. No hay un puntaje inventado
   acá aparte: lo que se muestra es exactamente lo que se va a hacer si
   se confirma.

   NO INVENTA UN SEGUNDO CAMINO
   Confirmar llama a mesas.php?accion=sentar_auto — el mismo endpoint
   que ya usa el botón "Sentar solo" de la ficha de cada invitado
   (08-vista-invitados.js). Vuelve a calcular en el momento de
   confirmar, en vez de fiarse ciegamente de la propuesta de hace un
   rato: si algo cambió mientras tanto (otra persona se sentó en el
   medio), asigna con los datos de ahora, no con los de cuando se
   armó la sugerencia.
   ══════════════════════════════════════════════════════════════════════ */

registrarAgente('mesas', 'Mesas', async () => {
  const mesas = await datosDeMesasParaElAsistente();
  if (!mesas || !mesas.sin_sentar || !mesas.sin_sentar.length) return [];

  // Como cada propuesta es un viaje al servidor, se limita a los
  // primeros 3 — el mismo tope que pide el mega-prompt ("top 1–3").
  const candidatos = mesas.sin_sentar.slice(0, 3);
  const sugerencias = [];

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

    sugerencias.push({
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

  return sugerencias;
});
