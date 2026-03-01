-- Migration: Setup Notification Cron Job
-- Description: Configure pg_cron to run check-due-notifications Edge Function daily
-- Author: AI Agent
-- Date: 2026-01-25

BEGIN;

-- =====================================================
-- 1. ENABLE PG_CRON EXTENSION
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. ENABLE PG_NET EXTENSION (for HTTP calls)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 3. SCHEDULE DAILY NOTIFICATION CHECK
-- =====================================================

-- Remove existing job if it exists
SELECT cron.unschedule('check-due-notifications');

-- Schedule job to run daily at 8:00 AM UTC
-- This will check for tasks and payments due today or in the coming days
SELECT cron.schedule(
  'check-due-notifications',
  '0 8 * * *',  -- Every day at 8:00 AM UTC (cron format: minute hour day month weekday)
  $$
  SELECT net.http_post(
    url := get_supabase_url() || '/functions/v1/check-due-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || get_service_role_key(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================
-- 4. CREATE CRON JOB LOG TABLE (Optional)
-- =====================================================

-- Table to track cron job executions
CREATE TABLE IF NOT EXISTS public.cron_job_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  response JSONB
);

CREATE INDEX IF NOT EXISTS idx_cron_job_log_executed_at 
  ON public.cron_job_log(executed_at DESC);

-- Enable RLS
ALTER TABLE public.cron_job_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view cron logs
DROP POLICY IF EXISTS "Admins can view cron logs" ON public.cron_job_log;
CREATE POLICY "Admins can view cron logs"
  ON public.cron_job_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Service role can insert logs
DROP POLICY IF EXISTS "Service role can insert cron logs" ON public.cron_job_log;
CREATE POLICY "Service role can insert cron logs"
  ON public.cron_job_log FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 5. CLEANUP OLD LOGS FUNCTION
-- =====================================================

-- Function to clean up old cron job logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM cron_job_log
  WHERE executed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run weekly on Sunday at 2:00 AM UTC
SELECT cron.unschedule('cleanup-old-cron-logs');
SELECT cron.schedule(
  'cleanup-old-cron-logs',
  '0 2 * * 0',  -- Every Sunday at 2:00 AM UTC
  $$SELECT cleanup_old_cron_logs();$$
);

-- =====================================================
-- 6. GRANTS
-- =====================================================

GRANT SELECT ON public.cron_job_log TO authenticated;
GRANT INSERT ON public.cron_job_log TO service_role;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE public.cron_job_log IS 'Log of cron job executions for monitoring and debugging';
COMMENT ON FUNCTION cleanup_old_cron_logs IS 'Clean up cron job logs older than 90 days';

-- =====================================================
-- 8. VERIFY CRON JOBS
-- =====================================================

-- Query to verify cron jobs are scheduled
-- SELECT * FROM cron.job;

COMMIT;
