BEGIN;

-- Phase 6: Core Project RLS Tuning
-- Tables: project_team_members, project_wbs_nodes, calendar_events, project_comments

-- =============================================
-- project_team_members
-- Tighten: SELECT for project members/clients, mutations for admins only
-- Note: Careful about circular dependency - use direct owner check to avoid recursion
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='project_team_members' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_team_members', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Team members can see their own membership, project owners can see all members,
-- and admins can see all. Also allow client portal users to see team members on their accessible projects.
CREATE POLICY project_team_members_select
  ON public.project_team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
    -- Client portal: clients can see team on their assigned projects
    OR EXISTS (
      SELECT 1 FROM public.client_project_access cpa
      WHERE cpa.project_id = project_team_members.project_id
        AND cpa.user_id = auth.uid()
    )
  );

-- INSERT: Only project owners, PMs, and admins can add team members
CREATE POLICY project_team_members_insert
  ON public.project_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

-- UPDATE: Project owners, PMs, admins, or the member themselves (limited self-update)
CREATE POLICY project_team_members_update
  ON public.project_team_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

-- DELETE: Only project owners, PMs, and admins
CREATE POLICY project_team_members_delete
  ON public.project_team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

-- =============================================
-- project_wbs_nodes
-- Tighten: SELECT for project members, mutations for admin access
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='project_wbs_nodes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_wbs_nodes', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.project_wbs_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_wbs_nodes_select
  ON public.project_wbs_nodes
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY project_wbs_nodes_insert
  ON public.project_wbs_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

CREATE POLICY project_wbs_nodes_update
  ON public.project_wbs_nodes
  FOR UPDATE
  TO authenticated
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

CREATE POLICY project_wbs_nodes_delete
  ON public.project_wbs_nodes
  FOR DELETE
  TO authenticated
  USING (has_project_admin_access(auth.uid(), project_id));

-- =============================================
-- calendar_events
-- Tighten: SELECT for project members, mutations for admin access
-- Support global events (project_id IS NULL) for admins only
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='calendar_events' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select
  ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL  -- Global events visible to all authenticated
    OR has_project_access(auth.uid(), project_id)
  );

CREATE POLICY calendar_events_insert
  ON public.calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (project_id IS NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
    OR (project_id IS NOT NULL AND has_project_admin_access(auth.uid(), project_id))
  );

CREATE POLICY calendar_events_update
  ON public.calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    (project_id IS NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
    OR (project_id IS NOT NULL AND has_project_admin_access(auth.uid(), project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
    OR (project_id IS NOT NULL AND has_project_admin_access(auth.uid(), project_id))
  );

CREATE POLICY calendar_events_delete
  ON public.calendar_events
  FOR DELETE
  TO authenticated
  USING (
    (project_id IS NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager')))
    OR (project_id IS NOT NULL AND has_project_admin_access(auth.uid(), project_id))
  );

-- =============================================
-- project_comments
-- Tighten: SELECT/INSERT for project members, UPDATE own comments only
-- DELETE by owner or project admin
-- =============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_comments', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_comments_select
  ON public.project_comments
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY project_comments_insert
  ON public.project_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND user_id = auth.uid()
  );

CREATE POLICY project_comments_update
  ON public.project_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY project_comments_delete
  ON public.project_comments
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_project_admin_access(auth.uid(), project_id)
  );

COMMIT;
