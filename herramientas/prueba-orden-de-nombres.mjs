/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · EL ORDEN DE LOS NOMBRES DE UNA FAMILIA
   ══════════════════════════════════════════════════════════════════════

   Carlos: «que lucila pueda modificar el orden de los nombres en la app y
   esto se vea reflejado en la invitacion».

   Hasta el 14 de septiembre de 2026 el orden era el de carga —el orden en
   que Lucila se fue acordando de cada quien— y esa misma lista es la que
   la familia lee en su invitación.

   ⚠️ LO QUE HACE FRÁGIL A ESTA FASE NO ES EL REORDENAR, SON LOS LECTORES.
   El orden se escribe en un solo lugar y se lee en CUATRO
   (acompanantes.php dos veces, invitaciones.php, llegadas.php e
   invitacion.php). Si uno se queda con `ORDER BY id`, el panel y la
   invitación muestran a la misma familia en dos órdenes distintos, y no
   hay ningún error a la vista: son dos verdades para la misma gente.

   ⚠️ Y LA OTRA TRAMPA ES EL 429. Redibujar la ficha después de cada
   flecha dispara dos peticiones POR PERSONA (pintarEtiquetasDe,
   06-piezas.js). Una familia de cinco son 10 peticiones por toque; subir
   a alguien desde el final son 40. Este panel YA se comió un 429 del
   hosting por 20 peticiones al arrancar (la nota de acompanantes.php).
   Por eso la pantalla mueve el nodo con insertBefore en vez de repintar,
   y por eso esa decisión está blindada acá abajo.
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

const acomp  = leer('admin', 'api', 'acompanantes.php');
const invApi = leer('admin', 'api', 'invitaciones.php');
const lleg   = leer('admin', 'api', 'llegadas.php');
const inv    = leer('invitacion.php');
const insta  = leer('admin', 'api', 'instalar.php');
const sql    = leer('admin', 'migracion.sql');
const vista  = leer('admin', 'codigo', '08-vista-invitados.js');

/* Los comentarios de estos archivos explican largamente cada decisión,
   así que las comprobaciones de AUSENCIA miran el código pelado o se
   dejan engañar por su propia explicación. */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** El cuerpo del case 'ordenar', que es donde vive casi todo el riesgo. */
const ordenar = (acomp.match(/case 'ordenar':[\s\S]*?\n    break;/) || [''])[0];


/* ─── 1. EL ORDEN LLEGA HASTA LA INVITACIÓN ────────────────────────── */

console.log('\nEl orden llega hasta la invitación\n');

comprobar('invitacion.php pide las personas por el orden elegido',
  /orden, id/.test(inv),
  'es el archivo que lee la familia: si acá no cambia, Lucila acomoda ' +
  'para nadie');

/* ⛔ invitacion.php NO PUEDE PREGUNTAR SI LA COLUMNA EXISTE: tiene su
   propia conexión PDO y no carga admin/api/_lib/bd.php, así que no hay
   columnasDe(). Si el respaldo fuera un catch que se traga el error,
   $personas quedaría vacío, se dispararía la síntesis de lugares y las
   familias verían «Adulto 1», «Niño 2» en vez de sus nombres. */
/* ⚠️ SE MIRA LA CONCATENACIÓN, no el texto «ORDER BY id». La consulta se
   arma en dos pedazos —`$sqlPersonas . 'orden, id'` y `. 'id'`— justo
   para que las dos variantes compartan el mismo SELECT y no se puedan
   separar. Buscar el literal daba FALLA con el código correcto. */
comprobar('y conserva una consulta de respaldo por id',
  /\$sqlPersonas \. 'id'/.test(inv),
  'sin respaldo, subir el PHP antes de correr el instalador convierte ' +
  'los nombres cargados en «Adulto 1» para todas las familias');

comprobar('y el respaldo vuelve a consultar, no se traga el error',
  /catch[\s\S]{0,600}?->execute\([\s\S]{0,200}?fetchAll\(\)/.test(inv),
  'un catch vacío deja $personas en [] y la invitación sintetiza lugares ' +
  'en vez de mostrar los nombres que ya están cargados');


/* ─── 2. TODOS LOS LECTORES DICEN LO MISMO ─────────────────────────── */

console.log('\nLos cuatro lectores dicen lo mismo\n');

for (const [donde, fuente] of [
  ['acompanantes.php', acomp],
  ['invitaciones.php', invApi],
  ['llegadas.php',     lleg],
]) {
  comprobar(donde + ' pregunta si la columna existe antes de usarla',
    /in_array\('orden', columnasDe\('acompanantes'\), true\)/.test(fuente),
    'es el mismo patrón defensivo que ya usa `apodo`: subir el PHP sin ' +
    'correr el instalador tiene que dejar todo como está, no romperlo');

  /* El alias cambia según el archivo: llegadas.php hace JOIN y tiene que
     decir `a.orden, a.id` o MySQL no sabe de qué tabla habla. */
  comprobar('y ordena por la columna cuando está',
    /'(a\.)?orden, (a\.)?id'/.test(fuente),
    'sin esto ese lector se queda con el orden de carga y contradice a ' +
    'los otros tres');
}


/* ─── 3. LA COLUMNA SE AGREGA DONDE VA ─────────────────────────────── */

console.log('\nLa columna se agrega donde va\n');

comprobar('el instalador la agrega a las bases que ya existen',
  /'acompanantes',\s*'orden'/.test(insta),
  'sin esto, la fase no se enciende nunca: subir los archivos no alcanza, ' +
  'el interruptor es correr el instalador');

comprobar('y migracion.sql la trae en el CREATE TABLE',
  /CREATE TABLE IF NOT EXISTS acompanantes[\s\S]*?orden[\s\S]*?ENGINE=/i.test(sql),
  'una base nueva nacería sin la columna y el panel diría «corre el ' +
  'instalador» para siempre');

/* ⛔ LA PROMESA DE ESTA FASE ES QUE NO HAY MIGRACIÓN DE DATOS. Con
   DEFAULT 0, las filas viejas quedan en 0 y `ORDER BY orden, id` devuelve
   exactamente lo de hoy. No hay backfill que pueda quedar a medias
   porque no hay backfill. */
comprobar('y nadie reescribe las familias que ya existen',
  !/UPDATE acompanantes SET orden/i.test(sinComentarios(sql)) &&
  !/UPDATE acompanantes SET orden/i.test(sinComentarios(insta)),
  'un backfill sobre 51 familias es justo el paso que puede quedar a ' +
  'medias; con DEFAULT 0 no hace falta ninguno');


/* ─── 4. NO SE ESCRIBE A MEDIAS ────────────────────────────────────── */

console.log('\nEl guardado es todo o nada\n');

comprobar('existe el endpoint que recibe el orden',
  ordenar.length > 0,
  'no se encontró el case «ordenar» en acompanantes.php');

comprobar('y escribe adentro de una transacción',
  /beginTransaction\(\)/.test(ordenar) && /commit\(\)/.test(ordenar),
  'a mitad de camino, una familia queda con dos personas en la posición 1');

/* ⛔ inTransaction() ANTES DE DESHACER: si lo que falló fue el propio
   commit, la transacción ya no está y rollBack() tira una segunda
   excepción, esta sí sin nadie que la atrape. */
comprobar('y pregunta si hay transacción antes de deshacerla',
  /inTransaction\(\)/.test(ordenar),
  'sin eso, un fallo en el commit produce una segunda excepción sin ' +
  'atrapar y el invitado ve una página en blanco');

comprobar('y compara el conjunto de ids contra la base antes de escribir',
  /confirmacion_id = :c/.test(ordenar) && /409/.test(ordenar),
  'una petición encolada sin señal puede llegar cuando la familia ya ' +
  'cambió: si no se comprueba, escribe un orden que ya no corresponde');

comprobar('y el UPDATE lleva AND confirmacion_id',
  /UPDATE acompanantes SET orden[\s\S]{0,160}?AND confirmacion_id/.test(ordenar),
  'sin eso, un id de otra familia movería a alguien que no se está viendo');

comprobar('y el case termina en break',
  /\n    break;\s*$/.test(ordenar),
  'un case que se cae al siguiente ejecuta el borrado de al lado');


/* ─── 5. NO TOCA NINGÚN DATO DEL INVITADO ──────────────────────────── */

console.log('\nAcomodar no mueve ningún número\n');

for (const palabra of ['menu', 'alergias', 'pases', 'adultos', 'ninos']) {
  comprobar('el endpoint no nombra «' + palabra + '»',
    !new RegExp('\\b' + palabra + '\\b').test(sinComentarios(ordenar)),
    'acomodar tiene que tocar la columna `orden` y nada más: es lo que ' +
    'hace que no pueda pisarle una confirmación a nadie');
}

comprobar('y no mueve el cupo',
  !/moverElCupo/.test(sinComentarios(ordenar)),
  'el cupo no cambia porque cambie el orden de los nombres');


/* ─── 6. LA PANTALLA NO VUELVE A PEDIR TODO ────────────────────────── */

console.log('\nLa pantalla no dispara 40 peticiones\n');

/* ⚠️ `acomodar()` ESTÁ ANIDADA, así que su llave de cierre lleva dos
   espacios de sangría. Con /\n\}/ este match se comía 8 KB del archivo
   —tres funciones vecinas incluidas— y las comprobaciones de AUSENCIA de
   más abajo daban FALLA por código que no era el suyo. */
const acomodar =
  (vista.match(/\n  function acomodar\([\s\S]*?\n  \}/) || [''])[0];

comprobar('existe el manejador de las flechas',
  acomodar.length > 0,
  'no se encontró acomodar() en 08-vista-invitados.js');

/* ⛔ ESTA ES LA COMPROBACIÓN QUE MÁS VALE DE TODO EL ARCHIVO.
   pintarAcompanantes() dispara pintarEtiquetasDe() por cada persona, y
   ésa hace DOS peticiones cada una. Familia de cinco = 10 por toque. */
comprobar('y NO repinta la ficha en el camino feliz',
  !/pintarAcompanantes\(/.test(sinComentarios(acomodar)) &&
  !/pintarEtiquetasDe\(/.test(sinComentarios(acomodar)),
  'repintar dispara dos peticiones por persona: subir a alguien desde el ' +
  'final de una familia de cinco serían 40, y este panel ya se comió un ' +
  '429 del hosting por 20');

comprobar('y mueve el nodo en el sitio',
  /insertBefore/.test(acomodar),
  'es la alternativa barata a repintar: un solo nodo cambia de lugar');

/* ⛔ TRES TOQUES RÁPIDOS SON TRES POST, Y fetch NO PROMETE ORDEN DE
   LLEGADA. Si el segundo aterriza después del tercero, la base guarda un
   orden intermedio y la pantalla muestra otro: se ve como «lo acomodé y
   se desacomodó solo», y es dificilísimo de reproducir en el escritorio. */
comprobar('y los envíos van encadenados, no en paralelo',
  /ORDEN_EN_VUELO/.test(vista),
  'sin la cadena, tres toques rápidos pueden llegar al servidor en otro ' +
  'orden del que se tocaron');

comprobar('y manda la lista completa de ids, no «subí a Fulano»',
  /ids:/.test(acomodar),
  'un orden absoluto se puede reenviar dos veces sin cambiar el ' +
  'resultado; uno relativo aplicado dos veces mueve a alguien dos lugares');

comprobar('y no ensucia la vista de resumen',
  !/ensuciarVistas\([^)]*resumen/.test(sinComentarios(acomodar)),
  'acomodar no cambia ningún total: ensuciar resumen haría recalcular ' +
  'todo para nada');


/* ─── 7. EL VOCABULARIO DEL PROYECTO ───────────────────────────────── */

console.log('\nNadie es «titular»\n');

/* La regla está escrita dos veces en el proyecto —admin/api/invitaciones.php
   y admin/codigo/48-invitaciones.js—: una invitación es del GRUPO, y en la
   interfaz nunca se dice «titular» ni «acompañante». Por eso esta fase deja
   que TODOS se muevan, incluida la primera persona. */
const textoVisible = (acomodar + '\n' +
  (vista.match(/id="ord-[\s\S]{0,400}?>/g) || []).join('\n'));

for (const palabra of ['titular', 'acompañante']) {
  comprobar('la palabra «' + palabra + '» no aparece en la pantalla nueva',
    !new RegExp(palabra, 'i').test(sinComentarios(textoVisible)),
    'el proyecto ya decidió dos veces que una invitación es del grupo, y ' +
    'que esas dos palabras no se usan en la interfaz');
}


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El orden que elige Lucila es el que lee la familia, y\n' +
            '  acomodar no toca ningún otro dato.\n');
