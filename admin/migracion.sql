-- ══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN · TABLAS DEL PANEL DE ADMINISTRACIÓN
-- ══════════════════════════════════════════════════════════════════════
--
-- QUÉ ES ESTE ARCHIVO
-- Crea todas las tablas que necesita el panel. La tabla `confirmaciones`
-- que ya existe NO se toca acá: se revisa aparte con diagnostico.php,
-- porque se creó a mano y no sabemos con qué columnas exactas quedó.
--
-- CÓMO SE CORRE
--   1. hPanel de Hostinger → Bases de datos → phpMyAdmin
--   2. Elegí la base u164808416_invitadosxv en la columna izquierda
--   3. Pestaña "SQL", pegá TODO este archivo, botón "Continuar"
--
-- SE PUEDE CORRER DOS VECES SIN MIEDO
-- Todas las tablas usan CREATE TABLE IF NOT EXISTS, así que si ya
-- existen no se borran ni se pisan los datos: simplemente no hace nada.
--
-- POR QUÉ utf8mb4 EN TODAS
-- Es el único juego de caracteres de MySQL que guarda emojis y acentos
-- sin romperlos. La tabla vieja usa lo mismo (lo fija confirmar.php al
-- conectarse), así que todo queda parejo.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. CUENTAS Y SISTEMA
-- ══════════════════════════════════════════════════════════════════════

-- Quiénes pueden entrar al panel.
CREATE TABLE IF NOT EXISTS usuarios (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  correo         VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  -- 'admin' ve todo. 'entrada' solo escanea pases el día del evento.
  rol            ENUM('admin','entrada') NOT NULL DEFAULT 'admin',
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Dos cuentas no pueden compartir correo: es con lo que se entra.
  UNIQUE KEY correo_unico (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Sesiones abiertas. Guarda la HUELLA del token, nunca el token.
CREATE TABLE IF NOT EXISTS sesiones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  caduca_en   DATETIME NOT NULL,
  ultimo_uso  DATETIME NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Índice único: el token es por lo que se busca en cada petición, así
  -- que sin esto cada llamada al panel recorrería la tabla entera.
  UNIQUE KEY token_unico (token_hash),
  KEY por_usuario (usuario_id),
  -- Si se borra un usuario, sus sesiones se van con él automáticamente.
  CONSTRAINT sesion_de_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Códigos para restablecer la contraseña por correo ("olvidé mi
-- contraseña"). Igual que `sesiones`, guarda la HUELLA del código, nunca
-- el código en claro: si alguien llegara a leer la tabla, no podría
-- usarlo para entrar.
CREATE TABLE IF NOT EXISTS recuperaciones_clave (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  expira_en   DATETIME NOT NULL,
  usado       TINYINT(1) NOT NULL DEFAULT 0,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_usuario (usuario_id),
  CONSTRAINT recuperacion_de_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Intentos fallidos de login, para frenar a quien prueba contraseñas.
CREATE TABLE IF NOT EXISTS intentos_login (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  ip      VARCHAR(45) NOT NULL,
  correo  VARCHAR(190) NOT NULL DEFAULT '',
  cuando  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_ip_y_fecha (ip, cuando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quién cambió qué y cuándo. El nombre se copia además del id para que
-- el historial siga siendo legible aunque después se borre la cuenta.
CREATE TABLE IF NOT EXISTS bitacora (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NOT NULL DEFAULT 0,
  usuario_nombre  VARCHAR(100) NOT NULL DEFAULT '',
  accion          VARCHAR(40) NOT NULL,
  tabla_afectada  VARCHAR(60) NOT NULL,
  fila_id         INT NOT NULL DEFAULT 0,
  detalle         VARCHAR(500) NOT NULL DEFAULT '',
  cuando          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_fecha (cuando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Notas libres. Se pueden pegar a un proveedor o gasto concreto.
CREATE TABLE IF NOT EXISTS notas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL DEFAULT '',
  cuerpo        TEXT,
  etiqueta      VARCHAR(40) NOT NULL DEFAULT '',
  fijada        TINYINT(1) NOT NULL DEFAULT 0,
  -- A qué se refiere la nota, si se refiere a algo: 'proveedor', 'gasto'…
  atada_a_tipo  VARCHAR(30) NOT NULL DEFAULT '',
  atada_a_id    INT NOT NULL DEFAULT 0,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  editado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY por_atadura (atada_a_tipo, atada_a_id),
  -- Índice de texto completo para el buscador de notas.
  FULLTEXT KEY busqueda (titulo, cuerpo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Archivos subidos: contratos y comprobantes.
-- El archivo real vive en admin/archivos/ con el nombre de nombre_disco,
-- que es aleatorio. El nombre original solo se usa para mostrarlo.
CREATE TABLE IF NOT EXISTS archivos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre_real   VARCHAR(255) NOT NULL,
  nombre_disco  VARCHAR(80) NOT NULL,
  tipo_mime     VARCHAR(100) NOT NULL DEFAULT '',
  tamano_bytes  INT NOT NULL DEFAULT 0,
  atado_a_tipo  VARCHAR(30) NOT NULL DEFAULT '',
  atado_a_id    INT NOT NULL DEFAULT 0,
  subido_por    INT NOT NULL DEFAULT 0,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY disco_unico (nombre_disco),
  KEY por_atadura (atado_a_tipo, atado_a_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Ajustes que el panel necesita guardar y que NO pueden ir al .env.
--
-- POR QUÉ EXISTE ESTA TABLA
-- El sitio se despliega con git y el .env está en .gitignore (bien: tiene
-- las contraseñas). O sea que agregarle una variable nueva obliga a entrar
-- a mano por hPanel. Las claves VAPID de las notificaciones se generan
-- solas la primera vez y se guardan acá, sin tocar ningún archivo.
CREATE TABLE IF NOT EXISTS ajustes (
  clave  VARCHAR(60) NOT NULL PRIMARY KEY,
  valor  TEXT,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Alarmas con fecha Y HORA exactas.
--
-- EN QUÉ SE DIFERENCIAN DEL RECORDATORIO DIARIO
-- El cron de las 8 manda un resumen de lo que vence pronto. Esto es otra
-- cosa: "el jueves a las 15:30 llamar al salón", y que suene el jueves a
-- las 15:30. Para eso hace falta un cron que corra cada pocos minutos,
-- no una vez al día.
CREATE TABLE IF NOT EXISTS alarmas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  detalle       VARCHAR(500) NOT NULL DEFAULT '',
  -- Cuándo tiene que sonar.
  cuando        DATETIME NOT NULL,
  -- 'una_vez' se apaga sola al sonar. Las demás se reprograman.
  repetir       ENUM('una_vez','diaria','semanal','mensual')
                NOT NULL DEFAULT 'una_vez',
  -- Por dónde avisa. El correo siempre llega; la notificación depende
  -- de que el permiso siga concedido y la app instalada.
  por_correo    TINYINT(1) NOT NULL DEFAULT 1,
  por_push      TINYINT(1) NOT NULL DEFAULT 1,
  -- A qué registro pertenece, si pertenece a alguno: 'pago', 'tarea',
  -- 'agenda'… Sirve para que la notificación lleve a su ficha.
  atada_a_tipo  VARCHAR(30) NOT NULL DEFAULT '',
  atada_a_id    INT NOT NULL DEFAULT 0,
  -- Cuándo sonó por última vez. NULL = todavía no sonó.
  sonada_en     DATETIME DEFAULT NULL,
  activa        TINYINT(1) NOT NULL DEFAULT 1,
  creada_por    INT NOT NULL DEFAULT 0,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- El cron busca por "activa y ya pasó su hora": este índice es el que
  -- hace que revisar cada diez minutos no cueste nada.
  KEY por_disparar (activa, cuando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Un renglón por teléfono que aceptó recibir avisos.
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  endpoint    VARCHAR(500) NOT NULL,
  clave_p256  VARCHAR(200) NOT NULL,
  clave_auth  VARCHAR(100) NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY endpoint_unico (endpoint(191)),
  KEY por_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 2. DINERO
-- ══════════════════════════════════════════════════════════════════════

-- Los distintos escenarios de presupuesto que Lucila puede mantener a la
-- vez ("Plan A", "Plan B con menos invitados"…). Uno solo está activo:
-- ese es el que se ve y se edita en el panel. categorias_gasto y gastos
-- (más abajo) cuelgan de acá con presupuesto_id.
CREATE TABLE IF NOT EXISTS presupuestos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(80) NOT NULL,
  activo     TINYINT(1) NOT NULL DEFAULT 0,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- El primero, ya activo, para que las categorías y gastos que ya
-- existían en una instalación vieja tengan dónde caer (ver
-- presupuesto_id DEFAULT 1 en instalar.php).
INSERT IGNORE INTO presupuestos (id, nombre, activo)
VALUES (1, 'Presupuesto principal', 1);


-- Categorías con TECHO. De acá salen las alertas de sobregiro.
CREATE TABLE IF NOT EXISTS categorias_gasto (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(80) NOT NULL,
  techo   DECIMAL(12,2) NOT NULL DEFAULT 0,
  color   VARCHAR(20) NOT NULL DEFAULT '',
  orden   INT NOT NULL DEFAULT 0,
  UNIQUE KEY nombre_unico (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quién apadrina qué. Esta tabla es la que hace honesto al presupuesto.
CREATE TABLE IF NOT EXISTS padrinos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  telefono     VARCHAR(40) NOT NULL DEFAULT '',
  correo       VARCHAR(190) NOT NULL DEFAULT '',
  -- Qué apadrina: 'Vals', 'Pastel', 'Ramo', 'Música', 'Limosina'…
  apadrina     VARCHAR(120) NOT NULL DEFAULT '',
  -- 'dinero' = aporta una cantidad. 'especie' = aporta la cosa en sí.
  tipo_aporte  ENUM('dinero','especie') NOT NULL DEFAULT 'dinero',
  monto        DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- 'hablado'   = dijo que sí, nada firme todavía
  -- 'confirmado'= comprometido en firme
  -- 'entregado' = ya puso el dinero o la cosa
  estado       ENUM('hablado','confirmado','entregado') NOT NULL DEFAULT 'hablado',
  fecha_entrega DATE DEFAULT NULL,
  notas        TEXT,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Proveedores contratados.
CREATE TABLE IF NOT EXISTS proveedores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  servicio      VARCHAR(120) NOT NULL DEFAULT '',
  contacto      VARCHAR(150) NOT NULL DEFAULT '',
  telefono      VARCHAR(40) NOT NULL DEFAULT '',
  correo        VARCHAR(190) NOT NULL DEFAULT '',
  monto_total   DECIMAL(12,2) NOT NULL DEFAULT 0,
  anticipo      DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado        ENUM('candidato','contratado','pagado','cancelado')
                NOT NULL DEFAULT 'candidato',
  notas         TEXT,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Cotizaciones para comparar ANTES de contratar.
CREATE TABLE IF NOT EXISTS cotizaciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  servicio     VARCHAR(120) NOT NULL,
  proveedor    VARCHAR(150) NOT NULL,
  telefono     VARCHAR(40) NOT NULL DEFAULT '',
  monto        DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Casi todos los salones cobran POR PERSONA, no un precio cerrado. Sin
  -- esta distinción no se puede comparar nada: $550 por persona y $60,000
  -- fijos son números que no se pueden mirar uno al lado del otro.
  tipo_precio  ENUM('por_persona','fijo') NOT NULL DEFAULT 'fijo',
  precio_pp    DECIMAL(12,2) NOT NULL DEFAULT 0,
  que_incluye  TEXT,
  vigencia     DATE DEFAULT NULL,
  elegida      TINYINT(1) NOT NULL DEFAULT 0,
  notas        TEXT,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_servicio (servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Cada renglón de una cotización: qué trae incluido y qué se cobra aparte.
--
-- POR QUÉ HACE FALTA ESTA TABLA
-- El paquete más barato por persona casi nunca es el más barato al final.
-- Uno incluye el DJ y el otro lo cobra $17,900 aparte; uno da la copa de
-- vino y el otro la cobra $90 por persona. Comparar solo el precio base
-- lleva a elegir mal. Acá se anota cada cosa con su tipo de costo, y la
-- calculadora arma el total de verdad.
CREATE TABLE IF NOT EXISTS cotizacion_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id  INT NOT NULL,
  concepto       VARCHAR(200) NOT NULL,
  -- Cómo se cobra:
  --   por_persona → monto × cantidad de invitados
  --   fijo        → monto, sin importar cuántos sean
  --   por_unidad  → monto × unidades (centros de mesa, por ejemplo)
  --   porcentaje  → monto % sobre el total (la comisión de la tarjeta)
  tipo           ENUM('por_persona','fijo','por_unidad','porcentaje')
                 NOT NULL DEFAULT 'fijo',
  monto          DECIMAL(12,2) NOT NULL DEFAULT 0,
  unidades       INT NOT NULL DEFAULT 1,
  -- Incluido = viene en el paquete y no suma. Se guarda igual, porque
  -- saber QUÉ incluye cada uno es la mitad de la comparación.
  incluido       TINYINT(1) NOT NULL DEFAULT 0,
  -- Un extra puede estar disponible pero no quererse: se deja apagado
  -- sin borrarlo, para poder probar el "¿y si le agrego el mariachi?".
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  categoria      VARCHAR(60) NOT NULL DEFAULT '',
  notas          VARCHAR(300) NOT NULL DEFAULT '',
  orden          INT NOT NULL DEFAULT 50,
  KEY por_cotizacion (cotizacion_id),
  CONSTRAINT item_de_cotizacion FOREIGN KEY (cotizacion_id)
    REFERENCES cotizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Recibos de pago a proveedores. Existen SOLOS: un recibo no necesita
-- ningún contrato para existir. contrato_id queda para cuando se quiera
-- vincular uno a mano (Fase C), nunca como requisito.
--
-- POR QUÉ EL NÚMERO SE GUARDA ACÁ Y NO SE CALCULA AL VUELO
-- Si el número de recibo se calculara como "el más alto + 1" en el
-- momento de generar, dos clics casi al mismo tiempo (o un doble toque
-- por mala señal) podrían leer el mismo máximo y repetir el número. Acá
-- se guarda la fila completa dentro de la misma transacción que la
-- calcula (ver admin/api/recibos.php), así que el UNIQUE de abajo es la
-- red de seguridad real: si algo se repite, MySQL lo rechaza en vez de
-- guardar dos recibos con el mismo número.
CREATE TABLE IF NOT EXISTS recibos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  numero        VARCHAR(30) NOT NULL,
  proveedor_id  INT NOT NULL,
  contrato_id   INT DEFAULT NULL,
  -- Opcional, igual que contrato_id: si Lucila elige "también registrar
  -- como pago" al generar el recibo, acá queda el pago real de
  -- Presupuesto que este recibo respalda (ver admin/api/recibos.php).
  -- Un recibo sigue existiendo perfectamente sin esto.
  pago_id       INT DEFAULT NULL,
  fecha         DATE NOT NULL,
  concepto      VARCHAR(300) NOT NULL DEFAULT '',
  monto         DECIMAL(12,2) NOT NULL DEFAULT 0,
  forma_pago    VARCHAR(60) NOT NULL DEFAULT '',
  -- Solo para seguimiento propio: no bloquea nada ni cambia el PDF ya
  -- generado. "pendiente" es "todavía no lo entregué/mandé".
  estado        ENUM('pendiente','enviado','firmado') NOT NULL DEFAULT 'pendiente',
  archivo_id    INT DEFAULT NULL,
  creado_por    INT DEFAULT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY numero_unico (numero),
  KEY por_proveedor (proveedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Contratos formales de prestación de servicios. Son OPCIONALES por
-- completo: un proveedor puede tener cero, uno o varios recibos sin
-- haber pasado nunca por acá (ver `recibos` más arriba). Nunca se exige
-- ni se comprueba su existencia antes de dejar generar un recibo.
CREATE TABLE IF NOT EXISTS contratos (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  numero                VARCHAR(30) DEFAULT NULL,
  proveedor_id          INT NOT NULL,
  descripcion_servicio  TEXT,
  fecha_inicio          DATE DEFAULT NULL,
  fecha_firma           DATE NOT NULL,
  monto_total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  forma_pago            VARCHAR(300) NOT NULL DEFAULT '',
  lugar                 VARCHAR(200) NOT NULL DEFAULT '',
  horario               VARCHAR(150) NOT NULL DEFAULT '',
  clausulas_adicionales TEXT,
  penalizaciones        TEXT,
  cancelacion           TEXT,
  jurisdiccion          VARCHAR(150) NOT NULL DEFAULT '',
  archivo_id            INT DEFAULT NULL,
  creado_por            INT DEFAULT NULL,
  creado_en             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY numero_unico (numero),
  KEY por_proveedor (proveedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Gastos. padrino_id es lo que separa "lo que cuesta" de "lo que pago".
CREATE TABLE IF NOT EXISTS gastos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  concepto       VARCHAR(200) NOT NULL,
  categoria_id   INT DEFAULT NULL,
  proveedor_id   INT DEFAULT NULL,
  -- Si tiene padrino, este gasto NO sale del bolsillo de la familia.
  padrino_id     INT DEFAULT NULL,
  presupuestado  DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Se llama monto_real y no "real" porque REAL es palabra reservada de
  -- MySQL y obligaría a escribirla con acentos graves en cada consulta.
  monto_real     DECIMAL(12,2) NOT NULL DEFAULT 0,
  notas          TEXT,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_categoria (categoria_id),
  KEY por_padrino (padrino_id),
  -- ON DELETE SET NULL: si se borra una categoría, el gasto sobrevive
  -- sin categoría. Borrar una categoría no debe borrar dinero.
  CONSTRAINT gasto_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias_gasto(id) ON DELETE SET NULL,
  CONSTRAINT gasto_proveedor FOREIGN KEY (proveedor_id)
    REFERENCES proveedores(id) ON DELETE SET NULL,
  CONSTRAINT gasto_padrino FOREIGN KEY (padrino_id)
    REFERENCES padrinos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Pagos concretos contra un gasto. Un gasto puede pagarse en partes.
CREATE TABLE IF NOT EXISTS pagos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  gasto_id       INT DEFAULT NULL,
  concepto       VARCHAR(200) NOT NULL DEFAULT '',
  monto          DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_limite   DATE DEFAULT NULL,
  fecha_pagado   DATE DEFAULT NULL,
  estado         ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
  metodo         VARCHAR(60) NOT NULL DEFAULT '',
  comprobante_id INT DEFAULT NULL,
  notas          TEXT,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_gasto (gasto_id),
  -- Los recordatorios buscan por estado + fecha límite: este índice es
  -- el que hace que el cron diario no tenga que leer la tabla entera.
  KEY por_vencimiento (estado, fecha_limite),
  CONSTRAINT pago_gasto FOREIGN KEY (gasto_id)
    REFERENCES gastos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 3. ORGANIZACIÓN
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tareas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  detalle       TEXT,
  responsable   VARCHAR(100) NOT NULL DEFAULT '',
  fecha_limite  DATE DEFAULT NULL,
  prioridad     ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  estado        ENUM('pendiente','haciendo','hecha') NOT NULL DEFAULT 'pendiente',
  -- A qué registro pertenece, si pertenece a alguno — mismo patrón y
  -- mismas opciones que ya usa `notas` (ver guardar_nota en
  -- planificador.php). Antes de esta columna, una tarea como "Llamar
  -- al salón" no tenía forma de saber cuál es "el salón" en
  -- `proveedores`; había que adivinarlo por el título.
  atada_a_tipo  VARCHAR(30) NOT NULL DEFAULT '',
  atada_a_id    INT NOT NULL DEFAULT 0,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_estado_y_fecha (estado, fecha_limite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Fechas clave del camino hasta el 24 de octubre de 2026.
CREATE TABLE IF NOT EXISTS agenda (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  detalle       TEXT,
  fecha         DATE NOT NULL,
  hora          TIME DEFAULT NULL,
  lugar         VARCHAR(200) NOT NULL DEFAULT '',
  -- Cuántos días antes avisar por notificación. 0 = no avisar.
  avisar_dias   INT NOT NULL DEFAULT 0,
  avisado_en    DATE DEFAULT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- El minuto a minuto del día del evento.
CREATE TABLE IF NOT EXISTS cronograma (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  hora         TIME NOT NULL,
  momento      VARCHAR(200) NOT NULL,
  detalle      TEXT,
  responsable  VARCHAR(100) NOT NULL DEFAULT '',
  KEY por_hora (hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS mesas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(60) NOT NULL,
  capacidad  INT NOT NULL DEFAULT 10,
  ubicacion  VARCHAR(120) NOT NULL DEFAULT '',
  notas      TEXT,
  UNIQUE KEY nombre_unico (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quién se sienta dónde. Apunta a confirmaciones por id.
-- No lleva llave foránea a propósito: `confirmaciones` es una tabla que
-- ya existía y todavía no sabemos si tiene id ni de qué tipo. Se agrega
-- después, cuando diagnostico.php confirme cómo está hecha.
CREATE TABLE IF NOT EXISTS asignacion_mesas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  confirmacion_id  INT NOT NULL,
  mesa_id          INT NOT NULL,
  -- Cuántos asientos ocupa esta confirmación en la mesa (adultos+niños).
  lugares          INT NOT NULL DEFAULT 1,
  -- Una asignación FIJADA la puso una persona a mano y la autoasignación
  -- no la toca nunca. Es lo que permite acomodar a mano lo que importa y
  -- dejar que el resto se ordene solo.
  fijada           TINYINT(1) NOT NULL DEFAULT 0,
  notas            VARCHAR(200) NOT NULL DEFAULT '',
  UNIQUE KEY una_mesa_por_confirmacion (confirmacion_id),
  KEY por_mesa (mesa_id),
  CONSTRAINT asignacion_mesa FOREIGN KEY (mesa_id)
    REFERENCES mesas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Grupos de invitados: "Familia Zelaya", "Amigos de Ania", "Trabajo de
-- papá". La autoasignación intenta sentar juntos a los del mismo grupo,
-- que es la regla que más importa en una fiesta.
CREATE TABLE IF NOT EXISTS grupos_invitados (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(80) NOT NULL,
  color   VARCHAR(20) NOT NULL DEFAULT '',
  -- Los de orden más bajo se acomodan primero, o sea que se quedan con
  -- las mejores mesas. Sirve para "la familia cerca de la pista".
  orden   INT NOT NULL DEFAULT 50,
  notas   TEXT,
  UNIQUE KEY nombre_unico (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Lo que hay que saber de cada invitado para poder sentarlo bien.
-- Va en tabla aparte y no en `confirmaciones` porque esa tabla la llena
-- el formulario público y no conviene mezclarle datos de organización.
CREATE TABLE IF NOT EXISTS preferencias_invitado (
  confirmacion_id INT NOT NULL PRIMARY KEY,
  grupo_id        INT DEFAULT NULL,
  -- Sillas de más: la abuela que necesita lugar para el andador, la
  -- bebé con su silla alta, alguien que viene con acompañante sin
  -- confirmar. Se suman a los lugares que ocupa.
  sillas_extra    INT NOT NULL DEFAULT 0,
  -- Si está puesto, esta persona va SIEMPRE a esa mesa.
  mesa_preferida  INT DEFAULT NULL,
  notas           VARCHAR(300) NOT NULL DEFAULT '',
  KEY por_grupo (grupo_id),
  CONSTRAINT preferencia_grupo FOREIGN KEY (grupo_id)
    REFERENCES grupos_invitados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quién NO puede sentarse con quién. Siempre hay un tío.
--
-- Se guarda una sola fila por par, con el id más chico primero, para no
-- terminar con "A no va con B" y "B no va con A" como dos reglas
-- distintas que después se contradicen.
--
-- invitado_a/invitado_b son ids de CONFIRMACIÓN (la familia entera).
-- acompanante_a/acompanante_b (ver más abajo, se agregan por
-- instalar.php) son la versión fina: cuando los dos están puestos, la
-- regla es entre esas dos PERSONAS puntuales, aunque sean de la misma
-- familia — "el tío Fulano no con el tío Mengano" sin tener que separar
-- a las dos familias enteras si el resto se lleva bien.
CREATE TABLE IF NOT EXISTS incompatibilidades (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  invitado_a INT NOT NULL,
  invitado_b INT NOT NULL,
  motivo     VARCHAR(200) NOT NULL DEFAULT '',
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY un_par (invitado_a, invitado_b),
  KEY por_a (invitado_a),
  KEY por_b (invitado_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────
-- REGLAS POR PERSONA, NO SOLO POR FAMILIA (Fase 9)
--
-- POR QUÉ HACÍA FALTA
-- Hasta acá, `preferencias_invitado` e `incompatibilidades` trabajan a
-- nivel de CONFIRMACIÓN: la familia entera se mueve como un solo bloque
-- a una mesa. Sirve para "los amigos de baile juntos" o "los tíos que
-- se pelean" —cada uno suele confirmar por su cuenta, así que ya
-- funciona— pero no alcanza para "el hijo adolescente de esta familia
-- se sienta con los jóvenes, sus papás con los adultos": ahí hace
-- falta poder sacar a UNA persona de su familia sin tocar al resto.
--
-- CÓMO FUNCIONA
-- Una fila en `acompanante_reglas` para una persona SIGNIFICA que esa
-- persona se saca del bloque de su familia y se sienta por su cuenta
-- (con su propio grupo o su propia mesa preferida). Sin fila, sigue
-- exactamente igual que hasta ahora: viaja con el resto de su familia.
-- Es aditivo a propósito — nadie que no tenga una fila acá nota ningún
-- cambio de comportamiento.
CREATE TABLE IF NOT EXISTS acompanante_reglas (
  acompanante_id INT NOT NULL PRIMARY KEY,
  grupo_id       INT DEFAULT NULL,
  mesa_preferida INT DEFAULT NULL,
  notas          VARCHAR(300) NOT NULL DEFAULT '',
  KEY por_grupo (grupo_id),
  CONSTRAINT acomp_regla_grupo FOREIGN KEY (grupo_id)
    REFERENCES grupos_invitados(id) ON DELETE SET NULL,
  CONSTRAINT acomp_regla_acompanante FOREIGN KEY (acompanante_id)
    REFERENCES acompanantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Dónde queda sentada una persona que se sacó de su familia (tiene fila
-- en acompanante_reglas). Tabla APARTE de asignacion_mesas, no una
-- columna nueva ahí: asignacion_mesas tiene UNIQUE(confirmacion_id) —
-- una fila por familia — y forzar ahí una excepción por persona
-- hubiera significado tocar esa llave única en una tabla que ya tiene
-- datos reales de producción. Separada, no hay nada que migrar y nada
-- que romper.
CREATE TABLE IF NOT EXISTS asignacion_mesas_persona (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  acompanante_id INT NOT NULL,
  mesa_id        INT NOT NULL,
  fijada         TINYINT(1) NOT NULL DEFAULT 0,
  notas          VARCHAR(200) NOT NULL DEFAULT '',
  UNIQUE KEY una_mesa_por_persona (acompanante_id),
  KEY por_mesa (mesa_id),
  CONSTRAINT asig_persona_acompanante FOREIGN KEY (acompanante_id)
    REFERENCES acompanantes(id) ON DELETE CASCADE,
  CONSTRAINT asig_persona_mesa FOREIGN KEY (mesa_id)
    REFERENCES mesas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Chambelanes y damas.
CREATE TABLE IF NOT EXISTS corte_honor (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  rol        ENUM('chambelan','dama','pareja_vals','otro') NOT NULL DEFAULT 'chambelan',
  telefono   VARCHAR(40) NOT NULL DEFAULT '',
  talla      VARCHAR(30) NOT NULL DEFAULT '',
  -- Si ya se le entregó o mandó a hacer el traje o vestido.
  vestuario  ENUM('pendiente','medido','listo') NOT NULL DEFAULT 'pendiente',
  notas      TEXT,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS ensayos (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  fecha    DATE NOT NULL,
  hora     TIME DEFAULT NULL,
  lugar    VARCHAR(200) NOT NULL DEFAULT '',
  notas    TEXT,
  KEY por_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Quién fue a qué ensayo.
CREATE TABLE IF NOT EXISTS asistencia_ensayos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ensayo_id  INT NOT NULL,
  miembro_id INT NOT NULL,
  asistio    TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY una_vez_por_ensayo (ensayo_id, miembro_id),
  CONSTRAINT asistencia_ensayo FOREIGN KEY (ensayo_id)
    REFERENCES ensayos(id) ON DELETE CASCADE,
  CONSTRAINT asistencia_miembro FOREIGN KEY (miembro_id)
    REFERENCES corte_honor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Regalos recibidos. `origen` distingue lo que vino de la lista de
-- Amazon de lo que llegó por fuera, y `correo_origen` guarda el aviso
-- de compra que detectó el panel en el buzón, para no dar de alta dos
-- veces el mismo regalo.
CREATE TABLE IF NOT EXISTS regalos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  de_parte_de    VARCHAR(150) NOT NULL DEFAULT '',
  descripcion    VARCHAR(300) NOT NULL DEFAULT '',
  origen         ENUM('amazon','directo','efectivo','otro') NOT NULL DEFAULT 'directo',
  monto          DECIMAL(12,2) NOT NULL DEFAULT 0,
  recibido_en    DATE DEFAULT NULL,
  agradecido     TINYINT(1) NOT NULL DEFAULT 0,
  correo_origen  VARCHAR(190) NOT NULL DEFAULT '',
  notas          TEXT,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_agradecido (agradecido),
  KEY por_correo_origen (correo_origen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS foraneos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  telefono     VARCHAR(40) NOT NULL DEFAULT '',
  ciudad       VARCHAR(120) NOT NULL DEFAULT '',
  hospedaje    VARCHAR(200) NOT NULL DEFAULT '',
  llega        DATE DEFAULT NULL,
  se_va        DATE DEFAULT NULL,
  transporte   VARCHAR(200) NOT NULL DEFAULT '',
  notas        TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 4. CEREMONIA Y DETALLES PERSONALES
-- ══════════════════════════════════════════════════════════════════════

-- Datos de la misa. Pensada para tener UNA sola fila.
CREATE TABLE IF NOT EXISTS ceremonia (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  iglesia    VARCHAR(200) NOT NULL DEFAULT '',
  direccion  VARCHAR(300) NOT NULL DEFAULT '',
  fecha      DATE DEFAULT NULL,
  hora       TIME DEFAULT NULL,
  sacerdote  VARCHAR(150) NOT NULL DEFAULT '',
  telefono   VARCHAR(40) NOT NULL DEFAULT '',
  costo      DECIMAL(12,2) NOT NULL DEFAULT 0,
  notas      TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Los papeles que pide la iglesia, cada uno con su estado.
CREATE TABLE IF NOT EXISTS requisitos_ceremonia (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  requisito   VARCHAR(200) NOT NULL,
  estado      ENUM('pendiente','en_tramite','listo') NOT NULL DEFAULT 'pendiente',
  fecha_limite DATE DEFAULT NULL,
  notas       TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Canciones por momento, y la lista negra para el DJ.
CREATE TABLE IF NOT EXISTS musica (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  cancion  VARCHAR(200) NOT NULL,
  artista  VARCHAR(150) NOT NULL DEFAULT '',
  momento  ENUM('vals','entrada','brindis','pastel','baile','prohibida','otro')
           NOT NULL DEFAULT 'baile',
  orden    INT NOT NULL DEFAULT 0,
  enlace   VARCHAR(400) NOT NULL DEFAULT '',
  notas    TEXT,
  KEY por_momento (momento, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Pruebas de vestido, maquillaje y peinado.
CREATE TABLE IF NOT EXISTS citas_arreglo (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  tipo    ENUM('vestido','maquillaje','peinado','zapatos','otro')
          NOT NULL DEFAULT 'vestido',
  titulo  VARCHAR(200) NOT NULL DEFAULT '',
  fecha   DATE DEFAULT NULL,
  hora    TIME DEFAULT NULL,
  lugar   VARCHAR(200) NOT NULL DEFAULT '',
  costo   DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado  ENUM('pendiente','hecha','cancelada') NOT NULL DEFAULT 'pendiente',
  notas   TEXT,
  KEY por_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- La lista de tomas imprescindibles para fotógrafo y video.
CREATE TABLE IF NOT EXISTS tomas_foto (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  toma      VARCHAR(300) NOT NULL,
  momento   VARCHAR(80) NOT NULL DEFAULT '',
  personas  VARCHAR(300) NOT NULL DEFAULT '',
  hecha     TINYINT(1) NOT NULL DEFAULT 0,
  orden     INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 5. DATOS INICIALES
-- ══════════════════════════════════════════════════════════════════════
--
-- Categorías de gasto típicas de unos XV, con techo en 0 para que cada
-- quien ponga el suyo desde el panel. INSERT IGNORE evita duplicarlas si
-- este archivo se corre dos veces.

INSERT IGNORE INTO categorias_gasto (nombre, techo, orden) VALUES
  ('Salón y montaje',      0, 1),
  ('Banquete y bebidas',   0, 2),
  ('Vestido y arreglo',    0, 3),
  ('Música y DJ',          0, 4),
  ('Foto y video',         0, 5),
  ('Decoración y flores',  0, 6),
  ('Pastel y mesa dulce',  0, 7),
  ('Iglesia y ceremonia',  0, 8),
  ('Invitaciones',         0, 9),
  ('Recuerdos',            0, 10),
  ('Transporte',           0, 11),
  ('Otros',                0, 99);


-- ══════════════════════════════════════════════════════════════════════
-- 6. QUE NADA SE GUARDE DOS VECES
-- ══════════════════════════════════════════════════════════════════════
--
-- Sin señal, la app guarda los cambios en una cola del teléfono y los
-- reintenta cuando vuelve internet. El peligro es que el envío llegue y
-- lo que se pierda sea la RESPUESTA: la app cree que falló, lo manda de
-- nuevo, y donde había un gasto quedan dos.
--
-- Cada envío viaja con una clave única que inventa el teléfono. Acá se
-- anota qué claves ya se atendieron y qué se contestó. Si llega una
-- repetida, se devuelve la respuesta guardada sin volver a tocar nada.
--
-- Ver respuestaYaDada() y guardarRespuestaDada() en api/_lib/bd.php.

CREATE TABLE IF NOT EXISTS escrituras_hechas (
  -- La clave la pone el cliente. Es la ÚNICA parte del sistema que sabe
  -- que dos envíos son el mismo intento y no dos decisiones distintas.
  clave      VARCHAR(64) NOT NULL PRIMARY KEY,
  -- La respuesta tal cual se devolvió, para poder repetirla igual.
  respuesta  MEDIUMTEXT,
  cuando     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Para poder borrar las viejas sin recorrer la tabla entera.
  KEY por_fecha (cuando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 7. QUÉ LE MANDAMOS A CADA PROVEEDOR
-- ══════════════════════════════════════════════════════════════════════
--
-- compartir.php sabe armar siete paquetes de texto listos para WhatsApp
-- (banquete, salón, fotógrafo, DJ, iglesia, modista, invitados). Esta
-- columna dice cuál le toca a cada proveedor, para poder mandarle LO
-- SUYO de un toque en vez de elegirlo a mano cada vez.
--
-- Vacío = a este no se le manda nada automático.

-- ⚠️ La columna NO se agrega desde acá: "ADD COLUMN IF NOT EXISTS" no
-- existe en MySQL, y sin el IF NOT EXISTS este archivo dejaría de poder
-- correrse dos veces. La agrega api/instalar.php, que antes comprueba si
-- ya está (ver $agregarColumna).


-- Qué se mandó, a quién y cuándo.
--
-- La `huella` es un hash del texto que se envió. Sirve para una sola
-- cosa, pero importante: comparar el texto de hoy contra el de aquella
-- vez y avisar "esto cambió desde que se lo mandaste". Es lo que evita
-- que el DJ toque una canción agregada a las prohibidas DESPUÉS de
-- haberle pasado la lista.
--
-- ⚠️ Esta tabla registra que se ABRIÓ WhatsApp con el texto puesto, no
-- que el mensaje se haya enviado: eso pasa dentro de WhatsApp y el panel
-- no tiene forma de saberlo.

CREATE TABLE IF NOT EXISTS envios_proveedor (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  paquete       VARCHAR(20) NOT NULL,
  huella        CHAR(64) NOT NULL,
  enviado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id    INT DEFAULT NULL,
  KEY por_proveedor (proveedor_id, paquete, enviado_en),
  CONSTRAINT envio_de_proveedor FOREIGN KEY (proveedor_id)
    REFERENCES proveedores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ══════════════════════════════════════════════════════════════════════
-- 8. EL PLANO DEL SALÓN Y EL DESHACER DEL ACOMODO
-- ══════════════════════════════════════════════════════════════════════
--
-- A la tabla `mesas` le faltan cuatro columnas. NO se agregan desde acá
-- (ADD COLUMN IF NOT EXISTS no existe en MySQL): las agrega
-- api/instalar.php, que antes comprueba si ya están.
--
--   fila, columna → dónde está la mesa en el salón. Sin esto, el panel
--     mostraba una lista y no había forma de saber cuál mesa quedaba
--     pegada a la pista y cuál en el fondo, que es lo único que importa
--     al decidir quién se sienta dónde.
--   prioridad → qué tan buena es esa ubicación. El motor de acomodo
--     promete que "los grupos de orden más bajo se quedan con las
--     mejores mesas", pero antes ordenaba las mesas por NOMBRE, así que
--     "la mejor mesa" terminaba siendo la que se llamaba Mesa 1.
--   perfil → si es una mesa pensada para niños o para gente mayor.


-- Una foto del acomodo antes de cambiarlo.
--
-- POR QUÉ HACE FALTA
-- El botón de acomodar solo mueve a todo el mundo de una vez. Sin una
-- forma de volver atrás, usarlo da miedo — y una función que da miedo no
-- se usa, por buena que sea. Con el deshacer se puede probar.
--
-- Se guardan las últimas 5 y las viejas se van solas.

CREATE TABLE IF NOT EXISTS acomodo_respaldo (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  -- El contenido entero de asignacion_mesas, en JSON.
  contenido  MEDIUMTEXT NOT NULL,
  -- Qué lo produjo: 'antes_de_acomodar', 'antes_de_vaciar'…
  motivo     VARCHAR(40) NOT NULL DEFAULT '',
  cuantos    INT NOT NULL DEFAULT 0,
  usuario_id INT DEFAULT NULL,
  cuando     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_fecha (cuando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────
-- LOS NOMBRES DENTRO DE CADA CONFIRMACIÓN
--
-- POR QUÉ HACE FALTA
-- Una confirmación dice "3 adultos y 1 niño" y ahí se queda. Esos cuatro
-- son personas con nombre, y no saberlo se paga en la puerta (a quién se
-- deja pasar), en las mesas (sentar personas, no bultos) y en el
-- banquete (de quién es la alergia).
--
-- ES OPCIONAL Y PROGRESIVO A PROPÓSITO
-- El número de la confirmación sigue mandando: nombrar 0, 2 o los 4 no
-- lo cambia. confirmaciones.php se encarga de no dejar cargar más
-- nombres que los que la confirmación declaró.
CREATE TABLE IF NOT EXISTS acompanantes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  confirmacion_id  INT NOT NULL,
  nombre           VARCHAR(150) NOT NULL,
  tipo             ENUM('adulto','nino') NOT NULL DEFAULT 'adulto',
  telefono         VARCHAR(40) NOT NULL DEFAULT '',
  correo           VARCHAR(190) NOT NULL DEFAULT '',
  menu             VARCHAR(120) NOT NULL DEFAULT '',
  alergias         VARCHAR(200) NOT NULL DEFAULT '',
  notas            VARCHAR(300) NOT NULL DEFAULT '',
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_confirmacion (confirmacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────
-- EL ORGANIGRAMA: PERMISOS POR PERSONA
--
-- EL PERFIL ES UNA PLANTILLA (vive en codigo/01-configuracion.js, no
-- acá); LO QUE MANDA DE VERDAD ES ESTA TABLA. Elegir un perfil al crear
-- la cuenta solo pre-tilda estas filas — después cada casilla se prende
-- y apaga a mano sin que el perfil original le importe a nadie.
--
-- Una fila por cada sección a la que se le dio 'ver' o 'editar'. La
-- sección que no aparece acá para un usuario se trata como 'nada'.
-- ─────────────────────────────────────────────────────────────────────
-- LA PUERTA: QUIÉN LLEGÓ DE VERDAD
--
-- POR QUÉ ES UNA TABLA APARTE Y NO UNA COLUMNA EN `confirmaciones`
-- Quién dijo que venía y quién llegó son dos preguntas distintas.
-- Mezclarlas rompería las estadísticas de confirmación: el día del
-- evento `confirmaciones` tiene que seguir diciendo exactamente lo
-- mismo que decía la semana anterior.
--
-- Una fila por confirmación que ya cruzó la puerta. Si la fila no
-- existe, esa confirmación todavía no llegó.
CREATE TABLE IF NOT EXISTS llegadas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  confirmacion_id  INT NOT NULL,
  llegada_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  marcado_por      INT DEFAULT NULL,
  -- Cuántas veces se intentó escanear este pase DESPUÉS de que ya había
  -- entrado. En 0, nunca se repitió. Es lo que arma la alerta "pase
  -- usado dos veces" de la pantalla Hoy (Fase 2 del rediseño).
  intentos         INT NOT NULL DEFAULT 0,
  UNIQUE KEY una_llegada_por_confirmacion (confirmacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────
-- EL ASISTENTE: FRASES QUE CADA PERSONA LE ENSEÑÓ
--
-- NO ES UNA IA. Es un motor de intenciones determinista (Fase 4 del
-- rediseño, ver codigo/32-asistente.js): compara lo que se escribe
-- contra una lista de frases por acción, de fábrica más las que cada
-- quien va enseñando. Por eso esta tabla es solo pares frase→intención,
-- nunca texto libre que "entienda" nada por su cuenta.
--
-- POR QUÉ POR USUARIO
-- Lucila y Carlos hablan distinto. Lo que uno enseña no tiene que
-- aparecerle al otro — cada fila queda atada a quién la enseñó.
CREATE TABLE IF NOT EXISTS comandos_usuario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  intencion   VARCHAR(40) NOT NULL,
  frase       VARCHAR(200) NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY una_frase_por_usuario (usuario_id, frase),
  CONSTRAINT fk_comandos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS permisos_usuario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  seccion     VARCHAR(40) NOT NULL,
  nivel       ENUM('ver','editar') NOT NULL DEFAULT 'ver',
  UNIQUE KEY una_fila_por_seccion (usuario_id, seccion),
  CONSTRAINT fk_permisos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────
-- PANEL DE MÉTRICAS: QUÉ USA LUCILA DE VERDAD (Fase 7 del rediseño)
--
-- Solo la cuenta observadora (ver esObservador() en _lib/sesion.php,
-- api/metricas.php) puede LEER esto. CUALQUIER cuenta puede ESCRIBIR
-- —cada quien registra su propio uso—, nunca leer el de otro desde acá:
-- el filtro por usuario_id, si hace falta, lo aplica metricas.php.
--
-- LIGERO A PROPÓSITO: se anotan acciones significativas (abrir una
-- ficha, asignar mesa, marcar llegada…), no cada movimiento. Ver la
-- lista de los diez eventos elegidos en codigo/38-metricas.js.
CREATE TABLE IF NOT EXISTS eventos_uso (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  -- 'vista' | 'accion' | 'busqueda' | 'asistente' | 'friccion'
  tipo        VARCHAR(20) NOT NULL,
  -- 'abrir_ficha_invitado', 'asignar_mesa', 'frase_asistente'…
  nombre      VARCHAR(60) NOT NULL,
  -- Detalle libre en JSON: {"pantalla":"gente","id":45,"nombre":"..."}.
  -- Sin tabla de columnas fijas a propósito: cada evento trae lo suyo, y
  -- forzar un esquema rígido acá multiplicaría columnas casi siempre
  -- vacías por cada tipo de evento nuevo.
  payload     TEXT,
  pantalla    VARCHAR(40) NOT NULL DEFAULT '',
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY por_usuario_y_fecha (usuario_id, creado_en),
  KEY por_tipo_y_nombre (tipo, nombre),
  CONSTRAINT fk_eventos_uso
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
