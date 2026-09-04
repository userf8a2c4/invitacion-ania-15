/* ══════════════════════════════════════════════════════════════════════
   47 · CONFIGURACIÓN DE RECIBOS Y CONTRATOS

   QUÉ HACE ESTE ARCHIVO
   Una pantalla chica para que Lucila personalice cómo se numeran los
   recibos y los contratos (prefijo + desde qué número arrancar), y los
   datos suyos que aparecen impresos en ambos documentos (domicilio,
   teléfono, correo, RFC) — todo guardado en `ajustes`, la misma tabla
   genérica que ya usa la paleta de colores.

   POR QUÉ EL PREFIJO Y EL NÚMERO INICIAL, Y NO SOLO UNO
   Cambiar el prefijo (de "REC" a otra cosa, por ejemplo) abre una serie
   numerada nueva por completo, sin chocar nunca con lo ya emitido —eso
   es lo que hace inofensivo "reiniciar" de verdad—. El número inicial
   sirve para el caso más común: Lucila ya venía anotando recibos en
   papel hasta el 50, y quiere que el panel siga desde el 51 en vez de
   arrancar de cero. admin/api/recibos.php y contratos.php siempre usan
   el MÁS ALTO entre "lo que ya se emitió + 1" y este número, así que
   bajarlo nunca hace retroceder ni repetir un número ya usado.

   QUÉ SE LE PUEDE PEDIR
     abrirConfiguracionDeDocumentos()   la pantalla completa
   ══════════════════════════════════════════════════════════════════════ */

/** Las claves de `ajustes` que administra esta pantalla, con su respaldo. */
const AJUSTES_DE_DOCUMENTOS = [
  { clave: 'nombre_pagadora',        respaldo: 'Lucila García' },
  { clave: 'pagadora_domicilio',     respaldo: '' },
  { clave: 'pagadora_telefono',      respaldo: '' },
  { clave: 'pagadora_correo',        respaldo: '' },
  { clave: 'pagadora_rfc',           respaldo: '' },
  { clave: 'lugar_expedicion',       respaldo: '' },
  { clave: 'recibo_prefijo',         respaldo: 'REC' },
  { clave: 'recibo_numero_inicial',  respaldo: '1' },
  { clave: 'contrato_prefijo',       respaldo: 'CON' },
  { clave: 'contrato_numero_inicial', respaldo: '1' },
];

/**
 * Trae todos los ajustes de esta pantalla de una vez.
 * @returns {Promise<Object>} clave → valor (ya con el respaldo aplicado)
 */
async function traerAjustesDeDocumentos() {
  const resultado = {};
  await Promise.all(AJUSTES_DE_DOCUMENTOS.map(async a => {
    try {
      const r = await traer('ajustes.php?accion=obtener&clave=' + encodeURIComponent(a.clave));
      resultado[a.clave] = (r && r.valor !== null && r.valor !== undefined && r.valor !== '')
        ? r.valor : a.respaldo;
    } catch (error) {
      resultado[a.clave] = a.respaldo;
    }
  }));
  return resultado;
}

/**
 * La pantalla de configuración. Se puede abrir desde el generador de
 * recibos o de contratos ("⚙️ Configurar numeración y datos"), o desde
 * cualquier otro lado que la enlace en el futuro.
 *
 * @returns {Promise<void>}
 */
async function abrirConfiguracionDeDocumentos() {
  const cuerpo = abrirHoja('Recibos y contratos', '<div class="esqueleto"></div>'.repeat(4));
  const valores = await traerAjustesDeDocumentos();

  cuerpo.innerHTML =
    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Esto se imprime en cada recibo y contrato nuevo — los que ya ' +
      'generaste no cambian.' +
    '</p>' +

    '<div class="tarjeta__titulo">Quién paga</div>' +
    campoTexto({ id: 'cfg-nombre', rotulo: 'Nombre', valor: valores.nombre_pagadora }) +
    campoTexto({ id: 'cfg-domicilio', rotulo: 'Domicilio (opcional)',
                 valor: valores.pagadora_domicilio }) +
    campoTelefono({ id: 'cfg-telefono', rotulo: 'Teléfono (opcional)',
                    valor: valores.pagadora_telefono }) +
    campoTexto({ id: 'cfg-correo', rotulo: 'Correo (opcional)', valor: valores.pagadora_correo }) +
    campoTexto({ id: 'cfg-rfc', rotulo: 'RFC (opcional)', valor: valores.pagadora_rfc }) +
    campoTexto({ id: 'cfg-lugar-expedicion', rotulo: 'Ciudad donde se expiden (opcional)',
                 valor: valores.lugar_expedicion, pista: 'Ej. Toluca, Estado de México' }) +

    '<div class="tarjeta__titulo" style="margin-top:var(--esp-3)">Numeración de recibos</div>' +
    '<div class="campo-par">' +
      campoTexto({ id: 'cfg-recibo-prefijo', rotulo: 'Prefijo', valor: valores.recibo_prefijo,
                   pista: 'Ej. REC' }) +
      campoTexto({ id: 'cfg-recibo-inicio', rotulo: 'Empezar desde el número', tipo: 'number',
                   valor: valores.recibo_numero_inicial }) +
    '</div>' +
    '<button type="button" class="boton" id="cfg-reiniciar-recibo" ' +
            'style="margin-bottom:var(--esp-3)">Reiniciar conteo de recibos a 1</button>' +

    '<div class="tarjeta__titulo">Numeración de contratos</div>' +
    '<div class="campo-par">' +
      campoTexto({ id: 'cfg-contrato-prefijo', rotulo: 'Prefijo', valor: valores.contrato_prefijo,
                   pista: 'Ej. CON' }) +
      campoTexto({ id: 'cfg-contrato-inicio', rotulo: 'Empezar desde el número', tipo: 'number',
                   valor: valores.contrato_numero_inicial }) +
    '</div>' +
    '<button type="button" class="boton" id="cfg-reiniciar-contrato" ' +
            'style="margin-bottom:var(--esp-3)">Reiniciar conteo de contratos a 1</button>' +

    '<p class="vacio__texto" style="margin-bottom:var(--esp-2)">' +
      'Reiniciar no borra ni repite números ya usados: si ya emitiste ' +
      'hasta el 5, "reiniciar a 1" no hace nada hasta que cambies también ' +
      'el prefijo — así nunca se pisa un recibo o contrato real.' +
    '</p>' +

    '<div class="acciones">' +
      '<button type="button" class="boton boton--principal" id="cfg-guardar">Guardar</button>' +
    '</div>';

  buscar('#cfg-reiniciar-recibo', cuerpo).addEventListener('click', () => {
    buscar('#cfg-recibo-inicio', cuerpo).value = '1';
  });
  buscar('#cfg-reiniciar-contrato', cuerpo).addEventListener('click', () => {
    buscar('#cfg-contrato-inicio', cuerpo).value = '1';
  });

  buscar('#cfg-guardar', cuerpo).addEventListener('click', async () => {
    const boton = buscar('#cfg-guardar', cuerpo);
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    const paraGuardar = {
      nombre_pagadora:         valorDe('cfg-nombre', cuerpo) || 'Lucila García',
      pagadora_domicilio:      valorDe('cfg-domicilio', cuerpo),
      pagadora_telefono:       valorTelefonoDe('cfg-telefono', cuerpo),
      pagadora_correo:         valorDe('cfg-correo', cuerpo),
      pagadora_rfc:            valorDe('cfg-rfc', cuerpo),
      lugar_expedicion:        valorDe('cfg-lugar-expedicion', cuerpo),
      recibo_prefijo:          valorDe('cfg-recibo-prefijo', cuerpo) || 'REC',
      recibo_numero_inicial:   String(Math.max(1, Number(valorDe('cfg-recibo-inicio', cuerpo)) || 1)),
      contrato_prefijo:        valorDe('cfg-contrato-prefijo', cuerpo) || 'CON',
      contrato_numero_inicial: String(Math.max(1, Number(valorDe('cfg-contrato-inicio', cuerpo)) || 1)),
    };

    try {
      for (const clave of Object.keys(paraGuardar)) {
        await mandar('ajustes.php?accion=guardar', { clave: clave, valor: paraGuardar[clave] });
      }
      cerrarHoja(true);
      avisar('Guardado.');
    } catch (error) {
      avisar(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Guardar';
    }
  });
}
