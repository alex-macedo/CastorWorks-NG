-- ============================================================================
-- Execute deletion with trigger temporarily disabled
-- Created: 2025-01-30
-- Description: Disable trigger, execute deletion, re-enable trigger
-- ============================================================================

-- Disable the trigger temporarily
ALTER TABLE project_task_statuses DISABLE TRIGGER prevent_delete_only_default_status;

-- Execute the deletion
SELECT * FROM delete_architect_projects_safely(ARRAY['Renovação de Hotel Boutique', 'Torre Corporativa Sustentável'], false, true);

-- Re-enable the trigger
ALTER TABLE project_task_statuses ENABLE TRIGGER prevent_delete_only_default_status;
