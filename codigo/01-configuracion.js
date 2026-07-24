/* ══════════════════════════════════════════════════════════════════════
   01 · CONFIGURACIÓN
   ══════════════════════════════════════════════════════════════════════

   👉 ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS TOCAR PARA CAMBIAR DATOS.

   Todo lo que se puede personalizar de la invitación (la fecha, el lugar,
   el mensaje de los papás, el enlace de regalos, la canción…) vive acá
   adentro. El resto del código lee estos valores; vos no tenés que
   buscarlos por ningún otro lado.

   CÓMO SE EDITA
   Cambiá solamente lo que está entre comillas. Por ejemplo, para mover
   la fiesta al 7 de noviembre:

       ANTES:  fechaEnPalabras: '24 de Octubre de 2026',
       DESPUÉS: fechaEnPalabras: '7 de Noviembre de 2026',

   ⚠️ Reglas de oro para no romper nada:
     1. No borres las comillas ' ' que rodean cada texto.
     2. No borres la coma , del final de cada línea.
     3. Si tu texto lleva un apóstrofo (por ejemplo: d'Angelo), escribilo
        así: 'd\'Angelo'  (con una barra invertida antes).

   ÍNDICE
     1. Datos de la fiesta
     2. Lugar
     3. Envío de correos (EmailJS)
     4. Mesa de regalos
     5. Música
     6. Textos de la invitación
   ══════════════════════════════════════════════════════════════════════ */

const CONFIGURACION = {

  /* ─── 1. DATOS DE LA FIESTA ───────────────────────────────────────── */
  fiesta: {
    /** Nombre de la quinceañera. Aparece gigante en la portada. */
    nombre: 'Ania',

    /** Cuántos años cumple (se muestra como "XV Años"). */
    edadEnRomanos: 'XV',

    /**
     * Fecha y hora exactas del evento en "formato de computadora".
     * Se escribe:  'AÑO-MES-DÍA T HORA:MINUTOS:SEGUNDOS'  (24 horas).
     * Ejemplos:
     *    24 de octubre de 2026 a las 5 de la tarde → '2026-10-24T17:00:00'
     *    3 de marzo de 2027 a las 8 de la noche    → '2027-03-03T20:00:00'
     *
     * La usan la cuenta regresiva y el botón "agregar al calendario".
     * Si la cambiás, cambiá también fechaEnPalabras para que coincida.
     */
    fechaYHora: '2026-10-24T17:00:00',

    /** A qué hora termina (para el archivo de calendario). */
    fechaYHoraDeCierre: '2026-10-25T01:00:00',

    /* Los mismos datos escritos "para humanos", tal como se leen en la web */
    diaDeLaSemana:   'Sábado',
    fechaEnPalabras: '24 de octubre de 2026',
    horaEnPalabras:  '5:00 PM',
    horarioCompleto: 'Llegada: 5:00 PM<br>Evento: 5:30 PM — 01:00 AM',

    /** Hasta cuándo se puede confirmar asistencia. */
    fechaLimiteParaConfirmar: '1 de octubre de 2026',

    /** Cómo hay que vestirse. */
    codigoDeVestimenta: 'Formal · Etiqueta<br>Evitar color rojo',

    /** Información del estacionamiento. */
    estacionamiento: 'Valet parking disponible<br>$50 por persona',
  },


  /* ─── 2. LUGAR ────────────────────────────────────────────────────── */
  lugar: {
    nombre: 'Salones de fiestas Alvi Toluca',

    direccion: 'Via José López Portillo 318, Delegación San Lorenzo Tepaltitlán I,<br>Toluca, Estado de México',

    /** La misma dirección en una sola línea (para el calendario). */
    direccionEnUnaLinea: 'Via José López Portillo 318, San Lorenzo Tepaltitlán, Toluca, Estado de México',

    /** Enlace para abrir el lugar en la app de Google Maps. */
    enlaceParaAbrirEnMaps: 'https://maps.app.goo.gl/EBXftZ48M5c3HLFGA',

    /**
     * Dirección del mapa que se ve incrustado en la página.
     * OJO: NO sirve el enlace corto de "Compartir" (maps.app.goo.gl),
     * porque Google no permite mostrarlo dentro de una web. Hay que usar
     * una dirección que termine en  &output=embed  como esta.
     */
    enlaceDelMapaIncrustado: 'https://www.google.com/maps?q=Salones+de+fiestas+Alvi,+Via+Jos%C3%A9+L%C3%B3pez+Portillo+318,+San+Lorenzo+Tepaltitl%C3%A1n,+Toluca,+Estado+de+M%C3%A9xico&output=embed',
  },


  /* ─── 3. ENVÍO DE CORREOS (EmailJS) ───────────────────────────────────
     EmailJS es un servicio gratuito que manda correos desde una web sin
     necesidad de tener un servidor propio. Mientras la clave pública diga
     "PEGA_AQUI…", la web funciona igual pero NO envía correos: el invitado
     ve su pase en pantalla y listo.

     SON DOS CORREOS DISTINTOS, no uno:

       · El del INVITADO — su comprobante, con el código de pase.
         Va a la dirección que la persona escribió en el formulario.

       · El del ADMINISTRADOR — el aviso para quien organiza, con el
         detalle de menús, alergias y notas. Va a tu correo.

     Por eso hacen falta DOS plantillas en EmailJS: cada una tiene su
     propio destinatario y su propio texto. Si dejás una de las dos en
     "PEGA_AQUI…", esa simplemente no se manda y la otra sigue andando.

     CÓMO OBTENERLOS (15 minutos, una sola vez):
       1. Creá una cuenta gratis en https://www.emailjs.com
       2. Add New Service → Gmail → copiá el "Service ID"
       3. Account → API Keys → copiá la "Public Key"
       4. Email Templates → Create New Template. En el campo "To Email"
          poné  {{correo_destino}}  (así la web decide a quién le llega,
          y la misma plantilla no queda atada a una dirección fija).
          Copiá su "Template ID" → va en idDePlantillaDelInvitado.
       5. Repetí el paso 4 con una segunda plantilla, esta redactada para
          vos —el aviso de que alguien confirmó— y su ID va en
          idDePlantillaDelAdministrador.
       6. Escribí tu propia dirección en correoDelAdministrador.

     En cualquiera de las dos plantillas podés usar estas etiquetas, que
     la web completa sola:
       {{nombre_invitado}}  {{correo_invitado}}  {{cantidad_adultos}}
       {{cantidad_ninos}}   {{resumen_menus}}    {{detalle_menus}}
       {{alergias}}         {{notas}}            {{codigo_de_pase}}
       {{fecha}}            {{lugar}}            {{correo_destino}}
     ------------------------------------------------------------------- */
  correo: {
    clavePublica:  'PEGA_AQUI_TU_PUBLIC_KEY',
    idDelServicio: 'PEGA_AQUI_TU_SERVICE_ID',

    /** Plantilla del comprobante que recibe el invitado. */
    idDePlantillaDelInvitado: 'PEGA_AQUI_TU_TEMPLATE_ID_INVITADO',

    /** Plantilla del aviso que recibe quien organiza. */
    idDePlantillaDelAdministrador: 'PEGA_AQUI_TU_TEMPLATE_ID_ADMIN',

    /** A dónde llega ese aviso. Tu correo. */
    correoDelAdministrador: 'PEGA_AQUI_TU_CORREO',
  },


  /* ─── 3B. REGISTRO DE CONFIRMACIONES (Google Sheets) ──────────────────
     El correo avisa en el momento, pero se acumula en la bandeja de
     entrada y no se puede ordenar ni sumar. Para llevar el control de
     verdad —cuántos van, cuántos vegetarianos, quién falta— cada
     confirmación se anota además como una fila en una hoja de cálculo.

     Esa hoja ES el panel de administración: se ordena, se filtra, se
     descarga a Excel y se abre desde el celular el día de la fiesta.

     Mientras esto diga "PEGA_AQUI…", no se anota nada y la web funciona
     igual (el correo y el pase siguen andando).

     CÓMO ARMARLO: está explicado paso a paso en el README, sección 6,
     junto con el código que hay que pegar en Google. Son 20 minutos.

     PARA CAMBIAR DE HOJA MÁS ADELANTE: alcanza con pegar acá las dos
     direcciones nuevas. Y si en vez de crear otra hoja se transfiere la
     propiedad de esta desde Google Drive, no hay que tocar ni esto.
     ------------------------------------------------------------------- */
  registro: {
    /** Dirección del Apps Script que anota la fila (termina en /exec). */
    urlParaAnotar: 'PEGA_AQUI_LA_URL_DEL_SCRIPT',

    /** La hoja en sí, para poder abrirla desde el pie de página. */
    /* OJO: esta hoja es la PROVISORIA, la que se usó para armar todo.
       Antes de mandar la invitación hay que reemplazarla por la
       definitiva y revisar que no esté compartida con "cualquiera que
       tenga el enlace": ahí van a estar los datos de los invitados. */
    urlDeLaHoja: 'https://docs.google.com/spreadsheets/d/1-pD1-F8C-2b-FXwfOYfayTqFtw9ik6DadVoxTVdU4zs/edit',

    /**
     * FIRMA DE LAS CONFIRMACIONES (integridad del registro).
     *
     * Es una contraseña compartida entre esta web y el script de Google. La
     * web firma cada confirmación con ella (HMAC-SHA256) y el script rechaza
     * las que no traigan una firma válida. Eso frena que alguien mande
     * confirmaciones falsas o basura al endpoint con una herramienta técnica.
     *
     * ⚠️ SALVEDAD HONESTA: esta web es estática, así que quien lea el código
     * fuente PUEDE ver esta clave. Por eso es un DISUASIVO —sube mucho la
     * barrera contra el spam casual y las inyecciones triviales—, NO una
     * garantía contra un atacante decidido. La protección de LECTURA de los
     * datos sigue siendo el permiso de compartición de la hoja de Google.
     *
     * Mientras diga "PEGA_AQUI…", la web NO firma y el script (si tampoco
     * tiene la clave configurada) acepta como siempre: nada se rompe.
     *
     * CÓMO ELEGIRLA: una frase larga al azar. La MISMA hay que pegarla en las
     * Propiedades del Script de Google (ver README, sección 6).
     */
    claveDeFirma: 'PEGA_AQUI_UNA_FRASE_SECRETA_LARGA',
  },


  /* ─── 4. MESA DE REGALOS ──────────────────────────────────────────── */
  regalos: {
    enlaceDeLaLista: 'https://www.amazon.com.mx/registries/gl/owner-view/LJDSRURUU3G4',
    aclaracion: 'También se aceptan transferencias — preguntar a los papás',
  },


  /* ─── 5. MÚSICA ───────────────────────────────────────────────────── */
  musica: {
    /** Ruta del archivo de audio dentro de la carpeta recursos. */
    archivo: 'recursos/cancion-hysteria.mp3',
    titulo: 'Hysteria',
    artista: 'Muse',
    album: 'Absolution',

    /**
     * Volumen inicial, de 0 (mudo) a 1 (máximo).
     * 0.7 = 70 %. Si el invitado lo cambia, la web recuerda su elección.
     */
    volumenInicial: 0.7,
  },


  /* ─── 6. TEXTOS DE LA INVITACIÓN ──────────────────────────────────────
     Acá se pueden usar etiquetas de HTML simples:
        <br>      → salto de línea
        <br><br>  → renglón en blanco entre párrafos
     ------------------------------------------------------------------- */
  textos: {
    antetitulo: 'Una velada para recordar',

    mensajeDeLosPapas:
      'Quince años han pasado como el susurro del viento entre rosas — ' +
      'cada momento, un pétalo que cayó con gracia y amor.<br><br>' +
      'Hoy, con el corazón lleno de gratitud, celebramos a la persona más ' +
      'extraordinaria que la vida nos pudo dar. Ania, eres nuestra luz, ' +
      'nuestra historia más bella y nuestra mayor aventura.<br><br>' +
      'Esta noche es para ti. ¡Que comience la magia!',

    firmaDeLosPapas: '— Con todo nuestro amor, Mamá y Papá',

    /** Saludo por defecto del sobre, cuando el enlace no trae nombre. */
    saludoGenerico: 'Estás invitado',
  },
};
