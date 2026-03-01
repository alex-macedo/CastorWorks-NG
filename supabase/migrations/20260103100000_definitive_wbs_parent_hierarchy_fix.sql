-- Migration: Definitive WBS Template Parent-Child Hierarchy Fix
-- Date: 2026-01-03
-- Purpose: Final fix for parent-child relationship mapping in WBS template application
-- Problem: All project_wbs_items were being assigned to the first parent instead of maintaining proper hierarchy

BEGIN;

-- Drop and recreate the function with the DEFINITIVE fix
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Avoid double-apply
  SELECT COUNT(*) INTO v_count
  FROM public.project_wbs_items 
  WHERE project_id = _project_id;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'WBS items already exist for project %, skipping template application', _project_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Applying WBS template % to project %', _template_id, _project_id;

  -- Create a complete mapping table with parent relationships preserved
  -- We use a two-step approach:
  -- 1. Generate new UUIDs for all template items
  -- 2. Insert with properly mapped parent_id references
  
  WITH RECURSIVE 
  -- Step 1: Build the complete template hierarchy starting from roots
  template_hierarchy AS (
    -- Base case: root items (no parent)
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
      0 AS hierarchy_level,
      i.code_path AS sort_key
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    -- Recursive case: child items
    SELECT
      child.id AS template_item_id,
      child.parent_id AS template_parent_id,
      child.item_type,
      child.name,
      child.description,
      child.sort_order,
      child.wbs_code,
      child.code_path,
      child.standard_cost_code,
      parent_rec.hierarchy_level + 1 AS hierarchy_level,
      child.code_path AS sort_key
    FROM public.project_wbs_template_items child
    INNER JOIN template_hierarchy parent_rec 
      ON child.parent_id = parent_rec.template_item_id
    WHERE child.template_id = _template_id
  ),
  -- Step 2: Generate new UUIDs for all items in the hierarchy
  uuid_mapping AS (
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
      hierarchy_level,
      sort_key
    FROM template_hierarchy
  )
  -- Step 3: Insert all items with correctly mapped parent_id
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
    curr.new_project_item_id AS id,
    _project_id AS project_id,
    -- CRITICAL: Map the template's parent_id to the corresponding new project item's UUID
    -- For root items (template_parent_id IS NULL), this will be NULL
    -- For child items, this finds the new_project_item_id of the parent
    parent_map.new_project_item_id AS parent_id,
    curr.template_item_id AS source_template_item_id,
    curr.item_type,
    curr.name,
    curr.description,
    curr.sort_order,
    curr.wbs_code,
    curr.code_path,
    curr.standard_cost_code
  FROM uuid_mapping curr
  -- LEFT JOIN ensures root items (with NULL template_parent_id) get NULL parent_id
  -- For non-root items, this matches the template_parent_id to find the new parent UUID
  LEFT JOIN uuid_mapping parent_map 
    ON parent_map.template_item_id = curr.template_parent_id
  -- Order by hierarchy level and code_path to ensure parents are inserted before children
  -- This is important for foreign key constraint satisfaction
  ORDER BY curr.hierarchy_level ASC, curr.sort_key;

  -- Get count for verification
  SELECT COUNT(*) INTO v_count
  FROM public.project_wbs_items 
  WHERE project_id = _project_id;
  
  RAISE NOTICE 'Created % WBS items for project %', v_count, _project_id;

  -- Create project_phases for WBS phase items (maintains compatibility with existing features)
  INSERT INTO public.project_phases (
    project_id,
    phase_name,
    sort_order,
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
    'pending'::phase_status,
    0,
    0,
    0,
    w.id
  FROM public.project_wbs_items w
  WHERE w.project_id = _project_id
    AND w.item_type = 'phase'::public.wbs_item_type
  ORDER BY w.sort_order
  ON CONFLICT DO NOTHING;
  
  SELECT COUNT(*) INTO v_count
  FROM public.project_phases 
  WHERE project_id = _project_id;
  
  RAISE NOTICE 'Created % project phases for project %', v_count, _project_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error applying WBS template: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid) IS 
'Applies a WBS template to a project, creating project_wbs_items with proper parent-child hierarchy.
DEFINITIVE FIX (2026-01-03): Ensures parent_id relationships are correctly maintained by:
1. Building complete hierarchy using recursive CTE starting from root items
2. Pre-generating UUID mapping for all items
3. Properly mapping template parent_id to new project item parent_id via LEFT JOIN
4. Inserting in hierarchy order to satisfy foreign key constraints
Includes diagnostic RAISE NOTICE statements for debugging.';

COMMIT;
