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

  // Interruptor de diagnóstico: ver apagadoParaMedir() en 02-utilidades.js.
  if (apagadoParaMedir('velas')) return;


  const capaApliques = buscar('#apliques');
  const capaLuz      = buscar('#luz-de-velas');
  if (!capaApliques || !capaLuz) return;

  /* Todo se dibuja SIEMPRE y queda ENCENDIDO, aun con las animaciones
     apagadas: es la fuente de luz de la profundidad. Lo único que se apaga
     en modo "sin animación" es el TITILEO (ver el guard del bucle). */


  /* ─── 0. EL LIENZO DE LAS VELAS, EN COORDENADAS DE DOCUMENTO (Etapa B,
     2026-08-31) ─────────────────────────────────────────────────────────
     Hasta acá, las velas dejaban de entregarle sus fuegos al lienzo de
     23-lienzo-de-luz.js (2026-08-20) para que el resplandor se moviera con
     el mismo scroll nativo que la llama, sin ningún paso de JavaScript de
     por medio — sino, la luz se atrasaba de la llama en scroll rápido. La
     única forma de tener ESO y además evitar las 8 capas `mix-blend-mode:
     screen` de siempre (medidas en el 31 % del perfil, "Layerize") es un
     canvas que TAMPOCO necesite JavaScript para seguir el scroll: uno en
     `position: absolute`, en coordenadas de DOCUMENTO, igual que la llama.
     Al no ser `fixed`, lo mueve el compositor nativo junto con la página —
     cero diferencia posible, por construcción, no por reaccionar rápido.

     Este es un canvas PROPIO de este archivo, separado del de
     23-lienzo-de-luz.js (que sigue igual: fijo, con haces/motas/fauna). No
     se tocan sus sellos, se PRESTAN (window.LienzoDeLuz.sellos) — son
     bitmaps ya rasterizados, no hace falta un segundo degradado.

     Si por algún motivo esos sellos no llegaron a existir (por ejemplo,
     con ?luz=dom, que apaga 23-lienzo-de-luz.js entero), este canvas
     tampoco se crea y usaElLienzoAhora() vuelve a dar false: quedan los
     104 divs de siempre, el camino de reserva de toda la vida. */
  let lienzoDeVelas = null, pincelDeVelas = null;
  let anchoLienzoVelas = 0, altoLienzoVelas = 0, densidadLienzoVelas = 1;

  /** Dónde empieza el lienzo dentro del documento, en píxeles CSS. Ver la
   *  nota grande de ajustarLienzoDeVelas(). */
  let topLienzoVelas = 0;

  /** La franja del documento que de verdad ocupan las luces, o null si
   *  todavía no se colocó ninguna pieza. La calcula medirLaFranjaDeLuces()
   *  DESPUÉS de acomodar, y se guarda acá — y no se lee `piezas` directo
   *  desde ajustarLienzoDeVelas()— porque esa función corre al evaluar el
   *  archivo, cuando `piezas` (declarado más abajo) todavía no existe. */
  let franjaDeLuces = null;

  /** Se enciende cuando ya hay piezas colocadas. Sirve para saber si es
   *  seguro leer `piezas` (que se declara más abajo en el archivo). */
  let hayPiezasColocadas = false;

  // Mismos valores que FACTOR_POR_CALIDAD en 23-lienzo-de-luz.js — ese
  // archivo no los expone, así que se repiten acá. Si se cambia uno, hay
  // que cambiar el otro: la luz de las velas y la de haces/motas deben
  // verse igual de nítidas entre sí.
  const FACTOR_DE_DENSIDAD_POR_CALIDAD = { 0: 0.75, 1: 0.6, 2: 0.5 };
  const MAXIMA_DENSIDAD_DE_VELAS = 1;

  /**
   * Ajusta el tamaño del lienzo de velas al ancho de su contenedor y al
   * alto real del documento (no de la ventana: este canvas scrollea con
   * la página, tiene que cubrirla entera).
   * @returns {void}
   */
  function ajustarLienzoDeVelas() {
    if (!lienzoDeVelas) return;
    const factor = FACTOR_DE_DENSIDAD_POR_CALIDAD[nivelDeCalidad()] ?? 1;
    densidadLienzoVelas = Math.min(window.devicePixelRatio || 1, MAXIMA_DENSIDAD_DE_VELAS) * factor;

    anchoLienzoVelas = capaLuz.clientWidth || window.innerWidth;
    const altoDelDocumento = capaLuz.offsetHeight || document.documentElement.scrollHeight;

    /* ⚡ SOLO LA FRANJA DONDE HAY LUCES, NO EL DOCUMENTO ENTERO
       (2026-09-02).

       Este lienzo cubría el documento completo: 2466 × 5629 = casi 14
       millones de píxeles, la capa más grande de la página por lejos. Pero
       los candelabros solo viven en la mitad de abajo — sus anclajes (ver
       ANCLAS) son #regalos, #ubicacion, #confirmacion y el pie. En la
       portada y las primeras secciones no hay ni una vela, y esa mitad
       vacía igual se reservaba, se subía a la GPU y se recomponía.

       El tamaño era colateral, no un requisito: lo que hacía falta era
       vivir en COORDENADAS DE DOCUMENTO, para que el scroll lo mueva el
       compositor sin que ningún script lo sincronice (esa fue la solución
       al desfase de la luz respecto de la llama). Esa propiedad se conserva
       intacta: el lienzo sigue siendo `absolute` en el documento, solo que
       ahora empieza donde empieza la primera luz.

       El desplazamiento se compensa en el dibujo con setTransform (ver
       dibujarCuadro), así que todo el resto del archivo sigue trabajando en
       coordenadas de documento, sin enterarse. */
    /* Se remide en cada ajuste: un resize puede haber movido las secciones
       y con ellas las velas, y una franja vieja dejaría el resplandor
       cortado. Solo cuando ya hay piezas — antes de eso, `piezas` ni
       siquiera existe todavía. */
    if (hayPiezasColocadas) medirLaFranjaDeLuces();

    if (franjaDeLuces) {
      const MARGEN = 48;   // aire para que el resplandor no quede cortado
      topLienzoVelas  = Math.max(0, Math.floor(franjaDeLuces.arriba - MARGEN));
      const abajo     = Math.min(altoDelDocumento, Math.ceil(franjaDeLuces.abajo + MARGEN));
      altoLienzoVelas = Math.max(1, abajo - topLienzoVelas);
    } else {
      // Todavía no se colocó ninguna pieza: se cubre todo, como antes.
      topLienzoVelas  = 0;
      altoLienzoVelas = altoDelDocumento;
    }

    lienzoDeVelas.width  = Math.max(1, Math.round(anchoLienzoVelas * densidadLienzoVelas));
    lienzoDeVelas.height = Math.max(1, Math.round(altoLienzoVelas  * densidadLienzoVelas));
    lienzoDeVelas.style.width  = anchoLienzoVelas + 'px';
    lienzoDeVelas.style.height = altoLienzoVelas  + 'px';
    lienzoDeVelas.style.top    = topLienzoVelas   + 'px';

    /* Para el cartel de ?fps=1: sin este dato no hay forma de confirmar que
       el recorte de la franja hizo lo que dice que hace. */
    window.EstadoDelLienzoDeVelas = {
      ancho: anchoLienzoVelas,
      alto:  altoLienzoVelas,
      top:   topLienzoVelas,
    };
  }

  /**
   * Mide la franja del documento que ocupan todas las luces, con su radio
   * de resplandor incluido. Se llama DESPUÉS de colocar las piezas, que es
   * cuando fuego.cy y fuego.radioDerrame tienen su valor real.
   * @returns {void}
   */
  function medirLaFranjaDeLuces() {
    let arriba = Infinity;
    let abajo  = -Infinity;

    for (const pieza of piezas) {
      for (const fuego of pieza.fuegos) {
        if (typeof fuego.cy !== 'number') continue;
        const radio = fuego.radioDerrame || fuego.radioNucleo || 0;
        if (fuego.cy - radio < arriba) arriba = fuego.cy - radio;
        if (fuego.cy + radio > abajo)  abajo  = fuego.cy + radio;
      }
    }

    franjaDeLuces = (arriba < abajo) ? { arriba, abajo } : null;
  }

  /**
   * Crea el canvas de velas, si hay sellos prestados de
   * 23-lienzo-de-luz.js. Se llama una sola vez, al evaluar este archivo.
   * @returns {void}
   */
  function crearLienzoDeVelas() {
    if (!(window.LienzoDeLuz && window.LienzoDeLuz.sellos)) return;

    const lienzo = document.createElement('canvas');
    lienzo.id = 'lienzo-de-velas';
    lienzo.setAttribute('aria-hidden', 'true');
    const pincel = lienzo.getContext('2d', { alpha: true });
    if (!pincel) return;

    capaLuz.appendChild(lienzo);
    lienzoDeVelas = lienzo;
    pincelDeVelas = pincel;
    ajustarLienzoDeVelas();

    window.addEventListener('resize', alCambiarElAncho(rebotar(ajustarLienzoDeVelas, 200)));
    document.addEventListener('calidad-cambio', () => setTimeout(ajustarLienzoDeVelas, 50));
  }
  crearLienzoDeVelas();


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
  /* ── CUÁNTOS CIRIOS, SEGÚN LA PANTALLA ──
     Eran cuatro fijos. En un monitor ultrapanorámico ese puñadito quedaba
     perdido en la esquina; en un celular, cuatro ya llenaban. Ahora la
     cantidad se ata al ancho de la ventana y el cúmulo se lee siempre con
     el mismo peso visual.

     El lienzo los dibuja a todos con un solo `drawImage` por resplandor, así
     que duplicarlos no duplica el costo de compositing: son más estampas
     sobre el MISMO canvas, no más capas. */
  /* ⚠️ TOPE BAJO, Y APRENDIDO A GOLPES. Se pidió "el doble" de cuatro y yo
     puse hasta quince: el medidor pasó de 52 velas a 96, y cada vela son dos
     resplandores que el lienzo estampa en cada repintado. Duplicar está
     bien; cuadruplicar hunde el rendimiento en un equipo con gráfica
     integrada. Ocho es el doble de cuatro. */
  const CUANTOS_CIRIOS = (() => {
    const ancho = window.innerWidth;
    if (ancho < 700)  return 5;
    if (ancho < 1500) return 7;
    return 8;
  })();

  /* El lienzo se ensancha con la cantidad, para que los cirios no se
     apelotonen: ~30 unidades de viewBox por cirio más un margen. */
  const PISO_VB_W = 110 + CUANTOS_CIRIOS * 30;
  const PISO_VB_H = 210;
  const PISO_SUELO = 196;                 // línea del piso en el viewBox

  /* ── EL CÚMULO, GENERADO ──
     Antes las cuatro posiciones estaban escritas a mano y había que
     mantener a la par la lista de llamas: cualquier cambio en una y no en
     la otra desenlazaba los fuegos de sus mechas. Ahora salen de la misma
     fuente, así que no pueden desincronizarse.

     Con semilla fija: el cúmulo es siempre el mismo dibujo, no cambia entre
     recargas. */
  const CIRIOS = (() => {
    const azar = crearAzarConSemilla(4242);
    const lista = [];
    const paso = (PISO_VB_W - 70) / Math.max(1, CUANTOS_CIRIOS - 1);

    for (let i = 0; i < CUANTOS_CIRIOS; i++) {
      lista.push({
        x: 35 + i * paso + azar.entre(-10, 10),
        /* Alturas muy dispares: un cúmulo de cirios consumidos de forma
           pareja parece de fábrica. Los hay recién puestos y casi extintos. */
        topY: azar.entre(38, 150),
        w: azar.entre(8.5, 16),
      });
    }

    /* De atrás hacia adelante: los más altos se dibujan primero para que los
       de delante los tapen y el cúmulo tenga profundidad. */
    lista.sort((a, b) => a.topY - b.topY);
    return lista;
  })();

  /** Las llamas, derivadas del MISMO cúmulo: enlace por índice garantizado. */
  const PISO_LLAMAS = CIRIOS.map(c => ({ x: c.x, y: c.topY - 6 }));

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

  /* Un par de tocones derretidos SIN llama, repartidos entre los cirios
     encendidos. Son los que ya se consumieron: pueblan el cúmulo y cuentan
     que esto lleva años encendiéndose, sin sumar un fuego más que animar. */
  function toconEn(cx, altura) {
    const cima = PISO_SUELO - altura;
    return `
      <path d="M${cx - 10} ${PISO_SUELO} C ${cx - 12} ${cima + 6}, ${cx - 6} ${cima}, ${cx} ${cima}
               C ${cx + 6} ${cima}, ${cx + 12} ${cima + 6}, ${cx + 10} ${PISO_SUELO} Z"
            fill="url(#apl-cera)" opacity=".9"/>
      <ellipse cx="${cx}" cy="${cima}" rx="10" ry="3" fill="#efe2c4" opacity=".9"/>`;
  }

  const svgCirios =
    `<svg class="aplique-svg" viewBox="0 0 ${PISO_VB_W} ${PISO_VB_H}" width="100%" aria-hidden="true">
      <!-- sombra del cúmulo sobre el piso, del ancho que le toque -->
      <ellipse cx="${PISO_VB_W / 2}" cy="${PISO_SUELO + 4}"
               rx="${PISO_VB_W * 0.42}" ry="9" fill="url(#apl-sombra)" opacity=".45"/>
      <!-- los cirios, ya ordenados de atrás hacia adelante -->
      ${CIRIOS.map(c => cirioEn(c.x, c.topY, c.w)).join('')}
      <!-- tocones consumidos, en los huecos de los extremos -->
      ${toconEn(PISO_VB_W - 26, 24)}
      ${toconEn(18, 18)}`;
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
    /* El `factor` crece con el lienzo: si el viewBox se ensanchó para meter
       más cirios, la pieza tiene que ocupar más ancho en pantalla o cada
       cirio saldría más chico. 240 era el ancho del cúmulo de cuatro. */
    piso:  { svg: svgCirios + '</svg>',   vbW: PISO_VB_W,  vbH: PISO_VB_H,  llamas: PISO_LLAMAS,  factor: 0.72 * (PISO_VB_W / 240), apoyo: 'piso',
             /* Devuelve el halo a su tamaño por vela pese a que la pieza se
                ensanchó, y lo baja un poco más según cuántos cirios haya: la
                luz se SUMA, así que quince halos al mismo brillo que cuatro
                queman la esquina. La raíz cuadrada mantiene el conjunto con
                el mismo peso luminoso sin apagar cada vela por separado. */
             escalaDelResplandor: (240 / PISO_VB_W) * Math.pow(4 / CUANTOS_CIRIOS, 0.4) },
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

  /* ⚡ LA CONSTRUCCIÓN TAMPOCO OCURRE DURANTE LA CARGA (ver sección 3 bis).
     Esta lista arranca VACÍA y se llena de a una pieza por cuadro recién
     cuando la invitación se revela. Todo lo que la recorre (el titileo, el
     rearmado de fuentes de luz) funciona igual con la lista vacía: no hace
     nada hasta que hay piezas. */
  /** @type {Array} */
  const piezas = [];

  /**
   * Construye UNA pieza: su candelabro (o cúmulo de cirios) y sus fuegos.
   * @param {Object} a - Un ancla de ANCLAS.
   * @returns {void}
   */
  function construirUnaPieza(a) {
    const seccion = buscar(a.seccion);
    if (!seccion) return;
    const t = TIPOS[a.tipo];

    const cont = document.createElement('div');
    cont.className = 'aplique aplique--' + a.tipo;
    cont.innerHTML = t.svg;
    capaApliques.appendChild(cont);

    /* ⚡ UN CONTENEDOR DE MEZCLA POR PIEZA (ni uno gigante, ni uno por luz).
       La mezcla "screen" es lo que hace que estas luces SUMEN claridad sobre
       lo que tienen debajo en vez de taparlo. Dónde se aplica esa mezcla es
       una decisión de rendimiento, y se probaron los dos extremos midiendo:

         · En la capa que cubre TODO el documento: una sola capa, pero de
           millones de píxeles que hay que releer y remezclar cada vez que una
           llama titila → "Commit" se disparaba al 25,6 %.
         · En cada .vela por separado: áreas chiquitas, pero el navegador
           arma UNA CAPA POR ELEMENTO, y son 52 → "Layerize" saltó de 5,8 % a
           22,3 %, y "Pre-paint" de 4,1 % a 18,1 %. Peor todavía.

       El punto medio correcto es este: una capa de mezcla POR PIEZA (los 6
       candelabros y los 2 cúmulos de cirios). Son 8 capas, cada una del
       tamaño de su candelabro y no del documento. Las luces se cuelgan de
       acá y se ubican en coordenadas RELATIVAS a este contenedor. */
    const luzDeLaPieza = document.createElement('div');
    luzDeLaPieza.className = 'luz-de-pieza';
    capaLuz.appendChild(luzDeLaPieza);

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
      luzDeLaPieza.appendChild(derrame);   // el derrame va debajo del núcleo
      luzDeLaPieza.appendChild(nucleo);

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

    piezas.push({ cont, luzDeLaPieza, lado: a.lado, tipo: a.tipo, seccion, fuegos, t, caja: null });
  }


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

  /**
   * Acomoda las 8 piezas… DE A UNA POR CUADRO.
   *
   * ⚠️ ERA LA ÚLTIMA CONSTRUCCIÓN GRANDE SIN TROCEAR, y se notaba: el
   * medidor marcaba tareas largas de más de un segundo. Cada pieza lee la
   * geometría de la caja de texto de su sección (`getBoundingClientRect`,
   * que obliga al navegador a resolver el layout) y coloca hasta ocho
   * fuegos. Las ocho de corrido, encadenadas detrás de la construcción de
   * las enredaderas, congelaban la página justo al abrir el sobre.
   *
   * Un promedio de 29 ms por cuadro con un parón de 1.200 ms se siente PEOR
   * que 40 ms constantes: lo que se percibe como pesadez es el tirón, no la
   * media. De a una, ninguna pasada se sale del presupuesto de un cuadro.
   *
   * ⚠️ rearmarLasFuentesDeLuz() SE LLAMA DESPUÉS DE CADA PIEZA, no solo al
   * final. Antes se llamaba una única vez, cuando las ocho ya estaban
   * colocadas — y como colocarPieza() mueve el candelabro (un elemento del
   * DOM) pero es rearmarLasFuentesDeLuz() quien le avisa al LIENZO dónde
   * quedó la luz, durante esos cuadros intermedios el metal ya estaba en su
   * sitio nuevo y el resplandor se seguía dibujando en el viejo: un salto
   * visible entre el candelabro y su propia luz. Reconstruir el array de
   * fuentes 8 veces en vez de 1 es trivial (recorre ~104 objetos), y
   * garantiza que nunca queden desincronizados.
   *
   * @param {Function} [alTerminar] - Se llama cuando están todas colocadas.
   * @returns {void}
   */
  function acomodarTodo(alTerminar) {
    const anchoRef = anchoBase();

    /* ⚡ LAS VELAS VUELVEN AL LIENZO (Etapa B, 2026-08-31) — ESTA VEZ SIN
       PERDER LA SINCRONÍA.
       El 2026-08-20 se sacaron del lienzo porque ESE canvas (el de
       23-lienzo-de-luz.js) es `position: fixed` y le resta el scroll a
       mano en cada evento — un paso de JavaScript que la llama, un
       elemento normal, no tiene. Esa diferencia, mínima pero real, era
       "la luz se atrasa de la vela" que se había reportado.

       El lienzo de velas de ESTE archivo (ver la sección 0, arriba) es
       distinto: `position: absolute`, en coordenadas de DOCUMENTO, igual
       que la llama. Al no ser `fixed`, lo mueve el compositor nativo
       junto con la página — cero JavaScript de por medio, cero diferencia
       posible, por construcción. Con esa base, ya no hace falta resignar
       las 8 capas `mix-blend-mode: screen` (el 31 % de "Layerize" medido
       en vivo) para tener sincronía perfecta: se pueden tener las dos
       cosas.

       rearmarLasFuentesDeLuz() sigue llamándose DESPUÉS DE CADA PIEZA, no
       solo al final — ver el porqué en el comentario grande de arriba de
       esta función: sin eso, mientras se acomodan las ocho piezas el
       candelabro ya está en su sitio nuevo y la luz se seguía dibujando en
       el viejo. */
    trabajarPorTandas(
      piezas.length,
      i => {
        colocarPieza(piezas[i], anchoRef);
        rearmarLasFuentesDeLuz();
      },
      () => {
        /* Recién acá las luces tienen su posición definitiva, así que recién
           acá se sabe qué franja del documento hay que cubrir. */
        hayPiezasColocadas = true;
        ajustarLienzoDeVelas();
        if (typeof alTerminar === 'function') alTerminar();
      }
    );
  }

  /* cederElHilo() y trabajarPorTandas() viven en codigo/02-utilidades.js:
     los usan también las enredaderas y las motas, así que la copia local
     que había acá se borró para no mantener tres versiones de lo mismo. */

  /**
   * Coloca UNA pieza: el candelabro y todos sus fuegos.
   * @param {Object} c
   * @param {number} anchoRef
   * @returns {void}
   */
  function colocarPieza(c, anchoRef) {
    {
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

      /* ⚠️ EL RESPLANDOR ES DE CADA VELA, NO DE LA PIEZA ENTERA.
         Esto causó un desastre: al ensanchar el cúmulo de cirios para meter
         más, `ancho` creció 2,3 veces… y como el tamaño del halo salía de
         `ancho`, cada halo creció 2,3 veces TAMBIÉN. Con 15 cirios en vez de
         4, y sumándose de forma aditiva, la esquina se convertía en una
         mancha blanca.

         `escalaDelResplandor` devuelve el halo a su tamaño por vela: la
         pieza puede ser todo lo ancha que haga falta, que cada llama sigue
         iluminando lo mismo. */
      const escalaDelResplandor = t.escalaDelResplandor ?? 1;
      const tamNucleo  = ancho * 0.85 * escalaDelResplandor;
      const tamDerrameMax = ancho * 2.2 * escalaDelResplandor;
      const radioMax = tamDerrameMax / 2;

      /* ⚡ EL CONTENEDOR DE MEZCLA SE AJUSTA A LA LUZ, NO AL CANDELABRO.
         Antes cubría el candelabro ENTERO más un margen: pero las llamas
         están todas arriba, en los brazos, y el cuerpo del candelabro no
         emite nada. Medido en la página viva, cuatro de estas cajas tenían
         el 87 % de su área vacía.

         Y no es área cualquiera: `mix-blend-mode` obliga al compositor a
         LEER DE VUELTA el fondo de toda la caja antes de dibujar, aunque
         esté vacía. Entre las 8 piezas se leían 1,7 millones de píxeles de
         más en cada cuadro; en el perfil, "Layerize" + "Commit" juntos eran
         el 50 % del tiempo.

         Ahora la caja es exactamente la unión de los resplandores: el centro
         de cada llama más el radio máximo del derrame en las cuatro
         direcciones. NO PUEDE RECORTAR NADA, porque ese radio es por
         definición lo más lejos que llega la luz de esa llama. */
      let luzX0 = Infinity, luzY0 = Infinity, luzX1 = -Infinity, luzY1 = -Infinity;
      for (const fuego of c.fuegos) {
        const xL = (c.lado === 'izq')
          ? fuego.puntoSvg.x * escala
          : (t.vbW - fuego.puntoSvg.x) * escala;
        const cxf = izquierdaPieza + xL;
        const cyf = topPieza + fuego.puntoSvg.y * escala;
        luzX0 = Math.min(luzX0, cxf - radioMax); luzX1 = Math.max(luzX1, cxf + radioMax);
        luzY0 = Math.min(luzY0, cyf - radioMax); luzY1 = Math.max(luzY1, cyf + radioMax);
      }
      // Si la pieza no tuviera llamas, se cae al comportamiento de antes.
      if (!isFinite(luzX0)) {
        luzX0 = izquierdaPieza - radioMax;
        luzY0 = topPieza - radioMax;
        luzX1 = izquierdaPieza + ancho + radioMax;
        luzY1 = topPieza + alto + radioMax;
      }

      const origenX = luzX0;
      const origenY = luzY0;
      c.luzDeLaPieza.style.left   = origenX + 'px';
      c.luzDeLaPieza.style.top    = origenY + 'px';
      c.luzDeLaPieza.style.width  = (luzX1 - luzX0) + 'px';
      c.luzDeLaPieza.style.height = (luzY1 - luzY0) + 'px';

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

        /* El derrame cambia de capa ANTES de ubicarlo, porque de eso depende
           en qué sistema de coordenadas hay que escribirlo: dentro del
           contenedor de la pieza van relativas a su origen; si se lo manda
           detrás del texto vive en #apliques, que va en coordenadas del
           documento. */
        if (detras !== fuego.detras) {
          fuego.detras = detras;
          const capaObjetivo = detras ? capaApliques : c.luzDeLaPieza;
          if (fuego.derrame.parentNode !== capaObjetivo) capaObjetivo.appendChild(fuego.derrame);
          fuego.derrame.classList.toggle('vela--detras', detras);
        }

        /* Núcleo: siempre dentro del contenedor de mezcla de su pieza, así
           que sus coordenadas van relativas a ese origen. */
        fuego.nucleo.style.width  = tamNucleo + 'px';
        fuego.nucleo.style.height = tamNucleo + 'px';
        fuego.nucleo.style.left   = (cx - origenX - tamNucleo / 2) + 'px';
        fuego.nucleo.style.top    = (cy - origenY - tamNucleo / 2) + 'px';

        /* Derrame: se encoge un poco al acercarse a la caja, y si queda muy
           encima se muda a #apliques (bajo el velo) para no lavar el texto. */
        const tamDerrame = tamDerrameMax * (0.62 + 0.38 * atenua);
        const desdeX = detras ? 0 : origenX;   // #apliques usa coords del documento
        const desdeY = detras ? 0 : origenY;
        fuego.derrame.style.width  = tamDerrame + 'px';
        fuego.derrame.style.height = tamDerrame + 'px';
        fuego.derrame.style.left   = (cx - desdeX - tamDerrame / 2) + 'px';
        fuego.derrame.style.top    = (cy - desdeY - tamDerrame / 2) + 'px';
        fuego.derrame.style.opacity = (fuego.base * 0.85 * atenua).toFixed(3);

        /* ⚡ Y LO MISMO, EN NÚMEROS, PARA EL LIENZO DE LUZ.
           Cuando dibuja el canvas (codigo/23-lienzo-de-luz.js) no hacen
           falta los divs, pero sí sus medidas: centro y radio en
           coordenadas del DOCUMENTO. Se guardan siempre —cuesta nada— así
           el cambio entre un sistema y otro es instantáneo. */
        fuego.cx = cx;
        fuego.radioNucleo  = tamNucleo  / 2;
        fuego.radioDerrame = tamDerrame / 2;
      }
    }
  }

  /* ─── PUENTE CON EL LIENZO DE LUZ ───────────────────────────────────
     El canvas no sabe nada de velas: solo recibe una lista plana de
     manchas de luz (centro, radio, opacidad). Acá se arma esa lista, una
     vez por acomodada, y después el bucle solo le actualiza la opacidad.
     ---------------------------------------------------------------- */

  /** Cada fuego aporta dos manchas: su núcleo y su derrame. */
  function rearmarLasFuentesDeLuz() {
    /* ⚡ YA NO ARMA UN ARRAY DE "FUENTES" (Etapa B, 2026-08-31). Antes esto
       llenaba window.LienzoDeLuz.fuentes para que 23-lienzo-de-luz.js las
       dibujara en SU canvas (fijo, en coordenadas de ventana) — el paso de
       JavaScript que restaba el scroll y causaba el atraso reportado.
       Ahora dibujarCuadro() (más abajo, sección 4) pinta cada fuego
       directo en el lienzo PROPIO de este archivo (coordenadas de
       documento), leyendo fuego.cx/cy/radioNucleo/radioDerrame en el
       momento — no hace falta ningún array intermedio.

       Lo único que sigue haciendo falta acá es apagar los divs de mezcla,
       y solo si el lienzo de velas está realmente activo. Si no lo está
       (sin sellos prestados, ver crearLienzoDeVelas más arriba), se dejan
       encendidos: son el camino de reserva. */
    if (usaElLienzoAhora()) {
      for (const c of piezas) c.luzDeLaPieza.style.display = 'none';
    }
  }

  /* ─── 3 bis. NI CONSTRUIR NI ACOMODAR DURANTE LA CARGA ─────────────────
     Los candelabros viven en la penumbra, detrás del sobre: nadie los ve
     hasta que la invitación se revela. Así que ni se crean ni se miden
     antes de ese momento.

     ⚠️ ANTES ACÁ HABÍA DOS PROBLEMAS, Y LOS DOS COSTABAN CAROS:

       1. Solo el ACOMODADO estaba diferido; la CONSTRUCCIÓN (parsear los 8
          SVG completos y crear 104 divs) ocurría en plena evaluación del
          script, o sea en el peor momento posible. El comentario que había
          acá decía "tampoco acá se acomoda nada durante la carga", que era
          cierto pero incompleto: crear no es acomodar.

       2. Un temporizador de respaldo de 1.600 ms que se disparaba SIEMPRE,
          aunque el sobre siguiera cerrado — el mismo error que en
          07-marco-y-enredaderas.js. Y encima `load` llamaba a acomodarTodo()
          salteándose el guard, así que en una carga normal el layout de las
          8 piezas corría DOS VECES.

     Ahora es una sola cadena, disparada por un solo evento: construir (de a
     una pieza por cuadro) → acomodar (de a una pieza por cuadro) → observar
     cambios de tamaño. El caso "no existe el sobre" lo cubre
     codigo/03-sobre-de-apertura.js emitiendo el evento él mismo. */
  let yaSeConstruyo = false;

  function construirYAcomodarUnaSolaVez() {
    if (yaSeConstruyo) return;
    yaSeConstruyo = true;

    /* Se vuelve a medir el lienzo de velas justo acá: si este archivo
       evaluó con el sobre todavía cerrado, #luz-de-velas podía estar
       dentro de un ancestro en display:none y medir 0 (ver
       ajustarLienzoDeVelas más arriba). Ahora la invitación ya se ve de
       verdad, así que la medida es la real. */
    ajustarLienzoDeVelas();

    // Los <defs> compartidos (degradados y filtros) van una sola vez.
    capaApliques.insertAdjacentHTML('beforeend', defsCompartidos);

    trabajarPorTandas(
      ANCLAS.length,
      i => construirUnaPieza(ANCLAS[i]),
      // Recién con todas las piezas creadas tiene sentido medirlas.
      () => acomodarTodo(observarLasSecciones)
    );

    /* ⚡ EL BUCLE DEL TITILEO ARRANCA ACÁ, NO AL EVALUAR EL SCRIPT
       (2026-08-30). Antes `requestAnimationFrame(dibujarCuadro)` se pedía
       de una, sin importar si el sobre estaba abierto: un cuadro vacío
       pedido de sobra en cada vsync (hayAlgoQueMirar() lo cortaba, pero
       igual competía por el turno). Recién hace falta un cuadro cuando la
       invitación se ve, así que recién ahí se pide el primero; una vez
       arrancado se sigue reagendando para siempre, igual que antes. */
    requestAnimationFrame(dibujarCuadro);
  }

  // escucharEventoQueQuizasYaPaso() (02-utilidades.js): este script se
  // inyecta encadenado detrás de otros — el evento puede haber pasado
  // antes de que cargara.
  /* ⚡ 300 ms DE DEMORA, A PROPÓSITO (2026-09-03). Desde que los 23 scripts
     de la escena bajan en paralelo (44f54c9), este archivo y
     07-marco-y-enredaderas.js —los dos más caros de construir— arrancaban
     su construcción en el MISMO instante, compitiendo por el mismo hilo.
     22-luz-de-la-hora.js y 27-fauna-nocturna.js ya usaban este mismo
     escalonamiento (300 y 600 ms); acá faltaba. Dejar que 07 arranque solo
     y que las velas entren 300 ms después reduce las chances de que dos
     pasos indivisibles (el cierre de un ramillete acá, colocarPieza allá)
     caigan en la misma tanda de cuadros. */
  escucharEventoQueQuizasYaPaso('invitacion-visible',
    () => setTimeout(construirYAcomodarUnaSolaVez, 300));

  /* Rehacer si cambia el tamaño de la ventana (con un respiro).
     Si todavía no se construyó nada, no hay nada que acomodar. */
  let temporizador = null;
  function acomodarConRespiro() {
    if (!piezas.length) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(acomodarTodo, 200);
  }
  /* alCambiarElAncho: ignora el 'resize' falso de la barra del navegador
     en celular (ver la nota en 02-utilidades.js) — sin esto, acomodarTodo()
     —que relee getBoundingClientRect() de cada ancla— se disparaba en cada
     aparición/desaparición de la barra al hacer scroll. */
  window.addEventListener('resize', alCambiarElAncho(acomodarConRespiro));
  window.addEventListener('load', acomodarConRespiro);

  /* ⚠️ EL CASO QUE FALLABA: el iframe del mapa carga TARDE y mueve todo lo
     que hay debajo. Un ResizeObserver sobre las secciones ancla reubica en
     cuanto eso pasa, así la luz nunca queda corrida respecto de su llama.
     Se engancha al terminar de construir, porque antes `piezas` está vacía
     y no habría ninguna sección que observar. */
  function observarLasSecciones() {
    if (!('ResizeObserver' in window)) return;
    const observador = new ResizeObserver(acomodarConRespiro);
    const vistas = new Set();
    for (const c of piezas) {
      if (!vistas.has(c.seccion)) { observador.observe(c.seccion); vistas.add(c.seccion); }
    }
  }


  /* ─── 4. EL TITILEO ────────────────────────────────────────────────────
     Las velas quedan ENCENDIDAS siempre EN LOS TRES NIVELES: son la fuente
     de luz de la profundidad, no un adorno de movimiento (a diferencia de
     los haces o las motas, nunca se apagan por calidad). Este bucle solo
     agrega el titileo. Si las animaciones están apagadas, queda en reposo
     (prendidas, quietas).
     ⚡ RENDIMIENTO: se recalcula cada ~45 ms (~22 fps) y solo las velas
     cercanas a la pantalla. En calidad más baja se espacia más el
     recálculo: una llama real no titila con un ritmo perfecto, así que
     aun más lento se sigue leyendo vivo —el "algoritmo más liviano" que
     no resigna la sensación de la escena—. El derrame respeta su tope de
     atenuación. */
  /* En calidad ALTA el titileo se recalcula bastante más seguido (30 ms,
     ~33 veces por segundo): la llama respira más fina y viva, que es
     justamente el detalle que se aprecia cuando el equipo tiene margen. */
  /* Media y baja también titilan más fino que antes (eran 65 y 110 ms): con
     el margen recuperado, la llama respira mejor en todos los niveles. */
  const CADA_CUANTO_POR_CALIDAD = { 0: 30, 1: 50, 2: 90 };
  let calidadDelTitileo = nivelDeCalidad();
  let cadaCuanto = CADA_CUANTO_POR_CALIDAD[calidadDelTitileo] ?? 45;
  document.addEventListener('calidad-cambio', evento => {
    calidadDelTitileo = (evento.detail && evento.detail.calidad) ?? 0;
    cadaCuanto = CADA_CUANTO_POR_CALIDAD[calidadDelTitileo] ?? 45;
  });
  let ultimoCalculo = 0;

  /** ¿Está pintando el canvas? Se consulta una vez por cuadro, no por vela. */
  /* ⚡ REACTIVADO (Etapa B, 2026-08-31) — ver la nota grande en
     acomodarTodo(), más arriba: el lienzo de velas de este archivo (no el
     de 23-lienzo-de-luz.js) es en coordenadas de documento, así que ya no
     hay JavaScript restando el scroll que pueda desincronizarse. `true`
     solo si crearLienzoDeVelas() consiguió sellos prestados y armó el
     canvas; si no, sigue el camino de los divs (mismo que ?luz=dom). */
  function usaElLienzoAhora() {
    return !!lienzoDeVelas;
  }

  /* En calidad baja, la llama deja de "respirar" en tamaño (solo titila en
     opacidad): un style.transform menos por llama por cuadro. La luz sigue
     viva —tiembla igual—, se resigna únicamente el leve crecer/encoger. */
  function debeAnimarLaEscala() {
    return calidadDelTitileo !== CALIDAD_GRAFICA.BAJA;
  }

  /* Ventana de "está cerca de la pantalla": en calidad baja se angosta, así
     que al estar frente a UNA sección no se siguen actualizando de fondo
     los candelabros de la sección vecina (menos llamas titilando a la vez).
     Los candelabros y cirios NUNCA se apagan por esto —siguen encendidos,
     dibujados con su último brillo—, solo dejan de recalcularse. */
  const VENTANA_POR_CALIDAD = {
    0: { arriba: 0.4, abajo: 1.4 },
    1: { arriba: 0.4, abajo: 1.4 },
    2: { arriba: 0.15, abajo: 1.15 },
  };

  function dibujarCuadro(t) {
    if (!hayAlgoQueMirar()) {
      requestAnimationFrame(dibujarCuadro);
      return;
    }
    if (t - ultimoCalculo < cadaCuanto) { requestAnimationFrame(dibujarCuadro); return; }
    ultimoCalculo = t;

    const usaElLienzo = usaElLienzoAhora();
    const ventana = VENTANA_POR_CALIDAD[calidadDelTitileo] ?? VENTANA_POR_CALIDAD[0];
    /* scrollActual() y no window.scrollY: dentro de un bucle de animación,
       preguntarle el scroll al navegador lo obliga a recalcular estilos
       (ver la nota larga en 02-utilidades.js). */
    const desplazamiento = scrollActualY();
    const arriba = desplazamiento - window.innerHeight * ventana.arriba;
    const abajo  = desplazamiento + window.innerHeight * ventana.abajo;

    /* ⚡ SE BORRA SOLO LA BANDA VISIBLE, NO EL LIENZO ENTERO (Etapa B,
       2026-08-31). El documento mide miles de píxeles de alto; limpiar y
       repintar todo en cada recálculo sería tan caro como el problema que
       esto viene a resolver. `arriba`/`abajo` es la MISMA ventana que ya
       decide qué fuego se recalcula (ver el `continue` de acá abajo): un
       fuego que queda afuera de esa banda no se toca este cuadro, así que
       tampoco hace falta limpiar donde estaba — sus últimos píxeles
       quedan quietos, que es exactamente el comportamiento ya documentado
       ("los candelabros nunca se apagan por esto, solo dejan de
       recalcularse"). setTransform, no scale: clearRect también tiene que
       respetar la densidad del lienzo. */
    if (usaElLienzo) {
      /* El último parámetro desplaza el origen: el lienzo ya no arranca en
         el tope del documento sino en topLienzoVelas (ver
         ajustarLienzoDeVelas), así que se le resta esa altura y todo lo que
         sigue puede seguir dibujando en COORDENADAS DE DOCUMENTO, igual que
         antes. Va multiplicado por la densidad porque setTransform trabaja
         en píxeles del lienzo, no en píxeles CSS. */
      pincelDeVelas.setTransform(
        densidadLienzoVelas, 0, 0, densidadLienzoVelas,
        0, -topLienzoVelas * densidadLienzoVelas
      );
      pincelDeVelas.clearRect(0, arriba, anchoLienzoVelas, abajo - arriba);
      pincelDeVelas.globalCompositeOperation = 'lighter';
    }

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

        /* La llama del SVG crece y encoge desde la mecha (cada una con SU
           brillo).

           ⚡ Se compara con un ENTERO antes de escribir. toFixed() fabrica un
           string cada vez que se llama, aunque el valor no haya cambiado;
           entre las 26 llamas eran decenas de cadenas por cuadro tiradas a
           la basura. Con milésimas en entero, comparar no reserva nada.

           ⚡ EN CALIDAD BAJA, LA LLAMITA DEL SVG QUEDA QUIETA DEL TODO.
           Antes, `debeAnimarLaEscala()` ya evitaba el `transform` (crecer/
           encoger) en baja, pero el `style.opacity` de esta misma llamita
           se seguía escribiendo siempre, sin excepción — la única escritura
           al DOM de todo el sistema de velas que no respetaba la calidad.
           El resplandor grande (el que de verdad ilumina la escena) sigue
           titilando igual: eso lo dibuja el lienzo con solo números, no
           cuesta nada. Lo que se congela acá es el detalle chico: el
           dibujo de la llama en sí, dentro del candelabro, deja de
           parpadear en el nivel más exigido, y solo ahí. */
        if (fuego.llama && debeAnimarLaEscala()) {
          const nivelDeLlama = Math.round(brillo * 1000);
          if (nivelDeLlama !== fuego.ultimoNivelDeLlama) {
            fuego.ultimoNivelDeLlama = nivelDeLlama;
            fuego.llama.style.opacity = 0.75 + brillo * 0.25;
            fuego.llama.style.transform =
              'scaleY(' + (0.92 + brillo * 0.13) + ') scaleX(' + (0.98 + brillo * 0.04) + ')';
          }
        }

        /* Los resplandores laten con el mismo valor; el derrame además
           respeta su tope por cercanía a la caja (fuego.atenua). Solo se
           anima la OPACIDAD (nunca la escala de una capa grande). */
        const brilloNucleo  = fuego.base * brillo;
        const brilloDerrame = fuego.base * brillo * 0.85 * fuego.atenua;

        /* ⚡ CON EL LIENZO ACTIVO SE DIBUJA DIRECTO, NO SE ESCRIBEN ESTILOS
           (Etapa B, 2026-08-31). Antes esto eran 104 escrituras de
           `style.opacity` por cuadro sobre divs dentro de 8 capas
           `mix-blend-mode: screen` — cada una obliga al navegador a
           recalcular estilo Y a rehacer el árbol de capas. Ahora se
           estampa directo en el lienzo PROPIO de este archivo (coordenadas
           de documento, ver sección 0), reusando los mismos sellos
           pre-rasterizados que 23-lienzo-de-luz.js. */
        if (usaElLienzo) {
          const sellos = window.LienzoDeLuz.sellos;

          /* ⚠️ EL DERRAME "DETRÁS" NECESITA EL MISMO AJUSTE QUE YA TENÍA.
             En el sistema de divs, cuando un derrame queda muy encima de
             una caja de texto se lo muda a #apliques, que vive DEBAJO del
             velo de penumbra: ahí la propia penumbra lo apaga y el texto
             se sigue leyendo. Este lienzo pinta por encima del velo, así
             que ese apagado no ocurre solo — se replica bajando el brillo.
             Sin esto, los textos cercanos a un candelabro quedarían
             lavados. */
          const alfaDerrame = fuego.detras ? brilloDerrame * 0.4 : brilloDerrame;

          if (brilloNucleo > 0.004 && fuego.radioNucleo > 0) {
            pincelDeVelas.globalAlpha = brilloNucleo > 1 ? 1 : brilloNucleo;
            const lado = fuego.radioNucleo * 2;
            pincelDeVelas.drawImage(sellos.nucleo,
              fuego.cx - fuego.radioNucleo, fuego.cy - fuego.radioNucleo, lado, lado);
          }
          if (alfaDerrame > 0.004 && fuego.radioDerrame > 0) {
            pincelDeVelas.globalAlpha = alfaDerrame > 1 ? 1 : alfaDerrame;
            const lado = fuego.radioDerrame * 2;
            pincelDeVelas.drawImage(sellos.derrame,
              fuego.cx - fuego.radioDerrame, fuego.cy - fuego.radioDerrame, lado, lado);
          }
        } else {
          /* Sin toFixed: el navegador acepta el número directo y así no se
             fabrica una cadena por vela y por cuadro. */
          fuego.nucleo.style.opacity  = brilloNucleo;
          fuego.derrame.style.opacity = brilloDerrame;
        }
      }
    }
    if (usaElLienzo) {
      pincelDeVelas.globalAlpha = 1;
      pincelDeVelas.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(dibujarCuadro);
  }
  /* ⛔ ACÁ YA NO VA `requestAnimationFrame(dibujarCuadro)` A SECAS: el
     primer cuadro se pide dentro de construirYAcomodarUnaSolaVez(), al
     recibir 'invitacion-visible' (ver más arriba). */

})();
