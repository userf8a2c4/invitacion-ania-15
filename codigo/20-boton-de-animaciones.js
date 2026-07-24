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

})();
