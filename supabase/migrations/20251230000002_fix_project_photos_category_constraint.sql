-- Fix project_photos category constraint to include project_delivery
-- This resolves the bug where photo uploads appear successful but photos don't display

DO $$
BEGIN
  -- Drop the existing check constraint
  ALTER TABLE project_photos DROP CONSTRAINT IF EXISTS project_photos_category_check;

  -- Add the updated check constraint with project_delivery included
  ALTER TABLE project_photos ADD CONSTRAINT project_photos_category_check
    CHECK (category IN ('before', 'during', 'after', 'issues', 'completion', 'project_delivery', 'other'));
END $$;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT project_photos_category_check ON project_photos IS 'Valid photo categories: before, during, after, issues, completion, project_delivery, other';