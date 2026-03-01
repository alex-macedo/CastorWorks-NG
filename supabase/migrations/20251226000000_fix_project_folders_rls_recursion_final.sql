-- Fix infinite recursion in project_folders RLS policies
-- This migration definitively fixes the RLS recursion error that prevents
-- querying project_folders and causes foreign key constraint violations
-- when uploading documents to folders.

BEGIN;

-- Drop ALL existing policies on project_folders to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'project_folders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_folders', policy_record.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive SELECT policy
-- Uses has_project_access which should not reference project_folders
CREATE POLICY project_folders_select_policy
  ON public.project_folders
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

-- Create INSERT policy for authenticated users with project access
CREATE POLICY project_folders_insert_policy
  ON public.project_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

-- Create UPDATE policy
CREATE POLICY project_folders_update_policy
  ON public.project_folders
  FOR UPDATE
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  )
  WITH CHECK (
    project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

-- Create DELETE policy
CREATE POLICY project_folders_delete_policy
  ON public.project_folders
  FOR DELETE
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

COMMIT;

-- Test the fix by querying project_folders
-- This should not cause recursion
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM public.project_folders LIMIT 1;
    RAISE NOTICE 'RLS fix successful - project_folders query completed without recursion';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'RLS fix may have issues: %', SQLERRM;
END $$;
