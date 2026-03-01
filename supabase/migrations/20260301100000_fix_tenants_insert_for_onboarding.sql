-- Ensure authenticated users can INSERT into tenants (onboarding flow).
-- Idempotent: safe to run if policy already exists.
-- Fixes: "new row violates row-level security policy for table tenants" during onboarding.

DROP POLICY IF EXISTS "tenants_insert_authenticated" ON public.tenants;
CREATE POLICY "tenants_insert_authenticated"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fallback: allow insert when auth.uid() is set (e.g. anon key with user JWT).
DROP POLICY IF EXISTS "tenants_insert_authenticated_uid" ON public.tenants;
CREATE POLICY "tenants_insert_authenticated_uid"
  ON public.tenants FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NOT NULL);
