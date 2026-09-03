/* ══════════════════════════════════════════════════════════════════════
   24 · ETIQUETAS PERSONALIZABLES

   QUÉ HACE ESTE ARCHIVO
   Deja renombrar las secciones y los estados del panel. Cada familia
   tiene su vocabulario: donde acá dice "Padrinos", en otra casa dicen
   "Padrinos y madrinas"; donde dice "Corte", dicen "Chambelanes".

   CÓMO SE USA EN EL CÓDIGO
   En vez de escribir el texto directo, se llama a et():

       et('nav.dinero', 'Presupuesto')

   Si alguien cambió esa etiqueta, devuelve la suya; si no, la de
   fábrica. El segundo parámetro NO es opcional a propósito: así el
   panel funciona igual aunque el servidor no conteste, y leyendo el
   código se ve qué dice cada cosa sin tener que buscar la traducción.

   QUÉ SE PUEDE RENOMBRAR Y QUÉ NO
   Las etiquetas que se leen seguido: pestañas, sub-secciones y estados.
   Los textos de ayuda y los mensajes de error no, porque nadie los lee
   dos veces y hacerlos configurables sería mucho trabajo para nada.

   ÍNDICE
     1. Leer y traducir
     2. Aplicar a la pantalla
     3. La pantalla de edición
   ══════════════════════════════════════════════════════════════════════ */


/** Las etiquetas cambiadas. Vacío = todo con los nombres de fábrica. */
let ETIQUETAS = {};

/**
 * Qué se puede renombrar, agrupado como se muestra en pantalla.
 *
 * Cada renglón: [clave, nombre de fábrica].
 */
const ETIQUETAS_EDITABLES = {
  'Las pestañas de abajo': [
    ['nav.resumen',    'Resumen'],
    ['nav.invitados',  'Gente'],
    ['nav.correo',     'Correo'],
    ['nav.dinero',     'Dinero'],
    ['nav.evento',     'Evento'],
  ],
  'Dentro de Presupuesto': [
    ['dinero.resumen',      'Resumen'],
    ['dinero.gastos',       'Gastos'],
    ['dinero.pagos',        'Pagos'],
    ['dinero.padrinos',     'Padrinos'],
    ['dinero.proveedores',  'Proveedores'],
    ['dinero.cotizaciones', 'Cotizaciones'],
  ],

  /* El orden de acá abajo sigue al de los grupos del índice de Evento
     (ver CONFIGURACION.indiceDeEvento), para que encontrar un nombre en
     esta lista sea igual de fácil que encontrarlo en pantalla. */
  'Dentro de Evento': [
    ['evento.calendario',           'Calendario'],
    ['evento.tareas',               'Tareas'],
    ['evento.agenda',               'Agenda'],
    ['evento.ceremonia',            'Misa'],
    ['evento.requisitos_ceremonia', 'Papeles'],
    ['evento.musica',               'Música'],
    ['evento.corte_honor',          'Corte'],
    ['evento.ensayos',              'Ensayos'],
    ['evento.citas_arreglo',        'Vestido'],
    ['evento.cronograma',           'Cronograma'],
    ['evento.tomas_foto',           'Fotos'],
  ],

  /* Mesas, Regalos y Foráneos se mudaron acá desde Evento, así que sus
     claves son "gente." — las mismas que usa dibujarGente() al pintar
     las píldoras. */
  'Dentro de Gente': [
    ['gente.invitados', 'Invitados'],
    ['gente.mesas',     'Mesas'],
    ['gente.regalos',   'Regalos'],
    ['gente.foraneos',  'Foráneos'],
    ['gente.contactos', 'Contactos'],
  ],
};


/* ─── 1. LEER Y TRADUCIR ───────────────────────────────────────────── */

/**
 * Devuelve el nombre de una etiqueta.
 *
 * @param {string} clave - 'nav.dinero'
 * @param {string} porDefecto - El nombre de fábrica.
 * @returns {string}
 */
function et(clave, porDefecto) {
  const propia = ETIQUETAS[clave];
  return (propia && String(propia).trim()) ? propia : porDefecto;
}

/**
 * Trae las etiquetas cambiadas desde el servidor.
 *
 * Se llama una vez al arrancar. Si falla, se sigue con las de fábrica:
 * no poder renombrar una pestaña no es motivo para no abrir la app.
 *
 * @returns {Promise<void>}
 */
async function cargarEtiquetas() {
  try {
    const traidas = await traer('etiquetas.php?accion=leer');
    ETIQUETAS = (traidas && typeof traidas === 'object') ? traidas : {};
  } catch (error) {
    ETIQUETAS = {};
  }
}


/* ─── 2. APLICAR A LA PANTALLA ─────────────────────────────────────── */

/**
 * Escribe las etiquetas en las pestañas de abajo y en los títulos.
 *
 * Se llama después de cargarlas y cada vez que se guardan cambios.
 *
 * @returns {void}
 */
function aplicarEtiquetas() {
  /* ⚠️ ESTA TABLA PISABA EL RENOMBRADO A "DINERO", Y POR ESO EL CAMBIO NUNCA
     SE VIO (2026-09-03). El 2 de septiembre se unificó el nombre de la vista
     en "Dinero" (ver la nota en 05-navegacion.js), con el argumento correcto
     de que dos nombres para el mismo lugar obligan a traducir mentalmente
     cada vez. Pero el arranque llama a aplicarEtiquetas() DESPUÉS de armar
     VISTAS, y acá el valor de fábrica seguía diciendo 'Presupuesto': la
     última palabra la tenía esta línea, no la otra.

     Resultado en la pantalla de Lucila: el mismo destino se llamaba "Dinero"
     en el acceso rápido del Resumen y "Presupuesto" en el encabezado, en el
     índice de Planificar y en el atajo del icono. El valor de fábrica de acá
     ahora es el mismo que el de VISTAS; si algún día se quiere cambiar, se
     cambia en los dos o se vuelve a partir en dos. */
  const deFabrica = {
    resumen: 'Resumen', invitados: 'Gente', correo: 'Correo',
    dinero: 'Dinero', evento: 'Evento',
  };

  Object.keys(deFabrica).forEach(clave => {
    const nombre = et('nav.' + clave, deFabrica[clave]);

    /* Solo tienen botón propio las vistas que están en la barra de abajo; las
       demás cuelgan de otra (ver PADRE_DE_VISTA en 05-navegacion.js) y este
       buscar() devuelve null, que es lo esperado. */
    const boton = buscar('[data-ir=' + clave + '] span');
    if (boton) boton.textContent = nombre;

    // El título del encabezado sale de la misma tabla.
    if (VISTAS[clave]) VISTAS[clave].titulo = nombre;
  });

  // Si hay una vista abierta, su título ya está escrito: se refresca.
  if (VISTAS[VISTA_ACTUAL]) {
    const sub = buscar('#subtitulo-vista');
    ponerTitulo(VISTAS[VISTA_ACTUAL].titulo, sub ? sub.textContent : '');
  }
}


/* ─── 3. LA PANTALLA DE EDICIÓN ────────────────────────────────────── */

/**
 * Abre el editor de etiquetas.
 *
 * @returns {void}
 */
function abrirEtiquetas() {
  if (USUARIO.rol !== 'admin') {
    avisar('Solo una administradora puede cambiar los nombres.', true);
    return;
  }

  const grupos = Object.keys(ETIQUETAS_EDITABLES).map(grupo =>
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      seguro(grupo) +
    '</div>' +

    ETIQUETAS_EDITABLES[grupo].map(([clave, porDefecto]) =>
      '<label class="campo" style="margin-bottom:var(--esp-2)">' +
        '<span class="campo__rotulo">' + seguro(porDefecto) + '</span>' +
        '<input type="text" class="campo__control" ' +
               'data-etiqueta="' + seguro(clave) + '" ' +
               'value="' + seguro(ETIQUETAS[clave] || '') + '" ' +
               'placeholder="' + seguro(porDefecto) + '" maxlength="40">' +
      '</label>'
    ).join('')
  ).join('');

  const cuerpo = abrirHoja('Cambiar los nombres',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Escribe cómo prefieres que se llame cada cosa. Lo que dejes vacío ' +
      'se queda con el nombre de siempre.' +
    '</p>' +

    grupos +

    '<button class="boton boton--principal boton--ancho" id="et-guardar" ' +
            'style="margin-top:var(--esp-3)">Guardar los nombres</button>' +

    '<button class="boton boton--ancho boton--peligro" id="et-restaurar" ' +
            'style="margin-top:var(--esp-1)">Volver a los nombres originales</button>'
  );

  buscar('#et-guardar', cuerpo).addEventListener('click', async () => {
    const cambios = {};

    buscarTodos('[data-etiqueta]', cuerpo).forEach(campo => {
      cambios[campo.dataset.etiqueta] = campo.value.trim();
    });

    try {
      const r = await mandar('etiquetas.php?accion=guardar', { etiquetas: cambios });
      ETIQUETAS = r.etiquetas || {};

      cerrarHoja(true);
      avisar(r.mensaje);
      aplicarEtiquetas();

      /* Las sub-pestañas se dibujan al pintar cada vista, así que hay
         que redibujarlas para que tomen los nombres nuevos. */
      ensuciarVistas('resumen', 'invitados', 'correo', 'dinero', 'evento');
      irA(VISTA_ACTUAL, true);

    } catch (error) {
      avisar(error.message, true);
    }
  });

  buscar('#et-restaurar', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion('¿Volver a los nombres originales?')) return;

    try {
      const r = await mandar('etiquetas.php?accion=restaurar', {});
      ETIQUETAS = {};

      cerrarHoja(true);
      avisar(r.mensaje);
      aplicarEtiquetas();
      ensuciarVistas('resumen', 'invitados', 'correo', 'dinero', 'evento');
      irA(VISTA_ACTUAL, true);

    } catch (error) {
      avisar(error.message, true);
    }
  });
}
