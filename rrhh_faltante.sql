-- ============================================================
-- Crear tablas en orden correcto (dependencias primero)
-- ============================================================

-- 1. perfiles (FK de rrhh_candidatos)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfiles read" ON perfiles;
CREATE POLICY "Perfiles read" ON perfiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Perfiles insert" ON perfiles;
CREATE POLICY "Perfiles insert" ON perfiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Perfiles update" ON perfiles;
CREATE POLICY "Perfiles update" ON perfiles FOR UPDATE USING (auth.role() = 'authenticated');

-- 1b. supermercados (FK de rrhh_evaluaciones)
CREATE TABLE IF NOT EXISTS supermercados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL, direccion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE supermercados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supermercados read" ON supermercados;
CREATE POLICY "Supermercados read" ON supermercados FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Supermercados insert" ON supermercados;
CREATE POLICY "Supermercados insert" ON supermercados FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. rrhh_candidatos
CREATE TABLE IF NOT EXISTS rrhh_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cedula TEXT, nombres TEXT NOT NULL, apellidos TEXT,
  fecha_nacimiento DATE, direccion TEXT, telefono TEXT, correo TEXT, profesion TEXT, posibles_cargos TEXT,
  ubicacion TEXT, origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'web')),
  cv_url TEXT, experiencia TEXT, estudios TEXT, habilidades TEXT, disponibilidad TEXT, referencias TEXT,
  estado TEXT NOT NULL DEFAULT 'NUEVO' CHECK (estado IN ('NUEVO','PRELIMINAR','TECNICA','MEDICA','ELEGIBLE','NO ELEGIBLE','ACTIVO','EGRESO')),
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rrhh_candidatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RRHH candidatos read" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos read" ON rrhh_candidatos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH candidatos insert" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos insert" ON rrhh_candidatos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH candidatos update" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos update" ON rrhh_candidatos FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH candidatos delete" ON rrhh_candidatos;
CREATE POLICY "RRHH candidatos delete" ON rrhh_candidatos FOR DELETE USING (es_admin());

-- 3. Tablas que referencian rrhh_candidatos
CREATE TABLE IF NOT EXISTS rrhh_bienestar_uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, talla TEXT NOT NULL DEFAULT '', cantidad INTEGER NOT NULL DEFAULT 1,
  fecha_entrega DATE NOT NULL, observaciones TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '',
  fecha_evento DATE NOT NULL, presupuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'planificado' CHECK (estado IN ('planificado', 'realizado', 'cancelado')),
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo_ayuda TEXT NOT NULL, monto DECIMAL(12,2) NOT NULL DEFAULT 0, fecha DATE NOT NULL, motivo TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  familiar_nombre TEXT NOT NULL, parentesco TEXT NOT NULL, fecha_nacimiento DATE, telefono TEXT NOT NULL DEFAULT '',
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS rrhh_seguridad_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo TEXT NOT NULL, ubicacion TEXT NOT NULL,
  fecha_emision DATE NOT NULL, fecha_vencimiento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'vencido', 'tramite')),
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '',
  ubicacion TEXT NOT NULL, fecha_vencimiento DATE,
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  fecha_designacion DATE NOT NULL, activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ubicacion TEXT NOT NULL, nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '', stock_actual INTEGER NOT NULL DEFAULT 0,
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')), cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  justificacion TEXT NOT NULL DEFAULT '', creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rrhh_seguridad_botiquin_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Seguridad botiquin movimientos read" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos read" ON rrhh_seguridad_botiquin_movimientos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Seguridad botiquin movimientos insert" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos insert" ON rrhh_seguridad_botiquin_movimientos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Seguridad botiquin movimientos delete" ON rrhh_seguridad_botiquin_movimientos;
CREATE POLICY "Seguridad botiquin movimientos delete" ON rrhh_seguridad_botiquin_movimientos FOR DELETE USING (es_admin());

-- 4. rrhh_plantillas_aprobadas (no depende de rrhh_candidatos)
CREATE TABLE IF NOT EXISTS rrhh_plantillas_aprobadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), descripcion TEXT NOT NULL, departamento TEXT NOT NULL,
  congelado BOOLEAN NOT NULL DEFAULT false, creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
  ubicacion TEXT NOT NULL, vacantes INTEGER NOT NULL DEFAULT 1, activos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rrhh_plantillas_ubicaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RRHH ubicaciones read" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones read" ON rrhh_plantillas_ubicaciones FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH ubicaciones insert" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones insert" ON rrhh_plantillas_ubicaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH ubicaciones update" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones update" ON rrhh_plantillas_ubicaciones FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH ubicaciones delete" ON rrhh_plantillas_ubicaciones;
CREATE POLICY "RRHH ubicaciones delete" ON rrhh_plantillas_ubicaciones FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_plantillas_idoneas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), descripcion TEXT NOT NULL, departamento TEXT NOT NULL,
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  ubicacion TEXT NOT NULL, vacantes INTEGER NOT NULL DEFAULT 1, activos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rrhh_plantillas_idoneas_ubicaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RRHH idoneas ubic read" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic read" ON rrhh_plantillas_idoneas_ubicaciones FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH idoneas ubic insert" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic insert" ON rrhh_plantillas_idoneas_ubicaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH idoneas ubic update" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic update" ON rrhh_plantillas_idoneas_ubicaciones FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH idoneas ubic delete" ON rrhh_plantillas_idoneas_ubicaciones;
CREATE POLICY "RRHH idoneas ubic delete" ON rrhh_plantillas_idoneas_ubicaciones FOR DELETE USING (es_admin());

CREATE TABLE IF NOT EXISTS rrhh_antecedentes_laborales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES rrhh_candidatos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, descripcion TEXT NOT NULL, fecha DATE NOT NULL,
  creado_por UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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

CREATE TABLE IF NOT EXISTS rrhh_antecedentes_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO rrhh_antecedentes_tipos (nombre) VALUES
  ('LLAMADO DE ATENCION'), ('SUSPENSION'), ('DESPIDO'), ('RENUNCIA'), ('RECONOCIMIENTO')
ON CONFLICT (nombre) DO NOTHING;
ALTER TABLE rrhh_antecedentes_tipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RRHH ant tipos read" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos read" ON rrhh_antecedentes_tipos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH ant tipos insert" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos insert" ON rrhh_antecedentes_tipos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH ant tipos delete" ON rrhh_antecedentes_tipos;
CREATE POLICY "RRHH ant tipos delete" ON rrhh_antecedentes_tipos FOR DELETE USING (es_admin());

-- 5. mercadeo
CREATE TABLE IF NOT EXISTS mercadeo_acuerdos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), proveedor TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL DEFAULT 0, tiempo TEXT NOT NULL DEFAULT '',
  metodo_pago TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'vencido')),
  created_by UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE mercadeo_acuerdos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mercadeo acuerdos read" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos read" ON mercadeo_acuerdos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Mercadeo acuerdos insert" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos insert" ON mercadeo_acuerdos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Mercadeo acuerdos update" ON mercadeo_acuerdos;
CREATE POLICY "Mercadeo acuerdos update" ON mercadeo_acuerdos FOR UPDATE USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS mercadeo_diseno_incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plataforma TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '', mes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES perfiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE mercadeo_diseno_incidencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mercadeo diseno read" ON mercadeo_diseno_incidencias;
CREATE POLICY "Mercadeo diseno read" ON mercadeo_diseno_incidencias FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Mercadeo diseno insert" ON mercadeo_diseno_incidencias;
CREATE POLICY "Mercadeo diseno insert" ON mercadeo_diseno_incidencias FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS mercadeo_rrss_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mes TEXT NOT NULL,
  seguidores_meta INT NOT NULL DEFAULT 0, likes_meta INT NOT NULL DEFAULT 0, interacciones_meta INT NOT NULL DEFAULT 0,
  seguidores_logrado INT NOT NULL DEFAULT 0, likes_logrado INT NOT NULL DEFAULT 0, interacciones_logrado INT NOT NULL DEFAULT 0,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre_marca TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA')),
  mes TEXT NOT NULL DEFAULT '', created_by UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE mercadeo_marcas_propias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mercadeo marcas read" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas read" ON mercadeo_marcas_propias FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Mercadeo marcas insert" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas insert" ON mercadeo_marcas_propias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Mercadeo marcas update" ON mercadeo_marcas_propias;
CREATE POLICY "Mercadeo marcas update" ON mercadeo_marcas_propias FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. rrhh_evaluaciones (depende de supermercados)
CREATE TABLE IF NOT EXISTS rrhh_evaluaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supermercado_id UUID NOT NULL REFERENCES supermercados(id) ON DELETE CASCADE,
  evaluador_nombre TEXT NOT NULL, evaluador_cedula TEXT NOT NULL,
  representante_nombre TEXT NOT NULL, representante_cedula TEXT NOT NULL,
  firma_tthh TEXT NOT NULL, firma_super TEXT NOT NULL, items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rrhh_evaluaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RRHH evaluaciones read" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones read" ON rrhh_evaluaciones FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH evaluaciones insert" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones insert" ON rrhh_evaluaciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "RRHH evaluaciones delete" ON rrhh_evaluaciones;
CREATE POLICY "RRHH evaluaciones delete" ON rrhh_evaluaciones FOR DELETE USING (es_admin());
