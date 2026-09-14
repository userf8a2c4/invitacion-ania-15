/* ══════════════════════════════════════════════════════════════════════
   53-ECLIPSE.JS · LA HORA DEL MINUTO

   QUÉ HACE ESTE ARCHIVO
   Una sola cosa: elegir a qué hora corre el Eclipse de Sangre en la
   invitación. Carlos: «pon en la app un control específico para
   controlar la hora de trigger».

   Hasta el 14 de septiembre de 2026 la hora estaba escrita a mano en
   index.html (`var HORA_UTC = 12, MINUTO_UTC = 30`). Cambiarla obligaba
   a editar el archivo, empaquetar y subir — o sea que no era un control.

   ⚠️ SE GUARDA EN UTC, SE MUESTRA EN HORA DE TOLUCA
   La invitación ancla el minuto a UTC a propósito: es el MISMO instante
   absoluto en todo el planeta, así que los invitados de Tegucigalpa y
   los de Toluca lo viven juntos. Pero nadie piensa en UTC. Acá se
   escribe la hora de Toluca y se convierte sola.

   México dejó el horario de verano en 2022, así que Toluca es UTC−6
   todo el año, sin excepciones. Tegucigalpa también es UTC−6 y tampoco
   cambia. Por eso la conversión es una resta y no una tabla.

   ⚠️ POR QUÉ NO VIVE EN LA HOJA DE «FECHA LÍMITE»
   Porque esa hoja (48-invitaciones.js) tiene UN botón Guardar que ya
   dispara dos escrituras: la fecha límite y el texto de la invitación.
   Meter acá una tercera haría que corregir una coma en el texto de la
   invitación reescribiera además la hora del eclipse. Son decisiones
   distintas y se guardan por separado.

   ⚠️ POR QUÉ mandarSinCola() Y NO mandar()
   Ver la nota grande abajo, en guardarLaHora(). Es la diferencia entre
   «Lucila cambió la hora» y «Lucila cree que cambió la hora».
   ══════════════════════════════════════════════════════════════════════ */

/** La clave del ajuste. La misma que leen eclipse.php e invitacion.php. */
const CLAVE_DE_LA_HORA = 'hora_eclipse_utc';

/** La hora horneada en index.html, que es el respaldo cuando no hay nada. */
const HORA_HORNEADA = '12:30';

/** Cuánto se le resta a UTC para llegar a Toluca (y a Tegucigalpa). */
const HORAS_HASTA_TOLUCA = 6;

/** Cuánto dura el ritual, para poder decir si hoy todavía llega. */
const DURA_EL_ECLIPSE = 60000;


/**
 * Pasa "HH:MM" a minutos desde la medianoche, o -1 si no es una hora.
 *
 * @param {string} texto
 * @returns {number}
 */
function minutosDe(texto) {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(String(texto || ''))) return -1;
  return parseInt(texto.slice(0, 2), 10) * 60 + parseInt(texto.slice(3, 5), 10);
}


/**
 * Pasa minutos desde la medianoche a "HH:MM", dando la vuelta al día.
 *
 * @param {number} minutos
 * @returns {string}
 */
function horaDe(minutos) {
  const m = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return (h < 10 ? '0' : '') + h + ':' + (m % 60 < 10 ? '0' : '') + (m % 60);
}


/** UTC → hora de Toluca. */
function aToluca(utc) {
  const m = minutosDe(utc);
  return m < 0 ? '' : horaDe(m - HORAS_HASTA_TOLUCA * 60);
}

/** Hora de Toluca → UTC. */
function aUtc(toluca) {
  const m = minutosDe(toluca);
  return m < 0 ? '' : horaDe(m + HORAS_HASTA_TOLUCA * 60);
}


/**
 * Cuándo es el próximo eclipse con esta hora, dicho en palabras.
 *
 * ⚠️ ESTA FRASE PREVIENE LA MITAD DE LOS SUSTOS. Si Lucila a las tres de
 * la tarde pone las dos de la tarde pensando en mañana, sin esta línea
 * no tiene forma de saber si acaba de programar algo para dentro de un
 * rato o para dentro de veintitrés horas.
 *
 * @param {string} utc - "HH:MM"
 * @returns {string}
 */
function cuandoEsElProximo(utc) {
  const m = minutosDe(utc);
  if (m < 0) return '';

  const ahora = new Date();
  const proximo = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(),
                           ahora.getUTCDate(), Math.floor(m / 60), m % 60, 0, 0);

  const faltan = proximo + DURA_EL_ECLIPSE > ahora.getTime()
    ? proximo - ahora.getTime()
    : proximo + 86400000 - ahora.getTime();

  const horas = Math.floor(faltan / 3600000);
  const minutos = Math.round((faltan % 3600000) / 60000);

  const cuanto = horas > 0
    ? horas + (horas === 1 ? ' hora' : ' horas') +
      (minutos > 0 ? ' y ' + minutos + ' min' : '')
    : minutos + ' min';

  return (faltan < 86400000 - 3600000 * 12 ? 'Hoy' : 'Mañana') +
         ' a las ' + aToluca(utc) + ' de Toluca · dentro de ' + cuanto;
}


/**
 * Abre la hoja para elegir la hora del eclipse.
 *
 * @returns {Promise<void>}
 */
async function abrirLaHoraDelEclipse() {
  let utcGuardada = '';
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=' + CLAVE_DE_LA_HORA);
    if (r && r.valor) utcGuardada = String(r.valor).trim();
  } catch (error) { /* se muestra la horneada */ }

  const utcInicial = minutosDe(utcGuardada) >= 0 ? utcGuardada : HORA_HORNEADA;
  const sinConfigurar = minutosDe(utcGuardada) < 0;

  const cuerpo = abrirHoja('Eclipse de Sangre',
    '<div class="tarjeta__titulo">Los 60 segundos</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Una vez al día, durante un minuto, la invitación deja de ser una ' +
      'invitación. Esta es la hora a la que pasa — la misma para todos, ' +
      'en Toluca y en Tegucigalpa.' +
    '</p>' +

    campoTexto({ id: 'ecl-hora', rotulo: 'Hora de Toluca', tipo: 'time',
                 valor: aToluca(utcInicial) }) +

    '<div class="tarjeta" id="ecl-cuando" ' +
         'style="font-size:13px;line-height:1.5"></div>' +

    (sinConfigurar
      ? '<p class="vacio__texto" style="margin-top:var(--esp-2)">' +
          'Todavía no se ha elegido ninguna: la invitación está corriendo ' +
          'con las ' + aToluca(HORA_HORNEADA) + ' que trae de fábrica.' +
        '</p>'
      : '') +

    /* ⚠️ ESTO NO ES DECORACIÓN. El modo de falla de todo este mecanismo
       es el SILENCIO: se guarda en la base y el sitio público sigue
       sirviendo otra cosa —porque eclipse.php no se subió, porque un
       intermediario cacheó la respuesta, porque la base del sitio no es
       la misma que la del panel—. Este recuadro le pregunta al sitio
       público lo mismo que le pregunta un invitado, y muestra lo que de
       verdad contestó. Es lo único que rompe ese silencio en el momento
       en que pasa. */
    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">' +
      'Lo que ve un invitado' +
    '</div>' +
    '<div class="tarjeta" id="ecl-espejo" ' +
         'style="font-size:13px;line-height:1.5">Preguntando…</div>' +

    /* ⚡ EL DISPARO A MANO VIVE ACÁ (2026-09-14)
       Carlos lo pidió junto a la hora, y es donde va: son la misma cosa
       —cuándo corre el minuto—, una todos los días y otra ahora mismo.
       Un botón propio en la pantalla de Gente habría sido un octavo
       botón en una pantalla que ya tenía siete. */
    '<div style="border-top:1px solid var(--borde);' +
         'margin:var(--esp-4) 0 var(--esp-3)"></div>' +

    '<div class="tarjeta__titulo">Lanzarlo ahora</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Corre el minuto entero en este momento, sin esperar a la hora. ' +
      'Lo va a ver cualquier invitado que tenga la invitación abierta o ' +
      'que la abra en ese minuto.' +
    '</p>' +
    '<button class="boton boton--ancho" id="ecl-ahora" ' +
            'style="margin-bottom:var(--esp-2)">⚡ Lanzarlo ahora</button>' +
    '<div id="ecl-ahora-dice"></div>' +

    pieDeFormulario('Guardar')
  );

  const campo   = buscar('#ecl-hora', cuerpo);
  const cuando  = buscar('#ecl-cuando', cuerpo);
  const espejo  = buscar('#ecl-espejo', cuerpo);

  /* La conversión se rehace con cada tecla: es lo que convierte «UTC» de
     un concepto que hay que calcular en un dato que se lee. */
  const repintar = () => {
    const utc = aUtc(campo.value);
    if (!utc) {
      cuando.textContent = 'Elige una hora.';
      return;
    }
    cuando.innerHTML =
      '<strong>' + seguro(cuandoEsElProximo(utc)) + '</strong><br>' +
      '<span class="vacio__texto">Se guarda como ' + seguro(utc) + ' UTC</span>';
  };
  campo.addEventListener('input', repintar);
  repintar();

  mirarseAlEspejo(espejo);

  buscar('#ecl-ahora', cuerpo).addEventListener('click', async () => {
    if (!await confirmarAccion(
      'Vas a lanzar el Eclipse AHORA.\n\n' +
      'Durante 60 segundos, cualquier invitado que tenga la invitación ' +
      'abierta —o que la abra en ese minuto— la va a ver transformarse.',
      { confirmar: 'Lanzarlo', peligro: true })) return;

    const dice = buscar('#ecl-ahora-dice', cuerpo);
    dice.innerHTML = '<p class="vacio__texto">Lanzando…</p>';

    try {
      /* ⚠️ mandarSinCola, por lo mismo que la hora: un disparo encolado
         «para cuando vuelva la señal» aterrizaría en cualquier momento. */
      await mandarSinCola('ajustes.php?accion=guardar',
        { clave: 'eclipse_disparo', valor: String(Date.now()) });

      dice.innerHTML =
        '<p class="vacio__texto">Lanzado. Las invitaciones que estén ' +
        'abiertas lo arrancan en los próximos 15 segundos.</p>';
      avisar('Eclipse lanzado.');
    } catch (error) {
      dice.innerHTML = '';
      avisar(error.message, true);
    }
  });

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const utc = aUtc(campo.value);
    if (!utc) { avisar('Elige una hora.', true); return; }

    await guardarLaHora(utc, espejo);
  });
}


/**
 * Guarda la hora y comprueba, contra el sitio público, que llegó.
 *
 * @param {string} utc
 * @param {HTMLElement} espejo
 * @returns {Promise<void>}
 */
async function guardarLaHora(utc, espejo) {
  try {
    /* ⛔ mandarSinCola() Y NO mandar(), Y LA DIFERENCIA ES TOTAL.
     *
     * mandar() encola las escrituras cuando no hay señal y devuelve
     * éxito: el panel dice «Guardado», y el cambio aterriza cuando el
     * teléfono vuelva a agarrar red — que puede ser mañana, o a las
     * 12:31. Para una nota o una tarea eso está bien y por eso la cola
     * existe. Para esto no: Lucila se quedaría creyendo que movió la
     * hora, el sitio seguiría con la vieja, y no habría forma de notarlo
     * hasta que el eclipse corriera cuando no debía.
     *
     * Sin cola, si no hay señal se ve el error y se vuelve a intentar. */
    await mandarSinCola('ajustes.php?accion=guardar',
      { clave: CLAVE_DE_LA_HORA, valor: utc });
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  avisar('Guardada. Comprobando que le llegue a la invitación…');
  await mirarseAlEspejo(espejo, utc);
}


/**
 * Le pregunta al sitio público qué hora está sirviendo de verdad.
 *
 * ⚠️ SE PIDE eclipse.php, EL MISMO ARCHIVO QUE PIDE UN INVITADO, y no la
 * API del panel. Preguntarle a la API sería preguntarle a la base lo que
 * la base acaba de guardar: siempre diría que sí, y no probaría nada.
 *
 * @param {HTMLElement} espejo
 * @param {string} [esperada] - si se pasa, se compara contra esto.
 * @returns {Promise<void>}
 */
async function mirarseAlEspejo(espejo, esperada) {
  if (!espejo) return;
  espejo.textContent = 'Preguntando…';

  /* El panel vive en /admin/, así que el sitio público está un nivel
     arriba. `?comprobar=` es para saltear cualquier intermediario que
     cachee, igual que hace el vigía. */
  const direccion = '../eclipse.php?comprobar=' + Date.now();

  let datos = null;
  try {
    const r = await fetch(direccion, { cache: 'no-store' });
    if (r.ok) datos = await r.json();
  } catch (error) { /* se dice abajo */ }

  if (!datos) {
    espejo.innerHTML =
      '<strong style="color:var(--alerta)">La invitación no contestó.</strong><br>' +
      '<span class="vacio__texto">Puede que eclipse.php todavía no esté ' +
      'subido. Mientras tanto la invitación corre con la hora de fábrica, ' +
      'las ' + seguro(aToluca(HORA_HORNEADA)) + ' de Toluca.</span>';
    return;
  }

  if (!datos.utc) {
    espejo.innerHTML =
      '<strong>Sin hora configurada.</strong><br>' +
      '<span class="vacio__texto">La invitación está corriendo con la hora ' +
      'de fábrica: ' + seguro(aToluca(HORA_HORNEADA)) + ' de Toluca.</span>';
    return;
  }

  const coincide = !esperada || datos.utc === esperada;

  espejo.innerHTML = coincide
    ? '<strong>' + seguro(aToluca(datos.utc)) + ' de Toluca.</strong><br>' +
      '<span class="vacio__texto">Es lo que le llega a un invitado ahora ' +
      'mismo (' + seguro(datos.utc) + ' UTC).</span>'
    : '<strong style="color:var(--alerta)">No coincide.</strong><br>' +
      '<span class="vacio__texto">Se guardó ' + seguro(esperada) + ' UTC, ' +
      'pero la invitación sigue sirviendo ' + seguro(datos.utc) + ' UTC. ' +
      'Suele ser que algo entre medio guardó la respuesta vieja; ' +
      'vuelve a comprobarlo en un rato.</span>';
}
