/* ══════════════════════════════════════════════════════════════════════
   _FECHA-DE-LA-FIESTA.MJS · ESTAMPAR LA FECHA EN LOS ARCHIVOS DEL NAVEGADOR

   POR QUÉ EXISTE ESTE ARCHIVO
   La fecha de la fiesta vive en UN solo lugar: la constante FIESTA_DIA de
   admin/api/_lib/entorno.php. Todo el PHP la pregunta ahí mismo con
   diaDeLaFiesta() y no lleva copia.

   Pero el navegador no puede leer PHP. index.html y los dos archivos de
   configuración del JavaScript —el de la invitación y el del panel— son
   archivos estáticos que se sirven tal cual. Alguien tiene que escribirles
   la fecha adentro, y ese alguien es este archivo, en el momento de
   compilar.

   O sea: la fecha sigue teniendo un solo dueño. Lo que hay en el
   JavaScript no es una segunda copia que haya que acordarse de cambiar,
   es una copia GENERADA, como los `?v=NN` que reescribe subir-version.mjs
   o el CSS que inyecta empaquetar.mjs.

   ⚠️ CORRE ANTES DE MINIFICAR, NO DESPUÉS.
   La cadena es: empaquetar.mjs → minificar-js.mjs → subir-version.mjs.
   minificar-js.mjs saca codigo/produccion/*.js de codigo/*.js. Si la
   fecha se estampara al final —en subir-version.mjs, que es donde uno
   pensaría—, las copias minificadas, que son las que el sitio realmente
   sirve, saldrían con la fecha vieja. Por eso lo llama empaquetar.mjs,
   que es el primer paso.

   ⚠️ SI NO ENCUENTRA ALGO, SE DETIENE.
   Ninguna función de acá "sigue con lo que había". Una fecha que falla
   en silencio es peor que no tener punto único: el repo se vería
   ordenado y estaría mintiendo. Es la misma disciplina que ya tiene
   subir-version.mjs cuando no encuentra ningún `?v=NN`.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/** El único lugar del proyecto donde la fecha está escrita a mano. */
export const ARCHIVO_DUENO = 'admin/api/_lib/entorno.php';

const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves',
              'viernes', 'sábado'];


/**
 * Lee la fecha de entorno.php y la devuelve en todas las formas en que
 * el proyecto la escribe.
 *
 * Se apoya en que esas dos líneas de entorno.php son planas y de una
 * sola línea. El comentario que tienen al lado lo dice explícitamente,
 * para que nadie las envuelva sin darse cuenta de que hay un script
 * leyéndolas.
 *
 * @returns {{dia: string, hora: string, iso: string, cierre: string,
 *            enPalabras: string, diaDeLaSemana: string, conDiaDeLaSemana: string}}
 */
export function leerLaFecha() {
  const ruta = join(raiz, ARCHIVO_DUENO);
  const php = readFileSync(ruta, 'utf8');

  const dia = (php.match(/^const FIESTA_DIA\s*=\s*'(\d{4}-\d{2}-\d{2})';/m) || [])[1];
  const hora = (php.match(/^const FIESTA_HORA\s*=\s*'(\d{2}:\d{2}:\d{2})';/m) || [])[1];

  if (!dia || !hora) {
    throw new Error(
      `No se encontró FIESTA_DIA o FIESTA_HORA en ${ARCHIVO_DUENO}.\n` +
      '  Tienen que estar así, planas y en una sola línea cada una:\n' +
      "    const FIESTA_DIA  = 'AAAA-MM-DD';\n" +
      "    const FIESTA_HORA = 'HH:MM:SS';\n" +
      '  Si se cambió la forma, hay que arreglar también este archivo\n' +
      '  (herramientas/_fecha-de-la-fiesta.mjs). Antes de seguir: la\n' +
      '  fecha del sitio quedaría vieja y nadie se daría cuenta.');
  }

  /* Mediodía UTC para que el objeto Date no se corra de día por la zona
     horaria de quien esté compilando. Solo se usa para sacar el día de
     la semana y el nombre del mes. */
  const cuando = new Date(`${dia}T12:00:00Z`);
  const [anio, mes, diaDelMes] = dia.split('-').map(Number);

  const enPalabras = `${diaDelMes} de ${MESES[mes]} de ${anio}`;
  const diaDeLaSemana = DIAS[cuando.getUTCDay()];
  const conMayuscula = diaDeLaSemana[0].toUpperCase() + diaDeLaSemana.slice(1);

  /* La fiesta termina a la 1 de la mañana del día siguiente. Es un dato
     derivado: se calcula, no se guarda, igual que el día de la semana. */
  const cierre = new Date(`${dia}T00:00:00Z`);
  cierre.setUTCDate(cierre.getUTCDate() + 1);

  return {
    dia,
    hora,
    iso: `${dia}T${hora}`,
    cierre: `${cierre.toISOString().slice(0, 10)}T01:00:00`,
    enPalabras,
    diaDeLaSemana: conMayuscula,
    conDiaDeLaSemana: `${conMayuscula} ${enPalabras}`,
  };
}


/* ─── LOS LUGARES QUE SE ESTAMPAN ─────────────────────────────────────
 *
 * Cada uno dice qué archivo, qué buscar y con qué reemplazar.
 *
 * ⚠️ TODOS LOS PATRONES VAN ANCLADOS AL PRINCIPIO DE LA LÍNEA, con los
 * cuatro espacios de sangría del campo de verdad. La primera versión de
 * esto buscaba solo `fechaEnPalabras:` y encontraba TRES: la buena, y
 * dos que están adentro de un comentario que enseña cómo se editaba
 * esto a mano. Esos ejemplos tienen que quedarse con su fecha inventada
 * —es lo que los hace ejemplos— y los campos de verdad son los únicos
 * que arrancan la línea.
 *
 * Lo mismo con el <strong> de index.html: hay cuatro en la página, y
 * solo uno es la fecha. Por eso el patrón lleva el nombre de la clase
 * que lo contiene.
 *
 * `cuantas` es cuántas veces tiene que aparecer. Si aparecen más o
 * menos, se detiene: el archivo cambió de forma y este de acá ya no
 * sabe dónde está parado. Así fue como se encontró lo de los tres
 * `fechaEnPalabras`. */
function lugares(f) {
  return [
    /* ── La invitación ── */
    { archivo: 'codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}fechaYHora:\s*')[^']*(')/m,
      poner: `$1${f.iso}$2` },
    { archivo: 'codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}fechaYHoraDeCierre:\s*')[^']*(')/m,
      poner: `$1${f.cierre}$2` },
    { archivo: 'codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}diaDeLaSemana:\s*')[^']*(')/m,
      poner: `$1${f.diaDeLaSemana}$2` },
    { archivo: 'codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}fechaEnPalabras:\s*')[^']*(')/m,
      poner: `$1${f.enPalabras}$2` },

    /* ── El chatbot de la invitación ── */
    { archivo: 'codigo/00-conocimiento-chatbot.js', cuantas: 1,
      buscar: /^( {4}fecha:\s*')[^']*(')/m,
      poner: `$1${f.conDiaDeLaSemana}$2` },

    /* ── El panel ── */
    { archivo: 'admin/codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}fechaYHora:\s*')[^']*(')/m,
      poner: `$1${f.iso}$2` },
    { archivo: 'admin/codigo/01-configuracion.js', cuantas: 1,
      buscar: /^( {4}fechaEnPalabras:\s*')[^']*(')/m,
      poner: `$1${f.enPalabras}$2` },

    /* ── Lo que ven Google y WhatsApp al compartir el link ── */
    { archivo: 'index.html', cuantas: 2,
      buscar: /(content="XV Años de Ania · )[^"]*(")/g,
      poner: `$1${f.enPalabras}$2` },
    { archivo: 'index.html', cuantas: 1,
      buscar: /(Acompáñanos a celebrar los XV años de Ania\. )[^,]*(, Salones Alvi)/,
      poner: `$1${f.conDiaDeLaSemana}$2` },

    /* ── La fecha que se ve si el teléfono no corre JavaScript ── */
    { archivo: 'index.html', cuantas: 1,
      buscar: /(<p class="sin-js__datos">\s*<strong>)[^<]*(<\/strong>)/,
      poner: `$1${f.conDiaDeLaSemana}$2` },
  ];
}


/**
 * Escribe la fecha en todos los archivos que el navegador lee.
 *
 * @param {boolean} soloMirar true → no escribe, solo informa qué haría.
 *                            Lo usa prueba-fecha-unica.mjs.
 * @returns {{fecha: object, cambios: Array, escritos: number}}
 */
export function estamparLaFecha(soloMirar = false) {
  const fecha = leerLaFecha();
  const porArchivo = new Map();
  const cambios = [];

  for (const lugar of lugares(fecha)) {
    const ruta = join(raiz, lugar.archivo);
    const antes = porArchivo.get(lugar.archivo) ?? readFileSync(ruta, 'utf8');

    /* Para CONTAR hace falta la bandera `g`, pero hay que conservar las
       demás. La primera versión hacía new RegExp(source, 'g') a secas y
       se comía la `m`, así que `^` dejaba de significar "principio de
       línea" y todos los patrones anclados contaban cero. */
    const banderas = lugar.buscar.flags.includes('g')
      ? lugar.buscar.flags
      : lugar.buscar.flags + 'g';
    const encontradas = antes.match(new RegExp(lugar.buscar.source, banderas));
    const cuantas = encontradas ? encontradas.length : 0;

    if (cuantas !== lugar.cuantas) {
      throw new Error(
        `En ${lugar.archivo} se esperaban ${lugar.cuantas} coincidencia(s) de\n` +
        `  ${lugar.buscar}\n` +
        `  y se encontraron ${cuantas}. El archivo cambió de forma.\n` +
        '  Hay que arreglar la lista de lugares en\n' +
        '  herramientas/_fecha-de-la-fiesta.mjs antes de seguir: si no, la\n' +
        '  fecha de ese archivo se queda vieja sin que nadie avise.');
    }

    const despues = antes.replace(lugar.buscar, lugar.poner);
    porArchivo.set(lugar.archivo, despues);
    if (despues !== antes) cambios.push(lugar.archivo);
  }

  if (!soloMirar) {
    for (const [archivo, contenido] of porArchivo) {
      writeFileSync(join(raiz, archivo), contenido);
    }
  }

  return { fecha, cambios: [...new Set(cambios)], escritos: porArchivo.size };
}
