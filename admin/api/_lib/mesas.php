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

   ÍNDICE
     1. Juntar los datos
     2. Las reglas
     3. Repartir
     4. Sentar a uno solo
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';


/* ─── 1. JUNTAR LOS DATOS ─────────────────────────────────────────────── */

/**
 * Trae todo lo que hace falta para repartir: mesas, invitados y reglas.
 *
 * @return array
 */
function panoramaDeMesas() {
    /* Se ordena en PHP y no en SQL porque strnatcasecmp entiende los
       números dentro del texto: pone "Mesa 2" antes que "Mesa 10", que
       es lo que uno espera. El ORDER BY de MySQL lo haría al revés,
       comparando letra por letra. */
    $mesas = existeTabla('mesas') ? consultarTodo('SELECT * FROM mesas') : [];
    usort($mesas, function ($a, $b) {
        return strnatcasecmp($a['nombre'], $b['nombre']);
    });

    /* Los invitados que hay que sentar: los que confirmaron que asisten
       y traen al menos una persona. */
    $invitados = [];
    if (existeTabla('confirmaciones')) {
        $invitados = consultarTodo(
            'SELECT c.id, c.nombre, c.adultos, c.ninos,
                    p.grupo_id, p.sillas_extra, p.mesa_preferida, p.notas AS nota_mesa,
                    g.nombre AS grupo_nombre, g.orden AS grupo_orden,
                    a.mesa_id, a.fijada, a.lugares
             FROM confirmaciones c
             LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
             LEFT JOIN grupos_invitados g      ON g.id = p.grupo_id
             LEFT JOIN asignacion_mesas a      ON a.confirmacion_id = c.id
             WHERE c.asiste = 1
             ORDER BY c.nombre'
        );
    }

    // Cuántos lugares ocupa cada uno, ya calculado.
    foreach ($invitados as &$invitado) {
        $invitado['lugares_necesarios'] = lugaresQueOcupa($invitado);
    }
    unset($invitado);

    $grupos = existeTabla('grupos_invitados')
        ? consultarTodo('SELECT * FROM grupos_invitados ORDER BY orden, nombre')
        : [];

    $peleas = existeTabla('incompatibilidades')
        ? consultarTodo('SELECT * FROM incompatibilidades')
        : [];

    return [
        'mesas'      => $mesas,
        'invitados'  => $invitados,
        'grupos'     => $grupos,
        'peleas'     => $peleas,
    ];
}

/**
 * Cuántas sillas necesita una confirmación.
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
 * Arma un índice rápido de quién no se banca a quién.
 *
 * Se guarda en los dos sentidos aunque la tabla tenga una sola fila por
 * par: así preguntar "¿A se lleva con B?" es inmediato sin importar el
 * orden en que se pregunte.
 *
 * @param array $peleas
 * @return array id => [otros ids]
 */
function indiceDePeleas($peleas) {
    $indice = [];

    foreach ($peleas as $pelea) {
        $a = (int) $pelea['invitado_a'];
        $b = (int) $pelea['invitado_b'];

        if (!isset($indice[$a])) $indice[$a] = [];
        if (!isset($indice[$b])) $indice[$b] = [];

        $indice[$a][] = $b;
        $indice[$b][] = $a;
    }
    return $indice;
}

/**
 * Dice si un invitado puede sentarse en una mesa donde ya hay otros.
 *
 * @param int   $quien
 * @param array $yaSentados ids de los que están en esa mesa.
 * @param array $peleas     El índice de indiceDePeleas().
 * @return bool
 */
function seLlevaBienCon($quien, $yaSentados, $peleas) {
    if (empty($peleas[$quien])) return true;

    foreach ($yaSentados as $otro) {
        if (in_array((int) $otro, $peleas[$quien], true)) return false;
    }
    return true;
}


/* ─── 3. REPARTIR ─────────────────────────────────────────────────────── */

/**
 * Reparte a todos los invitados en las mesas.
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
    $peleas = indiceDePeleas($datos['peleas']);

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

    $plan       = [];   // confirmacion_id => mesa_id
    $sinLugar   = [];
    $porResolver = [];

    /* ─── Primero, lo intocable ────────────────────────────────────── */
    foreach ($datos['invitados'] as $invitado) {
        $id      = (int) $invitado['id'];
        $lugares = $invitado['lugares_necesarios'];

        $fijado = $respetarFijados
               && !empty($invitado['mesa_id'])
               && (int) $invitado['fijada'] === 1;

        // Una mesa preferida vale tanto como una asignación fijada.
        $preferida = !empty($invitado['mesa_preferida'])
                   ? (int) $invitado['mesa_preferida'] : 0;

        $mesaForzada = $fijado ? (int) $invitado['mesa_id'] : $preferida;

        if ($mesaForzada && isset($estado[$mesaForzada])) {
            $estado[$mesaForzada]['libres'] -= $lugares;
            $estado[$mesaForzada]['sentados'][] = $id;
            $plan[$id] = $mesaForzada;
            continue;
        }

        $porResolver[] = $invitado;
    }

    /* ─── Después, por grupos ──────────────────────────────────────── */

    /* Se juntan por grupo y se ordena: primero los grupos con más gente,
       porque son los más difíciles de ubicar. Dejarlos para el final
       garantiza que no entren en ningún lado. */
    $porGrupo = [];
    foreach ($porResolver as $invitado) {
        // Los que no tienen grupo van cada uno por su cuenta.
        $clave = !empty($invitado['grupo_id'])
               ? 'g' . $invitado['grupo_id']
               : 'solo' . $invitado['id'];

        if (!isset($porGrupo[$clave])) {
            $porGrupo[$clave] = [
                'orden'     => (int) ($invitado['grupo_orden'] ?? 50),
                'gente'     => 0,
                'invitados' => [],
            ];
        }
        $porGrupo[$clave]['gente'] += $invitado['lugares_necesarios'];
        $porGrupo[$clave]['invitados'][] = $invitado;
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
        $mesaDelGrupo = mejorMesaPara($grupo['gente'], $grupo['invitados'],
                                      $estado, $peleas);

        foreach ($grupo['invitados'] as $invitado) {
            $id      = (int) $invitado['id'];
            $lugares = $invitado['lugares_necesarios'];

            $destino = 0;

            // ¿Sigue entrando en la mesa que se eligió para el grupo?
            if ($mesaDelGrupo
                && $estado[$mesaDelGrupo]['libres'] >= $lugares
                && seLlevaBienCon($id, $estado[$mesaDelGrupo]['sentados'], $peleas)) {
                $destino = $mesaDelGrupo;
            } else {
                $destino = mejorMesaPara($lugares, [$invitado], $estado, $peleas);
            }

            if (!$destino) {
                $sinLugar[] = [
                    'id'      => $id,
                    'nombre'  => $invitado['nombre'],
                    'lugares' => $lugares,
                ];
                continue;
            }

            $estado[$destino]['libres'] -= $lugares;
            $estado[$destino]['sentados'][] = $id;
            $plan[$id] = $destino;
        }
    }

    return [
        'ok'        => true,
        'plan'      => $plan,
        'sin_lugar' => $sinLugar,
        'mesas'     => array_values($estado),
    ];
}

/**
 * Elige la mejor mesa para un grupo de gente.
 *
 * "Mejor" es la que deja MENOS lugares sueltos. Sin ese criterio, el
 * reparto va llenando la primera mesa que encuentra y termina con ocho
 * mesas a medio ocupar, que en un salón se ve vacío y desangelado.
 *
 * @param int   $lugares  Cuántas sillas hacen falta.
 * @param array $quienes  Los invitados (para comprobar peleas).
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
            if (!seLlevaBienCon((int) $quien['id'], $mesa['sentados'], $peleas)) {
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
 * Guarda un plan en la base de datos.
 *
 * @param array $plan  confirmacion_id => mesa_id
 * @param bool  $respetarFijados
 * @return int Cuántos se sentaron.
 */
function guardarPlanDeMesas($plan, $respetarFijados = true) {
    /* Se borran las asignaciones anteriores salvo las fijadas, y se
       escriben las nuevas. Se hace en una transacción para que no pueda
       quedar a medias: o se acomoda todo, o no se toca nada. */
    bd()->beginTransaction();

    try {
        if ($respetarFijados) {
            ejecutar('DELETE FROM asignacion_mesas WHERE fijada = 0');
        } else {
            ejecutar('DELETE FROM asignacion_mesas');
        }

        $cuantos = 0;

        foreach ($plan as $confirmacionId => $mesaId) {
            // Las fijadas ya están en la base: no se vuelven a escribir.
            $yaEsta = consultarUno(
                'SELECT id FROM asignacion_mesas WHERE confirmacion_id = :c',
                [':c' => (int) $confirmacionId]
            );
            if ($yaEsta) { $cuantos++; continue; }

            $gente = consultarUno(
                'SELECT c.adultos, c.ninos, p.sillas_extra
                 FROM confirmaciones c
                 LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
                 WHERE c.id = :id',
                [':id' => (int) $confirmacionId]
            );

            insertar('asignacion_mesas', [
                'confirmacion_id' => (int) $confirmacionId,
                'mesa_id'         => (int) $mesaId,
                'lugares'         => lugaresQueOcupa($gente ?: []),
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


/* ─── 4. SENTAR A UNO SOLO ────────────────────────────────────────────── */

/**
 * Busca lugar para UNA confirmación sin tocar a nadie más.
 *
 * Es lo que corre cuando llega una confirmación nueva: no tiene sentido
 * reacomodar la fiesta entera porque confirmó un invitado más.
 *
 * @param int $confirmacionId
 * @return array ['ok' => bool, 'mesa_id' => int, 'mesa' => string]
 */
function sentarAUnoSolo($confirmacionId) {
    if (!existeTabla('mesas') || !existeTabla('asignacion_mesas')) {
        return ['ok' => false, 'error' => 'Faltan las tablas de mesas.'];
    }

    // Si ya está sentado, no se hace nada.
    $yaEsta = consultarUno(
        'SELECT mesa_id FROM asignacion_mesas WHERE confirmacion_id = :c',
        [':c' => (int) $confirmacionId]
    );
    if ($yaEsta) {
        return ['ok' => true, 'mesa_id' => (int) $yaEsta['mesa_id'], 'ya_estaba' => true];
    }

    $datos  = panoramaDeMesas();
    $peleas = indiceDePeleas($datos['peleas']);

    // Quién es y cuánto ocupa.
    $quien = null;
    foreach ($datos['invitados'] as $invitado) {
        if ((int) $invitado['id'] === (int) $confirmacionId) { $quien = $invitado; break; }
    }
    if (!$quien) return ['ok' => false, 'error' => 'Esa confirmación no existe o no asiste.'];

    // El estado actual de las mesas, con lo que ya hay sentado.
    $estado = [];
    foreach ($datos['mesas'] as $mesa) {
        $estado[$mesa['id']] = [
            'id' => (int) $mesa['id'], 'nombre' => $mesa['nombre'],
            'capacidad' => (int) $mesa['capacidad'],
            'libres' => (int) $mesa['capacidad'], 'sentados' => [],
        ];
    }
    foreach ($datos['invitados'] as $invitado) {
        if (empty($invitado['mesa_id']) || !isset($estado[$invitado['mesa_id']])) continue;
        $estado[$invitado['mesa_id']]['libres'] -= $invitado['lugares_necesarios'];
        $estado[$invitado['mesa_id']]['sentados'][] = (int) $invitado['id'];
    }

    /* Se prefiere una mesa donde ya haya gente de su mismo grupo: es
       más importante sentarlo con los suyos que optimizar el espacio. */
    $destino = 0;
    if (!empty($quien['grupo_id'])) {
        $conSuGrupo = [];
        foreach ($datos['invitados'] as $invitado) {
            if ((int) ($invitado['grupo_id'] ?? 0) !== (int) $quien['grupo_id']) continue;
            if (empty($invitado['mesa_id'])) continue;
            $conSuGrupo[(int) $invitado['mesa_id']] = true;
        }

        $soloEsas = array_intersect_key($estado, $conSuGrupo);
        $destino = mejorMesaPara($quien['lugares_necesarios'], [$quien], $soloEsas, $peleas);
    }

    if (!$destino) {
        $destino = mejorMesaPara($quien['lugares_necesarios'], [$quien], $estado, $peleas);
    }

    if (!$destino) {
        return ['ok' => false, 'error' => 'No hay ninguna mesa con lugar suficiente.'];
    }

    insertar('asignacion_mesas', [
        'confirmacion_id' => (int) $confirmacionId,
        'mesa_id'         => $destino,
        'lugares'         => $quien['lugares_necesarios'],
        'fijada'          => 0,
    ]);

    return ['ok' => true, 'mesa_id' => $destino, 'mesa' => $estado[$destino]['nombre']];
}
