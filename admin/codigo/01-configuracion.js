/* ══════════════════════════════════════════════════════════════════════
   01 · CONFIGURACIÓN DEL PANEL

   👉 ESTE ES EL ÚNICO ARCHIVO QUE HACE FALTA TOCAR PARA CAMBIAR DATOS.

   Igual que en la invitación, todo lo personalizable vive acá y el resto
   del código lo lee de acá. Si cambia la fecha de la fiesta o el enlace
   de la mesa de regalos, se cambia en este archivo y nada más.

   ⚠️ Reglas de oro:
     1. No borres las comillas ' ' que rodean cada texto.
     2. No borres la coma , del final de cada línea.
   ══════════════════════════════════════════════════════════════════════ */

const CONFIGURACION = {

  /* ─── 1. LA FIESTA ────────────────────────────────────────────────── */
  fiesta: {
    nombre: 'Ania',

    /* Misma fecha que la invitación (codigo/01-configuracion.js de la
       raíz). Si cambia allá, tiene que cambiar acá: de esto sale la
       cuenta regresiva del Resumen. */
    fechaYHora: '2026-10-24T17:00:00',
    fechaEnPalabras: '24 de octubre de 2026',
    lugar: 'Salones Alvi, Toluca',
  },


  /* ─── 2. MESA DE REGALOS ──────────────────────────────────────────── */
  regalos: {
    /* La lista de Amazon. Es el MISMO enlace que ve el invitado en la
       invitación, para que desde el panel se pueda abrir de un toque y
       revisar qué queda por comprar.

       ⚠️ OJO: este enlace es de tipo "owner-view", o sea la vista de
       DUEÑO de la lista. Amazon suele pedir estar logueado como el dueño
       para abrirlo, así que a un invitado probablemente le dé error. El
       enlace para compartir se saca desde Amazon con el botón "Invitar" o
       "Compartir" de la lista, y es el que habría que poner acá Y en la
       invitación. */
    enlaceDeLaLista: 'https://www.amazon.com.mx/registries/gl/owner-view/LJDSRURUU3G4',

    /* De qué remitente vienen los correos de "alguien compró de tu lista".
       El panel los busca en el buzón para ofrecerte dar de alta el regalo
       sin teclear nada. Si Amazon cambia el remitente, se ajusta acá. */
    remitentesDeAviso: ['@amazon.com.mx', '@amazon.com'],
  },


  /* ─── 3. MONEDA ───────────────────────────────────────────────────── */
  dinero: {
    moneda: 'MXN',
    simbolo: '$',
    /* Cómo se llama la región para dar formato a los números. Con
       'es-MX' se escribe 1,500.50 (coma para miles, punto decimal). */
    region: 'es-MX',

    /* A partir de qué porcentaje del techo de una categoría se avisa que
       se está por pasar. 0.85 = cuando lleva gastado el 85 %. */
    avisarDesde: 0.85,
  },


  /* ─── 4. AVISOS ───────────────────────────────────────────────────── */
  avisos: {
    /* Con cuántos días de anticipación se considera "próximo" un pago o
       una fecha de la agenda, para mostrarlos en el Resumen. */
    diasDeAnticipacion: 14,
  },


  /* ─── 5. SERVIDOR ─────────────────────────────────────────────────── */
  servidor: {
    /* De dónde cuelga la API. Se deja relativo a propósito: así funciona
       igual en aniaxv.com y en cualquier prueba local, sin tocar nada. */
    base: 'api/',

    /* Cuántos segundos esperar una respuesta antes de darla por perdida.
       Con mala señal, sin este límite la app se queda colgada para
       siempre con el girador dando vueltas. */
    segundosDeEspera: 20,
  },
};
