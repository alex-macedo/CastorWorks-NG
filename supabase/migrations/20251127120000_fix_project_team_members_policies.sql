-- Migration: fix_project_team_members_policies
-- Purpose: Replace policies on public.project_team_members to avoid recursive
-- evaluation caused by calling has_project_access() which queries the same table.
-- Additive corrective migration safe to run against an existing database.

BEGIN;

-- Drop possibly problematic policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_team_members' AND policyname='project_scoped_select_team_members') THEN
    DROP POLICY IF EXISTS "project_scoped_select_team_members" ON public.project_team_members;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_team_members' AND policyname='project_scoped_insert_team_members') THEN
    DROP POLICY IF EXISTS "project_scoped_insert_team_members" ON public.project_team_members;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_team_members' AND policyname='project_scoped_update_team_members') THEN
    DROP POLICY IF EXISTS "project_scoped_update_team_members" ON public.project_team_members;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_team_members' AND policyname='project_scoped_delete_team_members') THEN
    DROP POLICY IF EXISTS "project_scoped_delete_team_members" ON public.project_team_members;
  END IF;
END $$;

-- Create safer, non-recursive policies
-- SELECT: allow if the row belongs to the current user, or current user is project owner, or admin
CREATE POLICY "project_scoped_select_team_members"
  ON public.project_team_members FOR SELECT
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT: allow only project owner or admin to add team members
CREATE POLICY "project_scoped_insert_team_members"
  ON public.project_team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- UPDATE: allow a user to update their own membership row; allow project owner or admin to update any
CREATE POLICY "project_scoped_update_team_members"
  ON public.project_team_members FOR UPDATE
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- DELETE: allow only project owner or admin to remove members
CREATE POLICY "project_scoped_delete_team_members"
  ON public.project_team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

COMMIT;

-- Notes:
-- 1) These policies intentionally avoid calling has_project_access() to prevent
--    recursion when that helper queries project_team_members.
-- 2) If you need more granular team-role based permissions (e.g., allow
--    maintainers to add members), we can expand the WITH CHECK / USING clauses
--    to inspect the incoming row's role or reference a small, non-recursive
--    helper table.
