-- Migration: update mediator_insert_assistant_message to match chat_messages schema
-- Generated: 2025-11-29

BEGIN;

-- Replace mediator_insert_assistant_message to insert into actual chat_messages columns
CREATE OR REPLACE FUNCTION public.mediator_insert_assistant_message(
  p_invoice_id uuid,
  p_conversation_id uuid,
  p_trigger text DEFAULT 'reminder-mediator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message text;
  v_prompt text;
  v_now timestamptz := now();
  v_ai_row jsonb;
BEGIN
  -- Compose prompt and message using the SQL template composer
  v_prompt := 'Auto-generated reminder for invoice ' || COALESCE(p_invoice_id::text,'(none)');
  v_message := public.compose_ai_reminder(p_invoice_id);

  IF p_conversation_id IS NULL THEN
    RAISE NOTICE 'mediator_insert_assistant_message: no conversation_id for invoice %', p_invoice_id;
    RETURN;
  END IF;

  -- Insert into chat_messages using the actual schema
  BEGIN
    INSERT INTO public.chat_messages (
      conversation_id,
      sender_id,
      text,
      read,
      created_at,
      updated_at
    ) VALUES (
      p_conversation_id,
      NULL,                -- bot/system message has no user sender_id; set NULL or system id if available
      v_message,
      false,
      v_now,
      v_now
    );
    RAISE NOTICE 'Inserted assistant message for invoice % into conversation %', p_invoice_id, p_conversation_id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'mediator_insert_assistant_message: failed to insert chat_messages: %', SQLERRM;
  END;

  -- Log AI usage in `ai_usage` table (best-effort).
  BEGIN
    v_ai_row := jsonb_build_object('text', v_message, 'trigger', p_trigger);
    INSERT INTO public.ai_usage (provider, model, prompt, response, invoice_id, conversation_id, created_at)
    VALUES ('sql-template', 'sql-template', v_prompt, v_ai_row, p_invoice_id, p_conversation_id, v_now);
    RAISE NOTICE 'Logged ai_usage for invoice %', p_invoice_id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'mediator_insert_assistant_message: failed to insert ai_usage: %', SQLERRM;
  END;

END;
$$;

COMMIT;
