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
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)), 'evaluador');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION crear_perfil_nuevo_usuario();

INSERT INTO perfiles (id, nombre, rol)
SELECT id, 'Administrador', 'admin'
FROM auth.users
WHERE email = 'admin@evaluxor.com'
  AND NOT EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.users.id);
