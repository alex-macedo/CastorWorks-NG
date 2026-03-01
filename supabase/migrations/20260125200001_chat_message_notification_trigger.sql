-- Migration: Chat Message Notification Trigger
-- Description: Trigger to send notifications when new chat messages are received
-- Author: AI Agent
-- Date: 2026-01-25

BEGIN;

-- =====================================================
-- 1. HELPER FUNCTION TO GET SUPABASE SETTINGS
-- =====================================================

-- Store Supabase URL and service role key in app settings
-- These will be set via environment variables or manual update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_settings' 
    AND column_name = 'supabase_url'
  ) THEN
    ALTER TABLE public.app_settings ADD COLUMN supabase_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_settings' 
    AND column_name = 'service_role_key'
  ) THEN
    ALTER TABLE public.app_settings ADD COLUMN service_role_key TEXT;
  END IF;
END $$;

-- Function to get Supabase URL
CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
BEGIN
  SELECT supabase_url INTO v_url FROM app_settings LIMIT 1;
  RETURN COALESCE(v_url, current_setting('app.supabase_url', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get service role key
CREATE OR REPLACE FUNCTION get_service_role_key()
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT service_role_key INTO v_key FROM app_settings LIMIT 1;
  RETURN COALESCE(v_key, current_setting('app.service_role_key', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CHAT MESSAGE NOTIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get Supabase configuration
  v_supabase_url := get_supabase_url();
  v_service_key := get_service_role_key();
  
  -- Only proceed if we have the required configuration
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    -- Call Edge Function via pg_net (http extension)
    -- Note: pg_net.http_post is asynchronous
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/notify-chat-message',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'text', NEW.text,
        'created_at', NEW.created_at
      )
    ) INTO v_request_id;
    
    -- Log the request (optional, for debugging)
    RAISE LOG 'Chat notification triggered for message % (request_id: %)', NEW.id, v_request_id;
  ELSE
    RAISE WARNING 'Supabase URL or service key not configured for chat notifications';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RAISE WARNING 'Failed to trigger chat notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS on_new_chat_message ON public.chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_chat_message();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON FUNCTION notify_new_chat_message IS 'Trigger function to send notifications when new chat messages are received';
COMMENT ON FUNCTION get_supabase_url IS 'Get Supabase URL from app settings or environment';
COMMENT ON FUNCTION get_service_role_key IS 'Get service role key from app settings or environment';

COMMIT;
