-- Fix phase sync trigger to not override WBS-linked phases
-- WBS-linked phases (those with wbs_item_id) should control their own dates
-- Only sync phases that are derived from activities (no wbs_item_id)

CREATE OR REPLACE FUNCTION sync_phase_with_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_phase_id UUID;
  v_phase_data RECORD;
  v_is_wbs_linked BOOLEAN;
BEGIN
  -- Determine which phase to sync
  v_phase_id := COALESCE(NEW.phase_id, OLD.phase_id);

  IF v_phase_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if this phase is linked to a WBS item
  -- WBS-linked phases should NOT be auto-synced from activities
  SELECT (wbs_item_id IS NOT NULL) INTO v_is_wbs_linked
  FROM project_phases
  WHERE id = v_phase_id;

  -- Skip sync for WBS-linked phases
  IF v_is_wbs_linked THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get aggregated data from all activities in the phase
  SELECT
    MIN(start_date) as first_start,
    MAX(end_date) as last_end,
    SUM(days_for_activity) as total_duration,
    CASE
      WHEN SUM(days_for_activity) > 0 THEN
        ROUND(SUM(completion_percentage * days_for_activity)::NUMERIC / SUM(days_for_activity))
      ELSE 0
    END as weighted_progress
  INTO v_phase_data
  FROM project_activities
  WHERE phase_id = v_phase_id;

  -- Update the phase with synced data
  UPDATE project_phases
  SET
    start_date = v_phase_data.first_start,
    end_date = v_phase_data.last_end,
    progress_percentage = COALESCE(v_phase_data.weighted_progress::INTEGER, 0),
    updated_at = NOW()
  WHERE id = v_phase_id;

  -- If this was a phase change (activity moved), also sync the old phase
  IF TG_OP = 'UPDATE' AND OLD.phase_id IS DISTINCT FROM NEW.phase_id AND OLD.phase_id IS NOT NULL THEN
    -- Check if old phase is WBS-linked
    SELECT (wbs_item_id IS NOT NULL) INTO v_is_wbs_linked
    FROM project_phases
    WHERE id = OLD.phase_id;

    -- Only sync if not WBS-linked
    IF NOT v_is_wbs_linked THEN
      SELECT
        MIN(start_date) as first_start,
        MAX(end_date) as last_end,
        SUM(days_for_activity) as total_duration,
        CASE
          WHEN SUM(days_for_activity) > 0 THEN
            ROUND(SUM(completion_percentage * days_for_activity)::NUMERIC / SUM(days_for_activity))
          ELSE 0
        END as weighted_progress
      INTO v_phase_data
      FROM project_activities
      WHERE phase_id = OLD.phase_id;

      UPDATE project_phases
      SET
        start_date = v_phase_data.first_start,
        end_date = v_phase_data.last_end,
        progress_percentage = COALESCE(v_phase_data.weighted_progress::INTEGER, 0),
        updated_at = NOW()
      WHERE id = OLD.phase_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update the comment to reflect the new behavior
COMMENT ON TRIGGER sync_phase_on_activity_change ON project_activities IS
  'Automatically syncs parent phase dates and progress when activities are created, updated, or deleted. ONLY applies to phases without wbs_item_id. WBS-linked phases are controlled manually from the Gantt chart. Phase start_date comes from first activity, end_date from last activity, and progress is weighted by duration.';
