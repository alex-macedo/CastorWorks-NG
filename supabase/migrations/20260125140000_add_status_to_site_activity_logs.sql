-- Migration: Add status field to site_activity_logs for tracking activity status
-- This migration adds a status column to track activity progress (on_track, delayed, completed)

-- Add status column with default value 'on_track'
ALTER TABLE public.site_activity_logs
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'on_track'
  CHECK (status IN ('on_track', 'delayed', 'completed'));

-- Create index on status for performance
CREATE INDEX IF NOT EXISTS idx_site_activity_logs_status 
ON public.site_activity_logs(status);

-- Add comment
COMMENT ON COLUMN public.site_activity_logs.status IS 'Activity status: on_track (default), delayed, or completed';
