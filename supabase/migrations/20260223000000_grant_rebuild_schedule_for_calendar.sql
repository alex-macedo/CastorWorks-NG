-- Grant execute on rebuild_project_schedule_for_calendar to authenticated
-- so the Rebuild Schedule button can call it to apply calendar-aware dates

GRANT EXECUTE ON FUNCTION public.rebuild_project_schedule_for_calendar(UUID) TO authenticated;
