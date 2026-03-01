-- Migration: Add planned_cost column to project_activities for EVM calculations
-- Date: 2025-12-20 12:00:00 UTC
-- Description: Adds planned_cost column to enable activity-level costing for physical-financial schedule

BEGIN;

-- Add planned_cost column to project_activities
-- This represents the budgeted cost for each activity, used for EVM calculations
ALTER TABLE project_activities
ADD COLUMN planned_cost NUMERIC(15,2) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN project_activities.planned_cost IS 'Planned budgeted cost for this activity, used for earned value management calculations';

-- Add check constraint to ensure non-negative costs
ALTER TABLE project_activities
ADD CONSTRAINT planned_cost_non_negative
CHECK (planned_cost >= 0);

-- Update existing activities to have a default planned_cost of 0
-- This ensures backward compatibility
UPDATE project_activities
SET planned_cost = 0.00
WHERE planned_cost IS NULL;

-- Create index for performance when querying by planned_cost
CREATE INDEX idx_project_activities_planned_cost ON project_activities(planned_cost);

COMMIT;