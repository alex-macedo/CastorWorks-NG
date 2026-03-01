BEGIN;

-- Settings + tokens + admin events

-- app_settings
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='app_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_settings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_pm_select_app_settings
  ON public.app_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY admin_mutate_app_settings
  ON public.app_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- company_settings
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='company_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_settings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_pm_select_company_settings
  ON public.company_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY admin_mutate_company_settings
  ON public.company_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- admin_events (audit logs)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='admin_events' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_events', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_pm_select_admin_events
  ON public.admin_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY admin_insert_admin_events
  ON public.admin_events
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

-- approval_tokens
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='approval_tokens' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.approval_tokens', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_scoped_select_approval_tokens
  ON public.approval_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_purchase_requests pr
      WHERE pr.id = approval_tokens.purchase_request_id
        AND has_project_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY admin_insert_approval_tokens
  ON public.approval_tokens
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY admin_delete_approval_tokens
  ON public.approval_tokens
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- client_portal_tokens
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='client_portal_tokens' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_portal_tokens', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY manager_select_client_portal_tokens
  ON public.client_portal_tokens
  FOR SELECT
  USING (can_manage_client_portal_token(project_id));
CREATE POLICY manager_insert_client_portal_tokens
  ON public.client_portal_tokens
  FOR INSERT
  WITH CHECK (can_manage_client_portal_token(project_id));
CREATE POLICY manager_delete_client_portal_tokens
  ON public.client_portal_tokens
  FOR DELETE
  USING (can_manage_client_portal_token(project_id));

-- architect_client_portal_tokens
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_client_portal_tokens' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_client_portal_tokens', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_client_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY manager_select_architect_portal_tokens
  ON public.architect_client_portal_tokens
  FOR SELECT
  USING (can_manage_architect_portal_token(project_id));
CREATE POLICY manager_insert_architect_portal_tokens
  ON public.architect_client_portal_tokens
  FOR INSERT
  WITH CHECK (can_manage_architect_portal_token(project_id));
CREATE POLICY manager_delete_architect_portal_tokens
  ON public.architect_client_portal_tokens
  FOR DELETE
  USING (can_manage_architect_portal_token(project_id));

COMMIT;
