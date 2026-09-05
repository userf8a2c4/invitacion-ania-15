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
     3. El punto en el mapa
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

    /* El punto va DESPUÉS de la dirección escrita a propósito: primero
       se escribe a dónde va, y después se afina en el mapa. Al revés, el
       mapa parecería el dato principal, y no lo es. */
    '<div class="campo">' +
      '<span class="campo__rotulo">El punto exacto</span>' +
      '<p class="vacio__texto" style="margin:4px 0 8px">' +
        'Arrastra el pin, o toca el mapa donde va. Sirve para que quien ' +
        'entrega llegue a la puerta y no a la esquina.' +
      '</p>' +
      '<div id="dir-mapa" style="height:220px;border-radius:var(--redondeo-chico);' +
           'overflow:hidden;border:1px solid var(--borde);background:var(--fondo-elevado)">' +
        '<p class="vacio__texto" style="padding:var(--esp-2)">Cargando el mapa…</p>' +
      '</div>' +
      '<div class="acciones" style="margin-top:var(--esp-1);flex-wrap:wrap">' +
        '<button type="button" class="boton boton--chico" id="dir-aqui">' +
          'Estoy aquí ahora</button>' +
        '<button type="button" class="boton boton--chico" id="dir-sin-punto">' +
          'Quitar el punto</button>' +
      '</div>' +
      '<p class="vacio__texto" id="dir-punto-texto" style="margin-top:6px"></p>' +
    '</div>' +

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

  /* ── El punto en el mapa ──
     Vive en esta variable y no en un campo escondido del formulario:
     nadie lo escribe a mano, lo mueve el pin. */
  let punto = { lat: dir.lat || '', lng: dir.lng || '' };
  let mapa  = null;   // lo llena dibujarMapaDeDireccion() si el mapa cargó

  const contarElPunto = () => {
    const texto = buscar('#dir-punto-texto', cuerpo);
    if (!texto) return;
    texto.textContent = punto.lat
      ? 'Punto marcado en ' + punto.lat + ', ' + punto.lng
      : 'Sin punto todavía. La dirección escrita se guarda igual.';
  };

  contarElPunto();

  dibujarMapaDeDireccion(cuerpo, punto, nuevo => {
    punto = nuevo;
    contarElPunto();
  }).then(control => { mapa = control; });

  buscar('#dir-aqui', cuerpo).addEventListener('click', () => {
    if (!navigator.geolocation) {
      avisar('Este teléfono no puede compartir dónde está.', true);
      return;
    }
    if (!mapa) {
      avisar('El mapa todavía no está listo. Espera un momento.', true);
      return;
    }

    avisar('Buscando dónde estás…');
    navigator.geolocation.getCurrentPosition(
      posicion => {
        mapa.mover(posicion.coords.latitude, posicion.coords.longitude);
        avisar('Listo. Mueve el pin si hace falta afinarlo.');
      },
      /* Casi siempre es que el navegador pidió permiso y se dijo que no.
         No es un error del panel, y decirlo así evita que alguien crea
         que se rompió algo. */
      () => avisar('No se pudo saber dónde estás. Marca el punto a mano en el mapa.', true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  buscar('#dir-sin-punto', cuerpo).addEventListener('click', () => {
    punto = { lat: '', lng: '' };
    contarElPunto();
    avisar('Punto quitado. La dirección escrita se guarda igual.');
  });

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
        lat: punto.lat,
        lng: punto.lng,
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


/* ─── 3. EL PUNTO EN EL MAPA ────────────────────────────────

   POR QUÉ ADEMÁS DEL TEXTO Y NO EN VEZ DE
   La dirección escrita la lee una persona: quien arma el pedido, quien
   llama para preguntar. El punto es el que abre bien en un mapa y lleva
   al repartidor a la puerta. Una colonia mal escrita se entiende igual;
   un punto mal puesto, no. Las dos cosas se guardan juntas.

   POR QUÉ LEAFLET Y NO GOOGLE
   Porque no pide clave de API. Google Maps con pin arrastrable
   obligaría a sacar una clave, facturarla y cuidarla — para poner un
   punto en un mapa cada tanto. Leaflet con las teselas de OpenStreetMap
   no necesita nada de eso.

   SE CARGA AL ABRIR LA FICHA, COMO EL QR
   Mismo criterio y mismo patrón que cargarQRCode() en el sitio público:
   nadie descarga un mapa por abrir el panel. Y con tope de tiempo, que
   es lo que cubre el caso real de un teléfono con señal floja: una
   conexión que no cierra y donde `onload` no se dispara nunca.

   SI EL MAPA NO CARGA, EL FORMULARIO SIGUE SIRVIENDO
   Es la misma lección de la invitación en blanco: lo accesorio no puede
   llevarse puesto lo esencial. Sin mapa se guarda la dirección escrita,
   que es lo que de verdad hace falta para que algo llegue. */

/* El centro cuando todavía no hay punto: la zona de Toluca, que es
   donde Lucila va a recibir sus compras.

   ⚠️ ESTO NO TIENE NADA QUE VER CON EL LUGAR DE LA FIESTA.
   Son direcciones logísticas: su casa, la de su mamá, a dónde mandar un
   ramo. El salón tiene su propia dirección, vive en
   codigo/01-configuracion.js y no se toca desde acá. Confundir las dos
   cosas llevaría a "arreglar" el domicilio que leen 114 invitados por
   corregir el centro de un mapa que solo usa ella. */
const CENTRO_DEL_MAPA = [19.2926, -99.6569];

/** La carga de Leaflet, guardada para no pedirla dos veces. */
let cargaDeLeaflet = null;

/**
 * Trae Leaflet (su CSS y su JS) si todavía no está.
 *
 * @returns {Promise<boolean>} true si quedó usable.
 */
function cargarLeaflet() {
  if (typeof L !== 'undefined') return Promise.resolve(true);
  if (cargaDeLeaflet) return cargaDeLeaflet;

  cargaDeLeaflet = new Promise(resolver => {
    let yaTermino = false;
    const terminar = () => {
      if (yaTermino) return;
      yaTermino = true;
      resolver(typeof L !== 'undefined');
    };

    /* Ocho segundos, igual que el QR del sitio: más de lo que tarda un
       CDN sano, y mucho menos que la paciencia de alguien mirando un
       recuadro gris. Sin este reloj, una conexión que no cierra deja la
       promesa colgada para siempre. */
    const reloj = setTimeout(terminar, 8000);
    const listo = () => { clearTimeout(reloj); terminar(); };

    const hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(hoja);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = listo;
    script.onerror = listo;
    document.head.appendChild(script);
  });

  return cargaDeLeaflet;
}

/**
 * Dibuja el mapa con el pin arrastrable dentro de la ficha abierta.
 *
 * @param {Element} cuerpo   - La hoja de la ficha.
 * @param {Object} punto     - {lat, lng}; vacíos si todavía no hay.
 * @param {Function} alMover - Recibe {lat, lng} cada vez que el pin cambia.
 * @returns {Promise<Object|null>} Un control con mover(lat, lng), o null
 *   si el mapa no se pudo dibujar.
 */
async function dibujarMapaDeDireccion(cuerpo, punto, alMover) {
  const donde = buscar('#dir-mapa', cuerpo);
  if (!donde) return null;

  const hay = await cargarLeaflet();

  // La ficha se pudo haber cerrado mientras el mapa venía en camino.
  if (!donde.isConnected) return null;

  if (!hay) {
    donde.innerHTML =
      '<p class="aviso" style="margin:var(--esp-2)">No se pudo cargar el mapa. ' +
      'La dirección escrita se guarda igual; el punto se puede marcar después.</p>';
    return null;
  }

  /* Leaflet no limpia el contenedor: sin esto, el "Cargando el mapa…"
     se queda debajo de las teselas. */
  donde.innerHTML = '';

  const hayPunto = punto && punto.lat !== '' && punto.lat !== null && punto.lat !== undefined;
  const centro = hayPunto ? [Number(punto.lat), Number(punto.lng)] : CENTRO_DEL_MAPA;

  const mapa = L.map(donde).setView(centro, hayPunto ? 17 : 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(mapa);

  /* Un pin dibujado con CSS y no una imagen: los iconos que trae Leaflet
     se piden por una ruta relativa que, cargando la biblioteca desde un
     CDN, apunta a donde no hay nada — y el marcador sale roto. Con un
     divIcon no hay archivo que pueda faltar. */
  const alfiler = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;' +
          'transform:rotate(-45deg);background:var(--dorado,#c9a227);' +
          'border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });

  const pin = L.marker(centro, { draggable: true, icon: alfiler }).addTo(mapa);

  /* Siete decimales son ~1 cm: de sobra para una puerta, y es lo que
     admite la columna DECIMAL(10,7) de la base. */
  const avisarDelPunto = () => {
    const p = pin.getLatLng();
    alMover({ lat: p.lat.toFixed(7), lng: p.lng.toFixed(7) });
  };

  pin.on('dragend', avisarDelPunto);

  /* Tocar el mapa también mueve el pin: en un teléfono es más cómodo
     que arrastrarlo desde lejos. */
  mapa.on('click', evento => { pin.setLatLng(evento.latlng); avisarDelPunto(); });

  /* El mapa se dibuja dentro de una hoja que acaba de abrirse con una
     animación: si mide su tamaño antes de que termine, queda cortado y
     con la mitad de las teselas en gris. */
  setTimeout(() => mapa.invalidateSize(), 350);

  /* Si la dirección ya traía punto, se confirma hacia arriba: así el
     texto de abajo dice lo mismo que muestra el mapa desde el arranque. */
  if (hayPunto) avisarDelPunto();

  return {
    mover(lat, lng) {
      pin.setLatLng([lat, lng]);
      mapa.setView([lat, lng], 17);
      avisarDelPunto();
    },
  };
}
