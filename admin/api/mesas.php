<?php
/* ══════════════════════════════════════════════════════════════════════
   MESAS.PHP · EL ACOMODO DEL SALÓN

   QUÉ HACE ESTE ARCHIVO
   Todo lo del acomodo: crear las mesas, sentar gente a mano, dejar que
   se acomode sola, y las reglas que hacen que el resultado sirva.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=todo            el panorama completo
     POST ?accion=crear_lote      crea N mesas de C sillas de una vez
     POST ?accion=vista_previa    calcula el acomodo SIN guardarlo
     POST ?accion=autoasignar     lo calcula y lo guarda
     POST ?accion=sentar          pone a alguien en una mesa concreta
     POST ?accion=fijar           traba una asignación
     POST ?accion=vaciar          saca a todos (menos los fijados)
     POST ?accion=guardar_grupo   grupos de invitados
     POST ?accion=borrar_grupo
     POST ?accion=preferencia     sillas extra, grupo y mesa preferida
     POST ?accion=pelea           "estos dos no se sientan juntos"
     POST ?accion=borrar_pelea
     POST ?accion=auto_al_confirmar  prende o apaga el acomodo automático

     Fase 9 — reglas por persona, no solo por familia:
     POST ?accion=regla_persona   saca a alguien de su familia (o lo
                                   devuelve, mandando todo en 0/vacío)
     GET  ?accion=personas_de&confirmacion_id=N  los acompañantes de una
                                   familia, con su regla si tiene una
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/mesas.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'mesas', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'todo');

/**
 * La zona de una mesa según su fila en el plano — mismo criterio que
 * ya usaba `salon.prioridadPorFila` en 01-configuracion.js (la 3 está
 * pegada a la pista, la 6 es el fondo), pero como etiqueta real en vez
 * de un número que solo servía para ordenar. Se usa al armar el salón
 * (ver 'armar_salon' abajo) para que la zona exista desde el día uno
 * sin que Lucila tenga que cargarla a mano en las 14 mesas.
 *
 * @param int $fila
 * @return string Cadena vacía si la fila no tiene una zona conocida.
 */
function zonaPorFila($fila) {
    $zonas = [
        3 => 'Cerca del escenario',
        4 => 'Zona media',
        5 => 'Al fondo',
        6 => 'Al fondo',
    ];
    return $zonas[(int) $fila] ?? '';
}


switch ($accion) {

/* ─── EL PANORAMA ─────────────────────────────────────────────────────── */

case 'todo':
    exigirMetodo('GET');

    $datos = panoramaDeMesas();

    /* Cada mesa con quiénes tiene sentados. Se arma acá y no en la app
       para que el teléfono reciba la respuesta lista para pintar. */
    $porMesa = [];
    foreach ($datos['mesas'] as $mesa) {
        $porMesa[$mesa['id']] = [
            'id'         => (int) $mesa['id'],
            'nombre'     => $mesa['nombre'],
            'capacidad'  => (int) $mesa['capacidad'],
            'ubicacion'  => $mesa['ubicacion'],
            'notas'      => $mesa['notas'],
            // Dónde va en el plano. En 0 = todavía sin ubicar.
            'fila'       => (int) ($mesa['fila'] ?? 0),
            'columna'    => (int) ($mesa['columna'] ?? 0),
            'prioridad'  => (int) ($mesa['prioridad'] ?? 50),
            'perfil'     => $mesa['perfil'] ?? 'normal',
            'ocupados'   => 0,
            'invitados'  => [],
        ];
    }

    $sinSentar = [];
    $totalGente = 0;

    foreach ($datos['invitados'] as $invitado) {
        $totalGente += $invitado['lugares_necesarios'];

        $ficha = [
            'id'       => (int) $invitado['id'],
            // Fase 9: 'confirmacion' (una familia, o lo que queda de
            // ella) o 'acompanante' (una persona que se sacó de la
            // suya). El frontend lo necesita para saber a qué acción
            // mandar (sentar/fijar con o sin acompanante_id).
            'tipo'     => $invitado['tipo'],
            'nombre'   => $invitado['nombre'],
            'lugares'  => $invitado['lugares_necesarios'],
            'grupo'    => $invitado['grupo_nombre'],
            'grupo_id' => $invitado['grupo_id'] ? (int) $invitado['grupo_id'] : null,
            'fijada'   => (int) ($invitado['fijada'] ?? 0) === 1,
            'extra'    => (int) ($invitado['sillas_extra'] ?? 0),
            // Para poder mostrarla/editarla en "Grupo, sillas extra y
            // reglas" (17-mesas.js) — panoramaDeMesas() ya la calculaba,
            // solo le faltaba llegar hasta acá.
            'mesa_preferida' => $invitado['mesa_preferida'] ? (int) $invitado['mesa_preferida'] : null,
        ];

        if (!empty($invitado['mesa_id']) && isset($porMesa[$invitado['mesa_id']])) {
            $porMesa[$invitado['mesa_id']]['ocupados'] += $invitado['lugares_necesarios'];
            $porMesa[$invitado['mesa_id']]['invitados'][] = $ficha;
        } else {
            $sinSentar[] = $ficha;
        }
    }

    $capacidadTotal = 0;
    foreach ($porMesa as $mesa) $capacidadTotal += $mesa['capacidad'];

    $ajuste = existeTabla('ajustes')
        ? consultarUno("SELECT valor FROM ajustes WHERE clave = 'auto_al_confirmar'")
        : null;

    /* De cuándo es la foto a la que vuelve "Volver al acomodo anterior",
       y por qué se tomó. Viaja para que la app pueda preguntar diciendo
       QUÉ se pierde ("vuelves a como estaba el 2 de septiembre") en vez
       de un "¿estás seguro?" que no ayuda a decidir. */
    $ultimoRespaldo = existeTabla('acomodo_respaldo')
        ? consultarUno('SELECT cuando, motivo, cuantos FROM acomodo_respaldo
                        ORDER BY cuando DESC, id DESC LIMIT 1')
        : null;

    responderBien([
        'mesas'       => array_values($porMesa),
        'sin_sentar'  => $sinSentar,
        'grupos'      => $datos['grupos'],
        'peleas'      => $datos['peleas'],
        'resumen'     => [
            'capacidad'      => $capacidadTotal,
            'gente'          => $totalGente,
            'sentados'       => $totalGente - array_sum(array_map(function ($i) {
                                    return $i['lugares'];
                                }, $sinSentar)),
            'sin_sentar'     => count($sinSentar),
            'mesas'          => count($porMesa),
            'faltan_lugares' => max(0, $totalGente - $capacidadTotal),
        ],
        'auto_al_confirmar' => $ajuste && $ajuste['valor'] === '1',
        'ultimo_respaldo'   => $ultimoRespaldo ?: null,
    ]);
    break;


/* ─── ARMAR EL SALÓN DE ALVI DE UNA VEZ ───────────────────────────────── */

/*
   Crea las 14 mesas del Salón Estrella con su nombre, capacidad y
   POSICIÓN EN EL PLANO, tal como están en la planilla de Lucila.

   La posición es lo que no se puede cargar a mano sin equivocarse, y es
   justo lo que hace que el plano sirva: sin ella el panel vuelve a ser
   una lista donde no se sabe cuál mesa queda pegada a la pista.

   Es idempotente: si una mesa ya existe se le completa la posición pero
   no se duplica ni se le pisa la capacidad.
*/
case 'armar_salon':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $mesasDelPlano = $datos['mesas'] ?? [];
    if (!is_array($mesasDelPlano) || !$mesasDelPlano) {
        responderMal('No llegó el plano del salón.', 400);
    }

    $creadas = 0;
    $ubicadas = 0;
    $capacidad = campoEntero($datos, 'capacidad', 1, 30, 10);

    foreach ($mesasDelPlano as $m) {
        $nombre  = trim((string) ($m['nombre'] ?? ''));
        if ($nombre === '') continue;

        $fila    = (int) ($m['fila'] ?? 0);
        $columna = (int) ($m['columna'] ?? 0);
        $prioridad = (int) ($m['prioridad'] ?? 50);

        $existe = consultarUno('SELECT id FROM mesas WHERE nombre = :n', [':n' => $nombre]);

        if ($existe) {
            /* Ya estaba: solo se le pone dónde va. No se le toca la
               capacidad ni la ubicación escrita, que puede haberse
               ajustado a mano por algo. */
            /* `fila`, `columna` y `prioridad` se agregaron a `mesas`
               después de que la tabla existiera. Sin filtrar, en una
               instalación sin migrar "Armar el salón" moría con un 500
               a mitad del lote: unas mesas creadas, otras no, y ningún
               aviso de por qué. Ver soloColumnasQueExisten() en
               _lib/bd.php. */
            actualizar('mesas', (int) $existe['id'], soloColumnasQueExisten('mesas', [
                'fila' => $fila, 'columna' => $columna, 'prioridad' => $prioridad,
            ]));
            $ubicadas++;
            continue;
        }

        // Mismo motivo que arriba: sin las columnas del plano la mesa
        // igual se crea, y queda sin ubicar en vez de no existir.
        $mesaId = insertar('mesas', soloColumnasQueExisten('mesas', [
            'nombre'    => $nombre,
            'capacidad' => $capacidad,
            'ubicacion' => '',
            'fila'      => $fila,
            'columna'   => $columna,
            'prioridad' => $prioridad,
        ]));
        $creadas++;

        /* ⚡ (2026-08-30) Zona como etiqueta real desde el día uno, no
           una palabra que Lucila tenga que acordarse de escribir en
           las 14 mesas: se auto-asigna acá, con el mismo sistema de
           etiquetas de siempre (etiquetas_acomodo.php), derivada de la
           fila. Solo al CREAR (no al reubicar una que ya existía, más
           arriba): si Lucila la editó o la borró a mano, no se le pisa
           en la próxima corrida de "Armar el salón". */
        if (existeTabla('etiquetas') && existeTabla('etiquetas_asignadas')) {
            $zona = zonaPorFila($fila);
            if ($zona !== '') {
                $etiquetaZona = consultarUno('SELECT id FROM etiquetas WHERE nombre = :n', [':n' => $zona]);
                $etiquetaZonaId = $etiquetaZona
                    ? (int) $etiquetaZona['id']
                    : insertar('etiquetas', ['nombre' => $zona]);
                insertar('etiquetas_asignadas', [
                    'etiqueta_id'  => $etiquetaZonaId,
                    'atado_a_tipo' => 'mesa',
                    'atado_a_id'   => $mesaId,
                ]);
            }
        }
    }

    anotarEnBitacora($yo, 'armó el plano del salón', 'mesas', 0,
                     $creadas . ' creadas, ' . $ubicadas . ' ubicadas');

    responderBien([
        'creadas'  => $creadas,
        'ubicadas' => $ubicadas,
        'mensaje'  => $creadas
            ? 'Se armó el salón: ' . $creadas . ' mesas de ' . $capacidad . ' lugares.'
            : 'Las mesas ya estaban: se les puso su lugar en el plano.',
    ]);
    break;


/* ─── VOLVER AL ACOMODO ANTERIOR ──────────────────────────────────────── */

case 'deshacer':
    exigirMetodo('POST');

    $r = volverAlAcomodoAnterior();
    if (empty($r['ok'])) responderMal($r['error'], 400);

    anotarEnBitacora($yo, 'volvió al acomodo anterior', 'asignacion_mesas', 0,
                     $r['cuantos'] . ' asignaciones restauradas');

    /* Si desde la foto se borró alguna mesa, esa gente no tiene dónde
       volver. Se dice, en vez de dejar que la cuenta no cierre sola. */
    $salteadas = (int) ($r['salteadas'] ?? 0);
    responderBien(['mensaje' => $salteadas
        ? 'Listo, con una salvedad: ' . $salteadas . ' ' .
          ($salteadas === 1 ? 'persona quedó' : 'personas quedaron') .
          ' sin mesa porque la suya se borró después de esa foto.'
        : 'Listo: el acomodo volvió a como estaba antes.']);
    break;


/* ─── MOVER UNA MESA EN EL PLANO ──────────────────────────────────────── */

case 'ubicar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $mesa = campoEntero($datos, 'mesa_id', 1);
    if (!consultarUno('SELECT id FROM mesas WHERE id = :m', [':m' => $mesa])) {
        responderMal('Esa mesa no existe.', 404);
    }

    /* Arrastrar una mesa en el plano es el gesto más repetido de esta
       pantalla: si las columnas del plano no están, tiene que decirlo
       una vez y no reventar con un 500 en cada arrastre. */
    $movida = soloColumnasQueExisten('mesas', [
        'fila'    => campoEntero($datos, 'fila', 0, 20),
        'columna' => campoEntero($datos, 'columna', 0, 12),
    ]);
    if (!$movida) {
        responderMal('Esta instalación todavía no tiene el plano del salón. ' .
                     'Hay que correr admin/api/instalar.php.', 503);
    }
    actualizar('mesas', $mesa, $movida);

    responderBien(['mensaje' => 'Mesa movida.']);
    break;


/* ─── CREAR MESAS DE UNA VEZ ──────────────────────────────────────────── */

case 'crear_lote':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $cuantas   = campoEntero($datos, 'cuantas', 1, 60);
    $capacidad = campoEntero($datos, 'capacidad', 1, 30, 10);
    $prefijo   = campoTexto($datos, 'prefijo', 30) ?: 'Mesa';
    $desde     = campoEntero($datos, 'desde', 1, 99, 1);

    $creadas = 0;
    $repetidas = 0;

    for ($i = 0; $i < $cuantas; $i++) {
        $nombre = trim($prefijo . ' ' . ($desde + $i));

        // El nombre es único: si ya existe esa mesa, se saltea.
        $existe = consultarUno('SELECT id FROM mesas WHERE nombre = :n', [':n' => $nombre]);
        if ($existe) { $repetidas++; continue; }

        insertar('mesas', [
            'nombre'    => $nombre,
            'capacidad' => $capacidad,
            'ubicacion' => '',
        ]);
        $creadas++;
    }

    anotarEnBitacora($yo, 'creó mesas', 'mesas', 0,
                     $creadas . ' mesas de ' . $capacidad . ' lugares');

    responderBien([
        'creadas'   => $creadas,
        'repetidas' => $repetidas,
        'mensaje'   => $creadas
            ? 'Se crearon ' . $creadas . ' mesas de ' . $capacidad . ' lugares.'
            : 'Ya existían todas esas mesas.',
    ]);
    break;


/* ─── ACOMODAR ────────────────────────────────────────────────────────── */

case 'vista_previa':
case 'autoasignar':
    exigirMetodo('POST');
    $datos = cuerpoJson(false);

    // Por defecto NO se toca lo que se acomodó a mano.
    $respetar = !isset($datos['respetar_fijados']) || !empty($datos['respetar_fijados']);

    $resultado = repartirEnMesas($respetar);

    if (empty($resultado['ok'])) {
        responderMal($resultado['error'] ?? 'No se pudo acomodar.', 400);
    }

    if ($accion === 'vista_previa') {
        responderBien($resultado);
    }

    // Foto de cómo estaba, para poder volver si no gusta el resultado.
    guardarFotoDelAcomodo('antes_de_acomodar', (int) $yo['id']);

    $cuantos = guardarPlanDeMesas($resultado['plan'], $respetar);

    anotarEnBitacora($yo, 'acomodó las mesas automáticamente', 'asignacion_mesas', 0,
                     $cuantos . ' sentados, ' . count($resultado['sin_lugar']) . ' sin lugar');

    responderBien([
        'sentados'  => $cuantos,
        'sin_lugar' => $resultado['sin_lugar'],
        'mensaje'   => count($resultado['sin_lugar'])
            ? 'Se acomodaron ' . $cuantos . '. Quedaron ' .
              count($resultado['sin_lugar']) . ' sin lugar.'
            : 'Listo: se acomodaron los ' . $cuantos . '.',
    ]);
    break;


/* ─── SENTAR A MANO ───────────────────────────────────────────────────── */

case 'sentar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacion  = campoEntero($datos, 'confirmacion_id', 1);
    $acompanante   = campoEntero($datos, 'acompanante_id', 0);   // Fase 9
    $mesa          = campoEntero($datos, 'mesa_id', 0);

    /* ─── Sentar a una PERSONA puntual, sacada de su familia ─────────── */
    if ($acompanante > 0) {
        $persona = consultarUno(
            'SELECT a.nombre FROM acompanante_reglas r
             JOIN acompanantes a ON a.id = r.acompanante_id
             WHERE r.acompanante_id = :a',
            [':a' => $acompanante]
        );
        if (!$persona) {
            responderMal('Esa persona todavía no se sacó de su familia (falta la regla).', 400);
        }

        if ($mesa === 0) {
            ejecutar('DELETE FROM asignacion_mesas_persona WHERE acompanante_id = :a',
                     [':a' => $acompanante]);
            responderBien(['mensaje' => 'Se quitó de la mesa.']);
        }

        $mesaInfo = consultarUno('SELECT nombre, capacidad FROM mesas WHERE id = :m', [':m' => $mesa]);
        if (!$mesaInfo) responderMal('Esa mesa no existe.', 404);

        $ocupados = (int) (consultarUno(
            'SELECT COALESCE(SUM(lugares), 0) AS n FROM asignacion_mesas WHERE mesa_id = :m',
            [':m' => $mesa]
        )['n'] ?? 0) + (int) (consultarUno(
            'SELECT COUNT(*) AS n FROM asignacion_mesas_persona
             WHERE mesa_id = :m AND acompanante_id <> :a',
            [':m' => $mesa, ':a' => $acompanante]
        )['n'] ?? 0);

        $seExcede = ($ocupados + 1) > (int) $mesaInfo['capacidad'];

        ejecutar('DELETE FROM asignacion_mesas_persona WHERE acompanante_id = :a',
                 [':a' => $acompanante]);
        insertar('asignacion_mesas_persona', [
            'acompanante_id' => $acompanante,
            'mesa_id'        => $mesa,
            'fijada'         => 0,
        ]);

        anotarEnBitacora($yo, 'sentó a una persona a mano', 'asignacion_mesas_persona',
                         $acompanante, $persona['nombre'] . ' → ' . $mesaInfo['nombre']);

        responderBien([
            'mensaje'   => $persona['nombre'] . ' quedó en ' . $mesaInfo['nombre'] . '.',
            'se_excede' => $seExcede,
            'aviso'     => $seExcede ? 'Ojo: la mesa queda con más gente que sillas.' : '',
        ]);
    }

    /* ─── Sentar a una FAMILIA (de siempre) ──────────────────────────── */

    // Mesa 0 significa sacarlo del acomodo.
    if ($mesa === 0) {
        ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
                 [':c' => $confirmacion]);
        responderBien(['mensaje' => 'Se quitó de la mesa.']);
    }

    $gente = consultarUno(
        'SELECT c.nombre, c.adultos, c.ninos, p.sillas_extra
         FROM confirmaciones c
         LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
         WHERE c.id = :id',
        [':id' => $confirmacion]
    );
    if (!$gente) responderMal('Esa confirmación no existe.', 404);

    // Lugares de la familia, menos quienes ya se sacaron a su cuenta
    // (Fase 9) — mismo criterio que panoramaDeMesas() y guardarPlanDeMesas().
    $sacados = (int) (consultarUno(
        'SELECT COUNT(*) AS n FROM acompanante_reglas r
         JOIN acompanantes a ON a.id = r.acompanante_id
         WHERE a.confirmacion_id = :c',
        [':c' => $confirmacion]
    )['n'] ?? 0);
    $lugares = max(1, lugaresQueOcupa($gente) - $sacados);

    /* Se avisa si no entra, pero se deja hacer igual: quien acomoda
       puede saber que van a agregar una silla, o que dos chicos van a
       compartir. La computadora informa, no prohíbe. */
    $mesaInfo = consultarUno('SELECT nombre, capacidad FROM mesas WHERE id = :m',
                             [':m' => $mesa]);
    if (!$mesaInfo) responderMal('Esa mesa no existe.', 404);

    $ocupados = (int) (consultarUno(
        'SELECT COALESCE(SUM(lugares), 0) AS n FROM asignacion_mesas
         WHERE mesa_id = :m AND confirmacion_id <> :c',
        [':m' => $mesa, ':c' => $confirmacion]
    )['n'] ?? 0) + (int) (consultarUno(
        'SELECT COUNT(*) AS n FROM asignacion_mesas_persona WHERE mesa_id = :m',
        [':m' => $mesa]
    )['n'] ?? 0);

    $seExcede = ($ocupados + $lugares) > (int) $mesaInfo['capacidad'];

    ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c',
             [':c' => $confirmacion]);

    insertar('asignacion_mesas', [
        'confirmacion_id' => $confirmacion,
        'mesa_id'         => $mesa,
        'lugares'         => $lugares,
        /* Sentar a mano PROPONE, no traba.
         *
         * Antes todo sentado manual quedaba fijado para siempre, así que
         * no existía el término medio entre "lo puse acá probando" y
         * "esto no se toca". Después de mover cinco personas de prueba,
         * el acomodo automático ya casi no tenía margen para trabajar y
         * nadie entendía por qué.
         *
         * El candado ahora se pone aparte, con el botón "Fijar acá" que
         * ya existía y que hasta ahora no significaba nada. */
        'fijada'          => 0,
    ]);

    anotarEnBitacora($yo, 'sentó a alguien a mano', 'asignacion_mesas', $confirmacion,
                     $gente['nombre'] . ' → ' . $mesaInfo['nombre']);

    responderBien([
        'mensaje'   => $gente['nombre'] . ' quedó en ' . $mesaInfo['nombre'] . '.',
        'se_excede' => $seExcede,
        'aviso'     => $seExcede
            ? 'Ojo: la mesa queda con más gente que sillas.' : '',
    ]);
    break;


/* Le busca mesa a UNA sola persona, sin tocar a nadie más. Es el atajo
   que aparece en el ticket de cada invitado, para no tener que ir hasta
   la pantalla de Mesas solo para sentar a alguien. */
case 'sentar_auto':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);
    $acompanante  = campoEntero($datos, 'acompanante_id', 0);   // Fase 9

    $r = sentarAUnoSolo($confirmacion, $acompanante);
    if (!$r['ok']) responderMal($r['error'], 400);

    if (!empty($r['ya_estaba'])) {
        responderBien(['mensaje' => 'Ya tenía mesa asignada.', 'mesa_id' => $r['mesa_id']]);
    }

    $mesaInfo = consultarUno('SELECT nombre FROM mesas WHERE id = :m', [':m' => $r['mesa_id']]);
    anotarEnBitacora($yo, 'sentó a alguien automáticamente', 'asignacion_mesas',
                     $confirmacion, ($mesaInfo['nombre'] ?? ''));

    responderBien([
        'mensaje' => 'Quedó en ' . ($mesaInfo['nombre'] ?? 'una mesa') . '.',
        'mesa_id' => $r['mesa_id'],
    ]);
    break;


/* Solo lee: propone dónde sentaría a alguien sentar_auto, SIN escribir
   nada. La usa el agente de mesas (Paso 5) para mostrar una propuesta
   con motivo antes de pedir confirmación — ver previsualizarAsientoPara()
   en _lib/mesas.php, que es el mismo cálculo que sentar_auto usa de
   verdad, para que la propuesta nunca diga una cosa y asigne otra. */
case 'sugerir_asiento':
    exigirMetodo('GET');
    $confirmacion = campoEntero($_GET, 'confirmacion_id', 1);
    $acompanante  = campoEntero($_GET, 'acompanante_id', 0);   // Fase 9

    $r = previsualizarAsientoPara($confirmacion, $acompanante);
    if (!$r['ok']) responderMal($r['error'], 400);

    responderBien($r);
    break;


case 'fijar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);
    $acompanante  = campoEntero($datos, 'acompanante_id', 0);   // Fase 9

    if ($acompanante > 0) {
        $fila = consultarUno(
            'SELECT fijada FROM asignacion_mesas_persona WHERE acompanante_id = :a',
            [':a' => $acompanante]
        );
        if (!$fila) responderMal('Esa persona no está sentada en ninguna mesa.', 404);

        $nuevo = ((int) $fila['fijada'] === 1) ? 0 : 1;
        ejecutar('UPDATE asignacion_mesas_persona SET fijada = :f WHERE acompanante_id = :a',
                 [':f' => $nuevo, ':a' => $acompanante]);

        responderBien([
            'fijada'  => $nuevo === 1,
            'mensaje' => $nuevo
                ? 'Fijado: el acomodo automático ya no lo va a mover.'
                : 'Liberado: el acomodo automático puede moverlo.',
        ]);
    }

    $fila = consultarUno('SELECT fijada FROM asignacion_mesas WHERE confirmacion_id = :c',
                         [':c' => $confirmacion]);
    if (!$fila) responderMal('Esa persona no está sentada en ninguna mesa.', 404);

    $nuevo = ((int) $fila['fijada'] === 1) ? 0 : 1;
    ejecutar('UPDATE asignacion_mesas SET fijada = :f WHERE confirmacion_id = :c',
             [':f' => $nuevo, ':c' => $confirmacion]);

    responderBien([
        'fijada'  => $nuevo === 1,
        'mensaje' => $nuevo
            ? 'Fijado: el acomodo automático ya no lo va a mover.'
            : 'Liberado: el acomodo automático puede moverlo.',
    ]);
    break;


case 'vaciar':
    exigirMetodo('POST');
    $datos = cuerpoJson(false);

    if (!empty($datos['todo'])) {
        ejecutar('DELETE FROM asignacion_mesas');
        anotarEnBitacora($yo, 'vació TODO el acomodo', 'asignacion_mesas');
        responderBien(['mensaje' => 'Se vaciaron todas las mesas, incluso las fijadas.']);
    }

    ejecutar('DELETE FROM asignacion_mesas WHERE fijada = 0');
    anotarEnBitacora($yo, 'vació el acomodo', 'asignacion_mesas');
    responderBien(['mensaje' => 'Se vaciaron las mesas. Lo fijado quedó como estaba.']);
    break;


/* ─── GRUPOS ──────────────────────────────────────────────────────────── */

case 'guardar_grupo':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $valores = [
        'nombre' => campoTexto($datos, 'nombre', 80),
        'color'  => campoTexto($datos, 'color', 20),
        'orden'  => campoEntero($datos, 'orden', 0, 999, 50),
        'notas'  => campoTexto($datos, 'notas', 1000),
    ];
    if ($valores['nombre'] === '') responderMal('El grupo necesita un nombre.', 400);

    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        actualizar('grupos_invitados', $id, $valores);
        responderBien(['id' => $id]);
    }

    $repetido = consultarUno('SELECT id FROM grupos_invitados WHERE nombre = :n',
                             [':n' => $valores['nombre']]);
    if ($repetido) responderMal('Ya existe un grupo con ese nombre.', 409);

    responderBien(['id' => insertar('grupos_invitados', $valores)], 201);
    break;

case 'borrar_grupo':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // Los invitados quedan sin grupo, no se borran (ON DELETE SET NULL).
    borrar('grupos_invitados', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Grupo eliminado. Sus invitados quedaron sin grupo.']);
    break;


/* ─── PREFERENCIAS DE UN INVITADO ─────────────────────────────────────── */

case 'preferencia':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacion = campoEntero($datos, 'confirmacion_id', 1);

    $grupo = campoEntero($datos, 'grupo_id', 0);
    $mesa  = campoEntero($datos, 'mesa_preferida', 0);

    /* REPLACE INTO borra la fila anterior y escribe la nueva. Sirve acá
       porque la clave primaria es el id de la confirmación: hay una
       preferencia por invitado, ni más ni menos. */
    ejecutar(
        'REPLACE INTO preferencias_invitado
           (confirmacion_id, grupo_id, sillas_extra, mesa_preferida, notas)
         VALUES (:c, :g, :s, :m, :n)',
        [
            ':c' => $confirmacion,
            ':g' => $grupo > 0 ? $grupo : null,
            ':s' => campoEntero($datos, 'sillas_extra', 0, 20),
            ':m' => $mesa > 0 ? $mesa : null,
            ':n' => campoTexto($datos, 'notas', 300),
        ]
    );

    /* Si cambiaron las sillas extra, la asignación que ya existía tiene
       el número viejo. Se actualiza para que las cuentas no mientan. */
    $gente = consultarUno(
        'SELECT c.adultos, c.ninos, p.sillas_extra
         FROM confirmaciones c
         LEFT JOIN preferencias_invitado p ON p.confirmacion_id = c.id
         WHERE c.id = :id',
        [':id' => $confirmacion]
    );
    if ($gente) {
        ejecutar('UPDATE asignacion_mesas SET lugares = :l WHERE confirmacion_id = :c',
                 [':l' => lugaresQueOcupa($gente), ':c' => $confirmacion]);
    }

    responderBien(['mensaje' => 'Guardado.']);
    break;


/* ─── PELEAS ──────────────────────────────────────────────────────────── */

case 'pelea':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    /* Fase 9: si vienen acompanante_a/acompanante_b, la regla es entre
     * DOS PERSONAS puntuales (aunque sean de la misma familia). Si no,
     * es la de siempre: entre dos familias completas (invitado_a/b,
     * los ids de confirmación). Los dos casos van a la misma tabla,
     * distinguidos por qué columnas tienen valor — ver la nota de
     * indiceDePeleas() en _lib/mesas.php sobre cuándo se hace cumplir
     * cada una. */
    $acompA = campoEntero($datos, 'acompanante_a', 0);
    $acompB = campoEntero($datos, 'acompanante_b', 0);

    if ($acompA > 0 && $acompB > 0) {
        if ($acompA === $acompB) responderMal('No se puede pelear con uno mismo.', 400);
        if ($acompA > $acompB) { $t = $acompA; $acompA = $acompB; $acompB = $t; }

        $yaEsta = consultarUno(
            'SELECT id FROM incompatibilidades WHERE acompanante_a = :a AND acompanante_b = :b',
            [':a' => $acompA, ':b' => $acompB]
        );
        if ($yaEsta) responderMal('Esa regla ya estaba puesta.', 409);

        /* invitado_a/invitado_b siguen siendo NOT NULL en la tabla: se
         * completan con los ids de las confirmaciones de cada persona,
         * así una fila de este tipo también es válida para el motor
         * viejo si alguna vez hiciera falta leerla sin las columnas
         * nuevas — nunca quedan en 0, que rompería esa fila. */
        $familias = consultarTodo(
            'SELECT id, confirmacion_id FROM acompanantes WHERE id IN (:a, :b)',
            [':a' => $acompA, ':b' => $acompB]
        );
        $confDe = [];
        foreach ($familias as $f) $confDe[(int) $f['id']] = (int) $f['confirmacion_id'];
        if (!isset($confDe[$acompA]) || !isset($confDe[$acompB])) {
            responderMal('Esas personas no existen.', 404);
        }

        /* ⚠️ La llave única de la tabla (invitado_a, invitado_b) se
         * pensó para una fila por PAR DE FAMILIAS. Si dos personas de
         * la MISMA familia (mismo invitado_a=invitado_b calculado
         * arriba) necesitan cada una su propia pelea individual con
         * alguien más de esa familia, dos filas distintas podrían
         * chocar contra esa llave — un caso raro (hermanos peleados con
         * dos personas distintas de su propia familia) que la tabla no
         * contempló. Se atrapa acá con un mensaje claro en vez de dejar
         * pasar el error crudo de MySQL. */
        try {
            // intentando() (ver _lib/bd.php): sin esto el choque contra
            // la llave única salía por responderMal() con un 500 crudo,
            // y el mensaje explicativo de abajo —escrito justo para ese
            // caso— no se mostraba nunca.
            $id = intentando(function () use ($confDe, $acompA, $acompB, $datos) {
                return insertar('incompatibilidades', [
                    'invitado_a'    => $confDe[$acompA],
                    'invitado_b'    => $confDe[$acompB],
                    'acompanante_a' => $acompA,
                    'acompanante_b' => $acompB,
                    'motivo'        => campoTexto($datos, 'motivo', 200),
                ]);
            });
        } catch (PDOException $e) {
            responderMal(
                'No se pudo guardar esta regla puntual — probablemente porque ya hay ' .
                'otra pelea entre estas mismas dos familias. Avísale a quien mantiene el ' .
                'panel si esto se repite seguido.',
                409, $e->getMessage()
            );
        }

        responderBien(['id' => $id, 'mensaje' => 'Anotado: no se van a sentar juntos.'], 201);
    }

    $a = campoEntero($datos, 'invitado_a', 1);
    $b = campoEntero($datos, 'invitado_b', 1);

    if ($a === $b) responderMal('No se puede pelear con uno mismo.', 400);

    // Siempre el id más chico primero: así "A con B" y "B con A" son la
    // misma fila y el índice único hace su trabajo.
    if ($a > $b) { $t = $a; $a = $b; $b = $t; }

    $yaEsta = consultarUno(
        'SELECT id FROM incompatibilidades WHERE invitado_a = :a AND invitado_b = :b',
        [':a' => $a, ':b' => $b]
    );
    if ($yaEsta) responderMal('Esa regla ya estaba puesta.', 409);

    $id = insertar('incompatibilidades', [
        'invitado_a' => $a,
        'invitado_b' => $b,
        'motivo'     => campoTexto($datos, 'motivo', 200),
    ]);

    responderBien(['id' => $id, 'mensaje' => 'Anotado: no se van a sentar juntos.'], 201);
    break;

case 'borrar_pelea':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    borrar('incompatibilidades', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Regla eliminada.']);
    break;


/* ─── ACOMODO AUTOMÁTICO AL CONFIRMAR ─────────────────────────────────── */

case 'auto_al_confirmar':
    exigirAdministrador();
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $prender = !empty($datos['prender']) ? '1' : '0';

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('auto_al_confirmar', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [':v' => $prender, ':v2' => $prender]
    );

    responderBien([
        'prendido' => $prender === '1',
        'mensaje'  => $prender === '1'
            ? 'Listo: cada confirmación nueva se va a sentar sola.'
            : 'Apagado: las confirmaciones nuevas quedan sin mesa.',
    ]);
    break;


/* ─── FASE 9: REGLAS POR PERSONA ───────────────────────────────────────── */

/*
   Sacar a alguien de su familia le da su propio grupo y/o mesa
   preferida, independiente del resto — a partir de ahí el motor la
   trata como su propia unidad para sentar (ver panoramaDeMesas() en
   _lib/mesas.php). Mandar grupo_id=0 Y mesa_preferida=0 juntos la
   DEVUELVE a viajar con su familia (se borra la fila): no hace falta
   una acción de "borrar" aparte.
*/
case 'regla_persona':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $acompanante = campoEntero($datos, 'acompanante_id', 1);
    $grupo       = campoEntero($datos, 'grupo_id', 0);
    $mesa        = campoEntero($datos, 'mesa_preferida', 0);
    $notas       = campoTexto($datos, 'notas', 300);

    $persona = consultarUno('SELECT id, nombre FROM acompanantes WHERE id = :a',
                            [':a' => $acompanante]);
    if (!$persona) responderMal('Esa persona no existe.', 404);

    if ($grupo === 0 && $mesa === 0 && $notas === '') {
        ejecutar('DELETE FROM acompanante_reglas WHERE acompanante_id = :a',
                 [':a' => $acompanante]);
        // Si tenía su propia silla asignada, se la lleva puesta al
        // volver al bloque familiar: no tiene sentido que siga
        // "sentada aparte" alguien que ya no tiene regla propia.
        ejecutar('DELETE FROM asignacion_mesas_persona WHERE acompanante_id = :a',
                 [':a' => $acompanante]);

        anotarEnBitacora($yo, 'devolvió a alguien a su familia', 'acompanante_reglas',
                         $acompanante, $persona['nombre']);
        responderBien(['mensaje' => $persona['nombre'] . ' vuelve a viajar con su familia.']);
    }

    ejecutar(
        'REPLACE INTO acompanante_reglas (acompanante_id, grupo_id, mesa_preferida, notas)
         VALUES (:a, :g, :m, :n)',
        [
            ':a' => $acompanante,
            ':g' => $grupo > 0 ? $grupo : null,
            ':m' => $mesa > 0 ? $mesa : null,
            ':n' => $notas,
        ]
    );

    anotarEnBitacora($yo, 'sacó a alguien de su familia para sentarlo aparte',
                     'acompanante_reglas', $acompanante, $persona['nombre']);
    responderBien(['mensaje' => $persona['nombre'] . ' ahora se sienta por su cuenta.']);
    break;


case 'personas_de':
    exigirMetodo('GET');
    $confirmacion = campoEntero($_GET, 'confirmacion_id', 1);

    $personas = consultarTodo(
        'SELECT a.id, a.nombre, a.tipo,
                r.grupo_id, r.mesa_preferida, r.notas,
                g.nombre AS grupo_nombre,
                am.mesa_id
         FROM acompanantes a
         LEFT JOIN acompanante_reglas r ON r.acompanante_id = a.id
         LEFT JOIN grupos_invitados g   ON g.id = r.grupo_id
         LEFT JOIN asignacion_mesas_persona am ON am.acompanante_id = a.id
         WHERE a.confirmacion_id = :c
         ORDER BY a.nombre',
        [':c' => $confirmacion]
    );

    responderBien(array_map(function ($p) {
        return [
            'id'             => (int) $p['id'],
            'nombre'         => $p['nombre'],
            'tipo'           => $p['tipo'],
            'tiene_regla'    => $p['grupo_id'] !== null || $p['mesa_preferida'] !== null
                              || ($p['notas'] ?? '') !== '',
            'grupo_id'       => $p['grupo_id'] ? (int) $p['grupo_id'] : null,
            'grupo_nombre'   => $p['grupo_nombre'],
            'mesa_preferida' => $p['mesa_preferida'] ? (int) $p['mesa_preferida'] : null,
            'mesa_id'        => $p['mesa_id'] ? (int) $p['mesa_id'] : null,
            'notas'          => $p['notas'] ?? '',
        ];
    }, $personas));
    break;


/* ─── QUIÉN SE SIENTA EN UNA MESA, PERSONA POR PERSONA ────────────────────
   GET ?accion=detalle_mesa&mesa_id=N

   Devuelve a cada invitado de esa mesa con su plato y su alergia. Es la
   hoja que hace falta el día de la fiesta: el mesero necesita saber que en
   la mesa 3 hay dos vegetarianos y alguien alérgico a los mariscos, y
   quiénes son — ese cruce no existía en ningún lado, había que entrar
   invitado por invitado.

   La gente llega a una mesa por dos caminos distintos y hay que mirar los
   dos: por familia entera (asignacion_mesas, una fila por confirmación) o
   individualmente (asignacion_mesas_persona, cuando a alguien se lo sentó
   aparte). Un mismo acompañante podría aparecer por los dos lados, así que
   se descarta el repetido al unir. */
case 'detalle_mesa':
    exigirMetodo('GET');
    $mesaId = campoEntero($_GET, 'mesa_id', 1);

    $porFamilia = existeTabla('acompanantes')
        ? consultarTodo(
            'SELECT a.id, a.nombre, a.tipo, a.menu, a.alergias, c.nombre AS familia
             FROM asignacion_mesas am
             JOIN confirmaciones c ON c.id = am.confirmacion_id
             JOIN acompanantes a   ON a.confirmacion_id = c.id
             WHERE am.mesa_id = :m
             ORDER BY c.nombre, a.id',
            [':m' => $mesaId])
        : [];

    $porPersona = existeTabla('asignacion_mesas_persona')
        ? consultarTodo(
            'SELECT a.id, a.nombre, a.tipo, a.menu, a.alergias, c.nombre AS familia
             FROM asignacion_mesas_persona ap
             JOIN acompanantes a       ON a.id = ap.acompanante_id
             LEFT JOIN confirmaciones c ON c.id = a.confirmacion_id
             WHERE ap.mesa_id = :m
             ORDER BY a.id',
            [':m' => $mesaId])
        : [];

    $vistos = [];
    $gente  = [];
    foreach (array_merge($porFamilia, $porPersona) as $fila) {
        $id = (int) $fila['id'];
        if (isset($vistos[$id])) continue;
        $vistos[$id] = true;

        $alergia = trim((string) ($fila['alergias'] ?? ''));
        $sinAlergia = $alergia === '' ||
                      preg_match('/^(ninguna|ninguno|no|n\/a|-)$/i', $alergia) === 1;

        $gente[] = [
            'id'       => $id,
            'nombre'   => (string) $fila['nombre'],
            'tipo'     => (string) $fila['tipo'],
            'menu'     => (string) ($fila['menu'] ?? ''),
            'alergias' => $sinAlergia ? '' : $alergia,
            'familia'  => (string) ($fila['familia'] ?? ''),
        ];
    }

    responderBien(['gente' => $gente]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
