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

const NECESARIAS = ['menusPersonaPorPersona', 'alergiasPersonaPorPersona'];
const faltan = NECESARIAS.filter((n) => !saca(n));

comprobar('las dos funciones del detalle están donde se las busca',
  faltan.length === 0,
  'no se encontraron: ' + faltan.join(', '));

if (faltan.length === 0) {
  const f = new Function(
    'const oGuion = (x) => (x === undefined || x === null || ' +
    'String(x).trim() === "") ? "—" : String(x);\n' +
    saca('menusPersonaPorPersona') + '\n' +
    saca('alergiasPersonaPorPersona') + '\n' +
    'return { menusPersonaPorPersona, alergiasPersonaPorPersona };'
  )();

  const familia = [
    { nombre: 'Josué Hernández', tipo: 'adulto', menu: 'estándar',    alergias: 'Durazno' },
    { nombre: 'Ana Hernández',   tipo: 'adulto', menu: 'vegetariano', alergias: '' },
    { nombre: 'Luis',            tipo: 'nino',   menu: '',            alergias: 'Nuez' },
  ];

  /* ─── 1. LOS MENÚS, CON NOMBRE ──────────────────────────────────── */

  console.log('\nLos menús\n');

  const menus = f.menusPersonaPorPersona(familia, '2 estándar');

  comprobar('cada persona sale con su plato',
    menus.includes('Josué Hernández: estándar') &&
    menus.includes('Ana Hernández: vegetariano'),
    'dio: ' + menus);

  /* ⛔ QUIEN NO ELIGIÓ NO SE OMITE. Un nombre que falta en la lista es
     indistinguible de un nombre que nadie cargó, y a la hora de servir
     esa diferencia importa. */
  comprobar('y quien no eligió aparece igual, dicho',
    /Luis: sin elegir/.test(menus),
    'dio: ' + menus);

  comprobar('y los niños se cuentan aparte, para la cocina',
    /Menú infantil: 1/.test(menus),
    'dio: ' + menus);


  /* ─── 2. LAS ALERGIAS, CON NOMBRE ───────────────────────────────── */

  console.log('\nLas alergias\n');

  const al = f.alergiasPersonaPorPersona(familia, 'Acompañante: Durazno');

  comprobar('dice QUIÉN tiene cada alergia',
    al.includes('Josué Hernández: Durazno') && al.includes('Luis: Nuez'),
    'dio: ' + al + '. En la cocina, «Acompañante: Durazno» no dice a ' +
    'quién no servirle durazno');

  /* ⛔ SOLO SE NOMBRA A QUIEN TIENE ALGO. Meter doce «ninguna» esconde
     las dos que importan: una lista de alergias es corta a propósito. */
  comprobar('y no nombra a quien no tiene ninguna',
    !al.includes('Ana Hernández'),
    'dio: ' + al);

  comprobar('sin alergias de nadie, dice «Ninguna» y no un resumen viejo',
    f.alergiasPersonaPorPersona(
      [{ nombre: 'Paolo', tipo: 'adulto', menu: 'estándar', alergias: 'Ninguna' }],
      'Ninguna') === 'Ninguna',
    'dio: ' + f.alergiasPersonaPorPersona(
      [{ nombre: 'Paolo', tipo: 'adulto', alergias: 'Ninguna' }], 'Ninguna'));


  /* ─── 3. LA QUE MÁS IMPORTA: QUE SE VEA CUANDO NO HAY DETALLE ───── */

  console.log('\nCuando no hay detalle, se dice\n');

  const sinDetalle = f.menusPersonaPorPersona([], '2 estándar · 1 infantil');

  comprobar('el resumen del grupo sale MARCADO como resumen',
    /sin desglose/i.test(sinDetalle),
    'dio: «' + sinDetalle + '». Sin la marca, una familia que eligió ' +
    'plato por plato y una de la que no sabemos nada salen iguales en el ' +
    'papel, y no hay forma de saber a quién preguntarle');

  comprobar('y el resumen sigue estando, no se pierde',
    sinDetalle.includes('2 estándar'),
    'dio: ' + sinDetalle);
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
