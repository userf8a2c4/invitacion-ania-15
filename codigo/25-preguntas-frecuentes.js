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
