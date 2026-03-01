-- Phase 1 Wave 1: Tenant infrastructure
-- Creates tenants, tenant_users, has_tenant_access, and RLS policies.
-- Plan: 01-01-PLAN.md Task 1
-- Requires: 20260301000000_add_super_admin_app_role.sql (super_admin enum value)

BEGIN;

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  max_projects INT,
  max_users INT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

-- Tenant membership: which users belong to which tenant with role
CREATE TABLE IF NOT EXISTS public.tenant_users (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);

-- Helper: does user have access to this tenant? (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = _tenant_id AND user_id = _user_id
  );
$$;

-- RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_member_or_super_admin" ON public.tenants;
CREATE POLICY "tenants_select_member_or_super_admin"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    public.has_tenant_access(auth.uid(), id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "tenants_insert_authenticated" ON public.tenants;
CREATE POLICY "tenants_insert_authenticated"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS on tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_users_select_own" ON public.tenant_users;
CREATE POLICY "tenant_users_select_own"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "tenant_users_insert_self_when_tenant_exists" ON public.tenant_users;
CREATE POLICY "tenant_users_insert_self_when_tenant_exists"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
  );

COMMIT;
