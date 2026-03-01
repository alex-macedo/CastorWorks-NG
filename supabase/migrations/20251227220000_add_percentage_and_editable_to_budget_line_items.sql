-- Migration: add_percentage_and_editable_to_budget_line_items
-- Description: Adds percentage and editable columns to budget_line_items to support labor items display
-- Labor items from simplebudget_labor_template have percentage and editable fields that need to be preserved

BEGIN;

-- Add percentage column for labor items
ALTER TABLE public.budget_line_items
ADD COLUMN IF NOT EXISTS percentage NUMERIC;

-- Add editable column for labor items
ALTER TABLE public.budget_line_items
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN public.budget_line_items.percentage IS
'Percentage value for labor items (from simplebudget_labor_template). Used for calculating labor costs as percentage of total.';

COMMENT ON COLUMN public.budget_line_items.editable IS
'Whether the budget line item can be edited by users. Defaults to true.';

COMMIT;
