-- ============================================================================
-- CastorWorks Architect Module - Custom Pipeline Statuses
-- Created: 2025-11-21
-- Description: Add support for configurable pipeline statuses/columns
-- ============================================================================

-- ============================================================================
-- 1. PIPELINE STATUSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_pipeline_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280', -- Hex color code
  position INTEGER NOT NULL DEFAULT 0, -- For ordering columns
  is_default BOOLEAN DEFAULT false, -- Default stages that can't be deleted
  is_terminal BOOLEAN DEFAULT false, -- Terminal states like 'won' or 'lost'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_pipeline_statuses_position ON architect_pipeline_statuses(position);

-- ============================================================================
-- 2. UPDATE OPPORTUNITIES TABLE
-- ============================================================================

-- Remove the CHECK constraint on stage to allow custom statuses
ALTER TABLE architect_opportunities
  DROP CONSTRAINT IF EXISTS architect_opportunities_stage_check;

-- Add foreign key to statuses table (we'll migrate existing data first)
-- This will be done after seeding default statuses

-- ============================================================================
-- 3. SEED DEFAULT STATUSES
-- ============================================================================

INSERT INTO architect_pipeline_statuses (name, color, position, is_default, is_terminal) VALUES
  ('initial_contact', '#3B82F6', 0, true, false),    -- Blue
  ('briefing', '#8B5CF6', 1, true, false),            -- Purple
  ('proposal_sent', '#F59E0B', 2, true, false),       -- Amber
  ('negotiation', '#10B981', 3, true, false),         -- Green
  ('won', '#22C55E', 4, true, true),                  -- Success green
  ('lost', '#EF4444', 5, true, true)                  -- Red
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. ADD STAGE_ID TO OPPORTUNITIES
-- ============================================================================

-- Add the new column
ALTER TABLE architect_opportunities
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES architect_pipeline_statuses(id) ON DELETE RESTRICT;

-- Migrate existing stage values to stage_id
UPDATE architect_opportunities opp
SET stage_id = stat.id
FROM architect_pipeline_statuses stat
WHERE opp.stage = stat.name
  AND opp.stage_id IS NULL;

-- Make stage_id NOT NULL after migration
ALTER TABLE architect_opportunities
  ALTER COLUMN stage_id SET NOT NULL;

-- Keep stage column for backward compatibility (will be auto-populated via trigger)
-- This ensures existing code doesn't break

-- ============================================================================
-- 5. CREATE TRIGGER TO SYNC STAGE WITH STAGE_ID
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_opportunity_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- When stage_id changes, update stage name
  IF NEW.stage_id IS NOT NULL THEN
    SELECT name INTO NEW.stage
    FROM architect_pipeline_statuses
    WHERE id = NEW.stage_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_opportunity_stage ON architect_opportunities;
CREATE TRIGGER trigger_sync_opportunity_stage
  BEFORE INSERT OR UPDATE OF stage_id ON architect_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION sync_opportunity_stage();

-- ============================================================================
-- 6. UPDATE RLS POLICIES
-- ============================================================================

-- Enable RLS on statuses table
ALTER TABLE architect_pipeline_statuses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read statuses
DROP POLICY IF EXISTS "Allow authenticated users to read pipeline statuses" ON architect_pipeline_statuses;
CREATE POLICY "Allow authenticated users to read pipeline statuses"
  ON architect_pipeline_statuses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create custom statuses
DROP POLICY IF EXISTS "Allow authenticated users to create pipeline statuses" ON architect_pipeline_statuses;
CREATE POLICY "Allow authenticated users to create pipeline statuses"
  ON architect_pipeline_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update non-default statuses
DROP POLICY IF EXISTS "Allow authenticated users to update non-default pipeline statuses" ON architect_pipeline_statuses;
CREATE POLICY "Allow authenticated users to update non-default pipeline statuses"
  ON architect_pipeline_statuses
  FOR UPDATE
  TO authenticated
  USING (is_default = false)
  WITH CHECK (is_default = false);

-- Allow authenticated users to delete non-default statuses
DROP POLICY IF EXISTS "Allow authenticated users to delete non-default pipeline statuses" ON architect_pipeline_statuses;
CREATE POLICY "Allow authenticated users to delete non-default pipeline statuses"
  ON architect_pipeline_statuses
  FOR DELETE
  TO authenticated
  USING (is_default = false);

-- Update opportunities RLS to work with new structure
DROP POLICY IF EXISTS "Allow users to view opportunities" ON architect_opportunities;
CREATE POLICY "Allow users to view opportunities" ON architect_opportunities
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );

DROP POLICY IF EXISTS "Allow users to create opportunities" ON architect_opportunities;
CREATE POLICY "Allow users to create opportunities" ON architect_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );

DROP POLICY IF EXISTS "Allow users to update opportunities" ON architect_opportunities;
CREATE POLICY "Allow users to update opportunities" ON architect_opportunities
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );

DROP POLICY IF EXISTS "Allow users to delete opportunities" ON architect_opportunities;
CREATE POLICY "Allow users to delete opportunities" ON architect_opportunities
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============================================================================
-- 7. ADD UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_architect_pipeline_statuses_updated_at ON architect_pipeline_statuses;
CREATE TRIGGER update_architect_pipeline_statuses_updated_at
  BEFORE UPDATE ON architect_pipeline_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
