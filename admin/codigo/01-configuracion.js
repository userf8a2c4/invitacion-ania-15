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
    enlaceDeLaLista: 'https://www.amazon.com.mx/registries/gl/guest-view/LJDSRURUU3G4?ref_=cm_sw_r_apann_ggr-subnav-share_YQS0Y5DAPV5S2YHN6VDF&language=en-US',

    /* De qué remitente vienen los correos de "alguien compró de tu lista".
       El panel los busca en el buzón para ofrecerte dar de alta el regalo
       sin teclear nada. Si Amazon cambia el remitente, se ajusta acá. */
    remitentesDeAviso: ['@amazon.com.mx', '@amazon.com'],
  },


  /* ─── 3. DINERO ───────────────────────────────────────────────────── */
  dinero: {
    /* Cómo se llama la región para dar formato a los números. Con
       'es-MX' se escribe 1,500.50 (coma para miles, punto decimal). */
    region: 'es-MX',

    /* A partir de qué porcentaje del techo de una categoría se avisa que
       se está por pasar. 0.85 = cuando lleva gastado el 85 %. */
    avisarDesde: 0.85,

    /* Los montos SIEMPRE se guardan en pesos en la base de datos. El
       dólar es solo una forma de MIRARLOS, que se cambia con un botón.

       Se hace así a propósito: si se guardaran en la moneda que estaba
       elegida al cargarlos, el mismo presupuesto tendría unos gastos en
       pesos y otros en dólares, y sumarlos daría cualquier cosa. */
    monedaBase: 'MXN',

    monedas: {
      MXN: { simbolo: '$',   nombre: 'Pesos',   rotulo: 'MXN' },
      USD: { simbolo: 'US$', nombre: 'Dólares', rotulo: 'USD' },
    },

    /* Cuántos pesos vale un dólar. Se usa solo para MOSTRAR la
       conversión; no se guarda nada convertido.

       ⚠️ Este número hay que actualizarlo a mano de vez en cuando. No se
       consulta un servicio de cambio en vivo porque eso obligaría a que
       el panel dependa de una web ajena para abrir, y quedaría inservible
       el día que ese servicio falle o cambie. */
    pesosPorDolar: 18.50,

    /* Cuándo se actualizó ese tipo de cambio. Se muestra junto a las
       cifras en dólares para que nadie tome una decisión creyendo que es
       la cotización de hoy. */
    tipoDeCambioActualizado: '2026-08-02',
  },


  /* ─── 4. MÉTODOS DE PAGO ──────────────────────────────────────────── */
  /* Los que aparecen en la lista desplegable al cargar un pago. Se
     pueden agregar más desde la misma app; los que se agreguen quedan
     guardados en el teléfono y se suman a estos. */
  metodosDePago: ['Efectivo', 'Transferencia', 'Cheque'],


  /* ─── 4. AVISOS ───────────────────────────────────────────────────── */
  avisos: {
    /* Con cuántos días de anticipación se considera "próximo" un pago o
       una fecha de la agenda, para mostrarlos en el Resumen. */
    diasDeAnticipacion: 14,
  },


  /* ─── 5. FRASES DE BIENVENIDA ─────────────────────────────────────── */
  /* Se elige una al azar cada vez que se abre la app y se muestra unos
     segundos. Agregá, quitá o cambiá las que quieras: son solo textos.

     Están escritas para Lucila, que es quien va a abrir esto cien veces
     mientras organiza la fiesta. */
  bienvenida: {
    /** Cuántos milisegundos se queda la frase antes de irse. */
    duracion: 2600,

    frases: [
      'Cada detalle que elegís hoy va a ser un recuerdo de ella para siempre.',
      'Lucila, lo estás haciendo increíble.',
      'Nadie va a acordarse del presupuesto. Se van a acordar de la noche.',
      'Un paso por día alcanza. Ya llevás muchos.',
      'Ania va a mirar todo esto y va a saber cuánto la querés.',
      'Respirá. Vas bien.',
      'Organizar también es una forma de amar.',
      'Falta menos de lo que parece, y llevás más de lo que creés.',
      'Que la lista no te tape la fiesta: esto también es para disfrutarlo.',
      'Todo lo difícil de hoy se va a ver hermoso el 24 de octubre.',
      'Sos la razón de que todo esto esté saliendo bien.',
      'Los XV son de Ania. El milagro de que ocurran es tuyo.',
    ],
  },


  /* ─── 6. SERVIDOR ─────────────────────────────────────────────────── */
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
