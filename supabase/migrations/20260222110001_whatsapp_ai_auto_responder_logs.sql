-- WA-8.1: AI Auto-Responder logs table
-- Tracks AI-generated responses sent via WhatsApp for auditing and debugging
-- Apply with: scp/ssh per AGENTS.md migration workflow

BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_auto_responder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  incoming_message TEXT NOT NULL,
  ai_response TEXT,
  provider VARCHAR(50),
  model VARCHAR(100),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_logs_phone ON public.whatsapp_ai_auto_responder_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_logs_project ON public.whatsapp_ai_auto_responder_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_logs_responded ON public.whatsapp_ai_auto_responder_logs(responded_at DESC);

ALTER TABLE public.whatsapp_ai_auto_responder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage whatsapp_ai_auto_responder_logs"
  ON public.whatsapp_ai_auto_responder_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can view whatsapp_ai_auto_responder_logs"
  ON public.whatsapp_ai_auto_responder_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
