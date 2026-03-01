
-- Add budget_model to app_settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS default_budget_model TEXT DEFAULT 'simple';

-- Add budget_model to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS budget_model TEXT DEFAULT 'simple';

-- Update active projects to 'simple' if they don't have it
UPDATE public.projects SET budget_model = 'simple' WHERE budget_model IS NULL;
