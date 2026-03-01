-- Script to verify if a specific template is visible to the current user
-- Replace the template_id below with the actual template ID from the console log

-- Template ID from console: 5131264a-5b4d-4d96-8031-6ca424e9c38d
\set template_id '5131264a-5b4d-4d96-8031-6ca424e9c38d'

-- 1. Check if template exists
SELECT 
  'Template exists' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM budget_templates WHERE id = :'template_id'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as result;

-- 2. Get template details
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
WHERE id = :'template_id';

-- 3. Check current user's company_id
SELECT 
  'Current user company_id' as check_type,
  company_id,
  user_id,
  display_name
FROM user_profiles
WHERE user_id = auth.uid();

-- 4. Check if template should be visible (based on RLS policy)
SELECT 
  'Should be visible' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM budget_templates bt
      WHERE bt.id = :'template_id'
      AND (
        bt.company_id = (
          SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR bt.is_public = TRUE
      )
    ) THEN '✅ YES (matches RLS policy)'
    ELSE '❌ NO (blocked by RLS policy)'
  END as result;

-- 5. Try to query templates as current user (simulating the frontend query)
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
WHERE company_id = (
  SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
)
ORDER BY created_at DESC;

