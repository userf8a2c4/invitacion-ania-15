<?php
/* ══════════════════════════════════════════════════════════════════════
   DIRECCIONES.PHP · DÓNDE SE ENTREGAN LAS COMPRAS

   QUÉ HACE ESTE ARCHIVO
   Guarda las direcciones a las que puede llegar algo que Lucila compre
   con ayuda del equipo: la casa, el salón, la casa de su mamá. En cada
   compra se elige una.

   POR QUÉ VARIAS Y NO UNA
   Porque no todo va al mismo lado. Las cosas del salón conviene que
   lleguen al salón, y lo que hay que tener antes, a la casa. Con una
   sola dirección, alguien tiene que acordarse de avisar cada vez — y
   avisar cada vez es exactamente lo que se olvida.

   SON DEL EVENTO, NO DE CADA CUENTA
   Hay una sola fiesta y una sola lista de direcciones. Quien administra
   las ve y las edita todas. No tiene sentido que la dirección del salón
   sea "de" alguien.

   QUITAR ES DESACTIVAR, NUNCA BORRAR
   Una compra vieja tiene que poder seguir diciendo a dónde se entregó.
   Si se borrara la fila, ese pedido quedaría apuntando a la nada. Por
   eso `activa`: desaparece de la lista para elegir, y sigue existiendo
   para el historial.

   SOLO ADMINISTRADOR
   Mismo criterio que presupuesto.php: el rol 'entrada' —el de la puerta
   la noche del evento— no tiene nada que hacer acá.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar                     las direcciones cargadas
     POST ?accion=guardar                    crea una o corrige la que se le diga
     POST ?accion=predeterminada  {id}       cuál se propone primero
     POST ?accion=desactivar      {id}       la saca de la lista, sin borrarla
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('direcciones_entrega')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    /* Las activas primero y la predeterminada arriba de todo: quien abre
       esto casi siempre viene a elegir, no a administrar. */
    responderBien(['filas' => consultarTodo(
        'SELECT * FROM direcciones_entrega
          ORDER BY activa DESC, es_predeterminada DESC, alias ASC'
    )]);
    break;


/* ─── GUARDAR (crear o corregir) ──────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);

    /* Lo mínimo para que un paquete llegue: cómo llamarla y a dónde va.
       El resto ayuda pero no impide guardar — una dirección a medias es
       más útil que ninguna, y se completa después. */
    $alias = campoTexto($datos, 'alias', 60);
    $calle = campoTexto($datos, 'calle', 200);

    if ($alias === '') responderMal('Ponle un nombre para reconocerla. Por ejemplo: Casa.', 400);
    if ($calle === '') responderMal('Falta la calle y el número.', 400);

    $valores = [
        'alias'             => $alias,
        'calle'             => $calle,
        'colonia'           => campoTexto($datos, 'colonia', 120),
        'ciudad'            => campoTexto($datos, 'ciudad', 120),
        'estado'            => campoTexto($datos, 'estado', 120),
        'cp'                => campoTexto($datos, 'cp', 10),
        'referencias'       => campoTexto($datos, 'referencias', 500),
        'telefono_contacto' => campoTexto($datos, 'telefono_contacto', 40),
    ];

    /* ─── EL PUNTO EN EL MAPA ─────────────────────────────────────────
       Va junto a la dirección escrita, no en vez de ella. Las dos cosas
       sirven para algo distinto: la escrita la lee una persona, el punto
       es el que abre bien en un mapa.

       Se guarda NULL —no un cero— cuando no hay punto: 0,0 es un lugar
       real en el Atlántico, y un repartidor mandado ahí no vuelve. */
    $lat = isset($datos['lat']) && $datos['lat'] !== '' && $datos['lat'] !== null
        ? (float) $datos['lat'] : null;
    $lng = isset($datos['lng']) && $datos['lng'] !== '' && $datos['lng'] !== null
        ? (float) $datos['lng'] : null;

    // O están los dos o no está ninguno: media coordenada no ubica nada.
    if ($lat === null || $lng === null) {
        $lat = null;
        $lng = null;
    } elseif ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        responderMal('Ese punto del mapa no es válido. Vuelve a marcarlo.', 400);
    }

    $valores['lat'] = $lat;
    $valores['lng'] = $lng;

    if ($id > 0) {
        if (!consultarUno('SELECT id FROM direcciones_entrega WHERE id = :i', [':i' => $id])) {
            responderMal('Esa dirección ya no existe.', 404);
        }
        actualizar('direcciones_entrega', $id, $valores);
    } else {
        /* La primera que se carga queda predeterminada sola: si es la
           única, elegirla a mano después sería pedir un trámite por algo
           que no tiene alternativa. */
        $hayAlguna = consultarUno('SELECT id FROM direcciones_entrega WHERE activa = 1 LIMIT 1');
        $valores['es_predeterminada'] = $hayAlguna ? 0 : 1;

        $id = insertar('direcciones_entrega', $valores);
    }

    anotarEnBitacora($yo, 'guardó una dirección de entrega', 'direcciones_entrega', $id, $alias);
    responderBien(['id' => $id]);
    break;


/* ─── CUÁL SE PROPONE PRIMERO ─────────────────────────────────────────── */

case 'predeterminada':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    $fila = $id > 0
        ? consultarUno('SELECT * FROM direcciones_entrega WHERE id = :i', [':i' => $id])
        : null;

    if (!$fila) responderMal('Esa dirección ya no existe.', 404);
    if ((int) $fila['activa'] !== 1) {
        responderMal('Esa dirección está quitada. Vuelve a activarla antes de dejarla como la de siempre.', 400);
    }

    /* ⚡ UNA SOLA SENTENCIA, NO DOS.
       Lo natural sería limpiar la marca de todas y después ponérsela a
       una. Pero si la segunda fallara, la fiesta quedaría SIN ninguna
       dirección predeterminada — peor que haber dejado la anterior.
       Con `es_predeterminada = (id = :i)` MySQL pone 1 en la que
       coincide y 0 en el resto de una sola pasada: no hay un instante
       intermedio en el que no haya ninguna, y no hace falta abrir una
       transacción para algo que el motor ya resuelve atómico. */
    ejecutar('UPDATE direcciones_entrega SET es_predeterminada = (id = :i)', [':i' => $id]);

    anotarEnBitacora($yo, 'cambió la dirección de siempre', 'direcciones_entrega', $id,
                     (string) ($fila['alias'] ?? ''));
    responderBien(['id' => $id]);
    break;


/* ─── QUITAR DE LA LISTA (sin borrar) ─────────────────────────────────── */

case 'desactivar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    $fila = $id > 0
        ? consultarUno('SELECT * FROM direcciones_entrega WHERE id = :i', [':i' => $id])
        : null;

    if (!$fila) responderMal('Esa dirección ya no existe.', 404);

    actualizar('direcciones_entrega', $id, ['activa' => 0, 'es_predeterminada' => 0]);

    /* Si la que se quitó era la de siempre, otra ocupa su lugar sola. Sin
       esto, la próxima compra no tendría ninguna propuesta y habría que
       elegir a mano sin motivo. */
    $quedoAlguna = consultarUno(
        'SELECT id FROM direcciones_entrega WHERE activa = 1 AND es_predeterminada = 1 LIMIT 1');

    if (!$quedoAlguna) {
        $reemplazo = consultarUno(
            'SELECT id FROM direcciones_entrega WHERE activa = 1 ORDER BY alias ASC LIMIT 1');
        if ($reemplazo) {
            actualizar('direcciones_entrega', (int) $reemplazo['id'], ['es_predeterminada' => 1]);
        }
    }

    anotarEnBitacora($yo, 'quitó una dirección de entrega', 'direcciones_entrega', $id,
                     (string) ($fila['alias'] ?? ''));
    responderBien(['id' => $id]);
    break;


/* ─── VOLVER A ACTIVARLA ──────────────────────────────────────────────── */

case 'activar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id = campoEntero($datos, 'id', 0);
    if ($id <= 0 || !consultarUno('SELECT id FROM direcciones_entrega WHERE id = :i', [':i' => $id])) {
        responderMal('Esa dirección ya no existe.', 404);
    }

    actualizar('direcciones_entrega', $id, ['activa' => 1]);
    anotarEnBitacora($yo, 'volvió a activar una dirección', 'direcciones_entrega', $id, '');
    responderBien(['id' => $id]);
    break;


default:
    responderMal('No sé hacer eso.', 400);
}
