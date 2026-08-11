/* ══════════════════════════════════════════════════════════════════════
   31 · VISTA PLANIFICAR

   QUÉ HACE ESTE ARCHIVO
   La pestaña "Planificar": el hub de todas las herramientas de
   preparación. Antes Gente, Correo, Presupuesto y Evento tenían botón
   propio en la barra de abajo; con el rediseño esa barra bajó a cuatro
   destinos (Hoy, Resumen, Planificar, Más) y estas cuatro pasaron a
   vivir acá adentro, como un índice — mismo patrón que ya usa Evento
   para sus propias secciones (pintarIndice(), 06-piezas.js).

   POR QUÉ NO HIZO FALTA TOCAR NADA MÁS
   Las claves de CONFIGURACION.indicePlanificar son las mismas claves
   que ya usa VISTAS en 05-navegacion.js. Tocar una fila acá es tocar
   irA(esa-clave): confirmaciones.php, mesas.php, correo.php,
   presupuesto.php y evento.php no se enteran de que el menú cambió.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Dibuja la pestaña Planificar.
 *
 * @returns {void}
 */
function dibujarPlanificar() {
  const vista = buscar('#vista-planificar');
  if (!vista) return;

  const grupos = CONFIGURACION.indicePlanificar.map(grupo => ({
    titulo: grupo.titulo,
    filas: grupo.filas.map(fila => ({
      clave: fila[0],
      // El nombre visible ya vive en VISTAS (05-navegacion.js): "Gente",
      // "Presupuesto"… Repetirlo acá sería el mismo texto en dos
      // lugares, que es justo lo que se desincroniza con el tiempo.
      nombre: (VISTAS[fila[0]] && VISTAS[fila[0]].titulo) || fila[0],
      descripcion: fila[1],
    })),
  }));

  vista.innerHTML =
    '<button class="boton boton--ancho" id="planificar-notas" ' +
            'style="margin-bottom:var(--esp-3)">Notas y recordatorios sueltos</button>' +
    '<div id="indice-planificar"></div>';

  pintarIndice(buscar('#indice-planificar', vista), grupos, clave => irA(clave));

  buscar('#planificar-notas', vista).addEventListener('click', () => abrirHojaDeNota());
}
