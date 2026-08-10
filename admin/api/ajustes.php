<?php
/* ══════════════════════════════════════════════════════════════════════
   AJUSTES.PHP · CONFIGURACIÓN DEL EVENTO, NO DE CADA PERSONA

   QUÉ HACE ESTE ARCHIVO
   Lee y escribe la tabla `ajustes`, que ya existía (mesas.php la usa
   para 'auto_al_confirmar'). Es clave/valor: sirve para cualquier cosa
   que sea "del evento" y no de cada cuenta — como la paleta de colores
   del Bloque 2b, que si Lucila la cambia, Carlos la tiene que ver igual.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=obtener&clave=paleta   el valor guardado, o null
     POST ?accion=guardar                {clave, valor}, solo admin
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'obtener');

if (!existeTabla('ajustes')) {
    responderMal('Falta correr la migración: no existe la tabla ajustes.', 500);
}


switch ($accion) {

/* ─── OBTENER ─────────────────────────────────────────────────────────── */

case 'obtener':
    exigirMetodo('GET');

    // Cualquier cuenta con sesión puede LEER los ajustes del evento: la
    // paleta de colores, por ejemplo, tiene que llegarle también a
    // 'entrada'. Lo que sí es solo de admin es cambiarlos.
    $clave = campoTexto($_GET, 'clave', 60);
    if ($clave === '') responderMal('Falta decir qué ajuste.', 400);

    $fila = consultarUno('SELECT valor FROM ajustes WHERE clave = :c', [':c' => $clave]);
    responderBien(['clave' => $clave, 'valor' => $fila ? $fila['valor'] : null]);
    break;


/* ─── GUARDAR ─────────────────────────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');
    exigirAdministrador();

    $datos = cuerpoJson();
    $clave = campoTexto($datos, 'clave', 60);
    $valor = campoTexto($datos, 'valor', 5000);

    if ($clave === '') responderMal('Falta decir qué ajuste.', 400);

    $existe = consultarUno('SELECT clave FROM ajustes WHERE clave = :c', [':c' => $clave]);
    if ($existe) {
        ejecutar('UPDATE ajustes SET valor = :v WHERE clave = :c',
                 [':v' => $valor, ':c' => $clave]);
    } else {
        ejecutar('INSERT INTO ajustes (clave, valor) VALUES (:c, :v)',
                 [':c' => $clave, ':v' => $valor]);
    }

    anotarEnBitacora($yo, 'cambió un ajuste', 'ajustes', 0, $clave);
    responderBien(['mensaje' => 'Guardado.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
