-- Create get_system_users function for seed data seeding
-- Returns a list of system users (excluding the current user) for team assignment in demo data

CREATE OR REPLACE FUNCTION public.get_system_users()
RETURNS TABLE(id UUID, email TEXT, user_metadata JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $function$
  SELECT
    id,
    email,
    raw_user_meta_data as user_metadata
  FROM auth.users
  WHERE email IS NOT NULL
  LIMIT 10;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_system_users() TO authenticated;
