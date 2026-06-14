-- Plantas Eléctricas
CREATE TABLE IF NOT EXISTS plantas_electricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  capacidad_electrica TEXT NOT NULL,
  capacidad_combustible TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planta_mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id) ON DELETE CASCADE,
  realizado_por UUID NOT NULL REFERENCES perfiles(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('Cambio de aceite', 'Cambio de filtros', 'Revision general', 'Otro')),
  descripcion TEXT NOT NULL DEFAULT '',
  costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  observaciones TEXT NOT NULL DEFAULT '',
  horometro DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plantas_electricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planta_mantenimientos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer plantas_electricas') THEN
    CREATE POLICY "Autenticado puede leer plantas_electricas" ON plantas_electricas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede gestionar plantas_electricas') THEN
    CREATE POLICY "Admin puede gestionar plantas_electricas" ON plantas_electricas FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer planta_mantenimientos') THEN
    CREATE POLICY "Autenticado puede leer planta_mantenimientos" ON planta_mantenimientos FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar planta_mantenimientos') THEN
    CREATE POLICY "Evaluadores pueden insertar planta_mantenimientos" ON planta_mantenimientos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_planta_mantenimientos_planta ON planta_mantenimientos(planta_id);
