-- Migration: Create Client Portal Chat Tables
-- Description: Creates tables for in-app chat functionality with real-time messaging
-- Author: AI Agent
-- Date: 2025-11-27

-- =====================================================
-- DROP EXISTING OBJECTS (for idempotency)
-- =====================================================
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;

DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

DROP FUNCTION IF EXISTS mark_messages_as_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_new_message() CASCADE;

-- =====================================================
-- CHAT CONVERSATIONS
-- =====================================================
-- Table for chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_chat_conversations_project_id ON chat_conversations(project_id);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view conversations via token
DROP POLICY IF EXISTS "Clients can view conversations via token" ON chat_conversations;
CREATE POLICY "Clients can view conversations via token"
  ON chat_conversations FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

-- RLS Policy: Team members can manage conversations
DROP POLICY IF EXISTS "Team members can manage conversations" ON chat_conversations;
CREATE POLICY "Team members can manage conversations"
  ON chat_conversations FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- CONVERSATION PARTICIPANTS
-- =====================================================
-- Table for conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_client BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Create indexes
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Enable RLS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Participants can view their own participation
DROP POLICY IF EXISTS "Participants can view their participation" ON conversation_participants;
CREATE POLICY "Participants can view their participation"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE project_id IN (
        SELECT project_id FROM client_portal_tokens 
        WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
      )
    )
  );

-- RLS Policy: Team members can manage participants
DROP POLICY IF EXISTS "Team members can manage participants" ON conversation_participants;
CREATE POLICY "Team members can manage participants"
  ON conversation_participants FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
-- Table for chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Conversation participants can view messages
DROP POLICY IF EXISTS "Conversation participants can view messages" ON chat_messages;
CREATE POLICY "Conversation participants can view messages"
  ON chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    OR conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE project_id IN (
        SELECT project_id FROM client_portal_tokens 
        WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
      )
    )
  );

-- RLS Policy: Participants can send messages
DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;
CREATE POLICY "Participants can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Senders can update their own messages
DROP POLICY IF EXISTS "Senders can update their messages" ON chat_messages;
CREATE POLICY "Senders can update their messages"
  ON chat_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- RLS Policy: Senders can delete their own messages
DROP POLICY IF EXISTS "Senders can delete their messages" ON chat_messages;
CREATE POLICY "Senders can delete their messages"
  ON chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- =====================================================
-- MESSAGE ATTACHMENTS
-- =====================================================
-- Table for message attachments
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- Enable RLS
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Attachments visible if message is visible
DROP POLICY IF EXISTS "Attachments visible if message is visible" ON message_attachments;
CREATE POLICY "Attachments visible if message is visible"
  ON message_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
      )
    )
    OR message_id IN (
      SELECT id FROM chat_messages
      WHERE conversation_id IN (
        SELECT id FROM chat_conversations
        WHERE project_id IN (
          SELECT project_id FROM client_portal_tokens 
          WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
          AND (expires_at IS NULL OR expires_at > NOW())
          AND is_active = true
        )
      )
    )
  );

-- RLS Policy: Message senders can add attachments
DROP POLICY IF EXISTS "Message senders can add attachments" ON message_attachments;
CREATE POLICY "Message senders can add attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE sender_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================
-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_last_read TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get last read timestamp for user in conversation
  SELECT last_read_at INTO v_last_read
  FROM conversation_participants
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;

  -- Count messages after last read
  SELECT COUNT(*) INTO v_count
  FROM chat_messages
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND (v_last_read IS NULL OR created_at > v_last_read);

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation updated_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_new_message();

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================
-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE chat_conversations IS 'Chat conversations for client portal';
COMMENT ON TABLE conversation_participants IS 'Participants in chat conversations';
COMMENT ON TABLE chat_messages IS 'Messages in chat conversations with real-time support';
COMMENT ON TABLE message_attachments IS 'File attachments for chat messages';
COMMENT ON FUNCTION get_unread_message_count IS 'Returns unread message count for a user in a conversation';
COMMENT ON FUNCTION mark_messages_as_read IS 'Marks all messages in a conversation as read for current user';
