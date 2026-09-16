/* Comprueba la hoja «Fecha de la fiesta» del panel.
 *
 * POR QUÉ EXISTE
 * Es el único ajuste del panel que, con un toque, cambia lo que dice el
 * correo que ya recibió cada invitado, el pase que van a llevar a la
 * puerta y los recordatorios automáticos. Carlos pidió dos guardas —
 * avisar antes de dejar editar, y confirmar antes de guardar— y esas dos
 * guardas son el motivo de que esta hoja exista.
 *
 * Una guarda que no se prueba no es una guarda. Lo único peor que no
 * tener confirmación es tener una que no frena nada: la pantalla se ve
 * igual, y el día que alguien toque de más, la fiesta se mueve sin que
 * nadie se entere hasta que un invitado llegue el día equivocado.
 *
 * ⚠️ ESTA PRUEBA EJECUTA LA HOJA, NO LA LEE.
 * Levanta las funciones de verdad con un DOM de mentira, aprieta el
 * botón de guardar, y mira si se mandó algo al servidor. Si alguien
 * borra el `await` de confirmarAccion() —el error clásico, porque una
 * Promesa sin await es siempre verdadera y la pregunta deja de frenar—
 * esta prueba falla.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
/* ⛔ TODAS LAS FECHAS DE ACÁ SON INVENTADAS, A PROPÓSITO.
 * prueba-fecha-unica.mjs escanea el proyecto buscando la fecha real
 * escrita a mano fuera de su único dueño, y una fixture con la fecha de
 * verdad la haría fallar — con razón: el escaneo no puede distinguir un
 * dato de prueba de una copia olvidada, y si aprendiera a distinguirlos
 * dejaría de servir. Por eso acá la fiesta es el 11 de mayo de 2030. */
import vm from 'node:vm';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);

const hoja    = readFileSync(raiz('admin', 'codigo', '54-fecha-de-la-fiesta.js'), 'utf8');
const entorno = readFileSync(raiz('admin', 'api', '_lib', 'entorno.php'), 'utf8');
const ajustes = readFileSync(raiz('admin', 'api', 'ajustes.php'), 'utf8');
const vista   = readFileSync(raiz('admin', 'codigo', '08-vista-invitados.js'), 'utf8');
const indice  = readFileSync(raiz('admin', 'index.html'), 'utf8');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/* ─── El DOM de mentira ───────────────────────────────────────────── */

function nodo(id) {
  return {
    id,
    value: '',
    innerHTML: '',
    textContent: '',
    clases: new Set(),
    oyentes: {},
    classList: {
      add(c) { this.__d.clases.add(c); },
      remove(c) { this.__d.clases.delete(c); },
      contains(c) { return this.__d.clases.has(c); },
    },
    addEventListener(evento, fn) { this.oyentes[evento] = fn; },
    focus() {},
  };
}
const hacerNodo = (id) => {
  const n = nodo(id);
  n.classList.__d = n;
  return n;
};

/* ─── El banco ────────────────────────────────────────────────────── */

const banco = {
  nodos: {},
  mandados: [],
  avisos: [],
  respuestaDeConfirmar: false,
  vecesQuePreguntoConfirmar: 0,
};

const contexto = {
  console,
  CONFIGURACION: { fiesta: { fechaYHora: '2030-05-11T17:00:00' } },
  INVITADOS: [],

  seguro: (x) => String(x),
  buscar: (sel) => {
    const id = String(sel).replace('#', '');
    if (!banco.nodos[id]) banco.nodos[id] = hacerNodo(id);
    return banco.nodos[id];
  },
  abrirHoja: (titulo, html) => { banco.tituloDeLaHoja = titulo; banco.html = html; return {}; },
  cerrarHoja: () => { banco.cerrada = true; },
  campoTexto: (o) => '<campo id="' + o.id + '" tipo="' + (o.tipo || 'text') + '">',
  pieDeFormulario: (t) => '<pie>' + t + '</pie>',
  valorDe: (id) => (banco.nodos[id] ? banco.nodos[id].value : ''),
  avisar: (texto, malo) => banco.avisos.push({ texto, malo: !!malo }),
  traer: async () => ({ valor: banco.valorGuardado || null }),
  mandarSinCola: async (ruta, cuerpo) => { banco.mandados.push({ ruta, cuerpo }); },
  mandar: async (ruta, cuerpo) => { banco.mandados.push({ ruta, cuerpo, conCola: true }); },
  confirmarAccion: async () => {
    banco.vecesQuePreguntoConfirmar++;
    return banco.respuestaDeConfirmar;
  },
};

vm.createContext(contexto);
try {
  vm.runInContext(hoja, contexto);
} catch (error) {
  console.log('  FALLA no se pudo levantar la hoja → ' + error.message);
  process.exit(1);
}

const limpiar = () => {
  banco.nodos = {}; banco.mandados = []; banco.avisos = [];
  banco.vecesQuePreguntoConfirmar = 0; banco.cerrada = false;
};


/* ─── 1. La fecha escrita como la lee una persona ─────────────────── */

console.log('\nLa fecha en palabras\n');

comprobar('el 11 de mayo de 2030 es sábado',
  contexto.fechaDeFiestaEnPalabras('2030-05-11') === 'sábado 11 de mayo de 2030',
  'dio «' + contexto.fechaDeFiestaEnPalabras('2030-05-11') + '»');

/* ⚠️ La trampa de medianoche: con new Date('2030-05-11') el navegador
   entiende medianoche UTC, que en Toluca es el 23 a las 6 de la tarde.
   Si alguien saca el mediodía, este día cambia de nombre. */
comprobar('no se corre un día hacia atrás (la trampa de medianoche UTC)',
  contexto.fechaDeFiestaEnPalabras('2026-01-01') === 'jueves 1 de enero de 2026',
  'dio «' + contexto.fechaDeFiestaEnPalabras('2026-01-01') + '»');

comprobar('un 29 de febrero bisiesto se escribe bien',
  contexto.fechaDeFiestaEnPalabras('2028-02-29') === 'martes 29 de febrero de 2028',
  'dio «' + contexto.fechaDeFiestaEnPalabras('2028-02-29') + '»');


/* ─── 2. Cuánto falta ─────────────────────────────────────────────── */

console.log('\nCuánto falta\n');

const hoy = new Date();
const enISO = (d) => d.toISOString().slice(0, 10);
const masDias = (n) => {
  const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n));
  return enISO(d);
};

comprobar('hoy da cero', contexto.diasHastaLaFiesta(masDias(0)) === 0,
  'dio ' + contexto.diasHastaLaFiesta(masDias(0)));
comprobar('mañana da uno', contexto.diasHastaLaFiesta(masDias(1)) === 1);
comprobar('ayer da menos uno', contexto.diasHastaLaFiesta(masDias(-1)) === -1);
comprobar('lo pasado se dice en pasado',
  contexto.textoDeCuantoFalta(-3) === 'Fue hace 3 días.',
  contexto.textoDeCuantoFalta(-3));
comprobar('«Es hoy» cuando es hoy', contexto.textoDeCuantoFalta(0) === 'Es hoy.');


/* ─── 3. El aviso de los archivos que quedaron viejos ─────────────── */

console.log('\nEl desfase con los archivos compilados\n');

comprobar('si coincide con lo compilado, no avisa nada',
  contexto.avisoDeArchivosViejos('2030-05-11') === '');
comprobar('si no coincide, avisa que falta recompilar',
  contexto.avisoDeArchivosViejos('2026-11-01').includes('Falta recompilar'),
  'sin este aviso el desfase es invisible');


/* ─── 4. LA GUARDA: decir que no tiene que no guardar nada ────────── */

console.log('\nLa confirmación frena de verdad\n');

limpiar();
banco.valorGuardado = null;
banco.respuestaDeConfirmar = false;
await contexto.abrirLaFechaDeLaFiesta();

/* El campo arranca escondido: hay que tocar «Cambiar la fecha». */
/* Se mira el MOLDE, no el nodo de mentira: la clase viene escrita en el
   HTML que arma la hoja, y el DOM falso no parsea HTML. */
comprobar('el editor nace oculto en el molde',
  /id="fec-editor"[^>]*class="oculto"/.test(banco.html),
  'sin esto el campo de fecha está editable apenas se abre la hoja');

banco.nodos['fec-abrir'].oyentes.click();
comprobar('tocar «Cambiar la fecha» abre el editor',
  !banco.nodos['fec-editor'].classList.contains('oculto'));
comprobar('y el botón de abrir se esconde, para no quedar dos botones',
  banco.nodos['fec-abrir'].classList.contains('oculto'));

banco.nodos['fec-dia'].value = '2026-11-15';
await banco.nodos['pie-guardar'].oyentes.click();

comprobar('preguntó antes de guardar',
  banco.vecesQuePreguntoConfirmar === 1,
  'preguntó ' + banco.vecesQuePreguntoConfirmar + ' veces');
comprobar('⛔ al decir que NO, no se mandó nada al servidor',
  banco.mandados.length === 0,
  'se mandaron ' + banco.mandados.length + ' cosas: la confirmación no frena');


/* ─── 5. Decir que sí guarda, y guarda lo correcto ────────────────── */

console.log('\nDecir que sí\n');

limpiar();
banco.respuestaDeConfirmar = true;
await contexto.abrirLaFechaDeLaFiesta();
banco.nodos['fec-abrir'].oyentes.click();
banco.nodos['fec-dia'].value = '2026-11-15';
await banco.nodos['pie-guardar'].oyentes.click();

comprobar('se mandó una sola escritura', banco.mandados.length === 1,
  'se mandaron ' + banco.mandados.length);
comprobar('con la clave que lee entorno.php',
  banco.mandados[0] && banco.mandados[0].cuerpo.clave === 'fecha_de_la_fiesta',
  banco.mandados[0] ? banco.mandados[0].cuerpo.clave : '(nada)');
comprobar('con el día elegido',
  banco.mandados[0] && banco.mandados[0].cuerpo.valor === '2026-11-15');
comprobar('sin cola: una cola que aterriza mañana no cambia la fecha hoy',
  banco.mandados[0] && !banco.mandados[0].conCola);
comprobar('la hoja NO se cierra, para poder leer qué quedó pendiente',
  !banco.cerrada);
comprobar('y avisa que falta recompilar y subir',
  banco.nodos['fec-espejo'].innerHTML.includes('Falta recompilar'));


/* ─── 6. Guardar la misma fecha no hace nada ──────────────────────── */

console.log('\nGuardar lo mismo\n');

limpiar();
banco.respuestaDeConfirmar = true;
await contexto.abrirLaFechaDeLaFiesta();
banco.nodos['fec-abrir'].oyentes.click();
banco.nodos['fec-dia'].value = '2030-05-11';   // la que ya rige
await banco.nodos['pie-guardar'].oyentes.click();

comprobar('no pregunta ni manda si es la fecha que ya está',
  banco.vecesQuePreguntoConfirmar === 0 && banco.mandados.length === 0);


/* ─── 7. El lado del PHP ──────────────────────────────────────────── */

console.log('\nEl PHP: la base manda, la constante respalda\n');

const sinComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const entornoLimpio = sinComentarios(entorno);

comprobar('existe el resolutor',
  /function fiestaDiaVigente\s*\(/.test(entornoLimpio));
comprobar('las cuatro funciones públicas ya no leen la constante directo',
  !/function (diaDeLaFiesta|fiestaFechaYHora)[\s\S]{0,120}FIESTA_DIA/.test(entornoLimpio) &&
  !/new DateTime\(FIESTA_DIA\)/.test(entornoLimpio),
  'si alguna la lee, cambiar la fecha en el panel no la mueve');
comprobar('el resolutor cae en la constante como respaldo',
  /FIESTA_DIA;/.test(entornoLimpio.slice(entornoLimpio.indexOf('function fiestaDiaVigente'))));
comprobar('valida que el día exista de verdad (checkdate)',
  /checkdate\s*\(/.test(entornoLimpio),
  'sin esto, un 2026-02-30 guardado rompería todas las fechas del sitio');
comprobar('no se cae si no hay base: comprueba que existan los ayudantes',
  /function_exists\s*\(\s*'consultarUno'\s*\)/.test(entornoLimpio),
  'confirmar.php e invitacion.php cargan entorno.php SIN bd.php');
comprobar('atrapa cualquier error de base',
  (entornoLimpio.match(/catch\s*\(\s*Throwable/g) || []).length >= 2,
  'una página que no abre por no poder leer la fecha es peor que una fecha vieja');
comprobar('las dos líneas de la constante siguen planas',
  /^const FIESTA_DIA {2}= '\d{4}-\d{2}-\d{2}';$/m.test(entorno) &&
  /^const FIESTA_HORA = '\d{2}:\d{2}:\d{2}';$/m.test(entorno),
  'el estampador las lee con una expresión regular y se detiene si cambian');

comprobar('la API valida la forma de la fecha',
  /\$clave === 'fecha_de_la_fiesta'/.test(ajustes) && /checkdate/.test(ajustes),
  'el formulario valida por comodidad, la API valida por defensa');


/* ─── 8. Que la hoja esté enganchada ──────────────────────────────── */

console.log('\nEnganchada donde se la puede encontrar\n');

comprobar('el archivo se carga en el panel',
  indice.includes('codigo/54-fecha-de-la-fiesta.js'));
/* lastIndexOf: '20-arranque.js' se menciona en comentarios mucho antes
   de la etiqueta de verdad. */
comprobar('está antes de 20-arranque.js, que va siempre último',
  indice.indexOf('codigo/54-fecha-de-la-fiesta.js') <
  indice.lastIndexOf('codigo/20-arranque.js'));
comprobar('aparece en la hoja «Más»', vista.includes("item('mas-fecha-fiesta'"));
comprobar('y su toque abre la hoja',
  /alToque\('mas-fecha-fiesta'[\s\S]{0,80}abrirLaFechaDeLaFiesta\(\)/.test(vista));


/* ─── Final ───────────────────────────────────────────────────────── */

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + (fallos === 1 ? ' comprobación falló' : ' comprobaciones fallaron'));
  process.exit(1);
}
console.log('✓ la fecha se cambia desde un solo lugar, y avisa antes');
