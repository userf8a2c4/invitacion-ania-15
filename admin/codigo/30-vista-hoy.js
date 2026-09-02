/* ══════════════════════════════════════════════════════════════════════
   30 · VISTA HOY

   QUÉ HACE ESTE ARCHIVO
   La pestaña "Hoy": la puerta de entrada del panel desde el rediseño.
   Contesta una sola pregunta — "¿qué está pasando ahora y qué tengo que
   hacer en este momento?" — antes de mostrar cualquier otra cosa.

   POR QUÉ TODO EN UNA SOLA PANTALLA Y NO TREINTA DATOS SUELTOS
   El 24 de octubre esto se mira de pie, con una mano, con ruido
   alrededor. No hay tiempo de interpretar una tabla: hace falta que las
   tres cifras que importan salten a la vista y que "Escanear pase" sea
   el botón más grande de la pantalla, no uno más entre diez.

   UNA SOLA PETICIÓN PARA LO DE ARRIBA
   hoy.php ya trae, en un solo viaje, los pendientes priorizados Y el
   bloque `dia` (llegaron/mesas/alergias) que arma la tarjeta de estado.
   Es la misma razón por la que estadisticas.php junta todo el Resumen
   en una sola respuesta: con mala señal, seis pedidos sueltos son seis
   oportunidades de que algo no llegue.

   ÍNDICE
     1. Dibujar la pantalla
     2. La tarjeta de estado
     3. Las tres acciones
     4. Últimas llegadas
     5. Alertas del día
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. DIBUJAR LA PANTALLA ────────────────────────────────────────── */

/**
 * Dibuja la pestaña Hoy.
 *
 * @returns {Promise<void>}
 */
async function dibujarHoy() {
  const vista = buscar('#vista-hoy');
  if (!vista) return;

  ponerTitulo('Hoy', comoFechaCorta(new Date().toISOString()));

  pintarCargando(vista, 4);

  // hoy.php trae todo lo de arriba en un solo viaje (ver la nota grande
  // al principio del archivo). Las últimas llegadas van aparte, en
  // paralelo: son otra tabla y otra pregunta, y si esa falla no tiene
  // que tumbar el resto de la pantalla.
  const pedidoUltimas = traer('llegadas.php?accion=ultimas&cuantas=10')
    .catch(() => ({ ultimas: [] }));

  let datosDeHoy;
  try {
    datosDeHoy = await traer('hoy.php');
  } catch (error) {
    pintarError(vista, error.message, () => dibujarHoy());
    return;
  }

  // La campana (37-campana.js) reusa esto para no pedir hoy.php de
  // nuevo solo para contar avisos.
  if (typeof ULTIMO_HOY !== 'undefined') ULTIMO_HOY = datosDeHoy;
  if (typeof actualizarBurbujaCampana === 'function') actualizarBurbujaCampana();

  const dia = datosDeHoy.dia || {};
  const alertas = alertasDelDia(datosDeHoy);

  // La hora de la última copia necesita leer IndexedDB (async); todo lo
  // demás de acá es síncrono, así que se resuelve antes de armar el HTML.
  const textoConexion = await textoDeConexionConHora();

  /* La cuenta atrás en texto grande ("faltan N días") que iba acá se
     sacó: desde el rediseño Lucila vive en el encabezado, persistente
     en todas las pantallas (ver actualizarContadorDeDias(),
     05-navegacion.js) — repetirla acá sería la misma cifra dos veces
     en la misma pantalla. */
  vista.innerHTML =
    bloqueEstadoDelDia(dia, textoConexion) +
    bloqueTresAcciones() +
    bloqueAlertasDelDia(alertas) +
    '<div id="hoy-ultimas-llegadas"></div>' +
    '<div id="hoy-pendientes"></div>';

  engancharTresAcciones(vista, alertas);

  pedidoUltimas.then(r =>
    pintarBloqueDeUltimasLlegadas(buscar('#hoy-ultimas-llegadas', vista), r.ultimas || [])
  );

  // Lo que ya traía hoy.php de antes —a quién llamar, la lista final
  // cuando falta poco— sigue viviendo en 25-hoy.js. Se reusa tal cual:
  // esas dos funciones no cambiaron.
  const caja = buscar('#hoy-pendientes', vista);
  caja.innerHTML =
    bloqueAQuienLlamar(datosDeHoy.a_quien_llamar) +
    bloqueListaFinal(datosDeHoy.lista_final, datosDeHoy.dias_para_la_fiesta);
}


/* ─── 2. LA TARJETA DE ESTADO ───────────────────────────────────────── */

/**
 * Las tres cifras grandes: llegaron, mesas, alergias. Y debajo, en una
 * línea fina, si hay señal y desde cuándo no la hay.
 *
 * @param {Object} dia - datosDeHoy.dia, de hoy.php.
 * @param {string} textoConexion - Lo que devuelve textoDeConexionConHora()
 *   (26-sincronizacion.js), ya resuelto antes de armar este HTML.
 * @returns {string} HTML
 */
function bloqueEstadoDelDia(dia, textoConexion) {
  const faltaAforo = dia.esperados > 0
    ? Math.min(100, Math.round((dia.llegaron / dia.esperados) * 100)) : 0;

  return '' +
    '<div class="tarjeta hoy-estado">' +
      estadoDeConexionHTML(textoConexion) +

      '<div class="hoy-estado__cifras">' +
        '<div class="hoy-estado__cifra">' +
          '<div class="hoy-estado__numero">' + seguro(dia.llegaron || 0) +
            '<span class="hoy-estado__de">/' + seguro(dia.esperados || 0) + '</span></div>' +
          '<div class="hoy-estado__rotulo">Llegaron</div>' +
        '</div>' +
        '<div class="hoy-estado__cifra hoy-estado__cifra--tocable" data-hoy-ir="mesas" ' +
             'role="button" tabindex="0">' +
          '<div class="hoy-estado__numero">' + seguro(dia.mesas_ocupadas || 0) +
            '<span class="hoy-estado__de">/' + seguro(dia.mesas_total || 0) + '</span></div>' +
          '<div class="hoy-estado__rotulo">Mesas</div>' +
        '</div>' +
        '<div class="hoy-estado__cifra hoy-estado__cifra--tocable' +
             (dia.alergias_activas > 0 ? ' hoy-estado__cifra--alerta' : '') + '" ' +
             'data-hoy-ir="alergias" role="button" tabindex="0">' +
          '<div class="hoy-estado__numero">' + seguro(dia.alergias_activas || 0) + '</div>' +
          '<div class="hoy-estado__rotulo">Alergias</div>' +
        '</div>' +
      '</div>' +

      '<div class="barra" style="margin-top:var(--esp-1)">' +
        '<div class="barra__relleno" style="width:' + faltaAforo + '%"></div>' +
      '</div>' +
    '</div>';
}

/**
 * "En línea" o "Sin señal — última copia guardada HH:MM." El texto sale
 * de textoDeConexionConHora() (26-sincronizacion.js), la MISMA función
 * que arma el banner de arriba, para que los dos digan siempre lo mismo.
 *
 * @param {string} texto - Ya resuelto por dibujarHoy() antes de llamar acá.
 * @returns {string} HTML
 */
function estadoDeConexionHTML(texto) {
  const enLinea = !SIN_LLEGADA;
  return '<p class="hoy-estado__conexion' + (enLinea ? '' : ' hoy-estado__conexion--sin-senal') + '">' +
    seguro(texto) +
  '</p>';
}


/* ─── 3. LAS TRES ACCIONES ──────────────────────────────────────────── */

/**
 * Escanear pase, Buscar invitado, Ver plano. "Escanear" es el botón
 * dominante: más grande y en el color principal, porque es lo único
 * que de verdad importa resolver rápido el día de la fiesta.
 *
 * @returns {string} HTML
 */
function bloqueTresAcciones() {
  return '' +
    '<button class="boton boton--principal boton--ancho hoy-accion-principal" ' +
            'id="hoy-escanear">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" class="icono">' +
        '<path d="M4 4h4M4 4v4M20 4h-4M20 4v4M4 20h4M4 20v-4M20 20h-4M20 20v-4" ' +
             'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="9" y="9" width="6" height="6" fill="currentColor"/>' +
      '</svg>' +
      'Escanear pase' +
    '</button>' +

    '<div style="display:flex;gap:var(--esp-2);margin:var(--esp-1) 0 var(--esp-3)">' +
      '<button class="boton" style="flex:1;min-height:52px" id="hoy-buscar">Buscar invitado</button>' +
      '<button class="boton" style="flex:1;min-height:52px" id="hoy-plano">Ver plano</button>' +
    '</div>';
}

/**
 * Engancha las tres acciones, los toques en la tarjeta de estado y las
 * alertas del día.
 *
 * @param {Element} vista
 * @param {Array} alertas - Lo que devolvió alertasDelDia(), mismo orden
 *                          que se usó para pintar bloqueAlertasDelDia().
 * @returns {void}
 */
function engancharTresAcciones(vista, alertas) {
  buscar('#hoy-escanear', vista).addEventListener('click', () => abrirEscaner());
  buscar('#hoy-buscar', vista).addEventListener('click', () => abrirBuscadorGlobal());
  buscar('#hoy-plano', vista).addEventListener('click', () => verPlanoDeMesas());

  /* Con role="button" hay que atender el teclado también: si no, quien
     navega con Tab llega a la cifra, aprieta Enter y no pasa nada. */
  function alTocarOEnter(elemento, hacer) {
    if (!elemento) return;
    elemento.addEventListener('click', hacer);
    elemento.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        hacer();
      }
    });
  }

  alTocarOEnter(buscar('[data-hoy-ir="mesas"]', vista), () => verPlanoDeMesas());

  /* ⚡ "ALERGIAS" LLEVA A QUIÉNES TIENEN ALERGIA (2026-09-02).
     Antes abría el buscador global: la pantalla decía "1 alergia", se la
     tocaba, y aparecía un buscador vacío. O sea que el único camino para
     responder "¿quién?" era acordarse de escribir algo, sin saber qué. Un
     número que se puede tocar tiene que llevar a la lista de ESE número;
     si no, es peor que no ser tocable. El filtro "Con alergias" ya existe
     en Gente — solo había que usarlo. */
  alTocarOEnter(buscar('[data-hoy-ir="alergias"]', vista), () => {
    FILTRO_INVITADOS = 'alergias';
    irA('invitados');
  });

  buscarTodos('[data-hoy-alerta]', vista).forEach(boton => {
    const alerta = (alertas || [])[Number(boton.dataset.hoyAlerta)];
    if (alerta) boton.addEventListener('click', () => alerta.accion());
  });
}


/* ─── 4. ÚLTIMAS LLEGADAS ───────────────────────────────────────────── */

/**
 * La cola de las últimas 8-10 personas que cruzaron la puerta.
 *
 * @param {Element} donde
 * @param {Array} ultimas - Lo que devuelve llegadas.php?accion=ultimas.
 * @returns {void}
 */
function pintarBloqueDeUltimasLlegadas(donde, ultimas) {
  if (!donde) return;

  if (!ultimas.length) {
    donde.innerHTML = '';
    return;
  }

  donde.innerHTML =
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Últimas llegadas</div>' +
    ultimas.map(u =>
      '<div class="lista__fila">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(u.nombre) +
            (u.tiene_alergia
              ? ' <span class="etiqueta etiqueta--alerta">Alergia</span>' : '') +
          '</span>' +
          '<span class="lista__pie">' +
            (u.mesa ? seguro(u.mesa) : 'Sin mesa') +
          '</span>' +
        '</span>' +
        '<span class="lista__lado vacio__texto">' +
          (u.llegada_en ? seguro(String(u.llegada_en).slice(11, 16)) : '') +
        '</span>' +
      '</div>'
    ).join('');
}


/* ─── 5. ALERTAS DEL DÍA ─────────────────────────────────────────────── */

/**
 * Calcula qué alertas hay que mostrar: pases reintentados, mesas
 * llenas, tareas atrasadas — solo las que de verdad estén pasando.
 *
 * Separado de bloqueAlertasDelDia() (que solo arma el HTML) porque
 * engancharTresAcciones() necesita el mismo arreglo para saber qué
 * ejecutar en cada una, sin tener que volver a calcularlo ni parsear
 * el HTML ya pintado.
 *
 * @param {Object} datosDeHoy - Lo que devuelve hoy.php entero.
 * @returns {Array<{texto:string, accion:Function}>}
 */
function alertasDelDia(datosDeHoy) {
  const dia = datosDeHoy.dia || {};
  const alertas = [];

  if (dia.pases_reintentados > 0) {
    alertas.push({
      texto: pluralizar(dia.pases_reintentados, 'pase', 'pases') +
             ' que ya habían entrado, leídos otra vez',
      accion: () => abrirEscaner(),
    });
  }

  if (dia.mesas_total > 0 && dia.mesas_ocupadas >= dia.mesas_total) {
    alertas.push({
      texto: 'Todas las mesas tienen a alguien sentado',
      accion: () => verPlanoDeMesas(),
    });
  }

  const tareasAtrasadas = (datosDeHoy.pendientes || [])
    .filter(p => p.urgencia === 0 && p.tipo === 'tarea');
  if (tareasAtrasadas.length) {
    alertas.push({
      texto: pluralizar(tareasAtrasadas.length, 'tarea atrasada', 'tareas atrasadas'),
      accion: () => irASeccionDeEvento('tareas'),
    });
  }

  return alertas;
}

/**
 * El HTML de las alertas, si hay alguna.
 *
 * @param {Array} alertas - Lo que devuelve alertasDelDia().
 * @returns {string} HTML
 */
function bloqueAlertasDelDia(alertas) {
  if (!alertas.length) return '';

  return '<div class="tarjeta" style="border-color:var(--alerta);margin-top:var(--esp-2)">' +
    alertas.map((a, i) =>
      '<button class="lista__fila" data-hoy-alerta="' + i + '" style="padding:6px 0">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo" style="color:var(--alerta)">⚠ ' + seguro(a.texto) + '</span>' +
        '</span>' +
      '</button>'
    ).join('') +
  '</div>';
}
