-- ============================================================================
-- Insert Architect Briefings for Seeding (FIXED)
-- ============================================================================
-- Migration: 20260129_fix_architect_briefings_seeding
-- Description: Fixed RPC function to properly handle JSONB project_id casting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_architect_briefings_for_seeding(p_briefings JSONB)
RETURNS SETOF architect_briefings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  briefing_record JSONB;
  v_project_id UUID;
  v_created_by UUID;
BEGIN
  FOR briefing_record IN SELECT * FROM jsonb_array_elements(p_briefings)
  LOOP
    -- Safely extract and cast project_id
    BEGIN
      v_project_id := (briefing_record->>'project_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid project_id format: %', briefing_record->>'project_id';
    END;
    
    -- Safely extract and cast created_by
    BEGIN
      v_created_by := (briefing_record->>'created_by')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_created_by := NULL;
    END;
    
    RETURN QUERY
    INSERT INTO architect_briefings (
      project_id,
      client_objectives,
      style_preferences,
      budget_range_min,
      budget_range_max,
      area_m2,
      must_haves,
      constraints,
      inspirations,
      notes,
      created_by
    ) VALUES (
      v_project_id,
      briefing_record->>'client_objectives',
      briefing_record->>'style_preferences',
      (briefing_record->>'budget_range_min')::numeric,
      (briefing_record->>'budget_range_max')::numeric,
      (briefing_record->>'area_m2')::numeric,
      briefing_record->>'must_haves',
      briefing_record->>'constraints',
      COALESCE(briefing_record->'inspirations', '[]'::jsonb),
      briefing_record->>'notes',
      v_created_by
    ) RETURNING *;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) TO authenticated;

COMMENT ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) IS
  'Inserts architect briefings for seeding with improved error handling. Uses SECURITY DEFINER to bypass RLS policies.';
