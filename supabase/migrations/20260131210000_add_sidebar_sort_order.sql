-- Migration: Add Sort Order to Sidebar Permissions
-- Created: 2026-01-31
-- Description: Adds sort_order columns to sidebar permission tables to enable drag-and-drop sorting functionality.

BEGIN;

-- 1. Add sort_order column to sidebar_option_permissions
ALTER TABLE public.sidebar_option_permissions 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 2. Add sort_order column to sidebar_tab_permissions  
ALTER TABLE public.sidebar_tab_permissions 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 3. Create indexes for sorting performance
CREATE INDEX IF NOT EXISTS idx_sidebar_option_permissions_sort ON public.sidebar_option_permissions(option_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sidebar_tab_permissions_sort ON public.sidebar_tab_permissions(option_id, tab_id, sort_order);

-- 4. Populate initial sort_order values based on SIDEBAR_OPTIONS array order
-- This preserves the current order as the default sort order

-- Function to get option index from SIDEBAR_OPTIONS order
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
        'office-admin',
        'templates',
        'architect',
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
            RETURN idx - 1; -- 0-based index
        END IF;
    END LOOP;
    RETURN 999; -- Default for unknown options
END;
$$;

-- Function to get tab sort index within an option
CREATE OR REPLACE FUNCTION get_tab_sort_index(option_id TEXT, tab_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    tab_orders JSONB := '{
        "my-workspace": ["architect-my-dashboard", "architect-tasks", "architect-timesheet"],
        "castormind-ai": ["overall-status", "analytics", "ai-insights", "architect-financial", "architect-proposals"],
        "projects": ["clients", "projects-all", "project-schedule", "projects-estimates", "procurement", "purchase-orders"],
        "office-admin": ["client-access", "contacts", "campaigns", "forms", "financial", "ledger", "budget-control", "payments", "reports", "team-task-management"],
        "templates": ["budget-templates", "materials-templates", "labor-templates", "phase-templates", "construction-activities", "project-wbs"],
        "architect": ["architect-dashboard", "architect-projects", "architect-schedule", "sales-pipeline", "calendar", "architect-meetings", "architect-clients", "architect-contacts", "architect-reports", "architect-portfolio", "architect-whatsapp"],
        "supervisor": ["supervisor-hub", "supervisor-deliveries", "supervisor-activity", "supervisor-issues", "supervisor-timelogs", "supervisor-inspections"],
        "client-portal": ["client-portal-dashboard", "client-portal-inss-planning", "client-portal-inss-strategy", "client-portal-schedule", "client-portal-tasks", "client-portal-meetings", "client-portal-communication", "client-portal-chat", "client-portal-payments", "client-portal-financial", "client-portal-photos", "client-portal-documents", "client-portal-switch"],
        "content-hub": ["news", "articles", "documents", "faq"],
        "content-hub-admin": ["content-hub-dashboard", "content-hub-list", "content-hub-create", "content-hub-approvals"]
    }'::jsonb;
    tab_array TEXT[];
    idx INTEGER;
    tab_json_array JSONB;
BEGIN
    -- Get the tab order JSON array for this option
    tab_json_array := COALESCE(tab_orders->option_id, '[]'::jsonb);
    
    -- If no tabs defined for this option, return default
    IF jsonb_array_length(tab_json_array) = 0 THEN
        RETURN 999;
    END IF;
    
    -- Find the tab index in the JSON array
    idx := 0;
    FOR idx IN 0..jsonb_array_length(tab_json_array)-1 LOOP
        IF jsonb_array_element_text(tab_json_array, idx) = tab_id THEN
            RETURN idx;
        END IF;
    END LOOP;
    
    RETURN 999; -- Default for unknown tabs
END;
$$;

-- 5. Update existing records with initial sort orders
UPDATE public.sidebar_option_permissions 
SET sort_order = get_option_sort_index(option_id)
WHERE sort_order = 0;

UPDATE public.sidebar_tab_permissions 
SET sort_order = get_tab_sort_index(option_id, tab_id)
WHERE sort_order = 0;

-- 6. Create helper functions for sorted retrieval

-- Get sorted sidebar options for a user
CREATE OR REPLACE FUNCTION get_sorted_sidebar_options(user_id UUID)
RETURNS TABLE (
    option_id TEXT,
    role app_role,
    sort_order INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT sop.option_id, sop.role, sop.sort_order
    FROM public.sidebar_option_permissions sop
    JOIN public.user_roles ur ON ur.role = sop.role
    WHERE ur.user_id = user_id
    ORDER BY sop.sort_order ASC, sop.option_id ASC;
$$;

-- Get sorted sidebar tabs for a user and option
CREATE OR REPLACE FUNCTION get_sorted_sidebar_tabs(user_id UUID, option_id_param TEXT)
RETURNS TABLE (
    option_id TEXT,
    tab_id TEXT,
    role app_role,
    sort_order INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT stp.option_id, stp.tab_id, stp.role, stp.sort_order
    FROM public.sidebar_tab_permissions stp
    JOIN public.user_roles ur ON ur.role = stp.role
    WHERE ur.user_id = user_id
      AND stp.option_id = option_id_param
    ORDER BY stp.sort_order ASC, stp.tab_id ASC;
$$;

-- 7. Update RLS policies to include sort_order
-- No changes needed - sort_order is not sensitive data

-- 8. Add comments
COMMENT ON COLUMN public.sidebar_option_permissions.sort_order IS 'Sort order for drag-and-drop arrangement of sidebar options. Lower numbers appear first.';
COMMENT ON COLUMN public.sidebar_tab_permissions.sort_order IS 'Sort order for drag-and-drop arrangement of tabs within sidebar options. Lower numbers appear first.';
COMMENT ON FUNCTION get_option_sort_index(TEXT) IS 'Helper function to get the default sort index for sidebar options based on the original SIDEBAR_OPTIONS array order.';
COMMENT ON FUNCTION get_tab_sort_index(TEXT, TEXT) IS 'Helper function to get the default sort index for tabs within an option based on the original SIDEBAR_OPTIONS array order.';
COMMENT ON FUNCTION get_sorted_sidebar_options(UUID) IS 'Returns sidebar options for a user sorted by their custom sort order.';
COMMENT ON FUNCTION get_sorted_sidebar_tabs(UUID, TEXT) IS 'Returns sidebar tabs for a user and option sorted by their custom sort order.';

-- 9. Create bulk update functions for drag-and-drop operations

-- Bulk update option sort orders
CREATE OR REPLACE FUNCTION bulk_update_option_sort_orders(updates JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE public.sidebar_option_permissions 
        SET sort_order = (update_record->>'sort_order')::INTEGER
        WHERE option_id = update_record->>'option_id';
    END LOOP;
END;
$$;

-- Bulk update tab sort orders
CREATE OR REPLACE FUNCTION bulk_update_tab_sort_orders(updates JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE public.sidebar_tab_permissions 
        SET sort_order = (update_record->>'sort_order')::INTEGER
        WHERE option_id = update_record->>'option_id'
          AND tab_id = update_record->>'tab_id';
    END LOOP;
END;
$$;

-- Reset sort orders to default values
CREATE OR REPLACE FUNCTION reset_sidebar_sort_orders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Reset option sort orders
    UPDATE public.sidebar_option_permissions 
    SET sort_order = get_option_sort_index(option_id);
    
    -- Reset tab sort orders
    UPDATE public.sidebar_tab_permissions 
    SET sort_order = get_tab_sort_index(option_id, tab_id);
END;
$$;

-- 10. Add comments for new functions
COMMENT ON FUNCTION bulk_update_option_sort_orders(JSONB) IS 'Bulk updates sort orders for multiple sidebar options in a single transaction. Used for drag-and-drop reordering.';
COMMENT ON FUNCTION bulk_update_tab_sort_orders(JSONB) IS 'Bulk updates sort orders for multiple sidebar tabs in a single transaction. Used for drag-and-drop reordering.';
COMMENT ON FUNCTION reset_sidebar_sort_orders() IS 'Resets all sidebar sort orders to their default values based on the original SIDEBAR_OPTIONS array order.';

-- 9. Clean up helper functions (optional - keep for future use)
-- These functions might be useful for reordering operations, so we'll keep them

COMMIT;
