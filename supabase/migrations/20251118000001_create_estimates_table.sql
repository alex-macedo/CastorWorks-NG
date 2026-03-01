-- =====================================================
-- Create Estimates Table
-- =====================================================
-- Migration: 20251118000001
-- Description: Core table for AI-generated estimates
-- Dependencies: clients table, projects table
-- =====================================================

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT,
  description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]'::jsonb,

  -- Calculated totals
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,

  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_context JSONB DEFAULT '{}'::jsonb,
  ai_confidence_score DECIMAL(5,2),
  ai_model TEXT,

  -- Lifecycle tracking
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_generated ON estimates(ai_generated) WHERE ai_generated = true;

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_estimates_line_items ON estimates USING GIN(line_items);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_context ON estimates USING GIN(ai_context);

-- =====================================================
-- Comments / Documentation
-- =====================================================

COMMENT ON TABLE estimates IS 'AI-generated and manual construction estimates';
COMMENT ON COLUMN estimates.line_items IS 'Array of line item objects: [{id, category, subcategory, description, quantity, unit, unitPrice, markup, total, notes}]';
COMMENT ON COLUMN estimates.ai_context IS 'AI generation context: {projectType, location, squareFootage, qualityLevel, assumptions[], recommendations[], alternatives[]}';
COMMENT ON COLUMN estimates.ai_confidence_score IS 'AI confidence in estimate accuracy (0-100)';
COMMENT ON COLUMN estimates.parent_estimate_id IS 'Reference to original estimate if this is a versioned copy';

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_estimates_updated_at();

-- Trigger for auto-calculating totals from line items
CREATE OR REPLACE FUNCTION calculate_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  calculated_subtotal DECIMAL(12,2) := 0;
BEGIN
  -- Sum up line item totals
  IF NEW.line_items IS NOT NULL AND jsonb_array_length(NEW.line_items) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.line_items)
    LOOP
      calculated_subtotal := calculated_subtotal + COALESCE((item->>'total')::DECIMAL(12,2), 0);
    END LOOP;
  END IF;

  NEW.subtotal := calculated_subtotal;
  NEW.tax_amount := calculated_subtotal * NEW.tax_rate;
  NEW.total := NEW.subtotal + NEW.tax_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_estimate_totals ON estimates;
CREATE TRIGGER calculate_estimate_totals
  BEFORE INSERT OR UPDATE OF line_items, tax_rate ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_estimate_totals();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
DROP POLICY IF EXISTS "Team members can view project estimates" ON estimates;
DROP POLICY IF EXISTS "Admins can view all estimates" ON estimates;
DROP POLICY IF EXISTS "Users can create own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can delete own draft estimates" ON estimates;

-- Users can view their own estimates
CREATE POLICY "Users can view own estimates"
ON estimates FOR SELECT
USING (user_id = auth.uid());

-- Project team members can view project estimates
CREATE POLICY "Team members can view project estimates"
ON estimates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = estimates.project_id
      AND ptm.user_id = auth.uid()
  )
);

-- Admins can view all estimates
CREATE POLICY "Admins can view all estimates"
ON estimates FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can create their own estimates
CREATE POLICY "Users can create own estimates"
ON estimates FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own draft/sent estimates
CREATE POLICY "Users can update own estimates"
ON estimates FOR UPDATE
USING (
  user_id = auth.uid()
  AND status IN ('draft', 'sent')
)
WITH CHECK (user_id = auth.uid());

-- Users can delete their own draft estimates
CREATE POLICY "Users can delete own draft estimates"
ON estimates FOR DELETE
USING (
  user_id = auth.uid()
  AND status = 'draft'
);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to create a new version of an estimate
CREATE OR REPLACE FUNCTION create_estimate_version(estimate_id UUID)
RETURNS UUID AS $$
DECLARE
  new_estimate_id UUID;
  original_estimate RECORD;
BEGIN
  -- Get original estimate
  SELECT * INTO original_estimate FROM estimates WHERE id = estimate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Create new version
  INSERT INTO estimates (
    user_id, project_id, client_id, version, parent_estimate_id,
    name, description, line_items, tax_rate, markup_percentage,
    ai_generated, ai_context, ai_confidence_score, ai_model
  )
  VALUES (
    original_estimate.user_id,
    original_estimate.project_id,
    original_estimate.client_id,
    original_estimate.version + 1,
    estimate_id,
    original_estimate.name,
    original_estimate.description,
    original_estimate.line_items,
    original_estimate.tax_rate,
    original_estimate.markup_percentage,
    original_estimate.ai_generated,
    original_estimate.ai_context,
    original_estimate.ai_confidence_score,
    original_estimate.ai_model
  )
  RETURNING id INTO new_estimate_id;

  RETURN new_estimate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_estimate_version(UUID) TO authenticated;
