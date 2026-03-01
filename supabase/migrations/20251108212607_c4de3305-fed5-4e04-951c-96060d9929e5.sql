-- Add dependencies column to roadmap_items
ALTER TABLE public.roadmap_items 
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;

-- Create index for faster dependency lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_items_dependencies ON public.roadmap_items USING GIN(dependencies);

-- Add function to check if all dependencies are completed
CREATE OR REPLACE FUNCTION public.check_roadmap_dependencies(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  item_dependencies JSONB;
  dependency_id UUID;
  is_completed BOOLEAN;
BEGIN
  -- Get dependencies for the item
  SELECT dependencies INTO item_dependencies
  FROM public.roadmap_items
  WHERE id = item_id;

  -- If no dependencies, return true
  IF item_dependencies IS NULL OR jsonb_array_length(item_dependencies) = 0 THEN
    RETURN TRUE;
  END IF;

  -- Check each dependency
  FOR dependency_id IN 
    SELECT jsonb_array_elements_text(item_dependencies)::UUID
  LOOP
    -- Check if dependency is completed
    SELECT (status = 'done') INTO is_completed
    FROM public.roadmap_items
    WHERE id = dependency_id;

    -- If any dependency is not completed, return false
    IF NOT is_completed THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;