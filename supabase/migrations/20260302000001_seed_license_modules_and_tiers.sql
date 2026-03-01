-- Phase 2 Plan 02-01: Seed license_modules, subscription_tiers, tier_modules from PROJECT.md
-- Run after 20260302000000_license_modules_tiers_tenant_licensed.sql

BEGIN;

-- 1. license_modules (~25 modules: core, functional, portal, ai, enterprise)
INSERT INTO public.license_modules (id, name, description, category) VALUES
  ('core', 'Core', 'Dashboard, Projects, Settings, Contacts', 'core'),
  ('financial_basic', 'Financial Basic', 'Per-project P&L, budget view', 'functional'),
  ('financial_full', 'Financial Full', 'Ledger, cashflow, AR/AP, collections, budget control', 'functional'),
  ('procurement', 'Procurement', 'POs, purchase requests, quotes, approvals, suppliers', 'functional'),
  ('schedule_basic', 'Schedule Basic', 'Timeline view, milestones', 'functional'),
  ('schedule_full', 'Schedule Full', 'Gantt, critical path, EVM, scenarios', 'functional'),
  ('roadmap', 'Roadmap', 'Kanban, task management', 'functional'),
  ('reports', 'Reports', 'Project status, budget vs actual, PDF export', 'functional'),
  ('campaigns', 'Campaigns', 'Email/WhatsApp campaigns', 'functional'),
  ('forms', 'Forms', 'Form builder, distribution, analytics', 'functional'),
  ('content_hub', 'Content Hub', 'News, articles, FAQ, documents', 'functional'),
  ('templates', 'Templates', 'Budget, WBS, phase, material templates', 'functional'),
  ('architect_portal', 'Architect Portal', 'Full architect experience', 'portal'),
  ('client_portal', 'Client Portal', 'Client-facing project views', 'portal'),
  ('supervisor_portal', 'Supervisor Portal', 'Mobile supervisor hub', 'portal'),
  ('mobile_app', 'Mobile App', 'PWA field app', 'portal'),
  ('field_logistics', 'Field Logistics', 'QR scanner, inventory, deliveries', 'portal'),
  ('ai_core', 'AI Core', 'CastorMind chat, AI insights', 'ai'),
  ('ai_financial', 'AI Financial', 'Budget intelligence, cashflow forecast, anomaly detection', 'ai'),
  ('ai_procurement', 'AI Procurement', 'Spend prediction, inventory prediction', 'ai'),
  ('ai_voice', 'AI Voice', 'Transcription, voice-to-task', 'ai'),
  ('ai_architect', 'AI Architect', 'Site diary AI, financial advisor, proposal generation', 'ai'),
  ('ai_comms', 'AI Comms', 'WhatsApp auto-responder, campaign personalization, reply suggestions', 'ai'),
  ('tax_engine', 'Tax Engine', 'INSS, ISS, CNO, SERO, DCTFWeb', 'enterprise'),
  ('white_label', 'White Label', 'Custom branding on client portal', 'enterprise'),
  ('sso', 'SSO', 'SSO/SAML authentication', 'enterprise'),
  ('api_access', 'API Access', 'External API access', 'enterprise'),
  ('multi_currency', 'Multi-Currency', 'Exchange rates, multi-currency support', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- 2. subscription_tiers (trial, sandbox, architect_office, architect_office_ai, construction, construction_ai, enterprise)
INSERT INTO public.subscription_tiers (id, name, price_monthly_brl, price_annual_brl, max_projects, max_users, max_storage_gb, trial_days, display_order, is_active) VALUES
  ('trial', 'Trial', 0, NULL, NULL, 10, 10, 30, 1, true),
  ('sandbox', 'Sandbox', 0, NULL, 1, 3, 1, 0, 2, true),
  ('architect_office', 'Architect Office', 349, 279, 10, 10, 20, 0, 3, true),
  ('architect_office_ai', 'Architect Office+AI', 599, 479, 15, 15, 50, 0, 4, true),
  ('construction', 'Construction', 999, 799, 30, 30, 100, 0, 5, true),
  ('construction_ai', 'Construction+AI', 1499, 1199, 50, 50, 250, 0, 6, true),
  ('enterprise', 'Enterprise', 2000, NULL, NULL, NULL, NULL, 0, 7, true)
ON CONFLICT (id) DO NOTHING;

-- 3. tier_modules: Trial = all except enterprise-only; Sandbox = core, financial_basic, schedule_basic, roadmap, mobile_app; etc. (from PROJECT.md matrix)
-- Trial: all modules except enterprise-only (tax_engine, white_label, sso, api_access, multi_currency)
INSERT INTO public.tier_modules (tier_id, module_id)
SELECT 'trial', id FROM public.license_modules
WHERE id NOT IN ('tax_engine', 'white_label', 'sso', 'api_access', 'multi_currency')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Sandbox: core, financial_basic, schedule_basic, roadmap, mobile_app
INSERT INTO public.tier_modules (tier_id, module_id) VALUES
  ('sandbox', 'core'),
  ('sandbox', 'financial_basic'),
  ('sandbox', 'schedule_basic'),
  ('sandbox', 'roadmap'),
  ('sandbox', 'mobile_app')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Architect Office: core, financial_basic, schedule_basic, roadmap, reports, templates, architect_portal, client_portal, mobile_app
INSERT INTO public.tier_modules (tier_id, module_id) VALUES
  ('architect_office', 'core'),
  ('architect_office', 'financial_basic'),
  ('architect_office', 'schedule_basic'),
  ('architect_office', 'roadmap'),
  ('architect_office', 'reports'),
  ('architect_office', 'templates'),
  ('architect_office', 'architect_portal'),
  ('architect_office', 'client_portal'),
  ('architect_office', 'mobile_app')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Architect Office+AI: architect_office + ai_core, ai_voice, ai_architect
INSERT INTO public.tier_modules (tier_id, module_id)
SELECT 'architect_office_ai', module_id FROM public.tier_modules WHERE tier_id = 'architect_office'
ON CONFLICT (tier_id, module_id) DO NOTHING;
INSERT INTO public.tier_modules (tier_id, module_id) VALUES
  ('architect_office_ai', 'ai_core'),
  ('architect_office_ai', 'ai_voice'),
  ('architect_office_ai', 'ai_architect')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Construction: core, financial_basic, financial_full, procurement, schedule_basic, schedule_full, roadmap, reports, templates, campaigns, client_portal, supervisor_portal, mobile_app, field_logistics
INSERT INTO public.tier_modules (tier_id, module_id) VALUES
  ('construction', 'core'),
  ('construction', 'financial_basic'),
  ('construction', 'financial_full'),
  ('construction', 'procurement'),
  ('construction', 'schedule_basic'),
  ('construction', 'schedule_full'),
  ('construction', 'roadmap'),
  ('construction', 'reports'),
  ('construction', 'templates'),
  ('construction', 'campaigns'),
  ('construction', 'client_portal'),
  ('construction', 'supervisor_portal'),
  ('construction', 'mobile_app'),
  ('construction', 'field_logistics')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Construction+AI: construction + ai_core, ai_financial, ai_procurement, ai_voice, ai_comms
INSERT INTO public.tier_modules (tier_id, module_id)
SELECT 'construction_ai', module_id FROM public.tier_modules WHERE tier_id = 'construction'
ON CONFLICT (tier_id, module_id) DO NOTHING;
INSERT INTO public.tier_modules (tier_id, module_id) VALUES
  ('construction_ai', 'ai_core'),
  ('construction_ai', 'ai_financial'),
  ('construction_ai', 'ai_procurement'),
  ('construction_ai', 'ai_voice'),
  ('construction_ai', 'ai_comms')
ON CONFLICT (tier_id, module_id) DO NOTHING;

-- Enterprise: all modules
INSERT INTO public.tier_modules (tier_id, module_id)
SELECT 'enterprise', id FROM public.license_modules
ON CONFLICT (tier_id, module_id) DO NOTHING;

COMMIT;
