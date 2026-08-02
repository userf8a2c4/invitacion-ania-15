<?php
/* ══════════════════════════════════════════════════════════════════════
   BITACORA.PHP · EL HISTORIAL DE CAMBIOS

   QUÉ HACE ESTE ARCHIVO
   Devuelve quién cambió qué y cuándo. Es la razón por la que el panel
   tiene cuentas separadas en vez de una contraseña compartida: cuando
   algo aparece cambiado y nadie se acuerda, acá está la respuesta.

   Solo lee. Nada de este archivo modifica ni borra la bitácora — si se
   pudiera editar, dejaría de servir para lo único que sirve.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

exigirAdministrador();
exigirMetodo('GET');

$accion = (string) ($_GET['accion'] ?? 'listar');
if ($accion !== 'listar') responderMal('Acción desconocida.', 404);

/* Se traen los últimos 200 movimientos. Sin el límite, después de meses
   de uso la respuesta pesaría megas para mostrar una lista que nadie
   desplaza más allá de la primera pantalla. */
responderBien(consultarTodo(
    'SELECT id, usuario_nombre, accion, tabla_afectada, fila_id, detalle, cuando
     FROM bitacora
     ORDER BY cuando DESC
     LIMIT 200'
));
