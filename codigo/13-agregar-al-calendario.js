/* ══════════════════════════════════════════════════════════════════════
   13 · AGREGAR AL CALENDARIO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Cuando el invitado aprieta "Agendar la fecha", genera y descarga un
   archivo .ics con los datos de la fiesta. Al abrirlo, se agenda solo en
   Google Calendar, Apple Calendario u Outlook.

   QUÉ ES UN ARCHIVO .ICS
   Es un formato de texto plano, estándar desde hace décadas, que todos
   los calendarios del mundo entienden. Se ve así por dentro:

       BEGIN:VCALENDAR
       BEGIN:VEVENT
       DTSTART:20261024T170000      ← cuándo empieza
       DTEND:20261025T010000        ← cuándo termina
       SUMMARY:XV Años de Ania      ← el título
       LOCATION:Salones Alvi…       ← dónde
       END:VEVENT
       END:VCALENDAR

   Lo lindo es que no hace falta ningún servidor ni ninguna biblioteca:
   armamos ese texto acá mismo y se lo damos al navegador para descargar.

   ÍNDICE
     1. Dar formato a las fechas
     2. Armar el contenido del archivo
     3. Descargarlo
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElBotonDeCalendario() {

  const botonAgendar = buscar('#boton-agendar');
  if (!botonAgendar) return;


  /* ─── 1. DAR FORMATO A LAS FECHAS ──────────────────────────────────
     El estándar .ics quiere las fechas pegadas, sin guiones ni dos
     puntos. Como en la configuración ya están escritas casi así, alcanza
     con sacarles los separadores.
     ---------------------------------------------------------------- */

  /**
   * Convierte una fecha del archivo de configuración al formato .ics.
   *
   * @param {string} fechaDeLaConfiguracion - Ej: '2026-10-24T17:00:00'
   * @returns {string} La misma fecha sin separadores: '20261024T170000'
   *
   * @example
   *   darFormatoParaCalendario('2026-10-24T17:00:00')  // → '20261024T170000'
   */
  function darFormatoParaCalendario(fechaDeLaConfiguracion) {
    return fechaDeLaConfiguracion.replace(/[-:]/g, '');
  }

  /**
   * Devuelve el momento actual en el formato que pide el estándar para
   * la marca de creación del evento (siempre en horario universal, por
   * eso termina en Z).
   *
   * @returns {string} Ej: '20260721T143012Z'
   */
  function momentoActualParaCalendario() {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }


  /* ─── 2. ARMAR EL CONTENIDO DEL ARCHIVO ────────────────────────────
     Los textos largos y los caracteres especiales tienen reglas: las
     comas y los punto y coma se "escapan" con una barra invertida, y los
     saltos de línea se escriben como \n literal.
     ---------------------------------------------------------------- */

  /**
   * Limpia un texto para que no rompa el formato .ics.
   *
   * @param {string} texto - El texto original.
   * @returns {string} El texto seguro para meter en el archivo.
   */
  function prepararTextoParaCalendario(texto) {
    return String(texto)
      .replace(/<br\s*\/?>/gi, ' ')   // los <br> del HTML pasan a espacios
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Arma el contenido completo del archivo de calendario.
   *
   * @returns {string} El texto del archivo .ics.
   */
  function armarElArchivoDeCalendario() {
    const fiesta = CONFIGURACION.fiesta;
    const lugar  = CONFIGURACION.lugar;

    const titulo = `${fiesta.edadEnRomanos} Años de ${fiesta.nombre}`;
    const descripcion =
      `¡Te esperamos para celebrar los ${fiesta.edadEnRomanos} años de ${fiesta.nombre}! ` +
      `Llegada ${fiesta.horaEnPalabras}. Código de vestimenta: ` +
      prepararTextoParaCalendario(fiesta.codigoDeVestimenta);

    /* Cada línea del archivo va separada por un salto de línea especial
       (\r\n) porque así lo pide el estándar. Si se usa solo \n, algunos
       calendarios viejos no lo entienden. */
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Invitacion Ania//Quince Anios//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:xv-' + fiesta.nombre.toLowerCase() + '-' + darFormatoParaCalendario(fiesta.fechaYHora) + '@invitacion',
      'DTSTAMP:' + momentoActualParaCalendario(),
      'DTSTART:' + darFormatoParaCalendario(fiesta.fechaYHora),
      'DTEND:'   + darFormatoParaCalendario(fiesta.fechaYHoraDeCierre),
      'SUMMARY:' + prepararTextoParaCalendario(titulo),
      'DESCRIPTION:' + descripcion,
      'LOCATION:' + prepararTextoParaCalendario(lugar.nombre + ', ' + lugar.direccionEnUnaLinea),
      'STATUS:CONFIRMED',
      /* Un recordatorio automático un día antes */
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + prepararTextoParaCalendario('¡Mañana son los ' + fiesta.edadEnRomanos + ' de ' + fiesta.nombre + '!'),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }


  /* ─── 3. DESCARGARLO ───────────────────────────────────────────────
     Truco clásico: se arma un archivo en la memoria del navegador
     (un "Blob"), se le inventa una dirección temporal, se crea un enlace
     invisible que apunta ahí, se le hace clic por código y se borra
     todo. La persona solo ve que se le descargó un archivo.
     ---------------------------------------------------------------- */

  botonAgendar.addEventListener('click', function alApretarAgendar() {
    const contenido = armarElArchivoDeCalendario();

    // type: 'text/calendar' es lo que le dice al sistema operativo que
    // esto va abierto con la aplicación de calendario.
    const archivoEnMemoria = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
    const direccionTemporal = URL.createObjectURL(archivoEnMemoria);

    const enlaceInvisible = document.createElement('a');
    enlaceInvisible.href = direccionTemporal;
    enlaceInvisible.download = 'XV-Anios-' + CONFIGURACION.fiesta.nombre + '.ics';

    document.body.appendChild(enlaceInvisible);
    enlaceInvisible.click();
    document.body.removeChild(enlaceInvisible);

    // Liberamos la memoria que ocupaba el archivo temporal
    URL.revokeObjectURL(direccionTemporal);
  });

})();
