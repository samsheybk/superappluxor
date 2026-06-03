-- Agregar politica DELETE faltante para supermercado_areas

DROP POLICY IF EXISTS "Admin puede eliminar supermercado_areas" ON supermercado_areas;
CREATE POLICY "Admin puede eliminar supermercado_areas" ON supermercado_areas
  FOR DELETE
  USING (es_admin());
