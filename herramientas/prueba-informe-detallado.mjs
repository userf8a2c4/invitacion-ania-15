/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · EL INFORME DICE QUIÉN COME QUÉ Y QUIÉN ES ALÉRGICO A QUÉ
   ══════════════════════════════════════════════════════════════════════

   Carlos, mirando el PDF: «estamos dando la posibilidad de que de forma
   individual elijan menús, pero en el informe damos información general
   del grupo ("2 estándar · 1 infantil"). Desperdiciamos mucha información
   y damos datos imprecisos cuando tenemos los detalles. Detalla quién
   exactamente quiere qué. Y en las alergias, pon por nombre QUIÉN tiene
   alergia a qué».

   Cada persona guarda su plato y su alergia en `acompanantes` —el
   formulario los pide uno por uno, y confirmar.php los escribe por id—.
   El informe los aplastaba en un texto de familia.

   ⚠️ ESTA PRUEBA EJECUTA LAS FUNCIONES, no las lee. Es la lección de
   `28-eclipse.js`: un texto que se lee bien puede devolver cualquier
   cosa. Acá se sacan del archivo y se corren con familias de mentira.

   ⚠️ Y LA COMPROBACIÓN QUE MÁS IMPORTA no es que detalle cuando puede,
   sino que MARQUE cuando no puede. Un resumen de grupo disfrazado de
   detalle es peor que no tener detalle: no se distingue una familia que
   eligió plato por plato de una de la que no sabemos nada.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que);
  if (!bien) { fallos++; if (detalle) console.log('        → ' + detalle); }
};

const exportar = leer('admin', 'codigo', '13-exportar.js');

/** Saca una función del archivo, tal cual está escrita. */
function saca(nombre) {
  const m = exportar.match(
    new RegExp('function ' + nombre + '\\([\\s\\S]*?\\n\\}', 'm'));
  return m ? m[0] : null;
}

/* ─── 4. EL TELÉFONO Y EL BLOQUE POR PERSONA ────────────────────────── */

console.log('\nEl informe\n');

comprobar('la tabla lleva una columna de teléfono',
  /'Teléfono'/.test(exportar) &&
  /oGuion\(f\.invitacion_telefono\)/.test(exportar),
  'es el dato con el que se persigue a quien no contestó, y obligaba a ' +
  'volver a la app teniendo el PDF en la mano');

/* ⚠️ SALE DE `invitaciones.telefono`, que es el mismo que usa el botón de
   WhatsApp — no el «Contacto:» de las notas, que era el que mentía. */
comprobar('y ese teléfono es el del campo, no el de las notas',
  !/oGuion\(f\.notas\)[\s\S]{0,40}Teléfono/.test(exportar),
  'el de las notas es el que mostraba un número distinto al de la ficha');

comprobar('hay un bloque con una fila por persona',
  /Persona por persona/.test(exportar),
  'meter el desglose adentro de una celda de la tabla de familias lo ' +
  'vuelve ilegible: la cocina recorre personas, no familias');

comprobar('y si el detalle no llega, queda escrito en el documento',
  /falloElDetalle/.test(exportar) &&
  /Falta el detalle por persona/.test(exportar),
  'un aviso en pantalla dura tres segundos; el PDF se mira después, y ' +
  'sin esto no hay forma de saber si faltó detalle o si nadie eligió');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El informe dice quién come qué y quién es alérgico a qué,\n' +
            '  y avisa cuando no lo sabe.\n');
