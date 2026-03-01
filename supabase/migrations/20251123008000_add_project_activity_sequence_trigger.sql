-- Ensure project_activities.sequence is always populated

CREATE OR REPLACE FUNCTION public.set_project_activity_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  IF NEW.sequence IS NULL OR NEW.sequence < 1 THEN
    SELECT COALESCE(MAX(sequence), 0) + 1
    INTO next_seq
    FROM public.project_activities
    WHERE project_id = NEW.project_id;

    NEW.sequence := COALESCE(next_seq, 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_activity_sequence ON public.project_activities;

CREATE TRIGGER trg_set_project_activity_sequence
BEFORE INSERT ON public.project_activities
FOR EACH ROW
EXECUTE FUNCTION public.set_project_activity_sequence();
