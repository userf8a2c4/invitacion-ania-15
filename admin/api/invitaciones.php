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

/* Igual que confirmaciones.php/mesas.php: ver es de cualquier cuenta con
   permiso de 'invitados', escribir es de quien pueda editar esa
   sección. exigirAdministrador() queda reservado solo para borrar —
   antes estaba puesta acá arriba para TODO, así que una cuenta no-admin
   (rol 'entrada') recibía 403 al abrir la pestaña, aunque la pestaña se
   le mostraba igual (01-configuracion.js no filtra por rol). */
$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');
exigirPermiso($yo, 'invitados', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');

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
 * ¿Son el mismo nombre de invitado? Sin distinguir mayúsculas ni
 * espacios de más, igual que la colación de la base.
 *
 * ⚠️ VA AL NIVEL SUPERIOR DEL ARCHIVO, NO ADENTRO DEL switch. La escribí
 * primero entre dos `case` y ahí NO EXISTE: PHP solo define una función
 * declarada dentro de una estructura de control cuando la ejecución pasa
 * por encima, y un switch salta directo al case que toca. Habría sido un
 * «Call to undefined function» en la primera llamada, en producción.
 * Es el mismo cuidado que ya se documenta para el panel, que tampoco se
 * empaqueta.
 *
 * @param string $a
 * @param string $b
 * @return bool
 */
function mismoNombreDeInvitado($a, $b) {
    $normalizar = function ($x) {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $x)));
    };
    return $normalizar($a) === $normalizar($b);
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
 * El texto con el que se manda la invitación, tal como quedó guardado
 * desde el panel (Gente → Invitaciones → configuración).
 *
 * TIENE QUE SER IDÉNTICO AL DE admin/codigo/48-invitaciones.js
 * (TEXTO_INVITACION_ORIGINAL). Son los dos canales de la misma
 * invitación: si el correo dijera algo distinto de lo que dice
 * WhatsApp, serían dos voces para la misma familia.
 *
 * @return string La plantilla, con sus huecos sin rellenar.
 */
function textoDeInvitacionConfigurado() {
    $original = TEXTO_DE_INVITACION_POR_OMISION;

    if (!existeTabla('ajustes')) return $original;

    $fila  = consultarUno("SELECT valor FROM ajustes WHERE clave = 'texto_invitacion' LIMIT 1");
    $valor = trim((string) ($fila['valor'] ?? ''));

    if ($valor === '') return $original;

    /* Una copia guardada que es palabra por palabra un texto por
       omisión VIEJO significa que nadie lo editó nunca: se actualiza
       al nuevo, que trae los [uno|varios]. Un texto escrito a mano no
       se toca — el editor explica la sintaxis para que se agregue. */
    if (in_array($valor, textosPorOmisionAnteriores(), true)) return $original;

    return $valor;
}

/* ─── EL TEXTO DE LA INVITACIÓN ──────────────────────────────

   ⚠️ LA SINTAXIS [uno|varios] (2026-09-04)
   El texto le hablaba a un grupo de punta a punta — "contar con
   ustedes", "a su nombre", "pueden confirmar", "Les pedimos" — aunque
   la invitación fuera de UN SOLO pase. Son nueve palabras, no una: el
   arreglo anterior resolvió "lugar/lugares" y dejó las otras ocho.

   Ahora, donde el texto cambia según cuánta gente sea, se escriben las
   dos formas: [contigo|con ustedes]. La primera es para una persona,
   la segunda para varias. Ver resolverSingularPlural().

   TIENE QUE SER IDÉNTICO AL DE admin/codigo/48-invitaciones.js. */

const TEXTO_DE_INVITACION_POR_OMISION =
    "✦ Ania cumple quince años ✦\n\n" .
    "{nombre}:\n\n" .
    "Hay fechas que uno quiere recordar acompañado, y esta es una de ellas. " .
    "Nos dará mucha alegría contar [contigo|con ustedes].\n\n" .
    "Hemos reservado {lugares} a [tu|su] nombre.\n\n" .
    "Aquí está [tu|su] invitación. Ahí mismo [puedes|pueden] confirmar y elegir [tu|su] menú:\n" .
    "{link}\n\n" .
    "[Te|Les] pedimos confirmar antes del {fecha_limite}. " .
    "[Puedes|Pueden] modificar [tu|su] respuesta cuantas veces [gustes|gusten] hasta esa fecha.";

/**
 * Los textos por omisión ANTERIORES, palabra por palabra.
 *
 * POR QUÉ HACE FALTA GUARDARLOS
 * El texto es editable y hay una copia guardada en `ajustes`. Si esa
 * copia es una versión vieja del texto por omisión —o sea, nadie lo
 * editó nunca de verdad, solo se guardó tal cual— entonces cambiar el
 * texto de acá arriba no serviría de nada: se seguiría mandando el
 * viejo, sin los marcadores, en plural para todos.
 *
 * Comparando contra esta lista se puede actualizar ESA copia sin
 * pisarle el texto a nadie que lo haya escrito a mano.
 */
function textosPorOmisionAnteriores() {
    return [
        // El original, con la palabra "lugares" pegada al marcador.
        "✦ Ania cumple quince años ✦\n\n" .
        "{nombre}:\n\n" .
        "Hay fechas que uno quiere recordar acompañado, y esta es una de ellas. " .
        "Nos dará mucha alegría contar con ustedes.\n\n" .
        "Hemos reservado {lugares} lugares a su nombre.\n\n" .
        "Aquí está su invitación. Ahí mismo pueden confirmar y elegir su menú:\n" .
        "{link}\n\n" .
        "Les pedimos confirmar antes del {fecha_limite}. " .
        "Pueden modificar su respuesta cuantas veces gusten hasta esa fecha.",

        // El del 2026-09-04 por la mañana, ya sin la palabra pegada.
        "✦ Ania cumple quince años ✦\n\n" .
        "{nombre}:\n\n" .
        "Hay fechas que uno quiere recordar acompañado, y esta es una de ellas. " .
        "Nos dará mucha alegría contar con ustedes.\n\n" .
        "Hemos reservado {lugares} a su nombre.\n\n" .
        "Aquí está su invitación. Ahí mismo pueden confirmar y elegir su menú:\n" .
        "{link}\n\n" .
        "Les pedimos confirmar antes del {fecha_limite}. " .
        "Pueden modificar su respuesta cuantas veces gusten hasta esa fecha.",
    ];
}

/**
 * Resuelve los `[uno|varios]` del texto.
 *
 * @param string $texto
 * @param bool   $esUno  true si la invitación es de un solo pase.
 * @return string
 */
function resolverSingularPlural($texto, $esUno) {
    // Sin corchetes ni barras adentro de cada lado: así un corchete
    // suelto en el texto no se come media frase.
    return preg_replace('/\\[([^\\[\\]|]*)\\|([^\\[\\]|]*)\\]/u',
                        $esUno ? '$1' : '$2', $texto);
}

/**
 * "1 lugar" / "4 lugares", con el número adelante.
 *
 * Tiene que decir lo mismo que el formulario de la web, que ya resolvía
 * el singular por su cuenta (codigo/11-formulario-confirmacion.js).
 *
 * @param int $cuantos
 * @return string
 */
function lugaresEnPalabras($cuantos) {
    return $cuantos . ($cuantos === 1 ? ' lugar' : ' lugares');
}

/**
 * Quita la palabra "lugares" pegada después de `{lugares}`.
 *
 * ⚠️ POR QUÉ EXISTE (2026-09-04)
 * `{lugares}` era solo el número, y la plantilla escribía la palabra a
 * mano: "Hemos reservado {lugares} lugares a su nombre". A una familia
 * de un solo pase le llegaba **"Hemos reservado 1 lugares"**.
 *
 * Ahora `{lugares}` trae el número Y la palabra en la forma correcta.
 * Pero el texto es editable desde el panel y puede haber una copia
 * GUARDADA con la palabra pegada: sin esto, esa copia diría "1 lugar
 * lugares". Se limpia al leerla, en vez de migrar la base — así
 * funciona igual si algún día se restaura un respaldo viejo.
 *
 * @param string $texto
 * @return string
 */
function conLugaresSinPluralPegado($texto) {
    // Solo cuando la palabra viene INMEDIATAMENTE después del marcador:
    // "{lugares} lugares" y "{lugares} lugar", sin tocar nada más.
    return preg_replace('/\\{lugares\\}\\s+lugar(?:es)?\\b/u', '{lugares}', $texto);
}

/**
 * Rellena los huecos de la plantilla y devuelve el texto en HTML.
 *
 * Misma regla que rellenarHuecosDeInvitacion() en el panel: si todavía
 * no hay fecha límite, el RENGLÓN entero donde va `{fecha_limite}`
 * desaparece — reemplazarla por vacío dejaría "confirmar antes del ."
 * en la invitación de alguien.
 *
 * Cada renglón en blanco separa párrafos, que es como se escribió el
 * texto en el editor y como se ve en WhatsApp.
 *
 * @param string $plantilla
 * @param array  $inv     Fila de `invitaciones`.
 * @param string $link
 * @param string $fechaLimite  En texto, o '' si no hay.
 * @return string HTML ya escapado.
 */
function invitacionComoHtml($plantilla, $inv, $link, $fechaLimite) {
    // Acá y no al leer el ajuste: por esta función pasan la plantilla
    // guardada, la original y cualquiera que llegue de afuera.
    $texto = resolverSingularPlural(
        conLugaresSinPluralPegado((string) $plantilla),
        ((int) ($inv['pases'] ?? 0)) === 1
    );

    if ($fechaLimite === '') {
        $renglones = array_filter(
            explode("\n", $texto),
            function ($renglon) { return strpos($renglon, '{fecha_limite}') === false; }
        );
        $texto = implode("\n", $renglones);
    }

    $texto = strtr($texto, [
        '{nombre}'       => $inv['nombre'],
        // El número Y la palabra: "1 lugar" / "4 lugares". La plantilla
        // ya no escribe "lugares" a mano (ver conLugaresSinPluralPegado).
        '{lugares}'      => lugaresEnPalabras((int) $inv['pases']),
        '{link}'         => $link,
        '{fecha_limite}' => $fechaLimite,
    ]);

    $texto = preg_replace("/\n{3,}/", "\n\n", trim($texto));

    /* Se escapa TODO y recién después se arman los párrafos: así un
       nombre con `<` o un `&` en el link no pueden romper el HTML del
       correo ni inyectar nada. El link se vuelve enlace aparte, ya
       escapado, comparando contra el texto escapado. */
    $seguro = htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');

    // La guarda del vacío no es teórica: str_replace('', …) inserta la
    // etiqueta entre CADA carácter del mensaje.
    if ($link !== '') {
        $linkSeguro = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
        $seguro = str_replace(
            $linkSeguro,
            '<a href="' . $linkSeguro . '">' . $linkSeguro . '</a>',
            $seguro
        );
    }

    $parrafos = preg_split("/\n\n/", $seguro);
    $html = '';
    foreach ($parrafos as $parrafo) {
        if (trim($parrafo) === '') continue;
        $html .= '<p>' . nl2br($parrafo) . '</p>';
    }

    return $html;
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
    // array_map('intval', ...) es a propósito: según el driver, PDO puede
    // devolver los ids como string. Con in_array(..., true) (estricto),
    // un id string nunca matchea contra el int que arma este archivo, y
    // TODAS las personas se tratarían como nuevas — reproduciendo el
    // mismo borrado en cascada que este bloque existe para evitar.
    $idsActuales = array_map('intval', array_column($actuales, 'id'));
    $idsQueLlegan = [];

    /* El apodo interno de cada persona. La columna la agrega el
       instalador, así que se pregunta una sola vez acá arriba y no una
       por persona. */
    $guardaApodo = in_array('apodo', columnasDe('acompanantes'), true);

    foreach ($personas as $persona) {
        $nombre   = trim((string) ($persona['nombre'] ?? ''));
        if ($nombre === '') continue;
        $tipo     = ($persona['tipo'] ?? 'adulto') === 'nino' ? 'nino' : 'adulto';
        $telefono = trim((string) ($persona['telefono'] ?? ''));
        $correo   = trim((string) ($persona['correo'] ?? ''));
        $id       = (int) ($persona['id'] ?? 0);

        $fila = [
            'nombre' => $nombre, 'tipo' => $tipo,
            'telefono' => $telefono, 'correo' => $correo,
        ];
        /* ⚠️ SOLO SI VINO EN EL PEDIDO. Un `?? ''` acá borraría el apodo
           de todas las personas cada vez que se guarde cualquier pantalla
           del panel que mande la lista sin ese campo — que son casi
           todas. Se distingue "no me lo mandaste" (no tocar) de "me
           mandaste vacío" (borrarlo a propósito). */
        if ($guardaApodo && array_key_exists('apodo', $persona)) {
            $fila['apodo'] = mb_substr(
                trim((string) $persona['apodo']), 0, 150);
        }

        if ($id > 0 && in_array($id, $idsActuales, true)) {
            actualizar('acompanantes', $id, $fila);
            $idsQueLlegan[] = $id;
        } else {
            $nuevoId = insertar('acompanantes',
                array_merge(['confirmacion_id' => $confirmacionId], $fila));
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

    /* ⚡ NADA DE `confirmaciones`/`grupos_invitados` SE ASUME (2026-08-28).
       Todo este archivo insiste en no confiar en el esquema de
       `confirmaciones` — este SELECT era la excepción: escribía
       `c.id AS confirmacion_id_real` a mano y hacía LEFT JOIN a las dos
       tablas sin comprobar que existieran. Si cualquiera de las dos
       faltaba (o no tenía `id`), la consulta entera reventaba con un
       error de SQL crudo. Ahora el SELECT se arma en partes: cada JOIN
       entra solo si la tabla existe. */
    $hayConfirmaciones = existeTabla('confirmaciones');
    $hayGrupos         = existeTabla('grupos_invitados');

    $columnasConf = $hayConfirmaciones ? columnasDe('confirmaciones') : [];
    $tieneId      = in_array('id', $columnasConf, true);
    $tieneAsiste  = in_array('asiste', $columnasConf, true);
    $tieneAdultos = in_array('adultos', $columnasConf, true);
    $tieneNinos   = in_array('ninos', $columnasConf, true);
    $tieneCodigo  = in_array('codigo', $columnasConf, true);

    $selectConf = ($hayConfirmaciones && $tieneId ? 'c.id AS confirmacion_id_real' : 'NULL AS confirmacion_id_real')
        . ($hayConfirmaciones && $tieneAsiste  ? ', c.asiste'  : ', NULL AS asiste')
        . ($hayConfirmaciones && $tieneAdultos ? ', c.adultos' : ', NULL AS adultos')
        . ($hayConfirmaciones && $tieneNinos   ? ', c.ninos'   : ', NULL AS ninos')
        . ($hayConfirmaciones && $tieneCodigo  ? ', c.codigo'  : ', NULL AS codigo');

    $joinConf   = $hayConfirmaciones ? 'LEFT JOIN confirmaciones c ON c.id = i.confirmacion_id' : '';
    $joinGrupos = $hayGrupos ? 'LEFT JOIN grupos_invitados g ON g.id = i.grupo_id' : '';
    $selectGrupo = $hayGrupos ? ', g.nombre AS grupo_nombre' : ', NULL AS grupo_nombre';

    $filas = consultarTodo(
        "SELECT i.*, $selectConf $selectGrupo
         FROM invitaciones i
         $joinConf
         $joinGrupos
         ORDER BY i.creado_en DESC"
    );

    // Las personas de cada grupo, para que el formulario de edición las
    // pueda mostrar CON SU id — sin el id, reconciliarPersonasDelGrupo()
    // las tomaría por nuevas y borraría las viejas en cascada (se
    // llevaría con ellas sus reglas de mesa y su lugar ya asignado).
    $hayAcompanantes = existeTabla('acompanantes');

    /* El apodo viaja al panel —es donde sirve— para poder verlo y
       editarlo. Se pide solo si la columna existe: el SELECT es
       explícito (no `*`), así que nombrarla antes de que el instalador
       corra reventaría la lista entera de Gente.

       ⚠️ ESTA ES LA API DEL PANEL, detrás de sesión. La del sitio
       público es invitacion.php, y ahí el apodo no se nombra nunca. */
    $columnasPersona = 'id, nombre, tipo, telefono, correo, menu, alergias'
        . ($hayAcompanantes && in_array('apodo', columnasDe('acompanantes'), true)
            ? ', apodo' : '');

    foreach ($filas as &$fila) {
        $fila['link'] = linkDeInvitacion($fila['token']);
        $fila['personas'] = ($hayAcompanantes && $fila['confirmacion_id'])
            ? consultarTodo(
                "SELECT $columnasPersona
                 FROM acompanantes WHERE confirmacion_id = :c ORDER BY id ASC",
                [':c' => $fila['confirmacion_id']])
            : [];
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

    /* El apodo: la referencia interna de quien organiza. Vacío = no hay
       apodo, y el panel usa el nombre.
       La columna se agrega desde el instalador, así que se pregunta antes
       de escribirla — mismo criterio que `confirmaciones.nombre` unas
       líneas más abajo. */
    $apodo     = campoTexto($datos, 'apodo', 150);
    $guardaApodo = in_array('apodo', columnasDe('invitaciones'), true);

    if ($nombre === '') responderMal('Falta el nombre del grupo.', 400);
    if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        responderMal('Ese correo no parece válido.', 400);
    }

    // Si hay personas nombradas, los pases son la cantidad de nombres
    // (con nombre no vacío) — no se piden por separado. Si no hay
    // ninguna, se usa el número que se haya puesto a mano.
    $nombresValidos = array_filter($personas, function ($p) {
        return trim((string) ($p['nombre'] ?? '')) !== '';
    });
    /* ⚡ LO QUE HACE FALTA ES LA COMPOSICIÓN DEL GRUPO, NO LOS NOMBRES
       (2026-09-02). El invitado ve una lista con un lugar por persona,
       donde marca quién viene y elige su plato. Para armarla alcanza con
       saber CUÁNTA gente es — los lugares sin nombre se muestran como
       "Adulto 1", "Niño 2", y pasan a mostrar el nombre real en cuanto
       Lucila lo escriba. Exigir los nombres para crear la invitación
       habría frenado el trabajo sin ninguna ganancia: se puede repartir un
       enlace perfectamente útil antes de tener cada nombre.

       Los pases salen de la cantidad de nombres cuando los hay (así no se
       pueden contradecir) y del número cargado a mano cuando no. */
    $pases = count($nombresValidos) > 0
        ? count($nombresValidos)
        : max(1, campoEntero($datos, 'pases', 1, 500, 1));

    if ($id > 0) {
        /* ─── EDITAR ─── */
        $existente = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
        if (!$existente) responderMal('Esa invitación no existe.', 404);

        $cambios = [
            'nombre'   => $nombre,
            'telefono' => $telefono,
            'correo'   => $correo,
            'pases'    => $pases,
            'grupo_id' => $grupoId > 0 ? $grupoId : null,
        ];
        if ($guardaApodo) $cambios['apodo'] = $apodo;
        actualizar('invitaciones', $id, $cambios);

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

    $filaInvitacion = [
        'token'           => $token,
        'nombre'          => $nombre,
        'telefono'        => $telefono,
        'correo'          => $correo,
        'pases'           => $pases,
        'grupo_id'        => $grupoId > 0 ? $grupoId : null,
        'confirmacion_id' => $confirmacionId,
        'estado'          => 'sin_enviar',
    ];
    if ($guardaApodo) $filaInvitacion['apodo'] = $apodo;

    $invitacionId = insertar('invitaciones', $filaInvitacion);

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

    // ⚡ (2026-08-30) Cupo sustractivo: se AVISA, nunca se bloquea acá —
    // a diferencia del formulario público sin token (confirmar.php),
    // esta alta la ve Lucila antes de guardar y puede haber sobre-reserva
    // intencional (gente que históricamente no llega). armarFilaDeConfirmacion()
    // ya insertó con asiste=1 arriba, así que la cuenta de acá ABAJO ya
    // incluye a este grupo nuevo.
    $seExcede = false;
    if (existeTabla('mesas')) {
        $ocupadas = (int) (consultarUno(
            'SELECT COALESCE(SUM(adultos+ninos),0) AS t FROM confirmaciones WHERE asiste = 1'
        )['t'] ?? 0);
        $capacidadTotal = (int) (consultarUno(
            'SELECT COALESCE(SUM(capacidad),0) AS t FROM mesas'
        )['t'] ?? 0);
        $seExcede = $capacidadTotal > 0 && $ocupadas > $capacidadTotal;
    }

    responderBien([
        'id'              => $invitacionId,
        'token'           => $token,
        'link'            => linkDeInvitacion($token),
        'confirmacion_id' => $confirmacionId,
        'creado'          => true,
        'se_excede'       => $seExcede,
        'aviso'           => $seExcede
            ? 'Ojo: con este grupo ya se pasan de la capacidad del salón.'
            : '',
    ], 201);
    break;


/* ─── MARCAR ENVIADA ──────────────────────────────────────────────────── */

case 'marcar_enviada':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // ⚡ El 3er parámetro de campoEntero() es el MÍNIMO, no un respaldo
    // (2026-08-28) — con 1 acá, un POST sin `id` (o id:0) daba 0, se
    // elevaba al mínimo 1, y esta acción actuaba sobre la invitación #1
    // en vez de fallar. Ahora se pide 0 y se rechaza a mano si no vino.
    $id = campoEntero($datos, 'id', 0);
    if ($id <= 0) responderMal('Falta decir qué invitación.', 400);

    $inv = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
    if (!$inv) responderMal('Esa invitación no existe.', 404);

    // Si ya respondió (confirmada/declinada), no la volvemos a "enviada"
    // para atrás: marcar_enviada es solo para el primer contacto.
    $cambios = ['veces_enviado' => (int) ($inv['veces_enviado'] ?? 0) + 1];
    if ($inv['estado'] === 'sin_enviar') {
        $cambios['estado'] = 'enviada';
        $cambios['enviada_en'] = date('Y-m-d H:i:s');
    }
    /* `veces_enviado` y `enviada_en` se agregaron a `invitaciones` en
       rondas posteriores a la que creó la tabla. En una instalación que
       no volvió a correr instalar.php, nombrarlas acá cortaba la
       petición con un 500 — y este archivo ya se cuida así para LEER
       (ver $columnasInv en confirmaciones.php), solo faltaba al
       escribir. Ver soloColumnasQueExisten() en _lib/bd.php. */
    actualizar('invitaciones', $id, soloColumnasQueExisten('invitaciones', $cambios));

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
    // La MISMA plantilla que usa WhatsApp desde el panel: una sola voz
    // por los dos canales. Ver textoDeInvitacionConfigurado().
    $plantilla   = textoDeInvitacionConfigurado();

    $mandados = 0;
    $sinCorreo = 0;
    $fallidos = 0;

    foreach ($ids as $idCrudo) {
        $id = (int) $idCrudo;
        if ($id <= 0) continue;

        $inv = consultarUno('SELECT * FROM invitaciones WHERE id = :i', [':i' => $id]);
        // Un id que ya no existe NO es lo mismo que "sin correo" — antes
        // se contaba igual y el número de "sin_correo" mentía.
        if (!$inv) continue;
        if ($inv['correo'] === '') { $sinCorreo++; continue; }

        $link = linkDeInvitacion($inv['token']);
        $asunto = 'Ania cumple quince años — su invitación';
        $cuerpoHtml = invitacionComoHtml($plantilla, $inv, $link, $fechaLimite);

        // enviarCorreo() (no smtpEnviar() directo) ya arma los datos SMTP
        // desde env() — es el mismo wrapper que usa admin/api/correo.php.
        // Devuelve `true` o el texto del error, nunca lanza excepción.
        $resultado = enviarCorreo($inv['correo'], $asunto, $cuerpoHtml);
        if ($resultado === true) {
            /* ⚠️ ACÁ EL CORREO YA SALIÓ (2026-09-04). Si esta escritura
               moría —porque `veces_enviado` o `enviada_en` todavía no
               existen en esta instalación—, la petición se cortaba con
               un 500 en la PRIMERA invitación: los correos que ya
               habían salido no quedaban registrados, el panel decía que
               falló todo, y reintentar mandaba el mismo correo de
               nuevo a gente que ya lo tenía. Ver
               soloColumnasQueExisten() en _lib/bd.php. */
            actualizar('invitaciones', $id, soloColumnasQueExisten('invitaciones', [
                'estado'        => $inv['estado'] === 'sin_enviar' ? 'enviada' : $inv['estado'],
                'enviada_en'    => date('Y-m-d H:i:s'),
                'veces_enviado' => (int) ($inv['veces_enviado'] ?? 0) + 1,
            ]));
            $mandados++;
        } else {
            $fallidos++;
            error_log('[Ania XV · invitaciones] No se pudo mandar a ' . $inv['correo'] . ': ' . $resultado);
        }
    }

    responderBien(['mandados' => $mandados, 'sin_correo' => $sinCorreo, 'fallidos' => $fallidos]);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    exigirAdministrador();
    $datos = cuerpoJson();
    // Mismo motivo que en marcar_enviada: el mínimo no es un respaldo.
    // Acá el error es más grave — borraba la invitación #1 entera, con
    // su confirmación, sus personas y su mesa, y respondía "ok".
    $id = campoEntero($datos, 'id', 0);
    if ($id <= 0) responderMal('Falta decir qué invitación.', 400);

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


/* ─── UNA SOLA, POR SU CONFIRMACIÓN ───────────────────────────────────────
   Para la ficha de "Gente → Invitados" (confirmaciones.php/08-vista-
   invitados.js): esa pantalla ve la CONFIRMACIÓN, no la invitación, y
   hasta ahora no tenía forma de mostrar su link personal sin duplicar
   toda la consulta de 'listar'. Devuelve lo mínimo que hace falta. */

case 'por_confirmacion':
    exigirMetodo('GET');
    $confirmacionId = (int) ($_GET['confirmacion_id'] ?? 0);
    if ($confirmacionId <= 0) responderMal('Falta decir de qué confirmación.', 400);

    $inv = consultarUno(
        'SELECT id, token, nombre, telefono, correo, pases, estado
         FROM invitaciones WHERE confirmacion_id = :c LIMIT 1',
        [':c' => $confirmacionId]
    );

    if (!$inv) { responderBien(['existe' => false]); break; }

    $inv['existe'] = true;
    $inv['link'] = linkDeInvitacion($inv['token']);
    responderBien($inv);
    break;


/* ─── GENERAR LINK PARA UNA CONFIRMACIÓN QUE YA EXISTE ────────────────────
   Para las de antes de este modelo (formulario abierto, sin token) o
   cualquiera que se haya creado sin invitación nominal. A diferencia de
   'guardar' (que SIEMPRE crea una `confirmaciones` nueva), esto ATA un
   token a una fila que YA está — nunca duplica la confirmación. */

case 'generar_link':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacionId = campoEntero($datos, 'confirmacion_id', 0);
    if ($confirmacionId <= 0) responderMal('Falta decir de qué confirmación.', 400);

    $conf = consultarUno('SELECT * FROM confirmaciones WHERE id = :c', [':c' => $confirmacionId]);
    if (!$conf) responderMal('Esa confirmación no existe.', 404);

    $yaTiene = consultarUno('SELECT id FROM invitaciones WHERE confirmacion_id = :c', [':c' => $confirmacionId]);
    if ($yaTiene) responderMal('Esta confirmación ya tiene un link.', 400);

    do {
        $token = bin2hex(random_bytes(8));
        $tokenYaExiste = consultarUno('SELECT id FROM invitaciones WHERE token = :t', [':t' => $token]);
    } while ($tokenYaExiste);

    $pases = max(1, (int) ($conf['adultos'] ?? 0) + (int) ($conf['ninos'] ?? 0));

    $invitacionId = insertar('invitaciones', [
        'token'           => $token,
        'nombre'          => (string) ($conf['nombre'] ?? ''),
        'telefono'        => '',
        'correo'          => (string) ($conf['correo'] ?? ''),
        'pases'           => $pases,
        'grupo_id'        => null,
        'confirmacion_id' => $confirmacionId,
        // Se marca directamente como "confirmada"/"declinada" según lo
        // que ya haya contestado -no tendría sentido que un invitado que
        // YA vino a la fiesta el año pasado (o ya confirmó por teléfono)
        // aparezca como "sin enviar" solo porque el link se generó después.
        'estado'          => ((int) ($conf['asiste'] ?? 0) === 1) ? 'confirmada' : 'sin_enviar',
    ]);

    anotarEnBitacora($yo, 'generó un link para una confirmación existente',
                     'invitaciones', $invitacionId, (string) ($conf['nombre'] ?? ''));

    responderBien([
        'id'    => $invitacionId,
        'token' => $token,
        'link'  => linkDeInvitacion($token),
    ], 201);
    break;


/* ─── QUE CADA LINK ABRA LA INVITACIÓN DE SU DUEÑO ────────────────────────
 *
 * ⚠️ ANTES DE REPARTIR, NO DESPUÉS. Igual que llegadas.php?accion=
 * revisar_codigos, pero para el otro extremo: el link personal.
 *
 * QUÉ SE ROMPIÓ, Y CÓMO
 * Cada invitación es PERSONALIZADA: el link de Andy tiene que saludar a
 * Andy. Hay dos formas distintas de que deje de hacerlo, y las dos
 * estaban vivas:
 *
 *   A. NOMBRE VIEJO. confirmaciones.php nunca escribe en `invitaciones`.
 *      Renombrar a alguien en Gente —la pantalla que se usa todos los
 *      días— no toca `invitaciones.nombre`, así que su link sigue
 *      saludando con el nombre con el que se cargó, para siempre.
 *
 *   B. INVITACIÓN HEREDADA, que es la grave. `invitaciones.confirmacion_id`
 *      no tiene UNIQUE ni clave foránea (ver migracion.sql), y
 *      confirmaciones.php?accion=borrar —el «Borrar» de la ficha de
 *      Gente— limpiaba `asignacion_mesas` pero NO la invitación. Al
 *      borrar a alguien, su fila de `invitaciones` sobrevivía apuntando
 *      a un id que quedaba libre; cuando la base reutiliza ese id para
 *      un invitado nuevo, la invitación vieja se le engancha. El link
 *      del invitado nuevo abre entonces con el NOMBRE y el ESTADO DE
 *      RESPUESTA del que ya no está.
 *
 * Las dos se ven igual desde afuera —«el link dice otro nombre»— pero
 * B además filtra a un tercero si ya contestó lo que contestó, así que
 * se separan en el informe.
 *
 * ⚠️ LO QUE ESTE INFORME NO PUEDE SABER. Si el invitado nuevo no tenía
 * link propio, una invitación heredada (B) es indistinguible de un
 * nombre viejo (A): las dos son una sola fila con el nombre que no
 * corresponde. El único caso que delata a B con certeza es cuando la
 * misma confirmación termina con DOS invitaciones. Por eso el arreglo
 * de nombres se ofrece aparte del de identidades: no se rota un token
 * que quizás ya se mandó bien, sin decirlo.
 */

case 'revisar_links':
    exigirMetodo(['GET']);
    exigirAdministrador();

    $invitaciones   = consultarTodo(
        'SELECT id, token, nombre, confirmacion_id, estado, respondida_en
         FROM invitaciones ORDER BY id'
    );
    $confirmaciones = consultarTodo('SELECT id, nombre FROM confirmaciones ORDER BY id');

    $nombreDeLaConfirmacion = [];
    foreach ($confirmaciones as $c) {
        $nombreDeLaConfirmacion[(int) $c['id']] = (string) $c['nombre'];
    }

    // Cuántas invitaciones apuntan a cada confirmación: dos es la huella
    // inconfundible de una invitación heredada (caso B).
    $cuantasApuntanA = [];
    foreach ($invitaciones as $i) {
        $c = (int) $i['confirmacion_id'];
        if ($c) $cuantasApuntanA[$c] = ($cuantasApuntanA[$c] ?? 0) + 1;
    }

    $sinToken        = [];   // el link no lo aceptaría ni invitacion.php
    $tokenRepetido   = [];   // no debería poder pasar (hay UNIQUE), se mira igual
    $sinConfirmacion = [];   // link sin lugares: abre y no puede confirmar
    $huerfanas       = [];   // apunta a alguien que ya no existe
    $duplicadas      = [];   // dos links para el mismo invitado (caso B seguro)
    $nombreDistinto  = [];   // el link saluda a otro
    $bien            = 0;

    $tokensVistos = [];

    foreach ($invitaciones as $inv) {
        $token  = (string) $inv['token'];
        $confId = (int) $inv['confirmacion_id'];

        $quien = [
            'id'                => (int) $inv['id'],
            'token'             => $token,
            'nombre_en_el_link' => (string) $inv['nombre'],
            'confirmacion_id'   => $confId ?: null,
            'estado'            => (string) $inv['estado'],
            'link'              => linkDeInvitacion($token),
        ];

        /* EL MISMO FILTRO QUE APLICA invitacion.php, letra por letra. Si
           acá se aceptara un token que allá se limpia distinto, la
           revisión diría que todo está bien y el invitado vería un 404. */
        $limpio = preg_replace('/[^a-f0-9]/', '', strtolower($token));
        if ($limpio === '' || strlen($limpio) < 8 || $limpio !== strtolower(trim($token))) {
            $sinToken[] = $quien;
            continue;
        }

        if (isset($tokensVistos[$limpio])) {
            $tokenRepetido[] = $quien + ['tambien_de' => $tokensVistos[$limpio]];
            continue;
        }
        $tokensVistos[$limpio] = (string) $inv['nombre'];

        if (!$confId) { $sinConfirmacion[] = $quien; continue; }

        if (!array_key_exists($confId, $nombreDeLaConfirmacion)) {
            $huerfanas[] = $quien;
            continue;
        }

        $nombreReal = $nombreDeLaConfirmacion[$confId];
        $quien['nombre_del_invitado'] = $nombreReal;

        if (($cuantasApuntanA[$confId] ?? 0) > 1) { $duplicadas[] = $quien; continue; }

        if (!mismoNombreDeInvitado($quien['nombre_en_el_link'], $nombreReal)) {
            $nombreDistinto[] = $quien;
            continue;
        }

        $bien++;
    }

    /* Y al revés: quién se quedó sin ningún link. No es un link roto,
       pero es una persona a la que no se le puede mandar nada. */
    $sinLink = [];
    foreach ($confirmaciones as $c) {
        if (!isset($cuantasApuntanA[(int) $c['id']])) {
            $sinLink[] = ['id' => (int) $c['id'], 'nombre' => (string) $c['nombre']];
        }
    }

    $rotos = count($sinToken) + count($tokenRepetido) + count($sinConfirmacion) +
             count($huerfanas) + count($duplicadas) + count($nombreDistinto);

    responderBien([
        'invitaciones'    => count($invitaciones),
        'confirmaciones'  => count($confirmaciones),
        'bien'            => $bien,
        'rotos'           => $rotos,
        'sin_token'       => $sinToken,
        'token_repetido'  => $tokenRepetido,
        'sin_confirmacion'=> $sinConfirmacion,
        'huerfanas'       => $huerfanas,
        'duplicadas'      => $duplicadas,
        'nombre_distinto' => $nombreDistinto,
        'sin_link'        => $sinLink,
    ]);
    break;


/* ─── ARREGLARLO, DICIENDO QUÉ SE TOCA ────────────────────────────────────
 *
 * Dos modos, a propósito separados, porque uno rompe links y el otro no:
 *
 *   'nombres'    → pone en cada invitación el nombre de SU invitado.
 *                  No toca ningún token: un link ya mandado sigue
 *                  funcionando, solo que ahora saluda bien.
 *
 *   'identidades'→ borra las invitaciones huérfanas y las duplicadas.
 *                  ⚠️ ESO MATA ESOS LINKS. Es lo correcto —apuntan a
 *                  alguien que no existe, o son el link de un tercero
 *                  colado en la ficha de otro— pero si alguno se mandó,
 *                  hay que volver a mandar el nuevo. NUNCA borra una
 *                  confirmación: la persona se queda, lo que se va es el
 *                  link mal atado, y después se le genera uno con
 *                  accion=generar_link.
 */
case 'reparar_links':
    exigirMetodo('POST');
    exigirAdministrador();

    $datos = cuerpoJson();
    $modo  = (string) ($datos['modo'] ?? '');
    if (!in_array($modo, ['nombres', 'identidades'], true)) {
        responderMal('Hay que decir qué reparar: «nombres» o «identidades».', 400);
    }

    $invitaciones = consultarTodo(
        'SELECT id, token, nombre, confirmacion_id FROM invitaciones ORDER BY id'
    );
    $nombreDeLaConfirmacion = [];
    foreach (consultarTodo('SELECT id, nombre FROM confirmaciones') as $c) {
        $nombreDeLaConfirmacion[(int) $c['id']] = (string) $c['nombre'];
    }

    $cuantasApuntanA = [];
    foreach ($invitaciones as $i) {
        $c = (int) $i['confirmacion_id'];
        if ($c) $cuantasApuntanA[$c] = ($cuantasApuntanA[$c] ?? 0) + 1;
    }

    $hechos = [];

    if ($modo === 'nombres') {
        foreach ($invitaciones as $inv) {
            $confId = (int) $inv['confirmacion_id'];
            if (!$confId || !array_key_exists($confId, $nombreDeLaConfirmacion)) continue;
            // Las duplicadas no se renombran acá: primero hay que decidir
            // cuál sobrevive, y de eso se encarga el otro modo.
            if (($cuantasApuntanA[$confId] ?? 0) > 1) continue;

            $nombreReal = $nombreDeLaConfirmacion[$confId];
            if (mismoNombreDeInvitado($inv['nombre'], $nombreReal)) continue;

            actualizar('invitaciones', (int) $inv['id'], ['nombre' => $nombreReal]);
            $hechos[] = [
                'que'    => 'nombre corregido',
                'id'     => (int) $inv['id'],
                'antes'  => (string) $inv['nombre'],
                'ahora'  => $nombreReal,
                'link'   => linkDeInvitacion((string) $inv['token']),
            ];
        }
    } else {
        foreach ($invitaciones as $inv) {
            $confId  = (int) $inv['confirmacion_id'];
            $esHuerfana = $confId && !array_key_exists($confId, $nombreDeLaConfirmacion);

            /* De un grupo de duplicadas sobrevive la que SÍ se llama como
               su invitado; si ninguna coincide, la más nueva (id mayor),
               que es la que se creó para esta persona. */
            $esDuplicadaQueSobra = false;
            if ($confId && ($cuantasApuntanA[$confId] ?? 0) > 1) {
                $delGrupo = array_values(array_filter($invitaciones,
                    function ($x) use ($confId) { return (int) $x['confirmacion_id'] === $confId; }));
                $nombreReal = $nombreDeLaConfirmacion[$confId] ?? '';
                $buena = null;
                foreach ($delGrupo as $candidata) {
                    if (mismoNombreDeInvitado($candidata['nombre'], $nombreReal)) { $buena = $candidata; break; }
                }
                if (!$buena) $buena = $delGrupo[count($delGrupo) - 1];
                $esDuplicadaQueSobra = (int) $buena['id'] !== (int) $inv['id'];
            }

            if (!$esHuerfana && !$esDuplicadaQueSobra) continue;

            // Qué se borró queda entero en la bitácora, por si hubo un error.
            anotarEnBitacora($yo,
                $esHuerfana ? 'borró una invitación huérfana' : 'borró una invitación duplicada',
                'invitaciones', (int) $inv['id'],
                json_encode($inv, JSON_UNESCAPED_UNICODE));

            borrar('invitaciones', (int) $inv['id']);

            $hechos[] = [
                'que'   => $esHuerfana ? 'invitación huérfana borrada' : 'invitación duplicada borrada',
                'id'    => (int) $inv['id'],
                'antes' => (string) $inv['nombre'],
                'link'  => linkDeInvitacion((string) $inv['token']),
            ];
        }
    }

    responderBien(['modo' => $modo, 'cuantos' => count($hechos), 'hechos' => $hechos]);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
