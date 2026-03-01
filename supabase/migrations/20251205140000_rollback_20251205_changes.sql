-- Emergency rollback for 2025-12-05 changes
-- Purpose: Revert policy changes applied today that impacted connectivity,
--          while keeping the non-recursive policy fix on project_folders intact.
--
-- Scope:
--   - quotes: drop hardened project-scoped policies added today; restore permissive policies
--   - sinapi_catalog: relax policies to allow reads; keep admin-only writes
--   - time_logs: relax policies to allow reads and owner/admin/PM writes
--   - project_folders: NO CHANGE (keep recursion fix in place)
--
-- Notes:
--   - This rollback prioritizes restoring application connectivity.
--   - After service is stable, re-apply secure RLS with correct schema linkages.

BEGIN;

-- ===== QUOTES =====
-- Drop policies introduced by the 20251205130000_fix_quotes_rls migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_scoped_select_quotes'
  ) THEN
    EXECUTE 'DROP POLICY project_scoped_select_quotes ON public.quotes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_admin_insert_quotes'
  ) THEN
    EXECUTE 'DROP POLICY project_admin_insert_quotes ON public.quotes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_admin_update_quotes'
  ) THEN
    EXECUTE 'DROP POLICY project_admin_update_quotes ON public.quotes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'project_admin_delete_quotes'
  ) THEN
    EXECUTE 'DROP POLICY project_admin_delete_quotes ON public.quotes';
  END IF;
END$$;

-- Restore permissive policies to unblock application
-- WARNING: Temporary. Replace with secure, project-scoped policies after stabilization.
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_select_all
  ON public.quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY quotes_insert_admin_or_pm
  ON public.quotes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

CREATE POLICY quotes_update_admin_or_pm
  ON public.quotes FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

CREATE POLICY quotes_delete_admin_or_pm
  ON public.quotes FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- ===== SINAPI CATALOG =====
-- Revert hardened policies to allow reads; keep admin-only writes
DO $$
DECLARE pol RECORD;
BEGIN
  -- Drop any strict policies added earlier today if present
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sinapi_catalog'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.sinapi_catalog', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.sinapi_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY sinapi_select_all
  ON public.sinapi_catalog FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sinapi_insert_admin_only
  ON public.sinapi_catalog FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY sinapi_update_admin_only
  ON public.sinapi_catalog FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY sinapi_delete_admin_only
  ON public.sinapi_catalog FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ===== TIME LOGS =====
-- Revert hardened policies to allow reads; owner/admin/PM writes
DO $$
DECLARE pol RECORD;
BEGIN
  -- Drop any strict policies added earlier today if present
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'time_logs'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.time_logs', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_logs_select_all
  ON public.time_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY time_logs_insert_owner_or_pm_admin
  ON public.time_logs FOR INSERT
  WITH CHECK (
    (logged_by = auth.uid())
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY time_logs_update_owner_or_pm_admin
  ON public.time_logs FOR UPDATE
  USING (
    (logged_by = auth.uid())
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (logged_by = auth.uid())
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY time_logs_delete_owner_or_pm_admin
  ON public.time_logs FOR DELETE
  USING (
    (logged_by = auth.uid())
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin')
  );

-- ===== PROJECT FOLDERS =====
-- Intentionally left unchanged to preserve the recursion fix applied today.

COMMIT;
