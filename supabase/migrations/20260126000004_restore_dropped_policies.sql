-- ============================================================================
-- Restore policies that were dropped when fixing user_has_project_access
-- Migration: 20260126000004
-- Description: 
-- When we dropped and recreated user_has_project_access, some policies
-- that depend on it were cascaded. This migration restores them.
-- ============================================================================

BEGIN;

-- ============================================================================
-- RESTORE schedule_events POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view schedule" ON schedule_events;
CREATE POLICY "Team members and clients can view schedule"
  ON schedule_events FOR SELECT
  TO authenticated
  USING (public.user_has_project_access(project_id, auth.uid()));

-- ============================================================================
-- RESTORE message_attachments POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view message attachments" ON message_attachments;
CREATE POLICY "Team members and clients can view message attachments"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      WHERE cm.id = message_attachments.message_id
        AND public.user_has_project_access(cc.project_id, auth.uid())
    )
  );

-- ============================================================================
-- RESTORE invoices POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Project members and clients can view invoices" ON invoices;
CREATE POLICY "Project members and clients can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (public.user_has_project_access(project_id, auth.uid()));

-- ============================================================================
-- RESTORE project_documents POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Team members and clients can view project documents" ON project_documents;
CREATE POLICY "Team members and clients can view project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (public.user_has_project_access(project_id, auth.uid()));

COMMIT;
