<?php
/* ══════════════════════════════════════════════════════════════════════
   LLEGADAS.PHP · QUIÉN CRUZÓ LA PUERTA DE VERDAD

   QUÉ HACE ESTE ARCHIVO
   El escáner de la entrada (codigo/28-escaner.js) lo usa para saber, al
   leer un pase, si esa persona ya entró antes —y en ese caso a qué
   hora— y para marcarla como llegada recién cuando alguien toca "Dejar
   pasar".

   POR QUÉ NO SE TOCA `confirmaciones`
   Quién dijo que venía y quién llegó son datos distintos. Esta tabla
   vive aparte a propósito: mezclarla rompería las estadísticas de
   confirmación, que tienen que seguir contando lo mismo el 24 de
   octubre que contaban la semana anterior.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=consultar&codigo=XV-…   quién es y si ya llegó
     POST ?accion=marcar                  {codigo} — deja pasar
     GET  ?accion=resumen                 cuántos llegaron de cuántos
     GET  ?accion=ultimas&cuantas=10      las últimas en cruzar la puerta
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'consultar');

// El resumen lo puede ver cualquiera con sesión (es solo un número para
// Hoy); leer un pase y dejar pasar es del permiso especial 'escanear'.
if (in_array($accion, ['consultar', 'marcar'], true) && !tieneEspecial($yo, 'escanear')) {
    responderMal('No tienes permiso para escanear pases.', 403);
}

if (!existeTabla('confirmaciones')) {
    responderMal('La tabla de confirmaciones no existe en esta base de datos.', 500);
}
if (!existeTabla('llegadas')) {
    responderMal('Falta correr la migración: no existe la tabla llegadas.', 500);
}


switch ($accion) {

/* ─── CONSULTAR (sin marcar nada) ─────────────────────────────────────── */

case 'consultar':
    exigirMetodo('GET');

    $codigo = campoTexto($_GET, 'codigo', 40);
    if ($codigo === '') responderMal('Falta el código del pase.', 400);

    $fila = buscarConfirmacionPorCodigo($codigo);
    if (!$fila) responderMal('Ese código no corresponde a ningún pase.', 404);

    responderBien(datosParaLaPuerta($fila));
    break;


/* ─── MARCAR: DEJAR PASAR ──────────────────────────────────────────────── */

case 'marcar':
    exigirMetodo('POST');
    $datos  = cuerpoJson();
    $codigo = campoTexto($datos, 'codigo', 40);

    if ($codigo === '') responderMal('Falta el código del pase.', 400);

    $fila = buscarConfirmacionPorCodigo($codigo);
    if (!$fila) responderMal('Ese código no corresponde a ningún pase.', 404);

    // Ya idempotente por el UNIQUE KEY de la tabla: si dos personas leen
    // el mismo QR casi al mismo tiempo, la segunda inserción choca y acá
    // se detecta como "ya había llegado" en vez de fallar con un 500.
    $yaHabia = consultarUno(
        'SELECT id, llegada_en FROM llegadas WHERE confirmacion_id = :id',
        [':id' => $fila['id']]
    );

    if ($yaHabia) {
        // Un pase que se vuelve a leer DESPUÉS de haber entrado es
        // justo lo que la pantalla Hoy tiene que gritar: alguien puede
        // haberlo reenviado por WhatsApp para meter al doble de gente.
        ejecutar('UPDATE llegadas SET intentos = intentos + 1 WHERE id = :id',
                 [':id' => $yaHabia['id']]);
        error_log('[Ania XV · llegadas] Pase reintentado tras ya haber entrado: ' .
                  ($fila['nombre'] ?? $codigo));
    } else {
        try {
            insertar('llegadas', [
                'confirmacion_id' => $fila['id'],
                'marcado_por'     => (int) ($yo['id'] ?? 0),
            ]);
            anotarEnBitacora($yo, 'marcó una llegada', 'llegadas', $fila['id'],
                             (string) ($fila['nombre'] ?? ''));
        } catch (Throwable $e) {
            // Choque por el UNIQUE KEY: alguien más lo marcó un instante
            // antes. No es un error del que haya que avisar como tal.
            error_log('[Ania XV · llegadas] ' . $e->getMessage());
        }
    }

    responderBien(datosParaLaPuerta($fila));
    break;


/* ─── RESUMEN: CUÁNTOS LLEGARON ────────────────────────────────────────── */

case 'resumen':
    exigirMetodo('GET');

    $filaAsistian = consultarUno(
        "SELECT COALESCE(SUM(adultos + ninos), 0) AS n FROM confirmaciones WHERE asiste = 1"
    );
    $filaLlegaron = consultarUno(
        'SELECT COUNT(*) AS n FROM llegadas l
         JOIN confirmaciones c ON c.id = l.confirmacion_id
         WHERE c.asiste = 1'
    );

    $filaReintentos = consultarUno(
        'SELECT COUNT(*) AS n FROM llegadas WHERE intentos > 0'
    );

    // "llegaron" cuenta CONFIRMACIONES marcadas, no personas: una familia
    // de 4 que cruza junta se marca una vez. Para el contador grande de
    // Hoy alcanza con eso — contar personas exigiría saber cuántas de
    // cada grupo entraron por separado, que el escáner no pregunta.
    responderBien([
        'confirmaciones_llegaron' => (int) ($filaLlegaron['n'] ?? 0),
        'personas_esperadas'      => (int) ($filaAsistian['n'] ?? 0),
        'pases_reintentados'      => (int) ($filaReintentos['n'] ?? 0),
    ]);
    break;


/* ─── ÚLTIMAS LLEGADAS ─────────────────────────────────────────────────── */

case 'ultimas':
    exigirMetodo('GET');

    $cuantas = campoEntero($_GET, 'cuantas', 1, 30, 10);

    $conMesa = existeTabla('asignacion_mesas') && existeTabla('mesas');
    $selectMesa = $conMesa ? ', m.nombre AS mesa' : '';
    $joinMesa = $conMesa
        ? ' LEFT JOIN asignacion_mesas am ON am.confirmacion_id = c.id
            LEFT JOIN mesas m ON m.id = am.mesa_id'
        : '';

    $filas = consultarTodo(
        "SELECT l.llegada_en, l.intentos, c.nombre, c.alergias $selectMesa
         FROM llegadas l
         JOIN confirmaciones c ON c.id = l.confirmacion_id
         $joinMesa
         ORDER BY l.llegada_en DESC
         LIMIT $cuantas"
    );

    $resultado = array_map(function ($f) {
        $alergia = trim((string) ($f['alergias'] ?? ''));
        $tieneAlergia = $alergia !== '' &&
            !in_array(mb_strtolower($alergia), ['ninguna', 'ninguno', 'no', 'n/a', '-'], true);

        return [
            'nombre'      => $f['nombre'] ?? '',
            'llegada_en'  => $f['llegada_en'] ?? null,
            'mesa'        => $f['mesa'] ?? '',
            'tiene_alergia' => $tieneAlergia,
            'reintentado' => (int) ($f['intentos'] ?? 0) > 0,
        ];
    }, $filas);

    responderBien(['ultimas' => $resultado]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDA ───────────────────────────────────────────────────────────── */

/**
 * Busca una confirmación por su código de pase, y de paso trae si ya
 * está marcada como llegada.
 *
 * @param string $codigo
 * @return array|null
 */
function buscarConfirmacionPorCodigo($codigo) {
    if (!in_array('codigo', columnasDe('confirmaciones'), true)) return null;

    return consultarUno(
        'SELECT c.*, l.llegada_en
         FROM confirmaciones c
         LEFT JOIN llegadas l ON l.confirmacion_id = c.id
         WHERE c.codigo = :codigo',
        [':codigo' => $codigo]
    );
}

/**
 * Arma lo que necesita la pantalla de la puerta: nombre grande, cuántos
 * son, alergias, y si ya había llegado (con la hora).
 *
 * @param array $fila
 * @return array
 */
function datosParaLaPuerta($fila) {
    return [
        'confirmacion_id' => (int) $fila['id'],
        'codigo'          => $fila['codigo'] ?? '',
        'nombre'          => $fila['nombre'] ?? '',
        'asiste'          => (int) ($fila['asiste'] ?? 0) === 1,
        'adultos'         => (int) ($fila['adultos'] ?? 0),
        'ninos'           => (int) ($fila['ninos'] ?? 0),
        'alergias'        => $fila['alergias'] ?? '',
        'ya_llego'        => !empty($fila['llegada_en']),
        'llegada_en'      => $fila['llegada_en'] ?? null,
    ];
}
