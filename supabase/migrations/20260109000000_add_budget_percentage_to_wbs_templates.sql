-- Migration: Add budget_percentage field to WBS templates for Cost Control budget distribution
-- Purpose: Enable automatic budget distribution across phases when generating Cost Control budgets
-- This aligns WBS templates with phase_templates functionality

BEGIN;

-- Add budget_percentage to project_wbs_template_items (template definition)
-- Only meaningful for item_type = 'phase', represents percentage of total project budget
ALTER TABLE public.project_wbs_template_items
ADD COLUMN IF NOT EXISTS budget_percentage NUMERIC(5,2) DEFAULT 0
CHECK (budget_percentage >= 0 AND budget_percentage <= 100);

-- Add budget_percentage to project_wbs_items (project-specific WBS instances)
-- Copied from template when WBS is applied to project
ALTER TABLE public.project_wbs_items
ADD COLUMN IF NOT EXISTS budget_percentage NUMERIC(5,2) DEFAULT 0
CHECK (budget_percentage >= 0 AND budget_percentage <= 100);

-- Add helpful comments
COMMENT ON COLUMN public.project_wbs_template_items.budget_percentage IS
'For phase items: percentage of project total budget allocated to this phase (0-100).
For non-phase items: ignored. Used by populate_budget_from_cost_control_template to distribute budget.';

COMMENT ON COLUMN public.project_wbs_items.budget_percentage IS
'For phase items: percentage of project total budget allocated to this phase (0-100).
Copied from template. Used to calculate phase budget allocations.';

-- Update existing WBS templates with reasonable default percentages
-- This is a placeholder - actual percentages should be set based on construction industry standards

-- Brazilian Residential WBS - typical distribution
-- These percentages are starting points and can be adjusted per project
UPDATE public.project_wbs_template_items
SET budget_percentage = CASE name
  WHEN 'Site Preparation' THEN 8.0
  WHEN 'Foundation' THEN 15.0
  WHEN 'Framing' THEN 20.0
  WHEN 'Rough-In (Electrical, Plumbing, HVAC)' THEN 12.0
  WHEN 'Insulation & Drywall' THEN 10.0
  WHEN 'Interior Finishing' THEN 18.0
  WHEN 'Exterior Finishing' THEN 12.0
  WHEN 'Final Inspection & Cleanup' THEN 5.0
  ELSE 0.0
END
WHERE item_type = 'phase'::public.wbs_item_type
  AND template_id IN (
    SELECT id FROM public.project_wbs_templates
    WHERE template_name ILIKE '%residential%' OR template_name ILIKE '%brazilian%'
  );

-- For other WBS templates, distribute equally among phases
-- Users can adjust these percentages later
WITH phase_counts AS (
  SELECT
    template_id,
    COUNT(*) as phase_count
  FROM public.project_wbs_template_items
  WHERE item_type = 'phase'::public.wbs_item_type
  GROUP BY template_id
)
UPDATE public.project_wbs_template_items wti
SET budget_percentage = ROUND((100.0 / pc.phase_count)::numeric, 2)
FROM phase_counts pc
WHERE wti.template_id = pc.template_id
  AND wti.item_type = 'phase'::public.wbs_item_type
  AND wti.budget_percentage = 0;

-- Log the update results
DO $$
DECLARE
  v_template_count INTEGER;
  v_phase_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT template_id) INTO v_template_count
  FROM public.project_wbs_template_items
  WHERE item_type = 'phase'::public.wbs_item_type
    AND budget_percentage > 0;

  SELECT COUNT(*) INTO v_phase_count
  FROM public.project_wbs_template_items
  WHERE item_type = 'phase'::public.wbs_item_type
    AND budget_percentage > 0;

  RAISE NOTICE '[add_budget_percentage] Updated % templates with % phase budget percentages',
    v_template_count, v_phase_count;
END $$;

COMMIT;
