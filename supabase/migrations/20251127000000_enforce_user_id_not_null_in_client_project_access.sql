-- Migration: Enforce user_id NOT NULL constraint in client_project_access table
-- This ensures that every client project access record is tied to a specific user account

-- First, clean up any existing records with NULL user_id (if any)
-- This should not affect data since the application now requires user_id
DO $$
BEGIN
  -- Delete any records with NULL user_id (should be none in production)
  DELETE FROM public.client_project_access WHERE user_id IS NULL;

  RAISE NOTICE 'Cleaned up % records with NULL user_id', (SELECT COUNT(*) FROM public.client_project_access WHERE user_id IS NULL);
END $$;

-- Add NOT NULL constraint to user_id column
-- This will prevent future insertions without a valid user_id
DO $$
BEGIN
  -- Check if the constraint already exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_project_access'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.client_project_access
    ALTER COLUMN user_id SET NOT NULL;

    RAISE NOTICE 'Added NOT NULL constraint to client_project_access.user_id';
  ELSE
    RAISE NOTICE 'user_id column already has NOT NULL constraint or does not exist';
  END IF;
END $$;

-- Update the comment on the table to reflect the requirement
COMMENT ON COLUMN public.client_project_access.user_id IS
  'Required user ID from auth.users - every client access must be tied to a specific user account with the client role';

-- Verify the constraint
DO $$
DECLARE
  is_nullable TEXT;
BEGIN
  SELECT column_default INTO is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'client_project_access'
    AND column_name = 'user_id';

  IF is_nullable = 'NO' THEN
    RAISE NOTICE 'Verification successful: user_id column is NOT NULL';
  ELSE
    RAISE WARNING 'Verification failed: user_id column may still be nullable';
  END IF;
END $$;
