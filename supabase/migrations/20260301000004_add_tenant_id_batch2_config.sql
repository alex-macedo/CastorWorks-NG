-- Phase 1 Wave 1: Add tenant_id to config tables (Batch 2).
-- Plan: 01-01-PLAN.md Task 4
-- app_settings, user_preferences, dropdown_options (per-tenant where used). Nullable; backfill in Task 7.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_app_settings_tenant_id ON public.app_settings(tenant_id);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON public.user_preferences(tenant_id);

ALTER TABLE public.dropdown_options
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_tenant_id ON public.dropdown_options(tenant_id);
