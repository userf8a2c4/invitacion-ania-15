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
let VISTA_ACTUAL = 'resumen';

/** Qué vistas ya pidieron sus datos alguna vez. */
const VISTAS_CARGADAS = {};

/**
 * Los títulos del encabezado y quién dibuja cada vista.
 *
 * Tener esto en una tabla y no en un montón de "if" hace que agregar una
 * vista nueva sea agregar un renglón acá.
 */
const VISTAS = {
  resumen:   { titulo: 'Resumen',   dibujar: () => dibujarResumen() },
  /* La clave sigue siendo 'invitados' porque la usan los atajos del
     icono y ensuciarVistas(). Lo que se ve en pantalla es "Gente", y
     adentro están las confirmaciones y la agenda de contactos. */
  invitados: { titulo: 'Gente',     dibujar: () => dibujarGente() },
  correo:    { titulo: 'Correo',    dibujar: () => dibujarCorreo() },
  /* La clave interna sigue siendo 'dinero' —la usan la URL de los
     atajos del icono y las llamadas a ensuciarVistas()— pero lo que se
     lee en pantalla es "Presupuesto". */
  dinero:    { titulo: 'Presupuesto', dibujar: () => dibujarDinero() },
  evento:    { titulo: 'Evento',    dibujar: () => dibujarEvento() },
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

  // Y en los botones de abajo.
  buscarTodos('.navegacion__boton').forEach(boton => {
    boton.classList.toggle('activa', boton.dataset.ir === cual);
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

  /* ─── El menú de los tres puntitos ─────────────────────────────── */

  const menu  = buscar('#menu');
  const boton = buscar('#boton-menu');

  boton.addEventListener('click', evento => {
    evento.stopPropagation();
    menu.classList.toggle('oculto');
  });

  // Tocar en cualquier otro lado lo cierra.
  document.addEventListener('click', () => menu.classList.add('oculto'));
  menu.addEventListener('click', evento => evento.stopPropagation());

  buscarTodos('.menu__opcion').forEach(opcion => {
    opcion.addEventListener('click', () => {
      menu.classList.add('oculto');
      atenderMenu(opcion.dataset.menu);
    });
  });

  /* ─── La tecla Escape cierra lo que esté abierto ────────────────── */
  document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    if (!menu.classList.contains('oculto')) { menu.classList.add('oculto'); return; }
    cerrarHoja();
  });
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
  }
}
