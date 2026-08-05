-- ==================================================================
-- COTIZACIONES DE SALONES  ·  del Excel de Lucila
-- ==================================================================
--
-- Origen: Cotizacion salones final_corregida.xlsx, hoja "Comparativa".
-- Son 5 salones con 13 paquetes y 27 renglones de servicios comparados.
--
-- Hasta ahora esta comparacion vivia SOLO en el Excel: el panel no
-- sabia nada de ella, asi que "Cotizaciones" aparecia vacio aunque el
-- trabajo de comparar ya estuviera hecho.
--
-- La marcada como elegida es Alvi Toluca / Salon Estrella, que es el
-- que dice la invitacion.
--
-- Se puede correr dos veces sin duplicar: primero borra lo que haya
-- importado antes, que se reconoce por el texto de la columna notas.

DELETE FROM cotizaciones WHERE notas = 'Importado del Excel de cotizaciones';

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'SOL Y LUNA - Paquete Premium', '', 0, 'por_persona', 880.00,
          'Duracion: 7 horas | INCLUIDO: Servicio de banquete (3 tiempos); Torna fiesta (chilaquiles) (Incluido); Refresco e hielo (Ilimitado); Copa de vino por mesa (Incluido); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (6 horas); 1 hora mariachi / banda gratis (Incluido); Pista de baile LED (Incluido); Hostess (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Naranja/Fondant); Servicio de café (Incluido) | CUESTA APARTE: Decoración de techo: $7,000; Servicio valet parking: $50 pp; Carpa para ceremonia: $2,750; Hora extra: Extra', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'SOL Y LUNA - Todo Incluido', '', 0, 'por_persona', 520.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Refresco e hielo (Ilimitado); Copa de vino por mesa (Incluido); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (5 horas); 1 hora mariachi / banda gratis (Incluido); Hostess (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (3 leches/Chantilli); Servicio de café (Incluido) | CUESTA APARTE: Decoración de techo: $7,000; Pista de baile LED: Extra; Servicio valet parking: $50 pp; Carpa para ceremonia: $2,750; Hora extra: Extra', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'SEEM ESPECTÁCULOS - Comfort', '', 0, 'por_persona', 575.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Vajilla y cristalería (Incluido); DJ profesional (6 horas); Coordinador de evento (Incluido); Meseros y personal (Incluido); Seguridad / parking (Incluido) | CUESTA APARTE: Torna fiesta (chilaquiles): $90 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'SEEM ESPECTÁCULOS - Elegance', '', 0, 'por_persona', 775.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Vajilla y cristalería (Incluido); DJ profesional (6 horas); Coordinador de evento (Incluido); Meseros y personal (Incluido); Seguridad / parking (Incluido) | CUESTA APARTE: Torna fiesta (chilaquiles): $90 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'SEEM ESPECTÁCULOS - Experience', '', 0, 'por_persona', 975.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Alcohol / mixólogo (Mixólogo); Vajilla y cristalería (Incluido); DJ profesional (6 horas); Hostess (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Seguridad / parking (Incluido) | CUESTA APARTE: Torna fiesta (chilaquiles): $90 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'BENAMATI EVENTOS - Paquete', '', 0, 'por_persona', 620.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Refresco e hielo (Ilimitado); Vajilla y cristalería (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Servicio de café (Incluido) | CUESTA APARTE: Torna fiesta (chilaquiles): $70 pp; Copa de vino por mesa: $90 pp; Centros de mesa: Extra; Decoración de techo: Extra; Mesa principal de lujo: $1600; DJ profesional: $17900; Pista de baile LED: $11500; Hostess: $500; Carpa para ceremonia: Extra; Hora extra: $6000', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'ALVI TOLUCA - Bronce', '', 0, 'por_persona', 550.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Refresco e hielo (Ilimitado); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Incluido) | CUESTA APARTE: Banda / mariachi: $4500; Pista de baile LED: $6000; Hostess: $800; Servicio valet parking: $60 pp; Servicio de café: $20 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'ALVI TOLUCA - Plata', '', 0, 'por_persona', 680.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (3 tiempos); Refresco e hielo (Ilimitado); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Incluido) | CUESTA APARTE: Banda / mariachi: $4500; Pista de baile LED: $6000; Hostess: $800; Servicio valet parking: $60 pp; Servicio de café: $20 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'ALVI TOLUCA - Oro', '', 0, 'por_persona', 720.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (4 tiempos); Refresco e hielo (Ilimitado); Copa de vino por mesa (Incluido); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Incluido) | CUESTA APARTE: Banda / mariachi: $4500; Pista de baile LED: $6000; Hostess: $800; Servicio valet parking: $60 pp; Servicio de café: $20 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'ALVI TOLUCA - Platino', '', 0, 'por_persona', 740.00,
          'Duracion: 6 horas | INCLUIDO: Servicio de banquete (4 tiempos); Refresco e hielo (Ilimitado); Copa de vino por mesa (Incluido); Coctel de bienvenida (Incluido 50% invitados); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Incluido) | CUESTA APARTE: Banda / mariachi: $4500; Pista de baile LED: $6000; Hostess: $800; Servicio valet parking: $60 pp; Servicio de café: $20 pp', NULL, 0,
          'Importado del Excel de cotizaciones');

INSERT INTO cotizaciones
  (servicio, proveedor, telefono, monto, tipo_precio, precio_pp,
   que_incluye, vigencia, elegida, notas)
  VALUES ('Salon y banquete', 'ALVI TOLUCA - Alvi Salón Estrella', '', 0, 'por_persona', 980.00,
          'Duracion: 7 horas | INCLUIDO: Servicio de banquete (4 tiempos); Torna fiesta (chilaquiles) (Incluido); Refresco e hielo (Ilimitado); Copa de vino por mesa (Incluido); Coctel de bienvenida (Incluido 50% invitados); Alcohol / mixólogo (Incluido 1 botella c/10 adultos); Centros de mesa (Incluido); Mesa principal de lujo (Incluido); Vajilla y cristalería (Incluido); DJ profesional (Incluido); Banda / mariachi (Incluido); Coordinador de evento (Incluido); Meseros y personal (Incluido); Personal para baños (Incluido); Seguridad / parking (Incluido); Pastel (Incluido) | CUESTA APARTE: Pista de baile LED: $6000; Hostess: $800; Servicio valet parking: $60 pp; Servicio de café: $20 pp', NULL, 1,
          'Importado del Excel de cotizaciones');

-- ==================================================================
-- GASTOS QUE YA ESTABAN DECIDIDOS
-- ==================================================================
--
-- De la hoja "Gastos adicionales". Solo el vestido tenia importe; la
-- fotografia estaba anotada sin monto, asi que no se inventa ninguno:
-- entra en cero para que se vea que falta cotizarla.

DELETE FROM gastos WHERE notas = 'Importado del Excel de cotizaciones';

INSERT INTO gastos (concepto, categoria_id, presupuestado, monto_real, notas)
  SELECT 'Vestido', id, 14500, 0, 'Importado del Excel de cotizaciones'
  FROM categorias_gasto WHERE nombre LIKE 'Vestido%' LIMIT 1;

INSERT INTO gastos (concepto, categoria_id, presupuestado, monto_real, notas)
  SELECT 'Fotografia y video', id, 0, 0, 'Importado del Excel de cotizaciones'
  FROM categorias_gasto WHERE nombre LIKE 'Foto%' LIMIT 1;
