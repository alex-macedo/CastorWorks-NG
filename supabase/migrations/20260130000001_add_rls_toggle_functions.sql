-- ============================================================================
-- Add RPC functions to toggle RLS on tables
-- Migration: 20260130000001
-- Description:
-- Creates RPC functions to disable/enable RLS on architect tables for seeding.
-- These functions use SECURITY DEFINER to bypass RLS and allow the seeding
-- process to work correctly.
-- ============================================================================

BEGIN;

-- Function to disable RLS on a table
CREATE OR REPLACE FUNCTION public.disable_rls_for_table(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', p_table_name);
END;
$$;

-- Function to enable RLS on a table
CREATE OR REPLACE FUNCTION public.enable_rls_for_table(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.disable_rls_for_table(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_rls_for_table(TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.disable_rls_for_table(TEXT) IS 'Disables RLS on the specified table. Used for seeding architect data.';
COMMENT ON FUNCTION public.enable_rls_for_table(TEXT) IS 'Enables RLS on the specified table. Used after seeding architect data.';

COMMIT;
