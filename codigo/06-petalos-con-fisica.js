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

  /* No se corta acá aunque las animaciones estén apagadas: los pétalos se
     preparan igual y el bucle queda en reposo (ver el guard del bucle). En
     modo apagado, el CSS los esconde (un pétalo congelado en el aire se
     vería raro). Si se encienden con el botón, empiezan a caer al instante,
     sin recargar. */


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────────
     Jugá con estos valores para cambiar la sensación. Están todos juntos
     a propósito, así no hay que bucear en el código.
     ---------------------------------------------------------------- */

  /* CUÁNTOS PÉTALOS Y EN QUÉ PLANO.
     La idea NO es llenar la pantalla, sino repartirlos en tres
     profundidades. Saturar arruinaría el efecto; lo que da riqueza es la
     separación entre planos, no la cantidad.

     Este reparto es el de CALIDAD ALTA, y se crea SIEMPRE, en todos los
     niveles. Cuántos están ACTIVOS lo decide después el nivel de calidad
     (ver ajustarCantidadDePetalos): en media se mueve un 60 % y en baja un
     35 %, y los demás quedan escondidos sin calcularse.

     Se crean todos de entrada a propósito: crear un pétalo cuesta una sola
     vez, pero si solo se creara la cantidad del nivel inicial, un equipo que
     MEJORA de media a alta nunca vería los pétalos extra —tendría que
     recargar la página—. Así, subir de nivel se nota en el acto. */
  const esPantallaChica = window.innerWidth < 700;

  const REPARTO_POR_PLANO = esPantallaChica
    ? { fondo: 8,  medio: 5,  frente: 6 }
    : { fondo: 14, medio: 10, frente: 12 };

  /* Cada plano tiene su propio tamaño y su propia transparencia. Eso es
     lo que hace que se lean como distancias distintas y no como tres
     grupos del mismo tamaño superpuestos. */
  /* ⚠️ LOS TAMAÑOS SUBIERON DOS VECES, Y NO ES CAPRICHO.
     Primero eran [7,15] / [12,22] / [20,34] y se leían como MIGAJAS: a
     7 px un pétalo de rosa es un punto, sin forma ni nervadura visible.
     Se subieron a [13,26] / [22,40] / [36,62] y todavía se sentían
     chicos, así que subieron otra vez a [18,35] / [30,54] / [48,84].

     Pero esos son px FIJOS, y las rosas del marco NO lo son: la
     enredadera se achica con --marco-grosor (un clamp que depende del
     ancho de pantalla), así que en un teléfono las rosas terminan siendo
     3 veces más chicas que en escritorio mientras el pétalo se queda
     igual de grande — un pétalo de 84px tapando una rosa diminuta.

     Por eso, igual que REPARTO_POR_PLANO de arriba, el tamaño también
     depende de esPantallaChica: en móvil se bajan a ~55%, proporción
     parecida a la que ya tienen las rosas achicadas. Mismas tres
     proporciones entre planos en los dos casos. Costo: cero (son las
     mismas constantes de siempre) y hasta BAJA en móvil, porque hay
     menos área de pétalo para pintar por cuadro. */
  const RASGOS_DEL_PLANO = esPantallaChica ? {
    fondo:  { contenedor: '#petalos-fondo',  tamaño: [10, 19], opacidad: [.30, .55], caida: [14, 30] },
    medio:  { contenedor: '#petalos-medio',  tamaño: [16, 30], opacidad: [.60, .90], caida: [18, 40] },
    frente: { contenedor: '#petalos-frente', tamaño: [26, 46], opacidad: [.70, 1],   caida: [26, 54] },
  } : {
    fondo:  { contenedor: '#petalos-fondo',  tamaño: [18, 35], opacidad: [.30, .55], caida: [14, 30] },
    medio:  { contenedor: '#petalos-medio',  tamaño: [30, 54], opacidad: [.60, .90], caida: [18, 40] },
    frente: { contenedor: '#petalos-frente', tamaño: [48, 84], opacidad: [.70, 1],   caida: [26, 54] },
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

  /* ⚡ TECHO DE VELOCIDAD — POR QUÉ HACÍA FALTA.
     FUERZA_DE_EMPUJE se pensó para un MOUSE, que atraviesa el radio de
     influencia en un par de cuadros de un movimiento continuo. Un DEDO se
     queda quieto encima de un pétalo varios cientos de milisegundos —no
     "pasa de largo", "se queda"—, y ahí el empujón compone cuadro a
     cuadro sin nada que lo frene de verdad (ROZAMIENTO_DEL_AIRE solo saca
     un 1 % por cuadro): la velocidad de régimen ronda los 2300 px/s,
     suficiente para cruzar una pantalla de celular en menos de 200 ms.
     Eso es lo que se sentía como "el pétalo sale disparado" en vez de "el
     viento lo aparta". `velocidadAngular` ya tenía este mismo tipo de
     techo (ver el `limitar(...)` más abajo); a `velocidadX/Y` les
     faltaba. El número es a ojo — se puede subir o bajar según cómo se
     sienta el empujón, igual que se ajustó el tope de giro. */
  const VELOCIDAD_MAXIMA_DEL_EMPUJE = 320;   // px/s

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

  /** ¿Dibuja el lienzo de pétalos? (ver codigo/24-lienzo-de-petalos.js).
   *  Se decide una vez, al cargar. */
  const usaElLienzo = !!(window.LienzoDePetalos && window.LienzoDePetalos.activo);

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
    const tamaño = numeroAlAzar(rasgos.tamaño[0], rasgos.tamaño[1]);
    const opacidad = numeroAlAzar(rasgos.opacidad[0], rasgos.opacidad[1]);

    let elemento = null;
    let imagen = null;

    if (usaElLienzo) {
      /* ⚡ SIN ELEMENTO. El pétalo pasa a ser solo números que dibuja
         codigo/24-lienzo-de-petalos.js. Así deja de costar una capa de
         compositor (Layerize) o un repintado por cuadro (Paint), que era el
         intercambio del que no se podía salir mientras fuera un div. */
      imagen = elegirAlAzar(window.LienzoDePetalos.imagenes);
    } else {
      elemento = document.createElement('div');
      elemento.className = 'petalo';
      elemento.style.width  = tamaño + 'px';
      elemento.style.height = tamaño + 'px';
      elemento.style.backgroundImage = 'url(' + elegirAlAzar(IMAGENES_DE_PETALO) + ')';
      elemento.style.opacity = opacidad.toFixed(2);
      buscar(rasgos.contenedor).appendChild(elemento);
    }

    return {
      elemento,
      imagen,
      opacidad,
      tamaño,
      plano,
      rasgos,
      activo: true,   // el gobernador de rendimiento puede desactivar algunos


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
      const petalo = crearPetalo(false, plano);
      petalos.push(petalo);
      // El lienzo dibuja cada plano por separado, para respetar la profundidad.
      if (usaElLienzo) window.LienzoDePetalos.planos[plano].push(petalo);
    }
  }


  /* ─── CALIDAD GRÁFICA ADAPTATIVA ─────────────────────────────────────
     Se crean SIEMPRE todos los pétalos (el reparto de arriba, que es el
     de calidad ALTA): la cantidad de elementos en el DOM no cambia nunca,
     así no hay que crear ni destruir nada en vivo. Lo que cambia por nivel
     es cuántos quedan ACTIVOS:
        · alta  → el 100 %.
        · media → un 65 % (se ve casi tan poblado, cuesta bastante menos).
        · baja  → un 35 % (el resto se esconde y el bucle los saltea, así
          ni se dibujan ni se calculan).
     codigo/21-monitor-de-rendimiento.js manda el nivel —el de arranque
     (para no empezar de más y tener que recortar a los dos segundos) y
     cada vez que lo corrige en vivo—. El invitado no ve el recorte: ve
     una web que se mantiene fluida. ---------------------------------- */
  /* Fracciones sobre el total creado (que es el de calidad ALTA). En una
     pantalla de escritorio son 36 pétalos: alta los mueve todos, media 22 y
     baja 13 — o sea, media y baja quedan en la MISMA cantidad de siempre, y
     lo que cambia es que alta ahora tiene bastante más. */
  /* Fracciones sobre el total creado (36 en escritorio, el de calidad alta):
     alta los mueve todos, media 28 y baja 18. Media y baja SUBIERON respecto
     de antes (eran 22 y 13) porque se liberó mucho margen: los pétalos ya no
     piden capa de GPU en esos niveles y se recuperaron las 24 capas que
     gastaban los SVG de las plantas. */
  const FRACCION_ACTIVA_POR_CALIDAD = { 0: 1, 1: 0.78, 2: 0.5 };

  function ajustarCantidadDePetalos(calidad) {
    const fraccion = FRACCION_ACTIVA_POR_CALIDAD[calidad] ?? 1;
    const cuantosActivos = Math.ceil(petalos.length * fraccion);

    petalos.forEach((petalo, i) => {
      const activo = i < cuantosActivos;
      if (petalo.activo !== activo) {
        petalo.activo = activo;
        // Con el lienzo alcanza con la marca: el canvas saltea los apagados.
        if (petalo.elemento) petalo.elemento.style.display = activo ? '' : 'none';
      }
    });
  }

  // Se aplica YA, con la estimación de arranque: nada de flash de más.
  ajustarCantidadDePetalos(nivelDeCalidad());

  document.addEventListener('calidad-cambio', evento => {
    ajustarCantidadDePetalos((evento.detail && evento.detail.calidad) ?? 0);
  });


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

  /* Una sola entrada para el mouse Y el dedo: pointermove cubre los dos. Va
     passive para no bloquear el scroll en el celular —los pétalos se apartan
     del dedo mientras se desliza, sin trabar el gesto—. */
  function alMoverPuntero(evento) {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }
  document.addEventListener('pointermove', alMoverPuntero, { passive: true });
  document.addEventListener('pointerdown', alMoverPuntero, { passive: true });

  /* Dejamos de empujar cuando el mouse se va de la ventana o cuando el dedo
     se levanta. OJO: en un mouse, soltar el clic (pointerup) NO tiene que
     apagar el empuje —el mouse sigue ahí—; por eso solo se resetea con el
     dedo (pointerType 'touch') o al salir con el mouse. */
  function soltarPuntero(evento) {
    if (!evento || evento.type === 'mouseleave' || evento.pointerType === 'touch') {
      mouseX = -9999;
      mouseY = -9999;
      // Si no se resetean también estos, la velocidad calculada en el
      // próximo cuadro usa el salto a -9999 como si fuera un manotazo real
      // y queda congelada en un valor enorme hacia la izquierda para siempre.
      mouseXAnterior = -9999;
      mouseYAnterior = -9999;
      velocidadMouseX = 0;
      velocidadMouseY = 0;
    }
  }
  document.addEventListener('mouseleave', soltarPuntero);
  document.addEventListener('pointerup', soltarPuntero);
  /* ⚡ 'pointercancel' TAMBIÉN TIENE QUE SOLTAR — ESTO ES LO QUE ARREGLA EL
     "SALE DISPARADO SIEMPRE HACIA LA IZQUIERDA" EN CELULAR.
     En el teléfono, la manera más común de terminar un toque NO es
     levantar el dedo quieto: es deslizarlo para hacer SCROLL. Cuando el
     navegador reconoce ese deslizamiento como un gesto de scroll, cancela
     la secuencia del puntero con 'pointercancel' EN VEZ DE 'pointerup' —y
     acá solo se escuchaba 'pointerup'. El resultado: cada vez que alguien
     scrolleaba con el dedo, mouseX/mouseXAnterior quedaban CONGELADOS en
     el punto donde el dedo tocó por última vez, sin pasar nunca por el
     reseteo de arriba.

     Como en un celular casi cualquier gesto por la pantalla termina en
     scroll (es la forma normal de navegar la página), esto pasaba
     constantemente. El siguiente toque deliberado —tocar un pétalo en
     cualquier parte— arrancaba con mouseXAnterior todavía apuntando a
     ese punto viejo y ajeno, en vez de al punto real del toque anterior.
     La cuenta de velocidad (`(mouseX - mouseXAnterior) / dt * 0.016`) se
     hacía entonces entre el pétalo tocado AHORA y un punto de scroll de
     hace rato —normalmente más a la derecha, porque así se scrollea con
     el pulgar—, y esa resta grande y siempre con el mismo signo es
     exactamente el "siempre hacia la izquierda, y de un tirón" que se
     reportó: no era un empujón de verdad, era el salto congelado del
     comentario de arriba, con la única diferencia de que acá el reseteo
     nunca había llegado a ocurrir. */
  document.addEventListener('pointercancel', soltarPuntero);
  document.addEventListener('pointercancel', soltarPuntero);


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
   * ⚡ YA NO TOCA EL DOM. Antes esto llamaba getBoundingClientRect() en
   * CADA cuadro sobre el SVG más grande de la página —y 17-joyas-
   * colgantes.js hacía exactamente lo mismo por su cuenta, así que era el
   * doble de lecturas de las que hacían falta—. Ahora ambos leen
   * medidaDelRelicario() (02-utilidades.js), que mide una sola vez —al
   * cargar y en cada resize— y acá solo se hace una resta con el scroll.
   *
   * Los semiejes salen de la geometría del dibujo: el anillo exterior
   * mide rx 302 y ry 268 sobre un lienzo de 860 × 816.
   *
   * @returns {void}
   */
  function medirElRelicario() {
    const caja = medidaDelRelicario();
    if (!caja) { relicario = null; return; }

    // Si ya no se ve, no hay nada contra qué chocar: ahorramos el cálculo
    if (caja.width < 10 || caja.top + caja.height < -150 || caja.top > altoDePantalla + 150) {
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
   * ⚡ SIN RAÍZ CUADRADA SALVO QUE HAGA FALTA (antes se pagaba siempre).
   * Antes, `Math.hypot` —una raíz cuadrada— se calculaba para los ~36
   * pétalos en CADA cuadro, para descartarse un renglón después en la
   * inmensa mayoría de los casos (el mouse casi nunca está cerca de todos
   * a la vez). Lighthouse midió esto como una de las tareas largas más
   * caras de toda la web (hasta 491ms de un tirón). Ahora se compara
   * primero la distancia AL CUADRADO contra el radio al cuadrado —álgebra
   * pura, sin raíz— y solo se llama Math.hypot para los pocos pétalos que
   * ya se sabe que están dentro del radio y necesitan la dirección
   * normalizada. `distancia > R` y `distancia² > R²` son la misma
   * condición (los dos lados son siempre positivos), así que el resultado
   * visual es idéntico. También se sale de una sola vez si no hay puntero
   * activo (mouseX en su valor inicial -9999): ningún pétalo puede estar
   * a menos de 130px de ahí, es matemáticamente imposible que entre.
   *
   * @param {Object} petalo         - El pétalo a empujar.
   * @param {number} dt             - Segundos transcurridos desde el cuadro anterior.
   * @param {number} escalaDelCuadro - dt ya normalizado a "cuadros de 60 Hz"
   *        (ver la nota junto a su cálculo, en dibujarCuadro) — idéntico
   *        para todos los pétalos de este cuadro, por eso se calcula una
   *        sola vez ahí y se pasa acá en vez de recalcularlo por pétalo.
   * @returns {void}
   */
  function aplicarEmpujeDelMouse(petalo, dt, escalaDelCuadro) {
    // Sin puntero activo no hay nada que calcular.
    if (mouseX === -9999) return;

    // Distancia entre el centro del pétalo y el mouse
    const distanciaX = (petalo.x + petalo.tamaño / 2) - mouseX;
    const distanciaY = (petalo.y + petalo.tamaño / 2) - mouseY;

    // Descarte barato, sin raíz: equivalente exacto a comparar la
    // distancia real contra el radio (ver la nota grande de arriba).
    const distanciaAlCuadrado = distanciaX * distanciaX + distanciaY * distanciaY;
    const radioAlCuadrado = RADIO_DE_INFLUENCIA_DEL_MOUSE * RADIO_DE_INFLUENCIA_DEL_MOUSE;
    // El 0.0001 (0.01²) evita dividir por cero cuando el mouse queda
    // justo encima del pétalo — mismo umbral de siempre, al cuadrado.
    if (distanciaAlCuadrado > radioAlCuadrado || distanciaAlCuadrado < 0.0001) return;

    const distancia = Math.hypot(distanciaX, distanciaY);   // teorema de Pitágoras

    // influencia vale 1 pegado al mouse y 0 en el borde del radio
    const influencia = 1 - (distancia / RADIO_DE_INFLUENCIA_DEL_MOUSE);
    const influenciaSuavizada = influencia * influencia;

    // Dirección "desde el mouse hacia el pétalo", de largo 1
    const direccionX = distanciaX / distancia;
    const direccionY = distanciaY / distancia;

    // a) Empujón hacia afuera
    petalo.velocidadX += direccionX * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;
    petalo.velocidadY += direccionY * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;

    // b) Arrastre: el pétalo se lleva parte de la velocidad de la mano.
    //
    // ⚡ ESCALADO POR dt — POR QUÉ HACÍA FALTA.
    // velocidadMouseX/Y ya viene normalizada a "distancia por cuadro de
    // 60 Hz" (ver el `* 0.016` fijo en dibujarCuadro), pero acá se SUMABA
    // una vez por cuadro de física sin volver a tener en cuenta cuánto duró
    // ese cuadro. En una pantalla de 60 Hz eso es correcto (cada cuadro
    // dura ~16 ms, coincide con la normalización); en una de 90 o 120 Hz,
    // el mismo empujón se aplicaba más veces por segundo real, así que el
    // arrastre pegaba más fuerte cuanto mejor la pantalla del invitado.
    // Dividiendo por esos mismos 0.016 ms de referencia, el total por
    // segundo queda igual sin importar la tasa de refresco.
    //
    // ⚡ escalaDelCuadro YA NO SE CALCULA ACÁ (era `dt / 0.016`, y era el
    // mismo valor para los ~36 pétalos del cuadro): ahora llega calculado
    // una sola vez desde dibujarCuadro. Ver la nota del parámetro arriba.
    petalo.velocidadX += velocidadMouseX * ARRASTRE_DEL_MOUSE * influenciaSuavizada * escalaDelCuadro;
    petalo.velocidadY += velocidadMouseY * ARRASTRE_DEL_MOUSE * influenciaSuavizada * escalaDelCuadro;

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
   * @param {number} frenadoDelCuadro - Math.pow(ROZAMIENTO_DEL_AIRE, dt*60)
   *        ya calculado en dibujarCuadro (mismo valor para TODOS los
   *        pétalos de este cuadro, porque dt es el mismo para todos —
   *        antes se recalculaba ~36 veces por cuadro con el mismo `dt`).
   * @param {number} escalaDelCuadro - dt normalizado a "cuadros de 60 Hz",
   *        también calculado una sola vez en dibujarCuadro por el mismo motivo.
   * @returns {void}
   */
  function moverPetalo(petalo, dt, tiempo, frenadoDelCuadro, escalaDelCuadro) {
    // FUERZA 1 · Gravedad: siempre hacia abajo
    petalo.velocidadY += GRAVEDAD * dt;

    // FUERZA 2 · Viento: una onda suave que lo lleva a un lado y al otro.
    // Math.sin va y viene entre −1 y 1 eternamente: perfecto para un
    // movimiento de péndulo que nunca se repite exacto entre pétalos.
    const vaiven = Math.sin(tiempo * petalo.frecuenciaDelVaiven + petalo.faseDelVaiven);
    petalo.velocidadX += vaiven * FUERZA_DEL_VAIVEN * dt;

    // FUERZA 3 · El mouse
    aplicarEmpujeDelMouse(petalo, dt, escalaDelCuadro);

    // ROZAMIENTO: frena todo un poquito cada cuadro.
    // Math.pow(0.99, dt*60) es "aplicar el 0.99 tantas veces como cuadros
    // hayan pasado", para que frene igual en cualquier pantalla. Ya viene
    // calculado desde dibujarCuadro (ver JSDoc de frenadoDelCuadro arriba).
    petalo.velocidadX *= frenadoDelCuadro;
    petalo.velocidadY *= frenadoDelCuadro;
    petalo.velocidadAngular *= frenadoDelCuadro;

    // Tope de giro, para que nunca parezca una hélice
    petalo.velocidadAngular = limitar(petalo.velocidadAngular, -420, 420);

    // Tope de velocidad lineal: el empujón del mouse/dedo aparta, no dispara
    // (ver VELOCIDAD_MAXIMA_DEL_EMPUJE más arriba).
    petalo.velocidadX = limitar(petalo.velocidadX, -VELOCIDAD_MAXIMA_DEL_EMPUJE, VELOCIDAD_MAXIMA_DEL_EMPUJE);
    petalo.velocidadY = limitar(petalo.velocidadY, -VELOCIDAD_MAXIMA_DEL_EMPUJE, VELOCIDAD_MAXIMA_DEL_EMPUJE);

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

    /* Si se fue por un costado, reaparece por el otro.
       ⚡ ACÁ TAMBIÉN SE FRENA LA VELOCIDAD, Y ES POR ESTO: un pétalo
       empujado con fuerza hacia un borde salía de pantalla y volvía a
       entrar por el otro lado CONSERVANDO toda su velocidad (a diferencia
       del reciclado de abajo, unas líneas más arriba, que sí la
       reiniciaba). Al ojo eso no se lee como "cruzó y volvió": se lee
       como "salió disparado de la nada" desde el borde de reaparición —
       y como reaparece siempre del lado opuesto al que se lo empujó, es
       lo que se venía viendo como "siempre hacia la izquierda" cuando en
       realidad el empujón podía haber sido hacia cualquier lado. Con el
       techo de velocidad de más arriba esto ya casi no debería pasar,
       pero conservar velocidad en un teletransporte es incorrecto de
       todas formas, pase lo que pase con el resto. */
    if (petalo.x < -60) { petalo.x = anchoDePantalla + 40; petalo.velocidadX *= 0.2; }
    if (petalo.x > anchoDePantalla + 60) { petalo.x = -40; petalo.velocidadX *= 0.2; }

    /* ⚡ CON EL LIENZO NO SE ESCRIBE NADA ACÁ.
       La posición y el giro ya quedaron en petalo.x / .y / .angulo, y el
       canvas los lee cuando pinta. Esas dos líneas de abajo eran 29
       escrituras de estilo por cuadro; ahora son cero. */
    if (usaElLienzo) return;

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
    if (!animacionActiva) return;   // pausa por pestaña oculta

    /* Sin nadie mirando —sobre todavía cerrado, pestaña de fondo, o
       animaciones apagadas por botón o accesibilidad— el bucle sigue vivo
       pero no mueve pétalos. Listo para reanudar en vivo.

       El reloj se adelanta igual (momentoDelCuadroAnterior) aunque no se
       mueva nada: si no, al reanudar el `dt` sería el de todo el rato que
       estuvo detenido y los pétalos aparecerían teletransportados. */
    if (!hayAlgoQueMirar()) {
      momentoDelCuadroAnterior = momentoActual;
      requestAnimationFrame(dibujarCuadro);
      return;
    }

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

    // Una sola medición del relicario para todos los pétalos
    medirElRelicario();

    /* ⚡ CALCULADOS ACÁ, UNA SOLA VEZ POR CUADRO — antes cada pétalo (hasta
       36) los recalculaba con el mismo `dt` de entrada, o sea el mismo
       resultado ~36 veces. Lighthouse midió esto entre las tareas largas
       más caras del sitio. Ver JSDoc de moverPetalo/aplicarEmpujeDelMouse. */
    const frenadoDelCuadro = Math.pow(ROZAMIENTO_DEL_AIRE, dt * 60);
    const escalaDelCuadro = dt / 0.016;

    for (const petalo of petalos) {
      if (!petalo.activo) continue;   // desactivado por el gobernador: se saltea
      moverPetalo(petalo, dt, tiempoTranscurrido, frenadoDelCuadro, escalaDelCuadro);
    }

    /* ⚡ ACÁ SE DIBUJA TAMBIÉN, EN VEZ DE QUE 24-lienzo-de-petalos.js TENGA
       SU PROPIO requestAnimationFrame. Los dos hacían exactamente lo mismo
       cuadro a cuadro (uno calcula, el otro pinta lo que el primero
       calculó), así que tenerlos desacoplados solo sumaba un callback de
       rAF de más compitiendo por el hilo principal — sin ganar nada, ya
       que uno siempre tiene que ir después del otro. Mismo criterio que ya
       usa el lienzo de luz con motas y fauna. */
    if (window.LienzoDePetalos.activo && window.LienzoDePetalos.pintarUnCuadro) {
      window.LienzoDePetalos.pintarUnCuadro();
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
