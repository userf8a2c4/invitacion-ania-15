/* ══════════════════════════════════════════════════════════════════════
   23 · ESCRIBIR Y DIBUJAR A MANO

   QUÉ HACE ESTE ARCHIVO
   Un lienzo para escribir con el dedo: anotar un número que dictan por
   teléfono, hacer el croquis del salón, marcar algo rápido cuando
   escribir con el teclado sería más lento.

   El dibujo se guarda como una imagen adjunta a la nota, así que aparece
   junto a los demás archivos y se puede volver a mirar.

   POR QUÉ pointerdown Y NO touchstart
   pointer* funciona igual con el dedo, con un lápiz y con el mouse, así
   que hay un solo camino en vez de tres. Y trae la presión del lápiz, que
   se usa para engrosar el trazo cuando el dispositivo la reporta.

   EL DETALLE QUE HACE QUE SE VEA BIEN
   Un canvas tiene dos tamaños: el que ocupa en pantalla y el de su
   mapa de píxeles. Si se dejan iguales, en un teléfono con pantalla
   retina el trazo sale borroso, porque la pantalla tiene dos o tres
   píxeles reales por cada píxel de CSS. Acá el mapa se crea más grande
   según devicePixelRatio y después se escala. Es la diferencia entre
   una firma nítida y un garabato pixelado.

   ÍNDICE
     1. Abrir el lienzo
     2. Dibujar
     3. Deshacer y guardar
   ══════════════════════════════════════════════════════════════════════ */


/** Los colores del lápiz. El primero es el que arranca elegido. */
const COLORES_DE_LAPIZ = [
  { nombre: 'Dorado', valor: '#d4a843' },
  { nombre: 'Blanco', valor: '#f5e6c8' },
  { nombre: 'Rojo',   valor: '#cf5b52' },
  { nombre: 'Verde',  valor: '#5fae6a' },
];


/* ─── 1. ABRIR EL LIENZO ───────────────────────────────────────────── */

/**
 * Abre el lienzo para dibujar.
 *
 * @param {Object} opciones
 * @param {string} opciones.tipo - A qué se ata: 'nota', 'gasto'…
 * @param {number} opciones.id - El id de ese registro.
 * @param {Function} [opciones.despues] - Se llama al guardar.
 * @returns {void}
 */
function abrirLienzo(opciones) {
  const cuerpo = abrirHoja('Escribir a mano',
    '<div class="lienzo-caja">' +
      '<canvas id="lienzo"></canvas>' +
    '</div>' +

    '<div class="filtros" style="margin-top:var(--esp-2)">' +
      COLORES_DE_LAPIZ.map((c, i) =>
        '<button class="filtro' + (i === 0 ? ' activo' : '') + '" ' +
                'data-color="' + seguro(c.valor) + '" ' +
                'style="border-color:' + seguro(c.valor) + '">' +
          '<span style="display:inline-block;width:11px;height:11px;' +
                'border-radius:50%;background:' + seguro(c.valor) + ';' +
                'vertical-align:-1px"></span> ' + seguro(c.nombre) +
        '</button>'
      ).join('') +
    '</div>' +

    '<div class="filtros">' +
      '<button class="filtro activo" data-grosor="3">Fino</button>' +
      '<button class="filtro" data-grosor="7">Medio</button>' +
      '<button class="filtro" data-grosor="14">Grueso</button>' +
      '<button class="filtro" data-grosor="borrar">Borrador</button>' +
    '</div>' +

    '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-2)">' +
      '<button class="boton" style="flex:1" id="lienzo-deshacer">Deshacer</button>' +
      '<button class="boton" style="flex:1" id="lienzo-limpiar">Limpiar</button>' +
    '</div>' +

    '<button class="boton boton--principal boton--ancho" id="lienzo-guardar" ' +
            'style="margin-top:var(--esp-1)">Guardar el dibujo</button>' +

    '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
      'Se guarda como una imagen adjunta a esta nota.</p>'
  );

  prepararLienzo(cuerpo, opciones);
}


/* ─── 2. DIBUJAR ───────────────────────────────────────────────────── */

/**
 * Prepara el lienzo y engancha los eventos.
 *
 * @param {Element} cuerpo
 * @param {Object} opciones
 * @returns {void}
 */
function prepararLienzo(cuerpo, opciones) {
  const lienzo = buscar('#lienzo', cuerpo);
  const pincel = lienzo.getContext('2d');

  /* Los estados guardados para deshacer. Se guardan como imágenes
     completas y no como listas de trazos: es más simple y con diez
     pasos de memoria el gasto es despreciable. */
  const historial = [];
  const MAXIMO_DESHACER = 12;

  let color   = COLORES_DE_LAPIZ[0].valor;
  let grosor  = 3;
  let borrando = false;
  let dibujando = false;
  let ultimoX = 0;
  let ultimoY = 0;

  /* ─── El tamaño del mapa de píxeles ──────────────────────────────── */
  const ajustarTamano = () => {
    const caja = lienzo.parentElement.getBoundingClientRect();
    const escala = window.devicePixelRatio || 1;

    // Lo guardado se pierde al cambiar el tamaño del canvas, así que se
    // conserva y se vuelve a pintar encima.
    const antes = lienzo.width ? lienzo.toDataURL() : null;

    lienzo.width  = Math.round(caja.width * escala);
    lienzo.height = Math.round(caja.height * escala);
    lienzo.style.width  = caja.width + 'px';
    lienzo.style.height = caja.height + 'px';

    // Todo lo que se dibuje se escala solo a la densidad de la pantalla.
    pincel.scale(escala, escala);
    pincel.lineCap = 'round';
    pincel.lineJoin = 'round';

    if (antes) {
      const imagen = new Image();
      imagen.onload = () => pincel.drawImage(imagen, 0, 0, caja.width, caja.height);
      imagen.src = antes;
    }
  };

  // Un instante para que la hoja termine de abrirse y el canvas tenga
  // su tamaño final; medirlo antes daría cero.
  setTimeout(ajustarTamano, 60);

  /* ─── Dónde está el dedo ─────────────────────────────────────────── */
  const donde = evento => {
    const caja = lienzo.getBoundingClientRect();
    return {
      x: evento.clientX - caja.left,
      y: evento.clientY - caja.top,
      // La presión del lápiz, si el dispositivo la reporta. Con el dedo
      // suele venir 0.5 fijo, así que el trazo queda parejo.
      presion: evento.pressure > 0 ? evento.pressure : 0.5,
    };
  };

  const guardarEnHistorial = () => {
    historial.push(lienzo.toDataURL());
    if (historial.length > MAXIMO_DESHACER) historial.shift();
  };

  /* ─── Los tres momentos del trazo ────────────────────────────────── */

  lienzo.addEventListener('pointerdown', evento => {
    evento.preventDefault();
    guardarEnHistorial();

    dibujando = true;
    const p = donde(evento);
    ultimoX = p.x;
    ultimoY = p.y;

    /* Un toque sin arrastre tiene que dejar un punto. Sin esto, tocar
       para poner un punto sobre una i no dibuja nada. */
    pincel.beginPath();
    pincel.arc(p.x, p.y, (grosor * p.presion * 2) / 2, 0, Math.PI * 2);
    pincel.fillStyle = borrando ? '#0d0603' : color;
    pincel.fill();

    // Que el dedo siga siendo seguido aunque salga del canvas.
    lienzo.setPointerCapture(evento.pointerId);
  });

  lienzo.addEventListener('pointermove', evento => {
    if (!dibujando) return;
    evento.preventDefault();

    const p = donde(evento);

    pincel.beginPath();
    pincel.moveTo(ultimoX, ultimoY);
    pincel.lineTo(p.x, p.y);
    pincel.strokeStyle = borrando ? '#0d0603' : color;
    pincel.lineWidth = grosor * (borrando ? 3 : p.presion * 2);
    pincel.stroke();

    ultimoX = p.x;
    ultimoY = p.y;
  });

  const terminar = () => { dibujando = false; };
  lienzo.addEventListener('pointerup', terminar);
  lienzo.addEventListener('pointercancel', terminar);
  lienzo.addEventListener('pointerleave', terminar);

  /* ─── Los controles ──────────────────────────────────────────────── */

  buscarTodos('[data-color]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      color = boton.dataset.color;
      borrando = false;

      buscarTodos('[data-color]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o === boton));

      // Elegir un color apaga el borrador.
      buscarTodos('[data-grosor]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o.dataset.grosor === String(grosor)));
    });
  });

  buscarTodos('[data-grosor]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      if (boton.dataset.grosor === 'borrar') {
        borrando = true;
        grosor = 10;
      } else {
        borrando = false;
        grosor = Number(boton.dataset.grosor);
      }

      buscarTodos('[data-grosor]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o === boton));
    });
  });

  buscar('#lienzo-deshacer', cuerpo).addEventListener('click', () => {
    if (!historial.length) { avisar('No hay nada que deshacer.'); return; }

    const anterior = historial.pop();
    const imagen = new Image();
    imagen.onload = () => {
      const caja = lienzo.getBoundingClientRect();
      pincel.clearRect(0, 0, caja.width, caja.height);
      pincel.drawImage(imagen, 0, 0, caja.width, caja.height);
    };
    imagen.src = anterior;
  });

  buscar('#lienzo-limpiar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Borrar todo el dibujo?')) return;
    guardarEnHistorial();
    const caja = lienzo.getBoundingClientRect();
    pincel.clearRect(0, 0, caja.width, caja.height);
  });


  /* ─── 3. GUARDAR ─────────────────────────────────────────────────── */

  buscar('#lienzo-guardar', cuerpo).addEventListener('click', () => {
    const boton = buscar('#lienzo-guardar', cuerpo);

    if (lienzoEstaVacio(lienzo, pincel)) {
      avisar('El lienzo está vacío.', true);
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';

    /* Se pinta el fondo oscuro DEBAJO de lo dibujado antes de exportar.
       Un PNG con fondo transparente se ve negro sobre negro en algunos
       visores, y el trazo dorado desaparece. */
    const conFondo = document.createElement('canvas');
    conFondo.width  = lienzo.width;
    conFondo.height = lienzo.height;

    const pincel2 = conFondo.getContext('2d');
    pincel2.fillStyle = '#0d0603';
    pincel2.fillRect(0, 0, conFondo.width, conFondo.height);
    pincel2.drawImage(lienzo, 0, 0);

    conFondo.toBlob(async blob => {
      if (!blob) {
        avisar('No se pudo generar la imagen.', true);
        boton.disabled = false;
        boton.textContent = 'Guardar el dibujo';
        return;
      }

      // Se le pone nombre para que en la lista de archivos se entienda
      // qué es sin tener que abrirlo.
      blob.name = 'dibujo-' + hoyEnFecha() + '.png';

      const salio = await subirArchivo(blob, {
        tipo: opciones.tipo,
        id: opciones.id,
        silencioso: true,
      });

      if (salio) {
        cerrarHoja(true);
        avisar('Dibujo guardado.');
        if (opciones.despues) opciones.despues();
      } else {
        boton.disabled = false;
        boton.textContent = 'Guardar el dibujo';
      }
    }, 'image/png');
  });
}

/**
 * Dice si el lienzo está en blanco.
 *
 * Se mira si algún píxel tiene opacidad. Sin esta comprobación se puede
 * guardar un rectángulo vacío sin darse cuenta, y después queda un
 * archivo inútil colgando de la nota.
 *
 * @param {HTMLCanvasElement} lienzo
 * @param {CanvasRenderingContext2D} pincel
 * @returns {boolean}
 */
function lienzoEstaVacio(lienzo, pincel) {
  if (!lienzo.width || !lienzo.height) return true;

  try {
    const datos = pincel.getImageData(0, 0, lienzo.width, lienzo.height).data;

    /* Se mira de a 40 píxeles y no uno por uno: en un lienzo de un
       millón de píxeles recorrerlos todos congelaría la pantalla, y un
       trazo siempre ocupa muchos más de 40. */
    for (let i = 3; i < datos.length; i += 4 * 40) {
      if (datos[i] !== 0) return false;
    }
    return true;
  } catch (error) {
    // Si el navegador no deja leer los píxeles, se asume que hay algo:
    // es preferible guardar de más que perder un dibujo.
    return false;
  }
}
