-- ============================================================================
-- Ensure Architect Module RLS Policies Are Applied
-- Created: 2025-11-20
-- Description: This migration ensures all architect module tables have proper RLS policies
--              This is a safety migration to fix any missing RLS policies
-- ============================================================================

-- ============================================================================
-- 1. VERIFY has_project_access FUNCTION EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_project_access'
  ) THEN
    RAISE EXCEPTION 'has_project_access function not found. Please run migration 20251105034511_27f9f268-40ea-42ef-aa4e-eb759106a217.sql first.';
  END IF;
END $$;

-- ============================================================================
-- 2. ENSURE RLS IS ENABLED ON ALL ARCHITECT TABLES
-- ============================================================================

ALTER TABLE IF EXISTS architect_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_site_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS architect_client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. ENSURE CRITICAL RLS POLICIES EXIST FOR architect_tasks
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view tasks for accessible projects" ON architect_tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON architect_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON architect_tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON architect_tasks;

-- Create secure RLS policies for architect_tasks
CREATE POLICY "Users can view tasks for accessible projects"
  ON architect_tasks FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert tasks"
  ON architect_tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update tasks"
  ON architect_tasks FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete tasks"
  ON architect_tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_project_access(auth.uid(), project_id)
  );

-- ============================================================================
-- 4. VERIFY POLICIES WERE CREATED
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'architect_tasks';
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 RLS policies on architect_tasks, but found %', policy_count;
  ELSE
    RAISE NOTICE '✅ Successfully created % RLS policies on architect_tasks', policy_count;
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

