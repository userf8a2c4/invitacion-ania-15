/* ══════════════════════════════════════════════════════════════════════
   11 · FORMULARIO DE CONFIRMACIÓN
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Todo lo relacionado con el formulario donde el invitado confirma:
     · muestra u oculta las preguntas según si viene o no
     · crea UNA FILA DE MENÚ POR PERSONA (la novedad más importante)
     · valida que no falte nada
     · manda el correo con EmailJS
     · guarda la confirmación y muestra el pase de acceso

   LA IDEA DE LOS MENÚS POR PERSONA
   Antes había dos casillas para todo el grupo, lo cual no tenía sentido:
   si vienen 4 adultos, cada uno come lo suyo. Ahora, cuando alguien
   escribe "4" en adultos, la computadora crea 4 filas —Adulto 1, Adulto
   2, Adulto 3 y Adulto 4— y en cada una se elige su menú.

   Como cada persona come UN solo plato, las opciones son excluyentes:
   son botones de tipo "radio" (elegís uno y se desmarca el otro), no
   casillas de tildar.

   ÍNDICE
     1. Elementos del formulario
     2. Crear las filas de menú por persona
     3. Leer lo que se eligió y armar los resúmenes
     4. Mostrar y ocultar secciones según las respuestas
     5. Validación
     6. Envío
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElFormularioDeConfirmacion() {

  /* ─── 1. ELEMENTOS DEL FORMULARIO ──────────────────────────────── */
  const formulario       = buscar('#formulario-confirmacion');
  const campoNombre      = buscar('#campo-nombre');
  const campoCorreo      = buscar('#campo-correo');
  const campoAsistencia  = buscar('#campo-asistencia');
  const bloqueSiAsiste   = buscar('#bloque-si-asiste');
  const campoAdultos     = buscar('#campo-adultos');
  const campoNinos       = buscar('#campo-ninos');
  const contenedorMenusAdultos = buscar('#menus-de-adultos');
  const bloqueMenuInfantil     = buscar('#bloque-menu-infantil');
  const contenedorMenusNinos   = buscar('#menus-de-ninos');
  const campoAlergias    = buscar('#campo-alergias');
  const campoNotas       = buscar('#campo-notas');
  const botonEnviar      = buscar('#boton-enviar');
  const cajaDeError      = buscar('#error-del-formulario');
  const mensajeDeExito   = buscar('#mensaje-de-exito');

  if (!formulario) return;

  /** La respuesta que significa "sí, voy" en la lista desplegable. */
  const RESPUESTA_AFIRMATIVA = 'Sí, asistiré';

  /** Menús que puede elegir un adulto. */
  const MENUS_DE_ADULTO = [
    { valor: 'Estándar',    etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-menus"/></svg> Estándar' },
    { valor: 'Vegetariano', etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-hoja-menu"/></svg> Vegetariano' },
  ];

  /* Los niños no tienen lista de opciones: su menú es uno solo, el
     infantil. Por eso no hay una constante MENUS_DE_NINO; en su lugar se
     muestra una única tarjeta con la cantidad (ver actualizarFilasDeNinos). */


  /* ─── 2. CREAR LAS FILAS DE MENÚ POR PERSONA ───────────────────── */

  /**
   * Lee qué menú tiene elegido cada persona en este momento.
   * Se usa ANTES de volver a dibujar las filas, para no perder lo que la
   * persona ya había marcado cuando cambia la cantidad de comensales.
   *
   * @param {Element} contenedor - Dónde están las filas.
   * @param {string} prefijo     - 'adulto' o 'nino'.
   * @returns {string[]} Los menús elegidos, en orden.
   *
   * @example
   *   leerEleccionesActuales(contenedorMenusAdultos, 'adulto')
   *   // → ['Estándar', 'Vegetariano', 'Estándar']
   */
  function leerEleccionesActuales(contenedor, prefijo) {
    const elecciones = [];
    if (!contenedor) return elecciones;

    const filas = contenedor.querySelectorAll('.fila-persona');
    filas.forEach((fila, indice) => {
      const marcado = fila.querySelector(`input[name="menu-${prefijo}-${indice + 1}"]:checked`);
      elecciones.push(marcado ? marcado.value : null);
    });
    return elecciones;
  }

  /**
   * Dibuja una fila por comensal, cada una con sus opciones de menú.
   *
   * @param {Element} contenedor       - Dónde dibujarlas.
   * @param {number} cantidadDePersonas - Cuántas filas hacen falta.
   * @param {string} prefijo           - 'adulto' o 'nino'.
   * @param {string} palabraSingular   - 'Adulto' o 'Niño'.
   * @param {Array}  menusDisponibles  - Lista de opciones.
   * @param {string} menuPorDefecto    - Cuál viene marcado de entrada.
   * @returns {void}
   */
  function dibujarFilasDeMenu(contenedor, cantidadDePersonas, prefijo,
                              palabraSingular, menusDisponibles, menuPorDefecto) {
    if (!contenedor) return;

    // Primero rescatamos lo ya elegido para no hacerle perder el trabajo
    const eleccionesPrevias = leerEleccionesActuales(contenedor, prefijo);

    contenedor.innerHTML = '';

    for (let numeroDePersona = 1; numeroDePersona <= cantidadDePersonas; numeroDePersona++) {
      /* Si esta persona ya existía, respetamos su elección.
         Si es nueva (se aumentó la cantidad), va la opción por defecto. */
      const menuElegido = eleccionesPrevias[numeroDePersona - 1] || menuPorDefecto;

      // Al primer adulto le aclaramos que es quien está completando
      const aclaracion = (prefijo === 'adulto' && numeroDePersona === 1)
        ? '<small>quien confirma</small>'
        : '';

      const opcionesEnHtml = menusDisponibles.map(menu => `
        <label class="opcion-menu opcion-menu--unica">
          <input type="radio"
                 name="menu-${prefijo}-${numeroDePersona}"
                 value="${menu.valor}"
                 ${menu.valor === menuElegido ? 'checked' : ''}>
          <span>${menu.etiqueta}</span>
        </label>`).join('');

      const fila = document.createElement('div');
      fila.className = 'fila-persona';
      fila.innerHTML = `
        <span class="fila-persona__nombre">${palabraSingular} ${numeroDePersona}${aclaracion}</span>
        <div class="fila-persona__opciones">${opcionesEnHtml}</div>`;

      contenedor.appendChild(fila);
    }
  }

  /**
   * Vuelve a dibujar las filas de adultos según el número escrito.
   * @returns {void}
   */
  function actualizarFilasDeAdultos() {
    const cantidad = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    dibujarFilasDeMenu(contenedorMenusAdultos, cantidad, 'adulto', 'Adulto',
                       MENUS_DE_ADULTO, 'Estándar');
  }

  /**
   * Vuelve a dibujar las filas de niños. Si no hay niños, esconde todo
   * el bloque.
   *
   * El menú infantil viene MARCADO POR DEFECTO, que es justo lo que se
   * pidió: si alguien anota niños, se asume que comen del menú infantil
   * salvo que se indique otra cosa.
   *
   * @returns {void}
   */
  function actualizarFilasDeNinos() {
    const cantidad = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    const hayNinos = cantidad > 0;

    if (bloqueMenuInfantil) {
      bloqueMenuInfantil.classList.toggle('visible', hayNinos);
    }

    if (!contenedorMenusNinos) return;

    if (!hayNinos) {
      contenedorMenusNinos.innerHTML = '';
      return;
    }

    /* Los niños NO llevan una fila cada uno.
       Con los adultos tiene sentido, porque cada uno elige entre estándar
       y vegetariano. Pero el menú infantil es uno solo: repetir la misma
       tarjeta cuatro veces no aportaría ninguna información y solo haría
       más largo el formulario. Se muestra UNA tarjeta con la cantidad al
       lado, que es la forma en que se lee un pedido de verdad:
       "menú infantil ×3". */
    contenedorMenusNinos.innerHTML = `
      <div class="tarjeta-infantil">
        <span class="tarjeta-infantil__icono"><svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-ninos"/></svg></span>
        <span class="tarjeta-infantil__texto">
          Menú infantil
          <small>${cantidad === 1 ? 'para 1 niño' : 'para los ' + cantidad + ' niños'}</small>
        </span>
        <span class="tarjeta-infantil__cantidad">×${cantidad}</span>
      </div>`;
  }

  if (campoAdultos) campoAdultos.addEventListener('input', actualizarFilasDeAdultos);
  if (campoNinos)   campoNinos.addEventListener('input', actualizarFilasDeNinos);


  /* ─── 3. LEER LO ELEGIDO Y ARMAR LOS RESÚMENES ─────────────────── */

  /**
   * Junta todos los menús elegidos en una lista de objetos.
   *
   * @returns {Array<{quien:string, menu:string}>}
   *
   * @example
   *   recolectarMenusElegidos()
   *   // → [ {quien:'Adulto 1', menu:'Estándar'},
   *   //     {quien:'Adulto 2', menu:'Vegetariano'},
   *   //     {quien:'Niño 1',   menu:'Infantil'} ]
   */
  function recolectarMenusElegidos() {
    const elegidos = [];

    const cantidadAdultos = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    for (let i = 1; i <= cantidadAdultos; i++) {
      const marcado = formulario.querySelector(`input[name="menu-adulto-${i}"]:checked`);
      elegidos.push({ quien: `Adulto ${i}`, menu: marcado ? marcado.value : 'Estándar' });
    }

    /* Los niños no tienen nada que leer del formulario: todos comen el
       mismo menú infantil, así que se agregan directamente según cuántos
       sean. Igual se cargan de a uno para que el recuento del pase siga
       diciendo "2 infantil" y no haya que tratarlos como un caso aparte. */
    const cantidadNinos = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    for (let i = 1; i <= cantidadNinos; i++) {
      elegidos.push({ quien: `Niño ${i}`, menu: 'Infantil' });
    }

    return elegidos;
  }

  /**
   * Arma el recuento corto que se ve en el pase de acceso.
   *
   * @param {Array<{quien:string, menu:string}>} menusElegidos
   * @returns {string} Por ejemplo: '3 estándar · 1 vegetariano · 2 infantil'
   */
  function armarResumenDeMenus(menusElegidos) {
    /* Un "contador": un objeto donde la clave es el menú y el valor es
       cuántas veces apareció. Se va llenando solo. */
    const cuantosDeCada = {};

    menusElegidos.forEach(persona => {
      cuantosDeCada[persona.menu] = (cuantosDeCada[persona.menu] || 0) + 1;
    });

    // Object.entries convierte {Estándar: 3} en [['Estándar', 3]]
    return Object.entries(cuantosDeCada)
      .map(([nombreDelMenu, cantidad]) => `${cantidad} ${nombreDelMenu.toLowerCase()}`)
      .join(' · ');
  }

  /**
   * Arma el detalle persona por persona que viaja en el correo, para que
   * quien organiza sepa exactamente qué pedir.
   *
   * @param {Array<{quien:string, menu:string}>} menusElegidos
   * @returns {string} Por ejemplo: 'Adulto 1: Estándar | Adulto 2: Vegetariano'
   */
  function armarDetalleDeMenus(menusElegidos) {
    return menusElegidos
      .map(persona => `${persona.quien}: ${persona.menu}`)
      .join(' | ');
  }


  /* ─── 4. MOSTRAR Y OCULTAR SECCIONES ───────────────────────────── */
  if (campoAsistencia) {
    campoAsistencia.addEventListener('change', function alElegirSiViene() {
      const vieneALaFiesta = this.value === RESPUESTA_AFIRMATIVA;
      bloqueSiAsiste.classList.toggle('visible', vieneALaFiesta);

      // La primera vez que dice que sí, dibujamos su fila de menú
      if (vieneALaFiesta && contenedorMenusAdultos &&
          contenedorMenusAdultos.children.length === 0) {
        actualizarFilasDeAdultos();
      }
    });
  }


  /* ─── 5. VALIDACIÓN ────────────────────────────────────────────── */

  /**
   * Muestra un aviso de error arriba del botón de enviar.
   * Es mejor que un alert() del navegador: no interrumpe, se lee mejor y
   * queda dentro del diseño.
   *
   * @param {string} mensaje - Qué salió mal. Con cadena vacía se borra.
   * @returns {void}
   */
  function mostrarError(mensaje) {
    if (!cajaDeError) return;
    cajaDeError.textContent = mensaje;
    cajaDeError.style.display = mensaje ? 'block' : 'none';
  }

  /**
   * Comprueba que un correo tenga forma de correo.
   * No verifica que exista de verdad (eso es imposible desde la web),
   * solo que tenga algo, después un @, y después un punto.
   *
   * @param {string} correo - El texto a revisar.
   * @returns {boolean} true si parece válido.
   *
   * @example
   *   pareceUnCorreoValido('ana@mail.com')  // → true
   *   pareceUnCorreoValido('ana.mail.com')  // → false
   */
  function pareceUnCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }


  /* ─── 6. ENVÍO ─────────────────────────────────────────────────── */

  formulario.addEventListener('submit', async function alEnviarElFormulario(evento) {
    // Sin esto, el navegador recargaría la página y perderíamos todo.
    evento.preventDefault();
    mostrarError('');

    const nombre     = campoNombre.value.trim();
    const correo     = campoCorreo.value.trim();
    const asistencia = campoAsistencia.value;

    /* Validaciones, de la más básica a la más específica */
    if (!nombre)  return mostrarError('Por favor escribí tu nombre completo.');
    if (!correo)  return mostrarError('Por favor escribí tu correo electrónico.');
    if (!pareceUnCorreoValido(correo)) {
      return mostrarError('Ese correo no parece válido. Revisá que tenga @ y un punto.');
    }
    if (!asistencia) return mostrarError('Contanos si vas a poder acompañarnos.');

    const vieneALaFiesta = asistencia === RESPUESTA_AFIRMATIVA;
    const cantidadAdultos = vieneALaFiesta ? limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20) : 0;
    const cantidadNinos   = vieneALaFiesta ? limitar(parseInt(campoNinos.value, 10) || 0, 0, 20) : 0;

    const menusElegidos = vieneALaFiesta ? recolectarMenusElegidos() : [];
    const resumenDeMenus = vieneALaFiesta ? armarResumenDeMenus(menusElegidos) : '—';
    const detalleDeMenus = vieneALaFiesta ? armarDetalleDeMenus(menusElegidos) : '—';

    const alergias = campoAlergias ? campoAlergias.value.trim() : '';
    const notas    = campoNotas ? campoNotas.value.trim() : '';

    /* Estos datos son los que van al pase y al correo. Se arman en un
       solo objeto para no andar pasando quince variables sueltas. */
    const datosDeLaConfirmacion = {
      nombre,
      correo,
      asiste: vieneALaFiesta,
      adultos: cantidadAdultos,
      ninos: cantidadNinos,
      resumenDeMenus,
      detalleDeMenus,
      alergias: alergias || 'Ninguna',
      notas: notas || '—',
      codigo: generarCodigoDePase(nombre + correo),
    };

    /* ESTADO DE ESPERA.
       El botón pasa a mostrar tres rombos latiendo en secuencia, en vez
       de cambiar el texto. Se guarda lo que decía para poder devolverlo
       si algo sale mal. */
    const textoOriginalDelBoton = botonEnviar.innerHTML;
    botonEnviar.disabled = true;
    botonEnviar.classList.add('esta-enviando');
    botonEnviar.innerHTML =
      '<span class="rombos-de-carga" role="status" aria-label="Enviando tu confirmación">' +
      '<i></i><i></i><i></i></span>';

    /* DURACIÓN MÍNIMA.
       Sin esto, cuando EmailJS contesta al instante (o directamente no
       está configurado) la animación aparece y desaparece en un parpadeo,
       y el salto vuelve a sentirse abrupto. Se espera lo que tarde el
       envío O 900 ms, lo que sea más largo: el gesto siempre se lee
       completo. Es una espera deliberada, no un retraso accidental. */
    const esperaMinima = esperar(900);

    /* Aviso a quienes organizan. Son dos caminos en paralelo: el correo
       (avisa en el momento) y la hoja de cálculo (lleva el acumulado).
       Ver 15-registro-de-confirmaciones.js.

       Si cualquiera de los dos no está configurado o falla, NO frenamos:
       la persona igual ve su pase. Es preferible eso a mostrarle un
       error por algo que no depende de ella.

       La hoja se anota SIEMPRE, venga o no venga: saber quién avisó que
       no puede es justamente parte del control. El correo, en cambio,
       solo sale si asiste, como estaba. */
    const avisos = [anotarEnLaHoja(datosDeLaConfirmacion)];
    if (vieneALaFiesta) {
      avisos.push(intentarEnviarElCorreo(datosDeLaConfirmacion));
    }
    await Promise.all(avisos);

    /* Promise.all espera a que terminen LAS DOS cosas: el envío y los
       900 ms mínimos. Como corren en paralelo, si el envío tarda 2
       segundos no se le suma la espera: total 2 segundos, no 2,9. */
    await Promise.all([esperaMinima]);

    botonEnviar.classList.remove('esta-enviando');
    botonEnviar.innerHTML = textoOriginalDelBoton;

    // Se recuerda la confirmación para las próximas visitas
    guardarEnMemoria('pase', datosDeLaConfirmacion);

    formulario.style.display = 'none';
    if (mensajeDeExito) mensajeDeExito.classList.add('visible');

    if (vieneALaFiesta) {
      await esperar(600);
      mostrarPaseDeAcceso(datosDeLaConfirmacion);
    }
  });

  /**
   * ¿Este valor de configuración quedó sin completar?
   *
   * @param {string} valor - Lo que hay escrito en 01-configuracion.js.
   * @returns {boolean} true si sigue siendo el texto de ejemplo.
   */
  function sigueSinCompletar(valor) {
    return !valor || valor.startsWith('PEGA_AQUI');
  }

  /**
   * Arma el paquete de datos que viaja a EmailJS.
   *
   * Es el mismo para los dos correos —el del invitado y el del
   * administrador— porque la información es la misma; lo que cambia es
   * cómo la redacta cada plantilla y a dónde va.
   *
   * @param {Object} datos          - Los datos de la confirmación.
   * @param {string} correoDestino  - A quién le llega este envío.
   * @returns {Object} Las etiquetas {{...}} que completa la plantilla.
   */
  function armarEtiquetasDelCorreo(datos, correoDestino) {
    return {
      correo_destino:   correoDestino,
      nombre_invitado:  datos.nombre,
      correo_invitado:  datos.correo,
      cantidad_adultos: datos.adultos,
      cantidad_ninos:   datos.ninos,
      resumen_menus:    datos.resumenDeMenus,
      detalle_menus:    datos.detalleDeMenus,
      alergias:         datos.alergias,
      notas:            datos.notas,
      codigo_de_pase:   datos.codigo,
      fecha: CONFIGURACION.fiesta.fechaEnPalabras + ' · ' + CONFIGURACION.fiesta.horaEnPalabras,
      lugar: CONFIGURACION.lugar.nombre,
    };
  }

  /**
   * Manda UN correo y se traga el error si falla.
   *
   * Que un envío falle no puede frenar al otro ni dejar a la persona sin
   * su pase, así que este ayudante nunca lanza: avisa por consola y
   * devuelve si salió bien o no.
   *
   * @param {string} idDePlantilla - Qué plantilla usar.
   * @param {Object} etiquetas     - Con qué completarla.
   * @param {string} paraQuien     - Solo para el mensaje de consola.
   * @returns {Promise<boolean>} true si se envió.
   */
  async function enviarUnCorreo(idDePlantilla, etiquetas, paraQuien) {
    try {
      await emailjs.send(CONFIGURACION.correo.idDelServicio, idDePlantilla, etiquetas);
      return true;
    } catch (error) {
      console.warn(`No se pudo enviar el correo ${paraQuien} (revisá EmailJS):`, error);
      return false;
    }
  }

  /**
   * Manda los DOS correos de la confirmación: el comprobante para el
   * invitado y el aviso para quien organiza.
   *
   * Salen en paralelo, no uno después del otro: son independientes y así
   * la espera total es la del más lento, no la suma de ambos.
   *
   * @param {Object} datos - Los datos de la confirmación.
   * @returns {Promise<void>} Termina siempre bien, incluso si falla todo.
   */
  async function intentarEnviarElCorreo(datos) {
    const config = CONFIGURACION.correo;

    // ¿Está configurado? Si no, avisamos por consola y seguimos.
    if (sigueSinCompletar(config.clavePublica) || sigueSinCompletar(config.idDelServicio)) {
      console.info(
        'EmailJS todavía no está configurado, así que no se envió ningún correo. ' +
        'La confirmación funciona igual. Para activarlo, seguí los pasos que ' +
        'están explicados en codigo/01-configuracion.js'
      );
      return;
    }

    const envios = [];

    /* 1. El comprobante para el invitado, a la dirección que escribió. */
    if (!sigueSinCompletar(config.idDePlantillaDelInvitado)) {
      envios.push(enviarUnCorreo(
        config.idDePlantillaDelInvitado,
        armarEtiquetasDelCorreo(datos, datos.correo),
        'al invitado'
      ));
    }

    /* 2. El aviso para quien organiza, a su propio correo.
          Necesita las dos cosas: la plantilla Y la dirección. Si falta
          cualquiera de las dos, no hay a quién avisar. */
    if (!sigueSinCompletar(config.idDePlantillaDelAdministrador) &&
        !sigueSinCompletar(config.correoDelAdministrador)) {
      envios.push(enviarUnCorreo(
        config.idDePlantillaDelAdministrador,
        armarEtiquetasDelCorreo(datos, config.correoDelAdministrador),
        'al administrador'
      ));
    }

    if (envios.length === 0) {
      console.info('No hay ninguna plantilla de EmailJS configurada: no se envió ningún correo.');
      return;
    }

    await Promise.all(envios);
  }


  /* Al cargar la página dibujamos la fila del primer adulto, así el
     formulario nunca se ve vacío si alguien dice que sí. */
  if (campoAdultos) actualizarFilasDeAdultos();

})();
