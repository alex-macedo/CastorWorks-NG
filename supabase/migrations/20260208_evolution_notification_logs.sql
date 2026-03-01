-- Evolution API Notification Logs Table
-- Sprint: 2026-05
-- Created: 2026-02-08
--
-- This migration adds the notification_logs table for tracking bulk notifications
-- and adds the sent_by column to evolution_messages.
--
-- Apply with:
--   scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260208_evolution_notification_logs.sql castorworks:/tmp/
--   ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260208_evolution_notification_logs.sql"

BEGIN;

-- ============================================================
-- PART 1: ADD sent_by COLUMN TO evolution_messages
-- ============================================================

-- Add sent_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'evolution_messages'
    AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE public.evolution_messages
    ADD COLUMN sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    CREATE INDEX idx_evolution_messages_sent_by ON public.evolution_messages(sent_by);
    
    RAISE NOTICE 'Added sent_by column to evolution_messages';
  ELSE
    RAISE NOTICE 'sent_by column already exists in evolution_messages';
  END IF;
END $$;

-- ============================================================
-- PART 2: CREATE evolution_notification_logs TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.evolution_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type VARCHAR(100) NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  template_key VARCHAR(100),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  reference_id UUID,
  reference_type VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  error_details JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_evolution_notification_logs_trigger 
  ON public.evolution_notification_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_evolution_notification_logs_project 
  ON public.evolution_notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_notification_logs_created 
  ON public.evolution_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_notification_logs_reference 
  ON public.evolution_notification_logs(reference_type, reference_id);

-- ============================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.evolution_notification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: RLS POLICIES
-- ============================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can view notification logs" ON public.evolution_notification_logs;
DROP POLICY IF EXISTS "Admins can insert notification logs" ON public.evolution_notification_logs;

-- Notification Logs: Admins can view and insert
CREATE POLICY "Admins can view notification logs"
  ON public.evolution_notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notification logs"
  ON public.evolution_notification_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can always insert (for edge functions)
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.evolution_notification_logs;
CREATE POLICY "Service role can insert notification logs"
  ON public.evolution_notification_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT ON public.evolution_notification_logs TO authenticated;
GRANT SELECT, INSERT ON public.evolution_notification_logs TO service_role;

COMMIT;

-- Log success message
DO $$
BEGIN
  RAISE NOTICE 'Evolution notification logs table created successfully';
END $$;
