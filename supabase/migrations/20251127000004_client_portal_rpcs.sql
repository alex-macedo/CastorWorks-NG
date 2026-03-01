-- Migration: Create Client Portal RPC Functions
-- Description: Creates RPC functions for secure data fetching via client portal token
-- Author: AI Agent
-- Date: 2025-11-27

-- Helper function to validate token and get project_id
CREATE OR REPLACE FUNCTION validate_portal_token(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT project_id INTO v_project_id
  FROM client_portal_tokens
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Get Project Details
CREATE OR REPLACE FUNCTION get_portal_project_details(p_token TEXT)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  client_name TEXT,
  project_status TEXT
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    c.name as client_name,
    p.status
  FROM projects p
  LEFT JOIN clients c ON p.client_id = c.id
  WHERE p.id = v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Schedule Events
CREATE OR REPLACE FUNCTION get_portal_schedule(p_token TEXT)
RETURNS SETOF schedule_events AS $$
DECLARE
  v_project_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT * FROM schedule_events
  WHERE project_id = v_project_id
  ORDER BY event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Team Members
CREATE OR REPLACE FUNCTION get_portal_team(p_token TEXT)
RETURNS SETOF project_team_members AS $$
DECLARE
  v_project_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT * FROM project_team_members
  WHERE project_id = v_project_id
    AND is_visible_to_client = true
  ORDER BY sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Tasks
CREATE OR REPLACE FUNCTION get_portal_tasks(p_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assignee_name TEXT,
  assignee_avatar TEXT
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.completed_at,
    m.name as assignee_name,
    m.avatar_url as assignee_avatar
  FROM client_tasks t
  LEFT JOIN project_team_members m ON t.assigned_to = m.id
  WHERE t.project_id = v_project_id
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get Meetings
CREATE OR REPLACE FUNCTION get_portal_meetings(p_token TEXT)
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
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

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

-- 6. Get Communication Logs
CREATE OR REPLACE FUNCTION get_portal_communication(p_token TEXT)
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
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

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

-- 7. Get Chat Conversations
CREATE OR REPLACE FUNCTION get_portal_conversations(p_token TEXT)
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
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.updated_at,
    (
      SELECT row_to_json(m.*) 
      FROM chat_messages m 
      WHERE m.conversation_id = c.id 
      ORDER BY created_at DESC LIMIT 1
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

-- 8. Get Chat Messages
CREATE OR REPLACE FUNCTION get_portal_messages(p_token TEXT, p_conversation_id UUID)
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
  v_conv_project_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RETURN; END IF;

  -- Verify conversation belongs to project
  SELECT project_id INTO v_conv_project_id FROM chat_conversations WHERE id = p_conversation_id;
  IF v_conv_project_id != v_project_id THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.text,
    m.created_at,
    m.sender_id,
    -- In real app, join with profiles/users table
    'User'::text as sender_name, 
    COALESCE(
      (SELECT json_agg(a.*) FROM message_attachments a WHERE a.message_id = m.id),
      '[]'::json
    ) as attachments
  FROM chat_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Send Message
CREATE OR REPLACE FUNCTION send_portal_message(p_token TEXT, p_conversation_id UUID, p_text TEXT)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_conv_project_id UUID;
  v_message_id UUID;
BEGIN
  v_project_id := validate_portal_token(p_token);
  IF v_project_id IS NULL THEN RAISE EXCEPTION 'Invalid token'; END IF;

  -- Verify conversation belongs to project
  SELECT project_id INTO v_conv_project_id FROM chat_conversations WHERE id = p_conversation_id;
  IF v_conv_project_id != v_project_id THEN RAISE EXCEPTION 'Invalid conversation'; END IF;

  -- Insert message (sender_id is NULL for client portal user for now, or we could use a special ID)
  INSERT INTO chat_messages (conversation_id, text, sender_id)
  VALUES (p_conversation_id, p_text, NULL)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
