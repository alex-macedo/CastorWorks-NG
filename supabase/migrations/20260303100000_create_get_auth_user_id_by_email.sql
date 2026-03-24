-- Helper for create-user Edge Function: look up existing auth user by email
-- when admin.createUser fails with "user already registered".
-- SECURITY DEFINER allows reading auth.users; only callable by service_role via RPC.

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_auth_user_id_by_email(text) IS
  'Returns auth.users.id for a given email. Used by create-user Edge Function when user already exists.';
