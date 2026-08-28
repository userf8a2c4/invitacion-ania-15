<?php
/* ══════════════════════════════════════════════════════════════════════
   INVITACIONES.PHP · LISTA PRECARGADA, LINK PERSONAL, BOLETOS LIMITADOS

   QUÉ HACE ESTE ARCHIVO
   Es el modelo "sustractivo": en vez de esperar a que cada quien escriba
   su nombre en un formulario abierto, se precarga la lista completa de
   invitados (por grupo familiar), cada uno con su propio link
   (`?i=TOKEN`), un cupo fijo de lugares y —opcionalmente— los nombres de
   quienes lo integran. El bot de mesas (admin/api/_lib/mesas.php) ve a
   TODOS como asistentes desde el día uno, así puede planear al 100% de
   ocupación; quien declina se saca solo y libera sus lugares.

   POR QUÉ HAY UNA TABLA `invitaciones` APARTE DE `confirmaciones`
   `confirmaciones` se creó a mano fuera de migracion.sql y su esquema
   exacto es desconocido (ver la nota grande en confirmaciones.php) — acá
   se la trata con el mismo cuidado: nunca se asume una columna, siempre
   se pregunta con columnasDe().

   DOS VERDADES SEPARADAS, A PROPÓSITO
     `confirmaciones.asiste` = el supuesto para sentar (arranca en 1).
     `invitaciones.estado`   = la realidad del envío/respuesta.
   Mezclarlas haría que el panel "mienta" mostrando confirmados a gente
   que nunca contestó. Por eso el panel debe mostrar SIEMPRE las cifras
   separadas: Apartados (suma de pases) / Confirmados / Sin responder /
   No vienen — nunca un solo número que junte todo.

   PERSONAS DEL GRUPO: NADIE ES "TITULAR"
   Una invitación es DE UN GRUPO, no de una persona. Sus integrantes
   (tabla `acompanantes`, reusada) pesan todos igual: cualquiera puede
   ser a quien se le mande el link. Nunca decir "titular" ni
   "acompañante" en un texto que vea el usuario del panel.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar            todas + totales
     POST ?accion=guardar           crear o editar { id?, nombre,
                                     telefono?, correo?, pases?,
                                     grupo_id?, personas? }
     POST ?accion=marcar_enviada    { id } — no cambia el estado si ya
                                     estaba confirmada/declinada
     POST ?accion=enviar_correo     { ids: [...] } — Fase 6
     POST ?accion=borrar            { id }
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('invitaciones')) {
    responderMal(
        'Todavía no se corrió la migración que agrega las invitaciones.',
        409,
        'Falta la tabla invitaciones — correr admin/api/instalar.php'
    );
}

/**
 * El link completo que le corresponde a un token. Se arma con el mismo
 * dominio del que llegó la petición al panel (que siempre es un
 * subdominio o alias del mismo sitio), para no hardcodear un dominio
 * que después cambia entre PBE y producción.
 *
 * @param string $token
 * @return string
 */
function linkDeInvitacion($token) {
    $host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST'] ?? 'aniaxv.com');
    return 'https://' . $host . '/?i=' . $token;
}

/**
 * La fecha límite para confirmar, en formato ISO (AAAA-MM-DD).
 *
 * ⚠️ NO se puede leer del `CONFIGURACION.fiesta.fechaLimiteParaConfirmar`
 * del sitio público (codigo/01-configuracion.js): ese archivo nunca se
 * carga en el panel, son dos aplicaciones separadas con su propio
 * `CONFIGURACION`, y además ese valor es TEXTO libre en español
 * ("1 de octubre de 2026") — no comparable contra la fecha de hoy.
 * Acá se guarda como una fecha REAL (mismo patrón de ajuste editable que
 * `recibo_prefijo`/`lugar_expedicion` en recibos.php), justamente para
 * que `invitacion.php`/`confirmar.php` puedan cerrar las ediciones
 * cuando corresponda — ver fechaLimitePaso() más abajo.
 *
 * @return string AAAA-MM-DD
 */
function fechaLimiteConfiguradaIso() {
    if (!existeTabla('ajustes')) return '2026-10-01';
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'fecha_limite_confirmar' LIMIT 1");
    $valor = trim((string) ($fila['valor'] ?? ''));
    // Formato AAAA-MM-DD exacto: cualquier otra cosa (vacío, texto viejo
    // en español de una versión anterior) cae al respaldo, en vez de
    // romper la comparación de fechas.
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor) ? $valor : '2026-10-01';
}

/**
 * La misma fecha, en texto para mostrar ("1 de octubre de 2026") — mismo
 * formateador que ya usa recibos.php (formatearFechaLarga), copiado acá
 * porque no vale la pena una librería compartida para una función tan
 * chica (mismo criterio ya documentado en contratos.php).
 *
 * @return string
 */
function fechaLimiteConfigurada() {
    $meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $partes = explode('-', fechaLimiteConfiguradaIso());
    if (count($partes) !== 3) return fechaLimiteConfiguradaIso();
    [$anio, $mes, $dia] = $partes;
    return ((int) $dia) . ' de ' . ($meses[(int) $mes] ?? $mes) . ' de ' . $anio;
}

/**
 * Arma la fila de `confirmaciones` con SOLO las columnas que la tabla
 * realmente tiene — mismo cuidado que confirmaciones.php, porque esta
 * tabla se creó a mano y su esquema no es de fiar.
 *
 * @param string $nombre
 * @param string $correo
 * @param int    $pases
 * @return array
 */
function armarFilaDeConfirmacion($nombre, $correo, $pases) {
    $columnas = columnasDe('confirmaciones');
    $fila = [];
    if (in_array('nombre', $columnas, true))  $fila['nombre']  = $nombre;
    if (in_array('correo', $columnas, true))  $fila['correo']  = $correo;
    // Optimista: el modelo sustractivo parte del lleno total. El bot de
    // mesas ya filtra por asiste=1 (admin/api/_lib/mesas.php) — esto es
    // lo que hace que la vista previa de mesas funcione desde el día uno.
    if (in_array('asiste', $columnas, true))  $fila['asiste']  = 1;
    if (in_array('adultos', $columnas, true)) $fila['adultos'] = $pases;
    if (in_array('ninos', $columnas, true))   $fila['ninos']   = 0;
    if (in_array('total', $columnas, true))   $fila['total']   = $pases;
    // El código de pase, generado en el SERVIDOR — a diferencia del que
    // arma hoy el navegador del invitado (codigo/12-pase-de-acceso.js),
    // que es adivinable y sin garantía de unicidad.
    if (in_array('codigo', $columnas, true)) {
        do {
            $codigo = 'XV-' . strtoupper(bin2hex(random_bytes(3)));
            $yaExiste = consultarUno('SELECT id FROM confirmaciones WHERE codigo = :c', [':c' => $codigo]);
        } while ($yaExiste);
        $fila['codigo'] = $codigo;
    }
    if (in_array('fecha_hora', $columnas, true)) $fila['fecha_hora'] = date('Y-m-d H:i:s');

    return $fila;
}

/**
 * Reconcilia las personas del grupo con lo que ya había en
 * `acompanantes`, SIN borrar y reinsertar — borrar destruiría en
 * cascada sus reglas de mesa (acompanante_reglas) y su lugar ya
 * asignado (asignacion_mesas_persona), que es justo lo que no se quiere
 * perder al editar un grupo.
 *
 * @param int   $confirmacionId
 * @param array $personas  [{id?, nombre, tipo, telefono?, correo?}, ...]
 * @return void
 */
function reconciliarPersonasDelGrupo($confirmacionId, $personas) {
    $actuales = consultarTodo(
        'SELECT id FROM acompanantes WHERE confirmacion_id = :c',
        [':c' => $confirmacionId]
    );
    $idsActuales = array_column($actuales, 'id');
    $idsQueLlegan = [];

    foreach ($personas as $persona) {
        $nombre   = trim((string) ($persona['nombre'] ?? ''));
        if ($nombre === '') continue;
        $tipo     = ($persona['tipo'] ?? 'adulto') === 'nino' ? 'nino' : 'adulto';
        $telefono = trim((string) ($persona['telefono'] ?? ''));
        $correo   = trim((string) ($persona['correo'] ?? ''));
        $id       = (int) ($persona['id'] ?? 0);

        if ($id > 0 && in_array($id, $idsActuales, true)) {
            actualizar('acompanantes', $id, [
                'nombre' => $nombre, 'tipo' => $tipo,
                'telefono' => $telefono, 'correo' => $correo,
            ]);
            $idsQueLlegan[] = $id;
        } else {
            $nuevoId = insertar('acompanantes', [
                'confirmacion_id' => $confirmacionId,
                'nombre' => $nombre, 'tipo' => $tipo,
                'telefono' => $telefono, 'correo' => $correo,
            ]);
            $idsQueLlegan[] = $nuevoId;
        }
    }

    // Los que estaban y ya no llegaron: se sacaron del grupo a propósito.
    foreach ($idsActuales as $idViejo) {
        if (!in_array($idViejo, $idsQueLlegan, true)) {
            borrar('acompanantes', $idViejo);
        }
    }
}


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    $columnasConf = columnasDe('confirmaciones');
    $tieneAsiste  = in_array('asiste', $columnasConf, true);
    $tieneAdultos = in_array('adultos', $columnasConf, true);
    $tieneNinos   = in_array('ninos', $columnasConf, true);
    $tieneCodigo  = in_array('codigo', $columnasConf, true);

    $selectConf = 'c.id AS confirmacion_id_real'
        . ($tieneAsiste  ? ', c.asiste'  : ', NULL AS asiste')
        . ($tieneAdultos ? ', c.adultos' : ', NULL AS adultos')
        . ($tieneNinos   ? ', c.ninos'   : ', NULL AS ninos')
        . ($tieneCodigo  ? ', c.codigo'  : ', NULL AS codigo');

    $filas = consultarTodo(
        "SELECT i.*, $selectConf, g.nombre AS grupo_nombre
         FROM invitaciones i
         LEFT JOIN confirmaciones c ON c.id = i.confirmacion_id
         LEFT JOIN grupos_invitados g ON g.id = i.grupo_id
         ORDER BY i.creado_en DESC"
    );

    foreach ($filas as &$fila) {
        $fila['link'] = linkDeInvitacion($fila['token']);
    }
    unset($fila);

    $totales = consultarUno(
        "SELECT
            COALESCE(SUM(pases), 0) AS apartados,
            COALESCE(SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END), 0) AS confirmadas,
            COALESCE(SUM(CASE WHEN estado = 'declinada' THEN 1 ELSE 0 END), 0) AS declinadas,
            COALESCE(SUM(CASE WHEN estado IN ('sin_enviar','enviada') THEN 1 ELSE 0 END), 0) AS sin_responder,
            COALESCE(SUM(CASE WHEN estado = 'sin_enviar' THEN 1 ELSE 0 END), 0) AS sin_enviar,
            COALESCE(SUM(CASE WHEN telefono = '' THEN 1 ELSE 0 END), 0) AS sin_telefono
         FROM invitaciones"
    );

    $capacidad = existeTabla('mesas')
        ? consultarUno('SELECT COALESCE(SUM(capacidad), 0) AS total FROM mesas')['total']
        : 0;

    responderBien([
        'filas'             => $filas,
        'totales'           => $totales,
        'capacidad'         => (int) $capacidad,
        'fecha_limite_texto'=> fechaLimiteConfigurada(),
    ]);
    break;


/* ─── GUARDAR (crear o editar) ────────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id       = campoEntero($datos, 'id', 0);
    $nombre   = campoTexto($datos, 'nombre', 150);
    $telefono = campoTexto($datos, 'telefono', 40);
    $correo   = campoTexto($datos, 'correo', 190);
    $grupoId  = campoEntero($datos, 'grupo_id', 0);
    $personas = is_array($datos['personas'] ?? null) ? $datos['personas'] : [];

    if ($nombre === '') responderMal('Falta el nombre del grupo.', 400);

    // Si hay personas nombradas, los pases son la cantidad de nombres
    // (con nombre no vacío) — no se piden por separado. Si no hay
    // ninguna, se usa el número que se haya puesto a mano.
    $nombresValidos = array_filter($personas, function ($p) {
        return trim((string) ($p['nombre'] ?? '')) !== '';
    });
    $pases = count($nombresValidos) > 0
        ? count($nombresValidos)
        : max(1, campoEntero($datos, 'pases', 1, 500, 1));

    if ($id > 0) {
        /* ─── EDITAR ─── */
        $existente = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
        if (!$existente) responderMal('Esa invitación no existe.', 404);

        actualizar('invitaciones', $id, [
            'nombre'   => $nombre,
            'telefono' => $telefono,
            'correo'   => $correo,
            'pases'    => $pases,
            'grupo_id' => $grupoId > 0 ? $grupoId : null,
        ]);

        if ($existente['confirmacion_id']) {
            $columnasConf = columnasDe('confirmaciones');
            $cambiosConf = [];
            if (in_array('nombre', $columnasConf, true))  $cambiosConf['nombre']  = $nombre;
            if (in_array('correo', $columnasConf, true))  $cambiosConf['correo']  = $correo;
            // Solo si NO hay personas nombradas: si las hay, la cantidad
            // de adultos/niños la recalcula confirmar.php según lo que
            // el invitado tilde, no acá.
            if (empty($nombresValidos)) {
                if (in_array('adultos', $columnasConf, true)) $cambiosConf['adultos'] = $pases;
                if (in_array('total', $columnasConf, true))   $cambiosConf['total']   = $pases;
            }
            if ($cambiosConf) actualizar('confirmaciones', $existente['confirmacion_id'], $cambiosConf);

            if (!empty($nombresValidos)) {
                reconciliarPersonasDelGrupo($existente['confirmacion_id'], $personas);
            }

            if ($grupoId > 0 && existeTabla('preferencias_invitado')) {
                ejecutar(
                    'INSERT INTO preferencias_invitado (confirmacion_id, grupo_id)
                     VALUES (:c, :g)
                     ON DUPLICATE KEY UPDATE grupo_id = VALUES(grupo_id)',
                    [':c' => $existente['confirmacion_id'], ':g' => $grupoId]
                );
            }
        }

        anotarEnBitacora($yo, 'editó una invitación', 'invitaciones', $id, $nombre);
        responderBien(['id' => $id, 'creado' => false]);
        break;
    }

    /* ─── CREAR ─── */
    do {
        $token = bin2hex(random_bytes(8));
        $tokenYaExiste = consultarUno('SELECT id FROM invitaciones WHERE token = :t', [':t' => $token]);
    } while ($tokenYaExiste);

    $filaConfirmacion = armarFilaDeConfirmacion($nombre, $correo, $pases);
    $confirmacionId = insertar('confirmaciones', $filaConfirmacion);

    $invitacionId = insertar('invitaciones', [
        'token'           => $token,
        'nombre'          => $nombre,
        'telefono'        => $telefono,
        'correo'          => $correo,
        'pases'           => $pases,
        'grupo_id'        => $grupoId > 0 ? $grupoId : null,
        'confirmacion_id' => $confirmacionId,
        'estado'          => 'sin_enviar',
    ]);

    if (!empty($nombresValidos)) {
        reconciliarPersonasDelGrupo($confirmacionId, $personas);
    }

    if ($grupoId > 0 && existeTabla('preferencias_invitado')) {
        ejecutar(
            'INSERT INTO preferencias_invitado (confirmacion_id, grupo_id)
             VALUES (:c, :g)
             ON DUPLICATE KEY UPDATE grupo_id = VALUES(grupo_id)',
            [':c' => $confirmacionId, ':g' => $grupoId]
        );
    }

    anotarEnBitacora($yo, 'creó una invitación', 'invitaciones', $invitacionId, $nombre);

    responderBien([
        'id'              => $invitacionId,
        'token'           => $token,
        'link'            => linkDeInvitacion($token),
        'confirmacion_id' => $confirmacionId,
        'creado'          => true,
    ], 201);
    break;


/* ─── MARCAR ENVIADA ──────────────────────────────────────────────────── */

case 'marcar_enviada':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $inv = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
    if (!$inv) responderMal('Esa invitación no existe.', 404);

    // Si ya respondió (confirmada/declinada), no la volvemos a "enviada"
    // para atrás: marcar_enviada es solo para el primer contacto.
    if ($inv['estado'] === 'sin_enviar') {
        actualizar('invitaciones', $id, ['estado' => 'enviada', 'enviada_en' => date('Y-m-d H:i:s')]);
    }

    responderBien(['id' => $id]);
    break;


/* ─── ENVIAR POR CORREO (masivo) ──────────────────────────────────────── */

case 'enviar_correo':
    exigirMetodo('POST');
    require_once __DIR__ . '/_lib/correo.php';

    $datos = cuerpoJson();
    $ids   = is_array($datos['ids'] ?? null) ? $datos['ids'] : [];
    // Siempre el ajuste del servidor, no lo que mande el cliente: así el
    // texto es el mismo sin importar desde qué pantalla se dispare el
    // envío, y cambiarlo en un solo lugar (Ajustes) alcanza.
    $fechaLimite = fechaLimiteConfigurada();

    $mandados = 0;
    $sinCorreo = 0;

    foreach ($ids as $idCrudo) {
        $id = (int) $idCrudo;
        if ($id <= 0) continue;

        $inv = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
        if (!$inv || $inv['correo'] === '') { $sinCorreo++; continue; }

        $link = linkDeInvitacion($inv['token']);
        $asunto = 'Ania cumple quince años — su invitación';
        $cuerpoHtml = '<p>✦ Ania cumple quince años ✦</p>'
            . '<p>' . htmlspecialchars($inv['nombre'], ENT_QUOTES, 'UTF-8') . ':</p>'
            . '<p>Hay fechas que uno quiere recordar acompañado, y esta es una de ellas. '
            . 'Nos dará mucha alegría contar con ustedes.</p>'
            . '<p>Hemos reservado <strong>' . (int) $inv['pases'] . ' lugares</strong> a su nombre.</p>'
            . '<p>Aquí está su invitación. Ahí mismo pueden confirmar y elegir su menú:<br>'
            . '<a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '</a></p>'
            . ($fechaLimite !== ''
                ? '<p>Les pedimos confirmar antes del ' . htmlspecialchars($fechaLimite, ENT_QUOTES, 'UTF-8')
                  . '. Pueden modificar su respuesta cuantas veces gusten hasta esa fecha.</p>'
                : '');

        // enviarCorreo() (no smtpEnviar() directo) ya arma los datos SMTP
        // desde env() — es el mismo wrapper que usa admin/api/correo.php.
        // Devuelve `true` o el texto del error, nunca lanza excepción.
        $resultado = enviarCorreo($inv['correo'], $asunto, $cuerpoHtml);
        if ($resultado === true) {
            actualizar('invitaciones', $id, [
                'estado'     => $inv['estado'] === 'sin_enviar' ? 'enviada' : $inv['estado'],
                'enviada_en' => date('Y-m-d H:i:s'),
            ]);
            $mandados++;
        } else {
            error_log('[Ania XV · invitaciones] No se pudo mandar a ' . $inv['correo'] . ': ' . $resultado);
        }
    }

    responderBien(['mandados' => $mandados, 'sin_correo' => $sinCorreo]);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $inv = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
    if (!$inv) responderMal('Esa invitación no existe.', 404);

    if ($inv['confirmacion_id']) {
        if (existeTabla('asignacion_mesas')) {
            ejecutar('DELETE FROM asignacion_mesas WHERE confirmacion_id = :c', [':c' => $inv['confirmacion_id']]);
        }
        if (existeTabla('preferencias_invitado')) {
            ejecutar('DELETE FROM preferencias_invitado WHERE confirmacion_id = :c', [':c' => $inv['confirmacion_id']]);
        }
        // acompanantes no tiene FK con ON DELETE CASCADE (ver
        // migracion.sql) — se borra a mano.
        ejecutar('DELETE FROM acompanantes WHERE confirmacion_id = :c', [':c' => $inv['confirmacion_id']]);
        borrar('confirmaciones', (int) $inv['confirmacion_id']);
    }

    borrar('invitaciones', $id);
    anotarEnBitacora($yo, 'borró una invitación', 'invitaciones', $id, $inv['nombre']);
    responderBien(['mensaje' => 'Invitación eliminada.']);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
