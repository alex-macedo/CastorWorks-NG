-- ============================================================================
-- Insert Architect Briefings for Seeding
-- ============================================================================
-- Migration: 20260126121000
-- Description: RPC function to insert architect briefings for seeding, bypassing RLS
-- Uses SECURITY DEFINER to bypass RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_architect_briefings_for_seeding(p_briefings JSONB)
RETURNS SETOF architect_briefings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  briefing_record JSONB;
BEGIN
  FOR briefing_record IN SELECT * FROM jsonb_array_elements(p_briefings)
  LOOP
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
      (briefing_record->>'project_id')::uuid,
      briefing_record->>'client_objectives',
      briefing_record->>'style_preferences',
      (briefing_record->>'budget_range_min')::numeric,
      (briefing_record->>'budget_range_max')::numeric,
      (briefing_record->>'area_m2')::numeric,
      briefing_record->>'must_haves',
      briefing_record->>'constraints',
      COALESCE(briefing_record->'inspirations', '[]'::jsonb),
      briefing_record->>'notes',
      (briefing_record->>'created_by')::uuid
    ) RETURNING *;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) TO authenticated;

COMMENT ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) IS
  'Inserts architect briefings for seeding. Uses SECURITY DEFINER to bypass RLS policies.';
