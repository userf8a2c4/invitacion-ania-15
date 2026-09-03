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

   LAS EXCEPCIONES: 'fab_<id>', 'carino_<id>' Y 'avisos_agentes_<id>'
   El sandwich de herramientas rápidas del botón flotante (Fase 1 del
   rediseño, ver codigo/29-fab.js), el diccionario cariñoso del Agente
   Motivador (ver codigo/46-agente-motivador.js) y a qué avisos push
   proactivos de los agentes se suscribió cada quien (Paso 5, ver
   codigo/15-instalar-y-avisos.js y api/cron_alarmas.php) son de CADA
   PERSONA, no del evento: lo que Carlos elige o autoriza no tiene por
   qué ser lo que Lucila elige o autoriza. Por eso una cuenta sin rol
   admin puede guardar esas tres claves puntuales, pero solo las que
   llevan su propio id — nunca la de otra cuenta ni cualquier otra
   clave del evento. */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'obtener');

/**
 * Los ajustes que `obtener` NUNCA devuelve, a nadie.
 *
 * Son secretos, no configuración: con la clave de servicio se escribe
 * en el hilo de MegaBot de cualquiera, y con la del webhook se habla
 * con el Orquestador haciéndose pasar por el panel. Se generan, se
 * copian una vez y se guardan afuera — ninguna pantalla las necesita
 * de vuelta, así que no hay nada que perder cerrándolas.
 */
const CLAVES_QUE_NUNCA_SE_DEVUELVEN = [
    'megabot_servicio_clave',
    'megabot_webhook_clave',
];

if (!existeTabla('ajustes')) {
    responderMal('Falta una parte de la instalación del panel. Avísale a quien lo instaló.', 500);
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

    /* ⚡ HAY AJUSTES QUE NO SON "DEL EVENTO", SON SECRETOS (2026-09-03).
       Esta acción devolvía CUALQUIER clave a cualquier cuenta con
       sesión — incluida `megabot_servicio_clave`, que es la que
       autoriza a escribir en el hilo de MegaBot. Una cuenta de entrada,
       la que trabaja en la puerta el día del evento, podía pedirla con
       una sola llamada y con ella inyectar propuestas en el chat de
       cualquiera. Lo mismo con la clave y la URL del webhook saliente.

       No alcanza con que la app no las pida: la API es la que tiene que
       negarse. Nunca se devuelven; ni siquiera a la administradora,
       porque no hay ninguna pantalla que las necesite de vuelta —se
       generan, se copian una vez y se guardan. */
    if (in_array($clave, CLAVES_QUE_NUNCA_SE_DEVUELVEN, true)) {
        responderMal('Ese ajuste no se puede leer.', 403);
    }

    $fila = consultarUno('SELECT valor FROM ajustes WHERE clave = :c', [':c' => $clave]);
    responderBien(['clave' => $clave, 'valor' => $fila ? $fila['valor'] : null]);
    break;


/* ─── GUARDAR ─────────────────────────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');

    $datos = cuerpoJson();
    $clave = campoTexto($datos, 'clave', 60);
    $valor = campoTexto($datos, 'valor', 5000);

    if ($clave === '') responderMal('Falta decir qué ajuste.', 400);

    // Las únicas tres claves que una cuenta sin rol admin puede tocar son
    // las suyas propias (FAB, diccionario cariñoso y a qué avisos push
    // proactivos se suscribió). Cualquier otra sigue siendo del evento,
    // y del evento decide quien administra.
    $suPropioId = (int) ($yo['id'] ?? 0);
    $esSuyaPropia = $clave === 'fab_' . $suPropioId
                 || $clave === 'carino_' . $suPropioId
                 || $clave === 'avisos_agentes_' . $suPropioId;
    if (!$esSuyaPropia) exigirAdministrador();

    /* ⚡ EL https:// SE EXIGE ACÁ, NO SOLO EN EL FORMULARIO (2026-09-03).
       La pantalla de MegaBot ya validaba que la URL del webhook
       empezara con https://, pero eso es una comodidad del formulario,
       no una defensa: cualquiera con sesión de admin puede llamar a
       este endpoint directo. Con una URL http:// —o peor, con un
       esquema raro— el panel le manda el hilo entero de Lucila a donde
       sea, en claro. */
    if ($clave === 'megabot_webhook_url' && $valor !== '') {
        if (stripos($valor, 'https://') !== 0) {
            responderMal('La dirección del webhook tiene que empezar con https://', 400);
        }
        if (!filter_var($valor, FILTER_VALIDATE_URL)) {
            responderMal('Esa no es una dirección válida.', 400);
        }
    }

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
