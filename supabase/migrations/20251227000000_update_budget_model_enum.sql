-- Update budget_model column to support new values: simple, bdi_brazil, cost_control

-- Note: PostgreSQL doesn't support ALTER TYPE for enum values in TEXT columns
-- Since budget_model is defined as TEXT, we just need to ensure the application
-- validates the values correctly. No database-level constraint change is needed.

-- Add comment to document the valid values
COMMENT ON COLUMN public.projects.budget_model IS 'Budget model type: simple, bdi_brazil, or cost_control';
COMMENT ON COLUMN public.app_settings.default_budget_model IS 'Default budget model type: simple, bdi_brazil, or cost_control';
