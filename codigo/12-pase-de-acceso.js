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

/**
 * Dibuja el código QR dentro de la tarjeta.
 *
 * Usa una biblioteca externa (qrcodejs) que se carga desde internet en
 * el index.html. Si no hay conexión, la biblioteca no existe: por eso
 * está el if. En ese caso el pase igual sirve, porque el código escrito
 * abajo se lee perfectamente.
 *
 * @param {string} textoDelCodigo - Lo que se codifica en el QR.
 * @returns {void}
 */
function dibujarCodigoQR(textoDelCodigo) {
  const contenedorDelQR = buscar('#codigo-qr');
  if (!contenedorDelQR) return;

  contenedorDelQR.innerHTML = '';   // borra el QR anterior, si había

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

  ventana.classList.add('abierta');
  document.body.style.overflow = 'hidden';   // no se puede hacer scroll detrás
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

  // Cerrar con la tecla Escape, que es lo que todo el mundo espera
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') cerrarPaseDeAcceso();
  });
})();


/* ─── 5. RECORDAR LA CONFIRMACIÓN ANTERIOR ─────────────────────────────
   Si en una visita anterior esta persona ya confirmó, no tiene sentido
   mostrarle el formulario vacío otra vez. Le mostramos su pase y un
   enlace chiquito por si se equivocó y quiere rehacerlo.
   -------------------------------------------------------------------- */
(function recuerdaLaConfirmacionAnterior() {
  const paseGuardado = leerDeMemoria('pase');
  if (!paseGuardado) return;

  const formulario     = buscar('#formulario-confirmacion');
  const mensajeDeExito = buscar('#mensaje-de-exito');
  const textoDeExito   = buscar('#texto-de-exito');
  const botonRehacer   = buscar('#boton-confirmar-de-nuevo');

  if (!formulario || !mensajeDeExito) return;

  formulario.style.display = 'none';
  mensajeDeExito.classList.add('visible');

  if (textoDeExito) {
    textoDeExito.innerHTML =
      'Ya tenemos tu confirmación, <strong>' + limpiarTexto(paseGuardado.nombre) + '</strong>.<br>' +
      'Podés volver a ver tu pase cuando quieras.';
  }

  /* Botón para empezar de nuevo: borra la memoria y recarga la página */
  if (botonRehacer) {
    botonRehacer.addEventListener('click', () => {
      borrarDeMemoria('pase');
      window.location.reload();
    });
  }
})();
