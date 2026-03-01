-- Ensure project_activities always have a phase_id even if caller omits it
-- FIXED: Assign activities to the phase that covers their start_date (date range matching)
-- Instead of always assigning to the first phase

CREATE OR REPLACE FUNCTION public.set_project_activity_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  phase_id uuid;
BEGIN
  IF NEW.phase_id IS NULL THEN
    -- First, try to find a phase that covers this activity's start_date
    -- An activity belongs to a phase if: activity.start_date >= phase.start_date AND activity.start_date <= phase.end_date
    SELECT id
    INTO phase_id
    FROM public.project_phases
    WHERE project_id = NEW.project_id
      AND NEW.start_date >= start_date
      AND (end_date IS NULL OR NEW.start_date <= end_date)
    ORDER BY start_date DESC  -- Prefer later phases if multiple match
    LIMIT 1;

    -- If no matching phase found by date range, fallback to first phase by start_date
    IF phase_id IS NULL THEN
      SELECT id
      INTO phase_id
      FROM public.project_phases
      WHERE project_id = NEW.project_id
      ORDER BY start_date NULLS FIRST, created_at
      LIMIT 1;
    END IF;

    IF phase_id IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        start_date,
        end_date,
        progress_percentage,
        status
      )
      VALUES (
        NEW.project_id,
        'Auto-created Phase',
        NEW.start_date,
        NEW.end_date,
        0,
        'pending'
      )
      RETURNING id INTO phase_id;
    END IF;

    NEW.phase_id := phase_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_activity_phase ON public.project_activities;

CREATE TRIGGER trg_set_project_activity_phase
BEFORE INSERT ON public.project_activities
FOR EACH ROW
EXECUTE FUNCTION public.set_project_activity_phase();
