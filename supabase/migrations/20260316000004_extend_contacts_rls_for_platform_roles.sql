-- Extend contacts table RLS policies to include platform roles
-- Drops and recreates the 4 original policies from 20251217000000_create_contacts_table.sql
BEGIN;

-- Drop original policies
DROP POLICY IF EXISTS "admin_pm_can_view_contacts"   ON public.contacts;
DROP POLICY IF EXISTS "admin_pm_can_insert_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admin_pm_can_update_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admin_can_delete_contacts"    ON public.contacts;

-- SELECT: admin, project_manager, plus all platform roles
CREATE POLICY "admin_pm_platform_can_view_contacts"
  ON public.contacts FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'project_manager'::app_role)
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- INSERT: admin, project_manager, plus all platform roles
CREATE POLICY "admin_pm_platform_can_insert_contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'project_manager'::app_role)
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- UPDATE: admin, project_manager, plus all platform roles
CREATE POLICY "admin_pm_platform_can_update_contacts"
  ON public.contacts FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'project_manager'::app_role)
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'project_manager'::app_role)
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- DELETE: admin, plus platform_owner / super_admin
CREATE POLICY "admin_platform_can_delete_contacts"
  ON public.contacts FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

COMMIT;
