-- Migration: Drop Physical-Financial orphans
-- Description: Removes database objects that were only used for the Physical-Financial schedule feature

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_update_project_measurements_updated_at ON project_measurements;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_evm_metrics(UUID, DATE);
DROP FUNCTION IF EXISTS update_project_measurements_updated_at();

-- Drop table
DROP TABLE IF EXISTS project_measurements;

COMMIT;
