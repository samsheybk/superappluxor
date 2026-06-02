-- Cambiar estructura de evaluaciones_supermercado para evaluaciones independientes
-- Cada evaluacion tiene fecha/hora de inicio, y por area se evalúa orden + limpieza + comentarios

DO $$ BEGIN
  -- Agregar nuevas columnas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'evaluacion_id') THEN
    ALTER TABLE evaluaciones_supermercado ADD COLUMN evaluacion_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'fecha_inicio') THEN
    ALTER TABLE evaluaciones_supermercado ADD COLUMN fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'orden') THEN
    ALTER TABLE evaluaciones_supermercado ADD COLUMN orden DECIMAL(5,2) CHECK (orden >= 0 AND orden <= 100);
  END IF;

  -- Renombrar observaciones a comentarios
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'observaciones') THEN
    ALTER TABLE evaluaciones_supermercado RENAME COLUMN observaciones TO comentarios;
  END IF;

  -- Eliminar columnas viejas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'estetica') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN estetica;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'presentacion') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN presentacion;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'corte_mes') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN corte_mes;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'semana') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN semana;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'actualizado_en') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN actualizado_en;
  END IF;
END $$;

-- Eliminar constraint único viejo
ALTER TABLE evaluaciones_supermercado DROP CONSTRAINT IF EXISTS evaluaciones_supermercado_supermercado_id_area_id_corte_mes_semana_key;

-- Crear índice para búsqueda por evaluacion_id
CREATE INDEX IF NOT EXISTS idx_evaluaciones_supermercado_evaluacion_id ON evaluaciones_supermercado(evaluacion_id);
