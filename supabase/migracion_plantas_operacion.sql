-- Nuevas columnas en plantas_electricas
ALTER TABLE plantas_electricas ADD COLUMN IF NOT EXISTS combustible_por_hora DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE plantas_electricas ADD COLUMN IF NOT EXISTS horas_para_cambio_aceite DECIMAL(10,2) NOT NULL DEFAULT 250;

-- Registro de encendido/apagado
CREATE TABLE IF NOT EXISTS planta_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id) ON DELETE CASCADE,
  encendido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  apagado_en TIMESTAMPTZ,
  combustible_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  combustible_final DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cargas de combustible
CREATE TABLE IF NOT EXISTS planta_cargas_combustible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id) ON DELETE CASCADE,
  cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planta_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE planta_cargas_combustible ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer planta_registros') THEN
    CREATE POLICY "Autenticado puede leer planta_registros" ON planta_registros FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar planta_registros') THEN
    CREATE POLICY "Evaluadores pueden insertar planta_registros" ON planta_registros FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden actualizar planta_registros') THEN
    CREATE POLICY "Evaluadores pueden actualizar planta_registros" ON planta_registros FOR UPDATE USING (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer planta_cargas_combustible') THEN
    CREATE POLICY "Autenticado puede leer planta_cargas_combustible" ON planta_cargas_combustible FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar planta_cargas_combustible') THEN
    CREATE POLICY "Evaluadores pueden insertar planta_cargas_combustible" ON planta_cargas_combustible FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_planta_registros_planta ON planta_registros(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_cargas_combustible_planta ON planta_cargas_combustible(planta_id);
