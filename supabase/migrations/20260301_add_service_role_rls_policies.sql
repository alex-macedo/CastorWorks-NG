-- Add RLS policies for service_role on user_roles table
-- This allows edge functions to manage user roles during user creation

CREATE POLICY "service_role_can_insert_user_roles"
  ON public.user_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_can_update_user_roles"
  ON public.user_roles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_can_delete_user_roles"
  ON public.user_roles
  FOR DELETE
  TO service_role
  USING (true);

-- Add RLS policies for service_role on user_profiles table
-- This allows edge functions to create user profiles during user creation

CREATE POLICY "service_role_can_insert_user_profiles"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_can_update_user_profiles"
  ON public.user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_can_select_user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO service_role
  USING (true);

