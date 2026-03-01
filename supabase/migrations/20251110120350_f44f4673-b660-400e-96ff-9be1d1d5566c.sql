-- Update RLS policy to allow project admins to insert activities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'project_activities'
  ) THEN
    DROP POLICY IF EXISTS "Project members can insert activities" ON public.project_activities;
    DROP POLICY IF EXISTS "Project admins and members can insert activities" ON public.project_activities;
    CREATE POLICY "Project admins and members can insert activities"
      ON public.project_activities
      FOR INSERT
      TO public
      WITH CHECK (
        has_project_admin_access(auth.uid(), project_id)
        OR has_project_access(auth.uid(), project_id)
      );
  END IF;
END;
$$;
