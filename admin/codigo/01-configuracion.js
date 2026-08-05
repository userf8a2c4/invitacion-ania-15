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

    /* Cuántos días antes de la fiesta aparece en el Resumen el botón
       para abrir el cronograma del día.

       No es lo mismo que el aviso de arriba: acá se trata de tener a
       mano la pantalla que se usa de pie en el salón. Con 3 alcanza
       para repasarla la noche anterior sin que moleste en agosto. */
    diasParaElModoDelDia: 3,
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


  /* ─── 6. QUÉ ES CADA SECCIÓN DE EVENTO ────────────────────────────── */
  /* La pantalla Evento es un índice: una lista de secciones agrupadas,
     cada una con una línea que dice qué es. Esa línea vive acá.

     POR QUÉ IMPORTA: "Papeles" no significa nada por sí solo. "Fe de
     bautismo, pláticas y qué falta entregar" sí. Son los carteles que
     hacen que alguien que no armó esta app sepa dónde está parado.

     El ORDEN de los grupos y de las filas de acá es el que se ve en
     pantalla. Se puede reordenar libremente; las claves son las que no
     se tocan, porque las usa el resto del código. */
  indiceDeEvento: [
    {
      titulo: 'Organización',
      filas: [
        ['calendario', 'Todo lo que viene, mes por mes'],
        ['tareas',     'Lo que hay que hacer y quién se encarga'],
        ['agenda',     'Las fechas que no se pueden pasar'],
      ],
    },
    {
      titulo: 'La ceremonia',
      filas: [
        ['ceremonia',            'Iglesia, hora y a quién hay que llamar'],
        ['requisitos_ceremonia', 'Fe de bautismo, pláticas y qué falta entregar'],
        ['musica',               'Qué suena en cada momento, y qué no suena nunca'],
      ],
    },
    {
      titulo: 'La quinceañera',
      filas: [
        ['corte_honor',   'Chambelanes y damas, con sus tallas'],
        ['ensayos',       'Cuándo se ensaya el vals y quién faltó'],
        ['citas_arreglo', 'Pruebas de vestido, maquillaje y peinado'],
      ],
    },
    {
      titulo: 'El día',
      filas: [
        /* "modo-dia" no es una sección como las otras: abre la pantalla
           grande que se usa de pie en el salón. Va primero del grupo, y
           es uno de los tres caminos que llevan ahí —los otros son el
           Resumen y el menú—, para que el 24 de octubre no dependa de
           acordarse de dónde estaba. */
        ['modo-dia',   'Cronograma grande y buscador de pases, para el salón'],
        ['cronograma', 'El minuto a minuto del 24 de octubre'],
        ['tomas_foto', 'La lista de tomas para el fotógrafo'],
      ],
    },
  ],


  /* ─── 7. QUÉ ES CADA SECCIÓN DE GENTE ─────────────────────────────── */
  /* Mesas, Regalos y Foráneos viven acá y no en Evento a propósito: son
     cosas sobre PERSONAS. Antes había que saltar de pestaña para ver
     quién confirmó y dónde sentarlo. */
  seccionesDeGente: [
    ['invitados', 'Invitados',          'Quién confirmó, cuántos vienen y qué comen'],
    ['mesas',     'Mesas',              'Quién se sienta dónde'],
    ['regalos',   'Regalos',            'Qué llegó y a quién falta agradecerle'],
    ['foraneos',  'Foráneos',           'Los que vienen de afuera: hospedaje y llegada'],
    ['contactos', 'Agenda de contactos','Todos los teléfonos del evento en un solo lugar'],
  ],


  /* ─── 8. EL PLANO DEL SALÓN ───────────────────────────────────────── */
  /* La disposición real del Salón Estrella de Alvi Toluca, tal como la
     tiene Lucila en su planilla.

     POR QUÉ UN PLANO Y NO UNA LISTA
     Una lista de mesas no dice lo único que importa al acomodar gente:
     DÓNDE está cada mesa. Cuál queda pegada a la pista, cuál al lado del
     baño, cuál en el fondo. Por eso `mesas.ubicacion` nunca sirvió de
     nada: se podía escribir "cerca de la pista" pero no se veía.

     CÓMO SE LEE ESTO
     Es una grilla de 4 columnas. Cada elemento dice en qué fila va y
     cuántas columnas ocupa. Las mesas NO están acá: su posición vive en
     la base de datos (mesas.fila y mesas.columna), para poder moverlas
     sin tocar código.

     Si algún día cambia el salón, se cambia esto y listo. */
  salon: {
    /** Cuántas columnas de mesas entran a lo ancho. */
    columnas: 4,

    /** En qué filas de la grilla van las mesas. */
    filasDeMesas: [3, 4, 5, 6],

    /* Lo que no es una mesa: la tarima, la pista, los servicios. Se
       dibuja alrededor para que el plano se parezca al salón de verdad
       y uno pueda orientarse de un vistazo. */
    fijos: [
      { clave: 'principal', nombre: 'Mesa principal', icono: '⭐',
        fila: 1, desde: 1, ancho: 4, tipo: 'principal' },

      { clave: 'dj',    nombre: 'DJ',             icono: '🎧',
        fila: 2, desde: 1, ancho: 1, tipo: 'dj' },
      { clave: 'pista', nombre: 'Pista de baile', icono: '💃',
        fila: 2, desde: 2, ancho: 3, tipo: 'pista' },

      { clave: 'bufet', nombre: 'Servicio / bufet', icono: '🍽️',
        fila: 7, desde: 1, ancho: 1, tipo: 'servicio' },
      { clave: 'banos', nombre: 'Baños',           icono: '🚻',
        fila: 7, desde: 4, ancho: 1, tipo: 'servicio' },

      { clave: 'barra',   nombre: 'Barra / bar', icono: '🍹',
        fila: 8, desde: 1, ancho: 4, tipo: 'barra' },
      { clave: 'entrada', nombre: 'Entrada',     icono: '🚪',
        fila: 9, desde: 2, ancho: 2, tipo: 'entrada' },
    ],

    /* Las 14 mesas del salón, con su posición. Es lo que crea el botón
       "Armar el salón de Alvi": así no hay que cargarlas a mano ni
       acordarse de cuál va dónde.

       Las rectangulares de Alvi son de 10 a 12 personas; se toma 10 para
       no prometer lugares que después aprieten. */
    mesas: [
      { nombre: 'Mesa 1',  fila: 3, columna: 1 },
      { nombre: 'Mesa 2',  fila: 3, columna: 2 },
      { nombre: 'Mesa 3',  fila: 3, columna: 3 },
      { nombre: 'Mesa 4',  fila: 3, columna: 4 },
      { nombre: 'Mesa 5',  fila: 4, columna: 1 },
      { nombre: 'Mesa 6',  fila: 4, columna: 2 },
      { nombre: 'Mesa 7',  fila: 4, columna: 3 },
      { nombre: 'Mesa 8',  fila: 4, columna: 4 },
      { nombre: 'Mesa 9',  fila: 5, columna: 1 },
      { nombre: 'Mesa 10', fila: 5, columna: 2 },
      { nombre: 'Mesa 11', fila: 5, columna: 3 },
      { nombre: 'Mesa 12', fila: 5, columna: 4 },
      { nombre: 'Mesa 13', fila: 6, columna: 1 },
      { nombre: 'Mesa 14', fila: 6, columna: 3 },
    ],

    /** Cuánta gente entra por mesa. */
    capacidad: 10,

    /* Las mesas más cerca de la pista son las mejores, y son las que
       primero se reparten a los grupos de orden más bajo. Número más
       chico = mejor mesa. Se calcula por la fila: la 3 está pegada a la
       pista, la 6 es el fondo. */
    prioridadPorFila: { 3: 10, 4: 30, 5: 50, 6: 70 },
  },


  /* ─── 9. LOS GLOBOS DE AYUDA ──────────────────────────────────────── */
  /* Los carteles que aparecen al tocar el "?" que hay junto a algunos
     títulos.

     QUÉ VA ACÁ Y QUÉ NO
     Solo los CONCEPTOS que no se entienden por su nombre. "Gastos" no
     necesita explicación; "de tu bolsillo" sí, porque es una cifra que
     el panel calcula y que en ningún otro lado del mundo se llama así.

     Las secciones de Evento no están acá: el índice de esa pantalla ya
     lleva su propia línea explicativa en cada renglón. */
  ayuda: {
    'dinero.dos-cifras': {
      titulo: 'Cuesta y De tu bolsillo',
      texto:
        'Son dos números distintos y conviene no confundirlos.\n\n' +
        'CUESTA es lo que sale la fiesta entera, sin importar quién lo ' +
        'pague. Es lo que hay que negociar con los proveedores.\n\n' +
        'DE TU BOLSILLO es lo que ponen ustedes: el costo menos lo que ' +
        'cubren los padrinos.\n\n' +
        'Mirar solo el primero asusta de más. Mirar solo el segundo ' +
        'esconde que un padrino puede echarse atrás y ese gasto vuelve ' +
        'a caer sobre ustedes.',
    },

    'dinero.techo': {
      titulo: 'El techo de una categoría',
      texto:
        'Es cuánto decidiste que estás dispuesta a gastar en algo: el ' +
        'límite, no lo que llevás gastado.\n\n' +
        'Sirve para que el panel avise ANTES de pasarse, no después. ' +
        'Al llegar al 85 % la barra se pone amarilla, y si se pasa, roja.\n\n' +
        'Una categoría sin techo no avisa nunca: se puede gastar de más ' +
        'sin que nadie diga nada.',
    },

    'dinero.padrinos': {
      titulo: 'Padrinos',
      texto:
        'Quienes se ofrecieron a cubrir algo de la fiesta: el pastel, la ' +
        'música, las invitaciones.\n\n' +
        'Cada gasto se puede atar a un padrino. Eso es lo que hace que ' +
        '"de tu bolsillo" sea un número real.\n\n' +
        'Ojo con el estado: PROMETIDO no es ENTREGADO. Mientras no haya ' +
        'entregado, ese dinero todavía no existe, y el panel lo marca en ' +
        'amarillo para que no se te olvide.',
    },

    'mesas.fijar': {
      titulo: 'Fijar una mesa',
      texto:
        'Sentar a alguien a mano es una PROPUESTA: el acomodo automático ' +
        'puede volver a moverlo si le conviene.\n\n' +
        'Fijar es distinto. Es decir "esta persona se queda acá pase lo ' +
        'que pase", y el automático no la toca nunca más. Se ve con un ' +
        'candado al lado del nombre.\n\n' +
        'Se usa para lo que tiene un motivo que la computadora no puede ' +
        'saber: la abuela lejos del parlante, los primos que se llevan ' +
        'bien, alguien que necesita estar cerca de la puerta.',
    },

    'mesas.acomodar': {
      titulo: 'Acomodar solo',
      texto:
        'Reparte a todos los que confirmaron entre las mesas, respetando ' +
        'los grupos, las reglas de "no sentar juntos" y lo que fijaste ' +
        'con el candado.\n\n' +
        'Antes de aplicar nada te muestra qué se va a mover, y guarda ' +
        'una foto de cómo estaba. Si no te gusta el resultado, el botón ' +
        '"Volver al acomodo anterior" lo deshace.\n\n' +
        'Se puede tocar sin miedo: no hay forma de perder trabajo.',
    },

    'gente.pases': {
      titulo: 'El código de pase',
      texto:
        'Cada confirmación tiene un código propio. Es lo que se busca en ' +
        'la puerta el día de la fiesta, desde el modo del día.\n\n' +
        'Sirve para no depender de cómo esté escrito el apellido: se ' +
        'puede buscar por nombre también, pero el código es exacto.',
    },
  },


  /* ─── 10. SERVIDOR ────────────────────────────────────────────────── */
  servidor: {
    /* De dónde cuelga la API. Se deja relativo a propósito: así funciona
       igual en aniaxv.com y en cualquier prueba local, sin tocar nada. */
    base: 'api/',

    /* Cuántos segundos esperar una respuesta antes de darla por perdida.
       Con mala señal, sin este límite la app se queda colgada para
       siempre con el girador dando vueltas.

       ERAN 20 Y AHORA SON 8. El número bajó porque cambió lo que pasa
       al agotarse: antes se llegaba a un error, así que convenía
       esperar mucho con tal de no fallar. Ahora se cae en la copia
       guardada del teléfono, que es una respuesta útil. Y si hay una
       copia, veinte segundos de esqueleto para terminar mostrando algo
       que ya estaba ahí desde el principio no le sirven a nadie —menos
       todavía el día de la fiesta, en un salón con la señal saturada. */
    segundosDeEspera: 8,
  },
};
