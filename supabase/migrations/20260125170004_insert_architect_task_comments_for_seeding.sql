-- ============================================================================
-- Insert Architect Task Comments for Seeding
-- ============================================================================
-- Migration: 20260125170004
-- Description: RPC function to insert architect task comments for seeding, bypassing RLS
-- Uses SECURITY DEFINER to bypass RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_architect_task_comments_for_seeding(p_comments JSONB)
RETURNS SETOF architect_task_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_record JSONB;
BEGIN
  -- Loop through each comment in the JSONB array and insert
  FOR comment_record IN SELECT * FROM jsonb_array_elements(p_comments)
  LOOP
    -- Insert comment (bypasses RLS due to SECURITY DEFINER)
    RETURN QUERY
    INSERT INTO architect_task_comments (
      task_id,
      user_id,
      comment,
      created_at
    )
    VALUES (
      (comment_record->>'task_id')::UUID,
      (comment_record->>'user_id')::UUID,
      comment_record->>'comment',
      CASE 
        WHEN comment_record->>'created_at' IS NULL OR comment_record->>'created_at' = 'null' THEN NOW()
        ELSE (comment_record->>'created_at')::TIMESTAMPTZ
      END
    )
    RETURNING *;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_architect_task_comments_for_seeding(JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.insert_architect_task_comments_for_seeding(JSONB) IS 
  'Inserts architect task comments for seeding purposes. Uses SECURITY DEFINER to bypass RLS policies.';
