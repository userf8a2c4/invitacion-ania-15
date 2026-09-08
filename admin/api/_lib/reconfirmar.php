<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/RECONFIRMAR.PHP · VOLVER A PEDIR LA CONTRASENA

   QUE HACE ESTE ARCHIVO
   Una sola cosa: exigir que quien esta del otro lado vuelva a escribir
   su contrasena antes de una accion que no tiene vuelta atras. Y
   recordar que ya lo hizo, para no preguntarselo cinco veces seguidas.

   ⚡ POR QUE BAJO ACA (2026-09-07)
   Vivia dentro de compras.php, que es un ENDPOINT: lo primero que hace
   al cargarse es exigirAdministrador() y despues ejecuta su propio
   switch sobre ?accion=. O sea que incluirlo desde otro archivo para
   reusar una funcion corria el endpoint entero.

   Es exactamente el mismo motivo por el que elCobroEstaActivo() bajo a
   _lib/pagos.php dos dias antes. Cuando una regla la necesita un
   segundo archivo, baja a _lib/ — no se copia.

   Lo necesito desde borrado_final.php: borrar los datos de los
   invitados es la accion mas irreversible del panel, y no tiene por que
   pedir menos que un cobro.

   POR QUE LOS NOMBRES DICEN "DINERO"
   Porque nacio para eso. Se dejan como estaban a proposito: renombrar
   seis constantes y una marca de base de datos, a dias de la fiesta,
   es mover riesgo sin ganar nada. La marca `__dinero__` de
   `intentos_login` ademas conviene compartida: cinco intentos fallidos
   valen para TODAS las acciones delicadas juntas, no cinco para cada
   una.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/bd.php';
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/responder.php';

/* ══════════════════════════════════════════════════════════════════════
   VOLVER A DEMOSTRAR QUIÉN ERES, PARA TOCAR EL DINERO

   ⚡ POR QUÉ (2026-09-05)
   Hasta ahora, estar dentro del panel bastaba para agregar una tarjeta o
   disparar un cobro. Y las sesiones duran semanas: un teléfono
   desbloqueado, prestado o perdido era acceso directo al dinero, sin que
   nadie tuviera que saber ninguna contraseña.

   Es la misma idea que usa cualquier tienda seria —Amazon incluido— al
   pedir la contraseña otra vez para tocar un método de pago aunque
   acabes de entrar: la sesión dice que SIGUES ahí, no que SEAS tú.

   Se pide en las tres acciones que mueven dinero o pueden habilitarlo, y
   en ninguna otra.

   ⚡ Y VALE UN RATO, NO UNA SOLA VEZ (2026-09-05)
   Al principio se pedía en CADA cobro. Pero la idea de todo esto es que
   MegaBot le automatice las compras a Lucila con algo de fricción, no
   que la frene: si él le propone cinco cosas en una tarde, escribir la
   contraseña cinco veces deja de ser una guarda y pasa a ser un motivo
   para no usar el sistema. Y una guarda que empuja a la gente a
   esquivarla protege menos que una más floja que sí se usa.

   Lo que de verdad autoriza cada compra es que ella toque Confirmar en
   esa propuesta concreta: sin eso no se cobra nada, y eso no tiene
   atajo ni caducidad. La contraseña es la capa de abajo — demuestra que
   quien está del otro lado es ella y no alguien con su teléfono
   desbloqueado— y para eso alcanza con demostrarlo una vez cada tanto.

   LO QUE SE GUARDA ES UN SELLO, NUNCA LA CONTRASEÑA. Un timestamp y la
   IP desde donde se confirmó, en `ajustes`. La contraseña se compara
   contra el hash del login y se descarta en la misma línea.
   ══════════════════════════════════════════════════════════════════════ */

/** Cuánto vale haber escrito la contraseña, antes de volver a pedirla. */
const MINUTOS_DE_CONFIRMACION_DE_DINERO = 20;

/** Dónde se anota ese sello, por persona. */
function claveDelSelloDeDinero($usuarioId) {
    return 'dinero_confirmado_' . (int) $usuarioId;
}

/**
 * Si esta persona ya demostró hace poco que es ella, desde acá mismo.
 *
 * Se ata a la IP a propósito: un sello que valiera desde cualquier lado
 * sería un permiso que viaja con la sesión robada, que es justo lo que
 * esto tiene que evitar.
 *
 * @param array $yo
 * @return bool
 */
function confirmoHacePoco($yo) {
    if (!existeTabla('ajustes')) return false;

    $fila = consultarUno('SELECT valor FROM ajustes WHERE clave = :c',
                         [':c' => claveDelSelloDeDinero($yo['id'] ?? 0)]);
    if (!$fila) return false;

    $sello = json_decode((string) $fila['valor'], true);
    if (!is_array($sello)) return false;

    $cuando = (int) ($sello['cuando'] ?? 0);
    $desde  = (string) ($sello['ip'] ?? '');
    $ahora  = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if ($desde !== $ahora) return false;

    return (time() - $cuando) < (MINUTOS_DE_CONFIRMACION_DE_DINERO * 60);
}

/**
 * Anota que esta persona acaba de escribir bien su contraseña.
 *
 * @param array $yo
 * @return void
 */
function anotarQueConfirmo($yo) {
    if (!existeTabla('ajustes')) return;

    ejecutar(
        'INSERT INTO ajustes (clave, valor) VALUES (:c, :v)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [
            ':c' => claveDelSelloDeDinero($yo['id'] ?? 0),
            ':v' => json_encode([
                'cuando' => time(),
                'ip'     => substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45),
            ]),
        ]
    );
}

/** Cuántos intentos fallidos de contraseña se toleran, y en cuánto rato. */
const INTENTOS_DE_CLAVE_PARA_DINERO = 5;
const MINUTOS_DE_FRENO_DE_DINERO    = 15;
/** La marca propia en `intentos_login`, para no mezclar con el login. */
const MARCA_DE_CLAVE_PARA_DINERO = '__dinero__';

/**
 * Corta la petición si quien pide esto no reescribió su contraseña.
 *
 * El freno va ANTES de comprobar nada: sin él, este endpoint sería un
 * sitio cómodo para probar contraseñas una tras otra sin límite. Mismo
 * patrón y misma tabla que llaveDeArranqueCorrecta() (_lib/entorno.php).
 *
 * @param array $yo    El usuario de la sesión.
 * @param array $datos El cuerpo del POST.
 * @return void
 */
function exigirContrasenaDeNuevo($yo, $datos) {
    // Ya lo demostró hace poco y desde acá: no se le vuelve a pedir.
    if (confirmoHacePoco($yo)) return;

    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if (existeTabla('intentos_login')) {
        $fila = consultarUno(
            'SELECT COUNT(*) AS n FROM intentos_login
             WHERE ip = :ip AND correo = :marca
               AND cuando <= NOW()
               AND cuando > DATE_SUB(NOW(), INTERVAL ' . MINUTOS_DE_FRENO_DE_DINERO . ' MINUTE)',
            [':ip' => $ip, ':marca' => MARCA_DE_CLAVE_PARA_DINERO]
        );
        if ($fila && (int) $fila['n'] >= INTENTOS_DE_CLAVE_PARA_DINERO) {
            responderMal('Demasiados intentos con la contraseña. Espera '
                       . MINUTOS_DE_FRENO_DE_DINERO . ' minutos.', 429);
        }
    }

    /* Se lee del cuerpo crudo y NO con campoTexto(): esa función recorta
       y normaliza, y una contraseña tiene que compararse tal cual se
       escribió. */
    $contrasena = isset($datos['contrasena']) ? (string) $datos['contrasena'] : '';

    /* ⚡ 403 Y NUNCA 401 (2026-09-05)
     *
     * Con 401 esto echaba del panel. El panel trata TODO 401 como
     * "sesión vencida" y llama a manejarSesionVencida(), que borra el
     * token y manda al login (03-servidor.js:420) — con razón, porque
     * hasta ahora un 401 solo podía significar eso.
     *
     * O sea: escribir mal la contraseña, o cancelar, cerraba la sesión
     * entera. Una guarda que expulsa a quien se equivoca de tecla no es
     * una guarda, es una trampa.
     *
     * Y 403 es además lo correcto: 401 es "no sé quién eres"; acá sí se
     * sabe —la sesión es válida— lo que falta es autorización para ESTA
     * acción, que es exactamente un 403. Se descubrió probándolo contra
     * el servidor de pbe; leyendo el código no se veía. */
    if ($contrasena === '') {
        responderMal('Escribe tu contraseña para confirmar.', 403);
    }

    $fila = consultarUno('SELECT password_hash FROM usuarios WHERE id = :i',
                         [':i' => (int) ($yo['id'] ?? 0)]);

    if (!$fila || !contrasenaCorrecta($contrasena, (string) $fila['password_hash'])) {
        if (existeTabla('intentos_login')) {
            insertar('intentos_login', ['ip' => $ip, 'correo' => MARCA_DE_CLAVE_PARA_DINERO]);
        }
        responderMal('Esa no es tu contraseña.', 403);
    }

    // Era ella: no se lo volvemos a preguntar en un rato.
    anotarQueConfirmo($yo);
}
