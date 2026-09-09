/* ══════════════════════════════════════════════════════════════════════
   25 · EL DÍA DEL EVENTO Y COMPARTIR

   QUÉ HAY EN ESTE ARCHIVO
   Dos pantallas:

     · EL DÍA       → el cronograma en pantalla completa, para el 24
     · COMPARTIR    → mandarle a cada proveedor lo suyo

   Y dos ayudas que siguen viviendo acá porque las usa la pestaña Hoy
   (30-vista-hoy.js): bloqueAQuienLlamar() y bloqueListaFinal().

   DÓNDE SE FUE EL BLOQUE "HOY" QUE ANTES ESTABA ACÁ
   Con el rediseño, "Hoy" pasó a ser su propia pestaña con una pantalla
   completa (30-vista-hoy.js) en vez de un widget que se pintaba arriba
   del Resumen. Ese widget (la función pintarHoy() de antes) ya no
   existe: la pantalla nueva pide hoy.php directamente.

   ÍNDICE
     1. Ayudas que usa la pestaña Hoy
     2. El día del evento
     3. Compartir
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. AYUDAS QUE USA LA PESTAÑA HOY ─────────────────────────────── */

/**
 * A quién conviene llamar hoy.
 *
 * @param {Array} gente
 * @returns {string} HTML
 */
function bloqueAQuienLlamar(gente) {
  if (!gente || !gente.length) return '';

  return '' +
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">A quién llamar</div>' +
      gente.map(p => {
        /* paraWhatsApp() y no un replace a mano: le pone la clave de
           país a los diez dígitos mexicanos y descarta lo que no sirve.
           Sin ella, un número guardado como "9611234567" abría el chat
           de otra persona en otro país, y sin ningún aviso. */
        const numero = paraWhatsApp(p.telefono);

        return '<div class="lista__fila">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
            '<span class="lista__pie">' + seguro(p.porque) +
              // Se dice ANTES del toque, no cuando WhatsApp abre vacío.
              (numero ? '' :
                '<br><span class="aviso-error">Ese teléfono no sirve para ' +
                'WhatsApp: le falta la clave de país.</span>') +
            '</span>' +
          '</span>' +
          /* Sin --chico: llamar y escribir son las dos cosas que se
             hacen apurada y sin mirar. 44 px, como manda el mínimo. */
          '<a class="boton" href="tel:' + seguro(p.telefono) + '">Llamar</a>' +
          (numero
            ? '<a class="boton" target="_blank" rel="noopener" ' +
                 'href="https://wa.me/' + seguro(numero) + '">WhatsApp</a>'
            : '') +
        '</div>';
      }).join('') +
    '</div>';
}

/**
 * La lista de verificación final, cuando ya falta poco.
 *
 * @param {Array} lista
 * @param {number} dias
 * @returns {string} HTML
 */
function bloqueListaFinal(lista, dias) {
  if (!lista || !lista.length) return '';

  const faltan = lista.filter(p => !p.listo).length;

  return '' +
    '<div class="tarjeta" style="border-color:' +
         (faltan ? 'var(--ojo)' : 'var(--bien)') + '">' +
      '<div class="tarjeta__titulo">' +
        (dias === 0 ? 'Antes de salir' : 'Para que salga bien') +
      '</div>' +

      lista.map(p =>
        '<div class="lista__fila" style="min-height:40px' +
             (p.listo ? ';opacity:.55' : '') + '">' +
          '<span class="etiqueta etiqueta--' + (p.listo ? 'bien' : 'ojo') + '">' +
            (p.listo ? '✓' : '·') + '</span>' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo"' +
              (p.listo ? ' style="text-decoration:line-through"' : '') + '>' +
              seguro(p.que) + '</span>' +
            (p.detalle
              ? '<span class="lista__pie">' + seguro(p.detalle) + '</span>' : '') +
          '</span>' +
        '</div>'
      ).join('') +

      (faltan
        ? '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          seguro(pluralizar(faltan, 'cosa', 'cosas')) + ' por resolver.</p>'
        : '<p class="vacio__texto" style="color:var(--bien);' +
          'margin-top:var(--esp-1)">Está todo listo.</p>') +
    '</div>';
}


/* ─── 2. EL DÍA DEL EVENTO ─────────────────────────────────────────── */

/**
 * El cronograma en pantalla completa, con búsqueda de pases.
 *
 * POR QUÉ EN PANTALLA COMPLETA Y CON LETRA GRANDE
 * El 24 de octubre nadie va a navegar pestañas. Va a estar de pie, con
 * ruido, con gente hablándole, mirando el teléfono tres segundos. Esta
 * pantalla está hecha para esos tres segundos.
 *
 * @returns {Promise<void>}
 */
async function abrirModoDelDia() {
  /* ⚡ ACÁ HABÍA DOS PESTAÑAS Y AHORA HAY UNA (2026-09-09)
   *
   * La segunda, «Buscar pase», pintaba una tarjeta con el nombre, la
   * mesa y la alergia… Y NADA MÁS. No tenía «Dejar pasar». O sea que en
   * la puerta había dos buscadores de pase distintos —este y el del
   * escáner— y quien entrara por acá podía identificar a la persona
   * pero no marcar que entró. Dos porteros con dos pantallas haciendo
   * cosas distintas, la noche en que eso menos se puede permitir.
   *
   * Ahora este botón abre el escáner, que hace lo mismo, mejor, y
   * además marca. Una sola puerta y una sola tarjeta de resultado.
   * (pintarBuscadorDePases() sigue abajo, sin usar desde acá — ver la
   * nota en su cabecera.)
   *
   * Y el cronograma dejó de ser el único motivo para abrir esta
   * pantalla: el momento que está corriendo ahora se ve en Hoy, sin
   * tocar nada. Esto queda para verlo entero, que es lo que se hace la
   * noche anterior. */
  const cuerpo = abrirHoja('El día',
    '<div id="dia-cuerpo"><div class="esqueleto"></div></div>' +
    /* Grande y abajo: se toca de pie, con prisa y con una sola mano. */
    '<button class="boton boton--principal boton--ancho" id="dia-escanear" ' +
            'style="min-height:56px;margin-top:var(--esp-3)">' +
      'Escanear o buscar un pase' +
    '</button>');

  const caja = buscar('#dia-cuerpo', cuerpo);

  buscar('#dia-escanear', cuerpo).addEventListener('click', () => abrirEscaner());

  pintarCronogramaGrande(caja);
}

/**
 * Cuál de los momentos del cronograma está corriendo AHORA: el último
 * cuya hora ya llegó.
 *
 * ⚡ VIVE SUELTA DESDE 2026-09-09. Estaba escrita adentro de
 * pintarCronogramaGrande(), y la tira «AHORA» de la pestaña Hoy
 * (30-vista-hoy.js) necesita exactamente el mismo cálculo. Dos copias de
 * esto serían dos pantallas que, en el mismo teléfono y en el mismo
 * segundo, podrían marcar momentos distintos — justo el día en que las
 * dos se miran una detrás de la otra.
 *
 * ⚠️ SE CALCULA EN EL TELÉFONO, A PROPÓSITO, Y NO EN EL SERVIDOR.
 * El reloj que importa es el del salón, no el del hosting. Y si el
 * servidor mandara «el momento de ahora», ese dato envejecería: Hoy no
 * se vuelve a pedir cada minuto, así que la tira diría lo que era cierto
 * cuando se cargó la pantalla.
 *
 * ⚠️ Da por hecho que `momentos` viene ordenado por hora, que es como lo
 * devuelve evento.php ('orden' => 'hora').
 *
 * @param {Array} momentos - EVENTO.cronograma.
 * @returns {number} El índice, o -1 si todavía no empezó ninguno.
 */
function cualMomentoEsAhora(momentos) {
  const ahora = new Date();
  const horaAhora = String(ahora.getHours()).padStart(2, '0') + ':' +
                    String(ahora.getMinutes()).padStart(2, '0');

  let cual = -1;
  (momentos || []).forEach((m, i) => {
    if (String(m.hora).slice(0, 5) <= horaAhora) cual = i;
  });
  return cual;
}

/**
 * El cronograma hora por hora, en grande.
 *
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function pintarCronogramaGrande(donde) {
  pintarCargando(donde, 4);

  if (!EVENTO || !EVENTO.cronograma) {
    try {
      EVENTO = await traer('evento.php?accion=todo');
    } catch (error) {
      pintarError(donde, error.message, () => pintarCronogramaGrande(donde));
      return;
    }
  }

  const momentos = EVENTO.cronograma || [];

  if (!momentos.length) {
    pintarVacio(donde, 'Todavía no hay cronograma',
      'Ármalo desde Evento → El día para tenerlo aquí el 24.');
    return;
  }

  const elDeAhora = cualMomentoEsAhora(momentos);

  donde.innerHTML = momentos.map((m, i) => {
    const pasado = i < elDeAhora;
    const esAhora = i === elDeAhora;

    return '' +
      '<div class="momento' + (esAhora ? ' momento--ahora' : '') +
           (pasado ? ' momento--pasado' : '') + '">' +
        '<div class="momento__hora">' + seguro(String(m.hora).slice(0, 5)) + '</div>' +
        '<div class="momento__cuerpo">' +
          '<div class="momento__que">' + seguro(m.momento) + '</div>' +
          (m.responsable
            ? '<div class="momento__quien">' + seguro(m.responsable) + '</div>' : '') +
          (m.detalle
            ? '<div class="momento__quien">' + seguro(m.detalle) + '</div>' : '') +
        '</div>' +
        (esAhora ? '<span class="etiqueta etiqueta--bien">Ahora</span>' : '') +
      '</div>';
  }).join('');

  // Que lo que está pasando quede a la vista sin buscarlo.
  const actual = buscar('.momento--ahora', donde);
  if (actual) actual.scrollIntoView({ block: 'center' });
}

/* ⚡ ACÁ VIVÍA pintarBuscadorDePases() (retirada el 2026-09-09).

   Era el SEGUNDO buscador de pase de la puerta, además del del
   escáner (28-escaner.js). Pintaba el nombre, la mesa y la alergia
   —bien— pero no tenía «Dejar pasar»: era una tarjeta de solo
   lectura. Quien entrara a la puerta por acá podía identificar a la
   persona y no podía marcar que entró.

   Dos pantallas para la misma tarea, con capacidades distintas, es
   peor que una sola imperfecta: la noche del evento se reparten los
   teléfonos sin explicar cuál de las dos abrir.

   Se borró en vez de dejarla sin usar, para que nadie la vuelva a
   enganchar creyendo que es un atajo. La puerta es abrirEscaner(),
   que busca por nombre y por código, funciona sin cámara (iPhone),
   avisa si el pase ya entró, y marca la llegada. */


/* ─── 3. COMPARTIR ─────────────────────────────────────────────────── */

/**
 * Abre la pantalla para mandarle a cada proveedor lo suyo.
 *
 * @returns {Promise<void>}
 */
async function abrirCompartir() {
  const cuerpo = abrirHoja('Compartir',
    '<div id="compartir-lista"><div class="esqueleto"></div></div>');

  const caja = buscar('#compartir-lista', cuerpo);

  let opciones, aQuien;
  try {
    // Las dos llamadas juntas: tardan lo que la más lenta.
    [opciones, aQuien] = await Promise.all([
      traer('compartir.php?accion=que_hay'),
      traer('compartir.php?accion=a_quien'),
    ]);
  } catch (error) {
    pintarError(caja, error.message, () => abrirCompartir());
    return;
  }

  const proveedores = (aQuien && aQuien.proveedores) || [];
  const comoSeLlama = {};
  opciones.forEach(o => { comoSeLlama[o.clave] = o.nombre; });

  caja.innerHTML =
    /* ─── Los proveedores con paquete asignado ────────────────────── */
    (proveedores.length
      ? '<div class="indice__titulo">Tus proveedores</div>' +
        proveedores.map(p => filaDeProveedorParaMandar(p, comoSeLlama)).join('') +
        '<p class="vacio__texto" style="padding:0 var(--esp-1);' +
             'margin-bottom:var(--esp-3)">' +
          'WhatsApp no deja mandarle a varios de una vez: va uno por uno.' +
        '</p>'
      : '<div class="tarjeta">' +
          '<p class="vacio__texto">Ningún proveedor tiene asignado qué mandarle. ' +
          'Abre un proveedor en Presupuesto y elige su paquete: después vas a ' +
          'poder mandarle lo suyo desde aquí con un toque.</p>' +
        '</div>') +

    /* ─── Y los paquetes sueltos, para copiar o elegir destinatario ──
     *
     * Los que piden un contexto —UNA mesa, UN proveedor— no van acá:
     * elegirlos en un desplegable, fuera de la pantalla donde se los
     * está mirando, es más trabajo que llegar desde su propia ficha.
     * Se ofrecen ahí: "Mandar esta mesa" en la mesa, "Mandarle su
     * estado de cuenta" en el proveedor. */
    '<div class="indice__titulo">Armar un texto suelto</div>' +
    opciones.filter(o => !o.pide_mesa && !o.pide_proveedor).map(o =>
      '<button class="lista__fila" data-compartir="' + seguro(o.clave) + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(o.nombre) + '</span>' +
          '<span class="lista__pie">' + seguro(o.que) + '</span>' +
        '</span>' +
      '</button>'
    ).join('');

  buscarTodos('[data-compartir]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => armarParaCompartir(boton.dataset.compartir));
  });

  buscarTodos('[data-mandarle]', cuerpo).forEach(boton => {
    const p = proveedores.find(x => String(x.id) === boton.dataset.mandarle);
    boton.addEventListener('click', () => armarParaCompartir(p.paquete, p));
  });
}

/**
 * Un renglón de la lista de proveedores a los que mandarles lo suyo.
 *
 * Lo que de verdad importa acá es el estado: no alcanza con saber si se
 * le mandó, hay que saber si LO QUE SE LE MANDÓ SIGUE SIENDO CIERTO. Un
 * DJ con la lista de canciones de hace un mes es peor que uno sin lista,
 * porque él cree que está al día.
 *
 * @param {Object} p
 * @param {Object} comoSeLlama - clave de paquete => nombre legible.
 * @returns {string} HTML
 */
function filaDeProveedorParaMandar(p, comoSeLlama) {
  let estado;

  if (!p.sirve_whatsapp) {
    estado = '<span class="etiqueta etiqueta--alerta">Sin WhatsApp</span>';
  } else if (!p.enviado_en) {
    estado = '<span class="etiqueta etiqueta--tenue">Nunca</span>';
  } else {
    /* La huella se compara al abrir el texto, no acá: para saber si
       cambió hay que armarlo de nuevo. Acá se dice cuándo fue. */
    estado = '<span class="etiqueta etiqueta--bien">' +
             seguro(comoCuando(String(p.enviado_en).slice(0, 10))) + '</span>';
  }

  return '' +
    '<button class="lista__fila" data-mandarle="' + seguro(p.id) + '"' +
            (p.sirve_whatsapp ? '' : ' disabled') + '>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
        '<span class="lista__pie">' +
          seguro(comoSeLlama[p.paquete] || p.paquete) +
          (p.servicio ? ' · ' + seguro(p.servicio) : '') +
        '</span>' +
      '</span>' +
      '<span class="lista__lado">' + estado + '</span>' +
    '</button>';
}

/**
 * Arma el texto y ofrece mandarlo o copiarlo.
 *
 * @param {string} cual - Qué paquete (ver compartir.php?accion=que_hay).
 * @param {Object} [proveedor] - A quién se le manda: { id, nombre,
 *   enviado_en, huella }. Los dos últimos son los que permiten avisar
 *   "esto cambió desde que se lo mandaste".
 * @param {number} [mesaId] - Solo para el paquete 'mesa'.
 * @returns {Promise<void>}
 */
async function armarParaCompartir(cual, proveedor, mesaId) {
  const cuerpo = abrirHoja('Armando…', '<div class="esqueleto"></div>'.repeat(3));

  let datos;
  try {
    datos = await traer('compartir.php?accion=armar&cual=' + encodeURIComponent(cual) +
                        (proveedor ? '&proveedor=' + encodeURIComponent(proveedor.id) : '') +
                        // El paquete 'mesa' arma la hoja de UNA mesa.
                        (mesaId ? '&mesa=' + encodeURIComponent(mesaId) : ''));
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => armarParaCompartir(cual, proveedor, mesaId));
    return;
  }

  buscar('#hoja-titulo').textContent = proveedor
    ? 'Para ' + proveedor.nombre
    : 'Listo para mandar';

  /* ¿Cambió algo desde la última vez que se le mandó?
   *
   * Este es el aviso que evita el problema de verdad: que el DJ tenga la
   * lista de canciones de hace un mes y NO LO SEPA. Se compara la huella
   * del texto de ahora contra la que se guardó al mandarlo. */
  const yaSeLeMando = proveedor && proveedor.enviado_en;
  const cambio = yaSeLeMando && proveedor.huella && proveedor.huella !== datos.huella;

  const aviso = !yaSeLeMando ? ''
    : cambio
      ? '<p class="aviso-error">Esto <strong>cambió</strong> desde que se lo ' +
        'mandaste, el ' + seguro(comoFecha(String(proveedor.enviado_en).slice(0, 10))) +
        '. Conviene volver a mandárselo.</p>'
      : '<p class="vacio__texto" style="color:var(--bien);margin-bottom:var(--esp-2)">' +
        'Se lo mandaste el ' +
        seguro(comoFecha(String(proveedor.enviado_en).slice(0, 10))) +
        ' y no cambió nada desde entonces.</p>';

  /* Sin un número que sirva, el enlace de WhatsApp abre el selector de
     contactos vacío. Se dice antes, no después del toque. */
  const sinNumero = proveedor && datos.proveedor && !datos.proveedor.sirve_whatsapp
    ? '<p class="aviso-error">' + seguro(proveedor.nombre) + ' no tiene un ' +
      'teléfono que sirva para WhatsApp. Puedes copiar el texto y ' +
      'mandárselo por donde lo tengas.</p>'
    : '';

  /* ⚡ CUANDO EL TEXTO ES DEMASIADO LARGO PARA UN ENLACE (2026-09-03).
   *
   * `wa.me/…?text=` mete el mensaje entero DENTRO de la dirección. Con
   * 110 invitados, el paquete "Lista de invitados" pasa los ocho mil
   * caracteres una vez codificado (cada acento ocupa nueve), y Android
   * lo corta sin decir nada: se abre WhatsApp con el mensaje a la
   * mitad, y no hay forma de notarlo salvo leyéndolo entero del otro
   * lado.
   *
   * El umbral es del texto SIN codificar y es conservador a propósito:
   * más vale ofrecer copiar de más que mandar un mensaje cortado.
   * Copiar no tiene ningún límite.
   *
   * No se esconde WhatsApp: se invierte cuál es el camino principal. */
  const LARGO_SEGURO_DE_ENLACE = 1500;
  const textoLargo = (datos.texto || '').length > LARGO_SEGURO_DE_ENLACE;

  const botonWhatsapp =
    '<a class="boton' + (textoLargo ? '' : ' boton--principal') + ' boton--ancho" ' +
       'target="_blank" rel="noopener" id="comp-whatsapp" ' +
       'href="' + seguro(datos.whatsapp) + '" style="margin-top:var(--esp-2)">' +
      (proveedor ? 'Mandarle a ' + seguro(proveedor.nombre) : 'Mandar por WhatsApp') +
    '</a>';

  const botonCopiar =
    '<button class="boton' + (textoLargo ? ' boton--principal' : '') + ' boton--ancho" ' +
            'id="comp-copiar" style="margin-top:var(--esp-' +
            (textoLargo ? '2' : '1') + ')">Copiar el texto</button>';

  cuerpo.innerHTML =
    aviso +
    sinNumero +

    (textoLargo
      ? '<p class="aviso-error">Este texto es muy largo para mandarlo por el ' +
        'enlace de WhatsApp: se cortaría por la mitad sin avisar. ' +
        '<strong>Cópialo y pégalo</strong> en el chat.</p>'
      : '') +

    /* Se muestra el texto completo antes de mandarlo. Nadie debería
       mandarle algo a un proveedor sin haberlo leído. */
    '<div class="tarjeta" style="white-space:pre-wrap;font-size:13px;' +
         'max-height:300px;overflow-y:auto;line-height:1.5">' +
      seguro(datos.texto) +
    '</div>' +

    // El que está bien para este texto va primero y en oro.
    (textoLargo ? botonCopiar + botonWhatsapp : botonWhatsapp + botonCopiar);

  /* Al tocar el botón se anota que se le mandó. Se anota que se ABRIÓ
     WhatsApp con el texto puesto: si después lo manda o no ya pasa
     adentro de WhatsApp, donde el panel no ve nada. Decir "enviado"
     sería afirmar más de lo que se sabe.

     Y solo si HAY destinatario. Sin un número que sirva, el enlace abre
     el selector de contactos vacío: no hay a quién mandárselo, y anotar
     el envío igual dejaba marcado como avisado a un proveedor que nunca
     recibió nada — que es peor que no tener el dato, porque después
     nadie vuelve a mirarlo. */
  const hayDestinatario = !!(datos.proveedor && datos.proveedor.sirve_whatsapp);

  if (proveedor && hayDestinatario) {
    buscar('#comp-whatsapp', cuerpo).addEventListener('click', () => {
      mandar('compartir.php?accion=anotar_envio', {
        proveedor_id: proveedor.id,
        paquete: cual,
        huella: datos.huella,
      }).catch(() => {
        // Que no se pueda anotar no puede frenar el envío.
      });
    });
  }

  buscar('#comp-copiar', cuerpo).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(datos.texto);
      avisar('Copiado. Pégalo donde quieras.');
    } catch (error) {
      /* En algunos navegadores el portapapeles solo funciona con
         permiso. Si falla, se selecciona el texto para copiarlo a mano
         en vez de dejar a la persona sin salida. */
      const bloque = buscar('.tarjeta', cuerpo);
      const rango = document.createRange();
      rango.selectNodeContents(bloque);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(rango);
      avisar('Seleccionado: cópialo con el menú del teléfono.', true);
    }
  });
}
