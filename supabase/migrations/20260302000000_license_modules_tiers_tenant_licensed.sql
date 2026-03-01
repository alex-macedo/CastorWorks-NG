-- Phase 2 Plan 02-01: Licensing schema, tenants.subscription_tier_id, get_tenant_licensed_modules RPC
-- Creates license_modules, subscription_tiers, tier_modules, tenant_licensed_modules; RLS; RPC

BEGIN;

-- 1. license_modules
CREATE TABLE IF NOT EXISTS public.license_modules (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  depends_on VARCHAR(50)[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. subscription_tiers (before tier_modules and tenants FK)
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_monthly_brl DECIMAL(10,2),
  price_annual_brl DECIMAL(10,2),
  max_projects INT,
  max_users INT,
  max_storage_gb INT,
  trial_days INT DEFAULT 0,
  display_order INT,
  is_active BOOLEAN DEFAULT true
);

-- 3. tier_modules
CREATE TABLE IF NOT EXISTS public.tier_modules (
  tier_id VARCHAR(50) NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL REFERENCES public.license_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (tier_id, module_id)
);

-- 4. tenant_licensed_modules
CREATE TABLE IF NOT EXISTS public.tenant_licensed_modules (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL REFERENCES public.license_modules(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL DEFAULT 'tier' CHECK (source IN ('tier', 'override')),
  monthly_quota INT,
  current_usage INT DEFAULT 0,
  quota_resets_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, module_id)
);

-- 5. tenants: add subscription_tier_id
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_tier_id VARCHAR(50) REFERENCES public.subscription_tiers(id);

-- 6. RLS on license_modules, subscription_tiers, tier_modules: authenticated SELECT
ALTER TABLE public.license_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_licensed_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_modules_select_authenticated" ON public.license_modules;
CREATE POLICY "license_modules_select_authenticated"
  ON public.license_modules FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "subscription_tiers_select_authenticated" ON public.subscription_tiers;
CREATE POLICY "subscription_tiers_select_authenticated"
  ON public.subscription_tiers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tier_modules_select_authenticated" ON public.tier_modules;
CREATE POLICY "tier_modules_select_authenticated"
  ON public.tier_modules FOR SELECT TO authenticated
  USING (true);

-- tenant_licensed_modules: SELECT for tenant members or super_admin; INSERT/UPDATE/DELETE for super_admin only
DROP POLICY IF EXISTS "tenant_licensed_modules_select_tenant_or_super_admin" ON public.tenant_licensed_modules;
CREATE POLICY "tenant_licensed_modules_select_tenant_or_super_admin"
  ON public.tenant_licensed_modules FOR SELECT TO authenticated
  USING (
    public.has_tenant_access(auth.uid(), tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "tenant_licensed_modules_insert_super_admin" ON public.tenant_licensed_modules;
CREATE POLICY "tenant_licensed_modules_insert_super_admin"
  ON public.tenant_licensed_modules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "tenant_licensed_modules_update_super_admin" ON public.tenant_licensed_modules;
CREATE POLICY "tenant_licensed_modules_update_super_admin"
  ON public.tenant_licensed_modules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "tenant_licensed_modules_delete_super_admin" ON public.tenant_licensed_modules;
CREATE POLICY "tenant_licensed_modules_delete_super_admin"
  ON public.tenant_licensed_modules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 7. RPC get_tenant_licensed_modules(p_tenant_id) -> tier modules UNION override rows (not expired)
CREATE OR REPLACE FUNCTION public.get_tenant_licensed_modules(p_tenant_id UUID)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), p_tenant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied to tenant';
  END IF;
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
