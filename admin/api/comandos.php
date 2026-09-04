<?php
/* ══════════════════════════════════════════════════════════════════════
   COMANDOS.PHP · LO QUE CADA PERSONA LE ENSEÑÓ AL ASISTENTE

   QUÉ HACE ESTE ARCHIVO
   Guarda y devuelve las frases que cada cuenta le enseñó al asistente
   determinista (codigo/32-asistente.js). Nunca frases de otra cuenta:
   todo se filtra por quien tiene la sesión, siempre.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar    las frases de MI cuenta
     POST ?accion=agregar   {intencion, frase}
     POST ?accion=borrar    {id}
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('comandos_usuario')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}


switch ($accion) {

case 'listar':
    exigirMetodo('GET');
    responderBien(consultarTodo(
        'SELECT id, intencion, frase FROM comandos_usuario WHERE usuario_id = :u ORDER BY id',
        [':u' => (int) $yo['id']]
    ));
    break;

case 'agregar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $intencion = campoTexto($datos, 'intencion', 40);
    $frase     = mb_strtolower(campoTexto($datos, 'frase', 200));

    if ($intencion === '' || $frase === '') {
        responderMal('Falta la intención o la frase.', 400);
    }

    // Si ya la había enseñado, no es un error: ya se sabe.
    $existente = consultarUno(
        'SELECT id FROM comandos_usuario WHERE usuario_id = :u AND frase = :f',
        [':u' => (int) $yo['id'], ':f' => $frase]
    );
    if ($existente) responderBien(['id' => (int) $existente['id']]);

    $id = insertar('comandos_usuario', [
        'usuario_id' => (int) $yo['id'],
        'intencion'  => $intencion,
        'frase'      => $frase,
    ]);

    responderBien(['id' => $id], 201);
    break;

case 'borrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    // Solo se borra si es de MI cuenta: nadie puede borrarle lo
    // enseñado a otra persona pasando un id ajeno.
    $fila = consultarUno(
        'SELECT id FROM comandos_usuario WHERE id = :id AND usuario_id = :u',
        [':id' => $id, ':u' => (int) $yo['id']]
    );
    if (!$fila) responderMal('Esa frase no existe.', 404);

    borrar('comandos_usuario', $id);
    responderBien(['mensaje' => 'Olvidada.']);
    break;

default:
    responderMal('Acción desconocida.', 404);
}
