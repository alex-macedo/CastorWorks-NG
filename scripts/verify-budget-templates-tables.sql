-- Verification script to check if budget_templates tables exist
-- Run this to verify migration status

-- Check if company_profiles exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_profiles')
    THEN '✅ company_profiles table exists'
    ELSE '❌ company_profiles table DOES NOT exist'
  END AS company_profiles_status;

-- Check if budget_templates exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_templates')
    THEN '✅ budget_templates table exists'
    ELSE '❌ budget_templates table DOES NOT exist'
  END AS budget_templates_status;

-- Check if budget_template_items exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_template_items')
    THEN '✅ budget_template_items table exists'
    ELSE '❌ budget_template_items table DOES NOT exist'
  END AS budget_template_items_status;

-- Check if import functions exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'create_simple_budget_template'
    )
    THEN '✅ create_simple_budget_template function exists'
    ELSE '❌ create_simple_budget_template function DOES NOT exist'
  END AS import_function_status;

-- List all budget_templates related tables
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('company_profiles', 'budget_templates', 'budget_template_items', 'budget_template_phases', 'budget_template_cost_codes')
    THEN '✅'
    ELSE '⚠️'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE '%budget_template%' OR table_name = 'company_profiles'
ORDER BY table_name;

