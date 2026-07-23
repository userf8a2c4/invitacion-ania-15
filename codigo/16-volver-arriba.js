/* ══════════════════════════════════════════════════════════════════════
   16 · ARRANCAR ARRIBA Y VOLVER ARRIBA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos cosas sobre lo mismo: que la invitación siempre empiece por el
   principio, y que se pueda volver ahí de un toque.

     1. AL ABRIR, SIEMPRE DESDE EL TOPE
     2. EL BOTÓN DE VOLVER ARRIBA

   POR QUÉ HACE FALTA LO PRIMERO
   Los navegadores tienen la costumbre de "recordar" por dónde ibas y
   devolverte ahí al recargar. En una página común eso es cómodo. Acá es
   un problema: la invitación empieza con el sobre lacrado, y la persona
   que recarga se encontraría de golpe en la mitad del formulario, con el
   sobre encima y sin entender qué pasó. Esta invitación es una función
   que empieza en el minuto cero.

   ÍNDICE
     1. Al abrir, siempre desde el tope
     2. El botón de volver arriba
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. AL ABRIR, SIEMPRE DESDE EL TOPE ────────────────────────────── */

(function empezarSiempreDesdeArriba() {
  /* Se le pide al navegador que NO restaure la posición anterior. Hay que
     pedirlo apenas carga la página: si se espera, ya la restauró. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  /* Y además se sube a mano, porque algunos navegadores igual dejan la
     página corrida un instante. 'instant' y no 'smooth': nadie tiene por
     qué ver el viaje de vuelta al principio, solo estar ahí.

     Se hace tres veces a propósito, en los tres momentos en que el
     navegador puede volver a correr la página: ahora, cuando terminan de
     cargar las imágenes (que cambian el alto y arrastran el scroll), y
     un instante después, por si alguna llegó tarde. */
  function subirDeUnaVez() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  subirDeUnaVez();
  window.addEventListener('load', () => {
    subirDeUnaVez();
    setTimeout(subirDeUnaVez, 60);
  });
})();


/* ─── 2. EL BOTÓN DE VOLVER ARRIBA ──────────────────────────────────── */

(function preparaElBotonDeVolverArriba() {
  const boton = buscar('#volver-arriba');
  if (!boton) return;

  /** A partir de cuántos píxeles bajados aparece el botón. */
  const DESDE_CUANTO_APARECE = 700;

  /**
   * Muestra u oculta el botón según lo que se haya bajado.
   *
   * Arriba de todo el botón sobra —ya estás arriba— y encima taparía la
   * portada, que es lo primero que tiene que verse limpio.
   *
   * @returns {void}
   */
  function revisarSiCorresponde() {
    boton.classList.toggle('visible', window.scrollY > DESDE_CUANTO_APARECE);
  }

  /* El scroll dispara muchísimas veces por segundo. Sin este freno se
     harían cientos de cuentas al pedo; así se hace una por cuadro. */
  let hayUnaRevisionPendiente = false;
  window.addEventListener('scroll', () => {
    if (hayUnaRevisionPendiente) return;
    hayUnaRevisionPendiente = true;
    requestAnimationFrame(() => {
      revisarSiCorresponde();
      hayUnaRevisionPendiente = false;
    });
  }, { passive: true });

  boton.addEventListener('click', () => {
    /* Acá sí conviene el viaje suave: la persona eligió volver, y ver
       pasar la invitación de vuelta es parte del gusto. Salvo que haya
       pedido menos movimiento en su sistema, claro. */
    window.scrollTo({
      top: 0,
      behavior: prefiereMenosMovimiento() ? 'instant' : 'smooth',
    });
  });

  revisarSiCorresponde();
})();
