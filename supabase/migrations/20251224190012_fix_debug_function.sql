-- Fix ambiguous column reference in debug function
-- Migration: 20251224190012_fix_debug_function.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.debug_budget_population(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS TABLE (
  item_number TEXT,
  sinapi_code TEXT,
  phase_name TEXT,
  action TEXT,
  reason TEXT,
  sinapi_found BOOLEAN,
  has_costs BOOLEAN,
  material_cost NUMERIC,
  labor_cost NUMERIC,
  state TEXT,
  year INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  template_record RECORD;
  sinapi_data RECORD;
BEGIN
  -- Loop through template items with explicit table aliasing
  FOR template_record IN
    SELECT t.item_number, t.sinapi_code, t.phase_name, t.phase_order, t.display_order
    FROM public.sinapi_project_template_items t
    WHERE t.sinapi_code IS NOT NULL
    ORDER BY t.phase_order, t.display_order
  LOOP
    -- Lookup SINAPI item from catalog with explicit aliasing
    SELECT
      si.sinapi_description,
      si.sinapi_unit,
      si.sinapi_material_cost,
      si.sinapi_labor_cost,
      si.base_state,
      si.base_year
    INTO sinapi_data
    FROM public.sinapi_items si
    WHERE si.sinapi_code = template_record.sinapi_code
      AND si.base_state = 'SP'
    ORDER BY si.base_year DESC NULLS LAST
    LIMIT 1;

    -- If not found with SP, try any state
    IF sinapi_data IS NULL THEN
      SELECT
        si.sinapi_description,
        si.sinapi_unit,
        si.sinapi_material_cost,
        si.sinapi_labor_cost,
        si.base_state,
        si.base_year
      INTO sinapi_data
      FROM public.sinapi_items si
      WHERE si.sinapi_code = template_record.sinapi_code
      ORDER BY si.base_year DESC NULLS LAST, si.base_state
      LIMIT 1;
    END IF;

    -- Determine action and reason
    IF sinapi_data IS NULL THEN
      -- SINAPI code not found
      RETURN QUERY SELECT
        template_record.item_number,
        template_record.sinapi_code,
        template_record.phase_name,
        'SKIPPED'::TEXT,
        'SINAPI code not found in catalog'::TEXT,
        false::BOOLEAN,
        false::BOOLEAN,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::TEXT,
        NULL::INTEGER;
    ELSIF sinapi_data.sinapi_material_cost IS NULL
          AND sinapi_data.sinapi_labor_cost IS NULL THEN
      -- Both costs are NULL
      RETURN QUERY SELECT
        template_record.item_number,
        template_record.sinapi_code,
        template_record.phase_name,
        'SKIPPED'::TEXT,
        'NULL costs for both material and labor'::TEXT,
        true::BOOLEAN,
        false::BOOLEAN,
        sinapi_data.sinapi_material_cost,
        sinapi_data.sinapi_labor_cost,
        sinapi_data.base_state,
        sinapi_data.base_year;
    ELSE
      -- Would be included
      RETURN QUERY SELECT
        template_record.item_number,
        template_record.sinapi_code,
        template_record.phase_name,
        'INCLUDED'::TEXT,
        'Valid costs found (may be zero)'::TEXT,
        true::BOOLEAN,
        true::BOOLEAN,
        sinapi_data.sinapi_material_cost,
        sinapi_data.sinapi_labor_cost,
        sinapi_data.base_state,
        sinapi_data.base_year;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMIT;