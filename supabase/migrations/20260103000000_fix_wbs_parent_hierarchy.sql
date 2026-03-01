-- Fix WBS parent hierarchy mapping
-- This migration corrects the apply_wbs_template_to_project_internal function
-- to properly maintain parent-child relationships when copying from template

BEGIN;

-- Drop and recreate the function with correct parent mapping
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Avoid double-apply
  IF EXISTS (SELECT 1 FROM public.project_wbs_items WHERE project_id = _project_id) THEN
    RETURN;
  END IF;

  -- Use recursive CTE to traverse template hierarchy and create mapping
  WITH RECURSIVE src AS (
    -- Start with root items (no parent)
    SELECT
      i.id AS template_item_id,
      i.parent_id AS template_parent_id,
      i.item_type,
      i.name,
      i.description,
      i.sort_order,
      i.wbs_code,
      i.code_path,
      i.standard_cost_code,
      0 AS level
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    -- Recursively get children
    SELECT
      c.id,
      c.parent_id,
      c.item_type,
      c.name,
      c.description,
      c.sort_order,
      c.wbs_code,
      c.code_path,
      c.standard_cost_code,
      p.level + 1
    FROM public.project_wbs_template_items c
    JOIN src p ON p.template_item_id = c.parent_id
    WHERE c.template_id = _template_id
  ),
  -- Create UUID mapping for each template item
  mapped AS (
    SELECT
      template_item_id,
      template_parent_id,
      gen_random_uuid() AS new_id
    FROM src
  )
  -- Insert with correctly mapped parent_id
  INSERT INTO public.project_wbs_items (
    id,
    project_id,
    parent_id,  -- This is the key field for hierarchy
    source_template_item_id,
    item_type,
    name,
    description,
    sort_order,
    wbs_code,
    code_path,
    standard_cost_code
  )
  SELECT
    m.new_id,
    _project_id,
    -- CRITICAL FIX: Map template_parent_id to new parent UUID
    -- If template_parent_id is NULL (root item), parent_id is NULL
    -- Otherwise, lookup the new_id for the template_parent_id
    (SELECT pm.new_id FROM mapped pm WHERE pm.template_item_id = s.template_parent_id),
    s.template_item_id,
    s.item_type,
    s.name,
    s.description,
    s.sort_order,
    s.wbs_code,
    s.code_path,
    s.standard_cost_code
  FROM src s
  JOIN mapped m ON m.template_item_id = s.template_item_id
  -- Order by level and code_path to ensure parents are inserted before children
  ORDER BY s.level, s.code_path;

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

COMMIT;
