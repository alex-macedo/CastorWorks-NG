-- Create function to check if user has access to a project
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- For now, allow all authenticated users to access all projects
  -- This can be refined later based on business requirements
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
  ) AND _user_id IS NOT NULL
$function$;

-- Create function to check if user has admin access to a project
CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Check if user is either an admin or the project owner
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE id = _project_id
        AND owner_id = _user_id
    )
  )
$function$;