-- Add auto-budget creation settings per budget model
-- Allows admins to control automatic budget creation for each budget model type

BEGIN;

-- Add auto-creation settings columns to app_settings table
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS auto_create_simple_budget BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_create_bdi_brazil_budget BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_create_cost_control_budget BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.app_settings.auto_create_simple_budget IS 'Automatically create simple budgets when projects are created';
COMMENT ON COLUMN public.app_settings.auto_create_bdi_brazil_budget IS 'Automatically create BDI Brazil budgets when projects are created';
COMMENT ON COLUMN public.app_settings.auto_create_cost_control_budget IS 'Automatically create cost control budgets when projects are created';

COMMIT;
