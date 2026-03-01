-- ============================================================================
-- Diagnostic Migration: Check Project Access RLS Issues
-- Migration: 20260126000001
-- Description: 
-- This migration helps diagnose why users can't see projects even though
-- they've been added to project_team_members. It checks:
-- 1. Current RLS policies on projects and project_team_members
-- 2. Function definitions and parameter order
-- 3. Whether project_team_members records exist and are accessible
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CHECK CURRENT PROJECTS TABLE RLS POLICIES
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== PROJECTS TABLE RLS POLICIES ===';
  FOR policy_record IN 
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'projects'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % | Command: %', policy_record.policyname, policy_record.cmd;
    RAISE NOTICE '  USING: %', policy_record.qual;
    RAISE NOTICE '  WITH CHECK: %', policy_record.with_check;
  END LOOP;
END $$;

-- ============================================================================
-- 2. CHECK CURRENT project_team_members TABLE RLS POLICIES
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== PROJECT_TEAM_MEMBERS TABLE RLS POLICIES ===';
  FOR policy_record IN 
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'project_team_members'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % | Command: %', policy_record.policyname, policy_record.cmd;
    RAISE NOTICE '  USING: %', policy_record.qual;
    RAISE NOTICE '  WITH CHECK: %', policy_record.with_check;
  END LOOP;
END $$;

-- ============================================================================
-- 3. CHECK FUNCTION DEFINITIONS
-- ============================================================================
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== FUNCTION DEFINITIONS ===';
  
  -- Check has_project_access
  SELECT pg_get_functiondef(oid) as definition INTO func_record
  FROM pg_proc 
  WHERE proname = 'has_project_access' 
    AND pronamespace = 'public'::regnamespace;
  
  IF func_record.definition IS NOT NULL THEN
    RAISE NOTICE 'has_project_access: %', substring(func_record.definition from 1 for 500);
  END IF;
  
  -- Check user_has_project_access
  SELECT pg_get_functiondef(oid) as definition INTO func_record
  FROM pg_proc 
  WHERE proname = 'user_has_project_access' 
    AND pronamespace = 'public'::regnamespace;
  
  IF func_record.definition IS NOT NULL THEN
    RAISE NOTICE 'user_has_project_access: %', substring(func_record.definition from 1 for 500);
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY FUNCTION PARAMETER ORDER
-- ============================================================================
DO $$
DECLARE
  param_record RECORD;
BEGIN
  RAISE NOTICE '=== FUNCTION PARAMETERS ===';
  
  FOR param_record IN
    SELECT 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('has_project_access', 'user_has_project_access')
  LOOP
    RAISE NOTICE 'Function: % | Arguments: %', param_record.function_name, param_record.arguments;
  END LOOP;
END $$;

COMMIT;
