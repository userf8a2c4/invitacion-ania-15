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
 * @param array $plan       confirmacion_id => mesa_id
 * @param array $invitados  Con su mesa_id actual.
 * @param array $mesas      Para poder poner los nombres.
 * @return array
 */
function movimientosDelPlan($plan, $invitados, $mesas) {
    $comoSeLlama = [];
    foreach ($mesas as $m) $comoSeLlama[(int) $m['id']] = $m['nombre'];

    $movimientos = [];

    foreach ($invitados as $invitado) {
        $id     = (int) $invitado['id'];
        $antes  = (int) ($invitado['mesa_id'] ?? 0);
        $ahora  = (int) ($plan[$id] ?? 0);

        // Se queda donde estaba: no hay nada que contar.
        if ($antes === $ahora) continue;

        $movimientos[] = [
            'nombre'     => $invitado['nombre'],
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
 * @param string $motivo
 * @param int    $usuarioId
 * @return void
 */
function guardarFotoDelAcomodo($motivo, $usuarioId = 0) {
    if (!existeTabla('acomodo_respaldo') || !existeTabla('asignacion_mesas')) return;

    try {
        $filas = consultarTodo('SELECT * FROM asignacion_mesas');

        insertar('acomodo_respaldo', [
            'contenido'  => json_encode($filas, JSON_UNESCAPED_UNICODE),
            'motivo'     => $motivo,
            'cuantos'    => count($filas),
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

    $filas = json_decode($ultimo['contenido'], true);
    if (!is_array($filas)) {
        return ['ok' => false, 'error' => 'El respaldo está dañado.'];
    }

    bd()->beginTransaction();
    try {
        ejecutar('DELETE FROM asignacion_mesas');

        foreach ($filas as $f) {
            insertar('asignacion_mesas', [
                'confirmacion_id' => (int) $f['confirmacion_id'],
                'mesa_id'         => (int) $f['mesa_id'],
                'lugares'         => (int) $f['lugares'],
                'fijada'          => (int) $f['fijada'],
                'notas'           => (string) ($f['notas'] ?? ''),
            ]);
        }

        /* El respaldo usado se descarta: si quedara, tocar deshacer dos
           veces volvería a lo mismo y parecería que no funciona. */
        ejecutar('DELETE FROM acomodo_respaldo WHERE id = :id', [':id' => $ultimo['id']]);

        bd()->commit();
        return ['ok' => true, 'cuantos' => count($filas)];

    } catch (Exception $e) {
        bd()->rollBack();
        error_log('[Ania XV · mesas] Falló el deshacer: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'No se pudo volver atrás.'];
    }
}


/* ─── 4. SENTAR A UNO SOLO ────────────────────────────────────────────── */

/**
 * La MISMA búsqueda que hace sentarAUnoSolo(), pero sin escribir nada
 * — para que el agente de mesas (Paso 5, ver 42-agente-mesas.js) pueda
 * PROPONER antes de asignar de verdad. Confirmar la propuesta manda a
 * sentarAUnoSolo(), que llama a esta misma función para el puntaje: la
 * propuesta que se ve y lo que de verdad se asigna nunca pueden
 * quedar desalineadas, porque es literalmente el mismo cálculo.
 *
 * @param int $confirmacionId
 * @return array {ok, error?, mesa_id?, mesa_nombre?, por_grupo?, ya_estaba?}
 */
function previsualizarAsientoPara($confirmacionId) {
    if (!existeTabla('mesas') || !existeTabla('asignacion_mesas')) {
        return ['ok' => false, 'error' => 'Faltan las tablas de mesas.'];
    }

    // Si ya está sentado, no hay nada que proponer.
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
       más importante sentarlo con los suyos que optimizar el espacio.
       $porGrupo queda anotado para poder explicar el motivo después. */
    $destino  = 0;
    $porGrupo = false;
    if (!empty($quien['grupo_id'])) {
        $conSuGrupo = [];
        foreach ($datos['invitados'] as $invitado) {
            if ((int) ($invitado['grupo_id'] ?? 0) !== (int) $quien['grupo_id']) continue;
            if (empty($invitado['mesa_id'])) continue;
            $conSuGrupo[(int) $invitado['mesa_id']] = true;
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
 * Busca lugar para UNA confirmación sin tocar a nadie más, y la sienta
 * de verdad.
 *
 * Es lo que corre cuando llega una confirmación nueva: no tiene sentido
 * reacomodar la fiesta entera porque confirmó un invitado más.
 *
 * @param int $confirmacionId
 * @return array ['ok' => bool, 'mesa_id' => int, 'mesa' => string]
 */
function sentarAUnoSolo($confirmacionId) {
    $previa = previsualizarAsientoPara($confirmacionId);
    if (!$previa['ok'] || !empty($previa['ya_estaba'])) return $previa;

    // Se necesita lugares_necesarios para el INSERT, que
    // previsualizarAsientoPara() no devuelve (no es parte de "adónde").
    $datos = panoramaDeMesas();
    $quien = null;
    foreach ($datos['invitados'] as $invitado) {
        if ((int) $invitado['id'] === (int) $confirmacionId) { $quien = $invitado; break; }
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
