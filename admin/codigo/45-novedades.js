/* ══════════════════════════════════════════════════════════════════════
   45 · NOVEDADES

   QUÉ HACE ESTE ARCHIVO
   Cuando se agrega algo nuevo al panel (un botón, una pantalla), un
   globito chico apunta a ESE elemento puntual y lo explica en una
   frase — nada de un tour de bienvenida con diez pasos ni un manual.
   "1/3 ahora puedes hacer esto", "2/3 para eso, toca aquí"…, terminando
   en un botón "Entendido". La próxima vez que se abra la app, esas
   mismas novedades ya no vuelven a aparecer.

   CÓMO SE AGREGA UNA NOVEDAD NUEVA
   Un renglón más en NOVEDADES, ahí abajo: un id único (que no se
   repita nunca, ni se reutilice), a qué pantalla pertenece, qué
   elemento señalar (un selector de CSS) y el texto. Nada más — el
   resto de este archivo ya se encarga de mostrarlo, contarlo, y
   recordar que ya se vio.

   CÓMO SE DECIDE QUÉ PANTALLA ES CADA UNA
   'login' es especial: se muestra en la pantalla de entrada, antes de
   tener sesión. El resto usa las mismas claves que ya usa irA()
   ('hoy', 'resumen', 'planificar', 'mas', 'dinero'…) — ver VISTAS en
   05-navegacion.js.

   POR QUÉ SE GUARDA POR CUENTA Y NO POR TELÉFONO A SECAS
   Lucila y Carlos comparten a veces el mismo teléfono de otro (por
   ejemplo, alguien mostrando el panel en su celular). Guardarlo por
   cuenta (el id de USUARIO) evita que lo que ya vio uno tape lo que
   todavía no vio el otro. Antes de entrar (pantalla de login) no hay
   cuenta todavía: se usa una clave genérica para ese caso puntual.

   POR QUÉ NO ES UN TOUR DE VARIAS PANTALLAS
   Encadenar pasos que saltan de pantalla en pantalla es frágil (hay
   que navegar sola la app, esperar que cargue, con animaciones de por
   medio) y se siente más a "tutorial obligatorio" que a un aviso
   liviano. Cada novedad vive en SU pantalla, y aparece sola cuando esa
   pantalla se abre — si hay dos novedades nuevas en pantallas
   distintas, cada una aparece a su tiempo, la primera vez que se pasa
   por ahí.
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. EL CATÁLOGO ──────────────────────────────────────────────── */

/**
 * @typedef {Object} Novedad
 * @property {string} id        - Único y estable. Nunca se reutiliza.
 * @property {string} pantalla  - 'login', o una clave de VISTAS.
 * @property {string} selector  - A qué elemento apunta (querySelector).
 * @property {string} texto     - La explicación, en una frase simple.
 */

/** @type {Novedad[]} */
const NOVEDADES = [
  {
    id: 'v56-olvide-contrasena',
    pantalla: 'login',
    selector: '#entrada-olvide',
    texto: 'Nuevo: si se te olvida la contraseña, ahora la puedes recuperar tú misma desde acá, sin depender de nadie más.',
  },
  {
    id: 'v56-estado-respaldo',
    pantalla: 'mas',
    // El mismo atributo que ya usa pintarIndice() (06-piezas.js) para
    // cada fila del menú — no hizo falta agregar ninguno nuevo.
    selector: '[data-indice="respaldo"]',
    texto: 'Nuevo: acá ves cuándo se guardó la última copia de seguridad de todo (con los archivos adjuntos incluidos) y puedes mandar una nueva cuando quieras, con un toque.',
  },
  {
    id: 'v58-comandos-asistente',
    pantalla: 'mas',
    selector: '[data-indice="comandos-asistente"]',
    texto: 'Nuevo: acá abajo puedes enseñarle al asistente tu propia jerga cariñosa (como "abacho") y las frases que te gusta que te digan — las va a usar cuando se las escribas en el chat.',
  },
  {
    /* El botón cambió lo que hace con un toque, y eso es justo lo que
       este sistema existe para decir: antes abría el chat, ahora abre
       tus herramientas. Sin este aviso, quien lo usaba para escribirle a
       MegaBot toca y aparece otra cosa. */
    id: 'v60-boton-redondo-herramientas',
    pantalla: 'hoy',
    selector: '#boton-accion',
    texto: 'Este botón cambió: ahora un toque abre tus tres herramientas rápidas — antes había que mantenerlo apretado y nadie lo sabía. MegaBot sigue ahí, abajo de las tres.',
  },
  /* ⚡ ACÁ ESTABA 'v59-reglas-de-acomodo' (retirada el 2026-09-09).
     Declaraba `pantalla: 'mesas'`, y 'mesas' NO es una clave de VISTAS:
     Mesas es una sección DENTRO de la vista 'invitados'. Como
     mostrarNovedadesDePantalla() solo se llama con 'login' o con una
     clave de VISTAS (dos llamadas en todo el panel), esa novedad no se
     mostró nunca, ni una vez, desde que se escribió.

     No se reapuntó a 'invitados': ahí el selector #mesa-reglas tampoco
     existe salvo que se esté justo en la sección Mesas, y en ese caso
     intentarPintar() se rinde y la marca como vista EN SILENCIO —o sea,
     la quema igual—. Y de fondo: explicaba el cambio de nombre de un
     botón de hace tres versiones, que a esta altura Lucila ya vio.

     ⚠️ LÍMITE QUE HAY QUE CONOCER ANTES DE ESCRIBIR OTRA:
     una novedad solo puede apuntar a algo que esté visible cuando su
     VISTA se abre. Para algo que vive dentro de una sección (Mesas,
     Regalos, Foráneos, Contactos, o una sub-pestaña de Dinero) no hay
     forma de dispararla, y el sistema no avisa: se marca como vista y
     desaparece. Lo comprueba herramientas/prueba-navegacion.mjs, que
     falla si una `pantalla` no es 'login' ni una clave de VISTAS. */
];


/* ─── 2. QUÉ YA SE VIO ────────────────────────────────────────────── */

/**
 * La clave de localStorage para esta cuenta. 'anon' antes de entrar.
 *
 * @returns {string}
 */
function claveDeNovedadesVistas() {
  return 'novedades_vistas_' + (typeof USUARIO !== 'undefined' && USUARIO && USUARIO.id
    ? USUARIO.id : 'anon');
}

/**
 * @returns {Set<string>}
 */
function novedadesVistas() {
  try {
    const guardado = localStorage.getItem(claveDeNovedadesVistas());
    return new Set(guardado ? JSON.parse(guardado) : []);
  } catch (error) {
    return new Set();
  }
}

/**
 * @param {string} id
 * @returns {void}
 */
function marcarNovedadComoVista(id) {
  try {
    const vistas = novedadesVistas();
    vistas.add(id);
    localStorage.setItem(claveDeNovedadesVistas(), JSON.stringify(Array.from(vistas)));
  } catch (error) {
    // Sin localStorage (modo privado, etc.): la novedad se repite la
    // próxima vez. Molesta menos que una excepción que rompa la vista.
  }
}


/* ─── 3. MOSTRARLAS ───────────────────────────────────────────────── */

/** Cuántas veces reintentar encontrar el elemento antes de rendirse —
    para pantallas que todavía están cargando sus datos por su cuenta. */
const NOVEDAD_REINTENTOS = 6;
const NOVEDAD_ESPERA_MS = 400;

/**
 * Muestra, en secuencia, las novedades pendientes de una pantalla.
 * No hace nada si ya se vieron todas, o si ninguna aplica acá.
 *
 * @param {string} pantalla
 * @returns {void}
 */
function mostrarNovedadesDePantalla(pantalla) {
  const vistas = novedadesVistas();
  const pendientes = NOVEDADES.filter(n => n.pantalla === pantalla && !vistas.has(n.id));
  if (!pendientes.length) return;

  // Si otro globo ya está en pantalla (de una navegación previa que se
  // solapó), no se apilan dos: se espera a que termine.
  const contenedor = buscar('#novedad');
  if (!contenedor || !contenedor.classList.contains('oculto')) return;

  mostrarSecuenciaDeNovedades(pendientes);
}

/**
 * @param {Novedad[]} lista
 * @returns {void}
 */
function mostrarSecuenciaDeNovedades(lista) {
  const contenedor = buscar('#novedad');
  const tarjeta     = buscar('.novedad__tarjeta', contenedor);
  const flecha      = buscar('#novedad-flecha');
  const contador    = buscar('#novedad-contador');
  const texto       = buscar('#novedad-texto');
  const boton       = buscar('#novedad-boton');

  let indice = 0;
  let objetivoActual = null;
  let reintentosRestantes = 0;

  const limpiarResaltado = () => {
    if (objetivoActual) objetivoActual.classList.remove('novedad__resaltado');
    objetivoActual = null;
  };

  const cerrar = () => {
    limpiarResaltado();
    contenedor.classList.add('oculto');
    window.removeEventListener('resize', reposicionar);
  };

  const reposicionar = () => {
    if (objetivoActual) posicionarNovedad(objetivoActual, contenedor, tarjeta, flecha);
  };

  const intentarPintar = () => {
    const n = lista[indice];
    const el = document.querySelector(n.selector);

    if (!el || el.offsetParent === null) {
      // No está en el DOM todavía, o está oculto (una pestaña que no es
      // la activa, un acordeón cerrado…): se reintenta un rato antes de
      // rendirse y pasar a la siguiente, silenciosamente.
      reintentosRestantes--;
      if (reintentosRestantes > 0) {
        setTimeout(intentarPintar, NOVEDAD_ESPERA_MS);
      } else {
        marcarNovedadComoVista(n.id);   // no bloquear esta pantalla para siempre
        avanzar();
      }
      return;
    }

    objetivoActual = el;
    el.classList.add('novedad__resaltado');

    /* Lo esperable es que quien vea el elemento brillando lo TOQUE, no
     * que busque el botón "Entendido" del globito. Sin este listener,
     * tocar el elemento disparaba su propia acción (abrir tal pantalla,
     * etc.) pero dejaba `novedad__resaltado` pegado para siempre — con
     * su z-index alto, eso lo dejaba flotando por encima del resto de
     * la app indefinidamente. Un solo toque tiene que bastar para
     * apagar el brillo, igual que tocar "Entendido". */
    el.addEventListener('click', () => {
      marcarNovedadComoVista(n.id);
      avanzar();
    }, { once: true });

    contador.textContent = (indice + 1) + '/' + lista.length;
    texto.textContent = n.texto;
    boton.textContent = (indice === lista.length - 1) ? 'Entendido' : 'Siguiente';

    contenedor.classList.remove('oculto');
    posicionarNovedad(el, contenedor, tarjeta, flecha);
  };

  const avanzar = () => {
    limpiarResaltado();
    indice++;
    if (indice >= lista.length) { cerrar(); return; }
    reintentosRestantes = NOVEDAD_REINTENTOS;
    intentarPintar();
  };

  boton.onclick = () => {
    marcarNovedadComoVista(lista[indice].id);
    avanzar();
  };

  window.addEventListener('resize', reposicionar);

  reintentosRestantes = NOVEDAD_REINTENTOS;
  intentarPintar();
}

/**
 * Ubica la tarjeta cerca del elemento señalado: debajo si hay lugar,
 * si no arriba, y siempre dentro del ancho de la pantalla. La flecha
 * se mueve con ella para seguir apuntando al centro del objetivo.
 *
 * @param {Element} objetivo
 * @param {Element} contenedor
 * @param {Element} tarjeta
 * @param {Element} flecha
 * @returns {void}
 */
function posicionarNovedad(objetivo, contenedor, tarjeta, flecha) {
  /* Antes acá se calculaban las coordenadas y RECIÉN DESPUÉS se pedía
   * el scroll suave al objetivo — con lo cual la tarjeta y la flecha
   * quedaban ancladas a dónde estaba el elemento antes de moverse, no
   * a dónde termina. Si el objetivo ya estaba a la vista no se notaba
   * (no había nada que recalcular), pero para cualquiera más abajo en
   * la pantalla (como la fila de "Estado de respaldo") el globo
   * terminaba apuntando al aire. Ahora, si hace falta scroll, se pide
   * primero y se ubica DESPUÉS de que termine — sobre la posición
   * final, no la de partida. */
  const yaVisible = objetivo.getBoundingClientRect().top >= 0 &&
    objetivo.getBoundingClientRect().bottom <= window.innerHeight;

  if (yaVisible) {
    ubicarNovedad(objetivo, tarjeta, flecha);
    return;
  }

  let yaUbicado = false;
  const ubicarUnaVez = () => {
    if (yaUbicado) return;
    yaUbicado = true;
    window.removeEventListener('scrollend', ubicarUnaVez);
    clearTimeout(tope);
    ubicarNovedad(objetivo, tarjeta, flecha);
  };
  // 'scrollend' no existe en todos los navegadores todavía — el tope
  // de tiempo es la red de seguridad para esos casos (dura un poco más
  // que cualquier scroll suave típico).
  const tope = setTimeout(ubicarUnaVez, 450);
  window.addEventListener('scrollend', ubicarUnaVez, { once: true });
  objetivo.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/**
 * La matemática pura de ubicación — sin scroll de por medio. Asume que
 * `objetivo` ya está en su posición final en pantalla.
 *
 * @param {Element} objetivo
 * @param {Element} tarjeta
 * @param {Element} flecha
 * @returns {void}
 */
function ubicarNovedad(objetivo, tarjeta, flecha) {
  const rect = objetivo.getBoundingClientRect();
  const anchoTarjeta = tarjeta.offsetWidth || 260;
  const altoTarjeta   = tarjeta.offsetHeight || 90;
  const margen = 12;

  const hayEspacioAbajo = rect.bottom + margen + altoTarjeta < window.innerHeight;
  const arriba = !hayEspacioAbajo;

  let izquierda = rect.left + rect.width / 2 - anchoTarjeta / 2;
  izquierda = Math.max(margen, Math.min(izquierda, window.innerWidth - anchoTarjeta - margen));

  const arribaPx = arriba
    ? rect.top - altoTarjeta - margen
    : rect.bottom + margen;

  tarjeta.style.left = izquierda + 'px';
  tarjeta.style.top  = Math.max(margen, arribaPx) + 'px';

  // La flecha apunta al centro del objetivo, desde el borde de la
  // tarjeta más cercano — nunca se sale del ancho de la tarjeta.
  const centroObjetivo = rect.left + rect.width / 2;
  let flechaIzquierda = centroObjetivo - izquierda - 7;
  flechaIzquierda = Math.max(14, Math.min(flechaIzquierda, anchoTarjeta - 14));

  flecha.style.left = (izquierda + flechaIzquierda) + 'px';
  flecha.style.top  = arriba
    ? (arribaPx + altoTarjeta - 1) + 'px'
    : (arribaPx - 7) + 'px';
  flecha.classList.toggle('novedad__flecha--abajo', arriba);
  flecha.classList.toggle('novedad__flecha--arriba', !arriba);
}
