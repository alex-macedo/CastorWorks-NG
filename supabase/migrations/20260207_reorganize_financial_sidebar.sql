-- ============================================================================
-- Reorganize Financial Sidebar Options
-- Migration: 20260207_reorganize_financial_sidebar.sql
-- Description: Creates a new "financials" sidebar option and moves financial
--              tabs from "office-admin" to the new option. Updates database permissions.
-- ============================================================================

BEGIN;

-- 1. Add permissions for the new "financials" option
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES
  ('financials', 'admin'),
  ('financials', 'project_manager'),
  ('financials', 'admin_office')
ON CONFLICT (option_id, role) DO NOTHING;

-- 2. Add tab permissions for the new "financials" option (moved tabs)
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role)
VALUES
  -- financial tab
  ('financials', 'financial', 'admin'),
  ('financials', 'financial', 'project_manager'),
  ('financials', 'financial', 'admin_office'),
  -- financial-cashflow tab
  ('financials', 'financial-cashflow', 'admin'),
  ('financials', 'financial-cashflow', 'project_manager'),
  ('financials', 'financial-cashflow', 'admin_office'),
  -- financial-ar tab
  ('financials', 'financial-ar', 'admin'),
  ('financials', 'financial-ar', 'project_manager'),
  ('financials', 'financial-ar', 'admin_office'),
  -- financial-ap tab
  ('financials', 'financial-ap', 'admin'),
  ('financials', 'financial-ap', 'project_manager'),
  ('financials', 'financial-ap', 'admin_office'),
  -- financial-actions tab
  ('financials', 'financial-actions', 'admin'),
  ('financials', 'financial-actions', 'project_manager'),
  ('financials', 'financial-actions', 'admin_office'),
  -- ledger tab
  ('financials', 'ledger', 'admin'),
  ('financials', 'ledger', 'project_manager'),
  ('financials', 'ledger', 'admin_office'),
  -- budget-control tab
  ('financials', 'budget-control', 'admin'),
  ('financials', 'budget-control', 'project_manager'),
  ('financials', 'budget-control', 'admin_office'),
  -- payments tab
  ('financials', 'payments', 'admin'),
  ('financials', 'payments', 'project_manager'),
  ('financials', 'payments', 'admin_office')
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- 3. Remove the moved tab permissions from "office-admin"
DELETE FROM public.sidebar_tab_permissions
WHERE option_id = 'office-admin'
  AND tab_id IN (
    'financial',
    'financial-cashflow',
    'financial-ar',
    'financial-ap',
    'financial-actions',
    'ledger',
    'budget-control',
    'payments'
  );

COMMIT;