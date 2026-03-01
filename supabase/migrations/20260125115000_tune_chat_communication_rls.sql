BEGIN;

-- Chat + Communication policies

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='chat_conversations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_conversations', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_conversations_select
  ON public.chat_conversations
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY chat_conversations_insert
  ON public.chat_conversations
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY chat_conversations_update
  ON public.chat_conversations
  FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));
CREATE POLICY chat_conversations_delete
  ON public.chat_conversations
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_messages_select
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations cc
      WHERE cc.id = chat_messages.conversation_id
        AND has_project_access(auth.uid(), cc.project_id)
    )
  );
CREATE POLICY chat_messages_insert
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM chat_conversations cc
      WHERE cc.id = chat_messages.conversation_id
        AND has_project_access(auth.uid(), cc.project_id)
    )
  );
CREATE POLICY chat_messages_update
  ON public.chat_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY chat_messages_delete
  ON public.chat_messages
  FOR DELETE
  USING (sender_id = auth.uid() OR has_role(auth.uid(), 'admin'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='conversation_participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_participants_select
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations cc
      WHERE cc.id = conversation_participants.conversation_id
        AND has_project_access(auth.uid(), cc.project_id)
    )
  );
CREATE POLICY conversation_participants_insert
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chat_conversations cc
      WHERE cc.id = conversation_participants.conversation_id
        AND has_project_admin_access(auth.uid(), cc.project_id)
    )
  );
CREATE POLICY conversation_participants_delete
  ON public.conversation_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations cc
      WHERE cc.id = conversation_participants.conversation_id
        AND has_project_admin_access(auth.uid(), cc.project_id)
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='communication_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.communication_logs', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY communication_logs_select
  ON public.communication_logs
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY communication_logs_insert
  ON public.communication_logs
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY communication_logs_update
  ON public.communication_logs
  FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));
CREATE POLICY communication_logs_delete
  ON public.communication_logs
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='communication_attachments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.communication_attachments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.communication_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY communication_attachments_select
  ON public.communication_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_attachments.communication_id
        AND has_project_access(auth.uid(), cl.project_id)
    )
  );
CREATE POLICY communication_attachments_insert
  ON public.communication_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_attachments.communication_id
        AND has_project_access(auth.uid(), cl.project_id)
    )
  );
CREATE POLICY communication_attachments_update
  ON public.communication_attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_attachments.communication_id
        AND has_project_admin_access(auth.uid(), cl.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_attachments.communication_id
        AND has_project_admin_access(auth.uid(), cl.project_id)
    )
  );
CREATE POLICY communication_attachments_delete
  ON public.communication_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_attachments.communication_id
        AND has_project_admin_access(auth.uid(), cl.project_id)
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='communication_participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.communication_participants', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.communication_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY communication_participants_select
  ON public.communication_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_participants.communication_id
        AND has_project_access(auth.uid(), cl.project_id)
    )
  );
CREATE POLICY communication_participants_insert
  ON public.communication_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_participants.communication_id
        AND has_project_admin_access(auth.uid(), cl.project_id)
    )
  );
CREATE POLICY communication_participants_delete
  ON public.communication_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM communication_logs cl
      WHERE cl.id = communication_participants.communication_id
        AND has_project_admin_access(auth.uid(), cl.project_id)
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='client_meetings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_meetings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.client_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_meetings_select
  ON public.client_meetings
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY client_meetings_insert
  ON public.client_meetings
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY client_meetings_update
  ON public.client_meetings
  FOR UPDATE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));
CREATE POLICY client_meetings_delete
  ON public.client_meetings
  FOR DELETE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='meeting_attendees' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.meeting_attendees', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_attendees_select
  ON public.meeting_attendees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM client_meetings cm
      WHERE cm.id = meeting_attendees.meeting_id
        AND has_project_access(auth.uid(), cm.project_id)
    )
  );
CREATE POLICY meeting_attendees_insert
  ON public.meeting_attendees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM client_meetings cm
      WHERE cm.id = meeting_attendees.meeting_id
        AND has_project_admin_access(auth.uid(), cm.project_id)
    )
  );
CREATE POLICY meeting_attendees_delete
  ON public.meeting_attendees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM client_meetings cm
      WHERE cm.id = meeting_attendees.meeting_id
        AND has_project_admin_access(auth.uid(), cm.project_id)
    )
  );

COMMIT;
