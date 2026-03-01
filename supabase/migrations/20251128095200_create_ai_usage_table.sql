-- Migration: create ai_usage table
-- Generated: 2025-11-28

BEGIN;

-- Create table for logging AI usage (prompts, responses, costs)
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text,
  prompt text,
  response jsonb,
  tokens_used integer,
  cost numeric(12,6),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_invoice_id ON public.ai_usage(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_conversation_id ON public.ai_usage(conversation_id);

-- Enable Row-Level Security and provide conservative policies.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Policies: Admins may select/insert/update/delete. Service-role operations bypass RLS.
CREATE POLICY "Admins can select ai_usage"
  ON public.ai_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ai_usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ai_usage"
  ON public.ai_usage FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ai_usage"
  ON public.ai_usage FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

COMMIT;
