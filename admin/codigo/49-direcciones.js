/* ══════════════════════════════════════════════════════════════════════
   49 · DIRECCIONES DE ENTREGA

   QUÉ HACE ESTE ARCHIVO
   La pantalla donde Lucila carga las direcciones a las que puede llegar
   algo que compre con ayuda del equipo: la casa, el salón, la casa de su
   mamá. En cada compra se elige una.

   POR QUÉ VARIAS Y NO UNA
   Porque no todo va al mismo lado. Las cosas del salón conviene que
   lleguen al salón, y lo que hay que tener antes, a la casa. Con una
   sola dirección alguien tiene que acordarse de avisar cada vez — y
   avisar cada vez es exactamente lo que se olvida.

   EL LENGUAJE ES EL DE ELLA
   "¿Dónde lo recibes?", no "dirección de envío del pedido". Y "la de
   siempre" en vez de "predeterminada", que es palabra de formulario.

   QUITAR NO BORRA
   Una compra vieja tiene que poder seguir diciendo a dónde se entregó.
   Quitar una dirección la saca de la lista para elegir y la deja
   guardada; se puede volver a activar. Ver admin/api/direcciones.php.

   ÍNDICE
     1. Abrir la pantalla y pintar la lista
     2. La ficha de una dirección
   ══════════════════════════════════════════════════════════════════════ */

/** Lo último que devolvió el servidor, para no volver a pedirlo al pintar. */
let DIRECCIONES = [];


/* ─── 1. LA PANTALLA ────────────────────────────────────────────────── */

/**
 * Abre la lista de direcciones de entrega.
 *
 * @returns {void}
 */
function abrirDirecciones() {
  const cuerpo = abrirHoja('¿Dónde recibes las compras?',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
      'Guarda los lugares a los que puede llegar algo que compres. ' +
      'Cuando el equipo te proponga una compra, eliges a cuál va.' +
    '</p>' +
    '<div id="dir-lista"><p class="vacio__texto">Buscando…</p></div>' +
    botonAgregar('Agregar una dirección'));

  buscar('#agregar', cuerpo).addEventListener('click', () => abrirFichaDeDireccion(null));

  cargarDirecciones(cuerpo);
}

/**
 * Pide las direcciones y las pinta.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function cargarDirecciones(cuerpo) {
  const donde = buscar('#dir-lista', cuerpo);
  if (!donde) return;

  try {
    const r = await traer('direcciones.php?accion=listar');
    DIRECCIONES = r.filas || [];
    pintarListaDeDirecciones(cuerpo);
  } catch (error) {
    pintarError(donde, error.message, () => cargarDirecciones(cuerpo));
  }
}

/**
 * Dibuja la lista con lo que ya está en DIRECCIONES.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarListaDeDirecciones(cuerpo) {
  const donde = buscar('#dir-lista', cuerpo);
  if (!donde) return;

  if (!DIRECCIONES.length) {
    pintarVacio(donde, 'Todavía no hay ninguna',
      'Agrega la primera con el botón de abajo. Si solo cargas una, esa se usa siempre.');
    return;
  }

  donde.innerHTML = DIRECCIONES.map(d => {
    const activa = Number(d.activa) === 1;
    const deSiempre = Number(d.es_predeterminada) === 1;

    /* Solo lo que sirve para reconocerla de un vistazo. El detalle
       completo está en su ficha; repetirlo acá haría una lista larga
       que hay que leer en vez de mirar. */
    const donde2 = [d.colonia, d.ciudad].filter(x => String(x || '').trim() !== '').join(', ');

    return '<button class="lista__fila" data-dir="' + seguro(d.id) + '"' +
                   (activa ? '' : ' style="opacity:.55"') + '>' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' + seguro(d.alias) +
          (deSiempre ? ' <span class="etiqueta etiqueta--bien">la de siempre</span>' : '') +
          (activa ? '' : ' <span class="etiqueta">quitada</span>') +
        '</span>' +
        '<span class="lista__pie">' + seguro(d.calle) +
          (donde2 ? ' · ' + seguro(donde2) : '') +
        '</span>' +
      '</span>' +
    '</button>';
  }).join('');

  buscarTodos('[data-dir]', donde).forEach(fila => {
    fila.addEventListener('click', () => {
      const d = DIRECCIONES.find(x => String(x.id) === fila.dataset.dir);
      if (d) abrirFichaDeDireccion(d, cuerpo);
    });
  });
}


/* ─── 2. LA FICHA DE UNA DIRECCIÓN ──────────────────────────────────── */

/**
 * Crear una dirección nueva, o corregir una que ya está.
 *
 * @param {Object|null} d      - null para crear una nueva.
 * @param {Element} [deVuelta] - La hoja de la lista, para repintarla.
 * @returns {void}
 */
function abrirFichaDeDireccion(d, deVuelta) {
  const esNueva = !d;
  const dir = d || {};
  const activa = esNueva || Number(dir.activa) === 1;
  const deSiempre = Number(dir.es_predeterminada) === 1;

  const cuerpo = abrirHoja(esNueva ? 'Nueva dirección' : seguro(dir.alias || 'Dirección'),
    campoTexto({ id: 'dir-alias', rotulo: 'Cómo la reconoces', valor: dir.alias,
                 ayuda: 'Por ejemplo: Casa, Salón, Casa de mi mamá.' }) +

    campoTexto({ id: 'dir-calle', rotulo: 'Calle y número', valor: dir.calle }) +
    campoTexto({ id: 'dir-colonia', rotulo: 'Colonia', valor: dir.colonia }) +
    campoTexto({ id: 'dir-ciudad', rotulo: 'Ciudad', valor: dir.ciudad }) +
    campoTexto({ id: 'dir-estado', rotulo: 'Estado', valor: dir.estado }) +
    campoTexto({ id: 'dir-cp', rotulo: 'Código postal', valor: dir.cp }) +

    campoTelefono({ id: 'dir-telefono', rotulo: 'Teléfono de quien recibe',
                    valor: dir.telefono_contacto }) +

    campoLargo({ id: 'dir-referencias', rotulo: 'Cómo llegar',
                 valor: dir.referencias }) +

    /* Las acciones que cambian el estado van aparte del formulario: no
       son "guardar", y mezclarlas haría dudar si hace falta guardar
       después de tocarlas. */
    (esNueva ? '' :
      '<div class="acciones" style="margin-top:var(--esp-3);flex-wrap:wrap">' +
        (activa && !deSiempre
          ? '<button class="boton" id="dir-siempre">Usar esta siempre</button>'
          : '') +
        (activa
          ? '<button class="boton boton--peligro" id="dir-quitar">Quitar de la lista</button>'
          : '<button class="boton" id="dir-activar">Volver a usarla</button>') +
      '</div>') +

    pieDeFormulario(esNueva ? 'Agregar' : 'Guardar'));

  const refrescar = () => {
    cerrarHoja(true);
    if (deVuelta) cargarDirecciones(deVuelta);
  };

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const alias = valorDe('dir-alias', cuerpo);
    const calle = valorDe('dir-calle', cuerpo);

    if (!alias) { avisar('Ponle un nombre para reconocerla. Por ejemplo: Casa.', true); return; }
    if (!calle) { avisar('Falta la calle y el número.', true); return; }

    try {
      await mandar('direcciones.php?accion=guardar', {
        id: esNueva ? 0 : dir.id,
        alias: alias,
        calle: calle,
        colonia: valorDe('dir-colonia', cuerpo),
        ciudad: valorDe('dir-ciudad', cuerpo),
        estado: valorDe('dir-estado', cuerpo),
        cp: valorDe('dir-cp', cuerpo),
        telefono_contacto: valorDe('dir-telefono', cuerpo),
        referencias: valorDe('dir-referencias', cuerpo),
      });
      avisar(esNueva ? 'Agregada.' : 'Guardada.');
      refrescar();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const botonSiempre = buscar('#dir-siempre', cuerpo);
  if (botonSiempre) {
    botonSiempre.addEventListener('click', async () => {
      try {
        await mandar('direcciones.php?accion=predeterminada', { id: dir.id });
        avisar('Ahora las compras se proponen a esta dirección.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const botonQuitar = buscar('#dir-quitar', cuerpo);
  if (botonQuitar) {
    botonQuitar.addEventListener('click', async () => {
      if (!await confirmarAccion(
        '¿Quitar «' + (dir.alias || '') + '» de la lista?\n\n' +
        'No se borra: las compras que ya se entregaron ahí la siguen ' +
        'nombrando, y puedes volver a usarla cuando quieras.',
        { confirmar: 'Quitarla', cancelar: 'Dejarla' })) return;

      try {
        await mandar('direcciones.php?accion=desactivar', { id: dir.id });
        avisar('Quitada de la lista.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const botonActivar = buscar('#dir-activar', cuerpo);
  if (botonActivar) {
    botonActivar.addEventListener('click', async () => {
      try {
        await mandar('direcciones.php?accion=activar', { id: dir.id });
        avisar('Vuelve a estar en la lista.');
        refrescar();
      } catch (error) { avisar(error.message, true); }
    });
  }
}
