-- Drop old SINAPI tables after migration to new structure
-- Migration: 20251224190006_drop_old_sinapi_tables.sql
-- Purpose: Remove old sinapi_catalog and sinapi_line_items_template tables

BEGIN;

-- Drop old RPC functions first (they reference the old tables)
DROP FUNCTION IF EXISTS public.search_sinapi_catalog(TEXT, INT);
DROP FUNCTION IF EXISTS public.get_sinapi_item(TEXT);

-- Drop old tables (CASCADE will handle any remaining dependencies)
DROP TABLE IF EXISTS public.sinapi_line_items_template CASCADE;
DROP TABLE IF EXISTS public.sinapi_catalog CASCADE;

-- Note: budget_line_items table keeps its current structure (denormalized)
-- It stores description, unit, unit_cost_material, unit_cost_labor for performance
-- These can be joined with sinapi_items when needed, but are kept denormalized for speed

COMMIT;

