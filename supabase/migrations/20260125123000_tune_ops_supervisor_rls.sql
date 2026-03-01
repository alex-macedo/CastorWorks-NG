BEGIN;

-- Phase 9: Ops + Supervisor RLS Tuning
-- Tables: site_activity_logs, site_issues

-- =============================================
-- site_activity_logs
-- Tighten: SELECT/INSERT for project members
-- UPDATE/DELETE for supervisor, admin, or creator
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='site_activity_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_activity_logs', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.site_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_activity_logs_select
  ON public.site_activity_logs
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY site_activity_logs_insert
  ON public.site_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY site_activity_logs_update
  ON public.site_activity_logs
  FOR UPDATE
  TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR has_role(auth.uid(), 'site_supervisor')
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    supervisor_id = auth.uid()
    OR has_role(auth.uid(), 'site_supervisor')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY site_activity_logs_delete
  ON public.site_activity_logs
  FOR DELETE
  TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR has_role(auth.uid(), 'site_supervisor')
    OR has_role(auth.uid(), 'admin')
  );

-- =============================================
-- site_issues
-- Tighten: SELECT/INSERT for project members
-- UPDATE for reporter, assignee, supervisor, admin
-- DELETE for supervisor, admin only
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='site_issues' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_issues', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.site_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_issues_select
  ON public.site_issues
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY site_issues_insert
  ON public.site_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY site_issues_update
  ON public.site_issues
  FOR UPDATE
  TO authenticated
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      reported_by = auth.uid()
      OR assigned_to = auth.uid()
      OR has_role(auth.uid(), 'site_supervisor')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (
      reported_by = auth.uid()
      OR assigned_to = auth.uid()
      OR has_role(auth.uid(), 'site_supervisor')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

CREATE POLICY site_issues_delete
  ON public.site_issues
  FOR DELETE
  TO authenticated
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'site_supervisor')
      OR has_role(auth.uid(), 'admin')
    )
  );

COMMIT;
