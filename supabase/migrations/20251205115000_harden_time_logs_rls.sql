BEGIN;

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Remove legacy permissive policies
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='time_logs';
  IF FOUND THEN
    DELETE FROM pg_policies WHERE schemaname='public' AND tablename='time_logs';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- SELECT: project members only
CREATE POLICY project_scoped_select_time_logs
  ON public.time_logs
  FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
  );

-- INSERT: only by owner for accessible project
CREATE POLICY project_scoped_insert_time_logs
  ON public.time_logs
  FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND logged_by = auth.uid()
  );

-- UPDATE: owner or PM/admin with project access
CREATE POLICY project_scoped_update_time_logs
  ON public.time_logs
  FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      logged_by = auth.uid()
      OR has_role(auth.uid(), 'project_manager')
      OR has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
  );

-- DELETE: owner or PM/admin with project access
CREATE POLICY project_scoped_delete_time_logs
  ON public.time_logs
  FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      logged_by = auth.uid()
      OR has_role(auth.uid(), 'project_manager')
      OR has_role(auth.uid(), 'admin')
    )
  );

COMMIT;
