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


/* ─── LA COLUMNA DE NOTAS NO INVENTA COMAS ───────────────────────────
 *
 * ⚡ SALÍAN COMAS SUELTAS EN EL PDF (2026-09-15)
 *
 * El formulario público manda `', '` cuando la persona no escribió nada
 * (codigo/11-formulario-confirmacion.js:989: `notas: notas || ', '`), así
 * que en la base queda una coma y un espacio, no una celda vacía. El PDF
 * la imprimía tal cual y parecía un error de la app.
 *
 * El servidor ya lo sabía —loQueEscribio() en admin/api/mensajes.php—
 * pero la descarga no. Dos mundos que no comparten código y decían cosas
 * distintas del mismo dato. */

/* ─── QUE LA COCINA RECIBA LO QUE CADA UNO ELIGIÓ ────────────────────
 *
 * ⛔ UNA CONSULTA QUE RESPONDE «NADA» SE VEÍA IGUAL QUE TODO EN ORDEN
 *    (2026-09-15)
 *
 * Cada invitado elige SU plato y escribe SUS alergias en la invitación.
 * Si el papel que llega a la cocina dice «3 Estándar, 1 Infantil» y nada
 * más, esa elección no sirvió de nada y una alergia puede terminar en el
 * plato equivocado.
 *
 * El código para transmitirlo estaba entero —menusPersonaPorPersona,
 * alergiasPersonaPorPersona y la hoja «Persona por persona»—. Lo que
 * faltaba era el aviso cuando NO hay con qué armarlo: `falloElDetalle`
 * solo se enciende si la red falla, y el caso real fue otro — la
 * consulta respondió bien y trajo cero filas. El PDF se degradaba solo,
 * en silencio, a un resumen del grupo.
 *
 * Responder sin fallar no es funcionar. Es la lección del eclipse, ahora
 * del lado de los datos. */

console.log('\nCuando no hay detalle por persona\n');

const iAviso = codigo.indexOf('const sinDetalle = confirmados.filter(');
comprobar('el PDF detecta que no hay detalle por persona', iAviso !== -1,
  'sin esto, cero filas y todo-en-orden se ven igual');

if (iAviso !== -1) {
  const trozo = codigo.slice(iAviso, codigo.indexOf('\n  }\n', iAviso) + 5);

  const correr = (confirmados, porFamilia) => {
    const bloques = [{ titulo: 'Resumen' }];
    new Function('bloques', 'confirmados', 'porFamilia', 'falloElDetalle', 'oGuion',
      trozo)(bloques, confirmados, porFamilia, false,
             v => (String(v ?? '').trim() || '—'));
    return bloques;
  };
  const fam = n => ({ id: n, nombre: 'Familia ' + n, adultos: 2, ninos: 1 });

  /* El caso que de verdad pasó: se perdieron TODOS los acompañantes. */
  const todos = correr([fam(1), fam(2), fam(3)], {});
  comprobar('sin ningún detalle, el PDF lo grita',
    /COCINA NO VA A RECIBIR NADA/.test(todos[0].titulo),
    'salió: ' + todos[0].titulo);

  comprobar('y lo grita ARRIBA de todo, no al final',
    todos[0].titulo !== 'Resumen',
    'un aviso al pie de la última hoja no lo lee nadie');

  comprobar('dice que faltan datos, no que nadie eligió',
    /faltan las filas de acompañantes/.test(todos[0].filas[0][0]),
    'son dos cosas muy distintas y llevan a acciones opuestas');

  /* El caso normal y útil: decir a QUIÉNES hay que preguntarles. */
  const algunos = correr([fam(1), fam(2), fam(3)], { 1: [{ nombre: 'Ana' }] });
  comprobar('con detalle parcial, nombra a los grupos que faltan',
    /2 de 3 grupos confirmados/.test(algunos[0].titulo) &&
    algunos[0].filas.length === 2,
    'salió: ' + algunos[0].titulo);

  /* ⚠️ Y LO QUE NO PUEDE HACER: gritar cuando está todo bien. Un aviso
     que sale siempre deja de leerse. */
  comprobar('con todo el detalle, no molesta',
    correr([fam(1)], { 1: [{ nombre: 'Ana' }] }).length === 1);

  comprobar('y si nadie confirmó todavía, tampoco',
    correr([], {}).length === 1,
    'antes de que conteste nadie no hay nada que reclamar');
}


console.log('\nLa columna de Notas\n');

const fuenteNotas = sacar('loQueEscribio');
comprobar('existe loQueEscribio()', !!fuenteNotas);

if (fuenteNotas) {
  const loQueEscribio = new Function(fuenteNotas + '\nreturn loQueEscribio;')();

  const seFiltra = [
    ['el centinela del formulario', ', '],
    ['una coma sola', ','],
    ['comas y espacios sueltos', '  ,   , '],
    ['vacío', ''],
    ['null', null],
  ];
  for (const [queEs, entrada] of seFiltra) {
    comprobar(queEs + ' no llega al PDF', loQueEscribio(entrada) === '',
      'devolvió ' + JSON.stringify(loQueEscribio(entrada)));
  }

  /* ⚠️ LA MITAD QUE IMPORTA: no romper los mensajes de verdad. Una coma
     DENTRO de una frase es parte de la frase. */
  const pasaEntero = ['Vamos, con gusto', 'Felicidades Ania!', ',Hola'];
  for (const mensaje of pasaEntero) {
    comprobar('«' + mensaje + '» pasa entero',
      loQueEscribio(mensaje) === mensaje,
      'devolvió ' + JSON.stringify(loQueEscribio(mensaje)));
  }

  comprobar('y la columna Notas del PDF lo usa',
    /oGuion\(loQueEscribio\(f\.notas\)\)/.test(codigo),
    'la función puede existir y no estar enchufada — es la lección del eclipse');

  comprobar('la descarga de mudanza también',
    /loQueEscribio\(f\.notas\)/.test(codigo) &&
    !/f\.notas \|\| ''/.test(codigo),
    'eran dos lugares, no uno');
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

  /* ⚡ (2026-09-14) EL RESUMEN AHORA SALE MARCADO. Antes caía al texto
     del grupo tal cual, y eso hacía indistinguible una familia que
     eligió plato por plato de una de la que no sabemos nada: las dos
     salían iguales en el papel. Sigue estando el resumen —no se pierde
     ningún dato—, pero ahora se ve que es un resumen. */
  const soloResumen = fn([], '2 pollo, 1 res');
  comprobar('sin personas cargadas, el resumen sale pero MARCADO',
    soloResumen.includes('2 pollo, 1 res') && /sin desglose/i.test(soloResumen),
    soloResumen);
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
