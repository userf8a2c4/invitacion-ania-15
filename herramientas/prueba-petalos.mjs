/* ══════════════════════════════════════════════════════════════════════
   PRUEBA-PETALOS.MJS · que el pétalo se vea del tamaño que le toca

   QUÉ CUIDA
   Dos defectos que se reportaron mirando la página, los dos silenciosos
   —el código funcionaba perfecto en los dos casos— y los dos medidos en
   vivo antes de tocar nada:

   1. LA PROPORCIÓN. El tamaño del pétalo estaba en píxeles fijos con un
      único escalón para «pantalla chica», mientras la enredadera encoge de
      forma continua con `--marco-grosor`. Medido con la página abierta:

          ancho    marco    rosa (mediana)   pétalo de frente   razón
          1440 px   49 px        37,6 px          73 px          1,94
           514 px   20 px        13,4 px          34 px          2,53

      El pétalo terminaba siendo el doble o el triple de la flor de al lado.

   2. EL PLANO DE ADELANTE. El recorte por calidad apagaba pétalos por
      índice sobre un array que se llena plano por plano, así que los
      últimos índices —los del plano de adelante, los grandes— eran siempre
      los primeros en caer. En calidad media se perdían 4 de 6; en baja, los
      6. Al cargar se veía: la calidad arranca en alta, están todos, y un
      instante después desaparecen.

   CÓMO SE CORRE
       node herramientas/prueba-petalos.mjs
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

/* Igual que en prueba-eclipse.mjs: este archivo comprueba AUSENCIAS, y los
   comentarios explican largamente lo que ya no está. */
const sinComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const fisica  = sinComentarios(leer('codigo', '06-petalos-con-fisica.js'));
const eclipse = sinComentarios(leer('codigo', '28-eclipse.js'));


/* ─── 1. La proporción, EJECUTADA ─────────────────────────────────── */

console.log('\nEl tamaño del pétalo, ejecutando la cuenta\n');

comprobar('el tamaño ya no se decide en dos escalones',
  !/RASGOS_DEL_PLANO = esPantallaChica \?/.test(fisica),
  'dos escalones contra algo que encoge de forma continua deja al pétalo ' +
  'grande justo donde la rosa ya es chica');

comprobar('se ata al grosor real del marco, medido al navegador',
  /function grosorDelMarcoEnPixeles/.test(fisica) &&
  /width:var\(--marco-grosor\)/.test(fisica),
  'el valor de un clamp() no se puede leer de la hoja: hay que preguntarlo');

comprobar('y los tres planos escalan con el mismo factor',
  (fisica.match(/tamaño: aEscala\(/g) || []).length === 3,
  'si uno solo escala, se rompe la separación entre planos');

{
  /* ⚠️ EL EXTRACTOR NO PIDE LOS NÚMEROS. La primera versión buscaba
     `0.34, 1.15` literalmente, así que cambiar cualquiera de los dos topes
     —justo lo que estas comprobaciones existen para cazar— hacía fallar la
     EXTRACCIÓN en vez de la comprobación. La prueba moría, sí, pero
     diciendo «no se encontró la cuenta» en lugar de «el pétalo no encoge».
     Una prueba que muerde por el motivo equivocado no enseña nada. */
  const fuente = (fisica.match(
    /const proporcion = limitar\([\s\S]*?\n\s*[\d.]+, [\d.]+\);/) || [''])[0];

  if (!fuente) {
    comprobar('se puede ejecutar la proporción', false, 'no se encontró la cuenta');
  } else {
    const proporcionDe = (grosor, ancho) => new Function(
      'limitar', 'grosorAhora', 'window', 'GROSOR_DE_REFERENCIA',
      'let proporcion;' + fuente.replace('const proporcion', 'proporcion') +
      '\nreturn proporcion;'
    )(
      (v, a, b) => Math.min(Math.max(v, a), b),
      grosor, { innerWidth: ancho }, 49
    );

    /* Los dos anchos medidos en vivo. La razón pétalo/rosa de escritorio
       —1,94— es la que estaba aprobada; la de pantalla chica tiene que
       quedar en ese mismo número, no en 2,53. */
    const enEscritorio = proporcionDe(49, 1440);
    const enChica      = proporcionDe(20, 514);

    comprobar('en escritorio no cambia nada',
      Math.abs(enEscritorio - 1) < 0.001, 'dio ' + enEscritorio.toFixed(3));

    comprobar('en pantalla chica encoge de verdad',
      enChica > 0.38 && enChica < 0.45, 'dio ' + enChica.toFixed(3));

    /* La comprobación que de verdad importa: la RAZÓN con la rosa. Se usan
       las medianas medidas en la página viva. */
    const petaloEscritorio = 73;                 // medido
    const rosaEscritorio   = 37.6;               // medido
    const rosaChica        = 13.4;               // medido
    const razonAprobada    = petaloEscritorio / rosaEscritorio;   // 1,94

    /* El pétalo de frente mediano sale del rango [48, 84] escalado. */
    const petaloChico = ((48 + 84) / 2) * enChica;
    const razonChica  = petaloChico / rosaChica;

    comprobar('el pétalo mide lo mismo respecto de la rosa en las dos pantallas',
      Math.abs(razonChica - razonAprobada) < 0.25,
      'escritorio ' + razonAprobada.toFixed(2) + '× · chica ' +
      razonChica.toFixed(2) + '× (antes era 2,53×)');

    comprobar('y en un monitor enorme el pétalo no sigue creciendo sin freno',
      proporcionDe(72, 2560) <= 1.15,
      'dio ' + proporcionDe(72, 2560).toFixed(3));

    comprobar('sin el marco, el respaldo sale del ancho y no de un número fijo',
      Math.abs(proporcionDe(0, 514) - proporcionDe(20, 514)) < 0.001,
      'el clamp del marco es 3.4vw entre 20 y 72: el respaldo lo repite');
  }
}


/* ─── 2. El recorte por calidad, EJECUTADO ─────────────────────────── */

console.log('\nEl recorte por calidad, plano por plano\n');

comprobar('ya no se apaga por índice sobre el array plano',
  !/const activo = i < cuantosActivos;/.test(fisica),
  'el array se llena plano por plano: cortar por índice se come el de adelante');

{
  const fuente = (fisica.match(
    /function ajustarCantidadDePetalos\(calidad\) \{[\s\S]*?\n  \}/) || [''])[0];

  if (!fuente) {
    comprobar('se puede ejecutar ajustarCantidadDePetalos()', false, 'no se encontró');
  } else {
    const repartir = (reparto, calidad) => {
      const petalos = [];
      for (const plano of Object.keys(reparto)) {
        for (let i = 0; i < reparto[plano]; i++) {
          petalos.push({ plano, activo: true, elemento: null });
        }
      }

      new Function('FRACCION_ACTIVA_POR_CALIDAD', 'petalos', 'calidad',
        fuente + '\najustarCantidadDePetalos(calidad);'
      )({ 0: 1, 1: 0.78, 2: 0.5 }, petalos, calidad);

      const vivos = {};
      for (const p of petalos) if (p.activo) vivos[p.plano] = (vivos[p.plano] || 0) + 1;
      return vivos;
    };

    const CHICA = { fondo: 8,  medio: 5,  frente: 6  };
    const GRANDE = { fondo: 14, medio: 10, frente: 12 };

    for (const [nombre, reparto] of [['pantalla chica', CHICA], ['escritorio', GRANDE]]) {
      for (const [calidad, comoSeLlama] of [[1, 'media'], [2, 'baja']]) {
        const vivos = repartir(reparto, calidad);
        comprobar('en ' + nombre + ', calidad ' + comoSeLlama +
                  ': el plano de adelante sobrevive',
          (vivos.frente || 0) > 0,
          'quedaron ' + (vivos.frente || 0) + ' de ' + reparto.frente +
          ' — con el recorte por índice quedaban ' +
          (calidad === 2 ? '0' : 'casi ninguno'));
      }
    }

    /* Y que siga AHORRANDO: el recorte tiene que seguir recortando, o se
       arregló la estética rompiendo el rendimiento. */
    const enAlta  = repartir(GRANDE, 0);
    const enMedia = repartir(GRANDE, 1);
    const enBaja  = repartir(GRANDE, 2);
    const total = (v) => Object.values(v).reduce((a, b) => a + b, 0);

    comprobar('en calidad alta están todos',
      total(enAlta) === 36, 'quedaron ' + total(enAlta));
    comprobar('en media se mueven bastantes menos',
      total(enMedia) < 32 && total(enMedia) >= 26, 'quedaron ' + total(enMedia));
    comprobar('y en baja, la mitad',
      total(enBaja) <= 20, 'quedaron ' + total(enBaja));

    /* Los tres planos tienen que perder algo: si uno queda intacto y otro
       se vacía, volvimos al problema con otra forma. */
    const proporcional = ['fondo', 'medio', 'frente'].every(
      (p) => enBaja[p] > 0 && enBaja[p] < GRANDE[p]);
    comprobar('en baja los TRES planos pierden algo, y ninguno se vacía',
      proporcional,
      'fondo ' + enBaja.fondo + ' · medio ' + enBaja.medio +
      ' · frente ' + enBaja.frente);
  }
}


/* ─── 3. Los pétalos del eclipse ───────────────────────────────────── */

console.log('\nLos pétalos del eclipse\n');

comprobar('ya no usan un tamaño en píxeles fijos',
  !/tam: 9 \+ Math\.random\(\) \* 13/.test(eclipse),
  '18 a 44 px iguales en todas las pantallas, al lado de rosas de 13 px');

comprobar('heredan el tamaño de los pétalos de la invitación',
  /function tamanoDeUnPetalo/.test(eclipse) &&
  /window\.LienzoDePetalos && window\.LienzoDePetalos\.planos/.test(eclipse),
  'el eclipse ya usa sus DIBUJOS; con más razón sus tamaños, que 06 ya ' +
  'calcula en proporción al marco');

comprobar('y tienen respaldo proporcional si ese módulo no está',
  /var escala = limitar\(grosor \/ 49, 0\.34, 1\.15\);/.test(eclipse),
  'sin respaldo proporcional se vuelve al número fijo por la puerta de atrás');


console.log('');
if (fallos) {
  console.log('✗ ' + fallos + ' comprobación(es) fallaron.\n');
  process.exit(1);
}
console.log('✓ El pétalo se ve del tamaño que le toca, en cualquier pantalla y en cualquier calidad.\n');
