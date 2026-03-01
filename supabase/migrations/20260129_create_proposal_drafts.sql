CREATE TABLE proposal_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  briefing_id UUID REFERENCES architect_briefings(id),
  estimate_id UUID REFERENCES estimates(id),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  sections TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE proposal_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own drafts" ON proposal_drafts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drafts" ON proposal_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON proposal_drafts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON proposal_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_proposal_drafts_user_id ON proposal_drafts(user_id);
CREATE INDEX idx_proposal_drafts_project_id ON proposal_drafts(project_id);
CREATE INDEX idx_proposal_drafts_updated_at ON proposal_drafts(updated_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposal_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proposal_drafts_updated_at
  BEFORE UPDATE ON proposal_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_drafts_updated_at();
