/* ══════════════════════════════════════════════════════════════════════
   02 · UTILIDADES
   ══════════════════════════════════════════════════════════════════════

   QUÉ ES ESTE ARCHIVO
   Una caja de herramientas con funciones cortitas que se usan por todos
   lados. Tenerlas acá evita escribir lo mismo diez veces (y que en la
   décima nos equivoquemos).

   No hace falta que entiendas todas para editar la invitación: pensalas
   como los tornillos del mueble.

   ÍNDICE
     1. Buscar elementos en la página
     2. Números y azar
     3. Memoria del navegador (recordar cosas)
     4. Accesibilidad y ayudas varias
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. BUSCAR ELEMENTOS EN LA PÁGINA ─────────────────────────────── */

/**
 * Busca UN elemento del HTML y lo devuelve.
 *
 * @param {string} selector - Cómo encontrarlo. Con # se busca por id y
 *                            con . se busca por clase.
 * @returns {Element|null} El elemento, o null si no existe.
 *
 * @example
 *   const titulo = buscar('#portada');        // el que tiene id="portada"
 *   const caja   = buscar('.caja-mensaje');   // el primero con esa clase
 */
function buscar(selector) {
  return document.querySelector(selector);
}

/**
 * Busca TODOS los elementos que coincidan y los devuelve como una lista
 * normal (para poder recorrerla con forEach sin sorpresas).
 *
 * @param {string} selector - Igual que en buscar().
 * @returns {Element[]} Lista de elementos (vacía si no hay ninguno).
 *
 * @example
 *   buscarTodos('.revelar').forEach(elemento => console.log(elemento));
 */
function buscarTodos(selector) {
  return Array.from(document.querySelectorAll(selector));
}


/* ─── 2. NÚMEROS Y AZAR ────────────────────────────────────────────── */

/**
 * Obliga a un número a quedarse dentro de un rango.
 * Si se pasa por arriba devuelve el máximo, y si se pasa por abajo, el
 * mínimo. Es la red de seguridad de todos los cálculos de física.
 *
 * @param {number} valor  - El número a controlar.
 * @param {number} minimo - Lo más chico permitido.
 * @param {number} maximo - Lo más grande permitido.
 * @returns {number} El número ya acotado.
 *
 * @example
 *   limitar(150, 0, 100)  // → 100  (se pasaba del máximo)
 *   limitar(-8,  0, 100)  // → 0    (se pasaba del mínimo)
 *   limitar(42,  0, 100)  // → 42   (estaba bien, se devuelve igual)
 */
function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * Devuelve un número al azar con decimales entre dos valores.
 *
 * @param {number} minimo - Valor mínimo (incluido).
 * @param {number} maximo - Valor máximo (no incluido).
 * @returns {number} Un número al azar.
 *
 * @example
 *   numeroAlAzar(1, 3)  // → 1.847…  (cada vez uno distinto)
 */
function numeroAlAzar(minimo, maximo) {
  return minimo + Math.random() * (maximo - minimo);
}

/**
 * Elige un elemento al azar de una lista.
 *
 * @param {Array} lista - La lista de donde elegir.
 * @returns {*} Uno de sus elementos.
 *
 * @example
 *   elegirAlAzar(['rojo', 'verde', 'azul'])  // → 'verde'
 */
function elegirAlAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Crea un generador de números al azar CON SEMILLA.
 *
 * ¿PARA QUÉ SIRVE ESTO?
 * Math.random() da un número distinto cada vez, incluso al recargar la
 * página. Eso sirve para los pétalos que caen, pero NO para las plantas
 * de las enredaderas: queremos que cada planta sea distinta de las otras,
 * pero que se dibuje siempre igual, para que la web no "cambie de cara"
 * cada vez que alguien la abre.
 *
 * La solución es un azar con semilla: se le da un número de partida (la
 * semilla) y a partir de ahí produce una secuencia que PARECE azarosa
 * pero es siempre la misma. Semilla 1 → una planta; semilla 2 → otra
 * planta distinta; pero la semilla 1 siempre da exactamente la misma.
 *
 * @param {number} semilla - El número de partida (por ejemplo, el índice
 *                           de la planta).
 * @returns {Object} Un objeto con varias formas de pedir azar.
 *
 * @example
 *   const azar = crearAzarConSemilla(7);
 *   azar.numero();            // → 0.847…  (siempre el mismo para la semilla 7)
 *   azar.entre(10, 20);       // → 18.47…
 *   azar.entero(1, 6);        // → 5       (como tirar un dado)
 *   azar.signo();             // → -1 o 1
 *   azar.probabilidad(0.3);   // → true el 30 % de las veces
 */
function crearAzarConSemilla(semilla) {
  // Este algoritmo se llama "mulberry32". Es corto, rápido y reparte
  // bien los números. Las operaciones raras (>>> , ^ , Math.imul) son
  // manipulaciones de bits: revuelven el número para que el siguiente
  // no se parezca en nada al anterior.
  let estado = semilla >>> 0;

  function siguienteNumero() {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let mezcla = estado;
    mezcla = Math.imul(mezcla ^ (mezcla >>> 15), mezcla | 1);
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61);
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;
  }

  return {
    /** Un número entre 0 y 1. */
    numero: siguienteNumero,

    /** Un número con decimales entre dos valores. */
    entre(minimo, maximo) {
      return minimo + siguienteNumero() * (maximo - minimo);
    },

    /** Un número entero entre dos valores, ambos incluidos. */
    entero(minimo, maximo) {
      return Math.floor(minimo + siguienteNumero() * (maximo - minimo + 1));
    },

    /** -1 o 1, para decidir hacia qué lado va algo. */
    signo() {
      return siguienteNumero() < 0.5 ? -1 : 1;
    },

    /**
     * true con la probabilidad indicada.
     * @param {number} probabilidad - De 0 (nunca) a 1 (siempre).
     */
    probabilidad(probabilidad) {
      return siguienteNumero() < probabilidad;
    },
  };
}


/* ─── 3. MEMORIA DEL NAVEGADOR ─────────────────────────────────────────
   El navegador puede guardar datos chiquitos que sobreviven aunque se
   cierre la pestaña (se llama "localStorage"). Lo usamos para recordar
   el volumen elegido y la confirmación ya enviada.

   Va todo envuelto en try/catch porque en algunas situaciones (modo
   incógnito, o abrir el archivo directamente desde el disco con ciertas
   configuraciones) el navegador prohíbe guardar y lanza un error. Si eso
   pasa, preferimos que la web siga andando sin memoria antes que se
   rompa por completo.
   ---------------------------------------------------------------------- */

/**
 * Guarda un dato para recordarlo la próxima visita.
 *
 * @param {string} clave - Nombre con el que se guarda.
 * @param {*} valor      - Lo que se quiere guardar (texto, número, objeto…).
 * @returns {boolean} true si se pudo guardar, false si el navegador no dejó.
 *
 * @example
 *   guardarEnMemoria('volumen', 0.5);
 *   guardarEnMemoria('pase', { nombre: 'Ana', codigo: 'XV-1A2B' });
 */
function guardarEnMemoria(clave, valor) {
  try {
    localStorage.setItem('invitacion-ania:' + clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn('No se pudo guardar en la memoria del navegador:', error);
    return false;
  }
}

/**
 * Recupera un dato guardado antes con guardarEnMemoria().
 *
 * @param {string} clave         - El mismo nombre que se usó al guardar.
 * @param {*} [valorPorDefecto=null] - Qué devolver si no hay nada guardado.
 * @returns {*} El dato guardado, o el valor por defecto.
 *
 * @example
 *   const volumen = leerDeMemoria('volumen', 0.7);  // 0.7 si nunca se guardó
 */
function leerDeMemoria(clave, valorPorDefecto = null) {
  try {
    const guardado = localStorage.getItem('invitacion-ania:' + clave);
    return guardado === null ? valorPorDefecto : JSON.parse(guardado);
  } catch (error) {
    console.warn('No se pudo leer la memoria del navegador:', error);
    return valorPorDefecto;
  }
}

/**
 * Borra un dato guardado.
 *
 * @param {string} clave - El nombre del dato a borrar.
 *
 * @example
 *   borrarDeMemoria('pase');   // se olvida la confirmación
 */
function borrarDeMemoria(clave) {
  try {
    localStorage.removeItem('invitacion-ania:' + clave);
  } catch (error) {
    console.warn('No se pudo borrar de la memoria del navegador:', error);
  }
}


/* ─── 4. ACCESIBILIDAD Y AYUDAS VARIAS ─────────────────────────────── */

/**
 * Dice si hay que moverse lo menos posible. Es true en DOS casos:
 *
 *   1. La persona pidió en su SISTEMA OPERATIVO reducir las animaciones
 *      (una opción de accesibilidad para quienes se marean o sufren
 *      migrañas con el movimiento).
 *   2. La persona APAGÓ las animaciones con el botón de la invitación
 *      (guardado en la memoria del navegador). Es la salida para equipos
 *      sin placa de video, donde tanto movimiento pesa demasiado.
 *
 * Como TODOS los módulos de animación consultan esta función antes de
 * arrancar, con que devuelva true alcanza para que la web quede quieta y
 * liviana. El botón (codigo/20-boton-de-animaciones.js) guarda la elección
 * y recarga, así los módulos vuelven a leer este valor.
 *
 * @returns {boolean} true si hay que moverse lo menos posible.
 *
 * @example
 *   if (prefiereMenosMovimiento()) return;   // no animamos nada
 */
function prefiereMenosMovimiento() {
  // 1. Accesibilidad del sistema operativo.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  // 2. La clase que pone el script del <head> del index.html, que ya
  //    resolvió TODO: la elección manual del botón (guardada en memoria) o,
  //    si no hubo elección, la auto-detección de equipos lentos. Leer la
  //    clase mantiene una sola fuente de verdad para toda la web.
  return document.documentElement.classList.contains('animaciones-off');
}

/**
 * Dice si el dispositivo tiene un puntero preciso, o sea un mouse.
 * En celulares y tablets devuelve false, porque ahí se usa el dedo.
 *
 * @returns {boolean} true si hay mouse.
 *
 * @example
 *   if (tieneMouse()) activarCursorPropio();
 */
function tieneMouse() {
  return window.matchMedia('(pointer: fine)').matches;
}

/**
 * Espera una cantidad de milisegundos. Sirve para encadenar animaciones.
 * (1000 milisegundos = 1 segundo)
 *
 * @param {number} milisegundos - Cuánto esperar.
 * @returns {Promise} Una promesa que se cumple al terminar la espera.
 *
 * @example
 *   await esperar(500);   // frena medio segundo y sigue
 */
function esperar(milisegundos) {
  return new Promise(resolve => setTimeout(resolve, milisegundos));
}

/**
 * ACELERAR (throttle): deja pasar la función como mucho una vez cada X ms,
 * por más veces que se la llame en el medio.
 *
 * PARA QUÉ SIRVE: eventos como scroll o mousemove pueden dispararse cientos
 * de veces por segundo. Si cada disparo hace trabajo pesado (mover cosas,
 * medir la página), el navegador se atraganta. Acelerar limita ese trabajo
 * a un ritmo que el ojo igual no distingue.
 *
 * Se queda con la ÚLTIMA llamada de cada ventana, así el estado final
 * siempre es el correcto (no se pierde el último movimiento).
 *
 * @param {Function} funcion - La función a acelerar.
 * @param {number} cadaCuanto - Milisegundos mínimos entre ejecuciones.
 * @returns {Function} La versión acelerada.
 *
 * @example
 *   window.addEventListener('scroll', acelerar(actualizar, 100), { passive: true });
 */
function acelerar(funcion, cadaCuanto) {
  let ultimo = 0;
  let pendiente = null;
  return function (...argumentos) {
    const ahora = Date.now();
    const faltan = cadaCuanto - (ahora - ultimo);
    if (faltan <= 0) {
      clearTimeout(pendiente);
      pendiente = null;
      ultimo = ahora;
      funcion.apply(this, argumentos);
    } else if (!pendiente) {
      // Agenda la última llamada de esta ventana, para no perder el cierre.
      pendiente = setTimeout(() => {
        ultimo = Date.now();
        pendiente = null;
        funcion.apply(this, argumentos);
      }, faltan);
    }
  };
}

/**
 * REBOTAR (debounce): espera a que dejen de llamar la función durante X ms
 * y recién entonces la ejecuta, una sola vez.
 *
 * PARA QUÉ SIRVE: cuando importa el RESULTADO FINAL y no los pasos
 * intermedios —terminar de arrastrar la ventana, dejar de tipear—. Evita
 * recalcular en cada píxel del camino.
 *
 * @param {Function} funcion - La función a rebotar.
 * @param {number} espera - Milisegundos de quietud antes de ejecutar.
 * @returns {Function} La versión rebotada.
 *
 * @example
 *   window.addEventListener('resize', rebotar(reacomodar, 200));
 */
function rebotar(funcion, espera) {
  let reloj = null;
  return function (...argumentos) {
    clearTimeout(reloj);
    reloj = setTimeout(() => funcion.apply(this, argumentos), espera);
  };
}

/**
 * Convierte un texto que puede venir del exterior (por ejemplo el nombre
 * del invitado en el enlace) en texto seguro para insertar en la página.
 *
 * POR QUÉ ES IMPORTANTE: si alguien pusiera etiquetas de HTML en el
 * nombre, se ejecutarían dentro de nuestra web. Esto las neutraliza
 * convirtiéndolas en caracteres inofensivos.
 *
 * @param {string} texto - El texto a limpiar.
 * @returns {string} El texto sin poder de HTML.
 *
 * @example
 *   limpiarTexto('<b>Ana</b>')   // → '&lt;b&gt;Ana&lt;/b&gt;'
 */
function limpiarTexto(texto) {
  const cajaTemporal = document.createElement('div');
  cajaTemporal.textContent = String(texto);
  return cajaTemporal.innerHTML;
}
