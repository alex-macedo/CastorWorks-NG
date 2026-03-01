-- Alternative approach: Load missing SINAPI codes from template
-- Instead of removing invalid codes, add them to the catalog with zero costs

BEGIN;

-- Insert missing SINAPI codes from template with default values
INSERT INTO public.sinapi_items (
  sinapi_code,
  sinapi_item,
  sinapi_description,
  sinapi_unit,
  sinapi_material_cost,
  sinapi_labor_cost,
  base_state,
  base_year,
  created_at,
  updated_at
)
SELECT DISTINCT
  t.sinapi_code,
  'Template Item ' || t.item_number,
  'Template item ' || t.item_number || ' - ' || t.phase_name,
  'UN', -- Default unit
  0, -- Zero material cost
  0, -- Zero labor cost
  'SP', -- Default state
  2024, -- Current year
  NOW(),
  NOW()
FROM public.sinapi_project_template_items t
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si
  WHERE si.sinapi_code = t.sinapi_code
);

-- Log what was added
DO $$
DECLARE
  added_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO added_count
  FROM public.sinapi_project_template_items t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sinapi_items si
    WHERE si.sinapi_code = t.sinapi_code
  );

  RAISE NOTICE 'Added % missing SINAPI codes to catalog with zero costs', added_count;
END $$;

COMMIT;