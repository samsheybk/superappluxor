CREATE TABLE IF NOT EXISTS planta_alarmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('combustible_bajo', 'aceite_vencido')),
  mensaje TEXT NOT NULL,
  valor_registrado DECIMAL(10,2),
  limite DECIMAL(10,2),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planta_alarmas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer planta_alarmas') THEN
    CREATE POLICY "Autenticado puede leer planta_alarmas" ON planta_alarmas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar planta_alarmas') THEN
    CREATE POLICY "Evaluadores pueden insertar planta_alarmas" ON planta_alarmas FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_planta_alarmas_planta ON planta_alarmas(planta_id);
