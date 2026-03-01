-- Function to calculate activity end_date from start_date + days_for_activity
-- Uses calendar days (no weekend skipping)
-- The start_date counts as day 1, so end_date = start_date + (days_for_activity - 1)
CREATE OR REPLACE FUNCTION calculate_activity_end_date(
  p_start_date DATE,
  p_days_for_activity INTEGER
) RETURNS DATE AS $$
BEGIN
  -- Simple calendar day calculation: start date is day 1
  -- So subtract 1 from the duration to get the number of days to add
  RETURN p_start_date + (p_days_for_activity - 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-calculate end_date for activity before insert/update
CREATE OR REPLACE FUNCTION auto_calculate_activity_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate end_date from start_date + days_for_activity
  IF NEW.start_date IS NOT NULL AND NEW.days_for_activity IS NOT NULL THEN
    NEW.end_date := calculate_activity_end_date(NEW.start_date, NEW.days_for_activity);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate activity end_date
DROP TRIGGER IF EXISTS auto_calculate_activity_end_date_trigger ON project_activities;
CREATE TRIGGER auto_calculate_activity_end_date_trigger
  BEFORE INSERT OR UPDATE OF start_date, days_for_activity ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_activity_end_date();

-- Function to sync phase with its activities
CREATE OR REPLACE FUNCTION sync_phase_with_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_phase_id UUID;
  v_phase_data RECORD;
BEGIN
  -- Determine which phase to sync
  v_phase_id := COALESCE(NEW.phase_id, OLD.phase_id);
  
  IF v_phase_id IS NULL THEN
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync phase after activity changes
DROP TRIGGER IF EXISTS sync_phase_on_activity_change ON project_activities;
CREATE TRIGGER sync_phase_on_activity_change
  AFTER INSERT OR UPDATE OR DELETE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION sync_phase_with_activities();

-- Add comment explaining the automation
COMMENT ON TRIGGER sync_phase_on_activity_change ON project_activities IS 
  'Automatically syncs parent phase dates and progress when activities are created, updated, or deleted. Phase start_date comes from first activity, end_date from last activity, and duration is sum of all activities days_for_activity.';
