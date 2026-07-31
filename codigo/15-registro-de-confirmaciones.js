/* ══════════════════════════════════════════════════════════════════════
   15 · REGISTRO DE CONFIRMACIONES  (versión MySQL + Google Sheets)
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos canales en paralelo, por redundancia:

   · CANAL 1, PHP/MySQL de Hostinger (nuevo)
     Llama a confirmar.php en el servidor. El PHP guarda en la base de
     datos Y manda los dos correos (invitado + Lucila).

   · CANAL 2, Google Sheets (igual que antes, como respaldo)
     Si está configurado en 01-configuracion.js, sigue funcionando.
     Si no, simplemente no hace nada.

   Si el canal PHP falla (servidor caído, red mala), el pase igual
   aparece: el error es silencioso para el invitado.

   ÍNDICE
   1. Enviar al servidor PHP (MySQL + correos)
   2. Anotar en Google Sheets (respaldo, igual que antes)
   3. Reintento de las que quedaron pendientes
   4. El acceso discreto del pie
   ══════════════════════════════════════════════════════════════════════ */

/* ─── 1. ENVIAR AL SERVIDOR PHP ──────────────────────────────────────── */

/**
 * Manda los datos al archivo confirmar.php en Hostinger.
 * El PHP se encarga de guardar en MySQL y mandar los dos correos.
 *
 * @param {Object} datos - Los datos de la confirmación (mismo objeto de siempre).
 * @returns {Promise<boolean>} true si el servidor confirmó que guardó.
 */
async function enviarAlServidor(datos) {
  try {
    const respuesta = await fetch('/confirmar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(datos),
    });

    if (!respuesta.ok) {
      console.warn('[Ania XV] El servidor respondió con error HTTP:', respuesta.status);
      return false;
    }

    const json = await respuesta.json();
    if (json.ok) {
      console.info('[Ania XV] Confirmación guardada en MySQL y correos enviados.');
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

/* ─── 2. ANOTAR EN GOOGLE SHEETS (respaldo, igual que antes) ─────────── */

/** Dónde se guardan las confirmaciones que no se pudieron anotar. */
const MEMORIA_DE_PENDIENTES = 'registro-pendiente';

/**
 * Arma la fila que se va a anotar en la hoja.
 * Los nombres están en español y sin abreviar porque quien va a leer
 * esa hoja es una persona, no un programa.
 *
 * @param {Object} datos - Los datos de la confirmación.
 * @returns {Object} La fila lista para mandar.
 */
function armarLaFilaDeLaHoja(datos) {
  return {
    momento: new Date().toISOString(),
    nombre: datos.nombre,
    correo: datos.correo,
    asiste: datos.asiste ? 'Sí' : 'No',
    adultos: datos.adultos,
    ninos: datos.ninos,
    total: datos.adultos + datos.ninos,
    menus: datos.detalleDeMenus,
    resumen: datos.resumenDeMenus,
    alergias: datos.alergias,
    notas: datos.notas,
    codigo: datos.codigo,
  };
}

/* ─── 1B. FIRMA DE INTEGRIDAD (HMAC) ──────────────────────────────────
   Igual que antes: firma la fila antes de mandarla a Google.           */

function cadenaCanonica(fila) {
  return [fila.momento, fila.codigo, fila.correo, fila.asiste, fila.total].join('|');
}

async function firmarLaFila(fila) {
  const clave = CONFIGURACION.registro.claveDeFirma;
  if (!clave || clave.startsWith('PEGA_AQUI')) return fila;
  if (!(window.crypto && crypto.subtle)) return fila;

  try {
    const codificador = new TextEncoder();
    const llave = await crypto.subtle.importKey(
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
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(fila),
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
 * Anota en Google Sheets si está configurado. Es el canal de respaldo.
 * Se llama SIEMPRE (asiste o no), igual que antes.
 *
 * @param {Object} datos - Los datos de la confirmación.
 * @returns {Promise<boolean>}
 */
async function anotarEnLaHoja(datos) {
  const direccion = CONFIGURACION.registro.urlParaAnotar;

  if (!direccion || direccion.startsWith('PEGA_AQUI')) {
    /* Sin hoja configurada: silencio total, no es un error. */
    return false;
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
  console.warn(
    'No se pudo anotar en la hoja. Quedó guardada y se reintentará ' +
    'la próxima vez que se abra la invitación.'
  );
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
