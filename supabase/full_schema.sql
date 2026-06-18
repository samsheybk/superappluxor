-- ============================================================
-- FULL SCHEMA: Super App Luxor
-- Ejecutar TODO en el SQL Editor de Supabase (nueva cuenta)
-- ============================================================

-- 00001: Schema inicial (perfiles + evaluaciones legacy)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  username TEXT UNIQUE,
  rol TEXT NOT NULL DEFAULT 'evaluador' CHECK (rol IN ('admin', 'evaluador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio perfil"
  ON perfiles FOR SELECT
  USING (auth.uid() = id);

-- 00002: Fix RLS recursion + trigger perfil automatico
DROP POLICY IF EXISTS "Admin puede leer todos los perfiles" ON perfiles;

CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin');
END;
$$;

CREATE POLICY "Admin puede leer todos los perfiles"
  ON perfiles FOR SELECT
  USING (es_admin());

CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, username, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)), split_part(NEW.email, '@', 1), 'evaluador');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION crear_perfil_nuevo_usuario();

-- Asignar rol admin al usuario admin@evaluxor.com (crear usuario primero en Auth)
UPDATE perfiles SET rol = 'admin', nombre = 'Administrador', username = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@evaluxor.com');

-- 00003: Supermercados, areas, supermercado_areas, evaluaciones_supermercado
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

-- 00005: Políticas con DO $$ (evita error if already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Todo autenticado puede leer supermercados') THEN
    CREATE POLICY "Todo autenticado puede leer supermercados" ON supermercados FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Todo autenticado puede leer areas') THEN
    CREATE POLICY "Todo autenticado puede leer areas" ON areas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Todo autenticado puede leer supermercado_areas') THEN
    CREATE POLICY "Todo autenticado puede leer supermercado_areas" ON supermercado_areas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar/actualizar supermercados') THEN
    CREATE POLICY "Admin puede insertar/actualizar supermercados" ON supermercados FOR INSERT WITH CHECK (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede actualizar supermercados') THEN
    CREATE POLICY "Admin puede actualizar supermercados" ON supermercados FOR UPDATE USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar/actualizar areas') THEN
    CREATE POLICY "Admin puede insertar/actualizar areas" ON areas FOR INSERT WITH CHECK (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede actualizar areas') THEN
    CREATE POLICY "Admin puede actualizar areas" ON areas FOR UPDATE USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar/actualizar supermercado_areas') THEN
    CREATE POLICY "Admin puede insertar/actualizar supermercado_areas" ON supermercado_areas FOR INSERT WITH CHECK (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede actualizar supermercado_areas') THEN
    CREATE POLICY "Admin puede actualizar supermercado_areas" ON supermercado_areas FOR UPDATE USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer evaluaciones_supermercado') THEN
    CREATE POLICY "Autenticado puede leer evaluaciones_supermercado" ON evaluaciones_supermercado FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede todo en evaluaciones_supermercado') THEN
    CREATE POLICY "Admin puede todo en evaluaciones_supermercado" ON evaluaciones_supermercado FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar evaluaciones_supermercado') THEN
    CREATE POLICY "Evaluadores pueden insertar evaluaciones_supermercado" ON evaluaciones_supermercado FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador')));
  END IF;
END $$;

-- 00010: DELETE policy for supermercado_areas
DROP POLICY IF EXISTS "Admin puede eliminar supermercado_areas" ON supermercado_areas;
CREATE POLICY "Admin puede eliminar supermercado_areas" ON supermercado_areas
  FOR DELETE
  USING (es_admin());

-- Areas comunes
INSERT INTO areas (nombre) VALUES
  ('Carniceria'), ('Fruver'), ('Charcuteria'), ('Cosmeticos'),
  ('Almacenes'), ('Panaderia'), ('Lacteos'), ('Limpieza'),
  ('Bebidas'), ('Caja'), ('Atencion al cliente'), ('Bodega')
ON CONFLICT (nombre) DO NOTHING;

-- 15 Supermercados
INSERT INTO supermercados (nombre) VALUES
  ('LAS ACACIAS'), ('SAN JUAN'), ('SANTA RITA'), ('NAGUANAGUA'),
  ('EL BOSQUE'), ('BARQUISIMETO'), ('TUCACAS'), ('EL CASTAÑO'),
  ('LA MORA'), ('VILLAS DE ARAGUA'), ('LA VICTORIA'), ('GUACARA'),
  ('SAN DIEGO'), ('CIRCULO MILITAR'), ('IPSFA')
ON CONFLICT (nombre) DO NOTHING;

-- Asignar areas a cada supermercado
INSERT INTO supermercado_areas (supermercado_id, area_id)
SELECT s.id, a.id
FROM supermercados s, areas a
WHERE NOT EXISTS (
  SELECT 1 FROM supermercado_areas sa WHERE sa.supermercado_id = s.id AND sa.area_id = a.id
)
ON CONFLICT DO NOTHING;

-- 00004: Gerente + peso en areas
ALTER TABLE supermercados ADD COLUMN IF NOT EXISTS gerente_id UUID REFERENCES perfiles(id);
ALTER TABLE supermercado_areas ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2) NOT NULL DEFAULT 10 CHECK (peso > 0);

-- 00006: Migrar evaluaciones_supermercado a nuevo formato
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'evaluacion_id') THEN
    ALTER TABLE evaluaciones_supermercado ADD COLUMN evaluacion_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'fecha_inicio') THEN
    ALTER TABLE evaluaciones_supermercado ADD COLUMN fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'observaciones') THEN
    ALTER TABLE evaluaciones_supermercado RENAME COLUMN observaciones TO comentarios;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'estetica') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN estetica;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'presentacion') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN presentacion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'corte_mes') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN corte_mes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'semana') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN semana;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'actualizado_en') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN actualizado_en;
  END IF;
END $$;

ALTER TABLE evaluaciones_supermercado DROP CONSTRAINT IF EXISTS evaluaciones_supermercado_supermercado_id_area_id_corte_mes_semana_key;
CREATE INDEX IF NOT EXISTS idx_evaluaciones_supermercado_evaluacion_id ON evaluaciones_supermercado(evaluacion_id);

-- 00007: Conceptos, criticidades, areas, comentarios
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
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'comentarios') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN comentarios;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluaciones_supermercado' AND column_name = 'limpieza') THEN
    ALTER TABLE evaluaciones_supermercado DROP COLUMN limpieza;
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

-- 00009: DELETE policies for evaluacion_comentarios and evaluacion_headers
DROP POLICY IF EXISTS "Admin puede eliminar evaluacion_comentarios" ON evaluacion_comentarios;
CREATE POLICY "Admin puede eliminar evaluacion_comentarios" ON evaluacion_comentarios
  FOR DELETE
  USING (es_admin());

DROP POLICY IF EXISTS "Evaluador puede eliminar sus comentarios" ON evaluacion_comentarios;
CREATE POLICY "Evaluador puede eliminar sus comentarios" ON evaluacion_comentarios
  FOR DELETE
  USING (creado_por = auth.uid());

-- 00008: evaluacion_headers
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

DROP POLICY IF EXISTS "Evaluador puede eliminar sus headers" ON evaluacion_headers;
CREATE POLICY "Evaluador puede eliminar sus headers" ON evaluacion_headers
  FOR DELETE
  USING (creado_por = auth.uid());

-- 00011: Taller automotriz
CREATE TABLE IF NOT EXISTS vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  color TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Particular' CHECK (tipo IN ('Particular', 'Carga')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS taller_inspecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  evaluador_id UUID NOT NULL REFERENCES perfiles(id),
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  limp_cabina_interna TEXT NOT NULL DEFAULT 'Bueno',
  limp_carroceria_externa TEXT NOT NULL DEFAULT 'Bueno',
  limp_area_carga TEXT NOT NULL DEFAULT 'Bueno',
  limp_parabrisas_ventanas TEXT NOT NULL DEFAULT 'Bueno',
  elec_luces_principales TEXT NOT NULL DEFAULT 'Bueno',
  elec_luces_senalizacion TEXT NOT NULL DEFAULT 'Bueno',
  elec_luces_freno_retroceso TEXT NOT NULL DEFAULT 'Bueno',
  elec_tablero_instrumentos TEXT NOT NULL DEFAULT 'Bueno',
  elec_limpia_parabrisas TEXT NOT NULL DEFAULT 'Bueno',
  elec_bateria TEXT NOT NULL DEFAULT 'Bueno',
  mec_fluidos TEXT NOT NULL DEFAULT 'Bueno',
  mec_fugas TEXT NOT NULL DEFAULT 'Bueno',
  mec_frenos TEXT NOT NULL DEFAULT 'Bueno',
  mec_neumaticos TEXT NOT NULL DEFAULT 'Bueno',
  mec_correas TEXT NOT NULL DEFAULT 'Bueno',
  mec_suspension_direccion TEXT NOT NULL DEFAULT 'Bueno',
  est_carroceria TEXT NOT NULL DEFAULT 'Bueno',
  est_parabrisas TEXT NOT NULL DEFAULT 'Bueno',
  est_tapiceria_asientos TEXT NOT NULL DEFAULT 'Bueno',
  est_retrovisores_parachoques TEXT NOT NULL DEFAULT 'Bueno',
  est_cerraduras_manillas TEXT NOT NULL DEFAULT 'Bueno',
  aux_caucho_repuesto TEXT NOT NULL DEFAULT 'Bueno',
  aux_herramientas TEXT NOT NULL DEFAULT 'Bueno',
  aux_triangulos TEXT NOT NULL DEFAULT 'Bueno',
  aux_extintor TEXT NOT NULL DEFAULT 'Bueno',
  aux_tacos TEXT NOT NULL DEFAULT 'Bueno',
  doc_titulo_propiedad BOOLEAN NOT NULL DEFAULT false,
  doc_poliza_seguro BOOLEAN NOT NULL DEFAULT false,
  doc_impuestos BOOLEAN NOT NULL DEFAULT false,
  doc_carta_autorizacion BOOLEAN NOT NULL DEFAULT false,
  doc_licencia BOOLEAN NOT NULL DEFAULT false,
  doc_certificado_medico BOOLEAN NOT NULL DEFAULT false,
  doc_rotec BOOLEAN NOT NULL DEFAULT false,
  doc_guias_movilizacion BOOLEAN NOT NULL DEFAULT false,
  doc_permiso_sustancias BOOLEAN NOT NULL DEFAULT false,
  doc_guia_sanitaria BOOLEAN NOT NULL DEFAULT false,
  doc_certificado_pesos BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT NOT NULL DEFAULT '',
  firma TEXT,
  pdf_base64 TEXT,
  danos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS taller_mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  mecanico_id UUID NOT NULL REFERENCES perfiles(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('Cambio de aceite', 'Reparacion', 'Revision general', 'Otro')),
  descripcion TEXT NOT NULL DEFAULT '',
  costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_inspecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_mantenimientos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer vehiculos') THEN
    CREATE POLICY "Autenticado puede leer vehiculos" ON vehiculos FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede gestionar vehiculos') THEN
    CREATE POLICY "Admin puede gestionar vehiculos" ON vehiculos FOR ALL USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer taller_inspecciones') THEN
    CREATE POLICY "Autenticado puede leer taller_inspecciones" ON taller_inspecciones FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluadores pueden insertar taller_inspecciones') THEN
    CREATE POLICY "Evaluadores pueden insertar taller_inspecciones" ON taller_inspecciones FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'evaluador'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Creador puede actualizar taller_inspecciones') THEN
    CREATE POLICY "Creador puede actualizar taller_inspecciones" ON taller_inspecciones FOR UPDATE USING (evaluador_id = auth.uid()) WITH CHECK (evaluador_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede eliminar taller_inspecciones') THEN
    CREATE POLICY "Admin puede eliminar taller_inspecciones" ON taller_inspecciones FOR DELETE USING (es_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_taller_inspecciones_vehiculo ON taller_inspecciones(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_taller_mantenimientos_vehiculo ON taller_mantenimientos(vehiculo_id);

ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS danos JSONB NOT NULL DEFAULT '[]';
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS checklist_interior JSONB NOT NULL DEFAULT '[]';
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS checklist_luces JSONB NOT NULL DEFAULT '[]';
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS checklist_lavado JSONB NOT NULL DEFAULT '[]';
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS checklist_mecanico JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS vehiculo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  archivo_base64 TEXT,
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehiculo_id, tipo)
);

ALTER TABLE vehiculo_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehiculo documentos public read" ON vehiculo_documentos FOR SELECT USING (true);
CREATE POLICY "Vehiculo documentos auth insert" ON vehiculo_documentos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Vehiculo documentos auth update" ON vehiculo_documentos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Vehiculo documentos auth delete" ON vehiculo_documentos FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Contabilidad
-- ============================================================
CREATE TABLE IF NOT EXISTS contabilidad_presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  presupuesto DECIMAL(12,2) NOT NULL,
  gasto DECIMAL(12,2) NOT NULL,
  pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones TEXT DEFAULT '',
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contabilidad_presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contabilidad presupuestos read" ON contabilidad_presupuestos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Contabilidad presupuestos insert" ON contabilidad_presupuestos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Contabilidad presupuestos delete" ON contabilidad_presupuestos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS contabilidad_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  vigencia DATE NOT NULL,
  archivo_base64 TEXT,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contabilidad_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contabilidad permisos read" ON contabilidad_permisos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Contabilidad permisos insert" ON contabilidad_permisos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Contabilidad permisos delete" ON contabilidad_permisos FOR DELETE USING (es_admin());

-- ============================================================
-- Administracion
-- ============================================================
CREATE TABLE IF NOT EXISTS administracion_limite_flujo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  limite DECIMAL(12,2) NOT NULL,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mes, anio)
);

ALTER TABLE administracion_limite_flujo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Limite flujo read" ON administracion_limite_flujo FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Limite flujo insert" ON administracion_limite_flujo FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Limite flujo update" ON administracion_limite_flujo FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- Plantas Eléctricas
-- ============================================================
CREATE TABLE IF NOT EXISTS plantas_electricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  capacidad_electrica TEXT NOT NULL,
  capacidad_combustible TEXT NOT NULL,
  combustible_por_hora DECIMAL(10,2) NOT NULL DEFAULT 0,
  horas_para_cambio_aceite DECIMAL(10,2) NOT NULL DEFAULT 250,
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

CREATE TABLE IF NOT EXISTS planta_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id) ON DELETE CASCADE,
  encendido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  apagado_en TIMESTAMPTZ,
  horometro_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  horometro_final DECIMAL(10,2),
  combustible_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  combustible_final DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planta_cargas_combustible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id UUID NOT NULL REFERENCES plantas_electricas(id) ON DELETE CASCADE,
  cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plantas_electricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planta_mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planta_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE planta_cargas_combustible ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_planta_mantenimientos_planta ON planta_mantenimientos(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_registros_planta ON planta_registros(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_cargas_combustible_planta ON planta_cargas_combustible(planta_id);

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

CREATE TABLE IF NOT EXISTS documentacion_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT '',
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

-- ============================================================
-- Modulo de Evaluacion de Almacen y Distribucion
-- ============================================================
CREATE TABLE IF NOT EXISTS almacen_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  peso INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS almacen_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS almacen_concepto_criticidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES almacen_conceptos(id) ON DELETE CASCADE,
  nivel TEXT NOT NULL,
  penalizacion INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS almacen_concepto_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES almacen_conceptos(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES almacen_areas(id) ON DELETE CASCADE,
  UNIQUE(concepto_id, area_id)
);

CREATE TABLE IF NOT EXISTS almacen_evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  inspector TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  fotos JSONB NOT NULL DEFAULT '[]',
  firma TEXT,
  pdf_base64 TEXT,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS almacen_evaluacion_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES almacen_evaluaciones(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES almacen_areas(id),
  concepto_id UUID NOT NULL REFERENCES almacen_conceptos(id),
  criticidad_id UUID NOT NULL REFERENCES almacen_concepto_criticidades(id),
  comentario TEXT NOT NULL DEFAULT '',
  fotos JSONB NOT NULL DEFAULT '[]'
);

INSERT INTO almacen_areas (nombre, peso) VALUES
  ('Cavas', 20), ('Perecederos', 20), ('No perecedero', 20),
  ('Servicios Generales', 20), ('Importados', 20)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO almacen_conceptos (nombre) VALUES
  ('Temperatura de cavas'), ('Orden y limpieza'), ('Uso de EPP'),
  ('Estado de montacargas'), ('Exceso de mercancia por baja rotacion'),
  ('Productos identificados con ficha de recepcion'),
  ('Aplicacion del metodo FIFO'), ('Iluminacion, ventilacion y fugas de agua')
ON CONFLICT (nombre) DO NOTHING;

DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT id FROM almacen_conceptos LOOP
    IF NOT EXISTS (SELECT 1 FROM almacen_concepto_criticidades WHERE concepto_id = c.id AND nivel = 'ALTO') THEN
      INSERT INTO almacen_concepto_criticidades (concepto_id, nivel, penalizacion) VALUES (c.id, 'ALTO', 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM almacen_concepto_criticidades WHERE concepto_id = c.id AND nivel = 'MEDIO') THEN
      INSERT INTO almacen_concepto_criticidades (concepto_id, nivel, penalizacion) VALUES (c.id, 'MEDIO', 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM almacen_concepto_criticidades WHERE concepto_id = c.id AND nivel = 'BAJO') THEN
      INSERT INTO almacen_concepto_criticidades (concepto_id, nivel, penalizacion) VALUES (c.id, 'BAJO', 2);
    END IF;
  END LOOP;
END $$;

DO $$ DECLARE con RECORD; ar RECORD; BEGIN
  FOR con IN SELECT id FROM almacen_conceptos LOOP
    FOR ar IN SELECT id FROM almacen_areas WHERE nombre = 'Cavas' LOOP
      IF NOT EXISTS (SELECT 1 FROM almacen_concepto_areas WHERE concepto_id = con.id AND area_id = ar.id) THEN
        INSERT INTO almacen_concepto_areas (concepto_id, area_id) VALUES (con.id, ar.id);
      END IF;
    END LOOP;
  END LOOP;
END $$;

DO $$ DECLARE tempId UUID; ar RECORD; BEGIN
  SELECT id INTO tempId FROM almacen_conceptos WHERE nombre = 'Temperatura de cavas';
  FOR ar IN SELECT id FROM almacen_areas WHERE nombre IN ('Perecederos', 'No perecedero', 'Servicios Generales', 'Importados') LOOP
    DELETE FROM almacen_concepto_areas WHERE concepto_id = tempId AND area_id = ar.id;
  END LOOP;
END $$;

ALTER TABLE almacen_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen_concepto_criticidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen_concepto_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen_evaluacion_comentarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_areas') THEN
    CREATE POLICY "Autenticado puede leer almacen_areas" ON almacen_areas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_conceptos') THEN
    CREATE POLICY "Autenticado puede leer almacen_conceptos" ON almacen_conceptos FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_concepto_criticidades') THEN
    CREATE POLICY "Autenticado puede leer almacen_concepto_criticidades" ON almacen_concepto_criticidades FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_concepto_areas') THEN
    CREATE POLICY "Autenticado puede leer almacen_concepto_areas" ON almacen_concepto_areas FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_evaluaciones') THEN
    CREATE POLICY "Autenticado puede leer almacen_evaluaciones" ON almacen_evaluaciones FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer almacen_evaluacion_comentarios') THEN
    CREATE POLICY "Autenticado puede leer almacen_evaluacion_comentarios" ON almacen_evaluacion_comentarios FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar almacen_evaluaciones') THEN
    CREATE POLICY "Admin puede insertar almacen_evaluaciones" ON almacen_evaluaciones FOR INSERT WITH CHECK (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede insertar almacen_evaluacion_comentarios') THEN
    CREATE POLICY "Admin puede insertar almacen_evaluacion_comentarios" ON almacen_evaluacion_comentarios FOR INSERT WITH CHECK (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede eliminar almacen_evaluaciones') THEN
    CREATE POLICY "Admin puede eliminar almacen_evaluaciones" ON almacen_evaluaciones FOR DELETE USING (es_admin());
  END IF;
END $$;

-- Seed: Documentacion de Almacen en documentacion_indicadores
INSERT INTO documentacion_indicadores (titulo, tipo, introduccion, objetivo_principal, objetivos_secundarios, metodo_evaluacion, valoracion_resultados, impacto_negocio, responsables_directos, frecuencia_medicion, departamento, repercusion_laboral)
VALUES (
  'Inspeccion Semanal de Almacen', 'KPI',
  'El area de Almacen y Distribucion es responsable de la recepcion, almacenamiento y despacho de mercancia. Para garantizar la calidad y seguridad de las operaciones, se realiza una inspeccion semal que cubre aspectos criticos de infraestructura, procesos y equipos.',
  'Evaluar semanalmente las condiciones operativas del almacen para asegurar el cumplimiento de los estandares de calidad, seguridad y conservacion de la mercancia.',
  '["Verificar que la temperatura de las cavas y cuartos frios se mantenga dentro del rango optimo", "Asegurar el orden y la limpieza general del area de almacenamiento", "Confirmar el uso correcto de los equipos de proteccion personal (EPP)", "Inspeccionar el estado mecanico y operativo de los montacargas", "Detectar exceso de mercancia por baja rotacion y tomar acciones correctivas", "Verificar que todos los productos esten identificados con su ficha de recepcion", "Auditar la aplicacion del metodo FIFO en la rotacion de inventario", "Evaluar las condiciones de iluminacion, ventilacion y detectar fugas de agua"]',
  'Se realiza una inspeccion semanal recorriendo cada area del almacen con una lista de verificacion que cubre: temperatura de cavas y cuartos frios (registro digital), orden y limpieza general (5S), uso de EPP del personal, estado de montacargas (hoja de checklist diario), identificacion de productos con baja rotacion, fichas de recepcion visibles en cada lote, aplicacion de FIFO en fechas de vencimiento/lote, y condiciones de infraestructura (iluminacion, ventilacion, fugas). Cada item se califica como Cumple / No Cumple / No Aplica.',
  'Los resultados se tabulan semanalmente. Se considera APROBADO si al menos el 90% de los items evaluados cumplen. Se genera un plan de accion correctiva para cada item No Cumple con responsable y fecha limite.',
  'El incumplimiento recurrente puede derivar en perdida de mercancia por caducidad o deterioro, accidentes laborales por mal estado de equipos o instalaciones, multas por incumplimiento normativo sanitario, y sobrecostos operativos por baja rotacion no gestionada.',
  '["Jefe de Almacen", "Supervisor de Operaciones", "Coordinador de Calidad"]',
  'Semanal', 'Almacen y distribucion',
  'Un ambiente de trabajo ordenado, limpio y seguro reduce el riesgo de accidentes y enfermedades ocupacionales. La participacion del equipo en las inspecciones fomenta la cultura de mejora continua y responsabilidad compartida.'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Helpdesk / Mesa de Ayuda de Sistemas
-- ============================================================

CREATE TABLE IF NOT EXISTS sistemas_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  ubicacion TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Abierto',
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sistemas_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS sistemas_ticket_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES sistemas_tickets(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sistemas_ticket_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer sistemas_tickets') THEN
    CREATE POLICY "Autenticado puede leer sistemas_tickets" ON sistemas_tickets FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede insertar sistemas_tickets') THEN
    CREATE POLICY "Autenticado puede insertar sistemas_tickets" ON sistemas_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin puede actualizar sistemas_tickets') THEN
    CREATE POLICY "Admin puede actualizar sistemas_tickets" ON sistemas_tickets FOR UPDATE USING (es_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer sistemas_ticket_comentarios') THEN
    CREATE POLICY "Autenticado puede leer sistemas_ticket_comentarios" ON sistemas_ticket_comentarios FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede insertar sistemas_ticket_comentarios') THEN
    CREATE POLICY "Autenticado puede insertar sistemas_ticket_comentarios" ON sistemas_ticket_comentarios FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- Seguridad / Control de Garitas
-- ============================================================

CREATE TABLE IF NOT EXISTS seguridad_vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Particular' CHECK (tipo IN ('Particular', 'Carga')),
  origen TEXT NOT NULL DEFAULT 'Visitante' CHECK (origen IN ('Luxor', 'Visitante')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seguridad_vehiculos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS seguridad_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garita INTEGER NOT NULL CHECK (garita IN (1, 2)),
  placa TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  observacion TEXT NOT NULL DEFAULT '',
  chofer TEXT NOT NULL DEFAULT '',
  tipo_carga TEXT NOT NULL DEFAULT '',
  destino_origen TEXT NOT NULL DEFAULT '',
  nivel_combustible INTEGER,
  combustible_defectuoso BOOLEAN NOT NULL DEFAULT false,
  creado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seguridad_registros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer seguridad_vehiculos') THEN
    CREATE POLICY "Autenticado puede leer seguridad_vehiculos" ON seguridad_vehiculos FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede insertar seguridad_vehiculos') THEN
    CREATE POLICY "Autenticado puede insertar seguridad_vehiculos" ON seguridad_vehiculos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede leer seguridad_registros') THEN
    CREATE POLICY "Autenticado puede leer seguridad_registros" ON seguridad_registros FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autenticado puede insertar seguridad_registros') THEN
    CREATE POLICY "Autenticado puede insertar seguridad_registros" ON seguridad_registros FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- Administracion de usuarios (solo admin)
-- ============================================================

DROP POLICY IF EXISTS "Admin puede actualizar perfiles" ON perfiles;
CREATE POLICY "Admin puede actualizar perfiles" ON perfiles
  FOR UPDATE USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Admin puede eliminar perfiles" ON perfiles;
CREATE POLICY "Admin puede eliminar perfiles" ON perfiles
  FOR DELETE USING (es_admin());

CREATE OR REPLACE FUNCTION admin_crear_usuario(
  p_email TEXT, p_password TEXT, p_nombre TEXT, p_username TEXT, p_rol TEXT DEFAULT 'evaluador'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo administradores pueden crear usuarios'; END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user_id, p_email, crypt(p_password, gen_salt('bf')), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nombre', p_nombre),
    now(), now(), '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated');

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), p_email, v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email', now(), now(), now());

  UPDATE public.perfiles SET nombre = p_nombre, username = p_username, rol = p_rol WHERE id = v_user_id;

  SELECT jsonb_build_object('id', v_user_id, 'nombre', p_nombre, 'username', p_username, 'rol', p_rol) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_eliminar_usuario(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios'; END IF;

  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM public.perfiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- Compras
-- ============================================================
CREATE TABLE IF NOT EXISTS compras_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  ventas_unidades DECIMAL(12,2) NOT NULL DEFAULT 0,
  ventas_dolares DECIMAL(12,2) NOT NULL DEFAULT 0,
  meta_unidades DECIMAL(12,2) NOT NULL DEFAULT 0,
  meta_dolares DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (departamento, mes, anio)
);
ALTER TABLE compras_metas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Compras metas read" ON compras_metas;
CREATE POLICY "Compras metas read" ON compras_metas FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Compras metas insert" ON compras_metas;
CREATE POLICY "Compras metas insert" ON compras_metas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Compras metas delete" ON compras_metas;
CREATE POLICY "Compras metas delete" ON compras_metas FOR DELETE USING (es_admin());

-- ============================================================
-- Inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS inventario_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  botes_porcentaje DECIMAL(5,2) NOT NULL,
  devoluciones_dias INTEGER NOT NULL,
  fidelidad_porcentaje DECIMAL(5,2) NOT NULL,
  error_recepcion_porcentaje DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (departamento, mes, anio)
);
ALTER TABLE inventario_indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventario indicadores read" ON inventario_indicadores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inventario indicadores insert" ON inventario_indicadores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Inventario indicadores delete" ON inventario_indicadores FOR DELETE USING (es_admin());

-- Departamentos (catalogo dinamico)
CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Departamentos read" ON departamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Departamentos insert" ON departamentos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Departamentos delete" ON departamentos FOR DELETE USING (es_admin());

INSERT INTO departamentos (nombre) VALUES
  ('CONSUMO MASIVO'), ('CESTA BASICA'), ('CARNICERIA'), ('FRUTERIA'),
  ('CHARCUTERIA'), ('LICORES'), ('BEBIDAS NO ALCOHOLICAS'), ('COSMETICOS'),
  ('PRODUCCION'), ('SPORT'), ('AUTOMOTRIZ'), ('JARDINERIA'),
  ('FERRETERIA'), ('BAZAR'), ('LIMPIEZA'), ('MASCOTAS')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- CCTV Reportes (CCOM)
-- ============================================================
CREATE TABLE IF NOT EXISTS cctv_reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion TEXT NOT NULL,
  zona TEXT NOT NULL,
  comentario TEXT NOT NULL,
  criticidad TEXT NOT NULL CHECK (criticidad IN ('Baja', 'Media', 'Alta', 'Critica')),
  fotos JSONB DEFAULT '[]'::jsonb,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cctv_reportes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CCTV reportes read" ON cctv_reportes;
CREATE POLICY "CCTV reportes read" ON cctv_reportes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "CCTV reportes insert" ON cctv_reportes;
CREATE POLICY "CCTV reportes insert" ON cctv_reportes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "CCTV reportes delete" ON cctv_reportes;
CREATE POLICY "CCTV reportes delete" ON cctv_reportes FOR DELETE USING (es_admin());

-- ============================================================
-- Recorridos QR
-- ============================================================
CREATE TABLE IF NOT EXISTS recorridos_qr_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE recorridos_qr_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recorridos QR areas read" ON recorridos_qr_areas;
CREATE POLICY "Recorridos QR areas read" ON recorridos_qr_areas FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Recorridos QR areas insert" ON recorridos_qr_areas;
CREATE POLICY "Recorridos QR areas insert" ON recorridos_qr_areas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Recorridos QR areas delete" ON recorridos_qr_areas;
CREATE POLICY "Recorridos QR areas delete" ON recorridos_qr_areas FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS recorridos_qr_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_token TEXT NOT NULL REFERENCES recorridos_qr_areas(token),
  registro_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  novedad TEXT,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE recorridos_qr_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recorridos QR registros read" ON recorridos_qr_registros;
CREATE POLICY "Recorridos QR registros read" ON recorridos_qr_registros FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Recorridos QR registros insert" ON recorridos_qr_registros;
CREATE POLICY "Recorridos QR registros insert" ON recorridos_qr_registros FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Recorridos QR registros delete" ON recorridos_qr_registros;
CREATE POLICY "Recorridos QR registros delete" ON recorridos_qr_registros FOR DELETE USING (es_admin());

-- ============================================================
-- ============================================================
-- RRHH: Bienestar Social
-- ============================================================

CREATE TABLE IF NOT EXISTS rrhh_bienestar_uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  talla TEXT NOT NULL DEFAULT '',
  cantidad INTEGER NOT NULL DEFAULT 1,
  fecha_entrega DATE NOT NULL,
  observaciones TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_bienestar_uniformes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bienestar uniformes read" ON rrhh_bienestar_uniformes;
CREATE POLICY "Bienestar uniformes read" ON rrhh_bienestar_uniformes FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar uniformes insert" ON rrhh_bienestar_uniformes;
CREATE POLICY "Bienestar uniformes insert" ON rrhh_bienestar_uniformes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar uniformes update" ON rrhh_bienestar_uniformes;
CREATE POLICY "Bienestar uniformes update" ON rrhh_bienestar_uniformes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar uniformes delete" ON rrhh_bienestar_uniformes;
CREATE POLICY "Bienestar uniformes delete" ON rrhh_bienestar_uniformes FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_bienestar_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  fecha_evento DATE NOT NULL,
  presupuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'planificado' CHECK (estado IN ('planificado', 'realizado', 'cancelado')),
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_bienestar_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bienestar eventos read" ON rrhh_bienestar_eventos;
CREATE POLICY "Bienestar eventos read" ON rrhh_bienestar_eventos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar eventos insert" ON rrhh_bienestar_eventos;
CREATE POLICY "Bienestar eventos insert" ON rrhh_bienestar_eventos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar eventos update" ON rrhh_bienestar_eventos;
CREATE POLICY "Bienestar eventos update" ON rrhh_bienestar_eventos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar eventos delete" ON rrhh_bienestar_eventos;
CREATE POLICY "Bienestar eventos delete" ON rrhh_bienestar_eventos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_bienestar_ayudas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo_ayuda TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha DATE NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_bienestar_ayudas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bienestar ayudas read" ON rrhh_bienestar_ayudas;
CREATE POLICY "Bienestar ayudas read" ON rrhh_bienestar_ayudas FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar ayudas insert" ON rrhh_bienestar_ayudas;
CREATE POLICY "Bienestar ayudas insert" ON rrhh_bienestar_ayudas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar ayudas update" ON rrhh_bienestar_ayudas;
CREATE POLICY "Bienestar ayudas update" ON rrhh_bienestar_ayudas FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar ayudas delete" ON rrhh_bienestar_ayudas;
CREATE POLICY "Bienestar ayudas delete" ON rrhh_bienestar_ayudas FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_bienestar_nucleo_familiar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  familiar_nombre TEXT NOT NULL,
  parentesco TEXT NOT NULL,
  fecha_nacimiento DATE,
  telefono TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_bienestar_nucleo_familiar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bienestar nucleo read" ON rrhh_bienestar_nucleo_familiar;
CREATE POLICY "Bienestar nucleo read" ON rrhh_bienestar_nucleo_familiar FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar nucleo insert" ON rrhh_bienestar_nucleo_familiar;
CREATE POLICY "Bienestar nucleo insert" ON rrhh_bienestar_nucleo_familiar FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar nucleo update" ON rrhh_bienestar_nucleo_familiar;
CREATE POLICY "Bienestar nucleo update" ON rrhh_bienestar_nucleo_familiar FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bienestar nucleo delete" ON rrhh_bienestar_nucleo_familiar;
CREATE POLICY "Bienestar nucleo delete" ON rrhh_bienestar_nucleo_familiar FOR DELETE USING (es_admin());

-- ============================================================
-- RRHH: Seguridad Laboral
-- ============================================================

CREATE TABLE IF NOT EXISTS rrhh_seguridad_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'vencido', 'tramite')),
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_seguridad_permisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguridad permisos read" ON rrhh_seguridad_permisos;
CREATE POLICY "Seguridad permisos read" ON rrhh_seguridad_permisos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad permisos insert" ON rrhh_seguridad_permisos;
CREATE POLICY "Seguridad permisos insert" ON rrhh_seguridad_permisos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad permisos update" ON rrhh_seguridad_permisos;
CREATE POLICY "Seguridad permisos update" ON rrhh_seguridad_permisos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad permisos delete" ON rrhh_seguridad_permisos;
CREATE POLICY "Seguridad permisos delete" ON rrhh_seguridad_permisos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_seguridad_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  ubicacion TEXT NOT NULL,
  fecha_vencimiento DATE,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_seguridad_equipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguridad equipos read" ON rrhh_seguridad_equipos;
CREATE POLICY "Seguridad equipos read" ON rrhh_seguridad_equipos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad equipos insert" ON rrhh_seguridad_equipos;
CREATE POLICY "Seguridad equipos insert" ON rrhh_seguridad_equipos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad equipos update" ON rrhh_seguridad_equipos;
CREATE POLICY "Seguridad equipos update" ON rrhh_seguridad_equipos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad equipos delete" ON rrhh_seguridad_equipos;
CREATE POLICY "Seguridad equipos delete" ON rrhh_seguridad_equipos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_seguridad_delegados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  fecha_designacion DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_seguridad_delegados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguridad delegados read" ON rrhh_seguridad_delegados;
CREATE POLICY "Seguridad delegados read" ON rrhh_seguridad_delegados FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad delegados insert" ON rrhh_seguridad_delegados;
CREATE POLICY "Seguridad delegados insert" ON rrhh_seguridad_delegados FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad delegados update" ON rrhh_seguridad_delegados;
CREATE POLICY "Seguridad delegados update" ON rrhh_seguridad_delegados FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad delegados delete" ON rrhh_seguridad_delegados;
CREATE POLICY "Seguridad delegados delete" ON rrhh_seguridad_delegados FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_seguridad_botiquin_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  stock_actual INTEGER NOT NULL DEFAULT 0,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_seguridad_botiquin_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguridad botiquin productos read" ON rrhh_seguridad_botiquin_productos;
CREATE POLICY "Seguridad botiquin productos read" ON rrhh_seguridad_botiquin_productos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad botiquin productos insert" ON rrhh_seguridad_botiquin_productos;
CREATE POLICY "Seguridad botiquin productos insert" ON rrhh_seguridad_botiquin_productos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad botiquin productos update" ON rrhh_seguridad_botiquin_productos;
CREATE POLICY "Seguridad botiquin productos update" ON rrhh_seguridad_botiquin_productos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad botiquin productos delete" ON rrhh_seguridad_botiquin_productos;
CREATE POLICY "Seguridad botiquin productos delete" ON rrhh_seguridad_botiquin_productos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_seguridad_botiquin_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES rrhh_seguridad_botiquin_productos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  justificacion TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_seguridad_botiquin_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguridad botiquin movimientos read" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos read" ON rrhh_seguridad_botiquin_movimientos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad botiquin movimientos insert" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos insert" ON rrhh_seguridad_botiquin_movimientos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Seguridad botiquin movimientos delete" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos delete" ON rrhh_seguridad_botiquin_movimientos FOR DELETE USING (es_admin());

-- ============================================================
-- FIN: Full schema listo para nueva cuenta de Supabase
-- ============================================================
-- ============================================================

-- ============================================================
-- RRHH: Candidatos (Reclutamiento y Seleccion)
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT,
  nombres TEXT NOT NULL,
  apellidos TEXT,
  fecha_nacimiento DATE,
  direccion TEXT,
  telefono TEXT,
  correo TEXT,
  profesion TEXT,
  posibles_cargos TEXT,
  ubicacion TEXT,
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'web')),
  cv_url TEXT,
  experiencia TEXT,
  estudios TEXT,
  habilidades TEXT,
  disponibilidad TEXT,
  referencias TEXT,
  estado TEXT NOT NULL DEFAULT 'NUEVO' CHECK (estado IN ('NUEVO', 'PRELIMINAR', 'TECNICA', 'MEDICA', 'ELEGIBLE', 'NO ELEGIBLE', 'ACTIVO', 'EGRESO')),
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_candidatos ADD COLUMN IF NOT EXISTS ubicacion TEXT;

ALTER TABLE rrhh_candidatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH candidatos read" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos read" ON rrhh_candidatos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH candidatos insert" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos insert" ON rrhh_candidatos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH candidatos update" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos update" ON rrhh_candidatos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH candidatos delete" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos delete" ON rrhh_candidatos FOR DELETE USING (es_admin());

-- ============================================================
-- RRHH: Plantillas Aprobadas (cargos aprobados con ubicaciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_plantillas_aprobadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  departamento TEXT NOT NULL,
  congelado BOOLEAN NOT NULL DEFAULT false,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_plantillas_aprobadas ADD COLUMN IF NOT EXISTS congelado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE rrhh_plantillas_aprobadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH plantillas read" ON rrhh_plantillas_aprobadas;
CREATE POLICY "RRHH plantillas read" ON rrhh_plantillas_aprobadas FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH plantillas insert" ON rrhh_plantillas_aprobadas;
CREATE POLICY "RRHH plantillas insert" ON rrhh_plantillas_aprobadas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH plantillas update" ON rrhh_plantillas_aprobadas;
CREATE POLICY "RRHH plantillas update" ON rrhh_plantillas_aprobadas FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH plantillas delete" ON rrhh_plantillas_aprobadas;
CREATE POLICY "RRHH plantillas delete" ON rrhh_plantillas_aprobadas FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_plantillas_ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES rrhh_plantillas_aprobadas(id) ON DELETE CASCADE,
  ubicacion TEXT NOT NULL,
  vacantes INTEGER NOT NULL DEFAULT 1,
  activos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_plantillas_ubicaciones ADD COLUMN IF NOT EXISTS activos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rrhh_plantillas_ubicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH ubicaciones read" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones read" ON rrhh_plantillas_ubicaciones FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH ubicaciones insert" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones insert" ON rrhh_plantillas_ubicaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH ubicaciones update" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones update" ON rrhh_plantillas_ubicaciones FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH ubicaciones delete" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones delete" ON rrhh_plantillas_ubicaciones FOR DELETE USING (es_admin());

-- ============================================================
-- RRHH: Plantillas Idoneas
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_plantillas_idoneas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  departamento TEXT NOT NULL,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_plantillas_idoneas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH idoneas read" ON rrhh_plantillas_idoneas;
CREATE POLICY "RRHH idoneas read" ON rrhh_plantillas_idoneas FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas insert" ON rrhh_plantillas_idoneas;
CREATE POLICY "RRHH idoneas insert" ON rrhh_plantillas_idoneas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas update" ON rrhh_plantillas_idoneas;
CREATE POLICY "RRHH idoneas update" ON rrhh_plantillas_idoneas FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas delete" ON rrhh_plantillas_idoneas;
CREATE POLICY "RRHH idoneas delete" ON rrhh_plantillas_idoneas FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_plantillas_idoneas_ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES rrhh_plantillas_idoneas(id) ON DELETE CASCADE,
  ubicacion TEXT NOT NULL,
  vacantes INTEGER NOT NULL DEFAULT 1,
  activos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_plantillas_idoneas_ubicaciones ADD COLUMN IF NOT EXISTS activos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rrhh_plantillas_idoneas_ubicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH idoneas ubic read" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic read" ON rrhh_plantillas_idoneas_ubicaciones FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas ubic insert" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic insert" ON rrhh_plantillas_idoneas_ubicaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas ubic update" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic update" ON rrhh_plantillas_idoneas_ubicaciones FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH idoneas ubic delete" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic delete" ON rrhh_plantillas_idoneas_ubicaciones FOR DELETE USING (es_admin());

-- ============================================================
-- RRHH: Antecedentes Laborales (Relaciones Laborales)
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_antecedentes_laborales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_antecedentes_laborales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH antecedentes read" ON rrhh_antecedentes_laborales;
CREATE POLICY "RRHH antecedentes read" ON rrhh_antecedentes_laborales FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH antecedentes insert" ON rrhh_antecedentes_laborales;
CREATE POLICY "RRHH antecedentes insert" ON rrhh_antecedentes_laborales FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH antecedentes update" ON rrhh_antecedentes_laborales;
CREATE POLICY "RRHH antecedentes update" ON rrhh_antecedentes_laborales FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH antecedentes delete" ON rrhh_antecedentes_laborales;
CREATE POLICY "RRHH antecedentes delete" ON rrhh_antecedentes_laborales FOR DELETE USING (es_admin());

-- ============================================================
-- RRHH: Tipos de Antecedentes Laborales
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_antecedentes_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO rrhh_antecedentes_tipos (nombre) VALUES
  ('LLAMADO DE ATENCION'),
  ('SUSPENSION'),
  ('DESPIDO'),
  ('RENUNCIA'),
  ('RECONOCIMIENTO')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE rrhh_antecedentes_tipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH ant tipos read" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos read" ON rrhh_antecedentes_tipos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH ant tipos insert" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos insert" ON rrhh_antecedentes_tipos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH ant tipos delete" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos delete" ON rrhh_antecedentes_tipos FOR DELETE USING (es_admin());

-- ============================================================
-- MÓDULO MERCADEO
-- ============================================================

CREATE TABLE IF NOT EXISTS mercadeo_acuerdos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL DEFAULT 0,
  tiempo TEXT NOT NULL DEFAULT '',
  metodo_pago TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'vencido')),
  created_by UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mercadeo_acuerdos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mercadeo acuerdos read" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos read" ON mercadeo_acuerdos FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo acuerdos insert" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos insert" ON mercadeo_acuerdos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo acuerdos update" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos update" ON mercadeo_acuerdos FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo acuerdos delete" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos delete" ON mercadeo_acuerdos FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS mercadeo_diseno_incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  mes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mercadeo_diseno_incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mercadeo diseno read" ON mercadeo_diseno_incidencias;
CREATE POLICY "Mercadeo diseno read" ON mercadeo_diseno_incidencias FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo diseno insert" ON mercadeo_diseno_incidencias;
CREATE POLICY "Mercadeo diseno insert" ON mercadeo_diseno_incidencias FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo diseno delete" ON mercadeo_diseno_incidencias;
CREATE POLICY "Mercadeo diseno delete" ON mercadeo_diseno_incidencias FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS mercadeo_rrss_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes TEXT NOT NULL,
  seguidores_meta INT NOT NULL DEFAULT 0,
  likes_meta INT NOT NULL DEFAULT 0,
  interacciones_meta INT NOT NULL DEFAULT 0,
  seguidores_logrado INT NOT NULL DEFAULT 0,
  likes_logrado INT NOT NULL DEFAULT 0,
  interacciones_logrado INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mercadeo_rrss_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mercadeo rrss read" ON mercadeo_rrss_metas;
CREATE POLICY "Mercadeo rrss read" ON mercadeo_rrss_metas FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo rrss insert" ON mercadeo_rrss_metas;
CREATE POLICY "Mercadeo rrss insert" ON mercadeo_rrss_metas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo rrss update" ON mercadeo_rrss_metas;
CREATE POLICY "Mercadeo rrss update" ON mercadeo_rrss_metas FOR UPDATE USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS mercadeo_marcas_propias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_marca TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA')),
  mes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mercadeo_marcas_propias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mercadeo marcas read" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas read" ON mercadeo_marcas_propias FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo marcas insert" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas insert" ON mercadeo_marcas_propias FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Mercadeo marcas update" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas update" ON mercadeo_marcas_propias FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- RRHH Evaluaciones (RRLL)
-- ============================================================
CREATE TABLE IF NOT EXISTS rrhh_evaluaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  evaluador_nombre TEXT NOT NULL,
  evaluador_cedula TEXT NOT NULL,
  representante_nombre TEXT NOT NULL,
  representante_cedula TEXT NOT NULL,
  firma_tthh TEXT NOT NULL,
  firma_super TEXT NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rrhh_evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRHH evaluaciones read" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones read" ON rrhh_evaluaciones FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH evaluaciones insert" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones insert" ON rrhh_evaluaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "RRHH evaluaciones delete" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones delete" ON rrhh_evaluaciones FOR DELETE USING (es_admin());
