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

/**
 * Los datos de la invitación personalizada (?i=TOKEN), o null si nadie
 * usó un link de ese tipo. Los llena aplicarInvitacionPersonalizada()
 * de forma asíncrona (invitacion.php es un fetch, no puede estar listo
 * en el mismo instante en que corre este archivo) — codigo/11-formulario-
 * confirmacion.js escucha el evento 'invitacion-lista' en vez de leer
 * esta variable directamente, para no depender de una carrera de
 * tiempos entre los dos archivos.
 * @type {Object|null}
 */
let INVITACION = null;


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

  /* ─── 3b. INVITACIÓN PERSONALIZADA (?i=TOKEN) ──────────────────────
     A diferencia de ?invitado= (arriba), esto SÍ consulta el servidor:
     el token identifica un grupo real precargado desde el panel, con
     su cupo de lugares y —si se cargaron— los nombres de quienes lo
     integran. Ver admin/api/invitaciones.php e invitacion.php (raíz).

     Es aditivo: si no hay ?i= en el enlace, nada de este bloque corre y
     la página se comporta exactamente igual que siempre. */
  const token = parametrosDelEnlace.get('i');

  if (token && /^[a-f0-9]{8,}$/i.test(token)) {
    /* ⚡ EL FETCH SE CORRE UN CUADRO DESPUÉS (2026-08-30), NO EN LA MISMA
       EVALUACIÓN DEL SCRIPT. En Slow 4G, esta petición competía por ancho
       de banda contra la única descarga que de verdad bloquea el primer
       pintado: Cinzel Decorative 400 (ver codigo/03-sobre-de-apertura.js).
       Un requestAnimationFrame no cambia nada del resultado —el token no
       tiene apuro real, el saludo genérico ya se puso arriba y este fetch
       solo lo corrige cuando llega— pero le da a la fuente un cuadro de
       ventaja para arrancar primero. */
    /* ⚡ UN PROBLEMA DEL SERVIDOR NO ES UN LINK ROTO (2026-09-03)
     *
     * Antes acá solo se miraba `datos.ok !== true`, así que CUALQUIER
     * respuesta que no fuera un éxito —el freno por IP (429), una caída
     * de la base (500), un mantenimiento— le decía al invitado:
     *
     *     "No encontramos esta invitación. Vuelve a abrirlo desde el
     *      mensaje que te enviamos."
     *
     * Y volver a abrirlo generaba otra petición, que fallaba igual, con
     * el mismo cartel. Un callejón sin salida, y encima acusándolo a él
     * de tener mal el enlace cuando el problema era nuestro.
     *
     * Ahora se mira el código HTTP. Los errores pasajeros se reintentan
     * solos —dos veces, espaciando— y si igual no salen, el mensaje dice
     * la verdad y ofrece recargar. El 404 sigue siendo el único caso en
     * el que se le habla del enlace, porque es el único en el que el
     * enlace tiene de verdad algo que ver.
     */
    const ESPERAS_ENTRE_INTENTOS = [2000, 5000];

    /**
     * Pide la invitación al servidor, reintentando los fallos pasajeros.
     *
     * @param {number} intento - 0 el primero; crece con cada reintento.
     * @returns {void}
     */
    function pedirLaInvitacion(intento) {
      fetch('invitacion.php?accion=ver&token=' + encodeURIComponent(token))
        .then(respuesta => {
          const ocupado = respuesta.status === 429;
          const caido = respuesta.status >= 500;

          if (ocupado || caido) {
            const esperar = ESPERAS_ENTRE_INTENTOS[intento];
            if (esperar !== undefined) {
              setTimeout(() => pedirLaInvitacion(intento + 1), esperar);
              // Se corta la cadena: el reintento se encarga del resultado.
              return null;
            }
            dispararEventoQueQuizasLleguenTarde('invitacion-sin-acceso',
              { motivo: ocupado ? 'servidor-ocupado' : 'servidor-caido' });
            return null;
          }

          return respuesta.json();
        })
        .then(datos => {
          // null = ya se resolvió arriba (reintento en curso o aviso dado).
          if (datos === null) return;

          if (!datos || datos.ok !== true) {
            // El token no corresponde a ninguna invitación viva.
            dispararEventoQueQuizasLleguenTarde('invitacion-sin-acceso',
              { motivo: 'no-encontrada' });
            return;
          }

          INVITACION = datos;

          // El saludo del sobre se corrige con el nombre real del grupo,
          // pisando el genérico (o el de ?invitado=) que ya se puso arriba.
          if (saludoDelSobre) {
            saludoDelSobre.innerHTML = 'Para ' + limpiarTexto(datos.nombre);
          }

          /* 11-formulario-confirmacion.js escucha esto para reemplazar el
             formulario en blanco por la lista de personas del grupo.

             ⚡ SE DISPARA CON MEMORIA (2026-09-02), Y ESTO ARREGLA UN BUG
             REAL. Este archivo es "core": corre al abrir la página, mucho
             antes del clic. El 11, en cambio, se inyecta RECIÉN en el clic
             (ver iniciarInyeccionDeLaEscena en 02-utilidades.js). O sea que
             para cuando el 11 registraba su escucha, este evento ya había
             pasado hacía rato y se lo perdía: el invitado abría su link
             personal y veía igual el formulario genérico en blanco, sin sus
             nombres ni sus lugares. El comentario del 11 que justificaba
             escuchar el evento ("todavía no hay respuesta del fetch")
             describía cómo cargaban los archivos ANTES de diferir la
             escena al clic; quedó viejo y nadie lo notó. */
          dispararEventoQueQuizasLleguenTarde('invitacion-lista', datos);
        })
        .catch(error => {
          /* Sin conexión. NO es lo mismo que "este link no vale": puede ser
             un invitado legítimo con una red mala, así que se lo trata
             aparte para no acusarlo de nada y pedirle que recargue. */
          console.warn('No se pudo cargar la invitación personalizada:', error);

          // La red también se reintenta: el wifi que parpadea un segundo
          // es más común que el que se cae del todo.
          const esperar = ESPERAS_ENTRE_INTENTOS[intento];
          if (esperar !== undefined) {
            setTimeout(() => pedirLaInvitacion(intento + 1), esperar);
            return;
          }

          dispararEventoQueQuizasLleguenTarde('invitacion-sin-acceso',
            { motivo: 'sin-conexion' });
        });
    }

    requestAnimationFrame(() => pedirLaInvitacion(0));
  } else {
    /* ⚡ SIN LINK PERSONAL NO HAY FORMULARIO (2026-09-02). Las invitaciones
       son nominales y con cupo real: cada grupo familiar tiene su propio
       enlace. Un formulario en blanco donde cualquiera con la dirección
       puede anotarse contradice las dos cosas. Se avisa acá y el 11
       reemplaza el formulario por un mensaje. */
    dispararEventoQueQuizasLleguenTarde('invitacion-sin-acceso',
      { motivo: 'sin-link' });
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
