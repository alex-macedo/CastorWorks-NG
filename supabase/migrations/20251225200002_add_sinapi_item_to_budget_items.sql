-- Migration: 20251225200002_add_sinapi_item_to_budget_items.sql
-- Purpose: Add sinapi_item TEXT column to budget_line_items for full traceability

BEGIN;

-- Add sinapi_item column to budget_line_items
ALTER TABLE public.budget_line_items
ADD COLUMN sinapi_item TEXT;

-- Add comment
COMMENT ON COLUMN public.budget_line_items.sinapi_item IS
'Item number from SINAPI catalog. Populated when budget is populated from template. Used with sinapi_code to uniquely identify the SINAPI item.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_budget_line_items_sinapi_item
ON public.budget_line_items(sinapi_item);

COMMIT;
