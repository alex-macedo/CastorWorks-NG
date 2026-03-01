-- Fix RLS for tables that have RLS enabled but no policies
-- This includes sprints and other global tables

BEGIN;

-- =============================================
-- SPRINTS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_select_sprints" ON public.sprints;
DROP POLICY IF EXISTS "admin_pm_insert_sprints" ON public.sprints;
DROP POLICY IF EXISTS "admin_pm_update_sprints" ON public.sprints;
DROP POLICY IF EXISTS "admin_delete_sprints" ON public.sprints;

CREATE POLICY "authenticated_select_sprints"
  ON public.sprints FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_pm_insert_sprints"
  ON public.sprints FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "admin_pm_update_sprints"
  ON public.sprints FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "admin_delete_sprints"
  ON public.sprints FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- SCHEDULE_EVENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_select_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "admin_pm_insert_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "admin_pm_update_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "admin_pm_delete_schedule_events" ON public.schedule_events;

CREATE POLICY "authenticated_select_schedule_events"
  ON public.schedule_events FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "admin_pm_insert_schedule_events"
  ON public.schedule_events FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "admin_pm_update_schedule_events"
  ON public.schedule_events FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "admin_pm_delete_schedule_events"
  ON public.schedule_events FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- =============================================
-- REMINDER_LOGS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_reminder_logs" ON public.reminder_logs;

CREATE POLICY "authenticated_access_reminder_logs"
  ON public.reminder_logs FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

-- =============================================
-- LAST_CHANGED TABLE (system table)
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_last_changed" ON public.last_changed;

CREATE POLICY "authenticated_access_last_changed"
  ON public.last_changed FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- SITE_ACTIVITY_LOGS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_select_site_activity_logs" ON public.site_activity_logs;
DROP POLICY IF EXISTS "authenticated_insert_site_activity_logs" ON public.site_activity_logs;

CREATE POLICY "authenticated_select_site_activity_logs"
  ON public.site_activity_logs FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "authenticated_insert_site_activity_logs"
  ON public.site_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- =============================================
-- SITE_ISSUES TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_select_site_issues" ON public.site_issues;
DROP POLICY IF EXISTS "authenticated_insert_site_issues" ON public.site_issues;
DROP POLICY IF EXISTS "authenticated_update_site_issues" ON public.site_issues;

CREATE POLICY "authenticated_select_site_issues"
  ON public.site_issues FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "authenticated_insert_site_issues"
  ON public.site_issues FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "authenticated_update_site_issues"
  ON public.site_issues FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));

-- =============================================
-- TROUBLESHOOTING_ENTRIES TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_troubleshooting" ON public.troubleshooting_entries;

CREATE POLICY "authenticated_access_troubleshooting"
  ON public.troubleshooting_entries FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- VALIDATION_HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_validation" ON public.validation_history;

CREATE POLICY "authenticated_access_validation"
  ON public.validation_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- VOICE_RECORDINGS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_voice_recordings" ON public.voice_recordings;

CREATE POLICY "authenticated_access_voice_recordings"
  ON public.voice_recordings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- VOICE_TRANSCRIPTIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "authenticated_access_voice_transcriptions" ON public.voice_transcriptions;

CREATE POLICY "authenticated_access_voice_transcriptions"
  ON public.voice_transcriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
