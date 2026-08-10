/* ══════════════════════════════════════════════════════════════════════
   22 · ALARMAS

   QUÉ HACE ESTE ARCHIVO
   Recordatorios para una fecha y una hora exactas: "el jueves a las
   15:30 llamar al salón", y que suene el jueves a las 15:30.

   EN QUÉ SE DIFERENCIA DEL RECORDATORIO DIARIO
   El correo de las 8 de la mañana es un resumen de lo que vence pronto.
   Esto es puntual. Las dispara cron_alarmas.php, que corre cada diez
   minutos en el servidor — o sea que suenan aunque el teléfono esté
   guardado y la app cerrada.

   POR QUÉ NO SE USA LA ALARMA DEL TELÉFONO
   Una web no puede programar alarmas del sistema. Lo que sí puede es
   pedirle al servidor que avise a la hora justa, y eso es lo que se
   hace: correo (que siempre llega) y notificación (si está activada).

   ÍNDICE
     1. La lista
     2. Crear y editar
     3. Atajos rápidos
   ══════════════════════════════════════════════════════════════════════ */


/** Lo que devolvió el servidor. */
let ALARMAS = null;


/* ─── 1. LA LISTA ──────────────────────────────────────────────────── */

/**
 * Abre la pantalla de alarmas.
 *
 * @returns {Promise<void>}
 */
async function abrirAlarmas() {
  const cuerpo = abrirHoja('Alarmas',
    '<button class="boton boton--principal boton--ancho" id="alarma-nueva" ' +
            'style="margin-bottom:var(--esp-3)">Nueva alarma</button>' +
    '<div id="lista-alarmas"></div>');

  buscar('#alarma-nueva', cuerpo).addEventListener('click', () =>
    formularioDeAlarma(null, () => abrirAlarmas()));

  await cargarAlarmas(buscar('#lista-alarmas', cuerpo));
}

/**
 * Pide las alarmas y las pinta.
 *
 * @param {Element} donde
 * @returns {Promise<void>}
 */
async function cargarAlarmas(donde) {
  pintarCargando(donde, 3);

  try {
    ALARMAS = await traer('alarmas.php?accion=listar');
  } catch (error) {
    pintarError(donde, error.message, () => cargarAlarmas(donde));
    return;
  }

  const alarmas = ALARMAS.alarmas || [];

  if (!alarmas.length) {
    pintarVacio(donde, 'Todavía no hay alarmas',
      'Programa una para que te avise a una hora exacta: llamar al salón, ' +
      'pagar el anticipo, confirmar el pastel.');
    return;
  }

  donde.innerHTML = alarmas.map(filaDeAlarma).join('');

  buscarTodos('[data-alarma]', donde).forEach(boton => {
    boton.addEventListener('click', () => {
      const a = alarmas.find(x => String(x.id) === boton.dataset.alarma);
      formularioDeAlarma(a, () => cargarAlarmas(donde));
    });
  });
}

/**
 * El HTML de una alarma.
 *
 * @param {Object} a
 * @returns {string}
 */
function filaDeAlarma(a) {
  const cuando = aFecha(a.cuando);
  const activa = Number(a.activa) === 1;
  const yaSono = !!a.sonada_en;
  const pasada = !activa || yaSono || (cuando && cuando < new Date());

  /* "Pronto" es dentro de las próximas 24 horas: es cuando conviene que
     salte a la vista, porque todavía se puede hacer algo al respecto. */
  const faltan = cuando ? (cuando - new Date()) / 3600000 : 999;
  const pronto = !pasada && faltan >= 0 && faltan <= 24;

  const repeticiones = {
    una_vez: '', diaria: 'Todos los días',
    semanal: 'Cada semana', mensual: 'Cada mes',
  };

  const pie = [
    comoCuando(String(a.cuando).slice(0, 10)),
    repeticiones[a.repetir] || '',
    a.detalle,
  ].filter(Boolean).join(' · ');

  return '' +
    '<button class="alarma' +
      (pasada ? ' alarma--pasada' : '') +
      (pronto ? ' alarma--pronto' : '') +
      '" data-alarma="' + seguro(a.id) + '">' +

      '<span class="alarma__hora">' +
        '<strong>' + seguro(String(a.cuando).slice(11, 16)) + '</strong>' +
        '<span>' + seguro(cuando
          ? cuando.toLocaleDateString(CONFIGURACION.dinero.region,
              { day: 'numeric', month: 'short' }).replace('.', '')
          : '') + '</span>' +
      '</span>' +

      '<span class="alarma__cuerpo">' +
        '<span class="lista__titulo">' + seguro(a.titulo) + '</span>' +
        '<span class="lista__pie">' + seguro(pie) + '</span>' +
      '</span>' +

      '<span class="lista__lado">' +
        (!activa ? '<span class="etiqueta etiqueta--tenue">Apagada</span>'
         : yaSono ? '<span class="etiqueta etiqueta--tenue">Ya sonó</span>'
         : pronto ? '<span class="etiqueta etiqueta--alerta">Pronto</span>'
         : '') +
      '</span>' +
    '</button>';
}


/* ─── 2. CREAR Y EDITAR ────────────────────────────────────────────── */

/**
 * Formulario de una alarma.
 *
 * @param {Object} [alarma]
 * @param {Function} despues
 * @param {Object} [precargado] - { titulo, fecha, hora, atada_a_tipo, atada_a_id }
 * @returns {void}
 */
function formularioDeAlarma(alarma, despues, precargado) {
  const d = alarma || precargado || {};

  // La fecha y la hora vienen juntas de la base y separadas en el form.
  const fecha = d.cuando ? String(d.cuando).slice(0, 10) : (d.fecha || '');
  const hora  = d.cuando ? String(d.cuando).slice(11, 16) : (d.hora || '09:00');

  const cuerpo = abrirHoja(alarma ? 'Editar alarma' : 'Nueva alarma',
    campoTexto({ id: 'al-titulo', rotulo: 'De qué te aviso', valor: d.titulo,
                 pista: 'Llamar al salón' }) +

    '<div class="campo-par">' +
      campoTexto({ id: 'al-fecha', rotulo: 'Día', tipo: 'date', valor: fecha }) +
      campoTexto({ id: 'al-hora',  rotulo: 'Hora', tipo: 'time', valor: hora }) +
    '</div>' +

    campoLista({ id: 'al-repetir', rotulo: 'Repetir',
                 valor: d.repetir || 'una_vez',
                 opciones: [
                   { valor: 'una_vez',  texto: 'Una sola vez' },
                   { valor: 'diaria',   texto: 'Todos los días' },
                   { valor: 'semanal',  texto: 'Cada semana' },
                   { valor: 'mensual',  texto: 'Cada mes' },
                 ] }) +

    campoLargo({ id: 'al-detalle', rotulo: 'Detalle', valor: d.detalle }) +

    campoCasilla({ id: 'al-correo', rotulo: 'Avisarme por correo',
                   marcado: d.por_correo === undefined || Number(d.por_correo) === 1 }) +
    campoCasilla({ id: 'al-push', rotulo: 'Avisarme con una notificación',
                   marcado: d.por_push === undefined || Number(d.por_push) === 1 }) +

    '<p class="vacio__texto">El correo llega siempre. La notificación ' +
      'necesita que hayas activado los avisos en este teléfono.</p>' +

    (alarma
      ? '<div class="acciones">' +
          '<button class="boton" id="al-posponer">Posponer 1 hora</button>' +
          '<button class="boton" id="al-apagar">' +
            (Number(alarma.activa) === 1 ? 'Apagar' : 'Encender') +
          '</button>' +
        '</div>'
      : '') +

    pieDeFormulario('Guardar', !!alarma)
  );

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const titulo = valorDe('al-titulo', cuerpo);
    const f = valorDe('al-fecha', cuerpo);
    const h = valorDe('al-hora', cuerpo);

    if (!titulo) { avisar('Pon de qué te aviso.', true); return; }
    if (!f) { avisar('Falta el día.', true); return; }
    if (!h) { avisar('Falta la hora.', true); return; }

    const carga = {
      titulo:  titulo,
      fecha:   f,
      hora:    h,
      repetir: valorDe('al-repetir', cuerpo),
      detalle: valorDe('al-detalle', cuerpo),
      por_correo: !!valorDe('al-correo', cuerpo),
      por_push:   !!valorDe('al-push', cuerpo),
    };

    if (d.atada_a_tipo) {
      carga.atada_a_tipo = d.atada_a_tipo;
      carga.atada_a_id   = d.atada_a_id || 0;
    }
    if (alarma) carga.id = alarma.id;

    try {
      const r = await mandar('alarmas.php?accion=guardar', carga);
      cerrarHoja(true);
      avisar(r.mensaje);
      if (r.aviso) avisar(r.aviso, true);
      despues();
    } catch (error) {
      avisar(error.message, true);
    }
  });

  const borrar = buscar('#pie-borrar', cuerpo);
  if (borrar) {
    borrar.addEventListener('click', async () => {
      if (!confirmarAccion('¿Borrar esta alarma?')) return;
      try {
        await mandar('alarmas.php?accion=borrar', { id: alarma.id });
        cerrarHoja(true);
        avisar('Alarma eliminada.');
        despues();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const posponer = buscar('#al-posponer', cuerpo);
  if (posponer) {
    posponer.addEventListener('click', async () => {
      try {
        const r = await mandar('alarmas.php?accion=posponer',
                               { id: alarma.id, minutos: 60 });
        cerrarHoja(true);
        avisar(r.mensaje);
        despues();
      } catch (error) { avisar(error.message, true); }
    });
  }

  const apagar = buscar('#al-apagar', cuerpo);
  if (apagar) {
    apagar.addEventListener('click', async () => {
      try {
        const r = await mandar('alarmas.php?accion=apagar', { id: alarma.id });
        cerrarHoja(true);
        avisar(r.mensaje);
        despues();
      } catch (error) { avisar(error.message, true); }
    });
  }
}


/* ─── 3. ATAJOS RÁPIDOS ────────────────────────────────────────────── */

/**
 * Abre el formulario de alarma ya cargado desde otra pantalla.
 *
 * Es lo que permite poner un recordatorio para un pago concreto sin
 * tener que escribir de nuevo de qué se trata.
 *
 * @param {Object} opciones - { titulo, fecha, tipo, id }
 * @returns {void}
 */
function ponerleAlarmaA(opciones) {
  /* Se sugiere el día anterior a las 10 de la mañana. Avisar el mismo
     día de un vencimiento sirve de poco: si hay que ir al banco o
     llamar a alguien, ya es tarde. */
  let fecha = opciones.fecha || '';

  if (fecha) {
    const d = aFecha(fecha);
    if (d) {
      d.setDate(d.getDate() - 1);
      fecha = d.getFullYear() + '-' +
              String(d.getMonth() + 1).padStart(2, '0') + '-' +
              String(d.getDate()).padStart(2, '0');
    }
  }

  formularioDeAlarma(null, () => avisar('Alarma programada.'), {
    titulo: opciones.titulo || '',
    fecha:  fecha,
    hora:   '10:00',
    atada_a_tipo: opciones.tipo || '',
    atada_a_id:   opciones.id || 0,
  });
}
