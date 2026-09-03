<?php
/* ══════════════════════════════════════════════════════════════════════
   ETIQUETAS_ACOMODO.PHP · PALABRAS LIBRES PARA PERSONAS Y MESAS (ENTREGA 2)

   ⚠️ NO CONFUNDIR CON admin/api/etiquetas.php — ese archivo es una cosa
   totalmente distinta (deja renombrar los textos de las pestañas del
   panel, "Gente" → "Invitados"). Este es nuevo, para el acomodo: pegar
   palabras libres a una persona o a una mesa para que el bot las cruce.

   QUÉ HACE ESTE ARCHIVO
   Deja inventar etiquetas sobre la marcha ("Familia paterna", "Jóvenes",
   "Compañeros de baile", "Mesa ruidosa") y pegarlas a un ACOMPAÑANTE o a
   una MESA. No son una relación fija como "familia materna/paterna" —
   eso ya lo resuelve `grupos_invitados` — sino texto libre y múltiple,
   pensado para que el bot de mesas (_lib/mesas.php, mejorMesaPara())
   prefiera sentar a alguien en una mesa con la que comparte etiquetas.

   POR QUÉ 'atado_a_tipo' + 'atado_a_id' Y NO DOS TABLAS SEPARADAS
   Mismo patrón que notas/archivos/alarmas: una sola tabla de etiquetas,
   una sola tabla de asignaciones, sin importar si cuelgan de una persona
   o de una mesa. Menos código para mantener, y "poner la misma etiqueta
   a una persona y a una mesa" sale gratis.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar                          todas las etiquetas que existen
     GET  ?accion=por_objeto&tipo=X&id=N           las de un acompañante o mesa puntual
     POST ?accion=crear      {nombre}              crea una (o devuelve la que ya existía)
     POST ?accion=asignar    {nombre|etiqueta_id, tipo, id}   la pega a algo
     POST ?accion=quitar     {etiqueta_id, tipo, id}          la despega de algo
     POST ?accion=borrar     {id}                  la borra del todo (y sus asignaciones)
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');

if (!existeTabla('etiquetas') || !existeTabla('etiquetas_asignadas')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
}

/**
 * Qué permiso hace falta para tocar una atadura, según de qué lado es.
 * 'mesa' cae bajo el permiso de Mesas; cualquier otra cosa (hoy solo
 * 'acompanante') cae bajo el de Invitados — mismo criterio que usan
 * mesas.php y acompanantes.php por separado.
 *
 * @param string $tipo
 * @return void
 */
function exigirPermisoDeEtiqueta($yo, $tipo) {
    $seccion = $tipo === 'mesa' ? 'mesas' : 'invitados';
    exigirPermiso($yo, $seccion, 'editar');
}

/* ⚡ (2026-08-30) 'confirmacion' se suma a los tipos válidos: antes solo
   se podía taguear a una PERSONA nombrada o a una mesa. La mayoría de
   los paquetes de la lista real no tienen a nadie nombrado todavía
   (ver el prompt "cupo sustractivo + etiquetas"), así que sin esto
   nunca podían tener afinidad con ninguna mesa. Ver etiquetasDeUnidad()
   en _lib/mesas.php, que ya sabía leer etiquetas heredadas de los
   acompañantes de una confirmación — ahora también lee las puestas
   directo al paquete. */
const TIPOS_DE_ETIQUETA_VALIDOS = ['acompanante', 'mesa', 'confirmacion'];


switch ($accion) {

/* ─── LISTAR TODAS ────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');
    // Solo hace falta haber iniciado sesión: es la lista para poblar el
    // selector de "elegí o creá una etiqueta", no expone nada sensible.
    $filas = consultarTodo(
        'SELECT e.id, e.nombre, COUNT(a.id) AS usos
         FROM etiquetas e
         LEFT JOIN etiquetas_asignadas a ON a.etiqueta_id = e.id
         GROUP BY e.id, e.nombre
         ORDER BY e.nombre ASC'
    );
    responderBien(['filas' => $filas]);
    break;


/* ─── LAS DE UN OBJETO PUNTUAL ────────────────────────────────────────── */

case 'por_objeto':
    exigirMetodo('GET');

    $tipo = (string) ($_GET['tipo'] ?? '');
    $id   = (int) ($_GET['id'] ?? 0);
    if (!in_array($tipo, TIPOS_DE_ETIQUETA_VALIDOS, true) || $id < 1) {
        responderMal('Falta decir de qué persona o mesa.', 400);
    }

    $filas = consultarTodo(
        'SELECT e.id, e.nombre
         FROM etiquetas_asignadas a
         JOIN etiquetas e ON e.id = a.etiqueta_id
         WHERE a.atado_a_tipo = :t AND a.atado_a_id = :i
         ORDER BY e.nombre ASC',
        [':t' => $tipo, ':i' => $id]
    );
    responderBien(['filas' => $filas]);
    break;


/* ─── CREAR ───────────────────────────────────────────────────────────── */

case 'crear':
    exigirMetodo('POST');
    $datos  = cuerpoJson();
    $nombre = trim(mb_substr((string) ($datos['nombre'] ?? ''), 0, 60));
    if ($nombre === '') responderMal('Escribe un nombre para la etiqueta.', 400);

    // Idempotente a propósito: crear "Jóvenes" dos veces no debe dar
    // error ni duplicar la fila, solo devolver la que ya existía — así
    // el selector del formulario puede llamar a esto sin preocuparse de
    // si la etiqueta ya estaba.
    $existente = consultarUno('SELECT id FROM etiquetas WHERE nombre = :n', [':n' => $nombre]);
    $id = $existente ? (int) $existente['id'] : insertar('etiquetas', ['nombre' => $nombre]);

    responderBien(['id' => $id, 'nombre' => $nombre]);
    break;


/* ─── ASIGNAR ─────────────────────────────────────────────────────────── */

case 'asignar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $tipo = (string) ($datos['tipo'] ?? '');
    $id   = campoEntero($datos, 'id', 0);
    if (!in_array($tipo, TIPOS_DE_ETIQUETA_VALIDOS, true) || $id < 1) {
        responderMal('Falta decir a qué persona o mesa.', 400);
    }
    exigirPermisoDeEtiqueta($yo, $tipo);

    // Se acepta 'etiqueta_id' (ya existe) o 'nombre' (se crea si hace
    // falta) — el formulario manda una u otra según si el usuario eligió
    // de la lista o escribió una nueva.
    $etiquetaId = campoEntero($datos, 'etiqueta_id', 0);
    if ($etiquetaId < 1) {
        $nombre = trim(mb_substr((string) ($datos['nombre'] ?? ''), 0, 60));
        if ($nombre === '') responderMal('Falta decir qué etiqueta.', 400);
        $existente = consultarUno('SELECT id FROM etiquetas WHERE nombre = :n', [':n' => $nombre]);
        $etiquetaId = $existente ? (int) $existente['id'] : insertar('etiquetas', ['nombre' => $nombre]);
    }

    $yaExiste = consultarUno(
        'SELECT id FROM etiquetas_asignadas WHERE etiqueta_id = :e AND atado_a_tipo = :t AND atado_a_id = :i',
        [':e' => $etiquetaId, ':t' => $tipo, ':i' => $id]
    );
    if (!$yaExiste) {
        insertar('etiquetas_asignadas', [
            'etiqueta_id'  => $etiquetaId,
            'atado_a_tipo' => $tipo,
            'atado_a_id'   => $id,
        ]);
    }

    responderBien(['etiqueta_id' => $etiquetaId, 'mensaje' => 'Etiqueta puesta.']);
    break;


/* ─── QUITAR (de un objeto, la etiqueta sigue existiendo) ────────────── */

case 'quitar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $tipo       = (string) ($datos['tipo'] ?? '');
    $id         = campoEntero($datos, 'id', 0);
    $etiquetaId = campoEntero($datos, 'etiqueta_id', 0);
    if (!in_array($tipo, TIPOS_DE_ETIQUETA_VALIDOS, true) || $id < 1 || $etiquetaId < 1) {
        responderMal('Falta decir qué etiqueta sacar de dónde.', 400);
    }
    exigirPermisoDeEtiqueta($yo, $tipo);

    ejecutar(
        'DELETE FROM etiquetas_asignadas WHERE etiqueta_id = :e AND atado_a_tipo = :t AND atado_a_id = :i',
        [':e' => $etiquetaId, ':t' => $tipo, ':i' => $id]
    );
    responderBien(['mensaje' => 'Etiqueta quitada.']);
    break;


/* ─── BORRAR LA ETIQUETA ENTERA ───────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    exigirAdministrador();
    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 0);
    if ($id < 1) responderMal('Falta decir qué etiqueta.', 400);

    $fila = consultarUno('SELECT nombre FROM etiquetas WHERE id = :i', [':i' => $id]);
    if (!$fila) responderMal('Esa etiqueta no existe.', 404);

    // etiquetas_asignadas tiene ON DELETE CASCADE sobre etiqueta_id
    // (ver migracion.sql) — borrar la etiqueta se lleva sus asignaciones solo.
    borrar('etiquetas', $id);
    anotarEnBitacora($yo, 'borró una etiqueta', 'etiquetas', $id, (string) $fila['nombre']);
    responderBien(['mensaje' => 'Etiqueta eliminada.']);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
