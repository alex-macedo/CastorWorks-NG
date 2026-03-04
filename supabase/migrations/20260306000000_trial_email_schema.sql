-- Phase 6 Plan 06-01: Trial reminder and expiration email schema
-- Adds tenants columns (primary_contact_email, opt_out_trial_emails), trial_email_logs,
-- trial_reminder_due_candidates view, trial_expiration_email_queue, and trigger
-- on trial->sandbox transition.

BEGIN;

-- 1. tenants columns: primary contact and opt-out
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS opt_out_trial_emails BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.primary_contact_email IS
  'Configurable primary contact email for trial notifications; when set, use instead of owner email';
COMMENT ON COLUMN public.tenants.opt_out_trial_emails IS
  'When true, tenant opts out of all trial reminder and expiration emails';

-- 2. trial_email_logs: audit trail for trial emails sent
CREATE TABLE IF NOT EXISTS public.trial_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('reminder_7d', 'reminder_3d', 'reminder_1d', 'expiration')),
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_email_logs_tenant_id_email_type
  ON public.trial_email_logs(tenant_id, email_type);

ALTER TABLE public.trial_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read own tenant's logs; service_role for insert
DROP POLICY IF EXISTS "trial_email_logs_select_own_tenant" ON public.trial_email_logs;
CREATE POLICY "trial_email_logs_select_own_tenant"
  ON public.trial_email_logs FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

GRANT SELECT ON public.trial_email_logs TO authenticated;
GRANT INSERT ON public.trial_email_logs TO service_role;

COMMENT ON TABLE public.trial_email_logs IS 'Audit trail for trial reminder and expiration emails';

-- 3. trial_reminder_due_candidates view
-- Yields tenants with trial ending in 7, 3, or 1 days who have not yet received that reminder
CREATE OR REPLACE VIEW public.trial_reminder_due_candidates AS
WITH today_utc AS (
  SELECT (date(now() AT TIME ZONE 'UTC'))::date AS d
),
cands AS (
  SELECT
    t.id AS tenant_id,
    td.reminder_days,
    COALESCE(
      t.primary_contact_email,
      (SELECT up.email
       FROM public.tenant_users tu
       JOIN public.user_profiles up ON up.user_id = tu.user_id
       WHERE tu.tenant_id = t.id AND tu.is_owner = true
       LIMIT 1)
    ) AS recipient_email,
    t.trial_ends_at,
    t.name AS tenant_name,
    t.settings
  FROM public.tenants t
  CROSS JOIN LATERAL (
    SELECT 7 AS reminder_days WHERE date(t.trial_ends_at AT TIME ZONE 'UTC') - 7 = (SELECT d FROM today_utc)
    UNION ALL SELECT 3 WHERE date(t.trial_ends_at AT TIME ZONE 'UTC') - 3 = (SELECT d FROM today_utc)
    UNION ALL SELECT 1 WHERE date(t.trial_ends_at AT TIME ZONE 'UTC') - 1 = (SELECT d FROM today_utc)
  ) td
  WHERE t.subscription_tier_id = 'trial'
    AND t.trial_ends_at IS NOT NULL
    AND COALESCE(t.opt_out_trial_emails, false) = false
)
SELECT c.tenant_id, c.reminder_days, c.recipient_email, c.trial_ends_at, c.tenant_name, c.settings
FROM cands c
WHERE c.recipient_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.trial_email_logs tel
    WHERE tel.tenant_id = c.tenant_id
      AND tel.email_type = ('reminder_' || c.reminder_days::text || 'd')
  );

GRANT SELECT ON public.trial_reminder_due_candidates TO service_role;

COMMENT ON VIEW public.trial_reminder_due_candidates IS
  'Tenants due for trial reminder (7, 3, 1 days before expiry) who have not yet received that reminder';

-- 4. trial_expiration_email_queue
CREATE TABLE IF NOT EXISTS public.trial_expiration_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trial_expiration_email_queue_unprocessed
  ON public.trial_expiration_email_queue(tenant_id)
  WHERE processed_at IS NULL;

ALTER TABLE public.trial_expiration_email_queue ENABLE ROW LEVEL SECURITY;

-- Service role only; no authenticated access (Edge Function uses service role)
GRANT SELECT, INSERT, UPDATE ON public.trial_expiration_email_queue TO service_role;

COMMENT ON TABLE public.trial_expiration_email_queue IS
  'Queue of tenants to receive trial expiration email; populated by trigger on trial->sandbox';

-- 5. Trigger: enqueue when trial moves to sandbox
CREATE OR REPLACE FUNCTION public.trial_expiry_enqueue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.subscription_tier_id = 'trial' AND NEW.subscription_tier_id = 'sandbox' THEN
    INSERT INTO public.trial_expiration_email_queue (tenant_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_trial_expiry_enqueue ON public.tenants;
CREATE TRIGGER trigger_trial_expiry_enqueue
  AFTER UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trial_expiry_enqueue();

COMMIT;
