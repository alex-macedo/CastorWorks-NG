-- Script to check if budget_templates exist and RLS policies are working
-- Run this in Supabase Studio SQL Editor

-- 1. Check if tables exist
SELECT 
  'budget_templates' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'budget_templates'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'budget_template_items',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'budget_template_items'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END;

-- 2. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'budget_template%'
ORDER BY tablename;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE 'budget_template%'
ORDER BY tablename, policyname;

-- 4. Check if templates exist (as current user)
SELECT 
  COUNT(*) as template_count,
  COUNT(CASE WHEN is_public THEN 1 END) as public_count,
  COUNT(CASE WHEN NOT is_public THEN 1 END) as private_count
FROM budget_templates;

-- 5. Check user's company_id
SELECT 
  user_id,
  company_id,
  display_name,
  email
FROM user_profiles
WHERE user_id = auth.uid();

-- 6. List all templates with their company_id (if you have admin access)
-- This will show all templates regardless of RLS
SELECT 
  id,
  name,
  company_id,
  created_by,
  is_public,
  budget_type,
  total_budget_amount,
  created_at
FROM budget_templates
ORDER BY created_at DESC
LIMIT 10;

