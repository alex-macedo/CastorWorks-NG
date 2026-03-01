-- Add meeting_link column to architect_meetings table
-- This column stores Zoom, Google Meet, or Teams meeting links

ALTER TABLE IF EXISTS architect_meetings
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add comment to document the column
DO $guard_architect_meetings_comment$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'architect_meetings' AND n.nspname = 'public'
  ) THEN
    COMMENT ON COLUMN architect_meetings.meeting_link IS 'Meeting link for Zoom, Google Meet, or Microsoft Teams';
  END IF;
END;
$guard_architect_meetings_comment$;
