-- Add status column to architect_time_entries for tracking in-progress entries
-- This enables auto-save functionality to prevent data loss on browser crashes

BEGIN;

-- Add status column: 'running', 'paused', or 'completed'
ALTER TABLE architect_time_entries 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';

-- Add accumulated_seconds for pause/resume support during auto-save
ALTER TABLE architect_time_entries 
ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER NOT NULL DEFAULT 0;

-- Index for finding in-progress entries quickly (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_time_entries_status 
ON architect_time_entries(user_id, status) 
WHERE status IN ('running', 'paused');

-- Add comments for documentation
COMMENT ON COLUMN architect_time_entries.status IS 'Entry status: running, paused, completed';
COMMENT ON COLUMN architect_time_entries.accumulated_seconds IS 'Accumulated seconds before current segment (for pause/resume and crash recovery)';

COMMIT;
