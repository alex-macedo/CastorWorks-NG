-- Add type column to project_phases table
-- Types: 'schedule', 'financial', 'budget'

-- Add the type column (no default - must be set explicitly)
ALTER TABLE public.project_phases
ADD COLUMN IF NOT EXISTS type TEXT
CHECK (type IN ('schedule', 'financial', 'budget'));

-- Update existing data based on start_date
-- Items without start_date → type 'budget'
-- Items with start_date → type 'schedule'
UPDATE public.project_phases
SET type = CASE
  WHEN start_date IS NULL THEN 'budget'
  ELSE 'schedule'
END
WHERE type IS NULL; -- Only update rows where type is not yet set

-- Set NOT NULL constraint after updating all existing rows
ALTER TABLE public.project_phases
ALTER COLUMN type SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_phases_type ON public.project_phases(project_id, type);

-- Add comment to column
COMMENT ON COLUMN public.project_phases.type IS 'Phase type: schedule (has dates), budget (no dates), financial (financial planning)';

