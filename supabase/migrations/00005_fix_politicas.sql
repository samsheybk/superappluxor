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
