<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/BD.PHP · CONEXIÓN A MYSQL Y AYUDAS DE CONSULTA

   QUÉ HACE ESTE ARCHIVO
   Abre UNA sola conexión a la base de datos y la presta a todo el panel.
   Además trae atajos para las cuatro operaciones de siempre: traer varias
   filas, traer una, insertar y actualizar.

   POR QUÉ UNA SOLA CONEXIÓN
   Cada conexión a MySQL cuesta tiempo y el hosting compartido tiene un
   límite de conexiones simultáneas. Como cada petición HTTP a PHP es un
   proceso nuevo que muere al terminar, alcanza con reusarla dentro de la
   misma petición: eso es lo que hace la variable static de abajo.

   POR QUÉ TODO VA CON SENTENCIAS PREPARADAS
   Es la única defensa real contra la inyección SQL. Si se pega el valor
   directo en el texto de la consulta, un invitado que se llame
   "'; DROP TABLE gastos; --" borra la tabla. Con parámetros, ese texto
   se guarda como un nombre raro y nada más. confirmar.php ya lo hace así
   y acá se mantiene sin excepciones.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/entorno.php';
require_once __DIR__ . '/responder.php';

/**
 * Devuelve la conexión PDO, abriéndola la primera vez que se pide.
 *
 * @return PDO
 */
function bd() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host   = env('DB_HOST', 'localhost');
    $nombre = env('DB_NAME', '');
    $user   = env('DB_USER', '');
    $pass   = env('DB_PASSWORD', '');

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$nombre;charset=utf8mb4",
            $user,
            $pass,
            [
                // Que los errores lancen excepción en vez de fallar en silencio.
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,

                // Que las filas lleguen como arreglo por nombre de columna.
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

                // Preparadas de verdad, en el servidor MySQL. Sin esto PHP
                // simula el reemplazo y se pierde parte de la protección.
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    } catch (PDOException $e) {
        responderMal('No se pudo conectar con la base de datos.', 500, $e->getMessage());
    }

    /* ⚡ MYSQL Y PHP TIENEN QUE ESTAR EN LA MISMA HORA (2026-09-06)
     *
     * EL PROBLEMA, CON EL CASO QUE LO DESTAPÓ
     * En la primera compra de prueba quedó esto en la fila:
     *     creado_en  18:15:17     ← lo escribió MySQL (CURRENT_TIMESTAMP)
     *     cobrado_en 12:16:44     ← lo escribió PHP (date())
     * Seis horas de diferencia en el mismo pedido, cobrado un minuto
     * después de crearse. El servidor MySQL corre en UTC y PHP en
     * America/Mexico_City (entorno.php), y las dos formas de escribir
     * fechas conviven en las mismas tablas: 41 columnas con DEFAULT
     * CURRENT_TIMESTAMP contra 12 lugares donde PHP escribe con date().
     *
     * LO QUE DE VERDAD ROMPÍA
     * Que una fecha se vea corrida es feo. Lo grave era comparar:
     *
     *   · ALARMAS Y RECORDATORIOS. `alarmas.cuando` guarda la hora tal
     *     como la escribió la persona ("09:00"), y cron_alarmas.php
     *     pregunta `WHERE cuando <= NOW()`. Con NOW() seis horas
     *     adelantado, una alarma puesta para las nueve de la mañana
     *     sonaba a las TRES DE LA MADRUGADA. El día del evento eso es
     *     avisarle a todo el mundo a deshora.
     *   · SESIONES. `caduca_en` lo escribe PHP y se borra con
     *     `WHERE caduca_en < NOW()`: caducaban seis horas antes.
     *
     * LA SOLUCIÓN
     * Decirle a MySQL, en cada conexión, que hable en la misma hora que
     * PHP. Se calcula el desfase desde la zona que PHP ya tiene puesta,
     * en vez de escribir '-06:00' a mano: así sigue siendo correcto si
     * algún día cambia la zona o vuelve el horario de verano.
     *
     * ⚠️ LO QUE ESTO NO ARREGLA
     * Las filas que MySQL YA escribió quedaron en UTC, y desde ahora las
     * nuevas van en hora local: los `creado_en` viejos se ven seis horas
     * adelantados respecto a los nuevos. Es histórico y no se compara
     * con nada, así que no rompe nada — pero conviene saberlo antes de
     * sacar conclusiones de una fecha anterior a esta fecha.
     *
     * Si el hosting no deja poner la zona (pasa en algunos compartidos),
     * se sigue igual que hasta ahora: es preferible una app que anda con
     * las horas corridas a una que no conecta. */
    try {
        $desfase = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))
            ->format('P');                       // "-06:00"

        /* Preparada y no interpolada. El valor sale de DateTime y no de
           nadie de afuera, así que hoy no hay nada que inyectar — pero
           una consulta armada con comillas a mano es una invitación a
           que mañana alguien meta ahí una variable que sí venga de
           afuera. Cuesta lo mismo hacerlo bien. */
        $pdo->prepare('SET time_zone = ?')->execute([$desfase]);
    } catch (Throwable $e) {
        error_log('[Ania XV · bd] No se pudo alinear la zona horaria de MySQL: '
            . $e->getMessage());
    }

    return $pdo;
}

/* ─── CUANDO EL QUE LLAMA QUIERE ATRAPAR EL ERROR ─────────────────────── */

/*
   EL PROBLEMA QUE RESUELVE ESTO (2026-09-04)

   Los atajos de acá abajo atrapan el PDOException y salen por
   responderMal(), que hace exit. Es lo correcto el 99 % de las veces: un
   fallo de base no debe seguir de largo con datos a medias.

   Pero tiene una consecuencia que nadie había notado: como el proceso
   MUERE dentro del atajo, un try/catch puesto MÁS AFUERA nunca llega a
   ejecutarse. Los try/catch que rodean llamadas a la base en este
   proyecto —el que borra el PDF huérfano de un recibo, el que deshace el
   acomodo, el que atrapa el choque de dos escaneos en la puerta— estaban
   escritos, pero ninguno atrapó nada jamás. Cada vez que alguien puso
   una red de seguridad, la red no estaba.

   POR QUÉ UN INTERRUPTOR Y NO FUNCIONES NUEVAS

   La otra salida era duplicar cada atajo en una variante "OFallar" que
   lanzara en vez de salir. No alcanza: chat.php envuelve
   panoramaDeMesas(), y llegadas.php envuelve anotarEnBitacora() —
   funciones que por dentro llaman a estos atajos varios niveles más
   abajo. Habría que reescribir esas funciones también, y elegir para
   cada una de sus llamadas cuál de las dos variantes usar.

   Con el interruptor, el que quiere atrapar dice "en este pedazo, los
   errores de base me los das a mí", y vale para todo lo que ocurra
   adentro, por hondo que sea. Fuera de esos pedazos NO CAMBIA NADA: las
   438 llamadas del resto del panel siguen saliendo por responderMal()
   exactamente igual que antes.
*/

/**
 * Corre un pedazo de código con los errores de base "en modo lanzar".
 *
 * Adentro de $tarea, un fallo de la base tira PDOException en vez de
 * cortar la petición — así el try/catch de quien llama puede deshacer lo
 * que haya quedado a medias antes de contestar.
 *
 * Se cuenta con un número y no con un booleano para que anidar dos
 * intentando() no apague el de afuera al terminar el de adentro.
 *
 * @param callable $tarea
 * @return mixed Lo que devuelva $tarea.
 * @throws PDOException Si falla la base adentro de $tarea.
 *
 * @example
 *   try {
 *       $id = intentando(function () use ($fila) {
 *           return insertar('recibos', $fila);
 *       });
 *   } catch (Throwable $e) {
 *       bd()->rollBack();
 *       @unlink($rutaDelPdf);
 *       responderMal('No se pudo guardar el recibo.', 500);
 *   }
 */
function intentando(callable $tarea) {
    $GLOBALS['BD_ERRORES_SE_LANZAN'] = ($GLOBALS['BD_ERRORES_SE_LANZAN'] ?? 0) + 1;
    try {
        return $tarea();
    } finally {
        // finally y no una línea después del return: si $tarea lanza, el
        // contador tiene que bajar igual o el resto de la petición
        // quedaría en modo lanzar sin que nadie lo pidiera.
        $GLOBALS['BD_ERRORES_SE_LANZAN']--;
    }
}

/**
 * Qué hacer cuando la base falla: lanzar o cortar la petición.
 *
 * Un solo lugar, para que los tres atajos no se desincronicen.
 *
 * @param PDOException $e
 * @param string       $mensaje Texto humano si toca cortar.
 * @return void
 * @throws PDOException Si estamos dentro de intentando().
 */
function fallaDeBase(PDOException $e, $mensaje) {
    if (!empty($GLOBALS['BD_ERRORES_SE_LANZAN'])) throw $e;

    // El detalle técnico va al log del servidor (3er parámetro), nunca
    // al navegador: un "Table 'gastos' doesn't exist" le dibuja el
    // esquema a cualquiera que mire la respuesta.
    responderMal($mensaje, 500, $e->getMessage());
}

/* ─── ATAJOS DE CONSULTA ──────────────────────────────────────────────── */

/**
 * Corre una consulta y devuelve TODAS las filas.
 *
 * @param string $sql         Con marcadores :nombre, nunca valores pegados.
 * @param array  $parametros  Los valores de esos marcadores.
 * @return array[] Lista de filas (vacía si no hubo resultados).
 *
 * @example
 *   $filas = consultarTodo(
 *     'SELECT * FROM gastos WHERE categoria_id = :cat',
 *     [':cat' => 3]
 *   );
 */
function consultarTodo($sql, $parametros = []) {
    try {
        $sentencia = bd()->prepare($sql);
        $sentencia->execute($parametros);
        return $sentencia->fetchAll();
    } catch (PDOException $e) {
        fallaDeBase($e, 'Falló una consulta a la base de datos.');
    }
}

/**
 * Corre una consulta y devuelve SOLO la primera fila.
 *
 * @param string $sql
 * @param array  $parametros
 * @return array|null La fila, o null si no hubo ninguna.
 */
function consultarUno($sql, $parametros = []) {
    try {
        $sentencia = bd()->prepare($sql);
        $sentencia->execute($parametros);
        $fila = $sentencia->fetch();
        return $fila === false ? null : $fila;
    } catch (PDOException $e) {
        fallaDeBase($e, 'Falló una consulta a la base de datos.');
    }
}

/**
 * Corre una consulta que no devuelve filas (INSERT, UPDATE, DELETE).
 *
 * @param string $sql
 * @param array  $parametros
 * @return int Cuántas filas se vieron afectadas.
 */
function ejecutar($sql, $parametros = []) {
    try {
        $sentencia = bd()->prepare($sql);
        $sentencia->execute($parametros);
        return $sentencia->rowCount();
    } catch (PDOException $e) {
        // (2026-08-28) El diagnóstico temporal que exponía $e->getMessage()
        // en el mensaje visible ya cumplió su propósito (encontrar la
        // tabla `confirmaciones` faltante y cargar la lista real). El
        // detalle sigue yendo al log del servidor vía el 3er parámetro de
        // responderMal() — solo se saca del mensaje que ve el navegador.
        fallaDeBase($e, 'No se pudo guardar el cambio.');
    }
}

/**
 * Inserta una fila armando el SQL a partir de un arreglo de columnas.
 *
 * Los nombres de columna NO pueden ir como parámetro preparado (MySQL no
 * lo permite), así que se filtran a mano contra una lista blanca: solo
 * pasan letras, números y guion bajo. Con eso, una clave maliciosa en el
 * arreglo no puede convertirse en SQL.
 *
 * @param string $tabla
 * @param array  $valores Columna => valor.
 * @return int El id de la fila nueva.
 *
 * @example
 *   $id = insertar('notas', ['titulo' => 'Llamar al DJ', 'cuerpo' => '...']);
 */
function insertar($tabla, $valores) {
    $tabla    = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    $columnas = [];
    $marcas   = [];
    $params   = [];

    foreach ($valores as $columna => $valor) {
        $columna = preg_replace('/[^a-zA-Z0-9_]/', '', $columna);
        if ($columna === '') continue;

        $columnas[] = "`$columna`";
        $marcas[]   = ":$columna";
        $params[":$columna"] = $valor;
    }

    if (empty($columnas)) responderMal('No hay datos que guardar.', 400);

    $sql = "INSERT INTO `$tabla` (" . implode(',', $columnas) . ")
            VALUES (" . implode(',', $marcas) . ")";

    ejecutar($sql, $params);
    return (int) bd()->lastInsertId();
}

/**
 * Actualiza una fila por su id, con el mismo filtrado de columnas.
 *
 * @param string $tabla
 * @param int    $id
 * @param array  $valores Columna => valor.
 * @return int Cuántas filas cambiaron (0 si el id no existe).
 */
function actualizar($tabla, $id, $valores) {
    $tabla   = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    $trozos  = [];
    $params  = [':id' => (int) $id];

    foreach ($valores as $columna => $valor) {
        $columna = preg_replace('/[^a-zA-Z0-9_]/', '', $columna);
        if ($columna === '' || $columna === 'id') continue;

        $trozos[] = "`$columna` = :$columna";
        $params[":$columna"] = $valor;
    }

    if (empty($trozos)) return 0;

    $sql = "UPDATE `$tabla` SET " . implode(', ', $trozos) . " WHERE id = :id";
    return ejecutar($sql, $params);
}

/**
 * Borra una fila por id.
 *
 * @param string $tabla
 * @param int    $id
 * @return int Cuántas filas se borraron.
 */
function borrar($tabla, $id) {
    $tabla = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    return ejecutar("DELETE FROM `$tabla` WHERE id = :id", [':id' => (int) $id]);
}

/* ─── UN NÚMERO DE DOCUMENTO POR VEZ ──────────────────────────────────── */

/*
   EL PROBLEMA QUE RESUELVE ESTO (2026-09-04)

   Recibos y contratos calculan su número leyendo el último de la serie
   con `FOR UPDATE`, y el encabezado de los dos archivos declara ese
   FOR UPDATE como la garantía de que dos no se lleven el mismo número.

   Pero FOR UPDATE bloquea FILAS, y el PRIMER documento de una serie no
   tiene ninguna fila que bloquear: la consulta no devuelve nada, y qué
   se traba exactamente depende de cómo el motor haya resuelto ese plan.
   O sea que justo al estrenar la numeración —o el 1 de enero, o al
   cambiar el prefijo, que abre serie nueva— dos pestañas podían
   calcular el mismo número. El UNIQUE de la tabla lo atrapa, pero para
   quien está generando el recibo eso es "no se pudo, probá de nuevo"
   con el PDF ya armado.

   GET_LOCK no depende de que exista ninguna fila: es un turno con
   nombre, para toda la base. Se pide antes de mirar el último número y
   se suelta después del commit.
*/

/** Cuántos segundos se espera el turno antes de seguir igual. */
const SEGUNDOS_DE_ESPERA_DE_NUMERACION = 8;

/**
 * Pide el turno para numerar una serie de documentos.
 *
 * Si el turno no llega a tiempo NO corta nada: se sigue, y el UNIQUE de
 * la tabla queda como red final. Un recibo que no se puede emitir es
 * peor que un recibo que hay que reintentar.
 *
 * @param string $serie Ej. 'recibos', 'contratos'.
 * @return string El nombre del turno, para soltarlo después.
 */
function pedirTurnoDeNumeracion($serie) {
    $nombre = 'ania_xv_num_' . preg_replace('/[^a-zA-Z0-9_]/', '', $serie);

    $fila = consultarUno('SELECT GET_LOCK(:n, :s) AS turno',
                         [':n' => $nombre, ':s' => SEGUNDOS_DE_ESPERA_DE_NUMERACION]);

    if ((int) ($fila['turno'] ?? 0) !== 1) {
        error_log('[Ania XV · bd] No se consiguió el turno de numeración de ' . $serie .
                  '; se sigue igual y el UNIQUE de la tabla queda de red.');
    }

    return $nombre;
}

/**
 * Suelta el turno. Llamar DESPUÉS del commit.
 *
 * No hace falta en los caminos de error: cada petición PHP tiene su
 * propia conexión y MySQL suelta los turnos solos al cerrarla.
 *
 * @param string $nombre El que devolvió pedirTurnoDeNumeracion().
 * @return void
 */
function soltarTurnoDeNumeracion($nombre) {
    consultarUno('SELECT RELEASE_LOCK(:n) AS listo', [':n' => $nombre]);
}


/* ─── QUE NADA SE GUARDE DOS VECES ────────────────────────────────────── */

/*
   EL PROBLEMA QUE RESUELVE ESTO

   Sin señal, la app guarda los cambios en una cola del teléfono y los
   manda cuando vuelve internet. Reintentar es lo correcto, pero trae un
   peligro: si el envío llegó al servidor y lo que se perdió fue la
   RESPUESTA, la app cree que falló y lo manda otra vez. Editar dos veces
   no hace daño —el segundo pisa al primero—, pero CREAR dos veces deja
   dos gastos idénticos, y nadie se entera hasta que las cuentas no dan.

   Cada envío de la cola viaja con una clave única inventada por el
   teléfono. Acá se anota qué claves ya se atendieron junto con la
   respuesta que se dio. Si llega una repetida, se devuelve la respuesta
   guardada sin volver a tocar la base.

   Que la clave la ponga el CLIENTE y no el servidor es lo que hace que
   funcione: es la única parte del sistema que sabe que dos envíos son el
   mismo intento y no dos decisiones distintas.
*/

/** Cuántos días se recuerda una clave antes de olvidarla. */
const DIAS_QUE_SE_RECUERDA_UNA_CLAVE = 30;

/**
 * Busca si una clave ya se atendió antes.
 *
 * @param string $clave
 * @return string|null El JSON de la respuesta que se dio, o null.
 */
function respuestaYaDada($clave) {
    if ($clave === '' || !existeTabla('escrituras_hechas')) return null;

    $fila = consultarUno(
        'SELECT respuesta FROM escrituras_hechas WHERE clave = :c',
        [':c' => $clave]
    );
    return $fila ? $fila['respuesta'] : null;
}

/**
 * Anota que una clave ya se atendió, con la respuesta que se dio.
 *
 * @param string $clave
 * @param string $respuesta El JSON tal cual se devolvió.
 * @return void
 */
function guardarRespuestaDada($clave, $respuesta) {
    if ($clave === '' || !existeTabla('escrituras_hechas')) return;

    try {
        /* INSERT IGNORE y no INSERT a secas: si dos envíos iguales
           llegan casi juntos, el segundo choca con la llave única. Eso
           no es un error, es exactamente lo que tiene que pasar. */
        ejecutar(
            'INSERT IGNORE INTO escrituras_hechas (clave, respuesta)
             VALUES (:c, :r)',
            [':c' => $clave, ':r' => $respuesta]
        );

        /* Se limpian las viejas de a poco, aprovechando el viaje. Un
           cron para esto sería otra cosa más que puede fallar callada. */
        if (random_int(1, 50) === 1) {
            ejecutar(
                'DELETE FROM escrituras_hechas
                 WHERE cuando < DATE_SUB(NOW(), INTERVAL :d DAY)',
                [':d' => DIAS_QUE_SE_RECUERDA_UNA_CLAVE]
            );
        }
    } catch (Exception $e) {
        /* Que no se pueda anotar la clave no puede tumbar una operación
           que YA se hizo bien. Lo peor que pasa es que un reintento
           duplique, que es exactamente como estaba antes. */
        error_log('[Ania XV · admin] No se pudo anotar la clave: ' . $e->getMessage());
    }
}


/* ─── INSPECCIÓN DEL ESQUEMA ──────────────────────────────────────────── */

/**
 * Dice si una tabla existe en esta base de datos.
 *
 * Se usa para que el panel avise "falta correr la migración" en vez de
 * reventar con un error críptico de SQL.
 *
 * @param string $tabla
 * @return bool
 */
function existeTabla($tabla) {
    $fila = consultarUno(
        "SELECT COUNT(*) AS n FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = :t",
        [':t' => $tabla]
    );
    return $fila && (int) $fila['n'] > 0;
}

/**
 * Deja de un arreglo columna=>valor SOLO las columnas que la tabla tiene
 * hoy, y avisa al log de las que descartó.
 *
 * POR QUÉ EXISTE (2026-09-04)
 * `migracion.sql` fue creciendo por rondas y no toda instalación corrió
 * la última. Una escritura que nombra una columna que todavía no está
 * sale por responderMal() y CORTA LA PETICIÓN: el envío masivo de
 * invitaciones mandaba el primer correo, moría al anotar
 * `veces_enviado` y contestaba 500 — los correos salidos y ninguno
 * registrado, así que reintentar mandaba todo de nuevo.
 *
 * El resto del panel ya se cuida así con hay() y columnasDe(); esto es
 * lo mismo, en una línea, para las ESCRITURAS.
 *
 * NO LO USA instalar.php a propósito: ese archivo agrega columnas en
 * mitad de la petición, y el recuerdo de abajo le quedaría viejo.
 *
 * @param string $tabla
 * @param array  $valores Columna => valor.
 * @return array Los pares cuya columna existe.
 */
function soloColumnasQueExisten($tabla, $valores) {
    static $recuerdo = [];
    if (!isset($recuerdo[$tabla])) $recuerdo[$tabla] = columnasDe($tabla);

    $columnas = $recuerdo[$tabla];
    // Una tabla que no existe devuelve lista vacía; en ese caso no se
    // descarta nada, porque el problema es otro y lo tiene que ver el
    // existeTabla() de quien llama, no este filtro.
    if (empty($columnas)) return $valores;

    $quedan  = [];
    $sobran  = [];
    foreach ($valores as $columna => $valor) {
        if (in_array($columna, $columnas, true)) $quedan[$columna] = $valor;
        else                                     $sobran[] = $columna;
    }

    if ($sobran) {
        error_log('[Ania XV · bd] `' . $tabla . '` no tiene ' . implode(', ', $sobran) .
                  ' — falta correr instalar.php. Se guardó el resto.');
    }

    return $quedan;
}

/**
 * Devuelve los nombres de columna de una tabla.
 *
 * Hace falta porque el esquema real de `confirmaciones` se creó a mano y
 * no está documentado en el repositorio: el panel se adapta a lo que
 * encuentre en vez de asumir columnas que quizá no existen.
 *
 * @param string $tabla
 * @return string[]
 */
function columnasDe($tabla) {
    $filas = consultarTodo(
        "SELECT column_name FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = :t
         ORDER BY ordinal_position",
        [':t' => $tabla]
    );
    // MySQL puede devolver la columna como COLUMN_NAME o column_name según
    // la versión y la configuración, por eso se lee sin asumir el caso.
    return array_map(function ($f) {
        return $f['column_name'] ?? $f['COLUMN_NAME'] ?? '';
    }, $filas);
}
