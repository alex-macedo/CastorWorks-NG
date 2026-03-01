-- Add standard duration (days) fields for Project WBS templates and their items
-- NOTE: This is nullable so only activity-like nodes need to fill it.

BEGIN;

ALTER TABLE public.project_wbs_templates
  ADD COLUMN IF NOT EXISTS standard_duration_days INT;

ALTER TABLE public.project_wbs_template_items
  ADD COLUMN IF NOT EXISTS standard_duration_days INT;

-- Basic sanity constraints (allow NULL, otherwise must be >= 0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_wbs_templates_standard_duration_days_nonneg'
  ) THEN
    ALTER TABLE public.project_wbs_templates
      ADD CONSTRAINT project_wbs_templates_standard_duration_days_nonneg
      CHECK (standard_duration_days IS NULL OR standard_duration_days >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_wbs_template_items_standard_duration_days_nonneg'
  ) THEN
    ALTER TABLE public.project_wbs_template_items
      ADD CONSTRAINT project_wbs_template_items_standard_duration_days_nonneg
      CHECK (standard_duration_days IS NULL OR standard_duration_days >= 0);
  END IF;
END $$;

COMMIT;


