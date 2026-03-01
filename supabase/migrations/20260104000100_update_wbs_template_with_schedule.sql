-- Migration: Update WBS Template Application to Include Duration and Auto-Schedule
-- Date: 2026-01-04
-- Purpose: 
-- 1. Copy standard_duration_days from template items to project items
-- 2. Automatically initialize schedule dates after template application

BEGIN;

-- Update the apply_wbs_template_to_project_internal function to:
-- 1. Copy standard_duration_days from template
-- 2. Call initialize_wbs_schedule_dates after creating items
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_project_start_date DATE;
BEGIN
  -- Avoid double-apply
  SELECT COUNT(*) INTO v_count
  FROM public.project_wbs_items 
  WHERE project_id = _project_id;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'WBS items already exist for project %, skipping template application', _project_id;
    RETURN;
  END IF;

  -- Get project start date for schedule calculation
  SELECT p.start_date INTO v_project_start_date
  FROM public.projects p
  WHERE p.id = _project_id;

  RAISE NOTICE 'Applying WBS template % to project % (start_date: %)', _template_id, _project_id, v_project_start_date;

  -- Create a complete mapping table with parent relationships preserved
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
      i.standard_duration_days,  -- Include duration
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
      child.standard_duration_days,  -- Include duration
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
      standard_duration_days,  -- Include duration
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
    standard_cost_code,
    standard_duration_days  -- Include duration
  )
  SELECT
    curr.new_project_item_id AS id,
    _project_id AS project_id,
    parent_map.new_project_item_id AS parent_id,
    curr.template_item_id AS source_template_item_id,
    curr.item_type,
    curr.name,
    curr.description,
    curr.sort_order,
    curr.wbs_code,
    curr.code_path,
    curr.standard_cost_code,
    COALESCE(curr.standard_duration_days, 1)  -- Default to 1 day if not set
  FROM uuid_mapping curr
  LEFT JOIN uuid_mapping parent_map 
    ON parent_map.template_item_id = curr.template_parent_id
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

  -- Automatically initialize schedule dates if project has a start_date
  IF v_project_start_date IS NOT NULL THEN
    RAISE NOTICE 'Initializing WBS schedule dates from project start_date: %', v_project_start_date;
    PERFORM public.initialize_wbs_schedule_dates(_project_id);
  ELSE
    RAISE NOTICE 'Project start_date not set, skipping schedule initialization';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error applying WBS template: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid) IS 
'Applies a WBS template to a project, creating project_wbs_items with proper parent-child hierarchy.
Now includes:
- Copying standard_duration_days from template to project items
- Automatic schedule date initialization using project start_date
Schedule calculation uses sequential scheduling where each item starts after the previous ends.';

COMMIT;
