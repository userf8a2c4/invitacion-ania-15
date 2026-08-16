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
     5. Medición compartida del relicario
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
/* La consulta de accesibilidad se crea UNA sola vez y se reusa. Antes se
   creaba un matchMedia nuevo en cada llamada, y como esta función la
   consultan seis módulos de animación en CADA cuadro, eran unas 360
   consultas por segundo para preguntar algo que casi nunca cambia. */
const _consultaDeMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

function prefiereMenosMovimiento() {
  // 1. Accesibilidad del sistema operativo.
  if (_consultaDeMenosMovimiento.matches) return true;
  // 2. La clase que pone el script del <head> del index.html, que ya
  //    resolvió TODO: la elección manual del botón (guardada en memoria) o,
  //    si no hubo elección, la auto-detección de equipos lentos. Leer la
  //    clase mantiene una sola fuente de verdad para toda la web.
  return document.documentElement.classList.contains('animaciones-off');
}


/* ─── ¿VALE LA PENA DIBUJAR AHORA MISMO? ──────────────────────────────
   EL ERROR QUE ESTO CORRIGE, QUE ERA EL MÁS CARO DE TODOS

   El sobre de entrada (#sobre-de-apertura) es una capa `position: fixed`
   con `inset: 0`, fondo opaco y z-index 2000: TAPA LA PANTALLA ENTERA.
   Y sin embargo, seis bucles de animación arrancaban durante la carga y
   se ponían a pintar debajo de él: la luz de las velas, los pétalos en
   sus tres planos, la física de esos pétalos, el balanceo de las joyas y
   los haces de luz.

   Es decir: la computadora pintaba a 60 cuadros por segundo una escena
   que nadie podía ver, mientras el invitado todavía miraba el sobre. Eso
   explicaba a la vez el tiempo de bloqueo al cargar, el consumo de
   batería en el celular, y esa sensación de pesadez que no terminaba de
   irse por más que se optimizara lo de adentro: el navegador arrancaba
   ya saturado haciendo trabajo inútil.

   La solución no es dibujar más rápido: es NO DIBUJAR. Esta función es
   la única fuente de verdad de "¿hay alguien mirando?", y la consultan
   los cinco bucles de animación al principio de cada cuadro.

   OJO: los bucles NO se apagan, siguen vivos re-agendándose. Es a
   propósito. Apagarlos y volver a encenderlos con banderas es justo el
   tipo de máquina de estados que ya rompió las enredaderas antes: si una
   sola vía de reencendido falla, la escena queda muerta para siempre.
   Un rAF que despierta, mira y se vuelve a dormir cuesta prácticamente
   nada y no se puede romper.
   ---------------------------------------------------------------- */

/** Se enciende cuando el sobre se abre y la invitación queda a la vista. */
let _laInvitacionSeVe = false;
document.addEventListener('invitacion-visible', () => { _laInvitacionSeVe = true; }, { once: true });

/**
 * ¿Hay que dibujar este cuadro?
 *
 * @returns {boolean} false si el sobre todavía tapa todo, si la pestaña
 *          está de fondo, o si se pidió menos movimiento.
 *
 * @example
 *   if (!hayAlgoQueMirar()) { requestAnimationFrame(dibujarCuadro); return; }
 */
function hayAlgoQueMirar() {
  return _laInvitacionSeVe && !document.hidden && !prefiereMenosMovimiento();
}

/* ─── POSICIÓN DEL SCROLL, SIN PREGUNTARLE AL NAVEGADOR ───────────────
   POR QUÉ EXISTE ESTO (lo confirmó un perfil de rendimiento real)
   Leer `window.scrollY` parece gratis, pero no lo es: si hay estilos
   pendientes de recalcular —y dentro de un bucle de animación SIEMPRE los
   hay, porque los módulos acaban de escribir transforms y opacidades— el
   navegador se ve obligado a recalcular todo ANTES de poder contestar. Es
   lo que se llama "forced reflow", y Chrome lo marca como problema.

   En un perfil del proyecto, esa única lectura dentro del bucle de las
   joyas colgantes se comía el 37,5 % del tiempo total: la línea
   "Recalculate style" del perfil colgaba enteramente de ahí. El primer
   módulo que leía pagaba la cuenta completa (350 ms) y los demás, ya
   recalculado, casi nada.

   La solución es no preguntar: el valor se guarda cuando ocurre el evento
   `scroll` —ahí leerlo es barato, porque el navegador ya resolvió el
   layout para ese desplazamiento— y los bucles usan esa copia. Pasa de
   ser una consulta al navegador a ser una simple variable.
   ---------------------------------------------------------------- */

let _scrollGuardadoX = window.scrollX;
let _scrollGuardadoY = window.scrollY;

window.addEventListener('scroll', () => {
  _scrollGuardadoX = window.scrollX;
  _scrollGuardadoY = window.scrollY;
}, { passive: true });

/* Al redimensionar o al cargar, el scroll puede cambiar sin evento propio. */
window.addEventListener('resize', () => {
  _scrollGuardadoX = window.scrollX;
  _scrollGuardadoY = window.scrollY;
}, { passive: true });
window.addEventListener('load', () => {
  _scrollGuardadoX = window.scrollX;
  _scrollGuardadoY = window.scrollY;
});

/**
 * Cuánto se bajó la página, SIN forzar al navegador a recalcular nada.
 * Usar esto —y no window.scrollY— dentro de cualquier bucle de animación.
 *
 * ⚠️ Devuelve un NÚMERO, no un objeto {x, y}. La primera versión devolvía un
 * objeto y, al llamarse varias veces por cuadro desde cuatro módulos, creaba
 * miles de objetos por segundo que después había que recolectar: en un perfil
 * real, la recolección de basura se llevaba un 6 % del tiempo. Devolver un
 * número no genera basura.
 *
 * @returns {number} Cuántos píxeles se bajó.
 *
 * @example
 *   const y = scrollActualY();   // en vez de window.scrollY
 */
function scrollActualY() {
  return _scrollGuardadoY;
}

/**
 * Lo mismo para el desplazamiento horizontal.
 * @returns {number}
 */
function scrollActualX() {
  return _scrollGuardadoX;
}

/**
 * LOS TRES NIVELES DE CALIDAD GRÁFICA.
 *
 * Esto es un eje DISTINTO del de prefiereMenosMovimiento(): ese es el
 * interruptor maestro (todo o nada, para accesibilidad o para apagar
 * el movimiento a mano). Este es un regulador de INTENSIDAD: con las
 * animaciones ENCENDIDAS, cuánto efecto se permite mostrar a la vez.
 *
 *   ALTA  (0) — el potencial gráfico completo: todos los pétalos, todos
 *               los haces, todas las motas, cursor propio, parallax.
 *   MEDIA (1) — misma variedad de efectos, con menos cantidad y cadencias
 *               algo más lentas: se ve casi igual de vivo, cuesta menos.
 *   BAJA  (2) — la escena queda igual de OPULENTA (candelabros, cirios,
 *               joyas, marco) pero se apaga lo puramente decorativo-
 *               animado (motas, cursor propio, parallax) y lo que queda
 *               se recalcula con algoritmos más espaciados en el tiempo,
 *               no con menos detalle visual por cuadro.
 *
 * @example
 *   CALIDAD_GRAFICA.BAJA   // → 2
 */
const CALIDAD_GRAFICA = { ALTA: 0, MEDIA: 1, BAJA: 2 };

/**
 * En qué nivel de calidad gráfica está la web AHORA MISMO.
 *
 * La verdad vive en las clases del <html> ("calidad-media", "calidad-baja";
 * ninguna de las dos = alta), que pone codigo/21-monitor-de-rendimiento.js
 * —al principio con una estimación del equipo, después ajustando en vivo
 * según cómo va rindiendo de verdad—. Leerla de acá le da a todos los
 * módulos una única fuente de verdad, igual que con prefiereMenosMovimiento.
 *
 * @returns {number} CALIDAD_GRAFICA.ALTA, .MEDIA o .BAJA.
 *
 * @example
 *   if (nivelDeCalidad() >= CALIDAD_GRAFICA.BAJA) return;   // no crear esto
 */
function nivelDeCalidad() {
  const clases = document.documentElement.classList;
  if (clases.contains('calidad-baja')) return CALIDAD_GRAFICA.BAJA;
  if (clases.contains('calidad-media')) return CALIDAD_GRAFICA.MEDIA;
  return CALIDAD_GRAFICA.ALTA;
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
 * CEDER EL HILO: le devuelve el control al navegador para que pinte.
 *
 * Con la pestaña visible se usa requestAnimationFrame (queda sincronizado
 * con el dibujo). Con la pestaña oculta rAF NO CORRE —el navegador no dibuja
 * lo que nadie mira—, así que ahí se usa un temporizador o la construcción
 * quedaría colgada para siempre.
 *
 * @param {Function} seguir - Qué hacer cuando el navegador nos devuelva el turno.
 * @returns {void}
 */
function cederElHilo(seguir) {
  if (document.hidden) { setTimeout(seguir, 0); return; }

  /* scheduler.yield() es la forma moderna de decir "tomá el control, pero
     devolvémelo apenas puedas". La diferencia con setTimeout no es menor:
     setTimeout manda la continuación AL FINAL de la cola, detrás de
     cualquier otra cosa que haya llegado mientras tanto, así que las
     construcciones troceadas terminaban más tarde de lo necesario.
     scheduler.yield la devuelve con prioridad de continuación: se cede el
     paso al navegador para que pinte, pero se retoma enseguida.

     Todavía no está en todos los navegadores (Chrome 129+), por eso el
     respaldo de siempre. Es puramente aditivo: donde no existe, el
     comportamiento es exactamente el de antes. */
  if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
    scheduler.yield().then(seguir);
    return;
  }
  requestAnimationFrame(seguir);
}

/**
 * TRABAJAR POR TANDAS: recorre una lista larga sin congelar la página.
 *
 * EL PROBLEMA QUE RESUELVE, Y POR QUÉ NO ALCANZA CON "DE A N POR VUELTA"
 * Construir 350 flores de una sola vez congela la web durante segundos. La
 * solución obvia es cortar en tandas de tamaño fijo ("de a dos plantas"),
 * y eso es lo que se hacía antes acá. Pero tiene una falla: dos plantas
 * tardan cosas MUY distintas en una computadora rápida y en una lenta. El
 * número fijo se elige mirando UNA máquina y no garantiza nada en las demás.
 *
 * Acá el corte lo decide el RELOJ, no la cantidad: se hacen todos los
 * elementos que entren en el presupuesto de milisegundos, y se corta ahí.
 * En un equipo rápido entran quince; en uno lento, uno. En los dos casos la
 * página sigue respondiendo, que es lo que de verdad importa.
 *
 * POR QUÉ 8 MILISEGUNDOS
 * El navegador tiene ~16 ms para armar cada cuadro (60 cuadros por segundo).
 * Ocupando la mitad, queda margen de sobra para que dibuje. Además, las
 * mediciones de rendimiento (PageSpeed) penalizan toda tarea que pase de
 * 50 ms, así que 8 deja un colchón enorme incluso si un elemento se pasa.
 *
 * @param {number} cuantos - Cuántos elementos hay que procesar en total.
 * @param {Function} hacerUno - Recibe el índice y procesa ESE elemento.
 * @param {Function} [alTerminar] - Se llama una vez, al final de todo.
 * @param {number} [presupuestoMs=8] - Cuánto puede durar una tanda.
 * @returns {void}
 *
 * @example
 *   trabajarPorTandas(plantas.length, i => crearPlanta(plantas[i]), medirTodo);
 */
function trabajarPorTandas(cuantos, hacerUno, alTerminar, presupuestoMs = 8) {
  let indice = 0;

  /* ⚠️ CON LA PESTAÑA OCULTA SE TROCEA IGUAL, PERO CON OTRO RELOJ.
     Antes esto hacía TODO de corrido, sin ningún límite, razonando que si
     nadie mira la pestaña no hay ningún cuadro que proteger. El caso real
     que lo motivó: alguien abre la invitación con "abrir en pestaña nueva"
     y la deja de fondo — ahí requestAnimationFrame casi no corre (el
     navegador lo castiga fuerte en pestañas ocultas: un temporizador por
     segundo, y a los pocos minutos uno por minuto), así que con troceado
     normal las enredaderas tardaban minutos en aparecer.

     El problema: Lighthouse (y por lo tanto PageSpeed / la auditoría de
     velocidad) audita la página con document.hidden en true — es un
     comportamiento conocido de Chrome headless, la pestaña nunca está
     "activa" de verdad. Con el "todo de corrido" de antes, la auditoría
     veía TODA la construcción —24 plantas, 8 candelabros— como una sola
     tarea sincrónica de más de un segundo: exactamente lo que Total
     Blocking Time castiga, y la razón medida de que el sitio no pasara
     de 65-80 en el puntaje de velocidad.

     La solución: seguir troceando, pero con setTimeout (que sí corre en
     pestañas de fondo, a diferencia de requestAnimationFrame) y con un
     presupuesto generoso pero acotado —40ms, apenas debajo del umbral de
     50ms que define una "tarea larga"—. Una pestaña de fondo real sigue
     terminando en una fracción de segundo (lejos de los "minutos" de
     antes), y la auditoría deja de ver ninguna tarea que la penalice. */
  if (document.hidden) {
    const presupuestoOculto = 40;   // bajo el umbral de "tarea larga" (50ms)

    function unaTandaOculta() {
      const arranque = performance.now();
      do {
        hacerUno(indice++);
      } while (indice < cuantos && performance.now() - arranque < presupuestoOculto);

      if (indice < cuantos) {
        setTimeout(unaTandaOculta, 0);
        return;
      }
      if (typeof alTerminar === 'function') alTerminar();
    }
    unaTandaOculta();
    return;
  }

  function unaTanda() {
    const arranque = performance.now();

    /* Se hace SIEMPRE al menos uno. Si un solo elemento ya se pasa del
       presupuesto no se puede partir por la mitad, pero sin esta garantía
       en un equipo muy lento no avanzaría nunca. */
    do {
      hacerUno(indice++);
    } while (indice < cuantos && performance.now() - arranque < presupuestoMs);

    if (indice < cuantos) {
      cederElHilo(unaTanda);
      return;
    }
    if (typeof alTerminar === 'function') alTerminar();
  }

  if (cuantos > 0) unaTanda();
  else if (typeof alTerminar === 'function') alTerminar();
}

/* ─── 5. MEDICIÓN COMPARTIDA DEL RELICARIO ─────────────────────────── */

/**
 * QUÉ PROBLEMA RESUELVE ESTO
 * Los pétalos (06) y las joyas colgantes (17) necesitan saber, en CADA
 * cuadro de animación, dónde está el relicario en la pantalla. Antes cada
 * uno lo medía por su cuenta con getBoundingClientRect() —sobre el SVG
 * más grande y complejo de toda la página— 60 veces por segundo, cada uno
 * por separado. Preguntar la posición de un elemento puede obligar al
 * navegador a recalcular el layout: hacerlo así, DOS veces por cuadro,
 * para siempre, es un costo real que un contador de fps no siempre deja
 * ver (mide cuándo se dispara el cuadro, no cuánto tarda por dentro el
 * recálculo).
 *
 * LA SOLUCIÓN (el mismo criterio que ya usa 07-marco-y-enredaderas.js
 * para sus propias flores): el relicario se mide UNA sola vez —al cargar
 * y cada vez que cambia el tamaño de la ventana—, y se guarda su posición
 * ABSOLUTA en el documento. Después, en cada cuadro, la posición actual en
 * pantalla sale de una resta con el scroll (aritmética pura, sin tocar el
 * DOM): no puede desincronizarse, porque el scroll es el único motivo por
 * el que la posición en pantalla cambia sin que cambie el tamaño de nada.
 */

let _cacheDelRelicario = null;

/**
 * Mide el relicario de verdad (la única vez que se toca el DOM) y guarda
 * su posición absoluta. Se llama al cargar y en cada resize.
 * @returns {void}
 */
function actualizarMedidaDelRelicario() {
  const relicario = document.querySelector('.portada__marco');
  if (!relicario) { _cacheDelRelicario = null; return; }
  const caja = relicario.getBoundingClientRect();
  _cacheDelRelicario = {
    izquierdaEnDocumento: caja.left + window.scrollX,
    arribaEnDocumento:    caja.top  + window.scrollY,
    ancho: caja.width,
    alto:  caja.height,
  };
}

/**
 * Dónde está el relicario AHORA MISMO en pantalla, sin leer el DOM.
 *
 * @returns {{left:number, top:number, width:number, height:number}|null}
 *          null si el relicario no existe en esta página.
 *
 * @example
 *   const caja = medidaDelRelicario();
 *   if (caja) { const centroX = caja.left + caja.width / 2; }
 */
/* El objeto que devuelve medidaDelRelicario() se REUSA en cada llamada en vez
   de crear uno nuevo. Como se la llama dos veces por cuadro (pétalos y joyas),
   crear un objeto cada vez generaba basura constante —la recolección se
   llevaba un 6 % del tiempo en el perfil—. Quien la use debe leer los campos
   en el momento, no guardarse la referencia para después. */
const _medidaReusable = { left: 0, top: 0, width: 0, height: 0 };

function medidaDelRelicario() {
  if (!_cacheDelRelicario) return null;
  /* ⚠️ Acá NO se lee window.scrollX/scrollY. Un perfil de rendimiento mostró
     que esa lectura —hecha en cada cuadro por las joyas colgantes y los
     pétalos— forzaba al navegador a recalcular estilos y se llevaba el
     37,5 % del tiempo total. Con el scroll guardado esto queda en dos restas. */
  _medidaReusable.left   = _cacheDelRelicario.izquierdaEnDocumento - scrollActualX();
  _medidaReusable.top    = _cacheDelRelicario.arribaEnDocumento    - scrollActualY();
  _medidaReusable.width  = _cacheDelRelicario.ancho;
  _medidaReusable.height = _cacheDelRelicario.alto;
  return _medidaReusable;
}

actualizarMedidaDelRelicario();
window.addEventListener('load', actualizarMedidaDelRelicario);
// rebotar(): al terminar de arrastrar la ventana, no en cada píxel del camino.
window.addEventListener('resize', rebotar(actualizarMedidaDelRelicario, 200));

/* El sobre de entrada puede terminar de abrirse (y de correr el resto del
   contenido) después de que esta medición inicial ya se hizo. Sin este
   disparador, 17-joyas-colgantes.js quedaba calculando el balanceo sobre
   una posición vieja —y con muy poco margen visible sin el mouse cerca,
   se leía como si las joyas no se movieran—. Mismo criterio que ya usa
   07-marco-y-enredaderas.js para sus propias flores (medirLasFlores) ante
   el mismo evento. */
document.addEventListener('invitacion-visible', () => setTimeout(actualizarMedidaDelRelicario, 400));


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
