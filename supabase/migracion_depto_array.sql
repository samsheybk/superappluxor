-- Migrar departamento de TEXT a TEXT[] en documentacion_indicadores
ALTER TABLE documentacion_indicadores
ALTER COLUMN departamento TYPE TEXT[]
USING ARRAY[departamento];

-- Recrear índice como GIN para búsqueda en arrays
DROP INDEX IF EXISTS idx_documentacion_indicadores_depto;
CREATE INDEX IF NOT EXISTS idx_documentacion_indicadores_depto ON documentacion_indicadores USING GIN(departamento);
