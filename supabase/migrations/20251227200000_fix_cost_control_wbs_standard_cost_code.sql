-- Migration: Fix Cost Control Budget Creation from WBS Templates
-- Purpose: Add standard_cost_code column to project_wbs_items and update template application function
-- This fixes the issue where cost_control budgets don't get populated from WBS templates

BEGIN;

-- Step 1: Add standard_cost_code column to project_wbs_items table
ALTER TABLE public.project_wbs_items 
  ADD COLUMN IF NOT EXISTS standard_cost_code TEXT;

-- Step 2: Add index for performance when filtering by cost code
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_cost_code
  ON public.project_wbs_items(standard_cost_code)
  WHERE standard_cost_code IS NOT NULL;

-- Step 3: Add comment to explain the column
COMMENT ON COLUMN public.project_wbs_items.standard_cost_code IS 
  'Standard cost code string (e.g., MO, LAB, MAT) copied from template, used by populate_budget_from_cost_control_template to create budget line items';

-- Step 4: Update apply_wbs_template_to_project_internal to copy standard_cost_code
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Avoid double-apply
  IF EXISTS (SELECT 1 FROM public.project_wbs_items WHERE project_id = _project_id) THEN
    RETURN;
  END IF;

  WITH RECURSIVE src AS (
    SELECT
      i.id AS template_item_id,
      i.parent_id,
      i.item_type,
      i.name,
      i.description,
      i.sort_order,
      i.wbs_code,
      i.code_path,
      i.standard_cost_code  -- ✅ ADDED: Include standard_cost_code from template
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    SELECT
      c.id,
      c.parent_id,
      c.item_type,
      c.name,
      c.description,
      c.sort_order,
      c.wbs_code,
      c.code_path,
      c.standard_cost_code  -- ✅ ADDED: Include standard_cost_code from template
    FROM public.project_wbs_template_items c
    JOIN src p ON p.template_item_id = c.parent_id
    WHERE c.template_id = _template_id
  ), mapped AS (
    SELECT
      template_item_id,
      parent_id,
      gen_random_uuid() AS new_id
    FROM src
  )
  INSERT INTO public.project_wbs_items (
    id,
    project_id,
    parent_id,
    source_template_item_id,
    item_type,
    name,
    description,
    sort_order,
    wbs_code,
    code_path,
    standard_cost_code  -- ✅ ADDED: Insert standard_cost_code into project WBS items
  )
  SELECT
    m.new_id,
    _project_id,
    pm.new_id,
    s.template_item_id,
    s.item_type,
    s.name,
    s.description,
    s.sort_order,
    s.wbs_code,
    s.code_path,
    s.standard_cost_code  -- ✅ ADDED: Copy standard_cost_code from template to project
  FROM src s
  JOIN mapped m ON m.template_item_id = s.template_item_id
  LEFT JOIN mapped pm ON pm.template_item_id = s.parent_id
  ORDER BY s.code_path;

  -- Create project_phases for WBS phase nodes (keeps existing budget/milestone features working)
  INSERT INTO public.project_phases (
    project_id,
    phase_name,
    display_order,
    status,
    progress_percentage,
    budget_allocated,
    budget_spent,
    wbs_item_id
  )
  SELECT
    _project_id,
    w.name,
    w.sort_order,
    'pending',
    0,
    0,
    0,
    w.id
  FROM public.project_wbs_items w
  WHERE w.project_id = _project_id
    AND w.item_type = 'phase'::public.wbs_item_type
  ON CONFLICT DO NOTHING;
END;
$$;

-- Step 5: Backfill standard_cost_code for existing project WBS items (if needed)
-- This will copy standard_cost_code from template items to existing project items
UPDATE public.project_wbs_items pwi
SET standard_cost_code = pti.standard_cost_code
FROM public.project_wbs_template_items pti
WHERE pwi.source_template_item_id = pti.id
  AND pwi.standard_cost_code IS NULL
  AND pti.standard_cost_code IS NOT NULL;

COMMIT;
