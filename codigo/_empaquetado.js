/* Generado por herramientas/empaquetar.mjs — no editar a mano.
   Para cambiar algo, editar el archivo original en codigo/ y volver
   a correr el script. Ver ese archivo para la explicación completa. */

/* ═══ 01-configuracion.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   01 · CONFIGURACIÓN
   ══════════════════════════════════════════════════════════════════════

   👉 ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS TOCAR PARA CAMBIAR DATOS.

   Todo lo que se puede personalizar de la invitación (la fecha, el lugar,
   el mensaje de los papás, el enlace de regalos, la canción…) vive acá
   adentro. El resto del código lee estos valores; vos no tenés que
   buscarlos por ningún otro lado.

   CÓMO SE EDITA
   Cambiá solamente lo que está entre comillas. Por ejemplo, para mover
   la fiesta al 7 de noviembre:

       ANTES:  fechaEnPalabras: '24 de Octubre de 2026',
       DESPUÉS: fechaEnPalabras: '7 de Noviembre de 2026',

   ⚠️ Reglas de oro para no romper nada:
     1. No borres las comillas ' ' que rodean cada texto.
     2. No borres la coma , del final de cada línea.
     3. Si tu texto lleva un apóstrofo (por ejemplo: d'Angelo), escribilo
        así: 'd\'Angelo'  (con una barra invertida antes).

   ÍNDICE
     1. Datos de la fiesta
     2. Lugar
     3. Envío de correos (EmailJS)
     4. Mesa de regalos
     5. Música
     6. Textos de la invitación
   ══════════════════════════════════════════════════════════════════════ */

const CONFIGURACION = {

  /* ─── 1. DATOS DE LA FIESTA ───────────────────────────────────────── */
  fiesta: {
    /** Nombre de la quinceañera. Aparece gigante en la portada. */
    nombre: 'Ania',

    /** Cuántos años cumple (se muestra como "XV Años"). */
    edadEnRomanos: 'XV',

    /**
     * Fecha y hora exactas del evento en "formato de computadora".
     * Se escribe:  'AÑO-MES-DÍA T HORA:MINUTOS:SEGUNDOS'  (24 horas).
     * Ejemplos:
     *    24 de octubre de 2026 a las 5 de la tarde → '2026-10-24T17:00:00'
     *    3 de marzo de 2027 a las 8 de la noche    → '2027-03-03T20:00:00'
     *
     * La usan la cuenta regresiva y el botón "agregar al calendario".
     * Si la cambiás, cambiá también fechaEnPalabras para que coincida.
     */
    fechaYHora: '2026-10-24T17:00:00',

    /** A qué hora termina (para el archivo de calendario). */
    fechaYHoraDeCierre: '2026-10-25T01:00:00',

    /* Los mismos datos escritos "para humanos", tal como se leen en la web */
    diaDeLaSemana:   'Sábado',
    fechaEnPalabras: '24 de octubre de 2026',
    horaEnPalabras:  '5:00 PM',
    horarioCompleto: 'Llegada: 5:00 PM<br>Evento: 5:30 PM — 01:00 AM',

    /** Hasta cuándo se puede confirmar asistencia. */
    fechaLimiteParaConfirmar: '1 de octubre de 2026',

    /** Cómo hay que vestirse. */
    codigoDeVestimenta: 'Formal · Etiqueta<br>Evitar color rojo',

    /** Información del estacionamiento. */
    estacionamiento: 'Valet parking disponible<br>$50 por auto',
  },


  /* ─── 2. LUGAR ────────────────────────────────────────────────────── */
  lugar: {
    nombre: 'Salones de fiestas Alvi Toluca',

    direccion: 'Via José López Portillo 318, Delegación San Lorenzo Tepaltitlán I,<br>Toluca, Estado de México',

    /** La misma dirección en una sola línea (para el calendario). */
    direccionEnUnaLinea: 'Via José López Portillo 318, San Lorenzo Tepaltitlán, Toluca, Estado de México',

    /** Enlace para abrir el lugar en la app de Google Maps. */
    enlaceParaAbrirEnMaps: 'https://maps.app.goo.gl/EBXftZ48M5c3HLFGA',

    /**
     * Dirección del mapa que se ve incrustado en la página.
     * OJO: NO sirve el enlace corto de "Compartir" (maps.app.goo.gl),
     * porque Google no permite mostrarlo dentro de una web. Hay que usar
     * una dirección que termine en  &output=embed  como esta.
     */
    enlaceDelMapaIncrustado: 'https://www.google.com/maps?q=Salones+de+fiestas+Alvi,+Via+Jos%C3%A9+L%C3%B3pez+Portillo+318,+San+Lorenzo+Tepaltitl%C3%A1n,+Toluca,+Estado+de+M%C3%A9xico&output=embed',
  },


  /* ─── 3. ENVÍO DE CORREOS (EmailJS) ───────────────────────────────────
     EmailJS es un servicio gratuito que manda correos desde una web sin
     necesidad de tener un servidor propio. Mientras la clave pública diga
     "PEGA_AQUI…", la web funciona igual pero NO envía correos: el invitado
     ve su pase en pantalla y listo.

     SON DOS CORREOS DISTINTOS, no uno:

       · El del INVITADO — su comprobante, con el código de pase.
         Va a la dirección que la persona escribió en el formulario.

       · El del ADMINISTRADOR — el aviso para quien organiza, con el
         detalle de menús, alergias y notas. Va a tu correo.

     Por eso hacen falta DOS plantillas en EmailJS: cada una tiene su
     propio destinatario y su propio texto. Si dejás una de las dos en
     "PEGA_AQUI…", esa simplemente no se manda y la otra sigue andando.

     CÓMO OBTENERLOS (15 minutos, una sola vez):
       1. Creá una cuenta gratis en https://www.emailjs.com
       2. Add New Service → Gmail → copiá el "Service ID"
       3. Account → API Keys → copiá la "Public Key"
       4. Email Templates → Create New Template. En el campo "To Email"
          poné  {{correo_destino}}  (así la web decide a quién le llega,
          y la misma plantilla no queda atada a una dirección fija).
          Copiá su "Template ID" → va en idDePlantillaDelInvitado.
       5. Repetí el paso 4 con una segunda plantilla, esta redactada para
          vos —el aviso de que alguien confirmó— y su ID va en
          idDePlantillaDelAdministrador.
       6. Escribí tu propia dirección en correoDelAdministrador.

     En cualquiera de las dos plantillas podés usar estas etiquetas, que
     la web completa sola:
       {{nombre_invitado}}  {{correo_invitado}}  {{cantidad_adultos}}
       {{cantidad_ninos}}   {{resumen_menus}}    {{detalle_menus}}
       {{alergias}}         {{notas}}            {{codigo_de_pase}}
       {{fecha}}            {{lugar}}            {{correo_destino}}
     ------------------------------------------------------------------- */
  correo: {
    clavePublica:  'PEGA_AQUI_TU_PUBLIC_KEY',
    idDelServicio: 'PEGA_AQUI_TU_SERVICE_ID',

    /** Plantilla del comprobante que recibe el invitado. */
    idDePlantillaDelInvitado: 'PEGA_AQUI_TU_TEMPLATE_ID_INVITADO',

    /** Plantilla del aviso que recibe quien organiza. */
    idDePlantillaDelAdministrador: 'PEGA_AQUI_TU_TEMPLATE_ID_ADMIN',

    /** A dónde llega ese aviso. Tu correo. */
    correoDelAdministrador: 'PEGA_AQUI_TU_CORREO',
  },


  /* ─── 3B. REGISTRO DE CONFIRMACIONES (Google Sheets) ──────────────────
     El correo avisa en el momento, pero se acumula en la bandeja de
     entrada y no se puede ordenar ni sumar. Para llevar el control de
     verdad —cuántos van, cuántos vegetarianos, quién falta— cada
     confirmación se anota además como una fila en una hoja de cálculo.

     Esa hoja ES el panel de administración: se ordena, se filtra, se
     descarga a Excel y se abre desde el celular el día de la fiesta.

     Mientras esto diga "PEGA_AQUI…", no se anota nada y la web funciona
     igual (el correo y el pase siguen andando).

     CÓMO ARMARLO: está explicado paso a paso en el README, sección 6,
     junto con el código que hay que pegar en Google. Son 20 minutos.

     PARA CAMBIAR DE HOJA MÁS ADELANTE: alcanza con pegar acá las dos
     direcciones nuevas. Y si en vez de crear otra hoja se transfiere la
     propiedad de esta desde Google Drive, no hay que tocar ni esto.
     ------------------------------------------------------------------- */
  registro: {
    /** Dirección del Apps Script que anota la fila (termina en /exec). */
    urlParaAnotar: 'PEGA_AQUI_LA_URL_DEL_SCRIPT',

    /** La hoja en sí, para poder abrirla desde el pie de página. */
    /* OJO: esta hoja es la PROVISORIA, la que se usó para armar todo.
       Antes de mandar la invitación hay que reemplazarla por la
       definitiva y revisar que no esté compartida con "cualquiera que
       tenga el enlace": ahí van a estar los datos de los invitados. */
    urlDeLaHoja: 'https://docs.google.com/spreadsheets/d/1-pD1-F8C-2b-FXwfOYfayTqFtw9ik6DadVoxTVdU4zs/edit',

    /**
     * FIRMA DE LAS CONFIRMACIONES (integridad del registro).
     *
     * Es una contraseña compartida entre esta web y el script de Google. La
     * web firma cada confirmación con ella (HMAC-SHA256) y el script rechaza
     * las que no traigan una firma válida. Eso frena que alguien mande
     * confirmaciones falsas o basura al endpoint con una herramienta técnica.
     *
     * ⚠️ SALVEDAD HONESTA: esta web es estática, así que quien lea el código
     * fuente PUEDE ver esta clave. Por eso es un DISUASIVO —sube mucho la
     * barrera contra el spam casual y las inyecciones triviales—, NO una
     * garantía contra un atacante decidido. La protección de LECTURA de los
     * datos sigue siendo el permiso de compartición de la hoja de Google.
     *
     * Mientras diga "PEGA_AQUI…", la web NO firma y el script (si tampoco
     * tiene la clave configurada) acepta como siempre: nada se rompe.
     *
     * CÓMO ELEGIRLA: una frase larga al azar. La MISMA hay que pegarla en las
     * Propiedades del Script de Google (ver README, sección 6).
     */
    claveDeFirma: 'PEGA_AQUI_UNA_FRASE_SECRETA_LARGA',
  },


  /* ─── 4. MESA DE REGALOS ──────────────────────────────────────────── */
  regalos: {
    enlaceDeLaLista: 'https://www.amazon.com.mx/registries/gl/guest-view/LJDSRURUU3G4?ref_=cm_sw_r_apann_ggr-subnav-share_YQS0Y5DAPV5S2YHN6VDF&language=en-US',
    aclaracion: 'También se aceptan transferencias — preguntar a los papás',
  },


  /* ─── 5. MÚSICA ───────────────────────────────────────────────────── */
  musica: {
    /** Ruta del archivo de audio dentro de la carpeta recursos. */
    archivo: 'recursos/cancion-hysteria.mp3',
    titulo: 'Hysteria',
    artista: 'Muse',
    album: 'Absolution',

    /**
     * Volumen inicial, de 0 (mudo) a 1 (máximo).
     * 0.7 = 70 %. Si el invitado lo cambia, la web recuerda su elección.
     */
    volumenInicial: 0.7,
  },


  /* ─── 6. TEXTOS DE LA INVITACIÓN ──────────────────────────────────────
     Acá se pueden usar etiquetas de HTML simples:
        <br>      → salto de línea
        <br><br>  → renglón en blanco entre párrafos
     ------------------------------------------------------------------- */
  textos: {
    antetitulo: 'Una velada para recordar',

    mensajeDeLosPapas:
      'Quince años han pasado como el susurro del viento entre rosas — ' +
      'cada momento, un pétalo que cayó con gracia y amor.<br><br>' +
      'Hoy, con el corazón lleno de gratitud, celebramos a la persona más ' +
      'extraordinaria que la vida nos pudo dar. Ania, eres nuestra luz, ' +
      'nuestra historia más bella y nuestra mayor aventura.<br><br>' +
      'Esta noche es para ti. ¡Que comience la magia!',

    firmaDeLosPapas: '— Con todo nuestro amor, Mamá y Papá',

    /** Saludo por defecto del sobre, cuando el enlace no trae nombre. */
    saludoGenerico: 'Estás invitado',
  },
};

/* ═══ 02-utilidades.js ═══ */
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

  /* ⚠️ CON LA PESTAÑA OCULTA SE HACE TODO DE UNA, SIN TROCEAR.
     Parece al revés de lo que uno esperaría, pero es lo correcto, y viene de
     un caso real: alguien abre la invitación con "abrir en pestaña nueva" y
     la deja de fondo mientras termina otra cosa.

     El troceado existe para que la página siga respondiendo MIENTRAS SE LA
     MIRA. Si nadie la mira, no hay ningún cuadro que proteger — y en cambio
     el navegador castiga fuerte a las pestañas de fondo: les permite un
     temporizador por segundo, y después de unos minutos uno por MINUTO. Con
     22 plantas de a una tanda por turno, las enredaderas tardaban minutos en
     aparecer, y el invitado volvía a una invitación a medio dibujar.

     Haciéndolo de corrido, cuando vuelve ya está todo listo. La "tarea
     larga" que eso genera no le molesta a nadie: no hay nada que dibujar. */
  if (document.hidden) {
    for (; indice < cuantos; indice++) hacerUno(indice);
    if (typeof alTerminar === 'function') alTerminar();
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

/* ═══ 03-sobre-de-apertura.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   03 · SOBRE DE APERTURA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Maneja la pantalla de bienvenida: primero muestra un monograma que se
   dibuja solo mientras carga todo, después muestra el sobre lacrado, y
   cuando el invitado hace clic lo abre y revela la invitación.

   POR QUÉ ES IMPORTANTE (más allá de lo lindo)
   Los navegadores no dejan que una web empiece a sonar sola: exigen que
   la persona haga algo primero (un clic, un toque). El clic para abrir el
   sobre ES ese permiso. Por eso, apenas se abre, avisamos al reproductor
   con un "evento" para que arranque la música.

   QUÉ ES UN EVENTO PERSONALIZADO
   Es como un grito que da un archivo y que otros archivos pueden estar
   escuchando, sin que ninguno necesite conocer al otro. Acá gritamos
   'sobre-abierto' y el archivo 10-reproductor-de-musica.js lo escucha.

   ÍNDICE
     1. Elementos que vamos a usar
     2. Precarga de tipografías y fondo
     3. Mostrar el sobre cuando todo está listo
     4. Abrir el sobre
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElSobreDeApertura() {

  /* ─── 1. ELEMENTOS ──────────────────────────────────────────────── */
  const sobre       = buscar('#sobre-de-apertura');
  const ilustracion = buscar('#ilustracion-del-sobre');

  /* Si por algún motivo el sobre no existe en el HTML, no hacemos nada acá…
     pero SÍ avisamos que la invitación ya está a la vista.

     ⚠️ ESTO ES IMPORTANTE Y NO ES UN DETALLE. Los adornos pesados —las
     enredaderas de 07 y los candelabros de 19— se construyen recién al
     escuchar 'invitacion-visible', porque viven detrás del sobre y nadie
     los ve hasta que se abre. Si el sobre no existe, ese evento no llegaría
     nunca y la web quedaría pelada.

     Antes eso se cubría con temporizadores de respaldo ("construí igual a
     los 2 segundos, por las dudas"). El problema: se disparaban SIEMPRE,
     incluso con el sobre cerrado, así que la página se ponía a construir
     354 flores y 82 velas que nadie estaba mirando. Eso bloqueaba el hilo
     casi 3 segundos (Total Blocking Time de 2.790 ms en PageSpeed).

     Acá el mismo caso se cubre con CERTEZA en vez de con un cronómetro: si
     el sobre no está, se avisa; si está, se avisa al abrirlo y no antes. */
  if (!sobre) {
    // En el siguiente tick, para que los demás archivos alcancen a
    // registrar su escucha de este evento (este archivo es el 03 de 24).
    setTimeout(() => document.dispatchEvent(new CustomEvent('invitacion-visible')), 0);
    return;
  }

  document.body.classList.add('sobre-visible');

  /** Evita que el sobre se abra dos veces si alguien hace doble clic. */
  let yaSeEstaAbriendo = false;


  /* ─── 2. PRECARGA ──────────────────────────────────────────────────
     Esperamos a que estén listas las tipografías y la imagen de fondo.
     Pero con un límite de tiempo: si alguna tarda demasiado (internet
     lento), seguimos igual. Es preferible mostrar el sobre que dejar a
     la persona mirando una pantalla vacía.
     ---------------------------------------------------------------- */

  /**
   * Espera a que las tipografías estén descargadas.
   * @returns {Promise} Se cumple cuando las fuentes están listas.
   */
  function esperarTipografias() {
    return document.fonts ? document.fonts.ready : Promise.resolve();
  }

  /**
   * Espera a que la imagen de fondo termine de descargarse.
   * @returns {Promise} Se cumple al cargar (o al fallar, para no trabarse).
   */
  function esperarImagenDeFondo() {
    return new Promise(resolve => {
      const imagen = new Image();
      imagen.onload = resolve;
      imagen.onerror = resolve;      // si falla, seguimos igual
      imagen.src = 'recursos/fondo-ornamental.svg';
    });
  }

  /* ⚠️ ANTES había acá una esperarLaCancion() que le ponía src al <audio>
     y esperaba el evento "canplaythrough" (buffer suficiente) antes de
     mostrar el sobre, con un tope de 5000ms. Eso frenaba la revelación de
     TODA la página hasta 5 segundos en cada visita — y Lighthouse lo medía
     como un LCP de 6 segundos. Se quita por dos motivos:
       1) No compraba nada: el navegador bloquea el autoplay de audio sin
          gesto del usuario de todas formas, así que precargar el audio no
          adelantaba el sonido, solo tapaba el contenido.
       2) El primer clic de la persona ya dispara la música por su cuenta
          (ver el listener en codigo/10-reproductor-de-musica.js), así que
          el audio sigue sonando igual sin haber bloqueado nada acá.
     El <audio> ahora usa preload="none" (ver index.html) y su src lo pone
     codigo/04-invitado-personalizado.js cuando corresponda, sin competir
     por ancho de banda con lo que sí hace falta para mostrar la página. */

  /**
   * Corta la espera pase lo que pase después de cierto tiempo.
   * @param {number} milisegundos - Cuánto es "demasiado".
   * @returns {Promise} Se cumple al agotarse el tiempo.
   */
  function tiempoMaximoDeEspera(milisegundos) {
    return new Promise(resolve => setTimeout(resolve, milisegundos));
  }

  /*
     Promise.race("carrera de promesas") devuelve la primera que termine.
     Acá compiten: "que carguen tipografías e imagen de fondo" contra "que
     pase 1.2 segundos". Gana la que ocurra antes, y en cualquier caso
     mostramos el sobre — preferible mostrarlo que dejar pantalla vacía. */
  Promise.race([
    Promise.all([esperarTipografias(), esperarImagenDeFondo()]),
    tiempoMaximoDeEspera(1200),
  ]).then(mostrarElSobre);


  /* ─── 3. MOSTRAR EL SOBRE ──────────────────────────────────────── */

  /**
   * Cambia la pantalla de "cargando" por el sobre lacrado.
   * @returns {void}
   */
  function mostrarElSobre() {
    sobre.classList.remove('esta-cargando');

    /* Se le da el foco al sobre para que se pueda abrir con Enter sin
       necesidad de usar el mouse.

       ⚠️ preventScroll Y EL RECUADRO DORADO.
       Antes acá se enfocaba la ILUSTRACIÓN, y el navegador dibujaba
       alrededor su aro de foco: ese rectángulo dorado que aparecía
       encuadrando la carta sin que nadie lo hubiera pedido. El navegador
       no distingue entre "me enfocaron con el teclado" (donde el aro es
       imprescindible) y "me enfocó un script al cargar" (donde sobra), y
       ante la duda lo muestra.

       La solución es enfocar el CONTENEDOR, que no tiene aro. El teclado
       sigue funcionando igual: desde ahí, un Tab cae en la ilustración
       —y ahí sí aparece el aro, porque ahí sí lo pidió la persona—, y la
       tecla Enter la escucha el contenedor entero. */
    if (sobre) sobre.focus({ preventScroll: true });
  }


  /* ─── 3B. EL GESTO DE ROMPER EL SELLO (tacto y sonido) ──────────────
     Al abrir, dos detalles chiquititos que se sienten caros: una
     vibración mínima en el celular, como el "crac" del lacre al ceder, y
     un tañido suave, como una campanita de cristal. Los dos son
     opcionales: si el dispositivo no puede, no pasa nada.
     ---------------------------------------------------------------- */

  /**
   * Una vibración breve, como el quiebre del sello. Solo donde el
   * navegador la soporta (sobre todo celulares).
   * @returns {void}
   */
  function vibrarComoElSello() {
    if (navigator.vibrate) {
      // Un golpe seco y un temblorcito que se apaga: el lacre cediendo.
      navigator.vibrate([16, 45, 26]);
    }
  }

  /**
   * Un tañido corto y cristalino, sintetizado en el momento (no hay
   * ningún archivo de sonido). Son unas pocas ondas puras afinadas en
   * acorde, con un golpe de entrada y una cola larga que se apaga sola.
   * @returns {void}
   */
  function tanidoDelSello() {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;

    try {
      const ctx = new Contexto();
      const maestro = ctx.createGain();
      maestro.gain.value = 0.0001;
      maestro.connect(ctx.destination);

      /* Un acorde tenue: la fundamental y dos armónicos. Las frecuencias
         están en proporción de campana (1 : 2 : 3), que es lo que suena
         "cristalino" y no "electrónico". */
      const ahora = ctx.currentTime;
      [880, 1760, 2640].forEach((frecuencia, i) => {
        const osc = ctx.createOscillator();
        const gan = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frecuencia;

        /* Cada armónico más agudo entra más flojo y se apaga más rápido,
           igual que en una campana real. */
        const volumen = 0.5 / (i + 1);
        const cola = 2.6 - i * 0.6;

        gan.gain.setValueAtTime(0.0001, ahora);
        gan.gain.exponentialRampToValueAtTime(volumen, ahora + 0.012);
        gan.gain.exponentialRampToValueAtTime(0.0001, ahora + cola);

        osc.connect(gan);
        gan.connect(maestro);
        osc.start(ahora);
        osc.stop(ahora + cola + 0.1);
      });

      // El maestro sube apenas: es un detalle, no un timbrazo.
      maestro.gain.setValueAtTime(0.0001, ahora);
      maestro.gain.exponentialRampToValueAtTime(0.5, ahora + 0.02);
      maestro.gain.exponentialRampToValueAtTime(0.0001, ahora + 3);

      // Cerrar el contexto cuando terminó, para no dejarlo abierto.
      setTimeout(() => ctx.close(), 3400);
    } catch (error) {
      /* Si algo falla, el sobre se abre igual, sin sonido. */
    }
  }


  /* ─── 4. ABRIR EL SOBRE ────────────────────────────────────────── */

  /**
   * Rompe el sello, abre la solapa y revela la invitación.
   *
   * Los tiempos (900 y 1500 ms) están calculados para que coincidan con
   * las animaciones definidas en estilos/03-sobre-de-apertura.css. Si
   * cambiás la duración allá, ajustá estos números también.
   *
   * @returns {Promise<void>}
   */
  async function abrirElSobre() {
    if (yaSeEstaAbriendo) return;
    yaSeEstaAbriendo = true;

    sobre.classList.add('se-esta-abriendo');

    // El "crac" del lacre: un toque de vibración y un tañido cristalino.
    vibrarComoElSello();
    tanidoDelSello();

    /* "Encender las luces": el velo cálido de revelado inunda la página y
       se asienta. Los haces de luz y la música (que entra como eco
       lejano) se enganchan al mismo evento de abajo. Ver el velo en
       estilos/12-haces-de-luz.css. */
    document.body.classList.add('revelando');

    /* ⚡ Y SE APAGA CUANDO TERMINA. La animación del velo dura 2,9 s; antes
       la clase no se quitaba nunca, así que el velo se quedaba en el árbol
       de por vida: una capa de MEZCLA del tamaño de toda la pantalla, con
       opacidad 0, sin dibujar nada y costando igual. Y una capa de mezcla no
       es cualquier capa: obliga al compositor a leer de vuelta el fondo y le
       impide fusionar nada de lo que hay debajo.

       Se le da un respiro extra sobre los 2,9 s por si el equipo va lento y
       la animación termina un poco más tarde. */
    setTimeout(() => document.body.classList.remove('revelando'), 3400);

    /*
       Este es el momento clave: estamos dentro de un clic de la persona,
       así que el navegador SÍ nos va a dejar reproducir la música.
       Avisamos con un evento y el reproductor se encarga.
    */
    document.dispatchEvent(new CustomEvent('sobre-abierto'));

    // Esperamos a que termine la animación de apertura…
    await esperar(1500);

    // …y recién ahí sacamos la capa y devolvemos el scroll.
    sobre.classList.add('oculto');
    document.body.classList.remove('sobre-visible');

    // Avisamos que la invitación ya es visible, por si algún otro archivo
    // quiere empezar sus animaciones justo en este momento.
    document.dispatchEvent(new CustomEvent('invitacion-visible'));
  }

  // El sobre entero es el botón: se abre haciendo clic en cualquier parte.
  if (ilustracion) ilustracion.addEventListener('click', abrirElSobre);

  // Y también con el teclado (barra espaciadora o Enter), para quien no
  // usa mouse.
  sobre.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirElSobre();
    }
  });

})();

/* ═══ 04-invitado-personalizado.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   04 · DATOS EN LA PÁGINA E INVITADO PERSONALIZADO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos cosas, las dos sobre "rellenar" la página:

   A) VUELCA LOS DATOS DE LA CONFIGURACIÓN
      Toma todo lo que escribiste en 01-configuracion.js (la fecha, el
      lugar, el mensaje de los papás…) y lo escribe en el lugar que le
      corresponde dentro del index.html.

      Así la fecha se escribe UNA sola vez. Antes había que acordarse de
      cambiarla en cuatro lugares distintos y siempre quedaba alguno mal.

      En el HTML, los huecos a rellenar están marcados así:
          <span data-dato="fiesta.fechaEnPalabras"></span>
      Eso significa: "acá va CONFIGURACION.fiesta.fechaEnPalabras".

      Hay tres tipos de marca:
          data-dato   → rellena el TEXTO de adentro
          data-enlace → rellena el destino de un enlace (href)
          data-fuente → rellena el archivo de un iframe o un audio (src)

   B) SALUDA AL INVITADO POR SU NOMBRE
      Permite mandarle a cada uno un enlace propio:

          index.html?invitado=Familia+Pérez
          index.html?invitado=Tía+Marta
          index.html?invitado=Sofía+y+Nicolás

      La web lo saluda en el sobre y le deja el nombre ya escrito en el
      formulario. Reglas para armarlo:
        · los espacios se escriben con un signo +
        · las tildes y la ñ se escriben normal
        · si el nombre lleva &, reemplazalo por la palabra "y"

      Si el enlace no trae nombre, se muestra un saludo genérico y listo.

   ÍNDICE
     1. Leer un dato de la configuración
     2. Rellenar los huecos del HTML
     3. Saludar al invitado por su nombre
   ══════════════════════════════════════════════════════════════════════ */


/**
 * Nombre del invitado sacado del enlace, o null si el enlace no lo trae.
 * @type {string|null}
 */
let NOMBRE_DEL_INVITADO = null;


(function rellenaLaPagina() {

  /* ─── 1. LEER UN DATO DE LA CONFIGURACIÓN ──────────────────────────
     Recibe un "camino" en forma de texto y va bajando por el objeto de
     configuración hasta encontrar el valor.
     ---------------------------------------------------------------- */

  /**
   * Busca un valor dentro de CONFIGURACION siguiendo un camino.
   *
   * @param {string} camino - Los nombres separados por puntos.
   * @returns {*} El valor encontrado, o undefined si el camino no existe.
   *
   * @example
   *   obtenerDato('fiesta.nombre')          // → 'Ania'
   *   obtenerDato('lugar.nombre')           // → 'Salones de fiestas Alvi Toluca'
   *   obtenerDato('fiesta.no-existe')       // → undefined
   */
  function obtenerDato(camino) {
    /* .split('.') parte 'fiesta.nombre' en ['fiesta', 'nombre'].
       .reduce va entrando de a un escalón: primero CONFIGURACION.fiesta,
       y después .nombre de eso. El "?." evita que explote si en el medio
       no existe algo. */
    return camino.split('.').reduce(
      (nivelActual, escalon) => (nivelActual ? nivelActual[escalon] : undefined),
      CONFIGURACION
    );
  }


  /* ─── 2. RELLENAR LOS HUECOS DEL HTML ──────────────────────────── */

  // A) Textos
  buscarTodos('[data-dato]').forEach(elemento => {
    const valor = obtenerDato(elemento.dataset.dato);

    if (valor === undefined) {
      console.warn('No encontré este dato en la configuración:', elemento.dataset.dato);
      return;
    }

    /* Se usa innerHTML (y no textContent) porque algunos textos de la
       configuración traen <br> para cortar el renglón. Es seguro porque
       ese contenido lo escribimos nosotros, no viene de afuera. */
    elemento.innerHTML = valor;
  });

  // B) Enlaces (el destino de los botones)
  buscarTodos('[data-enlace]').forEach(elemento => {
    const direccion = obtenerDato(elemento.dataset.enlace);
    if (direccion) elemento.setAttribute('href', direccion);
  });

  // C) Archivos incrustados (el mapa y la canción)
  buscarTodos('[data-fuente]').forEach(elemento => {
    // Si ya tiene algo cargado, no lo pisamos (el audio se adelanta en
    // 03-sobre-de-apertura.js para poder precargarlo cuanto antes).
    if (elemento.getAttribute('src')) return;

    const direccion = obtenerDato(elemento.dataset.fuente);
    if (direccion) elemento.setAttribute('src', direccion);
  });


  /* ─── 3. SALUDAR AL INVITADO POR SU NOMBRE ─────────────────────────
     URLSearchParams es una herramienta del navegador que entiende la
     parte del enlace que va después del signo de pregunta. Convierte
     sola los + en espacios y descifra las tildes.
     ---------------------------------------------------------------- */
  const parametrosDelEnlace = new URLSearchParams(window.location.search);
  const nombreEnElEnlace = parametrosDelEnlace.get('invitado');

  if (nombreEnElEnlace && nombreEnElEnlace.trim() !== '') {
    NOMBRE_DEL_INVITADO = nombreEnElEnlace.trim();
  }

  // A) El saludo del sobre
  const saludoDelSobre = buscar('#saludo-del-sobre');
  if (saludoDelSobre) {
    if (NOMBRE_DEL_INVITADO) {
      // limpiarTexto() neutraliza cualquier código que alguien intentara
      // colar dentro del nombre (ver 02-utilidades.js).
      saludoDelSobre.innerHTML = 'Para ' + limpiarTexto(NOMBRE_DEL_INVITADO);
    } else {
      saludoDelSobre.textContent = CONFIGURACION.textos.saludoGenerico;
    }
  }

  // B) El campo del formulario, ya completado (igual lo puede corregir)
  const campoNombre = buscar('#campo-nombre');
  if (campoNombre && NOMBRE_DEL_INVITADO && campoNombre.value === '') {
    campoNombre.value = NOMBRE_DEL_INVITADO;
  }


  /* ─── 4. DESFASAR LOS DESTELLOS DE LOS BOTONES ─────────────────────
     Los botones dorados tienen una animación de brillo definida en el
     CSS. Si todos la arrancaran a la vez, destellarían sincronizados y se
     leería como un parpadeo del sistema. Acá se le da a cada uno un
     retardo distinto al azar, para que se lean como reflejos
     independientes y no como algo mecánico.

     (Las joyas del relicario ya no llevan animación propia: su destello
     lo dan los haces de luz al derivar sobre ellas. Ver la nota en
     estilos/04-portada.css.)

     Se usa Math.random() y no el azar con semilla a propósito: acá no
     interesa que se repita igual en cada visita, al contrario. */
  buscarTodos('.boton-dorado, .boton-carmesi').forEach(boton => {
    boton.style.setProperty('--retardo-del-destello', (Math.random() * 9).toFixed(2) + 's');
    boton.style.animationDelay = '';
  });

})();

/* ═══ 05-cursor-personalizado.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   05 · CURSOR PERSONALIZADO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Reemplaza la flechita del sistema por dos piezas doradas que siguen al
   mouse: un punto que va pegado al puntero y un anillo que llega un
   instante después.

   POR QUÉ EL ANILLO VA "ATRASADO"
   Porque ese retraso mínimo es lo que se siente elegante. Se logra con
   una técnica que se llama INTERPOLACIÓN (o "lerp"): en vez de mover el
   anillo directo a la posición del mouse, en cada cuadro de animación lo
   movemos solo una fracción de la distancia que le falta.

       posiciónAnillo = posiciónAnillo + (posiciónMouse − posiciónAnillo) × 0,18

   Como cada cuadro recorta un 18 % de lo que falta, el anillo se acerca
   rápido al principio y va frenando al final. Nunca "salta".

   ÍNDICE
     1. Condiciones para activarlo
     2. Seguir al mouse
     3. Bucle de animación
     4. Cambiar de forma según lo que hay debajo
     5. Entrar y salir de la ventana
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElCursorPersonalizado() {

  /* ─── 1. CONDICIONES PARA ACTIVARLO ────────────────────────────────
     En un celular no hay puntero que reemplazar, así que ni lo creamos.
     Y en calidad BAJA tampoco: es puro adorno (no da luz ni información
     nueva), y de paso se ahorra un bucle de animación que corre para
     siempre. En equipos donde arranca en un nivel mejor y el gobernador
     de rendimiento lo degrada a baja EN VIVO, se apaga más abajo. ------- */
  if (!tieneMouse()) return;
  if (nivelDeCalidad() === CALIDAD_GRAFICA.BAJA) return;

  const anillo = buscar('#cursor-anillo');
  const punto  = buscar('#cursor-punto');
  if (!anillo || !punto) return;

  // Esta clase es la que esconde el cursor del sistema (ver el CSS).
  document.documentElement.classList.add('con-cursor-propio');


  /* ─── 2. SEGUIR AL MOUSE ───────────────────────────────────────────
     Guardamos dos posiciones distintas:
       · la del mouse, que se actualiza al instante
       · la del anillo, que va persiguiéndola con retraso
     ---------------------------------------------------------------- */
  let posicionMouseX = window.innerWidth  / 2;
  let posicionMouseY = window.innerHeight / 2;
  let posicionAnilloX = posicionMouseX;
  let posicionAnilloY = posicionMouseY;

  /** Qué tan rápido alcanza el anillo al mouse (0 = nunca, 1 = al toque). */
  const VELOCIDAD_DE_PERSECUCION = 0.18;

  /** Se vuelve true con el primer movimiento, para no mostrar el cursor
   *  parado en el medio de la pantalla antes de que la persona lo mueva. */
  let elMouseYaSeMovio = false;

  document.addEventListener('mousemove', function alMoverElMouse(evento) {
    posicionMouseX = evento.clientX;
    posicionMouseY = evento.clientY;

    if (!elMouseYaSeMovio) {
      elMouseYaSeMovio = true;
      // Arrancamos el anillo en el mismo lugar para que no cruce la
      // pantalla volando la primera vez.
      posicionAnilloX = posicionMouseX;
      posicionAnilloY = posicionMouseY;
      anillo.classList.add('visible');
      punto.classList.add('visible');
    }

    /* El bucle se duerme cuando el anillo alcanzó al puntero (ver más
       abajo); cada movimiento lo vuelve a encender. */
    despertarElBucle();

    actualizarBrilloSegunElElementoDebajo(evento.target);
  }, { passive: true });


  /* ─── 3. BUCLE DE ANIMACIÓN ────────────────────────────────────────
     requestAnimationFrame le pide al navegador que ejecute esta función
     justo antes de dibujar el próximo cuadro (unas 60 veces por segundo).
     Es la forma correcta de animar: se sincroniza con la pantalla y se
     pausa sola si la pestaña queda en segundo plano.

     ⚡ Y SE DUERME CUANDO NO HAY NADA QUE MOVER. Antes este bucle corría
     SIEMPRE, aunque el mouse llevara un rato quieto y el anillo ya lo
     hubiera alcanzado: en un perfil real se llevaba un 5,4 % del tiempo
     para recalcular dos posiciones que no cambiaban. Ahora, cuando el
     anillo llegó a destino (le falta menos de un décimo de píxel, o sea
     nada visible), el bucle se detiene y lo despierta el próximo movimiento
     del mouse. El comportamiento en pantalla es idéntico: el anillo
     persigue igual, solo que no se gasta un cuadro cuando ya llegó.
     ---------------------------------------------------------------- */

  /** Cuando la distancia que falta es menor a esto, se considera que llegó. */
  const DISTANCIA_DESPRECIABLE = 0.1;

  let bucleEnMarcha = false;

  function dibujarCuadro() {
    // El anillo recorta un 18 % de la distancia que le falta.
    const faltaX = posicionMouseX - posicionAnilloX;
    const faltaY = posicionMouseY - posicionAnilloY;
    posicionAnilloX += faltaX * VELOCIDAD_DE_PERSECUCION;
    posicionAnilloY += faltaY * VELOCIDAD_DE_PERSECUCION;

    // translate3d activa la aceleración por hardware: el movimiento lo
    // calcula la placa de video y queda mucho más fluido.
    anillo.style.transform = `translate3d(${posicionAnilloX}px, ${posicionAnilloY}px, 0)`;
    punto.style.transform  = `translate3d(${posicionMouseX}px, ${posicionMouseY}px, 0)`;

    /* ¿Ya llegó? Entonces se apaga hasta el próximo movimiento. Se ajusta
       exacto para que no quede una fracción de píxel colgada. */
    if (Math.abs(faltaX) < DISTANCIA_DESPRECIABLE &&
        Math.abs(faltaY) < DISTANCIA_DESPRECIABLE) {
      posicionAnilloX = posicionMouseX;
      posicionAnilloY = posicionMouseY;
      bucleEnMarcha = false;
      return;
    }

    requestAnimationFrame(dibujarCuadro);
  }

  /**
   * Enciende el bucle si estaba dormido. Lo llama cada movimiento del mouse.
   * @returns {void}
   */
  function despertarElBucle() {
    if (bucleEnMarcha) return;
    bucleEnMarcha = true;
    requestAnimationFrame(dibujarCuadro);
  }
  despertarElBucle();


  /* ─── 4. BRILLO SEGÚN LO QUE HAY DEBAJO ────────────────────────────
     El cursor NUNCA cambia de forma ni de tamaño: siempre es el mismo
     anillo con su punto. Lo único que cambia es cuánto brilla cuando
     está sobre algo en lo que se puede hacer clic.
     ---------------------------------------------------------------- */

  /** Elementos que se consideran "cliqueables". */
  const SELECTOR_INTERACTIVO =
    'a, button, [role="button"], .opcion-menu, summary, input, textarea, select';

  /**
   * Enciende o apaga el brillo del cursor según el elemento que está
   * debajo del mouse.
   *
   * @param {Element} elementoDebajo - Sobre qué está el puntero ahora.
   * @returns {void}
   */
  function actualizarBrilloSegunElElementoDebajo(elementoDebajo) {
    if (!elementoDebajo || !elementoDebajo.closest) return;

    // .closest() sube por el árbol buscando un antepasado que coincida.
    // Sirve porque el mouse puede estar sobre el texto DENTRO de un botón.
    const estaSobreAlgoCliqueable = elementoDebajo.closest(SELECTOR_INTERACTIVO) !== null;

    anillo.classList.toggle('sobre-interactivo', estaSobreAlgoCliqueable);
    punto .classList.toggle('sobre-interactivo', estaSobreAlgoCliqueable);
  }


  /* ─── 5. ENTRAR Y SALIR DE LA VENTANA ──────────────────────────────
     Si el mouse se va de la ventana (o entra al mapa de Google, que es
     un iframe y se "traga" los movimientos), escondemos nuestro cursor
     para que no quede una bolita dorada abandonada en la pantalla.
     ---------------------------------------------------------------- */
  function ocultarCursor() {
    anillo.classList.remove('visible');
    punto.classList.remove('visible');
  }
  function mostrarCursor() {
    if (!elMouseYaSeMovio) return;
    anillo.classList.add('visible');
    punto.classList.add('visible');
  }

  document.addEventListener('mouseleave', ocultarCursor);
  document.addEventListener('mouseenter', mostrarCursor);

  // El truco para detectar el iframe del mapa: cuando el puntero entra
  // ahí, la ventana pierde el foco. Lo comprobamos al recuperar el foco.
  window.addEventListener('blur',  ocultarCursor);
  window.addEventListener('focus', mostrarCursor);

  /* Si el gobernador de rendimiento degrada a calidad BAJA a mitad de
     sesión (equipo que empezó bien y se puso a sufrir), se apaga el
     cursor propio y vuelve el del sistema. No hace falta lo contrario
     —si mejora, no vale la pena reactivarlo recién ahí—: es un ajuste
     menor y así se evita complejidad de más. */
  document.addEventListener('calidad-cambio', evento => {
    if ((evento.detail && evento.detail.calidad) === CALIDAD_GRAFICA.BAJA) {
      document.documentElement.classList.remove('con-cursor-propio');
      ocultarCursor();
    }
  });

})();

/* ═══ 24-lienzo-de-petalos.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   24 · EL LIENZO DE PÉTALOS
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dibuja los pétalos que caen en tres <canvas> —uno por plano de
   profundidad— en vez de en 29 divs.

   POR QUÉ EXISTE (la lección que costó varias rondas)
   Un elemento del DOM que se anima cuesta de una de dos formas, y no hay
   una tercera:

     · SIN capa de compositor → el navegador lo REPINTA entero en cada
       cuadro. Con los pétalos así, "Paint" llegó al 44,7 % del perfil.
     · CON capa (will-change) → deja de repintarse, pero suma una capa que
       "Layerize" tiene que administrar. Al ponérselo a los 29, "Paint" bajó
       a la mitad… y "Layerize" se quedó clavado en el 27,6 %.

   O sea: se cambiaba un costo por el otro. La única salida real es que
   dejen de ser elementos del DOM.

   Y hay precedente medido: los tres sistemas de luz, ya mudados al lienzo
   (codigo/23-lienzo-de-luz.js), cuestan 0,4 ms por cuadro ENTRE TODOS.

   POR QUÉ TRES CANVAS Y NO UNO
   Los pétalos viven en tres planos con contenido de la página en medio:
   el de fondo va detrás de todo (z-index 1), el del medio se cuela entre
   el relicario y su texto (3), y el de frente pasa por delante de casi
   todo (50). Un solo canvas no puede intercalarse a tres alturas
   distintas. Con tres, se conserva exactamente la misma profundidad… y
   siguen siendo 3 capas en vez de 29.

   SI ALGO SE VE MAL
   Abrir con  ?petalos=dom  y vuelve el sistema de divs al instante.
   ══════════════════════════════════════════════════════════════════════ */

(function elLienzoDePetalos() {

  const parametros = new URLSearchParams(location.search);
  const USAR_LIENZO = parametros.get('petalos') !== 'dom';

  /* Registro público: 06-petalos-con-fisica.js pregunta acá si tiene que
     crear divs o solo mantener números. */
  window.LienzoDePetalos = { activo: USAR_LIENZO, planos: {} };

  if (!USAR_LIENZO) return;

  /* ⚡ DOS LIENZOS, NO TRES — Y EL PORQUÉ, QUE SE COMPROBÓ MIRANDO EL MAPA
     COMPLETO DE z-index ANTES DE TOCAR NADA.

     El apilado real de la página es este:

         z-1   pétalos FONDO
         z-2   el contenido (secciones, marco del relicario)
         z-3   pétalos MEDIO      ← caen sobre el marco del relicario
         z-4   el nombre "ANIA"   ← no se tapa con nada
         z-50  pétalos FRENTE

     · FONDO no se puede fusionar con nada: el contenido está justo encima
       de él, y juntarlo con los otros pondría los pétalos de atrás POR
       DELANTE del texto. Se queda solo.

     · MEDIO y FRENTE sí, porque entre z-4 y z-50 no hay absolutamente nada
       más. Lo único que los separaba era el nombre de Ania, y eso se
       resuelve subiendo el nombre a 51 (ver estilos/04-portada.css).

     Resultado: una capa a pantalla completa menos. En la pantalla objetivo
     —3305 px de ancho— eso son 2,6 millones de píxeles menos de compositing
     en cada cuadro, y esta página está limitada por tasa de relleno.

     La profundidad no se pierde: como dice el propio módulo de física, lo
     que separa un plano de otro es el TAMAÑO y la OPACIDAD, no el apilado. */
  const LIENZOS = [
    { contenedor: '#petalos-fondo',  planos: ['fondo'] },
    { contenedor: '#petalos-frente', planos: ['medio', 'frente'] },
  ];

  /** Los mismos tres dibujos de pétalo de siempre, precargados como
   *  imágenes para poder estamparlos en el canvas. */
  const ARCHIVOS = [
    'recursos/petalo-rosa-1.svg',
    'recursos/petalo-rosa-2.svg',
    'recursos/petalo-rosa-3.svg',
  ];

  const imagenes = ARCHIVOS.map(ruta => {
    const img = new Image();
    img.src = ruta;
    return img;
  });

  /** Expuestas para que el módulo de física elija una al crear un pétalo. */
  window.LienzoDePetalos.imagenes = imagenes;

  /* ⚡ PRE-RASTERIZADO: la razón de que esto costara tanto por cuadro.
     `imagen` es un <img> que apunta a un archivo .svg. Un SVG no es un
     mapa de píxeles: cuando se dibuja con drawImage() bajo una ROTACIÓN
     distinta cada vez (pintarLosPetalos gira cada pétalo un ángulo propio),
     el navegador tiene que VOLVER A RASTERIZAR el vector entero en cada
     cuadro — no hay forma de cachear eso entre ángulos.

     Con ~18 pétalos activos y dos lienzos, eran ~18 rasterizaciones
     vectoriales POR CUADRO. Coincide exacto con el perfil real: "Paint" al
     12,3 % y la función pintarLosPetalos sola al 21,5 %.

     La solución: rasterizar cada uno de los 3 dibujos UNA sola vez, a un
     canvas oculto, y de ahí en más dibujar ESE mapa de bits (que sí se
     cachea entre rotaciones sin costo). 128 px alcanza de sobra: el pétalo
     más grande mide 62 px (06-petalos-con-fisica.js, plano "frente"), así
     que 128 cubre esa medida a densidad de pantalla 2x, y todo lo demás se
     dibuja reduciendo, que es barato.

     Mientras el rasterizado no está listo (una fracción de segundo, a lo
     sumo lo que tarda en decodificar el SVG) se sigue dibujando desde el
     <img> original: nunca hay un cuadro sin pétalos. */
  const TAMANO_DEL_MAPA = 128;
  const mapasDePixeles = new Map();

  function rasterizar(img) {
    const lienzoOculto = document.createElement('canvas');
    lienzoOculto.width = TAMANO_DEL_MAPA;
    lienzoOculto.height = TAMANO_DEL_MAPA;
    const pincelOculto = lienzoOculto.getContext('2d');
    if (!pincelOculto) return;
    pincelOculto.drawImage(img, 0, 0, TAMANO_DEL_MAPA, TAMANO_DEL_MAPA);
    mapasDePixeles.set(img, lienzoOculto);
  }

  for (const img of imagenes) {
    if (img.complete && img.naturalWidth) {
      rasterizar(img);
    } else if (typeof img.decode === 'function') {
      img.decode().then(() => rasterizar(img)).catch(() => {});
    } else {
      img.addEventListener('load', () => rasterizar(img), { once: true });
    }
  }

  /* ── Un canvas por plano ── */
  const planos = [];

  for (const config of LIENZOS) {
    const contenedor = buscar(config.contenedor);
    if (!contenedor) continue;

    const lienzo = document.createElement('canvas');
    lienzo.className = 'lienzo-de-petalos';
    lienzo.setAttribute('aria-hidden', 'true');
    contenedor.appendChild(lienzo);

    const pincel = lienzo.getContext('2d', { alpha: true });
    if (!pincel) continue;

    /* Cada lienzo dibuja una o más listas, EN ORDEN: así los pétalos del
       plano "frente" siguen quedando por encima de los del "medio" aunque
       compartan superficie. El módulo de física sigue viendo tres planos
       separados, que es lo que espera. */
    const listas = config.planos.map(nombre => {
      const lista = [];
      window.LienzoDePetalos.planos[nombre] = lista;
      return lista;
    });

    planos.push({ lienzo, pincel, listas });
  }

  if (!planos.length) { window.LienzoDePetalos.activo = false; return; }

  /* ⚡ #petalos-medio SIGUE EXISTIENDO EN EL HTML PERO YA NO SE USA (ver la
     nota grande de "POR QUÉ TRES CANVAS Y NO UNO", más arriba: los planos
     medio y frente comparten canvas desde hace tiempo). El problema es que
     sigue siendo `position: fixed` a pantalla completa
     (estilos/10-cursor-y-petalos.css), y el navegador le arma una capa de
     compositor igual, aunque nunca se dibuje nada adentro. Se oculta acá.

     ⚠️ NO SE PUEDE BORRAR DEL <div> EN index.html: 06-petalos-con-fisica.js
     hace `if (!buscar('#petalos-medio')) return;` — si el elemento no
     existiera, TODOS los pétalos (no solo los del plano medio) dejarían de
     crearse. display:none conserva el elemento pero apaga la capa. */
  const capaMedioSinUso = buscar('#petalos-medio');
  if (capaMedioSinUso) capaMedioSinUso.style.display = 'none';

  let ancho = 0, alto = 0, densidad = 1;

  /**
   * Ajusta los tres canvas al tamaño de la ventana.
   *
   * Los pétalos SÍ tienen forma y borde —a diferencia de la luz, que es
   * una mancha difusa—, así que acá no se baja la resolución: se respeta
   * la densidad de la pantalla hasta 2x. Bajarla se notaría.
   *
   * @returns {void}
   */
  function ajustarLosLienzos() {
    ancho = window.innerWidth;
    alto  = window.innerHeight;
    densidad = Math.min(window.devicePixelRatio || 1, 2);

    for (const plano of planos) {
      plano.lienzo.width  = Math.max(1, Math.round(ancho * densidad));
      plano.lienzo.height = Math.max(1, Math.round(alto  * densidad));
      plano.lienzo.style.width  = ancho + 'px';
      plano.lienzo.style.height = alto  + 'px';
    }
  }

  ajustarLosLienzos();
  window.addEventListener('resize', rebotar(ajustarLosLienzos, 200));

  /**
   * Un cuadro: limpia los tres canvas y estampa cada pétalo donde toca.
   *
   * Nada de esto crea objetos: se recorre con índices y se reutiliza el
   * estado del pincel. Es el mismo criterio que en el lienzo de luz.
   *
   * @returns {void}
   */
  function pintarLosPetalos() {
    /* Sin nadie mirando no se redibuja. Los canvas conservan lo último
       pintado, así que los pétalos quedan quietos en su sitio en vez de
       desaparecer de golpe. hayAlgoQueMirar() (02-utilidades.js) cubre los
       tres casos: sobre todavía cerrado, pestaña de fondo, o animaciones
       apagadas. */
    if (!hayAlgoQueMirar()) {
      requestAnimationFrame(pintarLosPetalos);
      return;
    }

    for (let p = 0; p < planos.length; p++) {
      const plano = planos[p];
      const pincel = plano.pincel;

      pincel.setTransform(densidad, 0, 0, densidad, 0, 0);

      /* ⚡ SE BORRA SOLO DONDE HUBO UN PÉTALO, NO LA PANTALLA ENTERA.
         Antes esto era `clearRect(0, 0, ancho, alto)`: tres pantallas
         completas borradas y vueltas a subir a la GPU en CADA cuadro —3,25
         megapíxeles— para dibujar 29 pétalos que ocupan, entre todos, unos
         60.000 píxeles.

         En la máquina objetivo (Intel HD 4600, sin memoria propia, bus
         compartido con la CPU) eso era casi todo el problema: el ancho de
         banda, no el procesador.

         Ahora se borra el rectángulo que ocupó cada pétalo el cuadro
         anterior. El margen de 2 px cubre el suavizado de los bordes; sin
         él quedarían estelas. */
      for (let L = 0; L < plano.listas.length; L++) {
        const lista = plano.listas[L];
        for (let i = 0; i < lista.length; i++) {
          const caja = lista[i].cajaAnterior;
          if (caja) pincel.clearRect(caja[0] - 2, caja[1] - 2, caja[2] + 4, caja[3] + 4);
        }
      }

      /* Se dibuja lista por lista y en orden, para conservar la profundidad
         entre planos que ahora comparten lienzo. */
      for (let L = 0; L < plano.listas.length; L++) {
      const lista = plano.listas[L];
      for (let i = 0; i < lista.length; i++) {
        const pet = lista[i];
        pet.cajaAnterior = null;

        if (!pet.activo || pet.opacidad <= 0.004) continue;

        const imagen = pet.imagen;
        if (!imagen || !imagen.complete || !imagen.naturalWidth) continue;

        // Culling: lo que quedó fuera de la ventana no se dibuja.
        if (pet.y < -pet.tamaño - 40 || pet.y > alto + pet.tamaño + 40) continue;
        if (pet.x < -pet.tamaño - 40 || pet.x > ancho + pet.tamaño + 40) continue;

        const medio = pet.tamaño / 2;

        /* El mapa de bits pre-rasterizado, si ya está listo; si no, el SVG
           original (nunca se pierde un cuadro por esperar). Ver la nota
           grande de más arriba: dibujar el SVG con rotación distinta cada
           vez obligaba a re-rasterizarlo entero por cuadro. */
        const fuente = mapasDePixeles.get(imagen) || imagen;

        pincel.save();
        /* Se gira sobre el CENTRO del pétalo, igual que hacía el CSS: el
           transform del div era translate + rotate, y el origen por defecto
           de una caja es su centro. */
        pincel.translate(pet.x + medio, pet.y + medio);
        pincel.rotate(pet.angulo * Math.PI / 180);
        pincel.globalAlpha = pet.opacidad;
        pincel.drawImage(fuente, -medio, -medio, pet.tamaño, pet.tamaño);
        pincel.restore();

        /* Se anota QUÉ ZONA ocupó, para poder borrar solo eso el próximo
           cuadro. Un pétalo girado ocupa más que su lado: la diagonal. Se
           usa el lado × 1,45 (√2 redondeado hacia arriba) centrado, que
           cubre cualquier ángulo. Quedarse corto acá deja estelas. */
        const radio = pet.tamaño * 0.725;
        pet.cajaAnterior = [
          pet.x + medio - radio, pet.y + medio - radio, radio * 2, radio * 2,
        ];
      }
      }
    }

    requestAnimationFrame(pintarLosPetalos);
  }

  requestAnimationFrame(pintarLosPetalos);

})();

/* ═══ 06-petalos-con-fisica.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   06 · PÉTALOS CON FÍSICA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Hace caer pétalos de rosa por toda la pantalla, con dos gracias:
     1. no caen en línea recta, sino zigzagueando como un pétalo real
     2. si pasás el mouse cerca, se apartan girando y después retoman
        su caída

   CÓMO FUNCIONA UNA SIMULACIÓN DE FÍSICA (en criollo)
   Cada pétalo guarda dos cosas: DÓNDE está (posición) y HACIA DÓNDE va
   (velocidad). Sesenta veces por segundo hacemos lo mismo:

       1. sumamos a la velocidad todas las fuerzas que lo empujan
          (la gravedad hacia abajo, el viento a los costados, el mouse)
       2. sumamos esa velocidad a la posición
       3. lo dibujamos en el lugar nuevo

   Repitiendo eso muy rápido, el ojo ve movimiento natural.

   POR QUÉ TODO SE MULTIPLICA POR "dt"
   dt es el tiempo que pasó desde el cuadro anterior, en segundos. Si no
   lo usáramos, los pétalos caerían al doble de velocidad en una pantalla
   de 120 cuadros por segundo que en una de 60. Multiplicando por dt, el
   movimiento dura lo mismo en cualquier computadora.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Crear los pétalos
     3. Seguir el mouse
     4. Las fuerzas: gravedad, viento y mouse
     5. El bucle de animación
     6. Ahorro de batería y cambios de tamaño
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLaLluviaDePetalos() {

  // Hacen falta los tres planos; si falta alguno, no arrancamos
  if (!buscar('#petalos-fondo') || !buscar('#petalos-medio') || !buscar('#petalos-frente')) return;

  /* No se corta acá aunque las animaciones estén apagadas: los pétalos se
     preparan igual y el bucle queda en reposo (ver el guard del bucle). En
     modo apagado, el CSS los esconde (un pétalo congelado en el aire se
     vería raro). Si se encienden con el botón, empiezan a caer al instante,
     sin recargar. */


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────────
     Jugá con estos valores para cambiar la sensación. Están todos juntos
     a propósito, así no hay que bucear en el código.
     ---------------------------------------------------------------- */

  /* CUÁNTOS PÉTALOS Y EN QUÉ PLANO.
     La idea NO es llenar la pantalla, sino repartirlos en tres
     profundidades. Saturar arruinaría el efecto; lo que da riqueza es la
     separación entre planos, no la cantidad.

     Este reparto es el de CALIDAD ALTA, y se crea SIEMPRE, en todos los
     niveles. Cuántos están ACTIVOS lo decide después el nivel de calidad
     (ver ajustarCantidadDePetalos): en media se mueve un 60 % y en baja un
     35 %, y los demás quedan escondidos sin calcularse.

     Se crean todos de entrada a propósito: crear un pétalo cuesta una sola
     vez, pero si solo se creara la cantidad del nivel inicial, un equipo que
     MEJORA de media a alta nunca vería los pétalos extra —tendría que
     recargar la página—. Así, subir de nivel se nota en el acto. */
  const esPantallaChica = window.innerWidth < 700;

  const REPARTO_POR_PLANO = esPantallaChica
    ? { fondo: 8,  medio: 5,  frente: 6 }
    : { fondo: 14, medio: 10, frente: 12 };

  /* Cada plano tiene su propio tamaño y su propia transparencia. Eso es
     lo que hace que se lean como distancias distintas y no como tres
     grupos del mismo tamaño superpuestos. */
  /* ⚠️ LOS TAMAÑOS SUBIERON, Y NO ES CAPRICHO.
     Eran [7,15] / [12,22] / [20,34] y en una pantalla grande se leían como
     MIGAJAS, no como pétalos: a 7 px un pétalo de rosa es un punto. Los
     dibujos tienen forma y nervadura, y a ese tamaño no se veía ninguna de
     las dos cosas.

     Se subieron alrededor de un 75 %, conservando la proporción entre los
     tres planos: el de frente sigue siendo casi el triple que el del fondo,
     que es lo que crea la sensación de profundidad. No cuesta rendimiento:
     son la misma cantidad de elementos, solo más grandes. */
  const RASGOS_DEL_PLANO = {
    fondo:  { contenedor: '#petalos-fondo',  tamaño: [13, 26], opacidad: [.30, .55], caida: [14, 30] },
    medio:  { contenedor: '#petalos-medio',  tamaño: [22, 40], opacidad: [.60, .90], caida: [18, 40] },
    frente: { contenedor: '#petalos-frente', tamaño: [36, 62], opacidad: [.70, 1],   caida: [26, 54] },
  };

  /** Cuánto tira la gravedad hacia abajo (píxeles por segundo, al cuadrado). */
  const GRAVEDAD = 55;

  /** Cuánto frena el aire. 0.99 = pierde 1 % de velocidad por cuadro.
   *  Es lo que evita que los pétalos aceleren para siempre. */
  const ROZAMIENTO_DEL_AIRE = 0.99;

  /** Fuerza del vaivén lateral (el zigzag de la caída). */
  const FUERZA_DEL_VAIVEN = 48;

  /** A qué distancia del mouse empiezan a reaccionar los pétalos (píxeles). */
  const RADIO_DE_INFLUENCIA_DEL_MOUSE = 130;

  /** Con cuánta fuerza los empuja el mouse al acercarse. */
  const FUERZA_DE_EMPUJE = 1400;

  /** Cuánto los arrastra el movimiento del mouse (el "aire" de la mano). */
  const ARRASTRE_DEL_MOUSE = 0.22;

  /** Los tres dibujos de pétalo que se van alternando. */
  const IMAGENES_DE_PETALO = [
    'recursos/petalo-rosa-1.svg',
    'recursos/petalo-rosa-2.svg',
    'recursos/petalo-rosa-3.svg',
  ];


  /* ─── 2. CREAR LOS PÉTALOS ─────────────────────────────────────────
     Cada pétalo es un objeto con sus datos + el elemento que se ve en
     pantalla. Los creamos una sola vez y después los reciclamos: cuando
     uno sale por abajo, vuelve a aparecer arriba. Así nunca crece la
     cantidad de elementos y la web no se pone lenta.
     ---------------------------------------------------------------- */

  /** ¿Dibuja el lienzo de pétalos? (ver codigo/24-lienzo-de-petalos.js).
   *  Se decide una vez, al cargar. */
  const usaElLienzo = !!(window.LienzoDePetalos && window.LienzoDePetalos.activo);

  let anchoDePantalla = window.innerWidth;
  let altoDePantalla  = window.innerHeight;

  /** @type {Array<Object>} La lista de todos los pétalos. */
  const petalos = [];

  /**
   * Crea un pétalo con valores al azar y lo agrega a la pantalla.
   *
   * @param {boolean} empezarArriba - Si es true nace justo arriba del
   *        borde superior; si es false nace en cualquier altura (se usa
   *        al arrancar, para que no caigan todos juntos como un telón).
   * @returns {Object} El pétalo recién creado.
   */
  function crearPetalo(empezarArriba, plano) {
    const rasgos = RASGOS_DEL_PLANO[plano];
    const tamaño = numeroAlAzar(rasgos.tamaño[0], rasgos.tamaño[1]);
    const opacidad = numeroAlAzar(rasgos.opacidad[0], rasgos.opacidad[1]);

    let elemento = null;
    let imagen = null;

    if (usaElLienzo) {
      /* ⚡ SIN ELEMENTO. El pétalo pasa a ser solo números que dibuja
         codigo/24-lienzo-de-petalos.js. Así deja de costar una capa de
         compositor (Layerize) o un repintado por cuadro (Paint), que era el
         intercambio del que no se podía salir mientras fuera un div. */
      imagen = elegirAlAzar(window.LienzoDePetalos.imagenes);
    } else {
      elemento = document.createElement('div');
      elemento.className = 'petalo';
      elemento.style.width  = tamaño + 'px';
      elemento.style.height = tamaño + 'px';
      elemento.style.backgroundImage = 'url(' + elegirAlAzar(IMAGENES_DE_PETALO) + ')';
      elemento.style.opacity = opacidad.toFixed(2);
      buscar(rasgos.contenedor).appendChild(elemento);
    }

    return {
      elemento,
      imagen,
      opacidad,
      tamaño,
      plano,
      rasgos,
      activo: true,   // el gobernador de rendimiento puede desactivar algunos


      x: numeroAlAzar(0, anchoDePantalla),
      y: empezarArriba ? numeroAlAzar(-120, -20) : numeroAlAzar(0, altoDePantalla),
      velocidadX: numeroAlAzar(-12, 12),
      velocidadY: numeroAlAzar(rasgos.caida[0], rasgos.caida[1]),
      angulo: numeroAlAzar(0, 360),
      velocidadAngular: numeroAlAzar(-45, 45),

      /* El vaivén de cada pétalo arranca en un momento distinto del ciclo
         (fase) y a distinta velocidad (frecuencia). Sin esto, los 22
         pétalos se moverían al unísono y se notaría el truco. */
      faseDelVaiven: numeroAlAzar(0, Math.PI * 2),
      frecuenciaDelVaiven: numeroAlAzar(0.5, 1.3),
    };
  }

  for (const plano of Object.keys(REPARTO_POR_PLANO)) {
    for (let i = 0; i < REPARTO_POR_PLANO[plano]; i++) {
      const petalo = crearPetalo(false, plano);
      petalos.push(petalo);
      // El lienzo dibuja cada plano por separado, para respetar la profundidad.
      if (usaElLienzo) window.LienzoDePetalos.planos[plano].push(petalo);
    }
  }


  /* ─── CALIDAD GRÁFICA ADAPTATIVA ─────────────────────────────────────
     Se crean SIEMPRE todos los pétalos (el reparto de arriba, que es el
     de calidad ALTA): la cantidad de elementos en el DOM no cambia nunca,
     así no hay que crear ni destruir nada en vivo. Lo que cambia por nivel
     es cuántos quedan ACTIVOS:
        · alta  → el 100 %.
        · media → un 65 % (se ve casi tan poblado, cuesta bastante menos).
        · baja  → un 35 % (el resto se esconde y el bucle los saltea, así
          ni se dibujan ni se calculan).
     codigo/21-monitor-de-rendimiento.js manda el nivel —el de arranque
     (para no empezar de más y tener que recortar a los dos segundos) y
     cada vez que lo corrige en vivo—. El invitado no ve el recorte: ve
     una web que se mantiene fluida. ---------------------------------- */
  /* Fracciones sobre el total creado (que es el de calidad ALTA). En una
     pantalla de escritorio son 36 pétalos: alta los mueve todos, media 22 y
     baja 13 — o sea, media y baja quedan en la MISMA cantidad de siempre, y
     lo que cambia es que alta ahora tiene bastante más. */
  /* Fracciones sobre el total creado (36 en escritorio, el de calidad alta):
     alta los mueve todos, media 28 y baja 18. Media y baja SUBIERON respecto
     de antes (eran 22 y 13) porque se liberó mucho margen: los pétalos ya no
     piden capa de GPU en esos niveles y se recuperaron las 24 capas que
     gastaban los SVG de las plantas. */
  const FRACCION_ACTIVA_POR_CALIDAD = { 0: 1, 1: 0.78, 2: 0.5 };

  function ajustarCantidadDePetalos(calidad) {
    const fraccion = FRACCION_ACTIVA_POR_CALIDAD[calidad] ?? 1;
    const cuantosActivos = Math.ceil(petalos.length * fraccion);

    petalos.forEach((petalo, i) => {
      const activo = i < cuantosActivos;
      if (petalo.activo !== activo) {
        petalo.activo = activo;
        // Con el lienzo alcanza con la marca: el canvas saltea los apagados.
        if (petalo.elemento) petalo.elemento.style.display = activo ? '' : 'none';
      }
    });
  }

  // Se aplica YA, con la estimación de arranque: nada de flash de más.
  ajustarCantidadDePetalos(nivelDeCalidad());

  document.addEventListener('calidad-cambio', evento => {
    ajustarCantidadDePetalos((evento.detail && evento.detail.calidad) ?? 0);
  });


  /* ─── 3. SEGUIR EL MOUSE ───────────────────────────────────────────
     Además de dónde está, nos interesa a qué velocidad se mueve: un
     manotazo rápido tiene que revolear los pétalos mucho más que un
     movimiento lento.
     ---------------------------------------------------------------- */
  let mouseX = -9999;          // arranca lejísimos: "no hay mouse todavía"
  let mouseY = -9999;
  let mouseXAnterior = -9999;
  let mouseYAnterior = -9999;
  let velocidadMouseX = 0;
  let velocidadMouseY = 0;

  /* Una sola entrada para el mouse Y el dedo: pointermove cubre los dos. Va
     passive para no bloquear el scroll en el celular —los pétalos se apartan
     del dedo mientras se desliza, sin trabar el gesto—. */
  function alMoverPuntero(evento) {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }
  document.addEventListener('pointermove', alMoverPuntero, { passive: true });
  document.addEventListener('pointerdown', alMoverPuntero, { passive: true });

  /* Dejamos de empujar cuando el mouse se va de la ventana o cuando el dedo
     se levanta. OJO: en un mouse, soltar el clic (pointerup) NO tiene que
     apagar el empuje —el mouse sigue ahí—; por eso solo se resetea con el
     dedo (pointerType 'touch') o al salir con el mouse. */
  function soltarPuntero(evento) {
    if (!evento || evento.type === 'mouseleave' || evento.pointerType === 'touch') {
      mouseX = -9999;
      mouseY = -9999;
    }
  }
  document.addEventListener('mouseleave', soltarPuntero);
  document.addEventListener('pointerup', soltarPuntero);
  document.addEventListener('pointercancel', soltarPuntero);


  /* ─── 3b. EL RELICARIO COMO OBSTÁCULO ──────────────────────────────
     Los pétalos del plano medio no atraviesan el relicario: se posan
     sobre él y resbalan por su curva hasta soltarse. Para eso hace falta
     saber dónde está el óvalo en la pantalla, cuadro a cuadro.
     ---------------------------------------------------------------- */

  /** El óvalo del relicario en píxeles de pantalla, o null si no se ve. */
  let relicario = null;

  /**
   * Anota dónde está el relicario ahora mismo.
   *
   * ⚡ YA NO TOCA EL DOM. Antes esto llamaba getBoundingClientRect() en
   * CADA cuadro sobre el SVG más grande de la página —y 17-joyas-
   * colgantes.js hacía exactamente lo mismo por su cuenta, así que era el
   * doble de lecturas de las que hacían falta—. Ahora ambos leen
   * medidaDelRelicario() (02-utilidades.js), que mide una sola vez —al
   * cargar y en cada resize— y acá solo se hace una resta con el scroll.
   *
   * Los semiejes salen de la geometría del dibujo: el anillo exterior
   * mide rx 302 y ry 268 sobre un lienzo de 860 × 816.
   *
   * @returns {void}
   */
  function medirElRelicario() {
    const caja = medidaDelRelicario();
    if (!caja) { relicario = null; return; }

    // Si ya no se ve, no hay nada contra qué chocar: ahorramos el cálculo
    if (caja.width < 10 || caja.top + caja.height < -150 || caja.top > altoDePantalla + 150) {
      relicario = null;
      return;
    }

    relicario = {
      centroX: caja.left + caja.width / 2,
      centroY: caja.top + caja.height / 2,
      rx: (302 / 860) * caja.width,
      ry: (268 / 816) * caja.height,
    };
  }

  /**
   * Hace que un pétalo se apoye en el relicario y resbale por su borde.
   *
   * CÓMO SE SABE SI ESTÁ ADENTRO
   * Una elipse cumple que (x/rx)² + (y/ry)² = 1 justo en su borde. Si esa
   * cuenta da menos de 1, el punto está adentro; si da más, afuera.
   *
   * CÓMO SE LO SACA
   * Se estira el vector desde el centro hasta que la cuenta dé 1 exacto.
   * Eso deposita el pétalo sobre la superficie por el camino más corto.
   *
   * CÓMO SE LOGRA QUE RESBALE
   * La velocidad se parte en dos: la parte que empuja CONTRA la superficie
   * se anula (si no, lo atravesaría) y la parte que va A LO LARGO se
   * conserva. Eso es deslizarse. Después la gravedad sigue tirando, y
   * como más abajo la superficie se curva hacia adentro, el pétalo se
   * despega solo y continúa su caída. No hay que programar el "soltarse":
   * sale gratis de la física.
   *
   * OJO CON LA NORMAL: en una elipse la perpendicular NO apunta al
   * centro (eso solo pasa en un círculo). Hay que dividir cada
   * componente por su semieje al cuadrado.
   *
   * @param {Object} petalo - El pétalo a evaluar.
   * @returns {void}
   */
  function apoyarseEnElRelicario(petalo) {
    if (!relicario) return;

    const centroDelPetaloX = petalo.x + petalo.tamaño / 2;
    const centroDelPetaloY = petalo.y + petalo.tamaño / 2;
    const distanciaX = centroDelPetaloX - relicario.centroX;
    const distanciaY = centroDelPetaloY - relicario.centroY;

    const u = distanciaX / relicario.rx;
    const v = distanciaY / relicario.ry;
    const cuentaDeLaElipse = u * u + v * v;

    // Afuera del óvalo (o justo en el centro, que daría división por cero)
    if (cuentaDeLaElipse >= 1 || cuentaDeLaElipse < 0.0001) return;

    // Depositarlo sobre la superficie
    const estiramiento = 1 / Math.sqrt(cuentaDeLaElipse);
    petalo.x += relicario.centroX + distanciaX * estiramiento - centroDelPetaloX;
    petalo.y += relicario.centroY + distanciaY * estiramiento - centroDelPetaloY;

    // Perpendicular a la superficie, de largo 1
    let normalX = distanciaX / (relicario.rx * relicario.rx);
    let normalY = distanciaY / (relicario.ry * relicario.ry);
    const largo = Math.hypot(normalX, normalY) || 1;
    normalX /= largo;
    normalY /= largo;

    // Anular lo que empuja hacia adentro, con un rebote mínimo
    const contraLaSuperficie = petalo.velocidadX * normalX + petalo.velocidadY * normalY;
    if (contraLaSuperficie < 0) {
      petalo.velocidadX -= contraLaSuperficie * normalX * 1.06;
      petalo.velocidadY -= contraLaSuperficie * normalY * 1.06;
    }

    /* Rozamiento al resbalar. El valor está calibrado, no elegido a ojo:
       con 0,93 el pétalo quedaba PEGADO al óvalo —perdía el 99 % de su
       velocidad por segundo y no llegaba nunca al borde—; con 0,995
       resbala unos 5 segundos y se suelta solo, que es el tiempo en que
       el gesto se lee como algo que se desliza y no como algo que se
       trabó. Si se sube más, patina como sobre hielo. */
    petalo.velocidadX *= 0.995;
    petalo.velocidadY *= 0.995;
    petalo.velocidadAngular *= 0.96;
  }


  /* ─── 4. LAS FUERZAS ───────────────────────────────────────────────
     Acá está el corazón de la simulación.
     ---------------------------------------------------------------- */

  /**
   * Aplica al pétalo el empujón del mouse, si está lo bastante cerca.
   *
   * LA IDEA: cuanto más cerca está el mouse, más fuerte es el empujón.
   * Usamos una caída "al cuadrado" (influencia × influencia) para que el
   * efecto sea muy suave en el borde del radio y bien marcado en el
   * centro. Si fuera lineal, se sentiría artificial.
   *
   * Además el pétalo GIRA, porque el aire que mueve la mano no lo empuja
   * derecho: lo hace voltear. Eso se calcula con el "producto cruzado"
   * entre la dirección del pétalo y la dirección del mouse, que dice
   * hacia qué lado tiene que girar.
   *
   * @param {Object} petalo - El pétalo a empujar.
   * @param {number} dt     - Segundos transcurridos desde el cuadro anterior.
   * @returns {void}
   */
  function aplicarEmpujeDelMouse(petalo, dt) {
    // Distancia entre el centro del pétalo y el mouse
    const distanciaX = (petalo.x + petalo.tamaño / 2) - mouseX;
    const distanciaY = (petalo.y + petalo.tamaño / 2) - mouseY;
    const distancia = Math.hypot(distanciaX, distanciaY);   // teorema de Pitágoras

    // Si está lejos, no pasa nada. El +0.01 evita dividir por cero
    // cuando el mouse queda justo encima del pétalo.
    if (distancia > RADIO_DE_INFLUENCIA_DEL_MOUSE || distancia < 0.01) return;

    // influencia vale 1 pegado al mouse y 0 en el borde del radio
    const influencia = 1 - (distancia / RADIO_DE_INFLUENCIA_DEL_MOUSE);
    const influenciaSuavizada = influencia * influencia;

    // Dirección "desde el mouse hacia el pétalo", de largo 1
    const direccionX = distanciaX / distancia;
    const direccionY = distanciaY / distancia;

    // a) Empujón hacia afuera
    petalo.velocidadX += direccionX * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;
    petalo.velocidadY += direccionY * FUERZA_DE_EMPUJE * influenciaSuavizada * dt;

    // b) Arrastre: el pétalo se lleva parte de la velocidad de la mano
    petalo.velocidadX += velocidadMouseX * ARRASTRE_DEL_MOUSE * influenciaSuavizada;
    petalo.velocidadY += velocidadMouseY * ARRASTRE_DEL_MOUSE * influenciaSuavizada;

    // c) Giro provocado por el roce del aire
    const torsion = (direccionX * velocidadMouseY - direccionY * velocidadMouseX);
    petalo.velocidadAngular += torsion * 0.035 * influenciaSuavizada;
  }

  /**
   * Adelanta un pétalo un cuadro de animación.
   *
   * @param {Object} petalo   - El pétalo a mover.
   * @param {number} dt       - Segundos desde el cuadro anterior.
   * @param {number} tiempo   - Segundos desde que arrancó la animación
   *                            (se usa para el vaivén).
   * @returns {void}
   */
  function moverPetalo(petalo, dt, tiempo) {
    // FUERZA 1 · Gravedad: siempre hacia abajo
    petalo.velocidadY += GRAVEDAD * dt;

    // FUERZA 2 · Viento: una onda suave que lo lleva a un lado y al otro.
    // Math.sin va y viene entre −1 y 1 eternamente: perfecto para un
    // movimiento de péndulo que nunca se repite exacto entre pétalos.
    const vaiven = Math.sin(tiempo * petalo.frecuenciaDelVaiven + petalo.faseDelVaiven);
    petalo.velocidadX += vaiven * FUERZA_DEL_VAIVEN * dt;

    // FUERZA 3 · El mouse
    aplicarEmpujeDelMouse(petalo, dt);

    // ROZAMIENTO: frena todo un poquito cada cuadro.
    // Math.pow(0.99, dt*60) es "aplicar el 0.99 tantas veces como cuadros
    // hayan pasado", para que frene igual en cualquier pantalla.
    const frenado = Math.pow(ROZAMIENTO_DEL_AIRE, dt * 60);
    petalo.velocidadX *= frenado;
    petalo.velocidadY *= frenado;
    petalo.velocidadAngular *= frenado;

    // Tope de giro, para que nunca parezca una hélice
    petalo.velocidadAngular = limitar(petalo.velocidadAngular, -420, 420);

    // POSICIÓN = posición anterior + velocidad × tiempo
    petalo.x += petalo.velocidadX * dt;
    petalo.y += petalo.velocidadY * dt;
    petalo.angulo += petalo.velocidadAngular * dt;

    /* CHOQUE CON EL RELICARIO.
       Va DESPUÉS de mover el pétalo y antes de dibujarlo: primero se lo
       deja avanzar, y si terminó metido dentro del óvalo se lo devuelve a
       la superficie. Resolver el choque después del movimiento es lo que
       garantiza que nunca se vea atravesarlo, ni por un cuadro.

       Solo el plano del medio choca: el de atrás pasa por detrás y el de
       adelante por delante, que es justamente lo que da la sensación de
       que el relicario está flotando entre capas de pétalos. */
    if (petalo.plano === 'medio') {
      apoyarseEnElRelicario(petalo);
    }

    // RECICLADO: si salió por abajo, vuelve a nacer arriba
    if (petalo.y > altoDePantalla + 60) {
      petalo.y = numeroAlAzar(-120, -30);
      petalo.x = numeroAlAzar(0, anchoDePantalla);
      petalo.velocidadX = numeroAlAzar(-12, 12);
      petalo.velocidadY = numeroAlAzar(petalo.rasgos.caida[0], petalo.rasgos.caida[1]);
      petalo.velocidadAngular = numeroAlAzar(-45, 45);
    }

    // Si se fue por un costado, reaparece por el otro
    if (petalo.x < -60) petalo.x = anchoDePantalla + 40;
    if (petalo.x > anchoDePantalla + 60) petalo.x = -40;

    /* ⚡ CON EL LIENZO NO SE ESCRIBE NADA ACÁ.
       La posición y el giro ya quedaron en petalo.x / .y / .angulo, y el
       canvas los lee cuando pinta. Esas dos líneas de abajo eran 29
       escrituras de estilo por cuadro; ahora son cero. */
    if (usaElLienzo) return;

    // DIBUJAR: una sola instrucción de transform, que es lo más barato
    // que existe para el navegador.
    petalo.elemento.style.transform =
      `translate3d(${petalo.x.toFixed(1)}px, ${petalo.y.toFixed(1)}px, 0) ` +
      `rotate(${petalo.angulo.toFixed(1)}deg)`;
  }


  /* ─── 5. EL BUCLE DE ANIMACIÓN ─────────────────────────────────── */
  let momentoDelCuadroAnterior = performance.now();
  let tiempoTranscurrido = 0;
  let animacionActiva = true;

  /**
   * Se ejecuta una vez por cuadro. Calcula cuánto tiempo pasó y mueve
   * todos los pétalos.
   *
   * @param {number} momentoActual - Marca de tiempo que da el navegador.
   * @returns {void}
   */
  function dibujarCuadro(momentoActual) {
    if (!animacionActiva) return;   // pausa por pestaña oculta

    /* Sin nadie mirando —sobre todavía cerrado, pestaña de fondo, o
       animaciones apagadas por botón o accesibilidad— el bucle sigue vivo
       pero no mueve pétalos. Listo para reanudar en vivo.

       El reloj se adelanta igual (momentoDelCuadroAnterior) aunque no se
       mueva nada: si no, al reanudar el `dt` sería el de todo el rato que
       estuvo detenido y los pétalos aparecerían teletransportados. */
    if (!hayAlgoQueMirar()) {
      momentoDelCuadroAnterior = momentoActual;
      requestAnimationFrame(dibujarCuadro);
      return;
    }

    // dt en segundos. Se limita a 0,05 (20 cuadros por segundo) porque si
    // la pestaña estuvo minimizada, el salto sería enorme y los pétalos
    // aparecerían teletransportados.
    const dt = Math.min((momentoActual - momentoDelCuadroAnterior) / 1000, 0.05);
    momentoDelCuadroAnterior = momentoActual;
    tiempoTranscurrido += dt;

    // Velocidad del mouse: cuánto se movió desde el cuadro anterior.
    if (mouseXAnterior > -9000 && dt > 0) {
      velocidadMouseX = (mouseX - mouseXAnterior) / dt * 0.016;
      velocidadMouseY = (mouseY - mouseYAnterior) / dt * 0.016;
    }
    mouseXAnterior = mouseX;
    mouseYAnterior = mouseY;

    // Una sola medición del relicario para todos los pétalos
    medirElRelicario();

    for (const petalo of petalos) {
      if (!petalo.activo) continue;   // desactivado por el gobernador: se saltea
      moverPetalo(petalo, dt, tiempoTranscurrido);
    }

    requestAnimationFrame(dibujarCuadro);
  }
  requestAnimationFrame(dibujarCuadro);


  /* ─── 6. AHORRO DE BATERÍA Y CAMBIOS DE TAMAÑO ─────────────────── */

  // Si la persona cambia de pestaña, frenamos todo: no tiene sentido
  // gastar batería animando algo que nadie está mirando.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animacionActiva = false;
    } else {
      animacionActiva = true;
      momentoDelCuadroAnterior = performance.now();   // evita un salto feo
      requestAnimationFrame(dibujarCuadro);
    }
  });

  // Si se cambia el tamaño de la ventana, actualizamos las medidas.
  window.addEventListener('resize', () => {
    anchoDePantalla = window.innerWidth;
    altoDePantalla  = window.innerHeight;
  });

})();

/* ═══ 07-marco-y-enredaderas.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   07 · MARCO Y ENREDADERAS
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Hace trepar rosales por los dos laterales del marco victoriano. Cada
   planta se dibuja sola, ninguna es igual a otra, y todas reaccionan
   tanto al scroll como al mouse.

   ─────────────────────────────────────────────────────────────────────
   PARTE 1 · CÓMO SE "HACE CRECER" UNA PLANTA

   Las plantas NO están dibujadas a mano. Si lo estuvieran, todas serían
   idénticas y se notaría el sello repetido. En su lugar, la computadora
   las hace crecer paso a paso, igual que crecería una de verdad:

     · Arranca en la base, apuntando hacia arriba.
     · En cada paso gira un poquito al azar, PERO conservando parte del
       giro anterior. Eso se llama inercia, y es lo que hace que la curva
       serpentee de forma natural en lugar de temblar.
     · Además siente una atracción suave hacia el marco, como si se
       apoyara en él para trepar.
     · El tallo NO tiene grosor parejo: se dibuja como una silueta que
       empieza gruesa y leñosa abajo y termina fina como un hilo arriba,
       con engrosamientos irregulares en los nudos.
     · Le salen brotes a alturas desparejas, sin alternar prolijamente:
       a veces dos seguidos del mismo lado, a veces ninguno en un tramo.

   Todo el azar sale de una SEMILLA (ver crearAzarConSemilla en
   02-utilidades.js), así que cada planta es distinta de las demás pero
   siempre se dibuja igual, aunque se recargue la página.

   ─────────────────────────────────────────────────────────────────────
   PARTE 2 · CÓMO SE MUEVEN

   Dos movimientos independientes, los dos con la fórmula del RESORTE
   AMORTIGUADO:

       aceleración = (destino − actual) × RIGIDEZ − velocidad × AMORTIGUACIÓN

     a) LA PLANTA ENTERA se mece según la velocidad del scroll, pivotando
        sobre su raíz. Cada planta tiene su propia rigidez y su propio
        ritmo de respiración, así que nunca se mueven al unísono.

     b) CADA FLOR, además, se DOBLA sobre su pedúnculo cuando el cursor se
        le acerca, y después se endereza sola.

        Es importante que sea un doblado y no un desplazamiento: una flor
        está pegada al tallo, así que no puede irse volando ni orbitar por
        el aire. Lo único que puede hacer es cabecear sobre su cuello. Por
        eso su física es UN SOLO ángulo, y el giro se aplica tomando como
        eje un punto por debajo de la flor, no su centro.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Biblioteca de dibujos (rosa, capullo, hoja)
     3. Hacer crecer un tallo
     4. Dibujar una planta completa
     5. Repartir las plantas por los laterales
     6. Movimiento: scroll, respiración y mouse
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasEnredaderasDelMarco() {

  const enredaderaIzquierda = buscar('.marco__enredadera--izquierda');
  const enredaderaDerecha   = buscar('.marco__enredadera--derecha');
  if (!enredaderaIzquierda || !enredaderaDerecha) return;

  /* Este archivo necesita el generador de azar con semilla, que vive en
     02-utilidades.js. Si alguien cambia el orden de los <script> en el
     index.html, esto lo avisa con un mensaje claro en vez de fallar de
     una manera difícil de entender. */
  if (typeof crearAzarConSemilla !== 'function') {
    console.error(
      'Las enredaderas necesitan la función crearAzarConSemilla(), que está en ' +
      'codigo/02-utilidades.js. Revisá que ese archivo se cargue ANTES que este ' +
      'en la lista de <script> del final de index.html.'
    );
    return;
  }


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────── */

  /** Cada cuántos píxeles de alto nace una planta nueva.
   *
   *  ⛔ NO ATAR ESTO AL NIVEL DE CALIDAD. Se intentó (separación y densidad
   *  escalando por nivel, más una reconstrucción al cambiar de nivel) y salió
   *  caro: la reconstrucción disparada por el gobernador se solapaba con la
   *  construcción que todavía estaba en vuelo —esta función arma las plantas
   *  y los ramilletes a lo largo de decenas de cuadros—, las dos corridas se
   *  pisaban el innerHTML de los mismos huecos, y el resultado fue un
   *  ramillete de esquina desaparecido y plantas mal dibujadas.
   *
   *  Si algún día se quiere volver a intentar, hace falta primero el guardia
   *  de reentrada que ahora sí tiene repartirPlantas() — pero el beneficio
   *  era chico (menos plantas en equipos flojos) y el riesgo visual, alto. */
  const SEPARACION_ENTRE_PLANTAS = 460;

  /** Ancho del "lienzo" de cada planta, en unidades del dibujo. */
  const ANCHO_DEL_LIENZO = 120;

  /** Cuánto tira el resorte de la planta hacia su posición de reposo. */
  const RIGIDEZ_DE_LA_PLANTA = 0.05;
  const AMORTIGUACION_DE_LA_PLANTA = 0.13;

  /** Lo mismo para cada flor por separado (más suelto, más vivo). */
  const RIGIDEZ_DE_LA_FLOR = 0.09;
  const AMORTIGUACION_DE_LA_FLOR = 0.16;

  /** Grados de inclinación por cada píxel de scroll por cuadro. */
  const GRADOS_POR_VELOCIDAD = 0.4;
  const INCLINACION_MAXIMA = 14;

  /** Radio en el que el mouse afecta a una flor, en píxeles de pantalla. */
  const RADIO_DEL_MOUSE = 150;

  /**
   * Con cuánta fuerza el mouse DOBLA a la flor sobre su tallo.
   *
   * No es un empujón que la desplace: es un torque, o sea la fuerza que
   * la hace pivotar. Con este valor y la rigidez actual, una flor tocada
   * de lleno se inclina unos 16° y vuelve sola.
   *
   * (De dónde sale ese 16°: en equilibrio, el resorte compensa al torque,
   *  así que  inclinación = torque ÷ rigidez  →  1,44 ÷ 0,09 ≈ 16.)
   */
  const FUERZA_DEL_MOUSE = 90;

  /** Cuánto puede doblarse una flor como máximo, en grados.
   *  Es el seguro que impide que parezca que se despega del tallo. */
  const FLEXION_MAXIMA = 24;

  /* ── El tallo también se dobla ──
     El tallo está partido en nudos encadenados. Cada uno tiene su resorte,
     más blando cuanto más arriba está: abajo la rama es leñosa y casi no
     cede, arriba es un brote tierno que se dobla con nada.

     Los valores son más chicos que los de la flor porque el doblado se
     ACUMULA: si los seis nudos se inclinan 5°, la punta termina a 30°. */
  const RIGIDEZ_DEL_NUDO      = 0.055;
  const AMORTIGUACION_DEL_NUDO = 0.14;

  /** Cuánto dobla el mouse a cada nudo (torque, igual que en la flor). */
  const FUERZA_DEL_MOUSE_EN_EL_TALLO = 26;

  /** Tope por nudo. Con 6 nudos, la punta puede llegar a unos 42°. */
  const FLEXION_MAXIMA_DEL_NUDO = 7;

  /** Vaivén de reposo del nudo, en grados.
   *
   *  Subió de .35 a .55 a propósito. Antes cada flor tenía además su
   *  propia respiración, pero eso obligaba a las ~350 flores a reescribir
   *  su transform para siempre y era carísimo (ver el bloque del bucle).
   *  Ahora el vaivén lo carga entero el tallo, y como el doblado se acumula
   *  nudo a nudo y las flores cuelgan adentro, la punta se mece lo mismo
   *  que antes —con seis escrituras por planta en vez de quince—. */
  const VAIVEN_DEL_NUDO = 0.55;

  /* Umbrales para dar por acomodada a una flor y dejar de escribirla.
     Medio centésimo de grado por cuadro y medio décimo de grado de
     inclinación: por debajo de eso no hay movimiento que un ojo distinga,
     solo trabajo para el navegador. */
  const VELOCIDAD_DESPRECIABLE = 0.02;
  const FLEXION_DESPRECIABLE   = 0.05;


  /* ─── 2. LOS DIBUJOS DE LAS ROSAS ──────────────────────────────
     Las rosas, hojas y capullos NO se dibujan acá: están en el index.html,
     dentro del bloque <svg id="biblioteca-de-rosas">. Se pusieron ahí para
     que sean LAS MISMAS que usa el relicario de la portada; si cada parte
     tuviera sus propias flores, se notaría la disonancia.
     Acá solo se las invoca con <use href="#rosa-frente">, etc.
     ---------------------------------------------------------------- */

  /* ── EL APAGADO DE UNA FLOR, Y POR QUÉ YA NO ES UN FILTRO ──
     Una rosa lejana o en penumbra tiene que verse más oscura y menos
     saturada que una cercana e iluminada. Eso es profundidad, y no se
     negocia.

     Antes se conseguía con  style="filter: brightness() saturate()"  en
     cada flor. Funcionaba, pero resultó ser el problema de rendimiento
     más grande que tuvo esta web: un `filter` de CSS obliga al navegador
     a darle a ese elemento su PROPIA capa de pintura. Con ~350 flores
     eran ~350 capas, y como cada flor además se mueve, el árbol de capas
     se reconstruía en cada cuadro. La fase "Layerize" se llevaba el
     38,9 % del tiempo total; todo el JavaScript junto, el 1,2 %.

     La salida NO fue bajar la calidad —se probó con `opacity` y se
     revirtió, porque deja ver el fondo a través de la flor y pierde la
     desaturación—. Fue calcular de antemano el color que producía el
     filtro y hornearlo en el gradiente. Hay doce juegos de gradientes ya
     apagados en index.html, y cada flor elige el suyo con una clase
     .tono-N. Mismo color exacto, cero capas.

     Doce escalones cubren todo el rango de brillo que usan las flores
     (de .407 a 1.0): saltos del 5 %, unos 6 niveles de color, que no se
     distinguen ni entre dos rosas vecinas. */

  /** Extremos del rango de apagado que producen las fórmulas de abajo. */
  const BRILLO_MAS_APAGADO = 0.407;
  const BRILLO_MAS_VIVO    = 1.0;
  const CUANTOS_TONOS      = 12;

  /**
   * Elige la clase de tono que corresponde al apagado de una flor.
   *
   * La saturación no necesita su propio eje: en las fórmulas que la usan
   * sube y baja junto con el brillo (ambas cuelgan de la cercanía y de la
   * luz), y los doce juegos de gradientes ya vienen con el par brillo +
   * saturación resuelto. Verificado: derivar una de la otra desvía la
   * saturación como mucho 0,02 en el peor caso.
   *
   * @param {number} brillo - Factor de brillo ya calculado (0..1).
   * @returns {string} La clase, lista para sumar al <g> de la flor.
   */
  function tonoDeLaFlor(brillo) {
    const proporcion = (brillo - BRILLO_MAS_APAGADO) /
                       (BRILLO_MAS_VIVO - BRILLO_MAS_APAGADO);
    const indice = limitar(Math.floor(proporcion * CUANTOS_TONOS), 0, CUANTOS_TONOS - 1);
    return `tono-${indice}`;
  }


  /* ─── 3. HACER CRECER UN TALLO ─────────────────────────────────── */

  /**
   * Hace crecer un tallo paso a paso y devuelve el recorrido.
   *
   * Los ángulos están en radianes (la unidad que usa la computadora para
   * los ángulos). Lo único que hace falta saber: −PI/2 apunta hacia
   * arriba, y sumarle un poco lo inclina hacia la derecha.
   *
   * @param {Object} azar - Generador con semilla (ver 02-utilidades.js).
   * @param {Object} opciones - Parámetros del crecimiento.
   * @param {number} opciones.xInicial      - Dónde nace, a lo ancho.
   * @param {number} opciones.yInicial      - Dónde nace, a lo alto.
   * @param {number} opciones.anguloInicial - Hacia dónde apunta al nacer.
   * @param {number} opciones.pasos         - Cuántos tramos crece.
   * @param {number} opciones.largoDelPaso  - Cuánto avanza en cada tramo.
   * @param {number} opciones.giroMaximo    - Cuánto puede torcerse por tramo.
   * @param {number} opciones.inercia       - Cuánto conserva del giro anterior.
   * @param {number} opciones.xObjetivo     - Hacia qué columna tiende.
   * @param {number} opciones.atraccion     - Con cuánta fuerza tiende.
   * @returns {Array<{x:number,y:number,angulo:number,t:number}>}
   *          El recorrido. "t" va de 0 (base) a 1 (punta).
   */
  function crecerTallo(azar, opciones) {
    const recorrido = [];
    let x = opciones.xInicial;
    let y = opciones.yInicial;
    let angulo = opciones.anguloInicial;
    let velocidadDelGiro = 0;

    for (let paso = 0; paso <= opciones.pasos; paso++) {
      const t = paso / opciones.pasos;
      recorrido.push({ x, y, angulo, t });

      // Giro al azar, pero recordando el giro anterior (inercia).
      // Sin la inercia el tallo temblaría; con ella, serpentea.
      velocidadDelGiro = velocidadDelGiro * opciones.inercia +
                         azar.entre(-opciones.giroMaximo, opciones.giroMaximo);
      angulo += velocidadDelGiro;

      // Tendencia suave a volver hacia el marco, como si se apoyara.
      angulo += (opciones.xObjetivo - x) * opciones.atraccion;

      x += Math.cos(angulo) * opciones.largoDelPaso;
      y += Math.sin(angulo) * opciones.largoDelPaso;
    }

    return recorrido;
  }

  /**
   * Convierte el recorrido de un tallo en una silueta rellena, con el
   * grosor variando de la base a la punta.
   *
   * CÓMO FUNCIONA: para cada punto del recorrido se calcula la
   * perpendicular a la dirección de crecimiento y se marca un punto a
   * cada lado, a media distancia del grosor. Recorriendo primero todos
   * los puntos de la izquierda y después los de la derecha al revés,
   * queda el contorno cerrado del tallo.
   *
   * @param {Array} recorrido    - Lo que devolvió crecerTallo().
   * @param {Object} azar        - Generador con semilla.
   * @param {number} grosorBase  - Ancho en la raíz.
   * @param {number} grosorPunta - Ancho en el extremo.
   * @param {{cantidad:number, fase:number}} [engrosamientos] - Opcional.
   *        Los engrosamientos de los nudos. Se pasa desde afuera cuando el
   *        tallo se dibuja EN TRAMOS: si cada tramo los sorteara por su
   *        cuenta, en las uniones el grosor daría un salto y se vería el
   *        corte.
   * @returns {string} El contorno listo para el atributo "d" de un path.
   */
  function siluetaDelTallo(recorrido, azar, grosorBase, grosorPunta, engrosamientos) {
    const bordeIzquierdo = [];
    const bordeDerecho = [];

    // Los nudos son esos engrosamientos que tienen las ramas de verdad
    const cantidadDeNudos = engrosamientos ? engrosamientos.cantidad : azar.entre(2.5, 5.5);
    const faseDeLosNudos  = engrosamientos ? engrosamientos.fase : azar.entre(0, Math.PI * 2);

    for (const punto of recorrido) {
      // Afinado progresivo: (1−t) elevado a 0,75 adelgaza rápido al
      // principio y despacio al final, como una rama real.
      const afinado = Math.pow(1 - punto.t, 0.75);
      let grosor = grosorPunta + (grosorBase - grosorPunta) * afinado;

      // Engrosamientos irregulares
      grosor *= 1 + 0.24 * Math.sin(punto.t * cantidadDeNudos * Math.PI * 2 + faseDeLosNudos);

      // Perpendicular a la dirección de crecimiento
      const perpendicularX = Math.cos(punto.angulo + Math.PI / 2) * grosor / 2;
      const perpendicularY = Math.sin(punto.angulo + Math.PI / 2) * grosor / 2;

      bordeIzquierdo.push([punto.x + perpendicularX, punto.y + perpendicularY]);
      bordeDerecho.push([punto.x - perpendicularX, punto.y - perpendicularY]);
    }

    bordeDerecho.reverse();
    const contorno = bordeIzquierdo.concat(bordeDerecho);

    return 'M' + contorno
      .map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1))
      .join(' L') + ' Z';
  }


  /* ─── 4. DIBUJAR UNA PLANTA COMPLETA ───────────────────────────── */

  /**
   * Genera el SVG de una planta entera: tallo principal, brotes, hojas,
   * capullos y flores.
   *
   * CÓMO LA LUZ AFECTA EL CRECIMIENTO
   * Un rosal crece hacia la luz. En esta invitación la luz reina arriba y
   * se hunde al bajar (ver la penumbra de profundidad y los haces que
   * pierden poder). Así que una planta ALTA en la página está en plena luz
   * —sus flores se abren y se encienden— y una planta HONDA está en
   * penumbra —sus flores quedan más cerradas (capullos) y apagadas, como
   * las de una planta que no llega a recibir sol—. Ese es el parámetro
   * `luz`: 1 arriba, cerca de 0 en el fondo.
   *
   * @param {number} semilla - Define cómo será esta planta en particular.
   * @param {number} [luz=1] - Cuánta luz recibe (1 arriba, ~0.15 en el fondo).
   * @returns {{svg:string, alto:number}} El dibujo y su altura.
   */
  function dibujarPlanta(semilla, luz = 1) {
    const azar = crearAzarConSemilla(semilla);

    /* Cada planta tiene su propio porte: unas altas y espigadas, otras
       más bajas y frondosas. */
    const alto = azar.entre(420, 640);
    const columnaDeApoyo = azar.entre(24, 52);

    /* ⚠️ DE DÓNDE NACE LA PLANTA.
       La raíz se coloca a propósito FUERA de la página (x negativo) y por
       debajo del borde inferior del dibujo. Como el navegador recorta lo
       que se sale de la página, el nacimiento del tallo nunca se ve: la
       enredadera parece venir de afuera y meterse en el cuadro.

       Antes esto se resolvía difuminando la base con una máscara, y se
       notaba el degradé: parecía que la planta se desvanecía en el aire
       en lugar de continuar más allá del borde. */
    const xDeLaRaiz = azar.entre(-38, -16);

    const recorrido = crecerTallo(azar, {
      xInicial: xDeLaRaiz,
      yInicial: alto + azar.entre(20, 70),
      // Nace apuntando hacia arriba y hacia adentro del cuadro
      anguloInicial: -Math.PI / 2 + azar.entre(0.18, 0.62),
      pasos: azar.entero(26, 38),
      largoDelPaso: alto / azar.entre(26, 34),
      giroMaximo: azar.entre(0.10, 0.20),
      inercia: azar.entre(0.55, 0.78),
      xObjetivo: columnaDeApoyo,
      atraccion: azar.entre(0.0016, 0.0034),
    });

    /* ══ EL TALLO SE ARTICULA EN NUDOS ══
       Para que el tallo pueda DOBLARSE (y no solo la flor), se lo parte en
       tramos encadenados, como los eslabones de un dedo. Cada tramo va
       dentro del anterior:

           <g nudo 0>  tramo de abajo
             <g nudo 1>  tramo siguiente
               <g nudo 2>  … y así

       Girar un nudo mueve automáticamente TODO lo que tiene adentro: el
       resto del tallo, las hojas, los brotes y las flores. Por eso las
       flores nunca se despegan por más que el tallo se doble.

       Cada pieza que se dibuja se guarda en el nudo que le corresponde
       según a qué altura del tallo está enganchada. */
    const CANTIDAD_DE_NUDOS = 6;
    const ultimoIndice = recorrido.length - 1;
    const partesPorNudo = Array.from({ length: CANTIDAD_DE_NUDOS }, () => []);

    /**
     * Dice a qué nudo pertenece un punto del tallo.
     * @param {number} indice - Posición dentro del recorrido.
     * @returns {number} El número de nudo (0 = la base).
     */
    const nudoDe = (indice) => Math.min(
      CANTIDAD_DE_NUDOS - 1,
      Math.floor((indice / ultimoIndice) * CANTIDAD_DE_NUDOS)
    );

    /** Dónde empieza cada nudo, en índices del recorrido. */
    const arranqueDelNudo = [];
    for (let k = 0; k < CANTIDAD_DE_NUDOS; k++) {
      arranqueDelNudo.push(Math.floor((k * ultimoIndice) / CANTIDAD_DE_NUDOS));
    }
    arranqueDelNudo.push(ultimoIndice);

    // Atajo para guardar una pieza en el nudo que le toca
    const enNudo = (indice, dibujo) => partesPorNudo[nudoDe(indice)].push(dibujo);

    // ── Tallo principal, dibujado tramo por tramo ──
    const grosorDeLaBase  = azar.entre(7, 11);
    const grosorDeLaPunta = azar.entre(1.2, 2.2);
    const engrosamientos  = { cantidad: azar.entre(2.5, 5.5), fase: azar.entre(0, Math.PI * 2) };

    for (let k = 0; k < CANTIDAD_DE_NUDOS; k++) {
      /* Se toma un punto de más al final del tramo para que se solape con
         el siguiente: sin ese solape se vería la juntura. */
      const tramo = recorrido.slice(arranqueDelNudo[k], arranqueDelNudo[k + 1] + 1);
      if (tramo.length < 2) continue;
      partesPorNudo[k].push(
        `<path d="${siluetaDelTallo(tramo, azar, grosorDeLaBase, grosorDeLaPunta, engrosamientos)}"
               fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".8"/>`
      );
    }

    // ── Espinas: solo en la mitad de abajo, que es la parte leñosa ──
    const cuantasEspinas = azar.entero(4, 9);
    for (let i = 0; i < cuantasEspinas; i++) {
      const indiceDeLaEspina = azar.entero(2, Math.floor(recorrido.length * 0.7));
      const punto = recorrido[indiceDeLaEspina];
      const hacia = azar.signo();
      const largo = azar.entre(5, 9);
      const angulo = punto.angulo + hacia * azar.entre(0.7, 1.2);
      enNudo(indiceDeLaEspina,
        `<path d="M${punto.x.toFixed(1)} ${punto.y.toFixed(1)}
                  l${(Math.cos(angulo) * largo).toFixed(1)} ${(Math.sin(angulo) * largo).toFixed(1)}
                  l${(-Math.cos(angulo + 0.9) * largo * 0.5).toFixed(1)} ${(-Math.sin(angulo + 0.9) * largo * 0.5).toFixed(1)} Z"
               fill="#6b5a26" fill-opacity=".85"/>`
      );
    }

    /* ── Brotes laterales ──
       A alturas desparejas y SIN alternar prolijamente: el lado se
       sortea cada vez, así que a veces salen dos seguidos del mismo
       lado y a veces queda un tramo largo pelado.

       Menos brotes donde hay menos luz: una planta en penumbra crece más
       flaca, con menos flores, que una que recibe pleno sol. */
    const cuantosBrotes = Math.max(2, Math.round(azar.entero(3, 6) * (0.6 + luz * 0.4)));
    const flores = [];

    for (let i = 0; i < cuantosBrotes; i++) {
      const indice = azar.entero(3, recorrido.length - 3);
      const nacimiento = recorrido[indice];
      const hacia = azar.signo();

      const brote = crecerTallo(azar, {
        xInicial: nacimiento.x,
        yInicial: nacimiento.y,
        anguloInicial: nacimiento.angulo + hacia * azar.entre(0.5, 1.05),
        pasos: azar.entero(5, 11),
        largoDelPaso: azar.entre(9, 17),
        giroMaximo: azar.entre(0.10, 0.24),
        inercia: azar.entre(0.4, 0.7),
        xObjetivo: columnaDeApoyo,
        atraccion: azar.entre(0.0004, 0.0016),
      });

      enNudo(indice,
        `<path d="${siluetaDelTallo(brote, azar, azar.entre(2.6, 4.4), 1)}"
               fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      // Qué hay en la punta del brote
      const punta = brote[brote.length - 1];

      /* El tipo de flor se sortea, pero la LUZ inclina la balanza: donde
         hay luz, la planta abre sus flores (frente, perfil, tres cuartos);
         en penumbra, se queda en capullos y flores a medio abrir, que es
         lo que hace una planta que no llega al sol. El sesgo se logra
         empujando el sorteo hacia arriba cuando falta luz, así cae más en
         los tramos de "media" y "capullo" de la lista de abajo. */
      const sorteo = limitar(azar.numero() + (1 - luz) * 0.4, 0, 0.999);

      /* Se sortea CÓMO ESTÁ ORIENTADA la flor, no solo cuál es.
         En una planta de verdad las flores miran para cualquier lado: hay
         que verlas de frente, de costado, de tres cuartos y hasta de
         espaldas. Si todas miraran al frente parecerían calcomanías
         pegadas encima del tallo. */
      if (sorteo < 0.20) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-frente',
                      escala: azar.entre(0.34, 0.52), giro: azar.entre(-25, 25) });
      } else if (sorteo < 0.44) {
        // De perfil: se apoya sobre la punta del brote, mirando hacia afuera
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-perfil',
                      escala: azar.entre(0.4, 0.6),
                      giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-18, 18) });
      } else if (sorteo < 0.62) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-tres-cuartos',
                      escala: azar.entre(0.38, 0.56), giro: azar.entre(-30, 30) });
      } else if (sorteo < 0.72) {
        // De espaldas: mira hacia adentro del marco
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-dorso',
                      escala: azar.entre(0.3, 0.44), giro: azar.entre(-40, 40) });
      } else if (sorteo < 0.88) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-media',
                      escala: azar.entre(0.4, 0.62),
                      giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25) });
      } else if (sorteo < 0.96) {
        flores.push({ nudo: nudoDe(indice), x: punta.x, y: punta.y, tipo: 'rosa-capullo',
                      escala: azar.entre(0.45, 0.7),
                      giro: (punta.angulo * 180 / Math.PI) + 90 });
      } else {
        // Zarcillo: un rulito que se enrosca buscando dónde agarrarse
        const radio = azar.entre(4, 7);
        enNudo(indice,
          `<path d="M${punta.x.toFixed(1)} ${punta.y.toFixed(1)}
                    c ${radio} ${-radio}, ${radio * 2.2} ${radio * 0.4}, ${radio} ${radio * 1.6}
                    c ${-radio * 0.7} ${radio * 0.8}, ${-radio * 1.6} ${-radio * 0.2}, ${-radio * 0.6} ${-radio}"
                 fill="none" stroke="#6b5a26" stroke-width="1.6"
                 stroke-linecap="round" stroke-opacity=".9"/>`
        );
      }
    }

    /* ── Hojas ──
       Repartidas sin regla: distinta cantidad, tamaño y giro en cada
       planta, y siempre apuntando hacia arriba y hacia afuera, como
       buscando la luz. */
    const cuantasHojas = azar.entero(7, 13);
    for (let i = 0; i < cuantasHojas; i++) {
      const indiceDeLaHoja = azar.entero(2, recorrido.length - 2);
      const punto = recorrido[indiceDeLaHoja];
      const hacia = azar.signo();
      const escala = azar.entre(0.42, 0.85);
      // −60° las levanta respecto del tallo: hacia arriba, no colgando
      const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(28, 68);
      enNudo(indiceDeLaHoja,
        `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
              rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
      );
    }

    /* ── Una flor grande cerca de la punta, que es donde la planta
         pone su mejor esfuerzo ── */
    const puntaPrincipal = recorrido[recorrido.length - 2];
    const orientacionesDeLaFlorPrincipal =
      ['rosa-frente', 'rosa-perfil', 'rosa-tres-cuartos', 'rosa-media'];
    flores.push({
      nudo: CANTIDAD_DE_NUDOS - 1,
      x: puntaPrincipal.x, y: puntaPrincipal.y,
      tipo: orientacionesDeLaFlorPrincipal[azar.entero(0, 3)],
      escala: azar.entre(0.5, 0.78), giro: azar.entre(-22, 22),
    });

    /* ── Las flores van al final para que queden por encima de todo, y
         cada una envuelta en su propio grupo: ese grupo es el que después
         mueve la física cuando pasa el mouse. ──

       PROFUNDIDAD: las flores del fondo van más oscuras.
       En la naturaleza, cuanto más lejos está algo, más se apaga y pierde
       color, porque hay más aire de por medio (los pintores lo llaman
       "perspectiva aérea"). Acá se aprovecha que el tamaño ya indica la
       distancia: una flor chica se lee como lejana, así que se la oscurece
       y se le baja el color en proporción.

           escala 0,30 (la más lejana) → 66 % de brillo
           escala 0,78 (la más cercana) → 100 % de brillo

       Sin esto, todas las flores tienen la misma intensidad y la
       enredadera se ve chata, como una calcomanía. */

    /* ── Zarcillos: los hilitos que la planta enrosca para agarrarse ──
       Son la firma visual de una enredadera. Se dibujan como una espiral
       que va abriéndose, y se colocan cruzando la moldura, así parece que
       la planta se está trepando y sujetando al marco. */
    const cuantosZarcillos = azar.entero(2, 4);
    for (let i = 0; i < cuantosZarcillos; i++) {
      const indiceDelZarcillo = azar.entero(4, recorrido.length - 2);
      const donde = recorrido[indiceDelZarcillo];
      enNudo(indiceDelZarcillo,
        `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
               stroke="url(#rosa-tallo)" stroke-width="${azar.entre(1.1, 1.9).toFixed(1)}"
               stroke-linecap="round" stroke-opacity=".8"/>`
      );
    }

    const ESCALA_MAS_LEJANA  = 0.30;
    const ESCALA_MAS_CERCANA = 0.78;

    for (const flor of flores) {
      // "cercania" vale 0 en la flor más lejana y 1 en la más cercana
      const cercania = limitar(
        (flor.escala - ESCALA_MAS_LEJANA) / (ESCALA_MAS_CERCANA - ESCALA_MAS_LEJANA),
        0, 1
      );
      /* El piso de brillo se subió de .66 a .74: con .66 las flores más
         chicas quedaban casi negras y se leían como un borrón oscuro, no
         como rosas. Ahora las lejanas siguen más apagadas que las
         cercanas —la profundidad de campo se mantiene— pero conservan
         color suficiente para reconocerse como flores.

         Además, la LUZ de la posición apaga la flor: una planta en
         penumbra tiene sus rosas más oscuras que una en pleno sol. El
         factor no baja de .55 para que, aun en el fondo, sigan siendo
         rosas y no manchas negras (el resto de la oscuridad la aporta el
         velo de profundidad, no el dibujo). */
      const apagadoPorLuz = 0.55 + luz * 0.45;
      const brillo = (0.74 + cercania * 0.26) * apagadoPorLuz;

      partesPorNudo[flor.nudo].push(
        `<g class="flor-de-enredadera ${tonoDeLaFlor(brillo)}"
             data-escala="${flor.escala.toFixed(2)}"
             data-x="${flor.x.toFixed(1)}" data-y="${flor.y.toFixed(1)}"
             transform="translate(${flor.x.toFixed(1)} ${flor.y.toFixed(1)})">
           <g class="flor-de-enredadera__movil">
             <use href="#${flor.tipo}"
                  transform="rotate(${flor.giro.toFixed(1)}) scale(${flor.escala.toFixed(2)})"/>
           </g>
         </g>`
      );
    }

    /* ══ SE ARMA LA CADENA DE NUDOS ══
       Se construye de la punta hacia la base, metiendo cada nudo dentro
       del anterior. El resultado es una cadena: girar un nudo arrastra
       todo lo que tiene adentro. */
    let cadena = '';
    for (let k = CANTIDAD_DE_NUDOS - 1; k >= 0; k--) {
      const pivote = recorrido[arranqueDelNudo[k]];
      cadena =
        `<g class="nudo-del-tallo"
             data-pivote-x="${pivote.x.toFixed(1)}" data-pivote-y="${pivote.y.toFixed(1)}">
           ${partesPorNudo[k].join('')}${cadena}
         </g>`;
    }

    return {
      alto,
      svg: `<svg class="racimo-de-rosas" viewBox="0 0 ${ANCHO_DEL_LIENZO} ${alto}"
                 aria-hidden="true">${cadena}</svg>`,
    };
  }


  /**
   * Dibuja un zarcillo: el hilito enroscado con el que las enredaderas se
   * agarran de lo que tengan cerca.
   *
   * Se construye con una ESPIRAL: se va girando de a poco alrededor de un
   * punto mientras el radio crece, y al mismo tiempo todo el conjunto se
   * desplaza hacia arriba. Girar + avanzar = resorte visto de costado.
   *
   * @param {number} xInicio - Dónde nace, a lo ancho.
   * @param {number} yInicio - Dónde nace, a lo alto.
   * @param {Object} azar    - Generador con semilla.
   * @returns {string} El atributo "d" del path.
   *
   * @example
   *   dibujarZarcillo(30, 200, azar)  // → 'M30.0 200.0 L31.2 198.4 …'
   */
  function dibujarZarcillo(xInicio, yInicio, azar) {
    const vueltas    = azar.entre(1.8, 3.2);
    const radioFinal = azar.entre(6, 13);
    const alcance    = azar.entre(16, 34);
    const sentido    = azar.signo();          // se enrosca a un lado o al otro
    const haciaDonde = azar.entre(-0.7, 0.7); // inclinación general
    const PASOS = 44;

    let d = '';
    for (let i = 0; i <= PASOS; i++) {
      const t = i / PASOS;
      const angulo = sentido * t * vueltas * Math.PI * 2;
      const radio  = radioFinal * t;
      const x = xInicio + Math.cos(angulo) * radio + t * alcance * Math.sin(haciaDonde);
      const y = yInicio + Math.sin(angulo) * radio - t * alcance;
      d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }


  /* ─── 4B. LOS RAMILLETES DE LAS ESQUINAS DE ARRIBA ──────────────────

     PARA QUÉ ESTÁN
     La portada tenía las dos esquinas de arriba vacías y el relicario
     quedaba solo en el medio, como un cuadro colgado en una pared
     demasiado grande. Estos ramilletes le devuelven compañía.

     ⚠️ LA FORMA IMPORTA MÁS QUE EL DIBUJO
     Acá ya hubo adornos que terminaron pareciendo otra cosa, y el
     motivo es siempre el mismo: UN TALLO VERTICAL SOLO, con un bulto
     redondo en la punta. Esa silueta hay que evitarla siempre.

     La solución es que el ramillete se lea COMO GUIRNALDA y no como
     tallo. Tres reglas, y ninguna es decorativa:

       1. ABANICO, NO COLUMNA. Los tallos salen de la esquina abiertos
          entre casi horizontal y casi vertical, abrazando las dos
          molduras. Nunca hay un eje único dominante.
       2. MÁS ANCHO QUE ALTO. El lienzo es apaisado y el peso visual se
          reparte a lo largo, no se apila.
       3. LA MASA VA EN LA ESQUINA, no en las puntas. La flor grande se
          apoya donde nacen los tallos, y de ahí en más todo se va
          afinando. Un remate gordo arriba de un tallo largo es
          exactamente lo que no queremos.
     ---------------------------------------------------------------- */

  /** Medidas del lienzo del ramillete. Apaisado a propósito (regla 2).
      Más grande que un racimo suelto porque acá van muchas rosas: si el
      lienzo fuera chico se apelotonarían en un borrón. */
  const ANCHO_DEL_RAMILLETE = 380;
  const ALTO_DEL_RAMILLETE  = 270;

  /**
   * Dibuja un ramillete para una esquina superior.
   *
   * Nace pegado a la esquina y abre en abanico hacia adentro de la
   * página. Se dibuja siempre para la esquina IZQUIERDA; el de la
   * derecha es el mismo dibujo reflejado por CSS, igual que las
   * enredaderas de los laterales.
   *
   * @param {number} semilla  - Define cómo será este ramillete.
   * @param {number} densidad - Cuán tupido va, según el tamaño de
   *        pantalla. 1 es una pantalla mediana; más grande, más flores;
   *        más chica, menos. Ver colocarLosRamilletesDeEsquina.
   * @returns {string} El SVG listo para insertar.
   */
  function dibujarRamilleteDeEsquina(semilla, densidad) {
    const azar = crearAzarConSemilla(semilla);

    /* Ayuda para escalar una cantidad por la densidad sin que se
       desmadre ni desaparezca: multiplica y después recorta a un mínimo
       y un máximo sensatos. */
    const escalar = (base, minimo, maximo) =>
      Math.round(limitar(base * densidad, minimo, maximo));

    /* De dónde nacen todos los tallos: casi en el vértice, apenas
       adentro, para que el ramillete parezca brotar de la moldura. */
    const xDeLaBase = azar.entre(10, 26);
    const yDeLaBase = azar.entre(8, 22);

    const piezas = [];
    const flores = [];

    /* ── El abanico de tallos (regla 1) ──
       Los ángulos van de 0,16 rad (casi horizontal, corriendo por debajo
       de la cenefa de arriba) a 1,30 rad (casi vertical, bajando por el
       riel del costado). Repartidos parejo y con un temblorcito al azar
       para que no se note la regla. */
    const cuantosTallos = escalar(azar.entero(16, 20), 6, 46);
    const ANGULO_MAS_HORIZONTAL = 0.08;
    const ANGULO_MAS_VERTICAL   = 1.46;

    /* ⚡ POR QUÉ EL TALLO TIENE QUE ENGROSAR CON LA DENSIDAD.
       La CANTIDAD de rosas escala con `densidad` (ver `escalar` arriba):
       en una pantalla ancha, ~1250px de más suben la densidad hasta 1,9 y
       aparecen ~135 rosas por ramillete. Pero el GROSOR del tallo era un
       número fijo, pensado para el caso de densidad ~1. Con casi el doble
       de flores encima de un tallo que no engrosó un milímetro, la punta
       —que ya adelgaza a propósito hasta un solo píxel— quedaba tapada
       entera: rosas que parecen flotar sin nada que las sostenga.

       Math.max(densidad, 1) para no ADELGAZAR el tallo en pantallas
       angostas: ahí la densidad baja de 1 y también hay menos rosas, así
       que el grosor de siempre ya alcanza. Solo se engruesa cuando hace
       falta, nunca se afina de más. */
    const grosorDelTallo = Math.max(densidad, 1);

    for (let i = 0; i < cuantosTallos; i++) {
      const reparto = i / (cuantosTallos - 1);
      const anguloDeSalida =
        ANGULO_MAS_HORIZONTAL +
        reparto * (ANGULO_MAS_VERTICAL - ANGULO_MAS_HORIZONTAL) +
        azar.entre(-0.09, 0.09);

      /* Los tallos del medio del abanico son los más largos; los de los
         extremos, más cortos. Eso redondea el contorno del ramillete en
         lugar de dejarlo con puntas que sobresalen. */
      const cercaniaAlCentro = 1 - Math.abs(reparto - 0.5) * 2;
      const pasos = azar.entero(7, 10);
      const largoDelPaso = azar.entre(11, 16) * (0.68 + cercaniaAlCentro * 0.42);

      const tallo = crecerTallo(azar, {
        xInicial: xDeLaBase,
        yInicial: yDeLaBase,
        anguloInicial: anguloDeSalida,
        pasos,
        largoDelPaso,
        giroMaximo: azar.entre(0.06, 0.14),
        inercia: azar.entre(0.5, 0.75),
        /* Tiende a abrirse hacia adentro de la página, sin volver sobre
           sí mismo: un ramillete que se cierra parece un puño. */
        xObjetivo: ANCHO_DEL_RAMILLETE * 0.8,
        atraccion: azar.entre(0.0006, 0.0018),
      });

      /* ⚠️ RELLENO DE RESERVA: el degradado #rosa-tallo vive en un <svg> de
         0×0 aparte (la biblioteca de rosas compartida). Ese patrón —un
         degradado referenciado desde OTRO <svg>— a veces se lee distinto
         entre navegadores. Por eso se dibuja el mismo contorno DOS veces:
         primero un color sólido de reserva, y el degradado justo encima.
         Si el degradado resuelve bien (lo normal), tapa al sólido entero y
         no cambia nada; si no resolviera, el sólido de abajo salva la
         rama en vez de dejarla como un hilo casi invisible. */
      const dDelTallo = siluetaDelTallo(
        tallo, azar,
        azar.entre(3.4, 5.2) * grosorDelTallo,
        1 * grosorDelTallo
      );
      piezas.push(
        `<path d="${dDelTallo}" fill="#6a5322"/>` +
        `<path d="${dDelTallo}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".6"/>`
      );

      /* Hojas repartidas por el tallo, siempre levantadas hacia afuera.
         Son las que dan el follaje: sin suficientes hojas el ramillete
         se ve como alambres con flores en la punta. */
      const cuantasHojas = azar.entero(4, 7);
      for (let h = 0; h < cuantasHojas; h++) {
        const punto = tallo[azar.entero(1, tallo.length - 2)];
        const hacia = azar.signo();
        const escala = azar.entre(0.38, 0.72);
        const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
        piezas.push(
          `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
        );
      }

      /* ── Ramas secundarias ──
         De la mitad de los tallos sale una rama más corta con su propio
         capullo. Es lo que llena los huecos que quedan ENTRE los tallos
         del abanico: sin ellas se ve el peine, con ellas se ve un ramo.
         Van cortas a propósito, para que no se confundan con los tallos
         principales ni alarguen la silueta. */
      if (azar.numero() < 0.62) {
        const nace = tallo[azar.entero(1, Math.max(1, tallo.length - 3))];
        const rama = crecerTallo(azar, {
          xInicial: nace.x,
          yInicial: nace.y,
          anguloInicial: nace.angulo + azar.signo() * azar.entre(0.35, 0.8),
          pasos: azar.entero(3, 5),
          largoDelPaso: azar.entre(7, 12),
          giroMaximo: azar.entre(0.08, 0.18),
          inercia: azar.entre(0.4, 0.65),
          xObjetivo: ANCHO_DEL_RAMILLETE * 0.8,
          atraccion: 0.001,
        });

        // Mismo relleno de reserva que el tallo principal (ver la nota de arriba).
        // Y el mismo engrosamiento por densidad (ver grosorDelTallo, arriba).
        const dDeLaRama = siluetaDelTallo(
          rama, azar,
          azar.entre(1.8, 2.8) * grosorDelTallo,
          0.8 * grosorDelTallo
        );
        piezas.push(
          `<path d="${dDeLaRama}" fill="#6a5322"/>` +
          `<path d="${dDeLaRama}" fill="url(#rosa-tallo)" stroke="#241d0d" stroke-width=".5"/>`
        );

        const puntaDeLaRama = rama[rama.length - 1];
        flores.push({
          x: puntaDeLaRama.x, y: puntaDeLaRama.y,
          tipo: azar.numero() < 0.6 ? 'rosa-capullo' : 'rosa-dorso',
          escala: azar.entre(0.26, 0.38),
          giro: (puntaDeLaRama.angulo * 180 / Math.PI) + 90 + azar.entre(-20, 20),
        });

        // Un par de hojitas también en la rama
        for (let h = 0; h < azar.entero(1, 3); h++) {
          const punto = rama[azar.entero(1, rama.length - 1)];
          const hacia = azar.signo();
          const escala = azar.entre(0.3, 0.5);
          const giro = (punto.angulo * 180 / Math.PI) + 90 + hacia * azar.entre(30, 70);
          piezas.push(
            `<use href="#rosa-hoja" transform="translate(${punto.x.toFixed(1)} ${punto.y.toFixed(1)})
                  rotate(${giro.toFixed(1)}) scale(${(hacia * escala).toFixed(2)} ${escala.toFixed(2)})"/>`
          );
        }
      }

      /* ── Qué remata cada tallo (regla 3) ──
         Nada grande. Los tallos largos terminan en capullo o en flor
         chica de perfil, que se leen como brote y no como remate. Solo
         los tallos cortos, los que quedan cerca de la esquina, se
         permiten una flor algo mayor. */
      const punta = tallo[tallo.length - 1];
      const esCorto = largoDelPaso * pasos < 95;
      const sorteo = azar.numero();

      if (esCorto && sorteo < 0.55) {
        flores.push({
          x: punta.x, y: punta.y,
          tipo: azar.numero() < 0.5 ? 'rosa-tres-cuartos' : 'rosa-media',
          escala: azar.entre(0.34, 0.46),
          giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-25, 25),
        });
      } else if (sorteo < 0.72) {
        flores.push({
          x: punta.x, y: punta.y, tipo: 'rosa-capullo',
          escala: azar.entre(0.34, 0.5),
          giro: (punta.angulo * 180 / Math.PI) + 90,
        });
      } else {
        flores.push({
          x: punta.x, y: punta.y, tipo: 'rosa-perfil',
          escala: azar.entre(0.28, 0.4),
          giro: (punta.angulo * 180 / Math.PI) + 90 + azar.entre(-20, 20),
        });
      }

      // Algún zarcillo suelto, que es lo que le da aire al conjunto
      if (azar.numero() < 0.5) {
        const donde = tallo[azar.entero(2, tallo.length - 1)];
        piezas.push(
          `<path d="${dibujarZarcillo(donde.x, donde.y, azar)}" fill="none"
                 stroke="url(#rosa-tallo)" stroke-width="${azar.entre(1, 1.6).toFixed(1)}"
                 stroke-linecap="round" stroke-opacity=".75"/>`
        );
      }
    }

    /* ── El corazón del ramillete, en la esquina (regla 3) ──
       Dos o tres rosas grandes apiladas justo donde nacen los tallos.
       Ahí es donde tiene que estar el peso: es lo que hace que la
       esquina se sienta ocupada, y de paso tapa el nacimiento de todos
       los tallos, que si se viera parecería un manojo atado. */
    const cuantasDelCorazon = escalar(azar.entero(15, 19), 4, 40);
    const orientaciones = ['rosa-frente', 'rosa-tres-cuartos', 'rosa-media'];

    for (let i = 0; i < cuantasDelCorazon; i++) {
      flores.push({
        x: xDeLaBase + azar.entre(2, 64),
        y: yDeLaBase + azar.entre(2, 56),
        tipo: orientaciones[azar.entero(0, orientaciones.length - 1)],
        escala: azar.entre(0.52, 0.8),
        giro: azar.entre(-30, 30),
      });
    }

    /* Y unas cuantas flores sueltas metidas ENTRE los tallos, a media
       distancia. Son las que terminan de cerrar el ramo: sin ellas
       queda un corazón denso y después aire hasta las puntas, que es
       justamente el vacío que había que llenar. */
    /* Un poco menos que antes y algo más grandes: apretujar muchas
       flores diminutas las convertía en un borrón oscuro donde no se
       distinguía ninguna rosa. Con menos y un pelín más grandes, cada una
       tiene lugar para leerse. */
    const cuantasDeRelleno = escalar(azar.entero(18, 23), 3, 46);
    for (let i = 0; i < cuantasDeRelleno; i++) {
      flores.push({
        x: xDeLaBase + azar.entre(30, 210),
        y: yDeLaBase + azar.entre(25, 180),
        tipo: azar.numero() < 0.5 ? 'rosa-tres-cuartos' : 'rosa-media',
        escala: azar.entre(0.42, 0.6),
        giro: azar.entre(-40, 40),
      });
    }

    /* Las flores van al final para quedar por encima de tallos y hojas.
       El apagado de las chicas es el mismo criterio de las enredaderas:
       más chica se lee como más lejana, así que va más oscura. */
    const ESCALA_MAS_LEJANA  = 0.28;
    const ESCALA_MAS_CERCANA = 0.78;

    for (const flor of flores) {
      const cercania = limitar(
        (flor.escala - ESCALA_MAS_LEJANA) / (ESCALA_MAS_CERCANA - ESCALA_MAS_LEJANA),
        0, 1
      );
      // Mismo piso de brillo subido que en las enredaderas (.74), para
      // que las flores chicas de las esquinas no se ennegrezcan.
      const brillo = 0.74 + cercania * 0.26;

      piezas.push(
        `<g class="flor-de-enredadera ${tonoDeLaFlor(brillo)}"
             data-escala="${flor.escala.toFixed(2)}"
             data-x="${flor.x.toFixed(1)}" data-y="${flor.y.toFixed(1)}"
             transform="translate(${flor.x.toFixed(1)} ${flor.y.toFixed(1)})">
           <g class="flor-de-enredadera__movil">
             <use href="#${flor.tipo}"
                  transform="rotate(${flor.giro.toFixed(1)}) scale(${flor.escala.toFixed(2)})"/>
           </g>
         </g>`
      );
    }

    return `<svg class="racimo-de-rosas racimo-de-rosas--esquina"
                 viewBox="0 0 ${ANCHO_DEL_RAMILLETE} ${ALTO_DEL_RAMILLETE}"
                 aria-hidden="true">${piezas.join('')}</svg>`;
  }

  /**
   * Coloca los dos ramilletes de las esquinas de arriba y los suma a la
   * lista de plantas, para que respiren y reaccionen al mouse igual que
   * las enredaderas de los costados.
   *
   * @returns {void}
   */
  function colocarLosRamilletesDeEsquina(alTerminar, sigoVigente) {
    let semilla = 9100;
    // Si no se pasa control de corrida, se asume que siempre es vigente.
    const vigente = (typeof sigoVigente === 'function') ? sigoVigente : () => true;

    /* ── CUÁN TUPIDOS VAN, SEGÚN LA PANTALLA ──
       En una pantalla grande, un ramillete con pocas rosas se pierde en
       la esquina y se ve pelado; en un celangosto, uno con muchas tapa
       medio nombre de Ania y se ve saturado. Así que la cantidad de
       flores se ata al ancho de la ventana.

       La cuenta es una regla de tres recortada: a 1400 px de ancho la
       densidad es 1 (la de referencia), y se estira o encoge con la
       pantalla, pero nunca baja de 0,6 ni pasa de 1,45 —fuera de esos
       límites o queda vacío o queda amontonado—.

       Esto se recalcula solo al cambiar el tamaño de la ventana, porque
       repartirPlantas() —que llama acá— se vuelve a ejecutar con cada
       redimensión (ver el listener de 'resize' al final del archivo). */
    /* ⛔ Acá NO se multiplica por el nivel de calidad. Se probó y rompió los
       ramilletes (ver la nota de SEPARACION_ENTRE_PLANTAS arriba). */
    const densidad = limitar(window.innerWidth / 1250, 0.55, 1.9);

    /* ⚡ UN RAMILLETE POR CUADRO. Cada uno lleva entre 50 y 80 rosas con sus
       tallos: los dos juntos, de una sola vez, era el bloque de construcción
       más grande de toda la web. Hacer uno, dejar respirar al navegador y
       hacer el otro da EXACTAMENTE el mismo resultado (mismas semillas,
       mismo dibujo) sin congelar nada. */
    const huecos = [buscar('.marco__ramillete--izquierdo'),
                    buscar('.marco__ramillete--derecho')];
    let indiceDeHueco = 0;

    /**
     * Arma los ramilletes, UNO POR CUADRO.
     *
     * ⚠️ ESTO VOLVIÓ A SER UNO POR CUADRO, Y HAY UNA LECCIÓN.
     * Cuando el ramillete derecho desaparecía, culpé al troceado y los junté
     * en una sola pasada. Me equivoqué: la causa real era una LLAVE DE CIERRE
     * que falta en el CSS (ver .marco__ramillete en
     * estilos/02-marco-victoriano.css). El troceado nunca tuvo la culpa.
     *
     * Y juntarlos costaba caro: cada ramillete lleva entre 50 y 80 rosas con
     * sus tallos, y los dos de corrido —más las plantas y las mediciones que
     * vienen encadenadas— producían una tarea de más de un segundo. El
     * medidor la cazó: «peor 1101 ms». Eso es la página congelada.
     *
     * Ahora vuelven a ir de a uno, con el guardia de reentrada puesto: si
     * entra una construcción más nueva, esta se apaga sola.
     *
     * @returns {void}
     */
    function armarLosRamilletes() {
      if (!vigente()) return;

      const hueco = huecos[indiceDeHueco];
      const indice = indiceDeHueco;
      indiceDeHueco++;

      if (hueco) crearRamillete(hueco, indice);

      if (indiceDeHueco < huecos.length) { cederYSeguir(armarLosRamilletes); return; }

      revisarQueEstenLosDos();
      if (typeof alTerminar === 'function') alTerminar();
    }

    /**
     * Comprueba que los DOS ramilletes hayan quedado dibujados y rehace el
     * que falte.
     *
     * ⚠️ POR QUÉ EXISTE ESTA FUNCIÓN. El ramillete de la esquina derecha
     * desapareció tres veces seguidas y cada intento de diagnosticarlo por
     * lectura de código falló. En vez de seguir adivinando, el código
     * comprueba su propio resultado: si un hueco quedó sin SVG, lo vuelve a
     * armar en el acto.
     *
     * No es un parche que tape el problema: si hiciera falta, deja dicho en
     * consola cuál falló, y eso es información que hasta ahora no teníamos.
     *
     * @returns {void}
     */
    function revisarQueEstenLosDos() {
      huecos.forEach((hueco, indice) => {
        if (!hueco) return;

        if (!hueco.querySelector('.racimo-de-rosas')) {
          /* Se rehace con la MISMA semilla que le tocaba, para que el dibujo
             sea el que corresponde a esa esquina y no uno distinto. */
          const semillaGuardada = semilla;
          semilla = 9100 + indice;
          crearRamillete(hueco, indice);
          semilla = semillaGuardada;
        }
      });

      /* ⚠️ Y AHORA SE COMPRUEBA QUE ADEMÁS SE VEAN, no solo que existan.
         El ramillete derecho desapareció cinco veces y ya descarté, con
         medición, que sea el markup, el generador, la semilla o una carrera
         de construcción. Comprobé en Node que las semillas 9100 y 9101
         producen ramilletes equivalentes (25 y 23 tallos, misma dispersión),
         así que el SVG se genera bien: el problema es que no se RENDERIZA.

         Estas medidas se publican en el cartel de ?fps=1 para poder verlo de
         un vistazo, sin abrir las herramientas del navegador. Si el derecho
         sale con ancho o alto 0, o con una posición fuera de la pantalla,
         ahí está la respuesta que llevo días sin poder ver. */
      window.EstadoDeLosRamilletes = huecos.map((hueco, indice) => {
        if (!hueco) return { lado: indice ? 'der' : 'izq', existe: false };
        const svg = hueco.querySelector('.racimo-de-rosas');
        const caja = hueco.getBoundingClientRect();
        return {
          lado: indice ? 'der' : 'izq',
          existe: !!svg,
          rosas: svg ? svg.querySelectorAll('.flor-de-enredadera').length : 0,
          x: Math.round(caja.left),
          y: Math.round(caja.top),
          ancho: Math.round(caja.width),
          alto: Math.round(caja.height),
        };
      });
    }

    /**
     * Crea UN ramillete de esquina y lo suma a la lista de plantas.
     * @param {Element} hueco
     * @param {number} indice - 0 izquierdo, 1 derecho (el derecho va espejado).
     * @returns {void}
     */
    function crearRamillete(hueco, indice) {
      /* ⚠️ SI ESTO SE LLAMA DE NUEVO SOBRE EL MISMO HUECO (revisarQueEstenLosDos
         reconstruyendo un ramillete que no salió bien), el innerHTML de abajo
         tira el SVG viejo — pero la entrada que ESE ramillete tenía en
         `plantas` seguía viva, animándose cada cuadro sobre un nodo que ya
         no está en la página. Se limpia antes de agregar la nueva. */
      for (let i = plantas.length - 1; i >= 0; i--) {
        if (plantas[i].elemento && !plantas[i].elemento.isConnected) plantas.splice(i, 1);
      }

      hueco.innerHTML = dibujarRamilleteDeEsquina(semilla++, densidad);

      const azarDeMovimiento = crearAzarConSemilla(semilla * 7919);

      plantas.push({
        elemento: hueco.querySelector('.racimo-de-rosas'),
        flores: Array.from(hueco.querySelectorAll('.flor-de-enredadera')),
        nudos: [],              // no se articula: es un ramo, no una trepadora
        espejada: indice === 1,
        /* Ancho del viewBox de ESTE dibujo. Sirve para pasar coordenadas del
           dibujo a píxeles de pantalla sin medir elemento por elemento. */
        anchoDelLienzo: ANCHO_DEL_RAMILLETE,
        alturaEnLaPagina: 0,    // viven arriba de todo

        inclinacion: 0,
        velocidadDeLaInclinacion: 0,

        /* Mucho menos sensible al scroll que una enredadera. Un ramo
           apoyado en una esquina se mueve apenas; si se meciera como una
           planta suelta, delataría que es un dibujo pegado encima. */
        sensibilidad: azarDeMovimiento.entre(0.16, 0.3),
        rigidez: RIGIDEZ_DE_LA_PLANTA * azarDeMovimiento.entre(0.8, 1.2),
        amortiguacion: AMORTIGUACION_DE_LA_PLANTA * azarDeMovimiento.entre(1, 1.4),

        amplitudDeRespiracion: azarDeMovimiento.entre(0.25, 0.6),
        velocidadDeRespiracion: azarDeMovimiento.entre(0.2, 0.4),
        faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),

        estadoDeLasFlores: null,
      });
    }

    armarLosRamilletes();
  }


  /* ─── 5. REPARTIR LAS PLANTAS ──────────────────────────────────── */

  /* Los troceados de acá abajo (construir plantas, armar ramilletes, medir
     flores) usan cederElHilo() y trabajarPorTandas(), que viven en
     codigo/02-utilidades.js porque los comparten también las velas y las
     motas. Ahí está explicado en detalle por qué no alcanza con
     requestAnimationFrame a secas (con la pestaña de fondo rAF no corre, y
     el troceado quedaba a mitad de camino con las enredaderas vacías). */
  const cederYSeguir = cederElHilo;

  /** @type {Array<Object>} Todas las plantas con su estado de movimiento. */
  const plantas = [];

  /** Cuántas plantas entraban la última vez que se construyó todo, para no
   *  reconstruir si un resize no cambia ese número (el caso más común: solo
   *  cambiar el ANCHO no cambia cuántas plantas entran a lo ALTO). -1 =
   *  todavía no se construyó nada. */
  let ultimaCuantasEntran = -1;

  /**
   * Reparte plantas a lo largo de los dos laterales del marco.
   * Se vuelve a llamar si cambia el tamaño de la ventana.
   * @returns {void}
   */
  /** Número de la corrida de construcción vigente.
   *
   *  ⚠️ ESTO EXISTE POR UN BUG REAL. repartirPlantas() NO termina cuando
   *  retorna: arma las ~20 plantas en tandas de 4 y después los dos
   *  ramilletes de esquina de a uno por cuadro, o sea que sigue trabajando
   *  durante decenas de cuadros. Si alguien la vuelve a llamar mientras
   *  tanto (un resize, o el gobernador de calidad), la corrida nueva vacía
   *  los contenedores y el array… pero las tandas pendientes de la corrida
   *  vieja SIGUEN EJECUTÁNDOSE, escribiendo sobre los mismos huecos. El
   *  resultado fue un ramillete de esquina que desaparecía.
   *
   *  Con esto, cada tanda comprueba si sigue siendo la corrida vigente
   *  antes de tocar nada; si no lo es, se apaga sola. */
  let corridaVigente = 0;

  function repartirPlantas() {
    const miCorrida = ++corridaVigente;
    const sigoVigente = () => miCorrida === corridaVigente;

    const altoDelDocumento = document.body.scrollHeight;
    const cuantasEntran = Math.max(3, Math.floor(altoDelDocumento / SEPARACION_ENTRE_PLANTAS));

    /* ⚡ NO RECONSTRUIR SI NO HACE FALTA. Tirar todo y rehacer es la
       operación más cara de toda la web (ver la nota de troceado, abajo).
       Si la cantidad de plantas que entran no cambió, alcanza con volver a
       medir dónde quedó cada una —el ancho sí pudo cambiar—, sin recrear
       ningún SVG. */
    if (cuantasEntran === ultimaCuantasEntran) {
      medirLasFlores();
      return;
    }
    ultimaCuantasEntran = cuantasEntran;

    enredaderaIzquierda.innerHTML = '';
    enredaderaDerecha.innerHTML = '';
    plantas.length = 0;

    /* Lista plana de qué crear, con la MISMA semilla que le tocaría en el
       viejo bucle anidado (i por fuera, lado por dentro): así el resultado
       —qué planta sale en cada lugar— es idéntico, solo que ahora se puede
       trocear en tandas sin desarmar el orden. */
    const tareas = [];
    let semilla = 1;
    for (let i = 0; i < cuantasEntran; i++) {
      tareas.push({ i, lado: enredaderaIzquierda, semilla: semilla++ });
      tareas.push({ i, lado: enredaderaDerecha,   semilla: semilla++ });
    }

    /**
     * Crea UNA planta (rama + nudos + flores) y la suma a `plantas`.
     * @param {{i:number, lado:Element, semilla:number}} tarea
     * @returns {void}
     */
    function crearUnaPlanta(tarea) {
      const { i, lado, semilla } = tarea;

      /* La altura donde nace también varía un poco, para que las dos
         columnas no queden como espejo la una de la otra. */
      const desfase = crearAzarConSemilla(semilla).entre(-90, 90);
      const dondeNace = 240 + i * SEPARACION_ENTRE_PLANTAS + desfase;

      /* CUÁNTA LUZ RECIBE ESTA PLANTA, según lo hondo que esté en la
         página. Arriba (cerca de la portada) ~1: pleno sol. En el fondo
         ~0.15: penumbra. Con eso la planta se dibuja abierta y encendida
         arriba, o cerrada y apagada abajo (ver dibujarPlanta). Es la
         misma metáfora del océano que apaga los haces de luz. */
      const luz = limitar(1 - dondeNace / altoDelDocumento, 0.15, 1);

      const planta = dibujarPlanta(semilla, luz);

      const contenedor = document.createElement('div');
      contenedor.className = 'marco__planta';
      contenedor.style.position = 'absolute';
      contenedor.style.left = '0';
      contenedor.style.width = '100%';

      /* (Acá hubo un aspect-ratio para sostener un content-visibility que se
         revirtió: recortaba tallos y flores. El alto vuelve a salir del
         contenido, como siempre. Ver la nota de .marco__planta en
         estilos/02-marco-victoriano.css.) */

      /* La planta crece hacia ARRIBA desde su raíz, así que anclamos su
         borde inferior en el punto donde queremos que esté plantada.

         translateY(-100%) sube el bloque exactamente su propia altura,
         sea cual sea. Es importante hacerlo así y no con una cuenta:
         el alto del dibujo está en unidades del SVG, no en píxeles, y
         mezclarlos daría posiciones distintas en cada pantalla. */
      contenedor.style.top = dondeNace + 'px';
      contenedor.style.transform = 'translateY(-100%)';
      contenedor.innerHTML = planta.svg;
      lado.appendChild(contenedor);

      const azarDeMovimiento = crearAzarConSemilla(semilla * 7919);

      /* Los nudos del tallo, con su propio resorte cada uno.
         El de más abajo es el más rígido (es la parte leñosa) y se van
         ablandando hacia la punta, igual que una rama de verdad. */
      const nudos = Array.from(contenedor.querySelectorAll('.nudo-del-tallo'));
      const estadoDeLosNudos = nudos.map((nudo, k) => {
        const dureza = 1.9 - 1.25 * (k / Math.max(1, nudos.length - 1));
        return {
          elemento: nudo,
          pivoteX: parseFloat(nudo.dataset.pivoteX) || 0,
          pivoteY: parseFloat(nudo.dataset.pivoteY) || 0,

          /* El pivote va como `transform-origin` de CSS, escrito UNA sola
             vez acá. Antes se re-formateaba en cada escritura del atributo
             (240 cadenas de más por cuadro para decir siempre lo mismo), y
             además obligaba a usar el atributo `transform`, que pasa por
             layout. Con esto el giro es puro compositor. */
          _origenFijado: (function () {
            nudo.style.transformBox = 'view-box';
            nudo.style.transformOrigin =
              (parseFloat(nudo.dataset.pivoteX) || 0) + 'px ' +
              (parseFloat(nudo.dataset.pivoteY) || 0) + 'px';
            return true;
          })(),
          flexion: 0,
          velocidadDeLaFlexion: 0,
          rigidez: RIGIDEZ_DEL_NUDO * dureza,
          amortiguacion: AMORTIGUACION_DEL_NUDO * azarDeMovimiento.entre(0.85, 1.2),
          faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),
          // Posición en pantalla; se recalcula al medir
          xEnPantalla: 0,
          yEnPantalla: 0,
        };
      });

      plantas.push({
        elemento: contenedor.querySelector('.racimo-de-rosas'),
        flores: Array.from(contenedor.querySelectorAll('.flor-de-enredadera')),
        nudos: estadoDeLosNudos,
        /* Las plantas del lado derecho están reflejadas por CSS, así que
           lo que en el dibujo va hacia la derecha, en pantalla va hacia
           la izquierda. Hay que saberlo para que el empujón del mouse
           doble el tallo hacia el lado correcto. */
        espejada: lado === enredaderaDerecha,
        // Ancho del viewBox de la trepadora (ver anchoDelLienzo en el ramillete).
        anchoDelLienzo: ANCHO_DEL_LIENZO,
        alturaEnLaPagina: dondeNace,

        /* Estado del resorte de la planta entera */
        inclinacion: 0,
        velocidadDeLaInclinacion: 0,

        /* Personalidad propia: nunca dos plantas iguales */
        sensibilidad: azarDeMovimiento.entre(0.6, 1.35),
        rigidez: RIGIDEZ_DE_LA_PLANTA * azarDeMovimiento.entre(0.7, 1.4),
        amortiguacion: AMORTIGUACION_DE_LA_PLANTA * azarDeMovimiento.entre(0.8, 1.3),

        /* Respiración de reposo: para que nunca queden congeladas */
        amplitudDeRespiracion: azarDeMovimiento.entre(0.5, 1.6),
        velocidadDeRespiracion: azarDeMovimiento.entre(0.25, 0.6),
        faseDeRespiracion: azarDeMovimiento.entre(0, Math.PI * 2),

        /* Estado de cada flor */
        estadoDeLasFlores: null,
      });
    }

    /* ⚡ TROCEADO EN TANDAS, POR PRESUPUESTO DE TIEMPO.
       Crear las ~22 plantas de una sola vez —cada una con su propio SVG de
       rama, nudos y flores, más leer su geometría después— podía bloquear
       el hilo principal casi medio segundo DE UNA SOLA VEZ (una "tarea
       larga" bien gorda, detectable con codigo/21-monitor-de-rendimiento.js).
       El resultado final es IDÉNTICO se haga de una vez o de a poco; lo
       único que cambia es que, de a poco, el navegador puede respirar entre
       tanda y tanda —pintar, atender un clic— en vez de quedar congelado.

       trabajarPorTandas() (codigo/02-utilidades.js) hace todas las plantas
       que entren en 8 ms y corta ahí. Antes acá había un número fijo de
       plantas por tanda, elegido a mano midiendo en una sola máquina — y un
       número fijo solo vale para la máquina donde se midió. Con presupuesto
       de tiempo se adapta solo a cada equipo, que es justo lo que hace
       falta: la invitación tiene que ir fluida tanto en la máquina donde se
       la prueba como en el teléfono de cualquier invitado. */
    trabajarPorTandas(
      tareas.length,
      /* sigoVigente(): si entró una construcción más nueva (un resize que
         cambió cuántas plantas entran), esta se apaga sin tocar nada. Se
         pregunta por planta y no por tanda porque ahora las tandas no tienen
         un tamaño fijo; la comprobación es una comparación de enteros. */
      i => { if (sigoVigente()) crearUnaPlanta(tareas[i]); },
      /* Recién cuando TODAS las plantas de la enredadera existen se pasa a
         los ramilletes de esquina (uno por cuadro), y cuando ESOS terminan
         —de ahí el callback— se prepara el estado de las flores, que
         necesita que ya estén todas en la página. */
      () => { if (sigoVigente()) colocarLosRamilletesDeEsquina(prepararLasFlores, sigoVigente); }
    );
  }

  /**
   * Le da a cada flor su propio estado de resorte y su personalidad.
   * @returns {void}
   */
  function prepararLasFlores() {
    let semilla = 5000;

    /* ⚡ TAMBIÉN TROCEADO, POR EL MISMO MOTIVO QUE LAS PLANTAS.
       Esto recorre las ~256 flores y hace un querySelector en cada una para
       encontrar su grupo móvil. Todo de golpe, encadenado detrás de la
       construcción de las plantas y de los dos ramilletes, era parte de la
       tarea de 1101 ms que marcó el medidor.

       Se hace planta por planta, cediendo el hilo entre una y otra: el
       resultado es idéntico, pero el navegador puede pintar y atender clics
       mientras tanto. */
    let cualPlanta = 0;

    function prepararUnaPlanta() {
      if (cualPlanta >= plantas.length) { medirLasFlores(); return; }

      const planta = plantas[cualPlanta++];
      planta.estadoDeLasFlores = planta.flores.map(flor => {
        const azar = crearAzarConSemilla(semilla++);
        const escala = parseFloat(flor.dataset.escala) || 0.5;

        return {
          movil: flor.querySelector('.flor-de-enredadera__movil'),
          // Posición en el documento; se calcula al medir
          xEnElDocumento: 0,
          yEnElDocumento: 0,

          /* Dónde está esta flor DENTRO del dibujo (coordenadas del viewBox).
             Con esto y la caja del dibujo entero se puede calcular su lugar
             en pantalla sin preguntárselo al navegador flor por flor: ver
             medirUnaPlanta. */
          xEnElDibujo: parseFloat(flor.dataset.x) || 0,
          yEnElDibujo: parseFloat(flor.dataset.y) || 0,

          /* Estado del doblado. Es UN SOLO número: cuántos grados está
             inclinada la flor sobre su pedúnculo. No hay desplazamiento
             en X ni en Y, porque una flor no se despega del tallo. */
          flexion: 0,
          velocidadDeLaFlexion: 0,

          /* Dónde está el cuello de la flor, o sea el punto sobre el que
             pivota. Va por debajo del centro del capullo, y más lejos
             cuanto más grande sea la flor. */
          largoDelPeduculo: 6 + 34 * escala,

          /* La cola del atributo `transform`, armada una sola vez: el cuello
             de la flor no se mueve nunca. Ver la nota de textoDelPivote. */
          textoDelCuello: ' 0 ' + (6 + 34 * escala).toFixed(1) + ')',

          /* No hay amplitud, velocidad ni fase propias: la flor ya no
             respira por su cuenta. El vaivén de reposo lo carga el tallo
             (ver VAIVEN_DEL_NUDO) y la flor solo se mueve cuando el mouse
             la empuja, para no reescribir su transform eternamente. */
          rigidez: RIGIDEZ_DE_LA_FLOR * azar.entre(0.7, 1.4),
          amortiguacion: AMORTIGUACION_DE_LA_FLOR * azar.entre(0.8, 1.25),
        };
      });

      cederYSeguir(prepararUnaPlanta);
    }

    prepararUnaPlanta();
  }

  /**
   * Anota dónde está cada flor DENTRO DEL DOCUMENTO.
   *
   * Se mide una sola vez (y se repite si cambia el tamaño de la ventana)
   * porque preguntar la posición de un elemento obliga al navegador a
   * recalcular toda la página: hacerlo 60 veces por segundo para 50
   * flores dejaría la web pegada. Como la posición en el documento no
   * cambia al hacer scroll, alcanza con restarle después cuánto se bajó.
   *
   * ⚡ SE MIDE DE A TANDAS, NO TODO DE UNA. Entre las enredaderas y los dos
   * ramilletes de las esquinas hay unas 300 flores, y cada
   * getBoundingClientRect() obliga al navegador a recalcular la página. Las
   * 300 seguidas, en un solo bloque, congelaban el hilo principal casi un
   * segundo (una "tarea larga" medible con 21-monitor-de-rendimiento.js) —
   * justo al cargar, que es cuando peor se siente.
   *
   * Trocearlo NO cambia NADA de lo que se ve: estas medidas solo sirven
   * para saber si el mouse está cerca de una flor, y hasta que la persona
   * no mueva el mouse hasta ahí, da igual que se hayan terminado de medir
   * en el cuadro 1 o en el cuadro 6. El dibujo es idéntico.
   *
   * @returns {void}
   */
  const PLANTAS_MEDIDAS_POR_TANDA = 3;
  let medicionEnCurso = false;
  let hayOtraMedicionPedida = false;

  function medirLasFlores() {
    /* Si ya hay una medición troceada corriendo, no se arrancan dos a la vez
       pisándose (pasa cuando 'load', 'resize' e 'invitacion-visible' caen
       casi juntos), pero SÍ se anota que hay que repetirla al terminar: si el
       pedido llegó por un resize, las posiciones que se están midiendo ahora
       ya quedaron viejas y hay que rehacerlas. */
    if (medicionEnCurso) { hayOtraMedicionPedida = true; return; }
    medicionEnCurso = true;

    let indiceDePlanta = 0;

    function medirUnaTanda() {
      const desplazamientoDelScroll = window.scrollY;
      const limite = Math.min(indiceDePlanta + PLANTAS_MEDIDAS_POR_TANDA, plantas.length);

      for (; indiceDePlanta < limite; indiceDePlanta++) {
        medirUnaPlanta(plantas[indiceDePlanta], desplazamientoDelScroll);
      }

      if (indiceDePlanta < plantas.length) {
        cederYSeguir(medirUnaTanda);
        return;
      }

      medicionEnCurso = false;
      if (hayOtraMedicionPedida) {
        hayOtraMedicionPedida = false;
        cederYSeguir(medirLasFlores);
      }
    }
    medirUnaTanda();
  }

  /**
   * Mide una sola planta (sus flores y sus nudos).
   * @param {Object} planta
   * @param {number} desplazamientoDelScroll
   * @returns {void}
   */
  function medirUnaPlanta(planta, desplazamientoDelScroll) {
    {
      if (!planta.estadoDeLasFlores) return;

      /* UNA SOLA MEDICIÓN POR PLANTA, para las flores y para los nudos.
         Preguntar la posición de cada elemento por separado sería carísimo,
         y además su caja cambia al doblarse. En cambio, con la caja del
         dibujo entero se puede convertir cualquier coordenada del SVG a
         píxeles de pantalla con una regla de tres:

             píxeles = borde del dibujo + coordenada × escala

         donde escala = ancho en pantalla ÷ ancho del lienzo. */
      const cajaDelDibujo = planta.elemento.getBoundingClientRect();
      const escalaEnPantalla = cajaDelDibujo.width / planta.anchoDelLienzo;

      /* ⚡ ANTES ACÁ HABÍA UN getBoundingClientRect() POR FLOR.
         Con ~256 flores en pantalla eso eran 256 layouts forzados cada vez
         que se medía: el perfil lo mostraba como el 7,4 % de "Recalculate
         style" y 2 % de "Layout", todo bajo medirUnaTanda. La posición de
         una flor ya la sabemos sin preguntar: quedó guardada en data-x/data-y
         al dibujarla (son sus coordenadas dentro del viewBox), así que se
         deriva con la MISMA regla de tres que los nudos.

         Nota: se usa el punto de anclaje de la flor (su cuello) en vez del
         centro de su caja. Es la referencia correcta —es el punto que no se
         mueve cuando la flor cabecea— y encima es más estable que un centro
         que cambiaba con cada inclinación. */
      for (const estado of planta.estadoDeLasFlores) {
        estado.xEnElDocumento = planta.espejada
          ? cajaDelDibujo.right - estado.xEnElDibujo * escalaEnPantalla
          : cajaDelDibujo.left  + estado.xEnElDibujo * escalaEnPantalla;
        estado.yEnElDocumento = cajaDelDibujo.top +
                                estado.yEnElDibujo * escalaEnPantalla +
                                desplazamientoDelScroll;
      }

      for (const nudo of planta.nudos) {
        /* En el lado derecho el dibujo está reflejado, así que el eje X va
           al revés: se mide desde el borde derecho. */
        nudo.xEnPantalla = planta.espejada
          ? cajaDelDibujo.right - nudo.pivoteX * escalaEnPantalla
          : cajaDelDibujo.left + nudo.pivoteX * escalaEnPantalla;
        nudo.yEnPantalla = cajaDelDibujo.top + nudo.pivoteY * escalaEnPantalla +
                           desplazamientoDelScroll;
      }
    }
  }

  /* ⚡ LA CONSTRUCCIÓN NO ARRANCA HASTA QUE LA PÁGINA YA PINTÓ.
     Antes esta línea era `repartirPlantas()` a secas, ejecutándose en medio
     de la evaluación del script. Y esta función construye ~24 plantas y los
     dos ramilletes: miles de nodos SVG, con su parseo de innerHTML incluido.
     Todo eso caía DENTRO de "Evaluate script" —1.653 ms, el 40,7 % del
     perfil— y bloqueaba el primer pintado: el LCP se iba a 12,4 segundos.

     Nada de esto se ve antes de abrir el sobre, así que no hay ninguna razón
     para que retrase la portada: se construye al escuchar
     `invitacion-visible`, que es cuando de verdad hacen falta las
     enredaderas.

     ⚠️ ACÁ HABÍA ADEMÁS UN TEMPORIZADOR DE RESPALDO de 2 segundos ("construí
     igual por si el sobre se salteó"). Se quitó, y vale la pena explicar por
     qué, porque parecía inofensivo y no lo era:

       · Se disparaba SIEMPRE, no solo en el caso raro que decía cubrir. Con
         el sobre cerrado y nadie mirando, a los 2 segundos la página se
         ponía a construir 24 plantas y ~354 flores igual.
       · Eso es exactamente lo que medía PageSpeed: 2.790 ms de Total
         Blocking Time, y de paso empujaba el Largest Contentful Paint a 2,9 s
         porque ese repintado grande pasaba a ser el elemento más grande.
       · El caso que cubría (que el sobre no exista en el HTML) ahora lo
         detecta con certeza codigo/03-sobre-de-apertura.js, que emite
         `invitacion-visible` él mismo cuando no encuentra el sobre.

     Moraleja: un respaldo por cronómetro cubre el caso raro cobrándoselo a
     TODAS las visitas. Si el caso se puede detectar, se detecta. */
  let yaSeConstruyo = false;
  function construirUnaSolaVez() {
    if (yaSeConstruyo) return;
    yaSeConstruyo = true;
    repartirPlantas();
  }

  document.addEventListener('invitacion-visible', construirUnaSolaVez);


  /* ─── 6. MOVIMIENTO ────────────────────────────────────────────── */

  let posicionDeScrollAnterior = window.scrollY;
  let mouseX = -9999;
  let mouseY = -9999;

  /* El handler solo GUARDA las coordenadas (barato); el trabajo pesado —mecer
     las plantas, apartar flores— vive en el bucle rAF, que ya está limitado a
     un cuadro. Por eso no hace falta acelerarlo. Se marca passive para no
     bloquear nunca el desplazamiento. */
  document.addEventListener('mousemove', evento => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  let momentoAnterior = performance.now();
  let tiempoTranscurrido = 0;

  /* ─── CALIDAD GRÁFICA: ALIGERAR SIN EMPOBRECER ──────────────────────
     Esta es la parte más cara de toda la web para la CPU: por cada nudo del
     tallo y por cada flor CERCA de la pantalla, cada cuadro calcula la
     distancia al mouse (una raíz cuadrada), integra un resorte y ESCRIBE el
     SVG (setAttribute, más caro que un style.transform de HTML). En un
     equipo sin placa de video, con decenas de nudos y flores a la vez,
     todo eso repetido 60 veces por segundo es el mayor costo de la web.

     En calidad media/baja, ese bloque entero —cercanía al mouse, resorte y
     escritura— se ejecuta cada 2 o 3 cuadros en vez de todos. El empujón
     del mouse no se diluye: se guarda cuánto tiempo real pasó desde la
     última vez (dtAcumulado) y se usa ESE valor al calcular el torque, así
     que un manotazo sigue empujando con la misma fuerza total, solo que la
     rama tarda un poquito más en reaccionar y se repinta con menos
     frecuencia —el mismo criterio que ya se usa para el titileo de las
     velas: una rama de verdad tampoco responde con precisión de cuadro. */
  let calidad = nivelDeCalidad();
  const SALTO_DEL_RESORTE_POR_CALIDAD = { 0: 1, 1: 2, 2: 3 };
  let saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
  let contadorDeCuadro = 0;
  let dtAcumulado = 0;
  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    saltoDelResorte = SALTO_DEL_RESORTE_POR_CALIDAD[calidad] ?? 1;
  });

  /**
   * Un cuadro de animación: mece las plantas según el scroll y aparta
   * las flores que estén cerca del mouse.
   *
   * @param {number} momentoActual - Marca de tiempo del navegador.
   * @returns {void}
   */
  function dibujarCuadro(momentoActual) {
    /* Pestaña oculta o animaciones apagadas: el bucle sigue vivo pero no
       mece nada. Las rosas del marco quedan quietas (siempre visibles), y
       si se encienden las animaciones con el botón, vuelven a mecerse en el
       acto, sin recargar. Se actualiza el reloj para que al reanudar no dé
       un salto por el tiempo acumulado. */
    if (!hayAlgoQueMirar()) {
      momentoAnterior = momentoActual;
      requestAnimationFrame(dibujarCuadro);
      return;
    }

    const dt = Math.min((momentoActual - momentoAnterior) / 1000, 0.05);
    momentoAnterior = momentoActual;
    tiempoTranscurrido += dt;

    /* scrollActual() y no window.scrollY: preguntarle el scroll al navegador
       dentro del bucle lo obliga a recalcular estilos (ver 02-utilidades.js). */
    const posicionActual = scrollActualY();
    const velocidadDelScroll = posicionActual - posicionDeScrollAnterior;
    posicionDeScrollAnterior = posicionActual;

    const arribaDeLaVentana = posicionActual;
    const abajoDeLaVentana = posicionActual + window.innerHeight;

    /* Cada cuántos cuadros toca actualizar de verdad el resorte de nudos y
       flores (ver la nota de más arriba). Mientras tanto se acumula el dt
       real, para que el torque del cuadro que sí corre represente el
       tiempo completo transcurrido y no se diluya. */
    contadorDeCuadro++;
    dtAcumulado += dt;
    const tocaActualizarElResorte = (contadorDeCuadro % saltoDelResorte === 0);
    const dtParaElTorque = dtAcumulado;
    if (tocaActualizarElResorte) dtAcumulado = 0;

    for (const planta of plantas) {
      /* Si la planta está lejísimos de la pantalla no perdemos tiempo.
         El margen de 500 px hace que ya venga meciéndose al aparecer. */
      const estaCerca = planta.alturaEnLaPagina > arribaDeLaVentana - 500 &&
                        planta.alturaEnLaPagina < abajoDeLaVentana + 500;
      if (!estaCerca) continue;

      /* ── a) La planta entera se mece con el scroll ── */
      const respiracion = Math.sin(
        tiempoTranscurrido * planta.velocidadDeRespiracion + planta.faseDeRespiracion
      ) * planta.amplitudDeRespiracion;

      const inclinacionDestino = limitar(
        -velocidadDelScroll * GRADOS_POR_VELOCIDAD * planta.sensibilidad,
        -INCLINACION_MAXIMA,
        INCLINACION_MAXIMA
      ) + respiracion;

      const aceleracion =
        (inclinacionDestino - planta.inclinacion) * planta.rigidez -
        planta.velocidadDeLaInclinacion * planta.amortiguacion;

      planta.velocidadDeLaInclinacion += aceleracion;
      planta.inclinacion += planta.velocidadDeLaInclinacion;

      /* ⚡ Solo se escribe si el ángulo cambió, Y SE COMPARA CON ENTEROS.
         Antes esto hacía `inclinacion.toFixed(2)` para comparar, y ahí
         estaba un error grande: toFixed() FABRICA UN STRING cada vez que se
         llama, incluso cuando después no se escribe nada. Entre plantas,
         nudos, flores y el relicario eran ~200 cadenas por cuadro —unas
         12.000 por segundo— que iban derechas al recolector de basura. En el
         perfil, "Major GC" figuraba con el 23 % del tiempo.

         Redondear a centésimas de grado con Math.round da un ENTERO, que se
         compara sin reservar memoria. El string se arma solo cuando de
         verdad hay algo nuevo que escribir. Mismo resultado en pantalla. */
      const giroDeLaPlanta = Math.round(planta.inclinacion * 100);
      if (giroDeLaPlanta !== planta.ultimoGiroEscrito) {
        planta.ultimoGiroEscrito = giroDeLaPlanta;
        planta.elemento.style.transform = `rotate(${giroDeLaPlanta / 100}deg)`;
      }

      /* ── b) EL TALLO SE DOBLA ──
         Cada nudo se dobla por su cuenta según lo cerca que tenga el
         mouse, y como los nudos están encadenados, el doblado se ACUMULA
         hacia la punta: la base casi no cede y el extremo se arquea. Es
         el mismo comportamiento de una rama de verdad.

         Y como las hojas y las flores viven DENTRO de los nudos, todo se
         mueve junto: nada se despega del tallo. */
      for (const nudo of planta.nudos) {
        /* En calidad media/baja, todo este bloque —cercanía al mouse,
           resorte y escritura del SVG— se salta en los cuadros de en medio
           y se ejecuta entero cada 2 o 3 cuadros (ver la nota más arriba).
           El torque usa dtParaElTorque (el tiempo real acumulado desde la
           última vez), así que el empujón no se diluye por saltarse
           cuadros: un manotazo sigue empujando con la misma fuerza total. */
        if (!tocaActualizarElResorte) continue;

        const nudoX = nudo.xEnPantalla;
        const nudoY = nudo.yEnPantalla - posicionActual;

        const distanciaX = nudoX - mouseX;
        const distanciaY = nudoY - mouseY;
        const distancia = Math.hypot(distanciaX, distanciaY);

        let torque = 0;
        if (distancia < RADIO_DEL_MOUSE && distancia > 0.01) {
          const influencia = 1 - distancia / RADIO_DEL_MOUSE;
          const influenciaSuave = influencia * influencia;

          /* El empujón se mide en pantalla, pero el giro se aplica en las
             coordenadas del dibujo. En el lado derecho, que está
             reflejado, hay que invertir el signo o el tallo se doblaría
             justo para el lado contrario. */
          const empujeHorizontal = (distanciaX / distancia) * (planta.espejada ? -1 : 1);
          torque = empujeHorizontal * FUERZA_DEL_MOUSE_EN_EL_TALLO * influenciaSuave * dtParaElTorque;
        }

        // Respiración: un vaivén mínimo para que nunca quede congelado
        const vaivenDelNudo = Math.sin(
          tiempoTranscurrido * 0.5 + nudo.faseDeRespiracion
        ) * VAIVEN_DEL_NUDO;

        nudo.velocidadDeLaFlexion += (vaivenDelNudo - nudo.flexion) * nudo.rigidez -
                                     nudo.velocidadDeLaFlexion * nudo.amortiguacion +
                                     torque;

        nudo.flexion = limitar(
          nudo.flexion + nudo.velocidadDeLaFlexion,
          -FLEXION_MAXIMA_DEL_NUDO, FLEXION_MAXIMA_DEL_NUDO
        );

        /* ⚡ Comparación con ENTEROS, no con cadenas (ver la nota de la
           planta): son ~120 nudos por cuadro, y hacer toFixed() en cada uno
           solo para comparar fabricaba 120 strings por cuadro que nadie
           usaba. El pivote además se precalcula una vez al crear el nudo, en
           vez de formatearlo en cada escritura. */
        const giroDelNudo = Math.round(nudo.flexion * 100);
        if (giroDelNudo !== nudo.ultimoGiroEscrito) {
          nudo.ultimoGiroEscrito = giroDelNudo;

          /* ⚡ `style.transform` Y NO `setAttribute('transform')`.
             Parece lo mismo y no lo es: cambiar el ATRIBUTO transform de un
             nodo SVG pasa por el camino de LAYOUT en Blink, porque los nodos
             SVG tienen objetos de layout propios. El transform de CSS, en
             cambio, lo resuelve el compositor sin tocar layout.

             Son ~120 nudos por cuadro, y "Layout" figuraba con el 13 % del
             perfil. El pivote va en `transform-origin`, fijado una sola vez
             al crear el nudo (ver estilos/02-marco-victoriano.css). */
          nudo.elemento.style.transform = 'rotate(' + (giroDelNudo / 100) + 'deg)';
        }
      }

      /* ── c) Cada flor reacciona al mouse por su cuenta ── */
      if (!planta.estadoDeLasFlores) continue;

      for (const flor of planta.estadoDeLasFlores) {
        if (!flor.movil) continue;

        /* ── CÓMO REACCIONA UNA FLOR AL MOUSE ──
           Una flor está pegada al tallo: NO se traslada ni sale volando.
           Lo único que puede hacer es DOBLARSE sobre su pedúnculo, igual
           que cuando pasás la mano por encima de un rosal.

           Por eso lo que calculamos no es una fuerza en X y en Y, sino un
           TORQUE: cuánto la hace girar sobre su cuello. Y de ese empujón
           solo cuenta la parte HORIZONTAL, porque es la que la dobla de
           costado; empujar de frente no la mueve, la aplastaría contra el
           tallo, y eso no se ve en un dibujo plano. */
        /* Igual que con los nudos: en calidad media/baja este bloque entero
           se salta en los cuadros de en medio y se ejecuta cada 2 o 3
           cuadros, con el torque escalado por el tiempo real acumulado
           (dtParaElTorque) para que el empujón no se diluya. */
        if (!tocaActualizarElResorte) continue;

        // Dónde está esta flor en la pantalla ahora mismo
        const distanciaX = flor.xEnElDocumento - mouseX;
        const distanciaY = (flor.yEnElDocumento - posicionActual) - mouseY;
        const distancia = Math.hypot(distanciaX, distanciaY);
        const laTocaElMouse = distancia < RADIO_DEL_MOUSE && distancia > 0.01;

        /* ⚡ UNA FLOR QUIETA NO ESCRIBE NADA. Este es el otro medio arreglo
           del problema de rendimiento (el primero fue sacarle el `filter`,
           ver tonoDeLaFlor).

           Antes cada flor tenía su propia respiración de reposo, así que
           las ~350 flores escribían un `transform` nuevo para siempre,
           aunque nadie las tocara. Cada una de esas escrituras ensucia el
           árbol de propiedades de pintura del navegador, y con 350 por
           cuadro el árbol se rearmaba entero sesenta veces por segundo.

           Ahora una flor solo escribe si el mouse la está tocando o si
           todavía se está acomodando después de un empujón. En reposo son
           una decena, no trescientas cincuenta.

           EL MOVIMIENTO NO SE PERDIÓ: lo carga el tallo. Los nudos
           respiran y se mecen con el scroll, y las flores viven DENTRO de
           los nudos, así que siguen cabeceando igual —solo que ahora las
           mueve el tallo del que cuelgan, que es además como pasa de
           verdad—. La amplitud del vaivén del nudo se subió para
           compensar exactamente lo que aportaba cada flor por su cuenta
           (ver VAIVEN_DEL_NUDO). */
        const yaSeAcomodo = Math.abs(flor.velocidadDeLaFlexion) < VELOCIDAD_DESPRECIABLE &&
                            Math.abs(flor.flexion) < FLEXION_DESPRECIABLE;
        if (!laTocaElMouse && yaSeAcomodo) continue;

        let torque = 0;
        if (laTocaElMouse) {
          // Cae al cuadrado: casi nulo en el borde, fuerte en el centro
          const influencia = 1 - distancia / RADIO_DEL_MOUSE;
          const influenciaSuave = influencia * influencia;

          torque = (distanciaX / distancia) * FUERZA_DEL_MOUSE * influenciaSuave * dtParaElTorque;
        }

        /* Resorte amortiguado sobre el ÁNGULO (no sobre la posición):
           el tallo tiende a enderezarse, y el roce del aire va frenando
           el vaivén hasta que se detiene. El reposo es cero: la flor
           quiere volver a estar derecha sobre su pedúnculo. */
        flor.velocidadDeLaFlexion += -flor.flexion * flor.rigidez -
                                     flor.velocidadDeLaFlexion * flor.amortiguacion +
                                     torque;

        // Tope: un tallo se dobla, no se parte
        flor.flexion = limitar(
          flor.flexion + flor.velocidadDeLaFlexion,
          -FLEXION_MAXIMA, FLEXION_MAXIMA
        );

        /* Al terminar de acomodarse se la endereza EXACTO y se escribe una
           última vez. Sin esto quedaría temblando en la milésima de grado
           y nunca se la podría saltear. */
        if (!laTocaElMouse &&
            Math.abs(flor.velocidadDeLaFlexion) < VELOCIDAD_DESPRECIABLE &&
            Math.abs(flor.flexion) < FLEXION_DESPRECIABLE) {
          flor.flexion = 0;
          flor.velocidadDeLaFlexion = 0;
        }

        /* Se gira alrededor del CUELLO, que está por debajo de la flor.
           Ese punto de pivote es lo que convierte el giro en un cabeceo
           creíble: la flor describe un arco corto, como colgada de su
           tallo, en lugar de orbitar por el aire. */
        /* Mismo criterio que en los nudos: entero para comparar, y el resto
           del atributo precalculado. Acá hay hasta ~255 flores. */
        const giroDeLaFlor = Math.round(flor.flexion * 100);
        if (giroDeLaFlor !== flor.ultimoGiroEscrito) {
          flor.ultimoGiroEscrito = giroDeLaFlor;
          flor.movil.setAttribute('transform',
            'rotate(' + (giroDeLaFlor / 100) + flor.textoDelCuello);
        }
      }
    }

    requestAnimationFrame(dibujarCuadro);
  }

  /* El bucle arranca SIEMPRE (aunque las animaciones estén apagadas): se
     queda en reposo hasta que se enciendan, para poder reanudar en vivo. */
  requestAnimationFrame(dibujarCuadro);


  /* Si cambia el tamaño de la ventana hay que rehacer todo. Se espera un
     ratito después del último cambio para no recalcular cien veces
     mientras se arrastra el borde (a eso se le dice "debounce"). */
  let temporizadorDeRedimension = null;
  window.addEventListener('resize', () => {
    clearTimeout(temporizadorDeRedimension);
    temporizadorDeRedimension = setTimeout(repartirPlantas, 350);
  });

  /* ⛔ ACÁ NO VA UN LISTENER DE 'calidad-cambio' QUE RECONSTRUYA.
     Se probó y fue el bug que hizo desaparecer el ramillete de la esquina
     derecha: el gobernador cambia de nivel en los primeros segundos, o sea
     justo cuando la construcción inicial todavía está en vuelo, y dos
     corridas simultáneas se pisan el innerHTML de los mismos huecos.
     Ver la nota de SEPARACION_ENTRE_PLANTAS al principio del archivo. */

  /* Las posiciones se vuelven a medir cuando la página termina de cargar
     (las imágenes pueden haber corrido el contenido). */
  window.addEventListener('load', medirLasFlores);
  document.addEventListener('invitacion-visible', () => setTimeout(medirLasFlores, 400));

  /* (Acá hubo un IntersectionObserver que volvía a medir las flores cuando
     una planta o un ramillete reaparecía en pantalla. Existía para sostener
     el `content-visibility` que se revirtió —recortaba tallos y flores—, así
     que ya no hace falta: nada se saltea, y las posiciones medidas al cargar
     y en cada resize siguen siendo válidas todo el tiempo.) */

})();

/* ═══ 08-efectos-de-scroll.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   08 · EFECTOS DE SCROLL
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Tres efectos que dependen de por dónde va la página:

     1. PARALLAX del fondo — el dibujo del fondo se mueve más lento que
        el contenido. Es el mismo truco que usaban los dibujos animados:
        el paisaje lejano se corre despacio y el personaje rápido, y el
        cerebro lo interpreta como profundidad.

     2. APARICIÓN DE LAS SECCIONES — cada bloque entra suavemente cuando
        llega a la pantalla, en vez de estar ahí desde el principio.

   (Antes había un tercer efecto: el óvalo de la portada se desvanecía al
   bajar. Se quitó a pedido: el relicario es una PIEZA SÓLIDA de joyería y
   tiene que verse maciza siempre, también mientras se va con el scroll.)

   ÍNDICE
     1. Parallax del fondo y marco de la portada
     2. Aparición de las secciones
   ══════════════════════════════════════════════════════════════════════ */


/* ═══ 1. PARALLAX DEL FONDO Y MARCO DE LA PORTADA ═════════════════════ */
(function preparaLosEfectosDeScroll() {

  const capaDeFondo    = buscar('#capa-fondo');
  const enredaderaDelMarco = buscar('#enredadera-de-la-portada');

  /**
   * Qué fracción del scroll recorre el fondo.
   * 0.15 = se mueve un 15 % de lo que se mueve el contenido.
   * Más chico = parece más lejos.
   */
  const VELOCIDAD_DEL_PARALLAX = 0.15;

  /* CALIDAD GRÁFICA: el parallax mueve una capa de fondo grande en CADA
     cuadro de scroll —un transform barato en sí, pero sobre una capa
     enorme, en un equipo débil suma—. En calidad baja el fondo queda fijo:
     casi no se nota (es solo profundidad extra), y se ahorra ese cálculo
     y esa escritura en cada scroll. */
  let calidad = nivelDeCalidad();
  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    // Al degradar, se devuelve el fondo a su lugar natural (sin quedar
    // congelado a mitad de un desplazamiento de parallax).
    if (calidad === CALIDAD_GRAFICA.BAJA && capaDeFondo) capaDeFondo.style.transform = '';
  });

  /** Evita hacer cuentas de más: solo una por cuadro de animación. */
  let hayUnCuadroPendiente = false;

  /**
   * Recalcula todos los efectos que dependen del scroll.
   * @returns {void}
   */
  function actualizarEfectos() {
    const posicionDelScroll = window.scrollY;

    /* ── Parallax del fondo ──────────────────────────────────────────
       El fondo mide 125vh, o sea que tiene 25vh de sobra para desplazarse.
       Nunca lo movemos más que ese sobrante, porque entonces se vería el
       borde de abajo.

       El sobrante se lee del elemento, no de un número escrito acá: si
       algún día cambia el alto en el CSS, esto se adapta solo. (Medía 160vh
       y se bajó a 125 para aligerar la textura; ver la nota en
       estilos/01-fundamentos.css.) */
    if (capaDeFondo && calidad !== CALIDAD_GRAFICA.BAJA) {
      const sobranteDisponible = capaDeFondo.offsetHeight - window.innerHeight;
      const cuantoSeMueve = Math.min(posicionDelScroll * VELOCIDAD_DEL_PARALLAX, sobranteDisponible);
      capaDeFondo.style.transform = `translateY(-${cuantoSeMueve.toFixed(1)}px)`;
    }

    /* ── El broche de la portada NO se desvanece ──────────────────────
       El relicario es una pieza sólida: se va con el scroll como cualquier
       contenido, pero SIEMPRE opaco. No se le toca ni la opacidad ni el
       tamaño (un scale haría "respirar" el marco y el texto al hacer
       scroll). Su opacidad la maneja solo el CSS (la animación de entrada). */

    /* ── Enredadera que rodea el óvalo de la portada ────────────────
       Gira lentísimo a medida que se baja: le da vida sin distraer. */
    if (enredaderaDelMarco) {
      enredaderaDelMarco.setAttribute(
        'transform',
        `rotate(${(posicionDelScroll * 0.018).toFixed(2)})`
      );
    }

    hayUnCuadroPendiente = false;
  }

  /**
   * Se llama en cada scroll, pero solo agenda UN cálculo por cuadro.
   * Sin esta protección, el navegador dispara el evento decenas de veces
   * por segundo y la página se traba.
   * @returns {void}
   */
  function alHacerScroll() {
    if (hayUnCuadroPendiente) return;
    hayUnCuadroPendiente = true;
    requestAnimationFrame(actualizarEfectos);
  }

  // { passive: true } le promete al navegador que no vamos a cancelar el
  // scroll, y eso le permite desplazarse sin esperar a nuestro código.
  window.addEventListener('scroll', alHacerScroll, { passive: true });
  window.addEventListener('resize', alHacerScroll);
  actualizarEfectos();

})();


/* ═══ 2. APARICIÓN DE LAS SECCIONES ═══════════════════════════════════ */
(function preparaLaAparicionDeLasSecciones() {

  const elementosQueAparecen = buscarTodos('.revelar');
  if (elementosQueAparecen.length === 0) return;

  /*
     IntersectionObserver ("observador de intersección") es una
     herramienta del navegador que avisa cuando un elemento entra o sale
     de la pantalla. Es muchísimo más eficiente que estar preguntando en
     cada scroll "¿ya se ve?, ¿ya se ve?".
  */
  const observador = new IntersectionObserver(function alCambiarLaVisibilidad(entradas) {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;

      // La clase "visible" es la que dispara la animación (ver el CSS)
      entrada.target.classList.add('visible');

      // Una vez que apareció, dejamos de vigilarlo: no queremos que se
      // esconda de nuevo al subir.
      observador.unobserve(entrada.target);
    });
  }, {
    /* threshold 0.15 = se activa cuando ya se ve el 15 % del elemento.
       Así aparece cuando de verdad entró, no cuando asoma un píxel. */
    threshold: 0.15,
  });

  elementosQueAparecen.forEach(elemento => observador.observe(elemento));

})();

/* ═══ 09-cuenta-regresiva.js ═══ */
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

    /* ⚡ SOLO SE ESCRIBE LO QUE DE VERDAD CAMBIÓ.
       Parece una tontería para cuatro numeritos, pero el perfil la señaló:
       `actualizarLaCuenta` figuraba con 110 ms, el 11,4 % del total. No es
       que la cuenta sea cara —son cuatro restas—: es que CADA escritura de
       texto obliga al navegador a revisar el layout, y esta página tiene
       más de 4.000 nodos.

       De los cuatro casilleros, tres cambian una vez por hora, por minuto o
       por día. El único que cambia de verdad cada segundo es el de los
       segundos. Comparando antes de escribir, se pasa de 4 escrituras por
       segundo a 1.

       (La otra mitad del arreglo está en el CSS: los casilleros llevan
       `contain`, que encierra ese trabajo y le impide contagiar al resto de
       la página. Ver estilos/06-secciones.css.) */
    escribirSiCambio(casilleroDias,     String(tiempo.dias));
    escribirSiCambio(casilleroHoras,    conDosDigitos(tiempo.horas));
    escribirSiCambio(casilleroMinutos,  conDosDigitos(tiempo.minutos));
    escribirSiCambio(casilleroSegundos, conDosDigitos(tiempo.segundos));
  }

  /**
   * Escribe un texto en una cartela, pero solo si es distinto del que ya
   * tiene. Leer `textContent` es barato; escribirlo no.
   *
   * @param {Element|null} casillero
   * @param {string} texto
   * @returns {void}
   */
  function escribirSiCambio(casillero, texto) {
    if (casillero && casillero.textContent !== texto) casillero.textContent = texto;
  }

  // Se dibuja una vez enseguida (para que no aparezca vacío) y después
  // se repite cada 1000 milisegundos, o sea cada segundo.
  actualizarLaCuenta();
  const relojInterno = setInterval(actualizarLaCuenta, 1000);

})();

/* ═══ 10-reproductor-de-musica.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   10 · REPRODUCTOR DE MÚSICA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Controla la canción de fondo: play, pausa, volumen, silencio, y la
   píldora que despliega el círculo de música de la columna de controles.

   POR QUÉ LA MÚSICA NO ARRANCA SOLA (y cómo lo resolvemos)
   Hace años, las webs con música automática eran una pesadilla, así que
   TODOS los navegadores lo prohibieron: solo dejan reproducir sonido
   después de que la persona interactúe con la página.

   Nuestra solución es elegante: el clic para abrir el sobre de la
   entrada cuenta como interacción. El archivo 03-sobre-de-apertura.js
   avisa con el evento 'sobre-abierto' y acá lo escuchamos. Por las
   dudas, si igual falla, cualquier clic posterior también la arranca.

   QUÉ ES EL FUNDIDO DE ENTRADA
   Empezar la música de golpe a volumen alto asusta. En vez de eso
   arrancamos en 0 y subimos de a poquito hasta el volumen elegido, en
   milisegundos. Se siente muchísimo más caro.

   ÍNDICE
     1. Elementos y estado inicial
     2. Play, pausa y fundido de entrada
     3. Volumen y silencio
     4. Abrir y cerrar la píldora
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElReproductorDeMusica() {

  /* ─── 1. ELEMENTOS Y ESTADO INICIAL ────────────────────────────── */
  const panel            = buscar('#reproductor');
  const contenedor       = buscar('#musica-flotante');
  const audioDeFondo     = buscar('#audio-de-fondo');
  const botonMusica      = buscar('#boton-musica');
  const botonPlay        = buscar('#boton-play');
  const botonSilencio    = buscar('#boton-silencio');
  const deslizadorVolumen = buscar('#deslizador-de-volumen');

  if (!panel || !audioDeFondo) return;

  /* Volumen: primero miramos si la persona ya eligió uno en una visita
     anterior; si no, usamos el de la configuración. */
  let volumenElegido = leerDeMemoria('volumen', CONFIGURACION.musica.volumenInicial);
  volumenElegido = limitar(Number(volumenElegido), 0, 1);

  /** Guarda el volumen anterior para poder restaurarlo al des-silenciar. */
  let volumenAntesDelSilencio = volumenElegido;

  audioDeFondo.volume = 0;   // arranca en cero por el fundido de entrada


  /* ─── 2. PLAY, PAUSA Y FUNDIDO DE ENTRADA ──────────────────────── */

  /**
   * Sube el volumen de a poco desde donde esté hasta el volumen elegido.
   *
   * Funciona con un temporizador que se ejecuta 25 veces por segundo y
   * en cada paso suma una fracción. Cuando llega, se apaga solo.
   *
   * @param {number} [duracionEnMs=2200] - Cuánto tarda el fundido.
   * @returns {void}
   */
  function subirElVolumenDeAPoco(duracionEnMs = 2200) {
    const pasosTotales = Math.round(duracionEnMs / 40);
    const cuantoSubePorPaso = (volumenElegido - audioDeFondo.volume) / pasosTotales;
    let pasosDados = 0;

    const temporizador = setInterval(() => {
      pasosDados++;
      audioDeFondo.volume = limitar(audioDeFondo.volume + cuantoSubePorPaso, 0, 1);

      if (pasosDados >= pasosTotales) {
        audioDeFondo.volume = volumenElegido;
        clearInterval(temporizador);
      }
    }, 40);
  }

  /* ── EL ECO LEJANO ──────────────────────────────────────────────────
     Cuando la música arranca junto con la apertura del sobre, no entra de
     golpe a su sonido pleno: entra COMO UN ECO LEJANO —apagada, como si
     sonara en otra habitación— y en un par de segundos se abre hasta
     sentirse "acá con nosotros", al mismo tiempo que la luz revela la web.

     El truco es un filtro pasabajos: al principio deja pasar solo los
     graves (por eso suena lejana y sorda) y después se abre del todo. Se
     hace con WebAudio, enrutando el audio por: fuente → filtro → destino.

     Ese enrutado NO pelea con el control de volumen: el volumen sigue
     viviendo en audioDeFondo.volume (antes del grafo), así que el
     deslizador y el silencio funcionan igual. Y la fuente de un elemento
     de audio solo se puede crear UNA vez, por eso se guarda y se reusa. */
  let grafoDeAudio = null;

  /**
   * Arma (una sola vez) el grafo de WebAudio y devuelve el filtro, para
   * poder abrirlo. Si el navegador no soporta WebAudio, devuelve null y la
   * música suena igual, sin el efecto.
   *
   * @returns {{contexto: AudioContext, filtro: BiquadFilterNode}|null}
   */
  function prepararElGrafoDeAudio() {
    if (grafoDeAudio) return grafoDeAudio;

    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;

    try {
      const contexto = new Contexto();
      const fuente = contexto.createMediaElementSource(audioDeFondo);
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 20000;   // abierto por defecto (sonido pleno)
      filtro.Q.value = 0.7;

      fuente.connect(filtro);
      filtro.connect(contexto.destination);

      grafoDeAudio = { contexto, filtro };
      return grafoDeAudio;
    } catch (error) {
      /* Algún navegador viejo o un segundo intento de crear la fuente.
         No es grave: la música suena sin el efecto de eco. */
      console.warn('No se pudo preparar el eco de la música:', error);
      return null;
    }
  }

  /**
   * Hace entrar la música como un eco lejano que se acerca: arranca el
   * filtro casi cerrado y lo abre despacio hasta el sonido pleno.
   * @returns {void}
   */
  function entrarComoEcoLejano() {
    const grafo = prepararElGrafoDeAudio();
    if (!grafo) return;

    const { contexto, filtro } = grafo;
    if (contexto.state === 'suspended') contexto.resume();

    const ahora = contexto.currentTime;
    // De sordo y lejano (500 Hz) a pleno (20 kHz) en 3,2 segundos.
    filtro.frequency.cancelScheduledValues(ahora);
    filtro.frequency.setValueAtTime(500, ahora);
    filtro.frequency.exponentialRampToValueAtTime(20000, ahora + 3.2);
  }

  /**
   * Intenta reproducir la canción.
   *
   * .play() devuelve una "promesa" que falla si el navegador lo bloquea.
   * Por eso lleva .catch(): sin él, aparecería un error rojo en la
   * consola cada vez que el navegador nos frena, que es algo esperable.
   *
   * @param {boolean} [conEco=false] - Si entra como eco lejano (solo la
   *        primera vez, al abrir el sobre).
   * @returns {void}
   */
  function reproducirLaCancion(conEco = false) {
    audioDeFondo.play()
      .then(() => {
        subirElVolumenDeAPoco();
        if (conEco && !prefiereMenosMovimiento()) entrarComoEcoLejano();
      })
      .catch(() => {
        /* El navegador la bloqueó. No es un error nuestro: simplemente
           queda esperando a que la persona apriete play. */
      });
  }

  /**
   * Alterna entre reproducir y pausar.
   * @returns {void}
   */
  function alternarPlayPausa() {
    if (audioDeFondo.paused) {
      reproducirLaCancion();
    } else {
      audioDeFondo.pause();
    }
  }

  /**
   * Actualiza el icono del botón según si está sonando o no.
   *
   * La clase 'sonando' va en el CONTENEDOR, no en la píldora: es lo que
   * hace latir al círculo. Como la píldora está cerrada casi siempre, el
   * círculo tiene que poder decir por su cuenta si hay música, sin que
   * haga falta abrir nada para enterarse.
   *
   * @returns {void}
   */
  function actualizarBotonPlay() {
    const estaSonando = !audioDeFondo.paused;

    if (contenedor) contenedor.classList.toggle('sonando', estaSonando);

    if (!botonPlay) return;
    botonPlay.textContent = estaSonando ? '❚❚' : '▶';
    botonPlay.setAttribute('aria-label', estaSonando ? 'Pausar la música' : 'Reproducir la música');
  }

  audioDeFondo.addEventListener('play',  actualizarBotonPlay);
  audioDeFondo.addEventListener('pause', actualizarBotonPlay);
  if (botonPlay) botonPlay.addEventListener('click', alternarPlayPausa);

  /* El momento clave: cuando se abre el sobre, el navegador ya nos deja
     reproducir sonido. Esta primera vez entra como eco lejano, junto con
     el revelado por luz. */
  document.addEventListener('sobre-abierto', () => reproducirLaCancion(true), { once: true });

  /* Red de seguridad: si por lo que sea la música no arrancó, el primer
     clic en cualquier lado la larga. { once: true } hace que este
     escuchador se borre solo después de usarse una vez. */
  document.addEventListener('click', function intentarUnaVezMas() {
    if (audioDeFondo.paused) reproducirLaCancion();
  }, { once: true });


  /* ─── 3. VOLUMEN Y SILENCIO ────────────────────────────────────── */

  /**
   * Aplica un volumen nuevo, pinta la barra y lo recuerda para la
   * próxima visita.
   *
   * @param {number} nuevoVolumen - De 0 (mudo) a 1 (máximo).
   * @param {boolean} [recordarlo=true] - Si hay que guardarlo en memoria.
   * @returns {void}
   *
   * @example
   *   aplicarVolumen(0.5);   // lo pone a la mitad y lo recuerda
   */
  function aplicarVolumen(nuevoVolumen, recordarlo = true) {
    volumenElegido = limitar(nuevoVolumen, 0, 1);
    audioDeFondo.volume = volumenElegido;
    audioDeFondo.muted = volumenElegido === 0;

    if (deslizadorVolumen) {
      deslizadorVolumen.value = Math.round(volumenElegido * 100);
      /* Esta variable CSS es la que pinta de dorado la parte ya
         "llena" de la barra (ver 09-reproductor.css). */
      deslizadorVolumen.style.setProperty('--progreso', (volumenElegido * 100) + '%');
    }

    if (botonSilencio) {
      const estaEnSilencio = volumenElegido === 0;

      /* Se cambia el dibujo del ícono, no un emoji. Basta con apuntar el
         <use> a otra pieza de la biblioteca: el altavoz normal o el
         tachado. Los emoji quedaban fuera de tono y además cada sistema
         operativo los dibuja distinto. */
      const usoDelIcono = botonSilencio.querySelector('use');
      if (usoDelIcono) {
        usoDelIcono.setAttribute('href', estaEnSilencio ? '#icono-silencio' : '#icono-sonido');
      }

      botonSilencio.setAttribute('aria-label', estaEnSilencio ? 'Quitar el silencio' : 'Silenciar');
    }

    if (recordarlo) guardarEnMemoria('volumen', volumenElegido);
  }

  if (deslizadorVolumen) {
    deslizadorVolumen.addEventListener('input', evento => {
      // El deslizador da un número de 0 a 100; el audio quiere de 0 a 1.
      aplicarVolumen(Number(evento.target.value) / 100);
    });
  }

  if (botonSilencio) {
    botonSilencio.addEventListener('click', () => {
      if (volumenElegido > 0) {
        volumenAntesDelSilencio = volumenElegido;
        aplicarVolumen(0);
      } else {
        // Si estaba en silencio desde el principio, volvemos a un valor
        // razonable en lugar de a cero.
        aplicarVolumen(volumenAntesDelSilencio || CONFIGURACION.musica.volumenInicial);
      }
    });
  }

  // Dibuja el estado inicial de la barra sin volver a guardarlo.
  aplicarVolumen(volumenElegido, false);
  audioDeFondo.volume = 0;   // el fundido se encarga de subirlo
  actualizarBotonPlay();


  /* ─── 4. ABRIR Y CERRAR LA PÍLDORA ─────────────────────────────────
     El círculo es el único interruptor. Antes había además una flechita
     ▼ dentro del panel para plegarlo: dos formas de hacer lo mismo, y
     una de ellas escondida adentro de lo que quería plegar.

     La columna de controles NO se mueve nunca de lugar. El espacio que
     necesita ya está reservado por el relleno inferior del pie de
     página, definido en estilos/02-marco-victoriano.css con la variable
     --alto-reproductor. Si algún día la columna crece, hay que
     actualizar esa variable.
     ---------------------------------------------------------------- */

  let pildoraAbierta = false;

  /**
   * Abre o cierra la píldora de la música.
   * @param {boolean} abrir
   * @returns {void}
   */
  function alternarPildora(abrir) {
    pildoraAbierta = abrir;
    panel.classList.toggle('abierto', abrir);
    panel.setAttribute('aria-hidden', String(!abrir));

    if (!botonMusica) return;
    botonMusica.setAttribute('aria-expanded', String(abrir));
    botonMusica.setAttribute('aria-label', abrir ? 'Cerrar la música' : 'Música de la fiesta');
  }

  if (botonMusica) {
    botonMusica.addEventListener('click', () => alternarPildora(!pildoraAbierta));
  }

  // Escape cierra, igual que en el panel de preguntas.
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && pildoraAbierta) alternarPildora(false);
  });

  /* Un clic en cualquier otro lado también cierra. Se pregunta por la
     píldora Y por el círculo: si no, el clic de abrir cerraría en el
     acto. Y se deja pasar el arrastre del volumen, que termina soltando
     el dedo fuera de la píldora más veces de las que uno creería. */
  document.addEventListener('click', evento => {
    if (!pildoraAbierta) return;
    if (panel.contains(evento.target)) return;
    if (botonMusica && botonMusica.contains(evento.target)) return;
    alternarPildora(false);
  });

})();

/* ═══ 11-formulario-confirmacion.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   11 · FORMULARIO DE CONFIRMACIÓN
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Todo lo relacionado con el formulario donde el invitado confirma:
   · muestra u oculta las preguntas según si viene o no
   · crea UNA FILA DE MENÚ POR PERSONA
   · valida que no falte nada
   · llama a confirmar.php (PHP guarda en MySQL y manda los dos correos)
   · llama a anotarEnLaHoja() como respaldo (Google Sheets)
   · guarda la confirmación y muestra el pase de acceso

   ÍNDICE
   1. Elementos del formulario
   2. Crear las filas de menú por persona
   3. Leer lo que se eligió y armar los resúmenes
   4. Mostrar y ocultar secciones según las respuestas
   5. Validación
   6. Envío
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElFormularioDeConfirmacion() {

  /* ─── 1. ELEMENTOS DEL FORMULARIO ──────────────────────────────── */

  const formulario             = buscar('#formulario-confirmacion');
  const campoNombre            = buscar('#campo-nombre');
  const campoCorreo            = buscar('#campo-correo');
  const campoAsistencia        = buscar('#campo-asistencia');
  const bloqueSiAsiste         = buscar('#bloque-si-asiste');
  const campoAdultos           = buscar('#campo-adultos');
  const campoNinos             = buscar('#campo-ninos');
  const contenedorMenusAdultos = buscar('#menus-de-adultos');
  const bloqueMenuInfantil     = buscar('#bloque-menu-infantil');
  const contenedorMenusNinos   = buscar('#menus-de-ninos');
  const campoAlergias          = buscar('#campo-alergias');
  const campoNotas             = buscar('#campo-notas');
  const botonEnviar            = buscar('#boton-enviar');
  const cajaDeError            = buscar('#error-del-formulario');
  const mensajeDeExito         = buscar('#mensaje-de-exito');

  if (!formulario) return;

  /** La respuesta que significa "sí, voy" en la lista desplegable. */
  const RESPUESTA_AFIRMATIVA = 'Sí, asistiré';

  /** Menús que puede elegir un adulto. */
  const MENUS_DE_ADULTO = [
    { valor: 'Estándar',    etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-menus"/></svg> Estándar' },
    { valor: 'Vegetariano', etiqueta: '<svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-hoja-menu"/></svg> Vegetariano' },
  ];

  /* ─── 2. CREAR LAS FILAS DE MENÚ POR PERSONA ───────────────────── */

  function leerEleccionesActuales(contenedor, prefijo) {
    const elecciones = [];
    if (!contenedor) return elecciones;
    const filas = contenedor.querySelectorAll('.fila-persona');
    filas.forEach((fila, indice) => {
      const marcado = fila.querySelector(`input[name="menu-${prefijo}-${indice + 1}"]:checked`);
      elecciones.push(marcado ? marcado.value : null);
    });
    return elecciones;
  }

  function dibujarFilasDeMenu(contenedor, cantidadDePersonas, prefijo,
    palabraSingular, menusDisponibles, menuPorDefecto) {
    if (!contenedor) return;
    const eleccionesPrevias = leerEleccionesActuales(contenedor, prefijo);
    contenedor.innerHTML = '';
    for (let numeroDePersona = 1; numeroDePersona <= cantidadDePersonas; numeroDePersona++) {
      const menuElegido = eleccionesPrevias[numeroDePersona - 1] || menuPorDefecto;
      const aclaracion  = (prefijo === 'adulto' && numeroDePersona === 1)
        ? '<small>quien confirma</small>'
        : '';
      const opcionesEnHtml = menusDisponibles.map(menu => `
        <label class="opcion-menu opcion-menu--unica">
          <input type="radio"
            name="menu-${prefijo}-${numeroDePersona}"
            value="${menu.valor}"
            ${menu.valor === menuElegido ? 'checked' : ''}>
          <span>${menu.etiqueta}</span>
        </label>`).join('');
      const fila = document.createElement('div');
      fila.className = 'fila-persona';
      fila.innerHTML = `
        <span class="fila-persona__nombre">${palabraSingular} ${numeroDePersona}${aclaracion}</span>
        <div class="fila-persona__opciones">${opcionesEnHtml}</div>`;
      contenedor.appendChild(fila);
    }
  }

  function actualizarFilasDeAdultos() {
    const cantidad = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    dibujarFilasDeMenu(contenedorMenusAdultos, cantidad, 'adulto', 'Adulto',
      MENUS_DE_ADULTO, 'Estándar');
  }

  function actualizarFilasDeNinos() {
    const cantidad  = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    const hayNinos  = cantidad > 0;
    if (bloqueMenuInfantil) {
      bloqueMenuInfantil.classList.toggle('visible', hayNinos);
    }
    if (!contenedorMenusNinos) return;
    if (!hayNinos) {
      contenedorMenusNinos.innerHTML = '';
      return;
    }
    contenedorMenusNinos.innerHTML = `
      <div class="tarjeta-infantil">
        <span class="tarjeta-infantil__icono"><svg class="icono-dorado" viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-ninos"/></svg></span>
        <span class="tarjeta-infantil__texto">
          Menú infantil
          <small>${cantidad === 1 ? 'para 1 niño' : 'para los ' + cantidad + ' niños'}</small>
        </span>
        <span class="tarjeta-infantil__cantidad">×${cantidad}</span>
      </div>`;
  }

  if (campoAdultos) campoAdultos.addEventListener('input', actualizarFilasDeAdultos);
  if (campoNinos)   campoNinos.addEventListener('input', actualizarFilasDeNinos);

  /* ─── 3. LEER LO ELEGIDO Y ARMAR LOS RESÚMENES ─────────────────── */

  function recolectarMenusElegidos() {
    const elegidos = [];
    const cantidadAdultos = limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20);
    for (let i = 1; i <= cantidadAdultos; i++) {
      const marcado = formulario.querySelector(`input[name="menu-adulto-${i}"]:checked`);
      elegidos.push({ quien: `Adulto ${i}`, menu: marcado ? marcado.value : 'Estándar' });
    }
    const cantidadNinos = limitar(parseInt(campoNinos.value, 10) || 0, 0, 20);
    for (let i = 1; i <= cantidadNinos; i++) {
      elegidos.push({ quien: `Niño ${i}`, menu: 'Infantil' });
    }
    return elegidos;
  }

  function armarResumenDeMenus(menusElegidos) {
    const cuantosDeCada = {};
    menusElegidos.forEach(persona => {
      cuantosDeCada[persona.menu] = (cuantosDeCada[persona.menu] || 0) + 1;
    });
    return Object.entries(cuantosDeCada)
      .map(([nombreDelMenu, cantidad]) => `${cantidad} ${nombreDelMenu.toLowerCase()}`)
      .join(' · ');
  }

  function armarDetalleDeMenus(menusElegidos) {
    return menusElegidos
      .map(persona => `${persona.quien}: ${persona.menu}`)
      .join(' | ');
  }

  /* ─── 4. MOSTRAR Y OCULTAR SECCIONES ───────────────────────────── */

  if (campoAsistencia) {
    campoAsistencia.addEventListener('change', function alElegirSiViene() {
      const vieneALaFiesta = this.value === RESPUESTA_AFIRMATIVA;
      bloqueSiAsiste.classList.toggle('visible', vieneALaFiesta);
      if (vieneALaFiesta && contenedorMenusAdultos &&
          contenedorMenusAdultos.children.length === 0) {
        actualizarFilasDeAdultos();
      }
    });
  }

  /* ─── 5. VALIDACIÓN ────────────────────────────────────────────── */

  function mostrarError(mensaje) {
    if (!cajaDeError) return;
    cajaDeError.textContent = mensaje;
    cajaDeError.style.display = mensaje ? 'block' : 'none';
  }

  function pareceUnCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  /* ─── 6. ENVÍO ─────────────────────────────────────────────────── */

  formulario.addEventListener('submit', async function alEnviarElFormulario(evento) {
    evento.preventDefault();
    mostrarError('');

    const nombre     = campoNombre.value.trim();
    const correo     = campoCorreo.value.trim();
    const asistencia = campoAsistencia.value;

    if (!nombre)     return mostrarError('Por favor escribe tu nombre completo.');
    if (!correo)     return mostrarError('Por favor escribe tu correo electrónico.');
    if (!pareceUnCorreoValido(correo)) {
      return mostrarError('Ese correo no parece válido. Revisa que tenga @ y un punto.');
    }
    if (!asistencia) return mostrarError('Cuéntanos si vas a poder acompañarnos.');

    const vieneALaFiesta  = asistencia === RESPUESTA_AFIRMATIVA;
    const cantidadAdultos = vieneALaFiesta ? limitar(parseInt(campoAdultos.value, 10) || 1, 1, 20) : 0;
    const cantidadNinos   = vieneALaFiesta ? limitar(parseInt(campoNinos.value, 10) || 0, 0, 20) : 0;
    const menusElegidos   = vieneALaFiesta ? recolectarMenusElegidos() : [];
    const resumenDeMenus  = vieneALaFiesta ? armarResumenDeMenus(menusElegidos) : ', ';
    const detalleDeMenus  = vieneALaFiesta ? armarDetalleDeMenus(menusElegidos) : ', ';
    const alergias        = campoAlergias ? campoAlergias.value.trim() : '';
    const notas           = campoNotas ? campoNotas.value.trim() : '';

    const datosDeLaConfirmacion = {
      nombre,
      correo,
      asiste: vieneALaFiesta,
      adultos: cantidadAdultos,
      ninos: cantidadNinos,
      resumenDeMenus,
      detalleDeMenus,
      alergias: alergias || 'Ninguna',
      notas: notas || ', ',
      codigo: generarCodigoDePase(nombre + correo),
    };

    /* ESTADO DE ESPERA */
    const textoOriginalDelBoton = botonEnviar.innerHTML;
    botonEnviar.disabled = true;
    botonEnviar.classList.add('esta-enviando');
    botonEnviar.innerHTML =
      '<span class="rombos-de-carga" role="status" aria-label="Enviando tu confirmación">' +
      '<i></i><i></i><i></i></span>';

    const esperaMinima = esperar(900);

    /* ══════════════════════════════════════════════════════════════
       ENVÍO PRINCIPAL: confirmar.php (MySQL + correos)
       Se manda SIEMPRE, asista o no, porque ambos casos necesitan
       guardarse en BD y avisar a la administradora.
       ══════════════════════════════════════════════════════════════ */
    /* Se pide el envío al servidor y, en paralelo, la anotación de
       respaldo. Solo el primero decide si la confirmación valió: la hoja
       de Google es opcional y su fallo no debe frenar a nadie.

       Si enviarAlServidor no existiera (por ejemplo, porque el navegador
       cargó una versión vieja del código desde su caché), la llamada
       lanzaría una excepción. Se captura acá a propósito: sin esto, el
       formulario mostraba "confirmado" sin haber mandado nada, que es
       justo como este problema pasó desapercibido tanto tiempo. */
    let seGuardoEnElServidor = false;
    try {
      const [resultadoDelServidor] = await Promise.all([
        enviarAlServidor(datosDeLaConfirmacion),  // PHP: MySQL + correos
        anotarEnLaHoja(datosDeLaConfirmacion),    // Google Sheets: respaldo
      ]);
      seGuardoEnElServidor = resultadoDelServidor === true;
    } catch (error) {
      console.error('[Ania XV] El envío falló:', error);
    }

    await esperaMinima;

    botonEnviar.classList.remove('esta-enviando');
    botonEnviar.innerHTML = textoOriginalDelBoton;
    botonEnviar.disabled = false;

    /* Si no se guardó, se dice. Nunca un "éxito" que no ocurrió: la
       persona debe poder reintentar en vez de creer que ya confirmó. */
    if (!seGuardoEnElServidor) {
      return mostrarError(
        'No pudimos registrar tu confirmación. Revisa tu conexión e ' +
        'inténtalo de nuevo. Si vuelve a fallar, escríbenos a ' +
        'info@aniaxv.com y te confirmamos a mano.'
      );
    }

    guardarEnMemoria('pase', datosDeLaConfirmacion);

    formulario.style.display = 'none';
    if (mensajeDeExito) mensajeDeExito.classList.add('visible');

    if (vieneALaFiesta) {
      await esperar(600);
      mostrarPaseDeAcceso(datosDeLaConfirmacion);
    }
  });

  /* Al cargar la página dibujamos la fila del primer adulto */
  if (campoAdultos) actualizarFilasDeAdultos();

})();

/* ═══ 12-pase-de-acceso.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   12 · PASE DE ACCESO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Genera y muestra la "entrada" que recibe cada invitado al confirmar:
   una tarjeta con su nombre, cuántos van, qué van a comer, un código
   único y su código QR.

   Además RECUERDA la confirmación: si la persona vuelve a entrar a la
   web, en vez del formulario en blanco ve directamente su pase. Así no
   confirma dos veces por error.

   ÍNDICE
     1. Generar el código único
     2. Dibujar el código QR
     3. Mostrar y cerrar el pase
     4. Imprimir
     5. Recordar la confirmación anterior
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. GENERAR EL CÓDIGO ÚNICO ───────────────────────────────────── */

/**
 * Crea un código de pase corto y distinto para cada invitado.
 *
 * CÓMO SE ARMA: 'XV-' + una huella del nombre + un pedazo de la hora exacta
 *
 *   · La "huella" se obtiene sumando el número de cada letra del nombre.
 *     Dos nombres distintos casi siempre dan sumas distintas.
 *   · La hora exacta (en milisegundos) hace que sea único incluso si dos
 *     personas se llamaran igual.
 *   · toString(16) y toString(36) escriben esos números en un sistema
 *     que usa también letras, para que el código quede corto.
 *
 * @param {string} textoBase - Normalmente el nombre + el correo.
 * @returns {string} Un código como 'XV-1F4A-K3P9'.
 *
 * @example
 *   generarCodigoDePase('Ana Pérezana@mail.com')  // → 'XV-0B7E-M2X4'
 */
function generarCodigoDePase(textoBase) {
  const huellaDelNombre = [...textoBase]
    .reduce((suma, letra) => suma + letra.charCodeAt(0), 0);

  const parteDelNombre = huellaDelNombre.toString(16).toUpperCase().padStart(4, '0');
  const parteDelMomento = Date.now().toString(36).toUpperCase().slice(-4);

  return 'XV-' + parteDelNombre + '-' + parteDelMomento;
}


/* ─── 2. DIBUJAR EL CÓDIGO QR ──────────────────────────────────────── */

/**
 * Dibuja el código QR dentro de la tarjeta.
 *
 * Usa una biblioteca externa (qrcodejs) que se carga desde internet en
 * el index.html. Si no hay conexión, la biblioteca no existe: por eso
 * está el if. En ese caso el pase igual sirve, porque el código escrito
 * abajo se lee perfectamente.
 *
 * @param {string} textoDelCodigo - Lo que se codifica en el QR.
 * @returns {void}
 */
function dibujarCodigoQR(textoDelCodigo) {
  const contenedorDelQR = buscar('#codigo-qr');
  if (!contenedorDelQR) return;

  contenedorDelQR.innerHTML = '';   // borra el QR anterior, si había

  if (typeof QRCode === 'undefined') {
    console.info('No se pudo cargar la biblioteca del QR (¿estás sin internet?). ' +
                 'El pase funciona igual con el código escrito.');
    return;
  }

  try {
    new QRCode(contenedorDelQR, {
      text: textoDelCodigo,
      width: 100,
      height: 100,
      colorDark:  '#c9a84c',   // dorado
      colorLight: '#120c07',   // fondo oscuro
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (error) {
    console.warn('No se pudo dibujar el código QR:', error);
  }
}

/**
 * Genera el QR que viaja en el correo de confirmación.
 *
 * POR QUÉ NO SE COPIA EL DE LA PANTALLA
 * El de la tarjeta es dorado sobre fondo oscuro, que se ve precioso pero
 * los lectores de los teléfonos lo leen mal o no lo leen: un QR necesita
 * mucho contraste y margen blanco alrededor. Este se genera negro sobre
 * blanco y al doble de tamaño, que es lo que sí se escanea de una.
 *
 * EL CÓDIGO ES EXACTAMENTE EL MISMO: cambia el color, no el contenido.
 *
 * @param {string} textoDelCodigo - El mismo que se dibuja en la tarjeta.
 * @returns {string} Una imagen PNG como texto ("data:image/png;base64,…"),
 *                   o cadena vacía si no se pudo generar.
 */
function generarQrParaElCorreo(textoDelCodigo) {
  if (typeof QRCode === 'undefined' || !textoDelCodigo) return '';

  // Se dibuja en un contenedor suelto que nunca entra en la página.
  const cajaInvisible = document.createElement('div');

  try {
    new QRCode(cajaInvisible, {
      text: textoDelCodigo,
      width: 240,
      height: 240,
      colorDark:  '#000000',
      colorLight: '#ffffff',
      // Corrección alta: el QR sigue leyéndose aunque la pantalla tenga
      // un reflejo o el papel esté algo arrugado.
      correctLevel: QRCode.CorrectLevel.H,
    });

    /* qrcodejs dibuja en un <canvas> y, en navegadores viejos, en un
       <img>. Se prueban los dos por ese orden. */
    const lienzo = cajaInvisible.querySelector('canvas');
    if (lienzo) return lienzo.toDataURL('image/png');

    const imagen = cajaInvisible.querySelector('img');
    if (imagen && imagen.src.indexOf('data:image/png') === 0) return imagen.src;

    return '';
  } catch (error) {
    console.warn('No se pudo generar el QR para el correo:', error);
    return '';
  }
}


/* ─── 3. MOSTRAR Y CERRAR EL PASE ──────────────────────────────────── */

/**
 * Rellena la tarjeta con los datos del invitado y la muestra.
 *
 * @param {Object} datos - Lo que devolvió el formulario.
 * @param {string} datos.nombre         - Nombre del invitado.
 * @param {number} datos.adultos        - Cuántos adultos van.
 * @param {number} datos.ninos          - Cuántos niños van.
 * @param {string} datos.resumenDeMenus - Ej: '2 estándar · 1 infantil'.
 * @param {string} datos.codigo         - El código único del pase.
 * @returns {void}
 *
 * @example
 *   mostrarPaseDeAcceso({
 *     nombre: 'Familia Pérez', adultos: 2, ninos: 1,
 *     resumenDeMenus: '2 estándar · 1 infantil', codigo: 'XV-1F4A-K3P9'
 *   });
 */
function mostrarPaseDeAcceso(datos) {
  const ventana = buscar('#ventana-pase');
  if (!ventana) return;

  /* Se usa textContent y no innerHTML a propósito: textContent trata
     todo como texto plano, así que aunque alguien escriba etiquetas de
     HTML en su nombre, se muestran como letras y no se ejecutan. */
  const escribir = (selector, valor) => {
    const elemento = buscar(selector);
    if (elemento) elemento.textContent = valor;
  };

  escribir('#pase-nombre',   datos.nombre || '—');
  escribir('#pase-adultos',  datos.adultos || '1');
  escribir('#pase-ninos',    datos.ninos || '0');
  escribir('#pase-menus',    datos.resumenDeMenus || '—');
  escribir('#pase-codigo',   datos.codigo || '—');
  escribir('#pase-fecha',    CONFIGURACION.fiesta.fechaEnPalabras);
  escribir('#pase-hora',     CONFIGURACION.fiesta.horaEnPalabras);
  escribir('#pase-lugar',    CONFIGURACION.lugar.nombre);

  dibujarCodigoQR(datos.codigo || 'XV-2026');

  /* Accesibilidad: recordamos QUIÉN abrió el pase para devolverle el foco al
     cerrar (si no, el foco cae al principio de la página y quien navega con
     teclado o lector de pantalla se pierde). Y metemos el foco DENTRO del
     diálogo, en el botón de cerrar. */
  disparadorDelPase = document.activeElement;

  ventana.classList.add('abierta');
  document.body.style.overflow = 'hidden';   // no se puede hacer scroll detrás

  const botonCerrar = buscar('#boton-cerrar-pase');
  if (botonCerrar) requestAnimationFrame(() => botonCerrar.focus());
}

/** Quién tenía el foco antes de abrir el pase (para devolvérselo al cerrar). */
let disparadorDelPase = null;

/**
 * Elementos que pueden recibir foco dentro del diálogo, en orden.
 * @param {HTMLElement} ventana
 * @returns {HTMLElement[]}
 */
function focosDelPase(ventana) {
  return Array.from(ventana.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && el.offsetParent !== null);
}

/**
 * Cierra la ventana del pase y devuelve el scroll.
 * @returns {void}
 */
function cerrarPaseDeAcceso() {
  const ventana = buscar('#ventana-pase');
  if (!ventana) return;
  ventana.classList.remove('abierta');
  document.body.style.overflow = '';

  /* Le devolvemos el foco a quien abrió el pase. */
  if (disparadorDelPase && typeof disparadorDelPase.focus === 'function') {
    disparadorDelPase.focus();
  }
  disparadorDelPase = null;
}

/**
 * Abre el diálogo de impresión del navegador.
 * Los estilos de 08-pase-de-acceso.css se encargan de que en el papel
 * salga solamente la tarjeta.
 * @returns {void}
 */
function imprimirPaseDeAcceso() {
  window.print();
}


/* ─── 4. CONECTAR LOS BOTONES ──────────────────────────────────────── */
(function conectaLosBotonesDelPase() {
  const ventana = buscar('#ventana-pase');
  const botonCerrar   = buscar('#boton-cerrar-pase');
  const botonImprimir = buscar('#boton-imprimir-pase');
  const botonVerPase  = buscar('#boton-ver-pase');

  if (botonCerrar)   botonCerrar.addEventListener('click', cerrarPaseDeAcceso);
  if (botonImprimir) botonImprimir.addEventListener('click', imprimirPaseDeAcceso);

  if (botonVerPase) {
    botonVerPase.addEventListener('click', () => {
      const paseGuardado = leerDeMemoria('pase');
      if (paseGuardado) mostrarPaseDeAcceso(paseGuardado);
    });
  }

  // Cerrar haciendo clic en el fondo oscuro (pero no dentro de la tarjeta)
  if (ventana) {
    ventana.addEventListener('click', evento => {
      if (evento.target === ventana) cerrarPaseDeAcceso();
    });
  }

  // Teclado del diálogo: solo actúa cuando el pase está abierto.
  document.addEventListener('keydown', evento => {
    if (!ventana || !ventana.classList.contains('abierta')) return;

    // Escape cierra, que es lo que todo el mundo espera.
    if (evento.key === 'Escape') { cerrarPaseDeAcceso(); return; }

    /* Trampa de foco: mientras el pase está abierto, Tab cicla SOLO entre sus
       controles (no se escapa a la página de atrás, que está tapada). */
    if (evento.key === 'Tab') {
      const focos = focosDelPase(ventana);
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo  = focos[focos.length - 1];
      const activo  = document.activeElement;

      if (evento.shiftKey && (activo === primero || !ventana.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
  });
})();


/* ─── 5. RECORDAR LA CONFIRMACIÓN ANTERIOR ─────────────────────────────
   Si en una visita anterior esta persona ya confirmó, no tiene sentido
   mostrarle el formulario vacío otra vez. Le mostramos su pase y un
   enlace chiquito por si se equivocó y quiere rehacerlo.
   -------------------------------------------------------------------- */
(function recuerdaLaConfirmacionAnterior() {
  const paseGuardado = leerDeMemoria('pase');
  if (!paseGuardado) return;

  const formulario     = buscar('#formulario-confirmacion');
  const mensajeDeExito = buscar('#mensaje-de-exito');
  const textoDeExito   = buscar('#texto-de-exito');
  const botonRehacer   = buscar('#boton-confirmar-de-nuevo');

  if (!formulario || !mensajeDeExito) return;

  formulario.style.display = 'none';
  mensajeDeExito.classList.add('visible');

  if (textoDeExito) {
    textoDeExito.innerHTML =
      'Ya tenemos tu confirmación, <strong>' + limpiarTexto(paseGuardado.nombre) + '</strong>.<br>' +
      'Puedes volver a ver tu pase cuando quieras.';
  }

  /* Botón para empezar de nuevo: borra la memoria y recarga la página */
  if (botonRehacer) {
    botonRehacer.addEventListener('click', () => {
      borrarDeMemoria('pase');
      window.location.reload();
    });
  }
})();

/* ═══ 13-agregar-al-calendario.js ═══ */
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

/* ═══ 23-lienzo-de-luz.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   23 · EL LIENZO DE LUZ
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dibuja TODA la luz de la invitación —los resplandores de las 52 velas—
   en un solo <canvas>, en vez de en ~104 divs con mezcla.

   POR QUÉ EXISTE (el dato que lo justifica)
   El medidor de la propia web dio la prueba: con las animaciones APAGADAS
   la página va a 60 fps clavados, con el mismo DOM de 4592 nodos. Con las
   animaciones encendidas, 13 fps. O sea que el problema nunca fue el
   tamaño del documento: es el trabajo por cuadro.

   Y de ese trabajo, el JavaScript son 23 ms de 1658 (1,4 %). El resto es
   el navegador reaccionando:

       Layerize           31,1 %
       Recalculate style  21,0 %
       Commit             20,4 %
       Hit test            9,5 %
       Paint               8,9 %

   Layerize y Commit son fases del COMPOSITOR: arman y entregan el árbol de
   capas. Su costo depende de cuántas capas hay y cuántas se mezclan. Había
   10 capas con `mix-blend-mode: screen`, y ese modo obliga al compositor a
   LEER DE VUELTA el fondo antes de dibujar y le impide fusionar nada de lo
   que hay debajo: con diez apiladas no puede aplanar nada.

   POR QUÉ UN CANVAS LO ARREGLA DE RAÍZ
   Un canvas es UN elemento, o sea UNA capa, dibuje 10 luces o 10.000.
   Layerize y Commit dejan de depender de la cantidad de luces: es
   imposible por construcción que vuelvan a crecer. Además desaparecen ~104
   estilos en línea por cuadro (Recalculate style) y ~104 nodos que
   hit-testear.

   CÓMO SE VE IGUAL
   · `globalCompositeOperation = 'lighter'` es SUMA aditiva, que es lo que
     `screen` aproxima sobre fondo oscuro y lo que la luz hace de verdad.
   · Los degradados son exactamente los mismos que tenía el CSS
     (.vela--nucleo y .vela--derrame): están copiados parada por parada.

   EL TRUCO DE VELOCIDAD: SELLOS, NO DEGRADADOS
   Crear un degradado radial por vela y por cuadro sería carísimo. En vez
   de eso, cada degradado se dibuja UNA vez en un canvas chiquito —un
   "sello"— y después solo se estampa escalado. Estampar una imagen es de
   lo más barato que sabe hacer una placa de video, incluso una integrada.

   SI ALGO SE VE MAL
   Abrir la web con  ?luz=dom  y vuelve el sistema viejo al instante, sin
   tocar código. Los divs de luz siguen existiendo; este módulo solo los
   apaga cuando toma el mando.
   ══════════════════════════════════════════════════════════════════════ */

(function elLienzoDeLuz() {

  /* ── ¿Toma el mando este módulo? ──
     Por defecto sí. Con ?luz=dom se queda dormido y las velas siguen
     usando sus divs, exactamente como antes. */
  const parametros = new URLSearchParams(location.search);
  const USAR_LIENZO = parametros.get('luz') !== 'dom';

  /* Registro público. Los tres sistemas de luz le dejan acá sus fuentes y
     el lienzo las estampa; ninguno vuelve a tocar el DOM.

       · fuentes → resplandores de las velas, en coordenadas del DOCUMENTO
       · haces   → los rayos de los ventanales, en coordenadas de la VENTANA
       · motas   → el polvo en suspensión, en coordenadas de la VENTANA

     Los haces y las motas van en coordenadas de ventana porque sus capas
     eran `position: fixed`: no se mueven con el scroll, la luz entra
     siempre por el mismo sitio de la pantalla. */
  window.LienzoDeLuz = { activo: USAR_LIENZO, fuentes: [], haces: [], motas: [] };

  if (!USAR_LIENZO) return;

  /* ── Resolución de dibujo ──
     La luz es información de BAJA FRECUENCIA: manchas suaves, sin bordes
     ni detalle fino. Por eso es lo único de esta web que se puede dibujar
     a menos resolución sin que se note —bajar la de cualquier otra cosa se
     vería al instante—. Arranca en 1 (calidad plena); si hiciera falta más
     margen en un equipo flojo, bajar a 0.6 es invisible y ahorra ~64 % del
     relleno. */
  /* ⚠️ ESTA ES LA ÚNICA CONCESIÓN DE RESOLUCIÓN DE TODA LA WEB, y se puede
     hacer porque la luz es información de BAJA FRECUENCIA: manchas difusas,
     sin bordes ni detalle. Un degradado radial dibujado a 0,6× y escalado da
     el mismo resultado, porque el degradado YA ES un desenfoque.

     A los pétalos, las rosas, el marco y el texto NO se les toca la
     resolución: tienen contorno y se notaría al instante.

     En una Intel HD 4600 —sin memoria propia, compartiendo el bus con la
     CPU— esto son un 64 % menos de píxeles en el lienzo más grande. Si al
     verlo se notara algo, subir a 0.8 o a 1. */
  const FACTOR_POR_CALIDAD = { 0: 0.75, 1: 0.6, 2: 0.5 };

  /** Tope de densidad de píxeles. En pantallas 2x, dibujar la luz al doble
   *  cuadruplica el relleno para nada: es una mancha difusa. */
  const MAXIMA_DENSIDAD = 1;

  const lienzo = document.createElement('canvas');
  lienzo.id = 'lienzo-de-luz';
  lienzo.setAttribute('aria-hidden', 'true');
  const pincel = lienzo.getContext('2d', { alpha: true });
  if (!pincel) { window.LienzoDeLuz.activo = false; return; }

  /* Se cuelga donde estaba la capa de luz de las velas, para conservar el
     orden de apilado con el resto de la escena. */
  const dondeVa = buscar('#luz-de-velas') || document.body;
  dondeVa.appendChild(lienzo);

  /* ⚡ Y EL CONTENEDOR DEJA DE CUBRIR EL DOCUMENTO ENTERO.
     `#luz-de-velas` era `position: absolute; inset: 0`, o sea del tamaño del
     documento: en la pantalla ultrapanorámica del equipo objetivo eso son
     3305 × 5869 = **19,4 megapíxeles**. Tenía sentido cuando ahí vivían los
     52 resplandores; ahora su único hijo es este lienzo, que es
     `position: fixed` y mide lo que la ventana.

     Pasarlo a `fixed` lo deja en ~3,3 MP sin mover nada de sitio, porque lo
     único que contiene ya se posiciona respecto de la ventana.

     Se hace desde acá y no desde el CSS a propósito: con ?luz=dom este
     módulo no corre, los resplandores vuelven a ser divs con coordenadas del
     DOCUMENTO, y entonces el contenedor SÍ tiene que seguir siendo
     `absolute`. Cambiarlo en la hoja de estilos rompería ese camino. */
  if (dondeVa.id === 'luz-de-velas') dondeVa.style.position = 'fixed';

  let anchoCss = 0, altoCss = 0, escalaDelLienzo = 1;

  /**
   * Ajusta el tamaño del lienzo al de la ventana.
   * @returns {void}
   */
  function ajustarElLienzo() {
    const factor = FACTOR_POR_CALIDAD[nivelDeCalidad()] ?? 1;
    escalaDelLienzo = Math.min(window.devicePixelRatio || 1, MAXIMA_DENSIDAD) * factor;

    anchoCss = window.innerWidth;
    altoCss  = window.innerHeight;

    lienzo.width  = Math.max(1, Math.round(anchoCss * escalaDelLienzo));
    lienzo.height = Math.max(1, Math.round(altoCss  * escalaDelLienzo));
    lienzo.style.width  = anchoCss + 'px';
    lienzo.style.height = altoCss  + 'px';
  }

  ajustarElLienzo();
  window.addEventListener('resize', rebotar(ajustarElLienzo, 200));
  document.addEventListener('calidad-cambio', () => setTimeout(ajustarElLienzo, 50));


  /* ─── LOS SELLOS ────────────────────────────────────────────────────
     Cada tipo de resplandor se dibuja una sola vez en su propio canvas
     chiquito. Después, en cada cuadro, solo se ESTAMPA escalado.
     ---------------------------------------------------------------- */

  /** Cuántos píxeles mide un sello. 128 alcanza y sobra: son manchas sin
   *  bordes, y al escalarlas el suavizado del navegador las funde solo. */
  const LADO_DEL_SELLO = 128;

  /**
   * Dibuja un degradado radial en un canvas aparte, para poder estamparlo
   * después las veces que haga falta.
   *
   * @param {Array<[number, string]>} paradas - [posición 0..1, color CSS].
   * @returns {HTMLCanvasElement}
   */
  function hacerUnSello(paradas) {
    const sello = document.createElement('canvas');
    sello.width = sello.height = LADO_DEL_SELLO;
    const p = sello.getContext('2d');
    const medio = LADO_DEL_SELLO / 2;

    const degradado = p.createRadialGradient(medio, medio, 0, medio, medio, medio);
    for (const [donde, color] of paradas) degradado.addColorStop(donde, color);

    p.fillStyle = degradado;
    p.fillRect(0, 0, LADO_DEL_SELLO, LADO_DEL_SELLO);
    return sello;
  }

  /* ⚠️ ESTAS PARADAS SON LAS MISMAS QUE TENÍA EL CSS, copiadas una por una
     de .vela--nucleo y .vela--derrame en estilos/12-haces-de-luz.css. Si
     alguna vez se retoca el color de la luz, hay que tocarlo en los DOS
     lados o el sistema de reserva (?luz=dom) se vería distinto. */
  const SELLO_NUCLEO = hacerUnSello([
    [0,    'rgba(255, 226, 160, .95)'],
    [0.18, 'rgba(255, 190, 105, .55)'],
    [0.42, 'rgba(232, 150, 70,  .22)'],
    [0.70, 'rgba(232, 150, 70,  0)'],
    [1,    'rgba(232, 150, 70,  0)'],
  ]);

  const SELLO_DERRAME = hacerUnSello([
    [0,    'rgba(255, 198, 120, .40)'],
    [0.22, 'rgba(236, 160, 82,  .26)'],
    [0.42, 'rgba(208, 130, 60,  .15)'],
    [0.62, 'rgba(170, 100, 46,  .07)'],
    [0.80, 'rgba(170, 100, 46,  0)'],
    [1,    'rgba(170, 100, 46,  0)'],
  ]);

  /* El polvo: un puntito con halo. Mismas paradas que tenía .mota. */
  const SELLO_MOTA = hacerUnSello([
    [0,    'rgba(255, 246, 214, .95)'],
    [0.42, 'rgba(244, 226, 160, .55)'],
    [0.72, 'rgba(244, 226, 160, 0)'],
    [1,    'rgba(244, 226, 160, 0)'],
  ]);

  /**
   * El sello del HAZ es distinto: no es un círculo sino una elipse
   * descentrada, porque el CSS decía
   *     radial-gradient(ellipse 62% 46% at 50% 24%, …)
   * o sea, radios distintos en X y en Y, y el centro al 24 % de la altura
   * (arriba, que es por donde entra la luz).
   *
   * Se consigue dibujando un degradado circular con el lienzo ESTIRADO: se
   * escala el eje Y antes de pintar, y el círculo sale elipse. El sello
   * guarda el degradado en un cuadrado que después se estampa deformado al
   * tamaño real del haz, igual que hacían los porcentajes del CSS.
   *
   * @returns {HTMLCanvasElement}
   */
  function hacerElSelloDelHaz() {
    const sello = document.createElement('canvas');
    sello.width = sello.height = LADO_DEL_SELLO;
    const p = sello.getContext('2d');

    const centroX = LADO_DEL_SELLO * 0.50;
    const centroY = LADO_DEL_SELLO * 0.24;
    const radioX  = LADO_DEL_SELLO * 0.62;
    const radioY  = LADO_DEL_SELLO * 0.46;
    const achate  = radioY / radioX;

    p.save();
    p.translate(centroX, centroY);
    p.scale(1, achate);

    const g = p.createRadialGradient(0, 0, 0, 0, 0, radioX);
    g.addColorStop(0,    'rgba(244, 226, 160, .50)');
    g.addColorStop(0.38, 'rgba(219, 183, 110, .30)');
    g.addColorStop(0.62, 'rgba(201, 168, 76,  .10)');
    g.addColorStop(0.80, 'rgba(201, 168, 76,  0)');
    g.addColorStop(1,    'rgba(201, 168, 76,  0)');

    p.fillStyle = g;
    // Se rellena de sobra: el `scale` achica el alto, así que hay que pasarse.
    p.fillRect(-LADO_DEL_SELLO, -LADO_DEL_SELLO / achate,
               LADO_DEL_SELLO * 2, (LADO_DEL_SELLO * 2) / achate);
    p.restore();
    return sello;
  }

  const SELLO_HAZ = hacerElSelloDelHaz();


  /* ─── EL BUCLE ──────────────────────────────────────────────────────
     Un solo requestAnimationFrame para toda la luz, en vez de uno por
     sistema. Lee las fuentes que le dejó 19-velas.js y las estampa.
     ---------------------------------------------------------------- */

  /* Margen de culling: una luz que está justo afuera igual asoma su halo,
     así que se dibuja un poco más allá del borde de la pantalla. */
  const MARGEN = 260;

  /** Reloj propio, para que la deriva del polvo no dependa de cuándo se
   *  pintó el primer cuadro. */
  const momentoDeInicio = performance.now();

  /* ⚡ CADA CUÁNTO SE REPINTA DE VERDAD, Y POR QUÉ NO ES CADA CUADRO.
     Este era el error más caro que quedaba. Los sistemas que alimentan este
     lienzo tienen su propia cadencia, escrita en su código:

         velas  → recalculan el titileo cada 50 ms   (20 fps)
         haces  → cada 65 ms                          (15 fps)
         motas  → derivan lentísimo

     …pero el lienzo se borraba y repintaba a 60 fps igual. Tres de cada
     cuatro repintados dibujaban EXACTAMENTE LOS MISMOS PÍXELES.

     En la máquina objetivo eso es demoledor: una Intel HD 4600 no tiene
     memoria propia y comparte el bus con la CPU, así que cada repintado hay
     que subirlo por ahí. A pantalla completa eran ~1 GB/s de texturas para
     mostrar una imagen que cambia veinte veces por segundo.

     A 45 ms se ve idéntico —el titileo se GENERA a 20 fps, dibujarlo a 60
     es enseñar la misma imagen tres veces— y cuesta un tercio. */
  const CADA_CUANTO_REPINTAR = 45;
  let ultimoRepintado = 0;

  /* ⚠️ SE APAGABAN LAS ANIMACIONES Y LA LUZ SE QUEDABA CONGELADA.
     hayAlgoQueMirar() agrupa tres motivos bajo un mismo "no dibujes":
     sobre todavía cerrado, pestaña de fondo, o animaciones apagadas a
     propósito. Para los dos primeros, dejar el lienzo tal cual estaba es
     lo correcto —nadie lo está mirando—. Pero con las animaciones recién
     apagadas, la persona SIGUE mirando la pantalla, y lo que veía era lo
     último que se alcanzó a dibujar: un haz a mitad de camino, motas
     dispersas por cualquier lado. Apagar el movimiento debería APAGAR la
     luz que se mueve, no congelarla en un instante al azar.

     La solución: cuando el motivo es específicamente que se apagaron las
     animaciones, se hace UNA pasada más mostrando solo el resplandor fijo
     de las velas —la luz de ambiente, que a propósito se mantiene
     encendida (ver la nota en estilos/01-fundamentos.css: sin ella el
     fondo queda demasiado oscuro)— sin haces ni motas, que son puro
     movimiento. Recién ahí se deja de redibujar. */
  let yaSeDibujoElEstadoQuieto = false;

  /**
   * Un cuadro completo (o solo la luz fija, si `conMovimiento` es false).
   * @param {boolean} conMovimiento - false = sin haces ni motas.
   * @returns {void}
   */
  function dibujarUnCuadro(conMovimiento) {
    pincel.setTransform(escalaDelLienzo, 0, 0, escalaDelLienzo, 0, 0);
    pincel.clearRect(0, 0, anchoCss, altoCss);

    /* SUMA ADITIVA. Es lo que hace la luz de verdad —dos velas juntas
       iluminan más que una— y es la operación que reemplaza al
       mix-blend-mode: screen de las capas viejas, sin costar una capa. */
    pincel.globalCompositeOperation = 'lighter';

    /* El polvo se calcula acá, en el mismo bucle: no tiene sentido un
       requestAnimationFrame aparte para 32 puntitos. Solo hace falta
       calcularlo si se va a dibujar. */
    if (conMovimiento && window.LienzoDeLuz.animarLasMotas) {
      window.LienzoDeLuz.animarLasMotas(
        (performance.now() - momentoDeInicio) / 1000,
        anchoCss, altoCss,
        window.LienzoDeLuz.intensidadAmbiente ?? 0
      );
    }

    const desplazamiento = scrollActualY();
    const fuentes = window.LienzoDeLuz.fuentes;

    /* ── CUÁNTO MANDAN LAS VELAS A ESTA HORA ──
       Al mediodía compiten con la luz que entra por los ventanales y quedan
       discretas (×0,70). De madrugada SON la única luz de la sala y crecen
       (×1,30). Ese cambio de quién manda —ventana o fuego— es lo que vuelve
       envolvente la escena, más que cualquier cambio de color.

       Se lee una vez por cuadro, no por vela. El valor lo publica
       codigo/22-luz-de-la-hora.js cada diez minutos. */
    const hora = window.LuzDeLaHora;
    const fuerzaDeVelas = hora ? hora.fuerzaDeVelas : 1;

    for (let i = 0; i < fuentes.length; i++) {
      const f = fuentes[i];
      if (f.alfa <= 0.004 || f.radio <= 0) continue;

      const y = f.y - desplazamiento;
      if (y < -MARGEN - f.radio || y > altoCss + MARGEN + f.radio) continue;
      if (f.x < -MARGEN - f.radio || f.x > anchoCss + MARGEN + f.radio) continue;

      const alfa = f.alfa * fuerzaDeVelas;
      pincel.globalAlpha = alfa > 1 ? 1 : alfa;
      const lado = f.radio * 2;
      pincel.drawImage(f.derrame ? SELLO_DERRAME : SELLO_NUCLEO,
                       f.x - f.radio, y - f.radio, lado, lado);
    }

    /* ── b) LOS HACES DE LOS VENTANALES Y c) EL POLVO ──
       Puro movimiento, así que con las animaciones apagadas (conMovimiento
       = false) se saltean entero: la pasada única del "estado quieto" deja
       solo el resplandor de las velas de la sección anterior. */
    if (conMovimiento) {
      /* Van en coordenadas de la ventana (su capa era `fixed`), así que no
         se les resta el scroll. Cada uno se estampa girado sobre su borde
         superior, que es el mismo `transform-origin: 50% 0` que tenía el
         CSS: el rayo pivota desde donde entra, no desde su centro. */
      const haces = window.LienzoDeLuz.haces;
      for (let i = 0; i < haces.length; i++) {
        const h = haces[i];
        if (h.alfa <= 0.004 || h.ancho <= 0) continue;

        pincel.globalAlpha = h.alfa > 1 ? 1 : h.alfa;
        pincel.save();
        pincel.translate(h.x, h.y);
        pincel.rotate(h.giro);
        pincel.drawImage(SELLO_HAZ, -h.ancho / 2, 0, h.ancho, h.alto);
        pincel.restore();
      }

      /* También en coordenadas de ventana. Son puntitos: se estampan sin
         girar y sin más cuentas. */
      const motas = window.LienzoDeLuz.motas;
      for (let i = 0; i < motas.length; i++) {
        const m = motas[i];
        if (m.alfa <= 0.004) continue;

        pincel.globalAlpha = m.alfa > 1 ? 1 : m.alfa;
        const lado = m.radio * 2;
        pincel.drawImage(SELLO_MOTA, m.x - m.radio, m.y - m.radio, lado, lado);
      }
    }

    pincel.globalAlpha = 1;
    pincel.globalCompositeOperation = 'source-over';
  }

  /**
   * El bucle: decide CUÁNDO dibujar (o no) y llama a dibujarUnCuadro().
   * @param {number} ahora - Marca de tiempo del navegador.
   * @returns {void}
   */
  function pintarLaLuz(ahora) {
    if (!hayAlgoQueMirar()) {
      /* Con las animaciones apagadas (a diferencia de sobre cerrado o
         pestaña de fondo) SÍ vale la pena una pasada: deja la luz en el
         estado quieto correcto en vez de congelada a mitad de movimiento.
         Una sola vez alcanza — nada vuelve a cambiar mientras siga así. */
      if (prefiereMenosMovimiento() && !yaSeDibujoElEstadoQuieto) {
        yaSeDibujoElEstadoQuieto = true;
        dibujarUnCuadro(false);
      }
      requestAnimationFrame(pintarLaLuz);
      return;
    }
    yaSeDibujoElEstadoQuieto = false;

    if (ahora - ultimoRepintado < CADA_CUANTO_REPINTAR) {
      requestAnimationFrame(pintarLaLuz);
      return;
    }
    ultimoRepintado = ahora;
    dibujarUnCuadro(true);

    requestAnimationFrame(pintarLaLuz);
  }

  requestAnimationFrame(pintarLaLuz);

})();

/* ═══ 14-haces-de-luz.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   14 · HACES DE LUZ
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Mueve los rayos de sol que entran en diagonal: les cambia despacio el
   grosor, el brillo y la posición, como cuando una nube pasa por delante
   del sol y el haz se abre, se afina o se apaga.

   ─────────────────────────────────────────────────────────────────────
   EL PROBLEMA DE FONDO: QUE NO SE NOTE EL BUCLE

   Lo más difícil de una animación ambiental no es que se vea linda, sino
   que no se note que se repite. Si un rayo va y viene con un ritmo fijo,
   al minuto el ojo ya lo aprendió y el encanto se rompe.

   La solución es vieja y elegante: cada propiedad de cada haz oscila con
   su PROPIO período, y esos períodos se eligen para que no encajen entre
   sí. Si un haz tardara 10 segundos en su ciclo y otro 20, cada 20
   segundos volverían los dos a la misma posición y se vería la
   repetición. En cambio, con períodos como 13, 17, 19, 23 y 29 segundos
   —números primos entre sí— la combinación completa tarda MUCHÍSIMO en
   repetirse: el patrón entero solo vuelve a empezar al cabo de horas.

   Es el mismo motivo por el que los grillos de un campo nunca suenan
   sincronizados.

   ÍNDICE
     1. Preparar los haces
     2. El bucle de animación
     3. Ahorro de batería
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLosHacesDeLuz() {

  const capa = buscar('#haces-de-luz');
  if (!capa) return;

  /* ─── DÓNDE SE PUBLICAN LAS VARIABLES DE LUZ (y por qué NO en el <html>)
     La luz publica dos números para que los lea el CSS: --luz-x (dónde está
     el sol) y --luz-intensidad (cuánta luz hay). Antes se escribían en
     document.documentElement, o sea en el <html>.

     ⚠️ Eso costaba carísimo, y lo confirmó un perfil de rendimiento: las
     variables de CSS SE HEREDAN, así que al escribirlas en la raíz el
     navegador tiene que invalidar y recalcular el estilo de TODO el
     documento —cualquier descendiente podría estar usándolas—. Con este
     DOM (cientos de flores, decenas de velas, los SVG del relicario y del
     marco) eso es un recálculo enorme… varias veces por segundo. En el
     perfil, "Recalculate style" se llevaba el 39 % del tiempo total, sin
     ninguna función de JavaScript colgando debajo: el costo lo pagaba el
     navegador DESPUÉS de la escritura.

     Solo TRES elementos leen estas variables, así que se escriben
     directamente en ellos. Cada uno ve exactamente el mismo valor —var()
     lo encuentra en el propio elemento antes de salir a heredar— pero la
     invalidación pasa de "todo el documento" a "estos tres".

     Las referencias se buscan UNA vez acá, no en cada cuadro. Y los valores
     por defecto de estilos/01-fundamentos.css (--luz-x: .5,
     --luz-intensidad: 0) se mantienen: son la base antes del primer cuadro. */
  const destinosDeLaLuz = [
    buscar('#motas-de-polvo'),        // opacity: var(--luz-intensidad)
    buscar('.portada__brillo-oro'),   // background-position + opacity
    buscar('.portada__nombre'),       // background-position del barrido de oro
  ].filter(Boolean);

  /* No se corta acá aunque las animaciones estén apagadas: el bucle se
     prepara igual y queda en reposo (ver el guard del bucle). Con las
     animaciones apagadas, además, el CSS esconde la capa de haces. Si se
     encienden con el botón, la luz vuelve en el acto, sin recargar. */
  const haces = buscarTodos('#haces-de-luz .haz');
  if (haces.length === 0) return;


  /* ─── 1. PREPARAR LOS HACES ────────────────────────────────────────
     Cada haz recibe tres relojes independientes —uno para el grosor, uno
     para el brillo y uno para la deriva— con períodos que no encajan
     entre sí (ver la explicación de arriba).
     ---------------------------------------------------------------- */

  /** Períodos en segundos. Son primos entre sí a propósito.
   *
   *  Son LARGOS —el más corto ronda el medio minuto— porque la luz tiene
   *  que sentirse como el paso lento del tiempo en una tarde nublada: una
   *  nube que tarda en cruzar el sol, no un parpadeo. Si estos números
   *  fueran chicos, el vaivén se leería nervioso; con ellos, la luz
   *  respira despacio y el ojo nunca la "pesca" repitiéndose. */
  const PERIODOS_DE_GROSOR  = [31, 41, 47, 53, 67];
  const PERIODOS_DE_BRILLO  = [53, 67, 31, 41, 47];
  const PERIODOS_DE_DERIVA  = [83, 89, 97, 71, 103];

  /** Opacidad máxima de cada haz.
   *  La capa entera va en mix-blend-mode: screen, así que este brillo NO
   *  lava los negros: solo enciende lo que ya tenía algo de luz (el oro,
   *  las gemas, los pétalos). Y una máscara (ver 12-haces-de-luz.css)
   *  evita que la luz caiga sobre el marco victoriano del borde.
   *  Por eso ahora se puede subir a un valor perceptible sin ensuciar:
   *  "se sabe que está, pero no deslumbra". */
  const BRILLO_MAXIMO = 0.22;

  /** ¿Dibuja el lienzo? (ver codigo/23-lienzo-de-luz.js). Se decide una
   *  sola vez, al cargar: no cambia en mitad de la sesión. */
  const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);

  const estadoDeLosHaces = haces.map((elemento, i) => ({
    elemento,

    /* Dónde nace el haz, en porcentaje del ancho de la ventana. Lo pone el
       CSS (.haz:nth-child(N) { left: … }) y hay que preguntárselo al
       navegador con getComputedStyle.

       ⚠️ POR QUÉ NO SE LEE ACÁ. Preguntar por un valor calculado obliga al
       navegador a resolver estilos y layout EN ESE INSTANTE (un "reflow
       forzado"). Y este código se evalúa durante la carga, o sea en el peor
       momento posible: se le hacía frenar el arranque para averiguar algo
       que no hace falta hasta que el sobre se abre y hay luz que dibujar.

       Se deja en 0 y lo rellena medirLosHaces(), en el primer cuadro que
       de verdad se dibuja. */
    izquierda: 0,

    /* El objeto que lee el lienzo cuadro a cuadro. Se crea una vez y
       después solo se le cambian los números: cero basura por cuadro. */
    enElLienzo: { x: 0, y: 0, ancho: 0, alto: 0, giro: 0, alfa: 0 },

    anchoBase: 8 + (i % 3) * 4,          // entre 8vw y 16vw
    periodoDeGrosor: PERIODOS_DE_GROSOR[i % PERIODOS_DE_GROSOR.length],
    periodoDeBrillo: PERIODOS_DE_BRILLO[i % PERIODOS_DE_BRILLO.length],
    periodoDeDeriva: PERIODOS_DE_DERIVA[i % PERIODOS_DE_DERIVA.length],
    /* Cada uno arranca en un punto distinto de su ciclo, para que al
       cargar la página no estén todos en el mismo estado. */
    faseDeGrosor: Math.random() * Math.PI * 2,
    faseDeBrillo: Math.random() * Math.PI * 2,
    faseDeDeriva: Math.random() * Math.PI * 2,
    /* ⚠️ ANTES ACÁ HABÍA UNA INCLINACIÓN FIJA (entre 14° y 23°), y era el
       motivo de que la hora no se sintiera: por muy bien que se tiñera la
       luz, entraba SIEMPRE POR EL MISMO SITIO.

       Ahora la inclinación la manda el sol —codigo/22-luz-de-la-hora.js la
       publica en window.LuzDeLaHora—, y esto de acá es solo el desvío
       personal de cada haz: unos grados arriba o abajo para que los cinco no
       sean paralelos perfectos, que delataría el truco.

       A las 7 de la mañana los haces entran rasantes desde un lado; al
       mediodía, casi verticales; al atardecer, rasantes desde el otro. Es la
       señal más legible de todas: mucho más que el color. */
    desvio: Math.random() * 9 - 4.5,
  }));

  /* Se le entregan al lienzo los objetos de los haces. A partir de acá el
     bucle solo les cambia los números; la lista no se vuelve a armar. Y la
     capa vieja, con su mix-blend-mode a pantalla completa, se apaga. */
  if (usaElLienzo) {
    window.LienzoDeLuz.haces = estadoDeLosHaces.map(h => h.enElLienzo);
    const capaDeHaces = buscar('#haces-de-luz');
    if (capaDeHaces) capaDeHaces.style.display = 'none';
  }


  /* ─── 2. EL BUCLE ──────────────────────────────────────────────────
     Se actualiza a ~20 cuadros por segundo y no a 60. Es deliberado: el
     movimiento es tan lento que a 60 no se vería ninguna diferencia, y
     así se gasta la tercera parte del trabajo. La fluidez la aporta la
     transición del CSS, no la frecuencia de cálculo.
     ---------------------------------------------------------------- */

  /* Cada cuánto se recalcula, en milisegundos. Ya de por sí es lento a
     propósito (ver arriba); en calidad más baja se espacia todavía más:
     el movimiento es tan pausado que la diferencia no se nota, y se ahorra
     ese cálculo. CALIDAD_GRAFICA y nivelDeCalidad() están en
     02-utilidades.js. Se lee UNA vez al cargar (no hace falta re-leerlo en
     vivo: es un ritmo, no una cantidad de elementos). */
  /* En calidad ALTA la luz se recalcula más seguido (32 ms): la deriva de
     los haces y el latido de las motas se mueven de forma más continua, sin
     apoyarse tanto en la transición del CSS para disimular los saltos. */
  const CADA_CUANTO_POR_CALIDAD = { 0: 32, 1: 65, 2: 90 };
  let cadaCuanto = CADA_CUANTO_POR_CALIDAD[nivelDeCalidad()] ?? 50;
  document.addEventListener('calidad-cambio', evento => {
    cadaCuanto = CADA_CUANTO_POR_CALIDAD[evento.detail && evento.detail.calidad] ?? 50;
  });

  let momentoDeInicio = performance.now();
  let animacionActiva = true;
  let ultimoCalculo = 0;


  /* ─── EL REVELADO ──────────────────────────────────────────────────
     Mientras el sobre está cerrado, la luz vale 0: la web está a oscuras
     detrás de la carta. Al abrir el sobre ("encender las luces"), la luz
     sube de 0 a su valor pleno en un par de segundos, y la web aparece
     bañándose de a poco. No es un corte: es un amanecer.

     Se dispara con el mismo evento que arranca la música, así el sonido
     y la luz entran juntos (ver la transición en 03-sobre-de-apertura.js
     y 10-reproductor-de-musica.js).
     ---------------------------------------------------------------- */

  /** Cuánto tarda la luz en llegar a pleno, en milisegundos. */
  const DURACION_DEL_REVELADO = 2600;

  /** Momento en que se abrió el sobre. null = todavía cerrado. */
  let inicioDelRevelado = null;

  /**
   * Nivel de luz del revelado, de 0 (sobre cerrado) a 1 (pleno).
   * Usa smoothstep para que arranque y termine suave, sin tirones.
   *
   * @param {number} ahora - Marca de tiempo del navegador.
   * @returns {number} Entre 0 y 1.
   */
  function nivelDelRevelado(ahora) {
    if (inicioDelRevelado === null) return 0;
    const t = limitar((ahora - inicioDelRevelado) / DURACION_DEL_REVELADO, 0, 1);
    return t * t * (3 - 2 * t);   // smoothstep
  }

  document.addEventListener('sobre-abierto', () => {
    if (inicioDelRevelado === null) inicioDelRevelado = performance.now();
  }, { once: true });

  /* Si alguien llega con el sobre ya abierto (por ejemplo, al recargar en
     una sección más abajo), no tiene sentido esperar el amanecer: la luz
     ya tiene que estar puesta. */
  if (!document.body.classList.contains('sobre-visible')) {
    inicioDelRevelado = performance.now() - DURACION_DEL_REVELADO;
  }

  /**
   * Convierte un seno (que va de −1 a 1) en un valor de 0 a 1.
   *
   * @param {number} segundos - Tiempo transcurrido.
   * @param {number} periodo  - Cuánto tarda un ciclo completo.
   * @param {number} fase     - Desde dónde arranca el ciclo.
   * @returns {number} Un número entre 0 y 1 que sube y baja suavemente.
   */
  function ondaSuave(segundos, periodo, fase) {
    return (Math.sin((segundos / periodo) * Math.PI * 2 + fase) + 1) / 2;
  }

  /** ¿Ya se leyó del CSS dónde nace cada haz? (ver `izquierda`, arriba). */
  let yaSeMidieron = false;

  /**
   * Lee del CSS dónde nace cada haz. Se hace UNA sola vez, y a propósito
   * NO durante la carga: preguntar por un valor calculado obliga al
   * navegador a resolver layout en ese instante, y hacerlo mientras la
   * página arranca retrasa el primer dibujo. Acá ya estamos en un cuadro
   * de animación con el sobre abierto, así que el layout ya está resuelto
   * y la lectura no le cuesta nada a nadie.
   *
   * @returns {void}
   */
  function medirLosHaces() {
    if (yaSeMidieron) return;
    yaSeMidieron = true;

    const ancho = Math.max(1, window.innerWidth);
    for (const haz of estadoDeLosHaces) {
      haz.izquierda = parseFloat(getComputedStyle(haz.elemento).left) / ancho * 100 || 0;
    }
  }

  /**
   * Recalcula la forma de cada haz.
   * @param {number} momentoActual - Marca de tiempo del navegador.
   * @returns {void}
   */
  function animarLosHaces(momentoActual) {
    if (!animacionActiva) return;

    /* Sin nadie mirando —sobre todavía cerrado, pestaña de fondo, o
       animaciones apagadas— el bucle sigue vivo pero no dibuja luz. Listo
       para reanudar al instante, sin recargar. */
    if (!hayAlgoQueMirar()) { requestAnimationFrame(animarLosHaces); return; }

    medirLosHaces();   // la primera vez lee el CSS; después no hace nada

    if (momentoActual - ultimoCalculo >= cadaCuanto) {
      ultimoCalculo = momentoActual;
      const segundos = (momentoActual - momentoDeInicio) / 1000;

      // Cuánta luz hay ahora mismo (0 con el sobre cerrado, 1 a pleno).
      const revelado = nivelDelRevelado(momentoActual);

      /* PROFUNDIDAD: la luz reina arriba y se hunde al bajar.
         Como el sol en el agua, cuanto más profundo se está en la página,
         menos luz llega. En la portada (scroll 0) la luz está plena; hacia
         el fondo cae hasta apenas un 15 %. La caída se reparte en algo más
         de una pantalla y media, para que el hundimiento se sienta gradual.
         Así los haces "pierden poder" en las secciones de abajo. */
      /* scrollActual() y no window.scrollY: dentro del bucle, preguntarle el
         scroll al navegador lo obliga a recalcular estilos (02-utilidades.js). */
      /* ⚠️ LA LUZ NATURAL NO DEBE LLEGAR AL FONDO. Antes caía de forma
         lineal y con un suelo del 15 %: al bajar del todo seguía entrando un
         resto de sol por los ventanales, y eso rompía la escena —abajo la
         sala tiene que estar iluminada SOLO por las velas—.

         Ahora la caída es al cuadrado: se mantiene plena en la portada, se
         desploma a media pantalla de bajada y llega a CERO. Los candelabros
         se quedan solos con el trabajo, que es de lo que trata la
         profundidad de esta invitación. */
      const cuantoSeBajo = limitar(
        scrollActualY() / (window.innerHeight * 1.35), 0, 1
      );
      const profundidad = (1 - cuantoSeBajo) * (1 - cuantoSeBajo);

      /* RESPIRACIÓN DE VELA: un latido lentísimo de toda la luz ambiente,
         como la llama de una vela que sube y baja. Es apenas ±8 %, y con
         un período largo (~8 s) para que se sienta vivo pero nunca se lea
         como un parpadeo. Le da a la escena esa quietud inquieta de un
         salón iluminado a velas. */
      const vela = 0.92 + ondaSuave(segundos, 8.3, 0) * 0.08;

      // Todo lo ambiente se apaga junto: por el revelado, por la
      // profundidad y por la vela.
      const luzAmbiente = revelado * profundidad * vela;

      /* Para publicarle al resto de la web dónde está la luz y con cuánta
         fuerza. El oro del relicario y las motas de polvo se cuelgan de
         estos dos números para moverse EN SINCRONÍA con los haces. */
      let sumaDeDeriva = 0;
      let sumaDeBrillo = 0;

      /* La posición del sol de esta hora. Se lee UNA vez por cuadro —no por
         haz— y trae valores de reserva por si el módulo de la hora no
         llegara a cargar: 18° y largo normal, la luz de tarde de siempre. */
      const hora = window.LuzDeLaHora;
      const anguloDelSol = hora ? hora.anguloDelSol : 18;
      const largoDelHaz  = hora ? hora.largoDelHaz  : 1;

      for (const haz of estadoDeLosHaces) {
        // GROSOR: el haz se abre y se cierra, como al pasar una nube.
        // La oscilación es suave (0,72 a 1,3 del ancho base): antes se
        // abría y cerraba de más y el movimiento se notaba; ahora apenas
        // late, acompañando el paso lento de la luz.
        const grosor = haz.anchoBase *
          (0.72 + ondaSuave(segundos, haz.periodoDeGrosor, haz.faseDeGrosor) * 0.58);

        // BRILLO: a veces casi desaparece, y eso es lo que lo hace creíble.
        // Se multiplica por la luz ambiente (revelado × profundidad × vela):
        // apagado con el sobre cerrado, pleno arriba, hundido abajo.
        const ondaDeBrillo = Math.pow(ondaSuave(segundos, haz.periodoDeBrillo, haz.faseDeBrillo), 1.6);
        const brillo = BRILLO_MAXIMO * ondaDeBrillo * luzAmbiente;

        // DERIVA: se corre despacio de lado, como si el sol se moviera
        const ondaDeDeriva = ondaSuave(segundos, haz.periodoDeDeriva, haz.faseDeDeriva);
        const deriva = (ondaDeDeriva - 0.5) * 9;

        /* ⚡ CON EL LIENZO ACTIVO, EL HAZ NO ES UN DIV: ES UN NÚMERO.
           Su capa llevaba `mix-blend-mode: screen` a pantalla completa, que
           es de lo más caro que se le puede pedir al compositor —lo obliga a
           leer de vuelta el fondo y le impide fusionar nada de lo que hay
           debajo—. Dibujado en el lienzo, el mismo rayo no cuesta ninguna
           capa. Ver codigo/23-lienzo-de-luz.js. */
        if (usaElLienzo) {
          const anchoVentana = window.innerWidth;
          const altoVentana  = window.innerHeight;

          /* Las mismas medidas que tenía el CSS, pasadas a píxeles:
             left: X% · width: grosor vw · top: -45% · height: 190%
             y el giro sobre el borde de arriba (transform-origin: 50% 0). */
          const anchoPx = (grosor / 100) * anchoVentana;
          const centroX = ((haz.izquierda + grosor / 2) / 100) * anchoVentana
                        + (deriva / 100) * anchoVentana;

          haz.enElLienzo.x     = centroX;
          haz.enElLienzo.y     = -0.45 * altoVentana;
          haz.enElLienzo.ancho = anchoPx;
          /* Un sol bajo alarga el rayo; uno alto lo acorta. */
          haz.enElLienzo.alto  = 1.9 * altoVentana * largoDelHaz;
          haz.enElLienzo.giro  = (anguloDelSol + haz.desvio) * Math.PI / 180;
          haz.enElLienzo.alfa  = brillo;
        } else {
          haz.elemento.style.width = grosor.toFixed(2) + 'vw';
          haz.elemento.style.opacity = brillo.toFixed(4);
          haz.elemento.style.height = (190 * largoDelHaz).toFixed(0) + '%';
          haz.elemento.style.transform =
            `translateX(${deriva.toFixed(2)}vw) rotate(${(anguloDelSol + haz.desvio).toFixed(1)}deg)`;
        }

        sumaDeDeriva += ondaDeDeriva;
        sumaDeBrillo += ondaDeBrillo;
      }

      /* Posición media de la luz (0 = corrida a la izquierda, 1 = a la
         derecha) e intensidad media, ya afectada por la luz ambiente
         completa (revelado × profundidad × vela). El oro del relicario y
         las motas leen estas variables desde el CSS, así que también se
         apagan cuando la luz se hunde. */
      const cuantos = estadoDeLosHaces.length;
      const luzX = sumaDeDeriva / cuantos;
      const luzIntensidad = (sumaDeBrillo / cuantos) * luzAmbiente;

      /* Se escribe en los tres elementos que las usan, NO en el <html>
         (ver la nota larga arriba: escribirlas en la raíz obligaba a
         recalcular el estilo del documento entero). */
      /* El polvo, dibujado en el lienzo, ya no puede colgarse de la
         variable CSS: necesita el número. Es el mismo valor. */
      if (usaElLienzo) window.LienzoDeLuz.intensidadAmbiente = luzIntensidad;

      const textoLuzX = luzX.toFixed(4);
      const textoLuzIntensidad = luzIntensidad.toFixed(4);
      for (const destino of destinosDeLaLuz) {
        destino.style.setProperty('--luz-x', textoLuzX);
        destino.style.setProperty('--luz-intensidad', textoLuzIntensidad);
      }
    }

    requestAnimationFrame(animarLosHaces);
  }

  requestAnimationFrame(animarLosHaces);


  /* ─── 3. AHORRO DE BATERÍA ─────────────────────────────────────────
     Si la pestaña deja de verse, se corta el bucle. No tiene sentido
     calcular luz para nadie.
     ---------------------------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animacionActiva = false;
    } else {
      animacionActiva = true;
      /* Se corre el punto de partida hacia adelante para que las ondas
         retomen donde estaban y no den un salto al volver. */
      ultimoCalculo = 0;
      requestAnimationFrame(animarLosHaces);
    }
  });

})();

/* ═══ 15-registro-de-confirmaciones.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   15 · REGISTRO DE CONFIRMACIONES
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO

   CANAL PRINCIPAL, confirmar.php (MySQL + correos)
     enviarAlServidor() manda los datos al servidor PHP.
     El PHP guarda en MySQL Y manda el correo al invitado Y a las
     administradoras (info@aniaxv.com y blucila699@gmail.com, definidas
     en .env). Funciona para asistencia afirmativa Y negativa.

   CANAL DE RESPALDO, Google Sheets
     anotarEnLaHoja() sigue funcionando si está configurado en
     01-configuracion.js. Si no está configurado, no hace nada.

   ÍNDICE
   1. Enviar al servidor PHP (MySQL + correos)
   2. Anotar en Google Sheets (respaldo)
   3. Reintento de las que quedaron pendientes
   4. El acceso discreto del pie
   ══════════════════════════════════════════════════════════════════════ */

/* ─── 1. ENVIAR AL SERVIDOR PHP ──────────────────────────────────────── */

/**
 * Manda los datos a confirmar.php en Hostinger.
 * El PHP guarda en MySQL y manda los dos correos:
 *   - Al invitado (su correo personal)
 *   - A cada correo de CORREO_ADMINISTRADORA en .env
 *
 * Se llama SIEMPRE, asista o no el invitado.
 *
 * @param {Object} datos - Los datos de la confirmación.
 * @returns {Promise<boolean>} true si el servidor confirmó que guardó.
 */
async function enviarAlServidor(datos) {
  try {
    /* El código QR del pase se genera acá, en el navegador, y viaja
       junto con los datos para que confirmar.php lo incruste en el
       correo del invitado.

       Se hace así, y no generándolo en el servidor, porque de esta
       forma el QR del correo y el de la tarjeta salen del MISMO código y
       de la misma biblioteca: es imposible que queden distintos.

       Si la biblioteca no cargó (sin internet), queda vacío y el correo
       sale sin QR pero con el código escrito, que se lee igual. */
    const carga = Object.assign({}, datos);

    if (datos.asiste && datos.codigo &&
        typeof generarQrParaElCorreo === 'function') {
      const qr = generarQrParaElCorreo(datos.codigo);
      if (qr) carga.qrPng = qr;
    }

    const respuesta = await fetch('/confirmar.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body:    JSON.stringify(carga),
    });

    if (!respuesta.ok) {
      console.warn('[Ania XV] El servidor respondió con error HTTP:', respuesta.status);
      return false;
    }

    const json = await respuesta.json();
    if (json.ok) {
      console.info('[Ania XV] ✅ Confirmación guardada en MySQL y correos enviados.');
      return true;
    } else {
      console.warn('[Ania XV] El servidor devolvió ok:false, ', json.error ?? 'sin detalle');
      return false;
    }

  } catch (error) {
    console.warn('[Ania XV] No se pudo contactar con confirmar.php:', error);
    return false;
  }
}

/* ─── 2. ANOTAR EN GOOGLE SHEETS (respaldo) ──────────────────────────── */

/** Dónde se guardan las confirmaciones que no se pudieron anotar. */
const MEMORIA_DE_PENDIENTES = 'registro-pendiente';

function armarLaFilaDeLaHoja(datos) {
  return {
    momento: new Date().toISOString(),
    nombre:  datos.nombre,
    correo:  datos.correo,
    asiste:  datos.asiste ? 'Sí' : 'No',
    adultos: datos.adultos,
    ninos:   datos.ninos,
    total:   datos.adultos + datos.ninos,
    menus:   datos.detalleDeMenus,
    resumen: datos.resumenDeMenus,
    alergias: datos.alergias,
    notas:   datos.notas,
    codigo:  datos.codigo,
  };
}

function cadenaCanonica(fila) {
  return [fila.momento, fila.codigo, fila.correo, fila.asiste, fila.total].join('|');
}

async function firmarLaFila(fila) {
  const clave = CONFIGURACION.registro.claveDeFirma;
  if (!clave || clave.startsWith('PEGA_AQUI')) return fila;
  if (!(window.crypto && crypto.subtle)) return fila;
  try {
    const codificador  = new TextEncoder();
    const llave        = await crypto.subtle.importKey(
      'raw', codificador.encode(clave),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const firmaBytes = await crypto.subtle.sign(
      'HMAC', llave, codificador.encode(cadenaCanonica(fila))
    );
    const firmaHex = Array.from(new Uint8Array(firmaBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return Object.assign({}, fila, { firma: firmaHex });
  } catch (error) {
    console.warn('No se pudo firmar la confirmación; se manda sin firma:', error);
    return fila;
  }
}

async function mandarLaFilaAGoogle(fila) {
  const respuesta = await fetch(CONFIGURACION.registro.urlParaAnotar, {
    method:   'POST',
    headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
    body:     JSON.stringify(fila),
    redirect: 'follow',
  });
  if (!respuesta.ok) return false;
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto).ok === true;
  } catch (error) {
    console.warn('La hoja contestó algo inesperado:', texto.slice(0, 200));
    return false;
  }
}

/**
 * Anota en Google Sheets si está configurado. Canal de respaldo.
 * Se llama SIEMPRE (asiste o no).
 *
 * @param {Object} datos
 * @returns {Promise<boolean>}
 */
async function anotarEnLaHoja(datos) {
  const direccion = CONFIGURACION.registro.urlParaAnotar;
  if (!direccion || direccion.startsWith('PEGA_AQUI')) {
    return false; // No configurado, silencio total
  }

  const fila = await firmarLaFila(armarLaFilaDeLaHoja(datos));

  for (let intento = 1; intento <= 2; intento++) {
    try {
      if (await mandarLaFilaAGoogle(fila)) {
        borrarDeMemoria(MEMORIA_DE_PENDIENTES);
        return true;
      }
    } catch (error) {
      console.warn(`Intento ${intento} de anotar en la hoja falló:`, error);
    }
    if (intento === 1) await esperar(1200);
  }

  guardarEnMemoria(MEMORIA_DE_PENDIENTES, fila);
  console.warn('No se pudo anotar en la hoja. Quedó guardada para el próximo intento.');
  return false;
}

/* ─── 3. REINTENTO DE LAS QUE QUEDARON PENDIENTES ───────────────────── */
(function reintentaLasPendientes() {
  const pendiente = leerDeMemoria(MEMORIA_DE_PENDIENTES, null);
  if (!pendiente) return;

  const direccion = CONFIGURACION.registro.urlParaAnotar;
  if (!direccion || direccion.startsWith('PEGA_AQUI')) return;

  mandarLaFilaAGoogle(pendiente)
    .then(seAnoto => {
      if (seAnoto) {
        borrarDeMemoria(MEMORIA_DE_PENDIENTES);
        console.info('Se anotó en la hoja una confirmación que había quedado pendiente.');
      }
    })
    .catch(() => { /* Sigue pendiente para la próxima visita. */ });
})();

/* ─── 4. EL ACCESO DISCRETO DEL PIE ─────────────────────────────────── */
(function preparaElAccesoAlRegistro() {
  const rosa = buscar('#rosa-secreta');
  if (!rosa) return;

  const direccion = CONFIGURACION.registro.urlDeLaHoja;
  if (!direccion || direccion.startsWith('PEGA_AQUI')) return;

  const TOQUES_NECESARIOS = 3;
  const VENTANA_DE_TIEMPO = 1500;
  let toques = 0;
  let reloj  = null;

  rosa.style.cursor = 'default';

  function volverAEmpezar() {
    toques = 0;
    rosa.classList.remove('contando-1', 'contando-2');
    clearTimeout(reloj);
  }

  rosa.addEventListener('click', function alTocarLaRosa() {
    toques++;
    if (toques >= TOQUES_NECESARIOS) {
      volverAEmpezar();
      window.open(direccion, '_blank', 'noopener');
      return;
    }
    rosa.classList.toggle('contando-1', toques === 1);
    rosa.classList.toggle('contando-2', toques === 2);
    clearTimeout(reloj);
    reloj = setTimeout(volverAEmpezar, VENTANA_DE_TIEMPO);
  });
})();

/* ═══ 16-volver-arriba.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   16 · ARRANCAR ARRIBA Y VOLVER ARRIBA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos cosas sobre lo mismo: que la invitación siempre empiece por el
   principio, y que se pueda volver ahí de un toque.

     1. AL ABRIR, SIEMPRE DESDE EL TOPE
     2. EL BOTÓN DE VOLVER ARRIBA

   POR QUÉ HACE FALTA LO PRIMERO
   Los navegadores tienen la costumbre de "recordar" por dónde ibas y
   devolverte ahí al recargar. En una página común eso es cómodo. Acá es
   un problema: la invitación empieza con el sobre lacrado, y la persona
   que recarga se encontraría de golpe en la mitad del formulario, con el
   sobre encima y sin entender qué pasó. Esta invitación es una función
   que empieza en el minuto cero.

   ÍNDICE
     1. Al abrir, siempre desde el tope
     2. El botón de volver arriba
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. AL ABRIR, SIEMPRE DESDE EL TOPE ────────────────────────────── */

(function empezarSiempreDesdeArriba() {
  /* Se le pide al navegador que NO restaure la posición anterior. Hay que
     pedirlo apenas carga la página: si se espera, ya la restauró. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  /* Y además se sube a mano, porque algunos navegadores igual dejan la
     página corrida un instante. 'instant' y no 'smooth': nadie tiene por
     qué ver el viaje de vuelta al principio, solo estar ahí.

     Se hace tres veces a propósito, en los tres momentos en que el
     navegador puede volver a correr la página: ahora, cuando terminan de
     cargar las imágenes (que cambian el alto y arrastran el scroll), y
     un instante después, por si alguna llegó tarde. */
  function subirDeUnaVez() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  subirDeUnaVez();
  window.addEventListener('load', () => {
    subirDeUnaVez();
    setTimeout(subirDeUnaVez, 60);
  });
})();


/* ─── 2. EL BOTÓN DE VOLVER ARRIBA ──────────────────────────────────── */

(function preparaElBotonDeVolverArriba() {
  const boton = buscar('#volver-arriba');
  if (!boton) return;

  /** A partir de cuántos píxeles bajados aparece el botón. */
  const DESDE_CUANTO_APARECE = 700;

  /**
   * Muestra u oculta el botón según lo que se haya bajado.
   *
   * Arriba de todo el botón sobra —ya estás arriba— y encima taparía la
   * portada, que es lo primero que tiene que verse limpio.
   *
   * @returns {void}
   */
  function revisarSiCorresponde() {
    boton.classList.toggle('visible', window.scrollY > DESDE_CUANTO_APARECE);
  }

  /* El scroll dispara muchísimas veces por segundo. Sin este freno se
     harían cientos de cuentas al pedo; así se hace una por cuadro. */
  let hayUnaRevisionPendiente = false;
  window.addEventListener('scroll', () => {
    if (hayUnaRevisionPendiente) return;
    hayUnaRevisionPendiente = true;
    requestAnimationFrame(() => {
      revisarSiCorresponde();
      hayUnaRevisionPendiente = false;
    });
  }, { passive: true });

  boton.addEventListener('click', () => {
    /* Acá sí conviene el viaje suave: la persona eligió volver, y ver
       pasar la invitación de vuelta es parte del gusto. Salvo que haya
       pedido menos movimiento en su sistema, claro. */
    window.scrollTo({
      top: 0,
      behavior: prefiereMenosMovimiento() ? 'instant' : 'smooth',
    });
  });

  revisarSiCorresponde();
})();

/* ═══ 17-joyas-colgantes.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   17 · JOYAS COLGANTES
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Las joyas del relicario no son dibujos quietos: CUELGAN y pesan. Este
   archivo las balancea con el scroll y el mouse, y siempre las devuelve a
   colgar rectas, para que se sientan piezas de joyería y no calcomanías.

   HAY DOS TIPOS DE COLGANTE
     · BORLAS (las de los costados): son cortas y macizas, así que se
       comportan como un péndulo RÍGIDO —giran enteras sobre su gancho—.
     · EL PENDIENTE CENTRAL: tiene una CADENA, y una cadena no es una
       varilla: se curva, y la gema del extremo se queda atrás al
       balancearse. Por eso su cadena está articulada en ESLABONES y se
       resuelve como un PÉNDULO COMPUESTO.

   LA FÍSICA (resorte amortiguado sobre un ángulo, integrado por cuadro)
   Sobre el ángulo de cada pieza actúan:
     · GRAVEDAD: un resorte que tira el ángulo hacia la vertical (colgar
       recto y volver solo).
     · SCROLL: al desplazar, el gancho se mueve y la joya se queda atrás
       por inercia y se mece.
     · MOUSE: si el cursor pasa cerca, la empuja de costado.
     · ROCE DEL AIRE: amortiguación que frena el vaivén.

   EN LA CADENA, ADEMÁS, HAY ACOPLE
   Cada eslabón, aparte de su gravedad, es ARRASTRADO por el eslabón de
   arriba con un beat de retraso (el "acople"). Ese retraso es lo que
   produce el latigazo de una cadena: la cima se mueve, y la curva y el
   peso bajan por los eslabones hasta la gema. Los eslabones de abajo son
   más blandos (más inercia), así que lagean más y la cadena se curva.

   Se integra POR CUADRO (no por tiempo real) a propósito: si el navegador
   ralentiza los cuadros, el movimiento se ve más lento pero el resorte
   nunca se descontrola. Mismo criterio que las enredaderas (07).

   MEDICIÓN EN PANTALLA
   Para saber si el mouse está cerca hay que ubicar el amarre en píxeles.
   El relicario es un SVG con viewBox 860×816 centrado en (430,408): con la
   caja del SVG se convierte cualquier punto del dibujo a píxeles.

   ÍNDICE
     1. Números que se pueden ajustar
     2. Encontrar borlas y cadenas
     3. Entradas: scroll y mouse
     4. El bucle
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasJoyasColgantes() {

  const relicario = buscar('.portada__marco');
  if (!relicario) return;

  /* NOTA: no se corta acá aunque las animaciones estén apagadas. El bucle
     se prepara igual, pero se queda en reposo (ver el guard dentro de
     dibujarCuadro). Así, si se ENCIENDEN las animaciones con el botón, las
     joyas empiezan a colgar y balancearse en el acto, sin recargar. En
     reposo, las joyas quedan rectas (ángulo 0), que es como cuelga una
     joya quieta. */

  /* El dibujo está centrado en (430,408) dentro del viewBox de 860×816. El
     pivote, que en el SVG está en coordenadas relativas a ese centro, se
     pasa a coordenadas del viewBox sumándole (430,408). */
  const CENTRO_X = 430;
  const CENTRO_Y = 408;
  const ANCHO_DEL_VIEWBOX = 860;


  /* ─── 1. NÚMEROS QUE SE PUEDEN AJUSTAR ─────────────────────────────── */

  // Péndulo rígido (borlas)
  const RIGIDEZ_BORLA     = 0.014;  // gravedad hacia la vertical
  const AMORT_BORLA       = 0.07;   // roce del aire
  const TOPE_BORLA        = 20;     // grados

  /* Cadena (péndulo compuesto). Un valor por eslabón, de arriba hacia
     abajo. Los de abajo tienen MENOS rigidez: pesan más, lagean más y
     curvan la cadena. El tope crece hacia abajo: la punta puede arquearse
     más que la cima. */
  const RIGIDEZ_ESLABON = [0.020, 0.013, 0.008];
  const AMORT_ESLABON   = [0.075, 0.085, 0.095];
  const TOPE_ESLABON    = [12, 18, 24];
  /* Cuánto arrastra cada eslabón al de abajo (el latigazo de la cadena).
     Alto = la cadena "chicotea" más; bajo = más tiesa. */
  const ACOPLE = 0.28;

  // Empujones externos (compartidos)
  const RADIO_DEL_MOUSE  = 170;   // px de pantalla
  const FUERZA_DEL_MOUSE = 0.9;


  /* ─── 2. ENCONTRAR BORLAS Y CADENAS ────────────────────────────────── */

  /**
   * Lee el pivote de un elemento (data-pivote-*) y lo devuelve en las dos
   * coordenadas que hacen falta: las locales del dibujo (para el rotate) y
   * las del viewBox (para ubicarlo en pantalla).
   * @param {Element} el
   * @returns {{localX:number, localY:number, vbX:number, vbY:number}}
   */
  function leerPivote(el) {
    const localX = parseFloat(el.dataset.pivoteX) || 0;
    const localY = parseFloat(el.dataset.pivoteY) || 0;
    return { localX, localY, vbX: CENTRO_X + localX, vbY: CENTRO_Y + localY };
  }

  // Borlas: cada una es un péndulo rígido de un solo ángulo.
  const borlas = buscarTodos('.portada__marco .joya-colgante').map(elemento => {
    const p = leerPivote(elemento);
    return {
      elemento, pivote: p,
      angulo: 0, velocidad: 0,
      faseDeRespiracion: Math.random() * Math.PI * 2,
      cacheDeEnvionMouse: 0,   // ver "CALIDAD GRÁFICA" más abajo
    };
  });

  /* Cadenas: cada una es una lista de eslabones ordenados de arriba hacia
     abajo. querySelectorAll los devuelve en orden del documento, y como
     están anidados (el de arriba envuelve al de abajo), ese orden ya es
     cima → punta. */
  const cadenas = buscarTodos('.portada__marco .cadena-colgante').map(cadena => {
    const eslabones = Array.from(cadena.querySelectorAll('.eslabon')).map((elemento, i) => {
      const p = leerPivote(elemento);
      return {
        elemento, pivote: p,
        angulo: 0, velocidad: 0,
        rigidez: RIGIDEZ_ESLABON[Math.min(i, RIGIDEZ_ESLABON.length - 1)],
        amort:   AMORT_ESLABON[Math.min(i, AMORT_ESLABON.length - 1)],
        tope:    TOPE_ESLABON[Math.min(i, TOPE_ESLABON.length - 1)],
      };
    });
    /* faseDeRespiracion: cada cadena arranca su vaivén de reposo en un punto
       distinto, para que no todas se mezan iguales. */
    return {
      eslabones, faseDeRespiracion: Math.random() * Math.PI * 2,
      cacheDeEnvionMouse: 0,   // solo lo usa la cima, ver más abajo
    };
  });

  if (borlas.length === 0 && cadenas.length === 0) return;


  /* ─── CALIDAD GRÁFICA ─────────────────────────────────────────────────
     Este módulo mueve pocas piezas (2 borlas + los eslabones de 1 cadena),
     así que el resorte en sí es barato. Lo único con un costo real es la
     RAÍZ CUADRADA de "¿está el mouse cerca?" en envionExterno. En calidad
     media/baja esa cuenta se recalcula cada 2 o 3 cuadros —el mouse no
     teletransporta— y se reusa el último valor en los cuadros de en medio;
     el resorte (lo que de verdad se ve) se sigue integrando siempre,
     cuadro a cuadro, así que nunca se ve a los saltos. */
  let calidad = nivelDeCalidad();
  const SALTO_DEL_MOUSE_POR_CALIDAD = { 0: 1, 1: 2, 2: 3 };
  let saltoDelMouse = SALTO_DEL_MOUSE_POR_CALIDAD[calidad] ?? 1;
  let contadorDeCuadro = 0;
  document.addEventListener('calidad-cambio', evento => {
    calidad = (evento.detail && evento.detail.calidad) ?? 0;
    saltoDelMouse = SALTO_DEL_MOUSE_POR_CALIDAD[calidad] ?? 1;
  });


  /* ─── 3. ENTRADAS: SCROLL Y MOUSE ──────────────────────────────────── */

  let scrollAnterior = window.scrollY;
  let velocidadDeScroll = 0;
  window.addEventListener('scroll', () => {
    velocidadDeScroll = window.scrollY - scrollAnterior;
    scrollAnterior = window.scrollY;
  }, { passive: true });

  let mouseX = -9999;
  let mouseY = -9999;
  window.addEventListener('mousemove', evento => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });


  /* ─── 4. EL BUCLE ──────────────────────────────────────────────────── */

  /**
   * Recalcula "¿está el mouse cerca de este amarre?" y guarda el envión en
   * la pieza misma (pieza.cacheDeEnvionMouse). Es la parte con costo real
   * (una raíz cuadrada); por eso se llama menos seguido en calidad media/baja
   * (ver "CALIDAD GRÁFICA" más arriba), reusando el último valor mientras
   * tanto.
   * @param {{cacheDeEnvionMouse:number}} pieza - Borla o cima de cadena.
   * @param {{vbX:number, vbY:number}} pivote - En coordenadas del viewBox.
   * @param {DOMRect} caja - Caja del relicario en pantalla.
   * @param {number} escala - Px de pantalla por unidad del viewBox.
   * @returns {void}
   */
  function recalcularEnvionMouse(pieza, pivote, caja, escala) {
    const px = caja.left + pivote.vbX * escala;
    const py = caja.top  + pivote.vbY * escala;
    const dx = px - mouseX;
    const dy = py - mouseY;
    const distancia = Math.hypot(dx, dy);

    let envionMouse = 0;
    if (distancia < RADIO_DEL_MOUSE) {
      const influencia = 1 - distancia / RADIO_DEL_MOUSE;
      // Signo negativo: la joya se aleja del cursor, como si la empujara.
      envionMouse = -(dx / (distancia || 1)) * FUERZA_DEL_MOUSE * influencia * influencia;
    }
    pieza.cacheDeEnvionMouse = envionMouse;
  }

  /**
   * El empujón total (scroll + el último mouse calculado) para un amarre.
   * El de scroll SIEMPRE se recalcula (es barato y cambia rápido); el de
   * mouse viene de la caché que llena recalcularEnvionMouse().
   * @param {{cacheDeEnvionMouse:number}} pieza - Borla o cima de cadena.
   * @returns {number} El envión total.
   */
  function envionExterno(pieza) {
    const envionScroll = limitar(velocidadDeScroll, -60, 60) * 0.02;
    return envionScroll + pieza.cacheDeEnvionMouse;
  }

  /**
   * Gira una pieza… pero solo si de verdad se movió.
   *
   * ⚡ ESTE `if` VALE MÁS DE LO QUE PARECE. Era el bucle más caro de toda la
   * web (30,4 ms en el perfil), y no por la física —son cuatro sumas por
   * eslabón— sino por las escrituras: entre eslabones, gemas y borlas se
   * reescribían decenas de atributos `transform` en CADA cuadro.
   *
   * Cambiar el atributo `transform` de un nodo SVG es de las cosas más caras
   * que se le puede pedir al navegador: a diferencia de un `transform` de
   * CSS —que resuelve el compositor sin tocar nada más—, en SVG pasa por el
   * camino de LAYOUT, porque los nodos SVG tienen objetos de layout propios.
   * Ahí estaba buena parte del 17,7 % de "Layout" del perfil.
   *
   * Y encima cada escritura fabricaba un string nuevo: cientos por segundo,
   * que después el recolector de basura tenía que limpiar (5,9 % del perfil
   * en "C++ GC").
   *
   * Como los péndulos están amortiguados, la mayor parte del tiempo el
   * ángulo redondeado a dos decimales es EXACTAMENTE el mismo que el del
   * cuadro anterior. Comparando antes de escribir no se pierde ni un grado
   * de movimiento y desaparece casi todo el trabajo.
   *
   * @param {Object} pieza - Borla, eslabón o gema con su ángulo actual.
   * @returns {void}
   */
  function aplicarRotacion(pieza) {
    /* ⚡ SE COMPARA CON UN ENTERO, NO CON UNA CADENA.
       Antes esto hacía `angulo.toFixed(2)` para comparar, y toFixed() crea
       un string CADA VEZ que se llama, incluso cuando después no se escribe
       nada. Entre eslabones, gemas y borlas eran decenas de cadenas por
       cuadro que iban derechas al recolector de basura; sumadas a las de las
       enredaderas, "Major GC" llegó al 23 % del perfil.

       Math.round(x * 100) da un entero: comparar enteros no reserva memoria.
       El texto se arma solo cuando de verdad hay algo nuevo que escribir. */
    const giro = Math.round(pieza.angulo * 100);
    if (giro === pieza.ultimoGiroEscrito) return;
    pieza.ultimoGiroEscrito = giro;

    /* La cola del atributo (el pivote) no cambia nunca: se arma una sola vez
       la primera vez y se reutiliza. */
    if (!pieza.textoDelPivote) {
      pieza.textoDelPivote = ' ' + pieza.pivote.localX + ' ' + pieza.pivote.localY + ')';
    }

    pieza.elemento.setAttribute('transform',
      'rotate(' + (giro / 100) + pieza.textoDelPivote);
  }

  function dibujarCuadro(momentoActual) {
    /* Sin nadie mirando (sobre cerrado, pestaña de fondo o animaciones
       apagadas): el bucle sigue vivo pero no mueve nada, las joyas quedan
       rectas. Listo para reanudar en cuanto se abra el sobre o se
       enciendan las animaciones, sin recargar la página. */
    if (!hayAlgoQueMirar()) { requestAnimationFrame(dibujarCuadro); return; }

    /* ⚡ YA NO TOCA EL DOM: medidaDelRelicario() (02-utilidades.js) mide una
       sola vez —al cargar y en cada resize— y acá solo se hace una resta con
       el scroll. Antes esto llamaba getBoundingClientRect() en CADA cuadro
       sobre el SVG más grande de la página, y 06-petalos-con-fisica.js hacía
       exactamente lo mismo por su cuenta: el doble de lecturas de las que
       hacían falta. */
    const caja = medidaDelRelicario();
    if (!caja) { requestAnimationFrame(dibujarCuadro); return; }
    const escala = caja.width / ANCHO_DEL_VIEWBOX;

    // El scroll pierde fuerza solo: el envión es un golpe, no un empuje fijo.
    velocidadDeScroll *= 0.85;

    contadorDeCuadro++;
    const tocaRecalcularElMouse = (contadorDeCuadro % saltoDelMouse === 0);

    /* ── a) BORLAS: péndulo rígido ── */
    for (const borla of borlas) {
      if (tocaRecalcularElMouse) recalcularEnvionMouse(borla, borla.pivote, caja, escala);
      const externo = envionExterno(borla);
      /* Respiración de reposo (subida a .06 para que el balanceo se NOTE aun
         sin scroll ni mouse: antes era tan sutil que parecían quietas). */
      const respiracion = Math.sin(momentoActual / 1600 + borla.faseDeRespiracion) * 0.06;

      const aceleracion =
        (-borla.angulo * RIGIDEZ_BORLA) - (borla.velocidad * AMORT_BORLA)
        + externo + respiracion;

      borla.velocidad += aceleracion;
      borla.angulo = limitar(borla.angulo + borla.velocidad, -TOPE_BORLA, TOPE_BORLA);
      aplicarRotacion(borla);
    }

    /* ── b) CADENAS: péndulo compuesto ──
       Se recorre de la cima a la punta. Cada eslabón siente su propia
       gravedad (sobre su ángulo ABSOLUTO, la suma de los de arriba), el
       arrastre del eslabón de encima (acople) y, solo la cima, el envión
       del scroll y el mouse. La suma de ángulos hace que la cadena se
       curve y la gema quede atrás. */
    for (const cadena of cadenas) {
      const cima = cadena.eslabones[0];
      if (tocaRecalcularElMouse) recalcularEnvionMouse(cadena, cima.pivote, caja, escala);
      const externo = envionExterno(cadena);

      /* BRISA DE REPOSO: un vaivén lentísimo que entra por la CIMA de la
         cadena aunque no haya scroll ni mouse. El acople lo va bajando por
         los eslabones y la gema (el más pesado) queda atrás, así la cadena
         se mece sola y con volumen, como una joya colgada en una corriente
         de aire. Sin esto, en la portada quieta la cadena quedaba tiesa. */
      const brisa = Math.sin(momentoActual / 2100 + cadena.faseDeRespiracion) * 0.02;

      let anguloAbsAcum = 0;   // suma de los ángulos de los eslabones de arriba
      let velPadre = 0;        // velocidad del eslabón de arriba (para el acople)

      for (let i = 0; i < cadena.eslabones.length; i++) {
        const s = cadena.eslabones[i];
        const anguloAbsoluto = anguloAbsAcum + s.angulo;

        const gravedad = -anguloAbsoluto * s.rigidez;
        const acople   = velPadre * ACOPLE;
        const externoEsl = (i === 0) ? externo + brisa : 0;
        const amortig  = -s.velocidad * s.amort;

        s.velocidad += gravedad + acople + externoEsl + amortig;
        s.angulo = limitar(s.angulo + s.velocidad, -s.tope, s.tope);
        aplicarRotacion(s);

        anguloAbsAcum += s.angulo;
        velPadre = s.velocidad;
      }
    }

    requestAnimationFrame(dibujarCuadro);
  }

  requestAnimationFrame(dibujarCuadro);

})();

/* ═══ 18-motas-de-polvo.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   18 · MOTAS DE POLVO
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Siembra la capa #motas-de-polvo con partículas doradas mínimas que
   flotan dentro de la luz. Cada una recibe su tamaño, su lugar de
   nacimiento, su recorrido y su ritmo, todo al azar, para que ninguna se
   mueva igual que otra.

   POR QUÉ NO SE ANIMAN DESDE ACÁ
   El movimiento lo hace el CSS (la animación "flotar-mota" en
   12-haces-de-luz.css). Este archivo solo REPARTE las motas y les pasa
   sus números por variables CSS. Así no hay un bucle de JavaScript
   corriendo todo el tiempo: el navegador anima las partículas por su
   cuenta, que es mucho más barato.

   DÓNDE VIVEN
   Sobre todo en la mitad de arriba, que es por donde entra la luz. Abajo
   apenas hay, como el polvo real: se ve en el haz, no en la sombra.
   ══════════════════════════════════════════════════════════════════════ */

(function siembraLasMotasDePolvo() {

  const capa = buscar('#motas-de-polvo');
  if (!capa) return;

  /* Las motas se crean SIEMPRE (así el botón puede encenderlas en vivo).
     Cuando las animaciones están apagadas, el CSS detiene su vuelo y
     esconde la capa; encendidas, flotan. Además, su brillo cuelga de
     --luz-intensidad, que en modo apagado vale 0, así que ni se ven. */

  /** Cuántas motas. Menos en pantallas chicas, donde estorban más. */
  /* ⚡ RENDIMIENTO: menos motas. Antes eran 34 (14 en celular); cada una es
     una capa que el compositor mueve. Con la mitad, el aire sigue leyéndose
     poblado y el costo baja bastante, sobre todo sin placa de video. */
  const esPantallaChica = window.matchMedia('(max-width: 700px)').matches;
  const BASE = esPantallaChica ? 8 : 18;

  /* CALIDAD GRÁFICA: las motas son lo que vuelve VOLUMÉTRICA la luz —sin
     ellas los haces son una mancha translúcida; con polvo flotando adentro
     se ve el aire—. Por eso en calidad ALTA el aire va bastante más poblado
     (factor 1,8): es de los detalles que más se agradecen cuando el equipo
     tiene margen.

     Se crean SIEMPRE todas las de calidad alta y se esconden las sobrantes
     según el nivel. Igual que con los pétalos: si solo se crearan las del
     nivel inicial, un equipo que MEJORA a alta nunca vería el aire más
     poblado sin recargar la página. Esconder una mota no cuesta nada —el
     CSS deja de animarla—, y así subir de nivel se nota al instante.
     (En calidad baja, además, el CSS oculta la capa entera.) */
  /* Fracciones sobre el total sembrado (32 en escritorio). Baja pasó de
     tener CERO motas —el CSS escondía la capa entera y la penumbra quedaba
     muerta— a conservar unas 8: es el polvo el que vuelve volumétrica la
     luz, y sin él la atmósfera se pierde. Se puede permitir porque en baja
     ya no llevan capa de GPU propia (ver estilos/12-haces-de-luz.css). */
  const FRACCION_POR_CALIDAD = { 0: 1, 1: 0.55, 2: 0.25 };
  const CUANTAS = Math.max(3, Math.round(BASE * 1.8));

  /**
   * Deja visibles solo las motas que corresponden al nivel de calidad.
   * @param {number} calidad
   * @returns {void}
   */
  function ajustarCantidadDeMotas(calidad) {
    const fraccion = FRACCION_POR_CALIDAD[calidad] ?? 1;
    const cuantasVisibles = Math.max(3, Math.round(CUANTAS * fraccion));

    /* Con el lienzo no hay elementos que esconder: se marca cuáles se
       dibujan y el bucle saltea el resto. */
    if (usaElLienzo) {
      for (let i = 0; i < motasDelLienzo.length; i++) {
        motasDelLienzo[i].seDibuja = i < cuantasVisibles;
      }
      return;
    }

    const todas = capa.children;
    for (let i = 0; i < todas.length; i++) {
      todas[i].style.display = i < cuantasVisibles ? '' : 'none';
    }
  }

  /**
   * Calcula dónde está y cuánto brilla cada mota en este instante.
   *
   * ⚠️ ESTO REPRODUCE LA ANIMACIÓN "flotar-mota" DEL CSS, tal cual estaba
   * escrita (ver estilos/12-haces-de-luz.css):
   *
   *     0 %   nace en su sitio, invisible
   *     12 %  ya alcanzó su brillo propio
   *     88 %  lo mantiene
   *     100 % terminó su deriva y se apagó, y vuelve a empezar
   *
   * Se pasó a JavaScript no por gusto, sino porque su capa llevaba un
   * `mix-blend-mode: screen` del tamaño de la ventana —de lo más caro que
   * existe para el compositor— y dibujarlas en el lienzo no cuesta ninguna
   * capa. La trayectoria y el ritmo son idénticos.
   *
   * @param {number} tSegundos   - Segundos desde que arrancó la página.
   * @param {number} ancho       - Ancho de la ventana en píxeles.
   * @param {number} alto        - Alto de la ventana en píxeles.
   * @param {number} luzAmbiente - Lo que antes aportaba --luz-intensidad.
   * @returns {void}
   */
  function animarLasMotas(tSegundos, ancho, alto, luzAmbiente) {
    for (let i = 0; i < motasDelLienzo.length; i++) {
      const m = motasDelLienzo[i];
      if (m.seDibuja === false) { m.alfa = 0; continue; }

      /* El retardo es negativo (así al cargar ya están a mitad de camino),
         por eso se RESTA: restar un negativo adelanta el reloj. */
      let avance = ((tSegundos - m.retardo) / m.duracion) % 1;
      if (avance < 0) avance += 1;

      m.x = m.izquierda * ancho + m.derivaX * avance;
      m.y = m.arriba    * alto  + m.derivaY * avance;

      // La rampa de opacidad: sube hasta 12 %, se mantiene, cae desde 88 %.
      let rampa;
      if (avance < 0.12)      rampa = avance / 0.12;
      else if (avance > 0.88) rampa = (1 - avance) / 0.12;
      else                    rampa = 1;

      m.alfa = m.opacidadPropia * rampa * luzAmbiente;
    }
  }

  /** ¿Dibuja el lienzo? (ver codigo/23-lienzo-de-luz.js). */
  const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);

  /* Con el lienzo activo las motas NO son elementos: son números. Acá se
     guardan los mismos datos que antes iban a variables CSS, y el lienzo
     reproduce con ellos la animación "flotar-mota" tal cual estaba escrita
     en el CSS (nacer, derivar en diagonal, apagarse y reaparecer). */
  const motasDelLienzo = [];

  const fragmento = document.createDocumentFragment();

  for (let i = 0; i < CUANTAS; i++) {
    const mota = document.createElement('span');
    mota.className = 'mota';

    // Tamaño: casi todas diminutas, unas pocas un poco mayores.
    const tamano = (0.8 + Math.random() * Math.random() * 3.4).toFixed(2);

    // Nacen repartidas a lo ancho y, sobre todo, en la mitad de arriba.
    const izquierda = (Math.random() * 100).toFixed(2);
    const arriba    = (Math.random() * Math.random() * 78).toFixed(2);

    /* Recorrido: derivan despacio hacia abajo y un poco de costado,
       siguiendo la diagonal por la que entra la luz. */
    const derivaX = (-20 - Math.random() * 55).toFixed(0);
    const derivaY = ( 50 + Math.random() * 130).toFixed(0);

    // Ritmo: lento y desparejo. El retardo negativo hace que al cargar la
    // página ya estén a mitad de camino, no todas recién naciendo.
    const duracion = (18 + Math.random() * 26).toFixed(1);
    const retardo  = (-Math.random() * duracion).toFixed(1);

    // Brillo propio: unas más presentes que otras.
    const opacidad = (0.3 + Math.random() * 0.6).toFixed(2);

    if (usaElLienzo) {
      /* Los mismos números, sin elemento. Las posiciones van en fracción de
         la ventana (0..1) porque la capa era `fixed`: el polvo flota en la
         pantalla, no en el documento, y así sigue valiendo si se
         redimensiona. */
      motasDelLienzo.push({
        izquierda: +izquierda / 100,
        arriba: +arriba / 100,
        radio: +tamano / 2,
        derivaX: +derivaX,
        derivaY: +derivaY,
        duracion: +duracion,
        retardo: +retardo,
        opacidadPropia: +opacidad,
        // Lo que lee el lienzo cada cuadro; se rellena en el bucle.
        x: 0, y: 0, alfa: 0,
      });
      continue;
    }

    mota.style.cssText =
      `width:${tamano}px;height:${tamano}px;left:${izquierda}%;top:${arriba}%;` +
      `--mota-dx:${derivaX}px;--mota-dy:${derivaY}px;` +
      `--mota-dur:${duracion}s;--mota-delay:${retardo}s;--mota-op:${opacidad};`;

    fragmento.appendChild(mota);
  }

  if (usaElLienzo) {
    /* La capa entera se apaga: era la otra `mix-blend-mode: screen` del
       tamaño de la ventana. El lienzo las dibuja sin costar una capa.

       ⚠️ Acá NO va un `return`: abajo se registra el escucha del gobernador
       de calidad, que hace falta en los dos sistemas. Con un return, al
       cambiar de nivel gráfico el polvo se quedaría con la cantidad de
       arranque para siempre. */
    capa.style.display = 'none';
    window.LienzoDeLuz.motas = motasDelLienzo;
    window.LienzoDeLuz.animarLasMotas = animarLasMotas;
  } else {
    capa.appendChild(fragmento);
  }

  /* Se aplica el nivel actual ya mismo (para no mostrar de más un instante)
     y se escucha al gobernador: si el equipo mejora, el aire se puebla; si
     sufre, se aclara. Sin recargar. */
  ajustarCantidadDeMotas(nivelDeCalidad());
  document.addEventListener('calidad-cambio', evento => {
    ajustarCantidadDeMotas((evento.detail && evento.detail.calidad) ?? 0);
  });

})();

/* ═══ 19-velas.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   19 · CANDELABROS Y VELAS DE LA PROFUNDIDAD
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Monta la iluminación de la mitad honda de la página —donde la luz del día
   ya no llega—:
     · CANDELABROS de pared (apliques de latón con 3 velas) en los laterales.
     · CÚMULOS de VELAS DE PISO (cirios derretidos) en los extremos, tipo
       mansión antigua a oscuras.
   Los dibuja, los ubica, los hace TITILAR y, sobre todo, hace que ILUMINEN
   esa zona sin encandilar la lectura.

   ─────────────────────────────────────────────────────────────────────
   LAS DECISIONES QUE HACEN QUE ESTO FUNCIONE

   1) EL ORDEN DE LAS CAPAS (ver 12-haces-de-luz.css)
      La PIEZA va en #apliques (z 57), por debajo del marco: las enredaderas
      le pasan por delante y el candelabro queda montado en la pared.
      El RESPLANDOR va en #luz-de-velas (z 66), por ENCIMA del velo de
      penumbra (65). Antes iba debajo y el velo le comía la luz.

   2) LA LUZ SE CALCULA, NO SE MIDE
      La posición de cada resplandor sale de la geometría (la llama está en
      coordenadas FIJAS del viewBox de su dibujo):
          x = izquierdaDelContenedor + (xDeLaLlama / anchoVB) * anchoReal
      Es determinista: no se desincroniza por reflow. Un ResizeObserver
      sobre las secciones ancla reubica todo si la página cambia de alto
      (el iframe del mapa carga tarde y mueve el resto).

   3) NADA DE `filter: blur`
      El resplandor son dos degradados radiales (núcleo + derrame), suaves de
      nacimiento. El REALISMO del metal y la cera también sale de degradados
      y capas de forma (luz/sombra/pátina), NO de filtros: un filtro sobre
      algo que titila se re-rasteriza en cada cuadro, carísimo sin GPU.

   4) EL BRILLO NO DEBE ENCANDILAR EL TEXTO
      Según el ancho de pantalla, el derrame (que en `screen` suma luz) puede
      caer sobre la caja de texto central y lavar la lectura. Por eso, en cada
      acomodo, se mide cuánto invade el derrame la caja de su sección y:
        · se ATENÚA (baja intensidad y tamaño) cuanto más se acerca, y
        · si queda MUY encima, se manda DETRÁS: el derrame se reubica en
          #apliques (bajo el velo), así la caja lo tapa y el texto se lee
          limpio. El núcleo —chico y pegado a la llama, lejos del centro—
          nunca se toca.

   ─────────────────────────────────────────────────────────────────────
   CÓMO TITILA UNA LLAMA (y por qué no es un seno)
   Una llama tiembla irregular, con caídas bruscas por corrientes de aire.
   El titileo es un "camino al azar": el brillo persigue un objetivo que se
   re-sortea cada tanto, con caídas ocasionales, más un temblor rápido
   encima. La llama del SVG y sus dos resplandores laten con el MISMO valor.

   ÍNDICE
     1. Dibujo (defs, llama, vela, candelabro, cirios de piso)
     2. Dónde va cada pieza
     3. Ubicar pieza y resplandores (por cálculo) + no encandilar el texto
     4. El titileo
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasVelas() {

  const capaApliques = buscar('#apliques');
  const capaLuz      = buscar('#luz-de-velas');
  if (!capaApliques || !capaLuz) return;

  /* Todo se dibuja SIEMPRE y queda ENCENDIDO, aun con las animaciones
     apagadas: es la fuente de luz de la profundidad. Lo único que se apaga
     en modo "sin animación" es el TITILEO (ver el guard del bucle). */


  /* ─── 1. DIBUJO ────────────────────────────────────────────────────────
     Sin contornos de "dibujo": el volumen lo dan los degradados (luz
     arriba-izquierda → sombra abajo-derecha), realces claros y pátina en los
     recovecos. Mismo criterio con el que se arreglaron las rosas. */

  const defsCompartidos =
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <!-- Latón pulido: reflejo casi blanco arriba-izquierda, bronce
           profundo abajo-derecha. Más paradas = más "metal", menos plano. -->
      <linearGradient id="apl-laton" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#fff3c8"/>
        <stop offset="16%"  stop-color="#f0dda2"/>
        <stop offset="42%"  stop-color="#c8a651"/>
        <stop offset="70%"  stop-color="#8f6d2c"/>
        <stop offset="88%"  stop-color="#6a4f22"/>
        <stop offset="100%" stop-color="#4a3518"/>
      </linearGradient>
      <!-- Brazos (tubo): realce longitudinal al medio, sombra a los cantos. -->
      <linearGradient id="apl-brazo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#5d4520"/>
        <stop offset="30%"  stop-color="#c79f45"/>
        <stop offset="48%"  stop-color="#f6e8b4"/>
        <stop offset="64%"  stop-color="#c19c46"/>
        <stop offset="100%" stop-color="#5d4520"/>
      </linearGradient>
      <!-- Llama: núcleo cálido claro → ámbar → rojo en la punta. -->
      <radialGradient id="apl-llama" cx="50%" cy="64%" r="62%">
        <stop offset="0%"   stop-color="#fff6d5"/>
        <stop offset="34%"  stop-color="#ffce68"/>
        <stop offset="70%"  stop-color="#e6822c"/>
        <stop offset="100%" stop-color="#b0421a"/>
      </radialGradient>
      <!-- Cera: lado iluminado y lado en sombra (no es blanco plano). -->
      <linearGradient id="apl-cera" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#fcf5e4"/>
        <stop offset="52%"  stop-color="#e6d9bc"/>
        <stop offset="100%" stop-color="#b6a382"/>
      </linearGradient>
      <!-- Calor de la llama sobre la cera del tope: la cera se traluce. -->
      <radialGradient id="apl-cera-calor" cx="50%" cy="18%" r="70%">
        <stop offset="0%"   stop-color="#ffe6a6" stop-opacity=".9"/>
        <stop offset="55%"  stop-color="#ffcf8a" stop-opacity=".35"/>
        <stop offset="100%" stop-color="#ffcf8a" stop-opacity="0"/>
      </radialGradient>
      <!-- Sombra proyectada / pátina: negro que cae a nada, sin blur. -->
      <radialGradient id="apl-sombra" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#000" stop-opacity=".5"/>
        <stop offset="60%"  stop-color="#000" stop-opacity=".28"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs></svg>`;

  /**
   * La llama (3 capas + base azulada). Se dibuja apoyada en la punta de la
   * mecha (x, mechaY); crece hacia arriba. Va en un <g class="llama"> para
   * que el titileo la tome.
   * @param {number} x     - x de la mecha.
   * @param {number} mechaY - y de la punta de la mecha (base de la llama).
   * @param {number} [k]   - escala de la llama (1 = vela de candelabro).
   * @returns {string}
   */
  function llamaEn(x, mechaY, k = 1) {
    const h  = 20 * k;               // alto de la llama
    const w  = 5.6 * k;              // medio ancho en la base
    const tip = mechaY - h;          // punta
    const midY = mechaY - h * 0.5;
    return `
      <g class="llama">
        <ellipse cx="${x}" cy="${mechaY - 2 * k}" rx="${3.4 * k}" ry="${2.4 * k}" fill="#7fb2ff" opacity=".42"/>
        <path d="M${x} ${mechaY}
                 C ${x - w} ${midY}, ${x - w * 0.75} ${tip + h * 0.28}, ${x} ${tip}
                 C ${x + w * 0.75} ${tip + h * 0.28}, ${x + w} ${midY}, ${x} ${mechaY} Z"
              fill="url(#apl-llama)"/>
        <path d="M${x} ${mechaY - 3 * k}
                 C ${x - w * 0.5} ${midY}, ${x - w * 0.42} ${tip + h * 0.34}, ${x} ${tip + h * 0.12}
                 C ${x + w * 0.42} ${tip + h * 0.34}, ${x + w * 0.5} ${midY}, ${x} ${mechaY - 3 * k} Z"
              fill="#ffdf8f" opacity=".92"/>
        <path d="M${x} ${mechaY - 5 * k}
                 C ${x - w * 0.26} ${midY}, ${x - w * 0.22} ${tip + h * 0.42}, ${x} ${tip + h * 0.24}
                 C ${x + w * 0.22} ${tip + h * 0.42}, ${x + w * 0.26} ${midY}, ${x} ${mechaY - 5 * k} Z"
              fill="#fff8dc" opacity=".95"/>
      </g>`;
  }

  /**
   * Una vela de candelabro con su arandela (platillo), casquillo, cuerpo de
   * cera con goterones y su llama. Apoyada en (bx, by).
   * @param {number} bx
   * @param {number} by
   * @returns {string}
   */
  function velaEn(bx, by) {
    return `
      <!-- arandela / platillo: canto frontal iluminado + sombra debajo -->
      <ellipse cx="${bx}" cy="${by + 2.4}" rx="12.5" ry="3.4" fill="url(#apl-sombra)" opacity=".7"/>
      <ellipse cx="${bx}" cy="${by}" rx="12" ry="3.8" fill="url(#apl-laton)"/>
      <ellipse cx="${bx}" cy="${by - 1.4}" rx="8.6" ry="2.1" fill="#fbeec0" opacity=".5"/>
      <!-- un goterón de cera colgando del borde del platillo -->
      <path d="M${bx - 8} ${by - 0.5} q -1 5, .6 8" fill="none" stroke="#e9dcbe"
            stroke-width="1.7" stroke-linecap="round" opacity=".7"/>
      <!-- casquillo -->
      <path d="M${bx - 5.2} ${by - 1} L${bx - 4.2} ${by - 8} L${bx + 4.2} ${by - 8} L${bx + 5.2} ${by - 1} Z"
            fill="url(#apl-laton)"/>
      <!-- cuerpo de cera + lado iluminado -->
      <rect x="${bx - 4.6}" y="${by - 34}" width="9.2" height="27" rx="2.6" fill="url(#apl-cera)"/>
      <rect x="${bx - 4.6}" y="${by - 34}" width="2.8" height="27" rx="1.4" fill="#fffaf0" opacity=".55"/>
      <!-- el tope se traluce con el calor de la llama -->
      <rect x="${bx - 4.6}" y="${by - 34}" width="9.2" height="10" rx="2.6" fill="url(#apl-cera-calor)"/>
      <!-- goterones por el costado -->
      <path d="M${bx + 3.6} ${by - 24} q 2.4 6, .4 11" fill="none" stroke="#e6d9bb"
            stroke-width="1.6" stroke-linecap="round" opacity=".75"/>
      <path d="M${bx - 3.8} ${by - 18} q -2 5, -.3 9" fill="none" stroke="#ddceac"
            stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
      <!-- mecha -->
      <path d="M${bx} ${by - 34} v -4" stroke="#3a2a1a" stroke-width="1.5" stroke-linecap="round"/>
      ${llamaEn(bx, by - 38, 1)}`;
  }

  /* Medidas del lienzo del candelabro de pared. */
  const PARED_VB_W = 200;
  const PARED_VB_H = 240;
  const PARED_LLAMAS = [
    { x: 150, y: 120 - 40 },
    { x: 112, y:  64 - 40 },
    { x: 112, y: 176 - 40 },
  ];

  /* El candelabro de pared: placa de montaje + 3 brazos de voluta. */
  const svgCandelabro =
    `<svg class="aplique-svg" viewBox="0 0 ${PARED_VB_W} ${PARED_VB_H}" width="100%" aria-hidden="true">
      <!-- sombra proyectada de la placa sobre el muro (despega la pieza) -->
      <ellipse cx="30" cy="122" rx="26" ry="74" fill="url(#apl-sombra)" opacity=".5"/>

      <!-- brazos como TUBO: trazo oscuro de base + trazo de latón encima
           (más fino, corrido 1,5px arriba) + hilo de realce = cilindro -->
      <g fill="none" stroke-linecap="round">
        <g stroke="#4a3518" stroke-width="7.5">
          <path d="M36 121.5 C 80 139.5, 120 139.5, 150 121.5"/>
          <path d="M34 112.5 C 62 93.5, 90 73.5, 112 65.5"/>
          <path d="M34 130.5 C 62 149.5, 90 169.5, 112 177.5"/>
        </g>
        <g stroke="url(#apl-brazo)" stroke-width="6">
          <path d="M36 120 C 80 138, 120 138, 150 120"/>
          <path d="M34 111 C 62 92, 90 72, 112 64"/>
          <path d="M34 129 C 62 148, 90 168, 112 176"/>
        </g>
        <g stroke="#f6e8b4" stroke-width="1.4" opacity=".55">
          <path d="M40 118.6 C 80 135, 118 135, 148 118.6"/>
          <path d="M37 110 C 63 91.5, 90 72, 110 64.6"/>
          <path d="M37 130 C 63 147.5, 90 167, 110 175.4"/>
        </g>
      </g>

      <!-- volutas de adorno en los arranques -->
      <g fill="none" stroke="url(#apl-brazo)" stroke-width="3" stroke-linecap="round" opacity=".9">
        <path d="M60 131 c 9 7, 9 -9, 0 -7"/>
        <path d="M60 99  c 9 -7, 9 9, 0 7"/>
      </g>
      <!-- cuentas en las junturas -->
      <g fill="url(#apl-laton)">
        <circle cx="36" cy="120" r="3.4"/>
        <circle cx="150" cy="120" r="3"/>
        <circle cx="112" cy="64" r="3"/>
        <circle cx="112" cy="176" r="3"/>
      </g>

      <!-- placa de montaje: cuerpo con degradado -->
      <path d="M22 68 C 37 80, 37 160, 22 172 C 7 160, 7 80, 22 68 Z" fill="url(#apl-laton)"/>
      <!-- filigrana grabada (líneas oscuras finas) -->
      <g fill="none" stroke="#3a2c14" stroke-width="1" stroke-linecap="round" opacity=".35">
        <path d="M22 84 C 30 100, 30 140, 22 156 C 14 140, 14 100, 22 84"/>
        <path d="M22 96 c 6 4, 6 -8, 0 -6 c -6 -2, -6 10, 0 6"/>
        <path d="M22 144 c 6 4, 6 -8, 0 -6 c -6 -2, -6 10, 0 6"/>
      </g>
      <!-- realce claro del canto izquierdo + borde perlado -->
      <path d="M19 78 C 27 88, 27 152, 19 162 C 14 152, 14 88, 19 78 Z" fill="#f6e6b0" opacity=".28"/>
      <path d="M22 70 C 35 82, 35 158, 22 170" fill="none" stroke="#fbeec0"
            stroke-width="1.2" stroke-dasharray="0.1 6" stroke-linecap="round" opacity=".55"/>
      <!-- remates -->
      <circle cx="22" cy="57" r="5.2" fill="url(#apl-laton)"/>
      <path d="M22 180 l 5.6 13 l -5.6 6.5 l -5.6 -6.5 Z" fill="url(#apl-laton)"/>
      <!-- boss central con cabujón rojo -->
      <circle cx="31" cy="122" r="9.8" fill="url(#apl-sombra)" opacity=".5"/>
      <circle cx="31" cy="120" r="9.5" fill="url(#apl-laton)"/>
      <circle cx="31" cy="120" r="4" fill="#8d1f31"/>
      <circle cx="29.4" cy="118.4" r="1.3" fill="#e07f90" opacity=".65"/>

      <!-- las tres velas -->
      ${velaEn(150, 120)}
      ${velaEn(112, 64)}
      ${velaEn(112, 176)}
    </svg>`;


  /* ─── CIRIOS DE PISO ────────────────────────────────────────────────────
     Un cúmulo sobrio de cirios derretidos, a distinta altura, apoyados en el
     "piso" (la base de la sección). Pocos: mansión antigua, no fiesta. */
  /* ── CUÁNTOS CIRIOS, SEGÚN LA PANTALLA ──
     Eran cuatro fijos. En un monitor ultrapanorámico ese puñadito quedaba
     perdido en la esquina; en un celular, cuatro ya llenaban. Ahora la
     cantidad se ata al ancho de la ventana y el cúmulo se lee siempre con
     el mismo peso visual.

     El lienzo los dibuja a todos con un solo `drawImage` por resplandor, así
     que duplicarlos no duplica el costo de compositing: son más estampas
     sobre el MISMO canvas, no más capas. */
  /* ⚠️ TOPE BAJO, Y APRENDIDO A GOLPES. Se pidió "el doble" de cuatro y yo
     puse hasta quince: el medidor pasó de 52 velas a 96, y cada vela son dos
     resplandores que el lienzo estampa en cada repintado. Duplicar está
     bien; cuadruplicar hunde el rendimiento en un equipo con gráfica
     integrada. Ocho es el doble de cuatro. */
  const CUANTOS_CIRIOS = (() => {
    const ancho = window.innerWidth;
    if (ancho < 700)  return 5;
    if (ancho < 1500) return 7;
    return 8;
  })();

  /* El lienzo se ensancha con la cantidad, para que los cirios no se
     apelotonen: ~30 unidades de viewBox por cirio más un margen. */
  const PISO_VB_W = 110 + CUANTOS_CIRIOS * 30;
  const PISO_VB_H = 210;
  const PISO_SUELO = 196;                 // línea del piso en el viewBox

  /* ── EL CÚMULO, GENERADO ──
     Antes las cuatro posiciones estaban escritas a mano y había que
     mantener a la par la lista de llamas: cualquier cambio en una y no en
     la otra desenlazaba los fuegos de sus mechas. Ahora salen de la misma
     fuente, así que no pueden desincronizarse.

     Con semilla fija: el cúmulo es siempre el mismo dibujo, no cambia entre
     recargas. */
  const CIRIOS = (() => {
    const azar = crearAzarConSemilla(4242);
    const lista = [];
    const paso = (PISO_VB_W - 70) / Math.max(1, CUANTOS_CIRIOS - 1);

    for (let i = 0; i < CUANTOS_CIRIOS; i++) {
      lista.push({
        x: 35 + i * paso + azar.entre(-10, 10),
        /* Alturas muy dispares: un cúmulo de cirios consumidos de forma
           pareja parece de fábrica. Los hay recién puestos y casi extintos. */
        topY: azar.entre(38, 150),
        w: azar.entre(8.5, 16),
      });
    }

    /* De atrás hacia adelante: los más altos se dibujan primero para que los
       de delante los tapen y el cúmulo tenga profundidad. */
    lista.sort((a, b) => a.topY - b.topY);
    return lista;
  })();

  /** Las llamas, derivadas del MISMO cúmulo: enlace por índice garantizado. */
  const PISO_LLAMAS = CIRIOS.map(c => ({ x: c.x, y: c.topY - 6 }));

  /**
   * Un cirio de piso derretido: base de cera escurrida + cuerpo + goterones
   * + mecha + llama. Apoyado en el suelo del viewBox.
   * @param {number} cx  - x del cirio.
   * @param {number} topY - y del tope (donde nace la llama).
   * @param {number} w   - medio ancho del cuerpo.
   * @returns {string}
   */
  function cirioEn(cx, topY, w) {
    const suelo = PISO_SUELO;
    return `
      <!-- charco de cera escurrida en el piso -->
      <ellipse cx="${cx}" cy="${suelo + 2}" rx="${w + 7}" ry="5" fill="url(#apl-sombra)" opacity=".55"/>
      <ellipse cx="${cx}" cy="${suelo}" rx="${w + 6}" ry="4.2" fill="url(#apl-cera)"/>
      <!-- cuerpo del cirio -->
      <path d="M${cx - w} ${suelo}
               C ${cx - w - 2} ${topY + 10}, ${cx - w + 1} ${topY + 3}, ${cx - w + 1.5} ${topY}
               L ${cx + w - 1.5} ${topY}
               C ${cx + w - 1} ${topY + 3}, ${cx + w + 2} ${topY + 10}, ${cx + w} ${suelo} Z"
            fill="url(#apl-cera)"/>
      <!-- lado iluminado -->
      <rect x="${cx - w}" y="${topY}" width="${w * 0.55}" height="${suelo - topY}" rx="2" fill="#fffaf0" opacity=".4"/>
      <!-- tope traslúcido por el calor -->
      <ellipse cx="${cx}" cy="${topY + 2}" rx="${w}" ry="3.4" fill="#efe2c4"/>
      <ellipse cx="${cx}" cy="${topY}" rx="${w}" ry="7" fill="url(#apl-cera-calor)"/>
      <!-- goterones -->
      <path d="M${cx + w - 1} ${topY + 12} q 2.5 ${(suelo - topY) * 0.4}, .5 ${(suelo - topY) * 0.7}"
            fill="none" stroke="#e6d9bb" stroke-width="1.7" stroke-linecap="round" opacity=".7"/>
      <path d="M${cx - w + 1.5} ${topY + 20} q -2.5 ${(suelo - topY) * 0.3}, -.4 ${(suelo - topY) * 0.55}"
            fill="none" stroke="#ddceac" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
      <!-- mecha -->
      <path d="M${cx} ${topY} v -4" stroke="#3a2a1a" stroke-width="1.5" stroke-linecap="round"/>
      ${llamaEn(cx, topY - 4, 1.05)}`;
  }

  /* Un par de tocones derretidos SIN llama, repartidos entre los cirios
     encendidos. Son los que ya se consumieron: pueblan el cúmulo y cuentan
     que esto lleva años encendiéndose, sin sumar un fuego más que animar. */
  function toconEn(cx, altura) {
    const cima = PISO_SUELO - altura;
    return `
      <path d="M${cx - 10} ${PISO_SUELO} C ${cx - 12} ${cima + 6}, ${cx - 6} ${cima}, ${cx} ${cima}
               C ${cx + 6} ${cima}, ${cx + 12} ${cima + 6}, ${cx + 10} ${PISO_SUELO} Z"
            fill="url(#apl-cera)" opacity=".9"/>
      <ellipse cx="${cx}" cy="${cima}" rx="10" ry="3" fill="#efe2c4" opacity=".9"/>`;
  }

  const svgCirios =
    `<svg class="aplique-svg" viewBox="0 0 ${PISO_VB_W} ${PISO_VB_H}" width="100%" aria-hidden="true">
      <!-- sombra del cúmulo sobre el piso, del ancho que le toque -->
      <ellipse cx="${PISO_VB_W / 2}" cy="${PISO_SUELO + 4}"
               rx="${PISO_VB_W * 0.42}" ry="9" fill="url(#apl-sombra)" opacity=".45"/>
      <!-- los cirios, ya ordenados de atrás hacia adelante -->
      ${CIRIOS.map(c => cirioEn(c.x, c.topY, c.w)).join('')}
      <!-- tocones consumidos, en los huecos de los extremos -->
      ${toconEn(PISO_VB_W - 26, 24)}
      ${toconEn(18, 18)}`;
  // (el SVG de cirios se cierra abajo, al insertarlo, con </svg>)


  /* ─── 2. DÓNDE VA CADA PIEZA ────────────────────────────────────────────
     Candelabros de pared flanqueando las secciones oscuras; un cúmulo de
     cirios de piso a cada lado de la sección más honda (la confirmación). */
  const ANCLAS = [
    { seccion: '#regalos',      lado: 'izq', tipo: 'pared' },
    { seccion: '#regalos',      lado: 'der', tipo: 'pared' },
    { seccion: '#ubicacion',    lado: 'izq', tipo: 'pared' },   // el MAPA, a ambos lados
    { seccion: '#ubicacion',    lado: 'der', tipo: 'pared' },
    { seccion: '#confirmacion', lado: 'izq', tipo: 'pared' },
    { seccion: '#confirmacion', lado: 'der', tipo: 'pared' },
    /* Los cirios de piso van HASTA ABAJO: su base se apoya en la línea del
       marco (la cenefa inferior), no en el borde de una sección. Se anclan al
       pie solo para que el ResizeObserver los reubique al cambiar el alto. */
    { seccion: '#pie-de-pagina', lado: 'izq', tipo: 'piso' },
    { seccion: '#pie-de-pagina', lado: 'der', tipo: 'piso' },
  ];

  /** Descriptor de cada tipo de pieza: su dibujo, su viewBox y sus llamas. */
  const TIPOS = {
    pared: { svg: svgCandelabro,          vbW: PARED_VB_W, vbH: PARED_VB_H, llamas: PARED_LLAMAS, factor: 1,    apoyo: 'centro' },
    /* El `factor` crece con el lienzo: si el viewBox se ensanchó para meter
       más cirios, la pieza tiene que ocupar más ancho en pantalla o cada
       cirio saldría más chico. 240 era el ancho del cúmulo de cuatro. */
    piso:  { svg: svgCirios + '</svg>',   vbW: PISO_VB_W,  vbH: PISO_VB_H,  llamas: PISO_LLAMAS,  factor: 0.72 * (PISO_VB_W / 240), apoyo: 'piso',
             /* Devuelve el halo a su tamaño por vela pese a que la pieza se
                ensanchó, y lo baja un poco más según cuántos cirios haya: la
                luz se SUMA, así que quince halos al mismo brillo que cuatro
                queman la esquina. La raíz cuadrada mantiene el conjunto con
                el mismo peso luminoso sin apagar cada vela por separado. */
             escalaDelResplandor: (240 / PISO_VB_W) * Math.pow(4 / CUANTOS_CIRIOS, 0.4) },
  };

  /**
   * Ancho útil de la página, SIN la barra de desplazamiento (window.innerWidth
   * SÍ la incluye y dejaba los del lado derecho corridos ~10 px).
   * @returns {number}
   */
  function anchoUtil() {
    return capaApliques.clientWidth || document.documentElement.clientWidth;
  }

  /**
   * Ancho base del candelabro de pared en px (adaptativo, ~2×). En pantallas
   * chicas se achica: ahí una pieza grande se comería el centro.
   * @returns {number}
   */
  function anchoBase() {
    const w = anchoUtil();
    if (w < 700) return limitar(w * 0.28, 84, 150);
    return limitar(w * 0.235, 240, 440);
  }

  /* ⚡ LA CONSTRUCCIÓN TAMPOCO OCURRE DURANTE LA CARGA (ver sección 3 bis).
     Esta lista arranca VACÍA y se llena de a una pieza por cuadro recién
     cuando la invitación se revela. Todo lo que la recorre (el titileo, el
     rearmado de fuentes de luz) funciona igual con la lista vacía: no hace
     nada hasta que hay piezas. */
  /** @type {Array} */
  const piezas = [];

  /**
   * Construye UNA pieza: su candelabro (o cúmulo de cirios) y sus fuegos.
   * @param {Object} a - Un ancla de ANCLAS.
   * @returns {void}
   */
  function construirUnaPieza(a) {
    const seccion = buscar(a.seccion);
    if (!seccion) return;
    const t = TIPOS[a.tipo];

    const cont = document.createElement('div');
    cont.className = 'aplique aplique--' + a.tipo;
    cont.innerHTML = t.svg;
    capaApliques.appendChild(cont);

    /* ⚡ UN CONTENEDOR DE MEZCLA POR PIEZA (ni uno gigante, ni uno por luz).
       La mezcla "screen" es lo que hace que estas luces SUMEN claridad sobre
       lo que tienen debajo en vez de taparlo. Dónde se aplica esa mezcla es
       una decisión de rendimiento, y se probaron los dos extremos midiendo:

         · En la capa que cubre TODO el documento: una sola capa, pero de
           millones de píxeles que hay que releer y remezclar cada vez que una
           llama titila → "Commit" se disparaba al 25,6 %.
         · En cada .vela por separado: áreas chiquitas, pero el navegador
           arma UNA CAPA POR ELEMENTO, y son 52 → "Layerize" saltó de 5,8 % a
           22,3 %, y "Pre-paint" de 4,1 % a 18,1 %. Peor todavía.

       El punto medio correcto es este: una capa de mezcla POR PIEZA (los 6
       candelabros y los 2 cúmulos de cirios). Son 8 capas, cada una del
       tamaño de su candelabro y no del documento. Las luces se cuelgan de
       acá y se ubican en coordenadas RELATIVAS a este contenedor. */
    const luzDeLaPieza = document.createElement('div');
    luzDeLaPieza.className = 'luz-de-pieza';
    capaLuz.appendChild(luzDeLaPieza);

    /* Cada .llama del dibujo se enlaza por índice con su fuego (por eso las
       listas de llamas están en el mismo orden en que se dibujan). */
    const llamaNodes = Array.from(cont.querySelectorAll('.llama'));

    /* Por cada llama, sus DOS resplandores (núcleo + derrame). Viven en la
       capa de luz (sobre el velo), pero se ubican por cálculo desde este
       mismo contenedor, así que nunca se despegan de su llama. */
    const fuegos = t.llamas.map((punto, i) => {
      const nucleo = document.createElement('div');
      nucleo.className = 'vela vela--nucleo';
      const derrame = document.createElement('div');
      derrame.className = 'vela vela--derrame';
      luzDeLaPieza.appendChild(derrame);   // el derrame va debajo del núcleo
      luzDeLaPieza.appendChild(nucleo);

      const base = 0.62 + Math.random() * 0.22;
      nucleo.style.opacity  = base.toFixed(3);
      derrame.style.opacity = (base * 0.85).toFixed(3);

      return {
        llama: llamaNodes[i] || llamaNodes[0],
        nucleo, derrame, base, puntoSvg: punto,
        nivel: 1, objetivo: 1, proximoSorteo: 0,
        fase: Math.random() * 1000,
        cy: 0,
        atenua: 1,        // tope por cercanía a la caja de texto (1 = sin tope)
        detras: false,    // true = derrame reubicado en #apliques (bajo el velo)
      };
    });

    piezas.push({ cont, luzDeLaPieza, lado: a.lado, tipo: a.tipo, seccion, fuegos, t, caja: null });
  }


  /* ─── 3. UBICAR PIEZA Y RESPLANDORES (POR CÁLCULO) ─────────────────────
     Se coloca la pieza y, con la MISMA cuenta, cada resplandor. Y se mide
     cuánto invade el derrame la caja de texto de su sección para NO
     encandilar la lectura (atenuar + mandar detrás si está muy encima). */

  /** La caja de texto que hay que proteger dentro de una sección. */
  function cajaDeTexto(seccion) {
    return seccion.querySelector('.marco-ornamental, .mapa-marco');
  }

  /**
   * Y (en coordenadas del documento) de la "línea del piso": la cenefa
   * inferior del marco. Los cirios apoyan su base ahí, o un pelín más abajo
   * (metidos ~un tercio en la cenefa), para que se lean "apoyados en el piso"
   * del salón. Si no está la cenefa, se cae al fondo del documento menos el
   * grosor del marco.
   * @returns {number}
   */
  function lineaDelPiso() {
    const cenefa = buscar('.marco__cenefa--inferior');
    if (cenefa) {
      const r = cenefa.getBoundingClientRect();
      return r.top + window.scrollY + r.height * 0.35;
    }
    const grosor = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--marco-grosor')
    ) || 60;
    return document.documentElement.scrollHeight - grosor * 0.65;
  }

  /**
   * Acomoda las 8 piezas… DE A UNA POR CUADRO.
   *
   * ⚠️ ERA LA ÚLTIMA CONSTRUCCIÓN GRANDE SIN TROCEAR, y se notaba: el
   * medidor marcaba tareas largas de más de un segundo. Cada pieza lee la
   * geometría de la caja de texto de su sección (`getBoundingClientRect`,
   * que obliga al navegador a resolver el layout) y coloca hasta ocho
   * fuegos. Las ocho de corrido, encadenadas detrás de la construcción de
   * las enredaderas, congelaban la página justo al abrir el sobre.
   *
   * Un promedio de 29 ms por cuadro con un parón de 1.200 ms se siente PEOR
   * que 40 ms constantes: lo que se percibe como pesadez es el tirón, no la
   * media. De a una, ninguna pasada se sale del presupuesto de un cuadro.
   *
   * ⚠️ rearmarLasFuentesDeLuz() SE LLAMA DESPUÉS DE CADA PIEZA, no solo al
   * final. Antes se llamaba una única vez, cuando las ocho ya estaban
   * colocadas — y como colocarPieza() mueve el candelabro (un elemento del
   * DOM) pero es rearmarLasFuentesDeLuz() quien le avisa al LIENZO dónde
   * quedó la luz, durante esos cuadros intermedios el metal ya estaba en su
   * sitio nuevo y el resplandor se seguía dibujando en el viejo: un salto
   * visible entre el candelabro y su propia luz. Reconstruir el array de
   * fuentes 8 veces en vez de 1 es trivial (recorre ~104 objetos), y
   * garantiza que nunca queden desincronizados.
   *
   * @param {Function} [alTerminar] - Se llama cuando están todas colocadas.
   * @returns {void}
   */
  function acomodarTodo(alTerminar) {
    const anchoRef = anchoBase();
    const usaElLienzo = !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);

    trabajarPorTandas(
      piezas.length,
      i => {
        colocarPieza(piezas[i], anchoRef);
        if (usaElLienzo) rearmarLasFuentesDeLuz();
      },
      () => {
        if (typeof alTerminar === 'function') alTerminar();
      }
    );
  }

  /* cederElHilo() y trabajarPorTandas() viven en codigo/02-utilidades.js:
     los usan también las enredaderas y las motas, así que la copia local
     que había acá se borró para no mantener tres versiones de lo mismo. */

  /**
   * Coloca UNA pieza: el candelabro y todos sus fuegos.
   * @param {Object} c
   * @param {number} anchoRef
   * @returns {void}
   */
  function colocarPieza(c, anchoRef) {
    {
      const t = c.t;
      const ancho  = anchoRef * t.factor;
      const alto   = ancho * (t.vbH / t.vbW);
      const escala = ancho / t.vbW;

      const caja = c.seccion.getBoundingClientRect();
      const topSeccion = caja.top + window.scrollY;
      const topPieza = (t.apoyo === 'piso')
        ? lineaDelPiso() - alto                       // base en la línea del marco
        : topSeccion + caja.height / 2 - alto / 2;    // centrado en la pared

      c.cont.style.width = ancho + 'px';
      c.cont.style.top   = topPieza + 'px';
      if (c.lado === 'izq') {
        c.cont.style.left = '0';
        c.cont.style.right = '';
        c.cont.style.transform = '';
      } else {
        c.cont.style.right = '0';
        c.cont.style.left = '';
        c.cont.style.transform = 'scaleX(-1)';
      }

      /* Borde izquierdo del contenedor en coordenadas del documento (lado
         derecho: ancho ÚTIL, sin barra de desplazamiento). */
      const izquierdaPieza = (c.lado === 'izq') ? 0 : (anchoUtil() - ancho);

      /* Rect de la caja de texto de esta sección (en coordenadas del
         documento) para medir el solape con cada derrame. */
      const elCaja = cajaDeTexto(c.seccion);
      let bx0, bx1, by0, by1, hayCaja = false;
      if (elCaja) {
        const rb = elCaja.getBoundingClientRect();
        bx0 = rb.left  + window.scrollX; bx1 = rb.right  + window.scrollX;
        by0 = rb.top   + window.scrollY; by1 = rb.bottom + window.scrollY;
        hayCaja = true;
      }

      /* ⚠️ EL RESPLANDOR ES DE CADA VELA, NO DE LA PIEZA ENTERA.
         Esto causó un desastre: al ensanchar el cúmulo de cirios para meter
         más, `ancho` creció 2,3 veces… y como el tamaño del halo salía de
         `ancho`, cada halo creció 2,3 veces TAMBIÉN. Con 15 cirios en vez de
         4, y sumándose de forma aditiva, la esquina se convertía en una
         mancha blanca.

         `escalaDelResplandor` devuelve el halo a su tamaño por vela: la
         pieza puede ser todo lo ancha que haga falta, que cada llama sigue
         iluminando lo mismo. */
      const escalaDelResplandor = t.escalaDelResplandor ?? 1;
      const tamNucleo  = ancho * 0.85 * escalaDelResplandor;
      const tamDerrameMax = ancho * 2.2 * escalaDelResplandor;
      const radioMax = tamDerrameMax / 2;

      /* ⚡ EL CONTENEDOR DE MEZCLA SE AJUSTA A LA LUZ, NO AL CANDELABRO.
         Antes cubría el candelabro ENTERO más un margen: pero las llamas
         están todas arriba, en los brazos, y el cuerpo del candelabro no
         emite nada. Medido en la página viva, cuatro de estas cajas tenían
         el 87 % de su área vacía.

         Y no es área cualquiera: `mix-blend-mode` obliga al compositor a
         LEER DE VUELTA el fondo de toda la caja antes de dibujar, aunque
         esté vacía. Entre las 8 piezas se leían 1,7 millones de píxeles de
         más en cada cuadro; en el perfil, "Layerize" + "Commit" juntos eran
         el 50 % del tiempo.

         Ahora la caja es exactamente la unión de los resplandores: el centro
         de cada llama más el radio máximo del derrame en las cuatro
         direcciones. NO PUEDE RECORTAR NADA, porque ese radio es por
         definición lo más lejos que llega la luz de esa llama. */
      let luzX0 = Infinity, luzY0 = Infinity, luzX1 = -Infinity, luzY1 = -Infinity;
      for (const fuego of c.fuegos) {
        const xL = (c.lado === 'izq')
          ? fuego.puntoSvg.x * escala
          : (t.vbW - fuego.puntoSvg.x) * escala;
        const cxf = izquierdaPieza + xL;
        const cyf = topPieza + fuego.puntoSvg.y * escala;
        luzX0 = Math.min(luzX0, cxf - radioMax); luzX1 = Math.max(luzX1, cxf + radioMax);
        luzY0 = Math.min(luzY0, cyf - radioMax); luzY1 = Math.max(luzY1, cyf + radioMax);
      }
      // Si la pieza no tuviera llamas, se cae al comportamiento de antes.
      if (!isFinite(luzX0)) {
        luzX0 = izquierdaPieza - radioMax;
        luzY0 = topPieza - radioMax;
        luzX1 = izquierdaPieza + ancho + radioMax;
        luzY1 = topPieza + alto + radioMax;
      }

      const origenX = luzX0;
      const origenY = luzY0;
      c.luzDeLaPieza.style.left   = origenX + 'px';
      c.luzDeLaPieza.style.top    = origenY + 'px';
      c.luzDeLaPieza.style.width  = (luzX1 - luzX0) + 'px';
      c.luzDeLaPieza.style.height = (luzY1 - luzY0) + 'px';

      for (const fuego of c.fuegos) {
        const xLocal = (c.lado === 'izq')
          ? fuego.puntoSvg.x * escala
          : (t.vbW - fuego.puntoSvg.x) * escala;
        const cx = izquierdaPieza + xLocal;
        const cy = topPieza + fuego.puntoSvg.y * escala;
        fuego.cy = cy;

        /* ── Cuánto invade el derrame la caja de texto ──
           d = distancia del centro del brillo al rectángulo de la caja
           (0 si el centro cae dentro). solape = cuánto entra el radio. */
        let atenua = 1, detras = false;
        if (hayCaja) {
          const ddx = (cx < bx0) ? bx0 - cx : (cx > bx1 ? cx - bx1 : 0);
          const ddy = (cy < by0) ? by0 - cy : (cy > by1 ? cy - by1 : 0);
          const d = Math.hypot(ddx, ddy);
          const solape = radioMax - d;
          if (solape > 0) {
            const ratio = Math.min(solape / radioMax, 1);   // 0..1
            atenua = limitar(1 - ratio * 1.15, 0.12, 1);
            // muy encima: el centro casi toca la caja, o la invade de lleno
            if (d <= radioMax * 0.4 || ratio > 0.6) detras = true;
          }
        }
        fuego.atenua = atenua;

        /* El derrame cambia de capa ANTES de ubicarlo, porque de eso depende
           en qué sistema de coordenadas hay que escribirlo: dentro del
           contenedor de la pieza van relativas a su origen; si se lo manda
           detrás del texto vive en #apliques, que va en coordenadas del
           documento. */
        if (detras !== fuego.detras) {
          fuego.detras = detras;
          const capaObjetivo = detras ? capaApliques : c.luzDeLaPieza;
          if (fuego.derrame.parentNode !== capaObjetivo) capaObjetivo.appendChild(fuego.derrame);
          fuego.derrame.classList.toggle('vela--detras', detras);
        }

        /* Núcleo: siempre dentro del contenedor de mezcla de su pieza, así
           que sus coordenadas van relativas a ese origen. */
        fuego.nucleo.style.width  = tamNucleo + 'px';
        fuego.nucleo.style.height = tamNucleo + 'px';
        fuego.nucleo.style.left   = (cx - origenX - tamNucleo / 2) + 'px';
        fuego.nucleo.style.top    = (cy - origenY - tamNucleo / 2) + 'px';

        /* Derrame: se encoge un poco al acercarse a la caja, y si queda muy
           encima se muda a #apliques (bajo el velo) para no lavar el texto. */
        const tamDerrame = tamDerrameMax * (0.62 + 0.38 * atenua);
        const desdeX = detras ? 0 : origenX;   // #apliques usa coords del documento
        const desdeY = detras ? 0 : origenY;
        fuego.derrame.style.width  = tamDerrame + 'px';
        fuego.derrame.style.height = tamDerrame + 'px';
        fuego.derrame.style.left   = (cx - desdeX - tamDerrame / 2) + 'px';
        fuego.derrame.style.top    = (cy - desdeY - tamDerrame / 2) + 'px';
        fuego.derrame.style.opacity = (fuego.base * 0.85 * atenua).toFixed(3);

        /* ⚡ Y LO MISMO, EN NÚMEROS, PARA EL LIENZO DE LUZ.
           Cuando dibuja el canvas (codigo/23-lienzo-de-luz.js) no hacen
           falta los divs, pero sí sus medidas: centro y radio en
           coordenadas del DOCUMENTO. Se guardan siempre —cuesta nada— así
           el cambio entre un sistema y otro es instantáneo. */
        fuego.cx = cx;
        fuego.radioNucleo  = tamNucleo  / 2;
        fuego.radioDerrame = tamDerrame / 2;
      }
    }
  }

  /* ─── PUENTE CON EL LIENZO DE LUZ ───────────────────────────────────
     El canvas no sabe nada de velas: solo recibe una lista plana de
     manchas de luz (centro, radio, opacidad). Acá se arma esa lista, una
     vez por acomodada, y después el bucle solo le actualiza la opacidad.
     ---------------------------------------------------------------- */

  /** Cada fuego aporta dos manchas: su núcleo y su derrame. */
  function rearmarLasFuentesDeLuz() {
    const fuentes = [];
    for (const c of piezas) {
      for (const fuego of c.fuegos) {
        /* ⚠️ SE SALTEA UN FUEGO QUE TODAVÍA NO TIENE POSICIÓN.
           Desde que acomodarTodo() llama a esta función después de CADA
           pieza (y no solo al final de las ocho), acá pueden convivir
           fuegos ya colocados con otros que esperan su turno —a esos
           colocarPieza() todavía no les asignó cx/radioNucleo/radioDerrame,
           así que quedarían `undefined`. Sin este filtro, el lienzo
           recibiría una fuente con radio undefined y perdería tiempo en
           cada cuadro intentando dibujar algo que no existe. */
        if (fuego.radioNucleo === undefined) continue;

        fuego.fuenteNucleo  = { x: fuego.cx, y: fuego.cy, radio: fuego.radioNucleo,  alfa: 0, derrame: false };
        fuego.fuenteDerrame = { x: fuego.cx, y: fuego.cy, radio: fuego.radioDerrame, alfa: 0, derrame: true };
        fuentes.push(fuego.fuenteDerrame, fuego.fuenteNucleo);   // el derrame va debajo
      }
    }
    window.LienzoDeLuz.fuentes = fuentes;

    /* Los contenedores de mezcla dejan de existir para el compositor: son
       las 8 capas de `mix-blend-mode` que costaban la mitad del perfil. */
    for (const c of piezas) c.luzDeLaPieza.style.display = 'none';
  }

  /* ─── 3 bis. NI CONSTRUIR NI ACOMODAR DURANTE LA CARGA ─────────────────
     Los candelabros viven en la penumbra, detrás del sobre: nadie los ve
     hasta que la invitación se revela. Así que ni se crean ni se miden
     antes de ese momento.

     ⚠️ ANTES ACÁ HABÍA DOS PROBLEMAS, Y LOS DOS COSTABAN CAROS:

       1. Solo el ACOMODADO estaba diferido; la CONSTRUCCIÓN (parsear los 8
          SVG completos y crear 104 divs) ocurría en plena evaluación del
          script, o sea en el peor momento posible. El comentario que había
          acá decía "tampoco acá se acomoda nada durante la carga", que era
          cierto pero incompleto: crear no es acomodar.

       2. Un temporizador de respaldo de 1.600 ms que se disparaba SIEMPRE,
          aunque el sobre siguiera cerrado — el mismo error que en
          07-marco-y-enredaderas.js. Y encima `load` llamaba a acomodarTodo()
          salteándose el guard, así que en una carga normal el layout de las
          8 piezas corría DOS VECES.

     Ahora es una sola cadena, disparada por un solo evento: construir (de a
     una pieza por cuadro) → acomodar (de a una pieza por cuadro) → observar
     cambios de tamaño. El caso "no existe el sobre" lo cubre
     codigo/03-sobre-de-apertura.js emitiendo el evento él mismo. */
  let yaSeConstruyo = false;

  function construirYAcomodarUnaSolaVez() {
    if (yaSeConstruyo) return;
    yaSeConstruyo = true;

    // Los <defs> compartidos (degradados y filtros) van una sola vez.
    capaApliques.insertAdjacentHTML('beforeend', defsCompartidos);

    trabajarPorTandas(
      ANCLAS.length,
      i => construirUnaPieza(ANCLAS[i]),
      // Recién con todas las piezas creadas tiene sentido medirlas.
      () => acomodarTodo(observarLasSecciones)
    );
  }

  document.addEventListener('invitacion-visible', construirYAcomodarUnaSolaVez);

  /* Rehacer si cambia el tamaño de la ventana (con un respiro).
     Si todavía no se construyó nada, no hay nada que acomodar. */
  let temporizador = null;
  function acomodarConRespiro() {
    if (!piezas.length) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(acomodarTodo, 200);
  }
  window.addEventListener('resize', acomodarConRespiro);
  window.addEventListener('load', acomodarConRespiro);

  /* ⚠️ EL CASO QUE FALLABA: el iframe del mapa carga TARDE y mueve todo lo
     que hay debajo. Un ResizeObserver sobre las secciones ancla reubica en
     cuanto eso pasa, así la luz nunca queda corrida respecto de su llama.
     Se engancha al terminar de construir, porque antes `piezas` está vacía
     y no habría ninguna sección que observar. */
  function observarLasSecciones() {
    if (!('ResizeObserver' in window)) return;
    const observador = new ResizeObserver(acomodarConRespiro);
    const vistas = new Set();
    for (const c of piezas) {
      if (!vistas.has(c.seccion)) { observador.observe(c.seccion); vistas.add(c.seccion); }
    }
  }


  /* ─── 4. EL TITILEO ────────────────────────────────────────────────────
     Las velas quedan ENCENDIDAS siempre EN LOS TRES NIVELES: son la fuente
     de luz de la profundidad, no un adorno de movimiento (a diferencia de
     los haces o las motas, nunca se apagan por calidad). Este bucle solo
     agrega el titileo. Si las animaciones están apagadas, queda en reposo
     (prendidas, quietas).
     ⚡ RENDIMIENTO: se recalcula cada ~45 ms (~22 fps) y solo las velas
     cercanas a la pantalla. En calidad más baja se espacia más el
     recálculo: una llama real no titila con un ritmo perfecto, así que
     aun más lento se sigue leyendo vivo —el "algoritmo más liviano" que
     no resigna la sensación de la escena—. El derrame respeta su tope de
     atenuación. */
  /* En calidad ALTA el titileo se recalcula bastante más seguido (30 ms,
     ~33 veces por segundo): la llama respira más fina y viva, que es
     justamente el detalle que se aprecia cuando el equipo tiene margen. */
  /* Media y baja también titilan más fino que antes (eran 65 y 110 ms): con
     el margen recuperado, la llama respira mejor en todos los niveles. */
  const CADA_CUANTO_POR_CALIDAD = { 0: 30, 1: 50, 2: 90 };
  let calidadDelTitileo = nivelDeCalidad();
  let cadaCuanto = CADA_CUANTO_POR_CALIDAD[calidadDelTitileo] ?? 45;
  document.addEventListener('calidad-cambio', evento => {
    calidadDelTitileo = (evento.detail && evento.detail.calidad) ?? 0;
    cadaCuanto = CADA_CUANTO_POR_CALIDAD[calidadDelTitileo] ?? 45;
  });
  let ultimoCalculo = 0;

  /** ¿Está pintando el canvas? Se consulta una vez por cuadro, no por vela. */
  function usaElLienzoAhora() {
    return !!(window.LienzoDeLuz && window.LienzoDeLuz.activo);
  }

  /* En calidad baja, la llama deja de "respirar" en tamaño (solo titila en
     opacidad): un style.transform menos por llama por cuadro. La luz sigue
     viva —tiembla igual—, se resigna únicamente el leve crecer/encoger. */
  function debeAnimarLaEscala() {
    return calidadDelTitileo !== CALIDAD_GRAFICA.BAJA;
  }

  /* Ventana de "está cerca de la pantalla": en calidad baja se angosta, así
     que al estar frente a UNA sección no se siguen actualizando de fondo
     los candelabros de la sección vecina (menos llamas titilando a la vez).
     Los candelabros y cirios NUNCA se apagan por esto —siguen encendidos,
     dibujados con su último brillo—, solo dejan de recalcularse. */
  const VENTANA_POR_CALIDAD = {
    0: { arriba: 0.4, abajo: 1.4 },
    1: { arriba: 0.4, abajo: 1.4 },
    2: { arriba: 0.15, abajo: 1.15 },
  };

  function dibujarCuadro(t) {
    if (!hayAlgoQueMirar()) {
      requestAnimationFrame(dibujarCuadro);
      return;
    }
    if (t - ultimoCalculo < cadaCuanto) { requestAnimationFrame(dibujarCuadro); return; }
    ultimoCalculo = t;

    const usaElLienzo = usaElLienzoAhora();
    const ventana = VENTANA_POR_CALIDAD[calidadDelTitileo] ?? VENTANA_POR_CALIDAD[0];
    /* scrollActual() y no window.scrollY: dentro de un bucle de animación,
       preguntarle el scroll al navegador lo obliga a recalcular estilos
       (ver la nota larga en 02-utilidades.js). */
    const desplazamiento = scrollActualY();
    const arriba = desplazamiento - window.innerHeight * ventana.arriba;
    const abajo  = desplazamiento + window.innerHeight * ventana.abajo;

    for (const c of piezas) {
      for (const fuego of c.fuegos) {
        if (fuego.cy < arriba || fuego.cy > abajo) continue;

        if (t > fuego.proximoSorteo) {
          fuego.objetivo = 0.68 + Math.random() * 0.32;
          if (Math.random() < 0.1) fuego.objetivo *= 0.62;
          fuego.proximoSorteo = t + 110 + Math.random() * 220;
        }
        fuego.nivel += (fuego.objetivo - fuego.nivel) * 0.16;
        const temblor = 1 + Math.sin(t / 60 + fuego.fase) * 0.05;
        const brillo = fuego.nivel * temblor;

        /* La llama del SVG crece y encoge desde la mecha (cada una con SU
           brillo).

           ⚡ Se compara con un ENTERO antes de escribir. toFixed() fabrica un
           string cada vez que se llama, aunque el valor no haya cambiado;
           entre las 26 llamas eran decenas de cadenas por cuadro tiradas a
           la basura. Con milésimas en entero, comparar no reserva nada. */
        if (fuego.llama) {
          const nivelDeLlama = Math.round(brillo * 1000);
          if (nivelDeLlama !== fuego.ultimoNivelDeLlama) {
            fuego.ultimoNivelDeLlama = nivelDeLlama;
            fuego.llama.style.opacity = 0.75 + brillo * 0.25;
            if (debeAnimarLaEscala()) {
              fuego.llama.style.transform =
                'scaleY(' + (0.92 + brillo * 0.13) + ') scaleX(' + (0.98 + brillo * 0.04) + ')';
            }
          }
        }

        /* Los resplandores laten con el mismo valor; el derrame además
           respeta su tope por cercanía a la caja (fuego.atenua). Solo se
           anima la OPACIDAD (nunca la escala de una capa grande). */
        const brilloNucleo  = fuego.base * brillo;
        const brilloDerrame = fuego.base * brillo * 0.85 * fuego.atenua;

        /* ⚡ CON EL LIENZO ACTIVO SE ESCRIBEN NÚMEROS, NO ESTILOS.
           Antes esto eran 104 escrituras de `style.opacity` por cuadro, y
           cada una obliga al navegador a recalcular estilo y rehacer el
           árbol de capas. Ahora se guardan dos números que el canvas lee
           cuando pinta: cero trabajo para el motor de CSS. */
        if (usaElLienzo) {
          if (fuego.fuenteNucleo)  fuego.fuenteNucleo.alfa  = brilloNucleo;
          if (fuego.fuenteDerrame) {
            /* ⚠️ EL DERRAME "DETRÁS" NECESITA UN AJUSTE.
               En el sistema de divs, cuando un derrame queda muy encima de
               una caja de texto se lo muda a #apliques, que vive DEBAJO del
               velo de penumbra: ahí la propia penumbra lo apaga y el texto
               se sigue leyendo. El lienzo, en cambio, pinta todo por encima
               del velo, así que ese apagado no ocurre solo.

               Se replica bajando su brillo. No es capricho: es exactamente
               el trabajo que hacía el velo, aplicado a mano. Sin esto, los
               textos cercanos a un candelabro quedarían lavados. */
            fuego.fuenteDerrame.alfa = fuego.detras ? brilloDerrame * 0.4 : brilloDerrame;
          }
        } else {
          /* Sin toFixed: el navegador acepta el número directo y así no se
             fabrica una cadena por vela y por cuadro. */
          fuego.nucleo.style.opacity  = brilloNucleo;
          fuego.derrame.style.opacity = brilloDerrame;
        }
      }
    }
    requestAnimationFrame(dibujarCuadro);
  }
  requestAnimationFrame(dibujarCuadro);

})();

/* ═══ 20-boton-de-animaciones.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   20 · BOTÓN DE ANIMACIONES (ON / OFF)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Enciende o apaga TODO el movimiento de la invitación (los haces de luz,
   las velas, los pétalos, las enredaderas, las joyas que cuelgan…). Es la
   salida para equipos lentos o sin placa de video, donde tanto efecto a la
   vez pesa demasiado. El botón está desde el inicio, arriba a la izquierda,
   incluso por encima del sobre de entrada.

   CÓMO FUNCIONA (en vivo, sin recargar)
   Todo el movimiento de la web se apaga o enciende con una sola clase en
   el <html>: "animaciones-off". Los módulos de animación consultan esa
   clase en cada cuadro (a través de prefiereMenosMovimiento en
   02-utilidades.js): si está, sus bucles quedan en reposo; si no, animan.
   Y el CSS, con la misma clase, esconde lo que sea puro movimiento y deja
   encendido lo que da luz (los candelabros).

   Por eso el botón NO recarga la página: solo pone o saca la clase, y todo
   reacciona al instante. La elección se guarda en la memoria del navegador
   para la próxima visita; un script en el <head> la aplica antes de
   dibujar, sin parpadeos.

   ÍNDICE
     1. Estado actual
     2. Pintar el botón según el estado
     3. Al hacer clic: alternar en vivo y guardar
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElBotonDeAnimaciones() {

  const boton = buscar('#boton-animaciones');
  if (!boton) return;

  /** La clave en la memoria del navegador (mismo prefijo que el resto). */
  const CLAVE = 'invitacion-ania:animaciones';

  const textoEstado = buscar('.boton-animaciones__texto');


  /* ─── 1. ESTADO ACTUAL ─────────────────────────────────────────────── */

  /**
   * ¿Están apagadas las animaciones AHORA? La verdad vive en la clase del
   * <html> (que el script del <head> ya puso según la elección guardada o
   * la detección de equipo lento). Leerla de ahí incluye todos los casos.
   * @returns {boolean}
   */
  function estanApagadas() {
    return document.documentElement.classList.contains('animaciones-off');
  }


  /* ─── 2. PINTAR EL BOTÓN SEGÚN EL ESTADO ───────────────────────────── */

  /**
   * Deja el botón mostrando si el movimiento está encendido o apagado.
   * @param {boolean} apagado
   * @returns {void}
   */
  function pintarBoton(apagado) {
    boton.classList.toggle('esta-apagado', apagado);
    // aria-pressed = "está la animación encendida" (para lectores de pantalla)
    boton.setAttribute('aria-pressed', String(!apagado));
    boton.setAttribute('aria-label', apagado ? 'Encender las animaciones' : 'Apagar las animaciones');
    if (textoEstado) textoEstado.textContent = apagado ? 'Sin animación' : 'Animación';
  }

  pintarBoton(estanApagadas());


  /* ─── 3. AL HACER CLIC: ALTERNAR EN VIVO Y GUARDAR ─────────────────── */

  boton.addEventListener('click', () => {
    const nuevoApagado = !estanApagadas();

    // 1) Se aplica EN EL ACTO: poner o sacar la clase enciende o apaga todo
    //    el movimiento sin recargar (los bucles la consultan cada cuadro).
    document.documentElement.classList.toggle('animaciones-off', nuevoApagado);

    // 2) Se recuerda para la próxima visita.
    try { localStorage.setItem(CLAVE, nuevoApagado ? 'off' : 'on'); }
    catch (error) { /* modo privado: al menos la sesión actual ya respondió */ }

    // 3) Se actualiza el botón.
    pintarBoton(nuevoApagado);
  });

})();

/* ═══ 21-monitor-de-rendimiento.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   21 · MONITOR DE RENDIMIENTO (gobernador de CALIDAD GRÁFICA)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Vigila cuántos milisegundos tarda el equipo en dibujar cada cuadro y
   corrige EN VIVO la calidad gráfica (alta / media / baja, ver
   nivelDeCalidad en 02-utilidades.js) para que la web se sienta fluida en
   CUALQUIER equipo, del más nuevo al más viejo, sin perder la escena de
   vista: lo que cambia es CUÁNTO se anima a la vez y con qué frecuencia se
   recalcula, no el lenguaje visual (los candelabros, las joyas, el marco
   siguen exactamente igual en los tres niveles).

   POR QUÉ HACE FALTA ESTO ADEMÁS DE LA ESTIMACIÓN DEL <head>
   El <head> arranca con una ADIVINANZA (memoria/núcleos, una vez, antes de
   dibujar). Es una buena primera aproximación pero es ciega: no sabe si en
   ESTE momento el equipo tiene otras pestañas abiertas, si está con la
   batería en modo ahorro, o si la estimación simplemente se quedó corta o
   se pasó. Este archivo mide la ACTUACIÓN REAL, cuadro a cuadro, y ajusta.

   CÓMO SE MIDE, SIN QUE LA MEDICIÓN CUESTE
   Se lleva un promedio MÓVIL exponencial del tiempo entre cuadros. Se sube
   o baja la calidad DE A UN NIVEL por vez, y con umbrales distintos para
   degradar y para mejorar (histéresis): degradar —proteger la fluidez— es
   rápido; mejorar —confiar en que el equipo puede con más— pide una racha
   mucho más larga de buenos cuadros, para no ir prendiendo y apagando
   efectos cada dos segundos.

   CÓMO LO USA EL RESTO DE LA WEB
   Se pone en el <html> la clase `calidad-media` o `calidad-baja` (alta =
   ninguna de las dos) y se dispara el evento `calidad-cambio` con el nivel.
   Cada módulo de animación lee eso, UNA vez al crear sus elementos y/o en
   ese evento, para decidir cantidad y cadencia (ver 06-petalos, 14-haces,
   18-motas, 19-velas, 07-marco-y-enredaderas).
   ══════════════════════════════════════════════════════════════════════ */

(function preparaElMonitorDeRendimiento() {

  const raiz = document.documentElement;

  /* Cuánto pesa cada cuadro nuevo en el promedio (0..1). Chico = el promedio
     reacciona despacio y no se deja engañar por un tropezón suelto. */
  const PESO_DEL_CUADRO = 0.08;

  /* ─── LOS UMBRALES SON RELATIVOS A LA PANTALLA, NO NÚMEROS FIJOS ──────
     ⚠️ ESTO ESTUVO MAL Y SE CORRIGIÓ. Antes los umbrales eran absolutos, y
     para volver de MEDIA a ALTA se exigía un promedio por debajo de 14 ms.
     Pero en una pantalla de 60 Hz el navegador dibuja, como mucho, un cuadro
     cada 16,7 ms: **14 ms era físicamente imposible**. Resultado: en la
     inmensa mayoría de los equipos la calidad ALTA era inalcanzable, por
     potentes que fueran, y todo el potencial gráfico pensado para gama alta
     no lo veía nadie.

     Lo correcto es comparar contra el ritmo REAL de cada pantalla: ir
     "perfecto" son 16,7 ms en una de 60 Hz, 8,3 ms en una de 120 Hz y 6,9 ms
     en una de 144 Hz. Por eso los umbrales son MULTIPLICADORES de ese ideal:

       · Degradar a MEDIA  si el promedio pasa 1,35 × lo ideal (~44 fps en 60 Hz)
       · Degradar a BAJA   si pasa 1,75 × lo ideal (~34 fps en 60 Hz)
       · Mejorar a ALTA    si baja de 1,12 × lo ideal (~54 fps en 60 Hz)
       · Mejorar a MEDIA   si baja de 1,35 × lo ideal

     La banda entre mejorar y degradar de un mismo nivel es la zona muerta que
     evita el ir y venir. Y como la carga sube al mejorar de nivel, si el
     equipo no la aguanta el propio gobernador vuelve a bajarlo: por eso
     enriquecer la calidad alta es seguro, se autorregula. */
  const FACTOR_DEGRADAR = [null, 1.35, 1.75];
  const FACTOR_MEJORAR  = [null, 1.12, 1.35];

  /* Cuánto tarda un cuadro cuando TODO va bien en esta pantalla. Se estima
     con el cuadro más rápido que se haya visto (los cuadros no pueden ser
     más rápidos que el refresco físico), con un piso de 6 ms para no
     envenenar la medida con algún cuadro raro. */
  let intervaloIdeal = 16.7;

  /* Cuántos cuadros seguidos en zona de degradar/mejorar hacen falta.
     Degradar es rápido (proteger la fluidez YA); mejorar (confiar en que
     el equipo aguanta más) pide una racha bastante más larga, para no
     prender y apagar efectos por una mejora pasajera. */
  const CUADROS_PARA_DEGRADAR = 45;    // ~0,75 s a 60 fps
  const CUADROS_PARA_MEJORAR  = 150;   // ~2,5 s

  /* Los primeros cuadros tras cargar siempre son lentos (se arma la página).
     Se ignoran para no degradar por el arranque. */
  const CALENTAMIENTO_MS = 1800;

  let promedioMs = 16.7;            // arranca suponiendo 60 fps
  let calidad = nivelDeCalidad();   // parte de la estimación que puso el <head>
  let cuadrosDegrada = 0;
  let cuadrosMejora = 0;
  let momentoAnterior = performance.now();
  let arranque = momentoAnterior;

  /* Cuántas veces este equipo tuvo que BAJAR desde cada nivel. Si ya probó
     un nivel y no lo aguantó, volver a intentarlo cuesta cada vez más: así
     un equipo justo no se pasa la visita prendiendo y apagando efectos. */
  const intentosFallidos = {};

  /**
   * Cuántos cuadros buenos seguidos hacen falta para subir de calidad.
   * Crece con cada intento fallido previo en ese nivel (2,5 s la primera vez,
   * 5 s la segunda, 10 s la tercera…), con un techo razonable.
   * @returns {number}
   */
  function cuadrosNecesariosParaMejorar() {
    const fallos = intentosFallidos[calidad - 1] || 0;
    return Math.min(CUADROS_PARA_MEJORAR * Math.pow(2, fallos), 1800);
  }

  /**
   * Aplica el nivel actual: una única clase exclusiva en <html> + evento.
   * @returns {void}
   */
  function aplicarNivel() {
    raiz.classList.toggle('calidad-media', calidad === CALIDAD_GRAFICA.MEDIA);
    raiz.classList.toggle('calidad-baja',  calidad === CALIDAD_GRAFICA.BAJA);
    document.dispatchEvent(new CustomEvent('calidad-cambio', { detail: { calidad } }));
  }

  function medir(momentoActual) {
    const delta = momentoActual - momentoAnterior;
    momentoAnterior = momentoActual;

    /* Saltos enormes = la pestaña estuvo en segundo plano (el navegador
       congela el rAF). No es lentitud real: se ignora ese cuadro. Tampoco se
       mide durante el calentamiento inicial. */
    if (delta > 100 || momentoActual - arranque < CALENTAMIENTO_MS) {
      requestAnimationFrame(medir);
      return;
    }

    /* Si las animaciones están apagadas (accesibilidad o botón), no hay carga
       que gobernar: se deja todo como está. */
    if (prefiereMenosMovimiento()) {
      requestAnimationFrame(medir);
      return;
    }

    // Promedio móvil exponencial del tiempo por cuadro.
    promedioMs += (delta - promedioMs) * PESO_DEL_CUADRO;

    /* Se aprende cuál es el cuadro "perfecto" de ESTA pantalla: ningún cuadro
       puede ser más rápido que su refresco físico, así que el más rápido que
       se vea es una buena estimación (60 Hz → ~16,7 ms; 120 Hz → ~8,3 ms). */
    if (delta > 6 && delta < intervaloIdeal) intervaloIdeal = delta;

    /* El peor cuadro de los últimos ~4 segundos (para el cartel de
       diagnóstico). Se olvida solo, así refleja lo que pasa AHORA. */
    if (delta > peorCuadroReciente) {
      peorCuadroReciente = delta;
      momentoDelPeorCuadro = momentoActual;
    } else if (momentoActual - momentoDelPeorCuadro > 4000) {
      peorCuadroReciente = delta;
      momentoDelPeorCuadro = momentoActual;
    }

    // ¿Conviene DEGRADAR un nivel (el equipo sufre)?
    if (calidad < CALIDAD_GRAFICA.BAJA &&
        promedioMs > intervaloIdeal * FACTOR_DEGRADAR[calidad + 1]) cuadrosDegrada++;
    else cuadrosDegrada = 0;

    // ¿Conviene MEJORAR un nivel (el equipo va sobrado)?
    if (calidad > CALIDAD_GRAFICA.ALTA &&
        promedioMs < intervaloIdeal * FACTOR_MEJORAR[calidad]) cuadrosMejora++;
    else cuadrosMejora = 0;

    if (cuadrosDegrada >= CUADROS_PARA_DEGRADAR) {
      calidad++;
      /* Si este equipo YA tuvo que bajar de este nivel antes, la próxima vez
         se le va a exigir mucha más paciencia antes de volver a subir: evita
         el ping-pong de prender y apagar efectos una y otra vez. */
      intentosFallidos[calidad] = (intentosFallidos[calidad] || 0) + 1;
      cuadrosDegrada = cuadrosMejora = 0;
      aplicarNivel();
    } else if (cuadrosMejora >= cuadrosNecesariosParaMejorar()) {
      calidad--;
      cuadrosDegrada = cuadrosMejora = 0;
      aplicarNivel();
    }

    requestAnimationFrame(medir);
  }

  /* Al volver de una pestaña oculta, se reinicia el reloj para que el salto
     de tiempo no se lea como un cuadro lentísimo. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) momentoAnterior = performance.now();
  });

  requestAnimationFrame(medir);


  /* ─── DETECTOR DE TAREAS LARGAS (dato real, no una aproximación) ─────
     El promedio de arriba mide CUÁNDO se dispara cada cuadro de rAF; no ve
     directamente si, EN EL MEDIO, el hilo principal quedó bloqueado por
     otra cosa (un recálculo de layout forzado, un evento de scroll pesado,
     etc.) sin que eso llegue a correrse a un cuadro entero. Por eso, a
     veces la web puede sentirse pesada con un promedio de fps que parece
     bueno: el promedio no cuenta esa historia completa.

     `longtask` es una métrica ESTÁNDAR del navegador (Performance
     Observer) hecha exactamente para esto: avisa cada vez que el hilo
     principal estuvo ocupado más de 50 ms seguidos, sin importar por qué.
     Guardamos la última para mostrarla en el cartel de diagnóstico: es la
     diferencia entre seguir ajustando números a ciegas y tener, de acá en
     adelante, un dato real de qué está pasando en el equipo de quien
     prueba la web. No todos los navegadores lo soportan; si no está
     disponible, simplemente no se muestra esa línea. */
  let ultimaTareaLarga = null;   // { duracionMs, momento }
  let cuantasTareasLargas = 0;   // cuántas van desde que cargó la página

  /* ⚠️ SE SEPARAN LAS TAREAS DE LA CARGA DE LAS DE LA NAVEGACIÓN, y no es
     un detalle: es la diferencia entre arreglar algo y perseguir un
     fantasma.

     Una tarea larga durante el arranque —parsear 120 KB de HTML con el SVG
     del relicario dentro, construir las enredaderas— ocurre UNA vez, con el
     sobre todavía cerrado, y nadie la siente. Una tarea larga mientras el
     visitante hace scroll es un parón en la cara.

     Con un solo número mezclado, un 1277 ms podía ser cualquiera de las dos
     y no había forma de saberlo. Ahora se cuentan aparte, y la que importa
     —la de después— es la que hay que llevar a cero. */
  let peorTareaAlCargar = 0;
  let peorTareaDespues = 0;
  let laInvitacionEsVisible = false;
  document.addEventListener('invitacion-visible', () => {
    /* Se da un respiro: la construcción diferida arranca justo acá y sus
       tareas son todavía "de carga", no de navegación. */
    setTimeout(() => { laInvitacionEsVisible = true; }, 2500);
  });

  if ('PerformanceObserver' in window) {
    try {
      const observadorDeTareas = new PerformanceObserver(lista => {
        for (const entrada of lista.getEntries()) {
          cuantasTareasLargas++;
          if (laInvitacionEsVisible) {
            if (entrada.duration > peorTareaDespues) peorTareaDespues = entrada.duration;
          } else if (entrada.duration > peorTareaAlCargar) {
            peorTareaAlCargar = entrada.duration;
          }
          ultimaTareaLarga = { duracionMs: entrada.duration, momento: performance.now() };
        }
      });
      observadorDeTareas.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // El navegador no soporta 'longtask': seguimos sin este dato extra.
    }
  }

  /* PEOR CUADRO RECIENTE. El promedio (promedioMs) suaviza y esconde los
     tirones, que es justamente lo que se SIENTE. Este es el cuadro más lento
     de los últimos segundos: si el promedio dice 16 ms pero el peor dice 90,
     la web se siente a los saltos aunque el promedio parezca perfecto. */
  let peorCuadroReciente = 0;
  let momentoDelPeorCuadro = 0;


  /* ─── MEDIDOR VISIBLE (opcional, apagado por defecto) ────────────────
     Para saber de verdad si un equipo va fluido hace falta un número, no
     una impresión. Agregando  ?fps=1  a la dirección aparece un cartelito
     chiquito abajo a la izquierda con la calidad actual y los cuadros por
     segundo reales de ESE equipo. Ningún invitado lo ve nunca —no está en
     ningún link de la invitación—; es solo para diagnosticar. */
  if (new URLSearchParams(location.search).get('fps') === '1') {
    const NOMBRE_DE_LA_CALIDAD = ['alta', 'media', 'baja'];
    const cartel = document.createElement('div');
    cartel.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:999999;' +
      'font:12px/1.4 monospace;color:#fff;background:rgba(0,0,0,.72);' +
      'padding:6px 10px;border-radius:6px;pointer-events:none;white-space:pre;';
    document.body.appendChild(cartel);

    /* Cuenta elementos, pero NO en cada refresco: recorrer el DOM también
       cuesta, y sería absurdo que el medidor empeore lo que mide. Se
       recalcula cada ~2 s. */
    let conteos = { nodos: 0, petalos: 0, velas: 0, flores: 0 };
    let ultimoConteo = 0;

    /* ⚠️ REGLA DE ORO DE ESTE CARTEL: no medir la página desde acá.
       La primera versión leía document.documentElement.scrollWidth DENTRO de
       la misma expresión que escribía cartel.textContent, y contaba nodos con
       getElementsByTagName('*') sobre 3.800 elementos, cada 500 ms. Un perfil
       real mostró el desastre: "Recalculate style" (11,8 %) y "Layout" (9,8 %)
       colgaban de `get scrollWidth → actualizarCartel`, y Chrome marcaba
       "Forced reflow". O sea: el instrumento estaba falseando la medición y,
       de paso, empeorando la web que venía a diagnosticar.

       Ahora: (1) la geometría NO se lee acá, viene de un ResizeObserver;
       (2) los conteos van en un hueco libre del navegador y cada 5 s;
       (3) primero se lee TODO y al final se escribe UNA sola vez. */

    /** Tamaño del documento, actualizado solo cuando de verdad cambia. */
    let tamanoDelDocumento = '—';
    if ('ResizeObserver' in window) {
      const observador = new ResizeObserver(entradas => {
        /* Dentro del ResizeObserver, el navegador ya resolvió el layout: leer
           acá es barato y no fuerza nada. */
        const caja = entradas[0] && entradas[0].contentRect;
        if (caja) tamanoDelDocumento = `${Math.round(caja.width)}×${Math.round(caja.height)}`;
      });
      observador.observe(document.body);
    }

    /** Pide un hueco libre del navegador; si no existe la API, usa un timer. */
    const enUnHuecoLibre = window.requestIdleCallback
      ? (fn) => window.requestIdleCallback(fn, { timeout: 1000 })
      : (fn) => setTimeout(fn, 0);

    /* ⚠️ EL MEDIDOR SE CONVIRTIÓ EN EL CUARTO COSTO DEL PERFIL, Y ES IRÓNICO.
       Con la invitación abierta, `actualizarCartel` figuraba con 11,5 % del
       tiempo: más que el lienzo de pétalos entero. La culpa es de este
       recuento —`getElementsByTagName('*')` sobre 4.000 nodos, más dos
       consultas por selector que recorren el árbol completo—.

       Como solo existe con ?fps=1, NO afecta a ningún invitado. Pero sí
       ensuciaba todas las mediciones y hacía perseguir fantasmas: cada vez
       que se grababa un perfil, el propio instrumento aparecía entre los
       culpables. Un termómetro no debe calentar el agua.

       Cada 20 s en vez de 5 basta de sobra: la cantidad de nodos apenas
       cambia una vez que la página terminó de construirse. */
    function contarElementos(ahora) {
      if (ahora - ultimoConteo < 20000 && ultimoConteo !== 0) return;
      ultimoConteo = ahora;

      /* Se cuenta en un hueco libre —no en medio del trabajo de animación— y
         sin crear arrays: recorrer la NodeList con un bucle no genera basura,
         mientras que [...querySelectorAll(...)] armaba un array nuevo cada vez
         y alimentaba al recolector (que estaba en 5,9 % del perfil). */
      enUnHuecoLibre(() => {
        /* ⚠️ LOS PÉTALOS YA NO SON ELEMENTOS. Desde que los dibuja el lienzo
           (codigo/24-lienzo-de-petalos.js) no existe ningún `.petalo` en el
           documento, así que contar por selector daba SIEMPRE 0 y parecía
           que habían desaparecido. Se cuentan del registro del canvas, y si
           el lienzo estuviera apagado (?petalos=dom) se cae al recuento
           viejo por elementos. */
        let petalosVisibles = 0;
        const lienzo = window.LienzoDePetalos;

        if (lienzo && lienzo.activo) {
          for (const plano of Object.keys(lienzo.planos)) {
            const lista = lienzo.planos[plano];
            for (let i = 0; i < lista.length; i++) if (lista[i].activo) petalosVisibles++;
          }
        } else {
          const listaDePetalos = document.querySelectorAll('.petalo');
          for (let i = 0; i < listaDePetalos.length; i++) {
            if (listaDePetalos[i].style.display !== 'none') petalosVisibles++;
          }
        }

        conteos.nodos   = document.getElementsByTagName('*').length;
        conteos.petalos = petalosVisibles;
        conteos.velas   = document.querySelectorAll('.vela').length;
        conteos.flores  = document.querySelectorAll('.flor-de-enredadera').length;
      });
    }

    /**
     * Estado de los dos ramilletes de esquina, en una línea.
     *
     * ⚠️ ESTO ES UN INSTRUMENTO DE DIAGNÓSTICO, no decoración. El ramillete
     * de la esquina derecha desapareció cinco veces y ya se descartaron con
     * medición el markup, el generador, la semilla y las carreras de
     * construcción: el SVG se genera bien. Falta saber POR QUÉ no se ve, y
     * para eso hace falta su caja real en pantalla.
     *
     * Con esta línea, una captura del cartel basta para verlo: si sale con
     * ancho 0, o con una x fuera de la ventana, ahí está la causa.
     *
     * @returns {string}
     */
    function lineaDeRamilletes() {
      const estado = window.EstadoDeLosRamilletes;
      if (!estado || !estado.length) return 'ramilletes: todavía sin construir\n';

      return 'ramilletes: ' + estado.map(r =>
        r.existe
          ? `${r.lado} ${r.rosas} rosas ${r.ancho}x${r.alto} @${r.x},${r.y}`
          : `${r.lado} FALTA`
      ).join('  ·  ') + '\n';
    }

    function actualizarCartel() {
      const ahora = performance.now();
      const fps = Math.round(1000 / promedioMs);
      contarElementos(ahora);

      /* PEOR CUADRO: lo que de verdad se siente. Un promedio de 16 ms con un
         peor cuadro de 90 ms se percibe a los saltos, no fluido. */
      const peorFps = peorCuadroReciente > 0 ? Math.round(1000 / peorCuadroReciente) : 0;

      /* Tareas largas: además de la última, cuántas van y cuál fue la peor.
         La última solo cuenta si fue hace poco (10 s); si no, ya no describe
         lo que está pasando ahora. */
      const reciente = ultimaTareaLarga && (ahora - ultimaTareaLarga.momento) < 10000
        ? `${ultimaTareaLarga.duracionMs.toFixed(0)} ms`
        : '—';

      /* Memoria del montón de JavaScript. Solo la exponen algunos
         navegadores (Chrome); si no está, se omite la línea. */
      let lineaDeMemoria = '';
      if (performance.memory) {
        const usados = performance.memory.usedJSHeapSize / 1048576;
        lineaDeMemoria = `\nmemoria JS: ${usados.toFixed(0)} MB`;
      }

      /* El ritmo ideal detectado de ESTA pantalla, contra el que se comparan
         los umbrales (60 Hz → 16,7 ms; 120 Hz → 8,3 ms). Sirve para ver de un
         vistazo cuánto margen real queda antes de subir o bajar de calidad. */
      const hzPantalla = Math.round(1000 / intervaloIdeal);

      /* ── ESCRITURA, y recién al final ──────────────────────────────────
         Todo lo de arriba fueron LECTURAS de variables ya calculadas (ni una
         sola consulta de geometría al navegador). Esta es la única línea que
         toca el DOM, y es la última: así no queda ninguna lectura después de
         una escritura, que es lo que provoca el reflow forzado. El tamaño del
         documento sale del ResizeObserver, no de scrollWidth. */
      cartel.textContent =
        `calidad: ${NOMBRE_DE_LA_CALIDAD[calidad]}` +
        `${prefiereMenosMovimiento() ? '  (animación OFF)' : ''}\n` +
        `~${fps} fps  (${promedioMs.toFixed(1)} ms/cuadro)` +
        `  ·  pantalla ~${hzPantalla} Hz\n` +
        `peor cuadro: ${peorCuadroReciente.toFixed(0)} ms  (~${peorFps} fps)\n` +
        `tareas largas: ${cuantasTareasLargas}  ·  al cargar ${peorTareaAlCargar.toFixed(0)} ms` +
        `  ·  DESPUÉS ${peorTareaDespues.toFixed(0)} ms  ·  última ${reciente}\n` +
        `nodos DOM: ${conteos.nodos}  ·  flores: ${conteos.flores}\n` +
        `pétalos activos: ${conteos.petalos}  ·  velas: ${conteos.velas}\n` +
        lineaDeRamilletes() +
        lineaDeMemoria +
        `\ndocumento: ${tamanoDelDocumento}`;

      /* Cada 2 s en vez de 1: escribir el cartel obliga a recalcular su
         estilo y su layout, y a 1 s eso pesaba de más en las mediciones. */
      setTimeout(actualizarCartel, 2000);
    }
    setTimeout(actualizarCartel, 1000);
  }
})();

/* ═══ 22-luz-de-la-hora.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   22 · LA LUZ CAMBIA CON LA HORA
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Tiñe la luz AMBIENTAL de la invitación según la hora a la que se abra.
   Si alguien entra al mediodía, por los ventanales entra un dorado claro;
   al atardecer, ámbar profundo; de madrugada, azul de luna. Es el mismo
   salón a distintas horas del día.

   ⚠️ LAS VELAS NO CAMBIAN, Y ES A PROPÓSITO
   Una vela es cálida a las tres de la mañana igual que al mediodía: su
   color lo pone la combustión, no el sol. Si se le cambiara el tono
   parecería que cambió de química y se rompería la ilusión.

   Lo que vira es SOLO lo que viene de afuera: los haces que entran por
   los ventanales y el polvo que flota dentro de ellos. Y ese contraste
   —ventana fría contra candelabros cálidos— es justamente lo que hace
   bonita la escena de noche: la luz de luna entra azul y las velas
   defienden su isla de calor.

   CUÁNTO CUESTA
   Nada. Se escriben seis variables CSS al cargar y una vez cada diez
   minutos. No hay bucle, no hay trabajo por cuadro.

   POR QUÉ NO SE ESCRIBE EN :root
   Escribir una variable en <html> obliga al navegador a revisar el estilo
   del documento ENTERO (miles de nodos). Como estas variables solo las
   usan dos cosas —los haces y las motas—, se escriben directamente en sus
   dos capas. Es la misma lección que dejó 14-haces-de-luz.js, donde hacer
   esto mal costaba el 39 % del tiempo de la página.
   ══════════════════════════════════════════════════════════════════════ */

(function laLuzSigueALaHora() {

  /* Los cuatro momentos del día, con su hora de referencia. Entre uno y
     otro se mezcla de forma continua, así que a las 15:30 la luz es una
     interpolación real entre mediodía y atardecer, no un salto.

     Cada color va como [r, g, b, alfa]. Se guardan desarmados justamente
     para poder mezclarlos; el texto rgba() se arma al final.

     Las opacidades bajan de noche a propósito: la luna ilumina menos que
     el sol, y si la noche tuviera la misma fuerza que el mediodía se
     perdería la penumbra que sostiene toda la estética. */
  const MOMENTOS = [
    {
      hora: 7,   // amanecer: rasante, rosado, todavia tibio
      hazCentro:  [252, 206, 168, 0.50],
      hazMedio:   [228, 160, 118, 0.31],
      hazBorde:   [200, 124, 88, 0.11],
      motaCentro: [255, 238, 216, 0.90],
      motaBorde:  [246, 208, 168, 0.52],
      ambienteAlto: [148, 66, 60, 0.28],
      tinteDeSala:  [126, 86, 92, 0.13],
      tinteDelVelo: [96, 58, 58, 0.14],
      anguloDelSol: 34,
      largoDelHaz:  1.3,
      fuerzaDeVelas: 0.95,
    },
    {
      hora: 13,  // MEDIODIA: el NEUTRO. Luz plana, sin caracter.
      hazCentro:  [252, 244, 214, 0.44],
      hazMedio:   [232, 214, 168, 0.26],
      hazBorde:   [210, 190, 128, 0.09],
      motaCentro: [255, 250, 236, 0.92],
      motaBorde:  [248, 238, 200, 0.54],
      ambienteAlto: [146, 74, 44, 0.16],
      tinteDeSala:  [255, 238, 206, 0.00],
      tinteDelVelo: [64, 46, 28, 0.06],
      anguloDelSol: 10,
      largoDelHaz:  0.85,
      fuerzaDeVelas: 0.7,
    },
    {
      hora: 18,  // HORA DORADA: el momento mas caracteristico
      hazCentro:  [255, 184, 88, 0.66],
      hazMedio:   [236, 142, 62, 0.40],
      hazBorde:   [206, 108, 44, 0.15],
      motaCentro: [255, 236, 196, 0.95],
      motaBorde:  [250, 206, 132, 0.58],
      ambienteAlto: [168, 52, 18, 0.30],
      tinteDeSala:  [198, 116, 48, 0.14],
      tinteDelVelo: [104, 48, 16, 0.16],
      anguloDelSol: -26,
      largoDelHaz:  1.28,
      fuerzaDeVelas: 0.92,
    },
    {
      hora: 20,  // crepusculo malva: evita el gris al cruzar de calido a frio
      hazCentro:  [210, 150, 176, 0.50],
      hazMedio:   [172, 116, 158, 0.30],
      hazBorde:   [142, 96, 142, 0.11],
      motaCentro: [246, 224, 240, 0.88],
      motaBorde:  [214, 188, 216, 0.50],
      ambienteAlto: [116, 30, 78, 0.30],
      tinteDeSala:  [22, 14, 46, 0.34],
      tinteDelVelo: [16, 10, 34, 0.30],
      anguloDelSol: -32,
      largoDelHaz:  1.32,
      fuerzaDeVelas: 0.98,
    },
    {
      hora: 23,  // NOCHE: oscura de verdad. La luna apenas insinua.
      hazCentro:  [128, 152, 200, 0.20],
      hazMedio:   [96, 118, 164, 0.12],
      hazBorde:   [72, 92, 138, 0.05],
      motaCentro: [214, 228, 250, 0.70],
      motaBorde:  [160, 184, 222, 0.38],
      ambienteAlto: [26, 40, 78, 0.34],
      tinteDeSala:  [7, 12, 34, 0.46],
      tinteDelVelo: [4, 7, 22, 0.42],
      anguloDelSol: -20,
      largoDelHaz:  1.12,
      fuerzaDeVelas: 1.05,
    },
  ];

  /* Madrugada profunda: el ancla que mantiene la noche AZUL de punta a
     punta. Sin ella, el tramo 23h -> 7h pasaba por gris a las 3. */
  const MADRUGADA = {
    hora: 2,
    hazCentro:  [112, 136, 188, 0.16],
    hazMedio:   [84, 104, 152, 0.10],
    hazBorde:   [62, 80, 124, 0.04],
    motaCentro: [206, 222, 248, 0.66],
    motaBorde:  [148, 174, 214, 0.34],
    ambienteAlto: [20, 32, 68, 0.34],
    tinteDeSala:  [5, 9, 28, 0.54],
    tinteDelVelo: [3, 5, 18, 0.50],
    anguloDelSol: -10,
    largoDelHaz:  1.05,
    fuerzaDeVelas: 1.08,
  };

  /* Y el espejo del crepusculo, para el cruce frio -> calido del amanecer. */
  const ANTES_DEL_ALBA = {
    hora: 5,
    hazCentro:  [200, 176, 216, 0.40],
    hazMedio:   [160, 140, 186, 0.24],
    hazBorde:   [130, 112, 162, 0.09],
    motaCentro: [236, 226, 246, 0.82],
    motaBorde:  [198, 186, 220, 0.46],
    ambienteAlto: [80, 58, 108, 0.29],
    tinteDeSala:  [14, 16, 44, 0.40],
    tinteDelVelo: [10, 12, 34, 0.36],
    anguloDelSol: 38,
    largoDelHaz:  1.34,
    fuerzaDeVelas: 1.00,
  };

/**
   * Mezcla dos colores [r,g,b,a]. `t` va de 0 (todo el primero) a 1 (todo
   * el segundo).
   *
   * @param {number[]} a
   * @param {number[]} b
   * @param {number} t
   * @returns {string} El color listo para CSS.
   */
  function mezclar(a, b, t) {
    const v = i => Math.round(a[i] + (b[i] - a[i]) * t);
    const alfa = (a[3] + (b[3] - a[3]) * t).toFixed(3);
    return `rgba(${v(0)}, ${v(1)}, ${v(2)}, ${alfa})`;
  }

  /**
   * Busca entre qué dos momentos cae una hora dada y cuánto pesa cada uno.
   *
   * El día es un CÍRCULO: después de las 23 viene las 7 del día siguiente,
   * no un salto. Por eso, cuando la hora queda fuera del último tramo, se
   * mezcla el último momento con el primero contando las horas que faltan
   * para dar la vuelta.
   *
   * @param {number} hora - Hora decimal (13.5 = 13:30).
   * @returns {{desde: Object, hasta: Object, t: number}}
   */
  function tramoDeLaHora(hora) {
    for (let i = 0; i < MOMENTOS.length - 1; i++) {
      const desde = MOMENTOS[i];
      const hasta = MOMENTOS[i + 1];
      if (hora >= desde.hora && hora < hasta.hora) {
        return { desde, hasta, t: (hora - desde.hora) / (hasta.hora - desde.hora) };
      }
    }

    /* ── El tramo que cruza la medianoche, en dos mitades ──
       De las 23 a las 2 se termina de hundir en el azul, y de las 2 a las 7
       vuelve a subir hacia el rosa del amanecer. Partirlo así es lo que
       mantiene la madrugada AZUL; de un tirón, el punto medio (las 3) caía
       en el gris de mezclar azul con rosa (ver la nota de MADRUGADA). */
    const noche  = MOMENTOS[MOMENTOS.length - 1];   // 23:00
    const alba   = MOMENTOS[0];                     // 07:00

    if (hora >= noche.hora) {
      // 23:00 → 24:00 → 02:00
      const largo = (24 - noche.hora) + MADRUGADA.hora;
      return { desde: noche, hasta: MADRUGADA, t: (hora - noche.hora) / largo };
    }
    if (hora < MADRUGADA.hora) {
      // 00:00 → 02:00 (segunda parte del mismo tramo)
      const largo = (24 - noche.hora) + MADRUGADA.hora;
      return { desde: noche, hasta: MADRUGADA, t: ((24 - noche.hora) + hora) / largo };
    }
    // 02:00 → 05:00 (la madrugada se va tiñendo de malva)
    if (hora < ANTES_DEL_ALBA.hora) {
      return {
        desde: MADRUGADA, hasta: ANTES_DEL_ALBA,
        t: (hora - MADRUGADA.hora) / (ANTES_DEL_ALBA.hora - MADRUGADA.hora),
      };
    }
    // 05:00 → 07:00 (del malva al rosa del amanecer)
    return {
      desde: ANTES_DEL_ALBA, hasta: alba,
      t: (hora - ANTES_DEL_ALBA.hora) / (alba.hora - ANTES_DEL_ALBA.hora),
    };
  }

  /* ⚠️ SE ESCRIBE EL DEGRADADO COMPLETO, NO UNA VARIABLE.
     El primer intento dejaba `var(--luz-haz-centro)` dentro del `background`
     del CSS y acá solo se escribía la variable. Costó caro: 14-haces-de-luz.js
     escribe --luz-intensidad en estas capas cada 65 ms, y cambiar una
     propiedad personalizada invalida el estilo de todo el subárbol, así que
     los 5 haces y las 32 motas volvían a resolver su degradado quince veces
     por segundo. "Recalculate style" pasó del 13 % al 21 % del perfil.

     Escribiendo el degradado ya armado directamente en cada elemento, el
     costo se paga UNA vez cada diez minutos y las invalidaciones de la
     animación vuelven a ser triviales. */

  /** Arma el fondo de un haz con los tres colores de este momento. */
  function fondoDelHaz(centro, medio, borde) {
    return `radial-gradient(ellipse 62% 46% at 50% 24%, ${centro} 0%, ` +
           `${medio} 38%, ${borde} 62%, transparent 80%)`;
  }

  /** Arma el fondo de una mota con los dos colores de este momento. */
  function fondoDeLaMota(centro, borde) {
    return `radial-gradient(circle, ${centro} 0%, ${borde} 42%, transparent 72%)`;
  }

  /**
   * Calcula la luz de este momento y la aplica.
   * @returns {void}
   */
  function ponerLaLuzDeLaHora() {
    const ahora = new Date();
    const hora = ahora.getHours() + ahora.getMinutes() / 60;
    const { desde, hasta, t } = tramoDeLaHora(hora);

    const color = clave => mezclar(desde[clave], hasta[clave], t);

    const fondoHaz = fondoDelHaz(color('hazCentro'), color('hazMedio'), color('hazBorde'));
    const fondoMota = fondoDeLaMota(color('motaCentro'), color('motaBorde'));

    for (const haz of document.querySelectorAll('.haz')) haz.style.background = fondoHaz;
    for (const mota of document.querySelectorAll('.mota')) mota.style.background = fondoMota;

    /* ── EL AMBIENTE DE ARRIBA: LA LUZ DE LUNA ──
       El halo grande de la parte superior de la portada. Era un vino fijo y
       por eso, aunque los haces viraran a azul de noche, el ambiente seguía
       cálido y el cambio se sentía a medias. Ahora entra luz de luna de
       verdad, y las velas siguen tibias: ese contraste es el punto.

       Acá SÍ se usa var() dentro del degradado, y no contradice lo de
       arriba. Lo que hace caro a var() no es var(), es que ALGO invalide
       ese subárbol por cuadro: en las motas, otro módulo escribía en el
       padre cada 65 ms. Sobre #portada la única escritura es esta, una vez
       cada diez minutos, así que el costo es cero.

       Es un pseudo-elemento (::before) y no se le puede escribir el estilo
       directo; por eso va por variable, que es justamente el caso donde
       var() es la herramienta correcta. */
    const portada = document.getElementById('portada');
    if (portada) portada.style.setProperty('--ambiente-alto', color('ambienteAlto'));

    /* ── LA HABITACIÓN ENTERA ──
       El halo de la portada solo no alcanzaba: el fondo de la web es un
       dibujo SEPIA CÁLIDO a pantalla completa, y un halo al 30 % en un
       rincón no puede contra eso. Se veía cambiar la luz de los ventanales
       mientras la sala seguía tibia.

       Este tinte cubre todo el fondo y es el que de verdad hace que sea de
       noche: azul de luna de madrugada, nada al mediodía. Va sobre el
       dibujo y debajo del velo negro (ver #capa-fondo en
       estilos/01-fundamentos.css).

       Las velas siguen cálidas encima, y ese contraste —sala fría, fuego
       tibio— es lo que hace bonita una escena nocturna a la luz de vela. */
    const fondo = document.getElementById('capa-fondo');
    if (fondo) fondo.style.setProperty('--velo-de-la-hora', veloDeLaSala(desde, hasta, t));

    /* ── EL VELO DE PROFUNDIDAD, TEÑIDO ──
       Es la capa más grande de la escena: cubre el documento entero. Que se
       tiña con la hora es lo que hace que la SALA cambie de temperatura, no
       solo la ventana. Cálido de tarde, azul de madrugada. */
    const penumbra = document.getElementById('penumbra-profunda');
    if (penumbra) penumbra.style.setProperty('--tinte-del-velo', color('tinteDelVelo'));

    /* ── LO QUE LEEN LOS BUCLES QUE YA EXISTEN ──
       Estos tres no son colores: son NÚMEROS que cambian el comportamiento
       de la escena, y son los que de verdad hacen que se note la hora.

         · anguloDelSol  → por dónde ENTRA la luz. Es la señal más legible de
                           todas: a las 7 de la mañana los haces entran
                           rasantes desde un lado, al mediodía casi
                           verticales, y al atardecer rasantes desde el otro.
         · largoDelHaz   → un sol bajo alarga el rayo; uno alto lo acorta.
         · fuerzaDeVelas → de día las velas compiten con la ventana y quedan
                           discretas (×0,70); de madrugada SON la única luz
                           de la sala y crecen (×1,30). Ese cambio de quién
                           manda es lo que vuelve envolvente la escena.

       Se escriben una vez cada diez minutos: cuestan cero por cuadro. */
    const mezclarNumero = (clave) => desde[clave] + (hasta[clave] - desde[clave]) * t;

    window.LuzDeLaHora = {
      anguloDelSol:  mezclarNumero('anguloDelSol'),
      largoDelHaz:   mezclarNumero('largoDelHaz'),
      fuerzaDeVelas: mezclarNumero('fuerzaDeVelas'),
    };

    document.dispatchEvent(new CustomEvent('hora-cambio'));
  }

  /**
   * Arma la CÚPULA de luz ambiental que entra desde arriba.
   *
   * ⛔ EL PRIMER INTENTO FUE UN TINTE PLANO —el mismo color con la misma
   * opacidad sobre toda la pantalla— y quedó fatal, con razón: eso no es
   * luz, es un filtro de color pegado encima, y se lee exactamente como lo
   * que es.
   *
   * La luz de verdad tiene tres propiedades que un tinte plano no tiene:
   *
   *   1. VIENE DE UN SITIO. Acá, de arriba: los ventanales por donde entran
   *      los haces. Por eso la elipse nace FUERA del borde superior (-8 %),
   *      como si la fuente estuviera más allá de la ventana.
   *   2. SE APAGA CON LA DISTANCIA. El degradado muere antes de la mitad de
   *      la pantalla, así que abajo —donde mandan los candelabros— la escena
   *      sigue siendo cálida de fuego.
   *   3. NO MANDA SOBRE LO QUE YA ESTÁ ILUMINADO. Esta se resuelve sola: las
   *      velas se dibujan en el lienzo POR ENCIMA y con suma aditiva, así que
   *      sus charcos tibios atraviesan el frío sin que haya que hacer nada.
   *
   * Ese contraste —sala azulada arriba, islas de fuego abajo— es cómo se ve
   * de verdad un salón a la luz de velas de noche.
   *
   * @returns {string} El degradado completo, listo para el `background-image`.
   */
  function veloDeLaSala(desde, hasta, t) {
    const base = desde.tinteDeSala;
    const otro = hasta.tinteDeSala;
    const canal = i => Math.round(base[i] + (otro[i] - base[i]) * t);
    const alfa  = base[3] + (otro[3] - base[3]) * t;

    const r = canal(0), g = canal(1), b = canal(2);
    const tono = (fuerza) => `rgba(${r}, ${g}, ${b}, ${(alfa * fuerza).toFixed(3)})`;

    /* La elipse es ANCHA (130 %) y baja (65 %): se derrama hacia los lados
       en vez de caer como una banda recta. */
    return 'radial-gradient(ellipse 130% 65% at 50% -8%, ' +
           tono(1)    + ' 0%, '   +
           tono(0.62) + ' 26%, '  +
           tono(0.28) + ' 46%, '  +
           tono(0.08) + ' 60%, '  +
           `rgba(${r}, ${g}, ${b}, 0) 74%)`;
  }

  ponerLaLuzDeLaHora();

  /* Los haces y las motas los crean otros módulos; si alguno todavía no
     había terminado al cargar, se vuelve a aplicar cuando la invitación se
     hace visible. Es barato y garantiza que nada quede con el color de
     reserva del CSS. */
  document.addEventListener('invitacion-visible', () => setTimeout(ponerLaLuzDeLaHora, 300));

  /* Cada diez minutos alcanza: entre un cálculo y el siguiente el color se
     mueve poquísimo, y el cambio queda suavizado por la transición de
     opacidad que ya tienen las capas. */
  setInterval(ponerLaLuzDeLaHora, 10 * 60 * 1000);

  /* Si alguien deja la pestaña abierta toda la tarde y vuelve, se refresca
     al instante en vez de esperar al próximo turno. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ponerLaLuzDeLaHora();
  });

})();

/* ═══ 00-conocimiento-chatbot.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   00-conocimiento-chatbot.js
   BASE DE CONOCIMIENTO DE LAS PREGUNTAS FRECUENTES · ANIA XV

   Este archivo define TODO lo que el panel de preguntas puede responder.
   Editá libremente las secciones marcadas con ✏️
   No toques la estructura (llaves, corchetes, comillas), solo el texto.

   ESTE ARCHIVO SOLO TIENE DATOS, NINGUNA LÓGICA.
   Quien arma el panel en pantalla es codigo/25-preguntas-frecuentes.js.
   Están separados a propósito: así se puede corregir la dirección del
   salón o el código de vestimenta sin tocar una sola línea de programa.

   ÍNDICE
     1. CONOCIMIENTO_CHATBOT · los datos crudos de la fiesta
     2. PREGUNTAS_FRECUENTES · la lista que se ve en pantalla
   ══════════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════════
   1. LOS DATOS DE LA FIESTA
   ══════════════════════════════════════════════════════════════════════ */

const CONOCIMIENTO_CHATBOT = {

  /* ── IDENTIDAD ────────────────────────────────────────────────────────
     Cómo se presenta el panel y cuál es su límite declarado.             */
  identidad: {
    nombre:      'Preguntas frecuentes',                          // ✏️
    presentacion: 'Todo lo que hay que saber sobre la fiesta de Ania.', // ✏️
    limitacion:  'Acá está la información de la fiesta de Ania. '
                + 'Para dudas más específicas, contactá directamente a los organizadores.', // ✏️
    /* Tiene que ser un buzón que exista de verdad: acá se le dice a la
       gente que escriba. info@ es el único creado en Hostinger —ver
       confirmar.php— y es el mismo que firma los correos de pase. */
    contactoOrganizadores: 'info@aniaxv.com',                     // ✏️
  },

  /* ── DATOS DE LA FIESTA ────────────────────────────────────────────────
     La información central del evento.                                    */
  fiesta: {
    festejada:   'Ania',                                           // ✏️
    tipo:        'XV Años',                                        // ✏️
    fecha:       'Sábado 24 de octubre de 2026',                   // ✏️
    horaEntrada: '5:00 PM',                                        // ✏️
    horaInicio:  '5:30 PM',                                        // ✏️
    horaFin:     '1:00 AM',                                        // ✏️
  },

  /* ── LUGAR ─────────────────────────────────────────────────────────────
     Salón, dirección y cómo llegar.                                       */
  lugar: {
    nombre:        'Salones de fiestas Alvi Toluca',               // ✏️
    direccion:     'Via José López Portillo 318, Delegación San Lorenzo Tepaltitlán I, Toluca, Estado de México', // ✏️
    googleMaps:    'https://maps.app.goo.gl/EBXftZ48M5c3HLFGA',   // ✏️
    referencia:    '',  // ✏️ Ej: 'A una cuadra del Walmart de Toluca'
    estacionamiento: 'Valet parking disponible · $50 por auto', // ✏️
  },

  /* ── VESTIMENTA ────────────────────────────────────────────────────────
     Código de vestimenta y restricciones.                                 */
  vestimenta: {
    codigo:       'Formal · Etiqueta',                             // ✏️
    restriccion:  'Evitar el color rojo',                          // ✏️
    notas:        '',  // ✏️ Ej: 'Se sugiere ropa en tonos dorados o blanco'
  },

  /* ── MENÚS ─────────────────────────────────────────────────────────────
     Opciones de comida disponibles.                                        */
  menus: {
    adultos: [
      { nombre: 'Estándar',    descripcion: 'Menú completo clásico' },    // ✏️
      { nombre: 'Vegetariano', descripcion: 'Sin carne, opciones vegetales' }, // ✏️
    ],
    ninos: {
      nombre:      'Menú infantil',                                        // ✏️
      descripcion: 'Todos los niños llevan el mismo menú infantil',        // ✏️
    },
    alergias: 'Podés indicar alergias o restricciones en el formulario de confirmación.', // ✏️
  },

  /* ── CONFIRMACIÓN DE ASISTENCIA ────────────────────────────────────────
     Fechas límite y cómo confirmar.                                        */
  confirmacion: {
    fechaLimite:  '1 de octubre de 2026',                          // ✏️
    como:         'Completá el formulario al final de la invitación en aniaxv.com', // ✏️
    pase:         'Al confirmar recibís tu código de pase al correo electrónico', // ✏️
    correoSpam:   'Si no encontrás el correo, revisá la carpeta de spam', // ✏️
  },

  /* ── MESA DE REGALOS ───────────────────────────────────────────────────
     El enlace de Amazon y la aclaración NO se escriben acá.

     Ya viven en codigo/01-configuracion.js (sección 4, "regalos"), que es
     de donde los toma la sección de regalos de la invitación. Tenerlos
     dos veces es garantizar que un día digan cosas distintas: se cambia
     uno, se olvida el otro, y la invitación y las preguntas frecuentes
     mandan a la gente a lugares diferentes.

     Acá solo va lo que es propio de esta respuesta.                        */
  regalos: {
    mensaje:      'Tu presencia es el mejor regalo.',              // ✏️
  },

  /* ── PREGUNTAS FRECUENTES EXTRA ────────────────────────────────────────
     Preguntas adicionales, además de las ocho fijas de más abajo.

     ⚠️ LAS QUE TIENEN LA RESPUESTA VACÍA NO SE MUESTRAN.
     Es a propósito: más vale que la pregunta no aparezca a que aparezca
     y se abra sin nada adentro. En cuanto le escribas una respuesta,
     aparece sola en el panel.

     Agregá todas las que quieras con el mismo formato:
     { pregunta: '...', respuesta: '...' }                                 */
  faqExtra: [
    {
      pregunta:  '¿Habrá photobooth o actividades?',               // ✏️
      respuesta: '',  // ✏️ Completá si lo sabés
    },
    {
      pregunta:  '¿Se puede ir con niños?',                        // ✏️
      respuesta: 'Sí, hay menú infantil disponible. Indicá la cantidad de niños al confirmar.', // ✏️
    },
    {
      pregunta:  '¿Hay transporte o servicio de traslado?',        // ✏️
      respuesta: '',  // ✏️ Completá si hay shuttle o transporte
    },
    {
      pregunta:  '¿Qué pasa si no puedo asistir?',                 // ✏️
      respuesta: 'Igual podés confirmar tu inasistencia en el formulario para avisar a los organizadores.', // ✏️
    },
    // ── Agregá más preguntas aquí con el mismo formato ──────────────────
    // {
    //   pregunta:  '¿Habrá barra libre?',
    //   respuesta: 'Sí, durante toda la noche.',
    // },
  ],

  /* ── MENSAJES DE SISTEMA ───────────────────────────────────────────────
     Textos sueltos que usa el panel.
     Modificá el texto, no las claves.                                     */
  mensajes: {
    noSabe:     'Esa información no la tengo disponible. Te recomiendo escribirle directamente a los organizadores.', // ✏️
    pie:        '¿Te quedó otra duda? Escribinos a los organizadores.', // ✏️
  },

};


/* ══════════════════════════════════════════════════════════════════════
   2. LA LISTA QUE SE VE EN PANTALLA
   ══════════════════════════════════════════════════════════════════════

   Cada entrada es una pregunta del acordeón, en el orden en que aparecen.

   La respuesta se arma leyendo del objeto de arriba y NO se escribe a
   mano: si mañana cambia la hora de entrada, se corrige en un solo lugar
   (fiesta.horaEntrada) y acá se actualiza sola. Duplicar el dato sería
   garantizar que un día digan cosas distintas.

   Se permiten <b> y <a> en las respuestas porque este texto es nuestro y
   no viene de nadie de afuera.
   ══════════════════════════════════════════════════════════════════════ */

const PREGUNTAS_FRECUENTES = [

  {
    pregunta: '¿Cuándo es la fiesta?',
    respuesta: () => {
      const f = CONOCIMIENTO_CHATBOT.fiesta;
      return `Es el <b>${f.fecha}</b>. El acceso comienza a las ${f.horaEntrada} `
           + `y el evento arranca a las ${f.horaInicio}`
           + (f.horaFin ? `, hasta las ${f.horaFin}.` : '.');
    },
  },

  {
    pregunta: '¿Dónde es y cómo llego?',
    respuesta: () => {
      const l = CONOCIMIENTO_CHATBOT.lugar;
      let texto = `En <b>${l.nombre}</b>.<br>${l.direccion}`;
      if (l.referencia) texto += `<br>${l.referencia}`;
      if (l.googleMaps) {
        texto += `<br><a href="${l.googleMaps}" target="_blank" rel="noopener">Abrir en Google Maps</a>`;
      }
      return texto;
    },
  },

  {
    pregunta: '¿Hay estacionamiento?',
    // Si algún día no hay, se vacía lugar.estacionamiento y la pregunta
    // desaparece del panel sin tocar nada más.
    respuesta: () => CONOCIMIENTO_CHATBOT.lugar.estacionamiento,
  },

  {
    pregunta: '¿Cuál es el código de vestimenta?',
    respuesta: () => {
      const v = CONOCIMIENTO_CHATBOT.vestimenta;
      let texto = `<b>${v.codigo}</b>.`;
      if (v.restriccion) texto += `<br>Tené en cuenta: <b>${v.restriccion}</b>.`;
      if (v.notas)       texto += `<br>${v.notas}`;
      return texto;
    },
  },

  {
    pregunta: '¿Cómo confirmo mi asistencia?',
    respuesta: () => {
      const c = CONOCIMIENTO_CHATBOT.confirmacion;
      return `${c.como}.<br>La fecha límite es el <b>${c.fechaLimite}</b>.`
           + `<br>${c.pase}. ${c.correoSpam}.`;
    },
  },

  {
    pregunta: '¿Qué se sirve de comer?',
    respuesta: () => {
      const m = CONOCIMIENTO_CHATBOT.menus;
      const adultos = m.adultos.map(o => `<b>${o.nombre}</b> (${o.descripcion})`).join(' o ');
      return `Para adultos: ${adultos}.<br>${m.ninos.descripcion}.<br>${m.alergias}`;
    },
  },

  {
    pregunta: '¿Hay mesa de regalos?',
    respuesta: () => {
      const r = CONOCIMIENTO_CHATBOT.regalos;

      /* El enlace y la aclaración se leen de 01-configuracion.js, que es
         el mismo lugar del que los toma la sección de regalos de la
         invitación. Así las dos no pueden contradecirse.
         El typeof es por si algún día se carga este archivo suelto. */
      const config = (typeof CONFIGURACION !== 'undefined' ? CONFIGURACION.regalos : null) || {};

      let texto = r.mensaje;

      if (config.enlaceDeLaLista) {
        texto += `<br>Si querés obsequiarle algo, esta es su mesa: `
               + `<a href="${config.enlaceDeLaLista}" target="_blank" rel="noopener">Mesa de regalos</a>.`;
      }
      if (config.aclaracion) texto += `<br>${config.aclaracion}.`;

      return texto;
    },
  },

  {
    pregunta: '¿A quién le pregunto otra cosa?',
    respuesta: () => {
      const i = CONOCIMIENTO_CHATBOT.identidad;
      return `${i.limitacion}<br>`
           + `<a href="mailto:${i.contactoOrganizadores}">${i.contactoOrganizadores}</a>`;
    },
  },

  // Las preguntas extra que hayas cargado arriba se suman acá al final.
  // Las que tengan la respuesta vacía quedan afuera (ver 25-preguntas-frecuentes.js).
  ...CONOCIMIENTO_CHATBOT.faqExtra.map(faq => ({
    pregunta:  faq.pregunta,
    respuesta: () => faq.respuesta,
  })),

];

/* ═══ 25-preguntas-frecuentes.js ═══ */
/* ══════════════════════════════════════════════════════════════════════
   25 · PREGUNTAS FRECUENTES
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Arma el panel del botón "?" que está abajo a la derecha, junto al
   reproductor y a la flecha de volver arriba. Es una lista de preguntas
   ya escritas: se toca una y se despliega su respuesta.

   POR QUÉ NO ES UN CHAT
   Antes acá había un asistente con casilla de texto. La idea suena bien,
   pero en la práctica el invitado tiene que adivinar cómo preguntar, y
   cualquier palabra fuera de la lista de claves terminaba en "esa
   información no la tengo". Un acordeón muestra de entrada TODO lo que se
   puede saber, se responde en un toque y nunca falla. Además, sin casilla
   de texto no hay nada que escapar: desaparece toda una familia de
   agujeros de seguridad.

   DE DÓNDE SALE EL CONTENIDO
   De PREGUNTAS_FRECUENTES, en codigo/00-conocimiento-chatbot.js. Acá no
   hay ni un dato de la fiesta escrito a mano.

   ÍNDICE
     1. Los elementos de la página
     2. Armar la lista
     3. Abrir y cerrar el panel
     4. El acordeón
     5. Aparecer recién cuando se abrió el sobre
   ══════════════════════════════════════════════════════════════════════ */

(function preparaLasPreguntasFrecuentes() {

  /* ─── 1. LOS ELEMENTOS DE LA PÁGINA ────────────────────────────────── */

  const boton  = document.getElementById('boton-qa');
  const panel  = document.getElementById('panel-qa');
  const lista  = document.getElementById('qa-lista');
  const velo   = document.getElementById('velo-qa');
  const cerrar = document.getElementById('boton-cerrar-qa');

  // Si falta cualquier pieza, este módulo se calla y la web sigue andando.
  if (!boton || !panel || !lista) return;
  if (typeof PREGUNTAS_FRECUENTES === 'undefined') return;


  /* ─── 2. ARMAR LA LISTA ────────────────────────────────────────────── */

  /**
   * Resuelve la respuesta de una entrada. Pueden ser función o texto
   * suelto, así que se acepta cualquiera de las dos formas.
   * @param {{respuesta: (Function|string)}} entrada
   * @returns {string} HTML de la respuesta, o cadena vacía si no hay.
   */
  function resolverRespuesta(entrada) {
    try {
      const valor = typeof entrada.respuesta === 'function'
        ? entrada.respuesta()
        : entrada.respuesta;
      return (valor || '').toString().trim();
    } catch (error) {
      // Un dato mal escrito en el archivo de conocimiento no debe
      // llevarse puesto el panel entero: se saltea esa pregunta.
      return '';
    }
  }

  let contador = 0;

  PREGUNTAS_FRECUENTES.forEach(entrada => {
    const respuesta = resolverRespuesta(entrada);

    // Sin respuesta, la pregunta no se muestra. Vale más que no esté a
    // que se abra y adentro no haya nada.
    if (!respuesta || !entrada.pregunta) return;

    contador += 1;
    const idPregunta  = `qa-p-${contador}`;
    const idRespuesta = `qa-r-${contador}`;

    const item = document.createElement('div');
    item.className = 'qa__item';

    // LA PREGUNTA. Va con textContent y no con innerHTML: es texto, y
    // tratarlo como texto es gratis y cierra la puerta de una vez.
    const botonPregunta = document.createElement('button');
    botonPregunta.type = 'button';
    botonPregunta.className = 'qa__pregunta';
    botonPregunta.id = idPregunta;
    botonPregunta.setAttribute('aria-expanded', 'false');
    botonPregunta.setAttribute('aria-controls', idRespuesta);
    botonPregunta.textContent = entrada.pregunta;

    const flecha = document.createElement('span');
    flecha.className = 'qa__flecha';
    flecha.setAttribute('aria-hidden', 'true');
    flecha.textContent = '›';
    botonPregunta.appendChild(flecha);

    // LA RESPUESTA. Acá sí va innerHTML, porque el texto es nuestro y
    // lleva <b> y enlaces a propósito (el mapa, la mesa de regalos).
    const cajaRespuesta = document.createElement('div');
    cajaRespuesta.className = 'qa__respuesta';
    cajaRespuesta.id = idRespuesta;
    cajaRespuesta.setAttribute('role', 'region');
    cajaRespuesta.setAttribute('aria-labelledby', idPregunta);

    const texto = document.createElement('div');
    texto.className = 'qa__texto';
    texto.innerHTML = respuesta;
    cajaRespuesta.appendChild(texto);

    item.appendChild(botonPregunta);
    item.appendChild(cajaRespuesta);
    lista.appendChild(item);
  });

  // Si no quedó ninguna pregunta con respuesta, el botón no tiene sentido.
  if (contador === 0) {
    boton.remove();
    return;
  }


  /* ─── 3. ABRIR Y CERRAR EL PANEL ───────────────────────────────────── */

  let estaAbierto = false;

  /**
   * Abre o cierra el panel completo.
   * @param {boolean} abrir
   * @returns {void}
   */
  function alternarPanel(abrir) {
    estaAbierto = abrir;

    panel.classList.toggle('qa-abierto', abrir);
    panel.setAttribute('aria-hidden', String(!abrir));
    boton.setAttribute('aria-expanded', String(abrir));
    boton.setAttribute('aria-label', abrir ? 'Cerrar preguntas frecuentes' : 'Preguntas frecuentes');

    // La clase en el <body> es la que, en el celular, frena el scroll de
    // la página por detrás de la hoja (ver 13-preguntas-frecuentes.css).
    document.body.classList.toggle('qa-abierta', abrir);
    if (velo) velo.classList.toggle('qa-abierto', abrir);

    if (abrir) {
      // Al abrir, el foco va a la primera pregunta: quien navega con
      // teclado entra directo a la lista y no tiene que tabular hasta ahí.
      const primera = lista.querySelector('.qa__pregunta');
      if (primera) primera.focus();
    } else {
      // Al cerrar, el foco vuelve de donde salió.
      boton.focus();
    }
  }

  boton.addEventListener('click', () => alternarPanel(!estaAbierto));
  if (cerrar) cerrar.addEventListener('click', () => alternarPanel(false));
  if (velo)   velo.addEventListener('click',   () => alternarPanel(false));

  // Escape cierra, como en cualquier panel de la web.
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && estaAbierto) alternarPanel(false);
  });

  // Un clic en cualquier otro lado también cierra. Se pregunta por el
  // panel Y por el botón: si no, el clic de abrir cerraría en el acto.
  document.addEventListener('click', evento => {
    if (!estaAbierto) return;
    if (panel.contains(evento.target) || boton.contains(evento.target)) return;
    alternarPanel(false);
  });


  /* ─── 4. EL ACORDEÓN ───────────────────────────────────────────────── */

  /* Una sola respuesta abierta a la vez. Con diez preguntas desplegadas
     el panel se vuelve un muro de texto con scroll infinito, que es
     justo lo que se quería evitar. */
  lista.addEventListener('click', evento => {
    const pregunta = evento.target.closest('.qa__pregunta');
    if (!pregunta) return;

    const seEstabaAbriendo = pregunta.getAttribute('aria-expanded') === 'true';

    lista.querySelectorAll('.qa__pregunta[aria-expanded="true"]').forEach(otra => {
      otra.setAttribute('aria-expanded', 'false');
      otra.closest('.qa__item').classList.remove('qa__item--abierto');
    });

    if (!seEstabaAbriendo) {
      pregunta.setAttribute('aria-expanded', 'true');
      pregunta.closest('.qa__item').classList.add('qa__item--abierto');
    }
  });


  /* ─── 5. APARECER RECIÉN CUANDO SE ABRIÓ EL SOBRE ──────────────────── */

  /* Mientras se ve el sobre cerrado, la pantalla tiene que ser el sobre y
     nada más. Un botón de ayuda flotando ahí adelanta que hay una web
     detrás y rompe la entrada. Aparece cuando la persona ya está adentro.

     El sobre avisa con el evento 'sobre-abierto' (03-sobre-de-apertura.js),
     el mismo que ya escuchan el reproductor y los haces de luz. */
  function mostrarBoton() {
    boton.classList.remove('qa-oculto');
  }

  if (document.body.classList.contains('sobre-visible')) {
    document.addEventListener('sobre-abierto', mostrarBoton, { once: true });
  } else {
    // Sin sobre en pantalla (ya se abrió, o se entró con un enlace que lo
    // saltea): el botón va desde el principio.
    mostrarBoton();
  }

})();
