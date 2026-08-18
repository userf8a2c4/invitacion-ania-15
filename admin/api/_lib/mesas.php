<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/MESAS.PHP · EL MOTOR QUE SIENTA A LA GENTE

   QUÉ HACE ESTE ARCHIVO
   Decide quién se sienta en qué mesa, respetando las reglas que puso la
   organizadora.

   LAS REGLAS, EN ORDEN DE IMPORTANCIA
     1. Lo FIJADO a mano no se toca jamás. Si alguien acomodó algo con un
        motivo que la computadora no conoce, la computadora se calla.
     2. Nadie se sienta con alguien con quien está peleado.
     3. Los del mismo grupo van juntos: familias enteras, amigos con
        amigos. Es la regla que más se nota en una fiesta.
     4. No se pasa de la capacidad de la mesa.
     5. Entre las mesas que sirven, se elige la que deje menos lugares
        sueltos, para no terminar con ocho mesas a medio llenar.

   POR QUÉ EL ALGORITMO ES "GOLOSO" Y NO BUSCA LA SOLUCIÓN PERFECTA
   Sentar gente con restricciones es un problema que, resuelto a la
   perfección, tarda más cuanta más gente hay — con 150 invitados una
   búsqueda exhaustiva no termina nunca. Este método coloca primero lo
   difícil (los grupos grandes) y después lo fácil, que es exactamente
   como lo haría una persona con las tarjetitas sobre la mesa. Da un
   resultado bueno en milisegundos, y lo que no le guste se corrige a
   mano y queda fijado.

   FASE 9 · REGLAS POR PERSONA, NO SOLO POR FAMILIA
   Hasta acá, quien se sentaba era SIEMPRE la confirmación entera (la
   familia, en bloque). Ahora una persona puntual (un `acompanante`)
   puede tener su PROPIA fila en `acompanante_reglas` — eso la saca del
   bloque de su familia y la convierte en su propia "unidad" para
   sentar, con su propio grupo o mesa preferida. El resto de su familia
   sigue moviéndose junto, con un lugar menos por cada persona que se
   sacó.

   Por eso de acá en más una "unidad para sentar" puede ser de dos
   tipos, y las funciones de este archivo hablan de "unidades", no ya
   de "invitados": una CONFIRMACIÓN (una familia, o lo que queda de
   ella) o un ACOMPAÑANTE suelto. Cada una tiene una CLAVE compuesta
   ('c5' o 'a12') para no confundir un id de confirmación con uno de
   acompañante — son espacios de ids completamente distintos y un '5'
   de cada uno no tiene nada que ver con el otro.

   ⚠️ LÍMITE A PROPÓSITO: una incompatibilidad puesta entre dos personas
   puntuales (acompanante_a + acompanante_b) solo se hace cumplir cuando
   LAS DOS están sacadas de su familia (las dos tienen fila en
   acompanante_reglas). Si alguna sigue viajando con su familia, la
   regla queda guardada pero todavía no actúa — resolver eso en
   general (bloquear a la FAMILIA entera por la pelea de un solo
   integrante) es un paso más que se puede sumar después; mientras
   tanto es mejor que una regla no actúe todavía a que actúe mal.

   ÍNDICE
     1. Juntar los datos
     2. Las reglas
     3. Repartir
     4. Sentar a uno solo
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';


/* ─── 1. JUNTAR LOS DATOS ─────────────────────────────────────────────── */

/**
 * La clave compuesta de una unidad: 'c5' (confirmación 5) o 'a12'
 * (acompañante 12). Los dos espacios de ids son independientes — sin
 * esto, una confirmación 5 y un acompañante 5 se pisarían en cualquier
 * mapa indexado por id crudo.
 *
 * @param string $tipo 'confirmacion' | 'acompanante'
 * @param int    $id
 * @return string
 */
function claveDeUnidad($tipo, $id) {
    return ($tipo === 'acompanante' ? 'a' : 'c') . (int) $id;
}

/**
 * Trae todo lo que hace falta para repartir: mesas, unidades para
 * sentar (confirmaciones y acompañantes sueltos) y reglas.
 *
 * @return array
 */
function panoramaDeMesas() {
    /* Se ordena en PHP y no en SQL porque strnatcasecmp entiende los
       números dentro del texto: pone "Mesa 2" antes que "Mesa 10", que
       es lo que uno espera. El ORDER BY de MySQL lo haría al revés,
       comparando letra por letra. */
    $mesas = existeTabla('mesas') ? consultarTodo('SELECT * FROM mesas') : [];

    /* Primero las MEJORES mesas, después las peores; a igualdad, por
       nombre natural ("Mesa 2" antes que "Mesa 10", que es lo que uno
       espera y lo que el ORDER BY de MySQL haría al revés).

       ⚠️ EL ORDEN DE ESTA LISTA NO ES COSMÉTICO. mejorMesaPara() la
       recorre en este orden y, a igualdad de lugares sobrantes, se queda
       con la primera. O sea que esto es lo que decide qué significa "la
       mejor mesa" cuando un grupo de orden bajo elige.

       Antes se ordenaba SOLO por nombre, así que la promesa de que "los
       grupos de orden más bajo se quedan con las mejores mesas" se
       cumplía dándoles la que se llamaba Mesa 1 — que puede estar en el
       fondo, al lado del baño. */
    usort($mesas, function ($a, $b) {
        $pa = (int) ($a['prioridad'] ?? 50);
        $pb = (int) ($b['prioridad'] ?? 50);
        if ($pa !== $pb) return $pa - $pb;
        return strnatcasecmp($a['nombre'], $b['nombre']);
    });

    /* ─── Personas sacadas de su familia (Fase 9) ────────────────────── */

    /* $sueltosPorFamilia: confirmacion_id => cuántos de sus integrantes
       se sacaron (para restarle esa cantidad de lugares al bloque de la
       familia). $idsSueltos: acompanante_id => true, para no volver a
       agregar a esa persona como parte del bloque familiar más abajo. */
    $sueltosPorFamilia = [];
    $idsSueltos = [];
    $unidades   = [];

    if (existeTabla('acompanante_reglas') && existeTabla('acompanantes')) {
        $filas = consultarTodo(
            'SELECT a.id, a.nombre, a.confirmacion_id,
                    r.grupo_id, r.mesa_preferida,
                    g.nombre AS grupo_nombre, g.orden AS grupo_orden,
                    am.mesa_id, am.fijada
             FROM acompanante_reglas r
             JOIN acompanantes a    ON a.id = r.acompanante_id
             JOIN confirmaciones c  ON c.id = a.confirmacion_id AND c.asiste = 1
             LEFT JOIN grupos_invitados g          ON g.id = r.grupo_id
             LEFT JOIN asignacion_mesas_persona am ON am.acompanante_id = a.id'
        );

        foreach ($filas as $f) {
            $confId = (int) $f['confirmacion_id'];
            $idsSueltos[(int) $f['id']] = true;
            $sueltosPorFamilia[$confId] = ($sueltosPorFamilia[$confId] ?? 0) + 1;

            $unidades[] = [
                'tipo'               => 'acompanante',
                'id'                 => (int) $f['id'],
                'nombre'             => $f['nombre'],
                'lugares_necesarios' => 1,
                'grupo_id'           => $f['grupo_id'] ? (int) $f['grupo_id'] : null,
                'grupo_nombre'       => $f['grupo_nombre'],
                'grupo_orden'        => (int) ($f['grupo_orden'] ?? 50),
                'mesa_preferida'     => $f['mesa_preferida'] ? (int) $f['mesa_preferida'] : null,
                'mesa_id'            => $f['mesa_id'] ? (int) $f['mesa_id'] : null,
                'fijada'             => (int) ($f['fijada'] ?? 0),
            ];
        }
    }

    /* Mapa de CADA acompañante a su familia, tenga o no fila propia en
       acompanante_reglas — hace falta para poder resolver las
       incompatibilidades individuales más abajo (indiceDePeleas). */
    $familiaDeAcompanante = [];
    if (existeTabla('acompanantes')) {
        foreach (consultarTodo('SELECT id, confirmacion_id FROM acompanantes') as $a) {
            $familiaDeAcompanante[(int) $a['id']] = (int) $a['confirmacion_id'];
        }
    }

    /* ─── Las familias (confirmaciones), con lugares sueltos restados ── */

    if (existeTabla('confirmaciones')) {
        $filas = consultarTodo(
            'SELECT c.id, c.nombre, c.adultos, c.ninos,
                    p.grupo_id, p.sillas_extra, p.mesa_preferida, p.notas AS nota_mesa,
                    g.nombre AS grupo_nombre, g.orden AS grupo_orden,
                    a.mesa_id, a.fijada
             FROM confirmaciones c
             LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
             LEFT JOIN grupos_invitados g      ON g.id = p.grupo_id
             LEFT JOIN asignacion_mesas a      ON a.confirmacion_id = c.id
             WHERE c.asiste = 1
             ORDER BY c.nombre'
        );

        foreach ($filas as $fila) {
            $confId  = (int) $fila['id'];
            $sacados = $sueltosPorFamilia[$confId] ?? 0;

            $gente   = (int) $fila['adultos'] + (int) $fila['ninos'];
            $extra   = (int) ($fila['sillas_extra'] ?? 0);
            $lugares = max(0, $gente + $extra - $sacados);

            /* Si se sacó a TODA la familia (el caso típico: una
               confirmación de una sola persona con su propia regla), no
               queda nada del bloque familiar que sentar aparte. */
            if ($lugares <= 0) continue;

            $unidades[] = [
                'tipo'               => 'confirmacion',
                'id'                 => $confId,
                'nombre'             => $fila['nombre'],
                'lugares_necesarios' => $lugares,
                'grupo_id'           => $fila['grupo_id'] ? (int) $fila['grupo_id'] : null,
                'grupo_nombre'       => $fila['grupo_nombre'],
                'grupo_orden'        => (int) ($fila['grupo_orden'] ?? 50),
                'mesa_preferida'     => $fila['mesa_preferida'] ? (int) $fila['mesa_preferida'] : null,
                'mesa_id'            => $fila['mesa_id'] ? (int) $fila['mesa_id'] : null,
                'fijada'             => (int) ($fila['fijada'] ?? 0),
            ];
        }
    }

    $grupos = existeTabla('grupos_invitados')
        ? consultarTodo('SELECT * FROM grupos_invitados ORDER BY orden, nombre')
        : [];

    $peleas = existeTabla('incompatibilidades')
        ? consultarTodo('SELECT * FROM incompatibilidades')
        : [];

    return [
        'mesas'                 => $mesas,
        'invitados'             => $unidades,
        'grupos'                => $grupos,
        'peleas'                => $peleas,
        'ids_sueltos'           => $idsSueltos,
        'familia_de_acompanante'=> $familiaDeAcompanante,
    ];
}

/**
 * Cuántas sillas necesita una confirmación (la familia completa, sin
 * restar a nadie que se haya sacado — eso lo resuelve panoramaDeMesas()
 * porque hace falta saber cuántos se sacaron, algo que esta función por
 * sí sola no puede calcular). La siguen usando mesas.php y
 * guardarPlanDeMesas() para el caso simple, más común: cuando nadie de
 * esa familia tiene reglas propias, esto ES el total real.
 *
 * @param array $invitado
 * @return int Nunca menos de 1: si confirmó, ocupa aunque sea una silla.
 */
function lugaresQueOcupa($invitado) {
    $gente = (int) ($invitado['adultos'] ?? 0) + (int) ($invitado['ninos'] ?? 0);
    $extra = (int) ($invitado['sillas_extra'] ?? 0);
    return max(1, $gente + $extra);
}


/* ─── 2. LAS REGLAS ───────────────────────────────────────────────────── */

/**
 * Arma un índice rápido de quién no se banca a quién, ya resuelto a
 * CLAVES de unidad ('c5', 'a12') en vez de ids crudos.
 *
 * Cada fila de `incompatibilidades` puede ser:
 *   · Entre dos FAMILIAS (invitado_a/invitado_b con los ids de
 *     confirmación de siempre) — se traduce a 'c<id>' de cada lado.
 *   · Entre dos PERSONAS puntuales (acompanante_a/acompanante_b) —
 *     ⚠️ SOLO se hace cumplir si LAS DOS tienen su propia unidad hoy
 *     (están sacadas de su familia, ver la nota del encabezado del
 *     archivo). Si alguna sigue en el bloque familiar, esa fila se
 *     salta sin romper nada — la regla queda guardada en la base para
 *     el día que esa persona también se saque.
 *
 * @param array $peleas   Filas crudas de `incompatibilidades`.
 * @param array $idsSueltos acompanante_id => true (de panoramaDeMesas()).
 * @return array clave => [otras claves]
 */
function indiceDePeleas($peleas, $idsSueltos = []) {
    $indice = [];

    $anotar = function ($claveA, $claveB) use (&$indice) {
        if (!isset($indice[$claveA])) $indice[$claveA] = [];
        if (!isset($indice[$claveB])) $indice[$claveB] = [];
        $indice[$claveA][] = $claveB;
        $indice[$claveB][] = $claveA;
    };

    foreach ($peleas as $pelea) {
        $acompA = (int) ($pelea['acompanante_a'] ?? 0);
        $acompB = (int) ($pelea['acompanante_b'] ?? 0);

        if ($acompA > 0 && $acompB > 0) {
            if (!isset($idsSueltos[$acompA]) || !isset($idsSueltos[$acompB])) {
                continue;   // Todavía no están las dos sacadas: regla dormida.
            }
            $anotar(claveDeUnidad('acompanante', $acompA), claveDeUnidad('acompanante', $acompB));
            continue;
        }

        $a = (int) $pelea['invitado_a'];
        $b = (int) $pelea['invitado_b'];
        $anotar(claveDeUnidad('confirmacion', $a), claveDeUnidad('confirmacion', $b));
    }

    return $indice;
}

/**
 * Dice si una unidad puede sentarse en una mesa donde ya hay otras.
 *
 * @param string $clave      La de quien se quiere sentar.
 * @param array  $yaSentados Claves de los que están en esa mesa.
 * @param array  $peleas     El índice de indiceDePeleas().
 * @return bool
 */
function seLlevaBienCon($clave, $yaSentados, $peleas) {
    if (empty($peleas[$clave])) return true;

    foreach ($yaSentados as $otra) {
        if (in_array($otra, $peleas[$clave], true)) return false;
    }
    return true;
}


/* ─── 3. REPARTIR ─────────────────────────────────────────────────────── */

/**
 * Reparte a todos en las mesas.
 *
 * NO escribe en la base: devuelve el plan. Quien lo llama decide si lo
 * guarda. Eso permite mostrar una vista previa antes de aplicar nada.
 *
 * @param bool $respetarFijados Si false, reacomoda TODO desde cero.
 * @return array
 */
function repartirEnMesas($respetarFijados = true) {
    $datos  = panoramaDeMesas();
    $mesas  = $datos['mesas'];
    $peleas = indiceDePeleas($datos['peleas'], $datos['ids_sueltos']);

    if (empty($mesas)) {
        return ['ok' => false, 'error' => 'Todavía no hay mesas creadas.'];
    }

    /* El estado de cada mesa mientras se reparte: cuánto lugar queda y
       quiénes están sentados (para poder comprobar las peleas). */
    $estado = [];
    foreach ($mesas as $mesa) {
        $estado[$mesa['id']] = [
            'id'        => (int) $mesa['id'],
            'nombre'    => $mesa['nombre'],
            'capacidad' => (int) $mesa['capacidad'],
            'libres'    => (int) $mesa['capacidad'],
            'sentados'  => [],
        ];
    }

    $plan       = [];   // lista de ['tipo','id','mesa_id']
    $sinLugar   = [];
    $porResolver = [];

    /* ─── Primero, lo intocable ────────────────────────────────────── */
    foreach ($datos['invitados'] as $unidad) {
        $clave   = claveDeUnidad($unidad['tipo'], $unidad['id']);
        $lugares = $unidad['lugares_necesarios'];

        $fijado = $respetarFijados
               && !empty($unidad['mesa_id'])
               && (int) $unidad['fijada'] === 1;

        // Una mesa preferida vale tanto como una asignación fijada.
        $preferida = !empty($unidad['mesa_preferida']) ? (int) $unidad['mesa_preferida'] : 0;

        $mesaForzada = $fijado ? (int) $unidad['mesa_id'] : $preferida;

        if ($mesaForzada && isset($estado[$mesaForzada])) {
            $estado[$mesaForzada]['libres'] -= $lugares;
            $estado[$mesaForzada]['sentados'][] = $clave;
            $plan[] = ['tipo' => $unidad['tipo'], 'id' => $unidad['id'], 'mesa_id' => $mesaForzada];
            continue;
        }

        $porResolver[] = $unidad;
    }

    /* ─── Después, por grupos ──────────────────────────────────────── */

    /* Se juntan por grupo y se ordena: primero los grupos con más gente,
       porque son los más difíciles de ubicar. Dejarlos para el final
       garantiza que no entren en ningún lado. */
    $porGrupo = [];
    foreach ($porResolver as $unidad) {
        // Los que no tienen grupo van cada uno por su cuenta.
        $claveGrupo = !empty($unidad['grupo_id'])
               ? 'g' . $unidad['grupo_id']
               : 'solo' . claveDeUnidad($unidad['tipo'], $unidad['id']);

        if (!isset($porGrupo[$claveGrupo])) {
            $porGrupo[$claveGrupo] = [
                'orden'     => (int) ($unidad['grupo_orden'] ?? 50),
                'gente'     => 0,
                'invitados' => [],
            ];
        }
        $porGrupo[$claveGrupo]['gente'] += $unidad['lugares_necesarios'];
        $porGrupo[$claveGrupo]['invitados'][] = $unidad;
    }

    uasort($porGrupo, function ($a, $b) {
        // Primero el orden que puso la organizadora; a igualdad, el
        // grupo más grande.
        if ($a['orden'] !== $b['orden']) return $a['orden'] - $b['orden'];
        return $b['gente'] - $a['gente'];
    });

    foreach ($porGrupo as $grupo) {

        /* Se intenta meter al grupo ENTERO en una sola mesa. Si no
           entra, se lo parte y cada parte busca lugar por su cuenta,
           pero prefiriendo mesas donde ya haya gente del mismo grupo. */
        $mesaDelGrupo = mejorMesaPara($grupo['gente'], $grupo['invitados'], $estado, $peleas);

        foreach ($grupo['invitados'] as $unidad) {
            $clave   = claveDeUnidad($unidad['tipo'], $unidad['id']);
            $lugares = $unidad['lugares_necesarios'];

            $destino = 0;

            // ¿Sigue entrando en la mesa que se eligió para el grupo?
            if ($mesaDelGrupo
                && $estado[$mesaDelGrupo]['libres'] >= $lugares
                && seLlevaBienCon($clave, $estado[$mesaDelGrupo]['sentados'], $peleas)) {
                $destino = $mesaDelGrupo;
            } else {
                $destino = mejorMesaPara($lugares, [$unidad], $estado, $peleas);
            }

            if (!$destino) {
                $sinLugar[] = [
                    'id'      => $unidad['id'],
                    'tipo'    => $unidad['tipo'],
                    'nombre'  => $unidad['nombre'],
                    'lugares' => $lugares,
                ];
                continue;
            }

            $estado[$destino]['libres'] -= $lugares;
            $estado[$destino]['sentados'][] = $clave;
            $plan[] = ['tipo' => $unidad['tipo'], 'id' => $unidad['id'], 'mesa_id' => $destino];
        }
    }

    return [
        'ok'        => true,
        'plan'      => $plan,
        'sin_lugar' => $sinLugar,
        'mesas'     => array_values($estado),
        // Qué se va a MOVER de donde está hoy. Ver la función de abajo.
        'movimientos' => movimientosDelPlan($plan, $datos['invitados'], $mesas),
    ];
}

/**
 * Compara un plan contra el acomodo de ahora y dice qué cambiaría.
 *
 * POR QUÉ ESTO ES LA MITAD DEL BOTÓN "ACOMODAR SOLO"
 * La vista previa avisaba cuántos quedaban sin lugar, pero no que Juan
 * pasa de la Mesa 3 a la Mesa 5. Y ese es justo el dato que uno necesita
 * para animarse a tocar el botón: no "cuántos entran" sino "qué se me va
 * a desarmar de lo que ya tenía".
 *
 * @param array $plan       Lista de ['tipo','id','mesa_id'].
 * @param array $unidades   Con su mesa_id actual.
 * @param array $mesas      Para poder poner los nombres.
 * @return array
 */
function movimientosDelPlan($plan, $unidades, $mesas) {
    $comoSeLlama = [];
    foreach ($mesas as $m) $comoSeLlama[(int) $m['id']] = $m['nombre'];

    $mesaEnElPlan = [];
    foreach ($plan as $entrada) {
        $mesaEnElPlan[claveDeUnidad($entrada['tipo'], $entrada['id'])] = (int) $entrada['mesa_id'];
    }

    $movimientos = [];

    foreach ($unidades as $unidad) {
        $clave  = claveDeUnidad($unidad['tipo'], $unidad['id']);
        $antes  = (int) ($unidad['mesa_id'] ?? 0);
        $ahora  = (int) ($mesaEnElPlan[$clave] ?? 0);

        // Se queda donde estaba: no hay nada que contar.
        if ($antes === $ahora) continue;

        $movimientos[] = [
            'nombre'     => $unidad['nombre'],
            'de'         => $antes ? ($comoSeLlama[$antes] ?? 'otra mesa') : '',
            'a'          => $ahora ? ($comoSeLlama[$ahora] ?? 'otra mesa') : '',
            /* Tres formas distintas de cambiar, y no dan la misma
               tranquilidad: sentar a alguien que estaba suelto es
               ganancia pura; sacarlo de una mesa es lo que hay que
               mirar dos veces. */
            'que_pasa'   => !$antes ? 'se_sienta' : (!$ahora ? 'se_levanta' : 'se_muda'),
        ];
    }

    return $movimientos;
}

/**
 * Elige la mejor mesa para un grupo de gente.
 *
 * "Mejor" es la que deja MENOS lugares sueltos. Sin ese criterio, el
 * reparto va llenando la primera mesa que encuentra y termina con ocho
 * mesas a medio ocupar, que en un salón se ve vacío y desangelado.
 *
 * @param int   $lugares  Cuántas sillas hacen falta.
 * @param array $quienes  Las unidades (para comprobar peleas).
 * @param array $estado   El estado de las mesas.
 * @param array $peleas
 * @return int El id de la mesa, o 0 si no entra en ninguna.
 */
function mejorMesaPara($lugares, $quienes, $estado, $peleas) {
    $mejor = 0;
    $sobraMenos = PHP_INT_MAX;

    foreach ($estado as $mesa) {
        if ($mesa['libres'] < $lugares) continue;

        // Que ninguno de los que van a entrar esté peleado con los que ya están.
        $seLlevanTodos = true;
        foreach ($quienes as $quien) {
            $claveQuien = claveDeUnidad($quien['tipo'], $quien['id']);
            if (!seLlevaBienCon($claveQuien, $mesa['sentados'], $peleas)) {
                $seLlevanTodos = false;
                break;
            }
        }
        if (!$seLlevanTodos) continue;

        $sobra = $mesa['libres'] - $lugares;
        if ($sobra < $sobraMenos) {
            $sobraMenos = $sobra;
            $mejor = $mesa['id'];
        }
    }

    return $mejor;
}

/**
 * Guarda un plan en la base de datos: las unidades tipo 'confirmacion'
 * en `asignacion_mesas`, las tipo 'acompanante' en
 * `asignacion_mesas_persona` — dos tablas separadas, ver la nota de
 * Fase 9 en migracion.sql.
 *
 * @param array $plan  Lista de ['tipo','id','mesa_id'].
 * @param bool  $respetarFijados
 * @return int Cuántos se sentaron.
 */
function guardarPlanDeMesas($plan, $respetarFijados = true) {
    bd()->beginTransaction();

    try {
        if ($respetarFijados) {
            ejecutar('DELETE FROM asignacion_mesas WHERE fijada = 0');
            if (existeTabla('asignacion_mesas_persona')) {
                ejecutar('DELETE FROM asignacion_mesas_persona WHERE fijada = 0');
            }
        } else {
            ejecutar('DELETE FROM asignacion_mesas');
            if (existeTabla('asignacion_mesas_persona')) {
                ejecutar('DELETE FROM asignacion_mesas_persona');
            }
        }

        $cuantos = 0;

        foreach ($plan as $entrada) {
            $tipo   = $entrada['tipo'];
            $id     = (int) $entrada['id'];
            $mesaId = (int) $entrada['mesa_id'];

            if ($tipo === 'acompanante') {
                $yaEsta = consultarUno(
                    'SELECT id FROM asignacion_mesas_persona WHERE acompanante_id = :a',
                    [':a' => $id]
                );
                if ($yaEsta) { $cuantos++; continue; }

                insertar('asignacion_mesas_persona', [
                    'acompanante_id' => $id,
                    'mesa_id'        => $mesaId,
                    'fijada'         => 0,
                ]);
                $cuantos++;
                continue;
            }

            // Las fijadas ya están en la base: no se vuelven a escribir.
            $yaEsta = consultarUno(
                'SELECT id FROM asignacion_mesas WHERE confirmacion_id = :c',
                [':c' => $id]
            );
            if ($yaEsta) { $cuantos++; continue; }

            $gente = consultarUno(
                'SELECT c.adultos, c.ninos, p.sillas_extra
                 FROM confirmaciones c
                 LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
                 WHERE c.id = :id',
                [':id' => $id]
            );

            /* El total de la familia, MENOS los que se sentaron aparte
               en este mismo plan (mismo criterio que panoramaDeMesas()
               al armar la unidad: no volver a contar a quien ya tiene
               su propia silla en otro lado). */
            $sacadosDeEstaFamilia = 0;
            foreach ($plan as $otra) {
                if ($otra['tipo'] !== 'acompanante') continue;
                $familiaDeEsa = consultarUno(
                    'SELECT confirmacion_id FROM acompanantes WHERE id = :a',
                    [':a' => (int) $otra['id']]
                );
                if ($familiaDeEsa && (int) $familiaDeEsa['confirmacion_id'] === $id) {
                    $sacadosDeEstaFamilia++;
                }
            }

            $totalFamilia = lugaresQueOcupa($gente ?: []);
            $lugares = max(1, $totalFamilia - $sacadosDeEstaFamilia);

            insertar('asignacion_mesas', [
                'confirmacion_id' => $id,
                'mesa_id'         => $mesaId,
                'lugares'         => $lugares,
                'fijada'          => 0,
            ]);
            $cuantos++;
        }

        bd()->commit();
        return $cuantos;

    } catch (Exception $e) {
        bd()->rollBack();
        error_log('[Ania XV · mesas] Falló el guardado del plan: ' . $e->getMessage());
        return 0;
    }
}


/* ─── 3B. PODER VOLVER ATRÁS ──────────────────────────────────────────── */

/** Cuántas fotos del acomodo se conservan. */
const CUANTOS_RESPALDOS = 5;

/**
 * Guarda una foto del acomodo actual antes de cambiarlo.
 *
 * POR QUÉ EXISTE
 * "Acomodar solo" mueve a ciento treinta personas de un botonazo. Sin
 * forma de volver atrás, la función da miedo — y una función que da
 * miedo no se usa, por buena que sea. Esto es lo que permite probar.
 *
 * Incluye tanto asignacion_mesas como asignacion_mesas_persona (Fase 9)
 * en la misma foto, para que "volver atrás" deshaga las dos tablas
 * juntas y nunca queden desalineadas entre sí.
 *
 * @param string $motivo
 * @param int    $usuarioId
 * @return void
 */
function guardarFotoDelAcomodo($motivo, $usuarioId = 0) {
    if (!existeTabla('acomodo_respaldo') || !existeTabla('asignacion_mesas')) return;

    try {
        $filas = consultarTodo('SELECT * FROM asignacion_mesas');
        $filasPersona = existeTabla('asignacion_mesas_persona')
            ? consultarTodo('SELECT * FROM asignacion_mesas_persona')
            : [];

        insertar('acomodo_respaldo', [
            'contenido'  => json_encode(
                ['familias' => $filas, 'personas' => $filasPersona],
                JSON_UNESCAPED_UNICODE
            ),
            'motivo'     => $motivo,
            'cuantos'    => count($filas) + count($filasPersona),
            'usuario_id' => $usuarioId ?: null,
        ]);

        /* Se dejan solo las últimas. Sin esto la tabla crece para
           siempre con copias que nadie va a mirar. */
        $viejas = consultarTodo(
            'SELECT id FROM acomodo_respaldo ORDER BY cuando DESC, id DESC LIMIT 50'
        );
        foreach (array_slice($viejas, CUANTOS_RESPALDOS) as $v) {
            ejecutar('DELETE FROM acomodo_respaldo WHERE id = :id', [':id' => $v['id']]);
        }
    } catch (Exception $e) {
        /* Que no se pueda respaldar no puede impedir acomodar. Se avisa
           al log y se sigue: lo peor es quedarse sin deshacer. */
        error_log('[Ania XV · mesas] No se pudo respaldar el acomodo: ' . $e->getMessage());
    }
}

/**
 * Vuelve al acomodo anterior.
 *
 * ⚠️ COMPATIBLE CON FOTOS VIEJAS: antes de Fase 9, `contenido` era
 * directamente la lista de filas de `asignacion_mesas` (sin el
 * envoltorio {familias, personas}). Si el JSON decodificado es una
 * lista plana, se lo trata como "familias" y "personas" queda vacío —
 * así una foto tomada la semana pasada se puede seguir restaurando.
 *
 * @return array ['ok' => bool, 'cuantos' => int, 'error' => string]
 */
function volverAlAcomodoAnterior() {
    if (!existeTabla('acomodo_respaldo')) {
        return ['ok' => false, 'error' => 'Falta la tabla de respaldos.'];
    }

    $ultimo = consultarUno(
        'SELECT * FROM acomodo_respaldo ORDER BY cuando DESC, id DESC LIMIT 1'
    );
    if (!$ultimo) return ['ok' => false, 'error' => 'No hay ningún acomodo anterior guardado.'];

    $contenido = json_decode($ultimo['contenido'], true);
    if (!is_array($contenido)) {
        return ['ok' => false, 'error' => 'El respaldo está dañado.'];
    }

    $esFormatoViejo = array_keys($contenido) === range(0, count($contenido) - 1);
    $filasFamilias = $esFormatoViejo ? $contenido : ($contenido['familias'] ?? []);
    $filasPersonas = $esFormatoViejo ? [] : ($contenido['personas'] ?? []);

    bd()->beginTransaction();
    try {
        ejecutar('DELETE FROM asignacion_mesas');

        foreach ($filasFamilias as $f) {
            insertar('asignacion_mesas', [
                'confirmacion_id' => (int) $f['confirmacion_id'],
                'mesa_id'         => (int) $f['mesa_id'],
                'lugares'         => (int) $f['lugares'],
                'fijada'          => (int) $f['fijada'],
                'notas'           => (string) ($f['notas'] ?? ''),
            ]);
        }

        if (existeTabla('asignacion_mesas_persona')) {
            ejecutar('DELETE FROM asignacion_mesas_persona');
            foreach ($filasPersonas as $f) {
                insertar('asignacion_mesas_persona', [
                    'acompanante_id' => (int) $f['acompanante_id'],
                    'mesa_id'        => (int) $f['mesa_id'],
                    'fijada'         => (int) $f['fijada'],
                    'notas'          => (string) ($f['notas'] ?? ''),
                ]);
            }
        }

        /* El respaldo usado se descarta: si quedara, tocar deshacer dos
           veces volvería a lo mismo y parecería que no funciona. */
        ejecutar('DELETE FROM acomodo_respaldo WHERE id = :id', [':id' => $ultimo['id']]);

        bd()->commit();
        return ['ok' => true, 'cuantos' => count($filasFamilias) + count($filasPersonas)];

    } catch (Exception $e) {
        bd()->rollBack();
        error_log('[Ania XV · mesas] Falló el deshacer: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'No se pudo volver atrás.'];
    }
}


/* ─── 4. SENTAR A UNO SOLO ────────────────────────────────────────────── */

/**
 * La MISMA búsqueda que hace sentarAUnoSolo(), pero sin escribir nada
 * — para que el agente de mesas (ver 42-agente-mesas.js) pueda PROPONER
 * antes de asignar de verdad. Confirmar la propuesta manda a
 * sentarAUnoSolo(), que llama a esta misma función para el puntaje: la
 * propuesta que se ve y lo que de verdad se asigna nunca pueden
 * quedar desalineadas, porque es literalmente el mismo cálculo.
 *
 * @param int    $confirmacionId
 * @param int    $acompananteId  0 para la familia entera (de siempre);
 *                                >0 para sentar a ESA persona puntual
 *                                por su cuenta (Fase 9) — tiene que
 *                                tener su fila en acompanante_reglas.
 * @return array {ok, error?, mesa_id?, mesa_nombre?, por_grupo?, ya_estaba?}
 */
function previsualizarAsientoPara($confirmacionId, $acompananteId = 0) {
    if (!existeTabla('mesas') || !existeTabla('asignacion_mesas')) {
        return ['ok' => false, 'error' => 'Faltan las tablas de mesas.'];
    }

    $tipo  = $acompananteId > 0 ? 'acompanante' : 'confirmacion';
    $id    = $acompananteId > 0 ? $acompananteId : $confirmacionId;
    $clave = claveDeUnidad($tipo, $id);

    // Si ya está sentado, no hay nada que proponer.
    if ($tipo === 'acompanante') {
        $yaEsta = consultarUno(
            'SELECT mesa_id FROM asignacion_mesas_persona WHERE acompanante_id = :a',
            [':a' => $id]
        );
    } else {
        $yaEsta = consultarUno(
            'SELECT mesa_id FROM asignacion_mesas WHERE confirmacion_id = :c',
            [':c' => $id]
        );
    }
    if ($yaEsta) {
        return ['ok' => true, 'mesa_id' => (int) $yaEsta['mesa_id'], 'ya_estaba' => true];
    }

    $datos  = panoramaDeMesas();
    $peleas = indiceDePeleas($datos['peleas'], $datos['ids_sueltos']);

    // Quién es y cuánto ocupa.
    $quien = null;
    foreach ($datos['invitados'] as $unidad) {
        if ($unidad['tipo'] === $tipo && (int) $unidad['id'] === (int) $id) { $quien = $unidad; break; }
    }
    if (!$quien) {
        return ['ok' => false, 'error' => $tipo === 'acompanante'
            ? 'Esa persona no tiene una regla propia todavía, o no asiste.'
            : 'Esa confirmación no existe o no asiste.'];
    }

    // El estado actual de las mesas, con lo que ya hay sentado —
    // familias Y personas sueltas, las dos fuentes a la vez.
    $estado = [];
    foreach ($datos['mesas'] as $mesa) {
        $estado[$mesa['id']] = [
            'id' => (int) $mesa['id'], 'nombre' => $mesa['nombre'],
            'capacidad' => (int) $mesa['capacidad'],
            'libres' => (int) $mesa['capacidad'], 'sentados' => [],
        ];
    }
    foreach ($datos['invitados'] as $unidad) {
        if (empty($unidad['mesa_id']) || !isset($estado[$unidad['mesa_id']])) continue;
        $estado[$unidad['mesa_id']]['libres'] -= $unidad['lugares_necesarios'];
        $estado[$unidad['mesa_id']]['sentados'][] = claveDeUnidad($unidad['tipo'], $unidad['id']);
    }

    /* Se prefiere una mesa donde ya haya gente de su mismo grupo: es
       más importante sentarlo con los suyos que optimizar el espacio.
       $porGrupo queda anotado para poder explicar el motivo después. */
    $destino  = 0;
    $porGrupo = false;
    if (!empty($quien['grupo_id'])) {
        $conSuGrupo = [];
        foreach ($datos['invitados'] as $unidad) {
            if ((int) ($unidad['grupo_id'] ?? 0) !== (int) $quien['grupo_id']) continue;
            if (empty($unidad['mesa_id'])) continue;
            $conSuGrupo[(int) $unidad['mesa_id']] = true;
        }

        $soloEsas = array_intersect_key($estado, $conSuGrupo);
        $destino = mejorMesaPara($quien['lugares_necesarios'], [$quien], $soloEsas, $peleas);
        if ($destino) $porGrupo = true;
    }

    if (!$destino) {
        $destino = mejorMesaPara($quien['lugares_necesarios'], [$quien], $estado, $peleas);
    }

    if (!$destino) {
        return ['ok' => false, 'error' => 'No hay ninguna mesa con lugar suficiente.'];
    }

    return [
        'ok'          => true,
        'mesa_id'     => $destino,
        'mesa_nombre' => $estado[$destino]['nombre'],
        'por_grupo'   => $porGrupo,
        'ya_estaba'   => false,
    ];
}

/**
 * Busca lugar para UNA unidad sin tocar a nadie más, y la sienta de
 * verdad.
 *
 * Es lo que corre cuando llega una confirmación nueva: no tiene sentido
 * reacomodar la fiesta entera porque confirmó un invitado más.
 *
 * @param int $confirmacionId
 * @param int $acompananteId  Ver previsualizarAsientoPara().
 * @return array ['ok' => bool, 'mesa_id' => int, 'mesa' => string]
 */
function sentarAUnoSolo($confirmacionId, $acompananteId = 0) {
    $previa = previsualizarAsientoPara($confirmacionId, $acompananteId);
    if (!$previa['ok'] || !empty($previa['ya_estaba'])) return $previa;

    if ($acompananteId > 0) {
        insertar('asignacion_mesas_persona', [
            'acompanante_id' => $acompananteId,
            'mesa_id'        => $previa['mesa_id'],
            'fijada'         => 0,
        ]);
        return ['ok' => true, 'mesa_id' => $previa['mesa_id'], 'mesa' => $previa['mesa_nombre']];
    }

    // Se necesita lugares_necesarios para el INSERT, que
    // previsualizarAsientoPara() no devuelve (no es parte de "adónde").
    $datos = panoramaDeMesas();
    $quien = null;
    foreach ($datos['invitados'] as $unidad) {
        if ($unidad['tipo'] === 'confirmacion' && (int) $unidad['id'] === (int) $confirmacionId) {
            $quien = $unidad;
            break;
        }
    }
    if (!$quien) return ['ok' => false, 'error' => 'Esa confirmación no existe o no asiste.'];

    insertar('asignacion_mesas', [
        'confirmacion_id' => (int) $confirmacionId,
        'mesa_id'         => $previa['mesa_id'],
        'lugares'         => $quien['lugares_necesarios'],
        'fijada'          => 0,
    ]);

    return ['ok' => true, 'mesa_id' => $previa['mesa_id'], 'mesa' => $previa['mesa_nombre']];
}
