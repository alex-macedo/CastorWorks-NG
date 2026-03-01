-- Phase 1 Wave 1: RLS tenant isolation — require tenant_id and has_tenant_access (or super_admin).
-- Plan: 01-01-PLAN.md Task 8. All tenant-scoped tables: tenant_id = current_setting + has_tenant_access or super_admin.

-- Helper expression (document only): tenant match and access
-- (tenant_id = current_setting('app.current_tenant_id', true)::uuid AND (has_tenant_access(auth.uid(), tenant_id) OR has_role(auth.uid(), 'super_admin'::app_role)))

BEGIN;

-- Projects
DROP POLICY IF EXISTS "project_scoped_select_projects" ON public.projects;
DROP POLICY IF EXISTS "project_scoped_manage_projects" ON public.projects;
CREATE POLICY "project_scoped_select_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_project_access(auth.uid(), id)
  );
CREATE POLICY "project_scoped_manage_projects" ON public.projects
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_project_access(auth.uid(), id)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_project_access(auth.uid(), id)
  );

-- Clients
DROP POLICY IF EXISTS "authenticated_select_clients" ON public.clients;
DROP POLICY IF EXISTS "authenticated_manage_clients" ON public.clients;
CREATE POLICY "authenticated_select_clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'project_manager'::public.app_role))
  );
CREATE POLICY "authenticated_manage_clients" ON public.clients
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'project_manager'::public.app_role))
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

-- Company settings
DROP POLICY IF EXISTS "All users can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "tenant_company_settings_select" ON public.company_settings
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "tenant_company_settings_update" ON public.company_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

-- Project-scoped tables: tenant + has_project_access
CREATE OR REPLACE FUNCTION public.tenant_and_project_using(tbl_tenant_id uuid, p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT
    tbl_tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tbl_tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_project_access(auth.uid(), p_project_id);
$$;

-- Daily logs
DROP POLICY IF EXISTS "project_scoped_select_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "project_scoped_manage_daily_logs" ON public.daily_logs;
CREATE POLICY "project_scoped_select_daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_daily_logs" ON public.daily_logs
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project phases
DROP POLICY IF EXISTS "project_scoped_select_project_phases" ON public.project_phases;
DROP POLICY IF EXISTS "project_scoped_manage_project_phases" ON public.project_phases;
CREATE POLICY "project_scoped_select_project_phases" ON public.project_phases
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_project_phases" ON public.project_phases
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project team members
DROP POLICY IF EXISTS "project_scoped_select_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "project_scoped_manage_team_members" ON public.project_team_members;
CREATE POLICY "project_scoped_select_team_members" ON public.project_team_members
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_team_members" ON public.project_team_members
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project financial entries
DROP POLICY IF EXISTS "project_scoped_select_financial_entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "project_scoped_manage_financial_entries" ON public.project_financial_entries;
CREATE POLICY "project_scoped_select_financial_entries" ON public.project_financial_entries
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_financial_entries" ON public.project_financial_entries
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project materials
DROP POLICY IF EXISTS "project_scoped_select_materials" ON public.project_materials;
DROP POLICY IF EXISTS "project_scoped_manage_materials" ON public.project_materials;
CREATE POLICY "project_scoped_select_materials" ON public.project_materials
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_materials" ON public.project_materials
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project activities
DROP POLICY IF EXISTS "project_scoped_select_activities" ON public.project_activities;
DROP POLICY IF EXISTS "project_scoped_manage_activities" ON public.project_activities;
CREATE POLICY "project_scoped_select_activities" ON public.project_activities
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_activities" ON public.project_activities
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project budget items
DROP POLICY IF EXISTS "project_scoped_select_budget_items" ON public.project_budget_items;
DROP POLICY IF EXISTS "project_scoped_manage_budget_items" ON public.project_budget_items;
CREATE POLICY "project_scoped_select_budget_items" ON public.project_budget_items
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_budget_items" ON public.project_budget_items
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- Project purchase requests
DROP POLICY IF EXISTS "project_scoped_select_purchase_requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "project_scoped_manage_purchase_requests" ON public.project_purchase_requests;
CREATE POLICY "project_scoped_select_purchase_requests" ON public.project_purchase_requests
  FOR SELECT TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id));
CREATE POLICY "project_scoped_manage_purchase_requests" ON public.project_purchase_requests
  FOR ALL TO authenticated
  USING (public.tenant_and_project_using(tenant_id, project_id))
  WITH CHECK (public.tenant_and_project_using(tenant_id, project_id));

-- App settings (tenant-scoped)
DROP POLICY IF EXISTS "All users can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "tenant_app_settings_select" ON public.app_settings
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "tenant_app_settings_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (public.has_tenant_access(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

COMMIT;
