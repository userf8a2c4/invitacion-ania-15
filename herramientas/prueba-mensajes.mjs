/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-MENSAJES.MJS · lo que le escribieron a Ania

   QUÉ CUIDA
   Tres cosas, y las tres se rompen en silencio:

   1. EL CENTINELA. El formulario público no manda vacío cuando la caja
      está vacía: manda la cadena «, ». Sin filtrarlo, el libro de Ania
      sale lleno de comas sueltas y la ficha del invitado muestra una
      coma donde tenía que decir «—». Y filtrarlo DE MÁS es peor: se
      perdería un mensaje real que empiece o termine con coma.

   2. EL RESCATE. Estos mensajes viven en `confirmaciones.notas`, que es
      lo primero que vacía borrado_final.php. Si el aviso desaparece,
      alguien borra y no hay de dónde sacarlos.

   3. EL TEXTO ES DE UN DESCONOCIDO. Lo escribió un invitado en un
      formulario público. Si se mete en el HTML del libro sin escapar,
      cualquiera que confirme puede poner lo que quiera en la página que
      la familia va a abrir e imprimir.

   CÓMO SE CORRE
       node herramientas/prueba-mensajes.mjs
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que +
              (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

const piezas   = leer('admin', 'codigo', '06-piezas.js');
const pantalla = leer('admin', 'codigo', '52-mensajes.js');
const ficha    = leer('admin', 'codigo', '08-vista-invitados.js');
const api      = leer('admin', 'api', 'mensajes.php');
const borrado  = leer('admin', 'api', 'borrado_final.php');
const formulario = leer('codigo', '11-formulario-confirmacion.js');

/* ─── 1. El centinela, ejecutando la función de verdad ─────────────── */

console.log('\nEl «, » que manda el formulario vacío\n');

/* Primero: que el centinela SIGA existiendo. Si algún día el formulario
   empieza a mandar vacío de verdad, este filtro sobra y hay que sacarlo
   — pero enterarse por acá es mucho mejor que no enterarse. */
comprobar('el formulario sigue mandando «, » cuando está vacío',
  /notas: notas \|\| ', '/.test(formulario),
  'si esto cambió, el filtro de loQueEscribio() ya no hace falta');

const loQueEscribio = new Function(
  piezas.slice(piezas.indexOf('function loQueEscribio')) +
  '\n return loQueEscribio;')();

const CASOS = [
  ['vacío',                        '',                    ''],
  ['el centinela exacto',          ', ',                  ''],
  ['una coma sola',                ',',                   ''],
  ['solo comas y espacios',        '  ,  ,  ',            ''],
  ['nulo',                         null,                  ''],
  ['un mensaje de verdad',         'Felicidades Ania',    'Felicidades Ania'],
  ['con espacios de sobra',        '  Te queremos  ',     'Te queremos'],
  /* El que importa: un mensaje real QUE LLEVA COMAS. Un filtro
     demasiado entusiasta se lo comería, y sería perder un regalo. */
  ['un mensaje con comas adentro', 'Vamos, con mucho gusto', 'Vamos, con mucho gusto'],
  ['una coma al principio',        ', pero ahí estaremos', ', pero ahí estaremos'],
  ['varias líneas',                'Ania:\nQue seas feliz', 'Ania:\nQue seas feliz'],
];

for (const [que, entra, sale] of CASOS) {
  const real = loQueEscribio(entra);
  comprobar(que + ' → ' + JSON.stringify(sale),
    real === sale, 'dio ' + JSON.stringify(real));
}

/* ─── 2. Que las tres copias digan lo mismo ────────────────────────── */

console.log('\nEl mismo criterio en los tres lugares\n');

comprobar('el panel filtra el centinela (06-piezas.js)',
  /\^\[,\\s\]\+\$/.test(piezas));

comprobar('el servidor filtra igual (mensajes.php)',
  /\^\[,\\s\]\+\$/.test(api));

comprobar('y el aviso del borrado también',
  /\^\[,\\s\]\+\$/.test(borrado),
  'si contara distinto, el aviso diría «23» y la pantalla mostraría 22');

comprobar('el aviso cuenta en PHP y no con SQL',
  /SELECT notas FROM confirmaciones/.test(borrado) &&
  !/TRIM\(BOTH/.test(borrado),
  'el TRIM de MySQL no se lleva los saltos de línea y las cuentas se separaban');

comprobar('la ficha del invitado usa el filtro',
  /loQueEscribio\(fila\.notas\)/.test(ficha),
  'sin esto muestra una coma suelta donde tiene que decir «—»');

/* ─── 3. El libro no puede ejecutar lo que escribió un invitado ───── */

console.log('\nEl texto viene de un formulario público\n');

comprobar('el mensaje se escapa al pintarlo en el panel',
  /seguro\(m\.mensaje\)/.test(pantalla));

comprobar('y el nombre también',
  /seguro\(m\.nombre\)/.test(pantalla));

const elLibro = pantalla.slice(pantalla.indexOf('function abrirElLibro'));

comprobar('en el libro, el mensaje va escapado',
  /seguro\(m\.mensaje\)/.test(elLibro),
  'sin escapar, cualquiera que confirme escribe HTML en la página que abre la familia');

comprobar('el libro no lleva ni un <script>',
  !/<script/i.test(elLibro),
  'un recuerdo no necesita ejecutar nada, y la CSP del panel lo bloquearía igual');

/* ─── 4. Que se pueda leer dentro de veinte años ───────────────────── */

console.log('\nEl libro\n');

comprobar('las tipografías se piden a la raíz REAL del sitio',
  /raizDelSitio = location\.origin/.test(elLibro),
  'con «/recursos/…» a secas fallan en PBE, que vive en /pbe/, y no lo nota nadie');

comprobar('hay alternativas si las tipografías no cargan',
  /Georgia/.test(elLibro),
  'el día que el sitio no exista, el texto tiene que seguir leyéndose');

comprobar('al imprimir, fondo claro y tinta oscura',
  /@media print\{body\{background:#fff/.test(elLibro),
  'un fondo negro a página completa sale gris sucio y se lleva el cartucho');

comprobar('un mensaje no se parte entre dos hojas',
  /break-inside:avoid/.test(elLibro));

comprobar('se respetan los saltos de línea del invitado',
  /white-space:pre-wrap/.test(elLibro),
  'quien escribió tres renglones los escribió por algo');

/* ─── 5. El rescate antes del borrado ──────────────────────────────── */

console.log('\nEl aviso que evita perderlos\n');

comprobar('borrado_final.php cuenta los mensajes',
  /function cuantosMensajesParaAnia/.test(borrado));

comprobar('y avisa antes de borrar',
  /guardá la página ANTES/.test(borrado),
  'sin el aviso, alguien borra y no hay de dónde sacarlos');

comprobar('el aviso dice dónde ir',
  /Mensajes para Ania/.test(borrado));

comprobar('la pantalla también lo dice, no solo el borrado',
  /única copia/.test(pantalla));

/* ─── 6. Se puede llegar desde el panel ────────────────────────────── */

console.log('\nRegistrada en el panel\n');

const indiceAdmin = leer('admin', 'index.html');
const navegacion  = leer('admin', 'codigo', '05-navegacion.js');
const config      = leer('admin', 'codigo', '01-configuracion.js');

comprobar('el archivo se carga', /codigo\/52-mensajes\.js/.test(indiceAdmin));
comprobar('está en el menú',    /\['mensajes',/.test(config));
comprobar('la navegación la abre',
  /case 'mensajes':[\s\S]{0,60}abrirHojaDeMensajes\(\)/.test(navegacion));

comprobar('la función queda al nivel superior',
  /^async function abrirHojaDeMensajes\(\)/m.test(pantalla),
  'el panel no se empaqueta: una función anidada no la ve nadie');

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Los mensajes se leen, se guardan, y nadie los borra sin avisar.\n');
