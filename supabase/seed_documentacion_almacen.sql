-- Agregar columna tipo a tablas existentes
ALTER TABLE documentacion_indicadores ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT '';

-- Insertar documento de Inspeccion Semanal de Almacen
INSERT INTO documentacion_indicadores (titulo, tipo, introduccion, objetivo_principal, objetivos_secundarios, metodo_evaluacion, valoracion_resultados, impacto_negocio, responsables_directos, frecuencia_medicion, departamento, repercusion_laboral)
VALUES (
  'Inspeccion Semanal de Almacen',
  'KPI',
  'El area de Almacen y Distribucion es responsable de la recepcion, almacenamiento y despacho de mercancia. Para garantizar la calidad y seguridad de las operaciones, se realiza una inspeccion semal que cubre aspectos criticos de infraestructura, procesos y equipos.',
  'Evaluar semanalmente las condiciones operativas del almacen para asegurar el cumplimiento de los estandares de calidad, seguridad y conservacion de la mercancia.',
  '["Verificar que la temperatura de las cavas y cuartos frios se mantenga dentro del rango optimo", "Asegurar el orden y la limpieza general del area de almacenamiento", "Confirmar el uso correcto de los equipos de proteccion personal (EPP)", "Inspeccionar el estado mecanico y operativo de los montacargas", "Detectar exceso de mercancia por baja rotacion y tomar acciones correctivas", "Verificar que todos los productos esten identificados con su ficha de recepcion", "Auditar la aplicacion del metodo FIFO en la rotacion de inventario", "Evaluar las condiciones de iluminacion, ventilacion y detectar fugas de agua"]',
  'Se realiza una inspeccion semanal recorriendo cada area del almacen con una lista de verificacion que cubre: temperatura de cavas y cuartos frios (registro digital), orden y limpieza general (5S), uso de EPP del personal, estado de montacargas (hoja de checklist diario), identificacion de productos con baja rotacion, fichas de recepcion visibles en cada lote, aplicacion de FIFO en fechas de vencimiento/lote, y condiciones de infraestructura (iluminacion, ventilacion, fugas). Cada item se califica como Cumple / No Cumple / No Aplica.',
  'Los resultados se tabulan semanalmente. Se considera APROBADO si al menos el 90% de los items evaluados cumplen. Se genera un plan de accion correctiva para cada item No Cumple con responsable y fecha limite.',
  'El incumplimiento recurrente puede derivar en perdida de mercancia por caducidad o deterioro, accidentes laborales por mal estado de equipos o instalaciones, multas por incumplimiento normativo sanitario, y sobrecostos operativos por baja rotacion no gestionada.',
  '["Jefe de Almacen", "Supervisor de Operaciones", "Coordinador de Calidad"]',
  'Semanal',
  'Almacen y distribucion',
  'Un ambiente de trabajo ordenado, limpio y seguro reduce el riesgo de accidentes y enfermedades ocupacionales. La participacion del equipo en las inspecciones fomenta la cultura de mejora continua y responsabilidad compartida.'
);
