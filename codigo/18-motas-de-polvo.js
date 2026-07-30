/* ══════════════════════════════════════════════════════════════════════
   18 · MOTAS DE POLVO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Siembra la capa #motas-de-polvo con partículas doradas mínimas que
   flotan dentro de la luz. Cada una recibe su tamaño, su lugar de
   nacimiento, su recorrido y su ritmo, todo al azar, para que ninguna se
   mueva igual que otra.

   POR QUÉ NO SE ANIMAN DESDE ACÁ
   El movimiento lo hace el CSS (la animación "flotar-mota" en
   12-haces-de-luz.css). Este archivo solo REPARTE las motas y les pasa
   sus números por variables CSS. Así no hay un bucle de JavaScript
   corriendo todo el tiempo: el navegador anima las partículas por su
   cuenta, que es mucho más barato.

   DÓNDE VIVEN
   Sobre todo en la mitad de arriba, que es por donde entra la luz. Abajo
   apenas hay, como el polvo real: se ve en el haz, no en la sombra.
   ══════════════════════════════════════════════════════════════════════ */

(function siembraLasMotasDePolvo() {

  const capa = buscar('#motas-de-polvo');
  if (!capa) return;

  /* Las motas se crean SIEMPRE (así el botón puede encenderlas en vivo).
     Cuando las animaciones están apagadas, el CSS detiene su vuelo y
     esconde la capa; encendidas, flotan. Además, su brillo cuelga de
     --luz-intensidad, que en modo apagado vale 0, así que ni se ven. */

  /** Cuántas motas. Menos en pantallas chicas, donde estorban más. */
  /* ⚡ RENDIMIENTO: menos motas. Antes eran 34 (14 en celular); cada una es
     una capa que el compositor mueve. Con la mitad, el aire sigue leyéndose
     poblado y el costo baja bastante, sobre todo sin placa de video. */
  const esPantallaChica = window.matchMedia('(max-width: 700px)').matches;
  const BASE = esPantallaChica ? 8 : 18;

  /* CALIDAD GRÁFICA: las motas son lo que vuelve VOLUMÉTRICA la luz —sin
     ellas los haces son una mancha translúcida; con polvo flotando adentro
     se ve el aire—. Por eso en calidad ALTA el aire va bastante más poblado
     (factor 1,8): es de los detalles que más se agradecen cuando el equipo
     tiene margen.

     Se crean SIEMPRE todas las de calidad alta y se esconden las sobrantes
     según el nivel. Igual que con los pétalos: si solo se crearan las del
     nivel inicial, un equipo que MEJORA a alta nunca vería el aire más
     poblado sin recargar la página. Esconder una mota no cuesta nada —el
     CSS deja de animarla—, y así subir de nivel se nota al instante.
     (En calidad baja, además, el CSS oculta la capa entera.) */
  /* Fracciones sobre el total sembrado (32 en escritorio). Baja pasó de
     tener CERO motas —el CSS escondía la capa entera y la penumbra quedaba
     muerta— a conservar unas 8: es el polvo el que vuelve volumétrica la
     luz, y sin él la atmósfera se pierde. Se puede permitir porque en baja
     ya no llevan capa de GPU propia (ver estilos/12-haces-de-luz.css). */
  const FRACCION_POR_CALIDAD = { 0: 1, 1: 0.55, 2: 0.25 };
  const CUANTAS = Math.max(3, Math.round(BASE * 1.8));

  /**
   * Deja visibles solo las motas que corresponden al nivel de calidad.
   * @param {number} calidad
   * @returns {void}
   */
  function ajustarCantidadDeMotas(calidad) {
    const fraccion = FRACCION_POR_CALIDAD[calidad] ?? 1;
    const cuantasVisibles = Math.max(3, Math.round(CUANTAS * fraccion));

    /* Con el lienzo no hay elementos que esconder: se marca cuáles se
       dibujan y el bucle saltea el resto. */
    if (usaElLienzo) {
      for (let i = 0; i < motasDelLienzo.length; i++) {
        motasDelLienzo[i].seDibuja = i < cuantasVisibles;
      }
      return;
    }

    const todas = capa.children;
    for (let i = 0; i < todas.length; i++) {
      todas[i].style.display = i < cuantasVisibles ? '' : 'none';
    }
  }

  /**
   * Calcula dónde está y cuánto brilla cada mota en este instante.
   *
   * ⚠️ ESTO REPRODUCE LA ANIMACIÓN "flotar-mota" DEL CSS, tal cual estaba
   * escrita (ver estilos/12-haces-de-luz.css):
   *
   *     0 %   nace en su sitio, invisible
   *     12 %  ya alcanzó su brillo propio
   *     88 %  lo mantiene
   *     100 % terminó su deriva y se apagó, y vuelve a empezar
   *
   * Se pasó a JavaScript no por gusto, sino porque su capa llevaba un
   * `mix-blend-mode: screen` del tamaño de la ventana —de lo más caro que
   * existe para el compositor— y dibujarlas en el lienzo no cuesta ninguna
   * capa. La trayectoria y el ritmo son idénticos.
   *
   * @param {number} tSegundos   - Segundos desde que arrancó la página.
   * @param {number} ancho       - Ancho de la ventana en píxeles.
   * @param {number} alto        - Alto de la ventana en píxeles.
   * @param {number} luzAmbiente - Lo que antes aportaba --luz-intensidad.
   * @returns {void}
   */
  function animarLasMotas(tSegundos, ancho, alto, luzAmbiente) {
    for (let i = 0; i < motasDelLienzo.length; i++) {
      const m = motasDelLienzo[i];
      if (m.seDibuja === false) { m.alfa = 0; continue; }

      /* El retardo es negativo (así al cargar ya están a mitad de camino),
         por eso se RESTA: restar un negativo adelanta el reloj. */
      let avance = ((tSegundos - m.retardo) / m.duracion) % 1;
      if (avance < 0) avance += 1;

      m.x = m.izquierda * ancho + m.derivaX * avance;
      m.y = m.arriba    * alto  + m.derivaY * avance;

      // La rampa de opacidad: sube hasta 12 %, se mantiene, cae desde 88 %.
      let rampa;
      if (avance < 0.12)      rampa = avance / 0.12;
      else if (avance > 0.88) rampa = (1 - avance) / 0.12;
      else                    rampa = 1;

      m.alfa = m.opacidadPropia * rampa * luzAmbiente;
    }
  }

  /** ¿Dibuja el lienzo? (ver codigo/23-lienzo-de-luz.js). */
  const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);

  /* Con el lienzo activo las motas NO son elementos: son números. Acá se
     guardan los mismos datos que antes iban a variables CSS, y el lienzo
     reproduce con ellos la animación "flotar-mota" tal cual estaba escrita
     en el CSS (nacer, derivar en diagonal, apagarse y reaparecer). */
  const motasDelLienzo = [];

  const fragmento = document.createDocumentFragment();

  for (let i = 0; i < CUANTAS; i++) {
    const mota = document.createElement('span');
    mota.className = 'mota';

    // Tamaño: casi todas diminutas, unas pocas un poco mayores.
    const tamano = (0.8 + Math.random() * Math.random() * 3.4).toFixed(2);

    // Nacen repartidas a lo ancho y, sobre todo, en la mitad de arriba.
    const izquierda = (Math.random() * 100).toFixed(2);
    const arriba    = (Math.random() * Math.random() * 78).toFixed(2);

    /* Recorrido: derivan despacio hacia abajo y un poco de costado,
       siguiendo la diagonal por la que entra la luz. */
    const derivaX = (-20 - Math.random() * 55).toFixed(0);
    const derivaY = ( 50 + Math.random() * 130).toFixed(0);

    // Ritmo: lento y desparejo. El retardo negativo hace que al cargar la
    // página ya estén a mitad de camino, no todas recién naciendo.
    const duracion = (18 + Math.random() * 26).toFixed(1);
    const retardo  = (-Math.random() * duracion).toFixed(1);

    // Brillo propio: unas más presentes que otras.
    const opacidad = (0.3 + Math.random() * 0.6).toFixed(2);

    if (usaElLienzo) {
      /* Los mismos números, sin elemento. Las posiciones van en fracción de
         la ventana (0..1) porque la capa era `fixed`: el polvo flota en la
         pantalla, no en el documento, y así sigue valiendo si se
         redimensiona. */
      motasDelLienzo.push({
        izquierda: +izquierda / 100,
        arriba: +arriba / 100,
        radio: +tamano / 2,
        derivaX: +derivaX,
        derivaY: +derivaY,
        duracion: +duracion,
        retardo: +retardo,
        opacidadPropia: +opacidad,
        // Lo que lee el lienzo cada cuadro; se rellena en el bucle.
        x: 0, y: 0, alfa: 0,
      });
      continue;
    }

    mota.style.cssText =
      `width:${tamano}px;height:${tamano}px;left:${izquierda}%;top:${arriba}%;` +
      `--mota-dx:${derivaX}px;--mota-dy:${derivaY}px;` +
      `--mota-dur:${duracion}s;--mota-delay:${retardo}s;--mota-op:${opacidad};`;

    fragmento.appendChild(mota);
  }

  if (usaElLienzo) {
    /* La capa entera se apaga: era la otra `mix-blend-mode: screen` del
       tamaño de la ventana. El lienzo las dibuja sin costar una capa.

       ⚠️ Acá NO va un `return`: abajo se registra el escucha del gobernador
       de calidad, que hace falta en los dos sistemas. Con un return, al
       cambiar de nivel gráfico el polvo se quedaría con la cantidad de
       arranque para siempre. */
    capa.style.display = 'none';
    window.LienzoDeLuz.motas = motasDelLienzo;
    window.LienzoDeLuz.animarLasMotas = animarLasMotas;
  } else {
    capa.appendChild(fragmento);
  }

  /* Se aplica el nivel actual ya mismo (para no mostrar de más un instante)
     y se escucha al gobernador: si el equipo mejora, el aire se puebla; si
     sufre, se aclara. Sin recargar. */
  ajustarCantidadDeMotas(nivelDeCalidad());
  document.addEventListener('calidad-cambio', evento => {
    ajustarCantidadDeMotas((evento.detail && evento.detail.calidad) ?? 0);
  });

})();
