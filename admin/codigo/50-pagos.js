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

  const cuerpo = abrirHoja('Formas de pago',
    /* Lo primero, y bien visible: en qué entorno estás. Configurar la
       cuenta real creyendo que era la de pruebas es el error que hay
       que hacer imposible de cometer sin darse cuenta. */
    '<div class="etiqueta ' + (esPbe ? 'etiqueta--ojo' : 'etiqueta--alerta') + '" ' +
         'style="font-size:15px;padding:8px 12px">' +
      (esPbe ? 'Estás en PRUEBAS (pbe)' : 'Estás en el sitio REAL (producción)') +
    '</div>' +

    '<p class="vacio__texto" style="margin:var(--esp-2) 0 var(--esp-3)">' +
      (esPbe
        ? 'Acá van las claves de <strong>prueba</strong> de Stripe. Se puede ' +
          'guardar una tarjeta de mentira y probar todo sin mover un peso.'
        : 'Acá van las claves <strong>reales</strong>. Lo que se cobre con ' +
          'estas sale de la cuenta de verdad.') +
    '</p>' +

    estadoDeLaConexionDePagos(cfg) +

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

    pieDeFormulario('Guardar'));

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
