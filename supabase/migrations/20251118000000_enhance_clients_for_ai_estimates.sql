-- =====================================================
-- Enhance Clients Table for AI Estimating Platform
-- =====================================================
-- Migration: 20251118000000
-- Description: Add fields required for AI estimate generation
-- Tables Modified: clients
-- New Fields: user_id, address, notes, tags, lead_source
-- =====================================================

-- Add missing fields to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Create index for user_id (performance)
CREATE INDEX IF NOT EXISTS idx_clients_user_id_ai ON clients(user_id);

-- Create index for tags (for filtering)
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);

-- Backfill user_id from existing data if possible
-- NOTE: This assumes each client belongs to the organization's admin user
-- You may need to adjust this logic based on your data model
DO $$
BEGIN
  -- Only backfill if user_id is NULL and there's a pattern to determine the owner
  -- This is a placeholder - adjust based on your actual data structure
  UPDATE clients
  SET user_id = (
    SELECT user_id FROM projects WHERE projects.client_id = clients.id LIMIT 1
  )
  WHERE user_id IS NULL
    AND EXISTS (SELECT 1 FROM projects WHERE projects.client_id = clients.id);
END $$;

-- Update RLS policies to include user_id checks
-- Note: Existing policies from migration 20251109162910 already handle client access
-- We're just ensuring user_id is considered

-- Update the "Users can view clients for accessible projects" policy
-- to also allow users to see their own clients
DROP POLICY IF EXISTS "Users can view clients for accessible projects" ON clients;

CREATE POLICY "Users can view clients for accessible projects"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'admin') -- Admins see all
  OR
  has_role(auth.uid(), 'project_manager') -- PMs see all
  OR
  user_id = auth.uid() -- Users see their own clients
  OR
  -- Regular users can see clients of projects they're members of
  EXISTS (
    SELECT 1 FROM projects p
    JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE p.client_id = clients.id
      AND ptm.user_id = auth.uid()
  )
);

-- Comment on new fields
COMMENT ON COLUMN clients.user_id IS 'Owner/creator of the client record (for AI estimates)';
COMMENT ON COLUMN clients.address IS 'Full address for project location context';
COMMENT ON COLUMN clients.notes IS 'Free-form notes about the client';
COMMENT ON COLUMN clients.tags IS 'Array of tags for categorization (e.g., ["commercial", "repeat-customer"])';
COMMENT ON COLUMN clients.lead_source IS 'Where the lead came from (e.g., "referral", "website", "trade show")';

-- =====================================================
-- Verification Query (run after migration)
-- =====================================================
-- SELECT
--   COUNT(*) as total_clients,
--   COUNT(user_id) as clients_with_user_id,
--   COUNT(address) as clients_with_address
-- FROM clients;
