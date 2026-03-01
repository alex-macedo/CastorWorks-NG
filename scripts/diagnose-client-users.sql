-- Diagnostic script to check client users setup
-- Run this to verify why client users might not be appearing in the dropdown

-- 1. Check all users with 'client' role
SELECT
  ur.user_id,
  ur.role,
  ur.created_at as role_assigned_at
FROM user_roles ur
WHERE ur.role = 'client'
ORDER BY ur.created_at DESC;

-- 2. Check if those users have profiles
SELECT
  ur.user_id,
  ur.role,
  up.display_name,
  up.email,
  CASE
    WHEN up.user_id IS NULL THEN 'MISSING PROFILE'
    ELSE 'HAS PROFILE'
  END as profile_status
FROM user_roles ur
LEFT JOIN user_profiles up ON up.user_id = ur.user_id
WHERE ur.role = 'client'
ORDER BY ur.created_at DESC;

-- 3. Check auth.users for these client users
SELECT
  ur.user_id,
  ur.role,
  au.email as auth_email,
  au.created_at as account_created_at,
  au.email_confirmed_at,
  CASE
    WHEN au.id IS NULL THEN 'MISSING AUTH RECORD'
    ELSE 'HAS AUTH RECORD'
  END as auth_status
FROM user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'client'
ORDER BY ur.created_at DESC;

-- 4. Full diagnostic - combine all information
SELECT
  ur.user_id,
  ur.role,
  au.email as auth_email,
  up.display_name,
  up.email as profile_email,
  CASE
    WHEN au.id IS NULL THEN '❌ Missing auth.users record'
    WHEN up.user_id IS NULL THEN '⚠️ Missing user_profiles record'
    ELSE '✓ Complete'
  END as status,
  COALESCE(up.display_name, up.email, au.email, 'No identifier') as display_label
FROM user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN user_profiles up ON up.user_id = ur.user_id
WHERE ur.role = 'client'
ORDER BY ur.created_at DESC;

-- 5. Check RLS policies on user_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'user_roles')
ORDER BY tablename, policyname;

-- 6. Test the actual query used by useClientUsers hook
-- This simulates what the application does
SELECT
  ur.user_id,
  up.user_id as profile_user_id,
  up.display_name,
  up.email
FROM user_roles ur
LEFT JOIN user_profiles up ON up.user_id = ur.user_id
WHERE ur.role = 'client';
