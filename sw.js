/* ══════════════════════════════════════════════════════════════════════
   SERVICE WORKER · funcionamiento sin internet
   ══════════════════════════════════════════════════════════════════════

   QUÉ HACE ESTE ARCHIVO
   Es el "ayudante" que corre en segundo plano y hace que la invitación,
   una vez instalada o visitada una vez, abra al instante y funcione SIN
   INTERNET. Guarda una copia de cada archivo la primera vez que se pide,
   y a partir de ahí lo sirve desde esa copia.

   POR QUÉ NO SE PRECARGA UNA LISTA LARGA
   Si acá pusiéramos a mano la lista de todos los archivos y uno solo
   estuviera mal escrito, la instalación entera fallaría. En su lugar se
   usa una regla simple: "lo que se pida y sea de esta misma web, guardalo
   la primera vez". Después de la primera visita completa, todo queda
   guardado y la invitación anda offline, sin listas que mantener.

   CÓMO ACTUALIZAR
   Al cambiar los archivos, subí el número de VERSION. Eso crea un caché
   nuevo, y el viejo se borra solo. Sin ese cambio, algún visitante podría
   seguir viendo la versión anterior guardada.
   ══════════════════════════════════════════════════════════════════════ */

const VERSION = 'ania-xv-v1';

/* Al instalarse: guarda al menos la portada, y toma el control enseguida
   sin esperar a que se cierren las pestañas viejas. */
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(['./', './index.html']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Al activarse: borra los cachés de versiones anteriores. */
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        claves.map(clave => clave === VERSION ? null : caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

/* Ante cada pedido: primero busca en la copia guardada; si no está, va a
   la red, lo sirve y de paso lo guarda para la próxima. Si no hay red y
   no hay copia (por ejemplo, una navegación nueva estando offline),
   devuelve la portada. */
self.addEventListener('fetch', evento => {
  const pedido = evento.request;

  // Solo se cachean lecturas (GET) de esta misma web.
  if (pedido.method !== 'GET') return;
  if (new URL(pedido.url).origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(pedido).then(copia => {
      if (copia) return copia;

      return fetch(pedido).then(respuesta => {
        // Se guarda una copia (clonada, porque la respuesta se consume una vez).
        const paraGuardar = respuesta.clone();
        caches.open(VERSION).then(cache => cache.put(pedido, paraGuardar)).catch(() => {});
        return respuesta;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
