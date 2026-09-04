/* ══════════════════════════════════════════════════════════════════════
   14 · ARCHIVOS: SUBIR IMÁGENES Y TOMAR FOTOS

   QUÉ HACE ESTE ARCHIVO
   Deja adjuntar el contrato de un proveedor, la foto del comprobante de
   un pago, o cualquier imagen, a cualquier registro del panel.

   CÓMO SE ABRE LA CÁMARA DESDE UNA WEB
   Con el atributo `capture="environment"` en un <input type="file">. En
   el teléfono, eso hace que el botón abra directamente la cámara trasera
   en vez del explorador de archivos. En una computadora se ignora y
   funciona como un selector normal, así que sirve en los dos lados sin
   escribir dos caminos distintos.

   POR QUÉ LA FOTO SE ACHICA ANTES DE SUBIRLA
   Una foto de un teléfono moderno pesa entre 3 y 8 MB. Subirla entera
   por datos móviles tarda una eternidad y llena el hosting sin sentido:
   para leer un comprobante alcanza y sobra con 1600 píxeles de ancho.
   Se redimensiona en el navegador, antes de enviarla.

   ÍNDICE
     1. Elegir archivo o tomar foto
     2. Achicar imágenes
     3. Subir
     4. Listar y borrar
   ══════════════════════════════════════════════════════════════════════ */


/** Ancho máximo al que se achican las fotos antes de subirlas. */
const ANCHO_MAXIMO_FOTO = 1600;

/** Qué calidad de JPEG usar al recomprimir. 0.82 es indistinguible. */
const CALIDAD_FOTO = 0.82;


/* ─── 1. ELEGIR ARCHIVO O TOMAR FOTO ───────────────────────────────── */

/**
 * Abre el selector de archivos o la cámara, y sube lo que se elija.
 *
 * @param {Object} opciones
 * @param {string} opciones.tipo - A qué se ata: 'gasto', 'pago', 'proveedor'…
 * @param {number} opciones.id - El id de ese registro.
 * @param {boolean} [opciones.camara=false] - true abre la cámara directo.
 * @param {Function} [opciones.despues] - Se llama al terminar.
 * @returns {void}
 */
function elegirYSubir(opciones) {
  const entrada = document.createElement('input');
  entrada.type = 'file';

  /* Los tipos que acepta el servidor. Poner esto acá hace que el
     selector del teléfono ya filtre y no deje elegir un archivo que
     después va a rebotar. */
  entrada.accept = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

  if (opciones.camara) {
    // "environment" es la cámara de atrás; "user" sería la selfie.
    entrada.capture = 'environment';
    entrada.accept = 'image/*';
  } else {
    /* VARIOS ARCHIVOS DE UNA. Un contrato suele ser tres páginas
       escaneadas, y obligar a repetir el proceso tres veces era una
       molestia sin razón. La cámara queda de a una porque saca una foto
       por vez de todos modos. */
    entrada.multiple = true;
  }

  entrada.addEventListener('change', async () => {
    const archivos = Array.from(entrada.files || []);
    if (!archivos.length) return;

    if (archivos.length === 1) {
      await subirArchivo(archivos[0], opciones);
      return;
    }

    /* Se suben de a uno y en orden, no todos a la vez: el hosting es
       compartido y varias subidas simultáneas de fotos pesadas suelen
       terminar en un tiempo agotado. Así tarda un poco más pero llegan
       todas. */
    let subidos = 0;

    for (let i = 0; i < archivos.length; i++) {
      avisar('Subiendo ' + (i + 1) + ' de ' + archivos.length + '…');

      // Solo el último refresca la lista, para no repintarla N veces.
      const esElUltimo = (i === archivos.length - 1);
      const ok = await subirArchivo(archivos[i], Object.assign({}, opciones, {
        silencioso: true,
        despues: esElUltimo ? opciones.despues : null,
      }));

      if (ok) subidos++;
    }

    avisar(subidos === archivos.length
      ? 'Se subieron ' + subidos + ' archivos.'
      : 'Se subieron ' + subidos + ' de ' + archivos.length + '.',
      subidos !== archivos.length);
  });

  // Hay que agregarlo al documento para que funcione en algunos Android.
  entrada.style.display = 'none';
  document.body.appendChild(entrada);
  entrada.click();
  setTimeout(() => document.body.removeChild(entrada), 1000);
}

/**
 * Muestra los dos botones: subir archivo o tomar foto.
 *
 * @param {Object} opciones - Igual que elegirYSubir.
 * @returns {string} HTML
 */
function botonesDeArchivo(opciones) {
  return '' +
    '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-2)">' +
      '<button type="button" class="boton" style="flex:1" data-subir="archivo">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M12 16V4M12 4l-4 4M12 4l4 4" fill="none" stroke="currentColor" ' +
                'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" fill="none" ' +
                'stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>Subir' +
      '</button>' +
      '<button type="button" class="boton" style="flex:1" data-subir="camara">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M3 8a2 2 0 0 1 2-2h2l1.4-2h7.2L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" ' +
                'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>Tomar foto' +
      '</button>' +

      // Escribir a mano: para anotar un número que dictan por teléfono o
      // hacer un croquis, cuando el teclado sería más lento.
      '<button type="button" class="boton" style="flex:1" data-subir="dibujo">' +
        '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
          '<path d="M4 20l4-1 10-10a2.1 2.1 0 0 0-3-3L5 16z" fill="none" ' +
                'stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
        '</svg>A mano' +
      '</button>' +
    '</div>';
}

/**
 * Engancha los botones de subir y de cámara dentro de un contenedor.
 *
 * @param {Element} donde
 * @param {Object} opciones - Igual que elegirYSubir.
 * @returns {void}
 */
function engancharBotonesDeArchivo(donde, opciones) {
  buscarTodos('[data-subir]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      elegirYSubir(Object.assign({}, opciones, {
        camara: boton.dataset.subir === 'camara',
      }));
    });
  });
}


/* ─── 2. ACHICAR IMÁGENES ──────────────────────────────────────────── */

/**
 * Achica una imagen si es más grande de lo necesario.
 *
 * Los PDF y los archivos ya chicos pasan de largo sin tocarse.
 *
 * @param {File} archivo
 * @returns {Promise<Blob|File>} La versión achicada, o el original.
 */
function achicarImagen(archivo) {
  return new Promise(resolver => {

    // Los PDF no se tocan, y las imágenes chicas tampoco vale la pena.
    if (archivo.type === 'application/pdf' || archivo.size < 400000) {
      resolver(archivo);
      return;
    }

    /* Las fotos HEIC del iPhone no se pueden dibujar en un canvas: el
       navegador no las decodifica. Se suben tal cual y las achica...
       nadie. Es el único caso en que sube el archivo original. */
    if (/heic|heif/i.test(archivo.type)) {
      resolver(archivo);
      return;
    }

    const lector = new FileReader();

    lector.onload = () => {
      const imagen = new Image();

      imagen.onload = () => {
        // Si ya es chica, no se toca: recomprimirla solo la empeoraría.
        if (imagen.width <= ANCHO_MAXIMO_FOTO) { resolver(archivo); return; }

        const escala = ANCHO_MAXIMO_FOTO / imagen.width;
        const lienzo = document.createElement('canvas');
        lienzo.width  = ANCHO_MAXIMO_FOTO;
        lienzo.height = Math.round(imagen.height * escala);

        const pincel = lienzo.getContext('2d');
        pincel.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

        lienzo.toBlob(
          blob => resolver(blob || archivo),
          'image/jpeg',
          CALIDAD_FOTO
        );
      };

      // Si la imagen no se puede leer, se sube el original y que decida
      // el servidor.
      imagen.onerror = () => resolver(archivo);
      imagen.src = lector.result;
    };

    lector.onerror = () => resolver(archivo);
    lector.readAsDataURL(archivo);
  });
}


/* ─── 3. SUBIR ─────────────────────────────────────────────────────── */

/**
 * Sube un archivo al servidor.
 *
 * No usa pedir() de 03-servidor.js porque eso manda JSON, y un archivo
 * viaja como multipart/form-data. Es la única llamada del panel que no
 * pasa por ahí, y por eso repite a mano el token y el manejo de errores.
 *
 * @param {File|Blob} archivo
 * @param {Object} opciones - { tipo, id, despues }
 * @returns {Promise<void>}
 */
async function subirArchivo(archivo, opciones) {
  // En una tanda, cada archivo no anuncia lo suyo: avisa el que manda.
  if (!opciones.silencioso) avisar('Preparando el archivo…');

  const listo = await achicarImagen(archivo);

  const formulario = new FormData();
  // El nombre se conserva; si el achicado lo convirtió a JPEG, se ajusta.
  const nombre = (archivo.name || 'foto.jpg')
    .replace(/\.(png|webp)$/i, listo.type === 'image/jpeg' ? '.jpg' : '$&');

  formulario.append('archivo', listo, nombre);
  formulario.append('tipo', opciones.tipo || '');
  formulario.append('id', String(opciones.id || 0));

  const token = tokenGuardado();
  if (!token) { manejarSesionVencida(); return; }

  try {
    const respuesta = await fetch(CONFIGURACION.servidor.base + 'archivos.php?accion=subir', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formulario,
    });

    const carga = await respuesta.json().catch(() => ({
      ok: false, error: 'El servidor respondió algo inesperado.',
    }));

    if (respuesta.status === 401) { manejarSesionVencida(); return false; }
    if (!respuesta.ok || carga.ok === false) {
      avisar(carga.error || 'No se pudo subir el archivo.', true);
      return false;
    }

    if (!opciones.silencioso) avisar('Archivo subido.');
    if (opciones.despues) opciones.despues(carga.datos);
    return true;

  } catch (error) {
    avisar('No se pudo subir. Revisa tu conexión.', true);
    return false;
  }
}


/* ─── 4. LISTAR Y BORRAR ───────────────────────────────────────────── */

/**
 * Pinta los archivos de un registro, con sus miniaturas.
 *
 * @param {Element} donde
 * @param {string} tipo
 * @param {number} id
 * @returns {Promise<void>}
 */
async function pintarArchivosDe(donde, tipo, id) {
  /* Sin id el registro todavía no existe, así que no hay archivos que
     listar. No es un error: montarAdjuntos() lo guarda solo cuando se
     toca Subir o Tomar foto. */
  if (!id) {
    donde.innerHTML =
      '<p class="vacio__texto">Al adjuntar algo se guarda primero, solo.</p>';
    return;
  }

  let archivos;
  try {
    archivos = await traer('archivos.php?accion=listar&tipo=' +
                           encodeURIComponent(tipo) + '&id=' + id);
  } catch (error) {
    donde.innerHTML = '<p class="vacio__texto">No se pudieron cargar los archivos.</p>';
    return;
  }

  const token = tokenGuardado();

  if (!archivos.length) {
    donde.innerHTML = '<p class="vacio__texto">Todavía no hay archivos.</p>';
  } else {
    /* Las miniaturas se piden con el token en la URL... no: el endpoint
       exige el token en la cabecera, y una etiqueta <img> no puede
       mandar cabeceras. Por eso las imágenes se muestran como enlaces
       con su nombre, y al tocarlos se abren descargándolos con fetch. */
    donde.innerHTML = archivos.map(a => {
      const kb = Math.round((Number(a.tamano_bytes) || 0) / 1024);
      const esImagen = String(a.tipo_mime).indexOf('image/') === 0;

      return '' +
        '<div class="lista__fila">' +
          '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                  'data-ver-archivo="' + seguro(a.id) + '">' +
            '<span class="lista__titulo">' + seguro(a.nombre_real) + '</span>' +
            '<span class="lista__pie">' +
              seguro((esImagen ? 'Imagen' : 'PDF') + ' · ' + kb + ' KB') + '</span>' +
          '</button>' +
          '<button class="boton-icono" data-borrar-archivo="' + seguro(a.id) + '" ' +
                  'aria-label="Borrar archivo">' +
            '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
              '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" ' +
                    'stroke-linecap="round"/>' +
            '</svg>' +
          '</button>' +
        '</div>';
    }).join('');
  }

  buscarTodos('[data-ver-archivo]', donde).forEach(boton => {
    const archivo = archivos.find(a => String(a.id) === boton.dataset.verArchivo);
    boton.addEventListener('click', () => abrirArchivo(boton.dataset.verArchivo, archivo));
  });

  buscarTodos('[data-borrar-archivo]', donde).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!await confirmarAccion('¿Borrar este archivo?')) return;
      try {
        await mandar('archivos.php?accion=borrar', { id: boton.dataset.borrarArchivo });
        avisar('Archivo eliminado.');
        pintarArchivosDe(donde, tipo, id);
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });
}

/**
 * Abre un archivo protegido en el visor compartido (imagen o PDF).
 *
 * El endpoint exige el token en la cabecera, así que no se puede poner
 * la URL directa en una pestaña nueva: hay que bajarlo con fetch y
 * abrirlo desde la memoria del navegador. Antes se abría con
 * window.open(url,'_blank'), que en el teléfono es una pestaña nueva sin
 * forma cómoda de acercarse a un detalle — ahora usa el mismo visor con
 * zoom por doble-toque que Correo (ver abrirVisorDeArchivo(), 06-piezas.js).
 *
 * @param {number|string} id
 * @param {Object} [archivo] - { nombre_real, tipo_mime }, para el título y el zoom.
 * @returns {Promise<void>}
 */
async function abrirArchivo(id, archivo) {
  const token = tokenGuardado();
  if (!token) { manejarSesionVencida(); return; }

  avisar('Abriendo…');

  try {
    const respuesta = await fetch(
      CONFIGURACION.servidor.base + 'archivos.php?accion=ver&id=' + encodeURIComponent(id),
      { headers: { Authorization: 'Bearer ' + token } }
    );

    if (!respuesta.ok) {
      // El motivo real (403 sin permiso, 404 borrado, 500 del servidor…)
      // importa para poder arreglarlo. "No se pudo abrir" a secas no
      // decía si era un problema de permisos, un archivo que ya no está,
      // o el servidor caído — y eso hacía imposible diagnosticar a
      // distancia. El cuerpo trae { ok:false, error:"..." } (ver
      // responder.php); si no se puede leer, al menos queda el código.
      let motivo = 'código ' + respuesta.status;
      try {
        const cuerpo = await respuesta.json();
        if (cuerpo && cuerpo.error) motivo = cuerpo.error;
      } catch (error) { /* la respuesta no era JSON: se deja el código */ }

      avisar('No se pudo abrir el archivo (' + motivo + ').', true);
      return;
    }

    const bolsa = await respuesta.blob();
    const url   = URL.createObjectURL(bolsa);
    const tipo  = (archivo && archivo.tipo_mime) || bolsa.type;

    if (/^image\/|^application\/pdf/.test(tipo)) {
      abrirVisorDeArchivo(url, tipo, archivo && archivo.nombre_real);
    } else {
      // Cualquier otro tipo: el navegador no sabe mostrarlo, así que se
      // deja el camino de siempre.
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

  } catch (error) {
    // Acá caen los fallos de RED (sin señal, tiempo agotado) o cualquier
    // excepción al armar el visor — nunca un error HTTP, que ya se
    // atendió arriba con su propio motivo.
    avisar('No se pudo abrir el archivo (' + (error.message || 'sin conexión') + ').', true);
  }
}

/**
 * Mete el bloque de adjuntos dentro de un formulario abierto.
 *
 * EL PROBLEMA QUE RESUELVE
 * Un archivo se guarda atado al id de un registro. Pero cuando se está
 * creando algo nuevo, ese id todavía no existe: la fila no se insertó.
 * Antes, por eso, el bloque solo aparecía al editar — y quien quería
 * cargar un gasto CON su factura tenía que guardarlo, cerrarlo, volver a
 * abrirlo y recién ahí adjuntar.
 *
 * Ahora, si no hay id, al tocar "Subir" o "Tomar foto" se guarda primero
 * el registro (con lo que haya en el formulario), se obtiene su id, y se
 * sigue con el archivo sin que la persona note el paso intermedio.
 *
 * @param {Object} opciones
 * @param {Element} opciones.cuerpo - La hoja abierta.
 * @param {string} opciones.tipo - 'gasto', 'nota', 'proveedor'…
 * @param {string} opciones.titulo - Encabezado del bloque.
 * @param {number} opciones.id - 0 si el registro es nuevo.
 * @param {Function} opciones.guardarPrimero - Guarda y devuelve el id.
 * @returns {void}
 */
function montarAdjuntos(opciones) {
  const bloque = crear('div');
  bloque.innerHTML =
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      seguro(opciones.titulo) +
    '</div>' +
    '<div id="archivos-de-esto"></div>' +
    botonesDeArchivo({ tipo: opciones.tipo, id: opciones.id });

  /* Va antes del pie de botones, si lo hay, para que Guardar quede
     siempre al final. Si el formulario no tiene pie, va al final. */
  const pie = buscar('.acciones', opciones.cuerpo);
  if (pie) opciones.cuerpo.insertBefore(bloque, pie);
  else opciones.cuerpo.appendChild(bloque);

  const lista = buscar('#archivos-de-esto', bloque);

  /* El id puede cambiar en mitad de la vida de este bloque: empieza en 0
     y pasa a ser el real en cuanto se guarda. Por eso se guarda acá y no
     se lee de opciones cada vez. */
  let idActual = Number(opciones.id) || 0;

  pintarArchivosDe(lista, opciones.tipo, idActual);

  buscarTodos('[data-subir]', bloque).forEach(boton => {
    boton.addEventListener('click', async () => {

      if (!idActual) {
        // Todavía no existe la fila: se crea con lo que haya cargado.
        avisar('Guardando primero…');

        try {
          idActual = Number(await opciones.guardarPrimero()) || 0;
        } catch (error) {
          avisar(error.message || 'No se pudo guardar.', true);
          return;
        }

        if (!idActual) return;   // armarCarga() ya avisó qué falta

        avisar('Guardado. Ahora elige el archivo.');
      }

      // El dibujo no pasa por el selector de archivos: abre el lienzo.
      if (boton.dataset.subir === 'dibujo') {
        abrirLienzo({
          tipo: opciones.tipo,
          id: idActual,
          despues: () => pintarArchivosDe(lista, opciones.tipo, idActual),
        });
        return;
      }

      elegirYSubir({
        tipo: opciones.tipo,
        id: idActual,
        camara: boton.dataset.subir === 'camara',
        despues: () => pintarArchivosDe(lista, opciones.tipo, idActual),
      });
    });
  });
}

/**
 * Mete la lista de adjuntos (con ver y descargar) dentro de una ficha de
 * SOLO LECTURA — a diferencia de montarAdjuntos(), no agrega los botones
 * de Subir/Tomar foto/A mano: eso es cosa del formulario de edición. Acá
 * solo hace falta poder VER lo que ya hay, no cargar más.
 *
 * Se salta entero si no hay ningún archivo, para no mostrar un título
 * "Adjuntos" seguido de "Todavía no hay archivos" en cada ficha que
 * nunca tuvo uno — la mayoría de gastos y pagos no llevan comprobante
 * escaneado, y ese texto de sobra sería ruido en todas ellas.
 *
 * @param {Element} cuerpo - La hoja abierta (de abrirHoja()).
 * @param {string} tipo - 'proveedor', 'gasto', 'pago', 'cotizacion', 'padrino'…
 * @param {number} id
 * @param {string} [titulo='Adjuntos']
 * @returns {Promise<void>}
 */
async function insertarAdjuntosDeSoloLectura(cuerpo, tipo, id, titulo) {
  if (!id) return;

  let archivos;
  try {
    archivos = await traer('archivos.php?accion=listar&tipo=' +
                           encodeURIComponent(tipo) + '&id=' + id);
  } catch (error) {
    return;   // Sin señal o sin permiso: la ficha sigue viéndose igual, sin este bloque.
  }
  if (!archivos.length) return;

  const bloque = crear('div');
  bloque.innerHTML =
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">' +
      seguro(titulo || 'Adjuntos') +
    '</div>' +
    '<div id="adjuntos-de-esto"></div>';

  const pie = buscar('.acciones', cuerpo);
  if (pie) cuerpo.insertBefore(bloque, pie);
  else cuerpo.appendChild(bloque);

  pintarArchivosDe(buscar('#adjuntos-de-esto', bloque), tipo, id);
}

/**
 * Abre una hoja con los archivos de un registro y los botones para
 * agregar más.
 *
 * @param {string} titulo
 * @param {string} tipo
 * @param {number} id
 * @returns {void}
 */
function abrirHojaDeArchivos(titulo, tipo, id) {
  const cuerpo = abrirHoja(titulo,
    '<div id="lista-archivos"></div>' +
    botonesDeArchivo({ tipo: tipo, id: id })
  );

  const lista = buscar('#lista-archivos', cuerpo);
  pintarArchivosDe(lista, tipo, id);

  engancharBotonesDeArchivo(cuerpo, {
    tipo: tipo,
    id: id,
    despues: () => pintarArchivosDe(lista, tipo, id),
  });
}
