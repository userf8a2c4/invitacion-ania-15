<?php
/* ══════════════════════════════════════════════════════════════════════
   CONTACTOS.PHP · TODA LA GENTE, Y CÓMO SE CONECTA

   QUÉ HACE ESTE ARCHIVO
   Junta en una sola lista a todas las personas del evento, que hasta
   ahora vivían desparramadas en cinco tablas distintas: invitados,
   proveedores, padrinos, corte de honor y foráneos.

   POR QUÉ HACE FALTA ESTO
   Cuando suena el teléfono y dice "Hola, soy Martín", no se sabe si es
   el DJ, un padrino o un invitado. Antes había que buscarlo en tres
   pestañas distintas. Acá se busca una vez y aparece, diga lo que diga
   la tabla en la que esté guardado.

   LAS RELACIONES
   Además, la acción 'relaciones' devuelve todo lo que cuelga de una
   persona: los gastos de un proveedor, lo que cubre un padrino, la mesa
   de un invitado. Eso es lo que permite tocar un contacto y llegar a su
   dinero sin buscarlo a mano.

   QUÉ SE LE PUEDE PEDIR
     GET ?accion=todos                       la agenda completa
     GET ?accion=relaciones&tipo=X&id=N      qué cuelga de esa persona
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'todos');

/* Quien tenga el rol 'entrada' no ve dinero. Se usa más abajo para
   esconderle los montos de proveedores y padrinos. */
$vePlata = ($yo['rol'] ?? '') === 'admin';


switch ($accion) {

/* ─── TODA LA GENTE ───────────────────────────────────────────────────── */

case 'todos':
    exigirMetodo('GET');

    $contactos = [];

    /* ─── Invitados ─────────────────────────────────────────────────── */
    if (existeTabla('confirmaciones')) {
        $columnas = columnasDe('confirmaciones');
        $tieneMesa = existeTabla('asignacion_mesas') && existeTabla('mesas');

        $filas = consultarTodo(
            'SELECT c.*' .
            ($tieneMesa ? ', m.nombre AS mesa' : '') . '
             FROM confirmaciones c' .
            ($tieneMesa
                ? ' LEFT JOIN asignacion_mesas a ON a.confirmacion_id = c.id
                    LEFT JOIN mesas m ON m.id = a.mesa_id'
                : '') . '
             ORDER BY c.nombre'
        );

        foreach ($filas as $fila) {
            $gente = (int) ($fila['adultos'] ?? 0) + (int) ($fila['ninos'] ?? 0);
            $asiste = (int) ($fila['asiste'] ?? 0) === 1;

            $contactos[] = [
                'tipo'     => 'invitado',
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => '',
                'correo'   => (string) ($fila['correo'] ?? ''),
                'detalle'  => $asiste
                    ? $gente . ($gente === 1 ? ' persona' : ' personas') .
                      (!empty($fila['mesa']) ? ' · Mesa ' . $fila['mesa'] : ' · sin mesa')
                    : 'No asiste',
                'estado'   => $asiste ? 'bien' : 'tenue',
                'etiqueta' => $asiste ? 'Asiste' : 'No asiste',
                'extra'    => (string) ($fila['codigo'] ?? ''),
            ];
        }
    }

    /* ─── Proveedores ───────────────────────────────────────────────── */
    if (existeTabla('proveedores')) {
        $estados = [
            'candidato'  => ['tenue',  'Candidato'],
            'contratado' => ['info',   'Contratado'],
            'pagado'     => ['bien',   'Pagado'],
            'cancelado'  => ['alerta', 'Cancelado'],
        ];

        foreach (consultarTodo('SELECT * FROM proveedores ORDER BY nombre') as $fila) {
            $estado = $estados[$fila['estado']] ?? $estados['candidato'];

            $contactos[] = [
                'tipo'     => 'proveedor',
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => (string) $fila['telefono'],
                'correo'   => (string) $fila['correo'],
                'detalle'  => trim((string) $fila['servicio'] .
                              ($fila['contacto'] ? ' · ' . $fila['contacto'] : '')),
                'estado'   => $estado[0],
                'etiqueta' => $estado[1],
                'extra'    => $vePlata ? (float) $fila['monto_total'] : null,
            ];
        }
    }

    /* ─── Padrinos ──────────────────────────────────────────────────── */
    if (existeTabla('padrinos')) {
        $estados = [
            'hablado'    => ['tenue', 'Hablado'],
            'confirmado' => ['ojo',   'Confirmado'],
            'entregado'  => ['bien',  'Entregado'],
        ];

        foreach (consultarTodo('SELECT * FROM padrinos ORDER BY nombre') as $fila) {
            $estado = $estados[$fila['estado']] ?? $estados['hablado'];

            $contactos[] = [
                'tipo'     => 'padrino',
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => (string) $fila['telefono'],
                'correo'   => (string) $fila['correo'],
                'detalle'  => (string) ($fila['apadrina'] ?: 'Sin asignar'),
                'estado'   => $estado[0],
                'etiqueta' => $estado[1],
                'extra'    => $vePlata ? (float) $fila['monto'] : null,
            ];
        }
    }

    /* ─── Corte de honor ────────────────────────────────────────────── */
    if (existeTabla('corte_honor')) {
        $roles = [
            'chambelan'   => 'Chambelán',
            'dama'        => 'Dama',
            'pareja_vals' => 'Pareja del vals',
            'otro'        => 'Otro',
        ];
        $vestuarios = [
            'pendiente' => ['tenue', 'Sin medir'],
            'medido'    => ['ojo',   'Medido'],
            'listo'     => ['bien',  'Listo'],
        ];

        foreach (consultarTodo('SELECT * FROM corte_honor ORDER BY nombre') as $fila) {
            $vestuario = $vestuarios[$fila['vestuario']] ?? $vestuarios['pendiente'];

            $contactos[] = [
                'tipo'     => 'corte',
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => (string) $fila['telefono'],
                'correo'   => '',
                'detalle'  => ($roles[$fila['rol']] ?? 'Otro') .
                              ($fila['talla'] ? ' · talla ' . $fila['talla'] : ''),
                'estado'   => $vestuario[0],
                'etiqueta' => $vestuario[1],
                'extra'    => null,
            ];
        }
    }

    /* ─── Foráneos ──────────────────────────────────────────────────── */
    if (existeTabla('foraneos')) {
        foreach (consultarTodo('SELECT * FROM foraneos ORDER BY nombre') as $fila) {
            $contactos[] = [
                'tipo'     => 'foraneo',
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => (string) $fila['telefono'],
                'correo'   => '',
                'detalle'  => trim((string) $fila['ciudad'] .
                              ($fila['hospedaje'] ? ' · ' . $fila['hospedaje'] : '')),
                'estado'   => 'info',
                'etiqueta' => 'De fuera',
                'extra'    => (string) ($fila['llega'] ?? ''),
            ];
        }
    }

    responderBien([
        'contactos' => $contactos,
        've_plata'  => $vePlata,
    ]);
    break;


/* ─── QUÉ CUELGA DE UNA PERSONA ───────────────────────────────────────── */

case 'relaciones':
    exigirMetodo('GET');

    $tipo = (string) ($_GET['tipo'] ?? '');
    $id   = (int) ($_GET['id'] ?? 0);
    if ($id < 1) responderMal('Falta decir de quién.', 400);

    /* Cada grupo devuelto lleva 'ir_a', que le dice a la app a qué
       pestaña saltar si se toca. Es lo que hace que desde el DJ se
       llegue a su gasto sin buscarlo. */
    $grupos = [];

    switch ($tipo) {

    case 'proveedor':
        if (existeTabla('gastos')) {
            $gastos = consultarTodo(
                'SELECT id, concepto, monto_real FROM gastos
                 WHERE proveedor_id = :p ORDER BY concepto',
                [':p' => $id]
            );
            if ($gastos) {
                $grupos[] = [
                    'titulo' => 'Gastos',
                    'ir_a'   => 'dinero',
                    'seccion'=> 'gastos',
                    'filas'  => array_map(function ($g) use ($vePlata) {
                        return [
                            'id'    => (int) $g['id'],
                            'texto' => $g['concepto'],
                            'lado'  => $vePlata ? (float) $g['monto_real'] : null,
                        ];
                    }, $gastos),
                ];
            }

            /* Los pagos de este proveedor salen de sus gastos: no hay
               columna proveedor_id en la tabla de pagos. */
            if (existeTabla('pagos')) {
                $pagos = consultarTodo(
                    "SELECT p.id, p.concepto, p.monto, p.estado, p.fecha_limite,
                            g.concepto AS gasto
                     FROM pagos p
                     JOIN gastos g ON g.id = p.gasto_id
                     WHERE g.proveedor_id = :p
                     ORDER BY p.fecha_limite IS NULL, p.fecha_limite",
                    [':p' => $id]
                );
                if ($pagos) {
                    $grupos[] = [
                        'titulo' => 'Pagos',
                        'ir_a'   => 'dinero',
                        'seccion'=> 'pagos',
                        'filas'  => array_map(function ($p) use ($vePlata) {
                            return [
                                'id'    => (int) $p['id'],
                                'texto' => ($p['concepto'] ?: $p['gasto']) .
                                           ($p['estado'] === 'pagado' ? ' (pagado)' : ''),
                                'lado'  => $vePlata ? (float) $p['monto'] : null,
                            ];
                        }, $pagos),
                    ];
                }
            }
        }

        /* Las cotizaciones no se guardan con proveedor_id sino con el
           nombre escrito a mano, así que se buscan por nombre. */
        if (existeTabla('cotizaciones')) {
            $prov = consultarUno('SELECT nombre FROM proveedores WHERE id = :i', [':i' => $id]);
            if ($prov) {
                $cot = consultarTodo(
                    'SELECT id, servicio, monto, elegida FROM cotizaciones
                     WHERE proveedor = :n ORDER BY servicio',
                    [':n' => $prov['nombre']]
                );
                if ($cot) {
                    $grupos[] = [
                        'titulo' => 'Cotizaciones',
                        'ir_a'   => 'dinero',
                        'seccion'=> 'cotizaciones',
                        'filas'  => array_map(function ($c) use ($vePlata) {
                            return [
                                'id'    => (int) $c['id'],
                                'texto' => $c['servicio'] .
                                           (((int) $c['elegida']) === 1 ? ' · elegida' : ''),
                                'lado'  => $vePlata ? (float) $c['monto'] : null,
                            ];
                        }, $cot),
                    ];
                }
            }
        }
        break;

    case 'padrino':
        if (existeTabla('gastos')) {
            $gastos = consultarTodo(
                'SELECT id, concepto, monto_real FROM gastos
                 WHERE padrino_id = :p ORDER BY concepto',
                [':p' => $id]
            );
            if ($gastos) {
                $grupos[] = [
                    'titulo' => 'Gastos que cubre',
                    'ir_a'   => 'dinero',
                    'seccion'=> 'gastos',
                    'filas'  => array_map(function ($g) use ($vePlata) {
                        return [
                            'id'    => (int) $g['id'],
                            'texto' => $g['concepto'],
                            'lado'  => $vePlata ? (float) $g['monto_real'] : null,
                        ];
                    }, $gastos),
                ];
            }
        }
        break;

    case 'invitado':
        if (existeTabla('asignacion_mesas') && existeTabla('mesas')) {
            $mesa = consultarUno(
                'SELECT m.id, m.nombre, m.capacidad, a.lugares
                 FROM asignacion_mesas a JOIN mesas m ON m.id = a.mesa_id
                 WHERE a.confirmacion_id = :c',
                [':c' => $id]
            );
            if ($mesa) {
                /* Con quién comparte mesa. Es lo que uno quiere saber al
                   acomodar: si están juntos los que tienen que estarlo. */
                $companeros = consultarTodo(
                    'SELECT c.id, c.nombre FROM asignacion_mesas a
                     JOIN confirmaciones c ON c.id = a.confirmacion_id
                     WHERE a.mesa_id = :m AND a.confirmacion_id <> :c
                     ORDER BY c.nombre',
                    [':m' => $mesa['id'], ':c' => $id]
                );

                $grupos[] = [
                    'titulo' => 'Mesa ' . $mesa['nombre'],
                    'ir_a'   => 'evento',
                    'seccion'=> 'mesas',
                    'filas'  => $companeros
                        ? array_map(function ($c) {
                            return ['id' => (int) $c['id'], 'texto' => $c['nombre'], 'lado' => null];
                          }, $companeros)
                        : [['id' => 0, 'texto' => 'Es el único en esta mesa', 'lado' => null]],
                ];
            }
        }

        /* Regalos de esta persona. Se cruzan por nombre porque la tabla
           de regalos guarda quién lo mandó como texto libre. */
        if (existeTabla('regalos')) {
            $inv = consultarUno('SELECT nombre FROM confirmaciones WHERE id = :i', [':i' => $id]);
            if ($inv) {
                $regalos = consultarTodo(
                    'SELECT id, descripcion, agradecido FROM regalos
                     WHERE de_parte_de LIKE :n',
                    [':n' => '%' . $inv['nombre'] . '%']
                );
                if ($regalos) {
                    $grupos[] = [
                        'titulo' => 'Regalos',
                        'ir_a'   => 'evento',
                        'seccion'=> 'regalos',
                        'filas'  => array_map(function ($r) {
                            return [
                                'id'    => (int) $r['id'],
                                'texto' => $r['descripcion'] .
                                           (((int) $r['agradecido']) === 0 ? ' · falta agradecer' : ''),
                                'lado'  => null,
                            ];
                        }, $regalos),
                    ];
                }
            }
        }
        break;

    case 'corte':
        if (existeTabla('asistencia_ensayos') && existeTabla('ensayos')) {
            $ensayos = consultarTodo(
                'SELECT e.id, e.fecha, e.lugar, a.asistio
                 FROM ensayos e
                 LEFT JOIN asistencia_ensayos a
                        ON a.ensayo_id = e.id AND a.miembro_id = :m
                 ORDER BY e.fecha DESC',
                [':m' => $id]
            );
            if ($ensayos) {
                $grupos[] = [
                    'titulo' => 'Ensayos',
                    'ir_a'   => 'evento',
                    'seccion'=> 'ensayos',
                    'filas'  => array_map(function ($e) {
                        return [
                            'id'    => (int) $e['id'],
                            'texto' => $e['fecha'] . ($e['lugar'] ? ' · ' . $e['lugar'] : '') .
                                       (((int) $e['asistio']) === 1 ? ' · asistió' : ''),
                            'lado'  => null,
                        ];
                    }, $ensayos),
                ];
            }
        }
        break;
    }

    /* Los archivos y las notas cuelgan de cualquier tipo, así que van
       fuera del switch. */
    if (existeTabla('archivos')) {
        $archivos = consultarTodo(
            'SELECT id, nombre_real FROM archivos
             WHERE atado_a_tipo = :t AND atado_a_id = :i
             ORDER BY creado_en DESC',
            [':t' => $tipo, ':i' => $id]
        );
        if ($archivos) {
            $grupos[] = [
                'titulo' => 'Archivos',
                'ir_a'   => '',
                'filas'  => array_map(function ($a) {
                    return ['id' => (int) $a['id'], 'texto' => $a['nombre_real'],
                            'lado' => null, 'archivo' => true];
                }, $archivos),
            ];
        }
    }

    if (existeTabla('notas')) {
        $notas = consultarTodo(
            'SELECT id, titulo FROM notas
             WHERE atada_a_tipo = :t AND atada_a_id = :i
             ORDER BY editado_en DESC',
            [':t' => $tipo, ':i' => $id]
        );
        if ($notas) {
            $grupos[] = [
                'titulo' => 'Notas',
                'ir_a'   => '',
                'filas'  => array_map(function ($n) {
                    return ['id' => (int) $n['id'], 'texto' => $n['titulo'], 'lado' => null];
                }, $notas),
            ];
        }
    }

    responderBien(['grupos' => $grupos, 've_plata' => $vePlata]);
    break;


default:
    responderMal('Acción desconocida.', 404);
}
