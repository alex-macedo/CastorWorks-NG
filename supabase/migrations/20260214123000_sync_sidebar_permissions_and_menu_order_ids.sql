-- ============================================================================
-- Sync sidebar permission/menu-order records with current SIDEBAR_OPTIONS ids
-- ============================================================================

BEGIN;

-- 1) Migrate legacy option_id: office-admin -> team-workspace
INSERT INTO public.sidebar_option_permissions (option_id, role, sort_order)
SELECT
  'team-workspace',
  sop.role,
  COALESCE(sop.sort_order, 999)
FROM public.sidebar_option_permissions sop
WHERE sop.option_id = 'office-admin'
ON CONFLICT (option_id, role) DO UPDATE
SET sort_order = LEAST(
  COALESCE(public.sidebar_option_permissions.sort_order, 999),
  COALESCE(EXCLUDED.sort_order, 999)
);

DELETE FROM public.sidebar_option_permissions
WHERE option_id = 'office-admin';

INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  'team-workspace',
  stp.tab_id,
  stp.role,
  COALESCE(stp.sort_order, 999)
FROM public.sidebar_tab_permissions stp
WHERE stp.option_id = 'office-admin'
ON CONFLICT (option_id, tab_id, role) DO UPDATE
SET sort_order = LEAST(
  COALESCE(public.sidebar_tab_permissions.sort_order, 999),
  COALESCE(EXCLUDED.sort_order, 999)
);

DELETE FROM public.sidebar_tab_permissions
WHERE option_id = 'office-admin';

-- 2) Ensure all current sidebar options exist for their configured roles
WITH expected_option_roles(option_id, role) AS (
  VALUES
    ('dashboard', 'admin'::app_role),
    ('dashboard', 'project_manager'::app_role),
    ('dashboard', 'site_supervisor'::app_role),
    ('dashboard', 'admin_office'::app_role),
    ('dashboard', 'viewer'::app_role),
    ('dashboard', 'accountant'::app_role),

    ('my-workspace', 'admin'::app_role),
    ('my-workspace', 'project_manager'::app_role),
    ('my-workspace', 'architect'::app_role),

    ('castormind-ai', 'admin'::app_role),
    ('castormind-ai', 'project_manager'::app_role),
    ('castormind-ai', 'site_supervisor'::app_role),
    ('castormind-ai', 'admin_office'::app_role),
    ('castormind-ai', 'viewer'::app_role),
    ('castormind-ai', 'accountant'::app_role),
    ('castormind-ai', 'architect'::app_role),

    ('projects', 'admin'::app_role),
    ('projects', 'project_manager'::app_role),
    ('projects', 'site_supervisor'::app_role),
    ('projects', 'admin_office'::app_role),

    ('team-workspace', 'admin'::app_role),
    ('team-workspace', 'project_manager'::app_role),
    ('team-workspace', 'site_supervisor'::app_role),
    ('team-workspace', 'admin_office'::app_role),
    ('team-workspace', 'architect'::app_role),
    ('team-workspace', 'accountant'::app_role),
    ('team-workspace', 'editor'::app_role),

    ('financials', 'admin'::app_role),
    ('financials', 'project_manager'::app_role),
    ('financials', 'admin_office'::app_role),

    ('templates', 'admin'::app_role),
    ('templates', 'project_manager'::app_role),
    ('templates', 'admin_office'::app_role),
    ('templates', 'site_supervisor'::app_role),

    ('architect', 'admin'::app_role),
    ('architect', 'project_manager'::app_role),
    ('architect', 'architect'::app_role),

    ('mobile-app', 'admin'::app_role),
    ('mobile-app', 'project_manager'::app_role),
    ('mobile-app', 'site_supervisor'::app_role),
    ('mobile-app', 'admin_office'::app_role),
    ('mobile-app', 'viewer'::app_role),
    ('mobile-app', 'accountant'::app_role),
    ('mobile-app', 'architect'::app_role),
    ('mobile-app', 'editor'::app_role),

    ('supervisor', 'admin'::app_role),
    ('supervisor', 'project_manager'::app_role),
    ('supervisor', 'site_supervisor'::app_role),
    ('supervisor', 'admin_office'::app_role),
    ('supervisor', 'viewer'::app_role),
    ('supervisor', 'accountant'::app_role),
    ('supervisor', 'architect'::app_role),
    ('supervisor', 'editor'::app_role),

    ('client-portal', 'client'::app_role),
    ('client-portal', 'admin'::app_role),
    ('client-portal', 'project_manager'::app_role),

    ('content-hub', 'admin'::app_role),
    ('content-hub', 'project_manager'::app_role),
    ('content-hub', 'site_supervisor'::app_role),
    ('content-hub', 'admin_office'::app_role),
    ('content-hub', 'viewer'::app_role),
    ('content-hub', 'accountant'::app_role),
    ('content-hub', 'editor'::app_role),

    ('content-hub-admin', 'admin'::app_role),
    ('content-hub-admin', 'editor'::app_role),

    ('documentation', 'admin'::app_role),
    ('documentation', 'project_manager'::app_role),
    ('documentation', 'site_supervisor'::app_role),
    ('documentation', 'admin_office'::app_role),
    ('documentation', 'viewer'::app_role),
    ('documentation', 'accountant'::app_role),

    ('settings', 'admin'::app_role)
)
INSERT INTO public.sidebar_option_permissions (option_id, role, sort_order)
SELECT
  eor.option_id,
  eor.role,
  get_option_sort_index(eor.option_id)
FROM expected_option_roles eor
ON CONFLICT (option_id, role) DO NOTHING;

-- 3) Keep option sort-order default map aligned with current navigation ids
CREATE OR REPLACE FUNCTION get_option_sort_index(option_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    option_order TEXT[] := ARRAY[
        'dashboard',
        'my-workspace',
        'castormind-ai',
        'projects',
        'team-workspace',
        'financials',
        'templates',
        'architect',
        'mobile-app',
        'supervisor',
        'client-portal',
        'content-hub',
        'content-hub-admin',
        'documentation',
        'settings'
    ];
    idx INTEGER;
BEGIN
    FOR idx IN 1..array_length(option_order, 1) LOOP
        IF option_order[idx] = option_id THEN
            RETURN idx - 1;
        END IF;
    END LOOP;
    RETURN 999;
END;
$$;

-- 4) Keep tab sort-order default map aligned with current navigation ids
CREATE OR REPLACE FUNCTION get_tab_sort_index(option_id TEXT, tab_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    tab_orders JSONB := '{
        "dashboard": ["dashboard-overview"],
        "my-workspace": ["architect-my-dashboard", "architect-tasks", "architect-timesheet"],
        "castormind-ai": ["overall-status", "analytics", "ai-insights", "architect-financial", "architect-proposals"],
        "projects": ["clients", "projects-all", "project-schedule", "projects-overview", "projects-estimates", "procurement", "purchase-orders"],
        "team-workspace": ["team-chat", "team-communication", "client-access", "contacts", "campaigns", "forms", "reports", "team-task-management"],
        "financials": ["financial", "financial-cashflow", "financial-collections", "financial-ar", "financial-ap", "financial-actions", "ledger", "financial-payments", "budget-control", "payments"],
        "templates": ["budget-templates", "materials-templates", "labor-templates", "phase-templates", "construction-activities", "project-wbs"],
        "architect": ["architect-dashboard", "architect-projects", "architect-schedule", "architect-projects-overview", "sales-pipeline", "calendar", "architect-meetings", "architect-clients", "architect-contacts", "architect-reports", "architect-portfolio"],
        "mobile-app": ["mobile-app-main"],
        "supervisor": ["supervisor-hub"],
        "client-portal": ["client-portal-dashboard", "client-portal-inss-planning", "client-portal-inss-strategy", "client-portal-schedule", "client-portal-tasks", "client-portal-meetings", "client-portal-communication", "client-portal-chat", "client-portal-payments", "client-portal-financial", "client-portal-photos", "client-portal-documents", "client-portal-switch"],
        "content-hub": ["news", "articles", "documents", "faq"],
        "content-hub-admin": ["content-hub-dashboard", "content-hub-list", "content-hub-create", "content-hub-approvals"],
        "documentation": ["documentation"],
        "settings": ["settings"]
    }'::jsonb;
    idx INTEGER;
    tab_json_array JSONB;
BEGIN
    tab_json_array := COALESCE(tab_orders->option_id, '[]'::jsonb);

    IF jsonb_array_length(tab_json_array) = 0 THEN
        RETURN 999;
    END IF;

    FOR idx IN 0..jsonb_array_length(tab_json_array) - 1 LOOP
        IF jsonb_array_element_text(tab_json_array, idx) = tab_id THEN
            RETURN idx;
        END IF;
    END LOOP;

    RETURN 999;
END;
$$;

-- 5) Ensure all current sidebar tabs exist for all roles that can access their option
WITH expected_tabs(option_id, tab_id) AS (
  VALUES
    ('dashboard', 'dashboard-overview'),

    ('my-workspace', 'architect-my-dashboard'),
    ('my-workspace', 'architect-tasks'),
    ('my-workspace', 'architect-timesheet'),

    ('castormind-ai', 'overall-status'),
    ('castormind-ai', 'analytics'),
    ('castormind-ai', 'ai-insights'),
    ('castormind-ai', 'architect-financial'),
    ('castormind-ai', 'architect-proposals'),

    ('projects', 'clients'),
    ('projects', 'projects-all'),
    ('projects', 'project-schedule'),
    ('projects', 'projects-overview'),
    ('projects', 'projects-estimates'),
    ('projects', 'procurement'),
    ('projects', 'purchase-orders'),

    ('team-workspace', 'team-chat'),
    ('team-workspace', 'team-communication'),
    ('team-workspace', 'client-access'),
    ('team-workspace', 'contacts'),
    ('team-workspace', 'campaigns'),
    ('team-workspace', 'forms'),
    ('team-workspace', 'reports'),
    ('team-workspace', 'team-task-management'),

    ('financials', 'financial'),
    ('financials', 'financial-cashflow'),
    ('financials', 'financial-collections'),
    ('financials', 'financial-ar'),
    ('financials', 'financial-ap'),
    ('financials', 'financial-actions'),
    ('financials', 'ledger'),
    ('financials', 'financial-payments'),
    ('financials', 'budget-control'),
    ('financials', 'payments'),

    ('templates', 'budget-templates'),
    ('templates', 'materials-templates'),
    ('templates', 'labor-templates'),
    ('templates', 'phase-templates'),
    ('templates', 'construction-activities'),
    ('templates', 'project-wbs'),

    ('architect', 'architect-dashboard'),
    ('architect', 'architect-projects'),
    ('architect', 'architect-schedule'),
    ('architect', 'architect-projects-overview'),
    ('architect', 'sales-pipeline'),
    ('architect', 'calendar'),
    ('architect', 'architect-meetings'),
    ('architect', 'architect-clients'),
    ('architect', 'architect-contacts'),
    ('architect', 'architect-reports'),
    ('architect', 'architect-portfolio'),

    ('mobile-app', 'mobile-app-main'),

    ('supervisor', 'supervisor-hub'),

    ('client-portal', 'client-portal-dashboard'),
    ('client-portal', 'client-portal-inss-planning'),
    ('client-portal', 'client-portal-inss-strategy'),
    ('client-portal', 'client-portal-schedule'),
    ('client-portal', 'client-portal-tasks'),
    ('client-portal', 'client-portal-meetings'),
    ('client-portal', 'client-portal-communication'),
    ('client-portal', 'client-portal-chat'),
    ('client-portal', 'client-portal-payments'),
    ('client-portal', 'client-portal-financial'),
    ('client-portal', 'client-portal-photos'),
    ('client-portal', 'client-portal-documents'),
    ('client-portal', 'client-portal-switch'),

    ('content-hub', 'news'),
    ('content-hub', 'articles'),
    ('content-hub', 'documents'),
    ('content-hub', 'faq'),

    ('content-hub-admin', 'content-hub-dashboard'),
    ('content-hub-admin', 'content-hub-list'),
    ('content-hub-admin', 'content-hub-create'),
    ('content-hub-admin', 'content-hub-approvals'),

    ('documentation', 'documentation'),

    ('settings', 'settings')
)
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  et.option_id,
  et.tab_id,
  sop.role,
  get_tab_sort_index(et.option_id, et.tab_id)
FROM expected_tabs et
JOIN public.sidebar_option_permissions sop ON sop.option_id = et.option_id
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- 6) Normalize legacy unknown ordering values to defaults
UPDATE public.sidebar_option_permissions
SET sort_order = get_option_sort_index(option_id)
WHERE sort_order IS NULL OR sort_order = 999;

UPDATE public.sidebar_tab_permissions
SET sort_order = get_tab_sort_index(option_id, tab_id)
WHERE sort_order IS NULL OR sort_order = 999;

COMMIT;
