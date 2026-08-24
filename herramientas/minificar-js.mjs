/* ══════════════════════════════════════════════════════════════════════
   MINIFICAR JS · copia liviana de codigo/*.js para servir en producción
   ══════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE
   Lighthouse marca "Reduce unused JavaScript" porque los 28 archivos de
   codigo/ se sirven tal cual se escriben: con toda la documentación en
   español, los headers en caja y el espaciado pensado para leerlos, no
   para que pesen poco. Este script genera una copia minificada de cada
   uno en codigo/produccion/, y esa carpeta es la que index.html termina
   pidiendo.

   ⛔ NO JUNTA LOS ARCHIVOS EN UNO SOLO, Y ES A PROPÓSITO
   Sigue siendo la misma lección que ya está documentada en empaquetar.mjs:
   juntar los 28 en un solo bundle mide PEOR en el "tiempo de bloqueo"
   (Total Blocking Time), porque pasa de ser 28 tareas cortas —ninguna
   llega a los 50 ms que Lighthouse empieza a contar— a UNA sola tarea
   larga que el navegador no puede cortar por la mitad. Este script
   respeta esa arquitectura: sigue habiendo un archivo por módulo, en el
   mismo orden, con el mismo nombre — solo que cada uno pesa menos.

   ⚠️ SE PROBÓ AGRUPAR EN 5 PAQUETES Y SE REVIRTIÓ (ronda de rendimiento
   en escritorio, la que le siguió a esta). La hipótesis era razonable —el
   servidor tardaba más en contestar con 27 pedidos simultáneos que con
   pocos— pero medida en PBE real dio PEOR, no mejor: el gobernador de
   calidad (21-monitor-de-rendimiento.js) terminaba en "baja" en vez de
   "media", con una tarea larga de carga de ~415 ms que con 27 archivos
   sueltos no existía. No se pudo aislar la causa exacta a tiempo, y ante
   la duda con un dato real en contra, se volvió a esto. Si en el futuro
   se quiere retomar la idea de agrupar, hay que MEDIR en PBE antes de
   subir a producción, no asumir a partir del razonamiento solo.

   POR QUÉ NO SE TOCAN LOS ARCHIVOS ORIGINALES
   codigo/*.js tiene comentarios largos a propósito: son la documentación
   de por qué cada cosa está hecha como está (igual que GUIA.md, pero para
   quien programe, no para quien organiza la fiesta). Ese archivo es el
   que se edita siempre. Este script solo LEE su contenido y escribe la
   copia liviana en codigo/produccion/; nunca escribe en el original.

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
   cada archivo se minifica de a uno, sin ver a los demás.

   CUÁNDO CORRERLO
       npm install                       (una sola vez, o cuando cambie terser)
       node herramientas/minificar-js.mjs

   ⚠️ SI SE EDITA CUALQUIER ARCHIVO DE codigo/, HAY QUE VOLVER A CORRER
   ESTO antes de subir — si no, el cambio queda en el archivo fuente pero
   la web sigue sirviendo la copia vieja de codigo/produccion/.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minify } from 'terser';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaFuente = join(raiz, 'codigo');
const carpetaProduccion = join(carpetaFuente, 'produccion');

mkdirSync(carpetaProduccion, { recursive: true });

const archivos = readdirSync(carpetaFuente)
  .filter(nombre => nombre.endsWith('.js') && statSync(join(carpetaFuente, nombre)).isFile())
  .sort();

if (archivos.length === 0) {
  console.error('✗ No se encontró ningún .js en codigo/. ¿Está bien la ruta?');
  process.exit(1);
}

/** Opciones deliberadamente SIN `toplevel`: ver la explicación de arriba. */
const opciones = {
  compress: true,
  mangle: true,
  format: { comments: false },
};

let bytesOriginales = 0;
let bytesMinificados = 0;

for (const nombre of archivos) {
  const rutaFuente = join(carpetaFuente, nombre);
  const codigo = readFileSync(rutaFuente, 'utf8');

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

  writeFileSync(join(carpetaProduccion, nombre), resultado.code);

  bytesOriginales += Buffer.byteLength(codigo, 'utf8');
  bytesMinificados += Buffer.byteLength(resultado.code, 'utf8');
}

const ahorro = bytesOriginales - bytesMinificados;
const porcentaje = ((ahorro / bytesOriginales) * 100).toFixed(0);

console.log(`✓ ${archivos.length} archivos minificados en codigo/produccion/`);
console.log(`  ${(bytesOriginales / 1024).toFixed(0)} KB → ${(bytesMinificados / 1024).toFixed(0)} KB  (-${porcentaje}%)`);
console.log('');
console.log('codigo/ (el original, comentado) queda intacto. index.html tiene que');
console.log('apuntar a codigo/produccion/ — eso ya está hecho, no hace falta tocarlo');
console.log('de nuevo salvo que se agregue o saque un archivo de codigo/.');
