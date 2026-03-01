-- ============================================================
-- Client Definitions: Add definition_type for categorization
-- (material_selection, design_approval, other)
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_definition_type') THEN
    CREATE TYPE client_definition_type AS ENUM (
      'material_selection',
      'design_approval',
      'other'
    );
  END IF;
END $$;

ALTER TABLE client_definitions
  ADD COLUMN IF NOT EXISTS definition_type client_definition_type DEFAULT 'other';

COMMENT ON COLUMN client_definitions.definition_type IS
  'Category of client decision: material_selection, design_approval, or other';

COMMIT;
