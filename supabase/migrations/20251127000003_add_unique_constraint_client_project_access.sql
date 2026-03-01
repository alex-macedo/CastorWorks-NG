-- Migration: Add unique constraint to prevent duplicate client project access
-- Ensures that each user can only have ONE access grant per project

-- First, identify and remove any existing duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates (keep the most recent one, delete older ones)
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, project_id
        ORDER BY created_at DESC
      ) as rn
    FROM public.client_project_access
  )
  SELECT COUNT(*) INTO duplicate_count
  FROM duplicates
  WHERE rn > 1;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate client_project_access records', duplicate_count;

    -- Delete duplicates (keep most recent)
    WITH duplicates AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, project_id
          ORDER BY created_at DESC
        ) as rn
      FROM public.client_project_access
    )
    DELETE FROM public.client_project_access
    WHERE id IN (
      SELECT id FROM duplicates WHERE rn > 1
    );

    RAISE NOTICE 'Removed % duplicate records', duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicate records found';
  END IF;
END $$;

-- Add unique constraint to prevent future duplicates
DO $$
BEGIN
  -- Check if the unique constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_project_access_user_project_unique'
      AND conrelid = 'public.client_project_access'::regclass
  ) THEN
    -- Add the unique constraint
    ALTER TABLE public.client_project_access
    ADD CONSTRAINT client_project_access_user_project_unique
    UNIQUE (user_id, project_id);

    RAISE NOTICE 'Added unique constraint client_project_access_user_project_unique';
  ELSE
    RAISE NOTICE 'Unique constraint client_project_access_user_project_unique already exists';
  END IF;
END $$;

-- Add helpful comment
COMMENT ON CONSTRAINT client_project_access_user_project_unique
ON public.client_project_access IS
'Ensures each user can only have one access grant per project';

-- Verify the constraint was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_project_access_user_project_unique'
      AND conrelid = 'public.client_project_access'::regclass
  ) THEN
    RAISE NOTICE 'Verification successful: unique constraint exists';
  ELSE
    RAISE WARNING 'Verification failed: unique constraint is missing';
  END IF;
END $$;
