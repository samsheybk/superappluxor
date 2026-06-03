CREATE TABLE IF NOT EXISTS evaluacion_headers (id UUID PRIMARY KEY);

ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS supermercado_id UUID REFERENCES supermercados(id) ON DELETE CASCADE;
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ;
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ;
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS firma TEXT;
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS pdf_base64 TEXT;
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id);
ALTER TABLE evaluacion_headers ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT now();

ALTER TABLE evaluacion_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin puede todo en evaluacion_headers" ON evaluacion_headers;
CREATE POLICY "Admin puede todo en evaluacion_headers" ON evaluacion_headers
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());
