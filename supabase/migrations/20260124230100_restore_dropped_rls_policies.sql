-- ============================================================================
-- Restore RLS Policies Dropped During Function Migration
-- Migration: 20260124230100
-- Description: 
-- Restores the 11 RLS policies that were dropped when user_has_project_access
-- function was recreated with CASCADE. These policies depend on the function
-- and need to be recreated to maintain proper access control.
-- ============================================================================

BEGIN;

-- ============================================================================
-- RESTORE PROJECT TEAM MEMBERS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view project team" ON project_team_members;
CREATE POLICY "Team members and clients can view project team"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    is_visible_to_client = true
    AND public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE SCHEDULE EVENTS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view schedule" ON schedule_events;
CREATE POLICY "Team members and clients can view schedule"
  ON schedule_events FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE CLIENT MEETINGS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view meetings" ON client_meetings;
CREATE POLICY "Team members and clients can view meetings"
  ON client_meetings FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE MEETING ATTENDEES POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view meeting attendees" ON meeting_attendees;
CREATE POLICY "Team members and clients can view meeting attendees"
  ON meeting_attendees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_meetings cm
      WHERE cm.id = meeting_id 
      AND public.user_has_project_access(cm.project_id, auth.uid())
    )
  );

-- ============================================================================
-- RESTORE CLIENT TASKS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view tasks" ON client_tasks;
CREATE POLICY "Team members and clients can view tasks"
  ON client_tasks FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE COMMUNICATION LOGS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view communication logs" ON communication_logs;
CREATE POLICY "Team members and clients can view communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE CHAT CONVERSATIONS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view chat conversations" ON chat_conversations;
CREATE POLICY "Team members and clients can view chat conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE CHAT MESSAGES POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view chat messages" ON chat_messages;
CREATE POLICY "Team members and clients can view chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      WHERE cc.id = conversation_id
      AND public.user_has_project_access(cc.project_id, auth.uid())
    )
  );

-- ============================================================================
-- RESTORE MESSAGE ATTACHMENTS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view message attachments" ON message_attachments;
CREATE POLICY "Team members and clients can view message attachments"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      WHERE cm.id = message_id
      AND public.user_has_project_access(cc.project_id, auth.uid())
    )
  );

-- ============================================================================
-- RESTORE INVOICES POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Project members and clients can view invoices" ON invoices;
CREATE POLICY "Project members and clients can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- ============================================================================
-- RESTORE PROJECT DOCUMENTS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view project documents" ON project_documents;
CREATE POLICY "Team members and clients can view project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
    AND is_deleted = false
  );

COMMIT;
