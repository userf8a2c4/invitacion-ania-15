<?php
/* ══════════════════════════════════════════════════════════════════════
   CONTRATOS.PHP · UN CONTRATO FORMAL, SIEMPRE OPCIONAL

   QUÉ HACE ESTE ARCHIVO
   Genera un contrato de prestación de servicios en PDF para un
   proveedor, con comparecencia, declaraciones y cláusulas numeradas, y
   lo guarda como adjunto de ese proveedor.

   POR QUÉ ES SOLO UN GENERADOR, NUNCA UN CANDADO
   Este archivo no bloquea nada de lo que ya existe. `recibos.php` no le
   pregunta nada a este archivo, ni antes ni después: un proveedor puede
   tener cinco recibos y cero contratos para siempre, y eso es tan
   válido como lo contrario. Generar un contrato es una opción más de la
   ficha, no un paso obligatorio del flujo de dinero.

   POR QUÉ CASI TODO VIENE PRE-LLENADO
   Lucila ya cargó el servicio y el monto al dar de alta al proveedor.
   Pedírselo otra vez acá —con otro nombre de campo, en otra pantalla—
   sería trabajo doble por algo que el sistema ya sabe. El formulario del
   lado del panel arranca con eso completo; este endpoint solo pone los
   valores por defecto de lo que NO se puede adivinar (penalización,
   cancelación, jurisdicción), para que aceptarlos tal cual sea una
   opción real y no una casilla vacía intimidante.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=listar&proveedor_id=8      contratos de un proveedor
     POST ?accion=generar                    { proveedor_id,
                                                descripcion_servicio,
                                                fecha_inicio?, fecha_firma?,
                                                monto_total, forma_pago,
                                                lugar?, horario?,
                                                clausulas_adicionales?,
                                                penalizaciones?,
                                                cancelacion?, jurisdiccion? }
     POST ?accion=editar                     { id, monto_total?,
                                                forma_pago?, lugar?,
                                                horario?, ... } — igual
                                              que en recibos.php, el PDF
                                              ya firmado no se rehace
     POST ?accion=borrar                     { id } — borra la fila,
                                              el adjunto y el PDF
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/pdf_simple.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'listar');

const PAGADORA_POR_DEFECTO = 'Lucila García';

/** Igual que en recibos.php: toma el nombre de `ajustes` si existe. */
function nombreDeLaPagadora() {
    if (!existeTabla('ajustes')) return PAGADORA_POR_DEFECTO;
    $fila = consultarUno("SELECT valor FROM ajustes WHERE clave = 'nombre_pagadora' LIMIT 1");
    $valor = trim((string) ($fila['valor'] ?? ''));
    return $valor !== '' ? $valor : PAGADORA_POR_DEFECTO;
}

/**
 * Lee un ajuste de `ajustes` con un respaldo si no está configurado.
 * Igual que en recibos.php — duplicado a propósito, ver la nota de
 * formatearFechaLarga() más abajo sobre por qué.
 *
 * @param string $clave
 * @param string $respaldo
 * @return string
 */
function ajusteConRespaldo($clave, $respaldo) {
    if (!existeTabla('ajustes')) return $respaldo;
    $fila = consultarUno('SELECT valor FROM ajustes WHERE clave = :c LIMIT 1', [':c' => $clave]);
    $valor = trim((string) ($fila['valor'] ?? ''));
    return $valor !== '' ? $valor : $respaldo;
}

/** Igual que en recibos.php: domicilio, teléfono, correo y RFC de quien paga. */
function datosDeLaPagadora() {
    return [
        'domicilio' => ajusteConRespaldo('pagadora_domicilio', ''),
        'telefono'  => ajusteConRespaldo('pagadora_telefono', ''),
        'correo'    => ajusteConRespaldo('pagadora_correo', ''),
        'rfc'       => ajusteConRespaldo('pagadora_rfc', ''),
    ];
}

/**
 * Un código corto para verificar el contrato a simple vista. Igual
 * criterio que recibos.php: NO es una firma electrónica legal (en
 * México ese término tiene un significado específico, FIEL/e.firma del
 * SAT) — es una marca de autoría casera, verificable solo porque sale
 * de datos del contrato más una clave que vive en el .env del servidor.
 *
 * @param array $c
 * @return string
 */
function codigoDeVerificacion($c) {
    $llave = env('RESPALDO_CLAVE', 'ania-xv-contratos');
    $huella = ($c['numero'] ?? '') . '|' . $c['proveedor_id'] . '|'
            . $c['monto_total'] . '|' . $c['fecha_firma'];
    return strtoupper(substr(hash_hmac('sha256', $huella, $llave), 0, 10));
}

/**
 * Cantidad en letra, igual que en recibos.php. Duplicada a propósito:
 * ver la nota de formatearFechaLarga() sobre por qué compartir una
 * función de pocas líneas no vale la complicación de otro archivo
 * `_lib` para dos endpoints tan chicos.
 *
 * @param float $monto
 * @return string
 */
function cantidadEnLetra($monto) {
    $unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
                 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce',
                 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    $decenas  = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta',
                 'sesenta', 'setenta', 'ochenta', 'noventa'];
    $centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos',
                 'quinientos', 'seiscientos', 'setecientos', 'ochocientos',
                 'novecientos'];

    $trescientos = function ($n) use ($unidades, $decenas, $centenas, &$trescientos) {
        if ($n === 0) return '';
        if ($n === 100) return 'cien';
        if ($n < 20) return $unidades[$n];
        if ($n < 100) {
            $resto = $n % 10;
            return $decenas[intdiv($n, 10)] . ($resto ? ' y ' . $unidades[$resto] : '');
        }
        $resto = $n % 100;
        return $centenas[intdiv($n, 100)] . ($resto ? ' ' . $trescientos($resto) : '');
    };

    $entero   = (int) floor($monto);
    $centavos = (int) round(($monto - $entero) * 100);

    if ($entero === 0) {
        $letraEntero = 'cero';
    } else {
        $miles = intdiv($entero, 1000);
        $resto = $entero % 1000;
        $letraEntero = '';
        if ($miles > 0) {
            $letraEntero .= ($miles === 1 ? 'un mil' : $trescientos($miles) . ' mil');
        }
        if ($resto > 0) {
            $letraEntero .= ($letraEntero !== '' ? ' ' : '') . $trescientos($resto);
        }
    }

    $letraEntero = ucfirst($letraEntero);
    return sprintf('%s pesos %02d/100 M.N.', $letraEntero, $centavos);
}

/**
 * Arma el PDF del contrato completo: encabezado, comparecencia,
 * declaraciones, cláusulas numeradas y espacio de firmas.
 *
 * @param array  $c         Los datos ya limpios del contrato.
 * @param array  $proveedor nombre, servicio, telefono, correo
 * @param string $pagadora
 * @return string
 */
function armarPdfDelContrato($c, $proveedor, $pagadora) {
    $pdf = new PdfSimple();
    $datosPagadora = datosDeLaPagadora();

    $pdf->titulo('ANIA · XV AÑOS');
    $pdf->parrafo('CONTRATO DE PRESTACIÓN DE SERVICIOS', true, 12);
    if (!empty($c['numero'])) $pdf->parrafo('Número ' . $c['numero']);
    $pdf->parrafo('Fecha de firma: ' . formatearFechaLarga($c['fecha_firma']));
    $pdf->espacio(14);

    $pdf->parrafo('COMPARECENCIA', true);
    $datosDeContacto = array_filter([
        !empty($proveedor['telefono']) ? 'teléfono ' . $proveedor['telefono'] : '',
        $c['proveedor_identificacion'] !== '' ? 'RFC/identificación ' . $c['proveedor_identificacion'] : '',
    ]);
    $pdf->parrafo(
        'Por una parte ' . $pagadora
        . ($datosPagadora['domicilio'] !== '' ? ', con domicilio en ' . $datosPagadora['domicilio'] : '')
        . ($datosPagadora['rfc'] !== '' ? ', RFC ' . $datosPagadora['rfc'] : '')
        . ', a quien en lo sucesivo se denominará "LA CONTRATANTE"; y por la '
        . 'otra ' . $proveedor['nombre']
        . ($datosDeContacto ? ' (' . implode(', ', $datosDeContacto) . ')' : '')
        . ', a quien en lo sucesivo se denominará "EL PRESTADOR", quienes '
        . 'convienen en celebrar el presente contrato de prestación de '
        . 'servicios, sujeto a las declaraciones y cláusulas siguientes.'
    );
    $pdf->espacio(10);

    $pdf->parrafo('DECLARACIONES', true);
    $pdf->parrafo(
        'I. Declara LA CONTRATANTE que requiere los servicios descritos '
        . 'en la cláusula PRIMERA de este contrato para el evento social '
        . 'que se detalla en el mismo.'
    );
    $pdf->parrafo(
        'II. Declara EL PRESTADOR contar con los medios, experiencia y '
        . 'capacidad necesarios para prestar dicho servicio en los '
        . 'términos aquí acordados.'
    );
    $pdf->espacio(10);

    $pdf->parrafo('CLÁUSULAS', true);
    $pdf->espacio(4);

    $pdf->parrafo('PRIMERA. OBJETO DEL CONTRATO', true);
    $pdf->parrafo($c['descripcion_servicio'] !== ''
        ? $c['descripcion_servicio']
        : 'EL PRESTADOR se obliga a proporcionar el servicio de ' . $proveedor['servicio'] . '.');
    $pdf->espacio(8);

    $pdf->parrafo('SEGUNDA. FECHA Y LUGAR', true);
    $texto = 'El servicio se prestará';
    if ($c['fecha_inicio']) $texto .= ' el día ' . formatearFechaLarga($c['fecha_inicio']);
    if ($c['lugar'] !== '') $texto .= ', en ' . $c['lugar'];
    if ($c['horario'] !== '') $texto .= ', en el horario: ' . $c['horario'];
    $pdf->parrafo($texto . '.');
    $pdf->espacio(8);

    $pdf->parrafo('TERCERA. PRECIO Y FORMA DE PAGO', true);
    $pdf->parrafo(
        'El monto total pactado por el servicio es de $'
        . number_format((float) $c['monto_total'], 2) . ' (moneda nacional) — '
        . cantidadEnLetra((float) $c['monto_total']) . '. '
        . 'Forma de pago: ' . ($c['forma_pago'] !== '' ? $c['forma_pago']
            : 'a convenir entre las partes') . '.'
    );
    $pdf->espacio(8);

    $pdf->parrafo('CUARTA. OBLIGACIONES DE LAS PARTES', true);
    $pdf->parrafo(
        'EL PRESTADOR se obliga a cumplir el servicio contratado con la '
        . 'calidad y en los tiempos pactados. LA CONTRATANTE se obliga a '
        . 'cubrir el pago en los términos de la cláusula TERCERA.'
    );
    $pdf->espacio(8);

    $pdf->parrafo('QUINTA. PENALIZACIONES POR INCUMPLIMIENTO', true);
    $pdf->parrafo($c['penalizaciones'] !== '' ? $c['penalizaciones']
        : 'En caso de incumplimiento por causas imputables a EL PRESTADOR, '
        . 'éste se obliga a reembolsar a LA CONTRATANTE las cantidades ya '
        . 'entregadas por concepto de anticipo, sin perjuicio de otras '
        . 'acciones que correspondan.');
    $pdf->espacio(8);

    $pdf->parrafo('SEXTA. POLÍTICA DE CANCELACIÓN', true);
    $pdf->parrafo($c['cancelacion'] !== '' ? $c['cancelacion']
        : 'LA CONTRATANTE podrá cancelar el presente contrato con al menos '
        . 'quince días naturales de anticipación a la fecha pactada, caso '
        . 'en el cual el anticipo entregado no será reembolsable.');
    $pdf->espacio(8);

    if ($c['clausulas_adicionales'] !== '') {
        $pdf->parrafo('SÉPTIMA. CLÁUSULAS ADICIONALES', true);
        $pdf->parrafo($c['clausulas_adicionales']);
        $pdf->espacio(8);
    }

    $pdf->parrafo('ÚLTIMA. JURISDICCIÓN', true);
    $pdf->parrafo(
        'Para la interpretación y cumplimiento del presente contrato, las '
        . 'partes se someten a las leyes y tribunales de '
        . ($c['jurisdiccion'] !== '' ? $c['jurisdiccion'] : 'México') . '.'
    );

    // Las firmas SIEMPRE en hoja propia: que nunca queden partidas a la
    // mitad si el resto del contrato ocupó hasta el final de una página.
    $pdf->nuevaPagina();
    $pdf->parrafo(
        'Leído que fue el presente contrato y enteradas las partes de su '
        . 'contenido y alcance legal, lo firman de conformidad.'
    );
    $pdf->espacio(60);
    $pdf->linea();
    $pdf->parrafo($pagadora, true, 10);
    $pdf->parrafo('LA CONTRATANTE', false, 9);
    $pdf->espacio(50);
    $pdf->linea();
    $pdf->parrafo($proveedor['nombre'], true, 10);
    $pdf->parrafo('EL PRESTADOR', false, 9);

    $pdf->espacio(30);
    /* ⚠️ NUNCA "firma digital": ver la nota de codigoDeVerificacion()
       más arriba — en México ese término tiene un significado legal
       específico que esto no pretende tener. */
    $pdf->parrafo('Generado y autorizado por ' . $pagadora, false, 9);
    $pdf->parrafo('Código de verificación: ' . codigoDeVerificacion($c), false, 8);
    $pdf->parrafo('Generado para uso personal · XV Años de Ania', false, 8);

    return $pdf->bytes();
}

/**
 * "2026-08-26" → "26 de agosto de 2026". Igual que en recibos.php —
 * duplicado a propósito: son dos endpoints chicos e independientes, y
 * compartir una función de dos líneas por un solo `require` más no vale
 * la complicación de otro archivo `_lib` para esto.
 *
 * @param string $fecha AAAA-MM-DD
 * @return string
 */
function formatearFechaLarga($fecha) {
    $meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $partes = explode('-', (string) $fecha);
    if (count($partes) !== 3) return (string) $fecha;
    [$anio, $mes, $dia] = $partes;
    return ((int) $dia) . ' de ' . ($meses[(int) $mes] ?? $mes) . ' de ' . $anio;
}


switch ($accion) {

case 'listar':
    exigirMetodo('GET');

    if (!existeTabla('contratos')) {
        responderBien([]);
        break;
    }

    $proveedorId = campoEntero($_GET, 'proveedor_id', 0);
    $filas = $proveedorId > 0
        ? consultarTodo('SELECT * FROM contratos WHERE proveedor_id = :p ORDER BY id DESC',
                        [':p' => $proveedorId])
        : consultarTodo('SELECT * FROM contratos ORDER BY id DESC LIMIT 200');

    responderBien($filas);
    break;


case 'generar':
    exigirMetodo('POST');

    if (!existeTabla('contratos')) {
        responderMal(
            'Todavía no se corrió la migración que agrega los contratos.',
            409,
            'Falta la tabla contratos — correr admin/api/instalar.php'
        );
    }

    $datos = cuerpoJson();

    $proveedorId = campoEntero($datos, 'proveedor_id', 1);
    $proveedor = consultarUno('SELECT * FROM proveedores WHERE id = :i', [':i' => $proveedorId]);
    if (!$proveedor) responderMal('Ese proveedor no existe.', 404);

    $montoTotal = campoMonto($datos, 'monto_total');
    if ($montoTotal <= 0) responderMal('El monto total tiene que ser mayor a cero.', 400);

    $contrato = [
        'proveedor_id'             => $proveedorId,
        // Se usa solo para escribirlo en el PDF (comparecencia); no es
        // columna de la tabla — se saca del array antes de insertar,
        // igual que lugar_expedicion en recibos.php.
        'proveedor_identificacion' => campoTexto($datos, 'proveedor_identificacion', 60),
        'descripcion_servicio'  => campoTexto($datos, 'descripcion_servicio', 2000),
        'fecha_inicio'          => campoFecha($datos, 'fecha_inicio'),
        'fecha_firma'           => campoFecha($datos, 'fecha_firma') ?? date('Y-m-d'),
        'monto_total'           => $montoTotal,
        'forma_pago'            => campoTexto($datos, 'forma_pago', 300),
        'lugar'                 => campoTexto($datos, 'lugar', 200),
        'horario'               => campoTexto($datos, 'horario', 150),
        'clausulas_adicionales' => campoTexto($datos, 'clausulas_adicionales', 2000),
        'penalizaciones'        => campoTexto($datos, 'penalizaciones', 1000),
        'cancelacion'           => campoTexto($datos, 'cancelacion', 1000),
        'jurisdiccion'          => campoTexto($datos, 'jurisdiccion', 150),
    ];

    /* ─── EL NÚMERO, BAJO LLAVE ──────────────────────────────────────
       Mismo mecanismo que recibos.php: prefijo y número inicial
       configurables desde admin/codigo/47-config-documentos.js, y
       FOR UPDATE para que dos contratos casi simultáneos nunca se
       lleven el mismo número. */
    $anio = substr($contrato['fecha_firma'], 0, 4);
    $prefijo       = ajusteConRespaldo('contrato_prefijo', 'CON');
    $numeroInicial = max(1, (int) ajusteConRespaldo('contrato_numero_inicial', '1'));

    bd()->beginTransaction();

    $ultimo = consultarUno(
        "SELECT numero FROM contratos WHERE numero LIKE :prefijo
         ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [':prefijo' => "$prefijo-$anio-%"]
    );

    $siguiente = $numeroInicial;
    if ($ultimo && $ultimo['numero']) {
        $partes = explode('-', $ultimo['numero']);
        $siguiente = max($numeroInicial, ((int) end($partes)) + 1);
    }
    $contrato['numero'] = sprintf('%s-%s-%04d', $prefijo, $anio, $siguiente);

    $pagadora = nombreDeLaPagadora();
    $bytesPdf = armarPdfDelContrato($contrato, $proveedor, $pagadora);

    // Mismo esquema de carpeta y nombre al azar que archivos.php y
    // recibos.php: un PDF generado acá convive sin diferencias con los
    // adjuntos que Lucila sube a mano.
    $carpeta = dirname(__DIR__) . '/archivos';
    if (!is_dir($carpeta)) @mkdir($carpeta, 0755, true);
    if (!is_dir($carpeta) || !is_writable($carpeta)) {
        bd()->rollBack();
        responderMal('El servidor no puede guardar archivos ahora.', 500);
    }

    $nombreDisco  = bin2hex(random_bytes(16)) . '.pdf';
    $rutaCompleta = $carpeta . '/' . $nombreDisco;
    if (file_put_contents($rutaCompleta, $bytesPdf) === false) {
        bd()->rollBack();
        responderMal('No se pudo escribir el PDF en el servidor.', 500);
    }

    $nombreLegible = mb_substr(
        'Contrato ' . $contrato['numero'] . ' – ' . $proveedor['servicio'] . '.pdf',
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

    $contrato['archivo_id'] = $archivoId;
    $contrato['creado_por'] = (int) $yo['id'];

    $filaParaGuardar = $contrato;
    unset($filaParaGuardar['proveedor_identificacion']);

    $contratoId = insertar('contratos', $filaParaGuardar);

    bd()->commit();

    anotarEnBitacora($yo, 'generó un contrato', 'contratos', $contratoId, $proveedor['nombre']);

    responderBien([
        'id'         => $contratoId,
        'numero'     => $contrato['numero'],
        'archivo_id' => $archivoId,
        'nombre'     => $nombreLegible,
    ], 201);
    break;


/* ─── EDITAR LOS DATOS (NO EL PDF YA FIRMADO) ──────────────────────────
   Mismo criterio que recibos.php: esto corrige la fila para que las
   listas queden bien, no reescribe el PDF que ya se pudo haber
   impreso o firmado. Para un contrato con datos de verdad distintos,
   lo correcto es borrar éste y generar uno nuevo. */

case 'editar':
    exigirMetodo('POST');
    if (!existeTabla('contratos')) responderMal('Falta la tabla contratos.', 409);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $existente = consultarUno('SELECT id FROM contratos WHERE id = :i', [':i' => $id]);
    if (!$existente) responderMal('Ese contrato no existe.', 404);

    $camposEditables = ['descripcion_servicio', 'fecha_inicio', 'fecha_firma',
                         'monto_total', 'forma_pago', 'lugar', 'horario',
                         'clausulas_adicionales', 'penalizaciones',
                         'cancelacion', 'jurisdiccion'];
    $cambios = [];
    foreach ($camposEditables as $campo) {
        if (!isset($datos[$campo])) continue;
        $cambios[$campo] = $campo === 'monto_total'
            ? campoMonto($datos, $campo)
            : (in_array($campo, ['fecha_inicio', 'fecha_firma'], true)
                ? campoFecha($datos, $campo)
                : campoTexto($datos, $campo, 2000));
    }

    if ($cambios) actualizar('contratos', $id, $cambios);

    anotarEnBitacora($yo, 'editó un contrato', 'contratos', $id, '');
    responderBien(['id' => $id]);
    break;


/* ─── BORRAR (LA FILA, EL ADJUNTO Y EL PDF, LOS TRES JUNTOS) ─────────── */

case 'borrar':
    exigirMetodo('POST');
    if (!existeTabla('contratos')) responderMal('Falta la tabla contratos.', 409);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $contrato = consultarUno('SELECT * FROM contratos WHERE id = :i', [':i' => $id]);
    if (!$contrato) responderMal('Ese contrato no existe.', 404);

    if (!empty($contrato['archivo_id'])) {
        $archivo = consultarUno('SELECT * FROM archivos WHERE id = :i',
                                [':i' => (int) $contrato['archivo_id']]);
        if ($archivo) {
            $ruta = dirname(__DIR__) . '/archivos/' . basename($archivo['nombre_disco']);
            if (is_file($ruta)) @unlink($ruta);
            borrar('archivos', (int) $archivo['id']);
        }
    }

    borrar('contratos', $id);

    anotarEnBitacora($yo, 'borró un contrato', 'contratos', $id, '');
    responderBien(['mensaje' => 'Contrato eliminado.']);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
