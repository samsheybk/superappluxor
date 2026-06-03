-- Agregar politicas DELETE faltantes para evaluacion_comentarios y evaluacion_headers

-- Para evaluacion_comentarios: admin puede eliminar cualquier comentario
DROP POLICY IF EXISTS "Admin puede eliminar evaluacion_comentarios" ON evaluacion_comentarios;
CREATE POLICY "Admin puede eliminar evaluacion_comentarios" ON evaluacion_comentarios
  FOR DELETE
  USING (es_admin());

-- Para evaluacion_comentarios: evaluador puede eliminar sus propios comentarios
DROP POLICY IF EXISTS "Evaluador puede eliminar sus comentarios" ON evaluacion_comentarios;
CREATE POLICY "Evaluador puede eliminar sus comentarios" ON evaluacion_comentarios
  FOR DELETE
  USING (creado_por = auth.uid());

-- Para evaluacion_headers: admin puede eliminar cualquier header
-- (ya existe "Admin puede todo en evaluacion_headers" que cubre DELETE)

-- Para evaluacion_headers: evaluador puede eliminar sus propios headers
DROP POLICY IF EXISTS "Evaluador puede eliminar sus headers" ON evaluacion_headers;
CREATE POLICY "Evaluador puede eliminar sus headers" ON evaluacion_headers
  FOR DELETE
  USING (creado_por = auth.uid());
