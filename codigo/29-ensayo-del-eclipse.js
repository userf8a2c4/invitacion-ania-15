/* ══════════════════════════════════════════════════════════════════════
   29 · EL ENSAYO DEL ECLIPSE · SOLO EN PBE

   QUÉ HACE ESTE ARCHIVO
   Pinta un panel con los controles para mirar el Eclipse de Sangre
   (28-eclipse.js) cuantas veces haga falta: correrlo, cortarlo, saltar a
   una fase y verlo en cámara lenta.

   POR QUÉ EXISTE
   El eclipse ocurre UNA VEZ AL DÍA, a las 12:30 UTC — las 6:30 de la
   mañana en Toluca. Para verlo hay que estar despierto, en la pestaña
   correcta, con la pestaña al frente, sin haber tocado un campo de texto,
   y acertarle al minuto. Si algo de eso falla, no pasa nada y no se
   entera nadie.

   El resultado es que el homenaje se subió a producción sin que nadie lo
   hubiera visto entero ni una sola vez. Y cuando por fin se pudo mirar,
   apareció que llevaba desde el primer día corriendo en su versión
   reducida por una comparación mal escrita (ver la nota de `esAlta` en
   28-eclipse.js). Eso es lo que pasa cuando algo no se puede mirar.

   ⚠️ NO SE SIRVE NUNCA EN PRODUCCIÓN
   index.html lo carga dentro del mismo bloque `esPbe` que ya encierra a
   `?eclipse=ensayo`, y 28-eclipse.js solo abre `window.ECLIPSE` cuando
   detecta PBE. Un botón que tapa la invitación de rojo no tiene nada que
   hacer en aniaxv.com: del otro lado hay alguien llenando un formulario.

   CÓMO SE USA
       https://pbe.aniaxv.com/?eclipse=ensayo

   ÍNDICE
     1. Por qué no corre (el diagnóstico)
     2. El panel
     3. Los controles
     4. El reloj en vivo
   ══════════════════════════════════════════════════════════════════════ */

(function ensayoDelEclipse() {
  'use strict';

  /* La misma puerta que 28-eclipse.js. Se pregunta por el HOSTNAME y no
     por un parámetro: un parámetro lo escribe cualquiera. */
  var esPbe = /(^|\.)pbe\./.test(location.hostname) ||
              location.pathname.indexOf('/pbe/') === 0;

  if (!esPbe) return;
  if (!/[?&]eclipse=ensayo/.test(location.search)) return;

  var panel = null;
  var reloj = null;


  /* ─── 1. POR QUÉ NO CORRE ─────────────────────────────────────────

     El motivo por el que este panel existe: el ensayo fallaba EN SILENCIO.
     Las cinco guardas de sePuede() (index.html) son todas razonables, pero
     cuando una decía que no, no ocurría nada y no había forma de saber
     cuál había sido. Se probaba, no pasaba nada, y uno se quedaba mirando
     la pantalla sin saber si el eclipse estaba roto o si era uno.

     Acá cada guarda se pregunta por separado y se dice cuál falló y cómo
     se destraba. Es la diferencia entre "no anda" y "andá y apagá esto". */

  /**
   * Qué está impidiendo que el eclipse corra ahora mismo.
   *
   * @returns {Array<{que: string, como: string}>} Vacío si no hay nada.
   */
  function loQueLoImpide() {
    var trabas = [];

    if (document.documentElement.classList.contains('animaciones-off')) {
      trabas.push({
        que: 'Las animaciones están apagadas',
        como: 'Tocá el botón de animación, arriba a la derecha.'
      });
    }

    try {
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        trabas.push({
          que: 'Tu sistema pide menos movimiento',
          como: 'Está en los ajustes de accesibilidad del sistema, no en la web.'
        });
      }
    } catch (e) { /* navegador sin matchMedia: no es una traba */ }

    if (document.hidden) {
      trabas.push({
        que: 'La pestaña está en segundo plano',
        como: 'Volvé a esta pestaña antes de correrlo.'
      });
    }

    var enFoco = document.activeElement;
    if (enFoco && /^(INPUT|TEXTAREA|SELECT)$/.test(enFoco.tagName)) {
      trabas.push({
        que: 'Hay un campo de texto en foco',
        como: 'Tocá fuera del campo. En el eclipse de verdad esto protege ' +
              'a quien está llenando su confirmación.'
      });
    }

    if (!document.querySelector('.portada__nombre')) {
      trabas.push({
        que: 'La escena todavía no está montada',
        como: 'Abrí el sobre primero: el eclipse necesita el nombre de Ania ' +
              'para saber dónde está el altar.'
      });
    }

    return trabas;
  }


  /* ─── 2. EL PANEL ─────────────────────────────────────────────────── */

  /* ⚠️ EL CSS VIVE ACÁ ADENTRO, NO EN estilos/ (2026-09-10)
     Todo lo que se ponga en estilos/ lo empaqueta empaquetar.mjs DENTRO de
     index.html, y ese index.html es el mismo que se sube a producción. Las
     reglas de un panel que solo existe en PBE viajarían a aniaxv.com en
     cada visita, para no usarse jamás. Metidas acá, se cargan únicamente
     cuando el panel se carga — o sea, nunca en producción.
     Es el mismo criterio del eclipse, que tampoco tiene hoja propia. */
  function ponerLosEstilos() {
    if (document.getElementById('ensayo-estilos')) return;

    var hoja = document.createElement('style');
    hoja.id = 'ensayo-estilos';
    hoja.textContent = [
      /* Por encima de las capas del eclipse (2147483002), que si no el
         panel quedaría tapado justo cuando hace falta tocarlo. */
      '.ensayo{position:fixed;left:12px;bottom:12px;z-index:2147483010;',
      '  width:236px;max-height:calc(100vh - 24px);overflow:auto;',
      '  background:rgba(12,8,10,.94);border:1px solid #6b3f2a;border-radius:8px;',
      '  color:#e8ddd2;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;',
      '  box-shadow:0 8px 32px rgba(0,0,0,.6);}',

      '.ensayo__cabecera{display:flex;align-items:center;justify-content:space-between;',
      '  padding:8px 10px;border-bottom:1px solid #3a2419;}',
      '.ensayo__titulo{color:#c9a84c;letter-spacing:.08em;text-transform:uppercase;',
      '  font-size:10px;}',
      '.ensayo__plegar{width:26px;height:26px;border:0;border-radius:5px;',
      '  background:transparent;color:#a8968a;font-size:15px;cursor:pointer;}',
      '.ensayo__plegar:hover{background:#2a1a12;color:#e8ddd2;}',

      '.ensayo__cuerpo{padding:10px;}',
      '.ensayo__fila{display:flex;gap:6px;flex-wrap:wrap;}',

      '.ensayo__rotulo{margin:10px 0 5px;color:#8a7a6c;font-size:10px;',
      '  letter-spacing:.08em;text-transform:uppercase;}',

      '.ensayo__boton{flex:1;min-width:52px;min-height:32px;padding:0 8px;',
      '  border:1px solid #4a3020;border-radius:5px;background:#1c1210;',
      '  color:#e8ddd2;font:inherit;cursor:pointer;}',
      '.ensayo__boton:hover{background:#2a1a12;border-color:#6b3f2a;}',
      '.ensayo__boton--principal{background:#5a1520;border-color:#8a2030;}',
      '.ensayo__boton--principal:hover{background:#7a1c2a;}',
      '.ensayo__boton--activo{background:#6b3f2a;border-color:#c9a84c;color:#fff;}',

      /* Las fases en dos columnas: nueve botones en una sola fila serían
         nueve blancos de tres pixeles. */
      '.ensayo__fases{display:grid;grid-template-columns:1fr 1fr;gap:4px;}',
      '.ensayo__fase{display:flex;flex-direction:column;align-items:flex-start;',
      '  min-height:34px;padding:4px 6px;border:1px solid #3a2419;border-radius:5px;',
      '  background:#160f0d;color:#d8cabb;font:inherit;cursor:pointer;text-align:left;}',
      '.ensayo__fase:hover{background:#2a1a12;border-color:#6b3f2a;}',
      '.ensayo__fase-nombre{font-size:11px;}',
      '.ensayo__fase-seg{color:#8a7a6c;font-size:9px;}',

      '.ensayo__reloj{margin-top:10px;padding:6px 8px;border-radius:5px;',
      '  background:#160f0d;color:#8a7a6c;text-align:center;',
      '  font-variant-numeric:tabular-nums;}',
      '.ensayo__reloj--vivo{background:#2a0f14;color:#e8a0a0;}',
      '.ensayo__coste{font-size:12px;letter-spacing:.02em;}',
      '.ensayo__coste--bien{color:#8fd6a4;}',
      '.ensayo__coste--justo{color:#e8c46a;}',
      '.ensayo__coste--mal{color:#e88a95;}',
      '.ensayo__recuento{margin-top:6px;padding:5px 8px;border-radius:5px;',
      '  background:#120e14;color:#7a8a8a;text-align:center;font-size:10px;',
      '  line-height:1.35;}',

      '.ensayo__aviso{margin-bottom:10px;padding:8px;border-radius:5px;',
      '  background:#2a1a08;border:1px solid #8a6a2c;color:#e8d5a0;font-size:11px;}',
      '.ensayo__aviso strong{display:block;margin-bottom:4px;color:#c9a84c;}',
      '.ensayo__traba{display:block;margin-top:4px;}',
      '.ensayo__traba em{display:block;margin-left:8px;color:#a89a80;font-style:normal;',
      '  font-size:10px;}'
    ].join('');

    document.head.appendChild(hoja);
  }

  function pintarElPanel() {
    ponerLosEstilos();

    panel = document.createElement('div');
    panel.className = 'ensayo';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Ensayo del eclipse');

    panel.innerHTML =
      '<div class="ensayo__cabecera">' +
        '<span class="ensayo__titulo">Eclipse · ensayo</span>' +
        '<button type="button" class="ensayo__plegar" id="ensayo-plegar" ' +
                'aria-label="Plegar el panel">–</button>' +
      '</div>' +

      '<div class="ensayo__cuerpo" id="ensayo-cuerpo">' +
        '<div class="ensayo__aviso" id="ensayo-aviso" hidden></div>' +

        '<div class="ensayo__fila">' +
          '<button type="button" class="ensayo__boton ensayo__boton--principal" ' +
                  'id="ensayo-correr">Reproducir</button>' +
          '<button type="button" class="ensayo__boton" id="ensayo-cortar">Cortar</button>' +
        '</div>' +

        '<p class="ensayo__rotulo">Saltar a</p>' +
        '<div class="ensayo__fases" id="ensayo-fases"></div>' +

        '<p class="ensayo__rotulo">Velocidad</p>' +
        '<div class="ensayo__fila" id="ensayo-velocidades"></div>' +

        '<div class="ensayo__reloj" id="ensayo-reloj">Detenido</div>' +
        '<div class="ensayo__recuento" id="ensayo-recuento">—</div>' +
      '</div>';

    document.body.appendChild(panel);
  }


  /* ─── 3. LOS CONTROLES ────────────────────────────────────────────── */

  var VELOCIDADES = [0.25, 0.5, 1, 2, 4];
  var velocidadElegida = 1;

  function pintarLasFases() {
    var caja = document.getElementById('ensayo-fases');
    var fases = window.ECLIPSE.fases;

    /* Los botones se arman con las constantes REALES del eclipse, que
       viajan en window.ECLIPSE.fases. Copiar los números acá sería tener
       dos verdades: el día que alguien mueva TOTALIDAD, el botón seguiría
       llevando al segundo viejo y nadie lo notaría. */
    caja.innerHTML = fases.map(function (f) {
      return '<button type="button" class="ensayo__fase" data-en="' + f.en + '">' +
               '<span class="ensayo__fase-nombre">' + f.nombre + '</span>' +
               '<span class="ensayo__fase-seg">' + (f.en / 1000).toFixed(1) + 's</span>' +
             '</button>';
    }).join('');

    Array.prototype.forEach.call(
      caja.querySelectorAll('.ensayo__fase'),
      function (boton) {
        boton.addEventListener('click', function () {
          correr(Number(boton.dataset.en));
        });
      }
    );
  }

  function pintarLasVelocidades() {
    var caja = document.getElementById('ensayo-velocidades');

    caja.innerHTML = VELOCIDADES.map(function (v) {
      return '<button type="button" class="ensayo__boton ensayo__vel' +
             (v === 1 ? ' ensayo__boton--activo' : '') + '" data-vel="' + v + '">' +
               '×' + v +
             '</button>';
    }).join('');

    Array.prototype.forEach.call(caja.querySelectorAll('.ensayo__vel'), function (boton) {
      boton.addEventListener('click', function () {
        velocidadElegida = Number(boton.dataset.vel);

        Array.prototype.forEach.call(caja.querySelectorAll('.ensayo__vel'), function (otro) {
          otro.classList.toggle('ensayo__boton--activo', otro === boton);
        });

        /* Si está corriendo, se retoma en el mismo segundo a la velocidad
           nueva: cambiar de velocidad no tiene por qué costar volver a
           empezar. Es justamente lo que uno quiere cuando algo pasó
           demasiado rápido y lo quiere ver de nuevo, despacio. */
        if (window.ECLIPSE.enCurso()) correr(window.ECLIPSE.dondeVa());
      });
    });
  }

  /**
   * Corre la secuencia desde un milisegundo dado, avisando si no se puede.
   *
   * @param {number} desde
   * @returns {void}
   */
  function correr(desde) {
    var trabas = loQueLoImpide();
    var aviso = document.getElementById('ensayo-aviso');

    if (trabas.length) {
      aviso.hidden = false;
      aviso.innerHTML =
        '<strong>No puede correr todavía</strong>' +
        trabas.map(function (t) {
          return '<span class="ensayo__traba">· ' + t.que +
                 '<em>' + t.como + '</em></span>';
        }).join('');
      return;
    }

    aviso.hidden = true;
    window.ECLIPSE.correr(desde, velocidadElegida);
  }


  /* ─── 4. EL RELOJ EN VIVO ─────────────────────────────────────────── */

  /**
   * En qué fase cae un milisegundo dado.
   *
   * @param {number} t
   * @returns {string}
   */
  function faseDe(t) {
    var fases = window.ECLIPSE.fases;
    var nombre = fases[0].nombre;
    for (var i = 0; i < fases.length; i++) {
      if (t >= fases[i].en) nombre = fases[i].nombre;
    }
    return nombre;
  }

  /* El reloj se refresca con un setInterval de 100 ms y NO con
     requestAnimationFrame, a propósito: el eclipse ya está consumiendo
     todos los cuadros que puede, y este panel no tiene por qué competirle
     por ellos. Diez veces por segundo alcanza de sobra para leer un
     número. */
  function arrancarElReloj() {
    reloj = setInterval(function () {
      var caja = document.getElementById('ensayo-reloj');
      if (!caja) return;

      if (!window.ECLIPSE.enCurso()) {
        caja.textContent = 'Detenido';
        caja.classList.remove('ensayo__reloj--vivo');
        return;
      }

      var t = window.ECLIPSE.dondeVa();
      caja.classList.add('ensayo__reloj--vivo');
      caja.textContent = (t / 1000).toFixed(1) + 's · ' + faseDe(t) +
                         (velocidadElegida !== 1 ? '  (×' + velocidadElegida + ')' : '');

      /* ⚡ EL RECUENTO, QUE ES LO QUE SE MIRA PARA SABER SI HAY ESCENA
         (2026-09-11)
         Tres números que, en cero, explican los tres silencios posibles:
         sin flores no se mueve nada; sin reflejadas, la mitad del marco
         está estirando al revés (el defecto que estuvo dos versiones sin
         que nadie lo notara); sin mártir, no hay sacrificio. Verlos escrito
         es más rápido que deducirlos mirando. */
      var cuenta = document.getElementById('ensayo-recuento');
      if (cuenta && window.ECLIPSE.recuento) {
        var r = window.ECLIPSE.recuento();

        /* ⚡ EL COSTE, ARRIBA DE TODO (2026-09-11)
           Carlos preguntó lo que había que preguntar: «¿esto no empeora la
           experiencia con la página más lenta?». La respuesta no puede ser
           una promesa, tiene que ser un número visible mientras se mira la
           secuencia. 16,7 ms es el cuadro a 60 Hz: por encima de eso, la
           escena le está costando a la página. */
        var ms = r.msPorCuadro || 0;
        var fps = ms > 0 ? Math.round(1000 / ms) : 0;
        var comoVa = ms <= 17 ? 'bien' : ms <= 22 ? 'justo' : 'mal';

        cuenta.innerHTML =
          '<b class="ensayo__coste ensayo__coste--' + comoVa + '">' +
          ms.toFixed(1) + ' ms · ' + fps + ' fps</b>' +
          ' (' + r.tandas + ' tandas)<br>' +
          r.flores + ' flores (' + r.reflejadas + ' en espejo) · ' +
          r.ramas + ' ramas · ' + r.llamas + ' llamas<br>' +
          r.petalos + ' pétalos · ' +
          (r.martir ? 'mártir ok' : 'SIN MÁRTIR');
      }
    }, 100);
  }


  /* ─── ARRANQUE ────────────────────────────────────────────────────── */

  function arrancar() {
    /* 28-eclipse.js se inyecta a pedido, así que puede no estar todavía.
       Se espera a que abra su puerta en vez de fallar en silencio, que es
       exactamente el problema que este panel viene a resolver. */
    if (!window.ECLIPSE) { setTimeout(arrancar, 200); return; }

    pintarElPanel();
    pintarLasFases();
    pintarLasVelocidades();
    arrancarElReloj();

    document.getElementById('ensayo-correr')
      .addEventListener('click', function () { correr(0); });

    document.getElementById('ensayo-cortar')
      .addEventListener('click', function () { window.ECLIPSE.cortar(); });

    document.getElementById('ensayo-plegar')
      .addEventListener('click', function () {
        var cuerpo = document.getElementById('ensayo-cuerpo');
        var plegado = cuerpo.hidden;
        cuerpo.hidden = !plegado;
        this.textContent = plegado ? '–' : '+';
        this.setAttribute('aria-label', plegado ? 'Plegar el panel' : 'Desplegar el panel');
      });

    /* Si la calidad no es alta, se dice: es la diferencia entre 220 rosas y
       130, y sin saberlo uno podría estar puliendo una secuencia que en el
       equipo de al lado se ve distinta. */
    if (!window.ECLIPSE.esAlta) {
      var aviso = document.getElementById('ensayo-aviso');
      aviso.hidden = false;
      aviso.innerHTML = '<strong>Calidad reducida</strong>' +
        '<span class="ensayo__traba">· Este equipo corre la versión de 130 ' +
        'rosas, no la de 220.<em>La secuencia completa se ve en un equipo ' +
        'sin «calidad-media» ni «calidad-baja».</em></span>';
    }
  }

  /* El panel necesita el <body>. Si el script llega antes, se espera. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
