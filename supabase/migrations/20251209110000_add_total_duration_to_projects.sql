-- Add total_duration column to projects table
-- This stores the total project duration in days
-- When combined with start_date, it can calculate end_date

BEGIN;

-- Add total_duration column (integer for number of days)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN projects.total_duration IS 'Total project duration in days (business days or calendar days). Used with start_date to calculate end_date.';

-- Update existing projects to calculate total_duration from start_date and end_date
-- This is a one-time calculation for existing data
UPDATE projects
SET total_duration = CASE 
  WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
    (end_date::date - start_date::date) + 1
  ELSE NULL
END
WHERE total_duration IS NULL;

-- Create a function to auto-update end_date when start_date or total_duration changes
CREATE OR REPLACE FUNCTION update_project_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_date and total_duration are set, calculate end_date
  IF NEW.start_date IS NOT NULL AND NEW.total_duration IS NOT NULL AND NEW.total_duration > 0 THEN
    NEW.end_date = (NEW.start_date::date + (NEW.total_duration - 1))::date;
  -- If start_date and end_date are set but no total_duration, calculate it
  ELSIF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.total_duration IS NULL THEN
    NEW.total_duration = (NEW.end_date::date - NEW.start_date::date) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update end_date
DROP TRIGGER IF EXISTS trigger_update_project_end_date ON projects;
CREATE TRIGGER trigger_update_project_end_date
  BEFORE INSERT OR UPDATE OF start_date, total_duration, end_date
  ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_end_date();

COMMIT;
