CREATE TABLE IF NOT EXISTS conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concepto_criticidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  nivel TEXT NOT NULL,
  penalizacion DECIMAL(5,2) NOT NULL CHECK (penalizacion > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concepto_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  UNIQUE(concepto_id, area_id)
);

CREATE TABLE IF NOT EXISTS evaluacion_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL,
  supermercado_id UUID NOT NULL REFERENCES supermercados(id),
  area_id UUID NOT NULL REFERENCES areas(id),
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  criticidad_id UUID NOT NULL REFERENCES concepto_criticidades(id),
  comentario TEXT NOT NULL DEFAULT '',
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por UUID NOT NULL REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'orden') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN orden;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'limpieza') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN limpieza;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'comentarios') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN comentarios;
  END IF;
END $$;

ALTER TABLE conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepto_criticidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepto_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion_comentarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer conceptos') THEN
    CREATE POLICY "Autenticado puede leer conceptos" ON conceptos FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede gestionar conceptos') THEN
    CREATE POLICY "Admin puede gestionar conceptos" ON conceptos FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer concepto_criticidades') THEN
    CREATE POLICY "Autenticado puede leer concepto_criticidades" ON concepto_criticidades FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede gestionar concepto_criticidades') THEN
    CREATE POLICY "Admin puede gestionar concepto_criticidades" ON concepto_criticidades FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer concepto_areas') THEN
    CREATE POLICY "Autenticado puede leer concepto_areas" ON concepto_areas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede gestionar concepto_areas') THEN
    CREATE POLICY "Admin puede gestionar concepto_areas" ON concepto_areas FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer evaluacion_comentarios') THEN
    CREATE POLICY "Autenticado puede leer evaluacion_comentarios" ON evaluacion_comentarios FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar evaluacion_comentarios') THEN
    CREATE POLICY "Evaluadores pueden insertar evaluacion_comentarios" ON evaluacion_comentarios FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evaluacion_comentarios_evaluacion ON evaluacion_comentarios(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_evaluacion_comentarios_evaluacion_area ON evaluacion_comentarios(evaluacion_id, area_id);
