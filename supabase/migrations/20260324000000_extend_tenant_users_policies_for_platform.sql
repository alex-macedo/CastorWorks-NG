-- =============================================================================
-- Migration: Extend tenant_users RLS policies for platform roles
-- =============================================================================
-- Allows platform_owner and super_admin to manage tenant_users across all tenants
-- This enables the Platform Customer Admin to add/edit/remove users per workspace
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- SELECT: Platform roles can view all tenant_users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_users_select_platform" ON public.tenant_users;
CREATE POLICY "tenant_users_select_platform"
  ON public.tenant_users FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- -----------------------------------------------------------------------------
-- INSERT: Platform roles can add users to any tenant
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_users_insert_platform" ON public.tenant_users;
CREATE POLICY "tenant_users_insert_platform"
  ON public.tenant_users FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- -----------------------------------------------------------------------------
-- UPDATE: Platform roles can update user roles in any tenant
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_users_update_platform" ON public.tenant_users;
CREATE POLICY "tenant_users_update_platform"
  ON public.tenant_users FOR UPDATE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- -----------------------------------------------------------------------------
-- DELETE: Platform roles can remove users from any tenant
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_users_delete_platform" ON public.tenant_users;
CREATE POLICY "tenant_users_delete_platform"
  ON public.tenant_users FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

COMMIT;
