/* ══════════════════════════════════════════════════════════════════════
   05 · CURSOR PERSONALIZADO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Reemplaza la flechita del sistema por dos piezas doradas que siguen al
   mouse: un punto que va pegado al puntero y un anillo que llega un
   instante después.

   POR QUÉ EL ANILLO VA "ATRASADO"
   Porque ese retraso mínimo es lo que se siente elegante. Se logra con
   una técnica que se llama INTERPOLACIÓN (o "lerp"): en vez de mover el
   anillo directo a la posición del mouse, en cada cuadro de animación lo
   movemos solo una fracción de la distancia que le falta.

       posiciónAnillo = posiciónAnillo + (posiciónMouse − posiciónAnillo) × 0,18

   Como cada cuadro recorta un 18 % de lo que falta, el anillo se acerca
   rápido al principio y va frenando al final. Nunca "salta".

   ÍNDICE
     1. Condiciones para activarlo
     2. Seguir al mouse
     3. Bucle de animación
     4. Cambiar de forma según lo que hay debajo
     5. Entrar y salir de la ventana
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElCursorPersonalizado() {

  /* ─── 1. CONDICIONES PARA ACTIVARLO ────────────────────────────────
     En un celular no hay puntero que reemplazar, así que ni lo creamos.
     Y en calidad BAJA tampoco: es puro adorno (no da luz ni información
     nueva), y de paso se ahorra un bucle de animación que corre para
     siempre. En equipos donde arranca en un nivel mejor y el gobernador
     de rendimiento lo degrada a baja EN VIVO, se apaga más abajo. ------- */
  if (!tieneMouse()) return;
  if (nivelDeCalidad() === CALIDAD_GRAFICA.BAJA) return;

  const anillo = buscar('#cursor-anillo');
  const punto  = buscar('#cursor-punto');
  if (!anillo || !punto) return;

  // Esta clase es la que esconde el cursor del sistema (ver el CSS).
  document.documentElement.classList.add('con-cursor-propio');


  /* ─── 2. SEGUIR AL MOUSE ───────────────────────────────────────────
     Guardamos dos posiciones distintas:
       · la del mouse, que se actualiza al instante
       · la del anillo, que va persiguiéndola con retraso
     ---------------------------------------------------------------- */
  let posicionMouseX = window.innerWidth  / 2;
  let posicionMouseY = window.innerHeight / 2;
  let posicionAnilloX = posicionMouseX;
  let posicionAnilloY = posicionMouseY;

  /** Qué tan rápido alcanza el anillo al mouse (0 = nunca, 1 = al toque). */
  const VELOCIDAD_DE_PERSECUCION = 0.18;

  /** Se vuelve true con el primer movimiento, para no mostrar el cursor
   *  parado en el medio de la pantalla antes de que la persona lo mueva. */
  let elMouseYaSeMovio = false;

  document.addEventListener('mousemove', function alMoverElMouse(evento) {
    posicionMouseX = evento.clientX;
    posicionMouseY = evento.clientY;

    if (!elMouseYaSeMovio) {
      elMouseYaSeMovio = true;
      // Arrancamos el anillo en el mismo lugar para que no cruce la
      // pantalla volando la primera vez.
      posicionAnilloX = posicionMouseX;
      posicionAnilloY = posicionMouseY;
      anillo.classList.add('visible');
      punto.classList.add('visible');
    }

    /* El bucle se duerme cuando el anillo alcanzó al puntero (ver más
       abajo); cada movimiento lo vuelve a encender. */
    despertarElBucle();

    actualizarBrilloSegunElElementoDebajo(evento.target);
  }, { passive: true });


  /* ─── 3. BUCLE DE ANIMACIÓN ────────────────────────────────────────
     requestAnimationFrame le pide al navegador que ejecute esta función
     justo antes de dibujar el próximo cuadro (unas 60 veces por segundo).
     Es la forma correcta de animar: se sincroniza con la pantalla y se
     pausa sola si la pestaña queda en segundo plano.

     ⚡ Y SE DUERME CUANDO NO HAY NADA QUE MOVER. Antes este bucle corría
     SIEMPRE, aunque el mouse llevara un rato quieto y el anillo ya lo
     hubiera alcanzado: en un perfil real se llevaba un 5,4 % del tiempo
     para recalcular dos posiciones que no cambiaban. Ahora, cuando el
     anillo llegó a destino (le falta menos de un décimo de píxel, o sea
     nada visible), el bucle se detiene y lo despierta el próximo movimiento
     del mouse. El comportamiento en pantalla es idéntico: el anillo
     persigue igual, solo que no se gasta un cuadro cuando ya llegó.
     ---------------------------------------------------------------- */

  /** Cuando la distancia que falta es menor a esto, se considera que llegó. */
  const DISTANCIA_DESPRECIABLE = 0.1;

  let bucleEnMarcha = false;

  function dibujarCuadro() {
    // El anillo recorta un 18 % de la distancia que le falta.
    const faltaX = posicionMouseX - posicionAnilloX;
    const faltaY = posicionMouseY - posicionAnilloY;
    posicionAnilloX += faltaX * VELOCIDAD_DE_PERSECUCION;
    posicionAnilloY += faltaY * VELOCIDAD_DE_PERSECUCION;

    // translate3d activa la aceleración por hardware: el movimiento lo
    // calcula la placa de video y queda mucho más fluido.
    anillo.style.transform = `translate3d(${posicionAnilloX}px, ${posicionAnilloY}px, 0)`;
    punto.style.transform  = `translate3d(${posicionMouseX}px, ${posicionMouseY}px, 0)`;

    /* ¿Ya llegó? Entonces se apaga hasta el próximo movimiento. Se ajusta
       exacto para que no quede una fracción de píxel colgada. */
    if (Math.abs(faltaX) < DISTANCIA_DESPRECIABLE &&
        Math.abs(faltaY) < DISTANCIA_DESPRECIABLE) {
      posicionAnilloX = posicionMouseX;
      posicionAnilloY = posicionMouseY;
      bucleEnMarcha = false;
      return;
    }

    requestAnimationFrame(dibujarCuadro);
  }

  /**
   * Enciende el bucle si estaba dormido. Lo llama cada movimiento del mouse.
   * @returns {void}
   */
  function despertarElBucle() {
    if (bucleEnMarcha) return;
    bucleEnMarcha = true;
    requestAnimationFrame(dibujarCuadro);
  }
  despertarElBucle();


  /* ─── 4. BRILLO SEGÚN LO QUE HAY DEBAJO ────────────────────────────
     El cursor NUNCA cambia de forma ni de tamaño: siempre es el mismo
     anillo con su punto. Lo único que cambia es cuánto brilla cuando
     está sobre algo en lo que se puede hacer clic.
     ---------------------------------------------------------------- */

  /** Elementos que se consideran "cliqueables". */
  const SELECTOR_INTERACTIVO =
    'a, button, [role="button"], .opcion-menu, summary, input, textarea, select';

  /**
   * Enciende o apaga el brillo del cursor según el elemento que está
   * debajo del mouse.
   *
   * @param {Element} elementoDebajo - Sobre qué está el puntero ahora.
   * @returns {void}
   */
  function actualizarBrilloSegunElElementoDebajo(elementoDebajo) {
    if (!elementoDebajo || !elementoDebajo.closest) return;

    // .closest() sube por el árbol buscando un antepasado que coincida.
    // Sirve porque el mouse puede estar sobre el texto DENTRO de un botón.
    const estaSobreAlgoCliqueable = elementoDebajo.closest(SELECTOR_INTERACTIVO) !== null;

    anillo.classList.toggle('sobre-interactivo', estaSobreAlgoCliqueable);
    punto .classList.toggle('sobre-interactivo', estaSobreAlgoCliqueable);
  }


  /* ─── 5. ENTRAR Y SALIR DE LA VENTANA ──────────────────────────────
     Si el mouse se va de la ventana (o entra al mapa de Google, que es
     un iframe y se "traga" los movimientos), escondemos nuestro cursor
     para que no quede una bolita dorada abandonada en la pantalla.
     ---------------------------------------------------------------- */
  function ocultarCursor() {
    anillo.classList.remove('visible');
    punto.classList.remove('visible');
  }
  function mostrarCursor() {
    if (!elMouseYaSeMovio) return;
    anillo.classList.add('visible');
    punto.classList.add('visible');
  }

  document.addEventListener('mouseleave', ocultarCursor);
  document.addEventListener('mouseenter', mostrarCursor);

  // El truco para detectar el iframe del mapa: cuando el puntero entra
  // ahí, la ventana pierde el foco. Lo comprobamos al recuperar el foco.
  window.addEventListener('blur',  ocultarCursor);
  window.addEventListener('focus', mostrarCursor);

  /* ⚡ VUELVE A APAGARSE EN CALIDAD BAJA (se había sacado, y se revirtió).
     El argumento de "el cursor es barato, un solo transform" seguía
     siendo cierto para ESTE archivo solo — pero un downgrade de calidad
     es la señal de que el EQUIPO, en conjunto, ya está exigido, y ahí
     cualquier margen que se pueda ceder importa, así sea chico. En un
     equipo justo, un `transform` de más por cuadro sí puede ser la
     diferencia entre sostener el nivel bajo o seguir bajando. La
     prioridad, dicho explícitamente, es no perder fps — no la
     consistencia visual del cursor. Si el "anillo que se mueve solo"
     preocupaba porque parecía parte de la decoración del relicario, la
     causa real de esa confusión no era esto: era que el anillo gira
     solo, siempre, aunque el mouse esté quieto (ver girar-anillo en
     estilos/10-cursor-y-petalos.css) — y ESO se corrigió aparte. */
  document.addEventListener('calidad-cambio', evento => {
    if ((evento.detail && evento.detail.calidad) === CALIDAD_GRAFICA.BAJA) {
      document.documentElement.classList.remove('con-cursor-propio');
      ocultarCursor();
    }
  });

})();
