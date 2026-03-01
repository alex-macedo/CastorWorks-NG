-- Fix table ownership: Transfer tables from supabase_admin to postgres
-- Purpose: Correct tables that were created using the wrong user (supabase_admin)
--          and transfer ownership to the correct user (postgres)
--
-- Background: Another developer created tables using supabase_admin instead of postgres.
--             This migration fixes the ownership for all affected tables.

BEGIN;

-- Transfer ownership of all tables from supabase_admin to postgres
ALTER TABLE IF EXISTS public.ai_usage OWNER TO postgres;
ALTER TABLE IF EXISTS public.chat_conversations OWNER TO postgres;
ALTER TABLE IF EXISTS public.chat_messages OWNER TO postgres;
ALTER TABLE IF EXISTS public.client_meetings OWNER TO postgres;
ALTER TABLE IF EXISTS public.client_portal_tokens OWNER TO postgres;
ALTER TABLE IF EXISTS public.client_tasks OWNER TO postgres;
ALTER TABLE IF EXISTS public.communication_attachments OWNER TO postgres;
ALTER TABLE IF EXISTS public.communication_logs OWNER TO postgres;
ALTER TABLE IF EXISTS public.communication_participants OWNER TO postgres;
ALTER TABLE IF EXISTS public.conversation_participants OWNER TO postgres;
ALTER TABLE IF EXISTS public.invoice_conversations OWNER TO postgres;
ALTER TABLE IF EXISTS public.invoices OWNER TO postgres;
ALTER TABLE IF EXISTS public.meeting_attendees OWNER TO postgres;
ALTER TABLE IF EXISTS public.message_attachments OWNER TO postgres;
ALTER TABLE IF EXISTS public.payment_reminders OWNER TO postgres;
ALTER TABLE IF EXISTS public.project_team_members OWNER TO postgres;
ALTER TABLE IF EXISTS public.reminder_logs OWNER TO postgres;
ALTER TABLE IF EXISTS public.schedule_events OWNER TO postgres;

-- Also check and fix any sequences that might be owned by supabase_admin
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT schemaname, sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequenceowner = 'supabase_admin'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO postgres', 
                      seq_record.schemaname, 
                      seq_record.sequencename);
    END LOOP;
END$$;

COMMIT;
