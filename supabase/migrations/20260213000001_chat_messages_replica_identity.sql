-- Migration: Set REPLICA IDENTITY FULL for chat_messages
-- Required for Supabase Realtime postgres_changes filter on conversation_id to work reliably.
-- Without this, filtered subscriptions may not receive INSERT events for non-PK columns.
-- See: https://supabase.com/docs/guides/realtime/postgres-changes

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
