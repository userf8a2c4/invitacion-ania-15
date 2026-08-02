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
