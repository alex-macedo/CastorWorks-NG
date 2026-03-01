-- RLS Policy Verification Test Suite
-- This script verifies that all critical RLS policies are properly configured

BEGIN;

-- ============================================================================
-- Test 1: Verify RLS is enabled on all critical tables
-- ============================================================================

DO $$
DECLARE
  v_table_name text;
  v_rls_enabled boolean;
  v_fail_count integer := 0;
BEGIN
  RAISE NOTICE '=== Test 1: RLS Enabled Check ===';
  
  FOR v_table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'projects',
        'project_phases',
        'project_activities',
        'project_financial_entries',
        'project_budget_items',
        'project_purchase_requests',
        'purchase_request_items',
        'project_team_members',
        'project_materials',
        'daily_logs',
        'activity_logs',
        'generated_reports',
        'clients',
        'suppliers',
        'quotes',
        'company_settings',
        'app_settings'
      )
  LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table_name AND relnamespace = 'public'::regnamespace;
    
    IF NOT v_rls_enabled THEN
      RAISE WARNING '❌ FAIL: RLS not enabled on table %', v_table_name;
      v_fail_count := v_fail_count + 1;
    ELSE
      RAISE NOTICE '✅ PASS: RLS enabled on %', v_table_name;
    END IF;
  END LOOP;
  
  IF v_fail_count = 0 THEN
    RAISE NOTICE '✅ Test 1 PASSED: All critical tables have RLS enabled';
  ELSE
    RAISE EXCEPTION '❌ Test 1 FAILED: % tables missing RLS', v_fail_count;
  END IF;
END $$;

-- ============================================================================
-- Test 2: Verify no overly permissive "true" policies on critical tables
-- ============================================================================

DO $$
DECLARE
  v_policy_count integer;
  v_policy_record record;
BEGIN
  RAISE NOTICE '=== Test 2: Overly Permissive Policy Check ===';
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'projects',
      'project_financial_entries',
      'project_budget_items',
      'project_phases',
      'project_purchase_requests',
      'purchase_request_items',
      'quotes'
    )
    AND (qual = 'true' OR with_check = 'true');
  
  IF v_policy_count > 0 THEN
    RAISE WARNING '❌ FAIL: Found % overly permissive policies', v_policy_count;
    
    FOR v_policy_record IN
      SELECT tablename, policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (qual = 'true' OR with_check = 'true')
        AND tablename IN (
          'projects',
          'project_financial_entries',
          'project_budget_items',
          'project_phases'
        )
    LOOP
      RAISE WARNING '  Table: %, Policy: %, Command: %', 
        v_policy_record.tablename, 
        v_policy_record.policyname, 
        v_policy_record.cmd;
    END LOOP;
    
    RAISE EXCEPTION '❌ Test 2 FAILED: Overly permissive policies found';
  ELSE
    RAISE NOTICE '✅ Test 2 PASSED: No overly permissive policies on critical tables';
  END IF;
END $$;

-- ============================================================================
-- Test 3: Verify security definer functions exist
-- ============================================================================

DO $$
DECLARE
  v_function_count integer;
BEGIN
  RAISE NOTICE '=== Test 3: Security Definer Functions Check ===';
  
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('has_role', 'has_project_access', 'has_project_admin_access')
    AND p.prosecdef = true;  -- security definer
  
  IF v_function_count < 3 THEN
    RAISE EXCEPTION '❌ Test 3 FAILED: Expected 3 security definer functions, found %', v_function_count;
  ELSE
    RAISE NOTICE '✅ Test 3 PASSED: All security definer functions exist';
  END IF;
END $$;

-- ============================================================================
-- Test 4: Verify company_settings only updatable by admins
-- ============================================================================

DO $$
DECLARE
  v_policy_exists boolean;
BEGIN
  RAISE NOTICE '=== Test 4: Company Settings Security Check ===';
  
  -- Check that "Anyone can update" policy does NOT exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_settings'
      AND policyname = 'Anyone can update company settings'
  ) INTO v_policy_exists;
  
  IF v_policy_exists THEN
    RAISE EXCEPTION '❌ Test 4 FAILED: Insecure "Anyone can update" policy still exists';
  END IF;
  
  -- Check that admin-only policy EXISTS
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_settings'
      AND policyname = 'Admins can update company settings'
      AND cmd = 'UPDATE'
  ) INTO v_policy_exists;
  
  IF NOT v_policy_exists THEN
    RAISE EXCEPTION '❌ Test 4 FAILED: Admin-only update policy missing';
  ELSE
    RAISE NOTICE '✅ Test 4 PASSED: Company settings secured (admin-only updates)';
  END IF;
END $$;

-- ============================================================================
-- Test 5: Verify app_settings only updatable by admins
-- ============================================================================

DO $$
DECLARE
  v_policy_exists boolean;
BEGIN
  RAISE NOTICE '=== Test 5: App Settings Security Check ===';
  
  -- Check that "Anyone can update" policy does NOT exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Anyone can update app settings'
  ) INTO v_policy_exists;
  
  IF v_policy_exists THEN
    RAISE EXCEPTION '❌ Test 5 FAILED: Insecure "Anyone can update" policy still exists';
  END IF;
  
  -- Check that admin-only policy EXISTS
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Admins can update app settings'
      AND cmd = 'UPDATE'
  ) INTO v_policy_exists;
  
  IF NOT v_policy_exists THEN
    RAISE EXCEPTION '❌ Test 5 FAILED: Admin-only update policy missing';
  ELSE
    RAISE NOTICE '✅ Test 5 PASSED: App settings secured (admin-only updates)';
  END IF;
END $$;

-- ============================================================================
-- Test 6: Verify projects table has proper project-scoped policies
-- ============================================================================

DO $$
DECLARE
  v_policy_count integer;
BEGIN
  RAISE NOTICE '=== Test 6: Projects Table Policy Check ===';
  
  -- Count policies that use has_project_access or has_project_admin_access
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND (
      qual LIKE '%has_project_access%' OR
      qual LIKE '%has_project_admin_access%' OR
      qual LIKE '%has_role%' OR
      with_check LIKE '%has_project_access%' OR
      with_check LIKE '%has_project_admin_access%' OR
      with_check LIKE '%has_role%'
    );
  
  IF v_policy_count = 0 THEN
    RAISE EXCEPTION '❌ Test 6 FAILED: No secure policies found on projects table';
  ELSE
    RAISE NOTICE '✅ Test 6 PASSED: Projects table has % secure policies', v_policy_count;
  END IF;
END $$;

-- ============================================================================
-- Test 7: Verify financial entries are project-scoped
-- ============================================================================

DO $$
DECLARE
  v_has_project_policy boolean;
BEGIN
  RAISE NOTICE '=== Test 7: Financial Entries Security Check ===';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_financial_entries'
      AND cmd = 'SELECT'
      AND qual LIKE '%has_project_access%'
  ) INTO v_has_project_policy;
  
  IF NOT v_has_project_policy THEN
    RAISE EXCEPTION '❌ Test 7 FAILED: Financial entries not properly scoped to projects';
  ELSE
    RAISE NOTICE '✅ Test 7 PASSED: Financial entries are project-scoped';
  END IF;
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '       RLS POLICY VERIFICATION COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'All tests passed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create test users with different roles';
  RAISE NOTICE '2. Test actual data access patterns';
  RAISE NOTICE '3. Verify cross-project data isolation';
  RAISE NOTICE '4. Monitor for any permission errors in logs';
  RAISE NOTICE '=================================================';
END $$;

ROLLBACK;
