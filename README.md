# Invitación de XV Años · Ania

Invitación web para los quince años de Ania. Es una página que se abre en
cualquier navegador y funciona **sin internet** (salvo el mapa, la tipografía y
el envío de correos).

Esta guía está escrita para que **cualquier persona pueda entender y modificar
el proyecto, sin saber programar**. Si algo no se entiende, es un error de esta
guía, no tuyo: está para eso.

---

## Índice

1. [Cómo abrir la invitación](#1-cómo-abrir-la-invitación)
2. [Mapa del proyecto](#2-mapa-del-proyecto)
3. [Cómo cambiar cada cosa](#3-cómo-cambiar-cada-cosa)
4. [Enlaces personalizados para cada invitado](#4-enlaces-personalizados-para-cada-invitado)
5. [Activar el envío de correos](#5-activar-el-envío-de-correos)
6. [Llevar el control de los confirmados](#6-llevar-el-control-de-los-confirmados)
7. [Cómo funciona cada efecto](#7-cómo-funciona-cada-efecto)
8. [Glosario](#8-glosario)
9. [Problemas frecuentes](#9-problemas-frecuentes)
10. [Antes de mandarla a los invitados](#10-antes-de-mandarla-a-los-invitados)

---

## 1. Cómo abrir la invitación

Hacé doble clic en **`index.html`**. Se abre en tu navegador y listo.

También podés arrastrar ese archivo a una ventana del navegador.

> **Ojo:** siempre abrí `index.html`, nunca los otros archivos. Los demás son
> las piezas que `index.html` va a buscar solo.

### Para editarla

Los archivos de código son texto común. Se pueden abrir con el Bloc de notas,
pero se ven mucho mejor con un editor gratuito como
[Visual Studio Code](https://code.visualstudio.com/), que además pinta las
palabras de colores y avisa si algo quedó mal escrito.

**Antes de tocar nada, hacé una copia de la carpeta entera.** Si algo se rompe,
volvés a la copia y listo.

---

## 2. Mapa del proyecto

```
invitacion-ania/
├── index.html          ← La estructura de la página: qué cosas hay y en qué orden
├── README.md           ← Esta guía
├── estilos/            ← Cómo se ve todo (colores, tamaños, animaciones)
├── codigo/             ← Qué hace todo (la música, el formulario, la física)
└── recursos/           ← Las imágenes, los dibujos y la canción
```

### 🌹 Dónde están dibujadas las rosas

Vale la pena saberlo porque las rosas aparecen por toda la web y podrías
querer cambiarlas.

Arriba de todo del `index.html` hay un bloque invisible llamado
**`<svg id="biblioteca-de-rosas">`**. Es el "juego de sellos": ahí están
dibujadas **una sola vez** la rosa de frente, la de perfil, la de tres cuartos,
la de espaldas, la media abierta, el capullo y la hoja. Después, el relicario
de la portada y las enredaderas del marco las estampan desde ahí.

> **Si querés cambiar cómo son las rosas de la web, se tocan ahí una sola vez
> y cambian en todos lados.**

Antes cada parte tenía sus propias flores y se notaba la disonancia: unas eran
rosaditas y otras vino oscuro. Ahora comparten dibujo y paleta.

⚠️ **La única excepción**: las rosas de las cuatro esquinas del fondo están en
`recursos/fondo-ornamental.svg`, que es una imagen aparte y no puede leer los
dibujos del `index.html`. Están copiadas ahí con la misma forma y los mismos
colores, pero si algún día cambiás la paleta, **acordate de copiarla también en
ese archivo** o van a quedar desparejas. Está avisado dentro del archivo.

### La carpeta `estilos/`

Los archivos están numerados y **el orden importa**: si dos dicen cosas
distintas sobre lo mismo, gana el que tiene el número más alto.

| Archivo | De qué se ocupa |
|---|---|
| `01-fundamentos.css` | Los colores y las tipografías de TODO el proyecto |
| `02-marco-victoriano.css` | El marco tallado que rodea la web |
| `03-sobre-de-apertura.css` | La pantalla de bienvenida con el sobre lacrado |
| `04-portada.css` | El óvalo dorado con el nombre de Ania |
| `05-cuenta-regresiva.css` | Las cartelas de días, horas, minutos y segundos |
| `06-secciones.css` | El mensaje, los regalos, el mapa y el pie de página |
| `07-formulario.css` | La confirmación de asistencia |
| `08-pase-de-acceso.css` | La entrada con el código QR (y cómo sale impresa) |
| `09-reproductor.css` | El reproductor de música |
| `10-cursor-y-petalos.css` | El cursor dorado y los pétalos, en sus tres planos |
| `12-haces-de-luz.css` | Los rayos de sol que entran en diagonal |
| `11-responsivo.css` | Los ajustes para celular y tablet (va último a propósito: en CSS gana la regla que se escribe después) |

### La carpeta `codigo/`

| Archivo | De qué se ocupa |
|---|---|
| **`01-configuracion.js`** | **👉 El único que necesitás tocar para cambiar datos** |
| `02-utilidades.js` | Herramientas que usan todos los demás |
| `03-sobre-de-apertura.js` | Abre el sobre y arranca la música |
| `04-invitado-personalizado.js` | Escribe los datos en la página y saluda por nombre |
| `05-cursor-personalizado.js` | El cursor dorado que sigue al mouse |
| `06-petalos-con-fisica.js` | Los pétalos: caen, esquivan el mouse y se posan sobre el relicario |
| `07-marco-y-enredaderas.js` | Hace crecer los rosales de los costados |
| `08-efectos-de-scroll.js` | El fondo que se mueve y las secciones que aparecen |
| `09-cuenta-regresiva.js` | Calcula cuánto falta para la fiesta |
| `10-reproductor-de-musica.js` | Play, pausa, volumen y silencio |
| `11-formulario-confirmacion.js` | El formulario y los menús por persona |
| `12-pase-de-acceso.js` | Genera la entrada con el QR y la recuerda |
| `13-agregar-al-calendario.js` | El botón que agenda la fiesta |
| `14-haces-de-luz.js` | Mueve los rayos de luz muy despacio |
| `15-registro-de-confirmaciones.js` | Anota cada confirmación en la hoja de cálculo y pone el enlace del pie |
| `16-volver-arriba.js` | Hace que la invitación siempre abra por el principio, y el botón para volver ahí |

### La carpeta `recursos/`

| Archivo | Qué es |
|---|---|
| `fondo-ornamental.svg` | El fondo con las grietas de óleo |
| `marco-borde-vertical.svg` | La moldura de los lados (se repite hacia abajo) |
| `marco-borde-horizontal.svg` | La moldura de arriba y abajo (se repite a lo ancho) |
| `marco-esquina.svg` | La pieza de esquina (se usa 4 veces, espejada) |
| `petalo-rosa-1.svg`, `petalo-rosa-2.svg`, `petalo-rosa-3.svg` | Los tres pétalos que caen |
| `icono.svg` | El iconito de la pestaña del navegador |
| `vista-previa-compartir.jpg` | La imagen que aparece al mandar el enlace por WhatsApp |
| `cancion-hysteria.mp3` | La canción de fondo |
| `fondo-original-respaldo.jpg` | El fondo viejo, guardado por las dudas |

---

## 3. Cómo cambiar cada cosa

Casi todo se cambia en **un solo archivo**: `codigo/01-configuracion.js`.
Abrilo y vas a ver los datos ordenados por tema.

### Las tres reglas de oro

1. **No borres las comillas** `' '` que rodean cada texto.
2. **No borres la coma** `,` del final de cada línea.
3. Si tu texto lleva un apóstrofo, escribilo con una barra antes: `'d\'Angelo'`.

Si algo se rompe, casi siempre es por una de estas tres.

---

### Cambiar la fecha y la hora

La fecha aparece en tres lugares distintos de la configuración porque la
computadora y las personas la leen distinto. **Cambiá los tres.**

**Antes:**
```js
fechaYHora: '2026-10-24T17:00:00',
diaDeLaSemana:   'Sábado',
fechaEnPalabras: '24 de Octubre de 2026',
horaEnPalabras:  '5:00 PM',
```

**Después** (mudamos la fiesta al viernes 7 de noviembre a las 8 de la noche):
```js
fechaYHora: '2026-11-07T20:00:00',
diaDeLaSemana:   'Viernes',
fechaEnPalabras: '7 de Noviembre de 2026',
horaEnPalabras:  '8:00 PM',
```

**Cómo se escribe `fechaYHora`:** `AÑO-MES-DÍA` + una `T` + `HORA:MINUTOS:SEGUNDOS`,
con la hora en formato de 24 horas (las 8 de la noche son las 20).
Esa es la que usan la cuenta regresiva y el botón de calendario, así que si la
escribís mal, el contador va a mostrar cualquier cosa.

Acordate de cambiar también `fechaYHoraDeCierre`, que es a qué hora termina.

---

### Cambiar el lugar

**Antes:**
```js
nombre: 'Salones de fiestas Alvi Toluca',
```

**Después:**
```js
nombre: 'Quinta Los Álamos',
```

Para el mapa hay **dos** direcciones distintas y cada una se saca de un lugar:

- **`enlaceParaAbrirEnMaps`** → es el botón "Abrir en Google Maps".
  Se saca con *Compartir → Copiar vínculo* en Google Maps.

- **`enlaceDelMapaIncrustado`** → es el mapa que se ve dentro de la página.
  ⚠️ **Acá NO sirve el enlace de "Compartir"**: Google no permite mostrarlo
  dentro de una web. Hay que usar uno que termine en `&output=embed`.
  La forma más fácil es copiar el que ya está y cambiarle solo la dirección:

  ```js
  enlaceDelMapaIncrustado: 'https://www.google.com/maps?q=TU+DIRECCIÓN+ACÁ&output=embed',
  ```
  Escribí la dirección con signos `+` en lugar de espacios.

---

### Cambiar el mensaje de los papás

Está en la sección `textos` de la configuración. El `<br>` es un salto de
línea y `<br><br>` deja un renglón en blanco entre párrafos.

**Antes:**
```js
mensajeDeLosPapas:
  'Quince años han pasado como el susurro del viento entre rosas — ' +
  'cada momento, un pétalo que cayó con gracia y amor.<br><br>' +
  ...
```

**Después:**
```js
mensajeDeLosPapas:
  'Hoy cumple quince años la persona que nos cambió la vida.<br><br>' +
  'Gracias por acompañarnos en esta noche tan especial.',
```

Fijate que cada renglón termina con `+` **menos el último**, que termina con `,`.
Ese `+` es lo que va pegando los pedazos de texto.

---

### Cambiar la lista de regalos

```js
regalos: {
  enlaceDeLaLista: 'PEGÁ ACÁ EL ENLACE DE TU LISTA',
  aclaracion: 'También se aceptan transferencias — preguntar a los papás 💛',
},
```

---

### Cambiar la canción

1. Copiá tu archivo `.mp3` dentro de la carpeta `recursos/`.
2. En la configuración, cambiá el nombre del archivo y los datos:

```js
musica: {
  archivo: 'recursos/mi-cancion-nueva.mp3',
  titulo: 'Nombre de la canción',
  artista: 'Nombre del artista',
  album: 'Nombre del disco',
  volumenInicial: 0.7,
},
```

`volumenInicial` va de `0` (mudo) a `1` (máximo). `0.7` es el 70 %.

---

### Cambiar los colores

Están todos juntos al principio de `estilos/01-fundamentos.css`.
Cambiando uno solo, cambia en toda la web.

**Antes:**
```css
--color-oro: #c9a84c;
```
**Después** (un dorado más claro):
```css
--color-oro: #e2c46a;
```

Esos códigos que empiezan con `#` son colores. Podés sacar el que quieras
buscando "selector de color" en Google.

---

## 4. Enlaces personalizados para cada invitado

Podés mandarle a cada uno un enlace con su nombre adentro. La web lo saluda en
el sobre y le deja el nombre ya escrito en el formulario.

Se hace agregando `?invitado=` al final de la dirección:

```
index.html?invitado=Familia+Pérez
index.html?invitado=Tía+Marta
index.html?invitado=Sofía+y+Nicolás
```

**Reglas:**

- Los espacios se escriben con un signo `+`
- Las tildes y la ñ se escriben normal: `Pérez`, `Muñoz`
- Si el nombre lleva `&`, reemplazalo por la palabra `y`

Si el enlace no trae nombre, la web muestra un saludo genérico. No se rompe nada.

---

## 5. Activar el envío de correos

Mientras no se configure, **la invitación funciona igual**: el invitado confirma
y ve su pase en pantalla. Lo único que no pasa es que le llegue por correo.

Cuando se confirma una asistencia salen **dos correos distintos**:

- El **comprobante para el invitado**, con su código de pase, a la dirección
  que escribió en el formulario.
- El **aviso para quien organiza**, con el detalle de menús, alergias y notas,
  a tu propio correo.

Por eso hacen falta **dos plantillas** en EmailJS. Si dejás una sin configurar,
esa no se manda y la otra sigue funcionando igual.

Para activarlo hay que crear una cuenta gratis en
[EmailJS](https://www.emailjs.com) (15 minutos, una sola vez):

1. Creá la cuenta.
2. **Add New Service** → Gmail → copiá el **Service ID**.
3. **Account → API Keys** → copiá la **Public Key**.
4. **Email Templates** → **Create New Template**, redactada para el invitado.
   En el campo **To Email** poné `{{correo_destino}}` — así la web decide a
   quién le llega y la plantilla no queda atada a una dirección fija.
   Copiá su **Template ID**.
5. Repetí el paso 4 con una segunda plantilla, esta redactada para vos (el
   aviso de que alguien confirmó). También con `{{correo_destino}}` en el
   **To Email**. Copiá su **Template ID**.
6. Pegá todo en `codigo/01-configuracion.js`:

```js
correo: {
  clavePublica:  'acá va la Public Key',
  idDelServicio: 'acá va el Service ID',
  idDePlantillaDelInvitado:      'acá va el Template ID del invitado',
  idDePlantillaDelAdministrador: 'acá va el Template ID del aviso',
  correoDelAdministrador:        'acá va tu correo',
},
```

En cualquiera de las dos plantillas podés usar estas etiquetas, que la web
completa sola:

| Etiqueta | Qué trae |
|---|---|
| `{{nombre_invitado}}` | El nombre que escribió |
| `{{correo_invitado}}` | Su correo |
| `{{cantidad_adultos}}` | Cuántos adultos van |
| `{{cantidad_ninos}}` | Cuántos niños van |
| `{{resumen_menus}}` | Ej: `2 estándar · 1 infantil` |
| `{{detalle_menus}}` | Ej: `Adulto 1: Estándar \| Adulto 2: Vegetariano` |
| `{{alergias}}` | Lo que escribió sobre alergias |
| `{{notas}}` | Su mensaje |
| `{{codigo_de_pase}}` | El código único de su entrada |
| `{{fecha}}` y `{{lugar}}` | Los datos de la fiesta |
| `{{correo_destino}}` | A quién le llega este envío — va en **To Email** |

---

## 6. Llevar el control de los confirmados

El correo de la sección anterior avisa **en el momento**: alguien confirma y
suena el teléfono. Pero los correos se acumulan en la bandeja de entrada y no
se pueden ordenar ni sumar. Para saber *cuántos van en total* o *cuántos
vegetarianos hay* hace falta otra cosa.

Esa otra cosa es una **hoja de cálculo de Google**: cada confirmación se anota
sola como una fila. Esa hoja **es el panel de administración** — se ordena, se
filtra, se descarga a Excel y se abre desde el celular el día de la fiesta.

> **¿Por qué no un panel dentro de la web?** Porque la invitación es una página
> estática, sin servidor ni base de datos. Lo que cada invitado confirma se
> guarda en *su* navegador, así que desde la web es imposible ver la lista de
> todos. Y un panel propio tendría que reprogramar el ordenar, el filtrar y el
> exportar que la hoja ya trae hechos.

### Los pasos (20 minutos, una sola vez)

1. Entrá a [sheets.new](https://sheets.new) y creá una hoja. Ponele un nombre,
   por ejemplo **Confirmaciones XV Ania**.
2. En el menú de arriba: **Extensiones → Apps Script**. Se abre una pestaña
   nueva con un editor de código.
3. Borrá todo lo que haya ahí y pegá esto:

```js
function doPost(peticion) {
  // Si llegan dos confirmaciones en el mismo instante, que esperen su turno
  var turno = LockService.getScriptLock();
  turno.waitLock(20000);

  try {
    var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var datos = JSON.parse(peticion.postData.contents);

    // La primera vez escribe los títulos de las columnas
    if (hoja.getLastRow() === 0) {
      hoja.appendRow([
        'Momento', 'Nombre', 'Correo', 'Asiste', 'Adultos', 'Niños',
        'Total', 'Menús', 'Resumen', 'Alergias', 'Notas', 'Código'
      ]);
    }

    // ¿Ya está anotada? Puede llegar dos veces si la web reintentó.
    // El código de pase es único por persona, así que sirve de huella.
    if (hoja.getLastRow() > 1) {
      var codigos = hoja.getRange(2, 12, hoja.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < codigos.length; i++) {
        if (codigos[i][0] === datos.codigo) {
          return responder({ ok: true, repetida: true, fila: i + 2 });
        }
      }
    }

    hoja.appendRow([
      new Date(datos.momento), datos.nombre, datos.correo, datos.asiste,
      datos.adultos, datos.ninos, datos.total, datos.menus,
      datos.resumen, datos.alergias, datos.notas, datos.codigo
    ]);

    return responder({ ok: true, fila: hoja.getLastRow() });

  } catch (error) {
    return responder({ ok: false, error: String(error) });
  } finally {
    turno.releaseLock();
  }
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
```

> **Dos detalles que parecen de más y no lo son.** El *turno* (`LockService`)
> evita que dos personas que confirman en el mismo segundo se pisen la fila. Y
> la búsqueda del código evita que una confirmación aparezca dos veces cuando
> la web reintenta: sin eso, los reintentos que hacen falta para no perder
> confirmaciones te llenarían la hoja de duplicados.

4. Guardá (el iconito del disquete).
5. Arriba a la derecha: **Implementar → Nueva implementación**. En el engranaje
   elegí **Aplicación web**, y completá:
   - **Ejecutar como:** *Yo*
   - **Quién tiene acceso:** **Cualquier usuario** ← imprescindible; si ponés
     otra cosa, los invitados no van a poder anotar nada.
6. Google va a pedirte permiso con una pantalla que dice *"Esta app no está
   verificada"*. Es normal: la app sos vos. Entrá en **Configuración avanzada →
   Ir a (nombre del proyecto)** y aceptá.
7. Copiá la **URL de la aplicación web** (termina en `/exec`).
8. Pegá las dos direcciones en `codigo/01-configuracion.js`:

```js
registro: {
  urlParaAnotar: 'la URL que termina en /exec',
  urlDeLaHoja:   'la dirección de la hoja, la que ves en el navegador',
},
```

Probá confirmando desde la web: tendría que aparecer una fila nueva.

### Cómo sabés que una confirmación quedó anotada

La web no manda la fila "a ciegas": **Google contesta si la anotó o no**, y la
invitación lee esa respuesta. Si algo falla, hay tres redes abajo:

1. **Reintenta al segundo**, porque la mayoría de las fallas son pasajeras (el
   celular cambiando de wifi a datos, Google tardando de más).
2. Si igual falla, la confirmación **queda guardada en el navegador de esa
   persona** y se reintenta sola la próxima vez que abra la invitación — cosa
   que pasa seguido, porque vuelven a mirar el pase, la fecha o el mapa.
3. Y por encima de todo está **el correo**, que viaja por otro camino: aunque
   Google esté caído entero, el aviso te llega igual y podés anotar la fila a
   mano.

Los reintentos no ensucian la hoja: el script reconoce el código de pase y no
vuelve a anotar a alguien que ya está.

> **La comprobación que conviene hacer igual:** cada tanto, contá los correos de
> confirmación recibidos y compará con las filas de la hoja. Si los números
> coinciden, no se perdió nada. Es un minuto y es la única verificación que no
> depende de que nada haya fallado.

### El acceso desde la invitación

Al pie de la página, después de la fecha, hay un **rombo dorado apagado**.
Ese es el acceso a la hoja, y se abre con **tres toques seguidos** (tenés
segundo y medio entre uno y otro). El rombo se enciende un poco con cada toque,
así sabés que la cuenta va bien; si te detenés, se apaga y vuelve a cero.

No es un capricho: un enlace de un solo clic al pie se pisa sin querer, sobre
todo en el celular, y el invitado que lo pisa se topa de golpe con una pantalla
de Google pidiéndole permisos. Tres toques no pasan por accidente.

Si no configuraste la hoja, el rombo no aparece.

> **Ser discreto no es ser seguro.** Cualquiera que mire el código de la página
> encuentra esa dirección. Quien protege los datos de verdad es Google: la hoja
> está compartida solo con las cuentas de quienes organizan, y si alguien más
> abre el enlace ve un *"no tenés permiso"*. Por eso se puede dejar ahí sin
> problema — pero **no compartas la hoja con "cualquiera que tenga el enlace"**,
> porque eso sí abriría los datos de todos los invitados.

### Cómo cambiar de hoja más adelante

Si la hoja tiene que pasar a otra persona, lo más simple es **transferirle la
propiedad** desde Google Drive (clic derecho sobre el archivo → *Compartir* →
*Transferir propiedad*). El script viaja con la hoja y **no hay que tocar nada
del código**: la dirección sigue siendo la misma.

Si en cambio esa persona prefiere crear la suya, que repita los pasos de arriba
y pegue las dos direcciones nuevas en `01-configuracion.js`. Son dos líneas.

---

## 7. Cómo funciona cada efecto

Nada de esto hace falta para editar la invitación. Está por si te da curiosidad
cómo está hecho.

### El sobre que se abre

Los navegadores **prohíben** que una web arranque música sola: exigen que la
persona toque algo primero. Por eso el sobre no es solo lindo: ese clic es el
permiso que el navegador necesita, y por eso la música arranca justo ahí.

Mientras se ve el sobre, la web aprovecha para descargar la canción, el fondo y
las tipografías. Cuando el sobre se abre, ya está todo listo.

### El fondo que se mueve más lento (parallax)

Es el truco de los dibujos animados: el paisaje lejano se corre despacio y el
personaje rápido. El cerebro lo interpreta como profundidad. Acá el fondo se
mueve al 15 % de la velocidad del contenido.

### Los pétalos que esquivan el mouse

Cada pétalo guarda **dónde está** y **hacia dónde va**. Sesenta veces por
segundo se le suman las fuerzas que lo empujan (la gravedad hacia abajo, el
viento a los costados, y el mouse si está cerca) y se lo dibuja en el lugar
nuevo. Repetido muy rápido, el ojo ve movimiento natural.

El empujón del mouse es más fuerte cuanto más cerca está, y además le hace
girar, porque el aire que mueve la mano no lo empuja derecho: lo voltea.

### Los rosales que trepan

**No están dibujados a mano.** Si lo estuvieran, todos serían idénticos y se
notaría el sello repetido. La computadora los hace crecer paso a paso, como
crecería una planta: en cada paso se tuerce un poco al azar pero conservando
parte del giro anterior (eso hace que serpentee en vez de temblar), el tallo es
grueso abajo y fino arriba, y los brotes salen a alturas desparejas.

Cada planta usa una **semilla** distinta, así que ninguna se parece a otra…
pero cada una se dibuja siempre igual, aunque recargues la página.

### Los ramilletes de las esquinas de arriba

Usan la misma maquinaria que los rosales, pero con otra forma: las dos esquinas
superiores estaban vacías y el relicario quedaba solo en el medio, como un
cuadro colgado en una pared demasiado grande.

Si alguna vez los tocás, **la forma importa más que el dibujo**. Acá ya hubo
adornos que terminaron pareciendo otra cosa, y el motivo es siempre el mismo:
un tallo vertical solo, con un bulto redondo en la punta. Por eso el ramillete
se construye con tres reglas, y ninguna es decorativa:

1. **Abanico, no columna.** Los tallos salen de la esquina abiertos entre casi
   horizontal y casi vertical. Nunca hay un eje único dominante.
2. **Más ancho que alto.** El peso visual se reparte a lo largo, no se apila.
3. **La masa va en la esquina**, no en las puntas. Las rosas grandes se apoyan
   donde nacen los tallos, y de ahí en más todo se afina. Un remate gordo arriba
   de un tallo largo es exactamente lo que hay que evitar.

Están en `07-marco-y-enredaderas.js`, en la parte 4B, con las reglas anotadas
ahí mismo.

### El vaivén de las plantas (resorte amortiguado)

Imaginate la rama atada a su lugar con un resorte: si se desvía, el resorte tira
para devolverla, y el rozamiento del aire le va comiendo velocidad hasta que se
queda quieta. Es la misma fórmula que usan los videojuegos para las capas y el
pelo de los personajes. Acá lo que la desvía es la velocidad del scroll, y
además cada flor tiene su propio resorte para apartarse del mouse.

### El cursor dorado

La flechita del sistema no se puede animar, y cualquier botón la reemplaza por
la manito. Por eso se esconde el cursor real y se mueven dos elementos que lo
siguen: un punto pegado al mouse y un anillo que llega un instante después. Ese
retraso mínimo es lo que se siente elegante.

---

## 8. Glosario

| Palabra | Qué significa |
|---|---|
| **HTML** | El esqueleto: qué cosas hay en la página y en qué orden |
| **CSS** | La ropa: de qué color, de qué tamaño, cómo se anima |
| **JavaScript (JS)** | El cerebro: qué pasa cuando tocás algo |
| **SVG** | Un dibujo hecho de fórmulas en vez de puntitos. Nunca se pixela, por más que lo agrandes |
| **Navegador** | Chrome, Edge, Firefox, Safari |
| **Variable** | Un valor con nombre. Cambiás el valor en un lugar y cambia en todos lados |
| **`localStorage`** | Una libretita donde el navegador anota cosas (acá: el volumen y la confirmación) |
| **EmailJS** | Un servicio que manda correos sin necesidad de tener un servidor |
| **Parallax** | Que el fondo se mueva más lento que el frente, para dar profundidad |
| **Semilla** | Un número de partida que hace que el "azar" sea siempre el mismo |
| **Responsivo** | Que la web se acomode sola al tamaño de la pantalla |

---

## 9. Problemas frecuentes

### La música no arranca sola

Es a propósito de los navegadores, no un error. Arranca cuando se abre el sobre.
Si alguien llega a la invitación con el sobre ya abierto, el primer clic en
cualquier lado la larga.

### No llegan los correos

Falta configurar EmailJS (ver el punto 5). Mientras tanto la invitación funciona
igual: el invitado confirma y ve su pase en pantalla.

### Cambié algo y la página quedó en blanco

Casi siempre es una comilla o una coma borrada sin querer. Deshacé el cambio con
`Ctrl + Z`, o volvé a tu copia de respaldo. Para ver el error exacto: apretá
`F12` en el navegador y mirá la pestaña **Console**, que dice en qué archivo y
en qué línea está el problema.

### Cambié algo pero no se ve

El navegador guarda copias de los archivos para ir más rápido. Apretá
`Ctrl + Shift + R` para que los vuelva a leer todos.

### El mapa se ve en blanco

La dirección de `enlaceDelMapaIncrustado` tiene que terminar en `&output=embed`.
El enlace de "Compartir" de Google Maps **no** sirve para el mapa incrustado.

### El código QR no aparece

El QR se genera con una herramienta que se descarga de internet. Sin conexión no
aparece, pero el pase funciona igual porque el código está escrito abajo.

### Los pétalos y las plantas no se mueven

Si en tu sistema operativo activaste "reducir movimiento" (una opción pensada
para quienes se marean con las animaciones), la web lo respeta y las apaga.

---

## 10. Antes de mandarla a los invitados

- [ ] Revisar la fecha, la hora y el lugar en `codigo/01-configuracion.js`
- [ ] Revisar el mensaje de los papás
- [ ] Poner el enlace real de la mesa de regalos
- [ ] Comprobar que el mapa muestre el salón correcto
- [ ] Configurar EmailJS si querés que lleguen los correos
- [ ] Probarla en una computadora **y** en un celular
- [ ] Confirmar una asistencia de prueba y ver que el pase salga bien
- [ ] Armar los enlaces personalizados de cada invitado (punto 4)

### Si la vas a subir a internet

Cuando la publiques en una dirección real, abrí `index.html` y buscá arriba de
todo las líneas que dicen `og:image` y `twitter:image`. Cambiá
`recursos/vista-previa-compartir.jpg` por la dirección completa, por ejemplo:

```html
<meta property="og:image" content="https://tusitio.com/recursos/vista-previa-compartir.jpg">
```

Sin eso, al compartir el enlace por WhatsApp no se ve la tarjeta con la imagen.

---

Hecho con mucho cariño para Ania 🌹
