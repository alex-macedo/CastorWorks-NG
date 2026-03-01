-- Allow tenant_users INSERT when the tenant exists (bypass RLS for the existence check).
-- Fixes onboarding: user inserts tenant, then tenant_users; SELECT on tenants is RLS-blocked
-- until the user is a member, so we use a SECURITY DEFINER function for the existence check.

CREATE OR REPLACE FUNCTION public.tenant_exists(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id);
$$;

DROP POLICY IF EXISTS "tenant_users_insert_self_when_tenant_exists" ON public.tenant_users;
CREATE POLICY "tenant_users_insert_self_when_tenant_exists"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.tenant_exists(tenant_id)
  );
