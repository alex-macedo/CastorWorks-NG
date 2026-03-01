-- Fix WBS-linked phase progress sync
-- This script adds functionality to calculate phase progress from WBS items
-- for phases that are linked to WBS items (wbs_item_id IS NOT NULL)

-- Function to calculate phase progress from WBS items
CREATE OR REPLACE FUNCTION recalculate_phase_progress_from_wbs(p_phase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wbs_item_id uuid;
    v_phase_name text;
    v_project_id uuid;
    v_child_count integer;
    v_completed_count integer;
    v_avg_progress numeric;
    v_new_status phase_status;
    v_earliest_start date;
    v_latest_end date;
BEGIN
    -- Get phase info and check if it's WBS-linked
    SELECT wbs_item_id, phase_name, project_id
    INTO v_wbs_item_id, v_phase_name, v_project_id
    FROM project_phases
    WHERE id = p_phase_id;
    
    -- Skip if not WBS-linked
    IF v_wbs_item_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate progress from child WBS items
    SELECT 
        COUNT(*) as child_count,
        COALESCE(AVG(progress_percentage), 0) as avg_progress,
        COUNT(*) FILTER (WHERE progress_percentage = 100) as completed_count
    INTO v_child_count, v_avg_progress, v_completed_count
    FROM project_wbs_items
    WHERE parent_id = v_wbs_item_id;
    
    -- Skip if no child WBS items
    IF v_child_count = 0 THEN
        RETURN;
    END IF;
    
    -- Calculate date range from child WBS items
    SELECT 
        MIN(start_date) as earliest_start,
        MAX(end_date) as latest_end
    INTO v_earliest_start, v_latest_end
    FROM project_wbs_items
    WHERE parent_id = v_wbs_item_id
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL;
    
    -- Determine new status
    IF v_completed_count = v_child_count THEN
        v_new_status := 'completed'::phase_status;
    ELSIF v_avg_progress > 0 THEN
        v_new_status := 'in_progress'::phase_status;
    ELSE
        v_new_status := 'pending'::phase_status;
    END IF;
    
    -- Update the phase
    UPDATE project_phases
    SET 
        progress_percentage = ROUND(v_avg_progress)::integer,
        status = v_new_status,
        start_date = COALESCE(v_earliest_start, start_date),
        end_date = COALESCE(v_latest_end, end_date),
        updated_at = NOW()
    WHERE id = p_phase_id;
    
    -- Log the update for debugging
    INSERT INTO project_phase_updates (phase_id, previous_status, new_status, previous_progress, new_progress, updated_by)
    VALUES (
        p_phase_id,
        OLD.status,
        v_new_status,
        OLD.progress_percentage,
        ROUND(v_avg_progress)::integer,
        'system_wbs_sync'
    )
    ON CONFLICT DO NOTHING;
END;
$$;

-- Function to be called by trigger when WBS items change
CREATE OR REPLACE FUNCTION trigger_sync_wbs_phase_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phase_id uuid;
    v_phase_record record;
BEGIN
    -- Find the phase linked to this WBS item's parent
    SELECT pp.id, pp.wbs_item_id
    INTO v_phase_id, v_phase_record.wbs_item_id
    FROM project_phases pp
    WHERE pp.wbs_item_id IN (
        SELECT parent_id 
        FROM project_wbs_items 
        WHERE id = COALESCE(NEW.id, OLD.id)
    )
    LIMIT 1;
    
    -- If no WBS-linked phase found, exit
    IF v_phase_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Recalculate phase progress from WBS items
    PERFORM recalculate_phase_progress_from_wbs(v_phase_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to sync WBS item changes to phase progress
DROP TRIGGER IF EXISTS trg_sync_wbs_phase_progress ON project_wbs_items;
CREATE TRIGGER trg_sync_wbs_phase_progress
AFTER INSERT OR DELETE OR UPDATE OF progress_percentage, status, parent_id
ON project_wbs_items
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_wbs_phase_progress();

-- Function to batch sync all WBS-linked phases for a project
CREATE OR REPLACE FUNCTION sync_all_wbs_linked_phases(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phase_record record;
    v_synced_count integer := 0;
BEGIN
    -- Loop through all WBS-linked phases in the project
    FOR v_phase_record IN 
        SELECT id 
        FROM project_phases 
        WHERE project_id = p_project_id 
          AND wbs_item_id IS NOT NULL
    LOOP
        -- Sync each phase
        PERFORM recalculate_phase_progress_from_wbs(v_phase_record.id);
        v_synced_count := v_synced_count + 1;
    END LOOP;
    
    RETURN v_synced_count;
END;
$$;

-- Create a log table for phase updates (for debugging)
CREATE TABLE IF NOT EXISTS project_phase_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id uuid NOT NULL,
    previous_status phase_status,
    new_status phase_status,
    previous_progress integer,
    new_progress integer,
    updated_by text,
    created_at timestamp with time zone DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_phase_updates_phase_id ON project_phase_updates(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_phase_updates_created_at ON project_phase_updates(created_at);
