-- Migration: add_group_name_to_budget_line_items
-- Description: Adds group_name column to budget_line_items to support grouping by category
-- This allows Simple budgets to organize items by group_name (from template tables) similar to Materials/Labor views

BEGIN;

-- Add group_name column to budget_line_items
ALTER TABLE public.budget_line_items
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Add comment
COMMENT ON COLUMN public.budget_line_items.group_name IS
'Group/category name for organizing budget line items. Used for Simple budgets to group materials and labor by category.';

-- Create index for performance when filtering/grouping by group_name
CREATE INDEX IF NOT EXISTS idx_budget_line_items_group_name
ON public.budget_line_items(budget_id, group_name);

COMMIT;
