-- ============================================================================
-- Fix Client Portal Access and Configurable Statuses
-- Created: 2025-12-30
-- Description: 
-- 1. Adds configurable status support to client_tasks
-- 2. Fixes RLS policies to include client_project_access
-- 3. Refactors client portal RPCs to use auth.uid() and remove token dependency
-- ============================================================================

-- ============================================================================
-- 1. ADD STATUS_ID TO CLIENT_TASKS
-- ============================================================================

-- Add new status_id column
ALTER TABLE client_tasks 
  ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES project_task_statuses(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_tasks_status_id 
  ON client_tasks(status_id);

-- Backfill status_id from existing status strings
DO $$
DECLARE
  task_record RECORD;
  status_id_value UUID;
BEGIN
  FOR task_record IN 
    SELECT id, project_id, status 
    FROM client_tasks 
    WHERE status_id IS NULL 
  LOOP
    -- Map 'pending' to 'not_started' slug for consistency with project_task_statuses
    DECLARE
      v_slug TEXT;
    BEGIN
      v_slug := CASE 
        WHEN task_record.status = 'pending' THEN 'not_started'
        WHEN task_record.status = 'in-progress' THEN 'in_progress'
        ELSE task_record.status
      END;

      -- Find matching status by slug
      SELECT pts.id INTO status_id_value
      FROM project_task_statuses pts
      WHERE pts.project_id = task_record.project_id
        AND pts.slug = v_slug
      LIMIT 1;
      
      -- If not found, try exact slug
      IF status_id_value IS NULL THEN
        SELECT pts.id INTO status_id_value
        FROM project_task_statuses pts
        WHERE pts.project_id = task_record.project_id
          AND pts.slug = task_record.status
        LIMIT 1;
      END IF;

      -- If still not found, use default status
      IF status_id_value IS NULL THEN
        SELECT pts.id INTO status_id_value
        FROM project_task_statuses pts
        WHERE pts.project_id = task_record.project_id
          AND pts.is_default = true
        LIMIT 1;
      END IF;

      -- If found, update the task
      IF status_id_value IS NOT NULL THEN
        UPDATE client_tasks
        SET status_id = status_id_value
        WHERE id = task_record.id;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Drop the old status CHECK constraint
ALTER TABLE client_tasks 
  DROP CONSTRAINT IF EXISTS client_tasks_status_check;

-- Add comment to status column indicating it's deprecated
COMMENT ON COLUMN client_tasks.status IS 
  'DEPRECATED: Use status_id instead. Kept for backward compatibility during migration.';

-- ============================================================================
-- 2. FIX RLS POLICIES FOR CLIENT PORTAL TABLES
-- ============================================================================

-- Helper function to check if user has access to project (client or team member)
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Admin users
    public.has_role(p_user_id, 'admin'::app_role)
    OR
    -- Explicit client access
    EXISTS (
      SELECT 1 FROM public.client_project_access 
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    -- Team member access
    EXISTS (
      SELECT 1 FROM public.project_team_members 
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Project Team Members RLS
DROP POLICY IF EXISTS "Team members can view project team" ON project_team_members;
CREATE POLICY "Team members and clients can view project team"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    is_visible_to_client = true
    AND public.user_has_project_access(project_id, auth.uid())
  );

-- Update Schedule Events RLS
DROP POLICY IF EXISTS "Team members can view schedule" ON schedule_events;
CREATE POLICY "Team members and clients can view schedule"
  ON schedule_events FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Client Meetings RLS
DROP POLICY IF EXISTS "Team members can view meetings" ON client_meetings;
CREATE POLICY "Team members and clients can view meetings"
  ON client_meetings FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Meeting Attendees RLS
DROP POLICY IF EXISTS "Team members can view meeting attendees" ON meeting_attendees;
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

-- Update Client Tasks RLS
DROP POLICY IF EXISTS "Team members can view tasks" ON client_tasks;
CREATE POLICY "Team members and clients can view tasks"
  ON client_tasks FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Communication Logs RLS
DROP POLICY IF EXISTS "Team members can view communication logs" ON communication_logs;
CREATE POLICY "Team members and clients can view communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Chat Conversations RLS
DROP POLICY IF EXISTS "Team members can view chat conversations" ON chat_conversations;
CREATE POLICY "Team members and clients can view chat conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Chat Messages RLS
DROP POLICY IF EXISTS "Team members can view chat messages" ON chat_messages;
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

-- Update Message Attachments RLS
DROP POLICY IF EXISTS "Team members can view message attachments" ON message_attachments;
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

-- Update Invoices RLS
DROP POLICY IF EXISTS "Project members can view invoices" ON invoices;
CREATE POLICY "Project members and clients can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
  );

-- Update Project Documents RLS
DROP POLICY IF EXISTS "Users can view project documents" ON project_documents;
CREATE POLICY "Team members and clients can view project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (
    public.user_has_project_access(project_id, auth.uid())
    AND is_deleted = false
  );

-- ============================================================================
-- 3. REFACTOR CLIENT PORTAL RPCS
-- ============================================================================

-- Refactor get_portal_project_details to use auth.uid() or p_token
CREATE OR REPLACE FUNCTION get_portal_project_details(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  client_name TEXT,
  project_status TEXT
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN 
    -- If no token/project_id provided, or user is authenticated but not authorized, keep returning if they have access
    -- But if they are authenticated, we should check if they have access to ANY project if no ID is provided? 
    -- Usually this is called with a specific ID.
    IF v_project_id IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    c.name as client_name,
    p.status::text
  FROM projects p
  LEFT JOIN clients c ON p.client_id = c.id
  WHERE p.id = v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refactor get_portal_tasks to use auth.uid() or p_token
CREATE OR REPLACE FUNCTION get_portal_tasks(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  status_id UUID,
  priority TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assignee_name TEXT,
  assignee_avatar TEXT,
  task_status JSON
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.status,
    t.status_id,
    t.priority,
    t.due_date,
    t.completed_at,
    m.user_name as assignee_name,
    m.avatar_url as assignee_avatar,
    (
      SELECT row_to_json(pts.*) 
      FROM project_task_statuses pts 
      WHERE pts.id = t.status_id
    ) as task_status
  FROM client_tasks t
  LEFT JOIN project_team_members m ON t.assigned_to = m.id
  WHERE t.project_id = v_project_id
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Similar refactoring for other RPCs if needed, though they mostly select * or specific columns
-- the RLS should now handle the security better than the manual token validation inside RPC.

-- Update get_portal_schedule
CREATE OR REPLACE FUNCTION get_portal_schedule(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS SETOF schedule_events AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT * FROM schedule_events
  WHERE project_id = v_project_id
  ORDER BY event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_portal_team
CREATE OR REPLACE FUNCTION get_portal_team(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS SETOF project_team_members AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT * FROM project_team_members
  WHERE project_id = v_project_id
    AND is_visible_to_client = true
  ORDER BY display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_portal_meetings
CREATE OR REPLACE FUNCTION get_portal_meetings(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  location TEXT,
  meeting_link TEXT,
  status TEXT,
  notes TEXT,
  attendees JSON
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.meeting_date,
    m.duration,
    m.location,
    m.meeting_link,
    m.status,
    m.notes,
    COALESCE(
      (SELECT json_agg(a.*) FROM meeting_attendees a WHERE a.meeting_id = m.id),
      '[]'::json
    ) as attendees
  FROM client_meetings m
  WHERE m.project_id = v_project_id
  ORDER BY m.meeting_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_portal_communication
CREATE OR REPLACE FUNCTION get_portal_communication(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  type TEXT,
  date_time TIMESTAMP WITH TIME ZONE,
  subject TEXT,
  description TEXT,
  participants JSON,
  attachments JSON
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.type,
    c.date_time,
    c.subject,
    c.description,
    COALESCE(
      (SELECT json_agg(p.*) FROM communication_participants p WHERE p.communication_id = c.id),
      '[]'::json
    ) as participants,
    COALESCE(
      (SELECT json_agg(a.*) FROM communication_attachments a WHERE a.communication_id = c.id),
      '[]'::json
    ) as attachments
  FROM communication_logs c
  WHERE c.project_id = v_project_id
  ORDER BY c.date_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_portal_conversations
CREATE OR REPLACE FUNCTION get_portal_conversations(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_message JSON,
  participants JSON
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.updated_at,
    (
      SELECT row_to_json(m.*) 
      FROM chat_messages m 
      WHERE m.conversation_id = c.id 
      ORDER BY m.created_at DESC LIMIT 1
    ) as last_message,
    COALESCE(
      (SELECT json_agg(p.*) FROM conversation_participants p WHERE p.conversation_id = c.id),
      '[]'::json
    ) as participants
  FROM chat_conversations c
  WHERE c.project_id = v_project_id
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_portal_messages
CREATE OR REPLACE FUNCTION get_portal_messages(p_token TEXT DEFAULT NULL, p_conversation_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_id UUID,
  sender_name TEXT,
  attachments JSON
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- We need to check if the conversation belongs to a project the user has access to
  -- OR validate via token
  IF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  -- If token didn't provide project_id, check conversation directly
  IF v_project_id IS NULL AND p_conversation_id IS NOT NULL THEN
    SELECT project_id INTO v_project_id FROM chat_conversations WHERE id = p_conversation_id;
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.text,
    m.created_at,
    m.sender_id,
    ptm.user_name as sender_name,
    COALESCE(
      (SELECT json_agg(a.*) FROM message_attachments a WHERE a.message_id = m.id),
      '[]'::json
    ) as attachments
  FROM chat_messages m
  LEFT JOIN project_team_members ptm ON m.sender_id = ptm.user_id AND ptm.project_id = v_project_id
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update send_portal_message
CREATE OR REPLACE FUNCTION send_portal_message(
  p_text TEXT,
  p_token TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_message_id UUID;
BEGIN
  IF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL AND p_conversation_id IS NOT NULL THEN
    SELECT project_id INTO v_project_id FROM chat_conversations WHERE id = p_conversation_id;
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN 
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO chat_messages (conversation_id, sender_id, text)
  VALUES (p_conversation_id, auth.uid(), p_text)
  RETURNING id INTO v_message_id;

  -- Update conversation's updated_at
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
