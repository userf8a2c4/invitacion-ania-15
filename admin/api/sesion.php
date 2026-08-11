<?php
/* ══════════════════════════════════════════════════════════════════════
   SESION.PHP · ENTRAR Y SALIR DEL PANEL

   QUÉ HACE ESTE ARCHIVO
   Es el único endpoint que se puede llamar SIN sesión, porque es el que
   la crea. Todo lo demás del panel exige un token válido.

   QUÉ SE LE PUEDE PEDIR
     POST  ?accion=entrar     correo + contraseña  →  devuelve el token
     POST  ?accion=salir      cierra esta sesión
     POST  ?accion=salir_todo cierra la sesión en todos los dispositivos
     GET   ?accion=quien      dice quién está usando el panel ahora
     POST  ?accion=cambiar    cambia la contraseña propia

   POR QUÉ EL ERROR DE LOGIN NO DICE QUÉ FALLÓ
   Si dijera "ese correo no existe", cualquiera podría averiguar qué
   correos tienen cuenta probando uno por uno. El mensaje es el mismo
   para correo inexistente y contraseña equivocada.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$accion = (string) ($_GET['accion'] ?? '');

switch ($accion) {

    /* ─── ENTRAR ──────────────────────────────────────────────────────── */
    case 'entrar':
        exigirMetodo('POST');

        // El corte seco se revisa ANTES de tocar la base de datos, para
        // que un script en bucle no genere ni una consulta. El umbral es
        // alto a propósito (INTENTOS_ANTES_DE_CORTAR_SECO): esto es para
        // frenar un ataque, no para juzgar si alguien acertó o no.
        if (estaFrenadoDelTodo()) {
            responderMal(
                'Demasiados intentos seguidos. Espera ' . MINUTOS_DE_FRENO . ' minutos.',
                429
            );
        }

        $datos      = cuerpoJson();
        $correo     = mb_strtolower(campoTexto($datos, 'correo', 190));
        $contrasena = (string) ($datos['contrasena'] ?? '');

        if ($correo === '' || $contrasena === '') {
            responderMal('Escribe tu correo y tu contraseña.', 400);
        }

        $usuario = consultarUno(
            'SELECT id, nombre, correo, password_hash, rol, activo
             FROM usuarios WHERE correo = :c',
            [':c' => $correo]
        );

        // Un solo mensaje para los tres casos: no existe, contraseña mal,
        // o cuenta desactivada. Así no se filtra qué correos tienen cuenta.
        $malo = !$usuario
             || (int) $usuario['activo'] !== 1
             || !contrasenaCorrecta($contrasena, $usuario['password_hash']);

        /* El freno normal se evalúa ACÁ, después de saber si la
         * contraseña era correcta, y solo importa cuando de verdad
         * falló. Frenar a alguien que acaba de escribir la contraseña
         * bien no protege nada —si la sabe, ya está adentro— y era
         * justo lo que volvía inusable el panel con el bug anterior. */
        if ($malo) {
            if (estaFrenadoPorFallos()) {
                responderMal(
                    'Demasiados intentos fallidos. Espera ' . MINUTOS_DE_FRENO . ' minutos.',
                    429
                );
            }
            anotarIntentoFallido($correo);
            responderMal('Correo o contraseña incorrectos.', 401);
        }

        limpiarIntentos();
        $token = crearSesion($usuario['id']);

        responderBien([
            'token'   => $token,
            'usuario' => [
                'id'            => (int) $usuario['id'],
                'nombre'        => $usuario['nombre'],
                'correo'        => $usuario['correo'],
                'rol'           => $usuario['rol'],
                // Panel de métricas (Fase 8): nunca por rol, solo por
                // correo exacto — ver esObservador().
                'es_observador' => esObservador($usuario),
            ],
            'dias_de_sesion' => DIAS_DE_SESION,
        ]);
        break;

    /* ─── QUIÉN SOY ───────────────────────────────────────────────────── */
    // La app llama esto al abrir: si el token guardado sigue sirviendo,
    // entra directo sin pedir contraseña. Si no, muestra el login.
    case 'quien':
        exigirMetodo('GET');
        $usuario = exigirSesion();
        $usuario['es_observador'] = esObservador($usuario);
        responderBien(['usuario' => $usuario]);
        break;

    /* ─── SALIR ───────────────────────────────────────────────────────── */
    case 'salir':
        exigirMetodo('POST');
        $token = tokenDeLaPeticion();
        if ($token) cerrarSesion($token);
        // Siempre responde bien: si el token ya no servía, el resultado
        // buscado (quedar afuera) igual se cumplió.
        responderBien(['mensaje' => 'Sesión cerrada.']);
        break;

    case 'salir_todo':
        exigirMetodo('POST');
        $usuario = exigirSesion();
        cerrarTodasLasSesiones($usuario['id']);
        responderBien(['mensaje' => 'Se cerró la sesión en todos los dispositivos.']);
        break;

    /* ─── CAMBIAR LA CONTRASEÑA PROPIA ────────────────────────────────── */
    case 'cambiar':
        exigirMetodo('POST');
        $usuario = exigirSesion();
        $datos   = cuerpoJson();

        $actual = (string) ($datos['actual'] ?? '');
        $nueva  = (string) ($datos['nueva'] ?? '');

        // Se pide la contraseña actual aunque ya haya sesión: si alguien
        // deja el teléfono desbloqueado, que no pueda quedarse con la
        // cuenta cambiándole la clave.
        $fila = consultarUno(
            'SELECT password_hash FROM usuarios WHERE id = :id',
            [':id' => $usuario['id']]
        );
        if (!$fila || !contrasenaCorrecta($actual, $fila['password_hash'])) {
            responderMal('La contraseña actual no es correcta.', 401);
        }

        $problema = problemaDeContrasena($nueva);
        if ($problema) responderMal($problema, 400);

        actualizar('usuarios', $usuario['id'], [
            'password_hash' => hashearContrasena($nueva),
        ]);

        // Cambiar la contraseña echa a todos los dispositivos, incluido
        // este. Es lo que se espera si se cambia porque alguien entró.
        cerrarTodasLasSesiones($usuario['id']);
        anotarEnBitacora($usuario, 'cambió su contraseña', 'usuarios', $usuario['id']);

        responderBien(['mensaje' => 'Contraseña cambiada. Vuelve a entrar.']);
        break;

    default:
        responderMal('Acción desconocida.', 404);
}
