-- Phase 1 Wave 1: Add tenant_id to root entities (Batch 1).
-- Plan: 01-01-PLAN.md Task 3
-- Nullable for now; backfill in Task 7.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant_id ON public.company_settings(tenant_id);
