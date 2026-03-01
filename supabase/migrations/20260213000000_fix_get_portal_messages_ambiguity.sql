-- Migration: Fix "column reference id is ambiguous" in get_portal_messages
-- The RETURNS TABLE (id, text, ...) creates output variables that shadow table columns.
-- Wrapping the query in a subquery with distinct aliases isolates it from the function's output scope.
-- See: https://dba.stackexchange.com/questions/268815/

BEGIN;

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
  IF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL AND p_conversation_id IS NOT NULL THEN
    SELECT project_id INTO v_project_id FROM chat_conversations WHERE chat_conversations.id = p_conversation_id;
  END IF;

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN RETURN; END IF;

  -- Use subquery with distinct aliases to avoid RETURNS TABLE column names shadowing table columns
  RETURN QUERY
  SELECT
    sub.msg_id,
    sub.msg_text,
    sub.msg_created_at,
    sub.msg_sender_id,
    sub.msg_sender_name,
    sub.msg_attachments
  FROM (
    SELECT
      m.id AS msg_id,
      m.text AS msg_text,
      m.created_at AS msg_created_at,
      m.sender_id AS msg_sender_id,
      ptm.user_name AS msg_sender_name,
      COALESCE(
        (SELECT json_agg(row_to_json(ma)) FROM message_attachments ma WHERE ma.message_id = m.id),
        '[]'::json
      ) AS msg_attachments
    FROM chat_messages m
    LEFT JOIN project_team_members ptm ON m.sender_id = ptm.user_id AND ptm.project_id = v_project_id
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.created_at ASC
  ) sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
