/* Comprueba la descarga de invitados: que diga la verdad y que se
 * entienda impresa.
 *
 * POR QUÉ EXISTE
 * El archivo que se baja de Gente es lo que termina impreso y sobre una
 * mesa el día de la fiesta. Tenía cuatro problemas, todos del mismo tipo:
 * decía algo que no era, con total aplomo.
 *
 *   · «Asiste» decía "Sí" para TODOS, incluso para invitaciones que no se
 *     habían mandado. No era un error de la descarga: `asiste` arranca en
 *     1 a propósito, para que el bot de mesas pueda acomodar antes de que
 *     nadie conteste. Es un supuesto de trabajo, y el archivo lo
 *     presentaba como una respuesta.
 *   · «Fecha» era `fecha_hora`, que es cuándo se creó la fila —cuándo se
 *     cargó la invitación—, no cuándo contestó el invitado. Salía una
 *     fecha para todos, incluidos los que nunca respondieron.
 *   · «Menús» era un conteo: "2 pollo, 1 res". La cocina sabe cuántos
 *     platos hacer; el salón no sabe delante de quién ponerlos.
 *   · Las celdas sin dato quedaban vacías, y una fila con cuatro huecos
 *     se lee como un documento a medio hacer.
 *
 * NINGUNO ROMPE NADA. El archivo se genera perfecto, se abre perfecto y
 * está mal. Por eso hace falta una prueba: no hay error que mirar.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const exportar = readFileSync(raiz('admin', 'codigo', '13-exportar.js'), 'utf8');
const api      = readFileSync(raiz('admin', 'api', 'acompanantes.php'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const codigo = sinComentarios(exportar);

/* Se sacan las dos funciones puras y se las CORRE: lo que importa es qué
   contestan, no cómo están escritas. */
const sacar = nombre => {
  const desde = codigo.indexOf('function ' + nombre);
  if (desde === -1) return null;
  return codigo.slice(desde, codigo.indexOf('\n}', desde) + 2);
};

/* ─── 1. Un guion en vez de un hueco ─────────────────────────────── */

console.log('\nLas celdas sin dato\n');

const fuenteGuion = sacar('oGuion');
comprobar('existe oGuion()', !!fuenteGuion);

if (fuenteGuion) {
  const oGuion = new Function(fuenteGuion + '\nreturn oGuion;')();
  const casos = [
    ['vacío', '', '—'],
    ['null', null, '—'],
    ['undefined', undefined, '—'],
    ['solo espacios', '   ', '—'],
    ['un texto normal', 'Ana', 'Ana'],
    ['el número cero', 0, '0'],
  ];
  for (const [queEs, entrada, esperado] of casos) {
    comprobar(queEs + ' → ' + esperado, oGuion(entrada) === esperado,
      'devolvió ' + JSON.stringify(oGuion(entrada)));
  }
  /* ⚠️ El cero NO es un hueco. Una familia con 0 niños tiene que decir 0,
     no un guion: el guion significa "no se sabe". */
  comprobar('el cero no se confunde con "no se sabe"', oGuion(0) === '0');
}

/* ─── 2. Los menús, persona por persona ──────────────────────────── */

console.log('\nQuién come qué\n');

const fuenteMenus = sacar('menusPersonaPorPersona');
comprobar('existe menusPersonaPorPersona()', !!fuenteMenus);

if (fuenteMenus && fuenteGuion) {
  const fn = new Function(fuenteGuion + '\n' + fuenteMenus +
                          '\nreturn menusPersonaPorPersona;')();

  const familia = [
    { nombre: 'Ana',   tipo: 'adulto', menu: 'Pollo' },
    { nombre: 'Luis',  tipo: 'adulto', menu: 'Res' },
    { nombre: 'Sofía', tipo: 'nino',   menu: 'Pasta' },
  ];
  const salida = fn(familia, '2 pollo, 1 res');

  comprobar('nombra a cada persona con su plato',
    salida.includes('Ana: Pollo') && salida.includes('Luis: Res'), salida);
  comprobar('cuenta los menús infantiles aparte',
    /Menú infantil: 1/.test(salida), salida);

  /* Quien no eligió plato se nombra igual: un nombre ausente de la lista
     es indistinguible de un nombre que nadie cargó, y a la hora de servir
     esa diferencia importa. */
  const conFaltante = fn([{ nombre: 'Ana', tipo: 'adulto', menu: '' }], '');
  comprobar('a quien no eligió también se lo nombra',
    conFaltante.includes('Ana') && conFaltante.includes('sin elegir'), conFaltante);

  comprobar('sin personas cargadas cae al resumen de siempre',
    fn([], '2 pollo, 1 res') === '2 pollo, 1 res');
  comprobar('y sin nada, un guion',
    fn([], '') === '—');
}

/* ─── 3. El estado de verdad, no el supuesto ─────────────────────── */

console.log('\nLo que dice la columna de estado\n');

comprobar('la columna ya no se llama «Asiste»',
  !/'Asiste'/.test(codigo),
  'decía "Sí" para todos, incluso sin haber mandado la invitación');
comprobar('ahora se llama «Estado»', /'Estado'/.test(codigo));
comprobar('y lo lee con la misma función que la pantalla',
  /comoEstaLaAsistencia\(f\)/.test(codigo),
  'si no, el archivo y el panel pueden decir cosas distintas');
comprobar('nadie mira `asiste` a secas para decidirlo',
  !/Number\(f\.asiste\) === 1 \? 'Sí'/.test(codigo));

/* ─── 4. La fecha es la de la respuesta ──────────────────────────── */

console.log('\nCuándo confirmó cada uno\n');

comprobar('la columna se llama «Confirmó el»', /'Confirmó el'/.test(codigo));
comprobar('sale de respondida_en',
  /invitacion_respondida_en/.test(codigo));
comprobar('y ya no de la fecha de alta',
  !/f\.fecha_hora/.test(codigo),
  'fecha_hora es cuándo se cargó la invitación, no cuándo contestaron');

/* ─── 5. El resumen y la identidad del documento ─────────────────── */

console.log('\nEl documento se presenta\n');

/* ⚠️ SE MIRA SOLO exportarInvitados(). La primera versión buscaba
   "titulo: 'Resumen'" en todo el archivo — y la descarga del presupuesto
   tiene su propio bloque «Resumen». Borrar el de invitados no hacía
   fallar nada porque el del presupuesto seguía ahí. */
const soloInvitados = codigo.slice(codigo.indexOf('async function exportarInvitados'));

comprobar('hay un bloque de resumen',
  /titulo: 'Resumen'/.test(soloInvitados));
comprobar('cuenta los grupos confirmados',
  /'Grupos confirmados'/.test(soloInvitados));
comprobar('y las personas, separando adultos de niños',
  /'· Adultos'/.test(soloInvitados) && /'· Niños'/.test(soloInvitados));
comprobar('el resumen va PRIMERO, antes de la lista',
  soloInvitados.indexOf("titulo: 'Resumen'") !== -1 &&
  soloInvitados.indexOf("titulo: 'Resumen'") < soloInvitados.indexOf("titulo: 'Confirmaciones'"),
  'es lo primero que hay que leer');
comprobar('y sale en los cuatro formatos, no solo en PDF',
  /titulo: 'Resumen'/.test(soloInvitados) &&
  !/formato === 'pdf'[\s\S]{0,80}Resumen/.test(soloInvitados),
  'por eso es un bloque más y no un adorno del PDF');

comprobar('el PDF acepta subtítulo y aviso',
  /function armarPdf\(titulo, bloques, extra\)/.test(codigo));
comprobar('los pinta si vienen',
  /extra && extra\.subtitulo/.test(codigo) && /extra && extra\.aviso/.test(codigo));
comprobar('la descarga de invitados los manda',
  /subtitulo:/.test(codigo) && /uso interno/.test(codigo));
comprobar('exportar() los pasa hasta el PDF',
  /function exportar\(formato, nombreBase, titulo, bloques, extra\)/.test(codigo) &&
  /armarPdf\(titulo, bloques, extra\)/.test(codigo),
  'sin esto el subtítulo se arma y nunca llega');

/* ─── 5b. La ventana del PDF, antes de esperar ───────────────────── */

/* ⚠️ ESTO SE ROMPE SOLO AL INTENTAR BAJAR UN PDF, Y NO ANTES.
   `window.open()` solo funciona si nace de un toque del usuario. Desde
   que la descarga pide los menús al servidor, el `open()` que estaba
   dentro de armarPdf() ocurre DESPUÉS del await — fuera del toque— y el
   navegador lo bloquea: la descarga en PDF no sale nunca. La ventana se
   abre antes de esperar, mientras el toque todavía cuenta. */

console.log('\nLa ventana del PDF\n');

const cuerpoExport = codigo.slice(codigo.indexOf('async function exportarInvitados'));
const iAbrirVentana = cuerpoExport.indexOf("window.open('', '_blank')");
const iEsperar      = cuerpoExport.indexOf('await traer(');

comprobar('la descarga abre la ventana ella misma', iAbrirVentana !== -1,
  'si la abre armarPdf() después del await, el navegador la bloquea');
comprobar('y la abre ANTES de pedirle nada al servidor',
  iAbrirVentana !== -1 && iEsperar !== -1 && iAbrirVentana < iEsperar,
  'después del await ya no cuenta como toque del usuario');
comprobar('solo para PDF, que es el único formato que la necesita',
  /formato === 'pdf' \? window\.open/.test(cuerpoExport));
comprobar('armarPdf() acepta la ventana ya abierta',
  /\(extra && extra\.ventana\) \|\| window\.open/.test(codigo));
comprobar('y si igual la bloquean, se avisa',
  /bloqueó la ventana/.test(codigo));

/* ─── 6. Los menús viajan solo si se piden ───────────────────────── */

console.log('\nEl servidor manda lo justo\n');

const apiLimpia = sinComentarios(api);
comprobar('listar_todos pide los menús solo con con_menus=1',
  /\$conMenus = \(\$_GET\['con_menus'\] \?\? ''\) === '1'/.test(apiLimpia));
comprobar('sin el parámetro devuelve lo de siempre',
  /\$conMenus \? ', menu, alergias' : ''/.test(apiLimpia),
  'la mudanza llama sin parámetro y no tiene por qué recibir de más');
comprobar('la descarga sí lo pide',
  /listar_todos&con_menus=1/.test(codigo));
comprobar('y si falla, el archivo sale igual',
  /catch \(error\)[\s\S]{0,200}resumen/.test(codigo),
  'mejor un archivo con menos detalle que ningún archivo');

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ La descarga dice la verdad y se entiende impresa.\n');
