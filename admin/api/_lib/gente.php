<?php
/* ══════════════════════════════════════════════════════════════════════
   _LIB/GENTE.PHP · CUÁNTOS CONFIRMARON, UNA SOLA VEZ

   ⛔ POR QUÉ EXISTE ESTE ARCHIVO (2026-09-16)

   `asiste = 1` NO SIGNIFICA «CONFIRMÓ».

   Una fila de `confirmaciones` nace con `asiste = 1` junto con la
   invitación, para que el bot de mesas pueda acomodar antes de que nadie
   conteste (migracion.sql:1124-1127). O sea que ese número es «tiene
   lugar apartado», y es el TECHO, no la realidad.

   Con eso mezclado pasaron dos cosas a la vez, el mismo día:

     · La pantalla «Hoy» decía «Número final para el banquete: 113
       personas» cuando habían contestado 34. Son 79 platos.
     · MegaBot contestaba «Cupo: 114/140» a quien le preguntaba cuántos
       venían, porque en su contexto no existe ningún número de
       confirmados — solo el de apartados.

   El criterio de verdad ya estaba escrito en tres lados con las mismas
   palabras (hoy.php, estadisticas.php, y `yaRespondio()` en
   08-vista-invitados.js:1293). Lo que faltaba era un solo lugar donde
   vivir.

   ⚠️ SI ALGUNA PANTALLA NUEVA NECESITA «CUÁNTA GENTE VIENE», ES DE ACÁ.
   Escribir otra consulta con `asiste = 1` y llamarla «confirmados» es
   exactamente el bug que este archivo vino a cerrar.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * El pedazo de SQL que distingue «contestó de verdad» de «tiene lugar
 * apartado».
 *
 * Se arma mirando las columnas que existen: `respondida_en` la agrega
 * el instalador del panel y puede no estar en una base vieja. Sin ella
 * queda el criterio por estado, que es menos preciso pero nunca miente
 * para arriba.
 *
 * @return string Condición SQL sobre el alias `i` de `invitaciones`.
 */
function condicionDeYaContesto() {
    $colsInv = existeTabla('invitaciones') ? columnasDe('invitaciones') : [];

    return in_array('respondida_en', $colsInv, true)
        ? "(i.respondida_en IS NOT NULL OR i.estado IN ('confirmada', 'declinada'))"
        : "i.estado IN ('confirmada', 'declinada')";
}

/**
 * Cuántas PERSONAS confirmaron de verdad.
 *
 * ⚠️ Cuenta personas (adultos + niños), no filas. Una familia de cinco
 * que contestó son cinco.
 *
 * @return int 0 si faltan las tablas.
 */
function cuantasPersonasConfirmaron() {
    return cuentaDeConfirmados()['personas'];
}

/**
 * Cuántos GRUPOS confirmaron de verdad.
 *
 * @return int
 */
function cuantosGruposConfirmaron() {
    return cuentaDeConfirmados()['grupos'];
}

/**
 * Personas y grupos que contestaron, en una sola consulta.
 *
 * ⚠️ SE CACHEA POR PETICIÓN. hoy.php la pide dos veces —la lista final y
 * la tarjeta de estado— y no tiene sentido pegarle dos veces a la tabla
 * más grande en la misma carga.
 *
 * @return array{personas:int, grupos:int}
 */
function cuentaDeConfirmados() {
    static $cache = null;
    if ($cache !== null) return $cache;

    $cache = ['personas' => 0, 'grupos' => 0];

    if (!existeTabla('confirmaciones') || !existeTabla('invitaciones')) {
        return $cache;
    }

    /* ⚠️ DISTINCT c.id, y no COUNT(*) a secas.
     *
     * `invitaciones.confirmacion_id` NO es UNIQUE (migracion.sql:1147
     * declara solo `KEY por_confirmacion`), al revés que
     * `asignacion_mesas`, que sí tiene su UNIQUE. Si dos invitaciones
     * apuntan a la misma confirmación —pasa cuando se regenera un link—
     * el JOIN multiplica la fila y tanto el SUM como el COUNT se inflan.
     *
     * El SUM se protege con una subconsulta sobre ids distintos: sumar
     * la misma familia dos veces daría más gente confirmada que gente
     * invitada, que es la clase de número que nadie revisa porque
     * "suena bien". */
    $contesto = condicionDeYaContesto();

    $fila = consultarUno(
        "SELECT COALESCE(SUM(t.adultos + t.ninos), 0) AS personas,
                COUNT(*) AS grupos
           FROM (
             SELECT DISTINCT c.id, c.adultos, c.ninos
               FROM confirmaciones c
               JOIN invitaciones i ON i.confirmacion_id = c.id
              WHERE c.asiste = 1 AND $contesto
           ) t"
    );

    $cache = [
        'personas' => (int) ($fila['personas'] ?? 0),
        'grupos'   => (int) ($fila['grupos'] ?? 0),
    ];

    return $cache;
}

/**
 * Cuántas personas tienen LUGAR APARTADO.
 *
 * ⚠️ Esto NO es «confirmaron». Es el techo: lo que hay que reservar en
 * el salón. El nombre lo dice a propósito, para que nadie lo use por
 * error donde va el otro.
 *
 * @return int
 */
function cuantasPersonasTienenLugar() {
    if (!existeTabla('confirmaciones')) return 0;

    return (int) (consultarUno(
        'SELECT COALESCE(SUM(adultos + ninos), 0) AS n
           FROM confirmaciones WHERE asiste = 1'
    )['n'] ?? 0);
}
