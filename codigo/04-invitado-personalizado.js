/* ══════════════════════════════════════════════════════════════════════
   04 · DATOS EN LA PÁGINA E INVITADO PERSONALIZADO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos cosas, las dos sobre "rellenar" la página:

   A) VUELCA LOS DATOS DE LA CONFIGURACIÓN
      Toma todo lo que escribiste en 01-configuracion.js (la fecha, el
      lugar, el mensaje de los papás…) y lo escribe en el lugar que le
      corresponde dentro del index.html.

      Así la fecha se escribe UNA sola vez. Antes había que acordarse de
      cambiarla en cuatro lugares distintos y siempre quedaba alguno mal.

      En el HTML, los huecos a rellenar están marcados así:
          <span data-dato="fiesta.fechaEnPalabras"></span>
      Eso significa: "acá va CONFIGURACION.fiesta.fechaEnPalabras".

      Hay tres tipos de marca:
          data-dato   → rellena el TEXTO de adentro
          data-enlace → rellena el destino de un enlace (href)
          data-fuente → rellena el archivo de un iframe o un audio (src)

   B) SALUDA AL INVITADO POR SU NOMBRE
      Permite mandarle a cada uno un enlace propio:

          index.html?invitado=Familia+Pérez
          index.html?invitado=Tía+Marta
          index.html?invitado=Sofía+y+Nicolás

      La web lo saluda en el sobre y le deja el nombre ya escrito en el
      formulario. Reglas para armarlo:
        · los espacios se escriben con un signo +
        · las tildes y la ñ se escriben normal
        · si el nombre lleva &, reemplazalo por la palabra "y"

      Si el enlace no trae nombre, se muestra un saludo genérico y listo.

   ÍNDICE
     1. Leer un dato de la configuración
     2. Rellenar los huecos del HTML
     3. Saludar al invitado por su nombre
   ══════════════════════════════════════════════════════════════════════ */


/**
 * Nombre del invitado sacado del enlace, o null si el enlace no lo trae.
 * @type {string|null}
 */
let NOMBRE_DEL_INVITADO = null;


(function rellenaLaPagina() {

  /* ─── 1. LEER UN DATO DE LA CONFIGURACIÓN ──────────────────────────
     Recibe un "camino" en forma de texto y va bajando por el objeto de
     configuración hasta encontrar el valor.
     ---------------------------------------------------------------- */

  /**
   * Busca un valor dentro de CONFIGURACION siguiendo un camino.
   *
   * @param {string} camino - Los nombres separados por puntos.
   * @returns {*} El valor encontrado, o undefined si el camino no existe.
   *
   * @example
   *   obtenerDato('fiesta.nombre')          // → 'Ania'
   *   obtenerDato('lugar.nombre')           // → 'Salones de fiestas Alvi Toluca'
   *   obtenerDato('fiesta.no-existe')       // → undefined
   */
  function obtenerDato(camino) {
    /* .split('.') parte 'fiesta.nombre' en ['fiesta', 'nombre'].
       .reduce va entrando de a un escalón: primero CONFIGURACION.fiesta,
       y después .nombre de eso. El "?." evita que explote si en el medio
       no existe algo. */
    return camino.split('.').reduce(
      (nivelActual, escalon) => (nivelActual ? nivelActual[escalon] : undefined),
      CONFIGURACION
    );
  }


  /* ─── 2. RELLENAR LOS HUECOS DEL HTML ──────────────────────────── */

  // A) Textos
  buscarTodos('[data-dato]').forEach(elemento => {
    const valor = obtenerDato(elemento.dataset.dato);

    if (valor === undefined) {
      console.warn('No encontré este dato en la configuración:', elemento.dataset.dato);
      return;
    }

    /* Se usa innerHTML (y no textContent) porque algunos textos de la
       configuración traen <br> para cortar el renglón. Es seguro porque
       ese contenido lo escribimos nosotros, no viene de afuera. */
    elemento.innerHTML = valor;
  });

  // B) Enlaces (el destino de los botones)
  buscarTodos('[data-enlace]').forEach(elemento => {
    const direccion = obtenerDato(elemento.dataset.enlace);
    if (direccion) elemento.setAttribute('href', direccion);
  });

  // C) Archivos incrustados (el mapa y la canción)
  buscarTodos('[data-fuente]').forEach(elemento => {
    // Si ya tiene algo cargado, no lo pisamos (el audio se adelanta en
    // 03-sobre-de-apertura.js para poder precargarlo cuanto antes).
    if (elemento.getAttribute('src')) return;

    const direccion = obtenerDato(elemento.dataset.fuente);
    if (direccion) elemento.setAttribute('src', direccion);
  });


  /* ─── 3. SALUDAR AL INVITADO POR SU NOMBRE ─────────────────────────
     URLSearchParams es una herramienta del navegador que entiende la
     parte del enlace que va después del signo de pregunta. Convierte
     sola los + en espacios y descifra las tildes.
     ---------------------------------------------------------------- */
  const parametrosDelEnlace = new URLSearchParams(window.location.search);
  const nombreEnElEnlace = parametrosDelEnlace.get('invitado');

  if (nombreEnElEnlace && nombreEnElEnlace.trim() !== '') {
    NOMBRE_DEL_INVITADO = nombreEnElEnlace.trim();
  }

  // A) El saludo del sobre
  const saludoDelSobre = buscar('#saludo-del-sobre');
  if (saludoDelSobre) {
    if (NOMBRE_DEL_INVITADO) {
      // limpiarTexto() neutraliza cualquier código que alguien intentara
      // colar dentro del nombre (ver 02-utilidades.js).
      saludoDelSobre.innerHTML = 'Para ' + limpiarTexto(NOMBRE_DEL_INVITADO);
    } else {
      saludoDelSobre.textContent = CONFIGURACION.textos.saludoGenerico;
    }
  }

  // B) El campo del formulario, ya completado (igual lo puede corregir)
  const campoNombre = buscar('#campo-nombre');
  if (campoNombre && NOMBRE_DEL_INVITADO && campoNombre.value === '') {
    campoNombre.value = NOMBRE_DEL_INVITADO;
  }


  /* ─── 4. DESFASAR LOS DESTELLOS DE LOS BOTONES ─────────────────────
     Los botones dorados tienen una animación de brillo definida en el
     CSS. Si todos la arrancaran a la vez, destellarían sincronizados y se
     leería como un parpadeo del sistema. Acá se le da a cada uno un
     retardo distinto al azar, para que se lean como reflejos
     independientes y no como algo mecánico.

     (Las joyas del relicario ya no llevan animación propia: su destello
     lo dan los haces de luz al derivar sobre ellas. Ver la nota en
     estilos/04-portada.css.)

     Se usa Math.random() y no el azar con semilla a propósito: acá no
     interesa que se repita igual en cada visita, al contrario. */
  buscarTodos('.boton-dorado, .boton-carmesi').forEach(boton => {
    boton.style.setProperty('--retardo-del-destello', (Math.random() * 9).toFixed(2) + 's');
    boton.style.animationDelay = '';
  });

})();
