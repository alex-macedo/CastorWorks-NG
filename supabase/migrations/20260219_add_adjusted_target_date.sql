-- Migration: Add adjusted_target_date to project_milestone_definitions
-- Purpose: Support cascade recalculation logic for milestone dependencies
-- Date: 2026-02-19

BEGIN;

-- Add adjusted_target_date column
ALTER TABLE project_milestone_definitions 
ADD COLUMN IF NOT EXISTS adjusted_target_date DATE;

-- Add description comment
COMMENT ON COLUMN project_milestone_definitions.adjusted_target_date IS 
'Milestone date calculated after applying delay cascades and dependency logic. If null, target_date is used.';

-- Add index for performance in cascade lookups
CREATE INDEX IF NOT EXISTS idx_milestone_definitions_adjusted_date
  ON project_milestone_definitions(adjusted_target_date);

COMMIT;
