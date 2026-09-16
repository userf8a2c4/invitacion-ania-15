/* Comprueba el cuadro «Persona por persona» de la descarga de invitados.
 *
 * POR QUÉ EXISTE
 * Es el único papel de todo el proyecto donde el trabajo toca la realidad
 * de la fiesta: alguien lo imprime y con eso la cocina sabe cuántos
 * platos de cada cosa hacer, y el mesero sabe delante de quién no poner
 * el que lleva durazno.
 *
 * Cada invitado elige su plato y escribe su alergia persona por persona.
 * Ese dato se guarda bien desde el 28 de agosto. Lo que falló durante
 * semanas fue USARLO: el cuadro decía «(sin desglose por persona)» y
 * cerraba con un aviso de que no se pudo traer el detalle.
 *
 * ⚠️ ESTA PRUEBA EJECUTA LA DESCARGA, NO LA LEE.
 * Arma invitados y acompañantes de mentira, corre exportarInvitados() de
 * verdad, y mira el cuadro que sale: que esté, que traiga el plato y la
 * alergia de cada quien, que no se saltee ningún lugar, y que NO aparezca
 * el aviso de «falta el detalle» cuando el detalle está.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => join(AQUI, '..', ...p);
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const leer = (...p) => readFileSync(raiz(...p), 'utf8').split(CR + LF).join(LF);

const exportador = leer('admin', 'codigo', '13-exportar.js');

let fallos = 0;
const comprobar = (que, bien, detalle) => {
  console.log((bien ? '  ok    ' : '  FALLA ') + que + (bien || !detalle ? '' : ' → ' + detalle));
  if (!bien) fallos++;
};

/** Saca una función del archivo tal cual está escrita. */
function extraer(texto, nombre) {
  let desde = texto.indexOf('async function ' + nombre + '(');
  if (desde === -1) desde = texto.indexOf('function ' + nombre + '(');
  if (desde === -1) throw new Error('no existe ' + nombre + '()');
  const abre = texto.indexOf('{', desde);
  let hondo = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') hondo++;
    else if (texto[i] === '}') { hondo--; if (hondo === 0) return texto.slice(desde, i + 1); }
  }
  throw new Error('no se le encuentra el final a ' + nombre + '()');
}

/* ─── El banco ────────────────────────────────────────────────────── */

const banco = { bloques: null, avisos: [], acompanantes: [] };

const contexto = {
  console,
  INVITADOS: [],
  CONFIGURACION: { fiesta: { fechaEnPalabras: '11 de mayo de 2030', lugar: 'Salones Alvi' } },
  FECHA_LIMITE_TEXTO: '',
  COMO_SE_LEE_EL_ESTADO: {
    confirmo:   { texto: 'Confirmó' },
    no_viene:   { texto: 'No viene' },
    enviada:    { texto: 'Sin responder' },
    sin_enviar: { texto: 'Sin enviar' },
  },
  window: { open: () => ({ document: { write() {}, close() {} }, close() {} }) },
  seguro: (x) => String(x),
  avisar: (t, malo) => banco.avisos.push({ t, malo: !!malo }),
  traer: async (ruta) => {
    if (ruta.indexOf('acompanantes.php') !== -1) {
      if (banco.acompanantes === 'romper') throw new Error('sin señal');
      return { filas: banco.acompanantes };
    }
    return {};
  },
  invitadoPasaElFiltro: () => true,
  enElOrdenElegido: (a) => a,
  comoEstaLaAsistencia: (f) => {
    if (!f.invitacion_id) return Number(f.asiste) === 1 ? 'confirmo' : 'no_viene';
    if (f.invitacion_estado === 'confirmada') return Number(f.asiste) === 1 ? 'confirmo' : 'no_viene';
    if (f.invitacion_estado === 'declinada') return 'no_viene';
    if (f.invitacion_estado === 'enviada') return 'enviada';
    return 'sin_enviar';
  },
  comoSeLlamaLaMesa: (m) => m,
  /* El punto de captura: en vez de generar el archivo, se guarda lo que
     se le iba a mandar. */
  exportar: (formato, base, titulo, bloques) => { banco.bloques = bloques; },
};

vm.createContext(contexto);
try {
  vm.runInContext([
    extraer(exportador, 'oGuion'),
    extraer(exportador, 'loQueEscribio'),
    extraer(exportador, 'menusPersonaPorPersona'),
    extraer(exportador, 'alergiasPersonaPorPersona'),
    extraer(exportador, 'exportarInvitados'),
  ].join(LF + LF), contexto);
} catch (error) {
  console.log('  FALLA no se pudo levantar el exportador → ' + error.message);
  process.exit(1);
}

const bloqueLlamado = (trozo) =>
  (banco.bloques || []).find(b => String(b.titulo).indexOf(trozo) !== -1);

/* ─── Los datos de mentira ────────────────────────────────────────── */

/* Una familia de 3 con los tres nombres cargados, uno con alergia. */
const LOS_PEREZ = { id: 1, nombre: 'Familia Pérez', asiste: 1, adultos: 2, ninos: 1,
  invitacion_id: 9, invitacion_estado: 'confirmada', mesa: 'Mesa 2',
  alergias: 'Ninguna', correo: '', telefono: '' };

/* Una familia de 4 con UN solo nombre cargado: los otros tres lugares
   existen y hasta hoy desaparecían del cuadro. */
const LOS_SOTO = { id: 2, nombre: 'Familia Soto', asiste: 1, adultos: 3, ninos: 1,
  invitacion_id: 10, invitacion_estado: 'confirmada', mesa: 'Mesa 10',
  alergias: 'Ninguna', correo: '', telefono: '' };

const ACOMPANANTES = [
  { confirmacion_id: 1, nombre: 'Ana Pérez',  tipo: 'adulto', menu: 'Estándar',  alergias: 'Durazno' },
  { confirmacion_id: 1, nombre: 'Luis Pérez', tipo: 'adulto', menu: 'Vegetariano', alergias: '' },
  { confirmacion_id: 1, nombre: 'Sofi Pérez', tipo: 'nino',   menu: 'Infantil',  alergias: 'Maní' },
  { confirmacion_id: 2, nombre: 'Juan Soto',  tipo: 'adulto', menu: 'Estándar',  alergias: '' },
];

const correr = async (invitados, acomp) => {
  banco.bloques = null; banco.avisos = [];
  contexto.INVITADOS = invitados;
  banco.acompanantes = acomp;
  await contexto.exportarInvitados('pdf');
};


/* ─── 1. El cuadro existe y trae a cada quien ─────────────────────── */

console.log('\nEl cuadro por persona\n');

await correr([LOS_PEREZ, LOS_SOTO], ACOMPANANTES);

const cuadro = bloqueLlamado('Persona por persona');
comprobar('el cuadro se imprime', !!cuadro,
  'sin esto la cocina solo tiene totales por familia');

const cols = cuadro ? cuadro.encabezados : [];
comprobar('tiene columna de Menú',    cols.indexOf('Menú') !== -1);
comprobar('tiene columna de Alergias', cols.indexOf('Alergias') !== -1);
comprobar('dice de qué mesa es cada persona', cols.indexOf('Mesa') !== -1);

const filas = cuadro ? cuadro.filas : [];
const col = (nombre) => cols.indexOf(nombre);
const buscarPersona = (quien) => filas.find(f => String(f[col('Persona')]) === quien);


/* ─── 2. El plato de cada quien, con su nombre al lado ────────────── */

console.log('\nQuién eligió qué plato\n');

const ana = buscarPersona('Ana Pérez');
comprobar('Ana Pérez está en el cuadro', !!ana);
comprobar('con su plato',  ana && ana[col('Menú')] === 'Estándar', ana && ana[col('Menú')]);
comprobar('y con su alergia', ana && ana[col('Alergias')] === 'Durazno', ana && ana[col('Alergias')]);

const luis = buscarPersona('Luis Pérez');
comprobar('el vegetariano sale como vegetariano',
  luis && luis[col('Menú')] === 'Vegetariano', luis && luis[col('Menú')]);

const sofi = buscarPersona('Sofi Pérez');
comprobar('la niña sale como Niño y con menú infantil',
  sofi && sofi[col('Tipo')] === 'Niño' && sofi[col('Menú')] === 'Infantil');
comprobar('y con su alergia', sofi && sofi[col('Alergias')] === 'Maní');


/* ─── 3. Ningún lugar se pierde ───────────────────────────────────── */

console.log('\nNo se saltea ningún lugar\n');

comprobar('salen las 7 personas de las dos familias (3 + 4)',
  filas.length === 7,
  'salieron ' + filas.length + '; si son 4 es que los lugares sin nombre se perdieron');

const sotoFilas = filas.filter(f => String(f[col('Grupo')]) === 'Familia Soto');
comprobar('la familia de 4 con un solo nombre aporta 4 renglones',
  sotoFilas.length === 4, 'aportó ' + sotoFilas.length);
comprobar('los lugares sin nombre se nombran «Adulto 2», «Niño 1»…',
  sotoFilas.some(f => /^(Adulto|Niño) \d+$/.test(String(f[col('Persona')]))),
  sotoFilas.map(f => f[col('Persona')]).join(' | '));


/* ─── 3b. Solo los que vienen ─────────────────────────────────────── */

console.log('\nSolo quienes confirmaron\n');

comprobar('no hay columna «Estado»: acá son todos los que vienen',
  cols.indexOf('Estado') === -1,
  'una columna que repite «Confirmó» ciento treinta veces roba ancho a Menú');

/* Una familia que contestó que NO viene, con dos lugares y su gente
   cargada: no tiene que aportar ni un renglón. */
const LOS_QUE_NO = { id: 3, nombre: 'Familia Ruiz', asiste: 0, adultos: 2, ninos: 0,
  invitacion_id: 11, invitacion_estado: 'declinada', mesa: 'Mesa 3',
  alergias: 'Ninguna', correo: '', telefono: '' };

/* Y una a la que todavía no le contestaron. */
const LOS_CALLADOS = { id: 4, nombre: 'Familia Vega', asiste: 1, adultos: 2, ninos: 0,
  invitacion_id: 12, invitacion_estado: 'enviada', mesa: 'Mesa 4',
  alergias: 'Ninguna', correo: '', telefono: '' };

await correr([LOS_PEREZ, LOS_SOTO, LOS_QUE_NO, LOS_CALLADOS],
  ACOMPANANTES.concat([
    { confirmacion_id: 3, nombre: 'Rita Ruiz', tipo: 'adulto', menu: 'Estándar', alergias: '' },
    { confirmacion_id: 4, nombre: 'Eva Vega',  tipo: 'adulto', menu: 'Estándar', alergias: '' },
  ]));

const conTodos = bloqueLlamado('Persona por persona');
const filas2 = conTodos ? conTodos.filas : [];
const col2 = (n) => conTodos.encabezados.indexOf(n);
const grupos = filas2.map(f => String(f[col2('Grupo')]));

comprobar('quien dijo que no viene no aporta ningún renglón',
  grupos.indexOf('Familia Ruiz') === -1,
  'sale en el papel de la cocina alguien que no va a sentarse');
comprobar('quien todavía no contestó tampoco',
  grupos.indexOf('Familia Vega') === -1);
comprobar('siguen las 7 de las dos familias que sí vienen',
  filas2.length === 7, 'salieron ' + filas2.length);
comprobar('el título dice de quiénes habla',
  /solo quienes confirmaron/.test(String(conTodos.titulo)), String(conTodos.titulo));


/* ─── 4. Ordenado por mesa, que es como se usa ────────────────────── */

console.log('\nOrdenado como se usa\n');

const mesas = filas.map(f => String(f[col('Mesa')]));
comprobar('la mesa 2 va antes que la mesa 10 (número, no texto)',
  mesas.indexOf('Mesa 2') < mesas.indexOf('Mesa 10'),
  mesas.join(' | '));
comprobar('cada mesa queda en un bloque continuo',
  mesas.join('|') === mesas.slice().sort((a, b) =>
    (Number(/(\d+)/.exec(a)[1]) - Number(/(\d+)/.exec(b)[1]))).join('|'));


/* ─── 5. No advertir de algo que sí se tiene ──────────────────────── */

console.log('\nEl aviso de «falta el detalle»\n');

comprobar('⛔ con el detalle presente NO aparece el aviso de que falta',
  !bloqueLlamado('Falta el detalle'),
  'es el cartel que Carlos vio en el PDF teniendo los datos cargados');
comprobar('ni el de «sin detalle por persona»',
  !bloqueLlamado('Sin detalle por persona'));

/* Y al revés: si de verdad no llega, tiene que avisar. */
await correr([LOS_PEREZ, LOS_SOTO], 'romper');
comprobar('pero si la consulta falla de verdad, sí avisa',
  !!bloqueLlamado('Falta el detalle'),
  'un archivo incompleto que no lo dice es peor que uno que falla');


/* ─── Final ───────────────────────────────────────────────────────── */

console.log('');
if (fallos) {
  console.log('✗ ' + fallos + (fallos === 1 ? ' comprobación falló' : ' comprobaciones fallaron'));
  process.exit(1);
}
console.log('✓ el cuadro dice quién come qué y quién es alérgico a qué');
