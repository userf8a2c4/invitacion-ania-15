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

    return $pdo;
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
        responderMal('Falló una consulta a la base de datos.', 500, $e->getMessage());
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
        responderMal('Falló una consulta a la base de datos.', 500, $e->getMessage());
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
        responderMal('No se pudo guardar el cambio.', 500, $e->getMessage());
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
