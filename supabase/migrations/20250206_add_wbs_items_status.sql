-- Migration: Add status column to project_wbs_items for task start tracking
-- This migration adds an optional status column to track task state transitions for WBS-based projects

-- Add status column with default value 'pending'
ALTER TABLE public.project_wbs_items
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked'));

-- Create index on status for performance
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_status 
ON public.project_wbs_items(status);
