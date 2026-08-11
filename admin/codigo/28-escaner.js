/* ══════════════════════════════════════════════════════════════════════
   28 · ESCÁNER DE LA PUERTA

   QUÉ HACE ESTE ARCHIVO
   Lee el QR del pase con la cámara y deja marcar la llegada con un
   toque. El QR ya existía —la invitación lo genera y confirmar.php lo
   manda por correo, ver codigo/12-pase-de-acceso.js de la invitación—:
   acá solo faltaba poder leerlo. El QR trae, en texto plano, exactamente
   el código del pase (ej. "XV-1F4A-K3P9"), nada más.

   CÓMO SE LEE
   `BarcodeDetector` es la API nativa del navegador para esto: no hay que
   descargar ninguna librería, y funciona sin internet porque es del
   propio Chrome. El problema es que Safari (iPhone) no la tiene.

   ⚠️ EN IPHONE NO HAY LECTURA POR CÁMARA TODAVÍA.
   Hace falta una librería de respaldo (jsQR) para eso, y agregarla bien
   —embebida, sin bajarla de un CDN, para que funcione sin señal el 24 de
   octubre— es un paso aparte. Mientras tanto, en un teléfono sin
   BarcodeDetector esta pantalla ofrece directamente la búsqueda por
   nombre o código a mano, que es el camino que YA existe (ver
   pintarBuscadorDePases en 25-hoy.js) y que ahora también deja pasar.
   Nada depende de la cámara: es más rápido, pero no es la única puerta.

   LO QUE IMPORTA DE VERDAD
   Si el pase ya se usó, cartel rojo con la hora del primer ingreso. Sin
   eso, un código reenviado por WhatsApp mete al doble de gente.

   ÍNDICE
     1. Abrir la pantalla
     2. La cámara y la lectura
     3. Consultar y marcar
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. ABRIR LA PANTALLA ─────────────────────────────────────────── */

/**
 * Abre la pantalla del escáner, como hoja de pantalla completa.
 *
 * @returns {void}
 */
function abrirEscaner() {
  const tieneCamara = typeof BarcodeDetector !== 'undefined';

  const cuerpo = abrirHoja('Escanear pases',
    (tieneCamara
      ? '<div id="escaner-camara" class="escaner__camara">' +
          '<video id="escaner-video" playsinline muted autoplay></video>' +
          '<div class="escaner__marco" aria-hidden="true"></div>' +
        '</div>'
      : '<p class="aviso-error">' +
          'Este navegador no puede leer el QR con la cámara (pasa en ' +
          'iPhone). Busca por nombre o código aquí abajo — funciona igual ' +
          'para dejar pasar.' +
        '</p>') +

    '<div class="buscador" style="margin-top:var(--esp-2)">' +
      '<input type="search" id="escaner-buscar" class="buscador__control" ' +
             'style="padding-left:var(--esp-3);font-size:18px;min-height:52px" ' +
             'placeholder="Código o nombre" autocapitalize="characters" ' +
             'autocomplete="off" spellcheck="false">' +
    '</div>' +

    '<div id="escaner-resultado"></div>'
  );

  const caja = buscar('#escaner-resultado', cuerpo);

  if (tieneCamara) {
    iniciarCamaraDelEscaner(buscar('#escaner-video', cuerpo), codigo =>
      consultarPase(codigo, caja)
    );
  }

  /* La búsqueda a mano funciona SIEMPRE, tenga cámara o no: es la red de
     seguridad, y en iPhone es el único camino. */
  let listaAlDia = false;
  traer('confirmaciones.php?accion=listar').then(r => {
    INVITADOS = r.filas || [];
    listaAlDia = true;
  }).catch(() => { listaAlDia = false; });

  const campo = buscar('#escaner-buscar', cuerpo);
  campo.addEventListener('input', () => {
    const aguja = paraBuscar(campo.value);
    if (aguja.length < 2) { caja.innerHTML = ''; return; }

    // Si escribió el código exacto, se consulta directo al servidor (más
    // seguro que confiar en la copia local para saber si ya llegó).
    const porCodigo = INVITADOS.find(f =>
      paraBuscar(f.codigo || '') === aguja);
    if (porCodigo && porCodigo.codigo) {
      consultarPase(porCodigo.codigo, caja);
      return;
    }

    const encontrados = INVITADOS.filter(f =>
      paraBuscar(f.nombre || '').includes(aguja)
    ).slice(0, 5);

    if (!encontrados.length) {
      caja.innerHTML = listaAlDia
        ? '<p class="aviso-error">No encontré a nadie con eso.</p>'
        : '<p class="aviso-error">No pude cargar la lista completa.</p>';
      return;
    }

    caja.innerHTML = encontrados.map(f =>
      '<button class="lista__fila" data-escaner-elegir="' + seguro(f.codigo || '') + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(f.nombre) + '</span>' +
        '</span>' +
      '</button>'
    ).join('');

    buscarTodos('[data-escaner-elegir]', caja).forEach(boton => {
      boton.addEventListener('click', () => {
        const codigo = boton.dataset.escanerElegir;
        if (!codigo) { avisar('Ese invitado no tiene código de pase.', true); return; }
        consultarPase(codigo, caja);
      });
    });
  });
}


/* ─── 2. LA CÁMARA Y LA LECTURA ────────────────────────────────────── */

/** Para poder apagar la cámara al cerrar la hoja. */
let ESCANER_STREAM = null;

/**
 * Prende la cámara trasera y busca códigos QR en cada cuadro, con
 * `requestAnimationFrame` — así se lee tan rápido como el teléfono
 * pueda, sin saturarlo con un intervalo fijo.
 *
 * @param {HTMLVideoElement} video
 * @param {(codigo:string) => void} alLeer
 * @returns {void}
 */
async function iniciarCamaraDelEscaner(video, alLeer) {
  try {
    ESCANER_STREAM = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
  } catch (error) {
    avisar('No se pudo abrir la cámara. Revisa los permisos del navegador.', true);
    return;
  }

  video.srcObject = ESCANER_STREAM;
  await video.play();

  const detector = new BarcodeDetector({ formats: ['qr_code'] });

  // Para no procesar el mismo código en cada cuadro mientras la persona
  // todavía tiene el pase frente a la cámara.
  let ultimoLeido = '';
  let ultimaVez = 0;

  const cuadro = async () => {
    if (!ESCANER_STREAM) return;   // La hoja se cerró: se corta el loop.

    try {
      const codigos = await detector.detect(video);
      if (codigos.length) {
        const texto = (codigos[0].rawValue || '').trim();
        const ahora = Date.now();

        // Mismo código, hace menos de 3 segundos: se ignora. Distinto
        // código, o pasó el tiempo: se atiende.
        if (texto && (texto !== ultimoLeido || ahora - ultimaVez > 3000)) {
          ultimoLeido = texto;
          ultimaVez = ahora;
          if (navigator.vibrate) navigator.vibrate(80);
          alLeer(texto);
        }
      }
    } catch (error) {
      // Un cuadro fallido no es nada: se sigue con el próximo.
    }

    requestAnimationFrame(cuadro);
  };

  requestAnimationFrame(cuadro);

  // Al cerrar la hoja (X, fondo, Escape) se apaga la cámara: si no,
  // sigue prendida y el teléfono se calienta sin que nadie la use.
  const apagar = () => {
    if (ESCANER_STREAM) {
      ESCANER_STREAM.getTracks().forEach(pista => pista.stop());
      ESCANER_STREAM = null;
    }
  };
  buscar('#hoja-cerrar').addEventListener('click', apagar, { once: true });
  buscar('#hoja-fondo').addEventListener('click', apagar, { once: true });
}


/* ─── 3. CONSULTAR Y MARCAR ────────────────────────────────────────── */

/**
 * Pide al servidor quién es este pase y si ya entró, y pinta la
 * tarjeta grande con el botón de dejar pasar.
 *
 * @param {string} codigo
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function consultarPase(codigo, donde) {
  donde.innerHTML = '<div class="esqueleto"></div>';

  let datos;
  try {
    datos = await traer('llegadas.php?accion=consultar&codigo=' + encodeURIComponent(codigo));
  } catch (error) {
    donde.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  pintarTarjetaDeLaPuerta(datos, donde);
}

/**
 * La tarjeta grande de la puerta: nombre, cuántos son, alergias en
 * rojo, y el estado — "Dejar pasar" o el cartel de que ya entró.
 *
 * @param {Object} datos - Lo que devuelve llegadas.php.
 * @param {Element} donde
 * @returns {void}
 */
function pintarTarjetaDeLaPuerta(datos, donde) {
  const gente = datos.adultos + datos.ninos;
  const tieneAlergia = datos.alergias &&
    !/^(ninguna|ninguno|no|-)$/i.test(datos.alergias);

  donde.innerHTML =
    '<div class="tarjeta" style="border-color:' +
         (!datos.asiste ? 'var(--alerta)' : (datos.ya_llego ? 'var(--ojo)' : 'var(--bien)')) +
         ';padding:var(--esp-3)">' +

      '<div style="font-size:22px;font-weight:700">' + seguro(datos.nombre) + '</div>' +

      (!datos.asiste
        ? '<div style="font-size:20px;color:var(--alerta);font-weight:700;' +
               'margin-top:var(--esp-1)">AVISÓ QUE NO VENÍA</div>'
        : '<div style="font-size:32px;color:var(--bien);font-weight:700;' +
               'margin-top:var(--esp-1)">' +
            gente + (gente === 1 ? ' persona' : ' personas') +
          '</div>') +

      (tieneAlergia
        ? '<div class="etiqueta etiqueta--alerta" style="margin-top:var(--esp-2);' +
               'font-size:16px;padding:8px 12px">⚠ ' + seguro(datos.alergias) + '</div>'
        : '') +

      (datos.ya_llego
        ? '<div class="aviso-error" style="margin-top:var(--esp-3);font-size:16px">' +
            'Ya había entrado' +
            (datos.llegada_en
              ? ', a las ' + seguro(String(datos.llegada_en).slice(11, 16))
              : '') + '.' +
          '</div>'
        : '<button class="boton boton--principal boton--ancho" ' +
                  'id="escaner-dejar-pasar" style="margin-top:var(--esp-3);' +
                  'min-height:56px;font-size:18px">Dejar pasar</button>') +
    '</div>';

  const boton = buscar('#escaner-dejar-pasar', donde);
  if (!boton) return;

  boton.addEventListener('click', async () => {
    boton.disabled = true;
    boton.textContent = 'Marcando…';

    try {
      const marcado = await mandar('llegadas.php?accion=marcar', {
        codigo: datos.codigo || '',
      });
      registrarEvento('accion', 'marcar_llegada', { en_lote: false, desde: 'escaner' });
      pintarTarjetaDeLaPuerta(marcado._offline ? { ...datos, ya_llego: true } : marcado, donde);
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Dejar pasar';
    }
  });
}
