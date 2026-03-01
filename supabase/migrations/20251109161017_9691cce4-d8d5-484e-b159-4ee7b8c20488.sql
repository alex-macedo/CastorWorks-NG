-- ============================================================================
-- COMPREHENSIVE RLS POLICY FIX FOR 9 CORE TABLES
-- This migration adds missing RLS policies to make the application fully secure
-- ============================================================================

-- ============================================================================
-- GROUP 1: Direct Project-Scoped Tables (4 tables)
-- Tables with direct project_id column using project-based access control
-- ============================================================================

-- 1. project_materials
DROP POLICY IF EXISTS "Users can view materials for accessible projects" ON public.project_materials;
CREATE POLICY "Users can view materials for accessible projects"
ON public.project_materials FOR SELECT
USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert materials" ON public.project_materials;
CREATE POLICY "Project admins can insert materials"
ON public.project_materials FOR INSERT
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update materials" ON public.project_materials;
CREATE POLICY "Project admins can update materials"
ON public.project_materials FOR UPDATE
USING (has_project_admin_access(auth.uid(), project_id))
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete materials" ON public.project_materials;
CREATE POLICY "Project admins can delete materials"
ON public.project_materials FOR DELETE
USING (has_project_admin_access(auth.uid(), project_id));

-- 2. project_phases
DROP POLICY IF EXISTS "Users can view phases for accessible projects" ON public.project_phases;
CREATE POLICY "Users can view phases for accessible projects"
ON public.project_phases FOR SELECT
USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert phases" ON public.project_phases;
CREATE POLICY "Project admins can insert phases"
ON public.project_phases FOR INSERT
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update phases" ON public.project_phases;
CREATE POLICY "Project admins can update phases"
ON public.project_phases FOR UPDATE
USING (has_project_admin_access(auth.uid(), project_id))
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete phases" ON public.project_phases;
CREATE POLICY "Project admins can delete phases"
ON public.project_phases FOR DELETE
USING (has_project_admin_access(auth.uid(), project_id));

-- 3. project_purchase_requests
DROP POLICY IF EXISTS "Users can view purchase requests for accessible projects" ON public.project_purchase_requests;
CREATE POLICY "Users can view purchase requests for accessible projects"
ON public.project_purchase_requests FOR SELECT
USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project admins can insert purchase requests"
ON public.project_purchase_requests FOR INSERT
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project admins can update purchase requests"
ON public.project_purchase_requests FOR UPDATE
USING (has_project_admin_access(auth.uid(), project_id))
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete purchase requests" ON public.project_purchase_requests;
CREATE POLICY "Project admins can delete purchase requests"
ON public.project_purchase_requests FOR DELETE
USING (has_project_admin_access(auth.uid(), project_id));

-- 4. project_team_members
DROP POLICY IF EXISTS "Users can view team members for accessible projects" ON public.project_team_members;
CREATE POLICY "Users can view team members for accessible projects"
ON public.project_team_members FOR SELECT
USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert team members" ON public.project_team_members;
CREATE POLICY "Project admins can insert team members"
ON public.project_team_members FOR INSERT
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update team members" ON public.project_team_members;
CREATE POLICY "Project admins can update team members"
ON public.project_team_members FOR UPDATE
USING (has_project_admin_access(auth.uid(), project_id))
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete team members" ON public.project_team_members;
CREATE POLICY "Project admins can delete team members"
ON public.project_team_members FOR DELETE
USING (has_project_admin_access(auth.uid(), project_id));

-- ============================================================================
-- GROUP 2: Indirect Project-Scoped Tables (2 tables)
-- Tables linked to projects through parent tables, require EXISTS subqueries
-- ============================================================================

-- 5. purchase_request_items (linked via project_purchase_requests)
DROP POLICY IF EXISTS "Users can view items for accessible requests" ON public.purchase_request_items;
CREATE POLICY "Users can view items for accessible requests"
ON public.purchase_request_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    WHERE pr.id = purchase_request_items.request_id
    AND has_project_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can insert items" ON public.purchase_request_items;
CREATE POLICY "Project admins can insert items"
ON public.purchase_request_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    WHERE pr.id = purchase_request_items.request_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can update items" ON public.purchase_request_items;
CREATE POLICY "Project admins can update items"
ON public.purchase_request_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    WHERE pr.id = purchase_request_items.request_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    WHERE pr.id = purchase_request_items.request_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can delete items" ON public.purchase_request_items;
CREATE POLICY "Project admins can delete items"
ON public.purchase_request_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    WHERE pr.id = purchase_request_items.request_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

-- 6. quotes (linked via purchase_request_items -> project_purchase_requests)
DROP POLICY IF EXISTS "Users can view quotes for accessible requests" ON public.quotes;
CREATE POLICY "Users can view quotes for accessible requests"
ON public.quotes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_request_items pri
    JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
    WHERE pri.id = quotes.purchase_request_item_id
    AND has_project_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can insert quotes" ON public.quotes;
CREATE POLICY "Project admins can insert quotes"
ON public.quotes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_request_items pri
    JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
    WHERE pri.id = quotes.purchase_request_item_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can update quotes" ON public.quotes;
CREATE POLICY "Project admins can update quotes"
ON public.quotes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_request_items pri
    JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
    WHERE pri.id = quotes.purchase_request_item_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_request_items pri
    JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
    WHERE pri.id = quotes.purchase_request_item_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

DROP POLICY IF EXISTS "Project admins can delete quotes" ON public.quotes;
CREATE POLICY "Project admins can delete quotes"
ON public.quotes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_request_items pri
    JOIN public.project_purchase_requests pr ON pr.id = pri.request_id
    WHERE pri.id = quotes.purchase_request_item_id
    AND has_project_admin_access(auth.uid(), pr.project_id)
  )
);

-- ============================================================================
-- GROUP 3: Reference/Catalog Tables (2 tables)
-- Shared reference data accessible to all authenticated users
-- ============================================================================

-- 7. sinapi_catalog (National construction cost database)
DROP POLICY IF EXISTS "Authenticated users can view catalog" ON public.sinapi_catalog;
CREATE POLICY "Authenticated users can view catalog"
ON public.sinapi_catalog FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert catalog items" ON public.sinapi_catalog;
CREATE POLICY "Admins can insert catalog items"
ON public.sinapi_catalog FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update catalog items" ON public.sinapi_catalog;
CREATE POLICY "Admins can update catalog items"
ON public.sinapi_catalog FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete catalog items" ON public.sinapi_catalog;
CREATE POLICY "Admins can delete catalog items"
ON public.sinapi_catalog FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 8. suppliers (Supplier directory)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins and PMs can insert suppliers" ON public.suppliers;
CREATE POLICY "Admins and PMs can insert suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'project_manager')
);

DROP POLICY IF EXISTS "Admins and PMs can update suppliers" ON public.suppliers;
CREATE POLICY "Admins and PMs can update suppliers"
ON public.suppliers FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'project_manager')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'project_manager')
);

DROP POLICY IF EXISTS "Admins and PMs can delete suppliers" ON public.suppliers;
CREATE POLICY "Admins and PMs can delete suppliers"
ON public.suppliers FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'project_manager')
);

-- ============================================================================
-- GROUP 4: Security Audit Table (1 table)
-- Tracks failed login attempts for security monitoring
-- ============================================================================

-- 9. failed_login_attempts
-- First, enable RLS (currently disabled!)
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow system to insert login attempts (authentication system needs this)
DROP POLICY IF EXISTS "System can insert login attempts" ON public.failed_login_attempts;
CREATE POLICY "System can insert login attempts"
ON public.failed_login_attempts FOR INSERT
WITH CHECK (true);

-- Only admins can view security logs
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.failed_login_attempts;
CREATE POLICY "Admins can view login attempts"
ON public.failed_login_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can update login attempts (for blocking/unblocking)
DROP POLICY IF EXISTS "Admins can update login attempts" ON public.failed_login_attempts;
CREATE POLICY "Admins can update login attempts"
ON public.failed_login_attempts FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete old login attempts
DROP POLICY IF EXISTS "Admins can delete login attempts" ON public.failed_login_attempts;
CREATE POLICY "Admins can delete login attempts"
ON public.failed_login_attempts FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Add helpful comments for documentation
-- ============================================================================

COMMENT ON TABLE public.project_materials IS 
  'Material inventory for projects. RLS ensures users can only access materials for projects they have access to.';

COMMENT ON TABLE public.project_phases IS 
  'Project phase tracking. RLS restricts access to project members only.';

COMMENT ON TABLE public.project_purchase_requests IS 
  'Purchase request management. RLS enforces project-based access control.';

COMMENT ON TABLE public.project_team_members IS 
  'Project team assignments. RLS ensures proper team member isolation by project.';

COMMENT ON TABLE public.purchase_request_items IS 
  'Line items for purchase requests. RLS uses EXISTS subquery to check project access through parent table.';

COMMENT ON TABLE public.quotes IS 
  'Supplier quotes for purchase items. RLS uses nested EXISTS to verify project access through parent tables.';

COMMENT ON TABLE public.sinapi_catalog IS 
  'National construction cost database. All authenticated users can read, only admins can modify.';

COMMENT ON TABLE public.suppliers IS 
  'Supplier directory. All authenticated users can read, admins and PMs can manage.';

COMMENT ON TABLE public.failed_login_attempts IS 
  'Security audit log for failed login attempts. RLS ensures only admins can view security data.';
