-- ============================================================================
-- Queue Jobs Table for WhatsApp Campaigns
-- Created: 2025-01-23
-- Description: PostgreSQL-based job queue for processing WhatsApp campaigns
-- ============================================================================

-- Create queue_jobs table
CREATE TABLE IF NOT EXISTS queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  job_name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 10, -- Lower number = higher priority
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  return_value JSONB,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_jobs_queue_name_status ON queue_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_scheduled ON queue_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_priority_created ON queue_jobs(priority, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_queue_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_queue_jobs_updated_at ON queue_jobs;
CREATE TRIGGER trigger_queue_jobs_updated_at
  BEFORE UPDATE ON queue_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_jobs_updated_at();

-- Enable RLS
ALTER TABLE queue_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can manage all queue jobs
DROP POLICY IF EXISTS "Service role can manage all queue jobs" ON queue_jobs;
CREATE POLICY "Service role can manage all queue jobs"
  ON queue_jobs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT ALL ON queue_jobs TO service_role;

-- Comments
COMMENT ON TABLE queue_jobs IS 'Job queue for processing WhatsApp campaigns and messages';
COMMENT ON COLUMN queue_jobs.queue_name IS 'Queue name (e.g., whatsapp-campaign-execution, whatsapp-message-sending)';
COMMENT ON COLUMN queue_jobs.job_name IS 'Job type name (e.g., execute-campaign, send-message)';
COMMENT ON COLUMN queue_jobs.data IS 'Job data as JSON';
COMMENT ON COLUMN queue_jobs.priority IS 'Job priority (lower number = higher priority)';
COMMENT ON COLUMN queue_jobs.scheduled_at IS 'When the job should be processed (for delayed jobs)';
