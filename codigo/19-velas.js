/* ══════════════════════════════════════════════════════════════════════
   19 · CANDELABROS Y VELAS DE LA PROFUNDIDAD
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Monta la iluminación de la mitad honda de la página —donde la luz del día
   ya no llega—:
     · CANDELABROS de pared (apliques de latón con 3 velas) en los laterales.
     · CÚMULOS de VELAS DE PISO (cirios derretidos) en los extremos, tipo
       mansión antigua a oscuras.
   Los dibuja, los ubica, los hace TITILAR y, sobre todo, hace que ILUMINEN
   esa zona sin encandilar la lectura.

   ─────────────────────────────────────────────────────────────────────
   LAS DECISIONES QUE HACEN QUE ESTO FUNCIONE

   1) EL ORDEN DE LAS CAPAS (ver 12-haces-de-luz.css)
      La PIEZA va en #apliques (z 57), por debajo del marco: las enredaderas
      le pasan por delante y el candelabro queda montado en la pared.
      El RESPLANDOR va en #luz-de-velas (z 66), por ENCIMA del velo de
      penumbra (65). Antes iba debajo y el velo le comía la luz.

   2) LA LUZ SE CALCULA, NO SE MIDE
      La posición de cada resplandor sale de la geometría (la llama está en
      coordenadas FIJAS del viewBox de su dibujo):
          x = izquierdaDelContenedor + (xDeLaLlama / anchoVB) * anchoReal
      Es determinista: no se desincroniza por reflow. Un ResizeObserver
      sobre las secciones ancla reubica todo si la página cambia de alto
      (el iframe del mapa carga tarde y mueve el resto).

   3) NADA DE `filter: blur`
      El resplandor son dos degradados radiales (núcleo + derrame), suaves de
      nacimiento. El REALISMO del metal y la cera también sale de degradados
      y capas de forma (luz/sombra/pátina), NO de filtros: un filtro sobre
      algo que titila se re-rasteriza en cada cuadro, carísimo sin GPU.

   4) EL BRILLO NO DEBE ENCANDILAR EL TEXTO
      Según el ancho de pantalla, el derrame (que en `screen` suma luz) puede
      caer sobre la caja de texto central y lavar la lectura. Por eso, en cada
      acomodo, se mide cuánto invade el derrame la caja de su sección y:
        · se ATENÚA (baja intensidad y tamaño) cuanto más se acerca, y
        · si queda MUY encima, se manda DETRÁS: el derrame se reubica en
          #apliques (bajo el velo), así la caja lo tapa y el texto se lee
          limpio. El núcleo —chico y pegado a la llama, lejos del centro—
          nunca se toca.

   ─────────────────────────────────────────────────────────────────────
   CÓMO TITILA UNA LLAMA (y por qué no es un seno)
   Una llama tiembla irregular, con caídas bruscas por corrientes de aire.
   El titileo es un "camino al azar": el brillo persigue un objetivo que se
   re-sortea cada tanto, con caídas ocasionales, más un temblor rápido
   encima. La llama del SVG y sus dos resplandores laten con el MISMO valor.

   ÍNDICE
     1. Dibujo (defs, llama, vela, candelabro, cirios de piso)
     2. Dónde va cada pieza
     3. Ubicar pieza y resplandores (por cálculo) + no encandilar el texto
     4. El titileo
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasVelas() {

  const capaApliques = buscar('#apliques');
  const capaLuz      = buscar('#luz-de-velas');
  if (!capaApliques || !capaLuz) return;

  /* Todo se dibuja SIEMPRE y queda ENCENDIDO, aun con las animaciones
     apagadas: es la fuente de luz de la profundidad. Lo único que se apaga
     en modo "sin animación" es el TITILEO (ver el guard del bucle). */


  /* ─── 1. DIBUJO ────────────────────────────────────────────────────────
     Sin contornos de "dibujo": el volumen lo dan los degradados (luz
     arriba-izquierda → sombra abajo-derecha), realces claros y pátina en los
     recovecos. Mismo criterio con el que se arreglaron las rosas. */

  const defsCompartidos =
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <!-- Latón pulido: reflejo casi blanco arriba-izquierda, bronce
           profundo abajo-derecha. Más paradas = más "metal", menos plano. -->
      <linearGradient id="apl-laton" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#fff3c8"/>
        <stop offset="16%"  stop-color="#f0dda2"/>
        <stop offset="42%"  stop-color="#c8a651"/>
        <stop offset="70%"  stop-color="#8f6d2c"/>
        <stop offset="88%"  stop-color="#6a4f22"/>
        <stop offset="100%" stop-color="#4a3518"/>
      </linearGradient>
      <!-- Brazos (tubo): realce longitudinal al medio, sombra a los cantos. -->
      <linearGradient id="apl-brazo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#5d4520"/>
        <stop offset="30%"  stop-color="#c79f45"/>
        <stop offset="48%"  stop-color="#f6e8b4"/>
        <stop offset="64%"  stop-color="#c19c46"/>
        <stop offset="100%" stop-color="#5d4520"/>
      </linearGradient>
      <!-- Llama: núcleo cálido claro → ámbar → rojo en la punta. -->
      <radialGradient id="apl-llama" cx="50%" cy="64%" r="62%">
        <stop offset="0%"   stop-color="#fff6d5"/>
        <stop offset="34%"  stop-color="#ffce68"/>
        <stop offset="70%"  stop-color="#e6822c"/>
        <stop offset="100%" stop-color="#b0421a"/>
      </radialGradient>
      <!-- Cera: lado iluminado y lado en sombra (no es blanco plano). -->
      <linearGradient id="apl-cera" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#fcf5e4"/>
        <stop offset="52%"  stop-color="#e6d9bc"/>
        <stop offset="100%" stop-color="#b6a382"/>
      </linearGradient>
      <!-- Calor de la llama sobre la cera del tope: la cera se traluce. -->
      <radialGradient id="apl-cera-calor" cx="50%" cy="18%" r="70%">
        <stop offset="0%"   stop-color="#ffe6a6" stop-opacity=".9"/>
        <stop offset="55%"  stop-color="#ffcf8a" stop-opacity=".35"/>
        <stop offset="100%" stop-color="#ffcf8a" stop-opacity="0"/>
      </radialGradient>
      <!-- Sombra proyectada / pátina: negro que cae a nada, sin blur. -->
      <radialGradient id="apl-sombra" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#000" stop-opacity=".5"/>
        <stop offset="60%"  stop-color="#000" stop-opacity=".28"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs></svg>`;

  /**
   * La llama (3 capas + base azulada). Se dibuja apoyada en la punta de la
   * mecha (x, mechaY); crece hacia arriba. Va en un <g class="llama"> para
   * que el titileo la tome.
   * @param {number} x     - x de la mecha.
   * @param {number} mechaY - y de la punta de la mecha (base de la llama).
   * @param {number} [k]   - escala de la llama (1 = vela de candelabro).
   * @returns {string}
   */
  function llamaEn(x, mechaY, k = 1) {
    const h  = 20 * k;               // alto de la llama
    const w  = 5.6 * k;              // medio ancho en la base
    const tip = mechaY - h;          // punta
    const midY = mechaY - h * 0.5;
    return `
      <g class="llama">
        <ellipse cx="${x}" cy="${mechaY - 2 * k}" rx="${3.4 * k}" ry="${2.4 * k}" fill="#7fb2ff" opacity=".42"/>
        <path d="M${x} ${mechaY}
                 C ${x - w} ${midY}, ${x - w * 0.75} ${tip + h * 0.28}, ${x} ${tip}
                 C ${x + w * 0.75} ${tip + h * 0.28}, ${x + w} ${midY}, ${x} ${mechaY} Z"
              fill="url(#apl-llama)"/>
        <path d="M${x} ${mechaY - 3 * k}
                 C ${x - w * 0.5} ${midY}, ${x - w * 0.42} ${tip + h * 0.34}, ${x} ${tip + h * 0.12}
                 C ${x + w * 0.42} ${tip + h * 0.34}, ${x + w * 0.5} ${midY}, ${x} ${mechaY - 3 * k} Z"
              fill="#ffdf8f" opacity=".92"/>
        <path d="M${x} ${mechaY - 5 * k}
                 C ${x - w * 0.26} ${midY}, ${x - w * 0.22} ${tip + h * 0.42}, ${x} ${tip + h * 0.24}
                 C ${x + w * 0.22} ${tip + h * 0.42}, ${x + w * 0.26} ${midY}, ${x} ${mechaY - 5 * k} Z"
              fill="#fff8dc" opacity=".95"/>
      </g>`;
  }

  /**
   * Una vela de candelabro con su arandela (platillo), casquillo, cuerpo de
   * cera con goterones y su llama. Apoyada en (bx, by).
   * @param {number} bx
   * @param {number} by
   * @returns {string}
   */
  function velaEn(bx, by) {
    return `
      <!-- arandela / platillo: canto frontal iluminado + sombra debajo -->
      <ellipse cx="${bx}" cy="${by + 2.4}" rx="12.5" ry="3.4" fill="url(#apl-sombra)" opacity=".7"/>
      <ellipse cx="${bx}" cy="${by}" rx="12" ry="3.8" fill="url(#apl-laton)"/>
      <ellipse cx="${bx}" cy="${by - 1.4}" rx="8.6" ry="2.1" fill="#fbeec0" opacity=".5"/>
      <!-- un goterón de cera colgando del borde del platillo -->
      <path d="M${bx - 8} ${by - 0.5} q -1 5, .6 8" fill="none" stroke="#e9dcbe"
            stroke-width="1.7" stroke-linecap="round" opacity=".7"/>
      <!-- casquillo -->
      <path d="M${bx - 5.2} ${by - 1} L${bx - 4.2} ${by - 8} L${bx + 4.2} ${by - 8} L${bx + 5.2} ${by - 1} Z"
            fill="url(#apl-laton)"/>
      <!-- cuerpo de cera + lado iluminado -->
      <rect x="${bx - 4.6}" y="${by - 34}" width="9.2" height="27" rx="2.6" fill="url(#apl-cera)"/>
      <rect x="${bx - 4.6}" y="${by - 34}" width="2.8" height="27" rx="1.4" fill="#fffaf0" opacity=".55"/>
      <!-- el tope se traluce con el calor de la llama -->
      <rect x="${bx - 4.6}" y="${by - 34}" width="9.2" height="10" rx="2.6" fill="url(#apl-cera-calor)"/>
      <!-- goterones por el costado -->
      <path d="M${bx + 3.6} ${by - 24} q 2.4 6, .4 11" fill="none" stroke="#e6d9bb"
            stroke-width="1.6" stroke-linecap="round" opacity=".75"/>
      <path d="M${bx - 3.8} ${by - 18} q -2 5, -.3 9" fill="none" stroke="#ddceac"
            stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
      <!-- mecha -->
      <path d="M${bx} ${by - 34} v -4" stroke="#3a2a1a" stroke-width="1.5" stroke-linecap="round"/>
      ${llamaEn(bx, by - 38, 1)}`;
  }

  /* Medidas del lienzo del candelabro de pared. */
  const PARED_VB_W = 200;
  const PARED_VB_H = 240;
  const PARED_LLAMAS = [
    { x: 150, y: 120 - 40 },
    { x: 112, y:  64 - 40 },
    { x: 112, y: 176 - 40 },
  ];

  /* El candelabro de pared: placa de montaje + 3 brazos de voluta. */
  const svgCandelabro =
    `<svg class="aplique-svg" viewBox="0 0 ${PARED_VB_W} ${PARED_VB_H}" width="100%" aria-hidden="true">
      <!-- sombra proyectada de la placa sobre el muro (despega la pieza) -->
      <ellipse cx="30" cy="122" rx="26" ry="74" fill="url(#apl-sombra)" opacity=".5"/>

      <!-- brazos como TUBO: trazo oscuro de base + trazo de latón encima
           (más fino, corrido 1,5px arriba) + hilo de realce = cilindro -->
      <g fill="none" stroke-linecap="round">
        <g stroke="#4a3518" stroke-width="7.5">
          <path d="M36 121.5 C 80 139.5, 120 139.5, 150 121.5"/>
          <path d="M34 112.5 C 62 93.5, 90 73.5, 112 65.5"/>
          <path d="M34 130.5 C 62 149.5, 90 169.5, 112 177.5"/>
        </g>
        <g stroke="url(#apl-brazo)" stroke-width="6">
          <path d="M36 120 C 80 138, 120 138, 150 120"/>
          <path d="M34 111 C 62 92, 90 72, 112 64"/>
          <path d="M34 129 C 62 148, 90 168, 112 176"/>
        </g>
        <g stroke="#f6e8b4" stroke-width="1.4" opacity=".55">
          <path d="M40 118.6 C 80 135, 118 135, 148 118.6"/>
          <path d="M37 110 C 63 91.5, 90 72, 110 64.6"/>
          <path d="M37 130 C 63 147.5, 90 167, 110 175.4"/>
        </g>
      </g>

      <!-- volutas de adorno en los arranques -->
      <g fill="none" stroke="url(#apl-brazo)" stroke-width="3" stroke-linecap="round" opacity=".9">
        <path d="M60 131 c 9 7, 9 -9, 0 -7"/>
        <path d="M60 99  c 9 -7, 9 9, 0 7"/>
      </g>
      <!-- cuentas en las junturas -->
      <g fill="url(#apl-laton)">
        <circle cx="36" cy="120" r="3.4"/>
        <circle cx="150" cy="120" r="3"/>
        <circle cx="112" cy="64" r="3"/>
        <circle cx="112" cy="176" r="3"/>
      </g>

      <!-- placa de montaje: cuerpo con degradado -->
      <path d="M22 68 C 37 80, 37 160, 22 172 C 7 160, 7 80, 22 68 Z" fill="url(#apl-laton)"/>
      <!-- filigrana grabada (líneas oscuras finas) -->
      <g fill="none" stroke="#3a2c14" stroke-width="1" stroke-linecap="round" opacity=".35">
        <path d="M22 84 C 30 100, 30 140, 22 156 C 14 140, 14 100, 22 84"/>
        <path d="M22 96 c 6 4, 6 -8, 0 -6 c -6 -2, -6 10, 0 6"/>
        <path d="M22 144 c 6 4, 6 -8, 0 -6 c -6 -2, -6 10, 0 6"/>
      </g>
      <!-- realce claro del canto izquierdo + borde perlado -->
      <path d="M19 78 C 27 88, 27 152, 19 162 C 14 152, 14 88, 19 78 Z" fill="#f6e6b0" opacity=".28"/>
      <path d="M22 70 C 35 82, 35 158, 22 170" fill="none" stroke="#fbeec0"
            stroke-width="1.2" stroke-dasharray="0.1 6" stroke-linecap="round" opacity=".55"/>
      <!-- remates -->
      <circle cx="22" cy="57" r="5.2" fill="url(#apl-laton)"/>
      <path d="M22 180 l 5.6 13 l -5.6 6.5 l -5.6 -6.5 Z" fill="url(#apl-laton)"/>
      <!-- boss central con cabujón rojo -->
      <circle cx="31" cy="122" r="9.8" fill="url(#apl-sombra)" opacity=".5"/>
      <circle cx="31" cy="120" r="9.5" fill="url(#apl-laton)"/>
      <circle cx="31" cy="120" r="4" fill="#8d1f31"/>
      <circle cx="29.4" cy="118.4" r="1.3" fill="#e07f90" opacity=".65"/>

      <!-- las tres velas -->
      ${velaEn(150, 120)}
      ${velaEn(112, 64)}
      ${velaEn(112, 176)}
    </svg>`;


  /* ─── CIRIOS DE PISO ────────────────────────────────────────────────────
     Un cúmulo sobrio de cirios derretidos, a distinta altura, apoyados en el
     "piso" (la base de la sección). Pocos: mansión antigua, no fiesta. */
  const PISO_VB_W = 240;
  const PISO_VB_H = 210;
  const PISO_SUELO = 196;                 // línea del piso en el viewBox
  /* ⚠️ EN EL MISMO ORDEN en que se dibujan los cirios abajo (svgCirios), para
     que cada fuego se enlace con su llama por índice. */
  const PISO_LLAMAS = [
    { x: 160, y: 76  - 6 },
    { x: 66,  y: 46  - 6 },
    { x: 120, y: 100 - 6 },
    { x: 100, y: 136 - 6 },
  ];

  /**
   * Un cirio de piso derretido: base de cera escurrida + cuerpo + goterones
   * + mecha + llama. Apoyado en el suelo del viewBox.
   * @param {number} cx  - x del cirio.
   * @param {number} topY - y del tope (donde nace la llama).
   * @param {number} w   - medio ancho del cuerpo.
   * @returns {string}
   */
  function cirioEn(cx, topY, w) {
    const suelo = PISO_SUELO;
    return `
      <!-- charco de cera escurrida en el piso -->
      <ellipse cx="${cx}" cy="${suelo + 2}" rx="${w + 7}" ry="5" fill="url(#apl-sombra)" opacity=".55"/>
      <ellipse cx="${cx}" cy="${suelo}" rx="${w + 6}" ry="4.2" fill="url(#apl-cera)"/>
      <!-- cuerpo del cirio -->
      <path d="M${cx - w} ${suelo}
               C ${cx - w - 2} ${topY + 10}, ${cx - w + 1} ${topY + 3}, ${cx - w + 1.5} ${topY}
               L ${cx + w - 1.5} ${topY}
               C ${cx + w - 1} ${topY + 3}, ${cx + w + 2} ${topY + 10}, ${cx + w} ${suelo} Z"
            fill="url(#apl-cera)"/>
      <!-- lado iluminado -->
      <rect x="${cx - w}" y="${topY}" width="${w * 0.55}" height="${suelo - topY}" rx="2" fill="#fffaf0" opacity=".4"/>
      <!-- tope traslúcido por el calor -->
      <ellipse cx="${cx}" cy="${topY + 2}" rx="${w}" ry="3.4" fill="#efe2c4"/>
      <ellipse cx="${cx}" cy="${topY}" rx="${w}" ry="7" fill="url(#apl-cera-calor)"/>
      <!-- goterones -->
      <path d="M${cx + w - 1} ${topY + 12} q 2.5 ${(suelo - topY) * 0.4}, .5 ${(suelo - topY) * 0.7}"
            fill="none" stroke="#e6d9bb" stroke-width="1.7" stroke-linecap="round" opacity=".7"/>
      <path d="M${cx - w + 1.5} ${topY + 20} q -2.5 ${(suelo - topY) * 0.3}, -.4 ${(suelo - topY) * 0.55}"
            fill="none" stroke="#ddceac" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
      <!-- mecha -->
      <path d="M${cx} ${topY} v -4" stroke="#3a2a1a" stroke-width="1.5" stroke-linecap="round"/>
      ${llamaEn(cx, topY - 4, 1.05)}`;
  }

  const svgCirios =
    `<svg class="aplique-svg" viewBox="0 0 ${PISO_VB_W} ${PISO_VB_H}" width="100%" aria-hidden="true">
      <!-- sombra del cúmulo sobre el piso -->
      <ellipse cx="115" cy="${PISO_SUELO + 4}" rx="96" ry="9" fill="url(#apl-sombra)" opacity=".45"/>
      <!-- de atrás hacia adelante, para que se solapen con orden -->
      ${cirioEn(160, 76, 11)}
      ${cirioEn(66,  46, 15)}
      ${cirioEn(120, 100, 13)}
      ${cirioEn(100, 136, 10)}
      <!-- un tocón derretido sin llama, para poblar sin recargar -->
      <path d="M186 ${PISO_SUELO} C 184 178, 190 172, 196 172 C 202 172, 208 178, 206 ${PISO_SUELO} Z"
            fill="url(#apl-cera)" opacity=".9"/>
      <ellipse cx="196" cy="172" rx="10" ry="3" fill="#efe2c4" opacity=".9"/>`;
  // (el SVG de cirios se cierra abajo, al insertarlo, con </svg>)


  /* ─── 2. DÓNDE VA CADA PIEZA ────────────────────────────────────────────
     Candelabros de pared flanqueando las secciones oscuras; un cúmulo de
     cirios de piso a cada lado de la sección más honda (la confirmación). */
  const ANCLAS = [
    { seccion: '#regalos',      lado: 'izq', tipo: 'pared' },
    { seccion: '#regalos',      lado: 'der', tipo: 'pared' },
    { seccion: '#ubicacion',    lado: 'izq', tipo: 'pared' },   // el MAPA, a ambos lados
    { seccion: '#ubicacion',    lado: 'der', tipo: 'pared' },
    { seccion: '#confirmacion', lado: 'izq', tipo: 'pared' },
    { seccion: '#confirmacion', lado: 'der', tipo: 'pared' },
    /* Los cirios de piso van HASTA ABAJO: su base se apoya en la línea del
       marco (la cenefa inferior), no en el borde de una sección. Se anclan al
       pie solo para que el ResizeObserver los reubique al cambiar el alto. */
    { seccion: '#pie-de-pagina', lado: 'izq', tipo: 'piso' },
    { seccion: '#pie-de-pagina', lado: 'der', tipo: 'piso' },
  ];

  /** Descriptor de cada tipo de pieza: su dibujo, su viewBox y sus llamas. */
  const TIPOS = {
    pared: { svg: svgCandelabro,          vbW: PARED_VB_W, vbH: PARED_VB_H, llamas: PARED_LLAMAS, factor: 1,    apoyo: 'centro' },
    piso:  { svg: svgCirios + '</svg>',   vbW: PISO_VB_W,  vbH: PISO_VB_H,  llamas: PISO_LLAMAS,  factor: 0.72, apoyo: 'piso' },
  };

  /**
   * Ancho útil de la página, SIN la barra de desplazamiento (window.innerWidth
   * SÍ la incluye y dejaba los del lado derecho corridos ~10 px).
   * @returns {number}
   */
  function anchoUtil() {
    return capaApliques.clientWidth || document.documentElement.clientWidth;
  }

  /**
   * Ancho base del candelabro de pared en px (adaptativo, ~2×). En pantallas
   * chicas se achica: ahí una pieza grande se comería el centro.
   * @returns {number}
   */
  function anchoBase() {
    const w = anchoUtil();
    if (w < 700) return limitar(w * 0.28, 84, 150);
    return limitar(w * 0.235, 240, 440);
  }

  capaApliques.insertAdjacentHTML('beforeend', defsCompartidos);

  /** @type {Array} */
  const piezas = ANCLAS.map(a => {
    const seccion = buscar(a.seccion);
    if (!seccion) return null;
    const t = TIPOS[a.tipo];

    const cont = document.createElement('div');
    cont.className = 'aplique aplique--' + a.tipo;
    cont.innerHTML = t.svg;
    capaApliques.appendChild(cont);

    /* Cada .llama del dibujo se enlaza por índice con su fuego (por eso las
       listas de llamas están en el mismo orden en que se dibujan). */
    const llamaNodes = Array.from(cont.querySelectorAll('.llama'));

    /* Por cada llama, sus DOS resplandores (núcleo + derrame). Viven en la
       capa de luz (sobre el velo), pero se ubican por cálculo desde este
       mismo contenedor, así que nunca se despegan de su llama. */
    const fuegos = t.llamas.map((punto, i) => {
      const nucleo = document.createElement('div');
      nucleo.className = 'vela vela--nucleo';
      const derrame = document.createElement('div');
      derrame.className = 'vela vela--derrame';
      capaLuz.appendChild(derrame);   // el derrame va debajo del núcleo
      capaLuz.appendChild(nucleo);

      const base = 0.62 + Math.random() * 0.22;
      nucleo.style.opacity  = base.toFixed(3);
      derrame.style.opacity = (base * 0.85).toFixed(3);

      return {
        llama: llamaNodes[i] || llamaNodes[0],
        nucleo, derrame, base, puntoSvg: punto,
        nivel: 1, objetivo: 1, proximoSorteo: 0,
        fase: Math.random() * 1000,
        cy: 0,
        atenua: 1,        // tope por cercanía a la caja de texto (1 = sin tope)
        detras: false,    // true = derrame reubicado en #apliques (bajo el velo)
      };
    });

    return { cont, lado: a.lado, tipo: a.tipo, seccion, fuegos, t, caja: null };
  }).filter(Boolean);


  /* ─── 3. UBICAR PIEZA Y RESPLANDORES (POR CÁLCULO) ─────────────────────
     Se coloca la pieza y, con la MISMA cuenta, cada resplandor. Y se mide
     cuánto invade el derrame la caja de texto de su sección para NO
     encandilar la lectura (atenuar + mandar detrás si está muy encima). */

  /** La caja de texto que hay que proteger dentro de una sección. */
  function cajaDeTexto(seccion) {
    return seccion.querySelector('.marco-ornamental, .mapa-marco');
  }

  /**
   * Y (en coordenadas del documento) de la "línea del piso": la cenefa
   * inferior del marco. Los cirios apoyan su base ahí, o un pelín más abajo
   * (metidos ~un tercio en la cenefa), para que se lean "apoyados en el piso"
   * del salón. Si no está la cenefa, se cae al fondo del documento menos el
   * grosor del marco.
   * @returns {number}
   */
  function lineaDelPiso() {
    const cenefa = buscar('.marco__cenefa--inferior');
    if (cenefa) {
      const r = cenefa.getBoundingClientRect();
      return r.top + window.scrollY + r.height * 0.35;
    }
    const grosor = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--marco-grosor')
    ) || 60;
    return document.documentElement.scrollHeight - grosor * 0.65;
  }

  function acomodarTodo() {
    const anchoRef = anchoBase();

    for (const c of piezas) {
      const t = c.t;
      const ancho  = anchoRef * t.factor;
      const alto   = ancho * (t.vbH / t.vbW);
      const escala = ancho / t.vbW;

      const caja = c.seccion.getBoundingClientRect();
      const topSeccion = caja.top + window.scrollY;
      const topPieza = (t.apoyo === 'piso')
        ? lineaDelPiso() - alto                       // base en la línea del marco
        : topSeccion + caja.height / 2 - alto / 2;    // centrado en la pared

      c.cont.style.width = ancho + 'px';
      c.cont.style.top   = topPieza + 'px';
      if (c.lado === 'izq') {
        c.cont.style.left = '0';
        c.cont.style.right = '';
        c.cont.style.transform = '';
      } else {
        c.cont.style.right = '0';
        c.cont.style.left = '';
        c.cont.style.transform = 'scaleX(-1)';
      }

      /* Borde izquierdo del contenedor en coordenadas del documento (lado
         derecho: ancho ÚTIL, sin barra de desplazamiento). */
      const izquierdaPieza = (c.lado === 'izq') ? 0 : (anchoUtil() - ancho);

      /* Rect de la caja de texto de esta sección (en coordenadas del
         documento) para medir el solape con cada derrame. */
      const elCaja = cajaDeTexto(c.seccion);
      let bx0, bx1, by0, by1, hayCaja = false;
      if (elCaja) {
        const rb = elCaja.getBoundingClientRect();
        bx0 = rb.left  + window.scrollX; bx1 = rb.right  + window.scrollX;
        by0 = rb.top   + window.scrollY; by1 = rb.bottom + window.scrollY;
        hayCaja = true;
      }

      const tamNucleo  = ancho * 0.85;
      const tamDerrameMax = ancho * 2.2;
      const radioMax = tamDerrameMax / 2;

      for (const fuego of c.fuegos) {
        const xLocal = (c.lado === 'izq')
          ? fuego.puntoSvg.x * escala
          : (t.vbW - fuego.puntoSvg.x) * escala;
        const cx = izquierdaPieza + xLocal;
        const cy = topPieza + fuego.puntoSvg.y * escala;
        fuego.cy = cy;

        /* ── Cuánto invade el derrame la caja de texto ──
           d = distancia del centro del brillo al rectángulo de la caja
           (0 si el centro cae dentro). solape = cuánto entra el radio. */
        let atenua = 1, detras = false;
        if (hayCaja) {
          const ddx = (cx < bx0) ? bx0 - cx : (cx > bx1 ? cx - bx1 : 0);
          const ddy = (cy < by0) ? by0 - cy : (cy > by1 ? cy - by1 : 0);
          const d = Math.hypot(ddx, ddy);
          const solape = radioMax - d;
          if (solape > 0) {
            const ratio = Math.min(solape / radioMax, 1);   // 0..1
            atenua = limitar(1 - ratio * 1.15, 0.12, 1);
            // muy encima: el centro casi toca la caja, o la invade de lleno
            if (d <= radioMax * 0.4 || ratio > 0.6) detras = true;
          }
        }
        fuego.atenua = atenua;

        /* Núcleo: siempre en la capa de luz, sobre la llama (no se atenúa). */
        fuego.nucleo.style.width  = tamNucleo + 'px';
        fuego.nucleo.style.height = tamNucleo + 'px';
        fuego.nucleo.style.left   = (cx - tamNucleo / 2) + 'px';
        fuego.nucleo.style.top    = (cy - tamNucleo / 2) + 'px';

        /* Derrame: se encoge un poco al acercarse a la caja, y si queda muy
           encima se muda a #apliques (bajo el velo) para no lavar el texto. */
        const tamDerrame = tamDerrameMax * (0.62 + 0.38 * atenua);
        fuego.derrame.style.width  = tamDerrame + 'px';
        fuego.derrame.style.height = tamDerrame + 'px';
        fuego.derrame.style.left   = (cx - tamDerrame / 2) + 'px';
        fuego.derrame.style.top    = (cy - tamDerrame / 2) + 'px';
        fuego.derrame.style.opacity = (fuego.base * 0.85 * atenua).toFixed(3);

        if (detras !== fuego.detras) {
          fuego.detras = detras;
          const capaObjetivo = detras ? capaApliques : capaLuz;
          if (fuego.derrame.parentNode !== capaObjetivo) capaObjetivo.appendChild(fuego.derrame);
          fuego.derrame.classList.toggle('vela--detras', detras);
        }
      }
    }
  }
  acomodarTodo();

  /* Rehacer si cambia el tamaño de la ventana (con un respiro). */
  let temporizador = null;
  function acomodarConRespiro() {
    clearTimeout(temporizador);
    temporizador = setTimeout(acomodarTodo, 200);
  }
  window.addEventListener('resize', acomodarConRespiro);
  window.addEventListener('load', acomodarTodo);

  /* ⚠️ EL CASO QUE FALLABA: el iframe del mapa carga TARDE y mueve todo lo
     que hay debajo. Un ResizeObserver sobre las secciones ancla reubica en
     cuanto eso pasa, así la luz nunca queda corrida respecto de su llama. */
  if ('ResizeObserver' in window) {
    const observador = new ResizeObserver(acomodarConRespiro);
    const vistas = new Set();
    for (const c of piezas) {
      if (!vistas.has(c.seccion)) { observador.observe(c.seccion); vistas.add(c.seccion); }
    }
  }


  /* ─── 4. EL TITILEO ────────────────────────────────────────────────────
     Las velas quedan ENCENDIDAS siempre. Este bucle solo agrega el titileo.
     Si las animaciones están apagadas, queda en reposo (prendidas, quietas).
     ⚡ RENDIMIENTO: se recalcula cada ~45 ms (~22 fps) y solo las velas
     cercanas a la pantalla. El derrame respeta su tope de atenuación. */
  const CADA_CUANTO = 45;
  let ultimoCalculo = 0;

  function dibujarCuadro(t) {
    if (document.hidden || prefiereMenosMovimiento()) {
      requestAnimationFrame(dibujarCuadro);
      return;
    }
    if (t - ultimoCalculo < CADA_CUANTO) { requestAnimationFrame(dibujarCuadro); return; }
    ultimoCalculo = t;

    const arriba = window.scrollY - window.innerHeight * 0.4;
    const abajo  = window.scrollY + window.innerHeight * 1.4;

    for (const c of piezas) {
      for (const fuego of c.fuegos) {
        if (fuego.cy < arriba || fuego.cy > abajo) continue;

        if (t > fuego.proximoSorteo) {
          fuego.objetivo = 0.68 + Math.random() * 0.32;
          if (Math.random() < 0.1) fuego.objetivo *= 0.62;
          fuego.proximoSorteo = t + 110 + Math.random() * 220;
        }
        fuego.nivel += (fuego.objetivo - fuego.nivel) * 0.16;
        const temblor = 1 + Math.sin(t / 60 + fuego.fase) * 0.05;
        const brillo = fuego.nivel * temblor;

        // La llama del SVG crece y encoge desde la mecha (cada una con SU brillo).
        if (fuego.llama) {
          fuego.llama.style.opacity = (0.75 + brillo * 0.25).toFixed(3);
          fuego.llama.style.transform =
            `scaleY(${(0.92 + brillo * 0.13).toFixed(3)}) scaleX(${(0.98 + brillo * 0.04).toFixed(3)})`;
        }

        /* Los resplandores laten con el mismo valor; el derrame además
           respeta su tope por cercanía a la caja (fuego.atenua). Solo se
           anima la OPACIDAD (nunca la escala de una capa grande). */
        fuego.nucleo.style.opacity  = (fuego.base * brillo).toFixed(3);
        fuego.derrame.style.opacity = (fuego.base * brillo * 0.85 * fuego.atenua).toFixed(3);
      }
    }
    requestAnimationFrame(dibujarCuadro);
  }
  requestAnimationFrame(dibujarCuadro);

})();
