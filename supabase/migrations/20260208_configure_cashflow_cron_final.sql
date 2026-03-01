-- Configure Cron Job for Nightly Cashflow Forecast Updates
-- Phase 2a Task P2a.3 - Production Ready
--
-- This migration sets up automated nightly cashflow forecasts at 2:00 AM
-- using pg_cron to schedule and pg_net to call the Edge Function

BEGIN;

-- =============================================================
-- Step 1: Ensure extensions are enabled
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================
-- Step 2: Create cron trigger function
-- =============================================================

CREATE OR REPLACE FUNCTION public.trigger_nightly_cashflow_forecast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response_id bigint;
  v_project_count integer;
  v_supabase_url text := current_setting('app.settings.external_rest_api_url', true);
  v_service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Count active projects
  SELECT COUNT(*) INTO v_project_count
  FROM public.projects
  WHERE status = 'active';

  RAISE NOTICE '[Cashflow Cron] Starting forecast generation for % active projects at %',
    v_project_count, NOW();

  -- Call Edge Function via pg_net (async HTTP request)
  -- This bypasses auth by using service role key
  SELECT INTO v_response_id extensions.http_post(
    url := v_supabase_url || '/functions/v1/financial-cashflow-forecast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'apikey', v_service_key
    ),
    body := '{}'::jsonb
  );

  RAISE NOTICE '[Cashflow Cron] HTTP request initiated with response_id: %', v_response_id;

  -- Note: pg_net is async, so we won't wait for response
  -- Check extensions.http_request_queue for status

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[Cashflow Cron] Error: % - %', SQLSTATE, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.trigger_nightly_cashflow_forecast() IS
  'Triggers the cashflow forecast Edge Function for all active projects.
   Called by pg_cron nightly at 2:00 AM. Uses pg_net for async HTTP calls.';

-- =============================================================
-- Step 3: Schedule the cron job
-- =============================================================

-- Remove existing job if present
DO $$
BEGIN
  PERFORM cron.unschedule('nightly-cashflow-forecast');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if job doesn't exist
END $$;

-- Schedule new job
SELECT cron.schedule(
  'nightly-cashflow-forecast',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$SELECT public.trigger_nightly_cashflow_forecast()$$
);

-- =============================================================
-- Step 4: Verify and log setup
-- =============================================================

DO $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT * INTO v_job
  FROM cron.job
  WHERE jobname = 'nightly-cashflow-forecast';

  IF FOUND THEN
    RAISE NOTICE '✅ Cron job configured successfully:';
    RAISE NOTICE '   Job ID: %', v_job.jobid;
    RAISE NOTICE '   Name: %', v_job.jobname;
    RAISE NOTICE '   Schedule: % (Daily 2:00 AM)', v_job.schedule;
    RAISE NOTICE '   Database: %', v_job.database;
    RAISE NOTICE '   Active: %', v_job.active;
  ELSE
    RAISE EXCEPTION 'Failed to schedule cron job';
  END IF;
END $$;

COMMIT;

-- =============================================================
-- Manual Testing & Monitoring
-- =============================================================

/*
MANUAL TEST (run forecast immediately):
  SELECT public.trigger_nightly_cashflow_forecast();

CHECK CRON STATUS:
  SELECT jobid, jobname, schedule, command, active, database
  FROM cron.job
  WHERE jobname = 'nightly-cashflow-forecast';

VIEW RECENT EXECUTIONS:
  SELECT
    runid,
    status,
    return_message,
    start_time,
    end_time,
    (end_time - start_time) as duration
  FROM cron.job_run_details
  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'nightly-cashflow-forecast')
  ORDER BY start_time DESC
  LIMIT 10;

CHECK HTTP REQUEST STATUS (pg_net async requests):
  SELECT id, method, url, status, created_at, updated_at
  FROM extensions.http_request_queue
  WHERE url LIKE '%cashflow-forecast%'
  ORDER BY created_at DESC
  LIMIT 10;

DISABLE CRON JOB:
  SELECT cron.unschedule('nightly-cashflow-forecast');

RE-ENABLE CRON JOB:
  SELECT cron.schedule(
    'nightly-cashflow-forecast',
    '0 2 * * *',
    $$SELECT public.trigger_nightly_cashflow_forecast()$$
  );
*/
