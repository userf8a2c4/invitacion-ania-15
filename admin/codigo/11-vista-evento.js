/* ══════════════════════════════════════════════════════════════════════
   11 · VISTA EVENTO

   QUÉ HACE ESTE ARCHIVO
   Todo lo propio de unos XV: tareas, agenda, cronograma del día, corte
   de honor, ensayos del vals, la misa, la música, las citas de vestido,
   las tomas de foto, las mesas, los regalos y los invitados foráneos.

   POR QUÉ ESTÁ ESCRITO CON UNA TABLA DE DESCRIPCIONES
   Son doce secciones que hacen lo mismo: listar, abrir un formulario,
   guardar y borrar. Escribirlas una por una serían mil líneas casi
   idénticas, y arreglar un detalle obligaría a tocarlas todas.

   En vez de eso, SECCIONES describe cada una con datos —qué campos
   tiene, cómo se ve cada fila— y hay UNA sola función que lista y UNA
   sola que arma formularios. Agregar una sección nueva es agregar un
   renglón a esa tabla.

   ÍNDICE
     1. Descripción de las secciones
     2. Dibujar la vista
     3. Listado y formulario genéricos
     4. Las secciones que no son listas
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió evento.php la última vez. */
let EVENTO = null;

/**
 * Qué sección se está viendo dentro de Evento.
 *
 * En null se muestra el ÍNDICE, que es la pantalla de entrada. Cualquier
 * otra cosa es una sección abierta a pantalla completa.
 */
let SECCION_EVENTO = null;

/**
 * Sección que hay que abrir apenas Evento termine de cargar.
 *
 * Hace falta porque entrar a Evento con recarga vuelve a dibujar todo y
 * deja el índice a la vista. Quien quiera llegar directo a una sección
 * —el Resumen al tocar "Ensayo del vals", por ejemplo— no puede
 * limitarse a asignar SECCION_EVENTO: el dibujado la pisaría. Lo deja
 * acá y dibujarEvento() la respeta.
 */
let EVENTO_ABRIR_AL_CARGAR = null;

/**
 * Va a la pestaña Evento y abre una sección concreta.
 *
 * @param {string} clave - 'tareas', 'musica'…
 * @returns {void}
 */
function irASeccionDeEvento(clave) {
  EVENTO_ABRIR_AL_CARGAR = clave;
  irA('evento', true);
}

/**
 * Se asegura de que EVENTO esté cargado antes de usarlo.
 *
 * POR QUÉ HACE FALTA
 * Regalos y Foráneos se ven desde la pestaña Gente, pero sus datos
 * salen de evento.php. Si alguien entra directo a Gente sin pasar por
 * Evento, EVENTO todavía es null y pintarSeccionGenerica() reventaría al
 * leer EVENTO[clave].
 *
 * @returns {Promise<void>}
 */
async function asegurarEvento() {
  if (EVENTO) return;
  EVENTO = await traer('evento.php?accion=todo');
}

/**
 * Vuelve a pedir los datos y repinta la pantalla DONDE ESTÁ EL USUARIO.
 *
 * POR QUÉ NO ALCANZA CON LLAMAR A dibujarEvento()
 * Porque Mesas, Regalos y Foráneos ahora se ven desde Gente. Si alguien
 * agrega un regalo estando en Gente y esto repintara Evento, se
 * actualizaría una pantalla que no se está mirando y la que sí quedaría
 * con el dato viejo.
 *
 * La vista que no se está mirando se marca como sucia, así se rehace
 * sola la próxima vez que se entre.
 *
 * @returns {Promise<void>}
 */
async function refrescarEvento() {
  EVENTO = await traer('evento.php?accion=todo');

  if (VISTA_ACTUAL === 'invitados') {
    ensuciarVistas('evento');
    GENTE_CARGADA[SECCION_GENTE] = false;
    await pintarSeccionDeGente();
    return;
  }

  ensuciarVistas('invitados');
  pintarSeccionDeEvento();
}

/**
 * Vuelve al índice sin ir al servidor.
 *
 * La llama la navegación al volver a la pestaña Evento: entrar siempre
 * muestra el índice, para que la pantalla abra igual todas las veces.
 *
 * @returns {void}
 */
function volverAlIndiceDeEvento() {
  if (SECCION_EVENTO === null) return;
  SECCION_EVENTO = null;
  pintarSeccionDeEvento();
}


/* ─── 1. DESCRIPCIÓN DE LAS SECCIONES ──────────────────────────────── */

/**
 * Cada sección: cómo se llama, de qué tabla sale, qué campos tiene el
 * formulario, y cómo se arma cada fila de la lista.
 *
 * `fila` recibe un registro y devuelve { titulo, pie, lado, tenue }.
 */
const SECCIONES = {

  corte_honor: {
    rotulo: 'Corte',
    titulo: 'Chambelanes y damas',
    vacio: ['Todavía no hay corte de honor',
            'Anota a los chambelanes y las damas, con su talla.'],
    campos: [
      { id: 'nombre',   rotulo: 'Nombre' },
      { id: 'rol',      rotulo: 'Rol', lista: [
          ['chambelan', 'Chambelán'], ['dama', 'Dama'],
          ['pareja_vals', 'Pareja del vals'], ['otro', 'Otro']] },
      { id: 'telefono', rotulo: 'Teléfono', tipo: 'tel' },
      { id: 'talla',    rotulo: 'Talla' },
      { id: 'vestuario', rotulo: 'Vestuario', lista: [
          ['pendiente', 'Pendiente'], ['medido', 'Ya se midió'], ['listo', 'Listo']] },
      { id: 'notas',    rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.nombre,
      pie: [{ chambelan: 'Chambelán', dama: 'Dama',
              pareja_vals: 'Pareja del vals' }[r.rol] || 'Otro',
            r.talla ? 'talla ' + r.talla : ''].filter(Boolean).join(' · '),
      lado: etiquetaDe(r.vestuario,
            { pendiente: ['tenue','Pendiente'], medido: ['ojo','Medido'],
              listo: ['bien','Listo'] }),
    }),
  },

  ensayos: {
    rotulo: 'Ensayos',
    titulo: 'Ensayos del vals',
    vacio: ['Todavía no hay ensayos', 'Agenda los ensayos del vals.'],
    campos: [
      { id: 'fecha', rotulo: 'Fecha', tipo: 'date' },
      { id: 'hora',  rotulo: 'Hora',  tipo: 'time' },
      { id: 'lugar', rotulo: 'Dónde' },
      { id: 'notas', rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: comoFecha(r.fecha) + (r.hora ? ' · ' + String(r.hora).slice(0,5) : ''),
      pie: r.lugar || '',
      lado: '<span class="etiqueta etiqueta--info">' + seguro(comoCuando(r.fecha)) + '</span>',
      tenue: diasHasta(r.fecha) < 0,
    }),
  },

  requisitos_ceremonia: {
    rotulo: 'Papeles',
    titulo: 'Requisitos de la iglesia',
    vacio: ['Todavía no hay requisitos',
            'Fe de bautismo, plática prebautismal, constancias…'],
    campos: [
      { id: 'requisito', rotulo: 'Qué piden' },
      { id: 'estado',    rotulo: 'Cómo va', lista: [
          ['pendiente', 'Pendiente'], ['en_tramite', 'En trámite'], ['listo', 'Listo']] },
      { id: 'fecha_limite', rotulo: 'Para cuándo', tipo: 'date' },
      { id: 'notas',     rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.requisito,
      pie: r.fecha_limite ? comoCuando(r.fecha_limite) : '',
      lado: etiquetaDe(r.estado,
            { pendiente: ['alerta','Pendiente'], en_tramite: ['ojo','En trámite'],
              listo: ['bien','Listo'] }),
    }),
  },

  musica: {
    rotulo: 'Música',
    titulo: 'Canciones',
    vacio: ['Todavía no hay canciones',
            'El vals, la entrada, el pastel… y las que NO quieres que suenen.'],
    campos: [
      { id: 'cancion', rotulo: 'Canción' },
      { id: 'artista', rotulo: 'Artista' },
      { id: 'momento', rotulo: 'Para qué momento', lista: [
          ['entrada', 'Entrada'], ['vals', 'Vals'], ['brindis', 'Brindis'],
          ['pastel', 'Pastel'], ['baile', 'Baile'], ['otro', 'Otro'],
          ['prohibida', 'Prohibida — que NO suene']] },
      { id: 'enlace',  rotulo: 'Enlace' },
      { id: 'notas',   rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.cancion,
      pie: r.artista || '',
      lado: r.momento === 'prohibida'
            ? '<span class="etiqueta etiqueta--alerta">Prohibida</span>'
            : '<span class="etiqueta">' + seguro(r.momento) + '</span>',
    }),
  },

  citas_arreglo: {
    rotulo: 'Vestido',
    titulo: 'Vestido y arreglo',
    vacio: ['Todavía no hay citas',
            'Pruebas de vestido, maquillaje, peinado, zapatos.'],
    campos: [
      { id: 'titulo', rotulo: 'Qué es' },
      { id: 'tipo',   rotulo: 'Tipo', lista: [
          ['vestido', 'Vestido'], ['maquillaje', 'Maquillaje'],
          ['peinado', 'Peinado'], ['zapatos', 'Zapatos'], ['otro', 'Otro']] },
      { id: 'fecha',  rotulo: 'Fecha', tipo: 'date' },
      { id: 'hora',   rotulo: 'Hora',  tipo: 'time' },
      { id: 'lugar',  rotulo: 'Dónde' },
      { id: 'costo',  rotulo: 'Costo', tipo: 'number', paso: '0.01' },
      { id: 'estado', rotulo: 'Estado', lista: [
          ['pendiente', 'Pendiente'], ['hecha', 'Hecha'], ['cancelada', 'Cancelada']] },
      { id: 'notas',  rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.titulo,
      pie: [r.fecha ? comoFecha(r.fecha) : '', r.lugar].filter(Boolean).join(' · '),
      lado: etiquetaDe(r.estado,
            { pendiente: ['ojo','Pendiente'], hecha: ['bien','Hecha'],
              cancelada: ['tenue','Cancelada'] }),
    }),
  },

  cronograma: {
    /* "Cronograma" y no "El día": en el índice esta fila vive dentro del
       grupo llamado "El día", y un renglón que repite el título de su
       propio grupo no dice nada. */
    rotulo: 'Cronograma',
    titulo: 'Cronograma del día',
    vacio: ['Todavía no hay cronograma',
            'La hora a hora del 24 de octubre: llegada, misa, vals, cena…'],
    campos: [
      { id: 'hora',        rotulo: 'Hora', tipo: 'time' },
      { id: 'momento',     rotulo: 'Qué pasa' },
      { id: 'responsable', rotulo: 'Quién se encarga' },
      { id: 'detalle',     rotulo: 'Detalle', largo: true },
    ],
    fila: r => ({
      titulo: (r.hora ? String(r.hora).slice(0,5) + '  ' : '') + r.momento,
      pie: r.responsable || '',
    }),
  },

  tomas_foto: {
    rotulo: 'Fotos',
    titulo: 'Tomas imprescindibles',
    vacio: ['Todavía no hay lista de tomas',
            'Las fotos que no se pueden perder. Se la pasas al fotógrafo.'],
    alternar: 'hecha',
    campos: [
      { id: 'toma',     rotulo: 'Qué foto' },
      { id: 'momento',  rotulo: 'Cuándo' },
      { id: 'personas', rotulo: 'Quiénes salen' },
      { id: 'orden',    rotulo: 'Orden', tipo: 'number' },
    ],
    fila: r => ({
      titulo: r.toma,
      pie: [r.momento, r.personas].filter(Boolean).join(' · '),
      tenue: Number(r.hecha) === 1,
    }),
  },

  mesas: {
    rotulo: 'Mesas',
    titulo: 'Mesas',
    vacio: ['Todavía no hay mesas',
            'Crea las mesas y después acomoda a los invitados.'],
    campos: [
      { id: 'nombre',    rotulo: 'Nombre o número' },
      { id: 'capacidad', rotulo: 'Cuántos caben', tipo: 'number' },
      { id: 'ubicacion', rotulo: 'Dónde está' },
      { id: 'notas',     rotulo: 'Notas', largo: true },
    ],
    fila: r => {
      // La ocupación viene calculada aparte, cruzando con las mesas.
      const oc = (EVENTO.ocupacion || []).find(o => String(o.id) === String(r.id));
      const usados = oc ? Number(oc.ocupados) : 0;
      const lleno  = usados > Number(r.capacidad);

      return {
        titulo: r.nombre,
        pie: r.ubicacion || '',
        lado: '<span class="etiqueta etiqueta--' + (lleno ? 'alerta' : 'tenue') + '">' +
              usados + ' / ' + seguro(r.capacidad) + '</span>',
      };
    },
  },

  regalos: {
    rotulo: 'Regalos',
    titulo: 'Regalos recibidos',
    vacio: ['Todavía no hay regalos',
            'Anota lo que llegue para no olvidarte de agradecer.'],
    alternar: 'agradecido',
    /* Viaja al servidor pero no se muestra en la lista de campos: la
       huella del correo de Amazon y el enlace del artículo son datos de
       trabajo, no algo que se edite a mano seguido. */
    ocultos: ['correo_origen', 'pedido_en_lista'],
    campos: [
      { id: 'de_parte_de', rotulo: 'De parte de (se completa cuando se sepa)' },
      { id: 'descripcion', rotulo: 'Qué es' },
      { id: 'origen',      rotulo: 'De dónde vino', lista: [
          ['amazon', 'Lista de Amazon'], ['directo', 'Lo trajo'],
          ['efectivo', 'Efectivo'], ['otro', 'Otro']] },
      { id: 'monto',       rotulo: 'Valor recibido', tipo: 'number', paso: '0.01' },
      { id: 'precio',      rotulo: 'Precio en la lista', tipo: 'number', paso: '0.01' },
      { id: 'enlace',      rotulo: 'Enlace del artículo' },
      { id: 'recibido_en', rotulo: 'Cuándo llegó', tipo: 'date' },
      { id: 'comprado_en', rotulo: 'Cuándo se compró (según el correo)', tipo: 'date' },
      { id: 'notas',       rotulo: 'Notas', largo: true },
    ],
    fila: r => {
      const esPendienteDeLista = Number(r.pedido_en_lista) === 1 && !r.comprado_en;

      const lado = esPendienteDeLista
        ? '<span class="etiqueta etiqueta--tenue">En la lista</span>'
        : Number(r.agradecido) === 1
          ? '<span class="etiqueta etiqueta--bien">Agradecido</span>'
          : '<span class="etiqueta etiqueta--ojo">Falta agradecer</span>';

      return {
        titulo: r.de_parte_de || r.descripcion,
        pie: r.de_parte_de ? (r.descripcion || '') :
             (r.precio > 0 ? comoDinero(r.precio, false) : ''),
        lado: lado,
        tenue: esPendienteDeLista || Number(r.agradecido) === 1,
      };
    },
  },

  foraneos: {
    rotulo: 'Foráneos',
    titulo: 'Invitados de fuera',
    vacio: ['Todavía no hay nadie de fuera',
            'Quién viene de otra ciudad, dónde se queda y cómo llega — se va a ver aquí.'],
    campos: [
      { id: 'nombre',     rotulo: 'Nombre' },
      { id: 'ciudad',     rotulo: 'De dónde viene' },
      { id: 'telefono',   rotulo: 'Teléfono', tipo: 'tel' },
      { id: 'hospedaje',  rotulo: 'Dónde se queda' },
      { id: 'llega',      rotulo: 'Llega', tipo: 'date' },
      { id: 'se_va',      rotulo: 'Se va',  tipo: 'date' },
      { id: 'transporte', rotulo: 'Cómo se mueve' },
      { id: 'notas',      rotulo: 'Notas', largo: true },
    ],
    fila: r => ({
      titulo: r.nombre,
      pie: [r.ciudad, r.hospedaje].filter(Boolean).join(' · '),
      lado: r.llega
            ? '<span class="etiqueta etiqueta--info">' + seguro(comoFecha(r.llega)) + '</span>'
            : '',
    }),
  },
};

/**
 * Devuelve la etiqueta de color de un estado.
 *
 * @param {string} valor
 * @param {Object} mapa - estado => [color, texto]
 * @returns {string} HTML
 */
function etiquetaDe(valor, mapa) {
  const par = mapa[valor] || ['tenue', valor || '—'];
  return '<span class="etiqueta etiqueta--' + par[0] + '">' + seguro(par[1]) + '</span>';
}


/* ─── 2. DIBUJAR LA VISTA ──────────────────────────────────────────── */

/**
 * Pide los datos y arma la pantalla Evento.
 *
 * @returns {Promise<void>}
 */
async function dibujarEvento() {
  const vista = buscar('#vista-evento');
  pintarCargando(vista, 5);

  try {
    // Las dos llamadas van en paralelo: tardan lo que la más lenta.
    const [evento] = await Promise.all([
      traer('evento.php?accion=todo'),
      traerPlanificador(),
    ]);
    EVENTO = evento;
  } catch (error) {
    pintarError(vista, error.message, () => dibujarEvento());
    throw error;
  }

  vista.innerHTML = '<div id="cuerpo-evento"></div>';

  /* SECCION_EVENTO en null significa "mostrar el índice". Entrar a
     Evento muestra el índice y no la última sección abierta: la pantalla
     tiene que abrir siempre igual para saber dónde está uno parado sin
     mirar. La excepción es haber pedido una sección concreta. */
  SECCION_EVENTO = EVENTO_ABRIR_AL_CARGAR;
  EVENTO_ABRIR_AL_CARGAR = null;
  pintarSeccionDeEvento();
}

/**
 * Cuántos hay que mostrar al lado de cada sección en el índice.
 *
 * Solo llevan cuenta las secciones donde un número significa "esto te
 * está esperando". Poner un contador en Fotos o en Música sería decir
 * cuántos registros hay, que no es una noticia.
 *
 * @param {string} clave
 * @returns {{cuantos: number, alerta: boolean}}
 */
function cuentaDeLaSeccion(clave) {
  if (clave === 'tareas') {
    return {
      cuantos: (PLAN.tareas || []).filter(t => t.estado !== 'hecha').length,
      alerta: false,
    };
  }

  if (clave === 'agenda') {
    return { cuantos: (PLAN.agenda || []).length, alerta: false };
  }

  if (clave === 'requisitos_ceremonia') {
    // Los papeles que faltan entregar sí son una deuda: van en rojo.
    return {
      cuantos: (EVENTO.requisitos_ceremonia || [])
                 .filter(r => r.estado !== 'listo').length,
      alerta: true,
    };
  }

  return { cuantos: 0, alerta: false };
}

/**
 * Pinta el índice de Evento, o la sección que se haya abierto.
 *
 * @returns {void}
 */
function pintarSeccionDeEvento() {
  const cuerpo = buscar('#cuerpo-evento');
  if (!cuerpo) return;

  /* ─── El índice ─────────────────────────────────────────────────── */
  if (!SECCION_EVENTO) {
    ponerTitulo(et('nav.evento', 'Evento'));

    const grupos = CONFIGURACION.indiceDeEvento.map(grupo => ({
      titulo: grupo.titulo,
      filas: grupo.filas.map(fila => {
        const clave = fila[0];
        const cuenta = cuentaDeLaSeccion(clave);
        return {
          clave: clave,
          nombre: nombreDeLaSeccion(clave),
          descripcion: fila[1],
          cuantos: cuenta.cuantos,
          alerta: cuenta.alerta,
        };
      }),
    }));

    pintarIndice(cuerpo, grupos, clave => {
      /* El modo del día no es una sección: es una hoja aparte que se
         abre encima. Por eso no cambia SECCION_EVENTO. */
      if (clave === 'modo-dia') { abrirModoDelDia(); return; }

      SECCION_EVENTO = clave;
      pintarSeccionDeEvento();
      buscar('#contenido').scrollTo({ top: 0 });
    });
    return;
  }

  /* ─── Una sección abierta ───────────────────────────────────────── */

  const nombre = nombreDeLaSeccion(SECCION_EVENTO);
  ponerTitulo(nombre);

  cuerpo.innerHTML =
    barraDeVuelta(et('nav.evento', 'Evento'), descripcionDeLaSeccion(SECCION_EVENTO)) +
    '<div id="dentro-evento"></div>';

  buscar('#indice-volver', cuerpo).addEventListener('click', () => {
    SECCION_EVENTO = null;
    pintarSeccionDeEvento();
    buscar('#contenido').scrollTo({ top: 0 });
  });

  const dentro = buscar('#dentro-evento', cuerpo);

  // Las que no son listas genéricas tienen su propia función.
  if (SECCION_EVENTO === 'calendario') { pintarCalendario(dentro); return; }
  if (SECCION_EVENTO === 'tareas')    { pintarTareas(dentro); return; }
  if (SECCION_EVENTO === 'agenda')    { pintarAgenda(dentro); return; }
  if (SECCION_EVENTO === 'ceremonia') { pintarCeremonia(dentro); return; }

  pintarSeccionGenerica(dentro, SECCION_EVENTO);
}

/**
 * Cómo se llama una sección, respetando el renombrado de ETIQUETAS.
 *
 * @param {string} clave
 * @returns {string}
 */
function nombreDeLaSeccion(clave) {
  /* Calendario, Tareas y Agenda no están en SECCIONES porque no son
     listas genéricas: viven en el planificador y en el calendario. Sus
     nombres de fábrica van acá. */
  const aparte = {
    calendario: 'Calendario',
    tareas:     'Tareas',
    agenda:     'Agenda',
    ceremonia:  'Misa',
    'modo-dia': 'Modo día del evento',
  };

  const deFabrica = aparte[clave] ||
                    (SECCIONES[clave] ? SECCIONES[clave].rotulo : clave);

  return et('evento.' + clave, deFabrica);
}

/**
 * La línea que explica qué es una sección, buscada en la configuración.
 *
 * @param {string} clave
 * @returns {string} Vacío si no tiene.
 */
function descripcionDeLaSeccion(clave) {
  for (const grupo of CONFIGURACION.indiceDeEvento) {
    for (const fila of grupo.filas) {
      if (fila[0] === clave) return fila[1];
    }
  }
  return '';
}


/* ─── LA MESA DE REGALOS DE AMAZON ─────────────────────────────────── */

/**
 * La tarjeta con el enlace a la lista y el resumen de lo recibido.
 *
 * POR QUÉ NO SE LEE LA LISTA DE AMAZON AUTOMÁTICAMENTE
 * Amazon no publica esas listas por API salvo que uno sea socio afiliado
 * aprobado, y raspar la página va contra sus términos además de romperse
 * sola cada vez que cambian el HTML o salta el anti-bot.
 *
 * Lo que sí funciona: Amazon manda un correo cuando alguien compra de la
 * lista, y el panel ya lee ese buzón. El botón "Buscar compras" revisa
 * esos avisos y ofrece dar de alta el regalo sin teclear nada.
 *
 * @returns {string} HTML
 */
function tarjetaMesaDeRegalos() {
  const regalos = EVENTO.regalos || [];

  // Un artículo cargado a la lista de deseos que todavía no se compró
  // no es un regalo recibido: no debe sumar en "Recibidos" ni en "Sin
  // agradecer", o esos números mentirían apenas se cargara la lista.
  const pendientesDeLista = regalos.filter(r =>
    Number(r.pedido_en_lista) === 1 && !r.comprado_en);
  const yaSonRegalos = regalos.filter(r => !pendientesDeLista.includes(r));

  const recibidos    = yaSonRegalos.length;
  const sinAgradecer = yaSonRegalos.filter(r => Number(r.agradecido) === 0).length;
  const deAmazon     = yaSonRegalos.filter(r => r.origen === 'amazon').length;

  const enlace = CONFIGURACION.regalos.enlaceDeLaLista;

  /* El enlace de la invitación es de tipo "owner-view": la vista de
     DUEÑO. Amazon suele exigir estar logueado como el dueño para
     abrirla, así que a un invitado probablemente le dé error. Se avisa
     acá porque es el lugar donde alguien lo va a mirar. */
  const esVistaDeDuenio = /owner-view/i.test(enlace);

  return '' +
    '<div class="tarjeta">' +
      '<div class="tarjeta__titulo">Mesa de regalos</div>' +

      '<div class="rejilla-datos" style="margin-bottom:var(--esp-2)">' +
        tarjetaDato(recibidos, 'Recibidos') +
        tarjetaDato(deAmazon, 'De Amazon') +
        tarjetaDato(sinAgradecer, 'Sin agradecer') +
      '</div>' +

      (pendientesDeLista.length
        ? '<p class="vacio__texto" style="margin-bottom:var(--esp-1)">' +
            seguro(pluralizar(pendientesDeLista.length, 'artículo', 'artículos')) +
            ' en tu lista de deseos todavía sin comprar.</p>'
        : '') +

      '<a class="boton boton--principal boton--ancho" target="_blank" ' +
         'rel="noopener" href="' + seguro(enlace) + '">' +
        'Abrir la lista en Amazon' +
      '</a>' +

      '<button class="boton boton--ancho" id="regalo-cargar-deseo" ' +
              'style="margin-top:var(--esp-1)">' +
        'Cargar un artículo de la lista' +
      '</button>' +

      '<button class="boton boton--ancho" id="buscar-compras" ' +
              'style="margin-top:var(--esp-1)">' +
        'Buscar compras en el correo' +
      '</button>' +

      (esVistaDeDuenio
        ? '<p class="aviso-error" style="margin-top:var(--esp-2)">' +
          'Ojo: el enlace que ven los invitados en la invitación es la ' +
          'vista de <strong>dueño</strong> de la lista. Amazon suele pedir ' +
          'iniciar sesión como dueño para abrirla, así que a ellos ' +
          'probablemente les dé error. El correcto se saca desde Amazon ' +
          'con el botón Compartir o Invitar, y hay que cambiarlo en ' +
          'codigo/01-configuracion.js de la invitación.</p>'
        : '') +

      '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
        seguro(CONFIGURACION.regalos.aclaracion || '') +
      '</p>' +
    '</div>';
}

/**
 * Engancha el botón que busca avisos de compra en el buzón.
 *
 * @param {Element} donde
 * @returns {void}
 */
function engancharMesaDeRegalos(donde) {

  /* "Cargar un artículo de la lista" reusa el formulario genérico de
     regalos: es la manera más rápida de sumar esto sin construir una
     pantalla de pegado masivo aparte. pedido_en_lista viaja oculto
     (ver SECCIONES.regalos.ocultos) para no pisar la fila "de dónde
     vino" ni "cuándo llegó", que todavía no aplican. */
  const botonDeseo = buscar('#regalo-cargar-deseo', donde);
  if (botonDeseo) {
    botonDeseo.addEventListener('click', () => {
      formularioEvento('regalos', {
        pedido_en_lista: 1,
        agradecido: 0,
        origen: 'amazon',
      });
    });
  }

  const boton = buscar('#buscar-compras', donde);
  if (!boton) return;

  boton.addEventListener('click', async () => {
    boton.disabled = true;
    boton.textContent = 'Revisando el buzón…';

    let datos;
    try {
      datos = await traer('correo.php?accion=regalos');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Buscar compras en el correo';
      return;
    }

    boton.disabled = false;
    boton.textContent = 'Buscar compras en el correo';

    const candidatos = datos.candidatos || [];

    if (!candidatos.length) {
      avisar('No hay avisos de compra nuevos en el buzón.');
      return;
    }

    const cuerpo = abrirHoja('Compras encontradas',
      '<p class="vacio__texto" style="margin-bottom:var(--esp-3)">' +
        'Estos correos de Amazon parecen avisos de compra. Toca uno para ' +
        'darlo de alta como regalo.' +
      '</p>' +
      candidatos.map((c, i) =>
        '<button class="lista__fila" data-compra="' + i + '">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(acortar(c.asunto, 50)) + '</span>' +
            '<span class="lista__pie">' +
              seguro(c.fecha ? comoFecha(c.fecha.slice(0, 10)) : '') + '</span>' +
          '</span>' +
        '</button>'
      ).join('')
    );

    buscarTodos('[data-compra]', cuerpo).forEach(fila => {
      fila.addEventListener('click', () => elegirRegaloParaLaCompra(candidatos[Number(fila.dataset.compra)]));
    });
  });
}

/**
 * Al tocar un aviso de compra: si hay artículos de la lista de deseos
 * todavía sin marcar comprados, se ofrece cruzarlo contra uno de ellos
 * (el correo no dice CUÁL artículo se compró, así que decide quien lo
 * mira). Si ninguno corresponde, o no hay lista cargada, se da de alta
 * como regalo nuevo — el camino de siempre.
 *
 * @param {Object} c - Un candidato de correo.php?accion=regalos.
 * @returns {void}
 */
function elegirRegaloParaLaCompra(c) {
  const pendientes = (EVENTO.regalos || []).filter(r =>
    Number(r.pedido_en_lista) === 1 && !r.comprado_en);

  const cargarComoNuevo = () => {
    /* El asunto de Amazon no dice quién compró —eso queda para
       completar a mano—, pero sí la fecha y que vino de la lista. La
       huella del correo se guarda para no volver a ofrecerlo. */
    formularioEvento('regalos', {
      origen:        'amazon',
      descripcion:   acortar(c.asunto, 200),
      recibido_en:   c.fecha ? c.fecha.slice(0, 10) : '',
      correo_origen: c.huella,
      agradecido:    0,
    });
  };

  if (!pendientes.length) { cargarComoNuevo(); return; }

  const cuerpo = abrirHoja('¿Cuál artículo es?',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      seguro(acortar(c.asunto, 80)) +
    '</p>' +
    pendientes.map((r, i) =>
      '<button class="lista__fila" data-marcar-comprado="' + i + '">' +
        '<span class="lista__cuerpo">' +
          '<span class="lista__titulo">' + seguro(r.descripcion) + '</span>' +
          (r.precio > 0
            ? '<span class="lista__pie">' + seguro(comoDinero(r.precio, false)) + '</span>'
            : '') +
        '</span>' +
      '</button>'
    ).join('') +
    '<button class="boton boton--ancho" id="regalo-ninguno" style="margin-top:var(--esp-2)">' +
      'No es ninguno de estos: cargar como regalo nuevo' +
    '</button>'
  );

  buscarTodos('[data-marcar-comprado]', cuerpo).forEach(fila => {
    fila.addEventListener('click', async () => {
      const item = pendientes[Number(fila.dataset.marcarComprado)];
      try {
        await mandar('evento.php?accion=guardar&que=regalos', {
          id:            item.id,
          de_parte_de:   item.de_parte_de || '',
          descripcion:   item.descripcion,
          origen:        'amazon',
          monto:         item.monto || 0,
          precio:        item.precio || 0,
          enlace:        item.enlace || '',
          recibido_en:   item.recibido_en || '',
          comprado_en:   c.fecha ? c.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
          agradecido:    Number(item.agradecido) === 1,
          correo_origen: c.huella,
          notas:         item.notas || '',
        });
        cerrarHoja(true);
        avisar('Marcado como comprado: ' + item.descripcion);
        ensuciarVistas('resumen');
        await refrescarEvento();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  });

  buscar('#regalo-ninguno', cuerpo).addEventListener('click', () => {
    cerrarHoja(true);
    cargarComoNuevo();
  });
}


/* ─── 3. LISTADO Y FORMULARIO GENÉRICOS ────────────────────────────── */

/**
 * Pinta cualquiera de las secciones descritas en SECCIONES.
 *
 * @param {Element} cuerpo
 * @param {string} clave
 * @returns {void}
 */
function pintarSeccionGenerica(cuerpo, clave) {
  const config    = SECCIONES[clave];
  const registros = EVENTO[clave] || [];

  const botonNuevo =
    '<button class="boton boton--principal boton--ancho" id="ev-nuevo" ' +
    'style="margin-top:var(--esp-3)">Agregar</button>';

  if (!registros.length) {
    cuerpo.innerHTML = '';
    // El murciélago es el guiño de Foráneos, y de nadie más — el brief
    // lo sugiere puntual para esa sección exacta.
    pintarVacio(cuerpo, config.vacio[0], config.vacio[1],
                clave === 'foraneos' ? 'murcielago' : undefined);
    cuerpo.insertAdjacentHTML('beforeend', botonNuevo);
    buscar('#ev-nuevo', cuerpo).addEventListener('click',
      () => formularioEvento(clave));
    return;
  }

  cuerpo.innerHTML = registros.map(registro => {
    const f = config.fila(registro);

    // Las secciones con `alternar` llevan casilla al principio.
    const casilla = config.alternar
      ? '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--oro)" ' +
        (Number(registro[config.alternar]) === 1 ? 'checked ' : '') +
        'data-alt="' + seguro(registro.id) + '" aria-label="Marcar">'
      : '';

    const estilo = f.tenue ? ' style="opacity:.55"' : '';

    return '' +
      '<div class="lista__fila"' + estilo + '>' +
        casilla +
        '<button class="lista__cuerpo" style="border:0;background:none;text-align:left" ' +
                'data-ev-id="' + seguro(registro.id) + '">' +
          '<span class="lista__titulo">' + seguro(f.titulo) + '</span>' +
          (f.pie ? '<span class="lista__pie">' + seguro(f.pie) + '</span>' : '') +
        '</button>' +
        (f.lado ? '<span class="lista__lado">' + f.lado + '</span>' : '') +
      '</div>';
  }).join('') + botonNuevo;

  buscarTodos('[data-ev-id]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      abrirDetalleGenerico(clave,
        registros.find(r => String(r.id) === boton.dataset.evId));
    });
  });

  buscarTodos('[data-alt]', cuerpo).forEach(casilla => {
    casilla.addEventListener('change', async () => {
      try {
        await mandar('evento.php?accion=alternar&que=' + clave, { id: casilla.dataset.alt });
        ensuciarVistas('resumen');
        await refrescarEvento();
      } catch (error) {
        casilla.checked = !casilla.checked;
        avisar(error.message, true);
      }
    });
  });

  buscar('#ev-nuevo', cuerpo).addEventListener('click', () => formularioEvento(clave));
}

/**
 * Ficha de solo lectura de cualquier sección genérica (Regalos, Foráneos…),
 * antes de entrar a editar. Mismo patrón que abrirDetalleDeInvitado()
 * (08-vista-invitados.js): primero se lee, y solo un botón aparte lleva
 * al formulario — así tocar una fila para mirarla no arriesga cambiar
 * algo sin querer. Genérica porque las secciones de SECCIONES ya
 * describen sus campos con rótulo y tipo; no hace falta una función
 * por sección.
 *
 * @param {string} clave
 * @param {Object} registro
 * @returns {void}
 */
function abrirDetalleGenerico(clave, registro) {
  const config = SECCIONES[clave];

  const comoTexto = campo => {
    const valor = registro[campo.id];
    if (valor === undefined || valor === null || valor === '') return '—';

    if (campo.lista) {
      const opcion = campo.lista.find(o => String(o[0]) === String(valor));
      return opcion ? opcion[1] : String(valor);
    }
    if (campo.tipo === 'date') return comoFecha(valor);
    // Los montos se marcan con paso 0.01 en la descripción del campo.
    if (campo.tipo === 'number' && campo.paso === '0.01') {
      return comoDinero(valor, false);
    }
    return String(valor);
  };

  const detalle = config.campos.map(campo =>
    '<span class="detalle__rotulo">' + seguro(campo.rotulo) + '</span>' +
    '<span class="detalle__valor">' + seguro(comoTexto(campo)) + '</span>'
  ).join('');

  const cuerpo = abrirHoja(registro.id ? (config.fila(registro).titulo || config.titulo) : config.titulo,
    '<div class="detalle">' + detalle + '</div>' +
    '<div class="acciones" style="margin-top:var(--esp-3)">' +
      '<button class="boton boton--peligro" id="detalle-borrar">Borrar</button>' +
      '<button class="boton boton--principal" id="detalle-editar">Editar</button>' +
    '</div>'
  );

  buscar('#detalle-editar', cuerpo).addEventListener('click', () => {
    formularioEvento(clave, registro);
  });

  buscar('#detalle-borrar', cuerpo).addEventListener('click', async () => {
    if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
    try {
      await mandar('evento.php?accion=borrar&que=' + clave, { id: registro.id });
      cerrarHoja(true);
      avisar('Eliminado.');
      await refrescarEvento();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * Arma el formulario de cualquier sección a partir de su descripción.
 *
 * @param {string} clave
 * @param {Object} [registro] - Si viene, se edita.
 * @returns {void}
 */
function formularioEvento(clave, registro) {
  const config = SECCIONES[clave];
  const d      = registro || {};

  const campos = config.campos.map(campo => {
    const valor = d[campo.id];

    if (campo.lista) {
      return campoLista({
        id: 'ev-' + campo.id,
        rotulo: campo.rotulo,
        valor: valor === undefined ? campo.lista[0][0] : String(valor),
        opciones: campo.lista.map(o => ({ valor: o[0], texto: o[1] })),
      });
    }

    if (campo.largo) {
      return campoLargo({ id: 'ev-' + campo.id, rotulo: campo.rotulo, valor: valor });
    }

    return campoTexto({
      id: 'ev-' + campo.id,
      rotulo: campo.rotulo,
      tipo: campo.tipo || 'text',
      paso: campo.paso,
      // Las horas vienen de MySQL como HH:MM:SS y el campo de tipo time
      // solo entiende HH:MM.
      valor: (campo.tipo === 'time' && valor) ? String(valor).slice(0, 5) : valor,
    });
  }).join('');

  const cuerpo = abrirHoja(
    /* "Editar" solo si la fila ya existe. Un registro precargado sin id
       —los datos sugeridos de un correo de Amazon— es un alta, y el
       botón Borrar no tiene qué borrar. */
    (registro && registro.id) ? 'Editar' : config.titulo,
    campos + pieDeFormulario('Guardar', !!(registro && registro.id))
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const carga = {};
    config.campos.forEach(campo => {
      carga[campo.id] = valorDe('ev-' + campo.id, cuerpo);
    });

    // Las casillas de alternar no están en el formulario: se conserva
    // el valor que ya tenía para no desmarcarlas al editar otra cosa.
    if (config.alternar && registro) {
      carga[config.alternar] = Number(registro[config.alternar]) === 1;
    }

    // Y los campos ocultos viajan tal como llegaron.
    (config.ocultos || []).forEach(campo => {
      if (d[campo] !== undefined) carga[campo] = d[campo];
    });

    /* Solo se manda el id si el registro EXISTE en la base. Cuando se
       precarga un formulario con datos sugeridos —el alta de un regalo
       a partir de un correo de Amazon, por ejemplo— hay datos pero
       todavía no hay fila, y mandar un id inventado daría error. */
    if (registro && registro.id) carga.id = registro.id;

    try {
      await mandar('evento.php?accion=guardar&que=' + clave, carga);
      cerrarHoja(true);
      avisar('Guardado.');
      ensuciarVistas('resumen');
      await refrescarEvento();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar esto? No se puede deshacer.')) return;
      try {
        await mandar('evento.php?accion=borrar&que=' + clave, { id: registro.id });
        cerrarHoja(true);
        avisar('Eliminado.');
        await refrescarEvento();
      } catch (error) {
        avisar(error.message, true);
      }
    });
  }
}


/* ─── 4. LAS SECCIONES QUE NO SON LISTAS ───────────────────────────── */

/**
 * La ceremonia es una sola ficha, no una lista.
 *
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarCeremonia(cuerpo) {
  const c = EVENTO.ceremonia || {};
  const hay = c.iglesia || c.fecha;

  if (!hay) {
    cuerpo.innerHTML = '';
    pintarVacio(cuerpo, 'Todavía no cargaste la misa',
      'La iglesia, la fecha, el sacerdote y lo que cuesta.');
    cuerpo.insertAdjacentHTML('beforeend',
      '<button class="boton boton--principal boton--ancho" id="cer-editar" ' +
      'style="margin-top:var(--esp-3)">Cargar los datos</button>');
  } else {
    const renglones = [
      ['Iglesia',   c.iglesia],
      ['Dirección', c.direccion],
      ['Fecha',     c.fecha ? comoFecha(c.fecha) : ''],
      ['Hora',      c.hora ? String(c.hora).slice(0, 5) : ''],
      ['Sacerdote', c.sacerdote],
      ['Teléfono',  c.telefono],
      ['Costo',     Number(c.costo) ? comoDinero(c.costo) : ''],
      ['Notas',     c.notas],
    ].filter(r => r[1]);

    cuerpo.innerHTML =
      '<div class="tarjeta"><div class="detalle">' +
        renglones.map(r =>
          '<span class="detalle__rotulo">' + seguro(r[0]) + '</span>' +
          '<span class="detalle__valor">' + seguro(r[1]) + '</span>'
        ).join('') +
      '</div></div>' +
      '<button class="boton boton--ancho" id="cer-editar">Editar</button>';
  }

  buscar('#cer-editar', cuerpo).addEventListener('click', formularioCeremonia);
}

/**
 * Formulario de la ceremonia.
 *
 * @returns {void}
 */
function formularioCeremonia() {
  const c = EVENTO.ceremonia || {};

  const cuerpo = abrirHoja('La misa',
    campoTexto({ id: 'cer-iglesia', rotulo: 'Iglesia', valor: c.iglesia }) +
    campoTexto({ id: 'cer-direccion', rotulo: 'Dirección', valor: c.direccion }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'cer-fecha', rotulo: 'Fecha', tipo: 'date', valor: c.fecha || '' }) +
      campoTexto({ id: 'cer-hora', rotulo: 'Hora', tipo: 'time',
                   valor: c.hora ? String(c.hora).slice(0,5) : '' }) +
    '</div>' +
    campoTexto({ id: 'cer-sacerdote', rotulo: 'Sacerdote', valor: c.sacerdote }) +
    '<div class="campo-par">' +
      campoTexto({ id: 'cer-telefono', rotulo: 'Teléfono', tipo: 'tel', valor: c.telefono }) +
      campoTexto({ id: 'cer-costo', rotulo: 'Costo', tipo: 'number',
                   paso: '0.01', valor: c.costo || '' }) +
    '</div>' +
    campoLargo({ id: 'cer-notas', rotulo: 'Notas', valor: c.notas }) +
    pieDeFormulario('Guardar')
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    try {
      await mandar('evento.php?accion=guardar&que=ceremonia', {
        iglesia:   valorDe('cer-iglesia', cuerpo),
        direccion: valorDe('cer-direccion', cuerpo),
        fecha:     valorDe('cer-fecha', cuerpo),
        hora:      valorDe('cer-hora', cuerpo),
        sacerdote: valorDe('cer-sacerdote', cuerpo),
        telefono:  valorDe('cer-telefono', cuerpo),
        costo:     valorDe('cer-costo', cuerpo),
        notas:     valorDe('cer-notas', cuerpo),
      });
      cerrarHoja(true);
      avisar('Guardado.');
      await refrescarEvento();
    } catch (error) {
      avisar(error.message, true);
    }
  });
}
