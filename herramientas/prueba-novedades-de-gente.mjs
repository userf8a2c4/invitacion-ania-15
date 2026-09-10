/* Comprueba el aviso de Gente: que diga QUÉ cambió, no solo cuántos.
 *
 * POR QUÉ EXISTE
 * La burbuja de la pestaña marcaba un número —"3"— y ahí terminaba. Para
 * saber quiénes eran esos tres había que abrir Gente y recorrer 48
 * renglones comparándolos con la memoria. En la práctica, que alguien
 * confirmara entraba sin que nadie se enterara.
 *
 * LAS TRES FORMAS EN QUE ESTO SE ROMPE SIN AVISAR
 *
 *   · EL ORDEN. Las novedades se calculan comparando contra la marca de
 *     "lo último que vi". Si la marca se guarda ANTES de calcular, todo
 *     queda "ya visto" y la lista da vacía siempre. La función corre, no
 *     hay error, y el cartel no aparece nunca.
 *
 *   · EL RELOJ. La tentación es guardar "cuándo entré" con la hora del
 *     teléfono y compararla contra `respondida_en`, que la escribe el
 *     servidor. Son dos relojes en husos distintos —el hosting está en
 *     otro país—, así que un desfase de horas haría aparecer novedades
 *     viejas o esconder las nuevas. Se compara contra un valor del
 *     SERVIDOR: la respuesta más reciente ya vista.
 *
 *   · LA MARCA VACÍA. `null` significa "primera vez, no avises de nada".
 *     Si con la lista sin respuestas se guardara "" en vez de no guardar,
 *     `null` se perdería y la primera confirmación de verdad no se
 *     anunciaría jamás.
 *
 * Ninguna de las tres tira un error. Las tres se ven igual desde afuera:
 * el cartel simplemente no sale.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const vista = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');
const css   = readFileSync(raiz('admin', 'estilos', '02-componentes.css'), 'utf8');
const html  = readFileSync(raiz('admin', 'index.html'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const codigo = sinComentarios(vista);

const sacar = nombre => {
  const desde = codigo.indexOf('function ' + nombre);
  return desde === -1 ? null : codigo.slice(desde, codigo.indexOf('\n}', desde) + 2);
};

/* ─── 1. Quiénes son las novedades, corriéndolo ──────────────────── */

console.log('\nQuién respondió desde la última vez\n');

const fuenteNovedades = sacar('novedadesDesdeLaUltimaVisita');
comprobar('existe novedadesDesdeLaUltimaVisita()', !!fuenteNovedades);

if (fuenteNovedades) {
  /* Se le arma un mundo alrededor: la lista de la pantalla y la memoria.
     Se EJECUTA porque lo que importa es a quién devuelve. */
  const correr = (invitados, marca) => new Function(
    'const INVITADOS = ' + JSON.stringify(invitados) + ';' +
    'const recordado = (clave, porDefecto) => ' + JSON.stringify(marca) +
      ' === null ? porDefecto : ' + JSON.stringify(marca) + ';' +
    fuenteNovedades + '\nreturn novedadesDesdeLaUltimaVisita();'
  )();

  const gente = [
    { id: 1, nombre: 'Alan',  invitacion_respondida_en: '2026-09-08 10:00:00' },
    { id: 2, nombre: 'Ximena', invitacion_respondida_en: '2026-09-09 18:30:00' },
    { id: 3, nombre: 'Chris',  invitacion_respondida_en: '2026-09-09 21:15:00' },
    { id: 4, nombre: 'Pam',    invitacion_respondida_en: null },
  ];

  const nuevas = correr(gente, '2026-09-09 12:00:00').map(f => f.nombre);
  comprobar('devuelve solo a quienes respondieron después de la marca',
    String(nuevas.sort()) === String(['Chris', 'Ximena']), String(nuevas));

  comprobar('la más reciente va primero',
    correr(gente, '2026-09-09 12:00:00')[0].nombre === 'Chris',
    'lo último que pasó es lo primero que hay que leer');

  comprobar('quien no respondió nunca no es una novedad',
    !correr(gente, '2020-01-01 00:00:00').some(f => f.nombre === 'Pam'));

  /* ⚠️ La primera visita no avisa de nada: decir "38 respuestas nuevas"
     la primera vez que se abre la app es cierto y a la vez inútil. */
  comprobar('la primera visita no anuncia nada',
    correr(gente, null).length === 0,
    'sin marca previa no hay con qué comparar');

  comprobar('sin novedades, la lista queda vacía',
    correr(gente, '2026-09-09 23:59:59').length === 0);
}

/* ─── 2. El orden: calcular antes de pisar la marca ──────────────── */

console.log('\nCalcular antes de guardar\n');

const iCalcula = codigo.indexOf('NOVEDADES_DE_GENTE = novedadesDesdeLaUltimaVisita()');
const iGuarda  = codigo.indexOf('recordarLaUltimaRespuestaVista()');

comprobar('se calcula y se guarda, en ese orden',
  iCalcula !== -1 && iGuarda !== -1 && iCalcula < iGuarda,
  'si se guarda primero, todo queda "ya visto" y el cartel no sale nunca');

/* ─── 3. El reloj del servidor, no el del teléfono ───────────────── */

console.log('\nContra qué reloj se compara\n');

const fuenteGuardar = sacar('recordarLaUltimaRespuestaVista');
comprobar('existe recordarLaUltimaRespuestaVista()', !!fuenteGuardar);

comprobar('la marca sale de respondida_en, no de la hora del teléfono',
  !!fuenteGuardar && /invitacion_respondida_en/.test(fuenteGuardar) &&
  !/new Date\(\)/.test(fuenteGuardar),
  'el teléfono y el hosting están en husos distintos');
comprobar('y la comparación tampoco usa el reloj local',
  !!fuenteNovedades && !/new Date\(\)/.test(fuenteNovedades));

if (fuenteGuardar) {
  /* Con la lista sin ninguna respuesta NO se escribe marca: `null` es lo
     que significa "primera vez", y pisarlo con "" haría que la primera
     confirmación de verdad no se anunciara nunca. */
  let guardado = 'no se llamó';
  const correrGuardar = invitados => {
    guardado = 'no se llamó';
    new Function(
      'const INVITADOS = ' + JSON.stringify(invitados) + ';' +
      'const recordar = (clave, valor) => { globalThis.__marca = valor; };' +
      'globalThis.__marca = "no se llamó";' +
      fuenteGuardar + '\nrecordarLaUltimaRespuestaVista();'
    )();
    return globalThis.__marca;
  };

  comprobar('guarda la respuesta MÁS RECIENTE de la lista',
    correrGuardar([
      { invitacion_respondida_en: '2026-09-08 10:00:00' },
      { invitacion_respondida_en: '2026-09-09 21:15:00' },
      { invitacion_respondida_en: '2026-09-09 18:30:00' },
    ]) === '2026-09-09 21:15:00');

  comprobar('sin ninguna respuesta, NO escribe marca',
    correrGuardar([{ invitacion_respondida_en: null }]) === 'no se llamó',
    'escribir "" borraría el null que significa "primera vez"');
}

/* ─── 4. El cartel dice qué hizo cada uno ────────────────────────── */

console.log('\nQué dice el cartel\n');

const fuenteCartel = sacar('carteldeNovedades');
comprobar('existe el cartel', !!fuenteCartel);
comprobar('nombra a cada persona', !!fuenteCartel && /f\.nombre/.test(fuenteCartel));
comprobar('y dice QUÉ hizo, no solo que hay novedades',
  !!fuenteCartel && /comoEstaLaAsistencia\(f\)/.test(fuenteCartel) &&
  /COMO_SE_LEE_EL_ESTADO/.test(fuenteCartel),
  'confirmar y darse de baja son noticias opuestas');
comprobar('sin novedades no se pinta nada',
  !!fuenteCartel && /if \(!NOVEDADES_DE_GENTE\.length\) return '';/.test(fuenteCartel),
  'un cartel vacío es peor que ningún cartel');
comprobar('se puede cerrar',
  /cerrar-novedades/.test(codigo));
comprobar('con un blanco que se pueda acertar en un teléfono',
  /\.que-cambio__cerrar\s*\{[^}]*width:\s*32px/.test(css),
  'una ✕ suelta es imposible de tocar');

/* ─── 5. Y quedan marcadas en la lista ───────────────────────────── */

console.log('\nEncontrarlas entre 48 renglones\n');

comprobar('cada fila sabe si es novedad',
  /NOVEDADES_DE_GENTE\.some\(n => n\.id === fila\.id\)/.test(codigo));
comprobar('y se marca con una clase propia',
  /lista__fila--nueva/.test(codigo) && /\.lista__fila--nueva/.test(css));
comprobar('la marca no le roba ancho al contenido',
  /\.lista__fila--nueva\s*\{[^}]*border-inline-start/.test(css),
  'un filete en el borde, no un chip que empuje el nombre');

/* La burbuja de la barra sigue existiendo: el cartel la complementa, no
   la reemplaza — una dice cuántas desde afuera, el otro cuáles adentro. */
comprobar('la burbuja de la pestaña sigue ahí',
  html.includes('id="burbuja-gente"'));

/* ─── Resultado ──────────────────────────────────────────────────── */

if (fallos) {
  console.error('\n✗ ' + fallos + (fallos === 1 ? ' comprobación falla.' : ' comprobaciones fallan.') + '\n');
  process.exit(1);
}
console.log('\n✓ El aviso de Gente dice quién contestó y qué contestó.\n');
