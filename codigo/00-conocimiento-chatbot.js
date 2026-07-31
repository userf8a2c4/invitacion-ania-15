/* ══════════════════════════════════════════════════════════════════════
   00-conocimiento-chatbot.js
   BASE DE CONOCIMIENTO DEL ASISTENTE VIRTUAL · ANIA XV

   Este archivo define TODO lo que el chatbot sabe y puede responder.
   Editá libremente las secciones marcadas con ✏️
   No toques la estructura (llaves, corchetes, comillas), solo el texto.
   ══════════════════════════════════════════════════════════════════════ */

const CONOCIMIENTO_CHATBOT = {

  /* ── IDENTIDAD DEL ASISTENTE ──────────────────────────────────────────
     Cómo se presenta y cuál es su límite declarado.                      */
  identidad: {
    nombre:      'Asistente de Ania XV',                          // ✏️
    presentacion: 'Hola 🌹 Soy el asistente de la invitación de Ania. '
                + 'Puedo ayudarte con dudas sobre la fiesta. ¿En qué te ayudo?', // ✏️
    limitacion:  'Solo conozco la información de la fiesta de Ania. '
                + 'Para dudas más específicas, contactá directamente a los organizadores.', // ✏️
    contactoOrganizadores: 'noreply@aniaxv.com',                  // ✏️
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
    estacionamiento: 'Valet parking disponible · $50 por persona', // ✏️
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
     Opciones de regalo.                                                    */
  regalos: {
    mensaje:      'Tu presencia es el mejor regalo.',              // ✏️
    amazon:       'https://www.amazon.com.mx/registries/gl/owner-view/LJDSRURUU3G4', // ✏️
    transferencia: 'También se aceptan transferencias, consultá a los papás', // ✏️
  },

  /* ── PREGUNTAS FRECUENTES EXTRA ────────────────────────────────────────
     Preguntas adicionales que querés que el chatbot pueda responder.
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
     Respuestas automáticas para situaciones especiales.
     Modificá el texto, no las claves.                                     */
  mensajes: {
    noSabe:     'Esa información no la tengo disponible. Te recomiendo escribirle directamente a los organizadores.', // ✏️
    saludo:     '¡Hola! 🌹 ¿En qué puedo ayudarte?',             // ✏️
    despedida:  '¡Hasta pronto! Que disfrutes la fiesta de Ania. 🌹✨', // ✏️
    gracias:    '¡De nada! ¿Hay algo más en lo que pueda ayudarte?', // ✏️
  },

};
// ══════════════════════════════════════════════════════════════════════
// LÓGICA DE INTERFAZ Y PROCESAMIENTO DEL CHATBOT
// ══════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
    const botonToggle = document.getElementById("btn-chatbot-toggle");
    const ventanaChatbot = document.getElementById("ventana-chatbot");
    const botonCerrar = document.getElementById("btn-chatbot-cerrar");
    const botonEnviar = document.getElementById("btn-chatbot-enviar");
    const inputChatbot = document.getElementById("chatbot-input");
    const mensajesChatbot = document.getElementById("chatbot-messages");

    // Saludo inicial automático al cargar el chat
    if (mensajesChatbot) {
        mensajesChatbot.innerHTML = `<div class="msg-bot" style="margin-bottom: 10px; color: #333;"><b>Asistente:</b> ${CONOCIMIENTO_CHATBOT.identidad.presentacion}</div>`;
    }

    // Alternar visibilidad de la ventana del chatbot
    if (botonToggle && ventanaChatbot) {
        botonToggle.addEventListener("click", () => {
            ventanaChatbot.classList.toggle("chatbot-oculto");
            const esOculto = ventanaChatbot.classList.contains("chatbot-oculto");
            ventanaChatbot.setAttribute("aria-hidden", esOculto);
        });
    }

    if (botonCerrar && ventanaChatbot) {
        botonCerrar.addEventListener("click", () => {
            ventanaChatbot.classList.add("chatbot-oculto");
            ventanaChatbot.setAttribute("aria-hidden", "true");
        });
    }

    // Escuchar eventos de envío (clic en botón o presionar Enter)
    if (botonEnviar && inputChatbot) {
        botonEnviar.addEventListener("click", procesarEntradaUsuario);
        inputChatbot.addEventListener("keypress", (e) => {
            if (e.key === "Enter") procesarEntradaUsuario();
        });
    }

    function procesarEntradaUsuario() {
        const texto = inputChatbot.value.trim();
        if (!texto) return;

        // Mostrar mensaje del usuario en la pantalla
        mensajesChatbot.innerHTML += `<div class="msg-usuario" style="text-align: right; margin-bottom: 10px; color: #555;"><b>Tú:</b> ${texto}</div>`;
        inputChatbot.value = "";
        mensajesChatbot.scrollTop = mensajesChatbot.scrollHeight;

        // Generar respuesta del bot basada en tu objeto de conocimiento
        setTimeout(() => {
            const respuesta = buscarRespuesta(texto.toLowerCase());
            mensajesChatbot.innerHTML += `<div class="msg-bot" style="margin-bottom: 10px; color: #333;"><b>Asistente:</b> ${respuesta}</div>`;
            mensajesChatbot.scrollTop = mensajesChatbot.scrollHeight;
        }, 400);
    }

    // Buscador interactivo por palabras clave
    function buscarRespuesta(consulta) {
        if (consulta.includes("hola") || consulta.includes("buenos dias") || consulta.includes("buenas tardes")) {
            return CONOCIMIENTO_CHATBOT.mensajes.saludo;
        }
        if (consulta.includes("gracias")) {
            return CONOCIMIENTO_CHATBOT.mensajes.gracias;
        }
        if (consulta.includes("adios") || consulta.includes("chao") || consulta.includes("bye")) {
            return CONOCIMIENTO_CHATBOT.mensajes.despedida;
        }

        // Fecha y horarios
        if (consulta.includes("cuando") || consulta.includes("fecha") || consulta.includes("dia") || consulta.includes("hora")) {
            return `La fiesta de ${CONOCIMIENTO_CHATBOT.fiesta.festejada} es el <b>${CONOCIMIENTO_CHATBOT.fiesta.fecha}</b>. El acceso comienza a las ${CONOCIMIENTO_CHATBOT.fiesta.horaEntrada} y el evento arranca a las ${CONOCIMIENTO_CHATBOT.fiesta.horaInicio}.`;
        }

        // Ubicación y lugar
        if (consulta.includes("donde") || consulta.includes("lugar") || consulta.includes("salon") || consulta.includes("direccion") || consulta.includes("ubicacion") || consulta.includes("como llegar")) {
            return `Se celebrará en <b>${CONOCIMIENTO_CHATBOT.lugar.nombre}</b>. Ubicado en: ${CONOCIMIENTO_CHATBOT.lugar.direccion}. Puedes ver el mapa aquí: <a href="${CONOCIMIENTO_CHATBOT.lugar.googleMaps}" target="_blank">Google Maps</a>.`;
        }

        // Estacionamiento
        if (consulta.includes("estacionamiento") || consulta.includes("carro") || consulta.includes("coche") || consulta.includes("valet")) {
            return `Contamos con: ${CONOCIMIENTO_CHATBOT.lugar.estacionamiento}.`;
        }

        // Vestimenta / Código de ropa
        if (consulta.includes("vestir") || consulta.includes("vestimenta") || consulta.includes("ropa") || consulta.includes("codigo") || consulta.includes("color")) {
            let res = `El código de vestimenta es <b>${CONOCIMIENTO_CHATBOT.vestimenta.codigo}</b>.`;
            if (CONOCIMIENTO_CHATBOT.vestimenta.restriccion) {
                res += ` Por favor toma en cuenta la siguiente restricción: <b>${CONOCIMIENTO_CHATBOT.vestimenta.restriccion}</b>.`;
            }
            return res;
        }

        // Confirmar asistencia
        if (consulta.includes("confirmar") || consulta.includes("asistencia") || consulta.includes("invitacion") || consulta.includes("pase")) {
            return `${CONOCIMIENTO_CHATBOT.confirmacion.como}. Recuerda que la fecha límite es el ${CONOCIMIENTO_CHATBOT.confirmacion.fechaLimite}. ${CONOCIMIENTO_CHATBOT.confirmacion.pase}.`;
        }

        // Regalos o mesa de regalos
        if (consulta.includes("regalo") || consulta.includes("mesa") || consulta.includes("amazon") || consulta.includes("dinero") || consulta.includes("transferencia")) {
            return `${CONOCIMIENTO_CHATBOT.regalos.mensaje} Si deseas obsequiarle algo, puedes revisar su mesa de Amazon aquí: <a href="${CONOCIMIENTO_CHATBOT.regalos.amazon}" target="_blank">Mesa de Regalos</a>. ${CONOCIMIENTO_CHATBOT.regalos.transferencia}.`;
        }

        // Menú y comida
        if (consulta.includes("menu") || consulta.includes("comida") || consulta.includes("cenar") || consulta.includes("alergia") || consulta.includes("vegetariano")) {
            return `Para adultos ofrecemos menú ${CONOCIMIENTO_CHATBOT.menus.adultos.map(m => m.nombre).join(' o ')}. ${CONOCIMIENTO_CHATBOT.menus.ninos.descripcion}. ${CONOCIMIENTO_CHATBOT.menus.alergias}`;
        }

        // Búsqueda en tus FAQs extras de la base de datos
        for (let faq of CONOCIMIENTO_CHATBOT.faqExtra) {
            if (faq.respuesta && consulta.includes(faq.pregunta.toLowerCase().replace(/[¿?]/g, ""))) {
                return faq.respuesta;
            }
        }

        // Respuesta por defecto si no entiende la pregunta
        return CONOCIMIENTO_CHATBOT.mensajes.noSabe;
    }
});
