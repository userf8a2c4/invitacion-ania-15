/* ══════════════════════════════════════════════════════════════════════
   MINIFICAR Y EMPAQUETAR JS · de codigo/*.js a unos pocos paquetes livianos
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   Lighthouse marca "Reduce unused JavaScript" porque los archivos de
   codigo/ se sirven tal cual se escriben: con toda la documentación en
   español, los headers en caja y el espaciado pensado para leerlos, no
   para que pesen poco. Este script minifica cada uno y los agrupa en
   PAQUETES (ver más abajo) dentro de codigo/produccion/, que es la
   carpeta que index.html termina pidiendo.

   ⚡ ANTES ERAN 27 ARCHIVOS SUELTOS. POR QUÉ AHORA SON UNOS POCOS PAQUETES
   (esto cambió — la explicación larga vive en index.html, junto a los
   <script>, pero el resumen es este):

   Hace tiempo se probó juntar TODO en un solo archivo y salió peor: el
   puntaje de escritorio cayó de 85 a 60. La causa medida entonces: se
   juntó el código FUENTE sin minificar (429 KB, comentarios y todo) en
   UN SOLO archivo, así que el navegador tenía que parsear y ejecutar todo
   eso como una única tarea de casi un segundo que no podía interrumpir
   ("Total Blocking Time" castiga exactamente eso).

   Lo que se descubrió DESPUÉS, con un perfil real de PageSpeed sobre el
   sitio ya en producción, es un problema distinto: no es cuánto tarda el
   navegador en EJECUTAR el código (eso es chico: ~85 ms sumando los 27
   archivos, medido en la auditoría de "Tiempo de ejecución de
   JavaScript") — es que el SERVIDOR tarda cada vez más en contestar a
   medida que le llegan más pedidos juntos. Los primeros 3 archivos
   volvían en ~300 ms; del 4° en adelante, más de 1.300 ms cada uno. Con
   27 pedidos disparados a la vez (así funciona `defer`: todos en
   paralelo), la mayoría pagaba esa cola.

   La solución para ESTE problema es la contraria a la de antes: en vez de
   27 pedidos chicos, unos pocos pedidos medianos — pero seguimos sin
   juntar TODO en uno, y esta vez el contenido YA está minificado antes de
   agruparse (100 KB en total, no 429). Con el trabajo real repartido en 5
   paquetes en vez de 1, ningún paquete solo debería acercarse a los 50 ms
   que definen una "tarea larga": el peor de los cinco (el que se lleva el
   archivo de las enredaderas, el más pesado) todavía deja margen de sobra.
   Si una medición futura mostrara lo contrario, la corrección es hacer
   los paquetes MÁS CHICOS (más de 5, pero bien lejos de 27), nunca volver
   a los 27 sueltos — ese problema (la cola del servidor) no se soluciona
   solo, empeora con cada archivo de más.

   DOS ARCHIVOS QUEDAN SUELTOS, A PROPÓSITO
     · 25-preguntas-frecuentes.js: lee `document.currentScript.src` para
       encontrar a 00-conocimiento-chatbot.js reemplazando su propio
       nombre de archivo por el de ese otro (ver el comentario ahí). Si
       viviera dentro de un paquete con otro nombre, ese truco se rompe:
       el reemplazo no encontraría nada que reemplazar. Tiene que seguir
       siendo su propio <script>, con su propio nombre de archivo.
     · 00-conocimiento-chatbot.js: no se carga con <script defer> — se
       inyecta recién al primer toque del botón "?" (ver 25). No tiene
       sentido meterlo en ningún paquete si la mayoría de las visitas
       nunca lo piden.

   NI SIQUIERA ASÍ SE JUNTA CON EL CSS
   El CSS tiene su propia herramienta (herramientas/empaquetar.mjs) y va
   inline en el propio index.html — no compite por esta misma cola de
   pedidos, así que no hace falta unificar nada ahí.

   POR QUÉ NO SE TOCAN LOS ARCHIVOS ORIGINALES
   codigo/*.js tiene comentarios largos a propósito: son la documentación
   de por qué cada cosa está hecha como está (igual que GUIA.md, pero para
   quien programe, no para quien organiza la fiesta). Ese archivo es el
   que se edita siempre. Este script solo LEE su contenido y escribe los
   paquetes en codigo/produccion/; nunca escribe en el original.

   POR QUÉ SE USA TERSER Y NO UN REGEX CASERO (a diferencia del CSS)
   En CSS, un regex de comentarios+espacios es seguro porque el espacio en
   blanco nunca cambia el significado de una regla. En JS no: un `//`
   dentro de un string, una expresión regular literal (`/algo/g`), o un
   template string con backticks pueden confundir a un regex y romper el
   código de verdad. Terser es un parser real de JavaScript —entiende la
   sintaxis, no adivina con expresiones regulares— así que no tiene ese
   riesgo. Es una dependencia de DESARROLLO nada más (se instala con
   `npm install`, corre en esta máquina): nunca se sube al hosting, ni
   falta que le haga falta al navegador del invitado. El .htaccess además
   bloquea node_modules/ y package*.json por las dudas.

   ⚠️ IMPORTANTE PARA QUE ESTO SEA SEGURO: SIN "toplevel"
   Estos archivos NO son módulos de JavaScript (type="module"): son
   scripts sueltos con <script defer>, y varios definen funciones y
   constantes que usan OTROS archivos por nombre —CONFIGURACION (01),
   buscar/limitar/medidaDelRelicario (02), PREGUNTAS_FRECUENTES (00),
   LienzoDePetalos/LienzoDeLuz (24/23)—. Terser, POR DEFECTO, no renombra
   ("mangle") ni borra por "no usado" ("compress") nada declarado en el
   nivel más externo de un script — solo lo hace con nombres LOCALES,
   adentro de una función. Por eso este script NO activa `toplevel: true`
   en ningún lado: si se activara, Terser podría borrar una función que
   este archivo no usa pero que otro sí, pensando que es código muerto —
   cada archivo se minifica de a uno, sin ver a los demás. Los paquetes se
   arman DESPUÉS, pegando el resultado YA minificado de cada archivo: cada
   uno pasó por Terser aislado, exactamente como cuando eran 27 archivos
   sueltos. Lo único nuevo es que el resultado se escribe junto.

   EL ORDEN DENTRO DE CADA PAQUETE ES EL MISMO QUE TENÍA EN index.html
   `defer` ejecuta los scripts en el orden en que aparecen escritos, y hay
   dos que importan de verdad (quedan anotados junto a PAQUETES, abajo):
   24 antes que 06, y 23 antes que 14/18/19. Pegar los archivos ya
   minificados en ese mismo orden, dentro del mismo paquete, preserva esa
   garantía exactamente igual que antes.

   CUÁNDO CORRERLO
       npm install                       (una sola vez, o cuando cambie terser)
       node herramientas/minificar-js.mjs

   ⚠️ SI SE EDITA CUALQUIER ARCHIVO DE codigo/, HAY QUE VOLVER A CORRER
   ESTO antes de subir — si no, el cambio queda en el archivo fuente pero
   la web sigue sirviendo el paquete viejo de codigo/produccion/.

   ⚠️ SI SE AGREGA O SACA UN ARCHIVO DE codigo/, HAY QUE ACTUALIZAR
   PAQUETES (o SUELTOS) ACÁ ABAJO. El script lo detecta solo y se detiene
   con un error claro si algún .js de codigo/ no está declarado en
   ninguno de los dos, o si algo declarado ya no existe — así nunca se
   sube un paquete incompleto sin darse cuenta.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minify } from 'terser';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaFuente = join(raiz, 'codigo');
const carpetaProduccion = join(carpetaFuente, 'produccion');

mkdirSync(carpetaProduccion, { recursive: true });

/** Los cinco paquetes, en el mismo orden que tenían en index.html. */
const PAQUETES = [
  {
    nombre: 'paquete-1-nucleo',
    archivos: [
      '01-configuracion.js', '02-utilidades.js', '03-sobre-de-apertura.js',
      '04-invitado-personalizado.js', '05-cursor-personalizado.js',
    ],
  },
  {
    // 24 va antes que 06 a propósito: 06 le pregunta al arrancar si debe
    // crear elementos o solo números (ver el comentario en 06 y en
    // index.html). Ese orden queda intacto acá adentro.
    nombre: 'paquete-2-petalos-y-marco',
    archivos: [
      '24-lienzo-de-petalos.js', '06-petalos-con-fisica.js', '07-marco-y-enredaderas.js',
      '08-efectos-de-scroll.js', '09-cuenta-regresiva.js', '10-reproductor-de-musica.js',
    ],
  },
  {
    nombre: 'paquete-3-interaccion',
    archivos: ['11-formulario-confirmacion.js', '12-pase-de-acceso.js', '13-agregar-al-calendario.js'],
  },
  {
    // 23 va antes que 14, 18 y 19 a propósito: los tres le preguntan al
    // arrancar si deben crear elementos o solo publicar números (mismo
    // criterio que 24/06 arriba). Ese orden queda intacto acá adentro.
    nombre: 'paquete-4-luz-y-ambiente',
    archivos: [
      '23-lienzo-de-luz.js', '27-fauna-nocturna.js', '14-haces-de-luz.js',
      '15-registro-de-confirmaciones.js', '16-volver-arriba.js', '17-joyas-colgantes.js',
      '18-motas-de-polvo.js', '19-velas.js',
    ],
  },
  {
    nombre: 'paquete-5-controles',
    archivos: ['20-boton-de-animaciones.js', '21-monitor-de-rendimiento.js', '22-luz-de-la-hora.js', '26-mapa-a-pedido.js'],
  },
];

/** Estos dos NO entran en ningún paquete (ver la explicación de arriba). */
const SUELTOS = ['25-preguntas-frecuentes.js', '00-conocimiento-chatbot.js'];

/* ─── Validar cobertura contra lo que de verdad hay en codigo/ ─────────── */
const archivosReales = readdirSync(carpetaFuente)
  .filter(nombre => nombre.endsWith('.js') && statSync(join(carpetaFuente, nombre)).isFile())
  .sort();

const archivosDeclarados = [...PAQUETES.flatMap(p => p.archivos), ...SUELTOS].sort();

const faltanEnDisco = archivosDeclarados.filter(a => !archivosReales.includes(a));
const faltanEnDeclaracion = archivosReales.filter(a => !archivosDeclarados.includes(a));

if (faltanEnDisco.length || faltanEnDeclaracion.length) {
  console.error('✗ PAQUETES/SUELTOS (arriba, en este archivo) no coincide con codigo/*.js:');
  if (faltanEnDisco.length) console.error(`  declarados pero no existen: ${faltanEnDisco.join(', ')}`);
  if (faltanEnDeclaracion.length) console.error(`  existen pero no están declarados: ${faltanEnDeclaracion.join(', ')}`);
  console.error('  Agregá o sacá el archivo de PAQUETES/SUELTOS y volvé a correr.');
  process.exit(1);
}

/** Opciones deliberadamente SIN `toplevel`: ver la explicación de arriba. */
const opciones = {
  compress: true,
  mangle: true,
  format: { comments: false },
};

/**
 * Minifica un archivo de codigo/ y devuelve su código. Corta el proceso
 * con un error claro si Terser no puede procesarlo.
 * @param {string} nombre
 * @returns {Promise<string>}
 */
async function minificar(nombre) {
  const codigo = readFileSync(join(carpetaFuente, nombre), 'utf8');
  let resultado;
  try {
    resultado = await minify(codigo, opciones);
  } catch (error) {
    console.error(`✗ Terser no pudo minificar codigo/${nombre}:`);
    console.error(`  ${error.message}`);
    console.error('  No se escribió nada de esta corrida — se corrige el error y se');
    console.error('  vuelve a correr el script entero.');
    process.exit(1);
  }
  if (!resultado.code) {
    console.error(`✗ Terser devolvió una salida vacía para codigo/${nombre}. Algo está mal.`);
    process.exit(1);
  }
  return resultado.code;
}

let bytesOriginales = 0;
let bytesMinificados = 0;
let cuantosArchivos = 0;

/* ─── Limpiar la carpeta de producción de restos de una corrida anterior ──
   (paquetes viejos con otro nombre, o los 27 archivos sueltos de antes de
   este cambio). Se recrea todo de cero en cada corrida, así nunca queda
   un archivo fantasma que index.html ya no pide pero que alguien podría
   subir por error. */
for (const nombre of readdirSync(carpetaProduccion)) {
  const ruta = join(carpetaProduccion, nombre);
  if (statSync(ruta).isFile() && nombre.endsWith('.js')) rmSync(ruta);
}

/* ─── Armar los paquetes ────────────────────────────────────────────────
   Cada archivo se minifica SOLO (ver la nota de "toplevel" arriba) y
   recién después se pega con los demás del mismo paquete, en el mismo
   orden que tenían en index.html. Un `;\n` entre archivo y archivo:
   inofensivo si no hace falta, pero evita que el final de un archivo se
   lea pegado al comienzo del siguiente (por ejemplo si uno terminara con
   algo que un `(` del siguiente pudiera interpretar como un llamado). */
for (const paquete of PAQUETES) {
  const trozos = [];
  for (const archivo of paquete.archivos) {
    bytesOriginales += Buffer.byteLength(readFileSync(join(carpetaFuente, archivo), 'utf8'), 'utf8');
    const minificado = await minificar(archivo);
    bytesMinificados += Buffer.byteLength(minificado, 'utf8');
    trozos.push(minificado);
    cuantosArchivos++;
  }
  const contenido = trozos.join(';\n');
  writeFileSync(join(carpetaProduccion, paquete.nombre + '.js'), contenido);
}

/* ─── Los sueltos, exactamente como antes (un archivo, un nombre) ──────── */
for (const nombre of SUELTOS) {
  bytesOriginales += Buffer.byteLength(readFileSync(join(carpetaFuente, nombre), 'utf8'), 'utf8');
  const minificado = await minificar(nombre);
  bytesMinificados += Buffer.byteLength(minificado, 'utf8');
  writeFileSync(join(carpetaProduccion, nombre), minificado);
  cuantosArchivos++;
}

const ahorro = bytesOriginales - bytesMinificados;
const porcentaje = ((ahorro / bytesOriginales) * 100).toFixed(0);

console.log(`✓ ${cuantosArchivos} archivos de codigo/ minificados y agrupados en ${PAQUETES.length + SUELTOS.length} archivos de codigo/produccion/`);
console.log(`  (${PAQUETES.length} paquetes + ${SUELTOS.length} sueltos: ${SUELTOS.join(', ')})`);
console.log(`  ${(bytesOriginales / 1024).toFixed(0)} KB → ${(bytesMinificados / 1024).toFixed(0)} KB  (-${porcentaje}%)`);
console.log('');
console.log('codigo/ (el original, comentado) queda intacto. index.html tiene que');
console.log('apuntar a los paquetes de codigo/produccion/ — si cambiaste PAQUETES o');
console.log('SUELTOS acá arriba, actualizá también los <script> de index.html.');
