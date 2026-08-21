<?php
/* ══════════════════════════════════════════════════════════════════════
   MI-PASE.PHP · QUE EL INVITADO SE CORRIJA SOLO

   QUÉ HACE ESTE ARCHIVO
   Con el código de su pase, un invitado puede ver su confirmación y
   corregirla: cambiar el menú, avisar de una alergia, decir que al final
   no puede ir, o que viene uno más.

   POR QUÉ VALE LA PENA
   Sin esto, cada cambio pasa por Lucila: le escriben por WhatsApp "che,
   al final somos tres", ella lo anota en algún lado y después lo carga.
   Con 110 invitados eso son decenas de mensajes que hay que no olvidar.

   ⚠️ POR QUÉ ESTE ARCHIVO ES DE LOS MÁS DELICADOS
   Es público: cualquiera puede abrirlo. Las tres defensas:

     1. HACE FALTA EL CÓDIGO EXACTO. Es un texto tipo XV-0AA9-0EP9 que
        solo recibió esa persona en su correo.
     2. NO SE PUEDE ADIVINAR A FUERZA BRUTA. Se anotan los intentos
        fallidos por IP y después de unos cuantos se frena, igual que en
        el panel.
     3. SOLO SE VE Y SE EDITA LO PROPIO. Con un código se llega a UNA
        confirmación; no hay forma de listar las demás ni de saber
        cuántas hay.

   Y no se puede cambiar el código ni ver datos de nadie más.
   ══════════════════════════════════════════════════════════════════════ */

require_once __DIR__ . '/admin/api/_lib/entorno.php';
require_once __DIR__ . '/admin/api/_lib/bd.php';
require_once __DIR__ . '/admin/api/_lib/responder.php';

cargarEntorno();

/** Cuántos códigos equivocados se aceptan antes de frenar. */
const INTENTOS_DE_CODIGO = 10;

/** Cuántos minutos dura el freno. */
const FRENO_EN_MINUTOS = 20;


/* ─── LA API DE ESTA PÁGINA ───────────────────────────────────────────── */

$accion = (string) ($_GET['accion'] ?? '');

if ($accion !== '') {

    /* ─── El freno ───────────────────────────────────────────────────── */
    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

    if (existeTabla('intentos_login')) {
        $fallidos = consultarUno(
            "SELECT COUNT(*) AS n FROM intentos_login
             WHERE ip = :ip AND correo = 'mi-pase'
               AND cuando > DATE_SUB(NOW(), INTERVAL :min MINUTE)",
            [':ip' => $ip, ':min' => FRENO_EN_MINUTOS]
        );

        if ((int) ($fallidos['n'] ?? 0) >= INTENTOS_DE_CODIGO) {
            responderMal('Demasiados intentos. Esperá un rato.', 429);
        }
    }

    $datos  = cuerpoJson(false);
    $codigo = strtoupper(trim((string) ($datos['codigo'] ?? $_GET['codigo'] ?? '')));

    if ($codigo === '' || mb_strlen($codigo) < 4) {
        responderMal('Escribí el código de tu pase.', 400);
    }

    $invitado = consultarUno(
        'SELECT * FROM confirmaciones WHERE UPPER(codigo) = :c LIMIT 1',
        [':c' => $codigo]
    );

    if (!$invitado) {
        if (existeTabla('intentos_login')) {
            insertar('intentos_login', ['ip' => $ip, 'correo' => 'mi-pase']);
        }
        responderMal('No encontramos ese código. Revisá el correo que te llegó.', 404);
    }

    /* ─── Ver ────────────────────────────────────────────────────────── */
    if ($accion === 'ver') {
        exigirMetodo(['GET', 'POST']);

        // Solo lo suyo, y solo lo que le sirve ver.
        responderBien([
            'nombre'   => $invitado['nombre'],
            'asiste'   => (int) $invitado['asiste'] === 1,
            'adultos'  => (int) $invitado['adultos'],
            'ninos'    => (int) $invitado['ninos'],
            'menus'    => (string) ($invitado['resumen_menus'] ?? ''),
            'alergias' => (string) ($invitado['alergias'] ?? ''),
            'codigo'   => $invitado['codigo'],
        ]);
    }

    /* ─── Corregir ───────────────────────────────────────────────────── */
    if ($accion === 'guardar') {
        exigirMetodo('POST');

        $adultos = campoEntero($datos, 'adultos', 0, 20);
        $ninos   = campoEntero($datos, 'ninos', 0, 20);
        $asiste  = !empty($datos['asiste']);

        /* Si dice que no va, se ponen los acompañantes en cero: dejar
           "no asisto, somos 4" haría que el banquete cuente platos de
           gente que no viene. */
        if (!$asiste) { $adultos = 0; $ninos = 0; }

        actualizar('confirmaciones', (int) $invitado['id'], [
            'asiste'        => $asiste ? 1 : 0,
            'adultos'       => $adultos,
            'ninos'         => $ninos,
            'total'         => $adultos + $ninos,
            'resumen_menus' => campoTexto($datos, 'menus', 300),
            'alergias'      => campoTexto($datos, 'alergias', 500),
        ]);

        /* Queda anotado en la bitácora del panel para que se vea que el
           cambio lo hizo el invitado y no alguien del equipo. */
        if (existeTabla('bitacora')) {
            insertar('bitacora', [
                'usuario_id'     => 0,
                'usuario_nombre' => $invitado['nombre'],
                'accion'         => 'corrigió su confirmación',
                'tabla_afectada' => 'confirmaciones',
                'fila_id'        => (int) $invitado['id'],
                'detalle'        => ($asiste ? 'Asiste' : 'Ya no asiste') .
                                    ' · ' . ($adultos + $ninos) . ' personas',
            ]);
        }

        error_log('[Ania XV] El invitado ' . $invitado['nombre'] .
                  ' corrigió su confirmación.');

        responderBien(['mensaje' => 'Listo, lo actualizamos. ¡Gracias!']);
    }

    responderMal('Acción desconocida.', 404);
}


/* ─── LA PÁGINA ───────────────────────────────────────────────────────── */

$codigoDeLaUrl = htmlspecialchars(
    (string) ($_GET['c'] ?? ''), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<!-- interactive-widget=overlays-content: mismo motivo que index.html — que
     la barra del navegador en celular superponga contenido en vez de
     redimensionar el viewport. -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content">
<title>Mi confirmación · Ania XV</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="recursos/icono.svg" type="image/svg+xml">
<style>
  /* Se escriben los estilos acá adentro y no en un archivo aparte
     porque esta página es una sola cosa, la abre gente de una vez y no
     vuelve: un archivo más sería una espera más para nada. */
  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    /* svh y no dvh: dvh sigue el alto EN VIVO del navegador, así que
       cambia de valor cada vez que la barra de Edge/Chrome en celular
       aparece o desaparece, corriendo todo el contenido de golpe. svh es
       un valor fijo (el espacio más chico posible) que no se recalcula
       nunca — mismo criterio que el resto del sitio. */
    min-height: 100dvh;
    min-height: 100svh;
    background: #1a0a00;
    color: #f5e6c8;
    font-family: Georgia, "Times New Roman", serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }
  .caja {
    width: 100%; max-width: 400px;
    background: #2a1500;
    border: 1px solid #5a3a10;
    border-radius: 10px;
    padding: 28px 22px;
  }
  h1 { margin: 0 0 4px; font-size: 24px; color: #d4a843; letter-spacing: 2px;
       text-align: center; }
  .bajada { margin: 0 0 24px; text-align: center; color: #a07830; font-size: 13px; }

  label { display: block; margin-bottom: 14px; }
  .rotulo { display: block; font-size: 12px; color: #a07830;
            text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }

  input, select, textarea {
    width: 100%; min-height: 46px; padding: 8px 12px;
    background: #120c07; border: 1px solid #5a3a10; border-radius: 8px;
    color: #f5e6c8;
    /* 16px exactos: por debajo, Safari hace zoom al tocar el campo. */
    font-size: 16px; font-family: inherit;
  }
  textarea { min-height: 76px; resize: vertical; }

  button {
    width: 100%; min-height: 48px; margin-top: 8px;
    background: #d4a843; border: 0; border-radius: 8px;
    color: #1a0d02; font-size: 15px; font-weight: bold;
    font-family: inherit; cursor: pointer;
  }
  button.secundario { background: transparent; border: 1px solid #5a3a10;
                      color: #d4c098; font-weight: normal; }
  button:disabled { opacity: .5; }

  .aviso { padding: 10px 12px; border-radius: 8px; font-size: 14px;
           margin-bottom: 16px; }
  .aviso.mal  { background: rgba(207,91,82,.14); border: 1px solid #cf5b52;
                color: #cf5b52; }
  .aviso.bien { background: rgba(95,174,106,.14); border: 1px solid #5fae6a;
                color: #5fae6a; }

  .par { display: flex; gap: 12px; }
  .par label { flex: 1; }
  .oculto { display: none; }
  .pie { margin-top: 20px; text-align: center; font-size: 12px; color: #5a3a10; }
</style>
</head>
<body>

<div class="caja">
  <h1>Ania · XV</h1>
  <p class="bajada">24 de octubre de 2026</p>

  <div id="aviso" class="aviso oculto"></div>

  <!-- Paso 1: el código -->
  <div id="paso-codigo">
    <p style="line-height:1.6;margin-top:0">
      Escribe el código que aparece en el correo de tu confirmación para
      ver o cambiar tus datos.
    </p>
    <label>
      <span class="rotulo">Código del pase</span>
      <input type="text" id="codigo" placeholder="XV-0000-0000"
             autocapitalize="characters" autocomplete="off" spellcheck="false"
             value="<?php echo $codigoDeLaUrl; ?>">
    </label>
    <button id="entrar">Ver mi confirmación</button>
  </div>

  <!-- Paso 2: los datos -->
  <form id="paso-datos" class="oculto">
    <p style="margin-top:0">Hola, <strong id="quien" style="color:#d4a843"></strong></p>

    <label>
      <span class="rotulo">¿Vas a poder venir?</span>
      <select id="asiste">
        <option value="1">Sí, ahí estaré</option>
        <option value="0">Lamentablemente no podré ir</option>
      </select>
    </label>

    <div id="cuantos">
      <div class="par">
        <label>
          <span class="rotulo">Adultos</span>
          <input type="number" id="adultos" min="0" max="20">
        </label>
        <label>
          <span class="rotulo">Niños</span>
          <input type="number" id="ninos" min="0" max="20">
        </label>
      </div>

      <label>
        <span class="rotulo">Menús</span>
        <input type="text" id="menus" placeholder="2 estándar, 1 vegetariano">
      </label>

      <label>
        <span class="rotulo">Alergias o algo que no puedas comer</span>
        <textarea id="alergias" placeholder="Si no tienes, déjalo vacío"></textarea>
      </label>
    </div>

    <button type="submit" id="guardar">Guardar los cambios</button>
    <button type="button" class="secundario" id="volver">Salir</button>
  </form>

  <p class="pie">aniaxv.com</p>
</div>

<script>
/* ══════════════════════════════════════════════════════════════════════
   El código de esta página va acá adentro por la misma razón que los
   estilos: es una página de un solo uso y un archivo más sería una
   espera más.
   ══════════════════════════════════════════════════════════════════════ */

var codigoActual = '';

function elemento(id) { return document.getElementById(id); }

function avisar(texto, esMalo) {
  var caja = elemento('aviso');
  caja.textContent = texto;
  caja.className = 'aviso ' + (esMalo ? 'mal' : 'bien');
}

function limpiarAviso() { elemento('aviso').className = 'aviso oculto'; }

/**
 * Llama a este mismo archivo.
 */
function pedir(accion, cuerpo) {
  return fetch('mi-pase.php?accion=' + accion, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  }).then(function (r) {
    return r.json().then(function (j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Algo salió mal.');
      return j.datos;
    });
  });
}

/* Mostrar u ocultar los campos de cuántos son, según si viene o no.
   Preguntarle el menú a alguien que acaba de decir que no puede ir es
   una falta de tacto que además confunde. */
elemento('asiste').addEventListener('change', function () {
  elemento('cuantos').className = this.value === '1' ? '' : 'oculto';
});

elemento('entrar').addEventListener('click', function () {
  var codigo = elemento('codigo').value.trim().toUpperCase();
  if (!codigo) { avisar('Escribe tu código.', true); return; }

  var boton = this;
  boton.disabled = true;
  boton.textContent = 'Buscando…';

  pedir('ver', { codigo: codigo }).then(function (d) {
    codigoActual = codigo;
    limpiarAviso();

    elemento('quien').textContent = d.nombre;
    elemento('asiste').value = d.asiste ? '1' : '0';
    elemento('adultos').value = d.adultos;
    elemento('ninos').value = d.ninos;
    elemento('menus').value = d.menus;
    elemento('alergias').value = d.alergias;
    elemento('cuantos').className = d.asiste ? '' : 'oculto';

    elemento('paso-codigo').className = 'oculto';
    elemento('paso-datos').className = '';

  }).catch(function (e) {
    avisar(e.message, true);
  }).then(function () {
    boton.disabled = false;
    boton.textContent = 'Ver mi confirmación';
  });
});

elemento('paso-datos').addEventListener('submit', function (evento) {
  evento.preventDefault();

  var boton = elemento('guardar');
  boton.disabled = true;
  boton.textContent = 'Guardando…';

  pedir('guardar', {
    codigo:   codigoActual,
    asiste:   elemento('asiste').value === '1',
    adultos:  Number(elemento('adultos').value) || 0,
    ninos:    Number(elemento('ninos').value) || 0,
    menus:    elemento('menus').value,
    alergias: elemento('alergias').value
  }).then(function (d) {
    avisar(d.mensaje, false);
  }).catch(function (e) {
    avisar(e.message, true);
  }).then(function () {
    boton.disabled = false;
    boton.textContent = 'Guardar los cambios';
  });
});

elemento('volver').addEventListener('click', function () {
  codigoActual = '';
  limpiarAviso();
  elemento('paso-datos').className = 'oculto';
  elemento('paso-codigo').className = '';
});

// Si el enlace del correo ya trae el código, se entra solo.
if (elemento('codigo').value.trim()) elemento('entrar').click();
</script>

</body>
</html>
