/* ══════════════════════════════════════════════════════════════════════
   REVISAR-PHP.MJS · el chequeo estructural del backend

   POR QUÉ EXISTE
   En esta máquina no hay PHP instalado, así que `php -l` no se puede
   correr nunca. Un paréntesis de más en un archivo del backend no se
   descubre acá: se descubre en el servidor, con la página en blanco.

   Esto no es un intérprete y no puede decir que el archivo funciona.
   Detecta la clase de error que de verdad se comete editando a mano:
   llaves, paréntesis o corchetes descompensados, y un `case` que se cae
   al siguiente porque falta el `break`.

   ⚠️ POR QUÉ UN ESCÁNER Y NO UNA PILA DE EXPRESIONES REGULARES
   Porque ya lo intenté con regex y daba desbalances INVENTADOS. El
   motivo, que vale la pena dejar escrito: si se quitan los comentarios
   `//` antes que las cadenas, la primera línea con `'https://…'` pierde
   su comilla de cierre -el `//` de la URL se toma como comentario- y a
   partir de ahí todo el conteo queda corrido.

   Peor que no tener la herramienta: pasé un rato persiguiendo un
   desbalance que no existía. Un solo recorrido, sabiendo en cada
   carácter dónde estoy, no tiene ese problema.

   CÓMO SE CORRE
       node herramientas/revisar-php.mjs                  (todo el backend)
       node herramientas/revisar-php.mjs admin/api/x.php  (solo esos)
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Devuelve solo el código: sin comentarios y con las cadenas vaciadas.
 *
 * ⚠️ SOLO CUENTA LO QUE ESTÁ DENTRO DE `<?php … ?>`.
 * Un archivo como mi-pase.php alterna PHP y HTML: abre una llave en un
 * bloque, escribe HTML, y la cierra en otro bloque más abajo. Contando
 * el archivo entero, cualquier `{` de una hoja de estilos incrustada
 * cuenta como código y el saldo se dispara. Fuera de PHP no hay nada
 * que revisar acá.
 *
 * @param {string} texto
 * @returns {string}
 */
function desnudar(texto) {
  let salida = '';
  let i = 0;
  let dentroDePhp = false;

  while (i < texto.length) {
    const c = texto[i];
    const dos = texto.slice(i, i + 2);

    // ── El interruptor entre HTML y PHP ──
    if (!dentroDePhp) {
      if (texto.startsWith('<?php', i) || texto.startsWith('<?=', i)) {
        dentroDePhp = true;
        i += texto.startsWith('<?php', i) ? 5 : 3;
        continue;
      }
      i++;              // HTML: no se cuenta
      continue;
    }

    if (dos === '?>') {
      dentroDePhp = false;
      i += 2;
      continue;
    }

    if (dos === '/*') {
      const fin = texto.indexOf('*/', i + 2);
      i = fin < 0 ? texto.length : fin + 2;
      salida += ' ';
      continue;
    }

    // PHP admite las dos formas de comentario de una línea.
    if (dos === '//' || c === '#') {
      const fin = texto.indexOf('\n', i);
      i = fin < 0 ? texto.length : fin;
      salida += ' ';
      continue;
    }

    if (c === "'" || c === '"') {
      const comilla = c;
      i++;
      while (i < texto.length) {
        if (texto[i] === '\\') { i += 2; continue; }   // el escape se salta entero
        if (texto[i] === comilla) { i++; break; }
        i++;
      }
      salida += '""';
      continue;
    }

    salida += c;
    i++;
  }

  return salida;
}

/**
 * Todos los .php de una carpeta, hacia abajo.
 *
 * @param {string} carpeta
 * @returns {string[]}
 */
function buscarPhp(carpeta) {
  const encontrados = [];

  for (const nombre of readdirSync(carpeta)) {
    const completa = join(carpeta, nombre);
    if (statSync(completa).isDirectory()) encontrados.push(...buscarPhp(completa));
    else if (nombre.endsWith('.php')) encontrados.push(completa);
  }

  return encontrados;
}

const pedidos = process.argv.slice(2);
const archivos = pedidos.length
  ? pedidos.map(p => (isAbsolute(p) ? p : join(raiz, p)))
  : [...buscarPhp(join(raiz, 'admin/api')),
     ...['invitacion.php', 'confirmar.php', 'mi-pase.php', 'reiniciar-prueba.php']
       .map(n => join(raiz, n))];

console.log('\nREVISIÓN ESTRUCTURAL DEL PHP');
console.log('No es php -l: no dice que funcione, dice que no está descompensado.\n');

let conFalla = 0;

for (const ruta of archivos) {
  const fuente = readFileSync(ruta, 'utf8');
  const codigo = desnudar(fuente);
  const problemas = [];

  for (const [abre, cierra, como] of [['{', '}', 'llaves'],
                                      ['(', ')', 'paréntesis'],
                                      ['[', ']', 'corchetes']]) {
    const cuantos = t => t.split(abre).length - 1;
    const saldo = cuantos(codigo) - (codigo.split(cierra).length - 1);
    if (saldo !== 0) {
      problemas.push(como + ' descompensados: ' + (saldo > 0 ? '+' : '') + saldo);
    }
  }

  /* Un archivo con varios `<?php` es normal cuando alterna con HTML
     (mi-pase.php). Lo que no puede pasar es que no haya ninguno. */
  if (!fuente.includes('<?php')) problemas.push('no abre con <?php');

  /* Un `case` que sigue de largo al siguiente. En este proyecto cada
     acción termina respondiendo, así que responderBien/responderMal
     cuentan como salida igual que un break.

     Un `case` con el cuerpo VACÍO no es un error: son los case apilados
     -`case 'a': case 'b': …`- que comparten un mismo cuerpo a
     propósito, y los usan correo.php y mesas.php. Lo que se busca acá
     es un case CON código que se olvidó de salir. */
  if (codigo.includes('switch')) {
    const trozos = ('\n' + codigo).split('\ncase ');
    trozos.slice(1, -1).forEach(trozo => {
      const cuerpo = trozo.slice(trozo.indexOf(':') + 1).trim();
      if (cuerpo === '') return;              // case apilado, deliberado

      const sale = ['break', 'return', 'responderBien', 'responderMal', 'exit']
        .some(p => cuerpo.includes(p));
      if (!sale) problemas.push('un `case` sin salida: ' + trozo.trim().slice(0, 40));
    });
  }

  const corta = relative(raiz, ruta).replace(/\\/g, '/');

  if (problemas.length) {
    conFalla++;
    console.log('  FALLA ' + corta);
    problemas.forEach(p => console.log('        - ' + p));
  } else {
    console.log('  ok    ' + corta);
  }
}

console.log('');
if (conFalla) {
  console.log('✗ ' + conFalla + ' archivo(s) con la estructura rota. No subir así.');
  process.exit(1);
}
console.log('✓ Los ' + archivos.length + ' archivos PHP están balanceados.');
