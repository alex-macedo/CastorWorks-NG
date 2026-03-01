-- Migration: Add Admin Policy for Chat Messages
-- Description: Allows admin users to insert chat messages during seeding and management operations
-- Author: Claude Code
-- Date: 2025-11-28

-- =====================================================
-- CHAT MESSAGES - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any message (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any message" ON chat_messages;
CREATE POLICY "Admins can insert any message"
  ON chat_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- CONVERSATION PARTICIPANTS - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any participant (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any participant" ON conversation_participants;
CREATE POLICY "Admins can insert any participant"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- CHAT CONVERSATIONS - ADMIN POLICY (already covered)
-- =====================================================
-- Note: Chat conversations already has "Team members can manage conversations" policy
-- which covers INSERT/UPDATE/DELETE for team members. Admins are typically team members,
-- so no additional policy needed here.

-- =====================================================
-- MESSAGE ATTACHMENTS - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any attachment (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any attachment" ON message_attachments;
CREATE POLICY "Admins can insert any attachment"
  ON message_attachments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Admins can insert any message" ON chat_messages
  IS 'Allows admin users to insert chat messages for any sender during seeding and management operations';

COMMENT ON POLICY "Admins can insert any participant" ON conversation_participants
  IS 'Allows admin users to add participants to conversations during seeding and management operations';

COMMENT ON POLICY "Admins can insert any attachment" ON message_attachments
  IS 'Allows admin users to add attachments to messages during seeding and management operations';
