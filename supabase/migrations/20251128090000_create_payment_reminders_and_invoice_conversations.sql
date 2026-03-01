-- Migration: Create payment reminders and link invoices to existing chat conversations
-- Creates: invoice_conversations, payment_reminders, reminder_logs
-- Includes RLS policies that rely on helper functions: has_project_access, has_project_admin_access

BEGIN;

-- 1) invoice_conversations: link existing invoices to existing chat_conversations
CREATE TABLE IF NOT EXISTS public.invoice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_invoice_conversations_invoice_id ON public.invoice_conversations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_conversations_conversation_id ON public.invoice_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_conversations_project_id ON public.invoice_conversations(project_id);

DROP TRIGGER IF EXISTS update_invoice_conversations_updated_at ON public.invoice_conversations;
CREATE TRIGGER update_invoice_conversations_updated_at
BEFORE UPDATE ON public.invoice_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invoice_conversations ENABLE ROW LEVEL SECURITY;

-- RLS: Users who can view the related project can read invoice_conversations
DROP POLICY IF EXISTS "Project members can view invoice_conversations" ON public.invoice_conversations;
CREATE POLICY "Project members can view invoice_conversations"
  ON public.invoice_conversations FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can manage invoice_conversations" ON public.invoice_conversations;
CREATE POLICY "Project admins can manage invoice_conversations"
  ON public.invoice_conversations FOR ALL
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT ON public.invoice_conversations TO authenticated;
GRANT INSERT, UPDATE ON public.invoice_conversations TO authenticated;
GRANT DELETE ON public.invoice_conversations TO service_role;

-- 2) payment_reminders: schedules and settings for invoice reminders
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL DEFAULT 'email',
  days_offset INTEGER NOT NULL,
  next_run_at TIMESTAMPTZ,
  template_name TEXT,
  message_template TEXT,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled','paused')),
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_id ON public.payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_project_id ON public.payment_reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_next_run_at ON public.payment_reminders(next_run_at) WHERE status = 'enabled';

DROP TRIGGER IF EXISTS update_payment_reminders_updated_at ON public.payment_reminders;
CREATE TRIGGER update_payment_reminders_updated_at
BEFORE UPDATE ON public.payment_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS: Project members can view reminders
DROP POLICY IF EXISTS "Project members can view reminders" ON public.payment_reminders;
CREATE POLICY "Project members can view reminders"
  ON public.payment_reminders FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

-- RLS: Project admins can manage reminders
DROP POLICY IF EXISTS "Project admins can manage reminders" ON public.payment_reminders;
CREATE POLICY "Project admins can manage reminders"
  ON public.payment_reminders FOR ALL
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT ON public.payment_reminders TO authenticated;
GRANT INSERT, UPDATE ON public.payment_reminders TO authenticated;
GRANT DELETE ON public.payment_reminders TO service_role;

-- 3) reminder_logs: audit trail of sends, results
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES public.payment_reminders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON public.reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_invoice_id ON public.reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_created_at ON public.reminder_logs(created_at DESC);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view reminder_logs" ON public.reminder_logs;
CREATE POLICY "Project members can view reminder_logs"
  ON public.reminder_logs FOR SELECT
  USING (project_id IS NULL OR public.has_project_access(auth.uid(), project_id));

GRANT SELECT ON public.reminder_logs TO authenticated;
GRANT INSERT ON public.reminder_logs TO service_role;

-- 4) Utility view for due-date based reminders (for scheduler queries)
CREATE OR REPLACE VIEW public.payment_reminder_due_candidates AS
SELECT r.*,
       i.due_date,
       (i.due_date + (r.days_offset || ' days')::interval) AT TIME ZONE 'UTC' AS scheduled_at_utc
FROM public.payment_reminders r
JOIN public.invoices i ON i.id = r.invoice_id
WHERE r.status = 'enabled';

GRANT SELECT ON public.payment_reminder_due_candidates TO authenticated;

COMMIT;
