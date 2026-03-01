-- Migration: Add activity status field for task start tracking
-- This migration adds an optional status column to track task state transitions
-- Existing activities are backfilled based on their completion_percentage

-- Add status column with default value 'pending'
ALTER TABLE public.project_activities
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked'));

-- Create index on status for performance
CREATE INDEX IF NOT EXISTS idx_project_activities_status 
ON public.project_activities(status);

-- Backfill existing activities: mark as completed if completion is 100%
UPDATE public.project_activities
SET status = 'completed'
WHERE completion_percentage = 100 AND status = 'pending';

-- Backfill existing activities: mark as in_progress if partially complete
UPDATE public.project_activities
SET status = 'in_progress'
WHERE completion_percentage > 0 AND completion_percentage < 100 AND status = 'pending';
