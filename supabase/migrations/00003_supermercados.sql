CREATE TABLE supermercados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supermercado_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  UNIQUE(supermercado_id, area_id)
);

CREATE TABLE evaluaciones_supermercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supermercado_id UUID NOT NULL REFERENCES supermercados(id),
  area_id UUID NOT NULL REFERENCES areas(id),
  corte_mes DATE NOT NULL,
  semana INTEGER NOT NULL CHECK (semana BETWEEN 1 AND 5),
  limpieza DECIMAL(5,2) NOT NULL CHECK (limpieza >= 0 AND limpieza <= 100),
  estetica DECIMAL(5,2) NOT NULL CHECK (estetica >= 0 AND estetica <= 100),
  presentacion DECIMAL(5,2) NOT NULL CHECK (presentacion >= 0 AND presentacion <= 100),
  observaciones TEXT DEFAULT '',
  creado_por UUID NOT NULL REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supermercado_id, area_id, corte_mes, semana)
);

ALTER TABLE supermercados ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermercado_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_supermercado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todo autenticado puede leer supermercados"
  ON supermercados FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Todo autenticado puede leer areas"
  ON areas FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Todo autenticado puede leer supermercado_areas"
  ON supermercado_areas FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin puede insertar/actualizar supermercados"
  ON supermercados FOR INSERT WITH CHECK (es_admin());
CREATE POLICY "Admin puede actualizar supermercados"
  ON supermercados FOR UPDATE USING (es_admin());

CREATE POLICY "Admin puede insertar/actualizar areas"
  ON areas FOR INSERT WITH CHECK (es_admin());
CREATE POLICY "Admin puede actualizar areas"
  ON areas FOR UPDATE USING (es_admin());

CREATE POLICY "Admin puede insertar/actualizar supermercado_areas"
  ON supermercado_areas FOR INSERT WITH CHECK (es_admin());
CREATE POLICY "Admin puede actualizar supermercado_areas"
  ON supermercado_areas FOR UPDATE USING (es_admin());

CREATE POLICY "Autenticado puede leer evaluaciones_supermercado"
  ON evaluaciones_supermercado FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin puede todo en evaluaciones_supermercado"
  ON evaluaciones_supermercado FOR ALL USING (es_admin());

CREATE POLICY "Evaluadores pueden insertar evaluaciones_supermercado"
  ON evaluaciones_supermercado FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
  );

-- Areas comunes
INSERT INTO areas (nombre) VALUES
  ('Carniceria'),
  ('Fruver'),
  ('Charcuteria'),
  ('Cosmeticos'),
  ('Almacenes'),
  ('Panaderia'),
  ('Lacteos'),
  ('Limpieza'),
  ('Bebidas'),
  ('Caja'),
  ('Atencion al cliente'),
  ('Bodega')
ON CONFLICT (nombre) DO NOTHING;

-- 15 Supermercados
INSERT INTO supermercados (nombre) VALUES
  ('LAS ACACIAS'),
  ('SAN JUAN'),
  ('SANTA RITA'),
  ('NAGUANAGUA'),
  ('EL BOSQUE'),
  ('BARQUISIMETO'),
  ('TUCACAS'),
  ('EL CASTAÑO'),
  ('LA MORA'),
  ('VILLAS DE ARAGUA'),
  ('LA VICTORIA'),
  ('GUACARA'),
  ('SAN DIEGO'),
  ('CIRCULO MILITAR'),
  ('IPSFA')
ON CONFLICT (nombre) DO NOTHING;

-- Asignar areas a cada supermercado (ejemplo: todos tienen las mismas areas base)
INSERT INTO supermercado_areas (supermercado_id, area_id)
SELECT s.id, a.id
FROM supermercados s, areas a
WHERE NOT EXISTS (
  SELECT 1 FROM supermercado_areas sa WHERE sa.supermercado_id = s.id AND sa.area_id = a.id
)
ON CONFLICT DO NOTHING;
