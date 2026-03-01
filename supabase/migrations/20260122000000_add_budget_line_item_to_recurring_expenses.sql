-- Migration: Add budget_line_item_id to recurring_expense_patterns
-- This allows linking recurring expenses to budget line items from the "Budget WITH Materials" tab

-- Add new column for budget line item reference
ALTER TABLE public.recurring_expense_patterns
ADD COLUMN IF NOT EXISTS budget_line_item_id UUID REFERENCES public.budget_line_items(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_recurring_expense_patterns_budget_line_item_id 
ON public.recurring_expense_patterns(budget_line_item_id);

-- Comment for clarity
COMMENT ON COLUMN public.recurring_expense_patterns.budget_line_item_id IS 'Reference to budget line item from Budget WITH Materials tab';
