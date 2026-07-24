/* ══════════════════════════════════════════════════════════════════════
   21 · MONITOR DE RENDIMIENTO (gobernador de FPS por NIVELES)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Vigila cuántos milisegundos tarda el equipo en dibujar cada cuadro. Si
   empieza a sufrir (los cuadros tardan de más y la web va "a tirones"), baja
   la carga EN VIVO y por NIVELES: primero apaga lo más prescindible, y si aún
   sufre, va apagando más. Cuando se recupera, sube de nivel y devuelve todo.

   POR QUÉ ES DISTINTO DEL AUTODETECTOR DEL <head>
   En el <head> hay una detección ESTÁTICA (memoria/núcleos, UNA vez al
   cargar). Esto es lo DINÁMICO: mide de verdad cómo corre la web, cuadro a
   cuadro, y ajusta según lo que pasa.

   LOS NIVELES (cada uno incluye lo del anterior)
     · Nivel 0 — normal: todo encendido.
     · Nivel 1 — leve:   se apagan las MOTAS de polvo (lo más prescindible).
     · Nivel 2 — medio:  + los PÉTALOS bajan a la mitad.
     · Nivel 3 — severo: + PÉTALOS y HACES de luz apagados.
   Los candelabros y los cirios de piso quedan ENCENDIDOS en todos los niveles
   (son luz, no adorno de movimiento).

   CÓMO SE MIDE, SIN QUE LA MEDICIÓN CUESTE
   Se lleva un promedio MÓVIL exponencial del tiempo entre cuadros. Se sube o
   baja DE A UN NIVEL, y con umbrales distintos para entrar y para salir
   (histéresis): entrar a un nivel cuesta más que quedarse, y bajar de nivel
   (recuperarse) pide una mejora sostenida más larga que la que hizo subir.
   Esa banda evita el prende-y-apaga.

   CÓMO LO USA EL RESTO DE LA WEB
   Se ponen en el <html> las clases acumulativas `rendimiento-nivel1/2/3` (en
   el nivel 2 están la 1 y la 2, etc.) y se dispara `rendimiento-cambio` con
   el nivel. Desde ahí:
     · estilos/12-haces-de-luz.css apaga motas (nivel1) y haces (nivel3).
     · codigo/06-petalos-con-fisica.js reduce o apaga los pétalos por nivel.
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElMonitorDeRendimiento() {

  const raiz = document.documentElement;
  const NIVEL_MAXIMO = 3;

  /* Cuánto pesa cada cuadro nuevo en el promedio (0..1). Chico = el promedio
     reacciona despacio y no se deja engañar por un tropezón suelto. */
  const PESO_DEL_CUADRO = 0.08;

  /* Umbrales en ms por cuadro. ENTRAR[i] = EMA para SUBIR al nivel i;
     SALIR[i] = EMA por debajo del cual se BAJA del nivel i al i-1. La banda
     entre salir y entrar es la zona muerta que evita el titileo.
       nivel 1 ≈ <45 fps ; nivel 2 ≈ <36 fps ; nivel 3 ≈ <25 fps */
  const ENTRAR = [Infinity, 22, 28, 40];
  const SALIR  = [-Infinity, 18, 23, 33];

  /* Cuántos cuadros seguidos en zona de subir/bajar hacen falta. Subir es
     rápido (proteger la fluidez ya); bajar (recuperar) es más lento, para no
     rebotar apenas mejora un instante. */
  const CUADROS_PARA_SUBIR = 45;    // ~0,75 s a 60 fps
  const CUADROS_PARA_BAJAR  = 120;  // ~2 s

  /* Los primeros cuadros tras cargar siempre son lentos (se arma la página).
     Se ignoran para no subir de nivel por el arranque. */
  const CALENTAMIENTO_MS = 1800;

  let promedioMs = 16.7;            // arranca suponiendo 60 fps
  let nivel = 0;
  let cuadrosSube = 0;
  let cuadrosBaja = 0;
  let momentoAnterior = performance.now();
  let arranque = momentoAnterior;

  /**
   * Aplica el nivel actual: clases acumulativas en <html> + evento.
   * @returns {void}
   */
  function aplicarNivel() {
    for (let i = 1; i <= NIVEL_MAXIMO; i++) {
      raiz.classList.toggle('rendimiento-nivel' + i, nivel >= i);
    }
    document.dispatchEvent(new CustomEvent('rendimiento-cambio', { detail: { nivel } }));
  }

  function medir(momentoActual) {
    const delta = momentoActual - momentoAnterior;
    momentoAnterior = momentoActual;

    /* Saltos enormes = la pestaña estuvo en segundo plano (el navegador
       congela el rAF). No es lentitud real: se ignora ese cuadro. Tampoco se
       mide durante el calentamiento inicial. */
    if (delta > 100 || momentoActual - arranque < CALENTAMIENTO_MS) {
      requestAnimationFrame(medir);
      return;
    }

    /* Si las animaciones están apagadas (accesibilidad o botón), no hay carga
       que gobernar: se deja todo como está. */
    if (typeof prefiereMenosMovimiento === 'function' && prefiereMenosMovimiento()) {
      requestAnimationFrame(medir);
      return;
    }

    // Promedio móvil exponencial del tiempo por cuadro.
    promedioMs += (delta - promedioMs) * PESO_DEL_CUADRO;

    // ¿Conviene SUBIR un nivel (el equipo sufre)?
    if (nivel < NIVEL_MAXIMO && promedioMs > ENTRAR[nivel + 1]) cuadrosSube++;
    else cuadrosSube = 0;

    // ¿Conviene BAJAR un nivel (el equipo se recuperó)?
    if (nivel > 0 && promedioMs < SALIR[nivel]) cuadrosBaja++;
    else cuadrosBaja = 0;

    if (cuadrosSube >= CUADROS_PARA_SUBIR) {
      nivel++;
      cuadrosSube = cuadrosBaja = 0;
      aplicarNivel();
    } else if (cuadrosBaja >= CUADROS_PARA_BAJAR) {
      nivel--;
      cuadrosSube = cuadrosBaja = 0;
      aplicarNivel();
    }

    requestAnimationFrame(medir);
  }

  /* Al volver de una pestaña oculta, se reinicia el reloj para que el salto
     de tiempo no se lea como un cuadro lentísimo. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) momentoAnterior = performance.now();
  });

  requestAnimationFrame(medir);
})();
