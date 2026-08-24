/* ══════════════════════════════════════════════════════════════════════
   46 · AGENTE MOTIVADOR

   QUÉ ES Y QUÉ NO ES
   NO es un agente que hace algo con los datos del evento (dinero, mesas,
   fechas): no escribe nada, no propone acciones. Es el único agente que
   no está para resolver una tarea sino para acompañar — y por eso mismo
   tiene que ser el más comedido de todos: una frase amable de más se
   nota, y una que no viene a cuento cansa rápido.

   TAMPOCO ES INTELIGENCIA ARTIFICIAL. Mismo principio que 32-asistente.js:
   nada de generar texto sobre la marcha. O usa una frase de una lista
   chica y fija, o usa una de las frases que la propia cuenta le enseñó.
   Nunca inventa una palabra cariñosa que no le hayan dado.

   CÓMO APRENDE EL LENGUAJE AFECTIVO DE CADA CUENTA
   Dos listas, guardadas por cuenta (nunca se mezclan entre Lucila y
   Carlos, mismo criterio que FRASES_APRENDIDAS de 32-asistente.js):

     · PALABRAS: "cuando digo esto, quiero decir esto" — su propia jerga
       (ej. "abacho" → "abrazo"). Sirve para que, si la escribe en el
       campo del asistente, la reciba con calidez en vez del genérico
       "no conozco esa frase todavía".

     · RESPUESTAS: frases que le gusta que le digan (ej. "te amodoro").
       El agente elige entre ESTAS cuando quiere ser cariñoso — nunca
       arma una propia.

   TONO: EMPÁTICO, NO EFUSIVO
   Nada de signos de exclamación en cadena ni "¡sos la mejor organizadora
   del mundo!". La idea es responder con empatía a una muestra de afecto
   o a su jerga —para hacerla reír si lo pide, para bajar un poco la
   tensión— no ser una porrista. Si no hay nada suyo enseñado todavía,
   las frases de fábrica de acá abajo siguen ese mismo criterio.

   ÍNDICE
     1. El diccionario, por cuenta
     2. Reconocer cariño en lo que se escribe
     3. La sugerencia del día
     4. Ajustes → enseñarle
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. EL DICCIONARIO, POR CUENTA ────────────────────────────────── */

/**
 * @typedef {Object} DiccionarioCarinoso
 * @property {Array<{dice:string, significa:string}>} palabras
 * @property {string[]} respuestas
 */

/** @type {DiccionarioCarinoso} */
let DICCIONARIO_CARINOSO = { palabras: [], respuestas: [] };

/**
 * @returns {string}
 */
function claveDelDiccionarioCarinoso() {
  return 'carino_' + (USUARIO && USUARIO.id ? USUARIO.id : '0');
}

/**
 * Aplica lo guardado en este teléfono, sin esperar al servidor — mismo
 * patrón que el sandwich del FAB y la paleta.
 *
 * @returns {void}
 */
function cargarDiccionarioCarinosoEnElTelefono() {
  try {
    const guardado = localStorage.getItem(claveDelDiccionarioCarinoso());
    if (guardado) {
      const d = JSON.parse(guardado);
      DICCIONARIO_CARINOSO = {
        palabras: Array.isArray(d.palabras) ? d.palabras : [],
        respuestas: Array.isArray(d.respuestas) ? d.respuestas : [],
      };
    }
  } catch (error) {
    DICCIONARIO_CARINOSO = { palabras: [], respuestas: [] };
  }
}

/**
 * Trae lo guardado en el servidor para esta cuenta. Se llama después de
 * entrar, sin esperarla.
 *
 * @returns {Promise<void>}
 */
async function sincronizarDiccionarioCarinosoConServidor() {
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=' + claveDelDiccionarioCarinoso());
    if (!r || !r.valor) return;

    const d = JSON.parse(r.valor);
    DICCIONARIO_CARINOSO = {
      palabras: Array.isArray(d.palabras) ? d.palabras : [],
      respuestas: Array.isArray(d.respuestas) ? d.respuestas : [],
    };
    localStorage.setItem(claveDelDiccionarioCarinoso(), JSON.stringify(DICCIONARIO_CARINOSO));
  } catch (error) {
    // Sin señal, o todavía no había enseñado nada: se sigue con lo que
    // ya estaba aplicado.
  }
}

/**
 * Guarda el diccionario completo (servidor + teléfono).
 *
 * @returns {Promise<void>}
 */
async function guardarDiccionarioCarinoso() {
  await mandar('ajustes.php?accion=guardar', {
    clave: claveDelDiccionarioCarinoso(),
    valor: JSON.stringify(DICCIONARIO_CARINOSO),
  });
  localStorage.setItem(claveDelDiccionarioCarinoso(), JSON.stringify(DICCIONARIO_CARINOSO));
}


/* ─── 2. RECONOCER CARIÑO EN LO QUE SE ESCRIBE ─────────────────────── */

/**
 * Frases de fábrica, para cuando todavía no le enseñaron ninguna propia.
 * Cortas, tranquilas, sin exclamaciones en cadena — a propósito.
 */
const RESPUESTAS_CARINOSAS_DE_FABRICA = [
  'Acá ando, contigo.',
  'Un ratito de aire no le hace mal a nadie — sigue cuando quieras.',
  'Se está armando lindo, aunque no lo parezca en medio del lío.',
  'Anda tranquila, esto no se va a ningún lado.',
];

/**
 * Palabras de fábrica que ya se entienden como muestra de afecto o de
 * pedido de aliento, sin que nadie las tenga que enseñar — "jaja",
 * "necesito un abrazo", "estoy cansada", etc. Lo que la cuenta enseñe
 * en DICCIONARIO_CARINOSO.palabras se SUMA a esta lista, nunca la
 * reemplaza.
 */
const PALABRAS_CARINOSAS_DE_FABRICA = [
  'necesito un abrazo', 'estoy cansada', 'estoy cansado', 'me quiero reir',
  'hazme reir', 'hazme reír', 'dame animo', 'dame ánimo', 'te quiero',
  'gracias por todo', 'estoy agotada', 'estoy agotado', 'que estres', 'qué estrés',
];

/**
 * ¿Lo que se escribió es una muestra de cariño o jerga afectiva
 * reconocida (de fábrica o enseñada)? Si sí, devuelve la respuesta;
 * si no, null — para que el asistente siga con su propio camino.
 *
 * @param {string} texto
 * @returns {string|null}
 */
function respuestaCarinosaPara(texto) {
  const entrada = paraBuscar(texto);
  if (!entrada) return null;

  const propias = DICCIONARIO_CARINOSO.palabras.map(p => paraBuscar(p.dice));
  const deFabrica = PALABRAS_CARINOSAS_DE_FABRICA.map(paraBuscar);
  const reconocidas = propias.concat(deFabrica);

  const coincide = reconocidas.some(p => p && (entrada === p || entrada.includes(p)));
  if (!coincide) return null;

  const opciones = DICCIONARIO_CARINOSO.respuestas.length
    ? DICCIONARIO_CARINOSO.respuestas
    : RESPUESTAS_CARINOSAS_DE_FABRICA;

  return opciones[Math.floor(Math.random() * opciones.length)];
}


/* ─── 3. LA SUGERENCIA DEL DÍA ─────────────────────────────────────── */

/**
 * @returns {string}
 */
function claveDelUltimoSaludo() {
  return 'motivador_ultimo_' + (USUARIO && USUARIO.id ? USUARIO.id : '0');
}

registrarAgente('motivador', 'Motivador', async pantalla => {
  // No en Presupuesto: ahí la persona está bajo presión de números, y lo
  // que necesita es eficiencia — una tarjeta de aliento en el medio de
  // eso distrae en vez de ayudar. El chat libre del asistente (donde SÍ
  // se responde con calidez, ver respuestaCarinosaPara() más abajo) no
  // pasa por acá: sigue funcionando igual en cualquier pantalla.
  if (pantalla === 'dinero') return [];

  // Como mucho una vez por día, y a propósito de baja prioridad: esto
  // nunca debe taparle a nadie una sugerencia de verdad (un pago que
  // vence, una mesa por cerrar). Si hay algo urgente, va primero.
  const hoy = new Date().toISOString().slice(0, 10);
  if (recordado(claveDelUltimoSaludo(), '') === hoy) return [];

  const opciones = DICCIONARIO_CARINOSO.respuestas.length
    ? DICCIONARIO_CARINOSO.respuestas
    : RESPUESTAS_CARINOSAS_DE_FABRICA;
  const frase = opciones[Math.floor(Math.random() * opciones.length)];

  return [{
    id: 'motivador-' + hoy,
    agente: 'motivador',
    titulo: frase,
    detalle: '',
    prioridad: 1,   // el más bajo de todos: es lo último que se ve, no lo primero
    requiereConfirmacion: false,
    ejecutar: async () => { recordar(claveDelUltimoSaludo(), hoy); },
    detalleHecho: '',
  }];
});


/* ─── 4. AJUSTES → ENSEÑARLE ───────────────────────────────────────── */

/**
 * Pantalla para enseñarle palabras propias y frases que le gusta que le
 * digan. Vive dentro de "Comandos del asistente" (32-asistente.js) para
 * no sumar una entrada más al menú — es el mismo espíritu ("enseñarle
 * cómo hablo yo"), solo que de cariño en vez de órdenes.
 *
 * @param {Element} cuerpo - El de abrirComandosDelAsistente().
 * @returns {void}
 */
function pintarSeccionCarinosa(cuerpo) {
  const donde = crear('div');
  donde.id = 'seccion-carinosa';

  const pintar = () => {
    donde.innerHTML =
      '<div class="tarjeta__titulo" style="margin-top:var(--esp-4)">Palabras cariñosas</div>' +
      '<p class="vacio__texto">' +
        'Enséñale tu propia jerga (ej. "abacho" quiere decir "abrazo") y las frases ' +
        'que te gusta que te digan (ej. "te amodoro"). Cuando escribas algo así en el ' +
        'asistente, te va a responder con una de ellas en vez de decir que no entendió.' +
      '</p>' +

      '<div class="lista__titulo" style="margin-top:var(--esp-2)">Cuando dices…</div>' +
      DICCIONARIO_CARINOSO.palabras.map((p, i) =>
        '<div class="lista__fila">' +
          '<span class="lista__cuerpo">' +
            '<span class="lista__titulo">' + seguro(p.dice) + '</span>' +
            '<span class="lista__pie">quiere decir: ' + seguro(p.significa) + '</span>' +
          '</span>' +
          '<button class="boton-icono" data-carino-borrar-palabra="' + i + '" aria-label="Olvidar">' +
            '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
              '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" ' +
                    'stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>'
      ).join('') +
      '<div style="display:flex;gap:6px;margin-top:4px">' +
        '<input type="text" class="campo__control" id="carino-nueva-palabra" ' +
               'placeholder="Cuando digo…" style="flex:1">' +
        '<input type="text" class="campo__control" id="carino-nuevo-significado" ' +
               'placeholder="Quiere decir…" style="flex:1">' +
        '<button class="boton" id="carino-agregar-palabra">+</button>' +
      '</div>' +

      '<div class="lista__titulo" style="margin-top:var(--esp-3)">Frases que me gusta que me digan</div>' +
      DICCIONARIO_CARINOSO.respuestas.map((r, i) =>
        '<div class="lista__fila">' +
          '<span class="lista__cuerpo"><span class="lista__titulo">' + seguro(r) + '</span></span>' +
          '<button class="boton-icono" data-carino-borrar-respuesta="' + i + '" aria-label="Olvidar">' +
            '<svg viewBox="0 0 24 24" class="icono" aria-hidden="true">' +
              '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" ' +
                    'stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>'
      ).join('') +
      '<div style="display:flex;gap:6px;margin-top:4px">' +
        '<input type="text" class="campo__control" id="carino-nueva-respuesta" ' +
               'placeholder="Agregar una frase" style="flex:1">' +
        '<button class="boton" id="carino-agregar-respuesta">+</button>' +
      '</div>';

    engancharSeccionCarinosa();
  };

  const engancharSeccionCarinosa = () => {
    buscarTodos('[data-carino-borrar-palabra]', donde).forEach(boton => {
      boton.addEventListener('click', async () => {
        DICCIONARIO_CARINOSO.palabras.splice(Number(boton.dataset.carinoBorrarPalabra), 1);
        await guardarDiccionarioCarinoso();
        pintar();
      });
    });
    buscarTodos('[data-carino-borrar-respuesta]', donde).forEach(boton => {
      boton.addEventListener('click', async () => {
        DICCIONARIO_CARINOSO.respuestas.splice(Number(boton.dataset.carinoBorrarRespuesta), 1);
        await guardarDiccionarioCarinoso();
        pintar();
      });
    });

    buscar('#carino-agregar-palabra', donde).addEventListener('click', async () => {
      const dice = buscar('#carino-nueva-palabra', donde).value.trim();
      const significa = buscar('#carino-nuevo-significado', donde).value.trim();
      if (!dice || !significa) return;

      DICCIONARIO_CARINOSO.palabras.push({ dice: dice, significa: significa });
      await guardarDiccionarioCarinoso();
      avisar('Aprendida.');
      pintar();
    });

    buscar('#carino-agregar-respuesta', donde).addEventListener('click', async () => {
      const frase = buscar('#carino-nueva-respuesta', donde).value.trim();
      if (!frase) return;

      DICCIONARIO_CARINOSO.respuestas.push(frase);
      await guardarDiccionarioCarinoso();
      avisar('Aprendida.');
      pintar();
    });
  };

  pintar();
  cuerpo.appendChild(donde);
}
