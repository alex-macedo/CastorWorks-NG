-- Add activity_type column to project_activities if missing (needed by delivery confirmation trigger)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_activities'
      AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE public.project_activities
      ADD COLUMN activity_type TEXT;
  END IF;
END $$;
