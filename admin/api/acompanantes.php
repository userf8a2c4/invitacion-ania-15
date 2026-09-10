<?php
/* ══════════════════════════════════════════════════════════════════════
   ACOMPANANTES.PHP · PONERLE NOMBRE A CADA INVITADO

   QUÉ HACE ESTE ARCHIVO
   Una confirmación dice "3 adultos y 1 niño". Este archivo deja anotar
   quiénes son esos cuatro, uno por uno: nombre, teléfono, menú, alergias.

   EL NÚMERO SIGUE MANDANDO
   La cantidad que puso el invitado en confirmar.php (adultos + niños) no
   se toca nunca desde acá. Nombrar es opcional y progresivo: se pueden
   cargar 0, 2 o los 4. Este archivo solo deja agregar hasta llegar a esa
   cantidad, y no ni uno más — así el conteo de la puerta y el de la
   confirmación jamás quedan en desacuerdo.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar&confirmacion_id=…   los que ya se cargaron
     GET  ?accion=listar_todos               los de TODAS las familias
     POST ?accion=agregar                    uno nuevo
     POST ?accion=editar                     corrige uno que ya existe
     POST ?accion=borrar                     saca uno de la lista
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'invitados', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('acompanantes')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    $confirmacionId = (int) ($_GET['confirmacion_id'] ?? 0);
    if ($confirmacionId < 1) responderMal('Falta decir de qué confirmación.', 400);

    $filas = consultarTodo(
        'SELECT * FROM acompanantes WHERE confirmacion_id = :c ORDER BY id',
        [':c' => $confirmacionId]
    );

    /* ⚡ EL CUPO VIAJA CON LA LISTA (2026-09-09)
       Desde que se puede agregar y quitar gente desde la ficha misma, el
       cupo cambia mientras la ficha está abierta. El panel lo recibía
       una sola vez, al abrir, y lo pasaba de mano en mano: después de
       sumar un primo seguía dibujando "3 de 3" con cuatro personas en la
       lista. Que venga acá, con los datos, es la única forma de que la
       pantalla no pueda contradecir a la base. */
    responderBien([
        'filas' => $filas,
        'cupo'  => cupoDeLaConfirmacion($confirmacionId),
    ]);
    break;

/* ─── LISTAR TODOS ────────────────────────────────────────────────────
   Los integrantes de todas las familias, en una sola consulta.

   POR QUÉ EXISTE, Y POR QUÉ NO ALCANZA CON 'listar' (2026-09-04)
   'listar' pide de a una confirmación, que es lo correcto para la ficha
   de una familia: se abre una, se piden los suyos. Pero para BAJAR LA
   LISTA ENTERA —mudar los invitados de un entorno a otro— haría falta
   una petición por familia: cincuenta y una en el caso de Ania.

   Este panel ya se comió un 429 del hosting por hacer veinte peticiones
   al arrancar (ver la nota de 20-arranque.js). Cincuenta y una seguidas
   es pedirlo de nuevo, y encima para algo que una sola consulta resuelve.

   DEVUELVE LO JUSTO, A PROPÓSITO
   Solo de quién es cada integrante, cómo se llama y si es adulto o niño.
   Ni menús ni alergias: eso pertenece a la confirmación de cada uno y no
   viaja en una mudanza —- quien se muda es la lista de gente, no lo que
   ya contestaron. Menos datos saliendo del servidor es también menos que
   filtrar si algo sale mal. */
case 'listar_todos':
    exigirMetodo('GET');

    $filas = consultarTodo(
        'SELECT confirmacion_id, nombre, tipo
           FROM acompanantes
          ORDER BY confirmacion_id, id'
    );

    responderBien(['filas' => $filas]);
    break;


/* ─── AGREGAR ─────────────────────────────────────────────────────────── */

case 'agregar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    // ⚡ (2026-08-28) El 3er parámetro de campoEntero() es el MÍNIMO, no
    // un respaldo -mismo bug ya encontrado en confirmar.php/invitaciones.php:
    // un confirmacion_id ausente o en 0 se elevaba a 1, agregando el
    // acompañante a la confirmación #1 en vez de fallar.
    $confirmacionId = campoEntero($datos, 'confirmacion_id', 0);
    $nombre         = campoTexto($datos, 'nombre', 150);

    if ($confirmacionId < 1) responderMal('Falta decir de qué confirmación.', 400);
    if ($nombre === '') responderMal('El nombre no puede quedar vacío.', 400);

    $cupo = cupoDeLaConfirmacion($confirmacionId);
    if ($cupo === null) responderMal('Esa confirmación no existe.', 404);

    $yaCargados = (int) consultarUno(
        'SELECT COUNT(*) AS n FROM acompanantes WHERE confirmacion_id = :c',
        [':c' => $confirmacionId]
    )['n'];

    $tipoNuevo = campoOpcion($datos, 'tipo', ['adulto', 'nino'], 'adulto');

    if ($yaCargados >= $cupo) {
        /* ⚡ AGREGAR A UNA FAMILIA COMPLETA YA NO ES UN ERROR (2026-09-09)
           Antes esto era el final del camino: había que ir a «Editar
           invitación», subir los pases, guardar y volver. Ahora, si quien
           pide lo pide a propósito (`subir_cupo`), se le suma el lugar y
           se sigue. El pedido tiene que ser explícito: sin la bandera,
           sigue contestando lo mismo que siempre, porque hay otras
           pantallas que llaman acá y para las que pasarse del cupo sí es
           un error que hay que ver. */
        if (empty($datos['subir_cupo'])) {
            responderMal(
                'Ya se cargaron los ' . $cupo . ' que declaró esta confirmación. ' .
                'Si falta alguien, primero corrige el número de adultos o niños.',
                400
            );
        }
        moverElCupo($confirmacionId, $tipoNuevo, +1);
    }

    $fila = [
        'confirmacion_id' => $confirmacionId,
        'nombre'          => $nombre,
        'tipo'            => $tipoNuevo,
        'telefono'        => campoTexto($datos, 'telefono', 40),
        'correo'          => campoTexto($datos, 'correo', 190),
        'menu'            => campoTexto($datos, 'menu', 120),
        'alergias'        => campoTexto($datos, 'alergias', 200),
        'notas'           => campoTexto($datos, 'notas', 300),
    ];
    // El apodo interno, si la columna ya está (la agrega el instalador).
    if (in_array('apodo', columnasDe('acompanantes'), true)) {
        $fila['apodo'] = campoTexto($datos, 'apodo', 150);
    }

    $id = insertar('acompanantes', $fila);

    anotarEnBitacora($yo, 'agregó un acompañante', 'acompanantes', $id, $nombre);
    responderBien(['id' => $id, 'mensaje' => 'Agregado.'], 201);
    break;


/* ─── EDITAR ──────────────────────────────────────────────────────────── */

case 'editar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // Mismo motivo que en 'agregar': el mínimo de campoEntero() no es
    // un respaldo -un id ausente editaría al acompañante #1 en silencio.
    $id = campoEntero($datos, 'id', 0);
    if ($id < 1) responderMal('Falta decir a quién.', 400);

    $antes = consultarUno('SELECT * FROM acompanantes WHERE id = :id', [':id' => $id]);
    if (!$antes) responderMal('Ese acompañante no existe.', 404);

    $cambios  = [];
    $largos   = ['nombre' => 150, 'apodo' => 150];
    $editables = ['nombre', 'telefono', 'correo', 'menu', 'alergias', 'notas'];

    /* El apodo, solo si la columna ya está: la agrega el
       instalador del panel, y sin esta guarda actualizar() armaría un
       UPDATE nombrando una columna que no existe — con lo cual el editor
       de personas dejaría de guardar NADA, ni el nombre ni el menú. */
    if (in_array('apodo', columnasDe('acompanantes'), true)) {
        $editables[] = 'apodo';
    }

    foreach ($editables as $campo) {
        if (array_key_exists($campo, $datos)) {
            $cambios[$campo] = campoTexto($datos, $campo, $largos[$campo] ?? 300);
        }
    }
    if (array_key_exists('tipo', $datos)) {
        $cambios['tipo'] = campoOpcion($datos, 'tipo', ['adulto', 'nino'], $antes['tipo']);
    }
    if (isset($cambios['nombre']) && $cambios['nombre'] === '') {
        responderMal('El nombre no puede quedar vacío.', 400);
    }
    if (!$cambios) responderMal('No mandaste ningún cambio.', 400);

    actualizar('acompanantes', $id, $cambios);
    responderBien(['mensaje' => 'Cambios guardados.']);
    break;


/* ─── BORRAR ──────────────────────────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    // ⚡ El más peligroso de los tres: sin esta guarda, un POST sin
    // id borraba al acompañante #1 -no un error cualquiera, un DELETE.
    $id = campoEntero($datos, 'id', 0);
    if ($id < 1) responderMal('Falta decir a quién.', 400);

    $fila = consultarUno('SELECT * FROM acompanantes WHERE id = :id', [':id' => $id]);
    if (!$fila) responderMal('Ese acompañante no existe.', 404);

    borrar('acompanantes', $id);

    /* ⚡ QUITAR DEL GRUPO vs. DEJAR SIN NOMBRE (2026-09-09)
       Son dos cosas distintas y el panel ahora ofrece las dos:
         · Sin la bandera —lo de siempre— el lugar SIGUE RESERVADO y solo
           se borra el nombre. Es para cuando todavía no se sabe quién
           viene: "vienen cuatro, tres los tengo".
         · Con `bajar_cupo`, la familia pasa a ser una persona más chica.
           Es para cuando alguien no va a venir.
       Antes solo existía la primera, y una familia que pasaba de cuatro a
       tres quedaba con un lugar fantasma: contado en la cocina, sentado
       en una mesa y ofrecido al invitado en su formulario. */
    if (!empty($datos['bajar_cupo'])) {
        moverElCupo((int) $fila['confirmacion_id'], (string) $fila['tipo'], -1);
    }

    anotarEnBitacora($yo, 'quitó un acompañante', 'acompanantes', $id, (string) $fila['nombre']);
    responderBien(['mensaje' => 'Quitado.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDA ───────────────────────────────────────────────────────────── */

/**
 * Cuántas personas declaró una confirmación (adultos + niños).
 *
 * Es el tope de cuántos acompañantes se pueden nombrar: nombrar nunca
 * puede superar lo que el invitado dijo al confirmar.
 *
 * @param int $confirmacionId
 * @return int|null null si la confirmación no existe.
 */
/**
 * Le suma o le resta lugares a un grupo, en LOS DOS lados a la vez.
 *
 * ⚡ POR QUÉ EXISTE (2026-09-09)
 * Hasta hoy, para agregar a alguien a una familia ya completa había que
 * ir a «Editar invitación», subirle los pases, guardar, y recién
 * entonces ponerle el nombre. El panel lo decía con todas las letras:
 * "Para agregar a alguien más, primero súbele los pases a la
 * invitación". Tres pantallas para sumar un primo.
 *
 * ⚠️ EL CUPO VIVE EN DOS TABLAS Y TIENEN QUE DECIR LO MISMO.
 *   · `confirmaciones.adultos` + `.ninos` es el tope que este archivo
 *     usa para no dejar nombrar más gente que la declarada, y es de
 *     donde salen los conteos del panel y los menús de la cocina.
 *   · `invitaciones.pases` es lo que ve el invitado: "Hemos reservado N
 *     lugares", y el tope de cuántos puede tildar en su formulario.
 * Mover uno solo deja al invitado viendo tres lugares donde el panel
 * cuenta cuatro — o al revés, un invitado que no puede confirmar a
 * alguien que sí está en la lista. Se mueven juntos o no se mueven.
 *
 * ⚠️ NUNCA POR DEBAJO DE LO QUE YA HAY. `pases` no baja de 1 (una
 * invitación de cero lugares no es nada) y los adultos/niños no bajan de
 * 0. Restar más de lo que hay deja el número en el piso, no en negativo.
 *
 * @param int    $confirmacionId
 * @param string $tipo   'adulto' | 'nino' — a qué columna se le toca.
 * @param int    $cuanto  +1 para sumar un lugar, -1 para quitarlo.
 * @return void
 */
function moverElCupo($confirmacionId, $tipo, $cuanto) {
    if (!existeTabla('confirmaciones')) return;

    $columnas = columnasDe('confirmaciones');
    $cual = $tipo === 'nino' ? 'ninos' : 'adultos';
    if (!in_array($cual, $columnas, true)) return;

    $fila = consultarUno(
        "SELECT $cual FROM confirmaciones WHERE id = :id",
        [':id' => $confirmacionId]
    );
    if (!$fila) return;

    $cambios = [$cual => max(0, (int) $fila[$cual] + $cuanto)];

    /* `total`, si esta base la tiene, es la suma de los dos: se recalcula
       en vez de sumarle el delta, para que un total que ya venía torcido
       se enderece solo en la primera edición. */
    if (in_array('total', $columnas, true)) {
        $ambos = consultarUno(
            'SELECT adultos, ninos FROM confirmaciones WHERE id = :id',
            [':id' => $confirmacionId]
        );
        if ($ambos) {
            $adultos = $cual === 'adultos' ? $cambios['adultos'] : (int) $ambos['adultos'];
            $ninos   = $cual === 'ninos'   ? $cambios['ninos']   : (int) $ambos['ninos'];
            $cambios['total'] = $adultos + $ninos;
        }
    }

    actualizar('confirmaciones', $confirmacionId, $cambios);

    /* Y del otro lado, lo que ve el invitado. Se busca por
       confirmacion_id: una confirmación puede no tener invitación (las
       que entraron por el formulario abierto, sin token), y ahí no hay
       nada que mover. */
    if (!existeTabla('invitaciones')) return;
    $inv = consultarUno(
        'SELECT id, pases FROM invitaciones WHERE confirmacion_id = :c LIMIT 1',
        [':c' => $confirmacionId]
    );
    if (!$inv) return;

    actualizar('invitaciones', (int) $inv['id'], [
        'pases' => max(1, (int) $inv['pases'] + $cuanto),
    ]);
}

function cupoDeLaConfirmacion($confirmacionId) {
    if (!existeTabla('confirmaciones')) return null;

    $columnas = columnasDe('confirmaciones');
    if (!in_array('adultos', $columnas, true) || !in_array('ninos', $columnas, true)) {
        // Tabla sin esas columnas: no se puede saber el cupo, así que no
        // se limita (mejor eso que bloquear la función entera).
        return existeTabla('confirmaciones') && consultarUno(
            'SELECT id FROM confirmaciones WHERE id = :id', [':id' => $confirmacionId]
        ) ? 999 : null;
    }

    $fila = consultarUno(
        'SELECT adultos, ninos FROM confirmaciones WHERE id = :id',
        [':id' => $confirmacionId]
    );
    if (!$fila) return null;

    return (int) $fila['adultos'] + (int) $fila['ninos'];
}
