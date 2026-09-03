/* ══════════════════════════════════════════════════════════════════════
   05 · NAVEGACIÓN

   QUÉ HACE ESTE ARCHIVO
   Cambiar de pestaña, poner el título del encabezado, y manejar el menú
   de los tres puntitos.

   CÓMO FUNCIONA EL CAMBIO DE VISTA
   Las cinco vistas están todas en el HTML desde el principio. Cambiar de
   pestaña es solo mover la clase "activa" de una a otra: por eso es
   instantáneo y no parpadea, a diferencia de cargar una página nueva.

   CADA VISTA SE CARGA LA PRIMERA VEZ QUE SE ABRE
   No al arrancar. Si al abrir la app se pidieran los datos de las cinco,
   serían cinco viajes al servidor de los que se mira uno solo. Se pide
   lo que se va a ver, cuando se va a ver.
   ══════════════════════════════════════════════════════════════════════ */


/** Cuál pestaña se está viendo. */
let VISTA_ACTUAL = 'hoy';

/** Cuándo se entró a la vista actual (Fase 8: cuánto dura cada una). */
let VISTA_ENTRO_EN = null;

/** Qué vistas ya pidieron sus datos alguna vez. */
const VISTAS_CARGADAS = {};

/**
 * Los títulos del encabezado y quién dibuja cada vista.
 *
 * Tener esto en una tabla y no en un montón de "if" hace que agregar una
 * vista nueva sea agregar un renglón acá.
 *
 * SIGUEN ESTANDO LAS OCHO, NO SOLO LAS CUATRO DE LA BARRA DE ABAJO.
 * Resumen, Gente, Correo, Presupuesto y Evento ya no tienen botón
 * propio abajo desde el rediseño — se llega a ellas desde Planificar,
 * desde los accesos de Resumen, o desde un atajo del icono de la app
 * (?ir=dinero). irA() no distingue "pestaña de la barra" de "pestaña a
 * la que se llega desde otra": para el resto del código no cambió
 * nada.
 */
const VISTAS = {
  /* "Hoy" es la puerta de entrada ahora: qué está pasando y qué hay
     que hacer en este momento. Ver codigo/30-vista-hoy.js. */
  hoy:       { titulo: 'Hoy',       dibujar: () => dibujarHoy() },
  resumen:   { titulo: 'Resumen',   dibujar: () => dibujarResumen() },
  /* El índice de herramientas: Gente, Mesas, Dinero, Correo, Tareas,
     Contactos… todo lo que antes eran pestañas sueltas. Ver
     codigo/31-vista-planificar.js. */
  planificar:{ titulo: 'Planificar', dibujar: () => dibujarPlanificar() },
  /* Lo que antes era el menú de los tres puntitos, ahora como pestaña
     en vez de hoja — mismo contenido, mismo atenderMenu(). Ver
     codigo/05-navegacion.js más abajo, dibujarMas(). */
  mas:       { titulo: 'Más',       dibujar: () => dibujarMas() },

  /* La clave sigue siendo 'invitados' porque la usan los atajos del
     icono y ensuciarVistas(). Lo que se ve en pantalla es "Gente", y
     adentro están las confirmaciones y la agenda de contactos. */
  invitados: { titulo: 'Gente',     dibujar: () => dibujarGente() },
  correo:    { titulo: 'Correo',    dibujar: () => dibujarCorreo() },
  /* La clave interna sigue siendo 'dinero' —la usan la URL de los
     atajos del icono y las llamadas a ensuciarVistas()— y lo que se lee
     en pantalla dice lo mismo.

     ⚡ SE LLAMA "DINERO" EN LOS DOS LADOS (2026-09-02). El acceso del
     índice decía "Dinero" (07-vista-resumen.js:256) y el encabezado de
     adentro decía "Presupuesto": dos nombres para el mismo lugar obligan
     a traducir mentalmente cada vez que se entra. Se deja la palabra más
     simple y la que ya se usa para nombrarlo en voz alta. Adentro sigue
     habiendo un presupuesto, claro, pero es UNA de las cosas que vive
     acá —junto con gastos, pagos y recibos—, no el nombre del lugar. */
  dinero:    { titulo: 'Dinero', dibujar: () => dibujarDinero() },
  /* alVolver corre al entrar a una vista que YA estaba dibujada. Evento
     lo usa para volver a su índice: si uno dejó abierta una sección y
     se fue a otra pestaña, al regresar tiene que ver el índice otra vez
     —si no, el encabezado diría "Evento" y el cuerpo mostraría "Música"—.
     No va al servidor: solo repinta lo que ya está en memoria. */
  evento:    { titulo: 'Evento',    dibujar: () => dibujarEvento(),
               alVolver: () => volverAlIndiceDeEvento() },
};

/* ⚡ LA BARRA CAMBIÓ: Hoy · Gente · Dinero · Más (2026-09-03).
   Antes era Hoy · Resumen · Planificar · Más, y eso costaba un toque fijo en
   TODAS las tareas del día a día: Gente, Dinero, Correo y Evento no tenían
   botón propio y había que pasar por el índice de Planificar para llegar a
   ellos. Contado sobre las tareas reales de Lucila, ese peaje era la mitad de
   lo que sobraba: agregar un invitado eran 4 toques, marcar un pago 4,
   mandar un link 4 — todos con un primer toque que no hacía nada más que
   abrir una lista de enlaces.

   Con la barra nueva, los dos destinos donde de verdad se trabaja todos los
   días están a un toque. "Resumen" se fundió en Hoy (una sola pantalla de
   inicio) y "Planificar" dejó de ser peaje: sus destinos están abajo o entre
   los accesos de Hoy. Las dos vistas siguen existiendo y siguen siendo
   alcanzables por código, para no romper irA('resumen'), los atajos del
   icono ni nada que las nombre.

   Esta tabla dice, para una vista sin botón propio, cuál encender en su
   lugar: si no, la barra se queda sin ninguna pestaña marcada, que se lee
   como "me perdí". */
const PADRE_DE_VISTA = {
  resumen:    'hoy',
  planificar: 'mas',
  correo:     'mas',
  evento:     'mas',
};


/* ─── IR A UNA VISTA ───────────────────────────────────────────────── */

/**
 * Cambia de pestaña.
 *
 * @param {string} cual - 'resumen', 'invitados'…
 * @param {boolean} [recargar=false] - Pedir los datos aunque ya se
 *                                     hayan pedido antes.
 * @returns {void}
 */
function irA(cual, recargar, desdeElHistorial) {
  const vista = VISTAS[cual];
  if (!vista) return;

  /* ⚡ EL BOTÓN "ATRÁS" DEL TELÉFONO CERRABA LA APP (2026-09-03).
     No había ni un pushState en toda la navegación: para el navegador, ir de
     Hoy a Gente no era ir a ningún lado. Así que el gesto más usado de
     Android —deslizar desde el borde para volver— no volvía a la pestaña
     anterior: salía del panel. Y como no se guardaba la vista, al reabrir
     había que rehacer el camino entero.

     Cada cambio de vista deja ahora una marca en el historial, y el gesto de
     atrás la recorre. La primera vista no empuja nada, la reemplaza: si no,
     el primer "atrás" llevaría a una pantalla que nadie llegó a ver.

     `desdeElHistorial` lo pone el propio popstate (más abajo) para no volver
     a empujar lo que se acaba de sacar, que sería un bucle. */
  if (!desdeElHistorial && window.history) {
    try {
      const marca = { vista: cual };
      if (!history.state || !history.state.vista) {
        history.replaceState(marca, '');
      } else if (VISTA_ACTUAL !== cual) {
        history.pushState(marca, '');
      }
    } catch (error) {
      // Historial no disponible: la app sigue funcionando igual que antes.
    }
  }

  // Fase 8: cuánto duró la pantalla que se deja. irA() es el único
  // lugar por donde se cambia de vista, así que un solo gancho acá
  // cubre las ocho sin instrumentar cada dibujarX() por separado.
  if (VISTA_ACTUAL && VISTA_ENTRO_EN) {
    const segundos = Math.round((Date.now() - VISTA_ENTRO_EN) / 1000);
    if (segundos >= 1) {
      registrarEvento('vista', 'permanencia', { pantalla: VISTA_ACTUAL, segundos: segundos });
    }
  }
  VISTA_ENTRO_EN = Date.now();

  VISTA_ACTUAL = cual;

  // Mover la clase "activa" en las secciones.
  buscarTodos('.vista').forEach(seccion => {
    seccion.classList.toggle('activa', seccion.dataset.vista === cual);
  });

  // Y en los botones de abajo. Si "cual" no tiene botón propio (Gente,
  // Correo, Presupuesto, Evento), se enciende el de su padre.
  const paraLaBarra = PADRE_DE_VISTA[cual] || cual;
  buscarTodos('.navegacion__boton').forEach(boton => {
    boton.classList.toggle('activa', boton.dataset.ir === paraLaBarra);
  });

  ponerTitulo(vista.titulo);

  // El contenido vuelve arriba: si se venía de scrollear la lista de
  // invitados, la vista nueva no debe abrirse por la mitad.
  buscar('#contenido').scrollTo({ top: 0 });

  // Evento 1 de 10 del panel de métricas (Fase 7): qué pantallas se
  // visitan y con qué frecuencia. Un solo gancho acá cubre TODAS las
  // vistas, en vez de instrumentar cada dibujarX() por separado.
  registrarEvento('vista', cual);

  if (recargar || !VISTAS_CARGADAS[cual]) {
    VISTAS_CARGADAS[cual] = true;
    const resultado = vista.dibujar();
    // Si la vista falla al cargar, se marca como no cargada para que
    // vuelva a intentarlo la próxima vez que se entre.
    if (resultado && typeof resultado.catch === 'function') {
      resultado.catch(() => { VISTAS_CARGADAS[cual] = false; });
    }
  } else if (vista.alVolver) {
    // Ya estaba dibujada: se le avisa por si tiene que reacomodarse.
    vista.alVolver();
  }

  // C1/C2: no hay un sistema de suscriptores para "cambió de vista", así
  // que se llama directo desde el único lugar real donde eso pasa. Hoy
  // es quien trae los datos de la campana (hoy.php.pendientes), así que
  // conviene refrescar el número cada vez que se navega, no solo al
  // entrar a Hoy.
  if (typeof actualizarBurbujaCampana === 'function') actualizarBurbujaCampana();

  // Novedades (40-novedades.js): un solo gancho acá cubre las ocho
  // pantallas, igual que la campana de arriba. Va al final, después de
  // pedir dibujar la vista: sus elementos tienen que existir ya (o
  // reintenta solo un rato si la vista todavía está cargando datos).
  if (typeof mostrarNovedadesDePantalla === 'function') mostrarNovedadesDePantalla(cual);
}

/**
 * Marca una vista para que vuelva a pedir sus datos al abrirse.
 *
 * Se usa después de guardar algo: por ejemplo, al crear un gasto hay que
 * refrescar también el Resumen, porque sus totales cambiaron.
 *
 * @param {...string} cuales
 * @returns {void}
 */
function ensuciarVistas(...cuales) {
  cuales.forEach(cual => { VISTAS_CARGADAS[cual] = false; });
}

/**
 * Cambia el título y el subtítulo del encabezado.
 *
 * @param {string} titulo
 * @param {string} [subtitulo]
 * @returns {void}
 */
function ponerTitulo(titulo, subtitulo) {
  buscar('#titulo-vista').textContent = titulo;

  const bajo = buscar('#subtitulo-vista');
  bajo.textContent = subtitulo || '';
  bajo.classList.toggle('oculto', !subtitulo);
}

/**
 * Pone el contador de días en el encabezado — el único detalle en oro
 * persistente que pide el brief de Lucila, aparte del subtítulo de
 * cada pantalla (que cada una pisa con lo suyo). Se calcula una sola
 * vez con diasParaLaFiesta() (02-utilidades.js) — la MISMA que ya usa
 * Hoy (30-vista-hoy.js), que compara a medianoche y no el instante
 * crudo, para que "faltan 3 días" no cambie a "faltan 2" a media
 * mañana. Lee CONFIGURACION.fiesta sin pedirle nada al servidor.
 *
 * @returns {void}
 */
function actualizarContadorDeDias() {
  const nodo = buscar('#contador-dias');
  if (!nodo) return;

  const dias = diasParaLaFiesta();
  if (dias === null || dias === undefined || Number.isNaN(dias)) {
    nodo.classList.add('oculto');
    return;
  }

  nodo.textContent = textoDeCuentaAtras(dias);
  nodo.classList.remove('oculto');
}


/* ─── ENGANCHAR LOS BOTONES ────────────────────────────────────────── */

/**
 * Prepara la navegación de abajo y el menú.
 *
 * @returns {void}
 */
function prepararNavegacion() {

  buscarTodos('.navegacion__boton').forEach(boton => {
    boton.addEventListener('click', () => {
      // Tocar la pestaña donde ya se está recarga los datos. Es el gesto
      // que la gente espera de una app y evita tener que buscar un botón
      // de refrescar escondido en algún menú.
      irA(boton.dataset.ir, boton.dataset.ir === VISTA_ACTUAL);
    });
  });

  /* ─── Sincronizar a mano ─────────────────────────────────────────── */
  const botonSync = buscar('#boton-sincronizar');
  if (botonSync) {
    botonSync.addEventListener('click', () => sincronizarAhora(botonSync));
  }

  /* ─── La campana ──────────────────────────────────────────────────── */
  const botonCampana = buscar('#boton-campana');
  if (botonCampana && typeof abrirBandejaDeAvisos === 'function') {
    botonCampana.addEventListener('click', () => abrirBandejaDeAvisos());
  }

  /* ─── La tecla Escape cierra lo que esté abierto ────────────────── */
  document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    cerrarHoja();
  });

  /* ─── El gesto de "atrás" del teléfono ──────────────────────────────
     Ver la nota grande en irA(). Dos comportamientos, en este orden:

     1. Si hay una hoja abierta (una ficha, un formulario), atrás la CIERRA
        y la vista no se mueve. Es lo que hace cualquier app, y evita el
        caso peor: estar llenando un formulario, hacer atrás por reflejo
        para corregir algo, y que se cierre el panel entero. Como la vista
        no cambió, se devuelve al historial la marca que se acaba de sacar.
        Ojo: cerrarHoja() puede preguntar si hay algo escrito sin guardar;
        si se cancela, la hoja se queda abierta y el historial ya quedó
        consistente igual.

     2. Si no hay nada abierto, se va a la vista anterior. */
  window.addEventListener('popstate', evento => {
    const hoja = buscar('#hoja');
    if (hoja && !hoja.classList.contains('oculto')) {
      try { history.pushState({ vista: VISTA_ACTUAL }, ''); } catch (error) { /* nada */ }
      cerrarHoja();
      return;
    }

    const cual = (evento.state && evento.state.vista) || 'hoy';
    irA(cual, false, true);
  });
}

/**
 * Pinta la pestaña "Más": todo lo que antes era el menú de los tres
 * puntitos, ahora como una pestaña más en vez de una hoja que tapaba
 * la pantalla. Mismo patrón que el índice de Evento: grupos con
 * título y una línea que dice qué hace cada opción.
 *
 * El menú se acorta solo: las filas marcadas 'soloAdmin' no aparecen
 * si quien mira no es administradora, y "Instalar" solo aparece si el
 * teléfono puede.
 *
 * @returns {void}
 */
function dibujarMas() {
  const vista = buscar('#vista-mas');
  // Si la sesión venció justo mientras se tocaba "Más", USUARIO ya
  // puede estar en null: manejarSesionVencida() (03-servidor.js) se
  // encarga de mandar al login, así que acá no hay nada que pintar.
  if (!vista || !USUARIO) return;

  const esAdmin = USUARIO.rol === 'admin';

  const yaInstalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const puedeInstalar = !yaInstalada && (!!INVITACION_A_INSTALAR || esIOS);

  const grupos = CONFIGURACION.indiceDelMenu
    .map(grupo => ({
      titulo: grupo.titulo,
      filas: grupo.filas
        .filter(fila => !fila[2] || esAdmin)                    // soloAdmin
        .filter(fila => fila[0] !== 'instalar' || puedeInstalar)
        // Panel de métricas: solo la cuenta observadora, ni siquiera
        // otra cuenta admin (ver esObservador(), api/_lib/sesion.php).
        .filter(fila => fila[0] !== 'metricas' || USUARIO.es_observador)
        .map(fila => ({
          clave: fila[0],
          nombre: nombreDeOpcionDeMenu(fila[0]),
          descripcion: fila[1],
        })),
    }))
    .filter(grupo => grupo.filas.length);

  vista.innerHTML = '<div id="indice-mas"></div>' +
    '<button class="boton boton--peligro boton--ancho" id="mas-salir" ' +
            'style="margin-top:var(--esp-3)">Cerrar sesión</button>';

  pintarIndice(buscar('#indice-mas', vista), grupos, clave => atenderMenu(clave));

  buscar('#mas-salir', vista).addEventListener('click', () => salir());
}

/**
 * El nombre visible de cada opción del menú. Vive separado de
 * indiceDelMenu porque esa tabla ya usa la primera posición para la
 * clave y la segunda para la descripción — un tercer texto ahí
 * hubiera hecho ilegible cada renglón.
 *
 * @param {string} clave
 * @returns {string}
 */
function nombreDeOpcionDeMenu(clave) {
  const nombres = {
    'resumen':     'Resumen',
    'planificar':  'Todas las herramientas',
    'el-dia':      'Modo día del evento',
    'escanear':    'Escanear pases',
    'compartir':   'Compartir con proveedores',
    'importar':    'Importar desde una hoja de cálculo',
    'etiquetas_acomodo': 'Etiquetas',
    'alarmas':     'Alarmas',
    'bitacora':    'Historial de cambios',
    'cuenta':      'Mi cuenta',
    'usuarios':    'Personas con acceso',
    'nuevo-admin': 'Agregar administrador',
    'avisos':      'Avisos y recordatorios',
    'etiquetas':   'Cambiar los nombres',
    'colores':     'Colores del panel',
    'fab-config':  'Mis herramientas rápidas',
    'megabot':     'MegaBot',
    'comandos-asistente': 'Comandos del asistente',
    'respaldo':    'Estado del respaldo',
    'instalar':    'Instalar en la pantalla de inicio',
    'metricas':    'Métricas de uso',
  };
  return nombres[clave] || clave;
}

/**
 * Qué hace cada opción del menú.
 *
 * @param {string} opcion
 * @returns {void}
 */
function atenderMenu(opcion) {
  switch (opcion) {
    /* Las dos vistas que perdieron su botón de la barra. Son vistas de
       verdad, no hojas: se va a ellas con irA(), y el gesto de atrás
       devuelve a Más como a cualquier otra. */
    case 'resumen':
      irA('resumen');
      break;

    case 'planificar':
      irA('planificar');
      break;

    case 'salir':
      salir();
      break;

    case 'instalar':
      instalarLaApp();
      break;

    case 'cuenta':
      abrirHojaDeCuenta();
      break;

    case 'usuarios':
      abrirHojaDeUsuarios();
      break;

    case 'nuevo-admin':
      abrirHojaDeNuevoAdministrador();
      break;

    case 'importar':
      abrirImportador();
      break;

    case 'etiquetas_acomodo':
      abrirEtiquetasAcomodo();
      break;

    case 'compartir':
      abrirCompartir();
      break;

    case 'el-dia':
      abrirModoDelDia();
      break;

    case 'alarmas':
      abrirAlarmas();
      break;

    case 'etiquetas':
      abrirEtiquetas();
      break;

    case 'avisos':
      abrirHojaDeAvisos();
      break;

    case 'bitacora':
      abrirHojaDeBitacora();
      break;

    case 'respaldo':
      abrirHojaDeRespaldo();
      break;

    case 'colores':
      abrirHojaDePaleta();
      break;

    case 'escanear':
      abrirEscaner();
      break;

    case 'fab-config':
      abrirConfiguracionDelFab();
      break;

    case 'megabot':
      abrirConfiguracionMegaBot();
      break;

    case 'comandos-asistente':
      abrirComandosDelAsistente();
      break;

    case 'metricas':
      abrirMetricas();
      break;
  }
}
