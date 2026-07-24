/* ══════════════════════════════════════════════════════════════════════
   15 · REGISTRO DE CONFIRMACIONES
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Dos cosas chiquitas y relacionadas:
     · manda cada confirmación a una hoja de cálculo de Google
     · pone el acceso discreto al pie que abre esa hoja

   POR QUÉ UNA HOJA Y NO UN PANEL DENTRO DE LA WEB
   La web es estática: no tiene servidor ni base de datos. Lo que el
   invitado confirma se guarda en SU navegador (ver guardarEnMemoria en
   02-utilidades.js), así que desde acá es imposible ver la lista de
   todos: cada pase vive en el celular de cada persona.

   La hoja de cálculo resuelve eso y de paso ya viene con todo lo que un
   panel casero tendría que reprogramar: ordenar, filtrar, sumar,
   descargar a Excel, abrir desde el celular, compartir con el salón.

   EL CORREO Y LA HOJA NO COMPITEN
   El correo avisa EN EL MOMENTO —suena el teléfono y hay un confirmado
   nuevo—. La hoja lleva EL ACUMULADO. Son dos canales distintos a
   propósito: si un día Google falla, la confirmación igual llegó por
   correo y se puede anotar a mano.

   CÓMO SABEMOS QUE LA FILA SE ANOTÓ (las tres redes)
     1. Google contesta si anotó o no, y lo leemos.
     2. Si falla, se reintenta una vez enseguida.
     3. Si igual falla, la confirmación queda GUARDADA EN EL NAVEGADOR
        como pendiente, y se reintenta sola la próxima vez que esa
        persona abra la invitación (cosa que pasa seguido: vuelven a
        mirar el pase, la fecha o el mapa).
   Y por encima de las tres está el correo, que viaja por otro camino.

   ÍNDICE
     1. Anotar la confirmación en la hoja
     2. Reintento de las que quedaron pendientes
     3. El acceso discreto del pie
   ══════════════════════════════════════════════════════════════════════ */


/* ─── 1. ANOTAR LA CONFIRMACIÓN EN LA HOJA ──────────────────────────── */

/** Dónde se guardan las confirmaciones que no se pudieron anotar. */
const MEMORIA_DE_PENDIENTES = 'registro-pendiente';

/**
 * Arma la fila que se va a anotar en la hoja.
 *
 * Los nombres están en español y sin abreviar porque quien va a leer
 * esa hoja es una persona, no un programa.
 *
 * @param {Object} datos - Los datos de la confirmación.
 * @returns {Object} La fila lista para mandar.
 */
function armarLaFilaDeLaHoja(datos) {
  return {
    momento:  new Date().toISOString(),
    nombre:   datos.nombre,
    correo:   datos.correo,
    asiste:   datos.asiste ? 'Sí' : 'No',
    adultos:  datos.adultos,
    ninos:    datos.ninos,
    total:    datos.adultos + datos.ninos,
    menus:    datos.detalleDeMenus,
    resumen:  datos.resumenDeMenus,
    alergias: datos.alergias,
    notas:    datos.notas,
    codigo:   datos.codigo,
  };
}

/* ─── 1B. FIRMA DE INTEGRIDAD (HMAC) ──────────────────────────────────
   Antes de mandar cada confirmación, la firmamos con una clave compartida
   con el script de Google. El script rechaza lo que no traiga una firma
   válida. Sube la barrera contra confirmaciones falsas o basura inyectadas
   al endpoint. (Salvedad honesta en 01-configuracion.js: la clave vive en
   el cliente, así que es un disuasivo, no una garantía.)

   Los campos que se firman van en un ORDEN FIJO y con separador '|'. El
   script arma exactamente la misma cadena y compara. Si cambia cualquiera
   de esos campos en el camino, la firma no coincide y la fila se descarta. */

/** Los campos firmados, en orden. Debe coincidir con el README (Apps Script). */
function cadenaCanonica(fila) {
  return [fila.momento, fila.codigo, fila.correo, fila.asiste, fila.total].join('|');
}

/**
 * Devuelve la fila con un campo `firma` (HMAC-SHA256 en hexadecimal).
 *
 * Si no hay clave configurada, o el navegador no expone Web Crypto (por
 * ejemplo al abrir como archivo local, sin https), devuelve la fila TAL CUAL:
 * la web sigue funcionando y el script acepta como siempre.
 *
 * @param {Object} fila
 * @returns {Promise<Object>}
 */
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
    // Si algo falla al firmar, mandamos sin firma antes que perder la confirmación.
    console.warn('No se pudo firmar la confirmación; se manda sin firma:', error);
    return fila;
  }
}

/**
 * Manda UNA fila a la hoja y averigua si llegó.
 *
 * POR QUÉ SÍ PODEMOS SABER SI LLEGÓ
 * Los navegadores no dejan que una web lea la respuesta de otro dominio
 * salvo que ese dominio lo autorice. Google Apps Script sí autoriza,
 * pero con una condición: el pedido tiene que ser de los "simples", los
 * que el navegador manda directo sin pedir permiso antes.
 *
 * Por eso el contenido viaja declarado como texto plano y no como JSON:
 * apenas decimos "esto es JSON", el navegador manda primero una consulta
 * de permiso que Apps Script no contesta bien, y el envío se cae. El
 * contenido ES json igual —del otro lado se interpreta como tal—, solo
 * que no lo anunciamos.
 *
 * @param {Object} fila - La fila a anotar.
 * @returns {Promise<boolean>} true solo si Google confirmó que la anotó.
 */
async function mandarLaFilaAGoogle(fila) {
  const respuesta = await fetch(CONFIGURACION.registro.urlParaAnotar, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(fila),
    redirect: 'follow',
  });

  if (!respuesta.ok) return false;

  /* Google contesta algo como {"ok":true,"fila":7}. Si en vez de eso
     llega una pantalla de error de Google (que es HTML), JSON.parse
     protesta y lo tratamos como fallo, que es lo que es. */
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto).ok === true;
  } catch (error) {
    console.warn('La hoja contestó algo inesperado:', texto.slice(0, 200));
    return false;
  }
}

/**
 * Anota una confirmación en la hoja, con reintento y con pendientes.
 *
 * @param {Object} datos - Los datos de la confirmación.
 * @returns {Promise<boolean>} true si quedó anotada.
 *
 * @example
 *   await anotarEnLaHoja({ nombre: 'Ana', adultos: 2, ... });
 */
async function anotarEnLaHoja(datos) {
  const direccion = CONFIGURACION.registro.urlParaAnotar;

  // ¿Está configurado? Si no, avisamos por consola y seguimos.
  if (!direccion || direccion.startsWith('PEGA_AQUI')) {
    console.info(
      'La hoja de cálculo todavía no está configurada, así que esta ' +
      'confirmación no quedó anotada. La web funciona igual. Para ' +
      'activarlo, seguí la sección 6 del README.'
    );
    return false;
  }

  /* Se firma UNA vez y se usa la fila firmada tanto para mandar como para
     guardar como pendiente: así, si se reintenta más tarde, la firma sigue
     siendo la correcta (cubre los mismos datos y el mismo momento). */
  const fila = await firmarLaFila(armarLaFilaDeLaHoja(datos));

  /* Dos intentos. El primero falla casi siempre por algo pasajero —el
     celular cambiando de wifi a datos, Google tardando—, así que vale
     la pena esperar un segundo y volver a probar antes de rendirse. */
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

  /* Se agotaron los intentos. En vez de perder la confirmación, queda
     guardada en el navegador de esta persona: la próxima vez que abra
     la invitación se reintenta sola (ver el bloque 2).

     Es la misma fila de antes, con su momento original: si se anota
     mañana, en la hoja va a figurar la hora en que la persona confirmó
     de verdad, no la hora del reintento. */
  guardarEnMemoria(MEMORIA_DE_PENDIENTES, fila);
  console.warn(
    'No se pudo anotar la confirmación en la hoja. Quedó guardada y se ' +
    'va a reintentar la próxima vez que se abra la invitación.'
  );
  return false;
}


/* ─── 2. REINTENTO DE LAS QUE QUEDARON PENDIENTES ───────────────────── */

(function reintentaLasPendientes() {
  const pendiente = leerDeMemoria(MEMORIA_DE_PENDIENTES, null);
  if (!pendiente) return;

  const direccion = CONFIGURACION.registro.urlParaAnotar;
  if (!direccion || direccion.startsWith('PEGA_AQUI')) return;

  /* Se hace en silencio y sin apuro: esta persona ya confirmó y no
     tiene por qué enterarse de nada. Un solo intento por visita, para
     no insistirle al servidor si el problema es de fondo. */
  mandarLaFilaAGoogle(pendiente)
    .then(seAnoto => {
      if (seAnoto) {
        borrarDeMemoria(MEMORIA_DE_PENDIENTES);
        console.info('Se anotó en la hoja una confirmación que había quedado pendiente.');
      }
    })
    .catch(() => { /* Sigue pendiente para la próxima visita. */ });
})();


/* ─── 3. EL ACCESO DISCRETO DEL PIE ─────────────────────────────────── */

(function preparaElAccesoAlRegistro() {
  /* El botón secreto es LA ROSA del pie de página. Parece un adorno más
     —nadie sospecha que se toca—, y esa es toda la gracia. */
  const rosa = buscar('#rosa-secreta');
  if (!rosa) return;

  const direccion = CONFIGURACION.registro.urlDeLaHoja;

  /* Sin hoja configurada no hay nada que abrir. La rosa NO se saca (es un
     adorno del pie): solo no se le pone el comportamiento secreto. */
  if (!direccion || direccion.startsWith('PEGA_AQUI')) return;

  /* POR QUÉ TRES TOQUES Y NO UNO
     Un botón de un solo clic al pie se pisa sin querer, sobre todo en el
     celular, donde el dedo tapa lo que toca. Y el invitado que lo pisa se
     encuentra de golpe con una pantalla de Google pidiendo permisos: queda
     raro y preocupa.

     Tres toques seguidos no pasan por accidente. Y como no hay forma de
     adivinar que hay que darlos —ni que la rosa se toca—, funciona además
     como una cerradura simple: el que sabe, entra.

     La rosa FLORECE un poco con cada toque (crece y brilla). Sin eso, quien
     conoce el truco no sabría si la cuenta va bien o si el primer toque no
     registró. */

  const TOQUES_NECESARIOS = 3;
  const VENTANA_DE_TIEMPO = 1500;  // ms para completar los tres

  let toques = 0;
  let reloj = null;

  rosa.style.cursor = 'default';   // no delata que es un botón

  /**
   * Devuelve la rosa a su estado de reposo y olvida los toques contados.
   * @returns {void}
   */
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

    // La rosa florece un poco más con cada toque.
    rosa.classList.toggle('contando-1', toques === 1);
    rosa.classList.toggle('contando-2', toques === 2);

    /* Si la persona se detiene, la cuenta se borra: la rosa no queda "a dos
       toques de abrirse" para siempre, y un toque suelto de hace un rato no
       se suma a los de ahora. */
    clearTimeout(reloj);
    reloj = setTimeout(volverAEmpezar, VENTANA_DE_TIEMPO);
  });

  /* QUÉ PROTEGE ESTO, Y QUÉ NO
     Ser discreto no es ser seguro: cualquiera que mire el código encuentra
     esta dirección. Quien cuida los datos de verdad es Google: la hoja está
     compartida solo con las cuentas de quienes organizan, y si alguien más
     la abre ve "no tenés permiso". Los tres toques son para que ningún
     invitado la pise de casualidad, no para esconderla de quien la busca. */
})();
