-- ============================================================================
-- Delete ALL architect opportunities
-- Created: 2025-01-30
-- Description: Clean up all remaining architect opportunities from the database
-- ============================================================================

-- Delete all architect opportunities
DELETE FROM architect_opportunities;

-- Verify deletion
SELECT COUNT(*) as remaining_opportunities FROM architect_opportunities;
