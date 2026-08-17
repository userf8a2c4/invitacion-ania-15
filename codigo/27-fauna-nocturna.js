/* ══════════════════════════════════════════════════════════════════════
   27 · FAUNA NOCTURNA (luciérnagas y termitas)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   1 a 3 luciérnagas volando despacio y errático cerca del relicario de la
   portada, y 1 a 3 termitas nerviosas revoloteando cerca de los
   candelabros. Vida ambiental mínima, no un sistema de partículas.

   CÓMO SE DIBUJA SIN COSTAR NADA NUEVO
   No hay canvas propio, ni divs, ni bucle de animación propio. Se suma al
   <canvas> de codigo/23-lienzo-de-luz.js que YA existe y ya se paga, con
   el mismo mecanismo que usan las motas de polvo
   (codigo/18-motas-de-polvo.js): este archivo solo deja un array de
   números en `window.LienzoDeLuz.fauna` y una función
   `window.LienzoDeLuz.animarLaFauna(t)` que el lienzo llama en su propio
   bucle, ya throttleado a ~22 fps (ver CADA_CUANTO_REPINTAR en 23). El
   dibujado reutiliza el mismo "sello" que las motas —un puntito con
   halo— así que tampoco hay un degradado nuevo que crear.

   Si el lienzo no está activo (?luz=dom), este archivo no hace nada: no
   vale la pena reconstruir esto con divs para un modo de depuración.

   REACCIÓN AL TOQUE / MOUSE
   Mismo cálculo barato que ya prueba andar bien en pétalos y plantas: un
   Math.hypot con descarte temprano que aparta al bicho un instante. Un
   solo listener de pointermove/pointerdown para los dos (mouse y dedo),
   igual que codigo/06-petalos-con-fisica.js.
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLaFaunaNocturna() {

  const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);
  if (!usaElLienzo) return;

  /* ⚠️ NO SE PUEDE ARRANCAR AL CARGAR LA PÁGINA.
     Las termitas se anclan a `.aplique` (los candelabros), pero esos divs
     los crea codigo/19-velas.js recién cuando se abre el sobre —de a una
     pieza por cuadro, sin un evento propio de "ya terminé"—. Arrancar acá
     directo encontraría cero candelabros y nunca aparecería ninguna
     termita. Se espera 'invitacion-visible' (el mismo evento que usa
     19-velas.js para arrancar) más un respiro, mismo patrón de espera que
     ya usan codigo/22-luz-de-la-hora.js y codigo/02-utilidades.js para
     este exacto problema. */
  document.addEventListener('invitacion-visible', () => setTimeout(preparar, 600));

  function preparar() {

  const relicario = buscar('.portada__marco');
  const apliques = buscarTodos('.aplique');
  if (!relicario && !apliques.length) return;


  /* ─── 1. ZONAS DE VUELO, EN COORDENADAS DEL DOCUMENTO ────────────────
     Igual que los resplandores de las velas (fuentes), estos bichos viven
     en coordenadas de documento, no de ventana: se mueven con el scroll
     porque están anclados a elementos que están dentro de la página, no
     pegados a la pantalla. */

  /** Rectángulo {x, y, ancho, alto} de un elemento, en coordenadas de
   *  documento, con un margen proporcional (negativo = hacia afuera). */
  function zonaAlrededorDe(elemento, margenX, margenY) {
    const r = elemento.getBoundingClientRect();
    const y = r.top + scrollActualY();
    return {
      x: r.left - r.width * margenX,
      y: y - r.height * margenY,
      ancho: r.width * (1 + margenX * 2),
      alto:  r.height * (margenY * 2 + 0.6),
    };
  }

  let zonaDelRelicario = relicario
    ? zonaAlrededorDe(relicario, 0.08, 0.10)
    : null;

  const zonasDeApliques = apliques.map(a => {
    const r = a.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2 + scrollActualY();
    return { x: cx - 45, y: cy - 45, ancho: 90, alto: 90 };
  });

  /* Las zonas dependen de dónde ESTÁ cada elemento en la página: si la
     ventana cambia de tamaño, hay que recalcularlas. Mismo debounce
     (rebotar) que usa el resto del proyecto para esto. */
  function recalcularZonas() {
    if (relicario) zonaDelRelicario = zonaAlrededorDe(relicario, 0.08, 0.10);
    for (let i = 0; i < apliques.length; i++) {
      const r = apliques[i].getBoundingClientRect();
      zonasDeApliques[i].x = r.left + r.width / 2 - 45;
      zonasDeApliques[i].y = r.top + r.height / 2 + scrollActualY() - 45;
    }
  }
  window.addEventListener('resize', rebotar(recalcularZonas, 250));


  /* ─── 2. CREAR LOS BICHOS ─────────────────────────────────────────── */

  const criaturas = [];

  function nuevoDestino(zona) {
    return {
      x: numeroAlAzar(zona.x, zona.x + zona.ancho),
      y: numeroAlAzar(zona.y, zona.y + zona.alto),
    };
  }

  /**
   * @param {'luciernaga'|'termita'} tipo
   * @param {Object} zona - {x, y, ancho, alto}
   */
  function crearCriatura(tipo, zona) {
    const esLuciernaga = tipo === 'luciernaga';
    const inicio = nuevoDestino(zona);
    const destino = nuevoDestino(zona);
    criaturas.push({
      tipo,
      zona,
      x: inicio.x, y: inicio.y,
      destinoX: destino.x, destinoY: destino.y,
      // Lenta y errática la luciérnaga; nerviosa y rápida la termita.
      velocidad: esLuciernaga ? numeroAlAzar(6, 14) : numeroAlAzar(40, 75),
      radioDeLlegada: esLuciernaga ? 5 : 9,
      radio: esLuciernaga ? numeroAlAzar(5, 7) : numeroAlAzar(3, 4.5),
      frecuenciaDeParpadeo: esLuciernaga ? numeroAlAzar(1.1, 1.9) : numeroAlAzar(7, 11),
      faseDeParpadeo: numeroAlAzar(0, Math.PI * 2),
      picoDeAlfa: esLuciernaga ? numeroAlAzar(0.75, 1) : numeroAlAzar(0.35, 0.55),
      seDibuja: true,
      alfa: 0,

      // El sobresalto (sección 5B): arranca siempre en calma.
      estado: 'calma',
      anguloDeEscape: 0,
      finDelSobresalto: 0,
      faseDelTembleque: numeroAlAzar(0, Math.PI * 2),
    });
  }

  if (zonaDelRelicario) {
    const cuantasLuciernagas = Math.floor(numeroAlAzar(2, 7));
    for (let i = 0; i < cuantasLuciernagas; i++) crearCriatura('luciernaga', zonaDelRelicario);
  }

  if (zonasDeApliques.length) {
    const cuantasTermitas = Math.floor(numeroAlAzar(1, 4));
    for (let i = 0; i < cuantasTermitas; i++) {
      const zona = elegirAlAzar(zonasDeApliques);
      crearCriatura('termita', zona);
    }
  }


  /* ─── 3. CALIDAD GRÁFICA: menos bichos, nunca más trabajo ───────────
     Se crean todos de entrada (nunca son más de 6) y en calidad más baja
     se esconden los que sobran, mismo patrón que las motas: esconder no
     cuesta nada, y así subir de nivel se nota al instante sin recargar. */
  const TOPE_POR_CALIDAD = { 0: 99, 1: 2, 2: 1 };

  function ajustarCantidad(calidad) {
    const tope = TOPE_POR_CALIDAD[calidad] ?? 99;
    let vistas = 0;
    for (const c of criaturas) {
      c.seDibuja = vistas < tope;
      if (c.seDibuja) vistas++;
    }
  }
  ajustarCantidad(nivelDeCalidad());
  document.addEventListener('calidad-cambio', evento => ajustarCantidad(evento.detail.calidad));


  /* ─── 4. SEGUIR EL MOUSE / EL DEDO ───────────────────────────────────
     Mismo listener liviano que 06-petalos-con-fisica.js: pointermove
     cubre mouse y dedo a la vez, passive para no trabar el scroll. */
  let mouseX = -9999, mouseY = -9999;
  document.addEventListener('pointermove', e => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  document.addEventListener('pointerdown', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    // Un toque es un instante: si se espera al próximo cuadro del lienzo
    // (hasta 45ms de por medio) para recién ahí notar el toque, a veces
    // el dedo ya se levantó. Revisar acá, en el momento exacto del toque,
    // es lo que hace que el sobresalto se sienta inmediato.
    intentarSobresaltar(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
  document.addEventListener('pointerup',    e => { if (e.pointerType === 'touch') { mouseX = -9999; mouseY = -9999; } });

  /** Qué tan lejos empieza a notarse el cursor/dedo. */
  const RADIO_DE_INFLUENCIA = 70;

  /* ─── 4B. EL SOBRESALTO, COMO UN INSECTO DE VERDAD ──────────────────
     Antes el toque apenas empujaba al bicho un par de píxeles —tan poco
     que lo único que se notaba era el vuelo normal hacia su destino de
     siempre, que por vivir del mismo lado de la pantalla, se leía como
     "siempre se va para la izquierda". No era un bug de dirección: el
     empujón casi no existía.

     Ahora es un estado aparte. Al entrar en sobresalto se elige un rumbo
     de escape con aleatoriedad DE VERDAD —contrario al dedo, más un
     ángulo al azar de hasta ±70°, así nunca escapa dos veces igual—, se
     vuela varias veces más rápido que en calma, con un tembleque
     perpendicular al rumbo para que se vea nervioso y no una línea
     recta, y a los pocos cientos de milisegundos vuelve solo al vuelo
     tranquilo de siempre, con un destino nuevo. Nunca sale de su propia
     zona de vuelo: solo se mueve más rápido y errático adentro de ella. */
  const DURACION_MINIMA_DEL_SOBRESALTO = 0.5;
  const DURACION_MAXIMA_DEL_SOBRESALTO = 0.8;
  const FACTOR_DE_VELOCIDAD_DEL_SOBRESALTO = 6;
  const ANGULO_DE_ALEATORIEDAD = Math.PI * 0.4;   // hasta ±72°

  /**
   * Si hay alguna criatura cerca de (xVentana, yVentana), la sobresalta.
   * @param {number} xVentana - coordenadas de VENTANA (como e.clientX).
   * @param {number} yVentana
   * @returns {void}
   */
  function intentarSobresaltar(xVentana, yVentana) {
    const scroll = scrollActualY();
    for (const c of criaturas) {
      if (!c.seDibuja || c.estado === 'sobresaltada') continue;

      const dx = c.x - xVentana;
      const dy = (c.y - scroll) - yVentana;
      const distancia = Math.hypot(dx, dy);
      if (distancia >= RADIO_DE_INFLUENCIA || distancia < 0.01) continue;

      const rumboBase = Math.atan2(dy, dx);   // ya apunta lejos del toque
      c.anguloDeEscape = rumboBase + numeroAlAzar(-ANGULO_DE_ALEATORIEDAD, ANGULO_DE_ALEATORIEDAD);
      c.estado = 'sobresaltada';
      c.finDelSobresalto = tAnterior + numeroAlAzar(DURACION_MINIMA_DEL_SOBRESALTO, DURACION_MAXIMA_DEL_SOBRESALTO);
    }
  }


  /* ─── 5. EL VUELO ─────────────────────────────────────────────────── */

  let tAnterior = 0;

  /**
   * Llamada por 23-lienzo-de-luz.js en su propio bucle, ya throttleado.
   * @param {number} tSegundos - segundos desde que arrancó la página.
   * @returns {void}
   */
  function animarLaFauna(tSegundos) {
    const dt = tAnterior ? Math.min(0.2, tSegundos - tAnterior) : 0;
    tAnterior = tSegundos;
    const scroll = scrollActualY();

    for (const c of criaturas) {
      if (!c.seDibuja) { c.alfa = 0; continue; }

      // Detección normal, por si el toque empezó lejos y se arrastró
      // cerca (el pointerdown de la sección 4B ya cubre el toque directo).
      const distMouse = Math.hypot(c.x - mouseX, (c.y - scroll) - mouseY);
      if (c.estado !== 'sobresaltada' && distMouse < RADIO_DE_INFLUENCIA && distMouse > 0.01) {
        intentarSobresaltar(mouseX, mouseY);
      }

      if (c.estado === 'sobresaltada' && tSegundos >= c.finDelSobresalto) {
        // Se acabó el susto: vuelve a la calma con un destino nuevo, para
        // no seguir de largo hacia donde iba antes de que lo asustaran.
        c.estado = 'calma';
        const nuevo = nuevoDestino(c.zona);
        c.destinoX = nuevo.x; c.destinoY = nuevo.y;
      }

      if (c.estado === 'sobresaltada') {
        // Rápido, errático, en el rumbo de escape que se eligió al
        // asustarse —con un tembleque perpendicular que lo hace ver
        // nervioso en vez de dispararse en línea recta—.
        const tembleque = Math.sin(tSegundos * 13 + c.faseDelTembleque) * 0.5;
        const rumbo = c.anguloDeEscape + tembleque;
        if (dt > 0) {
          c.x += Math.cos(rumbo) * c.velocidad * FACTOR_DE_VELOCIDAD_DEL_SOBRESALTO * dt;
          c.y += Math.sin(rumbo) * c.velocidad * FACTOR_DE_VELOCIDAD_DEL_SOBRESALTO * dt;
        }
        // Nunca se sale de su propia zona de vuelo: solo se mueve rápido
        // y errático ADENTRO de ella.
        c.x = limitar(c.x, c.zona.x, c.zona.x + c.zona.ancho);
        c.y = limitar(c.y, c.zona.y, c.zona.y + c.zona.alto);
      } else {
        // Vuelo tranquilo de siempre: rumbo hacia el destino actual; al
        // llegar, se elige otro al azar dentro de la misma zona.
        let dx = c.destinoX - c.x, dy = c.destinoY - c.y;
        let distancia = Math.hypot(dx, dy);
        if (distancia < c.radioDeLlegada) {
          const nuevo = nuevoDestino(c.zona);
          c.destinoX = nuevo.x; c.destinoY = nuevo.y;
          dx = c.destinoX - c.x; dy = c.destinoY - c.y;
          distancia = Math.hypot(dx, dy) || 1;
        }
        if (dt > 0 && distancia > 0.01) {
          c.x += (dx / distancia) * c.velocidad * dt;
          c.y += (dy / distancia) * c.velocidad * dt;
        }
      }

      // El parpadeo: la luciérnaga destella con huecos oscuros entre
      // flashes (por eso el pow), la termita solo titila apenas.
      const onda = Math.sin(tSegundos * c.frecuenciaDeParpadeo + c.faseDeParpadeo);
      const forma = c.tipo === 'luciernaga' ? Math.pow(Math.max(0, onda), 3) : (onda * 0.35 + 0.65);

      // De día no se ven: codigo/22-luz-de-la-hora.js ya sabe qué tan de
      // noche es (0 al mediodía, 1 de noche cerrada) con la hora real del
      // dispositivo. Multiplicar por ese número, en vez de un reloj
      // propio, de paso da un fundido suave al atardecer/amanecer.
      const deNoche = window.LuzDeLaHora ? window.LuzDeLaHora.deNoche : 0;
      c.alfa = c.picoDeAlfa * forma * deNoche;
    }
  }

  window.LienzoDeLuz.fauna = criaturas;
  window.LienzoDeLuz.animarLaFauna = animarLaFauna;

  } // fin de preparar()

})();
