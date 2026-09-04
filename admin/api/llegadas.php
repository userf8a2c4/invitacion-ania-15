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
    responderMal('No encuentro la lista de invitados. Avísale a quien instaló el panel.', 500);
}
if (!existeTabla('llegadas')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
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
        /* intentando() (ver _lib/bd.php): sin esto el catch de abajo
           era decorativo — el choque contra el UNIQUE KEY salía por
           responderMal() con un 500, y la persona de la puerta veía
           "no se pudo guardar" en un pase que SÍ había entrado. Es el
           caso que este bloque dice atender desde que se escribió. */
        try {
            intentando(function () use ($fila, $yo) {
                insertar('llegadas', [
                    'confirmacion_id' => $fila['id'],
                    'marcado_por'     => (int) ($yo['id'] ?? 0),
                ]);
                anotarEnBitacora($yo, 'marcó una llegada', 'llegadas', $fila['id'],
                                 (string) ($fila['nombre'] ?? ''));
            });
        } catch (Throwable $e) {
            // Choque por el UNIQUE KEY: alguien más lo marcó un instante
            // antes. No es un error del que haya que avisar como tal.
            error_log('[Ania XV · llegadas] ' . $e->getMessage());
        }
    }

    // $fila se leyó ANTES del INSERT/UPDATE de arriba, así que todavía no
    // tiene el llegada_en recién puesto (marcar una llegada nueva
    // respondía ya_llego:false, y la tarjeta volvía a mostrar el botón
    // "Dejar pasar" en vez del estado confirmado — un doble toque de
    // ahí adentro sí contaba como "reintento" de verdad, ensuciando el
    // contador). Se vuelve a leer para responder con el estado real.
    $fila = buscarConfirmacionPorCodigo($codigo);
    responderBien(datosParaLaPuerta($fila));
    break;


/* ─── RESUMEN: CUÁNTOS LLEGARON ────────────────────────────────────────── */

case 'resumen':
    exigirMetodo('GET');

    $filaAsistian = consultarUno(
        "SELECT COALESCE(SUM(adultos + ninos), 0) AS n FROM confirmaciones WHERE asiste = 1"
    );
    /* ⚠️ ACÁ SE CONTABAN FAMILIAS Y SE COMPARABAN CONTRA PERSONAS
       (corregido 2026-09-03). Este COUNT(*) devolvía confirmaciones marcadas
       —una familia de cuatro que cruza junta se marca una vez— y la pantalla
       Hoy lo pintaba como fracción de `personas_esperadas`, con barra de
       progreso al porcentaje (30-vista-hoy.js). Son unidades distintas: con
       120 personas repartidas en 40 familias, el contador nunca podía pasar
       de 40/120 y la barra decía 33 % con el salón lleno. Era la cifra más
       grande de la pantalla del día del evento, y siempre estaba mal.

       Marcar el pase de una familia significa que esa familia entró: sumar
       sus `adultos + ninos` es la lectura honesta del dato que ya se tiene,
       sin preguntarle nada más a nadie en la puerta. Las familias se siguen
       devolviendo aparte, porque son el número que de verdad describe
       cuántas veces se escaneó. */
    $filaLlegaron = consultarUno(
        'SELECT COALESCE(SUM(c.adultos + c.ninos), 0) AS personas,
                COUNT(*) AS grupos
         FROM llegadas l
         JOIN confirmaciones c ON c.id = l.confirmacion_id
         WHERE c.asiste = 1'
    );

    $filaReintentos = consultarUno(
        'SELECT COUNT(*) AS n FROM llegadas WHERE intentos > 0'
    );

    responderBien([
        'personas_llegaron'       => (int) ($filaLlegaron['personas'] ?? 0),
        'personas_esperadas'      => (int) ($filaAsistian['n'] ?? 0),
        'grupos_llegaron'         => (int) ($filaLlegaron['grupos'] ?? 0),
        // Se mantiene el nombre viejo un tiempo por si alguna pantalla
        // quedó sin actualizar: mismo valor que grupos_llegaron.
        'confirmaciones_llegaron' => (int) ($filaLlegaron['grupos'] ?? 0),
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

    // El JOIN a usuarios es para poder decir QUIÉN dejó pasar este pase
    // la primera vez, si se vuelve a leer después de ya haber entrado
    // (ver datosParaLaPuerta) — mismo patrón que _lib/sesion.php y
    // api/metricas.php.
    return consultarUno(
        'SELECT c.*, l.llegada_en, l.marcado_por, l.intentos,
                u.nombre AS marcado_por_nombre
         FROM confirmaciones c
         LEFT JOIN llegadas l ON l.confirmacion_id = c.id
         LEFT JOIN usuarios u ON u.id = l.marcado_por
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
        // Quién lo dejó pasar la primera vez, y cuántas veces se volvió
        // a leer el mismo pase después de eso — para que la tarjeta de
        // "ya había entrado" diga algo más que solo la hora.
        'marcado_por_nombre' => $fila['marcado_por_nombre'] ?? null,
        'intentos'           => (int) ($fila['intentos'] ?? 0),
    ];
}
