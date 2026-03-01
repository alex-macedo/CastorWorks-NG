-- Enable RLS and add project-scoped policies for schedule_events and reminder_logs
BEGIN;

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Schedule events: SELECT for project members; admin/PM manage
CREATE POLICY project_scoped_select_schedule_events
  ON public.schedule_events
  FOR SELECT
  USING (has_project_access(auth.uid(), schedule_events.project_id));

CREATE POLICY admin_pm_insert_schedule_events
  ON public.schedule_events
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), schedule_events.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

CREATE POLICY admin_pm_update_schedule_events
  ON public.schedule_events
  FOR UPDATE
  USING (has_project_access(auth.uid(), schedule_events.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
  WITH CHECK (has_project_access(auth.uid(), schedule_events.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

CREATE POLICY admin_pm_delete_schedule_events
  ON public.schedule_events
  FOR DELETE
  USING (has_project_access(auth.uid(), schedule_events.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

-- Reminder logs: project-scoped SELECT; admin/PM manage
CREATE POLICY project_scoped_select_reminder_logs
  ON public.reminder_logs
  FOR SELECT
  USING (has_project_access(auth.uid(), reminder_logs.project_id));

CREATE POLICY admin_pm_insert_reminder_logs
  ON public.reminder_logs
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), reminder_logs.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

CREATE POLICY admin_pm_update_reminder_logs
  ON public.reminder_logs
  FOR UPDATE
  USING (has_project_access(auth.uid(), reminder_logs.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
  WITH CHECK (has_project_access(auth.uid(), reminder_logs.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

CREATE POLICY admin_pm_delete_reminder_logs
  ON public.reminder_logs
  FOR DELETE
  USING (has_project_access(auth.uid(), reminder_logs.project_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')));

COMMIT;
