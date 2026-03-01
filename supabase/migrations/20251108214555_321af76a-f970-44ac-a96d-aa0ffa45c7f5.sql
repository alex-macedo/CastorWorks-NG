-- Fix search_path for get_next_position function
CREATE OR REPLACE FUNCTION get_next_position(target_status text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_pos integer;
BEGIN
  SELECT COALESCE(MAX(position), -1) INTO max_pos
  FROM roadmap_items
  WHERE status = target_status;
  
  RETURN max_pos + 1;
END;
$$;