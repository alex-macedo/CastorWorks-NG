-- Debug script to understand why templates aren't visible
-- Run this in Supabase Studio SQL Editor

-- 1. Check your user's company_id
SELECT 
  'Your user profile' as check_type,
  user_id,
  company_id,
  display_name,
  email,
  CASE 
    WHEN company_id IS NULL THEN '❌ NULL - This is the problem!'
    ELSE '✅ Has company_id'
  END as status
FROM user_profiles
WHERE user_id = auth.uid();

-- 2. Check template details
SELECT 
  'Template details' as check_type,
  id,
  name,
  company_id,
  is_public,
  created_by,
  CASE 
    WHEN is_public = TRUE THEN '✅ Public - Should be visible'
    ELSE '❌ Not public'
  END as visibility_status
FROM budget_templates
WHERE id IN ('5131264a-5b4d-4d96-8031-6ca424e9c38d', '540c827d-e7bf-43f4-885e-51932eb7d22b');

-- 3. Test RLS policy directly (this simulates what the frontend query does)
-- This should return templates if RLS is working correctly
SELECT 
  'RLS test - templates visible to you' as check_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as template_ids
FROM budget_templates;

-- 4. Check if RLS is enabled
SELECT 
  'RLS status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'budget_templates';

-- 5. Check RLS policies
SELECT 
  'RLS policies' as check_type,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'budget_templates'
  AND cmd = 'SELECT';

-- 6. Test the exact RLS condition
SELECT 
  'RLS condition test' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM budget_templates bt
      WHERE (
        bt.company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
        OR bt.is_public = TRUE
      )
    ) THEN '✅ RLS condition should allow templates'
    ELSE '❌ RLS condition blocks templates'
  END as result;

