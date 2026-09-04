<?php
/* ══════════════════════════════════════════════════════════════════════
   IMPORTAR.PHP · TRAER LOS DATOS DE LA PLANILLA

   QUÉ HACE ESTE ARCHIVO
   Recibe filas de una planilla —copiadas de Google Sheets o de Excel— y
   las convierte en invitados, grupos, mesas y cotizaciones.

   POR QUÉ RECIBE FILAS Y NO UN ARCHIVO .XLSX
   Leer Excel en PHP sin librerías externas es posible pero frágil: es un
   ZIP con XML adentro, con formatos, fórmulas y celdas compartidas, y
   cualquier variante rompe el lector. Copiar y pegar el rango es más
   rápido para quien lo usa, funciona igual desde Sheets y desde Excel, y
   no puede fallar por un formato raro.

   QUÉ SE LE PUEDE PEDIR
     POST ?accion=analizar   mira las filas y adivina qué es cada columna
     POST ?accion=invitados  importa la hoja de invitados
     POST ?accion=cotizaciones importa una comparativa de salones

   NADA SE IMPORTA SIN VISTA PREVIA. 'analizar' no escribe una sola fila:
   devuelve lo que entendió para que la persona lo confirme. Importar 110
   invitados mal interpretados y tener que borrarlos uno por uno sería
   peor que no tener importador.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirAdministrador();
$accion = (string) ($_GET['accion'] ?? 'analizar');


/**
 * Cómo se llama cada columna en las planillas que vamos a recibir.
 *
 * Cada campo tiene una lista de nombres posibles. Se comparan sin
 * acentos ni mayúsculas, y alcanza con que el encabezado CONTENGA una de
 * las palabras: así "NOMBRE COMPLETO" y "Nombre del invitado" caen las
 * dos en 'nombre'.
 *
 * Está armado sobre la planilla real de Ania ("Cotizacion salones
 * final_corregida.xlsx", hoja "Lista de Invitados"), pero acepta
 * variantes para que sirva con cualquier otra.
 */
const COLUMNAS_CONOCIDAS = [
    'nombre'    => ['nombre completo', 'nombre', 'invitado', 'apellido'],
    'contacto'  => ['datos de contacto', 'contacto', 'telefono', 'teléfono',
                    'celular', 'email', 'correo', 'mail'],
    'grupo'     => ['relacion con', 'relación con', 'relacion', 'parentesco',
                    'familia', 'grupo', 'de parte de'],
    'mesa'      => ['mesa asignada', 'mesa'],
    'rsvp'      => ['rsvp', 'confirmacion', 'confirmación', 'asiste',
                    'asistencia', 'estado'],
    'menu'      => ['menu', 'menú', 'restriccion', 'restricción', 'alergia',
                    'alimenticia', 'dieta'],
    'adultos'   => ['adultos', 'adulto', 'mayores'],
    'ninos'     => ['ninos', 'niños', 'nino', 'niño', 'menores', 'infantiles'],
    'notas'     => ['notas', 'nota', 'observaciones', 'comentarios'],

    /* ⚡ INTEGRANTES (2026-09-04) · quiénes son, uno por uno.
       Una fila de esta planilla es una FAMILIA, no una persona: trae el
       contacto y cuántos van. Los nombres de cada integrante viven en
       otra tabla (`acompanantes`) y, sin esta columna, al importar se
       rellenaban con "Adulto 2", "Niño 1"…

       Eso está bien cuando de verdad no se saben, pero PERDÍA EL TRABAJO
       YA HECHO al mudar una lista de un entorno a otro: los nombres que
       alguien había cargado a mano desaparecían.

       FORMATO: nombres separados por `;`, cada uno con su tipo adelante:

           adulto:Ana Pérez; adulto:Luis Pérez; nino:Sofía Pérez

       El tipo va adelante y no se deduce del orden a propósito. Si se
       dedujera, una familia con el niño cargado y los adultos no
       convertiría a ese niño en adulto — y con él, su menú y su lugar en
       la mesa. Sin prefijo se asume adulto, que es el caso más común.

       Es la columna que escribe exportarParaMudanza() en
       admin/codigo/13-exportar.js. Se puede editar a mano sin problema. */
    'integrantes' => ['integrantes', 'integrante', 'miembros', 'personas'],
];


switch ($accion) {

/* ─── ANALIZAR ────────────────────────────────────────────────────────── */

case 'analizar':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $filas = $datos['filas'] ?? [];
    if (!is_array($filas) || count($filas) < 2) {
        responderMal('Hacen falta al menos el encabezado y una fila de datos.', 400);
    }

    /* ─── Encontrar el encabezado ────────────────────────────────────
       Las planillas de verdad no empiezan en la primera fila: arriba
       suele haber un título, totales, celdas combinadas. Se busca la
       primera fila que parezca un encabezado, o sea la que más nombres
       de columna conocidos tenga. */
    $mejorFila = 0;
    $mejorPuntaje = 0;

    foreach ($filas as $i => $fila) {
        if ($i > 12) break;   // el encabezado no va a estar más abajo

        $puntaje = 0;
        foreach ((array) $fila as $celda) {
            if (queColumnaEs($celda)) $puntaje++;
        }
        if ($puntaje > $mejorPuntaje) {
            $mejorPuntaje = $puntaje;
            $mejorFila = $i;
        }
    }

    if ($mejorPuntaje < 2) {
        responderMal(
            'No reconocí los encabezados. Asegúrate de copiar también la ' .
            'fila con los títulos de las columnas.',
            422
        );
    }

    // Qué columna es cada una.
    $mapa = [];
    foreach ((array) $filas[$mejorFila] as $indice => $celda) {
        $campo = queColumnaEs($celda);
        // La primera que coincida se queda con el campo: si hay dos
        // columnas "notas", se usa la de más a la izquierda.
        if ($campo && !isset($mapa[$campo])) $mapa[$campo] = $indice;
    }

    if (!isset($mapa['nombre'])) {
        responderMal('No encontré la columna del nombre. Sin eso no puedo importar.', 422);
    }

    /* ─── Interpretar las filas de datos ─────────────────────────────── */
    $leidas = [];
    $descartadas = 0;

    foreach (array_slice($filas, $mejorFila + 1) as $fila) {
        $fila = (array) $fila;
        $nombre = trim((string) ($fila[$mapa['nombre']] ?? ''));

        // Filas vacías, de totales o de relleno.
        if ($nombre === '' || mb_strlen($nombre) < 2) { $descartadas++; continue; }
        if (preg_match('/^(total|suma|=|#)/i', $nombre)) { $descartadas++; continue; }

        $adultos = numeroDeCelda($fila[$mapa['adultos']] ?? '');
        $ninos   = numeroDeCelda($fila[$mapa['ninos']] ?? '');

        $leidas[] = [
            'nombre'   => mb_substr($nombre, 0, 200),
            'contacto' => trim((string) ($fila[$mapa['contacto']] ?? '')),
            'grupo'    => trim((string) ($fila[$mapa['grupo']] ?? '')),
            'mesa'     => trim((string) ($fila[$mapa['mesa']] ?? '')),
            'menu'     => trim((string) ($fila[$mapa['menu']] ?? '')),
            'notas'    => trim((string) ($fila[$mapa['notas']] ?? '')),
            'integrantes' => trim((string) ($fila[$mapa['integrantes']] ?? '')),
            // Si no dice cuántos adultos, se asume uno: una fila con
            // nombre es al menos una persona.
            'adultos'  => $adultos > 0 ? $adultos : (($ninos > 0) ? 0 : 1),
            'ninos'    => $ninos,
            'asiste'   => interpretarRsvp($fila[$mapa['rsvp']] ?? ''),
            // Crudo, sin interpretar -hace falta más abajo (accion=invitados)
            // para distinguir "dijo que no" de "no dijo nada": son dos casos
            // muy distintos para una lista precargada (ver esRsvpExplicitoNo()).
            'rsvp_crudo' => trim((string) ($fila[$mapa['rsvp']] ?? '')),
        ];
    }

    if (!$leidas) responderMal('No encontré ninguna fila con datos.', 422);

    // Los grupos que aparecen, para poder crearlos.
    $grupos = [];
    foreach ($leidas as $fila) {
        if ($fila['grupo'] === '') continue;
        if (!isset($grupos[$fila['grupo']])) $grupos[$fila['grupo']] = 0;
        $grupos[$fila['grupo']]++;
    }
    arsort($grupos);

    // Las mesas que menciona.
    $mesas = [];
    foreach ($leidas as $fila) {
        if ($fila['mesa'] === '') continue;
        $mesas[$fila['mesa']] = true;
    }

    // Quiénes ya están en la base, para no duplicarlos.
    $repetidos = [];
    if (existeTabla('confirmaciones')) {
        foreach ($leidas as $fila) {
            $yaEsta = consultarUno(
                'SELECT id FROM confirmaciones WHERE nombre = :n LIMIT 1',
                [':n' => $fila['nombre']]
            );
            if ($yaEsta) $repetidos[] = $fila['nombre'];
        }
    }

    $totalGente = 0;
    foreach ($leidas as $fila) $totalGente += $fila['adultos'] + $fila['ninos'];

    responderBien([
        'columnas'    => $mapa,
        'fila_titulos'=> $mejorFila,
        'filas'       => $leidas,
        'descartadas' => $descartadas,
        'grupos'      => $grupos,
        'mesas'       => array_keys($mesas),
        'repetidos'   => $repetidos,
        'resumen'     => [
            'filas'   => count($leidas),
            'personas'=> $totalGente,
            'grupos'  => count($grupos),
            'mesas'   => count($mesas),
        ],
    ]);
    break;


/* ─── IMPORTAR INVITADOS ──────────────────────────────────────────────── */

case 'invitados':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $filas = $datos['filas'] ?? [];
    if (!is_array($filas) || !$filas) responderMal('No mandaste filas.', 400);

    $crearGrupos = !empty($datos['crear_grupos']);
    $crearMesas  = !empty($datos['crear_mesas']);
    $saltearRepetidos = !isset($datos['saltear_repetidos'])
                     || !empty($datos['saltear_repetidos']);

    $columnas = existeTabla('confirmaciones') ? columnasDe('confirmaciones') : [];
    if (!in_array('nombre', $columnas, true)) {
        responderMal('La lista de invitados del panel no tiene dónde guardar el nombre, así que no puedo importar.', 500);
    }

    $tieneFecha = in_array('fecha_hora', $columnas, true);

    /* ─── Los grupos, primero ────────────────────────────────────────
       Hacen falta antes que los invitados porque cada invitado guarda
       el id de su grupo. */
    $idsDeGrupo = [];
    if ($crearGrupos && existeTabla('grupos_invitados')) {
        $orden = 10;
        foreach ($filas as $fila) {
            $nombreGrupo = trim((string) ($fila['grupo'] ?? ''));
            if ($nombreGrupo === '' || isset($idsDeGrupo[$nombreGrupo])) continue;

            $existe = consultarUno('SELECT id FROM grupos_invitados WHERE nombre = :n',
                                   [':n' => $nombreGrupo]);
            $idsDeGrupo[$nombreGrupo] = $existe
                ? (int) $existe['id']
                : insertar('grupos_invitados', [
                    'nombre' => mb_substr($nombreGrupo, 0, 80),
                    'orden'  => $orden,
                  ]);
            $orden += 10;
        }
    }

    /* ─── Las mesas ──────────────────────────────────────────────────── */
    $idsDeMesa = [];
    if ($crearMesas && existeTabla('mesas')) {
        foreach ($filas as $fila) {
            $nombreMesa = normalizarNombreDeMesa($fila['mesa'] ?? '');
            if ($nombreMesa === '' || isset($idsDeMesa[$nombreMesa])) continue;

            $existe = consultarUno('SELECT id FROM mesas WHERE nombre = :n',
                                   [':n' => $nombreMesa]);
            $idsDeMesa[$nombreMesa] = $existe
                ? (int) $existe['id']
                : insertar('mesas', [
                    'nombre'    => $nombreMesa,
                    // 10 es lo que dice el mapa del salón de la planilla.
                    'capacidad' => 10,
                  ]);
        }
    }

    /* ─── Los invitados ──────────────────────────────────────────────── */
    $creados = 0;
    $salteados = 0;
    $sentados = 0;

    foreach ($filas as $fila) {
        $nombre = trim((string) ($fila['nombre'] ?? ''));
        if ($nombre === '') continue;

        if ($saltearRepetidos) {
            $yaEsta = consultarUno(
                'SELECT id FROM confirmaciones WHERE nombre = :n LIMIT 1',
                [':n' => $nombre]
            );
            if ($yaEsta) { $salteados++; continue; }
        }

        $adultos = max(0, (int) ($fila['adultos'] ?? 0));
        $ninos   = max(0, (int) ($fila['ninos'] ?? 0));

        /* El contacto de la planilla puede ser teléfono, correo o los
           dos juntos. Solo se guarda en `correo` lo que de verdad sea un
           correo; el resto va a las notas para no perderlo. */
        $contacto = trim((string) ($fila['contacto'] ?? ''));
        $correo = '';
        if (preg_match('/[\w.+-]+@[\w-]+\.[\w.]+/', $contacto, $m)) {
            $correo = $m[0];
        }

        $notas = trim(implode(' · ', array_filter([
            trim((string) ($fila['notas'] ?? '')),
            ($contacto !== '' && $correo === '') ? 'Contacto: ' . $contacto : '',
        ])));

        /* ⚡ (2026-08-28) Con invitaciones nominales (token propio, cupo
           fijo), el supuesto de partida es "sí viene, hasta que declare lo
           contrario" -igual que crear una invitación a mano
           (invitaciones.php:141). Sin esto, importar una lista donde nadie
           contestó todavía (el caso normal: se importa ANTES de mandar los
           links) dejaba a todos con asiste=0, y el bot de mesas no podía
           proponer nada. Sin la tabla `invitaciones` (import genérico,
           formulario abierto de toda la vida), se mantiene el criterio
           conservador de siempre: en blanco = no se asume que viene. */
        $asisteFinal = existeTabla('invitaciones')
            ? !esRsvpExplicitoNo($fila['rsvp_crudo'] ?? '')
            : (!empty($fila['asiste']) ? 1 : 0);

        $valores = [
            'nombre'  => mb_substr($nombre, 0, 200),
            'correo'  => mb_substr($correo, 0, 200),
            'asiste'  => $asisteFinal ? 1 : 0,
            'adultos' => $adultos,
            'ninos'   => $ninos,
            'total'   => $adultos + $ninos,
        ];

        if (in_array('resumen_menus', $columnas, true)) {
            $valores['resumen_menus'] = mb_substr((string) ($fila['menu'] ?? ''), 0, 300);
        }
        if (in_array('alergias', $columnas, true)) {
            $valores['alergias'] = mb_substr((string) ($fila['menu'] ?? ''), 0, 500);
        }
        if (in_array('notas', $columnas, true)) {
            $valores['notas'] = mb_substr($notas, 0, 1000);
        }
        if ($tieneFecha) $valores['fecha_hora'] = date('Y-m-d H:i:s');

        $idNuevo = insertar('confirmaciones', $valores);
        $creados++;

        /* ─── Su grupo y sus sillas ──────────────────────────────────── */
        $nombreGrupo = trim((string) ($fila['grupo'] ?? ''));
        if ($nombreGrupo !== '' && isset($idsDeGrupo[$nombreGrupo])
            && existeTabla('preferencias_invitado')) {
            ejecutar(
                'REPLACE INTO preferencias_invitado
                   (confirmacion_id, grupo_id, sillas_extra, notas)
                 VALUES (:c, :g, 0, :n)',
                [
                    ':c' => $idNuevo,
                    ':g' => $idsDeGrupo[$nombreGrupo],
                    ':n' => mb_substr($nombreGrupo, 0, 300),
                ]
            );
        }

        /* ─── Su invitación (link personal + token) ───────────────────
           ⚡ (2026-08-27) El teléfono de la planilla ya se guardaba en
           `notas` como texto ("Contacto: …") porque `confirmaciones` no
           tiene dónde ponerlo — sigue guardándose ahí IGUAL que antes
           (no se le saca nada a nadie), pero ahora TAMBIÉN queda en
           `invitaciones.telefono`, de verdad usable para mandar el link
           por WhatsApp desde la pantalla Invitaciones. Mismo criterio de
           token que admin/api/invitaciones.php: generado en el
           servidor, nunca el que armaba el navegador del invitado. */
        if (existeTabla('invitaciones')) {
            do {
                $tokenImportado = bin2hex(random_bytes(8));
                $tokenRepetido = consultarUno('SELECT id FROM invitaciones WHERE token = :t',
                                              [':t' => $tokenImportado]);
            } while ($tokenRepetido);

            /* ⚡ (2026-08-28) Antes esto solo guardaba el teléfono cuando
               la celda de contacto NO traía también un correo — pero la
               lista real de invitados trae justamente eso: teléfono y
               correo juntos en la misma celda ("55 1234 5678 /
               ana@x.com"). Con la condición vieja, toda esa fila quedaba
               "Sin teléfono" — exactamente el caso que este bloque dice
               estar resolviendo. Ahora se busca el teléfono con su
               propio patrón, sacando primero el correo ya encontrado
               (si lo hay) para no confundir sus dígitos con un
               teléfono. */
            $telefonoDeLaFila = '';
            $sinCorreoEnElTexto = $correo !== '' ? str_replace($correo, ' ', $contacto) : $contacto;
            if (preg_match('/(\+?\d[\d\s\-\(\)]{7,}\d)/', $sinCorreoEnElTexto, $coincidencia)) {
                $telefonoDeLaFila = mb_substr(trim($coincidencia[1]), 0, 40);
            }
            $grupoIdDeLaFila = ($nombreGrupo !== '' && isset($idsDeGrupo[$nombreGrupo]))
                ? $idsDeGrupo[$nombreGrupo] : null;

            insertar('invitaciones', [
                'token'           => $tokenImportado,
                'nombre'          => mb_substr($nombre, 0, 150),
                'telefono'        => $telefonoDeLaFila,
                'correo'          => mb_substr($correo, 0, 190),
                'pases'           => max(1, $adultos + $ninos),
                'grupo_id'        => $grupoIdDeLaFila,
                'confirmacion_id' => $idNuevo,
                'estado'          => 'sin_enviar',
            ]);

            /* ⚡ (2026-08-28) PERSONAS-PLACEHOLDER, a pedido explícito del
               usuario. Una lista real casi nunca trae el nombre de CADA
               integrante -la de Ania solo traía el contacto de la familia
               más un conteo de adultos/niños-, y sin ningún nombre cargado
               el invitado ve el formulario genérico (cuántos van a venir +
               menú por lugar) en vez de la lista con casillas por persona.
               Para que la experiencia de "checklist" exista siempre, se
               genera un acompañante por lugar: el primer adulto usa el
               nombre real de la fila (es el único que sí se conoce);
               el resto queda como "Adulto 2", "Adulto 3"…/"Niño 1", "Niño
               2"… -editable después desde el panel (admin/api/invitaciones.php,
               reconciliarPersonasDelGrupo) apenas se sepan los nombres
               reales, sin perder el lugar ni el menú ya elegido. */
            if (existeTabla('acompanantes')) {
                /* ⚡ (2026-09-04) Si la planilla trae la columna
                   `integrantes`, esos nombres MANDAN sobre los de
                   relleno. Ver COLUMNAS_CONOCIDAS arriba para el formato.
                   Los que no vengan se siguen rellenando igual que antes:
                   nombrar es opcional y progresivo, y media lista cargada
                   no puede impedir que entre la otra media. */
                $porTipo = ['adulto' => [], 'nino' => []];

                foreach (explode(';', (string) ($fila['integrantes'] ?? '')) as $trozo) {
                    $trozo = trim($trozo);
                    if ($trozo === '') continue;

                    $tipo = 'adulto';
                    if (preg_match('/^\s*(adulto|nino|niño)\s*:\s*(.*)$/iu', $trozo, $m)) {
                        $tipo  = (mb_strtolower($m[1]) === 'adulto') ? 'adulto' : 'nino';
                        $trozo = trim($m[2]);
                    }
                    if ($trozo === '') continue;

                    $porTipo[$tipo][] = mb_substr($trozo, 0, 150);
                }

                for ($i = 1; $i <= $adultos; $i++) {
                    $suNombre = $porTipo['adulto'][$i - 1]
                        ?? ($i === 1 ? mb_substr($nombre, 0, 150) : ('Adulto ' . $i));
                    insertar('acompanantes', [
                        'confirmacion_id' => $idNuevo,
                        'nombre'          => $suNombre,
                        'tipo'            => 'adulto',
                    ]);
                }
                for ($i = 1; $i <= $ninos; $i++) {
                    $suNombre = $porTipo['nino'][$i - 1] ?? ('Niño ' . $i);
                    insertar('acompanantes', [
                        'confirmacion_id' => $idNuevo,
                        'nombre'          => $suNombre,
                        'tipo'            => 'nino',
                    ]);
                }
            }
        }

        /* ─── Su mesa ────────────────────────────────────────────────── */
        $nombreMesa = normalizarNombreDeMesa($fila['mesa'] ?? '');
        if ($nombreMesa !== '' && isset($idsDeMesa[$nombreMesa])
            && existeTabla('asignacion_mesas')) {

            insertar('asignacion_mesas', [
                'confirmacion_id' => $idNuevo,
                'mesa_id'         => $idsDeMesa[$nombreMesa],
                'lugares'         => max(1, $adultos + $ninos),
                // Viene de la planilla, o sea que lo decidió una persona:
                // el acomodo automático no debe deshacerlo.
                'fijada'          => 1,
            ]);
            $sentados++;
        }
    }

    anotarEnBitacora($yo, 'importó invitados desde una planilla', 'confirmaciones', 0,
                     $creados . ' creados, ' . $salteados . ' salteados');

    responderBien([
        'creados'   => $creados,
        'salteados' => $salteados,
        'grupos'    => count($idsDeGrupo),
        'mesas'     => count($idsDeMesa),
        'sentados'  => $sentados,
        'mensaje'   => 'Se importaron ' . $creados . ' invitados.' .
                       ($salteados ? ' Se saltearon ' . $salteados . ' repetidos.' : ''),
    ]);
    break;


/* ─── IMPORTAR COTIZACIONES ───────────────────────────────────────────── */

case 'cotizaciones':
    exigirMetodo('POST');
    $datos = cuerpoJson();

    $filas = $datos['filas'] ?? [];
    if (!is_array($filas) || !$filas) responderMal('No mandaste filas.', 400);

    $servicio = campoTexto($datos, 'servicio', 120) ?: 'Salón';
    $creadas = 0;

    foreach ($filas as $fila) {
        $proveedor = trim((string) ($fila['proveedor'] ?? ''));
        if ($proveedor === '') continue;

        /* `false`: acá NO se corta con error. Esto importa decenas de
           filas pegadas de una hoja de cálculo, y una sola con el monto
           raro tiraría abajo la importación entera —incluidas las que
           estaban bien—. La fila entra con monto 0, que se ve y se
           corrige; cortar todo, no. En los formularios de a uno sí se
           corta, que es donde hay alguien mirando para arreglarlo. */
        $monto = campoMonto($fila, 'monto', false);

        $repetida = consultarUno(
            'SELECT id FROM cotizaciones WHERE servicio = :s AND proveedor = :p',
            [':s' => $servicio, ':p' => $proveedor]
        );
        if ($repetida) continue;

        insertar('cotizaciones', [
            'servicio'    => $servicio,
            'proveedor'   => mb_substr($proveedor, 0, 150),
            'monto'       => $monto,
            'que_incluye' => mb_substr((string) ($fila['incluye'] ?? ''), 0, 2000),
            'notas'       => mb_substr((string) ($fila['notas'] ?? ''), 0, 2000),
        ]);
        $creadas++;
    }

    anotarEnBitacora($yo, 'importó cotizaciones', 'cotizaciones', 0,
                     $creadas . ' de ' . $servicio);

    responderBien([
        'creadas' => $creadas,
        'mensaje' => 'Se importaron ' . $creadas . ' cotizaciones de ' . $servicio . '.',
    ]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}


/* ─── AYUDAS ──────────────────────────────────────────────────────────── */

/**
 * Dice qué campo es un encabezado de columna, o null si no lo reconoce.
 *
 * @param mixed $texto
 * @return string|null
 */
function queColumnaEs($texto) {
    $limpio = sinAcentos(trim((string) $texto));
    if ($limpio === '') return null;

    foreach (COLUMNAS_CONOCIDAS as $campo => $posibles) {
        foreach ($posibles as $posible) {
            if (strpos($limpio, sinAcentos($posible)) !== false) return $campo;
        }
    }
    return null;
}

/**
 * Pasa un texto a minúsculas y sin acentos, para poder compararlo.
 *
 * @param string $texto
 * @return string
 */
function sinAcentos($texto) {
    $texto = mb_strtolower(trim($texto), 'UTF-8');

    $reemplazos = [
        'á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n',
        "\n" => ' ', "\r" => ' ', "\t" => ' ',
    ];
    $texto = strtr($texto, $reemplazos);

    // Varios espacios seguidos se vuelven uno: los encabezados de las
    // planillas suelen tener saltos de línea adentro de la celda.
    return trim(preg_replace('/\s+/', ' ', $texto));
}

/**
 * Saca un número de una celda que puede venir como "2", "2.0" o "2 personas".
 *
 * @param mixed $celda
 * @return int
 */
function numeroDeCelda($celda) {
    $texto = trim((string) $celda);
    if ($texto === '') return 0;

    // Se toma el primer número que aparezca.
    if (preg_match('/(\d+(?:[.,]\d+)?)/', $texto, $m)) {
        return (int) round((float) str_replace(',', '.', $m[1]));
    }
    return 0;
}

/**
 * Interpreta la columna de confirmación.
 *
 * Las planillas usan de todo: "Sí", "Confirmado", "OK", una tilde, "P"
 * de pendiente, "N" de no. Ante la duda se asume que NO confirmó
 * todavía: dar por confirmado a alguien que no lo hizo termina en sillas
 * de más y comida pagada que nadie come.
 *
 * @param mixed $celda
 * @return bool
 */
/**
 * Dice si una celda de RSVP declara explícitamente que NO viene.
 *
 * Distinto de interpretarRsvp(): esa función es conservadora (en duda,
 * asume que no confirmó) porque sirve para saber si YA CONTESTÓ. Esta
 * sirve para lo contrario -si hay un "no" de verdad escrito, nunca para
 * una celda vacía- porque una lista precargada arranca asumiendo que sí
 * vienen (ver el comentario grande donde se usa, en accion=invitados).
 *
 * @param mixed $celda
 * @return bool
 */
function esRsvpExplicitoNo($celda) {
    $texto = sinAcentos((string) $celda);
    if ($texto === '') return false;
    return (bool) preg_match('/^(n|no|no asiste|cancel|rechaz)/', $texto);
}

function interpretarRsvp($celda) {
    $texto = sinAcentos((string) $celda);
    if ($texto === '') return false;

    // Lo que claramente es un no.
    if (preg_match('/^(n|no|no asiste|cancel|rechaz)/', $texto)) return false;

    // Lo que claramente es un sí.
    if (preg_match('/^(s|si|yes|ok|confirm|asiste|v|x|1|true)/', $texto)) return true;

    return false;
}

/**
 * Normaliza el nombre de una mesa: "5" y "mesa 5" son la misma.
 *
 * @param mixed $celda
 * @return string Cadena vacía si no hay mesa.
 */
function normalizarNombreDeMesa($celda) {
    $texto = trim((string) $celda);
    if ($texto === '' || $texto === '-') return '';

    // Si es solo un número, se le pone el prefijo.
    if (preg_match('/^\d+$/', $texto)) return 'Mesa ' . (int) $texto;

    // "mesa 5", "MESA 5", "Mesa5" → "Mesa 5"
    if (preg_match('/mesa\s*(\d+)/i', $texto, $m)) return 'Mesa ' . (int) $m[1];

    return mb_substr($texto, 0, 60);
}
