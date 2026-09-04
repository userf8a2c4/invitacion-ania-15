/* ══════════════════════════════════════════════════════════════════════
   12 · PASE DE ACCESO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Genera y muestra la "entrada" que recibe cada invitado al confirmar:
   una tarjeta con su nombre, cuántos van, qué van a comer, un código
   único y su código QR.

   Además RECUERDA la confirmación: si la persona vuelve a entrar a la
   web, en vez del formulario en blanco ve directamente su pase. Así no
   confirma dos veces por error.

   ÍNDICE
     1. Generar el código único
     2. Dibujar el código QR
     3. Mostrar y cerrar el pase
     4. Imprimir
     5. Recordar la confirmación anterior
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. GENERAR EL CÓDIGO ÚNICO ───────────────────────────────────── */

/**
 * Crea un código de pase corto y distinto para cada invitado.
 *
 * CÓMO SE ARMA: 'XV-' + una huella del nombre + un pedazo de la hora exacta
 *
 *   · La "huella" se obtiene sumando el número de cada letra del nombre.
 *     Dos nombres distintos casi siempre dan sumas distintas.
 *   · La hora exacta (en milisegundos) hace que sea único incluso si dos
 *     personas se llamaran igual.
 *   · toString(16) y toString(36) escriben esos números en un sistema
 *     que usa también letras, para que el código quede corto.
 *
 * @param {string} textoBase - Normalmente el nombre + el correo.
 * @returns {string} Un código como 'XV-1F4A-K3P9'.
 *
 * @example
 *   generarCodigoDePase('Ana Pérezana@mail.com')  // → 'XV-0B7E-M2X4'
 */
function generarCodigoDePase(textoBase) {
  const huellaDelNombre = [...textoBase]
    .reduce((suma, letra) => suma + letra.charCodeAt(0), 0);

  const parteDelNombre = huellaDelNombre.toString(16).toUpperCase().padStart(4, '0');
  const parteDelMomento = Date.now().toString(36).toUpperCase().slice(-4);

  return 'XV-' + parteDelNombre + '-' + parteDelMomento;
}


/* ─── 2. DIBUJAR EL CÓDIGO QR ──────────────────────────────────────── */

/* ⚡ LA BIBLIOTECA DEL QR SE CARGA BAJO DEMANDA, NO EN EL <head>.
   Antes index.html traía qrcodejs con <script defer> en TODA visita,
   aunque solo hace falta cuando alguien confirma o vuelve a ver su pase
   —normalmente ni bien entra a la web, y muchas veces nunca—. Es el mismo
   caso que el iframe de Google Maps: un recurso de terceros que se
   descargaba y ejecutaba para todo el mundo, para un uso que casi nadie
   toca en el momento de cargar.

   Ahora se inyecta con JS recién cuando hace falta (ver cargarQRCode()) y,
   además, se dispara temprano de fondo apenas alguien empieza a llenar el
   formulario (codigo/11-formulario-confirmacion.js), para que cuando
   llegue al botón de confirmar ya esté lista y no se note ninguna espera. */
let promesaDeQRCode = null;

/**
 * Carga qrcodejs si todavía no está, sin repetir la descarga si ya se
 * pidió antes (dos llamadas casi simultáneas comparten la misma promesa).
 * @returns {Promise<void>}
 */
function cargarQRCode() {
  if (typeof QRCode !== 'undefined') return Promise.resolve();
  if (promesaDeQRCode) return promesaDeQRCode;

  promesaDeQRCode = new Promise(resolver => {
    /* ⚡ CON TOPE DE TIEMPO (2026-09-03)
     *
     * `onload`/`onerror` cubren que el CDN conteste o falle rápido. No
     * cubren el caso más común en un teléfono: una conexión que NO
     * cierra —señal débil, portal cautivo, red saturada—, donde ninguno
     * de los dos se dispara nunca.
     *
     * Y esto está en el camino crítico: 15-registro-de-confirmaciones.js
     * hace `await generarQrParaElCorreo(...)` ANTES de mandar la
     * confirmación. Sin tope, la promesa no resuelve, el POST no sale, y
     * el botón se queda girando sin nada que tocar. La persona cierra la
     * pestaña creyendo que no pudo confirmar.
     *
     * Ocho segundos: más de lo que tarda un CDN sano en cualquier red
     * usable, y mucho menos que la paciencia de alguien mirando un botón
     * que no responde. Al vencerse se resuelve igual — quien llama ya
     * sabe seguir sin QR, y el código escrito se lee perfectamente. */
    let yaResolvio = false;
    const terminar = () => {
      if (yaResolvio) return;
      yaResolvio = true;
      resolver();
    };

    const reloj = setTimeout(terminar, 8000);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    // Sin internet o si el CDN falla, se resuelve igual: quien llama ya
    // sabe seguir sin QR (el código escrito abajo se lee perfectamente).
    script.onload  = () => { clearTimeout(reloj); terminar(); };
    script.onerror = () => { clearTimeout(reloj); terminar(); };
    document.head.appendChild(script);
  });
  return promesaDeQRCode;
}

/**
 * Dibuja el código QR dentro de la tarjeta.
 *
 * Usa una biblioteca externa (qrcodejs), cargada bajo demanda por
 * cargarQRCode(). Si no hay conexión, la biblioteca no llega: por eso
 * está el if. En ese caso el pase igual sirve, porque el código escrito
 * abajo se lee perfectamente.
 *
 * @param {string} textoDelCodigo - Lo que se codifica en el QR.
 * @returns {Promise<void>}
 */
async function dibujarCodigoQR(textoDelCodigo) {
  const contenedorDelQR = buscar('#codigo-qr');
  if (!contenedorDelQR) return;

  contenedorDelQR.innerHTML = '';   // borra el QR anterior, si había

  await cargarQRCode();

  if (typeof QRCode === 'undefined') {
    console.info('No se pudo cargar la biblioteca del QR (¿estás sin internet?). ' +
                 'El pase funciona igual con el código escrito.');
    return;
  }

  try {
    new QRCode(contenedorDelQR, {
      text: textoDelCodigo,
      width: 100,
      height: 100,
      colorDark:  '#c9a84c',   // dorado
      colorLight: '#120c07',   // fondo oscuro
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (error) {
    console.warn('No se pudo dibujar el código QR:', error);
  }
}

/**
 * Genera el QR que viaja en el correo de confirmación.
 *
 * POR QUÉ NO SE COPIA EL DE LA PANTALLA
 * El de la tarjeta es dorado sobre fondo oscuro, que se ve precioso pero
 * los lectores de los teléfonos lo leen mal o no lo leen: un QR necesita
 * mucho contraste y margen blanco alrededor. Este se genera negro sobre
 * blanco y al doble de tamaño, que es lo que sí se escanea de una.
 *
 * EL CÓDIGO ES EXACTAMENTE EL MISMO: cambia el color, no el contenido.
 *
 * @param {string} textoDelCodigo - El mismo que se dibuja en la tarjeta.
 * @returns {Promise<string>} Una imagen PNG como texto
 *                             ("data:image/png;base64,…"), o cadena vacía
 *                             si no se pudo generar.
 */
async function generarQrParaElCorreo(textoDelCodigo) {
  if (!textoDelCodigo) return '';
  await cargarQRCode();
  if (typeof QRCode === 'undefined') return '';

  // Se dibuja en un contenedor suelto que nunca entra en la página.
  const cajaInvisible = document.createElement('div');

  try {
    new QRCode(cajaInvisible, {
      text: textoDelCodigo,
      width: 240,
      height: 240,
      colorDark:  '#000000',
      colorLight: '#ffffff',
      // Corrección alta: el QR sigue leyéndose aunque la pantalla tenga
      // un reflejo o el papel esté algo arrugado.
      correctLevel: QRCode.CorrectLevel.H,
    });

    /* qrcodejs dibuja en un <canvas> y, en navegadores viejos, en un
       <img>. Se prueban los dos por ese orden. */
    const lienzo = cajaInvisible.querySelector('canvas');
    if (lienzo) return lienzo.toDataURL('image/png');

    const imagen = cajaInvisible.querySelector('img');
    if (imagen && imagen.src.indexOf('data:image/png') === 0) return imagen.src;

    return '';
  } catch (error) {
    console.warn('No se pudo generar el QR para el correo:', error);
    return '';
  }
}


/* ─── 3. MOSTRAR Y CERRAR EL PASE ──────────────────────────────────── */

/**
 * Rellena la tarjeta con los datos del invitado y la muestra.
 *
 * @param {Object} datos - Lo que devolvió el formulario.
 * @param {string} datos.nombre         - Nombre del invitado.
 * @param {number} datos.adultos        - Cuántos adultos van.
 * @param {number} datos.ninos          - Cuántos niños van.
 * @param {string} datos.resumenDeMenus - Ej: '2 estándar · 1 infantil'.
 * @param {string} datos.codigo         - El código único del pase.
 * @returns {void}
 *
 * @example
 *   mostrarPaseDeAcceso({
 *     nombre: 'Familia Pérez', adultos: 2, ninos: 1,
 *     resumenDeMenus: '2 estándar · 1 infantil', codigo: 'XV-1F4A-K3P9'
 *   });
 */
function mostrarPaseDeAcceso(datos) {
  const ventana = buscar('#ventana-pase');
  if (!ventana) return;

  /* Se usa textContent y no innerHTML a propósito: textContent trata
     todo como texto plano, así que aunque alguien escriba etiquetas de
     HTML en su nombre, se muestran como letras y no se ejecutan. */
  const escribir = (selector, valor) => {
    const elemento = buscar(selector);
    if (elemento) elemento.textContent = valor;
  };

  escribir('#pase-nombre',   datos.nombre || '—');
  escribir('#pase-adultos',  datos.adultos || '1');
  escribir('#pase-ninos',    datos.ninos || '0');
  escribir('#pase-menus',    datos.resumenDeMenus || '—');
  escribir('#pase-codigo',   datos.codigo || '—');
  escribir('#pase-fecha',    CONFIGURACION.fiesta.fechaEnPalabras);
  escribir('#pase-hora',     CONFIGURACION.fiesta.horaEnPalabras);
  escribir('#pase-lugar',    CONFIGURACION.lugar.nombre);

  dibujarCodigoQR(datos.codigo || 'XV-2026');

  /* Accesibilidad: recordamos QUIÉN abrió el pase para devolverle el foco al
     cerrar (si no, el foco cae al principio de la página y quien navega con
     teclado o lector de pantalla se pierde). Y metemos el foco DENTRO del
     diálogo, en el botón de cerrar. */
  disparadorDelPase = document.activeElement;

  ventana.classList.add('abierta');
  document.body.style.overflow = 'hidden';   // no se puede hacer scroll detrás

  const botonCerrar = buscar('#boton-cerrar-pase');
  if (botonCerrar) requestAnimationFrame(() => botonCerrar.focus());
}

/** Quién tenía el foco antes de abrir el pase (para devolvérselo al cerrar). */
let disparadorDelPase = null;

/**
 * Elementos que pueden recibir foco dentro del diálogo, en orden.
 * @param {HTMLElement} ventana
 * @returns {HTMLElement[]}
 */
function focosDelPase(ventana) {
  return Array.from(ventana.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && el.offsetParent !== null);
}

/**
 * Cierra la ventana del pase y devuelve el scroll.
 * @returns {void}
 */
function cerrarPaseDeAcceso() {
  const ventana = buscar('#ventana-pase');
  if (!ventana) return;
  ventana.classList.remove('abierta');
  document.body.style.overflow = '';

  /* Le devolvemos el foco a quien abrió el pase. */
  if (disparadorDelPase && typeof disparadorDelPase.focus === 'function') {
    disparadorDelPase.focus();
  }
  disparadorDelPase = null;
}

/**
 * Abre el diálogo de impresión del navegador.
 * Los estilos de 08-pase-de-acceso.css se encargan de que en el papel
 * salga solamente la tarjeta.
 * @returns {void}
 */
function imprimirPaseDeAcceso() {
  window.print();
}


/* ─── 4. CONECTAR LOS BOTONES ──────────────────────────────────────── */
(function conectaLosBotonesDelPase() {
  const ventana = buscar('#ventana-pase');
  const botonCerrar   = buscar('#boton-cerrar-pase');
  const botonImprimir = buscar('#boton-imprimir-pase');
  const botonVerPase  = buscar('#boton-ver-pase');

  if (botonCerrar)   botonCerrar.addEventListener('click', cerrarPaseDeAcceso);
  if (botonImprimir) botonImprimir.addEventListener('click', imprimirPaseDeAcceso);

  if (botonVerPase) {
    botonVerPase.addEventListener('click', () => {
      const paseGuardado = leerDeMemoria('pase');
      if (paseGuardado) mostrarPaseDeAcceso(paseGuardado);
    });
  }

  // Cerrar haciendo clic en el fondo oscuro (pero no dentro de la tarjeta)
  if (ventana) {
    ventana.addEventListener('click', evento => {
      if (evento.target === ventana) cerrarPaseDeAcceso();
    });
  }

  // Teclado del diálogo: solo actúa cuando el pase está abierto.
  document.addEventListener('keydown', evento => {
    if (!ventana || !ventana.classList.contains('abierta')) return;

    // Escape cierra, que es lo que todo el mundo espera.
    if (evento.key === 'Escape') { cerrarPaseDeAcceso(); return; }

    /* Trampa de foco: mientras el pase está abierto, Tab cicla SOLO entre sus
       controles (no se escapa a la página de atrás, que está tapada). */
    if (evento.key === 'Tab') {
      const focos = focosDelPase(ventana);
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo  = focos[focos.length - 1];
      const activo  = document.activeElement;

      if (evento.shiftKey && (activo === primero || !ventana.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
  });
})();


/* ─── 5. RECORDAR LA CONFIRMACIÓN ANTERIOR ─────────────────────────────
   Si en una visita anterior esta persona ya confirmó, no tiene sentido
   mostrarle el formulario vacío otra vez. Le mostramos su pase y un
   enlace chiquito por si se equivocó y quiere rehacerlo.
   -------------------------------------------------------------------- */
(function recuerdaLaConfirmacionAnterior() {
  const formulario     = buscar('#formulario-confirmacion');
  const mensajeDeExito = buscar('#mensaje-de-exito');
  const textoDeExito   = buscar('#texto-de-exito');
  const botonRehacer   = buscar('#boton-confirmar-de-nuevo');

  if (!formulario || !mensajeDeExito) return;

  /* ⚡ EL BOTÓN SE CABLEA SIEMPRE, PASE LO QUE PASE (2026-09-04)
   *
   * Antes esto estaba DESPUÉS de un `if (!paseGuardado) return;`, o sea
   * que solo se enganchaba cuando ya había una confirmación guardada de
   * una visita anterior.
   *
   * Resultado: quien ACABABA DE CONFIRMAR en esta misma visita entró a
   * la página sin nada guardado, esta función se fue en la primera
   * línea, y después 11-formulario-confirmacion.js mostraba el cartel de
   * gracias —con este enlace dentro— sin que nadie lo escuchara. El
   * enlace se veía y no hacía nada.
   *
   * Al recargar sí andaba, porque ahí el pase ya estaba en memoria. Por
   * eso pasó desapercibido: probándolo dos veces seguidas, la segunda
   * funciona.
   *
   * Empezar de nuevo es válido siempre que el enlace esté a la vista,
   * sin importar cómo se llegó ahí. Así que se cablea acá arriba, antes
   * de cualquier salida. */
  if (botonRehacer) {
    botonRehacer.addEventListener('click', () => {
      borrarDeMemoria('pase');
      window.location.reload();
    });
  }

  /* Lo de abajo SÍ depende de que haya una confirmación anterior: es
     mostrar el cartel en vez del formulario al entrar. */
  const paseGuardado = leerDeMemoria('pase');
  if (!paseGuardado) return;

  formulario.style.display = 'none';
  mensajeDeExito.classList.add('visible');

  if (textoDeExito) {
    textoDeExito.innerHTML =
      'Ya tenemos tu confirmación, <strong>' + limpiarTexto(paseGuardado.nombre) + '</strong>.<br>' +
      'Puedes volver a ver tu pase cuando quieras.';
  }
})();
