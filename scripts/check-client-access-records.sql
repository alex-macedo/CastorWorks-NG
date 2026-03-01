-- Check if client_project_access records exist and can be viewed

-- 1. Check raw records in client_project_access (bypassing RLS for diagnosis)
SELECT
  cpa.id,
  cpa.client_id,
  cpa.project_id,
  cpa.user_id,
  cpa.can_view_documents,
  cpa.can_view_financials,
  cpa.can_download_reports,
  cpa.created_at
FROM client_project_access cpa
ORDER BY cpa.created_at DESC
LIMIT 10;

-- 2. Check the same records WITH the joins (what the UI query does)
SELECT
  cpa.id,
  cpa.client_id,
  cpa.project_id,
  cpa.user_id,
  c.name as client_name,
  p.name as project_name,
  p.status as project_status
FROM client_project_access cpa
LEFT JOIN clients c ON c.id = cpa.client_id
LEFT JOIN projects p ON p.id = cpa.project_id
ORDER BY cpa.created_at DESC
LIMIT 10;

-- 3. Check if the joins are returning NULL due to RLS
SELECT
  'Total client_project_access records' as check_type,
  COUNT(*) as count
FROM client_project_access
UNION ALL
SELECT
  'Records with valid client join',
  COUNT(*)
FROM client_project_access cpa
INNER JOIN clients c ON c.id = cpa.client_id
UNION ALL
SELECT
  'Records with valid project join',
  COUNT(*)
FROM client_project_access cpa
INNER JOIN projects p ON p.id = cpa.project_id
UNION ALL
SELECT
  'Records with both joins valid',
  COUNT(*)
FROM client_project_access cpa
INNER JOIN clients c ON c.id = cpa.client_id
INNER JOIN projects p ON p.id = cpa.project_id;

-- 4. Check current user's role
SELECT
  auth.uid() as current_user_id,
  ur.role,
  has_role(auth.uid(), 'admin') as is_admin,
  has_role(auth.uid(), 'project_manager') as is_pm
FROM user_roles ur
WHERE ur.user_id = auth.uid();

-- 5. Check RLS policies on relevant tables
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN roles::text = '{authenticated}' THEN 'authenticated users'
    ELSE roles::text
  END as applies_to
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('client_project_access', 'clients', 'projects')
ORDER BY tablename, policyname;
