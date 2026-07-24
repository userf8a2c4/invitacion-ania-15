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
  const CUANTAS = esPantallaChica ? 8 : 18;

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

    mota.style.cssText =
      `width:${tamano}px;height:${tamano}px;left:${izquierda}%;top:${arriba}%;` +
      `--mota-dx:${derivaX}px;--mota-dy:${derivaY}px;` +
      `--mota-dur:${duracion}s;--mota-delay:${retardo}s;--mota-op:${opacidad};`;

    fragmento.appendChild(mota);
  }

  capa.appendChild(fragmento);

})();
