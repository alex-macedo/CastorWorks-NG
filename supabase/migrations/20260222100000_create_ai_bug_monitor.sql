-- AI Bug Monitor: Tracking table and hourly cron job
-- Enables automated bug triage, investigation, and fix pipeline

BEGIN;

-- =====================================================
-- 1. TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_bug_monitor_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                    'pending',       -- Triaged as bug, awaiting local agent
                    'investigating', -- agent-browser is confirming the bug
                    'fixing',        -- AI is working on a code fix
                    'qa',            -- Running lint / test / ci pipeline
                    'committed',     -- Changes pushed to GitHub
                    'done',          -- CI green, item moved to Done
                    'skipped',       -- Triaged as NOT a bug
                    'failed'         -- Something went wrong
                  )),
  triage_result   JSONB,            -- { is_bug, confidence, summary, reproduction_steps }
  fix_details     JSONB,            -- { files_changed, commit_sha, branch, pr_url, ci_status }
  error_log       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roadmap_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_bug_monitor_runs_status
  ON public.ai_bug_monitor_runs(status);
CREATE INDEX IF NOT EXISTS idx_ai_bug_monitor_runs_created_at
  ON public.ai_bug_monitor_runs(created_at DESC);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS update_ai_bug_monitor_runs_updated_at ON public.ai_bug_monitor_runs;
CREATE TRIGGER update_ai_bug_monitor_runs_updated_at
  BEFORE UPDATE ON public.ai_bug_monitor_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_bug_monitor_runs ENABLE ROW LEVEL SECURITY;

-- Everyone can view monitor runs (transparency)
DROP POLICY IF EXISTS "Everyone can view ai_bug_monitor_runs" ON public.ai_bug_monitor_runs;
CREATE POLICY "Everyone can view ai_bug_monitor_runs"
  ON public.ai_bug_monitor_runs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can insert/update (edge function + local script)
DROP POLICY IF EXISTS "Service role can manage ai_bug_monitor_runs" ON public.ai_bug_monitor_runs;
CREATE POLICY "Service role can manage ai_bug_monitor_runs"
  ON public.ai_bug_monitor_runs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admins can also manage
DROP POLICY IF EXISTS "Admins can manage ai_bug_monitor_runs" ON public.ai_bug_monitor_runs;
CREATE POLICY "Admins can manage ai_bug_monitor_runs"
  ON public.ai_bug_monitor_runs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.ai_bug_monitor_runs TO authenticated;
GRANT ALL ON public.ai_bug_monitor_runs TO service_role;

-- =====================================================
-- 3. HOURLY CRON JOB
-- =====================================================

-- Ensure extensions exist (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if present (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('ai-bug-monitor-hourly');
EXCEPTION WHEN OTHERS THEN
  -- Job does not exist yet, nothing to unschedule
  NULL;
END $$;

-- Schedule: every hour at :00
SELECT cron.schedule(
  'ai-bug-monitor-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := get_supabase_url() || '/functions/v1/ai-bug-monitor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || get_service_role_key(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON TABLE public.ai_bug_monitor_runs IS
  'Tracks each roadmap bug item through the automated triage → investigate → fix → deploy pipeline';

COMMIT;
