-- Crear tabla de perfiles de usuario (vinculada a auth.users)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'evaluador' CHECK (rol IN ('admin', 'evaluador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios pueden leer su propio perfil
CREATE POLICY "Usuarios ven su propio perfil"
  ON perfiles FOR SELECT
  USING (auth.uid() = id);

-- Política: solo admin puede leer todos los perfiles
CREATE POLICY "Admin puede leer todos los perfiles"
  ON perfiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Tabla de evaluaciones
CREATE TABLE evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  direccion TEXT NOT NULL,
  corte_mes DATE NOT NULL,
  semana INTEGER NOT NULL CHECK (semana BETWEEN 1 AND 5),
  puntaje DECIMAL(5,2) NOT NULL CHECK (puntaje >= 0 AND puntaje <= 100),
  observaciones TEXT DEFAULT '',
  creado_por UUID NOT NULL REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Solo una evaluación por departamento/semana/corte
  UNIQUE (departamento, corte_mes, semana)
);

ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- Política: admin puede hacer todo
CREATE POLICY "Admin puede todo sobre evaluaciones"
  ON evaluaciones FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Política: evaluadores pueden leer y crear evaluaciones
CREATE POLICY "Evaluadores pueden leer evaluaciones"
  ON evaluaciones FOR SELECT
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "Evaluadores pueden insertar evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()));
