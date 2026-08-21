/* ══════════════════════════════════════════════════════════════════════
   22 · LA LUZ CAMBIA CON LA HORA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Tiñe la luz AMBIENTAL de la invitación según la hora a la que se abra.
   Si alguien entra al mediodía, por los ventanales entra un dorado claro;
   al atardecer, ámbar profundo; de madrugada, azul de luna. Es el mismo
   salón a distintas horas del día.

   ⚠️ LAS VELAS NO CAMBIAN, Y ES A PROPÓSITO
   Una vela es cálida a las tres de la mañana igual que al mediodía: su
   color lo pone la combustión, no el sol. Si se le cambiara el tono
   parecería que cambió de química y se rompería la ilusión.

   Lo que vira es SOLO lo que viene de afuera: los haces que entran por
   los ventanales y el polvo que flota dentro de ellos. Y ese contraste
   —ventana fría contra candelabros cálidos— es justamente lo que hace
   bonita la escena de noche: la luz de luna entra azul y las velas
   defienden su isla de calor.

   CUÁNTO CUESTA
   Nada. Se escriben seis variables CSS al cargar y una vez cada diez
   minutos. No hay bucle, no hay trabajo por cuadro.

   POR QUÉ NO SE ESCRIBE EN :root
   Escribir una variable en <html> obliga al navegador a revisar el estilo
   del documento ENTERO (miles de nodos). Como estas variables solo las
   usan dos cosas —los haces y las motas—, se escriben directamente en sus
   dos capas. Es la misma lección que dejó 14-haces-de-luz.js, donde hacer
   esto mal costaba el 39 % del tiempo de la página.
   ══════════════════════════════════════════════════════════════════════ */

(function laLuzSigueALaHora() {

  /* Los cuatro momentos del día, con su hora de referencia. Entre uno y
     otro se mezcla de forma continua, así que a las 15:30 la luz es una
     interpolación real entre mediodía y atardecer, no un salto.

     Cada color va como [r, g, b, alfa]. Se guardan desarmados justamente
     para poder mezclarlos; el texto rgba() se arma al final.

     Las opacidades bajan de noche a propósito: la luna ilumina menos que
     el sol, y si la noche tuviera la misma fuerza que el mediodía se
     perdería la penumbra que sostiene toda la estética. */
  const MOMENTOS = [
    {
      hora: 7,   // amanecer: rasante, rosado, todavia tibio
      /* ⚡ HACES REBAJADOS (2026-08-21) — LA RONDA ANTERIOR SOLO TOCÓ EL
         AMBIENTE, Y ESTO ES LO QUE SEGUÍA "OCULTANDO" LA PALETA NUEVA A
         PLENA LUZ DEL DÍA. Los haces (los rayos que entran por la
         ventana) van con mix-blend-mode: screen —suman luz, no la
         tapan— y de día siguen siendo grandes y con bastante alfa
         (pensados para el sepia cálido original). Sumar luz de sobra
         sobre un fondo victoriano oscuro es exactamente lo que lo
         aclara y disimula el cambio de paleta. Se bajó el alfa de los
         tres (centro/medio/borde) en los tres momentos de día —7h, 13h,
         18h— a un poco más de la mitad; la noche (20h en adelante) no se
         tocó, ya estaba bien. */
      hazCentro:  [252, 206, 168, 0.28],
      hazMedio:   [228, 160, 118, 0.17],
      hazBorde:   [200, 124, 88, 0.06],
      motaCentro: [255, 238, 216, 0.90],
      motaBorde:  [246, 208, 168, 0.52],
      /* ⚡ AMBIENTE Y TINTE DE SALA, REBAJADOS (2026-08-20) — ESTO ES LO
         QUE ARREGLABA "EL FONDO SE VE NARANJA Y ALEGRE". Estos dos
         valores tiñen el fondo entero (ver veloDeLaSala y --ambiente-alto
         más abajo), y estaban calibrados para el fondo SEPIA CÁLIDO
         original — el propio comentario de este archivo lo decía. Con el
         fondo nuevo (victoriano oscuro, recursos/fondo-ornamental.svg)
         ese naranja de mediodía/atardecer quedaba encima como un filtro
         alegre sobre un cuadro que tiene que sentirse una cripta. Los
         valores de noche (20h en adelante) NO se tocaron: ya eran oscuros
         y encajan sin ajustar. */
      ambienteAlto: [80, 26, 30, 0.22],
      tinteDeSala:  [64, 28, 30, 0.09],
      tinteDelVelo: [96, 58, 58, 0.14],
      anguloDelSol: 34,
      largoDelHaz:  1.3,
      fuerzaDeVelas: 0.95,
      deNoche: 0.15,
    },
    {
      hora: 13,  // MEDIODIA: el NEUTRO. Luz plana, sin caracter.
      // Mismo motivo que a las 7h: el mediodía es el momento de MÁS sol,
      // así que sin bajar esto era el que más lavaba la paleta oscura.
      hazCentro:  [252, 244, 214, 0.24],
      hazMedio:   [232, 214, 168, 0.14],
      hazBorde:   [210, 190, 128, 0.05],
      motaCentro: [255, 250, 236, 0.92],
      motaBorde:  [248, 238, 200, 0.54],
      // Mismo motivo que a las 7h: era un halo naranja/terroso brillante
      // sobre un fondo que ahora es piedra vieja y sangre seca, no sepia.
      ambienteAlto: [72, 30, 24, 0.13],
      tinteDeSala:  [255, 238, 206, 0.00],
      tinteDelVelo: [64, 46, 28, 0.06],
      anguloDelSol: 10,
      largoDelHaz:  0.85,
      fuerzaDeVelas: 0.7,
      deNoche: 0,
    },
    {
      hora: 18,  // HORA DORADA: el momento mas caracteristico
      // Mismo motivo: acá el alfa era el más alto de los tres momentos de
      // día (.66/.40/.15), así que era el que más disimulaba la paleta.
      hazCentro:  [255, 184, 88, 0.36],
      hazMedio:   [236, 142, 62, 0.22],
      hazBorde:   [206, 108, 44, 0.08],
      motaCentro: [255, 236, 196, 0.95],
      motaBorde:  [250, 206, 132, 0.58],
      // Mismo motivo: el naranja de "hora dorada" era justamente el más
      // fuerte de los tres (alfa .30/.14) — el que más se notaba mal.
      // Ahora es un rojo oscuro profundo, no un atardecer de postal.
      ambienteAlto: [92, 24, 18, 0.24],
      tinteDeSala:  [80, 26, 18, 0.11],
      tinteDelVelo: [104, 48, 16, 0.16],
      anguloDelSol: -26,
      largoDelHaz:  1.28,
      fuerzaDeVelas: 0.92,
      deNoche: 0.35,
    },
    {
      hora: 20,  // crepusculo malva: evita el gris al cruzar de calido a frio
      hazCentro:  [210, 150, 176, 0.50],
      hazMedio:   [172, 116, 158, 0.30],
      hazBorde:   [142, 96, 142, 0.11],
      motaCentro: [246, 224, 240, 0.88],
      motaBorde:  [214, 188, 216, 0.50],
      ambienteAlto: [116, 30, 78, 0.30],
      tinteDeSala:  [22, 14, 46, 0.34],
      tinteDelVelo: [16, 10, 34, 0.30],
      anguloDelSol: -32,
      largoDelHaz:  1.32,
      fuerzaDeVelas: 0.98,
      deNoche: 0.85,
    },
    {
      hora: 23,  // NOCHE: oscura de verdad. La luna apenas insinua.
      hazCentro:  [128, 152, 200, 0.20],
      hazMedio:   [96, 118, 164, 0.12],
      hazBorde:   [72, 92, 138, 0.05],
      motaCentro: [214, 228, 250, 0.70],
      motaBorde:  [160, 184, 222, 0.38],
      ambienteAlto: [26, 40, 78, 0.34],
      tinteDeSala:  [7, 12, 34, 0.46],
      tinteDelVelo: [4, 7, 22, 0.42],
      anguloDelSol: -20,
      largoDelHaz:  1.12,
      fuerzaDeVelas: 1.05,
      deNoche: 1,
    },
  ];

  /* Madrugada profunda: el ancla que mantiene la noche AZUL de punta a
     punta. Sin ella, el tramo 23h -> 7h pasaba por gris a las 3. */
  const MADRUGADA = {
    hora: 2,
    hazCentro:  [112, 136, 188, 0.16],
    hazMedio:   [84, 104, 152, 0.10],
    hazBorde:   [62, 80, 124, 0.04],
    motaCentro: [206, 222, 248, 0.66],
    motaBorde:  [148, 174, 214, 0.34],
    ambienteAlto: [20, 32, 68, 0.34],
    tinteDeSala:  [5, 9, 28, 0.54],
    tinteDelVelo: [3, 5, 18, 0.50],
    anguloDelSol: -10,
    largoDelHaz:  1.05,
    fuerzaDeVelas: 1.08,
    deNoche: 1,
  };

  /* Y el espejo del crepusculo, para el cruce frio -> calido del amanecer. */
  const ANTES_DEL_ALBA = {
    hora: 5,
    hazCentro:  [200, 176, 216, 0.40],
    hazMedio:   [160, 140, 186, 0.24],
    hazBorde:   [130, 112, 162, 0.09],
    motaCentro: [236, 226, 246, 0.82],
    motaBorde:  [198, 186, 220, 0.46],
    ambienteAlto: [80, 58, 108, 0.29],
    tinteDeSala:  [14, 16, 44, 0.40],
    tinteDelVelo: [10, 12, 34, 0.36],
    anguloDelSol: 38,
    largoDelHaz:  1.34,
    fuerzaDeVelas: 1.00,
    deNoche: 0.6,
  };

/**
   * Mezcla dos colores [r,g,b,a]. `t` va de 0 (todo el primero) a 1 (todo
   * el segundo).
   *
   * @param {number[]} a
   * @param {number[]} b
   * @param {number} t
   * @returns {string} El color listo para CSS.
   */
  function mezclar(a, b, t) {
    const v = i => Math.round(a[i] + (b[i] - a[i]) * t);
    const alfa = (a[3] + (b[3] - a[3]) * t).toFixed(3);
    return `rgba(${v(0)}, ${v(1)}, ${v(2)}, ${alfa})`;
  }

  /**
   * Busca entre qué dos momentos cae una hora dada y cuánto pesa cada uno.
   *
   * El día es un CÍRCULO: después de las 23 viene las 7 del día siguiente,
   * no un salto. Por eso, cuando la hora queda fuera del último tramo, se
   * mezcla el último momento con el primero contando las horas que faltan
   * para dar la vuelta.
   *
   * @param {number} hora - Hora decimal (13.5 = 13:30).
   * @returns {{desde: Object, hasta: Object, t: number}}
   */
  function tramoDeLaHora(hora) {
    for (let i = 0; i < MOMENTOS.length - 1; i++) {
      const desde = MOMENTOS[i];
      const hasta = MOMENTOS[i + 1];
      if (hora >= desde.hora && hora < hasta.hora) {
        return { desde, hasta, t: (hora - desde.hora) / (hasta.hora - desde.hora) };
      }
    }

    /* ── El tramo que cruza la medianoche, en dos mitades ──
       De las 23 a las 2 se termina de hundir en el azul, y de las 2 a las 7
       vuelve a subir hacia el rosa del amanecer. Partirlo así es lo que
       mantiene la madrugada AZUL; de un tirón, el punto medio (las 3) caía
       en el gris de mezclar azul con rosa (ver la nota de MADRUGADA). */
    const noche  = MOMENTOS[MOMENTOS.length - 1];   // 23:00
    const alba   = MOMENTOS[0];                     // 07:00

    if (hora >= noche.hora) {
      // 23:00 → 24:00 → 02:00
      const largo = (24 - noche.hora) + MADRUGADA.hora;
      return { desde: noche, hasta: MADRUGADA, t: (hora - noche.hora) / largo };
    }
    if (hora < MADRUGADA.hora) {
      // 00:00 → 02:00 (segunda parte del mismo tramo)
      const largo = (24 - noche.hora) + MADRUGADA.hora;
      return { desde: noche, hasta: MADRUGADA, t: ((24 - noche.hora) + hora) / largo };
    }
    // 02:00 → 05:00 (la madrugada se va tiñendo de malva)
    if (hora < ANTES_DEL_ALBA.hora) {
      return {
        desde: MADRUGADA, hasta: ANTES_DEL_ALBA,
        t: (hora - MADRUGADA.hora) / (ANTES_DEL_ALBA.hora - MADRUGADA.hora),
      };
    }
    // 05:00 → 07:00 (del malva al rosa del amanecer)
    return {
      desde: ANTES_DEL_ALBA, hasta: alba,
      t: (hora - ANTES_DEL_ALBA.hora) / (alba.hora - ANTES_DEL_ALBA.hora),
    };
  }

  /* ⚠️ SE ESCRIBE EL DEGRADADO COMPLETO, NO UNA VARIABLE.
     El primer intento dejaba `var(--luz-haz-centro)` dentro del `background`
     del CSS y acá solo se escribía la variable. Costó caro: 14-haces-de-luz.js
     escribe --luz-intensidad en estas capas cada 65 ms, y cambiar una
     propiedad personalizada invalida el estilo de todo el subárbol, así que
     los 5 haces y las 32 motas volvían a resolver su degradado quince veces
     por segundo. "Recalculate style" pasó del 13 % al 21 % del perfil.

     Escribiendo el degradado ya armado directamente en cada elemento, el
     costo se paga UNA vez cada diez minutos y las invalidaciones de la
     animación vuelven a ser triviales. */

  /** Arma el fondo de un haz con los tres colores de este momento. */
  function fondoDelHaz(centro, medio, borde) {
    return `radial-gradient(ellipse 62% 46% at 50% 24%, ${centro} 0%, ` +
           `${medio} 38%, ${borde} 62%, transparent 80%)`;
  }

  /** Arma el fondo de una mota con los dos colores de este momento. */
  function fondoDeLaMota(centro, borde) {
    return `radial-gradient(circle, ${centro} 0%, ${borde} 42%, transparent 72%)`;
  }

  /**
   * Calcula la luz de este momento y la aplica.
   * @returns {void}
   */
  function ponerLaLuzDeLaHora() {
    const ahora = new Date();
    const hora = ahora.getHours() + ahora.getMinutes() / 60;
    const { desde, hasta, t } = tramoDeLaHora(hora);

    const color = clave => mezclar(desde[clave], hasta[clave], t);

    const fondoHaz = fondoDelHaz(color('hazCentro'), color('hazMedio'), color('hazBorde'));
    const fondoMota = fondoDeLaMota(color('motaCentro'), color('motaBorde'));

    for (const haz of document.querySelectorAll('.haz')) haz.style.background = fondoHaz;
    for (const mota of document.querySelectorAll('.mota')) mota.style.background = fondoMota;

    /* ── EL AMBIENTE DE ARRIBA: LA LUZ DE LUNA ──
       El halo grande de la parte superior de la portada. Era un vino fijo y
       por eso, aunque los haces viraran a azul de noche, el ambiente seguía
       cálido y el cambio se sentía a medias. Ahora entra luz de luna de
       verdad, y las velas siguen tibias: ese contraste es el punto.

       Acá SÍ se usa var() dentro del degradado, y no contradice lo de
       arriba. Lo que hace caro a var() no es var(), es que ALGO invalide
       ese subárbol por cuadro: en las motas, otro módulo escribía en el
       padre cada 65 ms. Sobre #portada la única escritura es esta, una vez
       cada diez minutos, así que el costo es cero.

       Es un pseudo-elemento (::before) y no se le puede escribir el estilo
       directo; por eso va por variable, que es justamente el caso donde
       var() es la herramienta correcta. */
    const portada = document.getElementById('portada');
    if (portada) portada.style.setProperty('--ambiente-alto', color('ambienteAlto'));

    /* ── LA HABITACIÓN ENTERA ──
       El halo de la portada solo no alcanzaba: el fondo de la web es un
       dibujo SEPIA CÁLIDO a pantalla completa, y un halo al 30 % en un
       rincón no puede contra eso. Se veía cambiar la luz de los ventanales
       mientras la sala seguía tibia.

       Este tinte cubre todo el fondo y es el que de verdad hace que sea de
       noche: azul de luna de madrugada, nada al mediodía. Va sobre el
       dibujo y debajo del velo negro (ver #capa-fondo en
       estilos/01-fundamentos.css).

       Las velas siguen cálidas encima, y ese contraste —sala fría, fuego
       tibio— es lo que hace bonita una escena nocturna a la luz de vela. */
    const fondo = document.getElementById('capa-fondo');
    if (fondo) fondo.style.setProperty('--velo-de-la-hora', veloDeLaSala(desde, hasta, t));

    /* ── EL VELO DE PROFUNDIDAD, TEÑIDO ──
       Es la capa más grande de la escena: cubre el documento entero. Que se
       tiña con la hora es lo que hace que la SALA cambie de temperatura, no
       solo la ventana. Cálido de tarde, azul de madrugada. */
    const penumbra = document.getElementById('penumbra-profunda');
    if (penumbra) penumbra.style.setProperty('--tinte-del-velo', color('tinteDelVelo'));

    /* ── LO QUE LEEN LOS BUCLES QUE YA EXISTEN ──
       Estos tres no son colores: son NÚMEROS que cambian el comportamiento
       de la escena, y son los que de verdad hacen que se note la hora.

         · anguloDelSol  → por dónde ENTRA la luz. Es la señal más legible de
                           todas: a las 7 de la mañana los haces entran
                           rasantes desde un lado, al mediodía casi
                           verticales, y al atardecer rasantes desde el otro.
         · largoDelHaz   → un sol bajo alarga el rayo; uno alto lo acorta.
         · fuerzaDeVelas → de día las velas compiten con la ventana y quedan
                           discretas (×0,70); de madrugada SON la única luz
                           de la sala y crecen (×1,30). Ese cambio de quién
                           manda es lo que vuelve envolvente la escena.
         · deNoche       → 0 al mediodía, 1 de noche cerrada. Lo usa
                           codigo/27-fauna-nocturna.js para que las
                           luciérnagas y termitas solo se vean cuando de
                           verdad es de noche, con un fundido suave al
                           atardecer/amanecer en vez de un apagón brusco a
                           una hora fija.

       Se escriben una vez cada diez minutos: cuestan cero por cuadro. */
    const mezclarNumero = (clave) => desde[clave] + (hasta[clave] - desde[clave]) * t;

    window.LuzDeLaHora = {
      anguloDelSol:  mezclarNumero('anguloDelSol'),
      largoDelHaz:   mezclarNumero('largoDelHaz'),
      fuerzaDeVelas: mezclarNumero('fuerzaDeVelas'),
      deNoche:       mezclarNumero('deNoche'),
    };

    document.dispatchEvent(new CustomEvent('hora-cambio'));
  }

  /**
   * Arma la CÚPULA de luz ambiental que entra desde arriba.
   *
   * ⛔ EL PRIMER INTENTO FUE UN TINTE PLANO —el mismo color con la misma
   * opacidad sobre toda la pantalla— y quedó fatal, con razón: eso no es
   * luz, es un filtro de color pegado encima, y se lee exactamente como lo
   * que es.
   *
   * La luz de verdad tiene tres propiedades que un tinte plano no tiene:
   *
   *   1. VIENE DE UN SITIO. Acá, de arriba: los ventanales por donde entran
   *      los haces. Por eso la elipse nace FUERA del borde superior (-8 %),
   *      como si la fuente estuviera más allá de la ventana.
   *   2. SE APAGA CON LA DISTANCIA. El degradado muere antes de la mitad de
   *      la pantalla, así que abajo —donde mandan los candelabros— la escena
   *      sigue siendo cálida de fuego.
   *   3. NO MANDA SOBRE LO QUE YA ESTÁ ILUMINADO. Esta se resuelve sola: las
   *      velas se dibujan en el lienzo POR ENCIMA y con suma aditiva, así que
   *      sus charcos tibios atraviesan el frío sin que haya que hacer nada.
   *
   * Ese contraste —sala azulada arriba, islas de fuego abajo— es cómo se ve
   * de verdad un salón a la luz de velas de noche.
   *
   * @returns {string} El degradado completo, listo para el `background-image`.
   */
  function veloDeLaSala(desde, hasta, t) {
    const base = desde.tinteDeSala;
    const otro = hasta.tinteDeSala;
    const canal = i => Math.round(base[i] + (otro[i] - base[i]) * t);
    const alfa  = base[3] + (otro[3] - base[3]) * t;

    const r = canal(0), g = canal(1), b = canal(2);
    const tono = (fuerza) => `rgba(${r}, ${g}, ${b}, ${(alfa * fuerza).toFixed(3)})`;

    /* La elipse es ANCHA (130 %) y baja (65 %): se derrama hacia los lados
       en vez de caer como una banda recta. */
    return 'radial-gradient(ellipse 130% 65% at 50% -8%, ' +
           tono(1)    + ' 0%, '   +
           tono(0.62) + ' 26%, '  +
           tono(0.28) + ' 46%, '  +
           tono(0.08) + ' 60%, '  +
           `rgba(${r}, ${g}, ${b}, 0) 74%)`;
  }

  ponerLaLuzDeLaHora();

  /* Los haces y las motas los crean otros módulos; si alguno todavía no
     había terminado al cargar, se vuelve a aplicar cuando la invitación se
     hace visible. Es barato y garantiza que nada quede con el color de
     reserva del CSS. */
  document.addEventListener('invitacion-visible', () => setTimeout(ponerLaLuzDeLaHora, 300));

  /* Cada diez minutos alcanza: entre un cálculo y el siguiente el color se
     mueve poquísimo, y el cambio queda suavizado por la transición de
     opacidad que ya tienen las capas. */
  setInterval(ponerLaLuzDeLaHora, 10 * 60 * 1000);

  /* Si alguien deja la pestaña abierta toda la tarde y vuelve, se refresca
     al instante en vez de esperar al próximo turno. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ponerLaLuzDeLaHora();
  });

})();
