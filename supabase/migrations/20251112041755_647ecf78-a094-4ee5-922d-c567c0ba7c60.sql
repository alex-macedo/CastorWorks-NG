-- Add notification preference columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- site_issues already has severity column, skip that

-- Add due_date column to quality_inspections if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quality_inspections' AND column_name = 'due_date') THEN
    ALTER TABLE quality_inspections ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add inspection_type column to quality_inspections if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quality_inspections' AND column_name = 'inspection_type') THEN
    ALTER TABLE quality_inspections ADD COLUMN inspection_type TEXT DEFAULT 'general';
  END IF;
END $$;

-- Rename column in delivery_confirmations from delivery_status to status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'delivery_confirmations' AND column_name = 'delivery_status') 
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'delivery_confirmations' AND column_name = 'status') THEN
    ALTER TABLE delivery_confirmations RENAME COLUMN delivery_status TO status;
  END IF;
END $$;

-- Create index for faster notification queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'site_issues'
      AND column_name = 'severity'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'site_issues'
      AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_site_issues_severity_status ON site_issues(severity, status);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quality_inspections'
      AND column_name = 'overall_status'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quality_inspections'
      AND column_name = 'due_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quality_inspections_overall_status_due_date ON quality_inspections(overall_status, due_date);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'delivery_confirmations'
      AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_status ON delivery_confirmations(status);
  END IF;
END;
$$;
