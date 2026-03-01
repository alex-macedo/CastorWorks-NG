-- Migration: Diagnose and fix template data issues
-- Purpose: Check if template data exists and provide options to fix
-- This can be run manually to diagnose why materials-labor page shows no data

BEGIN;

DO $$
DECLARE
  source_materials_count INTEGER;
  source_labor_count INTEGER;
  target_materials_count INTEGER;
  target_labor_count INTEGER;
BEGIN
  -- Count source data
  SELECT COUNT(*) INTO source_materials_count 
  FROM public.project_materials
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  SELECT COUNT(*) INTO source_labor_count
  FROM public.project_labor
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  -- Count target data
  SELECT COUNT(*) INTO target_materials_count 
  FROM public.simplebudget_materials_template;
  
  SELECT COUNT(*) INTO target_labor_count
  FROM public.simplebudget_labor_template;
  
  RAISE NOTICE '=== Template Data Diagnosis ===';
  RAISE NOTICE 'Source (project_materials): % materials, % labor items', 
    source_materials_count, source_labor_count;
  RAISE NOTICE 'Target (simplebudget_*_template): % materials, % labor items', 
    target_materials_count, target_labor_count;
  
  -- If target is empty but source has data, copy it
  IF target_materials_count = 0 AND source_materials_count > 0 THEN
    RAISE NOTICE 'Copying % materials from source to target...', source_materials_count;
    
    -- Check if fee_desc exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'project_materials' 
        AND column_name = 'fee_desc'
    ) THEN
      INSERT INTO public.simplebudget_materials_template (
        sinapi_code, group_name, description, quantity, unit, price_per_unit,
        freight_percentage, factor, tgfa_applicable, fee_desc, editable, created_at, updated_at
      )
      SELECT 
        sinapi_code, group_name, description, quantity, unit, price_per_unit,
        freight_percentage, factor, tgfa_applicable, fee_desc, editable, created_at, updated_at
      FROM public.project_materials
      WHERE project_id = '00000000-0000-0000-0000-000000000000';
    ELSE
      INSERT INTO public.simplebudget_materials_template (
        sinapi_code, group_name, description, quantity, unit, price_per_unit,
        freight_percentage, factor, tgfa_applicable, editable, created_at, updated_at
      )
      SELECT 
        sinapi_code, group_name, description, quantity, unit, price_per_unit,
        freight_percentage, factor, tgfa_applicable, editable, created_at, updated_at
      FROM public.project_materials
      WHERE project_id = '00000000-0000-0000-0000-000000000000';
    END IF;
    
    GET DIAGNOSTICS target_materials_count = ROW_COUNT;
    RAISE NOTICE 'Copied % materials to target table', target_materials_count;
  END IF;
  
  IF target_labor_count = 0 AND source_labor_count > 0 THEN
    RAISE NOTICE 'Copying % labor items from source to target...', source_labor_count;
    
    INSERT INTO public.simplebudget_labor_template (
      "group", description, total_value, percentage, editable, created_at, updated_at
    )
    SELECT 
      "group", description, total_value, percentage, editable, created_at, updated_at
    FROM public.project_labor
    WHERE project_id = '00000000-0000-0000-0000-000000000000';
    
    GET DIAGNOSTICS target_labor_count = ROW_COUNT;
    RAISE NOTICE 'Copied % labor items to target table', target_labor_count;
  END IF;
  
  -- Final status
  SELECT COUNT(*) INTO target_materials_count FROM public.simplebudget_materials_template;
  SELECT COUNT(*) INTO target_labor_count FROM public.simplebudget_labor_template;
  
  RAISE NOTICE '=== Final Status ===';
  RAISE NOTICE 'Target tables now have: % materials, % labor items', 
    target_materials_count, target_labor_count;
  
  IF target_materials_count = 0 AND target_labor_count = 0 THEN
    RAISE WARNING 'Both template tables are empty. You may need to:';
    RAISE WARNING '1. Run seed migration: 20251214000001_seed_template_materials.sql';
    RAISE WARNING '2. Run seed migration: 20251217233629_insert_template_labor_items.sql';
    RAISE WARNING '3. Then re-run migration: 20250101000001_migrate_template_data.sql';
  END IF;
END $$;

COMMIT;
