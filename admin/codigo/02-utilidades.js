/* ══════════════════════════════════════════════════════════════════════
   02 · UTILIDADES

   QUÉ ES ESTE ARCHIVO
   La caja de herramientas del panel: funciones cortitas que se usan por
   todos lados. Mismo espíritu que las utilidades de la invitación.

   ÍNDICE
     1. Buscar elementos
     2. Crear elementos y escapar texto
     3. Dinero
     4. Fechas
     5. Textos
     6. Memoria del navegador
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. BUSCAR ELEMENTOS ──────────────────────────────────────────── */

/**
 * Busca UN elemento del HTML.
 *
 * @param {string} selector - Con # por id, con . por clase.
 * @param {Element} [dentroDe] - Dónde buscar. Por defecto, toda la página.
 * @returns {Element|null}
 */
function buscar(selector, dentroDe) {
  return (dentroDe || document).querySelector(selector);
}

/**
 * Busca TODOS los que coincidan, como lista normal.
 *
 * @param {string} selector
 * @param {Element} [dentroDe]
 * @returns {Element[]}
 */
function buscarTodos(selector, dentroDe) {
  return Array.from((dentroDe || document).querySelectorAll(selector));
}


/* ─── 2. CREAR ELEMENTOS Y ESCAPAR TEXTO ───────────────────────────── */

/**
 * Convierte un texto en algo seguro de meter dentro de HTML.
 *
 * ⚠️ ESTA ES LA FUNCIÓN MÁS IMPORTANTE DEL ARCHIVO.
 *
 * Los nombres, notas y correos vienen de la base de datos tal como los
 * escribió una persona. Si un invitado se llamara:
 *     <img src=x onerror="alert('hola')">
 * y lo pegáramos crudo en el HTML, el navegador ejecutaría ese código
 * dentro del panel, con la sesión de administrador abierta.
 *
 * Con esto, ese nombre se ve como texto raro y no pasa nada más.
 *
 * REGLA: todo dato que venga del servidor pasa por acá antes de entrar
 * en un innerHTML. Sin excepciones.
 *
 * @param {*} texto
 * @returns {string}
 */
function seguro(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Crea un elemento con clase y contenido de una sola línea.
 *
 * @param {string} etiqueta - 'div', 'button'…
 * @param {string} [clase]
 * @param {string} [html] - Ya escapado con seguro() si viene de datos.
 * @returns {Element}
 */
function crear(etiqueta, clase, html) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (html !== undefined) elemento.innerHTML = html;
  return elemento;
}


/* ─── 3. DINERO ────────────────────────────────────────────────────── */

/**
 * En qué moneda se están mirando los montos ahora.
 *
 * Es solo una preferencia de visualización: en la base de datos SIEMPRE
 * están en pesos. Se recuerda entre sesiones para no tener que
 * cambiarla cada vez que se abre la app.
 *
 * @returns {string} 'MXN' o 'USD'
 */
function monedaElegida() {
  const guardada = recordado('moneda', CONFIGURACION.dinero.monedaBase);
  return CONFIGURACION.dinero.monedas[guardada]
    ? guardada
    : CONFIGURACION.dinero.monedaBase;
}

/**
 * Cambia la moneda en la que se muestran los montos.
 *
 * @param {string} cual - 'MXN' o 'USD'
 * @returns {void}
 */
function elegirMoneda(cual) {
  if (CONFIGURACION.dinero.monedas[cual]) recordar('moneda', cual);
}

/**
 * Escribe un número como cantidad de dinero: 1500.5 → "$1,500.50"
 *
 * El número que entra SIEMPRE está en pesos, porque así se guarda todo.
 * Si la moneda elegida es el dólar, aquí se hace la división — en un solo
 * lugar, para que no haya forma de que una pantalla convierta y otra no.
 *
 * @param {number} cantidad - En pesos.
 * @param {boolean} [conDecimales=true] - En false: "$1,501", más corto
 *                                        para cifras grandes del tablero.
 * @returns {string}
 */
function comoDinero(cantidad, conDecimales) {
  let numero = Number(cantidad) || 0;

  const cual  = monedaElegida();
  const datos = CONFIGURACION.dinero.monedas[cual];

  if (cual === 'USD') {
    const cambio = Number(CONFIGURACION.dinero.pesosPorDolar) || 1;
    numero = numero / cambio;
  }

  const decimales = (conDecimales === false) ? 0 : 2;

  return datos.simbolo + numero.toLocaleString(
    CONFIGURACION.dinero.region,
    { minimumFractionDigits: decimales, maximumFractionDigits: decimales }
  );
}

/**
 * Convierte a pesos lo que se escribió en un campo de monto.
 *
 * Es el camino inverso de comoDinero(): si se están viendo dólares, lo
 * que la persona escribe son dólares, pero lo que hay que guardar son
 * pesos. Sin esto, cargar "100" mirando dólares guardaría 100 pesos.
 *
 * @param {string|number} loEscrito
 * @returns {number} En pesos.
 */
function aPesos(loEscrito) {
  const numero = Number(String(loEscrito).replace(/[^0-9.\-]/g, '')) || 0;

  if (monedaElegida() === 'USD') {
    return numero * (Number(CONFIGURACION.dinero.pesosPorDolar) || 1);
  }
  return numero;
}

/**
 * Convierte pesos a la moneda elegida, para rellenar un campo.
 *
 * @param {number} pesos
 * @returns {number}
 */
function desdePesos(pesos) {
  const numero = Number(pesos) || 0;

  if (monedaElegida() === 'USD') {
    const cambio = Number(CONFIGURACION.dinero.pesosPorDolar) || 1;
    return Math.round((numero / cambio) * 100) / 100;
  }
  return numero;
}

/**
 * Qué porcentaje es una cantidad de otra, acotado por si se pasa.
 *
 * @param {number} parte
 * @param {number} total
 * @returns {number} De 0 a 100. Si el total es 0, devuelve 0.
 */
function porcentaje(parte, total) {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Math.round((Number(parte) || 0) / t * 100);
}


/* ─── 4. FECHAS ────────────────────────────────────────────────────── */

/**
 * Convierte a fecha lo que venga, respetando el huso horario local.
 *
 * ⚠️ ESTA FUNCIÓN ARREGLA UN ERROR QUE NO SE VE PERO SE SUFRE.
 *
 * MySQL devuelve las fechas como '2026-10-24', sin hora. Y JavaScript,
 * cuando recibe ese formato exacto, lo interpreta como medianoche en
 * UTC — no en la hora de aquí. En México (UTC-6) esa medianoche UTC son
 * las 6 de la tarde del DÍA ANTERIOR.
 *
 * O sea que sin esto:
 *   · el 24 de octubre se mostraría como 23 de octubre;
 *   · un pago que vence hoy diría "venció ayer";
 *   · y todo el panel estaría corrido un día, en silencio.
 *
 * La solución es armar la fecha pieza por pieza con el constructor de
 * tres números, que sí usa la hora local. Los textos que ya traen hora
 * ('2026-10-24T17:00:00') no tienen el problema y pasan de largo.
 *
 * @param {string|Date} valor
 * @returns {Date|null} null si no se pudo entender.
 */
function aFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor) ? null : valor;

  const texto = String(valor);

  /* Se acepta AAAA-MM-DD con hora opcional. La hora se conserva si
     viene: MySQL devuelve "2026-08-03 14:30:00" para las alarmas, y
     descartarla haría que una alarma de las 14:30 se leyera como las
     00:00 — o sea, como si ya hubiera pasado toda la mañana. */
  const partes = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (partes) {
    const fecha = new Date(
      Number(partes[1]),
      Number(partes[2]) - 1,       // los meses van de 0 a 11
      Number(partes[3]),
      Number(partes[4] || 0),
      Number(partes[5] || 0),
      Number(partes[6] || 0)
    );
    return isNaN(fecha) ? null : fecha;
  }

  const fecha = new Date(texto);
  return isNaN(fecha) ? null : fecha;
}

/**
 * Cuántos días faltan para la fiesta.
 *
 * @returns {number} Negativo si ya pasó.
 */
function diasParaLaFiesta() {
  return diasHasta(CONFIGURACION.fiesta.fechaYHora);
}

/**
 * Cuántos días faltan para una fecha.
 *
 * Se comparan los días a medianoche, no los instantes exactos: si algo
 * vence hoy a las 9 de la mañana y son las 10, tiene que decir "hoy" y
 * no "hace 1 hora".
 *
 * @param {string} fecha - 'AAAA-MM-DD' o fecha completa.
 * @returns {number} Negativo si ya pasó.
 */
function diasHasta(fecha) {
  const destino = aFecha(fecha);
  if (!destino) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  destino.setHours(0, 0, 0, 0);

  return Math.round((destino - hoy) / 86400000);
}

/**
 * Escribe una fecha en forma corta: '2026-10-24' → "24 oct 2026"
 *
 * @param {string} fecha
 * @returns {string} Cadena vacía si no hay fecha.
 */
function comoFecha(fecha) {
  const d = aFecha(fecha);
  if (!d) return '';

  return d.toLocaleDateString(CONFIGURACION.dinero.region,
    { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Escribe cuánto falta o cuánto pasó, en palabras.
 *
 * "en 3 días", "hoy", "hace 2 días". Es más fácil de entender de un
 * vistazo que una fecha, sobre todo para saber qué está atrasado.
 *
 * @param {string} fecha
 * @returns {string}
 */
function comoCuando(fecha) {
  const dias = diasHasta(fecha);

  if (dias === 0)  return 'hoy';
  if (dias === 1)  return 'mañana';
  if (dias === -1) return 'ayer';
  if (dias > 1)    return 'en ' + dias + ' días';
  return 'hace ' + Math.abs(dias) + ' días';
}


/* ─── 5. TEXTOS ────────────────────────────────────────────────────── */

/**
 * Corta un texto largo y le pone puntos suspensivos.
 *
 * @param {string} texto
 * @param {number} largo
 * @returns {string}
 */
function acortar(texto, largo) {
  const t = String(texto || '');
  return t.length > largo ? t.slice(0, largo - 1).trimEnd() + '…' : t;
}

/**
 * Prepara un texto para comparar sin importar acentos ni mayúsculas.
 *
 * Es lo que hace que buscar "maria" encuentre a "María Peña". Sin esto,
 * habría que escribir el acento exacto para encontrar a alguien.
 *
 * @param {string} texto
 * @returns {string}
 */
function paraBuscar(texto) {
  return String(texto || '')
    .toLowerCase()
    // NFD separa cada letra acentuada en dos piezas: la letra pelada y
    // el acento suelto. Después \p{M} borra esos acentos sueltos ("M"
    // es la categoría Unicode de las marcas).
    //
    // Se usa \p{M} y no un rango de caracteres a propósito: escribir el
    // rango obliga a poner acentos sueltos literales en el código, que
    // son invisibles en el editor y cualquiera los borra sin darse
    // cuenta al tocar esta línea. Así se lee y se mantiene.
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Elige entre singular y plural según la cantidad.
 *
 * @param {number} cantidad
 * @param {string} singular - 'invitado'
 * @param {string} plural - 'invitados'
 * @returns {string} '3 invitados'
 */
function pluralizar(cantidad, singular, plural) {
  const n = Number(cantidad) || 0;
  return n + ' ' + (n === 1 ? singular : plural);
}


/* ─── 5B. TELÉFONOS PARA WHATSAPP ──────────────────────────────────── */

/*
   WhatsApp abre un chat con wa.me/NUMERO, y ese número tiene que ser
   SOLO DÍGITOS Y CON CLAVE DE PAÍS. Un "722 123 4567" guardado como lo
   dicta la costumbre —sin el 52— no falla con un error: abre un chat
   vacío, o peor, el de otra persona en otro país. Por eso conviene
   avisar antes de tocar el botón y no después.
*/

/** Clave de país que se asume cuando el número no la trae. México. */
const CLAVE_DE_PAIS = '52';

/**
 * Deja un teléfono como lo quiere wa.me.
 *
 * @param {string} telefono - Como lo escribió quien lo cargó.
 * @returns {string} Solo dígitos, o '' si no sirve.
 */
function paraWhatsApp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  if (!digitos) return '';

  /* Diez dígitos es un número mexicano al que le falta la clave: se la
     pone. Once o más ya la trae (o es de otro país) y se deja como está,
     porque adivinar de más rompe los números extranjeros. */
  if (digitos.length === 10) return CLAVE_DE_PAIS + digitos;
  if (digitos.length >= 11) return digitos;

  // Menos de diez es un número incompleto, un interno o un error.
  return '';
}

/**
 * Dice si un teléfono sirve para abrir WhatsApp.
 *
 * @param {string} telefono
 * @returns {boolean}
 */
function sirveParaWhatsApp(telefono) {
  return paraWhatsApp(telefono) !== '';
}


/* ─── 6. MEMORIA DEL NAVEGADOR ─────────────────────────────────────── */

/**
 * Guarda algo que sobreviva a cerrar la app.
 *
 * El try/catch es necesario de verdad: en modo privado de Safari,
 * localStorage existe pero lanza error al escribir. Sin el catch, la app
 * se rompería entera al intentar guardar la sesión.
 *
 * @param {string} clave
 * @param {*} valor
 * @returns {boolean} Si se pudo guardar.
 */
function recordar(clave, valor) {
  try {
    localStorage.setItem('ania-admin:' + clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Lee algo guardado con recordar().
 *
 * @param {string} clave
 * @param {*} [respaldo=null]
 * @returns {*}
 */
function recordado(clave, respaldo) {
  try {
    const crudo = localStorage.getItem('ania-admin:' + clave);
    return crudo === null ? (respaldo === undefined ? null : respaldo) : JSON.parse(crudo);
  } catch (error) {
    return respaldo === undefined ? null : respaldo;
  }
}

/**
 * Olvida algo guardado.
 *
 * @param {string} clave
 * @returns {void}
 */
function olvidar(clave) {
  try {
    localStorage.removeItem('ania-admin:' + clave);
  } catch (error) {
    // Si no se pudo borrar, no hay nada mejor que hacer.
  }
}
