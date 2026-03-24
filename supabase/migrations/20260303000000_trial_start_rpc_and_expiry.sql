-- Phase 3 Plan 03-01: start_trial RPC and lazy trial expiry in get_tenant_licensed_modules
-- start_trial(p_tenant_id): allows tenant members to start 30-day trial (sandbox -> trial)
-- get_tenant_licensed_modules: at entry, move expired trials to sandbox then return modules

BEGIN;

-- 1. start_trial(p_tenant_id): set tenant to trial tier with 30-day trial_ends_at (only if currently sandbox)
CREATE OR REPLACE FUNCTION public.start_trial(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), p_tenant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied to tenant';
  END IF;

  UPDATE public.tenants
  SET subscription_tier_id = 'trial',
      trial_ends_at = now() + interval '30 days',
      updated_at = now()
  WHERE id = p_tenant_id
    AND subscription_tier_id = 'sandbox';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial already active or tenant not eligible (only sandbox can start trial)';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_trial(uuid) TO authenticated;

COMMENT ON FUNCTION public.start_trial(uuid) IS
  'Starts a 30-day trial for the tenant. Caller must have tenant access or be super_admin. Only tenants with subscription_tier_id = sandbox can start a trial.';

-- 2. get_tenant_licensed_modules: lazy expiry then unchanged resolution
-- Function must be VOLATILE because it performs UPDATE (side effect)
CREATE OR REPLACE FUNCTION public.get_tenant_licensed_modules(p_tenant_id UUID)
RETURNS text[]
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), p_tenant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied to tenant';
  END IF;

  -- Lazy expiry: move expired trials to sandbox so next resolution returns sandbox modules
  UPDATE public.tenants
  SET subscription_tier_id = 'sandbox',
      trial_ends_at = NULL,
      updated_at = now()
  WHERE id = p_tenant_id
    AND subscription_tier_id = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();

  RETURN (
    SELECT COALESCE(array_agg(DISTINCT m.module_id ORDER BY m.module_id), '{}'::text[])
    FROM (
      SELECT tm.module_id
      FROM public.tenants t
      JOIN public.tier_modules tm ON tm.tier_id = t.subscription_tier_id
      WHERE t.id = p_tenant_id
      UNION
      SELECT tlm.module_id
      FROM public.tenant_licensed_modules tlm
      WHERE tlm.tenant_id = p_tenant_id
        AND tlm.source = 'override'
        AND (tlm.expires_at IS NULL OR tlm.expires_at > now())
    ) m
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_licensed_modules(uuid) TO authenticated;

COMMIT;
