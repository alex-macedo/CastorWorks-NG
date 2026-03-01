-- ============================================================================
-- Add "Projects Overview" sidebar tabs and keep permissions/sort order aligned
-- ============================================================================

BEGIN;

-- Copy existing project schedule permissions to new projects-overview tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  'projects',
  'projects-overview',
  stp.role,
  COALESCE(
    (
      SELECT MIN(existing.sort_order)
      FROM public.sidebar_tab_permissions existing
      WHERE existing.option_id = 'projects'
        AND existing.tab_id = 'project-schedule'
    ),
    get_tab_sort_index('projects', 'projects-overview')
  )
FROM public.sidebar_tab_permissions stp
WHERE stp.option_id = 'projects'
  AND stp.tab_id = 'project-schedule'
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- Ensure all roles with projects option access receive projects-overview tab access
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  'projects',
  'projects-overview',
  sop.role,
  get_tab_sort_index('projects', 'projects-overview')
FROM public.sidebar_option_permissions sop
WHERE sop.option_id = 'projects'
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- Copy existing architect schedule permissions to new architect-projects-overview tab
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  'architect',
  'architect-projects-overview',
  stp.role,
  COALESCE(
    (
      SELECT MIN(existing.sort_order)
      FROM public.sidebar_tab_permissions existing
      WHERE existing.option_id = 'architect'
        AND existing.tab_id = 'architect-schedule'
    ),
    get_tab_sort_index('architect', 'architect-projects-overview')
  )
FROM public.sidebar_tab_permissions stp
WHERE stp.option_id = 'architect'
  AND stp.tab_id = 'architect-schedule'
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- Ensure all roles with architect option access receive architect-projects-overview tab access
INSERT INTO public.sidebar_tab_permissions (option_id, tab_id, role, sort_order)
SELECT
  'architect',
  'architect-projects-overview',
  sop.role,
  get_tab_sort_index('architect', 'architect-projects-overview')
FROM public.sidebar_option_permissions sop
WHERE sop.option_id = 'architect'
ON CONFLICT (option_id, tab_id, role) DO NOTHING;

-- Retire old tab IDs now replaced by the overview IDs
DELETE FROM public.sidebar_tab_permissions
WHERE (option_id = 'projects' AND tab_id = 'project-schedule')
   OR (option_id = 'architect' AND tab_id = 'architect-schedule');

-- Keep default ordering function in sync with new tab IDs
CREATE OR REPLACE FUNCTION get_tab_sort_index(option_id TEXT, tab_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    tab_orders JSONB := '{
        "my-workspace": ["architect-my-dashboard", "architect-tasks", "architect-timesheet"],
        "castormind-ai": ["overall-status", "analytics", "ai-insights", "architect-financial", "architect-proposals"],
        "projects": ["clients", "projects-all", "projects-overview", "projects-estimates", "procurement", "purchase-orders"],
        "office-admin": ["client-access", "contacts", "campaigns", "forms", "financial", "ledger", "budget-control", "payments", "reports", "team-task-management"],
        "templates": ["budget-templates", "materials-templates", "labor-templates", "phase-templates", "construction-activities", "project-wbs"],
        "architect": ["architect-dashboard", "architect-projects", "architect-projects-overview", "sales-pipeline", "calendar", "architect-meetings", "architect-clients", "architect-contacts", "architect-reports", "architect-portfolio", "architect-whatsapp"],
        "supervisor": ["supervisor-hub", "supervisor-deliveries", "supervisor-activity", "supervisor-issues", "supervisor-timelogs", "supervisor-inspections"],
        "client-portal": ["client-portal-dashboard", "client-portal-inss-planning", "client-portal-inss-strategy", "client-portal-schedule", "client-portal-tasks", "client-portal-meetings", "client-portal-communication", "client-portal-chat", "client-portal-payments", "client-portal-financial", "client-portal-photos", "client-portal-documents", "client-portal-switch"],
        "content-hub": ["news", "articles", "documents", "faq"],
        "content-hub-admin": ["content-hub-dashboard", "content-hub-list", "content-hub-create", "content-hub-approvals"]
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

-- Re-apply sort order for new tabs after function update
UPDATE public.sidebar_tab_permissions
SET sort_order = get_tab_sort_index(option_id, tab_id)
WHERE (option_id = 'projects' AND tab_id = 'projects-overview')
   OR (option_id = 'architect' AND tab_id = 'architect-projects-overview');

COMMIT;
