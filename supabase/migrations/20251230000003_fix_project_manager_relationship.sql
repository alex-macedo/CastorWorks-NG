-- Migration: 20251230000003_fix_project_manager_relationship.sql
-- Purpose: Replace text-based manager column with a manager_id foreign key

BEGIN;

-- 1. Add manager_id column
ALTER TABLE public.projects 
  ADD COLUMN manager_id UUID REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;

-- 2. Backfill manager_id from existing manager names
UPDATE public.projects p
SET manager_id = up.user_id
FROM public.user_profiles up
WHERE TRIM(p.manager) = up.display_name
  AND p.manager_id IS NULL;

-- Case-insensitive attempt for remaining ones
UPDATE public.projects p
SET manager_id = up.user_id
FROM public.user_profiles up
WHERE LOWER(TRIM(p.manager)) = LOWER(up.display_name)
  AND p.manager_id IS NULL;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON public.projects(manager_id);

-- 4. Drop the redundant manager column
-- We do this after backfilling
ALTER TABLE public.projects DROP COLUMN manager;

-- 5. Add a comment to the column
COMMENT ON COLUMN public.projects.manager_id IS 'ID of the project manager (references auth.users)';

COMMIT;
