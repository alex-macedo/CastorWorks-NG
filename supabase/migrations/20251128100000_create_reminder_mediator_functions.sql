-- Migration: create reminder + mediator functions
-- Generated: 2025-11-28

BEGIN;

-- Reminder + Mediator functions (PL/pgSQL)
-- NOTE: Run this as a DB admin in Supabase SQL Editor. Review assumptions before running.

-- 1) Compose a polite reminder message from invoice fields (deterministic template)
CREATE OR REPLACE FUNCTION public.compose_ai_reminder(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv RECORD;
  v_text text;
BEGIN
  SELECT
    id,
    COALESCE(invoice_number::text, '') AS invoice_number,
    COALESCE(amount_due::text, '') AS amount_due,
    due_date,
    COALESCE(client_name::text, COALESCE(client_email::text,'your contact')) AS client_name
  INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'compose_ai_reminder: invoice % not found', p_invoice_id;
    RETURN 'Invoice not found.';
  END IF;

  v_text := format(
    'Hello %s,' || E'\n\n' ||
    'This is a friendly reminder that invoice %s for %s is due on %s.' || E'\n\n' ||
    'If you have already paid, please disregard this message. If you need a payment plan or help completing payment, reply to this message and we will be happy to arrange it.' || E'\n\n' ||
    'Thank you,' || E'\n' ||
    'Your Team',
    v_inv.client_name,
    COALESCE(NULLIF(v_inv.invoice_number, ''), '(no invoice number)'),
    COALESCE(NULLIF(v_inv.amount_due, ''), '(amount not set)'),
    COALESCE(to_char(v_inv.due_date::timestamptz, 'YYYY-MM-DD'), '(due date not set)')
  );

  RETURN v_text;
END;
$$;


-- 2) Insert assistant message into chat_messages and log into ai_usage
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

  -- Insert into chat_messages (best-effort). Adjust columns if your schema differs.
  BEGIN
    INSERT INTO public.chat_messages (conversation_id, sender_type, content, metadata, created_at)
    VALUES (
      p_conversation_id,
      'bot',
      v_message,
      jsonb_build_object('trigger', p_trigger, 'invoice_id', p_invoice_id),
      v_now
    );
    RAISE NOTICE 'Inserted assistant message for invoice % into conversation %', p_invoice_id, p_conversation_id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'mediator_insert_assistant_message: failed to insert chat_messages: %', SQLERRM;
  END;

  -- Log AI usage in `ai_usage` table (best-effort).
  BEGIN
    v_ai_row := jsonb_build_object('text', v_message);
    INSERT INTO public.ai_usage (provider, model, prompt, response, invoice_id, conversation_id, created_at)
    VALUES ('sql-template', 'sql-template', v_prompt, v_ai_row, p_invoice_id, p_conversation_id, v_now);
    RAISE NOTICE 'Logged ai_usage for invoice %', p_invoice_id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'mediator_insert_assistant_message: failed to insert ai_usage: %', SQLERRM;
  END;

END;
$$;


-- 3) Worker: find due reminders and process them
--    This function finds rows in `payment_reminders` where next_run_at <= now()
--    For each candidate it will:
--      - Try to find an associated invoice and conversation via `invoice_conversations`
--      - Call mediator_insert_assistant_message to insert an assistant message
--      - Insert a basic row into `reminder_logs` (best-effort)
--      - Update the reminder's `last_run_at` and null `next_run_at` (adjust as you prefer)
CREATE OR REPLACE FUNCTION public.execute_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_invoice RECORD;
  v_conversation_id uuid;
  v_now timestamptz := now();
BEGIN
  RAISE NOTICE 'execute_payment_reminders: starting at %', v_now;

  FOR rec IN
    SELECT pr.*
    FROM public.payment_reminders pr
    WHERE pr.next_run_at IS NOT NULL
      AND pr.next_run_at <= v_now
    ORDER BY pr.next_run_at ASC
  LOOP
    BEGIN
      -- Load invoice
      SELECT i.*
      INTO v_invoice
      FROM public.invoices i
      WHERE i.id = rec.invoice_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE NOTICE 'Reminder %: invoice % not found, skipping', rec.id, rec.invoice_id;
        -- Best-effort: write a reminder_log row if table exists
        BEGIN
          INSERT INTO public.reminder_logs (reminder_id, invoice_id, status, response, created_at)
          VALUES (rec.id, rec.invoice_id, 'skipped_invoice_missing', jsonb_build_object('reason','invoice not found'), v_now);
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not write reminder_logs for missing invoice: %', SQLERRM;
        END;
        CONTINUE;
      END IF;

      -- If invoice indicates paid, skip
      IF ( (COALESCE(v_invoice.paid::boolean, false) = true) OR (COALESCE(v_invoice.status::text,'') = 'paid') ) THEN
        RAISE NOTICE 'Reminder %: invoice % already paid, skipping', rec.id, rec.invoice_id;
        BEGIN
          INSERT INTO public.reminder_logs (reminder_id, invoice_id, status, response, created_at)
          VALUES (rec.id, rec.invoice_id, 'skipped_already_paid', jsonb_build_object('invoice_paid', true), v_now);
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not write reminder_logs for paid invoice: %', SQLERRM;
        END;
        -- Optionally, clear next_run_at or mark reminder inactive; we will null it here.
        BEGIN
          UPDATE public.payment_reminders SET last_run_at = v_now, next_run_at = NULL WHERE id = rec.id;
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Failed to update payment_reminders: %', SQLERRM;
        END;
        CONTINUE;
      END IF;

      -- Find mapped conversation (invoice_conversations)
      BEGIN
        SELECT conversation_id INTO v_conversation_id
        FROM public.invoice_conversations ic
        WHERE ic.invoice_id = rec.invoice_id
        LIMIT 1;
      EXCEPTION WHEN others THEN
        v_conversation_id := NULL;
      END;

      -- Insert reminder_logs entry (attempt)
      BEGIN
        INSERT INTO public.reminder_logs (reminder_id, invoice_id, project_id, channel, recipient, status, response, created_at)
        VALUES (
          rec.id,
          rec.invoice_id,
          rec.project_id,
          COALESCE(rec.reminder_type, 'unknown'),
          COALESCE(v_invoice.client_email, v_invoice.client_phone, 'unknown'),
          'processing',
          jsonb_build_object('started_at', v_now),
          v_now
        );
      EXCEPTION WHEN others THEN
        -- If reminder_logs schema differs, write a smaller entry
        BEGIN
          INSERT INTO public.reminder_logs (reminder_id, invoice_id, status, created_at)
          VALUES (rec.id, rec.invoice_id, 'processing', v_now);
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'execute_payment_reminders: could not insert into reminder_logs: %', SQLERRM;
        END;
      END;

      -- Call mediator to insert assistant message into chat and log ai_usage
      PERFORM public.mediator_insert_assistant_message(rec.invoice_id, v_conversation_id, 'scheduled-reminder');

      -- Update reminder progress: set last_run_at and clear next_run_at
      BEGIN
        UPDATE public.payment_reminders
        SET last_run_at = v_now,
            next_run_at = NULL
        WHERE id = rec.id;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Failed to update payment_reminders %: %', rec.id, SQLERRM;
      END;

      -- Mark reminder_logs as done where possible (best-effort)
      BEGIN
        UPDATE public.reminder_logs
        SET status = 'completed',
            response = jsonb_build_object('completed_at', v_now),
            updated_at = v_now
        WHERE reminder_id = rec.id
        AND invoice_id = rec.invoice_id;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not update reminder_logs for reminder %: %', rec.id, SQLERRM;
      END;

    EXCEPTION WHEN others THEN
      RAISE NOTICE 'execute_payment_reminders: error processing reminder %: %', rec.id, SQLERRM;
      -- Try to record an error log
      BEGIN
        INSERT INTO public.reminder_logs (reminder_id, invoice_id, status, response, created_at)
        VALUES (rec.id, rec.invoice_id, 'failed', jsonb_build_object('error', SQLERRM), v_now);
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not write failure reminder_log: %', SQLERRM;
      END;
      CONTINUE;
    END;
  END LOOP;

  RAISE NOTICE 'execute_payment_reminders: completed';
END;
$$;

COMMIT;
