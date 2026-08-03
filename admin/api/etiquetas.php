<?php
/* ══════════════════════════════════════════════════════════════════════
   ETIQUETAS.PHP · CAMBIARLE EL NOMBRE A LAS COSAS

   QUÉ HACE ESTE ARCHIVO
   Guarda los nombres que la organizadora prefiere para las secciones y
   los estados del panel. "Padrinos" puede pasar a ser "Padrinos y
   madrinas"; "Gente", a "Invitados"; "Corte" a "Chambelanes".

   POR QUÉ NO SE TRADUCE TODO EL PANEL
   Porque no hace falta y complicaría cada pantalla. Se pueden renombrar
   las etiquetas que se LEEN seguido —las pestañas, las sub-secciones y
   los estados—, que es donde el vocabulario de cada familia se nota. Los
   textos de ayuda y los mensajes de error quedan como están: nadie los
   lee dos veces.

   DÓNDE SE GUARDA
   En la tabla `ajustes`, bajo la clave 'etiquetas', como un solo JSON.
   Son treinta valores cortos que se leen todos juntos al abrir la app:
   una tabla con treinta filas para eso sería más trabajo sin ninguna
   ventaja.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=leer      las etiquetas cambiadas
     POST ?accion=guardar   cambia una o varias
     POST ?accion=restaurar vuelve todo a los nombres de fábrica
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$accion = (string) ($_GET['accion'] ?? 'leer');

/** Cuánto puede medir una etiqueta. Más largo no entra en una pestaña. */
const LARGO_MAXIMO_ETIQUETA = 40;


switch ($accion) {

/* ─── LEER ────────────────────────────────────────────────────────────── */

case 'leer':
    /* Este endpoint lo llama la app al arrancar, antes de dibujar nada.
       Exige sesión igual que el resto: los nombres de las secciones no
       son secretos, pero tampoco hay razón para publicarlos. */
    exigirSesion();
    exigirMetodo('GET');

    if (!existeTabla('ajustes')) responderBien(new stdClass());

    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'etiquetas'");

    if (!$fila || !$fila['valor']) responderBien(new stdClass());

    $etiquetas = json_decode($fila['valor'], true);

    // Si el JSON se corrompió, se devuelve vacío en vez de romper la
    // app: sin etiquetas propias se usan las de fábrica y todo sigue.
    responderBien(is_array($etiquetas) ? $etiquetas : new stdClass());
    break;


/* ─── GUARDAR ─────────────────────────────────────────────────────────── */

case 'guardar':
    $yo = exigirAdministrador();
    exigirMetodo('POST');

    $datos = cuerpoJson();
    $nuevas = $datos['etiquetas'] ?? null;

    if (!is_array($nuevas)) responderMal('No mandaste etiquetas.', 400);

    // Lo que había, para no pisar lo que no se está cambiando.
    $actuales = [];
    if (existeTabla('ajustes')) {
        $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'etiquetas'");
        if ($fila && $fila['valor']) {
            $decodificadas = json_decode($fila['valor'], true);
            if (is_array($decodificadas)) $actuales = $decodificadas;
        }
    }

    $cambiadas = 0;

    foreach ($nuevas as $clave => $valor) {
        /* La clave la pone el código del panel, no la persona, pero
           igual se filtra: es lo que va a terminar dentro de un JSON que
           después se lee sin más comprobaciones. */
        $clave = preg_replace('/[^a-zA-Z0-9_.]/', '', (string) $clave);
        if ($clave === '') continue;

        $valor = trim((string) $valor);
        $valor = mb_substr($valor, 0, LARGO_MAXIMO_ETIQUETA);

        /* Vacío significa "volver al nombre de fábrica": se borra la
           entrada en vez de guardar una cadena vacía, que dejaría la
           pestaña sin texto. */
        if ($valor === '') {
            if (isset($actuales[$clave])) { unset($actuales[$clave]); $cambiadas++; }
            continue;
        }

        if (($actuales[$clave] ?? null) !== $valor) {
            $actuales[$clave] = $valor;
            $cambiadas++;
        }
    }

    ejecutar(
        "INSERT INTO ajustes (clave, valor) VALUES ('etiquetas', :v)
         ON DUPLICATE KEY UPDATE valor = :v2",
        [
            ':v'  => json_encode($actuales, JSON_UNESCAPED_UNICODE),
            ':v2' => json_encode($actuales, JSON_UNESCAPED_UNICODE),
        ]
    );

    if ($cambiadas) {
        anotarEnBitacora($yo, 'cambió etiquetas del panel', 'ajustes', 0,
                         $cambiadas . ' cambiadas');
    }

    responderBien([
        'etiquetas' => $actuales ?: new stdClass(),
        'cambiadas' => $cambiadas,
        'mensaje'   => $cambiadas
            ? 'Guardado. Los nombres nuevos ya están.'
            : 'No había nada que cambiar.',
    ]);
    break;


/* ─── RESTAURAR ───────────────────────────────────────────────────────── */

case 'restaurar':
    $yo = exigirAdministrador();
    exigirMetodo('POST');

    ejecutar("DELETE FROM ajustes WHERE clave = 'etiquetas'");
    anotarEnBitacora($yo, 'restauró las etiquetas de fábrica', 'ajustes');

    responderBien(['mensaje' => 'Volvieron los nombres originales.']);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
