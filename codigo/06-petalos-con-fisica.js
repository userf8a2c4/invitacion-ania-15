/* ══════════════════════════════════════════════════════════════════════
   06 · PÉTALOS CON FÍSICA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Hace caer pétalos de rosa por toda la pantalla, con dos gracias:
     1. no caen en línea recta, sino zigzagueando como un pétalo real
     2. si pasás el mouse cerca, se apartan girando y después retoman
        su caída

   CÓMO FUNCIONA UNA SIMULACIÓN DE FÍSICA (en criollo)
   Cada pétalo guarda dos cosas: DÓNDE está (posición) y HACIA DÓNDE va
   (velocidad). Sesenta veces por segundo hacemos lo mismo:

       1. sumamos a la velocidad todas las fuerzas que lo empujan
          (la gravedad hacia abajo, el viento a los costados, el mouse)
       2. sumamos esa velocidad a la posición
       3. lo dibujamos en el lugar nuevo

   Repitiendo eso muy rápido, el ojo ve movimiento natural.

   POR QUÉ TODO SE MULTIPLICA POR "dt"
   dt es el tiempo que pasó desde el cuadro anterior, en segundos. Si no
   lo usáramos, los pétalos caerían al doble de velocidad en una pantalla
   de 120 cuadros por segundo que en una de 60. Multiplicando por dt, el
   movimiento dura lo mismo en cualquier computadora.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Crear los pétalos
     3. Seguir el mouse
     4. Las fuerzas: gravedad, viento y mouse
     5. El bucle de animación
     6. Ahorro de batería y cambios de tamaño
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLaLluviaDePetalos() {

  // Hacen falta los tres planos; si falta alguno, no arrancamos
  if (!buscar('#petalos-fondo') || !buscar('#petalos-medio') || !buscar('#petalos-frente')) return;

  // Si la persona pidió menos movimiento, no dibujamos nada.
  if (prefiereMenosMovimiento()) return;


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────────
     Jugá con estos valores para cambiar la sensación. Están todos juntos
     a propósito, así no hay que bucear en el código.
     ---------------------------------------------------------------- */

  /* CUÁNTOS PÉTALOS Y EN QUÉ PLANO.
     El total es el mismo de antes: la idea NO es llenar la pantalla, sino
     repartir los que ya había en tres profundidades. Saturar arruinaría
     el efecto; lo que da riqueza es la separación entre planos, no la
     cantidad. */
  const esPantallaChica = window.innerWidth < 700;
  const REPARTO_POR_PLANO = esPantallaChica
    ? { fondo: 5, medio: 3, frente: 4 }
    : { fondo: 8, medio: 6, frente: 8 };

  /* Cada plano tiene su propio tamaño y su propia transparencia. Eso es
     lo que hace que se lean como distancias distintas y no como tres
     grupos del mismo tamaño superpuestos. */
  const RASGOS_DEL_PLANO = {
    fondo:  { contenedor: '#petalos-fondo',  tamaño: [7, 15],  opacidad: [.30, .55], caida: [14, 30] },
    medio:  { contenedor: '#petalos-medio',  tamaño: [12, 22], opacidad: [.60, .90], caida: [18, 40] },
    frente: { contenedor: '#petalos-frente', tamaño: [20, 34], opacidad: [.70, 1],   caida: [26, 54] },
  };

  /** Cuánto tira la gravedad hacia abajo (píxeles por segundo, al cuadrado). */
  const GRAVEDAD = 55;

  /** Cuánto frena el aire. 0.99 = pierde 1 % de velocidad por cuadro.
   *  Es lo que evita que los pétalos aceleren para siempre. */
  const ROZAMIENTO_DEL_AIRE = 0.99;

  /** Fuerza del vaivén lateral (el zigzag de la caída). */
  const FUERZA_DEL_VAIVEN = 48;

  /** A qué distancia del mouse empiezan a reaccionar los pétalos (píxeles). */
  const RADIO_DE_INFLUENCIA_DEL_MOUSE = 130;

  /** Con cuánta fuerza los empuja el mouse al acercarse. */
  const FUERZA_DE_EMPUJE = 1400;

  /** Cuánto los arrastra el movimiento del mouse (el "aire" de la mano). */
  const ARRASTRE_DEL_MOUSE = 0.22;

  /** Los tres dibujos de pétalo que se van alternando. */
  const IMAGENES_DE_PETALO = [
    'recursos/petalo-rosa-1.svg',
    'recursos/petalo-rosa-2.svg',
    'recursos/petalo-rosa-3.svg',
  ];


  /* ─── 2. CREAR LOS PÉTALOS ─────────────────────────────────────────
     Cada pétalo es un objeto con sus datos + el elemento que se ve en
     pantalla. Los creamos una sola vez y después los reciclamos: cuando
     uno sale por abajo, vuelve a aparecer arriba. Así nunca crece la
     cantidad de elementos y la web no se pone lenta.
     ---------------------------------------------------------------- */

  let anchoDePantalla = window.innerWidth;
  let altoDePantalla  = window.innerHeight;

  /** @type {Array<Object>} La lista de todos los pétalos. */
  const petalos = [];

  /**
   * Crea un pétalo con valores al azar y lo agrega a la pantalla.
   *
   * @param {boolean} empezarArriba - Si es true nace justo arriba del
   *        borde superior; si es false nace en cualquier altura (se usa
   *        al arrancar, para que no caigan todos juntos como un telón).
   * @returns {Object} El pétalo recién creado.
   */
  function crearPetalo(empezarArriba, plano) {
    const rasgos = RASGOS_DEL_PLANO[plano];
    const elemento = document.createElement('div');
    elemento.className = 'petalo';

    const tamaño = numeroAlAzar(rasgos.tamaño[0], rasgos.tamaño[1]);
    elemento.style.width  = tamaño + 'px';
    elemento.style.height = tamaño + 'px';
    elemento.style.backgroundImage = 'url(' + elegirAlAzar(IMAGENES_DE_PETALO) + ')';
    elemento.style.opacity = numeroAlAzar(rasgos.opacidad[0], rasgos.opacidad[1]).toFixed(2);

    buscar(rasgos.contenedor).appendChild(elemento);

    return {
      elemento,
      tamaño,
      plano,
      rasgos,
      x: numeroAlAzar(0, anchoDePantalla),
      y: empezarArriba ? numeroAlAzar(-120, -20) : numeroAlAzar(0, altoDePantalla),
      velocidadX: numeroAlAzar(-12, 12),
      velocidadY: numeroAlAzar(rasgos.caida[0], rasgos.caida[1]),
      angulo: numeroAlAzar(0, 360),
      velocidadAngular: numeroAlAzar(-45, 45),

      /* El vaivén de cada pétalo arranca en un momento distinto del ciclo
         (fase) y a distinta velocidad (frecuencia). Sin esto, los 22
         pétalos se moverían al unísono y se notaría el truco. */
      faseDelVaiven: numeroAlAzar(0, Math.PI * 2),
      frecuenciaDelVaiven: numeroAlAzar(0.5, 1.3),
    };
  }

  for (const plano of Object.keys(REPARTO_POR_PLANO)) {
    for (let i = 0; i < REPARTO_POR_PLANO[plano]; i++) {
      petalos.push(crearPetalo(false, plano));
    }
  }


  /* ─── 3. SEGUIR EL MOUSE ───────────────────────────────────────────
     Además de dónde está, nos interesa a qué velocidad se mueve: un
     manotazo rápido tiene que revolear los pétalos mucho más que un
     movimiento lento.
     ---------------------------------------------------------------- */
  let mouseX = -9999;          // arranca lejísimos: "no hay mouse todavía"
  let mouseY = -9999;
  let mouseXAnterior = -9999;
  let mouseYAnterior = -9999;
  let velocidadMouseX = 0;
  let velocidadMouseY = 0;

  document.addEventListener('mousemove', evento => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  });

  // Si el mouse se va de la ventana, dejamos de empujar.
  document.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });


  /* ─── 3b. EL RELICARIO COMO OBSTÁCULO ──────────────────────────────
     Los pétalos del plano medio no atraviesan el relicario: se posan
     sobre él y resbalan por su curva hasta soltarse. Para eso hace falta
     saber dónde está el óvalo en la pantalla, cuadro a cuadro.
     ---------------------------------------------------------------- */

  /** El óvalo del relicario en píxeles de pantalla, o null si no se ve. */
  let relicario = null;

  /**
   * Anota dónde está el relicario ahora mismo.
   *
   * Se llama UNA vez por cuadro, no una por pétalo: preguntar la posición
   * de un elemento obliga al navegador a recalcular la página, y hacerlo
   * 22 veces por cuadro la dejaría pegada.
   *
   * Los semiejes salen de la geometría del dibujo: el anillo exterior
   * mide rx 302 y ry 268 sobre un lienzo de 860 × 816.
   *
   * @returns {void}
   */
  function medirElRelicario() {
    const marco = buscar('.portada__marco');
    if (!marco) { relicario = null; return; }

    const caja = marco.getBoundingClientRect();

    // Si ya no se ve, no hay nada contra qué chocar: ahorramos el cálculo
    if (caja.width < 10 || caja.bottom < -150 || caja.top > altoDePantalla + 150) {
      relicario = null;
      return;
    }

    relicario = {
      centroX: caja.left + caja.width / 2,
      centroY: caja.top + caja.height / 2,
      rx: (302 / 860) * caja.width,
      ry: (268 / 816) * caja.height,
    };
  }

  /**
   * Hace que un pétalo se apoye en el relicario y resbale por su borde.
   *
   * CÓMO SE SABE SI ESTÁ ADENTRO
   * Una elipse cumple que (x/rx)² + (y/ry)² = 1 justo en su borde. Si esa
   * cuenta da menos de 1, el punto está adentro; si da más, afuera.
   *
   * CÓMO SE LO SACA
   * Se estira el vector desde el centro hasta que la cuenta dé 1 exacto.
   * Eso deposita el pétalo sobre la superficie por el camino más corto.
   *
   * CÓMO SE LOGRA QUE RESBALE
   * La velocidad se parte en dos: la parte que empuja CONTRA la superficie
   * se anula (si no, lo atravesaría) y la parte que va A LO LARGO se
   * conserva. Eso es deslizarse. Después la gravedad sigue tirando, y
   * como más abajo la superficie se curva hacia adentro, el pétalo se
   * despega solo y continúa su caída. No hay que programar el "soltarse":
   * sale gratis de la física.
   *
   * OJO CON LA NORMAL: en una elipse la perpendicular NO apunta al
   * centro (eso solo pasa en un círculo). Hay que dividir cada
   * componente por su semieje al cuadrado.
   *
   * @param {Object} petalo - El pétalo a evaluar.
   * @returns {void}
   */
  function apoyarseEnElRelicario(petalo) {
    if (!relicario) return;

    const centroDelPetaloX = petalo.x + petalo.tamaño / 2;
    const centroDelPetaloY = petalo.y + petalo.tamaño / 2;
    const distanciaX = centroDelPetaloX - relicario.centroX;
    const distanciaY = centroDelPetaloY - relicario.centroY;

    const u = distanciaX / relicario.rx;
    const v = distanciaY / relicario.ry;
    const cuentaDeLaElipse = u * u + v * v;

    // Afuera del óvalo (o justo en el centro, que daría división por cero)
    if (cuentaDeLaElipse >= 1 || cuentaDeLaElipse < 0.0001) return;

    // Depositarlo sobre la superficie
    const estiramiento = 1 / Math.sqrt(cuentaDeLaElipse);
    petalo.x += relicario.centroX + distanciaX * estiramiento - centroDelPetaloX;
    petalo.y += relicario.centroY + distanciaY * estiramiento - centroDelPetaloY;

    // Perpendicular a la superficie, de largo 1
    let normalX = distanciaX / (relicario.rx * relicario.rx);
    let normalY = distanciaY / (relicario.ry * relicario.ry);
    const largo = Math.hypot(normalX, normalY) || 1;
    normalX /= largo;
    normalY /= largo;

    // Anular lo que empuja hacia adentro, con un rebote mínimo
    const contraLaSuperficie = petalo.velocidadX * normalX + petalo.velocidadY * normalY;
    if (contraLaSuperficie < 0) {
      petalo.velocidadX -= contraLaSuperficie * normalX * 1.06;
      petalo.velocidadY -= contraLaSuperficie * normalY * 1.06;
    }

    /* Rozamiento al resbalar. El valor está calibrado, no elegido a ojo:
       con 0,93 el pétalo quedaba PEGADO al óvalo —perdía el 99 % de su
       velocidad por segundo y no llegaba nunca al borde—; con 0,995
       resbala unos 5 segundos y se suelta solo, que es el tiempo en que
       el gesto se lee como algo que se desliza y no como algo que se
       trabó. Si se sube más, patina como sobre hielo. */
    petalo.velocidadX *= 0.995;
    petalo.velocidadY *= 0.995;
    petalo.velocidadAngular *= 0.96;
  }


  /* ─── 4. LAS FUERZAS ───────────────────────────────────────────────
     Acá está el corazón de la simulación.
     ---------------------------------------------------------------- */

  /**
   * Aplica al pétalo el empujón del mouse, si está lo bastante cerca.
   *
   * LA IDEA: cuanto más cerca está el mouse, más fuerte es el empujón.
   * Usamos una caída "al cuadrado" (influencia × influencia) para que el
   * efecto sea muy suave en el borde del radio y bien marcado en el
   * centro. Si fuera lineal, se sentiría artificial.
   *
   * Además el pétalo GIRA, porque el aire que mueve la mano no lo empuja
   * derecho: lo hace voltear. Eso se calcula con el "producto cruzado"
   * entre la dirección del pétalo y la dirección del mouse, que dice
   * hacia qué lado tiene que girar.
   *
   * @param {Object} petalo - El pétalo a empujar.
   * @param {number} dt     - Segundos transcurridos desde el cuadro anterior.
   * @returns {void}
   */
  function aplicarEmpujeDelMouse(petalo, dt) {
    // Distancia entre el centro del pétalo y el mouse
    const distanciaX = (petalo.x + petalo.tamaño / 2) - mouseX;
    const distanciaY = (petalo.y + petalo.tamaño / 2) - mouseY;
    const distancia = Math.hypot(distanciaX, distanciaY);   // teorema de Pitágoras

    // Si está lejos, no pasa nada. El +0.01 evita dividir por cero
    // cuando el mouse queda justo encima del pétalo.
    if (distancia > RADIO_DE_INFLUENCIA_DEL_MOUSE || distancia < 0.01) return;

    // influencia vale 1 pegado al mouse y 0 en el borde del radio
    const influencia = 1 - (distancia / RADIO_DE_INFLUENCIA_DEL_MOUSE);
    const influenciaSuavizada = influencia * influencia;

    // Dirección "desde el mouse hacia el pétalo", de largo 1
    const direccionX = distanciaX / distancia;
    const direccionY = distanciaY / distancia;

    // a) Empujón hacia afuera
    petalo.velocidadX += direccionX * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;
    petalo.velocidadY += direccionY * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;

    // b) Arrastre: el pétalo se lleva parte de la velocidad de la mano
    petalo.velocidadX += velocidadMouseX * ARRASTRE_DEL_MOUSE * influenciaSuavizada;
    petalo.velocidadY += velocidadMouseY * ARRASTRE_DEL_MOUSE * influenciaSuavizada;

    // c) Giro provocado por el roce del aire
    const torsion = (direccionX * velocidadMouseY - direccionY * velocidadMouseX);
    petalo.velocidadAngular += torsion * 0.035 * influenciaSuavizada;
  }

  /**
   * Adelanta un pétalo un cuadro de animación.
   *
   * @param {Object} petalo   - El pétalo a mover.
   * @param {number} dt       - Segundos desde el cuadro anterior.
   * @param {number} tiempo   - Segundos desde que arrancó la animación
   *                            (se usa para el vaivén).
   * @returns {void}
   */
  function moverPetalo(petalo, dt, tiempo) {
    // FUERZA 1 · Gravedad: siempre hacia abajo
    petalo.velocidadY += GRAVEDAD * dt;

    // FUERZA 2 · Viento: una onda suave que lo lleva a un lado y al otro.
    // Math.sin va y viene entre −1 y 1 eternamente: perfecto para un
    // movimiento de péndulo que nunca se repite exacto entre pétalos.
    const vaiven = Math.sin(tiempo * petalo.frecuenciaDelVaiven + petalo.faseDelVaiven);
    petalo.velocidadX += vaiven * FUERZA_DEL_VAIVEN * dt;

    // FUERZA 3 · El mouse
    aplicarEmpujeDelMouse(petalo, dt);

    // ROZAMIENTO: frena todo un poquito cada cuadro.
    // Math.pow(0.99, dt*60) es "aplicar el 0.99 tantas veces como cuadros
    // hayan pasado", para que frene igual en cualquier pantalla.
    const frenado = Math.pow(ROZAMIENTO_DEL_AIRE, dt * 60);
    petalo.velocidadX *= frenado;
    petalo.velocidadY *= frenado;
    petalo.velocidadAngular *= frenado;

    // Tope de giro, para que nunca parezca una hélice
    petalo.velocidadAngular = limitar(petalo.velocidadAngular, -420, 420);

    // POSICIÓN = posición anterior + velocidad × tiempo
    petalo.x += petalo.velocidadX * dt;
    petalo.y += petalo.velocidadY * dt;
    petalo.angulo += petalo.velocidadAngular * dt;

    /* CHOQUE CON EL RELICARIO.
       Va DESPUÉS de mover el pétalo y antes de dibujarlo: primero se lo
       deja avanzar, y si terminó metido dentro del óvalo se lo devuelve a
       la superficie. Resolver el choque después del movimiento es lo que
       garantiza que nunca se vea atravesarlo, ni por un cuadro.

       Solo el plano del medio choca: el de atrás pasa por detrás y el de
       adelante por delante, que es justamente lo que da la sensación de
       que el relicario está flotando entre capas de pétalos. */
    if (petalo.plano === 'medio') {
      apoyarseEnElRelicario(petalo);
    }

    // RECICLADO: si salió por abajo, vuelve a nacer arriba
    if (petalo.y > altoDePantalla + 60) {
      petalo.y = numeroAlAzar(-120, -30);
      petalo.x = numeroAlAzar(0, anchoDePantalla);
      petalo.velocidadX = numeroAlAzar(-12, 12);
      petalo.velocidadY = numeroAlAzar(petalo.rasgos.caida[0], petalo.rasgos.caida[1]);
      petalo.velocidadAngular = numeroAlAzar(-45, 45);
    }

    // Si se fue por un costado, reaparece por el otro
    if (petalo.x < -60) petalo.x = anchoDePantalla + 40;
    if (petalo.x > anchoDePantalla + 60) petalo.x = -40;

    // DIBUJAR: una sola instrucción de transform, que es lo más barato
    // que existe para el navegador.
    petalo.elemento.style.transform =
      `translate3d(${petalo.x.toFixed(1)}px, ${petalo.y.toFixed(1)}px, 0) ` +
      `rotate(${petalo.angulo.toFixed(1)}deg)`;
  }


  /* ─── 5. EL BUCLE DE ANIMACIÓN ─────────────────────────────────── */
  let momentoDelCuadroAnterior = performance.now();
  let tiempoTranscurrido = 0;
  let animacionActiva = true;

  /**
   * Se ejecuta una vez por cuadro. Calcula cuánto tiempo pasó y mueve
   * todos los pétalos.
   *
   * @param {number} momentoActual - Marca de tiempo que da el navegador.
   * @returns {void}
   */
  function dibujarCuadro(momentoActual) {
    if (!animacionActiva) return;

    // dt en segundos. Se limita a 0,05 (20 cuadros por segundo) porque si
    // la pestaña estuvo minimizada, el salto sería enorme y los pétalos
    // aparecerían teletransportados.
    const dt = Math.min((momentoActual - momentoDelCuadroAnterior) / 1000, 0.05);
    momentoDelCuadroAnterior = momentoActual;
    tiempoTranscurrido += dt;

    // Velocidad del mouse: cuánto se movió desde el cuadro anterior.
    if (mouseXAnterior > -9000 && dt > 0) {
      velocidadMouseX = (mouseX - mouseXAnterior) / dt * 0.016;
      velocidadMouseY = (mouseY - mouseYAnterior) / dt * 0.016;
    }
    mouseXAnterior = mouseX;
    mouseYAnterior = mouseY;

    // Una sola medición del relicario para los 22 pétalos
    medirElRelicario();

    for (const petalo of petalos) {
      moverPetalo(petalo, dt, tiempoTranscurrido);
    }

    requestAnimationFrame(dibujarCuadro);
  }
  requestAnimationFrame(dibujarCuadro);


  /* ─── 6. AHORRO DE BATERÍA Y CAMBIOS DE TAMAÑO ─────────────────── */

  // Si la persona cambia de pestaña, frenamos todo: no tiene sentido
  // gastar batería animando algo que nadie está mirando.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animacionActiva = false;
    } else {
      animacionActiva = true;
      momentoDelCuadroAnterior = performance.now();   // evita un salto feo
      requestAnimationFrame(dibujarCuadro);
    }
  });

  // Si se cambia el tamaño de la ventana, actualizamos las medidas.
  window.addEventListener('resize', () => {
    anchoDePantalla = window.innerWidth;
    altoDePantalla  = window.innerHeight;
  });

})();
