-- ============================================================================
-- Fix Proposal Hash Trigger - Use pgcrypto Extension
-- ============================================================================
-- Migration: 20260125170003
-- Description: Ensure pgcrypto extension is enabled and fix generate_proposal_hash trigger
-- ============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix the generate_proposal_hash function to ensure it works
CREATE OR REPLACE FUNCTION generate_proposal_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_hash IS NULL THEN
    -- Use pgcrypto's gen_random_bytes function
    NEW.public_hash := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS generate_proposal_hash ON proposals;
CREATE TRIGGER generate_proposal_hash
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION generate_proposal_hash();

-- Add comment
COMMENT ON FUNCTION generate_proposal_hash() IS 
  'Generates a secure random hash for public proposal viewing. Requires pgcrypto extension.';
