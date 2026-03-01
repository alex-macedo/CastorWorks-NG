-- RLS Policies for project_budgets

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_select_project_budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "user_insert_project_budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "user_update_project_budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "supervisor_delete_project_budgets" ON public.project_budgets;

-- SELECT: User with project access
CREATE POLICY "user_select_project_budgets"
  ON public.project_budgets
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

-- INSERT: User with project access + supervisor/admin role
CREATE POLICY "user_insert_project_budgets"
  ON public.project_budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_project_access(auth.uid(), project_id) AND
    (has_role(auth.uid(), 'supervisor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
  );

-- UPDATE: Budget creator or supervisor/admin
CREATE POLICY "user_update_project_budgets"
  ON public.project_budgets
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- DELETE: Supervisor or admin only
CREATE POLICY "supervisor_delete_project_budgets"
  ON public.project_budgets
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

---

-- RLS Policies for budget_line_items

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_select_budget_line_items" ON public.budget_line_items;
DROP POLICY IF EXISTS "user_insert_budget_line_items" ON public.budget_line_items;
DROP POLICY IF EXISTS "user_update_budget_line_items" ON public.budget_line_items;
DROP POLICY IF EXISTS "user_delete_budget_line_items" ON public.budget_line_items;

-- SELECT: Via project access (through budget_id -> project_id)
CREATE POLICY "user_select_budget_line_items"
  ON public.budget_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND has_project_access(auth.uid(), pb.project_id)
    )
  );

-- INSERT: User can edit budget + budget not approved
CREATE POLICY "user_insert_budget_line_items"
  ON public.budget_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

-- UPDATE: User can edit budget + budget not approved
CREATE POLICY "user_update_budget_line_items"
  ON public.budget_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

-- DELETE: User can edit budget + budget not approved
CREATE POLICY "user_delete_budget_line_items"
  ON public.budget_line_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

---

-- RLS Policies for budget_phase_totals

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_select_budget_phase_totals" ON public.budget_phase_totals;
DROP POLICY IF EXISTS "admin_mutate_budget_phase_totals" ON public.budget_phase_totals;

-- SELECT: Via project access
CREATE POLICY "user_select_budget_phase_totals"
  ON public.budget_phase_totals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND has_project_access(auth.uid(), pb.project_id)
    )
  );

-- INSERT/UPDATE: Supervisor/admin only (system-generated)
CREATE POLICY "admin_mutate_budget_phase_totals"
  ON public.budget_phase_totals
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

---

-- RLS Policies for budget_bdi_components

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_select_budget_bdi_components" ON public.budget_bdi_components;
DROP POLICY IF EXISTS "user_insert_budget_bdi_components" ON public.budget_bdi_components;
DROP POLICY IF EXISTS "user_update_budget_bdi_components" ON public.budget_bdi_components;
DROP POLICY IF EXISTS "user_delete_budget_bdi_components" ON public.budget_bdi_components;

-- SELECT: Via project access
CREATE POLICY "user_select_budget_bdi_components"
  ON public.budget_bdi_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND has_project_access(auth.uid(), pb.project_id)
    )
  );

-- INSERT: Budget creator or supervisor
CREATE POLICY "user_insert_budget_bdi_components"
  ON public.budget_bdi_components
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

-- UPDATE: Budget creator or supervisor + not approved
CREATE POLICY "user_update_budget_bdi_components"
  ON public.budget_bdi_components
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

-- DELETE: Budget creator or supervisor + not approved
CREATE POLICY "user_delete_budget_bdi_components"
  ON public.budget_bdi_components
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role))
        AND pb.status != 'approved'
    )
  );

---

-- RLS Policies for budget_history

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_select_budget_history" ON public.budget_history;
DROP POLICY IF EXISTS "admin_insert_budget_history" ON public.budget_history;
DROP POLICY IF EXISTS "admin_delete_budget_history" ON public.budget_history;

-- SELECT: User with project access (audit trail is visible)
CREATE POLICY "user_select_budget_history"
  ON public.budget_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND has_project_access(auth.uid(), pb.project_id)
    )
  );

-- INSERT: System (only through triggers/functions)
CREATE POLICY "admin_insert_budget_history"
  ON public.budget_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() IS NOT NULL  -- Allow any authenticated user via functions
  );

-- DELETE: Admin only
CREATE POLICY "admin_delete_budget_history"
  ON public.budget_history
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

---

-- RLS Policies for sinapi_catalog

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated_select_sinapi_catalog" ON public.sinapi_catalog;
DROP POLICY IF EXISTS "admin_mutate_sinapi_catalog" ON public.sinapi_catalog;

-- SELECT: All authenticated users can read SINAPI catalog
CREATE POLICY "authenticated_select_sinapi_catalog"
  ON public.sinapi_catalog
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Admin only (data maintenance)
CREATE POLICY "admin_mutate_sinapi_catalog"
  ON public.sinapi_catalog
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
