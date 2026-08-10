<?php
/* ══════════════════════════════════════════════════════════════════════
   ALARMAS.PHP · RECORDATORIOS CON FECHA Y HORA

   QUÉ HACE ESTE ARCHIVO
   Guarda alarmas para un momento exacto: "el jueves a las 15:30 llamar
   al salón", y que suene el jueves a las 15:30.

   EN QUÉ SE DIFERENCIA DEL RECORDATORIO DIARIO
   El cron de las 8 de la mañana manda un resumen de lo que vence en los
   próximos días. Esto es puntual: una hora concreta, un aviso concreto.
   Lo dispara cron_alarmas.php, que corre cada diez minutos.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar        las alarmas, próximas primero
     POST ?accion=guardar
     POST ?accion=borrar
     POST ?accion=posponer      la corre 10 minutos, 1 hora o 1 día
     POST ?accion=apagar        la desactiva sin borrarla
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
exigirPermiso($yo, 'avisos', ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? 'ver' : 'editar');
$accion = (string) ($_GET['accion'] ?? 'listar');


switch ($accion) {

/* ─── LISTAR ──────────────────────────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    /* Las que todavía no sonaron van primero y en orden; las pasadas y
       las apagadas, después. Es el orden en que uno las mira: lo que
       viene importa, lo que ya fue es historial. */
    $alarmas = consultarTodo(
        'SELECT * FROM alarmas
         ORDER BY (activa = 1 AND cuando >= NOW()) DESC,
                  CASE WHEN activa = 1 AND cuando >= NOW() THEN cuando END ASC,
                  cuando DESC
         LIMIT 100'
    );

    $proximas = consultarUno(
        'SELECT COUNT(*) AS n FROM alarmas WHERE activa = 1 AND cuando >= NOW()'
    );

    responderBien([
        'alarmas'  => $alarmas,
        'proximas' => (int) ($proximas['n'] ?? 0),
        'ahora'    => date('Y-m-d H:i:s'),
    ]);
    break;


/* ─── GUARDAR ─────────────────────────────────────────────────────────── */

case 'guardar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $fecha = campoFecha($datos, 'fecha');
    $hora  = trim((string) ($datos['hora'] ?? ''));

    if (!$fecha) responderMal('La fecha no es válida.', 400);
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $hora)) {
        responderMal('La hora no es válida.', 400);
    }

    $titulo = campoTexto($datos, 'titulo', 200);
    if ($titulo === '') responderMal('La alarma necesita un título.', 400);

    $cuando = $fecha . ' ' . $hora . ':00';

    /* Se avisa si quedó en el pasado, pero se deja guardar: puede ser a
       propósito, para anotar algo que ya pasó y reprogramarlo después.
       El cron no la va a disparar hacia atrás. */
    $enElPasado = strtotime($cuando) < time();

    $valores = [
        'titulo'       => $titulo,
        'detalle'      => campoTexto($datos, 'detalle', 500),
        'cuando'       => $cuando,
        'repetir'      => campoOpcion($datos, 'repetir',
                          ['una_vez','diaria','semanal','mensual'], 'una_vez'),
        'por_correo'   => !isset($datos['por_correo']) || !empty($datos['por_correo']) ? 1 : 0,
        'por_push'     => !isset($datos['por_push']) || !empty($datos['por_push']) ? 1 : 0,
        'atada_a_tipo' => campoOpcion($datos, 'atada_a_tipo',
                          ['', 'pago', 'tarea', 'agenda', 'gasto', 'proveedor',
                           'cita', 'ensayo', 'invitado'], ''),
        'atada_a_id'   => campoEntero($datos, 'atada_a_id', 0),
        'activa'       => 1,
    ];

    $id = campoEntero($datos, 'id', 0);

    if ($id > 0) {
        $existe = consultarUno('SELECT id FROM alarmas WHERE id = :i', [':i' => $id]);
        if (!$existe) responderMal('Esa alarma ya no existe.', 404);

        // Al editar la hora, se reinicia: vuelve a poder sonar.
        $valores['sonada_en'] = null;
        actualizar('alarmas', $id, $valores);
    } else {
        $valores['creada_por'] = (int) $yo['id'];
        $id = insertar('alarmas', $valores);
    }

    anotarEnBitacora($yo, 'programó una alarma', 'alarmas', $id, $titulo);

    responderBien([
        'id'      => $id,
        'cuando'  => $cuando,
        'aviso'   => $enElPasado ? 'Ojo: esa hora ya pasó, no va a sonar.' : '',
        'mensaje' => 'Alarma programada.',
    ]);
    break;


/* ─── BORRAR, APAGAR Y POSPONER ───────────────────────────────────────── */

case 'borrar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    borrar('alarmas', campoEntero($datos, 'id', 1));
    responderBien(['mensaje' => 'Alarma eliminada.']);
    break;

case 'apagar':
    exigirMetodo('POST');
    $datos = cuerpoJson();
    $id = campoEntero($datos, 'id', 1);

    $alarma = consultarUno('SELECT activa FROM alarmas WHERE id = :i', [':i' => $id]);
    if (!$alarma) responderMal('Esa alarma no existe.', 404);

    $nuevo = ((int) $alarma['activa'] === 1) ? 0 : 1;
    actualizar('alarmas', $id, ['activa' => $nuevo]);

    responderBien([
        'activa'  => $nuevo === 1,
        'mensaje' => $nuevo ? 'Alarma encendida.' : 'Alarma apagada.',
    ]);
    break;

case 'posponer':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $id      = campoEntero($datos, 'id', 1);
    $minutos = campoEntero($datos, 'minutos', 1, 20160, 60);   // hasta 2 semanas

    $alarma = consultarUno('SELECT cuando FROM alarmas WHERE id = :i', [':i' => $id]);
    if (!$alarma) responderMal('Esa alarma no existe.', 404);

    /* Se pospone desde AHORA, no desde su hora original. Si una alarma
       de ayer se pospone "una hora", lo que uno quiere es que suene
       dentro de una hora, no ayer a las cuatro. */
    $nuevo = date('Y-m-d H:i:s', time() + $minutos * 60);

    actualizar('alarmas', $id, [
        'cuando'    => $nuevo,
        'sonada_en' => null,
        'activa'    => 1,
    ]);

    responderBien([
        'cuando'  => $nuevo,
        'mensaje' => 'Pospuesta para ' . date('d/m H:i', strtotime($nuevo)) . '.',
    ]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
