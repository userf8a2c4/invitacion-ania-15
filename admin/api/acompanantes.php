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
     POST ?accion=ordenar                    en qué orden se ven los nombres
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
    /* ⚡ EL ORDEN LO ELIGE LUCILA, NO EL TECLADO (2026-09-14)
       Antes era ORDER BY id: el orden en que se fueron cargando. La
       familia ve esa misma lista en su invitación (invitacion.php:176),
       así que ahí no es un detalle interno.

       ⚠️ El pedazo de SQL sale de una comparación contra dos textos
       fijos escritos acá, NUNCA de lo que mandó nadie: no hay forma de
       que entre algo por esta puerta. Mismo patrón defensivo que `apodo`
       más abajo (líneas 189 y 286): la columna puede no existir todavía
       si aún no se corrió el instalador del panel, y en ese caso esto
       tiene que seguir contestando lo de siempre, no romperse. */
    $porOrden = in_array('orden', columnasDe('acompanantes'), true)
        ? 'orden, id'
        : 'id';

    $filas = consultarTodo(
        "SELECT * FROM acompanantes WHERE confirmacion_id = :c ORDER BY $porOrden",
        [':c' => $confirmacionId]
    );
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
        /* ⚡ CUÁNTA GENTE HAY DE VERDAD (2026-09-13). El panel compara los
           dos: si hay más nombres que lugares, la ficha está desfasada y
           tiene que decirlo en vez de dibujar «(5 DE 4)» como si fuera
           normal. Ver `cuadrar` acá abajo. */
        'personas' => count($filas),
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

    /* ⚡ LOS MENÚS, SOLO SI SE PIDEN (2026-09-09)
     *
     * La nota de acá arriba explica por qué esta consulta devuelve lo
     * justo, y sigue valiendo para la mudanza. Pero apareció un segundo
     * lector con otra necesidad: la descarga de invitados, que hasta hoy
     * ponía en la columna "Menús" un resumen del estilo "2 pollo, 1 res"
     * — un número por plato, sin decir de quién es cada uno. Con eso, la
     * cocina sabe cuántos platos hacer y el salón no sabe delante de
     * quién ponerlos.
     *
     * Así que los menús viajan, pero SOLO cuando alguien los pide con
     * `con_menus=1`. La mudanza sigue llamando sin el parámetro y sigue
     * recibiendo lo mismo de siempre: no se le agrega a un pedido lo que
     * ese pedido no necesita.
     */
    $conMenus = ($_GET['con_menus'] ?? '') === '1';
    $columnasExtra = $conMenus ? ', menu, alergias' : '';

    // Mismo criterio que 'listar': el orden que eligió Lucila manda, y
    // la columna puede no existir todavía.
    $porOrden = in_array('orden', columnasDe('acompanantes'), true)
        ? 'orden, id'
        : 'id';

    $filas = consultarTodo(
        "SELECT confirmacion_id, nombre, tipo$columnasExtra
           FROM acompanantes
          ORDER BY confirmacion_id, $porOrden"
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
        /* ⛔ Y SI NO SE PUDO, NO SE INSERTA (2026-09-13)
           Antes esto era `moverElCupo(...)` a secas, con el resultado
           tirado. Si la función salía por alguna de sus tres puertas
           silenciosas, la persona entraba igual y la familia quedaba con
           más gente que lugares — el «(5 DE 4)» de la ficha de Carolina.
           Ahora falla acá, antes de escribir nada, y lo dice. */
        if (!moverElCupo($confirmacionId, $tipoNuevo, +1)) {
            responderMal(
                'No se pudo reservar el lugar de más, así que no se agregó a ' .
                'nadie. Corrige el número de adultos o niños en «Editar ' .
                'invitación» y volvé a intentar.',
                409
            );
        }
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
    /* ⚡ UN NOMBRE NUEVO ENTRA AL FINAL (2026-09-14)
       La columna trae 0 de fábrica, y 0 ordena PRIMERO. Sin esto, cada
       persona que se agregara a una familia ya acomodada saltaría al
       principio de la lista — y quien la acaba de escribir la busca
       abajo, que es donde la puso.

       max(orden) de una familia sin acomodar es 0, así que el primer
       agregado se lleva el 1 y cae igual al final: el caso normal
       funciona sin que nadie haya acomodado nada nunca. */
    if (in_array('orden', columnasDe('acompanantes'), true)) {
        $ultimo = consultarUno(
            'SELECT COALESCE(MAX(orden), 0) AS tope FROM acompanantes
              WHERE confirmacion_id = :c',
            [':c' => $confirmacionId]
        );
        $fila['orden'] = (int) ($ultimo['tope'] ?? 0) + 1;
    }

    $id = insertar('acompanantes', $fila);

    anotarEnBitacora($yo, 'agregó un acompañante', 'acompanantes', $id, $nombre);
    responderBien(['id' => $id, 'mensaje' => 'Agregado.'], 201);
    break;


/* ─── CUADRAR EL CUPO ──────────────────────────────────────────────────
 *
 * ⚡ (2026-09-13) Carlos: «debemos hacer que agregar un nombre agregue un
 * puesto en las invitaciones y que esto se vea reflejado, todo debe
 * concordar».
 *
 * Lo de arriba impide que el desfase VUELVA a producirse. Esto repara los
 * que ya existen, y no hay otra forma: la ficha de Carolina Leyva ya está
 * guardada con cinco personas y cuatro lugares, y eso no se arregla solo.
 *
 * ⚠️ MANDA LA GENTE, NO EL NÚMERO. Los nombres los escribió alguien a
 * propósito, uno por uno; el número de adultos y niños es una declaración
 * vieja que quedó atrás. Así que se cuentan las filas POR TIPO y se
 * escriben esos dos números. Después de esto, «5 de 4» es imposible.
 * ------------------------------------------------------------------- */

case 'cuadrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $confirmacionId = campoEntero($datos, 'confirmacion_id', 0);
    if ($confirmacionId < 1) responderMal('Falta decir de qué confirmación.', 400);

    if (!existeTabla('confirmaciones')) responderMal('No hay confirmaciones.', 404);
    $columnas = columnasDe('confirmaciones');
    if (!in_array('adultos', $columnas, true) || !in_array('ninos', $columnas, true)) {
        responderMal('Esta base no guarda adultos y niños por separado.', 409);
    }

    $gente = consultarTodo(
        'SELECT tipo FROM acompanantes WHERE confirmacion_id = :c',
        [':c' => $confirmacionId]
    );
    if (!$gente) responderMal('Esa confirmación no tiene gente cargada.', 409);

    $ninos = 0;
    foreach ($gente as $uno) if (($uno['tipo'] ?? '') === 'nino') $ninos++;
    $adultos = count($gente) - $ninos;

    $cambios = ['adultos' => $adultos, 'ninos' => $ninos];
    if (in_array('total', $columnas, true)) $cambios['total'] = $adultos + $ninos;
    actualizar('confirmaciones', $confirmacionId, $cambios);

    /* Y lo que ve el invitado, con el mismo criterio que moverElCupo. */
    if (existeTabla('invitaciones')) {
        $inv = consultarUno(
            'SELECT id FROM invitaciones WHERE confirmacion_id = :c LIMIT 1',
            [':c' => $confirmacionId]
        );
        if ($inv && in_array('pases', columnasDe('invitaciones'), true)) {
            actualizar('invitaciones', (int) $inv['id'], ['pases' => $adultos + $ninos]);
        }
    }

    anotarEnBitacora($yo, 'cuadró los lugares', 'confirmaciones', $confirmacionId,
                     $adultos . ' adultos y ' . $ninos . ' niños');

    responderBien([
        'adultos' => $adultos,
        'ninos'   => $ninos,
        'cupo'    => $adultos + $ninos,
        'mensaje' => 'Listo: ' . ($adultos + $ninos) . ' lugares.',
    ]);
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


/* ─── ORDENAR ──────────────────────────────────────────────────────────
 *
 * ⚡ (2026-09-14) Carlos: «que lucila pueda modificar el orden de los
 * nombres en la app y esto se vea reflejado en la invitacion».
 *
 * ⚠️ LLEGA LA LISTA ENTERA, NO «SUBÍ A FULANO». Y eso es lo que hace
 * que esto sea seguro de reenviar. mandar() encola las escrituras
 * cuando no hay servidor (03-servidor.js:331-346) y las manda solas más
 * tarde: si esto fuera «subir uno», reenviarlo dos veces movería a la
 * persona dos lugares. Mandando el orden completo, reenviarlo diez
 * veces deja lo mismo que una.
 *
 * ⛔ TODO O NADA. Sin la transacción, cortarse la señal a mitad de un
 * grupo de seis dejaría tres personas con orden nuevo y tres con el
 * viejo — o sea dos personas en el mismo renglón y un hueco. Es el mismo
 * idioma de guardarPlanDeMesas() (_lib/mesas.php:714-812), incluido el
 * intentando(): sin él, insertar/ejecutar salen por responderMal(), que
 * hace exit, y la transacción queda abierta hasta que el motor la
 * deshace al morir la conexión — sin rollBack propio y sin log.
 *
 * ⚠️ NO TOCA NI UN DATO DEL INVITADO. Sólo `orden`. confirmar.php pega
 * menú y alergias por id (confirmar.php:464-467, WHERE id AND
 * confirmacion_id), nunca por posición, así que acomodar mientras
 * alguien tiene su formulario abierto no le puede mover nada de lo que
 * está contestando.
 * ------------------------------------------------------------------ */
case 'ordenar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $confirmacionId = campoEntero($datos, 'confirmacion_id', 0);
    if ($confirmacionId < 1) responderMal('Falta decir de qué familia.', 400);

    if (!in_array('orden', columnasDe('acompanantes'), true)) {
        responderMal(
            'Esta base todavía no guarda el orden de los nombres. ' .
            'Corre el instalador del panel y vuelve a intentar.', 409);
    }

    /* Los ids tal como los mandó la pantalla, limpiados: enteros, sin
       repetidos, con tope. 60 es el mismo criterio que campoListaDeDetalle
       (responder.php:463) y que el array_slice(…, 50) de confirmar.php:457. */
    $crudos = is_array($datos['ids'] ?? null) ? $datos['ids'] : [];
    $ids = [];
    foreach ($crudos as $unId) {
        $n = (int) $unId;
        if ($n > 0 && !in_array($n, $ids, true)) $ids[] = $n;
        if (count($ids) >= 60) break;
    }
    if (!$ids) responderMal('No mandaste ningún orden.', 400);

    /* ⛔ LA LISTA TIENE QUE SER ESTA FAMILIA, NI UNO MÁS NI UNO MENOS
       Dos cosas a la vez: que nadie pueda mandar el id de una persona de
       OTRA familia (mismo cuidado que el `AND confirmacion_id` de
       confirmar.php:466), y que un pedido que quedó encolado sin señal no
       resucite un orden viejo sobre una familia a la que después le
       agregaron o le quitaron gente. Si no coincide, no se escribe nada y
       la pantalla se vuelve a cargar. */
    $actuales = array_map('intval', array_column(consultarTodo(
        'SELECT id FROM acompanantes WHERE confirmacion_id = :c',
        [':c' => $confirmacionId]
    ), 'id'));

    $pedidos = $ids;
    sort($pedidos);
    sort($actuales);
    if ($pedidos !== $actuales) {
        responderMal(
            'La lista de esta familia cambió mientras la acomodabas, así ' .
            'que no se guardó nada. Fíjate cómo quedó y acomódala otra vez.',
            409);
    }

    bd()->beginTransaction();
    try {
        intentando(function () use ($ids, $confirmacionId) {
            $posicion = 0;
            foreach ($ids as $unId) {
                $posicion++;
                ejecutar(
                    'UPDATE acompanantes SET orden = :o
                      WHERE id = :id AND confirmacion_id = :c',
                    [':o' => $posicion, ':id' => $unId, ':c' => $confirmacionId]
                );
            }
        });
        bd()->commit();
    } catch (Exception $e) {
        // inTransaction() antes de deshacer: si lo que falló fue el propio
        // commit, la transacción ya no está y rollBack() tiraría una
        // segunda excepción, esta sí sin nadie que la atrape.
        if (bd()->inTransaction()) bd()->rollBack();
        error_log('[Ania XV · acompanantes] Falló el orden: ' . $e->getMessage());
        responderMal('No se pudo guardar el orden. Quedó como estaba.', 500);
    }

    anotarEnBitacora($yo, 'acomodó los nombres', 'confirmaciones',
                     $confirmacionId, count($ids) . ' personas');

    responderBien(['mensaje' => 'Orden guardado.']);
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
/**
 * Mueve el cupo declarado de una confirmación.
 *
 * ⛔ AHORA DEVUELVE SI PUDO, Y ESO NO ES COSMÉTICO (2026-09-13)
 *
 * Esta función tenía TRES salidas silenciosas —sin tabla, sin columna, sin
 * fila— y quien la llamaba no miraba el resultado. Cuando alguna se
 * disparaba, el acompañante se insertaba igual y la familia quedaba con
 * más gente que lugares: es exactamente el «(5 DE 4)» que Carlos encontró
 * en la ficha de Carolina Leyva, con la invitación diciendo 4 lugares y
 * cinco personas nombradas.
 *
 * Un lugar que no se pudo reservar tiene que ser un error que se ve, no un
 * silencio que aparece tres pantallas después.
 *
 * @return bool true solo si el cupo quedó movido de verdad.
 */
function moverElCupo($confirmacionId, $tipo, $cuanto) {
    if (!existeTabla('confirmaciones')) return false;

    $columnas = columnasDe('confirmaciones');
    $cual = $tipo === 'nino' ? 'ninos' : 'adultos';
    if (!in_array($cual, $columnas, true)) return false;

    $fila = consultarUno(
        "SELECT $cual FROM confirmaciones WHERE id = :id",
        [':id' => $confirmacionId]
    );
    if (!$fila) return false;

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
    if (!existeTabla('invitaciones')) return true;
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
