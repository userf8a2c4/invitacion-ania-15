/* ══════════════════════════════════════════════════════════════════════
   25 · HOY, EL DÍA DEL EVENTO Y COMPARTIR

   QUÉ HAY EN ESTE ARCHIVO
   Tres pantallas que responden preguntas distintas del mismo día:

     · HOY          → "¿qué tengo que hacer ahora?"
     · EL DÍA       → el cronograma en pantalla completa, para el 24
     · COMPARTIR    → mandarle a cada proveedor lo suyo

   POR QUÉ "HOY" NO ES EL RESUMEN
   El Resumen muestra el estado completo. Está bien para sentarse a
   mirar cómo viene todo, pero es demasiado para el momento en que uno
   abre la app con una mano mientras habla por teléfono con el salón.
   Acá van tres cosas y nada más.

   ÍNDICE
     1. Hoy
     2. El día del evento
     3. Compartir
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió hoy.php. */
let HOY = null;

/** Cuántos pendientes se muestran. Más que esto ya no se lee. */
const CUANTOS_PENDIENTES = 4;


/* ─── 1. HOY ───────────────────────────────────────────────────────── */

/**
 * Pinta el bloque de "hoy" arriba del Resumen.
 *
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function pintarHoy(donde) {
  try {
    HOY = await traer('hoy.php');
  } catch (error) {
    /* ANTES ESTO BORRABA EL BLOQUE SIN DECIR NADA, y con él se iba el
       botón para abrir el cronograma. El 24 de octubre, un error de red
       de un segundo escondía justo la pantalla que hace falta.

       Ahora se avisa y se ofrece reintentar. Y el acceso al modo del
       día no depende de esta llamada: está también en Evento y en el
       menú. */
    pintarError(donde, error.message, () => pintarHoy(donde));
    return;
  }

  const pendientes = HOY.pendientes || [];
  const primeros = pendientes.slice(0, CUANTOS_PENDIENTES);
  const restantes = pendientes.length - primeros.length;

  const colores = {
    pago: 'alerta', tarea: 'ojo', agenda: 'info',
    ensayo: 'info', vestido: 'oro', alarma: 'oro',
  };

  /* El día del evento la pantalla cambia de cara: deja de preguntar qué
     hacer y pasa a ser el cronograma.

     Los días previos el botón aparece igual, más discreto. Sirve para
     repasar el cronograma la noche anterior —que es cuando de verdad se
     repasa— y para que el 24 nadie tenga que descubrir un botón que ve
     por primera vez. */
  const faltan = Number(HOY.dias_para_la_fiesta);
  const yaCasi = !HOY.es_el_dia && faltan >= 0 &&
                 faltan <= CONFIGURACION.avisos.diasParaElModoDelDia;

  donde.innerHTML =
    (HOY.es_el_dia || yaCasi
      ? '<button class="boton boton--ancho ' +
                (HOY.es_el_dia ? 'boton--principal' : '') + '" id="hoy-es-el-dia" ' +
                'style="margin-bottom:var(--esp-2);min-height:52px;font-size:16px">' +
          (HOY.es_el_dia
            ? 'Hoy son los XV · Abrir el cronograma'
            : 'Ver el cronograma del día') +
        '</button>'
      : '') +

    '<div class="tarjeta">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
        '<div class="tarjeta__titulo" style="margin:0">Hoy</div>' +
        (HOY.atrasados
          ? '<span class="etiqueta etiqueta--alerta">' +
            seguro(pluralizar(HOY.atrasados, 'atrasado', 'atrasados')) + '</span>'
          : '') +
      '</div>' +

      (primeros.length
        ? '<div style="margin-top:var(--esp-2)">' +
            primeros.map(p =>
              '<button class="alerta-fila' +
                (p.urgencia === 0 ? ' alerta-fila--urgente' : '') + '" ' +
                'data-hoy="' + seguro(p.ir_a + '|' + p.seccion) + '">' +
                '<span class="hito__marca hito__marca--' +
                  (colores[p.tipo] || 'tenue') + '" ' +
                  'style="position:static;box-shadow:none"></span>' +
                '<span class="alerta-fila__texto">' + seguro(p.texto) +
                  (p.detalle
                    ? '<span class="alerta-fila__pie" style="display:block">' +
                      seguro(p.detalle) + '</span>'
                    : '') +
                '</span>' +
              '</button>'
            ).join('') +
            (restantes > 0
              ? '<p class="vacio__texto" style="text-align:center">y ' +
                seguro(restantes) + ' más esta semana</p>'
              : '') +
          '</div>'
        : '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'Nada urgente hoy. Buen día para adelantar algo tranquila.</p>') +
    '</div>' +

    bloqueAQuienLlamar(HOY.a_quien_llamar) +
    bloqueListaFinal(HOY.lista_final, HOY.dias_para_la_fiesta);

  /* ─── Enganches ─────────────────────────────────────────────────── */
  buscarTodos('[data-hoy]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      const [destino, seccion] = boton.dataset.hoy.split('|');
      if (!destino) { abrirAlarmas(); return; }

      /* Evento va por su propia función: entrar a esa pestaña vuelve al
         índice, así que asignar SECCION_EVENTO acá no alcanzaría —el
         dibujado la pisaría antes de que se vea. */
      if (destino === 'evento' && seccion) { irASeccionDeEvento(seccion); return; }

      if (destino === 'dinero' && seccion) SECCION_DINERO = seccion;
      irA(destino, true);
    });
  });

  const elDia = buscar('#hoy-es-el-dia', donde);
  if (elDia) elDia.addEventListener('click', abrirModoDelDia);
}

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
        const digitos = String(p.telefono).replace(/\D/g, '');
        return '<div class="lista__fila">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(p.nombre) + '</span>' +
            '<span class="lista__pie">' + seguro(p.porque) + '</span>' +
          '</span>' +
          /* Sin --chico: llamar y escribir son las dos cosas que se
             hacen apurada y sin mirar. 44 px, como manda el mínimo. */
          '<a class="boton" href="tel:' + seguro(p.telefono) + '">Llamar</a>' +
          '<a class="boton" target="_blank" rel="noopener" ' +
             'href="https://wa.me/' + seguro(digitos) + '">WhatsApp</a>' +
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
  /* filtro--grande y no .filtro a secas: estas dos pestañas se tocan de
     pie, con prisa y con una sola mano. 34 px es chico para eso. */
  const cuerpo = abrirHoja('El día',
    '<div class="filtros">' +
      '<button class="filtro filtro--grande activo" data-dia-modo="cronograma">' +
        'Cronograma</button>' +
      '<button class="filtro filtro--grande" data-dia-modo="pases">Buscar pase</button>' +
    '</div>' +
    '<div id="dia-cuerpo"><div class="esqueleto"></div></div>');

  const caja = buscar('#dia-cuerpo', cuerpo);

  buscarTodos('[data-dia-modo]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      buscarTodos('[data-dia-modo]', cuerpo).forEach(o =>
        o.classList.toggle('activo', o === boton));

      if (boton.dataset.diaModo === 'pases') pintarBuscadorDePases(caja);
      else pintarCronogramaGrande(caja);
    });
  });

  pintarCronogramaGrande(caja);
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
      'Armalo desde Evento → El día para tenerlo acá el 24.');
    return;
  }

  const ahora = new Date();
  const horaAhora = String(ahora.getHours()).padStart(2, '0') + ':' +
                    String(ahora.getMinutes()).padStart(2, '0');

  /* Se marca lo que está pasando ahora: el último momento cuya hora ya
     llegó. Es lo que uno busca al mirar el teléfono en medio de la
     fiesta. */
  let elDeAhora = -1;
  momentos.forEach((m, i) => {
    if (String(m.hora).slice(0, 5) <= horaAhora) elDeAhora = i;
  });

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

/**
 * Buscar un pase por código o por nombre, para la entrada.
 *
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function pintarBuscadorDePases(donde) {
  donde.innerHTML =
    '<div class="buscador">' +
      '<input type="search" id="buscar-pase" class="buscador__control" ' +
             'style="padding-left:var(--esp-3);font-size:18px;min-height:52px" ' +
             'placeholder="Código o nombre" autocapitalize="characters" ' +
             'autocomplete="off" spellcheck="false">' +
    '</div>' +
    '<div id="resultado-pase"></div>';

  const campo = buscar('#buscar-pase', donde);
  const caja  = buscar('#resultado-pase', donde);
  campo.focus();

  /* SE RECARGA SIEMPRE, aunque ya hubiera invitados en memoria.
   *
   * Antes solo se pedía la lista si estaba vacía, y eso fallaba
   * justo el día que importa: si alguien abrió la pestaña Invitados a
   * la mañana, en la puerta se buscaba contra la lista de la mañana, y
   * quien hubiera confirmado durante el día no aparecía. Buscar un pase
   * que existe y que la app diga que no está es peor que no tener
   * buscador.
   *
   * La espera no se nota: se puede empezar a escribir enseguida, y con
   * la copia del teléfono esto contesta aunque no haya señal. */
  let listaAlDia = false;
  try {
    const r = await traer('confirmaciones.php?accion=listar');
    INVITADOS = r.filas || [];
    INVITADOS_EDITABLES = !!r.editable;
    listaAlDia = true;
  } catch (error) {
    /* Ni servidor ni copia guardada. Se sigue con lo que haya quedado
       en memoria porque es mejor que nada, pero NO cuenta como lista al
       día: justamente lo que puede faltarle es quien confirmó hoy. Que
       haya algo cargado no lo vuelve confiable. */
    listaAlDia = false;
  }

  if (!INVITADOS.length) {
    caja.innerHTML =
      '<p class="aviso-error">No pude cargar la lista de invitados. ' +
      'Revisá la conexión y volvé a abrir esta pantalla.</p>';
  }

  campo.addEventListener('input', () => {
    const aguja = paraBuscar(campo.value);

    if (aguja.length < 2) { caja.innerHTML = ''; return; }

    const encontrados = INVITADOS.filter(f =>
      paraBuscar([f.nombre, f.codigo].join(' ')).includes(aguja)
    ).slice(0, 8);

    if (!encontrados.length) {
      /* Se distingue "no está en la lista" de "no tengo la lista". Antes
         las dos decían lo mismo, y en la puerta eso significa mandar a
         alguien de vuelta por un error de red. */
      caja.innerHTML = listaAlDia
        ? '<p class="aviso-error">No encontré a nadie con eso.</p>'
        : '<p class="aviso-error">No pude cargar la lista completa, así que ' +
          'esto puede estar incompleto. No busques por acá para dejar a ' +
          'alguien afuera.</p>';
      return;
    }

    caja.innerHTML = encontrados.map(f => {
      const asiste = Number(f.asiste) === 1;
      const gente = (Number(f.adultos) || 0) + (Number(f.ninos) || 0);

      return '<div class="tarjeta" style="border-color:' +
             (asiste ? 'var(--bien)' : 'var(--alerta)') + '">' +
        '<div style="font-size:19px;font-weight:600">' + seguro(f.nombre) + '</div>' +
        '<div style="font-size:28px;color:' +
          (asiste ? 'var(--bien)' : 'var(--alerta)') + ';font-weight:700">' +
          (asiste ? gente + (gente === 1 ? ' persona' : ' personas') : 'NO ASISTE') +
        '</div>' +
        (f.codigo
          ? '<div class="codigo-pase" style="font-size:14px">' +
            seguro(f.codigo) + '</div>' : '') +
        (f.alergias && !/^(ninguna|ninguno|no|-)$/i.test(f.alergias)
          ? '<div class="etiqueta etiqueta--ojo" style="margin-top:6px">⚠ ' +
            seguro(f.alergias) + '</div>' : '') +
      '</div>';
    }).join('');
  });
}


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
          'Abrí un proveedor en Presupuesto y elegí su paquete: después vas a ' +
          'poder mandarle lo suyo desde acá con un toque.</p>' +
        '</div>') +

    /* ─── Y los paquetes sueltos, para copiar o elegir destinatario ── */
    '<div class="indice__titulo">Armar un texto suelto</div>' +
    opciones.map(o =>
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
 * @param {string} cual
 * @returns {Promise<void>}
 */
async function armarParaCompartir(cual, proveedor) {
  const cuerpo = abrirHoja('Armando…', '<div class="esqueleto"></div>'.repeat(3));

  let datos;
  try {
    datos = await traer('compartir.php?accion=armar&cual=' + encodeURIComponent(cual) +
                        (proveedor ? '&proveedor=' + encodeURIComponent(proveedor.id) : ''));
  } catch (error) {
    cuerpo.innerHTML = '';
    pintarError(cuerpo, error.message, () => armarParaCompartir(cual, proveedor));
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

  cuerpo.innerHTML =
    aviso +

    /* Se muestra el texto completo antes de mandarlo. Nadie debería
       mandarle algo a un proveedor sin haberlo leído. */
    '<div class="tarjeta" style="white-space:pre-wrap;font-size:13px;' +
         'max-height:300px;overflow-y:auto;line-height:1.5">' +
      seguro(datos.texto) +
    '</div>' +

    '<a class="boton boton--principal boton--ancho" target="_blank" ' +
       'rel="noopener" id="comp-whatsapp" href="' + seguro(datos.whatsapp) + '" ' +
       'style="margin-top:var(--esp-2)">' +
      (proveedor ? 'Mandarle a ' + seguro(proveedor.nombre) : 'Mandar por WhatsApp') +
    '</a>' +

    '<button class="boton boton--ancho" id="comp-copiar" ' +
            'style="margin-top:var(--esp-1)">Copiar el texto</button>';

  /* Al tocar el botón se anota que se le mandó. Se anota que se ABRIÓ
     WhatsApp con el texto puesto: si después lo manda o no ya pasa
     adentro de WhatsApp, donde el panel no ve nada. Decir "enviado"
     sería afirmar más de lo que se sabe. */
  if (proveedor) {
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
      avisar('Copiado. Pegalo donde quieras.');
    } catch (error) {
      /* En algunos navegadores el portapapeles solo funciona con
         permiso. Si falla, se selecciona el texto para copiarlo a mano
         en vez de dejar a la persona sin salida. */
      const bloque = buscar('.tarjeta', cuerpo);
      const rango = document.createRange();
      rango.selectNodeContents(bloque);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(rango);
      avisar('Seleccionado: copialo con el menú del teléfono.', true);
    }
  });
}
