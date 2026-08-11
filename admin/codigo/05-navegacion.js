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
     atajos del icono y las llamadas a ensuciarVistas()— pero lo que se
     lee en pantalla es "Presupuesto". */
  dinero:    { titulo: 'Presupuesto', dibujar: () => dibujarDinero() },
  /* alVolver corre al entrar a una vista que YA estaba dibujada. Evento
     lo usa para volver a su índice: si uno dejó abierta una sección y
     se fue a otra pestaña, al regresar tiene que ver el índice otra vez
     —si no, el encabezado diría "Evento" y el cuerpo mostraría "Música"—.
     No va al servidor: solo repinta lo que ya está en memoria. */
  evento:    { titulo: 'Evento',    dibujar: () => dibujarEvento(),
               alVolver: () => volverAlIndiceDeEvento() },
};

/* Gente, Correo, Presupuesto y Evento ya no tienen botón propio en la
   barra: se llega a ellos desde Planificar. Para que la barra no se
   quede sin ninguna pestaña marcada al entrar a uno de esos —lo que se
   vería como "me perdí"—, esta tabla dice qué botón de abajo hay que
   dejar encendido en su lugar. */
const PADRE_DE_VISTA = {
  invitados: 'planificar',
  correo:    'planificar',
  dinero:    'planificar',
  evento:    'planificar',
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
function irA(cual, recargar) {
  const vista = VISTAS[cual];
  if (!vista) return;

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

  /* ─── La tecla Escape cierra lo que esté abierto ────────────────── */
  document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    cerrarHoja();
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
    'el-dia':      'Modo día del evento',
    'escanear':    'Escanear pases',
    'compartir':   'Compartir con proveedores',
    'importar':    'Importar desde una hoja de cálculo',
    'alarmas':     'Alarmas',
    'bitacora':    'Historial de cambios',
    'cuenta':      'Mi cuenta',
    'usuarios':    'Personas con acceso',
    'nuevo-admin': 'Agregar administrador',
    'avisos':      'Avisos y recordatorios',
    'etiquetas':   'Cambiar los nombres',
    'colores':     'Colores del panel',
    'fab-config':  'Mis herramientas rápidas',
    'comandos-asistente': 'Comandos del asistente',
    'instalar':    'Instalar en la pantalla de inicio',
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

    case 'colores':
      abrirHojaDePaleta();
      break;

    case 'escanear':
      abrirEscaner();
      break;

    case 'fab-config':
      abrirConfiguracionDelFab();
      break;

    case 'comandos-asistente':
      abrirComandosDelAsistente();
      break;
  }
}
