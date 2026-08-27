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
     GET  ?accion=listar&pago_id=8           el recibo de ESE pago, si hay
     POST ?accion=generar                    { proveedor_id, monto,
                                                concepto, forma_pago,
                                                fecha?, pago_id?,
                                                tambien_registrar_pago? }
                                              (ver la nota grande de más
                                              abajo sobre estos dos)
     POST ?accion=editar                     { id, monto?, concepto?,
                                                forma_pago?, fecha? }
                                              (el PDF NO se rehace: ver
                                              la nota de "editar" abajo)
     POST ?accion=marcar_estado              { id, estado: pendiente|
                                                enviado|firmado }
     POST ?accion=borrar                     { id } — borra la fila,
                                              el adjunto y el PDF del
                                              disco, los tres juntos
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/pdf_simple.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'listar');

/** Quién paga siempre, salvo que se configure otra cosa en Ajustes. */
const PAGADORA_POR_DEFECTO = 'Lucila García';

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
 * Lee un ajuste de `ajustes` con un respaldo si no está configurado
 * todavía. Usado para el prefijo y el número inicial de la numeración
 * —ver admin/codigo/47-config-documentos.js, que es la pantalla donde
 * Lucila los cambia—.
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

/**
 * Un código corto para que el recibo se pueda verificar a simple vista
 * si alguien duda de que sea genuino: sale de los datos del recibo más
 * una clave que ya vive en el .env del servidor (la misma que cifra el
 * respaldo diario), así que nadie puede armar uno a mano sin tener
 * acceso al servidor.
 *
 * OJO: esto NO es una firma electrónica legal (el proyecto no integra
 * ninguna, a propósito — ver la nota del prompt original). Es una marca
 * de autenticidad casera: si dos dígitos del recibo cambiaran, el
 * código ya no coincidiría con lo que devuelve esta misma función.
 *
 * @param array $recibo
 * @return string 10 caracteres hexadecimales.
 */
function codigoDeVerificacion($recibo) {
    $llave = env('RESPALDO_CLAVE', 'ania-xv-recibos');
    $huella = $recibo['numero'] . '|' . $recibo['proveedor_id'] . '|'
            . $recibo['monto'] . '|' . $recibo['fecha'];
    return strtoupper(substr(hash_hmac('sha256', $huella, $llave), 0, 10));
}

/**
 * Los datos de quien paga, más allá del nombre — todos opcionales,
 * todos configurables desde admin/codigo/47-config-documentos.js. En
 * México un recibo simple gana mucha más formalidad con esto, aunque
 * (como aclara el propio documento) esto sigue sin ser un CFDI.
 *
 * @return array {domicilio, telefono, correo, rfc}
 */
function datosDeLaPagadora() {
    return [
        'domicilio' => ajusteConRespaldo('pagadora_domicilio', ''),
        'telefono'  => ajusteConRespaldo('pagadora_telefono', ''),
        'correo'    => ajusteConRespaldo('pagadora_correo', ''),
        'rfc'       => ajusteConRespaldo('pagadora_rfc', ''),
    ];
}

/**
 * Convierte un monto a su cantidad en letra, como se acostumbra en un
 * recibo mexicano: "Un mil quinientos pesos 00/100 M.N.". Cubre de $0
 * a $999,999.99, que es de sobra para lo que se paga a un proveedor de
 * una fiesta — un monto mayor es un caso tan raro que no vale la pena
 * la complejidad de nombrar millones acá.
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

    /**
     * Convierte un número de 0 a 999 a letra.
     * @param int $n
     * @return string
     */
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
        $miles  = intdiv($entero, 1000);
        $resto  = $entero % 1000;
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
 * Arma el PDF del recibo y devuelve sus bytes.
 *
 * @param array  $recibo    numero, fecha, concepto, monto, forma_pago
 * @param array  $destinatario  nombre (siempre), servicio (opcional —
 *                              solo si es un proveedor).
 * @param string $pagadora
 * @return string
 */
function armarPdfDelRecibo($recibo, $destinatario, $pagadora) {
    $pdf = new PdfSimple();
    $datosPagadora = datosDeLaPagadora();

    $pdf->titulo('ANIA · XV AÑOS');
    $pdf->parrafo('RECIBO DE PAGO — Comprobante simple, no es un CFDI', true, 10);
    $pdf->parrafo('Número ' . $recibo['numero']);
    if ($recibo['lugar_expedicion'] !== '') {
        $pdf->parrafo('Expedido en ' . $recibo['lugar_expedicion'] . ', a '
            . formatearFechaLarga($recibo['fecha']) . '.', false, 9);
    }
    $pdf->espacio(10);
    $pdf->linea();
    $pdf->espacio(6);

    $pdf->filaDeDatos('Fecha', formatearFechaLarga($recibo['fecha']));
    $pdf->filaDeDatos('Paga', $pagadora);
    if ($datosPagadora['domicilio'] !== '') $pdf->filaDeDatos('Domicilio', $datosPagadora['domicilio'], 9);
    if ($datosPagadora['telefono'] !== '')  $pdf->filaDeDatos('Teléfono', $datosPagadora['telefono'], 9);
    if ($datosPagadora['correo'] !== '')    $pdf->filaDeDatos('Correo', $datosPagadora['correo'], 9);
    if ($datosPagadora['rfc'] !== '')       $pdf->filaDeDatos('RFC', $datosPagadora['rfc'], 9);
    $pdf->espacio(4);
    $pdf->filaDeDatos('Recibe', $destinatario['nombre']);
    if (!empty($destinatario['servicio'])) {
        $pdf->filaDeDatos('Servicio', $destinatario['servicio']);
    }
    $pdf->espacio(6);
    $pdf->linea();
    $pdf->espacio(10);

    $pdf->parrafo('Concepto', true);
    $pdf->parrafo($recibo['concepto'] !== '' ? $recibo['concepto'] : '—');
    $pdf->espacio(10);

    $pdf->filaDeDatos('Monto', '$' . number_format((float) $recibo['monto'], 2));
    $pdf->parrafo('(' . cantidadEnLetra((float) $recibo['monto']) . ')', false, 9);
    $pdf->espacio(4);
    $pdf->filaDeDatos('Forma de pago', $recibo['forma_pago'] !== ''
        ? $recibo['forma_pago'] : '—');

    $pdf->espacio(40);
    $pdf->linea();
    $pdf->espacio(4);
    $pdf->parrafo('Firma de quien recibe', false, 9);

    $pdf->espacio(24);
    /* ⚠️ NUNCA "firma digital": en México ese término tiene un
       significado legal específico (FIEL / e.firma del SAT), y esto no
       lo es — es una marca de autoría casera, no una firma electrónica
       avanzada. "Generado y autorizado por…" dice exactamente lo que
       es, sin insinuar una validez fiscal que no tiene. */
    $pdf->parrafo('Generado y autorizado por ' . $pagadora, false, 9);
    $pdf->parrafo('Código de verificación: ' . codigoDeVerificacion($recibo), false, 8);
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
    $pagoId      = campoEntero($_GET, 'pago_id', 0);

    if ($pagoId > 0) {
        $filas = consultarTodo('SELECT * FROM recibos WHERE pago_id = :p ORDER BY id DESC',
                               [':p' => $pagoId]);
    } elseif ($proveedorId > 0) {
        $filas = consultarTodo('SELECT * FROM recibos WHERE proveedor_id = :p ORDER BY id DESC',
                               [':p' => $proveedorId]);
    } else {
        $filas = consultarTodo('SELECT * FROM recibos ORDER BY id DESC LIMIT 200');
    }

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

    /* ⚡ CHEQUEO EXPLÍCITO DE `pago_id`, Y ES A PROPÓSITO (2026-08-26).
       Antes de esto, una instalación que ya tenía `recibos` de la Fase A
       pero no había vuelto a correr instalar.php después de esta ronda
       fallaba con un error genérico de PDO ("No se pudo guardar el
       cambio.") apenas se intentaba guardar la fila — porque la columna
       simplemente no existía todavía. El mensaje no decía POR QUÉ, así
       que parecía un bug de código en vez de una migración pendiente.
       Este chequeo cuesta una consulta a information_schema, pero
       convierte un misterio en una instrucción concreta. */
    $columnasDeRecibos = columnasDe('recibos');
    $columnasQueHacenFalta = array_diff(['pago_id', 'beneficiario', 'padrino_id'], $columnasDeRecibos);
    if ($columnasQueHacenFalta) {
        responderMal(
            'Falta actualizar la base de datos: correr admin/api/instalar.php de nuevo.',
            409,
            'Faltan columnas en recibos: ' . implode(', ', $columnasQueHacenFalta)
        );
    }

    $datos = cuerpoJson();

    /* ─── ¿VIENE DE UN PAGO YA CARGADO, O HAY QUE CREARLO? ────────────
       POR QUÉ ESTO Y NO DOS ENDPOINTS DISTINTOS
       Antes de esta ronda, un recibo generado desde la ficha del
       proveedor no tocaba `gastos`/`pagos` para nada: el dinero que
       representaba no aparecía en los totales de "pagado" del
       Presupuesto, y Lucila tenía que cargarlo dos veces si quería que
       las cuentas cerraran. Ahora hay dos caminos que llegan al mismo
       lugar:

       1. `pago_id` viene con un id real → el recibo es el comprobante
          de un pago que YA EXISTE en Presupuesto (por ejemplo, desde
          abrirDetalleDePago). Se usa tal cual, nunca se crea nada.

       2. No viene `pago_id` pero sí `tambien_registrar_pago: true`
          (el checkbox tildado por defecto en abrirGeneradorDeRecibo) →
          se busca un gasto de este proveedor; si no hay ninguno, se
          crea uno (mismo criterio de `a_presupuesto` en cotizador.php:
          concepto = el servicio, presupuestado = el monto total ya
          cargado en la ficha). Después se inserta el pago, ya marcado
          "pagado".

       3. Ninguna de las dos → el recibo queda exactamente igual que
          antes de esta ronda: suelto, sin tocar Presupuesto. Nunca es
          obligatorio: ver la nota grande del encabezado. */
    $pagoIdRecibido        = campoEntero($datos, 'pago_id', 0);
    $tambienRegistrarPago  = !empty($datos['tambien_registrar_pago']);

    $pagoExistente = null;
    if ($pagoIdRecibido > 0) {
        $pagoExistente = consultarUno(
            'SELECT p.*, g.proveedor_id AS proveedor_id_del_gasto
             FROM pagos p LEFT JOIN gastos g ON g.id = p.gasto_id
             WHERE p.id = :i', [':i' => $pagoIdRecibido]
        );
        if (!$pagoExistente) responderMal('Ese pago no existe.', 404);
        if (empty($pagoExistente['proveedor_id_del_gasto'])) {
            responderMal('Ese pago no está atado a ningún proveedor.', 400);
        }
    }

    /* ─── QUIÉN RECIBE: PROVEEDOR, PADRINO, O ALGUIEN SIN FICHA ───────
       Un recibo ya no exige un proveedor (ver la nota grande de
       migracion.sql). Tres formas de decir quién lo recibe, en este
       orden de prioridad:
         1. Viene de un pago ya cargado → el proveedor de ESE pago
            (como ya funcionaba).
         2. `proveedor_id` directo → ficha de proveedor (como ya
            funcionaba: la ficha de proveedor sigue mandando esto).
         3. `padrino_id` → ficha de padrino.
         4. `beneficiario` (texto) → alguien sin ficha propia.
       Exactamente uno de proveedor_id/padrino_id/beneficiario tiene
       que resolver un nombre; si ninguno lo hace, es un error del
       formulario, no algo que adivinar acá. */
    $proveedorId = $pagoExistente
        ? (int) $pagoExistente['proveedor_id_del_gasto']
        : campoEntero($datos, 'proveedor_id', 0);
    $padrinoId = $proveedorId > 0 ? 0 : campoEntero($datos, 'padrino_id', 0);

    $proveedor = null;
    $padrino   = null;
    $destinatario = null;   // ['nombre' => …, 'servicio' => … opcional]

    if ($proveedorId > 0) {
        $proveedor = consultarUno('SELECT * FROM proveedores WHERE id = :i', [':i' => $proveedorId]);
        if (!$proveedor) responderMal('Ese proveedor no existe.', 404);
        $destinatario = ['nombre' => $proveedor['nombre'], 'servicio' => $proveedor['servicio']];
    } elseif ($padrinoId > 0) {
        $padrino = consultarUno('SELECT * FROM padrinos WHERE id = :i', [':i' => $padrinoId]);
        if (!$padrino) responderMal('Ese padrino no existe.', 404);
        $destinatario = ['nombre' => $padrino['nombre']];
    } else {
        $beneficiarioLibre = campoTexto($datos, 'beneficiario', 200);
        if ($beneficiarioLibre === '') {
            responderMal('Falta decir a quién le pagás.', 400);
        }
        $destinatario = ['nombre' => $beneficiarioLibre];
    }

    $monto = $pagoExistente ? (float) $pagoExistente['monto'] : campoMonto($datos, 'monto');
    if ($monto <= 0) responderMal('El monto tiene que ser mayor a cero.', 400);

    $fecha = $pagoExistente
        ? ($pagoExistente['fecha_pagado'] ?: date('Y-m-d'))
        : (campoFecha($datos, 'fecha') ?? date('Y-m-d'));
    $anio  = substr($fecha, 0, 4);

    $recibo = [
        'proveedor_id' => $proveedorId > 0 ? $proveedorId : null,
        'padrino_id'   => $padrinoId > 0 ? $padrinoId : null,
        'beneficiario' => $destinatario['nombre'],
        'fecha'        => $fecha,
        'concepto'     => $pagoExistente ? $pagoExistente['concepto'] : campoTexto($datos, 'concepto', 300),
        'monto'        => $monto,
        'forma_pago'   => $pagoExistente ? $pagoExistente['metodo'] : campoTexto($datos, 'forma_pago', 60),
        'estado'       => 'pendiente',
        'pago_id'      => $pagoIdRecibido > 0 ? $pagoIdRecibido : null,
    ];

    /* ─── EL NÚMERO, BAJO LLAVE ──────────────────────────────────────
       Prefijo y "número desde el cual arrancar" son configurables
       (admin/codigo/47-config-documentos.js): así Lucila puede seguir
       una numeración que ya traía en papel, o cambiar la nomenclatura
       cuando quiera sin chocar con lo ya emitido — cambiar el prefijo
       abre una serie nueva por completo.

       FOR UPDATE bloquea la fila más nueva de este año y este prefijo
       hasta el commit: si otra pestaña pide un recibo en el medio,
       espera acá en vez de leer el mismo número. Ver la nota grande
       del encabezado. */
    $prefijo       = ajusteConRespaldo('recibo_prefijo', 'REC');
    $numeroInicial = max(1, (int) ajusteConRespaldo('recibo_numero_inicial', '1'));

    bd()->beginTransaction();

    $ultimo = consultarUno(
        "SELECT numero FROM recibos WHERE numero LIKE :prefijo
         ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [':prefijo' => "$prefijo-$anio-%"]
    );

    $siguiente = $numeroInicial;
    if ($ultimo) {
        $partes = explode('-', $ultimo['numero']);
        $siguiente = max($numeroInicial, ((int) end($partes)) + 1);
    }
    $recibo['numero'] = sprintf('%s-%s-%04d', $prefijo, $anio, $siguiente);
    $recibo['lugar_expedicion'] = ajusteConRespaldo('lugar_expedicion', '');

    /* ─── CREAR GASTO + PAGO, SI SE PIDIÓ Y TODAVÍA NO HAY NINGUNO ────
       Mismo defaulting que `a_presupuesto` en cotizador.php: si este
       proveedor no tiene ni un gasto cargado, se crea uno con lo que ya
       se sabe de él (servicio, monto total) en vez de dejarlo vacío. Si
       ya tiene uno, se reutiliza — nunca se duplica un gasto por
       generar un segundo recibo del mismo proveedor.

       Solo aplica con proveedor: un pago a un padrino o a alguien sin
       ficha no tiene con qué armar un `gasto` de verdad (esa tabla
       exige un concepto y vive del lado de "lo que cuesta la fiesta",
       no de "a quién le devolví plata"). Para esos casos el recibo
       sigue generándose, simplemente no se ofrece este atajo. */
    if ($tambienRegistrarPago && !$pagoExistente && $proveedorId > 0) {
        $gasto = consultarUno(
            'SELECT id FROM gastos WHERE proveedor_id = :p ORDER BY id ASC LIMIT 1 FOR UPDATE',
            [':p' => $proveedorId]
        );
        $gastoId = $gasto
            ? (int) $gasto['id']
            : insertar('gastos', [
                'concepto'      => $proveedor['servicio'] !== '' ? $proveedor['servicio'] : $proveedor['nombre'],
                'proveedor_id'  => $proveedorId,
                'presupuestado' => (float) $proveedor['monto_total'],
                'monto_real'    => (float) $proveedor['monto_total'],
              ]);

        $pagoId = insertar('pagos', [
            'gasto_id'     => $gastoId,
            'concepto'     => $recibo['concepto'] !== '' ? $recibo['concepto'] : 'Pago a ' . $proveedor['nombre'],
            'monto'        => $monto,
            'fecha_pagado' => $fecha,
            'estado'       => 'pagado',
            'metodo'       => $recibo['forma_pago'],
        ]);

        $recibo['pago_id'] = $pagoId;
    }

    $pagadora  = nombreDeLaPagadora();
    $bytesPdf  = armarPdfDelRecibo($recibo, $destinatario, $pagadora);

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

    // A qué ficha queda visible este PDF, si corresponde a alguna —
    // igual que archivos.php: '' (sin atar) es un valor válido, no un
    // error, para el caso de un beneficiario sin ficha propia.
    $atadoATipo = $proveedorId > 0 ? 'proveedor' : ($padrinoId > 0 ? 'padrino' : '');
    $atadoAId   = $proveedorId > 0 ? $proveedorId : ($padrinoId > 0 ? $padrinoId : 0);

    $archivoId = insertar('archivos', [
        'nombre_real'  => $nombreLegible,
        'nombre_disco' => $nombreDisco,
        'tipo_mime'    => 'application/pdf',
        'tamano_bytes' => strlen($bytesPdf),
        'atado_a_tipo' => $atadoATipo,
        'atado_a_id'   => $atadoAId,
        'subido_por'   => (int) $yo['id'],
    ]);

    $recibo['archivo_id'] = $archivoId;
    $recibo['creado_por'] = (int) $yo['id'];

    /* Mismo enlace que ya hace archivos.php al subir un comprobante a
       mano (líneas 195-201 de ese archivo) — no una versión paralela.
       Así el pago, con o sin recibo, siempre muestra el mismo PDF como
       su comprobante en abrirDetalleDePago(). */
    if (!empty($recibo['pago_id'])) {
        actualizar('pagos', (int) $recibo['pago_id'], ['comprobante_id' => $archivoId]);
    }

    // lugar_expedicion es un ajuste del evento, no una columna de esta
    // tabla — se usó arriba solo para escribirlo en el PDF.
    $filaParaGuardar = $recibo;
    unset($filaParaGuardar['lugar_expedicion']);

    $reciboId = insertar('recibos', $filaParaGuardar);

    /* ⚡ SUMAR AL ANTICIPO DEL PROVEEDOR, Y ES A PROPÓSITO (2026-08-27).
       Sin esto, `proveedores.anticipo` nunca se movía al generar un
       recibo: "Falta" seguía mostrando el mismo número de siempre, así
       que el siguiente "Generar recibo" volvía a sugerir el mismo
       monto — y a simple vista parecía "el mismo recibo de antes"
       reapareciendo, aunque el formulario era uno nuevo en blanco.
       Se tapa en monto_total: un recibo no puede dejar el anticipo por
       encima de lo pactado. Solo aplica si el beneficiario es un
       proveedor — un padrino o alguien sin ficha no tiene "anticipo"
       que actualizar. */
    if ($proveedorId > 0) {
        $nuevoAnticipo = min(
            (float) $proveedor['monto_total'],
            (float) $proveedor['anticipo'] + $monto
        );
        actualizar('proveedores', $proveedorId, ['anticipo' => $nuevoAnticipo]);
    }

    bd()->commit();

    anotarEnBitacora($yo, 'generó un recibo', 'recibos', $reciboId, $recibo['numero']);

    responderBien([
        'id'         => $reciboId,
        'numero'     => $recibo['numero'],
        'archivo_id' => $archivoId,
        'nombre'     => $nombreLegible,
        'pago_id'    => $recibo['pago_id'],
    ], 201);
    break;


/* ─── EDITAR LOS DATOS (NO EL PDF) ─────────────────────────────────────
   POR QUÉ NO SE REHACE EL PDF ACÁ
   El PDF ya se entregó o se guardó como comprobante: reescribirlo por
   detrás, con la misma fecha y número, sería alterar en silencio un
   documento que ya se considera firme. Si el monto estaba mal de
   verdad, lo correcto es borrar este recibo (?accion=borrar) y generar
   uno nuevo, con su propio número — igual que en papel, donde un recibo
   mal hecho se anula y se hace otro, nunca se tacha y se reescribe. Esta
   acción solo corrige los DATOS de la fila (para que las listas y
   reportes queden bien), no el archivo ya generado. */

case 'editar':
    exigirMetodo('POST');
    if (!existeTabla('recibos')) responderMal('Falta la tabla recibos.', 409);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $existente = consultarUno('SELECT id FROM recibos WHERE id = :i', [':i' => $id]);
    if (!$existente) responderMal('Ese recibo no existe.', 404);

    $cambios = [];
    if (isset($datos['monto']))      $cambios['monto']      = campoMonto($datos, 'monto');
    if (isset($datos['concepto']))   $cambios['concepto']   = campoTexto($datos, 'concepto', 300);
    if (isset($datos['forma_pago'])) $cambios['forma_pago'] = campoTexto($datos, 'forma_pago', 60);
    if (isset($datos['fecha']))      $cambios['fecha']      = campoFecha($datos, 'fecha') ?? date('Y-m-d');

    if ($cambios) actualizar('recibos', $id, $cambios);

    anotarEnBitacora($yo, 'editó un recibo', 'recibos', $id, '');
    responderBien(['id' => $id]);
    break;


/* ─── MARCAR ESTADO (solo seguimiento propio, no toca el PDF) ────────── */

case 'marcar_estado':
    exigirMetodo('POST');
    if (!existeTabla('recibos')) responderMal('Falta la tabla recibos.', 409);

    $datos  = cuerpoJson();
    $id     = campoEntero($datos, 'id', 1);
    $estado = campoOpcion($datos, 'estado', ['pendiente', 'enviado', 'firmado'], 'pendiente');

    $existente = consultarUno('SELECT id FROM recibos WHERE id = :i', [':i' => $id]);
    if (!$existente) responderMal('Ese recibo no existe.', 404);

    actualizar('recibos', $id, ['estado' => $estado]);
    responderBien(['id' => $id, 'estado' => $estado]);
    break;


/* ─── BORRAR (LA FILA, EL ADJUNTO Y EL PDF, LOS TRES JUNTOS) ─────────── */

case 'borrar':
    exigirMetodo('POST');
    if (!existeTabla('recibos')) responderMal('Falta la tabla recibos.', 409);

    $datos = cuerpoJson();
    $id    = campoEntero($datos, 'id', 1);

    $recibo = consultarUno('SELECT * FROM recibos WHERE id = :i', [':i' => $id]);
    if (!$recibo) responderMal('Ese recibo no existe.', 404);

    /* Se borra primero el archivo físico y su fila en `archivos` —igual
       que haría un borrado manual desde "Contrato y documentos"—, y
       recién después la fila de `recibos`. Si algo del archivo falla no
       importa: mejor un adjunto huérfano que un recibo fantasma que
       siga contando en los totales sin tener PDF que lo respalde. */
    if (!empty($recibo['archivo_id'])) {
        $archivo = consultarUno('SELECT * FROM archivos WHERE id = :i',
                                [':i' => (int) $recibo['archivo_id']]);
        if ($archivo) {
            $ruta = dirname(__DIR__) . '/archivos/' . basename($archivo['nombre_disco']);
            if (is_file($ruta)) @unlink($ruta);
            borrar('archivos', (int) $archivo['id']);
        }
    }

    borrar('recibos', $id);

    anotarEnBitacora($yo, 'borró un recibo', 'recibos', $id, $recibo['numero']);
    responderBien(['mensaje' => 'Recibo eliminado.']);
    break;


default:
    responderMal('Acción no reconocida.', 404);
}
