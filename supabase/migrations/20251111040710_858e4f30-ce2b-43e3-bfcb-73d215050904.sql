-- Fix the recalculate_phase_metrics function to properly cast status enum
CREATE OR REPLACE FUNCTION public.recalculate_phase_metrics(p_phase_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_count INTEGER;
  v_new_status phase_status;
BEGIN
  -- Get count of activities in this phase
  SELECT COUNT(*) INTO v_activity_count
  FROM project_activities
  WHERE phase_id = p_phase_id;

  -- Only update if there are activities
  IF v_activity_count > 0 THEN
    -- Calculate new status
    SELECT CASE
      WHEN (
        SELECT COUNT(*) 
        FROM project_activities 
        WHERE phase_id = p_phase_id AND completion_percentage = 100
      ) = v_activity_count THEN 'completed'::phase_status
      WHEN (
        SELECT COUNT(*) 
        FROM project_activities 
        WHERE phase_id = p_phase_id AND completion_percentage > 0
      ) > 0 THEN 'in_progress'::phase_status
      ELSE 'pending'::phase_status
    END INTO v_new_status;

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
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_phase_id;
  END IF;
END;
$$;

-- Now make phase_id required for activities
-- First, assign all unassigned activities to their project's first phase
WITH first_phases AS (
  SELECT DISTINCT ON (project_id) 
    project_id,
    id as first_phase_id
  FROM project_phases
  ORDER BY project_id, start_date ASC, created_at ASC
)
UPDATE project_activities
SET phase_id = fp.first_phase_id
FROM first_phases fp
WHERE project_activities.project_id = fp.project_id
  AND project_activities.phase_id IS NULL;

-- Add NOT NULL constraint to phase_id
ALTER TABLE project_activities 
ALTER COLUMN phase_id SET NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN project_activities.phase_id IS 'Required foreign key to project_phases. All activities must belong to a phase.';