-- Migration: Remove unused budget_template_phases query
-- Issue: budget_template_phases.sort_order column doesn't exist and table is always empty (0 phases returned)
-- Solution: Remove the phases query from getTemplate since it's not used by the budget-templates UI

BEGIN;

-- No database changes needed - code change only removes the unused query

COMMIT;
