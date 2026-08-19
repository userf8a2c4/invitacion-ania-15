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

     · EL DOCUMENTO (index.html y las navegaciones) → "primero la RED". Es lo
       único que de verdad puede llegar "viejo": ES el que decide qué URLs de
       código pedir. Si hay internet, siempre se ve lo último; si no hay, cae
       a la copia guardada y la web igual abre.

     · TODO LO DEMÁS (el código .js con `?v=NN`, y los assets pesados y
       estables: imágenes, .svg, la canción .mp3, fuentes) → "primero la
       COPIA". Servirlos del caché es instantáneo y ahorra datos.

   ⚡ POR QUÉ EL CÓDIGO YA NO VA "PRIMERO LA RED" (esto cambió)
   Antes .js e .css iban por red primero, mismo motivo que el documento:
   "que un cambio se vea sin depender de VERSION". Pero esos archivos SIEMPRE
   se piden con `?v=NN` (ver herramientas/subir-version.mjs) — la URL entera
   cambia en cada cambio de código, así que ya son inmutables por diseño: el
   navegador jamás va a pedir `paquete-1-nucleo.js?v=74` esperando otra
   respuesta que la que ya tiene guardada. Pedirla "primero por red" en cada
   visita no compraba frescura (la frescura ya la da el número de versión en
   la URL): solo sumaba una ida y vuelta al servidor por cada archivo, todas
   las veces, para nada. En un perfil real esto se notaba fuerte: 27 pedidos
   ?v= disparados juntos hacían que el servidor tardara cada vez más en
   contestar los últimos (de ~300 ms los primeros a más de 1,3 s los últimos),
   y eso inflaba el tiempo de bloqueo medido en escritorio. "Primero la copia"
   saca esa ida y vuelta de encima para siempre, en cualquier visita que no
   sea la primera — y en la primera visita el costo es el mismo que antes,
   porque no hay nada guardado todavía. El documento (index.html) sigue yendo
   por red primero, porque ÉL es el único que puede envejecer: es el que trae
   los `?v=NN` nuevos.
   ══════════════════════════════════════════════════════════════════════ */

const VERSION = 'ania-xv-v74';

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

  /* El panel de administración se maneja solo, con su propio Service
     Worker en /admin/sw.js. Acá se lo deja pasar de largo sin tocarlo.

     Sin esta línea pasarían dos cosas feas:
       · Se guardaría copia de las respuestas de /admin/api/, y el panel
         mostraría invitados o gastos viejos aunque la base ya cambió.
       · Sin internet, primeroLaRed() devolvería el index.html DE LA
         INVITACIÓN como respuesta a una llamada a la API, y el panel
         recibiría una página web donde esperaba datos. */
  if (url.pathname.startsWith('/admin')) return;

  /* Solo el DOCUMENTO (la navegación en sí, sin `?v=`) va por red primero:
     es el único que puede envejecer. Todo lo demás —código versionado con
     `?v=NN` y los assets pesados y estables— va por copia primero, porque su
     URL exacta ya es inmutable (ver la explicación de arriba). */
  const esVersionado = url.searchParams.has('v');
  const esAssetEstable = ASSETS_ESTABLES.test(url.pathname);
  evento.respondWith((esVersionado || esAssetEstable) ? primeroLaCopia(pedido) : primeroLaRed(pedido));
});
