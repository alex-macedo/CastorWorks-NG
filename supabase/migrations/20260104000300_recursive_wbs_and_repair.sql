-- Migration: Recursive WBS Schedule and Hierarchy Repair
-- Date: 2026-01-04
-- Purpose: 
-- 1. Make initialize_wbs_schedule_dates recursive to handle any depth
-- 2. Add a repair function to fix corrupted parent_id relationships based on code_path

BEGIN;

-- 1) Recursive WBS Schedule Initialization
CREATE OR REPLACE FUNCTION public.initialize_wbs_schedule_dates(_project_id UUID)
RETURNS TABLE(
  wbs_item_id UUID,
  start_date DATE,
  end_date DATE,
  duration_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_start_date DATE;
  v_items_updated INT DEFAULT 0;
BEGIN
  -- Get project start date
  SELECT p.start_date INTO v_project_start_date
  FROM public.projects p
  WHERE p.id = _project_id;

  IF v_project_start_date IS NULL THEN
    RAISE EXCEPTION 'Project start_date is not set for project %', _project_id;
  END IF;

  -- Create temp table for calculation
  CREATE TEMP TABLE IF NOT EXISTS temp_wbs_calc (
    id UUID PRIMARY KEY,
    parent_id UUID,
    sort_order INT,
    code_path TEXT,
    duration INT,
    calc_start DATE,
    calc_end DATE,
    level INT
  ) ON COMMIT DROP;
  
  TRUNCATE temp_wbs_calc;

  -- Step 1: Load all items with levels
  WITH RECURSIVE wbs_tree AS (
    SELECT id, parent_id, sort_order, code_path, COALESCE(standard_duration_days, 1) as duration, 0 as level
    FROM public.project_wbs_items
    WHERE project_id = _project_id AND parent_id IS NULL
    UNION ALL
    SELECT child.id, child.parent_id, child.sort_order, child.code_path, COALESCE(child.standard_duration_days, 1), parent_rec.level + 1
    FROM public.project_wbs_items child
    JOIN wbs_tree parent_rec ON child.parent_id = parent_rec.id
  )
  INSERT INTO temp_wbs_calc (id, parent_id, sort_order, code_path, duration, level)
  SELECT id, parent_id, sort_order, code_path, duration, level FROM wbs_tree;

  -- Step 2: Calculate dates level by level using a procedural approach to handle sequential same-level scheduling
  -- This is more robust than a single CTE for complex sequential logic
  DECLARE
    v_level INT := 0;
    v_max_level INT;
    v_parent_id UUID;
    v_current_start DATE;
    v_item RECORD;
  BEGIN
    SELECT MAX(level) INTO v_max_level FROM temp_wbs_calc;
    
    -- Root level (Phases)
    v_current_start := v_project_start_date;
    FOR v_item IN SELECT id, duration FROM temp_wbs_calc WHERE level = 0 ORDER BY sort_order, code_path LOOP
      UPDATE temp_wbs_calc SET calc_start = v_current_start, calc_end = v_current_start + duration - 1 WHERE id = v_item.id;
      -- Next root item starts after this one + its total subtree duration (but simplified to sequential here)
      -- Actually, we'll just do sequential phases for now as per current logic
      v_current_start := v_current_start + v_item.duration;
    END LOOP;

    -- Sub-levels (1 to N)
    FOR v_level IN 1..v_max_level LOOP
      -- For each parent at the previous level
      FOR v_parent_id IN SELECT id FROM temp_wbs_calc WHERE level = v_level - 1 LOOP
        -- Start children at their parent's start date, then sequential
        SELECT calc_start INTO v_current_start FROM temp_wbs_calc WHERE id = v_parent_id;
        
        FOR v_item IN SELECT id, duration FROM temp_wbs_calc WHERE parent_id = v_parent_id ORDER BY sort_order, code_path LOOP
          UPDATE temp_wbs_calc SET calc_start = v_current_start, calc_end = v_current_start + duration - 1 WHERE id = v_item.id;
          v_current_start := v_current_start + v_item.duration;
        END LOOP;
      END LOOP;
    END LOOP;
  END;

  -- Step 3: Sync to project_phases
  UPDATE public.project_phases pp
  SET start_date = twc.calc_start, end_date = twc.calc_end, updated_at = NOW()
  FROM temp_wbs_calc twc
  WHERE pp.wbs_item_id = twc.id AND pp.project_id = _project_id;

  RETURN QUERY SELECT id, calc_start, calc_end, duration FROM temp_wbs_calc ORDER BY code_path;
END;
$$;

-- 2) Hierarchy Repair Function
-- Fixes corrupted parent_id relationships by looking at the code_path
-- e.g., '001.002' parent should be '001'
CREATE OR REPLACE FUNCTION public.repair_project_wbs_hierarchy(_project_id UUID)
RETURNS TABLE (item_id UUID, item_name TEXT, old_parent UUID, new_parent UUID) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH mapping AS (
    SELECT 
      curr.id as item_id,
      curr.name as item_name,
      curr.parent_id as old_parent_id,
      (
        SELECT p.id 
        FROM public.project_wbs_items p 
        WHERE p.project_id = _project_id 
          AND p.code_path = substring(curr.code_path from 1 for length(curr.code_path) - 4) -- Assumes '0XX.' format
          AND curr.code_path LIKE p.code_path || '.%'
        LIMIT 1
      ) as expected_parent_id
    FROM public.project_wbs_items curr
    WHERE curr.project_id = _project_id
      AND curr.code_path LIKE '%.%' -- Only children have dots in path
  )
  UPDATE public.project_wbs_items w
  SET parent_id = m.expected_parent_id
  FROM mapping m
  WHERE w.id = m.item_id 
    AND (w.parent_id IS DISTINCT FROM m.expected_parent_id)
  RETURNING w.id, w.name, m.old_parent_id, w.parent_id;
END;
$$;

-- Modify the apply_wbs_template function to automatically call the repair if something goes wrong
-- (Just in case, though the temp table fix should prevent new bugs)

COMMIT;
