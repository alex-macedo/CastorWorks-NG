-- Fix infinite recursion in project_folders RLS by removing self-referential policies
BEGIN;

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- Drop any known recursive policies by common names; keep IF EXISTS to be safe
DROP POLICY IF EXISTS "recursive_project_folders_access" ON public.project_folders;
DROP POLICY IF EXISTS authenticated_select_project_folders ON public.project_folders;
DROP POLICY IF EXISTS authenticated_manage_project_folders ON public.project_folders;

-- Safe, non-recursive policies using helper function and direct project_id
-- If project_id is nullable for some root folders, constrain to non-null rows

CREATE POLICY project_scoped_select_project_folders
  ON public.project_folders
  FOR SELECT
  USING (
    project_folders.project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_folders.project_id)
  );

CREATE POLICY admin_pm_manage_project_folders
  ON public.project_folders
  FOR ALL
  USING (
    project_folders.project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_folders.project_id)
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  )
  WITH CHECK (
    project_folders.project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_folders.project_id)
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  );

COMMIT;
