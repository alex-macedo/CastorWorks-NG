-- Add duration column to project_phases table
-- This allows storing duration separately from calculated date differences

BEGIN;

-- Add duration column (integer for number of days)
ALTER TABLE project_phases 
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN project_phases.duration IS 'Duration in days (can be business days or calendar days depending on project settings)';

-- Update existing phases to calculate duration from start_date and end_date
-- This is a one-time calculation for existing data
-- Date subtraction in PostgreSQL returns number of days as integer
UPDATE project_phases
SET duration = CASE 
  WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
    (end_date::date - start_date::date) + 1
  ELSE NULL
END
WHERE duration IS NULL;

COMMIT;
