<?php
/* ══════════════════════════════════════════════════════════════════════
   MENSAJES.PHP · LO QUE LE ESCRIBIERON A ANIA

   QUÉ HACE ESTE ARCHIVO
   Junta todo lo que los invitados escribieron en «¿Algo más que quieras
   decirnos?» del formulario de confirmación, con quién lo escribió y
   cuándo, para poder leerlo entero y guardarlo.

   ⚠️ POR QUÉ ESTO NO ES UNA PANTALLA MÁS DEL PANEL

   Ese campo vive en `confirmaciones.notas`, y `confirmaciones` es la
   PRIMERA tabla que vacía borrado_final.php cuando pasa la fiesta. O
   sea: lo único de todo el sistema que Ania va a querer conservar para
   siempre es exactamente lo que la herramienta de borrado destruye.

   Y no se arregla sacando la tabla de esa lista. El mensaje lleva el
   nombre de quien lo escribió, y a esa persona se le prometió, en el
   mismo formulario donde lo escribió, que sus datos se borran cuando
   pase el evento. Guardarlos en el servidor para siempre sería romper
   esa promesa.

   Por eso la descarga no es una comodidad: es el mecanismo que rescata
   los mensajes ANTES del borrado. Quedan en un archivo, con la familia
   —no en una base de datos— y las dos cosas se cumplen: se conserva el
   regalo y se borra el dato.

   borrado_final.php cuenta estos mensajes y avisa antes de vaciar.

   QUÉ SE LE PUEDE PEDIR
     GET ?accion=listar   los mensajes, con nombre y fecha
     GET ?accion=cuantos  solo el número (lo usa el aviso del borrado)
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/_lib/bd.php';
require_once __DIR__ . '/_lib/sesion.php';
require_once __DIR__ . '/_lib/responder.php';

$yo     = exigirSesion();
$accion = (string) ($_GET['accion'] ?? 'listar');

exigirMetodo(['GET']);

if (!existeTabla('confirmaciones')) responderBien(['filas' => [], 'cuantos' => 0]);

/**
 * Lo que el invitado escribió de verdad, o '' si no escribió nada.
 *
 * ⚠️ TIENE QUE HACER LO MISMO QUE loQueEscribio() EN 06-piezas.js.
 *
 * El formulario público no manda vacío cuando la caja está vacía: manda
 * la cadena «, » (ver `notas: notas || ', '` en
 * codigo/11-formulario-confirmacion.js). Es un centinela, y sin
 * filtrarlo el libro de Ania saldría lleno de comas sueltas.
 *
 * Se filtra al LEER y nunca al guardar: el dato crudo es lo que el
 * invitado mandó, y limpiarlo al entrar cerraría la puerta a darse
 * cuenta de esto más adelante.
 *
 * @param string $texto
 * @return string
 */
function loQueEscribio($texto) {
    $limpio = trim((string) $texto);
    if ($limpio === '') return '';

    // Solo comas y espacios: es el centinela, no un mensaje. Una coma
    // DENTRO de un mensaje real («Vamos, con gusto») no entra acá.
    if (preg_match('/^[,\s]+$/u', $limpio)) return '';

    return $limpio;
}

/**
 * Todos los mensajes de verdad, del más viejo al más nuevo.
 *
 * En orden de llegada a propósito: leídos así cuentan cómo se fue
 * llenando la fiesta, que es lo que hace que sea un recuerdo y no un
 * listado.
 *
 * @return array
 */
function losMensajes() {
    $columnas = columnasDe('confirmaciones');

    /* ⚠️ LA COLUMNA DE FECHA NO SE LLAMA IGUAL EN TODAS LAS BASES.
       En ésta es `fecha_hora`, pero confirmaciones.php ya se cuida de
       que pueda llamarse de otra forma si la tabla se recreó — y la
       lista de nombres es la MISMA que la de allá a propósito. Pedir
       `creado_en` a secas devolvía «columna desconocida» y tiraba abajo
       la pantalla entera. */
    $cual = '';
    foreach (['fecha_hora', 'creado_en', 'fecha', 'created_at', 'fecha_registro'] as $c) {
        if (in_array($c, $columnas, true)) { $cual = $c; break; }
    }

    $filas = consultarTodo(
        'SELECT id, nombre, notas' . ($cual ? ', `' . $cual . '` AS cuando' : '') . '
           FROM confirmaciones
          ORDER BY ' . ($cual ? '`' . $cual . '` ASC, id ASC' : 'id ASC')
    );

    $mensajes = [];
    foreach ($filas as $fila) {
        $texto = loQueEscribio($fila['notas'] ?? '');
        if ($texto === '') continue;

        $mensajes[] = [
            'id'      => (int) $fila['id'],
            'nombre'  => (string) $fila['nombre'],
            'mensaje' => $texto,
            'cuando'  => isset($fila['cuando']) ? (string) $fila['cuando'] : '',
        ];
    }

    return $mensajes;
}

switch ($accion) {

case 'listar':
    $mensajes = losMensajes();
    responderBien([
        'filas'   => $mensajes,
        'cuantos' => count($mensajes),
    ]);
    break;

/* Solo el número. Lo pide el aviso de borrado_final.php, que no necesita
   los textos para decir «hay 23 mensajes, descargalos antes». */
case 'cuantos':
    responderBien(['cuantos' => count(losMensajes())]);
    break;

default:
    responderMal('No sé hacer eso.', 400);
}
