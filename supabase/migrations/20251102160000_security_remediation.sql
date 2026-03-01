-- Ensure app_role contains viewer before using as default (must commit before use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'viewer'
  ) THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''viewer''';
  END IF;
END;
$$;

BEGIN;

-- Extend project team members with authenticated user linkage and role
ALTER TABLE public.project_team_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_role app_role DEFAULT 'viewer';

UPDATE public.project_team_members
SET access_role = 'viewer'::app_role
WHERE access_role IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_team_members_user_id
  ON public.project_team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_team_members_project_role
  ON public.project_team_members(project_id, access_role);

-- Track project owners for default access
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID;

CREATE INDEX IF NOT EXISTS idx_projects_owner_id
  ON public.projects(owner_id);

-- Helper function: does user have read access to a project?
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_id = _user_id
  ) THEN
    RETURN TRUE;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_team_members ptm
    WHERE ptm.project_id = _project_id
      AND ptm.user_id = _user_id
  );
END;
$$;

-- Helper function: does user have manage access to a project?
CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_id = _user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_team_members ptm
    WHERE ptm.project_id = _project_id
      AND ptm.user_id = _user_id
      AND ptm.access_role IN ('admin'::app_role, 'project_manager'::app_role, 'accountant'::app_role)
  );
END;
$$;

-- Helper: fetch project id for related entities
CREATE OR REPLACE FUNCTION public.project_id_for_purchase_request(_request_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.project_purchase_requests
  WHERE id = _request_id;
$$;

CREATE OR REPLACE FUNCTION public.project_id_for_purchase_item(_item_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.project_id
  FROM public.purchase_request_items pri
  JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
  WHERE pri.id = _item_id;
$$;

-- Projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Project members can view projects" ON public.projects;
CREATE POLICY "Project members can view projects"
  ON public.projects
  FOR SELECT
  USING (public.has_project_access(auth.uid(), id));

DROP POLICY IF EXISTS "Project owners can insert projects" ON public.projects;
CREATE POLICY "Project owners can insert projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Project managers can update projects" ON public.projects;
CREATE POLICY "Project managers can update projects"
  ON public.projects
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), id));

DROP POLICY IF EXISTS "Project managers can delete projects" ON public.projects;
CREATE POLICY "Project managers can delete projects"
  ON public.projects
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), id));

-- Project phases
DROP POLICY IF EXISTS "Authenticated users can view project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Authenticated users can manage project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Anyone can view project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Anyone can insert project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Anyone can update project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Anyone can delete project phases" ON public.project_phases;

DROP POLICY IF EXISTS "Project members can view phases" ON public.project_phases;
CREATE POLICY "Project members can view phases"
  ON public.project_phases
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert phases" ON public.project_phases;
CREATE POLICY "Project managers can insert phases"
  ON public.project_phases
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update phases" ON public.project_phases;
CREATE POLICY "Project managers can update phases"
  ON public.project_phases
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete phases" ON public.project_phases;
CREATE POLICY "Project managers can delete phases"
  ON public.project_phases
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project budget items
DROP POLICY IF EXISTS "Authenticated users can view budget items" ON public.project_budget_items;
DROP POLICY IF EXISTS "Authenticated users can manage budget items" ON public.project_budget_items;
DROP POLICY IF EXISTS "Anyone can view budget items" ON public.project_budget_items;
DROP POLICY IF EXISTS "Anyone can insert budget items" ON public.project_budget_items;
DROP POLICY IF EXISTS "Anyone can update budget items" ON public.project_budget_items;
DROP POLICY IF EXISTS "Anyone can delete budget items" ON public.project_budget_items;

DROP POLICY IF EXISTS "Project members can view budget items" ON public.project_budget_items;
CREATE POLICY "Project members can view budget items"
  ON public.project_budget_items
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert budget items" ON public.project_budget_items;
CREATE POLICY "Project managers can insert budget items"
  ON public.project_budget_items
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update budget items" ON public.project_budget_items;
CREATE POLICY "Project managers can update budget items"
  ON public.project_budget_items
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete budget items" ON public.project_budget_items;
CREATE POLICY "Project managers can delete budget items"
  ON public.project_budget_items
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project financial entries
DROP POLICY IF EXISTS "Authenticated users can view financial entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "Authenticated users can manage financial entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "Anyone can view financial entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "Anyone can insert financial entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "Anyone can update financial entries" ON public.project_financial_entries;
DROP POLICY IF EXISTS "Anyone can delete financial entries" ON public.project_financial_entries;

DROP POLICY IF EXISTS "Project members can view financial entries" ON public.project_financial_entries;
CREATE POLICY "Project members can view financial entries"
  ON public.project_financial_entries
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project finance roles can insert entries" ON public.project_financial_entries;
CREATE POLICY "Project finance roles can insert entries"
  ON public.project_financial_entries
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project finance roles can update entries" ON public.project_financial_entries;
CREATE POLICY "Project finance roles can update entries"
  ON public.project_financial_entries
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project finance roles can delete entries" ON public.project_financial_entries;
CREATE POLICY "Project finance roles can delete entries"
  ON public.project_financial_entries
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project purchase requests
DROP POLICY IF EXISTS "Authenticated users can view purchase requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "Authenticated users can manage purchase requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can view purchase requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can insert purchase requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can update purchase requests" ON public.project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can delete purchase requests" ON public.project_purchase_requests;

DROP POLICY IF EXISTS "Project members can view purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project members can view purchase requests"
  ON public.project_purchase_requests
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project managers can insert purchase requests"
  ON public.project_purchase_requests
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project managers can update purchase requests"
  ON public.project_purchase_requests
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project managers can delete purchase requests"
  ON public.project_purchase_requests
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Purchase request items
DROP POLICY IF EXISTS "Authenticated users can view purchase items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Authenticated users can manage purchase items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Anyone can view purchase items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Anyone can insert purchase items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Anyone can update purchase items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Anyone can delete purchase items" ON public.purchase_request_items;

DROP POLICY IF EXISTS "Project members can view purchase items" ON public.purchase_request_items;
CREATE POLICY "Project members can view purchase items"
  ON public.purchase_request_items
  FOR SELECT
  USING (public.has_project_access(auth.uid(), public.project_id_for_purchase_request(request_id)));

DROP POLICY IF EXISTS "Project managers can insert purchase items" ON public.purchase_request_items;
CREATE POLICY "Project managers can insert purchase items"
  ON public.purchase_request_items
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), public.project_id_for_purchase_request(request_id)));

DROP POLICY IF EXISTS "Project managers can update purchase items" ON public.purchase_request_items;
CREATE POLICY "Project managers can update purchase items"
  ON public.purchase_request_items
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), public.project_id_for_purchase_request(request_id)))
  WITH CHECK (public.has_project_admin_access(auth.uid(), public.project_id_for_purchase_request(request_id)));

DROP POLICY IF EXISTS "Project managers can delete purchase items" ON public.purchase_request_items;
CREATE POLICY "Project managers can delete purchase items"
  ON public.purchase_request_items
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), public.project_id_for_purchase_request(request_id)));

-- Daily logs
DROP POLICY IF EXISTS "Authenticated users can view daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Authenticated users can manage daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone can view daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone can insert daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone can update daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone can delete daily logs" ON public.daily_logs;

DROP POLICY IF EXISTS "Project members can view daily logs" ON public.daily_logs;
CREATE POLICY "Project members can view daily logs"
  ON public.daily_logs
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert daily logs" ON public.daily_logs;
CREATE POLICY "Project managers can insert daily logs"
  ON public.daily_logs
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update daily logs" ON public.daily_logs;
CREATE POLICY "Project managers can update daily logs"
  ON public.daily_logs
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete daily logs" ON public.daily_logs;
CREATE POLICY "Project managers can delete daily logs"
  ON public.daily_logs
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project activities
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.project_activities;
DROP POLICY IF EXISTS "Authenticated users can manage activities" ON public.project_activities;
DROP POLICY IF EXISTS "Anyone can view activities" ON public.project_activities;
DROP POLICY IF EXISTS "Anyone can insert activities" ON public.project_activities;
DROP POLICY IF EXISTS "Anyone can update activities" ON public.project_activities;
DROP POLICY IF EXISTS "Anyone can delete activities" ON public.project_activities;

DROP POLICY IF EXISTS "Project members can view activities" ON public.project_activities;
CREATE POLICY "Project members can view activities"
  ON public.project_activities
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert activities" ON public.project_activities;
CREATE POLICY "Project managers can insert activities"
  ON public.project_activities
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update activities" ON public.project_activities;
CREATE POLICY "Project managers can update activities"
  ON public.project_activities
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete activities" ON public.project_activities;
CREATE POLICY "Project managers can delete activities"
  ON public.project_activities
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project materials
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.project_materials;
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON public.project_materials;
DROP POLICY IF EXISTS "Anyone can view materials" ON public.project_materials;
DROP POLICY IF EXISTS "Anyone can insert materials" ON public.project_materials;
DROP POLICY IF EXISTS "Anyone can update materials" ON public.project_materials;
DROP POLICY IF EXISTS "Anyone can delete materials" ON public.project_materials;

DROP POLICY IF EXISTS "Project members can view materials" ON public.project_materials;
CREATE POLICY "Project members can view materials"
  ON public.project_materials
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can insert materials" ON public.project_materials;
CREATE POLICY "Project managers can insert materials"
  ON public.project_materials
  FOR INSERT
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can update materials" ON public.project_materials;
CREATE POLICY "Project managers can update materials"
  ON public.project_materials
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete materials" ON public.project_materials;
CREATE POLICY "Project managers can delete materials"
  ON public.project_materials
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project team members
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can insert team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can update team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can delete team members" ON public.project_team_members;

DROP POLICY IF EXISTS "Project members can view team members" ON public.project_team_members;
CREATE POLICY "Project members can view team members"
  ON public.project_team_members
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project owners can add themselves" ON public.project_team_members;
CREATE POLICY "Project owners can add themselves"
  ON public.project_team_members
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.owner_id = auth.uid()
    ))
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Project managers can update team members" ON public.project_team_members;
CREATE POLICY "Project managers can update team members"
  ON public.project_team_members
  FOR UPDATE
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can delete team members" ON public.project_team_members;
CREATE POLICY "Project managers can delete team members"
  ON public.project_team_members
  FOR DELETE
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- Project resources
DROP POLICY IF EXISTS "Project managers can manage resources" ON public.project_resources;
DROP POLICY IF EXISTS "Anyone can view project resources" ON public.project_resources;

DROP POLICY IF EXISTS "Project members can view resources" ON public.project_resources;
CREATE POLICY "Project members can view resources"
  ON public.project_resources
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can manage resources" ON public.project_resources;
CREATE POLICY "Project managers can manage resources"
  ON public.project_resources
  FOR ALL
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

-- Activity resource assignments
DROP POLICY IF EXISTS "Project managers can manage assignments" ON public.activity_resource_assignments;
DROP POLICY IF EXISTS "Anyone can view resource assignments" ON public.activity_resource_assignments;

DROP POLICY IF EXISTS "Project members can view resource assignments" ON public.activity_resource_assignments;
CREATE POLICY "Project members can view resource assignments"
  ON public.activity_resource_assignments
  FOR SELECT
  USING (
    public.has_project_access(
      auth.uid(),
      (SELECT project_id FROM public.project_resources pr WHERE pr.id = resource_id)
    )
  );

DROP POLICY IF EXISTS "Project managers can manage resource assignments" ON public.activity_resource_assignments;
CREATE POLICY "Project managers can manage resource assignments"
  ON public.activity_resource_assignments
  FOR ALL
  USING (
    public.has_project_admin_access(
      auth.uid(),
      (SELECT project_id FROM public.project_resources pr WHERE pr.id = resource_id)
    )
  )
  WITH CHECK (
    public.has_project_admin_access(
      auth.uid(),
      (SELECT project_id FROM public.project_resources pr WHERE pr.id = resource_id)
    )
  );

-- Schedule scenarios
DROP POLICY IF EXISTS "Project managers can manage scenarios" ON public.schedule_scenarios;
DROP POLICY IF EXISTS "Anyone can view scenarios" ON public.schedule_scenarios;

DROP POLICY IF EXISTS "Project members can view scenarios" ON public.schedule_scenarios;
CREATE POLICY "Project members can view scenarios"
  ON public.schedule_scenarios
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project managers can manage scenarios" ON public.schedule_scenarios;
CREATE POLICY "Project managers can manage scenarios"
  ON public.schedule_scenarios
  FOR ALL
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

-- Scenario activities
DROP POLICY IF EXISTS "Project managers can manage scenario activities" ON public.scenario_activities;
DROP POLICY IF EXISTS "Anyone can view scenario activities" ON public.scenario_activities;

DROP POLICY IF EXISTS "Project members can view scenario activities" ON public.scenario_activities;
CREATE POLICY "Project members can view scenario activities"
  ON public.scenario_activities
  FOR SELECT
  USING (
    public.has_project_access(
      auth.uid(),
      (SELECT project_id FROM public.schedule_scenarios ss WHERE ss.id = scenario_id)
    )
  );

DROP POLICY IF EXISTS "Project managers can manage scenario activities" ON public.scenario_activities;
CREATE POLICY "Project managers can manage scenario activities"
  ON public.scenario_activities
  FOR ALL
  USING (
    public.has_project_admin_access(
      auth.uid(),
      (SELECT project_id FROM public.schedule_scenarios ss WHERE ss.id = scenario_id)
    )
  )
  WITH CHECK (
    public.has_project_admin_access(
      auth.uid(),
      (SELECT project_id FROM public.schedule_scenarios ss WHERE ss.id = scenario_id)
    )
  );

-- Project comments
DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON public.project_comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can delete their own comments or admins can delete any" ON public.project_comments;

DROP POLICY IF EXISTS "Project members can view comments" ON public.project_comments;
CREATE POLICY "Project members can view comments"
  ON public.project_comments
  FOR SELECT
  USING (
    is_deleted = FALSE AND public.has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Project members can insert comments" ON public.project_comments;
CREATE POLICY "Project members can insert comments"
  ON public.project_comments
  FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their comments" ON public.project_comments;
CREATE POLICY "Authors can update their comments"
  ON public.project_comments
  FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id) AND user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Managers can moderate comments" ON public.project_comments;
CREATE POLICY "Managers can moderate comments"
  ON public.project_comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

-- Activity logs
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can manage activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can update activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can delete activity logs" ON public.activity_logs;

DROP POLICY IF EXISTS "Project members can view activity logs" ON public.activity_logs;
CREATE POLICY "Project members can view activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    project_id IS NULL
    OR public.has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Project managers can insert activity logs" ON public.activity_logs;
CREATE POLICY "Project managers can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    project_id IS NULL
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Project managers can update activity logs" ON public.activity_logs;
CREATE POLICY "Project managers can update activity logs"
  ON public.activity_logs
  FOR UPDATE
  USING (
    project_id IS NULL
    OR public.has_project_admin_access(auth.uid(), project_id)
  )
  WITH CHECK (
    project_id IS NULL
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Project managers can delete activity logs" ON public.activity_logs;
CREATE POLICY "Project managers can delete activity logs"
  ON public.activity_logs
  FOR DELETE
  USING (
    project_id IS NULL
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

-- Project photos
DROP POLICY IF EXISTS "Anyone can view project photos" ON public.project_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.project_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.project_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.project_photos;

DROP POLICY IF EXISTS "Project members can view photos" ON public.project_photos;
CREATE POLICY "Project members can view photos"
  ON public.project_photos
  FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project members can upload photos" ON public.project_photos;
CREATE POLICY "Project members can upload photos"
  ON public.project_photos
  FOR INSERT
  WITH CHECK (
    public.has_project_access(auth.uid(), project_id)
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Photo owners or managers can update" ON public.project_photos;
CREATE POLICY "Photo owners or managers can update"
  ON public.project_photos
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR public.has_project_admin_access(auth.uid(), project_id)
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Photo owners or managers can delete" ON public.project_photos;
CREATE POLICY "Photo owners or managers can delete"
  ON public.project_photos
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR public.has_project_admin_access(auth.uid(), project_id)
  );

-- Company settings: admin only mutations
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Anyone can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "authenticated_select_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "admin_update_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "admin_insert_company_settings" ON public.company_settings;

DROP POLICY IF EXISTS "authenticated_select_company_settings" ON public.company_settings;
CREATE POLICY "authenticated_select_company_settings"
  ON public.company_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_update_company_settings" ON public.company_settings;
CREATE POLICY "admin_update_company_settings"
  ON public.company_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_insert_company_settings" ON public.company_settings;
CREATE POLICY "admin_insert_company_settings"
  ON public.company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- App settings: admin only mutations
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "authenticated_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "authenticated_select_app_settings" ON public.app_settings;
CREATE POLICY "authenticated_select_app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;
CREATE POLICY "admin_update_app_settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
