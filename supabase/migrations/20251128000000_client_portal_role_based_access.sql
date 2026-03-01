-- =====================================================
-- CLIENT PORTAL: ROLE-BASED ACCESS MIGRATION
-- =====================================================
-- This migration updates the client portal to use role-based access
-- via project_team_members instead of token-based access.
--
-- Changes:
-- 1. Update RLS policies for all client portal tables
-- 2. Remove token-based checks
-- 3. Add role-based checks using project_team_members
--
-- Access is granted to users who:
-- - Are authenticated (auth.uid() is not null)
-- - Are members of the project team (project_team_members.user_id = auth.uid())
-- - Have an appropriate role (client, owner, project_manager, manager, admin)
-- =====================================================

-- =====================================================
-- PROJECT TEAM MEMBERS
-- =====================================================
-- Update RLS policies to use role-based access

DROP POLICY IF EXISTS "Clients can view team members via token" ON project_team_members;
DROP POLICY IF EXISTS "Team members can manage team directory" ON project_team_members;

-- Allow team members to view other team members of the same project
CREATE POLICY "Team members can view project team"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    is_visible_to_client = true
    AND project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

-- Allow project managers and admins to manage team directory
CREATE POLICY "Project managers can manage team directory"
  ON project_team_members FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- SCHEDULE EVENTS
-- =====================================================
-- Update RLS policies for schedule_events

DROP POLICY IF EXISTS "Clients can view schedule via token" ON schedule_events;
DROP POLICY IF EXISTS "Team can manage schedule" ON schedule_events;

-- Allow team members to view schedule events
CREATE POLICY "Team members can view schedule"
  ON schedule_events FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

-- Allow project managers to manage schedule
CREATE POLICY "Project managers can manage schedule"
  ON schedule_events FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- CLIENT MEETINGS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view meetings via token" ON client_meetings;
DROP POLICY IF EXISTS "Team can manage meetings" ON client_meetings;

CREATE POLICY "Team members can view meetings"
  ON client_meetings FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

CREATE POLICY "Project managers can manage meetings"
  ON client_meetings FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- MEETING ATTENDEES
-- =====================================================
DROP POLICY IF EXISTS "Clients can view attendees via token" ON meeting_attendees;
DROP POLICY IF EXISTS "Team can manage attendees" ON meeting_attendees;

CREATE POLICY "Team members can view meeting attendees"
  ON meeting_attendees FOR SELECT
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM client_meetings cm
      WHERE cm.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

CREATE POLICY "Project managers can manage meeting attendees"
  ON meeting_attendees FOR ALL
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM client_meetings cm
      WHERE cm.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

-- =====================================================
-- CLIENT TASKS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view tasks via token" ON client_tasks;
DROP POLICY IF EXISTS "Team can manage tasks" ON client_tasks;

CREATE POLICY "Team members can view tasks"
  ON client_tasks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

CREATE POLICY "Project managers can manage tasks"
  ON client_tasks FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- COMMUNICATION LOGS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view communication via token" ON communication_logs;
DROP POLICY IF EXISTS "Team can manage communication" ON communication_logs;

CREATE POLICY "Team members can view communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

CREATE POLICY "Project managers can manage communication logs"
  ON communication_logs FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- COMMUNICATION PARTICIPANTS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view participants via token" ON communication_participants;
DROP POLICY IF EXISTS "Team can manage participants" ON communication_participants;

CREATE POLICY "Team members can view communication participants"
  ON communication_participants FOR SELECT
  TO authenticated
  USING (
    communication_id IN (
      SELECT id FROM communication_logs cl
      WHERE cl.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

CREATE POLICY "Project managers can manage communication participants"
  ON communication_participants FOR ALL
  TO authenticated
  USING (
    communication_id IN (
      SELECT id FROM communication_logs cl
      WHERE cl.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

-- =====================================================
-- COMMUNICATION ATTACHMENTS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view attachments via token" ON communication_attachments;
DROP POLICY IF EXISTS "Team can manage attachments" ON communication_attachments;

CREATE POLICY "Team members can view communication attachments"
  ON communication_attachments FOR SELECT
  TO authenticated
  USING (
    communication_id IN (
      SELECT id FROM communication_logs cl
      WHERE cl.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

CREATE POLICY "Project managers can manage communication attachments"
  ON communication_attachments FOR ALL
  TO authenticated
  USING (
    communication_id IN (
      SELECT id FROM communication_logs cl
      WHERE cl.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

-- =====================================================
-- CHAT CONVERSATIONS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view conversations via token" ON chat_conversations;
DROP POLICY IF EXISTS "Team can manage conversations" ON chat_conversations;

CREATE POLICY "Team members can view chat conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
    )
  );

CREATE POLICY "Project managers can manage chat conversations"
  ON chat_conversations FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM project_team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'project_manager', 'manager', 'admin')
    )
  );

-- =====================================================
-- CONVERSATION PARTICIPANTS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view conversation participants via token" ON conversation_participants;
DROP POLICY IF EXISTS "Team can manage conversation participants" ON conversation_participants;

CREATE POLICY "Team members can view conversation participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations cc
      WHERE cc.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

CREATE POLICY "Project managers can manage conversation participants"
  ON conversation_participants FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations cc
      WHERE cc.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Clients can view messages via token" ON chat_messages;
DROP POLICY IF EXISTS "Team can manage messages" ON chat_messages;

CREATE POLICY "Team members can view chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations cc
      WHERE cc.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
  );

CREATE POLICY "Team members can send chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations cc
      WHERE cc.project_id IN (
        SELECT project_id
        FROM project_team_members
        WHERE user_id = auth.uid()
        AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
      )
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- =====================================================
-- MESSAGE ATTACHMENTS
-- =====================================================
DROP POLICY IF EXISTS "Clients can view message attachments via token" ON message_attachments;
DROP POLICY IF EXISTS "Team can manage message attachments" ON message_attachments;

CREATE POLICY "Team members can view message attachments"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM chat_messages cm
      WHERE cm.conversation_id IN (
        SELECT id FROM chat_conversations cc
        WHERE cc.project_id IN (
          SELECT project_id
          FROM project_team_members
          WHERE user_id = auth.uid()
          AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
        )
      )
    )
  );

CREATE POLICY "Team members can upload message attachments"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT id FROM chat_messages cm
      WHERE cm.conversation_id IN (
        SELECT id FROM chat_conversations cc
        WHERE cc.project_id IN (
          SELECT project_id
          FROM project_team_members
          WHERE user_id = auth.uid()
          AND role IN ('client', 'owner', 'project_manager', 'manager', 'admin')
        )
      )
    )
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Client portal now uses role-based access via project_team_members
-- Users must be authenticated and have an appropriate role to access portal data
