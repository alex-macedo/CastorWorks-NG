-- Quick check for template 5131264a-5b4d-4d96-8031-6ca424e9c38d
-- Run this in Supabase Studio SQL Editor

-- 1. Check if template exists and get its details
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
WHERE id = '5131264a-5b4d-4d96-8031-6ca424e9c38d';

-- 2. Check your user's company_id
SELECT 
  user_id,
  company_id,
  display_name,
  email
FROM user_profiles
WHERE user_id = auth.uid();

-- 3. Check if template matches your company_id
SELECT 
  'Template company_id matches user company_id' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM budget_templates bt
      JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE bt.id = '5131264a-5b4d-4d96-8031-6ca424e9c38d'
      AND bt.company_id = up.company_id
    ) THEN '✅ YES - Should be visible'
    ELSE '❌ NO - Company IDs do not match'
  END as result;

-- 4. Count templates visible to you (simulating the frontend query with RLS)
-- This query respects RLS policies, so it should show templates where:
-- - company_id matches your company_id, OR
-- - is_public = TRUE
SELECT 
  COUNT(*) as visible_template_count
FROM budget_templates;

-- 5. List all templates visible to you
SELECT 
  id,
  name,
  company_id,
  is_public,
  budget_type,
  created_at
FROM budget_templates
WHERE company_id = (
  SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
)
ORDER BY created_at DESC;

