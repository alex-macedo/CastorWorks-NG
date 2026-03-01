-- ============================================================================
-- Fix Architect Briefings Seeding - Bypass RLS with SECURITY DEFINER
-- ============================================================================
-- Migration: 20260129_fix_architect_briefings_rls
-- Description: Fixed RPC function that bypasses RLS for seeding architect briefings
-- IMPORTANT: This must be run by the database owner (postgres or superuser)
-- ============================================================================

-- Drop existing function to ensure clean recreation
DROP FUNCTION IF EXISTS public.insert_architect_briefings_for_seeding(JSONB);

-- Create fixed function with proper error handling
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
    -- Extract project_id safely
    BEGIN
      v_project_id := (briefing_record->>'project_id')::uuid;
      IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'project_id cannot be null';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid project_id format: %', briefing_record->>'project_id';
    END;
    
    -- Extract created_by safely (allow null)
    BEGIN
      IF briefing_record->>'created_by' IS NOT NULL AND briefing_record->>'created_by' != '' THEN
        v_created_by := (briefing_record->>'created_by')::uuid;
      ELSE
        v_created_by := NULL;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      v_created_by := NULL;
    END;
    
    -- Insert the briefing (SECURITY DEFINER bypasses RLS)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.insert_architect_briefings_for_seeding(JSONB) IS
  'Inserts architect briefings for seeding. Uses SECURITY DEFINER to bypass RLS policies. Fixed version with proper null handling.';

-- Verify function was created
SELECT 
  proname,
  prosecdef,
  proowner::regrole
FROM pg_proc 
WHERE proname = 'insert_architect_briefings_for_seeding';
