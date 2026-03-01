-- Diagnostic query to check architect projects and ownership
-- Run this to see what projects exist and their owner_id values

-- 1. Check current user's ID and roles
SELECT 
  'Current User Info' as section,
  au.id as user_id,
  au.email,
  array_agg(ur.role) as roles
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'YOUR_EMAIL_HERE' -- Replace with your email
GROUP BY au.id, au.email;

-- 2. Check all projects with their owner_id
SELECT 
  'All Projects' as section,
  p.id,
  p.name,
  p.owner_id,
  p.status,
  p.created_at,
  CASE 
    WHEN p.owner_id IS NULL THEN 'Regular Project (no owner)'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.owner_id AND ur.role = 'architect'
    ) THEN 'Architect-Owned Project'
    ELSE 'Owned by Non-Architect'
  END as project_type
FROM public.projects p
ORDER BY p.created_at DESC;

-- 3. Check architect-owned projects specifically
SELECT 
  'Architect-Owned Projects' as section,
  p.id,
  p.name,
  p.owner_id,
  p.status,
  p.created_at,
  ur.role as owner_role
FROM public.projects p
JOIN public.user_roles ur ON ur.user_id = p.owner_id AND ur.role = 'architect'
ORDER BY p.created_at DESC;

-- 4. Check if current user is in project_team_members for regular projects
SELECT 
  'User Team Memberships' as section,
  ptm.project_id,
  p.name as project_name,
  p.owner_id,
  ptm.role as team_role,
  CASE 
    WHEN p.owner_id IS NULL THEN 'Regular Project'
    WHEN p.owner_id = 'YOUR_USER_ID_HERE' THEN 'Owned by You'
    ELSE 'Owned by Someone Else'
  END as project_type
FROM public.project_team_members ptm
JOIN public.projects p ON p.id = ptm.project_id
WHERE ptm.user_id = 'YOUR_USER_ID_HERE' -- Replace with your user ID
ORDER BY p.created_at DESC;
