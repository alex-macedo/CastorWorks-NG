-- AI Transcription Implementation
-- Adds database schema for audio transcription, notes, and summaries

-- Add transcription-related fields to daily_logs
ALTER TABLE daily_logs
ADD COLUMN transcript TEXT,
ADD COLUMN transcript_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN transcription_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN transcription_error TEXT,
ADD COLUMN transcription_started_at TIMESTAMPTZ,
ADD COLUMN transcription_completed_at TIMESTAMPTZ,
ADD COLUMN summary TEXT,
ADD COLUMN summary_generated_at TIMESTAMPTZ;

-- Create daily_log_notes table for extracted key points
CREATE TABLE daily_log_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  notes JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on daily_log_notes
ALTER TABLE daily_log_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view notes for daily logs they have access to
CREATE POLICY "Users can view daily_log_notes" ON daily_log_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = daily_log_notes.daily_log_id
    )
  );

-- Create indexes for performance
CREATE INDEX daily_log_notes_daily_log_id ON daily_log_notes(daily_log_id);
CREATE INDEX daily_log_notes_project_id ON daily_log_notes(project_id);
CREATE INDEX daily_logs_transcription_status ON daily_logs(transcription_status);
CREATE INDEX daily_logs_transcript ON daily_logs(transcript);
