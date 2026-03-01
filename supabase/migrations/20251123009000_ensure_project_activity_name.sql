-- Ensure project_activities have a non-null name

CREATE OR REPLACE FUNCTION public.set_project_activity_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := COALESCE(
      NEW.activity_type,
      'Activity'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_activity_name ON public.project_activities;

CREATE TRIGGER trg_set_project_activity_name
BEFORE INSERT ON public.project_activities
FOR EACH ROW
EXECUTE FUNCTION public.set_project_activity_name();
