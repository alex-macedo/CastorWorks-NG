-- Migration: Verify template data exists and diagnose issues
-- Purpose: Diagnostic migration to check if template tables have data and identify RLS issues

BEGIN;

-- Check current data counts
DO $$
DECLARE
  materials_count INTEGER;
  labor_count INTEGER;
  materials_sample RECORD;
  labor_sample RECORD;
BEGIN
  -- Count materials
  SELECT COUNT(*) INTO materials_count FROM public.simplebudget_materials_template;
  
  -- Count labor
  SELECT COUNT(*) INTO labor_count FROM public.simplebudget_labor_template;
  
  RAISE NOTICE '=== Template Data Verification ===';
  RAISE NOTICE 'Materials count: %', materials_count;
  RAISE NOTICE 'Labor count: %', labor_count;
  
  -- Sample first material if exists
  IF materials_count > 0 THEN
    SELECT * INTO materials_sample FROM public.simplebudget_materials_template LIMIT 1;
    RAISE NOTICE 'Sample material: % - %', materials_sample.group_name, materials_sample.description;
  ELSE
    RAISE WARNING 'Materials template table is EMPTY!';
  END IF;
  
  -- Sample first labor item if exists
  IF labor_count > 0 THEN
    SELECT * INTO labor_sample FROM public.simplebudget_labor_template LIMIT 1;
    RAISE NOTICE 'Sample labor: % - %', labor_sample."group", labor_sample.description;
  ELSE
    RAISE WARNING 'Labor template table is EMPTY!';
  END IF;
  
  -- Check RLS policies
  RAISE NOTICE '=== RLS Policy Check ===';
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'simplebudget_materials_template'
    AND policyname = 'Anyone can view materials templates'
  ) THEN
    RAISE NOTICE 'SELECT policy exists for materials template';
  ELSE
    RAISE WARNING 'SELECT policy MISSING for materials template!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'simplebudget_labor_template'
    AND policyname = 'Anyone can view labor templates'
  ) THEN
    RAISE NOTICE 'SELECT policy exists for labor template';
  ELSE
    RAISE WARNING 'SELECT policy MISSING for labor template!';
  END IF;
END $$;

COMMIT;
