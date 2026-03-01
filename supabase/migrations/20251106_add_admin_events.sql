-- Migration: add admin_events table to record telemetry events for admins
CREATE TABLE IF NOT EXISTS admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by event_key
CREATE INDEX IF NOT EXISTS idx_admin_events_event_key ON admin_events (event_key);
