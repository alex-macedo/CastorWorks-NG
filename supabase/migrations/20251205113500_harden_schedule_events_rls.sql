BEGIN;

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- Remove legacy permissive policies
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='schedule_events';
  IF FOUND THEN
    DELETE FROM pg_policies WHERE schemaname='public' AND tablename='schedule_events';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- SELECT: project members can view
CREATE POLICY project_members_select_schedule_events
  ON public.schedule_events
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- SELECT for client portal via token validation RPC (no broad inline JWT checks)
CREATE POLICY client_portal_token_select_schedule_events
  ON public.schedule_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM client_portal_tokens cpt
      WHERE cpt.project_id = schedule_events.project_id
        AND validate_client_portal_token((current_setting('request.jwt.claims', true))::json ->> 'portal_token', cpt.project_id)
    )
  );

-- INSERT/UPDATE/DELETE: project managers or admins within project
CREATE POLICY managers_modify_schedule_events
  ON public.schedule_events
  FOR ALL
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

COMMIT;
