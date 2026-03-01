-- Migration: 20251225200000_add_sinapi_item_to_template.sql
-- Purpose: Add sinapi_item TEXT column to sinapi_project_template_items
--          and populate from sinapi_items by matching sinapi_code and sinapi_description

BEGIN;

-- 1. Add sinapi_item column to sinapi_project_template_items
ALTER TABLE public.sinapi_project_template_items
ADD COLUMN sinapi_item TEXT;

-- 2. Populate sinapi_item by joining with sinapi_items
-- Strategy: Use get_sinapi_item_for_template to find the best matching item
-- then extract the sinapi_item field from that match
UPDATE public.sinapi_project_template_items template
SET sinapi_item = (
  SELECT si.sinapi_item
  FROM public.get_sinapi_item_for_template(template.sinapi_code, NULL) si
  LIMIT 1
)
WHERE sinapi_item IS NULL
  AND template.sinapi_code IS NOT NULL;

-- 3. Log how many items were matched
DO $$
DECLARE
  matched_count INTEGER;
  unmatched_count INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE sinapi_item IS NOT NULL),
    COUNT(*) FILTER (WHERE sinapi_item IS NULL)
  INTO matched_count, unmatched_count
  FROM public.sinapi_project_template_items;

  RAISE NOTICE '[migration] SINAPI template items: % have sinapi_item populated, % unmatched',
    matched_count, unmatched_count;
END;
$$;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_sinapi_template_sinapi_item
ON public.sinapi_project_template_items(sinapi_item);

-- 5. Add comment
COMMENT ON COLUMN public.sinapi_project_template_items.sinapi_item IS
'Item number from SINAPI catalog (e.g., "1", "2", "3"). Populated by matching sinapi_code with sinapi_items using get_sinapi_item_for_template().';

COMMIT;
