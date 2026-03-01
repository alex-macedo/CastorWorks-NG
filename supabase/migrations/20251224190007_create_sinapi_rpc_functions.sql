-- Create RPC functions for sinapi_items table
-- Migration: 20251224190007_create_sinapi_rpc_functions.sql
-- Purpose: Create search and lookup functions for the new sinapi_items table

BEGIN;

-- Create function to search sinapi_items by text
CREATE OR REPLACE FUNCTION public.search_sinapi_items(search_term TEXT, limit_results INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  sinapi_code TEXT,
  sinapi_item TEXT,
  sinapi_description TEXT,
  sinapi_unit TEXT,
  sinapi_material_cost NUMERIC,
  sinapi_labor_cost NUMERIC,
  sinapi_type TEXT,
  base_year INTEGER,
  base_state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.sinapi_code,
    si.sinapi_item,
    si.sinapi_description,
    si.sinapi_unit,
    si.sinapi_material_cost,
    si.sinapi_labor_cost,
    si.sinapi_type,
    si.base_year,
    si.base_state
  FROM public.sinapi_items si
  WHERE
    (
      -- Full-text search on Portuguese content
      si.search_vector @@ to_tsquery('pg_catalog.portuguese', websearch_to_tsquery('pg_catalog.portuguese', search_term)::text)
      OR
      -- Exact code match
      si.sinapi_code ILIKE '%' || search_term || '%'
      OR
      -- Item number match
      si.sinapi_item ILIKE '%' || search_term || '%'
      OR
      -- Description match
      si.sinapi_description ILIKE '%' || search_term || '%'
    )
  ORDER BY
    -- Prioritize exact code matches
    CASE WHEN si.sinapi_code = search_term THEN 0 ELSE 1 END,
    -- Then relevance score from full-text search
    ts_rank(si.search_vector, to_tsquery('pg_catalog.portuguese', websearch_to_tsquery('pg_catalog.portuguese', search_term)::text)) DESC,
    -- Then alphabetically
    si.sinapi_description ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get sinapi_item by code
CREATE OR REPLACE FUNCTION public.get_sinapi_item_by_code(item_code TEXT)
RETURNS TABLE (
  id UUID,
  sinapi_code TEXT,
  sinapi_item TEXT,
  sinapi_description TEXT,
  sinapi_unit TEXT,
  sinapi_material_cost NUMERIC,
  sinapi_labor_cost NUMERIC,
  sinapi_type TEXT,
  base_year INTEGER,
  base_state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.sinapi_code,
    si.sinapi_item,
    si.sinapi_description,
    si.sinapi_unit,
    si.sinapi_material_cost,
    si.sinapi_labor_cost,
    si.sinapi_type,
    si.base_year,
    si.base_state
  FROM public.sinapi_items si
  WHERE si.sinapi_code = item_code
  ORDER BY base_year DESC NULLS LAST, base_state
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_sinapi_items(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sinapi_item_by_code(TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.search_sinapi_items(TEXT, INT) IS 
  'Search sinapi_items catalog by code, item number, or description using full-text search. Returns up to limit_results items.';

COMMENT ON FUNCTION public.get_sinapi_item_by_code(TEXT) IS 
  'Retrieve a single SINAPI item by its code. Returns the most recent year/state if multiple matches exist.';

COMMIT;

