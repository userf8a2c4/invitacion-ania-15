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
    limitacion:  'Aquí está la información de la fiesta de Ania. '
                + 'Para dudas más específicas, contacta directamente a los organizadores.', // ✏️
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
    alergias: 'Puedes indicar alergias o restricciones en el formulario de confirmación.', // ✏️
  },

  /* ── CONFIRMACIÓN DE ASISTENCIA ────────────────────────────────────────
     Fechas límite y cómo confirmar.                                        */
  confirmacion: {
    fechaLimite:  '1 de octubre de 2026',                          // ✏️
    como:         'Completa el formulario al final de la invitación en aniaxv.com', // ✏️
    pase:         'Al confirmar recibes tu código de pase al correo electrónico', // ✏️
    correoSpam:   'Si no encuentras el correo, revisa la carpeta de spam', // ✏️
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
      respuesta: 'Sí, hay menú infantil disponible. Indica la cantidad de niños al confirmar.', // ✏️
    },
    {
      pregunta:  '¿Hay transporte o servicio de traslado?',        // ✏️
      respuesta: '',  // ✏️ Completá si hay shuttle o transporte
    },
    {
      pregunta:  '¿Qué pasa si no puedo asistir?',                 // ✏️
      respuesta: 'Igual puedes confirmar tu inasistencia en el formulario para avisar a los organizadores.', // ✏️
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
      if (v.restriccion) texto += `<br>Ten en cuenta: <b>${v.restriccion}</b>.`;
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
        texto += `<br>Si quieres obsequiarle algo, esta es su mesa: `
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
