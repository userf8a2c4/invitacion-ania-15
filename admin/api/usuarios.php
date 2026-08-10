<?php
/* ══════════════════════════════════════════════════════════════════════
   USUARIOS.PHP · QUIÉNES PUEDEN ENTRAR AL PANEL

   QUÉ HACE ESTE ARCHIVO
   Alta, baja y edición de las cuentas. Solo lo puede usar alguien con rol
   'admin': si no, cualquiera con la cuenta limitada de la entrada podría
   crearse una cuenta de administrador y ver el presupuesto.

   EL CASO ESPECIAL DEL PRIMER USUARIO
   Cuando la tabla `usuarios` está vacía no hay ningún admin que pueda
   crear al primero — el clásico problema del huevo y la gallina. Por eso
   la acción 'primero' funciona SIN sesión, pero solo mientras no exista
   ninguna cuenta, y además exige la llave del .env. En cuanto hay una
   cuenta, esa puerta se cierra sola para siempre.

   QUÉ SE LE PUEDE PEDIR
     POST ?accion=primero  crea la primera cuenta (solo si no hay ninguna)
     GET  ?accion=listar   lista las cuentas
     POST ?accion=crear    agrega una cuenta
     POST ?accion=editar   cambia nombre, correo, rol o si está activa
     POST ?accion=clave    le pone contraseña nueva a otra cuenta
     POST ?accion=borrar   elimina una cuenta
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$accion = (string) ($_GET['accion'] ?? '');

/* ─── EL PRIMER USUARIO ───────────────────────────────────────────────── */

if ($accion === 'primero') {
    exigirMetodo('POST');

    $cuantos = consultarUno('SELECT COUNT(*) AS n FROM usuarios');
    if ((int) ($cuantos['n'] ?? 0) > 0) {
        responderMal(
            'Ya existe al menos una cuenta. Pedile a esa persona que te cree la tuya.',
            403
        );
    }

    // Misma llave que el diagnóstico: quien conoce los secretos del
    // servidor es quien puede arrancar el panel.
    $datos = cuerpoJson();

    if (!llaveDeArranqueCorrecta($datos['llave'] ?? '')) {
        responderMal('Llave incorrecta.', 403);
    }

    $nombre     = campoTexto($datos, 'nombre', 100);
    $correo     = mb_strtolower(campoTexto($datos, 'correo', 190));
    $contrasena = (string) ($datos['contrasena'] ?? '');

    if ($nombre === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        responderMal('Hace falta un nombre y un correo válido.', 400);
    }
    $problema = problemaDeContrasena($contrasena);
    if ($problema) responderMal($problema, 400);

    $id = insertar('usuarios', [
        'nombre'        => $nombre,
        'correo'        => $correo,
        'password_hash' => hashearContrasena($contrasena),
        'rol'           => 'admin',
        'activo'        => 1,
    ]);

    responderBien([
        'mensaje' => 'Cuenta creada. Ya puedes entrar al panel.',
        'id'      => $id,
    ], 201);
}

/* ─── DE ACÁ EN ADELANTE, SOLO ADMINISTRADORES ────────────────────────── */

$yo = exigirAdministrador();

switch ($accion) {

    case 'listar':
        exigirMetodo('GET');
        // Nunca se devuelve password_hash, ni siquiera a un admin.
        $cuentas = consultarTodo(
            (hay_columna_usuarios('perfil')
                ? 'SELECT id, nombre, correo, rol, activo, creado_en,
                          perfil, puede_escanear, puede_ver_dinero,
                          puede_borrar, puede_crear_cuentas
                   FROM usuarios ORDER BY nombre'
                : 'SELECT id, nombre, correo, rol, activo, creado_en
                   FROM usuarios ORDER BY nombre')
        );

        if (existeTabla('permisos_usuario')) {
            foreach ($cuentas as &$cuenta) {
                $cuenta['permisos'] = consultarTodo(
                    'SELECT seccion, nivel FROM permisos_usuario WHERE usuario_id = :u',
                    [':u' => $cuenta['id']]
                );
            }
            unset($cuenta);
        }

        responderBien($cuentas);
        break;

    case 'crear':
        exigirMetodo('POST');
        $datos = cuerpoJson();

        $nombre     = campoTexto($datos, 'nombre', 100);
        $correo     = mb_strtolower(campoTexto($datos, 'correo', 190));
        $contrasena = (string) ($datos['contrasena'] ?? '');
        $rol        = campoOpcion($datos, 'rol', ['admin', 'entrada'], 'admin');

        if ($nombre === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            responderMal('Hace falta un nombre y un correo válido.', 400);
        }
        $problema = problemaDeContrasena($contrasena);
        if ($problema) responderMal($problema, 400);

        $repetido = consultarUno('SELECT id FROM usuarios WHERE correo = :c', [':c' => $correo]);
        if ($repetido) responderMal('Ya hay una cuenta con ese correo.', 409);

        $campos = [
            'nombre'        => $nombre,
            'correo'        => $correo,
            'password_hash' => hashearContrasena($contrasena),
            'rol'           => $rol,
            'activo'        => 1,
        ];
        if (hay_columna_usuarios('perfil')) {
            $campos += camposDelOrganigrama($datos);
        }

        $id = insertar('usuarios', $campos);
        guardarPermisosDeSeccion($id, $datos['permisos'] ?? null);

        anotarEnBitacora($yo, 'creó una cuenta', 'usuarios', $id, $correo);
        responderBien(['id' => $id], 201);
        break;

    case 'editar':
        exigirMetodo('POST');
        $datos = cuerpoJson();
        $id    = campoEntero($datos, 'id', 1);

        $usuario = consultarUno('SELECT id, correo, rol FROM usuarios WHERE id = :id', [':id' => $id]);
        if (!$usuario) responderMal('Esa cuenta no existe.', 404);

        $cambios = [];
        if (isset($datos['nombre'])) $cambios['nombre'] = campoTexto($datos, 'nombre', 100);
        if (isset($datos['rol']))    $cambios['rol']    = campoOpcion($datos, 'rol', ['admin', 'entrada'], $usuario['rol']);
        if (isset($datos['activo'])) $cambios['activo'] = !empty($datos['activo']) ? 1 : 0;
        if (hay_columna_usuarios('perfil')) {
            $cambios += camposDelOrganigrama($datos);
        }

        // Nadie puede quitarse a sí mismo el rol de admin ni desactivarse:
        // si es el único admin, el panel quedaría sin dueño y habría que
        // volver a entrar por phpMyAdmin a arreglarlo a mano.
        if ((int) $id === (int) $yo['id']) {
            unset($cambios['rol'], $cambios['activo']);
        }

        if ($cambios) {
            actualizar('usuarios', $id, $cambios);
            // Si se desactivó la cuenta, sus sesiones abiertas se cortan ya.
            if (isset($cambios['activo']) && $cambios['activo'] === 0) {
                cerrarTodasLasSesiones($id);
            }
            anotarEnBitacora($yo, 'editó una cuenta', 'usuarios', $id, $usuario['correo']);
        }

        if (array_key_exists('permisos', $datos)) {
            guardarPermisosDeSeccion($id, $datos['permisos']);
        }

        responderBien(['mensaje' => 'Cuenta actualizada.']);
        break;

    case 'clave':
        exigirMetodo('POST');
        $datos = cuerpoJson();
        $id    = campoEntero($datos, 'id', 1);
        $nueva = (string) ($datos['contrasena'] ?? '');

        $problema = problemaDeContrasena($nueva);
        if ($problema) responderMal($problema, 400);

        $usuario = consultarUno('SELECT correo FROM usuarios WHERE id = :id', [':id' => $id]);
        if (!$usuario) responderMal('Esa cuenta no existe.', 404);

        actualizar('usuarios', $id, ['password_hash' => hashearContrasena($nueva)]);
        cerrarTodasLasSesiones($id);

        anotarEnBitacora($yo, 'cambió la contraseña de otra cuenta', 'usuarios', $id, $usuario['correo']);
        responderBien(['mensaje' => 'Contraseña cambiada. Esa persona tendrá que entrar de nuevo.']);
        break;

    case 'borrar':
        exigirMetodo('POST');
        $datos = cuerpoJson();
        $id    = campoEntero($datos, 'id', 1);

        if ((int) $id === (int) $yo['id']) {
            responderMal('No puedes borrar tu propia cuenta.', 400);
        }

        // Que no quede el panel sin ningún administrador activo.
        $admins = consultarUno(
            "SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id <> :id",
            [':id' => $id]
        );
        if ((int) ($admins['n'] ?? 0) < 1) {
            responderMal('No se puede borrar: quedaría el panel sin administrador.', 400);
        }

        $usuario = consultarUno('SELECT correo FROM usuarios WHERE id = :id', [':id' => $id]);
        if (!$usuario) responderMal('Esa cuenta no existe.', 404);

        // Las sesiones se borran solas por la llave foránea ON DELETE CASCADE.
        borrar('usuarios', $id);
        anotarEnBitacora($yo, 'borró una cuenta', 'usuarios', $id, $usuario['correo']);
        responderBien(['mensaje' => 'Cuenta eliminada.']);
        break;

    default:
        responderMal('Acción desconocida.', 404);
}


/* ─── EL ORGANIGRAMA ──────────────────────────────────────────────────── */

/**
 * Dice si `usuarios` ya tiene las columnas del organigrama.
 *
 * Instalar.php las agrega a una tabla que ya existía; en un servidor que
 * todavía no corrió esa migración, no están — y este archivo tiene que
 * poder seguir creando y editando cuentas igual, solo que sin perfil ni
 * permisos especiales todavía.
 *
 * @param string $columna
 * @return bool
 */
function hay_columna_usuarios($columna) {
    static $columnas = null;
    if ($columnas === null) $columnas = columnasDe('usuarios');
    return in_array($columna, $columnas, true);
}

/**
 * Saca de lo que mandó la app el perfil y los cuatro permisos
 * especiales, listos para insertar() o actualizar().
 *
 * Solo toca lo que la app mandó explícitamente: no pisa un permiso que
 * ya estaba con lo que faltaría en un envío parcial.
 *
 * @param array $datos
 * @return array
 */
function camposDelOrganigrama($datos) {
    $campos = [];

    if (array_key_exists('perfil', $datos)) {
        $campos['perfil'] = campoTexto($datos, 'perfil', 40);
    }

    $especiales = is_array($datos['especiales'] ?? null) ? $datos['especiales'] : null;
    if ($especiales !== null) {
        foreach (['escanear', 'ver_dinero', 'borrar', 'crear_cuentas'] as $clave) {
            $campos['puede_' . $clave] = in_array($clave, $especiales, true) ? 1 : 0;
        }
    }

    return $campos;
}

/**
 * Reemplaza los permisos por sección de un usuario.
 *
 * Se borran todos y se vuelven a insertar los que vinieron: más simple y
 * más seguro que calcular un diff, y son pocas filas (una por sección).
 *
 * @param int        $usuarioId
 * @param array|null $permisos [{seccion, nivel}], o null si no se mandó nada.
 * @return void
 */
function guardarPermisosDeSeccion($usuarioId, $permisos) {
    if ($permisos === null || !existeTabla('permisos_usuario')) return;

    ejecutar('DELETE FROM permisos_usuario WHERE usuario_id = :u', [':u' => $usuarioId]);

    if (!is_array($permisos)) return;

    foreach ($permisos as $fila) {
        $seccion = preg_replace('/[^a-z_]/', '', (string) ($fila['seccion'] ?? ''));
        $nivel   = ($fila['nivel'] ?? '') === 'editar' ? 'editar' : 'ver';
        if ($seccion === '') continue;

        insertar('permisos_usuario', [
            'usuario_id' => $usuarioId,
            'seccion'    => $seccion,
            'nivel'      => $nivel,
        ]);
    }
}
