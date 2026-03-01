-- Add progress_percentage column to project_wbs_items table
-- This column tracks the completion progress of each WBS item

ALTER TABLE public.project_wbs_items 
ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Create index for performance when filtering by progress
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_progress ON public.project_wbs_items(progress_percentage);

COMMENT ON COLUMN public.project_wbs_items.progress_percentage IS 'Completion progress of the WBS item (0-100%)';
