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

  /* NOTA: no se corta acá aunque las animaciones estén apagadas. El bucle
     se prepara igual, pero se queda en reposo (ver el guard dentro de
     dibujarCuadro). Así, si se ENCIENDEN las animaciones con el botón, las
     joyas empiezan a colgar y balancearse en el acto, sin recargar. En
     reposo, las joyas quedan rectas (ángulo 0), que es como cuelga una
     joya quieta. */

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

  /**
   * Fija el punto de giro UNA sola vez, como transform-origin de CSS en vez
   * de como parte del atributo `transform` (ver la nota grande en
   * aplicarRotacion: mismo arreglo que ya tiene 07-marco-y-enredaderas.js).
   * @param {Element} elemento
   * @param {{localX:number, localY:number}} pivote
   * @returns {void}
   */
  function fijarOrigenDeGiro(elemento, pivote) {
    elemento.style.transformBox = 'view-box';
    elemento.style.transformOrigin = pivote.localX + 'px ' + pivote.localY + 'px';
  }

  // Borlas: cada una es un péndulo rígido de un solo ángulo.
  const borlas = buscarTodos('.portada__marco .joya-colgante').map(elemento => {
    const p = leerPivote(elemento);
    fijarOrigenDeGiro(elemento, p);
    return {
      elemento, pivote: p,
      angulo: 0, velocidad: 0,
      faseDeRespiracion: Math.random() * Math.PI * 2,
      cacheDeEnvionMouse: 0,   // ver "CALIDAD GRÁFICA" más abajo
    };
  });

  /* Cadenas: cada una es una lista de eslabones ordenados de arriba hacia
     abajo. querySelectorAll los devuelve en orden del documento, y como
     están anidados (el de arriba envuelve al de abajo), ese orden ya es
     cima → punta. */
  const cadenas = buscarTodos('.portada__marco .cadena-colgante').map(cadena => {
    const eslabones = Array.from(cadena.querySelectorAll('.eslabon')).map((elemento, i) => {
      const p = leerPivote(elemento);
      fijarOrigenDeGiro(elemento, p);
      return {
        elemento, pivote: p,
        angulo: 0, velocidad: 0,
        rigidez: RIGIDEZ_ESLABON[Math.min(i, RIGIDEZ_ESLABON.length - 1)],
        amort:   AMORT_ESLABON[Math.min(i, AMORT_ESLABON.length - 1)],
        tope:    TOPE_ESLABON[Math.min(i, TOPE_ESLABON.length - 1)],
      };
    });
    /* faseDeRespiracion: cada cadena arranca su vaivén de reposo en un punto
       distinto, para que no todas se mezan iguales. */
    return {
      eslabones, faseDeRespiracion: Math.random() * Math.PI * 2,
      cacheDeEnvionMouse: 0,   // solo lo usa la cima, ver más abajo
    };
  });

  if (borlas.length === 0 && cadenas.length === 0) return;


  /* ─── CALIDAD GRÁFICA ─────────────────────────────────────────────────
     Este módulo mueve pocas piezas (2 borlas + los eslabones de 1 cadena),
     así que el resorte en sí es barato. Lo único con un costo real es la
     RAÍZ CUADRADA de "¿está el mouse cerca?" en envionExterno. En calidad
     media/baja esa cuenta se recalcula cada 2 o 3 cuadros —el mouse no
     teletransporta— y se reusa el último valor en los cuadros de en medio;
     el resorte (lo que de verdad se ve) se sigue integrando siempre,
     cuadro a cuadro, así que nunca se ve a los saltos. */
  let calidad = nivelDeCalidad();
  const SALTO_DEL_MOUSE_POR_CALIDAD = { 0: 1, 1: 2, 2: 3 };
  let saltoDelMouse = SALTO_DEL_MOUSE_POR_CALIDAD[calidad] ?? 1;
  let contadorDeCuadro = 0;
  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    saltoDelMouse = SALTO_DEL_MOUSE_POR_CALIDAD[calidad] ?? 1;
  });


  /* ─── 3. ENTRADAS: SCROLL Y MOUSE ──────────────────────────────────── */

  /* scrollActualY() y no window.scrollY: esta línea corre apenas carga el
     script (reflow forzado real, medido por PageSpeed) y el listener de
     'scroll' de acá abajo repetía la misma lectura cruda en cada evento.
     scrollActualY() es la copia cacheada del proyecto para esto
     (02-utilidades.js) — se actualiza sola con cada evento de scroll real,
     así que leerla acá es gratis. */
  let scrollAnterior = scrollActualY();
  let velocidadDeScroll = 0;
  window.addEventListener('scroll', () => {
    velocidadDeScroll = scrollActualY() - scrollAnterior;
    scrollAnterior = scrollActualY();
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
   * Recalcula "¿está el mouse cerca de este amarre?" y guarda el envión en
   * la pieza misma (pieza.cacheDeEnvionMouse). Es la parte con costo real
   * (una raíz cuadrada); por eso se llama menos seguido en calidad media/baja
   * (ver "CALIDAD GRÁFICA" más arriba), reusando el último valor mientras
   * tanto.
   * @param {{cacheDeEnvionMouse:number}} pieza - Borla o cima de cadena.
   * @param {{vbX:number, vbY:number}} pivote - En coordenadas del viewBox.
   * @param {DOMRect} caja - Caja del relicario en pantalla.
   * @param {number} escala - Px de pantalla por unidad del viewBox.
   * @returns {void}
   */
  function recalcularEnvionMouse(pieza, pivote, caja, escala) {
    const px = caja.left + pivote.vbX * escala;
    const py = caja.top  + pivote.vbY * escala;
    const dx = px - mouseX;
    const dy = py - mouseY;
    const distancia = Math.hypot(dx, dy);

    let envionMouse = 0;
    if (distancia < RADIO_DEL_MOUSE) {
      const influencia = 1 - distancia / RADIO_DEL_MOUSE;
      // Signo negativo: la joya se aleja del cursor, como si la empujara.
      envionMouse = -(dx / (distancia || 1)) * FUERZA_DEL_MOUSE * influencia * influencia;
    }
    pieza.cacheDeEnvionMouse = envionMouse;
  }

  /**
   * El empujón total (scroll + el último mouse calculado) para un amarre.
   * El de scroll SIEMPRE se recalcula (es barato y cambia rápido); el de
   * mouse viene de la caché que llena recalcularEnvionMouse().
   * @param {{cacheDeEnvionMouse:number}} pieza - Borla o cima de cadena.
   * @returns {number} El envión total.
   */
  function envionExterno(pieza) {
    const envionScroll = limitar(velocidadDeScroll, -60, 60) * 0.02;
    return envionScroll + pieza.cacheDeEnvionMouse;
  }

  /**
   * Gira una pieza… pero solo si de verdad se movió.
   *
   * ⚡ ESTE `if` VALE MÁS DE LO QUE PARECE, Y `style.transform` TAMBIÉN.
   * Este era el bucle más caro de toda la web (30,4 ms en el perfil), y no
   * por la física —son cuatro sumas por eslabón— sino por las escrituras:
   * entre eslabones, gemas y borlas se reescribían decenas de ATRIBUTOS
   * `transform` en CADA cuadro.
   *
   * Cambiar el ATRIBUTO `transform` de un nodo SVG es de las cosas más
   * caras que se le puede pedir al navegador: a diferencia de un
   * `transform` de CSS —que resuelve el compositor sin tocar nada más—, el
   * atributo pasa por el camino de LAYOUT, porque los nodos SVG tienen
   * objetos de layout propios. Ahí estaba buena parte del 17,7 % de
   * "Layout" del perfil. Por eso acá se escribe `elemento.style.transform`
   * (propiedad de CSS) y no `elemento.setAttribute('transform', ...)`: el
   * punto de giro se fija UNA sola vez como `transform-origin`
   * (fijarOrigenDeGiro, más arriba, en la construcción de cada pieza) y
   * después cada cuadro solo cambia el ángulo, sin tocar layout — mismo
   * arreglo que ya tiene 07-marco-y-enredaderas.js para sus nudos y
   * plantas; acá nunca se había aplicado.
   *
   * Y encima cada escritura fabricaba un string nuevo: cientos por segundo,
   * que después el recolector de basura tenía que limpiar (5,9 % del perfil
   * en "C++ GC").
   *
   * Como los péndulos están amortiguados, la mayor parte del tiempo el
   * ángulo redondeado a dos decimales es EXACTAMENTE el mismo que el del
   * cuadro anterior. Comparando antes de escribir no se pierde ni un grado
   * de movimiento y desaparece casi todo el trabajo.
   *
   * @param {Object} pieza - Borla, eslabón o gema con su ángulo actual.
   * @returns {void}
   */
  function aplicarRotacion(pieza) {
    /* ⚡ SE COMPARA CON UN ENTERO, NO CON UNA CADENA.
       Antes esto hacía `angulo.toFixed(2)` para comparar, y toFixed() crea
       un string CADA VEZ que se llama, incluso cuando después no se escribe
       nada. Entre eslabones, gemas y borlas eran decenas de cadenas por
       cuadro que iban derechas al recolector de basura; sumadas a las de las
       enredaderas, "Major GC" llegó al 23 % del perfil.

       Math.round(x * 100) da un entero: comparar enteros no reserva memoria.
       El texto se arma solo cuando de verdad hay algo nuevo que escribir. */
    const giro = Math.round(pieza.angulo * 100);
    if (giro === pieza.ultimoGiroEscrito) return;
    pieza.ultimoGiroEscrito = giro;

    pieza.elemento.style.transform = 'rotate(' + (giro / 100) + 'deg)';
  }

  function dibujarCuadro(momentoActual) {
    /* Sin nadie mirando (sobre cerrado, pestaña de fondo o animaciones
       apagadas): el bucle sigue vivo pero no mueve nada, las joyas quedan
       rectas. Listo para reanudar en cuanto se abra el sobre o se
       enciendan las animaciones, sin recargar la página. */
    if (!hayAlgoQueMirar()) { requestAnimationFrame(dibujarCuadro); return; }

    /* ⚡ YA NO TOCA EL DOM: medidaDelRelicario() (02-utilidades.js) mide una
       sola vez —al cargar y en cada resize— y acá solo se hace una resta con
       el scroll. Antes esto llamaba getBoundingClientRect() en CADA cuadro
       sobre el SVG más grande de la página, y 06-petalos-con-fisica.js hacía
       exactamente lo mismo por su cuenta: el doble de lecturas de las que
       hacían falta. */
    const caja = medidaDelRelicario();
    if (!caja) { requestAnimationFrame(dibujarCuadro); return; }

    /* El scroll pierde fuerza solo: el envión es un golpe, no un empuje fijo.
       ⚡ ESTO VA ANTES DEL CULLING DE ABAJO, A PROPÓSITO. La primera versión
       de este culling lo tenía después, y el decaimiento se congelaba
       entero mientras el relicario estaba lejos del viewport —no "de a
       poco", sino directamente detenido—. Al volver a acercarse, el envión
       de scroll acumulado se aplicaba de una sola vez en vez de entrar ya
       atenuado: eso era el "salto" que se sentía en las joyas/la cadena al
       scrollear. Decayendo siempre, esté cerca o lejos el relicario, la
       velocidad ya llega mansa cuando el culling deja pasar de nuevo. */
    velocidadDeScroll *= 0.85;

    /* ⚡ SI EL RELICARIO NO SE VE, NO SE ANIMA — Y ES POR ESTO.
       A diferencia de las velas (VENTANA_POR_CALIDAD, 19-velas.js) o las
       enredaderas (estaCerca, 07-marco-y-enredaderas.js), este bucle no
       tenía NINGÚN culling por posición: corría sesenta veces por segundo
       aunque el relicario estuviera a miles de píxeles de la pantalla —en
       la cuenta regresiva, en el formulario, donde sea—. Un perfilado real
       en vivo mostró que eso pesaba: el relicario vive dentro de un
       `filter` de CSS (.portada__marco, ver estilos/04-portada.css), y un
       filtro le impide al navegador componer a sus hijos por separado —
       cada cambio de ángulo de una joya obliga a repintar el SVG entero
       (~150 nodos) como una sola unidad ("Layerize" en el perfil), sin
       importar si alguien lo está mirando.

       Mismo margen que ya usa 06-petalos-con-fisica.js para el mismo
       relicario (150px): afuera de eso, ni se integra el resorte ni se
       escribe nada. Las piezas quedan con su último ángulo — no se
       "apagan"—, y retoman solas en cuanto el relicario vuelve a
       acercarse a la pantalla. */
    if (caja.top + caja.height < -150 || caja.top > window.innerHeight + 150) {
      requestAnimationFrame(dibujarCuadro);
      return;
    }

    const escala = caja.width / ANCHO_DEL_VIEWBOX;

    contadorDeCuadro++;
    const tocaRecalcularElMouse = (contadorDeCuadro % saltoDelMouse === 0);

    /* ── a) BORLAS: péndulo rígido ── */
    for (const borla of borlas) {
      if (tocaRecalcularElMouse) recalcularEnvionMouse(borla, borla.pivote, caja, escala);
      const externo = envionExterno(borla);
      /* Respiración de reposo (subida a .06 para que el balanceo se NOTE aun
         sin scroll ni mouse: antes era tan sutil que parecían quietas). */
      const respiracion = Math.sin(momentoActual / 1600 + borla.faseDeRespiracion) * 0.06;

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
      if (tocaRecalcularElMouse) recalcularEnvionMouse(cadena, cima.pivote, caja, escala);
      const externo = envionExterno(cadena);

      /* BRISA DE REPOSO: un vaivén lentísimo que entra por la CIMA de la
         cadena aunque no haya scroll ni mouse. El acople lo va bajando por
         los eslabones y la gema (el más pesado) queda atrás, así la cadena
         se mece sola y con volumen, como una joya colgada en una corriente
         de aire. Sin esto, en la portada quieta la cadena quedaba tiesa. */
      const brisa = Math.sin(momentoActual / 2100 + cadena.faseDeRespiracion) * 0.02;

      let anguloAbsAcum = 0;   // suma de los ángulos de los eslabones de arriba
      let velPadre = 0;        // velocidad del eslabón de arriba (para el acople)

      for (let i = 0; i < cadena.eslabones.length; i++) {
        const s = cadena.eslabones[i];
        const anguloAbsoluto = anguloAbsAcum + s.angulo;

        const gravedad = -anguloAbsoluto * s.rigidez;
        const acople   = velPadre * ACOPLE;
        const externoEsl = (i === 0) ? externo + brisa : 0;
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
