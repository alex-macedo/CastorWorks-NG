-- Fixed version: WBS-linked phase progress sync
-- This script adds functionality to calculate phase progress from WBS items
-- for phases that are linked to WBS items (wbs_item_id IS NOT NULL)

-- Drop existing functions and recreate
DROP FUNCTION IF EXISTS recalculate_phase_progress_from_wbs(uuid);
DROP FUNCTION IF EXISTS trigger_sync_wbs_phase_progress();
DROP FUNCTION IF EXISTS sync_all_wbs_linked_phases(uuid);

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
    
    -- Determine new status
    IF v_completed_count = v_child_count THEN
        v_new_status := 'completed'::phase_status;
    ELSIF v_avg_progress > 0 THEN
        v_new_status := 'in_progress'::phase_status;
    ELSE
        v_new_status := 'pending'::phase_status;
    END IF;
    
    -- Update the phase (preserve existing dates since WBS items don't have dates)
    UPDATE project_phases
    SET 
        progress_percentage = ROUND(v_avg_progress)::integer,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_phase_id;
    
    -- Log the update for debugging (simplified version)
    INSERT INTO project_phase_updates (phase_id, new_status, new_progress, updated_by)
    VALUES (
        p_phase_id,
        v_new_status,
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
    v_wbs_parent_id uuid;
BEGIN
    -- Get the parent WBS item
    SELECT parent_id
    INTO v_wbs_parent_id
    FROM project_wbs_items
    WHERE id = COALESCE(NEW.id, OLD.id)
    LIMIT 1;
    
    -- If no parent, exit
    IF v_wbs_parent_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Find the phase linked to this WBS item's parent
    SELECT id
    INTO v_phase_id
    FROM project_phases
    WHERE wbs_item_id = v_wbs_parent_id
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

-- Recreate trigger
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
