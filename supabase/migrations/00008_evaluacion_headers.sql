CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY,
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_cierre TIMESTAMPTZ,
  firma TEXT,
  pdf_base64 TEXT,
  creado_por UUID NOT NULL REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin puede todo en evaluaciones" ON evaluaciones;
CREATE POLICY "Admin puede todo en evaluaciones" ON evaluaciones
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());
