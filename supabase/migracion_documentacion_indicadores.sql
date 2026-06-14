CREATE TABLE IF NOT EXISTS documentacion_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  introduccion TEXT NOT NULL,
  objetivo_principal TEXT NOT NULL,
  objetivos_secundarios JSONB NOT NULL DEFAULT '[]',
  metodo_evaluacion TEXT NOT NULL,
  valoracion_resultados TEXT NOT NULL,
  impacto_negocio TEXT NOT NULL,
  responsables_directos JSONB NOT NULL DEFAULT '[]',
  frecuencia_medicion TEXT NOT NULL,
  departamento TEXT NOT NULL,
  repercusion_laboral TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documentacion_indicadores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer documentacion_indicadores') THEN
    CREATE POLICY "Autenticado puede leer documentacion_indicadores" ON documentacion_indicadores FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar documentacion_indicadores') THEN
    CREATE POLICY "Admin puede insertar documentacion_indicadores" ON documentacion_indicadores FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede editar documentacion_indicadores') THEN
    CREATE POLICY "Admin puede editar documentacion_indicadores" ON documentacion_indicadores FOR UPDATE USING (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede eliminar documentacion_indicadores') THEN
    CREATE POLICY "Admin puede eliminar documentacion_indicadores" ON documentacion_indicadores FOR DELETE USING (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documentacion_indicadores_depto ON documentacion_indicadores(departamento);
