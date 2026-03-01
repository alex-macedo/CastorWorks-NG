-- Add CHECK constraint to projects.type column to enforce allowed values
-- Project types: 'Own Build' (revenue enabled) or 'Final Contractor' (revenue disabled)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'type'
  ) THEN
    RAISE NOTICE 'projects.type column not found; skipping projects_type_check constraint';
    RETURN;
  END IF;

  -- Add CHECK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_type_check'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_type_check
      CHECK (type IS NULL OR type IN ('Own Build', 'Final Contractor'));
  END IF;
END $$;
