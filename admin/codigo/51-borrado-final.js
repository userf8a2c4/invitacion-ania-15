/* ══════════════════════════════════════════════════════════════════════
   51-BORRADO-FINAL.JS · cumplir lo que se le prometió al invitado

   QUÉ ES ESTA PANTALLA
   La única forma de disparar api/borrado_final.php, que borra los datos
   personales de los invitados cuando la fiesta ya pasó.

   POR QUÉ EXISTE ESTA PANTALLA Y NO SOLO EL ENDPOINT
   Porque un endpoint que nadie llama es una función que no existe. Ya
   pasó en este proyecto: `listar_pedidos` estuvo desde el primer día sin
   que ninguna pantalla lo invocara, así que las compras eran invisibles
   y nadie lo notó durante semanas. Además éste pide POST con contraseña
   y frase en el cuerpo: no se puede disparar escribiendo una dirección
   en el navegador, ni siquiera sabiendo cuál es.

   CÓMO ESTÁ ARMADA, Y POR QUÉ ASÍ
   Primero se MUESTRA y recién después se puede borrar. La vista previa
   sale sola al abrir y dice, tabla por tabla, cuántas filas se van a ir.
   El botón no aparece hasta que eso está a la vista.

   No se parece a las otras hojas del panel a propósito: acá el error no
   se deshace. Todo lo que en el resto de la app está pensado para que
   sea rápido, acá está pensado para que sea lento.
   ══════════════════════════════════════════════════════════════════════ */

/** Lo que hay que escribir, letra por letra. Tiene que coincidir con
    FRASE_DE_CONFIRMACION de api/borrado_final.php. */
const FRASE_DEL_BORRADO = 'BORRAR LOS DATOS DE LOS INVITADOS';

/**
 * La hoja del borrado final.
 *
 * @returns {Promise<void>}
 */
async function abrirHojaDeBorradoFinal() {
  const cuerpo = abrirHoja('Borrar los datos de los invitados',
    '<p class="vacio__texto">Buscando qué hay para borrar…</p>');

  let previa;
  try {
    previa = await traer('borrado_final.php?accion=vista_previa');
  } catch (error) {
    cuerpo.innerHTML = '<p class="aviso-error">' + seguro(error.message) + '</p>';
    return;
  }

  const conFilas = (previa.tablas || []).filter((t) => t.filas > 0);
  const total    = previa.filas_en_total || 0;

  /* Nada que borrar: se dice y se termina. Ofrecer el botón igual sería
     invitar a apretar algo que no hace nada. */
  if (total === 0) {
    cuerpo.innerHTML =
      '<div class="tarjeta">' +
        '<p>No hay datos de invitados para borrar.</p>' +
        '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
          'O ya se borraron, o esta base nunca los tuvo.' +
        '</p>' +
      '</div>';
    return;
  }

  cuerpo.innerHTML =
    /* La promesa primero. Es el motivo de que esta pantalla exista, y
       leerla antes cambia lo que se siente al apretar el botón. */
    '<div class="tarjeta">' +
      '<p style="font-style:italic;opacity:.85">' +
        '«Tus datos los usamos solo para organizar la fiesta… No se ' +
        'comparten con nadie más, y se borran cuando pase el evento.»' +
      '</p>' +
      '<p class="vacio__texto" style="margin-top:var(--esp-1)">' +
        'Eso dice el formulario donde confirmaron. Esto es lo que lo cumple.' +
      '</p>' +
    '</div>' +

    '<div class="tarjeta__titulo">Qué se va a borrar</div>' +
    '<ul style="margin:0 0 var(--esp-2);padding-left:1.1rem;line-height:1.7">' +
      conFilas.map((t) =>
        '<li><strong>' + t.filas + '</strong> · ' + seguro(t.que_es) + '</li>'
      ).join('') +
    '</ul>' +
    '<p style="margin-bottom:var(--esp-2)"><strong>' + total +
      ' filas en total.</strong> No se puede deshacer.</p>' +

    '<div class="tarjeta__titulo">Qué NO se toca</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      seguro(previa.no_se_toca || '') +
    '</p>' +

    (previa.avisos || []).map((a) =>
      '<p class="aviso-error" style="margin-bottom:var(--esp-1)">' +
        seguro(a) + '</p>'
    ).join('') +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-2)">' +
      'Para confirmar</div>' +
    '<p class="vacio__texto" style="margin-bottom:var(--esp-1)">' +
      'Escribí, tal cual: <strong>' + FRASE_DEL_BORRADO + '</strong>' +
    '</p>' +
    campoTexto({ id: 'bf-frase', rotulo: 'La frase', valor: '' }) +
    campoTexto({ id: 'bf-clave', rotulo: 'Tu contraseña', tipo: 'password', valor: '' }) +

    '<button type="button" class="boton boton--peligro boton--ancho" ' +
            'id="bf-borrar" style="margin-top:var(--esp-2)" disabled>' +
      'Borrar los datos de ' + total + ' filas' +
    '</button>';

  const frase  = buscar('#bf-frase', cuerpo);
  const clave  = buscar('#bf-clave', cuerpo);
  const boton  = buscar('#bf-borrar', cuerpo);

  /* El botón se habilita solo cuando la frase está COMPLETA y bien
     escrita. El servidor la vuelve a comprobar —esto no es la guarda,
     es la fricción— pero que el botón esté apagado hasta entonces es lo
     que convierte un clic distraído en un acto deliberado. */
  const revisar = () => {
    boton.disabled = frase.value.trim() !== FRASE_DEL_BORRADO ||
                     clave.value === '';
  };
  frase.addEventListener('input', revisar);
  clave.addEventListener('input', revisar);

  boton.addEventListener('click', async () => {
    boton.disabled = true;
    boton.textContent = 'Borrando…';

    try {
      /* ⚠️ mandarSinCola() Y NO mandar().
       *
       * mandar() guarda la escritura en la cola cuando no hay señal y
       * la reintenta sola más tarde. Para un pago o un invitado eso es
       * exactamente lo que se quiere. Acá sería un desastre: el borrado
       * de 115 personas quedaría esperando en el teléfono —con la
       * contraseña adentro— para dispararse solo en cualquier momento,
       * quizá en manos de otra persona y sin nadie mirando.
       *
       * Sin cola, la falta de señal falla en la cara de quien apretó,
       * que es la única forma correcta de que esto no salga. */
      const r = await mandarSinCola('borrado_final.php?accion=borrar', {
        confirmacion: frase.value.trim(),
        contrasena: clave.value,
        /* La vista previa ya avisó si no había ninguna llegada. Si aun
           así se llegó hasta acá —se leyó el aviso y se escribió la
           frase entera— no tiene sentido rebotarlo de nuevo. */
        sin_llegadas: true,
      });

      cuerpo.innerHTML =
        '<div class="tarjeta">' +
          '<p><strong>Borrados los datos de ' + (r.filas_borradas || 0) +
            ' filas.</strong></p>' +
          (r.fallaron && r.fallaron.length
            ? '<p class="aviso-error" style="margin-top:var(--esp-1)">' +
              'No se pudieron vaciar: ' + seguro(r.fallaron.join(', ')) +
              '</p>'
            : '') +
        '</div>' +
        '<p class="aviso-error">' + seguro(r.todavia_falta || '') + '</p>';

    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Borrar los datos de ' + total + ' filas';
    }
  });
}
