<?php
/* ══════════════════════════════════════════════════════════════════════
   RECIBOS.PHP · UN RECIBO DE PAGO, SIN NECESITAR NINGÚN CONTRATO

   QUÉ HACE ESTE ARCHIVO
   Genera un recibo de pago en PDF para un proveedor —anticipo, saldo o
   pago total— con número consecutivo (REC-2026-0001, REC-2026-0002…),
   lo guarda como adjunto de ese proveedor y anota la fila en la tabla
   `recibos`.

   POR QUÉ NO PIDE NINGÚN CONTRATO
   Lucila puede pagarle a un proveedor sin haber redactado nunca un
   contrato formal —la mayoría de las veces es así—. Este endpoint no
   mira ni pregunta si existe uno: recibe proveedor + monto + concepto y
   arma el PDF. Si alguna vez se quiere enlazar un recibo a un contrato
   puntual, `contrato_id` queda para eso, pero nunca es obligatorio.

   POR QUÉ EL NÚMERO NO SE REPITE
   Se calcula DENTRO de una transacción con `FOR UPDATE`, que bloquea la
   fila del último recibo del año hasta terminar: si dos pestañas
   generan un recibo casi al mismo tiempo, la segunda espera a que la
   primera termine de guardar antes de mirar cuál es el próximo número.
   El UNIQUE de la tabla (ver admin/migracion.sql) es la red de
   seguridad final si algo se coló igual.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar&proveedor_id=8      recibos de un proveedor
     POST ?accion=generar                    { proveedor_id, monto,
                                                concepto, forma_pago,
                                                fecha? }
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/pdf_simple.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'listar');

/** Quién paga siempre, salvo que se configure otra cosa en Ajustes. */
const PAGADORA_POR_DEFECTO = 'Lucila Montserrat García Medina';

/**
 * El nombre de la pagadora, tomado de `ajustes` si existe esa clave, o
 * el valor de siempre si no.
 *
 * @return string
 */
function nombreDeLaPagadora() {
    if (!existeTabla('ajustes')) return PAGADORA_POR_DEFECTO;

    $fila = consultarUno(
        "SELECT valor FROM ajustes WHERE clave = 'nombre_pagadora' LIMIT 1"
    );
    $valor = trim((string) ($fila['valor'] ?? ''));
    return $valor !== '' ? $valor : PAGADORA_POR_DEFECTO;
}

/**
 * Arma el PDF del recibo y devuelve sus bytes.
 *
 * @param array  $recibo    numero, fecha, concepto, monto, forma_pago
 * @param array  $proveedor nombre, servicio, telefono, correo
 * @param string $pagadora
 * @return string
 */
function armarPdfDelRecibo($recibo, $proveedor, $pagadora) {
    $pdf = new PdfSimple();

    $pdf->titulo('RECIBO DE PAGO');
    $pdf->parrafo('Número ' . $recibo['numero']);
    $pdf->espacio(10);
    $pdf->linea();
    $pdf->espacio(6);

    $pdf->filaDeDatos('Fecha', formatearFechaLarga($recibo['fecha']));
    $pdf->filaDeDatos('Paga', $pagadora);
    $pdf->filaDeDatos('Recibe', $proveedor['nombre']);
    if (!empty($proveedor['servicio'])) {
        $pdf->filaDeDatos('Servicio', $proveedor['servicio']);
    }
    $pdf->espacio(6);
    $pdf->linea();
    $pdf->espacio(10);

    $pdf->parrafo('Concepto', true);
    $pdf->parrafo($recibo['concepto'] !== '' ? $recibo['concepto'] : '—');
    $pdf->espacio(10);

    $pdf->filaDeDatos('Monto', '$' . number_format((float) $recibo['monto'], 2));
    $pdf->filaDeDatos('Forma de pago', $recibo['forma_pago'] !== ''
        ? $recibo['forma_pago'] : '—');

    $pdf->espacio(40);
    $pdf->linea();
    $pdf->espacio(4);
    $pdf->parrafo('Firma de quien recibe', false, 9);

    $pdf->espacio(24);
    $pdf->parrafo('Generado para uso personal · XV Años de Ania', false, 8);

    return $pdf->bytes();
}

/**
 * "2026-08-26" → "26 de agosto de 2026".
 *
 * @param string $fecha AAAA-MM-DD
 * @return string
 */
function formatearFechaLarga($fecha) {
    $meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $partes = explode('-', $fecha);
    if (count($partes) !== 3) return $fecha;
    [$anio, $mes, $dia] = $partes;
    return ((int) $dia) . ' de ' . ($meses[(int) $mes] ?? $mes) . ' de ' . $anio;
}


switch ($accion) {

/* ─── LISTAR LOS DE UN PROVEEDOR ──────────────────────────────────────── */

case 'listar':
    exigirMetodo('GET');

    if (!existeTabla('recibos')) {
        responderBien([]); // instalación sin migrar: se ve vacío, no roto
        break;
    }

    $proveedorId = campoEntero($_GET, 'proveedor_id', 0);
    $filas = $proveedorId > 0
        ? consultarTodo(
            'SELECT * FROM recibos WHERE proveedor_id = :p ORDER BY id DESC',
            [':p' => $proveedorId]
          )
        : consultarTodo('SELECT * FROM recibos ORDER BY id DESC LIMIT 200');

    responderBien($filas);
    break;


/* ─── GENERAR UNO NUEVO ───────────────────────────────────────────────── */

case 'generar':
    exigirMetodo('POST');

    if (!existeTabla('recibos')) {
        responderMal(
            'Todavía no se corrió la migración que agrega los recibos.',
            409,
            'Falta la tabla recibos — correr admin/api/instalar.php'
        );
    }

    $datos = cuerpoJson();

    $proveedorId = campoEntero($datos, 'proveedor_id', 1);
    $proveedor = consultarUno('SELECT * FROM proveedores WHERE id = :i',
                              [':i' => $proveedorId]);
    if (!$proveedor) responderMal('Ese proveedor no existe.', 404);

    $monto = campoMonto($datos, 'monto');
    if ($monto <= 0) responderMal('El monto tiene que ser mayor a cero.', 400);

    $fecha = campoFecha($datos, 'fecha') ?? date('Y-m-d');
    $anio  = substr($fecha, 0, 4);

    $recibo = [
        'proveedor_id' => $proveedorId,
        'fecha'        => $fecha,
        'concepto'     => campoTexto($datos, 'concepto', 300),
        'monto'        => $monto,
        'forma_pago'   => campoTexto($datos, 'forma_pago', 60),
    ];

    /* ─── EL NÚMERO, BAJO LLAVE ──────────────────────────────────────
       FOR UPDATE bloquea la fila más nueva de este año hasta el commit:
       si otra pestaña pide un recibo en el medio, espera acá en vez de
       leer el mismo número. Ver la nota grande del encabezado. */
    bd()->beginTransaction();

    $ultimo = consultarUno(
        "SELECT numero FROM recibos WHERE numero LIKE :prefijo
         ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [':prefijo' => "REC-$anio-%"]
    );

    $siguiente = 1;
    if ($ultimo) {
        $partes = explode('-', $ultimo['numero']);
        $siguiente = ((int) end($partes)) + 1;
    }
    $recibo['numero'] = sprintf('REC-%s-%04d', $anio, $siguiente);

    $pagadora  = nombreDeLaPagadora();
    $bytesPdf  = armarPdfDelRecibo($recibo, $proveedor, $pagadora);

    /* ─── GUARDAR EL ARCHIVO, IGUAL QUE archivos.php ─────────────────
       Mismo esquema de carpeta y nombre al azar que usa la subida
       manual, para que este PDF conviva sin diferencias con los
       adjuntos que Lucila sube a mano — el respaldo y el listado de
       "Contrato y documentos" no distinguen entre uno y otro. */
    $carpeta = dirname(__DIR__) . '/archivos';
    if (!is_dir($carpeta)) @mkdir($carpeta, 0755, true);
    if (!is_dir($carpeta) || !is_writable($carpeta)) {
        bd()->rollBack();
        responderMal('El servidor no puede guardar archivos ahora.', 500);
    }

    $nombreDisco = bin2hex(random_bytes(16)) . '.pdf';
    $rutaCompleta = $carpeta . '/' . $nombreDisco;
    if (file_put_contents($rutaCompleta, $bytesPdf) === false) {
        bd()->rollBack();
        responderMal('No se pudo escribir el PDF en el servidor.', 500);
    }

    $nombreLegible = mb_substr(
        'Recibo ' . $recibo['numero']
        . ($recibo['concepto'] !== '' ? ' – ' . $recibo['concepto'] : '')
        . '.pdf',
        0, 255
    );

    $archivoId = insertar('archivos', [
        'nombre_real'  => $nombreLegible,
        'nombre_disco' => $nombreDisco,
        'tipo_mime'    => 'application/pdf',
        'tamano_bytes' => strlen($bytesPdf),
        'atado_a_tipo' => 'proveedor',
        'atado_a_id'   => $proveedorId,
        'subido_por'   => (int) $yo['id'],
    ]);

    $recibo['archivo_id'] = $archivoId;
    $recibo['creado_por'] = (int) $yo['id'];

    $reciboId = insertar('recibos', $recibo);

    bd()->commit();

    anotarEnBitacora($yo, 'generó un recibo', 'recibos', $reciboId, $recibo['numero']);

    responderBien([
        'id'         => $reciboId,
        'numero'     => $recibo['numero'],
        'archivo_id' => $archivoId,
        'nombre'     => $nombreLegible,
    ], 201);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
