/* ══════════════════════════════════════════════════════════════════════
   33 · LA PALETA DE COLORES

   QUÉ HACE ESTE ARCHIVO
   Deja que Lucila elija los colores del panel: un color principal y un
   fondo (más un color de aviso, opcional). De esos dos se derivan todos
   los demás —los tres niveles de fondo, el borde, los tres tonos de
   texto— porque la app entera ya está pintada con variables CSS
   (estilos/01-fundamentos.css). Cambiar esas variables en un solo lugar
   alcanza para repintar todo lo demás.

   POR QUÉ NO SE PUEDE ELEGIR CUALQUIER COMBINACIÓN A CIEGAS
   Un texto dorado sobre un fondo dorado es ilegible, y pedirle a alguien
   que entienda de contraste no es razonable. Por eso el texto de cada
   fondo se calcula con la luminancia relativa (la fórmula del estándar
   WCAG) y se ajusta solo a claro o a oscuro, lo que dé más contraste.

   DÓNDE SE GUARDA
   En la tabla `ajustes` del servidor (clave 'paleta'), más una copia en
   el teléfono (localStorage) para que la app abra ya pintada, sin
   parpadeo, incluso en la pantalla de login. Es un ajuste del EVENTO, no
   de cada persona: si Lucila cambia los colores, Carlos los ve igual la
   próxima vez que la app hable con el servidor.

   LA INVITACIÓN NO SE TOCA
   Esto solo existe en /admin/ y solo escribe variables CSS del propio
   documento del panel. aniaxv.com tiene su CSS aparte.

   ÍNDICE
     1. Los colores originales y las paletas listas
     2. Aritmética de color (HSL, contraste)
     3. Aplicar una paleta
     4. Guardar, cargar y sincronizar
     5. La hoja para elegir
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. LOS COLORES ORIGINALES Y LAS PALETAS LISTAS ───────────────── */

/** Los que trae la app de fábrica (estilos/01-fundamentos.css): el
    morado de Lucila, con un fondo casi negro —más cerca del negro de la
    invitación que del morado oscuro que traía antes— para que la
    sección se sienta victoriana-dark, a juego con aniaxv.com. */
const PALETA_ORIGINAL = { principal: '#6B3FA0', fondo: '#08050C', alerta: '#FF4D6A' };

/* La mayoría de la gente no quiere elegir colores: quiere elegir un
   look. Estas son cinco combinaciones ya probadas; abajo, para quien
   quiera, están los selectores sueltos.

   REDISEÑO LUCILA (ago-2026): antes había presets de otros colores
   (dorado y café, rosa, vino, verde) sueltos entre las opciones —
   quedaban al mismo nivel que el morado, como si fueran alternativas
   equivalentes. El morado (y el negro de fondo) es la identidad fija
   de la app, no una opción más: por eso las cinco combinaciones de acá
   son todas variantes DENTRO de la familia del morado —más oscuro, más
   claro, más frío, más cálido— nunca un color distinto. Quien quiera
   otro color todavía puede usar los selectores sueltos de abajo, pero
   ya no se lo ofrece como un look armado de igual peso. El oro de
   prestigio (--acento-victoriano, estilos/01-fundamentos.css) ni
   siquiera está acá: eso no es parte de lo que se elige. */
const PALETAS_LISTAS = [
  { nombre: 'Morado (original)',    principal: '#6B3FA0', fondo: '#08050C', alerta: '#FF4D6A' },
  { nombre: 'Medianoche',           principal: '#5B2E8C', fondo: '#050308', alerta: '#FF4D6A' },
  { nombre: 'Violeta claro',        principal: '#8B5FBF', fondo: '#0C0812', alerta: '#FF4D6A' },
  { nombre: 'Ciruela',              principal: '#7A3F6B', fondo: '#0A0610', alerta: '#FF4D6A' },
  { nombre: 'Lavanda nocturna',     principal: '#9B7FFF', fondo: '#0D0A14', alerta: '#FF4D6A' },
];


/* ─── 2. ARITMÉTICA DE COLOR ────────────────────────────────────────── */

/**
 * "#d4a843" → {r, g, b} (0-255 cada uno).
 *
 * @param {string} hex
 * @returns {{r:number,g:number,b:number}}
 */
function hexARgb(hex) {
  const limpio = String(hex || '').replace('#', '');
  const n = parseInt(limpio.length === 3
    ? limpio.split('').map(c => c + c).join('')
    : limpio, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * {r, g, b} → "#rrggbb".
 *
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {string}
 */
function rgbAHex({ r, g, b }) {
  const dos = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + dos(r) + dos(g) + dos(b);
}

/**
 * Aclara (positivo) u oscurece (negativo) un color mezclándolo con
 * blanco o negro. Más simple y predecible que tocar HSL a mano, y para
 * derivar sombras de un color base alcanza de sobra.
 *
 * @param {string} hex
 * @param {number} cantidad -1..1 (negativo oscurece, positivo aclara).
 * @returns {string}
 */
function ajustarColor(hex, cantidad) {
  const { r, g, b } = hexARgb(hex);
  const hacia = cantidad >= 0 ? 255 : 0;
  const t = Math.abs(cantidad);

  return rgbAHex({
    r: r + (hacia - r) * t,
    g: g + (hacia - g) * t,
    b: b + (hacia - b) * t,
  });
}

/**
 * Luminancia relativa de un color, según la fórmula del WCAG 2.x.
 * Es lo que hace falta para calcular el contraste real entre dos
 * colores, en vez de adivinar "este es clarito, debe leerse bien".
 *
 * @param {string} hex
 * @returns {number} 0 (negro) a 1 (blanco).
 */
function luminanciaRelativa(hex) {
  const { r, g, b } = hexARgb(hex);
  const canal = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Relación de contraste entre dos colores (1 a 21, mientras más alto
 * mejor). El mínimo legible del WCAG para texto normal es 4.5.
 *
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
function contrasteEntre(hexA, hexB) {
  const l1 = luminanciaRelativa(hexA) + 0.05;
  const l2 = luminanciaRelativa(hexB) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

/**
 * El blanco casi puro o el negro casi puro, lo que dé más contraste
 * contra un fondo dado. Así nunca hay que pedirle a nadie que entienda
 * de contraste: el texto se ajusta solo.
 *
 * @param {string} fondoHex
 * @returns {string}
 */
function textoLegibleSobre(fondoHex) {
  const claro  = '#f5ecd8';
  const oscuro = '#140a04';
  return contrasteEntre(fondoHex, claro) >= contrasteEntre(fondoHex, oscuro) ? claro : oscuro;
}


/* ─── 3. APLICAR UNA PALETA ─────────────────────────────────────────── */

/**
 * Deriva todas las variables CSS a partir de principal + fondo (+
 * alerta opcional) y las escribe en :root. Vista previa en vivo: se
 * puede llamar todas las veces que haga falta mientras alguien elige,
 * sin guardar nada hasta que toque "Guardar".
 *
 * @param {{principal:string, fondo:string, alerta?:string}} paleta
 * @returns {void}
 */
function aplicarPaleta(paleta) {
  const principal = paleta.principal || PALETA_ORIGINAL.principal;
  const fondo     = paleta.fondo     || PALETA_ORIGINAL.fondo;
  const alerta    = paleta.alerta    || PALETA_ORIGINAL.alerta;

  const raiz = document.documentElement.style;

  raiz.setProperty('--oro', principal);
  raiz.setProperty('--oro-claro', ajustarColor(principal, 0.35));
  raiz.setProperty('--oro-apagado', ajustarColor(principal, -0.25));

  /* El texto que va ENCIMA del color principal (botones llenos, FAB,
     chips activos) — no es lo mismo que --texto, que va sobre el
     fondo. El morado de fábrica es oscuro y pide texto claro; el
     dorado clásico es claro y pide texto oscuro. Sin esto, cambiar de
     paleta podía dejar texto casi negro sobre un botón casi negro:
     ver estilos/01-fundamentos.css para dónde se usa. */
  raiz.setProperty('--texto-sobre-principal', textoLegibleSobre(principal));

  raiz.setProperty('--fondo', fondo);
  raiz.setProperty('--fondo-elevado', ajustarColor(fondo, 0.08));
  raiz.setProperty('--fondo-tarjeta', ajustarColor(fondo, 0.14));
  raiz.setProperty('--fondo-hundido', ajustarColor(fondo, -0.06));
  raiz.setProperty('--borde', ajustarColor(fondo, 0.28));

  // El texto se calcula contra el fondo MÁS CLARO de los tres (tarjeta),
  // que es donde vive la mayoría del texto: si ahí contrasta, en los
  // otros dos —más oscuros— contrasta todavía mejor.
  const base = ajustarColor(fondo, 0.14);
  raiz.setProperty('--texto', textoLegibleSobre(base));
  raiz.setProperty('--texto-suave', ajustarColor(textoLegibleSobre(base), textoLegibleSobre(base) === '#f5ecd8' ? -0.22 : 0.35));
  raiz.setProperty('--texto-tenue', ajustarColor(textoLegibleSobre(base), textoLegibleSobre(base) === '#f5ecd8' ? -0.42 : 0.55));

  raiz.setProperty('--alerta', alerta);

  /* ⚡ EL RESPLANDOR TAMBIÉN, QUE SE QUEDABA DEL COLOR ANTERIOR
     (2026-09-03). --brillo-oro (01-fundamentos.css) es una sombra con el
     morado de fábrica escrito en RGB a mano: rgba(107,63,160,.35). Como no
     se recalculaba acá, elegir "Ciruela" o "Lavanda nocturna" cambiaba los
     botones y los chips pero dejaba el halo morado del color viejo alrededor
     — el tipo de detalle que no se sabe nombrar pero se ve sucio.

     Se arma desde el color principal elegido, con la misma transparencia que
     tenía. Lo mismo con el acento victoriano, que se usa en el filo de la
     hoja, en el contador de días del encabezado y en los estados vacíos. */
  raiz.setProperty('--brillo-oro', '0 0 20px ' + conAlfa(principal, 0.35));
  raiz.setProperty('--acento-victoriano', ajustarColor(principal, -0.1));
}

/**
 * El mismo color, con transparencia. Acepta '#rrggbb'.
 *
 * @param {string} hex
 * @param {number} alfa - De 0 a 1.
 * @returns {string} Un rgba() listo para CSS.
 */
function conAlfa(hex, alfa) {
  const limpio = String(hex).replace('#', '');
  if (limpio.length !== 6) return hex;
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alfa + ')';
}

/**
 * Dice si una combinación es directamente mala, para avisar ANTES de
 * aplicarla en vez de dejar que alguien se encuentre con texto
 * ilegible.
 *
 * @param {{principal:string, fondo:string}} paleta
 * @returns {string|null} El problema, o null si está bien.
 */
function problemaDePaleta(paleta) {
  const base = ajustarColor(paleta.fondo || PALETA_ORIGINAL.fondo, 0.14);
  const texto = textoLegibleSobre(base);
  if (contrasteEntre(base, texto) < 4.5) {
    return 'Con este fondo el texto no se va a leer bien.';
  }
  return null;
}


/* ─── 4. GUARDAR, CARGAR Y SINCRONIZAR ──────────────────────────────── */

/** Cuánto tiempo se recuerda la paleta en este teléfono, en localStorage. */
const CLAVE_PALETA_LOCAL = 'ania-admin-paleta';

/**
 * Aplica de una lo que haya guardado en este teléfono, sin esperar al
 * servidor. Se llama apenas carga el script, antes incluso de saber si
 * hay sesión: así la pantalla de login ya se ve con los colores
 * elegidos, sin parpadeo.
 *
 * @returns {void}
 */
function aplicarPaletaGuardadaEnElTelefono() {
  try {
    const guardada = localStorage.getItem(CLAVE_PALETA_LOCAL);
    if (guardada) aplicarPaleta(JSON.parse(guardada));
  } catch (error) {
    // Si el JSON quedó corrupto, se sigue con los colores de fábrica.
  }
}

/**
 * Pide la paleta guardada en el servidor y, si es distinta de la que ya
 * está aplicada, la aplica y la guarda en el teléfono. Se llama después
 * de entrar, para que un cambio hecho desde otro teléfono también
 * llegue acá.
 *
 * @returns {Promise<void>}
 */
async function sincronizarPaletaConServidor() {
  try {
    const r = await traer('ajustes.php?accion=obtener&clave=paleta');
    if (!r || !r.valor) return;

    const paleta = JSON.parse(r.valor);
    localStorage.setItem(CLAVE_PALETA_LOCAL, JSON.stringify(paleta));
    aplicarPaleta(paleta);
  } catch (error) {
    // Sin señal, o la clave no existía todavía: se sigue con lo que ya
    // estaba aplicado (de fábrica o lo del teléfono).
  }
}

/**
 * Guarda la paleta en el servidor y en el teléfono, y la deja aplicada.
 *
 * @param {{principal:string, fondo:string, alerta?:string}} paleta
 * @returns {Promise<void>}
 */
async function guardarPaleta(paleta) {
  await mandar('ajustes.php?accion=guardar', {
    clave: 'paleta',
    valor: JSON.stringify(paleta),
  });
  localStorage.setItem(CLAVE_PALETA_LOCAL, JSON.stringify(paleta));
  aplicarPaleta(paleta);
}

// Se aplica ya mismo, apenas se carga este archivo — no hace falta
// esperar a encender() ni a que haya sesión.
aplicarPaletaGuardadaEnElTelefono();


/* ─── 5. LA HOJA PARA ELEGIR ─────────────────────────────────────────── */

/**
 * Abre la hoja de Ajustes → Colores. Muestra las paletas listas arriba
 * y los selectores sueltos abajo, con vista previa en vivo: los colores
 * se aplican mientras se eligen, sobre la pantalla real.
 *
 * @returns {void}
 */
function abrirHojaDePaleta() {
  if (USUARIO.rol !== 'admin') {
    avisar('Solo una administradora puede cambiar los colores.', true);
    return;
  }

  let actual;
  try {
    actual = JSON.parse(localStorage.getItem(CLAVE_PALETA_LOCAL) || 'null') || PALETA_ORIGINAL;
  } catch (error) {
    actual = PALETA_ORIGINAL;
  }

  // Si se termina guardando, no hay que revertir nada al cerrar.
  let seGuardo = false;

  const cuerpo = abrirHoja('Colores del panel',
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Elige un look ya armado, o los dos colores de abajo. Se ve el ' +
      'cambio al toque, en esta misma pantalla. Solo afecta al panel: ' +
      'la invitación no cambia.' +
    '</p>' +

    '<div id="paleta-listas" style="display:flex;gap:var(--esp-1);flex-wrap:wrap;' +
         'margin-bottom:var(--esp-3)">' +
      PALETAS_LISTAS.map((p, i) =>
        '<button type="button" class="boton" data-paleta-lista="' + i + '" ' +
                'style="flex:1 1 45%">' +
          '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;' +
               'background:' + p.principal + ';margin-right:6px;vertical-align:middle"></span>' +
          seguro(p.nombre) +
        '</button>'
      ).join('') +
    '</div>' +

    '<div class="campo-par">' +
      '<label class="campo">' +
        '<span class="campo__rotulo">Color principal</span>' +
        '<input type="color" id="paleta-principal" class="campo__control" value="' +
               seguro(actual.principal) + '">' +
      '</label>' +
      '<label class="campo">' +
        '<span class="campo__rotulo">Fondo</span>' +
        '<input type="color" id="paleta-fondo" class="campo__control" value="' +
               seguro(actual.fondo) + '">' +
      '</label>' +
    '</div>' +
    '<label class="campo">' +
      '<span class="campo__rotulo">Color de aviso (opcional)</span>' +
      '<input type="color" id="paleta-alerta" class="campo__control" value="' +
             seguro(actual.alerta || PALETA_ORIGINAL.alerta) + '">' +
    '</label>' +

    '<p id="paleta-aviso" class="aviso-error oculto" style="margin-top:var(--esp-2)"></p>' +

    '<div style="display:flex;gap:var(--esp-2);margin-top:var(--esp-3)">' +
      '<button type="button" class="boton" style="flex:1" id="paleta-restaurar">' +
        'Restaurar original</button>' +
      '<button type="button" class="boton boton--principal" style="flex:1" id="paleta-guardar">' +
        'Guardar</button>' +
    '</div>',

    /* alCerrar: corre siempre que la hoja se cierra (X, tocar afuera,
       Escape, o después de guardar). Si no se guardó, se vuelve a lo
       que ya estaba: la vista previa no debe quedar pegada. */
    () => { if (!seGuardo) aplicarPaleta(actual); }
  );

  const leerDeLosCampos = () => ({
    principal: valorDe('paleta-principal', cuerpo),
    fondo:     valorDe('paleta-fondo', cuerpo),
    alerta:    valorDe('paleta-alerta', cuerpo),
  });

  const previsualizar = () => {
    const paleta = leerDeLosCampos();
    aplicarPaleta(paleta);

    const problema = problemaDePaleta(paleta);
    const aviso = buscar('#paleta-aviso', cuerpo);
    aviso.textContent = problema || '';
    aviso.classList.toggle('oculto', !problema);
  };

  ['paleta-principal', 'paleta-fondo', 'paleta-alerta'].forEach(id => {
    buscar('#' + id, cuerpo).addEventListener('input', previsualizar);
  });

  buscarTodos('[data-paleta-lista]', cuerpo).forEach(boton => {
    boton.addEventListener('click', () => {
      const p = PALETAS_LISTAS[Number(boton.dataset.paletaLista)];
      buscar('#paleta-principal', cuerpo).value = p.principal;
      buscar('#paleta-fondo', cuerpo).value = p.fondo;
      buscar('#paleta-alerta', cuerpo).value = p.alerta;
      previsualizar();
    });
  });

  buscar('#paleta-restaurar', cuerpo).addEventListener('click', () => {
    buscar('#paleta-principal', cuerpo).value = PALETA_ORIGINAL.principal;
    buscar('#paleta-fondo', cuerpo).value = PALETA_ORIGINAL.fondo;
    buscar('#paleta-alerta', cuerpo).value = PALETA_ORIGINAL.alerta;
    previsualizar();
  });

  buscar('#paleta-guardar', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#paleta-guardar', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    try {
      await guardarPaleta(leerDeLosCampos());
      seGuardo = true;
      cerrarHoja(true);
      avisar('Colores guardados.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Guardar';
    }
  });
}
