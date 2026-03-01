-- =================================================================
-- FIX PROJECT_FOLDERS RLS INFINITE RECURSION
-- =================================================================
-- Migration: 20251205124000
-- Description: Fix infinite recursion in project_folders RLS policy
--              by simplifying the client folder access check
-- =================================================================

DO $$
DECLARE
  has_project_folders BOOLEAN;
  has_folder_client_access BOOLEAN;
  has_client_project_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) INTO has_project_folders;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folder_client_access' AND n.nspname = 'public'
  ) INTO has_folder_client_access;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'client_project_access' AND n.nspname = 'public'
  ) INTO has_client_project_access;

  IF has_project_folders AND has_folder_client_access AND has_client_project_access THEN
    -- Drop existing SELECT policy
    DROP POLICY IF EXISTS "Users can view folders for accessible projects" ON public.project_folders;

    -- Create new SELECT policy WITHOUT recursion
    -- The key fix: For client folders, we just check has_project_access
    -- Client-specific access is handled separately via folder_client_access table
    CREATE POLICY "Users can view folders for accessible projects"
    ON public.project_folders
    FOR SELECT
    TO authenticated
    USING (
      -- Must have project access
      has_project_access(auth.uid(), project_id)
      AND
      (
        -- Personal folders: only creator can view
        (folder_type = 'personal' AND created_by = auth.uid())
        OR
        -- Shared folders: anyone with project access
        (folder_type = 'shared')
        OR
        -- Client folders: project team members can view
        -- (client access is controlled separately through folder_client_access)
        (folder_type = 'client')
      )
      AND is_deleted = false
    );

  END IF;
END;
$$;
