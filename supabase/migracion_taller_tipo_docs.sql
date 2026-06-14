-- Agregar tipo a vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Particular' CHECK (tipo IN ('Particular', 'Carga'));

-- Reemplazar documentos por columnas individuales en taller_inspecciones
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'documentos') THEN
    ALTER TABLE taller_inspecciones DROP COLUMN documentos;
  END IF;
END $$;

ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_titulo_propiedad BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_poliza_seguro BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_impuestos BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_carta_autorizacion BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_licencia BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_certificado_medico BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_rotec BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_guias_movilizacion BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_permiso_sustancias BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_guia_sanitaria BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taller_inspecciones ADD COLUMN IF NOT EXISTS doc_certificado_pesos BOOLEAN NOT NULL DEFAULT false;
