-- Add create_default_phases boolean column to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS create_default_phases boolean DEFAULT true;

-- Backfill existing rows to true if null
UPDATE projects SET create_default_phases = true WHERE create_default_phases IS NULL;

-- Note: RLS policies should continue to work; this column is a UI flag only.
