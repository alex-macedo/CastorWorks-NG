-- Add position field to roadmap_items for ordering within columns
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS position INTEGER;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status_position ON roadmap_items(status, position);

-- Initialize positions for existing items (ordered by created_at)
WITH ranked_items AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) - 1 AS new_position
  FROM roadmap_items
)
UPDATE roadmap_items
SET position = ranked_items.new_position
FROM ranked_items
WHERE roadmap_items.id = ranked_items.id;

-- Create function to get next position in a status column
CREATE OR REPLACE FUNCTION get_next_position(target_status text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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