-- Migration to add get_user_accessible_projects RPC function
-- This function returns all project IDs that a user has access to.

CREATE OR REPLACE FUNCTION public.get_user_accessible_projects(_user_id uuid)
RETURNS TABLE (project_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT id FROM public.projects p
  WHERE public.user_has_project_access(p.id, _user_id);
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_accessible_projects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_projects(uuid) TO service_role;
