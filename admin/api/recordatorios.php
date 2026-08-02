<?php
/* ══════════════════════════════════════════════════════════════════════
   RECORDATORIOS.PHP · SUSCRIBIRSE A LOS AVISOS

   QUÉ HACE ESTE ARCHIVO
   Registra y da de baja los teléfonos que quieren recibir avisos, y le
   dice al Service Worker qué mostrar cuando lo despiertan.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=llave       la llave pública, para poder suscribirse
     POST ?accion=suscribir   registra este teléfono
     POST ?accion=darDeBaja   lo saca
     GET  ?accion=pendientes  qué hay para avisar ahora mismo
     POST ?accion=probar      manda un aviso de prueba a este teléfono

   POR QUÉ EXISTE "pendientes"
   Los avisos viajan vacíos (ver _lib/push.php). Cuando llega uno, el
   Service Worker despierta y llama acá para saber qué escribir en la
   notificación. Así se evita cifrar el contenido, que es la parte
   frágil del protocolo.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/push.php';

$accion = (string) ($_GET['accion'] ?? '');

/** Con cuántos días de anticipación se avisa. */
const DIAS_DE_AVISO = 3;


switch ($accion) {

/* ─── LA LLAVE PÚBLICA ────────────────────────────────────────────────── */

case 'llave':
    exigirSesion();
    exigirMetodo('GET');

    $publica = llavePublicaVapid();
    if (!$publica) {
        responderMal(
            'Este servidor no puede generar avisos: le falta OpenSSL con curvas elípticas.',
            501
        );
    }
    responderBien(['llave' => $publica]);
    break;


/* ─── SUSCRIBIR ───────────────────────────────────────────────────────── */

case 'suscribir':
    $yo = exigirSesion();
    exigirMetodo('POST');

    $datos    = cuerpoJson();
    $endpoint = campoTexto($datos, 'endpoint', 500);
    $p256     = campoTexto($datos, 'p256dh', 200);
    $auth     = campoTexto($datos, 'auth', 100);

    if ($endpoint === '' || !filter_var($endpoint, FILTER_VALIDATE_URL)) {
        responderMal('La suscripción no es válida.', 400);
    }

    /* Si este teléfono ya estaba suscrito se actualiza en vez de
       duplicarse. El endpoint tiene índice único, así que además la base
       lo impediría igual. */
    ejecutar(
        'INSERT INTO suscripciones_push (usuario_id, endpoint, clave_p256, clave_auth)
         VALUES (:u, :e, :p, :a)
         ON DUPLICATE KEY UPDATE usuario_id = :u2, clave_p256 = :p2, clave_auth = :a2',
        [
            ':u' => (int) $yo['id'], ':e' => $endpoint, ':p' => $p256, ':a' => $auth,
            ':u2' => (int) $yo['id'], ':p2' => $p256, ':a2' => $auth,
        ]
    );

    responderBien(['mensaje' => 'Este teléfono va a recibir los avisos.']);
    break;


/* ─── DAR DE BAJA ─────────────────────────────────────────────────────── */

case 'darDeBaja':
    exigirSesion();
    exigirMetodo('POST');

    $datos = cuerpoJson();
    ejecutar('DELETE FROM suscripciones_push WHERE endpoint = :e',
             [':e' => campoTexto($datos, 'endpoint', 500)]);

    responderBien(['mensaje' => 'Este teléfono ya no va a recibir avisos.']);
    break;


/* ─── QUÉ HAY PENDIENTE ───────────────────────────────────────────────── */

case 'pendientes':
    /* ⚠️ Este es el ÚNICO endpoint del panel que no exige sesión, y es a
       propósito: lo llama el Service Worker cuando lo despierta un aviso,
       y en ese momento no tiene el token a mano.

       Por eso NO devuelve datos privados: ni montos, ni nombres de
       invitados, ni el buzón. Solo cuántas cosas vencen y un texto
       genérico. Quien abra esta dirección a mano no se entera de nada
       que no pudiera adivinar. */
    exigirMetodo('GET');

    $avisos = [];

    if (existeTabla('pagos')) {
        $fila = consultarUno(
            "SELECT COUNT(*) AS n FROM pagos
             WHERE estado = 'pendiente' AND fecha_limite IS NOT NULL
               AND fecha_limite <= DATE_ADD(CURDATE(), INTERVAL :d DAY)",
            [':d' => DIAS_DE_AVISO]
        );
        $cuantos = (int) ($fila['n'] ?? 0);
        if ($cuantos > 0) {
            $avisos[] = $cuantos === 1
                ? 'Tenés un pago por vencer'
                : 'Tenés ' . $cuantos . ' pagos por vencer';
        }
    }

    if (existeTabla('tareas')) {
        $fila = consultarUno(
            "SELECT COUNT(*) AS n FROM tareas
             WHERE estado <> 'hecha' AND fecha_limite IS NOT NULL
               AND fecha_limite < CURDATE()"
        );
        $cuantos = (int) ($fila['n'] ?? 0);
        if ($cuantos > 0) {
            $avisos[] = $cuantos === 1
                ? 'Hay una tarea atrasada'
                : 'Hay ' . $cuantos . ' tareas atrasadas';
        }
    }

    if (existeTabla('agenda')) {
        $fila = consultarUno(
            'SELECT COUNT(*) AS n FROM agenda
             WHERE fecha >= CURDATE()
               AND fecha <= DATE_ADD(CURDATE(), INTERVAL :d DAY)',
            [':d' => DIAS_DE_AVISO]
        );
        $cuantos = (int) ($fila['n'] ?? 0);
        if ($cuantos > 0) {
            $avisos[] = $cuantos === 1
                ? 'Se acerca una fecha de la agenda'
                : 'Se acercan ' . $cuantos . ' fechas';
        }
    }

    responderBien([
        'titulo' => 'Ania XV',
        'cuerpo' => $avisos
            ? implode('. ', $avisos) . '.'
            : 'Todo en orden por ahora.',
        'hay'    => count($avisos),
    ]);
    break;


/* ─── PROBAR ──────────────────────────────────────────────────────────── */

case 'probar':
    $yo = exigirSesion();
    exigirMetodo('POST');

    $mias = consultarTodo(
        'SELECT * FROM suscripciones_push WHERE usuario_id = :u',
        [':u' => (int) $yo['id']]
    );

    if (!$mias) responderMal('Todavía no activaste los avisos en este teléfono.', 400);

    $enviados = 0;
    $ultimoError = '';

    foreach ($mias as $suscripcion) {
        $resultado = mandarAviso($suscripcion);
        if ($resultado['ok']) $enviados++;
        else $ultimoError = $resultado['error'];
    }

    if ($enviados === 0) {
        responderMal('No se pudo mandar el aviso: ' . $ultimoError, 502);
    }

    responderBien(['mensaje' => 'Aviso enviado. Debería llegarte en unos segundos.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
