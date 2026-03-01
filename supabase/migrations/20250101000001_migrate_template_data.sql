-- Migration: Copy template data from all-zeros UUID to new tables
-- Purpose: Migrate existing template materials and labor from project_materials/project_labor
-- to the new dedicated template tables

BEGIN;

-- First, check if source data exists and log counts
DO $$
DECLARE
  source_materials_count INTEGER;
  source_labor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO source_materials_count 
  FROM public.project_materials
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  SELECT COUNT(*) INTO source_labor_count
  FROM public.project_labor
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  RAISE NOTICE 'Found % template materials and % template labor items in source tables', 
    source_materials_count, source_labor_count;
  
  IF source_materials_count = 0 THEN
    RAISE WARNING 'No template materials found in project_materials. Make sure seed migration has run.';
  END IF;
  
  IF source_labor_count = 0 THEN
    RAISE WARNING 'No template labor found in project_labor. Make sure seed migration has run.';
  END IF;
END $$;

-- Copy materials from all-zeros UUID to new table (only if new table is empty)
-- Note: fee_desc may not exist in project_materials depending on migration order
-- We'll check if the column exists and use dynamic SQL to handle both cases
DO $$
DECLARE
  sql_text TEXT;
  rows_inserted INTEGER;
  existing_count INTEGER;
BEGIN
  -- Check if data already exists in target table
  SELECT COUNT(*) INTO existing_count FROM public.simplebudget_materials_template;
  
  IF existing_count > 0 THEN
    RAISE NOTICE 'simplebudget_materials_template already has % rows, skipping copy', existing_count;
  ELSE
    -- Check if fee_desc column exists in project_materials
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'project_materials' 
        AND column_name = 'fee_desc'
    ) THEN
      -- Column exists, include it in the copy
      sql_text := '
        INSERT INTO public.simplebudget_materials_template (
          sinapi_code, group_name, description, quantity, unit, price_per_unit,
          freight_percentage, factor, tgfa_applicable, fee_desc, editable, created_at, updated_at
        )
        SELECT 
          sinapi_code, group_name, description, quantity, unit, price_per_unit,
          freight_percentage, factor, tgfa_applicable, fee_desc, editable, created_at, updated_at
        FROM public.project_materials
        WHERE project_id = ''00000000-0000-0000-0000-000000000000'';
      ';
    ELSE
      -- Column doesn't exist, copy without fee_desc (will default to NULL)
      sql_text := '
        INSERT INTO public.simplebudget_materials_template (
          sinapi_code, group_name, description, quantity, unit, price_per_unit,
          freight_percentage, factor, tgfa_applicable, editable, created_at, updated_at
        )
        SELECT 
          sinapi_code, group_name, description, quantity, unit, price_per_unit,
          freight_percentage, factor, tgfa_applicable, editable, created_at, updated_at
        FROM public.project_materials
        WHERE project_id = ''00000000-0000-0000-0000-000000000000'';
      ';
    END IF;
    
    EXECUTE sql_text;
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Inserted % materials into simplebudget_materials_template', rows_inserted;
  END IF;
END $$;

-- Copy labor from all-zeros UUID to new table (only if new table is empty)
DO $$
DECLARE
  rows_inserted INTEGER;
  existing_count INTEGER;
BEGIN
  -- Check if data already exists in target table
  SELECT COUNT(*) INTO existing_count FROM public.simplebudget_labor_template;
  
  IF existing_count > 0 THEN
    RAISE NOTICE 'simplebudget_labor_template already has % rows, skipping copy', existing_count;
  ELSE
    INSERT INTO public.simplebudget_labor_template (
      "group", description, total_value, percentage, editable, created_at, updated_at
    )
    SELECT 
      "group", description, total_value, percentage, editable, created_at, updated_at
    FROM public.project_labor
    WHERE project_id = '00000000-0000-0000-0000-000000000000';
    
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Inserted % labor items into simplebudget_labor_template', rows_inserted;
  END IF;
END $$;

-- Verify data was copied and provide helpful error messages
DO $$
DECLARE
  materials_count INTEGER;
  labor_count INTEGER;
  source_materials_count INTEGER;
  source_labor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materials_count FROM public.simplebudget_materials_template;
  SELECT COUNT(*) INTO labor_count FROM public.simplebudget_labor_template;
  
  SELECT COUNT(*) INTO source_materials_count 
  FROM public.project_materials
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  SELECT COUNT(*) INTO source_labor_count
  FROM public.project_labor
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  RAISE NOTICE 'Migration complete: % materials and % labor items in new tables', materials_count, labor_count;
  RAISE NOTICE 'Source data: % materials and % labor items in old tables', source_materials_count, source_labor_count;
  
  IF materials_count = 0 THEN
    IF source_materials_count = 0 THEN
      RAISE WARNING 'No materials in new table and source is empty. The seed migration (20251214000001_seed_template_materials.sql) should populate the source, then re-run this migration.';
    ELSE
      RAISE WARNING 'No materials in new table but source has % items. Migration may have failed or data was already migrated and deleted.', source_materials_count;
    END IF;
  END IF;
  
  IF labor_count = 0 THEN
    IF source_labor_count = 0 THEN
      RAISE WARNING 'No labor items in new table and source is empty. The seed migration (20251217233629_insert_template_labor_items.sql) should populate the source, then re-run this migration.';
    ELSE
      RAISE WARNING 'No labor items in new table but source has % items. Migration may have failed or data was already migrated and deleted.', source_labor_count;
    END IF;
  END IF;
END $$;

COMMIT;
