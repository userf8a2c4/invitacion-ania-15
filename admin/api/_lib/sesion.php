<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/SESION.PHP · QUIÉN ESTÁ USANDO EL PANEL

   QUÉ HACE ESTE ARCHIVO
   Decide si quien manda una petición tiene permiso. Cada endpoint del
   panel llama a exigirSesion() en su primera línea; si el token no sirve,
   la petición muere ahí con un 401 y no llega a tocar la base de datos.

   POR QUÉ TOKEN Y NO LA SESIÓN NORMAL DE PHP
   Las sesiones de PHP viajan en una cookie. En una PWA instalada en
   iPhone, Safari borra las cookies que no se usaron en unos 7 días, así
   que el panel echaría a la gente cada semana sin motivo aparente. Un
   token guardado por la app en localStorage no sufre esa limpieza.

   POR QUÉ EL TOKEN SE GUARDA HASHEADO
   En la tabla `sesiones` no está el token, sino su huella SHA-256. Si
   alguien llegara a leer la tabla, no podría entrar al panel con lo que
   ve: tendría huellas, no llaves. Es la misma idea de guardar contraseñas
   hasheadas, aplicada a las sesiones.

   POR QUÉ hash_equals Y NO ==
   Comparar textos con == tarda distinto según cuántas letras coincidan, y
   midiendo esos microsegundos se puede adivinar un token letra por letra.
   hash_equals siempre tarda lo mismo y cierra esa puerta.

   ÍNDICE
     1. Crear y cerrar sesiones
     2. Exigir sesión en un endpoint
     3. Contraseñas
     4. Freno de intentos de login
     5. Bitácora
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';
require_once __DIR__ . '/responder.php';

/** Cuántos días vive un token antes de pedir contraseña otra vez. */
const DIAS_DE_SESION = 90;

/** Intentos fallidos de login permitidos antes de frenar. */
const INTENTOS_MAXIMOS = 8;

/** Cuántos minutos dura el freno cuando se agotan los intentos. */
const MINUTOS_DE_FRENO = 15;


/* ─── 1. CREAR Y CERRAR SESIONES ──────────────────────────────────────── */

/**
 * Crea una sesión nueva para un usuario y devuelve el token en claro.
 *
 * El token en claro se devuelve UNA sola vez, acá; después ya no se puede
 * recuperar porque en la base solo queda su huella.
 *
 * @param int $usuarioId
 * @return string El token que la app va a guardar.
 */
function crearSesion($usuarioId) {
    // 32 bytes al azar de una fuente criptográfica. No usar rand() ni
    // uniqid(): son predecibles y se pueden adivinar.
    $token = bin2hex(random_bytes(32));

    insertar('sesiones', [
        'usuario_id' => (int) $usuarioId,
        'token_hash' => hash('sha256', $token),
        'caduca_en'  => date('Y-m-d H:i:s', strtotime('+' . DIAS_DE_SESION . ' days')),
        'ultimo_uso' => date('Y-m-d H:i:s'),
    ]);

    // Aprovechamos para tirar la basura: sesiones vencidas de cualquiera.
    ejecutar('DELETE FROM sesiones WHERE caduca_en < NOW()');

    return $token;
}

/**
 * Cierra la sesión que corresponde a un token.
 *
 * @param string $token
 * @return void
 */
function cerrarSesion($token) {
    ejecutar(
        'DELETE FROM sesiones WHERE token_hash = :h',
        [':h' => hash('sha256', $token)]
    );
}

/**
 * Cierra TODAS las sesiones de un usuario, en todos sus dispositivos.
 *
 * Sirve cuando alguien pierde el teléfono o se le cambia la contraseña.
 *
 * @param int $usuarioId
 * @return void
 */
function cerrarTodasLasSesiones($usuarioId) {
    ejecutar('DELETE FROM sesiones WHERE usuario_id = :u', [':u' => (int) $usuarioId]);
}


/* ─── 2. EXIGIR SESIÓN EN UN ENDPOINT ─────────────────────────────────── */

/**
 * Lee el token del encabezado Authorization de la petición.
 *
 * Viene con el formato estándar:  Authorization: Bearer abc123...
 *
 * @return string|null El token, o null si no vino ninguno.
 */
function tokenDeLaPeticion() {
    $cabeceras = [];

    // getallheaders() no existe en todas las configuraciones de Apache,
    // por eso hay respaldo leyendo directamente de $_SERVER.
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $nombre => $valor) {
            $cabeceras[strtolower($nombre)] = $valor;
        }
    }
    $crudo = $cabeceras['authorization']
          ?? $_SERVER['HTTP_AUTHORIZATION']
          ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
          ?? '';

    if (preg_match('/^Bearer\s+(\S+)$/i', trim($crudo), $coincide)) {
        return $coincide[1];
    }
    return null;
}

/**
 * Devuelve el usuario de la sesión, o null si no hay sesión válida.
 *
 * @return array|null Fila del usuario, sin la contraseña.
 */
function usuarioActual() {
    static $usuario = false;          // false = todavía no se averiguó
    if ($usuario !== false) return $usuario;

    $token = tokenDeLaPeticion();
    if (!$token) return $usuario = null;

    $fila = consultarUno(
        'SELECT s.id AS sesion_id, s.token_hash, s.caduca_en,
                u.id, u.nombre, u.correo, u.rol, u.activo
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = :h',
        [':h' => hash('sha256', $token)]
    );

    if (!$fila)                                   return $usuario = null;
    if (!hash_equals($fila['token_hash'], hash('sha256', $token))) return $usuario = null;
    if (strtotime($fila['caduca_en']) < time())   return $usuario = null;
    if ((int) $fila['activo'] !== 1)              return $usuario = null;

    // Cada uso corre la caducidad hacia adelante: quien entra seguido no
    // tiene que volver a escribir la contraseña nunca.
    ejecutar(
        'UPDATE sesiones SET ultimo_uso = NOW(), caduca_en = :c WHERE id = :id',
        [
            ':c'  => date('Y-m-d H:i:s', strtotime('+' . DIAS_DE_SESION . ' days')),
            ':id' => $fila['sesion_id'],
        ]
    );

    unset($fila['token_hash'], $fila['sesion_id'], $fila['caduca_en']);
    return $usuario = $fila;
}

/**
 * Exige sesión. Si no hay, corta la petición con 401 y no devuelve nada.
 *
 * Va en la PRIMERA línea de cada endpoint del panel, sin excepción salvo
 * el propio login.
 *
 * @return array El usuario que está usando el panel.
 */
function exigirSesion() {
    $usuario = usuarioActual();
    if (!$usuario) {
        responderMal('Tu sesión expiró. Volvé a entrar.', 401);
    }
    return $usuario;
}

/**
 * Exige que además sea administrador.
 *
 * @return array
 */
function exigirAdministrador() {
    $usuario = exigirSesion();
    if (($usuario['rol'] ?? '') !== 'admin') {
        responderMal('No tenés permiso para hacer esto.', 403);
    }
    return $usuario;
}


/* ─── 3. CONTRASEÑAS ──────────────────────────────────────────────────── */

/**
 * Convierte una contraseña en su hash para guardarla.
 *
 * PASSWORD_DEFAULT usa bcrypt hoy y se actualizará solo si PHP cambia de
 * algoritmo. Nunca se guarda la contraseña tal cual.
 *
 * @param string $contrasena
 * @return string
 */
function hashearContrasena($contrasena) {
    return password_hash($contrasena, PASSWORD_DEFAULT);
}

/**
 * Comprueba una contraseña contra su hash guardado.
 *
 * @param string $contrasena
 * @param string $hash
 * @return bool
 */
function contrasenaCorrecta($contrasena, $hash) {
    return password_verify($contrasena, $hash);
}

/**
 * Revisa que una contraseña nueva sea razonable.
 *
 * No se piden símbolos raros ni mayúsculas obligatorias: esas reglas
 * empujan a la gente a poner "Password1!" y anotarla en un papel. Largo
 * mínimo generoso y listo.
 *
 * @param string $contrasena
 * @return string|null El problema encontrado, o null si está bien.
 */
function problemaDeContrasena($contrasena) {
    if (mb_strlen($contrasena) < 10) {
        return 'La contraseña necesita al menos 10 caracteres.';
    }
    if (mb_strlen($contrasena) > 200) {
        return 'La contraseña es demasiado larga.';
    }
    return null;
}


/* ─── 4. FRENO DE INTENTOS DE LOGIN ───────────────────────────────────── */

/**
 * Dice si esta IP está frenada por fallar demasiadas veces.
 *
 * Sin esto, alguien puede probar contraseñas en automático toda la noche.
 *
 * @return bool
 */
function estaFrenado() {
    $fila = consultarUno(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)',
        [':ip' => ipDeLaPeticion(), ':min' => MINUTOS_DE_FRENO]
    );
    return $fila && (int) $fila['n'] >= INTENTOS_MAXIMOS;
}

/**
 * Anota un intento fallido.
 *
 * @param string $correo Con qué correo se intentó (para revisar después).
 * @return void
 */
function anotarIntentoFallido($correo) {
    insertar('intentos_login', [
        'ip'     => ipDeLaPeticion(),
        'correo' => mb_substr($correo, 0, 190),
    ]);
    // Limpieza: lo viejo ya no frena a nadie y solo ocupa lugar.
    ejecutar('DELETE FROM intentos_login WHERE cuando < DATE_SUB(NOW(), INTERVAL 1 DAY)');
}

/**
 * Borra los intentos de esta IP tras un login exitoso.
 *
 * @return void
 */
function limpiarIntentos() {
    ejecutar('DELETE FROM intentos_login WHERE ip = :ip', [':ip' => ipDeLaPeticion()]);
}

/**
 * Devuelve la IP de quien hace la petición.
 *
 * No se confía en X-Forwarded-For: ese encabezado lo puede escribir
 * cualquiera y serviría para esquivar el freno cambiándolo en cada
 * intento. REMOTE_ADDR lo pone el servidor y no se puede falsear.
 *
 * @return string
 */
function ipDeLaPeticion() {
    return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
}


/* ─── 5. BITÁCORA ─────────────────────────────────────────────────────── */

/**
 * Anota quién cambió qué. Para eso se pidieron cuentas separadas.
 *
 * @param array  $usuario Quien hizo el cambio (el de exigirSesion()).
 * @param string $accion  'creó', 'editó', 'borró'…
 * @param string $tabla   Sobre qué tabla.
 * @param int    $filaId  Sobre qué fila.
 * @param string $detalle Texto libre opcional.
 * @return void
 */
function anotarEnBitacora($usuario, $accion, $tabla, $filaId = 0, $detalle = '') {
    insertar('bitacora', [
        'usuario_id'     => (int) ($usuario['id'] ?? 0),
        'usuario_nombre' => mb_substr($usuario['nombre'] ?? '?', 0, 100),
        'accion'         => mb_substr($accion, 0, 40),
        'tabla_afectada' => mb_substr($tabla, 0, 60),
        'fila_id'        => (int) $filaId,
        'detalle'        => mb_substr($detalle, 0, 500),
    ]);
}
