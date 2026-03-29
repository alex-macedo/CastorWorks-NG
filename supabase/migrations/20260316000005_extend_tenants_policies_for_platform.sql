-- Extend tenants table RLS policies to include platform roles
-- Adds UPDATE and DELETE policies; extends existing SELECT policy
BEGIN;

-- Drop old SELECT policy and recreate with platform roles
DROP POLICY IF EXISTS "tenants_select_member_or_super_admin" ON public.tenants;

CREATE POLICY "tenants_select_member_or_super_admin"
  ON public.tenants FOR SELECT
  USING (
    -- Original: tenant members + super_admin
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = id
        AND tu.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
    -- Platform roles can see all tenants
    OR has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
  );

-- Only platform_owner / super_admin can update tenant records
-- (WARNING: changing slug/status has downstream cascade effects)
CREATE POLICY "tenants_update_platform_owner"
  ON public.tenants FOR UPDATE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only platform_owner / super_admin can delete tenant records
-- (WARNING: deleting a tenant will cascade to all tenant_users, modules, etc.)
CREATE POLICY "tenants_delete_platform_owner"
  ON public.tenants FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

COMMIT;
