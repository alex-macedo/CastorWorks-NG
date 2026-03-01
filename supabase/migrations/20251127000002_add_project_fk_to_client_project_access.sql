-- Migration: Add missing foreign key constraint for project_id in client_project_access
-- This enables Supabase PostgREST to properly resolve the relationship between client_project_access and projects

-- Check if any invalid project_id references exist and log them
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.client_project_access cpa
  WHERE cpa.project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = cpa.project_id);

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % client_project_access records with invalid project_id references', invalid_count;
    -- Optionally: Set invalid project_ids to NULL
    UPDATE public.client_project_access
    SET project_id = NULL
    WHERE project_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id);

    RAISE NOTICE 'Set % invalid project_id values to NULL', invalid_count;
  ELSE
    RAISE NOTICE 'All project_id references are valid';
  END IF;
END $$;

-- Add the foreign key constraint
DO $$
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'client_project_access'
      AND constraint_name = 'client_project_access_project_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE public.client_project_access
    ADD CONSTRAINT client_project_access_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint client_project_access_project_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint client_project_access_project_id_fkey already exists';
  END IF;
END $$;

-- Verify the constraint was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'client_project_access'
      AND constraint_name = 'client_project_access_project_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE 'Verification successful: project_id foreign key constraint exists';
  ELSE
    RAISE WARNING 'Verification failed: project_id foreign key constraint is missing';
  END IF;
END $$;
