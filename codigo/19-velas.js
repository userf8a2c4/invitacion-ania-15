/* ══════════════════════════════════════════════════════════════════════
   19 · CANDELABROS DE LA PROFUNDIDAD
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Monta candelabros de pared (apliques de latón) en los laterales de las
   secciones más hondas —donde la luz del día ya no llega— y hace TITILAR
   sus velas. La idea es la de una mansión antigua de noche: la oscuridad
   pesa, opresiva, y los candelabros rescatan la opulencia (el oro, las
   rosas) a parpadeos. Tenebroso, pero elegante.

   LA LUZ TIENE UNA FUENTE VISIBLE
   Antes la luz era un halo que salía de la nada. Ahora cada llama de cada
   candelabro emite su resplandor: se ve DE DÓNDE sale la luz. Por eso hay
   dos capas (ver 12-haces-de-luz.css):
     · #apliques (z 62, delante de las rosas): la pieza de latón con sus
       velas y llamas. Se ve entera.
     · #velas (z 58, detrás de las rosas): el resplandor de cada llama.
       Como queda detrás del follaje, las rosas lo tapan y se recortan como
       siluetas difusas. Cada halo se ALINEA con la punta de su llama
       midiéndola en pantalla.

   CÓMO TITILA UNA LLAMA (y por qué no es un seno)
   Una llama tiembla irregular, con caídas bruscas por corrientes de aire.
   Por eso el titileo es un "camino al azar": el brillo persigue un objetivo
   que se re-sortea cada tanto, con caídas ocasionales, más un temblor
   rápido encima. La llama del SVG y su halo laten con el MISMO valor, para
   que fuente y luz respiren juntas.

   ÍNDICE
     1. Dibujo del candelabro (SVG)
     2. Dónde va cada candelabro
     3. Alinear los halos con las llamas
     4. El titileo
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLosCandelabros() {

  const capaApliques = buscar('#apliques');
  const capaVelas    = buscar('#velas');
  if (!capaApliques || !capaVelas) return;


  /* ─── 1. DIBUJO DEL CANDELABRO (SVG) ───────────────────────────────────
     Un aplique de pared con 3 velas: se monta en el borde interior del
     marco (izquierda) y abre en abanico hacia adentro —una vela arriba,
     una al centro (la que más se adentra) y una abajo—. El lado derecho es
     este mismo dibujo reflejado por CSS.

     Los gradientes se definen UNA sola vez (defsCompartidos) y todas las
     piezas los reusan, para no repetir ids. */

  const defsCompartidos =
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <linearGradient id="apl-oro" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e8d290"/><stop offset="45%" stop-color="#c1a049"/>
        <stop offset="100%" stop-color="#7a5c25"/>
      </linearGradient>
      <radialGradient id="apl-llama" cx="50%" cy="62%" r="60%">
        <stop offset="0%" stop-color="#fff6d5"/><stop offset="38%" stop-color="#ffcf6b"/>
        <stop offset="72%" stop-color="#e6862f"/><stop offset="100%" stop-color="#b5471a"/>
      </radialGradient>
    </defs></svg>`;

  /**
   * Una vela con su llama, apoyada en el punto (bx, by) que es donde el
   * brazo la sostiene. La llama va envuelta en un grupo .llama para que el
   * titileo la anime sola.
   * @param {number} bx - x de la base de la vela.
   * @param {number} by - y de la base de la vela.
   * @returns {string}
   */
  function velaEn(bx, by) {
    return `
      <ellipse cx="${bx}" cy="${by}" rx="11" ry="3.6" fill="url(#apl-oro)" stroke="#6b5122" stroke-width=".8"/>
      <rect x="${bx - 5}" y="${by - 6}" width="10" height="7" rx="1.5" fill="url(#apl-oro)"/>
      <rect x="${bx - 4.5}" y="${by - 32}" width="9" height="27" rx="2.5" fill="#efe6d0" stroke="#b9a874" stroke-width=".7"/>
      <path d="M${bx - 4.5} ${by - 20} q -2 6, 0 11" fill="none" stroke="#d9cba6" stroke-width="1" stroke-opacity=".7"/>
      <line x1="${bx}" y1="${by - 32}" x2="${bx}" y2="${by - 36}" stroke="#3a2a1a" stroke-width="1.4"/>
      <g class="llama">
        <ellipse cx="${bx}" cy="${by - 34}" rx="3" ry="2.2" fill="#6ea8ff" fill-opacity=".5"/>
        <path d="M${bx} ${by - 31} C ${bx - 5} ${by - 37}, ${bx - 4} ${by - 45}, ${bx} ${by - 50}
                 C ${bx + 4} ${by - 45}, ${bx + 5} ${by - 37}, ${bx} ${by - 31} Z"
              fill="url(#apl-llama)"/>
        <path d="M${bx} ${by - 33} C ${bx - 2.4} ${by - 37}, ${bx - 2} ${by - 42}, ${bx} ${by - 45}
                 C ${bx + 2} ${by - 42}, ${bx + 2.4} ${by - 37}, ${bx} ${by - 33} Z"
              fill="#fff3c4" fill-opacity=".85"/>
      </g>`;
  }

  /* El candelabro completo. viewBox 200×240; la placa de montaje a la
     izquierda (se apoya en el riel del marco) y los brazos hacia la
     derecha. */
  const svgCandelabro =
    `<svg class="aplique-svg" viewBox="0 0 200 240" width="100%" aria-hidden="true">
      <!-- brazos de voluta (latón), del boss a cada vela -->
      <g fill="none" stroke="url(#apl-oro)" stroke-width="5" stroke-linecap="round">
        <path d="M36 120 C 80 138, 120 138, 150 120"/>
        <path d="M34 111 C 62 92, 90 72, 112 64"/>
        <path d="M34 129 C 62 148, 90 168, 112 176"/>
      </g>
      <!-- pequeñas volutas de adorno en los arranques -->
      <g fill="none" stroke="url(#apl-oro)" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".8">
        <path d="M60 130 c 8 6, 8 -8, 0 -6"/>
        <path d="M60 100 c 8 -6, 8 8, 0 6"/>
      </g>
      <!-- placa de montaje + boss con cabujón rojo -->
      <path d="M22 72 C 35 82, 35 158, 22 168 C 9 158, 9 82, 22 72 Z"
            fill="url(#apl-oro)" stroke="#6b5122" stroke-width="1"/>
      <circle cx="22" cy="60" r="4.5" fill="url(#apl-oro)"/>
      <path d="M22 176 l 5 12 l -5 6 l -5 -6 Z" fill="url(#apl-oro)"/>
      <circle cx="31" cy="120" r="8.5" fill="url(#apl-oro)" stroke="#6b5122" stroke-width=".8"/>
      <circle cx="31" cy="120" r="3.6" fill="#7a1728"/>
      <!-- las tres velas -->
      ${velaEn(150, 120)}
      ${velaEn(112, 64)}
      ${velaEn(112, 176)}
    </svg>`;


  /* ─── 2. DÓNDE VA CADA CANDELABRO ──────────────────────────────────────
     En los laterales de la mitad de abajo del documento (la penumbra),
     alternando lados. La posición vertical es en % del alto del documento,
     así se acomodan si la página crece. */
  const UBICACIONES = [
    { top: 58, lado: 'izq' },
    { top: 70, lado: 'der' },
    { top: 82, lado: 'izq' },
    { top: 93, lado: 'der' },
  ];

  /** Grosor del marco en px, calculado igual que el clamp del CSS. */
  function grosorDelMarco() {
    return limitar(window.innerWidth * 0.034, 20, 72);
  }

  capaApliques.insertAdjacentHTML('beforeend', defsCompartidos);

  /** @type {Array<{aplique:HTMLElement, lado:string}>} */
  const candelabros = UBICACIONES.map(u => {
    const cont = document.createElement('div');
    cont.className = 'aplique';
    cont.style.top = u.top + '%';
    cont.innerHTML = svgCandelabro;
    capaApliques.appendChild(cont);
    return { cont, lado: u.lado };
  });

  /**
   * Ajusta tamaño y lado de cada candelabro. Se llama al inicio y en cada
   * redimensión, porque el tamaño depende del grosor del marco.
   * @returns {void}
   */
  function acomodarCandelabros() {
    const g = grosorDelMarco();
    const ancho = g * 3.6;   // el brazo alcanza ~2.7×grosor hacia adentro
    for (const c of candelabros) {
      c.cont.style.width = ancho + 'px';
      if (c.lado === 'izq') {
        c.cont.style.left = '0';
        c.cont.style.right = '';
        c.cont.style.transform = 'translateY(-50%)';
      } else {
        c.cont.style.right = '0';
        c.cont.style.left = '';
        c.cont.style.transform = 'translateY(-50%) scaleX(-1)';
      }
    }
  }
  acomodarCandelabros();


  /* ─── 3. ALINEAR LOS HALOS CON LAS LLAMAS ──────────────────────────────
     Cada llama (dibujada en #apliques, delante de las rosas) necesita su
     halo (en #velas, detrás de las rosas). El halo se ubica midiendo dónde
     quedó la llama en pantalla y pasándolo a coordenadas del documento. */

  const llamas = buscarTodos('#apliques .llama');

  /** @type {Array<{llama:Element, halo:HTMLElement, base:number, nivel:number, objetivo:number, proximoSorteo:number, fase:number}>} */
  const fuegos = llamas.map(llama => {
    const halo = document.createElement('div');
    halo.className = 'vela';
    capaVelas.appendChild(halo);
    const base = 0.5 + Math.random() * 0.28;
    /* Encendida desde el primer cuadro: si el titileo todavía no corrió
       (o el navegador tiene la pestaña en segundo plano y pausó los
       requestAnimationFrame), la vela igual se ve prendida, no apagada. */
    halo.style.opacity = base.toFixed(3);
    return {
      llama, halo, base,
      nivel: 1, objetivo: 1, proximoSorteo: 0,
      fase: Math.random() * 1000,
    };
  });

  /**
   * Vuelve a ubicar y dimensionar cada halo según dónde está su llama.
   * @returns {void}
   */
  function ubicarLosHalos() {
    const tamano = grosorDelMarco() * 2.4;   // charco chico, confinado al borde
    for (const fuego of fuegos) {
      const caja = fuego.llama.getBoundingClientRect();
      const cx = caja.left + caja.width / 2 + window.scrollX;
      const cy = caja.top  + caja.height / 2 + window.scrollY;
      fuego.halo.style.width  = tamano + 'px';
      fuego.halo.style.height = tamano + 'px';
      fuego.halo.style.left = (cx - tamano / 2) + 'px';
      fuego.halo.style.top  = (cy - tamano / 2) + 'px';
    }
  }
  ubicarLosHalos();

  /* Rehacer medidas si cambia el tamaño de la ventana (con un respiro para
     no recalcular en cada píxel del arrastre). */
  let temporizador = null;
  window.addEventListener('resize', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { acomodarCandelabros(); ubicarLosHalos(); }, 250);
  });
  window.addEventListener('load', ubicarLosHalos);


  /* ─── 4. EL TITILEO ────────────────────────────────────────────────────
     Si se pidió menos movimiento, llamas y halos quedan encendidos y
     quietos (el CSS ya los deja tenues). No hay bucle. */
  if (prefiereMenosMovimiento()) return;

  function dibujarCuadro(t) {
    for (const fuego of fuegos) {
      /* Cada tanto la llama elige un nuevo brillo; a veces es una caída
         fuerte (la corriente de aire que casi la apaga). */
      if (t > fuego.proximoSorteo) {
        fuego.objetivo = 0.62 + Math.random() * 0.38;
        if (Math.random() < 0.12) fuego.objetivo *= 0.55;
        fuego.proximoSorteo = t + 110 + Math.random() * 220;
      }
      // El brillo persigue al objetivo con suavidad (la llama tiene inercia).
      fuego.nivel += (fuego.objetivo - fuego.nivel) * 0.16;
      // Temblor rápido y chico encima, para que nunca quede plana.
      const temblor = 1 + Math.sin(t / 60 + fuego.fase) * 0.06;
      const brillo = fuego.nivel * temblor;

      // La llama del SVG: cambia opacidad y crece/encoge desde la mecha.
      fuego.llama.style.opacity = (0.7 + brillo * 0.3).toFixed(3);
      fuego.llama.style.transform =
        `scaleY(${(0.9 + brillo * 0.16).toFixed(3)}) scaleX(${(0.98 + brillo * 0.04).toFixed(3)})`;

      /* El halo detrás de las rosas: late con el mismo valor. Solo se
         anima la OPACIDAD, no la escala: el halo está desenfocado (blur), y
         escalar un elemento con blur lo re-rasteriza cada cuadro —caro—.
         Con solo la opacidad, el titileo se ve igual y es mucho más liviano. */
      fuego.halo.style.opacity = (fuego.base * brillo).toFixed(3);
    }
    requestAnimationFrame(dibujarCuadro);
  }
  requestAnimationFrame(dibujarCuadro);

})();
