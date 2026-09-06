/* ══════════════════════════════════════════════════════════════════════
   50 · FORMAS DE PAGO · la conexión con Stripe

   QUÉ HACE ESTE ARCHIVO
   La pantalla donde se conecta el panel con Stripe, para que más
   adelante Lucila pueda guardar una tarjeta y el equipo proponerle
   compras que ella confirma.

   POR AHORA SOLO CONFIGURA. Guardar una tarjeta y cobrar llegan cuando
   existan las claves y se pueda probar de verdad con las de prueba.

   POR QUÉ UNA CLAVE SE PEGA ACÁ Y LA OTRA NO
   Stripe da dos por entorno. La PUBLICABLE (pk_...) está hecha para que
   la vea cualquiera: viaja al navegador y dibuja el formulario de
   tarjeta. La SECRETA (sk_...) es con la que se cobra — quien la tenga
   puede mover dinero de la cuenta.

   Por eso la publicable se pega acá y la secreta NO: esa va al archivo
   .env del servidor, que no sale de ahí. Esta pantalla dice si está
   puesta y en qué modo, pero nunca la muestra. Ver admin/api/compras.php.

   CADA ENTORNO TIENE LA SUYA
   PBE y producción son dos servidores con dos .env y dos bases. Lo que
   se configure acá vale solo para el entorno en el que estás parado, y
   la pantalla lo dice arriba para que no haya dudas.
   ══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   VOLVER A ESCRIBIR LA CONTRASEÑA PARA TOCAR EL DINERO

   ⚡ POR QUÉ (2026-09-05)
   Estar dentro del panel bastaba para agregar una tarjeta o disparar un
   cobro, y las sesiones duran semanas. Un teléfono desbloqueado,
   prestado o perdido era acceso directo al dinero sin saber ninguna
   contraseña.

   Es lo mismo que hace cualquier tienda seria al pedirte la contraseña
   otra vez para tocar un método de pago aunque acabes de entrar: la
   sesión prueba que SIGUES ahí, no que SEAS tú.

   Esto es solo la mitad de la guarda. La que manda es la del servidor
   (exigirContrasenaDeNuevo en compras.php): sin ella, bastaría con
   llamar al endpoint saltándose esta pantalla.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Pide la contraseña en una ventana y la devuelve.
 *
 * Reusa el CSS y la guarda de confirmarAccion() (06-piezas.js) —
 * incluida CONFIRMACION_ABIERTA, para que esto y una confirmación no se
 * apilen tapándose. Lo que no reusa es la función misma: aquella
 * devuelve sí/no y acá hace falta un texto.
 *
 * @param {string} motivo - Qué se va a hacer, en una línea.
 * @returns {Promise<string|null>} La contraseña, o null si canceló.
 */
function pedirContrasenaParaDinero(motivo) {
  if (CONFIRMACION_ABIERTA) return Promise.resolve(null);

  return new Promise(resolve => {
    const capa = document.createElement('div');
    capa.className = 'confirmar';
    capa.setAttribute('role', 'alertdialog');
    capa.setAttribute('aria-modal', 'true');
    capa.innerHTML =
      '<div class="confirmar__fondo" data-clave="no"></div>' +
      '<div class="confirmar__panel">' +
        '<div class="confirmar__titulo">Confirma que eres tú</div>' +
        '<div class="confirmar__detalle">' + seguro(motivo) + '</div>' +
        '<input type="password" id="clave-dinero" class="campo__control" ' +
               'autocomplete="current-password" ' +
               'style="margin:var(--esp-2) 0" ' +
               'placeholder="Tu contraseña del panel">' +
        '<div class="confirmar__acciones">' +
          '<button class="boton" data-clave="no">Cancelar</button>' +
          '<button class="boton boton--principal" data-clave="si">Confirmar</button>' +
        '</div>' +
      '</div>';

    const campo = capa.querySelector('#clave-dinero');

    const responder = valor => {
      if (CONFIRMACION_ABIERTA !== capa) return;
      CONFIRMACION_ABIERTA = null;
      document.removeEventListener('keydown', porTecla, true);
      /* La contraseña se va con el nodo: no queda en ninguna variable
         viva, ni en el DOM, ni en un dataset. */
      campo.value = '';
      capa.remove();
      resolve(valor);
    };

    const porTecla = evento => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();   // que no cierre además la hoja de atrás
        responder(null);
      }
    };

    capa.addEventListener('click', evento => {
      const boton = evento.target.closest('[data-clave]');
      if (!boton) return;
      responder(boton.dataset.clave === 'si' ? (campo.value || '') : null);
    });

    // Enter manda, que es lo que espera cualquiera en un campo de clave.
    campo.addEventListener('keydown', evento => {
      if (evento.key !== 'Enter') return;
      evento.preventDefault();
      responder(campo.value || '');
    });

    document.addEventListener('keydown', porTecla, true);
    CONFIRMACION_ABIERTA = capa;
    document.body.appendChild(capa);
    campo.focus();
  });
}

/**
 * Manda algo que toca el dinero, pidiendo la contraseña SOLO si el
 * servidor la exige.
 *
 * ⚡ POR QUÉ ASÍ Y NO PREGUNTANDO ANTES (2026-09-05)
 * La contraseña vale un rato (ver la nota en compras.php), así que el
 * panel no puede saber por su cuenta si hace falta: el sello puede haber
 * caducado hace un segundo, o haberlo puesto otra pestaña. Preguntarle
 * al servidor primero sería un viaje de más en cada compra.
 *
 * Se intenta, y si contesta que falta la contraseña, se pide y se
 * reintenta. Quien manda sobre si hace falta es siempre el servidor —
 * el panel nunca decide saltársela.
 *
 * @param {string} ruta
 * @param {Object} cuerpo
 * @param {string} motivo - Qué se va a hacer, para la ventana.
 * @returns {Promise<*>} Lo que devolvió el servidor.
 * @throws Si falla por cualquier otra cosa, o si se canceló (código 0).
 */
async function mandarTocandoDinero(ruta, cuerpo, motivo) {
  try {
    return await mandar(ruta, cuerpo);
  } catch (error) {
    /* Solo se reintenta cuando el servidor dice EXACTAMENTE que falta la
       contraseña. Un 403 por otra cosa —o una contraseña equivocada— se
       deja pasar tal cual: reintentar ahí sería pedirla en bucle. */
    const laPide = error && error.codigo === 403 &&
                   /escribe tu contraseña/i.test(error.message || '');
    if (!laPide) throw error;

    const clave = await pedirContrasenaParaDinero(motivo);
    if (clave === null) {
      // Cancelado a propósito: no es un fallo que haya que gritar.
      const corte = new Error('');
      corte.codigo = 0;
      throw corte;
    }

    return await mandar(ruta, Object.assign({}, cuerpo, { contrasena: clave }));
  }
}

/**
 * Dice si el aviso de un movimiento de dinero salió, y si no, por qué.
 *
 * ⚡ POR QUÉ SE MUESTRA (2026-09-05)
 * Se guardó una tarjeta, el correo no llegó, y desde el panel no había
 * forma de saber si se había intentado siquiera: el fallo iba a un log
 * del servidor que nadie puede leer desde el teléfono. Un aviso que no
 * avisa Y no dice que falló es peor que no tenerlo, porque se confía.
 *
 * @param {Object|undefined} aviso - Lo que devolvió compras.php.
 * @returns {void}
 */
function contarComoSalioElAviso(aviso) {
  if (!aviso) return;

  if (aviso.fallos && aviso.fallos.length) {
    // El motivo entero: si el SMTP rechazó, ahí está lo que hay que arreglar.
    avisar('Se hizo, pero el aviso falló: ' + aviso.fallos.join(' · '), true);
    return;
  }

  if (!aviso.correos) {
    avisar('Se hizo, pero no se mandó ningún correo de aviso. ' +
           'Revisa CORREO_ADMINISTRADORA en el .env.', true);
  }
}

/**
 * Abre la pantalla de formas de pago.
 *
 * @returns {void}
 */
async function abrirFormasDePago() {
  if (USUARIO.rol !== 'admin') {
    avisar('Solo una cuenta admin configura los pagos.', true);
    return;
  }

  let cfg = null;
  try {
    cfg = await traer('compras.php?accion=config');
  } catch (error) {
    avisar(error.message, true);
    return;
  }

  const esPbe = cfg.entorno === 'pbe';

  /* ⚡ LO TÉCNICO YA NO ES LO PRIMERO QUE SE VE (2026-09-05)
   *
   * Esta pantalla abría con la clave publicable entera en un campo
   * ancho, un segundo campo con `STRIPE_CLAVE_SECRETA=sk_test_…`, e
   * instrucciones para editar el .env del servidor. Nada de eso le sirve
   * a quien usa el panel todos los días — y peor: le compite la atención
   * a lo único que importa, que es si se puede pagar y con qué tarjeta.
   * Un campo rotulado "clave secreta" invita a tocarlo, y tocarlo rompe
   * los pagos.
   *
   * Ahora arriba va solo lo que se usa —cómo está la conexión y las
   * tarjetas— y la configuración queda plegada, que hace falta una vez
   * en la vida. Ninguna comprobación se quita: los cuatro avisos de
   * estadoDeLaConexionDePagos() siguen enteros, arriba, donde se ven.
   *
   * Se usa <details>/<summary> nativo, igual que el acordeón de
   * etiquetas (06-piezas.js): sin JavaScript propio, con el teclado y el
   * lector de pantalla funcionando solos. */
  const tecnico =
    '<details class="pagos-tecnico" style="margin-top:var(--esp-4)">' +
      '<summary class="pagos-tecnico__titulo">' +
        'Configuración de la cuenta de pagos' +
        '<span class="vacio__texto" style="display:block;font-weight:400">' +
          'Solo hace falta al conectarla por primera vez' +
        '</span>' +
      '</summary>' +

      '<div style="padding-top:var(--esp-2)">' +
        '<p class="vacio__texto" style="margin:0 0 var(--esp-3)">' +
          (esPbe
            ? 'Acá van las claves de <strong>prueba</strong> de Stripe. Se puede ' +
              'guardar una tarjeta de mentira y probar todo sin mover un peso.'
            : 'Acá van las claves <strong>reales</strong>. Lo que se cobre con ' +
              'estas sale de la cuenta de verdad.') +
        '</p>' +

        campoTexto({
          id: 'pagos-publicable',
          rotulo: 'Clave publicable de Stripe',
          valor: cfg.publicable || '',
          ayuda: 'Empieza con pk_. Es la única que puede vivir acá: está hecha ' +
                 'para que la vea cualquiera.',
        }) +

        /* La secreta no tiene campo, a propósito: no hay dónde pegarla
           porque no tiene que pasar por acá. Solo se dice cómo ponerla. */
        '<div class="campo">' +
          '<span class="campo__rotulo">Clave secreta</span>' +
          '<p class="vacio__texto" style="margin:4px 0 8px">' +
            (cfg.secreta_puesta
              ? 'Ya está puesta en el servidor, en modo <strong>' +
                seguro(cfg.modo_secreta === 'real' ? 'real' : 'prueba') + '</strong>. ' +
                'No se muestra nunca, ni acá ni en ningún lado.'
              : '<strong>Todavía no está.</strong> No se pega en el panel: hay que ' +
                'agregarla al archivo <code>.env</code> de este servidor, por el ' +
                'administrador de archivos del hosting.') +
          '</p>' +
          '<div class="caja-codigo" style="font-family:monospace;font-size:13px;' +
               'padding:10px;border:1px solid var(--borde);border-radius:8px;' +
               'overflow-x:auto;white-space:nowrap">' +
            seguro(cfg.nombre_en_env) + '=' +
            (esPbe ? 'sk_test_...' : 'sk_live_...') +
          '</div>' +
          '<p class="vacio__texto" style="margin-top:6px">' +
            'Esa línea va al final del <code>.env</code>, igual que se hizo con ' +
            '<code>CARPETA_ARCHIVOS</code>. Después de guardarla, vuelve a abrir ' +
            'esta pantalla.' +
          '</p>' +
        '</div>' +

        pieDeFormulario('Guardar') +
      '</div>' +
    '</details>';

  const cuerpo = abrirHoja('Formas de pago',
    /* Lo primero, y bien visible: en qué entorno estás. Configurar la
       cuenta real creyendo que era la de pruebas es el error que hay
       que hacer imposible de cometer sin darse cuenta. */
    '<div class="etiqueta ' + (esPbe ? 'etiqueta--ojo' : 'etiqueta--alerta') + '" ' +
         'style="font-size:15px;padding:8px 12px">' +
      (esPbe ? 'Estás en PRUEBAS (pbe)' : 'Estás en el sitio REAL (producción)') +
    '</div>' +

    '<div style="margin-top:var(--esp-3)">' + estadoDeLaConexionDePagos(cfg) + '</div>' +

    /* Las tarjetas solo tienen sentido cuando la conexión está lista:
       sin claves no hay con qué hablarle a Stripe, y un formulario de
       tarjeta que no puede funcionar es peor que no mostrarlo. */
    (cfg.listo
      ? '<div class="campo">' +
          '<span class="campo__rotulo">Tarjetas guardadas</span>' +
          '<div id="pagos-tarjetas"><p class="vacio__texto">Buscando…</p></div>' +
          '<button type="button" class="boton" id="pagos-agregar" ' +
                  'style="margin-top:var(--esp-2)">Agregar una tarjeta</button>' +
        '</div>'
      : '') +

    tecnico);

  if (cfg.listo) {
    cargarTarjetas(cuerpo);
    buscar('#pagos-agregar', cuerpo).addEventListener('click', () =>
      abrirAgregarTarjeta(cfg, cuerpo));
  }

  buscar('#pie-guardar', cuerpo).addEventListener('click', async () => {
    const publicable = valorDe('pagos-publicable', cuerpo).trim();

    try {
      await mandar('compras.php?accion=guardar_config', { publicable: publicable });
      avisar(publicable ? 'Guardada.' : 'Clave quitada.');
      cerrarHoja(true);
      abrirFormasDePago();          // se reabre para mostrar el estado nuevo
    } catch (error) {
      avisar(error.message, true);
    }
  });
}

/**
 * El cartel de arriba que dice si la conexión sirve o qué le falta.
 *
 * Se separa de abrirFormasDePago() porque son cuatro casos con reglas
 * distintas, y mezclarlos con el armado de la hoja haría un bloque
 * imposible de leer.
 *
 * @param {Object} cfg - Lo que devuelve compras.php?accion=config.
 * @returns {string} HTML
 */
function estadoDeLaConexionDePagos(cfg) {
  const caja = (clase, texto) =>
    '<div class="' + clase + '" style="margin-bottom:var(--esp-3)">' + texto + '</div>';

  if (!cfg.publicable && !cfg.secreta_puesta) {
    return caja('aviso-error', 'Todavía no hay ninguna clave. Los pagos no funcionan.');
  }

  if (!cfg.secreta_puesta) {
    return caja('aviso-error',
      'Falta la clave secreta en el <code>.env</code> del servidor. ' +
      'Sin ella no se puede cobrar.');
  }

  if (!cfg.publicable) {
    return caja('aviso-error',
      'Falta la clave publicable. Sin ella no se puede mostrar el ' +
      'formulario para guardar una tarjeta.');
  }

  /* ⚠️ El caso peligroso: dos claves puestas pero de cuentas distintas.
     Falla recién al intentar cobrar, que es el peor momento posible
     para enterarse. Por eso se avisa fuerte y antes. */
  if (!cfg.modos_coinciden) {
    return caja('aviso-error',
      '<strong>Las dos claves no son del mismo par.</strong> ' +
      'La publicable es de <strong>' + seguro(cfg.modo_publicable || '¿?') + '</strong> ' +
      'y la secreta de <strong>' + seguro(cfg.modo_secreta || '¿?') + '</strong>. ' +
      'Tienen que ser las dos de prueba, o las dos reales. Así como está, ' +
      'el cobro va a fallar.');
  }

  /* ⚡ LAS DOS DE PRUEBA, PERO DE CUENTAS DISTINTAS (2026-09-05)
     El caso que costó una tarde: las dos claves eran de prueba, todo
     parecía bien, y la pantalla de agregar tarjeta salía sin campos
     donde escribirla. Stripe solo lo explicaba dentro de su iframe y en
     inglés. Es un error facilísimo de cometer —basta crear la clave
     restringida en otro sandbox— y no se ve hasta que alguien intenta
     guardar una tarjeta. Ahora se dice acá, antes de llegar ahí. */
  if (cfg.misma_cuenta === false) {
    return caja('aviso-error',
      '<strong>Las dos claves son de cuentas de Stripe distintas.</strong> ' +
      'Las dos son de ' + seguro(cfg.modo_publicable || 'prueba') + ', pero ' +
      'salieron de sitios diferentes, y así no se puede guardar ninguna ' +
      'tarjeta. Copia las dos claves de la <strong>misma</strong> pantalla de ' +
      'Stripe: la publicable de arriba y la restringida que crees ahí mismo.');
  }

  /* Coinciden entre sí, pero no con el entorno. No es un error: puede
     haber un motivo. Se informa y se sigue. */
  if (cfg.modo_publicable !== cfg.modo_esperado) {
    return caja('aviso',
      'Ojo: estás en <strong>' +
      (cfg.entorno === 'pbe' ? 'pruebas' : 'el sitio real') + '</strong> ' +
      'con claves de <strong>' + seguro(cfg.modo_publicable) + '</strong>. ' +
      'Funciona, pero revisa que sea a propósito.');
  }

  return caja('aviso-ok',
    'Conexión lista, en modo <strong>' + seguro(cfg.modo_publicable) + '</strong>.');
}


/* ═══ LAS TARJETAS ═════════════════════════════════════

   ⚠️ ESTE ARCHIVO NUNCA VE UN NÚMERO DE TARJETA.
   El formulario donde se escribe la tarjeta lo dibuja Stripe dentro de
   un iframe suyo, servido desde su dominio. Nuestro JavaScript no puede
   leer adentro de ese iframe -el navegador no lo permite entre
   dominios distintos- y ese es justamente el punto: aunque este archivo
   quisiera espiar el número, no podría.

   Lo que vuelve de ahí es un `pm_...`: una etiqueta que solo sirve
   contra la clave secreta que vive en el .env del servidor.

   POR QUÉ STRIPE.JS SE CARGA DESDE SU DOMINIO Y NO SE COPIA ACÁ
   Porque Stripe no lo permite, y con razón: si el archivo estuviera
   copiado en nuestro servidor, cualquiera que entrara al hosting podría
   cambiarlo por uno que sí robe el número. Cargándolo de js.stripe.com,
   la única forma de manipularlo es entrar a Stripe.
   ══════════════════════════════════════════════════════════════════════ */

/** La carga de Stripe.js, para no pedirla dos veces. */
let cargaDeStripeJs = null;

/**
 * Trae Stripe.js si todavía no está.
 *
 * Mismo patrón y mismo tope de tiempo que cargarLeaflet() en
 * 49-direcciones.js: bajo demanda, al abrir la hoja, y con reloj — una
 * conexión que no cierra dejaría la promesa colgada para siempre.
 *
 * @returns {Promise<boolean>} true si quedó usable.
 */
function cargarStripeJs() {
  if (typeof Stripe !== 'undefined') return Promise.resolve(true);
  if (cargaDeStripeJs) return cargaDeStripeJs;

  cargaDeStripeJs = new Promise(resolver => {
    let yaTermino = false;
    const terminar = () => {
      if (yaTermino) return;
      yaTermino = true;
      resolver(typeof Stripe !== 'undefined');
    };

    const reloj = setTimeout(terminar, 8000);
    const listo = () => { clearTimeout(reloj); terminar(); };

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = listo;
    script.onerror = listo;
    document.head.appendChild(script);
  });

  return cargaDeStripeJs;
}

/**
 * Pide las tarjetas y las pinta.
 *
 * @param {Element} cuerpo
 * @returns {Promise<void>}
 */
async function cargarTarjetas(cuerpo) {
  const donde = buscar('#pagos-tarjetas', cuerpo);
  if (!donde) return;

  try {
    const r = await traer('compras.php?accion=listar_metodos');
    pintarTarjetas(donde, (r.filas || []).filter(t => Number(t.activo) === 1), cuerpo);
  } catch (error) {
    pintarError(donde, error.message, () => cargarTarjetas(cuerpo));
  }
}

/**
 * Dibuja la lista de tarjetas.
 *
 * @param {Element} donde
 * @param {Array} tarjetas
 * @param {Element} cuerpo
 * @returns {void}
 */
function pintarTarjetas(donde, tarjetas, cuerpo) {
  if (!tarjetas.length) {
    donde.innerHTML = '<p class="vacio__texto">Todavía no hay ninguna. ' +
      'Sin una tarjeta guardada, el equipo puede proponerte compras pero ' +
      'no se pueden cobrar.</p>';
    return;
  }

  donde.innerHTML = tarjetas.map(t => {
    const deSiempre = Number(t.es_predeterminado) === 1;

    /* El vencimiento con dos dígitos: "3/2027" se lee mal al lado de
       "11/2027", y esta lista existe para reconocer de un vistazo. */
    const mes = String(t.exp_month || '').padStart(2, '0');

    return '<div class="lista__fila" style="cursor:default">' +
      '<span class="lista__cuerpo">' +
        '<span class="lista__titulo">' +
          seguro(t.brand || 'Tarjeta') + ' ···' + seguro(t.last4 || '????') +
          (deSiempre ? ' <span class="etiqueta etiqueta--bien">la de siempre</span>' : '') +
        '</span>' +
        '<span class="lista__pie">Vence ' + seguro(mes) + '/' + seguro(t.exp_year) + '</span>' +
      '</span>' +
      '<span class="acciones">' +
        (deSiempre ? '' :
          '<button type="button" class="boton boton--chico" data-siempre="' +
            seguro(t.id) + '">Usar esta</button>') +
        '<button type="button" class="boton boton--chico boton--peligro" data-quitar="' +
          seguro(t.id) + '">Quitar</button>' +
      '</span>' +
    '</div>';
  }).join('');

  buscarTodos('[data-siempre]', donde).forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        await mandar('compras.php?accion=predeterminar_metodo',
                     { id: Number(boton.dataset.siempre) });
        avisar('Ahora las compras se cobran a esa tarjeta.');
        cargarTarjetas(cuerpo);
      } catch (error) { avisar(error.message, true); }
    });
  });

  buscarTodos('[data-quitar]', donde).forEach(boton => {
    boton.addEventListener('click', async () => {
      if (!await confirmarAccion(
        '¿Quitar esta tarjeta?\n\n' +
        'Deja de poder usarse para cobrar, acá y en Stripe. Las compras ' +
        'que ya se pagaron con ella la siguen nombrando.',
        { confirmar: 'Quitarla', cancelar: 'Dejarla' })) return;

      try {
        const r = await mandarTocandoDinero('compras.php?accion=desactivar_metodo',
                                            { id: Number(boton.dataset.quitar) },
                                            'Vas a quitar una tarjeta.');
        avisar('Tarjeta quitada.');
        contarComoSalioElAviso(r && r.aviso);
        cargarTarjetas(cuerpo);
      } catch (error) {
        // codigo 0 = lo canceló ella misma; no hay nada que avisar.
        if (error && error.codigo !== 0) avisar(error.message, true);
      }
    });
  });
}

/**
 * La hoja para agregar una tarjeta.
 *
 * @param {Object} cfg      - Lo que devolvió compras.php?accion=config.
 * @param {Element} deVuelta - La pantalla de pagos, para repintarla.
 * @returns {Promise<void>}
 */
async function abrirAgregarTarjeta(cfg, deVuelta) {
  /* ⚡ LA HOJA NO PUEDE SER UN CAMPO FLOTANDO EN EL VACÍO (2026-09-06)
   *
   * EL PROBLEMA
   * Quedaba una línea de texto, un campo de una sola fila, y ochenta
   * píxeles de nada hasta el botón. Era el ÚNICO formulario del panel
   * sin un solo rótulo —compárese con "Nueva dirección", que rotula
   * cada campo— y en producción se veía peor todavía, porque el aviso
   * de arriba es más corto que el de pruebas.
   *
   * Los 120 px de hueco venían de un `min-height` puesto para el
   * Payment Element, que era alto porque traía país, correo y billetera.
   * Al cambiarlo por el elemento de tarjeta —tres campos en una fila—
   * el mínimo dejó de tener sentido y quedó como vacío.
   *
   * QUÉ SE HACE
   * Se rotula el campo como cualquier otro del panel, y debajo va lo que
   * de verdad tranquiliza a quien está por escribir un número de
   * tarjeta: que el número no pasa por acá. Eso NO es relleno — es la
   * respuesta a la pregunta que uno se hace justo en ese momento, y
   * antes solo se decía en producción y perdida en el párrafo de arriba.
   *
   * El mínimo se queda en lo que mide el campo real (44 px), y solo
   * mientras carga: así no salta al aparecer, pero tampoco sobra. */
  const cuerpo = abrirHoja('Agregar una tarjeta',
    (cfg.modo_publicable === 'prueba'
      ? '<div class="etiqueta etiqueta--ojo" style="margin-bottom:var(--esp-3)">' +
          'Estás en pruebas: usa 4242 4242 4242 4242, cualquier fecha ' +
          'futura y cualquier código. No se mueve un peso.' +
        '</div>'
      : '') +

    '<div class="campo">' +
      '<span class="campo__rotulo">Datos de la tarjeta</span>' +
      '<div id="pagos-recuadro" style="min-height:44px">' +
        '<p class="vacio__texto">Cargando el formulario seguro…</p>' +
      '</div>' +
      // `vacio__texto` es la clase de ayuda que usa campoTexto()
      // (06-piezas.js): el mismo gris tenue que el resto del panel.
      '<span class="vacio__texto" style="margin-top:var(--esp-2)">' +
        'El número lo recibe Stripe directamente: este panel no lo ve ni ' +
        'lo guarda. Queda para cobrar las compras que confirmes, y puedes ' +
        'quitarla cuando quieras.' +
      '</span>' +
    '</div>' +

    pieDeFormulario('Guardar la tarjeta'));

  const guardar = buscar('#pie-guardar', cuerpo);
  const recuadro = buscar('#pagos-recuadro', cuerpo);

  // Hasta que Stripe no esté listo, el botón no puede hacer nada útil.
  guardar.disabled = true;

  const hay = await cargarStripeJs();
  if (!cuerpo.isConnected) return;      // la cerró mientras cargaba

  if (!hay || !cfg.publicable) {
    recuadro.innerHTML = '<p class="aviso-error">No se pudo cargar el ' +
      'formulario seguro de Stripe. Revisa tu conexión y vuelve a intentar.</p>';
    return;
  }

  let intento = null;
  try {
    intento = await mandar('compras.php?accion=setup_intent', {});
  } catch (error) {
    recuadro.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  const stripe = Stripe(cfg.publicable);

  /* ⚡ EL ELEMENTO DE TARJETA, NO EL "PAYMENT ELEMENT" (2026-09-05)
   *
   * EL PROBLEMA
   * El Payment Element daba «Se produjo un error de procesamiento» al
   * guardar, sin más detalle. Se comprobó contra esta misma cuenta que
   * Stripe procesa tarjetas sin problema —dos tarjetas de prueba
   * distintas, las dos succeeded, por confirmCardSetup— así que el
   * fallo estaba en ese componente y no en la cuenta.
   *
   * POR QUÉ ESTE EN SU LUGAR
   * El Payment Element está pensado para una tienda: trae Link, país,
   * billetera, correo y teléfono. Acá no se está cobrando a un cliente
   * que llega de fuera: se está guardando LA tarjeta del evento, la de
   * quien organiza, para cobrar compras que ella misma confirma. De todo
   * eso, lo único que hace falta son tres campos.
   *
   * Menos piezas es menos superficie de fallo, y este camino
   * —elements.create('card') + confirmCardSetup()— es exactamente el que
   * se verificó funcionando contra esta cuenta antes de cambiarlo.
   */
  const elementos = stripe.elements({
    /* Que el formulario de Stripe no desentone con el panel, que es
       oscuro. Sin esto aparece un recuadro blanco en medio de una
       pantalla negra y parece que se rompió algo. */
    appearance: { theme: 'night' },
  });

  /* ⚡ EL BOTÓN NO SE ENCIENDE HASTA QUE EL FORMULARIO ESTÁ DIBUJADO
   *   (2026-09-05)
   *
   * EL SÍNTOMA
   * La hoja mostraba el aviso y el botón "Guardar la tarjeta", pero sin
   * ningún campo donde escribirla. Al pulsarlo, se quedaba en
   * "Guardando…" para siempre.
   *
   * LA CAUSA
   * Acá se hacía mount() y en la línea siguiente se habilitaba el botón.
   * Pero mount() es asíncrono: solo ARRANCA el dibujado del formulario,
   * que vive en un iframe de Stripe y puede tardar o fallar. Si no
   * llegaba a montarse, el botón quedaba activo igual — y confirmSetup()
   * sin campos que confirmar no resuelve nunca. De ahí el cuelgue.
   *
   * Ahora manda el propio elemento: el botón se enciende con `ready`, y
   * si Stripe no puede cargarlo lo dice en pantalla en vez de dejar una
   * hoja muda con un botón que no lleva a ningún lado. */
  recuadro.innerHTML = '';
  /* El mínimo era para que no saltara mientras cargaba el cartel. Con el
     campo ya dibujado sobra: dejarlo puesto es el hueco vacío que había
     debajo del formulario. */
  recuadro.style.minHeight = '';

  const campos = elementos.create('card', {
    // El nombre del titular no hace falta para guardar la tarjeta, y
    // pedirlo es un campo más donde equivocarse.
    hidePostalCode: true,
  });
  let listo = false;

  campos.on('ready', () => {
    listo = true;
    guardar.disabled = false;
  });

  /* Stripe avisa por acá cuando no pudo cargar el formulario (una clave
     que no corresponde, un SetupIntent ya usado, la red). Sin escucharlo
     el fallo era invisible. */
  campos.on('loaderror', evento => {
    const porque = (evento && evento.error && evento.error.message) ||
                   'Stripe no pudo cargar el formulario.';
    recuadro.innerHTML = '<p class="aviso-error">' + seguro(porque) + '</p>';
    guardar.disabled = true;
  });

  campos.mount(recuadro);

  /* Y si no dice ni que está listo ni que falló —el caso mudo, que es el
     peor— se avisa igual. Vale más un mensaje que una pantalla en la que
     no se puede hacer nada y no se sabe por qué. */
  setTimeout(() => {
    if (listo || !recuadro.isConnected || !guardar.disabled) return;
    recuadro.innerHTML = '<p class="aviso-error">El formulario de Stripe no ' +
      'terminó de cargar. Cierra y vuelve a abrir esta pantalla; si sigue ' +
      'igual, revisa la conexión.</p>';
  }, 15000);

  guardar.addEventListener('click', async () => {
    /* Doble seguro: si algo dejara el botón activo sin formulario
       montado, confirmSetup() no resolvería nunca y la pantalla quedaría
       en "Guardando…" para siempre. Antes que colgarse, se dice. */
    if (!listo) {
      avisar('El formulario de la tarjeta no terminó de cargar. Cierra y ' +
             'vuelve a abrir esta pantalla.', true);
      return;
    }

    /* ⚡ ACÁ SÍ SE PREGUNTA ANTES, Y NO AL REINTENTAR (2026-09-05)
       En el resto se usa mandarTocandoDinero(), que intenta y pide la
       contraseña solo si el servidor la exige. Acá no sirve ese orden:
       si se pidiera DESPUÉS de confirmSetup(), cancelar dejaría la
       tarjeta ya adjunta al cliente en Stripe y sin fila de este lado —
       un token huérfano, cobrable, que no aparece en ninguna pantalla.

       Por eso se mira `cfg.pide_contrasena`, que el servidor calculó al
       abrir la pantalla: si el sello sigue vivo, no se molesta a nadie.
       Y si caducó en el medio, el envío de abajo la pide igual. */
    let clave = null;
    if (cfg.pide_contrasena) {
      clave = await pedirContrasenaParaDinero(
        'Vas a guardar una tarjeta para las compras del evento.');
      if (clave === null) return;
    }

    guardar.disabled = true;
    const rotulo = guardar.textContent;
    guardar.textContent = 'Guardando…';

    /* `redirect: 'if_required'` evita que Stripe se lleve la página a
       otro lado salvo que el banco lo exija de verdad. Con una tarjeta
       normal se resuelve acá mismo y la hoja no se pierde. */
    /* Con tope: si Stripe no contesta —su iframe caído, la red a medias—
       la promesa se queda esperando y el botón diría "Guardando…"
       indefinidamente. Un minuto es de sobra para una tarjeta. */
    const r = await Promise.race([
      stripe.confirmCardSetup(intento.client_secret, { payment_method: { card: campos } }),
      new Promise(rendirse => setTimeout(
        () => rendirse({ error: { message: 'Stripe no respondió a tiempo. Vuelve a intentar.' } }),
        60000)),
    ]);

    if (r.error) {
      /* ⚡ EL MENSAJE SOLO NO ALCANZA (2026-09-05)
       * Stripe contestó «Se produjo un error de procesamiento» y ahí se
       * acababa la información: ese texto es el mismo para causas muy
       * distintas y no se puede arreglar nada con él. El código y el
       * tipo sí dicen qué pasó, y no cuestan nada: van a la pantalla
       * junto al mensaje, y completos a la consola. */
      const e = r.error;
      const pistas = [e.code, e.decline_code, e.type].filter(Boolean).join(' · ');

      console.error('[Ania XV · pagos] confirmSetup falló:', e);
      avisar((e.message || 'No se pudo guardar la tarjeta.') +
             (pistas ? ' (' + pistas + ')' : ''), true);

      guardar.disabled = false;
      guardar.textContent = rotulo;
      return;
    }

    const pm = r.setupIntent && r.setupIntent.payment_method;
    if (!pm) {
      avisar('Stripe no devolvió la tarjeta. Vuelve a intentar.', true);
      guardar.disabled = false;
      guardar.textContent = rotulo;
      return;
    }

    try {
      /* Se manda solo el identificador. La marca y los últimos cuatro
         los averigua el servidor preguntándole a Stripe: si los mandara
         el navegador, cualquiera podría guardar una "Visa ···0000". */
      const cuerpo = { payment_method_id: pm };
      if (clave !== null) cuerpo.contrasena = clave;

      const r = await mandarTocandoDinero('compras.php?accion=guardar_metodo', cuerpo,
                                'Vas a guardar una tarjeta para las compras del evento.');
      avisar('Tarjeta guardada.');
      contarComoSalioElAviso(r && r.aviso);
      cerrarHoja(true);
      if (deVuelta) cargarTarjetas(deVuelta);
    } catch (error) {
      if (error && error.codigo !== 0) avisar(error.message, true);
      guardar.disabled = false;
      guardar.textContent = rotulo;
    }
  });
}
