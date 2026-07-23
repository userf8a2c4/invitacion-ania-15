/* ══════════════════════════════════════════════════════════════════════
   17 · JOYAS COLGANTES
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Las joyas del relicario no son dibujos quietos: CUELGAN y pesan. Este
   archivo las balancea con el scroll y el mouse, y siempre las devuelve a
   colgar rectas, para que se sientan piezas de joyería y no calcomanías.

   HAY DOS TIPOS DE COLGANTE
     · BORLAS (las de los costados): son cortas y macizas, así que se
       comportan como un péndulo RÍGIDO —giran enteras sobre su gancho—.
     · EL PENDIENTE CENTRAL: tiene una CADENA, y una cadena no es una
       varilla: se curva, y la gema del extremo se queda atrás al
       balancearse. Por eso su cadena está articulada en ESLABONES y se
       resuelve como un PÉNDULO COMPUESTO.

   LA FÍSICA (resorte amortiguado sobre un ángulo, integrado por cuadro)
   Sobre el ángulo de cada pieza actúan:
     · GRAVEDAD: un resorte que tira el ángulo hacia la vertical (colgar
       recto y volver solo).
     · SCROLL: al desplazar, el gancho se mueve y la joya se queda atrás
       por inercia y se mece.
     · MOUSE: si el cursor pasa cerca, la empuja de costado.
     · ROCE DEL AIRE: amortiguación que frena el vaivén.

   EN LA CADENA, ADEMÁS, HAY ACOPLE
   Cada eslabón, aparte de su gravedad, es ARRASTRADO por el eslabón de
   arriba con un beat de retraso (el "acople"). Ese retraso es lo que
   produce el latigazo de una cadena: la cima se mueve, y la curva y el
   peso bajan por los eslabones hasta la gema. Los eslabones de abajo son
   más blandos (más inercia), así que lagean más y la cadena se curva.

   Se integra POR CUADRO (no por tiempo real) a propósito: si el navegador
   ralentiza los cuadros, el movimiento se ve más lento pero el resorte
   nunca se descontrola. Mismo criterio que las enredaderas (07).

   MEDICIÓN EN PANTALLA
   Para saber si el mouse está cerca hay que ubicar el amarre en píxeles.
   El relicario es un SVG con viewBox 860×816 centrado en (430,408): con la
   caja del SVG se convierte cualquier punto del dibujo a píxeles.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Encontrar borlas y cadenas
     3. Entradas: scroll y mouse
     4. El bucle
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasJoyasColgantes() {

  const relicario = buscar('.portada__marco');
  if (!relicario) return;

  // Si se pidió menos movimiento, las joyas quedan quietas y rectas.
  if (prefiereMenosMovimiento()) return;

  /* El dibujo está centrado en (430,408) dentro del viewBox de 860×816. El
     pivote, que en el SVG está en coordenadas relativas a ese centro, se
     pasa a coordenadas del viewBox sumándole (430,408). */
  const CENTRO_X = 430;
  const CENTRO_Y = 408;
  const ANCHO_DEL_VIEWBOX = 860;


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────────── */

  // Péndulo rígido (borlas)
  const RIGIDEZ_BORLA     = 0.014;  // gravedad hacia la vertical
  const AMORT_BORLA       = 0.07;   // roce del aire
  const TOPE_BORLA        = 20;     // grados

  /* Cadena (péndulo compuesto). Un valor por eslabón, de arriba hacia
     abajo. Los de abajo tienen MENOS rigidez: pesan más, lagean más y
     curvan la cadena. El tope crece hacia abajo: la punta puede arquearse
     más que la cima. */
  const RIGIDEZ_ESLABON = [0.020, 0.013, 0.008];
  const AMORT_ESLABON   = [0.075, 0.085, 0.095];
  const TOPE_ESLABON    = [12, 18, 24];
  /* Cuánto arrastra cada eslabón al de abajo (el latigazo de la cadena).
     Alto = la cadena "chicotea" más; bajo = más tiesa. */
  const ACOPLE = 0.28;

  // Empujones externos (compartidos)
  const RADIO_DEL_MOUSE  = 170;   // px de pantalla
  const FUERZA_DEL_MOUSE = 0.9;


  /* ─── 2. ENCONTRAR BORLAS Y CADENAS ────────────────────────────────── */

  /**
   * Lee el pivote de un elemento (data-pivote-*) y lo devuelve en las dos
   * coordenadas que hacen falta: las locales del dibujo (para el rotate) y
   * las del viewBox (para ubicarlo en pantalla).
   * @param {Element} el
   * @returns {{localX:number, localY:number, vbX:number, vbY:number}}
   */
  function leerPivote(el) {
    const localX = parseFloat(el.dataset.pivoteX) || 0;
    const localY = parseFloat(el.dataset.pivoteY) || 0;
    return { localX, localY, vbX: CENTRO_X + localX, vbY: CENTRO_Y + localY };
  }

  // Borlas: cada una es un péndulo rígido de un solo ángulo.
  const borlas = buscarTodos('.portada__marco .joya-colgante').map(elemento => {
    const p = leerPivote(elemento);
    return {
      elemento, pivote: p,
      angulo: 0, velocidad: 0,
      faseDeRespiracion: Math.random() * Math.PI * 2,
    };
  });

  /* Cadenas: cada una es una lista de eslabones ordenados de arriba hacia
     abajo. querySelectorAll los devuelve en orden del documento, y como
     están anidados (el de arriba envuelve al de abajo), ese orden ya es
     cima → punta. */
  const cadenas = buscarTodos('.portada__marco .cadena-colgante').map(cadena => {
    const eslabones = Array.from(cadena.querySelectorAll('.eslabon')).map((elemento, i) => {
      const p = leerPivote(elemento);
      return {
        elemento, pivote: p,
        angulo: 0, velocidad: 0,
        rigidez: RIGIDEZ_ESLABON[Math.min(i, RIGIDEZ_ESLABON.length - 1)],
        amort:   AMORT_ESLABON[Math.min(i, AMORT_ESLABON.length - 1)],
        tope:    TOPE_ESLABON[Math.min(i, TOPE_ESLABON.length - 1)],
      };
    });
    return { eslabones };
  });

  if (borlas.length === 0 && cadenas.length === 0) return;


  /* ─── 3. ENTRADAS: SCROLL Y MOUSE ──────────────────────────────────── */

  let scrollAnterior = window.scrollY;
  let velocidadDeScroll = 0;
  window.addEventListener('scroll', () => {
    velocidadDeScroll = window.scrollY - scrollAnterior;
    scrollAnterior = window.scrollY;
  }, { passive: true });

  let mouseX = -9999;
  let mouseY = -9999;
  window.addEventListener('mousemove', evento => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });


  /* ─── 4. EL BUCLE ──────────────────────────────────────────────────── */

  /**
   * Calcula el empujón que el scroll y el mouse le dan a un amarre
   * concreto (el gancho de una borla o la cima de una cadena).
   * @param {{vbX:number, vbY:number}} pivote - En coordenadas del viewBox.
   * @param {DOMRect} caja - Caja del relicario en pantalla.
   * @param {number} escala - Px de pantalla por unidad del viewBox.
   * @returns {number} El envión total (scroll + mouse).
   */
  function envionExterno(pivote, caja, escala) {
    // Scroll: la joya se queda atrás cuando el gancho sube o baja.
    const envionScroll = limitar(velocidadDeScroll, -60, 60) * 0.02;

    // Mouse: solo si pasa cerca del amarre en pantalla.
    let envionMouse = 0;
    const px = caja.left + pivote.vbX * escala;
    const py = caja.top  + pivote.vbY * escala;
    const dx = px - mouseX;
    const dy = py - mouseY;
    const distancia = Math.hypot(dx, dy);
    if (distancia < RADIO_DEL_MOUSE) {
      const influencia = 1 - distancia / RADIO_DEL_MOUSE;
      // Signo negativo: la joya se aleja del cursor, como si la empujara.
      envionMouse = -(dx / (distancia || 1)) * FUERZA_DEL_MOUSE * influencia * influencia;
    }
    return envionScroll + envionMouse;
  }

  function aplicarRotacion(pieza) {
    pieza.elemento.setAttribute(
      'transform',
      `rotate(${pieza.angulo.toFixed(2)} ${pieza.pivote.localX} ${pieza.pivote.localY})`
    );
  }

  function dibujarCuadro(momentoActual) {
    if (document.hidden) { requestAnimationFrame(dibujarCuadro); return; }

    const caja = relicario.getBoundingClientRect();
    const escala = caja.width / ANCHO_DEL_VIEWBOX;

    // El scroll pierde fuerza solo: el envión es un golpe, no un empuje fijo.
    velocidadDeScroll *= 0.85;

    /* ── a) BORLAS: péndulo rígido ── */
    for (const borla of borlas) {
      const externo = envionExterno(borla.pivote, caja, escala);
      const respiracion = Math.sin(momentoActual / 1600 + borla.faseDeRespiracion) * 0.04;

      const aceleracion =
        (-borla.angulo * RIGIDEZ_BORLA) - (borla.velocidad * AMORT_BORLA)
        + externo + respiracion;

      borla.velocidad += aceleracion;
      borla.angulo = limitar(borla.angulo + borla.velocidad, -TOPE_BORLA, TOPE_BORLA);
      aplicarRotacion(borla);
    }

    /* ── b) CADENAS: péndulo compuesto ──
       Se recorre de la cima a la punta. Cada eslabón siente su propia
       gravedad (sobre su ángulo ABSOLUTO, la suma de los de arriba), el
       arrastre del eslabón de encima (acople) y, solo la cima, el envión
       del scroll y el mouse. La suma de ángulos hace que la cadena se
       curve y la gema quede atrás. */
    for (const cadena of cadenas) {
      const cima = cadena.eslabones[0];
      const externo = envionExterno(cima.pivote, caja, escala);

      let anguloAbsAcum = 0;   // suma de los ángulos de los eslabones de arriba
      let velPadre = 0;        // velocidad del eslabón de arriba (para el acople)

      for (let i = 0; i < cadena.eslabones.length; i++) {
        const s = cadena.eslabones[i];
        const anguloAbsoluto = anguloAbsAcum + s.angulo;

        const gravedad = -anguloAbsoluto * s.rigidez;
        const acople   = velPadre * ACOPLE;
        const externoEsl = (i === 0) ? externo : 0;
        const amortig  = -s.velocidad * s.amort;

        s.velocidad += gravedad + acople + externoEsl + amortig;
        s.angulo = limitar(s.angulo + s.velocidad, -s.tope, s.tope);
        aplicarRotacion(s);

        anguloAbsAcum += s.angulo;
        velPadre = s.velocidad;
      }
    }

    requestAnimationFrame(dibujarCuadro);
  }

  requestAnimationFrame(dibujarCuadro);

})();
