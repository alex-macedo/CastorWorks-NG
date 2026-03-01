-- Add description column to project_activities if missing (required by delivery confirmation trigger)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_activities'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.project_activities
      ADD COLUMN description TEXT;
  END IF;
END $$;
