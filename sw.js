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
   nuevo, y el viejo se borra solo.

   DOS ESTRATEGIAS, SEGÚN EL ARCHIVO (lo importante)
   Antes TODO se servía "primero de la copia guardada". Cómodo para offline,
   pero tenía un costo: al cambiar el CÓDIGO, el visitante seguía viendo la
   versión vieja hasta que se subiera VERSION. Ahora se separan dos casos:

     · CÓDIGO de la app (el documento HTML, los .css y los .js) → "primero la
       RED". Si hay internet, siempre se ve lo último; si no hay, cae a la
       copia guardada y la web igual abre. Así un cambio se ve con UNA sola
       recarga, sin depender de VERSION.

     · ASSETS pesados y estables (imágenes, .svg, la canción .mp3, fuentes) →
       "primero la COPIA". Casi nunca cambian y pesan: servirlos del caché es
       instantáneo y ahorra datos. Si algún día cambian, se renueva con VERSION.
   ══════════════════════════════════════════════════════════════════════ */

const VERSION = 'ania-xv-v6';

/** Extensiones de assets pesados/estables: para esos, "primero la copia". */
const ASSETS_ESTABLES = /\.(?:mp3|ogg|wav|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;

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

/* Guarda una copia de la respuesta (clonada, porque se consume una vez). */
function guardarCopia(pedido, respuesta) {
  const paraGuardar = respuesta.clone();
  caches.open(VERSION).then(cache => cache.put(pedido, paraGuardar)).catch(() => {});
}

/* "Primero la RED": para el código de la app. Se pide a la red y, si llega,
   se sirve y se guarda para poder abrir offline. Si no hay red, se cae a la
   copia guardada (y, si tampoco hay copia, a la portada). */
function primeroLaRed(pedido) {
  return fetch(pedido)
    .then(respuesta => { guardarCopia(pedido, respuesta); return respuesta; })
    .catch(() => caches.match(pedido).then(copia => copia || caches.match('./index.html')));
}

/* "Primero la COPIA": para assets pesados y estables. Si está guardado, se
   sirve al instante; si no, se va a la red y se guarda para la próxima. */
function primeroLaCopia(pedido) {
  return caches.match(pedido).then(copia => {
    if (copia) return copia;
    return fetch(pedido).then(respuesta => { guardarCopia(pedido, respuesta); return respuesta; });
  });
}

self.addEventListener('fetch', evento => {
  const pedido = evento.request;

  // Solo se cachean lecturas (GET) de esta misma web.
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  /* Navegaciones (abrir la página) y assets NO estables (HTML, CSS, JS) van
     por red primero, así los cambios se ven con una sola recarga. Los assets
     pesados y estables van por copia primero, por velocidad y ahorro. */
  const esAssetEstable = ASSETS_ESTABLES.test(url.pathname);
  evento.respondWith(esAssetEstable ? primeroLaCopia(pedido) : primeroLaRed(pedido));
});
