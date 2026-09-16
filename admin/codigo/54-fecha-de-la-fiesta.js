/* ══════════════════════════════════════════════════════════════════════
   54 · LA FECHA DE LA FIESTA

   Una sola cosa: cambiar el día de la fiesta desde la app, en vez de
   editar PHP a mano y recompilar.

   ⛔ POR QUÉ ESTA HOJA ES DISTINTA DE TODAS LAS DEMÁS

   No hay otro ajuste del panel que arrastre tanto. La fecha aparece en
   el correo que ya recibió cada invitado, en el pase que van a llevar a
   la puerta, en los recordatorios automáticos, en la cuenta regresiva y
   en lo que contesta el asistente. Tocarla acá cambia nueve lugares a la
   vez, y algunos de esos ya están impresos en el teléfono de alguien.

   Por eso la hoja abre CERRADA: la fecha se muestra como texto, no como
   campo. Hay que tocar «Cambiar la fecha» para que aparezca el campo, y
   confirmar en un diálogo antes de guardar. Es la fricción de
   51-borrado-final.js en su versión suave — no para impedir el cambio,
   para que no ocurra de un toque distraído.

   ⚠️ LO QUE ESTA HOJA NO PUEDE CAMBIAR, Y LO DICE

   El navegador no lee PHP. index.html, los dos archivos de
   configuración y el del chatbot llevan la fecha ESTAMPADA adentro
   desde que se compiló. Guardar acá los deja viejos hasta recompilar y
   subir.

   No se los volvió dinámicos a propósito: haría que la invitación
   pública pidiera un dato más antes de pintar, y esa página costó dos
   meses de trabajo para abrir rápido. Así que el desfase se muestra —con
   los comandos exactos— en vez de esconderse. Un desfase que se ve es un
   pendiente; uno que no se ve es la web anunciando un día y el correo
   anunciando otro.

   ⚠️ POR QUÉ NO VIVE EN LA HOJA DE «FECHA LÍMITE»
   Mismo argumento que escribió 53-eclipse.js: esa hoja tiene un botón
   Guardar que ya dispara dos escrituras. Una tercera haría que corregir
   una coma del texto de la invitación reescribiera además la fecha de la
   fiesta. Son decisiones distintas y se guardan por separado.
   ══════════════════════════════════════════════════════════════════════ */

/** La clave del ajuste. La misma que lee entorno.php. */
const CLAVE_DE_LA_FECHA = 'fecha_de_la_fiesta';

/* Los días y los meses, para escribir la fecha como la lee una persona.
   ⚠️ NOMBRES_DE_LOS_DIAS y no DIAS_DE_LA_SEMANA: ese nombre ya lo usa
   34-asistente-datos.js, y acá no hay módulos — todos estos archivos
   comparten el mismo ámbito global. Dos `const` con el mismo nombre no
   es un aviso: es un SyntaxError que deja el panel entero sin arrancar. */
const NOMBRES_DE_LOS_DIAS = ['domingo', 'lunes', 'martes', 'miércoles',
                           'jueves', 'viernes', 'sábado'];
const MESES_DEL_ANIO = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo',
                        'junio', 'julio', 'agosto', 'septiembre', 'octubre',
                        'noviembre', 'diciembre'];

/**
 * "2026-10-24" → "sábado 24 de octubre de 2026".
 *
 * ⚠️ Se arma a mediodía UTC a propósito. Con `new Date('2026-10-24')` el
 * navegador entiende medianoche UTC, y en Toluca —seis horas atrás— eso
 * cae el día 23: la fecha se leería corrida un día para el lado
 * equivocado. Mediodía deja margen en las dos direcciones.
 *
 * @param {string} iso - AAAA-MM-DD
 * @returns {string}
 */
function fechaDeFiestaEnPalabras(iso) {
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;

  const cuando = new Date(Date.UTC(+partes[0], +partes[1] - 1, +partes[2], 12));
  return NOMBRES_DE_LOS_DIAS[cuando.getUTCDay()] + ' ' +
         cuando.getUTCDate() + ' de ' +
         MESES_DEL_ANIO[cuando.getUTCMonth() + 1] + ' de ' +
         cuando.getUTCFullYear();
}

/**
 * Cuántos días faltan desde hoy. Negativo si ya pasó.
 *
 * @param {string} iso - AAAA-MM-DD
 * @returns {number}
 */
function diasHastaLaFiesta(iso) {
  const partes = String(iso).split('-');
  if (partes.length !== 3) return 0;

  const hoy = new Date();
  const desde = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const hasta = Date.UTC(+partes[0], +partes[1] - 1, +partes[2]);
  return Math.round((hasta - desde) / 86400000);
}

/**
 * La fecha que quedó ESTAMPADA en este panel al compilar.
 *
 * Es el otro lado de la comparación: si lo guardado en la base no
 * coincide con esto, los cuatro archivos del navegador están viejos.
 *
 * @returns {string} AAAA-MM-DD
 */
function fechaEstampadaEnElPanel() {
  const iso = (CONFIGURACION && CONFIGURACION.fiesta &&
               CONFIGURACION.fiesta.fechaYHora) || '';
  return String(iso).slice(0, 10);
}

/**
 * Cuántas invitaciones ya salieron: las que se mandaron y las que ya
 * contestaron. Son las que tienen la fecha vieja escrita afuera de acá.
 *
 * @returns {number}
 */
function cuantasInvitacionesYaSalieron() {
  if (typeof INVITADOS === 'undefined' || !Array.isArray(INVITADOS)) return 0;
  return INVITADOS.reduce((suma, fila) => {
    const estado = String(fila.invitacion_estado || '');
    return suma + (estado === 'enviada' || estado === 'confirmada' ||
                   estado === 'declinada' ? 1 : 0);
  }, 0);
}

/**
 * El bloque que explica qué quedó viejo y cómo se arregla.
 *
 * @param {string} guardada - la fecha que rige ahora
 * @returns {string} HTML
 */
function avisoDeArchivosViejos(guardada) {
  if (guardada === fechaEstampadaEnElPanel()) return '';

  return '' +
    '<div class="aviso" style="margin-top:var(--esp-2)">' +
      '<strong>Falta recompilar y subir.</strong><br>' +
      'El correo, el pase y los recordatorios ya usan la fecha nueva. ' +
      'Pero la portada, la cuenta regresiva y el panel de preguntas la ' +
      'llevan escrita adentro desde que se compiló, y todavía dicen ' +
      '<strong>' + seguro(fechaDeFiestaEnPalabras(fechaEstampadaEnElPanel())) +
      '</strong>.' +
    '</div>' +
    '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
      'Para que digan lo mismo, hay que correr la compilación y volver a ' +
      'subir los archivos: empaquetar, minificar y subir versión, en ese ' +
      'orden.' +
    '</p>';
}

/**
 * Abre la hoja de la fecha de la fiesta.
 *
 * @returns {Promise<void>}
 */
async function abrirLaFechaDeLaFiesta() {
  const estampada = fechaEstampadaEnElPanel();

  let guardada = '';
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=' + CLAVE_DE_LA_FECHA);
    if (r && r.valor) guardada = String(r.valor).trim();
  } catch (error) { /* se muestra la estampada */ }

  const vigente = guardada || estampada;
  const yaSalieron = cuantasInvitacionesYaSalieron();

  const cuerpo = abrirHoja('Fecha de la fiesta',
    '<div class="tarjeta__titulo">El día</div>' +

    /* Primero el dato, grande y sin campo: la mayoría de las veces que
       se entra acá es para mirar, no para cambiar. */
    '<div class="tarjeta" style="text-align:center">' +
      '<div style="font-size:26px;font-weight:600;line-height:1.2">' +
        seguro(fechaDeFiestaEnPalabras(vigente)) +
      '</div>' +
      '<div class="vacio__texto" style="margin-top:var(--gota)">' +
        seguro(textoDeCuantoFalta(diasHastaLaFiesta(vigente))) +
      '</div>' +
    '</div>' +

    '<div class="aviso">' +
      '<strong>Esto cambia mucho más que esta pantalla.</strong><br>' +
      'La fecha va en el correo de confirmación, en el pase que cada ' +
      'invitado lleva a la puerta, en los recordatorios automáticos y en ' +
      'lo que contesta el asistente.' +
      (yaSalieron
        ? ' Ya salieron <strong>' + yaSalieron + '</strong> invitaciones ' +
          'con este día escrito.'
        : '') +
    '</div>' +

    avisoDeArchivosViejos(vigente) +

    '<button type="button" class="boton boton--ancho" id="fec-abrir" ' +
            'style="margin-top:var(--esp-3)">Cambiar la fecha</button>' +

    /* El campo nace escondido. Aparece al tocar el botón de arriba, y
       recién entonces aparece también el Guardar. */
    '<div id="fec-editor" class="oculto" style="margin-top:var(--esp-3)">' +
      '<div style="border-top:1px solid var(--borde);' +
           'margin:0 0 var(--esp-3)"></div>' +

      campoTexto({ id: 'fec-dia', rotulo: 'Nuevo día', tipo: 'date',
                   valor: vigente }) +

      '<div class="tarjeta" id="fec-previa" ' +
           'style="font-size:13px;line-height:1.5"></div>' +

      pieDeFormulario('Guardar la fecha') +
    '</div>' +

    '<div id="fec-espejo"></div>'
  );

  const abrir  = buscar('#fec-abrir', cuerpo);
  const editor = buscar('#fec-editor', cuerpo);
  const campo  = buscar('#fec-dia', cuerpo);
  const previa = buscar('#fec-previa', cuerpo);

  /* ⚡ EL BOTÓN SE VA CUANDO ABRE (2026-09-16)
     Si se quedara, quedarían dos botones anchos —«Cambiar la fecha» y
     «Guardar la fecha»— uno encima del otro, y el de arriba ya no
     haría nada. Un control que sigue en pantalla después de cumplir su
     función es un control que se va a tocar por error. */
  abrir.addEventListener('click', () => {
    abrir.classList.add('oculto');
    editor.classList.remove('oculto');
    campo.focus();
  });

  /* La previa se repinta con cada tecla: el día de la semana es lo que
     más se equivoca al escribir una fecha a mano, y es justamente lo
     que no se ve en un campo AAAA-MM-DD. */
  const repintar = () => {
    const dia = campo.value;
    if (!dia) {
      previa.innerHTML = '<span class="vacio__texto">Elegí un día.</span>';
      return;
    }

    const faltan = diasHastaLaFiesta(dia);
    previa.innerHTML =
      '<strong>' + seguro(fechaDeFiestaEnPalabras(dia)) + '</strong><br>' +
      '<span class="vacio__texto">' + seguro(textoDeCuantoFalta(faltan)) +
      '</span>' +
      (dia === vigente
        ? '<br><span class="vacio__texto">Es la fecha que ya está puesta.</span>'
        : '');
  };
  campo.addEventListener('input', repintar);
  repintar();

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const dia = valorDe('fec-dia', cuerpo);

    if (!dia) { avisar('Elegí un día.', true); return; }
    if (dia === vigente) { avisar('Esa ya es la fecha de la fiesta.'); return; }

    /* ⛔ CON await. Sin él, confirmarAccion() devuelve una Promesa, que
       es siempre verdadera, y la pregunta no frena absolutamente nada.
       Está advertido en 06-piezas.js:1481. */
    const seguir = await confirmarAccion(
      'Vas a mover la fiesta al ' + fechaDeFiestaEnPalabras(dia) + '.\n\n' +
      'A partir de ahora, el correo de confirmación, el pase de cada ' +
      'invitado y los recordatorios automáticos van a decir ese día.' +
      (yaSalieron
        ? ' Las ' + yaSalieron + ' invitaciones que ya salieron decían el ' +
          fechaDeFiestaEnPalabras(vigente) + '.'
        : ''),
      { confirmar: 'Mover la fiesta', peligro: true });

    if (!seguir) return;

    try {
      /* mandarSinCola() y no mandar(): una cola que aterriza mañana
         dejaría a Lucila creyendo que cambió la fecha cuando no cambió
         nada. Mismo criterio que la hora del eclipse. */
      await mandarSinCola('ajustes.php?accion=guardar',
        { clave: CLAVE_DE_LA_FECHA, valor: dia });
    } catch (error) {
      avisar(error.message, true);
      return;
    }

    avisar('Fecha guardada.');

    /* La hoja NO se cierra: lo que hay que leer ahora es qué quedó
       pendiente. Cerrarla y mostrar una tostada de dos segundos sería
       esconder justo la parte que hay que hacer. */
    buscar('#fec-espejo', cuerpo).innerHTML =
      '<div style="border-top:1px solid var(--borde);' +
           'margin:var(--esp-3) 0"></div>' +
      '<div class="aviso-ok">' +
        '<strong>Listo: la fiesta es el ' +
        seguro(fechaDeFiestaEnPalabras(dia)) + '.</strong><br>' +
        'El correo, el pase, los recordatorios y el asistente ya lo dicen.' +
      '</div>' +
      '<div class="aviso" style="margin-top:var(--esp-2)">' +
        '<strong>Falta recompilar y subir.</strong><br>' +
        'La portada, la cuenta regresiva y el panel de preguntas llevan ' +
        'la fecha escrita adentro y todavía dicen ' +
        '<strong>' + seguro(fechaDeFiestaEnPalabras(estampada)) +
        '</strong>. Hay que empaquetar, minificar, subir versión y ' +
        'volver a subir los archivos.' +
      '</div>';
  });
}

/**
 * "faltan 38 días", "es hoy", "fue hace 3 días".
 *
 * @param {number} dias
 * @returns {string}
 */
function textoDeCuantoFalta(dias) {
  if (dias === 0)  return 'Es hoy.';
  if (dias === 1)  return 'Falta 1 día.';
  if (dias > 1)    return 'Faltan ' + dias + ' días.';
  if (dias === -1) return 'Fue ayer.';
  return 'Fue hace ' + Math.abs(dias) + ' días.';
}
