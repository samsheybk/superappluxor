CREATE TABLE IF NOT EXISTS reportes_falla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id),
  supermercado TEXT NOT NULL,
  planta_nombre TEXT NOT NULL,
  usuario TEXT NOT NULL,
  detalle TEXT NOT NULL,
  fotos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reportes_falla ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer reportes_falla') THEN
    CREATE POLICY "Autenticado puede leer reportes_falla" ON reportes_falla FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar reportes_falla') THEN
    CREATE POLICY "Evaluadores pueden insertar reportes_falla" ON reportes_falla FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reportes_falla_planta ON reportes_falla(planta_id);
