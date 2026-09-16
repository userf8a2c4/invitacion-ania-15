/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-BURBUJAS.MJS · QUE UN AVISO SE PUEDA APAGAR Y SE VUELVA A ENCENDER

   QUÉ COMPRUEBA
   Que la burbuja de la campana muestre lo NUEVO, no el total; que abrir
   la bandeja la apague; que vuelva sola cuando aparece uno más; y que un
   aviso lleve al ítem del que habla y no a una lista genérica.

   POR QUÉ EXISTE
   La burbuja estuvo días en «9+» sin forma de saber qué era ni de
   bajarla. El motivo de fondo: cuenta HECHOS VIVOS —un pago que vence en
   seis días, una tarea atrasada—, no mensajes. Mirar un hecho no lo
   cambia, así que mirarlo no podía apagar nada, y no existía ninguna
   marca de «ya lo vi». No estaba rota: no estaba.

   LAS CUATRO FORMAS EN QUE ESTO SE ROMPE SIN AVISAR

     · SE APAGA Y NO VUELVE. Si se guardara «ya vi todo» sin número, el
       aviso siguiente no se anunciaría nunca. La marca tiene que ser
       CUÁNTOS había, no un sí/no.

     · SE RESUELVEN Y DEJA DE AVISAR. Marca en 9, se resuelven 6, llegan
       2 nuevos: son 5, que es menos que 9, y los 2 nuevos no aparecen.
       Cuando el total baja, la marca tiene que bajar con él.

     · UNO SE APAGA LOS AVISOS DEL OTRO. Si la marca es del navegador y
       no de la cuenta, el primero que abre la bandeja se los apaga al
       otro, que nunca se entera de que hubo algo.

     · EL SALUDO CUENTA COMO AVISO. El agente motivador devuelve una
       frase cariñosa por día; como técnicamente es una «sugerencia»,
       sumaba +1 todos los días.

   Ninguna de las cuatro tira un error. Las cuatro se ven igual desde
   afuera: un número que no significa nada.

   ⚡ ESTA PRUEBA EJECUTA, NO LEE. La lección de prueba-eclipse-corre.mjs.
   Se le arma un mundo a la función —memoria, burbuja, avisos— y se mira
   qué número pinta.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const campana    = readFileSync(raiz('admin', 'codigo', '37-campana.js'), 'utf8');
const navegacion = readFileSync(raiz('admin', 'codigo', '05-navegacion.js'), 'utf8');
const utilidades = readFileSync(raiz('admin', 'codigo', '02-utilidades.js'), 'utf8');
const resumen    = readFileSync(raiz('admin', 'codigo', '07-vista-resumen.js'), 'utf8');
const agentes    = readFileSync(raiz('admin', 'codigo', '40-agentes.js'), 'utf8');
const css        = readFileSync(raiz('admin', 'estilos', '02-componentes.css'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : '\n        → ' + detalle));
  if (!bien) fallos++;
};

const sinComentarios = texto => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

/** Saca el texto de una función suelta, para poder ejecutarla aparte. */
const sacar = (fuente, nombre) => {
  const codigo = sinComentarios(fuente);
  const desde = codigo.indexOf('function ' + nombre);
  return desde === -1 ? null : codigo.slice(desde, codigo.indexOf('\n}', desde) + 2);
};


/* ─── 1. LA BURBUJA MUESTRA LO NUEVO, NO EL TOTAL ────────────────── */

console.log('\nCuántos avisos son nuevos\n');

const fuenteNuevos = sacar(campana, 'cuantosAvisosSonNuevos');
comprobar('existe cuantosAvisosSonNuevos()', !!fuenteNuevos);

/* ⚡ ESTA FUNCIÓN CAMBIÓ DE CONTRATO (2026-09-16)
 *
 * Recibía un NÚMERO —cuántos avisos hay— y lo restaba contra un número
 * guardado. Ese modelo tenía un agujero que no se veía restando: tres
 * resueltas y tres nuevas dan el mismo total, la resta da cero, y la
 * campana se queda apagada con tres cosas que nadie va a ver.
 *
 * Ahora recibe la LISTA de ids de los avisos de este momento. Los ids ya
 * eran estables y derivan de la base ('dinero-pago-42').
 *
 * El caso de las tres compensadas, y todo lo demás del arreglo, vive en
 * prueba-avisos-y-numeros.mjs. Acá se comprueba lo mínimo para que esta
 * prueba no dé por buena una función que ya no existe con esa forma. */
if (fuenteNuevos) {
  const correr = (idsAhora, yaVistos) => new Function(
    "const AVISOS_VISTOS = 'avisos-vistos';" +
    'const recordadoDeLaCuenta = (c, r) => ' + JSON.stringify(yaVistos) + ';' +
    fuenteNuevos + '\nreturn cuantosAvisosSonNuevos(' +
    JSON.stringify(idsAhora) + ');'
  )();

  const nueve = Array.from({ length: 9 }, (_, i) => 'pendiente:pago:' + i);

  comprobar('la primera vez, los 9 que hay son 9 nuevos',
    correr(nueve, []) === 9,
    'sin marca previa todo es nuevo');

  comprobar('dados por vistos los 9, la burbuja queda en 0',
    correr(nueve, nueve) === 0,
    'ESTE es el bug que tuvo el 9+ encendido días: mirar no apagaba nada');

  comprobar('llega uno más y se enciende sola, marcando 1',
    correr(nueve.concat(['pendiente:tarea:99']), nueve) === 1,
    'y tiene que decir 1, no 10: lo nuevo es uno');

  comprobar('si solo se resolvieron, no se enciende',
    correr(nueve.slice(0, 3), nueve) === 0);

  comprobar('sin nada pendiente, nada que mostrar',
    correr([], []) === 0);

  comprobar('la función toma ids, no un total',
    /idsDeAhora\.filter/.test(fuenteNuevos),
    'restar totales esconde el caso de las compensadas');
}


/* ─── 2. ABRIR LA BANDEJA ES «YA LOS VI» ─────────────────────────── */

console.log('\nAbrir la bandeja apaga la burbuja\n');

const abrir = sacar(campana, 'abrirBandejaDeAvisos') || '';

comprobar('al abrir se guarda CUÁLES había, no cuántos',
  /darAvisosPorVistos\(await avisosDeAhora\(\)\)/.test(abrir),
  'guardar un total esconde el caso de tres resueltas y tres nuevas');

comprobar('y la burbuja se apaga en el acto',
  /ponerBurbuja\('#burbuja-campana', 0\)/.test(abrir),
  'sin esperar al próximo refresco');

comprobar('se marca al ABRIR, no al cerrar',
  abrir.indexOf('recordarDeLaCuenta(AVISOS_VISTOS') < abrir.indexOf('pendientes.length'),
  'cerrar una hoja tiene tres caminos —el botón, el gesto, atrás— y uno siempre se olvida');


/* ─── 3. UN SALUDO NO ES UN AVISO ────────────────────────────────── */

console.log('\nQué cuenta y qué no\n');

const refrescar = sacar(campana, 'refrescarSugerenciasDeAgentesParaLaCampana') || '';

comprobar('el saludo del motivador no suma a la campana',
  /s\.agente !== 'motivador'/.test(refrescar),
  '46-agente-motivador.js devuelve una frase cariñosa por día y sumaba +1 todos los días');

comprobar('cada sugerencia sabe de qué agente vino',
  /agente: agente\.clave/.test(agentes),
  'sin eso no hay forma de distinguir un saludo de un pendiente');

comprobar('el contador se recalcula al abrir la bandeja',
  /refrescarSugerenciasDeAgentesParaLaCampana\(\)/.test(abrir),
  'se escribía una sola vez al arrancar y quedaba congelado toda la sesión');

comprobar('y cuenta lo mismo que el asistente',
  /recogerSugerencias\(pantalla\)/.test(refrescar) && /VISTA_ACTUAL/.test(refrescar),
  'el asistente pasa VISTA_ACTUAL; sin eso los dos contaban distinto');


/* ─── 4. TOCAR UN AVISO LLEVA AL ÍTEM ────────────────────────────── */

console.log('\nA dónde lleva tocar un aviso\n');

const fila = sacar(campana, 'filaDeAviso') || '';

comprobar('la fila lleva el id que manda el servidor',
  /p\.id/.test(fila),
  'hoy.php lo manda en cada pendiente y acá se tiraba');

comprobar('y también el tipo',
  /p\.tipo/.test(fila));

comprobar('las alarmas dejaron de ser filas muertas',
  /p\.tipo === 'alarma'/.test(fila) &&
  /tipo === 'alarma'[\s\S]{0,300}?abrirAlarmas\(\)/.test(sinComentarios(campana)),
  'hoy.php las manda sin destino y se pintaban como <div> sin nada que tocar');

const senalar = sacar(campana, 'senalarElAvisoEnLaLista') || '';
comprobar('existe el señalador de la fila',
  !!senalar && /scrollIntoView/.test(senalar));
comprobar('y se apaga solo',
  /classList\.remove\('lista__fila--senalada'\)/.test(senalar),
  'un resaltado que se queda deja de significar "esto es lo que buscabas"');
comprobar('sin id no hace nada',
  /if \(!id \|\| Number\(id\) <= 0\) return;/.test(senalar),
  'no puede romper la navegación cuando el ítem ya no está');
comprobar('el estilo existe y respeta a quien no quiere movimiento',
  /\.lista__fila--senalada\s*\{/.test(css) &&
  /prefers-reduced-motion[\s\S]{0,200}?lista__fila--senalada/.test(css));


/* ─── 5. EL PUNTO DE «MÁS» DICE DE QUÉ ES ────────────────────────── */

console.log('\nEl punto de Más\n');

comprobar('ponerBurbuja guarda el número exacto',
  /burbuja\.dataset\.exacto = String\(n\);/.test(resumen),
  'lo que se ve se corta en "9+": doce y trece se ven igual');

comprobar('el menú Más le pone la cuenta a Correo',
  /function cuantosLeVanAEsteRenglon/.test(navegacion) &&
  /burbuja\.dataset\.exacto/.test(navegacion),
  'el punto de Más es #burbuja-correo y al entrar no había ningún renglón con ese número');

comprobar('y sale de la MISMA burbuja, no de una cuenta paralela',
  /buscar\('#burbuja-correo'\)/.test(navegacion),
  'dos cuentas del mismo hecho es como se desincronizan');


/* ─── 6. EL PUNTO DE GENTE SE APAGA TAMBIÉN LA SEGUNDA VEZ ───────── */

console.log('\nEl punto de Gente\n');

comprobar('Gente tiene alVolver',
  /invitados:\s*\{[^}]*alVolver:/.test(sinComentarios(navegacion)),
  'irA() no redibuja una vista ya cargada, así que el punto solo se apagaba la primera vez');

comprobar('y apaga el punto sin repintar la lista',
  /alVolver: \(\) => apagarElPuntoDeGente\(\)/.test(navegacion));


/* ─── 7. LAS MARCAS SON POR CUENTA, NO POR TELÉFONO ──────────────── */

console.log('\nDe quién son las marcas\n');

comprobar('existe recordarDeLaCuenta()',
  /function recordarDeLaCuenta/.test(utilidades) &&
  /function recordadoDeLaCuenta/.test(utilidades));

comprobar('la clave lleva la cuenta adentro',
  /function claveDeLaCuenta[\s\S]{0,400}?USUARIO\.id/.test(utilidades));

comprobar("y cae en 'anon' antes de entrar",
  /'anon'/.test(sacar(utilidades, 'claveDeLaCuenta') || ''),
  'hay marcas que se escriben mientras la sesión todavía se restaura');

/* Que ninguna marca de aviso haya quedado en el cajón compartido. */
const hoy = readFileSync(raiz('admin', 'codigo', '30-vista-hoy.js'), 'utf8');
const invitados = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');

for (const [nombre, fuente] of [['30-vista-hoy.js', hoy], ['08-vista-invitados.js', invitados]]) {
  const limpio = sinComentarios(fuente);
  const sueltas = (limpio.match(/\brecordar(?:ado)?\('(?:gente-[a-z-]+|alerta-releidos-vista)'/g) || []);
  comprobar(`${nombre}: ninguna marca de aviso quedó compartida`,
    sueltas.length === 0,
    sueltas.join(', '));
}


/* ─── RESULTADO ──────────────────────────────────────────────────── */

console.log('');
if (fallos === 0) {
  console.log('✓ Los avisos se pueden apagar, vuelven solos, y llevan a lo que anuncian.');
} else {
  console.log(`✗ ${fallos} fallo(s).`);
}

process.exit(fallos === 0 ? 0 : 1);
