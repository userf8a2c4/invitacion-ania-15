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

const fisica     = sinComentarios(leer('codigo', '06-petalos-con-fisica.js'));
const eclipse    = sinComentarios(leer('codigo', '28-eclipse.js'));
/* `ladoRealDeLaFlor()` se mudó acá: la necesitan dos módulos que no se
   conocen entre sí. Ver su nota en 02-utilidades.js. */
const utilidades = sinComentarios(leer('codigo', '02-utilidades.js'));


/* ─── 1. La proporción, EJECUTADA ─────────────────────────────────── */

console.log('\nEl tamaño del pétalo, medido contra las ROSAS\n');

/* ⚡ DOS INTENTOS FALLIDOS ANTES DE ÉSTE, Y LOS DOS ENSEÑAN ALGO
 *
 * El primero eran dos juegos de tamaños y un `esPantallaChica` eligiendo:
 * dos escalones contra algo que encoge de forma continua.
 *
 * El segundo lo ató a `--marco-grosor`. Parecía correcto —es el número que
 * encoge la enredadera— pero ese `clamp(20px, 3.4vw, 72px)` TOCA SU PISO
 * en 20 px por debajo de unos 588 px de ancho, y las rosas siguen
 * encogiendo por debajo de eso. Medido en la página a 390 px, que es el
 * ancho del teléfono de Carlos:
 *
 *     grosor del marco …………………… 20 px   ← el clamp en su piso
 *     rosa del marco, mediana ……… 11,9 px
 *     pétalo de frente, mediano …… 30 px
 *     razón ………………………………………………… 2,52 ×
 *
 * La lección: si lo que hay que igualar es el tamaño de las ROSAS, hay que
 * medir las ROSAS. No un número del que se espera que las siga.
 */

comprobar('el tamaño ya no se decide en dos escalones',
  !/RASGOS_DEL_PLANO = esPantallaChica \?/.test(fisica),
  'dos escalones contra algo que encoge de forma continua deja al pétalo ' +
  'grande justo donde la rosa ya es chica');

comprobar('y ya no se ata al grosor del marco',
  !/GROSOR_DE_REFERENCIA/.test(fisica) &&
  !/grosorDelMarcoEnPixeles/.test(fisica),
  'el clamp del marco se planta en 20 px y las rosas no: por debajo de ' +
  '588 px de ancho dejaba de seguir a nada');

comprobar('se mide la flor de verdad, con la matriz de pantalla',
  /ladoRealDeLaFlor\(movil\)/.test(fisica) &&
  /function ladoRealDeLaFlor\(movil\)/.test(utilidades),
  'la caja alineada a los ejes exagera hasta un 39 % en una rosa girada');

/* ⚠️ EL PERCENTIL 90 Y NO LA MEDIANA. Lo que el ojo compara no es el
   pétalo con la rosa promedio: es el pétalo con la rosa GRANDE que tiene
   al lado, que son las del relicario y las de los ramilletes. */
comprobar('contra el percentil 90 de las rosas, no contra la mediana',
  /lados\[Math\.floor\(lados\.length \* 0\.9\)\]/.test(fisica),
  'la mediana deja al pétalo más grande que las rosas que tiene al lado');

comprobar('y los tres planos salen de la misma referencia',
  (fisica.match(/tamaño: tamañosDelPlano\('/g) || []).length === 3,
  'si uno solo escala, se rompe la separación entre planos');

/* Se EJECUTA la cuenta con los tres anchos MEDIDOS en la página viva. */
{
  const forma = (fisica.match(/const FORMA_DE_LOS_PLANOS = \{[\s\S]*?\};/) || [''])[0];
  const tope  = (fisica.match(/const EL_MAS_GRANDE_CONTRA_LA_ROSA = ([\d.]+);/) || [])[1];

  if (!forma || !tope) {
    comprobar('se puede ejecutar la cuenta del tamaño', false, 'no se encontró');
  } else {
    const FORMA = new Function(forma + '\nreturn FORMA_DE_LOS_PLANOS;')();
    const TOPE = +tope;

    /* Los tres anchos, con el p90 de las rosas medido en cada uno. */
    const MEDIDO = [
      { ancho:  390, rosaP90: 16.3, rosaMediana: 11.9 },
      { ancho:  514, rosaP90: 26.3, rosaMediana: 18.0 },
      { ancho: 1440, rosaP90: 50.0, rosaMediana: 37.6 },
    ];

    for (const m of MEDIDO) {
      const masGrande = m.rosaP90 * TOPE * FORMA.frente[1];
      const razonContraLaGrande  = masGrande / m.rosaP90;
      const razonContraLaMediana = masGrande / m.rosaMediana;

      comprobar('a ' + m.ancho + ' px el pétalo más grande no supera a la rosa grande',
        razonContraLaGrande <= 1.25,
        'dio ' + razonContraLaGrande.toFixed(2) + '× (' + masGrande.toFixed(0) + ' px)');

      comprobar('  …y contra la rosa mediana queda entre 1,0 y 1,6',
        razonContraLaMediana >= 1.0 && razonContraLaMediana <= 1.6,
        'dio ' + razonContraLaMediana.toFixed(2) + '× — a 390 px daba 2,52');
    }

    /* La profundidad no se pierde: los tres planos siguen separados. */
    comprobar('los tres planos siguen a distinta profundidad',
      FORMA.frente[1] > FORMA.medio[1] * 1.4 &&
      FORMA.medio[1] > FORMA.fondo[1] * 1.4,
      'fondo ' + FORMA.fondo[1] + ' · medio ' + FORMA.medio[1] +
      ' · frente ' + FORMA.frente[1] + ' — lo que da riqueza es la ' +
      'separación entre planos, no la cantidad');
  }
}

/* ⚠️ Y SE RECALIBRA CUANDO APARECE EL MARCO. Este módulo se evalúa al
   cargar y las plantas nacen al abrir el sobre: sin el recalibrado, el
   tamaño se quedaría para siempre en la estimación de arranque. */
comprobar('se vuelve a medir cuando el marco existe',
  /function recalibrarConLasRosas/.test(fisica) &&
  /yaSeCalibro = recalibrarConLasRosas\(\);/.test(fisica),
  'el marco nace después que esto: sin reintentar, no se mide nunca');

comprobar('y deja de preguntar en cuanto lo consigue',
  /if \(!yaSeCalibro && momentoActual - ultimoIntentoDeCalibrar > 500\)/.test(fisica),
  'un querySelectorAll por cuadro para siempre sería peor que el problema');

/* ⚠️ TOPE ABSOLUTO. El p90 es buena referencia, pero el reparto de
   tamaños de las rosas no es igual en todos los anchos: en alguno el p90
   puede quedar lejos del máximo y el pétalo más grande dominar igual.
   Carlos, después de la v278: «los pétalos gigantes aún existen». */
comprobar('ningún pétalo supera a la rosa más grande de la pantalla',
  /const laMayor = lados\[lados\.length - 1\];/.test(fisica) &&
  /ladoDeLaRosa = Math\.min\(p90, topeAbsoluto\);/.test(fisica),
  'el p90 solo no alcanza: hace falta un tope contra lo que de verdad se ve');

comprobar('reescalar no reinicia los pétalos, solo los multiplica',
  /petalo\.tamaño \*= factor;/.test(fisica),
  'volver a crearlos los teletransportaría a mitad de la lluvia');


/* ─── 2. El recorte por calidad, EJECUTADO ─────────────────────────── */

console.log('\nEl recorte por calidad, plano por plano\n');

comprobar('ya no se apaga por índice sobre el array plano',
  !/const activo = i < cuantosActivos;/.test(fisica),
  'el array se llena plano por plano: cortar por índice se come el de adelante');

{
  /* ⚠️ SE EXTRAE DESDE LA TABLA DE PRESUPUESTOS, NO SOLO LA FUNCIÓN. Los
     números del presupuesto son la mitad del comportamiento: ejecutarla
     con una tabla inventada acá comprobaría un recorte que la página no
     hace. Van los de verdad. */
  const fuente = (fisica.match(
    /const PRESUPUESTO_DE_AREA_POR_CALIDAD[\s\S]*?function ajustarCantidadDePetalos\(calidad\) \{[\s\S]*?\n  \}/) || [''])[0];

  if (!fuente) {
    comprobar('se puede ejecutar ajustarCantidadDePetalos()', false, 'no se encontró');
  } else {
    /* Los tamaños medianos de cada plano, de RASGOS_DEL_PLANO. Lo que
       cuesta pintar un pétalo es su superficie: el lado al cuadrado. */
    const LADO = { fondo: (18 + 35) / 2, medio: (30 + 54) / 2, frente: (48 + 84) / 2 };

    /* ⚠️ LA RESERVA ENTRA EN EL BANCO DE PRUEBAS, Y ES A PROPÓSITO. Todas
       las comprobaciones de presupuesto de más abajo corren AHORA con la
       reserva presente. Si la reserva se colara en `todoElArea` —que es
       relativo—, el techo crecería con ella y quedarían activos más
       pétalos que antes en todos los niveles: los números medidos de
       AREA_DE_ANTES se pondrían en rojo solos. */
    const RESERVA_RELATIVA =
      Number((fisica.match(/const RESERVA_RELATIVA = ([\d.]+);/) || [])[1]);

    /* Una sola llamada a la función real, sobre un array que ya existe.
       Hace falta para poder ajustar DOS veces los mismos pétalos y ver qué
       cambió entre una y otra. */
    const correrAjuste = (petalos, calidad, pedido) => {
      new Function('petalos', 'calidad', 'window', 'numeroAlAzar',
                   'anchoDePantalla', 'RESERVA_RELATIVA',
        fuente + '\najustarCantidadDePetalos(calidad);'
      )(petalos, calidad, { IntensidadDeLaLluvia: pedido },
        (a, b) => (a + b) / 2, 2560, RESERVA_RELATIVA);
    };

    const repartir = (reparto, calidad, pedido = 1, conReserva = true) => {
      const petalos = [];
      const nacer = (plano, deReserva) => ({
        plano, deReserva,
        activo: !deReserva,
        elemento: null,
        'tamaño': LADO[plano],
        /* `entrarPorArriba` los necesita: un pétalo que se enciende entra
           cayendo, y para eso lee la velocidad de caída de su plano. */
        rasgos: { caida: [14, 30] },
        x: 0, y: 500, velocidadX: 0, velocidadY: 0, velocidadAngular: 0,
      });

      for (const plano of Object.keys(reparto)) {
        for (let i = 0; i < reparto[plano]; i++) petalos.push(nacer(plano, false));
        if (!conReserva) continue;
        const deReserva = Math.ceil(reparto[plano] * RESERVA_RELATIVA);
        for (let i = 0; i < deReserva; i++) petalos.push(nacer(plano, true));
      }

      correrAjuste(petalos, calidad, pedido);

      const vivos = {};
      let area = 0;
      let areaBase = 0;
      for (const p of petalos) {
        if (!p.deReserva) areaBase += p['tamaño'] * p['tamaño'];
        if (!p.activo) continue;
        vivos[p.plano] = (vivos[p.plano] || 0) + 1;
        area += p['tamaño'] * p['tamaño'];
      }
      vivos.__area = area;
      /* El techo de la tabla se declara como fracción del pool BASE, así
         que para comprobarlo hay que tener el pool base a mano. */
      vivos.__areaBase = areaBase;
      vivos.__petalos = petalos;
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

    const enAlta  = repartir(GRANDE, 0);
    const enMedia = repartir(GRANDE, 1);
    const enBaja  = repartir(GRANDE, 2);
    const total = (v) => ['fondo', 'medio', 'frente']
      .reduce((a, p) => a + (v[p] || 0), 0);

    comprobar('en calidad alta están todos',
      total(enAlta) === 36, 'quedaron ' + total(enAlta));

    /* ⚡ EL PRESUPUESTO ES DE SUPERFICIE, NO DE CANTIDAD (2026-09-11)
     *
     * Es la comprobación que responde la condición que Carlos puso por
     * encima de todo: «quiero calidad, pero no a costa de la experiencia
     * misma». Un pétalo de adelante cuesta SEIS VECES lo que uno del
     * fondo, así que contar pétalos no dice nada del coste. Estos son los
     * números que pintaba el recorte por índice ORIGINAL, medidos: si esta
     * comprobación se pone en rojo, es que la escena se puso más cara. */
    const AREA_DE_ANTES = { media: 49248, baja: 16884 };

    comprobar('en calidad media NO se pinta más que antes',
      enMedia.__area <= AREA_DE_ANTES.media,
      'ahora ' + Math.round(enMedia.__area) + ' px² contra ' +
      AREA_DE_ANTES.media + ' de antes');

    comprobar('y en baja tampoco',
      enBaja.__area <= AREA_DE_ANTES.baja * 1.02,
      'ahora ' + Math.round(enBaja.__area) + ' px² contra ' +
      AREA_DE_ANTES.baja + ' de antes');

    /* ⚠️ Y EL COSTE SE MIDE EN SUPERFICIE. Una mordida cambió
       `p.tamaño * p.tamaño` por `1` —o sea, volver a contar pétalos— y
       todo lo demás seguía pasando: los presupuestos daban parecido con
       estos repartos. Lo que lo caza es una pantalla donde los planos
       tengan tamaños MUY distintos, que es justo el caso real. */
    {
      const DESPAREJO = { fondo: 20, medio: 4, frente: 4 };
      const vivos = repartir(DESPAREJO, 1);
      const areaTotal = 20 * LADO.fondo ** 2 + 4 * LADO.medio ** 2 + 4 * LADO.frente ** 2;
      comprobar('el recorte mide superficie, no cantidad de pétalos',
        vivos.__area <= areaTotal * 0.63,
        'quedó en ' + Math.round(vivos.__area) + ' px² de ' +
        Math.round(areaTotal) + ' — contando pétalos el presupuesto se ' +
        'cumple en número y se incumple en relleno');
    }

    comprobar('el recorte sigue recortando de verdad',
      enMedia.__area < enAlta.__area * 0.7 &&
      enBaja.__area < enAlta.__area * 0.3,
      'alta ' + Math.round(enAlta.__area) + ' · media ' +
      Math.round(enMedia.__area) + ' · baja ' + Math.round(enBaja.__area));

    /* Los tres planos tienen que sobrevivir: si uno se vacía, volvimos al
       problema con otra forma. */
    const proporcional = ['fondo', 'medio', 'frente'].every(
      (p) => enBaja[p] > 0 && enBaja[p] < GRANDE[p]);
    comprobar('en baja los TRES planos pierden algo, y ninguno se vacía',
      proporcional,
      'fondo ' + enBaja.fondo + ' · medio ' + enBaja.medio +
      ' · frente ' + enBaja.frente);


    /* ─── LA LLUVIA QUE ARRECIA ───────────────────────────────────────
     *
     * Carlos: «que tal si empezamos un poquito antes aumentando la
     * cantidad de pétalos que caen? unos 15 segundos antes del eclipse?».
     *
     * La reserva son pétalos que ya existen y duermen desde que carga la
     * página. Lo que se comprueba acá es lo único que puede salir mal de
     * verdad: que estando ahí, en reposo NO cambien nada.
     * ------------------------------------------------------------- */
    console.log('\nLa lluvia que arrecia\n');

    comprobar('hay una reserva declarada, y es una fracción',
      RESERVA_RELATIVA > 0 && RESERVA_RELATIVA < 2,
      'sin reserva, en calidad alta no hay ni un pétalo dormido que ' +
      'despertar: están todos activos');

    /* ⛔ LA COMPROBACIÓN QUE IMPORTA. Si la reserva entrara en el
       presupuesto, esto se pone en rojo en los tres niveles a la vez. */
    for (const [calidad, comoSeLlama] of [[0, 'alta'], [1, 'media'], [2, 'baja']]) {
      const sin = repartir(GRANDE, calidad, 1, false);
      const con = repartir(GRANDE, calidad, 1, true);
      comprobar('en reposo, la reserva no mueve calidad ' + comoSeLlama,
        total(sin) === total(con) &&
        ['fondo', 'medio', 'frente'].every((x) => (sin[x] || 0) === (con[x] || 0)),
        'sin reserva ' + total(sin) + ' pétalos, con reserva ' + total(con) +
        ' — la reserva NO entra en el presupuesto, que es relativo');
    }

    comprobar('y ningún pétalo de la reserva despierta solo',
      repartir(GRANDE, 0, 1, true).__petalos
        .filter((x) => x.deReserva && x.activo).length === 0,
      'en calidad alta el presupuesto es 1: si la reserva contara, se ' +
      'encenderían todos desde el arranque');

    /* Y que cuando se pide, sirva de algo. */
    for (const [calidad, comoSeLlama] of [[0, 'alta'], [1, 'media'], [2, 'baja']]) {
      const reposo = repartir(GRANDE, calidad, 1);
      const lluvia = repartir(GRANDE, calidad, 2);
      comprobar('pidiendo lluvia, calidad ' + comoSeLlama + ' suma pétalos',
        total(lluvia) > total(reposo),
        'de ' + total(reposo) + ' a ' + total(lluvia));
    }

    /* ⚠️ EL FRENO VIVE EN EL QUE PINTA, NO EN EL QUE PIDE. Quien pide la
       lluvia no conoce el coste de un pétalo; este archivo sí. La regla
       que ordena la tabla de techos: en su PICO, un equipo lento sigue
       pagando menos que uno medio en REPOSO. */
    {
      const picoBaja   = repartir(GRANDE, 2, 99).__area;
      const picoMedia  = repartir(GRANDE, 1, 99).__area;
      const reposoMedia = repartir(GRANDE, 1, 1).__area;
      const reposoAlta  = repartir(GRANDE, 0, 1).__area;

      comprobar('en su pico, calidad baja paga menos que media en reposo',
        picoBaja < reposoMedia,
        Math.round(picoBaja) + ' px² contra ' + Math.round(reposoMedia));

      comprobar('y media en su pico, menos que alta en reposo',
        picoMedia < reposoAlta,
        Math.round(picoMedia) + ' px² contra ' + Math.round(reposoAlta));

      /* ⛔ ESTA ASERCIÓN ESTABA ROTA, Y LA MORDIDA LO DIJO (2026-09-13)
       *
       * Decía `repartir(GRANDE, 2, 1e6).__area <= picoBaja`, con
       * `picoBaja` medido a pedido 99. Los dos lados son pedidos enormes,
       * o sea que los dos topan en el mismo lugar Y LOS DOS SE MUEVEN
       * JUNTOS: quitando el techo del código, ambos crecían igual y la
       * comprobación seguía en verde. Comparaba una cosa consigo misma.
       *
       * Lo que la ata a algo es la TABLA declarada en el código, leída del
       * archivo. Si alguien quita el `Math.min`, el área se va al
       * `presupuesto * pedido` sin freno y esto se pone rojo. */
      const TECHO_DECLARADO = new Function('return ' + (fisica.match(
        /const TECHO_DE_AREA_CON_LLUVIA_POR_CALIDAD = (\{[^}]*\});/) || [])[1])();

      for (const [calidad, comoSeLlama] of [[0, 'alta'], [1, 'media'], [2, 'baja']]) {
        const pedido = repartir(GRANDE, calidad, 1e6);
        const limite = pedido.__areaBase * TECHO_DECLARADO[calidad];
        comprobar('un pedido absurdo no pasa el techo de calidad ' + comoSeLlama,
          pedido.__area <= limite * 1.001,
          Math.round(pedido.__area) + ' px² contra un techo de ' +
          Math.round(limite) + ' (' + TECHO_DECLARADO[calidad] +
          ' del pool base) — el pedido se acota contra la tabla, no se le ' +
          'cree el número');
      }
    }

    /* ⛔ «APARECEN PÉTALOS DE LA NADA», OTRA VEZ.
     *
     * Un pétalo dormido quedó donde estaba cuando se apagó, y el bucle no
     * lo movió mientras dormía: encenderlo sin más lo hace materializarse
     * a mitad de pantalla.
     *
     * ⚠️ LA PRIMERA VERSIÓN DE ESTO NO COMPROBABA NADA, Y LA MORDIDA LO
     * DIJO. Miraba `deReserva && y >= 0` sobre UNA sola llamada en calidad
     * baja — donde la lluvia ni siquiera llega a tocar la reserva, porque
     * todavía sobran pétalos base apagados que despertar. O sea que
     * contaba cero pasara lo que pasara: apagando `entrarPorArriba` del
     * código, seguía en verde.
     *
     * Lo que hace falta son DOS llamadas sobre EL MISMO array —una en
     * reposo y otra lloviendo—, mirar quién se encendió entre medio, y
     * exigirlo de TODOS los que se encendieron, sean de la reserva o de la
     * base. Y en calidad alta, que es donde la reserva sí entra. */
    for (const [calidad, comoSeLlama] of [[0, 'alta'], [2, 'baja']]) {
      const enReposo = repartir(GRANDE, calidad, 1);
      const todos = enReposo.__petalos;

      /* Todos a mitad de pantalla, incluidos los que duermen: si alguno se
         enciende sin entrar cayendo, se lo va a ver acá. */
      const dormian = new Set();
      for (const x of todos) {
        x.y = 500;
        if (!x.activo) dormian.add(x);
      }

      correrAjuste(todos, calidad, 2);

      const despertaron = todos.filter((x) => x.activo && dormian.has(x));
      const aparecidos = despertaron.filter((x) => x.y >= 0);

      comprobar('en calidad ' + comoSeLlama +
                ', los que despiertan entran cayendo',
        despertaron.length > 0 && aparecidos.length === 0,
        despertaron.length === 0
          ? 'no despertó ninguno: la comprobación no estaría comprobando nada'
          : aparecidos.length + ' de ' + despertaron.length +
            ' se encendieron dentro de la pantalla en vez de arriba del borde');
    }
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
