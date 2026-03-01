-- Migration: Add RPC function to clear log messages based on filters
-- Created: 2026-02-01
-- Purpose: Allow bulk deletion of logs with filter criteria

-- ============================================================================
-- Create RPC Function to Clear Logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_log_messages(
    p_level TEXT DEFAULT NULL,
    p_resolved BOOLEAN DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_component TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_user_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'global_admin')
    ) INTO v_user_is_admin;
    
    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Only admins can clear log messages';
    END IF;
    
    -- Delete logs based on filters
    WITH deleted AS (
        DELETE FROM public.log_messages
        WHERE (
            -- Level filter
            (p_level IS NULL OR level = p_level)
            AND
            -- Resolved filter
            (p_resolved IS NULL OR resolved = p_resolved)
            AND
            -- Date range filter
            (p_date_from IS NULL OR created_at >= p_date_from)
            AND
            (p_date_to IS NULL OR created_at <= p_date_to)
            AND
            -- Search filter (message content)
            (p_search IS NULL OR message ILIKE '%' || p_search || '%')
            AND
            -- Category filter
            (p_category IS NULL OR category = p_category)
            AND
            -- Component filter
            (p_component IS NULL OR component = p_component)
            AND
            -- Severity filter
            (p_severity IS NULL OR severity = p_severity)
            AND
            -- Project filter
            (p_project_id IS NULL OR project_id = p_project_id)
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM deleted;
    
    -- Log the deletion action itself (meta-logging)
    INSERT INTO public.log_messages (
        level,
        message,
        category,
        component,
        user_id,
        context
    ) VALUES (
        'info',
        format('Cleared %s log messages based on filters', v_count),
        'system',
        'LogManagement',
        auth.uid(),
        jsonb_build_object(
            'action', 'clear_logs',
            'deleted_count', v_count,
            'filters', jsonb_build_object(
                'level', p_level,
                'resolved', p_resolved,
                'date_from', p_date_from,
                'date_to', p_date_to,
                'search', p_search,
                'category', p_category,
                'component', p_component,
                'severity', p_severity,
                'project_id', p_project_id
            )
        )
    );
    
    RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.clear_log_messages IS 'Clears log messages based on filter criteria. Only admins can execute. Returns count of deleted records. Logs the deletion action for audit trail.';

-- ============================================================================
-- Create RPC Function to Clear ALL Logs (with extra safety)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_all_log_messages(
    p_confirm_phrase TEXT
)
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_user_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'global_admin')
    ) INTO v_user_is_admin;
    
    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Only admins can clear log messages';
    END IF;
    
    -- Safety check: require confirmation phrase
    IF p_confirm_phrase != 'DELETE ALL LOGS' THEN
        RAISE EXCEPTION 'Invalid confirmation phrase. To clear all logs, use confirmation phrase: DELETE ALL LOGS';
    END IF;
    
    -- Get count before deletion
    SELECT COUNT(*) INTO v_count FROM public.log_messages;
    
    -- Delete all logs
    DELETE FROM public.log_messages;
    
    -- Log the deletion action
    INSERT INTO public.log_messages (
        level,
        message,
        category,
        component,
        severity,
        user_id,
        context
    ) VALUES (
        'warning',
        format('ALL log messages cleared (%s records deleted)', v_count),
        'system',
        'LogManagement',
        'high',
        auth.uid(),
        jsonb_build_object(
            'action', 'clear_all_logs',
            'deleted_count', v_count,
            'confirmation_phrase_used', true
        )
    );
    
    RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.clear_all_log_messages IS 'Clears ALL log messages. Requires confirmation phrase "DELETE ALL LOGS". Only admins can execute. Returns count of deleted records.';
