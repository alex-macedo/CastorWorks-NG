-- Add sales pipeline column configuration to app_settings table

BEGIN;

-- Add sales_pipeline_columns field to store JSON array of visible column IDs
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS sales_pipeline_columns JSONB DEFAULT NULL;

-- Update RLS policies (already allow authenticated users to view, admins to update)
-- No changes needed as existing policies cover this

-- Set default value to show all columns (null means show all)
UPDATE public.app_settings
SET
  sales_pipeline_columns = NULL,
  updated_at = now()
WHERE id IS NOT NULL;

COMMIT;