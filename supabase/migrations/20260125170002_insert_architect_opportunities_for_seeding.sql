-- ============================================================================
-- Insert Architect Opportunities for Seeding
-- ============================================================================
-- Migration: 20260125170002
-- Description: RPC function to insert architect opportunities for seeding, bypassing RLS
-- Uses SECURITY DEFINER to bypass RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_architect_opportunities_for_seeding(p_opportunities JSONB)
RETURNS SETOF architect_opportunities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opp_record JSONB;
BEGIN
  -- Loop through each opportunity in the JSONB array and insert
  FOR opp_record IN SELECT * FROM jsonb_array_elements(p_opportunities)
  LOOP
    -- Insert opportunity (bypasses RLS due to SECURITY DEFINER)
    RETURN QUERY
    INSERT INTO architect_opportunities (
      client_id,
      project_name,
      estimated_value,
      probability,
      stage,
      stage_id,
      expected_closing_date,
      notes,
      created_by
    )
    VALUES (
      (opp_record->>'client_id')::UUID,
      opp_record->>'project_name',
      CASE 
        WHEN opp_record->>'estimated_value' IS NULL OR opp_record->>'estimated_value' = 'null' THEN NULL
        ELSE (opp_record->>'estimated_value')::DECIMAL
      END,
      CASE 
        WHEN opp_record->>'probability' IS NULL OR opp_record->>'probability' = 'null' THEN NULL
        ELSE (opp_record->>'probability')::INTEGER
      END,
      opp_record->>'stage', -- Will be auto-synced by trigger from stage_id
      (opp_record->>'stage_id')::UUID,
      CASE 
        WHEN opp_record->>'expected_closing_date' IS NULL OR opp_record->>'expected_closing_date' = 'null' THEN NULL
        ELSE (opp_record->>'expected_closing_date')::DATE
      END,
      opp_record->>'notes',
      CASE 
        WHEN opp_record->>'created_by' IS NULL OR opp_record->>'created_by' = 'null' THEN NULL
        ELSE (opp_record->>'created_by')::UUID
      END
    )
    RETURNING *;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_architect_opportunities_for_seeding(JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.insert_architect_opportunities_for_seeding(JSONB) IS 
  'Inserts architect opportunities for seeding purposes. Uses SECURITY DEFINER to bypass RLS policies.';
