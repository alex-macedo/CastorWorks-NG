-- Phase 3: Chat Enhancements - Reactions and Threading
-- Created: 2026-02-01

BEGIN;

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_message_id UUID NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id)
);

-- Add thread_count to project_messages
ALTER TABLE project_messages
ADD COLUMN IF NOT EXISTS thread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES project_messages(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_parent ON message_threads(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_parent ON project_messages(parent_message_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their projects"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_messages pm
      WHERE pm.id = message_reactions.message_id
      AND has_project_access(auth.uid(), pm.project_id)
    )
  );

CREATE POLICY "Users can add reactions to project messages"
  ON message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM project_messages pm
      WHERE pm.id = message_reactions.message_id
      AND has_project_access(auth.uid(), pm.project_id)
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for message_threads
CREATE POLICY "Users can view threads in their projects"
  ON message_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_messages pm
      WHERE pm.id = message_threads.parent_message_id
      AND has_project_access(auth.uid(), pm.project_id)
    )
  );

CREATE POLICY "Users can create threads in project messages"
  ON message_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_messages pm
      WHERE pm.id = message_threads.parent_message_id
      AND has_project_access(auth.uid(), pm.project_id)
    )
  );

-- Function to update thread count
CREATE OR REPLACE FUNCTION update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE project_messages
    SET thread_count = thread_count + 1
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE project_messages
    SET thread_count = thread_count - 1
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update thread count
DROP TRIGGER IF EXISTS update_thread_count_trigger ON message_threads;
CREATE TRIGGER update_thread_count_trigger
  AFTER INSERT OR DELETE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_count();

COMMIT;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Phase 3: Message reactions and threading schema created successfully';
END $$;
