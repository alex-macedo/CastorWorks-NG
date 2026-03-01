-- Add validation for sinapi_project_template_items
-- Migration: 20251224190008_add_template_foreign_key.sql
-- Purpose: Add validation to ensure template items reference valid SINAPI codes
-- Note: Cannot use foreign key constraint because sinapi_code is not unique in sinapi_items
-- (same code can have multiple items with different sinapi_item values)

BEGIN;

-- Create a function to validate that a SINAPI code exists
CREATE OR REPLACE FUNCTION public.validate_sinapi_code_exists(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sinapi_items WHERE sinapi_code = p_code LIMIT 1
  );
END;
$$;

-- Add check constraint to validate SINAPI code exists
-- This ensures template items reference valid codes without requiring uniqueness
-- Use NOT VALID to allow constraint creation even if existing data has violations
-- The constraint will still validate all new inserts/updates
ALTER TABLE public.sinapi_project_template_items
  DROP CONSTRAINT IF EXISTS check_sinapi_code_exists;

ALTER TABLE public.sinapi_project_template_items
  ADD CONSTRAINT check_sinapi_code_exists 
    CHECK (public.validate_sinapi_code_exists(sinapi_code))
    NOT VALID;

-- Optionally validate existing data (will fail if there are violations)
-- Uncomment the line below after ensuring all template codes exist in sinapi_items
-- ALTER TABLE public.sinapi_project_template_items VALIDATE CONSTRAINT check_sinapi_code_exists;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_sinapi_code_exists(TEXT) TO authenticated;

-- Create diagnostic function to find template items with invalid SINAPI codes
CREATE OR REPLACE FUNCTION public.find_invalid_template_codes()
RETURNS TABLE (
  id UUID,
  item_number TEXT,
  sinapi_code TEXT,
  phase_name TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.item_number,
    t.sinapi_code,
    t.phase_name
  FROM public.sinapi_project_template_items t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sinapi_items si WHERE si.sinapi_code = t.sinapi_code LIMIT 1
  )
  ORDER BY t.phase_order, t.display_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_invalid_template_codes() TO authenticated;

COMMENT ON FUNCTION public.find_invalid_template_codes() IS 
  'Returns template items that reference SINAPI codes not found in sinapi_items catalog. Use this to identify and fix data quality issues.';

-- Add comment
COMMENT ON CONSTRAINT check_sinapi_code_exists ON public.sinapi_project_template_items IS 
  'Ensures template items reference valid SINAPI codes. Cannot use foreign key because sinapi_code is not unique (same code can have multiple items). Constraint is NOT VALID to allow existing invalid data, but validates all new inserts/updates.';

COMMIT;

