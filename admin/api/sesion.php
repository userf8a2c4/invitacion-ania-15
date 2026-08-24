<?php
/* ══════════════════════════════════════════════════════════════════════
   SESION.PHP · ENTRAR Y SALIR DEL PANEL

   QUÉ HACE ESTE ARCHIVO
   Es el único endpoint que se puede llamar SIN sesión, porque es el que
   la crea. Todo lo demás del panel exige un token válido.

   QUÉ SE LE PUEDE PEDIR
     POST  ?accion=entrar      correo + contraseña  →  devuelve el token
     POST  ?accion=salir       cierra esta sesión
     POST  ?accion=salir_todo  cierra la sesión en todos los dispositivos
     GET   ?accion=quien       dice quién está usando el panel ahora
     POST  ?accion=cambiar            cambia la contraseña propia
     POST  ?accion=pregunta_seguridad pone/cambia la pregunta de seguridad propia
     POST  ?accion=recuperar          pide un código para restablecer la contraseña
     POST  ?accion=restablecer        confirma el código y pone la contraseña nueva

   POR QUÉ EL ERROR DE LOGIN NO DICE QUÉ FALLÓ
   Si dijera "ese correo no existe", cualquiera podría averiguar qué
   correos tienen cuenta probando uno por uno. El mensaje es el mismo
   para correo inexistente y contraseña equivocada. La misma idea se
   repite en 'recuperar' más abajo, y por el mismo motivo.

   POR QUÉ 'recuperar' PIDE ADEMÁS LA PREGUNTA DE SEGURIDAD
   Antes alcanzaba con escribir el correo para que llegara un código: si
   alguien tenía el teléfono de Lucila un minuto y ese minuto coincidía
   con revisar el correo, podía pedir el código él mismo. Ahora hace
   falta ADEMÁS acertar la pregunta y la respuesta que esa cuenta
   configuró en Ajustes → Mi cuenta — sin eso, ni siquiera se manda el
   código. Una cuenta que todavía no configuró su pregunta (ver
   'pregunta_seguridad' abajo) no puede recuperarse por este camino
   todavía: alguien con rol admin le puede poner una contraseña nueva a
   mano desde Ajustes → Cuentas (usuarios.php?accion=clave).
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/correo.php';

/** Cuántos minutos vive un código de recuperación antes de vencer. */
const MINUTOS_DE_CODIGO_RECUPERACION = 30;

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

        /* Ya NO se frena por contraseñas equivocadas —eso era la molestia
         * real: alguien tipeando mal un par de veces terminaba esperando
         * 15 minutos igual, aunque el bug de la Fase 8.1 ya no mezclara
         * los intentos con el tráfico normal de la API. Se sigue
         * ANOTANDO cada intento fallido (por si algún día hace falta
         * revisar quién probó qué), pero no bloquea a nadie.
         *
         * La única defensa que queda es estaFrenadoDelTodo(), arriba:
         * el corte duro por volumen total de pedidos (50 en 15 minutos,
         * cuente lo que cuente), que sí frena un script en bucle sin
         * estorbarle nunca a una persona escribiendo a mano. */
        if ($malo) {
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
                // Panel de métricas (Fase 7): nunca por rol, solo por
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

    /* ─── PREGUNTA DE SEGURIDAD PROPIA ──────────────────────────────────── */

    /* La configura cada cuenta para sí misma, desde Ajustes → Mi cuenta.
     * Igual que 'cambiar', pide la contraseña actual: es la manera de que
     * alguien con el teléfono desbloqueado un minuto no pueda dejar
     * puesta una pregunta que después le sirva a ÉL para recuperar la
     * cuenta ajena. */
    case 'pregunta_seguridad':
        exigirMetodo('POST');
        $usuario = exigirSesion();
        $datos   = cuerpoJson();

        $actual    = (string) ($datos['actual'] ?? '');
        $pregunta  = (string) ($datos['pregunta'] ?? '');
        $respuesta = normalizarRespuestaSeguridad($datos['respuesta'] ?? '');

        $fila = consultarUno(
            'SELECT password_hash FROM usuarios WHERE id = :id',
            [':id' => $usuario['id']]
        );
        if (!$fila || !contrasenaCorrecta($actual, $fila['password_hash'])) {
            responderMal('La contraseña actual no es correcta.', 401);
        }

        if (!in_array($pregunta, PREGUNTAS_DE_SEGURIDAD, true)) {
            responderMal('Elige una de las preguntas de la lista.', 400);
        }
        if (mb_strlen($respuesta) < 2) {
            responderMal('La respuesta es demasiado corta.', 400);
        }

        actualizar('usuarios', $usuario['id'], [
            'pregunta_seguridad'       => $pregunta,
            'respuesta_seguridad_hash' => hashearContrasena($respuesta),
        ]);

        anotarEnBitacora($usuario, 'configuró su pregunta de seguridad', 'usuarios', $usuario['id']);
        responderBien(['mensaje' => 'Pregunta de seguridad guardada.']);
        break;

    /* ─── OLVIDÉ MI CONTRASEÑA: PEDIR EL CÓDIGO ─────────────────────────── */

    /* Manda un código de 6 dígitos al correo de la cuenta, si existe.
     *
     * SIEMPRE responde con el mismo mensaje, exista o no ese correo — el
     * mismo motivo que el login (ver arriba): si el mensaje cambiara
     * según el caso, cualquiera podría usar este formulario para
     * averiguar qué correos tienen cuenta en el panel. */
    case 'recuperar':
        exigirMetodo('POST');

        if (estaFrenadoDelTodo()) {
            responderMal(
                'Demasiados intentos seguidos. Espera ' . MINUTOS_DE_FRENO . ' minutos.',
                429
            );
        }

        $datos     = cuerpoJson();
        $correo    = mb_strtolower(campoTexto($datos, 'correo', 190));
        $pregunta  = (string) ($datos['pregunta'] ?? '');
        $respuesta = normalizarRespuestaSeguridad($datos['respuesta'] ?? '');

        // Cuenta como intento de la misma bolsa que el login: pedir el
        // código muchas veces seguidas es exactamente el mismo tipo de
        // abuso que probar contraseñas, y ya hay un freno hecho para eso.
        anotarIntentoFallido($correo);

        if ($correo !== '' && $pregunta !== '' && $respuesta !== '') {
            $usuario = consultarUno(
                'SELECT id, nombre, correo, pregunta_seguridad, respuesta_seguridad_hash
                 FROM usuarios WHERE correo = :c AND activo = 1',
                [':c' => $correo]
            );

            // Hace falta la cuenta Y la pregunta configurada Y que la
            // respuesta coincida — cualquiera de las tres cosas que falte
            // corta acá, antes de mandar nada. Ver la nota del encabezado
            // sobre por qué se pide esto además del correo.
            $vale = $usuario
                && ($usuario['pregunta_seguridad'] ?? '') !== ''
                && ($usuario['respuesta_seguridad_hash'] ?? '') !== ''
                && $pregunta === $usuario['pregunta_seguridad']
                && password_verify($respuesta, $usuario['respuesta_seguridad_hash']);

            if ($vale) {
                // Solo el código más nuevo sirve: los anteriores sin usar
                // quedan invalidados, así no queda dando vueltas un código
                // viejo por si alguien pidió varios de una vez.
                ejecutar(
                    'UPDATE recuperaciones_clave SET usado = 1 WHERE usuario_id = :u AND usado = 0',
                    [':u' => $usuario['id']]
                );

                $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

                insertar('recuperaciones_clave', [
                    'usuario_id'  => $usuario['id'],
                    'codigo_hash' => hash('sha256', $codigo),
                    'expira_en'   => date('Y-m-d H:i:s',
                        strtotime('+' . MINUTOS_DE_CODIGO_RECUPERACION . ' minutes')),
                ]);

                $html =
                    '<p>Hola ' . htmlspecialchars($usuario['nombre'], ENT_QUOTES, 'UTF-8') . ',</p>' .
                    '<p>Este es tu código para poner una contraseña nueva en el panel de Ania XV:</p>' .
                    '<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">' .
                        htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8') .
                    '</p>' .
                    '<p>Vale por ' . MINUTOS_DE_CODIGO_RECUPERACION . ' minutos. Si tú no lo pediste, ' .
                    'ignora este correo: con solo el código no alcanza para entrar, así que ' .
                    'tu cuenta sigue segura.</p>';

                try {
                    enviarCorreo($usuario['correo'], 'Código para restablecer tu contraseña', $html);
                } catch (Exception $e) {
                    // No se le informa al navegador que el envío falló: eso
                    // también filtraría si el correo existe o no. Queda en
                    // el registro del servidor para revisarlo después.
                    error_log('[Ania XV · recuperar clave] No se pudo enviar: ' . $e->getMessage());
                }
            }
        }

        responderBien([
            'mensaje' => 'Si ese correo tiene una cuenta, te mandamos un código. Revisa la bandeja de entrada (y spam).',
        ]);
        break;

    /* ─── OLVIDÉ MI CONTRASEÑA: CONFIRMAR EL CÓDIGO ─────────────────────── */

    case 'restablecer':
        exigirMetodo('POST');

        if (estaFrenadoDelTodo()) {
            responderMal(
                'Demasiados intentos seguidos. Espera ' . MINUTOS_DE_FRENO . ' minutos.',
                429
            );
        }

        $datos  = cuerpoJson();
        $correo = mb_strtolower(campoTexto($datos, 'correo', 190));
        $codigo = preg_replace('/\D/', '', (string) ($datos['codigo'] ?? ''));
        $nueva  = (string) ($datos['nueva'] ?? '');

        if ($correo === '' || $codigo === '' || $nueva === '') {
            responderMal('Faltan datos.', 400);
        }

        $problema = problemaDeContrasena($nueva);
        if ($problema) responderMal($problema, 400);

        $usuario = consultarUno(
            'SELECT id FROM usuarios WHERE correo = :c AND activo = 1',
            [':c' => $correo]
        );

        // Mismo mensaje genérico para "ese correo no existe", "el código
        // está mal" y "el código venció": nada de esto se distingue desde
        // afuera, igual que el login no distingue correo de contraseña.
        $sirve = false;

        if ($usuario) {
            $fila = consultarUno(
                'SELECT id, codigo_hash FROM recuperaciones_clave
                 WHERE usuario_id = :u AND usado = 0 AND expira_en > NOW()
                 ORDER BY id DESC LIMIT 1',
                [':u' => $usuario['id']]
            );

            if ($fila && hash_equals($fila['codigo_hash'], hash('sha256', $codigo))) {
                $sirve = true;

                actualizar('recuperaciones_clave', $fila['id'], ['usado' => 1]);
                actualizar('usuarios', $usuario['id'], [
                    'password_hash' => hashearContrasena($nueva),
                ]);
                cerrarTodasLasSesiones($usuario['id']);
                anotarEnBitacora(
                    ['id' => $usuario['id'], 'nombre' => 'Recuperación por correo'],
                    'restableció su contraseña por correo', 'usuarios', $usuario['id']
                );
            }
        }

        if (!$sirve) {
            anotarIntentoFallido($correo);
            responderMal('Código incorrecto o vencido.', 401);
        }

        limpiarIntentos();
        responderBien(['mensaje' => 'Contraseña cambiada. Ya puedes entrar con la nueva.']);
        break;

    default:
        responderMal('Acción desconocida.', 404);
}
