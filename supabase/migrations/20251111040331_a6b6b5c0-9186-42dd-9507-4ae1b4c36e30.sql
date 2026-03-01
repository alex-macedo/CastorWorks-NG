-- Function to recalculate phase metrics based on child activities
CREATE OR REPLACE FUNCTION public.recalculate_phase_metrics(p_phase_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_count INTEGER;
BEGIN
  -- Get count of activities in this phase
  SELECT COUNT(*) INTO v_activity_count
  FROM project_activities
  WHERE phase_id = p_phase_id;

  -- Only update if there are activities
  IF v_activity_count > 0 THEN
    UPDATE project_phases
    SET 
      start_date = (
        SELECT MIN(start_date) 
        FROM project_activities 
        WHERE phase_id = p_phase_id AND start_date IS NOT NULL
      ),
      end_date = (
        SELECT MAX(end_date) 
        FROM project_activities 
        WHERE phase_id = p_phase_id AND end_date IS NOT NULL
      ),
      progress_percentage = (
        SELECT COALESCE(ROUND(AVG(completion_percentage)), 0)
        FROM project_activities 
        WHERE phase_id = p_phase_id
      ),
      status = CASE
        WHEN (
          SELECT COUNT(*) 
          FROM project_activities 
          WHERE phase_id = p_phase_id AND completion_percentage = 100
        ) = v_activity_count THEN 'completed'
        WHEN (
          SELECT COUNT(*) 
          FROM project_activities 
          WHERE phase_id = p_phase_id AND completion_percentage > 0
        ) > 0 THEN 'in_progress'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = p_phase_id;
  END IF;
END;
$$;

-- Trigger function to recalculate phase metrics when activities change
CREATE OR REPLACE FUNCTION public.trigger_recalculate_phase_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.phase_id IS NOT NULL THEN
      PERFORM recalculate_phase_metrics(NEW.phase_id);
    END IF;
    -- If phase_id changed, recalculate old phase too
    IF (TG_OP = 'UPDATE' AND OLD.phase_id IS NOT NULL AND OLD.phase_id != NEW.phase_id) THEN
      PERFORM recalculate_phase_metrics(OLD.phase_id);
    END IF;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.phase_id IS NOT NULL THEN
      PERFORM recalculate_phase_metrics(OLD.phase_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on project_activities
DROP TRIGGER IF EXISTS update_phase_metrics_on_activity_change ON project_activities;
CREATE TRIGGER update_phase_metrics_on_activity_change
AFTER INSERT OR UPDATE OR DELETE ON project_activities
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_phase_metrics();

-- Backfill existing phase metrics from their current activities
DO $$
DECLARE
  phase_record RECORD;
BEGIN
  FOR phase_record IN SELECT id FROM project_phases
  LOOP
    PERFORM recalculate_phase_metrics(phase_record.id);
  END LOOP;
END $$;