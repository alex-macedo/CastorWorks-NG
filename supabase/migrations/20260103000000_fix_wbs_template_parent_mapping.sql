-- Migration: Fix WBS Template Parent-Child Hierarchy Mapping
-- Purpose: Fix the bug where all project_wbs_items are assigned to the first parent
-- Problem: The LEFT JOIN in apply_wbs_template_to_project_internal doesn't properly map parent relationships

BEGIN;

-- Drop and recreate the function with the fix
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Avoid double-apply
  IF EXISTS (SELECT 1 FROM public.project_wbs_items WHERE project_id = _project_id) THEN
    RETURN;
  END IF;

  -- Step 1: Create a mapping of template item IDs to new project item IDs
  -- This mapping needs to be created BEFORE we insert, so we can properly reference parent IDs
  WITH RECURSIVE src AS (
    -- Start with root-level items (no parent)
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
      0 AS depth_level
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    -- Recursively get child items
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
      p.depth_level + 1
    FROM public.project_wbs_template_items c
    INNER JOIN src p ON c.parent_id = p.template_item_id
    WHERE c.template_id = _template_id
  ),
  -- Create the ID mapping for ALL items at once
  id_mapping AS (
    SELECT
      template_item_id,
      template_parent_id,
      gen_random_uuid() AS new_project_item_id,
      item_type,
      name,
      description,
      sort_order,
      wbs_code,
      code_path,
      standard_cost_code,
      depth_level
    FROM src
  )
  -- Now insert all items with proper parent_id references
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
    standard_cost_code
  )
  SELECT
    curr.new_project_item_id,                    -- New ID for this item
    _project_id,                                  -- Project ID
    parent_map.new_project_item_id,              -- Mapped parent ID (NULL for root items)
    curr.template_item_id,                       -- Reference to template item
    curr.item_type,
    curr.name,
    curr.description,
    curr.sort_order,
    curr.wbs_code,
    curr.code_path,
    curr.standard_cost_code
  FROM id_mapping curr
  LEFT JOIN id_mapping parent_map 
    ON parent_map.template_item_id = curr.template_parent_id
  ORDER BY curr.depth_level, curr.code_path;  -- Ensure parents are inserted before children

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
  ORDER BY w.sort_order
  ON CONFLICT DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid) IS 
'Applies a WBS template to a project, creating project_wbs_items with proper parent-child hierarchy. 
Fixed to ensure parent_id relationships are correctly maintained by using a pre-computed ID mapping table.';

COMMIT;
