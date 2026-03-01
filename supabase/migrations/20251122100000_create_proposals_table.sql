-- =====================================================
-- Create Proposals Table
-- =====================================================
-- Migration: 20251122100000
-- Description: Proposals table for transforming estimates into client-ready documents
-- Dependencies: estimates table, auth.users
-- Epic: AEP-E07 (Week 7: Proposal Builder)
-- =====================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected')),

  -- Template selection
  template_name TEXT DEFAULT 'standard' CHECK (template_name IN ('standard', 'modern', 'detailed')),

  -- Content sections (editable text areas)
  cover_letter TEXT,
  scope_of_work TEXT,
  exclusions TEXT,
  payment_terms TEXT,
  timeline TEXT,
  warranty TEXT,
  terms_and_conditions TEXT,

  -- Track which sections were AI-generated
  ai_generated_sections JSONB DEFAULT '{}'::jsonb,

  -- Digital signature data
  signature_data TEXT, -- Base64 encoded image
  signed_by TEXT,
  signed_at TIMESTAMPTZ,

  -- Lifecycle timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Public access token for client viewing
  public_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist even if the table was created before this migration
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS template_name TEXT NOT NULL DEFAULT 'standard'
    CHECK (template_name IN ('standard', 'modern', 'detailed')),
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
  ADD COLUMN IF NOT EXISTS exclusions TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS warranty TEXT,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_sections JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signature_data TEXT,
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON proposals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON proposals(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_proposals_ai_generated_sections ON proposals USING GIN(ai_generated_sections);

-- =====================================================
-- Comments / Documentation
-- =====================================================

COMMENT ON TABLE proposals IS 'Client-ready proposals generated from estimates';
COMMENT ON COLUMN proposals.ai_generated_sections IS 'Track which sections were AI-generated: {cover_letter: true, scope_of_work: true, ...}';
COMMENT ON COLUMN proposals.public_token IS 'Secure token for public viewing without authentication';
COMMENT ON COLUMN proposals.signature_data IS 'Base64 encoded PNG image of client signature';

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Users can view their own proposals
DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
CREATE POLICY "Users can view own proposals"
ON proposals FOR SELECT
USING (user_id = auth.uid());

-- Public can view proposals by token
DROP POLICY IF EXISTS "Public can view proposals by token" ON proposals;
CREATE POLICY "Public can view proposals by token"
ON proposals FOR SELECT
USING (public_token IS NOT NULL);

-- Users can create their own proposals
DROP POLICY IF EXISTS "Users can create own proposals" ON proposals;
CREATE POLICY "Users can create own proposals"
ON proposals FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own proposals
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals"
ON proposals FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own draft proposals
DROP POLICY IF EXISTS "Users can delete own draft proposals" ON proposals;
CREATE POLICY "Users can delete own draft proposals"
ON proposals FOR DELETE
USING (
  user_id = auth.uid()
  AND status = 'draft'
);

-- Admins can view all proposals
DROP POLICY IF EXISTS "Admins can view all proposals" ON proposals;
CREATE POLICY "Admins can view all proposals"
ON proposals FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to generate secure public token
CREATE OR REPLACE FUNCTION generate_proposal_public_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 64 character random string
  FOR i IN 1..64 LOOP
    result := result || substr(chars, 1 + (random() * (length(chars) - 1))::INTEGER, 1);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_proposal_public_token() TO authenticated;

-- =====================================================
-- Validation
-- =====================================================

-- Ensure proposal references valid estimate
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS fk_proposals_estimate;
ALTER TABLE proposals
  ADD CONSTRAINT fk_proposals_estimate
  FOREIGN KEY (estimate_id)
  REFERENCES estimates(id)
  ON DELETE CASCADE;

-- Ensure user owns the estimate
CREATE OR REPLACE FUNCTION validate_proposal_estimate_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM estimates
    WHERE id = NEW.estimate_id
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User does not own the referenced estimate';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_proposal_estimate_ownership ON proposals;
CREATE TRIGGER validate_proposal_estimate_ownership
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION validate_proposal_estimate_ownership();
