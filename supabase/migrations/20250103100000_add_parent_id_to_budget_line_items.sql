-- Migration: 20250103100000_add_parent_id_to_budget_line_items.sql
-- Purpose: Add parent_id column to budget_line_items to preserve WBS hierarchy groups

BEGIN;

-- Add parent_id column to budget_line_items if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_line_items' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.budget_line_items
    ADD COLUMN parent_id UUID REFERENCES public.budget_line_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_budget_line_items_parent_id ON public.budget_line_items(parent_id);

-- Add item_type column to distinguish between groups and leaf items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_line_items' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE public.budget_line_items
    ADD COLUMN item_type TEXT DEFAULT 'leaf';
  END IF;
END $$;

-- Create index for item_type
CREATE INDEX IF NOT EXISTS idx_budget_line_items_item_type ON public.budget_line_items(item_type);

COMMIT;

