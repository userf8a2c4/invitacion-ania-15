<?php
/* ══════════════════════════════════════════════════════════════════════
   BORRADO_FINAL.PHP · CUMPLIR LO QUE SE LE PROMETIÓ AL INVITADO

   QUÉ HACE ESTE ARCHIVO
   Borra los datos personales de los invitados cuando la fiesta ya pasó.

   POR QUÉ EXISTE
   El formulario de confirmación dice, abajo de todo y con todas las
   letras:

       «Tus datos los usamos solo para organizar la fiesta: saber
        quiénes vienen, dónde sentarlos y avisarle a la cocina de
        cualquier alergia. No se comparten con nadie más, y SE BORRAN
        CUANDO PASE EL EVENTO.»

   Eso se prometió 115 veces y hasta hoy no había con qué cumplirlo. Una
   promesa de borrado sin una herramienta de borrado es peor que no
   haberla hecho: se pidieron alergias —información de salud— a cambio
   de algo que no se podía dar.

   ⚠️ ESTO NO SE CORRE SOLO, Y NO ES UNA OMISIÓN
   No hay cron acá. Un borrado automático por fecha se equivoca de dos
   maneras que no tienen vuelta atrás: si la fiesta se corre una semana,
   borra a los invitados de una fiesta que todavía no pasó; y si el
   reloj del servidor está en otra zona horaria —cosa que en este
   proyecto YA PASÓ, ver la nota de bd.php— se adelanta un día. Lo
   dispara una persona, mirando, o no se dispara.

   QUÉ SE LE PUEDE PEDIR
     GET  ?accion=vista_previa   qué se borraría, fila por fila. No toca nada.
     POST ?accion=borrar         {contrasena, confirmacion, sin_llegadas?}

   ══════════════════════════════════════════════════════════════════════
   LO QUE ESTE ARCHIVO NO PUEDE BORRAR, Y HAY QUE DECIRLO

   El respaldo semanal (cron_respaldo.php) MANDA LA BASE POR CORREO a
   las administradoras, y los invitados van adentro: `confirmaciones`,
   `acompanantes` e `invitaciones` no están en su lista de exclusiones.

   O sea que después de correr esto, los datos siguen existiendo dentro
   de esos correos, y ahí no llega ningún código: hay que borrarlos a
   mano de la bandeja de entrada. La vista previa lo dice en la
   respuesta, porque una herramienta que informa «listo, borrado» cuando
   quedan copias en un buzón está mintiendo con buenas intenciones.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';
require_once __DIR__ . '/_lib/reconfirmar.php';

$yo = exigirAdministrador();

/* Además de administrador: el permiso de borrar. Es el mismo que ya
   cuida las bajas normales del panel, y no hay motivo para que esto
   —que es la baja más grande de todas— pida menos. */
if (!tieneEspecial($yo, 'borrar')) {
    responderMal('No tienes permiso para borrar datos.', 403);
}

$accion = (string) ($_GET['accion'] ?? 'vista_previa');

/** Lo que hay que escribir, tal cual, para que esto se ejecute. */
const FRASE_DE_CONFIRMACION = 'BORRAR LOS DATOS DE LOS INVITADOS';

/* ══════════════════════════════════════════════════════════════════════
   QUÉ SE BORRA, Y POR QUÉ CADA COSA

   La promesa es sobre lo que dio el invitado: quién viene, cómo
   contactarlo, qué no puede comer y dónde se sienta. Esta lista sale de
   ahí y no de «vaciemos todo»:

     · Se borra lo que IDENTIFICA a una persona o la ata a una silla.
     · NO se toca lo que es del evento y no de nadie: las mesas en sí,
       el presupuesto, los proveedores, los contratos, las fotos.

   El orden importa: primero lo que apunta a otra cosa y después lo
   apuntado, para no dejar filas huérfanas si algo se corta a la mitad.
   ══════════════════════════════════════════════════════════════════════ */

$LO_QUE_SE_BORRA = [
    // Quién entró por la puerta y a qué hora.
    'llegadas'                  => 'quién llegó y cuándo',

    // Las etiquetas de acomodo puestas a personas concretas.
    'etiquetas_asignadas'       => 'etiquetas puestas a cada invitado',

    // Dónde se sentó cada quien. Las mesas se quedan; quién ocupaba
    // cada silla, no.
    'asignacion_mesas_persona'  => 'quién se sentó en qué silla',
    'asignacion_mesas'          => 'reparto de invitados por mesa',
    'acomodo_respaldo'          => 'historial de deshacer del acomodo',

    // Reglas y preferencias, que hablan de personas por su nombre.
    'preferencias_invitado'     => 'preferencias de acomodo',
    'incompatibilidades'        => 'quién no puede sentarse con quién',
    'acompanante_reglas'        => 'reglas de acompañantes',
    'grupos_invitados'          => 'grupos de invitados',

    // Los datos que escribió el invitado, que son el corazón de la
    // promesa: nombre, correo, teléfono, alergias y notas.
    'acompanantes'              => 'acompañantes con nombre',
    'confirmaciones'            => 'confirmaciones (nombre, correo, teléfono, ALERGIAS)',
    'invitaciones'              => 'invitaciones (titular, teléfono, correo)',
];

/* ─── Contar sin tocar ────────────────────────────────────────────────── */

/**
 * Cuántas filas tiene una tabla, o null si la tabla no está.
 *
 * @param string $tabla
 * @return int|null
 */
function cuantasFilas($tabla) {
    if (!existeTabla($tabla)) return null;
    $fila = consultarUno('SELECT COUNT(*) AS n FROM `' . $tabla . '`');
    return $fila ? (int) $fila['n'] : 0;
}

/**
 * El detalle de lo que se borraría, tabla por tabla.
 *
 * @return array
 */
function inventarioDelBorrado() {
    global $LO_QUE_SE_BORRA;

    $detalle = [];
    $total   = 0;

    foreach ($LO_QUE_SE_BORRA as $tabla => $queEs) {
        $cuantas = cuantasFilas($tabla);
        $detalle[] = [
            'tabla'  => $tabla,
            'que_es' => $queEs,
            'filas'  => $cuantas,          // null = la tabla no existe acá
        ];
        if ($cuantas !== null) $total += $cuantas;
    }

    return ['tablas' => $detalle, 'filas_en_total' => $total];
}

/**
 * Los avisos que hay que leer ANTES de apretar, no después.
 *
 * @return array
 */
function loQueHayQueSaber() {
    $avisos = [];

    /* El respaldo semanal manda la base por correo, y los invitados van
       adentro. Callarlo sería dar por cumplida una promesa que no se
       cumplió. */
    $avisos[] = 'El respaldo semanal se manda POR CORREO y lleva a los '
              . 'invitados adentro. Después de borrar acá, esos correos '
              . 'siguen teniendo los datos: hay que borrarlos a mano de la '
              . 'bandeja de entrada, o la promesa no está cumplida.';

    /* ⚠️ LO QUE LE ESCRIBIERON A ANIA SE VA CON ESTO.
     *
     * El campo «¿Algo más que quieras decirnos?» vive en
     * `confirmaciones.notas`, y esta herramienta vacía `confirmaciones`.
     * O sea que lo único de todo el sistema que la familia va a querer
     * conservar para siempre es exactamente lo que se está por
     * destruir, y no hay forma de recuperarlo después.
     *
     * No se puede impedir el borrado por esto —la promesa de borrar
     * también es real, y esos mensajes llevan el nombre de quien los
     * escribió— pero sí se puede no dejar que pase sin avisar. */
    $mensajes = cuantosMensajesParaAnia();
    if ($mensajes > 0) {
        $avisos[] = 'Hay ' . $mensajes . ' mensaje' . ($mensajes === 1 ? '' : 's')
                  . ' que los invitados le escribieron a Ania al confirmar, y '
                  . 'esto los borra. Andá a Ajustes → «Mensajes para Ania» y '
                  . 'guardá la página ANTES: después no hay de dónde sacarlos.';
    }

    /* Nadie llegó = probablemente la fiesta no pasó. No se prohíbe
       —puede que el escáner no se haya usado— pero se dice y se pide un
       permiso aparte. */
    $llegadas = cuantasFilas('llegadas');
    if ($llegadas === 0) {
        $avisos[] = 'No hay NI UNA llegada registrada. O la fiesta todavía no '
                  . 'pasó, o no se usó el escáner en la puerta. Si igual '
                  . 'querés borrar, mandá "sin_llegadas": true.';
    }

    return $avisos;
}

/**
 * Cuántos invitados escribieron algo de verdad.
 *
 * ⚠️ EL VACÍO NO ES VACÍO. El formulario público manda la cadena «, »
 * cuando la caja se deja sin llenar (ver `notas: notas || ', '` en
 * codigo/11-formulario-confirmacion.js), así que contar filas con
 * `notas <> ''` daría el total de confirmaciones y no el de mensajes.
 * Mismo criterio que loQueEscribio() en api/mensajes.php y en
 * codigo/06-piezas.js.
 *
 * @return int
 */
function cuantosMensajesParaAnia() {
    if (!existeTabla('confirmaciones')) return 0;

    /* Se filtra en PHP y no con SQL a propósito.
     *
     * La condición en SQL era posible, pero no daba EXACTAMENTE lo mismo
     * que api/mensajes.php: el TRIM de MySQL no se lleva los saltos de
     * línea, así que una nota con solo un enter contaba acá y no allá.
     * Que el aviso dijera «23 mensajes» y la pantalla mostrara 22 es
     * peor que no avisar — deja a alguien buscando el que falta.
     *
     * Son ciento y pico de filas de una columna: leerlas cuesta nada, y
     * así las dos cuentas salen del mismo criterio. */
    $filas = consultarTodo('SELECT notas FROM confirmaciones');

    $cuantos = 0;
    foreach ($filas as $fila) {
        $limpio = trim((string) ($fila['notas'] ?? ''));
        if ($limpio === '' || preg_match('/^[,\s]+$/u', $limpio)) continue;
        $cuantos++;
    }

    return $cuantos;
}

/* ─── VISTA PREVIA ────────────────────────────────────────────────────── */

if ($accion === 'vista_previa') {
    exigirMetodo(['GET']);

    $inventario = inventarioDelBorrado();

    responderBien([
        'tablas'          => $inventario['tablas'],
        'filas_en_total'  => $inventario['filas_en_total'],
        'avisos'          => loQueHayQueSaber(),
        'frase'           => FRASE_DE_CONFIRMACION,
        'no_se_toca'      => 'Las mesas, el presupuesto, los proveedores, los '
                           . 'contratos, las tareas y los archivos quedan como '
                           . 'están: son del evento, no de una persona.',
    ]);
}

/* ─── BORRAR ──────────────────────────────────────────────────────────── */

if ($accion === 'borrar') {
    exigirMetodo(['POST']);

    $datos = cuerpoJson();

    /* Tres cerrojos, y cada uno tapa un accidente distinto:
         1. la contraseña, contra el panel abierto en un teléfono ajeno;
         2. la frase escrita a mano, contra el clic de más;
         3. el permiso de "sin llegadas", contra correrlo antes de la
            fiesta.
       Ninguno de los tres protege de alguien decidido, y no es lo que
       buscan: buscan que esto no pase sin querer. */

    $frase = trim((string) ($datos['confirmacion'] ?? ''));
    if ($frase !== FRASE_DE_CONFIRMACION) {
        responderMal('Para hacer esto hay que escribir, tal cual: '
                   . FRASE_DE_CONFIRMACION, 400);
    }

    $llegadas = cuantasFilas('llegadas');
    if ($llegadas === 0 && empty($datos['sin_llegadas'])) {
        responderMal('No hay ninguna llegada registrada, así que puede ser que '
                   . 'la fiesta no haya pasado todavía. Si estás seguro, '
                   . 'volvé a mandarlo con "sin_llegadas": true.', 409);
    }

    exigirContrasenaDeNuevo($yo, $datos);

    /* Se cuenta ANTES de borrar: después ya no hay qué contar, y el
       número es lo único que va a quedar de todo esto. */
    $inventario = inventarioDelBorrado();

    $borradas = [];
    $fallaron = [];

    foreach ($LO_QUE_SE_BORRA as $tabla => $queEs) {
        if (!existeTabla($tabla)) continue;
        try {
            ejecutar('DELETE FROM `' . $tabla . '`');
            $borradas[] = $tabla;
        } catch (PDOException $e) {
            /* No se corta al primer fallo: se sigue con las demás y se
               informan todas juntas. Cortar a la mitad dejaría media
               base borrada y la otra media no, que es el peor de los
               dos estados posibles. */
            $fallaron[] = $tabla;
            error_log('[Ania XV · borrado] No se pudo vaciar ' . $tabla . ': '
                    . $e->getMessage());
        }
    }

    /* Queda anotado QUE se borró y CUÁNTO, nunca QUÉ. Una bitácora que
       guardara los nombres para poder decir a quién se borró sería
       exactamente lo contrario de lo que se acaba de hacer. */
    anotarEnBitacora($yo, 'borró los datos de los invitados', 'confirmaciones', 0,
        $inventario['filas_en_total'] . ' filas, en ' . count($borradas) . ' tablas');

    responderBien([
        'borradas'        => $borradas,
        'fallaron'        => $fallaron,
        'filas_borradas'  => $inventario['filas_en_total'],
        'listo'           => empty($fallaron),
        'todavia_falta'   => 'Borrá también los correos del respaldo semanal: '
                           . 'llevan la base adentro, con los invitados.',
    ]);
}

responderMal('No sé hacer eso.', 400);
