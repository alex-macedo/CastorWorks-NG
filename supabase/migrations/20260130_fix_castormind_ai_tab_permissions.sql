-- Add missing tab permissions for CastorMind-AI option
-- This fixes the bug where tabs were not visible under CastorMind-AI

INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES 
  -- Overall Status tab
  ('castormind-ai', 'overall-status', 'admin'),
  ('castormind-ai', 'overall-status', 'project_manager'),
  ('castormind-ai', 'overall-status', 'site_supervisor'),
  ('castormind-ai', 'overall-status', 'admin_office'),
  ('castormind-ai', 'overall-status', 'viewer'),
  ('castormind-ai', 'overall-status', 'accountant'),
  ('castormind-ai', 'overall-status', 'architect'),
  
  -- Analytics tab
  ('castormind-ai', 'analytics', 'admin'),
  ('castormind-ai', 'analytics', 'project_manager'),
  ('castormind-ai', 'analytics', 'site_supervisor'),
  ('castormind-ai', 'analytics', 'admin_office'),
  ('castormind-ai', 'analytics', 'viewer'),
  ('castormind-ai', 'analytics', 'accountant'),
  ('castormind-ai', 'analytics', 'architect'),
  
  -- AI Insights tab
  ('castormind-ai', 'ai-insights', 'admin'),
  ('castormind-ai', 'ai-insights', 'project_manager'),
  ('castormind-ai', 'ai-insights', 'site_supervisor'),
  ('castormind-ai', 'ai-insights', 'admin_office'),
  ('castormind-ai', 'ai-insights', 'viewer'),
  ('castormind-ai', 'ai-insights', 'accountant'),
  ('castormind-ai', 'ai-insights', 'architect'),
  
  -- Financials tab (architect section)
  ('castormind-ai', 'architect-financial', 'admin'),
  ('castormind-ai', 'architect-financial', 'project_manager'),
  ('castormind-ai', 'architect-financial', 'site_supervisor'),
  ('castormind-ai', 'architect-financial', 'admin_office'),
  ('castormind-ai', 'architect-financial', 'viewer'),
  ('castormind-ai', 'architect-financial', 'accountant'),
  ('castormind-ai', 'architect-financial', 'architect'),
  
  -- Proposals tab (architect section)
  ('castormind-ai', 'architect-proposals', 'admin'),
  ('castormind-ai', 'architect-proposals', 'project_manager'),
  ('castormind-ai', 'architect-proposals', 'site_supervisor'),
  ('castormind-ai', 'architect-proposals', 'admin_office'),
  ('castormind-ai', 'architect-proposals', 'viewer'),
  ('castormind-ai', 'architect-proposals', 'accountant'),
  ('castormind-ai', 'architect-proposals', 'architect')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;
