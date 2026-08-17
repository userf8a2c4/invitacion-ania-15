-- ══════════════════════════════════════════════════════════════════════
-- DATOS DE PRUEBA · SOLO PARA PROBAR EL PANEL EN LOCAL / PBE
-- ══════════════════════════════════════════════════════════════════════
--
-- QUÉ ES ESTE ARCHIVO
-- Carga proveedores, cotizaciones, padrinos, categorías con techo,
-- gastos, pagos y confirmaciones de mentira, para poder probar de punta
-- a punta lo de los Pasos 1, 2 y 3 (offline, "qué incluye" en listas,
-- costo por invitado, próximos pagos, padrinos por etapa, gráfico,
-- PDF ejecutivo) sin depender de datos reales de Ania.
--
-- NUNCA correr esto contra la base de datos REAL del evento. Es
-- exclusivamente para una base de pruebas / entorno local / PBE.
--
-- CÓMO SE CORRE
--   Igual que migracion.sql: phpMyAdmin → pestaña SQL → pegar todo →
--   Continuar. Hace falta que migracion.sql (y de preferencia
--   instalar.php, para las columnas nuevas como detalle_items) ya se
--   hayan corrido antes.
--
-- SE PUEDE CORRER DOS VECES SIN DUPLICAR
-- Cada INSERT revisa primero si esa fila ya existe (por nombre, o por
-- correo en el caso de las confirmaciones) y no hace nada si ya está.
--
-- CÓMO SE BORRA TODO DESPUÉS
-- Al final del archivo, comentado, hay un bloque de DELETE que saca
-- exactamente lo que este script agregó y nada más.
-- ══════════════════════════════════════════════════════════════════════


-- ─── CATEGORÍAS: LES PONEMOS TECHO ─────────────────────────────────────
-- migracion.sql ya las crea con techo 0. Acá solo se les pone un
-- número, para poder ver las barras, los avisos de "cerca del techo" y
-- el gráfico de planeado→pagado con datos de verdad.

UPDATE categorias_gasto SET techo = 180000 WHERE nombre = 'Salón y montaje';
UPDATE categorias_gasto SET techo = 220000 WHERE nombre = 'Banquete y bebidas';
UPDATE categorias_gasto SET techo = 45000  WHERE nombre = 'Vestido y arreglo';
UPDATE categorias_gasto SET techo = 35000  WHERE nombre = 'Música y DJ';
UPDATE categorias_gasto SET techo = 40000  WHERE nombre = 'Foto y video';
UPDATE categorias_gasto SET techo = 25000  WHERE nombre = 'Decoración y flores';
UPDATE categorias_gasto SET techo = 12000  WHERE nombre = 'Pastel y mesa dulce';


-- ─── PADRINOS: LAS TRES ETAPAS ──────────────────────────────────────────

INSERT INTO padrinos (nombre, telefono, correo, apadrina, tipo_aporte, monto, estado)
SELECT 'Tío Ricardo', '5215512345678', 'ricardo.prueba@correo.local',
       'Música y DJ', 'dinero', 35000, 'entregado'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM padrinos WHERE nombre = 'Tío Ricardo');

INSERT INTO padrinos (nombre, telefono, correo, apadrina, tipo_aporte, monto, estado)
SELECT 'Madrina Lupita', '5215587654321', 'lupita.prueba@correo.local',
       'Pastel', 'dinero', 12000, 'confirmado'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM padrinos WHERE nombre = 'Madrina Lupita');

INSERT INTO padrinos (nombre, telefono, correo, apadrina, tipo_aporte, monto, estado)
SELECT 'Padrino Julio', '5215598765432', 'julio.prueba@correo.local',
       'Foto y video', 'dinero', 40000, 'hablado'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM padrinos WHERE nombre = 'Padrino Julio');

INSERT INTO padrinos (nombre, telefono, correo, apadrina, tipo_aporte, monto, estado)
SELECT 'Tía Carmen', '5215511223344', 'carmen.prueba@correo.local',
       'Ramo y arreglo floral de mesa', 'especie', 8000, 'entregado'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM padrinos WHERE nombre = 'Tía Carmen');


-- ─── PROVEEDORES, CON "QUÉ INCLUYE" YA CARGADO (PASO 2) ────────────────
-- detalle_items solo se rellena si la columna ya existe (instalar.php
-- corrido). Si no existe todavía, MySQL rechazaría el INSERT con esa
-- columna — por eso acá se manda sin ella y basta con abrir cada
-- proveedor en el panel para cargarle ítems a mano si hace falta.

INSERT INTO proveedores (nombre, servicio, contacto, telefono, correo,
                          monto_total, anticipo, estado, notas)
SELECT 'Salón Jardín Dorado', 'Salón', 'Fernanda Ruiz', '5215522223333',
       'contacto.prueba@jardindorado.local',
       180000, 60000, 'contratado',
       'Piso 5, cerca del acceso principal. Pidieron el 50% de anticipo.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre = 'Salón Jardín Dorado');

INSERT INTO proveedores (nombre, servicio, contacto, telefono, correo,
                          monto_total, anticipo, estado, paquete, notas)
SELECT 'DJ Sonido Real', 'DJ', 'Marco Beltrán', '5215533334444',
       'contacto.prueba@sonidoreal.local',
       28000, 10000, 'contratado', 'dj',
       'Trae su propia consola. Confirmar hora de montaje con el salón.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre = 'DJ Sonido Real');

INSERT INTO proveedores (nombre, servicio, contacto, telefono, correo,
                          monto_total, anticipo, estado, paquete, notas)
SELECT 'Estudio Luz y Momento', 'Foto y video', 'Daniela Cortés', '5215544445555',
       'contacto.prueba@luzymomento.local',
       38000, 15000, 'candidato', 'fotografo',
       'Pidió lista de tomas con dos semanas de anticipación.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre = 'Estudio Luz y Momento');

INSERT INTO proveedores (nombre, servicio, contacto, telefono, correo,
                          monto_total, anticipo, estado, notas)
SELECT 'Pastelería Dulce Ania', 'Pastel', 'Rosa Elena', '5215555556666',
       'contacto.prueba@dulceania.local',
       11500, 3000, 'contratado',
       'Sabor vainilla-fresa, tres pisos, rinde 200 personas.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre = 'Pastelería Dulce Ania');

INSERT INTO proveedores (nombre, servicio, contacto, telefono, correo,
                          monto_total, anticipo, estado, notas)
SELECT 'Florería Alba', 'Decoración', 'Alba Torres', '5215566667777',
       'contacto.prueba@floreriaalba.local',
       22000, 0, 'candidato',
       'Esperando cotización final con centros de mesa incluidos.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre = 'Florería Alba');

-- "Qué incluye" en columna aparte (Paso 2). SOLO CORRE ESTE BLOQUE SI
-- YA EJECUTASTE instalar.php DESPUÉS DEL PASO 2 (la columna
-- detalle_items tiene que existir en `proveedores`). Si te da error
-- "Unknown column 'detalle_items'", corre instalar.php primero y
-- después vuelve a pegar este bloque solo (el resto del script ya
-- habrá quedado cargado igual).

UPDATE proveedores SET detalle_items = '[
    {"id":"p1","texto":"Montaje y desmontaje","hecho":true},
    {"id":"p2","texto":"Mobiliario y mantelería","hecho":true},
    {"id":"p3","texto":"Iluminación básica del salón","hecho":false},
    {"id":"p4","texto":"Seguridad y valet parking","hecho":false}
  ]' WHERE nombre = 'Salón Jardín Dorado';

UPDATE proveedores SET detalle_items = '[
    {"id":"p1","texto":"6 horas de música incluidas","hecho":true},
    {"id":"p2","texto":"Equipo de sonido e iluminación","hecho":true},
    {"id":"p3","texto":"Micrófono para brindis","hecho":false}
  ]' WHERE nombre = 'DJ Sonido Real';

UPDATE proveedores SET detalle_items = '[
    {"id":"p1","texto":"8 horas de cobertura","hecho":false},
    {"id":"p2","texto":"2 fotógrafos","hecho":false},
    {"id":"p3","texto":"Álbum impreso 30x30","hecho":false},
    {"id":"p4","texto":"Video resumen (highlights)","hecho":false}
  ]' WHERE nombre = 'Estudio Luz y Momento';


-- ─── COTIZACIONES: DOS POR SERVICIO, PARA PROBAR EL COMPARADOR ─────────

INSERT INTO cotizaciones (servicio, proveedor, telefono, monto, tipo_precio,
                           precio_pp, que_incluye, vigencia, elegida, notas)
SELECT 'Salón', 'Salón Jardín Dorado', '5215522223333', 180000, 'fijo', 0,
       'Montaje; Mobiliario; Iluminación básica; Seguridad',
       '2026-09-30', 1, 'La elegida, ya contratada.'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM cotizaciones WHERE servicio = 'Salón' AND proveedor = 'Salón Jardín Dorado'
);

INSERT INTO cotizaciones (servicio, proveedor, telefono, monto, tipo_precio,
                           precio_pp, que_incluye, vigencia, elegida, notas)
SELECT 'Salón', 'Hacienda Los Encinos', '5215577778888', 0, 'por_persona', 620,
       'Montaje; Mesera dedicada; Descorche libre',
       '2026-08-15', 0, 'Vence antes de la fecha del evento, revisar.'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM cotizaciones WHERE servicio = 'Salón' AND proveedor = 'Hacienda Los Encinos'
);

INSERT INTO cotizaciones (servicio, proveedor, telefono, monto, tipo_precio,
                           precio_pp, que_incluye, vigencia, elegida, notas)
SELECT 'DJ', 'DJ Sonido Real', '5215533334444', 28000, 'fijo', 0,
       '6 horas; Equipo propio; Micrófono para brindis',
       '2026-10-01', 1, 'Elegido.'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM cotizaciones WHERE servicio = 'DJ' AND proveedor = 'DJ Sonido Real'
);

INSERT INTO cotizaciones (servicio, proveedor, telefono, monto, tipo_precio,
                           precio_pp, que_incluye, vigencia, elegida, notas)
SELECT 'DJ', 'Vibra Móvil', '5215599990000', 19500, 'fijo', 0,
       '4 horas; Pantalla LED; Sin micrófono para brindis',
       '2026-09-01', 0, 'Más barato pero menos horas.'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM cotizaciones WHERE servicio = 'DJ' AND proveedor = 'Vibra Móvil'
);


-- ─── GASTOS: ALGUNOS CON PROVEEDOR, CATEGORÍA Y PADRINO ────────────────

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'Renta del salón',
       (SELECT id FROM categorias_gasto WHERE nombre = 'Salón y montaje'),
       (SELECT id FROM proveedores WHERE nombre = 'Salón Jardín Dorado'),
       NULL, 180000, 180000, 'Pagado en dos partes.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'Renta del salón');

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'DJ y sonido',
       (SELECT id FROM categorias_gasto WHERE nombre = 'Música y DJ'),
       (SELECT id FROM proveedores WHERE nombre = 'DJ Sonido Real'),
       (SELECT id FROM padrinos WHERE nombre = 'Tío Ricardo'),
       28000, 28000, 'Padrino ya entregó completo.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'DJ y sonido');

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'Sesión de fotos y video',
       (SELECT id FROM categorias_gasto WHERE nombre = 'Foto y video'),
       (SELECT id FROM proveedores WHERE nombre = 'Estudio Luz y Momento'),
       (SELECT id FROM padrinos WHERE nombre = 'Padrino Julio'),
       38000, 0, 'Padrino solo lo habló, todavía no confirma en firme.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'Sesión de fotos y video');

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'Pastel de tres pisos',
       (SELECT id FROM categorias_gasto WHERE nombre = 'Pastel y mesa dulce'),
       (SELECT id FROM proveedores WHERE nombre = 'Pastelería Dulce Ania'),
       (SELECT id FROM padrinos WHERE nombre = 'Madrina Lupita'),
       11500, 11500, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'Pastel de tres pisos');

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'Flores y centros de mesa',
       (SELECT id FROM categorias_gasto WHERE nombre = 'Decoración y flores'),
       (SELECT id FROM proveedores WHERE nombre = 'Florería Alba'),
       NULL, 22000, 6000, 'Solo el anticipo cargado como real por ahora.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'Flores y centros de mesa');

INSERT INTO gastos (concepto, categoria_id, proveedor_id, padrino_id,
                     presupuestado, monto_real, notas)
SELECT 'Vestido de quince años', NULL, NULL, NULL, 32000, 32000, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM gastos WHERE concepto = 'Vestido de quince años');


-- ─── PAGOS: ALGUNOS ATRASADOS, ALGUNOS POR VENCER, ALGUNOS PAGADOS ─────
-- Las fechas son relativas a CURDATE() para que "Atrasado" / "Próximos
-- pagos" se vean con datos de verdad sin importar cuándo se corra esto.

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, fecha_pagado, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'Renta del salón'),
       'Anticipo salón', 60000, DATE_SUB(CURDATE(), INTERVAL 30 DAY),
       DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'pagado', 'Transferencia'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'Anticipo salón');

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'Renta del salón'),
       'Liquidación salón', 120000, DATE_SUB(CURDATE(), INTERVAL 3 DAY),
       'pendiente', 'Transferencia'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'Liquidación salón');

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, fecha_pagado, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'DJ y sonido'),
       'DJ completo', 28000, DATE_SUB(CURDATE(), INTERVAL 10 DAY),
       DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'pagado', 'Efectivo'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'DJ completo');

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'Pastel de tres pisos'),
       'Resto del pastel', 8500, DATE_ADD(CURDATE(), INTERVAL 4 DAY),
       'pendiente', 'Efectivo'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'Resto del pastel');

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'Flores y centros de mesa'),
       'Resto de la florería', 16000, DATE_ADD(CURDATE(), INTERVAL 20 DAY),
       'pendiente', ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'Resto de la florería');

INSERT INTO pagos (gasto_id, concepto, monto, fecha_limite, estado, metodo)
SELECT (SELECT id FROM gastos WHERE concepto = 'Vestido de quince años'),
       'Pago único del vestido', 32000, DATE_ADD(CURDATE(), INTERVAL 45 DAY),
       'pendiente', 'Tarjeta'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE concepto = 'Pago único del vestido');


-- ─── CONFIRMACIONES: MEZCLA DE ASISTEN / NO ASISTEN / ALERGIAS ─────────
-- Todas con correo @prueba.local, para poder identificarlas y borrarlas
-- sin tocar ninguna confirmación real.

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Familia Zelaya', 'zelaya@prueba.local', 1, 3, 1, 4,
       'pollo,pollo,res,infantil', '2 pollo, 1 res, 1 infantil', 'Ninguna',
       '', 'PRUEBA-0001'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'zelaya@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Martín Osorio', 'martin.osorio@prueba.local', 1, 1, 0, 1,
       'vegetariano', '1 vegetariano', 'Alergia a los mariscos',
       'Viene desde Puebla', 'PRUEBA-0002'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'martin.osorio@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Sofía y Diego Reyna', 'reyna@prueba.local', 1, 2, 0, 2,
       'res,res', '2 res', 'Ninguna', '', 'PRUEBA-0003'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'reyna@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Familia Contreras', 'contreras@prueba.local', 1, 2, 3, 5,
       'pollo,pollo,infantil,infantil,infantil',
       '2 pollo, 3 infantil', 'Uno de los niños es alérgico al cacahuate',
       'Piden mesa cerca del acceso, uno de los niños usa andador', 'PRUEBA-0004'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'contreras@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Valeria Nuño', 'valeria.nuno@prueba.local', 0, 0, 0, 0,
       '', '', '', 'No puede por viaje de trabajo', ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'valeria.nuno@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Tío Ricardo y familia', 'tioricardo@prueba.local', 1, 2, 0, 2,
       'res,pollo', '1 res, 1 pollo', 'Ninguna', 'Es padrino de la música', 'PRUEBA-0006'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'tioricardo@prueba.local');

INSERT INTO confirmaciones (nombre, correo, asiste, adultos, ninos, total,
                             menus, resumen_menus, alergias, notas, codigo)
SELECT 'Grupo de la escuela', 'amigas.escuela@prueba.local', 1, 5, 0, 5,
       'pollo,pollo,pollo,vegetariano,res',
       '3 pollo, 1 vegetariano, 1 res', 'Ninguna',
       'Piden sentarse todas juntas', 'PRUEBA-0007'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM confirmaciones WHERE correo = 'amigas.escuela@prueba.local');


-- ══════════════════════════════════════════════════════════════════════
-- CÓMO BORRAR TODO LO QUE AGREGÓ ESTE SCRIPT
-- ══════════════════════════════════════════════════════════════════════
-- Descomentar y correr el bloque de abajo. Se borra en el orden que
-- respeta las llaves foráneas (pagos y gastos antes que categorías,
-- proveedores y padrinos; las confirmaciones se identifican por el
-- correo de prueba, así que ninguna real corre riesgo).
--
-- DELETE FROM pagos WHERE concepto IN (
--   'Anticipo salón', 'Liquidación salón', 'DJ completo',
--   'Resto del pastel', 'Resto de la florería', 'Pago único del vestido');
-- DELETE FROM gastos WHERE concepto IN (
--   'Renta del salón', 'DJ y sonido', 'Sesión de fotos y video',
--   'Pastel de tres pisos', 'Flores y centros de mesa', 'Vestido de quince años');
-- DELETE FROM cotizaciones WHERE proveedor IN (
--   'Salón Jardín Dorado', 'Hacienda Los Encinos', 'DJ Sonido Real', 'Vibra Móvil');
-- DELETE FROM proveedores WHERE nombre IN (
--   'Salón Jardín Dorado', 'DJ Sonido Real', 'Estudio Luz y Momento',
--   'Pastelería Dulce Ania', 'Florería Alba');
-- DELETE FROM padrinos WHERE nombre IN (
--   'Tío Ricardo', 'Madrina Lupita', 'Padrino Julio', 'Tía Carmen');
-- UPDATE categorias_gasto SET techo = 0 WHERE nombre IN (
--   'Salón y montaje', 'Banquete y bebidas', 'Vestido y arreglo',
--   'Música y DJ', 'Foto y video', 'Decoración y flores', 'Pastel y mesa dulce');
-- DELETE FROM confirmaciones WHERE correo LIKE '%@prueba.local';
