-- =====================================================
-- TRIGGER PENDING MIGRATIONS
-- =====================================================
-- Migration: 20251119142333
-- Description: No-op migration to trigger Lovable to run all pending migrations
-- Purpose: This migration file exists solely to ensure the migration system
--          recognizes new migrations and runs any pending ones.
-- =====================================================

-- Harmless DO block that does nothing but ensures migration is executed
DO $$
BEGIN
  -- This is a no-op migration to trigger pending migrations
  -- It performs no database changes but ensures the migration system
  -- processes this file and any pending migrations before it
  NULL;
END $$;

