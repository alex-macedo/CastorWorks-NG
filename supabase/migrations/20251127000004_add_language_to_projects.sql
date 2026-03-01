-- Migration: Add language field to projects table
-- This enables language-based state/region selection

DO $$
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'language'
  ) THEN
    -- Add the language column
    ALTER TABLE public.projects
    ADD COLUMN language TEXT DEFAULT 'pt-BR';

    RAISE NOTICE 'Added language column to projects table';
  ELSE
    RAISE NOTICE 'Language column already exists';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.projects.language IS
  'ISO language code (e.g., pt-BR for Brazilian Portuguese, en-US for English, es-ES for Spanish, fr-FR for French)';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'language'
  ) THEN
    RAISE NOTICE 'Verification successful: language column exists';
  ELSE
    RAISE WARNING 'Verification failed: language column is missing';
  END IF;
END $$;
