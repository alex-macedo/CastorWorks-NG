-- Update architect_meetings table to support rich text content for decisions and next_actions
-- This migration adds support for HTML content in meeting notes

-- Add comments to indicate these fields now store HTML content
COMMENT ON COLUMN architect_meetings.decisions IS 'Meeting decisions in HTML format with rich text support';
COMMENT ON COLUMN architect_meetings.next_actions IS 'Next actions in HTML format with rich text support';