/* ══════════════════════════════════════════════════════════════════════
   PRUEBA · EL BALANCEO DE LAS ROSAS Y LAS JOYAS
   ══════════════════════════════════════════════════════════════════════

   Carlos: «¿es posible permitir el balanceo de las rosas al tacto y al
   scroll, así como de las joyas al scroll, sin perder calidad? ¿Es posible
   hacer todo esto GANANDO calidad y fluidez?».

   Eran dos problemas distintos con la misma cara:

     · AL TACTO no existía. Los dos módulos escuchaban `mousemove`, que en
       iOS no dispara nunca. En un teléfono, ni las rosas ni las joyas
       reaccionaban al dedo en ningún nivel de calidad.

     · EL BALANCEO estaba APAGADO en calidad baja —la máquina de Carlos— por
       una medición correcta: con vaivén 7 fps, sin vaivén 60. Y el guard es
       un `return` al tope del cuadro, así que apagaba también la reacción al
       puntero y la respiración. Las rosas estaban inertes.

   Lo que se comprueba acá es lo que hizo posible encenderlo, y sobre todo
   lo que NO se puede deshacer sin volver a romperlo.
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

/* Los comentarios explican largamente por qué NO se usa `mousemove`, así que
   las comprobaciones de ausencia tienen que mirar el código pelado. */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const marco  = leer('codigo', '07-marco-y-enredaderas.js');
const joyas  = leer('codigo', '17-joyas-colgantes.js');
const cursor = leer('codigo', '05-cursor-personalizado.js');

const marcoCodigo = sinComentarios(marco);
const joyasCodigo = sinComentarios(joyas);


/* ─── 1. EL TACTO, QUE NO EXISTÍA ──────────────────────────────────── */

console.log('\nEl tacto\n');

for (const [nombre, codigo] of [['las rosas', marcoCodigo],
                                ['las joyas', joyasCodigo]]) {

  comprobar(nombre + ' ya no escuchan `mousemove`',
    !/addEventListener\('mousemove'/.test(codigo),
    'en iOS `mousemove` NO DISPARA NUNCA: con eso, en un teléfono no hay ' +
    'reacción al dedo en ningún nivel de calidad');

  comprobar('y escuchan punteros, que sí llegan del dedo',
    /addEventListener\('pointermove'/.test(codigo) &&
    /addEventListener\('pointerdown'/.test(codigo),
    'es el patrón de 06-petalos-con-fisica.js, ya probado en celular real');

  /* ⛔ LA QUE MÁS IMPORTA DE TODO EL ARCHIVO.
   *
   * En el teléfono la forma más común de terminar un toque NO es levantar
   * el dedo quieto: es deslizarlo para hacer scroll. Ahí el navegador se
   * queda el gesto y manda `pointercancel`. Sin escucharlo, las coordenadas
   * quedan clavadas donde estaba el dedo y las piezas se quedan dobladas
   * mirando a un dedo que ya no está — para siempre, hasta recargar.
   *
   * Es el mismo bug que en 06 se veía como «los pétalos salen disparados
   * siempre hacia la izquierda». */
  comprobar('y sueltan en `pointercancel`, que es como termina un scroll',
    /addEventListener\('pointercancel'/.test(codigo),
    'sin esto, arrastrar el dedo para scrollear deja las piezas dobladas ' +
    'para siempre apuntando a un dedo que ya no está');

  /* ⚠️ Y EL MOUSE NO SE SUELTA EN `pointerup`. Un clic termina en
     `pointerup` y el mouse SIGUE AHÍ. Soltarlo ahí haría que todo volviera
     de golpe a su sitio cada vez que alguien hace clic en cualquier lado. */
  comprobar('pero el mouse NO se suelta al hacer clic',
    /pointerType === 'touch'/.test(codigo) &&
    /const soltarSiEsDedo/.test(codigo) &&
    /addEventListener\('pointerup', soltarSiEsDedo/.test(codigo),
    'soltar en `pointerup` a secas devolvería todo a su sitio en cada clic');

  comprobar('y un segundo dedo no pisa al primero',
    /punteroActivo !== null && evento\.pointerId !== punteroActivo/.test(codigo),
    'sin esto, el segundo dedo reemplaza las coordenadas del primero y el ' +
    'cuadro siguiente calcula un salto que nunca ocurrió');

  /* El dedo tiene que poder scrollear: un listener no pasivo puede bloquear
     el desplazamiento mientras el JavaScript piensa. */
  const escuchas = codigo.match(/addEventListener\('pointer\w+'[^;]*/g) || [];
  comprobar('y ningún listener de puntero bloquea el scroll',
    escuchas.length >= 4 && escuchas.every((e) => /passive: true/.test(e)),
    escuchas.filter((e) => !/passive: true/.test(e)).join(' | ') ||
    'encontré ' + escuchas.length + ' escuchas');
}

/* El cursor propio SÍ debe seguir con `mousemove`: solo existe con mouse. */
comprobar('el cursor propio sigue con `mousemove`, y está bien',
  /addEventListener\('mousemove'/.test(sinComentarios(cursor)),
  'un cursor dibujado no tiene sentido sin mouse: ahí `mousemove` es lo ' +
  'correcto y no hay nada que migrar');


/* ─── 2. EL PASO DE CADA ÁNGULO, CONTRA SU RADIO ───────────────────── */

console.log('\nLa cuantización, medida contra el radio de giro\n');

const divisiones = (() => {
  const m = marco.match(/const DIVISIONES_POR_GRADO = \{([\s\S]*?)\};/);
  if (!m) return null;
  const num = (clave) => {
    const x = m[1].match(new RegExp(clave + ':\\s*(\\d+)'));
    return x ? Number(x[1]) : null;
  };
  return { planta: num('planta'), nudo: num('nudo'), flor: num('flor') };
})();

comprobar('cada sistema tiene su propio paso',
  !!(divisiones && divisiones.planta && divisiones.nudo && divisiones.flor),
  'un paso único para los tres es el error fácil: el límite no es el ' +
  'gusto, es el píxel, y depende del RADIO de cada uno');

if (divisiones) {
  /* ⛔ LOS RADIOS, MEDIDOS EN VIVO (2026-09-13) con getBoundingClientRect
   * contra el `transform-origin` real de cada pieza. Un giro desplaza
   * `radio × ángulo`, así que el paso tolerable sale de ahí: se toma medio
   * píxel como el umbral, que es el criterio que 28-eclipse.js ya usaba.
   *
   *     sistema    radio mediano   paso seguro (peor caso medido)
   *     flores          48,5 px           0,365°
   *     plantas        177,9 px           0,137°
   *     nudos          442,2 px           0,043°
   *
   * Un nudo arrastra TODO su tallo con las flores colgando: por eso su
   * radio es diez veces el de una cabeza de flor. Copiarle a 28-eclipse.js
   * su 0,25° le daría al nudo seis veces más paso del que tolera. */
  const LIMITE_MEDIDO = { planta: 0.137, nudo: 0.043, flor: 0.365 };

  for (const sistema of ['planta', 'nudo', 'flor']) {
    const paso = 1 / divisiones[sistema];
    comprobar('el paso de ' + sistema + ' queda bajo su límite medido',
      paso <= LIMITE_MEDIDO[sistema],
      paso.toFixed(3) + '° contra un límite de ' + LIMITE_MEDIDO[sistema] +
      '° — por encima de eso el giro salta más de medio píxel y se ve');

    comprobar('y es más grueso que el 0,01° que había',
      paso > 0.01,
      'a 0,01° el `if (giro !== ultimoGiroEscrito)` casi nunca acierta y ' +
      'se reescribe todo, todos los cuadros');
  }

  comprobar('el nudo va MÁS FINO que la flor, no al revés',
    divisiones.nudo > divisiones.flor,
    'el nudo gira con un radio diez veces mayor: si tuviera el paso de la ' +
    'flor, saltaría hasta 2,9 px por escalón');
}


/* ─── 3. LAS TANDAS: LO QUE BAJA EL PICO ───────────────────────────── */

console.log('\nLas tandas por raíz SVG\n');

/* ⛔ EL COSTO ES POR `<svg>` INVALIDADO, NO POR ESCRITURA. Medido en vivo,
 * raíces SVG ensuciadas por cuadro con scroll continuo:
 *
 *     antes (0,01°, sin tandas) ……… media 10,11  ·  peor cuadro 28
 *     solo cuantizando …………………… media  7,50  ·  peor cuadro 28
 *     cuantizando + tandas …………… media  2,00  ·  peor cuadro  4
 *
 * La cuantización sola NO baja el pico: basta con que UNA de las once
 * piezas de una planta cambie para ensuciar su raíz entera. Lo que baja el
 * pico es que no todas las plantas escriban en el mismo cuadro. */
comprobar('el salto es de cada planta, no de todas a la vez',
  /\(contadorDeCuadro \+ turnoDeLaPlanta\) % saltoDelResorte\) === 0/
    .test(marcoCodigo),
  'con `contadorDeCuadro % salto` las 26 plantas contestan lo mismo: no ' +
  'hay tres cuadros baratos, hay dos vacíos y uno con las 26 encima');

comprobar('y cada planta lleva su propio tiempo acumulado',
  /planta\.dtAcumulado = \(planta\.dtAcumulado \|\| 0\) \+ dt;/.test(marcoCodigo) &&
  !/^\s*let dtAcumulado = 0;/m.test(marcoCodigo),
  'con las tandas, dos plantas no se actualizan en el mismo cuadro: un ' +
  'acumulador compartido le daría a una el tiempo de la otra');

comprobar('y hasta calidad alta reparte',
  (() => {
    const m = marco.match(/SALTO_DEL_RESORTE_POR_CALIDAD = \{ 0: (\d+)/);
    return m && Number(m[1]) >= 2;
  })(),
  'en 1 son las 26 plantas todos los cuadros, que es el pico de 28 raíces');


/* ─── 4. Y QUE SIGA ENCENDIDO ──────────────────────────────────────── */

console.log('\nEl balanceo, encendido en todos los niveles\n');

for (const [nombre, fuente] of [['las rosas', marco], ['las joyas', joyas]]) {
  const m = fuente.match(/SE_MECE_POR_CALIDAD = \{([^}]*)\}/);
  comprobar(nombre + ' se mecen también en calidad baja',
    !!m && !/2:\s*false/.test(m[1]),
    'el guard que cuelga de esta perilla es un `return` al tope del cuadro: ' +
    'apagada, no se apaga solo el vaivén — se apagan la reacción al puntero ' +
    'y la respiración, y las piezas quedan inertes');
}


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ Las rosas y las joyas se mecen en todas las máquinas, y responden al dedo.\n');
