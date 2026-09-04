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

const VERSION = 'ania-xv-v189';

/** Extensiones de assets pesados/estables: para esos, "primero la copia". */
const ASSETS_ESTABLES = /\.(?:mp3|ogg|wav|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;

/** Los cachés QUE SON DE ESTE Service Worker, y su número de versión. */
const CACHES_MIOS = /^ania-xv-v(\d+)$/;

/** Cuántas generaciones se conservan. Ver la nota de 'activate'. */
const GENERACIONES_QUE_SE_CONSERVAN = 2;

/* Al instalarse: guarda al menos la portada, y toma el control enseguida
   sin esperar a que se cierren las pestañas viejas. */
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(['./', './index.html']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Al activarse: borra los cachés viejos DE ESTE Service Worker.

   ⚠️ DOS ARREGLOS ACÁ (2026-09-04)

   1 · BORRABA EL CACHÉ DEL PANEL. La línea era
       `clave === VERSION ? null : caches.delete(clave)`: borraba TODO
       caché de este dominio que no fuera el suyo. Y CacheStorage es por
       ORIGEN, no por Service Worker — el panel guarda el suyo en el
       mismo dominio, con el nombre `ania-admin-vNNN`.

       O sea que cada vez que alguien del equipo abría la invitación, el
       Service Worker de la invitación le vaciaba el caché al panel, y
       el panel dejaba de abrir sin internet hasta volver a llenarlo.
       Justo la parte del sistema que más se necesita sin señal, y en el
       teléfono que además tiene la invitación abierta. admin/sw.js sí
       filtraba por su prefijo; este no.

   2 · SE CONSERVA LA GENERACIÓN ANTERIOR. Los 23 scripts de la escena
       no se piden al cargar la página: se piden EN EL CLIC DEL SOBRE,
       minutos después. Si en esa ventana se sube una versión, este
       activate borraba el caché que la pestaña abierta estaba usando —
       y si además se cortaba la red, esos módulos no cargaban y no
       dejaban más rastro que una línea en la consola.

       Guardando la anterior, una pestaña a mitad de sesión conserva su
       red de seguridad. Cuesta una generación de más en el disco y se
       limpia sola en la subida siguiente.

   Lo que esto NO arregla: con internet, esa misma pestaña pide sus
   `?v=189` a la red y Apache le devuelve el archivo NUEVO (el `?v=` no
   es parte del nombre en disco), así que puede mezclar código viejo y
   nuevo en la misma sesión. La única cura sería servir el código
   versionado desde la copia antes que de la red — y eso ya se probó en
   PBE y se revirtió porque empeoró el FCP y el LCP (ver la nota del
   encabezado). Lo correcto acá es no promover mientras se está
   repartiendo la invitación. */
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => {
        /* "Míos" es por PREFIJO: así una caché de un esquema de
           nombres viejo (mismo prefijo, sin número) se sigue limpiando
           en vez de quedarse ahí para siempre — pero nunca se toca la
           del panel, que empieza con `ania-admin-`. */
        const mios = claves.filter(clave => clave.startsWith('ania-xv-'));

        const numeradas = mios
          .filter(clave => CACHES_MIOS.test(clave))
          .sort((a, b) =>
            Number(b.match(CACHES_MIOS)[1]) - Number(a.match(CACHES_MIOS)[1]));

        const seQuedan = new Set(numeradas.slice(0, GENERACIONES_QUE_SE_CONSERVAN));
        seQuedan.add(VERSION);

        return Promise.all(
          mios.filter(clave => !seQuedan.has(clave)).map(clave => caches.delete(clave))
        );
      })
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
   sirve al instante; si no, se va a la red y se guarda para la próxima.

   ⚠️ MIRA SOLO EL CACHÉ DE ESTA VERSIÓN, y no `caches.match()` a secas
   (2026-09-04). Desde que se conserva la generación anterior (ver
   'activate'), un `caches.match()` sin nombre busca en TODOS los cachés
   del dominio y podría devolver la imagen vieja de la generación
   pasada. Para los assets estables, subir VERSION es justamente el
   único mecanismo que los renueva —los que no llevan `?v=` propio
   dependen enteramente de eso—, así que tienen que mirar solo el caché
   nuevo, que arranca vacío y se llena de la red.

   El respaldo offline de primeroLaRed() sí busca en todos los cachés a
   propósito: ahí encontrar algo viejo es mejor que no abrir. */
function primeroLaCopia(pedido) {
  return caches.open(VERSION)
    .then(cache => cache.match(pedido))
    .then(copia => {
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

  /* ⚠️ LO QUE TERMINA EN .php TAMPOCO SE GUARDA (2026-09-04).
     La exclusión de arriba era solo `/admin`, y `invitacion.php` está en
     la raíz: se guardaba copia de su respuesta como la de cualquier otro
     archivo.

     Es la API que devuelve la invitación personalizada. Guardar su
     respuesta significa que, sin señal, el invitado que YA confirmó
     vuelve a abrir su link y lee "0 de 4 lugares confirmados" — la foto
     de antes de confirmar. Con 114 personas abriendo el link una sola
     vez, la conclusión razonable de quien ve eso es que su confirmación
     se perdió, y confirma de nuevo.

     `mi-pase.php` tiene el mismo problema y es peor: ahí el invitado
     corrige su menú o avisa que al final no puede ir, y una copia vieja
     le mostraría que no se guardó nada.

     Ninguna de las dos sirve sin conexión de todos modos: son consultas
     a la base. Que fallen de verdad es lo correcto —el sitio ya sabe
     distinguir "sin conexión" de "link roto" (ver
     04-invitado-personalizado.js)— y es el mismo criterio que la línea
     de /admin de acá arriba. La cáscara de la invitación es index.html,
     que se sigue guardando y abriendo sin internet. */
  if (url.pathname.endsWith('.php')) return;

  /* Navegaciones (abrir la página) y assets NO estables (HTML, CSS, JS) van
     por red primero, así los cambios se ven con una sola recarga. Los assets
     pesados y estables van por copia primero, por velocidad y ahorro. */
  const esAssetEstable = ASSETS_ESTABLES.test(url.pathname);
  evento.respondWith(esAssetEstable ? primeroLaCopia(pedido) : primeroLaRed(pedido));
});
