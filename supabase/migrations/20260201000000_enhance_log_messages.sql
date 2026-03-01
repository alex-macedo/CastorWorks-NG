-- Migration: Enhance log_messages table for comprehensive AI agent troubleshooting
-- Created: 2026-02-01
-- Purpose: Add categorization, context, and performance features to log_messages

-- ============================================================================
-- PHASE 1: Update Level Constraint (Add 'debug' level)
-- ============================================================================

-- First, temporarily allow any value to avoid constraint violations during migration
ALTER TABLE public.log_messages DROP CONSTRAINT IF EXISTS log_messages_level_check;

-- Update existing 'debug' logs that were mapped to 'info' (if any)
-- Note: In practice, debug logs were mapped to 'info', so no updates needed

-- Add new constraint with 'debug' level
ALTER TABLE public.log_messages ADD CONSTRAINT log_messages_level_check 
  CHECK (level IN ('debug', 'info', 'warning', 'error'));

-- ============================================================================
-- PHASE 2: Add Categorization Fields
-- ============================================================================

-- Category for grouping errors by system area
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS category TEXT;
COMMENT ON COLUMN public.log_messages.category IS 'Error category: database, api, auth, validation, business, system, ui, etc.';

-- Component/module where error originated
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS component TEXT;
COMMENT ON COLUMN public.log_messages.component IS 'Component or module name where the error originated (e.g., ProjectBudgets, useForms, AuthService)';

-- Structured error code for programmatic identification
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS error_code TEXT;
COMMENT ON COLUMN public.log_messages.error_code IS 'Structured error code (e.g., AUTH_001, DB_CONNECTION_FAILED, VALIDATION_REQUIRED_FIELD)';

-- Severity beyond log level (critical, high, medium, low)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS severity TEXT 
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));
COMMENT ON COLUMN public.log_messages.severity IS 'Business impact severity: low, medium, high, critical';

-- ============================================================================
-- PHASE 3: Add Error Details
-- ============================================================================

-- Stack trace for debugging (stored separately for easier querying)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS stack_trace TEXT;
COMMENT ON COLUMN public.log_messages.stack_trace IS 'Full stack trace for error debugging';

-- Error message details (if different from main message)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS error_details TEXT;
COMMENT ON COLUMN public.log_messages.error_details IS 'Detailed error message or additional error information';

-- ============================================================================
-- PHASE 4: Add Request Context
-- ============================================================================

-- Request URL where error occurred
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS request_url TEXT;
COMMENT ON COLUMN public.log_messages.request_url IS 'URL where the error occurred';

-- HTTP method
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS request_method TEXT;
COMMENT ON COLUMN public.log_messages.request_method IS 'HTTP method (GET, POST, PUT, DELETE, etc.)';

-- Session ID for tracking user sessions
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS session_id TEXT;
COMMENT ON COLUMN public.log_messages.session_id IS 'Session identifier for tracking user sessions across requests';

-- Request ID for correlation across services
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS request_id TEXT;
COMMENT ON COLUMN public.log_messages.request_id IS 'Unique request identifier for distributed tracing';

-- User agent (browser/client info)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS user_agent TEXT;
COMMENT ON COLUMN public.log_messages.user_agent IS 'Client user agent string for browser/environment identification';

-- ============================================================================
-- PHASE 5: Add Business Context
-- ============================================================================

-- Project ID for multi-tenant filtering
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.log_messages.project_id IS 'Associated project ID for multi-tenant error filtering';

-- Trace ID for distributed tracing
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS trace_id TEXT;
COMMENT ON COLUMN public.log_messages.trace_id IS 'Trace ID for correlating related logs across the system';

-- Parent log ID for linking related errors
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS parent_log_id UUID REFERENCES public.log_messages(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.log_messages.parent_log_id IS 'Reference to parent log entry for related/cascading errors';

-- ============================================================================
-- PHASE 6: Add Environment Metadata
-- ============================================================================

-- Environment (development, staging, production)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';
COMMENT ON COLUMN public.log_messages.environment IS 'Environment where error occurred: development, staging, production';

-- Application version
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS app_version TEXT;
COMMENT ON COLUMN public.log_messages.app_version IS 'Application version at time of error';

-- Client IP (hashed for privacy)
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS client_ip_hash TEXT;
COMMENT ON COLUMN public.log_messages.client_ip_hash IS 'Hashed client IP address for privacy-compliant rate limiting analysis';

-- ============================================================================
-- PHASE 7: Create Performance Indexes
-- ============================================================================

-- Time-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_log_messages_created_at 
  ON public.log_messages(created_at DESC);

-- Level filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_level 
  ON public.log_messages(level);

-- Resolution status filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_resolved 
  ON public.log_messages(resolved);

-- User attribution
CREATE INDEX IF NOT EXISTS idx_log_messages_user_id 
  ON public.log_messages(user_id);

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_category 
  ON public.log_messages(category);

-- Component filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_component 
  ON public.log_messages(component);

-- Severity filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_severity 
  ON public.log_messages(severity);

-- Error code lookup
CREATE INDEX IF NOT EXISTS idx_log_messages_error_code 
  ON public.log_messages(error_code);

-- Project filtering (critical for multi-tenant)
CREATE INDEX IF NOT EXISTS idx_log_messages_project_id 
  ON public.log_messages(project_id);

-- Trace ID for distributed tracing queries
CREATE INDEX IF NOT EXISTS idx_log_messages_trace_id 
  ON public.log_messages(trace_id);

-- Request ID correlation
CREATE INDEX IF NOT EXISTS idx_log_messages_request_id 
  ON public.log_messages(request_id);

-- Environment filtering
CREATE INDEX IF NOT EXISTS idx_log_messages_environment 
  ON public.log_messages(environment);

-- Composite index for common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_log_messages_resolved_created_at 
  ON public.log_messages(resolved, created_at DESC);

-- Composite index for level + time queries
CREATE INDEX IF NOT EXISTS idx_log_messages_level_created_at 
  ON public.log_messages(level, created_at DESC);

-- Composite index for category + component queries
CREATE INDEX IF NOT EXISTS idx_log_messages_category_component 
  ON public.log_messages(category, component);

-- GIN index for JSONB context search
CREATE INDEX IF NOT EXISTS idx_log_messages_context_gin 
  ON public.log_messages USING GIN(context jsonb_path_ops);

-- Full-text search on message (for searching error messages)
CREATE INDEX IF NOT EXISTS idx_log_messages_message_trgm 
  ON public.log_messages USING gin(message gin_trgm_ops);

-- ============================================================================
-- PHASE 8: Update RPC Function with New Fields
-- ============================================================================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS public.log_message(TEXT, TEXT, JSONB);

-- Create enhanced RPC function
CREATE OR REPLACE FUNCTION public.log_message(
    p_level TEXT,
    p_message TEXT,
    p_context JSONB DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_component TEXT DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_trace_id TEXT DEFAULT NULL,
    p_request_url TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL,
    p_stack_trace TEXT DEFAULT NULL,
    p_error_details TEXT DEFAULT NULL,
    p_environment TEXT DEFAULT NULL,
    p_app_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO public.log_messages (
        level,
        message,
        context,
        user_id,
        category,
        component,
        error_code,
        severity,
        project_id,
        trace_id,
        request_url,
        request_method,
        stack_trace,
        error_details,
        environment,
        app_version,
        session_id,
        request_id,
        user_agent
    ) VALUES (
        p_level,
        p_message,
        p_context,
        v_user_id,
        p_category,
        p_component,
        p_error_code,
        p_severity,
        p_project_id,
        p_trace_id,
        p_request_url,
        p_request_method,
        p_stack_trace,
        p_error_details,
        COALESCE(p_environment, 'production'),
        p_app_version,
        -- Extract from context if available
        p_context->>'session_id',
        p_context->>'request_id',
        p_context->>'user_agent'
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_message IS 'Enhanced logging function with categorization, context, and metadata support';

-- ============================================================================
-- PHASE 9: Create Data Retention Function
-- ============================================================================

-- Function to clean up old log messages based on retention policy
CREATE OR REPLACE FUNCTION public.cleanup_old_log_messages()
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debug_deleted INTEGER;
    v_info_deleted INTEGER;
    v_warning_deleted INTEGER;
    v_error_deleted INTEGER;
BEGIN
    -- Delete debug logs older than 30 days
    DELETE FROM public.log_messages 
    WHERE level = 'debug' 
      AND created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_debug_deleted = ROW_COUNT;
    
    -- Delete info logs older than 60 days
    DELETE FROM public.log_messages 
    WHERE level = 'info' 
      AND created_at < NOW() - INTERVAL '60 days';
    GET DIAGNOSTICS v_info_deleted = ROW_COUNT;
    
    -- Delete warning logs older than 180 days
    DELETE FROM public.log_messages 
    WHERE level = 'warning' 
      AND created_at < NOW() - INTERVAL '180 days';
    GET DIAGNOSTICS v_warning_deleted = ROW_COUNT;
    
    -- Delete resolved error logs older than 365 days
    -- Keep unresolved errors longer
    DELETE FROM public.log_messages 
    WHERE level = 'error' 
      AND resolved = true
      AND created_at < NOW() - INTERVAL '365 days';
    GET DIAGNOSTICS v_error_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT v_debug_deleted + v_info_deleted + v_warning_deleted + v_error_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_log_messages IS 'Cleans up old log messages based on retention policy. Returns count of deleted rows.';

-- ============================================================================
-- PHASE 10: Create Helper Views for AI Agent Analysis
-- ============================================================================

-- View: Recent errors for quick AI agent overview
CREATE OR REPLACE VIEW public.v_recent_errors AS
SELECT 
    id,
    created_at,
    level,
    category,
    component,
    error_code,
    severity,
    message,
    resolved,
    project_id,
    user_id,
    trace_id,
    environment
FROM public.log_messages
WHERE level IN ('error', 'warning')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

COMMENT ON VIEW public.v_recent_errors IS 'View of errors and warnings from last 24 hours for quick AI agent overview';

-- View: Error summary by category and component
CREATE OR REPLACE VIEW public.v_error_summary AS
SELECT 
    category,
    component,
    level,
    severity,
    COUNT(*) as error_count,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence,
    array_agg(DISTINCT error_code) as error_codes
FROM public.log_messages
WHERE level IN ('error', 'warning')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY category, component, level, severity
ORDER BY error_count DESC;

COMMENT ON VIEW public.v_error_summary IS 'Summary view of errors grouped by category and component for pattern analysis';

-- View: Unresolved critical errors
CREATE OR REPLACE VIEW public.v_critical_unresolved AS
SELECT 
    id,
    created_at,
    category,
    component,
    error_code,
    message,
    project_id,
    user_id,
    trace_id,
    context,
    stack_trace
FROM public.log_messages
WHERE level = 'error'
  AND severity IN ('high', 'critical')
  AND resolved = false
ORDER BY created_at DESC;

COMMENT ON VIEW public.v_critical_unresolved IS 'View of unresolved high/critical severity errors requiring immediate attention';

-- ============================================================================
-- PHASE 11: Create Statistics Function for AI Agent
-- ============================================================================

-- Function to get error statistics for AI analysis
CREATE OR REPLACE FUNCTION public.get_error_statistics(
    p_days INTEGER DEFAULT 7,
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_logs BIGINT,
    error_count BIGINT,
    warning_count BIGINT,
    info_count BIGINT,
    debug_count BIGINT,
    unresolved_errors BIGINT,
    critical_errors BIGINT,
    top_category TEXT,
    top_component TEXT,
    most_common_error TEXT,
    error_rate_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE level = 'error') as errors,
            COUNT(*) FILTER (WHERE level = 'warning') as warnings,
            COUNT(*) FILTER (WHERE level = 'info') as infos,
            COUNT(*) FILTER (WHERE level = 'debug') as debugs,
            COUNT(*) FILTER (WHERE level = 'error' AND resolved = false) as unresolved,
            COUNT(*) FILTER (WHERE level = 'error' AND severity IN ('high', 'critical')) as critical,
            mode() WITHIN GROUP (ORDER BY category) as top_cat,
            mode() WITHIN GROUP (ORDER BY component) as top_comp,
            mode() WITHIN GROUP (ORDER BY message) as common_err
        FROM public.log_messages
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
          AND (p_project_id IS NULL OR project_id = p_project_id)
    )
    SELECT 
        stats.total,
        stats.errors,
        stats.warnings,
        stats.infos,
        stats.debugs,
        stats.unresolved,
        stats.critical,
        stats.top_cat,
        stats.top_comp,
        stats.common_err,
        CASE 
            WHEN stats.total > 0 THEN 
                ROUND((stats.errors::NUMERIC / stats.total::NUMERIC) * 100, 2)
            ELSE 0
        END
    FROM stats;
END;
$$;

COMMENT ON FUNCTION public.get_error_statistics IS 'Returns error statistics for AI agent analysis and dashboard reporting';

-- ============================================================================
-- PHASE 12: Update RLS Policies for New Fields
-- ============================================================================

-- Ensure policies cover new fields appropriately
-- (Existing policies should still work as they filter on user roles, not columns)

-- Add policy for project-specific log viewing (for project members)
CREATE POLICY IF NOT EXISTS "Project members can view project logs"
ON public.log_messages
FOR SELECT
TO authenticated
USING (
  project_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = log_messages.project_id
    AND ptm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'global_admin')
  )
);

-- ============================================================================
-- PHASE 13: Create Trigger for Auto-Resolution Tracking
-- ============================================================================

-- Add column to track when log was resolved
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.log_messages ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- Function to track resolution
CREATE OR REPLACE FUNCTION public.track_log_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.resolved = true AND OLD.resolved = false THEN
        NEW.resolved_at := NOW();
        NEW.resolved_by := auth.uid();
    ELSIF NEW.resolved = false AND OLD.resolved = true THEN
        NEW.resolved_at := NULL;
        NEW.resolved_by := NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_track_log_resolution ON public.log_messages;
CREATE TRIGGER trg_track_log_resolution
    BEFORE UPDATE ON public.log_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.track_log_resolution();

-- ============================================================================
-- PHASE 14: Enable pg_trgm Extension for Text Search (if not already enabled)
-- ============================================================================

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Add comment to table
COMMENT ON TABLE public.log_messages IS 'Enhanced application logs with categorization, context, and metadata for comprehensive AI agent troubleshooting';
