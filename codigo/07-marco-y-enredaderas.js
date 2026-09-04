/* ══════════════════════════════════════════════════════════════════════
   07 · MARCO Y ENREDADERAS
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Hace trepar rosales por los dos laterales del marco victoriano. Cada
   planta se dibuja sola, ninguna es igual a otra, y todas reaccionan
   tanto al scroll como al mouse.

   ─────────────────────────────────────────────────────────────────────
   PARTE 1 · CÓMO SE "HACE CRECER" UNA PLANTA

   Las plantas NO están dibujadas a mano. Si lo estuvieran, todas serían
   idénticas y se notaría el sello repetido. En su lugar, la computadora
   las hace crecer paso a paso, igual que crecería una de verdad:

     · Arranca en la base, apuntando hacia arriba.
     · En cada paso gira un poquito al azar, PERO conservando parte del
       giro anterior. Eso se llama inercia, y es lo que hace que la curva
       serpentee de forma natural en lugar de temblar.
     · Además siente una atracción suave hacia el marco, como si se
       apoyara en él para trepar.
     · El tallo NO tiene grosor parejo: se dibuja como una silueta que
       empieza gruesa y leñosa abajo y termina fina como un hilo arriba,
       con engrosamientos irregulares en los nudos.
     · Le salen brotes a alturas desparejas, sin alternar prolijamente:
       a veces dos seguidos del mismo lado, a veces ninguno en un tramo.

   Todo el azar sale de una SEMILLA (ver crearAzarConSemilla en
   02-utilidades.js), así que cada planta es distinta de las demás pero
   siempre se dibuja igual, aunque se recargue la página.

   ─────────────────────────────────────────────────────────────────────
   PARTE 2 · CÓMO SE MUEVEN

   Dos movimientos independientes, los dos con la fórmula del RESORTE
   AMORTIGUADO:

       aceleración = (destino − actual) × RIGIDEZ − velocidad × AMORTIGUACIÓN

     a) LA PLANTA ENTERA se mece según la velocidad del scroll, pivotando
        sobre su raíz. Cada planta tiene su propia rigidez y su propio
        ritmo de respiración, así que nunca se mueven al unísono.

     b) CADA FLOR, además, se DOBLA sobre su pedúnculo cuando el cursor se
        le acerca, y después se endereza sola.

        Es importante que sea un doblado y no un desplazamiento: una flor
        está pegada al tallo, así que no puede irse volando ni orbitar por
        el aire. Lo único que puede hacer es cabecear sobre su cuello. Por
        eso su física es UN SOLO ángulo, y el giro se aplica tomando como
        eje un punto por debajo de la flor, no su centro.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Biblioteca de dibujos (rosa, capullo, hoja)
     3. Hacer crecer un tallo
     4. Dibujar una planta completa
     5. Repartir las plantas por los laterales
     6. Movimiento: scroll, respiración y mouse
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasEnredaderasDelMarco() {

  // Interruptor de diagnóstico: ver apagadoParaMedir() en 02-utilidades.js.
  if (apagadoParaMedir('enredaderas')) return;

  /* ── INTERRUPTORES FINOS, SOLO PARA MEDIR ──────────────────────────────
     'sin=enredaderas' (arriba) apaga el módulo entero, y con eso los fps de
     la máquina de referencia pasaron de 18 a 38. Pero adentro de este
     archivo conviven tres cosas que cuestan por motivos distintos, y hasta
     no saber cuál pesa, cualquier arreglo es una apuesta:

       · las 24 trepadoras de los costados, que tienen física y se mecen;
       · los 4 ramilletes de las esquinas, que son 140 de las 234 flores y
         NO se mueven nunca (son puro dibujo);
       · el meneo en sí — las ~400 escrituras de transform por cuadro.

     Si apagar el meneo devuelve los fps, el costo es de la animación y se
     arregla componiendo. Si NO los devuelve, el costo es de rasterizar el
     dibujo mientras se hace scroll, que es otro problema y otro arreglo.
     Estos tres interruptores separan esas facturas. Sin ?sin= en la
     dirección no cambia absolutamente nada. */
  const SIN_PLANTAS    = apagadoParaMedir('plantas');
  const SIN_RAMILLETES = apagadoParaMedir('ramilletes');
  const SIN_MENEO      = apagadoParaMedir('meneo');


  const enredaderaIzquierda = buscar('.marco__enredadera--izquierda');
  const enredaderaDerecha   = buscar('.marco__enredadera--derecha');
  if (!enredaderaIzquierda || !enredaderaDerecha) return;

  /* Este archivo necesita el generador de azar con semilla, que vive en
     02-utilidades.js. Si alguien cambia el orden de los <script> en el
     index.html, esto lo avisa con un mensaje claro en vez de fallar de
     una manera difícil de entender. */
  if (typeof crearAzarConSemilla !== 'function') {
    console.error(
      'Las enredaderas necesitan la función crearAzarConSemilla(), que está en ' +
      'codigo/02-utilidades.js. Revisá que ese archivo se cargue ANTES que este ' +
      'en la lista de <script> del final de index.html.'
    );
    return;
  }


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────── */

  /** Cada cuántos píxeles de alto nace una planta nueva.
   *
   *  ⛔ NO ATAR ESTO AL NIVEL DE CALIDAD. Se intentó (separación y densidad
   *  escalando por nivel, más una reconstrucción al cambiar de nivel) y salió
   *  caro: la reconstrucción disparada por el gobernador se solapaba con la
   *  construcción que todavía estaba en vuelo —esta función arma las plantas
   *  y los ramilletes a lo largo de decenas de cuadros—, las dos corridas se
   *  pisaban el innerHTML de los mismos huecos, y el resultado fue un
   *  ramillete de esquina desaparecido y plantas mal dibujadas.
   *
   *  Si algún día se quiere volver a intentar, hace falta primero el guardia
   *  de reentrada que ahora sí tiene repartirPlantas() — pero el beneficio
   *  era chico (menos plantas en equipos flojos) y el riesgo visual, alto. */
  const SEPARACION_ENTRE_PLANTAS = 460;

  /* ⚡ CUÁNTO RELLENO LLEVA CADA PLANTA, SEGÚN LA CALIDAD (2026-09-02).

     QUÉ SE RECORTA Y QUÉ NO. No se quita ni una rosa, ni una planta: lo que
     se aligera es el relleno — hojas, espinas y zarcillos— y la cantidad de
     nudos del tallo. La silueta, la cantidad de flores y el ritmo de la
     enredadera quedan idénticos; lo que baja es la densidad de detalle que,
     a esa distancia y con la penumbra encima, casi no se lee.

     POR QUÉ HACÍA FALTA. En un perfil real sobre un equipo modesto,
     "Layerize" —el paso donde el navegador arma el árbol de capas— se
     llevaba entre el 42 % y el 52 % del tiempo de cada cuadro. Ese costo lo
     manda CUÁNTO hay que recorrer, y este archivo solo es la mitad de los
     4.054 nodos del documento. Reducir el relleno saca ~700 elementos de
     render sin tocar una sola flor.

     ⚠️ SE DECIDE UNA SOLA VEZ, AL CONSTRUIR, Y NO SE VUELVE A TOCAR.
     Acá está la lección del intento anterior que salió mal (ver la nota de
     abajo): aquella vez la densidad se ataba al nivel de calidad Y se
     reconstruía al cambiar de nivel — y el gobernador cambia de nivel a los
     ~2,5 s, justo cuando la construcción todavía está en vuelo, así que dos
     corridas se pisaban. Este archivo NO escucha 'calidad-cambio' para
     geometría, y así debe seguir: el gobernador ajusta cadencias, nunca
     cantidades. Por eso estos valores se leen una vez en
     construirUnaSolaVez() y quedan fijos para toda la visita. */
  const RELLENO_POR_CALIDAD = { 0: 1, 1: 0.6, 2: 0.45 };
  const NUDOS_POR_CALIDAD   = { 0: 6, 1: 4,   2: 3    };

  let rellenoDeEstaVisita = 1;
  let nudosDeEstaVisita   = 6;

  /** Ancho del "lienzo" de cada planta, en unidades del dibujo. */
  const ANCHO_DEL_LIENZO = 120;

  /** Cuánto tira el resorte de la planta hacia su posición de reposo. */
  const RIGIDEZ_DE_LA_PLANTA = 0.05;
  const AMORTIGUACION_DE_LA_PLANTA = 0.13;

  /** Lo mismo para cada flor por separado (más suelto, más vivo).
   *
   *  ⚡ LA AMORTIGUACIÓN SUBIÓ (era 0.16) — ESTO ES LO QUE ARREGLA "LAS
   *  FLORES VOLADORAS". Con 0.16, el resorte de la flor está MUY por
   *  debajo del amortiguamiento crítico (ζ ≈ 0,27): un toque del mouse no
   *  la hacía inclinarse y volver una vez, la hacía pasarse de largo del
   *  reposo y OSCILAR varias veces de un lado al otro antes de quedarse
   *  quieta, cada vez más cerca del tope de 24° (FLEXION_MAXIMA). Esa
   *  oscilación —la flor pasando de lado a lado, no un solo cabeceo— es
   *  lo que se lee como "vuela" o "flota", no como una flor real
   *  doblándose sobre su tallo. Con 0.5 el resorte queda cerca del
   *  amortiguamiento crítico (ζ ≈ 0,8-0,9): se inclina, frena suave y
   *  vuelve, sin pasarse de largo ni rebotar. */
  const RIGIDEZ_DE_LA_FLOR = 0.09;
  const AMORTIGUACION_DE_LA_FLOR = 0.5;

  /** Grados de inclinación por cada píxel de scroll por cuadro. */
  const GRADOS_POR_VELOCIDAD = 0.4;
  const INCLINACION_MAXIMA = 14;

  /** Radio en el que el mouse afecta a una flor, en píxeles de pantalla. */
  const RADIO_DEL_MOUSE = 150;

  /**
   * Con cuánta fuerza el mouse DOBLA a la flor sobre su tallo.
   *
   * No es un empujón que la desplace: es un torque, o sea la fuerza que
   * la hace pivotar. Con este valor y la rigidez actual, una flor tocada
   * de lleno se inclina unos 16° y vuelve sola.
   *
   * (De dónde sale ese 16°: en equilibrio, el resorte compensa al torque,
   *  así que  inclinación = torque ÷ rigidez  →  1,44 ÷ 0,09 ≈ 16.)
   */
  const FUERZA_DEL_MOUSE = 90;

  /** Cuánto puede doblarse una flor como máximo, en grados.
   *  Es el seguro que impide que parezca que se despega del tallo. */
  const FLEXION_MAXIMA = 24;

  /* ── El tallo también se dobla ──
     El tallo está partido en nudos encadenados. Cada uno tiene su resorte,
     más blando cuanto más arriba está: abajo la rama es leñosa y casi no
     cede, arriba es un brote tierno que se dobla con nada.

     Los valores son más chicos que los de la flor porque el doblado se
     ACUMULA: si los seis nudos se inclinan 5°, la punta termina a 30°. */
  const RIGIDEZ_DEL_NUDO      = 0.055;
  /* ⚡ SUBIÓ (era 0.14) por el mismo motivo que AMORTIGUACION_DE_LA_FLOR:
     estaba lejos del amortiguamiento crítico y el nudo se pasaba de largo
     y oscilaba en vez de doblarse y volver una sola vez. Como el doblado
     de los nudos se ACUMULA hacia la punta (ver la nota de arriba), una
     oscilación acá se notaba más todavía que en una flor sola. */
  const AMORTIGUACION_DEL_NUDO = 0.42;

  /** Cuánto dobla el mouse a cada nudo (torque, igual que en la flor). */
  const FUERZA_DEL_MOUSE_EN_EL_TALLO = 26;

  /** Tope por nudo. Con 6 nudos, la punta puede llegar a unos 42°. */
  const FLEXION_MAXIMA_DEL_NUDO = 7;

  /** Vaivén de reposo del nudo, en grados.
   *
   *  Subió de .35 a .55 a propósito. Antes cada flor tenía además su
   *  propia respiración, pero eso obligaba a las ~350 flores a reescribir
   *  su transform para siempre y era carísimo (ver el bloque del bucle).
   *  Ahora el vaivén lo carga entero el tallo, y como el doblado se acumula
   *  nudo a nudo y las flores cuelgan adentro, la punta se mece lo mismo
   *  que antes —con seis escrituras por planta en vez de quince—. */
  const VAIVEN_DEL_NUDO = 0.55;

  /* Umbrales para dar por acomodada a una flor y dejar de escribirla.
     Medio centésimo de grado por cuadro y medio décimo de grado de
     inclinación: por debajo de eso no hay movimiento que un ojo distinga,
     solo trabajo para el navegador. */
  const VELOCIDAD_DESPRECIABLE = 0.02;
  const FLEXION_DESPRECIABLE   = 0.05;


  /* ─── 2. LOS DIBUJOS DE LAS ROSAS ──────────────────────────────
     Las rosas, hojas y capullos NO se dibujan acá: están en el index.html,
     dentro del bloque <svg id="biblioteca-de-rosas">. Se pusieron ahí para
     que sean LAS MISMAS que usa el relicario de la portada; si cada parte
     tuviera sus propias flores, se notaría la disonancia.
     Acá solo se las invoca con <use href="#rosa-frente">, etc.
     ---------------------------------------------------------------- */

  /* ── EL APAGADO DE UNA FLOR, Y POR QUÉ YA NO ES UN FILTRO ──
     Una rosa lejana o en penumbra tiene que verse más oscura y menos
     saturada que una cercana e iluminada. Eso es profundidad, y no se
     negocia.

     Antes se conseguía con  style="filter: brightness() saturate()"  en
     cada flor. Funcionaba, pero resultó ser el problema de rendimiento
     más grande que tuvo esta web: un `filter` de CSS obliga al navegador
     a darle a ese elemento su PROPIA capa de pintura. Con ~350 flores
     eran ~350 capas, y como cada flor además se mueve, el árbol de capas
     se reconstruía en cada cuadro. La fase "Layerize" se llevaba el
     38,9 % del tiempo total; todo el JavaScript junto, el 1,2 %.

     La salida NO fue bajar la calidad —se probó con `opacity` y se
     revirtió, porque deja ver el fondo a través de la flor y pierde la
     desaturación—. Fue calcular de antemano el color que producía el
     filtro y hornearlo en el gradiente. Hay doce juegos de gradientes ya
     apagados en index.html, y cada flor elige el suyo con una clase
     .tono-N. Mismo color exacto, cero capas.

     Doce escalones cubren todo el rango de brillo que usan las flores
     (de .407 a 1.0): saltos del 5 %, unos 6 niveles de color, que no se
     distinguen ni entre dos rosas vecinas. */

  /** Extremos del rango de apagado que producen las fórmulas de abajo. */
  const BRILLO_MAS_APAGADO = 0.407;
  const BRILLO_MAS_VIVO    = 1.0;
  const CUANTOS_TONOS      = 12;

  /**
   * Elige la clase de tono que corresponde al apagado de una flor.
   *
   * La saturación no necesita su propio eje: en las fórmulas que la usan
   * sube y baja junto con el brillo (ambas cuelgan de la cercanía y de la
   * luz), y los doce juegos de gradientes ya vienen con el par brillo +
   * saturación resuelto. Verificado: derivar una de la otra desvía la
   * saturación como mucho 0,02 en el peor caso.
   *
   * @param {number} brillo - Factor de brillo ya calculado (0..1).
   * @returns {string} La clase, lista para sumar al <g> de la flor.
   */
  function tonoDeLaFlor(brillo) {
    const proporcion = (brillo - BRILLO_MAS_APAGADO) /
                       (BRILLO_MAS_VIVO - BRILLO_MAS_APAGADO);
    const indice = limitar(Math.floor(proporcion * CUANTOS_TONOS), 0, CUANTOS_TONOS - 1);
    return `tono-${indice}`;
  }


  /* ─── 3. HACER CRECER UN TALLO ─────────────────────────────────── */

  /**
   * Hace crecer un tallo paso a paso y devuelve el recorrido.
   *
   * Los ángulos están en radianes (la unidad que usa la computadora para
   * los ángulos). Lo único que hace falta saber: −PI/2 apunta hacia
   * arriba, y sumarle un poco lo inclina hacia la derecha.
   *
   * @param {Object} azar - Generador con semilla (ver 02-utilidades.js).
   * @param {Object} opciones - Parámetros del crecimiento.
   * @param {number} opciones.xInicial      - Dónde nace, a lo ancho.
   * @param {number} opciones.yInicial      - Dónde nace, a lo alto.
   * @param {number} opciones.anguloInicial - Hacia dónde apunta al nacer.
   * @param {number} opciones.pasos         - Cuántos tramos crece.
   * @param {number} opciones.largoDelPaso  - Cuánto avanza en cada tramo.
   * @param {number} opciones.giroMaximo    - Cuánto puede torcerse por tramo.
   * @param {number} opciones.inercia       - Cuánto conserva del giro anterior.
   * @param {number} opciones.xObjetivo     - Hacia qué columna tiende.
   * @param {number} opciones.atraccion     - Con cuánta fuerza tiende.
   * @returns {Array<{x:number,y:number,angulo:number,t:number}>}
   *          El recorrido. "t" va de 0 (base) a 1 (punta).
   */
  function crecerTallo(azar, opciones) {
    const recorrido = [];
    let x = opciones.xInicial;
    let y = opciones.yInicial;
    let angulo = opciones.anguloInicial;
    let velocidadDelGiro = 0;

    for (let paso = 0; paso <= opciones.pasos; paso++) {
      const t = paso / opciones.pasos;
      recorrido.push({ x, y, angulo, t });

      // Giro al azar, pero recordando el giro anterior (inercia).
      // Sin la inercia el tallo temblaría; con ella, serpentea.
      velocidadDelGiro = velocidadDelGiro * opciones.inercia +
                         azar.entre(-opciones.giroMaximo, opciones.giroMaximo);
      angulo += velocidadDelGiro;

      // Tendencia suave a volver hacia el marco, como si se apoyara.
      angulo += (opciones.xObjetivo - x) * opciones.atraccion;

      x += Math.cos(angulo) * opciones.largoDelPaso;
      y += Math.sin(angulo) * opciones.largoDelPaso;
    }

    return recorrido;
  }

  /**
   * Convierte el recorrido de un tallo en una silueta rellena, con el
   * grosor variando de la base a la punta.
   *
   * CÓMO FUNCIONA: para cada punto del recorrido se calcula la
   * perpendicular a la dirección de crecimiento y se marca un punto a
   * cada lado, a media distancia del grosor. Recorriendo primero todos
   * los puntos de la izquierda y después los de la derecha al revés,
   * queda el contorno cerrado del tallo.
   *
   * @param {Array} recorrido    - Lo que devolvió crecerTallo().
   * @param {Object} azar        - Generador con semilla.
   * @param {number} grosorBase  - Ancho en la raíz.
   * @param {number} grosorPunta - Ancho en el extremo.
   * @param {{cantidad:number, fase:number}} [engrosamientos] - Opcional.
   *        Los engrosamientos de los nudos. Se pasa desde afuera cuando el
   *        tallo se dibuja EN TRAMOS: si cada tramo los sorteara por su
   *        cuenta, en las uniones el grosor daría un salto y se vería el
   *        corte.
   * @returns {string} El contorno listo para el atributo "d" de un path.
   */
  function siluetaDelTallo(recorrido, azar, grosorBase, grosorPunta, engrosamientos) {
    const bordeIzquierdo = [];
    const bordeDerecho = [];

    // Los nudos son esos engrosamientos que tienen las ramas de verdad
    const cantidadDeNudos = engrosamientos ? engrosamientos.cantidad : azar.entre(2.5, 5.5);
    const faseDeLosNudos  = engrosamientos ? engrosamientos.fase : azar.entre(0, Math.PI * 2);

    for (const punto of recorrido) {
      // Afinado progresivo: (1−t) elevado a 0,75 adelgaza rápido al
      // principio y despacio al final, como una rama real.
      const afinado = Math.pow(1 - punto.t, 0.75);
      let grosor = grosorPunta + (grosorBase - grosorPunta) * afinado;

      // Engrosamientos irregulares
      grosor *= 1 + 0.24 * Math.sin(punto.t * cantidadDeNudos * Math.PI * 2 + faseDeLosNudos);

      // Perpendicular a la dirección de crecimiento
      const perpendicularX = Math.cos(punto.angulo + Math.PI / 2) * grosor / 2;
      const perpendicularY = Math.sin(punto.angulo + Math.PI / 2) * grosor / 2;

      bordeIzquierdo.push([punto.x + perpendicularX, punto.y + perpendicularY]);
      bordeDerecho.push([punto.x - perpendicularX, punto.y - perpendicularY]);
    }

    bordeDerecho.reverse();
    const contorno = bordeIzquierdo.concat(bordeDerecho);

    return 'M' + contorno
      .map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1))
      .join(' L') + ' Z';
  }


  /* ─── 4. DIBUJAR UNA PLANTA COMPLETA ───────────────────────────── */

  /**
   * Genera el SVG de una planta entera: tallo principal, brotes, hojas,
   * capullos y flores.
   *
   * CÓMO LA LUZ AFECTA EL CRECIMIENTO
   * Un rosal crece hacia la luz. En esta invitación la luz reina arriba y
   * se hunde al bajar (ver la penumbra de profundidad y los haces que
   * pierden poder). Así que una planta ALTA en la página está en plena luz
   * —sus flores se abren y se encienden— y una planta HONDA está en
   * penumbra —sus flores quedan más cerradas (capullos) y apagadas, como
   * las de una planta que no llega a recibir sol—. Ese es el parámetro
   * `luz`: 1 arriba, cerca de 0 en el fondo.
   *
   * @param {number} semilla - Define cómo será esta planta en particular.
   * @param {number} [luz=1] - Cuánta luz recibe (1 arriba, ~0.15 en el fondo).
   * @returns {{svg:string, alto:number}} El dibujo y su altura.
   */
  function dibujarPlanta(semilla, luz = 1) {
    const azar = crearAzarConSemilla(semilla);

    /* Cada planta tiene su propio porte: unas altas y espigadas, otras
       más bajas y frondosas. */
    const alto = azar.entre(420, 640);
    const columnaDeApoyo = azar.entre(24, 52);

    /* ⚠️ DE DÓNDE NACE LA PLANTA.
       La raíz se coloca a propósito FUERA de la página (x negativo) y por
       debajo del borde inferior del dibujo. Como el navegador recorta lo
       que se sale de la página, el nacimiento del tallo nunca se ve: la
       enredadera parece venir de afuera y meterse en el cuadro.

       Antes esto se resolvía difuminando la base con una máscara, y se
       notaba el degradé: parecía que la planta se desvanecía en el aire
       en lugar de continuar más allá del borde. */
    const xDeLaRaiz = azar.entre(-38, -16);

    const recorrido = crecerTallo(azar, {
      xInicial: xDeLaRaiz,
      yInicial: alto + azar.entre(20, 70),
      // Nace apuntando hacia arriba y hacia adentro del cuadro
      anguloInicial: -Math.PI / 2 + azar.entre(0.18, 0.62),
      pasos: azar.entero(26, 38),
      largoDelPaso: alto / azar.entre(26, 34),
      giroMaximo: azar.entre(0.10, 0.20),
      inercia: azar.entre(0.55, 0.78),
      xObjetivo: columnaDeApoyo,
      atraccion: azar.entre(0.0016, 0.0034),
    });

    /* ══ EL TALLO SE ARTICULA EN NUDOS ══
       Para que el tallo pueda DOBLARSE (y no solo la flor), se lo parte en
       tramos encadenados, como los eslabones de un dedo. Cada tramo va
       dentro del anterior:

           <g nudo 0>  tramo de abajo
             <g nudo 1>  tramo siguiente
               <g nudo 2>  … y así

       Girar un nudo mueve automáticamente TODO lo que tiene adentro: el
       resto del tallo, las hojas, los brotes y las flores. Por eso las
       flores nunca se despegan por más que el tallo se doble.

       Cada pieza que se dibuja se guarda en el nudo que le corresponde
       según a qué altura del tallo está enganchada. */
    const CANTIDAD_DE_NUDOS = nudosDeEstaVisita;
    const ultimoIndice = recorrido.length - 1;
    const partesPorNudo = Array.from({ length: CANTIDAD_DE_NUDOS }, () => []);

    /**
     * Dice a qué nudo pertenece un punto del tallo.
     * @param {number} indice - Posición dentro del recorrido.
     * @returns {number} El número de nudo (0 = la base).
     */
    const nudoDe = (indice) => Math.min(
      CANTIDAD_DE_NUDOS - 1,
      Math.floor((indice / ultimoIndice) * CANTIDAD_DE_NUDOS)
    );

    /** Dónde empieza cada nudo, en índices del recorrido. */
    const arranqueDelNudo = [];
    for (let k = 0; k < CANTIDAD_DE_NUDOS; k++) {
      arranqueDelNudo.push(Math.floor((k * ultimoIndice) / CANTIDAD_DE_NUDOS));
    }
    arranqueDelNudo.push(ultimoIndice);

    // Atajo para guardar una pieza en el nudo que le toca
    const enNudo = (indice, dibujo) => partesPorNudo[nudoDe(indice)].push(dibujo);

    // ── Tallo principal, dibujado tramo por tramo ──
    const grosorDeLaBase  = azar.entre(7, 11);
    const grosorDeLaPunta = azar.entre(1.2, 2.2);
    const engrosamientos  = { cantidad: azar.entre(2.5, 5.5), fase: azar.entre(0, Math.PI * 2) };

    for (let k = 0; k < CANTIDAD_DE_NUDOS; k++) {
      /* Se toma un punto de más al final del tramo para que se solape con
         el siguiente: sin ese solape se vería la juntura. */
      const tramo = recorrido.slice(arranqueDelNudo[k], arranqueDelNudo[k + 1] + 1);
      if (tramo.length < 2) continue;
      partesPorNudo[k].push(
        `<path d="${siluetaDelTallo(tramo, azar, grosorDeLaBase, grosorDeLaPunta, engrosamientos)}"
               fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".8"/>`
      );
    }

    // ── Espinas: solo en la mitad de abajo, que es la parte leñosa ──
    const cuantasEspinas = Math.max(2,
      Math.round(azar.entero(4, 9) * rellenoDeEstaVisita));
    for (let i = 0; i < cuantasEspinas; i++) {
      const indiceDeLaEspina = azar.entero(2, Math.floor(recorrido.length * 0.7));
      const punto = recorrido[indiceDeLaEspina];
      const hacia = azar.signo();
      const largo = azar.entre(5, 9);
      const angulo = punto.angulo + hacia * azar.entre(0.7, 1.2);
      enNudo(indiceDeLaEspina,
        `<path d="M${punto.x.toFixed(1)} ${punto.y.toFixed(1)}
                  l${(Math.cos(angulo) * largo).toFixed(1)} ${(Math.sin(angulo) * largo).toFixed(1)}
                  l${(-Math.cos(angulo + 0.9) * largo * 0.5).toFixed(1)} ${(-Math.sin(angulo + 0.9) * largo * 0.5).toFixed(1)} Z"
               fill="#6b5a26" fill-opacity=".85"/>`
      );
    }

    /* ── Brotes laterales ──
       A alturas desparejas y SIN alternar prolijamente: el lado se
       sortea cada vez, así que a veces salen dos seguidos del mismo
       lado y a veces queda un tramo largo pelado.

       Menos brotes donde hay menos luz: una planta en penumbra crece más
       flaca, con menos flores, que una que recibe pleno sol. */
    const cuantosBrotes = Math.max(2, Math.round(azar.entero(3, 6) * (0.6 + luz * 0.4)));
    const flores = [];

    for (let i = 0; i < cuantosBrotes; i++) {
      const indice = azar.entero(3, recorrido.length - 3);
      const nacimiento = recorrido[indice];
      const hacia = azar.signo();

      /* ⚡ SE ACORTÓ UN POCO (pasos era 5-11, largoDelPaso era 9-17).
         Los rosales de los costados no son el foco de este ajuste —los
         ramilletes de las esquinas superiores sí— así que los brotes se
         recortan apenas, lo justo para que no compitan en volumen con
         la esquina que ahora se abrió más. */
      const brote = crecerTallo(azar, {
        xInicial: nacimiento.x,
        yInicial: nacimiento.y,
        anguloInicial: nacimiento.angulo + hacia * azar.entre(0.5, 1.05),
        pasos: azar.entero(4, 9),
        largoDelPaso: azar.entre(7, 13),
        giroMaximo: azar.entre(0.10, 0.24),
        inercia: azar.entre(0.4, 0.7),
        xObjetivo: columnaDeApoyo,
        atraccion: azar.entre(0.0004, 0.0016),
      });

      enNudo(indice,
        `<path d="${siluetaDelTallo(brote, azar, azar.entre(2.6, 4.4), 1)}"
               fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      // Qué hay en la punta del brote
      const punta = brote[brote.length - 1];

      /* El tipo de flor se sortea, pero la LUZ inclina la balanza: donde
         hay luz, la planta abre sus flores (frente, perfil, tres cuartos);
         en penumbra, se queda en capullos y flores a medio abrir, que es
         lo que hace una planta que no llega al sol. El sesgo se logra
         empujando el sorteo hacia arriba cuando falta luz, así cae más en
         los tramos de "media" y "capullo" de la lista de abajo. */
      const sorteo = limitar(azar.numero() + (1 - luz) * 0.4, 0, 0.999);

      /* Se sortea CÓMO ESTÁ ORIENTADA la flor, no solo cuál es.
         En una planta de verdad las flores miran para cualquier lado: hay
         que verlas de frente, de costado, de tres cuartos y hasta de
         espaldas. Si todas miraran al frente parecerían calcomanías
         pegadas encima del tallo. */
      if (sorteo < 0.20) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-frente',
                      escala: azar.entre(0.34, 0.52), giro: azar.entre(-25, 25) });
      } else if (sorteo < 0.44) {
        // De perfil: se apoya sobre la punta del brote, mirando hacia afuera
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-perfil',
                      escala: azar.entre(0.4, 0.6),
                      giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-18, 18) });
      } else if (sorteo < 0.62) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-tres-cuartos',
                      escala: azar.entre(0.38, 0.56), giro: azar.entre(-30, 30) });
      } else if (sorteo < 0.72) {
        // De espaldas: mira hacia adentro del marco
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-dorso',
                      escala: azar.entre(0.3, 0.44), giro: azar.entre(-40, 40) });
      } else if (sorteo < 0.88) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-media',
                      escala: azar.entre(0.4, 0.62),
                      giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25) });
      } else if (sorteo < 0.96) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-capullo',
                      escala: azar.entre(0.45, 0.7),
                      giro: (punta.angulo * 180 / Math.PI) + 90 });
      } else {
        // Zarcillo: un rulito que se enrosca buscando dónde agarrarse
        const radio = azar.entre(4, 7);
        enNudo(indice,
          `<path d="M${punta.x.toFixed(1)} ${punta.y.toFixed(1)}
                    c ${radio} ${-radio}, ${radio * 2.2} ${radio * 0.4}, ${radio} ${radio * 1.6}
                    c ${-radio * 0.7} ${radio * 0.8}, ${-radio * 1.6} ${-radio * 0.2}, ${-radio * 0.6} ${-radio}"
                 fill="none" stroke="#6b5a26" stroke-width="1.6"
                 stroke-linecap="round" stroke-opacity=".9"/>`
        );
      }
    }

    /* ── Hojas ──
       Repartidas sin regla: distinta cantidad, tamaño y giro en cada
       planta, y siempre apuntando hacia arriba y hacia afuera, como
       buscando la luz. */
    const cuantasHojas = Math.max(3,
      Math.round(azar.entero(7, 13) * rellenoDeEstaVisita));
    for (let i = 0; i < cuantasHojas; i++) {
      const indiceDeLaHoja = azar.entero(2, recorrido.length - 2);
      const punto = recorrido[indiceDeLaHoja];
      const hacia = azar.signo();
      const escala = azar.entre(0.42, 0.85);
      // −60° las levanta respecto del tallo: hacia arriba, no colgando
      const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(28, 68);
      enNudo(indiceDeLaHoja,
        `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
              rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
      );
    }

    /* ── Una flor grande cerca de la punta, que es donde la planta
         pone su mejor esfuerzo ── */
    const puntaPrincipal = recorrido[recorrido.length - 2];
    const orientacionesDeLaFlorPrincipal =
      ['rosa-frente', 'rosa-perfil', 'rosa-tres-cuartos', 'rosa-media'];
    flores.push({
      nudo: CANTIDAD_DE_NUDOS - 1,
      x: puntaPrincipal.x, y: puntaPrincipal.y,
      tipo: orientacionesDeLaFlorPrincipal[azar.entero(0, 3)],
      escala: azar.entre(0.5, 0.78), giro: azar.entre(-22, 22),
    });

    /* ── Las flores van al final para que queden por encima de todo, y
         cada una envuelta en su propio grupo: ese grupo es el que después
         mueve la física cuando pasa el mouse. ──

       PROFUNDIDAD: las flores del fondo van más oscuras.
       En la naturaleza, cuanto más lejos está algo, más se apaga y pierde
       color, porque hay más aire de por medio (los pintores lo llaman
       "perspectiva aérea"). Acá se aprovecha que el tamaño ya indica la
       distancia: una flor chica se lee como lejana, así que se la oscurece
       y se le baja el color en proporción.

           escala 0,30 (la más lejana) → 66 % de brillo
           escala 0,78 (la más cercana) → 100 % de brillo

       Sin esto, todas las flores tienen la misma intensidad y la
       enredadera se ve chata, como una calcomanía. */

    /* ── Zarcillos: los hilitos que la planta enrosca para agarrarse ──
       Son la firma visual de una enredadera. Se dibujan como una espiral
       que va abriéndose, y se colocan cruzando la moldura, así parece que
       la planta se está trepando y sujetando al marco. */
    const cuantosZarcillos = Math.max(1,
      Math.round(azar.entero(2, 4) * rellenoDeEstaVisita));
    for (let i = 0; i < cuantosZarcillos; i++) {
      const indiceDelZarcillo = azar.entero(4, recorrido.length - 2);
      const donde = recorrido[indiceDelZarcillo];
      enNudo(indiceDelZarcillo,
        `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
               stroke="url(#rosa-tallo)" stroke-width="${azar.entre(1.1, 1.9).toFixed(1)}"
               stroke-linecap="round" stroke-opacity=".8"/>`
      );
    }

    const ESCALA_MAS_LEJANA  = 0.30;
    const ESCALA_MAS_CERCANA = 0.78;

    for (const flor of flores) {
      // "cercania" vale 0 en la flor más lejana y 1 en la más cercana
      const cercania = limitar(
        (flor.escala - ESCALA_MAS_LEJANA) / (ESCALA_MAS_CERCANA - ESCALA_MAS_LEJANA),
        0, 1
      );
      /* El piso de brillo se subió de .66 a .74: con .66 las flores más
         chicas quedaban casi negras y se leían como un borrón oscuro, no
         como rosas. Ahora las lejanas siguen más apagadas que las
         cercanas —la profundidad de campo se mantiene— pero conservan
         color suficiente para reconocerse como flores.

         Además, la LUZ de la posición apaga la flor: una planta en
         penumbra tiene sus rosas más oscuras que una en pleno sol. El
         factor no baja de .55 para que, aun en el fondo, sigan siendo
         rosas y no manchas negras (el resto de la oscuridad la aporta el
         velo de profundidad, no el dibujo). */
      const apagadoPorLuz = 0.55 + luz * 0.45;
      const brillo = (0.74 + cercania * 0.26) * apagadoPorLuz;

      partesPorNudo[flor.nudo].push(
        `<g class="flor-de-enredadera ${tonoDeLaFlor(brillo)}"
             data-escala="${flor.escala.toFixed(2)}"
             data-x="${flor.x.toFixed(1)}" data-y="${flor.y.toFixed(1)}"
             transform="translate(${flor.x.toFixed(1)} ${flor.y.toFixed(1)})">
           <g class="flor-de-enredadera__movil">
             <use href="#${flor.tipo}"
                  transform="rotate(${flor.giro.toFixed(1)}) scale(${flor.escala.toFixed(2)})"/>
           </g>
         </g>`
      );
    }

    /* ══ SE ARMA LA CADENA DE NUDOS ══
       Se construye de la punta hacia la base, metiendo cada nudo dentro
       del anterior. El resultado es una cadena: girar un nudo arrastra
       todo lo que tiene adentro. */
    let cadena = '';
    for (let k = CANTIDAD_DE_NUDOS - 1; k >= 0; k--) {
      const pivote = recorrido[arranqueDelNudo[k]];
      cadena =
        `<g class="nudo-del-tallo"
             data-pivote-x="${pivote.x.toFixed(1)}" data-pivote-y="${pivote.y.toFixed(1)}">
           ${partesPorNudo[k].join('')}${cadena}
         </g>`;
    }

    return {
      alto,
      svg: `<svg class="racimo-de-rosas" viewBox="0 0 ${ANCHO_DEL_LIENZO} ${alto}"
                 aria-hidden="true">${cadena}</svg>`,
    };
  }


  /**
   * Dibuja un zarcillo: el hilito enroscado con el que las enredaderas se
   * agarran de lo que tengan cerca.
   *
   * Se construye con una ESPIRAL: se va girando de a poco alrededor de un
   * punto mientras el radio crece, y al mismo tiempo todo el conjunto se
   * desplaza hacia arriba. Girar + avanzar = resorte visto de costado.
   *
   * @param {number} xInicio - Dónde nace, a lo ancho.
   * @param {number} yInicio - Dónde nace, a lo alto.
   * @param {Object} azar    - Generador con semilla.
   * @returns {string} El atributo "d" del path.
   *
   * @example
   *   dibujarZarcillo(30, 200, azar)  // → 'M30.0 200.0 L31.2 198.4 …'
   */
  function dibujarZarcillo(xInicio, yInicio, azar) {
    const vueltas    = azar.entre(1.8, 3.2);
    const radioFinal = azar.entre(6, 13);
    const alcance    = azar.entre(16, 34);
    const sentido    = azar.signo();          // se enrosca a un lado o al otro
    const haciaDonde = azar.entre(-0.7, 0.7); // inclinación general
    const PASOS = 44;

    let d = '';
    for (let i = 0; i <= PASOS; i++) {
      const t = i / PASOS;
      const angulo = sentido * t * vueltas * Math.PI * 2;
      const radio  = radioFinal * t;
      const x = xInicio + Math.cos(angulo) * radio + t * alcance * Math.sin(haciaDonde);
      const y = yInicio + Math.sin(angulo) * radio - t * alcance;
      d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }


  /* ─── 4B. LOS RAMILLETES DE LAS ESQUINAS DE ARRIBA ──────────────────

     PARA QUÉ ESTÁN
     La portada tenía las dos esquinas de arriba vacías y el relicario
     quedaba solo en el medio, como un cuadro colgado en una pared
     demasiado grande. Estos ramilletes le devuelven compañía.

     ⚠️ LA FORMA IMPORTA MÁS QUE EL DIBUJO
     Acá ya hubo adornos que terminaron pareciendo otra cosa, y el
     motivo es siempre el mismo: UN TALLO VERTICAL SOLO, con un bulto
     redondo en la punta. Esa silueta hay que evitarla siempre.

     La solución es que el ramillete se lea COMO GUIRNALDA y no como
     tallo. Tres reglas, y ninguna es decorativa:

       1. ABANICO, NO COLUMNA. Los tallos salen de la esquina abiertos
          entre casi horizontal y casi vertical, abrazando las dos
          molduras. Nunca hay un eje único dominante.
       2. MÁS ANCHO QUE ALTO. El lienzo es apaisado y el peso visual se
          reparte a lo largo, no se apila.
       3. LA MASA VA EN LA ESQUINA, no en las puntas. La flor grande se
          apoya donde nacen los tallos, y de ahí en más todo se va
          afinando. Un remate gordo arriba de un tallo largo es
          exactamente lo que no queremos.
     ---------------------------------------------------------------- */

  /** Medidas del lienzo del ramillete. Apaisado a propósito (regla 2).
      Más grande que un racimo suelto porque acá van muchas rosas: si el
      lienzo fuera chico se apelotonarían en un borrón. */
  const ANCHO_DEL_RAMILLETE = 380;
  const ALTO_DEL_RAMILLETE  = 270;

  /**
   * Dibuja un ramillete para una esquina superior.
   *
   * Nace pegado a la esquina y abre en abanico hacia adentro de la
   * página. Se dibuja siempre para la esquina IZQUIERDA; el de la
   * derecha es el mismo dibujo reflejado por CSS, igual que las
   * enredaderas de los laterales.
   *
   * ⚡ REESCRITO A PEDIDO EXPLÍCITO, DESPUÉS DE VARIAS RONDAS QUE SIEMPRE
   * TERMINABAN MAL. La versión anterior tenía tres capas independientes
   * —abanico de tallos y ramas, un "corazón" de rosas grandes, un
   * "relleno" con su propio sesgo geométrico de anclaje— y CADA una con
   * su cantidad y escala ajustadas a mano. Ronda tras ronda el resultado
   * seguía leyéndose mal ("maleza", "matorral", "jardín descuidado"), y
   * el pedido fue dejar de MICROGESTIONAR pieza por pieza.
   *
   * El enfoque nuevo: tratar la esquina como lo que en el fondo es, más
   * marco del relicario, con más luz arriba — la MISMA idea que ya usan
   * las enredaderas de los costados (dibujarPlanta, más arriba: cada
   * rama lleva una sola flor en la punta, sin zonas especiales). Acá hay
   * un solo abanico de ramas cortas, cada una con su flor, más varias
   * rosas de acento en el origen. La cantidad de ramas tiene un LÍMITE
   * FIJO (no una fórmula que se dispara con el ancho de pantalla), pero
   * bastante más alto que el primer intento: acá SÍ tienen que sentirse
   * como un ramillete de verdad —mucho más tupidas que una rama suelta
   * de enredadera— y no como una simple continuación del resto del
   * marco. El límite fijo es lo que evita que eso se convierta otra vez
   * en la maleza de antes: más cantidad, pero sin las ramas secundarias
   * ni las zonas de relleno con sesgo geométrico que eran las que de
   * verdad generaban el enredo.
   *
   * @param {number} semilla    - Define cómo será este ramillete.
   * @param {number} densidad   - Cuán ancha está la pantalla (ver
   *        colocarLosRamilletesDeEsquina). Acá solo mueve la cantidad de
   *        ramas dentro del límite fijo y el grosor del trazo.
   * @param {Function} alTerminar - Se llama con el SVG ya armado, cuando
   *        terminan todas las ramas.
   * @returns {void}
   *
   * ⚡ TROCEADA POR DENTRO, NO SOLO ENTRE LOS DOS RAMILLETES (2026-08-24).
   * Antes esta función armaba TODO el SVG de un ramillete de una sola
   * pasada síncrona, y lo que troceaba "un ramillete por cuadro" era
   * quien la llamaba (ver crearRamillete/armarLosRamilletes). Eso alcanzaba
   * con 14-22 ramas, pero al subir el techo a pedido de "quiero el doble
   * de flores cerca del relicario", un solo ramillete de una sola pasada
   * se acercaba otra vez a la tarea larga de "peor 1101 ms" que ya se
   * había medido y resuelto para los DOS juntos (ver la nota grande en
   * colocarLosRamilletesDeEsquina). Ahora el bucle de ramas de acá abajo
   * también usa trabajarPorTandas() —el mismo criterio por presupuesto de
   * tiempo que ya usa crearUnaPlanta más arriba—, así que duplicar la
   * cantidad de ramas reparte el trabajo en más cuadros en vez de duplicar
   * el tamaño de uno solo.
   */
  function armarRamilleteDeEsquinaPorTandas(semilla, densidad, sigoVigente, alTerminar) {
    const azar = crearAzarConSemilla(semilla);

    /* De dónde nacen todas las ramas: casi en el vértice, apenas
       adentro, para que el ramillete parezca brotar de la moldura. */
    const xDeLaBase = azar.entre(10, 26);
    const yDeLaBase = azar.entre(8, 22);

    const piezas = [];
    const flores = [];

    /* ⚡ SUBIÓ FUERTE (era 6 a 9, después 14 a 22) A PEDIDO EXPLÍCITO: primero
       "quiero que esas de las esquinas tengan mucho más... estas SÍ deben
       ser como ramilletes", y ahora "el doble de flores cerca del
       relicario" para un momento dramático que se viene. Sigue siendo un
       LÍMITE FIJO (nunca una fórmula sin techo como los 46 tallos de las
       rondas viejas): la diferencia es que el techo ahora es el doble de
       alto que la ronda anterior.

       Esto es seguro para el cuadro a cuadro porque un ramillete NO tiene
       nudos (ver colocarLosRamilletesDeEsquina: `nudos: []`) — el bucle de
       física del tallo, el más caro de todo este archivo, itera cero veces
       acá sea cual sea esta cantidad. Lo único que sí escala con más ramas
       es la construcción (de ahí el troceado de esta función) y el chequeo
       de distancia al mouse por flor, que además solo corre mientras se
       está viendo cerca del relicario (ver `estaCerca` en dibujarCuadro). */
    const cuantasRamas = Math.round(limitar(28 + densidad * 12, 28, 44));

    /* El trazo tiene que engrosar un poco en pantallas anchas o la punta
       queda en subpíxeles invisibles (mismo motivo que en las
       enredaderas de los costados). */
    const grosorDelTallo = Math.max(densidad, 1.6);
    const ANGULO_MAS_HORIZONTAL = 0.1;
    const ANGULO_MAS_VERTICAL   = 1.45;

    function construirUnaRama(i) {
      const reparto = i / (cuantasRamas - 1);
      const anguloDeSalida =
        ANGULO_MAS_HORIZONTAL +
        reparto * (ANGULO_MAS_VERTICAL - ANGULO_MAS_HORIZONTAL) +
        azar.entre(-0.09, 0.09);

      // Las ramas del medio del abanico son más largas; las de los
      // extremos, más cortas — redondea el contorno del ramo.
      const cercaniaAlCentro = 1 - Math.abs(reparto - 0.5) * 2;
      const pasos = azar.entero(6, 9);
      const largoDelPaso = azar.entre(20, 30) * (0.7 + cercaniaAlCentro * 0.4);

      /* La raíz de cada rama corre un poco a lo largo de la moldura que
         le toca (arriba para las casi horizontales, al costado para las
         casi verticales), para que el ramo abrace la esquina en vez de
         brotar de un único pinchazo. */
      const xRaiz = xDeLaBase + (1 - reparto) * azar.entre(-4, 50);
      const yRaiz = yDeLaBase + reparto * azar.entre(-4, 50);

      const tallo = crecerTallo(azar, {
        xInicial: xRaiz,
        yInicial: yRaiz,
        anguloInicial: anguloDeSalida,
        pasos,
        largoDelPaso,
        giroMaximo: azar.entre(0.08, 0.16),
        inercia: azar.entre(0.5, 0.75),
        xObjetivo: ANCHO_DEL_RAMILLETE * 0.72,
        atraccion: azar.entre(0.0008, 0.002),
      });

      /* Mismo relleno de reserva que en las enredaderas de los costados:
         el degradado #rosa-tallo referenciado desde otro <svg> a veces
         se lee distinto entre navegadores, así que se dibuja un color
         sólido debajo por si acaso. */
      const dDelTallo = siluetaDelTallo(
        tallo, azar,
        azar.entre(3, 4.6) * grosorDelTallo,
        1 * grosorDelTallo
      );
      piezas.push(
        `<path d="${dDelTallo}" fill="#6a5322"/>` +
        `<path d="${dDelTallo}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      // Una o dos hojas por rama — igual de discreto que en las
      // enredaderas de los costados, nunca compite con la flor.
      const cuantasHojas = azar.entero(1, 2);
      for (let h = 0; h < cuantasHojas; h++) {
        const punto = tallo[azar.entero(1, tallo.length - 2)];
        const hacia = azar.signo();
        const escala = azar.entre(0.4, 0.7);
        const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
        piezas.push(
          `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
        );
      }

      /* UNA flor por rama, en la punta — sin distinguir tallos "cortos"
         de "largos", sin zonas especiales. La orientación se sortea
         entre abiertas y capullo, siempre hacia el lado abierto: acá
         "hay más luz arriba", la misma metáfora de dibujarPlanta, fijada
         en su valor máximo porque esta esquina siempre está en pleno
         sol. */
      const punta = tallo[tallo.length - 1];
      const orientaciones = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media', 'rosa-capullo'];
      flores.push({
        x: punta.x, y: punta.y,
        tipo: orientaciones[azar.entero(0, orientaciones.length - 1)],
        escala: azar.entre(0.42, 0.6),
        giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25),
      });

      // Algún zarcillo suelto, que le da aire al conjunto.
      if (azar.numero() < 0.4) {
        const donde = tallo[azar.entero(2, tallo.length - 1)];
        piezas.push(
          `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
                 stroke="url(#rosa-tallo)" stroke-width="${azar.entre(1, 1.6).toFixed(1)}"
                 stroke-linecap="round" stroke-opacity=".75"/>`
        );
      }
    }

    /**
     * Cierra el ramillete: el acento del origen + las flores por encima,
     * y arma el SVG final. Corre una sola vez, después de que
     * trabajarPorTandas() terminó con TODAS las ramas — nunca antes, para
     * no escribir un ramillete a medias (ver la nota de "flores voladoras"
     * más abajo, en crearRamillete).
     * @returns {void}
     */
    function alTerminarLasRamas() {
      /* El acento: varias rosas más grandes justo en el origen, el "moño"
         que tapa el nacimiento del abanico y hace que la esquina se sienta
         CARGADA, como un ramillete de verdad y no solo una rama más larga.
         Sigue siendo fijo (no escala con densidad) porque es un detalle,
         no otra zona para sintonizar — subió de 2 a 4 en la ronda anterior,
         y ahora de 4 a 8 junto con el resto de las ramas, mismo pedido de
         "el doble de flores cerca del relicario". Es un bucle chico y fijo
         (8 vueltas): no hace falta trocearlo aparte. */
      const orientacionesDelAcento = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media'];
      for (let i = 0; i < 8; i++) {
        const xFlor = xDeLaBase + azar.entre(6, 55);
        const yFlor = yDeLaBase + azar.entre(6, 48);
        piezas.push(
          `<path d="M${xDeLaBase.toFixed(1)} ${yDeLaBase.toFixed(1)} Q ` +
          `${(xDeLaBase + (xFlor - xDeLaBase) * 0.5 + azar.entre(-5, 5)).toFixed(1)} ` +
          `${(yDeLaBase + (yFlor - yDeLaBase) * 0.5 + azar.entre(-5, 5)).toFixed(1)}, ` +
          `${xFlor.toFixed(1)} ${yFlor.toFixed(1)}" fill="none" ` +
          `stroke="url(#rosa-tallo)" stroke-width="${(2 * grosorDelTallo).toFixed(1)}" ` +
          `stroke-linecap="round" stroke-opacity=".8"/>`
        );
        flores.push({
          x: xFlor, y: yFlor,
          tipo: orientacionesDelAcento[i % orientacionesDelAcento.length],
          escala: azar.entre(0.48, 0.64),
          giro: azar.entre(-25, 25),
        });
      }

      /* Las flores van al final para quedar por encima de tallos y hojas.
         El apagado de las chicas es el mismo criterio de las enredaderas:
         más chica se lee como más lejana, así que va más oscura. */
      const ESCALA_MAS_LEJANA  = 0.28;
      const ESCALA_MAS_CERCANA = 0.78;

      for (const flor of flores) {
        const cercania = limitar(
          (flor.escala - ESCALA_MAS_LEJANA) / (ESCALA_MAS_CERCANA - ESCALA_MAS_LEJANA),
          0, 1
        );
        // Mismo piso de brillo subido que en las enredaderas (.74), para
        // que las flores chicas de las esquinas no se ennegrezcan.
        const brillo = 0.74 + cercania * 0.26;

        piezas.push(
          `<g class="flor-de-enredadera ${tonoDeLaFlor(brillo)}"
               data-escala="${flor.escala.toFixed(2)}"
               data-x="${flor.x.toFixed(1)}" data-y="${flor.y.toFixed(1)}"
               transform="translate(${flor.x.toFixed(1)} ${flor.y.toFixed(1)})">
             <g class="flor-de-enredadera__movil">
               <use href="#${flor.tipo}"
                    transform="rotate(${flor.giro.toFixed(1)}) scale(${flor.escala.toFixed(2)})"/>
             </g>
           </g>`
        );
      }

      alTerminar(
        `<svg class="racimo-de-rosas racimo-de-rosas--esquina"
              viewBox="0 0 ${ANCHO_DEL_RAMILLETE} ${ALTO_DEL_RAMILLETE}"
              aria-hidden="true">${piezas.join('')}</svg>`
      );
    }

    trabajarPorTandas(
      cuantasRamas,
      i => { if (!sigoVigente || sigoVigente()) construirUnaRama(i); },
      () => { if (!sigoVigente || sigoVigente()) alTerminarLasRamas(); }
    );
  }


  /* ─── 4C. LOS RAMILLETES INTERMEDIOS DE LA CENEFA SUPERIOR ───────────

     PARA QUÉ ESTÁN (2026-08-24, a pedido explícito)
     Con solo los dos ramilletes de esquina, todo el tramo de cenefa entre
     cada esquina y el relicario queda pelado — justo el espacio que se
     ve "vacío cerca del relicario". La respuesta NO es agrandar más los
     ramilletes de esquina: ese camino ya se probó (54vw de ancho) y el
     resultado fue "gigantesco... como jardín que descuidaste por meses"
     (ver la nota de .marco__ramillete en 02-marco-victoriano.css) — así
     que el ancho de esquina quedó deliberadamente congelado. En cambio,
     se agregan DOS anclajes más, chicos, a mitad de camino entre cada
     esquina y el centro: reparten la densidad a lo largo de todo el
     borde en vez de concentrarla en dos puntas.

     MISMO LENGUAJE, DISTINTA FORMA
     Sigue siendo la regla de siempre —abanico con la masa en el origen,
     nunca "un tallo solo con un bulto en la punta" (ver las 3 reglas más
     arriba)— pero acá no hay ningún vértice que abrazar: es un borde
     PLANO. Así que el abanico, en vez de abrirse de horizontal a
     vertical como en la esquina, cuelga hacia ABAJO desde un punto del
     borde — como una guirnalda colgada de la moldura. Además de evitar
     la silueta prohibida, esto ya apunta hacia donde vive el relicario,
     que es justo lo que hace falta para el efecto futuro que se busca
     (ver el pedido: "las flores intentando acercarse al relicario").

     POR QUÉ ES UNA FUNCIÓN APARTE Y NO EL MISMO GENERADOR PARAMETRIZADO
     Comparte los mismos ladrillos de abajo (crecerTallo, siluetaDelTallo,
     dibujarZarcillo, tonoDeLaFlor, trabajarPorTandas) pero NINGUNO de los
     números — origen, ángulos, cantidad, escala— porque son geometrías
     distintas (wrap de esquina vs. colgado de borde). Meterlas en un solo
     generador con un objeto de configuración hubiera significado tocar
     el generador de esquina —ya probado, ya verificado en el navegador
     tras cazar un bug real— para agregar algo que no lo necesita. Repetir
     la forma del bucle es más seguro acá que compartirla.

     Solo se colocan en pantallas anchas (ver colocarLosRamilletesDeEsquina):
     en celular la portada ya ocupa casi todo el ancho del marco y no hay
     ningún "espacio vacío" real que llenar — agregarlos ahí sería
     exactamente la maleza que este archivo lleva rondas enteras evitando.
     ----------------------------------------------------------------- */

  /** Medidas del lienzo del ramillete intermedio: bastante más chico que
      el de esquina (regla 745) porque acá es un acento que se repite dos
      veces, no la masa principal. */
  const ANCHO_DEL_RAMILLETE_INTERMEDIO = 210;
  const ALTO_DEL_RAMILLETE_INTERMEDIO  = 190;

  /**
   * Arma UN ramillete intermedio (guirnalda colgante), troceado por
   * ramas igual que el de esquina. Misma forma de llamarse que
   * armarRamilleteDeEsquinaPorTandas — así crearRamillete() puede usar
   * cualquiera de las dos sin saber cuál es.
   *
   * @param {number} semilla
   * @param {number} densidad
   * @param {Function} sigoVigente
   * @param {Function} alTerminar - Se llama con el SVG ya armado.
   * @returns {void}
   */
  function armarRamilleteIntermedioPorTandas(semilla, densidad, sigoVigente, alTerminar) {
    const azar = crearAzarConSemilla(semilla);

    /* El origen va cerca del CENTRO horizontal del lienzo (no de una
       esquina): de acá cuelga todo el abanico, como el broche de una
       guirnalda. */
    const xDeLaBase = azar.entre(95, 115);
    const yDeLaBase = azar.entre(6, 16);

    const piezas = [];
    const flores = [];

    /* Bastante menos ramas que un ramillete de esquina: es un acento
       que se repite dos veces a los costados del relicario, no la masa
       principal — si tuviera la misma densidad que la esquina, el tramo
       de arriba se leería sobrecargado en vez de acompañado. */
    const cuantasRamas = Math.round(limitar(9 + densidad * 4, 9, 15));
    const grosorDelTallo = Math.max(densidad, 1.4);

    /* Abanico que cuelga hacia abajo: de "abajo-y-a-la-derecha" a
       "abajo-y-a-la-izquierda", centrado en la vertical (π/2). Sin este
       centrado se parecería a un tallo apuntando a un solo lado, que es
       justo la silueta que las reglas de más arriba prohíben. */
    const ANGULO_INICIO = 0.75;
    const ANGULO_FIN    = 2.4;

    function construirUnaRama(i) {
      const reparto = i / Math.max(1, cuantasRamas - 1);
      const anguloDeSalida =
        ANGULO_INICIO + reparto * (ANGULO_FIN - ANGULO_INICIO) + azar.entre(-0.08, 0.08);

      const cercaniaAlCentro = 1 - Math.abs(reparto - 0.5) * 2;
      const pasos = azar.entero(5, 7);
      const largoDelPaso = azar.entre(14, 21) * (0.7 + cercaniaAlCentro * 0.4);

      /* La raíz corre a lo largo del borde plano (en X, alrededor del
         centro), no diagonal como en la esquina: acá no hay vértice que
         abrazar, solo una línea recta de la que cuelga todo. */
      const xRaiz = xDeLaBase + (reparto - 0.5) * azar.entre(70, 110);
      const yRaiz = yDeLaBase + azar.entre(-3, 3);

      const tallo = crecerTallo(azar, {
        xInicial: xRaiz,
        yInicial: yRaiz,
        anguloInicial: anguloDeSalida,
        pasos,
        largoDelPaso,
        giroMaximo: azar.entre(0.08, 0.16),
        inercia: azar.entre(0.5, 0.75),
        xObjetivo: ANCHO_DEL_RAMILLETE_INTERMEDIO * 0.5,
        atraccion: azar.entre(0.0008, 0.002),
      });

      const dDelTallo = siluetaDelTallo(
        tallo, azar,
        azar.entre(2.6, 3.8) * grosorDelTallo,
        1 * grosorDelTallo
      );
      piezas.push(
        `<path d="${dDelTallo}" fill="#6a5322"/>` +
        `<path d="${dDelTallo}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      // Como mucho una hoja por rama: acá el acento son las flores, no
      // el follaje.
      if (azar.numero() < 0.7) {
        const punto = tallo[azar.entero(1, tallo.length - 2)];
        const hacia = azar.signo();
        const escala = azar.entre(0.35, 0.6);
        const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
        piezas.push(
          `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
        );
      }

      const punta = tallo[tallo.length - 1];
      const orientaciones = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media', 'rosa-capullo'];
      flores.push({
        x: punta.x, y: punta.y,
        tipo: orientaciones[azar.entero(0, orientaciones.length - 1)],
        escala: azar.entre(0.36, 0.52),
        giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25),
      });

      if (azar.numero() < 0.3) {
        const donde = tallo[azar.entero(2, tallo.length - 1)];
        piezas.push(
          `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
                 stroke="url(#rosa-tallo)" stroke-width="${azar.entre(.8, 1.3).toFixed(1)}"
                 stroke-linecap="round" stroke-opacity=".75"/>`
        );
      }
    }

    function alTerminarLasRamas() {
      /* Un acento chico en el origen — el broche de la guirnalda — para
         que no se lea como puros tallos sueltos. Bastante menos que en
         la esquina (3 en vez de 8): es un detalle, no la masa. */
      const orientacionesDelAcento = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media'];
      for (let i = 0; i < 3; i++) {
        const xFlor = xDeLaBase + azar.entre(-28, 28);
        const yFlor = yDeLaBase + azar.entre(4, 26);
        piezas.push(
          `<path d="M${xDeLaBase.toFixed(1)} ${yDeLaBase.toFixed(1)} Q ` +
          `${(xDeLaBase + (xFlor - xDeLaBase) * 0.5 + azar.entre(-4, 4)).toFixed(1)} ` +
          `${(yDeLaBase + (yFlor - yDeLaBase) * 0.5 + azar.entre(-4, 4)).toFixed(1)}, ` +
          `${xFlor.toFixed(1)} ${yFlor.toFixed(1)}" fill="none" ` +
          `stroke="url(#rosa-tallo)" stroke-width="${(1.8 * grosorDelTallo).toFixed(1)}" ` +
          `stroke-linecap="round" stroke-opacity=".8"/>`
        );
        flores.push({
          x: xFlor, y: yFlor,
          tipo: orientacionesDelAcento[i % orientacionesDelAcento.length],
          escala: azar.entre(0.4, 0.54),
          giro: azar.entre(-25, 25),
        });
      }

      const ESCALA_MAS_LEJANA  = 0.28;
      const ESCALA_MAS_CERCANA = 0.78;

      for (const flor of flores) {
        const cercania = limitar(
          (flor.escala - ESCALA_MAS_LEJANA) / (ESCALA_MAS_CERCANA - ESCALA_MAS_LEJANA),
          0, 1
        );
        const brillo = 0.74 + cercania * 0.26;

        piezas.push(
          `<g class="flor-de-enredadera ${tonoDeLaFlor(brillo)}"
               data-escala="${flor.escala.toFixed(2)}"
               data-x="${flor.x.toFixed(1)}" data-y="${flor.y.toFixed(1)}"
               transform="translate(${flor.x.toFixed(1)} ${flor.y.toFixed(1)})">
             <g class="flor-de-enredadera__movil">
               <use href="#${flor.tipo}"
                    transform="rotate(${flor.giro.toFixed(1)}) scale(${flor.escala.toFixed(2)})"/>
             </g>
           </g>`
        );
      }

      alTerminar(
        `<svg class="racimo-de-rosas racimo-de-rosas--intermedio"
              viewBox="0 0 ${ANCHO_DEL_RAMILLETE_INTERMEDIO} ${ALTO_DEL_RAMILLETE_INTERMEDIO}"
              aria-hidden="true">${piezas.join('')}</svg>`
      );
    }

    trabajarPorTandas(
      cuantasRamas,
      i => { if (!sigoVigente || sigoVigente()) construirUnaRama(i); },
      () => { if (!sigoVigente || sigoVigente()) alTerminarLasRamas(); }
    );
  }

  /**
   * Coloca los ramilletes de arriba (los dos de esquina, y —en pantallas
   * anchas— los dos intermedios de la cenefa) y los suma a la lista de
   * plantas, para que respiren y reaccionen al mouse igual que las
   * enredaderas de los costados.
   *
   * @returns {void}
   */
  function colocarLosRamilletesDeEsquina(alTerminar, sigoVigente) {
    /* Interruptor de medición: se salta el armado Y el verificador tardío
       (que vive adentro de esta misma función y volvería a dibujarlos a los
       6 segundos), pero se sigue llamando a alTerminar para no cortar la
       cadena de construcción que viene detrás. */
    if (SIN_RAMILLETES) {
      if (typeof alTerminar === 'function') alTerminar();
      return;
    }

    let semilla = 9100;
    // Si no se pasa control de corrida, se asume que siempre es vigente.
    const vigente = (typeof sigoVigente === 'function') ? sigoVigente : () => true;

    /* ── CUÁN TUPIDOS VAN, SEGÚN LA PANTALLA ──
       En una pantalla grande, un ramillete con pocas rosas se pierde en
       la esquina y se ve pelado; en un celangosto, uno con muchas tapa
       medio nombre de Ania y se ve saturado. Así que la cantidad de
       flores se ata al ancho de la ventana.

       La cuenta es una regla de tres recortada: a 1400 px de ancho la
       densidad es 1 (la de referencia), y se estira o encoge con la
       pantalla, pero nunca baja de 0,6 ni pasa de 1,45 —fuera de esos
       límites o queda vacío o queda amontonado—.

       Esto se recalcula solo al cambiar el tamaño de la ventana, porque
       repartirPlantas() —que llama acá— se vuelve a ejecutar con cada
       redimensión (ver el listener de 'resize' al final del archivo). */
    /* ⛔ Acá NO se multiplica por el nivel de calidad. Se probó y rompió los
       ramilletes (ver la nota de SEPARACION_ENTRE_PLANTAS arriba). */
    const densidad = limitar(window.innerWidth / 1250, 0.55, 1.9);

    /* ── QUÉ ANCLAJES VAN, SEGÚN LA PANTALLA ──
       Los dos de esquina van siempre. Los dos intermedios (la guirnalda
       que rellena la cenefa entre cada esquina y el relicario, ver la
       sección 4C más arriba) solo entran en pantallas anchas: en celular
       la portada ya ocupa casi todo el ancho del marco —no hay ningún
       "espacio vacío" real que llenar ahí—, y agregarlos habría sido
       exactamente la maleza que este archivo lleva rondas evitando. El
       corte de 720px es el mismo que ya usa el resto del marco para
       "es celular" (ver la media query de .marco__ramillete en
       02-marco-victoriano.css). */
    const anclajes = [
      { selector: '.marco__ramillete--izquierdo', lado: 'esquina-izq',
        espejada: false, anchoLienzo: ANCHO_DEL_RAMILLETE, armar: armarRamilleteDeEsquinaPorTandas },
      { selector: '.marco__ramillete--derecho', lado: 'esquina-der',
        espejada: true, anchoLienzo: ANCHO_DEL_RAMILLETE, armar: armarRamilleteDeEsquinaPorTandas },
    ];
    if (window.innerWidth > 720) {
      anclajes.push(
        { selector: '.marco__ramillete--intermedio-izquierdo', lado: 'intermedio-izq',
          espejada: false, anchoLienzo: ANCHO_DEL_RAMILLETE_INTERMEDIO, armar: armarRamilleteIntermedioPorTandas },
        { selector: '.marco__ramillete--intermedio-derecho', lado: 'intermedio-der',
          espejada: true, anchoLienzo: ANCHO_DEL_RAMILLETE_INTERMEDIO, armar: armarRamilleteIntermedioPorTandas }
      );
    }
    anclajes.forEach(anclaje => { anclaje.elemento = buscar(anclaje.selector); });

    /* ⚡ UN RAMILLETE POR CUADRO, Y CADA UNO, ADEMÁS, DE A RAMAS POR DENTRO.
       Cada uno lleva bastantes más rosas con sus tallos desde que se
       duplicó la cantidad cerca del relicario (ver
       armarRamilleteDeEsquinaPorTandas): los dos de esquina juntos, de una
       sola vez, ya era el bloque de construcción más grande de toda la web
       ANTES de duplicar nada — y ahora se suman dos anclajes más. Hacer
       uno, dejar respirar al navegador y hacer el siguiente sigue dando
       EXACTAMENTE el mismo resultado (mismas semillas, mismo dibujo) sin
       congelar nada — y ahora, adentro de cada uno, el propio bucle de
       ramas también cede el hilo por presupuesto de tiempo, así que ni un
       solo ramillete entero vuelve a ser una tarea larga de un tirón. */
    let indiceDeAnclaje = 0;

    /**
     * Arma los ramilletes, UNO POR CUADRO (y cada uno, adentro, de a ramas).
     *
     * ⚠️ ESTO VOLVIÓ A SER UNO POR CUADRO, Y HAY UNA LECCIÓN.
     * Cuando el ramillete derecho desaparecía, culpé al troceado y los junté
     * en una sola pasada. Me equivoqué: la causa real era una LLAVE DE CIERRE
     * que falta en el CSS (ver .marco__ramillete en
     * estilos/02-marco-victoriano.css). El troceado nunca tuvo la culpa.
     *
     * Y juntarlos costaba caro: cada ramillete lleva bastantes rosas con sus
     * tallos, y los cuatro de corrido —más las plantas y las mediciones que
     * vienen encadenadas— producirían una tarea larguísima. El medidor ya
     * había cazado «peor 1101 ms» solo con los dos de esquina.
     *
     * Ahora vuelven a ir de a uno, con el guardia de reentrada puesto: si
     * entra una construcción más nueva, esta se apaga sola. Y crearRamillete
     * es asincrónica (arma sus propias ramas de a tandas), así que acá se
     * espera a su callback antes de pasar al siguiente anclaje — nunca se
     * asume que ya terminó solo porque la llamada retornó.
     *
     * @returns {void}
     */
    function armarLosRamilletes() {
      if (!vigente()) return;

      const anclaje = anclajes[indiceDeAnclaje];
      indiceDeAnclaje++;

      function seguirConElSiguiente() {
        if (indiceDeAnclaje < anclajes.length) { cederYSeguir(armarLosRamilletes); return; }

        /* ⚡ cederYSeguir, no una llamada directa (2026-08-24): el último
           ramillete acaba de escribir su `innerHTML` dos líneas atrás (ver
           crearRamillete). revisarQueEstenTodos() lee getBoundingClientRect()
           de cada anclaje para el diagnóstico — leer esa geometría en el
           MISMO turno en que se acaba de escribir fuerza un reflow completo
           (el mismo patrón de "reprocesamiento forzado" que ya se corrigió
           en otros archivos de esta ronda). Cediendo un cuadro, el navegador
           ya resolvió el layout solo y la lectura sale gratis. */
        cederYSeguir(revisarQueEstenTodos);
      }

      if (anclaje.elemento) {
        crearRamillete(anclaje, vigente, seguirConElSiguiente);
      } else {
        seguirConElSiguiente();
      }
    }

    /**
     * Comprueba que TODOS los ramilletes hayan quedado dibujados y rehace
     * el que falte.
     *
     * ⚠️ POR QUÉ EXISTE ESTA FUNCIÓN. El ramillete de la esquina derecha
     * desapareció tres veces seguidas y cada intento de diagnosticarlo por
     * lectura de código falló. En vez de seguir adivinando, el código
     * comprueba su propio resultado: si un hueco quedó sin SVG, lo vuelve a
     * armar en el acto.
     *
     * No es un parche que tape el problema: si hiciera falta, deja dicho en
     * consola cuál falló, y eso es información que hasta ahora no teníamos.
     *
     * ⚡ Espera a que terminen los reintentos (crearRamillete es
     * asincrónica) antes de publicar window.EstadoDeLosRamilletes y de
     * avisar con `alTerminar` — antes, cuando todo era síncrono, alcanzaba
     * con leer el DOM enseguida después de reconstruir; ahora ese
     * diagnóstico tiene que esperar a que el reintento realmente termine,
     * o reportaría "no existe" sobre un ramillete que en realidad ya está
     * en camino.
     *
     * @returns {void}
     */
    function revisarQueEstenTodos() {
      function publicarEstadoYAvisar() {
        /* ⚠️ SE COMPRUEBA QUE ADEMÁS SE VEAN, no solo que existan.
           El ramillete derecho desapareció cinco veces y ya descarté, con
           medición, que sea el markup, el generador, la semilla o una
           carrera de construcción. El problema, cuando pasaba, era que el
           SVG se generaba bien pero no se RENDERIZABA.

           Estas medidas se publican en el cartel de ?fps=1 para poder verlo
           de un vistazo, sin abrir las herramientas del navegador. Si
           alguno sale con ancho o alto 0, o con una posición fuera de la
           pantalla, ahí está la respuesta. */
        window.EstadoDeLosRamilletes = anclajes.map(anclaje => {
          const hueco = anclaje.elemento;
          if (!hueco) return { lado: anclaje.lado, existe: false };
          const svg = hueco.querySelector('.racimo-de-rosas');
          const caja = hueco.getBoundingClientRect();
          return {
            lado: anclaje.lado,
            existe: !!svg,
            rosas: svg ? svg.querySelectorAll('.flor-de-enredadera').length : 0,
            x: Math.round(caja.left),
            y: Math.round(caja.top),
            ancho: Math.round(caja.width),
            alto: Math.round(caja.height),
          };
        });

        if (typeof alTerminar === 'function') alTerminar();
      }

      const faltantes = [];
      anclajes.forEach((anclaje, indice) => {
        if (anclaje.elemento && !anclaje.elemento.querySelector('.racimo-de-rosas')) faltantes.push(indice);
      });

      if (!faltantes.length) { publicarEstadoYAvisar(); return; }

      let cuantosFaltanPorTerminar = faltantes.length;
      faltantes.forEach(indice => {
        /* Se rehace con la MISMA semilla que le tocaba, para que el dibujo
           sea el que corresponde a ese anclaje y no uno distinto.
           crearRamillete() lee `semilla` de forma síncrona, ANTES de entrar
           en su propio troceado por ramas, así que restaurarla enseguida
           acá abajo —sin esperar a que la construcción termine— sigue
           siendo seguro. */
        const semillaGuardada = semilla;
        semilla = 9100 + indice;
        crearRamillete(anclajes[indice], vigente, () => {
          cuantosFaltanPorTerminar--;
          if (cuantosFaltanPorTerminar === 0) publicarEstadoYAvisar();
        });
        semilla = semillaGuardada;
      });
    }

    /**
     * Crea UN ramillete (de esquina o intermedio, según lo que traiga el
     * anclaje) y lo suma a la lista de plantas.
     *
     * ⚡ ASINCRÓNICA (2026-08-24): por dentro arma las ramas de a tandas por
     * presupuesto de tiempo (ver armarRamilleteDeEsquinaPorTandas /
     * armarRamilleteIntermedioPorTandas), así que ya NO deja el SVG escrito
     * ni la planta sumada cuando retorna — avisa con `alTerminarEsteRamillete`
     * recién cuando de verdad terminó.
     *
     * @param {Object} anclaje - Uno de los objetos de `anclajes`: trae el
     *        elemento del DOM, si va espejado, el ancho de su lienzo y qué
     *        función de dibujo usar.
     * @param {Function} [sigoVigente] - Si se pasa y da false cuando termina
     *        de construirse, no se escribe nada: una corrida más nueva ya
     *        se hizo cargo de este mismo anclaje.
     * @param {Function} [alTerminarEsteRamillete] - Se llama cuando el
     *        ramillete ya quedó escrito en el DOM y sumado a `plantas`.
     * @returns {void}
     */
    function crearRamillete(anclaje, sigoVigente, alTerminarEsteRamillete) {
      const hueco = anclaje.elemento;

      /* ⚠️ SI ESTO SE LLAMA DE NUEVO SOBRE EL MISMO HUECO (revisarQueEstenTodos
         reconstruyendo un ramillete que no salió bien), el innerHTML de abajo
         tira el SVG viejo — pero la entrada que ESE ramillete tenía en
         `plantas` seguía viva, animándose cada cuadro sobre un nodo que ya
         no está en la página. Se limpia antes de agregar la nueva. */
      for (let i = plantas.length - 1; i >= 0; i--) {
        if (plantas[i].elemento && !plantas[i].elemento.isConnected) plantas.splice(i, 1);
      }

      /* Las dos semillas se leen ACÁ, de forma síncrona, antes de entrar en
         el troceado por ramas — igual que antes, cuando todo era síncrono.
         Si se leyeran más abajo, dentro del callback de anclaje.armar(),
         correrían el riesgo de leer un `semilla` que ya cambió por otra
         llamada mientras tanto (revisarQueEstenTodos la restaura enseguida
         después de llamar acá, sin esperar a que termine la construcción). */
      const semillaDelDibujo = semilla;
      semilla++;
      const semillaDelMovimiento = semilla;

      anclaje.armar(semillaDelDibujo, densidad, sigoVigente, svg => {
        /* Si entró una corrida más nueva mientras este ramillete se armaba
           de a ramas, no se escribe nada — la corrida nueva ya se está
           haciendo cargo de este mismo anclaje. Mismo criterio de reentrada
           que ya usa el resto del archivo (corridaVigente en
           repartirPlantas): esto es justo lo que evita, acá también, que un
           ramillete quede a medio armar por una construcción vieja que
           sigue escribiendo. */
        if (typeof sigoVigente === 'function' && !sigoVigente()) return;

        hueco.innerHTML = svg;

        const azarDeMovimiento = crearAzarConSemilla(semillaDelMovimiento * 7919);

        plantas.push({
          elemento: hueco.querySelector('.racimo-de-rosas'),
          flores: Array.from(hueco.querySelectorAll('.flor-de-enredadera')),
          nudos: [],              // no se articula: es un ramo, no una trepadora
          espejada: anclaje.espejada,
          /* Ancho del viewBox de ESTE dibujo. Sirve para pasar coordenadas del
             dibujo a píxeles de pantalla sin medir elemento por elemento. */
          anchoDelLienzo: anclaje.anchoLienzo,
          alturaEnLaPagina: 0,    // viven arriba de todo

          inclinacion: 0,
          velocidadDeLaInclinacion: 0,

          /* Mucho menos sensible al scroll que una enredadera. Un ramo
             apoyado en el marco se mueve apenas; si se meciera como una
             planta suelta, delataría que es un dibujo pegado encima. */
          sensibilidad: azarDeMovimiento.entre(0.16, 0.3),
          rigidez: RIGIDEZ_DE_LA_PLANTA * azarDeMovimiento.entre(0.8, 1.2),
          amortiguacion: AMORTIGUACION_DE_LA_PLANTA * azarDeMovimiento.entre(1, 1.4),

          amplitudDeRespiracion: azarDeMovimiento.entre(0.25, 0.6),
          velocidadDeRespiracion: azarDeMovimiento.entre(0.2, 0.4),
          faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),

          estadoDeLasFlores: null,
        });

        if (typeof alTerminarEsteRamillete === 'function') alTerminarEsteRamillete();
      });
    }

    armarLosRamilletes();
  }


  /* ─── 5. REPARTIR LAS PLANTAS ──────────────────────────────────── */

  /* Los troceados de acá abajo (construir plantas, armar ramilletes, medir
     flores) usan cederElHilo() y trabajarPorTandas(), que viven en
     codigo/02-utilidades.js porque los comparten también las velas y las
     motas. Ahí está explicado en detalle por qué no alcanza con
     requestAnimationFrame a secas (con la pestaña de fondo rAF no corre, y
     el troceado quedaba a mitad de camino con las enredaderas vacías). */
  const cederYSeguir = cederElHilo;

  /** @type {Array<Object>} Todas las plantas con su estado de movimiento. */
  const plantas = [];

  /** Cuántas plantas entraban la última vez que se construyó todo, para no
   *  reconstruir si un resize no cambia ese número (el caso más común: solo
   *  cambiar el ANCHO no cambia cuántas plantas entran a lo ALTO). -1 =
   *  todavía no se construyó nada. */
  let ultimaCuantasEntran = -1;

  /**
   * Reparte plantas a lo largo de los dos laterales del marco.
   * Se vuelve a llamar si cambia el tamaño de la ventana.
   * @returns {void}
   */
  /** Número de la corrida de construcción vigente.
   *
   *  ⚠️ ESTO EXISTE POR UN BUG REAL. repartirPlantas() NO termina cuando
   *  retorna: arma las ~20 plantas en tandas de 4 y después los dos
   *  ramilletes de esquina de a uno por cuadro, o sea que sigue trabajando
   *  durante decenas de cuadros. Si alguien la vuelve a llamar mientras
   *  tanto (un resize, o el gobernador de calidad), la corrida nueva vacía
   *  los contenedores y el array… pero las tandas pendientes de la corrida
   *  vieja SIGUEN EJECUTÁNDOSE, escribiendo sobre los mismos huecos. El
   *  resultado fue un ramillete de esquina que desaparecía.
   *
   *  Con esto, cada tanda comprueba si sigue siendo la corrida vigente
   *  antes de tocar nada; si no lo es, se apaga sola. */
  let corridaVigente = 0;

  function repartirPlantas() {
    const altoDelDocumento = document.body.scrollHeight;
    const cuantasEntran = Math.max(3, Math.floor(altoDelDocumento / SEPARACION_ENTRE_PLANTAS));

    /* ⚡ NO RECONSTRUIR SI NO HACE FALTA. Tirar todo y rehacer es la
       operación más cara de toda la web (ver la nota de troceado, abajo).
       Si la cantidad de plantas que entran no cambió, alcanza con volver a
       medir dónde quedó cada una —el ancho sí pudo cambiar—, sin recrear
       ningún SVG.

       ⚡ ESTE CHEQUEO VA ANTES DE TOCAR corridaVigente (2026-09-01). Antes
       ++corridaVigente vivía arriba de este if, así que CUALQUIER llamada
       —incluso una que terminaba acá mismo sin reconstruir nada— invalidaba
       la corrida anterior. Si un resize (la barra del navegador
       apareciendo/ocultándose, o simplemente el layout asentándose en un
       equipo lento) llegaba MIENTRAS las ~20 plantas todavía se estaban
       armando en tandas —proceso que dura decenas de cuadros, ver la nota
       de corridaVigente más abajo— y el ancho no alcanzaba a cambiar
       cuántas plantas entran, esta función cortaba la corrida en curso
       (vaciando enredaderaIzquierda/enredaderaDerecha) y no arrancaba
       ninguna nueva: las enredaderas quedaban vacías para siempre, sin
       ningún disparador que las reconstruyera. En un equipo lento, donde
       la construcción tarda mucho más, la ventana para que esto pase es
       mucho más ancha — es la causa confirmada de "las flores no
       aparecen". Ahora solo se invalida una corrida en marcha cuando de
       verdad va a arrancar una nueva. */
    if (cuantasEntran === ultimaCuantasEntran) {
      medirLasFlores();
      return;
    }
    ultimaCuantasEntran = cuantasEntran;

    const miCorrida = ++corridaVigente;
    const sigoVigente = () => miCorrida === corridaVigente;

    enredaderaIzquierda.innerHTML = '';
    enredaderaDerecha.innerHTML = '';
    plantas.length = 0;

    /* Lista plana de qué crear, con la MISMA semilla que le tocaría en el
       viejo bucle anidado (i por fuera, lado por dentro): así el resultado
       —qué planta sale en cada lugar— es idéntico, solo que ahora se puede
       trocear en tandas sin desarmar el orden. */
    const tareas = [];
    let semilla = 1;
    for (let i = 0; i < cuantasEntran; i++) {
      tareas.push({ i, lado: enredaderaIzquierda, semilla: semilla++ });
      tareas.push({ i, lado: enredaderaDerecha,   semilla: semilla++ });
    }

    /**
     * Crea UNA planta (rama + nudos + flores) y la suma a `plantas`.
     * @param {{i:number, lado:Element, semilla:number}} tarea
     * @returns {void}
     */
    function crearUnaPlanta(tarea) {
      const { i, lado, semilla } = tarea;

      /* La altura donde nace también varía un poco, para que las dos
         columnas no queden como espejo la una de la otra. */
      const desfase = crearAzarConSemilla(semilla).entre(-90, 90);
      const dondeNace = 240 + i * SEPARACION_ENTRE_PLANTAS + desfase;

      /* CUÁNTA LUZ RECIBE ESTA PLANTA, según lo hondo que esté en la
         página. Arriba (cerca de la portada) ~1: pleno sol. En el fondo
         ~0.15: penumbra. Con eso la planta se dibuja abierta y encendida
         arriba, o cerrada y apagada abajo (ver dibujarPlanta). Es la
         misma metáfora del océano que apaga los haces de luz. */
      const luz = limitar(1 - dondeNace / altoDelDocumento, 0.15, 1);

      const planta = dibujarPlanta(semilla, luz);

      const contenedor = document.createElement('div');
      contenedor.className = 'marco__planta';
      contenedor.style.position = 'absolute';
      contenedor.style.left = '0';
      contenedor.style.width = '100%';

      /* (Acá hubo un aspect-ratio para sostener un content-visibility que se
         revirtió: recortaba tallos y flores. El alto vuelve a salir del
         contenido, como siempre. Ver la nota de .marco__planta en
         estilos/02-marco-victoriano.css.) */

      /* La planta crece hacia ARRIBA desde su raíz, así que anclamos su
         borde inferior en el punto donde queremos que esté plantada.

         translateY(-100%) sube el bloque exactamente su propia altura,
         sea cual sea. Es importante hacerlo así y no con una cuenta:
         el alto del dibujo está en unidades del SVG, no en píxeles, y
         mezclarlos daría posiciones distintas en cada pantalla. */
      contenedor.style.top = dondeNace + 'px';
      contenedor.style.transform = 'translateY(-100%)';
      contenedor.innerHTML = planta.svg;
      lado.appendChild(contenedor);

      const azarDeMovimiento = crearAzarConSemilla(semilla * 7919);

      /* Los nudos del tallo, con su propio resorte cada uno.
         El de más abajo es el más rígido (es la parte leñosa) y se van
         ablandando hacia la punta, igual que una rama de verdad. */
      const nudos = Array.from(contenedor.querySelectorAll('.nudo-del-tallo'));
      const estadoDeLosNudos = nudos.map((nudo, k) => {
        const dureza = 1.9 - 1.25 * (k / Math.max(1, nudos.length - 1));
        return {
          elemento: nudo,
          pivoteX: parseFloat(nudo.dataset.pivoteX) || 0,
          pivoteY: parseFloat(nudo.dataset.pivoteY) || 0,

          /* El pivote va como `transform-origin` de CSS, escrito UNA sola
             vez acá. Antes se re-formateaba en cada escritura del atributo
             (240 cadenas de más por cuadro para decir siempre lo mismo), y
             además obligaba a usar el atributo `transform`, que pasa por
             layout. Con esto el giro es puro compositor. */
          _origenFijado: (function () {
            nudo.style.transformBox = 'view-box';
            nudo.style.transformOrigin =
              (parseFloat(nudo.dataset.pivoteX) || 0) + 'px ' +
              (parseFloat(nudo.dataset.pivoteY) || 0) + 'px';
            return true;
          })(),
          flexion: 0,
          velocidadDeLaFlexion: 0,
          rigidez: RIGIDEZ_DEL_NUDO * dureza,
          amortiguacion: AMORTIGUACION_DEL_NUDO * azarDeMovimiento.entre(0.85, 1.2),
          faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),
          // Posición en pantalla; se recalcula al medir
          xEnPantalla: 0,
          yEnPantalla: 0,
        };
      });

      plantas.push({
        elemento: contenedor.querySelector('.racimo-de-rosas'),
        flores: Array.from(contenedor.querySelectorAll('.flor-de-enredadera')),
        nudos: estadoDeLosNudos,
        /* Las plantas del lado derecho están reflejadas por CSS, así que
           lo que en el dibujo va hacia la derecha, en pantalla va hacia
           la izquierda. Hay que saberlo para que el empujón del mouse
           doble el tallo hacia el lado correcto. */
        espejada: lado === enredaderaDerecha,
        // Ancho del viewBox de la trepadora (ver anchoDelLienzo en el ramillete).
        anchoDelLienzo: ANCHO_DEL_LIENZO,
        alturaEnLaPagina: dondeNace,

        /* Estado del resorte de la planta entera */
        inclinacion: 0,
        velocidadDeLaInclinacion: 0,

        /* Personalidad propia: nunca dos plantas iguales */
        sensibilidad: azarDeMovimiento.entre(0.6, 1.35),
        rigidez: RIGIDEZ_DE_LA_PLANTA * azarDeMovimiento.entre(0.7, 1.4),
        amortiguacion: AMORTIGUACION_DE_LA_PLANTA * azarDeMovimiento.entre(0.8, 1.3),

        /* Respiración de reposo: para que nunca queden congeladas */
        amplitudDeRespiracion: azarDeMovimiento.entre(0.5, 1.6),
        velocidadDeRespiracion: azarDeMovimiento.entre(0.25, 0.6),
        faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),

        /* Estado de cada flor */
        estadoDeLasFlores: null,
      });
    }

    /* ⚡ TROCEADO EN TANDAS, POR PRESUPUESTO DE TIEMPO.
       Crear las ~22 plantas de una sola vez —cada una con su propio SVG de
       rama, nudos y flores, más leer su geometría después— podía bloquear
       el hilo principal casi medio segundo DE UNA SOLA VEZ (una "tarea
       larga" bien gorda, detectable con codigo/21-monitor-de-rendimiento.js).
       El resultado final es IDÉNTICO se haga de una vez o de a poco; lo
       único que cambia es que, de a poco, el navegador puede respirar entre
       tanda y tanda —pintar, atender un clic— en vez de quedar congelado.

       trabajarPorTandas() (codigo/02-utilidades.js) hace todas las plantas
       que entren en 8 ms y corta ahí. Antes acá había un número fijo de
       plantas por tanda, elegido a mano midiendo en una sola máquina — y un
       número fijo solo vale para la máquina donde se midió. Con presupuesto
       de tiempo se adapta solo a cada equipo, que es justo lo que hace
       falta: la invitación tiene que ir fluida tanto en la máquina donde se
       la prueba como en el teléfono de cualquier invitado. */
    trabajarPorTandas(
      tareas.length,
      /* sigoVigente(): si entró una construcción más nueva (un resize que
         cambió cuántas plantas entran), esta se apaga sin tocar nada. Se
         pregunta por planta y no por tanda porque ahora las tandas no tienen
         un tamaño fijo; la comprobación es una comparación de enteros. */
      i => { if (sigoVigente() && !SIN_PLANTAS) crearUnaPlanta(tareas[i]); },
      /* Recién cuando TODAS las plantas de la enredadera existen se pasa a
         los ramilletes de esquina (uno por cuadro), y cuando ESOS terminan
         —de ahí el callback— se prepara el estado de las flores, que
         necesita que ya estén todas en la página. */
      () => { if (sigoVigente()) colocarLosRamilletesDeEsquina(prepararLasFlores, sigoVigente); }
    );
  }

  /**
   * Le da a cada flor su propio estado de resorte y su personalidad.
   * @returns {void}
   */
  function prepararLasFlores() {
    let semilla = 5000;

    /* ⚡ TAMBIÉN TROCEADO, POR EL MISMO MOTIVO QUE LAS PLANTAS.
       Esto recorre las ~256 flores y hace un querySelector en cada una para
       encontrar su grupo móvil. Todo de golpe, encadenado detrás de la
       construcción de las plantas y de los dos ramilletes, era parte de la
       tarea de 1101 ms que marcó el medidor.

       Se hace planta por planta, cediendo el hilo entre una y otra: el
       resultado es idéntico, pero el navegador puede pintar y atender clics
       mientras tanto. */
    let cualPlanta = 0;

    function prepararUnaPlanta() {
      if (cualPlanta >= plantas.length) { medirLasFlores(); return; }

      const planta = plantas[cualPlanta++];
      planta.estadoDeLasFlores = planta.flores.map(flor => {
        const azar = crearAzarConSemilla(semilla++);
        const escala = parseFloat(flor.dataset.escala) || 0.5;
        const movil = flor.querySelector('.flor-de-enredadera__movil');

        /* ⚡ CORREGIDO (2026-08-23) — ESTO ES LO QUE ARREGLA "LA FLOR SE
           DESPRENDE DEL TALLO Y VUELA A CUALQUIER PARTE AL MÍNIMO TOQUE".
           La versión anterior usaba `transform-box: view-box` con el pivote
           puesto a mano en coordenadas ABSOLUTAS del viewBox entero
           (data-x/data-y + un offset de cuello), asumiendo que ese punto
           iba a coincidir con la base real de la flor en pantalla. En la
           práctica no coincidía ni de cerca: medido en vivo, un giro de
           apenas 24° (el tope normal, `FLEXION_MAXIMA`) desplazaba la flor
           ¡256px! en vez de mecerla sobre su tallo — exactamente "se suelta
           y vuela a cualquier parte".
           `transform-box: fill-box` es la alternativa robusta: el pivote se
           mide en PORCENTAJE sobre la caja de la propia flor (su dibujo ya
           renderizado, con su escala y su giro inicial ya aplicados adentro
           del `<use>`), así que no depende de en qué coordenadas absolutas
           terminó la flor dentro del lienzo compartido — el punto "abajo,
           en el centro" siempre es la base de ESTA flor, sea cual sea su
           tamaño o dónde esté ubicada. */
        if (movil) {
          /* El punto exacto: los seis símbolos de rosa están dibujados
             CENTRADOS en su propio origen, y el <use> solo gira y escala
             alrededor de ese origen (no traslada). Así que, adentro de este
             <g>, el origen local (0,0) ES el centro de la cabeza de la flor,
             y el cuello queda justo debajo, en (0, cuelloY).

             Con fill-box el transform-origin se mide desde la esquina de la
             caja del dibujo, así que se le resta el offset de esa caja para
             caer en el punto real. Sin esto, el `50% 100%` de antes apuntaba
             al borde de abajo de la SILUETA YA GIRADA (el <use> lleva su
             propio rotate), que queda unos píxeles arriba del cuello y
             corrido de costado según cuánto esté girada cada flor. */
          const cuelloY = 6 + 34 * escala;   // el mismo largoDelPeduculo de siempre
          let caja = null;
          try { caja = movil.getBBox(); } catch (e) { /* todavía sin render */ }

          movil.style.transformBox = 'fill-box';
          movil.style.transformOrigin = (caja && caja.width > 0 && caja.height > 0)
            ? (0 - caja.x).toFixed(1) + 'px ' + (cuelloY - caja.y).toFixed(1) + 'px'
            : '50% 100%';                    // red de seguridad
        }

        return {
          movil,
          // Posición en el documento; se calcula al medir
          xEnElDocumento: 0,
          yEnElDocumento: 0,

          /* Dónde está esta flor DENTRO del dibujo (coordenadas del viewBox).
             Con esto y la caja del dibujo entero se puede calcular su lugar
             en pantalla sin preguntárselo al navegador flor por flor: ver
             medirUnaPlanta. */
          xEnElDibujo: parseFloat(flor.dataset.x) || 0,
          yEnElDibujo: parseFloat(flor.dataset.y) || 0,

          /* Estado del doblado. Es UN SOLO número: cuántos grados está
             inclinada la flor sobre su pedúnculo. No hay desplazamiento
             en X ni en Y, porque una flor no se despega del tallo. */
          flexion: 0,
          velocidadDeLaFlexion: 0,

          /* Dónde está el cuello de la flor, o sea el punto sobre el que
             pivota. Va por debajo del centro del capullo, y más lejos
             cuanto más grande sea la flor. */
          largoDelPeduculo: 6 + 34 * escala,

          /* No hay amplitud, velocidad ni fase propias: la flor ya no
             respira por su cuenta. El vaivén de reposo lo carga el tallo
             (ver VAIVEN_DEL_NUDO) y la flor solo se mueve cuando el mouse
             la empuja, para no reescribir su transform eternamente. */
          rigidez: RIGIDEZ_DE_LA_FLOR * azar.entre(0.7, 1.4),
          amortiguacion: AMORTIGUACION_DE_LA_FLOR * azar.entre(0.8, 1.25),
        };
      });

      cederYSeguir(prepararUnaPlanta);
    }

    prepararUnaPlanta();
  }

  /**
   * Anota dónde está cada flor DENTRO DEL DOCUMENTO.
   *
   * Se mide una sola vez (y se repite si cambia el tamaño de la ventana)
   * porque preguntar la posición de un elemento obliga al navegador a
   * recalcular toda la página: hacerlo 60 veces por segundo para 50
   * flores dejaría la web pegada. Como la posición en el documento no
   * cambia al hacer scroll, alcanza con restarle después cuánto se bajó.
   *
   * ⚡ SE MIDE DE A TANDAS, NO TODO DE UNA. Entre las enredaderas y los dos
   * ramilletes de las esquinas hay unas 300 flores, y cada
   * getBoundingClientRect() obliga al navegador a recalcular la página. Las
   * 300 seguidas, en un solo bloque, congelaban el hilo principal casi un
   * segundo (una "tarea larga" medible con 21-monitor-de-rendimiento.js) —
   * justo al cargar, que es cuando peor se siente.
   *
   * Trocearlo NO cambia NADA de lo que se ve: estas medidas solo sirven
   * para saber si el mouse está cerca de una flor, y hasta que la persona
   * no mueva el mouse hasta ahí, da igual que se hayan terminado de medir
   * en el cuadro 1 o en el cuadro 6. El dibujo es idéntico.
   *
   * @returns {void}
   */
  const PLANTAS_MEDIDAS_POR_TANDA = 3;
  let medicionEnCurso = false;
  let hayOtraMedicionPedida = false;

  function medirLasFlores() {
    /* Si ya hay una medición troceada corriendo, no se arrancan dos a la vez
       pisándose (pasa cuando 'load', 'resize' e 'invitacion-visible' caen
       casi juntos), pero SÍ se anota que hay que repetirla al terminar: si el
       pedido llegó por un resize, las posiciones que se están midiendo ahora
       ya quedaron viejas y hay que rehacerlas. */
    if (medicionEnCurso) { hayOtraMedicionPedida = true; return; }
    medicionEnCurso = true;

    let indiceDePlanta = 0;

    function medirUnaTanda() {
      const desplazamientoDelScroll = scrollActualY();
      const limite = Math.min(indiceDePlanta + PLANTAS_MEDIDAS_POR_TANDA, plantas.length);

      /* ⚡ try/finally, PARA NO DEJAR LA BANDERA TRABADA (2026-09-02).
         `medicionEnCurso` se pone en true antes de este recorrido y solo
         vuelve a false al terminarlo entero. Si medirUnaPlanta() lanzaba,
         la bandera quedaba en true PARA SIEMPRE y a partir de ahí toda
         medición futura —la del resize, la de la construcción, la del
         reintento— se iba en la primera línea sin hacer nada: las flores se
         quedaban con posiciones viejas y sin reaccionar al mouse, sin ningún
         error a la vista. Ahora un fallo en una planta no arrastra al resto
         ni traba el sistema. */
      try {
        for (; indiceDePlanta < limite; indiceDePlanta++) {
          medirUnaPlanta(plantas[indiceDePlanta], desplazamientoDelScroll);
        }
      } catch (error) {
        console.error('Falló al medir una flor; se sigue con las demás:', error);
        indiceDePlanta = limite;   // esa planta se saltea, no se reintenta en bucle
        medicionEnCurso = false;
      }

      if (indiceDePlanta < plantas.length) {
        cederYSeguir(medirUnaTanda);
        return;
      }

      medicionEnCurso = false;
      if (hayOtraMedicionPedida) {
        hayOtraMedicionPedida = false;
        cederYSeguir(medirLasFlores);
      }
    }
    medirUnaTanda();
  }

  /**
   * Mide una sola planta (sus flores y sus nudos).
   * @param {Object} planta
   * @param {number} desplazamientoDelScroll
   * @returns {void}
   */
  function medirUnaPlanta(planta, desplazamientoDelScroll) {
    {
      if (!planta.estadoDeLasFlores) return;

      /* UNA SOLA MEDICIÓN POR PLANTA, para las flores y para los nudos.
         Preguntar la posición de cada elemento por separado sería carísimo,
         y además su caja cambia al doblarse. En cambio, con la caja del
         dibujo entero se puede convertir cualquier coordenada del SVG a
         píxeles de pantalla con una regla de tres:

             píxeles = borde del dibujo + coordenada × escala

         donde escala = ancho en pantalla ÷ ancho del lienzo. */
      const cajaDelDibujo = planta.elemento.getBoundingClientRect();
      const escalaEnPantalla = cajaDelDibujo.width / planta.anchoDelLienzo;

      /* ⚡ ANTES ACÁ HABÍA UN getBoundingClientRect() POR FLOR.
         Con ~256 flores en pantalla eso eran 256 layouts forzados cada vez
         que se medía: el perfil lo mostraba como el 7,4 % de "Recalculate
         style" y 2 % de "Layout", todo bajo medirUnaTanda. La posición de
         una flor ya la sabemos sin preguntar: quedó guardada en data-x/data-y
         al dibujarla (son sus coordenadas dentro del viewBox), así que se
         deriva con la MISMA regla de tres que los nudos.

         Nota: se usa el punto de anclaje de la flor (su cuello) en vez del
         centro de su caja. Es la referencia correcta —es el punto que no se
         mueve cuando la flor cabecea— y encima es más estable que un centro
         que cambiaba con cada inclinación. */
      for (const estado of planta.estadoDeLasFlores) {
        estado.xEnElDocumento = planta.espejada
          ? cajaDelDibujo.right - estado.xEnElDibujo * escalaEnPantalla
          : cajaDelDibujo.left  + estado.xEnElDibujo * escalaEnPantalla;
        estado.yEnElDocumento = cajaDelDibujo.top +
                                estado.yEnElDibujo * escalaEnPantalla +
                                desplazamientoDelScroll;
      }

      for (const nudo of planta.nudos) {
        /* En el lado derecho el dibujo está reflejado, así que el eje X va
           al revés: se mide desde el borde derecho. */
        nudo.xEnPantalla = planta.espejada
          ? cajaDelDibujo.right - nudo.pivoteX * escalaEnPantalla
          : cajaDelDibujo.left + nudo.pivoteX * escalaEnPantalla;
        nudo.yEnPantalla = cajaDelDibujo.top + nudo.pivoteY * escalaEnPantalla +
                           desplazamientoDelScroll;
      }
    }
  }

  /* ⚡ LA CONSTRUCCIÓN NO ARRANCA HASTA QUE LA PÁGINA YA PINTÓ.
     Antes esta línea era `repartirPlantas()` a secas, ejecutándose en medio
     de la evaluación del script. Y esta función construye ~24 plantas y los
     dos ramilletes: miles de nodos SVG, con su parseo de innerHTML incluido.
     Todo eso caía DENTRO de "Evaluate script" —1.653 ms, el 40,7 % del
     perfil— y bloqueaba el primer pintado: el LCP se iba a 12,4 segundos.

     Nada de esto se ve antes de abrir el sobre, así que no hay ninguna razón
     para que retrase la portada: se construye al escuchar
     `invitacion-visible`, que es cuando de verdad hacen falta las
     enredaderas.

     ⚠️ ACÁ HABÍA ADEMÁS UN TEMPORIZADOR DE RESPALDO de 2 segundos ("construí
     igual por si el sobre se salteó"). Se quitó, y vale la pena explicar por
     qué, porque parecía inofensivo y no lo era:

       · Se disparaba SIEMPRE, no solo en el caso raro que decía cubrir. Con
         el sobre cerrado y nadie mirando, a los 2 segundos la página se
         ponía a construir 24 plantas y ~354 flores igual.
       · Eso es exactamente lo que medía PageSpeed: 2.790 ms de Total
         Blocking Time, y de paso empujaba el Largest Contentful Paint a 2,9 s
         porque ese repintado grande pasaba a ser el elemento más grande.
       · El caso que cubría (que el sobre no exista en el HTML) ahora lo
         detecta con certeza codigo/03-sobre-de-apertura.js, que emite
         `invitacion-visible` él mismo cuando no encuentra el sobre.

     Moraleja: un respaldo por cronómetro cubre el caso raro cobrándoselo a
     TODAS las visitas. Si el caso se puede detectar, se detecta. */
  let yaSeConstruyo = false;
  function construirUnaSolaVez() {
    if (yaSeConstruyo) return;
    yaSeConstruyo = true;

    /* El presupuesto de relleno se fija ACÍ y no se toca nunca más (ver la
       nota de RELLENO_POR_CALIDAD, arriba). Se lee recién ahora —y no al
       evaluar el archivo— porque en este momento el nivel de calidad ya
       incorpora lo que haya decidido el <head>, que es la mejor información
       disponible antes de empezar a dibujar. */
    const calidadAlConstruir = nivelDeCalidad();
    rellenoDeEstaVisita = RELLENO_POR_CALIDAD[calidadAlConstruir] ?? 1;
    nudosDeEstaVisita   = NUDOS_POR_CALIDAD[calidadAlConstruir]   ?? 6;
    /* ⚡ EL SCROLL SE LEE ACÁ, NO AL EVALUAR EL SCRIPT (2026-08-30).
       Antes esta lectura vivía en la línea de abajo, corriendo apenas
       cargaba el archivo — con el sobre todavía cerrado y nadie mirando.
       Ese es justo el "reprocesamiento forzado" que PageSpeed medía en
       escritorio durante el TBT: scrollActualY() ya es barata (lee una
       variable cacheada, ver 02-utilidades.js), pero forzarla mientras el
       navegador todavía está resolviendo layout de la carga inicial no lo
       es. Ahora se lee recién cuando de verdad hacen falta las
       enredaderas: al abrir el sobre. */
    posicionDeScrollAnterior = scrollActualY();
    repartirPlantas();
    /* ⚡ EL BUCLE DE CUADRO TAMPOCO ARRANCA HASTA ACÁ (2026-08-30). Antes
       `requestAnimationFrame(dibujarCuadro)` se pedía al evaluar el script,
       "siempre", y dibujarCuadro se auto-reagendaba para siempre aunque
       hayAlgoQueMirar() devolviera false —un cuadro vacío pedido de sobra
       en cada vsync mientras el sobre tapaba todo—. Arrancarlo recién con
       la invitación visible ahorra esos cuadros sin tocar el contrato de
       hayAlgoQueMirar(): una vez arrancado, el bucle se sigue reagendando
       igual que antes, animaciones-off incluido. */
    requestAnimationFrame(dibujarCuadro);
  }

  /* ⚡ escucharEventoQueQuizasYaPaso() Y NO addEventListener DIRECTO
     (2026-09-01): este script se inyecta encadenado detrás de otros (ver
     iniciarInyeccionDeLaEscena en 02-utilidades.js), e 'invitacion-visible'
     se dispara a un plazo fijo tras el clic. En un equipo lento —o si un
     script anterior en la cola tarda en construirse— este archivo puede
     registrar su escucha DESPUÉS de que el evento ya pasó, y como es de
     una sola vez, se pierde para siempre: las enredaderas y flores nunca
     llegan a construirse. Confirmado en la práctica en un equipo real de
     gama baja. Esta función se entera igual, tarde o no. */
  escucharEventoQueQuizasYaPaso('invitacion-visible', construirUnaSolaVez);

  /* ⚡ RED DE SEGURIDAD: SI DESPUÉS DE UN RATO NO HAY NADA, SE REHACE UNA
     VEZ (2026-09-02).

     POR QUÉ HACE FALTA
     Armar las enredaderas no termina cuando construirUnaSolaVez() retorna:
     sigue durante decenas de cuadros, en tandas. En todo ese rato hay varias
     formas de que la cadena se corte y no quede nadie para reanudarla —un
     paso que falla, una corrida que se invalida—, y el estado queda trabado
     de manera que ningún camino vuelve a intentarlo: las banderas
     `yaSeConstruyo` y `ultimaCuantasEntran` ya están marcadas. El resultado
     es el peor posible: el marco vacío, para siempre, en la única visita que
     esa persona va a hacer.

     POR QUÉ ESTO NO ES EL "RESPALDO POR CRONÓMETRO" QUE SE QUITÓ
     Aquel corría SIEMPRE, con el sobre todavía cerrado, y construía 354
     flores que nadie estaba mirando: costó 2.790 ms de bloqueo medidos en
     PageSpeed. Este es lo contrario: no construye nada por su cuenta, solo
     MIRA —una vez, varios segundos después de que la invitación ya se ve— si
     el resultado quedó vacío, y solo en ese caso rehace. Si todo salió bien,
     que es lo normal, no hace absolutamente nada. */
  escucharEventoQueQuizasYaPaso('invitacion-visible', () => {
    setTimeout(() => {
      const noHayPlantas = plantas.length === 0;
      const faltanRamilletes = !window.EstadoDeLosRamilletes;
      if (!noHayPlantas && !faltanRamilletes) return;

      console.warn('Las enredaderas quedaron sin construir; se rehacen una vez.',
        { plantas: plantas.length, ramilletes: !!window.EstadoDeLosRamilletes });

      /* Se destraban las banderas que impedirían reintentar. Sin esto,
         repartirPlantas() se iría por su salida temprana (cuantasEntran no
         cambió) y no reconstruiría nada. */
      ultimaCuantasEntran = -1;
      medicionEnCurso = false;
      repartirPlantas();
    }, 6000);
  });


  /* ─── 6. MOVIMIENTO ────────────────────────────────────────────── */

  /* Arranca en 0: recién se lee el scroll de verdad dentro de
     construirUnaSolaVez(), cuando se abre el sobre (ver arriba). Antes de
     eso las plantas no existen, así que este valor no se usa para nada. */
  let posicionDeScrollAnterior = 0;
  let mouseX = -9999;
  let mouseY = -9999;

  /* El handler solo GUARDA las coordenadas (barato); el trabajo pesado —mecer
     las plantas, apartar flores— vive en el bucle rAF, que ya está limitado a
     un cuadro. Por eso no hace falta acelerarlo. Se marca passive para no
     bloquear nunca el desplazamiento. */
  document.addEventListener('mousemove', evento => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  let momentoAnterior = performance.now();
  let tiempoTranscurrido = 0;

  /* ─── CALIDAD GRÁFICA: ALIGERAR SIN EMPOBRECER ──────────────────────
     Esta es la parte más cara de toda la web para la CPU: por cada nudo del
     tallo y por cada flor CERCA de la pantalla, cada cuadro calcula la
     distancia al mouse (una raíz cuadrada), integra un resorte y ESCRIBE el
     SVG (setAttribute, más caro que un style.transform de HTML). En un
     equipo sin placa de video, con decenas de nudos y flores a la vez,
     todo eso repetido 60 veces por segundo es el mayor costo de la web.

     En calidad media/baja, ese bloque entero —cercanía al mouse, resorte y
     escritura— se ejecuta cada 2 o 3 cuadros en vez de todos. El empujón
     del mouse no se diluye: se guarda cuánto tiempo real pasó desde la
     última vez (dtAcumulado) y se usa ESE valor al calcular el torque, así
     que un manotazo sigue empujando con la misma fuerza total, solo que la
     rama tarda un poquito más en reaccionar y se repinta con menos
     frecuencia —el mismo criterio que ya se usa para el titileo de las
     velas: una rama de verdad tampoco responde con precisión de cuadro. */
  /* Cuánto más allá del borde de la pantalla se siguen meciendo las
     plantas, en píxeles. Ver la nota en el culling de dibujarCuadro. */
  const MARGEN_DE_CERCANIA_POR_CALIDAD = { 0: 500, 1: 300, 2: 150 };

  let calidad = nivelDeCalidad();
  const SALTO_DEL_RESORTE_POR_CALIDAD = { 0: 1, 1: 2, 2: 3 };
  let saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
  let contadorDeCuadro = 0;
  let dtAcumulado = 0;

  /* ⚡ EN CALIDAD BAJA LAS PLANTAS DEJAN DE MECERSE, Y ES LA DECISIÓN MÁS
     IMPORTANTE DE TODO ESTE ARCHIVO (2026-09-02).

     LA MEDICIÓN QUE LA OBLIGA. Con el banco de herramientas/medir.mjs,
     misma escena, mismas 234 flores en pantalla, mismo recorrido de
     scroll:

         con vaivén    7 fps
         sin vaivén   60 fps

     No es un ajuste del 10 %: es la diferencia entre una web rota y una
     fluida, y todo el resto del dibujo queda EXACTAMENTE igual. El costo
     no está en tener 234 rosas —eso se rasteriza una vez y se compone—,
     está en ROTAR por cuadro unos SVG de cientos de `<path>`, cada uno
     relleno con un `linearGradient` por url(): cada grado de giro obliga
     a rasterizar todo ese vector otra vez.

     POR QUÉ SOLO EN BAJA Y NO SIEMPRE. El vaivén es parte del encanto de
     la invitación y en un equipo que lo aguanta no hay ningún motivo para
     quitarlo. Quien decide es el gobernador de calidad
     (codigo/21-monitor-de-rendimiento.js), que ya mide la actuación real:
     si el equipo sostiene el ritmo, se mece; si no da abasto y cae a
     BAJA, se congela. Un equipo modesto prefiere una escena quieta y
     fluida a una que se mece a los tirones.

     SE CONGELA DONDE ESTÁ, SIN VOLVER A CERO. Escribir un rotate(0) al
     entrar en baja daría un salto visible de todas las plantas a la vez.
     Como la inclinación en reposo es de pocos grados, dejarlas quietas en
     la última posición no se nota — y además no cuesta ni una escritura.

     ⚠️ NO CONFUNDIR CON `?sin=meneo`: aquel es un interruptor de
     diagnóstico que apaga el vaivén siempre; esto es comportamiento
     normal de la web, y solo en el nivel más bajo. */
  const SE_MECE_POR_CALIDAD = { 0: true, 1: true, 2: false };
  let seMece = SE_MECE_POR_CALIDAD[calidad] ?? true;

  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
    seMece = SE_MECE_POR_CALIDAD[calidad] ?? true;
  });

  /**
   * Un cuadro de animación: mece las plantas según el scroll y aparta
   * las flores que estén cerca del mouse.
   *
   * @param {number} momentoActual - Marca de tiempo del navegador.
   * @returns {void}
   */
  function dibujarCuadro(momentoActual) {
    /* Pestaña oculta o animaciones apagadas: el bucle sigue vivo pero no
       mece nada. Las rosas del marco quedan quietas (siempre visibles), y
       si se encienden las animaciones con el botón, vuelven a mecerse en el
       acto, sin recargar. Se actualiza el reloj para que al reanudar no dé
       un salto por el tiempo acumulado. */
    if (!hayAlgoQueMirar() || SIN_MENEO || !seMece) {
      momentoAnterior = momentoActual;
      requestAnimationFrame(dibujarCuadro);
      return;
    }

    const dt = Math.min((momentoActual - momentoAnterior) / 1000, 0.05);
    momentoAnterior = momentoActual;
    tiempoTranscurrido += dt;

    /* scrollActual() y no window.scrollY: preguntarle el scroll al navegador
       dentro del bucle lo obliga a recalcular estilos (ver 02-utilidades.js). */
    const posicionActual = scrollActualY();
    const velocidadDelScroll = posicionActual - posicionDeScrollAnterior;
    posicionDeScrollAnterior = posicionActual;

    const arribaDeLaVentana = posicionActual;
    const abajoDeLaVentana = posicionActual + window.innerHeight;

    /* Cada cuántos cuadros toca actualizar de verdad el resorte de nudos y
       flores (ver la nota de más arriba). Mientras tanto se acumula el dt
       real, para que el torque del cuadro que sí corre represente el
       tiempo completo transcurrido y no se diluya. */
    contadorDeCuadro++;
    dtAcumulado += dt;
    const tocaActualizarElResorte = (contadorDeCuadro % saltoDelResorte === 0);
    const dtParaElTorque = dtAcumulado;
    if (tocaActualizarElResorte) dtAcumulado = 0;

    for (const planta of plantas) {
      /* Si la planta está lejísimos de la pantalla no perdemos tiempo.
         El margen hace que ya venga meciéndose al aparecer.

         ⚡ EL MARGEN SE ACHICA EN CALIDAD MEDIA Y BAJA (2026-09-02). Era de
         500 px fijos hacia arriba y hacia abajo: en una pantalla de 1300 px
         eso significa recalcular casi DOS pantallas de plantas a la vez, y
         cada planta cuesta un transform propio más los de sus seis nudos.
         En un equipo con gráficos integrados esa cuenta es de las más caras
         del cuadro. Con un margen menor, las plantas siguen entrando ya
         meciéndose —solo empiezan a hacerlo un poco más cerca del borde— y
         se dejan de mover las que están a una pantalla entera de distancia,
         que nadie está mirando. En calidad alta no cambia nada. */
      const margen = MARGEN_DE_CERCANIA_POR_CALIDAD[calidad] ?? 500;
      const estaCerca = planta.alturaEnLaPagina > arribaDeLaVentana - margen &&
                        planta.alturaEnLaPagina < abajoDeLaVentana + margen;

      /* ⛔ ACÁ SE PROBÓ DARLE CAPA PROPIA A LA PLANTA QUE SE MECE, Y NO SIRVE.
         (Puesto en v169, revertido en v170.)

         El razonamiento parecía sólido: el giro se escribe más abajo sobre
         planta.elemento, que es la RAÍZ del <svg>, y un elemento sin capa
         propia no se compone — se REPINTA. Como el dibujo comparte los
         mosaicos de 256 px con el fondo y la penumbra, cada grado de
         inclinación arrastra a redibujar todo lo que tiene detrás. Y las
         plantas respiran con un seno que nunca se detiene, así que eso
         ocurría en todos los cuadros, para siempre. Apagar el meneo con
         ?sin=meneo ahorraba 14,5 ms por cuadro: la mitad de lo que cuesta
         este módulo entero.

         Se promovieron solo las ~7 trepadoras dentro de la franja de
         cercanía —no las 24— y sin los ramilletes, poniendo y sacando la
         clase únicamente en la transición. La medición dijo que no:

             con capas   16-18 fps   ·   Layerize 47-55 %
             sin capas   19-22 fps   ·   Layerize 20-43 %

         O sea que no era cuestión de cuántas capas eran. En esta gráfica
         integrada, con memoria compartida, una capa cuesta más de lo que
         ahorra el repintado que evita — incluso cuando son siete. La nota
         vieja del CSS tenía razón, y por un motivo más fuerte del que
         decía.

         REGLA: en esta página, promover a capa NO es una optimización.
         Antes de volver a intentarlo, medirlo con ?sin= en el mismo build. */

      if (!estaCerca) continue;

      /* ── a) La planta entera se mece con el scroll ──
         ⚡ TAMBIÉN ATENUADO POR CALIDAD, igual que el resorte de los nudos
         de acá abajo (mismo `tocaActualizarElResorte`). Antes este bloque
         corría en TODOS los cuadros sin excepción, el único punto de toda
         la escena que no respetaba el nivel de calidad: con 22 plantas
         cerca de la pantalla, eran 22 senos + 22 comparaciones + hasta 22
         escrituras de `style.transform` por cuadro, en calidad baja
         exactamente igual que en alta.

         Se agrupa con el mismo `if` que ya usan los nudos por el mismo
         motivo que ellos: `tiempoTranscurrido` sigue avanzando con el
         tiempo real en CADA cuadro (se actualiza más arriba, fuera de este
         bucle), así que la fase de la respiración no se atrasa aunque el
         resorte solo converja cada 2 o 3 cuadros — es el mismo criterio ya
         en uso, no uno nuevo. */
      if (tocaActualizarElResorte) {
        const respiracion = Math.sin(
          tiempoTranscurrido * planta.velocidadDeRespiracion + planta.faseDeRespiracion
        ) * planta.amplitudDeRespiracion;

        const inclinacionDestino = limitar(
          -velocidadDelScroll * GRADOS_POR_VELOCIDAD * planta.sensibilidad,
          -INCLINACION_MAXIMA,
          INCLINACION_MAXIMA
        ) + respiracion;

        const aceleracion =
          (inclinacionDestino - planta.inclinacion) * planta.rigidez -
          planta.velocidadDeLaInclinacion * planta.amortiguacion;

        planta.velocidadDeLaInclinacion += aceleracion;
        planta.inclinacion += planta.velocidadDeLaInclinacion;

        /* ⚡ Solo se escribe si el ángulo cambió, Y SE COMPARA CON ENTEROS.
           Antes esto hacía `inclinacion.toFixed(2)` para comparar, y ahí
           estaba un error grande: toFixed() FABRICA UN STRING cada vez que
           se llama, incluso cuando después no se escribe nada. Entre
           plantas, nudos, flores y el relicario eran ~200 cadenas por
           cuadro —unas 12.000 por segundo— que iban derechas al recolector
           de basura. En el perfil, "Major GC" figuraba con el 23 % del
           tiempo.

           Redondear a centésimas de grado con Math.round da un ENTERO, que
           se compara sin reservar memoria. El string se arma solo cuando de
           verdad hay algo nuevo que escribir. Mismo resultado en pantalla. */
        const giroDeLaPlanta = Math.round(planta.inclinacion * 100);
        if (giroDeLaPlanta !== planta.ultimoGiroEscrito) {
          planta.ultimoGiroEscrito = giroDeLaPlanta;
          planta.elemento.style.transform = `rotate(${giroDeLaPlanta / 100}deg)`;
        }
      }

      /* ── b) EL TALLO SE DOBLA ──
         Cada nudo se dobla por su cuenta según lo cerca que tenga el
         mouse, y como los nudos están encadenados, el doblado se ACUMULA
         hacia la punta: la base casi no cede y el extremo se arquea. Es
         el mismo comportamiento de una rama de verdad.

         Y como las hojas y las flores viven DENTRO de los nudos, todo se
         mueve junto: nada se despega del tallo. */
      for (const nudo of planta.nudos) {
        /* En calidad media/baja, todo este bloque —cercanía al mouse,
           resorte y escritura del SVG— se salta en los cuadros de en medio
           y se ejecuta entero cada 2 o 3 cuadros (ver la nota más arriba).
           El torque usa dtParaElTorque (el tiempo real acumulado desde la
           última vez), así que el empujón no se diluye por saltarse
           cuadros: un manotazo sigue empujando con la misma fuerza total. */
        if (!tocaActualizarElResorte) continue;

        const nudoX = nudo.xEnPantalla;
        const nudoY = nudo.yEnPantalla - posicionActual;

        const distanciaX = nudoX - mouseX;
        const distanciaY = nudoY - mouseY;
        const distancia = Math.hypot(distanciaX, distanciaY);

        let torque = 0;
        if (distancia < RADIO_DEL_MOUSE && distancia > 0.01) {
          const influencia = 1 - distancia / RADIO_DEL_MOUSE;
          const influenciaSuave = influencia * influencia;

          /* El empujón se mide en pantalla, pero el giro se aplica en las
             coordenadas del dibujo. En el lado derecho, que está
             reflejado, hay que invertir el signo o el tallo se doblaría
             justo para el lado contrario. */
          const empujeHorizontal = (distanciaX / distancia) * (planta.espejada ? -1 : 1);
          torque = empujeHorizontal * FUERZA_DEL_MOUSE_EN_EL_TALLO * influenciaSuave * dtParaElTorque;
        }

        // Respiración: un vaivén mínimo para que nunca quede congelado
        const vaivenDelNudo = Math.sin(
          tiempoTranscurrido * 0.5 + nudo.faseDeRespiracion
        ) * VAIVEN_DEL_NUDO;

        /* ⚡ SUB-PASOS, NO UNA SOLA INTEGRACIÓN (2026-08-23) — ESTO ES LO QUE
           ARREGLA "las flores vuelan y tardan en volver" en calidad media/baja.
           El torque ya venía corregido por dtParaElTorque para que un
           manotazo no se diluya al saltear cuadros, pero la amortiguación de
           acá abajo se aplicaba UNA sola vez por lote, como si solo hubiera
           pasado un cuadro — en calidad media/baja pasan 2 o 3. Resultado: el
           freno actuaba con menos frecuencia real que la que calibraron las
           constantes de amortiguación (pensadas para correr cada cuadro), y
           el nudo se pasaba de rosca antes de asentarse. Repitiendo la MISMA
           integración saltoDelResorte veces, con una fracción del torque en
           cada una, el freno se aplica la misma cantidad de veces por
           segundo real sin importar la calidad, y el impulso total del
           empujón sigue siendo idéntico. */
        const torquePorSubpaso = torque / saltoDelResorte;
        for (let subpaso = 0; subpaso < saltoDelResorte; subpaso++) {
          nudo.velocidadDeLaFlexion += (vaivenDelNudo - nudo.flexion) * nudo.rigidez -
                                       nudo.velocidadDeLaFlexion * nudo.amortiguacion +
                                       torquePorSubpaso;

          nudo.flexion = limitar(
            nudo.flexion + nudo.velocidadDeLaFlexion,
            -FLEXION_MAXIMA_DEL_NUDO, FLEXION_MAXIMA_DEL_NUDO
          );
        }

        /* ⚡ Comparación con ENTEROS, no con cadenas (ver la nota de la
           planta): son ~120 nudos por cuadro, y hacer toFixed() en cada uno
           solo para comparar fabricaba 120 strings por cuadro que nadie
           usaba. El pivote además se precalcula una vez al crear el nudo, en
           vez de formatearlo en cada escritura. */
        const giroDelNudo = Math.round(nudo.flexion * 100);
        if (giroDelNudo !== nudo.ultimoGiroEscrito) {
          nudo.ultimoGiroEscrito = giroDelNudo;

          /* ⚡ `style.transform` Y NO `setAttribute('transform')`.
             Parece lo mismo y no lo es: cambiar el ATRIBUTO transform de un
             nodo SVG pasa por el camino de LAYOUT en Blink, porque los nodos
             SVG tienen objetos de layout propios. El transform de CSS, en
             cambio, lo resuelve el compositor sin tocar layout.

             Son ~120 nudos por cuadro, y "Layout" figuraba con el 13 % del
             perfil. El pivote va en `transform-origin`, fijado una sola vez
             al crear el nudo (ver estilos/02-marco-victoriano.css). */
          nudo.elemento.style.transform = 'rotate(' + (giroDelNudo / 100) + 'deg)';
        }
      }

      /* ── c) Cada flor reacciona al mouse por su cuenta ── */
      if (!planta.estadoDeLasFlores) continue;

      for (const flor of planta.estadoDeLasFlores) {
        if (!flor.movil) continue;

        /* ── CÓMO REACCIONA UNA FLOR AL MOUSE ──
           Una flor está pegada al tallo: NO se traslada ni sale volando.
           Lo único que puede hacer es DOBLARSE sobre su pedúnculo, igual
           que cuando pasás la mano por encima de un rosal.

           Por eso lo que calculamos no es una fuerza en X y en Y, sino un
           TORQUE: cuánto la hace girar sobre su cuello. Y de ese empujón
           solo cuenta la parte HORIZONTAL, porque es la que la dobla de
           costado; empujar de frente no la mueve, la aplastaría contra el
           tallo, y eso no se ve en un dibujo plano. */
        /* Igual que con los nudos: en calidad media/baja este bloque entero
           se salta en los cuadros de en medio y se ejecuta cada 2 o 3
           cuadros, con el torque escalado por el tiempo real acumulado
           (dtParaElTorque) para que el empujón no se diluya. */
        if (!tocaActualizarElResorte) continue;

        // Dónde está esta flor en la pantalla ahora mismo
        const distanciaX = flor.xEnElDocumento - mouseX;
        const distanciaY = (flor.yEnElDocumento - posicionActual) - mouseY;
        const distancia = Math.hypot(distanciaX, distanciaY);
        const laTocaElMouse = distancia < RADIO_DEL_MOUSE && distancia > 0.01;

        /* ⚡ UNA FLOR QUIETA NO ESCRIBE NADA. Este es el otro medio arreglo
           del problema de rendimiento (el primero fue sacarle el `filter`,
           ver tonoDeLaFlor).

           Antes cada flor tenía su propia respiración de reposo, así que
           las ~350 flores escribían un `transform` nuevo para siempre,
           aunque nadie las tocara. Cada una de esas escrituras ensucia el
           árbol de propiedades de pintura del navegador, y con 350 por
           cuadro el árbol se rearmaba entero sesenta veces por segundo.

           Ahora una flor solo escribe si el mouse la está tocando o si
           todavía se está acomodando después de un empujón. En reposo son
           una decena, no trescientas cincuenta.

           EL MOVIMIENTO NO SE PERDIÓ: lo carga el tallo. Los nudos
           respiran y se mecen con el scroll, y las flores viven DENTRO de
           los nudos, así que siguen cabeceando igual —solo que ahora las
           mueve el tallo del que cuelgan, que es además como pasa de
           verdad—. La amplitud del vaivén del nudo se subió para
           compensar exactamente lo que aportaba cada flor por su cuenta
           (ver VAIVEN_DEL_NUDO). */
        const yaSeAcomodo = Math.abs(flor.velocidadDeLaFlexion) < VELOCIDAD_DESPRECIABLE &&
                            Math.abs(flor.flexion) < FLEXION_DESPRECIABLE;
        if (!laTocaElMouse && yaSeAcomodo) continue;

        let torque = 0;
        if (laTocaElMouse) {
          // Cae al cuadrado: casi nulo en el borde, fuerte en el centro
          const influencia = 1 - distancia / RADIO_DEL_MOUSE;
          const influenciaSuave = influencia * influencia;

          torque = (distanciaX / distancia) * FUERZA_DEL_MOUSE * influenciaSuave * dtParaElTorque;
        }

        /* Resorte amortiguado sobre el ÁNGULO (no sobre la posición):
           el tallo tiende a enderezarse, y el roce del aire va frenando
           el vaivén hasta que se detiene. El reposo es cero: la flor
           quiere volver a estar derecha sobre su pedúnculo.

           ⚡ SUB-PASOS, mismo motivo que en el nudo de acá arriba: sin esto,
           en calidad media/baja la amortiguación actuaba con menos
           frecuencia real de la calibrada, y la flor se pasaba de rosca —
           "vuela y tarda mucho en volver al tallo". */
        const torquePorSubpasoDeFlor = torque / saltoDelResorte;
        for (let subpaso = 0; subpaso < saltoDelResorte; subpaso++) {
          flor.velocidadDeLaFlexion += -flor.flexion * flor.rigidez -
                                       flor.velocidadDeLaFlexion * flor.amortiguacion +
                                       torquePorSubpasoDeFlor;

          flor.flexion = limitar(
            flor.flexion + flor.velocidadDeLaFlexion,
            -FLEXION_MAXIMA, FLEXION_MAXIMA
          );
        }
        // (el tope -FLEXION_MAXIMA/FLEXION_MAXIMA ya se aplicó en cada
        // subpaso del loop de arriba, no hace falta repetirlo acá afuera)

        /* Al terminar de acomodarse se la endereza EXACTO y se escribe una
           última vez. Sin esto quedaría temblando en la milésima de grado
           y nunca se la podría saltear. */
        if (!laTocaElMouse &&
            Math.abs(flor.velocidadDeLaFlexion) < VELOCIDAD_DESPRECIABLE &&
            Math.abs(flor.flexion) < FLEXION_DESPRECIABLE) {
          flor.flexion = 0;
          flor.velocidadDeLaFlexion = 0;
        }

        /* Se gira alrededor del CUELLO, que está por debajo de la flor.
           Ese punto de pivote es lo que convierte el giro en un cabeceo
           creíble: la flor describe un arco corto, como colgada de su
           tallo, en lugar de orbitar por el aire. El punto en sí ya quedó
           fijado como transform-origin al construir la flor (ver más
           arriba); acá solo cambia el ángulo.

           ⚡ style.transform, NO setAttribute('transform'). Esta era la
           única escritura por cuadro que le quedaba a las flores con
           `setAttribute` — el mismo costo de LAYOUT que ya se sacó de los
           nudos/plantas de esta planta y de las joyas colgantes (ronda 2).
           Solo escribe la flor que el mouse está tocando o que todavía se
           está acomodando (ver el `continue` de arriba), pero un perfilado
           real en vivo mostró que esa única escritura alcanzaba para
           ensuciar el layout de toda la página y encarecer las lecturas de
           scroll de 23-lienzo-de-luz.js más adelante en el mismo cuadro. */
        const giroDeLaFlor = Math.round(flor.flexion * 100);
        if (giroDeLaFlor !== flor.ultimoGiroEscrito) {
          flor.ultimoGiroEscrito = giroDeLaFlor;
          flor.movil.style.transform = 'rotate(' + (giroDeLaFlor / 100) + 'deg)';
        }
      }
    }

    requestAnimationFrame(dibujarCuadro);
  }

  /* ⛔ ACÁ YA NO VA `requestAnimationFrame(dibujarCuadro)` A SECAS.
     El bucle arranca dentro de construirUnaSolaVez(), al recibir
     'invitacion-visible' (ver más arriba) — no antes. Una vez arrancado
     sigue reagendándose para siempre, animaciones-off incluido, igual que
     antes: lo único que cambió es CUÁNDO se pide el primer cuadro, no el
     contrato de hayAlgoQueMirar(). */


  /* Si cambia el tamaño de la ventana hay que rehacer todo. Se espera un
     ratito después del último cambio para no recalcular cien veces
     mientras se arrastra el borde (a eso se le dice "debounce"). */
  let temporizadorDeRedimension = null;
  /* ⚡ SOLO SI EL ANCHO CAMBIÓ DE VERDAD (ver alCambiarElAncho en
     02-utilidades.js). Esto es LO MÁS CARO de todo lo que escucha
     'resize' en el proyecto: repartirPlantas() tira TODO —enredaderas,
     ramilletes de esquina— y lo vuelve a dibujar de cero. En celular,
     la barra de navegación (Edge, Chrome) dispara 'resize' cada vez que
     aparece o desaparece al hacer scroll, aunque el ancho real de la
     pantalla no cambió nada — sin este filtro, cada aparición de la
     barra reconstruía el ramillete entero, y ESE redibujado de golpe es
     lo que se sentía como el salto de tamaño y posición del relicario. */
  window.addEventListener('resize', alCambiarElAncho(() => {
    clearTimeout(temporizadorDeRedimension);
    temporizadorDeRedimension = setTimeout(repartirPlantas, 350);
  }));

  /* ⛔ ACÁ NO VA UN LISTENER DE 'calidad-cambio' QUE RECONSTRUYA.
     Se probó y fue el bug que hizo desaparecer el ramillete de la esquina
     derecha: el gobernador cambia de nivel en los primeros segundos, o sea
     justo cuando la construcción inicial todavía está en vuelo, y dos
     corridas simultáneas se pisan el innerHTML de los mismos huecos.
     Ver la nota de SEPARACION_ENTRE_PLANTAS al principio del archivo. */

  /* Las posiciones se vuelven a medir cuando la página termina de cargar
     (las imágenes pueden haber corrido el contenido). */
  window.addEventListener('load', medirLasFlores);
  // Mismo motivo que la escucha de construirUnaSolaVez, más arriba: el
  // evento puede haber pasado antes de que este script cargara.
  escucharEventoQueQuizasYaPaso('invitacion-visible', () => setTimeout(medirLasFlores, 400));

  /* (Acá hubo un IntersectionObserver que volvía a medir las flores cuando
     una planta o un ramillete reaparecía en pantalla. Existía para sostener
     el `content-visibility` que se revirtió —recortaba tallos y flores—, así
     que ya no hace falta: nada se saltea, y las posiciones medidas al cargar
     y en cada resize siguen siendo válidas todo el tiempo.) */

})();
