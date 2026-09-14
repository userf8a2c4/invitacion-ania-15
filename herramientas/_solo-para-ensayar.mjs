/* ══════════════════════════════════════════════════════════════════════
   LO QUE NO VIAJA AL HOSTING
   ══════════════════════════════════════════════════════════════════════

   Archivos de `codigo/` que existen solo para poder MIRAR algo mientras se
   construye, y que no tienen por qué estar publicados en aniaxv.com.

   ⚠️ VIVE EN UN SOLO LUGAR A PROPÓSITO. La lista la usan dos herramientas
   que se contradicen si se desincronizan:

     · `minificar-js.mjs` no los publica (y borra el que hubiera quedado
       de una versión anterior que sí lo hacía).
     · `subir-version.mjs` corta el despliegue si un fuente es más nuevo
       que su minificado — y sin saber de esta lista, cortaría para
       siempre por un archivo que NUNCA va a tener minificado.

   Duplicar la lista es cómo se llega a que una herramienta excluya algo y
   la otra lo exija.

   ⛔ EXCLUIR UN ARCHIVO DE ACÁ NO ES APAGARLO. 29-ensayo-del-eclipse.js ya
   se auto-veta fuera de PBE, y `window.ECLIPSE` solo existe si el hostname
   es de pruebas: son tres candados independientes y ninguno depende de
   esto. Lo que esta lista quita es peso muerto y superficie publicada.

   ⚠️ Y QUIEN LO CARGUE TIENE QUE PEDIRLO DEL FUENTE. `index.html` lo pide
   de `codigo/29-ensayo-del-eclipse.js` justamente porque acá no se
   publica: apuntarlo a `codigo/produccion/` sería un 404 y el panel de
   ensayo no abriría en PBE.
   ══════════════════════════════════════════════════════════════════════ */

export const SOLO_PARA_ENSAYAR = [
  '29-ensayo-del-eclipse.js',
];
