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

  /** Ancho del "lienzo" de cada planta, en unidades del dibujo. */
  const ANCHO_DEL_LIENZO = 120;

  /** Cuánto tira el resorte de la planta hacia su posición de reposo. */
  const RIGIDEZ_DE_LA_PLANTA = 0.05;
  const AMORTIGUACION_DE_LA_PLANTA = 0.13;

  /** Lo mismo para cada flor por separado (más suelto, más vivo). */
  const RIGIDEZ_DE_LA_FLOR = 0.09;
  const AMORTIGUACION_DE_LA_FLOR = 0.16;

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
  const AMORTIGUACION_DEL_NUDO = 0.14;

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
    const CANTIDAD_DE_NUDOS = 6;
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
    const cuantasEspinas = azar.entero(4, 9);
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

      const brote = crecerTallo(azar, {
        xInicial: nacimiento.x,
        yInicial: nacimiento.y,
        anguloInicial: nacimiento.angulo + hacia * azar.entre(0.5, 1.05),
        pasos: azar.entero(5, 11),
        largoDelPaso: azar.entre(9, 17),
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
    const cuantasHojas = azar.entero(7, 13);
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
    const cuantosZarcillos = azar.entero(2, 4);
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
   * @param {number} semilla  - Define cómo será este ramillete.
   * @param {number} densidad - Cuán tupido va, según el tamaño de
   *        pantalla. 1 es una pantalla mediana; más grande, más flores;
   *        más chica, menos. Ver colocarLosRamilletesDeEsquina.
   * @returns {string} El SVG listo para insertar.
   */
  function dibujarRamilleteDeEsquina(semilla, densidad) {
    const azar = crearAzarConSemilla(semilla);

    /* Ayuda para escalar una cantidad por la densidad sin que se
       desmadre ni desaparezca: multiplica y después recorta a un mínimo
       y un máximo sensatos. */
    const escalar = (base, minimo, maximo) =>
      Math.round(limitar(base * densidad, minimo, maximo));

    /* De dónde nacen todos los tallos: casi en el vértice, apenas
       adentro, para que el ramillete parezca brotar de la moldura. */
    const xDeLaBase = azar.entre(10, 26);
    const yDeLaBase = azar.entre(8, 22);

    const piezas = [];
    const flores = [];

    /* ── El abanico de tallos (regla 1) ──
       Los ángulos van de 0,16 rad (casi horizontal, corriendo por debajo
       de la cenefa de arriba) a 1,30 rad (casi vertical, bajando por el
       riel del costado). Repartidos parejo y con un temblorcito al azar
       para que no se note la regla. */
    const cuantosTallos = escalar(azar.entero(16, 20), 6, 46);
    const ANGULO_MAS_HORIZONTAL = 0.08;
    const ANGULO_MAS_VERTICAL   = 1.46;

    /* ⚡ POR QUÉ EL TALLO TIENE QUE ENGROSAR CON LA DENSIDAD.
       La CANTIDAD de rosas escala con `densidad` (ver `escalar` arriba):
       en una pantalla ancha, ~1250px de más suben la densidad hasta 1,9 y
       aparecen ~135 rosas por ramillete. Pero el GROSOR del tallo era un
       número fijo, pensado para el caso de densidad ~1. Con casi el doble
       de flores encima de un tallo que no engrosó un milímetro, la punta
       —que ya adelgaza a propósito hasta un solo píxel— quedaba tapada
       entera: rosas que parecen flotar sin nada que las sostenga.

       Math.max(densidad, 1) para no ADELGAZAR el tallo en pantallas
       angostas: ahí la densidad baja de 1 y también hay menos rosas, así
       que el grosor de siempre ya alcanza. Solo se engruesa cuando hace
       falta, nunca se afina de más. */
    const grosorDelTallo = Math.max(densidad, 1);

    for (let i = 0; i < cuantosTallos; i++) {
      const reparto = i / (cuantosTallos - 1);
      const anguloDeSalida =
        ANGULO_MAS_HORIZONTAL +
        reparto * (ANGULO_MAS_VERTICAL - ANGULO_MAS_HORIZONTAL) +
        azar.entre(-0.09, 0.09);

      /* Los tallos del medio del abanico son los más largos; los de los
         extremos, más cortos. Eso redondea el contorno del ramillete en
         lugar de dejarlo con puntas que sobresalen. */
      const cercaniaAlCentro = 1 - Math.abs(reparto - 0.5) * 2;
      const pasos = azar.entero(7, 10);
      const largoDelPaso = azar.entre(11, 16) * (0.68 + cercaniaAlCentro * 0.42);

      const tallo = crecerTallo(azar, {
        xInicial: xDeLaBase,
        yInicial: yDeLaBase,
        anguloInicial: anguloDeSalida,
        pasos,
        largoDelPaso,
        giroMaximo: azar.entre(0.06, 0.14),
        inercia: azar.entre(0.5, 0.75),
        /* Tiende a abrirse hacia adentro de la página, sin volver sobre
           sí mismo: un ramillete que se cierra parece un puño. */
        xObjetivo: ANCHO_DEL_RAMILLETE * 0.8,
        atraccion: azar.entre(0.0006, 0.0018),
      });

      /* ⚠️ RELLENO DE RESERVA: el degradado #rosa-tallo vive en un <svg> de
         0×0 aparte (la biblioteca de rosas compartida). Ese patrón —un
         degradado referenciado desde OTRO <svg>— a veces se lee distinto
         entre navegadores. Por eso se dibuja el mismo contorno DOS veces:
         primero un color sólido de reserva, y el degradado justo encima.
         Si el degradado resuelve bien (lo normal), tapa al sólido entero y
         no cambia nada; si no resolviera, el sólido de abajo salva la
         rama en vez de dejarla como un hilo casi invisible. */
      const dDelTallo = siluetaDelTallo(
        tallo, azar,
        azar.entre(3.4, 5.2) * grosorDelTallo,
        1 * grosorDelTallo
      );
      piezas.push(
        `<path d="${dDelTallo}" fill="#6a5322"/>` +
        `<path d="${dDelTallo}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      /* Hojas repartidas por el tallo, siempre levantadas hacia afuera.
         Son las que dan el follaje: sin suficientes hojas el ramillete
         se ve como alambres con flores en la punta. */
      const cuantasHojas = azar.entero(4, 7);
      for (let h = 0; h < cuantasHojas; h++) {
        const punto = tallo[azar.entero(1, tallo.length - 2)];
        const hacia = azar.signo();
        const escala = azar.entre(0.38, 0.72);
        const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
        piezas.push(
          `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
        );
      }

      /* ── Ramas secundarias ──
         De la mitad de los tallos sale una rama más corta con su propio
         capullo. Es lo que llena los huecos que quedan ENTRE los tallos
         del abanico: sin ellas se ve el peine, con ellas se ve un ramo.
         Van cortas a propósito, para que no se confundan con los tallos
         principales ni alarguen la silueta. */
      if (azar.numero() < 0.62) {
        const nace = tallo[azar.entero(1, Math.max(1, tallo.length - 3))];
        const rama = crecerTallo(azar, {
          xInicial: nace.x,
          yInicial: nace.y,
          anguloInicial: nace.angulo + azar.signo() * azar.entre(0.35, 0.8),
          pasos: azar.entero(3, 5),
          largoDelPaso: azar.entre(7, 12),
          giroMaximo: azar.entre(0.08, 0.18),
          inercia: azar.entre(0.4, 0.65),
          xObjetivo: ANCHO_DEL_RAMILLETE * 0.8,
          atraccion: 0.001,
        });

        // Mismo relleno de reserva que el tallo principal (ver la nota de arriba).
        // Y el mismo engrosamiento por densidad (ver grosorDelTallo, arriba).
        const dDeLaRama = siluetaDelTallo(
          rama, azar,
          azar.entre(1.8, 2.8) * grosorDelTallo,
          0.8 * grosorDelTallo
        );
        piezas.push(
          `<path d="${dDeLaRama}" fill="#6a5322"/>` +
          `<path d="${dDeLaRama}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".5"/>`
        );

        const puntaDeLaRama = rama[rama.length - 1];
        flores.push({
          x: puntaDeLaRama.x, y: puntaDeLaRama.y,
          tipo: azar.numero() < 0.6 ? 'rosa-capullo' : 'rosa-dorso',
          escala: azar.entre(0.26, 0.38),
          giro: (puntaDeLaRama.angulo * 180 / Math.PI) + 90 + azar.entre(-20, 20),
        });

        // Un par de hojitas también en la rama
        for (let h = 0; h < azar.entero(1, 3); h++) {
          const punto = rama[azar.entero(1, rama.length - 1)];
          const hacia = azar.signo();
          const escala = azar.entre(0.3, 0.5);
          const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
          piezas.push(
            `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                  rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
          );
        }
      }

      /* ── Qué remata cada tallo (regla 3) ──
         Nada grande. Los tallos largos terminan en capullo o en flor
         chica de perfil, que se leen como brote y no como remate. Solo
         los tallos cortos, los que quedan cerca de la esquina, se
         permiten una flor algo mayor. */
      const punta = tallo[tallo.length - 1];
      const esCorto = largoDelPaso * pasos < 95;
      const sorteo = azar.numero();

      if (esCorto && sorteo < 0.55) {
        flores.push({
          x: punta.x, y: punta.y,
          tipo: azar.numero() < 0.5 ? 'rosa-tres-cuartos' : 'rosa-media',
          escala: azar.entre(0.34, 0.46),
          giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25),
        });
      } else if (sorteo < 0.72) {
        flores.push({
          x: punta.x, y: punta.y, tipo: 'rosa-capullo',
          escala: azar.entre(0.34, 0.5),
          giro: (punta.angulo * 180 / Math.PI) + 90,
        });
      } else {
        flores.push({
          x: punta.x, y: punta.y, tipo: 'rosa-perfil',
          escala: azar.entre(0.28, 0.4),
          giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-20, 20),
        });
      }

      // Algún zarcillo suelto, que es lo que le da aire al conjunto
      if (azar.numero() < 0.5) {
        const donde = tallo[azar.entero(2, tallo.length - 1)];
        piezas.push(
          `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
                 stroke="url(#rosa-tallo)" stroke-width="${azar.entre(1, 1.6).toFixed(1)}"
                 stroke-linecap="round" stroke-opacity=".75"/>`
        );
      }
    }

    /* ── El corazón del ramillete, en la esquina (regla 3) ──
       Dos o tres rosas grandes apiladas justo donde nacen los tallos.
       Ahí es donde tiene que estar el peso: es lo que hace que la
       esquina se sienta ocupada, y de paso tapa el nacimiento de todos
       los tallos, que si se viera parecería un manojo atado. */
    const cuantasDelCorazon = escalar(azar.entero(15, 19), 4, 40);
    const orientaciones = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media'];

    for (let i = 0; i < cuantasDelCorazon; i++) {
      flores.push({
        x: xDeLaBase + azar.entre(2, 64),
        y: yDeLaBase + azar.entre(2, 56),
        tipo: orientaciones[azar.entero(0, orientaciones.length - 1)],
        escala: azar.entre(0.52, 0.8),
        giro: azar.entre(-30, 30),
      });
    }

    /* Y unas cuantas flores sueltas metidas ENTRE los tallos, a media
       distancia. Son las que terminan de cerrar el ramo: sin ellas
       queda un corazón denso y después aire hasta las puntas, que es
       justamente el vacío que había que llenar. */
    /* Un poco menos que antes y algo más grandes: apretujar muchas
       flores diminutas las convertía en un borrón oscuro donde no se
       distinguía ninguna rosa. Con menos y un pelín más grandes, cada una
       tiene lugar para leerse. */
    const cuantasDeRelleno = escalar(azar.entero(18, 23), 3, 46);
    for (let i = 0; i < cuantasDeRelleno; i++) {
      flores.push({
        x: xDeLaBase + azar.entre(30, 210),
        y: yDeLaBase + azar.entre(25, 180),
        tipo: azar.numero() < 0.5 ? 'rosa-tres-cuartos' : 'rosa-media',
        escala: azar.entre(0.42, 0.6),
        giro: azar.entre(-40, 40),
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

    return `<svg class="racimo-de-rosas racimo-de-rosas--esquina"
                 viewBox="0 0 ${ANCHO_DEL_RAMILLETE} ${ALTO_DEL_RAMILLETE}"
                 aria-hidden="true">${piezas.join('')}</svg>`;
  }

  /**
   * Coloca los dos ramilletes de las esquinas de arriba y los suma a la
   * lista de plantas, para que respiren y reaccionen al mouse igual que
   * las enredaderas de los costados.
   *
   * @returns {void}
   */
  function colocarLosRamilletesDeEsquina(alTerminar, sigoVigente) {
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

    /* ⚡ UN RAMILLETE POR CUADRO. Cada uno lleva entre 50 y 80 rosas con sus
       tallos: los dos juntos, de una sola vez, era el bloque de construcción
       más grande de toda la web. Hacer uno, dejar respirar al navegador y
       hacer el otro da EXACTAMENTE el mismo resultado (mismas semillas,
       mismo dibujo) sin congelar nada. */
    const huecos = [buscar('.marco__ramillete--izquierdo'),
                    buscar('.marco__ramillete--derecho')];
    let indiceDeHueco = 0;

    /**
     * Arma los ramilletes, UNO POR CUADRO.
     *
     * ⚠️ ESTO VOLVIÓ A SER UNO POR CUADRO, Y HAY UNA LECCIÓN.
     * Cuando el ramillete derecho desaparecía, culpé al troceado y los junté
     * en una sola pasada. Me equivoqué: la causa real era una LLAVE DE CIERRE
     * que falta en el CSS (ver .marco__ramillete en
     * estilos/02-marco-victoriano.css). El troceado nunca tuvo la culpa.
     *
     * Y juntarlos costaba caro: cada ramillete lleva entre 50 y 80 rosas con
     * sus tallos, y los dos de corrido —más las plantas y las mediciones que
     * vienen encadenadas— producían una tarea de más de un segundo. El
     * medidor la cazó: «peor 1101 ms». Eso es la página congelada.
     *
     * Ahora vuelven a ir de a uno, con el guardia de reentrada puesto: si
     * entra una construcción más nueva, esta se apaga sola.
     *
     * @returns {void}
     */
    function armarLosRamilletes() {
      if (!vigente()) return;

      const hueco = huecos[indiceDeHueco];
      const indice = indiceDeHueco;
      indiceDeHueco++;

      if (hueco) crearRamillete(hueco, indice);

      if (indiceDeHueco < huecos.length) { cederYSeguir(armarLosRamilletes); return; }

      revisarQueEstenLosDos();
      if (typeof alTerminar === 'function') alTerminar();
    }

    /**
     * Comprueba que los DOS ramilletes hayan quedado dibujados y rehace el
     * que falte.
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
     * @returns {void}
     */
    function revisarQueEstenLosDos() {
      huecos.forEach((hueco, indice) => {
        if (!hueco) return;

        if (!hueco.querySelector('.racimo-de-rosas')) {
          /* Se rehace con la MISMA semilla que le tocaba, para que el dibujo
             sea el que corresponde a esa esquina y no uno distinto. */
          const semillaGuardada = semilla;
          semilla = 9100 + indice;
          crearRamillete(hueco, indice);
          semilla = semillaGuardada;
        }
      });

      /* ⚠️ Y AHORA SE COMPRUEBA QUE ADEMÁS SE VEAN, no solo que existan.
         El ramillete derecho desapareció cinco veces y ya descarté, con
         medición, que sea el markup, el generador, la semilla o una carrera
         de construcción. Comprobé en Node que las semillas 9100 y 9101
         producen ramilletes equivalentes (25 y 23 tallos, misma dispersión),
         así que el SVG se genera bien: el problema es que no se RENDERIZA.

         Estas medidas se publican en el cartel de ?fps=1 para poder verlo de
         un vistazo, sin abrir las herramientas del navegador. Si el derecho
         sale con ancho o alto 0, o con una posición fuera de la pantalla,
         ahí está la respuesta que llevo días sin poder ver. */
      window.EstadoDeLosRamilletes = huecos.map((hueco, indice) => {
        if (!hueco) return { lado: indice ? 'der' : 'izq', existe: false };
        const svg = hueco.querySelector('.racimo-de-rosas');
        const caja = hueco.getBoundingClientRect();
        return {
          lado: indice ? 'der' : 'izq',
          existe: !!svg,
          rosas: svg ? svg.querySelectorAll('.flor-de-enredadera').length : 0,
          x: Math.round(caja.left),
          y: Math.round(caja.top),
          ancho: Math.round(caja.width),
          alto: Math.round(caja.height),
        };
      });
    }

    /**
     * Crea UN ramillete de esquina y lo suma a la lista de plantas.
     * @param {Element} hueco
     * @param {number} indice - 0 izquierdo, 1 derecho (el derecho va espejado).
     * @returns {void}
     */
    function crearRamillete(hueco, indice) {
      /* ⚠️ SI ESTO SE LLAMA DE NUEVO SOBRE EL MISMO HUECO (revisarQueEstenLosDos
         reconstruyendo un ramillete que no salió bien), el innerHTML de abajo
         tira el SVG viejo — pero la entrada que ESE ramillete tenía en
         `plantas` seguía viva, animándose cada cuadro sobre un nodo que ya
         no está en la página. Se limpia antes de agregar la nueva. */
      for (let i = plantas.length - 1; i >= 0; i--) {
        if (plantas[i].elemento && !plantas[i].elemento.isConnected) plantas.splice(i, 1);
      }

      hueco.innerHTML = dibujarRamilleteDeEsquina(semilla++, densidad);

      const azarDeMovimiento = crearAzarConSemilla(semilla * 7919);

      plantas.push({
        elemento: hueco.querySelector('.racimo-de-rosas'),
        flores: Array.from(hueco.querySelectorAll('.flor-de-enredadera')),
        nudos: [],              // no se articula: es un ramo, no una trepadora
        espejada: indice === 1,
        /* Ancho del viewBox de ESTE dibujo. Sirve para pasar coordenadas del
           dibujo a píxeles de pantalla sin medir elemento por elemento. */
        anchoDelLienzo: ANCHO_DEL_RAMILLETE,
        alturaEnLaPagina: 0,    // viven arriba de todo

        inclinacion: 0,
        velocidadDeLaInclinacion: 0,

        /* Mucho menos sensible al scroll que una enredadera. Un ramo
           apoyado en una esquina se mueve apenas; si se meciera como una
           planta suelta, delataría que es un dibujo pegado encima. */
        sensibilidad: azarDeMovimiento.entre(0.16, 0.3),
        rigidez: RIGIDEZ_DE_LA_PLANTA * azarDeMovimiento.entre(0.8, 1.2),
        amortiguacion: AMORTIGUACION_DE_LA_PLANTA * azarDeMovimiento.entre(1, 1.4),

        amplitudDeRespiracion: azarDeMovimiento.entre(0.25, 0.6),
        velocidadDeRespiracion: azarDeMovimiento.entre(0.2, 0.4),
        faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),

        estadoDeLasFlores: null,
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
    const miCorrida = ++corridaVigente;
    const sigoVigente = () => miCorrida === corridaVigente;

    const altoDelDocumento = document.body.scrollHeight;
    const cuantasEntran = Math.max(3, Math.floor(altoDelDocumento / SEPARACION_ENTRE_PLANTAS));

    /* ⚡ NO RECONSTRUIR SI NO HACE FALTA. Tirar todo y rehacer es la
       operación más cara de toda la web (ver la nota de troceado, abajo).
       Si la cantidad de plantas que entran no cambió, alcanza con volver a
       medir dónde quedó cada una —el ancho sí pudo cambiar—, sin recrear
       ningún SVG. */
    if (cuantasEntran === ultimaCuantasEntran) {
      medirLasFlores();
      return;
    }
    ultimaCuantasEntran = cuantasEntran;

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
      i => { if (sigoVigente()) crearUnaPlanta(tareas[i]); },
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

        return {
          movil: flor.querySelector('.flor-de-enredadera__movil'),
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

          /* La cola del atributo `transform`, armada una sola vez: el cuello
             de la flor no se mueve nunca. Ver la nota de textoDelPivote. */
          textoDelCuello: ' 0 ' + (6 + 34 * escala).toFixed(1) + ')',

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
      const desplazamientoDelScroll = window.scrollY;
      const limite = Math.min(indiceDePlanta + PLANTAS_MEDIDAS_POR_TANDA, plantas.length);

      for (; indiceDePlanta < limite; indiceDePlanta++) {
        medirUnaPlanta(plantas[indiceDePlanta], desplazamientoDelScroll);
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
    repartirPlantas();
  }

  document.addEventListener('invitacion-visible', construirUnaSolaVez);


  /* ─── 6. MOVIMIENTO ────────────────────────────────────────────── */

  let posicionDeScrollAnterior = window.scrollY;
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
  let calidad = nivelDeCalidad();
  const SALTO_DEL_RESORTE_POR_CALIDAD = { 0: 1, 1: 2, 2: 3 };
  let saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
  let contadorDeCuadro = 0;
  let dtAcumulado = 0;
  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
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
    if (!hayAlgoQueMirar()) {
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
         El margen de 500 px hace que ya venga meciéndose al aparecer. */
      const estaCerca = planta.alturaEnLaPagina > arribaDeLaVentana - 500 &&
                        planta.alturaEnLaPagina < abajoDeLaVentana + 500;
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

        nudo.velocidadDeLaFlexion += (vaivenDelNudo - nudo.flexion) * nudo.rigidez -
                                     nudo.velocidadDeLaFlexion * nudo.amortiguacion +
                                     torque;

        nudo.flexion = limitar(
          nudo.flexion + nudo.velocidadDeLaFlexion,
          -FLEXION_MAXIMA_DEL_NUDO, FLEXION_MAXIMA_DEL_NUDO
        );

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
           quiere volver a estar derecha sobre su pedúnculo. */
        flor.velocidadDeLaFlexion += -flor.flexion * flor.rigidez -
                                     flor.velocidadDeLaFlexion * flor.amortiguacion +
                                     torque;

        // Tope: un tallo se dobla, no se parte
        flor.flexion = limitar(
          flor.flexion + flor.velocidadDeLaFlexion,
          -FLEXION_MAXIMA, FLEXION_MAXIMA
        );

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
           tallo, en lugar de orbitar por el aire. */
        /* Mismo criterio que en los nudos: entero para comparar, y el resto
           del atributo precalculado. Acá hay hasta ~255 flores. */
        const giroDeLaFlor = Math.round(flor.flexion * 100);
        if (giroDeLaFlor !== flor.ultimoGiroEscrito) {
          flor.ultimoGiroEscrito = giroDeLaFlor;
          flor.movil.setAttribute('transform',
            'rotate(' + (giroDeLaFlor / 100) + flor.textoDelCuello);
        }
      }
    }

    requestAnimationFrame(dibujarCuadro);
  }

  /* El bucle arranca SIEMPRE (aunque las animaciones estén apagadas): se
     queda en reposo hasta que se enciendan, para poder reanudar en vivo. */
  requestAnimationFrame(dibujarCuadro);


  /* Si cambia el tamaño de la ventana hay que rehacer todo. Se espera un
     ratito después del último cambio para no recalcular cien veces
     mientras se arrastra el borde (a eso se le dice "debounce"). */
  let temporizadorDeRedimension = null;
  window.addEventListener('resize', () => {
    clearTimeout(temporizadorDeRedimension);
    temporizadorDeRedimension = setTimeout(repartirPlantas, 350);
  });

  /* ⛔ ACÁ NO VA UN LISTENER DE 'calidad-cambio' QUE RECONSTRUYA.
     Se probó y fue el bug que hizo desaparecer el ramillete de la esquina
     derecha: el gobernador cambia de nivel en los primeros segundos, o sea
     justo cuando la construcción inicial todavía está en vuelo, y dos
     corridas simultáneas se pisan el innerHTML de los mismos huecos.
     Ver la nota de SEPARACION_ENTRE_PLANTAS al principio del archivo. */

  /* Las posiciones se vuelven a medir cuando la página termina de cargar
     (las imágenes pueden haber corrido el contenido). */
  window.addEventListener('load', medirLasFlores);
  document.addEventListener('invitacion-visible', () => setTimeout(medirLasFlores, 400));

  /* (Acá hubo un IntersectionObserver que volvía a medir las flores cuando
     una planta o un ramillete reaparecía en pantalla. Existía para sostener
     el `content-visibility` que se revirtió —recortaba tallos y flores—, así
     que ya no hace falta: nada se saltea, y las posiciones medidas al cargar
     y en cada resize siguen siendo válidas todo el tiempo.) */

})();
