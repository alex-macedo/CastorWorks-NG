-- Phase 1 Wave 1: set_tenant_context RPC for tenant-scoped RLS.
-- Plan: 01-01-PLAN.md Task 2
-- All tenant-scoped RLS policies will use current_setting('app.current_tenant_id', true)::uuid.

CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), tenant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied to tenant %', tenant_id;
  END IF;
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_tenant_context(uuid) IS
  'Sets session-local app.current_tenant_id for RLS. Call after login/tenant switch. Requires membership in tenant_users or super_admin role.';
