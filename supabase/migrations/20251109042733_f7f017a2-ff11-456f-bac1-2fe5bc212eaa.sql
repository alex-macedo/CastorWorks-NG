-- ============================================================================
-- COMPREHENSIVE RLS POLICY REMEDIATION
-- Fixes all permissive policies with proper access controls
-- ============================================================================

-- ============================================================================
-- ACTIVITY LOGS (Project-Scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can manage activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;

-- Users can view activity logs for projects they have access to
DROP POLICY IF EXISTS "Users can view activity logs for accessible projects" ON public.activity_logs;
CREATE POLICY "Users can view activity logs for accessible projects"
  ON public.activity_logs
  FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );

-- Users can insert activity logs for accessible projects
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (project_id IS NULL OR has_project_access(auth.uid(), project_id))
  );

-- Only admins can update/delete activity logs
DROP POLICY IF EXISTS "Admins can manage activity logs" ON public.activity_logs;
CREATE POLICY "Admins can manage activity logs"
  ON public.activity_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- CALENDAR EVENTS (Project-Scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Authenticated users can view calendar events" ON public.calendar_events;

-- Users can view calendar events for accessible projects
DROP POLICY IF EXISTS "Users can view calendar events for accessible projects" ON public.calendar_events;
CREATE POLICY "Users can view calendar events for accessible projects"
  ON public.calendar_events
  FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );

-- Users can manage calendar events for accessible projects
DROP POLICY IF EXISTS "Users can manage calendar events for accessible projects" ON public.calendar_events;
CREATE POLICY "Users can manage calendar events for accessible projects"
  ON public.calendar_events
  FOR ALL
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (project_id IS NULL OR has_project_access(auth.uid(), project_id))
  );

-- ============================================================================
-- GENERATED REPORTS (Project-Scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.generated_reports;

-- Users can view reports for accessible projects
DROP POLICY IF EXISTS "Users can view reports for accessible projects" ON public.generated_reports;
CREATE POLICY "Users can view reports for accessible projects"
  ON public.generated_reports
  FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );

-- Users can create reports for accessible projects
DROP POLICY IF EXISTS "Users can create reports for accessible projects" ON public.generated_reports;
CREATE POLICY "Users can create reports for accessible projects"
  ON public.generated_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (project_id IS NULL OR has_project_access(auth.uid(), project_id))
  );

-- Users can update/delete their own reports or reports for accessible projects
DROP POLICY IF EXISTS "Users can manage their reports" ON public.generated_reports;
CREATE POLICY "Users can manage their reports"
  ON public.generated_reports
  FOR ALL
  USING (
    generated_by = auth.uid()::text OR
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    generated_by = auth.uid()::text OR
    public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- EMAIL NOTIFICATIONS (Admin View, All Can Create)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.email_notifications;

-- Only admins can view email notifications
DROP POLICY IF EXISTS "Admins can view email notifications" ON public.email_notifications;
CREATE POLICY "Admins can view email notifications"
  ON public.email_notifications
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'project_manager')
  );

-- Authenticated users can create notifications
DROP POLICY IF EXISTS "Users can create email notifications" ON public.email_notifications;
CREATE POLICY "Users can create email notifications"
  ON public.email_notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update notifications
DROP POLICY IF EXISTS "Admins can update email notifications" ON public.email_notifications;
CREATE POLICY "Admins can update email notifications"
  ON public.email_notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- ACTIVITY TEMPLATES (Public Reference Data)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert activity templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Anyone can view activity templates" ON public.activity_templates;

-- All authenticated users can view templates
DROP POLICY IF EXISTS "Authenticated users can view activity templates" ON public.activity_templates;
CREATE POLICY "Authenticated users can view activity templates"
  ON public.activity_templates
  FOR SELECT
  USING (is_system = false OR public.has_role(auth.uid(), 'admin'));

-- Only admins can insert system templates, users can insert custom templates
DROP POLICY IF EXISTS "Users can insert custom activity templates" ON public.activity_templates;
CREATE POLICY "Users can insert custom activity templates"
  ON public.activity_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (is_system = false OR public.has_role(auth.uid(), 'admin'))
  );

-- ============================================================================
-- PHASE TEMPLATES (Public Reference Data)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert phase templates" ON public.phase_templates;
DROP POLICY IF EXISTS "Anyone can view phase templates" ON public.phase_templates;

-- All authenticated users can view templates
DROP POLICY IF EXISTS "Authenticated users can view phase templates" ON public.phase_templates;
CREATE POLICY "Authenticated users can view phase templates"
  ON public.phase_templates
  FOR SELECT
  USING (is_system = false OR public.has_role(auth.uid(), 'admin'));

-- Only admins can insert system templates, users can insert custom templates
DROP POLICY IF EXISTS "Users can insert custom phase templates" ON public.phase_templates;
CREATE POLICY "Users can insert custom phase templates"
  ON public.phase_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (is_system = false OR public.has_role(auth.uid(), 'admin'))
  );

-- ============================================================================
-- DOCUMENT TEMPLATES (Public Reference Data)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view document templates" ON public.document_templates;

-- All authenticated users can view templates
DROP POLICY IF EXISTS "Authenticated users can view document templates" ON public.document_templates;
CREATE POLICY "Authenticated users can view document templates"
  ON public.document_templates
  FOR SELECT
  USING (is_system = false OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- CONFIG CATEGORIES (Public Reference - Read Only)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read config categories" ON public.config_categories;

-- All authenticated users can view config categories
DROP POLICY IF EXISTS "Authenticated users can view config categories" ON public.config_categories;
CREATE POLICY "Authenticated users can view config categories"
  ON public.config_categories
  FOR SELECT
  USING (is_system = false OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- CONFIG TRANSLATIONS (Public Reference - Read Only)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read config translations" ON public.config_translations;

-- All authenticated users can view config translations
DROP POLICY IF EXISTS "Authenticated users can view config translations" ON public.config_translations;
CREATE POLICY "Authenticated users can view config translations"
  ON public.config_translations
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND language_code IS NOT NULL);

-- ============================================================================
-- PROJECT COMMENTS (Project-Scoped with Better Security)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON public.project_comments;

-- Users can view comments for projects they have access to
DROP POLICY IF EXISTS "Users can view comments for accessible projects" ON public.project_comments;
CREATE POLICY "Users can view comments for accessible projects"
  ON public.project_comments
  FOR SELECT
  USING (
    is_deleted = false AND
    has_project_access(auth.uid(), project_id)
  );

-- ============================================================================
-- ADDITIONAL SECURITY: Enable RLS on tables if not already enabled
-- ============================================================================

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view activity logs for accessible projects" ON public.activity_logs IS 
  'Users can only view activity logs for projects they have access to or system-wide logs';

COMMENT ON POLICY "Users can view calendar events for accessible projects" ON public.calendar_events IS 
  'Users can only view calendar events for projects they have access to';

COMMENT ON POLICY "Users can view reports for accessible projects" ON public.generated_reports IS 
  'Users can only view reports for projects they have access to';

COMMENT ON POLICY "Admins can view email notifications" ON public.email_notifications IS 
  'Only admins and project managers can view email notification logs';

COMMENT ON POLICY "Users can view comments for accessible projects" ON public.project_comments IS 
  'Users can only view non-deleted comments for projects they have access to';
