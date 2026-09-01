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

   ⚠️ SE PROBÓ "primero la copia" TAMBIÉN PARA EL CÓDIGO VERSIONADO (`?v=NN`)
   y SE REVIRTIÓ, junto con el empaquetado de JS en paquetes (ver la nota en
   herramientas/minificar-js.mjs). La idea era ahorrar una ida y vuelta al
   servidor en visitas repetidas, pero después de subirlo a PBE el First
   Contentful Paint y el Largest Contentful Paint empeoraron (en vez de
   mejorar) tanto en escritorio como en móvil. No se aisló si la causa fue
   este cambio específico o el empaquetado, así que ante la duda se
   revirtieron los dos juntos y se volvió a esta versión, ya probada. Si se
   quiere retomar la idea, hay que aislarla del empaquetado y medir en PBE
   antes de subir a producción.
   ══════════════════════════════════════════════════════════════════════ */

const VERSION = 'ania-xv-v154';

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

/* Guarda una copia de la respuesta (clonada, porque se consume una vez).

   ⚡ SOLO SE GUARDA LO QUE SIRVE (2026-09-02). Antes se guardaba
   cualquier respuesta que llegara, sin mirar el estado: un 404 o un 500
   pasajero quedaba cacheado con la misma URL versionada y se volvía a
   servir en cada visita hasta la siguiente subida de versión. Un error
   guardado es peor que no tener copia. */
function guardarCopia(pedido, respuesta) {
  if (!respuesta || !respuesta.ok) return;
  const paraGuardar = respuesta.clone();
  caches.open(VERSION).then(cache => cache.put(pedido, paraGuardar)).catch(() => {});
}

/* "Primero la RED": para el código de la app. Se pide a la red y, si llega,
   se sirve y se guarda para poder abrir offline. Si no hay red, se cae a la
   copia guardada.

   ⚠️ Y SI TAMPOCO HAY COPIA, SE FALLA — NO SE DEVUELVE LA PORTADA
   (2026-09-02). ESTE ERA UN BUG GRAVE Y SILENCIOSO.

   Antes, el último recurso de esta función era `caches.match('./index.html')`
   para CUALQUIER pedido. O sea que si fallaba la descarga de un archivo de
   JavaScript —una red intermitente, una recarga en medio, demasiadas
   conexiones a la vez en un equipo lento— y todavía no había copia guardada
   (cada versión nueva arranca con el caché casi vacío, porque `activate`
   borra los anteriores), el Service Worker entregaba **el index.html como si
   fuera el script**. El navegador intentaba leer HTML como código, tiraba
   `SyntaxError: Unexpected token '<'`, y ese módulo entero no corría: no
   construía nada, no registraba sus escuchas, y no dejaba más rastro que una
   línea en la consola. Eso explica capas que faltaban de forma intermitente
   —distinta en cada carga, sin patrón— mientras el resto de la web se veía
   perfecta.

   La portada como respaldo solo tiene sentido para una NAVEGACIÓN (abrir la
   página sin conexión). Para un script o una hoja de estilo es mejor fallar
   de verdad: un error de red se ve y se puede reintentar; HTML disfrazado de
   JavaScript, no.

   El propio archivo ya documentaba este peligro más abajo, pero solo lo
   había resuelto para /admin. */
function primeroLaRed(pedido) {
  return fetch(pedido)
    .then(respuesta => { guardarCopia(pedido, respuesta); return respuesta; })
    .catch(() => caches.match(pedido).then(copia => {
      if (copia) return copia;
      if (pedido.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }));
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

  /* El panel de administración se maneja solo, con su propio Service
     Worker en /admin/sw.js. Acá se lo deja pasar de largo sin tocarlo.

     Sin esta línea pasarían dos cosas feas:
       · Se guardaría copia de las respuestas de /admin/api/, y el panel
         mostraría invitados o gastos viejos aunque la base ya cambió.
       · Sin internet, primeroLaRed() devolvería el index.html DE LA
         INVITACIÓN como respuesta a una llamada a la API, y el panel
         recibiría una página web donde esperaba datos. */
  if (url.pathname.startsWith('/admin')) return;

  /* Navegaciones (abrir la página) y assets NO estables (HTML, CSS, JS) van
     por red primero, así los cambios se ven con una sola recarga. Los assets
     pesados y estables van por copia primero, por velocidad y ahorro. */
  const esAssetEstable = ASSETS_ESTABLES.test(url.pathname);
  evento.respondWith(esAssetEstable ? primeroLaCopia(pedido) : primeroLaRed(pedido));
});
