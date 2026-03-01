-- Add title/subject field to architect_meetings table
ALTER TABLE IF EXISTS architect_meetings
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN architect_meetings.title IS 'Meeting title or subject';