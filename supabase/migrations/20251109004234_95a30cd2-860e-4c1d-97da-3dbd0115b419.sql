-- ============================================================================
-- CRITICAL SECURITY FIX: Implement Proper Authorization and RLS Policies
-- ============================================================================

-- Step 1: Fix the has_project_access() function to implement real access control
-- Using role-based model where admins and project managers can access all projects
-- Others can only access projects they own

CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Admins and project managers can access all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'project_manager')
  )
  OR
  -- Others can only access projects they own
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

-- Step 2: Drop all insecure policies and create secure project-scoped policies

-- ==== PROJECTS TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Anyone can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  USING (has_project_access(auth.uid(), id));

DROP POLICY IF EXISTS "Admins and PMs can create projects" ON public.projects;
CREATE POLICY "Admins and PMs can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;
CREATE POLICY "Project admins can update projects"
  ON public.projects FOR UPDATE
  USING (has_project_admin_access(auth.uid(), id))
  WITH CHECK (has_project_admin_access(auth.uid(), id));

DROP POLICY IF EXISTS "Project admins can delete projects" ON public.projects;
CREATE POLICY "Project admins can delete projects"
  ON public.projects FOR DELETE
  USING (has_project_admin_access(auth.uid(), id));

-- ==== PROJECT_FINANCIAL_ENTRIES TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view financial entries" ON project_financial_entries;
DROP POLICY IF EXISTS "Authenticated users can manage financial entries" ON project_financial_entries;
DROP POLICY IF EXISTS "Users can view financial entries for accessible projects" ON public.project_financial_entries;

CREATE POLICY "Users can view financial entries for accessible projects"
  ON public.project_financial_entries FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert financial entries" ON public.project_financial_entries;
CREATE POLICY "Project admins can insert financial entries"
  ON public.project_financial_entries FOR INSERT
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update financial entries" ON public.project_financial_entries;
CREATE POLICY "Project admins can update financial entries"
  ON public.project_financial_entries FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete financial entries" ON public.project_financial_entries;
CREATE POLICY "Project admins can delete financial entries"
  ON public.project_financial_entries FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

-- ==== PROJECT_BUDGET_ITEMS TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Authenticated users can manage budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can view budget items for accessible projects" ON public.project_budget_items;

CREATE POLICY "Users can view budget items for accessible projects"
  ON public.project_budget_items FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert budget items" ON public.project_budget_items;
CREATE POLICY "Project admins can insert budget items"
  ON public.project_budget_items FOR INSERT
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update budget items" ON public.project_budget_items;
CREATE POLICY "Project admins can update budget items"
  ON public.project_budget_items FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete budget items" ON public.project_budget_items;
CREATE POLICY "Project admins can delete budget items"
  ON public.project_budget_items FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

-- ==== DAILY_LOGS TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Authenticated users can manage daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can view daily logs for accessible projects" ON public.daily_logs;

CREATE POLICY "Users can view daily logs for accessible projects"
  ON public.daily_logs FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project members can insert daily logs" ON public.daily_logs;
CREATE POLICY "Project members can insert daily logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update daily logs" ON public.daily_logs;
CREATE POLICY "Project admins can update daily logs"
  ON public.daily_logs FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete daily logs" ON public.daily_logs;
CREATE POLICY "Project admins can delete daily logs"
  ON public.daily_logs FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

-- ==== PROJECT_ACTIVITIES TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view activities" ON project_activities;
DROP POLICY IF EXISTS "Authenticated users can manage activities" ON project_activities;
DROP POLICY IF EXISTS "Users can view activities for accessible projects" ON public.project_activities;

CREATE POLICY "Users can view activities for accessible projects"
  ON public.project_activities FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project members can insert activities" ON public.project_activities;
CREATE POLICY "Project members can insert activities"
  ON public.project_activities FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update activities" ON public.project_activities;
CREATE POLICY "Project admins can update activities"
  ON public.project_activities FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete activities" ON public.project_activities;
CREATE POLICY "Project admins can delete activities"
  ON public.project_activities FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

-- ==== CLIENTS TABLE ====
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;
DROP POLICY IF EXISTS "Admins and PMs can view all clients" ON public.clients;

CREATE POLICY "Admins and PMs can view all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

DROP POLICY IF EXISTS "Admins and PMs can manage clients" ON public.clients;
CREATE POLICY "Admins and PMs can manage clients"
  ON public.clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- ==== COMPANY_SETTINGS TABLE ====
DROP POLICY IF EXISTS "Anyone can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Anyone can update company settings" ON company_settings;
DROP POLICY IF EXISTS "All users can view company settings" ON public.company_settings;

CREATE POLICY "All users can view company settings"
  ON public.company_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==== APP_SETTINGS TABLE ====
DROP POLICY IF EXISTS "Anyone can view app settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON app_settings;
DROP POLICY IF EXISTS "All users can view app settings" ON public.app_settings;

CREATE POLICY "All users can view app settings"
  ON public.app_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
