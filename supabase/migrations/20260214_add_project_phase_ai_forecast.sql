-- Migration: Add AI forecast and milestone fields to project_phases
-- Purpose: Enable AI-driven completion forecasts and milestone tracking
-- Date: 2026-02-14

BEGIN;

-- Add AI-adjusted forecast date field
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS adjusted_end_date DATE;

COMMENT ON COLUMN project_phases.adjusted_end_date IS
'AI-predicted completion date based on current progress, historical velocity, and risk factors. Updated automatically when progress changes or manually via Edge Function.';

-- Add milestone type indicator
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;

COMMENT ON COLUMN project_phases.is_milestone IS
'True if this phase represents a milestone (key delivery point) such as Fundação, 1º Laje, Portas Internas, etc. Milestones are displayed with special markers on the timeline.';

-- Create index for faster timeline queries (covers date range queries)
CREATE INDEX IF NOT EXISTS idx_project_phases_dates
ON project_phases(project_id, start_date, end_date, adjusted_end_date)
WHERE start_date IS NOT NULL;

-- Create index for milestone queries (partial index for better performance)
CREATE INDEX IF NOT EXISTS idx_project_phases_milestones
ON project_phases(project_id, is_milestone, start_date)
WHERE is_milestone = true;

-- Add index for adjusted forecast queries
CREATE INDEX IF NOT EXISTS idx_project_phases_forecast
ON project_phases(adjusted_end_date)
WHERE adjusted_end_date IS NOT NULL;

COMMIT;
