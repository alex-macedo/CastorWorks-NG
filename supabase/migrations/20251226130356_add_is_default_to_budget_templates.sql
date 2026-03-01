-- Add is_default and is_system columns to budget_templates
ALTER TABLE public.budget_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Create unique index to ensure only one default per budget_type and company
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_templates_default_type_unique
ON public.budget_templates (company_id, budget_type, is_default)
WHERE is_default = true;
