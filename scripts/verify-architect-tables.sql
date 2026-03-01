-- Verification script for Architect Module tables
-- Run this in Supabase SQL Editor to check if tables exist

-- Check if architect_tasks table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'architect_tasks'
    ) 
    THEN '✅ architect_tasks table exists'
    ELSE '❌ architect_tasks table MISSING - Run migration 20251119150000_create_architect_module.sql'
  END AS status;

-- List all architect tables
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'architect_%' THEN '✅'
    ELSE ''
  END AS is_architect_table
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'architect_%'
ORDER BY table_name;

-- Check RLS policies on architect_tasks
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'architect_tasks'
ORDER BY policyname;

