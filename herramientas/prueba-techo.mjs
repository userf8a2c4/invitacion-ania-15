/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-TECHO.MJS · que la puerta no se quede sin cupo

   QUÉ COMPRUEBA
   El techo de peticiones a la API (300 cada 5 minutos) se contaba POR
   IP. En el salón todos los teléfonos salen por el mismo WiFi, así que
   para el servidor son UNA sola IP y los 300 se repartían entre todos.
   Con la cola en la puerta, el escáner podía empezar a contestar 429.

   Esta prueba hace dos cosas distintas:

     1. SIMULA la puerta con las dos reglas de conteo, para mostrar en
        números cuándo revienta cada una. Es una simulación declarada,
        no una medición: los supuestos están escritos y se pueden
        discutir uno por uno.

     2. COMPRUEBA sobre el PHP de verdad las invariantes que, si alguien
        las rompe sin darse cuenta, devuelven bugs que ya pasaron —
        sobre todo el de la marca `__api__`, que dejó a gente sin poder
        entrar quince minutos con la contraseña correcta.

   POR QUÉ ESTRUCTURAL Y NO EJECUTANDO EL PHP
   No hay PHP local en esta máquina: `php -l` no se puede correr nunca.
   Lo que sí se puede es leer el archivo y exigir que diga lo que tiene
   que decir.

   CÓMO SE CORRE
       node herramientas/prueba-techo.mjs
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

const sesion   = leer('admin', 'api', '_lib', 'sesion.php');
const instalar = leer('admin', 'api', 'instalar.php');
const sql      = leer('admin', 'migracion.sql');

/* ─── 1. La puerta, en números ─────────────────────────────────────────
 *
 * SUPUESTOS (todos discutibles, ninguno escondido):
 *
 *   · El arranque del panel son ~18 peticiones. Cada pantalla pide lo
 *     suyo al abrirse; es el orden de magnitud, no un número medido.
 *   · El chat en long-poll son 12 peticiones cada 5 min por teléfono
 *     (SEGUNDOS_DE_ESPERA_DE_LISTAR = 25 en chat.php → 300/25 = 12).
 *   · Cada escaneo cuesta 2 peticiones: buscar el pase y anotar la
 *     llegada.
 *
 * Lo que la simulación NO hace es adivinar cuánta gente llega junta.
 * Devuelve cuántos escaneos entran antes del 429, que es el número que
 * de verdad importa en la puerta. */

const TECHO       = 300;
const ARRANQUE    = 18;
const LONG_POLL   = 12;
const REFRESCO    = 5;   // 26-sincronizacion.js: INTERVALO_REFRESCO_MS = 60000
const POR_ESCANEO = 2;

/** Cuántos escaneos puede hacer CADA teléfono antes del primer 429. */
function escaneosPorTelefono({ telefonos, arranques, porIp }) {
  const fijoDeUno = arranques * ARRANQUE + LONG_POLL + REFRESCO;

  /* Por IP los teléfonos comparten un solo balde de 300: el gasto fijo
     de todos se descuenta junto y lo que sobra se reparte entre ellos.
     Por sesión cada uno tiene su balde entero. */
  const libre = porIp ? TECHO - telefonos * fijoDeUno
                      : TECHO - fijoDeUno;
  const cabezas = porIp ? telefonos : 1;

  return Math.max(0, Math.floor(libre / cabezas / POR_ESCANEO));
}

console.log('\nEscaneos que puede hacer CADA teléfono en 5 minutos\n');
console.log('  (suponiendo ' + ARRANQUE + ' peticiones por arranque del panel, ' +
            LONG_POLL + ' del chat y ' + REFRESCO + ' del refresco)\n');

for (const arranques of [1, 2]) {
  console.log('  con ' + arranques + ' arranque(s) del panel en la ventana:');
  for (const telefonos of [1, 2, 3, 5, 8]) {
    const viejo = escaneosPorTelefono({ telefonos, arranques, porIp: true });
    const nuevo = escaneosPorTelefono({ telefonos, arranques, porIp: false });
    console.log('    ' + String(telefonos).padStart(2) + ' teléfono(s):  ' +
                'por IP ' + String(viejo).padStart(4) + '   ·   ' +
                'por sesión ' + String(nuevo).padStart(4));
  }
  console.log('');
}

/* LO QUE SE AFIRMA ACÁ NO DEPENDE DE LOS SUPUESTOS DE ARRIBA.
 *
 * Los números concretos sí: cuántas peticiones cuesta un arranque es
 * una estimación, y con otra estimación la tabla cambia. Pero la FORMA
 * no cambia con ninguna, y la forma es el defecto:
 *
 *   por IP     → sumar un teléfono le quita cupo a los que ya estaban
 *   por sesión → sumar un teléfono no le quita nada a nadie
 *
 * Eso es lo que se comprueba. Que en la fiesta el número caiga del lado
 * bueno o del malo depende de cuántos teléfonos haya y de cuántas veces
 * se reabra el panel, que es justo lo que nadie va a poder controlar
 * con la cola en la puerta. */

comprobar('por IP, cada teléfono nuevo le come cupo a los demás',
  escaneosPorTelefono({ telefonos: 5, arranques: 1, porIp: true }) <
  escaneosPorTelefono({ telefonos: 1, arranques: 1, porIp: true }),
  'este es el defecto entero, en una línea');

comprobar('por sesión, agregar teléfonos no le quita cupo a nadie',
  escaneosPorTelefono({ telefonos: 5, arranques: 2, porIp: false }) ===
  escaneosPorTelefono({ telefonos: 1, arranques: 2, porIp: false }));

/* El caso feo y perfectamente posible: cinco teléfonos y el panel
   reabriéndose dos veces en cinco minutos —bloquear y desbloquear la
   pantalla alcanza—. Por IP le quedan TRES escaneos a cada uno: no es
   cero, pero para una puerta con cola es lo mismo que cero. */
comprobar('5 teléfonos y 2 arranques: por IP quedan <10 escaneos por teléfono',
  escaneosPorTelefono({ telefonos: 5, arranques: 2, porIp: true }) < 10,
  'si esto sube, cambió algún supuesto: revisalo antes de festejar');

comprobar('con 8 teléfonos, por IP no queda NINGUNO',
  escaneosPorTelefono({ telefonos: 8, arranques: 2, porIp: true }) === 0);

comprobar('en ese mismo caso, por sesión cada teléfono pasa de 100',
  escaneosPorTelefono({ telefonos: 5, arranques: 2, porIp: false }) > 100,
  'nadie escanea 100 pases en cinco minutos ni queriendo');

/* ─── 2. Que el conteo separe por dispositivo ──────────────────────── */

console.log('\nEl conteo, en sesion.php\n');

comprobar('excedioLimiteDeApi recibe la sesión',
  /function excedioLimiteDeApi\(\$sesionId/.test(sesion),
  'sin el parámetro vuelve a contar por IP y la puerta se queda sin cupo');

comprobar('anotarPeticionDeApi recibe la sesión',
  /function anotarPeticionDeApi\(\$sesionId/.test(sesion));

comprobar('la consulta filtra por sesion_id',
  /AND sesion_id = :s/.test(sesion));

comprobar('exigirSesion averigua QUIÉN es antes de contar',
  /\$usuario\s*=\s*usuarioActual\(\);[\s\S]{0,200}excedioLimiteDeApi/.test(sesion),
  'contar primero es contar sin saber la sesión, o sea contar por IP');

comprobar('sigue anotando la petición ANTES de rechazar por 401',
  /anotarPeticionDeApi\([\s\S]{0,200}401/.test(sesion),
  'si no, un token inválido en bucle no gasta cupo y no lo frena nada');

/* La IP sigue en el WHERE: es la que tiene índice. Sin ella, el conteo
   pasa a recorrer la tabla entera en cada petición del panel. */
comprobar('la IP sigue en el WHERE (es la columna con índice)',
  /WHERE ip = :ip AND correo = :marca/.test(sesion),
  'sacarla convierte cada petición en un recorrido de toda la tabla');

comprobar('la ventana sigue cerrada por los dos lados',
  /cuando <= NOW\(\)[\s\S]{0,120}cuando > DATE_SUB/.test(sesion),
  'sin el techo, una fila con fecha futura clava el contador — ya pasó');

/* Solo el SQL: la explicación de por qué existe esa condición la nombra
   dentro de un comentario, y contarla ahí daría un falso positivo. */
const soloCodigo = sesion.split('\n')
  .filter((l) => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n');

comprobar('la condición del futuro no está escrita dos veces',
  (soloCodigo.match(/AND cuando <= NOW\(\)/g) || []).length ===
  (soloCodigo.match(/AND cuando > DATE_SUB/g) || []).length,
  'una copia de más no rompe nada, pero delata una edición a medias');

/* ─── 3. La trampa de la marca `__api__` ───────────────────────────────
 *
 * Los tres contadores de login EXCLUYEN las filas de API con
 * `correo <> '__api__'`. Si alguien decide meter el dispositivo dentro
 * de esa etiqueta —'__api__#12', por ejemplo— las tres exclusiones
 * dejan de calzar y las peticiones normales del panel vuelven a contar
 * como intentos de contraseña fallidos. Eso ya pasó: bastaban unos
 * segundos de uso para quedar bloqueado quince minutos con la
 * contraseña correcta. */

console.log('\nLa marca de API se sigue pudiendo excluir\n');

comprobar('la marca es exactamente «__api__», sin adornos',
  /const MARCA_DE_PETICION_API = '__api__';/.test(sesion),
  'si lleva el id de sesión adentro, los tres contadores de login se rompen');

comprobar('la marca se guarda tal cual, no compuesta',
  /'correo'\s*=>\s*MARCA_DE_PETICION_API\s*[,;\]]/.test(sesion),
  'concatenarle algo es el mismo bug por la puerta de atrás');

/* Tres: los dos contadores de login (estaFrenadoDelTodo,
   estaFrenadoPorFallos) y el borrado tras entrar bien
   (limpiarIntentos), que tampoco tiene que llevarse las filas de API. */
const exclusiones = (sesion.match(/correo <> :marca/g) || []).length;
comprobar('siguen las 3 exclusiones de la marca de API',
  exclusiones === 3, 'encontré ' + exclusiones);

/* ─── 4. Que una base sin instalar no se caiga ─────────────────────── */

console.log('\nUna base a la que no se le corrió instalar.php\n');

comprobar('la escritura pregunta antes de nombrar la columna',
  /if \(haySeparacionPorSesion\(\)\) \$fila\['sesion_id'\]/.test(sesion),
  'nombrar una columna que no está corta la petición con 500');

comprobar('la lectura pregunta lo mismo',
  /if \(haySeparacionPorSesion\(\)\) \{/.test(sesion));

comprobar('haySeparacionPorSesion recuerda la respuesta',
  /function haySeparacionPorSesion\(\)[\s\S]{0,200}static \$hay/.test(sesion),
  'esto corre en CADA petición; preguntarle a information_schema cada vez se paga');

/* Las dos rutas usan el MISMO recuerdo. Con soloColumnasQueExisten()
   para escribir y haySeparacionPorSesion() para leer serían dos
   consultas de esquema por petición, cada una con su propio static. */
comprobar('information_schema se consulta una sola vez por petición',
  (sesion.match(/columnasDe\('intentos_login'\)/g) || []).length === 1 &&
  !/soloColumnasQueExisten\('intentos_login'/.test(sesion),
  'dos caminos distintos = dos consultas de esquema en cada llamada del panel');

/* ─── 5. Que la columna exista de las dos maneras ──────────────────── */

console.log('\nLa columna, en los dos caminos de instalación\n');

comprobar('instalar.php la agrega a las bases que ya existían',
  /\$agregarColumna\('intentos_login', 'sesion_id'/.test(instalar),
  'sin esto, PBE y producción se quedan contando por IP para siempre');

comprobar('la agrega NOT NULL DEFAULT 0',
  /\$agregarColumna\('intentos_login', 'sesion_id', 'INT NOT NULL DEFAULT 0'\)/.test(instalar),
  '0 significa «sin sesión», que es un valor con sentido, no un dato ausente');

comprobar('migracion.sql la trae para las instalaciones nuevas',
  /sesion_id INT NOT NULL DEFAULT 0/.test(sql));

comprobar('la tabla conserva su índice por IP y fecha',
  /KEY por_ip_y_fecha \(ip, cuando\)/.test(sql));

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ La puerta tiene cupo propio en cada teléfono.\n');
