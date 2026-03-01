BEGIN;

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Remove legacy permissive policies
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='reminder_logs';
  IF FOUND THEN
    DELETE FROM pg_policies WHERE schemaname='public' AND tablename='reminder_logs';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- SELECT: require project access (no NULL bypass)
CREATE POLICY project_scoped_select_reminder_logs
  ON public.reminder_logs
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- INSERT: PM/admin within project
CREATE POLICY project_scoped_insert_reminder_logs
  ON public.reminder_logs
  FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

-- UPDATE: PM/admin with project access
CREATE POLICY project_scoped_update_reminder_logs
  ON public.reminder_logs
  FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
  );

-- DELETE: PM/admin with project access
CREATE POLICY project_scoped_delete_reminder_logs
  ON public.reminder_logs
  FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

COMMIT;
