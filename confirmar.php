<?php
/* ══════════════════════════════════════════════════════════════════════
   CONFIRMAR.PHP, Versión SMTP SSL (Puerto 465)
   
   Flujo:
   1. Recibe JSON del formulario
   2. Guarda en MySQL
   3. Manda correo al invitado
   4. Manda correo a todos los administradores definidos en .env
   ══════════════════════════════════════════════════════════════════════ */

/* ─── LIBRERÍAS COMPARTIDAS CON EL PANEL ──────────────────────────────── */
/* La lectura del .env y la función smtpEnviar() vivían acá adentro. Se
   movieron a admin/api/_lib/ para que este archivo y el panel de
   administración usen exactamente el mismo código: si algún día hay que
   arreglar el envío de correo, se arregla en un solo lugar.

   El getenv() de más abajo sigue funcionando igual, porque entorno.php
   carga el .env con putenv() tal como se hacía antes. */
require_once __DIR__ . '/admin/api/_lib/entorno.php';
require_once __DIR__ . '/admin/api/_lib/correo.php';

cargarEntorno();

/* ─── CORS ────────────────────────────────────────────────────────────── */
header('Access-Control-Allow-Origin: https://aniaxv.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

/* ─── CONFIGURACIÓN ───────────────────────────────────────────────────── */
/* ⚠️ SIN RESPALDO PARA NOMBRE DE BASE NI USUARIO (Ambiente de pruebas).
   Antes, si el .env no tenía DB_NAME/DB_USER por el motivo que fuera,
   este archivo caía en el nombre de la base REAL como respaldo — con un
   ambiente de pruebas aparte (pbe.aniaxv.com) eso significa que un .env
   mal armado ahí escribiría confirmaciones de prueba en la base de
   Lucila sin que nadie lo notara. Mejor que falle fuerte (más abajo, al
   conectar) a que falle en silencio escribiendo en el lugar equivocado. */
$DB_HOST      = getenv('DB_HOST')      ?: 'localhost';
$DB_NAME      = getenv('DB_NAME')      ?: '';
$DB_USER      = getenv('DB_USER')      ?: '';
$DB_PASSWORD  = getenv('DB_PASSWORD')  ?: '';

$SMTP_HOST    = getenv('SMTP_HOST')    ?: 'smtp.hostinger.com';
$SMTP_PORT    = (int)(getenv('SMTP_PORT') ?: 465); // Forzado a 465 en el código de conexión
$SMTP_USER    = getenv('SMTP_USER')    ?: '';   
$SMTP_PASS    = getenv('SMTP_PASSWORD') ?: '';

/* El buzón info@aniaxv.com es el único que existe de verdad en Hostinger,
   por eso es el que firma los envíos. noreply@aniaxv.com nunca se creó. */
$CORREO_FROM  = getenv('CORREO_REMITENTE')      ?: 'info@aniaxv.com';
$CORREO_ADMIN = getenv('CORREO_ADMINISTRADORA') ?: 'info@aniaxv.com,blucila699@gmail.com';

/* ─── LEER JSON ───────────────────────────────────────────────────────── */
$datos = json_decode(file_get_contents('php://input'), true);
if (!$datos) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'JSON inválido']); exit; }

/* ─── SANITIZAR ───────────────────────────────────────────────────────── */
function limpiar($v) { return htmlspecialchars(trim((string)($v ?? '')), ENT_QUOTES, 'UTF-8'); }

$nombre       = limpiar($datos['nombre'] ?? '');
$correo       = limpiar($datos['correo'] ?? '');
$asiste       = (bool)($datos['asiste'] ?? false);
$adultos      = max(0, (int)($datos['adultos'] ?? 0));
$ninos        = max(0, (int)($datos['ninos'] ?? 0));
$total        = $adultos + $ninos;
$menus        = limpiar($datos['detalleDeMenus'] ?? ', ');
$resumenMenus = limpiar($datos['resumenDeMenus'] ?? ', ');
$alergias     = limpiar($datos['alergias'] ?? 'Ninguna');
$notas        = limpiar($datos['notas'] ?? ', ');
$codigo       = limpiar($datos['codigo'] ?? '');

/* ⚡ EL CORREO YA NO ES OBLIGATORIO CUANDO HAY LINK PERSONAL (2026-09-02).
   Las invitaciones pasaron a ser nominales: cada grupo familiar recibe su
   propio enlace, y los datos de contacto los administra Lucila desde el
   panel. El invitado ya no escribe su correo —no tiene por qué—, así que
   el formulario dejó de pedirlo.

   Sin este cambio, sacar el campo rompía TODO: esta validación devolvía
   422 y la confirmación no se guardaba en absoluto.

   Las reglas quedan así:
     · El nombre siempre hace falta.
     · Con token (link personal), el correo es opcional: la invitación ya
       identifica a quién corresponde esta respuesta, sin ambigüedad.
     · Sin token se sigue exigiendo, igual que siempre.
     · Si viene un correo, tiene que ser válido en los dos casos: se
       rechaza uno mal escrito, pero no la ausencia. */
$hayToken     = preg_match('/^[a-f0-9]{8,}$/', strtolower((string) ($datos['token'] ?? ''))) === 1;
$correoCrudo  = trim((string) ($datos['correo'] ?? ''));
$correoValido = $correoCrudo !== '' && filter_var($correoCrudo, FILTER_VALIDATE_EMAIL) !== false;

if (!$nombre) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'Falta el nombre.']);
    exit;
}
if ($correoCrudo !== '' && !$correoValido) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'El correo no parece válido.']);
    exit;
}
if (!$hayToken && !$correoValido) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'Falta el correo.']);
    exit;
}

/* ─── FRENO POR IP ────────────────────────────────────────────────────── */
/* Este es el único punto del sitio abierto a internet sin sesión: no pide
   ni contraseña ni token. Sin freno, cualquiera puede mandar
   confirmaciones falsas en bucle y llenar la lista de invitados de
   basura. Reutiliza la tabla `intentos_login` del panel, con su propia
   marca, para no tener que sumar una tabla nueva solo para esto.

   Diez por hora por IP alcanza de sobra para una familia real —a veces
   se manda, se corrige y se reenvía— y frena un script en bucle. */
try {
    $pdoFreno = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $ipFreno = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    $stmt = $pdoFreno->prepare(
        'SELECT COUNT(*) AS n FROM intentos_login
         WHERE ip = :ip AND correo = :marca
           AND cuando > DATE_SUB(NOW(), INTERVAL 60 MINUTE)'
    );
    $stmt->execute([':ip' => $ipFreno, ':marca' => '__confirmar__']);
    $conteo = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['n'] ?? 0);

    if ($conteo >= 10) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Demasiados envíos seguidos. Espera un rato e intenta de nuevo.']);
        exit;
    }

    $pdoFreno->prepare('INSERT INTO intentos_login (ip, correo) VALUES (:ip, :marca)')
             ->execute([':ip' => $ipFreno, ':marca' => '__confirmar__']);
} catch (PDOException $e) {
    // Si el freno mismo falla (por ejemplo, la tabla no existe todavía en
    // una instalación vieja), no puede impedir que la confirmación real
    // se guarde: se deja pasar y se anota en el log para revisar después.
    error_log('[Ania XV] No se pudo aplicar el freno de confirmar.php: ' . $e->getMessage());
}

/* ─── INVITACIÓN PERSONALIZADA (?i=TOKEN) ─────────────────────────────
   Sin token, todo esto queda en null y el resto del archivo se comporta
   EXACTAMENTE igual que siempre (INSERT nuevo, sin tope de lugares).
   Con token: en vez de crear una fila nueva, se ACTUALIZA la que ya
   existe (creada desde el panel, admin/api/invitaciones.php) — así
   confirmar dos veces con el mismo link corrige la misma fila en vez de
   duplicarla, y el número de lugares queda limitado a lo que se
   reservó. Reusa la conexión $pdoFreno de arriba: si esa conexión no se
   pudo abrir (freno caído), esto tampoco puede resolverse, y el envío
   sigue el camino de "sin token" — nunca se cae la confirmación entera
   por esto. */
$invitacion = null;
$tokenCrudo = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($datos['token'] ?? '')));

if ($tokenCrudo !== '' && isset($pdoFreno)) {
    try {
        $stmtInv = $pdoFreno->prepare('SELECT * FROM invitaciones WHERE token = :t LIMIT 1');
        $stmtInv->execute([':t' => $tokenCrudo]);
        $invitacion = $stmtInv->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log('[Ania XV] No se pudo resolver el token de invitación: ' . $e->getMessage());
    }

    /* ⚡ (2026-08-28) Si vino un token pero no se pudo resolver la
       invitación —conexión del freno caída, token inválido, lo que sea—
       el código de más abajo NO debe degradar al camino “sin token”:
       eso terminaría creando un INSERT nuevo, duplicando el grupo y
       saltándose el tope de lugares reservados. Mejor cortar acá con
       un error claro que dejar pasar una confirmación sin control. */
    if ($tokenCrudo !== '' && !$invitacion) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'error' =>
            'No pudimos leer tu invitación ahora. Intenta de nuevo en un momento.']);
        exit;
    }

    if ($invitacion) {
        // Tope de lugares: nunca confiar en lo que mande el navegador.
        if ($total > (int) $invitacion['pases']) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' =>
                'Son más personas de las que reservamos para ustedes (' .
                (int) $invitacion['pases'] . ' lugares).']);
            exit;
        }

        // Fecha límite: se cierra la EDICIÓN, no la primera respuesta.
        // Una invitación que nunca respondió puede hacerlo tarde —es
        // mejor saber que no saber—; lo que no se permite es cambiar
        // una respuesta ya dada después de la fecha.
        $yaRespondioAntes = in_array($invitacion['estado'], ['confirmada', 'declinada'], true);
        if ($yaRespondioAntes) {
            try {
                $filaFecha = $pdoFreno->query(
                    "SELECT valor FROM ajustes WHERE clave = 'fecha_limite_confirmar'"
                )->fetch(PDO::FETCH_ASSOC);
                $fechaLimite = (string) ($filaFecha['valor'] ?? '');
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaLimite)) $fechaLimite = '2026-10-01';
            } catch (PDOException $e) {
                $fechaLimite = '2026-10-01';
            }
            if (date('Y-m-d') > $fechaLimite) {
                http_response_code(423);
                echo json_encode(['ok' => false, 'error' =>
                    'Las confirmaciones ya se cerraron. Si necesitas hacer un cambio, escríbenos.']);
                exit;
            }
        }
    }
}

/* ─── CUPO SUSTRACTIVO: TOPE DEL SALÓN, SOLO SIN TOKEN ────────────────
   Con token, arriba ya se topeó contra `invitaciones.pases` de ESA
   invitación puntual — no hace falta nada más. Sin token (formulario
   abierto), nunca hubo ningún control contra la capacidad real del
   salón: cualquiera podía mandar cuantas confirmaciones quisiera. Es
   el único canal sin supervisión humana (una alta o edición desde el
   panel la ve Lucila antes de guardar), así que acá el tope es dado
   de baja, no un aviso. "Personas que asisten" es la misma cuenta que
   ya usa admin/api/estadisticas.php; la capacidad sale de
   SUM(mesas.capacidad) -140 hoy, calculado, nunca una constante
   pisada a mano. Quien declina (asiste=false) nunca resta lugar, así
   que no hace falta frenarlo acá. */
if (!$invitacion && $asiste && isset($pdoFreno)) {
    try {
        $ocupadas = (int) $pdoFreno->query(
            'SELECT COALESCE(SUM(adultos+ninos),0) FROM confirmaciones WHERE asiste = 1'
        )->fetchColumn();
        $capacidadTotal = (int) $pdoFreno->query(
            'SELECT COALESCE(SUM(capacidad),0) FROM mesas'
        )->fetchColumn();

        if ($capacidadTotal > 0 && $ocupadas + $total > $capacidadTotal) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' =>
                'Ya no quedan lugares disponibles. Escríbenos directamente y lo resolvemos a mano.']);
            exit;
        }
    } catch (PDOException $e) {
        // Si este chequeo mismo falla (freno caído, tabla mesas
        // inexistente), no puede tumbar una confirmación real: se deja
        // pasar y se anota, mismo criterio que el freno de arriba.
        error_log('[Ania XV] No se pudo verificar el cupo del salón: ' . $e->getMessage());
    }
}

/* ─── EL CÓDIGO QR QUE YA DIBUJÓ LA WEB ──────────────────────────────── */
/* La invitación genera el QR del pase en el navegador y nos lo manda
   como imagen. Se incrusta tal cual en el correo, así el QR del mail y
   el de la pantalla son el MISMO por construcción: no hay forma de que
   queden distintos, que es lo que pasaría si el servidor lo generara
   por su cuenta con otra biblioteca.

   Se valida con desconfianza porque esto llega de afuera:
     · solo el formato "data:image/png;base64,…"
     · solo PNG, comprobando la firma de los primeros bytes
     · con un tope de tamaño, para que nadie mande un archivo enorme */
$qrPng = null;
$qrCrudo = (string) ($datos['qrPng'] ?? '');

if ($qrCrudo !== '' && strlen($qrCrudo) < 200000) {
    if (preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $qrCrudo, $coincide)) {
        $binario = base64_decode($coincide[1], true);

        // La firma de todo archivo PNG: \x89PNG\r\n\x1a\n
        if ($binario !== false && strncmp($binario, "\x89PNG\r\n\x1a\n", 8) === 0) {
            $qrPng = $binario;
        } else {
            error_log('[Ania XV] QR descartado: no es un PNG válido.');
        }
    }
}

/* ─── 1. GUARDAR EN MYSQL ─────────────────────────────────────────────── */
$errorBD = null;
try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    /* ⚡ CON TOKEN, SE ACTUALIZA LA FILA QUE YA EXISTE, NUNCA SE CREA
       OTRA (2026-08-27). Sin esto, confirmar dos veces con el mismo
       link personalizado duplicaría al grupo entero en `confirmaciones`
       — exactamente el bug que el token existe para evitar. El `codigo`
       de esa fila NO se toca: ya lo generó el servidor al crear la
       invitación (admin/api/invitaciones.php), y es el mismo que ya
       pudo haberse mandado en un correo o un QR antes de este cambio.
       $codigo se reescribe acá con ese valor real, para que los
       correos de más abajo (que ya usan esa variable) muestren el
       código verdadero y no el que inventó el navegador. */
    if ($invitacion) {
        /* ⚡ (2026-08-28) confirmacion_id admite NULL en la tabla. Sin
           esta guarda, un WHERE id=0 no afecta ninguna fila -sin lanzar
           excepción- y el resto del archivo sigue como si hubiera
           andado: el UPDATE de invitaciones marca "confirmada", se manda
           el correo de éxito, el invitado ve su pase... y no quedó
           nada guardado. Mejor cortar acá con un error real. */
        if (empty($invitacion['confirmacion_id'])) {
            error_log('[Ania XV] Invitación ' . $invitacion['token'] . ' sin confirmacion_id.');
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' =>
                'No pudimos registrar tu respuesta. Escríbenos y lo hacemos a mano.']);
            exit;
        }

        $stmtUpdateConf = $pdo->prepare("UPDATE confirmaciones
            SET nombre=:nombre, correo=:correo, asiste=:asiste, adultos=:adultos,
                ninos=:ninos, total=:total, menus=:menus, resumen_menus=:resumen_menus,
                alergias=:alergias, notas=:notas
            WHERE id=:id");
        $stmtUpdateConf->execute([
            ':nombre'=>$nombre, ':correo'=>$correo, ':asiste'=>$asiste?1:0,
            ':adultos'=>$adultos, ':ninos'=>$ninos, ':total'=>$total,
            ':menus'=>$menus, ':resumen_menus'=>$resumenMenus,
            ':alergias'=>$alergias, ':notas'=>$notas,
            ':id'=>(int) $invitacion['confirmacion_id'],
        ]);

        // Mismo motivo que la guarda de arriba: si el id ya no existe de
        // verdad en la tabla, el UPDATE no lanza excepción, solo afecta
        // cero filas -y sin este chequeo eso pasaría inadvertido.
        if ($stmtUpdateConf->rowCount() === 0) {
            $existeFila = $pdo->prepare('SELECT id FROM confirmaciones WHERE id = :id');
            $existeFila->execute([':id' => (int) $invitacion['confirmacion_id']]);
            if (!$existeFila->fetch(PDO::FETCH_ASSOC)) {
                error_log('[Ania XV] confirmacion_id ' . $invitacion['confirmacion_id'] . ' no existe (invitacion ' . $invitacion['token'] . ').');
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' =>
                    'No pudimos registrar tu respuesta. Escríbenos y lo hacemos a mano.']);
                exit;
            }
            // Si la fila existe pero rowCount() dio 0, es que los valores
            // ya eran idénticos (reenvío exacto de lo mismo) -no es un
            // error, MySQL simplemente no reporta cambios sin cambios.
        }

        $filaActual = $pdo->prepare('SELECT codigo FROM confirmaciones WHERE id = :id');
        $filaActual->execute([':id' => (int) $invitacion['confirmacion_id']]);
        $codigoReal = $filaActual->fetch(PDO::FETCH_ASSOC)['codigo'] ?? '';
        if ($codigoReal !== '') $codigo = $codigoReal;

        /* Se suma una respuesta. La columna se agrega desde el instalador
           del panel; si esta base todavía no la tiene, el UPDATE fallaría
           entero y se perdería la respuesta — por eso se intenta aparte y
           su error no interrumpe nada. */
        try {
            $pdo->prepare('UPDATE invitaciones SET veces_respondida = veces_respondida + 1 WHERE id = :id')
                ->execute([':id' => $invitacion['id']]);
        } catch (PDOException $e) {
            error_log('[Ania XV] veces_respondida no disponible: ' . $e->getMessage());
        }

        $pdo->prepare("UPDATE invitaciones SET estado=:estado, respondida_en=NOW() WHERE id=:id")
            ->execute([
                ':estado' => $asiste ? 'confirmada' : 'declinada',
                ':id'     => (int) $invitacion['id'],
            ]);

        /* ─── PERSONAS DEL GRUPO: MENÚ POR PERSONA, NUNCA BORRAR/REINSERTAR ──
           Mismo cuidado que admin/api/invitaciones.php: acompanantes.id
           es la llave de la que cuelgan sus reglas de mesa y su lugar ya
           asignado (ON DELETE CASCADE) — acá solo se ACTUALIZA el menú
           de las que ya existían, nunca se borra ni se crea ninguna.
           El `AND confirmacion_id = :conf` es la comprobación de que ese
           id de verdad pertenece a ESTE grupo: sin eso, alguien podría
           mandar el id de una persona de otra familia y pisarle el menú. */
        // ⚡ (2026-08-28) Sin tope, un POST con miles de entradas
        // dispara miles de UPDATE, uno por uno. 50 sobra de sobra para
        // cualquier grupo real.
        $personasRecibidas = is_array($datos['personas'] ?? null) ? array_slice($datos['personas'], 0, 50) : [];
        if ($personasRecibidas) {
            // ⚡ (2026-08-28) `alergias` -a pedido explícito del usuario,
            // reemplaza la caja de alergias única del grupo cuando hay
            // personas nombradas: cada quien lleva la suya, así se sabe
            // por nombre quién es alérgico a qué (acompanantes.alergias
            // ya existía en el esquema, no hizo falta agregar columna).
            $stmtPersona = $pdo->prepare(
                'UPDATE acompanantes SET menu = :menu, alergias = :alergias
                 WHERE id = :id AND confirmacion_id = :conf'
            );
            /* ⚡ LOS LUGARES SIN NOMBRE TAMBIÉN GUARDAN SU MENÚ (2026-09-03)
             *
             * Acá había un `if ($idPersona <= 0) continue;` que descartaba
             * en silencio a toda persona sin fila en `acompanantes` — o
             * sea, a TODOS los grupos cuyos nombres Lucila todavía no
             * cargó, que son la mayoría. Consecuencias:
             *
             *   · El detalle de quién come qué se perdía (el conteo
             *     global sí se guarda en `resumen_menus`, pero el mesero
             *     y el acomodo necesitan el detalle).
             *   · Al reabrir el link, `p.menu` volvía vacío y las
             *     casillas salían destildadas: la persona veía su
             *     formulario en blanco y creía que su confirmación no
             *     había quedado.
             *
             * Ahora se crea la fila que falta. El nombre queda vacío —el
             * invitado no lo escribe, y "Adulto 2" es una etiqueta de
             * pantalla, no un nombre— y cuando Lucila cargue el real, se
             * le pone a ESTE mismo registro, con su menú ya adentro.
             *
             * En la siguiente vuelta esas personas ya llegan con `id`
             * real desde invitacion.php, así que este INSERT corre una
             * sola vez por lugar: no puede duplicar. */
            $stmtNuevaPersona = $pdo->prepare(
                'INSERT INTO acompanantes (confirmacion_id, nombre, tipo, menu, alergias)
                 VALUES (:conf, :nombre, :tipo, :menu, :alergias)'
            );

            foreach ($personasRecibidas as $persona) {
                $idPersona = (int) ($persona['id'] ?? 0);

                $marcado = !empty($persona['marcado']);
                $menuElegido = $marcado ? limpiar($persona['menu'] ?? 'Estándar') : '';
                $alergiaElegida = $marcado
                    ? mb_substr(limpiar($persona['alergia'] ?? ''), 0, 200)
                    : '';

                if ($idPersona > 0) {
                    $stmtPersona->execute([
                        ':menu'     => $menuElegido,
                        ':alergias' => $alergiaElegida,
                        ':id'       => $idPersona,
                        ':conf'     => (int) $invitacion['confirmacion_id'],
                    ]);
                    continue;
                }

                // Sin id: es un lugar apartado que todavía no tiene fila.
                $stmtNuevaPersona->execute([
                    ':conf'     => (int) $invitacion['confirmacion_id'],
                    ':nombre'   => '',
                    ':tipo'     => (($persona['tipo'] ?? '') === 'nino') ? 'nino' : 'adulto',
                    ':menu'     => $menuElegido,
                    ':alergias' => $alergiaElegida,
                ]);
            }
        }

        error_log('[Ania XV] ✅ BD: invitación ' . $invitacion['token'] . ' actualizada para ' . $nombre);
    } else {
        $pdo->prepare("INSERT INTO confirmaciones
            (nombre,correo,asiste,adultos,ninos,total,menus,resumen_menus,alergias,notas,codigo)
            VALUES(:nombre,:correo,:asiste,:adultos,:ninos,:total,:menus,:resumen_menus,:alergias,:notas,:codigo)")
        ->execute([
            ':nombre'=>$nombre, ':correo'=>$correo, ':asiste'=>$asiste?1:0,
            ':adultos'=>$adultos, ':ninos'=>$ninos, ':total'=>$total,
            ':menus'=>$menus, ':resumen_menus'=>$resumenMenus,
            ':alergias'=>$alergias, ':notas'=>$notas, ':codigo'=>$codigo,
        ]);
        error_log('[Ania XV] ✅ BD: fila guardada para ' . $nombre);
    }

    /* ─── SENTARLO SOLO EN UNA MESA ──────────────────────────────────
       Si el panel tiene prendido el acomodo automático, se le busca
       lugar apenas confirma, respetando su grupo y con quién no puede
       sentarse.

       ⚠️ TODO ESTO VA DENTRO DE UN try/catch PROPIO Y SILENCIOSO.
       Este archivo es el que hace que funcione la invitación: si algo
       del acomodo fallara —falta una tabla, no hay mesas, lo que sea—
       NO puede impedir que la confirmación se guarde ni que salgan los
       correos. En el peor caso el invitado queda sin mesa y se lo
       acomoda después desde el panel, que no es un problema. */
    if ($asiste) {
        try {
            // Con token: el id YA existe (fila actualizada, no creada) —
            // lastInsertId() daría 0 en una UPDATE. Sin token, sigue
            // siendo el id recién insertado, como siempre.
            $idNuevo = $invitacion ? (int) $invitacion['confirmacion_id'] : (int) $pdo->lastInsertId();

            $ajuste = $pdo->query(
                "SELECT valor FROM ajustes WHERE clave = 'auto_al_confirmar'"
            )->fetch(PDO::FETCH_ASSOC);

            if ($ajuste && $ajuste['valor'] === '1' && $idNuevo > 0) {
                require_once __DIR__ . '/admin/api/_lib/mesas.php';

                $donde = sentarAUnoSolo($idNuevo);
                error_log('[Ania XV] Mesa automática: ' .
                          json_encode($donde, JSON_UNESCAPED_UNICODE));
            }
        } catch (Throwable $e) {
            error_log('[Ania XV] No se pudo asignar mesa automática: ' . $e->getMessage());
        }
    }

} catch (PDOException $e) {
    $errorBD = $e->getMessage();
    error_log('[Ania XV] ❌ BD: ' . $errorBD);
}

/* ─── 2. ENVÍO SMTP ──────────────────────────────────────────────────── */
/* smtpEnviar() ya viene cargada desde admin/api/_lib/correo.php (arriba).
   Es la misma función de siempre, palabra por palabra; solo cambió de
   archivo. Sigue conectándose con SSL directo al puerto 465. */

/* ⚡ QUE MANDAR CORREOS NO PUEDA MATAR LA PETICIÓN (2026-09-03)
 *
 * La fila ya está guardada. Lo que sigue son hasta TRES conexiones SMTP,
 * cada una con 15 s para conectar y 20 s para leer (ver _lib/correo.php).
 * En el peor caso eso supera el `max_execution_time` de PHP —30 s por
 * defecto—: el proceso muere a mitad del envío, el invitado recibe un
 * 500 con una página de error de PHP en vez de JSON, y su confirmación
 * quedó guardada sin que él lo sepa. Otra vez el mismo daño: decirle que
 * falló algo que funcionó.
 *
 * Dos líneas lo cubren:
 *   · Más tiempo del que los tres correos pueden llegar a tardar, para
 *     que el script llegue SIEMPRE a responder.
 *   · `ignore_user_abort`: si la persona cierra la pestaña mientras se
 *     mandan los correos, se terminan de mandar igual en vez de quedar
 *     a medias. */
@set_time_limit(120);
@ignore_user_abort(true);

/* ─── 3. HTML: CORREO AL INVITADO ────────────────────────────────────── */
$asistiTexto = $asiste ? 'Sí, asistiré con mucho gusto ✦' : 'Lamentablemente no podré asistir';

$htmlInvitado = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta http-equiv='Content-Language' content='es'></head>
<body style='font-family:Georgia,serif;background:#1a0a00;color:#f5e6c8;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px;margin:0 auto;padding:40px 20px;'>
  <tr><td align='center' style='padding-bottom:24px;'>
    <h1 style='color:#d4a843;font-size:28px;margin:0;letter-spacing:2px;'>Ania · XV Años</h1>
    <p style='color:#a07830;margin:4px 0 0;'>24 de octubre de 2026</p>
  </td></tr>
  <tr><td style='background:#2a1500;border:1px solid #5a3a10;border-radius:8px;padding:32px;'>
    <p style='margin:0 0 16px;'>Hola, <strong style='color:#d4a843;'>$nombre</strong> 🌹</p>
    <p style='margin:0 0 24px;color:#d4c098;'>Recibimos tu confirmación:</p>
    <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
      <tr style='border-bottom:1px solid #5a3a10;'>
        <td style='color:#a07830;width:45%;'>Asistencia</td>
        <td style='color:#f5e6c8;'>$asistiTexto</td>
      </tr>" .
      ($asiste ? "
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Adultos</td><td>$adultos</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Niños</td><td>$ninos</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Menús</td><td>$resumenMenus</td></tr>
      <tr style='border-bottom:1px solid #5a3a10;'><td style='color:#a07830;'>Alergias</td><td>$alergias</td></tr>
      <tr><td style='color:#a07830;'>Código de pase</td>
          <td style='color:#d4a843;font-weight:bold;letter-spacing:1px;'>$codigo</td></tr>" : "") . "
    </table>" .

    /* El QR, si la web lo mandó. src='cid:qrpase' apunta a la imagen que
       viaja adjunta dentro de este mismo correo, no a una web: así se ve
       aunque el lector bloquee las imágenes externas, que es lo que hacen
       Gmail y Outlook por defecto.

       El fondo blanco con padding no es decoración: un QR dorado sobre
       fondo oscuro no lo lee ningún teléfono. Necesita contraste alto y
       un margen en blanco alrededor. */
    (($asiste && $qrPng) ? "
    <table width='100%' cellpadding='0' cellspacing='0' style='margin-top:28px;'>
      <tr><td align='center'>
        <div style='background:#ffffff;padding:14px;border-radius:8px;display:inline-block;'>
          <img src='cid:qrpase' width='170' height='170' alt='Código QR de tu pase'
               style='display:block;width:170px;height:170px;'>
        </div>
        <p style='margin:10px 0 0;font-size:12px;color:#a07830;'>
          Muestra este código en la entrada
        </p>
      </td></tr>
    </table>" : "") .

    ($asiste ? "
    <p style='margin:28px 0 0;font-size:13px;color:#a07830;'>
      Presenta este correo o tu código en la entrada.<br>
      <strong>Salones Alvi Toluca · 5:00 PM · Vestimenta formal</strong>
    </p>

    <!-- El enlace para corregirse solo. Va con el código adentro, así
         que abre directo su ficha sin tener que escribirlo. Sin esto,
         cada cambio llega por WhatsApp y hay que cargarlo a mano. -->
    <p style='margin:20px 0 0;font-size:13px;color:#a07830;'>
      ¿Cambió algo? Puedes
      <a href='https://aniaxv.com/mi-pase.php?c=$codigo'
         style='color:#d4a843;'>corregir tus datos acá</a>
      sin escribirnos.
    </p>" : "
    <p style='margin:28px 0 0;color:#d4c098;'>Gracias por avisarnos, te vamos a extrañar. 🌹</p>") . "
  </td></tr>
  <tr><td align='center' style='padding-top:24px;color:#5a3a10;font-size:12px;'>Ania XV · aniaxv.com</td></tr>
</table></body></html>";

/* ─── 4. HTML: CORREO A LA ADMINISTRADORA ────────────────────────────── */
$htmlAdmin = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta http-equiv='Content-Language' content='es'></head>
<body style='font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px;margin:0 auto;padding:40px 20px;'>
  <tr><td style='background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:32px;'>
    <h2 style='margin:0 0 4px;color:#8B4513;'>Nueva confirmación · Ania XV</h2>
    <p style='margin:0 0 24px;color:#888;font-size:13px;'>" . date('d/m/Y H:i') . "</p>
    <table width='100%' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='width:40%;font-weight:bold;color:#8B4513;'>Nombre</td><td>$nombre</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Correo</td><td>$correo</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Asistencia</td>
        <td>" . ($asiste ? '✅ Sí asiste' : '❌ No puede asistir') . "</td></tr>" .
      ($asiste ? "
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Adultos</td><td>$adultos</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Niños</td><td>$ninos</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Total</td><td><strong>$total</strong></td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Resumen</td><td>$resumenMenus</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Detalle</td><td>$menus</td></tr>
      <tr style='background:#fdf3e3;border-bottom:1px solid #e8d5b0;'>
        <td style='font-weight:bold;color:#8B4513;'>Alergias</td><td>$alergias</td></tr>
      <tr style='border-bottom:1px solid #efefef;'>
        <td style='font-weight:bold;color:#8B4513;'>Notas</td><td>$notas</td></tr>
      <tr style='background:#fdf3e3;'>
        <td style='font-weight:bold;color:#8B4513;'>Código</td><td><code>$codigo</code></td></tr>" : "") . "
    </table>
  </td></tr>
</table></body></html>";

/* ─── 5. ENVIAR CORREOS Y REGISTRAR RESULTADO ────────────────────────── */
$errores = [];

// Correo al invitado. Solo este lleva el QR incrustado: es su pase.
$imagenesDelInvitado = ($asiste && $qrPng)
    ? [['cid' => 'qrpase', 'tipo' => 'image/png', 'datos' => $qrPng]]
    : [];

/* ⚡ SI NO HAY A QUIÉN ESCRIBIRLE, NO ES UN ERROR (2026-09-02).
   Con las invitaciones nominales, un grupo puede no tener correo cargado en
   el panel —y el invitado ya no lo escribe—. Antes se intentaba mandar el
   mail igual, fallaba, y ese fallo se sumaba a $errores: la respuesta salía
   con ok:false y el invitado veía "No pudimos registrar tu confirmación"
   AUNQUE la confirmación sí se había guardado. Peor imposible: le decíamos
   que falló algo que en realidad funcionó, y volvía a intentarlo.
   Su pase sigue estando a mano: se le muestra en pantalla al confirmar y
   vuelve a aparecer cada vez que abre su link personal. */
if ($correoValido) {
    $r1 = smtpEnviar(
        $correo,
        $asiste ? "¡Tu confirmación está lista! ✦ Ania XV" : "Gracias por avisarnos · Ania XV",
        $htmlInvitado,
        $CORREO_FROM, 'Ania XV',
        $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS,
        '',                      // sin Reply-To distinto
        $imagenesDelInvitado
    );
    if ($r1 !== true) {
        $errores[] = "Correo al invitado: $r1";
        error_log('[Ania XV] ❌ Correo invitado: ' . $r1);
    } else {
        error_log('[Ania XV] ✅ Correo enviado a: ' . $correo);
    }
} else {
    error_log('[Ania XV] ℹ Sin correo del invitado: se guardó la confirmación y no se manda pase por mail.');
}

// Correo a las administradoras (Procesar múltiples correos)
$listaAdmins = array_map('trim', explode(',', $CORREO_ADMIN));

foreach ($listaAdmins as $adminEmail) {
    if (empty($adminEmail)) continue;

    $r2 = smtpEnviar(
        $adminEmail,
        ($asiste ? '✅ ' : '❌ ') . "Confirmación de $nombre · Ania XV",
        $htmlAdmin,
        $CORREO_FROM, 'Ania XV',
        $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS
    );
    
    if ($r2 !== true) {
        $errores[] = "Correo admin ($adminEmail): $r2";
        error_log("[Ania XV] ❌ Correo admin ($adminEmail): $r2");
    } else {
        error_log("[Ania XV] ✅ Correo enviado a admin: $adminEmail");
    }
}

/* ─── 6. RESPUESTA JSON REAL ──────────────────────────────────────────────
 *
 * ⚡ EL ÉXITO LO DEFINE LA FILA GUARDADA, NO EL CORREO (2026-09-03)
 *
 * Acá se respondía `ok:false` si CUALQUIER correo había fallado — y el
 * navegador traduce eso a "No pudimos registrar tu confirmación. Revisa
 * tu conexión e inténtalo de nuevo." O sea que le decíamos a alguien que
 * no había confirmado cuando su fila ya estaba escrita en la base.
 *
 * El comentario de más arriba (el de `$correoValido`) describe
 * exactamente este problema y lo llama "peor imposible"… pero solo se
 * arregló para el correo DEL INVITADO. Los dos de las administradoras
 * seguían sumando a `$errores`, y son los que más fallan: van a Gmail
 * desde el SMTP de Hostinger, y con ciento catorce personas confirmando
 * la misma noche, que uno entre en diferido o greylisting es lo
 * esperable, no lo raro.
 *
 * La regla, ahora explícita: **la confirmación es de la persona, no del
 * correo.** Si la fila se guardó, confirmó. Los correos son un extra que
 * se reporta aparte —para el log y para diagnóstico— pero que nunca
 * puede hacerle creer que perdió su lugar.
 *
 * El único fallo que sí es un fallo: que no se haya podido guardar.
 */
if ($errorBD !== null) {
    // Esto sí es un error de verdad: no quedó registro de nada.
    http_response_code(500);
    echo json_encode([
        'ok'     => false,
        'bdOk'   => false,
        'error'  => 'No pudimos guardar tu confirmación. Intenta de nuevo en un momento.',
        'errores' => $errores,
    ]);
} else {
    /* Se guardó. Para el invitado esto es un éxito, punto.
       `avisos` viaja para que el panel y el log puedan ver qué correo no
       salió, sin que eso cambie lo que la persona lee en pantalla. */
    echo json_encode([
        'ok'      => true,
        'mensaje' => 'Confirmación registrada.',
        'avisos'  => $errores,   // vacío cuando todo salió bien
    ]);

    if (!empty($errores)) {
        error_log('[Ania XV] ⚠ Confirmación guardada, pero ' . count($errores) .
                  ' correo(s) fallaron: ' . implode(' | ', $errores));
    }
}