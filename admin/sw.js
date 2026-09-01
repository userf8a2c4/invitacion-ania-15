/* ══════════════════════════════════════════════════════════════════════
   SERVICE WORKER DEL PANEL · que la app abra al instante

   QUÉ HACE ESTE ARCHIVO
   Guarda una copia del armazón de la app (el HTML, los CSS y los JS) para
   que el panel abra sin esperar, incluso con mala señal. Es lo que hace
   que se sienta una app y no una página web.

   LA REGLA MÁS IMPORTANTE DE TODO EL ARCHIVO
   Las respuestas de /admin/api/ NO SE GUARDAN NUNCA. Ni una sola vez.
   Si se guardaran, el panel te mostraría la lista de invitados de ayer y
   los gastos de la semana pasada, y no habría forma de saber que lo que
   estás viendo es viejo. Un panel que miente es peor que uno lento.

   POR QUÉ TIENE SU PROPIO SERVICE WORKER
   La invitación ya tiene uno en la raíz, con alcance sobre todo el sitio.
   Cuando dos alcances se pisan, el navegador usa el más específico, así
   que este gana dentro de /admin/. Además, el de la raíz ahora deja pasar
   de largo todo lo que empiece con /admin (ver sw.js de la raíz).

   CÓMO SE ACTUALIZA
   Al cambiar el código del panel, subí el número de VERSION. Eso crea un
   caché nuevo y borra el viejo.
   ══════════════════════════════════════════════════════════════════════ */

/* ⚠️ SUBÍ ESTE NÚMERO CADA VEZ QUE CAMBIES CÓDIGO DEL PANEL.
   Si no, el teléfono sigue mostrando la copia guardada de la versión
   anterior y parece que el cambio "no se subió". */
const VERSION = 'ania-admin-v150';

/* Lo mínimo para que la app arranque sin red. Se guarda al instalar. */
const ARMAZON = [
  './',
  './index.html',
  './manifest.webmanifest',
  './recursos/icono-admin.svg',
  /* Los PNG van acá porque son los que Android usa para el icono de la
     pantalla de inicio. Si el teléfono los pide estando sin señal y no
     están guardados, la app instalada queda con el icono genérico. */
  './recursos/icono-admin-192.png',
  './recursos/icono-admin-512.png',
  /* El fondo victoriano de Lucila (Fase 7.5): se precarga acá para que
     se vea desde la primerísima apertura sin señal, en vez de un hueco
     en blanco hasta que el teléfono lo pida una vez online. */
  './recursos/fondo-gotico-victoriano.webp',
];


/* ─── INSTALACIÓN ────────────────────────────────────────────────────── */

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSION)
      // El .catch() es a propósito: si UN archivo de la lista falla, no
      // queremos que reviente la instalación entera y el panel se quede
      // sin Service Worker. Mejor cachear lo que se pueda.
      .then(cache => cache.addAll(ARMAZON).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});


/* ─── ACTIVACIÓN ─────────────────────────────────────────────────────── */

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        // Solo se borran los cachés del panel. El de la invitación
        // (ania-xv-*) no se toca: es de la otra app.
        claves
          .filter(clave => clave.startsWith('ania-admin-') && clave !== VERSION)
          .map(clave => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});


/* ─── QUÉ HACER CON CADA PEDIDO ──────────────────────────────────────── */

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  const url    = new URL(pedido.url);

  // Solo se toca lo de esta misma web.
  if (url.origin !== self.location.origin) return;

  /* LA API, NUNCA. Se deja pasar directo a la red sin intervenir, ni
     siquiera para leer. Así el panel siempre habla con la base de datos
     de verdad, y si no hay señal recibe un error honesto en vez de datos
     viejos disfrazados de actuales. */
  if (url.pathname.startsWith('/admin/api/')) return;

  // Los envíos (POST) tampoco se cachean: no tendría sentido.
  if (pedido.method !== 'GET') return;

  evento.respondWith(armazonDesdeLaCopia(pedido));
});


/**
 * Sirve el armazón: primero la copia guardada, y en paralelo la refresca.
 *
 * Se eligió "copia primero" y no "red primero" porque el armazón casi
 * nunca cambia y así el panel abre instantáneo. La copia se actualiza
 * calladamente por detrás, así que el cambio se ve en la siguiente
 * apertura sin que nadie tenga que hacer nada.
 *
 * @param {Request} pedido
 * @returns {Promise<Response>}
 */
function armazonDesdeLaCopia(pedido) {
  return caches.match(pedido).then(copia => {

    const desdeLaRed = fetch(pedido)
      .then(respuesta => {
        // Solo se guardan respuestas buenas. Guardar un 404 o un 500
        // dejaría el panel roto hasta la próxima subida de VERSION.
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const paraGuardar = respuesta.clone();
          caches.open(VERSION).then(cache => cache.put(pedido, paraGuardar));
        }
        return respuesta;
      })
      .catch(() => null);

    // Si hay copia, se devuelve ya. Si no, se espera a la red. Y si
    // tampoco hay red y era una navegación, se devuelve el index para
    // que la app abra igual y muestre su propio aviso de "sin conexión".
    if (copia) return copia;

    return desdeLaRed.then(respuesta => {
      if (respuesta) return respuesta;
      if (pedido.mode === 'navigate') return caches.match('./index.html');
      return new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' });
    });
  });
}


/* ─── NOTIFICACIONES ─────────────────────────────────────────────────── */

/* Los avisos de pagos por vencer y fechas próximas los manda el servidor
   una vez al día (api/cron_recordatorios.php). Acá solo se muestran. */

self.addEventListener('push', evento => {
  /* Los avisos llegan VACÍOS, sin texto adentro. Ver _lib/push.php: eso
     evita tener que cifrar el contenido, que es la parte del protocolo
     más fácil de romper sin darse cuenta.

     Así que acá, al despertar, se le pregunta al servidor qué mostrar. */
  evento.waitUntil(armarYMostrarElAviso(evento));
});

/**
 * Pregunta al servidor qué hay pendiente y muestra la notificación.
 *
 * @param {PushEvent} evento
 * @returns {Promise<void>}
 */
async function armarYMostrarElAviso(evento) {
  let titulo = 'Ania XV';
  let cuerpo = 'Tienes algo pendiente.';

  /* Si el aviso trajera texto (por si alguna vez se agrega), se usa ese
     y no hace falta preguntar. */
  try {
    if (evento.data) {
      const traido = evento.data.json();
      if (traido && traido.cuerpo) {
        titulo = traido.titulo || titulo;
        cuerpo = traido.cuerpo;
        return mostrarAviso(titulo, cuerpo);
      }
    }
  } catch (error) {
    // Venía vacío o mal formado: seguimos al camino normal.
  }

  try {
    const respuesta = await fetch('api/recordatorios.php?accion=pendientes',
                                  { cache: 'no-store' });
    const carga = await respuesta.json();

    if (carga && carga.ok && carga.datos) {
      titulo = carga.datos.titulo || titulo;
      cuerpo = carga.datos.cuerpo || cuerpo;
    }
  } catch (error) {
    /* Sin conexión o el servidor no contestó. Se muestra igual el aviso
       genérico: el sistema operativo EXIGE que un push muestre una
       notificación. Si no se muestra ninguna, el navegador lo considera
       un abuso y después de unas cuantas veces revoca el permiso. */
  }

  return mostrarAviso(titulo, cuerpo);
}

/**
 * Muestra la notificación.
 *
 * @param {string} titulo
 * @param {string} cuerpo
 * @returns {Promise<void>}
 */
function mostrarAviso(titulo, cuerpo) {
  return self.registration.showNotification(titulo, {
    body:  cuerpo,
    icon:  './recursos/icono-admin.svg',
    badge: './recursos/icono-admin.svg',
    // La etiqueta hace que un aviso nuevo reemplace al anterior en vez
    // de apilarse. Sin esto, cinco días sin abrir la app significan
    // cinco notificaciones diciendo casi lo mismo.
    tag:   'ania-admin',
    data:  { ir: './' },
  });
}

self.addEventListener('notificationclick', evento => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.ir) || './';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(ventanas => {
        // Si el panel ya está abierto, se trae al frente en vez de abrir
        // una segunda copia.
        for (const ventana of ventanas) {
          if (ventana.url.includes('/admin/') && 'focus' in ventana) {
            ventana.navigate(destino);
            return ventana.focus();
          }
        }
        return self.clients.openWindow(destino);
      })
  );
});
