/* ══════════════════════════════════════════════════════════════════════
   26 · EL MAPA, A PEDIDO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   El iframe de Google Maps no está en el HTML: carga cientos de KB de
   JavaScript ajeno y lo ejecuta de golpe en el hilo principal apenas el
   scroll se acerca a la sección (aunque tenga loading="lazy" — eso solo
   retrasa CUÁNDO arranca, no evita que sea una tarea larga). Eso es lo
   que se sentía como un frenazo de casi un segundo al pasar por ahí, y
   es también lo que hundía el puntaje de velocidad (tiempo de bloqueo y
   el aviso de "vida útil de caché" de los recursos de Google, que no
   dependen de nuestro .htaccess).

   En su lugar hay un panel con el nombre y la dirección del salón, y un
   botón "Ver el mapa". Recién ahí, al primer toque, se crea el <iframe>
   real — el de siempre, con el mismo filtro de color y la misma viñeta —
   dentro del mismo marco .mapa-marco que ya existía.
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElMapaAPedido() {

  const boton = buscar('#boton-ver-mapa');
  const marco = buscar('.mapa-marco--a-pedido');
  if (!boton || !marco) return;

  boton.addEventListener('click', () => {
    // Si ya se creó (doble toque, doble evento), no se hace de nuevo.
    if (marco.querySelector('iframe')) return;

    const direccion = CONFIGURACION.lugar.enlaceDelMapaIncrustado;
    if (!direccion) return;

    const iframe = document.createElement('iframe');
    iframe.title = 'Mapa del salón';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = direccion;

    // Viñeta: funde los bordes del mapa con el fondo de la página. No
    // recibe clics, así que el mapa se sigue pudiendo arrastrar.
    const vineta = document.createElement('span');
    vineta.className = 'mapa-marco__vineta';
    vineta.setAttribute('aria-hidden', 'true');

    marco.querySelector('.mapa-marco__aviso').remove();
    marco.prepend(vineta);
    marco.prepend(iframe);
    marco.classList.remove('mapa-marco--a-pedido');
  });

})();
