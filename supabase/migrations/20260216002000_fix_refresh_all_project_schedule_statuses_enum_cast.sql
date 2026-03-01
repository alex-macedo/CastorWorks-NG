BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_all_project_schedule_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  FOR v_project_id IN
    SELECT id
    FROM public.projects
    WHERE COALESCE(status::text, '') NOT IN ('completed', 'cancelled')
  LOOP
    PERFORM public.refresh_project_schedule_status(v_project_id, CURRENT_DATE);
  END LOOP;
END;
$$;

COMMIT;
