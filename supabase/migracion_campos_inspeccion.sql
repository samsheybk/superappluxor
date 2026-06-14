-- Eliminar campos viejos
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS limpieza;
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS luces;
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS aire_acondicionado;
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS asientos;
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS pintura;
ALTER TABLE taller_inspecciones DROP COLUMN IF EXISTS neumaticos;

-- Agregar nuevos campos categorizados
DO $$ BEGIN
  -- LIMPIEZA
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'limp_cabina_interna') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN limp_cabina_interna TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'limp_carroceria_externa') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN limp_carroceria_externa TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'limp_area_carga') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN limp_area_carga TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'limp_parabrisas_ventanas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN limp_parabrisas_ventanas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;

  -- ELECTRICO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_luces_principales') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_luces_principales TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_luces_senalizacion') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_luces_senalizacion TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_luces_freno_retroceso') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_luces_freno_retroceso TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_tablero_instrumentos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_tablero_instrumentos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_limpia_parabrisas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_limpia_parabrisas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'elec_bateria') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN elec_bateria TEXT NOT NULL DEFAULT 'Bueno';
  END IF;

  -- MECANICO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_fluidos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_fluidos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_fugas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_fugas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_frenos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_frenos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_neumaticos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_neumaticos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_correas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_correas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'mec_suspension_direccion') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN mec_suspension_direccion TEXT NOT NULL DEFAULT 'Bueno';
  END IF;

  -- ESTETICA
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'est_carroceria') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN est_carroceria TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'est_parabrisas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN est_parabrisas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'est_tapiceria_asientos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN est_tapiceria_asientos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'est_retrovisores_parachoques') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN est_retrovisores_parachoques TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'est_cerraduras_manillas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN est_cerraduras_manillas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;

  -- AUXILIO VIAL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'aux_caucho_repuesto') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN aux_caucho_repuesto TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'aux_herramientas') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN aux_herramientas TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'aux_triangulos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN aux_triangulos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'aux_extintor') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN aux_extintor TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taller_inspecciones' AND column_name = 'aux_tacos') THEN
    ALTER TABLE taller_inspecciones ADD COLUMN aux_tacos TEXT NOT NULL DEFAULT 'Bueno';
  END IF;
END $$;
