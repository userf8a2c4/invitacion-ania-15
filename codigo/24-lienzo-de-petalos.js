/* ══════════════════════════════════════════════════════════════════════
   24 · EL LIENZO DE PÉTALOS
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dibuja los pétalos que caen en tres <canvas> —uno por plano de
   profundidad— en vez de en 29 divs.

   POR QUÉ EXISTE (la lección que costó varias rondas)
   Un elemento del DOM que se anima cuesta de una de dos formas, y no hay
   una tercera:

     · SIN capa de compositor → el navegador lo REPINTA entero en cada
       cuadro. Con los pétalos así, "Paint" llegó al 44,7 % del perfil.
     · CON capa (will-change) → deja de repintarse, pero suma una capa que
       "Layerize" tiene que administrar. Al ponérselo a los 29, "Paint" bajó
       a la mitad… y "Layerize" se quedó clavado en el 27,6 %.

   O sea: se cambiaba un costo por el otro. La única salida real es que
   dejen de ser elementos del DOM.

   Y hay precedente medido: los tres sistemas de luz, ya mudados al lienzo
   (codigo/23-lienzo-de-luz.js), cuestan 0,4 ms por cuadro ENTRE TODOS.

   POR QUÉ TRES CANVAS Y NO UNO
   Los pétalos viven en tres planos con contenido de la página en medio:
   el de fondo va detrás de todo (z-index 1), el del medio se cuela entre
   el relicario y su texto (3), y el de frente pasa por delante de casi
   todo (50). Un solo canvas no puede intercalarse a tres alturas
   distintas. Con tres, se conserva exactamente la misma profundidad… y
   siguen siendo 3 capas en vez de 29.

   SI ALGO SE VE MAL
   Abrir con  ?petalos=dom  y vuelve el sistema de divs al instante.
   ══════════════════════════════════════════════════════════════════════ */

(function elLienzoDePetalos() {

  const parametros = new URLSearchParams(location.search);
  const USAR_LIENZO = parametros.get('petalos') !== 'dom';

  /* Registro público: 06-petalos-con-fisica.js pregunta acá si tiene que
     crear divs o solo mantener números. */
  window.LienzoDePetalos = { activo: USAR_LIENZO, planos: {} };

  if (!USAR_LIENZO) return;

  /* ⚡ DOS LIENZOS, NO TRES — Y EL PORQUÉ, QUE SE COMPROBÓ MIRANDO EL MAPA
     COMPLETO DE z-index ANTES DE TOCAR NADA.

     El apilado real de la página es este:

         z-1   pétalos FONDO
         z-2   el contenido (secciones, marco del relicario)
         z-3   pétalos MEDIO      ← caen sobre el marco del relicario
         z-4   el nombre "ANIA"   ← no se tapa con nada
         z-50  pétalos FRENTE

     · FONDO no se puede fusionar con nada: el contenido está justo encima
       de él, y juntarlo con los otros pondría los pétalos de atrás POR
       DELANTE del texto. Se queda solo.

     · MEDIO y FRENTE sí, porque entre z-4 y z-50 no hay absolutamente nada
       más. Lo único que los separaba era el nombre de Ania, y eso se
       resuelve subiendo el nombre a 51 (ver estilos/04-portada.css).

     Resultado: una capa a pantalla completa menos. En la pantalla objetivo
     —3305 px de ancho— eso son 2,6 millones de píxeles menos de compositing
     en cada cuadro, y esta página está limitada por tasa de relleno.

     La profundidad no se pierde: como dice el propio módulo de física, lo
     que separa un plano de otro es el TAMAÑO y la OPACIDAD, no el apilado. */
  const LIENZOS = [
    { contenedor: '#petalos-fondo',  planos: ['fondo'] },
    { contenedor: '#petalos-frente', planos: ['medio', 'frente'] },
  ];

  /** Los mismos tres dibujos de pétalo de siempre, precargados como
   *  imágenes para poder estamparlos en el canvas. */
  const ARCHIVOS = [
    'recursos/petalo-rosa-1.svg',
    'recursos/petalo-rosa-2.svg',
    'recursos/petalo-rosa-3.svg',
  ];

  const imagenes = ARCHIVOS.map(ruta => {
    const img = new Image();
    img.src = ruta;
    return img;
  });

  /** Expuestas para que el módulo de física elija una al crear un pétalo. */
  window.LienzoDePetalos.imagenes = imagenes;

  /* ⚡ PRE-RASTERIZADO: la razón de que esto costara tanto por cuadro.
     `imagen` es un <img> que apunta a un archivo .svg. Un SVG no es un
     mapa de píxeles: cuando se dibuja con drawImage() bajo una ROTACIÓN
     distinta cada vez (pintarLosPetalos gira cada pétalo un ángulo propio),
     el navegador tiene que VOLVER A RASTERIZAR el vector entero en cada
     cuadro — no hay forma de cachear eso entre ángulos.

     Con ~18 pétalos activos y dos lienzos, eran ~18 rasterizaciones
     vectoriales POR CUADRO. Coincide exacto con el perfil real: "Paint" al
     12,3 % y la función pintarLosPetalos sola al 21,5 %.

     La solución: rasterizar cada uno de los 3 dibujos UNA sola vez, a un
     canvas oculto, y de ahí en más dibujar ESE mapa de bits (que sí se
     cachea entre rotaciones sin costo). 128 px alcanza de sobra: el pétalo
     más grande mide 62 px (06-petalos-con-fisica.js, plano "frente"), así
     que 128 cubre esa medida a densidad de pantalla 2x, y todo lo demás se
     dibuja reduciendo, que es barato.

     Mientras el rasterizado no está listo (una fracción de segundo, a lo
     sumo lo que tarda en decodificar el SVG) se sigue dibujando desde el
     <img> original: nunca hay un cuadro sin pétalos. */
  const TAMANO_DEL_MAPA = 128;
  const mapasDePixeles = new Map();

  function rasterizar(img) {
    const lienzoOculto = document.createElement('canvas');
    lienzoOculto.width = TAMANO_DEL_MAPA;
    lienzoOculto.height = TAMANO_DEL_MAPA;
    const pincelOculto = lienzoOculto.getContext('2d');
    if (!pincelOculto) return;
    pincelOculto.drawImage(img, 0, 0, TAMANO_DEL_MAPA, TAMANO_DEL_MAPA);
    mapasDePixeles.set(img, lienzoOculto);
  }

  for (const img of imagenes) {
    if (img.complete && img.naturalWidth) {
      rasterizar(img);
    } else if (typeof img.decode === 'function') {
      img.decode().then(() => rasterizar(img)).catch(() => {});
    } else {
      img.addEventListener('load', () => rasterizar(img), { once: true });
    }
  }

  /* ── Un canvas por plano ── */
  const planos = [];

  for (const config of LIENZOS) {
    const contenedor = buscar(config.contenedor);
    if (!contenedor) continue;

    const lienzo = document.createElement('canvas');
    lienzo.className = 'lienzo-de-petalos';
    lienzo.setAttribute('aria-hidden', 'true');
    contenedor.appendChild(lienzo);

    const pincel = lienzo.getContext('2d', { alpha: true });
    if (!pincel) continue;

    /* Cada lienzo dibuja una o más listas, EN ORDEN: así los pétalos del
       plano "frente" siguen quedando por encima de los del "medio" aunque
       compartan superficie. El módulo de física sigue viendo tres planos
       separados, que es lo que espera. */
    const listas = config.planos.map(nombre => {
      const lista = [];
      window.LienzoDePetalos.planos[nombre] = lista;
      return lista;
    });

    planos.push({ lienzo, pincel, listas });
  }

  if (!planos.length) { window.LienzoDePetalos.activo = false; return; }

  /* ⚡ #petalos-medio SIGUE EXISTIENDO EN EL HTML PERO YA NO SE USA (ver la
     nota grande de "POR QUÉ TRES CANVAS Y NO UNO", más arriba: los planos
     medio y frente comparten canvas desde hace tiempo). El problema es que
     sigue siendo `position: fixed` a pantalla completa
     (estilos/10-cursor-y-petalos.css), y el navegador le arma una capa de
     compositor igual, aunque nunca se dibuje nada adentro. Se oculta acá.

     ⚠️ NO SE PUEDE BORRAR DEL <div> EN index.html: 06-petalos-con-fisica.js
     hace `if (!buscar('#petalos-medio')) return;` — si el elemento no
     existiera, TODOS los pétalos (no solo los del plano medio) dejarían de
     crearse. display:none conserva el elemento pero apaga la capa. */
  const capaMedioSinUso = buscar('#petalos-medio');
  if (capaMedioSinUso) capaMedioSinUso.style.display = 'none';

  let ancho = 0, alto = 0, densidad = 1;

  /**
   * Ajusta los tres canvas al tamaño de la ventana.
   *
   * Los pétalos SÍ tienen forma y borde —a diferencia de la luz, que es
   * una mancha difusa—, así que acá no se baja la resolución: se respeta
   * la densidad de la pantalla hasta 2x. Bajarla se notaría.
   *
   * @returns {void}
   */
  function ajustarLosLienzos() {
    ancho = window.innerWidth;
    alto  = window.innerHeight;
    densidad = Math.min(window.devicePixelRatio || 1, 2);

    for (const plano of planos) {
      plano.lienzo.width  = Math.max(1, Math.round(ancho * densidad));
      plano.lienzo.height = Math.max(1, Math.round(alto  * densidad));
      plano.lienzo.style.width  = ancho + 'px';
      plano.lienzo.style.height = alto  + 'px';
    }
  }

  ajustarLosLienzos();
  window.addEventListener('resize', rebotar(ajustarLosLienzos, 200));

  /**
   * Un cuadro: limpia los tres canvas y estampa cada pétalo donde toca.
   *
   * Nada de esto crea objetos: se recorre con índices y se reutiliza el
   * estado del pincel. Es el mismo criterio que en el lienzo de luz.
   *
   * @returns {void}
   */
  function pintarLosPetalos() {
    /* Sin nadie mirando no se redibuja. Los canvas conservan lo último
       pintado, así que los pétalos quedan quietos en su sitio en vez de
       desaparecer de golpe. hayAlgoQueMirar() (02-utilidades.js) cubre los
       tres casos: sobre todavía cerrado, pestaña de fondo, o animaciones
       apagadas. */
    if (!hayAlgoQueMirar()) {
      requestAnimationFrame(pintarLosPetalos);
      return;
    }

    for (let p = 0; p < planos.length; p++) {
      const plano = planos[p];
      const pincel = plano.pincel;

      pincel.setTransform(densidad, 0, 0, densidad, 0, 0);

      /* ⚡ SE BORRA SOLO DONDE HUBO UN PÉTALO, NO LA PANTALLA ENTERA.
         Antes esto era `clearRect(0, 0, ancho, alto)`: tres pantallas
         completas borradas y vueltas a subir a la GPU en CADA cuadro —3,25
         megapíxeles— para dibujar 29 pétalos que ocupan, entre todos, unos
         60.000 píxeles.

         En la máquina objetivo (Intel HD 4600, sin memoria propia, bus
         compartido con la CPU) eso era casi todo el problema: el ancho de
         banda, no el procesador.

         Ahora se borra el rectángulo que ocupó cada pétalo el cuadro
         anterior. El margen de 2 px cubre el suavizado de los bordes; sin
         él quedarían estelas. */
      for (let L = 0; L < plano.listas.length; L++) {
        const lista = plano.listas[L];
        for (let i = 0; i < lista.length; i++) {
          const caja = lista[i].cajaAnterior;
          if (caja) pincel.clearRect(caja[0] - 2, caja[1] - 2, caja[2] + 4, caja[3] + 4);
        }
      }

      /* Se dibuja lista por lista y en orden, para conservar la profundidad
         entre planos que ahora comparten lienzo. */
      for (let L = 0; L < plano.listas.length; L++) {
      const lista = plano.listas[L];
      for (let i = 0; i < lista.length; i++) {
        const pet = lista[i];
        pet.cajaAnterior = null;

        if (!pet.activo || pet.opacidad <= 0.004) continue;

        const imagen = pet.imagen;
        if (!imagen || !imagen.complete || !imagen.naturalWidth) continue;

        // Culling: lo que quedó fuera de la ventana no se dibuja.
        if (pet.y < -pet.tamaño - 40 || pet.y > alto + pet.tamaño + 40) continue;
        if (pet.x < -pet.tamaño - 40 || pet.x > ancho + pet.tamaño + 40) continue;

        const medio = pet.tamaño / 2;

        /* El mapa de bits pre-rasterizado, si ya está listo; si no, el SVG
           original (nunca se pierde un cuadro por esperar). Ver la nota
           grande de más arriba: dibujar el SVG con rotación distinta cada
           vez obligaba a re-rasterizarlo entero por cuadro. */
        const fuente = mapasDePixeles.get(imagen) || imagen;

        pincel.save();
        /* Se gira sobre el CENTRO del pétalo, igual que hacía el CSS: el
           transform del div era translate + rotate, y el origen por defecto
           de una caja es su centro. */
        pincel.translate(pet.x + medio, pet.y + medio);
        pincel.rotate(pet.angulo * Math.PI / 180);
        pincel.globalAlpha = pet.opacidad;
        pincel.drawImage(fuente, -medio, -medio, pet.tamaño, pet.tamaño);
        pincel.restore();

        /* Se anota QUÉ ZONA ocupó, para poder borrar solo eso el próximo
           cuadro. Un pétalo girado ocupa más que su lado: la diagonal. Se
           usa el lado × 1,45 (√2 redondeado hacia arriba) centrado, que
           cubre cualquier ángulo. Quedarse corto acá deja estelas. */
        const radio = pet.tamaño * 0.725;
        pet.cajaAnterior = [
          pet.x + medio - radio, pet.y + medio - radio, radio * 2, radio * 2,
        ];
      }
      }
    }

    requestAnimationFrame(pintarLosPetalos);
  }

  requestAnimationFrame(pintarLosPetalos);

})();
