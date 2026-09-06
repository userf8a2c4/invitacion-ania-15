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

/**
 * Las cinco preguntas de seguridad entre las que se puede elegir.
 *
 * Es una lista FIJA a propósito, no texto libre: una pregunta inventada
 * por la propia persona tiende a ser débil ("¿cuál es mi color favorito?"
 * con la respuesta ya puesta en la foto de perfil). Estas cinco son
 * clásicas porque la respuesta no cambia con el tiempo y no es algo que
 * cualquiera que te conozca un poco adivine a la primera.
 *
 * Se usa acá (sesion.php, para guardar/verificar) y se repite tal cual en
 * codigo/04-sesion.js y codigo/20-arranque.js (para mostrarla en el
 * formulario) — si se cambia una lista hay que cambiar la otra.
 */
const PREGUNTAS_DE_SEGURIDAD = [
    '¿Cuál fue tu primer trabajo?',
    '¿Cómo se llamaba tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál era tu comida favorita de niño?',
    '¿Cuál era tu apodo de la infancia?',
];

/**
 * Deja una respuesta de seguridad lista para comparar: sin espacios de
 * más ni diferencias de mayúsculas, para que "Summer", "summer " y
 * "SUMMER" cuenten como la misma respuesta.
 *
 * @param string $respuesta
 * @return string
 */
function normalizarRespuestaSeguridad($respuesta) {
    return mb_strtolower(trim(preg_replace('/\s+/', ' ', (string) $respuesta)));
}

/* Cuántos días vive un token antes de pedir contraseña otra vez.
 *
 * ⚡ 60 DÍAS (2026-09-05). Eran 90. Se bajaron a 30 al conectar los
 * pagos —un teléfono perdido eran tres meses de acceso al dinero— y
 * subieron a 60 en el mismo día por un motivo mejor: faltan menos de
 * dos meses para la fiesta, así que 60 días cubre todo lo que queda sin
 * obligar a nadie a volver a entrar en la semana del evento, que es
 * cuando menos ganas hay de pelear con una pantalla de login.
 *
 * Lo que protege el dinero no es este número: es que cobrar exige
 * volver a escribir la contraseña (ver exigirContrasenaDeNuevo en
 * compras.php). Esta sesión larga da acceso a ver y organizar, no a
 * mover plata. */
const DIAS_DE_SESION = 60;

/**
 * Cuánto puede durar una sesión COMO MÁXIMO, desde que se abrió.
 *
 * Cada uso corre la caducidad otros DIAS_DE_SESION hacia adelante. Sin
 * un tope, un token usado a diario no vencía nunca: un teléfono perdido
 * o prestado conservaba el acceso para siempre.
 *
 * Un año da de sobra para organizar la fiesta —faltan menos de tres
 * meses— sin que nadie tenga que volver a escribir la contraseña por
 * culpa de este límite.
 */
const DIAS_MAXIMOS_DE_SESION = 365;

/** Intentos fallidos de login permitidos antes de frenar. */
const INTENTOS_MAXIMOS = 8;

/**
 * Corte seco: a partir de acá no se mira ni la contraseña.
 *
 * El freno normal (INTENTOS_MAXIMOS) se evalúa DESPUÉS de comprobar la
 * contraseña, para que quien la sabe pueda entrar aunque haya fallado
 * antes (ver api/sesion.php). Eso significa una consulta a la base por
 * intento — aceptable para una persona, no para un script en bucle.
 *
 * Este segundo techo, mucho más alto, sí corta antes de tocar la base:
 * nadie escribiendo a mano llega a cincuenta intentos en un cuarto de
 * hora, y un ataque automatizado los pasa en segundos.
 */
const INTENTOS_ANTES_DE_CORTAR_SECO = 50;

/** Cuántos minutos dura el freno cuando se agotan los intentos. */
const MINUTOS_DE_FRENO = 15;

/**
 * La marca que distingue, dentro de `intentos_login`, las filas que
 * cuentan peticiones a la API de las que cuentan intentos de login
 * fallidos. La tabla hace las dos cosas para no crear una segunda casi
 * idéntica (ver excedioLimiteDeApi más abajo).
 *
 * ⚠️ QUIEN CUENTE INTENTOS DE LOGIN TIENE QUE EXCLUIR ESTA MARCA.
 * Olvidarlo fue un error real: estaFrenado() contaba TODAS las filas de
 * la IP, así que las peticiones normales del panel —varias por
 * pantalla— llenaban el contador de login. Bastaban unos segundos de
 * uso para que el siguiente ingreso quedara bloqueado quince minutos,
 * con la contraseña correcta y sin un solo intento fallido de verdad.
 */
const MARCA_DE_PETICION_API = '__api__';

/**
 * Techo de peticiones por IP a TODA la API del panel, no solo el login.
 *
 * Es generoso a propósito: nadie usando el panel a mano llega ni cerca.
 * Está para frenar un script que martillara la API en bucle, no para
 * molestar a Lucila un día muy activo.
 */
const PETICIONES_API_MAXIMAS = 300;

/** En cuántos minutos se cuentan esas peticiones. */
const MINUTOS_DE_VENTANA_API = 5;


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

    /* Las columnas del organigrama (puede_escanear, puede_ver_dinero…)
       las agrega instalar.php a una tabla `usuarios` que ya existía. En
       una instalación que todavía no corrió esa migración no existen
       todavía, y pedirlas en el SELECT reventaría el login entero — por
       eso se arman a mano según lo que columnasDe() encuentre. */
    $colsUsuarios = columnasDe('usuarios');
    $colsEspeciales = array_values(array_filter(
        ['perfil', 'puede_escanear', 'puede_ver_dinero', 'puede_borrar', 'puede_crear_cuentas',
         'pregunta_seguridad'],
        function ($c) use ($colsUsuarios) { return in_array($c, $colsUsuarios, true); }
    ));
    $selectEspeciales = $colsEspeciales
        ? ', ' . implode(', ', array_map(function ($c) { return "u.`$c`"; }, $colsEspeciales))
        : '';

    $fila = consultarUno(
        'SELECT s.id AS sesion_id, s.token_hash, s.caduca_en, s.creado_en,
                u.id, u.nombre, u.correo, u.rol, u.activo' . $selectEspeciales . '
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = :h',
        [':h' => hash('sha256', $token)]
    );

    if (!$fila)                                   return $usuario = null;
    if (!hash_equals($fila['token_hash'], hash('sha256', $token))) return $usuario = null;
    if (strtotime($fila['caduca_en']) < time())   return $usuario = null;
    if ((int) $fila['activo'] !== 1)              return $usuario = null;

    /* TOPE ABSOLUTO DESDE QUE SE ABRIÓ LA SESIÓN.
     *
     * Cada uso corre la caducidad hacia adelante, para que quien entra
     * seguido no tenga que escribir la contraseña nunca. El problema es
     * que "nunca" era literal: un token usado a diario no vencía jamás,
     * así que un teléfono perdido seguía teniendo acceso para siempre.
     *
     * Con el tope, la renovación sirve para la comodidad del día a día
     * pero la sesión igual termina alguna vez. */
    if (!empty($fila['creado_en'])) {
        $limite = strtotime($fila['creado_en']) + DIAS_MAXIMOS_DE_SESION * 86400;
        if (time() > $limite) {
            ejecutar('DELETE FROM sesiones WHERE id = :id',
                     [':id' => $fila['sesion_id']]);
            return $usuario = null;
        }
    }

    ejecutar(
        'UPDATE sesiones SET ultimo_uso = NOW(), caduca_en = :c WHERE id = :id',
        [
            ':c'  => date('Y-m-d H:i:s', strtotime('+' . DIAS_DE_SESION . ' days')),
            ':id' => $fila['sesion_id'],
        ]
    );

    unset($fila['token_hash'], $fila['sesion_id'], $fila['caduca_en'], $fila['creado_en']);
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
    if (excedioLimiteDeApi()) {
        responderMal('Demasiadas peticiones seguidas. Espera un momento.', 429);
    }
    anotarPeticionDeApi();

    $usuario = usuarioActual();
    if (!$usuario) {
        responderMal('Tu sesión expiró. Vuelve a entrar.', 401);
    }
    return $usuario;
}

/**
 * Dice si esta IP ya pasó el techo de peticiones a la API del panel.
 *
 * Reutiliza la tabla `intentos_login` con una marca propia en la columna
 * `correo` (que en este uso no es un correo, es solo una etiqueta) para
 * no tener que crear una tabla nueva solo para esto.
 *
 * @return bool
 */
function excedioLimiteDeApi() {
    $fila = consultarUno(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo = :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)',
        [':ip' => ipDeLaPeticion(), ':marca' => MARCA_DE_PETICION_API,
         ':min' => MINUTOS_DE_VENTANA_API]
    );
    return $fila && (int) $fila['n'] >= PETICIONES_API_MAXIMAS;
}

/**
 * Anota una petición a la API para el techo de arriba.
 *
 * La limpieza de lo viejo se hace de vez en cuando y no en cada llamada,
 * para no sumarle una consulta extra a cada petición del panel.
 *
 * @return void
 */
function anotarPeticionDeApi() {
    insertar('intentos_login', ['ip' => ipDeLaPeticion(), 'correo' => MARCA_DE_PETICION_API]);

    /* Cada petición autenticada anota una fila acá — con el techo de 300
       cada 5 minutos, son muchas filas por hora. Dos horas de margen
       alcanza de sobra (la ventana más larga que se mira es la de 15
       minutos del freno de login) y evita que la tabla crezca sin freno,
       que fue justo lo que agravó el bug de arriba. */
    if (random_int(1, 200) === 1) {
        ejecutar('DELETE FROM intentos_login WHERE cuando < DATE_SUB(NOW(), INTERVAL 2 HOUR)');
    }
}

/**
 * Exige que además sea administrador.
 *
 * @return array
 */
function exigirAdministrador() {
    $usuario = exigirSesion();
    if (($usuario['rol'] ?? '') !== 'admin') {
        responderMal('No tienes permiso para hacer esto.', 403);
    }
    return $usuario;
}


/* ─── 2b. EL ORGANIGRAMA: PERMISOS POR SECCIÓN ────────────────────────── */

/*
   CÓMO FUNCIONA

   El PERFIL (Manager, Banquete, DJ…) es solo una plantilla que vive en
   codigo/01-configuracion.js: sirve para pre-tildar casillas al crear
   una cuenta. Lo que de verdad manda acá es la tabla `permisos_usuario`,
   una fila por sección a la que se le dio 'ver' o 'editar'.

   'admin' pasa todo siempre — es exactamente el mismo comportamiento
   que ya tenía antes de este mecanismo, no se le agregó ninguna reja
   nueva a las cuentas que ya funcionaban así.

   CUENTAS 'entrada' YA EXISTENTES, ANTES DE ESTE MECANISMO
   Hasta acá, cualquier cuenta con sesión (admin o entrada) podía leer y
   escribir en mesas, invitados, contactos, etc. — la única reja real
   estaba en dinero, correo y borrar. Si de golpe TODAS las cuentas
   'entrada' pasaran a necesitar permisos explícitos, una cuenta de
   entrada que ya está en uso el día de hoy se quedaría afuera de todo
   sin que nadie lo haya decidido así.

   Por eso: una cuenta 'entrada' SIN ninguna fila en permisos_usuario
   sigue funcionando exactamente como antes (acceso a las secciones
   comunes). En cuanto se le asigna un perfil o se le toca una sola
   casilla desde Ajustes → Cuentas, esa cuenta pasa al modo estricto:
   de ahí en más solo ve lo que tiene marcado.
*/

/**
 * Dice si un usuario tiene, como mínimo, el nivel pedido en una sección.
 *
 * @param array  $usuario
 * @param string $seccion   Ej. 'mesas', 'invitados', 'archivos'…
 * @param string $nivelMinimo 'ver' o 'editar'.
 * @return bool
 */
function tienePermiso($usuario, $seccion, $nivelMinimo = 'ver') {
    if (($usuario['rol'] ?? '') === 'admin') return true;
    if (!existeTabla('permisos_usuario')) return true;   // instalación vieja, sin migrar

    $filas = consultarTodo(
        'SELECT seccion, nivel FROM permisos_usuario WHERE usuario_id = :u',
        [':u' => (int) ($usuario['id'] ?? 0)]
    );

    // Cuenta sin ningún permiso configurado: modo viejo, no se restringe.
    if (!$filas) return true;

    foreach ($filas as $fila) {
        if ($fila['seccion'] !== $seccion) continue;
        if ($fila['nivel'] === 'editar') return true;
        if ($fila['nivel'] === 'ver' && $nivelMinimo === 'ver') return true;
    }
    return false;
}

/**
 * Exige el permiso, o corta la petición con 403.
 *
 * @param array  $usuario
 * @param string $seccion
 * @param string $nivelMinimo
 * @return array El mismo $usuario, para poder encadenar.
 */
function exigirPermiso($usuario, $seccion, $nivelMinimo = 'ver') {
    if (!tienePermiso($usuario, $seccion, $nivelMinimo)) {
        responderMal('No tienes permiso para ' .
            ($nivelMinimo === 'editar' ? 'editar esto.' : 'ver esto.'), 403);
    }
    return $usuario;
}

/**
 * Los cuatro permisos que no son una sección del panel.
 *
 * QUÉ PASA SI LA MIGRACIÓN NO CORRIÓ  (2026-09-04)
 *
 * Las columnas `puede_*` las agrega instalar.php a una tabla `usuarios`
 * que ya existía, y usuarioActual() solo las trae si columnasDe() las
 * encuentra. O sea que "la columna no está en $usuario" significa "esta
 * base no tiene el organigrama", no "a esta persona no se lo
 * configuraron".
 *
 * Hasta acá eso devolvía `true` para todos, y el resultado era que una
 * cuenta 'entrada' —la de la puerta— veía el presupuesto entero. Una
 * reja que se abre sola cuando falta un ALTER no es una reja.
 *
 * Pero invertir los CUATRO a "negar" tiene su propio filo: 'escanear'
 * es lo que deja pasar a los invitados, y negarlo convertiría "faltó
 * correr instalar.php" en "nadie entra a la fiesta", en la puerta, de
 * noche, con la gente esperando. Por eso el default se decide por lo
 * que protege cada permiso:
 *
 *   · ver_dinero, borrar, crear_cuentas → NEGAR. Lo que está en juego
 *     es que alguien vea o rompa lo que no debe; que Lucila (admin)
 *     pueda igual alcanza para seguir trabajando.
 *   · escanear → PERMITIR, y dejarlo anotado. Lo que está en juego es
 *     que la fiesta funcione, y esta acción no muestra nada privado:
 *     marca una llegada de alguien que ya tiene sesión.
 *
 * @param array  $usuario
 * @param string $clave 'escanear' | 'ver_dinero' | 'borrar' | 'crear_cuentas'
 * @return bool
 */
function tieneEspecial($usuario, $clave) {
    if (($usuario['rol'] ?? '') === 'admin') return true;

    $columna = 'puede_' . $clave;

    if (!array_key_exists($columna, $usuario)) {
        error_log('[Ania XV · sesion] `usuarios` no tiene ' . $columna .
                  ' — hay que correr admin/api/instalar.php.');
        // Solo el de la puerta sigue abierto. Ver la nota de arriba.
        return $clave === 'escanear';
    }

    return (int) $usuario[$columna] === 1;
}

/**
 * Dice si esta cuenta es la observadora del panel de métricas (Fase 7
 * del rediseño) — la de Carlos, el constructor, no la de nadie más.
 *
 * A PROPÓSITO NO USA EL MISMO CRITERIO QUE tieneEspecial(): esa función
 * le da acceso automático a CUALQUIER cuenta con rol 'admin', y acá el
 * documento pide justo lo contrario — que sea SOLO una cuenta puntual,
 * aunque Lucila también tenga rol admin. Por eso se compara contra un
 * correo exacto guardado en el .env del servidor (OBSERVADOR_CORREO),
 * nunca contra el rol.
 *
 * Sin esa variable configurada, nadie es observador — por defecto
 * cerrado, no abierto, que es lo correcto para algo que se pidió "solo
 * para mi cuenta".
 *
 * @param array $usuario
 * @return bool
 */
function esObservador($usuario) {
    $correoObservador = env('OBSERVADOR_CORREO', '');
    if ($correoObservador === '') return false;

    return mb_strtolower((string) ($usuario['correo'] ?? '')) ===
           mb_strtolower($correoObservador);
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
 * El corte seco: para antes de mirar la contraseña, igual que hacía el
 * freno único de antes. Cuenta TODO lo de esta IP —intentos de login y
 * marcas de API por igual— porque acá el objetivo es nada más frenar un
 * script que martillara el endpoint en bucle, no juzgar si alguien sabe
 * la contraseña.
 *
 * @return bool
 */
function estaFrenadoDelTodo() {
    // Excluye la marca de API, igual que estaFrenadoPorFallos(): contar
    // todo junto era el mismo bug de siempre, solo que con un techo más
    // alto (50) que igual usar la app en casa —más la precarga en
    // segundo plano de la Fase 8.2— alcanza a rozar sin que nadie haya
    // escrito una contraseña ni una sola vez.
    $fila = consultarUno(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo <> :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)',
        [':ip' => ipDeLaPeticion(), ':marca' => MARCA_DE_PETICION_API,
         ':min' => MINUTOS_DE_FRENO]
    );
    return $fila && (int) $fila['n'] >= INTENTOS_ANTES_DE_CORTAR_SECO;
}

/**
 * El freno normal, por contraseñas equivocadas de verdad.
 *
 * A PROPÓSITO excluye la marca de API (MARCA_DE_PETICION_API): esas
 * filas no son intentos de login, y contarlas fue el bug que bloqueaba
 * a alguien por el simple hecho de usar el panel. Se llama DESPUÉS de
 * comprobar la contraseña, y solo importa si era la incorrecta — ver
 * api/sesion.php.
 *
 * @return bool
 */
function estaFrenadoPorFallos() {
    $fila = consultarUno(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo <> :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)',
        [':ip' => ipDeLaPeticion(), ':marca' => MARCA_DE_PETICION_API,
         ':min' => MINUTOS_DE_FRENO]
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
 * Borra los intentos FALLIDOS de esta IP tras un login exitoso.
 *
 * No toca las marcas de API (MARCA_DE_PETICION_API): esas siguen su
 * propia cuenta para el techo general de peticiones, que no tiene nada
 * que ver con haber entrado bien o mal.
 *
 * @return void
 */
function limpiarIntentos() {
    ejecutar(
        'DELETE FROM intentos_login WHERE ip = :ip AND correo <> :marca',
        [':ip' => ipDeLaPeticion(), ':marca' => MARCA_DE_PETICION_API]
    );
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
