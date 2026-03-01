-- Add Architect Permissions for Budgets and Schedules
-- Migration: 20260124221557
-- Description:
-- 1. Update project_budgets RLS policies to allow architects to create, edit, delete budgets
-- 2. Update budget_line_items RLS policies to allow architects to manage line items
-- 3. Update has_project_admin_access to explicitly include architect role for schedules/phases
-- 4. Ensure architects can manage budgets and schedules for projects they have access to

BEGIN;

-- ============================================================================
-- 1. UPDATE project_budgets RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_insert_project_budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "user_update_project_budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "supervisor_delete_project_budgets" ON public.project_budgets;

-- INSERT: User with project access + supervisor/admin/architect role
CREATE POLICY "user_insert_project_budgets"
  ON public.project_budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_project_access(auth.uid(), project_id) AND
    (has_role(auth.uid(), 'supervisor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role) OR
     has_role(auth.uid(), 'architect'::app_role))
  );

-- UPDATE: Budget creator or supervisor/admin/architect
CREATE POLICY "user_update_project_budgets"
  ON public.project_budgets
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'architect'::app_role)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'architect'::app_role)
  );

-- DELETE: Supervisor/admin/architect only
CREATE POLICY "supervisor_delete_project_budgets"
  ON public.project_budgets
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'architect'::app_role)
  );

-- ============================================================================
-- 2. UPDATE budget_line_items RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_insert_budget_line_items" ON public.budget_line_items;
DROP POLICY IF EXISTS "user_update_budget_line_items" ON public.budget_line_items;
DROP POLICY IF EXISTS "user_delete_budget_line_items" ON public.budget_line_items;

-- INSERT: User can edit budget + budget not approved (including architects)
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- UPDATE: User can edit budget + budget not approved (including architects)
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- DELETE: User can edit budget + budget not approved (including architects)
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- ============================================================================
-- 3. UPDATE budget_bdi_components RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_insert_budget_bdi_components" ON public.budget_bdi_components;
DROP POLICY IF EXISTS "user_update_budget_bdi_components" ON public.budget_bdi_components;
DROP POLICY IF EXISTS "user_delete_budget_bdi_components" ON public.budget_bdi_components;

-- INSERT: Budget creator or supervisor/admin/architect
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- UPDATE: Budget creator or supervisor/admin/architect + not approved
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_id
        AND (pb.created_by = auth.uid() OR
             has_role(auth.uid(), 'supervisor'::app_role) OR
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- DELETE: Budget creator or supervisor/admin/architect + not approved
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
             has_role(auth.uid(), 'admin'::app_role) OR
             has_role(auth.uid(), 'architect'::app_role))
        AND pb.status != 'approved'
    )
  );

-- ============================================================================
-- 4. UPDATE has_project_admin_access FUNCTION
-- ============================================================================
-- Include architect role explicitly for schedules/phases access
-- Note: Architects who own projects already have access via owner_id check,
-- but this makes it explicit and allows architects with project access to manage schedules

CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Admins and project managers have admin access to all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'project_manager')
  )
  OR
  -- Architects with project access can admin projects they have access to
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'architect'
  ) AND has_project_access(_user_id, _project_id))
  OR
  -- Project owners can admin their own projects
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

COMMIT;
