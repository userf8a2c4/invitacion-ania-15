/* ══════════════════════════════════════════════════════════════════════
   09 · CUENTA REGRESIVA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Muestra cuánto falta para la fiesta y lo actualiza cada segundo.

   CÓMO SE CALCULA
   Las computadoras guardan las fechas como un número gigante: cuántos
   milisegundos pasaron desde el 1 de enero de 1970. Suena raro, pero es
   comodísimo, porque para saber cuánto falta basta con una resta:

       faltan = (momento de la fiesta) − (momento de ahora)

   Ese resultado son milisegundos. Después lo repartimos en días, horas,
   minutos y segundos con divisiones:

       1 segundo = 1.000 milisegundos
       1 minuto  = 60 segundos      = 60.000 ms
       1 hora    = 60 minutos       = 3.600.000 ms
       1 día     = 24 horas         = 86.400.000 ms

   ÍNDICE
     1. Preparar la fecha y los elementos
     2. Repartir los milisegundos en días, horas, minutos y segundos
     3. Actualizar la pantalla cada segundo
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLaCuentaRegresiva() {

  /* ─── 1. PREPARAR LA FECHA Y LOS ELEMENTOS ─────────────────────── */
  const contenedor = buscar('#cuenta-regresiva');
  if (!contenedor) return;

  const casilleroDias     = buscar('#cuenta-dias');
  const casilleroHoras    = buscar('#cuenta-horas');
  const casilleroMinutos  = buscar('#cuenta-minutos');
  const casilleroSegundos = buscar('#cuenta-segundos');

  /* new Date(...) convierte el texto de la configuración en una fecha
     que la computadora entiende. Si alguien escribe mal la fecha en
     01-configuracion.js, esto da "Invalid Date" y lo avisamos por
     consola en vez de mostrar "NaN" en pantalla. */
  const momentoDeLaFiesta = new Date(CONFIGURACION.fiesta.fechaYHora);

  if (isNaN(momentoDeLaFiesta.getTime())) {
    console.warn(
      'La fecha de la fiesta está mal escrita en 01-configuracion.js. ' +
      'Tiene que tener el formato AÑO-MES-DÍAThora:minutos:segundos, ' +
      'por ejemplo 2026-10-24T17:00:00'
    );
    return;
  }


  /* ─── 2. REPARTIR LOS MILISEGUNDOS ─────────────────────────────── */

  /** Cuántos milisegundos tiene cada unidad de tiempo. */
  const MS_POR_SEGUNDO = 1000;
  const MS_POR_MINUTO  = MS_POR_SEGUNDO * 60;
  const MS_POR_HORA    = MS_POR_MINUTO * 60;
  const MS_POR_DIA     = MS_POR_HORA * 24;

  /**
   * Convierte una cantidad de milisegundos en días, horas, minutos y
   * segundos.
   *
   * El truco es usar dos operaciones:
   *   Math.floor(a / b) → cuántas veces entera entra b en a
   *   a % b             → el resto que sobra después de esa división
   *
   * @param {number} milisegundos - Cuánto falta, en milisegundos.
   * @returns {{dias:number, horas:number, minutos:number, segundos:number}}
   *
   * @example
   *   repartirElTiempo(90061000)
   *   // → { dias: 1, horas: 1, minutos: 1, segundos: 1 }
   */
  function repartirElTiempo(milisegundos) {
    return {
      dias:     Math.floor(milisegundos / MS_POR_DIA),
      horas:    Math.floor((milisegundos % MS_POR_DIA)    / MS_POR_HORA),
      minutos:  Math.floor((milisegundos % MS_POR_HORA)   / MS_POR_MINUTO),
      segundos: Math.floor((milisegundos % MS_POR_MINUTO) / MS_POR_SEGUNDO),
    };
  }

  /**
   * Agrega un cero adelante a los números de un solo dígito, para que
   * el reloj no "salte" de ancho al pasar de 9 a 10.
   *
   * @param {number} numero - El número a formatear.
   * @returns {string} El número con dos dígitos como mínimo.
   *
   * @example
   *   conDosDigitos(7)   // → '07'
   *   conDosDigitos(23)  // → '23'
   */
  function conDosDigitos(numero) {
    return String(numero).padStart(2, '0');
  }


  /* ─── 3. ACTUALIZAR LA PANTALLA CADA SEGUNDO ───────────────────── */

  /**
   * Recalcula cuánto falta y lo escribe en las cartelas.
   * @returns {void}
   */
  function actualizarLaCuenta() {
    const faltanMilisegundos = momentoDeLaFiesta.getTime() - Date.now();

    // ¿Ya llegó el día? Mostramos el mensaje festivo y frenamos el reloj.
    if (faltanMilisegundos <= 0) {
      contenedor.classList.add('es-hoy');
      clearInterval(relojInterno);
      return;
    }

    const tiempo = repartirElTiempo(faltanMilisegundos);

    if (casilleroDias)     casilleroDias.textContent     = tiempo.dias;
    if (casilleroHoras)    casilleroHoras.textContent    = conDosDigitos(tiempo.horas);
    if (casilleroMinutos)  casilleroMinutos.textContent  = conDosDigitos(tiempo.minutos);
    if (casilleroSegundos) casilleroSegundos.textContent = conDosDigitos(tiempo.segundos);
  }

  // Se dibuja una vez enseguida (para que no aparezca vacío) y después
  // se repite cada 1000 milisegundos, o sea cada segundo.
  actualizarLaCuenta();
  const relojInterno = setInterval(actualizarLaCuenta, 1000);

})();
