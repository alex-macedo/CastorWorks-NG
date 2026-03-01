-- Financial Module Phase 2b: Collection Tables
-- Task P2b.1 - Database Schema
--
-- Creates:
-- 1. financial_collection_sequences (workflow definitions)
-- 2. financial_collection_actions (execution tracking)
-- 3. Helper function: schedule_collection_actions()
-- 4. RLS policies and indexes

BEGIN;

-- ============================================================
-- Table 1: Collection Sequences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_collection_sequences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Scope (company-wide sequences)
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Sequence Definition
  name TEXT NOT NULL,
  description TEXT,

  -- Sequence Steps (JSONB array)
  steps JSONB NOT NULL,
  /* Example steps structure:
  [
    {
      "step_number": 1,
      "trigger": "due_date",
      "trigger_value": 0,
      "action": "email",
      "template": "friendly_reminder",
      "delay_hours": 0,
      "subject": "Payment Reminder",
      "body": "Your invoice is due today..."
    },
    {
      "step_number": 2,
      "trigger": "days_overdue",
      "trigger_value": 3,
      "action": "whatsapp",
      "template": "payment_reminder",
      "delay_hours": 24,
      "message": "Hi {customer_name}, invoice {invoice_number} is 3 days overdue..."
    },
    {
      "step_number": 3,
      "trigger": "days_overdue",
      "trigger_value": 7,
      "action": "email",
      "template": "formal_collection",
      "delay_hours": 0,
      "subject": "Collection Notice",
      "body": "This is a formal notice..."
    },
    {
      "step_number": 4,
      "trigger": "days_overdue",
      "trigger_value": 14,
      "action": "task",
      "template": "manual_followup",
      "delay_hours": 0,
      "task_title": "Manual Collection Follow-up",
      "task_description": "Call customer regarding overdue invoice"
    }
  ]
  */

  -- Applicability Rules
  applies_to_customer_types TEXT[], -- ['all', 'corporate', 'individual']
  minimum_amount NUMERIC(15,2), -- Only for invoices >= this amount
  maximum_amount NUMERIC(15,2), -- Only for invoices <= this amount

  -- Status
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_steps CHECK (jsonb_array_length(steps) > 0),
  CONSTRAINT valid_amount_range CHECK (
    minimum_amount IS NULL OR maximum_amount IS NULL OR minimum_amount <= maximum_amount
  )
);

-- Indexes for Collection Sequences
CREATE INDEX IF NOT EXISTS idx_collection_sequences_project
  ON public.financial_collection_sequences(project_id);
CREATE INDEX IF NOT EXISTS idx_collection_sequences_active
  ON public.financial_collection_sequences(is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collection_sequences_default
  ON public.financial_collection_sequences(project_id, is_default)
  WHERE is_default = true;

-- ============================================================
-- Table 2: Collection Actions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_collection_actions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  invoice_id UUID NOT NULL REFERENCES public.financial_ar_invoices(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.financial_collection_sequences(id),

  -- Action Details
  step_number INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('email', 'whatsapp', 'sms', 'phone_call', 'task', 'letter')
  ),

  -- Execution Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'completed', 'skipped')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Communication Details
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  message_template TEXT,
  message_subject TEXT,
  message_body TEXT,

  -- External IDs (from email/SMS providers)
  external_message_id TEXT,
  external_status TEXT,
  external_provider TEXT, -- 'sendgrid', 'twilio', 'aws_ses'

  -- Results
  was_successful BOOLEAN,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Engagement Metrics
  opened_at TIMESTAMPTZ, -- Email opened
  clicked_at TIMESTAMPTZ, -- Link clicked
  replied_at TIMESTAMPTZ, -- Customer replied
  bounce_reason TEXT, -- Email bounce reason

  -- Task Reference (if action_type = 'task')
  task_id UUID REFERENCES public.tasks(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email_recipient CHECK (
    action_type != 'email' OR recipient_email IS NOT NULL
  ),
  CONSTRAINT valid_phone_recipient CHECK (
    action_type NOT IN ('whatsapp', 'sms', 'phone_call') OR recipient_phone IS NOT NULL
  ),
  CONSTRAINT valid_task_ref CHECK (
    action_type != 'task' OR task_id IS NOT NULL
  )
);

-- Indexes for Collection Actions
CREATE INDEX IF NOT EXISTS idx_collection_actions_invoice
  ON public.financial_collection_actions(invoice_id, step_number);
CREATE INDEX IF NOT EXISTS idx_collection_actions_scheduled
  ON public.financial_collection_actions(scheduled_at)
  WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_collection_actions_status
  ON public.financial_collection_actions(status, action_type);
CREATE INDEX IF NOT EXISTS idx_collection_actions_created
  ON public.financial_collection_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_actions_external
  ON public.financial_collection_actions(external_message_id)
  WHERE external_message_id IS NOT NULL;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS
ALTER TABLE public.financial_collection_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_collection_actions ENABLE ROW LEVEL SECURITY;

-- Collection Sequences: Only accessible to users with project access
CREATE POLICY "Users can view collection sequences for accessible projects"
  ON public.financial_collection_sequences FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Admins can manage collection sequences"
  ON public.financial_collection_sequences FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Collection Actions: Accessible based on invoice access
CREATE POLICY "Users can view collection actions for accessible invoices"
  ON public.financial_collection_actions FOR SELECT
  USING (
    has_project_access(
      auth.uid(),
      (SELECT project_id FROM public.financial_ar_invoices WHERE id = invoice_id)
    )
  );

CREATE POLICY "Admins can manage collection actions"
  ON public.financial_collection_actions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- Helper Function: Schedule Collection Actions
-- ============================================================

CREATE OR REPLACE FUNCTION public.schedule_collection_actions(
  p_invoice_id UUID,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  action_id UUID,
  step_number INTEGER,
  action_type TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT
) AS $$
DECLARE
  v_invoice RECORD;
  v_sequence RECORD;
  v_step JSONB;
  v_step_number INTEGER;
  v_trigger_date TIMESTAMPTZ;
  v_action_id UUID;
  v_days_overdue INTEGER;
BEGIN
  -- Get invoice details
  SELECT *
  INTO v_invoice
  FROM public.financial_ar_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  -- Calculate days overdue
  v_days_overdue := GREATEST(0, EXTRACT(DAY FROM NOW() - v_invoice.due_date::TIMESTAMPTZ)::INTEGER);

  -- Find applicable collection sequence
  SELECT *
  INTO v_sequence
  FROM public.financial_collection_sequences
  WHERE project_id = v_invoice.project_id
    AND is_active = true
    AND (minimum_amount IS NULL OR v_invoice.total_amount >= minimum_amount)
    AND (maximum_amount IS NULL OR v_invoice.total_amount <= maximum_amount)
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Use global default sequence (project_id = NULL)
    SELECT *
    INTO v_sequence
    FROM public.financial_collection_sequences
    WHERE project_id IS NULL
      AND is_active = true
      AND is_default = true
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE NOTICE 'No collection sequence found for invoice %', p_invoice_id;
    RETURN;
  END IF;

  -- Iterate through sequence steps
  FOR v_step IN
    SELECT * FROM jsonb_array_elements(v_sequence.steps)
  LOOP
    v_step_number := (v_step->>'step_number')::INTEGER;

    -- Calculate trigger date based on step configuration
    IF v_step->>'trigger' = 'due_date' THEN
      v_trigger_date := v_invoice.due_date::TIMESTAMPTZ + ((v_step->>'trigger_value')::INTEGER || ' days')::INTERVAL;
    ELSIF v_step->>'trigger' = 'days_overdue' THEN
      v_trigger_date := v_invoice.due_date::TIMESTAMPTZ + ((v_step->>'trigger_value')::INTEGER || ' days')::INTERVAL;
    ELSE
      RAISE NOTICE 'Unknown trigger type: %', v_step->>'trigger';
      CONTINUE;
    END IF;

    -- Add delay hours if specified
    v_trigger_date := v_trigger_date + ((COALESCE((v_step->>'delay_hours')::INTEGER, 0)) || ' hours')::INTERVAL;

    -- Skip if action already exists for this step
    IF EXISTS (
      SELECT 1
      FROM public.financial_collection_actions
      WHERE invoice_id = p_invoice_id
        AND sequence_id = v_sequence.id
        AND step_number = v_step_number
    ) THEN
      CONTINUE;
    END IF;

    -- Create action (unless dry run)
    IF NOT p_dry_run THEN
      INSERT INTO public.financial_collection_actions (
        invoice_id,
        sequence_id,
        step_number,
        action_type,
        status,
        scheduled_at,
        recipient_email,
        recipient_phone,
        recipient_name,
        message_template,
        message_subject,
        message_body
      ) VALUES (
        p_invoice_id,
        v_sequence.id,
        v_step_number,
        v_step->>'action',
        CASE
          WHEN v_trigger_date <= NOW() THEN 'pending'
          ELSE 'scheduled'
        END,
        v_trigger_date,
        CASE WHEN v_step->>'action' = 'email' THEN v_invoice.client_email ELSE NULL END,
        CASE WHEN v_step->>'action' IN ('whatsapp', 'sms') THEN NULL ELSE NULL END, -- Phone number from contact
        v_invoice.client_name,
        v_step->>'template',
        v_step->>'subject',
        v_step->>'body'
      )
      RETURNING id INTO v_action_id;
    ELSE
      v_action_id := NULL;
    END IF;

    -- Return row
    RETURN QUERY SELECT
      v_action_id,
      v_step_number,
      (v_step->>'action')::TEXT,
      v_trigger_date,
      CASE
        WHEN v_trigger_date <= NOW() THEN 'pending'::TEXT
        ELSE 'scheduled'::TEXT
      END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.schedule_collection_actions IS
  'Schedules collection actions for an overdue invoice based on configured sequences.
   Use dry_run=true to preview actions without creating them.';

-- ============================================================
-- Insert Default Collection Sequence
-- ============================================================

INSERT INTO public.financial_collection_sequences (
  project_id,
  name,
  description,
  steps,
  applies_to_customer_types,
  is_default,
  is_active
) VALUES (
  NULL, -- Global default
  'Default 6-Step Collection Sequence',
  'Standard collection workflow: friendly reminder → WhatsApp → formal notice → manual task → escalation → legal',
  '[
    {
      "step_number": 1,
      "trigger": "due_date",
      "trigger_value": 0,
      "action": "email",
      "template": "friendly_reminder",
      "delay_hours": 0,
      "subject": "Payment Reminder - Invoice {invoice_number}",
      "body": "Hi {customer_name},\\n\\nThis is a friendly reminder that invoice {invoice_number} for {total_amount} is due today ({due_date}).\\n\\nPlease process payment at your earliest convenience.\\n\\nThank you!"
    },
    {
      "step_number": 2,
      "trigger": "days_overdue",
      "trigger_value": 3,
      "action": "whatsapp",
      "template": "payment_reminder",
      "delay_hours": 24,
      "message": "Hi {customer_name}, your invoice {invoice_number} for {total_amount} is now 3 days overdue. Please make payment to avoid late fees. Reply PAID when complete."
    },
    {
      "step_number": 3,
      "trigger": "days_overdue",
      "trigger_value": 7,
      "action": "email",
      "template": "formal_collection",
      "delay_hours": 0,
      "subject": "Collection Notice - Invoice {invoice_number}",
      "body": "Dear {customer_name},\\n\\nInvoice {invoice_number} for {total_amount} is now 7 days overdue.\\n\\nThis is a formal collection notice. Payment must be received within 7 days to avoid escalation.\\n\\nPlease contact us immediately to discuss payment arrangements."
    },
    {
      "step_number": 4,
      "trigger": "days_overdue",
      "trigger_value": 14,
      "action": "task",
      "template": "manual_followup",
      "delay_hours": 0,
      "task_title": "Manual Collection Follow-up - {customer_name}",
      "task_description": "Invoice {invoice_number} is 14 days overdue. Call customer to discuss payment options and create payment plan if needed."
    },
    {
      "step_number": 5,
      "trigger": "days_overdue",
      "trigger_value": 21,
      "action": "email",
      "template": "management_escalation",
      "delay_hours": 0,
      "subject": "URGENT: Collection Escalation - Invoice {invoice_number}",
      "body": "URGENT: Invoice {invoice_number} for {total_amount} is now 21 days overdue.\\n\\nThis matter will be escalated to management if payment is not received within 48 hours.\\n\\nContact us immediately."
    },
    {
      "step_number": 6,
      "trigger": "days_overdue",
      "trigger_value": 30,
      "action": "task",
      "template": "legal_review",
      "delay_hours": 0,
      "task_title": "Legal Review - {customer_name}",
      "task_description": "Invoice {invoice_number} is 30+ days overdue. Review for potential legal action or write-off."
    }
  ]'::JSONB,
  ARRAY['all'],
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verification
-- ============================================================

DO $$
DECLARE
  v_sequences_count INTEGER;
  v_default_sequence_id UUID;
BEGIN
  -- Count sequences
  SELECT COUNT(*) INTO v_sequences_count
  FROM public.financial_collection_sequences;

  -- Get default sequence
  SELECT id INTO v_default_sequence_id
  FROM public.financial_collection_sequences
  WHERE is_default = true
  LIMIT 1;

  RAISE NOTICE '✅ Collection tables created successfully';
  RAISE NOTICE '   - financial_collection_sequences: % rows', v_sequences_count;
  RAISE NOTICE '   - financial_collection_actions: ready';
  RAISE NOTICE '   - Default sequence ID: %', v_default_sequence_id;
  RAISE NOTICE '   - Helper function: schedule_collection_actions() created';
END $$;

COMMIT;
