/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-AVISOS-Y-NUMEROS.MJS · QUE LO QUE SE ANUNCIA EXISTA, Y QUE DOS
   PANTALLAS NO DIGAN NÚMEROS DISTINTOS DE LO MISMO

   POR QUÉ EXISTE
   Carlos mandó capturas del panel: la campana en «9+», la bandeja
   diciendo «15 sugerencias por revisar», y al tocarlas un chat vacío.
   Sus palabras: «de hecho, no entrega ninguno». Era literal — ninguna
   pantalla del panel mostraba una sola sugerencia.

   LAS CUATRO FORMAS EN QUE ESTO SE ROMPE SIN AVISAR

     · SE ANUNCIA LO QUE NO SE PUEDE MIRAR. La campana contaba el total y
       la única función que las pintaba (cajaDeSugerencias) no la llamaba
       nadie. Un `slice` silencioso en el medio hace lo mismo con otra
       cara: la burbuja dice 15 y la lista muestra 5.

     · LA MARCA DE VISTO ES UN NÚMERO. Tres resueltas y tres nuevas dan
       el mismo total: la campana no se enciende y hay tres cosas nuevas
       que nadie ve.

     · `asiste = 1` SE CONFUNDE CON «CONFIRMÓ». Una confirmación nace con
       `asiste = 1` porque el cupo se aparta desde el día uno. Con esa
       confusión, el renglón «Número final para el banquete» pedía 113
       platos habiendo contestado 34.

     · UN AVISO DE PUERTA SIN PUERTA. `pases_reintentados` no tenía
       filtro de fecha: una prueba del escáner encendía el cartel rojo
       todos los días, 38 antes de la fiesta.

   Ninguna de las cuatro tira un error.

   ⚡ ESTA PRUEBA EJECUTA, NO LEE.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const campana  = readFileSync(raiz('admin', 'codigo', '37-campana.js'), 'utf8');
const agentes  = readFileSync(raiz('admin', 'codigo', '40-agentes.js'), 'utf8');
const vistaHoy = readFileSync(raiz('admin', 'codigo', '30-vista-hoy.js'), 'utf8');
const hoyPhp   = readFileSync(raiz('admin', 'api', 'hoy.php'), 'utf8');
const chatPhp  = readFileSync(raiz('admin', 'api', 'chat.php'), 'utf8');
const gentePhp = readFileSync(raiz('admin', 'api', '_lib', 'gente.php'), 'utf8');
const llegadas = readFileSync(raiz('admin', 'api', 'llegadas.php'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que +
              (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const sacar = (fuente, nombre) => {
  const limpio = sinComentarios(fuente);
  const desde = limpio.indexOf('function ' + nombre);
  return desde === -1 ? null : limpio.slice(desde, limpio.indexOf('\n}', desde) + 2);
};


/* ─── 1. LO QUE LA CAMPANA CUENTA, LA BANDEJA LO MUESTRA ─────────────── */

console.log('\nQue lo anunciado se pueda mirar\n');

const fCaja = sacar(agentes, 'cajaDeSugerencias');
comprobar('existe cajaDeSugerencias()', !!fCaja);

if (fCaja) {
  const pintar = lista => new Function(
    'const seguro = v => String(v ?? "");' +
    'function contenidoDeTarjetaDeSugerencia(s, i) { return "[" + s.titulo + "]"; }' +
    fCaja + '\nreturn cajaDeSugerencias(' + JSON.stringify(lista) + ');'
  )();

  const quince = Array.from({ length: 15 },
    (_, i) => ({ id: 'dinero-pago-' + i, titulo: 'Pago ' + i }));

  const tarjetas = (pintar(quince).match(/data-sugerencia-tarjeta=/g) || []).length;

  comprobar('quince sugerencias pintan quince tarjetas',
    tarjetas === 15,
    'pintó ' + tarjetas + ' — un slice silencioso es lo que hizo que esto ' +
    'pasara desapercibido');

  comprobar('sin sugerencias no pinta una lista vacía',
    !/data-sugerencia-tarjeta/.test(pintar([])));
}

comprobar('la bandeja pinta las tarjetas, no un renglón que promete',
  /cajaDeSugerencias\(SUGERENCIAS_DE_AGENTES\)/.test(campana),
  'el renglón viejo llevaba a abrirAsistente(), que abre un chat vacío');

comprobar('y las engancha, para poder confirmar y deshacer',
  /engancharSugerencias\(buscar\('#lista-sugerencias', donde\)/.test(campana));

comprobar('ya no queda el botón que llevaba a ninguna parte',
  !/aviso-ir-a-sugerencias/.test(campana));

comprobar('la campana guarda las sugerencias, no solo cuántas',
  /let SUGERENCIAS_DE_AGENTES = \[\]/.test(campana));

/* ⚠️ Sin señal, lo último que se supo sigue siendo verdad. Ponerlo en 0
   apagaba la campana y escondía cosas ciertas. */
const fRefrescar = sacar(campana, 'refrescarSugerenciasDeAgentesParaLaCampana') || '';
comprobar('sin señal no se borra lo que ya se sabía',
  !/CANTIDAD_SUGERENCIAS_DE_AGENTES = 0;/.test(fRefrescar),
  'la campana mentía para abajo, que es la peor dirección');


/* ─── 2. LA MARCA DE VISTO, POR id ───────────────────────────────────── */

console.log('\nQue tres resueltas y tres nuevas enciendan la campana\n');

const fNuevos = sacar(campana, 'cuantosAvisosSonNuevos');
comprobar('existe cuantosAvisosSonNuevos()', !!fNuevos);

if (fNuevos) {
  const correr = (ahora, vistos) => new Function(
    "const AVISOS_VISTOS = 'avisos-vistos';" +
    'const recordadoDeLaCuenta = () => ' + JSON.stringify(vistos) + ';' +
    fNuevos + '\nreturn cuantosAvisosSonNuevos(' + JSON.stringify(ahora) + ');'
  )();

  const quince = Array.from({ length: 15 }, (_, i) => 'sugerencia:pago-' + i);

  comprobar('la primera vez, quince son quince nuevos',
    correr(quince, []) === 15);

  comprobar('dados por vistos, la campana queda en 0',
    correr(quince, quince) === 0);

  /* ⛔ EL CASO QUE ANTES FALLABA. Se resuelven tres y llegan tres: el
     total sigue en quince, y con una marca de números la campana se
     quedaba apagada. */
  const tresMenosTresMas = quince.slice(3)
    .concat(['sugerencia:mesa-a', 'sugerencia:mesa-b', 'sugerencia:mesa-c']);

  comprobar('se resuelven 3 y llegan 3 → la campana dice 3',
    correr(tresMenosTresMas, quince) === 3,
    'con una marca de TOTALES esto daba 0 y las tres nuevas no se anunciaban');

  comprobar('si solo se resuelven, no se enciende',
    correr(quince.slice(5), quince) === 0);

  comprobar('una marca vieja de otro formato no rompe nada',
    correr(quince, 9) === 15,
    'antes se guardaba un número; al actualizar, la marca vieja sigue ahí');
}

const fAvisos = sacar(campana, 'avisosDeAhora') || '';
comprobar('cada aviso lleva un id estable',
  /'sugerencia:' \+ \(s\.id/.test(fAvisos) &&
  /'pendiente:'/.test(fAvisos) &&
  /'rechazo:'/.test(fAvisos));

comprobar('y no se repiten',
  /new Set\(ids\)/.test(fAvisos));

comprobar('abrir la bandeja da por vistos los de ahora',
  /darAvisosPorVistos\(await avisosDeAhora\(\)\)/.test(campana));


/* ─── 3. EL AVISO DEL ESCÁNER ────────────────────────────────────────── */

console.log('\nEl pase leído dos veces\n');

const fAlertas = sacar(vistaHoy, 'alertasDelDia');
comprobar('existe alertasDelDia()', !!fAlertas);

if (fAlertas) {
  const correr = (dias, releidos, vistos) => new Function(
    'const recordadoDeLaCuenta = () => ' + vistos + ';' +
    "const ALERTA_RELEIDOS_VISTA = 'x';" +
    'const pluralizar = (n, a, b) => n + " " + (n === 1 ? a : b);' +
    'const verPasesReleidos = () => {};' +
    'const verPlanoDeMesas = () => {};' +
    'const irA = () => {};' +
    fAlertas +
    '\nreturn alertasDelDia(' + JSON.stringify({
      dia: { pases_reintentados: releidos, mesas_total: 0, mesas_ocupadas: 0 },
      dias_para_la_fiesta: dias,
      pendientes: [],
    }) + ').map(a => a.texto);'
  )();

  const hayReleidos = lista => lista.some(t => /leídos otra vez/.test(t));

  /* ⛔ EL BUG: una prueba del escáner deja la fila puesta para siempre y
     el cartel salía todos los días, 38 antes de la fiesta. */
  comprobar('faltando 38 días NO avisa de pases releídos',
    !hayReleidos(correr(38, 1, 0)),
    'antes de que haya puerta, «se leyó dos veces» significa «lo estabas probando»');

  comprobar('el día de la fiesta SÍ avisa',
    hayReleidos(correr(0, 1, 0)));

  /* ⚠️ La fiesta sigue después de medianoche: a las 02:00 del 25, con la
     gente adentro, esto tiene que seguir funcionando. */
  comprobar('y a la madrugada siguiente también',
    hayReleidos(correr(-1, 1, 0)));

  comprobar('faltando un día, todavía no',
    !hayReleidos(correr(1, 1, 0)));

  comprobar('si ya se dio por visto, no vuelve',
    !hayReleidos(correr(0, 1, 1)));
}

comprobar('el servidor manda el código del pase',
  /c\.codigo/.test(llegadas) && /'codigo'\s*=>\s*\$f\['codigo'\]/.test(llegadas),
  'sin eso la hoja no puede decir CUÁL pase se leyó dos veces');

comprobar('y la hoja lo muestra, tocable para copiar',
  /codigo-pase.*seguro\(u\.codigo\)/.test(vistaHoy),
  'en la puerta, el código es lo que se compara contra el papel');


/* ─── 4. UN SOLO NÚMERO DE GENTE ─────────────────────────────────────── */

console.log('\nQue dos pantallas no digan cosas distintas\n');

comprobar('existe _lib/gente.php',
  /function cuentaDeConfirmados/.test(gentePhp));

comprobar('el criterio canónico existe',
  /respondida_en IS NOT NULL OR i\.estado IN/.test(gentePhp));

/* ⚠️ Y QUE LA CONSULTA LO USE, no solo que la constante exista.
   Una mordida que quitaba el `AND $contesto` de la consulta pasaba esta
   sección entera: el texto del criterio seguía ahí, en la función que lo
   arma, mientras la cuenta volvía a ser `asiste = 1` a secas. Es
   exactamente el error que este archivo vino a cerrar, escondido en la
   prueba que debía cazarlo. */
comprobar('y la consulta de confirmados lo aplica',
  /WHERE c\.asiste = 1 AND \$contesto/.test(gentePhp),
  'sin el AND, la cuenta vuelve a ser «tiene lugar apartado»');

comprobar('y protege contra el JOIN duplicado',
  /SELECT DISTINCT c\.id/.test(gentePhp),
  'invitaciones.confirmacion_id no es UNIQUE: el JOIN infla el SUM');

comprobar('hoy.php usa la función compartida',
  /require_once __DIR__ \. '\/_lib\/gente\.php';/.test(hoyPhp) &&
  /cuentaDeConfirmados\(\)/.test(hoyPhp));

comprobar('chat.php también',
  /require_once __DIR__ \. '\/_lib\/gente\.php';/.test(chatPhp) &&
  /cuentaDeConfirmados\(\)/.test(chatPhp));

comprobar('y ya no quedan dos copias del criterio en hoy.php',
  (hoyPhp.match(/respondida_en IS NOT NULL OR i\.estado/g) || []).length === 0,
  'la cuenta vive en _lib/gente.php');

/* ⛔ EL QUE COSTABA PLATA. */
comprobar('el renglón del banquete dice confirmadas Y apartadas',
  /confirmadas · ' \. \$apartados \. ' apartadas/.test(hoyPhp),
  'decía «113 personas» con el rótulo «Número final para el banquete» ' +
  'habiendo contestado 34: 79 platos de diferencia');

comprobar('y no se da por listo mientras falte gente por responder',
  /\$faltanPorResponder === 0 && \$confirmados > 0/.test(hoyPhp));

comprobar('MegaBot ahora recibe cuántos confirmaron',
  /'personas_confirmadas'\s*=>/.test(chatPhp),
  'sin ese dato solo podía contestar el cupo apartado');

comprobar('y se le explica cuál es cuál',
  /nunca personas_con_lugar/.test(chatPhp));


/* ─── 5. QUE UN FALLO DE MEGABOT SE VEA ──────────────────────────────── */

console.log('\nCuando MegaBot no contesta\n');

comprobar('el fallo del webhook deja el motivo escrito',
  /function anotarPorQueFalloMegabot/.test(chatPhp));

comprobar('distingue clave rechazada de dirección equivocada',
  /La clave de MegaBot no fue aceptada/.test(chatPhp) &&
  /La dirección del webhook no existe/.test(chatPhp));

comprobar('y mira el cuerpo de la respuesta en vez de tirarlo',
  /anotarPorQueFalloMegabot\(\$codigo, mb_substr\(\(string\) \$resultado/.test(chatPhp));

/* ⚠️ SON DOS CAMINOS DE FALLO, NO UNO, y el mudo era el primero.
   `$resultado === false` es el caso sin respuesta —DNS, TLS, timeout—
   y es el que se lleva un 401 mal diagnosticado. Comprobar solo el
   camino del código HTTP dejaba ese pasar. */
comprobar('también cuando no hubo ninguna respuesta',
  /\$resultado === false\)\s*\{[\s\S]{0,220}?anotarPorQueFalloMegabot\(0,/.test(chatPhp),
  'sin red, DNS o timeout de 3 s: el caso que más se parece a «no anda y no sé por qué»');

/* ⚠️ `cuando` como marca UNIX: megabotEstaDisponible() hace
   `time() - (int) $salud['cuando']`. Con una fecha ISO, (int) da 2026 y
   el freno de 90 s queda desactivado. */
comprobar("el reposo de 90 s sigue funcionando",
  /'cuando'\s*=>\s*time\(\),/.test(chatPhp) &&
  !/'cuando'\s*=>\s*date\('c'\)/.test(chatPhp),
  'con una fecha ISO el freno se desactiva y se castiga a un servicio caído');


/* ─── RESULTADO ──────────────────────────────────────────────────────── */

console.log('');
if (fallos === 0) {
  console.log('✓ Lo que se anuncia se puede mirar, y las dos pantallas dicen lo mismo.');
} else {
  console.log(`✗ ${fallos} fallo(s).`);
}

process.exit(fallos === 0 ? 0 : 1);
