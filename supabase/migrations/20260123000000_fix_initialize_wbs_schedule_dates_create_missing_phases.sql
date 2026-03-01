-- Fix initialize_wbs_schedule_dates to create missing project_phases records
-- Date: 2026-01-23
-- Purpose: Ensure that initialize_wbs_schedule_dates creates project_phases records
--          if they don't exist, so dates can be properly populated

BEGIN;

-- Update the function to create missing project_phases records
CREATE OR REPLACE FUNCTION public.initialize_wbs_schedule_dates(
  _project_id UUID
)
RETURNS TABLE(
  out_wbs_item_id UUID,
  out_start_date DATE,
  out_end_date DATE,
  out_duration_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_start_date DATE;
  v_current_date DATE;
  v_item RECORD;
  v_parent_end_date DATE;
  v_child_duration INT;
  v_items_updated INT DEFAULT 0;
  v_phases_created INT DEFAULT 0;
BEGIN
  -- Get project start date
  SELECT p.start_date INTO v_project_start_date
  FROM public.projects p
  WHERE p.id = _project_id;

  IF v_project_start_date IS NULL THEN
    RAISE EXCEPTION 'Project start_date is not set for project %', _project_id;
  END IF;

  -- Create temp table to store calculated dates
  CREATE TEMP TABLE IF NOT EXISTS temp_wbs_dates (
    wbs_item_id UUID PRIMARY KEY,
    parent_id UUID,
    level INT,
    sort_order INT,
    start_date DATE,
    end_date DATE,
    duration_days INT,
    code_path TEXT,
    item_type public.wbs_item_type,
    item_name TEXT
  ) ON COMMIT DROP;
  
  TRUNCATE temp_wbs_dates;

  -- First pass: Calculate dates for all items using recursive CTE
  -- Process items in hierarchical order (parents before children)
  WITH RECURSIVE wbs_tree AS (
    -- Root level items (phases - no parent)
    SELECT 
      wi.id,
      wi.parent_id,
      wi.sort_order,
      wi.code_path,
      wi.standard_duration_days,
      wi.item_type,
      wi.name,
      1 AS level,
      ROW_NUMBER() OVER (ORDER BY wi.sort_order, wi.code_path) AS global_order
    FROM public.project_wbs_items wi
    WHERE wi.project_id = _project_id
      AND wi.parent_id IS NULL
    
    UNION ALL
    
    -- Child items
    SELECT 
      wi.id,
      wi.parent_id,
      wi.sort_order,
      wi.code_path,
      wi.standard_duration_days,
      wi.item_type,
      wi.name,
      wt.level + 1,
      wt.global_order * 1000 + ROW_NUMBER() OVER (
        PARTITION BY wi.parent_id 
        ORDER BY wi.sort_order, wi.code_path
      )
    FROM public.project_wbs_items wi
    JOIN wbs_tree wt ON wt.id = wi.parent_id
    WHERE wi.project_id = _project_id
  )
  INSERT INTO temp_wbs_dates (wbs_item_id, parent_id, level, sort_order, duration_days, code_path, item_type, item_name)
  SELECT id, parent_id, level, sort_order, COALESCE(standard_duration_days, 1), code_path, item_type, name
  FROM wbs_tree
  ORDER BY global_order;

  -- Second pass: Calculate start dates sequentially
  -- For each level, items start after the previous sibling ends
  v_current_date := v_project_start_date;
  
  FOR v_item IN (
    SELECT * FROM temp_wbs_dates 
    WHERE parent_id IS NULL 
    ORDER BY sort_order, code_path
  ) LOOP
    -- Calculate children's total duration for this phase
    SELECT COALESCE(SUM(twd.duration_days), 0) INTO v_child_duration
    FROM temp_wbs_dates twd
    WHERE twd.parent_id = v_item.wbs_item_id;
    
    -- Update phase dates
    UPDATE temp_wbs_dates 
    SET start_date = v_current_date,
        end_date = v_current_date + GREATEST(v_item.duration_days, v_child_duration, 1) - 1,
        duration_days = GREATEST(v_item.duration_days, v_child_duration, 1)
    WHERE temp_wbs_dates.wbs_item_id = v_item.wbs_item_id
    RETURNING temp_wbs_dates.end_date INTO v_parent_end_date;
    
    -- Process children of this phase
    DECLARE
      v_child RECORD;
      v_child_start DATE := v_current_date;
    BEGIN
      FOR v_child IN (
        SELECT * FROM temp_wbs_dates 
        WHERE parent_id = v_item.wbs_item_id 
        ORDER BY sort_order, code_path
      ) LOOP
        UPDATE temp_wbs_dates 
        SET start_date = v_child_start,
            end_date = v_child_start + COALESCE(v_child.duration_days, 1) - 1
        WHERE temp_wbs_dates.wbs_item_id = v_child.wbs_item_id;
        
        v_child_start := v_child_start + COALESCE(v_child.duration_days, 1);
      END LOOP;
    END;
    
    -- Next phase starts after this one ends
    v_current_date := v_parent_end_date + 1;
  END LOOP;

  -- CRITICAL FIX: Create missing project_phases records for phase-type WBS items
  -- This ensures that all phase-type WBS items have corresponding project_phases records
  INSERT INTO public.project_phases (
    project_id,
    phase_name,
    sort_order,
    status,
    progress_percentage,
    budget_allocated,
    budget_spent,
    wbs_item_id,
    type,
    start_date,
    end_date
  )
  SELECT
    _project_id,
    twd.item_name,
    COALESCE((SELECT wi2.sort_order FROM public.project_wbs_items wi2 WHERE wi2.id = twd.wbs_item_id), 0),
    'pending'::phase_status,
    0,
    0,
    0,
    twd.wbs_item_id,
    'schedule',
    twd.start_date,
    twd.end_date
  FROM temp_wbs_dates twd
  WHERE twd.item_type = 'phase'::public.wbs_item_type
    AND NOT EXISTS (
      SELECT 1 FROM public.project_phases pp
      WHERE pp.wbs_item_id = twd.wbs_item_id
        AND pp.project_id = _project_id
    )
  ON CONFLICT (project_id, wbs_item_id) WHERE wbs_item_id IS NOT NULL
  DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    type = EXCLUDED.type,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_phases_created = ROW_COUNT;
  RAISE NOTICE 'Created/updated % project_phases records', v_phases_created;

  -- Update existing project_phases with calculated dates for phase-type WBS items
  -- Use a loop to update each phase individually to avoid any column ambiguity
  FOR v_item IN (
    SELECT 
      twd.wbs_item_id,
      twd.start_date AS calc_start_date,
      twd.end_date AS calc_end_date
    FROM temp_wbs_dates twd
    WHERE twd.item_type = 'phase'::public.wbs_item_type
  ) LOOP
    UPDATE public.project_phases
    SET 
      start_date = v_item.calc_start_date,
      end_date = v_item.calc_end_date,
      updated_at = NOW()
    WHERE project_phases.wbs_item_id = v_item.wbs_item_id
      AND project_phases.project_id = _project_id;
  END LOOP;
  
  GET DIAGNOSTICS v_items_updated = ROW_COUNT;
  
  RAISE NOTICE 'Updated % project_phases with schedule dates', v_items_updated;

  -- Return the calculated dates with renamed output columns to avoid ambiguity
  RETURN QUERY
  SELECT 
    twd.wbs_item_id AS out_wbs_item_id,
    twd.start_date AS out_start_date,
    twd.end_date AS out_end_date,
    twd.duration_days AS out_duration_days
  FROM temp_wbs_dates twd
  ORDER BY twd.code_path;
END;
$$;

COMMENT ON FUNCTION public.initialize_wbs_schedule_dates(UUID) IS 
'Calculates and sets start/end dates for WBS items based on project start date and standard durations. 
Creates missing project_phases records if they don''t exist, then updates them with calculated schedule dates.
Phases are processed sequentially, with each phase starting after the previous one ends.
Children within a phase are also processed sequentially.';

COMMIT;
