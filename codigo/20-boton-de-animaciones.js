/* ══════════════════════════════════════════════════════════════════════
   20 · BOTÓN DE ANIMACIONES (ON / OFF)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Enciende o apaga TODO el movimiento de la invitación (los haces de luz,
   las velas, los pétalos, las enredaderas, las joyas que cuelgan…). Es la
   salida para equipos lentos o sin placa de video, donde tanto efecto a la
   vez pesa demasiado. El botón está desde el inicio, arriba a la izquierda,
   incluso por encima del sobre de entrada.

   CÓMO FUNCIONA (en vivo, sin recargar)
   Todo el movimiento de la web se apaga o enciende con una sola clase en
   el <html>: "animaciones-off". Los módulos de animación consultan esa
   clase en cada cuadro (a través de prefiereMenosMovimiento en
   02-utilidades.js): si está, sus bucles quedan en reposo; si no, animan.
   Y el CSS, con la misma clase, esconde lo que sea puro movimiento y deja
   encendido lo que da luz (los candelabros).

   Por eso el botón NO recarga la página: solo pone o saca la clase, y todo
   reacciona al instante. La elección se guarda en la memoria del navegador
   para la próxima visita; un script en el <head> la aplica antes de
   dibujar, sin parpadeos.

   ÍNDICE
     1. Estado actual
     2. Pintar el botón según el estado
     3. Al hacer clic: alternar en vivo y guardar
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElBotonDeAnimaciones() {

  const boton = buscar('#boton-animaciones');
  if (!boton) return;

  /** La clave en la memoria del navegador (mismo prefijo que el resto). */
  const CLAVE = 'invitacion-ania:animaciones';

  const textoEstado = buscar('.boton-animaciones__texto');


  /* ─── 1. ESTADO ACTUAL ─────────────────────────────────────────────── */

  /**
   * ¿Están apagadas las animaciones AHORA? La verdad vive en la clase del
   * <html> (que el script del <head> ya puso según la elección guardada o
   * la detección de equipo lento). Leerla de ahí incluye todos los casos.
   * @returns {boolean}
   */
  function estanApagadas() {
    return document.documentElement.classList.contains('animaciones-off');
  }


  /* ─── 2. PINTAR EL BOTÓN SEGÚN EL ESTADO ───────────────────────────── */

  /**
   * Deja el botón mostrando si el movimiento está encendido o apagado.
   * @param {boolean} apagado
   * @returns {void}
   */
  function pintarBoton(apagado) {
    boton.classList.toggle('esta-apagado', apagado);
    // aria-pressed = "está la animación encendida" (para lectores de pantalla)
    boton.setAttribute('aria-pressed', String(!apagado));
    boton.setAttribute('aria-label', apagado ? 'Encender las animaciones' : 'Apagar las animaciones');
    if (textoEstado) textoEstado.textContent = apagado ? 'Sin animación' : 'Animación';
  }

  pintarBoton(estanApagadas());


  /* ─── 3. AL HACER CLIC: ALTERNAR EN VIVO Y GUARDAR ─────────────────── */

  boton.addEventListener('click', () => {
    const nuevoApagado = !estanApagadas();

    // 1) Se aplica EN EL ACTO: poner o sacar la clase enciende o apaga todo
    //    el movimiento sin recargar (los bucles la consultan cada cuadro).
    document.documentElement.classList.toggle('animaciones-off', nuevoApagado);

    // 2) Se recuerda para la próxima visita.
    try { localStorage.setItem(CLAVE, nuevoApagado ? 'off' : 'on'); }
    catch (error) { /* modo privado: al menos la sesión actual ya respondió */ }

    // 3) Se actualiza el botón.
    pintarBoton(nuevoApagado);
  });


  /* ─── 4. SE APARTA AL BAJAR, Y VUELVE AL SUBIR ───────────────────────

     POR QUÉ
     El botón es `position: fixed` y va por encima de todo, así que tapa
     lo que quede arriba mientras se hace scroll. Tapaba el rótulo de la
     sección en el teléfono de una invitada.

     POR QUÉ NO SE ESCONDE Y YA
     Porque su razón de ser es poder apagar el movimiento CUANDO MOLESTA,
     y eso se descubre leyendo, no en la portada. Si desapareciera para
     siempre al bajar, el equipo lento que más lo necesita se quedaría sin
     él. Volviendo al subir sigue estando a un gesto de distancia.

     ESCONDER ES TAREA DE ACÁ, NO DEL CSS. El CSS lo deja visible; este
     archivo agrega `.esta-oculto`. Si este archivo no baja, se pierde el
     efecto y nunca el botón. Ver la nota grande en
     estilos/01-fundamentos.css. */

  /** Hasta dónde se considera "arriba del todo": ahí siempre se ve. */
  const ZONA_DE_ARRIBA = 120;

  /** Cuánto hay que moverse para que cuente como subir o bajar. Sin este
      margen, el temblor de un scroll con el dedo lo haría parpadear. */
  const TEMBLOR = 6;

  let ultimaAltura = scrollActualY();
  let hayCuadroPedido = false;

  /**
   * Decide si el botón se ve, según hacia dónde se está yendo.
   * @returns {void}
   */
  function acomodarElBoton() {
    hayCuadroPedido = false;

    const altura = scrollActualY();

    /* Arriba del todo siempre se ve: es donde se abre la invitación y
       donde alguien lo busca por primera vez. */
    if (altura <= ZONA_DE_ARRIBA) {
      boton.classList.remove('esta-oculto');
    } else if (altura > ultimaAltura + TEMBLOR) {
      boton.classList.add('esta-oculto');      // bajando: estorba
    } else if (altura < ultimaAltura - TEMBLOR) {
      boton.classList.remove('esta-oculto');   // subiendo: lo están buscando
    }

    ultimaAltura = altura;
  }

  /* Un solo cálculo por cuadro, igual que el resto de los efectos de
     scroll de esta web (ver 08-efectos-de-scroll.js). */
  window.addEventListener('scroll', () => {
    if (hayCuadroPedido) return;
    hayCuadroPedido = true;
    requestAnimationFrame(acomodarElBoton);
  }, { passive: true });

  /* Al volver desde el historial la página se restaura a media altura y
     sin disparar 'scroll': sin esto, el botón podría quedar escondido
     con la persona parada arriba del todo. */
  window.addEventListener('pageshow', acomodarElBoton);

  acomodarElBoton();

})();
