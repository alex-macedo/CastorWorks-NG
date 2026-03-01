-- Harden RLS for user_profiles and user_roles
BEGIN;

-- user_profiles
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles'
  ) THEN
    DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
    DROP POLICY IF EXISTS "user_insert_own_profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
  END IF;
END$$;

CREATE POLICY "Users and admins can view user profiles"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and admins can insert user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and admins can update user profiles"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and admins can delete user profiles"
  ON user_profiles FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- user_roles
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    DROP POLICY IF EXISTS "users_view_own_roles_or_admin" ON user_roles;
    DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
    DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
    DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
  END IF;
END$$;

CREATE POLICY "Users and admins can view roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

COMMIT;
