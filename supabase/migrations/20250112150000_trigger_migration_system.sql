-- ============================================================================
-- Dummy Migration - Trigger Migration System
-- ============================================================================
-- Purpose: This migration does nothing but triggers Lovable's migration system
--          to apply all pending migrations. This is a workaround to force
--          migration execution when migrations are being held.
--
-- Created: 2025-01-12
-- ============================================================================

-- This is a no-op migration that does nothing
-- It exists solely to trigger the migration system to process all pending migrations

DO $$
BEGIN
    -- Log that this migration ran (harmless operation)
    RAISE NOTICE 'Migration trigger executed at %', NOW();
END $$;

-- No actual schema changes - this is intentional
-- The migration system will process this and apply any pending migrations

