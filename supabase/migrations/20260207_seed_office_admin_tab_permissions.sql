-- ============================================================================
-- Seed Sidebar Tab Permissions for Office Admin
-- Migration: 20260207_seed_office_admin_tab_permissions.sql
-- Description: Seeds tab-level permissions for the office-admin sidebar option
--              including the new financial module tabs
-- ============================================================================

BEGIN;

-- Seed tab permissions for office-admin option
-- Roles: admin, project_manager, admin_office

-- client-access tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'client-access', 'admin'),
  ('office-admin', 'client-access', 'project_manager'),
  ('office-admin', 'client-access', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- contacts tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'contacts', 'admin'),
  ('office-admin', 'contacts', 'project_manager'),
  ('office-admin', 'contacts', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- campaigns tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'campaigns', 'admin'),
  ('office-admin', 'campaigns', 'project_manager'),
  ('office-admin', 'campaigns', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- forms tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'forms', 'admin'),
  ('office-admin', 'forms', 'project_manager'),
  ('office-admin', 'forms', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- financial tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'financial', 'admin'),
  ('office-admin', 'financial', 'project_manager'),
  ('office-admin', 'financial', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- financial-cashflow tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'financial-cashflow', 'admin'),
  ('office-admin', 'financial-cashflow', 'project_manager'),
  ('office-admin', 'financial-cashflow', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- financial-ar tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'financial-ar', 'admin'),
  ('office-admin', 'financial-ar', 'project_manager'),
  ('office-admin', 'financial-ar', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- financial-ap tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'financial-ap', 'admin'),
  ('office-admin', 'financial-ap', 'project_manager'),
  ('office-admin', 'financial-ap', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- financial-actions tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'financial-actions', 'admin'),
  ('office-admin', 'financial-actions', 'project_manager'),
  ('office-admin', 'financial-actions', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- ledger tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'ledger', 'admin'),
  ('office-admin', 'ledger', 'project_manager'),
  ('office-admin', 'ledger', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- budget-control tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'budget-control', 'admin'),
  ('office-admin', 'budget-control', 'project_manager'),
  ('office-admin', 'budget-control', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- payments tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'payments', 'admin'),
  ('office-admin', 'payments', 'project_manager'),
  ('office-admin', 'payments', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- reports tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'reports', 'admin'),
  ('office-admin', 'reports', 'project_manager'),
  ('office-admin', 'reports', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- team-task-management tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  ('office-admin', 'team-task-management', 'admin'),
  ('office-admin', 'team-task-management', 'project_manager'),
  ('office-admin', 'team-task-management', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

COMMIT;